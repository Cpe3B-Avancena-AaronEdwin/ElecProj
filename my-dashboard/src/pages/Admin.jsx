import { useState } from "react";
import { useNavigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useAdminData } from "../hooks/useAdminData";
import { useAdminForms } from "../hooks/useAdminForms";
import Layout from "../components/Layout";
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
import "../styles/admin.css";

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
      const result = await saveRoute({
        form: forms.routeForm,
        editingId: forms.editingRouteId,
        userId: user?.uid,
      });
      showMessage(result);
      forms.setRouteForm(initialRouteForm);
      forms.setEditingRouteId(null);
    } catch (error) {
      console.error("Failed to save route:", error);
      showMessage(error.message || "Failed to save route.");
    }
  };

  const submitStop = async (e) => {
    e.preventDefault();
    if (
      !forms.stopForm.stopName.trim() ||
      forms.stopForm.latitude === "" ||
      forms.stopForm.longitude === ""
    ) {
      showMessage("Please fill in stop name, latitude, and longitude.");
      return;
    }

    try {
      const result = await saveStop({
        form: forms.stopForm,
        editingId: forms.editingStopId,
        userId: user?.uid,
      });
      showMessage(result);
      forms.setStopForm(initialStopForm);
      forms.setEditingStopId(null);
    } catch (error) {
      console.error("Failed to save stop:", error);
      showMessage(error.message || "Failed to save stop.");
    }
  };

  const submitVehicle = async (e) => {
    e.preventDefault();
    if (
      !forms.vehicleForm.vehicleCode.trim() ||
      !forms.vehicleForm.plateNumber.trim()
    ) {
      showMessage("Please fill in vehicle code and plate number.");
      return;
    }

    try {
      const result = await saveVehicle({
        form: forms.vehicleForm,
        editingId: forms.editingVehicleId,
        userId: user?.uid,
      });
      showMessage(result);
      forms.setVehicleForm(initialVehicleForm);
      forms.setEditingVehicleId(null);
    } catch (error) {
      console.error("Failed to save vehicle:", error);
      showMessage(error.message || "Failed to save vehicle.");
    }
  };

  const submitTrip = async (e) => {
    e.preventDefault();
    if (
      !forms.tripForm.tripCode.trim() ||
      !forms.tripForm.routeId ||
      !forms.tripForm.vehicleId ||
      !forms.tripForm.departureTime ||
      !forms.tripForm.expectedArrival
    ) {
      showMessage(
        "Please fill in trip code, route, vehicle, departure time, and expected arrival."
      );
      return;
    }

    try {
      const result = await saveTrip({
        form: forms.tripForm,
        editingId: forms.editingTripId,
        userId: user?.uid,
      });
      showMessage(result);
      forms.setTripForm(initialTripForm);
      forms.setEditingTripId(null);
    } catch (error) {
      console.error("Failed to save trip:", error);
      showMessage(error.message || "Failed to save trip.");
    }
  };

  const handleDeleteRoute = async (id) => {
    if (!window.confirm("Delete this route?")) return;
    try {
      const result = await removeRoute(id);
      showMessage(result);
    } catch (error) {
      console.error("Failed to delete route:", error);
      showMessage(error.message || "Failed to delete route.");
    }
  };

  const handleDeleteStop = async (id) => {
    if (!window.confirm("Delete this stop?")) return;
    try {
      const result = await removeStop(id);
      showMessage(result);
    } catch (error) {
      console.error("Failed to delete stop:", error);
      showMessage(error.message || "Failed to delete stop.");
    }
  };

  const handleDeleteVehicle = async (id) => {
    if (!window.confirm("Delete this vehicle?")) return;
    try {
      const result = await removeVehicle(id);
      showMessage(result);
    } catch (error) {
      console.error("Failed to delete vehicle:", error);
      showMessage(error.message || "Failed to delete vehicle.");
    }
  };

  const handleDeleteTrip = async (id) => {
    if (!window.confirm("Delete this trip?")) return;
    try {
      const result = await removeTrip(id);
      showMessage(result);
    } catch (error) {
      console.error("Failed to delete trip:", error);
      showMessage(error.message || "Failed to delete trip.");
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
    <Layout>
      <div className="admin-page-shell">
        <div className="admin-page-container">
          <AdminHeader
            user={user}
            role={role}
            onBack={() => navigate("/dashboard")}
          />

          <AdminMessage message={message} />

          <Outlet />

          <div className="admin-layout">
            <div className="admin-sidebar-wrap">
              <AdminSidebar
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                routesCount={routes.length}
                stopsCount={stops.length}
                vehiclesCount={vehicles.length}
                tripsCount={trips.length}
              />
            </div>

            <div className="admin-content-card">
              {loading ? (
                <div className="admin-loading-state">Loading data...</div>
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
    </Layout>
  );
}