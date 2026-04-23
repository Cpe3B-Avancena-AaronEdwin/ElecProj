import { useMemo, useState } from "react";

const API_BASE = import.meta.env.DEV
  ? import.meta.env.VITE_API_BASE_URL || "http://localhost:5000"
  : "";

function buildApiUrl(path) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE}${normalizedPath}`;
}

async function postJson(url, body, fallbackMessage) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(body),
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

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function round(value, digits = 1) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Number(n.toFixed(digits));
}

function getTrendDirection(trafficHistory = []) {
  if (!Array.isArray(trafficHistory) || trafficHistory.length < 2) {
    return "stable";
  }

  const recent = trafficHistory.slice(-3);
  if (recent.length < 2) return "stable";

  const first = toNumber(recent[0]?.congestionScore, 0);
  const last = toNumber(recent[recent.length - 1]?.congestionScore, 0);
  const delta = last - first;

  if (delta >= 8) return "rising";
  if (delta <= -8) return "improving";
  return "stable";
}

function buildRealPrediction({
  routes = [],
  stops = [],
  trips = [],
  trafficSummary = {},
  trafficHistory = [],
  historyAnalytics = {},
  selectedRouteId = "all",
}) {
  const latestScore = toNumber(
    historyAnalytics?.latestScore ?? trafficSummary?.congestionScore,
    0
  );

  const averageScore24h = toNumber(historyAnalytics?.averageScore24h, latestScore);
  const averageSpeed = toNumber(
    trafficSummary?.averageCurrentSpeed ?? trafficSummary?.avgSpeed ?? trafficSummary?.averageSpeed,
    0
  );
  const delayMinutes = toNumber(trafficSummary?.delayMinutes, 0);
  const snapshotCount24h = toNumber(historyAnalytics?.snapshotCount24h, 0);
  const trend = getTrendDirection(trafficHistory);

  const selectedScopeLabel =
    selectedRouteId && selectedRouteId !== "all"
      ? `route ${selectedRouteId}`
      : "network";

  let predictedDelayRisk = "Low";

  if (
    latestScore >= 75 ||
    delayMinutes >= 15 ||
    (averageSpeed > 0 && averageSpeed <= 12)
  ) {
    predictedDelayRisk = "High";
  } else if (
    latestScore >= 45 ||
    delayMinutes >= 6 ||
    (averageSpeed > 0 && averageSpeed <= 22)
  ) {
    predictedDelayRisk = "Medium";
  }

  const etaImpactMinutes = Math.max(
    0,
    round(
      Math.max(delayMinutes, latestScore * 0.12 + Math.max(0, 20 - averageSpeed) * 0.18),
      0
    )
  );

  let recommendation = "Maintain regular dispatch and continue monitoring live traffic conditions.";

  if (predictedDelayRisk === "High") {
    if (averageSpeed > 0 && averageSpeed <= 12) {
      recommendation =
        "Activate congestion mitigation for the busiest corridor, reroute where possible, and prepare backup dispatch support.";
    } else if (delayMinutes >= 15) {
      recommendation =
        "Adjust dispatch spacing immediately and inform operators of significant delay risk across the network.";
    } else {
      recommendation =
        "Increase operational monitoring and prepare backup vehicles for routes likely to miss planned headways.";
    }
  } else if (predictedDelayRisk === "Medium") {
    if (trend === "rising") {
      recommendation =
        "Monitor the rising congestion trend and prepare limited dispatch adjustments before delays spread further.";
    } else {
      recommendation =
        "Watch traffic-sensitive routes closely and keep standby support ready if speed drops further.";
    }
  } else {
    if (trend === "improving") {
      recommendation =
        "Traffic conditions are improving; maintain normal dispatch while continuing routine monitoring.";
    } else {
      recommendation =
        "Traffic is currently manageable; keep normal service levels and continue monitoring the live network state.";
    }
  }

  const summaryText =
    snapshotCount24h > 0
      ? `Based on ${snapshotCount24h} real snapshot${
          snapshotCount24h === 1 ? "" : "s"
        } in the last 24 hours, current ${selectedScopeLabel} congestion is ${round(
          latestScore,
          1
        )} with an average speed of ${round(averageSpeed, 1)} km/h and estimated delay impact of +${etaImpactMinutes} minute${
          etaImpactMinutes === 1 ? "" : "s"
        }.`
      : `No recent saved traffic snapshots are available yet for the ${selectedScopeLabel}.`;

  const detailedReason = (() => {
    if (snapshotCount24h === 0) {
      return "Waiting for saved traffic snapshots before producing a stronger operational prediction.";
    }

    const trendText =
      trend === "rising"
        ? "Recent congestion trend is rising."
        : trend === "improving"
        ? "Recent congestion trend is improving."
        : "Recent congestion trend is stable.";

    return `${trendText} Latest congestion score: ${round(
      latestScore,
      1
    )}. 24h average: ${round(averageScore24h, 1)}. Current speed: ${round(
      averageSpeed,
      1
    )} km/h. Estimated delay: +${etaImpactMinutes} minute${
      etaImpactMinutes === 1 ? "" : "s"
    }.`;
  })();

  return {
    predictedDelayRisk,
    recommendation,
    etaImpactMinutes,
    latestScore: round(latestScore, 1),
    averageScore24h: round(averageScore24h, 1),
    averageSpeed: round(averageSpeed, 1),
    delayMinutes: round(delayMinutes, 1),
    snapshotCount24h,
    trend,
    selectedScopeLabel,
    summaryText,
    detailedReason,
    routeCount: Array.isArray(routes) ? routes.length : 0,
    stopCount: Array.isArray(stops) ? stops.length : 0,
    tripCount: Array.isArray(trips) ? trips.length : 0,
  };
}

export function useCurrentPrediction({
  routes = [],
  stops = [],
  trips = [],
  trafficSummary = {},
  trafficHistory = [],
  historyAnalytics = {},
  user,
  selectedRouteId = "all",
  sourceRouteMap = {},
  sourceMode = "firestore",
}) {
  const [predictionSaving, setPredictionSaving] = useState(false);
  const [predictionError, setPredictionError] = useState("");
  const [predictionMessage, setPredictionMessage] = useState("");

  const currentPrediction = useMemo(() => {
    return buildRealPrediction({
      routes,
      stops,
      trips,
      trafficSummary,
      trafficHistory,
      historyAnalytics,
      selectedRouteId,
      sourceRouteMap,
      sourceMode,
    });
  }, [
    routes,
    stops,
    trips,
    trafficSummary,
    trafficHistory,
    historyAnalytics,
    selectedRouteId,
    sourceRouteMap,
    sourceMode,
  ]);

  const savePrediction = async () => {
    setPredictionSaving(true);
    setPredictionError("");
    setPredictionMessage("");

    try {
      await postJson(
        buildApiUrl("/api/predictions"),
        {
          prediction: {
            ...currentPrediction,
            generatedAtText: new Date().toISOString(),
            sourceMode,
          },
          userId: user?.uid || null,
        },
        "Failed to save prediction."
      );

      setPredictionMessage("Prediction saved.");
    } catch (error) {
      setPredictionError(error.message || "Failed to save prediction.");
    } finally {
      setPredictionSaving(false);
    }
  };

  return {
    currentPrediction,
    predictionSaving,
    predictionError,
    predictionMessage,
    savePrediction,
  };
}