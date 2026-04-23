import { useMemo } from "react";

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
      const code = route.routeCode || route.route_short_name || "N/A";
      const name =
        route.routeName ||
        route.route_long_name ||
        route.route_desc ||
        "Unnamed Route";

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
    <div
      className="card"
      style={{
        height: "420px",
        maxHeight: "420px",
        minHeight: "420px",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        background: "rgba(34, 211, 238, 0.12)",
        border: "1px solid rgba(34, 211, 238, 0.38)",
        borderRadius: "18px",
        padding: "1.2rem",
        boxShadow: "0 0 16px rgba(34, 211, 238, 0.12)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "12px",
        }}
      >
        <h3 style={{ margin: 0, color: "#e6fcff" }}>Route Summary</h3>
        <span style={{ color: "rgba(230, 252, 255, 0.75)" }}>
          {routeStats.length} routes
        </span>
      </div>

      {routeStats.length === 0 ? (
        <p style={{ color: "rgba(230, 252, 255, 0.72)" }}>
          No routes available.
        </p>
      ) : (
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            overflowX: "hidden",
            paddingRight: "6px",
          }}
        >
          {routeStats.map((route, index) => (
            <div
              key={route.id || index}
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: "10px",
                padding: "10px 0",
                borderBottom: "1px solid rgba(34, 211, 238, 0.18)",
              }}
            >
              <div
                style={{
                  flex: 1,
                  minWidth: 0,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  fontWeight: 600,
                  color: "#e6fcff",
                }}
                title={route.label}
              >
                {route.label}
              </div>

              <div
                style={{
                  display: "flex",
                  gap: "12px",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                  color: "rgba(230, 252, 255, 0.75)",
                }}
              >
                <span>S: {route.stops}</span>
                <span>T: {route.trips}</span>
                <span>V: {route.vehicles}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}