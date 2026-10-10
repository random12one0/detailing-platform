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

## And the other half of it

**Before running a check, ask what it WRITES, not only what it reads.**

A lane statement tells you what the *other* session is consuming. This tells
you what *you* are about to consume, and it is the half that gets skipped
because running a check feels like reading. If a check clears, seeds, deletes
or resets anything on the list below — a rate-limit bucket, the demo tenant's
rows, a queue, a cache — **it is not safe to run beside anything measuring
that thing**, and thirty seconds of wanting a green is how the damage gets
done.

**The damage lands on somebody else's screen, which is why nothing catches
it.** A flaky check misleads whoever ran it. A check that clears shared state
misleads whoever did *not* run it, while they are looking at their own numbers
with no reason to suspect anything moved. `scripts/tabbar-clearance.mjs` is the
worked example — § 5 below, and `docs/gotchas.md` 78 for the night it nearly
happened.

**Stated here rather than only in `gotchas.md` because this is the page read at
dispatch.** A habit written in the file people open *after* a number surprises
them is not a rule; it is a post-mortem.

---

## Why this page exists

**Nothing on this page is a file, and every separation rule this repo has is
about files. Three of the six bit on one night — 2026-09-23.**

* A browser sweep and a replay contended for the **address budget**. The
  replay's six calls came back 429, and a function was written into
  `ROADMAP.md` as refusing for a reason that was never true. (ROADMAP 14.16,
  `docs/gotchas.md` 79.)
* The replay had been silently eating about **twenty of the day's eighty
  emails** on every run, and two functions that had answered 200 came back 500
  and 502 when the day ran out. (ROADMAP 4.4, round four.)
* A sweep resized **Andrew's own browser window** out of the half-screen split
  he keeps it in and has asked for more than once.

None of the three failed. Two came back *strange*, and the third was noticed
by the person whose screen it was.

---

## The seven

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
**Since 2026-09-23 something else is on them too:** the `probe-live-site` cron
job calls `available-slots` and the tenant-profile RPC **every five minutes,
for ever** (ROADMAP 6.2). It is read-only, spends no Geoapify credit and no
email, and — measured 2026-09-23 — leaves no row in `rate_hits`, so it neither
exhausts your bucket nor can be throttled by you. **That changes the day ROADMAP
14.18's fix is published:** a caller with no address is then counted, so the
probe will leave one row, `(available-slots:no-address, all)`, at about 12 hits
an hour against a ceiling of 3,000. It still cannot exhaust a session's bucket;
a flood of header-less calls could in principle now refuse it. Worth knowing it is there when you
are reading traffic.

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
ROADMAP 14.15, unreproduced — and a real-browser repro on 2026-10-10
(`scripts/address-429-repro.mjs`) found **no** refusal from above the function
in 370 calls; every 429 carried the product's own `reason: "busy"`.

**`tests/geoapify.test.mjs` spends it only on request, 2026-10-06.** Its live half (§ 4 and § 5, about 11 lookups a run) needs `GEOAPIFY_LIVE=1`. Having credentials in `.env` is not enough, because `tests/_env.mjs` loads them into every suite and a plain run spent real lookups twice that day. Without the opt-in the file runs its 18 no-network checks and prints that § 4-5 were skipped. Measured by counting `fetch` calls with a preloaded counter: 0 calls with `.env` loaded and no opt-in, 8 calls with the opt-in and the network blocked.

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

**IT IS SHARED WITH ANDREW'S REAL BUSINESS — measured 2026-10-06.** The Resend
account the platform sends through also holds `andrewsdetail.com`: its domain
list shows both `email.detailingplatform.com` and `andrewsdetail.com`, verified
and sending (Resend connector, `list-domains`). Resend's daily cap is per
ACCOUNT (`get-usage`: "Emails (daily): 8 / 100"), so every test send is one his
real customers' confirmations, reminders and invoices cannot have that day.
**The product's own counter cannot see his business's sends**:
`platform_email_days` counts only what `send-email` claimed, so its "80 for
tenants" can be spent in full on a day his own site has already sent, and the
provider — not the product — is what refuses the next one, on either side.

