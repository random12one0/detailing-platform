# The silence census — which checks can tell a pass from a did-not-run

**2026-09-20.** Started because `langCheck()` in `sweep-widths.mjs` was found to
be a check that **can only fail**. It says nothing when a surface is correctly
Spanish, and nothing when the catalogue recognises no phrase on it at all —
**and those two silences are identical in the log.** It had been running for
days and everybody read its silence as a yes. No run had ever *asserted* that
the customer's half rendered Spanish; runs had only failed to assert that it
did not.

That is not a `langCheck` bug. It is the shape this whole repo exists to catch,
found inside one of the instruments. So the same question was asked of every
other check: **can it distinguish a pass from a did-not-run, and if not, what
would make it say which?**

---

## The two sentences to take away, if you read nothing else here

**1. A general fault count wearing a specific sentence.** `failing` in
`sweep-booking-steps.mjs` was incremented in six places, one of them the W16
step-fit case, and the summary printed all six as *"N steps do not fit — W16 is
not met."* It reported **12** over a list of **10**, and it survived a 315px
layout change without moving **because it was never counting the thing that
moved.** Split and proved: the twelve were **8 and 4**.

**2. When a summary number and the list under it disagree, the number is not
rounding — it is counting something the list does not show.** That is the test
the first sentence implies, and it is cheap: the discrepancy is visible without
running anything, in any report where a total sits above its own detail.

Those two are the most transferable thing in this file. Everything below is
evidence for them.

---

**This file is the census, not the fix.** One silence was closed (below). The
rest are listed with the distinguishing test named, so the next person does not
have to re-derive it.

---

## The number

| | |
|---|---|
| `.mjs` files in `scripts/` | 74 |
| of those, **checks** (produce a verdict about the product) | **33** |
| write a receipt, so `receipt.mjs` grades them | **21** |
| named as a gate in `CLAUDE.md` but write **no receipt** | **7** |
| have a canary block at all | **8** |

**The honest reading of that:** 21 of 33 checks are graded by something other
than themselves. The remaining 12 are graded by whoever reads the console, and
the console is where a silence lives.

---

## Why a receipt is most of the answer

`receipt.mjs` already refuses the three shapes a did-not-run takes, and this is
worth knowing before adding anything new:

- `expected_targets <= 0` or `discovered_targets <= 0` → **fails.** *"A check
  that expects nothing proves nothing."*
- the four target counts not all equal → **fails.**
- `canary.observed_failure !== true` → **fails.** A check that cannot see a
  defect handed to it on purpose is not trusted with the ones it found.
- `skipped_targets > 0` with no dated allowlist → **fails.**

**So a check that writes an honest receipt can already tell a pass from a
did-not-run, and does not need a new mechanism.** The gap is entirely in checks
that either write no receipt, or write one whose numbers cannot disagree.

---

## The silences, and the test that would break each

### A · Gates with no receipt at all — 7

Named in `CLAUDE.md`'s verification table, so sessions are told to run them,
and nothing grades the result. **None of the seven prints how many subjects it
examined**, so a run that examined everything and a run that examined nothing
end with the same summary line.

| script | what its silence looks like | the distinguishing test |
|---|---|---|
| ~~`sweep-booking-steps.mjs`~~ | **ROW CORRECTED 2026-09-20 — the claim was wrong, and the truth was worse. See below** | — |
| `accent-sweep.mjs` | `SWEEP CLEAN — dashboard, booking page and hue families` on `failures === 0` | count tokens/pairs compared; fail on zero |
| `e2e-booking.mjs` | exits 0 with no subject count | count the steps completed end to end; assert the booking exists afterwards. **STILL UNPROVEN, and the census mis-scoped it: it needs `SUPABASE_SERVICE_ROLE_KEY` and four other credentials, so it is NOT browser-only** |
| `render-emails.mjs` | exits 0 with no subject count | count templates rendered; fail below the known template count |
| `db-audit.mjs` | exits 0 with no subject count | count tables/migrations examined; fail on zero |
| `check-deployed.mjs` | exits 0 with no subject count | count functions compared; fail on zero. **DO NOT COPY `deployed-inventory.mjs` FOR THIS — corrected 2026-09-21 after running it. Its count and canary reach the RECEIPT and not the screen: it prints `PASS` and exits 0 having fetched nothing. See the section below.** |
| `i18n-survey.mjs` | **CLOSED — see below** | — |

