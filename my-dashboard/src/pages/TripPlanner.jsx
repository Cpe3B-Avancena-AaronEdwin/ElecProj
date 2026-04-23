import { useAuth } from "../context/AuthContext";
import { useGtfsBundle } from "../hooks/useGtfsBundle";

import Layout from "../components/Layout";
import TripPlannerPanel from "../components/dashboard/TripPlannerPanel";

// ✅ SAME STYLE AS DATA PAGE
const pageWrapperStyle = {
  display: "flex",
  flexDirection: "column",
  gap: "1.75rem",
  width: "100%",
};

const contentWidthStyle = {
  width: "100%",
  maxWidth: "1200px",
  margin: "0 auto",
};

const introCardStyle = {
  background: "#071a2b",
  border: "1px solid rgba(34, 211, 238, 0.2)",
  borderRadius: "22px",
  padding: "1.5rem",
  boxShadow: "0 10px 30px rgba(0, 0, 0, 0.18)",
};

const mainCardStyle = {
  background: "rgba(8, 30, 50, 0.6)",
  border: "1px solid rgba(34, 211, 238, 0.18)",
  borderRadius: "22px",
  padding: "1.5rem",
  backdropFilter: "blur(10px)",
  WebkitBackdropFilter: "blur(10px)",
  boxShadow: "0 8px 24px rgba(0, 0, 0, 0.2)",
};

export default function TripPlanner() {
  useAuth();

  const { gtfsBundle } = useGtfsBundle();

  return (
    <Layout>
      <div className="dashboard-container" style={pageWrapperStyle}>
        {/* 🔹 INTRO CARD */}
        <div style={contentWidthStyle}>
          <div style={introCardStyle}>
            <div
              style={{
                fontSize: "1.9rem",
                fontWeight: 800,
                color: "#e6fcff",
                marginBottom: "0.45rem",
              }}
            >
              Trip Planner
            </div>

            <div
              style={{
                color: "rgba(230, 252, 255, 0.75)",
                fontSize: "1rem",
                lineHeight: 1.7,
                maxWidth: "900px",
              }}
            >
              Plan routes across the transit network by selecting your origin and
              destination. The system analyzes available routes and suggests optimal
              travel paths based on GTFS data.
            </div>
          </div>
        </div>

        {/* 🔹 MAIN CONTENT CARD */}
        <div style={contentWidthStyle}>
          <div style={mainCardStyle}>
            <TripPlannerPanel
              gtfsBundle={gtfsBundle}
              onPlanSelected={() => {}}
            />
          </div>
        </div>
      </div>
    </Layout>
  );
}