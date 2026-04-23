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
    border: "1px solid rgba(34, 211, 238, 0.35)",
    background: "rgba(34, 211, 238, 0.10)",
    color: "#e6fcff",
    width: "100%",
    fontSize: "1rem",
    outline: "none",
  };
}

function actionButtonStyle() {
  return {
    padding: "0.9rem 1rem",
    borderRadius: "12px",
    border: "1px solid rgba(34, 211, 238, 0.35)",
    background: "rgba(34, 211, 238, 0.14)",
    color: "#e6fcff",
    cursor: "pointer",
    fontWeight: "700",
    width: "100%",
  };
}

function toggleButtonStyle(active) {
  return {
    flex: 1,
    padding: "0.95rem 1rem",
    borderRadius: "12px",
    border: active
      ? "1px solid rgba(34, 211, 238, 0.65)"
      : "1px solid rgba(34, 211, 238, 0.30)",
    background: active
      ? "rgba(34, 211, 238, 0.20)"
      : "rgba(34, 211, 238, 0.10)",
    color: "#e6fcff",
    fontSize: "1rem",
    fontWeight: "700",
    cursor: "pointer",
  };
}

function infoLabelStyle() {
  return {
    color: "rgba(230, 252, 255, 0.64)",
    fontSize: "0.86rem",
    fontWeight: 600,
    marginBottom: "0.2rem",
  };
}

function infoValueStyle() {
  return {
    color: "#e6fcff",
    fontSize: "1rem",
    fontWeight: 700,
    lineHeight: 1.35,
    wordBreak: "break-word",
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
        background: "rgba(34, 211, 238, 0.10)",
        border: "1px solid rgba(34, 211, 238, 0.30)",
        borderRadius: "18px",
        padding: "1.4rem",
        display: "flex",
        flexDirection: "column",
        gap: "1.25rem",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) 280px",
          gap: "1.2rem",
          alignItems: "start",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(220px, 1fr))",
            gap: "1rem",
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
            <div style={{ display: "flex", gap: "0.5rem" }}>
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
        </div>

        <div
          style={{
            display: "grid",
            gap: "0.75rem",
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
      </div>

      <div
        style={{
          borderTop: "1px solid rgba(34, 211, 238, 0.14)",
          paddingTop: "1.2rem",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "2rem",
        }}
      >
        <div>
          <div
            style={{
              color: "#e6fcff",
              fontWeight: 800,
              fontSize: "1rem",
              marginBottom: "1rem",
            }}
          >
            System Info
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(140px, 1fr))",
              gap: "1rem",
            }}
          >
            <div>
              <div style={infoLabelStyle()}>Source Mode</div>
              <div style={infoValueStyle()}>
                {String(stats.sourceMode || sourceMode).toUpperCase()}
              </div>
            </div>

            <div>
              <div style={infoLabelStyle()}>GTFS Status</div>
              <div style={infoValueStyle()}>{stats.gtfsStatus || "Ready"}</div>
            </div>

            <div>
              <div style={infoLabelStyle()}>Traffic Updated</div>
              <div style={infoValueStyle()}>{stats.trafficUpdated || "—"}</div>
            </div>

            <div>
              <div style={infoLabelStyle()}>Routes Updated</div>
              <div style={infoValueStyle()}>{stats.routesUpdated || "—"}</div>
            </div>
          </div>
        </div>

        <div>
          <div
            style={{
              color: "#e6fcff",
              fontWeight: 800,
              fontSize: "1rem",
              marginBottom: "1rem",
            }}
          >
            Dataset Counts
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(140px, 1fr))",
              gap: "1rem",
            }}
          >
            <div>
              <div style={infoLabelStyle()}>Routes Loaded</div>
              <div style={infoValueStyle()}>{stats.routesLoaded ?? 0}</div>
            </div>

            <div>
              <div style={infoLabelStyle()}>Stops Loaded</div>
              <div style={infoValueStyle()}>{stats.stopsLoaded ?? 0}</div>
            </div>

            <div>
              <div style={infoLabelStyle()}>Trips Loaded</div>
              <div style={infoValueStyle()}>{stats.tripsLoaded ?? 0}</div>
            </div>

            <div>
              <div style={infoLabelStyle()}>Vehicles Loaded</div>
              <div style={infoValueStyle()}>{stats.vehiclesLoaded ?? 0}</div>
            </div>

            {"mapZoom" in stats ? (
              <div>
                <div style={infoLabelStyle()}>Map Zoom</div>
                <div style={infoValueStyle()}>{stats.mapZoom ?? 13}</div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}