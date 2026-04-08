import { useEffect, useMemo, useState } from "react";

export function useRouteLines(
  stops = [],
  apiKey,
  sourceMode = "firestore",
  sourceRouteMap = {}
) {
  const [routePaths, setRoutePaths] = useState([]);
  const [routingLoading, setRoutingLoading] = useState(false);
  const [routingError, setRoutingError] = useState("");
  const [lastRoutingUpdated, setLastRoutingUpdated] = useState(null);

  const validStops = useMemo(() => {
    return stops.filter((s) => {
      const lat = parseFloat(s.stopLat ?? s.stop_lat ?? s.latitude);
      const lng = parseFloat(s.stopLon ?? s.stop_lon ?? s.longitude);
      return !Number.isNaN(lat) && !Number.isNaN(lng);
    });
  }, [stops]);

  const refreshRouteLines = async () => {
    if (sourceMode === "gtfs") {
      const fallback = validStops.length >= 2
        ? [
            {
              routeId: "gtfs",
              routeCode: "GTFS",
              routeName: "GTFS Shape",
              color: "#2563eb",
              path: validStops.map((s) => [
                parseFloat(s.stopLat ?? s.stop_lat ?? s.latitude),
                parseFloat(s.stopLon ?? s.stop_lon ?? s.longitude),
              ]),
              usedRoutingApi: false,
              source: "gtfs-shapes",
            },
          ]
        : [];

      setRoutePaths(fallback);
      setRoutingError("");
      setLastRoutingUpdated(new Date().toISOString());
      return;
    }

    if (!apiKey) {
      setRoutingError("Missing TomTom API key.");
      setRoutePaths([]);
      return;
    }

    if (validStops.length < 2) {
      setRoutePaths([]);
      return;
    }

    setRoutingLoading(true);
    setRoutingError("");

    try {
      const coords = validStops
        .map((s) => {
          const lat = parseFloat(s.stopLat ?? s.stop_lat ?? s.latitude);
          const lng = parseFloat(s.stopLon ?? s.stop_lon ?? s.longitude);
          return `${lat},${lng}`;
        })
        .join(":");

      const res = await fetch(
        `https://api.tomtom.com/routing/1/calculateRoute/${coords}/json?key=${apiKey}&traffic=true&routeType=fastest&routeRepresentation=polyline`
      );

      if (!res.ok) {
        throw new Error(`TomTom routing failed (${res.status})`);
      }

      const data = await res.json();
      const points =
        data?.routes?.[0]?.legs?.flatMap((leg) =>
          (leg.points || []).map((p) => [p.latitude, p.longitude])
        ) || [];

      if (points.length < 2) {
        const fallbackPoints = validStops.map((s) => [
          parseFloat(s.stopLat ?? s.stop_lat ?? s.latitude),
          parseFloat(s.stopLon ?? s.stop_lon ?? s.longitude),
        ]);

        setRoutePaths([
          {
            routeId: "fallback",
            routeCode: sourceRouteMap[validStops[0]?.routeId]?.routeCode || "N/A",
            routeName: sourceRouteMap[validStops[0]?.routeId]?.routeName || "Route",
            color: "#2563eb",
            path: fallbackPoints,
            usedRoutingApi: false,
            source: "stops",
          },
        ]);

        setRoutingError(
          "TomTom routing could not build road-following lines, so the dashboard is using stop-to-stop fallback lines."
        );
      } else {
        setRoutePaths([
          {
            routeId: "route",
            routeCode: sourceRouteMap[validStops[0]?.routeId]?.routeCode || "N/A",
            routeName: sourceRouteMap[validStops[0]?.routeId]?.routeName || "Route",
            color: "#2563eb",
            path: points,
            usedRoutingApi: true,
            source: "tomtom",
          },
        ]);
      }

      setLastRoutingUpdated(new Date().toISOString());
    } catch (error) {
      setRoutingError(error.message || "Failed to build route lines.");
      setRoutePaths([]);
    } finally {
      setRoutingLoading(false);
    }
  };

  useEffect(() => {
    refreshRouteLines();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiKey, sourceMode, validStops.length]);

  return {
    routePaths,
    routingLoading,
    routingError,
    lastRoutingUpdated,
    refreshRouteLines,
  };
}