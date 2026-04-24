import { useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useFirestoreTransitData } from "../hooks/useFirestoreTransitData";
import { useGtfsBundle } from "../hooks/useGtfsBundle";
import { useRouteLines } from "../hooks/useRouteLines";
import { useTrafficData } from "../hooks/useTrafficData";

import Layout from "../components/Layout";
import DashboardToolbar from "../components/dashboard/DashboardToolbar";
import TrafficSummaryPanel from "../components/dashboard/TrafficSummaryPanel";
import RouteSummaryPanel from "../components/dashboard/RouteSummaryPanel";
import RoutingStatusPanel from "../components/dashboard/RoutingStatusPanel";
import DashboardMap from "../components/dashboard/DashboardMap";

const unifiedCardStyle = {
  background: "rgba(8, 30, 50, 0.65)",
  border: "1px solid rgba(34, 211, 238, 0.18)",
  borderRadius: "20px",
  padding: "1.25rem",
  backdropFilter: "blur(10px)",
  WebkitBackdropFilter: "blur(10px)",
  boxShadow: "0 8px 24px rgba(0, 0, 0, 0.2)",
};

const introCardStyle = { ...unifiedCardStyle, borderRadius: "22px", padding: "1.5rem" };
const softCardStyle = { ...unifiedCardStyle };

const statCardStyle = {
  ...unifiedCardStyle,
  padding: "1.4rem",
  minHeight: "165px",
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
};

const miniInfoCardStyle = {
  background: "rgba(8, 30, 50, 0.65)",
  border: "1px solid rgba(34, 211, 238, 0.18)",
  borderRadius: "16px",
  padding: "1rem",
  backdropFilter: "blur(10px)",
  WebkitBackdropFilter: "blur(10px)",
  boxShadow: "0 8px 24px rgba(0, 0, 0, 0.2)",
};

const equalPanelWrapStyle = {
  ...unifiedCardStyle,
  height: "100%",
  display: "flex",
  flexDirection: "column",
};

function getRouteId(route) {
  return String(route?.id || route?.routeId || route?.route_id || "").trim();
}

function getStopRouteId(stop) {
  return String(stop?.routeId || stop?.route_id || "").trim();
}

