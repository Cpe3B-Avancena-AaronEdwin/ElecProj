import StatCard from "./StatCard";

export default function DashboardStats({ metrics }) {
  return (
    <div className="dashboard-metrics-grid">
      <StatCard label="Total Stops" value={metrics.totalStops} />
      <StatCard label="Estimated Total Passengers" value={metrics.totalPassengers} />
      <StatCard label="Avg Stop Delay" value={`${metrics.avgStopDelay} mins`} />
      <StatCard label="Avg Trip Delay" value={`${metrics.avgTripDelay} mins`} />
      <StatCard label="Active Trips" value={metrics.activeTrips} />
      <StatCard label="Delayed Trips" value={metrics.delayedTrips} />
      <StatCard label="On-Time Rate" value={`${metrics.onTimeRate}%`} />
    </div>
  );
}