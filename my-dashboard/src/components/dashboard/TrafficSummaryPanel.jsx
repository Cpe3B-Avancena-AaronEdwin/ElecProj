import SummaryRow from "./SummaryRow";

export default function TrafficSummaryPanel({ summary }) {
  return (
    <div className="panel">
      <h3>Traffic Summary</h3>
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