import { useMemo, useState } from "react";
import Layout from "../components/Layout";

import { useGtfsBundle } from "../hooks/useGtfsBundle";
import { useTrafficData } from "../hooks/useTrafficData";
import { useRouteLines } from "../hooks/useRouteLines";
import { useFirestoreTransitData } from "../hooks/useFirestoreTransitData";

import DashboardMap from "../components/dashboard/DashboardMap";
import TripPlannerPanel from "../components/dashboard/TripPlannerPanel";
import TrafficSummaryPanel from "../components/dashboard/TrafficSummaryPanel";
import TrafficStatusPanel from "../components/dashboard/TrafficStatusPanel";

export default function Traffic() {
  const TOMTOM_API_KEY = (import.meta.env.VITE_TOMTOM_API_KEY || "").trim();

  const [selectedPlan, setSelectedPlan] = useState(null);

  const { gtfsBundle, gtfsLoading, gtfsError } = useGtfsBundle();

  const gtfsStops = gtfsBundle?.stops || [];
  const gtfsRoutes = gtfsBundle?.routes || [];

  const gtfsRouteMap = useMemo(() => {
    return gtfsRoutes.reduce((acc, route) => {
      const key = route.id || route.routeId || route.route_id;
      if (key) acc[key] = route;
      return acc;
    }, {});
  }, [gtfsRoutes]);

  const { vehicles = [] } = useFirestoreTransitData({
    routes: false,
    stops: false,
    vehicles: true,
    trips: false,
    predictions: false,
    realtimeVehicles: false,
    cacheMs: 5 * 60 * 1000,
  });

  const {
    trafficSamples = [],
    trafficSummary = {},
    trafficLoading,
    trafficError,
    lastTrafficUpdated,
  } = useTrafficData(gtfsStops, TOMTOM_API_KEY, {
    enabled: true,
    liveTraffic: true,
    history: true,
    cacheKey: "traffic-page-network",
    maxSamplePoints: 15,
  });

  const { routePaths = [] } = useRouteLines(
    gtfsStops,
    TOMTOM_API_KEY,
    "gtfs",
    gtfsRouteMap,
    [],
    null,
    {}
  ) || {};

  const plannerMapData = useMemo(() => {
    if (!selectedPlan) return null;

    const markers = [];
    const polylines = [];
    const fitBoundsPoints = [];

    if (selectedPlan.fromStop) {
      markers.push({
        id: "planner-start",
        kind: "start",
        stop: selectedPlan.fromStop,
        name: selectedPlan.fromStopName,
        label: "Start",
      });
    }

    (selectedPlan.transferStops || []).forEach((stop, index) => {
      markers.push({
        id: `planner-transfer-${index}`,
        kind: "transfer",
        stop,
        name: selectedPlan.transferStopNames?.[index] || "Transfer",
        label: `Transfer ${index + 1}`,
      });
    });

    if (selectedPlan.toStop) {
      markers.push({
        id: "planner-end",
        kind: "end",
        stop: selectedPlan.toStop,
        name: selectedPlan.toStopName,
        label: "Destination",
      });
    }

    (selectedPlan.legs || []).forEach((leg, index) => {
      const colorPalette = ["#22c55e", "#f59e0b", "#ef4444", "#8b5cf6"];
      const color = colorPalette[index % colorPalette.length];
      const path = (leg.pathPoints || []).filter(
        (p) => Array.isArray(p) && p.length >= 2 && !Number.isNaN(p[0]) && !Number.isNaN(p[1])
      );

      if (path.length >= 2) {
        polylines.push({
          id: `planner-leg-${index}`,
          color,
          weight: 7,
          opacity: 1,
          routeLabel: leg.routeLabel,
          directionLabel: leg.directionLabel,
          path,
          fromStopName: leg.fromStopName,
          toStopName: leg.toStopName,
          stopCount: leg.stopCount,
        });
        fitBoundsPoints.push(...path);
      }
    });

    markers.forEach((marker) => {
      const lat = parseFloat(marker.stop?.stopLat ?? marker.stop?.stop_lat);
      const lng = parseFloat(marker.stop?.stopLon ?? marker.stop?.stop_lon);
      if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
        fitBoundsPoints.push([lat, lng]);
      }
    });

    return {
      markers,
      polylines,
      fitBoundsPoints,
    };
  }, [selectedPlan]);

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

  return (
    <Layout>
      <div className="dashboard-container">
        <TripPlannerPanel gtfsBundle={gtfsBundle} onPlanSelected={setSelectedPlan} />

        <DashboardMap
          stops={[]}
          vehicles={vehicles}
          routePaths={routePaths}
          trafficSamples={trafficSamples}
          showTrafficFlow={true}
          tomtomApiKey={TOMTOM_API_KEY}
          showStops={false}
          showRoutes={true}
          plannerMapData={plannerMapData}
        />

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
              Traffic Last Updated
            </div>
            <div
              style={{
                fontSize: "1.2rem",
                fontWeight: 800,
                color: "var(--text-on-dark)",
              }}
            >
              {formatUpdatedAt(lastTrafficUpdated)}
            </div>
          </div>

          <div className="card" style={{ padding: "1rem" }}>
            <div style={{ color: "var(--text-sub)", marginBottom: "0.5rem" }}>
              GTFS Loading
            </div>
            <div
              style={{
                fontSize: "1.2rem",
                fontWeight: 800,
                color: "var(--text-on-dark)",
              }}
            >
              {gtfsLoading ? "Loading..." : "Ready"}
            </div>
            <div style={{ color: "var(--text-sub)", marginTop: "0.35rem" }}>
              {gtfsError || `${gtfsStops.length} stops loaded`}
            </div>
          </div>
        </div>

        <div className="grid">
          <TrafficSummaryPanel summary={trafficSummary} />
          <TrafficStatusPanel
            loading={trafficLoading}
            error={trafficError}
            sourceMode="gtfs"
            showTrafficOverlay={true}
            samplePoints={trafficSamples.length}
            apiConfigured={!!TOMTOM_API_KEY}
          />
        </div>
      </div>
    </Layout>
  );
}