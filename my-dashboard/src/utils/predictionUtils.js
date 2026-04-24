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

function summarizeHistory(trafficHistory = [], historyAnalytics = {}) {
  const sorted = Array.isArray(trafficHistory)
    ? [...trafficHistory].sort((a, b) => a.timestampMs - b.timestampMs)
    : [];

  if (!sorted.length) {
    return {
      averageScore24h: 0,
      averageScore7d: toNumber(historyAnalytics.averageScore7d),
      snapshotCount24h: 0,
      snapshotCount7d: toNumber(historyAnalytics.snapshotCount7d),
      recentAverageScore: 0,
      trendDirection: "Stable",
    };
  }

  const scores = sorted.map((x) => toNumber(x.congestionScore));
  const avg24 =
    scores.reduce((sum, val) => sum + val, 0) / Math.max(scores.length, 1);

  const recent = sorted.slice(-6);
  const previous = sorted.slice(-12, -6);

  const recentAvg =
    recent.reduce((sum, item) => sum + toNumber(item.congestionScore), 0) /
    Math.max(recent.length, 1);

  const prevAvg =
    previous.reduce((sum, item) => sum + toNumber(item.congestionScore), 0) /
    Math.max(previous.length, 1);

  let trend = "Stable";
  if (recentAvg - prevAvg >= 5) trend = "Rising";
  else if (prevAvg - recentAvg >= 5) trend = "Improving";

  return {
    averageScore24h: Number(avg24.toFixed(1)),
    averageScore7d: toNumber(historyAnalytics.averageScore7d || avg24),
    snapshotCount24h: sorted.length,
    snapshotCount7d: toNumber(historyAnalytics.snapshotCount7d || sorted.length),
    recentAverageScore: Number(recentAvg.toFixed(1)),
    trendDirection: trend,
  };
}

function calculatePredictionScore({
  trips = [],
  stops = [],
  trafficSummary = {},
  trafficHistory = [],
  historyAnalytics = {},
}) {
  const avgDelay = trips.length
    ? trips.reduce((sum, t) => sum + toNumber(t.delayMinutes), 0) / trips.length
    : toNumber(trafficSummary.delayMinutes);

  const heavy = toNumber(trafficSummary.heavy);
  const moderate = toNumber(trafficSummary.moderate);
  const currentScore = toNumber(trafficSummary.congestionScore);

  const history = summarizeHistory(trafficHistory, historyAnalytics);

  let score = 0;

  score += currentScore * 0.45;
  score += history.averageScore24h * 0.20;
  score += history.averageScore7d * 0.10;
  score += avgDelay * 2.4;
  score += heavy * 8;
  score += moderate * 4;
  score += Math.min(stops.length, 30) * 0.4;

  if (history.trendDirection === "Rising") score += 8;
  if (history.trendDirection === "Improving") score -= 6;

  return {
    score: Math.round(clamp(score, 0, 100)),
    avgDelay,
    history,
    heavy,
    moderate,
    currentScore,
  };
}

function getPredictionLevel(score) {
  if (score >= 75) return "High";
  if (score >= 45) return "Medium";
  return "Low";
}

function getConfidence(history, trafficSummary) {
  let confidence = 60;

  if (history.snapshotCount24h >= 24) confidence += 10;
  if (history.snapshotCount24h >= 72) confidence += 8;
  if (history.snapshotCount7d >= 100) confidence += 6;

  if (toNumber(trafficSummary.totalPoints) >= 8) confidence += 6;

  return Math.round(clamp(confidence, 55, 95));
}

function getEtaImpact(score, avgDelay) {
  return Math.max(1, Math.round(score / 12 + avgDelay));
}

function buildExplanation({
  level,
  score,
  currentScore,
  history,
  avgDelay,
  heavy,
  moderate,
  confidence,
}) {
  const lines = [];

  lines.push(`Live traffic score is ${currentScore}/100.`);
  lines.push(`24h average is ${history.averageScore24h}/100.`);

  if (history.snapshotCount7d > 0) {
    lines.push(`7d baseline is ${history.averageScore7d}/100.`);
  }

  if (heavy > 0) {
    lines.push(`${heavy} heavy traffic segment${heavy > 1 ? "s" : ""} detected.`);
  }

  if (moderate > 0) {
    lines.push(
      `${moderate} moderate segment${moderate > 1 ? "s" : ""} contributing.`
    );
  }

  if (avgDelay > 0) {
    lines.push(`Estimated delay is ${avgDelay.toFixed(1)} min.`);
  }

  lines.push(`Trend: ${history.trendDirection}.`);
  lines.push(`Confidence: ${confidence}%.`);

  return lines.join(" ");
}

function getRecommendation(level) {
  if (level === "High") {
    return "Prepare rerouting, dispatch support units, and expect passenger delays.";
  }
  if (level === "Medium") {
    return "Monitor closely and keep standby support ready if speed drops further.";
  }
  return "Normal operation recommended. Continue routine monitoring.";
}

export function buildPrediction({
  routes = [],
  stops = [],
  trips = [],
  trafficSummary = {},
  trafficHistory = [],
  historyAnalytics = {},
  selectedRouteId = "all",
}) {
  const scoreData = calculatePredictionScore({
    trips,
    stops,
    trafficSummary,
    trafficHistory,
    historyAnalytics,
  });

  const level = getPredictionLevel(scoreData.score);
  const confidence = getConfidence(scoreData.history, trafficSummary);
  const etaImpactMinutes = getEtaImpact(
    scoreData.score,
    scoreData.avgDelay
  );

  const explanation = buildExplanation({
    level,
    score: scoreData.score,
    currentScore: scoreData.currentScore,
    history: scoreData.history,
    avgDelay: scoreData.avgDelay,
    heavy: scoreData.heavy,
    moderate: scoreData.moderate,
    confidence,
  });

  return {
    predictedDelayRisk: level,
    predictedCongestion: level,
    score: scoreData.score,
    confidence,
    etaImpactMinutes,
    trend: scoreData.history.trendDirection,
    recommendation: getRecommendation(level),
    explanation,
    reason: [explanation],
    generatedAt: new Date().toISOString(),
    routeId: selectedRouteId,
  };
}