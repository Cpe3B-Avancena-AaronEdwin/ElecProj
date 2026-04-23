import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const SNAPSHOT_INTERVAL_MS = 5 * 60 * 1000;
const DEFAULT_MAX_SAMPLE_POINTS = 15;
const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";
const SNAPSHOT_TIMEOUT_MS = 15000;

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
  delayMinutes: 0,
  totalVehicles: 0,
  totalPassengers: 0,
  routeCount: 0,
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

async function fetchJson(url, fallbackMessage, options = {}) {
  const response = await fetch(url, {
    credentials: "include",
    ...options,
  });

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

async function fetchJsonWithTimeout(url, fallbackMessage, options = {}, timeoutMs = SNAPSHOT_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetchJson(url, fallbackMessage, {
      ...options,
      signal: controller.signal,
    });
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error("Traffic refresh timed out.");
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

function resolveTimestampMs(item) {
  const raw =
    item?.timestampMs ??
    item?.timestamp_ms ??
    (item?.timestampText || item?.timestamp || item?.createdAt
      ? new Date(item.timestampText || item.timestamp || item.createdAt).getTime()
      : NaN);

  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : NaN;
}

function resolveTimestampText(item) {
  const ts = resolveTimestampMs(item);
  if (Number.isFinite(ts)) return new Date(ts).toISOString();

  const raw = item?.timestampText || item?.timestamp || item?.createdAt || null;
  if (!raw) return null;

  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function normalizeSingleSnapshot(item) {
  if (!item) return null;

  const timestampMs = resolveTimestampMs(item);
  const timestampText = resolveTimestampText(item) || new Date().toISOString();

  return {
    id: item.id || item.snapshotId || "",
    snapshotId: item.snapshotId || item.id || "",
    routeId: item.routeId || item.route_id || "",
    routeName: item.routeName || item.route_name || "",
    congestionScore: Number(item.congestionScore ?? item.congestion_score ?? 0),
    congestionLevel: item.congestionLevel || item.congestion_level || "Low",
    averageSpeed: Number(item.averageSpeed ?? item.average_speed ?? 0),
    delayMinutes: Number(item.delayMinutes ?? item.delay_minutes ?? 0),
    totalVehicles: Number(item.totalVehicles ?? item.total_vehicles ?? 0),
    totalPassengers: Number(item.totalPassengers ?? item.total_passengers ?? 0),
    source: item.source || "system",
    notes: item.notes || "",
    timestampMs: Number.isFinite(timestampMs) ? timestampMs : new Date(timestampText).getTime(),
    timestampText,
    createdAt: item.createdAt || timestampText,
  };
}

function groupHistoryByMinute(history = []) {
  const bucket = {};

  for (const raw of history) {
    const item = normalizeSingleSnapshot(raw);
    if (!item) continue;

    const d = new Date(item.timestampMs);
    if (Number.isNaN(d.getTime())) continue;

    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate()
    ).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(
      d.getMinutes()
    ).padStart(2, "0")}`;

    if (!bucket[key]) {
      bucket[key] = {
        totalCongestionScore: 0,
        totalAverageSpeed: 0,
        totalDelayMinutes: 0,
        totalVehicles: 0,
        totalPassengers: 0,
        count: 0,
        timestampMs: item.timestampMs,
      };
    }

    bucket[key].totalCongestionScore += Number(item.congestionScore || 0);
    bucket[key].totalAverageSpeed += Number(item.averageSpeed || 0);
    bucket[key].totalDelayMinutes += Number(item.delayMinutes || 0);
    bucket[key].totalVehicles += Number(item.totalVehicles || 0);
    bucket[key].totalPassengers += Number(item.totalPassengers || 0);
    bucket[key].count += 1;

    if (item.timestampMs > bucket[key].timestampMs) {
      bucket[key].timestampMs = item.timestampMs;
    }
  }

  return Object.values(bucket)
    .sort((a, b) => a.timestampMs - b.timestampMs)
    .slice(-96)
    .map((entry) => {
      const avgScore = entry.totalCongestionScore / entry.count;

      return {
        id: `${entry.timestampMs}`,
        snapshotId: `${entry.timestampMs}`,
        routeId: "",
        routeName: "",
        congestionScore: Number(avgScore.toFixed(2)),
        congestionLevel: avgScore >= 70 ? "High" : avgScore >= 40 ? "Medium" : "Low",
        averageSpeed: Number((entry.totalAverageSpeed / entry.count).toFixed(2)),
        delayMinutes: Number((entry.totalDelayMinutes / entry.count).toFixed(2)),
        totalVehicles: entry.totalVehicles,
        totalPassengers: entry.totalPassengers,
        source: "history-grouped",
        notes: "",
time: new Date(entry.timestampMs).toLocaleTimeString("en-PH", {
  timeZone: "Asia/Manila",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
}),
        timestampText: new Date(entry.timestampMs).toISOString(),
        timestampMs: entry.timestampMs,
        createdAt: new Date(entry.timestampMs).toISOString(),
      };
    });
}

function summarizeSnapshots(snapshots = []) {
  if (!Array.isArray(snapshots) || snapshots.length === 0) {
    return { ...EMPTY_SUMMARY };
  }

  const total = snapshots.length;
  const totalScore = snapshots.reduce((sum, item) => sum + Number(item.congestionScore || 0), 0);
  const totalSpeed = snapshots.reduce((sum, item) => sum + Number(item.averageSpeed || 0), 0);
  const totalDelay = snapshots.reduce((sum, item) => sum + Number(item.delayMinutes || 0), 0);
  const totalVehicles = snapshots.reduce((sum, item) => sum + Number(item.totalVehicles || 0), 0);
  const totalPassengers = snapshots.reduce((sum, item) => sum + Number(item.totalPassengers || 0), 0);

  const light = snapshots.filter((item) => item.congestionLevel === "Low").length;
  const moderate = snapshots.filter((item) => item.congestionLevel === "Medium").length;
  const heavy = snapshots.filter((item) => item.congestionLevel === "High").length;

  const averageScore = totalScore / total;
  const avgSpeed = totalSpeed / total;
  const avgDelay = totalDelay / total;

  return {
    total,
    totalPoints: total,
    samples: total,
    light,
    moderate,
    heavy,
    closed: 0,
    averageCurrentSpeed: Number(avgSpeed.toFixed(2)),
    averageFreeFlowSpeed: 0,
    level: averageScore >= 70 ? "High" : averageScore >= 40 ? "Medium" : "Low",
    avgSpeed: Number(avgSpeed.toFixed(2)),
    congestionScore: Number(averageScore.toFixed(2)),
    delayMinutes: Number(avgDelay.toFixed(2)),
    totalVehicles,
    totalPassengers,
    routeCount: total,
  };
}

function buildAnalyticsFromHistory(history = []) {
  if (!Array.isArray(history) || history.length === 0) {
    return { ...EMPTY_ANALYTICS };
  }

  const now = Date.now();
  const last24h = history.filter(
    (item) => now - Number(item.timestampMs || 0) <= 24 * 60 * 60 * 1000
  );
  const last7d = history.filter(
    (item) => now - Number(item.timestampMs || 0) <= 7 * 24 * 60 * 60 * 1000
  );

  const avg24h =
    last24h.length > 0
      ? last24h.reduce((sum, item) => sum + Number(item.congestionScore || 0), 0) / last24h.length
      : 0;

  const avg7d =
    last7d.length > 0
      ? last7d.reduce((sum, item) => sum + Number(item.congestionScore || 0), 0) / last7d.length
      : 0;

  const high24h =
    last24h.length > 0 ? Math.max(...last24h.map((item) => Number(item.congestionScore || 0))) : 0;

  const high7d =
    last7d.length > 0 ? Math.max(...last7d.map((item) => Number(item.congestionScore || 0))) : 0;

  const latest = history[history.length - 1];

  return {
    snapshotCount24h: last24h.length,
    averageScore24h: Number(avg24h.toFixed(2)),
    highestScore24h: Number(high24h.toFixed(2)),
    snapshotCount7d: last7d.length,
    averageScore7d: Number(avg7d.toFixed(2)),
    highestScore7d: Number(high7d.toFixed(2)),
    latestScore: Number(latest?.congestionScore || 0),
  };
}

function buildSummaryFromHistory(history = []) {
  if (!Array.isArray(history) || history.length === 0) {
    return { ...EMPTY_SUMMARY };
  }

  const latest = history[history.length - 1];
  const base = summarizeSnapshots(history);

  return {
    ...base,
    level: latest?.congestionLevel || base.level,
    congestionScore: Number(latest?.congestionScore ?? base.congestionScore ?? 0),
    delayMinutes: Number(latest?.delayMinutes ?? base.delayMinutes ?? 0),
    avgSpeed: Number(latest?.averageSpeed ?? base.avgSpeed ?? 0),
    averageCurrentSpeed: Number(latest?.averageSpeed ?? base.averageCurrentSpeed ?? 0),
    totalVehicles: Number(latest?.totalVehicles ?? base.totalVehicles ?? 0),
    totalPassengers: Number(latest?.totalPassengers ?? base.totalPassengers ?? 0),
  };
}

function getLatestTimestampFromHistory(history = []) {
  if (!Array.isArray(history) || history.length === 0) return null;
  const latest = history[history.length - 1];
  return latest?.timestampText || latest?.createdAt || null;
}

export function useTrafficData(stops = [], _apiKey, options = {}) {
  const resolvedOptions = resolveOptions(options);
  const { enabled, liveTraffic, history, maxSamplePoints, skipWhenHidden } = resolvedOptions;

  const [trafficSamples, setTrafficSamples] = useState([]);
  const [trafficSummary, setTrafficSummary] = useState({ ...EMPTY_SUMMARY });
  const [trafficHistory, setTrafficHistory] = useState([]);
  const [historyAnalytics, setHistoryAnalytics] = useState({ ...EMPTY_ANALYTICS });
  const [trafficLoading, setTrafficLoading] = useState(false);
  const [trafficError, setTrafficError] = useState("");
  const [lastTrafficUpdated, setLastTrafficUpdated] = useState(null);

  const refreshInFlightRef = useRef(false);
  const validStopsRef = useRef([]);

  const validStops = useMemo(() => stops.filter((stop) => !!toLatLng(stop)), [stops]);

  useEffect(() => {
    validStopsRef.current = validStops;
  }, [validStops]);

  const loadHistoryOnly = useCallback(async () => {
    if (!history) {
      setTrafficHistory([]);
      setHistoryAnalytics({ ...EMPTY_ANALYTICS });
      setTrafficSummary({ ...EMPTY_SUMMARY });
      setLastTrafficUpdated(null);
      return [];
    }

    const historyRows = await fetchJson(
      `${API_BASE}/api/traffic/history?hours=24&limit=96`,
      "Failed to load traffic history."
    );

    const normalizedHistory = Array.isArray(historyRows)
      ? historyRows.map(normalizeSingleSnapshot).filter(Boolean)
      : [];

    const groupedHistory = groupHistoryByMinute(normalizedHistory);
    const summary = buildSummaryFromHistory(groupedHistory);
    const analytics = buildAnalyticsFromHistory(groupedHistory);
    const latestTimestamp = getLatestTimestampFromHistory(groupedHistory);

    setTrafficHistory(groupedHistory);
    setHistoryAnalytics(analytics);
    setTrafficSummary(summary);
    setLastTrafficUpdated(latestTimestamp);
    setTrafficSamples(
      groupedHistory.length > 0 ? [groupedHistory[groupedHistory.length - 1]] : []
    );

    return groupedHistory;
  }, [history]);

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
      setTrafficLoading(true);
      setTrafficError("");

      try {
        if (!enabled) return;

        await loadHistoryOnly();

        if (liveTraffic) {
          try {
            await fetchJsonWithTimeout(
              `${API_BASE}/api/traffic/snapshot`,
              "Failed to generate traffic snapshot.",
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  stops: validStopsRef.current,
                  maxSamplePoints,
                }),
              },
              SNAPSHOT_TIMEOUT_MS
            );

            await loadHistoryOnly();
          } catch (liveError) {
            setTrafficError(liveError.message || "Failed to refresh live traffic snapshot.");
          }
        }
      } catch (error) {
        setTrafficError(error.message || "Failed to load traffic data.");
      } finally {
        setTrafficLoading(false);
        refreshInFlightRef.current = false;
      }
    },
    [enabled, liveTraffic, loadHistoryOnly, maxSamplePoints, skipWhenHidden]
  );

  useEffect(() => {
    void refreshTraffic(true);
  }, [refreshTraffic]);

  useEffect(() => {
    if (!enabled || !liveTraffic) return undefined;

    const intervalId = window.setInterval(() => {
      void refreshTraffic(true);
    }, SNAPSHOT_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, [enabled, liveTraffic, refreshTraffic]);

  const chartData = useMemo(() => {
    return trafficHistory.map((item) => ({
      time:
        item.time ||
new Date(item.createdAt || item.timestampText).toLocaleTimeString("en-PH", {
  timeZone: "Asia/Manila",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
}),
      congestionScore: Number(item.congestionScore || 0),
      averageSpeed: Number(item.averageSpeed || 0),
      delayMinutes: Number(item.delayMinutes || 0),
      totalVehicles: Number(item.totalVehicles || 0),
      totalPassengers: Number(item.totalPassengers || 0),
    }));
  }, [trafficHistory]);

  return {
    trafficSamples,
    trafficSummary,
    trafficHistory,
    chartData,
    historyAnalytics,
    trafficLoading,
    trafficError,
    lastTrafficUpdated,
    refreshTraffic,
  };
}