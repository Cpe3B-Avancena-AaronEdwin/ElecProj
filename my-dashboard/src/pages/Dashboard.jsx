import React, { useEffect, useMemo, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  CircleMarker,
  useMapEvents,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import Papa from "papaparse";
import L from "leaflet";
import { useNavigate } from "react-router-dom";
import {
  addDoc,
  collection,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";
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

const TOMTOM_API_KEY = (import.meta.env.VITE_TOMTOM_API_KEY || "").trim();

const TOMTOM_TRAFFIC_TILE_URL = TOMTOM_API_KEY
  ? `https://api.tomtom.com/traffic/map/4/tile/flow/relative0/{z}/{x}/{y}.png?key=${encodeURIComponent(
      TOMTOM_API_KEY
    )}`
  : "";

const GTFS_FILES = [
  "agency",
  "calendar",
  "feed_info",
  "frequencies",
  "routes",
  "shapes",
  "stop_times",
  "stops",
  "trips",
];

const MAX_GTFS_ROUTE_POLYLINE_POINTS = 900;
const GTFS_AUTO_STOP_MARKERS_ZOOM = 14;

export default function Dashboard() {
  const { user, role } = useAuth();
  const navigate = useNavigate();

  const [routes, setRoutes] = useState([]);
  const [stops, setStops] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [trips, setTrips] = useState([]);
  const [predictions, setPredictions] = useState([]);

  const [gtfsBundle, setGtfsBundle] = useState(null);
  const [gtfsLoading, setGtfsLoading] = useState(true);
  const [gtfsError, setGtfsError] = useState("");

  const [trafficSamples, setTrafficSamples] = useState([]);
  const [routeRoadPaths, setRouteRoadPaths] = useState([]);

  const [routingLoading, setRoutingLoading] = useState(false);
  const [predictionSaving, setPredictionSaving] = useState(false);

  const [selectedRouteId, setSelectedRouteId] = useState("all");
  const [useFirestoreData, setUseFirestoreData] = useState(true);
  const [loadingMapData, setLoadingMapData] = useState(true);
  const [trafficLoading, setTrafficLoading] = useState(false);
  const [trafficError, setTrafficError] = useState("");
  const [routingError, setRoutingError] = useState("");
  const [predictionError, setPredictionError] = useState("");
  const [predictionMessage, setPredictionMessage] = useState("");
  const [showTrafficOverlay, setShowTrafficOverlay] = useState(true);
  const [lastTrafficUpdated, setLastTrafficUpdated] = useState(null);
  const [lastRoutingUpdated, setLastRoutingUpdated] = useState(null);
  const [mapZoom, setMapZoom] = useState(13);

  useEffect(() => {
    const routesQuery = query(
      collection(db, "routes"),
      orderBy("createdAt", "desc")
    );
    const stopsQuery = query(
      collection(db, "stops"),
      orderBy("createdAt", "desc")
    );
    const vehiclesQuery = query(
      collection(db, "vehicles"),
      orderBy("createdAt", "desc")
    );
    const tripsQuery = query(
      collection(db, "trips"),
      orderBy("createdAt", "desc")
    );
    const predictionsQuery = query(
      collection(db, "predictions"),
      orderBy("generatedAt", "desc")
    );

    const unsubRoutes = onSnapshot(
      routesQuery,
      (snapshot) => {
        setRoutes(
          snapshot.docs.map((docItem) => ({
            id: docItem.id,
            ...docItem.data(),
          }))
        );
      },
      (error) => console.error("Routes snapshot error:", error)
    );

    const unsubStops = onSnapshot(
      stopsQuery,
      (snapshot) => {
        setStops(
          snapshot.docs.map((docItem) => ({
            id: docItem.id,
            ...docItem.data(),
          }))
        );
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
        setVehicles(
          snapshot.docs.map((docItem) => ({
            id: docItem.id,
            ...docItem.data(),
          }))
        );
      },
      (error) => console.error("Vehicles snapshot error:", error)
    );

    const unsubTrips = onSnapshot(
      tripsQuery,
      (snapshot) => {
        setTrips(
          snapshot.docs.map((docItem) => ({
            id: docItem.id,
            ...docItem.data(),
          }))
        );
      },
      (error) => console.error("Trips snapshot error:", error)
    );

    const unsubPredictions = onSnapshot(
      predictionsQuery,
      (snapshot) => {
        setPredictions(
          snapshot.docs.map((docItem) => ({
            id: docItem.id,
            ...docItem.data(),
          }))
        );
      },
      (error) => console.error("Predictions snapshot error:", error)
    );

    return () => {
      unsubRoutes();
      unsubStops();
      unsubVehicles();
      unsubTrips();
      unsubPredictions();
    };
  }, []);

  useEffect(() => {
    const loadGtfsBundle = async () => {
      setGtfsLoading(true);
      setGtfsError("");

      try {
        const fileResponses = await Promise.all(
          GTFS_FILES.map(async (name) => {
            const res = await fetch(`/gtfs/${name}.txt`);
            if (!res.ok) {
              throw new Error(`Failed to load /gtfs/${name}.txt`);
            }
            const text = await res.text();
            const parsed = Papa.parse(text, {
              header: true,
              skipEmptyLines: true,
              dynamicTyping: false,
            });
            return [name, parsed.data || []];
          })
        );

        const raw = Object.fromEntries(fileResponses);
        const built = buildGtfsBundle(raw);
        setGtfsBundle(built);
      } catch (err) {
        console.error("GTFS load error:", err);
        setGtfsError(err.message || "Failed to load GTFS data.");
        setGtfsBundle(null);
      } finally {
        setGtfsLoading(false);
      }
    };

    loadGtfsBundle();
  }, []);

  const firestoreRouteMap = useMemo(() => {
    const map = {};
    routes.forEach((route) => {
      map[route.id] = route;
    });
    return map;
  }, [routes]);

  const firestoreVehicleMap = useMemo(() => {
    const map = {};
    vehicles.forEach((vehicle) => {
      map[vehicle.id] = vehicle;
    });
    return map;
  }, [vehicles]);

  const firestoreRouteGroupedStops = useMemo(() => {
    const grouped = {};

    stops.forEach((stop) => {
      if (!stop.routeId || !firestoreRouteMap[stop.routeId]) return;
      if (!grouped[stop.routeId]) grouped[stop.routeId] = [];
      grouped[stop.routeId].push(stop);
    });

    Object.keys(grouped).forEach((routeId) => {
      grouped[routeId].sort((a, b) => {
        const aOrder = Number(a.stopOrder ?? a.sequence ?? 999999);
        const bOrder = Number(b.stopOrder ?? b.sequence ?? 999999);

        if (aOrder !== bOrder) return aOrder - bOrder;

        const aCreated = a.createdAt?.seconds || 0;
        const bCreated = b.createdAt?.seconds || 0;
        return aCreated - bCreated;
      });
    });

    return grouped;
  }, [stops, firestoreRouteMap]);

  const gtfsRouteMap = gtfsBundle?.routeMap || {};
  const gtfsVehicleMap = {};

  const hasFirestoreData =
    routes.length > 0 || stops.length > 0 || vehicles.length > 0 || trips.length > 0;

  const sourceMode = useFirestoreData && hasFirestoreData ? "firestore" : "gtfs";

  const sourceRoutes = sourceMode === "firestore" ? routes : gtfsBundle?.routes || [];
  const sourceStops = sourceMode === "firestore" ? stops : gtfsBundle?.stops || [];
  const sourceTrips = sourceMode === "firestore" ? trips : gtfsBundle?.trips || [];
  const sourceVehicles = sourceMode === "firestore" ? vehicles : [];
  const sourceRouteMap = sourceMode === "firestore" ? firestoreRouteMap : gtfsRouteMap;
  const sourceVehicleMap = sourceMode === "firestore" ? firestoreVehicleMap : gtfsVehicleMap;
  const sourceGroupedStops =
    sourceMode === "firestore"
      ? firestoreRouteGroupedStops
      : gtfsBundle?.routeGroupedStops || {};

  const activeRoutes = useMemo(
    () => sourceRoutes.filter((route) => route.active !== false),
    [sourceRoutes]
  );

  useEffect(() => {
    if (
      sourceMode === "gtfs" &&
      selectedRouteId === "all" &&
      activeRoutes.length > 0
    ) {
      setSelectedRouteId(activeRoutes[0].id);
    }
  }, [sourceMode, selectedRouteId, activeRoutes]);

  const filteredStops = useMemo(() => {
    if (sourceMode === "gtfs" && selectedRouteId === "all") return [];
    if (selectedRouteId === "all") return sourceStops;
    return sourceStops.filter((stop) => stop.routeId === selectedRouteId);
  }, [sourceStops, selectedRouteId, sourceMode]);

  const filteredVehicles = useMemo(() => {
    if (selectedRouteId === "all") return sourceVehicles;
    return sourceVehicles.filter((vehicle) => vehicle.routeId === selectedRouteId);
  }, [sourceVehicles, selectedRouteId]);

  const filteredTrips = useMemo(() => {
    if (selectedRouteId === "all") return sourceTrips;
    return sourceTrips.filter((trip) => trip.routeId === selectedRouteId);
  }, [sourceTrips, selectedRouteId]);

  const buildTrafficSamplePoints = useMemo(() => {
    if (sourceMode === "gtfs") return [];

    const validStops = filteredStops.filter(
      (stop) =>
        stop.latitude !== undefined &&
        stop.longitude !== undefined &&
        !Number.isNaN(Number(stop.latitude)) &&
        !Number.isNaN(Number(stop.longitude))
    );

    const base = validStops.length
      ? validStops
      : sourceStops.filter(
          (stop) =>
            stop.latitude !== undefined &&
            stop.longitude !== undefined &&
            !Number.isNaN(Number(stop.latitude)) &&
            !Number.isNaN(Number(stop.longitude))
        );

    if (!base.length) {
      return [
        { id: "p1", name: "Makati Center", lat: 14.5547, lng: 121.0244 },
        { id: "p2", name: "Ayala Area", lat: 14.56, lng: 121.03 },
        { id: "p3", name: "Buendia Area", lat: 14.565, lng: 121.02 },
      ];
    }

    const sampleCount = Math.min(6, base.length);
    const step = Math.max(1, Math.floor(base.length / sampleCount));
    const samples = [];

    for (let index = 0; index < base.length && samples.length < sampleCount; index += step) {
      const stop = base[index];
      samples.push({
        id: `sample-${stop.id}-${samples.length}`,
        name: stop.stopName || stop.stop_name || `Stop ${samples.length + 1}`,
        lat: Number(stop.latitude),
        lng: Number(stop.longitude),
      });
    }

    return samples;
  }, [filteredStops, sourceStops, sourceMode]);

  const fetchTraffic = async () => {
    if (sourceMode === "gtfs") {
      setTrafficSamples([]);
      setTrafficError("");
      return;
    }

    if (!TOMTOM_API_KEY) {
      setTrafficError("Missing TomTom API key.");
      setTrafficSamples([]);
      return;
    }

    if (!buildTrafficSamplePoints.length) {
      setTrafficSamples([]);
      return;
    }

    setTrafficLoading(true);
    setTrafficError("");

    try {
      const responses = await Promise.all(
        buildTrafficSamplePoints.map(async (point) => {
          const url = `https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json?key=${encodeURIComponent(
            TOMTOM_API_KEY
          )}&point=${point.lat},${point.lng}`;

          const res = await fetch(url);

          if (!res.ok) {
            let errorText = "";
            try {
              errorText = await res.text();
            } catch {
              errorText = "";
            }
            throw new Error(`TomTom request failed (${res.status}) ${errorText}`);
          }

          const data = await res.json();
          const segment = data?.flowSegmentData;

          if (!segment) {
            return { ...point, usable: false };
          }

          const currentSpeed = Number(segment.currentSpeed || 0);
          const freeFlowSpeed = Number(segment.freeFlowSpeed || 0);
          const ratio = freeFlowSpeed > 0 ? currentSpeed / freeFlowSpeed : 1;

          let color = "#22c55e";
          let severity = "Light";

          if (segment.roadClosure === true) {
            color = "#6b7280";
            severity = "Closed";
          } else if (ratio < 0.35) {
            color = "#ef4444";
            severity = "Heavy";
          } else if (ratio < 0.75) {
            color = "#f59e0b";
            severity = "Moderate";
          }

          return {
            ...point,
            usable: true,
            color,
            severity,
            currentSpeed,
            freeFlowSpeed,
            ratio,
            confidence: segment.confidence ?? null,
            roadClosure: segment.roadClosure ?? false,
            currentTravelTime: segment.currentTravelTime ?? null,
            freeFlowTravelTime: segment.freeFlowTravelTime ?? null,
          };
        })
      );

      setTrafficSamples(responses);
      setLastTrafficUpdated(new Date());
    } catch (err) {
      console.error("Traffic error:", err);
      setTrafficError(err.message || "Failed to load traffic data.");
      setTrafficSamples([]);
    } finally {
      setTrafficLoading(false);
    }
  };

  const fetchRoadSnappedRoutes = async () => {
    if (sourceMode === "gtfs") {
      setRoutingError("");
      setLastRoutingUpdated(new Date());
      return;
    }

    if (!TOMTOM_API_KEY) {
      setRoutingError("Missing TomTom API key.");
      setRouteRoadPaths([]);
      return;
    }

    setRoutingLoading(true);
    setRoutingError("");

    try {
      const entries = Object.entries(sourceGroupedStops);

      if (!entries.length) {
        setRouteRoadPaths([]);
        return;
      }

      const filteredEntries =
        selectedRouteId === "all"
          ? entries
          : entries.filter(([routeId]) => routeId === selectedRouteId);

      const results = await Promise.all(
        filteredEntries.map(async ([routeId, groupedStops]) => {
          const validStops = groupedStops.filter(
            (stop) =>
              stop.latitude !== undefined &&
              stop.longitude !== undefined &&
              !Number.isNaN(Number(stop.latitude)) &&
              !Number.isNaN(Number(stop.longitude))
          );

          const fallbackPositions = validStops.map((stop) => [
            Number(stop.latitude),
            Number(stop.longitude),
          ]);

          if (validStops.length < 2) {
            return {
              routeId,
              routeCode: sourceRouteMap[routeId]?.routeCode || "N/A",
              routeName: sourceRouteMap[routeId]?.routeName || "Unnamed Route",
              color: sourceRouteMap[routeId]?.color || "#2563eb",
              positions: fallbackPositions,
              usedRoutingApi: false,
              source: "stops",
              summary: null,
            };
          }

          const coordinatePath = validStops
            .map((stop) => `${Number(stop.latitude)},${Number(stop.longitude)}`)
            .join(":");

          const url =
            `https://api.tomtom.com/routing/1/calculateRoute/${coordinatePath}/json` +
            `?key=${encodeURIComponent(TOMTOM_API_KEY)}` +
            `&traffic=true` +
            `&routeType=fastest` +
            `&routeRepresentation=polyline` +
            `&computeTravelTimeFor=all` +
            `&instructionsType=text`;

          try {
            const res = await fetch(url);
            if (!res.ok) {
              return {
                routeId,
                routeCode: sourceRouteMap[routeId]?.routeCode || "N/A",
                routeName: sourceRouteMap[routeId]?.routeName || "Unnamed Route",
                color: sourceRouteMap[routeId]?.color || "#2563eb",
                positions: fallbackPositions,
                usedRoutingApi: false,
                source: "stops",
                summary: null,
              };
            }

            const data = await res.json();
            const firstRoute = data?.routes?.[0];
            const positions = (firstRoute?.legs || []).flatMap((leg) =>
              (leg.points || [])
                .filter(
                  (point) =>
                    point &&
                    point.latitude !== undefined &&
                    point.longitude !== undefined
                )
                .map((point) => [Number(point.latitude), Number(point.longitude)])
            );

            if (positions.length < 2) {
              return {
                routeId,
                routeCode: sourceRouteMap[routeId]?.routeCode || "N/A",
                routeName: sourceRouteMap[routeId]?.routeName || "Unnamed Route",
                color: sourceRouteMap[routeId]?.color || "#2563eb",
                positions: fallbackPositions,
                usedRoutingApi: false,
                source: "stops",
                summary: null,
              };
            }

            return {
              routeId,
              routeCode: sourceRouteMap[routeId]?.routeCode || "N/A",
              routeName: sourceRouteMap[routeId]?.routeName || "Unnamed Route",
              color: sourceRouteMap[routeId]?.color || "#2563eb",
              positions,
              usedRoutingApi: true,
              source: "tomtom",
              summary: firstRoute.summary || null,
            };
          } catch {
            return {
              routeId,
              routeCode: sourceRouteMap[routeId]?.routeCode || "N/A",
              routeName: sourceRouteMap[routeId]?.routeName || "Unnamed Route",
              color: sourceRouteMap[routeId]?.color || "#2563eb",
              positions: fallbackPositions,
              usedRoutingApi: false,
              source: "stops",
              summary: null,
            };
          }
        })
      );

      const usableResults = results.filter((item) => item.positions.length >= 2);
      setRouteRoadPaths(usableResults);
      setLastRoutingUpdated(new Date());

      if (!usableResults.some((item) => item.usedRoutingApi)) {
        setRoutingError(
          "TomTom routing could not build road-following lines, so the dashboard is using stop-to-stop fallback lines."
        );
      }
    } catch (err) {
      console.error("Routing error:", err);
      setRoutingError(err.message || "Failed to build route lines.");
      setRouteRoadPaths([]);
    } finally {
      setRoutingLoading(false);
    }
  };

  useEffect(() => {
    if (sourceMode === "gtfs") {
      setTrafficSamples([]);
      setTrafficError("");
      return;
    }

    if (sourceStops.length > 0) {
      fetchTraffic();
      const interval = setInterval(() => {
        fetchTraffic();
      }, 60000);

      return () => clearInterval(interval);
    }

    return undefined;
  }, [sourceMode, sourceStops.length, selectedRouteId, buildTrafficSamplePoints.length]);

  useEffect(() => {
    if (sourceMode === "gtfs") {
      setRoutingError("");
      setLastRoutingUpdated(new Date());
      return;
    }

    if (sourceStops.length > 0) {
      fetchRoadSnappedRoutes();
    } else {
      setRouteRoadPaths([]);
    }
  }, [sourceMode, selectedRouteId, sourceStops.length, routes.length]);

  const filteredRoutePaths = useMemo(() => {
    if (sourceMode === "gtfs") {
      if (selectedRouteId === "all") return [];

      return (gtfsBundle?.routeShapePaths || [])
        .filter((item) => item.routeId === selectedRouteId)
        .map((item) => ({
          ...item,
          positions: simplifyPolyline(item.positions, MAX_GTFS_ROUTE_POLYLINE_POINTS),
        }));
    }

    return routeRoadPaths.filter(
      (item) => selectedRouteId === "all" || item.routeId === selectedRouteId
    );
  }, [sourceMode, selectedRouteId, gtfsBundle, routeRoadPaths]);

  const trafficSummary = useMemo(() => {
    const usable = trafficSamples.filter((item) => item.usable);

    const summary = {
      total: usable.length,
      light: 0,
      moderate: 0,
      heavy: 0,
      closed: 0,
      averageCurrentSpeed: 0,
      averageFreeFlowSpeed: 0,
    };

    if (!usable.length) return summary;

    let currentTotal = 0;
    let freeFlowTotal = 0;

    usable.forEach((item) => {
      currentTotal += Number(item.currentSpeed || 0);
      freeFlowTotal += Number(item.freeFlowSpeed || 0);

      if (item.severity === "Closed") summary.closed += 1;
      else if (item.severity === "Heavy") summary.heavy += 1;
      else if (item.severity === "Moderate") summary.moderate += 1;
      else summary.light += 1;
    });

    summary.averageCurrentSpeed = (currentTotal / usable.length).toFixed(1);
    summary.averageFreeFlowSpeed = (freeFlowTotal / usable.length).toFixed(1);

    return summary;
  }, [trafficSamples]);

  const totalPassengers = filteredStops.reduce(
    (sum, stop) => sum + Number(stop.simulatedPassengers || stop.estimatedPassengers || 0),
    0
  );

  const avgStopDelay = filteredStops.length
    ? (
        filteredStops.reduce(
          (sum, stop) => sum + Number(stop.simulatedDelay || stop.averageDelay || 0),
          0
        ) / filteredStops.length
      ).toFixed(1)
    : 0;

  const activeVehicleCount = filteredVehicles.filter(
    (vehicle) => vehicle.status === "active"
  ).length;

  const activeTripsCount = filteredTrips.filter(
    (trip) => trip.status === "active"
  ).length;

  const delayedTripsCount = filteredTrips.filter(
    (trip) => trip.status === "delayed" || Number(trip.delayMinutes || 0) > 0
  ).length;

  const completedTripsCount = filteredTrips.filter(
    (trip) => trip.status === "completed"
  ).length;

  const cancelledTripsCount = filteredTrips.filter(
    (trip) => trip.status === "cancelled"
  ).length;

  const scheduledTripsCount = filteredTrips.filter(
    (trip) => trip.status === "scheduled"
  ).length;

  const avgTripDelayValue = filteredTrips.length
    ? filteredTrips.reduce(
        (sum, trip) => sum + Number(trip.delayMinutes || 0),
        0
      ) / filteredTrips.length
    : 0;

  const avgTripDelay = avgTripDelayValue.toFixed(1);

  const onTimeTripsCount = filteredTrips.filter(
    (trip) => Number(trip.delayMinutes || 0) === 0 && trip.status !== "cancelled"
  ).length;

  const onTimeRate = filteredTrips.length
    ? ((onTimeTripsCount / filteredTrips.length) * 100).toFixed(1)
    : "0.0";

  const mostDelayedRoute = useMemo(() => {
    if (!filteredTrips.length) return null;

    const delayPerRoute = {};

    filteredTrips.forEach((trip) => {
      if (!trip.routeId) return;

      if (!delayPerRoute[trip.routeId]) {
        delayPerRoute[trip.routeId] = { totalDelay: 0, count: 0 };
      }

      delayPerRoute[trip.routeId].totalDelay += Number(trip.delayMinutes || 0);
      delayPerRoute[trip.routeId].count += 1;
    });

    let bestRouteId = null;
    let highestAverage = -1;

    Object.entries(delayPerRoute).forEach(([routeId, data]) => {
      const average = data.count ? data.totalDelay / data.count : 0;
      if (average > highestAverage) {
        highestAverage = average;
        bestRouteId = routeId;
      }
    });

    if (!bestRouteId || !sourceRouteMap[bestRouteId]) return null;

    return {
      routeId: bestRouteId,
      routeCode: sourceRouteMap[bestRouteId].routeCode || "N/A",
      routeName: sourceRouteMap[bestRouteId].routeName || "Unnamed Route",
      averageDelay: highestAverage.toFixed(1),
    };
  }, [filteredTrips, sourceRouteMap]);

  const currentPrediction = useMemo(() => {
    const selectedRoute = selectedRouteId === "all" ? null : sourceRouteMap[selectedRouteId];
    const now = new Date();
    const currentHour = now.getHours();
    const isRushHour =
      (currentHour >= 7 && currentHour <= 9) ||
      (currentHour >= 17 && currentHour <= 19);

    const usableTraffic = trafficSamples.filter((item) => item.usable);
    const heavyTrafficCount = usableTraffic.filter(
      (item) => item.severity === "Heavy"
    ).length;
    const moderateTrafficCount = usableTraffic.filter(
      (item) => item.severity === "Moderate"
    ).length;
    const roadClosedCount = usableTraffic.filter(
      (item) => item.severity === "Closed"
    ).length;

    let score = 0;
    const reasons = [];

    if (roadClosedCount > 0) {
      score += 3;
      reasons.push("Road closure detected");
    }
    if (heavyTrafficCount > 0) {
      score += 2;
      reasons.push("Heavy traffic detected");
    }
    if (moderateTrafficCount > 1) {
      score += 1;
      reasons.push("Moderate traffic on multiple points");
    }
    if (avgTripDelayValue >= 10) {
      score += 2;
      reasons.push("Route has recent delays");
    } else if (avgTripDelayValue >= 5) {
      score += 1;
      reasons.push("Average delay is rising");
    }
    if (isRushHour) {
      score += 1;
      reasons.push("Rush hour");
    }

    const getLevel = (value) => {
      if (value >= 6) return "Very High";
      if (value >= 4) return "High";
      if (value >= 2) return "Medium";
      return "Low";
    };

    return {
      routeId: selectedRoute?.id || selectedRouteId || "all",
      routeCode: selectedRoute?.routeCode || "ALL",
      routeName: selectedRoute?.routeName || "All Routes",
      predictedCongestion:
        roadClosedCount > 0
          ? "Very High"
          : getLevel((heavyTrafficCount > 0 ? 3 : 0) + (moderateTrafficCount > 1 ? 1 : 0) + (isRushHour ? 1 : 0)),
      predictedDelayRisk: getLevel(score),
      reason: reasons.length ? reasons : ["Normal operating conditions"],
      basedOnTrafficSamples: usableTraffic.length,
      basedOnAvgDelay: Number(avgTripDelay),
      generatedAt: new Date().toISOString(),
      score,
    };
  }, [selectedRouteId, sourceRouteMap, trafficSamples, avgTripDelay, avgTripDelayValue]);

  const savePredictionToFirestore = async () => {
    setPredictionSaving(true);
    setPredictionError("");
    setPredictionMessage("");

    try {
      await addDoc(collection(db, "predictions"), {
        routeId: currentPrediction.routeId,
        routeCode: currentPrediction.routeCode,
        routeName: currentPrediction.routeName,
        predictedCongestion: currentPrediction.predictedCongestion,
        predictedDelayRisk: currentPrediction.predictedDelayRisk,
        reason: currentPrediction.reason,
        basedOnTrafficSamples: currentPrediction.basedOnTrafficSamples,
        basedOnAvgDelay: currentPrediction.basedOnAvgDelay,
        generatedAt: serverTimestamp(),
        generatedAtText: new Date().toISOString(),
        score: currentPrediction.score,
        createdBy: user?.uid || null,
        sourceMode,
      });

      setPredictionMessage("Prediction saved to Firestore.");
    } catch (err) {
      console.error("Save prediction error:", err);
      setPredictionError(err.message || "Failed to save prediction.");
    } finally {
      setPredictionSaving(false);
    }
  };

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

    if (sourceMode === "gtfs" && selectedRouteId !== "all") {
      const selectedLine = filteredRoutePaths[0];
      if (selectedLine?.positions?.length) return selectedLine.positions[0];
    }

    return [14.5547, 121.0244];
  }, [filteredStops, filteredRoutePaths, sourceMode, selectedRouteId]);

  const renderVehiclePosition = (vehicle) => {
    const routeStops = sourceStops.filter((stop) => stop.routeId === vehicle.routeId);
    if (!routeStops.length) return null;

    const baseIndex =
      vehicle.id?.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0) || 0;

    const sourceStop = routeStops[baseIndex % routeStops.length];
    const lat = Number(sourceStop.latitude);
    const lng = Number(sourceStop.longitude);

    if (Number.isNaN(lat) || Number.isNaN(lng)) return null;

    const offsetSeed = (baseIndex % 10) * 0.001;
    return [lat + offsetSeed, lng - offsetSeed];
  };

  const recentTrips = useMemo(() => [...filteredTrips].slice(0, 5), [filteredTrips]);

  const recentPredictions = useMemo(() => {
    const items =
      selectedRouteId === "all"
        ? predictions
        : predictions.filter((item) => item.routeId === selectedRouteId);
    return items.slice(0, 5);
  }, [predictions, selectedRouteId]);

  const isOverallLoading = sourceMode === "gtfs" ? gtfsLoading : loadingMapData;
  const shouldShowGtfsSelectMessage =
    sourceMode === "gtfs" && selectedRouteId === "all";
  const shouldRenderStopMarkers =
    sourceMode === "firestore" || mapZoom >= GTFS_AUTO_STOP_MARKERS_ZOOM;

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
          <h1 style={{ fontSize: "2.5rem", margin: 0 }}>
            Smart Transit Dashboard
          </h1>
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
              style={primaryButtonStyle("#2563eb")}
            >
              Admin Panel
            </button>
          )}

          <button onClick={logoutUser} style={primaryButtonStyle("#ef4444")}>
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
        <StatCard label="Total Stops" value={filteredStops.length} />
        <StatCard label="Total Passengers" value={totalPassengers} />
        <StatCard label="Avg Stop Delay" value={`${avgStopDelay} mins`} />
        <StatCard label="Avg Trip Delay" value={`${avgTripDelay} mins`} />
        <StatCard label="Active Vehicles" value={activeVehicleCount} />
        <StatCard label="Active Trips" value={activeTripsCount} />
        <StatCard label="Delayed Trips" value={delayedTripsCount} />
        <StatCard label="On-Time Rate" value={`${onTimeRate}%`} />
      </div>

      <div style={toolbarStyle}>
        <div>
          <label style={filterLabelStyle}>Route Filter</label>
          <select
            value={selectedRouteId}
            onChange={(e) => setSelectedRouteId(e.target.value)}
            style={filterSelectStyle}
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
          <label style={filterLabelStyle}>Data Source</label>
          <select
            value={sourceMode}
            onChange={(e) => setUseFirestoreData(e.target.value === "firestore")}
            style={filterSelectStyle}
          >
            <option value="firestore" disabled={!hasFirestoreData}>
              Firestore Admin Data
            </option>
            <option value="gtfs">GTFS Full Dataset</option>
          </select>
        </div>

        <div>
          <label style={filterLabelStyle}>Traffic Overlay</label>
          <select
            value={showTrafficOverlay ? "on" : "off"}
            onChange={(e) => setShowTrafficOverlay(e.target.value === "on")}
            style={filterSelectStyle}
            disabled={sourceMode === "gtfs"}
          >
            <option value="on">Show Traffic</option>
            <option value="off">Hide Traffic</option>
          </select>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            gap: "0.75rem",
            flexWrap: "wrap",
          }}
        >
          <button
            onClick={fetchTraffic}
            disabled={trafficLoading || !TOMTOM_API_KEY || sourceMode === "gtfs"}
            style={primaryButtonStyle(
              trafficLoading || sourceMode === "gtfs" ? "#475569" : "#10b981"
            )}
          >
            {trafficLoading ? "Refreshing Traffic..." : "Refresh Traffic"}
          </button>

          <button
            onClick={fetchRoadSnappedRoutes}
            disabled={
              routingLoading ||
              (sourceMode === "firestore" && !TOMTOM_API_KEY && sourceStops.length > 0)
            }
            style={primaryButtonStyle(routingLoading ? "#475569" : "#2563eb")}
          >
            {routingLoading ? "Building Routes..." : "Refresh Route Lines"}
          </button>

          <button
            onClick={savePredictionToFirestore}
            disabled={predictionSaving}
            style={primaryButtonStyle(predictionSaving ? "#475569" : "#7c3aed")}
          >
            {predictionSaving ? "Saving Prediction..." : "Save Prediction"}
          </button>
        </div>

        <div style={{ color: "#cbd5e1", fontSize: "0.95rem" }}>
          <div>Source Mode: {sourceMode.toUpperCase()}</div>
          <div>Routes Loaded: {sourceRoutes.length}</div>
          <div>Stops Loaded: {sourceStops.length}</div>
          <div>Trips Loaded: {sourceTrips.length}</div>
          <div>Vehicles Loaded: {sourceVehicles.length}</div>
          <div>
            GTFS Status: {gtfsLoading ? "Loading..." : gtfsError ? "Error" : gtfsBundle ? "Ready" : "Not Loaded"}
          </div>
          <div>
            Traffic Updated: {lastTrafficUpdated ? lastTrafficUpdated.toLocaleTimeString() : "—"}
          </div>
          <div>
            Routes Updated: {lastRoutingUpdated ? lastRoutingUpdated.toLocaleTimeString() : "—"}
          </div>
          <div>Map Zoom: {mapZoom}</div>
        </div>
      </div>

      {shouldShowGtfsSelectMessage && (
        <div
          style={{
            marginBottom: "1rem",
            background: "#3a2d00",
            border: "1px solid #a16207",
            color: "#fde68a",
            borderRadius: "12px",
            padding: "0.9rem 1rem",
            fontWeight: "bold",
          }}
        >
          GTFS mode is optimized to show one route at a time. Select a route first to display stops and shape lines.
        </div>
      )}

      {sourceMode === "gtfs" && mapZoom < GTFS_AUTO_STOP_MARKERS_ZOOM && selectedRouteId !== "all" && (
        <div
          style={{
            marginBottom: "1rem",
            background: "#172554",
            border: "1px solid #1d4ed8",
            color: "#bfdbfe",
            borderRadius: "12px",
            padding: "0.9rem 1rem",
            fontWeight: "bold",
          }}
        >
          Zoom in to level {GTFS_AUTO_STOP_MARKERS_ZOOM}+ to show stop markers.
        </div>
      )}

      <div style={panelGridStyle}>
        <div style={panelStyle}>
          <h3 style={{ marginTop: 0 }}>GTFS Dataset Status</h3>
          <SummaryRow label="Agency" value={gtfsBundle?.agencyName || "-"} />
          <SummaryRow label="Feed Version" value={gtfsBundle?.feedVersion || "-"} />
          <SummaryRow label="GTFS Routes" value={gtfsBundle?.routes.length || 0} />
          <SummaryRow label="GTFS Stops" value={gtfsBundle?.stops.length || 0} />
          <SummaryRow label="GTFS Trips" value={gtfsBundle?.trips.length || 0} />
          <SummaryRow label="GTFS Shapes" value={gtfsBundle?.shapeCount || 0} />
          <SummaryRow label="GTFS Stop Times" value={gtfsBundle?.stopTimeCount || 0} />
          <div style={statusTextStyle(gtfsError)}>
            {gtfsError || "The dashboard now reads routes, trips, stop_times, and shapes from your GTFS folder."}
          </div>
        </div>

        <div style={panelStyle}>
          <h3 style={{ marginTop: 0 }}>Traffic Summary</h3>
          <SummaryRow label="Usable Samples" value={trafficSummary.total} />
          <SummaryRow label="Light Congestion" value={trafficSummary.light} />
          <SummaryRow label="Moderate Congestion" value={trafficSummary.moderate} />
          <SummaryRow label="Heavy Congestion" value={trafficSummary.heavy} />
          <SummaryRow label="Road Closed" value={trafficSummary.closed} />
          <SummaryRow
            label="Avg Current Speed"
            value={`${trafficSummary.averageCurrentSpeed} km/h`}
          />
          <SummaryRow
            label="Avg Free Flow Speed"
            value={`${trafficSummary.averageFreeFlowSpeed} km/h`}
          />
        </div>

        <div style={panelStyle}>
          <h3 style={{ marginTop: 0 }}>Routing Status</h3>
          <SummaryRow label="Route Lines" value={filteredRoutePaths.length} />
          <SummaryRow
            label="Using TomTom"
            value={filteredRoutePaths.filter((item) => item.usedRoutingApi).length}
          />
          <SummaryRow
            label="Using GTFS Shapes"
            value={filteredRoutePaths.filter((item) => item.source === "gtfs-shapes").length}
          />
          <SummaryRow
            label="Stop Fallback"
            value={filteredRoutePaths.filter((item) => item.source === "stops").length}
          />
          <div style={statusTextStyle(routingError)}>
            {routingError || "Route visualization is ready."}
          </div>
        </div>
      </div>

      <div style={panelGridStyle}>
        <div style={panelStyle}>
          <h3 style={{ marginTop: 0 }}>Current Prediction</h3>
          <SummaryRow label="Route" value={`${currentPrediction.routeCode} - ${currentPrediction.routeName}`} />
          <SummaryRow label="Predicted Congestion" value={currentPrediction.predictedCongestion} />
          <SummaryRow label="Predicted Delay Risk" value={currentPrediction.predictedDelayRisk} />
          <SummaryRow label="Prediction Score" value={currentPrediction.score} />
          <div style={{ marginTop: "0.9rem", color: "#cbd5e1" }}>
            <strong style={{ color: "#fff" }}>Reasons:</strong>
            <ul style={{ marginTop: "0.5rem", paddingLeft: "1.25rem" }}>
              {currentPrediction.reason.map((item, index) => (
                <li key={index} style={{ marginBottom: "0.35rem" }}>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div style={panelStyle}>
          <h3 style={{ marginTop: 0 }}>Traffic Status</h3>
          <SummaryRow label="API Key" value={TOMTOM_API_KEY ? "Configured" : "Missing"} />
          <SummaryRow label="Overlay" value={sourceMode === "gtfs" ? "Disabled in GTFS mode" : showTrafficOverlay ? "Visible" : "Hidden"} />
          <SummaryRow label="Loading" value={trafficLoading ? "Yes" : "No"} />
          <SummaryRow label="Sample Points" value={buildTrafficSamplePoints.length} />
          <div style={statusTextStyle(trafficError)}>
            {trafficError || (sourceMode === "gtfs" ? "Traffic is disabled in GTFS mode for performance." : "Traffic monitoring is running.")}
          </div>
        </div>

        <div style={panelStyle}>
          <h3 style={{ marginTop: 0 }}>Prediction Status</h3>
          <SummaryRow label="Predicted Congestion" value={currentPrediction.predictedCongestion} />
          <SummaryRow label="Predicted Delay Risk" value={currentPrediction.predictedDelayRisk} />
          <SummaryRow label="Traffic Samples" value={currentPrediction.basedOnTrafficSamples} />
          <SummaryRow label="Avg Delay Basis" value={`${currentPrediction.basedOnAvgDelay} mins`} />
          <div style={statusTextStyle(predictionError)}>
            {predictionError || predictionMessage || "Prediction system is running."}
          </div>
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
        {isOverallLoading ? (
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
          <MapContainer center={mapCenter} zoom={13} style={{ height: "560px", width: "100%" }}>
            <MapZoomHandler setMapZoom={setMapZoom} />
            <MapRecenter center={mapCenter} />
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution="&copy; OpenStreetMap contributors"
            />

            {sourceMode === "firestore" && showTrafficOverlay && TOMTOM_TRAFFIC_TILE_URL && (
              <TileLayer url={TOMTOM_TRAFFIC_TILE_URL} opacity={0.85} />
            )}

            {filteredRoutePaths.map((line) => (
              <Polyline
                key={`route-line-${line.routeId}`}
                positions={line.positions}
                smoothFactor={3}
                noClip={true}
                pathOptions={{
                  color: line.color,
                  weight: 4,
                  opacity: 0.9,
                }}
              >
                <Popup>
                  <div>
                    <strong>
                      {line.routeCode} - {line.routeName}
                    </strong>
                    <br />
                    Line Source: {line.source || (line.usedRoutingApi ? "TomTom" : "Fallback")}
                    <br />
                    Distance: {line.summary?.lengthInMeters ? `${(line.summary.lengthInMeters / 1000).toFixed(2)} km` : "N/A"}
                    <br />
                    Travel Time: {line.summary?.travelTimeInSeconds ? `${Math.round(line.summary.travelTimeInSeconds / 60)} mins` : "N/A"}
                    <br />
                    Points Rendered: {line.positions.length}
                  </div>
                </Popup>
              </Polyline>
            ))}

            {sourceMode === "firestore" &&
              showTrafficOverlay &&
              trafficSamples
                .filter((sample) => sample.usable)
                .map((sample) => (
                  <CircleMarker
                    key={sample.id}
                    center={[sample.lat, sample.lng]}
                    radius={8}
                    pathOptions={{
                      color: sample.color,
                      fillColor: sample.color,
                      fillOpacity: 0.9,
                      weight: 2,
                    }}
                  >
                    <Popup>
                      <div>
                        <strong>{sample.name}</strong>
                        <br />
                        Congestion: {sample.severity}
                        <br />
                        Current Speed: {sample.currentSpeed} km/h
                        <br />
                        Free Flow Speed: {sample.freeFlowSpeed} km/h
                        <br />
                        Ratio: {(sample.ratio * 100).toFixed(0)}%
                      </div>
                    </Popup>
                  </CircleMarker>
                ))}

            {shouldRenderStopMarkers &&
              filteredStops.map((stop) => {
                const lat = Number(stop.latitude);
                const lng = Number(stop.longitude);
                if (Number.isNaN(lat) || Number.isNaN(lng)) return null;

                return (
                  <Marker key={stop.id} position={[lat, lng]} icon={stopIcon}>
                    <Popup>
                      <div>
                        <strong>{stop.stopName || "Unnamed Stop"}</strong>
                        <br />
                        Route: {stop.routeId && sourceRouteMap[stop.routeId]
                          ? `${sourceRouteMap[stop.routeId].routeCode} - ${sourceRouteMap[stop.routeId].routeName}`
                          : "Unassigned"}
                        <br />
                        Stop Code: {stop.stopCode || "N/A"}
                        <br />
                        Sequence: {stop.stopOrder ?? stop.sequence ?? "N/A"}
                        <br />
                        Delay: {stop.simulatedDelay ?? stop.averageDelay ?? 0} min
                      </div>
                    </Popup>
                  </Marker>
                );
              })}

            {sourceMode === "firestore" &&
              filteredVehicles.map((vehicle) => {
                const pos = renderVehiclePosition(vehicle);
                if (!pos) return null;

                return (
                  <Marker key={`vehicle-${vehicle.id}`} position={pos} icon={vehicleIcon}>
                    <Popup>
                      <div>
                        <strong>{vehicle.vehicleCode || "Vehicle"}</strong>
                        <br />
                        Plate: {vehicle.plateNumber || "N/A"}
                        <br />
                        Status: {vehicle.status || "N/A"}
                        <br />
                        Route: {vehicle.routeId && sourceRouteMap[vehicle.routeId] ? `${sourceRouteMap[vehicle.routeId].routeCode} - ${sourceRouteMap[vehicle.routeId].routeName}` : "Unassigned"}
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
          </MapContainer>
        )}
      </div>

      <div style={panelGridStyle}>
        <div style={panelStyle}>
          <h3 style={{ marginTop: 0 }}>Trip Status Summary</h3>
          <SummaryRow label="Scheduled Trips" value={scheduledTripsCount} />
          <SummaryRow label="Active Trips" value={activeTripsCount} />
          <SummaryRow label="Delayed Trips" value={delayedTripsCount} />
          <SummaryRow label="Completed Trips" value={completedTripsCount} />
          <SummaryRow label="Cancelled Trips" value={cancelledTripsCount} />
        </div>

        <div style={panelStyle}>
          <h3 style={{ marginTop: 0 }}>Delay Insight</h3>
          {mostDelayedRoute ? (
            <>
              <SummaryRow label="Most Delayed Route" value={`${mostDelayedRoute.routeCode} - ${mostDelayedRoute.routeName}`} />
              <SummaryRow label="Avg Delay" value={`${mostDelayedRoute.averageDelay} mins`} />
            </>
          ) : (
            <p style={{ margin: 0, color: "#cbd5e1" }}>No route delay data yet.</p>
          )}
          <SummaryRow label="Average Trip Delay" value={`${avgTripDelay} mins`} />
          <SummaryRow label="On-Time Rate" value={`${onTimeRate}%`} />
        </div>

        <div style={panelStyle}>
          <h3 style={{ marginTop: 0 }}>Map Notes</h3>
          <div style={{ color: "#cbd5e1", lineHeight: 1.7 }}>
            <div>• Blue markers = route stops</div>
            <div>• Red markers = Firestore vehicles</div>
            <div>• Colored route lines = GTFS shapes or TomTom route lines</div>
            <div>• TomTom overlay = real traffic road colors</div>
            <div>• Sample dots = live traffic query points</div>
          </div>
        </div>
      </div>

      <div style={panelGridStyleWide}>
        <div style={panelStyle}>
          <h3 style={{ marginTop: 0 }}>Recent Predictions</h3>
          {recentPredictions.length === 0 ? (
            <p style={{ margin: 0, color: "#cbd5e1" }}>No predictions saved yet.</p>
          ) : (
            recentPredictions.map((item) => (
              <div key={item.id} style={{ padding: "0.75rem 0", borderBottom: "1px solid #1f2937" }}>
                <div style={{ fontWeight: "bold" }}>
                  {item.routeCode || "N/A"} - {item.routeName || "Unnamed Route"}
                </div>
                <div style={{ color: "#cbd5e1", marginTop: "0.25rem" }}>
                  Predicted Congestion: {item.predictedCongestion || "-"}
                </div>
                <div style={{ color: "#cbd5e1", marginTop: "0.25rem" }}>
                  Predicted Delay Risk: {item.predictedDelayRisk || "-"}
                </div>
                <div style={{ color: "#cbd5e1", marginTop: "0.25rem" }}>
                  Avg Delay Basis: {item.basedOnAvgDelay ?? "-"} mins
                </div>
                <div style={{ color: "#cbd5e1", marginTop: "0.25rem" }}>
                  Traffic Samples: {item.basedOnTrafficSamples ?? "-"}
                </div>
                <div style={{ color: "#cbd5e1", marginTop: "0.25rem" }}>
                  Generated: {formatTimestamp(item.generatedAt, item.generatedAtText)}
                </div>
              </div>
            ))
          )}
        </div>

        <div style={panelStyle}>
          <h3 style={{ marginTop: 0 }}>Route Summary</h3>
          {activeRoutes.length === 0 ? (
            <p style={{ margin: 0, color: "#cbd5e1" }}>No routes available.</p>
          ) : (
            activeRoutes.map((route) => (
              <div key={route.id} style={{ padding: "0.75rem 0", borderBottom: "1px solid #1f2937" }}>
                <div style={{ fontWeight: "bold" }}>
                  {route.routeCode} - {route.routeName}
                </div>
                <div style={{ color: "#cbd5e1", marginTop: "0.25rem" }}>
                  Stops: {sourceStops.filter((stop) => stop.routeId === route.id).length}
                </div>
                <div style={{ color: "#cbd5e1", marginTop: "0.25rem" }}>
                  Trips: {sourceTrips.filter((trip) => trip.routeId === route.id).length}
                </div>
                <div style={{ color: "#cbd5e1", marginTop: "0.25rem" }}>
                  Vehicles: {sourceVehicles.filter((vehicle) => vehicle.routeId === route.id).length}
                </div>
              </div>
            ))
          )}
        </div>

        <div style={panelStyle}>
          <h3 style={{ marginTop: 0 }}>Recent Trips</h3>
          {recentTrips.length === 0 ? (
            <p style={{ margin: 0, color: "#cbd5e1" }}>No trips available.</p>
          ) : (
            recentTrips.map((trip) => (
              <div key={trip.id} style={{ padding: "0.75rem 0", borderBottom: "1px solid #1f2937" }}>
                <div style={{ fontWeight: "bold" }}>
                  {trip.tripCode || trip.tripHeadsign || "Unnamed Trip"}
                </div>
                <div style={{ color: "#cbd5e1", marginTop: "0.25rem" }}>
                  Route: {sourceRouteMap[trip.routeId] ? `${sourceRouteMap[trip.routeId].routeCode} - ${sourceRouteMap[trip.routeId].routeName}` : "Unassigned"}
                </div>
                <div style={{ color: "#cbd5e1", marginTop: "0.25rem" }}>
                  Vehicle: {sourceVehicleMap[trip.vehicleId] ? `${sourceVehicleMap[trip.vehicleId].vehicleCode} - ${sourceVehicleMap[trip.vehicleId].plateNumber}` : sourceMode === "gtfs" ? "GTFS scheduled trip" : "Unassigned"}
                </div>
                <div style={{ color: "#cbd5e1", marginTop: "0.25rem" }}>
                  Status: <strong>{trip.status || "scheduled"}</strong>
                </div>
                <div style={{ color: "#cbd5e1", marginTop: "0.25rem" }}>
                  ETA / Schedule: {getTripTimingLabel(trip)}
                </div>
                <div style={{ color: "#cbd5e1", marginTop: "0.25rem" }}>
                  Delay: {trip.delayMinutes ?? 0} mins
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function buildGtfsBundle(raw) {
  const routesRaw = (raw.routes || []).filter((item) => item.route_id);
  const stopsRaw = (raw.stops || []).filter((item) => item.stop_id && item.stop_lat && item.stop_lon);
  const tripsRaw = (raw.trips || []).filter((item) => item.trip_id && item.route_id);
  const stopTimesRaw = (raw.stop_times || []).filter((item) => item.trip_id && item.stop_id);
  const shapesRaw = (raw.shapes || []).filter((item) => item.shape_id && item.shape_pt_lat && item.shape_pt_lon);

  const stopsById = {};
  const routes = routesRaw.map((route, index) => {
    const color = normalizeRouteColor(route.route_color, index);
    return {
      id: route.route_id,
      routeCode: route.route_short_name || route.route_id,
      routeName: route.route_long_name || route.route_desc || `Route ${route.route_id}`,
      color,
      active: true,
      routeType: route.route_type || "N/A",
      agencyId: route.agency_id || "",
      raw: route,
    };
  });

  const routeMap = Object.fromEntries(routes.map((route) => [route.id, route]));

  const stopTimesByTrip = {};
  stopTimesRaw.forEach((item) => {
    if (!stopTimesByTrip[item.trip_id]) stopTimesByTrip[item.trip_id] = [];
    stopTimesByTrip[item.trip_id].push(item);
  });
  Object.values(stopTimesByTrip).forEach((items) => {
    items.sort(
      (a, b) =>
        Number(a.stop_sequence || 999999) - Number(b.stop_sequence || 999999)
    );
  });

  const stops = stopsRaw.map((stop) => {
    const formatted = {
      id: stop.stop_id,
      stopId: stop.stop_id,
      stopCode: stop.stop_code || stop.stop_id,
      stopName: stop.stop_name || stop.stop_id,
      latitude: Number(stop.stop_lat),
      longitude: Number(stop.stop_lon),
      routeId: null,
      sequence: null,
      simulatedDelay: 0,
      simulatedPassengers: 0,
      raw: stop,
    };
    stopsById[stop.stop_id] = formatted;
    return formatted;
  });

  const shapesById = {};
  shapesRaw.forEach((shape) => {
    if (!shapesById[shape.shape_id]) shapesById[shape.shape_id] = [];
    shapesById[shape.shape_id].push(shape);
  });
  Object.values(shapesById).forEach((items) => {
    items.sort(
      (a, b) =>
        Number(a.shape_pt_sequence || 999999) - Number(b.shape_pt_sequence || 999999)
    );
  });

  const trips = tripsRaw.map((trip, index) => {
    const orderedStopTimes = stopTimesByTrip[trip.trip_id] || [];
    const firstStopTime = orderedStopTimes[0];
    const lastStopTime = orderedStopTimes[orderedStopTimes.length - 1];
    const delayMinutes = deterministicNumber(`${trip.trip_id}-delay`, 0, 12);

    return {
      id: trip.trip_id,
      tripId: trip.trip_id,
      tripCode: trip.trip_short_name || trip.trip_id,
      tripHeadsign: trip.trip_headsign || "",
      routeId: trip.route_id,
      serviceId: trip.service_id || "",
      shapeId: trip.shape_id || "",
      status: delayMinutes >= 8 ? "delayed" : "scheduled",
      delayMinutes,
      departureTime: firstStopTime?.departure_time ? toTodayDateTime(firstStopTime.departure_time) : null,
      expectedArrival: lastStopTime?.arrival_time ? toTodayDateTime(lastStopTime.arrival_time) : null,
      stopCount: orderedStopTimes.length,
      displayOrder: index,
      raw: trip,
    };
  });

  const representativeTripPerRoute = {};
  trips.forEach((trip) => {
    const current = representativeTripPerRoute[trip.routeId];
    if (!current || trip.stopCount > current.stopCount) {
      representativeTripPerRoute[trip.routeId] = trip;
    }
  });

  const routeGroupedStops = {};
  const routeStopAssigned = new Set();

  Object.entries(representativeTripPerRoute).forEach(([routeId, trip]) => {
    const orderedStopTimes = stopTimesByTrip[trip.tripId] || [];
    const items = orderedStopTimes
      .map((stopTime) => {
        const stop = stopsById[stopTime.stop_id];
        if (!stop) return null;
        const sequence = Number(stopTime.stop_sequence || 0);
        const stopItem = {
          ...stop,
          routeId,
          sequence,
          stopOrder: sequence,
          simulatedDelay: deterministicNumber(`${routeId}-${stop.id}-delay`, 0, 8),
          simulatedPassengers: deterministicNumber(`${routeId}-${stop.id}-passengers`, 10, 120),
        };
        routeStopAssigned.add(stop.id);
        return stopItem;
      })
      .filter(Boolean);

    routeGroupedStops[routeId] = items;
  });

  const unassignedStops = stops
    .filter((stop) => !routeStopAssigned.has(stop.id))
    .map((stop) => ({
      ...stop,
      simulatedDelay: deterministicNumber(`${stop.id}-delay`, 0, 8),
      simulatedPassengers: deterministicNumber(`${stop.id}-passengers`, 10, 120),
    }));

  const routeShapePaths = Object.entries(representativeTripPerRoute)
    .map(([routeId, trip]) => {
      const shapePoints = trip.shapeId ? shapesById[trip.shapeId] || [] : [];
      const positions = shapePoints.length
        ? shapePoints.map((point) => [Number(point.shape_pt_lat), Number(point.shape_pt_lon)])
        : (routeGroupedStops[routeId] || []).map((stop) => [Number(stop.latitude), Number(stop.longitude)]);

      if (positions.length < 2) return null;

      return {
        routeId,
        routeCode: routeMap[routeId]?.routeCode || routeId,
        routeName: routeMap[routeId]?.routeName || routeId,
        color: routeMap[routeId]?.color || "#2563eb",
        positions,
        usedRoutingApi: false,
        source: shapePoints.length ? "gtfs-shapes" : "stops",
        summary: shapePoints.length ? { lengthInMeters: estimatePolylineMeters(positions) } : null,
      };
    })
    .filter(Boolean);

  const simplifiedRouteShapePaths = routeShapePaths.map((item) => ({
    ...item,
    positions: simplifyPolyline(item.positions, MAX_GTFS_ROUTE_POLYLINE_POINTS),
  }));

  const allStops = [
    ...Object.values(routeGroupedStops).flat(),
    ...unassignedStops,
  ];

  return {
    routes,
    stops: allStops,
    trips,
    routeMap,
    routeGroupedStops,
    routeShapePaths: simplifiedRouteShapePaths,
    shapeCount: Object.keys(shapesById).length,
    stopTimeCount: stopTimesRaw.length,
    agencyName: raw.agency?.[0]?.agency_name || "GTFS Feed",
    feedVersion: raw.feed_info?.[0]?.feed_version || raw.feed_info?.[0]?.feed_publisher_name || "-",
  };
}

function deterministicNumber(seedText, min, max) {
  let hash = 0;
  for (let i = 0; i < seedText.length; i += 1) {
    hash = (hash * 31 + seedText.charCodeAt(i)) % 1000000007;
  }
  const range = max - min + 1;
  return min + (hash % range);
}

function normalizeRouteColor(color, index) {
  const cleaned = String(color || "").trim().replace("#", "");
  if (/^[0-9a-fA-F]{6}$/.test(cleaned)) return `#${cleaned}`;
  const palette = ["#2563eb", "#16a34a", "#dc2626", "#7c3aed", "#f59e0b", "#0891b2"];
  return palette[index % palette.length];
}

function toTodayDateTime(gtfsTime) {
  if (!gtfsTime || !String(gtfsTime).includes(":")) return null;
  const [hoursText, minutesText, secondsText = "0"] = String(gtfsTime).split(":");
  const totalHours = Number(hoursText || 0);
  const minutes = Number(minutesText || 0);
  const seconds = Number(secondsText || 0);
  const date = new Date();
  date.setHours(totalHours % 24, minutes, seconds, 0);
  if (totalHours >= 24) {
    date.setDate(date.getDate() + Math.floor(totalHours / 24));
  }
  return date.toISOString();
}

function estimatePolylineMeters(positions) {
  let total = 0;
  for (let i = 1; i < positions.length; i += 1) {
    total += haversineMeters(positions[i - 1], positions[i]);
  }
  return Math.round(total);
}

function haversineMeters(a, b) {
  const toRad = (value) => (value * Math.PI) / 180;
  const [lat1, lon1] = a;
  const [lat2, lon2] = b;
  const earthRadius = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const q =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(q), Math.sqrt(1 - q));
  return earthRadius * c;
}

function simplifyPolyline(points, maxPoints = 900) {
  if (!Array.isArray(points) || points.length <= maxPoints) return points || [];
  const step = Math.ceil(points.length / maxPoints);
  const simplified = [];
  for (let i = 0; i < points.length; i += step) {
    simplified.push(points[i]);
  }
  const lastPoint = points[points.length - 1];
  const lastSimplified = simplified[simplified.length - 1];
  if (
    !lastSimplified ||
    lastSimplified[0] !== lastPoint[0] ||
    lastSimplified[1] !== lastPoint[1]
  ) {
    simplified.push(lastPoint);
  }
  return simplified;
}

function MapZoomHandler({ setMapZoom }) {
  useMapEvents({
    zoomend(event) {
      setMapZoom(event.target.getZoom());
    },
  });
  return null;
}

function MapRecenter({ center }) {
  const map = useMapEvents({});
  useEffect(() => {
    if (center && Array.isArray(center)) {
      map.setView(center, map.getZoom(), { animate: false });
    }
  }, [center, map]);
  return null;
}

function StatCard({ label, value }) {
  return (
    <div
      style={{
        padding: "1rem",
        borderRadius: "12px",
        minWidth: "220px",
        background: "#f5f5f5",
        color: "#111827",
      }}
    >
      <div style={{ fontSize: "0.95rem", color: "#4b5563" }}>{label}</div>
      <div style={{ fontSize: "1.35rem", fontWeight: "bold", marginTop: "0.25rem" }}>
        {value}
      </div>
    </div>
  );
}

function SummaryRow({ label, value }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: "1rem",
        padding: "0.55rem 0",
        borderBottom: "1px solid #1f2937",
        color: "#cbd5e1",
      }}
    >
      <span>{label}</span>
      <strong style={{ color: "#fff", textAlign: "right" }}>{value}</strong>
    </div>
  );
}

function formatTimestamp(ts, fallbackText) {
  if (ts?.seconds) {
    return new Date(ts.seconds * 1000).toLocaleString();
  }
  if (fallbackText) {
    const date = new Date(fallbackText);
    if (!Number.isNaN(date.getTime())) return date.toLocaleString();
    return fallbackText;
  }
  return "-";
}

function getTripTimingLabel(trip) {
  const now = new Date();
  const departure = trip.departureTime ? new Date(trip.departureTime) : null;
  const expected = trip.expectedArrival ? new Date(trip.expectedArrival) : null;
  const actual = trip.actualArrival ? new Date(trip.actualArrival) : null;

  if (trip.status === "cancelled") return "Cancelled";
  if (trip.status === "completed" && actual) return `Completed at ${actual.toLocaleString()}`;
  if (trip.status === "completed") return "Completed";
  if (trip.status === "delayed") return `Delayed by ${trip.delayMinutes || 0} mins`;
  if (trip.status === "scheduled" && departure && departure > now) {
    return `Departs ${departure.toLocaleString()}`;
  }
  if (trip.status === "active" && expected) {
    const diffMins = Math.round((expected.getTime() - now.getTime()) / 60000);
    if (diffMins > 0) return `ETA in ${diffMins} mins`;
    if (diffMins === 0) return "Arriving now";
    return `Past ETA by ${Math.abs(diffMins)} mins`;
  }
  if (expected) return `Expected ${expected.toLocaleString()}`;
  return "No ETA available";
}

function primaryButtonStyle(background) {
  return {
    padding: "0.85rem 1.1rem",
    border: "none",
    borderRadius: "10px",
    background,
    color: "#fff",
    cursor: "pointer",
    fontWeight: "bold",
    minHeight: "48px",
  };
}

function statusTextStyle(hasError) {
  return {
    marginTop: "0.9rem",
    color: hasError ? "#fca5a5" : "#cbd5e1",
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
  };
}

const filterLabelStyle = {
  display: "block",
  marginBottom: "0.45rem",
  fontWeight: "bold",
  color: "#cbd5e1",
};

const filterSelectStyle = {
  padding: "0.8rem",
  borderRadius: "10px",
  border: "1px solid #334155",
  background: "#0b1220",
  color: "#fff",
  minWidth: "250px",
};

const panelStyle = {
  background: "#111827",
  border: "1px solid #1f2937",
  borderRadius: "14px",
  padding: "1rem",
};

const toolbarStyle = {
  background: "#111827",
  border: "1px solid #1f2937",
  borderRadius: "14px",
  padding: "1rem",
  marginBottom: "1rem",
  display: "flex",
  gap: "1rem",
  flexWrap: "wrap",
  alignItems: "center",
};

const panelGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
  gap: "1rem",
  marginBottom: "1rem",
};

const panelGridStyleWide = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
  gap: "1rem",
};