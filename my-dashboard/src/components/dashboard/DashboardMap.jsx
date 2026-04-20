import { useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  CircleMarker,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
  iconUrl:
    "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  shadowUrl:
    "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
});

function FitPlannerBounds({ points = [] }) {
  const map = useMap();

  useEffect(() => {
    const valid = (points || []).filter(
      (p) => Array.isArray(p) && p.length >= 2 && !Number.isNaN(p[0]) && !Number.isNaN(p[1])
    );

    if (valid.length >= 2) {
      map.fitBounds(valid, { padding: [40, 40] });
    } else if (valid.length === 1) {
      map.setView(valid[0], 15);
    }
  }, [map, points]);

  return null;
}

function FixMap() {
  const map = useMap();

  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 250);

    const handleResize = () => {
      setTimeout(() => map.invalidateSize(), 100);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", handleResize);
    };
  }, [map]);

  return null;
}

const vehicleIcon = new L.DivIcon({
  className: "custom-vehicle-icon",
  html: `
    <div style="
      width: 18px;
      height: 18px;
      border-radius: 999px;
      background: #ef4444;
      border: 3px solid white;
      box-shadow: 0 0 0 2px #ef4444;
    "></div>
  `,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

function plannerIconHtml(color, label) {
  return `
    <div style="
      width: 24px;
      height: 24px;
      border-radius: 999px;
      background: ${color};
      border: 3px solid white;
      box-shadow: 0 0 0 2px ${color};
      color: white;
      font-size: 10px;
      font-weight: 800;
      display: flex;
      align-items: center;
      justify-content: center;
    ">${label}</div>
  `;
}

function createPlannerIcon(color, label) {
  return new L.DivIcon({
    className: "planner-stop-icon",
    html: plannerIconHtml(color, label),
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
}

const startIcon = createPlannerIcon("#22c55e", "S");
const transferIcon = createPlannerIcon("#f59e0b", "T");
const endIcon = createPlannerIcon("#ef4444", "E");

export default function DashboardMap({
  stops = [],
  vehicles = [],
  routePaths = [],
  trafficSamples = [],
  showTrafficFlow = false,
  tomtomApiKey = "",
  showStops = true,
  showRoutes = true,
  plannerMapData = null,
}) {
  const center = [14.6, 121];

  const getLatLng = (item) => {
    const lat = parseFloat(
      item.stopLat ?? item.stop_lat ?? item.latitude ?? item.lat
    );
    const lng = parseFloat(
      item.stopLon ?? item.stop_lon ?? item.longitude ?? item.lng
    );

    if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
    return [lat, lng];
  };

  const trafficFlowUrl =
    showTrafficFlow && tomtomApiKey
      ? `https://api.tomtom.com/traffic/map/4/tile/flow/relative0-dark/{z}/{x}/{y}.png?key=${tomtomApiKey}`
      : null;

  const plannerMarkers = plannerMapData?.markers || [];
  const plannerPolylines = plannerMapData?.polylines || [];
  const plannerFitPoints = plannerMapData?.fitBoundsPoints || [];

  const hasActivePlannerRoute = plannerPolylines.length > 0;

  return (
    <div
      style={{
        marginBottom: "1.5rem",
        borderRadius: "18px",
        overflow: "hidden",
        border: "1px solid var(--border)",
        height: "560px",
        background: "#0f172a",
      }}
    >
      <MapContainer
        center={center}
        zoom={13}
        preferCanvas={true}
        style={{ height: "100%", width: "100%" }}
      >
        <FixMap />
        {plannerFitPoints.length ? <FitPlannerBounds points={plannerFitPoints} /> : null}

        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {trafficFlowUrl ? (
          <TileLayer
            url={trafficFlowUrl}
            attribution="Traffic flow &copy; TomTom"
            opacity={0.9}
          />
        ) : null}

        {plannerPolylines.map((line) => {
          const positions = (line.path || []).filter(
            (p) => Array.isArray(p) && !Number.isNaN(p[0]) && !Number.isNaN(p[1])
          );

          if (positions.length < 2) return null;

          return (
            <Polyline
              key={line.id}
              positions={positions}
              pathOptions={{
                color: line.color || "#22c55e",
                weight: 7,
                opacity: 1,
              }}
            >
              <Popup>
                <div>
                  <strong>{line.routeLabel || "Planned Route"}</strong>
                  <br />
                  {line.fromStopName} → {line.toStopName}
                  <br />
                  {line.directionLabel}
                  <br />
                  Stops: {line.stopCount ?? "N/A"}
                </div>
              </Popup>
            </Polyline>
          );
        })}

        {!hasActivePlannerRoute &&
          trafficSamples
            .filter((sample) => {
              const lat = parseFloat(sample.lat);
              const lng = parseFloat(sample.lng);
              return !Number.isNaN(lat) && !Number.isNaN(lng);
            })
            .slice(0, 200)
            .map((sample, i) => (
              <CircleMarker
                key={sample.id || i}
                center={[parseFloat(sample.lat), parseFloat(sample.lng)]}
                radius={6}
                pathOptions={{
                  color: sample.color || "#22c55e",
                  fillColor: sample.color || "#22c55e",
                  fillOpacity: 0.85,
                  weight: 1,
                }}
              >
                <Popup>
                  <div>
                    <strong>{sample.name || "Traffic Point"}</strong>
                    <br />
                    Congestion: {sample.severity || "Unknown"}
                    <br />
                    Current Speed: {sample.currentSpeed ?? "N/A"} km/h
                    <br />
                    Free Flow: {sample.freeFlowSpeed ?? "N/A"} km/h
                  </div>
                </Popup>
              </CircleMarker>
            ))}

        {showStops &&
          !hasActivePlannerRoute &&
          stops.slice(0, 300).map((s) => {
            const pos = getLatLng(s);
            if (!pos) return null;

            return (
              <Marker key={s.stop_id || s.id} position={pos}>
                <Popup>
                  <div>
                    <strong>{s.stopName || s.stop_name || "Stop"}</strong>
                    <br />
                    Stop Code: {s.stopCode || s.stop_code || "N/A"}
                  </div>
                </Popup>
              </Marker>
            );
          })}

        {plannerMarkers.map((marker) => {
          const pos = getLatLng(marker.stop);
          if (!pos) return null;

          const icon =
            marker.kind === "start"
              ? startIcon
              : marker.kind === "end"
              ? endIcon
              : transferIcon;

          return (
            <Marker key={marker.id} position={pos} icon={icon}>
              <Popup>
                <div>
                  <strong>{marker.label}</strong>
                  <br />
                  {marker.name}
                </div>
              </Popup>
            </Marker>
          );
        })}

        {!hasActivePlannerRoute &&
          vehicles.map((v) => {
            const pos = getLatLng(v);
            if (!pos) return null;

            return (
              <Marker key={v.id} position={pos} icon={vehicleIcon}>
                <Popup>Vehicle</Popup>
              </Marker>
            );
          })}
      </MapContainer>
    </div>
  );
}