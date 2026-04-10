import { useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";

import { useFirestoreTransitData } from "../hooks/useFirestoreTransitData";
import { useGtfsBundle } from "../hooks/useGtfsBundle";
import { useTrafficData } from "../hooks/useTrafficData";
import { useDashboardMetrics } from "../hooks/useDashboardMetrics";

import TripStatusSummaryPanel from "../components/dashboard/TripStatusSummaryPanel";
import DelayInsightPanel from "../components/dashboard/DelayInsightPanel";
import RecentPredictionsPanel from "../components/dashboard/RecentPredictionsPanel";
import TrafficSummaryPanel from "../components/dashboard/TrafficSummaryPanel";

import Layout from "../components/Layout";

export default function Reports() {
  const { user } = useAuth();

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

  const hasFirestoreData =
    routes.length > 0 || stops.length > 0 || vehicles.length > 0 || trips.length > 0;

  const sourceMode = useFirestoreData && hasFirestoreData ? "firestore" : "gtfs";

  const sourceRoutes = sourceMode === "firestore" ? routes : gtfsBundle?.routes || [];
  const sourceStops = sourceMode === "firestore" ? stops : gtfsBundle?.stops || [];
  const sourceTrips = sourceMode === "firestore" ? trips : gtfsBundle?.trips || [];
  const sourceVehicles = sourceMode === "firestore" ? vehicles : [];

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
  } = useTrafficData(filteredStops, TOMTOM_API_KEY, sourceMode);

  const metrics = useDashboardMetrics({
    routes: sourceRoutes,
    stops: filteredStops,
    vehicles: filteredVehicles,
    trips: filteredTrips,
    trafficSummary,
  });

  return (
    <Layout>
      <div className="dashboard-container">

        <div className="page-header">
          <h1>Analytics & Reports</h1>
          <p>Performance metrics, delay analysis, and predictive insights</p>
        </div>

        {/* PERFORMANCE METRICS */}
        <div className="grid">
          <TripStatusSummaryPanel metrics={metrics} />
          <DelayInsightPanel metrics={metrics} />
          <TrafficSummaryPanel summary={trafficSummary} />
        </div>

        {/* PREDICTIVE ANALYTICS */}
        <div className="grid">
          <RecentPredictionsPanel predictions={predictions} />
        </div>

        {/* REPORT CONTROLS */}
        <div className="report-controls">
          <h3>Report Generation</h3>
          <div className="control-buttons">
            <button className="report-btn">
              📊 Generate Performance Report
            </button>
            <button className="report-btn">
              🚗 Export Route Analytics
            </button>
            <button className="report-btn">
              📈 Download Traffic Summary
            </button>
          </div>
        </div>

      </div>
    </Layout>
  );
}