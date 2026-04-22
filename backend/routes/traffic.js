import express from "express";
import { db } from "../firebaseAdmin.js";

const router = express.Router();

const SNAPSHOT_COLLECTION = "trafficSnapshots";
const SNAPSHOT_INTERVAL_MS = 5 * 60 * 1000;
const SNAPSHOT_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

const DASHBOARD_HISTORY_WINDOW_MS = 24 * 60 * 60 * 1000;
const ANALYTICS_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

const DASHBOARD_HISTORY_LIMIT = 288;
const ANALYTICS_HISTORY_LIMIT = 2016;
const LATEST_SNAPSHOT_LIMIT = 1;
const CLEANUP_BATCH_LIMIT = 25;

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

function toLatLng(stop) {
  const lat = parseFloat(stop?.stopLat ?? stop?.stop_lat ?? stop?.latitude ?? stop?.lat);
  const lng = parseFloat(stop?.stopLon ?? stop?.stop_lon ?? stop?.longitude ?? stop?.lng);

  if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
  return { lat, lng };
}

function pickEvenlySpacedStops(stops = [], maxPoints = 15) {
  if (!Array.isArray(stops) || stops.length <= maxPoints) return stops;

  const result = [];
  const usedIndexes = new Set();
  const step = (stops.length - 1) / (maxPoints - 1);

  for (let i = 0; i < maxPoints; i += 1) {
    const index = Math.round(i * step);
    if (!usedIndexes.has(index) && stops[index]) {
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

function normalizeHistoryData(data = {}, id = "") {
  const normalizeValue = (value) => {
    if (value && typeof value.toDate === "function") {
      return value.toDate().toISOString();
    }
    return value;
  };

  const normalized = Object.fromEntries(
    Object.entries(data).map(([key, value]) => [key, normalizeValue(value)])
  );

  return {
    id,
    timestampMs: Number(normalized.timestampMs || 0),
    timestampText: normalized.timestampText || "",
    congestionScore: Number(normalized.congestionScore || 0),
    congestionLevel: normalized.congestionLevel || "Low",
    delayRisk: normalized.delayRisk || "Low",
    avgDelay: Number(normalized.avgDelay || 0),
    trafficSampleCount: Number(normalized.trafficSampleCount || 0),
    heavyCount: Number(normalized.heavyCount || 0),
    moderateCount: Number(normalized.moderateCount || 0),
    lowCount: Number(normalized.lowCount || 0),
    closedCount: Number(normalized.closedCount || 0),
    averageCurrentSpeed: Number(normalized.averageCurrentSpeed || 0),
    averageFreeFlowSpeed: Number(normalized.averageFreeFlowSpeed || 0),
    createdAt: normalized.createdAt || null,
    updatedAt: normalized.updatedAt || null,
  };
}

function normalizeHistoryDoc(docSnap) {
  return normalizeHistoryData(docSnap.data() || {}, docSnap.id);
}

function summaryFromHistoryItem(item) {
  if (!item) return { ...EMPTY_SUMMARY };

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

function averageFromItems(items = []) {
  if (!items.length) return 0;
  const total = items.reduce((sum, item) => sum + Number(item.congestionScore || 0), 0);
  return Number((total / items.length).toFixed(1));
}

function highestFromItems(items = []) {
  if (!items.length) return 0;
  return Math.max(...items.map((item) => Number(item.congestionScore || 0)));
}

function buildHistoryAnalytics(history24h = [], history7d = [], latestItem = null) {
  return {
    snapshotCount24h: history24h.length,
    averageScore24h: averageFromItems(history24h),
    highestScore24h: highestFromItems(history24h),
    snapshotCount7d: history7d.length,
    averageScore7d: averageFromItems(history7d),
    highestScore7d: highestFromItems(history7d),
    latestScore: latestItem ? Number(latestItem.congestionScore || 0) : 0,
  };
}

async function cleanupOldSnapshots() {
  const now = Date.now();
  const cutoff = now - SNAPSHOT_RETENTION_MS;

  const oldQuery = db
    .collection(SNAPSHOT_COLLECTION)
    .where("timestampMs", "<", cutoff)
    .limit(CLEANUP_BATCH_LIMIT);

  const snapshot = await oldQuery.get();

  if (snapshot.empty) return 0;

  await Promise.all(snapshot.docs.map((docSnap) => docSnap.ref.delete()));
  return snapshot.size;
}

async function getHistoryPayload() {
  const now = Date.now();
  const cutoff24h = now - DASHBOARD_HISTORY_WINDOW_MS;
  const cutoff7d = now - ANALYTICS_WINDOW_MS;

  const history24hQuery = db
    .collection(SNAPSHOT_COLLECTION)
    .where("timestampMs", ">=", cutoff24h)
    .orderBy("timestampMs", "asc")
    .limit(DASHBOARD_HISTORY_LIMIT);

  const history7dQuery = db
    .collection(SNAPSHOT_COLLECTION)
    .where("timestampMs", ">=", cutoff7d)
    .orderBy("timestampMs", "asc")
    .limit(ANALYTICS_HISTORY_LIMIT);

  const latestQuery = db
    .collection(SNAPSHOT_COLLECTION)
    .orderBy("timestampMs", "desc")
    .limit(LATEST_SNAPSHOT_LIMIT);

  const [history24hSnapshot, history7dSnapshot, latestSnapshot] = await Promise.all([
    history24hQuery.get(),
    history7dQuery.get(),
    latestQuery.get(),
  ]);

  const history24h = history24hSnapshot.docs.map(normalizeHistoryDoc);
  const history7d = history7dSnapshot.docs.map(normalizeHistoryDoc);
  const latestItem = latestSnapshot.empty
    ? history24h[history24h.length - 1] || history7d[history7d.length - 1] || null
    : normalizeHistoryDoc(latestSnapshot.docs[0]);

  return {
    history24h,
    history7d,
    latestItem,
    historyAnalytics: buildHistoryAnalytics(history24h, history7d, latestItem),
  };
}

async function saveSnapshotIfDue(summary) {
  const now = Date.now();

  const latestQuery = db
    .collection(SNAPSHOT_COLLECTION)
    .orderBy("timestampMs", "desc")
    .limit(LATEST_SNAPSHOT_LIMIT);

  const latestSnapshot = await latestQuery.get();
  const latest = latestSnapshot.empty ? null : normalizeHistoryDoc(latestSnapshot.docs[0]);

  if (latest?.timestampMs && now - latest.timestampMs < SNAPSHOT_INTERVAL_MS) {
    return {
      saved: false,
      latestItem: latest,
    };
  }

  const payload = {
    timestampMs: now,
    timestampText: new Date(now).toISOString(),
    createdAt: new Date(),
    updatedAt: new Date(),
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
  };

  const docRef = await db.collection(SNAPSHOT_COLLECTION).add(payload);

  return {
    saved: true,
    latestItem: normalizeHistoryData(payload, docRef.id),
  };
}

async function fetchTomTomTraffic(points, apiKey) {
  const results = await Promise.all(
    points.map(async (stop, index) => {
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

  return results;
}

function isQuotaError(error) {
  const msg = String(error?.message || "").toLowerCase();
  return (
    msg.includes("429") ||
    msg.includes("quota") ||
    msg.includes("rate limit") ||
    msg.includes("too many requests")
  );
}

router.get("/", async (req, res, next) => {
  try {
    const historyPayload = await getHistoryPayload();
    const latestItem = historyPayload.latestItem;

    res.json({
      trafficSamples: [],
      trafficSummary: latestItem ? summaryFromHistoryItem(latestItem) : { ...EMPTY_SUMMARY },
      trafficHistory: historyPayload.history24h,
      historyAnalytics: historyPayload.historyAnalytics,
      lastTrafficUpdated: latestItem?.timestampText || null,
      source: latestItem ? "snapshot" : "empty",
    });
  } catch (error) {
    next(error);
  }
});

router.get("/history", async (req, res, next) => {
  try {
    const historyPayload = await getHistoryPayload();

    res.json({
      trafficHistory: historyPayload.history24h,
      history7d: historyPayload.history7d,
      historyAnalytics: historyPayload.historyAnalytics,
      latestItem: historyPayload.latestItem,
    });
  } catch (error) {
    next(error);
  }
});

router.post("/refresh", async (req, res, next) => {
  try {
    const { stops = [], maxSamplePoints = 15 } = req.body;
    const apiKey = process.env.TOMTOM_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: "Missing TOMTOM_API_KEY in backend environment",
      });
    }

    const validStops = Array.isArray(stops) ? stops.filter((stop) => !!toLatLng(stop)) : [];

    if (!validStops.length) {
      const historyPayload = await getHistoryPayload();
      const latestItem = historyPayload.latestItem;

      return res.json({
        trafficSamples: [],
        trafficSummary: latestItem ? summaryFromHistoryItem(latestItem) : { ...EMPTY_SUMMARY },
        trafficHistory: historyPayload.history24h,
        historyAnalytics: historyPayload.historyAnalytics,
        lastTrafficUpdated: latestItem?.timestampText || null,
        source: latestItem ? "snapshot" : "empty",
      });
    }

    const sampleStops = pickEvenlySpacedStops(validStops, maxSamplePoints);
    const trafficSamples = await fetchTomTomTraffic(sampleStops, apiKey);
    const trafficSummary = buildTrafficSummary(trafficSamples);
    const lastTrafficUpdated = new Date().toISOString();

    await saveSnapshotIfDue(trafficSummary);
    const historyPayload = await getHistoryPayload();
    await cleanupOldSnapshots().catch(() => {});

    res.json({
      trafficSamples,
      trafficSummary,
      trafficHistory: historyPayload.history24h,
      historyAnalytics: historyPayload.historyAnalytics,
      lastTrafficUpdated,
      source: "live",
    });
  } catch (error) {
    if (isQuotaError(error)) {
      try {
        const historyPayload = await getHistoryPayload();
        const latestItem = historyPayload.latestItem;

        return res.json({
          trafficSamples: [],
          trafficSummary: latestItem ? summaryFromHistoryItem(latestItem) : { ...EMPTY_SUMMARY },
          trafficHistory: historyPayload.history24h,
          historyAnalytics: historyPayload.historyAnalytics,
          lastTrafficUpdated: latestItem?.timestampText || null,
          source: latestItem ? "snapshot" : "empty",
          warning: "TomTom live traffic quota reached. Showing latest saved snapshot.",
        });
      } catch (historyError) {
        return next(historyError);
      }
    }

    next(error);
  }
});

export default router;