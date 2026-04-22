import express from "express";
import crypto from "crypto";
import { pool } from "../db.js";
import { requireAuth } from "../middleware/authMiddleware.js";
import { requireAdmin } from "../middleware/adminMiddleware.js";

const router = express.Router();

function randomTripId() {
  return `trip_${crypto.randomUUID().replace(/-/g, "")}`;
}

function mapTrip(row) {
  return {
    id: row.trip_id,
    docId: row.id,
    tripId: row.trip_id,
    routeId: row.route_id || "",
    vehicleId: row.vehicle_id || "",
    tripName: row.trip_name || "",
    direction: row.direction || "",
    departureTime: row.departure_time || "",
    arrivalTime: row.arrival_time || "",
    status: row.status || "scheduled",
    delayMinutes: row.delay_minutes !== null ? Number(row.delay_minutes) : 0,
    passengerCount:
      row.passenger_count !== null ? Number(row.passenger_count) : 0,
    notes: row.notes || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

router.get("/", async (req, res, next) => {
  try {
    const routeId = String(req.query.routeId || "").trim();
    const vehicleId = String(req.query.vehicleId || "").trim();

    let sql = "SELECT * FROM trips";
    const params = [];
    const conditions = [];

    if (routeId) {
      conditions.push("route_id = ?");
      params.push(routeId);
    }

    if (vehicleId) {
      conditions.push("vehicle_id = ?");
      params.push(vehicleId);
    }

    if (conditions.length) {
      sql += ` WHERE ${conditions.join(" AND ")}`;
    }

    sql += ` ORDER BY
      CASE WHEN departure_time IS NULL THEN 1 ELSE 0 END,
      departure_time ASC,
      created_at DESC`;

    const [rows] = await pool.query(sql, params);
    res.json(rows.map(mapTrip));
  } catch (error) {
    next(error);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const identifier = String(req.params.id).trim();

    const [rows] = await pool.query(
      "SELECT * FROM trips WHERE trip_id = ? OR id = ? LIMIT 1",
      [identifier, Number(identifier) || 0]
    );

    if (!rows.length) {
      return res.status(404).json({ error: "Trip not found" });
    }

    res.json(mapTrip(rows[0]));
  } catch (error) {
    next(error);
  }
});

router.post("/", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const tripId = String(req.body.tripId || "").trim() || randomTripId();
    const routeId = String(req.body.routeId || "").trim();
    const vehicleId = String(req.body.vehicleId || "").trim();
    const tripName = String(req.body.tripName || "").trim();
    const direction = String(req.body.direction || "").trim();
    const departureTime = String(req.body.departureTime || "").trim();
    const arrivalTime = String(req.body.arrivalTime || "").trim();
    const status = String(req.body.status || "scheduled").trim();
    const delayMinutes = Number(req.body.delayMinutes || 0);
    const passengerCount = Number(req.body.passengerCount || 0);
    const notes = String(req.body.notes || "").trim();

    const [existing] = await pool.query(
      "SELECT trip_id FROM trips WHERE trip_id = ? LIMIT 1",
      [tripId]
    );

    if (existing.length) {
      return res.status(409).json({ error: "tripId already exists" });
    }

    if (routeId) {
      const [routeRows] = await pool.query(
        "SELECT route_id FROM routes WHERE route_id = ? LIMIT 1",
        [routeId]
      );

      if (!routeRows.length) {
        return res.status(400).json({ error: "routeId does not exist" });
      }
    }

    if (vehicleId) {
      const [vehicleRows] = await pool.query(
        "SELECT vehicle_id FROM vehicles WHERE vehicle_id = ? LIMIT 1",
        [vehicleId]
      );

      if (!vehicleRows.length) {
        return res.status(400).json({ error: "vehicleId does not exist" });
      }
    }

    await pool.query(
      `INSERT INTO trips
      (trip_id, route_id, vehicle_id, trip_name, direction, departure_time, arrival_time, status, delay_minutes, passenger_count, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        tripId,
        routeId || null,
        vehicleId || null,
        tripName || null,
        direction || null,
        departureTime || null,
        arrivalTime || null,
        status,
        delayMinutes,
        passengerCount,
        notes || null,
      ]
    );

    const [rows] = await pool.query(
      "SELECT * FROM trips WHERE trip_id = ? LIMIT 1",
      [tripId]
    );

    res.status(201).json({
      message: "Trip created successfully",
      trip: mapTrip(rows[0]),
    });
  } catch (error) {
    next(error);
  }
});

router.put("/:id", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const identifier = String(req.params.id).trim();

    const [existingRows] = await pool.query(
      "SELECT * FROM trips WHERE trip_id = ? OR id = ? LIMIT 1",
      [identifier, Number(identifier) || 0]
    );

    if (!existingRows.length) {
      return res.status(404).json({ error: "Trip not found" });
    }

    const existing = existingRows[0];

    const routeId =
      req.body.routeId !== undefined
        ? String(req.body.routeId).trim()
        : existing.route_id || "";

    const vehicleId =
      req.body.vehicleId !== undefined
        ? String(req.body.vehicleId).trim()
        : existing.vehicle_id || "";

    if (routeId) {
      const [routeRows] = await pool.query(
        "SELECT route_id FROM routes WHERE route_id = ? LIMIT 1",
        [routeId]
      );

      if (!routeRows.length) {
        return res.status(400).json({ error: "routeId does not exist" });
      }
    }

    if (vehicleId) {
      const [vehicleRows] = await pool.query(
        "SELECT vehicle_id FROM vehicles WHERE vehicle_id = ? LIMIT 1",
        [vehicleId]
      );

      if (!vehicleRows.length) {
        return res.status(400).json({ error: "vehicleId does not exist" });
      }
    }

    const tripName =
      req.body.tripName !== undefined
        ? String(req.body.tripName).trim()
        : existing.trip_name || "";

    const direction =
      req.body.direction !== undefined
        ? String(req.body.direction).trim()
        : existing.direction || "";

    const departureTime =
      req.body.departureTime !== undefined
        ? String(req.body.departureTime).trim()
        : existing.departure_time || "";

    const arrivalTime =
      req.body.arrivalTime !== undefined
        ? String(req.body.arrivalTime).trim()
        : existing.arrival_time || "";

    const status =
      req.body.status !== undefined
        ? String(req.body.status).trim()
        : existing.status;

    const delayMinutes =
      req.body.delayMinutes !== undefined
        ? Number(req.body.delayMinutes)
        : Number(existing.delay_minutes || 0);

    const passengerCount =
      req.body.passengerCount !== undefined
        ? Number(req.body.passengerCount)
        : Number(existing.passenger_count || 0);

    const notes =
      req.body.notes !== undefined
        ? String(req.body.notes).trim()
        : existing.notes || "";

    await pool.query(
      `UPDATE trips
       SET route_id = ?, vehicle_id = ?, trip_name = ?, direction = ?, departure_time = ?, arrival_time = ?, status = ?, delay_minutes = ?, passenger_count = ?, notes = ?, updated_at = ?
       WHERE trip_id = ?`,
      [
        routeId || null,
        vehicleId || null,
        tripName || null,
        direction || null,
        departureTime || null,
        arrivalTime || null,
        status,
        delayMinutes,
        passengerCount,
        notes || null,
        new Date(),
        existing.trip_id,
      ]
    );

    const [rows] = await pool.query(
      "SELECT * FROM trips WHERE trip_id = ? LIMIT 1",
      [existing.trip_id]
    );

    res.json({
      message: "Trip updated successfully",
      trip: mapTrip(rows[0]),
    });
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const identifier = String(req.params.id).trim();

    const [existingRows] = await pool.query(
      "SELECT * FROM trips WHERE trip_id = ? OR id = ? LIMIT 1",
      [identifier, Number(identifier) || 0]
    );

    if (!existingRows.length) {
      return res.status(404).json({ error: "Trip not found" });
    }

    await pool.query("DELETE FROM trips WHERE trip_id = ?", [
      existingRows[0].trip_id,
    ]);

    res.json({ message: "Trip deleted successfully" });
  } catch (error) {
    next(error);
  }
});

export default router;