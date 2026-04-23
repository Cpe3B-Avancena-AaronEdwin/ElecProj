import express from "express";
import crypto from "crypto";
import { pool } from "../db.js";
import { requireAuth } from "../middleware/authMiddleware.js";
import { requireAdmin } from "../middleware/adminMiddleware.js";

const router = express.Router();
const SNAPSHOT_TIMEOUT_MS = 15000;

function randomSnapshotId() {
  return `traffic_${crypto.randomUUID().replace(/-/g, "")}`;
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
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
    parts
      .filter((p) => p.type !== "literal")
      .map((p) => [p.type, p.value])
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
  } else {
    [rows] = await pool.query(
      `SELECT *
       FROM traffic_snapshots
       ORDER BY created_at DESC, id DESC
       LIMIT 1`
    );
  }

  return rows[0] || null;
}

async function buildRouteSourceList() {
  const [routeRows] = await pool.query(
    `SELECT
       route_id,
       route_name,
       route_code
     FROM routes
     ORDER BY route_name ASC, route_code ASC, route_id ASC`
  );

  if (routeRows.length > 0) {
    return routeRows.map((route) => ({
      route_id: route.route_id || "",
      route_name: route.route_name || "",
      route_code: route.route_code || "",
    }));
  }

  const [vehicleRouteRows] = await pool.query(
    `SELECT DISTINCT route_id
     FROM vehicles
     WHERE route_id IS NOT NULL AND TRIM(route_id) <> ''
     ORDER BY route_id ASC`
  );

  const [tripRouteRows] = await pool.query(
    `SELECT DISTINCT route_id
     FROM trips
     WHERE route_id IS NOT NULL AND TRIM(route_id) <> ''
     ORDER BY route_id ASC`
  );

  const routeMap = new Map();

  for (const row of vehicleRouteRows) {
    const routeId = String(row.route_id || "").trim();
    if (routeId) {
      routeMap.set(routeId, {
        route_id: routeId,
        route_name: routeId,
        route_code: routeId,
      });
    }
  }

  for (const row of tripRouteRows) {
    const routeId = String(row.route_id || "").trim();
    if (routeId && !routeMap.has(routeId)) {
      routeMap.set(routeId, {
        route_id: routeId,
        route_name: routeId,
        route_code: routeId,
      });
    }
  }

  if (routeMap.size > 0) {
    return Array.from(routeMap.values());
  }

  return [
    {
      route_id: "SYSTEM",
      route_name: "All Routes",
      route_code: "SYSTEM",
    },
  ];
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
      snapshot_id,
      route_id,
      route_name,
      congestion_score,
      congestion_level,
      average_speed,
      delay_minutes,
      total_vehicles,
      total_passengers,
      source,
      notes,
      created_at
    )
    VALUES ${placeholders}`,
    values
  );
}

async function generateSnapshotsFromLiveData() {
  console.log("[traffic:snapshot] building route source list...");
  const sourceRoutes = await buildRouteSourceList();
  console.log(`[traffic:snapshot] routes found: ${sourceRoutes.length}`);

  console.log("[traffic:snapshot] loading vehicle/trip aggregates...");
  const [
    [vehicleCountRows],
    [vehicleSpeedRows],
    [tripCountRows],
    [overallVehicleRows],
    [overallTripRows],
  ] = await Promise.all([
    pool.query(
      `SELECT route_id, COUNT(*) AS totalVehicles
       FROM vehicles
       GROUP BY route_id`
    ),
    pool.query(
      `SELECT route_id, COALESCE(AVG(speed), 0) AS avgSpeed
       FROM vehicles
       GROUP BY route_id`
    ),
    pool.query(
      `SELECT route_id, COUNT(*) AS totalTrips
       FROM trips
       GROUP BY route_id`
    ),
    pool.query(
      `SELECT
         COUNT(*) AS totalVehicles,
         COALESCE(AVG(speed), 0) AS avgSpeed
       FROM vehicles`
    ),
    pool.query(
      `SELECT COUNT(*) AS totalTrips
       FROM trips`
    ),
  ]);

  const vehicleMap = new Map(
    vehicleCountRows.map((row) => [
      row.route_id || "",
      Number(row.totalVehicles || 0),
    ])
  );

  const speedMap = new Map(
    vehicleSpeedRows.map((row) => [
      row.route_id || "",
      Number(row.avgSpeed || 0),
    ])
  );

  const tripMap = new Map(
    tripCountRows.map((row) => [
      row.route_id || "",
      Number(row.totalTrips || 0),
    ])
  );

  const overallVehicleCount = Number(overallVehicleRows?.[0]?.totalVehicles || 0);
  const overallAvgSpeed = Number(overallVehicleRows?.[0]?.avgSpeed || 0);
  const overallTripCount = Number(overallTripRows?.[0]?.totalTrips || 0);

  const createdAt = new Date();
  const mysqlCreatedAt = toMySqlPHTDateTime(createdAt);

  const rowsToInsert = [];
  const createdSnapshots = [];

  for (const route of sourceRoutes) {
    const routeId = route.route_id || "";
    const isSystemFallback = routeId === "SYSTEM";
    const routeName = route.route_name || route.route_code || routeId || "Unnamed Route";

    const totalVehicles = isSystemFallback
      ? overallVehicleCount
      : vehicleMap.get(routeId) || 0;

    const averageSpeed = isSystemFallback
      ? overallAvgSpeed
      : speedMap.get(routeId) || 0;

    const totalTrips = isSystemFallback
      ? overallTripCount
      : tripMap.get(routeId) || 0;

    const totalPassengers = totalTrips * 20;
    const delayMinutes = 0;

    const congestionScore = Math.max(
      0,
      Math.min(
        100,
        Number(
          (
            totalPassengers * 0.25 +
            totalVehicles * 8 +
            Math.max(0, 35 - averageSpeed) * 1.8 +
            delayMinutes * 2.5
          ).toFixed(2)
        )
      )
    );

    const congestionLevel = deriveCongestionLevel(congestionScore);
    const snapshotId = randomSnapshotId();

    rowsToInsert.push({
      snapshot_id: snapshotId,
      route_id: routeId || null,
      route_name: routeName,
      congestion_score: congestionScore,
      congestion_level: congestionLevel,
      average_speed: averageSpeed,
      delay_minutes: delayMinutes,
      total_vehicles: totalVehicles,
      total_passengers: totalPassengers,
      source: "system",
      notes: "Auto-generated from current MySQL routes, vehicles, and trips data",
      created_at: mysqlCreatedAt,
    });

    createdSnapshots.push(
      mapBuiltSnapshot(
        {
          snapshotId,
          routeId,
          routeName,
          congestionScore,
          congestionLevel,
          averageSpeed,
          delayMinutes,
          totalVehicles,
          totalPassengers,
          source: "system",
          notes: "Auto-generated from current MySQL routes, vehicles, and trips data",
        },
        createdAt
      )
    );
  }

  console.log(`[traffic:snapshot] inserting ${rowsToInsert.length} snapshot rows...`);
  await bulkInsertTrafficSnapshots(rowsToInsert);
  console.log("[traffic:snapshot] insert complete");

  const overall =
    createdSnapshots.length > 0
      ? {
          congestionScore:
            createdSnapshots.reduce(
              (sum, item) => sum + Number(item.congestionScore || 0),
              0
            ) / createdSnapshots.length,
          averageSpeed:
            createdSnapshots.reduce(
              (sum, item) => sum + Number(item.averageSpeed || 0),
              0
            ) / createdSnapshots.length,
          delayMinutes:
            createdSnapshots.reduce(
              (sum, item) => sum + Number(item.delayMinutes || 0),
              0
            ) / createdSnapshots.length,
          totalVehicles: createdSnapshots.reduce(
            (sum, item) => sum + Number(item.totalVehicles || 0),
            0
          ),
          totalPassengers: createdSnapshots.reduce(
            (sum, item) => sum + Number(item.totalPassengers || 0),
            0
          ),
        }
      : {
          congestionScore: 0,
          averageSpeed: 0,
          delayMinutes: 0,
          totalVehicles: 0,
          totalPassengers: 0,
        };

  const overallScore = Number((overall.congestionScore || 0).toFixed(2));

  return {
    message: "Traffic snapshots generated successfully",
    summary: {
      congestionScore: overallScore,
      congestionLevel: deriveCongestionLevel(overallScore),
      averageSpeed: Number((overall.averageSpeed || 0).toFixed(2)),
      delayMinutes: Number((overall.delayMinutes || 0).toFixed(2)),
      totalVehicles: overall.totalVehicles,
      totalPassengers: overall.totalPassengers,
      routeCount: createdSnapshots.length,
    },
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
    const hours = Math.max(1, Math.min(24 * 30, Number(req.query.hours || 24)));
    const limit = Math.max(1, Math.min(1000, Number(req.query.limit || 500)));

    let rows;

    if (routeId) {
      [rows] = await pool.query(
        `SELECT *
         FROM (
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
    } else {
      [rows] = await pool.query(
        `SELECT *
         FROM (
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

router.get("/analytics", async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT
         COUNT(*) AS totalSnapshots,
         ROUND(AVG(congestion_score), 2) AS avgCongestionScore,
         ROUND(AVG(average_speed), 2) AS avgAverageSpeed,
         ROUND(AVG(delay_minutes), 2) AS avgDelayMinutes,
         SUM(total_vehicles) AS totalVehicles,
         SUM(total_passengers) AS totalPassengers,
         MIN(created_at) AS oldestSnapshot,
         MAX(created_at) AS latestSnapshot
       FROM traffic_snapshots
       WHERE created_at >= (NOW() - INTERVAL 7 DAY)`
    );

    const stats = rows[0] || {};

    res.json({
      totalSnapshots: Number(stats.totalSnapshots || 0),
      avgCongestionScore: Number(stats.avgCongestionScore || 0),
      avgAverageSpeed: Number(stats.avgAverageSpeed || 0),
      avgDelayMinutes: Number(stats.avgDelayMinutes || 0),
      totalVehicles: Number(stats.totalVehicles || 0),
      totalPassengers: Number(stats.totalPassengers || 0),
      oldestSnapshot: stats.oldestSnapshot || null,
      latestSnapshot: stats.latestSnapshot || null,
    });
  } catch (error) {
    next(error);
  }
});

