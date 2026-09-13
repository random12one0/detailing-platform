// "WHERE SHOULD WE COME?" — an ordinary text box, with a Find button beside it.
//
// **A BUTTON THE CUSTOMER PRESSES ONCE, NEVER SUGGESTIONS AS THEY TYPE.**
// Andrew settled it on 2026-09-13 and it is not open: the lookup measures 2 to
// 3 seconds warm and over six on an ambiguous street, against the ~300ms
// typing suggestions need, and the only way to make it fast is putting our provider
// key in the browser on a public page. That second half is a rule
// about where the key lives, so no faster provider reopens it.
// `docs/address-autocomplete.md` § THE FIND BUTTON is the spec.
//
// **THE LOAD-BEARING SENTENCE, AND IT IS THE HALF EASIEST TO BUILD WRONG: IF
// THE ADDRESS DOES NOT RESOLVE, THE CUSTOMER CONTINUES WITH WHATEVER THEY
// TYPED.** Nothing here can refuse an answer, rewrite one, or stop the form.
// `core.js` § blockers asks only whether the box has anything in it. A
// detailer's customer knows their own gate code, their unit number, and the
// fact that their street is not in anybody's database.
//
// THE LIST FLOATS rather than sitting in the flow, for the same measured
// reason the vehicle type-ahead does: five in-flow rows would push this step
// past the fold for every business, and it would do it under the customer's
// thumb. It reuses `.bk-typeahead-list` rather than growing a second list with
// its own 44px floor to get wrong.

import { useEffect, useId, useRef, useState } from "react";
import { t } from "../lib/i18n.js";
import { api } from "../lib/api.js";
import { addressFault, canLookUpAddress, addressQuery, readAddressAnswer } from "./core.js";

export default function AddressField({ slug, value, onChange, placeholder, label }) {
  const listId = useId();
  const wrap = useRef(null);
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  // What we last ASKED about, so pressing Find twice on an unchanged box
  // re-shows the rows already in hand instead of spending a second credit.
  const [asked, setAsked] = useState(null);
  const [rows, setRows] = useState([]);
  const [credit, setCredit] = useState(null);
  const [note, setNote] = useState(null);

  const q = addressQuery(value);
  const ready = canLookUpAddress(value) && !busy;
  const shown = open && rows.length > 0;

  // Editing the box puts every answer out of date, so the list closes and any
  // sentence under it goes with it. The rows are kept: they are still the
  // answer to `asked`, and re-typing back to that string must not re-ask.
  useEffect(() => { setOpen(false); setNote(null); }, [value]);

  const find = async () => {
    if (!ready) return;
    if (asked === q) { setOpen(true); setNote(rows.length ? null : "none"); return; }
    setBusy(true); setNote(null);
    try {
      const answer = await api.addressSuggest(slug, q);
      // AT THIS LATENCY AN ANSWER CAN ARRIVE FOR A STRING THE CUSTOMER HAS
      // ALREADY EDITED. Showing it would be the classic autocomplete bug, so
      // the answer is dropped unless the box still holds what we asked about.
      if (addressQuery(inputRef.current?.value) !== q) return;
      const read = readAddressAnswer(answer);
      setRows(read.rows); setCredit(read.attribution); setAsked(q);
      setNote(read.note); setOpen(read.rows.length > 0);
    } catch (err) {
      // A failed lookup is never the customer's problem and never blocks them.
      // Only a throttle earns a sentence, because only a throttle clears.
      setRows([]); setCredit(null); setAsked(null); setOpen(false);
      setNote(addressFault(err));
    } finally {
      setBusy(false);
    }
  };

  const take = (row) => { onChange(row.label); setOpen(false); setNote(null); setAsked(addressQuery(row.label)); };

  return (
    // **THE NOTE AND THE CREDIT SIT OUTSIDE `.bk-typeahead`, AND THAT IS A
    // LAYOUT FACT RATHER THAN A PREFERENCE.** The list is anchored to the
    // BOTTOM of that wrapper, so anything else inside it pushes the list down
    // and the credit ends up wedged between the box and the suggestions. The
    // wrapper holds the input and the list and nothing else; everything that
    // belongs under the field is a sibling, and the list floats over it.
    <div
      ref={wrap}
      // Dismiss when focus leaves the field AND the list. `relatedTarget` is
      // where focus is going, so a tap on a row is not a dismissal.
      onBlur={(e) => { if (!wrap.current?.contains(e.relatedTarget)) setOpen(false); }}
    >
      <div className="bk-typeahead">
        <div className="bk-addr">
        <input
          ref={inputRef}
          aria-label={label}
          autoComplete="street-address"
          value={value ?? ""}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          // Enter in an address box means "look it up", not "submit the step".
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); find(); } }}
        />
        {/* FIRES ONLY ON A PRESS. Never on a keystroke, never on blur, never
            on a timer: one press is one credit, and live type-ahead spends six
            to eight per address. */}
        <button type="button" className="bk-find" onClick={find} disabled={!ready} aria-controls={listId}>
          {busy ? t("Looking…") : t("Find")}
        </button>
      </div>

      {shown && (
        <ul className="bk-typeahead-list" id={listId} role="listbox" aria-label={t("Addresses we found")}>
          {rows.map((r, i) => (
            <li key={`${r.label}-${i}`} role="presentation">
              <button
                type="button" role="option" aria-selected="false"
                // The press has to beat the blur, or the list is gone by the
                // time the click lands.
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => take(r)}
              >
                {r.label}
              </button>
            </li>
          ))}
          </ul>
        )}
      </div>

      {note === "none" && (
        <p className="bk-muted bk-addr-note">{t("No matches. We will use the address as you typed it.")}</p>
      )}
      {note === "busy" && (
        <p className="bk-muted bk-addr-note">{t("Too many lookups right now. Try again in a moment, or just carry on.")}</p>
      )}

      {/* THE CREDIT, AND IT IS ONE COPY IN ONE PLACE — ROADMAP.md § 6.
          The words are NOT typed here and must never be: the endpoint sends
          them beside every successful answer, so this renders what the server
          said and Andrew can change or remove the sentence in a single edit to
          the one shared module on the server. That suite's § 3c fails if a
          second copy of the sentence appears anywhere under `app/`.
          It sits under the field rather than in a page footer because this
          page has no footer, and building one to hold a credit line would be
          the tail wagging the dog. It shows only while there is map data on
          the screen to credit. */}
      {credit?.text && <AddressCredit credit={credit} />}
    </div>
  );
}

