# Shared resources — read this before you start

**One page on purpose.** A long one gets skipped, and this only works if it is
read at dispatch.

---

## The rule

**A lane statement names the public endpoints and shared budgets a session will
consume, not only the directories it will write.**

*"I own `app/src`"* and *"I own `scripts/zone-mismatch.mjs`"* do not separate
two sessions that are both about to call `address-suggest`. Files were never
the only thing two sessions collide on.

**It expires the moment either session is given something new.** A lane
statement describes the work in hand, not the session.

---

## Why this page exists

**Three of the things two sessions share are not files. Two of the three bit on
the same night — 2026-09-23.**

* A browser sweep and a replay contended for the **address budget**. The
  replay's six calls came back 429, and a function was written into
  `ROADMAP.md` as refusing for a reason that was never true. (ROADMAP 14.16,
  `docs/gotchas.md` 79.)
* The replay had been silently eating about **twenty of the day's eighty
  emails** on every run, and two functions that had answered 200 came back 500
  and 502 when the day ran out. (ROADMAP 4.4, round four.)

Neither failed. Both came back *strange*.

---

## The five

### 1 · The booking page's public endpoints

**What:** the six edge functions a customer's booking journey calls —
`address-suggest`, `available-slots`, `calculate-booking`,
`validate-promo-code`, `create-booking`, `track-visit`.
**Who spends it:** any browser-driven check — `sweep-booking-steps`,
`e2e-booking`, `zone-mismatch`, `surcharge-visible`, a manual walk. **A browser
spends far more than a script, because a booking walk types**, and every
keystroke in the address field is one call.
**When somebody spent it first:** your calls come back 429 or 503 and your
check records the *function* as refusing. The cause is minutes in the past and
in the other session's pane.
**Does anything report it:** **no.** Nothing anywhere.

### 2 · The Geoapify address budget

**What:** address autocomplete is a metered third-party API. **60 calls an hour
per IP**, under a **2,400 a day ceiling shared by every detailer** (the free
plan is 3,000; 2,400 leaves 600 in hand). One keystroke is one credit.
**Who spends it:** anything that types an address. Also the edge replay.
**When somebody spent it first:** the daily one is the bad one — **address help
stops for every tenant until midnight UTC**, not just for you.
**Does anything report it:** the product's own two limits are counted in
`rate_hits`, so they can be *read*. Nothing warns you. **And there is a third
ceiling above them, outside the product, that is not counted at all** —
ROADMAP 14.15, unreproduced.

### 3 · Andrew's daily email allowance

**What:** **100 sends a day**, with **20 reserved for the platform**, leaving
**80 for tenants**. Claimed before the provider is called.
**Who spends it:** anything that causes a real send — bookings, invoices,
invites, campaigns, and any fixture pointed at a deliverable address.
**When somebody spent it first:** functions that send start answering **500 or
502**, which reads exactly like a broken function.
**Does anything report it:** **partly.** `platform_email_days` records
`sent / claimed / refused` per day and the back office shows it — but nothing
tells a running session, and you have to know to look.
**How to spend none:** point fixtures at a reserved domain (`@example.com`,
`.test`, `.invalid`). `send-email` checks for those **above** the claim, so
they cost nothing. `delivered@resend.dev` is a real domain and costs one.

### 4 · The demo tenant's rows

**What:** `demo-detail` — the seeded business most suites and every browser
sweep sign in as.
**Who spends it:** several test suites write **real rows** into it, not just
their own fixtures. `seed-demo.mjs` reseeds it.
**When somebody spent it first:** a booking or a status change mid-sweep moves
the surface you are measuring, and your run reports a difference that is the
other session, not the product.
**Does anything report it:** **no.** CLAUDE.md warns about it for the full test
battery; the warning applies to any two things that touch it at once.

### 5 · The `rate_hits` table

**What:** every rate limit in the product counts into one table. Windows are
fixed, not sliding, so they reset on the hour or at midnight UTC.
**Who spends it:** every call to a rate-limited endpoint — **including refused
ones**, which is deliberate.
**When somebody clears it:** a check that deletes rows to buy itself a clean
run **destroys the floor another session is measuring from**, with no trace.
**`scripts/tabbar-clearance.mjs` deletes every `address%` bucket** and says so
in its own header; `bk-bar-clearance.mjs` deliberately does not.
**Does anything report it:** **no.** `docs/gotchas.md` 78 has the near-miss.

---

## The honest column

**For four of the five, nothing reports the contention.** So:

> **The absence of an error is not the absence of a collision.**

If a number comes back strange, ask what else was running before you write the
number down as a fact about the product.

---

**Related:** `docs/gotchas.md` 78 and 79 · ROADMAP 14.15, 14.16, 14.17 ·
CLAUDE.md § "Don't edit `app/src` while a browser script is running"
