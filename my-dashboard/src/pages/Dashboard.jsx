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

  return date.toLocaleTimeString("en-PH", {
    timeZone: "Asia/Manila",
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

  const grouped = filtered.reduce((acc, item) => {
    const ts =
      Number(item.timestampMs) ||
      new Date(item.timestampText || item.timestamp || item.createdAt || 0).getTime();

    if (!Number.isFinite(ts)) return acc;

    const d = new Date(ts);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate()
    ).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(
      d.getMinutes()
    ).padStart(2, "0")}`;

    if (!acc[key]) {
      acc[key] = {
        totalScore: 0,
        count: 0,
        timestampMs: ts,
        level: item.congestionLevel || "Unknown",
      };
    }

    acc[key].totalScore += Number(item.congestionScore || 0);
    acc[key].count += 1;

    return acc;
  }, {});

  return Object.values(grouped)
    .sort((a, b) => a.timestampMs - b.timestampMs)
    .map((item, index) => ({
      index,
      time: formatShortTime(item.timestampMs, "Now"),
      score: Number((item.totalScore / item.count).toFixed(2)),
      level: item.level,
      rawTimestamp: item.timestampMs,
    }))
    .slice(-96);
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

const sectionCardStyle = {
  background: "#071a2b",
  border: "1px solid rgba(34, 211, 238, 0.2)",
  borderRadius: "22px",
  padding: "1.5rem",
  boxShadow: "0 10px 30px rgba(0, 0, 0, 0.18)",
};

const statCardStyle = {
  background: "linear-gradient(180deg, #0b2150 0%, #071a2b 100%)",
  border: "1px solid rgba(59, 130, 246, 0.18)",
  borderRadius: "22px",
  padding: "1.6rem",
  minHeight: "170px",
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  boxShadow: "0 10px 30px rgba(0, 0, 0, 0.18)",
};

const smallCardStyle = {
  background: "#071a2b",
  border: "1px solid rgba(34, 211, 238, 0.18)",
  borderRadius: "18px",
  padding: "1.25rem",
  boxShadow: "0 10px 24px rgba(0, 0, 0, 0.16)",
};

const tripButtonStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "0.95rem 1.4rem",
  borderRadius: "16px",
  background: "linear-gradient(90deg, #22d3ee 0%, #3b82f6 100%)",
  color: "#031525",
  fontWeight: 800,
  textDecoration: "none",
  minWidth: "170px",
};

const refreshButtonStyle = (disabled) => ({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "0.55rem",
  padding: "0.95rem 1.2rem",
  borderRadius: "16px",
  border: "1px solid rgba(34, 211, 238, 0.22)",
  background: disabled
    ? "linear-gradient(90deg, rgba(34,211,238,0.35) 0%, rgba(59,130,246,0.35) 100%)"
    : "linear-gradient(90deg, #22d3ee 0%, #3b82f6 100%)",
  color: "#031525",
  fontWeight: 800,
  fontSize: "0.98rem",
  cursor: disabled ? "not-allowed" : "pointer",
  boxShadow: disabled
    ? "none"
    : "0 10px 24px rgba(34, 211, 238, 0.18)",
  transition: "transform 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease",
  opacity: disabled ? 0.8 : 1,
});

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
    trafficLoading,
    refreshTraffic,
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

  const chartData = useMemo(() => {
    return buildChartDataFromHistory(trafficHistory);
  }, [trafficHistory]);

  const graphTitle = "LAST 24H CONGESTION TREND";
  const graphNote = `Based on ${chartData.length} real snapshots from the last 24 hours.`;

  const derivedLastTrafficUpdated = useMemo(() => {
    if (lastTrafficUpdated) return lastTrafficUpdated;

    if (Array.isArray(trafficHistory) && trafficHistory.length > 0) {
      const latestHistory = [...trafficHistory]
        .map((item) => {
          const ts =
            Number(item.timestampMs) ||
            new Date(item.timestampText || item.timestamp || item.createdAt || 0).getTime();
          return { ...item, _ts: ts };
        })
        .filter((item) => Number.isFinite(item._ts))
        .sort((a, b) => a._ts - b._ts);

      const latest = latestHistory[latestHistory.length - 1];
      if (latest) return latest.timestampText || latest.createdAt || latest._ts;
    }

    if (Array.isArray(trafficSamples) && trafficSamples.length > 0) {
      const latestSample = trafficSamples[trafficSamples.length - 1];
      return (
        latestSample?.timestampText ||
        latestSample?.createdAt ||
        latestSample?.timestampMs ||
        null
      );
    }

    return null;
  }, [lastTrafficUpdated, trafficHistory, trafficSamples]);

  const computedOnTimeRate = useMemo(() => {
    const rawMetric = Number(metrics?.onTimeRate);
    if (Number.isFinite(rawMetric) && rawMetric > 0) {
      return rawMetric.toFixed(1);
    }

    const avgDelay = Number(
      trafficSummary?.delayMinutes ??
        trafficSummary?.avgDelay ??
        trafficSummary?.averageDelay ??
        0
    );

    if (Number.isFinite(avgDelay) && avgDelay > 0) {
      const estimated = Math.max(0, Math.min(100, 100 - avgDelay * 8));
      return estimated.toFixed(1);
    }

    const latestScore = Number(
      historyAnalytics?.latestScore ?? trafficSummary?.congestionScore ?? 0
    );

    if (Number.isFinite(latestScore) && latestScore > 0) {
      const estimated = Math.max(0, Math.min(100, 100 - latestScore * 0.6));
      return estimated.toFixed(1);
    }

    if (Array.isArray(trafficHistory) && trafficHistory.length > 0) {
      const avgScore =
        trafficHistory.reduce(
          (sum, item) => sum + Number(item?.congestionScore || 0),
          0
        ) / trafficHistory.length;

      const estimated = Math.max(0, Math.min(100, 100 - avgScore * 0.6));
      return estimated.toFixed(1);
    }

    return "0.0";
  }, [metrics?.onTimeRate, trafficSummary, historyAnalytics, trafficHistory]);

  const onTimeRateDescription = useMemo(() => {
    if (Number(metrics?.onTimeRate) > 0) {
      return "Percentage of trips meeting the planned schedule.";
    }

    if (Array.isArray(trafficHistory) && trafficHistory.length > 0) {
      return "Estimated from real traffic snapshot conditions and recent congestion history.";
    }

    return "Waiting for enough live traffic data to compute the schedule performance.";
  }, [metrics?.onTimeRate, trafficHistory]);

const formatUpdatedAt = (isoString) => {
  if (!isoString) return "No update yet";

  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return "No update yet";

  return date.toLocaleString("en-PH", {
    timeZone: "Asia/Manila",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};

const timeSince = (isoString) => {
  if (!isoString) return "";

  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return "";

  const ms = Date.now() - date.getTime();
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
      <div
        className="dashboard-container"
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "1.5rem",
        }}
      >
        <div
          style={{
            width: "100%",
            marginBottom: "0.75rem",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              borderRadius: "18px",
              border: "1px solid rgba(34, 211, 238, 0.2)",
              background: "#071a2b",
              overflow: "hidden",
              boxShadow: "0 10px 24px rgba(0, 0, 0, 0.16)",
              minHeight: "56px",
            }}
          >
            <input
              type="text"
              placeholder="Search route, stop, destination..."
              style={{
                flex: 1,
                minWidth: 0,
                padding: "1rem 1.1rem",
                border: "none",
                outline: "none",
                background: "transparent",
                color: "#e6fcff",
                fontSize: "1rem",
              }}
            />

            <div
              style={{
                width: "1px",
                alignSelf: "stretch",
                background: "rgba(34, 211, 238, 0.18)",
              }}
            />

            <select
              defaultValue=""
              style={{
                minWidth: "240px",
                padding: "1rem 1.1rem",
                border: "none",
                outline: "none",
                background: "#071a2b",
                color: "#e6fcff",
                fontSize: "1rem",
                fontWeight: 600,
                cursor: "pointer",
                appearance: "none",
                WebkitAppearance: "none",
                MozAppearance: "none",
                backgroundImage:
                  "linear-gradient(45deg, transparent 50%, #cfeef6 50%), linear-gradient(135deg, #cfeef6 50%, transparent 50%)",
                backgroundPosition:
                  "calc(100% - 22px) calc(50% - 3px), calc(100% - 16px) calc(50% - 3px)",
                backgroundSize: "6px 6px, 6px 6px",
                backgroundRepeat: "no-repeat",
                paddingRight: "2.5rem",
              }}
            >
              <option value="" disabled>
                Select current location
              </option>
              <option value="Bulacan">Bulacan</option>
              <option value="Monumento">Monumento</option>
              <option value="Caloocan">Caloocan</option>
              <option value="Quezon City">Quezon City</option>
              <option value="Manila">Manila</option>
              <option value="Makati">Makati</option>
              <option value="Pasig">Pasig</option>
              <option value="Taguig">Taguig</option>
            </select>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center",
            marginTop: "-0.35rem",
            marginBottom: "-0.15rem",
          }}
        >
          <button
            type="button"
            onClick={() => refreshTraffic(true)}
            disabled={trafficLoading}
            style={refreshButtonStyle(trafficLoading)}
            title="Fetch a fresh traffic snapshot and reload the latest real history"
          >
            <span
              style={{
                display: "inline-flex",
                width: "10px",
                height: "10px",
                borderRadius: "999px",
                background: trafficLoading ? "#0f172a" : "#031525",
                opacity: 0.85,
              }}
            />
            {trafficLoading ? "Refreshing Traffic..." : "Refresh Traffic Now"}
          </button>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: "1.25rem",
          }}
        >
          <div style={statCardStyle}>
            <div
              style={{
                color: "rgba(230, 252, 255, 0.7)",
                fontSize: "0.95rem",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                marginBottom: "1rem",
              }}
            >
              Last Updated
            </div>
            <div
              style={{
                color: "#ffffff",
                fontSize: "2rem",
                fontWeight: 800,
                lineHeight: 1.1,
                marginBottom: "0.75rem",
              }}
            >
              {formatUpdatedAt(derivedLastTrafficUpdated)}
            </div>
            <div
              style={{
                color: "rgba(230, 252, 255, 0.75)",
                fontSize: "1rem",
              }}
            >
              {derivedLastTrafficUpdated
                ? `Updated ${timeSince(derivedLastTrafficUpdated)} ago`
                : "Waiting for latest traffic refresh."}
            </div>
          </div>

          <div style={statCardStyle}>
            <div
              style={{
                color: "rgba(230, 252, 255, 0.7)",
                fontSize: "0.95rem",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                marginBottom: "1rem",
              }}
            >
              On-Time Rate
            </div>
            <div
              style={{
                color: "#ffffff",
                fontSize: "2rem",
                fontWeight: 800,
                lineHeight: 1.1,
                marginBottom: "0.75rem",
              }}
            >
              {computedOnTimeRate}%
            </div>
            <div
              style={{
                color: "rgba(230, 252, 255, 0.75)",
                fontSize: "1rem",
              }}
            >
              {onTimeRateDescription}
            </div>
          </div>
        </div>

        <div style={sectionCardStyle}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "1rem",
              flexWrap: "wrap",
              gap: "1rem",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: "1.75rem",
                  fontWeight: 800,
                  color: "#e6fcff",
                }}
              >
                Live Traffic Map
              </div>
              <div
                style={{
                  color: "rgba(230,252,255,0.75)",
                  fontSize: "1rem",
                  marginTop: "0.35rem",
                }}
              >
                Visual transit and congestion data across the network.
              </div>
            </div>

            <Link to="/trip-planner" style={tripButtonStyle}>
              Plan Your Trip
            </Link>
          </div>

          <div
            style={{
              position: "relative",
              height: "420px",
              borderRadius: "18px",
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

        <div style={sectionCardStyle}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "1rem",
              flexWrap: "wrap",
              marginBottom: "1rem",
            }}
          >
            <div
              style={{
                fontSize: "1.5rem",
                fontWeight: 800,
                color: "#e6fcff",
              }}
            >
              {graphTitle}
            </div>

            <div
              style={{
                color: "rgba(230, 252, 255, 0.72)",
                fontSize: "0.95rem",
                fontWeight: 600,
              }}
            >
              {trafficLoading ? "Fetching latest real traffic..." : "Showing latest saved traffic history"}
            </div>
          </div>

          <div
            className="vehicle-flow-chart-box vehicle-flow-chart-box--full"
            style={{
              background: "rgba(5, 18, 35, 0.78)",
              borderRadius: "18px",
              padding: "0.75rem 0.75rem 0.25rem",
            }}
          >
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

          <div
            style={{
              color: "rgba(230, 252, 255, 0.75)",
              marginTop: "0.9rem",
            }}
          >
            {graphNote}
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "1.25rem",
          }}
        >
          <div style={smallCardStyle}>
            <div style={{ color: "rgba(230, 252, 255, 0.68)", marginBottom: "0.5rem" }}>
              Recommended Action
            </div>
            <div
              style={{
                fontSize: "1.05rem",
                fontWeight: 700,
                color: "#e6fcff",
              }}
            >
              {currentPrediction.recommendation ||
                "Monitor the route and allow extra time when congestion increases."}
            </div>
            <div style={{ color: "rgba(230, 252, 255, 0.72)", marginTop: "0.45rem" }}>
              {currentPrediction.etaImpactMinutes != null
                ? `Expected delay impact: +${currentPrediction.etaImpactMinutes} minutes.`
                : "No delay impact detected currently."}
            </div>
          </div>

          <div
            style={{
              ...smallCardStyle,
              background: recommendationTone,
            }}
          >
            <div style={{ color: "rgba(230, 252, 255, 0.68)", marginBottom: "0.5rem" }}>
              Smart Prediction
            </div>
            <div
              style={{
                fontSize: "1.05rem",
                fontWeight: 700,
                color: "#e6fcff",
              }}
            >
              {currentPrediction.predictedDelayRisk || "Stable"}
            </div>
            <div style={{ color: "rgba(230, 252, 255, 0.72)", marginTop: "0.45rem" }}>
              {predictionMessage ||
                "The system compares current traffic and route conditions to give a simple on-time prediction."}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}