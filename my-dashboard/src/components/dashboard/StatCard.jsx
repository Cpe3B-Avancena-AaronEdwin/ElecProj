export default function StatCard({ label, value }) {
  return (
    <div
      style={{
        padding: "1rem",
        borderRadius: "18px",
        minWidth: "220px",
        background: "#e5e7eb",
        color: "#111827",
        flex: "1 1 220px",
        textAlign: "center",
        boxShadow: "0 6px 18px rgba(0,0,0,0.12)",
      }}
    >
      <div style={{ fontSize: "1rem", color: "#4b5563", marginBottom: "0.6rem" }}>
        {label}
      </div>
      <div style={{ fontSize: "1.85rem", fontWeight: "bold" }}>{value}</div>
    </div>
  );
}