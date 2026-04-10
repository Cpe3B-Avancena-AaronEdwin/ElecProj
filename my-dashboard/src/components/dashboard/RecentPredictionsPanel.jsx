import { formatTimestamp } from "../../utils/dashboardFormatters";

const panelStyle = {
  background: "var(--bg-card)",
  border: "1px solid var(--border)",
  borderRadius: "16px",
  padding: "1rem",
};

export default function RecentPredictionsPanel({ predictions = [] }) {
  return (
    <div style={panelStyle}>
      <h3 style={{ marginTop: 0, color: "var(--text-on-dark)" }}>Recent Predictions</h3>
      {predictions.length === 0 ? (
        <p style={{ margin: 0, color: "var(--text-sub)" }}>No predictions saved yet.</p>
      ) : (
        predictions.slice(0, 5).map((item) => (
          <div
            key={item.id}
            style={{ padding: "0.75rem 0", borderBottom: "1px solid var(--border)" }}
          >
            <div style={{ fontWeight: "bold", color: "var(--text-on-dark)" }}>
              {item.routeCode || "N/A"} - {item.routeName || "Unnamed Route"}
            </div>
            <div style={{ color: "var(--text-sub)", marginTop: "0.25rem" }}>
              Predicted Congestion: {item.predictedCongestion || "-"}
            </div>
            <div style={{ color: "var(--text-sub)", marginTop: "0.25rem" }}>
              Predicted Delay Risk: {item.predictedDelayRisk || "-"}
            </div>
            <div style={{ color: "var(--text-sub)", marginTop: "0.25rem" }}>
              Avg Delay Basis: {item.basedOnAvgDelay ?? "-"} mins
            </div>
            <div style={{ color: "var(--text-sub)", marginTop: "0.25rem" }}>
              Traffic Samples: {item.basedOnTrafficSamples ?? "-"}
            </div>
            <div style={{ color: "var(--text-sub)", marginTop: "0.25rem" }}>
              Generated: {formatTimestamp(item.generatedAt, item.generatedAtText)}
            </div>
          </div>
        ))
      )}
    </div>
  );
}