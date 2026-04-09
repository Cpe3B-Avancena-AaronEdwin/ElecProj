import { getTripTimingLabel } from "../../utils/dashboardFormatters";

const panelStyle = {
  background: "#111827",
  border: "1px solid #1f2937",
  borderRadius: "16px",
  padding: "1rem",
};

export default function RecentTripsPanel({
  trips = [],
  sourceRouteMap = {},
  sourceVehicleMap = {},
  sourceMode = "firestore",
}) {
  return (
    <div style={panelStyle}>
      <h3 style={{ marginTop: 0, color: "#fff" }}>Recent Trips</h3>
      {trips.length === 0 ? (
        <p style={{ margin: 0, color: "#cbd5e1" }}>No trips available.</p>
      ) : (
        trips.slice(0, 5).map((trip) => (
          <div
            key={trip.id || trip.trip_id}
            style={{ padding: "0.75rem 0", borderBottom: "1px solid #1f2937" }}
          >
            <div style={{ fontWeight: "bold", color: "#fff" }}>
              {trip.tripCode || trip.trip_short_name || trip.tripHeadsign || trip.trip_headsign || "Unnamed Trip"}
            </div>
            <div style={{ color: "#cbd5e1", marginTop: "0.25rem" }}>
              Route:{" "}
              {sourceRouteMap[trip.routeId || trip.route_id]
                ? `${sourceRouteMap[trip.routeId || trip.route_id].routeCode || sourceRouteMap[trip.routeId || trip.route_id].route_short_name} - ${
                    sourceRouteMap[trip.routeId || trip.route_id].routeName ||
                    sourceRouteMap[trip.routeId || trip.route_id].route_long_name ||
                    "Unnamed Route"
                  }`
                : "Unassigned"}
            </div>
            <div style={{ color: "#cbd5e1", marginTop: "0.25rem" }}>
              Vehicle:{" "}
              {sourceVehicleMap[trip.vehicleId]
                ? `${sourceVehicleMap[trip.vehicleId].vehicleCode || "Vehicle"} - ${
                    sourceVehicleMap[trip.vehicleId].plateNumber || "N/A"
                  }`
                : sourceMode === "gtfs"
                ? "GTFS scheduled trip"
                : "Unassigned"}
            </div>
            <div style={{ color: "#cbd5e1", marginTop: "0.25rem" }}>
              Status: <strong>{trip.status || "scheduled"}</strong>
            </div>
            <div style={{ color: "#cbd5e1", marginTop: "0.25rem" }}>
              ETA / Schedule: {getTripTimingLabel(trip)}
            </div>
            <div style={{ color: "#cbd5e1", marginTop: "0.25rem" }}>
              Delay: {trip.delayMinutes ?? 0} mins
            </div>
          </div>
        ))
      )}
    </div>
  );
}