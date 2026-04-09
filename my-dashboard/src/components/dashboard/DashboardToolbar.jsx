function labelStyle() {
  return {
    display: "block",
    marginBottom: "0.6rem",
    fontWeight: "700",
    color: "#f8fafc",
    fontSize: "1rem",
  };
}

function selectStyle() {
  return {
    padding: "0.95rem 1rem",
    borderRadius: "14px",
    border: "1px solid #334155",
    background: "#020b20",
    color: "#fff",
    minWidth: "250px",
    width: "100%",
    fontSize: "1rem",
  };
}

function buttonStyle(background) {
  return {
    padding: "0.95rem 1.2rem",
    border: "none",
    borderRadius: "14px",
    background,
    color: "#fff",
    cursor: "pointer",
    fontWeight: "bold",
    minHeight: "48px",
    minWidth: "170px",
  };
}

export default function DashboardToolbar({
  routes = [],
  selectedRouteId,
  onChangeRoute,
  sourceMode = "firestore",
  onChangeSourceMode,
  showTrafficOverlay = true,
  onChangeTrafficOverlay,
  hasFirestoreData = true,
  trafficLoading = false,
  routingLoading = false,
  predictionSaving = false,
  onRefreshTraffic,
  onRefreshRouteLines,
  onSavePrediction,
  tomtomEnabled = true,
  stats = {},
}) {
  return (
    <div
      style={{
        background: "#0a1835",
        border: "1px solid #1f2937",
        borderRadius: "18px",
        padding: "1.5rem",
        marginBottom: "1.5rem",
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
        gap: "1.25rem",
        alignItems: "end",
      }}
    >
      <div>
        <label style={labelStyle()}>Route Filter</label>
        <select
          value={selectedRouteId}
          onChange={(e) => onChangeRoute(e.target.value)}
          style={selectStyle()}
        >
          <option value="all">All Routes</option>
          {routes.map((r) => (
            <option key={r.route_id || r.id} value={r.route_id || r.id}>
              {(r.routeCode || r.route_short_name || "N/A")} -{" "}
              {(r.routeName || r.route_long_name || r.route_desc || "Unnamed Route")}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label style={labelStyle()}>Data Source</label>
        <select
          value={sourceMode}
          onChange={(e) => onChangeSourceMode?.(e.target.value)}
          style={selectStyle()}
        >
          <option value="firestore" disabled={!hasFirestoreData}>
            Firestore Admin Data
          </option>
          <option value="gtfs">GTFS Full Dataset</option>
        </select>
      </div>

      <div>
        <label style={labelStyle()}>Traffic Overlay</label>
        <select
          value={showTrafficOverlay ? "on" : "off"}
          onChange={(e) => onChangeTrafficOverlay?.(e.target.value === "on")}
          style={selectStyle()}
          disabled={sourceMode === "gtfs"}
        >
          <option value="on">Show Traffic</option>
          <option value="off">Hide Traffic</option>
        </select>
      </div>

      <div
        style={{
          display: "flex",
          gap: "0.9rem",
          flexWrap: "wrap",
          alignItems: "flex-end",
        }}
      >
        <button
          onClick={onRefreshTraffic}
          disabled={trafficLoading || !tomtomEnabled || sourceMode === "gtfs"}
          style={buttonStyle(
            trafficLoading || sourceMode === "gtfs" ? "#475569" : "#10b981"
          )}
        >
          {trafficLoading ? "Refreshing Traffic..." : "Refresh Traffic"}
        </button>

        <button
          onClick={onRefreshRouteLines}
          disabled={routingLoading || (!tomtomEnabled && sourceMode === "firestore")}
          style={buttonStyle(routingLoading ? "#475569" : "#2563eb")}
        >
          {routingLoading ? "Building Routes..." : "Refresh Route Lines"}
        </button>

        <button
          onClick={onSavePrediction}
          disabled={predictionSaving}
          style={buttonStyle(predictionSaving ? "#475569" : "#7c3aed")}
        >
          {predictionSaving ? "Saving Prediction..." : "Save Prediction"}
        </button>
      </div>

      <div
        style={{
          color: "#e2e8f0",
          fontSize: "1rem",
          lineHeight: 1.6,
        }}
      >
        <div>Source Mode: {String(stats.sourceMode || sourceMode).toUpperCase()}</div>
        <div>Routes Loaded: {stats.routesLoaded ?? 0}</div>
        <div>Stops Loaded: {stats.stopsLoaded ?? 0}</div>
        <div>Trips Loaded: {stats.tripsLoaded ?? 0}</div>
        <div>Vehicles Loaded: {stats.vehiclesLoaded ?? 0}</div>
        <div>GTFS Status: {stats.gtfsStatus || "Ready"}</div>
        <div>Traffic Updated: {stats.trafficUpdated || "—"}</div>
        <div>Routes Updated: {stats.routesUpdated || "—"}</div>
        <div>Map Zoom: {stats.mapZoom ?? 13}</div>
      </div>
    </div>
  );
}