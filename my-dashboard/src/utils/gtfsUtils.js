// ================= BUILD GTFS =================
function buildGtfsBundle(raw) {
  return {
    routes: raw.routes || [],
    stops: raw.stops || [],
    trips: raw.trips || [],
    shapes: raw.shapes || [],
  };
}

// ================= HELPERS =================
function deterministicNumber(str) {
  if (!str) return 0;
  return str.split("").reduce((sum, c) => sum + c.charCodeAt(0), 0);
}

function normalizeRouteColor(color) {
  if (!color) return "#3b82f6";
  if (color.startsWith("#")) return color;
  return `#${color}`;
}

function toTodayDateTime(timeStr) {
  if (!timeStr) return null;

  const [h, m, s] = timeStr.split(":").map(Number);
  const d = new Date();
  d.setHours(h || 0, m || 0, s || 0);
  return d;
}

function haversineMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = (v) => (v * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) ** 2;

  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function estimatePolylineMeters(points) {
  if (!points || points.length < 2) return 0;

  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += haversineMeters(
      points[i - 1][0],
      points[i - 1][1],
      points[i][0],
      points[i][1]
    );
  }
  return total;
}

function simplifyPolyline(points) {
  // simple version (no heavy algo yet)
  return points;
}

// ================= EXPORT =================
export {
  buildGtfsBundle,
  deterministicNumber,
  normalizeRouteColor,
  toTodayDateTime,
  estimatePolylineMeters,
  haversineMeters,
  simplifyPolyline,
};