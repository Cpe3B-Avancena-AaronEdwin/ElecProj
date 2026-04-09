import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
<<<<<<< HEAD
import Layout from "../components/Layout";

const initialRouteForm = {
  routeCode: "",
  routeName: "",
  color: "#B8805A",
  active: true,
};

const initialStopForm = {
  stopName: "",
  latitude: "",
  longitude: "",
  routeId: "",
  simulatedDelay: "",
  simulatedPassengers: "",
};

const initialVehicleForm = {
  vehicleCode: "",
  plateNumber: "",
  routeId: "",
  status: "active",
};

const initialTripForm = {
  tripCode: "",
  routeId: "",
  vehicleId: "",
  departureTime: "",
  expectedArrival: "",
  actualArrival: "",
  status: "scheduled",
  delayMinutes: "",
  notes: "",
};
=======
import { useAdminData } from "../hooks/useAdminData";
import { useAdminForms } from "../hooks/useAdminForms";
import {
  removeRoute,
  removeStop,
  removeTrip,
  removeVehicle,
  saveRoute,
  saveStop,
  saveTrip,
  saveVehicle,
} from "../services/adminService";

import AdminHeader from "../components/admin/AdminHeader";
import AdminMessage from "../components/admin/AdminMessage";
import AdminSidebar from "../components/admin/AdminSidebar";
import RoutesTab from "../components/admin/tabs/RoutesTab";
import StopsTab from "../components/admin/tabs/StopsTab";
import VehiclesTab from "../components/admin/tabs/VehiclesTab";
import TripsTab from "../components/admin/tabs/TripsTab";
import {
  initialRouteForm,
  initialStopForm,
  initialTripForm,
  initialVehicleForm,
} from "../constants/adminInitialState";
>>>>>>> 93b213b76935f92a1872cb3d59cdf2d6d39ad806

