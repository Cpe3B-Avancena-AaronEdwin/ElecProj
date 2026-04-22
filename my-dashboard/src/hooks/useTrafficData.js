import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const SNAPSHOT_INTERVAL_MS = 5 * 60 * 1000;
const LIVE_CACHE_TTL_MS = 2 * 60 * 1000;
const HISTORY_CACHE_TTL_MS = 10 * 60 * 1000;
const DEFAULT_MAX_SAMPLE_POINTS = 15;
const CACHE_VERSION = "v4";

const API_BASE = import.meta.env.VITE_API_BASE_URL;

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
  const lat = parseFloat(stop?.stopLat ?? stop?.stop_lat ?? stop?.latitude);
  const lng = parseFloat(stop?.stopLon ?? stop?.stop_lon ?? stop?.longitude);

  if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
  return { lat, lng };
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

async function fetchJson(url, fallbackMessage, options) {
  const response = await fetch(url, options);

  let data = null;

  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    throw new Error(data?.error || fallbackMessage);
  }

  return data;
}

export function useTrafficData(stops = [], _apiKey, options = {}) {
  const resolvedOptions = resolveOptions(options);
  const { enabled, liveTraffic, history, cacheKey, maxSamplePoints, skipWhenHidden } =
    resolvedOptions;

  const [trafficSamples, setTrafficSamples] = useState([]);
  const [trafficSummary, setTrafficSummary] = useState({ ...EMPTY_SUMMARY });
  const [trafficHistory, setTrafficHistory] = useState([]);
  const [historyAnalytics, setHistoryAnalytics] = useState({ ...EMPTY_ANALYTICS });
  const [trafficLoading, setTrafficLoading] = useState(false);
  const [trafficError, setTrafficError] = useState("");
  const [historyError, setHistoryError] = useState("");
  const [lastTrafficUpdated, setLastTrafficUpdated] = useState(null);

  const refreshInFlightRef = useRef(false);

  const validStops = useMemo(() => stops.filter((stop) => !!toLatLng(stop)), [stops]);
  const validStopsRef = useRef(validStops);

  useEffect(() => {
    validStopsRef.current = validStops;
  }, [validStops]);

  const applyPayload = useCallback(
    (payload) => {
      setTrafficSamples(Array.isArray(payload?.trafficSamples) ? payload.trafficSamples : []);
      setTrafficSummary(payload?.trafficSummary || { ...EMPTY_SUMMARY });
      setTrafficHistory(history ? payload?.trafficHistory || [] : []);
      setHistoryAnalytics(history ? payload?.historyAnalytics || { ...EMPTY_ANALYTICS } : { ...EMPTY_ANALYTICS });
      setLastTrafficUpdated(payload?.lastTrafficUpdated || null);
    },
    [history]
  );

  const loadTrafficHistory = useCallback(
    async (force = false) => {
      if (!history) {
        setTrafficHistory([]);
        setHistoryAnalytics({ ...EMPTY_ANALYTICS });
        return null;
      }

      const cached = !force ? getHistoryCache(cacheKey) : null;
      if (cached?.payload) {
        applyPayload({
          trafficSamples,
          trafficSummary,
          trafficHistory: cached.payload.trafficHistory || [],
          historyAnalytics: cached.payload.historyAnalytics || { ...EMPTY_ANALYTICS },
          lastTrafficUpdated: cached.payload.lastTrafficUpdated || lastTrafficUpdated,
        });
        setHistoryError("");
        return cached.payload;
      }

      try {
        const payload = await fetchJson(
          `${API_BASE}/api/traffic/history`,
          "Failed to load traffic history."
        );

        setHistoryCache(cacheKey, { payload });
        applyPayload({
          trafficSamples,
          trafficSummary,
          trafficHistory: payload.trafficHistory || [],
          historyAnalytics: payload.historyAnalytics || { ...EMPTY_ANALYTICS },
          lastTrafficUpdated: payload.latestItem?.timestampText || lastTrafficUpdated,
        });
        setHistoryError("");
        return payload;
      } catch (error) {
        setHistoryError(error.message || "Failed to load traffic history.");
        return null;
      }
    },
    [
      applyPayload,
      cacheKey,
      history,
      lastTrafficUpdated,
      trafficSamples,
      trafficSummary,
    ]
  );

  const refreshTraffic = useCallback(
    async (force = false) => {
      if (refreshInFlightRef.current && !force) return;

      if (
        skipWhenHidden &&
        typeof document !== "undefined" &&
        document.visibilityState === "hidden" &&
        !force
      ) {
        return;
      }

      refreshInFlightRef.current = true;

      try {
        if (!enabled) {
          const fallback = await fetchJson(`${API_BASE}/api/traffic`, "Failed to load traffic snapshot.");
          applyPayload(fallback);
          setTrafficError("");
          return;
        }

        if (!liveTraffic) {
          const fallback = await fetchJson(`${API_BASE}/api/traffic`, "Failed to load traffic snapshot.");
          applyPayload(fallback);
          setTrafficError("");
          return;
        }

        const currentValidStops = validStopsRef.current;

        const cached = !force ? getLiveCache(cacheKey) : null;
        if (cached?.payload) {
          applyPayload(cached.payload);
          setTrafficError("");

          if (history) {
            await loadTrafficHistory(force);
          }
          return;
        }

        setTrafficLoading(true);
        setTrafficError("");

        const payload = await fetchJson(
          `${API_BASE}/api/traffic/refresh`,
          "Failed to load live traffic.",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              stops: currentValidStops,
              maxSamplePoints,
            }),
          }
        );

        applyPayload(payload);
        setLiveCache(cacheKey, { payload });

        if (history) {
          setHistoryCache(cacheKey, {
            payload: {
              trafficHistory: payload.trafficHistory || [],
              historyAnalytics: payload.historyAnalytics || { ...EMPTY_ANALYTICS },
              lastTrafficUpdated: payload.lastTrafficUpdated || null,
            },
          });
        }

        if (payload?.warning) {
          setTrafficError(payload.warning);
        } else {
          setTrafficError("");
        }
      } catch (error) {
        setTrafficError(error.message || "Failed to load traffic data.");

        try {
          const fallback = await fetchJson(`${API_BASE}/api/traffic`, "Failed to load traffic snapshot.");
          applyPayload(fallback);
        } catch {
          // ignore fallback failure
        }
      } finally {
        setTrafficLoading(false);
        refreshInFlightRef.current = false;
      }
    },
    [
      applyPayload,
      cacheKey,
      enabled,
      history,
      liveTraffic,
      loadTrafficHistory,
      maxSamplePoints,
      skipWhenHidden,
    ]
  );

  useEffect(() => {
    void refreshTraffic();
  }, [refreshTraffic]);

  useEffect(() => {
    if (!enabled || !liveTraffic) return undefined;

    const intervalId = window.setInterval(() => {
      void refreshTraffic();
    }, SNAPSHOT_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, [enabled, liveTraffic, refreshTraffic]);

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