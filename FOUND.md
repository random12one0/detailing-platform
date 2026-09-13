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

- ~~2026-09-12 — **THE UNSUBSCRIBE PAGE SAYS "This link has expired" AND NOTHING
  EXPIRES.**~~ **FIXED 2026-09-12 the same day, on Cowork's ruling: fix the
  SENTENCE, not the mechanism.** It reads *"We couldn't open this link"* over
  *"Try again in a moment. If it still doesn't work, reply to the email you got
  instead. It reaches the business directly."* — which says what happened and
  no more, and gives the transient cause a real action before the permanent
  one. The way back is unchanged. Spanish moved in the same edit. His reason:
  *"a page that tells somebody their link is dead when it is not sends them
  away for good, and the person seeing it is already having a bad time."* The
  original text: The customer UUID is the credential and it has no lifetime; that
  heading fires whenever `api.unsubscribeLookup` REJECTS, which is a 404 for a
  customer id that does not resolve (a deleted row, or a re-seed) **and equally
  a network failure**. So somebody on a bad connection is told their link is
  dead when it is fine, and told to reply to the email instead. Same family as
  booking step 6's bad-email sentence: **the rejection is correct and the reason
  is wrong, which sends the person looking in the wrong place.** Lane B, copy
  only. Found while answering whether the detailer is knowable on that branch.
- 2026-09-12 — **`SwitchBusiness` ("Switch business") is unreachable on the demo
  business and therefore unreachable to every sweep, shooter and walk this repo
  has.** `screens/more/index.js` offers it only when the account has more than
  one membership, and `demo@detailplatform.com` has one. It is a real screen
  with no coverage of any kind. Either seed a second membership for the demo
  owner or write down that it is deliberately unwalked.
- 2026-09-12 — **A PROBE FOR THE EXHAUSTION TEST WAS BUILT, MEASURED THREE
  DIFFERENT WRONG ANSWERS, AND WAS THROWN AWAY ON COWORK'S RULING.** It read
  zero rows for Hours, one row for Reviews, and walked the Business index while
  reporting it as the gear — each time looking exactly like a correct result.
  His reason is the one to keep: **the exhaustion test is written as a test
  rather than a quota because a count can be satisfied without fixing
  anything** — twelve identical rows split into two blocks of six passes any
  threshold and changes nothing. Nothing of it is in the repo;
  `docs/exhaustion-walk-2026-09-12.md` is the route list he asked for instead.

- 2026-09-12 — **`scripts/i18n-coverage.mjs` COUNTS A `t("…")` THAT IS INSIDE A
  COMMENT**, and `tests/spanish.test.mjs` § 9a fails on it. Proven by accident:
  a comment written this session quoting `t("…")` as an EXAMPLE put a fake
  untranslated dashboard string into the count, and the suite went 63/0 to
  62/1 with no product change at all. The same blind spot would count any
  commented-out call site. It is the exact disease CLAUDE.md trap (k) names —
  **a check that greps source text asserts how something is WRITTEN** — and it
  fails in the direction that wastes a session rather than the one that hides a
  bug, so it is low priority but real. Lane C. Worked around by rewording the
  comment, which is not a fix.
- 2026-09-12 — **NOT A BUG, recorded so the next reviewer does not report it:
  the Business index shows an ellipsis in place of every summary line for about
  six seconds after it opens, then all fifteen fill in.** Cowork measured it,
  nearly filed it as a regression, and withdrew it himself. It is an honest
  loading state. **A measurement taken inside that window is a measurement of
  the loading state**, which is a sibling of trap (f): wait for the rows to
  settle before reading anything on that screen.

## COLD REVIEW, 2026-09-12 — the detailer's dashboard

A fresh agent with no knowledge of this session's work, forbidden `FOUND.md` and
`ROADMAP.md`, read-only, walked five tabs, fifteen Business rows, seven gear
rows, eleven setup steps, a job record and a client record at 1440x900 and
392x844. **It found nothing crashed, nothing blank, no dead control, no sideways
scroll at either width, and no tap target under 32x32.** Everything below was
then re-verified HERE by reading the source, so none of it rests on the agent's
word.

- **MONEY CALLS UNPAID WORK "COLLECTED", AND THE SAME SCREEN CONTRADICTS IT.**
  `Money.jsx:533` prints `t("Collected")` over `stats.inNow`, and `:246-248` is
  `jobsIn = done.filter(inPeriod)` then `revenueIn = sum(final_amount ??
  total_price)` — **filtered on `status`, never on `payment_status`.** So
  September reads **COLLECTED $410** with **WAITING ON PAYMENT · $175** in the
  same frame, and "The full picture" spells it out: $235 IN THE BANK, $175 STILL
  OWED. `lib/moneyAdvanced.js:175` already computes the split correctly.
  **Today's screen says "Nothing collected yet" about the same two jobs**, so
  two screens disagree about one number. The net-for-the-month figure is built
  on it. Probably a LABEL fix — "Earned" or "Billed" — rather than a maths one,
  because the figure is the right figure for a different question.
