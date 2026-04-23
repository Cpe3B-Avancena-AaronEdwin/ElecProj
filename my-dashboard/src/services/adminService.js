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

export async function saveRoute({ form, editingId, userId }) {
  const payload = {
    routeCode: form.routeCode.trim(),
    routeName: form.routeName.trim(),
    color: form.color,
    active: form.active,
    createdBy: userId || "",
  };

  const response = await fetch(
    editingId ? `${API_BASE}/api/routes/${editingId}` : `${API_BASE}/api/routes`,
    {
      method: editingId ? "PUT" : "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }
  );

  const data = await handleResponse(
    response,
    editingId ? "Failed to update route." : "Failed to add route."
  );

  return data.message || (editingId ? "Route updated successfully." : "Route added successfully.");
}

export async function saveStop({ form, editingId, userId }) {
  const payload = {
    stopName: form.stopName.trim(),
    latitude: Number(form.latitude),
    longitude: Number(form.longitude),
    routeId: form.routeId,
    simulatedDelay: Number(form.simulatedDelay || 0),
    simulatedPassengers: Number(form.simulatedPassengers || 0),
    createdBy: userId || "",
  };

  const response = await fetch(
    editingId ? `${API_BASE}/api/stops/${editingId}` : `${API_BASE}/api/stops`,
    {
      method: editingId ? "PUT" : "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }
  );

  const data = await handleResponse(
    response,
    editingId ? "Failed to update stop." : "Failed to add stop."
  );

  return data.message || (editingId ? "Stop updated successfully." : "Stop added successfully.");
}

export async function saveVehicle({ form, editingId, userId }) {
  const payload = {
    vehicleCode: form.vehicleCode.trim(),
    plateNumber: form.plateNumber.trim(),
    routeId: form.routeId,
    status: form.status,
    createdBy: userId || "",
  };

  const response = await fetch(
    editingId ? `${API_BASE}/api/vehicles/${editingId}` : `${API_BASE}/api/vehicles`,
    {
      method: editingId ? "PUT" : "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }
  );

  const data = await handleResponse(
    response,
    editingId ? "Failed to update vehicle." : "Failed to add vehicle."
  );

  return data.message || (editingId ? "Vehicle updated successfully." : "Vehicle added successfully.");
}

export async function saveTrip({ form, editingId, userId }) {
  const payload = {
    tripCode: form.tripCode.trim(),
    routeId: form.routeId,
    vehicleId: form.vehicleId,
    departureTime: form.departureTime,
    expectedArrival: form.expectedArrival,
    actualArrival: form.actualArrival || "",
    status: form.status,
    delayMinutes: Number(form.delayMinutes || 0),
    notes: form.notes.trim(),
    createdBy: userId || "",
  };

  const response = await fetch(
    editingId ? `${API_BASE}/api/trips/${editingId}` : `${API_BASE}/api/trips`,
    {
      method: editingId ? "PUT" : "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }
  );

  const data = await handleResponse(
    response,
    editingId ? "Failed to update trip." : "Failed to add trip."
  );

  return data.message || (editingId ? "Trip updated successfully." : "Trip added successfully.");
}

export async function removeRoute(id) {
  const response = await fetch(`${API_BASE}/api/routes/${id}`, {
    method: "DELETE",
  });

  const data = await handleResponse(response, "Failed to delete route.");
  return data.message || "Route deleted successfully.";
}

export async function removeStop(id) {
  const response = await fetch(`${API_BASE}/api/stops/${id}`, {
    method: "DELETE",
  });

  const data = await handleResponse(response, "Failed to delete stop.");
  return data.message || "Stop deleted successfully.";
}

export async function removeVehicle(id) {
  const response = await fetch(`${API_BASE}/api/vehicles/${id}`, {
    method: "DELETE",
  });

  const data = await handleResponse(response, "Failed to delete vehicle.");
  return data.message || "Vehicle deleted successfully.";
}

export async function removeTrip(id) {
  const response = await fetch(`${API_BASE}/api/trips/${id}`, {
    method: "DELETE",
  });

  const data = await handleResponse(response, "Failed to delete trip.");
  return data.message || "Trip deleted successfully.";
}