import express from "express";
import crypto from "crypto";
import { pool } from "../db.js";
import { requireAuth } from "../middleware/authMiddleware.js";
import { requireAdmin } from "../middleware/adminMiddleware.js";

const router = express.Router();

function randomVehicleId() {
  return `veh_${crypto.randomUUID().replace(/-/g, "")}`;
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function mapVehicle(row) {
  return {
    id: row.vehicle_id || "",
    docId: row.id,
    vehicleId: row.vehicle_id || "",
    label: row.label || "",
    routeId: row.route_id || "",
    status: row.status || "active",
    latitude: row.latitude !== null ? Number(row.latitude) : null,
    longitude: row.longitude !== null ? Number(row.longitude) : null,
    speed: row.speed !== null ? Number(row.speed) : 0,
    capacity: row.capacity !== null ? Number(row.capacity) : 0,
    createdAt:
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : row.created_at || null,
  };
}

router.get("/", async (req, res, next) => {
  try {
    const routeId = String(req.query.routeId || "").trim();
    const status = String(req.query.status || "").trim();

    let query = `
      SELECT *
      FROM vehicles
      WHERE 1=1
    `;
    const params = [];

    if (routeId) {
      query += ` AND route_id = ?`;
      params.push(routeId);
    }

    if (status) {
      query += ` AND status = ?`;
      params.push(status);
    }

    query += ` ORDER BY vehicle_id ASC, id ASC`;

    const [rows] = await pool.query(query, params);
    res.json(rows.map(mapVehicle));
  } catch (error) {
    next(error);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const identifier = String(req.params.id || "").trim();

    const [rows] = await pool.query(
      `
      SELECT *
      FROM vehicles
      WHERE vehicle_id = ? OR id = ?
      LIMIT 1
      `,
      [identifier, Number(identifier) || 0]
    );

    if (!rows.length) {
      return res.status(404).json({ error: "Vehicle not found" });
    }

    res.json(mapVehicle(rows[0]));
  } catch (error) {
    next(error);
  }
});

router.post("/", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const vehicleId =
      String(req.body.vehicleId || "").trim() || randomVehicleId();
    const label = String(req.body.label || "").trim();
    const routeId = String(req.body.routeId || "").trim();
    const status = String(req.body.status || "active").trim();
    const latitude =
      req.body.latitude !== undefined && req.body.latitude !== null
        ? toNumber(req.body.latitude, null)
        : null;
    const longitude =
      req.body.longitude !== undefined && req.body.longitude !== null
        ? toNumber(req.body.longitude, null)
        : null;
    const speed = toNumber(req.body.speed, 0);
    const capacity = Math.max(0, Math.floor(toNumber(req.body.capacity, 0)));

    const [existingRows] = await pool.query(
      "SELECT id FROM vehicles WHERE vehicle_id = ? LIMIT 1",
      [vehicleId]
    );

    if (existingRows.length) {
      return res.status(409).json({ error: "vehicleId already exists" });
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

    await pool.query(
      `
      INSERT INTO vehicles
      (vehicle_id, label, route_id, status, latitude, longitude, speed, capacity)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [vehicleId, label || null, routeId || null, status, latitude, longitude, speed, capacity]
    );

    const [rows] = await pool.query(
      "SELECT * FROM vehicles WHERE vehicle_id = ? LIMIT 1",
      [vehicleId]
    );

    res.status(201).json({
      message: "Vehicle created successfully",
      vehicle: mapVehicle(rows[0]),
    });
  } catch (error) {
    next(error);
  }
});

router.put("/:id", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const identifier = String(req.params.id || "").trim();

    const [existingRows] = await pool.query(
      `
      SELECT *
      FROM vehicles
      WHERE vehicle_id = ? OR id = ?
      LIMIT 1
      `,
      [identifier, Number(identifier) || 0]
    );

    if (!existingRows.length) {
      return res.status(404).json({ error: "Vehicle not found" });
    }

    const existing = existingRows[0];

    const label =
      req.body.label !== undefined ? String(req.body.label).trim() : existing.label;
    const routeId =
      req.body.routeId !== undefined
        ? String(req.body.routeId).trim()
        : existing.route_id || "";
    const status =
      req.body.status !== undefined
        ? String(req.body.status).trim()
        : existing.status || "active";
    const latitude =
      req.body.latitude !== undefined
        ? req.body.latitude === null || req.body.latitude === ""
          ? null
          : toNumber(req.body.latitude, null)
        : existing.latitude;
    const longitude =
      req.body.longitude !== undefined
        ? req.body.longitude === null || req.body.longitude === ""
          ? null
          : toNumber(req.body.longitude, null)
        : existing.longitude;
    const speed =
      req.body.speed !== undefined ? toNumber(req.body.speed, 0) : existing.speed;
    const capacity =
      req.body.capacity !== undefined
        ? Math.max(0, Math.floor(toNumber(req.body.capacity, 0)))
        : existing.capacity;

    if (routeId) {
      const [routeRows] = await pool.query(
        "SELECT route_id FROM routes WHERE route_id = ? LIMIT 1",
        [routeId]
      );

      if (!routeRows.length) {
        return res.status(400).json({ error: "routeId does not exist" });
      }
    }

    await pool.query(
      `
      UPDATE vehicles
      SET label = ?,
          route_id = ?,
          status = ?,
          latitude = ?,
          longitude = ?,
          speed = ?,
          capacity = ?
      WHERE vehicle_id = ?
      `,
      [
        label || null,
        routeId || null,
        status,
        latitude,
        longitude,
        speed,
        capacity,
        existing.vehicle_id,
      ]
    );

    const [rows] = await pool.query(
      "SELECT * FROM vehicles WHERE vehicle_id = ? LIMIT 1",
      [existing.vehicle_id]
    );

    res.json({
      message: "Vehicle updated successfully",
      vehicle: mapVehicle(rows[0]),
    });
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const identifier = String(req.params.id || "").trim();

    const [rows] = await pool.query(
      `
      SELECT *
      FROM vehicles
      WHERE vehicle_id = ? OR id = ?
      LIMIT 1
      `,
      [identifier, Number(identifier) || 0]
    );

    if (!rows.length) {
      return res.status(404).json({ error: "Vehicle not found" });
    }

    await pool.query("DELETE FROM vehicles WHERE vehicle_id = ?", [
      rows[0].vehicle_id,
    ]);

    res.json({ message: "Vehicle deleted successfully" });
  } catch (error) {
    next(error);
  }
});

export default router;