// ================= SCORE CALCULATION =================
export function calculatePredictionScore({ trips, trafficSummary }) {
  let score = 0;

  // traffic impact
  if (trafficSummary?.level === "High") score += 3;
  else if (trafficSummary?.level === "Medium") score += 1;

  // average delay
  const avgDelay =
    trips.reduce((sum, t) => sum + Number(t.delayMinutes || 0), 0) /
    (trips.length || 1);

  if (avgDelay > 10) score += 2;

  return {
    score,
    avgDelay,
  };
}

// ================= LEVEL CLASSIFIER =================
export function getPredictionLevel(score) {
  if (score >= 5) return "High";
  if (score >= 3) return "Medium";
  return "Low";
}

// ================= MAIN BUILDER =================
export function buildPrediction({
  routes,
  stops,
  trips,
  trafficSummary,
}) {
  const { score, avgDelay } = calculatePredictionScore({
    trips,
    trafficSummary,
  });

  return {
    predictedCongestion: getPredictionLevel(score),
    predictedDelayRisk: getPredictionLevel(score),
    score,
    basedOnAvgDelay: avgDelay.toFixed(1),
    basedOnTrafficSamples: stops.length,
  };
}