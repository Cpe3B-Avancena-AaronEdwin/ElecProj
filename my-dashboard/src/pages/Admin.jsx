import { useState } from "react";
import { useNavigate, Outlet } from "react-router-dom"; // ✅ add Outlet
import { useAuth } from "../context/AuthContext";
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

  // 🔹 Submit handlers (same as your original)
  const submitRoute = async (e) => { /* ... keep your existing logic ... */ };
  const submitStop = async (e) => { /* ... keep your existing logic ... */ };
  const submitVehicle = async (e) => { /* ... keep your existing logic ... */ };
  const submitTrip = async (e) => { /* ... keep your existing logic ... */ };

  // 🔹 Delete handlers (same as your original)
  const handleDeleteRoute = async (id) => { /* ... */ };
  const handleDeleteStop = async (id) => { /* ... */ };
  const handleDeleteVehicle = async (id) => { /* ... */ };
  const handleDeleteTrip = async (id) => { /* ... */ };

  // 🔹 Edit handlers (same as your original)
  const handleEditRoute = (route) => { setActiveTab("routes"); forms.editRoute(route); };
  const handleEditStop = (stop) => { setActiveTab("stops"); forms.editStop(stop); };
  const handleEditVehicle = (vehicle) => { setActiveTab("vehicles"); forms.editVehicle(vehicle); };
  const handleEditTrip = (trip) => { setActiveTab("trips"); forms.editTrip(trip); };

  return (
    <div style={{ minHeight: "100vh", background: "#0f172a", color: "#e5e7eb" }}>
      <div style={{ maxWidth: "1450px", margin: "0 auto", padding: "1.5rem" }}>
        <AdminHeader user={user} role={role} onBack={() => navigate("/dashboard")} />
        <AdminMessage message={message} />

        {/* 🔹 Nested routes will render here */}
        <Outlet />

        {/* 🔹 Default Admin dashboard with tabs */}
        <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: "1.25rem" }}>
          <AdminSidebar
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            routesCount={routes.length}
            stopsCount={stops.length}
            vehiclesCount={vehicles.length}
            tripsCount={trips.length}
          />

          <div style={{ background: "#111827", borderRadius: "16px", padding: "1rem" }}>
            {loading ? (
              <div style={{ padding: "1rem" }}>Loading data...</div>
            ) : (
              <>
                {activeTab === "routes" && (
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
    </div>
  );
}