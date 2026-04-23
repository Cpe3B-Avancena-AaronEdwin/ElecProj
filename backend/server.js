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
import { startSnapshotJob } from "./services/snapshotService.js";

dotenv.config();

const app = express();

app.set("trust proxy", 1);

const allowedOrigins = [
  "http://localhost:5173",
  "https://citybloop.com",
  "https://www.citybloop.com",
  process.env.FRONTEND_URL,
  process.env.FRONTEND_URL_WWW,
]
  .filter(Boolean)
  .map((origin) => String(origin).trim().replace(/\/+$/, ""));

const corsOptions = {
  origin(origin, callback) {
    if (!origin) {
      return callback(null, true);
    }

    const normalizedOrigin = String(origin).trim().replace(/\/+$/, "");

    const isAllowedExact = allowedOrigins.includes(normalizedOrigin);

    const isVercelPreview =
      normalizedOrigin.startsWith("https://") &&
      normalizedOrigin.endsWith(".vercel.app");

    if (isAllowedExact || isVercelPreview) {
      return callback(null, true);
    }

    console.error(`CORS blocked for origin: ${normalizedOrigin}`);
    return callback(new Error(`CORS blocked for origin: ${normalizedOrigin}`));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "Accept",
    "Origin",
  ],
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

app.use(cookieParser());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(passport.initialize());

app.get("/", (req, res) => {
  res.json({
    ok: true,
    message: "Backend is running",
    allowedOrigins,
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    message: "Express backend is running",
    allowedOrigins,
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
      console.log("Allowed CORS origins:", allowedOrigins);
      startSnapshotJob();
    });
  })
  .catch((error) => {
    console.error("Failed to connect to MySQL:", error);
    process.exit(1);
  });