const panelStyle = {
  background: "var(--bg-card)",
  border: "1px solid var(--border)",
  borderRadius: "16px",
  padding: "1rem",
};

export default function RouteSummaryPanel({
  routes = [],
  sourceStops = [],
  sourceTrips = [],
  sourceVehicles = [],
}) {
  return (
    <div style={panelStyle}>
      <h3 style={{ marginTop: 0, color: "var(--text-on-dark)" }}>Route Summary</h3>
      {routes.length === 0 ? (
        <p style={{ margin: 0, color: "var(--text-sub)" }}>No routes available.</p>
      ) : (
        routes.map((route) => (
          <div
            key={route.id || route.route_id}
            style={{ padding: "0.75rem 0", borderBottom: "1px solid var(--border)" }}
          >
            <div style={{ fontWeight: "bold", color: "var(--text-on-dark)" }}>
              {route.routeCode || route.route_short_name} -{" "}
              {route.routeName || route.route_long_name || route.route_desc || "Unnamed Route"}
            </div>
            <div style={{ color: "var(--text-sub)", marginTop: "0.25rem" }}>
              Stops:{" "}
              {
                sourceStops.filter(
                  (stop) => (stop.routeId || stop.route_id) === (route.id || route.route_id)
                ).length
              }
            </div>
            <div style={{ color: "var(--text-sub)", marginTop: "0.25rem" }}>
              Trips:{" "}
              {
                sourceTrips.filter(
                  (trip) => (trip.routeId || trip.route_id) === (route.id || route.route_id)
                ).length
              }
            </div>
            <div style={{ color: "var(--text-sub)", marginTop: "0.25rem" }}>
              Vehicles:{" "}
              {
                sourceVehicles.filter(
                  (vehicle) =>
                    (vehicle.routeId || vehicle.route_id) === (route.id || route.route_id)
                ).length
              }
            </div>
          </div>
        ))
      )}
    </div>
  );
}