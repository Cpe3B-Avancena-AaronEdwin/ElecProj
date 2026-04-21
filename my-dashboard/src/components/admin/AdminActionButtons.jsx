const smallEditButtonStyle = {
  padding: "0.6rem 0.85rem",
  border: "none",
  borderRadius: "8px",
  background: "#2563eb",
  color: "#fff",
  cursor: "pointer",
  fontWeight: "bold",
  minHeight: "40px",
};

const smallDeleteButtonStyle = {
  padding: "0.6rem 0.85rem",
  border: "none",
  borderRadius: "8px",
  background: "#ef4444",
  color: "#fff",
  cursor: "pointer",
  fontWeight: "bold",
  minHeight: "40px",
};

export default function AdminActionButtons({ onEdit, onDelete }) {
  return (
    <div className="admin-action-buttons">
      <button onClick={onEdit} style={smallEditButtonStyle}>
        Edit
      </button>
      <button onClick={onDelete} style={smallDeleteButtonStyle}>
        Delete
      </button>
    </div>
  );
}