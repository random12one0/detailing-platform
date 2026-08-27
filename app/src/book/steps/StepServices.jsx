// Step 1 — pick services. A FLAT list of any length, grouped by the
// business's own optional group_label. The old widget always drew exactly
// three interior and three exterior cards and printed "N/A" where data was
// missing; here the list is whatever the business configured, and a
// business with two services looks deliberate.

import { money } from "../../lib/format.js";
import { useBookingBusiness } from "../BookingBusinessContext.jsx";

export default function StepServices({ selected, onToggle }) {
  const { services, business } = useBookingBusiness();

  if (services.length === 0) {
    return (
      <div className="bk-note">
        {business.name} hasn’t listed any services online yet.
        {business.phone ? ` Please call ${business.phone} to book.` : ""}
      </div>
    );
  }

  // Group only if the business actually uses group labels; otherwise one
  // plain list, which is the right shape for a small menu.
  const groups = [];
  for (const s of services) {
    const key = s.group_label || "";
    let g = groups.find((x) => x.key === key);
    if (!g) groups.push((g = { key, items: [] }));
    g.items.push(s);
  }
  const showHeadings = groups.length > 1 || (groups[0]?.key ?? "") !== "";

  return (
    <>
      <p className="bk-muted" style={{ marginBottom: 14 }}>
        Choose one or more. You can add extras next.
      </p>
      {groups.map((g) => (
        <div key={g.key || "ungrouped"}>
          {showHeadings && g.key && <div className="bk-step-label" style={{ marginTop: 6 }}>{g.key}</div>}
          {g.items.map((s) => {
            const isOn = selected.includes(s.id);
            return (
              <div
                key={s.id}
                role="button"
                tabIndex={0}
                className={`bk-card selectable ${isOn ? "selected" : ""}`}
                onClick={() => onToggle(s.id)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onToggle(s.id); } }}
              >
                <div className="bk-row between">
                  <h3>{s.name}</h3>
                  <span className="bk-price">{money(s.price)}</span>
                </div>
                {s.description && <p className="bk-muted" style={{ marginTop: 4 }}>{s.description}</p>}
                <p className="bk-muted" style={{ marginTop: 4 }}>
                  About {formatDuration(s.duration_minutes)}
                </p>
                {Array.isArray(s.features) && s.features.length > 0 && (
                  <ul className="bk-muted" style={{ margin: "8px 0 0", paddingLeft: 18 }}>
                    {s.features.slice(0, 5).map((f, i) => <li key={i}>{String(f)}</li>)}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </>
  );
}

function formatDuration(mins) {
  const m = Number(mins) || 0;
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (h && r) return `${h}h ${r}m`;
  if (h) return `${h} hour${h > 1 ? "s" : ""}`;
  return `${r} minutes`;
}
