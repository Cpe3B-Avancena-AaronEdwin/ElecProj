import { useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";

import { useFirestoreTransitData } from "../hooks/useFirestoreTransitData";
import { useGtfsBundle } from "../hooks/useGtfsBundle";
import { useTrafficData } from "../hooks/useTrafficData";
import { useRouteLines } from "../hooks/useRouteLines";
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

export default function Dashboard() {
  const { user } = useAuth();

  const TOMTOM_API_KEY = (import.meta.env.VITE_TOMTOM_API_KEY || "").trim();

  const {
    routes = [],
    stops = [],
    vehicles = [],
    trips = [],
  } = useFirestoreTransitData();

  const { gtfsBundle, gtfsLoading, gtfsError } = useGtfsBundle();

  const [selectedRouteId] = useState("all");

  const gtfsRoutes = gtfsBundle?.routes || [];
  const gtfsStops = gtfsBundle?.stops || [];
  const gtfsTrips = gtfsBundle?.trips || [];

  const firestoreRoutes = routes || [];
  const firestoreStops = stops || [];
  const firestoreTrips = trips || [];
  const firestoreVehicles = vehicles || [];

  const gtfsRouteMap = useMemo(() => {
    return gtfsRoutes.reduce((acc, route) => {
      const key = route.id || route.routeId || route.route_id;
      if (key) acc[key] = route;
      return acc;
    }, {});
  }, [gtfsRoutes]);

  const gtfsFilteredStops = useMemo(() => {
    if (selectedRouteId === "all") return gtfsStops;
    return gtfsStops.filter((stop) => (stop.routeId || stop.route_id) === selectedRouteId);
  }, [gtfsStops, selectedRouteId]);

  const gtfsFilteredTrips = useMemo(() => {
    if (selectedRouteId === "all") return gtfsTrips;
    return gtfsTrips.filter((trip) => (trip.routeId || trip.route_id) === selectedRouteId);
  }, [gtfsTrips, selectedRouteId]);

  const firestoreFilteredVehicles = useMemo(() => {
    if (selectedRouteId === "all") return firestoreVehicles;
    return firestoreVehicles.filter(
      (vehicle) => (vehicle.routeId || vehicle.route_id) === selectedRouteId
    );
  }, [firestoreVehicles, selectedRouteId]);

  const {
    trafficSamples = [],
    trafficSummary = {},
    trafficHistory = [],
    historyAnalytics = {},
    trafficLoading,
    trafficError,
    lastTrafficUpdated,
  } = useTrafficData(gtfsFilteredStops, TOMTOM_API_KEY, "gtfs");

  useRouteLines(gtfsFilteredStops, TOMTOM_API_KEY, "gtfs", {});

  const metrics = useDashboardMetrics({
    routes: gtfsRoutes,
    stops: gtfsFilteredStops,
    vehicles: firestoreFilteredVehicles,
    trips: gtfsFilteredTrips,
    trafficSummary,
  });

  const {
    currentPrediction,
    predictionError,
    predictionMessage,
  } = useCurrentPrediction({
    routes: gtfsRoutes,
    stops: gtfsFilteredStops,
    trips: gtfsFilteredTrips,
    trafficSummary,
    trafficHistory,
    historyAnalytics,
    user,
    selectedRouteId,
    sourceRouteMap: gtfsRouteMap,
    sourceMode: "gtfs",
  });

  const quickAlert = useMemo(() => {
    if (trafficSummary.closed > 0) {
      return { level: "critical", message: "⚠ Road closure detected on monitored corridor" };
    }

    if (currentPrediction.predictedDelayRisk === "High") {
      return {
        level: "heavy",
        message: `⚠ ${currentPrediction.routeCode} likely delayed by ${currentPrediction.etaImpactMinutes} mins`,
      };
    }

    if (currentPrediction.trend === "Rising" || currentPrediction.trend === "Worsening") {
      return {
        level: "moderate",
        message: "⚠ Congestion trend is rising across key corridors",
      };
    }

    return { level: "normal", message: "✅ Traffic is flowing smoothly" };
  }, [currentPrediction, trafficSummary.closed]);

  const graphPoints = useMemo(() => {
    if (trafficHistory.length >= 2) {
      return trafficHistory.map((item) => scoreToRatio(item.congestionScore)).slice(-288);
    }

    const sampleLevels =
      trafficSamples.length > 0
        ? trafficSamples
            .map((sample) => scoreToRatio(sample?.congestionScore))
            .filter((value) => Number.isFinite(value))
        : [];

    if (sampleLevels.length > 1) {
      return sampleLevels.slice(0, 16);
    }

    const heavy = Number(trafficSummary.heavy || 0);
    const moderate = Number(trafficSummary.moderate || 0);
    const low = Number(trafficSummary.light || trafficSummary.low || 0);
    const closed = Number(trafficSummary.closed || 0);

    const generated = [];
    for (let i = 0; i < heavy; i += 1) generated.push(0.85);
    for (let i = 0; i < moderate; i += 1) generated.push(0.55);
    for (let i = 0; i < low; i += 1) generated.push(0.25);
    for (let i = 0; i < closed; i += 1) generated.push(1);

    if (generated.length) return generated.slice(0, 16);

    return [0.25, 0.35, 0.3, 0.4];
  }, [trafficHistory, trafficSamples, trafficSummary]);

  const graphTitle =
    trafficHistory.length >= 2 ? "Last 24H Congestion Trend" : "Current Congestion Profile";

  const graphNote =
    trafficHistory.length >= 2
      ? `Based on ${trafficHistory.length} stored 5-minute snapshots from the last 24 hours.`
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

  const sparklinePath = graphPoints
    .map((value, index) => {
      const x = (index / Math.max(graphPoints.length - 1, 1)) * 100;
      const y = 100 - value * 100;
      return `${index === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");

  const recommendationTone =
    currentPrediction.predictedDelayRisk === "High"
      ? "rgba(239, 68, 68, 0.08)"
      : currentPrediction.predictedDelayRisk === "Medium"
      ? "rgba(245, 158, 11, 0.08)"
      : "rgba(34, 197, 94, 0.08)";

  return (
    <Layout>
      <div className="dashboard-container">
        <DashboardStats metrics={metrics} />

        <div className="dashboard-status-row">
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
            <div className="status-card-title">Quick Alerts</div>
            <div className={`alert-pill alert-pill--${quickAlert.level}`}>
              {quickAlert.message}
            </div>
            <div className="status-card-note">{currentPrediction.congestionForecast}</div>
          </div>

          <div className="status-card card">
            <div className="status-card-title">{graphTitle}</div>
            <div className="sparkline-chart">
              <svg viewBox="0 0 100 100" className="sparkline">
                <path d={sparklinePath} />
                {graphPoints.map((value, index) => {
                  const x = (index / Math.max(graphPoints.length - 1, 1)) * 100;
                  const y = 100 - value * 100;
                  return <circle key={index} cx={x} cy={y} r="2.5" />;
                })}
              </svg>
            </div>
            <div className="status-card-note">{graphNote}</div>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: "1rem",
            marginBottom: "1rem",
          }}
        >
          <div className="card" style={{ padding: "1rem" }}>
            <div style={{ color: "var(--text-sub)", marginBottom: "0.5rem" }}>
              Prediction Confidence
            </div>
            <div
              style={{
                fontSize: "2rem",
                fontWeight: 800,
                color: "var(--text-on-dark)",
              }}
            >
              {currentPrediction.confidence}%
            </div>
            <div style={{ color: "var(--text-sub)", marginTop: "0.35rem" }}>
              Based on {currentPrediction.basedOnTrafficSamples} live traffic samples,{" "}
              {currentPrediction.historicalSnapshotCount24h} last-24h snapshots, and{" "}
              {currentPrediction.historicalSnapshotCount7d} seven-day snapshots.
            </div>
          </div>

          <div className="card" style={{ padding: "1rem", background: recommendationTone }}>
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
              {currentPrediction.recommendation}
            </div>
            <div style={{ color: "var(--text-sub)", marginTop: "0.45rem" }}>
              Estimated delay impact: +{currentPrediction.etaImpactMinutes} minutes.
            </div>
          </div>

          <div className="card" style={{ padding: "1rem" }}>
            <div style={{ color: "var(--text-sub)", marginBottom: "0.5rem" }}>
              Historical Peak Window
            </div>
            <div
              style={{
                color: "var(--text-on-dark)",
                fontWeight: 700,
                marginBottom: "0.35rem",
              }}
            >
              {currentPrediction.predictedPeakWindow || "Building history"}
            </div>
            <div style={{ color: "var(--text-sub)" }}>
              24h avg: {currentPrediction.historicalAverageScore24h ?? 0}/100 • 7d avg:{" "}
              {currentPrediction.historicalAverageScore7d ?? 0}/100
            </div>
          </div>
        </div>

        <div className="grid">
          <GtfsStatusPanel gtfsBundle={gtfsBundle} loading={gtfsLoading} error={gtfsError} />
          <TrafficSummaryPanel summary={trafficSummary} />
          <CurrentPredictionPanel prediction={currentPrediction} />
        </div>

        <div className="grid">
          <PredictionStatusPanel
            prediction={currentPrediction}
            error={predictionError}
            message={predictionMessage}
          />
          <TrafficStatusPanel
            loading={trafficLoading}
            error={trafficError}
            sourceMode="gtfs"
            showTrafficOverlay={true}
            samplePoints={trafficSamples.length}
            apiConfigured={!!TOMTOM_API_KEY}
          />
        </div>

        <footer className="site-footer">
          <div className="dashboard-footer">
            © {new Date().getFullYear()} MoveMint. All rights reserved.
          </div>
        </footer>
      </div>
    </Layout>
  );
}