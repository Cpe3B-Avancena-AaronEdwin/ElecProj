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

export async function fetchRoutePolyline(points) {
  if (!Array.isArray(points) || points.length < 2) return null;

  const response = await fetch(`${API_BASE}/api/routing`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ points }),
  });

  const data = await handleResponse(response, "Failed to fetch route polyline");
  return data.polyline || null;
}

export async function fetchRouteDetails(points) {
  if (!Array.isArray(points) || points.length < 2) {
    return {
      polyline: null,
      distanceInMeters: 0,
      travelTimeInSeconds: 0,
      trafficDelayInSeconds: 0,
    };
  }

  const response = await fetch(`${API_BASE}/api/routing`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ points }),
  });

  const data = await handleResponse(response, "Failed to fetch route details");

  return {
    polyline: data.polyline || null,
    distanceInMeters: Number(data.distanceInMeters || 0),
    travelTimeInSeconds: Number(data.travelTimeInSeconds || 0),
    trafficDelayInSeconds: Number(data.trafficDelayInSeconds || 0),
  };
}