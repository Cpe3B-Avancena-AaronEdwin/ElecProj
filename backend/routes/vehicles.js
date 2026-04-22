import express from "express";
import { db } from "../firebaseAdmin.js";

const router = express.Router();

// GET all vehicles
router.get("/", async (req, res, next) => {
  try {
    const snapshot = await db.collection("vehicles").orderBy("createdAt", "desc").get();

    const vehicles = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.json(vehicles);
  } catch (error) {
    next(error);
  }
});

// GET one vehicle
router.get("/:id", async (req, res, next) => {
  try {
    const doc = await db.collection("vehicles").doc(req.params.id).get();

    if (!doc.exists) {
      return res.status(404).json({ error: "Vehicle not found" });
    }

    res.json({
      id: doc.id,
      ...doc.data(),
    });
  } catch (error) {
    next(error);
  }
});

// CREATE vehicle
router.post("/", async (req, res, next) => {
  try {
    const {
      vehicleCode,
      plateNumber,
      type,
      capacity,
      assignedRouteId,
      driverName,
      status,
      active,
    } = req.body;

    if (!vehicleCode || !plateNumber) {
      return res.status(400).json({
        error: "vehicleCode and plateNumber are required",
      });
    }

    const payload = {
      vehicleCode: String(vehicleCode).trim(),
      plateNumber: String(plateNumber).trim(),
      type: type ? String(type).trim() : "",
      capacity: capacity !== undefined ? Number(capacity) : 0,
      assignedRouteId: assignedRouteId ? String(assignedRouteId).trim() : "",
      driverName: driverName ? String(driverName).trim() : "",
      status: status ? String(status).trim() : "active",
      active: active !== undefined ? Boolean(active) : true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const docRef = await db.collection("vehicles").add(payload);

    res.status(201).json({
      message: "Vehicle created successfully",
      id: docRef.id,
    });
  } catch (error) {
    next(error);
  }
});

// UPDATE vehicle
router.put("/:id", async (req, res, next) => {
  try {
    const ref = db.collection("vehicles").doc(req.params.id);
    const existing = await ref.get();

    if (!existing.exists) {
      return res.status(404).json({ error: "Vehicle not found" });
    }

    const current = existing.data();

    const {
      vehicleCode,
      plateNumber,
      type,
      capacity,
      assignedRouteId,
      driverName,
      status,
      active,
    } = req.body;

    const payload = {
      vehicleCode:
        vehicleCode !== undefined ? String(vehicleCode).trim() : current.vehicleCode,
      plateNumber:
        plateNumber !== undefined ? String(plateNumber).trim() : current.plateNumber,
      type: type !== undefined ? String(type).trim() : current.type || "",
      capacity: capacity !== undefined ? Number(capacity) : Number(current.capacity || 0),
      assignedRouteId:
        assignedRouteId !== undefined
          ? String(assignedRouteId).trim()
          : current.assignedRouteId || "",
      driverName:
        driverName !== undefined ? String(driverName).trim() : current.driverName || "",
      status: status !== undefined ? String(status).trim() : current.status || "active",
      active: active !== undefined ? Boolean(active) : current.active,
      updatedAt: new Date(),
    };

    await ref.update(payload);

    res.json({
      message: "Vehicle updated successfully",
    });
  } catch (error) {
    next(error);
  }
});

// DELETE vehicle
router.delete("/:id", async (req, res, next) => {
  try {
    const ref = db.collection("vehicles").doc(req.params.id);
    const existing = await ref.get();

    if (!existing.exists) {
      return res.status(404).json({ error: "Vehicle not found" });
    }

    await ref.delete();

    res.json({
      message: "Vehicle deleted successfully",
    });
  } catch (error) {
    next(error);
  }
});

export default router;