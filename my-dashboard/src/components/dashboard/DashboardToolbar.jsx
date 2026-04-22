function labelStyle() {
  return {
    display: "block",
    marginBottom: "0.6rem",
    fontWeight: "700",
    color: "#e6fcff",
    fontSize: "1rem",
  };
}

function selectStyle() {
  return {
    padding: "0.95rem 1rem",
    borderRadius: "14px",
    border: "1px solid rgba(34, 211, 238, 0.45)",
    background: "rgba(34, 211, 238, 0.14)",
    color: "#e6fcff",
    minWidth: "250px",
    width: "100%",
    fontSize: "1rem",
    outline: "none",
    boxShadow: "0 0 12px rgba(34, 211, 238, 0.10)",
    backdropFilter: "blur(8px)",
    WebkitBackdropFilter: "blur(8px)",
  };
}

function actionButtonStyle() {
  return {
    padding: "0.95rem 1.2rem",
    borderRadius: "14px",
    border: "1px solid rgba(34, 211, 238, 0.45)",
    background: "rgba(34, 211, 238, 0.16)",
    color: "#e6fcff",
    cursor: "pointer",
    fontWeight: "700",
    minHeight: "48px",
    minWidth: "170px",
    boxShadow: "0 0 12px rgba(34, 211, 238, 0.12)",
    backdropFilter: "blur(8px)",
    WebkitBackdropFilter: "blur(8px)",
  };
}

function toggleButtonStyle(active) {
  return {
    flex: 1,
    padding: "0.95rem 1rem",
    borderRadius: "14px",
    border: active
      ? "1px solid rgba(34, 211, 238, 0.75)"
      : "1px solid rgba(34, 211, 238, 0.35)",
    background: active
      ? "rgba(34, 211, 238, 0.22)"
      : "rgba(34, 211, 238, 0.10)",
    color: "#e6fcff",
    fontSize: "1rem",
    fontWeight: "700",
    cursor: "pointer",
    transition: "all 0.2s ease",
    boxShadow: active
      ? "0 0 14px rgba(34, 211, 238, 0.22)"
      : "0 0 8px rgba(34, 211, 238, 0.08)",
    backdropFilter: "blur(8px)",
    WebkitBackdropFilter: "blur(8px)",
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
        background: "rgba(34, 211, 238, 0.12)",
        border: "1px solid rgba(34, 211, 238, 0.38)",
        borderRadius: "18px",
        padding: "1.5rem",
        marginBottom: "1.5rem",
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
        gap: "1.25rem",
        alignItems: "end",
        boxShadow: "0 0 16px rgba(34, 211, 238, 0.12)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
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
              {r.routeName ||
                r.route_long_name ||
                r.route_desc ||
                "Unnamed Route"}
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
              ...toggleButtonStyle(showTrafficOverlay),
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
              ...toggleButtonStyle(!showTrafficOverlay),
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
              color: "rgba(230, 252, 255, 0.72)",
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
          style={{
            ...actionButtonStyle(),
            opacity: trafficLoading || !tomtomEnabled ? 0.6 : 1,
            cursor:
              trafficLoading || !tomtomEnabled ? "not-allowed" : "pointer",
          }}
        >
          {trafficLoading ? "Refreshing Traffic..." : "Refresh Traffic"}
        </button>

        <button
          onClick={onRefreshRouteLines}
          disabled={routingLoading || (!tomtomEnabled && sourceMode === "firestore")}
          style={{
            ...actionButtonStyle(),
            opacity:
              routingLoading || (!tomtomEnabled && sourceMode === "firestore")
                ? 0.6
                : 1,
            cursor:
              routingLoading || (!tomtomEnabled && sourceMode === "firestore")
                ? "not-allowed"
                : "pointer",
          }}
        >
          {routingLoading ? "Building Routes..." : "Refresh Route Lines"}
        </button>

        <button
          onClick={onSavePrediction}
          disabled={predictionSaving}
          style={{
            ...actionButtonStyle(),
            opacity: predictionSaving ? 0.6 : 1,
            cursor: predictionSaving ? "not-allowed" : "pointer",
          }}
        >
          {predictionSaving ? "Saving Prediction..." : "Save Prediction"}
        </button>
      </div>

      <div
        style={{
          color: "#e6fcff",
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