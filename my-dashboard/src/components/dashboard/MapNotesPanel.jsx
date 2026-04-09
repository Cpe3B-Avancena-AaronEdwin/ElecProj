const panelStyle = {
  background: "#111827",
  border: "1px solid #1f2937",
  borderRadius: "16px",
  padding: "1rem",
};

export default function MapNotesPanel() {
  return (
    <div style={panelStyle}>
      <h3 style={{ marginTop: 0, color: "#fff" }}>Map Notes</h3>
      <div style={{ color: "#cbd5e1", lineHeight: 1.7 }}>
        <div>• Blue markers = route stops</div>
        <div>• Red markers = Firestore vehicles</div>
        <div>• Colored route lines = GTFS shapes or TomTom route lines</div>
        <div>• TomTom overlay = real traffic road colors</div>
        <div>• Sample dots = live traffic query points</div>
      </div>
    </div>
  );
}