# FOUND

One line per thing noticed and not fixed. Noticing is not permission to fix.
Claude Cowork decides what becomes work.

---

## READ THIS FIRST: SEVEN ENTRIES BELOW ARE ONE BUG — Cowork's ruling, 2026-09-12

**This file is a list, and a list is the wrong shape for what this run found.**
Read as seven separate entries they are seven unrelated bugs and nobody looks
for the eighth. Read together they are **one defect wearing seven costumes**, and
it is the defining finding of 2026-09-11 to 2026-09-13.

### THE SHAPE

**A thing whose only job is to tell you when something is wrong, telling you
everything is fine.**

Every instance is an instrument, not a feature. Every one was *green*. Not one
of them errored, logged, or looked broken from the outside — and that is not
incidental, it is the mechanism: **the failure mode of a monitor is silence, and
silence is also what success looks like.**

**AND EACH ONE IS WORSE THAN HAVING NOTHING THERE**, which is the part that
makes it worth a section of its own. An empty space invites somebody to build a
check. A green check occupies that space, answers the question, and stops the
search. **The cost is not the missed defect; it is the looking that never
happened.**

### THE SEVEN, IN THE ORDER THEY WERE FOUND

| | the instrument | what it said | what was true |
|---|---|---|---|
| 1 | `scripts/i18n-coverage.mjs` — **the ratchet** | 1,051 strings, **100% coverage** | 257 strings it could not see; a Spanish dashboard rendering English. § THE RATCHET'S BLIND SPOT |
| 2 | `scripts/sweep-widths.mjs` — **the width sweep** | **"clean"** | `found += await say(...)` where `say` returns nothing, so the total was `NaN` from the first width. One run printed 38 real findings above the word *clean*. Bullet 2 below |
| 3 | `tests/platform-admin.test.mjs` — **the red suite** | red, and *explained* in this file's own words as "checks pointing at source that MOVED" | The source had not moved: ~500 lines were **deleted** and six capabilities went with them. Three days. § IT WENT UNNOTICED FOR THREE DAYS |
| 4 | `watch-jobs` — **the watchdog** | reported in about half the time, which reads as alive | It was failing the same way as the thing it watched — pg_net's 5s default. § THE WATCHDOG WAS FAILING IN THE WAY IT EXISTS TO DETECT |
| 5 | **two independent measurements agreeing** | the same defect from two tools, which felt like confirmation | Both used a Range rect, which is a line box and not glyphs. Agreement between instruments that share a method is one result, not two. `docs/BAR.md` |
| 6 | `AdminPage.jsx` — **the storage alarm** | meter 0%, *"nearly full"* never shown | It read `store.cap_bytes`; the RPC returns `total_bytes`. False at every fill level. § THE 45 UNCLASSIFIED |
| 7 | **seven GREEN checks in `platform-admin`** | passing | `beginImpersonation` has zero callers, so `13d`, `13d-ii`, `13d-iii` and `13h`…`13h-iv` guard dead code. § THE 45 UNCLASSIFIED |

**Numbers 3 and 5 are the two that generalise beyond code.** 3 is the human
version — a *plausible sentence* doing the job a broken exit code does, and it is
the more dangerous of the two, because the next person **cites** it. 5 is the one
that survives having good tooling: both instruments were sound, and they were
still one instrument.

### SO THE RULE, AND IT IS NOT "TEST MORE"

**BREAK THE INSTRUMENT ON PURPOSE BEFORE YOU BELIEVE IT.** This repo has shipped
at least six checks that tested nothing, and every one of them was found by
somebody deliberately breaking what it guards and watching whether it noticed.
A guard that cannot be made to fail is not a guard.

**AND A CHECK THAT CANNOT RUN MUST SAY SO OUT LOUD**, in the same breath as its
verdict. `11j-ii` prints *"the column list was not parsed — this check proved
nothing"* rather than passing, which is the one design decision that stops an
eighth costume.

**WHERE TO LOOK FOR THE EIGHTH.** Anything that reports a number nobody has ever
seen be wrong: a coverage figure, a percentage, a count of findings, a green
suite nobody reads, a dot that is always the good colour, a threshold that has
never been crossed. **If you cannot remember the last time it disagreed with
you, it is a candidate.**

---

