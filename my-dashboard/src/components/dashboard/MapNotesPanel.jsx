const panelStyle = {
  background: "var(--bg-card)",
  border: "1px solid var(--border)",
  borderRadius: "16px",
  padding: "1rem",
};

export default function MapNotesPanel() {
  return (
    <div style={panelStyle}>
      <h3 style={{ marginTop: 0, color: "var(--text-on-dark)" }}>Map Notes</h3>
      <div style={{ color: "var(--text-sub)", lineHeight: 1.7 }}>
        <div>• Bronze markers = route stops</div>
        <div>• Red markers = Firestore vehicles</div>
        <div>• Colored route lines = GTFS shapes or TomTom route lines</div>
        <div>• TomTom overlay = real traffic road colors</div>
        <div>• Sample dots = live traffic query points</div>
      </div>
    </div>
  );
}