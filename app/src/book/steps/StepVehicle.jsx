// The vehicle: its size, what it is, and how dirty it is.
//
// Sizes are offered only when the chosen services actually price them
// differently: a business whose services have zero size adjustments never
// sees a question it has no answer for.
//
// ADD-ONS LEFT THIS STEP in roadmap 2.7 (W19) — they are ./StepExtras.jsx
// now. They were the tallest block on the page: 158px of ruled checklist
// under three boxes and a text field, which is what made this the worst step
// in the flow for W16 (222px past the bottom of a phone, 26% of the screen).
//
// ROADMAP 2.8b changed two things here, and both came from the owner:
//   W9   THE SIZES ARE THE DETAILER'S OWN LIST. Not our small/medium/large.
//        One of the five real menus researched uses twelve vehicle classes,
//        one uses five, one has none at all — so the list is theirs, and this
//        step has to render whatever they wrote. Past the card ceiling below
//        it becomes a drop-down, because twelve boxes do not fit a phone.
//   W27  HOW DIRTY IS IT. Nearly every real booking form asks; it is the one
//        field the research found that we did not have. It is INFORMATION,
//        never arithmetic — the trade prices condition after inspection — and
//        it is what makes a "from" price honest rather than evasive.

import { money } from "../../lib/format.js";
import { VEHICLE_CONDITIONS, vehicleSizeExtra, vehicleSizesMatter } from "../core.js";
import { useBookingBusiness } from "../BookingBusinessContext.jsx";

// Past this many sizes the cards become a drop-down. MEASURED, not chosen,
// and RE-MEASURED after W27 landed on this same step — which is the whole
// reason it is 4 and not the 6 the research predicted. The condition question
// costs 120px of step 3, so the number that mattered moved:
//
//   sizes | 392x844        | 1440x900
//   4     | fits, 39 spare | fits, 23 spare
//   5     | OVER by 40     | OVER by 66
//
// So four cards, and a drop-down from five. That lands exactly where the
// design system already put the line — a choice of two to four is a
// segmented control, anything longer is a list — so the measurement and law
// agree rather than fight. composition.test.mjs test 2 forbids a hand-written
// <select> of 2–4 options; this one is built from .map() and only ever draws
// at five or more.
const SIZE_CARD_CEILING = 4;

export default function StepVehicle({ form, setForm, selectedServices }) {
  const { settings } = useBookingBusiness();
  const sizes = settings.vehicle_sizes;

  // The size arithmetic and the four-way condition scale are `core.js`'s —
  // they decide what reaches `bookings`. The CEILING above stays here,
  // because it is a height measurement taken against this page's own type.
  const sizeExtra = (key) => vehicleSizeExtra(selectedServices, key);
  const sizesMatter = vehicleSizesMatter(sizes, selectedServices);
  const asList = sizes.length > SIZE_CARD_CEILING;
  const pick = (key) => setForm((f) => ({ ...f, vehicleSize: key }));

  return (
    <>
      {sizesMatter ? (
        asList ? (
          <label className="bk-field">
            <span>Vehicle size</span>
            <select value={form.vehicleSize} onChange={(e) => pick(e.target.value)}>
              {sizes.map((s) => {
                const extra = sizeExtra(s.key);
                return (
                  <option key={s.key} value={s.key}>
                    {s.label}{extra > 0 ? ` — +${money(extra)}` : ""}
                  </option>
                );
              })}
            </select>
          </label>
        ) : (
          <div className="bk-choices">
            <p className="bk-muted">Bigger vehicles take longer, so pricing varies.</p>
            {sizes.map((s) => {
              const extra = sizeExtra(s.key);
              return (
                <div
                  key={s.key}
                  role="button"
                  tabIndex={0}
                  aria-pressed={form.vehicleSize === s.key}
                  className={`bk-card selectable ${form.vehicleSize === s.key ? "selected" : ""}`}
                  onClick={() => pick(s.key)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(s.key); } }}
                >
                  <div className="bk-row between">
                    <div>
                      <h3>{s.label}</h3>
                      {s.examples && <p className="bk-muted">{s.examples}</p>}
                    </div>
                    <span className="bk-price">{extra > 0 ? `+${money(extra)}` : "Included"}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        <p className="bk-muted">One price for every vehicle.</p>
      )}

      <label className="bk-field">
        <span>What are you bringing? (optional)</span>
        <input
          value={form.vehicleModel}
          placeholder="e.g. 2019 Honda Civic"
          onChange={(e) => setForm((f) => ({ ...f, vehicleModel: e.target.value }))}
        />
      </label>

      {/* W27. One row of four, which is the whole reason it is chips and not
          cards: it is a fact about the car, not a thing being bought, and this
          step's height is already the tenant's budget. It never touches the
          price — the review step says so in as many words. */}
      {settings.ask_vehicle_condition && (
        <div className="bk-field">
          <span>How dirty is the inside?</span>
          <div className="bk-chips">
            {VEHICLE_CONDITIONS.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                className={`bk-chip word ${form.vehicleCondition === key ? "selected" : ""}`}
                aria-pressed={form.vehicleCondition === key}
                onClick={() => setForm((f) => ({
                  ...f,
                  vehicleCondition: f.vehicleCondition === key ? "" : key,
                }))}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="bk-muted" style={{ marginTop: 6 }}>
            It doesn’t change your price — it tells us what to bring.
          </p>
        </div>
      )}
    </>
  );
}
