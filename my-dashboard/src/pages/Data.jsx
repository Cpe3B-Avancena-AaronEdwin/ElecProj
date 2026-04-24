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

const unifiedCardStyle = {
  background: "rgba(8, 30, 50, 0.65)",
  border: "1px solid rgba(34, 211, 238, 0.18)",
  borderRadius: "20px",
  padding: "1.25rem",
  backdropFilter: "blur(10px)",
  WebkitBackdropFilter: "blur(10px)",
  boxShadow: "0 8px 24px rgba(0, 0, 0, 0.2)",
};

const introCardStyle = {
  ...unifiedCardStyle,
  borderRadius: "22px",
  padding: "1.5rem",
};

const softCardStyle = {
  ...unifiedCardStyle,
};

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

export default function Data() {
  useAuth();

  const TOMTOM_API_KEY = (import.meta.env.VITE_TOMTOM_API_KEY || "").trim();

  const [selectedRouteId, setSelectedRouteId] = useState("all");
  const [sourceMode, setSourceMode] = useState("mysql");
  const [showTrafficOverlay, setShowTrafficOverlay] = useState(true);

  const { routes = [], stops = [], trips = [], vehicles = [] } =
    useFirestoreTransitData();

  const { gtfsBundle, gtfsLoading, gtfsError } = useGtfsBundle();

  const hasAdminData =
    routes.length > 0 ||
    stops.length > 0 ||
    trips.length > 0 ||
    vehicles.length > 0;

  const actualSourceMode =
    sourceMode === "mysql" && hasAdminData ? "mysql" : "gtfs";

  const sourceRoutes =
    actualSourceMode === "mysql" ? routes : gtfsBundle?.routes || [];

  const sourceStops =
    actualSourceMode === "mysql" ? stops : gtfsBundle?.stops || [];

  const sourceTrips =
    actualSourceMode === "mysql" ? trips : gtfsBundle?.trips || [];

  const sourceVehicles = actualSourceMode === "mysql" ? vehicles : [];

  const sourceRouteMap = useMemo(() => {
    return (sourceRoutes || []).reduce((acc, route) => {
      const routeId = route.id || route.route_id;
      if (!routeId) return acc;

      acc[routeId] = {
        ...route,
        routeCode: route.routeCode || route.route_short_name || "N/A",
        routeName:
          route.routeName ||
          route.route_long_name ||
          route.route_desc ||
          "Unnamed Route",
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

  const selectedTrafficRouteId =
    selectedRouteId === "all" ? "" : selectedRouteId;

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
            This page gives you a structured view of transit records and
            operational summaries. It is designed for quick review of route
            coverage, stop counts, trip records, route line generation status,
            and route-specific traffic monitoring without opening the live map.
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
              gap: "1.25rem",
              alignItems: "stretch",
              marginTop: "1.2rem",
            }}
          >
            <div style={miniInfoCardStyle}>
              <div
                style={{
                  color: "#e6fcff",
                  fontWeight: 700,
                  marginBottom: "0.35rem",
                }}
              >
                What this page contains
              </div>

              <div
                style={{
                  color: "rgba(230, 252, 255, 0.72)",
                  lineHeight: 1.6,
                }}
              >
                Route summaries, route-specific traffic summaries, route line
                generation status, and operational cards based on the selected
                data source and route filter.
              </div>
            </div>

            <div style={miniInfoCardStyle}>
              <div
                style={{
                  color: "#e6fcff",
                  fontWeight: 700,
                  marginBottom: "0.35rem",
                }}
              >
                How to use it
              </div>

              <div
                style={{
                  color: "rgba(230, 252, 255, 0.72)",
                  lineHeight: 1.6,
                }}
              >
                Select a specific route to view congestion and prediction data
                for that route, then refresh traffic or route line data.
              </div>
            </div>

            <div style={miniInfoCardStyle}>
              <div
                style={{
                  color: "#e6fcff",
                  fontWeight: 700,
                  marginBottom: "0.35rem",
                }}
              >
                Why this page matters
              </div>

              <div
                style={{
                  color: "rgba(230, 252, 255, 0.72)",
                  lineHeight: 1.6,
                }}
              >
                It provides a cleaner analytics-focused view for admins and
                reviewers, making the data easier to scan, compare, and explain.
              </div>
            </div>
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
              gtfsStatus: gtfsLoading
                ? "Loading"
                : gtfsError
                ? "Error"
                : "Ready",
              trafficUpdated: lastTrafficUpdated || "—",
              routesUpdated: lastRoutingUpdated || "—",
            }}
          />
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
              {hasAdminData
                ? "Using MySQL admin dataset when selected."
                : "Using GTFS data fallback."}
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
            <RoutingStatusPanel routes={routePaths} error={routingError} />
          </div>
        </div>
      </div>
    </Layout>
  );
}