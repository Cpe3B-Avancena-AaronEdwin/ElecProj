import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

import { useFirestoreTransitData } from "../hooks/useFirestoreTransitData";
import { useGtfsBundle } from "../hooks/useGtfsBundle";
import { useTrafficData } from "../hooks/useTrafficData";
import { useRouteLines } from "../hooks/useRouteLines";
import { useDashboardMetrics } from "../hooks/useDashboardMetrics";

import DashboardStats from "../components/dashboard/DashboardStats";
import GtfsStatusPanel from "../components/dashboard/GtfsStatusPanel";
import TrafficSummaryPanel from "../components/dashboard/TrafficSummaryPanel";
import CurrentPredictionPanel from "../components/dashboard/CurrentPredictionPanel";
import TrafficStatusPanel from "../components/dashboard/TrafficStatusPanel";

import Layout from "../components/Layout";

export default function Dashboard() {
  const { user, role } = useAuth();
  const navigate = useNavigate();

  const TOMTOM_API_KEY = (import.meta.env.VITE_TOMTOM_API_KEY || "").trim();

  const {
    routes = [],
    stops = [],
    vehicles = [],
    trips = [],
    loadingMapData,
  } = useFirestoreTransitData();

  const { gtfsBundle, gtfsLoading, gtfsError } = useGtfsBundle();

  const [selectedRouteId, setSelectedRouteId] = useState("all");
  const [useFirestoreData, setUseFirestoreData] = useState(true);

  const hasFirestoreData =
    routes.length > 0 || stops.length > 0 || vehicles.length > 0 || trips.length > 0;

  const sourceMode = useFirestoreData && hasFirestoreData ? "firestore" : "gtfs";

  const sourceRoutes = sourceMode === "firestore" ? routes : gtfsBundle?.routes || [];
  const sourceStops = sourceMode === "firestore" ? stops : gtfsBundle?.stops || [];
  const sourceTrips = sourceMode === "firestore" ? trips : gtfsBundle?.trips || [];
  const sourceVehicles = sourceMode === "firestore" ? vehicles : [];

  const activeRoutes = useMemo(
    () => sourceRoutes.filter((route) => route.active !== false),
    [sourceRoutes]
  );

  const filteredStops = useMemo(() => {
    if (sourceMode === "gtfs" && selectedRouteId === "all") return [];
    if (selectedRouteId === "all") return sourceStops;
    return sourceStops.filter(
      (stop) => (stop.routeId || stop.route_id) === selectedRouteId
    );
  }, [sourceStops, selectedRouteId, sourceMode]);

  const filteredVehicles = useMemo(() => {
    if (selectedRouteId === "all") return sourceVehicles;
    return sourceVehicles.filter(
      (vehicle) => (vehicle.routeId || vehicle.route_id) === selectedRouteId
    );
  }, [sourceVehicles, selectedRouteId]);

  const filteredTrips = useMemo(() => {
    if (selectedRouteId === "all") return sourceTrips;
    return sourceTrips.filter(
      (trip) => (trip.routeId || trip.route_id) === selectedRouteId
    );
  }, [sourceTrips, selectedRouteId]);

  const {
    trafficSamples = [],
    trafficSummary,
    trafficLoading,
    refreshTraffic,
    trafficError,
    lastTrafficUpdated,
  } = useTrafficData(filteredStops, TOMTOM_API_KEY, sourceMode);

  const {
    routePaths = [],
    refreshRouteLines,
    routingLoading,
    routingError,
    lastRoutingUpdated,
  } = useRouteLines(filteredStops, TOMTOM_API_KEY, sourceMode, {});

  const metrics = useDashboardMetrics({
    routes: sourceRoutes,
    stops: filteredStops,
    vehicles: filteredVehicles,
    trips: filteredTrips,
    trafficSummary,
  });

  const isLoading = sourceMode === "gtfs" ? gtfsLoading : loadingMapData;

  const quickAlert = useMemo(() => {
    if (trafficSummary.closed > 0) {
      return { level: "critical", message: "⚠ Road closure detected on main artery" };
    }
    if (trafficSummary.heavy > 0) {
      return { level: "heavy", message: "⚠ Heavy traffic in Quezon Ave" };
    }
    if (trafficSummary.moderate > 0) {
      return { level: "moderate", message: "⚠ Moderate congestion across key corridors" };
    }
    return { level: "normal", message: "✅ Traffic is flowing smoothly" };
  }, [trafficSummary.closed, trafficSummary.heavy, trafficSummary.moderate]);

  const trafficTrendPoints = useMemo(() => {
    const baseShift = trafficSummary.level === "High" ? 0.16 : trafficSummary.level === "Medium" ? 0.06 : -0.08;
    const seed = [0.28, 0.42, 0.5, 0.58, 0.47, 0.62, 0.73, 0.6];
    return seed.map((value) => Math.min(1, Math.max(0, value + baseShift)));
  }, [trafficSummary.level]);

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

  const sparklinePath = trafficTrendPoints
    .map((value, index) => {
      const x = (index / (trafficTrendPoints.length - 1)) * 100;
      const y = 100 - value * 100;
      return `${index === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");

  return (
    <Layout>
      <div className="dashboard-container">

        {/* KEY METRICS */}
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
            <div className="status-card-note">
              {trafficSummary.level === "Low"
                ? "No major delays detected."
                : `${trafficSummary.level} congestion detected.`}
            </div>
          </div>

          <div className="status-card card">
            <div className="status-card-title">Last 24h Congestion</div>
            <div className="sparkline-chart">
              <svg viewBox="0 0 100 100" className="sparkline">
                <path d={sparklinePath} />
                {trafficTrendPoints.map((value, index) => {
                  const x = (index / (trafficTrendPoints.length - 1)) * 100;
                  const y = 100 - value * 100;
                  return <circle key={index} cx={x} cy={y} r="2.5" />;
                })}
              </svg>
            </div>
            <div className="status-card-note">Trend shows relative congestion changes over the last day.</div>
          </div>
        </div>

        {/* QUICK STATUS OVERVIEW */}
        <div className="grid">
          <GtfsStatusPanel gtfsBundle={gtfsBundle} loading={gtfsLoading} error={gtfsError} />
          <TrafficSummaryPanel summary={trafficSummary} />
          <CurrentPredictionPanel prediction={{}} />
        </div>

        {/* SYSTEM STATUS */}
        <div className="grid">
          <TrafficStatusPanel
            loading={trafficLoading}
            error={trafficError}
            sourceMode={sourceMode}
            showTrafficOverlay={true}
            samplePoints={trafficSamples.length}
            apiConfigured={!!TOMTOM_API_KEY}
          />
        </div>

        {/* FOOTER */}
        <footer className="site-footer">
          <div className="dashboard-footer">© {new Date().getFullYear()} MoveMint. All rights reserved.</div>
        </footer>

      </div>
    </Layout>
  );
}