import { useMemo } from "react";

export function useDashboardMetrics({
  stops = [],
  vehicles = [],
  trips = [],
}) {
  return useMemo(() => {
    const totalPassengers = stops.reduce(
      (sum, stop) => sum + Number(stop.simulatedPassengers || stop.estimatedPassengers || 0),
      0
    );

    const avgStopDelay = stops.length
      ? (
          stops.reduce(
            (sum, stop) => sum + Number(stop.simulatedDelay || stop.averageDelay || 0),
            0
          ) / stops.length
        ).toFixed(1)
      : "0.0";

    const activeVehicles = vehicles.filter((v) => v.status === "active").length;
    const activeTrips = trips.filter((t) => t.status === "active").length;
    const delayedTrips = trips.filter(
      (t) => t.status === "delayed" || Number(t.delayMinutes || 0) > 0
    ).length;
    const completedTrips = trips.filter((t) => t.status === "completed").length;
    const cancelledTrips = trips.filter((t) => t.status === "cancelled").length;
    const scheduledTrips = trips.filter((t) => t.status === "scheduled").length;

    const avgTripDelayValue = trips.length
      ? trips.reduce((sum, trip) => sum + Number(trip.delayMinutes || 0), 0) / trips.length
      : 0;

    const avgTripDelay = avgTripDelayValue.toFixed(1);

    const onTimeTripsCount = trips.filter(
      (trip) => Number(trip.delayMinutes || 0) === 0 && trip.status !== "cancelled"
    ).length;

    const onTimeRate = trips.length
      ? ((onTimeTripsCount / trips.length) * 100).toFixed(1)
      : "100.0";

    const delayPerRoute = {};
    trips.forEach((trip) => {
      const routeId = trip.routeId || trip.route_id;
      if (!routeId) return;

      if (!delayPerRoute[routeId]) {
        delayPerRoute[routeId] = { totalDelay: 0, count: 0 };
      }

      delayPerRoute[routeId].totalDelay += Number(trip.delayMinutes || 0);
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
          routeCode: routeId,
          routeName: "Route",
          averageDelay: average.toFixed(1),
        };
      }
    });

    return {
      totalStops: stops.length,
      totalPassengers,
      avgStopDelay,
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