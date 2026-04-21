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
    <div className="admin-sidebar-card">
      <h3 className="admin-sidebar-title">Management Tabs</h3>

      <div className="admin-sidebar-tabs">
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
      </div>

      <div className="admin-sidebar-stats">
        <p className="admin-sidebar-stats-title">Quick Stats</p>
        <p>Routes: {routesCount}</p>
        <p>Stops: {stopsCount}</p>
        <p>Vehicles: {vehiclesCount}</p>
        <p>Trips: {tripsCount}</p>
      </div>
    </div>
  );
}