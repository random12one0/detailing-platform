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
- ~~2026-09-12 — "Microfibre towels (bulk)" is on screen but the CODE is already
  correct.~~ **CLOSED 2026-09-12 by re-seeding.** `node scripts/seed-demo.mjs`
  ran against the platform project; the demo's expense rows now read
  "Microfiber" (measured: one `fiber`, zero `fibre` across the whole table).
  Nothing in the repo changed, because nothing in the repo was wrong.
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
- ~~2026-09-12 — The demo's SAVED message-template rows still carry the old SMS
  body with an em dash sentence joint.~~ **CLOSED 2026-09-12 by the same
  re-seed.** The demo's `business_settings` row now carries **zero** em dashes
  of any kind and no saved copy of that SMS body at all, so the editor falls
  back to `lib/templates.js`, which is correct. The reasoning that was right
  and stays right: a migration rewriting a detailer's own saved copy would be
  worse than a stale row, because by then the words are theirs.
- 2026-09-12 — **THE EM DASH RULE HAS A THIRD CATEGORY IT DOES NOT NAME.** 76
  user-facing strings carry a single em dash and 8 carry a pair. The singles
  are NOT all sentence joints: many are LABEL SEPARATORS — `Travel — {zone}`,
  `Drop-off — {address}`, `Also booked — {n} more cars`, `Platform view —
  signed in as {who}` — where the dash joins a label to its value and no other
  punctuation reads as well. Eleven true joints in the booking flow are fixed;
  the label separators are deliberately untouched. **Which way the remaining
  dashboard singles go is a copy decision, not a sweep.**
- 2026-09-12 — **BOOKING STEP 6 REJECTS A BAD EMAIL CORRECTLY AND GIVES THE
  WRONG REASON.** One sentence covers three faults: *"That address is missing
  an @. We cannot send your confirmation to it."* Measured — `andrew gmail.com`
  (correct), `andrew@gmail` (an @ is right there), `andrew@@gmail.com` (two of
  them) all get it. **A customer who typed their real address and missed the
  `.com` is told to add a symbol they can already see**, on the last step
  before they book, so they cannot act on it. Wrong reason is worse than no
  reason: it sends them looking in the wrong place. Three cases, three
  sentences, in that screen's voice — no `@` keeps the current line; nothing
  usable after the dot gets *"That address needs something after the dot, like
  .com."*; more than one `@` gets *"That address has two @ symbols."* Named the
  way "Too few finished jobs to name a most-booked service" names it. Lane B,
  next booking wave — not folded into the landing work.
- 2026-09-12 — **ONE EM DASH SURVIVED THE SWEEP AND IT SHOWS WHAT THE SWEEP
  CANNOT SEE.** Booking step 4 renders `Beyond 15 miles — +$40`. Steps 1, 2, 3,
  5 and 6 are clean, so the literal sweep worked. **This dash is not in a
  string** — a travel area's name is joined to its fee at render time, so it
  lives in a template, and no sweep of `t("…")` literals will ever find it. By
  the ruling it is a label separator: `Beyond 15 miles · +$40`.
- 2026-09-12 — NOT A BUG, recorded so nobody "fixes" it: the booking flow's
  hidden `website` input is roadmap 2.21's honeypot. And the customer-side
  phone formatter is confirmed working live — typing `5623101075` renders
  `(562) 310-1075` in the field.
- 2026-09-12 — DELIBERATELY NOT CHANGED: the booking page's field labels stay
  uppercase eyebrows (`YOUR NAME`, `PHONE`, `EMAIL`), which is the opposite of
  the Wave B dashboard fix. The `bk-` namespace is its own surface with its own
  vocabulary, the booking flow is CLAUDE.md's reference screen, and it measured
  clean. Applying the dashboard rule there would be generalising a fix past the
  evidence.
