const smallEditButtonStyle = {
  padding: "0.5rem 0.8rem",
  border: "none",
  borderRadius: "8px",
  background: "#2563eb",
  color: "#fff",
  cursor: "pointer",
  fontWeight: "bold",
};

const smallDeleteButtonStyle = {
  padding: "0.5rem 0.8rem",
  border: "none",
  borderRadius: "8px",
  background: "#ef4444",
  color: "#fff",
  cursor: "pointer",
  fontWeight: "bold",
};

export default function AdminActionButtons({ onEdit, onDelete }) {
  return (
    <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
      <button onClick={onEdit} style={smallEditButtonStyle}>
        Edit
      </button>
      <button onClick={onDelete} style={smallDeleteButtonStyle}>
        Delete
      </button>
    </div>
  );
}