export function renderVehiclePosition(vehicle, stops) {
  const routeStops = stops.filter(s => s.routeId === vehicle.routeId);
  if (!routeStops.length) return null;

  const baseIndex =
    vehicle.id?.split("").reduce((sum, c) => sum + c.charCodeAt(0), 0) || 0;

  const stop = routeStops[baseIndex % routeStops.length];

  const lat = Number(stop.latitude);
  const lng = Number(stop.longitude);

  if (isNaN(lat) || isNaN(lng)) return null;

  return [lat, lng];
}