import express from "express";
import { db } from "../firebaseAdmin.js";

const router = express.Router();

// GET all predictions
router.get("/", async (req, res, next) => {
  try {
    const snapshot = await db
      .collection("predictions")
      .orderBy("generatedAt", "desc")
      .get();

    const predictions = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.json(predictions);
  } catch (error) {
    next(error);
  }
});

// GET one prediction
router.get("/:id", async (req, res, next) => {
  try {
    const doc = await db.collection("predictions").doc(req.params.id).get();

    if (!doc.exists) {
      return res.status(404).json({ error: "Prediction not found" });
    }

    res.json({
      id: doc.id,
      ...doc.data(),
    });
  } catch (error) {
    next(error);
  }
});

// CREATE prediction
router.post("/", async (req, res, next) => {
  try {
    const { prediction, userId } = req.body;

    if (!prediction || typeof prediction !== "object") {
      return res.status(400).json({
        error: "prediction is required",
      });
    }

    const payload = {
      ...prediction,
      createdBy: userId || null,
      generatedAt: new Date(),
    };

    const docRef = await db.collection("predictions").add(payload);

    res.status(201).json({
      message: "Prediction saved successfully",
      id: docRef.id,
    });
  } catch (error) {
    next(error);
  }
});

// DELETE prediction
router.delete("/:id", async (req, res, next) => {
  try {
    const ref = db.collection("predictions").doc(req.params.id);
    const existing = await ref.get();

    if (!existing.exists) {
      return res.status(404).json({ error: "Prediction not found" });
    }

    await ref.delete();

    res.json({
      message: "Prediction deleted successfully",
    });
  } catch (error) {
    next(error);
  }
});

export default router;