- 2026-09-13 — **THE NINTH COSTUME, AND IT IS MINE TOO: A CHECK THAT ITS OWN
  SUBJECT'S COMMENTS COULD SATISFY.** `tests/session-ping.test.mjs` § 11 read
  `supabase/functions/session-ping/index.ts` and asserted `/\b502\b/` and
  `/sessions:\s*null/` — the two halves of *a read error is not an empty list*.
  Baselining it, I broke exactly that: the function was made to answer
  `200 { sessions: [] }` on a read failure, which is the seventh costume in its
  purest form. **The suite came back 43 passed, 0 failed.** The function's own
  HEADER documents both strings in prose, so the grep matched the documentation
  and never looked at the code. Fixed by stripping `//` lines before the match
  (§ 10 already did this and § 11 did not), and re-baselined: the same break now
  fails two checks by name. **Nothing was wrong with the product at any point —
  the whole cost would have been a check nobody could ever have made fail.**
  **THE GENERAL FORM: a source-reading check whose subject is a well-commented
  file is asserting the comments unless it is made not to.** Same family as
  `scripts/i18n-coverage.mjs` counting a `t("…")` inside a comment, and the more
  this repo writes rules into headers the more of these there will be. **Every
  existing source-grep check in `tests/` deserves the same one-line question:
  would its own subject's comments satisfy it?** Not swept — it is its own item.
  Lane C.
- 2026-09-13 — **THE EIGHTH COSTUME, AND IT IS MINE: `revoke all on function
  … from anon, authenticated` TAKES NOTHING AWAY.** `create function` grants
  EXECUTE to PUBLIC, and revoking from `anon` does not remove a grant made to
  PUBLIC. Probed with the anon key minutes after applying the migration:
  `translation_spend` answered **200**, and `translation_put` — a
  `security definer` WRITER — reached its own hash check, which is proof of
  execute. The line was present, named the right roles, ran without error and
  protected nothing. Fixed for this feature in `20260913003000`; the check that
  catches it asks the live database rather than grepping the migration for the
  word `revoke` (`tests/translations.test.mjs` § 6).
  **THE PARKED PART IS THE WIDER ONE: every `security definer` function in this
  repo deserves the same three-line probe.** Nine migrations spell it
  `from public, anon, authenticated` and the convention is right; what nobody
  has measured is whether any of the rest missed `public` the way I did. Lane C.
  Not swept, because a pass over forty functions is its own item and two of them
  may be deliberately public.
- 2026-09-13 — **A CHECK THAT THE GUARD REFUSES IS NOT A CHECK THAT THE TABLE IS
  CLEAN.** Baselining the never-a-name trigger by dropping it let the suite's own
  probe write `"Coastline Auto Detailing" -> "Detallado Automotriz Costero"` and
  `"demo-detail" -> "demo-detalle"`, and nothing deleted them. For about an hour
  `get_business_translations` served a translated business NAME to any Spanish
  visitor — the exact thing Andrew had just forbidden — while the two checks about
  it were green, because they assert the refusal and not the contents. Deleted;
  § 3i is now a standing audit over every business. **The general form: a
  deliberate break can leave residue that outlives the break, so a suite that
  writes forbidden rows to prove they are refused must also assert that none
  exist.**
- 2026-09-13 — **A GUARD THAT CAN OVERRULE A CORRECT ANSWER WILL.** A batch-level
  "every answer echoed = broken provider" check fired at three echoes, and the
  tail chunk of the first real translation sweep was exactly
  `["Exterior", "Interior", "Long Beach"]` — three words DeepL correctly returned
  unchanged. The batch was discarded as a broken provider, fell through to Google,
  and **"Long Beach" was stored as "Playa Larga"**. Threshold raised to eight and
  the rows rewritten. Logged because the shape recurs: a cheap heuristic guarding
  an unlikely failure was given authority over a likely correct one.
- 2026-09-13 — **34 OF 35 EDGE FUNCTIONS ARE RUNNING WITHOUT THE 504 RETRY.**
  `check-deployed` reports them all STALE against `75031a7`, which put
  `retryRead` into `_shared/db.ts` — imported by almost everything. The
  roadmap's open thread names only `send-owner-reminders`; the real answer is
  that nothing carrying the retry is live except `translate-content`. The
  checker is right and resolves imports transitively, so this is not an artifact.
  Lane C. Not deployed, because a 34-function deploy is not this item.

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

*One of the seven costumes — see § READ THIS FIRST at the top of this file.*

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

*One of the seven costumes — see § READ THIS FIRST at the top of this file.*

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

## THE BACK OFFICE WAS SCHEDULED TO DIE ON ANDREW'S FIRST REAL SIGNUP — 2026-09-13

**Not caused by this evening's work, and worse than "six missing buttons".**

`platform-admin/index.ts` line 422 read `monthAgo` in the `list` action's TOTALS
block. `monthAgo` is declared inside the per-business `.map()` forty lines
earlier. **A plain scope error — a `ReferenceError` every time it evaluates.**

**IT LANDED ON 2026-09-06, six days ago**, in a commit titled *"docs: job
photos, the SMS numbers, and two traps worth recording"*. Proven by
`git log -S` on the line itself; the commit that restored `create` touched only
`AdminPage.jsx` and is not involved.