- **THE TRACKING-LINK ROW COUNTS ORDINARY BOOKING TRAFFIC AS FLYER OPENS, AND
  THE TWO HALVES OF ITS OWN SENTENCE USE DIFFERENT FILTERS.** `Business.jsx:200`
  counts `campaign_visits` by `business_id` **with no `campaign_id` filter**,
  while `:198` counts campaigns with `.eq("is_active", true)`.
  `track-visit/index.ts:48` deliberately inserts organic booking-page visits
  with `campaign_id: null` — a deliberate and well-reasoned choice that this
  reader never accounted for. Result on the demo: the row said "1 link · 1 open"
  and climbed to 4 during one session while BOTH link cards still read "Nobody
  has opened it yet". **This is the number that says whether a flyer the
  detailer paid to print worked.**
- **A FIVE-JOB DAY DRAWS THREE DOTS ON THE PHONE AND SAYS NOTHING ABOUT THE
  OTHER TWO.** `Calendar.jsx:431` is `jobs.slice(0, 3)` in the DOT branch with
  no overflow marker. The desk branch caps at three too — and `:450` adds
  `+{jobs.length - 3} more`, with a comment explaining exactly why an overflow
  is needed. **The phone grid is dots-only, the phone is the detailer's own
  device, and the calendar tour says "Each dot is a job."** The cell's own
  `aria-label` says "5 jobs" over three dots, so the element disagrees with
  itself. **Counting three on a five-job day is how a detailer says yes to a
  sixth.**
- **THE CALENDAR WEEKDAY HEADER IS A HARD-CODED ENGLISH ARRAY.**
  `Calendar.jsx:392` is `["S","M","T","W","T","F","S"]` — no `t()`, no locale.
  Spanish is D L M M J V S, so a Spanish reader sees "M" in the Monday column
  and reads *martes*: **the columns are mislabelled, not merely untranslated.**
  Same class as the em dash joins — the Spanish wave swept eleven `dateLong()`
  CALLS and this is a literal array, which no call-site sweep can see.
