import express from "express";
import { db } from "../firebaseAdmin.js";

const router = express.Router();

// GET all stops
router.get("/", async (req, res, next) => {
  try {
    const snapshot = await db.collection("stops").orderBy("createdAt", "desc").get();

    const stops = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.json(stops);
  } catch (error) {
    next(error);
  }
});

// GET one stop
router.get("/:id", async (req, res, next) => {
  try {
    const doc = await db.collection("stops").doc(req.params.id).get();

    if (!doc.exists) {
      return res.status(404).json({ error: "Stop not found" });
    }

    res.json({
      id: doc.id,
      ...doc.data(),
    });
  } catch (error) {
    next(error);
  }
});

// CREATE stop
router.post("/", async (req, res, next) => {
  try {
    const {
      stopCode,
      stopName,
      latitude,
      longitude,
      routeId,
      active,
      simulatedPassengers,
      estimatedPassengers,
    } = req.body;

    if (!stopCode || !stopName) {
      return res.status(400).json({
        error: "stopCode and stopName are required",
      });
    }

    const payload = {
      stopCode: String(stopCode).trim(),
      stopName: String(stopName).trim(),
      latitude: latitude !== undefined ? Number(latitude) : null,
      longitude: longitude !== undefined ? Number(longitude) : null,
      routeId: routeId ? String(routeId).trim() : "",
      active: active !== undefined ? Boolean(active) : true,
      simulatedPassengers:
        simulatedPassengers !== undefined ? Number(simulatedPassengers) : 0,
      estimatedPassengers:
        estimatedPassengers !== undefined ? Number(estimatedPassengers) : 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const docRef = await db.collection("stops").add(payload);

    res.status(201).json({
      message: "Stop created successfully",
      id: docRef.id,
    });
  } catch (error) {
    next(error);
  }
});

// UPDATE stop
router.put("/:id", async (req, res, next) => {
  try {
    const ref = db.collection("stops").doc(req.params.id);
    const existing = await ref.get();

    if (!existing.exists) {
      return res.status(404).json({ error: "Stop not found" });
    }

    const current = existing.data();

    const {
      stopCode,
      stopName,
      latitude,
      longitude,
      routeId,
      active,
      simulatedPassengers,
      estimatedPassengers,
    } = req.body;

    const payload = {
      stopCode: stopCode !== undefined ? String(stopCode).trim() : current.stopCode,
      stopName: stopName !== undefined ? String(stopName).trim() : current.stopName,
      latitude: latitude !== undefined ? Number(latitude) : current.latitude ?? null,
      longitude: longitude !== undefined ? Number(longitude) : current.longitude ?? null,
      routeId: routeId !== undefined ? String(routeId).trim() : current.routeId || "",
      active: active !== undefined ? Boolean(active) : current.active,
      simulatedPassengers:
        simulatedPassengers !== undefined
          ? Number(simulatedPassengers)
          : Number(current.simulatedPassengers || 0),
      estimatedPassengers:
        estimatedPassengers !== undefined
          ? Number(estimatedPassengers)
          : Number(current.estimatedPassengers || 0),
      updatedAt: new Date(),
    };

    await ref.update(payload);

    res.json({
      message: "Stop updated successfully",
    });
  } catch (error) {
    next(error);
  }
});

// DELETE stop
router.delete("/:id", async (req, res, next) => {
  try {
    const ref = db.collection("stops").doc(req.params.id);
    const existing = await ref.get();

    if (!existing.exists) {
      return res.status(404).json({ error: "Stop not found" });
    }

    await ref.delete();

    res.json({
      message: "Stop deleted successfully",
    });
  } catch (error) {
    next(error);
  }
});

export default router;