# Batches — the running order, in session-sized pieces

> **Section added 2026-10-06; the rest of this file is the older batch plan.**

## Where the open items stand — recounted 2026-10-06 at `083208b`

**This is a dated snapshot, and the way to re-take it is the command, not this
page.** Item numbers written down start rotting the moment they are written (the
batches were retired on 2026-09-24 for exactly that reason), so read the counts as a photograph and re-run:

```bash
grep -c '^- \[ \]' ROADMAP.md     # open: 60 at 083208b
grep -c '^- \[x\]' ROADMAP.md     # ticked: 99 at 083208b
grep -c '^- \[~\]' ROADMAP.md     # deferred: 1 at 083208b
```

**How the 60 were sorted, said plainly:** the total is a count; **the sorting is a
judgement from reading each entry, not a count**, so a different reader could move
an item between rows. The rows sum to 60, which is the only mechanical check on
it. Every open entry has a number in the roadmap; the ones that print as a bare
bullet in the `grep` listing sit under a `### 14.x` heading, and that is the number
used here.

### Waiting on Andrew — 32 items, and no session can move any of them

**Apply or publish (built and finished on disk, switched off until launch) — 15:**
0.3, 0.6, 0.7, 1.3, 2.1, 2.1b, 3.1, 3.4, 8.10d, 9.1, 9.14, 12.1, 14.9 (open
on the live refusal), 14.18 (the header-less caller, waiting on the same publish)
and 14.34. **The ordered list for
these is in `FOR-ANDREW.md`, "Publish and apply — the one ordered list"**: five
database changes first, then 31 of the 39 programs. **3.1 and 9.14 also carry a
screen half that a session is building in `app/src`** (lane A, in progress).

**His decision, his ruling, his own eyes or his accounts — 17:** 0.4, 0.16, 2.15,
2.15a, 7.8, 7.10, 8.2, 8.5, 9.4, 9.7, 9.11, 9.11e, 9.12, 9.15, 12.3, 12.4, and
14.24 (three human-only checks assembled from the ticked-item audit).
9.12 is on this row rather than in the session-doable ones because its own entry
says not to pick it up unprompted.

### Waiting on something that is not Andrew and not a session — 9 items

