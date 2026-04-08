import SummaryRow from "./SummaryRow";

const panelStyle = {
  background: "var(--bg-card)",
  border: "1px solid var(--border)",
  borderRadius: "16px",
  padding: "1rem",
};

export default function DelayInsightPanel({ metrics }) {
  return (
    <div style={panelStyle}>
      <h3 style={{ marginTop: 0, color: "var(--text-on-dark)" }}>Delay Insight</h3>

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
        <p style={{ margin: 0, color: "var(--text-sub)" }}>No route delay data yet.</p>
      )}

      <SummaryRow label="Average Trip Delay" value={`${metrics.avgTripDelay} mins`} />
      <SummaryRow label="On-Time Rate" value={`${metrics.onTimeRate}%`} />
    </div>
  );
}