- **Spanish, about twenty more instances, and two of them are already
  translated and never shown.** `BookingLink.jsx:301` renders `{footnote}` raw
  while the label a line above is `{t(label)}`, and `appEs.js:1013` HAS the
  Spanish; `Plans.jsx:652` passes `footnote={t(...)}` and does render Spanish,
  which is the proof it is the wrapper. `Preferences.jsx:54` and `:90` pass a
  bare `blurb=` where `:42` uses `t()`. Then bare JSX text: `Today.jsx:438`,
  `Today.jsx:422/430` (the phone ledger reads "5 jobs / 2 hechos / $455
  expected" — only the middle label is wrapped), `JobRow.jsx:60`,
  `Business.jsx:365` (sibling branches of the same ternary DO use `t()`),
  `Calendar.jsx:253`, `GearMenu.jsx:49`, and `Billing.jsx:428`, which renders
  **"Every one of these also includes the one-time $999 $499 construcción."** —
  an English sentence with one Spanish word in it.
- **`<html lang>` stays "en" when the dashboard is Spanish.** Low cost, one line.
- **"Getting there" is mistranslated.** `appEs.js:1259` gives "Ya casi", which
  means *almost done*. It titles the map-app picker; it wants "Cómo llegar".
- **Accepting a request silently charges `total_price` and discards the quote,
  and the card does not say which number Accept will use.** The card shows $680
  large beside a pill reading "Quoted $780"; `respond-to-booking/index.ts:75`
  confirms at `total_price` and nulls `quoted_amount`. The behaviour is
  deliberate and documented — **the copy gap is not.** It is money.
- **The smallest text in the product is a struck-through "$999" at 10.14px** on
  Your subscription. Everything else on that screen is 11px or more.
- **Six of the eleven setup step titles are questions**, which SCREEN RULES
  bans as headings. Nothing is broken; recorded because the rule is explicit and
  because the same six titles are load-bearing elsewhere.

**THREE INSTRUMENT WARNINGS FROM THE SAME WALK, all worth keeping.** A
coordinate click is silently dropped in this browser pane and the agent nearly
filed a working filter chip as a dead control — clicking the same element by its
accessibility-tree reference worked first time, which is CLAUDE.md trap (l) live
in this setup. Screenshots in the pane lag one capture after a click or a
scroll, so never call a region blank from one image. And a target probe that
reports EVERY control as failing has found an overlay, not twenty defects — it
was the tour scrim at desk width and the sticky header plus fixed tab bar at
phone width; the agent validated its own probe by re-running it at a 60px
threshold and a 32px one before believing either.

**And the demo database is SHARED AND LIVE**: `campaign_visits` grew from one
row to four during the walk, from somebody else's visits.


## A SECOND SESSION IS WRITING INTO THIS TREE RIGHT NOW — 2026-09-12, 15:00

**This is the incident `docs/sessions/README.md` exists to prevent, caught in
the act rather than afterwards, and it is recorded because the DETECTION is the
transferable part.**

At 15:00:46 these files were modified and uncommitted, and **none of the changes
were mine**: `app/src/book/UnsubscribePage.jsx`, `app/src/landing/LandingPage.jsx`,
`app/src/landing/PricingPage.jsx`, `app/src/landing/legal.js`,
`app/src/landing/thread.js`, `app/src/lib/strings/es.js`.

**HOW IT SURFACED, because none of the obvious signals fired.** No lock, no
warning, no merge conflict — `git status` looked like my own working tree. What
gave it away was an edit of mine failing to apply to text I had written myself
an hour earlier: `UnsubscribePage.jsx` already carried a 404-versus-unreachable
split, with a comment dated today, that I did not write. **Somebody else had
independently fixed the same defect, better than my first attempt, while I was
reviewing it.** Then a second read of `es.js` forty seconds after a first one
came back different again.

**WHAT WAS LOST: my uncommitted `es.js` edit, overwritten by their write.**
Nothing committed was harmed and nothing of theirs was harmed — the destructive
recovery I reached for (`git checkout --`) was refused by the permission layer,
which was correct, and the right move was to stop rather than to merge somebody
else's file while they still had it open.

**THE TREE IS CURRENTLY INCONSISTENT AND IT IS THEIRS TO FINISH.**
`UnsubscribePage.jsx` calls `t()` on three strings — "We couldn't open this
link", "This link may be out of date. Reply to the email you got instead. It
reaches the business directly.", and "Try again in a moment. If it still doesn't
work, reply to the email you got instead. It reaches the business directly." —
and **`es.js` now has an entry for none of them**, so that page renders English
on a Spanish screen with no error anywhere. **Do not fix it from a third
session.** Whoever holds those files adds the keys.

**THREE RULES THIS EARNS, and the first is new.**

1. **AN EDIT THAT FAILS TO MATCH TEXT YOU WROTE YOURSELF IS A COLLISION SIGNAL,
   not a quoting problem.** It reads exactly like a mangled apostrophe or a bad
   heredoc, which is what it was blamed on for two attempts.
2. **`git status` IS THE CHECK, AND IT IS FREE.** Run it before the first write
   of a session and again before each commit. A modified file you did not touch
   is the only early warning available.
3. **A MEASUREMENT OF A FILE SOMEBODY ELSE HAS OPEN IS WORTH NOTHING** —
   CLAUDE.md trap (f) applied to a person instead of to a hot reload. Both cold
   reviews walked the landing and pricing pages during this window, so **every
   finding of theirs against `LandingPage.jsx` or `PricingPage.jsx` has to be
   re-taken** once that session commits.

## COLD REVIEW, 2026-09-12 — the customer's side

Second fresh agent, same conditions: no knowledge of this session, denied
`FOUND.md` and `ROADMAP.md`, read-only, nothing submitted. It walked `/`,
`/pricing`, `/examples`, `/terms`, `/privacy`, both tenants' booking flows end
to end including a two-vehicle path, and all three opt-out ids, at 1440x900 and
392x844 in both languages.

**It found no crash, no dead control, no step that cannot be finished, no price
that disagrees with itself anywhere, and no sideways scroll at either width.**
It arithmetic-checked the whole quote chain ($140+$95+$40+$60+$40 = $375,
itemised to $375 on step 7) and `/pricing` against the landing page, and they
agree. `/book/demo-riverside` is the mobile-only configuration that used to
white-screen `StepLocation`, and it renders correctly.

**Verified here by reading the source:**

- **A DISABLED *Continue* WITH NO REASON, ON BOOKING STEPS 4 AND 6, AND THE
  MECHANISM IS THAT THE HINT SLOT IS OCCUPIED BY THE PRICE.**
  `BookingPage.jsx:692` renders "Choose a service to start" **only in the `else`
  of `quote ? … : …`** — so the moment a quote exists the slot shows the total,
  and every later step's disabled button is silent. Step 1 is not doing
  something the others forgot; it is the only step that can. **A phone customer
  taps a dead button and leaves**, and this is the likeliest single thing on
  this list to cost a real booking.
- **THE SERVER BUILDS A PRICE LINE WITH AN EM DASH, AND THE SAME TEMPLATE USES
  A MIDDLE DOT SIX CHARACTERS LATER.** `_shared/pricing.ts:449` is
  `` `${ORDINALS[i+1]} vehicle — ${v.label}` + (v.model ? ` · ${v.model}` : "") ``
  — so a two-vehicle quote reads "2nd vehicle — Small · Ford F-150", both
  separators in one string. Line **283** has the same shape for plan discounts
  (`` `${plan.name} — ${what}` ``) and was not seen rendered. **Neither is in a
  `t()` literal and neither is translated**, so they are English on a Spanish
  review — the fourth and fifth instances of the join class after the two
  timezone pickers and the two booking fees.
- **"unos 1 h".** `es.js` maps `"about {time}"` to `"unos {time}"` — one
  masculine-plural template for every duration, so the singular cases are
  ungrammatical on the first screen a Spanish-speaking customer reads. The
  plural cases are fine.

**Measured by the agent, NOT re-verified here, and two of them sit in files the
other session currently has open:**

- **Two contrast failures on `/pricing`**, both on the cheaper plan's price in
  the light band: "a month" at **2.41:1** and "no build fee · no term" at
  **3.25:1**, against a 4.5 floor. Its guess is dark-theme muted greys used
  inside a light section. **`PricingPage.jsx` is uncommitted in another
  session's hands as of 15:00 — re-take this before acting on it.**
- **Two tap targets under 32px at 392** on `/`: "See them all" at 79x22 and
  "Or just the booking page" at 184x23, both `.softlink`, no padding and no
  pseudo-element. Both sit beside large buttons going to the same place.
  **`LandingPage.jsx` is likewise uncommitted elsewhere.**
- Booking step 4's travel-area control is a native `<select>` with exactly two
  options, which SCREEN RULES forbids — and `composition` test 2 cannot catch it
  because the options come from `.map()` and the mapped-list exemption applies.
  It is also price-bearing: the second option adds $40.
- The running total holds a stale price for ~730ms after a vehicle-count change
  with no spinner, no `aria-busy` and no dimming. Low impact at that speed;
  longer on a real phone connection.
- Minor: `<html lang>` stays "en" in Spanish on the booking flow AND the opt-out
  page; an error already on screen does not re-translate when the language is
  switched; "That address needs something after the dot, like .com." is shown
  for `tester@example`, which has no dot at all; `.bk-error` carries no
  `role="alert"`, so a validation failure is announced to nobody;
  `document.title` on the opt-out page is "Detailing Platform" rather than the
  business, unlike every booking page.

**AND ITS WITHDRAWAL IS THE MOST USEFUL THING IN THE REPORT.** It had written up
the booking page's "What's included" disclosure as a dead control — pressing it
set `aria-expanded="true"` and added `.on` while the panel stayed at
`height: 0`. It then chased that as a stale dev server. **Both conclusions were
its own instruments.** The pane was HIDDEN, which froze the transition at
`currentTime: 0` (trap (d), costing it two false findings before it noticed),
and its CSSOM walker was broken because **a `CSSStyleRule` in modern Chrome has
a truthy but EMPTY `cssRules` for CSS nesting**, so a recursive walk treats every
rule as a container and collects zero selectors. Forcing
`getAnimations().forEach(a => a.finish())` opens the panel to 130.2px. **The
control works.** It also nearly filed an empty decorative `<span class="dots">`
as a clipped control rail. It baselined its own tap-target probe against a 20x20
control, a 40x40 control and a 7x7 button with an `inset: -13px` pseudo-element
before trusting a single number from it.

---

## Handed over by the DP Website session as it stood down, 2026-09-12

**Andrew asked for DP Cowork to be the one building session. These are the
things that session now owns, written here because they will not survive the
conversation they were found in.**

- 2026-09-12 — **THE ALREADY-LEAKED LANGUAGE VALUE IS A SEPARATE BUG FROM THE
  LEAK, AND STOPPING THE LEAK DID NOT HEAL IT.** `3b9f058` stopped `?lang=es`
  from ever setting the dashboard's scope again. It could not remove the value
  it had already written: a browser that visited a Spanish booking link before
  that commit still holds `dp.lang.app=es` in `localStorage`, so the whole
  dashboard renders Spanish for an English detailer. **Measured by the reviewer
  after the fix landed**, with `dp.lang=en` sitting beside it.
  **AND THERE IS NO WAY OUT FROM THE SCREEN.** `LanguagePicker` renders on the
  booking surfaces only; the dashboard has no EN/ES control anywhere, so a
  detailer in this state cannot change it back without clearing site data.
  Three separate things to decide: whether to migrate the stale value once on
  load, whether the dashboard gets a language control, and whether it belongs
  in settings or the header.
- 2026-09-12 — **`<html lang>` SAYS "en" ON THAT SPANISH DASHBOARD, AND THE
  CAUSE IS TWO SCOPES WRITING ONE ATTRIBUTE.** Read from the code rather than
  measured: `localeStore.js`'s `stamp()` runs inside `makeLocale`, so **every**
  scope stamps `document.documentElement.lang` at module load, and `setLocale`
  stamps again. `i18n.js` (customer, `dp.lang`) and `appI18n.js` (dashboard,
  `dp.lang.app`) therefore fight over one attribute and the last import wins,
  whichever scope's words are actually on screen. The attribute is a claim
  about the DOCUMENT and the product has two languages live in one document —
  so this needs a decision about which scope owns it per route, not a bigger
  `stamp()`.
- 2026-09-12 — **`/app/today` mixes languages mid-column**: *"Let's build your
  website."* renders English between two Spanish lines. The coverage ratchet
  reports `0 of 1051` missing, so this string is not reaching it — same class
  as the two already in this file (a sentence held as a plain value in a data
  table such as `lib/setup.js`, or a literal never wrapped in `t()`). **The
  ratchet walks `t()` call sites, so a string that never becomes one is
  invisible to it**, which is the exact hole `tests/spanish.test.mjs` § 10e-f
  was added to close for the vehicle tiers and which nothing closes generally.
- 2026-09-12 — **PARKED, NOT A BUG, NEEDS A NATIVE SPEAKER:** the Spanish
  duration reads *"unos 1 h 15 min"*. The reviewer flagged it at low confidence
  and explicitly asked that it not be changed on his say-so.
- 2026-09-12 — **PARKED, HIS TASTE CALL:** the eleven sentence-titles, and the
  green house buttons (already declined once — his prior decision stands).
- 2026-09-12 — **`.btn.sm`'s 38px tap target is a RECORDED exception**
  (`PRODUCT.md` § Accessibility: 28 call sites, the job card's Navigate · Call ·
  Text row, the label ceiling measured at that height, *"Reopen it with the
  owner, not in passing"*). The wizard's quit link was raised to `--tap`
  individually because it is one link at the bottom of a scrolling wizard and
  costs nothing the exception protects. **The class itself was deliberately
  left alone.**

- ~~2026-09-12 — **ONE CONTROL IN THE WEBSITE BRIEF IS STILL UNDER THE 44 FLOOR
  AND I COULD NOT ESTABLISH WHY.**~~ **CLOSED, AND THE ENTRY WAS WRONG ABOUT ITS
  OWN FACTS.** There was no odd one out: with a sub-pixel probe calibrated
  against a synthetic 20x20 (which reads 20.98, so the instrument over-reads by
  0.98px), ALL THREE placespots read 43.19 identically — the "43 versus 47"
  split was the uncalibrated integer probe, not the product. The cause is that
  `inset` on an absolutely positioned child resolves against the PADDING box, so
  the 2px dashed border ate 2px of extension per side. `inset: -10px` now, and
  all three clear. **Kept rather than deleted, because the wrong reading is the
  lesson: an instrument nobody has calibrated invents a pattern and then you go
  looking for a cause for it.** The original text: Step 18 (Contact), `.placespot` "Footer
  only": 280x31 painted, **43px reachable** after the `::after` fix took it up
  from 31. Its two siblings on the same screen reach 47. The probe reports
  `above=BUTTON.placespot below=BUTTON.placespot` at ±5px, which says another
  spot's target is adjacent — but `SPOTS` places the three zones 55px apart on a
  240px diagram, so that should be impossible. **Most likely the step renders
  TWO `PlacePicker` diagrams and this spot sits near the seam between them; not
  confirmed.** Reported rather than guessed at: 43 is better than 31 and it is
  not 44, and saying "fixed" would be the thing this repo punishes. The other
  175 controls across all 21 steps clear the floor.

- ~~2026-09-12 — **THE SUPPORT EMAIL IN THE GEAR IS 183x14 AND DOES NOT CLEAR
  THE 44 FLOOR.**~~ **FIXED, AND THE EXEMPTION DID NOT COVER IT.** Cowork wrote
  the inline-prose exemption CONDITIONAL — it holds only where the same
  destination is also reachable from a full-size target on the SAME screen — and
  on the gear index the only other support route is the "Report a problem" row,
  which opens a screen and is therefore a different destination. So the address
  came out of the sentence onto its own line as a `.btn.sm`, the pattern
  `ReportProblem` already used. 318x38, reaching 44; that screen now reads 0 of
  21 under the floor. **The landing page still renders the same address inline
  and is a gap rather than an exemption** — it sits outside `docs/BAR.md`, which
  is scoped to the detailer side. The original note: `GearMenu.jsx:248` renders `support@detailingplatform.com` as an
  inline `mailto:` inside a sentence. **Deliberately NOT grown**, and this is a
  judgement for Cowork rather than an oversight: an inline link in running prose
  cannot take a 44px target without its hit area covering the lines of text
  above and below it, and the `::after` pattern is written for a MARK that is
  deliberately small — a dot, a swatch, a 31px zone — not for a word inside a
  paragraph. The same address renders the same way on the landing page
  (`LandingPage.jsx:1219`). Either it becomes a real row, or the bar records an
  inline-prose exception. Reported with the measurement so the decision is his.

## THE RATCHET'S BLIND SPOT, IN PLAIN WORDS — 2026-09-12

**Cowork asked for this in FOUND.md rather than only in a conversation, because
it is the finding that says every coverage number this project produced before
today was an undercount.** It is written for somebody who was not here.

**WHAT THE NUMBER USED TO MEAN.** `scripts/i18n-coverage.mjs` found every place
the code asks for a translation by writing the English out in full —
`t("Save")` — and checked each one had a Spanish entry. On 2026-09-12 it
reported **1,051 distinct strings, 0 missing, 100% coverage.**

**WHAT IT COULD NOT SEE.** Some screens do not write the English out. They keep
their words in a list and hand a variable to the same function: `t(q.question)`,
`t(step.title)`. **To the scanner that is a call with no string in it, so it was
not counted as anything** — neither as covered nor as missing. It simply was not
there.

**WHAT THAT COST, in one sentence.** The website brief rendered *"Let's build
your website."* in English between two Spanish sentences on a Spanish dashboard,
while the check that is supposed to catch exactly that said 100%.

**THE SIZE OF IT: 257 strings**, 238 of them the brief's own questions and the
options under them — more than a fifth again on top of a number that called
itself complete. None of it was a regression. None of it had ever been counted.

**AND THE LIMIT WAS ALREADY WRITTEN DOWN.** The scanner's own header said, in
as many words, that `t(label)` with a variable was invisible to it. **Writing a
limit down is not the same as closing it**, and a number that says 100% beside a
documented blind spot will be read as 100% by everyone who comes after.

**WHAT IT DOES NOW.** It still reads the call sites, and it also IMPORTS the
eight modules that keep prose in data tables and walks their values, so a list
of questions is counted whether the code spells its strings out or not. A string
is treated as prose unless it looks like an identifier, and rejecting is the
safe direction — a false positive sends somebody to translate a storage key,
which is how a check gets switched off.

**TWO FILES STILL CANNOT BE SCANNED AND IT SAYS SO ON EVERY RUN.**
`lib/push.js` and `lib/password.js` read `import.meta.env` at module load, which
Node has no value for. They print as **NOT SCANNED** rather than being skipped,
because a skipped check reads exactly like a passing one.

**THE RULE TO CARRY FORWARD: a coverage number is only ever a number about the
INSTRUMENT.** Before quoting one, ask what shape of code it cannot see. This
repo has now had four instruments report a confident wrong number — the Spanish
suite passing 58 over 141 gaps, `sweep-widths.mjs` printing "clean" over 38
findings, a `pushState` sweep passing 22 screens it never visited, and this.

- 2026-09-12 — **`scripts/e2e-booking.mjs` IS 71 PASSED, 9 FAILED, AND IT IS NOT
  NEW.** Measured both ways: the same 9 fail on `HEAD` with all working changes
  stashed, so it predates today's booking work. The failures cluster on one
  path — *"the review step prints a total"*, *"with the name the customer
  typed"* (an address), *"charged what the price bar printed"*, *"the request is
  waiting on Today"*, *"findable in the calendar's history"*, *"it is still a
  live booking — pending"* — twice over, which reads as two scenarios failing
  the same way rather than nine separate defects. **Nobody has flagged this**,
  and a suite that is quietly red is one everybody stops reading; that is the
  same disease as `password-reset` being red for days over three wrong tests.
  Not investigated here — it was not this session's item, and absorbing it into
  an unrelated commit would have hidden it.


## VEHICLE SIZE TIERS — WHAT THE CODE DOES, 2026-09-12

**Answered from the code at Cowork's ask, because the first-run wizard sits over
the Business screen on the seed tenant. This is what it DOES, not what it should
do.**

**1 · THE FEATURE EXISTS AND THE COUNT IS NOT FIXED.** `business_settings.vehicle_sizes`
is a JSON ARRAY. `core.js:174` uses it whenever it is a non-empty array and only
falls back to `DEFAULT_VEHICLE_SIZES` (three: Small / Medium / Large) when it is
absent or empty. A detailer can **add, remove, rename and reorder** tiers.
Minimum one — `removeSize` returns early and the X button is `disabled` at
`sizes.length <= 1`. **No maximum is enforced anywhere.** The booking page
already expects more than three: `StepVehicle`'s `SIZE_CARD_CEILING = 4` draws
cards up to four and a drop-down from five, with the measurement in its comment.
So Sedan/SUV/Van/Truck and a five-tier ladder are both supported today.

**2 · WHERE.** `screens/more/Catalog.jsx` — the **"Services & add-ons"** row on
the Business tab, or **setup step 1**, *"What do you charge for?"* (the setup
step renders the same screen). Add pushes a new entry with a slug key from
`slugKey(label, takenKeys)`; edit changes `label` and `examples` and KEEPS the
existing key; remove filters it out; `moveSize` reorders. Two tiers may not
share a name — checked case-insensitively, because two identical cards is a
broken-looking page.

**3 · WHAT A SPANISH CUSTOMER SEES.** One line decides it, `StepVehicle.jsx:70`:

```js
const PLATFORM_SIZE = Object.fromEntries(DEFAULT_VEHICLE_SIZES.map((s) => [s.key, s]));
const sizeText = (s, field) =>
  (s[field] && s[field] === PLATFORM_SIZE[s.key]?.[field] ? t(s[field]) : s[field]);
```

- **Shipped default, untouched** — key `small`, label `Small` matches the
  platform's → `t("Small")` → **Spanish**. Intended.
- **Renamed to "Lifted truck"** — editing keeps the key `small`, and
  `"Lifted truck" !== "Small"` → **English, untranslated**. Intended: they are
  the detailer's words.
- **A fifth tier added** — `slugKey` mints a new key, `PLATFORM_SIZE[newKey]` is
  `undefined`, the comparison is false → **untranslated**. Intended.
- **A detailer types `Small` as their OWN word** — matches the platform string →
  **TRANSLATED, without them asking.** This is the defect. It applies field by
  field, so a custom `examples` beside a coincidental `label` translates one and
  not the other.

**4 · IT IS A STRING COMPARISON, NOT A FLAG. There is no `edited` or `custom`
field anywhere in `vehicle_sizes`** — grepped. So a detailer who deliberately
types `Small` is **indistinguishable** from one who never touched it, and their
word is translated for them. Cowork's reading is correct.

**THE PROPOSED FIX, NOT BUILT — Andrew's product decision.** An `edited: true`
flag written the first time a detailer saves that tier, with `sizeText`
translating only when the flag is absent. It settles the question permanently
because it records the ACT rather than inferring it from the text. **The
migration is the part that needs deciding**: existing rows have no flag, so
either a missing flag keeps today's behaviour (string comparison, the bug
survives for rows already saved) or a one-off backfill stamps `edited` on every
tier whose text already differs from the platform default — which is the same
comparison, run once, at a moment when it is still the best evidence available.

**AND A SECOND-ORDER EFFECT NOBODY HAS RAISED, found in the same read.**
`Catalog.jsx:101` seeds the editor from `DEFAULT_SIZES.map(d => ({ ...d,
label: t(d.label), examples: t(d.examples) }))` — **in the DETAILER's language.**
So a detailer whose dashboard is Spanish, who opens that screen and saves,
freezes `Pequeño / Mediano / Grande` as their own words. Those then never
translate back, and an **English-speaking customer of that detailer sees Spanish
tier names.** The comment above it says this is deliberate — *a default is a
starting point offered to a human, so it arrives in their language* — and it is
consistent with the fourth axis, but the consequence is worth Andrew seeing
rather than discovering.

**Not affected either way: a booking already taken.** `bookings.vehicle_size_label`
stores the words as they were at the time, and `_shared/email.ts:93` reads
`vehicle_size_label || vehicle_size`, so history does not move when a tier is
renamed.

## THE NINE e2e-booking FAILURES — 2026-09-12

**ZERO ARE MINE, measured by name and not by count.** `scripts/e2e-booking.mjs`
reports **71 passed, 9 failed** on `34ae75d` and the **identical nine** on its
parent `edb350c`, with the pre-change code checked into the working tree so the
dev server actually served it. A `diff` of the sorted failure lists is empty.

The nine, as they print:

- `the review step prints a total — $105`
- `the review step prints a total — $150`
- `with the name the customer typed — 140 Market Street, Long Beach, CA` (twice)
- `charged what the price bar printed — bar $105, row 105`
- `charged what the price bar printed — bar $150, row 150`
- `the request is waiting on Today`
- `the job is findable in the calendar's history`
- `it is still a live booking — pending`

**TWO OF THEM PRINT EQUAL VALUES AND STILL FAIL** — *bar $105, row 105* and
*bar $150, row 150*. A comparison reporting two equal-looking numbers as unequal
is comparing a formatted string to a number, or a currency symbol to none.
**That is the signature of a stale test, not a product defect**, and it is the
same shape as the three `password-reset` failures that all turned out to be
wrong tests.

**NOT INVESTIGATED HERE, DELIBERATELY.** It was not this session's item and
folding it into an unrelated commit would have hidden it. **But it is the same
disease as the i18n ratchet**: nine red tests everybody has learned to scroll
past are nine tests nobody reads, and the one real regression hiding among them
would never be seen. Somebody has to sort which is which, one at a time, and
record the verdict beside each.

## FIVE RED SUITES NOBODY HAD NAMED — 2026-09-12

Found by running all 44 test files in one pass while auditing the instruments.
`platform-admin` was known (ROADMAP said 46; it is **48**). **The other four
were not.**

| suite | failing |
|---|---|
| `platform-admin` | 48 |
| `dead-mans-switch` | 5 |
| `multi-vehicle` | 1 |
| `plans` | 1 |
| `platform-billing` | 1 |

**56 failing checks, on top of `e2e-booking`'s nine.** None is triaged here.

**AND THE SHAPE IS THE SAME AS EVERYTHING ELSE TODAY.** A suite that is quietly
red is a suite nobody reads, and the one real regression hiding in 48 stale
checks is the reason it matters. `platform-admin` has been red since at least
2026-09-11 with a note saying somebody has to sort which is which, one failure
at a time, and nobody has.

**Two of the four new ones are single failures**, which is the cheapest possible
triage and the most likely to be a stale assertion — and also the easiest to
have been introduced by today's work, so they should be checked against their
parent commits by NAME before anyone assumes.

## THE INSTRUMENT AUDIT — 2026-09-12

**8 tools audited, 8 caught their break, 0 failed the baseline.** composition,
design-contrast, route-contract, booking-core, setup-progress, tours, spanish,
landing-pricing. With `sweep-widths.mjs` that is **9 examined, 1 confirmed
blind** — and that one is fixed.

**THE AUDIT'S OWN FALSE POSITIVES ARE THE FINDING WORTH KEEPING.** Three of the
first eight attempts reported MISSED and **all three were the break landing
outside what the tool asserts**: a CSS edit fed to a check that reads JSX, a
route renamed that `route-contract` never names, an `export /*x*/` that changes
nothing. A fourth was a regex that hit a year in a comment instead of a price.
**Four wrong accusations out of twelve attempts** — so an audit needs the same
discipline it is auditing for: read what the tool asserts, and confirm the break
is inside that contract, before believing a miss.

## THE 56 RED CHECKS, TRIAGED — 2026-09-12

**Diagnosis only. Nothing fixed.**

### The headline: the back office lost six of its twelve capabilities

`supabase/functions/platform-admin/index.ts` answers **twelve** actions:
`create, export, get, impersonate, list, note, prices, restore, site, suspend,
tier, whoami`.

**`app/src` can reach six.** Grepped for each across the whole client:

| action | what it does | reachable from the client |
|---|---|---|
| `create` | register a business signed up in person | **0 references** |
| `export` | hand over the data as a file | **0** |
| `note` | write an admin note against a business | **0** |
| `prices` | edit or clear the platform price table | **0** |
| `site` | set `businesses.site_url` | **0** |
| `tier` | set a business's plan tier | **0** |

The server code, its RLS posture and its tests are all intact. **There is simply
no way to reach them.** Every one was reachable before `45eaf85`.

**WHERE IT HAPPENED, AND WHY NOBODY SAW IT.** `45eaf85` — *"The back office lets
go of a detailer, and looks without becoming them"* — rewrote `AdminPage.jsx`
from **1,436 lines to 798**. Its own commit message lists the checks it ran:
*composition 94, design-contrast, landing-pricing 107, route-contract 31.*
**It did not run `platform-admin.test.mjs`, the suite that guards the file it
was rewriting.** That suite has been red ever since and was read as *"checks
pointing at source that MOVED"*. It was not source that moved. Roughly 500 lines
were deleted and 114 went to `PreviewEntry.jsx`.

**And the dead man's switch went with it.** `"NOTHING outside is watching"` was
in the old file once and is in the new one **zero** times; the staleness display
went from six references to two. That is `dead-mans-switch`'s five failures.

### The split

| | count | |
|---|---|---|
| **REAL DEFECT** | **7 capabilities** | six unreachable actions + the dead-man's-switch display |
| **STALE — proven** | **4 checks** | named below, each with what the product does now |
| **NOT YET CLASSIFIED** | the remainder of `platform-admin`'s 48 | needs one pass per check; not guessed at |

**THE REAL DEFECTS, NAMED:**

1. **`prices`** — the platform price table cannot be edited or cleared from the
   back office. `platform-billing`'s single failure is this.
2. **`create`** — a business signed up in person cannot be registered.
3. **`tier`** — a business's plan tier cannot be set.
4. **`site`** — `businesses.site_url` cannot be set.
5. **`note`** — no admin note can be written against a business.
6. **`export`** — the data cannot be handed over as a file.
7. **The dead man's switch has no display** — the back office no longer prints
   *"NOTHING outside is watching"*, and a job that has never reported no longer
   reads as stale on screen. Five of `dead-mans-switch`'s checks are this.

**THE STALE ONES, PROVEN RATHER THAN ASSUMED:**

- **`multi-vehicle` 2c and `plans` "the line names the plan AND what it did"** —
  **these two are MINE, introduced today.** They assert the em dash literally
  (`/2nd vehicle — Large · F-150/`, `"Bi-weekly — 10% off"`) and I changed those
  joins to the middle dot in `_shared/pricing.ts` without updating them.
  **Proven at name level: both suites are GREEN on `34ae75d^` and RED on `HEAD`**,
  measured with the parent's `pricing.ts` in the working tree. The product is
  correct by the em dash ruling; the tests encode the old spelling.
- **`platform-admin` "no chart"** — asserts no chart exists. **A chart exists (9
  references) and Andrew asked for one**: `docs/back-office-plan-2026-09-09.md`
  says *"charts draw themselves… He has asked for this explicitly on this
  screen."* The check enforces a rule its own owner reversed.
- **`platform-admin` 2b-i** — asserts `/status: "anon"/`. The code now says
  `setStatus("anon")` and renders a Sign in form at `AdminPage.jsx:226`.
  **The behaviour is intact; only the spelling moved.** CLAUDE.md trap (k).

**WHAT IS DELIBERATELY NOT CLAIMED.** The remaining `platform-admin` failures —
the `12x` layout and motion block, the `11x` list block, the `14c` limit
warnings — are **not classified**. Each needs its assertion read against what
the screen does now, and a plausible story is not a check. Two of the three
sampled turned out stale and one turned out real, so the ratio cannot be
guessed from the sample. **A test that looks stale may be the only thing still
guarding something real** — four of twelve break attempts in the instrument
audit wrongly accused a working tool, and the reverse error is live here.

### The rule this earns

**A commit that rewrites a file runs the suite that guards that file.** `45eaf85`
ran four suites, none of them the one named after the screen it replaced, and
six capabilities left the product without a word. The suite said so immediately
and for three days it was read as noise.

## IT WENT UNNOTICED FOR THREE DAYS BECAUSE THE RED WAS RATIONALISED — 2026-09-12

**The transferable lesson, and it is not about the back office.**

`platform-admin.test.mjs` went red the moment `45eaf85` rewrote the screen it
guards. It was not ignored — it was **explained**, in this file's own words on
2026-09-11: *"a mix of checks pointing at source that MOVED… and checks
enforcing rules the owner has since REVERSED."*

**Half of that sentence was true and it was the wrong half.** Some checks WERE
stale — `"no chart"` really does enforce a rule Andrew reversed. But the source
had not moved: roughly 500 lines were **deleted**, and six of the back office's
twelve capabilities went with them. The explanation was plausible, it was
written down, and once written down nobody looked again.

**THIS IS THE SAME FAILURE AS A TOOL THAT ALWAYS PRINTS "clean", WITH A HUMAN
STORY IN PLACE OF A BROKEN EXIT CODE.** Both take a red signal and hand back a
green one. The human version is the more dangerous of the two:

- a broken counter is a bug somebody can find by reading the code;
- a plausible sentence in `FOUND.md` is something the next person **cites**.

**It is also harder to catch, because the story was written by someone who had
actually looked** — it came from sampling the failures, which is more diligence
than most red suites get. Sampling three of forty-eight and generalising is how
a correct observation becomes a wrong conclusion.

**WHAT WOULD HAVE CAUGHT IT, and it took about four minutes:** grepping the six
server actions against `app/src`. `create`, `export`, `note`, `prices`, `site`,
`tier` — **zero references each.** No judgement required, no sampling, no story.

**THE RULE IS IN `docs/BAR.md`:** a commit that rewrites a file runs the suite
named after that file, and a red suite may never be explained away without
evidence — the explanation has to be proved the way the stale ones here were
proved, by showing what the product does now.

**AND THE SWITCH ITSELF IS ALIVE — confirmed before treating its display as the
lowest of the seven.** `watch-jobs` is deployed (v19), runs every fifteen
minutes on `pg_cron`, and pings `platform_settings.healthcheck_url`;
`platform-admin/index.ts:396` still sends `watch: { outside: … }` to the client.
**Only the screen stopped drawing it.** Had the switch been dead too it would
have gone to the front of the queue.