**THE COLLISION, 2026-10-06.** DP Cowork2 ran `tests/email-sends.test.mjs`
**twice** in one sitting (once inside a batch of suites, once again to read its
failures), at 20:34:41 and 20:35:08 UTC. Each run sent 4 to Resend's sandbox
addresses (2 to `delivered@resend.dev`, 2 to `bounced@resend.dev`), **8 in
all**. Both counters agree it was the whole day's spend: Resend
`get-usage` 8 / 100, and `select * from platform_email_days where
day='2026-10-06'` → sent 8, claimed 8, refused 0. Nothing from
`andrewsdetail.com` had gone out that day, so nothing of his was refused. The
session first reported it as "run once"; that was wrong and is corrected here.
The suite also re-points a demo booking's address while it runs; it was checked
back to its exact original afterwards — the seeded customer has **no** address
on purpose, and both the customer and the booking read empty, bounce flag clear.

**THE FIX: real mail is now opt-in, per run.** `realMail()` in
`tests/_mail.mjs` — the helper every real-mail suite and script already has to
call — **throws unless `ALLOW_REAL_MAIL=1`** is set. `email-sends` refuses
before it touches the booking, prints `NOT RUN … REFUSED TO SEND REAL MAIL`, and
**exits 1**, because a refusal that exits 0 reads as a pass (proved: with the
failure line removed it exits 0). `dead-mans-switch` takes its existing
NOT MEASURED path instead. Measured: run without the flag, the day's counter
stayed 8 → 8.

```bash
ALLOW_REAL_MAIL=1 node tests/email-sends.test.mjs   # spends 4, on purpose
```

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
**Two key shapes to know when reading it:** `(<bucket>:no-address, all)` is the
one shared counter for callers who arrive with no address (ROADMAP 14.18, once
published), and `198.51.100.14` is a documentation address only
`tests/rate-limit-loops.test.mjs` uses — it writes one row each to
`cancel-booking`, `reschedule-booking` and `accept-quote` and
`cancel-booking:no-address`, and deletes them by exact bucket and key. **It
aborts rather than deletes if the shared no-address row already holds anything.**

### 6 · Andrew's browser window

**What:** the Chrome window on his screen. **He keeps it in a half-screen
split and has asked more than once that it stay there.**
**Who spends it:** anything that drives a *visible* window — and a width sweep
spends it hardest, because resizing is the measurement.
**When somebody spent it first:** his window is a different size than he left
it. On 2026-09-23 a sweep resized it to **948 × 859** mid-run. It is the only
resource on this page whose collision is with **a person**, not another
session, and the only one that is noticed immediately and resented.
**Does anything report it:** **no** — and unlike the others, he does.
**The rule:** drive your own browser context, not his, and **write screenshots
to disk instead of resizing anything he can see.** If a check must resize, it
resizes a window he is not looking at.

---

### 7 · The receipt files in `receipts/`

**What:** one JSON file per check, at a fixed path. `receipts/` holds **72**
tracked files (`git ls-files receipts | wc -l`, 2026-10-07; this line said 61); `receipt.mjs` grades them and several ROADMAP items read a
verdict straight out of one.
**Who spends it:** **every session that runs a graded check.** The path is the
check's name, not the session's, so two sessions running
`deployed-inventory.mjs` write the same file.
**When somebody clears it:** they do not clear it — **they overwrite it, which
is worse**, because the file still exists, still parses, and still looks like a
receipt. The only thing that changed is whose run it describes.
**Does anything report it:** **no.** No lock, no warning, no field saying which
session wrote it.

**THE COLLISION, MEASURED 2026-10-06 RATHER THAN IMAGINED.**
`receipts/deployed-inventory.json` and `receipts/migration-drift.json` were
already modified in the working tree by the other lane. This session then ran
both scripts for ROADMAP 3.1 and **overwrote both with its own results.** The
other lane's numbers were gone, with nothing anywhere to say so — the files
were dirty before and dirty after, the same two paths, the same shape.

**AND THE RECEIPT RECORDS A COMMIT, WHICH IS WHAT MAKES IT DANGEROUS RATHER
THAN MERELY UNTIDY.** Each one carries `git_sha` and `git_sha_started`. A
session that reads a receipt it did not write gets a verdict stamped with a
commit, and will reasonably treat that as provenance — `docs/gotchas.md` 94 is
the rule that a number carrying its revision is trustworthy. **Here the
revision is real and the run is somebody else's.**

**THE RULE, and it costs one command:**

> **Before running a graded check, `git status --porcelain receipts/` and look
> for the receipt you are about to write. If it is already modified, the other
> lane has an unreviewed result there: say so and leave it, or take the
> overwrite deliberately and tell them you did. Never overwrite it silently.**

**And if you have already overwritten one, do not quietly commit it.** The
other lane's result cannot be recovered from the working tree, but
`git checkout HEAD -- receipts/<name>.json` restores the last COMMITTED
version, which is at least a known state rather than a mixture. **Leaving it
dirty and naming it in the handoff is better than committing somebody else's
half-overwritten verdict under your own message** — which is what this session
did on 2026-10-06, and it is why these two files were deliberately left out of
commit `3dfd8dd`.

