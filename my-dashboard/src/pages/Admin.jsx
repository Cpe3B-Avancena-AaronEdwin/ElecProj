import { useState } from "react";
import { useNavigate } from "react-router-dom";
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

  const handleDeleteRoute = async (id) => {
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

          <div
            style={{
              background: "#111827",
              borderRadius: "16px",
              padding: "1rem",
              border: "1px solid #1f2937",
            }}
          >
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