export default function Admin() {
  const navigate = useNavigate();
  const { user, role } = useAuth();

  const [activeTab, setActiveTab] = useState("routes");

  const {
    routes,
    stops,
    vehicles,
    trips,
    loading,
    message,
    showMessage,
    routeMap,
    vehicleMap,
  } = useAdminData();

  const forms = useAdminForms(vehicles);

  const submitRoute = async (e) => {
    e.preventDefault();

    if (!forms.routeForm.routeCode.trim() || !forms.routeForm.routeName.trim()) {
      showMessage("Please fill in route code and route name.");
      return;
    }

    try {
      const text = await saveRoute({
        form: forms.routeForm,
        editingId: forms.editingRouteId,
        userId: user?.uid,
      });
      showMessage(text);
      forms.setRouteForm(initialRouteForm);
      forms.setEditingRouteId(null);
    } catch (error) {
      console.error("Route save error:", error);
      showMessage("Failed to save route.");
    }
  };

  const submitStop = async (e) => {
    e.preventDefault();

    if (
      !forms.stopForm.stopName.trim() ||
      !forms.stopForm.latitude ||
      !forms.stopForm.longitude ||
      !forms.stopForm.routeId
    ) {
      showMessage("Please fill in all stop fields.");
      return;
    }

    try {
      const text = await saveStop({
        form: forms.stopForm,
        editingId: forms.editingStopId,
        userId: user?.uid,
      });
      showMessage(text);
      forms.setStopForm(initialStopForm);
      forms.setEditingStopId(null);
    } catch (error) {
      console.error("Stop save error:", error);
      showMessage("Failed to save stop.");
    }
  };

  const submitVehicle = async (e) => {
    e.preventDefault();

    if (
      !forms.vehicleForm.vehicleCode.trim() ||
      !forms.vehicleForm.plateNumber.trim() ||
      !forms.vehicleForm.routeId ||
      !forms.vehicleForm.status
    ) {
      showMessage("Please fill in all vehicle fields.");
      return;
    }

    try {
      const text = await saveVehicle({
        form: forms.vehicleForm,
        editingId: forms.editingVehicleId,
        userId: user?.uid,
      });
      showMessage(text);
      forms.setVehicleForm(initialVehicleForm);
      forms.setEditingVehicleId(null);
    } catch (error) {
      console.error("Vehicle save error:", error);
      showMessage("Failed to save vehicle.");
    }
  };

  const submitTrip = async (e) => {
    e.preventDefault();

    if (
      !forms.tripForm.tripCode.trim() ||
      !forms.tripForm.routeId ||
      !forms.tripForm.vehicleId ||
      !forms.tripForm.departureTime ||
      !forms.tripForm.expectedArrival ||
      !forms.tripForm.status
    ) {
      showMessage("Please fill in required trip fields.");
      return;
    }

    try {
      const text = await saveTrip({
        form: forms.tripForm,
        editingId: forms.editingTripId,
        userId: user?.uid,
      });
      showMessage(text);
      forms.setTripForm(initialTripForm);
      forms.setEditingTripId(null);
    } catch (error) {
      console.error("Trip save error:", error);
      showMessage("Failed to save trip.");
    }
  };

<<<<<<< HEAD
  const editRoute = (route) => {
    setActiveTab("routes");
    setEditingRouteId(route.id);
    setRouteForm({
      routeCode: route.routeCode || "",
      routeName: route.routeName || "",
      color: route.color || "#B8805A",
      active: route.active ?? true,
    });
  };

  const editStop = (stop) => {
    setActiveTab("stops");
    setEditingStopId(stop.id);
    setStopForm({
      stopName: stop.stopName || "",
      latitude: stop.latitude ?? "",
      longitude: stop.longitude ?? "",
      routeId: stop.routeId || "",
      simulatedDelay: stop.simulatedDelay ?? "",
      simulatedPassengers: stop.simulatedPassengers ?? "",
    });
  };

  const editVehicle = (vehicle) => {
    setActiveTab("vehicles");
    setEditingVehicleId(vehicle.id);
    setVehicleForm({
      vehicleCode: vehicle.vehicleCode || "",
      plateNumber: vehicle.plateNumber || "",
      routeId: vehicle.routeId || "",
      status: vehicle.status || "active",
    });
  };

  const editTrip = (trip) => {
    setActiveTab("trips");
    setEditingTripId(trip.id);
    setTripForm({
      tripCode: trip.tripCode || "",
      routeId: trip.routeId || "",
      vehicleId: trip.vehicleId || "",
      departureTime: trip.departureTime || "",
      expectedArrival: trip.expectedArrival || "",
      actualArrival: trip.actualArrival || "",
      status: trip.status || "scheduled",
      delayMinutes: trip.delayMinutes ?? "",
      notes: trip.notes || "",
    });
  };

  const deleteRoute = async (id) => {
=======
  const handleDeleteRoute = async (id) => {
>>>>>>> 93b213b76935f92a1872cb3d59cdf2d6d39ad806
    const confirmed = window.confirm("Delete this route?");
    if (!confirmed) return;

    try {
      const text = await removeRoute(id);
      showMessage(text);
      if (forms.editingRouteId === id) {
        forms.cancelRouteEdit();
      }
    } catch (error) {
      console.error("Delete route error:", error);
      showMessage("Failed to delete route.");
    }
  };

  const handleDeleteStop = async (id) => {
    const confirmed = window.confirm("Delete this stop?");
    if (!confirmed) return;

    try {
      const text = await removeStop(id);
      showMessage(text);
      if (forms.editingStopId === id) {
        forms.cancelStopEdit();
      }
    } catch (error) {
      console.error("Delete stop error:", error);
      showMessage("Failed to delete stop.");
    }
  };

  const handleDeleteVehicle = async (id) => {
    const confirmed = window.confirm("Delete this vehicle?");
    if (!confirmed) return;

    try {
      const text = await removeVehicle(id);
      showMessage(text);
      if (forms.editingVehicleId === id) {
        forms.cancelVehicleEdit();
      }
    } catch (error) {
      console.error("Delete vehicle error:", error);
      showMessage("Failed to delete vehicle.");
    }
  };

  const handleDeleteTrip = async (id) => {
    const confirmed = window.confirm("Delete this trip?");
    if (!confirmed) return;

    try {
      const text = await removeTrip(id);
      showMessage(text);
      if (forms.editingTripId === id) {
        forms.cancelTripEdit();
      }
    } catch (error) {
      console.error("Delete trip error:", error);
      showMessage("Failed to delete trip.");
    }
  };

  const handleEditRoute = (route) => {
    setActiveTab("routes");
    forms.editRoute(route);
  };

  const handleEditStop = (stop) => {
    setActiveTab("stops");
    forms.editStop(stop);
  };

  const handleEditVehicle = (vehicle) => {
    setActiveTab("vehicles");
    forms.editVehicle(vehicle);
  };

  const handleEditTrip = (trip) => {
    setActiveTab("trips");
    forms.editTrip(trip);
  };

  return (
<<<<<<< HEAD
    <Layout>
      <div style={{ width: "100%", padding: "20px", boxSizing: "border-box" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "1rem",
            flexWrap: "wrap",
            marginBottom: "1.5rem",
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: "1.8rem", color: "#f8fafc" }}>Admin Panel</h2>
          </div>

          <button
            onClick={() => navigate("/dashboard")}
            style={{
              padding: "10px 16px",
              border: "none",
              borderRadius: "8px",
              background: "linear-gradient(90deg, rgba(34, 211, 238, 0.15) 0%, rgba(56, 189, 248, 0.1) 100%)",
              color: "var(--accent)",
              cursor: "pointer",
              fontWeight: "600",
              transition: "all 0.15s ease",
              borderColor: "rgba(34, 211, 238, 0.3)",
              border: "1px solid rgba(34, 211, 238, 0.3)",
            }}
          >
            ← Back to Dashboard
          </button>
        </div>

        {message && (
          <div
            style={{
              marginBottom: "1rem",
              background: "rgba(34, 211, 238, 0.1)",
              color: "#22d3ee",
              padding: "1rem",
              borderRadius: "8px",
              fontWeight: "500",
              border: "1px solid rgba(34, 211, 238, 0.2)",
            }}
          >
            {message}
          </div>
        )}

        <div className="admin-grid">
          <div className="panel" style={{ height: "fit-content" }}>
            <h3 style={{ marginTop: 0 }}>Management Tabs</h3>

            <TabButton
              label="Routes"
              active={activeTab === "routes"}
              onClick={() => setActiveTab("routes")}
            />
            <TabButton
              label="Stops"
              active={activeTab === "stops"}
              onClick={() => setActiveTab("stops")}
            />
            <TabButton
              label="Vehicles"
              active={activeTab === "vehicles"}
              onClick={() => setActiveTab("vehicles")}
            />
            <TabButton
              label="Trips"
              active={activeTab === "trips"}
              onClick={() => setActiveTab("trips")}
            />

            <div style={{ marginTop: "1.2rem", color: "#94a3b8", fontSize: "0.95rem" }}>
              <p style={{ marginBottom: "0.5rem" }}>Quick Stats</p>
              <p style={{ margin: "0.25rem 0" }}>Routes: {routes.length}</p>
              <p style={{ margin: "0.25rem 0" }}>Stops: {stops.length}</p>
              <p style={{ margin: "0.25rem 0" }}>Vehicles: {vehicles.length}</p>
              <p style={{ margin: "0.25rem 0" }}>Trips: {trips.length}</p>
            </div>
          </div>
=======
    <div
      style={{
        minHeight: "100vh",
        background: "#0f172a",
        color: "#e5e7eb",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: "1450px",
          margin: "0 auto",
          padding: "1.5rem",
        }}
      >
        <AdminHeader user={user} role={role} onBack={() => navigate("/dashboard")} />

        <AdminMessage message={message} />

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "260px 1fr",
            gap: "1.25rem",
          }}
        >
          <AdminSidebar
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            routesCount={routes.length}
            stopsCount={stops.length}
            vehiclesCount={vehicles.length}
            tripsCount={trips.length}
          />
>>>>>>> 93b213b76935f92a1872cb3d59cdf2d6d39ad806

          <div className="panel">
            {loading ? (
              <div style={{ padding: "1rem" }}>Loading data...</div>
            ) : (
              <>
                {activeTab === "routes" && (
<<<<<<< HEAD
                  <div>
                    <h2 style={{ marginTop: 0 }}>Routes Management</h2>

                    <form onSubmit={submitRoute} style={formCardStyle}>
                      <div style={formGridStyle}>
                        <div>
                          <label style={labelStyle}>Route Code</label>
                          <input
                            type="text"
                            name="routeCode"
                            value={routeForm.routeCode}
                            onChange={handleRouteChange}
                            placeholder="e.g. R-01"
                            style={inputStyle}
                          />
                        </div>

                        <div>
                          <label style={labelStyle}>Route Name</label>
                          <input
                            type="text"
                            name="routeName"
                            value={routeForm.routeName}
                            onChange={handleRouteChange}
                            placeholder="e.g. Manila to Makati"
                            style={inputStyle}
                          />
                        </div>

                        <div>
                          <label style={labelStyle}>Color</label>
                          <input
                            type="color"
                            name="color"
                            value={routeForm.color}
                            onChange={handleRouteChange}
                            style={{ ...inputStyle, padding: "0.25rem", height: "46px" }}
                          />
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                          <input
                            id="routeActive"
                            type="checkbox"
                            name="active"
                            checked={routeForm.active}
                            onChange={handleRouteChange}
                          />
                          <label htmlFor="routeActive" style={labelStyle}>
                            Active Route
                          </label>
                        </div>
                      </div>

                      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                        <button type="submit" style={primaryButtonStyle}>
                          {editingRouteId ? "Update Route" : "Add Route"}
                        </button>

                        {editingRouteId && (
                          <button
                            type="button"
                            onClick={cancelRouteEdit}
                            style={secondaryButtonStyle}
                          >
                            Cancel Edit
                          </button>
                        )}
                      </div>
                    </form>

                    <DataTable
                      headers={["Route Code", "Route Name", "Color", "Status", "Actions"]}
                      rows={routes.map((route) => [
                        route.routeCode || "-",
                        route.routeName || "-",
                        <div
                          key={`${route.id}-color`}
                          style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
                        >
                          <span
                            style={{
                              display: "inline-block",
                              width: "18px",
                              height: "18px",
                              borderRadius: "4px",
                              background: route.color || "#B8805A",
                              border: "1px solid #fff",
                            }}
                          />
                          {route.color || "-"}
                        </div>,
                        route.active ? "Active" : "Inactive",
                        <ActionButtons
                          key={`${route.id}-actions`}
                          onEdit={() => editRoute(route)}
                          onDelete={() => deleteRoute(route.id)}
                        />,
                      ])}
                      emptyText="No routes yet."
                    />
                  </div>
=======
                  <RoutesTab
                    routes={routes}
                    routeForm={forms.routeForm}
                    handleRouteChange={forms.handleRouteChange}
                    submitRoute={submitRoute}
                    editingRouteId={forms.editingRouteId}
                    cancelRouteEdit={forms.cancelRouteEdit}
                    onEditRoute={handleEditRoute}
                    onDeleteRoute={handleDeleteRoute}
                  />
>>>>>>> 93b213b76935f92a1872cb3d59cdf2d6d39ad806
                )}

                {activeTab === "stops" && (
                  <StopsTab
                    stops={stops}
                    routes={routes}
                    routeMap={routeMap}
                    stopForm={forms.stopForm}
                    handleStopChange={forms.handleStopChange}
                    submitStop={submitStop}
                    editingStopId={forms.editingStopId}
                    cancelStopEdit={forms.cancelStopEdit}
                    onEditStop={handleEditStop}
                    onDeleteStop={handleDeleteStop}
                  />
                )}

                {activeTab === "vehicles" && (
                  <VehiclesTab
                    vehicles={vehicles}
                    routes={routes}
                    routeMap={routeMap}
                    vehicleForm={forms.vehicleForm}
                    handleVehicleChange={forms.handleVehicleChange}
                    submitVehicle={submitVehicle}
                    editingVehicleId={forms.editingVehicleId}
                    cancelVehicleEdit={forms.cancelVehicleEdit}
                    onEditVehicle={handleEditVehicle}
                    onDeleteVehicle={handleDeleteVehicle}
                  />
                )}

                {activeTab === "trips" && (
                  <TripsTab
                    trips={trips}
                    routes={routes}
                    routeMap={routeMap}
                    vehicleMap={vehicleMap}
                    tripForm={forms.tripForm}
                    handleTripChange={forms.handleTripChange}
                    submitTrip={submitTrip}
                    editingTripId={forms.editingTripId}
                    cancelTripEdit={forms.cancelTripEdit}
                    filteredVehiclesForTrip={forms.filteredVehiclesForTrip}
                    onEditTrip={handleEditTrip}
                    onDeleteTrip={handleDeleteTrip}
                  />
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
<<<<<<< HEAD
}

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function TabButton({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: "100%",
        textAlign: "left",
        marginBottom: "0.75rem",
        padding: "0.9rem 1rem",
        borderRadius: "8px",
        border: active ? "1px solid rgba(34, 211, 238, 0.4)" : "1px solid rgba(34, 211, 238, 0.1)",
        cursor: "pointer",
        background: active ? "linear-gradient(90deg, rgba(34, 211, 238, 0.15) 0%, rgba(56, 189, 248, 0.1) 100%)" : "rgba(15, 23, 42, 0.6)",
        color: active ? "#22d3ee" : "#cbd5e1",
        fontWeight: active ? "600" : "500",
        transition: "all 0.15s ease",
      }}
    >
      {label}
    </button>
  );
}

function DataTable({ headers, rows, emptyText }) {
  return (
    <div
      style={{
        marginTop: "1rem",
        overflowX: "auto",
        background: "var(--bg-card)",
        borderRadius: "12px",
        border: "1px solid rgba(34, 211, 238, 0.1)",
      }}
    >
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          minWidth: "100%",
        }}
      >
        <thead>
          <tr style={{ background: "rgba(34, 211, 238, 0.05)", borderBottom: "1px solid rgba(34, 211, 238, 0.15)" }}>
            {headers.map((header) => (
              <th
                key={header}
                style={{
                  textAlign: "left",
                  padding: "1rem",
                  color: "#22d3ee",
                  fontWeight: "600",
                  fontSize: "0.9rem",
                }}
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={headers.length}
                style={{
                  padding: "1.5rem",
                  color: "#cbd5e1",
                  textAlign: "center",
                }}
              >
                {emptyText}
              </td>
            </tr>
          ) : (
            rows.map((row, index) => (
              <tr key={index} style={{ borderBottom: "1px solid rgba(34, 211, 238, 0.05)", transition: "background 0.15s ease" }}>
                {row.map((cell, cellIndex) => (
                  <td
                    key={cellIndex}
                    style={{
                      padding: "1rem",
                      color: "#cbd5e1",
                      verticalAlign: "middle",
                      fontSize: "0.9rem",
                    }}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function ActionButtons({ onEdit, onDelete }) {
  return (
    <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
      <button onClick={onEdit} style={smallEditButtonStyle}>
        Edit
      </button>
      <button onClick={onDelete} style={smallDeleteButtonStyle}>
        Delete
      </button>
    </div>
  );
}

const topButtonStyle = (background) => ({
  padding: "0.85rem 1.05rem",
  border: "1px solid rgba(34, 211, 238, 0.2)",
  borderRadius: "8px",
  background,
  color: "#181215",
  cursor: "pointer",
  fontWeight: "600",
  transition: "all 0.15s ease",
});

const formCardStyle = {
  background: "var(--bg-card)",
  border: "1px solid rgba(34, 211, 238, 0.1)",
  borderRadius: "12px",
  padding: "1.2rem",
  marginBottom: "1rem",
};

const formGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
  gap: "1rem",
  marginBottom: "1rem",
};

const labelStyle = {
  display: "block",
  marginBottom: "0.5rem",
  color: "#cbd5e1",
  fontWeight: "600",
  fontSize: "0.9rem",
};

const inputStyle = {
  width: "100%",
  padding: "0.8rem",
  borderRadius: "8px",
  border: "1px solid rgba(34, 211, 238, 0.15)",
  background: "rgba(15, 23, 42, 0.8)",
  color: "#f8fafc",
  boxSizing: "border-box",
  fontSize: "0.9rem",
  transition: "all 0.15s ease",
};

const primaryButtonStyle = {
  padding: "0.85rem 1.1rem",
  border: "1px solid rgba(34, 211, 238, 0.3)",
  borderRadius: "8px",
  background: "linear-gradient(90deg, rgba(34, 211, 238, 0.15) 0%, rgba(56, 189, 248, 0.1) 100%)",
  color: "#22d3ee",
  cursor: "pointer",
  fontWeight: "600",
  transition: "all 0.15s ease",
};

const secondaryButtonStyle = {
  padding: "0.85rem 1.1rem",
  border: "1px solid rgba(148, 163, 184, 0.2)",
  borderRadius: "8px",
  background: "rgba(148, 163, 184, 0.1)",
  color: "#cbd5e1",
  cursor: "pointer",
  fontWeight: "600",
  transition: "all 0.15s ease",
};

const smallEditButtonStyle = {
  padding: "0.5rem 0.8rem",
  border: "1px solid rgba(34, 211, 238, 0.3)",
  borderRadius: "6px",
  background: "rgba(34, 211, 238, 0.1)",
  color: "#22d3ee",
  cursor: "pointer",
  fontWeight: "600",
  fontSize: "0.85rem",
  transition: "all 0.15s ease",
};

const smallDeleteButtonStyle = {
  padding: "0.5rem 0.8rem",
  border: "1px solid rgba(239, 68, 68, 0.3)",
  borderRadius: "6px",
  background: "rgba(239, 68, 68, 0.1)",
  color: "#f87171",
  cursor: "pointer",
  fontWeight: "600",
  fontSize: "0.85rem",
  transition: "all 0.15s ease",
};
=======
}
>>>>>>> 93b213b76935f92a1872cb3d59cdf2d6d39ad806