// Both names are links, which is the half of the requirement a plain sentence
// would miss.
//
// **NOTHING HERE NAMES THE PROVIDER, AND THAT IS A RULE RATHER THAN A STYLE.**
// The address suite's § 2b fails if anything under `app/` mentions the
// provider's name or host, on the stated grounds that a client-side
// implementation could not avoid mentioning them. So the sentence, the names
// and the links all arrive from the server, and this walks whatever it was
// sent: every field beside `text` is a link target, matched to the word it
// belongs to by comparing letters only. Switching provider changes one file on
// the server and nothing here, which is exactly the "movable or removable in a
// single edit" Andrew asked for.
//
// A name is also the one thing this product never translates, so the same
// words render in both languages on purpose.
const letters = (v) => String(v).toLowerCase().replace(/[^a-z]/g, "");

function AddressCredit({ credit }) {
  const targets = Object.entries(credit)
    .filter(([k, v]) => k !== "text" && typeof v === "string" && /^https?:\/\//.test(v));
  // Find each target's word IN the server's own sentence, then link that word
  // in place. A target whose word is not in the sentence is simply skipped:
  // a missing link is a smaller fault than a mangled sentence.
  const marks = [];
  for (const [key, href] of targets) {
    const want = letters(key);
    let at = -1;
    credit.text.replace(/[A-Za-z][A-Za-zÀ-ɏ]*/g, (word, i) => {
      if (at < 0 && letters(word) === want) at = i;
      return word;
    });
    if (at >= 0) marks.push({ at, len: credit.text.slice(at).match(/^[A-Za-z][A-Za-zÀ-ɏ]*/)[0].length, href, key });
  }
  marks.sort((a, b) => a.at - b.at);
  const parts = [];
  let cut = 0;
  for (const m of marks) {
    if (m.at < cut) continue;
    parts.push(credit.text.slice(cut, m.at));
    parts.push(
      <a key={m.key} href={m.href} target="_blank" rel="noreferrer noopener">
        {credit.text.slice(m.at, m.at + m.len)}
      </a>,
    );
    cut = m.at + m.len;
  }
  parts.push(credit.text.slice(cut));
  return <p className="bk-addr-credit">{parts}</p>;
}
