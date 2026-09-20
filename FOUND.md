# FOUND

One line per thing noticed and not fixed. Noticing is not permission to fix.
Claude Cowork decides what becomes work.

---

## ~~THE MONEY SCREEN COUNTS THREE CATEGORIES THAT CANNOT EXIST~~ — FIXED 2026-09-17

**Found by running `booking_line_items` for the first time.** The table had
never held a row, so nothing had ever compared the three lists that have to
agree, and they do not:

```
the database allows          service, upgrade, add_on, custom, travel_fee, tip, discount
FinalizeModal.jsx offers              upgrade, add_on, custom, travel_fee, tip, discount
moneyAdvanced.js counts as sold-at-the-job     add_on, upsell, surcharge, adjustment
```

**`upsell`, `surcharge` and `adjustment` are refused outright by the check
constraint** `booking_line_items_category_check`, so no code path in this
product can produce one. **The intersection is `add_on` ALONE** — and
`FinalizeModal`'s own default for a new line is `custom`.

**So a detailer who adds $45 of work at the car the ordinary way has it counted
as $0** in the Money screen's *"% of what you brought in was sold at the job"*.
Four of the six categories the form offers — upgrade, custom, travel_fee,
discount — contribute nothing to that figure. The first attempted insert in
this repo's history, with `category: "upsell"`, was rejected by Postgres with
`23514`.

**NOT FIXED, because fixing it means deciding which list is right**, and that
is a ruling about a number Andrew reads rather than a typo. Three options, none
obviously correct: widen the constraint to admit `upsell`/`surcharge`/
`adjustment`; narrow `ON_SITE` to the categories that can exist and decide
whether `upgrade` and `custom` belong in it; or change the form's default away
from `custom`. `ON_SITE` lives at `app/src/lib/moneyAdvanced.js:49`, the
constraint at `supabase/migrations/20260827000200_tenant_data.sql:322`, the
form's list at `app/src/components/FinalizeModal.jsx:31`.

**FIXED THE SAME DAY, AND THE DIAGNOSIS ABOVE WAS HALF WRONG.** The screen a
detailer actually taps — the *"Added on site"* tile on `Money.jsx` — was
**right all along**: it held its own correct list. The wrong list was in
`moneyAdvanced.js`, which feeds the *"The full picture"* breakdown: its *"Sold
at the job"*, its quoted-vs-added bar and its *"Sells an extra"* percentage.
**So the same three words meant two different figures on two screens**, and the
comment in `moneyAdvanced.js` promising the two lists "move together" was
untrue for however long it took anybody to put a row in `booking_line_items`.

**Andrew's ruling, 2026-09-17:** *"anything beyond the base price — any
upgrade of either package, add-on, a travel fee, whatever — counts as more
money we made."*

**There is one list now and it is exported**, so a second copy cannot appear:
`upgrade, add_on, custom, travel_fee, discount` in `app/src/lib/moneyAdvanced.js`,
imported by `Money.jsx`. A discount is negative and nets against the rest. A tip
stays out — it is not a sale, it is already reported on its own, and counting
it here would show the same dollar twice and stop `quoted + added + tips`
adding up to what came in. `upsoldJobs` counts only the sales, so a job whose
only extra line was a discount is not reported as a job you sold something on.

Proved by `tests/money-advanced.test.mjs` § 10 (the list is checked against the
migration's own constraint, read from the file rather than retyped, and
`Money.jsx` is checked for not declaring a list of its own) and by
`scripts/e2e-ten-features.mjs` § 2, which now adds **an `add_on` AND a
`custom`** and requires the figure to move by $75. Against the old code that
section reads $45 and goes red. Seen on the screen: BROUGHT IN $810, QUOTED UP
FRONT $735, ADDED ON SITE +$75.

---

## THE GEAR WAS NEVER OPENED IN SPANISH — eight settings screens, never once checked, lane C, 2026-09-13

**`scripts/spanish-dom.mjs` reached the gear by `button[aria-label*="ettings"]`.
The label reads `Ajustes` in Spanish, so the selector matched nothing, a
`.catch(() => {})` swallowed the miss, and the script carried on measuring the
BUSINESS TAB a second time under the heading `the gear`.** The Business tab
carries `[data-settings-key]` rows of its own, so there was always a list to
walk and it always looked like a settings sweep.

