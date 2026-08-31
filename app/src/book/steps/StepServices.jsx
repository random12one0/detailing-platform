// Step 1 — pick services. A FLAT list of any length, grouped by the
// business's own optional group_label. The old widget always drew exactly
// three interior and three exterior cards and printed "N/A" where data was
// missing; here the list is whatever the business configured, and a
// business with two services looks deliberate.
//
// W21 — THE FACE OF A SERVICE CARD IS ITS NAME, ITS PRICE AND ITS LENGTH.
// Everything else the detailer wrote — the description AND the what's-
// included list — lives behind the little eye he asked for. This is not a
// taste note, it is the height budget: measured at 392x844 against the
// running app (docs/detailer-research-2026-08-31.md), a card with its
// description on the face is 97px and one without is 74px, and the owner's
// own real menu — two categories of three — goes from 119px OVER the bottom
// of a phone to 18px spare on that difference alone. Every other item in
// roadmap 2.8b ADDS height to this step; this is the only one that takes it
// away, which is why it shipped first.
//
// The inline `features` list that used to sit under the description, capped
// at five entries, is GONE — the cap was a symptom. Nothing wrote that
// column, so nobody had hit it; a Catalog editor for it without this control
// would have armed exactly the overflow above for every tenant who filled
// it in.

import { useState } from "react";
import { Eye } from "lucide-react";
import { duration, money } from "../../lib/format.js";
import { useBookingBusiness } from "../BookingBusinessContext.jsx";

export default function StepServices({ selected, onToggle }) {
  const { services, serviceGroups, business } = useBookingBusiness();
  // Which cards are showing their full details. Plain state rather than
  // <details>: the eye has to sit ON the name row to cost zero height, and
  // a <summary> is a row of its own by construction.
  const [open, setOpen] = useState([]);
  const peek = (id) =>
    setOpen((o) => (o.includes(id) ? o.filter((x) => x !== id) : [...o, id]));

  if (services.length === 0) {
    return (
      <div className="bk-note">
        {business.name} hasn’t listed any services online yet.
        {business.phone ? ` Please call ${business.phone} to book.` : ""}
      </div>
    );
  }

  // W25 — GROUP BY group_id, falling back to group_label. The categories come
  // from the service_groups table now, in the detailer's own order, and each
  // one carries its own rule: max_select 1 is "pick one from this category",
  // null is "pick as many as you like".
  //
  // The fallback matters and is not belt-and-braces: a service written before
  // the migration, or by a detailer who has not made categories yet, has a
  // label and no id, and it still has to appear. Reading id first and label
  // second is what makes the two coexist.
  const groups = [];
  const bucket = (key, name, rule) => {
    let g = groups.find((x) => x.key === key);
    if (!g) groups.push((g = { key, name, rule, items: [] }));
    return g;
  };
  for (const s of services) {
    const cat = s.group_id ? serviceGroups.find((g) => g.id === s.group_id) : null;
    if (cat) bucket(cat.id, cat.name, cat.max_select ?? null).items.push(s);
    else bucket(s.group_label || "", s.group_label || "", null).items.push(s);
  }
  // The detailer's own category order, with anything ungrouped last — an
  // ungrouped service is one they have not filed yet, not the headline.
  const order = new Map(serviceGroups.map((g, i) => [g.id, i]));
  groups.sort((a, b) => (order.get(a.key) ?? 998) - (order.get(b.key) ?? 999));
  const showHeadings = groups.length > 1 || (groups[0]?.name ?? "") !== "";
  // THE INTRO LINE IS DROPPED WHERE THE CATEGORIES ALREADY SAY IT, and that
  // is a height decision as much as a copy one. With every category labelled
  // "choose one", the sentence repeats what is written three times further
  // down the screen — and it is 19px on a desktop and 38px on a phone (it
  // wraps), against a step whose whole budget belongs to the tenant.
  // MEASURED: with it, the owner's own six-service menu runs 19px past the
  // bottom at 1440x900; without it, that screen has 8px to spare. It stays
  // wherever the categories do NOT carry the rule, because there it is the
  // only thing on the page that says how many you may take.
  const allPickOne = groups.length > 0 && groups.every((g) => g.rule === 1);
  const intro = allPickOne && showHeadings
    ? null
    : "Choose one or more. You can add extras next.";

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
      {intro && <p className="bk-muted">{intro}</p>}
      {groups.map((g) => (
        <div key={g.key || "ungrouped"} className="bk-choices">
          {showHeadings && g.name && (
            <div className="bk-step-label bk-group">
              {g.name}
              {/* The rule is stated ON the category, before the customer picks
                  — not enforced silently afterwards. W25 exists because the
                  owner ticked two services and found it confusing; a swap he
                  did not expect would be the same complaint again. */}
              {g.rule === 1 && <span className="bk-group-rule"> · choose one</span>}
            </div>
          )}
          {g.items.map((s) => {
            const isOn = selected.includes(s.id);
            const features = Array.isArray(s.features) ? s.features.filter(Boolean) : [];
            const hasMore = !!s.description || features.length > 0;
            const shown = open.includes(s.id);
            return (
              // The card is a PLAIN box now, and the two things you can do to
              // it are two real buttons inside it. It was one div with
              // role="button" until W21; putting a second control inside that
              // would have been an interactive element nested in an
              // interactive element, which is the one thing role="button"
              // must not contain — some screen readers never reach it.
              <div key={s.id} className={`bk-card selectable bk-svc ${isOn ? "selected" : ""}`}>
                <div className="bk-svc-face">
                  {/* Price and length share a column. They are the two facts a
                      customer compares services ON, so putting them together
                      makes the comparison one glance down the right edge — and
                      it folds a whole line out of every card, which is 19px x
                      however many services the business lists (W16). */}
                  <button type="button" className="bk-pick" aria-pressed={isOn} onClick={() => onToggle(s.id)}>
                    <span className="bk-h3">{s.name}</span>
                    <span className="bk-svc-money">
                      {/* W9 — "from $220". The number is the same number; what
                          changes is what it claims to be. Every real detailer
                          menu studied publishes a floor rather than a promise,
                          because how dirty the car is decides the hours. */}
                      <span className="bk-price">
                        {s.price_is_from && <span className="bk-from">from </span>}
                        {money(s.price)}
                      </span>
                      <span className="bk-muted">about {duration(s.duration_minutes)}</span>
                    </span>
                  </button>
                  {hasMore && (
                    <button
                      type="button"
                      className={`bk-peek ${shown ? "on" : ""}`}
                      aria-expanded={shown}
                      aria-controls={`svc-more-${s.id}`}
                      aria-label={`What's included in ${s.name}`}
                      onClick={() => peek(s.id)}
                    >
                      <Eye size={18} strokeWidth={2} />
                    </button>
                  )}
                </div>
                {hasMore && (
                  // Collapsed to a zero-height grid row rather than unmounted,
                  // so it opens and closes with the same easing instead of
                  // appearing. `visibility` rides along so the words are out
                  // of the accessibility tree while they are out of sight —
                  // clipped text a screen reader still announces is worse than
                  // no disclosure at all.
                  <div id={`svc-more-${s.id}`} className={`bk-svc-more ${shown ? "on" : ""}`}>
                    <div>
                      <div className="bk-svc-body">
                        {s.description && <p className="bk-muted">{s.description}</p>}
                        {features.length > 0 && (
                          <ul className="bk-svc-list">
                            {features.map((f, i) => <li key={i}>{String(f)}</li>)}
                          </ul>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

