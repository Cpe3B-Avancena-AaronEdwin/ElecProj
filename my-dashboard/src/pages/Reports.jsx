import { useMemo } from "react";
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
  useAuth();

  const TOMTOM_API_KEY = (import.meta.env.VITE_TOMTOM_API_KEY || "").trim();

const { vehicles = [], predictions = [] } = useFirestoreTransitData({
  routes: false,
  stops: false,
  vehicles: true,
  trips: false,
  predictions: true,
  realtimeVehicles: false,
  realtimePredictions: false,
  predictionsLimit: 10,
  cacheMs: 5 * 60 * 1000,
});

  const { gtfsBundle, gtfsLoading, gtfsError } = useGtfsBundle();

  const gtfsRoutes = gtfsBundle?.routes || [];
  const gtfsStops = gtfsBundle?.stops || [];
  const gtfsTrips = gtfsBundle?.trips || [];

  const metrics = useDashboardMetrics({
    routes: gtfsRoutes,
    stops: gtfsStops,
    vehicles: vehicles || [],
    trips: gtfsTrips,
  });

  const { trafficSummary } = useTrafficData([], TOMTOM_API_KEY, {
    enabled: true,
    liveTraffic: false,
    history: true,
    cacheKey: "reports-history-only",
  });

  const reportStatus = useMemo(() => {
    if (gtfsLoading) return "Loading GTFS analytics...";
    if (gtfsError) return `GTFS error: ${gtfsError}`;
    if (!gtfsRoutes.length && !gtfsStops.length && !gtfsTrips.length) {
      return "No GTFS analytics data loaded.";
    }
    return `Using GTFS analytics source • Routes: ${gtfsRoutes.length} • Stops: ${gtfsStops.length} • Trips: ${gtfsTrips.length}`;
  }, [gtfsLoading, gtfsError, gtfsRoutes.length, gtfsStops.length, gtfsTrips.length]);

  return (
    <Layout>
      <div className="dashboard-container">
        <div className="page-header">
          <h1>Analytics & Reports</h1>
          <p>Performance metrics, delay analysis, and predictive insights</p>
        </div>

        <div
          className="card"
          style={{
            marginBottom: "1rem",
            padding: "1rem",
            color: "var(--text-sub)",
          }}
        >
          {reportStatus}
        </div>

        <div className="grid">
          <TripStatusSummaryPanel metrics={metrics} />
          <DelayInsightPanel metrics={metrics} />
          <TrafficSummaryPanel summary={trafficSummary} />
        </div>

        <div className="grid">
          <RecentPredictionsPanel predictions={predictions} />
        </div>

        <div className="report-controls">
          <h3>Report Generation</h3>
          <div className="control-buttons">
            <button className="report-btn">📊 Generate Performance Report</button>
            <button className="report-btn">🚗 Export Route Analytics</button>
            <button className="report-btn">📈 Download Traffic Summary</button>
          </div>
        </div>
      </div>
    </Layout>
  );
}