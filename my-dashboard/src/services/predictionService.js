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

export async function savePrediction(prediction, user) {
  const response = await fetch(`${API_BASE}/api/predictions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prediction,
      userId: user?.uid || null,
    }),
  });

  return handleResponse(response, "Failed to save prediction");
}

export async function getPredictions() {
  const response = await fetch(`${API_BASE}/api/predictions`);
  return handleResponse(response, "Failed to fetch predictions");
}

export async function getPredictionById(id) {
  const response = await fetch(`${API_BASE}/api/predictions/${id}`);
  return handleResponse(response, "Failed to fetch prediction");
}

export async function deletePrediction(id) {
  const response = await fetch(`${API_BASE}/api/predictions/${id}`, {
    method: "DELETE",
  });

  return handleResponse(response, "Failed to delete prediction");
}