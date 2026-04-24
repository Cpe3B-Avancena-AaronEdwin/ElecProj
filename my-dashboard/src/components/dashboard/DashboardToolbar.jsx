import { useMemo, useState } from "react";
import "./DashboardToolbar.css";

function getRouteId(route) {
  return route.route_id || route.id || route.routeId || "";
}

function getRouteLabel(route) {
  return `${route.routeCode || route.route_short_name || "N/A"} - ${
    route.routeName || route.route_long_name || route.route_desc || "Unnamed Route"
  }`;
}

export default function DashboardToolbar({
  routes = [],
  selectedRouteId,
  onChangeRoute,
  sourceMode = "mysql",
  onChangeSourceMode,
  showTrafficOverlay = true,
  onChangeTrafficOverlay,
  hasAdminData = true,
  trafficLoading = false,
  routingLoading = false,
  predictionSaving = false,
  onRefreshTraffic,
  onRefreshRouteLines,
  onSavePrediction,
  tomtomEnabled = true,
  stats = {},
}) {
  const [routeSearch, setRouteSearch] = useState("");
  const [routeListOpen, setRouteListOpen] = useState(false);

  const selectedRouteLabel = useMemo(() => {
    if (!selectedRouteId || selectedRouteId === "all") return "All Routes";

    const found = routes.find(
      (route) => String(getRouteId(route)) === String(selectedRouteId)
    );

    return found ? getRouteLabel(found) : "Selected Route";
  }, [routes, selectedRouteId]);

  const filteredRoutes = useMemo(() => {
    const q = routeSearch.trim().toLowerCase();

    if (!q) return routes.slice(0, 80);

    return routes
      .filter((route) => getRouteLabel(route).toLowerCase().includes(q))
      .slice(0, 80);
  }, [routes, routeSearch]);

  return (
    <div className="toolbar-card">
      <div className="toolbar-top">
        <div className="toolbar-controls">
          <div className="toolbar-field toolbar-field-search">
            <label>Route Filter</label>

            <input
              type="text"
              value={routeSearch}
              placeholder={selectedRouteLabel}
              onFocus={() => setRouteListOpen(true)}
              onClick={() => setRouteListOpen(true)}
              onChange={(e) => {
                setRouteSearch(e.target.value);
                setRouteListOpen(true);
              }}
              className="toolbar-search-input"
            />

            {routeListOpen && (
              <div className="toolbar-route-list">
                <button
                  type="button"
                  className={`toolbar-route-option ${
                    selectedRouteId === "all" ? "active" : ""
                  }`}
                  onClick={() => {
                    onChangeRoute?.("all");
                    setRouteSearch("");
                    setRouteListOpen(false);
                  }}
                >
                  All Routes
                </button>

                {filteredRoutes.map((route) => {
                  const routeId = getRouteId(route);
                  const label = getRouteLabel(route);

                  return (
                    <button
                      key={routeId}
                      type="button"
                      className={`toolbar-route-option ${
                        String(selectedRouteId) === String(routeId)
                          ? "active"
                          : ""
                      }`}
                      onClick={() => {
                        onChangeRoute?.(routeId);
                        setRouteSearch("");
                        setRouteListOpen(false);
                      }}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="toolbar-field">
            <label>Data Source</label>

            <select
              value={sourceMode}
              onChange={(e) => onChangeSourceMode?.(e.target.value)}
            >
              <option value="mysql" disabled={!hasAdminData}>
                MySQL Admin Data
              </option>
              <option value="gtfs">GTFS Full Dataset</option>
            </select>
          </div>

          <div className="toolbar-field">
            <label>Traffic Overlay</label>

            <div className="toolbar-toggle-row">
              <button
                type="button"
                onClick={() => onChangeTrafficOverlay?.(true)}
                disabled={!tomtomEnabled}
                className={showTrafficOverlay ? "active" : ""}
              >
                Show
              </button>

              <button
                type="button"
                onClick={() => onChangeTrafficOverlay?.(false)}
                disabled={!tomtomEnabled}
                className={!showTrafficOverlay ? "active" : ""}
              >
                Hide
              </button>
            </div>
          </div>
        </div>

        <div className="toolbar-actions">
          <button
            type="button"
            onClick={onRefreshTraffic}
            disabled={trafficLoading || !tomtomEnabled}
          >
            {trafficLoading ? "Refreshing..." : "Refresh Traffic"}
          </button>

          <button
            type="button"
            onClick={onRefreshRouteLines}
            disabled={routingLoading}
          >
            {routingLoading ? "Building..." : "Refresh Route Lines"}
          </button>

          <button
            type="button"
            onClick={onSavePrediction}
            disabled={predictionSaving}
          >
            {predictionSaving ? "Saving..." : "Save Prediction"}
          </button>
        </div>
      </div>

      <div className="toolbar-info">
        <div>
          <h3>System Info</h3>

          <div className="toolbar-info-grid">
            <Info
              label="Source Mode"
              value={String(stats.sourceMode || sourceMode).toUpperCase()}
            />
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