function labelStyle() {
  return {
    display: "block",
    marginBottom: "0.6rem",
    fontWeight: "700",
    color: "var(--text-on-dark)",
    fontSize: "1rem",
  };
}

function selectStyle() {
  return {
    padding: "0.95rem 1rem",
    borderRadius: "14px",
    border: "1px solid var(--border)",
    background: "var(--bg-main)",
    color: "var(--text-on-dark)",
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
    color: "var(--text-on-dark)",
    cursor: "pointer",
    fontWeight: "bold",
    minHeight: "48px",
    minWidth: "170px",
  };
}

function overlayToggleButtonStyle(active) {
  return {
    flex: 1,
    padding: "0.95rem 1rem",
    borderRadius: "14px",
    border: `1px solid ${active ? "rgba(56, 189, 248, 0.9)" : "var(--border)"}`,
    background: active ? "rgba(56, 189, 248, 0.18)" : "var(--bg-main)",
    color: "var(--text-on-dark)",
    fontSize: "1rem",
    fontWeight: "700",
    cursor: "pointer",
    transition: "all 0.2s ease",
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
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
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
          onChange={(e) => onChangeRoute?.(e.target.value)}
          style={selectStyle()}
        >
          <option value="all">All Routes</option>
          {routes.map((r) => (
            <option key={r.route_id || r.id} value={r.route_id || r.id}>
              {(r.routeCode || r.route_short_name || "N/A")} -{" "}
              {r.routeName || r.route_long_name || r.route_desc || "Unnamed Route"}
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
        <div
          style={{
            display: "flex",
            gap: "0.75rem",
            width: "100%",
          }}
        >
          <button
            type="button"
            onClick={() => onChangeTrafficOverlay?.(true)}
            disabled={!tomtomEnabled}
            style={{
              ...overlayToggleButtonStyle(showTrafficOverlay),
              opacity: tomtomEnabled ? 1 : 0.6,
              cursor: tomtomEnabled ? "pointer" : "not-allowed",
            }}
          >
            Show Traffic
          </button>

          <button
            type="button"
            onClick={() => onChangeTrafficOverlay?.(false)}
            disabled={!tomtomEnabled}
            style={{
              ...overlayToggleButtonStyle(!showTrafficOverlay),
              opacity: tomtomEnabled ? 1 : 0.6,
              cursor: tomtomEnabled ? "pointer" : "not-allowed",
            }}
          >
            Hide Traffic
          </button>
        </div>

        {!tomtomEnabled ? (
          <div
            style={{
              marginTop: "0.5rem",
              fontSize: "0.9rem",
              color: "var(--text-sub)",
            }}
          >
            TomTom API key not configured.
          </div>
        ) : null}
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
          disabled={trafficLoading || !tomtomEnabled}
          style={buttonStyle(
            trafficLoading || !tomtomEnabled ? "#475569" : "#10b981"
          )}
        >
          {trafficLoading ? "Refreshing Traffic..." : "Refresh Traffic"}
        </button>

        <button
          onClick={onRefreshRouteLines}
          disabled={routingLoading || (!tomtomEnabled && sourceMode === "firestore")}
          style={buttonStyle(
            routingLoading || (!tomtomEnabled && sourceMode === "firestore")
              ? "#475569"
              : "var(--accent)"
          )}
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