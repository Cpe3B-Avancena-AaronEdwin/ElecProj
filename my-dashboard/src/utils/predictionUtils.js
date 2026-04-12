const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getLevelFromScore(score) {
  if (score >= 70) return "High";
  if (score >= 40) return "Medium";
  return "Low";
}

function formatHourLabel(hour) {
  const normalized = ((hour % 24) + 24) % 24;
  const nextHour = (normalized + 1) % 24;

  const format = (value) => {
    const meridiem = value >= 12 ? "PM" : "AM";
    const hour12 = value % 12 || 12;
    return `${hour12}:00 ${meridiem}`;
  };

  return `${format(normalized)} - ${format(nextHour)}`;
}

function summarizeHistory(trafficHistory = [], historyAnalytics = {}) {
  const sorted = Array.isArray(trafficHistory)
    ? [...trafficHistory].sort((a, b) => a.timestampMs - b.timestampMs)
    : [];

  if (sorted.length === 0) {
    return {
      snapshotCount24h: 0,
      snapshotCount7d: Number(historyAnalytics.snapshotCount7d || 0),
      averageScore24h: 0,
      averageScore7d: Number(historyAnalytics.averageScore7d || 0),
      recentAverageScore: 0,
      peakHour: null,
      peakWindowLabel: "No historical pattern yet",
      trendDirection: "Building",
      historicalLevel: "Low",
      highestScore7d: Number(historyAnalytics.highestScore7d || 0),
    };
  }

  const scores24h = sorted.map((item) => toNumber(item.congestionScore));
  const averageScore24h = scores24h.length
    ? scores24h.reduce((sum, value) => sum + value, 0) / scores24h.length
    : 0;

  const recentSlice = sorted.slice(-12);
  const recentAverageScore = recentSlice.length
    ? recentSlice.reduce((sum, item) => sum + toNumber(item.congestionScore), 0) /
      recentSlice.length
    : averageScore24h;

  const previousSlice = sorted.slice(-24, -12);
  const previousAverageScore = previousSlice.length
    ? previousSlice.reduce((sum, item) => sum + toNumber(item.congestionScore), 0) /
      previousSlice.length
    : recentAverageScore;

  let trendDirection = "Stable";
  if (recentAverageScore - previousAverageScore >= 6) trendDirection = "Rising";
  else if (previousAverageScore - recentAverageScore >= 6) trendDirection = "Improving";

  const hourBuckets = sorted.reduce((acc, item) => {
    const date = new Date(item.timestampMs);
    const hour = date.getHours();

    if (!acc[hour]) {
      acc[hour] = { totalScore: 0, count: 0 };
    }

    acc[hour].totalScore += toNumber(item.congestionScore);
    acc[hour].count += 1;
    return acc;
  }, {});

  let peakHour = null;
  let peakScore = -1;

  Object.entries(hourBuckets).forEach(([hourText, data]) => {
    const avg = data.count ? data.totalScore / data.count : 0;
    if (avg > peakScore) {
      peakScore = avg;
      peakHour = Number(hourText);
    }
  });

  const averageScore7d = Number(historyAnalytics.averageScore7d || averageScore24h || 0);

  return {
    snapshotCount24h: sorted.length,
    snapshotCount7d: Number(historyAnalytics.snapshotCount7d || sorted.length),
    averageScore24h: Number(averageScore24h.toFixed(1)),
    averageScore7d: Number(averageScore7d.toFixed(1)),
    recentAverageScore: Number(recentAverageScore.toFixed(1)),
    peakHour,
    peakWindowLabel: peakHour === null ? "No historical pattern yet" : formatHourLabel(peakHour),
    trendDirection,
    historicalLevel: getLevelFromScore((averageScore24h * 0.65) + (averageScore7d * 0.35)),
    highestScore7d: Number(historyAnalytics.highestScore7d || Math.max(...scores24h, 0)),
  };
}