**EIGHT SCREENS HAD NEVER BEEN READ IN SPANISH BY ANY INSTRUMENT IN THIS
REPO:** notifications, templates, team, billing, password, preferences, report,
tour. **FIXED** — the control is addressed by `data-tour="gear"`, which is not
prose, and an anchor asserts the row set CHANGED after the press. Baselined by
pointing the locator at `data-tour="new"`: *"pressing it did not change the
settings list (14 rows, all of them the Business tab's) — it never opened."*

**IT IS TRAP (c) IN A NEW COAT** — a navigation that does not navigate, and
every screen behind it reported fine. What exposed it was counting subjects:
the English run walked 8 rows and the Spanish run walked 14, **and the two
lists are disjoint.** A list of screens that changes with the language is not a
list of screens.

**AND THE GENERAL FORM IS THE PART TO KEEP: A SELECTOR WRITTEN IN PROSE IS A
SELECTOR THAT STOPS WORKING IN THE OTHER LANGUAGE**, which is precisely the
language the check exists to measure. Address a control by `data-tour`, `id` or
role — never by a word a translator can legitimately change.

---

## WHAT THE SPANISH DASHBOARD STILL SHOWS IN ENGLISH — for lane B, measured at `c089ad3`

**Measured against a frozen production build of `c089ad3`, not the dev server.**
Lane B has been editing these files all day, so **some of this is already
fixed** — re-run after committing rather than working from this list:

```
BASE=http://127.0.0.1:4173 node scripts/spanish-dom.mjs
```

**26 distinct English strings on 12 screens.** The ones that are plainly ours:

| screen | string |
|---|---|
| `gear · preferences` | `Used by "Add to calendar" on a booking.` · `Used by "Add to contacts" on a job.` |
| `gear · hours` | `All days` · `Weekdays` · `Weekends` |
| `gear · rules` | `The customer picks one on your booking page and its fee is added.` · `Going away? Pick the day you're back…` · `Short notice` · `+$20.00 when booked within 24 hours` · `You take bookings 2 hours ahead but close changes 24 hours ahead…` |
| `gear · maintenance` | `Which car (optional)` · `Then every (months)` · `No longer applies` |
| `gear · domain` | `Your booking page is detailingplatform.com/book/demo-detail…` · `Not answering yet · the three steps below` · `Check it` |
| `Business`, `gear · faq`, `gear · promos` | `Add question` · `Add review` · `Save` · `Hide` · `Show` · `Put this in your bio, on your cards and in your texts…` |

**THREE OF THE 26 ARE PROBABLY NOT FINDINGS AND LANE B SHOULD TRIAGE THEM, NOT
THIS SCRIPT:** `Headlight restoration` and `Pet hair removal` are seeded SERVICE
names (translatable in principle, but they are that detailer's own rows now),
and **`SUMMER10` is a promo code, which § 6 says is a NAME and must never be
translated.** Nothing in the DOM says where a string came from, so the script
reports them and a person decides — the same shape as `db-audit`'s allowlists.

---

## THE GENESIS COLLISION — a MAKE that quotes itself a tier, lane C, 2026-09-13

**A customer who types `Genesis` and nothing else is quoted the SMALL tier, and
Genesis is half sedans and half SUVs.** `app/src/book/core.js` is lane B's, so
this is recorded rather than fixed.

**WHAT IT IS.** `VEHICLE_BODIES`'s sedan rule lists `genesis` as a MODEL — which
it was, the Hyundai Genesis sedan, before the marque was spun out. It is now a
MAKE with six models in `vehicles.json`: `G70 G80 G90 GV60 GV70 GV80`. Three
sedans and three SUVs. So `suggestVehicleSize("Genesis", …)` returns
`{ key: "small", matched: "Genesis" }` and `suggestVehicleSize("Genesis GV80", …)`
returns `large` — **the same make, two tiers apart, decided by whether the
customer bothered to finish typing.**

**IT IS THE ONLY ONE.** Every one of the other 44 makes in the index returns
null on its own, which is the correct behaviour and the reason this stands out:
Toyota makes a Corolla and a Tundra, so a make is not evidence of anything.
`tests/booking-core.test.mjs` § 18m walks all 45 makes and pins the count at
exactly one, named, so a SECOND collision goes red the day somebody adds a model
whose word is also a make.

**THE FIX IS ONE WORD AND IT IS LANE B'S:** `genesis` comes out of the sedan
rule's alternation. Nothing else needs to change — `G70`/`G80`/`G90` are already
in it, so a Genesis sedan typed properly still lands in the small tier, and the
GV models already match the SUV rules.

**AND THE GENERAL FORM IS WORTH MORE THAN THE ONE NAME:** the body table is a
list of MODELS and the index is a list of MAKES, and nothing checks that the two
vocabularies stay disjoint. A model name that is also a make name is a wrong
price with nobody's tap behind it.

---

## THE TYPO RANKING — the type-ahead offers a car it is LESS sure about, first, lane C, 2026-09-13

**`esclade` is one letter from Escalade and two from Enclave, and Buick Enclave
is the row a customer's thumb lands on.** Escalade is the big tier and Enclave
the middle one, so the price moves without anybody choosing anything.
`app/src/book/core.js`, so lane B's.

**THE CAUSE, AND IT IS A HOLE IN A DESIGN THAT IS OTHERWISE RIGHT.**
`matchVehicle`'s own comment says *"the passes are ordered by how sure they are…
that ordering IS the ranking: there is no score, because a score would need
tuning and a customer cannot see it."* That is true of passes 1 to 4. **Pass 5 —
the typo pass — holds one-typo and two-typo hits in the SAME pass** and pushes
them in index order, which is alphabetical by make. So a distance-2 hit under
`Buick` is offered ahead of a distance-1 hit under `Cadillac`, every time.

**MEASURED, not reasoned about.** 1,336 synthetic one-letter typos built off
every model in the index (a doubled letter and a dropped letter for each):

| | |
|---|---|
| typos where the FIRST offer is a worse match than the real car | **371 of 1,336** |
| of those, where the wrong car is in a DIFFERENT price tier | **156** |

Two of them are pinned by name in `tests/booking-core.test.mjs` § 18kk, which
prints both on every run:

```
NOTE  "esclade" offers Buick Enclave (medium) before the closer car, which is large
NOTE  "escaape" offers Cadillac Escalade (large) before the closer car, which is medium
```

**THE FIX IS TO SORT PASS 5 BY DISTANCE BEFORE PUSHING** — it is the one pass
where a score already exists, because `editDistance` is being computed anyway
and then thrown away. Nothing about passes 1 to 4 changes, so the comment's
argument against scoring survives intact: the score is used to order WITHIN the
least-certain pass, not to rank the passes against each other.

**WHY IT IS NOT A COSMETIC RANKING COMPLAINT:** § 18j/§ 18k of that suite prove
the chain that makes this expensive — `suggestVehicleSize` deliberately has no
fuzzy matching, so a typo suggests no tier at all, and the tier is read off
WHATEVER THE CUSTOMER PICKED FROM THE LIST. A wrong first row is therefore a
wrong price, and the customer cannot tell: `Buick Enclave` is a real car with a
real name and no signal that the matcher was guessing.

---

## THE INTERMITTENT REFUSAL IS A STALENESS RACE, NOT AN ENGINE DISAGREEMENT — MEASURED AND REPRODUCED, lane C, 2026-09-13

**THE ANSWER TO THE SECTION BELOW.** It is cause 2's cousin rather than either
of the two candidates as they were written: `available-slots` and `validateSlot`
do NOT disagree, and the script does NOT click an unoffered cell. **The slot is
taken between the calendar being drawn and Confirm being pressed**, which is the
one window nothing in this product re-checks.

### WHAT WAS MEASURED, in order

**1 · THE TWO ENGINES AGREE, ON 1,807 OFFERED SLOTS.** Every day
`available-slots` returned across 46 days, on both demo tenants, at three
durations each (60/90/120 and 75/113/150), compared against the buffered
conflict rule applied to the live bookings read straight out of the database:
**zero slots offered that a live booking forbids.** So there is no structural
hole for a customer to fall into.

**2 · THE CALENDAR IS ASKED ABOUT THE LENGTH ACTUALLY BOOKED.** The most
plausible structural cause was a short duration on the availability call and a
long one at submit — a vehicle size or an add-on makes the job longer than the
service's base minutes. `e2e-booking` now reads the duration off the page's own
`available-slots` request and compares it with `end_at - start_at` on the stored
row. **Measured: 90 against a 60-minute base service, and 105 against a
75-minute one — the numbers differ, so the check is doing real work, and both
matched.**

**3 · THE REFUSAL REPRODUCES ON DEMAND, AND THE MESSAGE IS BYTE-IDENTICAL.**
Two customers, one slot, no browser: the first books, the second — whose
calendar was drawn a moment earlier — gets

```
HTTP 409 — That time is too close to another booking. Please choose a different time.
```

which is the exact string the 00:00 run failed on.

**4 · AND THROUGH THE REAL PAGE, at 392x844 on the frozen build.** The customer
walks all seven steps; the slot is taken while they are on the review step;
they press Confirm.

| | what happened |
|---|---|
| error on the page | *"That time is too close to another booking. Please choose a different time."* |
| confirmation screen | none — they never leave the form |
| where they are left | **STEP 7 OF 7**, the review step |
| their chosen time | deselected |
| pressing Back | reaches *"Pick a time"* with a **re-fetched** calendar, which correctly offers nothing on that day |

**SO WHAT A REAL CUSTOMER SEES IS: they fill in the whole form, press Confirm,
and are told in one plain sentence that the time has gone.** No money moves, no
double booking, and they can go back and pick again. It costs them the form,
not the booking — **and it is the failure `docs/tenant-site-contract.md` names,
behaving as well as that failure can behave.**

### WHY THE TEST SAW IT AND THEN DID NOT

**THE DEMO CALENDARS ARE SHARED, MUTABLE AND WERE BEING CHANGED UNDERNEATH THE
RUN.** Two things were measured today:

- **Two `Smoke` bookings created 2026-09-11 were still live**, holding 09:00 and
  13:00 on 14 September on demo-riverside. `e2e-booking` deletes its own booking
  in a `finally`, so an ordinary failure tidies up — **a killed process does
  not.**
- **A re-seed landed at 08:04 today**, adding an all-day blockout on 2026-09-17
  (`Equipment servicing`) that closes the day entirely.

**AND ONE BOOKING COSTS FAR MORE THAN ONE SLOT.** Measured on demo-riverside: a
single 75-minute job with that tenant's 45-minute buffer took the day's offered
times from **eight to four**. So residue does not nudge the calendar, it halves
it — and the day `e2e-booking` picks is simply the first one with room, which
moves as the density moves. **That is the whole of the intermittency: not a
flaky engine, a moving subject.**

### WHAT WAS DONE ABOUT IT

- **`e2e-booking` now sweeps its own residue** — any `Smoke ` booking on the
  tenant older than six hours, before it starts. Proven on the run that
  followed: *"swept 2 booking(s) a killed run left behind"*. The six-hour floor
  is so a `--keep` row survives for the human it was kept for.
- **It prints what it chose beside what it was told**, every run, and asserts
  the chosen time was on `available-slots`' own list — so the next occurrence
  says which side was wrong instead of leaving it open for a third session.
- **On a refusal it now prints both lists and re-asks the endpoint**, which is
  what separates "the two disagree" from "something took it in between".
- **The cancel check says whether the reschedule moved the booking** and at what
  duration it is asking, which is `FOUND.md`'s step 2 answered in the output
  rather than by a session. Measured on four runs: **the move always happens**,
  and it lands on the adjacent half-hour (08:00 → 08:30, 08:00 → 09:00).

**FIVE CONSECUTIVE RUNS SINCE: 94 passed, 0 failed, five times** (it was 89/1).
**AND THAT IS WORTH LESS THAN IT LOOKS, WHICH IS THE POINT OF SAYING SO.** The
run deletes its own booking, so the calendar returns to the state it started in
and the next run picks the same day and the same time: all five chose
`2026-09-16 08:00` and `2026-09-17 08:00`, and all five moved to the adjacent
half-hour. **That is one scenario exercised five times, not five trials.** It is
the reproduction above that settles the question; the greens only say nothing
else broke.

### WHAT IS STILL OPEN

- **WHICH writer changed the calendar during the 00:00 run cannot be recovered.**
  Another session running the same script, or a re-seed, are both consistent with
  the evidence and nothing distinguishes them after the fact. The instrumentation
  above is what makes the next one answerable.
- **The null-navigation guard is still un-exercised.** Four green runs did not
  reach it. Unchanged from the section below.
- **`BookingPage.jsx:369`'s comment says the refusal "send[s] them back to pick
  again" and the code does not** — it sets the error and leaves them on the
  review step. Measured, twice. The behaviour is defensible; the comment
  describes a different product. **Lane B's file, so noticed and not fixed.**
- **`available-slots` answers `open: true` with `hours: null` and zero slots for
  a day closed by an all-day blockout** (2026-09-17 on demo-detail, today). Our
  own page is safe because `core.js`'s `dayIsOpen` reads `slots.length` and not
  `open` — **but `open` is in the public response a tenant's own bespoke site
  reads**, and a site that greys days by that flag draws that day as bookable.
  It is the contract's own failure shape: offer a slot the server then refuses.

## THE SECOND RUN WENT 89/1, AND THE ONE FAILURE IS THE SAME QUESTION — 2026-09-14

**A free re-run** (`--to=e2e@fixture.test`, same frozen build on 4175) **completed
BOTH tenants: 89 passed, 1 failed, 0 skipped.** The 00:00 run’s nine cascading
failures did not reproduce — the booking succeeded this time — so that refusal is
**intermittent**, which makes it more worth chasing rather than less.

**THE ONE FAILURE:**

```
  FAIL  the cancelled time 09:00 is offered again — 08:00 14:00 15:00
```

**MEASURED, on the demo tenant, 2026-09-17:** a **confirmed booking for "Sam
Delgado" holding 10:00–15:30** local (`America/Los_Angeles`), and
`buffer_minutes: 45`. That legitimately removes 09:00 for any service running
past 09:15, and it is consistent with the offered list — 08:00 present, the
whole 09:00–13:00 band gone, 14:00 and 15:00 back.

**SO THE PRODUCT LOOKS RIGHT AND THE QUESTION IS SHARPER THAN "IS THE SLOT
RELEASED?": the run BOOKED 09:00 a few minutes earlier in the same pass.** If
09:00 is correctly unavailable now, it was correctly unavailable then, and
something offered it anyway. **That is the same disagreement as the 00:00
refusal, seen from the other side** — and both are the failure
`docs/tenant-site-contract.md` names: *a form can only OFFER a slot the server
then refuses.*

**THE THREE THINGS A FRESH SESSION SHOULD DO, IN ORDER:**

1. **Print what the run chose and what `available-slots` listed at each step.**
   One line each, before booking and before the cancel check. That separates
   "the page offered it" from "the script clicked it" in a single run.
2. **Check whether the reschedule in section 6 moves the booking**, because if
   it does, the cancel check is asking about a time the booking no longer
   occupies — a stale expectation rather than a product fault, and the cheapest
   of the three answers.
3. **Only then** compare `available-slots` and `validateSlot` on the buffer.

**AND `Sam Delgado` IS A SEED NAME, NOT TEST RESIDUE** — `w-delgado` is one of
the tenant sites — so this is `seed-demo.mjs`’s own booking, not a leftover. The
8 accumulated future bookings recorded above are still real and still unswept,
but they are not the cause of THIS one.

**THE NULL-NAVIGATION GUARD IS IN AND DID NOT FIRE THIS RUN**, because the
booking succeeded. It is still correct — the 00:00 run is the proof of what it
prevents — but say plainly: **it has been run without being exercised.** The
next refused booking is its first real test.

## THE SIX EMAIL LEGS ARE PROVEN — AND THE RUN FOUND SOMETHING NEW. 2026-09-14

**JOB DONE FIRST: the provider legs are real.** Run started at **00:00:08 UTC**,
the moment the day rolled, against a frozen build on `BASE=http://127.0.0.1:4175`.

```
  ok    the provider took it
  ok    the customer email reached the provider (delivered@resend.dev)
  ok    the owner email was addressed to demo@example.com, and skipped as undeliverable
```

**Those three had SKIPPED on every run since the cap was added.** They are
passes now, not skips — the day’s allowance had reset and the provider was
called for real. `docs/e2e-booking-triage-2026-09-13.md` § 3 is closed.

**AND THE RIG DID ITS JOB, which is worth recording.** The run printed:
*"3 file(s) under app/src changed during this run — `lib/strings/es.js`,
`book/BookingPage.jsx`, `book/steps/StepWhen.jsx`. THIS RUN STANDS: BASE is not
the dev server, so the subject was a frozen build and no edit could reach it."*
**Lane B edited the booking flow mid-run and the measurement was unaffected.**
That is trap (f) retired rather than dodged.

---

## AND THE NEW THING, WHICH IS NOT THE EMAIL ITEM AND NEEDS A FRESH SESSION

**THE FIRST TENANT’S BOOKING WAS REFUSED BY THE SERVER AFTER THE PAGE OFFERED
THE SLOT.**

```
  FAIL  the booking was not refused — That time is too close to another
        booking. Please choose a different time.
```

**THAT IS THE EXACT DANGER `docs/tenant-site-contract.md` NAMES**: a form can
never mis-charge or double-book, *"it can only OFFER a slot the server then
refuses, which costs a customer their booking and is the harder failure to
see."* Here it is, on OUR OWN booking page rather than a bespoke one.

**TWO CANDIDATE CAUSES AND THIS SESSION MEASURED NEITHER:**

1. **`available-slots` and `create-booking` disagree about the buffer.** The
   real defect, and the expensive one. `available-slots` would be offering a
   time the exclusion constraint and `validateSlot` then reject.
2. **The script clicks a cell without reading availability**, so it chose a
   time nothing ever offered. A test artifact, and the cheap answer.

**WHAT IS KNOWN:** the demo tenant carries **8 future bookings** accumulated
from earlier runs — 14 Sep 00:00, 15 Sep 16:00 and 21:00, 17 Sep 17:00, 20 Sep
18:00, 23 Sep 20:30, 25 Sep 17:00, 27 Sep 15:30. A 2-hour service plus a buffer
near any of those collides. **Nothing clears them between runs**, so the demo
calendar gets denser every day and this will recur and worsen.

**HOW TO TELL THE TWO APART IN ONE STEP:** make the script PRINT the day and
time it chose and whether `available-slots` listed it, then compare. If it was
listed, it is cause 1 and it is a product defect on the path a customer uses.

**AND A ROBUSTNESS BUG IT EXPOSED, WHICH IS LANE C’s AND IS CHEAP.** The refusal
left `receiptUrl` null, and the script then did `page.goto(BASE + null)` —
`http://127.0.0.1:4175null` — and **threw**, ending the run at 19 passed / 10
failed instead of completing both tenants. A check that dies partway prints an
exit code and nothing that says which subjects it never reached, which is trap
(c)’s family. **Guard the navigation and skip loudly** so one refused booking
costs one leg rather than the second tenant entirely.

## THE DOUBLE-BOOKING GUARD WAS HOLLOW IN A SECOND SUITE — lane C, 2026-09-13

**`tests/timezone-and-slots.test.mjs` asked `!r.data?.slots?.includes("14:00")`
twice.** When `slots` is undefined — the call 504’d, the day came back closed,
the endpoint errored — `?.includes` yields `undefined`, and `!undefined` is
**true**. The guard reports the slot is held when nothing was read at all.

**IT IS THE SAME DEFECT `e2e-booking`’s `slotsOn() ?? []` HAD, found the same
day, guarding the same thing in a different file.** Two suites, one shape. The
lesson is that fixing the instance is not fixing the pattern — **grep the shape
across every suite when one of these turns up.**

**BOTH WERE FOLLOWED BY A POSITIVE A FEW LINES DOWN** — *"14:00 is offered again
after cancelling"* — which is why this survived: half the leg really was
testing. But that positive is a DIFFERENT call, so a transient failure on the
first one alone still passed. `FOUND.md` puts roughly **1.1% of this project’s
REST calls at 504**, so it is a live possibility rather than a thought
experiment.

**DEMONSTRATED RATHER THAN ARGUED, same endpoint, same run:**

| assertions | result |
|---|---|
| the old `!r.data?.slots?.includes(...)` | **34 passed, 0 failed** — both guards green |
| the new `withoutTime(r, ...)` | **32 passed, 2 failed**, each naming the endpoint |

The break was pointing the two reads at `available-slotsBROKEN`, so the answer
was `{"code":"NOT_FOUND"}`. The repaired detail prints **"NO SLOT LIST AT ALL —
nothing was compared"**, which is the difference between naming the endpoint and
naming nothing.

## ~~FOR LANE B — BOOKING STEP 4 IS 10px TALLER THAN A PHONE~~ — FIXED SAME DAY

**CLOSED by lane B in `cfe29b3`, hours after it was handed over.** The two mode
cards were written inline rather than mapped, so they missed the `.bk-choices`
wrapper W18 gave services, sizes and extras. `.bk-step` is `display: contents`,
so each card was taking the 26px SECTION gap instead of the 8px inside a choice
group. Wrapping them recovered 18px, which covers the 10px this ran over by —
**one fix for two faults rather than a second one**, and lane B found the
uneven-spacing half that the overflow figure alone would not have shown.

**KEPT, NOT DELETED, because the measurement is the reusable part:** the figure
below is what a handover needs to contain — the width, the number, the widths
that PASSED, and the three tallest elements — and it is what let lane B find a
cause rather than trim a padding.

**THE ORIGINAL, AS MEASURED:**

**Re-measured 2026-09-13 at `91face9`, against a BUILT bundle** (`vite build` in
a detached worktree, served by `vite preview` on 127.0.0.1:4175), not the dev
server — trap (g). Instrument: `scripts/sweep-booking-steps.mjs` with `BASE`.

| viewport | step 4 of 7, "Pick a place" |
|---|---|
| 1920x1080 | fits, 136px spare |
| 1440x900 | fits, **13px spare** |
| 768x1024 | fits, 169px spare |
| **392x844** | **over by 10px** (1% of the screen) |

**THE THREE TALLEST THINGS ON IT, as the sweep printed them:**

```
  90px  div.bk-card.selectable.selected  «We come to youWe bring»
  73px  div.bk-field                     «Where should we come?F»
  71px  div.bk-card.selectable           «Drop it offBring your »
```

**It is a HEIGHT overflow, not sideways scroll** — the step is taller than the
viewport, so W16 ("a step fits without scrolling") is not met. It is the only
one of the eleven booking steps that misses, at the only width that misses; the
other ten fit at all four widths. **10px is one line of padding**, and the
selected card being 19px taller than its unselected twin is where the budget
goes.

**AND 1440 IS 13px FROM THE SAME FAULT**, so a change that adds a line anywhere
on this step breaks the desk width too.

**THIS IS LANE B’s** — `app/src/book/steps/` and `app/src/book/booking.css`. Lane
C measured it and is not touching it.

**TWO OTHER LINES IN THE SAME RUN THAT ARE NOT THIS FINDING:** the plans page
scrolls 312px and "your plan" scrolls 17px at 392. The sweep reports those as
`scrolls` rather than `over` — a different category, and W16 is about steps. Do
not fold them in without deciding whether a plans page is allowed to scroll.

## THE PUBLIC-PROFILE LEAK CHECK READ 37% OF THE PAYLOAD — lane C, 2026-09-13

**`scripts/adversary-probe.mjs` § A3c asks whether the endpoint every stranger
can call hands out a customer’s email address, a customer’s phone number, the
platform’s private note, a payment handle or the detailer’s alert list. It read
`(await r.text()).slice(0, 4000)`.**

**MEASURED: the demo profile is 10,781 characters, so 6,781 — 62.9% — had never
been examined.** And the unread region is not arbitrary. These 43 keys exist
ONLY past character 4,000: `pay_venmo`, `pay_zelle`, `pay_paypal`, `pay_cashapp`,
`pay_cash`, `pay_other`, `settings`, `testimonials`, `author`, `quote`,
`travel_zones`, `google_review_url`, `yelp_review_url` and thirty more.

**SO THE CHECK HUNTING FOR A LEAKED PAYMENT HANDLE WAS READING THE ONLY PART OF
THE PAYLOAD WITH NO PAYMENT FIELDS IN IT.** Every `pay_*` key sits at roughly
character 5,000, permanently outside its reach.

**AND IT IS THE SECOND TIME THIS EXACT BUG HAS BEEN FOUND IN THIS ONE FILE.** The
`slice(0, 600)` above `fn()` was fixed earlier the same day, for a booking
receipt; this one survived that fix by thirty lines. **A truncation added for
DISPLAY becomes a truncation of the EXAMINATION the moment somebody asserts on
the variable.** Keep the full body and slice only where it is printed.

**A SECOND HOLE BESIDE IT: FIVE NEGATIVES AND NO POSITIVE.** An unknown slug
answers 200 with the body `null` — four characters, containing none of the five
strings — so all five went green over an answer carrying no profile at all.
Proven by pointing it at `no-such-slug-xyz`: `4 chars, slug (none)`, five greens.

**FIXED AND BASELINED DECISIVELY.** `rest()` now returns `full` as `fn()` already
did, every leak assertion reads `full`, and a parsed positive control requires
`business.slug === "demo-detail"` before any absence is claimed. The proof: a
sixth probe key, `pay_venmo`, goes **red** under the repaired read and **green**
the instant the 4,000-character slice is put back — same key, same payload, same
run. **There is no actual leak**: all five pass over the whole 10,781 characters
now, which is the first time that has ever been true.

**AND ONE MISTAKE WORTH KEEPING VISIBLE:** the positive control’s first version
asserted the SPELLING `"slug":"demo-detail"` and failed on a correct payload,
because PostgREST emits `"slug": "demo-detail"` with a space. Trap (h), committed
inside the check written to close a trap. It parses and reads the value now.

## `check-deployed` CALLED AN EDITED `create-booking` CURRENT — lane C, 2026-09-13

**The one tool that answers "is what is RUNNING what is in the repo?" could not
see an edit nobody had committed.** It compares the last COMMIT time touching a
function’s paths against the deploy time. An uncommitted edit moves neither
number, so it reads as `current`.

**MEASURED:** `// PROBE` appended to `supabase/functions/create-booking/index.ts`,
nothing deployed and nothing committed. The script printed
**`create-booking  current`** and **`all 37 functions are current`**, exit 0.
That is the function that takes the money and carries the double-booking
constraint, reported as matching a running copy it no longer matched.

**THE BLIND SPOT IS THE STATE EVERY WORKING SESSION IS IN**, which is what makes
it expensive: mid-wave, a function is edited and not yet committed, and the tool
answers the one question it exists for with a confident wrong yes.

**AND A SECOND HOLE IN THE SAME FUNCTION:** `lastCommit` returns `0` when no
commit matches the paths, and `0 > deployTime` is false, so a path resolver that
returned nothing would also have read as `current` — a clean bill from a
comparison that compared nothing.

**FIXED.** A function with uncommitted changes is **DIRTY**, never `current`, and
one whose paths match no commit is **NO SOURCE**. Both print, both are named in
the summary, and both exit 1. Neither is "stale" — the running copy may well be
right; it is UNPROVABLE, and that is a third answer rather than a softer version
of one of the other two. Baselined three ways: a clean tree still says `all 37
functions are current` at exit 0; the probe on `create-booking` names it alone;
and a probe on `_shared/pricing.ts` correctly names all six importers.

**THE VERIFIED.md DEPLOY ROWS STILL STAND** — every one was taken on a clean
`supabase/` tree, which is the case the tool always answered correctly.

## SEVEN GREEN CHECKS GUARD A MECHANISM NOTHING CAN INVOKE — lane C, 2026-09-13

**`beginImpersonation` is exported by `app/src/lib/impersonation.js` and CALLED
NOWHERE.** A repo-wide grep across `*.js`, `*.jsx`, `*.mjs` and `*.ts` finds it
in exactly two places: its own definition, and `tests/platform-admin.test.mjs`.
No third.

**SO THE WHOLE NOTE MECHANISM IS DEAD CODE**, and it went dead on 2026-09-09
when Andrew replaced signing in AS a detailer with the `/preview` tab — his own
words, quoted in `app/src/lib/preview.js`: *"I don’t even wanna be signing in as
someone to view their dashboard."* That tab keeps its session in `sessionStorage`
and touches nothing. The consequences, none of which throws:

- no note is ever written, so `impersonation(email)` can only ever return null;
- the `impbar` strip in `App.jsx` can never render;
- `endImpersonation()` in `lib/signout.js` clears a key nothing sets.

**AND SEVEN CHECKS STAYED GREEN OVER ALL OF IT** — `13b-ii`, `13d`, `13d-ii`,
`13d-iii`, `13h`, `13h-ii`, `13h-iii`. Every one greps a source file that still
exists and is still written correctly. **The module is not wrong; it is
unreachable**, and a source grep cannot tell those two apart. That is trap (k)
in its most expensive form, because unlike a renamed spelling it produces no
failure to investigate.

**FIXED ON THE CHECK SIDE ONLY.** The suite now computes `noteIsWired` — does
anything in `app/src` CALL `beginImpersonation`, with a lookbehind so the
definition does not satisfy it — and those seven SKIP, loudly, naming the reason,
while it is false. They are not deleted: they re-arm themselves with no edit the
day the note comes back, proven by breaking it (a single added call turned all
seven skips into passes).

**WHAT IS OWED, AND IT IS LANE B’s:** delete `app/src/lib/impersonation.js`, the
`impbar` block in `App.jsx`, and the `endImpersonation()` call in
`lib/signout.js`. The skips disappear with the module. **Do not delete the checks
instead** — they are the only thing in the repo that would notice the mechanism
coming back half-wired.

**THE TRANSFERABLE RULE:** a check that greps a file proves the file is written
correctly and says nothing about whether anything runs it. **Where a feature has
ONE entry point, assert that something CALLS it** — that is the cheapest
difference between "written" and "reachable", and it is one regex.

## THE DEMO HAS NOBODY OWING IT MONEY, SO HALF THE MONEY SCREEN IS INVISIBLE — 2026-09-13, lane B, seed is lane C's

**Measured against `demo-detail` (`1c486181`): all 17 completed bookings are
`payment_status: "paid"`, and `scripts/seed-demo.mjs` is why — its one
`payment_status` line is `p.paid ? "paid" : "pending"` and every row in both job
tables carries a `paid:` amount.** So `Waiting on payment` never draws in the
demo, on any screen, at any width.

**IT IS NOT A MONEY-SCREEN FAULT AND IT IS NOT COSMETIC.** It is the half of
that screen that answers *is anyone late paying me*, and nobody reviewing it —
no screenshot, no sweep, no sales demo, no walkthrough step — has ever seen it.
FOUND.md's own 2026-09-12 entry quotes the demo reading `WAITING ON PAYMENT ·
$175`, so this state is newer than that and arrived silently with a re-seed.

**It also takes two walkthrough steps down with it**: the money tour's `unpaid`
step points at an element that does not exist in the demo, and `Mark paid` has
no subject to fire on.

**The fix is one or two rows in `scripts/seed-demo.mjs` with no `paid:`** — one
inside the current month and one outside it, because the unpaid list is
deliberately NOT period-filtered and a single in-period row cannot show that.
**Lane C's file; not touched.** Lane B measured this screen with a temporary
in-component fixture and removed it before the final run.

## A BORDERLESS `.btn.ghost` READS AS A CAPTION, NOT A BUTTON — 2026-09-13

`.btn.ghost` is `border-color: transparent; background: transparent`, so on
Money *"The full picture"* and *"Log a bulk job"* are centred text floating in a
28px-gap stack with nothing saying they can be pressed. **The spacing is not the
bug — measured, it is the `.group` gap plus a 4px and a 12px margin, the same as
everything else on the screen.** The `.linkdoor` directly between them is also
`.btn.ghost` and reads correctly, because its own class gives it a card.

**37 call sites across `app/src`, so this is a token-level decision and not a
Money change.** Not fixed.

---

## `tests/platform-admin.test.mjs` IS 111 PASSED, **49 FAILED**, AND NONE OF IT IS THE SERVER — 2026-09-13

**Measured twice tonight, once with lane C's changes in the tree and once with
them stashed. The number is identical both times, so it is not ours.** Recorded
rather than fixed because every failing check reads `app/src/admin/**`, which is
**lane B's**, and lane B has been rebuilding those screens all night.

A sample of what is red:

```
2b-i   a signed-out visitor is offered a login, not an error
2b-ii  and a signed-in non-admin still gets Page not found
       the button warns before it acts
       seven figures across the top, and never more than eight
9h     the screen hands over a file rather than drawing it
9i     a confirmation survives the refresh that follows it
```

**THE DANGEROUS ONES ARE 2b-i AND 2b-ii**, because they are the 404-not-403
rule that migration `20260906001000` went out of its way to build — *a 403 tells
a curious detailer the endpoint exists*. **The SERVER half is proved and
passing**; these two read the screen. A screen that now answers differently is a
real question and not a stylistic one.

**DO NOT EDIT THE CHECKS TO MAKE THEM PASS.** The repo already has one
deliberately-red check for exactly this reason (`platform-billing`, § EIGHT
BACK-OFFICE ACTIONS HAVE NO DOOR) and the reasoning is the same: making it pass
would hide a screen that changed.

```bash
node tests/platform-admin.test.mjs          # 111 / 49 at 92ef895
```

---

## THE TEST SUITES SPEND REAL EMAIL, AND THE RESERVE ONLY STOPS HALF OF IT — 2026-09-13

**The half Andrew asked about is closed**: a test run can no longer take the
signup notice with it (`docs/email-budget.md`). **The half that is not closed is
the bill and the sender reputation**, and it needs a decision rather than an
edit, so it is here.

Against a cap of **100 a day**: 2026-09-07 attempted **240**, 2026-09-08
attempted **117**, and 2026-09-13 was at **94 by 06:55 UTC**. There are no
detailers on this product, so all of it is ours.

**Two things are doing it and both are deliberate today:**

- **`delivered@resend.dev`** — Resend's own delivery simulator, in
  `scripts/e2e-booking.mjs`, `tests/multi-vehicle.test.mjs`,
  `tests/staff-roles.test.mjs`, `tests/dead-mans-switch.test.mjs`. **Whether
  Resend charges the simulator against the plan was NOT measured and must not be
  assumed either way.**
- **The demo business's contact address is `@detailplatform.com`**, a real
  domain, so **every owner alert any credentialed suite triggers is a real
  send** at about five emails a booking.

**THE OBVIOUS FIX IS THE WRONG ONE ON ITS OWN.** Moving those addresses onto a
reserved domain would make most of a suite run free — and would also stop
`e2e-booking` proving that mail actually leaves the building, which is the one
thing it exists for. **The shape of the answer is probably one address that
stays live and everything else reserved**, and that is a call about what we want
proved, not a rename.

---

## 85 READS DISCARDED THEIR ERROR. 81 STILL DO, AND ONE COST A CUSTOMER A BOOKING — 2026-09-13

**Four were fixed tonight because Andrew hit one of them. The other 81 are the
same bug and are recorded here rather than swept**, because each one needs its
own answer to *what is the honest thing to say when we could not find out*, and
81 of those in one night is how a fix becomes a second outage. **The count is
measured, not estimated** — the `grep` below prints it, and the figure in this
heading is what it printed at `1cf5f98`.

### THE SHAPE, AND IT IS THE SEVENTH COSTUME AGAIN

```ts
const { data } = await supabase.from("x").select("*").eq(…).maybeSingle();
if (data) return data;
return DEFAULTS;                    // ← also what a 504 gets
```

**`const { data } = …` with the `error` destructured away.** ~1.1% of this
project's PostgREST calls answer 504 (§ THE "GATEWAY TIMEOUT" IS OUR OWN CATCH
BLOCK), so about one call in ninety gets `data === null` **with a reason nobody
read**, and the code cannot tell that from *the row is not there*. It then does
whatever it does for a missing row, cheerfully, with a 200.

### THE ONE THAT WAS FIXED, AS THE WORKED EXAMPLE

`_shared/tenant.ts` → `getSettings`. A 504 fell through to the no-settings-row
defaults, which say **`mobile_enabled: null` and `dropoff_enabled: null`** —
correct for a business nobody has set up. In `available-slots` those two make
`isDropoff && isMobile` true for **every slot in the grid**, and that branch
`continue`s. The answer is `200`, `success: true`, a full month of open days and
**not one bookable time**, which is indistinguishable from a fully booked
detailer. Andrew got three of those in a row on `demo-detail` and then could not
reproduce it in eight tries — a 1.1% failure arriving in its usual burst of three
to six inside one second.

Fixed in `1cf5f98`: three outcomes instead of two — a row, no row, and
`readFailed()` meaning *we could not find out*, which `available-slots` answers
**503 with `retryable: true`**. `tests/availability-honesty.test.mjs`, 31 checks,
baselined by six deliberate breaks.

### THE TWO THAT MATTER MOST OF WHAT IS LEFT

- **`_shared/slotValidation.ts:302` — the conflict read.** `const { data: nearby } = await q;`
  A failed read gives `nearby` null, which reads as **no conflicting bookings**,
  which means the submit-time gate stops gating. **The exclusion constraint in the
  database is what stops a double booking from actually landing**, so this is
  caught — but it is caught as a raw constraint violation at the last moment
  instead of as a clean refusal, and lines 182/212/239/255 of the same file fail
  the other way and refuse a legitimate booking. **This file is the submit-time
  half of the double-validation pattern; a validator that cannot tell "no
  conflicts" from "could not look" is not validating.**
- **`_shared/tenant.ts:287` — `requireMember`.** `const { data: rows } = await q;`
  A failed read returns null and every admin function turns that into a 401, so a
  detailer is spuriously told they are not a member of their own business.
  **Deliberately not fixed tonight:** making it throw turns every one of ~20
  admin functions' 401 into a 500 at once, and each needs reading first. It is
  **allowlisted by name in `tests/availability-honesty.test.mjs` § 2**, so fixing
  it makes that check fail and this entry gets deleted with it.

### THE OTHER 79, BY FILE

`platform-admin` 12, `platform-billing` 10, `create-booking` 7,
`stripe-webhook` 6, `send-owner-reminders` 6, `_shared/slotValidation.ts` 5,
`plan-link` 3, `_shared/email.ts` 3, then 2 each in `get-booking-receipt`,
`invite-user`, `pay-booking`, `preview-emails`, `validate-promo-code` and
`_shared/pricing.ts`, and one each in `accept-invite`, `accept-quote`,
`booking-ics`, `cancel-booking`, `connect-account`, `create-business`,
`reschedule-booking`, `respond-to-booking`, `send-email`, `send-invoice`,
`track-visit`, `unsubscribe`, `update-booking`, `watch-jobs`,
`_shared/newBusiness.ts`, `_shared/tenantSite.ts` and the one allowlisted
`_shared/tenant.ts`.

**`send-owner-reminders:373` is the one to look at first if you want to see how
easily this hides:** it reads `const { data: businesses } = await retryRead(…)`.
The retry is there, so it looks done — and the error it retried three times for
is still thrown away.

```bash
grep -rn 'const {[^}]*\bdata\b[^}]*}' supabase/functions/ | grep -v '\berror\b'
```

### THE RULE, AND IT IS NOT "CHECK YOUR ERRORS"

**A read has three outcomes and most of this codebase has two.** The missing one
is *we could not find out*, and the damage is never the missing row — it is
whatever the code does for a missing row, done confidently. `getSettings`'s
defaults were not wrong; they were **the right answer to a question nobody had
asked.**

**So the question at every one of these 81 sites is the same and it is not
technical: what is the honest thing to tell the person on the other end?** For a
calendar it is *"couldn't load times, try again"*. For a price it is refusing to
quote. For a membership check it is not *"you are not a member"*.

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

- 2026-09-13 — **THE TENTH COSTUME: `scripts/context-check.mjs` REPORTED ANOTHER
  SESSION'S CONTEXT AS MINE, WITH A VERDICT ATTACHED.** It takes the most
  recently written transcript anywhere under `~/.claude/projects/` and its own
  header called that *"the session you are sitting in"*. With two sessions open
  that is whichever one wrote last. Measured: it printed
  `be7ec060… 352,141 tokens (117%) CLEAR NOW` to a session whose id is
  `5efe326c…` and whose real figure was **314,527**. Both were over the
  threshold, so the verdict happened to be right and the number was somebody
  else's — **the most dangerous shape, because nothing looks wrong.**
  **ANDREW'S STANDING RULE 1 RUNS ON THIS NUMBER** (*every message ends with your
  context state*), and § WHICH LANE says three or four sessions in one folder is
  the normal case, so the race is the rule rather than the edge. Fixed: it takes
  a session id (`node scripts/context-check.mjs <id>`), says whether it was TOLD
  or GUESSED, and when guessing **names every other transcript written in the
  last two minutes.** Baselined by running all three paths; the warning fired on
  the very next guess, naming the other session 3s apart. **A session knows its
  own id — it is the folder under the scratchpad path in its own environment —
  so there is no reason to guess.**

## THE DEFINER SWEEP — 2026-09-13, and it found a cross-tenant PII read

**The eighth costume's parked half, run. 38 `security definer` functions in
`public`; FIVE were reachable by somebody who should not reach them.** Every
claim here was PROVED by calling the function over HTTP — with the anon key, and
with a real `demo@detailplatform.com` session — not read off a migration.
`supabase/migrations/20260913005000_definer_execute_swept.sql` closed all five;
`tests/definer-grants.test.mjs` is the standing check, **baselined against the
live broken state before the fix was applied**, which named all five.

### THE ONE THAT MATTERS: every customer's details, to anyone with the anon key

`get_bookings_due_for_second_reminder()` returns **`setof public.bookings`** from
`select b.*` with **no tenant filter**, and it had **no grant or revoke line of
any kind.** Anon got **200**.

**AND A DEFINER FUNCTION OWNED BY `postgres` HAS NO RLS AT ALL — measured, not
assumed: `postgres` carries `rolbypassrls = true`.** So `force row level
security` on `bookings`, which IS set, does not apply inside it. Name, email,
phone and address of every upcoming booking on every business, to whoever holds
EXECUTE — **and the anon key ships in the browser bundle.**

**IT RETURNED `[]` WHEN PROBED, WHICH IS THE WHOLE REASON NOBODY SAW IT.** Zero
of fifteen businesses have `customer_reminder_2_enabled`, so the select matches
nothing. **Identical in shape to the `monthAgo` scope error: a fault sitting
behind an empty set.** The first detailer to switch on a second reminder opens
it.

**ITS SIBLING, WRITTEN SIX DAYS EARLIER, CARRIES THE EXACT REVOKE IT WAS
MISSING.** `get_bookings_due_for_reminder(text)` is `revoke … from public, anon,
authenticated` + `grant … to service_role`; all six siblings are locked. **The
body was copied and the grants were not**, which is the transferable part: a new
function modelled on an old one inherits its SQL and not its privileges.

### THE OTHER FOUR

| | what was open | proof |
|---|---|---|
| `note_heartbeat(text,jsonb)` | **any signed-in detailer could forge the dead man's switch's own heartbeat** | a real detailer session got **204** and a junk row appeared in `job_heartbeats` (deleted immediately) |
| `job_photo_budget(uuid)` | anon read any business's storage numbers | **200** to anon for an arbitrary business id |
| `photo_total_bytes()` | anon read the platform-wide photo total | **200** to anon |
| `link_booking_to_plan()` | a trigger function open to all | PUBLIC+anon+auth in `proacl` |

`note_heartbeat` is the seventh costume with a hand on the lever: an instrument
whose only job is to say when a cron has stopped, writable by its own audience.
Its migration revoked from `public, anon` and **not** from `authenticated`.

### THE ROOT CAUSE IS A DEFAULT PRIVILEGE, SO IT WILL RECUR

`pg_default_acl` carries **`alter default privileges in schema public grant
execute on functions to anon, authenticated`**, from BOTH `postgres` and
`supabase_admin`. **A new function is born with THREE grants** — PUBLIC from
`create function`, plus `anon` and `authenticated` from the default — so a
migration that revokes one or two of the three reads as if it closed the door.

**THE DEFAULT PRIVILEGE WAS DELIBERATELY NOT REMOVED.** It governs every future
function in a schema Supabase's own tooling writes into, and changing it would
trade a visible fault for an invisible one. `definer-grants` § 2a **fails if it
ever disappears**, because then every three-role revoke in this repo is about a
database that no longer exists.

**THE INVARIANT NOW ENFORCED: no definer function carries a PUBLIC grant.** Ten
did; six of those keep exactly the reach they had, by naming `anon` and
`authenticated` instead. Verified after applying: all eight public reads still
answer 200 with real data to the anon key, the five closed ones answer 42501 to
both anon and a detailer, and the dashboard's photo meter still works.

### TWO THINGS LEFT OPEN, NEITHER FIXED, BOTH ALLOWLISTED WITH THE REASON

- **`job_photo_budget(uuid)` STILL DOES NOT CHECK MEMBERSHIP.** It is
  authenticated-only now, so the internet is out, but **a detailer can still
  read another business's storage usage and cap** by passing that business's id.
  Narrower than an open internet read; needs a decision about which permission
  gates it (`has_business_permission` with what name?), so it was not guessed at.
  Lane C.
- **`accrue_plan_visits()` IS GRANTED TO `authenticated` EXPLICITLY**, in
  `20260904002000_plans.sql`, so it is a decision rather than an oversight and
  was left alone. It is a platform-wide writer any detailer can fire. The harm is
  bounded — idempotent via `on conflict do nothing` and capped at `current_date`,
  so firing it early only grants what was already due — but **nothing explains
  why `authenticated` needs it at all**, and the seed calls it with the service
  key. Worth one sentence from somebody who knows.

### AND THE LIVE BUSINESS PROJECT HAS NOT BEEN CHECKED FOR THIS

`adtlnvihwrcqcasqcjwd` takes real customers' money and the token in `.env`
reaches only `kguqylyzgyzfktkfnhjb`. **The same default privilege is a Supabase
default, so it is probably there too** — but that is a guess and it is written
here as one. Same standing ruling as the 504: Andrew's decision, with him
present, and no session goes looking for credentials.

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
  ~~**THE PARKED PART IS THE WIDER ONE: every `security definer` function in this
  repo deserves the same three-line probe.**~~ **SWEPT 2026-09-13 — 38 functions,
  FIVE were open, and one of them was the worst privilege defect this project has
  had. See § THE DEFINER SWEEP below.** Nine migrations spell it
  `from public, anon, authenticated` and the convention is right; what nobody
  had measured is whether any of the rest missed `public` the way I did.
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

- 2026-09-13 — **`scripts/overlap-probe.mjs`'s `clipBox` STARTS AT
  `el.parentElement`, SO AN ELEMENT'S OWN `overflow: hidden` IS NOT COUNTED.**
  Found while sweeping the website brief at 320: the live preview's headline was
  reported 6px on top of the first price row. **It is not.** The `h4` carries
  `-webkit-line-clamp: 2` with `overflow: hidden`, its own box ends at y 311.8
  and the price row's box begins at y 325.8 — **fourteen pixels of clearance** —
  while the `Range` over its text node still reports a FOURTH line box at
  311.8-327.8, the clipped one, which is what the probe intersected.
  **Proved by a method that shares nothing with a rect:** `elementFromPoint` at
  the row's own coordinates returns the row's `span`, not the headline. Nothing
  of the headline is painted there.
  The limit is one line to state and it is the same family as the two
  `docs/BAR.md` already records for that file (`clip-path`, and a block
  wrapper's rect) — **it can only produce a FALSE POSITIVE, never a false
  pass**, so it is a note rather than a bug. Lane C owns the file.
- 2026-09-13 — **THE DRAWN SAMPLE PAGE IN THE WEBSITE BRIEF IS ENGLISH ON A
  SPANISH DASHBOARD, AND IT IS DELIBERATE — but it is Andrew's call, not a
  sweep's.** Measured at 1440 with `dp.lang.app=es`: the panel's chrome reads
  *"Tu sitio hasta ahora"* and *"Cada respuesta cambia esta página."* while the
  page inside it reads *Mobile detailing / Full detail / Book*. That has been
  true of `Mini` since the either/or cards were built; the live preview only
  makes it bigger and puts real answers beside it.
  **THE ARGUMENT FOR LEAVING IT IS G8.** That question asks whether the site
  should be in Spanish too — so drawing the preview in the DASHBOARD's language
  answers G8 for the detailer, in a picture, before they reach it. The words
  that are already theirs (the business name, the towns, the button) pass
  through untouched either way.
  **Recorded rather than fixed**, and recorded rather than left silent, because
  the next Spanish sweep will otherwise "close" it and no check in this repo
  can see the difference between this and a real leak.

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

## THERE IS A TENTH e2e-booking FAILURE NOW, AND IT IS THE PAGE, NOT THE ENDPOINT — 2026-09-13

`scripts/e2e-booking.mjs` reports **70 passed, 10 failed** at `1cf5f98`, against
the **71 / 9** the entry below recorded at `34ae75d`. Total checks unchanged at
80, so **one check flipped from pass to fail**, and the nine below are all still
there by name.

**THE TENTH:** `2026-09-17 is open on the customer's calendar — cell` followed by
whitespace. It read an empty cell.

**IT IS NOT THE AVAILABILITY ENDPOINT, AND THE SAME RUN PROVES IT.** Two later
sections of that run book, reschedule and cancel on **that exact day**: *"08:00
is no longer offered"*, *"the booked day (Sep 17) is offered to move within"*,
*"a different time is offered on that day"*. **`available-slots` says Sep 17 is
open and the flow uses it end to end.** So what is wrong is the CELL, which is
`app/src/book` — lane B's.

**AND THE TWO MOST LIKELY CAUSES ARE BOTH INSTRUMENT FAULTS RATHER THAN PRODUCT
FAULTS**, which is why this is recorded instead of reported as a regression:

- **`CLAUDE.md` trap (e).** The booking calendar renders **TWO** `.bk-cal`
  elements — the weekday header and the day grid — so a `querySelector` returns
  the wrong one. That trap's own write-up was produced by this exact family of
  false reading, about this exact flow.
- **`CLAUDE.md` trap (f).** Lane B was committing into `app/src` while this ran
  (`appEs.js`, `BusinessInfo.jsx` were both modified mid-session), and a Vite hot
  reload remounts components under a walk in progress.

**Measured twice, both runs 70/10, with the same tenth.** So it is repeatable
rather than a one-off — but repeatable against a tree somebody else was editing
is not the same as repeatable against a quiet one. **The next lane B session
should re-run it with nobody building** and then either fix the cell or fix the
check.

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

---

## THE EM DASH SWEEP STOPPED AT THE EDGE OF THE EMAILS — measured 2026-09-13

**`ROADMAP.md` § Next records Wave F as *"DONE 2026-09-12. Zero single em dashes
left in any user-facing string."* That is true of `app/src` and false of every
email this product sends.**

**THE MEASUREMENT:**

```bash
grep -rhoE '(tt|t)\("[^"]*—[^"]*"' supabase/functions/ | wc -l   # 20
grep -c '—' supabase/functions/_shared/strings/es.ts             # 37
```

**Twenty English strings** carrying a single em dash in
`_shared/emailTemplates.ts` and `_shared/emailKit.ts`, and **thirty-seven lines
of the Spanish catalogue** carrying one. The Wave F pass swept `app/src` and the
email layer is a different tree.

**ONE OF THE TWENTY IS THE WORKED EXAMPLE CLAUDE.md USES FOR THE RULE.**
`CLAUDE.md` § THE EM DASH HAS THREE SHAPES says, in as many words, *"Travel —
{zone}" becomes "Travel · {zone}"*. That string was still
`tt("Travel — {zone}")` in `emailTemplates.ts:370` at `1ae8d03`, nineteen hours
after the sweep reported zero. **It is fixed now** — English and its Spanish key
in the same edit — because the price table added to *"You're booked in"* put it
onto an email it had not been on before, so it was inside this change's blast
radius. **The other nineteen are not touched.**

**WHY THEY ARE NOT SWEPT HERE.** `CLAUDE.md`'s own rule: *a count of dashes
cannot tell these apart, so this is done by hand.* Of the twenty, several are
clearly sentence joints (*"Good news — we've accepted your request"*), several
are label separators (*"Receipt — {amount} — {brand}"*), and at least one is a
parenthetical pair that should stand. **Classifying twenty strings and their
thirty-seven Spanish partners is its own item**, and each English rename has to
move its `es.ts` key in the same edit or the email silently renders English on a
Spanish screen with no error anywhere.

**AND A TRAP THAT COST TWENTY MINUTES, BECAUSE IT WILL COST THEM AGAIN.**
Writing `supabase/functions/**` inside a `//` comment in a file that
`tests/spanish.test.mjs` reads puts a **star followed by a slash** in the text.
`strip()` in that test removes `/* ... */` blocks BEFORE it removes line
comments, so a path glob opens a block comment that runs to the next `*/` — it
ate **43 KB of `emailTemplates.ts`** and turned five checks red with failures
that said nothing about the product.

**THE INSTRUMENT CAUGHT IT, WHICH IS THE POINT.** § 6f and § 6g are
*"the check has subjects — every named template was found"*, and they were the
checks that failed first. A suite without subject counts would have reported
*"no customer template binds the language"* and sent somebody hunting in the
wrong file. **Count subjects every run.**

**SUPERSEDED BELOW — § THE EM DASH SWEEP IS DONE, AND IT WAS 106 RATHER THAN
19. All of them are fixed and `tests/em-dash.test.mjs` is the standing check.**

---

## THE EM DASH SWEEP IS DONE, AND IT WAS 106 RATHER THAN 19 — 2026-09-13

**The section above recorded twenty and fixed one. The real number, once the
instrument stopped looking only at `t("…")` literals, was 106.** All of them are
gone and `tests/em-dash.test.mjs` is the standing check.

**WHY THE FIRST COUNT WAS LOW, AND IT IS THE SAME MISTAKE TWICE IN ONE FILE.**
A grep for a dash inside a TRANSLATED STRING cannot see a dash in a template
literal that only exists once two values meet (`${customer_name} — ${dateStr}`,
twenty of those), a dash in a plain `error:` string that is never translated
(fifteen), or **the HTML entity `&mdash;`, which is the identical defect in
another costume** (two, one of them inside a paragraph of prose).

**AND SIX OF THE FIRST HUNDRED FINDINGS WERE NOT COPY AT ALL.** A
`console.error(...)` whose arguments run over four lines is four lines of LOG
text, and a scanner that skips only the line carrying the word `console` reads
the other three as product prose. The check tracks the open call's paren depth.

**THE CLASSIFICATION IS THE WORK AND A COUNT CANNOT DO IT** — `CLAUDE.md`
§ THE EM DASH HAS THREE SHAPES. Of the 106: label separators took the middle dot
(`Receipt · {amount} · {brand}`, `2nd vehicle · Large`, every push-notification
body), sentence joints took a full stop (`Nothing to pay now. This is for when
the work is done.`), and three took a colon where the dash was introducing a
list. **Not one was a parenthetical pair**, so the check's ALLOW set holds a
single entry and it is not copy either: `emailKit.ts`'s HTML-to-plaintext
decoder has to name `&mdash;` in order to turn it back into a character.

**EVERY ENGLISH RENAME MOVED ITS SPANISH KEY IN THE SAME EDIT** — 32 lines of
`_shared/strings/es.ts`. That file is keyed on the English text, so a rename
without it renders English on a Spanish screen with no error anywhere.

### AND IT TURNED UP A DIVERGENCE NOBODY WAS WATCHING: THE RENDERER'S FIXTURES

`scripts/render-emails.mjs` is what Andrew is shown when he asks what an email
looks like. **Four of its fixtures were hand-typed copies of strings the product
GENERATES, and they had drifted:**

| the fixture said | the product actually emits |
|---|---|
| `2nd vehicle — Large · 2021 Ford F-150` | `2nd vehicle · Large · …` (`pricing.ts:457`) |
| `Bi-weekly maintenance — included` | `{plan.name} · included` (`pricing.ts:286`) |
| `Nothing has been paid yet — you will get…` | the same sentence in `create-business/index.ts:132` |
| the campaign draft with a dash in it | `CampaignModal.jsx`'s default, which has a full stop |

**So the preview was showing a version of the email nobody sends**, and two of
the four had been corrected in the product on 2026-09-12 while their copies sat
in the renderer unread. **A fixture that RESTATES a generated string is a second
copy with nobody maintaining it.** They are corrected; the real fix, when
somebody has a reason to touch that file, is to call the generator.

**PROVED BY LOOKING, NOT ONLY BY THE CHECK:** `node scripts/render-emails.mjs`
renders 29 emails, English and Spanish, and a grep for an em dash across
`email-preview/*` now returns nothing at all.

---

## THE WATCHDOG CRIED WOLF AND NEVER SAID ALL-CLEAR — found by Andrew, caused by two lines, 2026-09-13

**His report:** Resend shows *"The reminder sweep has stopped running"* at 11:22
UTC on 12 September and **no "is running again" after it**, while the back
office's Plumbing tab shows the job finishing inside its threshold. **His
reason for caring, which is the part to keep:** *"a watchdog that only ever
cries wolf is one Andrew learns to ignore, which makes it worse than none."*

### THE ALARM WAS TRUE. THE SILENCE AFTERWARDS WAS THE BUG.

The project's own edge logs settle both halves:

```
2026-09-12T08:00:54Z  rpc/note_heartbeat      204   <- the sweep's LAST stamp
   ... 18 hours, with send-owner-reminders BOOTING every 15 minutes ...
2026-09-13T01:53:52Z  rpc/note_heartbeat      204   <- and its first one back
```

So the sweep really was dead for eighteen hours while being invoked on time —
it was dying before it reached the stamp. **The 11:22 email was correct.**

### THE CAUSE OF THE MISSING ALL-CLEAR, TO THE MILLISECOND

```
2026-09-13T02:07:00.819Z  rpc/claim_job_alerts   200   <- claims "recovered"
2026-09-13T02:07:00.914Z  platform_settings      504   <- and then this
```

`watch-jobs` **claimed the change set and then read the address to send it to.**
The claim had already set `alerted_at` back to NULL. The settings read timed
out, `ps` was `undefined`, `ps?.owner_email` was falsy, and the function fell
into its *"there is no owner_email to tell"* branch — **which logged a line and
threw away the only notice of that recovery that would ever exist.** At 02:22
there was nothing left to claim. The identical pair had already failed at
01:52:02, fifteen minutes earlier.

**IT IS THE HOUSE RATE, NOT A COINCIDENCE.** § THE "GATEWAY TIMEOUT" IS OUR OWN
CATCH BLOCK measured ~1.1% of every REST call in this project returning 504, and
a function's chance of dying is its NUMBER OF REST CALLS. Two calls every
fifteen minutes is ~2,900 a month, so this lost a claim roughly **thirty times a
month — and it did it to STOPPAGES exactly as readily as to recoveries.** The
alarm that matters most was being dropped by the same line.

### THREE THINGS WERE WRONG AND ALL THREE ARE FIXED

1. **THE ORDER.** The address is read FIRST now, and a failed read claims
   nothing and pings nothing, returning `503 settings_unreadable`. A 504 costs
   one skipped tick instead of one lost alarm.
2. **THE ERROR WAS DISCARDED.** `.maybeSingle()` returns "no row" and "the read
   failed" through the same `data: null`, so *an unconfigured product and a
   timed-out gateway were one value.* The seventh costume of an instrument
   reporting on a question it never got to ask.
3. **THE UNDO ONLY WORKED ONE WAY.** `release_job_alerts` re-armed stoppages
   only, on the written grounds that *"a lost recovery notice is good news he
   can also read on the screen."* **Andrew has rejected that trade.** It is
   replaced by `restore_job_alerts(p_stale, p_recovered)` — null re-arms a
   stoppage, `now()` re-arms a recovery — and the old half-undo is dropped
   rather than left beside it.

**THE OLD TEST WAS ENFORCING THE BUG.** `dead-mans-switch` § 1d-ii read *"and it
re-arms the STOPPAGES, not the recoveries"* and passed every run while a real
all-clear was being dropped. **A check can be green and wrong about what it
wants.**

**BASELINED, AND THE LIVE LEG DISCRIMINATES.** A deliberately broken build that
re-armed only stoppages was deployed: § 2i-iv (*an unsendable RECOVERY is
re-armed*) went red while § 2i-ii (the stoppage half) stayed green, and the
source-order check § 1j went red when the claim was moved back in front. 50/50
with the correct build deployed.

---

## THE WATCHDOG'S BLIND SPOT — a job whose heartbeat ROW is gone is watched by nothing, 2026-09-13

`watch-jobs` compares ROWS: no row, no comparison, no alert. Its own
`ponytail:` comment says so and names the compensating control — *"the back
office's named list is what draws 'have never reported' if one ever goes."*

**THAT NAMED LIST NO LONGER EXISTS.** The back office was rebuilt around a
`TabPipes` panel that maps `state.heartbeats`, so a job with no row renders
nothing at all. `AdminPage.jsx`'s `const JOBS = [...]`, `jobKeys` and
`if (!beat) return true;` are all gone. Nothing in the product now knows which
scheduled jobs are SUPPOSED to exist.

**Nothing deletes a heartbeat row today** (`note_heartbeat` upserts, the seed
migration creates them), so this is a missing guard rather than a live outage —
which is exactly why it will be discovered the hard way. The fix is one
expected-job list, and the honest place for it is `watch-jobs` itself rather
than a screen, because the watcher is the half that TELLS.

**`tests/dead-mans-switch.test.mjs` § 3 prints `NOT GUARDED` on every run**
rather than failing, because the screen is lane B's and a check that fails every
run about somebody else's file is one people learn to skip — the same disease as
the alarm it guards.

---

## EIGHT BACK-OFFICE ACTIONS HAVE NO DOOR — 2026-09-13

`supabase/functions/platform-admin/index.ts` answers fifteen actions.
`app/src/admin/AdminPage.jsx` calls **six**: `list`, `whoami`, `create`, `get`,
`suspend`/`restore`, `impersonate`.

**With no caller anywhere in `app/src`:** `prices`, `promo_new`, `promo_off`,
`note`, `site`, `export`, `tier`, `resend_invite`.

Found because `tests/platform-billing.test.mjs`'s *"and clearing it back to the
files is a real button"* went red — it asserts
`action: "prices", prices: null` in `AdminPage.jsx`, and the rebuilt screen has
no price editor at all. **That check is RIGHT and has been left failing on
purpose**, because making it pass would hide a missing screen.

**This matters more than a dead endpoint usually does:** `CLAUDE.md` describes
the price editor's behaviour in detail (*"the editor WARNS and never refuses"*),
and `ROADMAP.md` records a question to Andrew about whether it should refuse.
**A feature the documentation discusses and the product cannot reach.** Lane B
owns the screens; whether all eight are wanted is Andrew's call.

---

## A SPANISH DETAILER READS ENGLISH IN SIX `window.confirm` DIALOGS AND ON THE BOOKING RULES SCREEN — lane B, 2026-09-13

**FOUND, NOT FIXED. Reported because the session prompt asked for named faults
even where they are not fixed; the session was at 91% of its context.**

**`tests/spanish.test.mjs` is 72/0 and cannot see any of these**, which is the
part that matters: it walks `t("…")` calls, and every string below is a bare
literal or a template literal that never reaches `t()`. CLAUDE.md trap (l)
already predicted the first six — *"the easiest string in a product to leave
untranslated"* — and here they are.

**THE SIX CONFIRMS. Every one is the sentence somebody reads immediately before
destroying something, and a Spanish detailer gets it in English:**

| file:line | the sentence |
|---|---|
| `screens/more/Campaigns.jsx:220` | `Delete ${r.name} for good? Its scans and bookings stop being counted against it.` |
| `screens/more/Gallery.jsx:64` | `Remove this photo from the gallery?` |
| `screens/more/Reviews.jsx:100` | `Delete this review from ${r.author} for good? Hiding it keeps the words.` |
| `screens/more/WebAddress.jsx:105` | `Stop using ${row.domain}? Your links go back to detailingplatform.com.` |
| `components/BookingDetail.jsx:148` | `Delete this booking? It is hidden, not destroyed, and can be restored by support.` |
| `components/JobPhotos.jsx:81` | `Delete this photo? A before-photo is what settles an argument about a scratch.` |

**AND THE BOOKING RULES SCREEN HAS THREE FAULTS IN ONE FUNCTION.**
`screens/more/BookingRules.jsx:83` `ruleSentence()` is the surcharge list read
back as a sentence and it is **entirely untranslated** — `"when booked within
{n} hours"` and the joining word `"on"` are both raw English, so the whole list
renders in English on a Spanish screen. In the same two lines:

- **`${r.within_hours} hours` is an unguarded plural** and `within_hours` takes a
  typed custom value, so *"+$25 when booked within 1 hours"* is reachable.
- **`+$${Number(r.amount).toFixed(2)}` bypasses `lib/format.js`'s `money()`**,
  which is the one-currency-formatter rule, and prints `$40.00` where the rest
  of the product prints `$40`.

**A FOURTH ON THE SAME SCREEN, `BookingRules.jsx:234`.** The
`window_exceeds_notice` warning is the only one of the seven warnings on that
screen written as a raw template literal — the other six all go through `t()` in
the `WARN` table at :102. It is also **doubly ungrammatical**: `notice` is
`min_advance_minutes / 60`, so 90 minutes prints *"You take bookings 1.5 hours
ahead"*, and 60 minutes prints *"1 hours"*.

**AND A LONGER TAIL OF TOASTS AND PLACEHOLDERS, same cause, lower stakes:**
`BusinessInfo.jsx:109` and `:204`, `Catalog.jsx:323` and `:334`,
`Campaigns.jsx:201`, `Password.jsx:73` and `:95`, `Team.jsx:100`, `:101` and
`:160`, `Notifications.jsx:152`, `Payments.jsx:84` (a placeholder),
`WebAddress.jsx:121` and `:122`, `Reviews.jsx:146`, `:182` and `:184`,
`WebAddress.jsx:153` and `:161`, `BookingDetail.jsx:238`.

**THE INSTRUMENT IS THE WORK HERE.** Fixing twenty strings by hand leaves the
twenty-first, and a rule that greps for `t(` cannot see a template literal by
definition. **A check that finds a user-facing string which never reaches `t()`
is lane C's, and it is worth more than the fixes.** `Today.jsx:279` is the
counter-example it has to tolerate: English is deliberately the KEY there and
`t()` is applied where it is drawn.

## TWO THINGS THE NEW TAP SWEEP MISREPORTS — lane B, 2026-09-13, for lane C

**Neither is a product defect and both were checked by hand.**

- **`admin/Detailers/open` reports 31 `covered` findings at every width in both
  languages** — 120 of the 249 `covered` findings in a full run. They are the
  detailer LIST beneath an open drawer. A modal legitimately covers the page
  under it, and `sweep-tap-targets.mjs` already has the concept: it prints
  *"[scoped to an open overlay — the page beneath it is not the subject]"* for
  the tour. It just does not apply it to the admin drawer.
- **`row-vanished` left NINE settings screens unmeasured at `768/en/business`**
  in one run and five in the next, and a screen that was never visited reads
  exactly like a screen that passed. The single `a.cta "See five sites built
  with it"` covered finding is the same family — measured again on its own it is
  clean, and the inactive tab panels carry `visibility: hidden` with
  `checkVisibility() === false`, so it is the landing page's own auto-rotation
  moving under the probe.

---

## THE SEVEN DELETE WARNINGS ARE SPANISH NOW, AND THE CHECKER'S BLIND SPOT IS NAMED — lane B, 2026-09-13

**FIXED, not parked.** The entry above this one listed six `window.confirm`
dialogs and a longer tail. All of it is done, and the walk that followed found
twenty-one more. `tests/spanish.test.mjs` is **76/0**, `i18n-coverage` is
**1,375 literal call sites** where it was 1,326, and the build is clean.

**THERE WERE SEVEN CONFIRMS, NOT SIX.** `screens/more/Faq.jsx:97` —
`Delete "${rows[i].q}"?` — was missed by the hand-written list and caught by
`spanish.test.mjs` check **11b**, which lane C added while this session was
running. That is the whole argument for the check in one line: a list somebody
types is a list with a seventh item in it.

### 1 · WHY THE CHECKER COULD NOT SEE ANY OF THEM — for lane C

**`scripts/i18n-coverage.mjs` measures the wrong universe, and it is one
regex.** Line 139:

```js
for (const m of src.matchAll(/\bt\(\s*(["'])((?:(?!\1)[^\]|\.)*)\1/g))
```

**Its subject is every string that ALREADY reaches `t()`.** So the question it
answers is *"is every translated string translated?"* — which is tautological —
and not *"is every user-facing string translated?"*, which is the question
anybody reading the number believes it answered. A string that never reaches
`t()` is not a failure to the instrument; **it is not a subject at all.** That
is why 100% coverage and a screen of English coexisted for months.

**THE CLASS OF TEXT THAT IS INVISIBLE FOR EXACTLY THIS REASON, each already
having produced a real defect:**

| shape | example found today |
|---|---|
| **a native dialog** — `confirm()`, `alert()` | seven delete warnings |
| **a template literal** with `${…}` in it | `` `+$${n.toFixed(2)} on ${days}` `` — the whole surcharge list |
| **a bare literal in JSX** | `+ Add an area`, `+ Add a surcharge`, `Add question` |
| **a ternary between two bare literals** | `busy ? "Saving" : "Save"` |
| **a `setMsg({text: "…"})` toast** | `"Name saved."`, `"Vehicle sizes saved."` |
| **a module-constant data table** | `PRESETS = [["All days", …]]` in `Hours.jsx` |
| **a string built in a `lib/` file with no imports** | `saySoon()` — six sentences plus an `en-US` date |
| **an `aria-label`** | `Delete the review from ${r.author}` |

**AND THE SHARPEST FINDING IS THE OTHER DIRECTION, WHICH NOBODY HAS EVER
MEASURED.** Of the strings fixed today, **twenty-one already had Spanish
written in `appEs.js`** and no call site asking for it — `Live`, `Check it`,
`Checking`, `Save`, `Saving`, `Add question`, `Add review`, `Hide`, `Show`,
`Name saved.`, `Those two do not match.`, `Vehicle sizes saved.`, `No longer
applies`, `All days`, `Weekdays`, `Weekends`, and more. **The translation
existed and was unreachable.** Coverage is a one-way count, so a written-but-
unwired entry is invisible from both ends: it is not missing (it is in the
catalogue) and it is not counted (no call site names it).

**TWO CHECKS LANE C COULD WRITE, AND THE SECOND IS CHEAPER THAN THE FIRST:**

1. **A string that never reaches `t()`.** A regex cannot do it — a template
   literal is invisible to a grep for `t(` *by definition*. It needs the JSX
   walked: JSX text nodes, `placeholder` / `aria-label` / `title` attributes,
   template literals, and the string arguments of `confirm` / `alert`.
   `Today.jsx:279` is the false positive it must tolerate (English is
   deliberately the KEY there and `t()` is applied where it is drawn).
2. **An `appEs` key no call site asks for.** One set difference against the
   `seen` set `coverage()` already builds, and it would have found twenty-one
   real defects today with about four lines of code. **Report it, do not fail
   on it** — a key can legitimately outlive a screen for a release.

### 2 · `composition` 11e-iii IS NOW RED, AND IT IS TRAP (k) AGAIN — for lane C

`tests/composition.test.mjs:937` locates the *Bring* fact by its source
spelling:

```js
const bringAt = row.indexOf("`Bring ${bring.join(\" and \")}`");
```

`JobRow.jsx` now reads `t("Bring {what}", { what: bring.join(\` ${t("and")} \`) })`,
because *"Bring water and power"* rendered in English on a Spanish Today screen
beside *"3 cars"*. **The rule that check guards — that the fact LEADS the
sub-line, ahead of the services and the location — has not moved an inch, and
the order is still correct.** Its own comment says it was rewritten once before
for this exact reason: *"a check that fails on a correct change is a check
somebody deletes."* It needs to find the fact by a stable anchor — `"Bring ` is
enough — rather than by the whole literal. **Lane B may not edit `tests/`.**

### 3 · TWENTY-ONE MORE ENGLISH STRINGS, FOUND BY WALKING AND ALL FIXED

The instrument was a marker test (English function words present, Spanish
markers absent), **proved before it was believed** by planting one English
sentence on a live screen and confirming it was caught. Two of its own runs
returned an empty result that meant *nothing was visited* rather than *nothing
was wrong* — the skipped-check trap, caught only by printing the count.

- **Today** — `3 cars`; `Bring water and power`.
- **Booking rules** — the whole surcharge list (`ruleSentence`), the
  window-exceeds-notice warning, `+ Add an area`, `+ Add a surcharge`, the
  travel-zone blurb, both *Closed until* sentences, `1 car` / `2 cars`, and
  **the bare word `water` inside a Spanish sentence** — *"La página de citas
  pregunta por water"* — because only one of `HELP()`'s two callers had a key.
- **Hours & days off** — `All days`, `Weekdays`, `Weekends`, `Your week · 6 days
  open`.
- **Maintenance deadlines** — `Which car (optional)`, `Then every (months)`, and
  every row's status: `Due in 364 days`, `No longer applies`, `Due today`,
  `Due tomorrow`, `Missed N days ago`, `Done Jul 13` — the last with its date
  hard-coded to `en-US`.
- **Monthly plans** — `Owed a visit · 2`. **FAQ** — `Add question`.
  **How you get paid** — `Save` / `Saving`. **Reviews** — `Add review`,
  `Hide` / `Show`, and the delete button's `aria-label`.

**`lib/maintenance.js` TOOK THE TRANSLATOR AS AN ARGUMENT AND NOT AS AN
IMPORT.** That file's header forbids imports of any kind — the edge function's
copy and `tests/maintenance.test.mjs` both load it in Node, where `appI18n.js`
cannot resolve. `saySoon(d, today, tr = plain, intl = "en-US")` defaults to
English, so all 38 maintenance checks pass untouched, and it is the same shape
`duration(mins, lang)` already uses one file over.

### 4 · STILL ENGLISH AND NOT FIXED — three, all reported rather than guessed

- **`lib/theme.js:310-314`, the colour-contrast sentence.** *"That reads as an
  orange, and it is light enough to use exactly as you picked it."* Three
  sentences built around a colour NAME that comes from a word table in the same
  file, so translating it is translating the table too. Not a one-line wrap.
- **`lib/templates.js` — the five saved-message names.** *On my way*, *Running
  late*, *Confirm tomorrow*, *Job finished*, *Ask about access*, all showing
  *"Aún sin cambiar"* beside them. **They are OURS until the detailer edits
  them and HIS afterwards**, which is the fourth axis of the whose-words rule
  and is a decision rather than a fix.
- **`Business info` — `Fully covered on your property`.** One line, but it sits
  in a block of the detailer's own typed credentials, so whether it is ours
  needs a look at that screen rather than a grep.

---

## Found doing ROADMAP 14.7 — 2026-09-17

### 1 · A CHECK'S LEFTOVER ROW IS MOVING THE DEMO BUSINESS'S MONEY FIGURES

`ROADMAP 14.5 CANARY` exists **fifteen times** in `bookings` on the demo
business. Fourteen carry `deleted_at`; **one does not** — `pending`, `$65`
(`final_amount` 65 over a `total_price` of 60), dated 2026-09-11, created
2026-09-17.

**It is correctly flagged rather than deleted, per ROADMAP 0.3.** The problem
is not the row, it is that **nothing says the row is in the figures**:

- ROADMAP 14.7 measured the Money screen's overstatement at **$230**. With this
  row present it is **$295**. Both measurements are right; the number moved
  under the item.
- The next session to measure this screen against 14.7's note will find a
  third figure, and has no way to tell whether the product changed or the
  fixture did.

**Not fixed here, because it is 14.5's row and deleting somebody else's canary
is exactly the reflex ROADMAP 0.3 forbids.** Two ways out, for whoever owns it:
give the run's live canary a `deleted_at` when it finishes the way it does for
the other fourteen, or price the canary at $0 so it cannot move a money figure.
The second is smaller and cannot regress.

### 2 · `node --test tests/` FROM `CLAUDE.md` § COMMANDS DOES NOT RUN

Documented as *"all test suites"*. What it actually does:

```
Error: Cannot find module <repo>/tests
✖ tests (78.2741ms)
ℹ pass 0
ℹ fail 1
```

**These suites are plain Node scripts, not `node:test` files** — they call
their own `check()` and `process.exit(failed ? 1 : 0)`. Node's test runner
treats the directory argument as a module to load and fails on the first line.
So the battery has to be run file by file, and a session that copies the
documented command gets **one failure that looks like a broken repo rather than
a wrong command.**

**Not fixed here, because changing a documented command is a decision.** Two
options: correct the line to a loop over `tests/*.test.mjs`, or add an `npm
test` script that does it. The loop is one line and needs nothing installed.

*Found while running the battery for 14.7. Neither of these is caused by 14.7's
change; both were true at `2a10b86`.*


---

## THE CUSTOMER'S RECEIPT PAGE NEVER SAYS IT WAS PAID — found 2026-09-18

**Found by paying a real $195 card and then opening the page the customer
opens.** `get-booking-receipt` lists `payment_status` in its
`SERVER_ONLY_COLUMNS` — selected so `payability()` can decide whether to draw a
Pay button, then dropped from the reply. The comment says the three names
there are *"none of the customer's business"*, which is right about
`business_id` and `booking_group_id` and is the thing worth re-deciding about
this one.

**So the only place a customer is ever told the payment worked is the
`?paid=1` banner Stripe redirects them to, which exists for one visit.** Open
the same link tomorrow and the page shows the booking, the final total, and
nothing at all saying it has been settled. The document a customer keeps *as*
their receipt does not record the receipt's only fact.

**Not fixed with ROADMAP 5.3, deliberately.** It is a change to a PUBLIC
allow-list — the one `tests/receipt-fields.test.mjs` reads out of the source
and holds the deployed endpoint to, 60 targets — plus an edge-function deploy
and a line of copy on a page a stranger reads. 5.3's done-when is about what
the OWNER can find, and that is finished and proven. This is the customer's
half of the same question and it deserves its own item rather than a quiet
ride on somebody else's.

**If it is picked up:** the change is one name moved from `SERVER_ONLY_COLUMNS`
into `BOOKING_COLUMNS`, the matching line in `receipt-fields.test.mjs`'s
expected list, a sentence on `ManageBookingPage.jsx` drawn from the row rather
than from the URL, and a Spanish key. Nothing about it is hard; the care is all
in it being public.

---

## ~~TWO MORE SCRIPTS CARRY THE DEMO BUSINESS ID THAT NO LONGER EXISTS~~ — FIXED 2026-09-18

`scripts/e2e-browser-features.mjs:103` and `scripts/e2e-ten-features.mjs:81`
both hold `def6fa3f-5c1f-4eaa-9390-16707a038c26` as a constant. **That row is
gone.** `seed-demo.mjs` rebuilt the demo tenant on 2026-09-18 and a rebuilt row
gets a new id; Coastline Auto Detailing is `89f36921-…` today and will be
something else after the next reseed.

`scripts/e2e-payment.mjs` carried the same constant and died on
`bookings_business_id_fkey` the moment it was run for ROADMAP 5.3. It now looks
the id up from the slug `demo-detail`, which a reseed never changes. **The
other two have not been run and have not been changed** — the fix is the same
three lines, but an untested edit to two verified browser checks is not
something to ship on the way past.

*Found while running ROADMAP 5.3. Not caused by it; both were true at
`2a10b86`.*

**FIXED AND BOTH WERE ACTUALLY RUN — 2026-09-18.** Each file now does what
`e2e-payment.mjs` does: `let BIZ = null` at the top, and § 0 reads the id from
`businesses?slug=eq.demo-detail` straight after the owner signs in, throwing by
name if the row is missing rather than handing `null` to the next insert.

| script | verdict |
|---|---|
| `e2e-ten-features.mjs` | **PASS — 6/6 targets, 42 assertions, 0 failures.** `receipt.mjs` agrees and confirms the canary failed as required |
| `e2e-browser-features.mjs` | **The id fix works** — § 0 resolves `89f36921-…` and §§ 2–4 pass, 27 assertions that had never once run. **§ 1 fails** — see the next entry |

**The guard was broken on purpose before either verdict was trusted.** `SLUG`
was pointed at `no-such-detailer` and `e2e-ten-features.mjs` re-run: it stopped
at § 0 with `no business with slug "no-such-detailer"`, **0/6 targets, exit 1**.
It did not silently continue with no id. The file was then diffed byte-for-byte
against its pre-sabotage copy and re-run clean.

Nothing else was changed in either file. `tests/money-overstatement.test.mjs:282`
still names the dead id, but only inside a note string that nothing queries.

---

## THE OWNER'S PHONE NEVER LIGHTS UP WHEN A CUSTOMER BOOKS — found 2026-09-18

`e2e-browser-features.mjs` § 1 fails **the same way on two consecutive runs**:
the device registers, the customer books, and **nothing arrives in 60 seconds.**

```
  ok    the server hands out a VAPID public key
  ok    the browser got a real push endpoint
  ok    owner-push-subscribe stored it
  ok    this business now has a registered device
  ok    a customer booked the job that should raise the alert
  FAIL  the detailer's device showed a notification   nothing arrived in 60 seconds
```

**The file's own comment says a single miss is the push service and is worth a
re-run before an investigation — twice in a row is not that.** That note records
two misses in six runs; this is two out of two, with the four steps before it
green both times. The subscription row is written, so the failure is downstream:
`create-booking:681` guards the send on `settings.push_enabled`, and
`_shared/ownerPush.ts` needs `OWNER_VAPID_PRIVATE_KEY` and `OWNER_VAPID_SUBJECT`
on the deployed function — only the PUBLIC key is proven present, by the step
above that passes. Neither has been checked. **Check those before touching any
code**, and read the deployed function's log for the booking that was created.

*Found on the first run this script has ever completed. Not caused by the id
fix — before it, the file died on a foreign key at § 1 and this step had never
executed at all.*

---

## ~~THE PINNED ACTION BAR GUILLOTINES THE BUTTON UNDER IT ON `/job/:id`~~ — FIXED 2026-09-18

Andrew reported it from his own browser: *"the GUI looks a little weird with
this like square thing and buttons overlapping"*. It is real, it is measured,
and it is one missing rule.

`.jobbar` is the six-button action bar at the top of a job record, sticky on
purpose — step 4's ruling that Call / Text / Navigate must not scroll away
while a detailer is standing at the car. **It is correct in the slide-up
sheet and wrong on the standalone page.**

`theme.css:4075` pulls the bar out to the container's edges and re-pads it —
but the selector is `.sheet-body > .jobbar`. The `/job/:id` page puts the same
bar inside `.app-main`, which has 18px of side padding and no such rule, so
the bar renders **724px wide at x=37, square-cornered, `padding: 12px 0`** —
the exact width, and the exact background (`--surface`, `rgb(23,27,30)`), of
the `.card` elements beside it, which carry `border-radius: 12px` and
`padding: 18px`.

**Two symptoms, both from that one fact:**

1. **It reads as a bare square slab.** Same colour and same width as the
   rounded cards above and below it, with the buttons flush to its left and
   right edges because its horizontal padding is zero.
2. **Scrolling slices the blue button in half.** `Finalize payment` passes
   under a bar painted the same colour as the card it is sitting in, so there
   is no visible edge to explain the cut — screenshotted at 813px wide, the
   button is sheared across its middle with its rounded bottom still showing.
   A sticky bar is supposed to cover content; one that is invisible against
   what it covers just looks broken.

**Not fixed, and not picked up on the way past.** It is a layout change to the
container every job record in the product opens in — the sheet, the desk's
second column and the page — and `sweep-widths.mjs` is the instrument that
would have to agree the other two are unharmed. That is an item, not an aside.

*Found while Andrew was looking at `ROADMAP 14.5 PAY`, the fixture
`scripts/e2e-payment.mjs` leaves behind per ROADMAP 0.3. The fixture is doing
its job; the bar is a defect on every job record, real or test.*

---

**FIXED 2026-09-18, and the diagnosis above was right about the cause and
short by one symptom.**

`theme.css` no longer describes the sheet on a selector that only the sheet
matches. `--jobbar-bleed` is how far the bar reaches out to its container's
padding edge and back in again as padding; `.app-main` and `.sheet-body` set
it to `--sp-4`, `.record-body` to `0px` because the panel around it holds the
padding instead. That is symptom 1 — the bar now spans 1,180px in a 1,180px
scrollport at 1440 and 392px at 392, against cards 36px narrower, with its
buttons still starting exactly where every other row on the screen starts.

Symptom 2 needed something the entry did not name. **Painting the bar the
page's own ground does not work, and it was tried first.** `--bg` is
`#0B0D0E`; the page as rendered there is `rgb(17, 22, 24)`, because
`.app-shell` puts two atmosphere gradients and a drifting dot lattice on top
of `--bg`. A flat `--bg` band is a darker rectangle on a lit ground — the same
slab in another colour — and the geometry check passed it. No flat fill can
follow a ground that moves, so the bar stops imitating the ground and says it
is in FRONT of the content instead, with the elevation the tab bar already
uses (`0 12px 34px -14px rgba(0,0,0,.8)`), character for character. The
sheet and the desk's record gained the same edge and are better for it.

**Proved by `scripts/pinned-bar.mjs`** — 17 targets, 85 assertions, at 1920 /
1440x900 / 768x1024 / 392x844, normal and `?lite=1`, in all three containers.
Before the change it reported 16 failures naming this entry's exact numbers
(724px of bar in a 760px scrollport; `rgb(23,27,30)` bar on `rgb(23,27,30)`
cards); after it, 17/17 and a valid receipt. The console at every size is two
React Router v7 future-flag deprecation warnings from the library and nothing
else. `docs/gotchas.md` gained two entries for the two ways this measurement
lied on the way.

### SECOND ROUND, SAME DAY — HE TURNED THE FIRST FIX DOWN, AND HE WAS RIGHT

The repair above made the bar a full-bleed band in all three containers. It
measured correctly at four widths and he rejected it on sight: *"it's very
square whereas everything else is like rounded and it just looks a little like
weird"*, and *"the completed unpaid and planned member rate all like touch
this kind of box."*

**Both were real and both measured.** The bar's corner radius was **0px on a
page where every card is 12px** — the only square-cornered thing on the
screen. And the gap between the two status pills and the bar's top edge was
**0px, in all three containers**, not just the page.

So the bar is no longer forced wall to wall. **The law is now: a bar that
reaches its container's edges is a BAND and is square with a hairline; a bar
level with the cards is an OBJECT and takes their radius.** Only the sheet is
the first kind. The page and the desk's second column are now rounded cards in
line with everything under them, all three have 12px of clearance above them,
and all three keep the elevation that says they are in front.

**`docs/screen-rules.md` has the ruling** — it is a screen-level law, not a
fact about this one bar. **The check went from five questions to seven**, and
its canary is now the exact screen he was looking at when he turned it down:
square corners, no elevation, pills flat on the edge. It catches all three.

---

## Two things `example-ctas.mjs` found that are real and are not ROADMAP 2.4

Found 2026-09-19 while closing 2.4. Both measured, neither fixed — 2.4 is
booking controls and these are not, and quietly widening an item is how a
queue stops meaning anything.

**1 · ex3 has three links to a section that does not exist.**
`x-ballantyne.html` carries two `<a href="#services">Services</a>` and
`x-ballantyne-prices.html` one `<a href="x-ballantyne.html#services">`. There
is **no `id="services"` on either page.** Clicking the nav item does nothing
at all — no error, no movement. It is the same shape as 2.4's "Get a price"
footer links, one page over, and it is a NAV item rather than a booking
control, which is the only reason it is here rather than fixed.
*Found by the static fragment pass at the top of the 2.4 work: every `<a>`
whose href carries a `#`, resolved against the target page's real ids. Three
dead, all `#services`, after the two booking ones were repaired.*

**2 · ex4's sticky-nav "Book a detail" is 101x35 at 392 wide.**
Under the 44px floor `docs/design-system.md` calls an absolute, on a phone,
on the control that is a visitor's most likely way into the booking widget
once they have scrolled. Measured with `getBoundingClientRect` after
scrolling the nav into its `.nav.on` state; the same control is 123x44 at
1440, so it is the phone rule it breaks, not the desk one. **`elementFromPoint`
has not been used on it yet** — the design system's own note says a bounding
rect cannot see a `::after` hit-area extension, so this needs the probe
before it is called a defect rather than a paint. `sweep-tap-targets.mjs` is
the instrument; it does not currently sweep `/ex1 … /ex5` at all.

---

## ~~`connected_accounts` is protected by a missing grant, not by its policy~~ — WRONG, WITHDRAWN 2026-09-20, an hour after it was written

**I wrote this entry and it was wrong.** The claim was that
`connected_accounts` carries a SELECT policy that can never fire, because
`authenticated` holds no grant on the table. The second half is false, and it
made the first half false with it.

`20260908001000_connected_accounts.sql` revokes the table and then hands the
columns back **one at a time**:

```sql
revoke all on public.connected_accounts from authenticated, anon;
grant select (business_id, stripe_account_id, charges_enabled,
              card_payments_enabled, connected_at)
  on public.connected_accounts to authenticated;
```

`connect_state` and `connect_state_at` — the flow's one-time credential — are
deliberately withheld, and the migration says why: *"a value nobody can read
is a value nobody can leak."* The policy fires normally for the five granted
columns. **It is not inert. It is a narrower and better-considered arrangement
than a plain table grant, and the only one of its kind in 52 tables.**

**WHAT ACTUALLY WENT WRONG WAS MY PROBE, AND THE LESSON GENERALISES.**
`has_table_privilege(role, table, 'SELECT')` answers **false** for a table
whose columns are granted individually. So `tenant-matrix.mjs` classed the
table as unreachable, asked it for `select=*`, was refused **for the columns
rather than for the rows**, and reported "owner A sees none of its own rows".
**A column refusal and a row denial are indistinguishable from outside**, and I
read one as the other — then wrote a confident entry about a security posture
on the strength of it.

`tenant-matrix.mjs` uses `has_column_privilege` per column now, asks each table
for exactly the columns a browser may have, and prints
`COLUMN-LIMITED — connected_accounts: 5 of 8 columns granted to a browser`
every run. With that fixed the table passes the matrix like any other: owner A
reads its own row, nobody reads B's, 567 assertions, canary caught.

**KEPT RATHER THAN DELETED BECAUSE THE REVERSAL IS THE LOAD-BEARING PART** —
and because a migration was approved on the strength of the wrong version. The
real open question underneath it is unchanged and is a genuine one: the
2026-09-08 migration rules that **any member** of a business may read that the
business has Stripe connected, on the reasoning that *"a staff member being
told 'card payments are on' is information, not power"*. Whether that should
narrow to owners is a live question, but it is a change to a deliberate,
documented ruling — not the repair of an accident, which is what I called it.

---

## STEP 4 OF BOOKING REFUSES A PRESS WITHOUT ANSWERING IT — found 2026-09-20 by Andrew, NOT FIXED

**Reproduction, at 1440 wide on the demo booking page.** Pick a service,
Continue, Continue, Continue past the vehicle step, and land on step 4 of 7,
*"Your address"*. Leave the address box empty and press Continue. The step
refuses, correctly — and its hint, *"Add the address to continue."*, stays
exactly as it was: grey, unchanged, saying the same thing before the press and
after it.

**So the step is not silent, and it is not answering either.** A customer who
has read that line, done nothing about it, and pressed the button gets no sign
that the button was pressed at all. The difference matters on a phone, where
the hint and the button can be a screen apart.

**It is the same family as ROADMAP 2.6 and 2.7 and it is the third of the four
steps nobody has walked.** 2.6 put the shared mechanism in — Continue is
pressable on every step now and the page is told when it was pressed — so the
missing piece here is only that this step does not use it. The vehicle step
turns red on the press; this one has no red state to turn.

**NOT FIXED, and deliberately not:** it is not 2.6, it is not 2.7, and walking
the remaining steps was declined as a separate item. Whoever takes it should
take all of them at once — step 4 (address), step 5 (date and time) and the
services step — rather than one at a time, because the fix is the same three
lines in each and the value is in them agreeing.

---

## Tightening `connected_accounts` to owners: CONSIDERED AND DECLINED, 2026-09-20

**Do not re-propose this without new evidence. It was proposed, approved, and
then withdrawn on the same night, and the reason it was approved turned out
not to exist.**

The proposal was to narrow `connected_accounts_select` from "any member of the
business" to "owners only", on the grounds that the policy was **inert** — a
permissive rule sitting on a table that only a missing grant was protecting,
waiting to fire the day somebody added one.

**That premise was false** (see the withdrawn entry above). The table revokes
and grants its columns back individually; `connect_state` and
`connect_state_at` are never handed to a browser at all, and the policy has
been doing its job for the five columns that are.

**Andrew's ruling, 2026-09-20, re-decided after the correction:**

> *"LEAVE THE 2026-09-08 RULING STANDING. The credential column is already
> ungranted so there is nothing to leak, and what a staff member can see is a
> boolean saying whether card payments work — that is information, not power.
> Overturning a deliberate, written-down decision is a big move, and the only
> reason I was going to make it has just evaporated."*

**So the 2026-09-08 decision stands, in its own words:** *"READ: anybody who
belongs to the business. Not just `settings` holders — a staff member being
told 'card payments are on' is information, not power, and the write path is
closed to all of them equally."*

**What would actually justify revisiting it:** a grant of the whole table to
`authenticated` appearing in a migration (which would hand over `connect_state`
and is the real risk), or a business wanting staff who genuinely must not know
whether the business takes cards. Neither is true today.
`tenant-matrix.mjs` prints `COLUMN-LIMITED — connected_accounts: 5 of 8
columns granted to a browser` on every run, so the day that changes, it says so.

---

## TWO EXAMPLE SITES ARE NAMED AFTER REAL PLACES — asked 2026-09-20, NOT CHANGED

**Raised while closing ROADMAP 1.2**, which invented a new identity for `/ex5`
and moved every example site's email onto the reserved `.example` suffix. Two
names were deliberately left standing:

- **`/ex3` — "Ballantyne Mobile Detailing".** Ballantyne is a real
  neighborhood in Charlotte, North Carolina.
- **`/ex4` — "Kinzie Mobile Detailing".** Kinzie is a real street in Chicago.

**Neither is known to be a company**, and a detailer named after the district
it works in is the most ordinary name in the trade — which is exactly what
makes the question live: a real firm in Ballantyne called Ballantyne
Mobile Detailing is entirely plausible and nobody has checked.

**The email halves are already safe.** Both now read `.example`, a suffix
nobody can register, so no message can ever reach a real inbox by accident and
no domain of theirs is being claimed.

**NOT CHANGED, and it is a question rather than a defect:** renaming a site
means its wordmark, its title, its scheme document, its style guide and its
file name, and `/ex5` took a full pass to do properly. **Andrew's ruling,
2026-09-20: place names are not company names and renaming these is a bigger
job than that item.** Whoever picks it up should decide the general rule first
— whether an example site may be named after a real place at all — rather than
renaming two sites and leaving the rule unwritten for the next one.
