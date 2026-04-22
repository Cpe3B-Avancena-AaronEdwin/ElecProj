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
    <div
      style={{
        background: "rgba(12, 24, 53, 0.96)",
        border: "1px solid rgba(90, 130, 220, 0.24)",
        borderRadius: "16px",
        padding: "12px 14px",
        boxShadow: "0 18px 40px rgba(0, 0, 0, 0.35)",
        color: "#e2e8f0",
        backdropFilter: "blur(14px)",
      }}
    >
      <div style={{ fontSize: "0.88rem", opacity: 0.8, marginBottom: "4px" }}>{label}</div>
      <div style={{ fontSize: "1rem", fontWeight: 700 }}>Score: {score}</div>
      <div
        style={{
          color: "#cbd5e1",
          fontSize: "0.9rem",
          fontWeight: 700,
          marginTop: "4px",
        }}
      >
        Level: {level}
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
      ? "linear-gradient(180deg, rgba(127, 29, 29, 0.22), rgba(15, 23, 42, 0.82))"
      : currentPrediction.predictedDelayRisk === "Medium"
      ? "linear-gradient(180deg, rgba(120, 53, 15, 0.22), rgba(15, 23, 42, 0.82))"
      : "linear-gradient(180deg, rgba(20, 83, 45, 0.20), rgba(15, 23, 42, 0.82))";

  const shellStyle = {
    minHeight: "100%",
    padding: "22px",
    borderRadius: "28px",
    background:"transparent",
    color: "#e5eefc",
  };

  const cardStyle = {
    background: "linear-gradient(180deg, rgba(14, 29, 63, 0.96), rgba(11, 24, 51, 0.96))",
    border: "1px solid rgba(104, 138, 215, 0.18)",
    borderRadius: "26px",
    boxShadow: "0 20px 60px rgba(0, 0, 0, 0.34)",
    backdropFilter: "blur(12px)",
  };

  const titleStyle = {
    fontSize: "1.65rem",
    fontWeight: 800,
    letterSpacing: "-0.03em",
    color: "#eef4ff",
    marginBottom: "0.35rem",
  };

  const subText = {
    color: "rgba(191, 209, 238, 0.74)",
    fontSize: "0.98rem",
  };

  return (
    <Layout>
      <div className="dashboard-container" style={shellStyle}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: "18px",
            flexWrap: "wrap",
            marginBottom: "18px",
          }}
        >
          <div>
            <div
              style={{
                fontSize: "3.20rem",
                fontWeight: 900,
                letterSpacing: "-0.04em",
                lineHeight: 1.05,
                background: "linear-gradient(90deg, #40d9ff 0%, #2684ff 55%, #7c5cff 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Dashboard
            </div>
            <div style={{ ...subText, marginTop: "0.5rem" }}>
              Commute and congestion monitoring
            </div>
          </div>
        </div>

        <div
          className="dashboard-status-bottom-row"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "18px",
            marginBottom: "20px",
          }}
        >
          <div className="status-card card" style={{ ...cardStyle, padding: "24px" }}>
            <div style={{ ...subText, marginBottom: "0.45rem" }}>Last Updated</div>
            <div style={{ fontSize: "2.25rem", fontWeight: 900, color: "#f8fbff" }}>
              {formatUpdatedAt(lastTrafficUpdated)}
            </div>
            <div style={{ ...subText, marginTop: "0.55rem" }}>
              {lastTrafficUpdated
                ? `Updated ${timeSince(lastTrafficUpdated)} ago`
                : "Waiting for latest traffic refresh."}
            </div>
          </div>

          <div className="status-card card" style={{ ...cardStyle, padding: "24px" }}>
            <div style={{ ...subText, marginBottom: "0.45rem" }}>On-Time Rate</div>
            <div style={{ fontSize: "2.25rem", fontWeight: 900, color: "#f8fbff" }}>
              {metrics.onTimeRate}%
            </div>
            <div style={{ ...subText, marginTop: "0.55rem" }}>
              Percentage of trips meeting the planned schedule.
            </div>
          </div>
        </div>

        <div className="dashboard-chart-row" style={{ marginBottom: "20px" }}>
          <div
            className="status-card card vehicle-flow-card vehicle-flow-card--full"
            style={{ ...cardStyle, padding: "24px" }}
          >
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
                <div style={titleStyle}>Live Traffic Map</div>
                <div style={subText}>Visual transit and congestion data across the network.</div>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  flexWrap: "wrap",
                }}
              >
                <div
                  style={{
                    padding: "10px 18px",
                    borderRadius: "999px",
                    background: "rgba(77, 108, 178, 0.20)",
                    border: "1px solid rgba(122, 149, 221, 0.18)",
                    color: "#c9d7f0",
                    fontWeight: 700,
                  }}
                >
                  Metro Manila Area
                </div>

                <Link
                  to="/trip-planner"
                  className="primary-button"
                  style={{
                    textDecoration: "none",
                    borderRadius: "16px",
                    padding: "0.95rem 1.4rem",
                    fontWeight: 800,
                    background: "linear-gradient(135deg, #2bd4ff 0%, #2979ff 100%)",
                    color: "#06152f",
                    boxShadow: "0 10px 30px rgba(41, 121, 255, 0.35)",
                  }}
                >
                  Plan Your Trip
                </Link>
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(0, 1.75fr) minmax(260px, 0.85fr)",
                gap: "20px",
              }}
            >
              <div
                className="vehicle-flow-chart-box vehicle-flow-chart-box--full"
                style={{
                  position: "relative",
                  height: "520px",
                  borderRadius: "22px",
                  overflow: "hidden",
                  background:
                    "linear-gradient(180deg, rgba(8, 18, 44, 0.95), rgba(6, 15, 36, 0.95))",
                  border: "1px solid rgba(100, 132, 208, 0.14)",
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
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "18px", height: "100%" }}>
                <div
                  style={{
                    ...cardStyle,
                    padding: "24px",
                    borderRadius: "24px",
                    height: "520px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "flex-start",
                  }}
                >
                  <div
                    style={{
                      ...titleStyle,
                      fontSize: "1.55rem",
                      marginBottom: "6px",
                    }}
                  >
                    Traffic Levels
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gap: "14px",
                      marginTop: "20px",
                      alignContent: "start",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        padding: "16px 18px",
                        borderRadius: "18px",
                        background: "rgba(255,255,255,0.04)",
                      }}
                    >
                      <span
                        style={{
                          width: "14px",
                          height: "14px",
                          borderRadius: "999px",
                          background: "#18d39b",
                          boxShadow: "0 0 18px rgba(24, 211, 155, 0.6)",
                          display: "inline-block",
                        }}
                      />
                      <span style={{ color: "#d8e3f5", fontWeight: 600 }}>Low - Free Flow</span>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        padding: "16px 18px",
                        borderRadius: "18px",
                        background: "rgba(255,255,255,0.04)",
                      }}
                    >
                      <span
                        style={{
                          width: "14px",
                          height: "14px",
                          borderRadius: "999px",
                          background: "#f6b81a",
                          boxShadow: "0 0 18px rgba(246, 184, 26, 0.55)",
                          display: "inline-block",
                        }}
                      />
                      <span style={{ color: "#d8e3f5", fontWeight: 600 }}>
                        Medium - Moderate
                      </span>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        padding: "16px 18px",
                        borderRadius: "18px",
                        background: "rgba(255,255,255,0.04)",
                      }}
                    >
                      <span
                        style={{
                          width: "14px",
                          height: "14px",
                          borderRadius: "999px",
                          background: "#ff6b6b",
                          boxShadow: "0 0 18px rgba(255, 107, 107, 0.55)",
                          display: "inline-block",
                        }}
                      />
                      <span style={{ color: "#d8e3f5", fontWeight: 600 }}>
                        High - Congested
                      </span>
                    </div>
                  </div>
                </div>

                
              </div>
            </div>
          </div>
        </div>

        <div className="dashboard-chart-row" style={{ marginBottom: "20px" }}>
          <div
            className="status-card card vehicle-flow-card vehicle-flow-card--full"
            style={{ ...cardStyle, padding: "24px" }}
          >
            <div style={titleStyle}>{graphTitle}</div>

            <div
              className="vehicle-flow-chart-box vehicle-flow-chart-box--full"
              style={{
                marginTop: "12px",
                borderRadius: "22px",
                padding: "18px 10px 10px 0",
                background:
                  "linear-gradient(180deg, rgba(8, 18, 44, 0.92), rgba(7, 16, 37, 0.92))",
                border: "1px solid rgba(100, 132, 208, 0.14)",
              }}
            >
              <ResponsiveContainer width="100%" height={420}>
                <LineChart
                  data={chartData}
                  margin={{ top: 12, right: 16, left: 16, bottom: 10 }}
                >
                  <CartesianGrid
                    strokeDasharray="4 6"
                    stroke="rgba(255,255,255,0.08)"
                    vertical={true}
                    horizontal={true}
                  />

                  <XAxis
                    dataKey="time"
                    tick={{ fill: "rgba(219,231,255,0.82)", fontSize: 14, fontWeight: 600 }}
                    axisLine={{ stroke: "rgba(255,255,255,0.20)", strokeWidth: 1.4 }}
                    tickLine={false}
                    interval="preserveStartEnd"
                  />

                  <YAxis
                    domain={[0, 100]}
                    ticks={[0, 25, 50, 75, 100]}
                    tick={{ fill: "rgba(219,231,255,0.82)", fontSize: 14, fontWeight: 600 }}
                    axisLine={{ stroke: "rgba(255,255,255,0.20)", strokeWidth: 1.4 }}
                    tickLine={false}
                    width={54}
                  />

                  <Tooltip
                    content={<CustomTooltip />}
                    cursor={{
                      stroke: "rgba(255,255,255,0.32)",
                      strokeWidth: 1.5,
                    }}
                  />

                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke="#8b7bff"
                    strokeWidth={4}
                    dot={{
                      r: 3,
                      fill: "#a99cff",
                      stroke: "#0b1733",
                      strokeWidth: 2,
                    }}
                    activeDot={{
                      r: 7,
                      fill: "#d7d0ff",
                      stroke: "#8b7bff",
                      strokeWidth: 3,
                    }}
                    isAnimationActive={true}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div style={{ ...subText, marginTop: "14px" }}>{graphNote}</div>
          </div>
        </div>

        <div
          className="dashboard-insights-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "18px",
          }}
        >
          <div className="card dashboard-small-card" style={{ ...cardStyle, padding: "24px" }}>
            <div style={{ ...subText, marginBottom: "0.5rem" }}>Recommended Action</div>
            <div
              style={{
                fontSize: "1.12rem",
                fontWeight: 800,
                color: "#f8fbff",
                lineHeight: 1.5,
              }}
            >
              {currentPrediction.recommendation ||
                "Monitor the route and allow extra time when congestion increases."}
            </div>
            <div style={{ ...subText, marginTop: "0.6rem" }}>
              {currentPrediction.etaImpactMinutes != null
                ? `Expected delay impact: +${currentPrediction.etaImpactMinutes} minutes.`
                : "No delay impact detected currently."}
            </div>
          </div>

          <div
            className="card dashboard-small-card"
            style={{
              ...cardStyle,
              padding: "24px",
              background: recommendationTone,
            }}
          >
            <div style={{ ...subText, marginBottom: "0.5rem" }}>Smart Prediction</div>
            <div
              style={{
                fontSize: "1.12rem",
                fontWeight: 800,
                color: "#f8fbff",
                lineHeight: 1.5,
              }}
            >
              {currentPrediction.predictedDelayRisk || "Stable"}
            </div>
            <div style={{ ...subText, marginTop: "0.6rem" }}>
              {predictionMessage ||
                "The system compares current traffic and route conditions to give a simple on-time prediction."}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}