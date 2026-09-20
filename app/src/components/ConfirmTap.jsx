// ROADMAP 4.1 — A CONSEQUENTIAL TAP ASKS ONCE, IN PLACE.
//
// **What the tap did before this, measured 2026-09-20 in the source and in
// the running app:** one press of "Mark complete" wrote `status: 'completed'`
// through `update-booking` immediately. Two screens can do it — the card on
// Today, where it is the accent-filled button on the next job, and the job
// record — and A1 hit one of them by accident while exploring.
//
// **WHAT THAT PRESS ACTUALLY COSTS, because the answer shaped this control:**
// it does NOT email the customer (only a cancellation or a move does) and it
// does NOT silence their reminder (the reminder rule excludes `cancelled` and
// `pending`, not `completed`). What it does do is push the owner's phone,
// unlock **Finalize payment** — the money path — move the job into Today's
// "needs paying" pile, and count it as done in Money, in the reports and on
// the client's history. **And there was no way back**: once completed the
// button vanishes and the only things left are "Didn't show up" and "Cancel
// the job". A cancellation has "Un-cancel". A completion had nothing.
//
// **NOT THE DELETE PATTERN, AND THAT IS DELIBERATE.** ROADMAP 4.1 says to
// copy the job page's delete-behind-a-fold with `.btn.danger`, and
// `docs/screen-rules.md` is the reason not to: it names that pattern as the
// reference for a DESTRUCTIVE action, and in the same breath says "Didn't
// show up" and "Cancel the job" deliberately do NOT take `--bad`, because
// they are outcomes a detailer can live with rather than deletions. Marking a
// job done is the commonest outcome in the product. Painting it as harm would
// make `--bad` mean less everywhere it currently means something, and putting
// the most-used button on the screen behind a fold would tax every correct
// press to stop a rare wrong one.
//
// So: it asks, in place, once. No modal — this is used one-handed in a
// driveway and a dialog is a second thing to aim at. The question names the
// customer, the service and the time, which is ROADMAP 4.1's own wording for
// what a confirmation has to show.

import { useState } from "react";
// **THE DASHBOARD'S SCOPE, NOT THE BOOKING PAGE'S.** `lib/i18n.js` is the
// customer catalogue (`es.js`) and `lib/appI18n.js` is the detailer's
// (`appEs.js`). This control is only ever on a detailer's screen, and the two
// tables must never meet — a string filed in the wrong one renders English
// with no error anywhere.
import { t } from "../lib/appI18n.js";
import { useAppLocale } from "../hooks/useAppLocale.js";

// THE QUESTION, IN ONE PLACE, BECAUSE TWO SCREENS ASK IT. Composed from
// literal `t()` calls rather than a lookup table — a string in a data table is
// invisible to every extractor in this repo, which `tests/spanish` § 1c has
// caught before.
export function jobDoneQuestion({ name, service, time }) {
  if (service) return t("Mark {name}’s {service} at {time} as done?", { name, service, time });
  return t("Mark {name}’s job at {time} as done?", { name, time });
}

export default function ConfirmTap({
  label, question, confirmLabel, onConfirm,
  className = "btn", icon = null, disabled = false, style,
}) {
  useAppLocale();
  const [asking, setAsking] = useState(false);

  // THE ANSWER REPLACES THE BUTTON RATHER THAN APPEARING UNDER IT. A second
  // block pushes everything below it down, which on a card in a list moves
  // the NEXT job's buttons under the thumb that is already travelling.
  if (asking) {
    return (
      <div className="stack" style={{ gap: 8, ...style }}>
        <p className="quiet" style={{ margin: 0 }} role="alert">{question}</p>
        <div className="row" style={{ gap: 8 }}>
          <button className="btn primary" disabled={disabled}
            onClick={() => { setAsking(false); onConfirm(); }}>
            {confirmLabel}
          </button>
          {/* "Not yet" rather than "Cancel": on this screen Cancel is a word
              that already means calling off the job. */}
          <button className="btn ghost" disabled={disabled} onClick={() => setAsking(false)}>
            {t("Not yet")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <button className={className} disabled={disabled} style={style}
      onClick={() => setAsking(true)}>
      {icon}{icon ? " " : ""}{label}
    </button>
  );
}