function getStopLatLng(stop) {
  const lat = Number(stop?.stopLat ?? stop?.stop_lat ?? stop?.latitude ?? stop?.lat);
  const lng = Number(stop?.stopLon ?? stop?.stop_lon ?? stop?.longitude ?? stop?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return [lat, lng];
}

function getGtfsStopsForRoute(routeId, gtfsBundle) {
  if (!routeId || routeId === "all" || !gtfsBundle) return gtfsBundle?.stops || [];

  const routeTrips = (gtfsBundle.trips || []).filter(
    (trip) => String(trip.route_id || trip.routeId) === String(routeId)
  );

  if (!routeTrips.length) return [];

  let bestTrip = null;
  let bestStopTimes = [];

  for (const trip of routeTrips) {
    const tripId = trip.trip_id || trip.tripId || trip.id;
    const stopTimes = gtfsBundle.stopTimesByTripId?.[tripId] || [];

    if (stopTimes.length > bestStopTimes.length) {
      bestTrip = trip;
      bestStopTimes = stopTimes;
    }
  }

  if (!bestTrip || !bestStopTimes.length) return [];

  return bestStopTimes
    .slice()
    .sort((a, b) => Number(a.stop_sequence || 0) - Number(b.stop_sequence || 0))
    .map((stopTime) => gtfsBundle.stopsById?.[stopTime.stop_id || stopTime.stopId])
    .filter(Boolean);
}

function buildFallbackRoutePath(stops, selectedRouteMeta) {
  const path = (stops || []).map(getStopLatLng).filter(Boolean);

  if (path.length < 2) return [];

  return [
    {
      id: selectedRouteMeta?.id || selectedRouteMeta?.route_id || "selected-route",
      name:
        selectedRouteMeta?.routeName ||
        selectedRouteMeta?.route_long_name ||
        selectedRouteMeta?.routeCode ||
        "Selected Route",
      color: selectedRouteMeta?.routeColor || "#22d3ee",
      path,
    },
  ];
}

function normalizeMapRoutePaths(routePaths = []) {
  return (routePaths || [])
    .map((route, index) => {
      const rawPath =
        route.path ||
        route.points ||
        route.coordinates ||
        route.polyline ||
        route.latLngs ||
        [];

      const path = rawPath
        .map((point) => {
          if (Array.isArray(point)) return [Number(point[0]), Number(point[1])];

          return [
            Number(point.lat ?? point.latitude ?? point.stopLat ?? point.stop_lat),
            Number(point.lng ?? point.lon ?? point.longitude ?? point.stopLon ?? point.stop_lon),
          ];
        })
        .filter(
          (point) =>
            Array.isArray(point) &&
            point.length >= 2 &&
            Number.isFinite(point[0]) &&
            Number.isFinite(point[1])
        );

      return {
        ...route,
        id: route.id || route.routeId || route.route_id || `route-path-${index}`,
        name: route.name || route.routeName || route.route_name || "Route Line",
        color: route.color || route.routeColor || "#22d3ee",
        path,
      };
    })
    .filter((route) => route.path.length >= 2);
}

export default function Data() {
  useAuth();

  const TOMTOM_API_KEY = (import.meta.env.VITE_TOMTOM_API_KEY || "").trim();

  const [selectedRouteId, setSelectedRouteId] = useState("all");
  const [sourceMode, setSourceMode] = useState("mysql");
  const [showTrafficOverlay, setShowTrafficOverlay] = useState(true);

  const { routes = [], stops = [], trips = [], vehicles = [] } = useFirestoreTransitData();
  const { gtfsBundle, gtfsLoading, gtfsError } = useGtfsBundle();

  const hasAdminData =
    routes.length > 0 || stops.length > 0 || trips.length > 0 || vehicles.length > 0;

  const actualSourceMode = sourceMode === "mysql" && hasAdminData ? "mysql" : "gtfs";

  const sourceRoutes = actualSourceMode === "mysql" ? routes : gtfsBundle?.routes || [];
  const sourceStops = actualSourceMode === "mysql" ? stops : gtfsBundle?.stops || [];
  const sourceTrips = actualSourceMode === "mysql" ? trips : gtfsBundle?.trips || [];
  const sourceVehicles = actualSourceMode === "mysql" ? vehicles : [];

  const sourceRouteMap = useMemo(() => {
    return (sourceRoutes || []).reduce((acc, route) => {
      const routeId = getRouteId(route);
      if (!routeId) return acc;

      acc[routeId] = {
        ...route,
        routeCode: route.routeCode || route.route_short_name || "N/A",
        routeName:
          route.routeName ||
          route.route_long_name ||
          route.route_desc ||
          "Unnamed Route",
        routeColor: route.routeColor || route.route_color || "#22d3ee",
      };

      return acc;
    }, {});
  }, [sourceRoutes]);

  const selectedRouteMeta = useMemo(() => {
    if (selectedRouteId === "all") return null;
    return sourceRouteMap[selectedRouteId] || null;
  }, [selectedRouteId, sourceRouteMap]);

  const filteredStops = useMemo(() => {
    if (selectedRouteId === "all") return sourceStops;

    if (actualSourceMode === "gtfs") {
      return getGtfsStopsForRoute(selectedRouteId, gtfsBundle);
    }

    return (sourceStops || []).filter(
      (stop) => getStopRouteId(stop) === String(selectedRouteId)
    );
  }, [selectedRouteId, sourceStops, actualSourceMode, gtfsBundle]);

  const selectedTrafficRouteId = selectedRouteId === "all" ? "" : selectedRouteId;

  const {
    routePaths,
    routingLoading,
    routingError,
    lastRoutingUpdated,
    refreshRouteLines,
  } = useRouteLines(
    filteredStops,
    TOMTOM_API_KEY,
    actualSourceMode,
    sourceRouteMap,
    [],
    selectedRouteMeta,
    {
      cacheKey: `data-page:${actualSourceMode}:${selectedRouteId}`,
    }
  );

  const {
    trafficSamples = [],
    trafficSummary = {},
    trafficLoading,
    trafficError,
    lastTrafficUpdated,
    refreshTraffic,
  } = useTrafficData(filteredStops, TOMTOM_API_KEY, {
    enabled: true,
    liveTraffic: true,
    history: true,
    routeId: selectedTrafficRouteId,
    cacheKey: `data-page:${actualSourceMode}:${selectedRouteId}`,
    maxSamplePoints: 20,
  });

  const normalizedRoutePaths = useMemo(() => {
    const generated = normalizeMapRoutePaths(routePaths);

    if (generated.length > 0) return generated;

    if (selectedRouteId !== "all") {
      return buildFallbackRoutePath(filteredStops, selectedRouteMeta);
    }

    return [];
  }, [routePaths, selectedRouteId, filteredStops, selectedRouteMeta]);

  const mapStops = selectedRouteId === "all" ? sourceStops : filteredStops;

  const mapTitle =
    selectedRouteId === "all"
      ? "Network Route Map"
      : `${selectedRouteMeta?.routeCode || "Selected Route"} - ${
          selectedRouteMeta?.routeName || "Route Map"
        }`;

  const formattedTrafficUpdate = lastTrafficUpdated
    ? new Date(lastTrafficUpdated).toLocaleString()
    : "No recent update";

  return (
    <Layout>
      <div
        className="dashboard-container"
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "1.75rem",
        }}
      >
        <div style={introCardStyle}>
          <div
            style={{
              fontSize: "1.9rem",
              fontWeight: 800,
              color: "#e6fcff",
              marginBottom: "0.45rem",
            }}
          >
            Data Overview
          </div>

          <div
            style={{
              color: "rgba(230, 252, 255, 0.75)",
              fontSize: "1rem",
              lineHeight: 1.7,
              maxWidth: "960px",
            }}
          >
            This page gives you a structured view of transit records and operational
            summaries. Select a route to show its stops and route line directly on the map.
          </div>
        </div>

        <div style={softCardStyle}>
          <DashboardToolbar
            routes={sourceRoutes}
            selectedRouteId={selectedRouteId}
            onChangeRoute={setSelectedRouteId}
            sourceMode={actualSourceMode}
            onChangeSourceMode={setSourceMode}
            showTrafficOverlay={showTrafficOverlay}
            onChangeTrafficOverlay={setShowTrafficOverlay}
            hasAdminData={hasAdminData}
            trafficLoading={trafficLoading}
            routingLoading={routingLoading}
            onRefreshTraffic={() => refreshTraffic(false)}
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
        </div>

        <div style={softCardStyle}>
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
            <div>
              <div
                style={{
                  color: "#e6fcff",
                  fontSize: "1.45rem",
                  fontWeight: 800,
                }}
              >
                {mapTitle}
              </div>

              <div
                style={{
                  color: "rgba(230, 252, 255, 0.72)",
                  marginTop: "0.3rem",
                  lineHeight: 1.5,
                }}
              >
                {selectedRouteId === "all"
                  ? "Showing the full transit network. Select a route above to isolate one route."
                  : `Showing ${filteredStops.length} stops and ${normalizedRoutePaths.length} route line${
                      normalizedRoutePaths.length === 1 ? "" : "s"
                    } for the selected route.`}
              </div>
            </div>

            <div
              style={{
                color: showTrafficOverlay ? "#22d3ee" : "rgba(230,252,255,0.65)",
                fontWeight: 800,
              }}
            >
              Traffic Overlay: {showTrafficOverlay ? "Shown" : "Hidden"}
            </div>
          </div>

          <div
            style={{
              position: "relative",
              width: "100%",
              height: "460px",
              borderRadius: "18px",
              overflow: "hidden",
              border: "1px solid rgba(34, 211, 238, 0.18)",
              background: "#031525",
            }}
          >
            <DashboardMap
              stops={mapStops}
              vehicles={sourceVehicles}
              routePaths={normalizedRoutePaths}
              trafficSamples={showTrafficOverlay ? trafficSamples : []}
              showTrafficFlow={showTrafficOverlay}
              tomtomApiKey={TOMTOM_API_KEY}
              showStops={true}
              showRoutes={true}
            />
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: "1.25rem",
            alignItems: "stretch",
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
              Data Mode
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
              {actualSourceMode.toUpperCase()}
            </div>

            <div
              style={{
                color: "rgba(230, 252, 255, 0.75)",
                fontSize: "1rem",
              }}
            >
              {hasAdminData ? "Using MySQL admin dataset when selected." : "Using GTFS data fallback."}
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
              Latest Traffic Update
            </div>

            <div
              style={{
                color: "#ffffff",
                fontSize: "1.6rem",
                fontWeight: 800,
                lineHeight: 1.2,
                marginBottom: "0.75rem",
              }}
            >
              {formattedTrafficUpdate}
            </div>

            <div
              style={{
                color: "rgba(230, 252, 255, 0.75)",
                fontSize: "1rem",
              }}
            >
              {trafficError ||
                (selectedTrafficRouteId
                  ? "Traffic status is filtered for the selected route."
                  : "Traffic status is loaded for the full network.")}
            </div>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: "1.25rem",
            alignItems: "stretch",
          }}
        >
          <div style={equalPanelWrapStyle}>
            <RouteSummaryPanel
              routes={sourceRoutes}
              sourceStops={sourceStops}
              sourceTrips={sourceTrips}
              sourceVehicles={sourceVehicles}
            />
          </div>

          <div style={equalPanelWrapStyle}>
            <TrafficSummaryPanel summary={trafficSummary} />
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr",
            gap: "1.25rem",
          }}
        >
          <div style={equalPanelWrapStyle}>
            <RoutingStatusPanel routes={normalizedRoutePaths} error={routingError} />
          </div>
        </div>
      </div>
    </Layout>
  );
}