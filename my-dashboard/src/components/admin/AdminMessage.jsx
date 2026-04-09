export default function AdminMessage({ message }) {
  if (!message) return null;

  return (
    <div
      style={{
        marginBottom: "1rem",
        background: "#1d4ed8",
        color: "white",
        padding: "0.9rem 1rem",
        borderRadius: "10px",
        fontWeight: "bold",
      }}
    >
      {message}
    </div>
  );
}