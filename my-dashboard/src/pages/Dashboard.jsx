import { useMemo } from "react";
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

import DashboardStats from "../components/dashboard/DashboardStats";
import GtfsStatusPanel from "../components/dashboard/GtfsStatusPanel";
import TrafficSummaryPanel from "../components/dashboard/TrafficSummaryPanel";
import CurrentPredictionPanel from "../components/dashboard/CurrentPredictionPanel";
import TrafficStatusPanel from "../components/dashboard/TrafficStatusPanel";
import PredictionStatusPanel from "../components/dashboard/PredictionStatusPanel";

import Layout from "../components/Layout";

function scoreToRatio(score) {
  const value = Number(score || 0);
  return Math.max(0, Math.min(1, value / 100));
}

function formatShortTime(value, fallbackText = "Now") {
  if (!value) return fallbackText;

  let date = null;

  if (typeof value === "number") date = new Date(value);
  else if (value?.toDate && typeof value.toDate === "function") date = value.toDate();
  else date = new Date(value);

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

  return filtered.map((item, index) => ({
    index,
    time: formatShortTime(item.timestampMs || item.timestampText || item.timestamp, "Now"),
    score: Number(item.congestionScore || 0),
    level: item.congestionLevel || "Unknown",
  }));
}

function buildFallbackChartData(graphPoints) {
  return graphPoints.map((value, index, arr) => ({
    index,
    time: ["00:00", "03:00", "06:00", "09:00", "12:00", "15:00", "18:00", "21:00"][
      Math.round((index / Math.max(arr.length - 1, 1)) * 7)
    ],
    score: Math.round(value * 100),
    level: "Estimated",
  }));
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;

  const point = payload[0]?.payload;
  const score = payload[0]?.value ?? 0;

  return (
    <div className="vehicle-flow-tooltip">
      <div className="vehicle-flow-tooltip-time">{label}</div>
      <div className="vehicle-flow-tooltip-value">score : {score}</div>
      <div style={{ color: "#cbd5e1", fontSize: "0.9rem", marginTop: 4 }}>
        level : {point?.level || "Unknown"}
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

  const { gtfsBundle, gtfsLoading, gtfsError } = useGtfsBundle();

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
    trafficLoading,
    trafficError,
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

  const { currentPrediction, predictionError, predictionMessage } =
    useCurrentPrediction({
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

  const quickAlert = useMemo(() => {
    if (trafficSummary.closed > 0) {
      return { level: "critical", message: "⚠ Road closure detected" };
    }

    if (currentPrediction.predictedDelayRisk === "High") {
      return {
        level: "heavy",
        message: `⚠ ${currentPrediction.routeCode} likely delayed by ${currentPrediction.etaImpactMinutes} mins`,
      };
    }

    return { level: "normal", message: "✅ Traffic is flowing smoothly" };
  }, [currentPrediction, trafficSummary.closed]);

  const graphPoints = useMemo(() => {
    if (trafficHistory.length >= 2) {
      return trafficHistory.map((item) => scoreToRatio(item.congestionScore)).slice(-24);
    }

    return [0.2, 0.12, 0.35, 0.82, 0.58, 0.74, 0.95, 0.42];
  }, [trafficHistory]);

  const chartData = useMemo(() => {
    if (trafficHistory.length >= 2) return buildChartDataFromHistory(trafficHistory);
    return buildFallbackChartData(graphPoints);
  }, [trafficHistory, graphPoints]);

  const graphTitle =
    trafficHistory.length >= 2
      ? "LAST 24H CONGESTION TREND"
      : "CURRENT CONGESTION PROFILE";

  const graphNote =
    trafficHistory.length >= 2
      ? `Based on ${chartData.length} stored snapshots from the last 24 hours.`
      : `Based on ${trafficSamples.length || graphPoints.length} monitored points.`;

  const formatUpdatedAt = (value) => {
    if (!value) return "No update yet";
    const d = new Date(value);
    return d.toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const timeSince = (value) => {
    if (!value) return "";
    const diff = Date.now() - new Date(value).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "less than a minute";
    if (mins < 60) return `${mins} mins`;
    return `${Math.floor(mins / 60)}h ${mins % 60}m`;
  };

  const recommendationTone =
    currentPrediction.predictedDelayRisk === "High"
      ? "rgba(239,68,68,.08)"
      : "rgba(34,197,94,.08)";

  return (
    <Layout>
      <div className="dashboard-container">
        <DashboardStats metrics={metrics} />

        <div className="dashboard-status-row">
          <div className="dashboard-status-left">
            <div className="status-card card">
              <div className="status-card-title">Last Updated</div>
              <div className="status-card-value">
                {formatUpdatedAt(lastTrafficUpdated)}
              </div>
              <div className="status-card-note">
                {lastTrafficUpdated
                  ? `Updated ${timeSince(lastTrafficUpdated)} ago`
                  : "Waiting for latest traffic refresh."}
              </div>
            </div>

            <div className="status-card card">
              <div className="status-card-title">Quick Alerts</div>
              <div className={`alert-pill alert-pill--${quickAlert.level}`}>
                {quickAlert.message}
              </div>
              <div className="status-card-note">
                {currentPrediction.congestionForecast}
              </div>
            </div>
          </div>

          <div className="status-card card vehicle-flow-card">
            <div className="vehicle-flow-title">{graphTitle}</div>

            <div className="vehicle-flow-chart-box">
              <ResponsiveContainer width="100%" height={390}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="4 6" />
                  <XAxis dataKey="time" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke="#45f4ff"
                    strokeWidth={4}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="status-card-note">{graphNote}</div>
          </div>
        </div>

        <div className="dashboard-insights-grid">
          <div className="card">
            <div style={{ color: "var(--text-sub)" }}>Prediction Confidence</div>
            <div style={{ fontSize: "2rem", fontWeight: 800 }}>
              {currentPrediction.confidence}%
            </div>
            <div style={{ color: "var(--text-sub)" }}>
              Based on {currentPrediction.basedOnTrafficSamples} live samples,
              {` ${currentPrediction.historicalSnapshotCount24h}`} last-24h snapshots,
              and {currentPrediction.historicalSnapshotCount7d} seven-day snapshots.
            </div>
          </div>

          <div className="card" style={{ background: recommendationTone }}>
            <div style={{ color: "var(--text-sub)" }}>Recommended Action</div>
            <div style={{ fontWeight: 700 }}>
              {currentPrediction.recommendation}
            </div>
            <div style={{ color: "var(--text-sub)" }}>
              Estimated delay impact: +{currentPrediction.etaImpactMinutes} minutes.
            </div>
          </div>

          <div className="card">
            <div style={{ color: "var(--text-sub)" }}>Historical Peak Window</div>
            <div style={{ fontWeight: 700 }}>
              {currentPrediction.predictedPeakWindow}
            </div>
            <div style={{ color: "var(--text-sub)" }}>
              24h avg: {currentPrediction.historicalAverageScore24h}/100 • 7d avg:{" "}
              {currentPrediction.historicalAverageScore7d}/100
            </div>
          </div>
        </div>

        {/* SWITCHED HERE */}
        <div className="grid">
          <GtfsStatusPanel
            gtfsBundle={gtfsBundle}
            loading={gtfsLoading}
            error={gtfsError}
          />

          <TrafficSummaryPanel summary={trafficSummary} />

          <TrafficStatusPanel
            loading={trafficLoading}
            error={trafficError}
            sourceMode="gtfs"
            showTrafficOverlay={true}
            samplePoints={trafficSamples.length}
            apiConfigured={!!TOMTOM_API_KEY}
          />
        </div>

        <div className="grid two-col">
          <CurrentPredictionPanel prediction={currentPrediction} />

          <PredictionStatusPanel
            prediction={currentPrediction}
            error={predictionError}
            message={predictionMessage}
          />
        </div>
      </div>
    </Layout>
  );
}