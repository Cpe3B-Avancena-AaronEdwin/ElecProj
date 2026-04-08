import SummaryRow from "./SummaryRow";

const panelStyle = {
  background: "#111827",
  border: "1px solid #1f2937",
  borderRadius: "16px",
  padding: "1rem",
};

export default function TrafficSummaryPanel({ summary }) {
  return (
    <div style={panelStyle}>
      <h3 style={{ marginTop: 0, color: "#fff" }}>Traffic Summary</h3>
      <SummaryRow label="Usable Samples" value={summary?.total ?? 0} />
      <SummaryRow label="Light Congestion" value={summary?.light ?? 0} />
      <SummaryRow label="Moderate Congestion" value={summary?.moderate ?? 0} />
      <SummaryRow label="Heavy Congestion" value={summary?.heavy ?? 0} />
      <SummaryRow label="Road Closed" value={summary?.closed ?? 0} />
      <SummaryRow
        label="Avg Current Speed"
        value={`${summary?.averageCurrentSpeed ?? summary?.avgSpeed ?? 0} km/h`}
      />
      <SummaryRow
        label="Avg Free Flow Speed"
        value={`${summary?.averageFreeFlowSpeed ?? 0} km/h`}
      />
    </div>
  );
}