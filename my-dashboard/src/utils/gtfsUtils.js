function toNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function cleanText(value) {
  return String(value || "").trim();
}

function normalizeText(value) {
  return cleanText(value).toLowerCase().replace(/\s+/g, " ");
}

function buildSearchText(...values) {
  return normalizeText(
    values
      .map((value) => cleanText(value))
      .filter(Boolean)
      .join(" ")
  );
}

function normalizeRoute(route = {}) {
  const routeId = cleanText(route.route_id || route.routeId || route.id);
  const routeCode = cleanText(route.route_short_name || route.routeCode || route.code);
  const routeName = cleanText(
    route.route_long_name || route.routeName || route.route_desc || route.name
  );
  const routeColor = normalizeRouteColor(route.route_color || route.routeColor);

  return {
    ...route,
    id: routeId,
    route_id: routeId,
    routeId: routeId,
    routeCode: routeCode || "N/A",
    routeName: routeName || "Unnamed Route",
    routeColor,
    routeTextColor: cleanText(route.route_text_color || route.routeTextColor),
    routeType: cleanText(route.route_type || route.routeType),
    searchText: buildSearchText(routeCode, routeName, routeId),
  };
}

function normalizeStop(stop = {}) {
  const stopId = cleanText(stop.stop_id || stop.stopId || stop.id);
  const stopName = cleanText(stop.stop_name || stop.stopName || stop.name);
  const stopCode = cleanText(stop.stop_code || stop.stopCode);
  const stopLat = toNumber(stop.stop_lat ?? stop.stopLat ?? stop.latitude, NaN);
  const stopLon = toNumber(stop.stop_lon ?? stop.stopLon ?? stop.longitude, NaN);

  return {
    ...stop,
    id: stopId,
    stop_id: stopId,
    stopId: stopId,
    stopName: stopName || stopId || "Unnamed Stop",
    stop_name: stopName || stopId || "Unnamed Stop",
    stopCode,
    stop_code: stopCode,
    stopLat,
    stopLon,
    stop_lat: stopLat,
    stop_lon: stopLon,
    location_type: cleanText(stop.location_type || stop.locationType || "0"),
    searchText: buildSearchText(stopName, stopCode, stopId),
  };
}

function normalizeTrip(trip = {}) {
  const tripId = cleanText(trip.trip_id || trip.tripId || trip.id);
  const routeId = cleanText(trip.route_id || trip.routeId);
  const serviceId = cleanText(trip.service_id || trip.serviceId);
  const tripHeadsign = cleanText(trip.trip_headsign || trip.tripHeadsign);
  const directionId = cleanText(trip.direction_id || trip.directionId);
  const shapeId = cleanText(trip.shape_id || trip.shapeId);

  return {
    ...trip,
    id: tripId,
    trip_id: tripId,
    tripId: tripId,
    route_id: routeId,
    routeId: routeId,
    service_id: serviceId,
    serviceId,
    tripHeadsign,
    trip_headsign: tripHeadsign,
    directionId,
    direction_id: directionId,
    shapeId,
    shape_id: shapeId,
    searchText: buildSearchText(tripId, tripHeadsign, routeId, directionId),
  };
}

function normalizeStopTime(stopTime = {}) {
  const tripId = cleanText(stopTime.trip_id || stopTime.tripId);
  const stopId = cleanText(stopTime.stop_id || stopTime.stopId);
  const stopSequence = toNumber(stopTime.stop_sequence ?? stopTime.stopSequence, 0);

  return {
    ...stopTime,
    trip_id: tripId,
    tripId,
    stop_id: stopId,
    stopId,
    stop_sequence: stopSequence,
    stopSequence,
    arrival_time: cleanText(stopTime.arrival_time || stopTime.arrivalTime),
    departure_time: cleanText(stopTime.departure_time || stopTime.departureTime),
  };
}

function normalizeShape(shape = {}) {
  const shapeId = cleanText(shape.shape_id || shape.shapeId);

  return {
    ...shape,
    shape_id: shapeId,
    shapeId,
    shape_pt_lat: toNumber(shape.shape_pt_lat ?? shape.shapePtLat, NaN),
    shape_pt_lon: toNumber(shape.shape_pt_lon ?? shape.shapePtLon, NaN),
    shape_pt_sequence: toNumber(shape.shape_pt_sequence ?? shape.shapePtSequence, 0),
  };
}

