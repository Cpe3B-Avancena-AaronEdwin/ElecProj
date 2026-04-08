export function formatTimestamp(ts, fallbackText) {
  if (ts?.seconds) {
    return new Date(ts.seconds * 1000).toLocaleString();
  }

  if (fallbackText) {
    const d = new Date(fallbackText);
    if (!isNaN(d)) return d.toLocaleString();
    return fallbackText;
  }

  return "-";
}

export function getTripTimingLabel(trip) {
  const now = new Date();

  const departure = trip.departureTime
    ? new Date(trip.departureTime)
    : null;

  const expected = trip.expectedArrival
    ? new Date(trip.expectedArrival)
    : null;

  if (trip.status === "cancelled") return "Cancelled";

  if (trip.status === "completed") return "Completed";

  if (trip.status === "delayed")
    return `Delayed ${trip.delayMinutes || 0} mins`;

  if (departure && departure > now)
    return `Departs ${departure.toLocaleString()}`;

  if (expected) {
    const diff = Math.round((expected - now) / 60000);
    if (diff > 0) return `ETA ${diff} mins`;
    return "Arriving";
  }

  return "No ETA";
}