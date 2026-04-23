export default function RoutingStatusPanel({ routes = [], error }) {
  return (
    <div
      className="panel"
      style={{
        background: "rgba(34, 211, 238, 0.12)",
        border: "1px solid rgba(34, 211, 238, 0.38)",
        borderRadius: "18px",
        padding: "1.2rem",
        boxShadow: "0 0 16px rgba(34, 211, 238, 0.12)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
      }}
    >
      <h3 style={{ color: "#e6fcff", marginTop: 0, marginBottom: "0.8rem" }}>
        Routing Status
      </h3>

      {error ? (
        <p style={{ color: "#fecaca", margin: 0 }}>{error}</p>
      ) : (
        <div style={{ color: "rgba(230, 252, 255, 0.78)", lineHeight: 1.7 }}>
          <div>Total Route Paths: {routes.length}</div>
          <div>
            Status: {routes.length > 0 ? "Route lines ready" : "No route lines yet"}
          </div>
        </div>
      )}
    </div>
  );
}