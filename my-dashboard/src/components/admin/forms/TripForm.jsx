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

export default function TripForm({
  tripForm,
  handleTripChange,
  submitTrip,
  editingTripId,
  cancelTripEdit,
  routes,
  filteredVehiclesForTrip,
}) {
  return (
    <form onSubmit={submitTrip} style={formCardStyle}>
      <div style={formGridStyle}>
        <div>
          <label style={labelStyle}>Trip Code</label>
          <input
            type="text"
            name="tripCode"
            value={tripForm.tripCode}
            onChange={handleTripChange}
            placeholder="e.g. TRIP-001"
            style={inputStyle}
          />
        </div>

        <div>
          <label style={labelStyle}>Route</label>
          <select
            name="routeId"
            value={tripForm.routeId}
            onChange={handleTripChange}
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
          <label style={labelStyle}>Vehicle</label>
          <select
            name="vehicleId"
            value={tripForm.vehicleId}
            onChange={handleTripChange}
            style={inputStyle}
          >
            <option value="">Select vehicle</option>
            {filteredVehiclesForTrip.map((vehicle) => (
              <option key={vehicle.id} value={vehicle.id}>
                {vehicle.vehicleCode} - {vehicle.plateNumber}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label style={labelStyle}>Departure Time</label>
          <input
            type="datetime-local"
            name="departureTime"
            value={tripForm.departureTime}
            onChange={handleTripChange}
            style={inputStyle}
          />
        </div>

        <div>
          <label style={labelStyle}>Expected Arrival</label>
          <input
            type="datetime-local"
            name="expectedArrival"
            value={tripForm.expectedArrival}
            onChange={handleTripChange}
            style={inputStyle}
          />
        </div>

        <div>
          <label style={labelStyle}>Actual Arrival</label>
          <input
            type="datetime-local"
            name="actualArrival"
            value={tripForm.actualArrival}
            onChange={handleTripChange}
            style={inputStyle}
          />
        </div>

        <div>
          <label style={labelStyle}>Status</label>
          <select
            name="status"
            value={tripForm.status}
            onChange={handleTripChange}
            style={inputStyle}
          >
            <option value="scheduled">scheduled</option>
            <option value="active">active</option>
            <option value="delayed">delayed</option>
            <option value="completed">completed</option>
            <option value="cancelled">cancelled</option>
          </select>
        </div>

        <div>
          <label style={labelStyle}>Delay Minutes</label>
          <input
            type="number"
            name="delayMinutes"
            value={tripForm.delayMinutes}
            onChange={handleTripChange}
            placeholder="e.g. 10"
            style={inputStyle}
          />
        </div>

        <div style={{ gridColumn: "1 / -1" }}>
          <label style={labelStyle}>Notes</label>
          <textarea
            name="notes"
            value={tripForm.notes}
            onChange={handleTripChange}
            placeholder="Trip notes"
            style={{ ...inputStyle, minHeight: "90px", resize: "vertical" }}
          />
        </div>
      </div>

      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
        <button type="submit" style={primaryButtonStyle}>
          {editingTripId ? "Update Trip" : "Add Trip"}
        </button>

        {editingTripId && (
          <button type="button" onClick={cancelTripEdit} style={secondaryButtonStyle}>
            Cancel Edit
          </button>
        )}
      </div>
    </form>
  );
}