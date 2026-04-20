import { useEffect, useMemo, useState } from "react";
import { findBestTripPlan, searchStops } from "../../utils/gtfsUtils";

function StopHintList({ title, items = [], onPick }) {
  if (!items.length) return null;

  return (
    <div style={{ marginTop: "0.55rem" }}>
      <div
        style={{
          fontSize: "0.8rem",
          color: "var(--text-sub)",
          marginBottom: "0.35rem",
        }}
      >
        {title}
      </div>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "0.45rem",
        }}
      >
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onPick?.(item)}
            style={{
              padding: "0.35rem 0.55rem",
              borderRadius: "999px",
              border: "1px solid var(--border)",
              fontSize: "0.82rem",
              color: "var(--text-sub)",
              background: "rgba(255,255,255,0.03)",
              cursor: "pointer",
            }}
          >
            {item.stopCode ? `${item.stopName} (${item.stopCode})` : item.stopName}
          </button>
        ))}
      </div>
    </div>
  );
}

function StepBadge({ type }) {
  const map = {
    walk: { label: "Walk", bg: "rgba(59,130,246,0.18)" },
    ride: { label: "Ride", bg: "rgba(34,197,94,0.18)" },
    transfer: { label: "Transfer", bg: "rgba(245,158,11,0.18)" },
    arrive: { label: "Arrive", bg: "rgba(239,68,68,0.18)" },
  };

  const item = map[type] || { label: type, bg: "rgba(255,255,255,0.08)" };

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        minWidth: "72px",
        padding: "0.3rem 0.55rem",
        borderRadius: "999px",
        background: item.bg,
        color: "var(--text-on-dark)",
        fontSize: "0.78rem",
        fontWeight: 700,
      }}
    >
      {item.label}
    </span>
  );
}

