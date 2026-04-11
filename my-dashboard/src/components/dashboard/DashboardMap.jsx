import { useEffect, useMemo } from "react";
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

export default function DashboardMap({
  stops = [],
  vehicles = [],
  routePaths = [],
  trafficSamples = [],
  showTrafficFlow = false,
  tomtomApiKey = "",
  showStops = true,
  showRoutes = true,
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

  const safeStops = useMemo(() => {
    if (!showStops) return [];
    return stops.slice(0, 500);
  }, [stops, showStops]);

  const safeRoutePaths = useMemo(() => {
    if (!showRoutes) return [];
    return routePaths.slice(0, 30);
  }, [routePaths, showRoutes]);

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

        {safeRoutePaths.map((line, i) => {
          const positions = (line.path || line.positions || []).filter(
            (p) => Array.isArray(p) && !Number.isNaN(p[0]) && !Number.isNaN(p[1])
          );

          if (positions.length < 2) return null;

          return (
            <Polyline
              key={line.routeId || i}
              positions={positions}
              pathOptions={{
                color: line.color || "#3b82f6",
                weight: 3,
                opacity: 0.85,
              }}
            >
              <Popup>
                <div>
                  <strong>
                    {line.routeCode || "N/A"} - {line.routeName || "Route"}
                  </strong>
                </div>
              </Popup>
            </Polyline>
          );
        })}

        {trafficSamples
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

        {safeStops.map((s) => {
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

        {vehicles.map((v) => {
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