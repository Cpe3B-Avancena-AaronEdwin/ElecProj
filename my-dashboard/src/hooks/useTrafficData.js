import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { db } from "../firebase/config";

const SNAPSHOT_COLLECTION = "trafficSnapshots";
const ANALYTICS_COLLECTION = "trafficAnalytics";
const ANALYTICS_DOC_ID = "network";

const SNAPSHOT_INTERVAL_MS = 5 * 60 * 1000;
const DASHBOARD_HISTORY_WINDOW_MS = 24 * 60 * 60 * 1000;
const DASHBOARD_HISTORY_LIMIT = 288;

const DEFAULT_MAX_SAMPLE_POINTS = 15;
const LIVE_CACHE_TTL_MS = 2 * 60 * 1000;
const HISTORY_CACHE_TTL_MS = 10 * 60 * 1000;
const CACHE_VERSION = "v3";

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

const EMPTY_ANALYTICS = {
  snapshotCount24h: 0,
  averageScore24h: 0,
  highestScore24h: 0,
  snapshotCount7d: 0,
  averageScore7d: 0,
  highestScore7d: 0,
  latestScore: 0,
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

function getTimedCache(key, ttlMs) {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.sessionStorage.getItem(key);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!parsed?.savedAt || Date.now() - parsed.savedAt > ttlMs) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function setTimedCache(key, payload) {
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.setItem(
      key,
      JSON.stringify({
        ...payload,
        savedAt: Date.now(),
      })
    );
  } catch {
    // ignore cache failures
  }
}

function getLiveCache(cacheKey) {
  return getTimedCache(`traffic-cache:${CACHE_VERSION}:${cacheKey}`, LIVE_CACHE_TTL_MS);
}

function setLiveCache(cacheKey, payload) {
  setTimedCache(`traffic-cache:${CACHE_VERSION}:${cacheKey}`, payload);
}

function getHistoryCache(cacheKey) {
  return getTimedCache(`traffic-history:${CACHE_VERSION}:${cacheKey}`, HISTORY_CACHE_TTL_MS);
}

function setHistoryCache(cacheKey, payload) {
  setTimedCache(`traffic-history:${CACHE_VERSION}:${cacheKey}`, payload);
}

