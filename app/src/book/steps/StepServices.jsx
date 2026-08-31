// Step 1 — pick services. A FLAT list of any length, grouped by the
// business's own optional group_label. The old widget always drew exactly
// three interior and three exterior cards and printed "N/A" where data was
// missing; here the list is whatever the business configured, and a
// business with two services looks deliberate.

import { duration, money } from "../../lib/format.js";
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
    // W18, and it was a structural bug rather than a taste note. His words:
    // "the titles are really close to it, but everything else is spread out.
    // So it kinda looks uneven." Both halves were literally true and had the
    // same cause — each GROUP was a direct flex child of .bk-wrap, so the
    // 26px SECTION gap fell between cards belonging to one menu, while the
    // group's own label sat hard against its first card with no gap at all.
    // Exactly backwards: the loosest space in the step was inside the tightest
    // relationship. Same cause as W7 and W11 in roadmap 2.6 — a missing flow
    // container — and the same fix.
    <div className="bk-choices">
      <p className="bk-muted">Choose one or more. You can add extras next.</p>
      {groups.map((g) => (
        <div key={g.key || "ungrouped"} className="bk-choices">
          {showHeadings && g.key && <div className="bk-step-label group">{g.key}</div>}
          {g.items.map((s) => {
            const isOn = selected.includes(s.id);
            return (
              <div
                key={s.id}
                role="button"
                tabIndex={0}
                aria-pressed={isOn}
                className={`bk-card selectable ${isOn ? "selected" : ""}`}
                onClick={() => onToggle(s.id)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onToggle(s.id); } }}
              >
                {/* Price and length share a column. They are the two facts a
                    customer compares services ON, so putting them together
                    makes the comparison one glance down the right edge — and
                    it folds a whole line out of every card, which is 19px x
                    however many services the business lists (W16). */}
                <div className="bk-row top between">
                  <h3>{s.name}</h3>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <span className="bk-price">{money(s.price)}</span>
                    <span className="bk-muted" style={{ display: "block" }}>
                      about {duration(s.duration_minutes)}
                    </span>
                  </div>
                </div>
                {s.description && <p className="bk-muted" style={{ marginTop: 4 }}>{s.description}</p>}
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
    </div>
  );
}