**Two of these were misread by a grep first and corrected by reading.** A
`grep` for `process.exit(1)` reported `accent-sweep` and `sweep-booking-steps`
as never exiting non-zero. Both do — `process.exit(failures === 0 ? 0 : 1)` and
`process.exit(failing ? 1 : 0)`. They were wrong in the *other* direction than
expected, which is the reason the table above is written from reading the tails
rather than from the grep.

**That mistake now has its own entry**, because it happened twice more the same
day and is one lesson rather than three: `docs/gotchas.md` § *"A thing
assembled at the point of use cannot be found by searching for its written
form."* The exit code is COMPUTED, so `1` is never adjacent to
`process.exit(` — the same shape as the em dash that only existed after two
values met, and as `$?` reporting `tail`'s status instead of `node`'s.
**Before trusting any zero result from a search for a literal, ask whether the
string could be built rather than typed.**

**`sweep-booking-steps.mjs` — the row was wrong, and correcting it found a
bigger fault than the one alleged.** The census said it reports clean over
nothing. **It does not: it dies loudly.** Run on 2026-09-20 it crashed at step
4 of 7 with a 30-second Playwright timeout and a stack trace naming no step.

The script already had a guard for exactly that — print `STUCK`, name the step,
quote the page's own reason, break — written under a comment saying it replaced
a bug where the script *"used to click a disabled button and time out thirty
seconds later inside Playwright, with nothing in the output saying WHICH step
or what it wanted."* **The guard could never fire.** It asked
`!button.disabled`, and `BookingPage.jsx:920` renders Continue as
`aria-disabled={!canAdvance}` with **no `disabled` attribute** — deliberately,
since roadmap 2.6, so a press stays receivable and `Refusal.jsx` can explain
the refusal. `b.disabled` is `false` on a refusing button, so the predicate
returned true.

**The remediation was written against a spelling the product had already
moved off, so it never took — and nobody noticed, because a guard's silence
looks identical to a step that advanced.**

And the consequence was larger than legibility. The same wrong predicate
skipped the outer branch that fills the address field, so the step could never
become satisfiable — the check could not complete its walk at all:

```
before   4 step lines, 1 width, crash at step 4/7, anonymous stack trace
after    32 step lines, 4 widths, 70 findings across 23 distinct controls
```

**So the honest correction is: the row named the wrong symptom, and the real
fault was that this gate had not measured its own subject for some time.** The
original point still holds one level down — a guard that cannot fire is a
silence — but it was not where the census said it was.

**Its first honest output is triaged in
`docs/booking-steps-triage-2026-09-20.md`:** 70 findings, 23 distinct controls,
**all 23 the same calendar day grid — one underlying issue, not seventy.** The
check's own exemption text calls the 44px floor *"arithmetically impossible"*;
measured, 44px needs a 338px grid and the viewport is 392px, so it is
impossible only at the grid's current width. The product's own CSS comment
expects a 47px cell and the delivered cell is 36.4px.

**A GENERAL FAULT COUNT WEARING A SPECIFIC SENTENCE — 2026-09-20, and this is
the best one-line description of the whole class anybody has produced.**
Andrew's manager's words, on `sweep-booking-steps.mjs`. Its summary printed
`12 steps do not fit — W16 is not met`, and `failing` was incremented in **six**
places of which exactly **one** was the W16 step-fit case. The rest were a step
that would not advance, a second tenant that did not load, a missing
vehicle-count control, console errors, and the tap block — **and the tap block
prints AFTER the summary, so the sentence quoted a total containing things no
reader could see in the list above it.**

**It was specifically false rather than merely vague**, and that is why it
looked stable through a 315px layout change: **it was never measuring the thing
that moved.** Split and proved — the twelve were **8 W16 failures and 4
instances of one missing seed fixture**, 8 + 4 = 12, with all 48 step readings
byte-identical across the change.

**The test this adds to the file:** when a summary number and the list under it
disagree, the number is not rounding — **ask what else increments it**. A count
that can be fed from more than one place will be read as a count of the thing
its sentence names.

### B · Receipts whose numbers cannot disagree — 5

