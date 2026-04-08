import SummaryRow from "./SummaryRow";

const panelStyle = {
  background: "#111827",
  border: "1px solid #1f2937",
  borderRadius: "16px",
  padding: "1rem",
};

export default function TrafficStatusPanel({
  loading,
  error = "",
  sourceMode = "firestore",
  showTrafficOverlay = true,
  samplePoints = 0,
  apiConfigured = false,
}) {
  return (
    <div style={panelStyle}>
      <h3 style={{ marginTop: 0, color: "#fff" }}>Traffic Status</h3>
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
          color: error ? "#fca5a5" : "#cbd5e1",
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