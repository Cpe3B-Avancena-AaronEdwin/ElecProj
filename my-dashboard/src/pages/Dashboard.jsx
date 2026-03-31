import React, { useEffect, useMemo, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  CircleMarker,
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

const TRAFFIC_SAMPLE_POINTS = [
  { id: "p1", name: "Makati Center", lat: 14.5547, lng: 121.0244 },
  { id: "p2", name: "Ayala Area", lat: 14.56, lng: 121.03 },
  { id: "p3", name: "Buendia Area", lat: 14.565, lng: 121.02 },
  { id: "p4", name: "Magallanes Area", lat: 14.545, lng: 121.015 },
  { id: "p5", name: "Gil Puyat Area", lat: 14.552, lng: 121.018 },
  { id: "p6", name: "Legazpi Area", lat: 14.558, lng: 121.028 },
];

const TOMTOM_TRAFFIC_TILE_URL = TOMTOM_API_KEY
  ? `https://api.tomtom.com/traffic/map/4/tile/flow/relative0/{z}/{x}/{y}.png?key=${encodeURIComponent(
      TOMTOM_API_KEY
    )}`
  : "";

export default function Dashboard() {
  const { user, role } = useAuth();
  const navigate = useNavigate();

  const [routes, setRoutes] = useState([]);
  const [stops, setStops] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [trips, setTrips] = useState([]);
  const [predictions, setPredictions] = useState([]);

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

  const [gtfsFallbackStops, setGtfsFallbackStops] = useState([]);

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

  const routeMap = useMemo(() => {
    const map = {};
    routes.forEach((route) => {
      map[route.id] = route;
    });
    return map;
  }, [routes]);

  const vehicleMap = useMemo(() => {
    const map = {};
    vehicles.forEach((vehicle) => {
      map[vehicle.id] = vehicle;
    });
    return map;
  }, [vehicles]);

  const activeRoutes = useMemo(
    () => routes.filter((route) => route.active !== false),
    [routes]
  );

  const routeGroupedStops = useMemo(() => {
    const grouped = {};

    stops.forEach((stop) => {
      if (!stop.routeId || !routeMap[stop.routeId]) return;
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
  }, [stops, routeMap]);

  const fetchTraffic = async () => {
    if (!TOMTOM_API_KEY) {
      setTrafficError("Missing TomTom API key.");
      setTrafficSamples([]);
      return;
    }

    setTrafficLoading(true);
    setTrafficError("");

    try {
      const responses = await Promise.all(
        TRAFFIC_SAMPLE_POINTS.map(async (point) => {
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

          if (data.error) {
            throw new Error(
              data.error.description || "TomTom API returned an error."
            );
          }

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

      const usable = responses.filter((item) => item.usable);
      if (!usable.length) {
        setTrafficError(
          "TomTom overlay is ready, but point-based traffic samples were not returned."
        );
      }

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
    if (!TOMTOM_API_KEY) {
      setRoutingError("Missing TomTom API key.");
      setRouteRoadPaths([]);
      return;
    }

    setRoutingLoading(true);
    setRoutingError("");

    try {
      const entries = Object.entries(routeGroupedStops);

      if (!entries.length) {
        setRouteRoadPaths([]);
        return;
      }

      const results = await Promise.all(
        entries.map(async ([routeId, groupedStops]) => {
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
              routeCode: routeMap[routeId]?.routeCode || "N/A",
              routeName: routeMap[routeId]?.routeName || "Unnamed Route",
              color: routeMap[routeId]?.color || "#2563eb",
              positions: fallbackPositions,
              usedRoutingApi: false,
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
              let errorText = "";
              try {
                errorText = await res.text();
              } catch {
                errorText = "";
              }

              console.error(`Routing failed for route ${routeId}:`, errorText);

              return {
                routeId,
                routeCode: routeMap[routeId]?.routeCode || "N/A",
                routeName: routeMap[routeId]?.routeName || "Unnamed Route",
                color: routeMap[routeId]?.color || "#2563eb",
                positions: fallbackPositions,
                usedRoutingApi: false,
                summary: null,
              };
            }

            const data = await res.json();

            if (data.error) {
              console.error(`TomTom routing API error for route ${routeId}:`, data);
              return {
                routeId,
                routeCode: routeMap[routeId]?.routeCode || "N/A",
                routeName: routeMap[routeId]?.routeName || "Unnamed Route",
                color: routeMap[routeId]?.color || "#2563eb",
                positions: fallbackPositions,
                usedRoutingApi: false,
                summary: null,
              };
            }

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
              console.error(`No usable routing polyline for route ${routeId}:`, data);
              return {
                routeId,
                routeCode: routeMap[routeId]?.routeCode || "N/A",
                routeName: routeMap[routeId]?.routeName || "Unnamed Route",
                color: routeMap[routeId]?.color || "#2563eb",
                positions: fallbackPositions,
                usedRoutingApi: false,
                summary: null,
              };
            }

            return {
              routeId,
              routeCode: routeMap[routeId]?.routeCode || "N/A",
              routeName: routeMap[routeId]?.routeName || "Unnamed Route",
              color: routeMap[routeId]?.color || "#2563eb",
              positions,
              usedRoutingApi: true,
              summary: firstRoute.summary || null,
            };
          } catch (err) {
            console.error(`Routing exception for route ${routeId}:`, err);
            return {
              routeId,
              routeCode: routeMap[routeId]?.routeCode || "N/A",
              routeName: routeMap[routeId]?.routeName || "Unnamed Route",
              color: routeMap[routeId]?.color || "#2563eb",
              positions: fallbackPositions,
              usedRoutingApi: false,
              summary: null,
            };
          }
        })
      );

      const usableResults = results.filter((item) => item.positions.length >= 2);
      setRouteRoadPaths(usableResults);

      const usedCount = usableResults.filter((item) => item.usedRoutingApi).length;
      if (!usedCount && usableResults.length) {
        setRoutingError(
          "TomTom routing failed for the current route data, so the map is using straight-line fallback."
        );
      }

      setLastRoutingUpdated(new Date());
    } catch (err) {
      console.error("Routing error:", err);
      setRoutingError(err.message || "Failed to build road-following routes.");
      setRouteRoadPaths([]);
    } finally {
      setRoutingLoading(false);
    }
  };

  useEffect(() => {
    fetchTraffic();

    const interval = setInterval(() => {
      fetchTraffic();
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (stops.length > 0 && routes.length > 0) {
      fetchRoadSnappedRoutes();
    } else {
      setRouteRoadPaths([]);
    }
  }, [stops, routes]);

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

  const filteredTrips = useMemo(() => {
    if (selectedRouteId === "all") return trips;
    return trips.filter((trip) => trip.routeId === selectedRouteId);
  }, [trips, selectedRouteId]);

  const filteredRoutePaths = useMemo(() => {
    return routeRoadPaths.filter(
      (item) => selectedRouteId === "all" || item.routeId === selectedRouteId
    );
  }, [routeRoadPaths, selectedRouteId]);

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
    (sum, stop) => sum + Number(stop.simulatedPassengers || 0),
    0
  );

  const avgStopDelay = filteredStops.length
    ? (
        filteredStops.reduce(
          (sum, stop) => sum + Number(stop.simulatedDelay || 0),
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
    (trip) => trip.status === "delayed"
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
    (trip) =>
      Number(trip.delayMinutes || 0) === 0 && trip.status !== "cancelled"
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

    if (!bestRouteId || !routeMap[bestRouteId]) return null;

    return {
      routeId: bestRouteId,
      routeCode: routeMap[bestRouteId].routeCode || "N/A",
      routeName: routeMap[bestRouteId].routeName || "Unnamed Route",
      averageDelay: highestAverage.toFixed(1),
    };
  }, [filteredTrips, routeMap]);

  const currentPrediction = useMemo(() => {
    const selectedRoute = selectedRouteId === "all" ? null : routeMap[selectedRouteId];
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

    const predictedCongestion =
      roadClosedCount > 0
        ? "Very High"
        : getLevel(
            (heavyTrafficCount > 0 ? 3 : 0) +
              (moderateTrafficCount > 1 ? 1 : 0) +
              (isRushHour ? 1 : 0)
          );

    const predictedDelayRisk = getLevel(score);

    return {
      routeId: selectedRoute?.id || selectedRouteId || "all",
      routeCode: selectedRoute?.routeCode || "ALL",
      routeName: selectedRoute?.routeName || "All Routes",
      predictedCongestion,
      predictedDelayRisk,
      reason: reasons.length ? reasons : ["Normal operating conditions"],
      basedOnTrafficSamples: usableTraffic.length,
      basedOnAvgDelay: Number(avgTripDelay),
      generatedAt: new Date().toISOString(),
      score,
    };
  }, [selectedRouteId, routeMap, trafficSamples, avgTripDelay, avgTripDelayValue]);

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

    return [14.5547, 121.0244];
  }, [filteredStops]);

  const renderVehiclePosition = (vehicle) => {
    const routeStops = stops.filter((stop) => stop.routeId === vehicle.routeId);
    if (!routeStops.length) return null;

    const baseIndex =
      vehicle.id
        ?.split("")
        .reduce((sum, char) => sum + char.charCodeAt(0), 0) || 0;

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
            value={useFirestoreData ? "firestore" : "gtfs"}
            onChange={(e) => setUseFirestoreData(e.target.value === "firestore")}
            style={filterSelectStyle}
          >
            <option value="firestore">Firestore Admin Data</option>
            <option value="gtfs">GTFS Fallback</option>
          </select>
        </div>

        <div>
          <label style={filterLabelStyle}>Traffic Overlay</label>
          <select
            value={showTrafficOverlay ? "on" : "off"}
            onChange={(e) => setShowTrafficOverlay(e.target.value === "on")}
            style={filterSelectStyle}
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
            disabled={trafficLoading || !TOMTOM_API_KEY}
            style={primaryButtonStyle(trafficLoading ? "#475569" : "#10b981")}
          >
            {trafficLoading ? "Refreshing Traffic..." : "Refresh Traffic"}
          </button>

          <button
            onClick={fetchRoadSnappedRoutes}
            disabled={routingLoading || !TOMTOM_API_KEY}
            style={primaryButtonStyle(routingLoading ? "#475569" : "#2563eb")}
          >
            {routingLoading ? "Building Routes..." : "Refresh Road Routes"}
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
          <div>Routes Loaded: {routes.length}</div>
          <div>Stops Loaded: {stops.length}</div>
          <div>Vehicles Loaded: {vehicles.length}</div>
          <div>Trips Loaded: {trips.length}</div>
          <div>
            Traffic Updated:{" "}
            {lastTrafficUpdated ? lastTrafficUpdated.toLocaleTimeString() : "—"}
          </div>
          <div>
            Routes Updated:{" "}
            {lastRoutingUpdated ? lastRoutingUpdated.toLocaleTimeString() : "—"}
          </div>
        </div>
      </div>

      <div style={panelGridStyle}>
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
          <SummaryRow label="Road Paths" value={filteredRoutePaths.length} />
          <SummaryRow
            label="Using TomTom"
            value={
              filteredRoutePaths.filter((item) => item.usedRoutingApi).length
            }
          />
          <SummaryRow
            label="Fallback Straight"
            value={
              filteredRoutePaths.filter((item) => !item.usedRoutingApi).length
            }
          />
          <SummaryRow label="Routing Loading" value={routingLoading ? "Yes" : "No"} />
          <div style={statusTextStyle(routingError)}>
            {routingError || "Road-following route generation is running."}
          </div>
        </div>

        <div style={panelStyle}>
          <h3 style={{ marginTop: 0 }}>Prediction Status</h3>
          <SummaryRow label="Predicted Congestion" value={currentPrediction.predictedCongestion} />
          <SummaryRow label="Predicted Delay Risk" value={currentPrediction.predictedDelayRisk} />
          <SummaryRow label="Prediction Score" value={currentPrediction.score} />
          <SummaryRow
            label="Traffic Samples"
            value={currentPrediction.basedOnTrafficSamples}
          />
          <SummaryRow
            label="Avg Delay Basis"
            value={`${currentPrediction.basedOnAvgDelay} mins`}
          />
          <div style={statusTextStyle(predictionError)}>
            {predictionError || predictionMessage || "Prediction system is running."}
          </div>
        </div>
      </div>

      <div style={panelGridStyle}>
        <div style={panelStyle}>
          <h3 style={{ marginTop: 0 }}>Current Prediction</h3>
          <SummaryRow label="Route" value={`${currentPrediction.routeCode} - ${currentPrediction.routeName}`} />
          <SummaryRow label="Predicted Congestion" value={currentPrediction.predictedCongestion} />
          <SummaryRow label="Predicted Delay Risk" value={currentPrediction.predictedDelayRisk} />
          <SummaryRow
            label="Generated"
            value={new Date(currentPrediction.generatedAt).toLocaleString()}
          />
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
          <SummaryRow label="Overlay" value={showTrafficOverlay ? "Visible" : "Hidden"} />
          <SummaryRow label="Loading" value={trafficLoading ? "Yes" : "No"} />
          <div style={statusTextStyle(trafficError)}>
            {trafficError || "Traffic monitoring is running."}
          </div>
        </div>

        <div style={panelStyle}>
          <h3 style={{ marginTop: 0 }}>Prediction Legend</h3>
          <LegendRow color="#22c55e" label="Low Risk" />
          <LegendRow color="#f59e0b" label="Medium Risk" />
          <LegendRow color="#ef4444" label="High Risk" />
          <LegendRow color="#7c3aed" label="Very High Risk" />
          <div style={{ marginTop: "0.9rem", color: "#cbd5e1", lineHeight: 1.6 }}>
            <div>• Heavy traffic raises congestion score</div>
            <div>• Recent delays raise delay risk</div>
            <div>• Rush hour adds extra risk</div>
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
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution="&copy; OpenStreetMap contributors"
            />

            {showTrafficOverlay && TOMTOM_TRAFFIC_TILE_URL && (
              <TileLayer url={TOMTOM_TRAFFIC_TILE_URL} opacity={0.85} />
            )}

            {filteredRoutePaths.map((line) => (
              <Polyline
                key={`route-road-${line.routeId}`}
                positions={line.positions}
                pathOptions={{
                  color: line.color,
                  weight: 5,
                  opacity: 0.95,
                }}
              >
                <Popup>
                  <div>
                    <strong>
                      {line.routeCode} - {line.routeName}
                    </strong>
                    <br />
                    Path Type: {line.usedRoutingApi ? "TomTom road route" : "Fallback line"}
                    <br />
                    Distance:{" "}
                    {line.summary?.lengthInMeters
                      ? `${(line.summary.lengthInMeters / 1000).toFixed(2)} km`
                      : "N/A"}
                    <br />
                    Travel Time:{" "}
                    {line.summary?.travelTimeInSeconds
                      ? `${Math.round(line.summary.travelTimeInSeconds / 60)} mins`
                      : "N/A"}
                  </div>
                </Popup>
              </Polyline>
            ))}

            {showTrafficOverlay &&
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
                        <br />
                        Confidence: {sample.confidence ?? "N/A"}
                      </div>
                    </Popup>
                  </CircleMarker>
                ))}

            {filteredStops.map((stop) => {
              const lat = Number(stop.latitude);
              const lng = Number(stop.longitude);

              if (Number.isNaN(lat) || Number.isNaN(lng)) return null;

              return (
                <Marker key={stop.id} position={[lat, lng]} icon={stopIcon}>
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
              <SummaryRow
                label="Most Delayed Route"
                value={`${mostDelayedRoute.routeCode} - ${mostDelayedRoute.routeName}`}
              />
              <SummaryRow
                label="Avg Delay"
                value={`${mostDelayedRoute.averageDelay} mins`}
              />
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
            <div>• Blue markers = stops</div>
            <div>• Red markers = vehicles</div>
            <div>• Colored route lines = TomTom road-following route paths</div>
            <div>• TomTom overlay = real traffic road colors</div>
            <div>• Sample dots = traffic stats points</div>
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
              <div
                key={item.id}
                style={{
                  padding: "0.75rem 0",
                  borderBottom: "1px solid #1f2937",
                }}
              >
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
                  Vehicles: {vehicles.filter((vehicle) => vehicle.routeId === route.id).length}
                </div>
                <div style={{ color: "#cbd5e1", marginTop: "0.25rem" }}>
                  Trips: {trips.filter((trip) => trip.routeId === route.id).length}
                </div>
              </div>
            ))
          )}
        </div>

        <div style={panelStyle}>
          <h3 style={{ marginTop: 0 }}>Recent Trips</h3>
          {recentTrips.length === 0 ? (
            <p style={{ margin: 0, color: "#cbd5e1" }}>No trips added yet.</p>
          ) : (
            recentTrips.map((trip) => (
              <div
                key={trip.id}
                style={{
                  padding: "0.75rem 0",
                  borderBottom: "1px solid #1f2937",
                }}
              >
                <div style={{ fontWeight: "bold" }}>
                  {trip.tripCode || "Unnamed Trip"}
                </div>
                <div style={{ color: "#cbd5e1", marginTop: "0.25rem" }}>
                  Route:{" "}
                  {routeMap[trip.routeId]
                    ? `${routeMap[trip.routeId].routeCode} - ${routeMap[trip.routeId].routeName}`
                    : "Unassigned"}
                </div>
                <div style={{ color: "#cbd5e1", marginTop: "0.25rem" }}>
                  Vehicle:{" "}
                  {vehicleMap[trip.vehicleId]
                    ? `${vehicleMap[trip.vehicleId].vehicleCode} - ${vehicleMap[trip.vehicleId].plateNumber}`
                    : "Unassigned"}
                </div>
                <div style={{ color: "#cbd5e1", marginTop: "0.25rem" }}>
                  Status: <strong>{trip.status || "-"}</strong>
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

function LegendRow({ color, label }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.75rem",
        marginBottom: "0.8rem",
        color: "#cbd5e1",
      }}
    >
      <div
        style={{
          width: "38px",
          height: "8px",
          borderRadius: "999px",
          background: color,
        }}
      />
      <span>{label}</span>
    </div>
  );
}

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
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
  if (trip.status === "completed" && actual) {
    return `Completed at ${actual.toLocaleString()}`;
  }
  if (trip.status === "completed") return "Completed";
  if (trip.status === "delayed") {
    return `Delayed by ${trip.delayMinutes || 0} mins`;
  }
  if (trip.status === "scheduled" && departure && departure > now) {
    return `Departs ${departure.toLocaleString()}`;
  }
  if (trip.status === "active" && expected) {
    const diffMs = expected.getTime() - now.getTime();
    const diffMins = Math.round(diffMs / 60000);

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