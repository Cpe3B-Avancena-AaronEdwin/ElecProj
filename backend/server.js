import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import passport from "passport";

import { testDbConnection } from "./db.js";
import authRoutes from "./routes/auth.js";
import routeRoutes from "./routes/routes.js";
import stopRoutes from "./routes/stops.js";
import vehicleRoutes from "./routes/vehicles.js";
import tripRoutes from "./routes/trips.js";
import trafficRoutes from "./routes/traffic.js";
import predictionRoutes from "./routes/predictions.js";
import routingRoutes from "./routes/routing.js";
import userRoutes from "./routes/users.js";

dotenv.config();

const app = express();

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  })
);

app.use(cookieParser());
app.use(express.json());
app.use(passport.initialize());

app.get("/", (req, res) => {
  res.json({
    ok: true,
    message: "Backend is running",
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    message: "Express backend is running",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/routes", routeRoutes);
app.use("/api/stops", stopRoutes);
app.use("/api/vehicles", vehicleRoutes);
app.use("/api/trips", tripRoutes);
app.use("/api/traffic", trafficRoutes);
app.use("/api/predictions", predictionRoutes);
app.use("/api/routing", routingRoutes);
app.use("/api/users", userRoutes);

app.use((req, res) => {
  res.status(404).json({
    error: "Endpoint not found",
  });
});

app.use((err, req, res, next) => {
  console.error("Server error:", err);
  res.status(500).json({
    error: err.message || "Internal server error",
  });
});

const PORT = process.env.PORT || 5000;

testDbConnection()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Backend running on http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Failed to connect to MySQL:", error);
    process.exit(1);
  });