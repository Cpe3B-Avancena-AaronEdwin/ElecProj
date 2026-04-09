import SummaryRow from "./SummaryRow";

const panelStyle = {
  background: "#111827",
  border: "1px solid #1f2937",
  borderRadius: "16px",
  padding: "1rem",
};

export default function PredictionStatusPanel({
  prediction,
  error = "",
  message = "",
}) {
  return (
    <div style={panelStyle}>
      <h3 style={{ marginTop: 0, color: "#fff" }}>Prediction Status</h3>
      <SummaryRow
        label="Predicted Congestion"
        value={prediction?.predictedCongestion || "Low"}
      />
      <SummaryRow
        label="Predicted Delay Risk"
        value={prediction?.predictedDelayRisk || "Low"}
      />
      <SummaryRow
        label="Traffic Samples"
        value={prediction?.basedOnTrafficSamples ?? 0}
      />
      <SummaryRow
        label="Avg Delay Basis"
        value={`${prediction?.basedOnAvgDelay ?? 0} mins`}
      />

      <div
        style={{
          marginTop: "0.9rem",
          color: error ? "#fca5a5" : "#cbd5e1",
        }}
      >
        {error || message || "Prediction system is running."}
      </div>
    </div>
  );
}