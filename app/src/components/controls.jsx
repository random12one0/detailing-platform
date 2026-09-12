// The settings vocabulary.
//
// Every one of these exists because a raw <input> was asking the detailer to
// do a conversion in their head. The storage units are unchanged — only what
// you touch is different.

import { useState } from "react";
import { Check, Eye, EyeOff, Minus, Plus, ChevronRight } from "lucide-react";
// ROADMAP 8.17 STAGE 2B — the DASHBOARD's language (`dp.lang.app`), never
// the booking page's. `useAppLocale()` goes in every component that renders
// translated text: once at the root works only until something is memoised.
import { t } from "../lib/appI18n.js";
import { useAppLocale } from "../hooks/useAppLocale.js";

// A row: what it is on the left, the control on the right, and a plain
// sentence underneath saying what it does. The sentence is the point — a
// label alone tells you the name of a setting, not its consequence.
export function Setting({ label, help, children, stacked = false }) {
  return (
    <div className={`setting${stacked ? " stacked" : ""}`}>
      <div className="setting-text">
        <div className="setting-label">{label}</div>
        {help && <p className="setting-help">{help}</p>}
      </div>
      <div className="setting-control">{children}</div>
    </div>
  );
}

// A real switch rather than a checkbox: the whole row is the target, and the
// thumb makes the state readable across the room.
export function Switch({ checked, onChange, label, help, bare = false, disabled = false }) {
  // `bare` is the switch on its own, for rows that already carry their own
  // heading and description (the day sheet). Without it the component
  // renders a second label beside the one already there.
  if (bare) {
    // **A BARE SWITCH WITH NO LABEL IS A CONTROL THAT ANNOUNCES ITSELF AS
    // "switch, on" AND NOTHING ELSE — 2026-09-12.** `bare` exists so a row
    // that already carries its own heading does not print the name twice, and
    // the cost of that is the name living entirely on `aria-label`. One caller
    // passed a value that could be empty and shipped a nameless toggle.
    // **The FIX BELONGS HERE, not at the call site that was caught.** The
    // instance was fixed first and the same construction was sitting two
    // screens away, which is the "Text these 1" / "Email these 1" shape this
    // repo keeps meeting. `tests/composition` now fails any `<Switch bare`
    // with no `label`, so the class cannot come back silently.
    if (!label && typeof console !== "undefined") {
      console.error("Switch: `bare` needs a `label` — it is the control's only accessible name.");
    }
    // **AND IT WAS ON THE WRONG ELEMENT — corrected 2026-09-12.** `aria-label`
    // sat on the `<label>`, which names the LABEL and not the control inside
    // it. A `<label>` normally names its input through its TEXT — and a bare
    // switch has none, by definition — so the input had no accessible name at
    // all and announced as "switch, on".
    // **Two people measured this and both were right**: reading `label.switch`
    // found the attribute, reading `input[type=checkbox]` found nothing,
    // because they are different elements. **The INPUT is the control**, so
    // that is where the name goes.
    return (
      <label className={`switch${checked ? " on" : ""}`}>
        <input type="checkbox" checked={!!checked} disabled={disabled}
          aria-label={label || undefined}
          onChange={(e) => onChange(e.target.checked)} />
        <span className="knob" />
      </label>
    );
  }
  return (
    // `disabled` reached the bare form and was DROPPED here, which mattered
    // the moment a switch got a state it must refuse to leave: push, when
    // the browser has blocked notifications for the site. A switch that
    // looks live and silently does nothing is the defect this whole stage
    // is repairing, one level down.
    <label className={`setting switch-row${disabled ? " is-disabled" : ""}`}>
      <div className="setting-text">
        <div className="setting-label">{label}</div>
        {help && <p className="setting-help">{help}</p>}
      </div>
      <span className={`switch${checked ? " on" : ""}`}>
        <input type="checkbox" checked={!!checked} disabled={disabled}
          onChange={(e) => onChange(e.target.checked)} />
        <span className="knob" />
      </span>
    </label>
  );
}

