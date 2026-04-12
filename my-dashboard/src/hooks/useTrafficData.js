import { useCallback, useEffect, useMemo, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { db } from "../firebase/config";

const SNAPSHOT_COLLECTION = "trafficSnapshots";
const SNAPSHOT_INTERVAL_MS = 5 * 60 * 1000;
const SNAPSHOT_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;
const DASHBOARD_HISTORY_WINDOW_MS = 24 * 60 * 60 * 1000;
const DASHBOARD_HISTORY_LIMIT = 288;
const SUMMARY_HISTORY_LIMIT = 2016;
const DEFAULT_MAX_SAMPLE_POINTS = 15;
const CACHE_TTL_MS = 2 * 60 * 1000;

const EMPTY_SUMMARY = {
  total: 0,
  totalPoints: 0,
  samples: 0,
  light: 0,
  moderate: 0,
  heavy: 0,
  closed: 0,
  averageCurrentSpeed: 0,
  averageFreeFlowSpeed: 0,
  level: "Low",
  avgSpeed: 0,
  congestionScore: 0,
};

function resolveOptions(options) {
  if (typeof options === "string") {
    return {
      enabled: true,
      liveTraffic: true,
      history: true,
      cacheKey: options,
      maxSamplePoints: DEFAULT_MAX_SAMPLE_POINTS,
      skipWhenHidden: true,
    };
  }

  return {
    enabled: options?.enabled ?? true,
    liveTraffic: options?.liveTraffic ?? true,
    history: options?.history ?? true,
    cacheKey: options?.cacheKey ?? "default",
    maxSamplePoints: options?.maxSamplePoints ?? DEFAULT_MAX_SAMPLE_POINTS,
    skipWhenHidden: options?.skipWhenHidden ?? true,
  };
}

function toLatLng(stop) {
  const lat = parseFloat(stop.stopLat ?? stop.stop_lat ?? stop.latitude);
  const lng = parseFloat(stop.stopLon ?? stop.stop_lon ?? stop.longitude);

  if (Number.isNaN(lat) || Number.isNaN(lng)) return null;

  return { lat, lng };
}

function pickEvenlySpacedStops(stops = [], maxPoints = DEFAULT_MAX_SAMPLE_POINTS) {
  if (!Array.isArray(stops) || stops.length <= maxPoints) return stops;

  const result = [];
  const usedIndexes = new Set();
  const step = (stops.length - 1) / (maxPoints - 1);

  for (let i = 0; i < maxPoints; i += 1) {
    const index = Math.round(i * step);
    if (!usedIndexes.has(index)) {
      result.push(stops[index]);
      usedIndexes.add(index);
    }
  }

  return result;
}

function severityFromSegment(segment) {
  const currentSpeed = Number(segment?.currentSpeed || 0);
  const freeFlowSpeed = Number(segment?.freeFlowSpeed || 0);
  const ratio = freeFlowSpeed > 0 ? currentSpeed / freeFlowSpeed : 1;

  let severity = "Light";
  let color = "#22c55e";
  let congestionScore = Math.round((1 - Math.min(ratio, 1)) * 100);

  if (segment?.roadClosure === true) {
    severity = "Closed";
    color = "#6b7280";
    congestionScore = 100;
  } else if (ratio < 0.35) {
    severity = "Heavy";
    color = "#ef4444";
    congestionScore = Math.max(70, congestionScore);
  } else if (ratio < 0.75) {
    severity = "Moderate";
    color = "#f59e0b";
    congestionScore = Math.max(35, congestionScore);
  } else {
    congestionScore = Math.min(30, congestionScore);
  }

  return {
    severity,
    color,
    currentSpeed,
    freeFlowSpeed,
    ratio,
    congestionScore,
  };
}

function buildTrafficSummary(results = []) {
  const usable = results.filter((item) => item.usable);

  let currentTotal = 0;
  let freeFlowTotal = 0;
  let congestionScoreTotal = 0;

  const summary = {
    ...EMPTY_SUMMARY,
    total: usable.length,
    totalPoints: usable.length,
    samples: usable.length,
  };

  usable.forEach((item) => {
    currentTotal += Number(item.currentSpeed || 0);
    freeFlowTotal += Number(item.freeFlowSpeed || 0);
    congestionScoreTotal += Number(item.congestionScore || 0);

    if (item.severity === "Closed") summary.closed += 1;
    else if (item.severity === "Heavy") summary.heavy += 1;
    else if (item.severity === "Moderate") summary.moderate += 1;
    else summary.light += 1;
  });

  summary.averageCurrentSpeed = usable.length
    ? Number((currentTotal / usable.length).toFixed(1))
    : 0;
  summary.averageFreeFlowSpeed = usable.length
    ? Number((freeFlowTotal / usable.length).toFixed(1))
    : 0;
  summary.avgSpeed = summary.averageCurrentSpeed;
  summary.congestionScore = usable.length
    ? Math.round(congestionScoreTotal / usable.length)
    : 0;

  if (summary.closed > 0 || summary.heavy >= 2 || summary.congestionScore >= 70) {
    summary.level = "High";
  } else if (summary.moderate > 0 || summary.heavy === 1 || summary.congestionScore >= 40) {
    summary.level = "Medium";
  } else {
    summary.level = "Low";
  }

  return summary;
}

function normalizeHistoryDoc(docSnap) {
  const data = docSnap.data() || {};

  return {
    id: docSnap.id,
    timestampMs: Number(data.timestampMs || 0),
    timestampText: data.timestampText || "",
    congestionScore: Number(data.congestionScore || 0),
    congestionLevel: data.congestionLevel || "Low",
    delayRisk: data.delayRisk || "Low",
    avgDelay: Number(data.avgDelay || 0),
    trafficSampleCount: Number(data.trafficSampleCount || 0),
    heavyCount: Number(data.heavyCount || 0),
    moderateCount: Number(data.moderateCount || 0),
    lowCount: Number(data.lowCount || 0),
    closedCount: Number(data.closedCount || 0),
    averageCurrentSpeed: Number(data.averageCurrentSpeed || 0),
    averageFreeFlowSpeed: Number(data.averageFreeFlowSpeed || 0),
  };
}

function summaryFromHistoryItem(item) {
  if (!item) return EMPTY_SUMMARY;

  return {
    ...EMPTY_SUMMARY,
    total: Number(item.trafficSampleCount || 0),
    totalPoints: Number(item.trafficSampleCount || 0),
    samples: Number(item.trafficSampleCount || 0),
    light: Number(item.lowCount || 0),
    moderate: Number(item.moderateCount || 0),
    heavy: Number(item.heavyCount || 0),
    closed: Number(item.closedCount || 0),
    level: item.congestionLevel || "Low",
    congestionScore: Number(item.congestionScore || 0),
    averageCurrentSpeed: Number(item.averageCurrentSpeed || 0),
    averageFreeFlowSpeed: Number(item.averageFreeFlowSpeed || 0),
    avgSpeed: Number(item.averageCurrentSpeed || 0),
  };
}

function getCache(cacheKey) {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.sessionStorage.getItem(`traffic-cache:${cacheKey}`);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!parsed?.savedAt || Date.now() - parsed.savedAt > CACHE_TTL_MS) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function setCache(cacheKey, payload) {
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.setItem(
      `traffic-cache:${cacheKey}`,
      JSON.stringify({
        ...payload,
        savedAt: Date.now(),
      })
    );
  } catch {
    // ignore cache failures
  }
}

