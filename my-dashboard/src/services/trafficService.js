export async function fetchTrafficData(points, apiKey) {
  const results = [];

  for (const pt of points) {
    const url = `https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json?point=${pt.lat},${pt.lng}&key=${apiKey}`;

    try {
      const res = await fetch(url);
      const data = await res.json();

      results.push({
        lat: pt.lat,
        lng: pt.lng,
        speed: data?.flowSegmentData?.currentSpeed || 0,
        freeFlow: data?.flowSegmentData?.freeFlowSpeed || 1,
      });
    } catch (e) {
      console.error("Traffic fetch error:", e);
    }
  }

  return results;
}