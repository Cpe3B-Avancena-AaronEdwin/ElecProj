export async function fetchRoutePolyline(points, apiKey) {
  if (points.length < 2) return null;

  const coords = points.map(p => `${p.lng},${p.lat}`).join(":");

  const url = `https://api.tomtom.com/routing/1/calculateRoute/${coords}/json?key=${apiKey}`;

  try {
    const res = await fetch(url);
    const data = await res.json();

    return data.routes?.[0]?.legs?.[0]?.points?.map(p => [
      p.latitude,
      p.longitude,
    ]) || null;
  } catch (e) {
    console.error("Routing error:", e);
    return null;
  }
}