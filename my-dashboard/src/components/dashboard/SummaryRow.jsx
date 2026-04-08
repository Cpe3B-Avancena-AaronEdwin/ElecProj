export default function SummaryRow({ label, value }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: "1rem",
        padding: "0.55rem 0",
        borderBottom: "1px solid #1f2937",
        color: "#cbd5e1",
      }}
    >
      <span>{label}</span>
      <strong style={{ color: "#fff", textAlign: "right" }}>{value}</strong>
    </div>
  );
}