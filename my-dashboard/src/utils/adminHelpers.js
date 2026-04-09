export function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

export function createRouteMap(routes = []) {
  const map = {};
  routes.forEach((route) => {
    map[route.id] = route;
  });
  return map;
}

export function createVehicleMap(vehicles = []) {
  const map = {};
  vehicles.forEach((vehicle) => {
    map[vehicle.id] = vehicle;
  });
  return map;
}