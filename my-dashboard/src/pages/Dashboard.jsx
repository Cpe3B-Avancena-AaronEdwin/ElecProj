import React, { useEffect, useMemo, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import Papa from "papaparse";
import L from "leaflet";
import { useNavigate } from "react-router-dom";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { logoutUser } from "../firebase/auth";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebase/config";

delete L.Icon.Default.prototype._getIconUrl;

const stopIcon = new L.Icon({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

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

const TOMTOM_API_KEY = import.meta.env.VITE_TOMTOM_API_KEY;

export default function Dashboard() {
  const { user, role } = useAuth();
  const navigate = useNavigate();

  const [routes, setRoutes] = useState([]);
  const [stops, setStops] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [trafficLines, setTrafficLines] = useState([]);
  const [selectedRouteId, setSelectedRouteId] = useState("all");
  const [useFirestoreData, setUseFirestoreData] = useState(true);
  const [loadingMapData, setLoadingMapData] = useState(true);

  const [gtfsFallbackStops, setGtfsFallbackStops] = useState([]);

  useEffect(() => {
    const routesQuery = query(collection(db, "routes"), orderBy("createdAt", "desc"));
    const stopsQuery = query(collection(db, "stops"), orderBy("createdAt", "desc"));
    const vehiclesQuery = query(collection(db, "vehicles"), orderBy("createdAt", "desc"));

    const unsubRoutes = onSnapshot(
      routesQuery,
      (snapshot) => {
        const data = snapshot.docs.map((docItem) => ({
          id: docItem.id,
          ...docItem.data(),
        }));
        setRoutes(data);
      },
      (error) => {
        console.error("Routes snapshot error:", error);
      }
    );

    const unsubStops = onSnapshot(
      stopsQuery,
      (snapshot) => {
        const data = snapshot.docs.map((docItem) => ({
          id: docItem.id,
          ...docItem.data(),
        }));
        setStops(data);
        setLoadingMapData(false);
      },
      (error) => {
        console.error("Stops snapshot error:", error);
        setLoadingMapData(false);
      }
    );

    const unsubVehicles = onSnapshot(
      vehiclesQuery,
      (snapshot) => {
        const data = snapshot.docs.map((docItem) => ({
          id: docItem.id,
          ...docItem.data(),
        }));
        setVehicles(data);
      },
      (error) => {
        console.error("Vehicles snapshot error:", error);
      }
    );

    return () => {
      unsubRoutes();
      unsubStops();
      unsubVehicles();
    };
  }, []);

  useEffect(() => {
    const loadGtfsFallbackStops = async () => {
      try {
        const res = await fetch("/gtfs/stops.txt");
        const text = await res.text();
        const parsed = Papa.parse(text, { header: true });

        const formatted = parsed.data
          .filter((s) => s.stop_lat && s.stop_lon)
          .slice(0, 50)
          .map((s, i) => ({
            id: `gtfs-${i}`,
            stopName: s.stop_name,
            latitude: parseFloat(s.stop_lat),
            longitude: parseFloat(s.stop_lon),
            routeId: "",
            simulatedDelay: Math.floor(Math.random() * 10),
            simulatedPassengers: Math.floor(Math.random() * 100),
          }));

        setGtfsFallbackStops(formatted);
      } catch (err) {
        console.error("GTFS fallback load error:", err);
      }
    };

    loadGtfsFallbackStops();
  }, []);

  useEffect(() => {
    const fetchTraffic = async () => {
      if (!TOMTOM_API_KEY) return;

      try {
        const points = [
          [14.5547, 121.0244],
          [14.56, 121.03],
          [14.565, 121.02],
          [14.545, 121.015],
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

            let color = "#22c55e";
            if (ratio < 0.5) color = "#ef4444";
            else if (ratio < 0.8) color = "#facc15";

            allSegments.push({
              coords,
              color,
              currentSpeed: speed,
              freeFlowSpeed: free,
            });
          }
        }

        setTrafficLines(allSegments);
      } catch (err) {
        console.error("Traffic error:", err);
      }
    };

    fetchTraffic();
  }, []);

  const routeMap = useMemo(() => {
    const map = {};
    routes.forEach((route) => {
      map[route.id] = route;
    });
    return map;
  }, [routes]);

  const activeRoutes = useMemo(() => {
    return routes.filter((route) => route.active !== false);
  }, [routes]);

  const routeGroupedStops = useMemo(() => {
    const grouped = {};

    stops.forEach((stop) => {
      if (!stop.routeId || !routeMap[stop.routeId]) return;

      if (!grouped[stop.routeId]) grouped[stop.routeId] = [];
      grouped[stop.routeId].push(stop);
    });

    Object.keys(grouped).forEach((routeId) => {
      grouped[routeId].sort((a, b) => {
        const aLat = Number(a.latitude) || 0;
        const bLat = Number(b.latitude) || 0;
        return bLat - aLat;
      });
    });

    return grouped;
  }, [stops, routeMap]);

  const filteredStops = useMemo(() => {
    const sourceStops =
      useFirestoreData && stops.length > 0 ? stops : gtfsFallbackStops;

    if (selectedRouteId === "all") return sourceStops;

    return sourceStops.filter((stop) => stop.routeId === selectedRouteId);
  }, [useFirestoreData, stops, gtfsFallbackStops, selectedRouteId]);

  const filteredVehicles = useMemo(() => {
    if (selectedRouteId === "all") return vehicles;
    return vehicles.filter((vehicle) => vehicle.routeId === selectedRouteId);
  }, [vehicles, selectedRouteId]);

  const routePolylines = useMemo(() => {
    const entries = Object.entries(routeGroupedStops);

    return entries
      .filter(([routeId]) => selectedRouteId === "all" || routeId === selectedRouteId)
      .map(([routeId, groupedStops]) => ({
        routeId,
        color: routeMap[routeId]?.color || "#2563eb",
        routeName: routeMap[routeId]?.routeName || "Unnamed Route",
        routeCode: routeMap[routeId]?.routeCode || "N/A",
        positions: groupedStops
          .filter(
            (stop) =>
              stop.latitude !== undefined &&
              stop.longitude !== undefined &&
              !Number.isNaN(Number(stop.latitude)) &&
              !Number.isNaN(Number(stop.longitude))
          )
          .map((stop) => [Number(stop.latitude), Number(stop.longitude)]),
      }))
      .filter((item) => item.positions.length >= 2);
  }, [routeGroupedStops, routeMap, selectedRouteId]);

  const totalPassengers = filteredStops.reduce((sum, stop) => {
    return sum + Number(stop.simulatedPassengers || 0);
  }, 0);

  const avgDelay = filteredStops.length
    ? (
        filteredStops.reduce((sum, stop) => {
          return sum + Number(stop.simulatedDelay || 0);
        }, 0) / filteredStops.length
      ).toFixed(1)
    : 0;

  const activeVehicleCount = filteredVehicles.filter(
    (vehicle) => vehicle.status === "active"
  ).length;

  const mapCenter = useMemo(() => {
    if (filteredStops.length > 0) {
      const first = filteredStops.find(
        (stop) =>
          stop.latitude !== undefined &&
          stop.longitude !== undefined &&
          !Number.isNaN(Number(stop.latitude)) &&
          !Number.isNaN(Number(stop.longitude))
      );

      if (first) return [Number(first.latitude), Number(first.longitude)];
    }

    return [14.5547, 121.0244];
  }, [filteredStops]);

  const renderVehiclePosition = (vehicle) => {
    const routeStops = stops.filter((stop) => stop.routeId === vehicle.routeId);

    if (!routeStops.length) return null;

    const sourceStop =
      routeStops[Math.floor(Math.random() * routeStops.length)] || routeStops[0];

    const lat = Number(sourceStop.latitude);
    const lng = Number(sourceStop.longitude);

    if (Number.isNaN(lat) || Number.isNaN(lng)) return null;

    const offsetLat = lat + (Math.random() - 0.5) * 0.01;
    const offsetLng = lng + (Math.random() - 0.5) * 0.01;

    return [offsetLat, offsetLng];
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: "1rem",
        fontFamily: "Arial, sans-serif",
        background: "#0b1020",
        color: "white",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "1rem",
          gap: "1rem",
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1 style={{ fontSize: "2.5rem", margin: 0 }}>Smart Transit Dashboard</h1>
          <p style={{ margin: "0.5rem 0 0" }}>
            Logged in as: <strong>{user?.email || "Unknown"}</strong>
          </p>
          <p style={{ margin: "0.25rem 0 0" }}>
            Role: <strong>{role}</strong>
          </p>
        </div>

        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          {role === "admin" && (
            <button
              onClick={() => navigate("/admin")}
              style={{
                padding: "0.85rem 1.1rem",
                border: "none",
                borderRadius: "10px",
                background: "#2563eb",
                color: "#fff",
                cursor: "pointer",
                fontWeight: "bold",
              }}
            >
              Admin Panel
            </button>
          )}

          <button
            onClick={logoutUser}
            style={{
              padding: "0.85rem 1.1rem",
              border: "none",
              borderRadius: "10px",
              background: "#ef4444",
              color: "#fff",
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            Logout
          </button>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          gap: "1rem",
          marginBottom: "1rem",
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <div
          style={{
            padding: "1rem",
            borderRadius: "12px",
            minWidth: "220px",
            background: "#f5f5f5",
            color: "#111827",
          }}
        >
          Total Stops: {filteredStops.length}
        </div>

        <div
          style={{
            padding: "1rem",
            borderRadius: "12px",
            minWidth: "220px",
            background: "#f5f5f5",
            color: "#111827",
          }}
        >
          Total Passengers: {totalPassengers}
        </div>

        <div
          style={{
            padding: "1rem",
            borderRadius: "12px",
            minWidth: "220px",
            background: "#f5f5f5",
            color: "#111827",
          }}
        >
          Avg Delay: {avgDelay} mins
        </div>

        <div
          style={{
            padding: "1rem",
            borderRadius: "12px",
            minWidth: "220px",
            background: "#f5f5f5",
            color: "#111827",
          }}
        >
          Active Vehicles: {activeVehicleCount}
        </div>
      </div>

      <div
        style={{
          background: "#111827",
          border: "1px solid #1f2937",
          borderRadius: "14px",
          padding: "1rem",
          marginBottom: "1rem",
          display: "flex",
          gap: "1rem",
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <div>
          <label
            style={{
              display: "block",
              marginBottom: "0.45rem",
              fontWeight: "bold",
              color: "#cbd5e1",
            }}
          >
            Route Filter
          </label>
          <select
            value={selectedRouteId}
            onChange={(e) => setSelectedRouteId(e.target.value)}
            style={{
              padding: "0.8rem",
              borderRadius: "10px",
              border: "1px solid #334155",
              background: "#0b1220",
              color: "#fff",
              minWidth: "250px",
            }}
          >
            <option value="all">All Routes</option>
            {activeRoutes.map((route) => (
              <option key={route.id} value={route.id}>
                {route.routeCode} - {route.routeName}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            style={{
              display: "block",
              marginBottom: "0.45rem",
              fontWeight: "bold",
              color: "#cbd5e1",
            }}
          >
            Data Source
          </label>
          <select
            value={useFirestoreData ? "firestore" : "gtfs"}
            onChange={(e) => setUseFirestoreData(e.target.value === "firestore")}
            style={{
              padding: "0.8rem",
              borderRadius: "10px",
              border: "1px solid #334155",
              background: "#0b1220",
              color: "#fff",
              minWidth: "220px",
            }}
          >
            <option value="firestore">Firestore Admin Data</option>
            <option value="gtfs">GTFS Fallback</option>
          </select>
        </div>

        <div style={{ color: "#cbd5e1", fontSize: "0.95rem" }}>
          <div>Routes Loaded: {routes.length}</div>
          <div>Stops Loaded: {stops.length}</div>
          <div>Vehicles Loaded: {vehicles.length}</div>
        </div>
      </div>

      <div
        style={{
          marginBottom: "1rem",
          borderRadius: "14px",
          overflow: "hidden",
          border: "1px solid #1f2937",
        }}
      >
        {loadingMapData ? (
          <div
            style={{
              height: "560px",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              background: "#111827",
              color: "#fff",
              fontSize: "1.1rem",
            }}
          >
            Loading map data...
          </div>
        ) : (
          <MapContainer
            center={mapCenter}
            zoom={13}
            style={{ height: "560px", width: "100%" }}
          >
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

            {trafficLines.map((line, i) => (
              <Polyline
                key={`traffic-${i}`}
                positions={line.coords}
                pathOptions={{
                  color: line.color,
                  weight: 6,
                  opacity: 0.8,
                }}
              >
                <Popup>
                  <div>
                    <strong>Traffic Segment</strong>
                    <br />
                    Current Speed: {line.currentSpeed ?? "N/A"}
                    <br />
                    Free Flow Speed: {line.freeFlowSpeed ?? "N/A"}
                  </div>
                </Popup>
              </Polyline>
            ))}

            {routePolylines.map((line) => (
              <Polyline
                key={`route-${line.routeId}`}
                positions={line.positions}
                pathOptions={{
                  color: line.color,
                  weight: 4,
                  opacity: 0.95,
                }}
              >
                <Popup>
                  <div>
                    <strong>
                      {line.routeCode} - {line.routeName}
                    </strong>
                    <br />
                    Route line from Firestore stops
                  </div>
                </Popup>
              </Polyline>
            ))}

            {filteredStops.map((stop) => {
              const lat = Number(stop.latitude);
              const lng = Number(stop.longitude);

              if (Number.isNaN(lat) || Number.isNaN(lng)) return null;

              return (
                <Marker
                  key={stop.id}
                  position={[lat, lng]}
                  icon={stopIcon}
                >
                  <Popup>
                    <div>
                      <strong>{stop.stopName || "Unnamed Stop"}</strong>
                      <br />
                      Route:{" "}
                      {stop.routeId && routeMap[stop.routeId]
                        ? `${routeMap[stop.routeId].routeCode} - ${routeMap[stop.routeId].routeName}`
                        : "Unassigned"}
                      <br />
                      Delay: {stop.simulatedDelay ?? 0} min
                      <br />
                      Passengers: {stop.simulatedPassengers ?? 0}
                      <br />
                      Lat: {lat}
                      <br />
                      Lng: {lng}
                    </div>
                  </Popup>
                </Marker>
              );
            })}

            {useFirestoreData &&
              filteredVehicles.map((vehicle) => {
                const pos = renderVehiclePosition(vehicle);
                if (!pos) return null;

                return (
                  <Marker
                    key={`vehicle-${vehicle.id}`}
                    position={pos}
                    icon={vehicleIcon}
                  >
                    <Popup>
                      <div>
                        <strong>{vehicle.vehicleCode || "Vehicle"}</strong>
                        <br />
                        Plate: {vehicle.plateNumber || "N/A"}
                        <br />
                        Status: {vehicle.status || "N/A"}
                        <br />
                        Route:{" "}
                        {vehicle.routeId && routeMap[vehicle.routeId]
                          ? `${routeMap[vehicle.routeId].routeCode} - ${routeMap[vehicle.routeId].routeName}`
                          : "Unassigned"}
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
          </MapContainer>
        )}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "1rem",
        }}
      >
        <div
          style={{
            background: "#111827",
            border: "1px solid #1f2937",
            borderRadius: "14px",
            padding: "1rem",
          }}
        >
          <h3 style={{ marginTop: 0 }}>Route Summary</h3>
          {activeRoutes.length === 0 ? (
            <p style={{ margin: 0, color: "#cbd5e1" }}>No routes added yet.</p>
          ) : (
            activeRoutes.map((route) => (
              <div
                key={route.id}
                style={{
                  padding: "0.75rem 0",
                  borderBottom: "1px solid #1f2937",
                }}
              >
                <div style={{ fontWeight: "bold" }}>
                  {route.routeCode} - {route.routeName}
                </div>
                <div style={{ color: "#cbd5e1", marginTop: "0.25rem" }}>
                  Stops: {stops.filter((stop) => stop.routeId === route.id).length}
                </div>
                <div style={{ color: "#cbd5e1", marginTop: "0.25rem" }}>
                  Vehicles:{" "}
                  {vehicles.filter((vehicle) => vehicle.routeId === route.id).length}
                </div>
              </div>
            ))
          )}
        </div>

        <div
          style={{
            background: "#111827",
            border: "1px solid #1f2937",
            borderRadius: "14px",
            padding: "1rem",
          }}
        >
          <h3 style={{ marginTop: 0 }}>Map Notes</h3>
          <div style={{ color: "#cbd5e1", lineHeight: 1.7 }}>
            <div>• Blue markers = stops</div>
            <div>• Red markers = vehicles</div>
            <div>• Colored lines = routes from Firestore</div>
            <div>• Traffic lines use TomTom flow data</div>
            <div>• Admin changes now affect the dashboard map</div>
          </div>
        </div>
      </div>
    </div>
  );
}