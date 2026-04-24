import "./DashboardToolbar.css";

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
    <div className="toolbar-card">
      <div className="toolbar-top">
        <div className="toolbar-controls">
          <div className="toolbar-field">
            <label>Route Filter</label>
            <select value={selectedRouteId} onChange={(e) => onChangeRoute?.(e.target.value)}>
              <option value="all">All Routes</option>
              {routes.map((r) => (
                <option key={r.route_id || r.id} value={r.route_id || r.id}>
                  {(r.routeCode || r.route_short_name || "N/A")} -{" "}
                  {r.routeName || r.route_long_name || r.route_desc || "Unnamed Route"}
                </option>
              ))}
            </select>
          </div>

          <div className="toolbar-field">
            <label>Data Source</label>
            <select value={sourceMode} onChange={(e) => onChangeSourceMode?.(e.target.value)}>
              <option value="firestore" disabled={!hasFirestoreData}>
                Firestore Admin Data
              </option>
              <option value="gtfs">GTFS Full Dataset</option>
            </select>
          </div>

          <div className="toolbar-field">
            <label>Traffic Overlay</label>
            <div className="toolbar-toggle-row">
              <button type="button" onClick={() => onChangeTrafficOverlay?.(true)} disabled={!tomtomEnabled}>
                Show
              </button>
              <button type="button" onClick={() => onChangeTrafficOverlay?.(false)} disabled={!tomtomEnabled}>
                Hide
              </button>
            </div>
          </div>
        </div>

        <div className="toolbar-actions">
          <button onClick={onRefreshTraffic} disabled={trafficLoading || !tomtomEnabled}>
            {trafficLoading ? "Refreshing..." : "Refresh Traffic"}
          </button>

          <button onClick={onRefreshRouteLines} disabled={routingLoading}>
            {routingLoading ? "Building..." : "Refresh Route Lines"}
          </button>

          <button onClick={onSavePrediction} disabled={predictionSaving}>
            {predictionSaving ? "Saving..." : "Save Prediction"}
          </button>
        </div>
      </div>

      <div className="toolbar-info">
        <div>
          <h3>System Info</h3>
          <div className="toolbar-info-grid">
            <Info label="Source Mode" value={String(stats.sourceMode || sourceMode).toUpperCase()} />
            <Info label="GTFS Status" value={stats.gtfsStatus || "Ready"} />
            <Info label="Traffic Updated" value={stats.trafficUpdated || "—"} />
            <Info label="Routes Updated" value={stats.routesUpdated || "—"} />
          </div>
        </div>

        <div>
          <h3>Dataset Counts</h3>
          <div className="toolbar-info-grid">
            <Info label="Routes Loaded" value={stats.routesLoaded ?? 0} />
            <Info label="Stops Loaded" value={stats.stopsLoaded ?? 0} />
            <Info label="Trips Loaded" value={stats.tripsLoaded ?? 0} />
            <Info label="Vehicles Loaded" value={stats.vehiclesLoaded ?? 0} />
          </div>
        </div>
      </div>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div>
      <div className="toolbar-info-label">{label}</div>
      <div className="toolbar-info-value">{value}</div>
    </div>
  );
}