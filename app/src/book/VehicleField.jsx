// "WHAT ARE YOU BRINGING?" — the one free-text field in the booking flow, with
// real cars offered under it.
//
// Andrew, 2026-09-13: *"a lot of people just type in Toyota or Lexus or they
// just put Outback"*, and he does not want them scrolling to find their car.
// So this is a type-ahead and never a list: nothing is browsable, nothing is
// required, and the customer who types "my wife's van" is not stopped.
//
// **THE FIELD IS STILL OPTIONAL FREE TEXT. THAT IS THE WHOLE CONTRACT.**
// `onChange` fires with exactly what was typed, every keystroke. Choosing a
// suggestion is the only thing that ever rewrites the box, and a customer who
// chooses nothing submits their own words untouched. Nothing here can refuse
// an answer — a picker that refuses is worse than the text box it replaced.
//
// **THIS FIELD STILL NEVER TOUCHES THE SIZE CHOICE, AND SINCE 2026-09-13 THE
// STEP AROUND IT DOES — Andrew asked for the auto-detect directly.** The two
// are not the same thing and the distinction is the whole safety argument:
// the INDEX is still never consulted about size. It comes from NHTSA vPIC,
// which tags a Camry as a car in some model years and an MPV in others, so a
// tier derived from it would quote some customers the wrong price.
// `core.js` § suggestVehicleSize matches the typed words against a small fixed
// table of body words and then against the DETAILER'S OWN tier descriptions,
// suggests visibly, says why, and stops dead the moment the customer touches
// the control. Nothing it does is silent and nothing it does is derived from
// this file's data.
//
// THE SUGGESTIONS FLOAT RATHER THAN SITTING IN THE FLOW, and that is a
// measurement rather than a taste: step 3 has 39px of spare room at 392 and
// 23px at 1440 (the ceiling comment in StepVehicle.jsx), so five in-flow rows
// would push this step 200px past the fold FOR EVERY BUSINESS — and it would
// do it while the customer is mid-word, shoving the block below out from under
// their thumb on every keystroke. An overlay costs the step nothing.

import { useEffect, useId, useRef, useState } from "react";
import { matchVehicle } from "./core.js";
import VEHICLES from "./vehicles.json";

export default function VehicleField({ value, onChange, placeholder, ariaLabel }) {
  const listId = useId();
  const wrap = useRef(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [hits, setHits] = useState([]);

  // Recomputed on every keystroke rather than debounced: the worst case —
  // a string that matches nothing and therefore runs all five passes including
  // the two-typo one — measures 2.9ms over 1,103 cars on this machine. A
  // debounce would cost a frame of lag to save nothing.
  useEffect(() => {
    setHits(matchVehicle(value, VEHICLES));
    setActive(-1);
  }, [value]);

  const take = (s) => { onChange(s); setOpen(false); setActive(-1); };
  const shown = open && hits.length > 0;

  const onKeyDown = (e) => {
    if (e.key === "Escape") { setOpen(false); return; }
    if (!shown) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((i) => (i + 1) % hits.length); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((i) => (i <= 0 ? hits.length : i) - 1); }
    // ENTER ONLY TAKES A SUGGESTION SOMEBODY HAS ARROWED ONTO. With nothing
    // highlighted it falls through to the form, because this step's Continue
    // is a real target and a field that swallows Enter to pick a car the
    // customer never looked at is the refusal this component exists not to be.
    else if (e.key === "Enter" && active >= 0) { e.preventDefault(); take(hits[active]); }
  };

  return (
    <div
      className="bk-typeahead"
      ref={wrap}
      // Dismiss when focus leaves the field AND the list — `relatedTarget` is
      // where focus is going, so a tap on an option is not a dismissal. The
      // options are real buttons, so this works by keyboard as well as by
      // thumb, which a document-level click listener would not.
      onBlur={(e) => { if (!wrap.current?.contains(e.relatedTarget)) setOpen(false); }}
    >
      <input
        role="combobox"
        aria-label={ariaLabel}
        aria-expanded={shown}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={shown && active >= 0 ? `${listId}-${active}` : undefined}
        autoComplete="off"
        value={value ?? ""}
        placeholder={placeholder}
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
      />
      {shown && (
        <ul className="bk-typeahead-list" id={listId} role="listbox" aria-label={ariaLabel}>
          {hits.map((s, i) => (
            <li key={s} role="presentation">
              <button
                type="button"
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === active}
                className={i === active ? "active" : ""}
                // The press has to beat the blur, or the list is gone by the
                // time the click lands and the field keeps the half-typed
                // word. Every type-ahead learns this once.
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => take(s)}
              >
                {s}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
