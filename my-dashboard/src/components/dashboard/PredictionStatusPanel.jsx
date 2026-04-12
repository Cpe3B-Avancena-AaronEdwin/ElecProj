import SummaryRow from "./SummaryRow";

const panelStyle = {
  background: "var(--bg-card)",
  border: "1px solid var(--border)",
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
      <h3 style={{ marginTop: 0, color: "var(--text-on-dark)" }}>
        Prediction Status
      </h3>

      <SummaryRow label="Predicted Congestion" value={prediction?.predictedCongestion || "Low"} />
      <SummaryRow label="Predicted Delay Risk" value={prediction?.predictedDelayRisk || "Low"} />
      <SummaryRow label="Confidence" value={`${prediction?.confidence ?? 0}%`} />
      <SummaryRow label="Trend" value={prediction?.trend || "Stable"} />
      <SummaryRow label="ETA Impact" value={`+${prediction?.etaImpactMinutes ?? 0} mins`} />
      <SummaryRow label="Traffic Samples" value={prediction?.basedOnTrafficSamples ?? 0} />
      <SummaryRow label="24h Snapshots" value={prediction?.historicalSnapshotCount24h ?? 0} />
      <SummaryRow label="7d Snapshots" value={prediction?.historicalSnapshotCount7d ?? 0} />
      <SummaryRow
        label="24h Avg Congestion"
        value={`${prediction?.historicalAverageScore24h ?? 0}/100`}
      />
      <SummaryRow
        label="7d Avg Congestion"
        value={`${prediction?.historicalAverageScore7d ?? 0}/100`}
      />
      <SummaryRow
        label="Predicted Peak Window"
        value={prediction?.predictedPeakWindow || "Building history"}
      />
      <SummaryRow label="Avg Delay Basis" value={`${prediction?.basedOnAvgDelay ?? 0} mins`} />

      <div
        style={{
          marginTop: "0.9rem",
          color: error ? "#fca5a5" : "var(--text-sub)",
        }}
      >
        {error || message || prediction?.congestionForecast || "Prediction system is running."}
      </div>
    </div>
  );
}