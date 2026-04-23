import express from "express";
import crypto from "crypto";
import { pool } from "../db.js";
import { requireAuth } from "../middleware/authMiddleware.js";
import { requireAdmin } from "../middleware/adminMiddleware.js";

const router = express.Router();

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

function mapSnapshot(row) {
  const rawDate = row.created_at ? new Date(row.created_at) : new Date();
  const timestampText = rawDate.toISOString();
  const timestampMs = rawDate.getTime();

  return {
    id: row.snapshot_id || "",
    docId: row.id,
    snapshotId: row.snapshot_id || "",
    routeId: row.route_id || "",
    routeName: row.route_name || "",
    congestionScore:
      row.congestion_score !== null ? Number(row.congestion_score) : 0,
    congestionLevel: row.congestion_level || "Low",
    averageSpeed:
      row.average_speed !== null
        ? Number(row.average_speed)
        : row.avg_speed !== null
        ? Number(row.avg_speed)
        : 0,
    delayMinutes: row.delay_minutes !== null ? Number(row.delay_minutes) : 0,
    totalVehicles: row.total_vehicles !== null ? Number(row.total_vehicles) : 0,
    totalPassengers:
      row.total_passengers !== null ? Number(row.total_passengers) : 0,
    source: row.source || "system",
    notes: row.notes || "",
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

async function generateSnapshotsFromLiveData() {
  const sourceRoutes = await buildRouteSourceList();

  const [vehicleCountRows] = await pool.query(
    `SELECT route_id, COUNT(*) AS totalVehicles
     FROM vehicles
     GROUP BY route_id`
  );

  const [vehicleSpeedRows] = await pool.query(
    `SELECT route_id, COALESCE(AVG(speed), 0) AS avgSpeed
     FROM vehicles
     GROUP BY route_id`
  );

  const [tripCountRows] = await pool.query(
    `SELECT route_id, COUNT(*) AS totalTrips
     FROM trips
     GROUP BY route_id`
  );

  const [overallVehicleRows] = await pool.query(
    `SELECT
       COUNT(*) AS totalVehicles,
       COALESCE(AVG(speed), 0) AS avgSpeed
     FROM vehicles`
  );

  const [overallTripRows] = await pool.query(
    `SELECT COUNT(*) AS totalTrips
     FROM trips`
  );

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

  const created = [];

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
        notes
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        snapshotId,
        routeId || null,
        routeName,
        congestionScore,
        congestionLevel,
        averageSpeed,
        delayMinutes,
        totalVehicles,
        totalPassengers,
        "system",
        "Auto-generated from current MySQL routes, vehicles, and trips data",
      ]
    );

    const [rows] = await pool.query(
      "SELECT * FROM traffic_snapshots WHERE snapshot_id = ? LIMIT 1",
      [snapshotId]
    );

    if (rows.length) {
      created.push(mapSnapshot(rows[0]));
    }
  }

  const overall =
    created.length > 0
      ? {
          congestionScore:
            created.reduce(
              (sum, item) => sum + Number(item.congestionScore || 0),
              0
            ) / created.length,
          averageSpeed:
            created.reduce(
              (sum, item) => sum + Number(item.averageSpeed || 0),
              0
            ) / created.length,
          delayMinutes:
            created.reduce(
              (sum, item) => sum + Number(item.delayMinutes || 0),
              0
            ) / created.length,
          totalVehicles: created.reduce(
            (sum, item) => sum + Number(item.totalVehicles || 0),
            0
          ),
          totalPassengers: created.reduce(
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
      routeCount: created.length,
    },
    snapshots: created,
  };
}

router.get("/", async (req, res, next) => {
  try {
    const routeId = String(req.query.routeId || "").trim();
    const latest = await getLatestSnapshot(routeId);

    if (!latest) {
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
        timestampText: new Date().toISOString(),
        timestampMs: Date.now(),
        createdAt: new Date().toISOString(),
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
         FROM traffic_snapshots
         WHERE route_id = ?
           AND created_at >= (NOW() - INTERVAL ? HOUR)
         ORDER BY created_at ASC, id ASC
         LIMIT ?`,
        [routeId, hours, limit]
      );
    } else {
      [rows] = await pool.query(
        `SELECT *
         FROM traffic_snapshots
         WHERE created_at >= (NOW() - INTERVAL ? HOUR)
         ORDER BY created_at ASC, id ASC
         LIMIT ?`,
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

    res.json(
      rows[0] || {
        totalSnapshots: 0,
        avgCongestionScore: 0,
        avgAverageSpeed: 0,
        avgDelayMinutes: 0,
        totalVehicles: 0,
        totalPassengers: 0,
        oldestSnapshot: null,
        latestSnapshot: null,
      }
    );
  } catch (error) {
    next(error);
  }
});

router.post("/", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const snapshotId =
      String(req.body.snapshotId || "").trim() || randomSnapshotId();
    const routeId = String(req.body.routeId || "").trim();
    const routeName = String(req.body.routeName || "").trim();
    const congestionScore = toNumber(req.body.congestionScore, 0);
    const congestionLevel = String(
      req.body.congestionLevel || deriveCongestionLevel(congestionScore)
    ).trim();
    const averageSpeed = toNumber(req.body.averageSpeed, 0);
    const delayMinutes = toNumber(req.body.delayMinutes, 0);
    const totalVehicles = Math.max(0, Math.floor(toNumber(req.body.totalVehicles, 0)));
    const totalPassengers = Math.max(
      0,
      Math.floor(toNumber(req.body.totalPassengers, 0))
    );
    const source = String(req.body.source || "manual").trim();
    const notes = String(req.body.notes || "").trim();

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
        notes
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
        notes || null,
      ]
    );

    const [rows] = await pool.query(
      "SELECT * FROM traffic_snapshots WHERE snapshot_id = ? LIMIT 1",
      [snapshotId]
    );

    res.status(201).json({
      message: "Traffic snapshot created successfully",
      snapshot: mapSnapshot(rows[0]),
    });
  } catch (error) {
    next(error);
  }
});

router.post("/snapshot", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const result = await generateSnapshotsFromLiveData();
    res.json(result);
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