**WHY NOBODY EVER SAW IT.** The line sits inside
`real.filter((r) => … >= monthAgo)`, and `real` is `rows.filter(r => !r.is_demo)`
— **the businesses that are not demo fixtures.** Every business on the platform
was a fixture, so `real` was empty, so the callback never ran, so the error never
had a chance to throw. **`Array.prototype.filter` does not evaluate its callback
on an empty array**, and that is the whole of why a six-day-old crash was
invisible.

**THE FIRST GENUINELY REAL BUSINESS DETONATES IT**, and takes the entire back
office with it — `list` feeds all four tabs, so Now, Detailers, Money and
Plumbing all render the error boundary and nothing else. **That is exactly what
`create` exists to produce.** The failure was scheduled for the first detailer
Andrew ever signed up in person, on the screen he would be standing in front of
while doing it.

It surfaced here because restoring `create` produced the platform's first
non-demo row.

**WHAT NO CHECK IN THIS REPO WOULD HAVE CAUGHT IT.**
`tests/platform-admin.test.mjs:541` greps for the per-business `monthAgo`
declaration and its use — **the correct pair, forty lines above the broken
one** — and passes. Nothing asserts the totals block, and a source grep cannot
see a scope. **A latent crash behind an empty array is invisible to every
instrument here**; the only thing that finds it is a real row and a loaded page.

**AND LOOKING AT THE PAGE IMMEDIATELY FOUND A SECOND DEFECT.** The Money tab
prints `[object Object]` four times under *"What we charge"*, where the price
table's four groups should be. It is folded into the `prices` item, which is the
next of the seven.

## THE WATCHDOG WAS FAILING IN THE WAY IT EXISTS TO DETECT — 2026-09-13

*One of the seven costumes — see § READ THIS FIRST at the top of this file.*

**This belongs beside the lying instruments, because it is the same disease in
its purest form.** The three earlier ones reported success regardless of
reality. This one is worse in kind: **the component whose entire job is to
notice silent failure was itself silently failing.**

`watch-jobs` is called by `pg_cron` through `net.http_post`, with no
`timeout_milliseconds` — so pg_net's default five seconds applied to it too.
Measured over the six hours `net._http_response` retains:

| | timed out | succeeded |
|---|---|---|
| `send-owner-reminders` (`:00 :15 :30 :45`) | **24** | **0** |
| `watch-jobs` (`:07 :22 :37 :52`) | 13 | 11 |

**The reminder sweep did not fail intermittently. It failed every single time.**
And the watchdog sat on the boundary, succeeding about half the time — which is
the worst possible place for a watchdog to sit, because it still reports often
enough to look alive.

**HAD THE WATCHDOG DRIFTED A SECOND SLOWER, NOTHING WOULD HAVE BEEN WATCHING AND
NOTHING WOULD HAVE SAID SO.** Both jobs now carry an explicit 30-second timeout.

## HOW LONG THE REMINDER SWEEP HAD BEEN FAILING — measured, and the limit stated

**Confirmed: from 2026-09-12 08:00 to 2026-09-13 01:53, about eighteen hours.**
`job_heartbeats.ran_at` is the last time it FINISHED, and it held 08:00 until a
manual run moved it.

**I CANNOT SEE FURTHER BACK AND WILL NOT ESTIMATE.** `net._http_response` is
pruned by pg_net and holds roughly six hours — 48 rows, oldest 2026-09-12 20:00.
The heartbeat is a single upserted row with no history. **So eighteen hours is a
floor, not a total**, and the honest answer to *"was that just when somebody last
looked"* is that the evidence runs out before the failure does.

**WHY IT EVER SUCCEEDED, WHICH IS THE CRUEL PART.** The sweep's duration scales
with how much there is to do. Called with the cron's exact headers it returns
**200 in 5,292 ms** — a few hundred milliseconds over the limit. So it succeeds
when there is nothing to send and fails whenever there is something to send.
**A job that works whenever it has no work is indistinguishable from a job that
works**, and that is why eighteen hours passed with a green cron history:
`cron.job_run_details` showed an unbroken run of `succeeded`, because
`net.http_post` succeeds at QUEUEING regardless of what happens next.

## DID A CUSTOMER MISS AN EMAIL — no, and here is the mechanism

**The queue DRAINS. It does not discard — with one exception.**
`get_bookings_due_for_reminder` selects on `..._sent_at is null` AND
`b.start_at > now()`. So a reminder that came due during an outage is still sent
when the sweep next runs, arriving late.

**The exception is the whole risk: a reminder is LOST, permanently, if the
appointment itself starts during the outage**, because `start_at > now()`
excludes it for ever after. Nothing retries it and nothing reports it.