export function calculatePredictionScore({
  trips = [],
  stops = [],
  trafficSummary = {},
  route = null,
  trafficHistory = [],
  historyAnalytics = {},
}) {
  const avgDelay = trips.length
    ? trips.reduce((sum, trip) => sum + toNumber(trip.delayMinutes), 0) / trips.length
    : 0;

  const stopCount = stops.length;
  const heavyTrafficCount = toNumber(trafficSummary.heavy);
  const moderateTrafficCount = toNumber(trafficSummary.moderate);
  const roadClosedCount = toNumber(trafficSummary.closed);
  const sampleCount = toNumber(
    trafficSummary.totalPoints || trafficSummary.samples || trafficSummary.total || stopCount
  );

  const routeDistanceKm =
    toNumber(route?.distanceKm) ||
    toNumber(route?.distance_km) ||
    toNumber(route?.lengthKm) ||
    Math.max(4, stopCount * 0.55);

  const historySummary = summarizeHistory(trafficHistory, historyAnalytics);

  let score = 12;
  score += heavyTrafficCount * 12;
  score += moderateTrafficCount * 6;
  score += roadClosedCount * 18;
  score += avgDelay * 2.8;
  score += Math.min(stopCount, 30) * 0.9;
  score += Math.min(routeDistanceKm, 40) * 0.8;
  score += historySummary.averageScore24h * 0.24;
  score += historySummary.averageScore7d * 0.14;
  score += historySummary.recentAverageScore * 0.14;

  if (trafficSummary.level === "High") score += 12;
  else if (trafficSummary.level === "Medium") score += 6;

  score = Math.round(clamp(score, 0, 100));

  return {
    score,
    avgDelay,
    stopCount,
    heavyTrafficCount,
    moderateTrafficCount,
    roadClosedCount,
    routeDistanceKm,
    sampleCount,
    historySummary,
  };
}

export function getPredictionLevel(score) {
  if (score >= 75) return "High";
  if (score >= 45) return "Medium";
  return "Low";
}

export function getTrendDirection({
  trafficSummary = {},
  avgDelay = 0,
  historySummary = null,
}) {
  const heavy = toNumber(trafficSummary.heavy);
  const moderate = toNumber(trafficSummary.moderate);
  const closed = toNumber(trafficSummary.closed);

  if (historySummary?.trendDirection === "Rising") return "Rising";
  if (historySummary?.trendDirection === "Improving") return "Improving";

  if (closed > 0 || heavy >= 2 || avgDelay >= 10) return "Worsening";
  if (heavy === 1 || moderate >= 2 || avgDelay >= 5) return "Rising";
  return "Stable";
}

export function getPredictionConfidence({
  sampleCount = 0,
  stopCount = 0,
  trips = [],
  trafficSummary = {},
  trend = "Stable",
  historySummary = null,
}) {
  let confidence = 58;

  if (sampleCount >= 8) confidence += 14;
  else if (sampleCount >= 4) confidence += 8;
  else if (sampleCount >= 2) confidence += 4;

  if (stopCount >= 10) confidence += 8;
  else if (stopCount >= 4) confidence += 4;

  if (trips.length >= 5) confidence += 8;
  else if (trips.length >= 2) confidence += 4;

  if (trafficSummary.level === "High" || trafficSummary.level === "Medium") {
    confidence += 6;
  }

  if (historySummary?.snapshotCount24h >= 72) confidence += 10;
  else if (historySummary?.snapshotCount24h >= 24) confidence += 6;
  else if (historySummary?.snapshotCount24h >= 6) confidence += 3;

  if (historySummary?.snapshotCount7d >= 500) confidence += 4;
  else if (historySummary?.snapshotCount7d >= 100) confidence += 2;

  if (trend === "Stable") confidence -= 4;

  return Math.round(clamp(confidence, 55, 95));
}