- 2026-09-12 — **THE GUIDED TOURS, WALKED END TO END for the first time** (36
  steps: Today 7, Calendar 6, Money 6, Clients 5, Business 6, Settings 6).
  **The copy is the best writing in the product and is not to be touched.** Four
  findings, one of them a bug:
  1. **36 steps is a lot to start blind.** The Settings row says "The guided
     tour of this dashboard", singular, and each card counts inside its own
     section ("1 of 7", then "1 of 6"), so nobody knows how much is left. Say
     the total up front, or carry an overall count. Honest version of the row:
     *"Six short tours, about 36 steps. Stop any time."*
  2. **BUG, height-dependent.** At 1280x800, Today step 3 of 7 spotlights a
     target spanning y −206 to +1005 — it begins above the viewport and ends
     205px below it, so the thing being pointed at cannot be seen. Fine at 900
     tall. The tour must scroll the target into view, and when a target is
     taller than the viewport align its TOP rather than centring it. The only
     failure of its kind in 36 steps.
  3. Calendar step 5 of 6: the spotlight's right edge sits 8px past the
     viewport, and it is exactly 8px at both 1280 and 1440 — a fixed outset
     that is not clamped, not a layout problem. Clamp it to the viewport.
  4. On the final step the ghost button still reads "Skip the tour" beside
     "Done". Nothing is left to skip and both do the same thing.
  **AND THE PART WORTH SAYING: it is well built underneath.** `.tourblock`
  carries `role="dialog"`, `aria-modal="true"` and an `aria-label`; the copy
  sits in an `aria-live="polite"` region so each step is read out; the card is
  fixed so it never scrolls away; both buttons are 147x38.
- 2026-09-12 — **`/reset` IS NOT BROKEN, AND THE REPORT WAS SOUND — it was the
  branch that was invisible from outside.** Reported as uncompletable: the page
  says "Choose a new password" and asks for the CURRENT one, which somebody who
  has forgotten it cannot supply. **The screen has two states and the field is
  gated on one of them.** `lib/supabase.js` computes `arrivedOnRecoveryLink`
  ABOVE `createClient`, because `detectSessionInUrl` exchanges the token and
  clears the address bar before React mounts — a screen that looks later finds
  an empty hash every time.
  · **Signed in, typing `/reset`** → `state = "signedin"` → the current-password
    field IS shown and `reauthenticate()` runs. Deliberate: the unlocked-laptop
    case. **This is what was measured**, because that browser held the demo
    session all day.
  · **Arriving on a real recovery link** → `state = "recovery"` → **the field is
    not rendered and re-authentication is skipped.**
  **PROVEN IN THE BROWSER, not read off the code.** With
  `#access_token=…&type=recovery` the fields are `New password`, `Type it
  again` and nothing else; signed in they are `Current password`, `New
  password`, `Type it again`.
  **AND `?token=abc123` COULD NEVER HAVE CHANGED IT:** a Supabase recovery link
  carries `type=recovery` in the HASH, and the test is
  `/(^|[#&?])type=recovery([&]|$)/` against `hash + search`. A query parameter
  of another name correctly matches nothing. **The `navigate` tool also strips
  fragments**, which cost one false negative here before the hash was set
  in-page instead — worth knowing for any future hash test.
- 2026-09-12 — **A PATTERN, THREE FOR THREE ON THE MARKETING SIDE, and it is a
  habit rather than three accidents.** Every sub-11px string found there is a
  LABEL attached to a number or an image, and in each case **the label carried
  the meaning and the thing it labelled got the size**: the 9px wall
  figcaptions, the 8.5px `0% · ALWAYS` under `// COMMISSION`, and the 10px
  `TO BUILD IT` / `THEN` / `SAVE ON THE YEAR` over 21px figures on `/pricing`.
  **Sweep for the RELATIONSHIP, not the value:** any label whose font-size is
  smaller than the thing it labels is suspect, and on a marketing page it is
  probably the part doing the selling. All three are fixed; the rule is here so
  the fourth is caught by looking for the shape.
