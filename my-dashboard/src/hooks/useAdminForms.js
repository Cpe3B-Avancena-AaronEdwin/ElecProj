import { useMemo, useState } from "react";
import {
  initialRouteForm,
  initialStopForm,
  initialTripForm,
  initialVehicleForm,
} from "../constants/adminInitialState";

export function useAdminForms(vehicles = []) {
  const [routeForm, setRouteForm] = useState(initialRouteForm);
  const [stopForm, setStopForm] = useState(initialStopForm);
  const [vehicleForm, setVehicleForm] = useState(initialVehicleForm);
  const [tripForm, setTripForm] = useState(initialTripForm);

  const [editingRouteId, setEditingRouteId] = useState(null);
  const [editingStopId, setEditingStopId] = useState(null);
  const [editingVehicleId, setEditingVehicleId] = useState(null);
  const [editingTripId, setEditingTripId] = useState(null);

  const handleRouteChange = (e) => {
    const { name, value, type, checked } = e.target;
    setRouteForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleStopChange = (e) => {
    const { name, value } = e.target;
    setStopForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleVehicleChange = (e) => {
    const { name, value } = e.target;
    setVehicleForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleTripChange = (e) => {
    const { name, value } = e.target;
    setTripForm((prev) => {
      const next = {
        ...prev,
        [name]: value,
      };

      if (name === "routeId" && prev.routeId !== value) {
        next.vehicleId = "";
      }

      return next;
    });
  };

  const filteredVehiclesForTrip = useMemo(() => {
    if (!tripForm.routeId) return vehicles;
    return vehicles.filter((vehicle) => vehicle.routeId === tripForm.routeId);
  }, [vehicles, tripForm.routeId]);

  const editRoute = (route) => {
    setEditingRouteId(route.id);
    setRouteForm({
      routeCode: route.routeCode || "",
      routeName: route.routeName || "",
      color: route.color || "#2563eb",
      active: route.active ?? true,
    });
  };

  const editStop = (stop) => {
    setEditingStopId(stop.id);
    setStopForm({
      stopName: stop.stopName || "",
      latitude: stop.latitude ?? "",
      longitude: stop.longitude ?? "",
      routeId: stop.routeId || "",
      simulatedDelay: stop.simulatedDelay ?? "",
      simulatedPassengers: stop.simulatedPassengers ?? "",
    });
  };

  const editVehicle = (vehicle) => {
    setEditingVehicleId(vehicle.id);
    setVehicleForm({
      vehicleCode: vehicle.vehicleCode || "",
      plateNumber: vehicle.plateNumber || "",
      routeId: vehicle.routeId || "",
      status: vehicle.status || "active",
    });
  };

  const editTrip = (trip) => {
    setEditingTripId(trip.id);
    setTripForm({
      tripCode: trip.tripCode || "",
      routeId: trip.routeId || "",
      vehicleId: trip.vehicleId || "",
      departureTime: trip.departureTime || "",
      expectedArrival: trip.expectedArrival || "",
      actualArrival: trip.actualArrival || "",
      status: trip.status || "scheduled",
      delayMinutes: trip.delayMinutes ?? "",
      notes: trip.notes || "",
    });
  };

  const cancelRouteEdit = () => {
    setEditingRouteId(null);
    setRouteForm(initialRouteForm);
  };

  const cancelStopEdit = () => {
    setEditingStopId(null);
    setStopForm(initialStopForm);
  };

  const cancelVehicleEdit = () => {
    setEditingVehicleId(null);
    setVehicleForm(initialVehicleForm);
  };

  const cancelTripEdit = () => {
    setEditingTripId(null);
    setTripForm(initialTripForm);
  };

  return {
    routeForm,
    stopForm,
    vehicleForm,
    tripForm,
    editingRouteId,
    editingStopId,
    editingVehicleId,
    editingTripId,
    handleRouteChange,
    handleStopChange,
    handleVehicleChange,
    handleTripChange,
    filteredVehiclesForTrip,
    editRoute,
    editStop,
    editVehicle,
    editTrip,
    cancelRouteEdit,
    cancelStopEdit,
    cancelVehicleEdit,
    cancelTripEdit,
    setEditingRouteId,
    setEditingStopId,
    setEditingVehicleId,
    setEditingTripId,
    setRouteForm,
    setStopForm,
    setVehicleForm,
    setTripForm,
  };
}