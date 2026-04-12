import { useMemo } from "react";

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function estimatePassengersFromStops(stops = []) {
  if (!stops.length) return 0;

  return Math.round(
    stops.reduce((sum, stop, index) => {
      const explicitValue =
        stop.simulatedPassengers ??
        stop.estimatedPassengers ??
        stop.passengers ??
        stop.passengerCount;

      if (explicitValue !== undefined && explicitValue !== null && explicitValue !== "") {
        return sum + toNumber(explicitValue, 0);
      }

      const boardingBias = index % 5 === 0 ? 18 : index % 3 === 0 ? 12 : 8;
      const stopName = String(stop.stopName || stop.stop_name || "").toLowerCase();

      let locationBoost = 0;
      if (
        stopName.includes("terminal") ||
        stopName.includes("station") ||
        stopName.includes("center") ||
        stopName.includes("centre")
      ) {
        locationBoost = 10;
      }

      return sum + boardingBias + locationBoost;
    }, 0)
  );
}

function estimateStopDelay(stop, stopCount) {
  const explicitDelay =
    stop.simulatedDelay ??
    stop.averageDelay ??
    stop.delayMinutes ??
    stop.delay;

  if (explicitDelay !== undefined && explicitDelay !== null && explicitDelay !== "") {
    return toNumber(explicitDelay, 0);
  }

  const hasTrafficHint =
    stop.congestionLevel ||
    stop.trafficLevel ||
    stop.currentSpeed ||
    stop.freeFlowSpeed;

  if (typeof stop.congestionLevel === "string") {
    const level = stop.congestionLevel.toLowerCase();
    if (level.includes("high") || level.includes("heavy")) return 4.5;
    if (level.includes("medium") || level.includes("moderate")) return 2.5;
    if (level.includes("low") || level.includes("light")) return 1.0;
  }

  if (typeof stop.trafficLevel === "string") {
    const level = stop.trafficLevel.toLowerCase();
    if (level.includes("high") || level.includes("heavy")) return 4.5;
    if (level.includes("medium") || level.includes("moderate")) return 2.5;
    if (level.includes("low") || level.includes("light")) return 1.0;
  }

  if (hasTrafficHint) {
    const currentSpeed = toNumber(stop.currentSpeed, 0);
    const freeFlowSpeed = toNumber(stop.freeFlowSpeed, 0);
    if (currentSpeed > 0 && freeFlowSpeed > 0) {
      const ratio = currentSpeed / freeFlowSpeed;
      if (ratio < 0.35) return 5;
      if (ratio < 0.75) return 2.5;
      return 1;
    }
  }

  if (stopCount >= 1000) return 1.2;
  if (stopCount >= 100) return 0.8;
  return 0.5;
}

function estimateTripDelay(trip, avgStopDelayValue, fallbackTripDelay) {
  const explicitDelay =
    trip.delayMinutes ??
    trip.delay ??
    trip.averageDelay ??
    trip.simulatedDelay;

  if (explicitDelay !== undefined && explicitDelay !== null && explicitDelay !== "") {
    return toNumber(explicitDelay, 0);
  }

  const status = String(trip.status || "").toLowerCase();
  if (status === "delayed") return Math.max(fallbackTripDelay, avgStopDelayValue + 2);
  if (status === "completed") return Math.max(0, avgStopDelayValue - 0.5);
  if (status === "cancelled") return 0;
  if (status === "active" || status === "scheduled") return fallbackTripDelay;

  return fallbackTripDelay;
}

function estimateActiveTrips(trips = [], vehicles = []) {
  const explicitActiveTrips = trips.filter((t) => String(t.status || "").toLowerCase() === "active").length;
  if (explicitActiveTrips > 0) return explicitActiveTrips;

  if (trips.length > 0) {
    return Math.max(1, Math.round(trips.length * 0.3));
  }

  if (vehicles.length > 0) {
    return vehicles.filter((v) => String(v.status || "").toLowerCase() === "active").length || vehicles.length;
  }

  return 0;
}

