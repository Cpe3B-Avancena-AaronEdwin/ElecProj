import { useEffect, useMemo, useRef, useState } from "react";
import { findBestTripPlan, searchStops } from "../../utils/gtfsUtils";

function StopHintList({ title, items = [], onPick }) {
  if (!items.length) return null;

  return (
    <div style={{ marginTop: "0.55rem", width: "100%" }}>
      <div style={{ fontSize: "0.8rem", color: "var(--text-sub)", marginBottom: "0.35rem" }}>
        {title}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.45rem" }}>
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
              maxWidth: "100%",
              whiteSpace: "normal",
            }}
          >
            {item.stopCode ? `${item.stopName} (${item.stopCode})` : item.stopName}
          </button>
        ))}
      </div>
    </div>
  );
}

function StopPicker({
  id,
  label,
  value,
  onChange,
  options = [],
  placeholder,
  open,
  setOpen,
  onClear,
}) {
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (!wrapperRef.current?.contains(event.target)) setOpen(false);
    }

    function handleEscape(event) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [setOpen]);

  const filteredOptions = useMemo(() => {
    const query = String(value || "").trim().toLowerCase();

    if (!query) return options.slice(0, 50);

    return options
      .filter((stop) => {
        const name = String(stop.stopName || "").toLowerCase();
        const code = String(stop.stopCode || "").toLowerCase();
        return name.includes(query) || code.includes(query);
      })
      .slice(0, 50);
  }, [options, value]);

  const handleArrowClick = () => {
    const hasValue = String(value || "").trim().length > 0;

    if (open && hasValue) {
      onChange("");
      onClear?.();
      setOpen(true);
      requestAnimationFrame(() => inputRef.current?.focus());
      return;
    }

    setOpen((prev) => !prev);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  return (
    <div ref={wrapperRef} style={{ width: "100%", minWidth: 0, position: "relative" }}>
      <label
        htmlFor={id}
        style={{
          display: "block",
          marginBottom: "0.45rem",
          color: "var(--text-sub)",
          fontSize: "0.85rem",
        }}
      >
        {label}
      </label>

      <div style={{ position: "relative", width: "100%" }}>
        <input
          ref={inputRef}
          id={id}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          autoComplete="off"
          style={{
            width: "100%",
            minWidth: 0,
            padding: "0.8rem 3rem 0.8rem 0.9rem",
            borderRadius: "12px",
            border: "1px solid var(--border)",
            background: "rgba(255,255,255,0.04)",
            color: "var(--text-on-dark)",
            outline: "none",
            boxSizing: "border-box",
          }}
        />

        <button
          type="button"
          onClick={handleArrowClick}
          aria-label="Toggle stop options"
          style={{
            position: "absolute",
            top: "50%",
            right: "0.55rem",
            transform: "translateY(-50%)",
            width: "34px",
            height: "34px",
            border: "1px solid rgba(255,255,255,0.18)",
            borderRadius: "10px",
            background: "rgba(255,255,255,0.04)",
            color: "var(--text-on-dark)",
            cursor: "pointer",
            fontSize: "0.95rem",
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          {open && String(value || "").trim() ? "✕" : "▼"}
        </button>

        {open && (
          <div
            style={{
              position: "absolute",
              top: "calc(100% + 0.45rem)",
              left: 0,
              right: 0,
              maxHeight: "260px",
              overflowY: "auto",
              borderRadius: "14px",
              border: "1px solid var(--border)",
              background: "#0f172a",
              boxShadow: "0 12px 28px rgba(0,0,0,0.28)",
              zIndex: 2000,
              padding: "0.4rem",
            }}
          >
            {filteredOptions.length ? (
              filteredOptions.map((stop) => (
                <button
                  key={stop.id}
                  type="button"
                  onClick={() => {
                    onChange(stop.stopName);
                    setOpen(false);
                  }}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    padding: "0.75rem 0.8rem",
                    border: "none",
                    borderRadius: "10px",
                    background: "transparent",
                    color: "var(--text-on-dark)",
                    cursor: "pointer",
                    display: "block",
                    whiteSpace: "normal",
                  }}
                >
                  <div style={{ fontWeight: 700 }}>{stop.stopName}</div>
                  {stop.stopCode ? (
                    <div style={{ fontSize: "0.8rem", color: "var(--text-sub)", marginTop: "0.2rem" }}>
                      {stop.stopCode}
                    </div>
                  ) : null}
                </button>
              ))
            ) : (
              <div style={{ padding: "0.8rem", color: "var(--text-sub)", fontSize: "0.9rem" }}>
                No matching stops found.
              </div>
            )}
          </div>
        )}
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
    <div style={{ marginTop: "1rem", width: "100%" }}>
      <div style={{ fontWeight: 700, marginBottom: "0.65rem" }}>
        Step-by-step directions
      </div>

      <div style={{ display: "grid", gap: "0.7rem" }}>
        {plan.steps.map((step, index) => (
          <div
            key={`${step.type}-${index}`}
            style={{
              display: "grid",
              gridTemplateColumns: "auto minmax(0, 1fr)",
              gap: "0.8rem",
              alignItems: "start",
              padding: "0.9rem",
              borderRadius: "14px",
              background: "rgba(255,255,255,0.03)",
              border: "1px solid var(--border)",
            }}
          >
            <StepBadge type={step.type} />

            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 700, color: "var(--text-on-dark)" }}>
                {index + 1}. {step.instruction}
              </div>

              {step.type === "ride" ? (
                <div style={{ color: "var(--text-sub)", marginTop: "0.25rem" }}>
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
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: "0.85rem",
          marginTop: "1rem",
          width: "100%",
        }}
      >
        {[
          ["Trip Type", plan.transfers ? `${plan.transfers} Transfer${plan.transfers > 1 ? "s" : ""}` : "Direct"],
          ["Board At", plan.fromStopName],
          ["Get Off At", plan.toStopName],
          ["Total Stops", plan.totalStops ?? plan.stopCount],
        ].map(([label, value]) => (
          <div
            key={label}
            style={{
              padding: "0.85rem",
              borderRadius: "14px",
              background: "rgba(255,255,255,0.04)",
              minWidth: 0,
            }}
          >
            <div style={{ color: "var(--text-sub)", fontSize: "0.82rem" }}>{label}</div>
            <div style={{ fontWeight: 800, marginTop: "0.3rem", overflowWrap: "anywhere" }}>
              {value}
            </div>
          </div>
        ))}
      </div>

      <DirectionsList plan={plan} />
    </>
  );
}

export default function TripPlannerPanel({ gtfsBundle, onPlanSelected }) {
  const [fromText, setFromText] = useState("");
  const [toText, setToText] = useState("");
  const [fromOpen, setFromOpen] = useState(false);
  const [toOpen, setToOpen] = useState(false);
  const [plannerResult, setPlannerResult] = useState(null);
  const [plannerMessage, setPlannerMessage] = useState(
    "Enter your FROM and TO stops, then click Find Route."
  );

  const fromSuggestions = useMemo(() => searchStops(fromText, gtfsBundle, 6), [fromText, gtfsBundle]);
  const toSuggestions = useMemo(() => searchStops(toText, gtfsBundle, 6), [toText, gtfsBundle]);

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

  const clearPlannerResult = () => {
    setPlannerResult(null);
    setPlannerMessage("Selection cleared. All stops are shown again.");
    onPlanSelected?.(null);
  };

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
    setFromOpen(false);
    setToOpen(false);
    setPlannerResult(null);
    setPlannerMessage("Stops swapped. Click Find Route to check the reverse trip.");
    onPlanSelected?.(null);
  };

  const bestPlan = plannerResult?.bestPlan || null;
  const alternatePlans = plannerResult?.plans?.slice(1, 4) || [];

  return (
    <div
      className="card trip-planner-panel"
      style={{
        width: "100%",
        maxWidth: "100%",
        padding: "clamp(0.9rem, 3vw, 1rem)",
        marginBottom: "1rem",
        overflow: "visible",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr)",
          gap: "0.75rem",
          marginBottom: "0.85rem",
        }}
      >
        <div style={{ minWidth: 0 }}>
          <h3 style={{ margin: 0, color: "var(--text-on-dark)" }}>Trip Planner</h3>
          <div style={{ color: "var(--text-sub)", marginTop: "0.3rem", lineHeight: 1.5 }}>
            Search GTFS routes from one stop to another with Google Maps style directions.
          </div>
        </div>

        <div style={{ fontSize: "0.85rem", color: "var(--text-sub)" }}>
          {gtfsBundle?.stops?.length || 0} stops • {gtfsBundle?.trips?.length || 0} trips
        </div>
      </div>

      <div
        className="trip-planner-controls"
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(180px, 1fr) 48px minmax(180px, 1fr) minmax(130px, auto)",
          gap: "0.75rem",
          alignItems: "end",
          width: "100%",
        }}
      >
        <StopPicker
          id="trip-planner-from"
          label="FROM"
          value={fromText}
          onChange={setFromText}
          options={uniqueStopOptions}
          placeholder="Type origin stop"
          open={fromOpen}
          setOpen={setFromOpen}
          onClear={clearPlannerResult}
        />

        <button
          type="button"
          onClick={handleSwap}
          style={{
            width: "48px",
            height: "44px",
            padding: 0,
            borderRadius: "12px",
            border: "1px solid var(--border)",
            background: "rgba(255,255,255,0.04)",
            color: "var(--text-on-dark)",
            cursor: "pointer",
            fontWeight: 700,
            flexShrink: 0,
          }}
          title="Swap FROM and TO"
        >
          ⇄
        </button>

        <StopPicker
          id="trip-planner-to"
          label="TO"
          value={toText}
          onChange={setToText}
          options={uniqueStopOptions}
          placeholder="Type destination stop"
          open={toOpen}
          setOpen={setToOpen}
          onClear={clearPlannerResult}
        />

        <button
          type="button"
          onClick={handleFindRoute}
          style={{
            width: "100%",
            height: "44px",
            padding: "0 1rem",
            borderRadius: "12px",
            border: "none",
            background: "var(--primary, #22d3ee)",
            color: "#031525",
            cursor: "pointer",
            fontWeight: 800,
            whiteSpace: "nowrap",
          }}
        >
          Find Route
        </button>
      </div>

      <StopHintList
        title="FROM matches"
        items={fromSuggestions}
        onPick={(item) => {
          setFromText(item.stopName);
          setFromOpen(false);
          setPlannerResult(null);
          setPlannerMessage("FROM stop selected. Choose TO stop or click Find Route.");
          onPlanSelected?.(null);
        }}
      />

      <StopHintList
        title="TO matches"
        items={toSuggestions}
        onPick={(item) => {
          setToText(item.stopName);
          setToOpen(false);
          setPlannerResult(null);
          setPlannerMessage("TO stop selected. Click Find Route to calculate the trip.");
          onPlanSelected?.(null);
        }}
      />

      <div
        style={{
          marginTop: "1rem",
          padding: "0.9rem 1rem",
          borderRadius: "14px",
          background: bestPlan ? "rgba(34,197,94,0.08)" : "rgba(255,255,255,0.04)",
          border: "1px solid var(--border)",
          color: "var(--text-on-dark)",
          width: "100%",
          overflow: "hidden",
        }}
      >
        <div style={{ fontWeight: 700, marginBottom: "0.35rem" }}>Planner Result</div>
        <div style={{ color: "var(--text-sub)", lineHeight: 1.5 }}>{plannerMessage}</div>

        <PlanSummary plan={bestPlan} />

        {alternatePlans.length ? (
          <div style={{ marginTop: "1rem" }}>
            <div style={{ color: "var(--text-sub)", fontSize: "0.85rem", marginBottom: "0.45rem" }}>
              Other options
            </div>

            <div style={{ display: "grid", gap: "0.6rem" }}>
              {alternatePlans.map((plan, index) => (
                <button
                  key={`${plan.type}-${index}-${plan.routeLabel}-${plan.fromStopName}-${plan.toStopName}`}
                  type="button"
                  onClick={() => {
                    const nextResult = { ...(plannerResult || {}), bestPlan: plan };
                    setPlannerResult(nextResult);
                    onPlanSelected?.(plan);

                    setPlannerMessage(
                      (plan.transfers || 0) > 0
                        ? `Selected an alternate route with ${plan.transfers} transfer${plan.transfers > 1 ? "s" : ""}.`
                        : "Selected an alternate direct route."
                    );
                  }}
                  style={{
                    padding: "0.8rem 0.9rem",
                    borderRadius: "12px",
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid var(--border)",
                    textAlign: "left",
                    color: "var(--text-on-dark)",
                    cursor: "pointer",
                    whiteSpace: "normal",
                    overflowWrap: "anywhere",
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