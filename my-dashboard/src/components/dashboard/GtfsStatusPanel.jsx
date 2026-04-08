import SummaryRow from "./SummaryRow";

const panelStyle = {
  background: "#111827",
  border: "1px solid #1f2937",
  borderRadius: "16px",
  padding: "1rem",
};

export default function GtfsStatusPanel({ gtfsBundle, loading, error }) {
  return (
    <div style={panelStyle}>
      <h3 style={{ marginTop: 0, color: "#fff" }}>GTFS Dataset Status</h3>
      <SummaryRow label="Agency" value={gtfsBundle?.agencyName || "-"} />
      <SummaryRow label="Feed Version" value={gtfsBundle?.feedVersion || "-"} />
      <SummaryRow label="GTFS Routes" value={gtfsBundle?.routes?.length || 0} />
      <SummaryRow label="GTFS Stops" value={gtfsBundle?.stops?.length || 0} />
      <SummaryRow label="GTFS Trips" value={gtfsBundle?.trips?.length || 0} />
      <SummaryRow label="GTFS Shapes" value={gtfsBundle?.shapeCount || 0} />
      <SummaryRow label="GTFS Stop Times" value={gtfsBundle?.stopTimeCount || 0} />

      <div
        style={{
          marginTop: "0.9rem",
          color: error ? "#fca5a5" : "#cbd5e1",
          whiteSpace: "pre-wrap",
        }}
      >
        {error ||
          (loading
            ? "Loading GTFS data..."
            : "The dashboard now reads routes, trips, stop_times, and shapes from your GTFS folder.")}
      </div>
    </div>
  );
}