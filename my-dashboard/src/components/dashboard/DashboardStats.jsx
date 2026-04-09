import StatCard from "./StatCard";

export default function DashboardStats({ metrics }) {
  return (
    <div
      style={{
        display: "flex",
        gap: "1.25rem",
        marginBottom: "1.5rem",
        flexWrap: "wrap",
        alignItems: "stretch",
      }}
    >
      <StatCard label="Total Stops" value={metrics.totalStops} />
      <StatCard label="Total Passengers" value={metrics.totalPassengers} />
      <StatCard label="Avg Stop Delay" value={`${metrics.avgStopDelay} mins`} />
      <StatCard label="Avg Trip Delay" value={`${metrics.avgTripDelay} mins`} />
      <StatCard label="Active Vehicles" value={metrics.activeVehicles} />
      <StatCard label="Active Trips" value={metrics.activeTrips} />
      <StatCard label="Delayed Trips" value={metrics.delayedTrips} />
      <StatCard label="On-Time Rate" value={`${metrics.onTimeRate}%`} />
    </div>
  );
}