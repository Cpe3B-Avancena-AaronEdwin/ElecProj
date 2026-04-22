import express from "express";

const router = express.Router();

router.post("/", async (req, res, next) => {
  try {
    const { points } = req.body;

    if (!Array.isArray(points) || points.length < 2) {
      return res.status(400).json({
        error: "At least 2 points are required",
      });
    }

    const apiKey = process.env.TOMTOM_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: "Missing TOMTOM_API_KEY in backend environment",
      });
    }

    const coords = points.map((p) => `${p.lng},${p.lat}`).join(":");

    const url = `https://api.tomtom.com/routing/1/calculateRoute/${coords}/json?key=${apiKey}`;

    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: data?.detailedError?.message || "Routing API request failed",
      });
    }

    const polyline =
      data.routes?.[0]?.legs?.[0]?.points?.map((p) => [
        p.latitude,
        p.longitude,
      ]) || null;

    res.json({ polyline });
  } catch (error) {
    next(error);
  }
});

export default router;