These write a receipt, but set `discovered`, `attempted` and `completed` to the
**same variable**, so `receipt.mjs`'s "the four counts must agree" rule can
never fire for them. Three go further and derive that variable from what the
run produced (`rows.length`), which is a gate following the data.

| script | `expected_targets` | note |
|---|---|---|
| `dashboard-notifies.mjs` | `rows.length` | follows the data |
| `restore-drill.mjs` | `rows.length` | follows the data |
| `tenant-matrix.mjs` | `rows.length` | follows the data |
| `deployed-inventory.mjs` | `dirs.length` | structural floor — much weaker fault |
| ~~`example-shots-check.mjs`~~ | `SITES.length` | **CLOSED 2026-09-20 — see below** |

**One of the five is closed, and the choice was constrained — recorded because
the reasoning matters more than the pick.** On cost alone the right target was
`tenant-matrix.mjs`: it is the check that proves one detailer cannot see
another's customers, so its silent failure is the worst in the repo. **It could
not be taken.** It needs a service-role key and it writes to the demo tenant,
and neither was authorised — and a change to the tenant-isolation check that
nobody has watched fail is precisely what this file refuses to accept from
anyone else. Four of the five need credentials. **`example-shots-check.mjs` was
the only one provable under the rules, and it is the lowest-cost of the five.**
That is an honest account of a compromise, not a claim that it was the best
available fix. **The highest-cost one remains open and remains unproven.**

What changed: `expected` stays `SITES.length`, a declared constant — the one
count that must never be derived from what the run found. The other three
became quantities the loop already knew: `discovered` (the manifest has a
record at all), `attempted` (the source file exists, so a fingerprint could be
taken), `completed` (it reached the comparison). **Nothing was invented to make
a rule fire**, which was the constraint: a site that is STALE still counts as
completed, because it was measured and found wrong, and that is the check
working.

```
clean                     expected 5 discovered 5 attempted 5 completed 5   PASS
--break=norecord          expected 5 discovered 4 attempted 4 completed 4   FAIL
                          receipt.mjs: "target counts disagree: expected 5,
                          discovered 4, attempted 4, completed 4"
--break=drift (existing)  counts 5/5/5/5, canary observed true             PASS
```

**The counterfactual is read, not run, and the distinction is worth keeping.**
Under the old code the same sabotage would have written `5, 5, 5, 5`: the four
fields were four copies of one constant, so they could not differ from each
other *by construction*. That is a property visible in the diff rather than
something a run would add information to — but it is still a claim from
reading, and it is labelled as one.

**The distinguishing test for the remaining four is the same:** derive `expected_targets`
from a declared constant or a structural fact, and count the other three for
real. Their canaries still protect them, which is why this is a list rather
than an emergency.

### C · Closed today — 1

`i18n-survey.mjs`. **Chosen because zero is its DESIRED answer**, which makes it
the worst of the set: a survey of *what is still English* that scans nothing
prints `0 candidate strings in 0 files` — the same sentence a finished job
prints. A broken walk, a moved `SRC` or an `--only` filter matching nothing all
produce it, and a session skimming reads it as good news.

The guard is on **files scanned, not on findings** — finding nothing is the
goal, scanning nothing is the fault, and conflating them was the bug. Below a
floor of 50 files it prints `SCANNED NOTHING` and exits 1.

```
clean    74 candidate strings in 10 files, from 108 file(s) scanned   exit 0
canary   I18N_SURVEY_CANARY=1 → SCANNED NOTHING, 0 walked            exit 1
```

### D · Also closed today, in the check that started this

`sweep-widths.mjs` now positively certifies the five customer-facing surfaces
under `LANG_APP=es` — each must be reached and hold more translated phrases
than English, or it is a finding, and "the catalogue recognised nothing" is a
finding rather than a silence. **Its proof is owed**: the one run so far was
tainted by a concurrent `app/src/lib/strings/appEs.js` edit, and the source
guard's verdict on that run is *"do not sign anything off"*. The canary
(`SWEEP_LANG_CANARY=1`) has not been run either.

---

## What was PROVED and what was READ

Applying the standard this census exists to enforce.

**Proved — run, and watched fail:**

