import { logoutUser } from "../../firebase/auth";

const topButtonStyle = (background) => ({
  padding: "0.85rem 1.05rem",
  border: "none",
  borderRadius: "10px",
  background,
  color: "#fff",
  cursor: "pointer",
  fontWeight: "bold",
});

export default function AdminHeader({ user, role, onBack }) {
  return (
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
        <button onClick={onBack} style={topButtonStyle("#2563eb")}>
          Back to Dashboard
        </button>

        <button onClick={logoutUser} style={topButtonStyle("#ef4444")}>
          Logout
        </button>
      </div>
    </div>
  );
}