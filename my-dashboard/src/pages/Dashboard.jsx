import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

import { useFirestoreTransitData } from "../hooks/useFirestoreTransitData";
import { useGtfsBundle } from "../hooks/useGtfsBundle";
import { useTrafficData } from "../hooks/useTrafficData";
import { useRouteLines } from "../hooks/useRouteLines";
import { useDashboardMetrics } from "../hooks/useDashboardMetrics";
import { useCurrentPrediction } from "../hooks/useCurrentPrediction";

import DashboardHeader from "../components/dashboard/DashboardHeader";
import DashboardStats from "../components/dashboard/DashboardStats";
import DashboardToolbar from "../components/dashboard/DashboardToolbar";
import DashboardMap from "../components/dashboard/DashboardMap";
import GtfsStatusPanel from "../components/dashboard/GtfsStatusPanel";
import TrafficSummaryPanel from "../components/dashboard/TrafficSummaryPanel";
import RoutingStatusPanel from "../components/dashboard/RoutingStatusPanel";
import CurrentPredictionPanel from "../components/dashboard/CurrentPredictionPanel";
import TrafficStatusPanel from "../components/dashboard/TrafficStatusPanel";
import PredictionStatusPanel from "../components/dashboard/PredictionStatusPanel";
import TripStatusSummaryPanel from "../components/dashboard/TripStatusSummaryPanel";
import DelayInsightPanel from "../components/dashboard/DelayInsightPanel";
import MapNotesPanel from "../components/dashboard/MapNotesPanel";
import RecentPredictionsPanel from "../components/dashboard/RecentPredictionsPanel";
import RouteSummaryPanel from "../components/dashboard/RouteSummaryPanel";
import RecentTripsPanel from "../components/dashboard/RecentTripsPanel";