export function getEtaImpactMinutes({
  score = 0,
  avgDelay = 0,
  roadClosedCount = 0,
  historySummary = null,
}) {
  const historyImpact = toNumber(historySummary?.recentAverageScore) / 12;
  const impact = avgDelay + score / 9 + roadClosedCount * 4 + historyImpact;
  return Math.max(2, Math.round(impact));
}

export function buildPredictionReasons({
  trafficSummary = {},
  avgDelay = 0,
  stopCount = 0,
  routeDistanceKm = 0,
  heavyTrafficCount = 0,
  moderateTrafficCount = 0,
  roadClosedCount = 0,
  historySummary = null,
}) {
  const reasons = [];

  if (roadClosedCount > 0) {
    reasons.push(`Road closure detected on ${roadClosedCount} monitored segment${roadClosedCount > 1 ? "s" : ""}`);
  }

  if (heavyTrafficCount > 0) {
    reasons.push(`Heavy traffic detected on ${heavyTrafficCount} corridor${heavyTrafficCount > 1 ? "s" : ""}`);
  }

  if (moderateTrafficCount > 1) {
    reasons.push(`Moderate congestion building across ${moderateTrafficCount} segments`);
  }

  if (avgDelay >= 10) {
    reasons.push(`Recent trips already average ${avgDelay.toFixed(1)} minutes delayed`);
  } else if (avgDelay >= 5) {
    reasons.push(`Delay trend is rising at ${avgDelay.toFixed(1)} minutes on average`);
  }

  if (stopCount >= 12) {
    reasons.push(`Long stop coverage increases dwell time across ${stopCount} stops`);
  }

  if (routeDistanceKm >= 12) {
    reasons.push(`Long route distance of about ${routeDistanceKm.toFixed(1)} km increases exposure to congestion`);
  }

  if (historySummary?.snapshotCount24h >= 2) {
    reasons.push(
      `Last 24 hours average ${historySummary.averageScore24h}/100 congestion from ${historySummary.snapshotCount24h} five-minute snapshots`
    );
  }

  if (historySummary?.snapshotCount7d >= 2) {
    reasons.push(
      `Seven-day network memory tracks ${historySummary.snapshotCount7d} snapshots with a ${historySummary.averageScore7d}/100 average congestion baseline`
    );
    reasons.push(`Historically busiest window is around ${historySummary.peakWindowLabel}`);
  }

  if (!reasons.length) {
    reasons.push("Normal operating conditions across the monitored route network");
  }

  return reasons;
}

export function getRecommendedAction({
  predictedDelayRisk = "Low",
  trend = "Stable",
  roadClosedCount = 0,
  heavyTrafficCount = 0,
  historySummary = null,
}) {
  if (roadClosedCount > 0) {
    return "Activate alternate routing and notify dispatch of affected corridor.";
  }

  if (
    predictedDelayRisk === "High" ||
    (historySummary?.historicalLevel === "High" && trend === "Rising")
  ) {
    return "Dispatch backup vehicle support and monitor terminal turnaround closely.";
  }

  if (
    predictedDelayRisk === "Medium" ||
    trend === "Rising" ||
    heavyTrafficCount > 0
  ) {
    return "Increase monitoring and prepare extra trips for the next peak window.";
  }

  return "Maintain current dispatch plan and continue routine monitoring.";
}

export function getCongestionForecast({
  trend = "Stable",
  trafficSummary = {},
  predictedDelayRisk = "Low",
  historySummary = null,
}) {
  if (trafficSummary.closed > 0) {
    return "Severe congestion expected unless route diversion is applied.";
  }

  if (predictedDelayRisk === "High") {
    return "High congestion expected within the next 15 to 30 minutes.";
  }

  if (historySummary?.historicalLevel === "High") {
    return `Historical patterns show congestion usually peaks around ${historySummary.peakWindowLabel}.`;
  }

  if (trend === "Rising") {
    return "Congestion is building and may intensify during the next peak window.";
  }

  return "Traffic conditions are expected to remain manageable in the short term.";
}

