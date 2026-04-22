import express from "express";
import crypto from "crypto";
import { pool } from "../db.js";
import { requireAuth } from "../middleware/authMiddleware.js";
import { requireAdmin } from "../middleware/adminMiddleware.js";

const router = express.Router();

function randomPredictionId() {
  return `prediction_${crypto.randomUUID().replace(/-/g, "")}`;
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function congestionLabel(score) {
  if (score >= 70) return "High";
  if (score >= 40) return "Medium";
  return "Low";
}

function riskLabel(score) {
  if (score >= 70) return "High";
  if (score >= 40) return "Medium";
  return "Low";
}

function mapPrediction(row) {
  const timestampText =
    row.created_at instanceof Date
      ? row.created_at.toISOString()
      : new Date(row.created_at).toISOString();

  const timestampMs =
    row.created_at instanceof Date
      ? row.created_at.getTime()
      : new Date(row.created_at).getTime();

  return {
    id: row.prediction_id,
    docId: row.id,
    predictionId: row.prediction_id,
    routeId: row.route_id || "",
    routeName: row.route_name || "",
    predictedCongestion: row.predicted_congestion || "Low",
    predictedDelayRisk: row.predicted_delay_risk || "Low",
    confidenceScore:
      row.confidence_score !== null ? Number(row.confidence_score) : 0,
    basisScore: row.basis_score !== null ? Number(row.basis_score) : 0,
    averageSpeed: row.average_speed !== null ? Number(row.average_speed) : 0,
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

async function latestPrediction(routeId = "") {
  let rows;

  if (routeId) {
    [rows] = await pool.query(
      `SELECT *
       FROM predictions
       WHERE route_id = ?
       ORDER BY created_at DESC, id DESC
       LIMIT 1`,
      [routeId]
    );
  } else {
    [rows] = await pool.query(
      `SELECT *
       FROM predictions
       ORDER BY created_at DESC, id DESC
       LIMIT 1`
    );
  }

  return rows[0] || null;
}

router.get("/", async (req, res, next) => {
  try {
    const routeId = String(req.query.routeId || "").trim();

    const latest = await latestPrediction(routeId);

    if (!latest) {
      return res.json({
        id: "",
        predictionId: "",
        routeId: routeId || "",
        routeName: "",
        predictedCongestion: "Low",
        predictedDelayRisk: "Low",
        confidenceScore: 0,
        basisScore: 0,
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

    res.json(mapPrediction(latest));
  } catch (error) {
    next(error);
  }
});

router.get("/history", async (req, res, next) => {
  try {
    const routeId = String(req.query.routeId || "").trim();
    const hours = Math.max(1, Math.min(24 * 30, Number(req.query.hours || 24)));
    const limit = Math.max(1, Math.min(500, Number(req.query.limit || 200)));

    let rows;

    if (routeId) {
      [rows] = await pool.query(
        `SELECT *
         FROM predictions
         WHERE route_id = ?
           AND created_at >= (NOW() - INTERVAL ? HOUR)
         ORDER BY created_at ASC, id ASC
         LIMIT ?`,
        [routeId, hours, limit]
      );
    } else {
      [rows] = await pool.query(
        `SELECT *
         FROM predictions
         WHERE created_at >= (NOW() - INTERVAL ? HOUR)
         ORDER BY created_at ASC, id ASC
         LIMIT ?`,
        [hours, limit]
      );
    }

    res.json(rows.map(mapPrediction));
  } catch (error) {
    next(error);
  }
});

router.post("/", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const predictionId =
      String(req.body.predictionId || "").trim() || randomPredictionId();

    const routeId = String(req.body.routeId || "").trim();
    const routeName = String(req.body.routeName || "").trim();

    const predictedCongestion = String(
      req.body.predictedCongestion || "Low"
    ).trim();

    const predictedDelayRisk = String(
      req.body.predictedDelayRisk || "Low"
    ).trim();

    const confidenceScore = toNumber(req.body.confidenceScore, 0);
    const basisScore = toNumber(req.body.basisScore, 0);
    const averageSpeed = toNumber(req.body.averageSpeed, 0);
    const delayMinutes = toNumber(req.body.delayMinutes, 0);
    const totalVehicles = Math.max(0, Math.floor(toNumber(req.body.totalVehicles, 0)));
    const totalPassengers = Math.max(
      0,
      Math.floor(toNumber(req.body.totalPassengers, 0))
    );

    const source = String(req.body.source || "manual").trim();
    const notes = String(req.body.notes || "").trim();

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
      `INSERT INTO predictions
      (prediction_id, route_id, route_name, predicted_congestion, predicted_delay_risk, confidence_score, basis_score, average_speed, delay_minutes, total_vehicles, total_passengers, source, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        predictionId,
        routeId || null,
        routeName || null,
        predictedCongestion,
        predictedDelayRisk,
        confidenceScore,
        basisScore,
        averageSpeed,
        delayMinutes,
        totalVehicles,
        totalPassengers,
        source,
        notes || null,
      ]
    );

    const [rows] = await pool.query(
      "SELECT * FROM predictions WHERE prediction_id = ? LIMIT 1",
      [predictionId]
    );

    res.status(201).json({
      message: "Prediction created successfully",
      prediction: mapPrediction(rows[0]),
    });
  } catch (error) {
    next(error);
  }
});

router.post("/generate", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const [trafficRows] = await pool.query(
      `SELECT *
       FROM traffic_snapshots
       ORDER BY created_at DESC, id DESC`
    );

    const seenRoutes = new Set();
    const created = [];

    for (const row of trafficRows) {
      const key = row.route_id || "__system__";

      if (seenRoutes.has(key)) continue;
      seenRoutes.add(key);

      const basisScore = Number(row.congestion_score || 0);
      const averageSpeed = Number(row.average_speed || 0);
      const delayMinutes = Number(row.delay_minutes || 0);
      const totalVehicles = Number(row.total_vehicles || 0);
      const totalPassengers = Number(row.total_passengers || 0);

      const predictedScore = Math.max(
        0,
        Math.min(
          100,
          Number(
            (
              basisScore * 0.55 +
              totalPassengers * 0.18 +
              totalVehicles * 4 +
              Math.max(0, 35 - averageSpeed) * 1.6 +
              delayMinutes * 2.2
            ).toFixed(2)
          )
        )
      );

      const riskScore = Math.max(
        0,
        Math.min(
          100,
          Number(
            (
              delayMinutes * 8 +
              Math.max(0, 30 - averageSpeed) * 2 +
              basisScore * 0.45
            ).toFixed(2)
          )
        )
      );

      const confidenceScore = Math.max(
        40,
        Math.min(
          99,
          Number(
            (
              55 +
              Math.min(25, totalVehicles * 2) +
              Math.min(15, totalPassengers / 10)
            ).toFixed(2)
          )
        )
      );

      const predictionId = randomPredictionId();

      await pool.query(
        `INSERT INTO predictions
        (prediction_id, route_id, route_name, predicted_congestion, predicted_delay_risk, confidence_score, basis_score, average_speed, delay_minutes, total_vehicles, total_passengers, source, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          predictionId,
          row.route_id || null,
          row.route_name || null,
          congestionLabel(predictedScore),
          riskLabel(riskScore),
          confidenceScore,
          basisScore,
          averageSpeed,
          delayMinutes,
          totalVehicles,
          totalPassengers,
          "system",
          "Generated from latest traffic snapshot",
        ]
      );

      const [savedRows] = await pool.query(
        "SELECT * FROM predictions WHERE prediction_id = ? LIMIT 1",
        [predictionId]
      );

      if (savedRows.length) {
        created.push(mapPrediction(savedRows[0]));
      }
    }

    res.json({
      message: "Predictions generated successfully",
      count: created.length,
      predictions: created,
    });
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const identifier = String(req.params.id).trim();

    const [rows] = await pool.query(
      `SELECT *
       FROM predictions
       WHERE prediction_id = ? OR id = ?
       LIMIT 1`,
      [identifier, Number(identifier) || 0]
    );

    if (!rows.length) {
      return res.status(404).json({ error: "Prediction not found" });
    }

    await pool.query("DELETE FROM predictions WHERE prediction_id = ?", [
      rows[0].prediction_id,
    ]);

    res.json({ message: "Prediction deleted successfully" });
  } catch (error) {
    next(error);
  }
});

export default router;