export default function Dashboard() {
  const { user, role } = useAuth();
  const navigate = useNavigate();

  const TOMTOM_API_KEY = (import.meta.env.VITE_TOMTOM_API_KEY || "").trim();

  const {
    routes = [],
    stops = [],
    vehicles = [],
    trips = [],
    predictions = [],
    loadingMapData,
  } = useFirestoreTransitData();

  const { gtfsBundle, gtfsLoading, gtfsError } = useGtfsBundle();

  const [selectedRouteId, setSelectedRouteId] = useState("all");
  const [useFirestoreData, setUseFirestoreData] = useState(true);
  const [showTrafficOverlay, setShowTrafficOverlay] = useState(true);

  const hasFirestoreData =
    routes.length > 0 || stops.length > 0 || vehicles.length > 0 || trips.length > 0;

  const sourceMode = useFirestoreData && hasFirestoreData ? "firestore" : "gtfs";

  const sourceRoutes = sourceMode === "firestore" ? routes : gtfsBundle?.routes || [];
  const sourceStops = sourceMode === "firestore" ? stops : gtfsBundle?.stops || [];
  const sourceTrips = sourceMode === "firestore" ? trips : gtfsBundle?.trips || [];
  const sourceVehicles = sourceMode === "firestore" ? vehicles : [];

  const sourceRouteMap = useMemo(() => {
    const map = {};
    sourceRoutes.forEach((route) => {
      map[route.id || route.route_id] = route;
    });
    return map;
  }, [sourceRoutes]);

  const sourceVehicleMap = useMemo(() => {
    const map = {};
    sourceVehicles.forEach((vehicle) => {
      map[vehicle.id] = vehicle;
    });
    return map;
  }, [sourceVehicles]);

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
    trafficSummary = {
      total: 0,
      light: 0,
      moderate: 0,
      heavy: 0,
      closed: 0,
      averageCurrentSpeed: 0,
      averageFreeFlowSpeed: 0,
      level: "Low",
      avgSpeed: 0,
    },
    trafficLoading = false,
    refreshTraffic,
    trafficError = "",
    lastTrafficUpdated,
  } = useTrafficData(filteredStops, TOMTOM_API_KEY, sourceMode);

  const {
    routePaths = [],
    refreshRouteLines,
    routingLoading = false,
    routingError = "",
    lastRoutingUpdated,
  } = useRouteLines(filteredStops, TOMTOM_API_KEY, sourceMode, sourceRouteMap);

  const metrics = useDashboardMetrics({
    routes: sourceRoutes,
    stops: filteredStops,
    vehicles: filteredVehicles,
    trips: filteredTrips,
    trafficSummary,
  });

  const {
    currentPrediction = {},
    predictionSaving = false,
    predictionError = "",
    predictionMessage = "",
    savePrediction,
  } = useCurrentPrediction({
    routes: sourceRoutes,
    stops: filteredStops,
    trips: filteredTrips,
    trafficSummary,
    user,
    selectedRouteId,
    sourceRouteMap,
    sourceMode,
  });

  const isLoading = sourceMode === "gtfs" ? gtfsLoading : loadingMapData;

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: "1rem",
        fontFamily: "Arial, sans-serif",
        background: "#02081c",
        color: "white",
      }}
    >
      <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
        <DashboardHeader
          user={user}
          role={role}
          onAdmin={() => navigate("/admin")}
        />

        <DashboardStats metrics={metrics} />

        <DashboardToolbar
          routes={activeRoutes}
          selectedRouteId={selectedRouteId}
          onChangeRoute={setSelectedRouteId}
          sourceMode={sourceMode}
          onChangeSourceMode={(mode) => setUseFirestoreData(mode === "firestore")}
          showTrafficOverlay={showTrafficOverlay}
          onChangeTrafficOverlay={setShowTrafficOverlay}
          hasFirestoreData={hasFirestoreData}
          trafficLoading={trafficLoading}
          routingLoading={routingLoading}
          predictionSaving={predictionSaving}
          onRefreshTraffic={refreshTraffic}
          onRefreshRouteLines={refreshRouteLines}
          onSavePrediction={savePrediction}
          tomtomEnabled={!!TOMTOM_API_KEY}
          stats={{
            sourceMode,
            routesLoaded: sourceRoutes.length,
            stopsLoaded: sourceStops.length,
            tripsLoaded: sourceTrips.length,
            vehiclesLoaded: sourceVehicles.length,
            gtfsStatus: gtfsLoading ? "Loading..." : gtfsError ? "Error" : "Ready",
            trafficUpdated: lastTrafficUpdated
              ? new Date(lastTrafficUpdated).toLocaleTimeString()
              : "—",
            routesUpdated: lastRoutingUpdated
              ? new Date(lastRoutingUpdated).toLocaleTimeString()
              : "—",
            mapZoom: 13,
          }}
        />

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: "1rem",
            marginBottom: "1rem",
          }}
        >
          <GtfsStatusPanel gtfsBundle={gtfsBundle} loading={gtfsLoading} error={gtfsError} />
          <TrafficSummaryPanel summary={trafficSummary} />
          <RoutingStatusPanel routes={routePaths} error={routingError} />
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: "1rem",
            marginBottom: "1rem",
          }}
        >
          <CurrentPredictionPanel prediction={currentPrediction} />
          <TrafficStatusPanel
            loading={trafficLoading}
            error={trafficError}
            sourceMode={sourceMode}
            showTrafficOverlay={showTrafficOverlay}
            samplePoints={trafficSamples.length}
            apiConfigured={!!TOMTOM_API_KEY}
          />
          <PredictionStatusPanel
            prediction={currentPrediction}
            error={predictionError}
            message={predictionMessage}
          />
        </div>

        {!isLoading ? (
          <DashboardMap
            stops={filteredStops}
            vehicles={filteredVehicles}
            routePaths={routePaths}
            trafficSamples={showTrafficOverlay ? trafficSamples : []}
          />
        ) : (
          <div
            style={{
              height: "560px",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              background: "#111827",
              color: "#fff",
              fontSize: "1.1rem",
              borderRadius: "18px",
              border: "1px solid #1f2937",
              marginBottom: "1.5rem",
            }}
          >
            Loading map data...
          </div>
        )}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: "1rem",
            marginBottom: "1rem",
          }}
        >
          <TripStatusSummaryPanel metrics={metrics} />
          <DelayInsightPanel metrics={metrics} />
          <MapNotesPanel />
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
            gap: "1rem",
          }}
        >
          <RecentPredictionsPanel predictions={predictions} />
          <RouteSummaryPanel
            routes={activeRoutes}
            sourceStops={sourceStops}
            sourceTrips={sourceTrips}
            sourceVehicles={sourceVehicles}
          />
          <RecentTripsPanel
            trips={filteredTrips}
            sourceRouteMap={sourceRouteMap}
            sourceVehicleMap={sourceVehicleMap}
            sourceMode={sourceMode}
          />
        </div>
      </div>
    </div>
  );
}