**MEASURED FOR THIS OUTAGE: nobody real was affected.** Every booking whose
start time fell inside the window belongs to a business with `is_demo = true`
(Coastline Auto Detailing, Phase1 Detailing A — seeded fixtures). The only
`is_demo = false` row on the platform is the test business created an hour
earlier while restoring `create`, and it has no bookings. **18 future bookings
had unsent reminders; those drain late rather than being lost.**

**So there is nobody to apologise to.** The mechanism, however, is real: the same
eighteen hours with one real detailer and one morning appointment would have
silently cost that customer their reminder, with no record that it had happened.

**STILL UNDER OBSERVATION.** The first cron tick after the timeout was raised
did NOT time out — it waited, and returned **500 `{"error":"Gateway Timeout"}`**
from Supabase's own edge gateway, which is a different limit from pg_net's. The
same call by hand a minute later returned 200 in 5.3 seconds. One occurrence,
not yet explained, and recorded here rather than assumed benign.

## "INTERMITTENT" AND "COULD NEVER HAVE WORKED" LEAD A READER SOMEWHERE DIFFERENT

**Cowork's framing, 2026-09-13, and it is the sentence to keep.** A ten-second
job against a five-second limit **cannot succeed**. There was never a good
period — only an unmeasured one.

The proof is the contrast inside one six-hour window:

- `send-owner-reminders` — **0 successes out of 24.** Not one.
- `watch-jobs` — 11 out of 24, because it is the faster of the two and lands
  either side of the same line.

**If both had been flaky, both would have been mixed.** One job at zero while
its neighbour is at half is the signature of a STRUCTURAL limit rather than a
flaky network, and it is the only reason anyone can say which this was.

**WHY THE WORDING MATTERS MORE THAN THE DIAGNOSIS.** *"It was failing
intermittently"* invites a future reader to wait and see whether it recurs, to
add a retry, to treat green runs as evidence of health. *"It could never have
worked"* tells them the green runs were the job having nothing to do, that a
retry would have failed identically, and that the fix has to change the limit or
the duration. **Same facts, opposite next actions.**

- ~~2026-09-13 — **OPEN: one unexplained `500 {"error":"Gateway Timeout"}` after
  the cron timeout fix.**~~ **EXPLAINED AND PROVEN 2026-09-13. IT WAS NOT ONE
  OCCURRENCE, IT WAS NOT TRANSIENT, AND THE 500 IS OURS.** The entry below is
  kept because its three wrong claims are each instructive. Full account:
  § THE "GATEWAY TIMEOUT" IS OUR OWN CATCH BLOCK.
  At **02:00:00 UTC**, the first `send-owner-reminders`
  tick after `timeout_milliseconds` was raised to 30,000 did NOT time out at
  pg_net — it waited and received a 500 from ~~**Supabase's own edge gateway**~~
  **OUR OWN FUNCTION**,
  which is a different limit from pg_net's and is not something raising
  `timeout_milliseconds` can affect. **The same call by hand at ~~02:04~~
  02:01:23 returned
  200 in ~~5,292~~ 5,162 ms** with the cron's exact headers, and sent one owner reminder.
  ~~One occurrence.~~ **Thirty REST 504s in ninety minutes.** ~~Not closed, not explained, and deliberately not chased~~
  while the Today screen is being built — recorded here so it survives that.
  **What to check first:** whether it recurs on later ticks, and whether it
  correlates with a cold start or with a large backlog, since the sweep is
  slowest exactly when it has most to do. **It recurs on EVERY later tick, and
  it correlates with neither — it correlates with HOW MANY REST CALLS THE
  FUNCTION MAKES.**

## THE "GATEWAY TIMEOUT" IS OUR OWN CATCH BLOCK — proven 2026-09-13

**The eighth costume, and it was wearing the seventh's clothes.** The entry
above recorded a 500 from *"Supabase's own edge gateway"*, one occurrence, not
chased. Every part of that is wrong, and the sentence that made it wrong is the
kind § READ THIS FIRST warns about: **a plausible reading of a body of text,
written down as a finding, cited afterwards as a fact.**

### WHAT IT ACTUALLY IS

`supabase/functions/_shared/http.ts` builds every response this product's edge
functions return, and all three of the functions involved end the same way:

```ts
} catch (err) {
  return json({ error: (err as Error).message }, 500);
}
```

So `{"error":"Gateway Timeout"}` is **`(err as Error).message`**, and
*"Gateway Timeout"* is the HTTP status text of **504**. The function caught a
504 from its OWN outbound call and dutifully reported it as a 500.

**PROVED BY THE RESPONSE HEADERS, WHICH pg_net STORES.** `net._http_response`
keeps `headers`, and the 500s carry
`access-control-allow-headers: Content-Type, Authorization, apikey, x-client-info`
— **byte for byte the `CORS_HEADERS` constant in our own `_shared/http.ts`.**
A platform gateway error cannot emit our custom header list. `sb-error-code` on
the same response reads `EDGE_FUNCTION_ERROR`, which means *the function
returned an error status*, not *the platform timed it out*.