- 2026-09-12 — **THE CLIENT RECORD'S "Delete X's information" IS A DISCLOSER,
  NOT THE DESTRUCTIVE ACTION — so half that finding resolves and half stands.**
  Pressing it destroys nothing: it reveals an in-page confirmation carrying the
  consequence ("Their name, number, address and any notes come off every job,
  and their photos are deleted. This cannot be undone."), what SURVIVES ("the N
  jobs stay as anonymous entries, so your takings and your accountant export
  don't change"), and a `Delete` / `Keep them` pair. **The real destructive
  control is `.btn.danger`, which is `--bad`** (`theme.css:1499`). So `--bone`
  on the opener is arguably right — it is a "show me the options" button — and
  **the product does ask before acting here, better than a native dialog would.**
  **WHAT STANDS: the block has no heading.** An `<hr>` and a button, no `.lab`.
  The criterion's first half genuinely fails for that control.
- 2026-09-12 — **DESTRUCTIVE ACTION AUDIT, from code: 16 found, 13 gated, 3
  not.** Gated: delete booking, delete job photo, delete tracking link, remove
  service, remove vehicle size, delete FAQ, remove gallery photo, disconnect
  Stripe, delete review, remove team member, stop using a domain, the platform
  admin's `confirmText` pattern, and the client erase above. `PlanMemberPage`
  and `ManageBookingPage` use custom modals rather than `confirm()` on purpose,
  because a native dialog cannot name the plan.
  **UNGATED — all three in `DaySheet.jsx`:** `clearHours`, `clearBlockout`,
  `clearDropoff`. Each deletes one row that a detailer typed and can retype in
  seconds, which is probably why. **`clearBlockout` is the one worth a
  decision:** removing a blockout RE-OPENS a day the detailer had closed, so
  the consequence lands on a customer booking a day they are away, not on the
  detailer noticing a missing row. Reviewer's and Andrew's call.
- 2026-09-12 — **A CLIENT RECORD SAYS "0 visits" AND THEN LISTS A FUTURE JOB
  UNDER "HISTORY".** Zero-state figures are correct — `0 visits`, `$0
  lifetime`, `Last visit · No completed visits yet`, a written empty state — so
  the data floor generalised past Money. But the same card lists `Wed, Sep 16 ·
  Express Wash · $135` under HISTORY, which is in the future. **The numbers are
  right and the heading is lying**, and the contradiction makes the correct "0
  visits" read as a bug. The product already owns the vocabulary — Today has
  STILL TO DO and WAITING ON YOU — so split the section or rename it and mark
  the upcoming row, rather than inventing a word.
- 2026-09-12 — Marcus Webb and Andrew Dietrich share `(562) 555-0142` in the
  demo seed and sit nine rows apart on one Clients list. On the screen whose
  job is telling people apart, that reads as a deduplication bug. One-line seed
  fix, lane C.
- 2026-09-12 — **THE UNBLOCK CONFIRMATION IS A NATIVE `window.confirm`, AND THE
  MECHANISM IS THE ODD ONE OUT RATHER THAN THE SENTENCE.** Andrew fired it and
  read it back exactly: *"This day is closed for Equipment servicing. Re-open
  it and customers can book."* The words are right; what is wrong is that it
  looks like the BROWSER instead of like the product, while the job page — this
  repo's stated reference for a destructive or consequential action — uses an
  in-page `details.disclose` with a heading, the consequence in prose and a
  `Delete` / `Keep them` pair. **His ruling: move it to the job page's shape
  the NEXT time somebody is in `DaySheet.jsx`, not as its own errand.** Note
  that `clearBlockout` is already on this file's ungated-destructive list, so
  the two are one piece of work: the re-open path asks with a browser dialog
  and the clear path does not ask at all.
- 2026-09-12 — NOT A BUG, recorded because it was asked and the answer is easy
  to get wrong: **both unblock confirm strings DO go through `t()` and both
  have real Spanish.** `DaySheet.jsx:341-342` calls `t("This day is closed for
  {reason}. Re-open it and customers can book.")` and its no-reason twin;
  `appEs.js:1878` and `:1880` carry *"Este día está cerrado por {reason}. Si lo
  reabres, los clientes podrán reservar."* It read as English only because the
  session was in English. **`{reason}` stays in whatever the detailer typed**,
  which is correct under the fourth axis — a detailer's own words are not ours
  to translate.
- 2026-09-12 — **A `t()` WHOSE ARGUMENT IS A VARIABLE IS INVISIBLE TO EVERY
  INSTRUMENT IN THIS REPO, and that is now the whole remaining Spanish gap.**
  `scripts/i18n-coverage.mjs` says so in its own header — it reads a literal
  first argument and nothing else. Four were found by hand today and fixed
  (Payments' handle table, Billing's invoice words, the 36-step guided tour,
  Plans' one help string), which means the class is real and unmeasured rather
  than exhausted. The honest instrument is not a wider grep: it is a scripted
  walk of the dashboard with the toggle on Spanish, reading `innerText` per
  screen and flagging anything that matches a list of English function words.
  Nothing like that exists. Coverage reads 100% and 0 missing, and it is telling
  the truth about the question it asks.
- 2026-09-12 — ~~Three English leaks measured on a Spanish dashboard and not
  fixed.~~ **(a) AND (b) ARE FIXED — Claude Cowork confirmed both, and his
  reasoning on (b) is the part worth keeping.** The four expense categories
  render lowercase in the Money list and title-cased under A DÓNDE SE FUE, and
  *that inconsistency is what proves they are ours*: a stylesheet is casing them,
  and nobody cases a detailer's own typing. `.advmeter.cap` is the stylesheet.
  So the stored lowercase token is translated, the casing is untouched, and both
  screens read the way they read in English. (a) was `bucketsFor()` calling
  `periodAt()` without the locale it already accepted, plus three of
  `shortMonth`'s five callers dropping the argument — so a week's own label and
  every six-month label were English too, not just the chart. All five period
  kinds verified in both languages. (c) The demo's `Microfibre towels (bulk)`
  row is the already-recorded stale seed, not a code fault.
- 2026-09-12 — NOT FIXED, and noticed while translating the expense categories:
  **`.advmeter.cap` title-cases whatever is in the category, including a name
  the detailer typed himself.** Choosing *other* on the expense form stores his
  own words as the category, so "microfiber towels (bulk)" renders as "Microfiber
  Towels (Bulk)" on the advanced screen. It is CSS editing his voice, which is
  the line CLAUDE.md draws — and it predates today. The translation does not
  make it worse: `t()` passes an unseen string through unchanged, so his words
  reach the stylesheet exactly as before. Two honest fixes, and neither is mine
  to pick: case only the five known tokens, or drop the `cap` and put the capital
  letters in the data.
- 2026-09-12 — `lib/format.js`'s `dateLong()` returns **"Invalid Date"** for any
  full ISO timestamp: it does `String(s).split("-").map(Number)`, so
  `2027-03-12T12:00:00Z` yields `[2027, 3, NaN]`. Four `Billing.jsx` call sites
  pass exactly that, and **the screen is fine anyway** because that file
  shadows the import with a local `dateLong` of its own. So the bug is armed and
  not firing. Worth a guard in the shared function, or worth deleting the
  shadow; not worth guessing which without the reviewer.
- 2026-09-12 — Em dashes measured and deliberately LEFT, outside the lib/scripts
  scope Claude Cowork set: **five in the guided tour's remaining copy**, which
  this file records as not to be touched (the five that were sentence joints did
  change punctuation, no words); **eleven on the landing page and in
  `landing/legal.js`**, which was signed off hours earlier; and one attribution
  dash in a customer's own quoted review, which is correct typography and is
  their words either way. Also left on purpose: `"—"` as the no-value glyph in a
  KPI, and one `console.log` in `seed-demo.mjs`.
- 2026-09-12 — **THE FIVE EXPENSE-CATEGORY WORDS LIVE OUTSIDE `appEs.js`**, in a
  two-language token table in `ExpenseModal.jsx`, and an audit of the catalogue
  will not see them. It is the lesser of two evils and the reason is a real
  collision: the catalogue is keyed on the English string, so the expense chip
  and the website intake form's *Other* chip would share one entry and they need
  different casing — the intake chip stands beside *Not on the site at all* and
  *Either is fine*, where a lowercase `otro` would be the odd one out, which is
  the same fault as `Otro` being the odd one out among four lowercase nouns.
  `plans.js`'s `priceWords` is the same shape for the same reason and is the
  precedent. Worth revisiting only if the catalogue ever gains a way to scope a
  key.
- 2026-09-12 — **THE WEBSITE INTAKE FORM'S QUESTION BANK IS STILL ENGLISH IN
  SPANISH — 21 steps of it.** The 58 strings fixed today were `SiteIntake.jsx`'s
  own chrome; the QUESTIONS, their ledes and their presets are plain object
  values in `lib/siteIntake.js` and never reach `t()` at all. Measured in the
  browser at `/website/preview` with the toggle on Spanish: the page furniture is
  Spanish and step 1 reads *"Let's build your website."* It is the largest single
  remaining piece of the same blind spot, it is a lot of copy, and it is not a
  wave tail — it needs its own item.

- 2026-09-12 — **"Insurance instalment" is in `scripts/seed-demo.mjs:792` and
  it is British.** American is *installment*. CLAUDE.md § American English and
  § "THE ONE THING THAT DOES FOLLOW: THE SEED IS OURS" both bind it — the seed
  is what every demo, screenshot and sales conversation shows, so it models the
  writing we would want even in fields a detailer would normally own. One word,
  one line, lane C. Found while verifying the Microfiber re-seed; not fixed,
  because it was not on the list.
- 2026-09-12 — **`scripts/seed-demo.mjs` REWRITES `app/public/map.html` as a
  side effect** ("map.html: 4 example links refreshed"). That is why the file
  shows as modified in `git status` on a tree nobody has edited, and a session
  that finds it dirty will reasonably conclude another session is mid-edit in
  lane A. It is generated output living in a hand-edited folder. Either commit
  it with the seed or gitignore it; noticed, not decided.
