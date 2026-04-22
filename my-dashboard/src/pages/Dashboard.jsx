import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

import { useFirestoreTransitData } from "../hooks/useFirestoreTransitData";
import { useGtfsBundle } from "../hooks/useGtfsBundle";
import { useTrafficData } from "../hooks/useTrafficData";
import { useDashboardMetrics } from "../hooks/useDashboardMetrics";
import { useCurrentPrediction } from "../hooks/useCurrentPrediction";

import DashboardMap from "../components/dashboard/DashboardMap";
import Layout from "../components/Layout";

function scoreToRatio(score) {
  const value = Number(score || 0);
  return Math.max(0, Math.min(1, value / 100));
}

function formatShortTime(value, fallbackText = "Now") {
  if (!value) return fallbackText;

  let date = null;

  if (typeof value === "number") {
    date = new Date(value);
  } else if (value?.toDate && typeof value.toDate === "function") {
    date = value.toDate();
  } else {
    date = new Date(value);
  }

  if (!date || Number.isNaN(date.getTime())) return fallbackText;

  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function buildChartDataFromHistory(trafficHistory = []) {
  const now = Date.now();
  const last24h = now - 24 * 60 * 60 * 1000;

  const filtered = trafficHistory.filter((item) => {
    const ts =
      Number(item.timestampMs) ||
      new Date(item.timestampText || item.timestamp || item.createdAt || 0).getTime();

    return Number.isFinite(ts) && ts >= last24h;
  });

  return filtered.map((item, index) => {
    const score = Number(item.congestionScore || 0);

    return {
      index,
      time: formatShortTime(item.timestampMs || item.timestampText || item.timestamp, "Now"),
      score,
      level: item.congestionLevel || "Unknown",
      rawTimestamp: item.timestampMs || item.timestampText || item.timestamp || null,
    };
  });
}

function buildFallbackChartData(graphPoints) {
  return graphPoints.map((value, index, arr) => ({
    index,
    time: ["00:00", "03:00", "06:00", "09:00", "12:00", "15:00", "18:00", "21:00"][
      Math.round((index / Math.max(arr.length - 1, 1)) * 7)
    ],
    score: Math.round(value * 100),
    level: "Estimated",
    rawTimestamp: null,
  }));
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;

  const point = payload[0]?.payload;
  const score = payload[0]?.value ?? 0;
  const level = point?.level || "Unknown";

  return (
    <div className="vehicle-flow-tooltip live-tooltip">
      <div className="vehicle-flow-tooltip-time">{label}</div>
      <div className="vehicle-flow-tooltip-value">score : {score}</div>
      <div
        style={{
          color: "#cbd5e1",
          fontSize: "0.9rem",
          fontWeight: 700,
          marginTop: "4px",
        }}
      >
        level : {level}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const TOMTOM_API_KEY = (import.meta.env.VITE_TOMTOM_API_KEY || "").trim();

  const { vehicles = [] } = useFirestoreTransitData({
    routes: false,
    stops: false,
    vehicles: true,
    trips: false,
    predictions: false,
    realtimeVehicles: false,
    cacheMs: 5 * 60 * 1000,
  });

  const { gtfsBundle } = useGtfsBundle();

  const gtfsRoutes = gtfsBundle?.routes || [];
  const gtfsStops = gtfsBundle?.stops || [];
  const gtfsTrips = gtfsBundle?.trips || [];

  const gtfsRouteMap = useMemo(() => {
    return gtfsRoutes.reduce((acc, route) => {
      const key = route.id || route.routeId || route.route_id;
      if (key) acc[key] = route;
      return acc;
    }, {});
  }, [gtfsRoutes]);

  const {
    trafficSamples = [],
    trafficSummary = {},
    trafficHistory = [],
    historyAnalytics = {},
    lastTrafficUpdated,
  } = useTrafficData(gtfsStops, TOMTOM_API_KEY, {
    enabled: true,
    liveTraffic: true,
    history: true,
    cacheKey: "dashboard-gtfs-network",
    maxSamplePoints: 15,
  });

  const metrics = useDashboardMetrics({
    routes: gtfsRoutes,
    stops: gtfsStops,
    vehicles,
    trips: gtfsTrips,
    trafficSummary,
  });

  const { currentPrediction, predictionMessage } = useCurrentPrediction({
    routes: gtfsRoutes,
    stops: gtfsStops,
    trips: gtfsTrips,
    trafficSummary,
    trafficHistory,
    historyAnalytics,
    user,
    selectedRouteId: "all",
    sourceRouteMap: gtfsRouteMap,
    sourceMode: "gtfs",
  });

  const graphPoints = useMemo(() => {
    if (trafficHistory.length >= 2) {
      return trafficHistory.map((item) => scoreToRatio(item.congestionScore)).slice(-24);
    }

    const sampleLevels =
      trafficSamples.length > 0
        ? trafficSamples
            .map((sample) => scoreToRatio(sample?.congestionScore))
            .filter((value) => Number.isFinite(value))
        : [];

    if (sampleLevels.length > 1) return sampleLevels.slice(0, 16);

    const heavy = Number(trafficSummary.heavy || 0);
    const moderate = Number(trafficSummary.moderate || 0);
    const low = Number(trafficSummary.light || trafficSummary.low || 0);
    const closed = Number(trafficSummary.closed || 0);

    const generated = [];
    for (let i = 0; i < heavy; i += 1) generated.push(0.85);
    for (let i = 0; i < moderate; i += 1) generated.push(0.55);
    for (let i = 0; i < low; i += 1) generated.push(0.25);
    for (let i = 0; i < closed; i += 1) generated.push(1);

    if (generated.length) return generated.slice(0, 8);

    return [0.2, 0.12, 0.35, 0.82, 0.58, 0.74, 0.95, 0.42];
  }, [trafficHistory, trafficSamples, trafficSummary]);

  const chartData = useMemo(() => {
    if (trafficHistory.length >= 2) {
      return buildChartDataFromHistory(trafficHistory);
    }
    return buildFallbackChartData(graphPoints);
  }, [trafficHistory, graphPoints]);

  const graphTitle =
    trafficHistory.length >= 2 ? "LAST 24H CONGESTION TREND" : "CURRENT CONGESTION PROFILE";

  const graphNote =
    trafficHistory.length >= 2
      ? `Based on ${chartData.length} stored snapshots from the last 24 hours.`
      : `Based on ${trafficSamples.length || graphPoints.length} current monitored traffic sample points.`;

  const formatUpdatedAt = (isoString) => {
    if (!isoString) return "No update yet";
    const date = new Date(isoString);
    return date.toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const timeSince = (isoString) => {
    if (!isoString) return "";
    const ms = Date.now() - new Date(isoString).getTime();
    if (ms < 0) return "";
    const minutes = Math.floor(ms / 60000);
    if (minutes < 1) return "less than a minute";
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m`;
  };

  const recommendationTone =
    currentPrediction.predictedDelayRisk === "High"
      ? "rgba(239, 68, 68, 0.08)"
      : currentPrediction.predictedDelayRisk === "Medium"
      ? "rgba(245, 158, 11, 0.08)"
      : "rgba(34, 197, 94, 0.08)";

  return (
    <Layout>
      <div className="dashboard-container">
        <div className="dashboard-status-bottom-row">
          <div className="status-card card">
            <div className="status-card-title">Last Updated</div>
            <div className="status-card-value">{formatUpdatedAt(lastTrafficUpdated)}</div>
            <div className="status-card-note">
              {lastTrafficUpdated
                ? `Updated ${timeSince(lastTrafficUpdated)} ago`
                : "Waiting for latest traffic refresh."}
            </div>
          </div>

          <div className="status-card card">
            <div className="status-card-title">On-Time Rate</div>
            <div className="status-card-value">{metrics.onTimeRate}%</div>
            <div className="status-card-note">
              Percentage of trips meeting the planned schedule.
            </div>
          </div>
        </div>

        <div className="dashboard-chart-row">
          <div className="status-card card vehicle-flow-card vehicle-flow-card--full">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "1rem",
                gap: "1rem",
                flexWrap: "wrap",
              }}
            >
              <div>
                <div className="vehicle-flow-title">LIVE MAP</div>
                <div className="status-card-note" style={{ marginTop: "0.35rem" }}>
                  Visual transit and congestion data across the network.
                </div>
              </div>

              <Link to="/trip-planner" className="primary-button">
                Plan Your Trip
              </Link>
            </div>

            <div
              className="vehicle-flow-chart-box vehicle-flow-chart-box--full"
              style={{
                position: "relative",
                height: "420px",
                borderBottomLeftRadius: "18px",
                borderBottomRightRadius: "18px",
                overflow: "hidden",
              }}
            >
              <DashboardMap
                stops={gtfsStops}
                vehicles={vehicles}
                routePaths={[]}
                trafficSamples={trafficSamples}
                showTrafficFlow={true}
                tomtomApiKey={TOMTOM_API_KEY}
                showStops={false}
                showRoutes={true}
              />

              <div className="map-legend">
                <div className="legend-title">Traffic Legend</div>

                <div className="legend-item">
                  <span className="legend-color red"></span>
                  Heavy Traffic
                </div>

                <div className="legend-item">
                  <span className="legend-color yellow"></span>
                  Moderate Traffic
                </div>

                <div className="legend-item">
                  <span className="legend-color green"></span>
                  Light Traffic
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="dashboard-chart-row">
          <div className="status-card card vehicle-flow-card vehicle-flow-card--full">
            <div className="vehicle-flow-title">{graphTitle}</div>

            <div className="vehicle-flow-chart-box vehicle-flow-chart-box--full">
              <ResponsiveContainer width="100%" height={420}>
                <LineChart
                  data={chartData}
                  margin={{ top: 12, right: 12, left: 8, bottom: 8 }}
                >
                  <CartesianGrid
                    strokeDasharray="4 6"
                    stroke="rgba(255,255,255,0.12)"
                    vertical={true}
                    horizontal={true}
                  />

                  <XAxis
                    dataKey="time"
                    tick={{ fill: "rgba(255,255,255,0.82)", fontSize: 14, fontWeight: 700 }}
                    axisLine={{ stroke: "rgba(255,255,255,0.95)", strokeWidth: 2 }}
                    tickLine={false}
                    interval="preserveStartEnd"
                  />

                  <YAxis
                    domain={[0, 100]}
                    ticks={[0, 25, 50, 75, 100]}
                    tick={{ fill: "rgba(255,255,255,0.82)", fontSize: 14, fontWeight: 700 }}
                    axisLine={{ stroke: "rgba(255,255,255,0.95)", strokeWidth: 2 }}
                    tickLine={false}
                    width={54}
                  />

                  <Tooltip
                    content={<CustomTooltip />}
                    cursor={{
                      stroke: "rgba(255,255,255,0.95)",
                      strokeWidth: 2,
                    }}
                  />

                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke="#45f4ff"
                    strokeWidth={5}
                    dot={false}
                    activeDot={{
                      r: 8,
                      fill: "#ffffff",
                      stroke: "#45f4ff",
                      strokeWidth: 4,
                    }}
                    isAnimationActive={true}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="status-card-note">{graphNote}</div>
          </div>
        </div>

        <div className="dashboard-insights-grid">
          <div className="card dashboard-small-card">
            <div style={{ color: "var(--text-sub)", marginBottom: "0.5rem" }}>
              Recommended Action
            </div>
            <div
              style={{
                fontSize: "1.05rem",
                fontWeight: 700,
                color: "var(--text-on-dark)",
              }}
            >
              {currentPrediction.recommendation ||
                "Monitor the route and allow extra time when congestion increases."}
            </div>
            <div style={{ color: "var(--text-sub)", marginTop: "0.45rem" }}>
              {currentPrediction.etaImpactMinutes != null
                ? `Expected delay impact: +${currentPrediction.etaImpactMinutes} minutes.`
                : "No delay impact detected currently."}
            </div>
          </div>

          <div className="card dashboard-small-card" style={{ background: recommendationTone }}>
            <div style={{ color: "var(--text-sub)", marginBottom: "0.5rem" }}>
              Smart Prediction
            </div>
            <div
              style={{
                fontSize: "1.05rem",
                fontWeight: 700,
                color: "var(--text-on-dark)",
              }}
            >
              {currentPrediction.predictedDelayRisk || "Stable"}
            </div>
            <div style={{ color: "var(--text-sub)", marginTop: "0.45rem" }}>
              {predictionMessage ||
                "The system compares current traffic and route conditions to give a simple on-time prediction."}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}