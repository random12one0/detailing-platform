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

import { useEffect, useState } from "react";
import { t } from "../../lib/i18n.js";
import { useLocale } from "../../hooks/useLocale.js";
import { money } from "../../lib/format.js";
import {
  isPlatformSizeText,
  maxVehicles, setVehicleCount, suggestVehicleSize, VEHICLE_CONDITIONS, vehicleCount,
  vehicleSizeExtra, vehicleSizesMatter,
} from "../core.js";
import { useBookingBusiness } from "../BookingBusinessContext.jsx";
import VehicleField from "../VehicleField.jsx";
import Refusal from "../Refusal.jsx";

// **ONLY OUR OWN WORDING IS TRANSLATED. A DETAILER'S IS NEVER TOUCHED, AND
// "IT HAS NO ENTRY" WAS NOT ENOUGH — measured 2026-09-12 on a scratch tenant.**
//
// Wrapping the tiers in `t()` earlier today made the platform's Small/Medium/
// Large translate, which is right, and quietly made a DETAILER'S OWN LABEL
// translate too whenever their word happened to be a key we hold. A detailer
// who renames the middle tier "Heavy" — heavy-duty vehicles — had it rendered
// to a Spanish customer as **"Fuerte"**, which is our word for how DIRTY a car
// is, from a different scale entirely. The comment below this used to say
// their word passes through because it has no entry; the collision case is
// exactly when it does.
//
// So the question is not "do we have a translation" but "is this OUR SENTENCE
// TO TRANSLATE" — and the only honest test of that is whether it still matches
// what the platform shipped for that tier. Rename anything, in any language,
// and it goes out exactly as typed. `DEFAULT_VEHICLE_SIZES` is the same
// constant `core.js` falls back to when a business has no list at all, so the
// two can never disagree about what "ours" means.
//
// **THE GENERAL RULE, WHICH IS THE PART WORTH REMEMBERING: `t()` TAKES
// PLATFORM COPY, NEVER A ROW OUT OF A TENANT'S TABLE.** Anywhere the two are
// mixed in one field, the ownership has to be re-established before the
// lookup, not assumed from a missing entry.
// The rule lives in `core.js` so the tier EDITOR answers it the same way — a
// second copy is how the customer's page and the detailer's page start
// disagreeing about whose words they are.
//
// **AND BOTH HALVES ARE TRANSLATED NOW, BY DIFFERENT FUNCTIONS.** Ours goes
// through `t()` and the product catalogue; THEIRS goes through `tx()` and
// their own rows, which until this change was the branch that did nothing at
// all. The detailer who renamed the middle tier "Heavy" still never gets
// "Fuerte" — `tx()` can only ever return what DeepL made of *their* word, or
// their word unchanged.
//
// **EXPORTED, BECAUSE STEP 5 PRINTS THE SAME LABEL** and was reading `.label`
// raw: a platform tier came out "Small" in English on an otherwise Spanish
// review page. One rule, two call sites, rather than a second shell that
// answers the ownership question slightly differently.
export const sizeText = (s, field, tx) =>
  (isPlatformSizeText(s, field) ? t(s[field]) : tx(s[field]));

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


