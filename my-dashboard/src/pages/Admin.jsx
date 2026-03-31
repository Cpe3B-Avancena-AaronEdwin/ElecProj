import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "../firebase/config";
import { logoutUser } from "../firebase/auth";
import { useAuth } from "../context/AuthContext";

const initialRouteForm = {
  routeCode: "",
  routeName: "",
  color: "#2563eb",
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

export default function Admin() {
  const navigate = useNavigate();
  const { user, role } = useAuth();

  const [activeTab, setActiveTab] = useState("routes");

  const [routes, setRoutes] = useState([]);
  const [stops, setStops] = useState([]);
  const [vehicles, setVehicles] = useState([]);

  const [routeForm, setRouteForm] = useState(initialRouteForm);
  const [stopForm, setStopForm] = useState(initialStopForm);
  const [vehicleForm, setVehicleForm] = useState(initialVehicleForm);

  const [editingRouteId, setEditingRouteId] = useState(null);
  const [editingStopId, setEditingStopId] = useState(null);
  const [editingVehicleId, setEditingVehicleId] = useState(null);

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const routesQuery = query(collection(db, "routes"), orderBy("createdAt", "desc"));
    const stopsQuery = query(collection(db, "stops"), orderBy("createdAt", "desc"));
    const vehiclesQuery = query(collection(db, "vehicles"), orderBy("createdAt", "desc"));

    const unsubRoutes = onSnapshot(
      routesQuery,
      (snapshot) => {
        setRoutes(snapshot.docs.map((docItem) => ({ id: docItem.id, ...docItem.data() })));
        setLoading(false);
      },
      (error) => {
        console.error("Routes fetch error:", error);
        setLoading(false);
      }
    );

    const unsubStops = onSnapshot(
      stopsQuery,
      (snapshot) => {
        setStops(snapshot.docs.map((docItem) => ({ id: docItem.id, ...docItem.data() })));
      },
      (error) => {
        console.error("Stops fetch error:", error);
      }
    );

    const unsubVehicles = onSnapshot(
      vehiclesQuery,
      (snapshot) => {
        setVehicles(snapshot.docs.map((docItem) => ({ id: docItem.id, ...docItem.data() })));
      },
      (error) => {
        console.error("Vehicles fetch error:", error);
      }
    );

    return () => {
      unsubRoutes();
      unsubStops();
      unsubVehicles();
    };
  }, []);

  const routeMap = useMemo(() => {
    const map = {};
    routes.forEach((route) => {
      map[route.id] = route;
    });
    return map;
  }, [routes]);

  const showMessage = (text) => {
    setMessage(text);
    setTimeout(() => setMessage(""), 2500);
  };

  const handleRouteChange = (e) => {
    const { name, value, type, checked } = e.target;
    setRouteForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleStopChange = (e) => {
    const { name, value } = e.target;
    setStopForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleVehicleChange = (e) => {
    const { name, value } = e.target;
    setVehicleForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const submitRoute = async (e) => {
    e.preventDefault();

    if (!routeForm.routeCode.trim() || !routeForm.routeName.trim()) {
      showMessage("Please fill in route code and route name.");
      return;
    }

    const payload = {
      routeCode: routeForm.routeCode.trim(),
      routeName: routeForm.routeName.trim(),
      color: routeForm.color,
      active: routeForm.active,
      updatedAt: serverTimestamp(),
    };

    try {
      if (editingRouteId) {
        await updateDoc(doc(db, "routes", editingRouteId), payload);
        showMessage("Route updated successfully.");
      } else {
        await addDoc(collection(db, "routes"), {
          ...payload,
          createdAt: serverTimestamp(),
          createdBy: user?.uid || "",
        });
        showMessage("Route added successfully.");
      }

      setRouteForm(initialRouteForm);
      setEditingRouteId(null);
    } catch (error) {
      console.error("Route save error:", error);
      showMessage("Failed to save route.");
    }
  };

  const submitStop = async (e) => {
    e.preventDefault();

    if (
      !stopForm.stopName.trim() ||
      !stopForm.latitude ||
      !stopForm.longitude ||
      !stopForm.routeId
    ) {
      showMessage("Please fill in all stop fields.");
      return;
    }

    const payload = {
      stopName: stopForm.stopName.trim(),
      latitude: Number(stopForm.latitude),
      longitude: Number(stopForm.longitude),
      routeId: stopForm.routeId,
      simulatedDelay: Number(stopForm.simulatedDelay || 0),
      simulatedPassengers: Number(stopForm.simulatedPassengers || 0),
      updatedAt: serverTimestamp(),
    };

    try {
      if (editingStopId) {
        await updateDoc(doc(db, "stops", editingStopId), payload);
        showMessage("Stop updated successfully.");
      } else {
        await addDoc(collection(db, "stops"), {
          ...payload,
          createdAt: serverTimestamp(),
          createdBy: user?.uid || "",
        });
        showMessage("Stop added successfully.");
      }

      setStopForm(initialStopForm);
      setEditingStopId(null);
    } catch (error) {
      console.error("Stop save error:", error);
      showMessage("Failed to save stop.");
    }
  };

  const submitVehicle = async (e) => {
    e.preventDefault();

    if (
      !vehicleForm.vehicleCode.trim() ||
      !vehicleForm.plateNumber.trim() ||
      !vehicleForm.routeId ||
      !vehicleForm.status
    ) {
      showMessage("Please fill in all vehicle fields.");
      return;
    }

    const payload = {
      vehicleCode: vehicleForm.vehicleCode.trim(),
      plateNumber: vehicleForm.plateNumber.trim(),
      routeId: vehicleForm.routeId,
      status: vehicleForm.status,
      updatedAt: serverTimestamp(),
    };

    try {
      if (editingVehicleId) {
        await updateDoc(doc(db, "vehicles", editingVehicleId), payload);
        showMessage("Vehicle updated successfully.");
      } else {
        await addDoc(collection(db, "vehicles"), {
          ...payload,
          createdAt: serverTimestamp(),
          createdBy: user?.uid || "",
        });
        showMessage("Vehicle added successfully.");
      }

      setVehicleForm(initialVehicleForm);
      setEditingVehicleId(null);
    } catch (error) {
      console.error("Vehicle save error:", error);
      showMessage("Failed to save vehicle.");
    }
  };

  const editRoute = (route) => {
    setActiveTab("routes");
    setEditingRouteId(route.id);
    setRouteForm({
      routeCode: route.routeCode || "",
      routeName: route.routeName || "",
      color: route.color || "#2563eb",
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

  const deleteRoute = async (id) => {
    const confirmed = window.confirm("Delete this route?");
    if (!confirmed) return;

    try {
      await deleteDoc(doc(db, "routes", id));
      showMessage("Route deleted successfully.");
      if (editingRouteId === id) {
        setEditingRouteId(null);
        setRouteForm(initialRouteForm);
      }
    } catch (error) {
      console.error("Delete route error:", error);
      showMessage("Failed to delete route.");
    }
  };

  const deleteStop = async (id) => {
    const confirmed = window.confirm("Delete this stop?");
    if (!confirmed) return;

    try {
      await deleteDoc(doc(db, "stops", id));
      showMessage("Stop deleted successfully.");
      if (editingStopId === id) {
        setEditingStopId(null);
        setStopForm(initialStopForm);
      }
    } catch (error) {
      console.error("Delete stop error:", error);
      showMessage("Failed to delete stop.");
    }
  };

  const deleteVehicle = async (id) => {
    const confirmed = window.confirm("Delete this vehicle?");
    if (!confirmed) return;

    try {
      await deleteDoc(doc(db, "vehicles", id));
      showMessage("Vehicle deleted successfully.");
      if (editingVehicleId === id) {
        setEditingVehicleId(null);
        setVehicleForm(initialVehicleForm);
      }
    } catch (error) {
      console.error("Delete vehicle error:", error);
      showMessage("Failed to delete vehicle.");
    }
  };

  const cancelRouteEdit = () => {
    setEditingRouteId(null);
    setRouteForm(initialRouteForm);
  };

  const cancelStopEdit = () => {
    setEditingStopId(null);
    setStopForm(initialStopForm);
  };

  const cancelVehicleEdit = () => {
    setEditingVehicleId(null);
    setVehicleForm(initialVehicleForm);
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
          maxWidth: "1400px",
          margin: "0 auto",
          padding: "1.5rem",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: "1rem",
            flexWrap: "wrap",
            marginBottom: "1.5rem",
          }}
        >
          <div>
            <h1 style={{ margin: 0, fontSize: "2.2rem" }}>Admin Panel</h1>
            <p style={{ margin: "0.5rem 0 0", color: "#cbd5e1" }}>
              Logged in as: <strong>{user?.email || "Unknown"}</strong>
            </p>
            <p style={{ margin: "0.25rem 0 0", color: "#cbd5e1" }}>
              Role: <strong>{role}</strong>
            </p>
          </div>

          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            <button
              onClick={() => navigate("/dashboard")}
              style={topButtonStyle("#2563eb")}
            >
              Back to Dashboard
            </button>

            <button onClick={logoutUser} style={topButtonStyle("#ef4444")}>
              Logout
            </button>
          </div>
        </div>

        {message && (
          <div
            style={{
              marginBottom: "1rem",
              background: "#1d4ed8",
              color: "white",
              padding: "0.9rem 1rem",
              borderRadius: "10px",
              fontWeight: "bold",
            }}
          >
            {message}
          </div>
        )}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "260px 1fr",
            gap: "1.25rem",
          }}
        >
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

            <div style={{ marginTop: "1.2rem", color: "#94a3b8", fontSize: "0.95rem" }}>
              <p style={{ marginBottom: "0.5rem" }}>Quick Stats</p>
              <p style={{ margin: "0.25rem 0" }}>Routes: {routes.length}</p>
              <p style={{ margin: "0.25rem 0" }}>Stops: {stops.length}</p>
              <p style={{ margin: "0.25rem 0" }}>Vehicles: {vehicles.length}</p>
            </div>
          </div>

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
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem",
                          }}
                        >
                          <span
                            style={{
                              display: "inline-block",
                              width: "18px",
                              height: "18px",
                              borderRadius: "4px",
                              background: route.color || "#2563eb",
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
                )}

                {activeTab === "stops" && (
                  <div>
                    <h2 style={{ marginTop: 0 }}>Stops Management</h2>

                    <form onSubmit={submitStop} style={formCardStyle}>
                      <div style={formGridStyle}>
                        <div>
                          <label style={labelStyle}>Stop Name</label>
                          <input
                            type="text"
                            name="stopName"
                            value={stopForm.stopName}
                            onChange={handleStopChange}
                            placeholder="e.g. Buendia Station"
                            style={inputStyle}
                          />
                        </div>

                        <div>
                          <label style={labelStyle}>Latitude</label>
                          <input
                            type="number"
                            step="any"
                            name="latitude"
                            value={stopForm.latitude}
                            onChange={handleStopChange}
                            placeholder="e.g. 14.5547"
                            style={inputStyle}
                          />
                        </div>

                        <div>
                          <label style={labelStyle}>Longitude</label>
                          <input
                            type="number"
                            step="any"
                            name="longitude"
                            value={stopForm.longitude}
                            onChange={handleStopChange}
                            placeholder="e.g. 121.0244"
                            style={inputStyle}
                          />
                        </div>

                        <div>
                          <label style={labelStyle}>Assigned Route</label>
                          <select
                            name="routeId"
                            value={stopForm.routeId}
                            onChange={handleStopChange}
                            style={inputStyle}
                          >
                            <option value="">Select route</option>
                            {routes.map((route) => (
                              <option key={route.id} value={route.id}>
                                {route.routeCode} - {route.routeName}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label style={labelStyle}>Simulated Delay (mins)</label>
                          <input
                            type="number"
                            name="simulatedDelay"
                            value={stopForm.simulatedDelay}
                            onChange={handleStopChange}
                            placeholder="e.g. 5"
                            style={inputStyle}
                          />
                        </div>

                        <div>
                          <label style={labelStyle}>Simulated Passengers</label>
                          <input
                            type="number"
                            name="simulatedPassengers"
                            value={stopForm.simulatedPassengers}
                            onChange={handleStopChange}
                            placeholder="e.g. 60"
                            style={inputStyle}
                          />
                        </div>
                      </div>

                      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                        <button type="submit" style={primaryButtonStyle}>
                          {editingStopId ? "Update Stop" : "Add Stop"}
                        </button>

                        {editingStopId && (
                          <button
                            type="button"
                            onClick={cancelStopEdit}
                            style={secondaryButtonStyle}
                          >
                            Cancel Edit
                          </button>
                        )}
                      </div>
                    </form>

                    <DataTable
                      headers={[
                        "Stop Name",
                        "Latitude",
                        "Longitude",
                        "Route",
                        "Delay",
                        "Passengers",
                        "Actions",
                      ]}
                      rows={stops.map((stop) => [
                        stop.stopName || "-",
                        stop.latitude ?? "-",
                        stop.longitude ?? "-",
                        routeMap[stop.routeId]
                          ? `${routeMap[stop.routeId].routeCode} - ${routeMap[stop.routeId].routeName}`
                          : "Unassigned",
                        stop.simulatedDelay ?? 0,
                        stop.simulatedPassengers ?? 0,
                        <ActionButtons
                          key={`${stop.id}-actions`}
                          onEdit={() => editStop(stop)}
                          onDelete={() => deleteStop(stop.id)}
                        />,
                      ])}
                      emptyText="No stops yet."
                    />
                  </div>
                )}

                {activeTab === "vehicles" && (
                  <div>
                    <h2 style={{ marginTop: 0 }}>Vehicles Management</h2>

                    <form onSubmit={submitVehicle} style={formCardStyle}>
                      <div style={formGridStyle}>
                        <div>
                          <label style={labelStyle}>Vehicle Code</label>
                          <input
                            type="text"
                            name="vehicleCode"
                            value={vehicleForm.vehicleCode}
                            onChange={handleVehicleChange}
                            placeholder="e.g. BUS-01"
                            style={inputStyle}
                          />
                        </div>

                        <div>
                          <label style={labelStyle}>Plate Number</label>
                          <input
                            type="text"
                            name="plateNumber"
                            value={vehicleForm.plateNumber}
                            onChange={handleVehicleChange}
                            placeholder="e.g. ABC-1234"
                            style={inputStyle}
                          />
                        </div>

                        <div>
                          <label style={labelStyle}>Assigned Route</label>
                          <select
                            name="routeId"
                            value={vehicleForm.routeId}
                            onChange={handleVehicleChange}
                            style={inputStyle}
                          >
                            <option value="">Select route</option>
                            {routes.map((route) => (
                              <option key={route.id} value={route.id}>
                                {route.routeCode} - {route.routeName}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label style={labelStyle}>Status</label>
                          <select
                            name="status"
                            value={vehicleForm.status}
                            onChange={handleVehicleChange}
                            style={inputStyle}
                          >
                            <option value="active">active</option>
                            <option value="inactive">inactive</option>
                            <option value="delayed">delayed</option>
                            <option value="maintenance">maintenance</option>
                          </select>
                        </div>
                      </div>

                      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                        <button type="submit" style={primaryButtonStyle}>
                          {editingVehicleId ? "Update Vehicle" : "Add Vehicle"}
                        </button>

                        {editingVehicleId && (
                          <button
                            type="button"
                            onClick={cancelVehicleEdit}
                            style={secondaryButtonStyle}
                          >
                            Cancel Edit
                          </button>
                        )}
                      </div>
                    </form>

                    <DataTable
                      headers={["Vehicle Code", "Plate Number", "Route", "Status", "Actions"]}
                      rows={vehicles.map((vehicle) => [
                        vehicle.vehicleCode || "-",
                        vehicle.plateNumber || "-",
                        routeMap[vehicle.routeId]
                          ? `${routeMap[vehicle.routeId].routeCode} - ${routeMap[vehicle.routeId].routeName}`
                          : "Unassigned",
                        vehicle.status || "-",
                        <ActionButtons
                          key={`${vehicle.id}-actions`}
                          onEdit={() => editVehicle(vehicle)}
                          onDelete={() => deleteVehicle(vehicle.id)}
                        />,
                      ])}
                      emptyText="No vehicles yet."
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
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
        borderRadius: "12px",
        border: "none",
        cursor: "pointer",
        background: active ? "#2563eb" : "#1f2937",
        color: "#fff",
        fontWeight: "bold",
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
        background: "#0b1220",
        borderRadius: "14px",
        border: "1px solid #1f2937",
      }}
    >
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          minWidth: "900px",
        }}
      >
        <thead>
          <tr style={{ background: "#1f2937" }}>
            {headers.map((header) => (
              <th
                key={header}
                style={{
                  textAlign: "left",
                  padding: "0.95rem",
                  color: "#fff",
                  borderBottom: "1px solid #334155",
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
                  padding: "1rem",
                  color: "#cbd5e1",
                }}
              >
                {emptyText}
              </td>
            </tr>
          ) : (
            rows.map((row, index) => (
              <tr key={index} style={{ borderBottom: "1px solid #1f2937" }}>
                {row.map((cell, cellIndex) => (
                  <td
                    key={cellIndex}
                    style={{
                      padding: "0.95rem",
                      color: "#e5e7eb",
                      verticalAlign: "top",
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
  border: "none",
  borderRadius: "10px",
  background,
  color: "#fff",
  cursor: "pointer",
  fontWeight: "bold",
});

const formCardStyle = {
  background: "#0b1220",
  border: "1px solid #1f2937",
  borderRadius: "14px",
  padding: "1rem",
  marginBottom: "1rem",
};

const formGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: "1rem",
  marginBottom: "1rem",
};

const labelStyle = {
  display: "block",
  marginBottom: "0.45rem",
  color: "#cbd5e1",
  fontWeight: "bold",
};

const inputStyle = {
  width: "100%",
  padding: "0.8rem",
  borderRadius: "10px",
  border: "1px solid #334155",
  background: "#111827",
  color: "#fff",
  boxSizing: "border-box",
};

const primaryButtonStyle = {
  padding: "0.85rem 1.1rem",
  border: "none",
  borderRadius: "10px",
  background: "#2563eb",
  color: "#fff",
  cursor: "pointer",
  fontWeight: "bold",
};

const secondaryButtonStyle = {
  padding: "0.85rem 1.1rem",
  border: "none",
  borderRadius: "10px",
  background: "#475569",
  color: "#fff",
  cursor: "pointer",
  fontWeight: "bold",
};

const smallEditButtonStyle = {
  padding: "0.5rem 0.8rem",
  border: "none",
  borderRadius: "8px",
  background: "#2563eb",
  color: "#fff",
  cursor: "pointer",
  fontWeight: "bold",
};

const smallDeleteButtonStyle = {
  padding: "0.5rem 0.8rem",
  border: "none",
  borderRadius: "8px",
  background: "#ef4444",
  color: "#fff",
  cursor: "pointer",
  fontWeight: "bold",
};