import express from "express";
import { db } from "../firebaseAdmin.js";

const router = express.Router();

// GET all trips
router.get("/", async (req, res, next) => {
  try {
    const snapshot = await db.collection("trips").orderBy("createdAt", "desc").get();

    const trips = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.json(trips);
  } catch (error) {
    next(error);
  }
});

// GET one trip
router.get("/:id", async (req, res, next) => {
  try {
    const doc = await db.collection("trips").doc(req.params.id).get();

    if (!doc.exists) {
      return res.status(404).json({ error: "Trip not found" });
    }

    res.json({
      id: doc.id,
      ...doc.data(),
    });
  } catch (error) {
    next(error);
  }
});

// CREATE trip
router.post("/", async (req, res, next) => {
  try {
    const {
      tripCode,
      routeId,
      vehicleId,
      driverName,
      origin,
      destination,
      departureTime,
      arrivalTime,
      status,
      passengerCount,
      delayMinutes,
      active,
    } = req.body;

    if (!tripCode || !routeId) {
      return res.status(400).json({
        error: "tripCode and routeId are required",
      });
    }

    const payload = {
      tripCode: String(tripCode).trim(),
      routeId: String(routeId).trim(),
      vehicleId: vehicleId ? String(vehicleId).trim() : "",
      driverName: driverName ? String(driverName).trim() : "",
      origin: origin ? String(origin).trim() : "",
      destination: destination ? String(destination).trim() : "",
      departureTime: departureTime ? String(departureTime).trim() : "",
      arrivalTime: arrivalTime ? String(arrivalTime).trim() : "",
      status: status ? String(status).trim() : "scheduled",
      passengerCount: passengerCount !== undefined ? Number(passengerCount) : 0,
      delayMinutes: delayMinutes !== undefined ? Number(delayMinutes) : 0,
      active: active !== undefined ? Boolean(active) : true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const docRef = await db.collection("trips").add(payload);

    res.status(201).json({
      message: "Trip created successfully",
      id: docRef.id,
    });
  } catch (error) {
    next(error);
  }
});

// UPDATE trip
router.put("/:id", async (req, res, next) => {
  try {
    const ref = db.collection("trips").doc(req.params.id);
    const existing = await ref.get();

    if (!existing.exists) {
      return res.status(404).json({ error: "Trip not found" });
    }

    const current = existing.data();

    const {
      tripCode,
      routeId,
      vehicleId,
      driverName,
      origin,
      destination,
      departureTime,
      arrivalTime,
      status,
      passengerCount,
      delayMinutes,
      active,
    } = req.body;

    const payload = {
      tripCode: tripCode !== undefined ? String(tripCode).trim() : current.tripCode,
      routeId: routeId !== undefined ? String(routeId).trim() : current.routeId,
      vehicleId: vehicleId !== undefined ? String(vehicleId).trim() : current.vehicleId || "",
      driverName:
        driverName !== undefined ? String(driverName).trim() : current.driverName || "",
      origin: origin !== undefined ? String(origin).trim() : current.origin || "",
      destination:
        destination !== undefined ? String(destination).trim() : current.destination || "",
      departureTime:
        departureTime !== undefined
          ? String(departureTime).trim()
          : current.departureTime || "",
      arrivalTime:
        arrivalTime !== undefined ? String(arrivalTime).trim() : current.arrivalTime || "",
      status: status !== undefined ? String(status).trim() : current.status || "scheduled",
      passengerCount:
        passengerCount !== undefined
          ? Number(passengerCount)
          : Number(current.passengerCount || 0),
      delayMinutes:
        delayMinutes !== undefined
          ? Number(delayMinutes)
          : Number(current.delayMinutes || 0),
      active: active !== undefined ? Boolean(active) : current.active,
      updatedAt: new Date(),
    };

    await ref.update(payload);

    res.json({
      message: "Trip updated successfully",
    });
  } catch (error) {
    next(error);
  }
});

// DELETE trip
router.delete("/:id", async (req, res, next) => {
  try {
    const ref = db.collection("trips").doc(req.params.id);
    const existing = await ref.get();

    if (!existing.exists) {
      return res.status(404).json({ error: "Trip not found" });
    }

    await ref.delete();

    res.json({
      message: "Trip deleted successfully",
    });
  } catch (error) {
    next(error);
  }
});

export default router;