function normalizeAnalyticsData(data = {}) {
  const latestSnapshot = data.latestSnapshot || null;

  return {
    snapshotCount24h: Number(data.snapshotCount24h || 0),
    averageScore24h: Number(data.averageScore24h || 0),
    highestScore24h: Number(data.highestScore24h || 0),
    snapshotCount7d: Number(data.snapshotCount7d || 0),
    averageScore7d: Number(data.averageScore7d || 0),
    highestScore7d: Number(data.highestScore7d || 0),
    latestScore: Number(data.latestScore || latestSnapshot?.congestionScore || 0),
    latestSnapshot: latestSnapshot
      ? {
          timestampMs: Number(latestSnapshot.timestampMs || 0),
          timestampText: latestSnapshot.timestampText || "",
          congestionScore: Number(latestSnapshot.congestionScore || 0),
          congestionLevel: latestSnapshot.congestionLevel || "Low",
          delayRisk: latestSnapshot.delayRisk || "Low",
          avgDelay: Number(latestSnapshot.avgDelay || 0),
          trafficSampleCount: Number(latestSnapshot.trafficSampleCount || 0),
          heavyCount: Number(latestSnapshot.heavyCount || 0),
          moderateCount: Number(latestSnapshot.moderateCount || 0),
          lowCount: Number(latestSnapshot.lowCount || 0),
          closedCount: Number(latestSnapshot.closedCount || 0),
          averageCurrentSpeed: Number(latestSnapshot.averageCurrentSpeed || 0),
          averageFreeFlowSpeed: Number(latestSnapshot.averageFreeFlowSpeed || 0),
        }
      : null,
    updatedAtIso: data.updatedAtIso || "",
  };
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
  const [historyAnalytics, setHistoryAnalytics] = useState(EMPTY_ANALYTICS);
  const [trafficLoading, setTrafficLoading] = useState(false);
  const [trafficError, setTrafficError] = useState("");
  const [historyError, setHistoryError] = useState("");
  const [lastTrafficUpdated, setLastTrafficUpdated] = useState(null);

  const historyLoadPromiseRef = useRef(null);
  const refreshInFlightRef = useRef(false);

  const validStops = useMemo(() => stops.filter((stop) => !!toLatLng(stop)), [stops]);
  const validStopsRef = useRef(validStops);

  useEffect(() => {
    validStopsRef.current = validStops;
  }, [validStops]);

  const applyHistoryPayload = useCallback(
    (history24h, analytics) => {
      const latest =
        analytics?.latestSnapshot || history24h[history24h.length - 1] || null;

      setTrafficHistory(history24h);
      setHistoryAnalytics({
        snapshotCount24h: Number(analytics?.snapshotCount24h || 0),
        averageScore24h: Number(analytics?.averageScore24h || 0),
        highestScore24h: Number(analytics?.highestScore24h || 0),
        snapshotCount7d: Number(analytics?.snapshotCount7d || 0),
        averageScore7d: Number(analytics?.averageScore7d || 0),
        highestScore7d: Number(analytics?.highestScore7d || 0),
        latestScore: Number(analytics?.latestScore || latest?.congestionScore || 0),
      });

      if (!liveTraffic && latest) {
        setTrafficSummary(summaryFromHistoryItem(latest));
        setLastTrafficUpdated(
          latest.timestampText || analytics?.updatedAtIso || null
        );
      }
    },
    [liveTraffic]
  );

  const loadTrafficHistory = useCallback(
    async (force = false) => {
      if (!history) {
        setTrafficHistory([]);
        setHistoryAnalytics(EMPTY_ANALYTICS);
        return { history24h: [], analytics: EMPTY_ANALYTICS };
      }

      const cached = !force ? getHistoryCache(cacheKey) : null;
      if (cached) {
        const history24h = cached.history24h || [];
        const analytics = cached.analytics || EMPTY_ANALYTICS;

        applyHistoryPayload(history24h, analytics);
        setHistoryError("");

        return { history24h, analytics };
      }

      if (historyLoadPromiseRef.current && !force) {
        return historyLoadPromiseRef.current;
      }

      const loadPromise = (async () => {
        try {
          const now = Date.now();
          const cutoff24h = now - DASHBOARD_HISTORY_WINDOW_MS;

          const history24hQuery = query(
            collection(db, SNAPSHOT_COLLECTION),
            where("timestampMs", ">=", cutoff24h),
            orderBy("timestampMs", "asc"),
            limit(DASHBOARD_HISTORY_LIMIT)
          );

          const analyticsRef = doc(db, ANALYTICS_COLLECTION, ANALYTICS_DOC_ID);

          const [history24hSnapshot, analyticsSnapshot] = await Promise.all([
            getDocs(history24hQuery),
            getDoc(analyticsRef),
          ]);

          const history24h = history24hSnapshot.docs.map(normalizeHistoryDoc);
          const analytics = analyticsSnapshot.exists()
            ? normalizeAnalyticsData(analyticsSnapshot.data())
            : EMPTY_ANALYTICS;

          applyHistoryPayload(history24h, analytics);

          setHistoryCache(cacheKey, {
            history24h,
            analytics,
          });

          setHistoryError("");
          return { history24h, analytics };
        } catch (error) {
          setHistoryError(error.message || "Failed to load traffic history.");
          setTrafficHistory([]);
          setHistoryAnalytics(EMPTY_ANALYTICS);
          return { history24h: [], analytics: EMPTY_ANALYTICS };
        } finally {
          historyLoadPromiseRef.current = null;
        }
      })();

      historyLoadPromiseRef.current = loadPromise;
      return loadPromise;
    },
    [applyHistoryPayload, cacheKey, history]
  );

  const refreshTraffic = useCallback(
    async (force = false) => {
      if (refreshInFlightRef.current && !force) return;
      refreshInFlightRef.current = true;

      try {
        if (!enabled || !liveTraffic) {
          await loadTrafficHistory(force);
          return;
        }

        if (!apiKey) {
          setTrafficError("Missing TomTom API key.");
          setTrafficSamples([]);
          await loadTrafficHistory(force);
          return;
        }

        const currentValidStops = validStopsRef.current;

        if (!currentValidStops.length) {
          setTrafficSamples([]);
          setTrafficSummary(EMPTY_SUMMARY);
          await loadTrafficHistory(force);
          return;
        }

        const cached = !force ? getLiveCache(cacheKey) : null;
        if (cached) {
          setTrafficSamples(cached.samples || []);
          setTrafficSummary(cached.summary || EMPTY_SUMMARY);
          setLastTrafficUpdated(cached.lastTrafficUpdated || null);

          if (history) {
            await loadTrafficHistory(force);
          }
          return;
        }

        setTrafficLoading(true);
        setTrafficError("");

        const sampleStops = pickEvenlySpacedStops(currentValidStops, maxSamplePoints);

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

        setLiveCache(cacheKey, {
          samples: results,
          summary,
          lastTrafficUpdated: updatedAt,
        });

        await loadTrafficHistory(force);
      } catch (error) {
        setTrafficError(error.message || "Failed to load traffic data.");
        setTrafficSamples([]);
      } finally {
        setTrafficLoading(false);
        refreshInFlightRef.current = false;
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
    ]
  );

  useEffect(() => {
    void refreshTraffic();
  }, [refreshTraffic]);

  useEffect(() => {
    if (!enabled || !liveTraffic) return undefined;

    const intervalId = window.setInterval(() => {
      if (skipWhenHidden && typeof document !== "undefined" && document.hidden) {
        return;
      }

      void refreshTraffic(true);
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