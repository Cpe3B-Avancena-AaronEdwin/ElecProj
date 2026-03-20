import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import Papa from "papaparse";
import L from "leaflet";

// Leaflet icon fix (needed for markers to show)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
});

// Replace with your TomTom API key
const TOMTOM_API_KEY = import.meta.env.VITE_TOMTOM_API_KEY;

// ================= LOGIN =================
function Login({ onLogin }) {
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");

  return (
    <div style={{ display: "flex", height: "100vh", justifyContent: "center", alignItems: "center" }}>
      <div style={{ padding: "2rem", border: "1px solid #ccc", borderRadius: "8px", width: "300px" }}>
        <h2 style={{ fontSize: "1.5rem", marginBottom: "1rem" }}>Login</h2>
        <input
          placeholder="Username"
          style={{ width: "100%", marginBottom: "1rem", padding: "0.5rem" }}
          onChange={(e) => setUser(e.target.value)}
        />
        <input
          type="password"
          placeholder="Password"
          style={{ width: "100%", marginBottom: "1rem", padding: "0.5rem" }}
          onChange={(e) => setPass(e.target.value)}
        />
        <button
          style={{ width: "100%", padding: "0.5rem", backgroundColor: "#007bff", color: "#fff", border: "none", borderRadius: "4px" }}
          onClick={() => onLogin(user, pass)}
        >
          Login
        </button>
      </div>
    </div>
  );
}

// ================= DASHBOARD =================
function Dashboard() {
  const [transitData, setTransitData] = useState([]);
  const [trafficData, setTrafficData] = useState(null);

  // Load GTFS stops
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

  // Fetch traffic data from TomTom
  const fetchTraffic = async () => {
    try {
      const res = await fetch(
        `https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json?key=${TOMTOM_API_KEY}&point=14.5547,121.0244`
      );
      const data = await res.json();
      setTrafficData(data);
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
    ? (transitData.reduce((sum, t) => sum + t.delay, 0) / transitData.length).toFixed(1)
    : 0;

  return (
    <div style={{ padding: "1rem", fontFamily: "Arial, sans-serif" }}>
      <h1 style={{ fontSize: "2rem", marginBottom: "1rem" }}>Smart Transit Dashboard (GTFS + TomTom)</h1>

      {/* STATS */}
      <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}>
        <div style={{ padding: "1rem", border: "1px solid #ccc", borderRadius: "8px" }}>Total Stops: {transitData.length}</div>
        <div style={{ padding: "1rem", border: "1px solid #ccc", borderRadius: "8px" }}>Total Passengers: {totalPassengers}</div>
        <div style={{ padding: "1rem", border: "1px solid #ccc", borderRadius: "8px" }}>Avg Delay: {avgDelay} mins</div>
      </div>

      {/* MAP */}
      <div style={{ marginBottom: "1rem", border: "1px solid #ccc", borderRadius: "8px" }}>
        <MapContainer center={[14.5547, 121.0244]} zoom={13} style={{ height: "400px", width: "100%" }}>
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
        </MapContainer>
      </div>

      {/* TRAFFIC */}
      <div style={{ marginBottom: "1rem", padding: "1rem", border: "1px solid #ccc", borderRadius: "8px" }}>
        <h2 style={{ fontSize: "1.25rem", marginBottom: "0.5rem" }}>Traffic Data</h2>
        {trafficData ? (
          <pre style={{ fontSize: "0.75rem", maxHeight: "200px", overflow: "auto" }}>
            {JSON.stringify(trafficData.flowSegmentData, null, 2)}
          </pre>
        ) : (
          <p>Loading traffic...</p>
        )}
      </div>

      {/* TRANSIT TABLE */}
      <div style={{ marginBottom: "1rem", border: "1px solid #ccc", borderRadius: "8px", padding: "1rem" }}>
        <h2 style={{ fontSize: "1.25rem", marginBottom: "0.5rem" }}>Transit Stops</h2>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ borderBottom: "1px solid #ccc", textAlign: "left" }}>Name</th>
              <th style={{ borderBottom: "1px solid #ccc", textAlign: "left" }}>Delay</th>
              <th style={{ borderBottom: "1px solid #ccc", textAlign: "left" }}>Passengers</th>
            </tr>
          </thead>
          <tbody>
            {transitData.map((t) => (
              <tr key={t.id}>
                <td style={{ borderBottom: "1px solid #eee" }}>{t.name}</td>
                <td style={{ borderBottom: "1px solid #eee" }}>{t.delay} min</td>
                <td style={{ borderBottom: "1px solid #eee" }}>{t.passengers}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* CONGESTION PREDICTION */}
      <div style={{ padding: "1rem", border: "1px solid #ccc", borderRadius: "8px" }}>
        <h2 style={{ fontSize: "1.25rem" }}>Congestion Prediction</h2>
        <p>
          Congestion is expected to <b>{avgDelay > 5 ? "increase" : "remain stable"}</b>
        </p>
      </div>
    </div>
  );
}

// ================= MAIN =================
export default function App() {
  const [loggedIn, setLoggedIn] = useState(false);

  const handleLogin = (user, pass) => {
    if (user && pass) setLoggedIn(true);
  };

  return loggedIn ? <Dashboard /> : <Login onLogin={handleLogin} />;
}