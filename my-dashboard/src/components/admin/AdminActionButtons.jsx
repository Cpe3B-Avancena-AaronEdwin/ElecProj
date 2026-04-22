const smallEditButtonStyle = {
  padding: "0.6rem 0.85rem",
  borderRadius: "10px",
  border: "1px solid rgba(34, 211, 238, 0.35)",
  background: "rgba(34, 211, 238, 0.16)",
  color: "#eafcff",
  cursor: "pointer",
  fontWeight: "700",
  minHeight: "40px",
  backdropFilter: "blur(8px)",
  WebkitBackdropFilter: "blur(8px)",
  boxShadow: "0 0 8px rgba(34, 211, 238, 0.12)",
  transition: "all 0.2s ease",
};

const smallDeleteButtonStyle = {
  padding: "0.6rem 0.85rem",
  borderRadius: "10px",
  border: "1px solid rgba(248, 113, 113, 0.35)",
  background: "rgba(239, 68, 68, 0.16)",
  color: "#ffeaea",
  cursor: "pointer",
  fontWeight: "700",
  minHeight: "40px",
  backdropFilter: "blur(8px)",
  WebkitBackdropFilter: "blur(8px)",
  boxShadow: "0 0 8px rgba(239, 68, 68, 0.12)",
  transition: "all 0.2s ease",
};

export default function AdminActionButtons({ onEdit, onDelete }) {
  return (
    <div className="admin-action-buttons">
      <button
        onClick={onEdit}
        style={smallEditButtonStyle}
        onMouseEnter={(e) =>
          (e.currentTarget.style.background = "rgba(34, 211, 238, 0.26)")
        }
        onMouseLeave={(e) =>
          (e.currentTarget.style.background = "rgba(34, 211, 238, 0.16)")
        }
      >
        Edit
      </button>

      <button
        onClick={onDelete}
        style={smallDeleteButtonStyle}
        onMouseEnter={(e) =>
          (e.currentTarget.style.background = "rgba(239, 68, 68, 0.26)")
        }
        onMouseLeave={(e) =>
          (e.currentTarget.style.background = "rgba(239, 68, 68, 0.16)")
        }
      >
        Delete
      </button>
    </div>
  );
}