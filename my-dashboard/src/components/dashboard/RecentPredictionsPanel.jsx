import { formatTimestamp } from "../../utils/dashboardFormatters";

const panelStyle = {
  background: "#111827",
  border: "1px solid #1f2937",
  borderRadius: "16px",
  padding: "1rem",
};

export default function RecentPredictionsPanel({ predictions = [] }) {
  return (
    <div style={panelStyle}>
      <h3 style={{ marginTop: 0, color: "#fff" }}>Recent Predictions</h3>
      {predictions.length === 0 ? (
        <p style={{ margin: 0, color: "#cbd5e1" }}>No predictions saved yet.</p>
      ) : (
        predictions.slice(0, 5).map((item) => (
          <div
            key={item.id}
            style={{ padding: "0.75rem 0", borderBottom: "1px solid #1f2937" }}
          >
            <div style={{ fontWeight: "bold", color: "#fff" }}>
              {item.routeCode || "N/A"} - {item.routeName || "Unnamed Route"}
            </div>
            <div style={{ color: "#cbd5e1", marginTop: "0.25rem" }}>
              Predicted Congestion: {item.predictedCongestion || "-"}
            </div>
            <div style={{ color: "#cbd5e1", marginTop: "0.25rem" }}>
              Predicted Delay Risk: {item.predictedDelayRisk || "-"}
            </div>
            <div style={{ color: "#cbd5e1", marginTop: "0.25rem" }}>
              Avg Delay Basis: {item.basedOnAvgDelay ?? "-"} mins
            </div>
            <div style={{ color: "#cbd5e1", marginTop: "0.25rem" }}>
              Traffic Samples: {item.basedOnTrafficSamples ?? "-"}
            </div>
            <div style={{ color: "#cbd5e1", marginTop: "0.25rem" }}>
              Generated: {formatTimestamp(item.generatedAt, item.generatedAtText)}
            </div>
          </div>
        ))
      )}
    </div>
  );
}