router.post("/", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const snapshotId = randomSnapshotId();
    const routeId = String(req.body.routeId || req.body.route_id || "").trim();
    const routeName = String(req.body.routeName || req.body.route_name || "").trim();
    const congestionScore = toNumber(req.body.congestionScore ?? req.body.congestion_score, 0);
    const averageSpeed = toNumber(req.body.averageSpeed ?? req.body.average_speed, 0);
    const delayMinutes = toNumber(req.body.delayMinutes ?? req.body.delay_minutes, 0);
    const totalVehicles = toNumber(req.body.totalVehicles ?? req.body.total_vehicles, 0);
    const totalPassengers = toNumber(req.body.totalPassengers ?? req.body.total_passengers, 0);
    const source = String(req.body.source || "manual").trim() || "manual";
    const notes = String(req.body.notes || "").trim();
    const congestionLevel =
      String(req.body.congestionLevel || req.body.congestion_level || "").trim() ||
      deriveCongestionLevel(congestionScore);
    const mysqlCreatedAt = toMySqlPHTDateTime(new Date());

    await pool.query(
      `INSERT INTO traffic_snapshots
      (
        snapshot_id,
        route_id,
        route_name,
        congestion_score,
        congestion_level,
        average_speed,
        delay_minutes,
        total_vehicles,
        total_passengers,
        source,
        notes,
        created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        snapshotId,
        routeId || null,
        routeName || null,
        congestionScore,
        congestionLevel,
        averageSpeed,
        delayMinutes,
        totalVehicles,
        totalPassengers,
        source,
        notes,
        mysqlCreatedAt,
      ]
    );

    const [rows] = await pool.query(
      "SELECT * FROM traffic_snapshots WHERE snapshot_id = ? LIMIT 1",
      [snapshotId]
    );

    res.status(201).json(mapSnapshot(rows[0]));
  } catch (error) {
    next(error);
  }
});

router.post("/snapshot", async (req, res, next) => {
  console.log("[traffic:snapshot] route hit");

  try {
    const result = await Promise.race([
      generateSnapshotsFromLiveData(),
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error("Traffic snapshot generation timed out.")),
          SNAPSHOT_TIMEOUT_MS
        )
      ),
    ]);

    console.log(
      `[traffic:snapshot] success. Routes snapped: ${result?.summary?.routeCount || 0}`
    );

    res.json(result);
  } catch (error) {
    console.error("[traffic:snapshot] error:", error);
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