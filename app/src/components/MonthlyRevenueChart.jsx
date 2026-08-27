// Money in, by month, last 6 months. Bars only, one series — so no legend
// (the heading names it) and no number on every bar; the hovered/tapped bar
// shows its own value. The single hue is the business's brand accent, which
// the theme engine has already contrast-corrected against the active
// surface, so the bars are readable in both themes by construction.

import { useState } from "react";
import { money } from "../lib/format.js";

const H = 132;        // plot height in px
const GAP = 2;        // surface gap between adjacent bars
const RADIUS = 4;     // rounded data-end

export default function MonthlyRevenueChart({ data }) {
  const [active, setActive] = useState(null);
  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <div>
      <div className="row between" style={{ alignItems: "baseline", marginBottom: 10 }}>
        <h3>Money in by month</h3>
        <span className="muted">
          {active !== null ? `${data[active].label} · ${money(data[active].value)}` : "Last 6 months"}
        </span>
      </div>

      <div
        style={{ display: "flex", alignItems: "flex-end", gap: GAP * 2, height: H }}
        onMouseLeave={() => setActive(null)}
      >
        {data.map((d, i) => {
          const h = Math.max(2, Math.round((d.value / max) * H));
          return (
            <button
              key={d.label}
              onMouseEnter={() => setActive(i)}
              onFocus={() => setActive(i)}
              onClick={() => setActive(active === i ? null : i)}
              aria-label={`${d.label}: ${money(d.value)}`}
              style={{
                flex: 1, height: "100%", padding: 0, border: "none", background: "none",
                display: "flex", alignItems: "flex-end", cursor: "pointer", minHeight: 0,
              }}
            >
              <span
                style={{
                  display: "block", width: "100%", height: h,
                  background: "var(--accent)",
                  opacity: active === null || active === i ? 1 : 0.45,
                  borderRadius: `${RADIUS}px ${RADIUS}px 0 0`,
                  transition: "opacity 120ms ease",
                }}
              />
            </button>
          );
        })}
      </div>

      {/* Recessive axis: month labels only, no gridlines. */}
      <div style={{ display: "flex", gap: GAP * 2, marginTop: 6 }}>
        {data.map((d, i) => (
          <span
            key={d.label}
            className="muted"
            style={{ flex: 1, textAlign: "center", fontSize: "0.7rem", color: active === i ? "var(--text)" : undefined }}
          >
            {d.label}
          </span>
        ))}
      </div>
    </div>
  );
}
