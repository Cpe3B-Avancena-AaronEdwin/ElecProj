import { useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";

import { useFirestoreTransitData } from "../hooks/useFirestoreTransitData";
import { useGtfsBundle } from "../hooks/useGtfsBundle";
import { useTrafficData } from "../hooks/useTrafficData";
import { useRouteLines } from "../hooks/useRouteLines";

import DashboardToolbar from "../components/dashboard/DashboardToolbar";
import DashboardMap from "../components/dashboard/DashboardMap";
import RouteSummaryPanel from "../components/dashboard/RouteSummaryPanel";
import RoutingStatusPanel from "../components/dashboard/RoutingStatusPanel";

import Layout from "../components/Layout";

function normalizeStop(stop) {
  return {
    ...stop,
    id: stop.id || stop.stop_id,
    stop_id: stop.stop_id || stop.id,
    stopName: stop.stopName || stop.stop_name,
    stopCode: stop.stopCode || stop.stop_code,
    stopLat:
      stop.stopLat ?? stop.stop_lat ?? stop.latitude ?? stop.lat ?? null,
    stopLon:
      stop.stopLon ?? stop.stop_lon ?? stop.longitude ?? stop.lng ?? null,
  };
}

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

  const rawGtfsStops = gtfsBundle?.rawStops || gtfsBundle?.stops || [];
  const rawGtfsTrips = gtfsBundle?.rawTrips || gtfsBundle?.trips || [];
  const rawGtfsStopTimes = gtfsBundle?.rawStopTimes || [];
  const rawGtfsShapes = gtfsBundle?.rawShapes || [];

  const sourceRouteMap = useMemo(() => {
    const map = {};
    sourceRoutes.forEach((route) => {
      const routeId = route.id || route.route_id;
      map[routeId] = {
        ...route,
        id: routeId,
        routeCode: route.routeCode || route.route_short_name || "N/A",
        routeName:
          route.routeName || route.route_long_name || route.route_desc || "Unnamed Route",
      };
    });
    return map;
  }, [sourceRoutes]);

  const activeRoutes = useMemo(() => {
    return sourceRoutes.filter((route) => route.active !== false);
  }, [sourceRoutes]);

  const selectedRouteMeta = useMemo(() => {
    if (selectedRouteId === "all") return null;
    const route = sourceRouteMap[selectedRouteId];
    if (!route) return null;

    return {
      id: route.id || route.route_id,
      code: route.routeCode || route.route_short_name || "N/A",
      name:
        route.routeName || route.route_long_name || route.route_desc || "Unnamed Route",
    };
  }, [selectedRouteId, sourceRouteMap]);

  const gtfsDerived = useMemo(() => {
    if (sourceMode !== "gtfs") {
      return {
        filteredStops: [],
        shapePoints: [],
      };
    }

    if (selectedRouteId === "all") {
      return {
        filteredStops: [],
        shapePoints: [],
      };
    }

    const routeTrips = rawGtfsTrips.filter(
      (trip) => (trip.route_id || trip.routeId) === selectedRouteId
    );

    if (!routeTrips.length) {
      return {
        filteredStops: [],
        shapePoints: [],
      };
    }

    const tripIds = new Set(
      routeTrips.map((trip) => trip.trip_id || trip.tripId).filter(Boolean)
    );

    const selectedTrip = routeTrips[0] || null;
    const selectedShapeId =
      selectedTrip?.shape_id || selectedTrip?.shapeId || null;

    const stopTimesForRoute = rawGtfsStopTimes
      .filter((st) => tripIds.has(st.trip_id || st.tripId))
      .sort((a, b) => {
        const seqA = Number(a.stop_sequence ?? a.stopSequence ?? 0);
        const seqB = Number(b.stop_sequence ?? b.stopSequence ?? 0);
        return seqA - seqB;
      });

    const stopIdsInOrder = [];
    const seenStopIds = new Set();

    stopTimesForRoute.forEach((st) => {
      const stopId = st.stop_id || st.stopId;
      if (!stopId || seenStopIds.has(stopId)) return;
      seenStopIds.add(stopId);
      stopIdsInOrder.push(stopId);
    });

    const stopMap = new Map(
      rawGtfsStops.map((stop) => [stop.stop_id || stop.id, stop])
    );

    const orderedStops = stopIdsInOrder
      .map((stopId) => stopMap.get(stopId))
      .filter(Boolean)
      .map((stop) =>
        normalizeStop({
          ...stop,
          routeId: selectedRouteId,
          route_id: selectedRouteId,
        })
      );

    const shapePoints = rawGtfsShapes
      .filter((shape) => (shape.shape_id || shape.shapeId) === selectedShapeId)
      .sort((a, b) => {
        const seqA = Number(
          a.shape_pt_sequence ?? a.shapePtSequence ?? 0
        );
        const seqB = Number(
          b.shape_pt_sequence ?? b.shapePtSequence ?? 0
        );
        return seqA - seqB;
      })
      .map((shape) => [
        parseFloat(shape.shape_pt_lat ?? shape.shapePtLat),
        parseFloat(shape.shape_pt_lon ?? shape.shapePtLon),
      ])
      .filter(
        (point) => !Number.isNaN(point[0]) && !Number.isNaN(point[1])
      );

    return {
      filteredStops: orderedStops,
      shapePoints,
    };
  }, [
    sourceMode,
    selectedRouteId,
    rawGtfsTrips,
    rawGtfsStopTimes,
    rawGtfsStops,
    rawGtfsShapes,
  ]);

  const filteredStops = useMemo(() => {
    if (sourceMode === "gtfs") {
      return gtfsDerived.filteredStops;
    }

    if (selectedRouteId === "all") {
      return sourceStops;
    }

    return sourceStops.filter(
      (stop) => (stop.routeId || stop.route_id) === selectedRouteId
    );
  }, [sourceMode, gtfsDerived.filteredStops, selectedRouteId, sourceStops]);

  const filteredVehicles = useMemo(() => {
    if (selectedRouteId === "all") {
      return sourceVehicles;
    }

    return sourceVehicles.filter(
      (vehicle) => (vehicle.routeId || vehicle.route_id) === selectedRouteId
    );
  }, [sourceVehicles, selectedRouteId]);

  const isAllGtfs = sourceMode === "gtfs" && selectedRouteId === "all";

  const routingInputStops = useMemo(() => {
    if (isAllGtfs) return [];
    return filteredStops;
  }, [filteredStops, isAllGtfs]);

  const {
    trafficSamples = [],
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
  } = useRouteLines(
    routingInputStops,
    TOMTOM_API_KEY,
    sourceMode,
    sourceRouteMap,
    gtfsDerived.shapePoints,
    selectedRouteMeta
  );

  const isLoading =
    sourceMode === "gtfs" ? gtfsLoading : loadingMapData;

  return (
    <Layout>
      <div className="dashboard-container">
        <div className="page-header">
          <h1>Route Management</h1>
          <p>View routes, route lines, stops, and traffic overlay on the map</p>
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

        <div className="grid">
          <RouteSummaryPanel
            routes={activeRoutes}
            sourceStops={sourceStops}
            sourceTrips={sourceTrips}
            sourceVehicles={sourceVehicles}
          />

          <RoutingStatusPanel
            routes={routePaths}
            error={routingError}
          />
        </div>

        {!isLoading ? (
          <div className="card">
            {isAllGtfs ? (
              <div style={{ marginBottom: "1rem", color: "#cbd5e1" }}>
                Select a specific route to display stop markers and route lines.
              </div>
            ) : null}

            <DashboardMap
              stops={isAllGtfs ? [] : filteredStops}
              vehicles={filteredVehicles}
              routePaths={isAllGtfs ? [] : routePaths}
              trafficSamples={showTrafficOverlay ? trafficSamples : []}
              showTrafficFlow={showTrafficOverlay}
              tomtomApiKey={TOMTOM_API_KEY}
              showStops={!isAllGtfs}
              showRoutes={!isAllGtfs}
            />
          </div>
        ) : (
          <div className="card">Loading route data...</div>
        )}
      </div>
    </Layout>
  );
}