export function useDashboardMetrics({
  stops = [],
  vehicles = [],
  trips = [],
}) {
  return useMemo(() => {
    const totalStops = stops.length;

    const totalPassengers = estimatePassengersFromStops(stops);

    const stopDelayValues = stops.map((stop) => estimateStopDelay(stop, totalStops));
    const avgStopDelayValue = stopDelayValues.length
      ? stopDelayValues.reduce((sum, value) => sum + value, 0) / stopDelayValues.length
      : 0;
    const avgStopDelay = avgStopDelayValue.toFixed(1);

    const explicitActiveVehicles = vehicles.filter(
      (v) => String(v.status || "").toLowerCase() === "active"
    ).length;
    const activeVehicles = explicitActiveVehicles > 0 ? explicitActiveVehicles : vehicles.length;

    const fallbackTripDelay =
      avgStopDelayValue > 0
        ? Number((avgStopDelayValue * 1.6).toFixed(1))
        : totalStops > 0
        ? 1.5
        : 0;

    const tripDelayValues = trips.map((trip) =>
      estimateTripDelay(trip, avgStopDelayValue, fallbackTripDelay)
    );

    const activeTrips = estimateActiveTrips(trips, vehicles);

    const delayedTrips = trips.length
      ? trips.filter((trip, index) => {
          const status = String(trip.status || "").toLowerCase();
          const delayValue = tripDelayValues[index] || 0;
          return status === "delayed" || delayValue > 1;
        }).length
      : activeTrips > 0
      ? Math.max(0, Math.round(activeTrips * 0.25))
      : 0;

    const completedTrips = trips.filter(
      (t) => String(t.status || "").toLowerCase() === "completed"
    ).length;

    const cancelledTrips = trips.filter(
      (t) => String(t.status || "").toLowerCase() === "cancelled"
    ).length;

    const scheduledTrips = trips.filter(
      (t) => String(t.status || "").toLowerCase() === "scheduled"
    ).length;

    const avgTripDelayValue = tripDelayValues.length
      ? tripDelayValues.reduce((sum, value) => sum + value, 0) / tripDelayValues.length
      : fallbackTripDelay;

    const avgTripDelay = avgTripDelayValue.toFixed(1);

    const totalTripsForRate = trips.length || activeTrips || scheduledTrips;
    const effectiveDelayedTrips = delayedTrips;
    const onTimeTripsCount =
      totalTripsForRate > 0 ? Math.max(0, totalTripsForRate - effectiveDelayedTrips - cancelledTrips) : 0;

    const onTimeRate =
      totalTripsForRate > 0
        ? clamp((onTimeTripsCount / totalTripsForRate) * 100, 0, 100).toFixed(1)
        : "100.0";

    const delayPerRoute = {};
    trips.forEach((trip, index) => {
      const routeId = trip.routeId || trip.route_id || "unknown-route";

      if (!delayPerRoute[routeId]) {
        delayPerRoute[routeId] = {
          totalDelay: 0,
          count: 0,
          routeCode:
            trip.routeCode ||
            trip.route_short_name ||
            routeId,
          routeName:
            trip.routeName ||
            trip.route_long_name ||
            trip.name ||
            "Route",
        };
      }

      delayPerRoute[routeId].totalDelay += tripDelayValues[index] || 0;
      delayPerRoute[routeId].count += 1;
    });

    let mostDelayedRoute = null;
    let highestAverage = -1;

    Object.entries(delayPerRoute).forEach(([routeId, data]) => {
      const average = data.count ? data.totalDelay / data.count : 0;
      if (average > highestAverage) {
        highestAverage = average;
        mostDelayedRoute = {
          routeId,
          routeCode: data.routeCode,
          routeName: data.routeName,
          averageDelay: average.toFixed(1),
        };
      }
    });

    if (!mostDelayedRoute && totalStops > 0) {
      mostDelayedRoute = {
        routeId: "network",
        routeCode: "NET",
        routeName: "Network Average",
        averageDelay: avgTripDelayValue.toFixed(1),
      };
    }

    return {
      totalStops,
      totalPassengers,
      avgStopDelay,
      avgStopDelayValue,
      activeVehicles,
      activeTrips,
      delayedTrips,
      completedTrips,
      cancelledTrips,
      scheduledTrips,
      avgTripDelay,
      avgTripDelayValue,
      onTimeRate,
      mostDelayedRoute,
    };
  }, [stops, vehicles, trips]);
}