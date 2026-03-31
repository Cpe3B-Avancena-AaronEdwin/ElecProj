import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import Papa from "papaparse";
import L from "leaflet";
import { logoutUser } from "../firebase/auth";
import { useAuth } from "../context/AuthContext";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
});

const TOMTOM_API_KEY = import.meta.env.VITE_TOMTOM_API_KEY;

export default function Dashboard() {
  const { user, role } = useAuth();
  const [transitData, setTransitData] = useState([]);
  const [trafficLines, setTrafficLines] = useState([]);

  const loadStops = async () => {
    try {
      const res = await fetch("/gtfs/stops.txt");
      const text = await res.text();
      const parsed = Papa.parse(text, { header: true });

      const formatted = parsed.data
        .filter((s) => s.stop_lat && s.stop_lon)
        .slice(0, 50)
        .map((s, i) => ({
          id: i,
          name: s.stop_name,
          lat: parseFloat(s.stop_lat),
          lng: parseFloat(s.stop_lon),
          delay: Math.floor(Math.random() * 10),
          passengers: Math.floor(Math.random() * 100),
        }));

      setTransitData(formatted);
    } catch (err) {
      console.error("GTFS load error:", err);
    }
  };

  const fetchTraffic = async () => {
    if (!TOMTOM_API_KEY) return;

    try {
      const points = [
        [14.5547, 121.0244],
        [14.56, 121.03],
        [14.565, 121.02],
      ];

      const allSegments = [];

      for (const p of points) {
        const res = await fetch(
          `https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json?key=${TOMTOM_API_KEY}&point=${p[0]},${p[1]}`
        );
        const data = await res.json();

        if (data.flowSegmentData) {
          const coords = [
            [
              data.flowSegmentData.segmentStart.lat,
              data.flowSegmentData.segmentStart.lon,
            ],
            [
              data.flowSegmentData.segmentEnd.lat,
              data.flowSegmentData.segmentEnd.lon,
            ],
          ];

          const speed = data.flowSegmentData.currentSpeed;
          const free = data.flowSegmentData.freeFlowSpeed;
          const ratio = free ? speed / free : 1;

          let color = "#00ff00";
          if (ratio < 0.5) color = "#ff0000";
          else if (ratio < 0.8) color = "#ffff00";

          allSegments.push({ coords, color });
        }
      }

      setTrafficLines(allSegments);
    } catch (err) {
      console.error("Traffic error:", err);
    }
  };

  useEffect(() => {
    loadStops();
    fetchTraffic();
  }, []);

  const totalPassengers = transitData.reduce((sum, t) => sum + t.passengers, 0);
  const avgDelay = transitData.length
    ? (
        transitData.reduce((sum, t) => sum + t.delay, 0) / transitData.length
      ).toFixed(1)
    : 0;

  return (
    <div style={{ padding: "1rem", fontFamily: "Arial, sans-serif" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1rem",
          gap: "1rem",
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1 style={{ fontSize: "2rem", margin: 0 }}>Smart Transit Dashboard</h1>
          <p style={{ margin: "0.5rem 0 0" }}>
            Logged in as: <strong>{user?.email || "Unknown"}</strong>
          </p>
          <p style={{ margin: "0.25rem 0 0" }}>
            Role: <strong>{role || "No role found"}</strong>
          </p>
        </div>

        <button
          onClick={logoutUser}
          style={{
            padding: "0.75rem 1rem",
            border: "none",
            borderRadius: "8px",
            background: "#dc3545",
            color: "#fff",
            cursor: "pointer",
            fontWeight: "bold",
          }}
        >
          Logout
        </button>
      </div>

      <div
        style={{
          display: "flex",
          gap: "1rem",
          marginBottom: "1rem",
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            padding: "1rem",
            border: "1px solid #ccc",
            borderRadius: "8px",
            minWidth: "180px",
            background: "#fff",
          }}
        >
          Total Stops: {transitData.length}
        </div>

        <div
          style={{
            padding: "1rem",
            border: "1px solid #ccc",
            borderRadius: "8px",
            minWidth: "180px",
            background: "#fff",
          }}
        >
          Total Passengers: {totalPassengers}
        </div>

        <div
          style={{
            padding: "1rem",
            border: "1px solid #ccc",
            borderRadius: "8px",
            minWidth: "180px",
            background: "#fff",
          }}
        >
          Avg Delay: {avgDelay} mins
        </div>
      </div>

      <div
        style={{
          marginBottom: "1rem",
          border: "1px solid #ccc",
          borderRadius: "8px",
          overflow: "hidden",
        }}
      >
        <MapContainer
          center={[14.5547, 121.0244]}
          zoom={13}
          style={{ height: "450px", width: "100%" }}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

          {transitData.map((t) => (
            <Marker key={t.id} position={[t.lat, t.lng]}>
              <Popup>
                <b>{t.name}</b>
                <br />
                Delay: {t.delay} min
                <br />
                Passengers: {t.passengers}
              </Popup>
            </Marker>
          ))}

          {trafficLines.map((line, i) => (
            <Polyline
              key={i}
              positions={line.coords}
              pathOptions={{ color: line.color, weight: 5 }}
            />
          ))}
        </MapContainer>
      </div>
    </div>
  );
}