**AND THE 504 IS IN THE LOGS, ONE SECOND EARLIER, EVERY TIME.** `edge_logs`
records the API gateway, and every function 500 pairs with a `504` on
`/rest/v1/`:

| function 500 | the REST 504 behind it |
|---|---|
| 02:30:09 `send-owner-reminders` | 02:30:01 — three due-ness RPCs at once |
| 02:36:05 `session-ping` | 02:36:00 — `session_pings`, a one-row select |
| 02:37:05 `watch-jobs` | 02:37:00 — `claim_job_alerts` |
| 02:45:07 `send-owner-reminders` | 02:45:01 — **six** RPCs at once |
| 03:00:08 `send-owner-reminders` | 03:00:00 — two RPCs |
| 03:15:07 `send-owner-reminders` | 03:15:01 — four RPCs |
| 03:22:00 `watch-jobs` | 03:22:00 — `claim_job_alerts` |

### THE RATE, AND THE REASON ONE JOB DIES AND ANOTHER DOES NOT

**1.1% of every REST call this project makes returns 504 — 30 out of 2,645
between 02:00 and 03:30.** Sampled hour by hour on 2026-09-12 it was **14 to 22
an hour, every hour, whatever the traffic**: 16 of 755, 18 of 616, 22 of 533,
18 of 4,323, 22 of 82, 22 of 34, 14 of 35. **A full day before the timeout fix
existed.** It was invisible because pg_net gave up at five seconds first.

**So a function's chance of dying is its NUMBER OF REST CALLS**, and that is
the whole of why the three behave differently:

| | REST calls | cron ticks survived |
|---|---|---|
| `send-owner-reminders` | 12 statically, more in its loops | **0 of 5** |
| `watch-jobs` | 3 | 3 of 5 |
| `session-ping` | 1 | ~99% |

**AND `if (r.error) throw r.error` MAKES THE SWEEP ALL-OR-NOTHING.** Seven RPCs
go out in one `Promise.all`; one 504 among them aborts the entire run, so no
heartbeat is written and the dead man's switch fires. The 504s arrive in
**bursts of three to six inside a single second**, which is exactly that
`Promise.all` landing.

### WHAT IT IS NOT — each one measured, not reasoned

- **Not slow queries.** `pg_stat_statements`: the slowest statement this
  database has EVER run is **3,449 ms**. Nothing is near a timeout.
- **Not connections.** 18 of 60 in use, 1 active, 0 idle-in-transaction.
- **Not locks.** Zero waiting on a lock.
- **Not the edge runtime's wall clock or CPU.** Every `function_logs` shutdown
  in the window — 261 of them — reads `reason: EarlyDrop`. Not one kill.
- **Not duration.** `session-ping` normally answers in 250 ms; when it fails it
  fails at 5.2 s. A one-row select cannot be too slow.
- **Not pg_net.** `session-ping` is called by a script, not by cron, and it
  fails the same way.
- **Not the caller.** The same call by hand returns 200. That is the 98.9%,
  not a difference in path.

**SO IT IS UPSTREAM OF POSTGRES AND INSIDE SUPABASE'S OWN API LAYER**, on a
nano instance (`shared_buffers` 224 MB, `max_connections` 60). **That is the
limit of what this evidence can establish** — the gateway's internals are not
visible from here, and nothing below this line should be read as knowing why
Supabase drops roughly one REST call in ninety.

### WHAT IS NOT KNOWN, WRITTEN DOWN SO NOBODY CITES SILENCE AS AN ANSWER

- **Whether the live business project `adtlnvihwrcqcasqcjwd` has the same
  fault.** The `SUPABASE_ACCESS_TOKEN` in `.env` reaches exactly one project,
  `kguqylyzgyzfktkfnhjb`. **That project takes real customers' money and this
  session cannot see it.** Nobody has checked. It is not safe to assume either
  way.
- **How far back it goes.** The analytics API throttled after nine hourly
  samples. Every hour sampled had it. The evidence runs out before the failure
  does — the same sentence this file already had to write about the eighteen
  hours, for the same reason.
- **Why the gateway 504s.** Unknown, and not knowable from this side.

### THE INSTRUMENTS WERE BROKEN ON PURPOSE FIRST

**Two claims here rest on one log query, so it was made to fail before it was
believed.** Run over 03:17–03:21 — a stretch with a hand-run 200 and 120 clean
probe calls in it — it reports **78 requests, zero 504s**. Run over
02:44–02:46 it reports **19 requests, six 504s, 31.6%**. It discriminates; it is
not painting every window red.

