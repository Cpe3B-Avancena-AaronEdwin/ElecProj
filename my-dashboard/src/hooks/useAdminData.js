import { useEffect, useMemo, useState } from "react";
import { createRouteMap, createVehicleMap } from "../utils/adminHelpers";

const API_BASE = import.meta.env.VITE_API_BASE_URL;

async function fetchJson(url, fallbackMessage) {
  const response = await fetch(url);
  let data = null;

  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    throw new Error(data?.error || fallbackMessage);
  }

  return Array.isArray(data) ? data : [];
}

export function useAdminData() {
  const [routes, setRoutes] = useState([]);
  const [stops, setStops] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadAdminData() {
      setLoading(true);

      try {
        const [routesData, stopsData, vehiclesData, tripsData] = await Promise.all([
          fetchJson(`${API_BASE}/api/routes`, "Failed to fetch routes."),
          fetchJson(`${API_BASE}/api/stops`, "Failed to fetch stops."),
          fetchJson(`${API_BASE}/api/vehicles`, "Failed to fetch vehicles."),
          fetchJson(`${API_BASE}/api/trips`, "Failed to fetch trips."),
        ]);

        if (cancelled) return;

        setRoutes(routesData);
        setStops(stopsData);
        setVehicles(vehiclesData);
        setTrips(tripsData);
      } catch (error) {
        console.error("Admin data fetch error:", error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadAdminData();

    return () => {
      cancelled = true;
    };
  }, []);

  const routeMap = useMemo(() => createRouteMap(routes), [routes]);
  const vehicleMap = useMemo(() => createVehicleMap(vehicles), [vehicles]);

  const showMessage = (text) => {
    setMessage(text);
    setTimeout(() => setMessage(""), 2500);
  };

  return {
    routes,
    stops,
    vehicles,
    trips,
    loading,
    message,
    showMessage,
    routeMap,
    vehicleMap,
  };
}