function DirectionsList({ plan }) {
  if (!plan?.steps?.length) return null;

  return (
    <div style={{ marginTop: "1rem" }}>
      <div
        style={{
          fontWeight: 700,
          marginBottom: "0.65rem",
        }}
      >
        Step-by-step directions
      </div>

      <div style={{ display: "grid", gap: "0.7rem" }}>
        {plan.steps.map((step, index) => (
          <div
            key={`${step.type}-${index}`}
            style={{
              display: "grid",
              gridTemplateColumns: "auto 1fr",
              gap: "0.8rem",
              alignItems: "start",
              padding: "0.9rem",
              borderRadius: "14px",
              background: "rgba(255,255,255,0.03)",
              border: "1px solid var(--border)",
            }}
          >
            <StepBadge type={step.type} />

            <div>
              <div
                style={{
                  fontWeight: 700,
                  color: "var(--text-on-dark)",
                }}
              >
                {index + 1}. {step.instruction}
              </div>

              {step.type === "ride" ? (
                <div
                  style={{
                    color: "var(--text-sub)",
                    marginTop: "0.25rem",
                  }}
                >
                  {step.directionLabel} • {step.stopCount} stops
                </div>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PlanSummary({ plan }) {
  if (!plan) return null;

  return (
    <>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "0.85rem",
          marginTop: "1rem",
        }}
      >
        <div
          style={{
            padding: "0.85rem",
            borderRadius: "14px",
            background: "rgba(255,255,255,0.04)",
          }}
        >
          <div style={{ color: "var(--text-sub)", fontSize: "0.82rem" }}>Trip Type</div>
          <div style={{ fontWeight: 800, marginTop: "0.3rem" }}>
            {plan.transfers ? `${plan.transfers} Transfer${plan.transfers > 1 ? "s" : ""}` : "Direct"}
          </div>
        </div>

        <div
          style={{
            padding: "0.85rem",
            borderRadius: "14px",
            background: "rgba(255,255,255,0.04)",
          }}
        >
          <div style={{ color: "var(--text-sub)", fontSize: "0.82rem" }}>Board At</div>
          <div style={{ fontWeight: 700, marginTop: "0.3rem" }}>{plan.fromStopName}</div>
        </div>

        <div
          style={{
            padding: "0.85rem",
            borderRadius: "14px",
            background: "rgba(255,255,255,0.04)",
          }}
        >
          <div style={{ color: "var(--text-sub)", fontSize: "0.82rem" }}>Get Off At</div>
          <div style={{ fontWeight: 700, marginTop: "0.3rem" }}>{plan.toStopName}</div>
        </div>

        <div
          style={{
            padding: "0.85rem",
            borderRadius: "14px",
            background: "rgba(255,255,255,0.04)",
          }}
        >
          <div style={{ color: "var(--text-sub)", fontSize: "0.82rem" }}>Total Stops</div>
          <div style={{ fontWeight: 800, marginTop: "0.3rem" }}>
            {plan.totalStops ?? plan.stopCount}
          </div>
        </div>
      </div>

      <DirectionsList plan={plan} />
    </>
  );
}

export default function TripPlannerPanel({ gtfsBundle, onPlanSelected }) {
  const [fromText, setFromText] = useState("");
  const [toText, setToText] = useState("");
  const [plannerResult, setPlannerResult] = useState(null);
  const [plannerMessage, setPlannerMessage] = useState(
    "Enter your FROM and TO stops, then click Find Route."
  );

  const fromSuggestions = useMemo(
    () => searchStops(fromText, gtfsBundle, 6),
    [fromText, gtfsBundle]
  );

  const toSuggestions = useMemo(
    () => searchStops(toText, gtfsBundle, 6),
    [toText, gtfsBundle]
  );

  const uniqueStopOptions = useMemo(() => {
    const stops = gtfsBundle?.stops || [];
    const seen = new Set();

    return stops
      .slice()
      .sort((a, b) => (a.stopName || "").localeCompare(b.stopName || ""))
      .filter((stop) => {
        const key = String(stop.stopName || "").trim().toLowerCase();
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 1200);
  }, [gtfsBundle]);

  useEffect(() => {
    if (!fromText.trim() && !toText.trim()) {
      setPlannerResult(null);
      setPlannerMessage("Enter your FROM and TO stops, then click Find Route.");
      onPlanSelected?.(null);
    }
  }, [fromText, toText, onPlanSelected]);

  const handleFindRoute = () => {
    const result = findBestTripPlan(fromText, toText, gtfsBundle);
    setPlannerResult(result);
    onPlanSelected?.(result?.bestPlan || null);

    if (!result.ok) {
      setPlannerMessage(result.reason || "No trip found.");
      return;
    }

    const best = result.bestPlan;

    if ((best.transfers || 0) > 0) {
      setPlannerMessage(
        `Found a route with ${best.transfers} transfer${best.transfers > 1 ? "s" : ""}. Follow the step-by-step directions below.`
      );
      return;
    }

    setPlannerMessage("Found a direct trip. Follow the step-by-step directions below.");
  };

  const handleSwap = () => {
    setFromText(toText);
    setToText(fromText);
    setPlannerResult(null);
    setPlannerMessage("Stops swapped. Click Find Route to check the reverse trip.");
    onPlanSelected?.(null);
  };

  const bestPlan = plannerResult?.bestPlan || null;
  const alternatePlans = plannerResult?.plans?.slice(1, 4) || [];

  return (
    <div className="card" style={{ padding: "1rem", marginBottom: "1rem" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "1rem",
          marginBottom: "0.85rem",
          flexWrap: "wrap",
        }}
      >
        <div>
          <h3 style={{ margin: 0 }}>Trip Planner</h3>
          <div style={{ color: "var(--text-sub)", marginTop: "0.3rem" }}>
            Search GTFS routes from one stop to another with Google Maps style directions.
          </div>
        </div>

        <div
          style={{
            fontSize: "0.85rem",
            color: "var(--text-sub)",
            whiteSpace: "nowrap",
          }}
        >
          {gtfsBundle?.stops?.length || 0} stops • {gtfsBundle?.trips?.length || 0} trips
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) auto minmax(0, 1fr) auto",
          gap: "0.75rem",
          alignItems: "end",
        }}
      >
        <div style={{ minWidth: 0 }}>
          <label
            htmlFor="trip-planner-from"
            style={{
              display: "block",
              marginBottom: "0.45rem",
              color: "var(--text-sub)",
              fontSize: "0.85rem",
            }}
          >
            FROM
          </label>
          <input
            id="trip-planner-from"
            list="trip-planner-stops"
            value={fromText}
            onChange={(e) => setFromText(e.target.value)}
            placeholder="Type origin stop"
            style={{
              width: "100%",
              padding: "0.8rem 0.9rem",
              borderRadius: "12px",
              border: "1px solid var(--border)",
              background: "rgba(255,255,255,0.04)",
              color: "var(--text-on-dark)",
              outline: "none",
            }}
          />
        </div>

        <button
          type="button"
          onClick={handleSwap}
          style={{
            padding: "0.8rem 0.95rem",
            borderRadius: "12px",
            border: "1px solid var(--border)",
            background: "rgba(255,255,255,0.04)",
            color: "var(--text-on-dark)",
            cursor: "pointer",
            fontWeight: 700,
          }}
          title="Swap FROM and TO"
        >
          ⇄
        </button>

        <div style={{ minWidth: 0 }}>
          <label
            htmlFor="trip-planner-to"
            style={{
              display: "block",
              marginBottom: "0.45rem",
              color: "var(--text-sub)",
              fontSize: "0.85rem",
            }}
          >
            TO
          </label>
          <input
            id="trip-planner-to"
            list="trip-planner-stops"
            value={toText}
            onChange={(e) => setToText(e.target.value)}
            placeholder="Type destination stop"
            style={{
              width: "100%",
              padding: "0.8rem 0.9rem",
              borderRadius: "12px",
              border: "1px solid var(--border)",
              background: "rgba(255,255,255,0.04)",
              color: "var(--text-on-dark)",
              outline: "none",
            }}
          />
        </div>

        <button
          type="button"
          onClick={handleFindRoute}
          style={{
            padding: "0.8rem 1rem",
            borderRadius: "12px",
            border: "none",
            background: "var(--primary, #3b82f6)",
            color: "white",
            cursor: "pointer",
            fontWeight: 700,
            minWidth: "120px",
          }}
        >
          Find Route
        </button>
      </div>

      <datalist id="trip-planner-stops">
        {uniqueStopOptions.map((stop) => (
          <option
            key={stop.id}
            value={stop.stopName}
            label={stop.stopCode ? `${stop.stopName} (${stop.stopCode})` : stop.stopName}
          />
        ))}
      </datalist>

      <StopHintList
        title="FROM matches"
        items={fromSuggestions}
        onPick={(item) => setFromText(item.stopName)}
      />
      <StopHintList
        title="TO matches"
        items={toSuggestions}
        onPick={(item) => setToText(item.stopName)}
      />

      <div
        style={{
          marginTop: "1rem",
          padding: "0.9rem 1rem",
          borderRadius: "14px",
          background: bestPlan ? "rgba(34, 197, 94, 0.08)" : "rgba(255,255,255,0.04)",
          border: "1px solid var(--border)",
          color: "var(--text-on-dark)",
        }}
      >
        <div style={{ fontWeight: 700, marginBottom: "0.35rem" }}>Planner Result</div>
        <div style={{ color: "var(--text-sub)" }}>{plannerMessage}</div>

        <PlanSummary plan={bestPlan} />

        {alternatePlans.length ? (
          <div style={{ marginTop: "1rem" }}>
            <div
              style={{
                color: "var(--text-sub)",
                fontSize: "0.85rem",
                marginBottom: "0.45rem",
              }}
            >
              Other options
            </div>

            <div style={{ display: "grid", gap: "0.6rem" }}>
              {alternatePlans.map((plan, index) => (
                <button
                  key={`${plan.type}-${index}-${plan.routeLabel}-${plan.fromStopName}-${plan.toStopName}`}
                  type="button"
                  onClick={() => {
                    const nextResult = {
                      ...(plannerResult || {}),
                      bestPlan: plan,
                    };
                    setPlannerResult(nextResult);
                    onPlanSelected?.(plan);

                    if ((plan.transfers || 0) > 0) {
                      setPlannerMessage(
                        `Selected an alternate route with ${plan.transfers} transfer${plan.transfers > 1 ? "s" : ""}.`
                      );
                    } else {
                      setPlannerMessage("Selected an alternate direct route.");
                    }
                  }}
                  style={{
                    padding: "0.8rem 0.9rem",
                    borderRadius: "12px",
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid var(--border)",
                    textAlign: "left",
                    color: "var(--text-on-dark)",
                    cursor: "pointer",
                  }}
                >
                  <div style={{ fontWeight: 700 }}>{plan.routeLabel}</div>
                  <div style={{ color: "var(--text-sub)", marginTop: "0.25rem" }}>
                    {plan.fromStopName} → {plan.toStopName} • {plan.transfers || 0} transfer
                    {(plan.transfers || 0) !== 1 ? "s" : ""} • {plan.totalStops ?? plan.stopCount} stops
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}