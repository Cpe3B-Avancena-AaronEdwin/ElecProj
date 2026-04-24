import { useAuth } from "../context/AuthContext";
import { useGtfsBundle } from "../hooks/useGtfsBundle";

import Layout from "../components/Layout";
import TripPlannerPanel from "../components/dashboard/TripPlannerPanel";

export default function TripPlanner() {
  useAuth();

  const { gtfsBundle } = useGtfsBundle();

  return (
    <Layout>
      <div className="dashboard-container trip-planner-page">
        <section className="trip-planner-intro">
          <h1>Trip Planner</h1>
          <p>
            Plan routes across the transit network by selecting your origin and
            destination. The system analyzes available routes and suggests optimal
            travel paths based on GTFS data.
          </p>
        </section>

        <section className="trip-planner-shell">
          <TripPlannerPanel gtfsBundle={gtfsBundle} onPlanSelected={() => {}} />
        </section>
      </div>
    </Layout>
  );
}