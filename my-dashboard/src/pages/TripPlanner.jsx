import { useAuth } from "../context/AuthContext";
import { useGtfsBundle } from "../hooks/useGtfsBundle";

import Layout from "../components/Layout";
import TripPlannerPanel from "../components/dashboard/TripPlannerPanel";

export default function TripPlanner() {
  useAuth();

  const { gtfsBundle } = useGtfsBundle();

  return (
    <Layout>
      <div
        className="dashboard-container"
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "flex-start",
          width: "100%",
        }}
      >
        <div
          className="dashboard-panel-item"
          style={{
            width: "100%",
            maxWidth: "1200px", // 👈 controls how wide it gets
          }}
        >
          <TripPlannerPanel
            gtfsBundle={gtfsBundle}
            onPlanSelected={() => {}}
          />
        </div>
      </div>
    </Layout>
  );
}