import { useEffect, useMemo, useState } from "react";

const ROUTE_CACHE_TTL_MS = 30 * 60 * 1000;

function resolveOptions(options) {
  return {
    enabled: options?.enabled ?? true,
    cacheKey: options?.cacheKey ?? "default",
  };
}

function getRouteCache(cacheKey) {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.sessionStorage.getItem(`route-cache:${cacheKey}`);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!parsed?.savedAt || Date.now() - parsed.savedAt > ROUTE_CACHE_TTL_MS) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function setRouteCache(cacheKey, payload) {
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.setItem(
      `route-cache:${cacheKey}`,
      JSON.stringify({
        ...payload,
        savedAt: Date.now(),
      })
    );
  } catch {
    // ignore cache failures
  }
}

export function useRouteLines(
  stops = [],
  apiKey,
  sourceMode = "firestore",
  sourceRouteMap = {},
  gtfsShapePoints = [],
  selectedRouteMeta = null,
  options = {}
) {
  const { enabled, cacheKey } = resolveOptions(options);

  const [routePaths, setRoutePaths] = useState([]);
  const [routingLoading, setRoutingLoading] = useState(false);
  const [routingError, setRoutingError] = useState("");
  const [lastRoutingUpdated, setLastRoutingUpdated] = useState(null);

  const validStops = useMemo(() => {
    return stops.filter((s) => {
      const lat = parseFloat(s.stopLat ?? s.stop_lat ?? s.latitude ?? s.lat);
      const lng = parseFloat(s.stopLon ?? s.stop_lon ?? s.longitude ?? s.lng);
      return !Number.isNaN(lat) && !Number.isNaN(lng);
    });
  }, [stops]);

  const validGtfsShapePoints = useMemo(() => {
    return (gtfsShapePoints || []).filter(
      (p) =>
        Array.isArray(p) &&
        p.length >= 2 &&
        !Number.isNaN(parseFloat(p[0])) &&
        !Number.isNaN(parseFloat(p[1]))
    );
  }, [gtfsShapePoints]);

  const refreshRouteLines = async (force = false) => {
    if (!enabled) {
      setRoutePaths([]);
      setRoutingError("");
      return;
    }

    if (sourceMode === "gtfs") {
      if (validGtfsShapePoints.length >= 2) {
        setRoutePaths([
          {
            routeId: selectedRouteMeta?.id || "gtfs-shape",
            routeCode: selectedRouteMeta?.code || "GTFS",
            routeName: selectedRouteMeta?.name || "GTFS Shape",
            color: "#2563eb",
            path: validGtfsShapePoints,
            usedRoutingApi: false,
            source: "gtfs-shapes",
          },
        ]);
        setRoutingError("");
        setLastRoutingUpdated(new Date().toISOString());
        return;
      }

      if (validStops.length >= 2) {
        setRoutePaths([
          {
            routeId: selectedRouteMeta?.id || "gtfs-stops",
            routeCode: selectedRouteMeta?.code || "GTFS",
            routeName: selectedRouteMeta?.name || "GTFS Stop Order",
            color: "#2563eb",
            path: validStops.map((s) => [
              parseFloat(s.stopLat ?? s.stop_lat ?? s.latitude ?? s.lat),
              parseFloat(s.stopLon ?? s.stop_lon ?? s.longitude ?? s.lng),
            ]),
            usedRoutingApi: false,
            source: "stops",
          },
        ]);
        setRoutingError(
          "GTFS shapes were not available for this route, so the dashboard is using ordered stops as the fallback line."
        );
        setLastRoutingUpdated(new Date().toISOString());
        return;
      }

      setRoutePaths([]);
      setRoutingError("No GTFS shape or ordered stop data found for this route.");
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
      setRoutingError("");
      return;
    }

    const cached = !force ? getRouteCache(cacheKey) : null;
    if (cached) {
      setRoutePaths(cached.routePaths || []);
      setRoutingError(cached.routingError || "");
      setLastRoutingUpdated(cached.lastRoutingUpdated || null);
      return;
    }

    setRoutingLoading(true);
    setRoutingError("");

    try {
      const coords = validStops
        .map((s) => {
          const lat = parseFloat(s.stopLat ?? s.stop_lat ?? s.latitude ?? s.lat);
          const lng = parseFloat(s.stopLon ?? s.stop_lon ?? s.longitude ?? s.lng);
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

      let nextPaths = [];
      let nextError = "";

      if (points.length < 2) {
        const fallbackPoints = validStops.map((s) => [
          parseFloat(s.stopLat ?? s.stop_lat ?? s.latitude ?? s.lat),
          parseFloat(s.stopLon ?? s.stop_lon ?? s.longitude ?? s.lng),
        ]);

        const firstRouteId = validStops[0]?.routeId || validStops[0]?.route_id || "fallback";

        nextPaths = [
          {
            routeId: firstRouteId,
            routeCode: sourceRouteMap[firstRouteId]?.routeCode || "N/A",
            routeName: sourceRouteMap[firstRouteId]?.routeName || "Route",
            color: "#2563eb",
            path: fallbackPoints,
            usedRoutingApi: false,
            source: "stops",
          },
        ];

        nextError =
          "TomTom routing could not build road-following lines, so the dashboard is using stop-to-stop fallback lines.";
      } else {
        const firstRouteId = validStops[0]?.routeId || validStops[0]?.route_id || "route";

        nextPaths = [
          {
            routeId: firstRouteId,
            routeCode: sourceRouteMap[firstRouteId]?.routeCode || "N/A",
            routeName: sourceRouteMap[firstRouteId]?.routeName || "Route",
            color: "#2563eb",
            path: points,
            usedRoutingApi: true,
            source: "tomtom",
          },
        ];
      }

      const updatedAt = new Date().toISOString();

      setRoutePaths(nextPaths);
      setRoutingError(nextError);
      setLastRoutingUpdated(updatedAt);

      setRouteCache(cacheKey, {
        routePaths: nextPaths,
        routingError: nextError,
        lastRoutingUpdated: updatedAt,
      });
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
  }, [
    enabled,
    apiKey,
    sourceMode,
    validStops.length,
    validGtfsShapePoints.length,
    selectedRouteMeta?.id,
    cacheKey,
  ]);

  return {
    routePaths,
    routingLoading,
    routingError,
    lastRoutingUpdated,
    refreshRouteLines,
  };
}