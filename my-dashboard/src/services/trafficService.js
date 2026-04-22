const API_BASE = import.meta.env.VITE_API_BASE_URL;

async function handleResponse(response, fallbackMessage) {
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

export async function fetchTrafficData(points) {
  if (!Array.isArray(points) || points.length === 0) return [];

  const response = await fetch(`${API_BASE}/api/traffic`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ points }),
  });

  const data = await handleResponse(response, "Failed to fetch traffic data");
  return Array.isArray(data.results) ? data.results : [];
}

export async function fetchTrafficSummary(points) {
  const results = await fetchTrafficData(points);

  if (!results.length) {
    return {
      averageSpeed: 0,
      averageFreeFlow: 0,
      congestionScore: 0,
      congestionLevel: "Low",
      points: [],
    };
  }

  const totalSpeed = results.reduce(
    (sum, item) => sum + Number(item.speed || 0),
    0
  );

  const totalFreeFlow = results.reduce(
    (sum, item) => sum + Number(item.freeFlow || 0),
    0
  );

  const averageSpeed = totalSpeed / results.length;
  const averageFreeFlow = totalFreeFlow / results.length || 1;

  const ratio = averageSpeed / averageFreeFlow;
  const congestionScore = Math.max(
    0,
    Math.min(100, Math.round((1 - ratio) * 100))
  );

  let congestionLevel = "Low";
  if (congestionScore >= 67) {
    congestionLevel = "High";
  } else if (congestionScore >= 34) {
    congestionLevel = "Medium";
  }

  return {
    averageSpeed,
    averageFreeFlow,
    congestionScore,
    congestionLevel,
    points: results,
  };
}