- `i18n-survey.mjs` — both directions, exit 0 clean and exit 1 under the canary.
  *(The first attempt read `exit=0` for the canary because the command was
  piped to `tail` and `$?` was tail's — **the guard was working and the
  measurement of it was not.** Re-checked without the pipe: exit 1. Written up
  in `docs/gotchas.md` as the third instance of a value assembled at the point
  of use; never read `$?` through a pipe.)*
- `label-guard.mjs` — clean, canary, and against the real historical case.
- `receipt.mjs`'s skip rule — three probes built from a real receipt.
- `example-shots-check.mjs` — clean, the new `--break=norecord` counter canary,
  and the existing `--break=drift` canary re-run to confirm the change did not
  disturb it. Receipt restored clean afterwards.
- `sweep-widths.mjs`'s Spanish certification — **added since this file was
  written, and proved.** All five customer-facing surfaces certify SPANISH on a
  clean run, and under `SWEEP_LANG_CANARY=1` the forgotten surface reports
  `NOT CERTIFIED` while the other four still certify. That second half is the
  one that matters: it shows the guard distinguishes *not reached* from *not
  Spanish*, which is exactly the distinction the twelve silences below cannot
  make. **What it asserts is that the screen rendered the catalogue's Spanish
  rather than English — not that the catalogue is right.** `"Light"` maps to
  `"Claro"` because a theme toggle reached that key before the soiling scale
  did, so a surface can certify on a word that means something else entirely.
  The run now names a certification that leaned on a known-ambiguous key; that
  is a filter, not coverage.

**Three readings of a moment that had not finished happening** — the stale
console buffer, `$?` reporting `tail`'s status instead of `node`'s, and a
browser-pane read taken mid-reload that returned `innerWidth: 0`. Three of one
shape in one night is a rule, and it has its own entry in `docs/gotchas.md`:
*an instrument will answer a question about a moment that has not finished
happening.* **The zero was caught only because zero is obviously wrong; a
viewport of 380 instead of 392 would have been believed.**

**Read, not run — the classification is from source, and could be wrong:**

- All seven in group A. Their tails were read; none was executed. `e2e-booking`,
  `render-emails`, `db-audit` and `check-deployed` need credentials or a
  browser and were not run under the hold this census was written during.
- All five in group B. The counts were read at the `writeReceipt` call site.
- Group D's certification result.

**A check nobody has watched fail is a check nobody has verified.** Six of the
twelve silences named here are unverified claims about unverified checks, and
that is the honest state of this file on the day it was written.

---


## `deployed-inventory.mjs` WAS RUN FOR THE FIRST TIME, AND IT PRINTS A PASS HAVING FETCHED NOTHING — 2026-09-21

**It had never been executed in its life.** CLAUDE.md puts it in the
before-you-finish list, ROADMAP 0.6 is built on it, and it gates a publishing
order Andrew has not authorised. Run, then broken on purpose four ways.

**IT READS. Nothing was deployed, nothing was written to the database.** The
project reached was `kguqylyzgyzfktkfnhjb` — this platform's own, not the
presumed-real-business ref.

### What it counted, on a real run

| | |
|---|---|
| functions in the repo | **39** |
| deployed on the project | **39** |
| bundles fetched and compared | **39** (`assertions_executed`, floor 30) |
| running this checkout | **15** |
| **NOT running this checkout** | **24** |
| widest gap | **7.8 days** |
| verdict | `fail`, exit 1, all 24 named |

**24, not ROADMAP 0.6's 22** — two more have drifted since it was written. The
24: `accept-quote`, `calculate-booking`, `cancel-booking`, `connect-account`,
`create-booking`, `create-business`, `forecast`, `get-booking-receipt`,
`invite-user`, `pay-booking`, `plan-link`, `platform-admin`,
`platform-billing`, `preview-emails`, `report-problem`, `reschedule-booking`,
`respond-to-booking`, `send-campaign`, `send-invoice`, `send-owner-reminders`,
`stripe-webhook`, `update-booking`, `validate-promo-code`, `watch-jobs`.

### The four breaks

| what was broken | what it did | verdict |
|---|---|---|
| `--only=` a function that does not exist | `0 function(s) in the repo` → **`PASS — every function is running this checkout's source`, exit 0** | **NOT CAUGHT on screen** |
| a repo function never deployed | printed `NOT DEPLOYED`, then **`PASS`**, exit 0 | **NOT CAUGHT on screen** |
| one comment line altered | `DIFFERS`, `1 of 49 comment lines`, named the exact line, exit 1 | **caught** |
| sanitiser deleted + `slice(0,64)`→`slice(0,8)`, no comment touched | **`matches — running copy contains this checkout's source`**, exit 0 | **not caught, and documented** |

