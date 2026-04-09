import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "../firebase/config";

export async function saveRoute({ form, editingId, userId }) {
  const payload = {
    routeCode: form.routeCode.trim(),
    routeName: form.routeName.trim(),
    color: form.color,
    active: form.active,
    updatedAt: serverTimestamp(),
  };

  if (editingId) {
    await updateDoc(doc(db, "routes", editingId), payload);
    return "Route updated successfully.";
  }

  await addDoc(collection(db, "routes"), {
    ...payload,
    createdAt: serverTimestamp(),
    createdBy: userId || "",
  });
  return "Route added successfully.";
}

export async function saveStop({ form, editingId, userId }) {
  const payload = {
    stopName: form.stopName.trim(),
    latitude: Number(form.latitude),
    longitude: Number(form.longitude),
    routeId: form.routeId,
    simulatedDelay: Number(form.simulatedDelay || 0),
    simulatedPassengers: Number(form.simulatedPassengers || 0),
    updatedAt: serverTimestamp(),
  };

  if (editingId) {
    await updateDoc(doc(db, "stops", editingId), payload);
    return "Stop updated successfully.";
  }

  await addDoc(collection(db, "stops"), {
    ...payload,
    createdAt: serverTimestamp(),
    createdBy: userId || "",
  });
  return "Stop added successfully.";
}

export async function saveVehicle({ form, editingId, userId }) {
  const payload = {
    vehicleCode: form.vehicleCode.trim(),
    plateNumber: form.plateNumber.trim(),
    routeId: form.routeId,
    status: form.status,
    updatedAt: serverTimestamp(),
  };

  if (editingId) {
    await updateDoc(doc(db, "vehicles", editingId), payload);
    return "Vehicle updated successfully.";
  }

  await addDoc(collection(db, "vehicles"), {
    ...payload,
    createdAt: serverTimestamp(),
    createdBy: userId || "",
  });
  return "Vehicle added successfully.";
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
    updatedAt: serverTimestamp(),
  };

  if (editingId) {
    await updateDoc(doc(db, "trips", editingId), payload);
    return "Trip updated successfully.";
  }

  await addDoc(collection(db, "trips"), {
    ...payload,
    createdAt: serverTimestamp(),
    createdBy: userId || "",
  });
  return "Trip added successfully.";
}

export async function removeRoute(id) {
  await deleteDoc(doc(db, "routes", id));
  return "Route deleted successfully.";
}

export async function removeStop(id) {
  await deleteDoc(doc(db, "stops", id));
  return "Stop deleted successfully.";
}

export async function removeVehicle(id) {
  await deleteDoc(doc(db, "vehicles", id));
  return "Vehicle deleted successfully.";
}

export async function removeTrip(id) {
  await deleteDoc(doc(db, "trips", id));
  return "Trip deleted successfully.";
}