function getStopDisplayName(stop) {
  const name = cleanText(stop?.stopName || stop?.stop_name);
  const code = cleanText(stop?.stopCode || stop?.stop_code);
  return code ? `${name} (${code})` : name || "Unknown Stop";
}

function getRouteDisplayName(route) {
  if (!route) return "Unknown Route";
  const code = cleanText(route.routeCode || route.route_short_name);
  const name = cleanText(route.routeName || route.route_long_name || route.route_desc);
  if (code && name) return `${code} - ${name}`;
  return code || name || "Unknown Route";
}

function directionLabelFromTrip(trip) {
  const headsign = cleanText(trip?.tripHeadsign || trip?.trip_headsign);
  if (headsign) return headsign;

  const directionId = cleanText(trip?.directionId || trip?.direction_id);
  if (directionId === "0") return "Outbound";
  if (directionId === "1") return "Inbound";

  return "Direction not available";
}

function normalizeRouteColor(color) {
  if (!color) return "#3b82f6";
  if (color.startsWith("#")) return color;
  return `#${color}`;
}

function scoreStopMatch(stop, query) {
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) return 0;

  const name = normalizeText(stop.stopName || stop.stop_name);
  const code = normalizeText(stop.stopCode || stop.stop_code);
  const id = normalizeText(stop.stop_id || stop.id);
  const searchText = stop.searchText || buildSearchText(name, code, id);

  if (name === normalizedQuery) return 5000;
  if (code && code === normalizedQuery) return 4700;
  if (id && id === normalizedQuery) return 4500;
  if (name.startsWith(normalizedQuery)) return 4000;
  if (name.includes(normalizedQuery)) return 3200;
  if (searchText.includes(normalizedQuery)) return 2200;

  const queryWords = normalizedQuery.split(" ").filter(Boolean);
  if (!queryWords.length) return 0;

  let score = 0;
  let matchedWords = 0;

  queryWords.forEach((word) => {
    if (name.includes(word)) {
      score += 250;
      matchedWords += 1;
    } else if (searchText.includes(word)) {
      score += 110;
    }
  });

  if (matchedWords === queryWords.length) score += 500;
  return score;
}

function dedupeStopsByName(stops = []) {
  const seen = new Map();

  stops.forEach((stop) => {
    const key = normalizeText(stop.stopName || stop.stop_name);
    const existing = seen.get(key);

    if (!existing || Number(stop.matchScore || 0) > Number(existing.matchScore || 0)) {
      seen.set(key, stop);
    }
  });

  return Array.from(seen.values());
}

function searchStops(query, bundle, limit = 8) {
  if (!bundle?.stops?.length) return [];
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) return [];

  return dedupeStopsByName(
    bundle.stops
      .map((stop) => ({
        ...stop,
        matchScore: scoreStopMatch(stop, normalizedQuery),
      }))
      .filter((stop) => stop.matchScore > 0)
      .sort((a, b) => {
        if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
        return getStopDisplayName(a).localeCompare(getStopDisplayName(b));
      })
  ).slice(0, limit);
}