### The finding, and it is the shape this file exists to name

**The defence exists and it works — in the file nobody reads.** On the
fetched-nothing run the receipt said `status: fail`, the canary said
`NOT CAUGHT — no bundle was readable, so this run proves nothing about any
function`, and `receipt.mjs` said *"only 0 assertions ran against a declared
minimum of 30"*. **Meanwhile stdout said `PASS` and the exit code was `0`.**

The cause is one line. The verdict and the exit are computed from
`failures.length` alone; the canary reaches `status` in the receipt and nothing
else:

- `failures` is built only from `DIFFERS`. `NOT DEPLOYED`, `UNREADABLE` and
  `UNJUDGEABLE` become `warnings`, which change no verdict and no exit code.
- So **zero subjects and zero fetches is indistinguishable from a clean
  estate** to anyone reading the terminal, which is the one way the script's
  own header says it could lie.

**`--only=<typo>` reaches this in one keystroke**, and `--only=` is the flag a
session uses to ask the only question it has: *is the one I just edited in the
list?*

### Two claims already in this file that this corrects

- **Line 93 said `deployed-inventory.mjs` "already does this properly — copy
  it"**, as the fix for `check-deployed.mjs`. It does it properly in the
  receipt and not on screen, so copying it would copy the hole. Marked there.
- It sits in **§ B, receipts whose numbers cannot disagree**, as
  `dirs.length` / "structural floor — much weaker fault". **Confirmed by
  running:** `expected`, `discovered`, `attempted` and `completed` were all
  `39`, and on the empty run all four were `0` — four counts, one variable,
  agreeing about nothing.

### And the mitigation the header promises is not printed

The header concedes the comment blind spot and answers it: *"The git column
beside it is what covers that gap, and the two are printed together on purpose
so neither is read alone."* **For a `matches` verdict there is no git column.**
`behind` is computed for every function and appended to the output only in the
`DIFFERS` branch; the receipt carries `widest_gap_days` for differing functions
only. Measured against the real run: **4 of the 15 `matches` functions have a
commit newer than their running deploy** — `booking-ics`, `resend-webhook` and
`send-email` at **3.1 days**, `refresh-weather` marginal. Nothing in stdout or
the receipt says so.

### Proved, not read

All four breaks were executed against the live Management API and the tree was
restored and re-verified afterwards (full re-run: 15 / 24 again, identical).
**One measurement of mine was wrong first and this file already held the
reason:** the comment-break run reported `EXIT=0` because the command was piped
to `grep` and `$?` was grep's. Re-run without the pipe: exit 1. That is the
same trap recorded above for `i18n-survey.mjs` — **never read `$?` through a
pipe** — hit again, three entries later.

**Nothing was deployed to make anything green. The 24 stand.**

## THE SILENCE NO CHECK IN THIS FILE CAN COVER — added 2026-09-20

**A figure inherited from an instrument whose definition moved is stale in a way
no check can catch, because the number is still arithmetically correct.**

Everything else censused here is a check that might not have run. This is the
opposite: the check ran, printed a true number, and the number was written down
— and then the thing it measured changed underneath the words, so the figure
stayed correct and stopped meaning what it says.

The worked example is `fits, Npx spare` from `scripts/sweep-booking-steps.mjs`.
On 2026-09-20 at 02:34:23, `52a3d70` gave `.bk-wrap` `flex: 1 0 auto` inside a
`min-height: 100dvh` column, so the column stretches to fill the screen and the
figure became a cap — about 54 to 77px — rather than headroom. A step needing
435px, whose column stretched to 748px, reads as 73px spare at viewport heights
900, 1200 and 740 alike. **No receipt,
no gate, no canary and no expected-count file can see this**: the run is clean,
the arithmetic is right, and the only evidence is that two very different screens
print the same number.

`docs/spare-figures-2026-09-20.md` classifies all 64 written figures against
that boundary. The reason it was catchable at all is that somebody read the
thing that produced the number instead of the number.
