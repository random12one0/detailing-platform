// The settings vocabulary.
//
// Every one of these exists because a raw <input> was asking the detailer to
// do a conversion in their head. The storage units are unchanged — only what
// you touch is different.

import { Check, Minus, Plus } from "lucide-react";

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
    return (
      <label className={`switch${checked ? " on" : ""}`} aria-label={label}>
        <input type="checkbox" checked={!!checked} disabled={disabled}
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
  return (
    <div className={`segmented${disabled ? " is-disabled" : ""}`} role="radiogroup" aria-label={label}>
      {options.map(([v, label]) => (
        <button key={v} type="button" role="radio" aria-checked={value === v}
          disabled={disabled}
          className={value === v ? "on" : ""} onClick={() => onChange(v)}>
          {label}
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
  const num = value === "" || value === null || value === undefined ? null : Number(value);
  const isPreset = presets.some(([v]) => v === num);
  const custom = num !== null && !isPreset;

  return (
    <div className="choice-wrap">
      <div className="choices">
        {presets.map(([v, label]) => (
          <button key={String(v)} type="button" aria-pressed={num === v}
            className={`choice${num === v ? " on" : ""}`} onClick={() => onChange(v)}>
            {label}
          </button>
        ))}
        {allowCustom && (
          <button type="button" aria-pressed={custom}
            className={`choice${custom ? " on" : ""}`}
            onClick={() => { if (!custom) onChange(presets[presets.length - 1][0]); }}>
            Custom
          </button>
        )}
      </div>
      {custom && (
        <div className="row" style={{ gap: "var(--sp-2)", marginTop: "var(--sp-2)" }}>
          <input type="number" inputMode="numeric" min={0} max={customMax} value={num}
            onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))}
            style={{ maxWidth: 120 }} aria-label={`Custom value in ${unit}`} />
          <span className="quiet">{unit}</span>
        </div>
      )}
    </div>
  );
}

// A small whole number you nudge rather than type — and an explicit "no
// limit", because an empty box meaning unlimited is a guess the user has to
// make. `null` is the unlimited value in the database.
export function Stepper({ value, onChange, min = 1, max = 99, suffix, unlimitedLabel }) {
  const unlimited = value === null || value === undefined || value === "";
  const n = unlimited ? min : Number(value);
  return (
    <div className="stepper-wrap">
      {unlimitedLabel && (
        <button type="button" className={`choice${unlimited ? " on" : ""}`}
          onClick={() => onChange(unlimited ? min : null)} aria-pressed={unlimited}>
          {unlimited && <Check size={13} strokeWidth={2.5} />} {unlimitedLabel}
        </button>
      )}
      {!unlimited && (
        <div className="stepper">
          <button type="button" aria-label="Less" disabled={n <= min}
            onClick={() => onChange(Math.max(min, n - 1))}><Minus size={16} strokeWidth={2.5} /></button>
          <span className="num">{n}{suffix ? ` ${suffix}` : ""}</span>
          <button type="button" aria-label="More" disabled={n >= max}
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
