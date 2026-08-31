// Add-ons, on their own step. Roadmap 2.7, W19: "add-ons get their own step,
// in the same format as the services step."
//
// They used to be a ruled checklist at the bottom of the vehicle step, and
// the comment there gave a real reason: the boxes on that step were the
// vehicle sizes you choose BETWEEN, so a second set of boxes would have made
// two competing groups of one shape. That reason belonged to sharing a step.
// Alone here there is nothing to compete with, so they take the services
// step's own shape — which is what he asked for, and what makes the two
// "what do you want" questions read as the same question asked twice.
//
// The step only exists when the business has add-ons; the flow is built in
// BookingPage.jsx.

import { money } from "../../lib/format.js";
import { useBookingBusiness } from "../BookingBusinessContext.jsx";

export default function StepExtras({ selected, onToggle }) {
  const { addOns } = useBookingBusiness();

  return (
    // One flow container, one flex child of .bk-wrap. Without it every card
    // is its own page section at the 26px SECTION gap — the W18 defect, and
    // the same cause as .bk-step-head and .bk-cal-block.
    <div className="bk-choices">
      <p className="bk-muted">Optional. Skip it if you don’t need any.</p>
      {addOns.map((a) => {
        const on = selected.includes(a.id);
        return (
          <div
            key={a.id}
            role="button"
            tabIndex={0}
            aria-pressed={on}
            className={`bk-card selectable ${on ? "selected" : ""}`}
            onClick={() => onToggle(a.id)}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onToggle(a.id); } }}
          >
            <div className="bk-row between">
              <h3>{a.name}</h3>
              <span className="bk-price">+{money(a.price)}</span>
            </div>
            {a.description && <p className="bk-muted" style={{ marginTop: 4 }}>{a.description}</p>}
          </div>
        );
      })}
    </div>
  );
}
