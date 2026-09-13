# THE DAY'S EMAIL ALLOWANCE — and the slice of it nothing but the platform can spend

**Lane C, 2026-09-13.** Andrew's item: *"The Plumbing tab shows email usage at
49 of 100 for today, and the test suites are spending it. If a heavy test run
can exhaust the daily allowance then a real signup notice silently does not
arrive. Work out whether that is true and make it impossible."*

---

## IT IS TRUE, AND IT HAD ALREADY HAPPENED TWICE IN A WEEK

`platform_email_days`, read at 06:55 UTC. Resend's free plan is **100 emails a
day across every tenant**.

| day | sent | failed | attempts | |
|---|---|---|---|---|
| 2026-09-13 | 84 | 10 | **94** | and it was not yet 7am |
| 2026-09-12 | 15 | 2 | 17 | |
| 2026-09-11 | 59 | 0 | 59 | |
| 2026-09-10 | 8 | 0 | 8 | |
| 2026-09-09 | 15 | 0 | 15 | |
| 2026-09-08 | 117 | 0 | **117** | **over** |
| 2026-09-07 | 173 | 67 | **240** | **two and a half times the cap** |

**There are no detailers on this product.** Every one of those emails is ours.

### WHAT ACTUALLY SPENDS IT

`send-email` already refuses the reserved domains — `.test`, `.invalid`,
`.localhost`, `.example`, `example.com/.net/.org` — **before** it reaches the
provider, so most fixtures are free. What is not free:

- **`delivered@resend.dev`**, Resend's own delivery simulator, used by
  `scripts/e2e-booking.mjs`, `tests/multi-vehicle.test.mjs`,
  `tests/staff-roles.test.mjs` and `tests/dead-mans-switch.test.mjs`.
- **Every `@detailplatform.com` address**, which is a real domain — including
  the demo business's own contact address, so **every owner alert a suite
  triggers is a real send.**
- The transactional set is **about five emails a booking**, so a suite that
  creates twenty bookings has spent the day.

### AND "SILENTLY" IS THE WORST WORD IN HIS SENTENCE

At the cap Resend answers **429**. The chain was:

> a suite burns the allowance → a real detailer signs up → Resend refuses →
> `send-email` logs it → `sendTenantEmail` **returns `false` and does not
> throw** → `create-business` wraps the signup alert in a `try` that logs and
> moves on → **Andrew is never told anybody signed up, and nothing anywhere
> says so.**

Every link in that chain is individually correct. *A booking must never fail
because an email did* is right. The result is still that the one email he asked
for cannot arrive on a busy day.

---

## THE FIX: A RESERVE, CLAIMED BEFORE THE PROVIDER IS CALLED

**Tenant mail stops at `email_daily_cap - email_platform_reserve`. The last
slice is reachable only by mail the platform sends in its own name.**

```
cap 100, reserve 20

  0 ─────────────────────── 80 ──────── 100
  │  anything a suite can    │ platform  │
  │  trigger                 │ only      │
```

| | |
|---|---|
| `platform_settings.email_platform_reserve` | **20**, and it is a setting rather than a constant, for the same reason the cap is: the answer to a warning is to change the fact, never to dismiss it |
| `platform_email_days.claimed` | the BUDGET ledger, moved before the provider is called |
| `claim_email_send(p_platform)` | one `plpgsql` call, atomic, returns whether this send may go |

**`sender_name` IS ALREADY THE DISCRIMINATOR AND NO NEW FLAG WAS NEEDED.**
`send-email` has carried `fromPlatform` since roadmap 2.20. The three things
that set it are **the signup alert in `create-business`, platform billing mail,
and the dead man's switch** — exactly the mail Andrew must receive. **Nothing a
detailer or a test fixture can reach sets it.**

### FIVE PROPERTIES THAT ARE EACH A DECISION

1. **THE CLAIM SITS AFTER THE TWO FREE EXITS AND BEFORE THE PROVIDER.** Above it
   are the reserved-domain refusal and the missing-key refusal, both of which
   cost the provider nothing. Claiming above them would have every fixture in
   the repo spending a budget it never touches — **the opposite of the point.**
2. **A REFUSED CLAIM COSTS NOTHING.** It never reached the provider, so charging
   it would make tomorrow's arithmetic wrong as well as today's, and would
   ratchet the number up every time a suite retried.
3. **A REFUSAL IS LOUD AND COUNTED.** `console.error` with the recipient, and
   `note_email_send(false)` so the Plumbing tab shows the day visibly running
   over. The defect he named is a silent one; a refusal nobody can see is the
   same defect.
4. **A REFUSAL NEVER BLAMES THE CUSTOMER.** `markAddress` is not called.
   Testing loop F-025 already cost this product that mistake once — real
   customers stamped `email_failed_at` permanently because of our own 429,
   which `send-campaign` then enforces.
5. **A CLAIM THAT ERRORS SENDS ANYWAY.** A counter must never be the reason a
   booking's confirmation does not go out, and the provider's own 429 is still
   the backstop. **And the `rpc` error is read rather than assumed** — reading
   only `data` would turn a PostgREST 504 into `null`, which is not `false`,
   which is "allowed" by accident.

### TODAY'S ROW WAS BACKFILLED, AND THAT MATTERS

`claimed` arrived with `default 0` on a day already at 94, so the gate would
have allowed another 80 tenant emails on top — 174 attempts against a cap of
100 — **and the reserve would not have existed until midnight UTC.** Migration
`20260913030100` seeds `claimed` from `sent + failed`, which is exactly the
number of attempts that reached the provider. **A gate that is off for its first
seventeen hours is the failure it was built to prevent.**

**As of 07:13 UTC today, `claimed` is 94.** Tenant mail is already refused; six
of the platform's twenty remain.

---

## WHAT THIS DOES *NOT* DO

**It does not stop a test run spending 80 emails of a real detailer's day.**
That is a real cost and it is a different question — the suites' own addresses —
and it is recorded in `FOUND.md` rather than guessed at here. Two things would
close it and neither is this item:

- **`delivered@resend.dev` is a live send.** Whether Resend charges the
  simulator against the plan was not measured and should not be assumed either
  way. Four files use it.
- **The demo business's contact address is `@detailplatform.com`**, a real
  domain, so owner alerts in every credentialed suite are real sends. Moving it
  to a reserved domain would make most of a suite run free — **and would also
  stop `scripts/e2e-booking.mjs` proving that mail actually leaves**, which is
  the one thing it exists for. It needs a decision, not an edit.

**What is now IMPOSSIBLE is the thing he asked about: a test run cannot take the
signup notice with it.**

---

## THE CHECK

`tests/email-budget.test.mjs` — **22 checks**, `§ 1` against the real function
and the real row (restored in a `finally`), `§ 2` asserting the ORDER of the
claim in `send-email` rather than any spelling.

**Baselined by three deliberate breaks:**

| break | what went red |
|---|---|
| the claim ignores the reserve | 1b, 1c, 1d |
| a refused claim keeps the count | 1c, 1d |
| the claim moved after the provider call | 11 of 22 |

**And § 1a is the baseline inside the check**: an always-false claim would pass
every refusal assertion in the file, so the first thing asserted is that it says
yes when it should.
