import { useMemo } from "react";

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function rowStyle(last = false) {
  return {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "0.8rem 0",
    borderBottom: last ? "none" : "1px solid rgba(255,255,255,0.08)",
    gap: "1rem",
  };
}

function labelStyle() {
  return {
    color: "rgba(230,252,255,0.82)",
    fontSize: "0.98rem",
  };
}

function valueStyle() {
  return {
    color: "#ffffff",
    fontWeight: 800,
    textAlign: "right",
  };
}

export default function TrafficSummaryPanel({ summary = {} }) {
  const data = useMemo(() => {
    const usableSamples =
      num(summary.usableSamples) ||
      num(summary.routeCount) ||
      num(summary.samplePoints) ||
      0;

    const congestionScore = num(summary.congestionScore);

    const light =
      num(summary.lightCount) ||
      num(summary.lightTraffic) ||
      (usableSamples > 0 && congestionScore < 40 ? usableSamples : 0);

    const moderate =
      num(summary.moderateCount) ||
      num(summary.moderateTraffic) ||
      (usableSamples > 0 &&
      congestionScore >= 40 &&
      congestionScore < 70
        ? usableSamples
        : 0);

    const heavy =
      num(summary.heavyCount) ||
      num(summary.heavyTraffic) ||
      (usableSamples > 0 && congestionScore >= 70 ? usableSamples : 0);

    const closed =
      num(summary.closedCount) ||
      num(summary.roadClosed) ||
      num(summary.roadClosedCount) ||
      0;

    const avgCurrentSpeed =
      num(summary.averageSpeed) ||
      num(summary.avgCurrentSpeed) ||
      0;

    const avgFreeFlowSpeed =
      num(summary.freeFlowSpeed) ||
      num(summary.avgFreeFlowSpeed) ||
      (avgCurrentSpeed > 0 ? Math.max(avgCurrentSpeed, avgCurrentSpeed + 8) : 0);

    return {
      usableSamples,
      light,
      moderate,
      heavy,
      closed,
      avgCurrentSpeed,
      avgFreeFlowSpeed,
    };
  }, [summary]);

  return (
    <div className="card" style={{ height: "100%" }}>
      <div
        style={{
          fontSize: "2rem",
          fontWeight: 900,
          color: "#ffffff",
          marginBottom: "1.1rem",
        }}
      >
        Traffic Summary
      </div>

      <div style={rowStyle()}>
        <span style={labelStyle()}>Usable Samples</span>
        <span style={valueStyle()}>{data.usableSamples}</span>
      </div>

      <div style={rowStyle()}>
        <span style={labelStyle()}>Light Congestion</span>
        <span style={valueStyle()}>{data.light}</span>
      </div>

      <div style={rowStyle()}>
        <span style={labelStyle()}>Moderate Congestion</span>
        <span style={valueStyle()}>{data.moderate}</span>
      </div>

      <div style={rowStyle()}>
        <span style={labelStyle()}>Heavy Congestion</span>
        <span style={valueStyle()}>{data.heavy}</span>
      </div>

      <div style={rowStyle()}>
        <span style={labelStyle()}>Road Closed</span>
        <span style={valueStyle()}>{data.closed}</span>
      </div>

      <div style={rowStyle()}>
        <span style={labelStyle()}>Avg Current Speed</span>
        <span style={valueStyle()}>
          {data.avgCurrentSpeed.toFixed(0)} km/h
        </span>
      </div>

      <div style={rowStyle(true)}>
        <span style={labelStyle()}>Avg Free Flow Speed</span>
        <span style={valueStyle()}>
          {data.avgFreeFlowSpeed.toFixed(0)} km/h
        </span>
      </div>
    </div>
  );
}