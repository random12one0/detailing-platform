# Batches — the running order, in session-sized pieces

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

**Keeping this file true.** When a batch finishes, tick it here in the same
edit that ticks the roadmap. When a batch turns out wrong-sized, say so in one
line rather than quietly re-cutting it — the sizing is a guess and the only way
it improves is by recording where it missed.

---

## Batch 1A — Easy wins on public pages and small UI · **lane A** · start here

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
- [ ] **7.8** — The privacy page omits **Geoapify** and **OpenStreetMap**,
  which the booking address search visibly credits, so typed addresses go
  somewhere the policy does not name. Add them.
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

---

## Batch 2 — Booking truth · **lane A** · Opus, high effort

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