**AND IT HAPPENED AGAIN THE NEXT DAY, TO THE SAME FILE, BY A SESSION THAT HAD READ
THIS PAGE — 2026-10-07 (DP Cowork2).** `receipts/migration-drift.json` was already
modified in the working tree by the other lane. This session ran
`node scripts/migration-drift.mjs` because CLAUDE.md's verification table asks for
it after a migration, **overwrote the other lane's result, and then committed it**
under its own message in `fc524da`.

**THE FIRST CLAUSE HAD BEEN OBEYED TWENTY-FOUR HOURS EARLIER AND BY THE SAME
SESSION.** ROADMAP 9.18 records reading `receipts/deployed-inventory.json` and
**deliberately not re-running it** for exactly this reason, citing this section by
number. **So this is not a rule nobody knew; it is a rule that does not survive a
checklist.** The table said *run migration-drift after a migration*, and
`git status --porcelain receipts/` was never typed.

**AND THE SECOND CLAUSE IS THE ONE THAT HAD NEVER BEEN BROKEN BEFORE.** *"Do not
quietly commit it"* exists because committing is what removes the remedy above:
once a receipt is in a commit, `git checkout HEAD -- receipts/<name>.json` restores
**that** file rather than the last state both lanes agreed on.
**What the commit message did say, which is the only mitigation here:** it named the
overwrite and the mistake in its own text rather than leaving it to be found.

**WHAT WAS AND WAS NOT LOST, measured rather than assumed.** Both verdicts were
`fail`; the committed file is a **whole run of this session's**, not a mixture, so
the "known state" remedy would swap one true measurement for an older one and is
not worth taking. What is gone is the other lane's **run**, and it was gone the
moment the script started — the commit did not destroy it, it only made it
permanent. The last committed version before it was stamped 2026-10-06T23:04:08Z;
this session's is 2026-10-08T03:26:55Z.

**THE AMENDMENT, and it is one word longer than the rule above:** the `git status
--porcelain receipts/` check belongs **in the same breath as the decision to run the
script**, not in a review afterwards — because by the time there is something to
review, the other lane's numbers are already gone and the only choice left is
whether to compound it.

**WHY A LANE STATEMENT DOES NOT COVER THIS.** A lane statement names the
directories a session will WRITE and the budgets it will SPEND. `receipts/` is
neither: it is written as a side effect of running a check that the lane
statement does not mention, because the check is about `supabase/` or `docs/`.
**The two sessions were correctly separated by directory and collided anyway**,
which is the amendment `docs/gotchas.md` 78 and 79 already forced once — this is
the same shape in a third place.

### 8 · The manager's own browser, which cannot reach `localhost:5173`

**Measured 2026-10-07 17:50 — his Chrome loads an error page there.** So the
shared resource a visual turn actually depends on is **not** his browser; it is
the `.manager-shots/` directory. Write screenshot files to
`.manager-shots/<item>/<width>.png` at 1920, 1440x900, 768x1024, 392x844 and
320, and name the paths in "Look at it".

**Two sessions writing the same `<item>` overwrite each other silently**, the
same shape as § 7 — the directory is untracked, so `git status` will never
show you the collision. Use your own item number, and say in your lane
statement that you are writing there.

Full rule and the reason: `docs/how-we-run.md` § "Driving the browser",
`docs/gotchas.md` 99.

## The honest column

**For five of the six, nothing reports the contention** — and the sixth is
reported by Andrew noticing. So:

> **The absence of an error is not the absence of a collision.**

If a number comes back strange, ask what else was running before you write the
number down as a fact about the product.

**A guard now reads what it can (ROADMAP 14.17, 2026-10-10).** Read-only, no new
table: `node scripts/shared-resources-guard.mjs run --mine=<what you moved> -- <your command>`
(or `before` / `after`) samples `rate_hits`, today's `platform_email_days` and the
demo tenant's row counts either side, and names any counter that moved which you
did not declare. **Its verdict is never "no collision".** It prints, with every
verdict, the six things it cannot see — the platform ceiling above
`address-suggest` (14.15) first. Declare with prefixes, e.g.
`--mine=rate_hits/address-suggest,demo/bookings`.

---

**Related:** `docs/gotchas.md` 78 and 79 · ROADMAP 14.15, 14.16, 14.17 ·
CLAUDE.md § "Don't edit `app/src` while a browser script is running"
