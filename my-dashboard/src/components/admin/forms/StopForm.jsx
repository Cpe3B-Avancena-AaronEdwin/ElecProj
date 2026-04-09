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

export default function StopForm({
  stopForm,
  handleStopChange,
  submitStop,
  editingStopId,
  cancelStopEdit,
  routes,
}) {
  return (
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
          <button type="button" onClick={cancelStopEdit} style={secondaryButtonStyle}>
            Cancel Edit
          </button>
        )}
      </div>
    </form>
  );
}