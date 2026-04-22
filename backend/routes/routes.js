import express from "express";
import { db } from "../firebaseAdmin.js";

const router = express.Router();

// GET all routes
router.get("/", async (req, res, next) => {
  try {
    const snapshot = await db.collection("routes").orderBy("createdAt", "desc").get();

    const routes = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.json(routes);
  } catch (error) {
    next(error);
  }
});

// GET one route
router.get("/:id", async (req, res, next) => {
  try {
    const doc = await db.collection("routes").doc(req.params.id).get();

    if (!doc.exists) {
      return res.status(404).json({ error: "Route not found" });
    }

    res.json({
      id: doc.id,
      ...doc.data(),
    });
  } catch (error) {
    next(error);
  }
});

// CREATE route
router.post("/", async (req, res, next) => {
  try {
    const {
      routeCode,
      routeName,
      startPoint,
      endPoint,
      color,
      active,
    } = req.body;

    if (!routeCode || !routeName) {
      return res.status(400).json({
        error: "routeCode and routeName are required",
      });
    }

    const payload = {
      routeCode: String(routeCode).trim(),
      routeName: String(routeName).trim(),
      startPoint: startPoint ? String(startPoint).trim() : "",
      endPoint: endPoint ? String(endPoint).trim() : "",
      color: color || "#2563eb",
      active: Boolean(active),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const docRef = await db.collection("routes").add(payload);

    res.status(201).json({
      message: "Route created successfully",
      id: docRef.id,
    });
  } catch (error) {
    next(error);
  }
});

// UPDATE route
router.put("/:id", async (req, res, next) => {
  try {
    const {
      routeCode,
      routeName,
      startPoint,
      endPoint,
      color,
      active,
    } = req.body;

    const ref = db.collection("routes").doc(req.params.id);
    const existing = await ref.get();

    if (!existing.exists) {
      return res.status(404).json({ error: "Route not found" });
    }

    const payload = {
      routeCode: routeCode ? String(routeCode).trim() : existing.data().routeCode,
      routeName: routeName ? String(routeName).trim() : existing.data().routeName,
      startPoint: startPoint !== undefined ? String(startPoint).trim() : existing.data().startPoint || "",
      endPoint: endPoint !== undefined ? String(endPoint).trim() : existing.data().endPoint || "",
      color: color || existing.data().color || "#2563eb",
      active: active !== undefined ? Boolean(active) : existing.data().active,
      updatedAt: new Date(),
    };

    await ref.update(payload);

    res.json({
      message: "Route updated successfully",
    });
  } catch (error) {
    next(error);
  }
});

// DELETE route
router.delete("/:id", async (req, res, next) => {
  try {
    const ref = db.collection("routes").doc(req.params.id);
    const existing = await ref.get();

    if (!existing.exists) {
      return res.status(404).json({ error: "Route not found" });
    }

    await ref.delete();

    res.json({
      message: "Route deleted successfully",
    });
  } catch (error) {
    next(error);
  }
});

export default router;