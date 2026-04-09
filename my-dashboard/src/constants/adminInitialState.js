export const initialRouteForm = {
  routeCode: "",
  routeName: "",
  color: "#2563eb",
  active: true,
};

export const initialStopForm = {
  stopName: "",
  latitude: "",
  longitude: "",
  routeId: "",
  simulatedDelay: "",
  simulatedPassengers: "",
};

export const initialVehicleForm = {
  vehicleCode: "",
  plateNumber: "",
  routeId: "",
  status: "active",
};

export const initialTripForm = {
  tripCode: "",
  routeId: "",
  vehicleId: "",
  departureTime: "",
  expectedArrival: "",
  actualArrival: "",
  status: "scheduled",
  delayMinutes: "",
  notes: "",
};