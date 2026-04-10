export default function SummaryRow({ label, value }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: "1rem",
        padding: "0.55rem 0",
        borderBottom: "1px solid var(--border)",
        color: "var(--text-sub)",
      }}
    >
      <span>{label}</span>
      <strong style={{ color: "var(--text-on-dark)", textAlign: "right" }}>{value}</strong>
    </div>
  );
}