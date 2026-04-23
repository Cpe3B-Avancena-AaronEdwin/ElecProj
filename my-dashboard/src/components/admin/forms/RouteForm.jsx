const ROUTE_COLORS = [
  { label: "Primary", value: "#2563eb" },
  { label: "Secondary", value: "#22d3ee" },
  { label: "Express", value: "#a855f7" },
  { label: "Feeder", value: "#22c55e" },
  { label: "Special", value: "#f97316" },
  { label: "Inactive", value: "#64748b" },
];

const formCardStyle = {
  background: "#071a2b", // 👈 darker solid blue
  border: "1px solid rgba(34, 211, 238, 0.25)",
  borderRadius: "18px",
  padding: "1rem",
  marginBottom: "1rem",
  boxShadow: "0 0 20px rgba(34, 211, 238, 0.08)",
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
  color: "#e6f7ff",
  fontWeight: "700",
};

const inputStyle = {
  width: "100%",
  padding: "0.8rem",
  borderRadius: "10px",
  border: "1px solid rgba(34, 211, 238, 0.2)",
  background: "rgba(15, 23, 42, 0.78)",
  color: "#fff",
  boxSizing: "border-box",
};

const primaryButtonStyle = {
  padding: "0.85rem 1.1rem",
  borderRadius: "10px",
  border: "1px solid rgba(34, 211, 238, 0.35)",
  background: "rgba(34, 211, 238, 0.18)",
  color: "#fff",
  cursor: "pointer",
  fontWeight: "700",
};

const secondaryButtonStyle = {
  padding: "0.85rem 1.1rem",
  borderRadius: "10px",
  border: "1px solid rgba(148, 163, 184, 0.3)",
  background: "rgba(71, 85, 105, 0.45)",
  color: "#fff",
  cursor: "pointer",
  fontWeight: "700",
};

function getSelectedColorLabel(colorValue) {
  const match = ROUTE_COLORS.find(
    (color) => color.value.toLowerCase() === String(colorValue || "").toLowerCase()
  );
  return match ? match.label : "Primary";
}

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
          <label style={labelStyle}>Color Class</label>
          <select
            name="color"
            value={routeForm.color || "#2563eb"}
            onChange={handleRouteChange}
            style={inputStyle}
          >
            {ROUTE_COLORS.map((color) => (
              <option key={color.value} value={color.value}>
                {color.label}
              </option>
            ))}
          </select>

          <div
            style={{
              marginTop: "0.55rem",
              display: "flex",
              alignItems: "center",
              gap: "0.55rem",
              color: "#cfeef6",
              fontSize: "0.95rem",
            }}
          >
            <span
              style={{
                width: "16px",
                height: "16px",
                borderRadius: "4px",
                background: routeForm.color || "#2563eb",
                border: "1px solid rgba(255,255,255,0.75)",
                display: "inline-block",
              }}
            />
            <span>{getSelectedColorLabel(routeForm.color || "#2563eb")}</span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <input
            id="routeActive"
            type="checkbox"
            name="active"
            checked={routeForm.active}
            onChange={handleRouteChange}
          />
          <label htmlFor="routeActive" style={{ ...labelStyle, marginBottom: 0 }}>
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
  );
}