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

export default function VehicleForm({
  vehicleForm,
  handleVehicleChange,
  submitVehicle,
  editingVehicleId,
  cancelVehicleEdit,
  routes,
}) {
  return (
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
          <button type="button" onClick={cancelVehicleEdit} style={secondaryButtonStyle}>
            Cancel Edit
          </button>
        )}
      </div>
    </form>
  );
}