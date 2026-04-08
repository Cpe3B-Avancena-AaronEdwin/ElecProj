import SummaryRow from "./SummaryRow";

const panelStyle = {
  background: "#111827",
  border: "1px solid #1f2937",
  borderRadius: "16px",
  padding: "1rem",
};

export default function RoutingStatusPanel({ routes = [], error = "" }) {
  return (
    <div style={panelStyle}>
      <h3 style={{ marginTop: 0, color: "#fff" }}>Routing Status</h3>
      <SummaryRow label="Route Lines" value={routes.length} />
      <SummaryRow
        label="Using TomTom"
        value={routes.filter((item) => item.usedRoutingApi).length}
      />
      <SummaryRow
        label="Using GTFS Shapes"
        value={routes.filter((item) => item.source === "gtfs-shapes").length}
      />
      <SummaryRow
        label="Stop Fallback"
        value={routes.filter((item) => item.source === "stops").length}
      />

      <div
        style={{
          marginTop: "0.9rem",
          color: error ? "#fca5a5" : "#cbd5e1",
        }}
      >
        {error || "Route visualization is ready."}
      </div>
    </div>
  );
}