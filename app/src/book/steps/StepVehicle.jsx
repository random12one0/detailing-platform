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
//
// ROADMAP 8.10 — MORE THAN ONE CAR, AND IT COSTS THIS STEP NOTHING BECAUSE
// THE SECOND CAR TAKES THE CARDS AWAY. This step has 39px of spare room at
// 392 and 23px at 1440x900, so a control ADDED to it is a control measured
// against almost nothing. The way through is that the card list and the
// per-vehicle list are alternatives rather than additions: past one vehicle
// the sizes become the same drop-down this step already switches to past four
// sizes, which is roughly 260px shorter than the cards and pays for every
// row the extra cars cost.
//
// A ONE-CAR BUSINESS SEES NONE OF IT. `max_vehicles_per_booking` is 1 for
// every business until a detailer says otherwise, and at 1 this file renders
// exactly what it rendered before the item.

import { t } from "../../lib/i18n.js";
import { useLocale } from "../../hooks/useLocale.js";
import { money } from "../../lib/format.js";
import {
  maxVehicles, setVehicleCount, VEHICLE_CONDITIONS, vehicleCount,
  vehicleSizeExtra, vehicleSizesMatter,
} from "../core.js";
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
  useLocale();
  const { settings } = useBookingBusiness();
  const sizes = settings.vehicle_sizes;

  // The size arithmetic, the four-way condition scale and the vehicle count
  // are `core.js`'s — they decide what reaches `bookings`. The CEILING above
  // stays here, because it is a height measurement taken against this page's
  // own type.
  const sizeExtra = (key) => vehicleSizeExtra(selectedServices, key);
  const sizesMatter = vehicleSizesMatter(sizes, selectedServices);
  const cap = maxVehicles(settings);
  const count = vehicleCount(form);
  const multi = count > 1;
  const asList = multi || sizes.length > SIZE_CARD_CEILING;
  const pick = (key) => setForm((f) => ({ ...f, vehicleSize: key }));

  const setCount = (n) =>
    setForm((f) => ({ ...f, extraVehicles: setVehicleCount(f, n, settings) }));

  // The size and the model of one vehicle, whichever it is. Vehicle 1 lives
  // in the two fields it has always lived in; the rest are entries in
  // `form.extraVehicles`, which is the same split the database keeps.
  const at = (i) => (i === 0
    ? { size: form.vehicleSize, model: form.vehicleModel }
    : (form.extraVehicles?.[i - 1] ?? { size: form.vehicleSize, model: "" }));

  const edit = (i, patch) => setForm((f) => (i === 0
    ? { ...f, ...("size" in patch ? { vehicleSize: patch.size } : {}), ...("model" in patch ? { vehicleModel: patch.model } : {}) }
    : { ...f, extraVehicles: (f.extraVehicles ?? []).map((v, j) => (j === i - 1 ? { ...v, ...patch } : v)) }));

  const sizeOptions = sizes.map((s) => {
    const extra = sizeExtra(s.key);
    return (
      <option key={s.key} value={s.key}>
        {s.label}{extra > 0 ? ` — +${money(extra)}` : ""}
      </option>
    );
  });

  return (
    <>
      {cap > 1 && (
        <div className="bk-field">
          <span>{t("How many vehicles?")}</span>
          <div className="bk-chips">
            {Array.from({ length: cap }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                type="button"
                className={`bk-chip word ${count === n ? "selected" : ""}`}
                aria-pressed={count === n}
                onClick={() => setCount(n)}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      )}

      {multi && (
        // *"There should be options if someone wants to book two cars, they
        // could set it for two different days without having to create two
        // different bookings."* One question, two answers, and it changes
        // both the price and the length of the appointment — so it is asked
        // here, beside the count it depends on, rather than on the step where
        // the days are picked.
        <div className="bk-field">
          <span>{t("All on one day?")}</span>
          <div className="bk-chips">
            <button
              type="button"
              className={`bk-chip word ${form.splitDays ? "" : "selected"}`}
              aria-pressed={!form.splitDays}
              onClick={() => setForm((f) => ({ ...f, splitDays: false }))}
            >
              {t("Same day")}
            </button>
            <button
              type="button"
              className={`bk-chip word ${form.splitDays ? "selected" : ""}`}
              aria-pressed={!!form.splitDays}
              onClick={() => setForm((f) => ({ ...f, splitDays: true }))}
            >
              {t("Different days")}
            </button>
          </div>
        </div>
      )}

      {multi ? (
        // ONE ROW PER CAR. Each is priced in full — the review step lists
        // them — and only the SETUP time is saved, which is the detailer's
        // own setting and the owner's own sentence.
        Array.from({ length: count }, (_, i) => (
          <div className="bk-field" key={i}>
            {/* **"Vehicle 1" RATHER THAN "1st vehicle" SINCE ROADMAP 8.17,
                and the reason is the translation rather than the English.** An
                English ordinal is not a placeholder any other language can
                use — "1.º vehículo" is stilted and "Vehículo 1st" is wrong —
                so the ORDINAL had to stop being interpolated. This is my own
                micro-copy from 8.10 rather than anything he ruled on, and
                "Vehicle 2" is at least as clear as "2nd vehicle" on a row that
                repeats. */}
            <span>{t("Vehicle {n}", { n: i + 1 })}</span>
            {/* Two fields where there are two. A business whose services
                price every size the same asks no size question at all, and a
                lone input in a two-column grid would sit at half width for
                no reason. */}
            <div className={sizesMatter ? "bk-vehicle" : ""}>
              {sizesMatter && (
                <select
                  aria-label={t("Vehicle {n} size", { n: i + 1 })}
                  value={at(i).size}
                  onChange={(e) => edit(i, { size: e.target.value })}
                >
                  {sizeOptions}
                </select>
              )}
              {/* A SHORTER PLACEHOLDER THAN THE ONE-CAR FIELD, because this
                  input is half a phone wide and "e.g. 2019 Honda Civic" is cut
                  off mid-word in it — measured, not guessed. The one-car
                  version below keeps the fuller example, which is what makes
                  the field obviously optional. */}
              <input
                aria-label={t("Vehicle {n}, what it is", { n: i + 1 })}
                value={at(i).model ?? ""}
                placeholder={t("Make and model")}
                onChange={(e) => edit(i, { model: e.target.value })}
              />
            </div>
          </div>
        ))
      ) : (
        <>
          {sizesMatter ? (
            asList ? (
              <label className="bk-field">
                <span>{t("Vehicle size")}</span>
                <select value={form.vehicleSize} onChange={(e) => pick(e.target.value)}>
                  {sizeOptions}
                </select>
              </label>
            ) : (
              <div className="bk-choices">
                <p className="bk-muted">{t("Bigger vehicles take longer, so pricing varies.")}</p>
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
                        <span className="bk-price">{extra > 0 ? `+${money(extra)}` : t("Included")}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            <p className="bk-muted">{t("One price for every vehicle.")}</p>
          )}

          <label className="bk-field">
            <span>{t("What are you bringing? (optional)")}</span>
            <input
              value={form.vehicleModel}
              placeholder={t("e.g. 2019 Honda Civic")}
              onChange={(e) => setForm((f) => ({ ...f, vehicleModel: e.target.value }))}
            />
          </label>
        </>
      )}

      {/* W27. One row of four, which is the whole reason it is chips and not
          cards: it is a fact about the car, not a thing being bought, and this
          step's height is already the tenant's budget. It never touches the
          price — the review step says so in as many words. */}
      {settings.ask_vehicle_condition && (
        <div className="bk-field">
          <span>{t("How dirty is the inside?")}</span>
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
                {/* **THE LABEL COMES FROM `core.js`, WHICH MAY NOT IMPORT
                    ANYTHING — and English-as-key is what makes that free.**
                    `t("Light")` needs no plumbing back into a module that has
                    to stay droppable into somebody else's site; the constant
                    keeps saying English and the render site translates it. */}
                {t(label)}
              </button>
            ))}
          </div>
          <p className="bk-muted" style={{ marginTop: 6 }}>
            {t("It doesn’t change your price — it tells us what to bring.")}
          </p>
        </div>
      )}
    </>
  );
}
