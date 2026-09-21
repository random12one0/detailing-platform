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
| `sweep-booking-steps.mjs` | `every control reaches the floor` when `tapFindings` is empty — **including when it visited zero controls** | count controls probed; fail under a floor |
| `accent-sweep.mjs` | `SWEEP CLEAN — dashboard, booking page and hue families` on `failures === 0` | count tokens/pairs compared; fail on zero |
| `e2e-booking.mjs` | exits 0 with no subject count | count the steps completed end to end; assert the booking exists afterwards |
| `render-emails.mjs` | exits 0 with no subject count | count templates rendered; fail below the known template count |
| `db-audit.mjs` | exits 0 with no subject count | count tables/migrations examined; fail on zero |
| `check-deployed.mjs` | exits 0 with no subject count | count functions compared; fail on zero (`deployed-inventory.mjs` already does this properly — copy it) |
| `i18n-survey.mjs` | **CLOSED — see below** | — |

**Two of these were misread by a grep first and corrected by reading.** A
`grep` for `process.exit(1)` reported `accent-sweep` and `sweep-booking-steps`
as never exiting non-zero. Both do — `process.exit(failures === 0 ? 0 : 1)` and
`process.exit(failing ? 1 : 0)`. They were wrong in the *other* direction than
expected, which is the reason the table above is written from reading the tails
rather than from the grep.

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
| `example-shots-check.mjs` | `SITES.length` | structural floor — much weaker fault |

**The distinguishing test for all five is the same:** derive `expected_targets`
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
  piped to `tail` and `$?` was tail's. Re-checked without the pipe.)*
- `label-guard.mjs` — clean, canary, and against the real historical case.
- `receipt.mjs`'s skip rule — three probes built from a real receipt.

**Read, not run — the classification is from source, and could be wrong:**

- All seven in group A. Their tails were read; none was executed. `e2e-booking`,
  `render-emails`, `db-audit` and `check-deployed` need credentials or a
  browser and were not run under the hold this census was written during.
- All five in group B. The counts were read at the `writeReceipt` call site.
- Group D's certification result.

**A check nobody has watched fail is a check nobody has verified.** Six of the
twelve silences named here are unverified claims about unverified checks, and
that is the honest state of this file on the day it was written.
