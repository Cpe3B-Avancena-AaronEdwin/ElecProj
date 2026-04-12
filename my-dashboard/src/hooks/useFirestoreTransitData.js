import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";
import { db } from "../firebase/config";

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
    // ignore cache write errors
  }
}

function buildOrderedQuery(collectionName, orderField, itemLimit = null) {
  const parts = [collection(db, collectionName), orderBy(orderField, "desc")];
  const q = query(parts[0], parts[1], ...(itemLimit ? [limit(itemLimit)] : []));
  return q;
}

async function fetchCollectionOnce({
  collectionName,
  orderField,
  cacheKey,
  cacheMs,
  itemLimit = null,
}) {
  const cached = getCache(cacheKey, cacheMs);
  if (cached) return cached;

  const q = buildOrderedQuery(collectionName, orderField, itemLimit);
  const snap = await getDocs(q);
  const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

  setCache(cacheKey, data);
  return data;
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
    const unsubscribers = [];

    async function loadData() {
      setLoadingMapData(true);

      try {
        const tasks = [];

        if (resolved.routes) {
          if (resolved.realtimeRoutes) {
            const q = buildOrderedQuery("routes", "createdAt");
            const unsub = onSnapshot(q, (snap) => {
              if (cancelled) return;
              const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
              setRoutes(data);
              setCache("fs:routes", data);
            });
            unsubscribers.push(unsub);
          } else {
            tasks.push(
              fetchCollectionOnce({
                collectionName: "routes",
                orderField: "createdAt",
                cacheKey: "fs:routes",
                cacheMs: resolved.cacheMs,
              }).then((data) => {
                if (!cancelled) setRoutes(data);
              })
            );
          }
        } else {
          setRoutes([]);
        }

        if (resolved.stops) {
          if (resolved.realtimeStops) {
            const q = buildOrderedQuery("stops", "createdAt");
            const unsub = onSnapshot(q, (snap) => {
              if (cancelled) return;
              const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
              setStops(data);
              setCache("fs:stops", data);
            });
            unsubscribers.push(unsub);
          } else {
            tasks.push(
              fetchCollectionOnce({
                collectionName: "stops",
                orderField: "createdAt",
                cacheKey: "fs:stops",
                cacheMs: resolved.cacheMs,
              }).then((data) => {
                if (!cancelled) setStops(data);
              })
            );
          }
        } else {
          setStops([]);
        }

        if (resolved.vehicles) {
          if (resolved.realtimeVehicles) {
            const q = buildOrderedQuery("vehicles", "createdAt");
            const unsub = onSnapshot(q, (snap) => {
              if (cancelled) return;
              const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
              setVehicles(data);
              setCache("fs:vehicles", data);
            });
            unsubscribers.push(unsub);
          } else {
            tasks.push(
              fetchCollectionOnce({
                collectionName: "vehicles",
                orderField: "createdAt",
                cacheKey: "fs:vehicles",
                cacheMs: resolved.cacheMs,
              }).then((data) => {
                if (!cancelled) setVehicles(data);
              })
            );
          }
        } else {
          setVehicles([]);
        }

        if (resolved.trips) {
          if (resolved.realtimeTrips) {
            const q = buildOrderedQuery("trips", "createdAt");
            const unsub = onSnapshot(q, (snap) => {
              if (cancelled) return;
              const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
              setTrips(data);
              setCache("fs:trips", data);
            });
            unsubscribers.push(unsub);
          } else {
            tasks.push(
              fetchCollectionOnce({
                collectionName: "trips",
                orderField: "createdAt",
                cacheKey: "fs:trips",
                cacheMs: resolved.cacheMs,
              }).then((data) => {
                if (!cancelled) setTrips(data);
              })
            );
          }
        } else {
          setTrips([]);
        }

        if (resolved.predictions) {
          if (resolved.realtimePredictions) {
            const q = buildOrderedQuery(
              "predictions",
              "generatedAt",
              resolved.predictionsLimit
            );
            const unsub = onSnapshot(q, (snap) => {
              if (cancelled) return;
              const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
              setPredictions(data);
              setCache("fs:predictions", data);
            });
            unsubscribers.push(unsub);
          } else {
            tasks.push(
              fetchCollectionOnce({
                collectionName: "predictions",
                orderField: "generatedAt",
                cacheKey: `fs:predictions:${resolved.predictionsLimit}`,
                cacheMs: resolved.cacheMs,
                itemLimit: resolved.predictionsLimit,
              }).then((data) => {
                if (!cancelled) setPredictions(data);
              })
            );
          }
        } else {
          setPredictions([]);
        }

        await Promise.all(tasks);
      } catch (error) {
        console.error("Failed to load Firestore transit data:", error);
      } finally {
        if (!cancelled) setLoadingMapData(false);
      }
    }

    loadData();

    return () => {
      cancelled = true;
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, [
    resolved.routes,
    resolved.stops,
    resolved.vehicles,
    resolved.trips,
    resolved.predictions,
    resolved.realtimeRoutes,
    resolved.realtimeStops,
    resolved.realtimeVehicles,
    resolved.realtimeTrips,
    resolved.realtimePredictions,
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