import SummaryRow from "./SummaryRow";

const panelStyle = {
  background: "var(--bg-card)",
  border: "1px solid var(--border)",
  borderRadius: "16px",
  padding: "1rem",
};

export default function CurrentPredictionPanel({ prediction }) {
  return (
    <div style={panelStyle}>
      <h3 style={{ marginTop: 0, color: "var(--text-on-dark)" }}>Current Prediction</h3>
      <SummaryRow
        label="Route"
        value={`${prediction?.routeCode || "ALL"} - ${prediction?.routeName || "All Routes"}`}
      />
      <SummaryRow
        label="Predicted Congestion"
        value={prediction?.predictedCongestion || "Low"}
      />
      <SummaryRow
        label="Predicted Delay Risk"
        value={prediction?.predictedDelayRisk || "Low"}
      />
      <SummaryRow label="Prediction Score" value={prediction?.score ?? 0} />

      <div style={{ marginTop: "0.9rem", color: "var(--text-sub)" }}>
        <strong style={{ color: "var(--text-on-dark)" }}>Reasons:</strong>
        <ul style={{ marginTop: "0.5rem", paddingLeft: "1.25rem" }}>
          {(prediction?.reason?.length
            ? prediction.reason
            : ["Normal operating conditions"]
          ).map((item, index) => (
            <li key={index} style={{ marginBottom: "0.35rem" }}>
              {item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}