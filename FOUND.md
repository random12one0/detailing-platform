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
- 2026-09-12 — "Microfibre towels (bulk)" is on screen but the CODE is already
  correct: `scripts/seed-demo.mjs:784` reads "Microfiber", fixed in `73ad5b0`
  last night. What the reviewer is looking at is a row seeded into the demo
  database BEFORE that fix. **Nothing to change in the repo — the demo data
  needs re-seeding**, which is lane C and a data operation, not an edit.
- 2026-09-12 — **SPANISH COVERAGE, MEASURED: 86%.** 1,206 `t()` call sites with
  a literal across the dashboard, 1,036 distinct strings, **141 with no
  `appEs.js` entry** — while `tests/spanish.test.mjs` passes 58/0. Worst:
  `SiteIntake.jsx` 58 missing, `AdvancedMoney.jsx` 47, `Payments.jsx` 10,
  `WebAddress.jsx` 7, `ReportProblem.jsx` 6, `Money.jsx` 5. Two more were mine
  and are now added. **The other 139 are a dedicated item, not a wave tail.**
  The audit script is a throwaway; the check it performs is the one the suite
  does not.
- 2026-09-12 — Five user-facing strings say "tap" on screens a detailer uses on
  a laptop: `Hours.jsx` (one-off changes), `MessageTemplates.jsx` (x2),
  `Payments.jsx` ("tappable"), `SiteIntake.jsx` ("tap to stop"). 68 occurrences
  of the word in `app/src` overall — the other 63 are code comments and are not
  user-facing. Awaiting the reviewer's word before changing any; the Gallery
  one was named explicitly and is done.
- 2026-09-12 — The demo's SAVED message-template rows still carry the old SMS
  body with an em dash sentence joint: *"quick check before {{date}} — will I
  have access to water…"*. `app/src/lib/templates.js:166` is fixed and so is
  its Spanish key, but a business that has already saved its templates keeps
  the stored text, which is what the editor shows. **Same shape as
  "Microfibre": the code is right and the row is stale.** Needs a re-seed (lane
  C) or a one-off update; a migration that rewrites detailers' own saved copy
  would be worse, since by then the words are theirs.
- 2026-09-12 — **THE EM DASH RULE HAS A THIRD CATEGORY IT DOES NOT NAME.** 76
  user-facing strings carry a single em dash and 8 carry a pair. The singles
  are NOT all sentence joints: many are LABEL SEPARATORS — `Travel — {zone}`,
  `Drop-off — {address}`, `Also booked — {n} more cars`, `Platform view —
  signed in as {who}` — where the dash joins a label to its value and no other
  punctuation reads as well. Eleven true joints in the booking flow are fixed;
  the label separators are deliberately untouched. **Which way the remaining
  dashboard singles go is a copy decision, not a sweep.**
