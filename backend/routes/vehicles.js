import express from "express";
import crypto from "crypto";
import { pool } from "../db.js";
import { requireAuth } from "../middleware/authMiddleware.js";
import { requireAdmin } from "../middleware/adminMiddleware.js";

const router = express.Router();

function randomVehicleId() {
  return `vehicle_${crypto.randomUUID().replace(/-/g, "")}`;
}

function mapVehicle(row) {
  return {
    id: row.vehicle_id,
    docId: row.id,
    vehicleId: row.vehicle_id,
    vehicleNumber: row.vehicle_number || "",
    routeId: row.route_id || "",
    type: row.type || "",
    capacity: row.capacity !== null ? Number(row.capacity) : 0,
    status: row.status || "active",
    driverName: row.driver_name || "",
    plateNumber: row.plate_number || "",
    latitude: row.latitude !== null ? Number(row.latitude) : 0,
    longitude: row.longitude !== null ? Number(row.longitude) : 0,
    speed: row.speed !== null ? Number(row.speed) : 0,
    occupancy: row.occupancy !== null ? Number(row.occupancy) : 0,
    description: row.description || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

router.get("/", async (req, res, next) => {
  try {
    const routeId = String(req.query.routeId || "").trim();

    let rows;
    if (routeId) {
      const [filtered] = await pool.query(
        "SELECT * FROM vehicles WHERE route_id = ? ORDER BY vehicle_number ASC",
        [routeId]
      );
      rows = filtered;
    } else {
      const [all] = await pool.query(
        "SELECT * FROM vehicles ORDER BY vehicle_number ASC, created_at DESC"
      );
      rows = all;
    }

    res.json(rows.map(mapVehicle));
  } catch (error) {
    next(error);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const identifier = String(req.params.id).trim();

    const [rows] = await pool.query(
      "SELECT * FROM vehicles WHERE vehicle_id = ? OR id = ? LIMIT 1",
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
    const vehicleNumber = String(req.body.vehicleNumber || "").trim();
    const routeId = String(req.body.routeId || "").trim();
    const type = String(req.body.type || "").trim();
    const capacity = Number(req.body.capacity || 0);
    const status = String(req.body.status || "active").trim();
    const driverName = String(req.body.driverName || "").trim();
    const plateNumber = String(req.body.plateNumber || "").trim();
    const latitude = Number(req.body.latitude || 0);
    const longitude = Number(req.body.longitude || 0);
    const speed = Number(req.body.speed || 0);
    const occupancy = Number(req.body.occupancy || 0);
    const description = String(req.body.description || "").trim();

    if (!vehicleNumber) {
      return res.status(400).json({ error: "vehicleNumber is required" });
    }

    const [existing] = await pool.query(
      "SELECT vehicle_id FROM vehicles WHERE vehicle_id = ? LIMIT 1",
      [vehicleId]
    );

    if (existing.length) {
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
      `INSERT INTO vehicles
      (vehicle_id, vehicle_number, route_id, type, capacity, status, driver_name, plate_number, latitude, longitude, speed, occupancy, description)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        vehicleId,
        vehicleNumber,
        routeId || null,
        type || null,
        capacity,
        status,
        driverName || null,
        plateNumber || null,
        latitude,
        longitude,
        speed,
        occupancy,
        description || null,
      ]
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
    const identifier = String(req.params.id).trim();

    const [existingRows] = await pool.query(
      "SELECT * FROM vehicles WHERE vehicle_id = ? OR id = ? LIMIT 1",
      [identifier, Number(identifier) || 0]
    );

    if (!existingRows.length) {
      return res.status(404).json({ error: "Vehicle not found" });
    }

    const existing = existingRows[0];

    const vehicleNumber =
      req.body.vehicleNumber !== undefined
        ? String(req.body.vehicleNumber).trim()
        : existing.vehicle_number;

    if (!vehicleNumber) {
      return res.status(400).json({ error: "vehicleNumber is required" });
    }

    const routeId =
      req.body.routeId !== undefined
        ? String(req.body.routeId).trim()
        : existing.route_id || "";

    if (routeId) {
      const [routeRows] = await pool.query(
        "SELECT route_id FROM routes WHERE route_id = ? LIMIT 1",
        [routeId]
      );

      if (!routeRows.length) {
        return res.status(400).json({ error: "routeId does not exist" });
      }
    }

    const type =
      req.body.type !== undefined
        ? String(req.body.type).trim()
        : existing.type || "";

    const capacity =
      req.body.capacity !== undefined
        ? Number(req.body.capacity)
        : Number(existing.capacity || 0);

    const status =
      req.body.status !== undefined
        ? String(req.body.status).trim()
        : existing.status;

    const driverName =
      req.body.driverName !== undefined
        ? String(req.body.driverName).trim()
        : existing.driver_name || "";

    const plateNumber =
      req.body.plateNumber !== undefined
        ? String(req.body.plateNumber).trim()
        : existing.plate_number || "";

    const latitude =
      req.body.latitude !== undefined
        ? Number(req.body.latitude)
        : Number(existing.latitude || 0);

    const longitude =
      req.body.longitude !== undefined
        ? Number(req.body.longitude)
        : Number(existing.longitude || 0);

    const speed =
      req.body.speed !== undefined
        ? Number(req.body.speed)
        : Number(existing.speed || 0);

    const occupancy =
      req.body.occupancy !== undefined
        ? Number(req.body.occupancy)
        : Number(existing.occupancy || 0);

    const description =
      req.body.description !== undefined
        ? String(req.body.description).trim()
        : existing.description || "";

    await pool.query(
      `UPDATE vehicles
       SET vehicle_number = ?, route_id = ?, type = ?, capacity = ?, status = ?, driver_name = ?, plate_number = ?, latitude = ?, longitude = ?, speed = ?, occupancy = ?, description = ?, updated_at = ?
       WHERE vehicle_id = ?`,
      [
        vehicleNumber,
        routeId || null,
        type || null,
        capacity,
        status,
        driverName || null,
        plateNumber || null,
        latitude,
        longitude,
        speed,
        occupancy,
        description || null,
        new Date(),
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
    const identifier = String(req.params.id).trim();

    const [existingRows] = await pool.query(
      "SELECT * FROM vehicles WHERE vehicle_id = ? OR id = ? LIMIT 1",
      [identifier, Number(identifier) || 0]
    );

    if (!existingRows.length) {
      return res.status(404).json({ error: "Vehicle not found" });
    }

    await pool.query("DELETE FROM vehicles WHERE vehicle_id = ?", [
      existingRows[0].vehicle_id,
    ]);

    res.json({ message: "Vehicle deleted successfully" });
  } catch (error) {
    next(error);
  }
});

export default router;