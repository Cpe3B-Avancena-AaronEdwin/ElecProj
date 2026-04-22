import { useEffect, useState } from "react";

const API_BASE = import.meta.env.VITE_API_BASE_URL;

const DEFAULT_OPTIONS = {
  routes: false,
  stops: false,
  vehicles: false,
  trips: false,
  predictions: false,
  realtimeRoutes: false,
  realtimeStops: false,
  realtimeVehicles: false,
  realtimeTrips: false,
  realtimePredictions: false,
  predictionsLimit: 10,
  cacheMs: 5 * 60 * 1000,
};

function getCache(key, cacheMs) {
  if (typeof window === "undefined") return null;

  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!parsed?.savedAt || Date.now() - parsed.savedAt > cacheMs) {
      return null;
    }

    return parsed.data;
  } catch {
    return null;
  }
}

function setCache(key, data) {
  if (typeof window === "undefined") return;

  try {
    sessionStorage.setItem(
      key,
      JSON.stringify({
        savedAt: Date.now(),
        data,
      })
    );
  } catch {
    // ignore
  }
}

async function fetchCollectionOnce({ endpoint, cacheKey, cacheMs }) {
  const cached = getCache(cacheKey, cacheMs);
  if (cached) return cached;

  const response = await fetch(`${API_BASE}${endpoint}`);
  let data = null;

  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    throw new Error(data?.error || `Failed to fetch ${endpoint}`);
  }

  const safeData = Array.isArray(data) ? data : [];
  setCache(cacheKey, safeData);
  return safeData;
}

export function useFirestoreTransitData(options = {}) {
  const resolved = { ...DEFAULT_OPTIONS, ...options };

  const [routes, setRoutes] = useState([]);
  const [stops, setStops] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [trips, setTrips] = useState([]);
  const [predictions, setPredictions] = useState([]);
  const [loadingMapData, setLoadingMapData] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      setLoadingMapData(true);

      try {
        const tasks = [];

        if (resolved.routes) {
          tasks.push(
            fetchCollectionOnce({
              endpoint: "/api/routes",
              cacheKey: "api:routes",
              cacheMs: resolved.cacheMs,
            }).then((data) => {
              if (!cancelled) setRoutes(data);
            })
          );
        } else {
          setRoutes([]);
        }

        if (resolved.stops) {
          tasks.push(
            fetchCollectionOnce({
              endpoint: "/api/stops",
              cacheKey: "api:stops",
              cacheMs: resolved.cacheMs,
            }).then((data) => {
              if (!cancelled) setStops(data);
            })
          );
        } else {
          setStops([]);
        }

        if (resolved.vehicles) {
          tasks.push(
            fetchCollectionOnce({
              endpoint: "/api/vehicles",
              cacheKey: "api:vehicles",
              cacheMs: resolved.cacheMs,
            }).then((data) => {
              if (!cancelled) setVehicles(data);
            })
          );
        } else {
          setVehicles([]);
        }

        if (resolved.trips) {
          tasks.push(
            fetchCollectionOnce({
              endpoint: "/api/trips",
              cacheKey: "api:trips",
              cacheMs: resolved.cacheMs,
            }).then((data) => {
              if (!cancelled) setTrips(data);
            })
          );
        } else {
          setTrips([]);
        }

        if (resolved.predictions) {
          tasks.push(
            fetchCollectionOnce({
              endpoint: "/api/predictions",
              cacheKey: `api:predictions:${resolved.predictionsLimit}`,
              cacheMs: resolved.cacheMs,
            }).then((data) => {
              if (!cancelled) {
                setPredictions(
                  Array.isArray(data)
                    ? data.slice(0, resolved.predictionsLimit)
                    : []
                );
              }
            })
          );
        } else {
          setPredictions([]);
        }

        await Promise.all(tasks);
      } catch (error) {
        console.error("Failed to load API transit data:", error);
      } finally {
        if (!cancelled) setLoadingMapData(false);
      }
    }

    loadData();

    return () => {
      cancelled = true;
    };
  }, [
    resolved.routes,
    resolved.stops,
    resolved.vehicles,
    resolved.trips,
    resolved.predictions,
    resolved.predictionsLimit,
    resolved.cacheMs,
  ]);

  return {
    routes,
    stops,
    vehicles,
    trips,
    predictions,
    loadingMapData,
  };
}