// Two to four mutually exclusive options. Used where the old UI had separate
// checkboxes that could contradict each other — a segmented control cannot
// represent the invalid state at all.
// `label` names the group for a screen reader. Optional, because most of
// these sit under a visible heading that already names them; Money's period
// switch does not, and a radiogroup with no accessible name is a control
// that announces five unrelated radios.
export function Segmented({ value, onChange, options, disabled = false, label }) {
  useAppLocale();
  return (
    <div className={`segmented${disabled ? " is-disabled" : ""}`} role="radiogroup" aria-label={label}>
      {options.map(([v, label]) => (
        <button key={v} type="button" role="radio" aria-checked={value === v}
          disabled={disabled}
          className={value === v ? "on" : ""} onClick={() => onChange(v)}>
          {t(label)}
        </button>
      ))}
    </div>
  );
}

// The big one. A duration written the way a person says it, with a Custom
// escape hatch that only appears if you need it.
//
// The presets ARE the answer nearly every time; "1 day" is one tap instead of
// working out that the field wants 1440. `unit` is what the DATABASE stores,
// so nothing about the schema changes.
export function DurationChoice({ value, onChange, presets, unit = "minutes", allowCustom = true, customMax = 100000 }) {
  useAppLocale();
  const num = value === "" || value === null || value === undefined ? null : Number(value);
  const isPreset = presets.some(([v]) => v === num);
  const custom = num !== null && !isPreset;

  return (
    <div className="choice-wrap">
      <div className="choices">
        {presets.map(([v, label]) => (
          <button key={String(v)} type="button" aria-pressed={num === v}
            className={`choice${num === v ? " on" : ""}`} onClick={() => onChange(v)}>
            {t(label)}
          </button>
        ))}
        {allowCustom && (
          <button type="button" aria-pressed={custom}
            className={`choice${custom ? " on" : ""}`}
            onClick={() => { if (!custom) onChange(presets[presets.length - 1][0]); }}>
            {t("Custom")}
          </button>
        )}
      </div>
      {custom && (
        <div className="row" style={{ gap: "var(--sp-2)", marginTop: "var(--sp-2)" }}>
          <input type="number" inputMode="numeric" min={0} max={customMax} value={num}
            onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))}
            style={{ maxWidth: 120 }}
            aria-label={t("Custom value in {unit}", { unit: t(unit) })} />
          <span className="quiet">{t(unit)}</span>
        </div>
      )}
    </div>
  );
}

// A small whole number you nudge rather than type — and an explicit "no
// limit", because an empty box meaning unlimited is a guess the user has to
// make. `null` is the unlimited value in the database.
export function Stepper({ value, onChange, min = 1, max = 99, suffix, unlimitedLabel }) {
  useAppLocale();
  const unlimited = value === null || value === undefined || value === "";
  const n = unlimited ? min : Number(value);
  return (
    <div className="stepper-wrap">
      {unlimitedLabel && (
        <button type="button" className={`choice${unlimited ? " on" : ""}`}
          onClick={() => onChange(unlimited ? min : null)} aria-pressed={unlimited}>
          {unlimited && <Check size={13} strokeWidth={2.5} />} {t(unlimitedLabel)}
        </button>
      )}
      {!unlimited && (
        <div className="stepper">
          <button type="button" aria-label={t("Less")} disabled={n <= min}
            onClick={() => onChange(Math.max(min, n - 1))}><Minus size={16} strokeWidth={2.5} /></button>
          <span className="num">{n}{suffix ? ` ${t(suffix)}` : ""}</span>
          <button type="button" aria-label={t("More")} disabled={n >= max}
            onClick={() => onChange(Math.min(max, n + 1))}><Plus size={16} strokeWidth={2.5} /></button>
        </div>
      )}
    </div>
  );
}

