import { useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useFirestoreTransitData } from "../hooks/useFirestoreTransitData";
import { useGtfsBundle } from "../hooks/useGtfsBundle";
import { useRouteLines } from "../hooks/useRouteLines";
import { useTrafficData } from "../hooks/useTrafficData";

import Layout from "../components/Layout";
import DashboardToolbar from "../components/dashboard/DashboardToolbar";
import DashboardMap from "../components/dashboard/DashboardMap";
import TripPlannerPanel from "../components/dashboard/TripPlannerPanel";
import TrafficSummaryPanel from "../components/dashboard/TrafficSummaryPanel";
import TrafficStatusPanel from "../components/dashboard/TrafficStatusPanel";
import RouteSummaryPanel from "../components/dashboard/RouteSummaryPanel";
import RoutingStatusPanel from "../components/dashboard/RoutingStatusPanel";

export default function Data() {
  useAuth();

  const TOMTOM_API_KEY = (import.meta.env.VITE_TOMTOM_API_KEY || "").trim();

  const [selectedRouteId, setSelectedRouteId] = useState("all");
  const [sourceMode, setSourceMode] = useState("firestore");
  const [showTrafficOverlay, setShowTrafficOverlay] = useState(true);

  const { routes = [], stops = [], trips = [], vehicles = [] } = useFirestoreTransitData();
  const { gtfsBundle, gtfsLoading, gtfsError } = useGtfsBundle();

  const hasFirestoreData =
    routes.length > 0 ||
    stops.length > 0 ||
    trips.length > 0 ||
    vehicles.length > 0;

  const actualSourceMode =
    sourceMode === "firestore" && hasFirestoreData ? "firestore" : "gtfs";

  const sourceRoutes =
    actualSourceMode === "firestore" ? routes : gtfsBundle?.routes || [];
  const sourceStops =
    actualSourceMode === "firestore" ? stops : gtfsBundle?.stops || [];
  const sourceTrips =
    actualSourceMode === "firestore" ? trips : gtfsBundle?.trips || [];
  const sourceVehicles =
    actualSourceMode === "firestore" ? vehicles : [];

  const sourceRouteMap = useMemo(() => {
    return (sourceRoutes || []).reduce((acc, route) => {
      const routeId = route.id || route.route_id;
      if (!routeId) return acc;
      acc[routeId] = {
        ...route,
        routeCode: route.routeCode || route.route_short_name || "N/A",
        routeName:
          route.routeName || route.route_long_name || route.route_desc || "Unnamed Route",
      };
      return acc;
    }, {});
  }, [sourceRoutes]);

  const filteredStops = useMemo(() => {
    if (selectedRouteId === "all") return sourceStops;
    return (sourceStops || []).filter(
      (stop) =>
        (stop.routeId || stop.route_id) === selectedRouteId ||
        (stop.route_id || stop.routeId) === selectedRouteId
    );
  }, [selectedRouteId, sourceStops]);

  const selectedRouteMeta = useMemo(() => {
    if (selectedRouteId === "all") return null;
    return sourceRouteMap[selectedRouteId] || null;
  }, [selectedRouteId, sourceRouteMap]);

  const { routePaths, routingLoading, routingError, lastRoutingUpdated, refreshRouteLines } =
    useRouteLines(filteredStops, TOMTOM_API_KEY, actualSourceMode, sourceRouteMap, [], selectedRouteMeta, {
      cacheKey: `data-page:${actualSourceMode}:${selectedRouteId}`,
    });

  const {
    trafficSamples = [],
    trafficSummary = {},
    trafficLoading,
    trafficError,
    lastTrafficUpdated,
    refreshTraffic,
  } = useTrafficData(filteredStops, TOMTOM_API_KEY, {
    enabled: actualSourceMode !== "gtfs",
    liveTraffic: true,
    history: false,
    cacheKey: `data-page:${actualSourceMode}:${selectedRouteId}`,
    maxSamplePoints: 20,
  });

  return (
    <Layout>
      <div className="dashboard-container">
        <DashboardToolbar
          routes={sourceRoutes}
          selectedRouteId={selectedRouteId}
          onChangeRoute={setSelectedRouteId}
          sourceMode={actualSourceMode}
          onChangeSourceMode={setSourceMode}
          showTrafficOverlay={showTrafficOverlay}
          onChangeTrafficOverlay={setShowTrafficOverlay}
          hasFirestoreData={hasFirestoreData}
          trafficLoading={trafficLoading}
          routingLoading={routingLoading}
          onRefreshTraffic={refreshTraffic}
          onRefreshRouteLines={refreshRouteLines}
          tomtomEnabled={!!TOMTOM_API_KEY}
          stats={{
            sourceMode: actualSourceMode,
            routesLoaded: sourceRoutes.length,
            stopsLoaded: sourceStops.length,
            tripsLoaded: sourceTrips.length,
            vehiclesLoaded: sourceVehicles.length,
            gtfsStatus: gtfsLoading ? "Loading" : gtfsError ? "Error" : "Ready",
            trafficUpdated: lastTrafficUpdated || "—",
            routesUpdated: lastRoutingUpdated || "—",
          }}
        />

        <div className="dashboard-chart-row">
          <div className="dashboard-panel-item">
            <DashboardMap
              stops={sourceStops}
              vehicles={sourceVehicles}
              routePaths={routePaths}
              trafficSamples={trafficSamples}
              showTrafficFlow={showTrafficOverlay}
              tomtomApiKey={TOMTOM_API_KEY}
              showStops={true}
              showRoutes={true}
            />
          </div>
        </div>

        <div className="dashboard-status-bottom-row">
          <div className="status-card card">
            <div className="status-card-title">Data Mode</div>
            <div className="status-card-value">{actualSourceMode.toUpperCase()}</div>
            <div className="status-card-note">
              {hasFirestoreData
                ? "Using admin dataset when available."
                : "Using GTFS data fallback."}
            </div>
          </div>

          <div className="status-card card">
            <div className="status-card-title">Latest Traffic Update</div>
            <div className="status-card-value">{lastTrafficUpdated ? new Date(lastTrafficUpdated).toLocaleString() : "No recent update"}</div>
            <div className="status-card-note">
              {trafficError || "Traffic status data is loaded here."}
            </div>
          </div>
        </div>

        <div className="dashboard-panels-grid">
          <div className="dashboard-panel-item">
            <RouteSummaryPanel
              routes={sourceRoutes}
              sourceStops={sourceStops}
              sourceTrips={sourceTrips}
              sourceVehicles={sourceVehicles}
            />
          </div>

          <div className="dashboard-panel-item">
            <TrafficSummaryPanel summary={trafficSummary} />
          </div>

          <div className="dashboard-panel-item">
            <TrafficStatusPanel
              loading={trafficLoading}
              error={trafficError}
              sourceMode={actualSourceMode}
              showTrafficOverlay={showTrafficOverlay}
              samplePoints={trafficSamples.length}
              apiConfigured={!!TOMTOM_API_KEY}
            />
          </div>
        </div>

        <div className="dashboard-bottom-grid">
          <div className="dashboard-panel-item">
            <RoutingStatusPanel routes={routePaths} error={routingError} />
          </div>

          <div className="dashboard-panel-item">
            <TripPlannerPanel gtfsBundle={gtfsBundle} onPlanSelected={() => {}} />
          </div>
        </div>
      </div>
    </Layout>
  );
}
