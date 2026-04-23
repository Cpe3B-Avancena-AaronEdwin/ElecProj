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

const allowedOrigins = [
  "http://localhost:5173",
  process.env.FRONTEND_URL,
  process.env.FRONTEND_URL_WWW,
  "https://citybloop.com",
  "https://www.citybloop.com",
].filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);

      const isAllowedExact = allowedOrigins.includes(origin);
      const isVercelPreview =
        typeof origin === "string" &&
        origin.startsWith("https://") &&
        origin.includes(".vercel.app");

      if (isAllowedExact || isVercelPreview) {
        return callback(null, true);
      }

      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
  })
);

app.use(cookieParser());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
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
  console.error(`Server error on: ${req.method} ${req.originalUrl}`);
  console.error(err);

  const statusCode =
    err.type === "entity.too.large"
      ? 413
      : err.statusCode || err.status || 500;

  res.status(statusCode).json({
    error: err.message || "Internal server error",
  });
});

const PORT = process.env.PORT || 5000;

testDbConnection()
  .then(() => {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Backend running on http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Failed to connect to MySQL:", error);
    process.exit(1);
  });