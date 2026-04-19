import admin from "firebase-admin";
import fs from "node:fs/promises";
import path from "node:path";
import Papa from "papaparse";

const SNAPSHOT_COLLECTION = "trafficSnapshots";
const ANALYTICS_COLLECTION = "trafficAnalytics";
const ANALYTICS_DOC_ID = "network";

const SNAPSHOT_INTERVAL_MS = 5 * 60 * 1000;
const WINDOW_24H_MS = 24 * 60 * 60 * 1000;
const WINDOW_7D_MS = 7 * 24 * 60 * 60 * 1000;
const RETENTION_MS = WINDOW_7D_MS;
const DEFAULT_SAMPLE_POINTS = 15;
const CLEANUP_BATCH_LIMIT = 100;

function getServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) {
    throw new Error("Missing FIREBASE_SERVICE_ACCOUNT");
  }

  const parsed = JSON.parse(raw);

  if (parsed.private_key) {
    parsed.private_key = parsed.private_key.replace(/\\n/g, "\n");
  }

  return parsed;
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(getServiceAccount()),
  });
}

const db = admin.firestore();

function toNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function toLatLng(stop) {
  const lat = toNumber(stop.stop_lat ?? stop.stopLat ?? stop.latitude, NaN);
  const lng = toNumber(stop.stop_lon ?? stop.stopLon ?? stop.longitude, NaN);

  if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
  return { lat, lng };
}

function pickEvenlySpacedStops(stops = [], maxPoints = DEFAULT_SAMPLE_POINTS) {
  if (!Array.isArray(stops) || stops.length <= maxPoints) return stops;

  const result = [];
  const used = new Set();
  const step = (stops.length - 1) / (maxPoints - 1);

  for (let i = 0; i < maxPoints; i += 1) {
    const index = Math.round(i * step);
    if (!used.has(index)) {
      result.push(stops[index]);
      used.add(index);
    }
  }

  return result;
}

function severityFromSegment(segment) {
  const currentSpeed = toNumber(segment?.currentSpeed);
  const freeFlowSpeed = toNumber(segment?.freeFlowSpeed);
  const ratio = freeFlowSpeed > 0 ? currentSpeed / freeFlowSpeed : 1;

  let severity = "Light";
  let congestionScore = Math.round((1 - Math.min(ratio, 1)) * 100);

  if (segment?.roadClosure === true) {
    severity = "Closed";
    congestionScore = 100;
  } else if (ratio < 0.35) {
    severity = "Heavy";
    congestionScore = Math.max(70, congestionScore);
  } else if (ratio < 0.75) {
    severity = "Moderate";
    congestionScore = Math.max(35, congestionScore);
  } else {
    congestionScore = Math.min(30, congestionScore);
  }

  return {
    severity,
    currentSpeed,
    freeFlowSpeed,
    congestionScore,
  };
}

