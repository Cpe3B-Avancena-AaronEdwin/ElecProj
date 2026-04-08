import { useMemo, useState } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase/config";

export function useCurrentPrediction({
  stops = [],
  trips = [],
  trafficSummary = {},
  user,
  selectedRouteId = "all",
  sourceRouteMap = {},
  sourceMode = "firestore",
}) {
  const [predictionSaving, setPredictionSaving] = useState(false);
  const [predictionError, setPredictionError] = useState("");
  const [predictionMessage, setPredictionMessage] = useState("");

  const currentPrediction = useMemo(() => {
    const selectedRoute =
      selectedRouteId === "all" ? null : sourceRouteMap[selectedRouteId];

    const avgTripDelayValue = trips.length
      ? trips.reduce((sum, trip) => sum + Number(trip.delayMinutes || 0), 0) / trips.length
      : 0;

    const heavyTrafficCount = Number(trafficSummary.heavy || 0);
    const moderateTrafficCount = Number(trafficSummary.moderate || 0);
    const roadClosedCount = Number(trafficSummary.closed || 0);

    let score = 0;
    const reasons = [];

    if (roadClosedCount > 0) {
      score += 3;
      reasons.push("Road closure detected");
    }
    if (heavyTrafficCount > 0) {
      score += 2;
      reasons.push("Heavy traffic detected");
    }
    if (moderateTrafficCount > 1) {
      score += 1;
      reasons.push("Moderate traffic on multiple points");
    }
    if (avgTripDelayValue >= 10) {
      score += 2;
      reasons.push("Route has recent delays");
    } else if (avgTripDelayValue >= 5) {
      score += 1;
      reasons.push("Average delay is rising");
    }

    const getLevel = (value) => {
      if (value >= 6) return "Very High";
      if (value >= 4) return "High";
      if (value >= 2) return "Medium";
      return "Low";
    };

    return {
      routeId: selectedRoute?.id || selectedRouteId || "all",
      routeCode: selectedRoute?.routeCode || "ALL",
      routeName: selectedRoute?.routeName || "All Routes",
      predictedCongestion:
        roadClosedCount > 0
          ? "Very High"
          : getLevel((heavyTrafficCount > 0 ? 3 : 0) + (moderateTrafficCount > 1 ? 1 : 0)),
      predictedDelayRisk: getLevel(score),
      reason: reasons.length ? reasons : ["Normal operating conditions"],
      basedOnTrafficSamples: stops.length,
      basedOnAvgDelay: Number(avgTripDelayValue.toFixed(1)),
      generatedAt: new Date().toISOString(),
      score,
    };
  }, [selectedRouteId, sourceRouteMap, trafficSummary, trips, stops.length]);

  const savePrediction = async () => {
    setPredictionSaving(true);
    setPredictionError("");
    setPredictionMessage("");

    try {
      await addDoc(collection(db, "predictions"), {
        ...currentPrediction,
        generatedAt: serverTimestamp(),
        generatedAtText: new Date().toISOString(),
        createdBy: user?.uid || null,
        sourceMode,
      });

      setPredictionMessage("Prediction saved to Firestore.");
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