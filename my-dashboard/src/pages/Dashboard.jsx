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

  return (
    <Layout>
      <div className="dashboard-container">

        {/* KEY METRICS */}
        <DashboardStats metrics={metrics} />

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

        {/* QUICK ACTIONS */}
        <div className="quick-actions">
          <h3>Quick Actions</h3>
          <div className="action-buttons">
            <button onClick={() => navigate("/traffic")} className="action-btn">
              📊 View Live Traffic
            </button>
            <button onClick={() => navigate("/routes")} className="action-btn">
              🗺️ Manage Routes
            </button>
            <button onClick={() => navigate("/reports")} className="action-btn">
              📈 View Reports
            </button>
          </div>
        </div>

      </div>
    </Layout>
  );
}