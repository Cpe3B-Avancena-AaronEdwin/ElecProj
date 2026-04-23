import express from "express";
import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { pool } from "../db.js";
import { requireAuth } from "../middleware/authMiddleware.js";
import { requireAdmin } from "../middleware/adminMiddleware.js";

const router = express.Router();

const SNAPSHOT_TIMEOUT_MS = 15000;
const TOMTOM_TIMEOUT_MS = 5000;
const NETWORK_SUMMARY_ROUTE_ID = "__NETWORK_SUMMARY__";
const NETWORK_SUMMARY_ROUTE_NAME = "Network Summary";

const GTFS_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../gtfs"
);

const GTFS_STOPS_FILE = path.join(GTFS_DIR, "stops.txt");
const GTFS_STOP_TIMES_FILE = path.join(GTFS_DIR, "stop_times.txt");
const GTFS_TRIPS_FILE = path.join(GTFS_DIR, "trips.txt");

const TOMTOM_FLOW_URL =
  "https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json";

const DEFAULT_ROUTE_SAMPLE_COUNT = 15;

let gtfsCache = null;
let gtfsCachePromise = null;

function randomSnapshotId() {
  return `traffic_${crypto.randomUUID().replace(/-/g, "")}`;
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function normalizeRouteId(value) {
  return String(value || "").trim().toUpperCase();
}

function deriveCongestionLevel(score) {
  if (score >= 70) return "High";
  if (score >= 40) return "Medium";
  return "Low";
}

function getPHTParts(date = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const map = Object.fromEntries(
    parts.filter((p) => p.type !== "literal").map((p) => [p.type, p.value])
  );

  return {
    year: map.year,
    month: map.month,
    day: map.day,
    hour: map.hour,
    minute: map.minute,
    second: map.second,
  };
}

function toMySqlPHTDateTime(date = new Date()) {
  const p = getPHTParts(date);
  return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}:${p.second}`;
}

function toPHTIsoOffsetStringFromMySql(mysqlDateTime) {
  if (!mysqlDateTime) return null;

  if (mysqlDateTime instanceof Date) {
    return `${toMySqlPHTDateTime(mysqlDateTime).replace(" ", "T")}+08:00`;
  }

  const raw = String(mysqlDateTime).trim();
  if (!raw) return null;

  if (raw.endsWith("Z") || raw.includes("+08:00")) {
    return raw;
  }

  return `${raw.replace(" ", "T")}+08:00`;
}

function mapSnapshot(row) {
  const timestampText = toPHTIsoOffsetStringFromMySql(row.created_at);
  const timestampMs = timestampText ? new Date(timestampText).getTime() : Date.now();

  return {
    id: row.snapshot_id || "",
    docId: row.id,
    snapshotId: row.snapshot_id || "",
    routeId: row.route_id || "",
    routeName: row.route_name || "",
    congestionScore: Number(row.congestion_score || 0),
    congestionLevel: row.congestion_level || "Low",
    averageSpeed: Number(row.average_speed || 0),
    delayMinutes: Number(row.delay_minutes || 0),
    totalVehicles: Number(row.total_vehicles || 0),
    totalPassengers: Number(row.total_passengers || 0),
    source: row.source || "system",
    notes: row.notes || "",
    timestampText,
    timestampMs,
    createdAt: timestampText,
  };
}

function mapBuiltSnapshot(item, createdAt = new Date()) {
  const mysqlCreatedAt = toMySqlPHTDateTime(createdAt);
  const timestampText = `${mysqlCreatedAt.replace(" ", "T")}+08:00`;
  const timestampMs = new Date(timestampText).getTime();

  return {
    id: item.snapshotId,
    docId: null,
    snapshotId: item.snapshotId,
    routeId: item.routeId || "",
    routeName: item.routeName || "",
    congestionScore: Number(item.congestionScore || 0),
    congestionLevel: item.congestionLevel || "Low",
    averageSpeed: Number(item.averageSpeed || 0),
    delayMinutes: Number(item.delayMinutes || 0),
    totalVehicles: Number(item.totalVehicles || 0),
    totalPassengers: Number(item.totalPassengers || 0),
    source: item.source || "system",
    notes: item.notes || "",
    timestampText,
    timestampMs,
    createdAt: timestampText,
  };
}

async function getLatestSnapshot(routeId = "") {
  let rows;

  if (routeId) {
    [rows] = await pool.query(
      `SELECT *
       FROM traffic_snapshots
       WHERE route_id = ?
       ORDER BY created_at DESC, id DESC
       LIMIT 1`,
      [routeId]
    );
    return rows[0] || null;
  }

  [rows] = await pool.query(
    `SELECT *
     FROM traffic_snapshots
     WHERE route_id = ?
     ORDER BY created_at DESC, id DESC
     LIMIT 1`,
    [NETWORK_SUMMARY_ROUTE_ID]
  );

  if (rows[0]) return rows[0];

  [rows] = await pool.query(
    `SELECT *
     FROM traffic_snapshots
     ORDER BY created_at DESC, id DESC
     LIMIT 1`
  );

  return rows[0] || null;
}

function parseCsvLine(line) {
  const values = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      values.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current);
  return values;
}

function parseCsv(text) {
  const lines = String(text || "")
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0);

  if (!lines.length) return [];

  const headers = parseCsvLine(lines[0]).map((header) => header.trim());

  return lines.slice(1).map((line) => {
    const columns = parseCsvLine(line);
    const row = {};

    headers.forEach((header, index) => {
      row[header] = (columns[index] ?? "").trim();
    });

    return row;
  });
}

function dedupeCoordinatePoints(points) {
  const seen = new Set();
  const result = [];

  for (const point of points) {
    const lat = toNumber(point?.lat, NaN);
    const lon = toNumber(point?.lon, NaN);

    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;

    const key = `${lat.toFixed(6)},${lon.toFixed(6)}`;
    if (seen.has(key)) continue;

    seen.add(key);
    result.push({ lat, lon });
  }

  return result;
}

function selectEvenlySpaced(items, maxCount) {
  if (!Array.isArray(items) || items.length === 0) return [];
  if (items.length <= maxCount) return [...items];
  if (maxCount <= 1) return [items[Math.floor(items.length / 2)]];

  const result = [];
  const usedIndexes = new Set();

  for (let i = 0; i < maxCount; i += 1) {
    const index = Math.round((i * (items.length - 1)) / (maxCount - 1));
    if (!usedIndexes.has(index)) {
      usedIndexes.add(index);
      result.push(items[index]);
    }
  }

  return result;
}

async function loadGtfsCache() {
  if (gtfsCache) return gtfsCache;
  if (gtfsCachePromise) return gtfsCachePromise;

  gtfsCachePromise = (async () => {
    const [stopsText, stopTimesText, tripsText] = await Promise.all([
      fs.readFile(GTFS_STOPS_FILE, "utf8"),
      fs.readFile(GTFS_STOP_TIMES_FILE, "utf8"),
      fs.readFile(GTFS_TRIPS_FILE, "utf8"),
    ]);

    const stopsRows = parseCsv(stopsText);
    const stopTimesRows = parseCsv(stopTimesText);
    const tripsRows = parseCsv(tripsText);

    const stopsById = new Map();
    for (const row of stopsRows) {
      const stopId = String(row.stop_id || "").trim();
      const lat = toNumber(row.stop_lat, NaN);
      const lon = toNumber(row.stop_lon, NaN);
      if (!stopId || !Number.isFinite(lat) || !Number.isFinite(lon)) continue;
      stopsById.set(stopId, { lat, lon });
    }

    const stopTimesByTrip = new Map();
    for (const row of stopTimesRows) {
      const tripId = String(row.trip_id || "").trim();
      const stopId = String(row.stop_id || "").trim();
      const stopSequence = toNumber(row.stop_sequence, Number.MAX_SAFE_INTEGER);

      if (!tripId || !stopId) continue;

      if (!stopTimesByTrip.has(tripId)) stopTimesByTrip.set(tripId, []);
      stopTimesByTrip.get(tripId).push({ stopId, stopSequence });
    }

    for (const entries of stopTimesByTrip.values()) {
      entries.sort((a, b) => a.stopSequence - b.stopSequence);
    }

    const bestTripByRoute = new Map();

    for (const row of tripsRows) {
      const routeIdRaw = String(row.route_id || "").trim();
      const tripId = String(row.trip_id || "").trim();
      if (!routeIdRaw || !tripId) continue;

      const points =
        stopTimesByTrip.get(tripId)?.map((entry) => stopsById.get(entry.stopId)).filter(Boolean) ||
        [];

      const dedupedPoints = dedupeCoordinatePoints(points);
      if (!dedupedPoints.length) continue;

      const routeKey = normalizeRouteId(routeIdRaw);
      const existing = bestTripByRoute.get(routeKey);

      if (!existing || dedupedPoints.length > existing.points.length) {
        bestTripByRoute.set(routeKey, {
          routeId: routeIdRaw,
          tripId,
          points: dedupedPoints,
        });
      }
    }

    const routePointMap = new Map();

    for (const [routeKey, tripInfo] of bestTripByRoute.entries()) {
      const points = tripInfo.points;
      if (!points.length) continue;

      const representativePoint = points[Math.floor(points.length / 2)];

      routePointMap.set(routeKey, {
        routeId: tripInfo.routeId,
        tripId: tripInfo.tripId,
        representativePoint,
        points,
      });
    }

    gtfsCache = {
      routePointMap,
    };

    return gtfsCache;
  })();

  try {
    return await gtfsCachePromise;
  } finally {
    gtfsCachePromise = null;
  }
}

async function buildRouteSourceList() {
  const [routeRows] = await pool.query(
    `SELECT route_id, route_name, route_code
     FROM routes
     ORDER BY route_name ASC, route_code ASC, route_id ASC`
  );

  return routeRows.map((route) => ({
    route_id: route.route_id || "",
    route_name: route.route_name || "",
    route_code: route.route_code || "",
  }));
}

async function bulkInsertTrafficSnapshots(rows) {
  if (!rows.length) return;

  const placeholders = rows.map(() => "(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").join(", ");
  const values = rows.flatMap((row) => [
    row.snapshot_id,
    row.route_id,
    row.route_name,
    row.congestion_score,
    row.congestion_level,
    row.average_speed,
    row.delay_minutes,
    row.total_vehicles,
    row.total_passengers,
    row.source,
    row.notes,
    row.created_at,
  ]);

  await pool.query(
    `INSERT INTO traffic_snapshots
    (
      snapshot_id, route_id, route_name, congestion_score, congestion_level,
      average_speed, delay_minutes, total_vehicles, total_passengers,
      source, notes, created_at
    )
    VALUES ${placeholders}`,
    values
  );
}

async function fetchTomTomFlowSegment(point, apiKey) {
  const url = new URL(TOMTOM_FLOW_URL);
  url.searchParams.set("key", apiKey);
  url.searchParams.set("point", `${point.lat},${point.lon}`);
  url.searchParams.set("unit", "kmph");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TOMTOM_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`TomTom ${response.status}: ${text.slice(0, 300)}`);
    }

    const payload = await response.json();
    const data = payload?.flowSegmentData || payload;

    return {
      currentSpeed: toNumber(data?.currentSpeed, 0),
      freeFlowSpeed: toNumber(data?.freeFlowSpeed, 0),
      currentTravelTime: toNumber(data?.currentTravelTime, 0),
      freeFlowTravelTime: toNumber(data?.freeFlowTravelTime, 0),
      confidence: toNumber(data?.confidence, 0),
      roadClosure: Boolean(data?.roadClosure),
    };
  } finally {
    clearTimeout(timeout);
  }
}

function scoreTomTomFlow(flow) {
  if (flow.roadClosure) {
    return {
      congestionScore: 100,
      averageSpeed: 0,
      delayMinutes: 10,
    };
  }

  const currentSpeed = clamp(toNumber(flow.currentSpeed, 0), 0, 200);
  const freeFlowSpeed = clamp(toNumber(flow.freeFlowSpeed, 0), 1, 200);
  const currentTravelTime = Math.max(0, toNumber(flow.currentTravelTime, 0));
  const freeFlowTravelTime = Math.max(1, toNumber(flow.freeFlowTravelTime, 0));

  const speedRatio = clamp(currentSpeed / freeFlowSpeed, 0, 1.2);
  const delayRatio = clamp(currentTravelTime / freeFlowTravelTime, 0, 4);

  const speedPenalty = clamp((1 - Math.min(speedRatio, 1)) * 100, 0, 100);
  const delayPenalty = clamp((delayRatio - 1) * 100, 0, 100);

  let score = 15 + speedPenalty * 0.6 + delayPenalty * 0.4;

  if (currentSpeed < 30) score += 6;
  if (currentSpeed < 20) score += 8;
  if (currentSpeed < 10) score += 10;

  score = clamp(score, 0, 100);

  return {
    congestionScore: Number(score.toFixed(2)),
    averageSpeed: Number(currentSpeed.toFixed(2)),
    delayMinutes: Number(
      Math.max(0, (currentTravelTime - freeFlowTravelTime) / 60).toFixed(2)
    ),
  };
}

async function generateSnapshotsFromLiveData() {
  const apiKey = String(process.env.TOMTOM_API_KEY || "").trim();
  if (!apiKey) throw new Error("Missing TOMTOM_API_KEY");

  const [routes, gtfs] = await Promise.all([
    buildRouteSourceList(),
    loadGtfsCache(),
  ]);

  const usable = routes
    .map((route) => {
      const gtfsRoute = gtfs.routePointMap.get(normalizeRouteId(route.route_id));
      if (!gtfsRoute?.representativePoint) return null;

      return {
        routeId: route.route_id,
        routeName:
          route.route_name || route.route_code || route.route_id || "Unnamed Route",
        point: gtfsRoute.representativePoint,
        tripId: gtfsRoute.tripId,
      };
    })
    .filter(Boolean);

  if (!usable.length) throw new Error("No GTFS route points found.");

  const sampleCount = Math.max(
    1,
    Math.min(15, Number(process.env.TRAFFIC_SAMPLE_COUNT || 15))
  );

  const sampled = selectEvenlySpaced(usable, sampleCount);

  const createdAt = new Date();
  const mysqlCreatedAt = toMySqlPHTDateTime(createdAt);

  const rowsToInsert = [];
  const createdSnapshots = [];

  for (const route of sampled) {
    let flow;
    try {
      flow = await fetchTomTomFlowSegment(route.point, apiKey);
    } catch {
      continue;
    }

    const scored = scoreTomTomFlow(flow);
    const snapshotId = randomSnapshotId();

    const row = {
      snapshot_id: snapshotId,
      route_id: route.routeId,
      route_name: route.routeName,
      congestion_score: scored.congestionScore,
      congestion_level: deriveCongestionLevel(scored.congestionScore),
      average_speed: scored.averageSpeed,
      delay_minutes: scored.delayMinutes,
      total_vehicles: 0,
      total_passengers: 0,
      source: "tomtom",
      notes: `Sampled point ${route.point.lat},${route.point.lon}`,
      created_at: mysqlCreatedAt,
    };

    rowsToInsert.push(row);

    createdSnapshots.push(
      mapBuiltSnapshot(
        {
          snapshotId,
          routeId: row.route_id,
          routeName: row.route_name,
          congestionScore: row.congestion_score,
          congestionLevel: row.congestion_level,
          averageSpeed: row.average_speed,
          delayMinutes: row.delay_minutes,
          totalVehicles: 0,
          totalPassengers: 0,
          source: row.source,
          notes: row.notes,
        },
        createdAt
      )
    );
  }

  if (!createdSnapshots.length) {
    throw new Error("No TomTom snapshots created.");
  }

  const overallScore =
    createdSnapshots.reduce((sum, x) => sum + x.congestionScore, 0) /
    createdSnapshots.length;

  const avgSpeed =
    createdSnapshots.reduce((sum, x) => sum + x.averageSpeed, 0) /
    createdSnapshots.length;

  const avgDelay =
    createdSnapshots.reduce((sum, x) => sum + x.delayMinutes, 0) /
    createdSnapshots.length;

  const summaryId = randomSnapshotId();

  const summaryRow = {
    snapshot_id: summaryId,
    route_id: NETWORK_SUMMARY_ROUTE_ID,
    route_name: NETWORK_SUMMARY_ROUTE_NAME,
    congestion_score: Number(overallScore.toFixed(2)),
    congestion_level: deriveCongestionLevel(overallScore),
    average_speed: Number(avgSpeed.toFixed(2)),
    delay_minutes: Number(avgDelay.toFixed(2)),
    total_vehicles: 0,
    total_passengers: 0,
    source: "tomtom",
    notes: `Summary from ${createdSnapshots.length} sampled routes`,
    created_at: mysqlCreatedAt,
  };

  rowsToInsert.push(summaryRow);
  await bulkInsertTrafficSnapshots(rowsToInsert);

  return {
    message: "TomTom traffic snapshots generated successfully",
    summary: {
      congestionScore: summaryRow.congestion_score,
      congestionLevel: summaryRow.congestion_level,
      averageSpeed: summaryRow.average_speed,
      delayMinutes: summaryRow.delay_minutes,
      totalVehicles: 0,
      totalPassengers: 0,
      routeCount: createdSnapshots.length,
    },
    summarySnapshot: mapBuiltSnapshot(
      {
        snapshotId: summaryId,
        routeId: NETWORK_SUMMARY_ROUTE_ID,
        routeName: NETWORK_SUMMARY_ROUTE_NAME,
        congestionScore: summaryRow.congestion_score,
        congestionLevel: summaryRow.congestion_level,
        averageSpeed: summaryRow.average_speed,
        delayMinutes: summaryRow.delay_minutes,
        totalVehicles: 0,
        totalPassengers: 0,
        source: "tomtom",
        notes: summaryRow.notes,
      },
      createdAt
    ),
    snapshots: createdSnapshots,
  };
}

router.get("/", async (req, res, next) => {
  try {
    const routeId = String(req.query.routeId || "").trim();
    const latest = await getLatestSnapshot(routeId);

    if (!latest) {
      const now = new Date();
      const mysqlNow = toMySqlPHTDateTime(now);
      const timestampText = `${mysqlNow.replace(" ", "T")}+08:00`;

      return res.json({
        id: "",
        snapshotId: "",
        routeId: routeId || "",
        routeName: "",
        congestionScore: 0,
        congestionLevel: "Low",
        averageSpeed: 0,
        delayMinutes: 0,
        totalVehicles: 0,
        totalPassengers: 0,
        source: "system",
        notes: "",
        timestampText,
        timestampMs: new Date(timestampText).getTime(),
        createdAt: timestampText,
      });
    }

    res.json(mapSnapshot(latest));
  } catch (error) {
    next(error);
  }
});

router.get("/history", async (req, res, next) => {
  try {
    const routeId = String(req.query.routeId || "").trim();
    const summaryOnly =
      String(req.query.summaryOnly || "").trim() === "1" ||
      String(req.query.summaryOnly || "").trim().toLowerCase() === "true";

    const hours = Math.max(1, Math.min(24 * 30, Number(req.query.hours || 24)));
    const limit = Math.max(1, Math.min(1000, Number(req.query.limit || 500)));

    let rows;

    if (routeId) {
      [rows] = await pool.query(
        `SELECT * FROM (
          SELECT *
          FROM traffic_snapshots
          WHERE route_id = ?
            AND created_at >= (NOW() - INTERVAL ? HOUR)
          ORDER BY created_at DESC, id DESC
          LIMIT ?
        ) recent_rows
        ORDER BY created_at ASC, id ASC`,
        [routeId, hours, limit]
      );
    } else if (summaryOnly) {
      [rows] = await pool.query(
        `SELECT * FROM (
          SELECT *
          FROM traffic_snapshots
          WHERE route_id = ?
            AND created_at >= (NOW() - INTERVAL ? HOUR)
          ORDER BY created_at DESC, id DESC
          LIMIT ?
        ) recent_rows
        ORDER BY created_at ASC, id ASC`,
        [NETWORK_SUMMARY_ROUTE_ID, hours, limit]
      );
    } else {
      [rows] = await pool.query(
        `SELECT * FROM (
          SELECT *
          FROM traffic_snapshots
          WHERE created_at >= (NOW() - INTERVAL ? HOUR)
          ORDER BY created_at DESC, id DESC
          LIMIT ?
        ) recent_rows
        ORDER BY created_at ASC, id ASC`,
        [hours, limit]
      );
    }

    res.json(rows.map(mapSnapshot));
  } catch (error) {
    next(error);
  }
});

router.post("/snapshot", async (req, res, next) => {
  try {
    const result = await Promise.race([
      generateSnapshotsFromLiveData(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Snapshot timed out")), SNAPSHOT_TIMEOUT_MS)
      ),
    ]);

    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.post("/", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    res.status(501).json({ error: "Manual snapshot creation disabled." });
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const identifier = String(req.params.id).trim();

    const [rows] = await pool.query(
      `SELECT *
       FROM traffic_snapshots
       WHERE snapshot_id = ? OR id = ?
       LIMIT 1`,
      [identifier, Number(identifier) || 0]
    );

    if (!rows.length) {
      return res.status(404).json({ error: "Traffic snapshot not found" });
    }

    await pool.query("DELETE FROM traffic_snapshots WHERE snapshot_id = ?", [
      rows[0].snapshot_id,
    ]);

    res.json({ message: "Traffic snapshot deleted successfully" });
  } catch (error) {
    next(error);
  }
});

export { generateSnapshotsFromLiveData };
export default router;