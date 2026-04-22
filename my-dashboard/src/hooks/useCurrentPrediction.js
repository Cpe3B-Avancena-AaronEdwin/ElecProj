import { useMemo, useState } from "react";
import { buildPrediction } from "../utils/predictionUtils";

const API_BASE = import.meta.env.VITE_API_BASE_URL;

async function postJson(url, body, fallbackMessage) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
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
      await postJson(
        `${API_BASE}/api/predictions`,
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