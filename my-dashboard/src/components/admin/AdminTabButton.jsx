export default function AdminTabButton({ label, active, onClick }) {
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