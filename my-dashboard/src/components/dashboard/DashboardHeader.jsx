import { logoutUser } from "../../firebase/auth";

function buttonStyle(background) {
  return {
    padding: "1rem 1.4rem",
    border: "none",
    borderRadius: "16px",
    background,
    color: "var(--text-on-dark)",
    cursor: "pointer",
    fontWeight: "bold",
    fontSize: "1rem",
    minWidth: "120px",
    boxShadow: "0 8px 18px rgba(0,0,0,0.18)",
  };
}

export default function DashboardHeader({ user, role, onAdmin }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: "1.5rem",
        gap: "1rem",
        flexWrap: "wrap",
      }}
    >
      <div>
        <h1
          style={{
            fontSize: "4rem",
            lineHeight: 1,
            margin: 0,
            fontWeight: "800",
            color: "var(--text-on-dark)",
          }}
        >
          Smart Transit Dashboard
        </h1>

        <p
          style={{
            margin: "1rem 0 0.2rem",
            fontSize: "1.05rem",
            color: "var(--text-on-dark)",
          }}
        >
          Logged in as: <strong>{user?.email || "Unknown"}</strong>
        </p>

        <p
          style={{
            margin: 0,
            fontSize: "1.05rem",
            color: "var(--text-on-dark)",
          }}
        >
          Role: <strong>{role}</strong>
        </p>
      </div>

      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
        {role === "admin" && (
          <button onClick={onAdmin} style={buttonStyle("var(--accent)")}>
            Admin Panel
          </button>
        )}

        <button onClick={logoutUser} style={buttonStyle("#ef4444")}>
          Logout
        </button>
      </div>
    </div>
  );
}