function buildTrafficSummary(results = []) {
  const usable = results.filter((item) => item.usable);

  let currentTotal = 0;
  let freeFlowTotal = 0;
  let congestionScoreTotal = 0;

  const summary = {
    total: usable.length,
    totalPoints: usable.length,
    samples: usable.length,
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

  usable.forEach((item) => {
    currentTotal += toNumber(item.currentSpeed);
    freeFlowTotal += toNumber(item.freeFlowSpeed);
    congestionScoreTotal += toNumber(item.congestionScore);

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

function buildDelayRisk(summary) {
  if (summary.closed > 0 || summary.heavy >= 2) return "High";
  if (summary.moderate > 0 || summary.heavy === 1) return "Medium";
  return "Low";
}

function averageFromWindow(items = []) {
  if (!items.length) return 0;
  const total = items.reduce((sum, item) => sum + toNumber(item.s), 0);
  return Number((total / items.length).toFixed(1));
}

function highestFromWindow(items = []) {
  if (!items.length) return 0;
  return Math.max(...items.map((item) => toNumber(item.s)));
}

async function readGtfsStops() {
  const stopsPath = path.join(process.cwd(), "public", "gtfs", "stops.txt");
  const raw = await fs.readFile(stopsPath, "utf8");

  const parsed = Papa.parse(raw, {
    header: true,
    skipEmptyLines: true,
  });

  const rows = Array.isArray(parsed.data) ? parsed.data : [];

  return rows
    .map((row) => ({
      stop_id: row.stop_id,
      stop_name: row.stop_name,
      stop_lat: row.stop_lat,
      stop_lon: row.stop_lon,
      location_type: row.location_type,
    }))
    .filter((row) => {
      const coords = toLatLng(row);
      return coords && String(row.location_type || "0") === "0";
    });
}

async function fetchTrafficSample(stop, apiKey, index) {
  const coords = toLatLng(stop);
  const response = await fetch(
    `https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json?point=${coords.lat},${coords.lng}&key=${apiKey}`,
    {
      headers: {
        accept: "application/json",
      },
    }
  );

  if (!response.ok) {
    throw new Error(`TomTom request failed (${response.status})`);
  }

  const data = await response.json();
  const segment = data?.flowSegmentData;
  const metrics = severityFromSegment(segment);

  return {
    id: stop.stop_id || `sample-${index}`,
    name: stop.stop_name || `Stop ${index + 1}`,
    lat: coords.lat,
    lng: coords.lng,
    usable: true,
    ...metrics,
  };
}

async function cleanupOldSnapshots(nowMs) {
  const cutoff = nowMs - RETENTION_MS;

  const oldQuery = db
    .collection(SNAPSHOT_COLLECTION)
    .where("timestampMs", "<", cutoff)
    .limit(CLEANUP_BATCH_LIMIT);

  const snap = await oldQuery.get();
  if (snap.empty) return 0;

  const batch = db.batch();
  snap.docs.forEach((docSnap) => batch.delete(docSnap.ref));
  await batch.commit();

  return snap.size;
}

export default async function handler(req, res) {
  try {
    const cronSecret = process.env.CRON_SECRET;

    if (process.env.VERCEL_ENV === "production" && cronSecret) {
      const authHeader = req.headers.authorization || "";
      if (authHeader !== `Bearer ${cronSecret}`) {
        return res.status(401).json({ ok: false, error: "Unauthorized" });
      }
    }

    const tomtomApiKey = (process.env.TOMTOM_API_KEY || "").trim();
    if (!tomtomApiKey) {
      throw new Error("Missing TOMTOM_API_KEY");
    }

    const nowMs = Date.now();
    const nowIso = new Date(nowMs).toISOString();
    const maxSamplePoints = Math.max(
      2,
      Number(process.env.TRAFFIC_SAMPLE_POINTS || DEFAULT_SAMPLE_POINTS)
    );

    const analyticsRef = db.collection(ANALYTICS_COLLECTION).doc(ANALYTICS_DOC_ID);
    const analyticsSnap = await analyticsRef.get();
    const analyticsData = analyticsSnap.exists ? analyticsSnap.data() || {} : {};

    const latestSnapshot = analyticsData.latestSnapshot || null;
    if (latestSnapshot?.timestampMs && nowMs - latestSnapshot.timestampMs < SNAPSHOT_INTERVAL_MS - 15000) {
      return res.status(200).json({
        ok: true,
        skipped: true,
        reason: "Snapshot already exists for the current 5-minute window.",
        latestTimestamp: latestSnapshot.timestampText || null,
      });
    }

    const allStops = await readGtfsStops();
    if (!allStops.length) {
      throw new Error("No valid GTFS stops found in public/gtfs/stops.txt");
    }

    const sampleStops = pickEvenlySpacedStops(allStops, maxSamplePoints);

    const results = await Promise.all(
      sampleStops.map((stop, index) => fetchTrafficSample(stop, tomtomApiKey, index))
    );

    const summary = buildTrafficSummary(results);
    const delayRisk = buildDelayRisk(summary);

    const snapshotDoc = {
      timestampMs: nowMs,
      timestampText: nowIso,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      source: "vercel-cron",
      congestionScore: Number(summary.congestionScore || 0),
      congestionLevel: summary.level || "Low",
      delayRisk,
      avgDelay: 0,
      trafficSampleCount: Number(summary.total || 0),
      heavyCount: Number(summary.heavy || 0),
      moderateCount: Number(summary.moderate || 0),
      lowCount: Number(summary.light || 0),
      closedCount: Number(summary.closed || 0),
      averageCurrentSpeed: Number(summary.averageCurrentSpeed || 0),
      averageFreeFlowSpeed: Number(summary.averageFreeFlowSpeed || 0),
    };

    await db.collection(SNAPSHOT_COLLECTION).add(snapshotDoc);

    const prev24h = Array.isArray(analyticsData.window24h) ? analyticsData.window24h : [];
    const prev7d = Array.isArray(analyticsData.window7d) ? analyticsData.window7d : [];

    const nextPoint = { t: nowMs, s: Number(summary.congestionScore || 0) };

    const window24h = [...prev24h, nextPoint].filter((item) => nowMs - Number(item.t || 0) <= WINDOW_24H_MS);
    const window7d = [...prev7d, nextPoint].filter((item) => nowMs - Number(item.t || 0) <= WINDOW_7D_MS);

    await analyticsRef.set(
      {
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAtIso: nowIso,
        latestSnapshot: snapshotDoc,

        snapshotCount24h: window24h.length,
        averageScore24h: averageFromWindow(window24h),
        highestScore24h: highestFromWindow(window24h),

        snapshotCount7d: window7d.length,
        averageScore7d: averageFromWindow(window7d),
        highestScore7d: highestFromWindow(window7d),

        latestScore: Number(summary.congestionScore || 0),

        window24h,
        window7d,
      },
      { merge: true }
    );

    const deleted = await cleanupOldSnapshots(nowMs);

    return res.status(200).json({
      ok: true,
      saved: true,
      deletedOldSnapshots: deleted,
      snapshot: {
        timestampText: snapshotDoc.timestampText,
        congestionLevel: snapshotDoc.congestionLevel,
        congestionScore: snapshotDoc.congestionScore,
        trafficSampleCount: snapshotDoc.trafficSampleCount,
      },
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error.message || "Snapshot job failed",
    });
  }
}