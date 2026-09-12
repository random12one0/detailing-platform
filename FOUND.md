# FOUND

One line per thing noticed and not fixed. Noticing is not permission to fix.
Claude Cowork decides what becomes work.

- 2026-09-12 — The "DP Website" session (lane B, app/src) wrote outside its lane
  twice tonight: `tests/booking-core.test.mjs` in `619a569`, and
  `tests/maintenance.test.mjs` plus `scripts/seed-demo.mjs` in `73ad5b0`. Both
  paths belong to lane C. Logged, not unwound.
- 2026-09-12 — `scripts/sweep-widths.mjs:605` does `found += await say(...)` and
  `say` returns nothing, so `found` is NaN from the first width and the run
  prints **"clean"** whatever it measured. One run printed 38 real geometry
  findings above that line. Every "clean" that script has reported is worth
  nothing, and it is this repo's own width tool. Lane C. Logged, not fixed.
- 2026-09-12 — MINOR. Opening a settings screen from the GEAR shows two close
  buttons side by side: the gear panel's own and the settings screen's. Both
  work and neither is wrong on its own; there is just no reason for a reader to
  meet two. Measured at 1910 on `gear → Notifications`. Not the stacking fault
  originally reported against this route — that was withdrawn after measurement.
- 2026-09-12 — MINOR. `app/src/screens/Money.jsx` prints one user-facing
  sentence as a bare string literal instead of `t(...)`: *"{n}% of what you
  collected was sold at the job."* It therefore stays English on a Spanish
  dashboard, and it is the only unwrapped sentence I met on that screen.
  Noticed while gating it behind the rate floor; not fixed, because it needs a
  Spanish key and was not on the list.
- 2026-09-12 — Segmented controls are a 30px touch target at phone width,
  product-wide. `.segmented button` computes to 13px with 8px padding and no
  `min-height`; eleven of them on Booking rules alone. The 32px floor fails
  everywhere. One rule fixes the product. Reviewer suggests 36px rather than
  32, so it stays under the 38/42 of the buttons around it and the hierarchy
  holds. Not fixed — parked behind the calendar.
- 2026-09-12 — Spanish coverage on both Money screens is roughly half missing
  and `tests/spanish.test.mjs` passes anyway. Untranslated in ES: "The full
  picture", "Where your money comes from", "WAITING ON PAYMENT", "Back to
  Money", the lede sentence, "Kept"/"Spent", "STILL TO COLLECT", "IN THE BANK",
  "STILL OWED", "WHERE IT WENT", and all four expense categories. The real
  check owed: for every `t()` call site reachable from the dashboard, does an
  `appEs.js` entry exist — and a count. Same class as the NaN sweep counter.
- 2026-09-12 — "Ask how dirty the vehicle is" sits under "Reminders and
  cancellations" and belongs beside "Water at the customer's address" and
  "Power at the customer's address" under WHAT YOU OFFER: all three are
  questions the booking page asks the customer. Pre-existing mis-grouping that
  folding made worse — it used to be visible and is now under a heading that
  does not describe it.
- 2026-09-12 — "Microfibre towels (bulk)" in the demo expense seed is British
  spelling and is on screen. `scripts/seed-demo.mjs`, lane C.
