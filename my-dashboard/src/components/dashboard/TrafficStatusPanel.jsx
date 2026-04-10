import SummaryRow from "./SummaryRow";

export default function TrafficStatusPanel({
  loading,
  error = "",
  sourceMode = "firestore",
  showTrafficOverlay = true,
  samplePoints = 0,
  apiConfigured = false,
}) {
  return (
    <div className="panel">
      <h3>Traffic Status</h3>
      <SummaryRow label="API Key" value={apiConfigured ? "Configured" : "Missing"} />
      <SummaryRow
        label="Overlay"
        value={
          sourceMode === "gtfs"
            ? "Disabled in GTFS mode"
            : showTrafficOverlay
            ? "Visible"
            : "Hidden"
        }
      />
      <SummaryRow label="Loading" value={loading ? "Yes" : "No"} />
      <SummaryRow label="Sample Points" value={samplePoints} />

      <div
        style={{
          marginTop: "0.9rem",
          color: error ? "#fca5a5" : "var(--text-sub)",
        }}
      >
        {error ||
          (sourceMode === "gtfs"
            ? "Traffic is disabled in GTFS mode for performance."
            : "Traffic monitoring is running.")}
      </div>
    </div>
  );
}