export default function AdminTabButton({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: "100%",
        textAlign: "left",
        marginBottom: "0.75rem",
        padding: "0.9rem 1rem",
        borderRadius: "14px",
        cursor: "pointer",
        fontWeight: "700",

        /* CYAN GLASS STYLE */
        border: active
          ? "1px solid rgba(34, 211, 238, 0.5)"
          : "1px solid rgba(34, 211, 238, 0.2)",

        background: active
          ? "rgba(34, 211, 238, 0.22)"
          : "rgba(34, 211, 238, 0.10)",

        color: "#eafcff",

        boxShadow: active
          ? "0 0 14px rgba(34, 211, 238, 0.12)"
          : "none",

        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",

        transition: "all 0.2s ease",
      }}
      onMouseEnter={(e) => {
        if (!active) {
          e.currentTarget.style.background = "rgba(34, 211, 238, 0.16)";
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          e.currentTarget.style.background = "rgba(34, 211, 238, 0.10)";
        }
      }}
    >
      {label}
    </button>
  );
}