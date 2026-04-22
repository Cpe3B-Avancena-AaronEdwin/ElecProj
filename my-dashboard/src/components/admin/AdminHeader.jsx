const topButtonStyle = (type = "primary") => ({
  padding: "0.85rem 1.05rem",
  borderRadius: "12px",
  border: "1px solid rgba(34, 211, 238, 0.35)",
  background: "rgba(34, 211, 238, 0.18)",
  color: "#eafcff",
  cursor: "pointer",
  fontWeight: "700",
  minHeight: "44px",
  backdropFilter: "blur(8px)",
  WebkitBackdropFilter: "blur(8px)",
  boxShadow: "0 0 10px rgba(34, 211, 238, 0.15)",
  transition: "all 0.2s ease",
});

export default function AdminHeader({ user, role, onBack }) {
  return (
    <div
      style={{
        marginBottom: "1.25rem",
        padding: "1.5rem 1.75rem",
        borderRadius: "22px",
        background: "#071a2b",
        border: "1px solid rgba(34, 211, 238, 0.22)",
        boxShadow: "0 10px 30px rgba(0, 0, 0, 0.18)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: "1rem",
          flexWrap: "wrap",
        }}
      >
        <div style={{ minWidth: 0, flex: "1 1 420px" }}>
          <h1
            style={{
              margin: 0,
              color: "#e6fcff",
              fontSize: "4rem",
              lineHeight: 1,
              fontWeight: 800,
              letterSpacing: "-0.03em",
            }}
          >
            Admin Panel
          </h1>

          <p
            style={{
              margin: "1rem 0 0",
              color: "rgba(230, 252, 255, 0.82)",
              fontSize: "1rem",
              wordBreak: "break-word",
            }}
          >
            Logged in as: <strong>{user?.email || "Unknown"}</strong>
          </p>

          <p
            style={{
              margin: "0.35rem 0 0",
              color: "rgba(230, 252, 255, 0.82)",
              fontSize: "1rem",
            }}
          >
            Role: <strong>{role}</strong>
          </p>
        </div>

        <div
          style={{
            display: "flex",
            gap: "0.75rem",
            flexWrap: "wrap",
            alignItems: "stretch",
            paddingTop: "0.15rem",
          }}
        >
          <button onClick={onBack} style={topButtonStyle()}>
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}