import SummaryRow from "./SummaryRow";

const panelStyle = {
  background: "var(--bg-card)",
  border: "1px solid var(--border)",
  borderRadius: "16px",
  padding: "1rem",
};

export default function TripStatusSummaryPanel({ metrics }) {
  return (
    <div style={panelStyle}>
      <h3 style={{ marginTop: 0, color: "var(--text-on-dark)" }}>Trip Status Summary</h3>
      <SummaryRow label="Scheduled Trips" value={metrics.scheduledTrips} />
      <SummaryRow label="Active Trips" value={metrics.activeTrips} />
      <SummaryRow label="Delayed Trips" value={metrics.delayedTrips} />
      <SummaryRow label="Completed Trips" value={metrics.completedTrips} />
      <SummaryRow label="Cancelled Trips" value={metrics.cancelledTrips} />
    </div>
  );
}