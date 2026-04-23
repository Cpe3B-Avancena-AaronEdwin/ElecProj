import express from "express";
import crypto from "crypto";
import { pool } from "../db.js";
import { requireAuth } from "../middleware/authMiddleware.js";
import { requireAdmin } from "../middleware/adminMiddleware.js";

const router = express.Router();

function randomRouteId() {
  return `route_${crypto.randomUUID().replace(/-/g, "")}`;
}

function mapRoute(row) {
  return {
    id: row.route_id,
    docId: row.id,
    routeId: row.route_id,
    routeName: row.route_name || "",
    routeCode: row.route_code || "",
    color: row.color || "",
    status: row.status || "active",
    startPoint: row.start_point || "",
    endPoint: row.end_point || "",
    fare: row.fare !== null ? Number(row.fare) : 0,
    distanceKm: row.distance_km !== null ? Number(row.distance_km) : 0,
    estimatedDurationMinutes:
      row.estimated_duration_minutes !== null
        ? Number(row.estimated_duration_minutes)
        : 0,
    description: row.description || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

router.get("/", async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM routes ORDER BY route_name ASC, created_at DESC"
    );
    res.json(rows.map(mapRoute));
  } catch (error) {
    next(error);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const identifier = String(req.params.id).trim();

    const [rows] = await pool.query(
      "SELECT * FROM routes WHERE route_id = ? OR id = ? LIMIT 1",
      [identifier, Number(identifier) || 0]
    );

    if (!rows.length) {
      return res.status(404).json({ error: "Route not found" });
    }

    res.json(mapRoute(rows[0]));
  } catch (error) {
    next(error);
  }
});

router.post("/", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const routeId = String(req.body.routeId || "").trim() || randomRouteId();
    const routeName = String(req.body.routeName || "").trim();
    const routeCode = String(req.body.routeCode || "").trim();
    const color = String(req.body.color || "").trim();
    const status = String(req.body.status || "active").trim();
    const startPoint = String(req.body.startPoint || "").trim();
    const endPoint = String(req.body.endPoint || "").trim();
    const fare = Number(req.body.fare || 0);
    const distanceKm = Number(req.body.distanceKm || 0);
    const estimatedDurationMinutes = Number(
      req.body.estimatedDurationMinutes || 0
    );
    const description = String(req.body.description || "").trim();

    if (!routeName) {
      return res.status(400).json({ error: "routeName is required" });
    }

    const [existing] = await pool.query(
      "SELECT route_id FROM routes WHERE route_id = ? LIMIT 1",
      [routeId]
    );

    if (existing.length) {
      return res.status(409).json({ error: "routeId already exists" });
    }

    await pool.query(
      `INSERT INTO routes
      (route_id, route_name, route_code, color, status, start_point, end_point, fare, distance_km, estimated_duration_minutes, description)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        routeId,
        routeName,
        routeCode || null,
        color || null,
        status,
        startPoint || null,
        endPoint || null,
        fare,
        distanceKm,
        estimatedDurationMinutes,
        description || null,
      ]
    );

    const [rows] = await pool.query(
      "SELECT * FROM routes WHERE route_id = ? LIMIT 1",
      [routeId]
    );

    res.status(201).json({
      message: "Route created successfully",
      route: mapRoute(rows[0]),
    });
  } catch (error) {
    next(error);
  }
});

router.put("/:id", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const identifier = String(req.params.id).trim();

    const [existingRows] = await pool.query(
      "SELECT * FROM routes WHERE route_id = ? OR id = ? LIMIT 1",
      [identifier, Number(identifier) || 0]
    );

    if (!existingRows.length) {
      return res.status(404).json({ error: "Route not found" });
    }

    const existing = existingRows[0];

    const routeName =
      req.body.routeName !== undefined
        ? String(req.body.routeName).trim()
        : existing.route_name;

    if (!routeName) {
      return res.status(400).json({ error: "routeName is required" });
    }

    const routeCode =
      req.body.routeCode !== undefined
        ? String(req.body.routeCode).trim()
        : existing.route_code || "";

    const color =
      req.body.color !== undefined
        ? String(req.body.color).trim()
        : existing.color || "";

    const status =
      req.body.status !== undefined
        ? String(req.body.status).trim()
        : existing.status;

    const startPoint =
      req.body.startPoint !== undefined
        ? String(req.body.startPoint).trim()
        : existing.start_point || "";

    const endPoint =
      req.body.endPoint !== undefined
        ? String(req.body.endPoint).trim()
        : existing.end_point || "";

    const fare =
      req.body.fare !== undefined ? Number(req.body.fare) : Number(existing.fare || 0);

    const distanceKm =
      req.body.distanceKm !== undefined
        ? Number(req.body.distanceKm)
        : Number(existing.distance_km || 0);

    const estimatedDurationMinutes =
      req.body.estimatedDurationMinutes !== undefined
        ? Number(req.body.estimatedDurationMinutes)
        : Number(existing.estimated_duration_minutes || 0);

    const description =
      req.body.description !== undefined
        ? String(req.body.description).trim()
        : existing.description || "";

    await pool.query(
      `UPDATE routes
       SET route_name = ?, route_code = ?, color = ?, status = ?, start_point = ?, end_point = ?, fare = ?, distance_km = ?, estimated_duration_minutes = ?, description = ?, updated_at = ?
       WHERE route_id = ?`,
      [
        routeName,
        routeCode || null,
        color || null,
        status,
        startPoint || null,
        endPoint || null,
        fare,
        distanceKm,
        estimatedDurationMinutes,
        description || null,
        new Date(),
        existing.route_id,
      ]
    );

    const [rows] = await pool.query(
      "SELECT * FROM routes WHERE route_id = ? LIMIT 1",
      [existing.route_id]
    );

    res.json({
      message: "Route updated successfully",
      route: mapRoute(rows[0]),
    });
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const identifier = String(req.params.id).trim();

    const [existingRows] = await pool.query(
      "SELECT * FROM routes WHERE route_id = ? OR id = ? LIMIT 1",
      [identifier, Number(identifier) || 0]
    );

    if (!existingRows.length) {
      return res.status(404).json({ error: "Route not found" });
    }

    await pool.query("DELETE FROM routes WHERE route_id = ?", [
      existingRows[0].route_id,
    ]);

    res.json({ message: "Route deleted successfully" });
  } catch (error) {
    next(error);
  }
});

export default router;