import express from "express";
import crypto from "crypto";
import { pool } from "../db.js";
import { requireAuth } from "../middleware/authMiddleware.js";
import { requireAdmin } from "../middleware/adminMiddleware.js";

const router = express.Router();

function randomStopId() {
  return `stop_${crypto.randomUUID().replace(/-/g, "")}`;
}

function mapStop(row) {
  return {
    id: row.stop_id,
    docId: row.id,
    stopId: row.stop_id,
    stopName: row.stop_name || "",
    routeId: row.route_id || "",
    latitude: row.latitude !== null ? Number(row.latitude) : 0,
    longitude: row.longitude !== null ? Number(row.longitude) : 0,
    sequenceNo: row.sequence_no !== null ? Number(row.sequence_no) : 0,
    status: row.status || "active",
    simulatedPassengers:
      row.simulated_passengers !== null ? Number(row.simulated_passengers) : 0,
    estimatedPassengers:
      row.estimated_passengers !== null ? Number(row.estimated_passengers) : 0,
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
        `SELECT * FROM stops
         WHERE route_id = ?
         ORDER BY
           CASE WHEN sequence_no IS NULL THEN 1 ELSE 0 END,
           sequence_no ASC,
           stop_name ASC`,
        [routeId]
      );
      rows = filtered;
    } else {
      const [all] = await pool.query(
        `SELECT * FROM stops
         ORDER BY
           route_id ASC,
           CASE WHEN sequence_no IS NULL THEN 1 ELSE 0 END,
           sequence_no ASC,
           stop_name ASC`
      );
      rows = all;
    }

    res.json(rows.map(mapStop));
  } catch (error) {
    next(error);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const identifier = String(req.params.id).trim();

    const [rows] = await pool.query(
      "SELECT * FROM stops WHERE stop_id = ? OR id = ? LIMIT 1",
      [identifier, Number(identifier) || 0]
    );

    if (!rows.length) {
      return res.status(404).json({ error: "Stop not found" });
    }

    res.json(mapStop(rows[0]));
  } catch (error) {
    next(error);
  }
});

router.post("/", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const stopId = String(req.body.stopId || "").trim() || randomStopId();
    const stopName = String(req.body.stopName || "").trim();
    const routeId = String(req.body.routeId || "").trim();
    const latitude = Number(req.body.latitude || 0);
    const longitude = Number(req.body.longitude || 0);
    const sequenceNo = Number(req.body.sequenceNo || 0);
    const status = String(req.body.status || "active").trim();
    const simulatedPassengers = Number(req.body.simulatedPassengers || 0);
    const estimatedPassengers = Number(req.body.estimatedPassengers || 0);
    const description = String(req.body.description || "").trim();

    if (!stopName) {
      return res.status(400).json({ error: "stopName is required" });
    }

    const [existing] = await pool.query(
      "SELECT stop_id FROM stops WHERE stop_id = ? LIMIT 1",
      [stopId]
    );

    if (existing.length) {
      return res.status(409).json({ error: "stopId already exists" });
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
      `INSERT INTO stops
      (stop_id, stop_name, route_id, latitude, longitude, sequence_no, status, simulated_passengers, estimated_passengers, description)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        stopId,
        stopName,
        routeId || null,
        latitude,
        longitude,
        sequenceNo,
        status,
        simulatedPassengers,
        estimatedPassengers,
        description || null,
      ]
    );

    const [rows] = await pool.query(
      "SELECT * FROM stops WHERE stop_id = ? LIMIT 1",
      [stopId]
    );

    res.status(201).json({
      message: "Stop created successfully",
      stop: mapStop(rows[0]),
    });
  } catch (error) {
    next(error);
  }
});

router.put("/:id", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const identifier = String(req.params.id).trim();

    const [existingRows] = await pool.query(
      "SELECT * FROM stops WHERE stop_id = ? OR id = ? LIMIT 1",
      [identifier, Number(identifier) || 0]
    );

    if (!existingRows.length) {
      return res.status(404).json({ error: "Stop not found" });
    }

    const existing = existingRows[0];

    const stopName =
      req.body.stopName !== undefined
        ? String(req.body.stopName).trim()
        : existing.stop_name;

    if (!stopName) {
      return res.status(400).json({ error: "stopName is required" });
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

    const latitude =
      req.body.latitude !== undefined
        ? Number(req.body.latitude)
        : Number(existing.latitude || 0);

    const longitude =
      req.body.longitude !== undefined
        ? Number(req.body.longitude)
        : Number(existing.longitude || 0);

    const sequenceNo =
      req.body.sequenceNo !== undefined
        ? Number(req.body.sequenceNo)
        : Number(existing.sequence_no || 0);

    const status =
      req.body.status !== undefined
        ? String(req.body.status).trim()
        : existing.status;

    const simulatedPassengers =
      req.body.simulatedPassengers !== undefined
        ? Number(req.body.simulatedPassengers)
        : Number(existing.simulated_passengers || 0);

    const estimatedPassengers =
      req.body.estimatedPassengers !== undefined
        ? Number(req.body.estimatedPassengers)
        : Number(existing.estimated_passengers || 0);

    const description =
      req.body.description !== undefined
        ? String(req.body.description).trim()
        : existing.description || "";

    await pool.query(
      `UPDATE stops
       SET stop_name = ?, route_id = ?, latitude = ?, longitude = ?, sequence_no = ?, status = ?, simulated_passengers = ?, estimated_passengers = ?, description = ?, updated_at = ?
       WHERE stop_id = ?`,
      [
        stopName,
        routeId || null,
        latitude,
        longitude,
        sequenceNo,
        status,
        simulatedPassengers,
        estimatedPassengers,
        description || null,
        new Date(),
        existing.stop_id,
      ]
    );

    const [rows] = await pool.query(
      "SELECT * FROM stops WHERE stop_id = ? LIMIT 1",
      [existing.stop_id]
    );

    res.json({
      message: "Stop updated successfully",
      stop: mapStop(rows[0]),
    });
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const identifier = String(req.params.id).trim();

    const [existingRows] = await pool.query(
      "SELECT * FROM stops WHERE stop_id = ? OR id = ? LIMIT 1",
      [identifier, Number(identifier) || 0]
    );

    if (!existingRows.length) {
      return res.status(404).json({ error: "Stop not found" });
    }

    await pool.query("DELETE FROM stops WHERE stop_id = ?", [
      existingRows[0].stop_id,
    ]);

    res.json({ message: "Stop deleted successfully" });
  } catch (error) {
    next(error);
  }
});

export default router;