**AND THE CORRELATION IS ONE-WAY, WHICH IS ITSELF THE CHECK.** A 504 does not
always kill a function: at **03:07:01** `platform_settings` returned 504 and
`watch-jobs` still answered **200** at 03:07:06, because that call's error was
not on a fatal path. If every 504 produced a 500 the pairing would be an
artifact of counting. It does not, so it is not.

**AND A SECOND INSTRUMENT, DELIBERATELY NOT SHARING THE FIRST'S METHOD, PROVED
NOTHING — SAID HERE RATHER THAN DRESSED UP AS AGREEMENT.** 120 calls to
`session-ping` from outside, one every three seconds, returned **120 × 200 and
zero failures.** At a 1.1% rate the chance of a clean run of 120 is **26%**, so
that result is consistent with the finding and also consistent with the finding
being wrong. **It is too small a sample to be evidence either way**, which is
`docs/BAR.md`'s rule about agreement read from the other end: a second
instrument that cannot resolve the effect is not a second opinion.

## THE LANDING PAGE PUTS A CARD ON TOP OF A PARAGRAPH AT 1024px — 2026-09-13

**Found by the new overlap check on its first retro-run, and it is exactly the
defect Andrew caught by eye on Today.** The "Your back office fits in one hand"
section (`section.figband`): `.figcard.front.pay` is `position: absolute`,
`z-index: 3`, transparent background, and it sits **65px into the first line and
18px into the second line of the paragraph beneath it**.

**MEASURED AS INK, NOT AS BOXES.** The paragraph's own line boxes, taken with a
`Range`, run to x 535.2 and x 488.6; the card's left edge is x 470.2 and it
spans y −2918.6 to −2852.6, which covers both lines. So these are real glyphs
under a real card, not a wrapper's slack.

**IT IS WIDTH-DEPENDENT AND THE STANDARD WIDTHS MISS IT.** At **1440** the hits
are gone. At **1024** — a common laptop, and between this product's 768 and 1440
checkpoints — it is 65px. A sweep at 1920/1440/768/392 would have reported the
page clean, which is its own lesson about a fixed list of widths.

**AT 1440 TWO 2px TOUCHES REMAIN** on the pricing block (`$499` against
`then $40 /month`, `$35` against `no setup fee`). Two pixels is at the probe's
slop threshold and is most likely line-box slack rather than anything a reader
sees. **Recorded, not claimed.** They need eyes before they are called defects.

**NOT FIXED, because it is a landing-page layout decision rather than a typo**
and the section is one Andrew has looked at. The fix is either a wider gutter on
`.figcopy` or moving the card off the text column at that width.

## THE 1024 PASS — 2026-09-13, and what it actually found

**One real defect, fixed.** `app/src/landing/landing.css` `.figband`: the copy
column ran past `.figcard.pay`'s left edge, putting a 96%-opaque panel 65px into
the first line and 18px into the second. **The overrun is constant at every
width** — 82.4% of the column needed at 1024, 82.9% at 1180, 83.1% at 1440 — and
only the card's `top: 47%` decides whether it lands on a line. **1440 was never
clean, it was lucky.** Fixed with a measure cap on `.figcopy .lede`, which also
brings a 78-character line at 1440 down to about 64.

**EVERYTHING ELSE FLAGGED AT 1024 WAS THE INSTRUMENT, and that is the finding
worth keeping.** Three separate rect-vs-ink artefacts, all now fixed in
`scripts/overlap-probe.mjs`:

- **A block wrapper's rect is the whole column.** `.ld .mask > span` is
  `display: block`, so "Your back office" reported a 493px rect where its glyphs
  stop at 328px. **This is what produced Cowork's independent `.vs` finding and
  mine.** Two instruments agreed because they shared one blind spot; the two
  figures differed (6px on `.nm`, 3px on `.gt`) only because those elements are
  baseline-aligned at different sizes. Measured as ink: **63px of clearance.**
- **A Range rect is a line box, not glyphs.** `$277` at 52px reports a 69px-tall
  rect; digits use neither the ascender above cap height nor any descender. The
  threshold is 4px now, which leaves the landing page's 2px pricing touches and
  the dashboard's 2.5px "Neto de este mes" standing as metrics rather than ink.
- **`?lite=1` stacks tab states.** The hero's "Nothing yet" empty state and its
  populated job list are alternate states of one panel; in lite both pass
  `checkVisibility` and the probe reported 16 overlaps between them.

**OPEN, AND NOT CHASED TONIGHT: is that lite stacking a real reduced-motion
defect?** In the normal path only the empty state is visible (`checkVisibility`
false on the job rows). In `?lite=1` both are. If that holds in a real browser,
anybody with reduced motion sees two hero states on top of each other. **It needs
a visible browser pane to settle and it is the first thing to check next.**

