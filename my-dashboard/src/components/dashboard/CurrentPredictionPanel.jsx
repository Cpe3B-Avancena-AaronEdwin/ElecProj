import SummaryRow from "./SummaryRow";

const panelStyle = {
  background: "var(--bg-card)",
  border: "1px solid var(--border)",
  borderRadius: "16px",
  padding: "1rem",
};

const badgeStyle = (level) => ({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minWidth: "88px",
  padding: "0.3rem 0.65rem",
  borderRadius: "999px",
  fontWeight: 700,
  fontSize: "0.8rem",
  background:
    level === "High"
      ? "rgba(239, 68, 68, 0.16)"
      : level === "Medium"
      ? "rgba(245, 158, 11, 0.16)"
      : "rgba(34, 197, 94, 0.16)",
  color:
    level === "High"
      ? "#fca5a5"
      : level === "Medium"
      ? "#fcd34d"
      : "#86efac",
  border: "1px solid rgba(255,255,255,0.08)",
});

export default function CurrentPredictionPanel({ prediction }) {
  const reasons = prediction?.reason?.length
    ? prediction.reason
    : ["Normal operating conditions"];

  return (
    <div style={panelStyle}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: "1rem",
          alignItems: "center",
        }}
      >
        <h3
          style={{
            marginTop: 0,
            marginBottom: "0.9rem",
            color: "var(--text-on-dark)",
          }}
        >
          Smart Prediction
        </h3>
        <span style={badgeStyle(prediction?.predictedDelayRisk || "Low")}>
          {prediction?.predictedDelayRisk || "Low"}
        </span>
      </div>

      <SummaryRow
        label="Route"
        value={`${prediction?.routeCode || "ALL"} - ${prediction?.routeName || "All Routes"}`}
      />
      <SummaryRow label="Predicted Congestion" value={prediction?.predictedCongestion || "Low"} />
      <SummaryRow label="Delay Risk" value={prediction?.predictedDelayRisk || "Low"} />
      <SummaryRow label="Confidence" value={`${prediction?.confidence ?? 0}%`} />
      <SummaryRow label="Trend" value={prediction?.trend || "Stable"} />
      <SummaryRow label="ETA Impact" value={`+${prediction?.etaImpactMinutes ?? 0} mins`} />
      <SummaryRow label="Prediction Score" value={prediction?.score ?? 0} />
      <SummaryRow label="24h Snapshots" value={prediction?.historicalSnapshotCount24h ?? 0} />
      <SummaryRow label="7d Snapshots" value={prediction?.historicalSnapshotCount7d ?? 0} />
      <SummaryRow
        label="24h Avg Score"
        value={`${prediction?.historicalAverageScore24h ?? 0}/100`}
      />
      <SummaryRow
        label="7d Avg Score"
        value={`${prediction?.historicalAverageScore7d ?? 0}/100`}
      />
      <SummaryRow
        label="Peak Window"
        value={prediction?.predictedPeakWindow || "Building history"}
      />

      <div style={{ marginTop: "0.95rem", color: "var(--text-sub)" }}>
        <strong style={{ color: "var(--text-on-dark)" }}>Why this happened:</strong>
        <ul
          style={{
            marginTop: "0.55rem",
            paddingLeft: "1.15rem",
            marginBottom: "0.9rem",
          }}
        >
          {reasons.map((item, index) => (
            <li key={index} style={{ marginBottom: "0.35rem" }}>
              {item}
            </li>
          ))}
        </ul>
      </div>

      <div
        style={{
          marginTop: "0.8rem",
          padding: "0.8rem",
          borderRadius: "12px",
          background: "rgba(56, 189, 248, 0.08)",
          border: "1px solid rgba(56, 189, 248, 0.16)",
          color: "var(--text-sub)",
        }}
      >
        <div
          style={{
            color: "var(--text-on-dark)",
            fontWeight: 700,
            marginBottom: "0.35rem",
          }}
        >
          Recommended action
        </div>
        <div>
          {prediction?.recommendation ||
            "Maintain current dispatch plan and continue monitoring."}
        </div>
      </div>
    </div>
  );
}