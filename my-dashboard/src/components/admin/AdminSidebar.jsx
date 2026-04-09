import AdminTabButton from "./AdminTabButton";

export default function AdminSidebar({
  activeTab,
  setActiveTab,
  routesCount,
  stopsCount,
  vehiclesCount,
  tripsCount,
}) {
  return (
    <div
      style={{
        background: "#111827",
        borderRadius: "16px",
        padding: "1rem",
        border: "1px solid #1f2937",
        height: "fit-content",
      }}
    >
      <h3 style={{ marginTop: 0 }}>Management Tabs</h3>

      <AdminTabButton
        label="Routes"
        active={activeTab === "routes"}
        onClick={() => setActiveTab("routes")}
      />
      <AdminTabButton
        label="Stops"
        active={activeTab === "stops"}
        onClick={() => setActiveTab("stops")}
      />
      <AdminTabButton
        label="Vehicles"
        active={activeTab === "vehicles"}
        onClick={() => setActiveTab("vehicles")}
      />
      <AdminTabButton
        label="Trips"
        active={activeTab === "trips"}
        onClick={() => setActiveTab("trips")}
      />

      <div style={{ marginTop: "1.2rem", color: "#94a3b8", fontSize: "0.95rem" }}>
        <p style={{ marginBottom: "0.5rem" }}>Quick Stats</p>
        <p style={{ margin: "0.25rem 0" }}>Routes: {routesCount}</p>
        <p style={{ margin: "0.25rem 0" }}>Stops: {stopsCount}</p>
        <p style={{ margin: "0.25rem 0" }}>Vehicles: {vehiclesCount}</p>
        <p style={{ margin: "0.25rem 0" }}>Trips: {tripsCount}</p>
      </div>
    </div>
  );
}