**ALSO SEEN, NOT ACTED ON:** the detailer dashboard renders `PLAN · MEMBER RATE`
in English on a Spanish screen.

## THE 45 UNCLASSIFIED `platform-admin` FAILURES, CLASSIFIED — 2026-09-12

*One of the seven costumes — see § READ THIS FIRST at the top of this file.*

**ROADMAP item 1. Diagnosis. One of the five was fixed afterwards — the storage
gauge, `28e7ae3`, on a freeze Cowork lifted for that item alone. The other four
stand untouched until Andrew has looked at these screens.**

**THE SPLIT IS 5 REAL DEFECTS AND 43 STALE ASSERTIONS**, out of the suite's 48
failures — the three already classified above (`no chart`, `2b-i`, and the pair
in other suites) are re-counted here so the number is the whole suite rather
than a remainder.

`node tests/platform-admin.test.mjs` read **111 passed, 48 failed** on `34934b1`;
**112 / 48 on `28e7ae3`**, which added `11j-ii` and fixed the gauge.

**WHY SO MANY ARE STALE, AND IT IS ONE CAUSE RATHER THAN FORTY-THREE.** The
screen was rebuilt into five tabs (Today, Growth, Detailers, Money, Plumbing) on
2026-09-13. The suite was written against the previous single-page layout —
a `.pa-strip` of seven figures, a `.pa-split` two-column list, a `state.status`
object, a `.pa-tag`, a browser-session impersonation. **Every one of those
spellings is gone and every guarantee behind them still holds**, which is
CLAUDE.md trap (k) at scale: the checks assert how the screen was WRITTEN.

### THE FIVE REAL DEFECTS

1. **`9h` · `export` is unreachable, so a detailer's data cannot be handed
   over.** `app/src/admin/AdminPage.jsx` contains no `action: "export"` and no
   `URL.createObjectURL` / `a.download`. The server action, its RPC and its
   service-role revoke are all intact. **The client reaches SEVEN of twelve
   actions** — `list`, `whoami`, `create`, `get`, `restore`, `suspend`,
   `impersonate`. **Unreachable: `export`, `note`, `prices`, `site`, `tier`.**
   *(This corrects the entry above: it is FIVE now, not six — `create` was
   restored at `AdminPage.jsx:878`.)*

2. **`11j` · THE PHOTO STORAGE METER WAS PERMANENTLY 0% AND ITS ALERT COULD
   NEVER FIRE. — FIXED `28e7ae3`, freeze lifted for this one item by Cowork.**
   *The over-commitment half of `11j` is NOT fixed and `11j` stays red: printing
   it would add a visible element, which the freeze still covers.* `photo_store_state()`
   returns `used_bytes, total_bytes, committed_bytes, businesses, share_bytes,
   photos` (`20260906011000_photo_share.sql:81`). `AdminPage.jsx:346` and
   `:1382` both read **`store.cap_bytes`, which that row does not have** —
   `cap_bytes` belongs to the per-BUSINESS `photo_budget` RPC, a different
   function. Run against a store that is 90% full, the meter prints `0%`, the
   *"Photo storage is nearly full"* alert evaluates `false`, and a 500 MB
   over-commitment is printed nowhere. **Same shape as the `monthAgo` scope
   error: plausible code, no error anywhere, and only a real number reveals it.**

   **CONFIRMED AGAINST THE RUNNING DATABASE, by a second method that shares
   nothing with reading the migration:** `POST /rest/v1/rpc/photo_store_state`
   on `kguqylyzgyzfktkfnhjb` returns
   `{used_bytes, total_bytes, committed_bytes, businesses, share_bytes, photos}`
   — **no `cap_bytes`.** The deployed function and the repo agree, and the
   screen reads a key neither of them has.

3. **`11i` · F-016 IS BACK ON THE DETAILER ROW.** `AdminPage.jsx:1037` prints
   `N jobs this month`, and `jobs_month` counts **completed** jobs only
   (`platform-admin/index.ts:237-243`). The line above it, `:1022`, reads
   `Booking · last one today`. A row saying *0 jobs this month* beside *last
   booking today* is the exact pair F-016 fixed by adding the word **finished**,
   and the word is gone.

4. **`13f-iii` · a business with no owner is a dead end.** The impersonate
   button is correctly disabled (`:1171`) and correctly explains itself
   (`:1190`, *"Nobody has accepted the owner invite yet…"*), and **nothing
   offers to resend the invite.** There is no `Resend` anywhere in the file; the
   only invite lives inside the Create flow. The check's own sentence is the
   finding: *saying there is no account and offering no way to make one is half
   an answer.*

