import SummaryRow from "./SummaryRow";

const panelStyle = {
  background: "#111827",
  border: "1px solid #1f2937",
  borderRadius: "16px",
  padding: "1rem",
};

export default function DelayInsightPanel({ metrics }) {
  return (
    <div style={panelStyle}>
      <h3 style={{ marginTop: 0, color: "#fff" }}>Delay Insight</h3>

      {metrics.mostDelayedRoute ? (
        <>
          <SummaryRow
            label="Most Delayed Route"
            value={`${metrics.mostDelayedRoute.routeCode} - ${metrics.mostDelayedRoute.routeName}`}
          />
          <SummaryRow
            label="Avg Delay"
            value={`${metrics.mostDelayedRoute.averageDelay} mins`}
          />
        </>
      ) : (
        <p style={{ margin: 0, color: "#cbd5e1" }}>No route delay data yet.</p>
      )}

      <SummaryRow label="Average Trip Delay" value={`${metrics.avgTripDelay} mins`} />
      <SummaryRow label="On-Time Rate" value={`${metrics.onTimeRate}%`} />
    </div>
  );
}