export function buildPrediction({
  route = null,
  routes = [],
  stops = [],
  trips = [],
  trafficSummary = {},
  trafficHistory = [],
  historyAnalytics = {},
  selectedRouteId = "all",
}) {
  const activeRoute =
    route ||
    (selectedRouteId !== "all"
      ? routes.find((item) => (item.id || item.routeId || item.route_id) === selectedRouteId)
      : null);

  const scoreData = calculatePredictionScore({
    trips,
    stops,
    trafficSummary,
    route: activeRoute,
    trafficHistory,
    historyAnalytics,
  });

  const predictedDelayRisk = getPredictionLevel(scoreData.score);
  const predictedCongestion =
    trafficSummary.level ||
    getPredictionLevel(
      scoreData.score +
        scoreData.heavyTrafficCount * 8 +
        scoreData.historySummary.averageScore24h * 0.12
    );

  const trend = getTrendDirection({
    trafficSummary,
    avgDelay: scoreData.avgDelay,
    historySummary: scoreData.historySummary,
  });

  const confidence = getPredictionConfidence({
    sampleCount: scoreData.sampleCount,
    stopCount: scoreData.stopCount,
    trips,
    trafficSummary,
    trend,
    historySummary: scoreData.historySummary,
  });

  const etaImpactMinutes = getEtaImpactMinutes({
    score: scoreData.score,
    avgDelay: scoreData.avgDelay,
    roadClosedCount: scoreData.roadClosedCount,
    historySummary: scoreData.historySummary,
  });

  const reasons = buildPredictionReasons({
    trafficSummary,
    avgDelay: scoreData.avgDelay,
    stopCount: scoreData.stopCount,
    routeDistanceKm: scoreData.routeDistanceKm,
    heavyTrafficCount: scoreData.heavyTrafficCount,
    moderateTrafficCount: scoreData.moderateTrafficCount,
    roadClosedCount: scoreData.roadClosedCount,
    historySummary: scoreData.historySummary,
  });

  const recommendation = getRecommendedAction({
    predictedDelayRisk,
    trend,
    roadClosedCount: scoreData.roadClosedCount,
    heavyTrafficCount: scoreData.heavyTrafficCount,
    historySummary: scoreData.historySummary,
  });

  return {
    routeId: activeRoute?.id || activeRoute?.routeId || activeRoute?.route_id || selectedRouteId,
    routeCode:
      activeRoute?.routeCode ||
      activeRoute?.route_short_name ||
      activeRoute?.shortName ||
      (selectedRouteId === "all" ? "ALL" : selectedRouteId),
    routeName:
      activeRoute?.routeName ||
      activeRoute?.route_long_name ||
      activeRoute?.name ||
      (selectedRouteId === "all" ? "All Routes" : "Selected Route"),
    predictedCongestion,
    predictedDelayRisk,
    score: scoreData.score,
    confidence,
    trend,
    etaImpactMinutes,
    recommendation,
    congestionForecast: getCongestionForecast({
      trend,
      trafficSummary,
      predictedDelayRisk,
      historySummary: scoreData.historySummary,
    }),
    reason: reasons,
    basedOnAvgDelay: Number(scoreData.avgDelay.toFixed(1)),
    basedOnTrafficSamples: scoreData.sampleCount,
    routeDistanceKm: Number(scoreData.routeDistanceKm.toFixed(1)),
    monitoredStops: scoreData.stopCount,
    historicalSnapshotCount24h: scoreData.historySummary.snapshotCount24h,
    historicalSnapshotCount7d: scoreData.historySummary.snapshotCount7d,
    historicalAverageScore24h: scoreData.historySummary.averageScore24h,
    historicalAverageScore7d: scoreData.historySummary.averageScore7d,
    predictedPeakWindow: scoreData.historySummary.peakWindowLabel,
    generatedAt: new Date().toISOString(),
  };
}