// Money. The currency sits INSIDE the field so the number is what you type,
// and the numeric keypad opens on a phone.
export function MoneyField({ value, onChange, placeholder = "0" }) {
  return (
    <div className="money-field">
      <span aria-hidden="true">$</span>
      <input type="number" inputMode="decimal" min={0} step="1" placeholder={placeholder}
        value={value ?? ""} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

// An hour of the day, shown the way a clock shows it. Stored as 0–23.
export function HourChoice({ value, onChange }) {
  const hours = Array.from({ length: 24 }, (_, h) => h);
  const label = (h) => {
    const ampm = h < 12 ? "AM" : "PM";
    const twelve = h % 12 === 0 ? 12 : h % 12;
    return `${twelve}:00 ${ampm}`;
  };
  return (
    <select value={value ?? 7} onChange={(e) => onChange(Number(e.target.value))} style={{ maxWidth: 150 }}>
      {hours.map((h) => <option key={h} value={h}>{label(h)}</option>)}
    </select>
  );
}

// **SETTINGS THAT HAVE A DEFAULT NOBODY CHANGES — 2026-09-12.**
//
// Booking rules stood nineteen `Setting` rows open at once and Notifications
// twenty-four. More grouping was not the answer: Booking rules already had
// five groups. **The answer is that most of these have a default a detailer
// will never touch, so they should not all be standing open** — and the
// product already solved this exact problem on the Business tab, where a row
// reads *"Hours & days off · Tue-Sat · 8:00 AM - 6:00 PM"* and opens onto the
// screen behind it.
//
// **SO THIS IS THAT ROW, NOT A NEW ONE.** `.nav-row` is the Business tab's own
// markup — icon slot, name, live summary, chevron — wrapped in the native
// `<details>` the product already uses for `.disclose`. Two existing patterns
// meeting, which is why it takes no script and no ARIA of its own: a
// `<summary>` is already a button that announces its own expanded state.
//
// **THE SUMMARY MUST STATE THE CURRENT SETTING IN WORDS.** A row that says
// only "Reminders" has hidden something; a row that says "Reminders · one the
// day before, one three hours out" has ANSWERED it, and opening is then a
// choice rather than a search. A caller that cannot write that sentence should
// leave its settings open instead.
export function Folded({ name, now, children }) {
  return (
    <details className="foldrow">
      <summary className="nav-row">
        <span className="txt">
          <span className="name">{name}</span>
          <span className="now">{now}</span>
        </span>
        <span className="chev" aria-hidden="true">
          <ChevronRight size={18} strokeWidth={2} />
        </span>
      </summary>
      <div className="foldrow-body">{children}</div>
    </details>
  );
}

// A group of settings under one heading, with an optional sentence framing
// what the whole group is for.
export function Group({ title, blurb, children }) {
  return (
    <section className="tight" style={{ marginBottom: "var(--sp-5)" }}>
      <span className="label">{title}</span>
      {blurb && <p className="quiet" style={{ marginBottom: 2 }}>{blurb}</p>}
      <div className="card setting-card">{children}</div>
    </section>
  );
}

/* ── a password box you can read ────────────────────────────────────────── */
// His note, 2026-09-10: *"There should be an option to view it, like a little
// eyeball. Do the same in the other places where you input your password. I
// feel like that's just a standard thing."* It is, and this product had it in
// none of its six password fields.
//
// **IT IS NOT A CONVENIENCE, IT IS THE FIX FOR A LOCKOUT.** Every one of these
// fields is somewhere a typo costs something real: the change-password screen
// asks for a password twice and rejects a mismatch with no way to see which of
// the two was wrong, and the sign-in screen locks somebody out of their own
// business over a fat thumb on a phone. Being able to look is how a person
// resolves that without a support call.
//
// **IT STARTS HIDDEN AND NEVER REMEMBERS.** Shoulder-surfing is the thing the
// dots are for, and a control that stayed revealed across screens would quietly
// turn the protection off for good on a shared van tablet.
//
// The button is `type="button"`: inside a `<label>` in a `<form>`, a bare
// button submits, so the first press of an eye would have tried to sign in.
export function PasswordInput({ value, onChange, ...rest }) {
  const [shown, setShown] = useState(false);
  return (
    <span className="pwwrap">
      <input {...rest} type={shown ? "text" : "password"} value={value} onChange={onChange} />
      <button type="button" className="pweye" aria-pressed={shown}
        aria-label={shown ? t("Hide password") : t("Show password")}
        onClick={() => setShown((v) => !v)}>
        {shown ? <EyeOff size={16} strokeWidth={2} /> : <Eye size={16} strokeWidth={2} />}
      </button>
    </span>
  );
}