**A third party or the platform — 5:** 0.12 (Zoho refuses the domain), 0.13 (a
Telnyx number and the wording), 0.14 (deferred on purpose; costs monthly), 0.15
(Google's review), 6.1 (point-in-time recovery is off on the free plan).
**Blocked on another open item — 2:** 3.3 (needs 0.13) and 7.6 (needs 0.11, by
design, so the words are fixed once). **Nothing to do by design — 2:** 14.15
(a rate-limit refusal nobody has been able to repeat) and 14.17 (the shared-budget
guard, deliberately not built).

### A session can still do these — 19 items, by lane

**Lane A — `app/src` (one session at a time; DP Cowork is in `admin/` now) — 7:**
0.11 (photo storage to R2; large, and has a `supabase/` half), 4.1 (confirmation
and an audit row for seven actions; has a `supabase/` half), 4.6a (100 small tap
targets on the dashboard), 4.6b (six small buttons on the back-office Money tab —
**same files DP Cowork is editing, so it waits for that to land**), 6.4 (the
offline-reload case, filed as 6.4a), 9.2 (the other four back-office advice
rows), and 14.22 (two untranslated words on the client record).

**Lane B — docs, tests, `supabase/`, migrations, receipts — 3:** 4.3 (make the
read-only support view enforced by the server; large, needs a design the entry
describes, and its own proof needs a credential a session may not create), 12.2
(its second branch, the home page no longer promising a card payment, looks
already met — `grep -n "card payment" app/src/landing/LandingPage.jsx` finds
"Log a card payment" at `083208b`; **verify and tick, one line**), and 14.33
(pinning the last document's 69 bare figures; parked on purpose, half-done work
is worse than none).

**Lane B\* — `scripts/`, frozen unless the manager records an exception — 9:**
7.17 (example sites must not show a number the product does not), 7.18 (a nav
check for every `.ld` marketing page), 9.11b (the width sweep comes up short at
1440 and 392), 14.10 (five runs of that sweep at 1440), 14.11 (a declared skip
that is really a dead walk), 14.21 (the back-office scripts' cleanup must survive
a kill), 14.23 (walk the settings doors twice, folded then open), 14.30 (the
2.15a receipt cannot tell an accepted exception from a new failure), and 14.31 (put the pointer-age tool in the repo). **Most of
these also need a browser and the dev server, so they spend the practice
business's rows and the address budget** — `docs/shared-resources.md` names which.

**Sum: 32 + 9 + 19 = 60**, the same 60 the command prints.

### The two things worth knowing before dispatching anyone

* **Lane A is the bottleneck, not the work.** Seven of the nineteen are in
  `app/src`, and the rule that only one session edits it at a time has not
  changed. Lane B has three, and one of those is a one-line tick.
* **Most of "waiting on Andrew" is a switch, not a task.** 15 of the 32 are
  finished work waiting on two commands, so the honest headline is that the
  roadmap is mostly built and the larger share of what is left is a launch-day
  press, not engineering.

---



**`ROADMAP.md` says WHAT and WHY. This file says WHAT NEXT, and in what size.**
It re-orders nothing in the roadmap and duplicates nothing from it. Every batch
is a list of roadmap numbers plus the one thing a session needs to know before
picking them up.

**Why this exists.** The roadmap is a 9,000-line queue ordered by risk. It is
not a plan for a session. A manager reading it top to bottom picks the highest
item, which is usually the hardest one, and a Cowork session that runs long
enough to finish it has usually started forgetting things by the end. **A batch
is one sitting's worth of work.**

**Size, not count.** A batch is roughly **6–8 small items, or 2–3 medium ones,
or 1 large one.** When in doubt, smaller. A batch that ends early is free; a
batch that runs past a session's useful context costs the whole of it.

**Lanes.** Batches are marked **A** (touches `app/src`) or **B** (does not).
**One A batch and one B batch can run at the same time on the two sessions.
Two A batches cannot** — `scripts/source-guard.mjs` watches `app/src` and a
browser sweep run against a tree somebody else is editing measures nothing
while reporting clean.

**AND A AND B ARE ABOUT DIRECTORIES, WHICH IS NOT ENOUGH — 2026-09-23.** A lane
B session running a script and a lane A session running a browser sweep are
properly separated on files and can still be spending the same **address
budget**, the same **daily email allowance**, the same **demo tenant rows** or
the same **`rate_hits` table**. Nothing guards it and nothing reports it; the
loser's run does not fail, it comes back *strange*. **Read
`docs/shared-resources.md` before dispatching a pair**, and make the lane
statement name the **public endpoints and shared budgets** each session will
consume as well as the directories it will write. It expires the moment either
session is given something new. ROADMAP 14.16.

**Keeping this file true.** When a batch finishes, tick it here in the same
edit that ticks the roadmap. When a batch turns out wrong-sized, say so in one
line rather than quietly re-cutting it — the sizing is a guess and the only way
it improves is by recording where it missed.

---

## Batch 1A — Easy wins · **lane A** · ✅ FIVE OF SIX DONE 2026-09-22/23

**Only `7.8` is left in this batch.** `7.4`, `7.11`, `7.12`, `9.6` and `9.16`
are all ticked in `ROADMAP.md`. **Batch 1B is fully closed** — `8.10b` and
`4.5` are ticked; only the unnumbered rate-limit item remains from it, and it
is carried into Batch 1C below.

**The sizing held.** Six small items took roughly one sitting, which is what
this file guessed. Keep that as the calibration for "small".


**Six items, all small, none touching money logic, booking rules or
permissions.** This batch exists to take six numbers off a list of 67 in one
sitting and to prove the whole loop works before anything expensive is tried.

**Model: Sonnet, medium effort.** Nothing here needs Opus.

- [ ] **7.4** — The home page lists the old price first in the markup, so
  search results and screen readers may announce `$999 / $60` instead of the
  founding price. Mark the struck price as the old price, or hide it from
  assistive technology. Founding price first.
- [ ] **7.11** — The home page's own example says "Tacoma, WA"; the demo
  business is Long Beach, CA. Make them agree.
- [ ] **7.12, second half only** — the pricing page has **no sign-up button in
  the phone top bar.** The first half of this item (the unsettled-price window)
  was done on 2026-09-21; **read the entry before touching it** — it carries a
  correction and a false finding that came out of the same paragraph.
- [ ] **7.8** — ~~The privacy page omits **Geoapify** and **OpenStreetMap**,
  which the booking address search visibly credits, so typed addresses go
  somewhere the policy does not name. Add them.~~
  **STALE — the same wording corrected under Batch 1C below. The page already
  names Geoapify; OpenStreetMap must NOT be added; the four real gaps closed
  at `2942f6f`. 7.8 is open on Andrew's wording only. Do not build from this
  line.**
- [ ] **9.6** — The client list shows values with no headings, so last visit,
  lifetime spend and phone have to be inferred. Label them, and give "9 gone
  quiet" an exact period and an action.
- [ ] **9.16** — Hide the owner-only "The website business" row from
  detailers.
  **⚠ TRAP, READ BEFORE BUILDING.** This depends on 0.1, and 0.1 is the
  ruling that **Andrew's demo login deliberately has both owner and detailer
  access.** A naive "hide it from anyone who is not the platform owner" can
  hide the row from the account Andrew actually uses. Gate on platform-admin
  status, then **sign in as the demo owner and confirm the row is still
  there** before ticking.

**Done when:** all six ticked in `ROADMAP.md` with a line each saying how they
were checked, at 1440 and 392, with the console read at both.

---

## Batch 1B — The instruments that lie · **lane B** · runs beside 1A

**Nothing in this batch touches `app/src`**, so it can run on the second
session at the same time as 1A. All three are about checks that report clean
while measuring nothing, which is this repo's oldest and most expensive fault.

**Model: Sonnet, high effort.** Opus if a second attempt is needed.

- [ ] **8.10b** — The repo has **no check that the applied migrations match
  the migrations directory.** Written up on 2026-09-21 to be built by whoever
  owns `scripts/`, deliberately not built there. The cost of not having it is
  already proved by 8.10a: a shipped feature nobody could reach.
- [ ] **4.5** — The four credential-free suites that run before every finish
  **do not reach the back office**, and four items cited them as though they
  did. Found by a session auditing its own evidence, not by a failure.
- [ ] **The rate-limit gap** (Wave 14, unnumbered — search `withinLimits`).
  Six public functions have rate limiting; **`available-slots`,
  `calculate-booking`, `validate-promo-code` and `get-booking-receipt` do
  not.** Measured by counting, not assumed.

**Done when:** each one carries a receipt `node scripts/receipt.mjs` grades,
and each was **broken on purpose first** with the break named in the roadmap
line.

**✅ 8.10b and 4.5 CLOSED 2026-09-22/23.** The rate-limit item carries over.

---

## Batch 1C — ✅ CLOSED 2026-09-23, both items were already done · added 2026-09-23

> ## ⚠ BATCH 1C IS CLOSED. BOTH ITEMS WERE STALE, AND BOTH WOULD HAVE SENT A
> ## SESSION TO REBUILD FINISHED WORK — corrected 2026-09-23.
>
> **Both original items are kept below, struck through rather than deleted,
> because somebody may still be holding a note that quotes them.** Do not act
> on either. **What is actually left on this thread is `14.12` and `14.13`.**

- [x] ~~**7.8 · lane A** — The privacy page omits **Geoapify** and
  **OpenStreetMap**, which the booking address search visibly credits, so typed
  addresses go somewhere the policy does not name. Add them.
  **Sonnet, medium.**~~

  **NOT BUILDABLE AS WRITTEN, and this batch quoted the stale pre-audit
  roadmap line that `ROADMAP.md` 7.8's own entry had already disproved
  twice.** Read that entry before touching the privacy page. It says:

  - **The page already names Geoapify** — three times, at
    `landing/legal.js:173`, in a paragraph written specifically about services
    that receive data *"while somebody is typing"*. The address gap the audit
    found **has been closed since**.
  - **OpenStreetMap must NOT be added.** `_shared/geoapify.ts:206` —
    `ATTRIBUTION` is a **licence credit**, not a processor.
    **No request is ever made to `openstreetmap.org` and no data reaches
    them.** Geoapify uses their data; the licence requires the credit.
    **Naming them on a privacy page would be the other half of the fault this
    item is about** — a policy claiming a recipient that receives nothing.
  - **All four real gaps closed at commit `2942f6f`**, with screenshots at
    `receipts/screenshots/7.8-2026-09-22/`. **Three of the four were gaps
    neither audit mentioned.**

  **7.8 stays open on Andrew's wording only.** There is no engineering left in
  it.

- [x] ~~**The rate-limit gap · lane B** (Wave 14, unnumbered — search
  `withinLimits`). `create-booking`, `pay-booking`, `plan-link`, `unsubscribe`,
  `address-suggest` and `stripe-webhook` have rate limiting.
  **`available-slots`, `calculate-booking`, `validate-promo-code` and
  `get-booking-receipt` do not.** These are public endpoints; unmetered, they
  are free load on the database for anybody who finds them.
  **Opus, high** — public surface plus load behaviour.~~

  **ALREADY BUILT. Counted from the files on 2026-09-23 rather than taken from
  the batch line:**

  - **13 functions call `withinLimits`, not six.**
  - **All four named endpoints carry a real `LIMITS.publicCeiling` guard,
    keyed on `ipOf(req)`, returning `429` before any other work:**
    `available-slots:82`, `calculate-booking:36`,
    `validate-promo-code:25`, `get-booking-receipt:104`.

  **What closed it:** those four guards. The batch line described the state
  before they landed.

> ### WHAT IS ACTUALLY LEFT ON THIS THREAD
>
> **`ROADMAP.md` 14.12** — `cancel-booking`, `reschedule-booking`,
> `accept-quote` and `track-visit` still have no rate limit. **Three of those
> change a real booking**, so the risk is a write a script can spam rather
> than a read it can scrape, and `LIMITS.publicCeiling` is 14.9's own stated
> fix for them. **`track-visit` is different and unverified** — its header
> claims service-role-only and nothing in its source enforces that claim.
>
> **`ROADMAP.md` 14.13** — the rest of that thread.
>
> **Those two are the running order here. Not this batch.**

---

## Batch 2 — Booking truth · **lane A** · Opus, high effort

**FIRST IN THIS BATCH, AHEAD OF EVERYTHING ELSE ON THE MONEY THREAD:
ROADMAP 14.19 — a two-car booking's stored `subtotal` counts the second car
twice.** Added 2026-09-23.

**IT CANNOT REACH A CUSTOMER TODAY. Read that before reading the rest of this
paragraph.** There are no real detailers, multi-car booking was unreachable for
every tenant until 2026-09-21, and the deployed `calculate-booking` is one of
the 14 functions behind this checkout. **Nothing is bleeding while it waits** —
this is first because it is the clearest money fault we have, not because it is
on fire.

**It is first for a reason worth knowing:** the customer's confirmation email
does not merely print a wrong number, it **balances itself by inventing a
`Discount applied -$100` line that does not exist** — so the column adds up,
every money-column check in this repo passes on it, and the customer is told
they got a discount they never received. **A wrong number that still adds up
is invisible to every check that only asks whether it adds up.**

**The verdict is already settled, so whoever takes it starts from the answer:**
the stored column is the bug and the template is faithful. One car is clean at
`subtotal 115 / total 115`. Two cars give `total 215` correctly, with lines of
service `115` plus a second-vehicle `100` summing to exactly `215` — and a
stored `subtotal` of `315`. The fix is in the pricing engine;
**`emailTemplates.ts` is not to be touched.** `_shared/pricing.ts` is imported
by seven functions, so this is a sitting of its own.

**It was found by making multi-car reachable** — 8.10a applied the two missing
migrations on 2026-09-21, and the first end-to-end press of the feature found
this in the same hour. Nobody had ever added those numbers up because no
two-car booking had ever existed.

---

**The most corroborated findings in the whole file — both audits reached them
independently.** A customer must never be shown one price and charged another.
**Do not mix this batch with anything else**, and do not let a second session
into `app/src` while it runs.

`2.1` (the total rises after the time is picked), `2.1b` (the quote cannot
price a day until a time is picked, and the header says otherwise — not a
fault, read before acting), `2.3` (a far-away address is accepted with no
travel charge — **note Andrew's ruling: named flat-fee zones, no distance
pricing, and the mismatch flag labels and never gates**), `2.8` (address entry
may accept unverified raw text), and the unnumbered discount-label item
(`StepReview.jsx:57` states a percentage the folded amount does not match).

---

## Batch 3 — Photo storage moves to Cloudflare R2 · **lane A** · Opus · one sitting, alone

**0.11 only. This is a whole batch by itself and it is bigger than it looks.**

Today **the database itself refuses to hand one detailer another detailer's
photo** — not a rule in our code that could have a gap, the database enforces
it, proved four separate ways. **R2 is a dumb bucket with no idea what a
business is.** So the job is five bucket names **plus rebuilding that guard in
our own code**, and the rebuilt guard has to be right **before a single real
photo is written.**

It is cheap today for exactly one reason: **zero photos are stored.** That is
the whole discount and it expires at the first upload.

**The allowance goes from 1 GB to 10 GB in the same change as the upload
switch, never a commit earlier**, or the screen promises storage that does not
exist. Design and arithmetic: `docs/the-photo-allowance.md`.

---

## Batch 4 — Publishing, and what is running versus what is written · **lane B**

**Blocked on Andrew's publish-order decision**, which is the top row of
`FOR-ANDREW.md` and unblocks more than anything else on the list.

`0.6` (22 of 39 edge functions run code older than the repo), then `8.10a`
(two migrations never applied to the live database — one of them is why
multi-car booking has never worked for anybody).

**Order is Andrew's and fixed:** Spanish emails → card-declined and
report-a-problem → the remaining seventeen → **the payment webhook last and
alone.** Run `deployed-inventory.mjs` before and after; it has never actually
been run, so it is unproven rather than skipped.

---

## Batch 5 — Field usability and measurement · **lane A** · measurement-heavy

`8.3` (small grey text unreadable outdoors — both audits, everywhere), `8.5`
(keyboard, screen reader, zoom, large text, reduced motion — **Andrew's
ruling: fix the booking page only; the back office may scroll sideways at
double text size**), `2.15` (sticky footer covers the last choice), `2.32`
(the fixed tab bar leaves 43px of reachable area against a 44px absolute).

Plus the two sweep-instrument items in Wave 14: the five-runs-five-different-
answers flakiness, and the declared skip that certifies its own fault.

---

## Batch 6 — Dashboard and back office · **lane A**

`9.1` (setup progress disagrees between dashboard and back office — a live
regression against a rule CLAUDE.md already states), `9.2`, `9.4` (calendar
readability), `9.7` (client card missing basics), `9.10` (business settings
waste half the screen — **blocked on Andrew deciding what the live preview
shows**), `9.11` (re-opened, read the correction), `9.12`, `9.14`, `9.15`.

---

## Batch 7 — Recovery, monitoring and safety · **lane B mostly**

`6.1` (**blocked** — no restore has ever been done and the backup key's
location is unrecorded; that is the top of Andrew's urgent list), `6.2`, `6.3`,
`6.4`, `4.1` (one tap completes a job with no confirmation and no undo — used
one-handed in a driveway), `4.3`, `4.4` (prove tenant isolation properly).

---

## Waiting on the outside world — not a batch, and not forgotten

**Each of these says what it waits on and how the wait ends.** None is
buildable today. Do not pick one up hoping.

`0.12` ZeptoMail (Zoho refuses the domain) · `0.13` SMS send path (parked by
Andrew until the wording is settled — `TEXTING.md`) · `0.14` 10DLC campaign
(costs money monthly, waits for launch) · `0.15` Google OAuth verification
(waits on Google; detected by the quota reading 300, not by an email) · `0.16`
web-filter categorisation (CAPTCHAs only Andrew can clear) · `3.3` texting to
customers · `8.2` real-device pass · `12.4` demo split (triggered by the first
real signup, not by a date) · `0.3`, `0.4`, `7.6` (all await an answer from
Andrew).
