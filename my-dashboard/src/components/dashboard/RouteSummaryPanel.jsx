import { useMemo } from "react";

const panelStyle = {
  background: "var(--bg-card)",
  border: "1px solid var(--border)",
  borderRadius: "16px",
  padding: "1rem",
  display: "flex",
  flexDirection: "column",
  minHeight: 0,
};

export default function RouteSummaryPanel({
  routes = [],
  sourceStops = [],
  sourceTrips = [],
  sourceVehicles = [],
}) {
  const routeStats = useMemo(() => {
    const stopCounts = {};
    const tripCounts = {};
    const vehicleCounts = {};

    sourceStops.forEach((stop) => {
      const routeId = stop.routeId || stop.route_id;
      if (!routeId) return;
      stopCounts[routeId] = (stopCounts[routeId] || 0) + 1;
    });

    sourceTrips.forEach((trip) => {
      const routeId = trip.routeId || trip.route_id;
      if (!routeId) return;
      tripCounts[routeId] = (tripCounts[routeId] || 0) + 1;
    });

    sourceVehicles.forEach((vehicle) => {
      const routeId = vehicle.routeId || vehicle.route_id;
      if (!routeId) return;
      vehicleCounts[routeId] = (vehicleCounts[routeId] || 0) + 1;
    });

    return routes.map((route) => {
      const routeId = route.id || route.route_id;
      const code = route.routeCode || route.route_short_name || "—";
      const name =
        route.routeName || route.route_long_name || route.route_desc || "Unnamed Route";

      return {
        id: routeId,
        label: `${code} - ${name}`,
        stops: stopCounts[routeId] || 0,
        trips: tripCounts[routeId] || 0,
        vehicles: vehicleCounts[routeId] || 0,
      };
    });
  }, [routes, sourceStops, sourceTrips, sourceVehicles]);

  return (
    <div style={panelStyle} className="route-summary-panel">
      <h3 style={{ marginTop: 0, marginBottom: "0.9rem", color: "var(--text-on-dark)" }}>
        Route Summary
      </h3>

      {routeStats.length === 0 ? (
        <p style={{ margin: 0, color: "var(--text-sub)" }}>No routes available.</p>
      ) : (
        <div className="route-summary-list">
          {routeStats.map((route, index) => (
            <div
              key={route.id || `${route.label}-${index}`}
              className="route-summary-row"
            >
              <div className="route-summary-name" title={route.label}>
                {route.label}
              </div>

              <div className="route-summary-stats">
                <span>Stops: {route.stops}</span>
                <span>Trips: {route.trips}</span>
                <span>Vehicles: {route.vehicles}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}