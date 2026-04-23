import SummaryRow from "./SummaryRow";

export default function RoutingStatusPanel({ routes = [], error = "" }) {
  return (
    <div className="panel">
      <h3>Routing Status</h3>
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
          color: error ? "#fca5a5" : "var(--text-sub)",
        }}
      >
        {error || "Route visualization is ready."}
      </div>
    </div>
  );
}