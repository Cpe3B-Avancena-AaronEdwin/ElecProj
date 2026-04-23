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

export default function RouteForm({
  routeForm,
  handleRouteChange,
  submitRoute,
  editingRouteId,
  cancelRouteEdit,
}) {
  return (
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
          <button type="button" onClick={cancelRouteEdit} style={secondaryButtonStyle}>
            Cancel Edit
          </button>
        )}
      </div>
    </form>
  );
}