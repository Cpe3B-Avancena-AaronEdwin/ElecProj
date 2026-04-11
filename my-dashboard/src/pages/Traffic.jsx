import { useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";

import { useFirestoreTransitData } from "../hooks/useFirestoreTransitData";
import { useGtfsBundle } from "../hooks/useGtfsBundle";
import { useTrafficData } from "../hooks/useTrafficData";
import { useRouteLines } from "../hooks/useRouteLines";

import DashboardToolbar from "../components/dashboard/DashboardToolbar";
import DashboardMap from "../components/dashboard/DashboardMap";
import TrafficSummaryPanel from "../components/dashboard/TrafficSummaryPanel";
import TrafficStatusPanel from "../components/dashboard/TrafficStatusPanel";
import RoutingStatusPanel from "../components/dashboard/RoutingStatusPanel";

import Layout from "../components/Layout";

export default function Traffic() {
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
  const [showTrafficOverlay, setShowTrafficOverlay] = useState(true);

  const hasFirestoreData =
    routes.length > 0 ||
    stops.length > 0 ||
    vehicles.length > 0 ||
    trips.length > 0;

  const sourceMode =
    useFirestoreData && hasFirestoreData ? "firestore" : "gtfs";

  const sourceRoutes =
    sourceMode === "firestore" ? routes : gtfsBundle?.routes || [];

  const sourceStops =
    sourceMode === "firestore" ? stops : gtfsBundle?.stops || [];

  const sourceTrips =
    sourceMode === "firestore" ? trips : gtfsBundle?.trips || [];

  const sourceVehicles =
    sourceMode === "firestore" ? vehicles : [];

  const sourceRouteMap = useMemo(() => {
    const map = {};

    sourceRoutes.forEach((route) => {
      map[route.id || route.route_id] = route;
    });

    return map;
  }, [sourceRoutes]);

  const activeRoutes = useMemo(() => {
    return sourceRoutes.filter((route) => route.active !== false);
  }, [sourceRoutes]);

  const filteredStops = useMemo(() => {
    if (sourceMode === "gtfs" && selectedRouteId === "all") {
      return [];
    }

    if (selectedRouteId === "all") {
      return sourceStops;
    }

    return sourceStops.filter(
      (stop) =>
        (stop.routeId || stop.route_id) === selectedRouteId
    );
  }, [sourceStops, selectedRouteId, sourceMode]);

  const filteredVehicles = useMemo(() => {
    if (selectedRouteId === "all") {
      return sourceVehicles;
    }

    return sourceVehicles.filter(
      (vehicle) =>
        (vehicle.routeId || vehicle.route_id) === selectedRouteId
    );
  }, [sourceVehicles, selectedRouteId]);

  const {
    trafficSamples = [],
    trafficSummary,
    trafficLoading,
    refreshTraffic,
    trafficError,
    lastTrafficUpdated,
  } = useTrafficData(
    filteredStops,
    TOMTOM_API_KEY,
    sourceMode
  );

  const {
    routePaths = [],
    refreshRouteLines,
    routingLoading,
    routingError,
    lastRoutingUpdated,
  } = useRouteLines(
    filteredStops,
    TOMTOM_API_KEY,
    sourceMode,
    sourceRouteMap
  );

  const isLoading =
    sourceMode === "gtfs"
      ? gtfsLoading
      : loadingMapData;

  return (
    <Layout>
      <div className="dashboard-container">
        <div className="page-header">
          <h1>Live Traffic Monitoring</h1>
          <p>
            Real-time traffic conditions and route
            performance
          </p>
        </div>

        <DashboardToolbar
          routes={activeRoutes}
          selectedRouteId={selectedRouteId}
          onChangeRoute={setSelectedRouteId}
          sourceMode={sourceMode}
          onChangeSourceMode={(mode) =>
            setUseFirestoreData(mode === "firestore")
          }
          showTrafficOverlay={showTrafficOverlay}
          onChangeTrafficOverlay={(value) =>
            setShowTrafficOverlay(value)
          }
          hasFirestoreData={hasFirestoreData}
          trafficLoading={trafficLoading}
          routingLoading={routingLoading}
          predictionSaving={false}
          onRefreshTraffic={refreshTraffic}
          onRefreshRouteLines={refreshRouteLines}
          onSavePrediction={() => {}}

          tomtomEnabled={true}

          stats={{
            sourceMode,
            routesLoaded: sourceRoutes.length,
            stopsLoaded: sourceStops.length,
            tripsLoaded: sourceTrips.length,
            vehiclesLoaded: sourceVehicles.length,
            gtfsStatus: gtfsLoading
              ? "Loading..."
              : gtfsError
              ? "Error"
              : "Ready",
            trafficUpdated: lastTrafficUpdated
              ? new Date(
                  lastTrafficUpdated
                ).toLocaleTimeString()
              : "—",
            routesUpdated: lastRoutingUpdated
              ? new Date(
                  lastRoutingUpdated
                ).toLocaleTimeString()
              : "—",
            mapZoom: 13,
          }}
        />

        <div className="grid">
          <TrafficSummaryPanel
            summary={trafficSummary}
          />

          <TrafficStatusPanel
            loading={trafficLoading}
            error={trafficError}
            sourceMode={sourceMode}
            showTrafficOverlay={showTrafficOverlay}
            samplePoints={trafficSamples.length}
            apiConfigured={true}
          />

          <RoutingStatusPanel
            routes={routePaths}
            error={routingError}
          />
        </div>

        {!isLoading ? (
          <div className="card">
            <DashboardMap
              stops={filteredStops}
              vehicles={filteredVehicles}
              routePaths={routePaths}
              trafficSamples={
                showTrafficOverlay
                  ? trafficSamples
                  : []
              }
              showTrafficFlow={
                showTrafficOverlay
              }
              tomtomApiKey={TOMTOM_API_KEY}
            />
          </div>
        ) : (
          <div className="card">
            Loading traffic data...
          </div>
        )}
      </div>
    </Layout>
  );
}