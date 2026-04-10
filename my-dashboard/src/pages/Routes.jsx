import { useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";

import { useFirestoreTransitData } from "../hooks/useFirestoreTransitData";
import { useGtfsBundle } from "../hooks/useGtfsBundle";
import { useRouteLines } from "../hooks/useRouteLines";

import DashboardToolbar from "../components/dashboard/DashboardToolbar";
import DashboardMap from "../components/dashboard/DashboardMap";
import RouteSummaryPanel from "../components/dashboard/RouteSummaryPanel";
import RoutingStatusPanel from "../components/dashboard/RoutingStatusPanel";
import RecentTripsPanel from "../components/dashboard/RecentTripsPanel";

import Layout from "../components/Layout";

export default function Routes() {
  const { user } = useAuth();

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
    routePaths = [],
    refreshRouteLines,
    routingLoading,
    routingError,
    lastRoutingUpdated,
  } = useRouteLines(filteredStops, TOMTOM_API_KEY, sourceMode, sourceRouteMap);

  const isLoading = sourceMode === "gtfs" ? gtfsLoading : loadingMapData;

  return (
    <Layout>
      <div className="dashboard-container">

        <div className="page-header">
          <h1>Route Management</h1>
          <p>Monitor and manage transit routes, stops, and vehicle assignments</p>
        </div>

        <DashboardToolbar
          routes={activeRoutes}
          selectedRouteId={selectedRouteId}
          onChangeRoute={setSelectedRouteId}
          sourceMode={sourceMode}
          onChangeSourceMode={(mode) => setUseFirestoreData(mode === "firestore")}
          showTrafficOverlay={false}
          onChangeTrafficOverlay={() => {}}
          hasFirestoreData={hasFirestoreData}
          trafficLoading={false}
          routingLoading={routingLoading}
          predictionSaving={false}
          onRefreshTraffic={() => {}}
          onRefreshRouteLines={refreshRouteLines}
          onSavePrediction={() => {}}
          tomtomEnabled={!!TOMTOM_API_KEY}
          stats={{
            sourceMode,
            routesLoaded: sourceRoutes.length,
            stopsLoaded: sourceStops.length,
            tripsLoaded: sourceTrips.length,
            vehiclesLoaded: sourceVehicles.length,
            gtfsStatus: gtfsLoading ? "Loading..." : gtfsError ? "Error" : "Ready",
            trafficUpdated: "—",
            routesUpdated: lastRoutingUpdated
              ? new Date(lastRoutingUpdated).toLocaleTimeString()
              : "—",
            mapZoom: 13,
          }}
        />

        {/* ROUTE STATUS PANELS */}
        <div className="grid">
          <RoutingStatusPanel routes={routePaths} error={routingError} />
          <RouteSummaryPanel
            routes={activeRoutes}
            sourceStops={sourceStops}
            sourceTrips={sourceTrips}
            sourceVehicles={sourceVehicles}
          />
        </div>

        {/* ROUTES MAP */}
        {!isLoading ? (
          <div className="card">
            <DashboardMap
              stops={filteredStops}
              vehicles={filteredVehicles}
              routePaths={routePaths}
              trafficSamples={[]}
            />
          </div>
        ) : (
          <div className="card">Loading route data...</div>
        )}

        {/* RECENT TRIPS */}
        <div className="grid">
          <RecentTripsPanel
            trips={filteredTrips}
            sourceRouteMap={sourceRouteMap}
            sourceVehicleMap={sourceVehicleMap}
            sourceMode={sourceMode}
          />
        </div>

      </div>
    </Layout>
  );
}