export default function StepVehicle({ form, setForm, selectedServices, blocks = [], tried = false }) {
  useLocale();
  const { settings, tx } = useBookingBusiness();
  const sizes = settings.vehicle_sizes;
  // **THE QUESTION COMES OUT WHEN THE ANSWER ALREADY CAME FROM WHAT THEY
  // TYPED — Andrew's ask, 2026-09-14.** A confident match against the
  // detailer's own checklist (`core.js` § suggestVehicleSize) means there is
  // nothing to ask; the computed size is shown instead, with a way to open
  // the picker back up if it is wrong. Never silent — the sentence below the
  // vehicle field is what makes it not silent.
  const [manualOverride, setManualOverride] = useState(false);

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
  // TOUCHING THE CONTROL ENDS THE SUGGESTING, FOR THE REST OF THE BOOKING.
  const pick = (key) => setForm((f) => ({ ...f, vehicleSize: key, vehicleSizeChosen: true }));

  // THE SIZE THEIR CAR IMPLIES, IN THE DETAILER'S OWN TIERS — Andrew's ask,
  // 2026-09-13. `core.js` § suggestVehicleSize carries the whole argument,
  // including why it fails to null so readily; this is only the wiring.
  //
  // **ONE CAR ONLY.** Past one the sizes are a per-row <select> and the models
  // are typed in a different box each; suggesting into a row somebody is not
  // looking at is how a customer finds a price they never saw change.
  const suggested = !multi && sizesMatter && !form.vehicleSizeChosen
    ? suggestVehicleSize(form.vehicleModel, sizes)
    : null;
  const suggestedSize = suggested ? sizes.find((s) => s.key === suggested.key) : null;
  const suggestedKey = suggested?.key ?? null;
  useEffect(() => {
    // `vehicleSizeChosen` stays FALSE here, which is the point: every further
    // keystroke may still re-suggest, and only the customer's own tap stops it.
    // Keyed on the KEY rather than on the object — `suggestVehicleSize` returns
    // a fresh object every render, and an effect on that runs every keystroke.
    if (suggestedKey) {
      setForm((f) => (f.vehicleSize === suggestedKey ? f : { ...f, vehicleSize: suggestedKey }));
    }
  }, [suggestedKey]);

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
        {sizeText(s, "label", tx)}{extra > 0 ? ` · +${money(extra)}` : ""}
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
              <VehicleField
                ariaLabel={t("Vehicle {n}, what it is", { n: i + 1 })}
                value={at(i).model ?? ""}
                placeholder={t("Make and model")}
                onChange={(v) => edit(i, { model: v })}
              />
            </div>
          </div>
        ))
      ) : (
        <>
          {sizesMatter ? (
            suggestedSize && !manualOverride ? null : asList ? (
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
                          {/* **THROUGH `t()`, AND THE FALL-THROUGH IS THE
                              WHOLE DESIGN — 2026-09-12.** A review found
                              `Small / Coupe, sedan, hatchback` sitting in
                              English inside an otherwise fully Spanish step 3,
                              next to an already-translated `Incluido`.
                              These are BOTH platform constants and tenant
                              copy, which is why it is not a simple bug:
                              `DEFAULT_VEHICLE_SIZES` in `core.js` is ours, and
                              `business_settings.vehicle_sizes` is the
                              detailer's — and every business is seeded with a
                              stored copy of ours, so in practice the string on
                              screen is tenant data that happens to be our
                              words.
                              **THIS SAID `t()` RESOLVED IT WITHOUT HAVING TO
                              TELL THEM APART, BECAUSE A RENAMED TIER HAS NO
                              CATALOGUE ENTRY. THAT WAS WRONG BY A DAY** — it
                              is true right up until the detailer's own word IS
                              one of our keys, and then their word is silently
                              replaced. `sizeText` at the top of this file is
                              the correction and carries the measurement.
                              **AND THIS IS WHY THE SPANISH SUITE PASSED WITH
                              THEM IN ENGLISH:** check 1b demands an entry for
                              every `t()` CALL SITE, and a lookup on a variable
                              is not one — so these strings were invisible to
                              it before AND after the wrapping. What covers
                              them is `spanish` § 1g, which walks
                              `DEFAULT_VEHICLE_SIZES` itself. */}
                          <h3>{sizeText(s, "label", tx)}</h3>
                          {s.examples && <p className="bk-muted">{sizeText(s, "examples", tx)}</p>}
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

          {/* A <div>, not a <label>, since roadmap 8.21. A label forwards every
              click inside it to its control, and the suggestion list is now
              inside it — so a tap on "Subaru Outback" would re-focus the input
              and fight the press that was choosing it. The field carries its
              own aria-label instead, which is a stronger association than
              the wrapping ever was. */}
          <div className="bk-field">
            <span>{t("What are you bringing? (optional)")}</span>
            <VehicleField
              ariaLabel={t("What are you bringing? (optional)")}
              value={form.vehicleModel}
              placeholder={t("e.g. Honda Civic")}
              onChange={(v) => setForm((f) => ({ ...f, vehicleModel: v }))}
            />
            {/* THE "WHY", AND IT SITS UNDER THE BOX THAT CAUSED IT RATHER THAN
                UNDER THE SIZE IT CHANGED. A customer who types "Suburban" and
                sees a card light up two blocks above has been given a price
                with no explanation; the sentence goes where the typing is.

                **IT QUOTES THE WORD THAT WAS RECOGNISED, NOT THE WHOLE FIELD.**
                "2019 Chevrolet Suburban · set to Large" restates the box one
                inch above it, which is his standing rule against copy that
                explains what the control already said — and it wrapped onto two
                lines at 392. "Suburban · set to Large" is his own sentence, in
                his own shape, on one line. The tier is named in the DETAILER'S
                word, so it is true on a business whose sizes are called
                anything at all.

                **AND NOW IT CARRIES THE "CHANGE IT" LINK — 2026-09-14.** The
                card used to be right there, two blocks up, outlined and
                tappable, so a link here would have told somebody a control does
                what it visibly does. Andrew's own design removed that card
                the moment a match is confident, so the only way back to it is
                this sentence: never silent, and never a dead end. */}
            {/* **NOT A HINT — A STATEMENT ABOUT THEIR PRICE, 2026-09-14.**
                Andrew's own rule is that a wrong guess quoting the wrong price
                is worse than not guessing at all, which only holds if the
                customer actually notices this line: it just added money to
                their total without them choosing anything. `bk-muted`'s dim,
                small hint-text styling buried it. This is `.bk-price-fact` —
                normal body size and the page's full-contrast text color —
                and it stays a quiet FACT rather than a banner or an alert:
                no background, no border, no icon. Just legible. */}
            {suggestedSize && !manualOverride && (
              <p className="bk-price-fact" role="status">
                {t("{vehicle} · set to {size}", {
                  vehicle: suggested.matched,
                  size: sizeText(suggestedSize, "label", tx),
                })}{" "}
                <button type="button" className="bk-linklike bk-price-fact-change" onClick={() => setManualOverride(true)}>
                  {t("Not right?")}
                </button>
              </p>
            )}
          </div>
        </>
      )}

      {/* **THE YEAR IS OPTIONAL — Andrew, 2026-09-20.** It REPLACES his
          2026-09-14 ask that made it required, and the reversal is written
          down rather than quietly applied: it is a nice-to-have that helps him
          identify the car, and it was never asked for properly — the box above
          said "(optional)" and this one said nothing, so a customer read
          neither as required and then met a Continue button that would not
          move. `core.js` no longer emits `no-year`, so there is nothing left
          here to refuse with, and the red line and the "have they touched it
          yet" bookkeeping went with it.

          **THE LABEL CARRIES BOTH FACTS.** "or estimate" kills the hunt for
          the exact number, and "(optional)" is worded and placed exactly like
          the box above so the two read as one pair rather than as two
          different kinds of question. The sentence under it stays — it is the
          one that tells somebody an approximate answer is welcome. */}
      <label className="bk-field bk-year">
        <span>{t("Year or estimate (optional)")}</span>
        <input
          inputMode="numeric"
          maxLength={4}
          value={form.vehicleYear}
          placeholder={t("e.g. 2019")}
          onChange={(e) => setForm((f) => ({ ...f, vehicleYear: e.target.value.replace(/[^0-9]/g, "").slice(0, 4) }))}
        />
      </label>
      <p className="bk-muted" style={{ marginTop: -8 }}>
        {t("An estimate is fine — it does not have to be exact.")}
      </p>

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
            {t("It doesn’t change your price. It tells us what to bring.")}
          </p>
        </div>
      )}
      {/* This step can only be refused while the price is still being worked
          out, which clears itself in a second — so this is almost never seen.
          It is here anyway: "almost never" is what made the other four steps
          silent for months, and a step that can refuse must be able to say
          so. */}
      <Refusal blocks={blocks} tried={tried} />
    </>
  );
}
