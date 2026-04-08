import { useEffect, useMemo, useState } from "react";

export function useTrafficData(stops = [], apiKey, sourceMode = "firestore") {
  const [trafficSamples, setTrafficSamples] = useState([]);
  const [trafficSummary, setTrafficSummary] = useState({
    total: 0,
    light: 0,
    moderate: 0,
    heavy: 0,
    closed: 0,
    averageCurrentSpeed: 0,
    averageFreeFlowSpeed: 0,
    level: "Low",
    avgSpeed: 0,
  });
  const [trafficLoading, setTrafficLoading] = useState(false);
  const [trafficError, setTrafficError] = useState("");
  const [lastTrafficUpdated, setLastTrafficUpdated] = useState(null);

  const validStops = useMemo(() => {
    return stops.filter((s) => {
      const lat = parseFloat(s.stopLat ?? s.stop_lat ?? s.latitude);
      const lng = parseFloat(s.stopLon ?? s.stop_lon ?? s.longitude);
      return !Number.isNaN(lat) && !Number.isNaN(lng);
    });
  }, [stops]);

  const refreshTraffic = async () => {
    if (sourceMode === "gtfs") {
      setTrafficSamples([]);
      setTrafficError("");
      return;
    }

    if (!apiKey) {
      setTrafficError("Missing TomTom API key.");
      setTrafficSamples([]);
      return;
    }

    if (!validStops.length) {
      setTrafficSamples([]);
      return;
    }

    setTrafficLoading(true);
    setTrafficError("");

    try {
      const sampleStops = validStops.slice(0, 6);

      const results = await Promise.all(
        sampleStops.map(async (s, index) => {
          const lat = parseFloat(s.stopLat ?? s.stop_lat ?? s.latitude);
          const lng = parseFloat(s.stopLon ?? s.stop_lon ?? s.longitude);

          const res = await fetch(
            `https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json?point=${lat},${lng}&key=${apiKey}`
          );

          if (!res.ok) {
            throw new Error(`TomTom request failed (${res.status})`);
          }

          const data = await res.json();
          const segment = data?.flowSegmentData;

          const currentSpeed = Number(segment?.currentSpeed || 0);
          const freeFlowSpeed = Number(segment?.freeFlowSpeed || 0);
          const ratio = freeFlowSpeed > 0 ? currentSpeed / freeFlowSpeed : 1;

          let color = "#22c55e";
          let severity = "Light";

          if (segment?.roadClosure === true) {
            color = "#6b7280";
            severity = "Closed";
          } else if (ratio < 0.35) {
            color = "#ef4444";
            severity = "Heavy";
          } else if (ratio < 0.75) {
            color = "#f59e0b";
            severity = "Moderate";
          }

          return {
            id: s.id || s.stop_id || `sample-${index}`,
            name: s.stopName || s.stop_name || `Stop ${index + 1}`,
            lat,
            lng,
            usable: true,
            color,
            severity,
            currentSpeed,
            freeFlowSpeed,
            ratio,
          };
        })
      );

      setTrafficSamples(results);

      const usable = results.filter((item) => item.usable);
      let currentTotal = 0;
      let freeFlowTotal = 0;

      const summary = {
        total: usable.length,
        light: 0,
        moderate: 0,
        heavy: 0,
        closed: 0,
        averageCurrentSpeed: 0,
        averageFreeFlowSpeed: 0,
        level: "Low",
        avgSpeed: 0,
      };

      usable.forEach((item) => {
        currentTotal += Number(item.currentSpeed || 0);
        freeFlowTotal += Number(item.freeFlowSpeed || 0);

        if (item.severity === "Closed") summary.closed += 1;
        else if (item.severity === "Heavy") summary.heavy += 1;
        else if (item.severity === "Moderate") summary.moderate += 1;
        else summary.light += 1;
      });

      summary.averageCurrentSpeed = usable.length
        ? (currentTotal / usable.length).toFixed(1)
        : 0;
      summary.averageFreeFlowSpeed = usable.length
        ? (freeFlowTotal / usable.length).toFixed(1)
        : 0;
      summary.avgSpeed = Number(summary.averageCurrentSpeed);

      if (summary.heavy > 0 || summary.closed > 0) summary.level = "High";
      else if (summary.moderate > 0) summary.level = "Medium";
      else summary.level = "Low";

      setTrafficSummary(summary);
      setLastTrafficUpdated(new Date().toISOString());
    } catch (error) {
      setTrafficError(error.message || "Failed to load traffic data.");
      setTrafficSamples([]);
    } finally {
      setTrafficLoading(false);
    }
  };

  useEffect(() => {
    refreshTraffic();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceMode, apiKey, validStops.length]);

  return {
    trafficSamples,
    trafficSummary,
    trafficLoading,
    trafficError,
    lastTrafficUpdated,
    refreshTraffic,
  };
}