export function useTrafficData(stops = [], apiKey, options = {}) {
  const resolvedOptions = resolveOptions(options);
  const {
    enabled,
    liveTraffic,
    history,
    cacheKey,
    maxSamplePoints,
    skipWhenHidden,
  } = resolvedOptions;

  const [trafficSamples, setTrafficSamples] = useState([]);
  const [trafficSummary, setTrafficSummary] = useState(EMPTY_SUMMARY);
  const [trafficHistory, setTrafficHistory] = useState([]);
  const [historyAnalytics, setHistoryAnalytics] = useState({
    snapshotCount7d: 0,
    averageScore7d: 0,
    latestScore: 0,
    highestScore7d: 0,
  });
  const [trafficLoading, setTrafficLoading] = useState(false);
  const [trafficError, setTrafficError] = useState("");
  const [historyError, setHistoryError] = useState("");
  const [lastTrafficUpdated, setLastTrafficUpdated] = useState(null);

  const validStops = useMemo(() => stops.filter((stop) => !!toLatLng(stop)), [stops]);

  const loadTrafficHistory = useCallback(async () => {
    if (!history) {
      setTrafficHistory([]);
      setHistoryAnalytics({
        snapshotCount7d: 0,
        averageScore7d: 0,
        latestScore: 0,
        highestScore7d: 0,
      });
      return { recentHistory: [], fullHistory: [] };
    }

    try {
      const now = Date.now();
      const dashboardCutoff = now - DASHBOARD_HISTORY_WINDOW_MS;
      const retentionCutoff = now - SNAPSHOT_RETENTION_MS;

      const recentQuery = query(
        collection(db, SNAPSHOT_COLLECTION),
        where("timestampMs", ">=", dashboardCutoff),
        orderBy("timestampMs", "asc"),
        limit(DASHBOARD_HISTORY_LIMIT)
      );

      const summaryQuery = query(
        collection(db, SNAPSHOT_COLLECTION),
        where("timestampMs", ">=", retentionCutoff),
        orderBy("timestampMs", "desc"),
        limit(SUMMARY_HISTORY_LIMIT)
      );

      const [recentSnapshot, summarySnapshot] = await Promise.all([
        getDocs(recentQuery),
        getDocs(summaryQuery),
      ]);

      const recentHistory = recentSnapshot.docs.map(normalizeHistoryDoc);
      const fullHistory = summarySnapshot.docs.map(normalizeHistoryDoc);

      const scoreValues = fullHistory.map((item) => Number(item.congestionScore || 0));
      const averageScore7d = scoreValues.length
        ? Number(
            (scoreValues.reduce((sum, value) => sum + value, 0) / scoreValues.length).toFixed(1)
          )
        : 0;

      setTrafficHistory(recentHistory);
      setHistoryAnalytics({
        snapshotCount7d: fullHistory.length,
        averageScore7d,
        latestScore: fullHistory.length ? fullHistory[0].congestionScore : 0,
        highestScore7d: scoreValues.length ? Math.max(...scoreValues) : 0,
      });

      if (!liveTraffic && fullHistory.length) {
        setTrafficSummary(summaryFromHistoryItem(fullHistory[0]));
        setLastTrafficUpdated(fullHistory[0].timestampText || null);
      }

      setHistoryError("");
      return { recentHistory, fullHistory };
    } catch (error) {
      setHistoryError(error.message || "Failed to load traffic history.");
      setTrafficHistory([]);
      setHistoryAnalytics({
        snapshotCount7d: 0,
        averageScore7d: 0,
        latestScore: 0,
        highestScore7d: 0,
      });
      return { recentHistory: [], fullHistory: [] };
    }
  }, [history, liveTraffic]);

  const cleanupOldSnapshots = useCallback(async () => {
    if (!history) return;

    try {
      const cutoff = Date.now() - SNAPSHOT_RETENTION_MS;
      const oldQuery = query(
        collection(db, SNAPSHOT_COLLECTION),
        where("timestampMs", "<", cutoff),
        limit(100)
      );

      const snapshot = await getDocs(oldQuery);
      if (!snapshot.empty) {
        await Promise.all(snapshot.docs.map((docSnap) => deleteDoc(docSnap.ref)));
      }
    } catch (error) {
      console.error("Failed to cleanup old traffic snapshots:", error);
    }
  }, [history]);

  const saveSnapshotIfDue = useCallback(
    async (summary) => {
      if (!history) return;

      try {
        const now = Date.now();
        const { fullHistory } = await loadTrafficHistory();
        const latest = fullHistory[0];

        if (latest?.timestampMs && now - latest.timestampMs < SNAPSHOT_INTERVAL_MS) {
          await cleanupOldSnapshots();
          return;
        }

        await addDoc(collection(db, SNAPSHOT_COLLECTION), {
          timestampMs: now,
          timestampText: new Date(now).toISOString(),
          createdAt: serverTimestamp(),
          congestionScore: Number(summary.congestionScore || 0),
          congestionLevel: summary.level || "Low",
          delayRisk:
            summary.closed > 0 || summary.heavy >= 2
              ? "High"
              : summary.moderate > 0 || summary.heavy === 1
              ? "Medium"
              : "Low",
          avgDelay: 0,
          trafficSampleCount: Number(summary.total || 0),
          heavyCount: Number(summary.heavy || 0),
          moderateCount: Number(summary.moderate || 0),
          lowCount: Number(summary.light || 0),
          closedCount: Number(summary.closed || 0),
          averageCurrentSpeed: Number(summary.averageCurrentSpeed || 0),
          averageFreeFlowSpeed: Number(summary.averageFreeFlowSpeed || 0),
        });

        await cleanupOldSnapshots();
        await loadTrafficHistory();
      } catch (error) {
        setHistoryError(error.message || "Failed to save traffic snapshot.");
      }
    },
    [cleanupOldSnapshots, history, loadTrafficHistory]
  );

  const refreshTraffic = useCallback(
    async (force = false) => {
      if (!enabled) {
        await loadTrafficHistory();
        return;
      }

      if (!liveTraffic) {
        await loadTrafficHistory();
        return;
      }

      if (!apiKey) {
        setTrafficError("Missing TomTom API key.");
        setTrafficSamples([]);
        await loadTrafficHistory();
        return;
      }

      if (!validStops.length) {
        setTrafficSamples([]);
        setTrafficSummary(EMPTY_SUMMARY);
        await loadTrafficHistory();
        return;
      }

      const cached = !force ? getCache(cacheKey) : null;
      if (cached) {
        setTrafficSamples(cached.samples || []);
        setTrafficSummary(cached.summary || EMPTY_SUMMARY);
        setLastTrafficUpdated(cached.lastTrafficUpdated || null);

        if (history) {
          await loadTrafficHistory();
        }

        return;
      }

      setTrafficLoading(true);
      setTrafficError("");

      try {
        const sampleStops = pickEvenlySpacedStops(validStops, maxSamplePoints);

        const results = await Promise.all(
          sampleStops.map(async (stop, index) => {
            const coords = toLatLng(stop);
            const lat = coords?.lat;
            const lng = coords?.lng;

            const response = await fetch(
              `https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json?point=${lat},${lng}&key=${apiKey}`
            );

            if (!response.ok) {
              throw new Error(`TomTom request failed (${response.status})`);
            }

            const data = await response.json();
            const segment = data?.flowSegmentData;
            const metrics = severityFromSegment(segment);

            return {
              id: stop.id || stop.stop_id || `sample-${index}`,
              name: stop.stopName || stop.stop_name || `Stop ${index + 1}`,
              lat,
              lng,
              usable: true,
              ...metrics,
            };
          })
        );

        const summary = buildTrafficSummary(results);
        const updatedAt = new Date().toISOString();

        setTrafficSamples(results);
        setTrafficSummary(summary);
        setLastTrafficUpdated(updatedAt);

        setCache(cacheKey, {
          samples: results,
          summary,
          lastTrafficUpdated: updatedAt,
        });

        await saveSnapshotIfDue(summary);
      } catch (error) {
        setTrafficError(error.message || "Failed to load traffic data.");
        setTrafficSamples([]);
      } finally {
        setTrafficLoading(false);
      }
    },
    [
      apiKey,
      cacheKey,
      enabled,
      history,
      liveTraffic,
      loadTrafficHistory,
      maxSamplePoints,
      saveSnapshotIfDue,
      validStops,
    ]
  );

  useEffect(() => {
    refreshTraffic();
  }, [refreshTraffic]);

  useEffect(() => {
    if (!enabled || !liveTraffic) return undefined;

    const intervalId = window.setInterval(() => {
      if (skipWhenHidden && typeof document !== "undefined" && document.hidden) {
        return;
      }

      refreshTraffic();
    }, SNAPSHOT_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, [enabled, liveTraffic, refreshTraffic, skipWhenHidden]);

  return {
    trafficSamples,
    trafficSummary,
    trafficHistory,
    historyAnalytics,
    trafficLoading,
    trafficError: trafficError || historyError,
    lastTrafficUpdated,
    refreshTraffic,
  };
}