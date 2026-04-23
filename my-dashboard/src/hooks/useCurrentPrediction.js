import { useMemo, useState } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase/config";
import { buildPrediction } from "../utils/predictionUtils";

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
    const selectedRoute =
      selectedRouteId === "all" ? null : sourceRouteMap[selectedRouteId];

    return buildPrediction({
      route: selectedRoute,
      routes,
      stops,
      trips,
      trafficSummary,
      trafficHistory,
      historyAnalytics,
      selectedRouteId,
    });
  }, [
    routes,
    selectedRouteId,
    sourceRouteMap,
    stops,
    trafficSummary,
    trafficHistory,
    historyAnalytics,
    trips,
  ]);

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