5. **`14c-ii-c` · the email cap warning lost the caveat that made it honest.**
   `sent` comes from `platform_email_days` (platform only); `cap` is Resend's
   **account-wide** daily allowance, shared with andrewsdetail.com. The
   sentence saying so is gone — `andrewsdetail` appears nowhere in `app/src`
   except a landing-page mockup. So the line under-reports, which is the unsafe
   direction, with nothing on screen to say it might.

### THE 43 STALE ONES, BY NAME AND BY CAUSE

| cause | checks |
|---|---|
| `state.status` object → `status` useState; the `"error"` branch became `err` | `2b-i`, `2b-ii`, `2b-iii` |
| AdminPage delegates to the shared `<NotFound />` ("That page does not exist.") instead of holding the words | `and the SCREEN says the same thing`, `13c` |
| impersonation replaced by a look-only `/preview` TAB — its own banner at `App.jsx:403`, no session swap, warning removed on purpose | `the button warns before it acts`, `13c-ii`, `13e` |
| the owner asked for the chart; it exists at `:137` | `no chart` |
| the `.pa-strip` of seven figures was replaced by the tab bar | `the check has a strip to count`, `seven figures across the top`, `and exactly one of them is the lead`, `and the two new ones are about the product` |
| no confirmation MESSAGES exist any more; feedback is the row flipping Suspend↔Restore | `9i` |
| `jobKeys`→`state.heartbeats.map`, `pa-quiet`→`pa-ok`, `!beat`→`m === null`, `beat.`→`h.`, `minutes ago`→`min ago` | `10g`, `10h`, `10h-ii`, `10i` |
| `pa-tag`→`pa-flag`; the demo headline became *"Showing X of Y. N demo or test rows…"* | `11f`, `11g` |
| `b?.timezone`→`row.timezone` in the same `monthlySeries` call | `11h-iv` |
| the open business is a modal `role="dialog"` with a scrim, so there is nothing to scroll to | `11k`, `11l` |
| the door names itself in `.pa-lab` and the `<h1>` is *Sign in* | `11m` |
| `.pa-split` / `.pa-rail` / `.pa-back` / `.pa-rest` all replaced by tabs + modal | `12a`, `12c`, `12d`, `12e`, `12f` |
| `key={b.id}`→`key={row.id}`; `useLeaving(onClose)`; `.pa-col.leaving`→`.pa-col.pa-leaving` | `12j`, `12k` |
| `.lite .pa-in, .lite .pa-col` → a four-selector list; `pa-bars`→`pa-chart`; `.now.has`→`.pa-now.pa-has` | `12n`, `12o`, `12q` |
| `state.me`→`email`, still rendered in `.pa-who`; `sess.session.user`→`s.user`; the local `signOutNow` wrapper went so the page calls the one shared door | `13a`, `13a-ii`, `13b` |
| `detail.members.find`→`row.owner_email` | `13f`, `13f-ii` |
| the cap line moved into `alerts` and the Plumbing row; the 0.8 gate is at `:342` and `pa-warn` | `14c-ii`, `14c-iii` |
| threshold mis-calibrated: wants ≥3 stagger delays, there are 2 | `12h-ii` |
| **the check is WRONG, not merely stale** | `12m` |

**`12m` DEMANDS A DESIGN-SYSTEM VIOLATION.** It asserts exactly one
`@media (prefers-reduced-motion)` block in `admin.css`. There are **zero**, and
zero is correct — `main.jsx:46-48` sets `.lite` for both `?lite=1` and the media
query, and `admin.css`'s own § 4 says *"No `@media (prefers-reduced-motion)`
block may appear in this file"*, which `composition` § 9 enforces. Fixing this
check to pass as written would break `composition`.

### THREE THINGS THIS PASS FOUND THAT ARE NOT AMONG THE 45

- **`beginImpersonation` HAS ZERO CALLERS.** It is exported from
  `lib/impersonation.js` and nothing in `app/src` calls it, so the note is never
  written and `App.jsx:419`'s impersonation strip can never draw. **Checks
  `13d`, `13d-ii`, `13d-iii`, `13h`, `13h-ii`, `13h-iii`, `13h-iv` are GREEN and
  guarding dead code** — the mirror image of a red suite nobody reads, and
  harder to see. The replacement banner (`App.jsx:403`) is real and does work.
- **The Plumbing tab has no expected-job list.** It maps whatever rows
  `job_heartbeats` holds, so a cron whose row is missing or dropped is silently
  absent rather than red. The old `jobKeys` merged a named list with the
  reported ones; nothing does now.
- **The dead man's switch display is BACK** — `AdminPage.jsx:1406`, a dot plus
  *"Something watching from outside"* / `set up` / `none`. The entry above says
  it went with `45eaf85`; it has since returned in different words, so
  `dead-mans-switch`'s five failures need the same pass this one just had.