function getStopLatLng(stop) {
  const lat = toNumber(stop?.stopLat ?? stop?.stop_lat ?? stop?.latitude, NaN);
  const lng = toNumber(stop?.stopLon ?? stop?.stop_lon ?? stop?.longitude, NaN);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return [lat, lng];
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

function distanceBetweenStops(a, b) {
  const aPos = getStopLatLng(a);
  const bPos = getStopLatLng(b);
  if (!aPos || !bPos) return Infinity;
  return haversineMeters(aPos[0], aPos[1], bPos[0], bPos[1]);
}

function buildSpatialIndex(stops, cellSize = 0.005) {
  const grid = new Map();

  stops.forEach((stop) => {
    const pos = getStopLatLng(stop);
    if (!pos) return;

    const row = Math.floor(pos[0] / cellSize);
    const col = Math.floor(pos[1] / cellSize);
    const key = `${row}:${col}`;

    if (!grid.has(key)) grid.set(key, []);
    grid.get(key).push(stop.id);
  });

  return { grid, cellSize };
}

function getNearbyStops(stop, bundle, maxDistanceMeters = 400, maxResults = 8) {
  if (!stop || !bundle?.spatialIndex) return [];

  const pos = getStopLatLng(stop);
  if (!pos) return [];

  const { grid, cellSize } = bundle.spatialIndex;
  const row = Math.floor(pos[0] / cellSize);
  const col = Math.floor(pos[1] / cellSize);

  const candidates = [];

  for (let r = row - 1; r <= row + 1; r += 1) {
    for (let c = col - 1; c <= col + 1; c += 1) {
      const key = `${r}:${c}`;
      const ids = grid.get(key) || [];
      ids.forEach((id) => {
        const candidate = bundle.stopsById?.[id];
        if (!candidate) return;

        const distance = distanceBetweenStops(stop, candidate);
        if (distance <= maxDistanceMeters) {
          candidates.push({ stop: candidate, distance });
        }
      });
    }
  }

  candidates.sort((a, b) => a.distance - b.distance);

  const seen = new Set();
  const result = [];

  for (const item of candidates) {
    if (seen.has(item.stop.id)) continue;
    seen.add(item.stop.id);
    result.push(item);
    if (result.length >= maxResults) break;
  }

  return result;
}

function buildGtfsBundle(raw) {
  const routes = (raw.routes || []).map(normalizeRoute).filter((item) => item.id);
  const stops = (raw.stops || [])
    .map(normalizeStop)
    .filter(
      (item) =>
        item.id &&
        item.location_type !== "1" &&
        Number.isFinite(item.stopLat) &&
        Number.isFinite(item.stopLon)
    );
  const trips = (raw.trips || []).map(normalizeTrip).filter((item) => item.id);
  const stopTimes = (raw.stop_times || [])
    .map(normalizeStopTime)
    .filter((item) => item.trip_id && item.stop_id);
  const shapes = (raw.shapes || []).map(normalizeShape).filter((item) => item.shape_id);

  const routesById = {};
  const stopsById = {};
  const tripsById = {};
  const stopTimesByTripId = {};
  const tripIdsByStopId = {};
  const shapesById = {};
  const patternsByTripId = {};

  routes.forEach((route) => {
    routesById[route.id] = route;
  });

  stops.forEach((stop) => {
    stopsById[stop.id] = stop;
  });

  trips.forEach((trip) => {
    tripsById[trip.id] = trip;
  });

  stopTimes.forEach((stopTime) => {
    const tripId = stopTime.trip_id;
    const stopId = stopTime.stop_id;

    if (!stopTimesByTripId[tripId]) stopTimesByTripId[tripId] = [];
    stopTimesByTripId[tripId].push(stopTime);

    if (!tripIdsByStopId[stopId]) tripIdsByStopId[stopId] = new Set();
    tripIdsByStopId[stopId].add(tripId);
  });

  Object.keys(stopTimesByTripId).forEach((tripId) => {
    stopTimesByTripId[tripId].sort(
      (a, b) => Number(a.stop_sequence || 0) - Number(b.stop_sequence || 0)
    );
  });

  shapes.forEach((shape) => {
    const shapeId = shape.shape_id;
    if (!shapesById[shapeId]) shapesById[shapeId] = [];
    shapesById[shapeId].push(shape);
  });

  Object.keys(shapesById).forEach((shapeId) => {
    shapesById[shapeId].sort(
      (a, b) => Number(a.shape_pt_sequence || 0) - Number(b.shape_pt_sequence || 0)
    );
  });

  const tripPatterns = Object.entries(stopTimesByTripId).map(([tripId, tripStopTimes]) => {
    const trip = tripsById[tripId] || null;
    const route = trip ? routesById[trip.route_id || trip.routeId] || null : null;
    const stopSequenceMap = {};
    const stopIds = tripStopTimes.map((item) => item.stop_id);

    tripStopTimes.forEach((item) => {
      stopSequenceMap[item.stop_id] = Number(item.stop_sequence || 0);
    });

    const stopPoints = tripStopTimes
      .map((item) => getStopLatLng(stopsById[item.stop_id]))
      .filter(Boolean);

    const pattern = {
      tripId,
      trip,
      route,
      stopIds,
      stopSequenceMap,
      stopTimes: tripStopTimes,
      stopPoints,
    };

    patternsByTripId[tripId] = pattern;
    return pattern;
  });

  return {
    routes,
    stops,
    trips,
    stopTimes,
    shapes,
    routesById,
    stopsById,
    tripsById,
    stopTimesByTripId,
    tripIdsByStopId,
    shapesById,
    tripPatterns,
    patternsByTripId,
    spatialIndex: buildSpatialIndex(stops),
  };
}

function buildSegmentPath(pattern, fromSeq, toSeq, bundle) {
  const segmentStops = (pattern?.stopTimes || [])
    .filter((item) => {
      const seq = Number(item.stop_sequence || 0);
      return seq >= fromSeq && seq <= toSeq;
    })
    .map((item) => bundle.stopsById?.[item.stop_id])
    .filter(Boolean);

  const segmentPoints = segmentStops
    .map((stop) => getStopLatLng(stop))
    .filter(Boolean);

  if (segmentPoints.length >= 2) return segmentPoints;
  return [];
}

function buildWalkingStep(stop, label = "Walk") {
  return {
    type: "walk",
    instruction: `${label} to ${getStopDisplayName(stop)}`,
    stopName: getStopDisplayName(stop),
    stop,
  };
}

function buildArrivalStep(stop) {
  return {
    type: "arrive",
    instruction: `Arrive at ${getStopDisplayName(stop)}`,
    stopName: getStopDisplayName(stop),
    stop,
  };
}

function buildDirectionsFromLegs(legs, fromStop, toStop) {
  const steps = [];
  if (!legs.length) return steps;

  steps.push(buildWalkingStep(fromStop, "Walk"));

  legs.forEach((leg, index) => {
    steps.push({
      type: "ride",
      instruction: `Ride ${leg.routeLabel} from ${leg.fromStopName} to ${leg.toStopName}`,
      routeLabel: leg.routeLabel,
      directionLabel: leg.directionLabel,
      fromStopName: leg.fromStopName,
      toStopName: leg.toStopName,
      stopCount: leg.stopCount,
      legIndex: index,
    });

    if (index < legs.length - 1) {
      steps.push({
        type: "transfer",
        instruction: `Transfer at ${leg.toStopName}`,
        stopName: leg.toStopName,
        stop: leg.toStop,
      });
    }
  });

  steps.push(buildArrivalStep(toStop));
  return steps;
}

function makeDirectPlan({
  tripId,
  route,
  trip,
  fromStop,
  toStop,
  fromSeq,
  toSeq,
  fromMatchScore,
  toMatchScore,
  fromPenalty = 0,
  toPenalty = 0,
  bundle,
}) {
  const routeCode = cleanText(route?.routeCode || route?.route_short_name);
  const stopCount = Math.max(0, toSeq - fromSeq);
  const bothExact =
    fromMatchScore >= 5000 && toMatchScore >= 5000
      ? 6000
      : fromMatchScore >= 5000 || toMatchScore >= 5000
      ? 2000
      : 0;

  const pattern = bundle?.patternsByTripId?.[tripId];

  const legs = [
    {
      type: "ride",
      tripId,
      routeId: route?.id || route?.route_id || trip?.route_id || "",
      routeCode: routeCode || "N/A",
      routeName: cleanText(route?.routeName || route?.route_long_name || route?.route_desc) || "Unnamed Route",
      routeLabel: getRouteDisplayName(route),
      directionLabel: directionLabelFromTrip(trip),
      fromStop,
      toStop,
      fromStopName: getStopDisplayName(fromStop),
      toStopName: getStopDisplayName(toStop),
      fromSequence: fromSeq,
      toSequence: toSeq,
      stopCount,
      pathPoints: buildSegmentPath(pattern, fromSeq, toSeq, bundle),
    },
  ];

  return {
    type: "direct",
    transfers: 0,
    tripId,
    routeId: route?.id || route?.route_id || trip?.route_id || "",
    routeCode: routeCode || "N/A",
    routeName: cleanText(route?.routeName || route?.route_long_name || route?.route_desc) || "Unnamed Route",
    routeLabel: getRouteDisplayName(route),
    routeColor: route?.routeColor || "#3b82f6",
    tripHeadsign: cleanText(trip?.tripHeadsign || trip?.trip_headsign),
    directionLabel: directionLabelFromTrip(trip),
    fromStop,
    toStop,
    fromStopName: getStopDisplayName(fromStop),
    toStopName: getStopDisplayName(toStop),
    totalStops: stopCount,
    stopCount,
    rankingScore:
      fromMatchScore +
      toMatchScore +
      bothExact +
      (routeCode ? 60 : 0) -
      stopCount * 18 -
      fromPenalty -
      toPenalty,
    exactFrom: fromMatchScore >= 5000,
    exactTo: toMatchScore >= 5000,
    legs,
    steps: buildDirectionsFromLegs(legs, fromStop, toStop),
    mapStops: [fromStop, toStop],
    transferStops: [],
    transferStopNames: [],
  };
}

function makeMultiTransferPlan({
  fromStop,
  toStop,
  fromMatchScore,
  toMatchScore,
  stateChain,
  bundle,
  fromPenalty = 0,
  toPenalty = 0,
  transferWalkMeters = 0,
}) {
  const legs = [];
  let totalStops = 0;
  const mapStops = [fromStop];

  for (let i = 0; i < stateChain.length - 1; i += 1) {
    const current = stateChain[i];
    const next = stateChain[i + 1];

    const pattern = current.pattern;
    const trip = pattern?.trip;
    const route = pattern?.route;

    const fromStopObj = bundle.stopsById?.[current.stopId];
    const toStopObj = bundle.stopsById?.[next.stopId];

    const fromSequence = Number(pattern?.stopSequenceMap?.[current.stopId] || 0);
    const toSequence = Number(pattern?.stopSequenceMap?.[next.stopId] || 0);

    const stopCount = Math.max(0, toSequence - fromSequence);
    totalStops += stopCount;
    mapStops.push(toStopObj);

    legs.push({
      type: "ride",
      tripId: pattern.tripId,
      routeId: route?.id || route?.route_id || trip?.route_id || "",
      routeCode: cleanText(route?.routeCode || route?.route_short_name) || "N/A",
      routeName: cleanText(route?.routeName || route?.route_long_name || route?.route_desc) || "Unnamed Route",
      routeLabel: getRouteDisplayName(route),
      directionLabel: directionLabelFromTrip(trip),
      fromStop: fromStopObj,
      toStop: toStopObj,
      fromStopName: getStopDisplayName(fromStopObj),
      toStopName: getStopDisplayName(toStopObj),
      fromSequence,
      toSequence,
      stopCount,
      pathPoints: buildSegmentPath(pattern, fromSequence, toSequence, bundle),
    });
  }

  const transferCount = Math.max(0, legs.length - 1);
  const exactBoost =
    fromMatchScore >= 5000 && toMatchScore >= 5000
      ? 5000
      : fromMatchScore >= 5000 || toMatchScore >= 5000
      ? 1800
      : 0;

  const rankingScore =
    fromMatchScore +
    toMatchScore +
    exactBoost -
    totalStops * 16 -
    transferCount * 850 -
    Math.round(transferWalkMeters / 25) -
    fromPenalty -
    toPenalty;

  return {
    type: transferCount === 0 ? "direct" : "transfer",
    transfers: transferCount,
    routeLabel: legs.map((leg) => leg.routeLabel).join(" → "),
    routeColor: legs[0]?.routeColor || "#3b82f6",
    fromStop,
    toStop,
    fromStopName: getStopDisplayName(fromStop),
    toStopName: getStopDisplayName(toStop),
    transferStops: legs.slice(0, -1).map((leg) => leg.toStop),
    transferStopNames: legs.slice(0, -1).map((leg) => leg.toStopName),
    totalStops,
    stopCount: totalStops,
    rankingScore,
    exactFrom: fromMatchScore >= 5000,
    exactTo: toMatchScore >= 5000,
    legs,
    steps: buildDirectionsFromLegs(legs, fromStop, toStop),
    mapStops,
  };
}

function dedupePlans(plans = []) {
  const seen = new Map();

  plans.forEach((plan) => {
    const key = [
      plan.type,
      normalizeText(plan.fromStopName),
      normalizeText(plan.toStopName),
      String(plan.transfers || 0),
      ...(plan.legs || []).map((leg) =>
        [normalizeText(leg.routeLabel), normalizeText(leg.fromStopName), normalizeText(leg.toStopName)].join(">")
      ),
    ].join("|");

    const existing = seen.get(key);
    if (!existing || Number(plan.rankingScore || 0) > Number(existing.rankingScore || 0)) {
      seen.set(key, plan);
    }
  });

  return Array.from(seen.values());
}

function sortPlans(plans = []) {
  return plans.sort((a, b) => {
    if ((a.transfers || 0) !== (b.transfers || 0)) {
      return (a.transfers || 0) - (b.transfers || 0);
    }

    const aExact = (a.exactFrom ? 1 : 0) + (a.exactTo ? 1 : 0);
    const bExact = (b.exactFrom ? 1 : 0) + (b.exactTo ? 1 : 0);

    if (bExact !== aExact) return bExact - aExact;
    if (b.rankingScore !== a.rankingScore) return b.rankingScore - a.rankingScore;
    if ((a.stopCount || 0) !== (b.stopCount || 0)) return (a.stopCount || 0) - (b.stopCount || 0);
    return String(a.routeLabel || "").localeCompare(String(b.routeLabel || ""));
  });
}

function collectDirectPlans(fromMatches, toMatches, bundle, options = {}) {
  const { exactOnly = false, maxFromCandidates = 4, maxToCandidates = 4, maxPlans = 20 } = options;

  const plans = [];
  const fromCandidates = fromMatches.slice(0, maxFromCandidates);
  const toCandidates = toMatches.slice(0, maxToCandidates);

  for (const [fromIndex, fromStop] of fromCandidates.entries()) {
    for (const [toIndex, toStop] of toCandidates.entries()) {
      if (fromStop.id === toStop.id) continue;

      const fromExact = Number(fromStop.matchScore || 0) >= 5000;
      const toExact = Number(toStop.matchScore || 0) >= 5000;

      if (exactOnly && (!fromExact || !toExact)) continue;

      const fromTrips = bundle.tripIdsByStopId?.[fromStop.id] || new Set();
      const toTrips = bundle.tripIdsByStopId?.[toStop.id] || new Set();

      for (const tripId of fromTrips) {
        if (!toTrips.has(tripId)) continue;

        const pattern = bundle.patternsByTripId?.[tripId];
        if (!pattern) continue;

        const fromSeq = Number(pattern.stopSequenceMap?.[fromStop.id] || 0);
        const toSeq = Number(pattern.stopSequenceMap?.[toStop.id] || 0);

        if (!fromSeq || !toSeq || fromSeq >= toSeq) continue;

        plans.push(
          makeDirectPlan({
            tripId,
            route: pattern.route,
            trip: pattern.trip,
            fromStop,
            toStop,
            fromSeq,
            toSeq,
            fromMatchScore: Number(fromStop.matchScore || 0),
            toMatchScore: Number(toStop.matchScore || 0),
            fromPenalty: fromIndex * 120,
            toPenalty: toIndex * 120,
            bundle,
          })
        );

        if (plans.length >= maxPlans) return plans;
      }
    }
  }

  return plans;
}

function expandTransferPlans(fromMatches, toMatches, bundle, options = {}) {
  const {
    maxFromCandidates = 2,
    maxToCandidates = 2,
    maxTransfers = 2,
    maxStatesPerLevel = 80,
    maxOutgoingStopsPerPattern = 12,
    maxTransferWalkMeters = 300,
    maxNearbyStopsPerTransfer = 5,
    maxPlans = 20,
  } = options;

  const plans = [];
  const fromCandidates = fromMatches.slice(0, maxFromCandidates);
  const toCandidates = toMatches.slice(0, maxToCandidates);

  for (const [fromIndex, fromStop] of fromCandidates.entries()) {
    for (const [toIndex, toStop] of toCandidates.entries()) {
      if (fromStop.id === toStop.id) continue;

      const targetTrips = bundle.tripIdsByStopId?.[toStop.id] || new Set();
      const startTripIds = Array.from(bundle.tripIdsByStopId?.[fromStop.id] || []).slice(0, 50);

      const initialStates = [];

      for (const tripId of startTripIds) {
        const pattern = bundle.patternsByTripId?.[tripId];
        if (!pattern) continue;

        const startSeq = Number(pattern.stopSequenceMap?.[fromStop.id] || 0);
        if (!startSeq) continue;

        initialStates.push({
          tripId,
          pattern,
          stopId: fromStop.id,
          transferCount: 0,
          walkedMeters: 0,
          chain: [{ tripId, pattern, stopId: fromStop.id }],
        });
      }

      let frontier = initialStates;
      const visited = new Set();

      for (let depth = 0; depth <= maxTransfers && frontier.length; depth += 1) {
        const nextFrontier = [];

        for (const state of frontier.slice(0, maxStatesPerLevel)) {
          const pattern = state.pattern;
          const currentSeq = Number(pattern?.stopSequenceMap?.[state.stopId] || 0);
          if (!currentSeq) continue;

          if (targetTrips.has(state.tripId)) {
            const toSeq = Number(pattern.stopSequenceMap?.[toStop.id] || 0);
            if (toSeq > currentSeq) {
              const finalChain = [...state.chain, { tripId: state.tripId, pattern, stopId: toStop.id }];
              plans.push(
                makeMultiTransferPlan({
                  fromStop,
                  toStop,
                  fromMatchScore: Number(fromStop.matchScore || 0),
                  toMatchScore: Number(toStop.matchScore || 0),
                  stateChain: finalChain,
                  bundle,
                  fromPenalty: fromIndex * 120,
                  toPenalty: toIndex * 120,
                  transferWalkMeters: state.walkedMeters,
                })
              );

              if (plans.length >= maxPlans) {
                return plans;
              }
            }
          }

          if (state.transferCount >= maxTransfers) continue;

          const outgoingStops = pattern.stopTimes
            .filter((item) => Number(item.stop_sequence || 0) > currentSeq)
            .slice(0, maxOutgoingStopsPerPattern);

          for (const stopTime of outgoingStops) {
            const currentTransferStop = bundle.stopsById?.[stopTime.stop_id];
            if (!currentTransferStop) continue;

            const nearbyStops = getNearbyStops(
              currentTransferStop,
              bundle,
              maxTransferWalkMeters,
              maxNearbyStopsPerTransfer
            );

            for (const { stop: nearbyStop, distance } of nearbyStops) {
              const nextTripIds = Array.from(bundle.tripIdsByStopId?.[nearbyStop.id] || []).slice(0, 20);

              for (const nextTripId of nextTripIds) {
                if (nextTripId === state.tripId) continue;

                const nextPattern = bundle.patternsByTripId?.[nextTripId];
                if (!nextPattern) continue;

                const nextSeq = Number(nextPattern.stopSequenceMap?.[nearbyStop.id] || 0);
                if (!nextSeq) continue;

                const nextWalkedMeters = state.walkedMeters + distance;
                const walkBudget = maxTransferWalkMeters * Math.max(1, state.transferCount + 1);

                if (nextWalkedMeters > walkBudget) continue;

                const visitKey = `${nextTripId}|${nearbyStop.id}|${state.transferCount + 1}`;
                if (visited.has(visitKey)) continue;
                visited.add(visitKey);

                nextFrontier.push({
                  tripId: nextTripId,
                  pattern: nextPattern,
                  stopId: nearbyStop.id,
                  transferCount: state.transferCount + 1,
                  walkedMeters: nextWalkedMeters,
                  chain: [
                    ...state.chain,
                    { tripId: state.tripId, pattern: state.pattern, stopId: stopTime.stop_id },
                    { tripId: nextTripId, pattern: nextPattern, stopId: nearbyStop.id },
                  ],
                });

                if (nextFrontier.length >= maxStatesPerLevel) break;
              }

              if (nextFrontier.length >= maxStatesPerLevel) break;
            }

            if (nextFrontier.length >= maxStatesPerLevel) break;
          }
        }

        frontier = nextFrontier;
      }
    }
  }

  return plans;
}

function buildPlanMapData(plan) {
  if (!plan) return null;

  const markers = [];
  const polylines = [];

  if (plan.fromStop) {
    markers.push({
      id: "planner-start",
      kind: "start",
      label: "Start",
      stop: plan.fromStop,
      name: plan.fromStopName,
    });
  }

  (plan.transferStops || []).forEach((stop, index) => {
    markers.push({
      id: `planner-transfer-${index}`,
      kind: "transfer",
      label: `Transfer ${index + 1}`,
      stop,
      name: getStopDisplayName(stop),
    });
  });

  if (plan.toStop) {
    markers.push({
      id: "planner-end",
      kind: "end",
      label: "Destination",
      stop: plan.toStop,
      name: plan.toStopName,
    });
  }

  (plan.legs || []).forEach((leg, index) => {
    const path = (leg.pathPoints || []).filter(
      (point) =>
        Array.isArray(point) &&
        point.length >= 2 &&
        Number.isFinite(point[0]) &&
        Number.isFinite(point[1])
    );

    if (path.length < 2) return;

    polylines.push({
      id: `planner-leg-${index}`,
      color:
        index === 0
          ? "#22c55e"
          : index === plan.legs.length - 1
          ? "#ef4444"
          : "#f59e0b",
      weight: 7,
      opacity: 1,
      routeLabel: leg.routeLabel,
      directionLabel: leg.directionLabel,
      path,
      fromStopName: leg.fromStopName,
      toStopName: leg.toStopName,
      stopCount: leg.stopCount,
    });
  });

  const fitBoundsPoints = [
    ...markers.map((marker) => getStopLatLng(marker.stop)).filter(Boolean),
    ...polylines.flatMap((line) => line.path || []),
  ];

  return {
    markers,
    polylines,
    fitBoundsPoints,
  };
}

function findBestTripPlan(fromQuery, toQuery, bundle) {
  if (!bundle?.stops?.length || !bundle?.tripPatterns?.length) {
    return {
      ok: false,
      reason: "GTFS data is not ready yet.",
      fromMatches: [],
      toMatches: [],
      plans: [],
      bestPlan: null,
      mapData: null,
    };
  }

  const normalizedFrom = normalizeText(fromQuery);
  const normalizedTo = normalizeText(toQuery);

  if (!normalizedFrom || !normalizedTo) {
    return {
      ok: false,
      reason: "Please enter both FROM and TO stops.",
      fromMatches: [],
      toMatches: [],
      plans: [],
      bestPlan: null,
      mapData: null,
    };
  }

  const fromMatches = searchStops(normalizedFrom, bundle, 8);
  const toMatches = searchStops(normalizedTo, bundle, 8);

  if (!fromMatches.length || !toMatches.length) {
    return {
      ok: false,
      reason:
        !fromMatches.length && !toMatches.length
          ? "No matching FROM and TO stops found."
          : !fromMatches.length
          ? "No matching FROM stop found."
          : "No matching TO stop found.",
      fromMatches,
      toMatches,
      plans: [],
      bestPlan: null,
      mapData: null,
    };
  }

  let plans = collectDirectPlans(fromMatches, toMatches, bundle, {
    exactOnly: true,
    maxFromCandidates: 2,
    maxToCandidates: 2,
    maxPlans: 20,
  });

  if (!plans.length) {
    plans = collectDirectPlans(fromMatches, toMatches, bundle, {
      exactOnly: false,
      maxFromCandidates: 3,
      maxToCandidates: 3,
      maxPlans: 20,
    });
  }

  if (!plans.length) {
    plans = expandTransferPlans(fromMatches, toMatches, bundle, {
      maxFromCandidates: 2,
      maxToCandidates: 2,
      maxTransfers: 2,
      maxStatesPerLevel: 80,
      maxOutgoingStopsPerPattern: 12,
      maxTransferWalkMeters: 300,
      maxNearbyStopsPerTransfer: 5,
      maxPlans: 20,
    });
  }

  plans = sortPlans(dedupePlans(plans));

  const bestPlan = plans[0] || null;

  return {
    ok: !!bestPlan,
    reason: bestPlan ? "" : "No route found between those stops.",
    fromMatches,
    toMatches,
    plans,
    bestPlan,
    mapData: buildPlanMapData(bestPlan),
  };
}

function deterministicNumber(str) {
  if (!str) return 0;
  return str.split("").reduce((sum, c) => sum + c.charCodeAt(0), 0);
}

function toTodayDateTime(timeStr) {
  if (!timeStr) return null;

  const [h, m, s] = timeStr.split(":").map(Number);
  const d = new Date();
  d.setHours(h || 0, m || 0, s || 0);
  return d;
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
  return points;
}

export {
  buildGtfsBundle,
  searchStops,
  findBestTripPlan,
  deterministicNumber,
  normalizeRouteColor,
  toTodayDateTime,
  estimatePolylineMeters,
  haversineMeters,
  simplifyPolyline,
};