# Why a one-screen session took an hour, and what was done about it

*Written 2026-09-02, at the end of roadmap 2.11 step 6 stage 5, because the
owner asked: "I feel like it's taking an unnecessary amount of time to complete
tasks like this… every single time we're just doing a singular page following
instructions that were already made, and it's taking over an hour. I want you
to devise a plan to speed it up by almost two times without losing a big chunk
of design."*

**This file is the answer and the receipts.** The measurements were taken on
this machine, on this session's own work.

---

## 1. Where the hour actually went

Not thinking, and not writing code. **Waiting.**

`scripts/sweep-widths.mjs` — the layout check every visual change has to
pass — contained **35 hardcoded `waitForTimeout` calls**, 400ms to 3200ms
each, and ran them at **five widths**. Then the whole thing again through
`?lite=1`. Measured before any change:

```
sweep-widths.mjs                463 seconds
sweep-widths.mjs --lite         463 seconds
```

**Roughly 440 of those 463 seconds were literal sleeping** — the script's own
timing instrumentation reported 439.3s of fixed sleep per run. Most of it was
waiting 1.7 seconds for a screen that had finished painting in 250ms.

`scripts/shoot-dashboard.mjs` had the same shape: 9 fixed sleeps summing to
13.6s per width, four widths, and it was invoked **eight times** in this
session (before, after, three re-shoots, four tenant accents, one restore).

**And every script signed in from scratch at every width.** The same account,
the same form, five times per run, per script.

**The honest second half:** some of the repetition was real work — I re-shot
Money three times because I was still deciding the layout. But some was
avoidable, and section 4 is about that.

---

## 2. What was changed

### 2a. `settle()` replaces every fixed sleep — the big one

A sleep says *"two seconds is probably enough"*. `settle()` asks the page
whether it is finished, and takes **the old number as a CAP rather than as a
value**, so nothing can get slower than it was.

It ends when all three are true:

1. **no DOM mutation for 130ms** — React has finished committing;
2. **no FINITE animation still running.** Infinite ones are excluded on
   purpose: `.app-shell::before` drifts for 54 seconds forever and the page is
   not "loading" while it does. Finite ones matter because the arrival stagger
   translates a child **14px down for up to 580ms**, and the parent-box check
   would read that as an element outside its own box;
3. **no `.spinner` in the DOM** — a screen still fetching is quiet in both
   senses above, and is exactly what must never be measured.

**THIS IS THE PART THAT MATTERS AND IT IS WHY THE GUARDS ARE THERE.** This
repo's worst failure mode is at the top of `DECISIONS.md`: *a skipped check
reads exactly like a passing one.* A faster check that measures the page
before it has settled is not faster — it is broken, and it looks green.

**Baselined against a deliberate defect, the way this repo requires.** A
900px `min-width` was added to the client row's name cell, and the sped-up
sweep reported **96 problems** — `past-viewport +528px` and `past-parent
+548px` on every row — then reported clean again when it was removed.

Applied to `sweep-widths.mjs`, `shoot-dashboard.mjs` and
`sweep-booking-steps.mjs`. **The booking sweep's spare-room figures are
unchanged after the change** (step 4 still 52px spare at 392), which is the
other half of the proof: the numbers it reports did not move.

### 2b. One sign-in, not five

The first width still signs in **through the real form**, so the sign-in path
is exercised every run. The session is then carried to the other widths with
Playwright's `storageState`.

### 2c. `--only <substring>`

`node scripts/sweep-widths.mjs 392 --only Clients` measures just the screens
whose label contains the word, at one width.

**FOR ITERATING, NEVER FOR SIGNING OFF.** The full run is the check. This is
the difference between a 38-second answer and an eight-minute one *while you
are still changing things*.

---

## 3. Measured after

| | Before | After |
|---|---|---|
| `sweep-widths.mjs`, all five widths | **463s** | **178s** |
| Of which was waiting | 439.3s | **155.8s** |
| `shoot-dashboard.mjs --tab clients,money`, four widths | ~75s | **17s** |
| `sweep-booking-steps.mjs`, four sizes | ~120s | **50s** |
| One screen while iterating (`392 --only Clients`) | not possible | **38s** |

**2.6× on the check that runs most often, with nothing removed and the
defect-detection proven.**

---

## 4. The behavioural half, which is worth more than the code

The scripts were slow. **The way they were being used was slower.** These are
rules for the next session, not observations.

1. **Iterate with `--only` and ONE width; run the full sweep ONCE, at the
   end.** This session ran the full 463-second sweep after intermediate
   changes. 1440 and 392 catch nearly everything; 1920, 360 and 320 are edge
   widths and belong in the final run.
2. **`--lite` is a final-run flag.** It is a second full sweep for a path that
   only differs in whether animations play. Once, at the end.
3. **Screenshot the ONE width that answers the question.** A four-width
   full-page shoot to check whether a button moved is three wasted widths.
4. **Do not re-shoot the tenant accents visually more than once.**
   `accent-sweep.mjs` proves the colour maths credential-free in under a
   second. Four `--accent` runs through the real settings UI proved something
   the maths had already proved; one visual confirmation is enough.
5. **Measure BEFORE choosing, not after.** The period control was rebuilt,
   looked at, and only then measured — at which point the answer turned out to
   be 2px of padding. Measuring the text width first would have skipped one
   whole build-and-look cycle. **When a layout question has a number in it,
   get the number first.**
6. **Run long checks in the background and write documentation while they
   run.** The 463-second baseline in this file was captured that way; the
   docs for stage 5 were written during it, at no cost.

---

## 5. What was deliberately NOT cut

Cutting these would be trading the outcome for the clock, which is not what
was asked for.

- **The five widths in the final run.** 320 is in `PRODUCT.md`'s promise and
  1920 is the owner's own monitor. Both have caught real defects.
- **The parent-box and dead-width checks.** Both exist because a clean run
  used to mean less than it looked like.
- **Looking at the screen.** *"An agent that has not looked at the page has
  not finished the task, regardless of what it says"* —
  `docs/design-knowledge.md` §2. What changed is how many times, not whether.
- **The written record.** The reason a cold session can pick this product up
  is that every decision is in a file. That is not overhead; it is the
  migration plan (`CLAUDE.md`, "Write for a coding agent that is not Claude").

---

## The number moved again the same day, and upward — roadmap 2.11 step 6 stage 7

**Measured 2026-09-02, after first run shipped**, against the 178s this file
records for the whole run:

| run | `--timing` says it waited | wall |
|---|---|---|
| 392 only, normal | 46.6s | **82s** |
| all five widths, normal | **218.0s** | inside ten minutes |
| all five widths, `--lite` | **93.5s** | inside ten minutes |

The caps are not what costs — the per-screen DOM walk is, and the walk now
runs on **54 states rather than 40**.

**The fourteen are the setup form's seven steps and the walkthrough's seven,
and the trade was taken deliberately.** Neither of those screens is reachable
by clicking a tab — the form is behind a row that only exists while setup is
unfinished, and the tour is behind a row in the gear — so this script is the
only thing in the repo that opens either. The alternative was the failure this
file's own siblings keep naming: *a screen nothing enters reports exactly like
a screen that was entered and found clean.*

**What that changes about how to run it, which is this file's whole point:**
nothing, except that the once-at-the-end run is now seven minutes rather than
three. Iterating at one width is 82s and `--only` is still seconds. **The rule
was already "iterate narrow, run the full sweep once"** — it just matters more
than it did this morning.

**AND ONE STALL THAT WAS THE SCRIPT'S, worth the paragraph because it looked
exactly like slowness.** Walking the setup form ends on its last step, where
the form closes ITSELF — and the walk then did `count()` on its close button
and clicked it. That is a race against the 180ms the form spends leaving:
count says one, the element unmounts, and the click waits for something that
is never coming back. A whole `?lite=1` run sat at width 1 for ten minutes
looking like a slow machine. **It waits for the form to detach now**, and
`page.setDefaultTimeout(15000)` is set on every page in the script so that
nothing can ever stall for thirty seconds again: *a run that has gone wrong
must not look like a run that is being thorough.*

**And a cost that is NOT the script's**: two runs were wrecked and a third
crawled because crashed runs leave `chrome-headless-shell.exe` orphaned, and
three of them contending for one dev server made a 3-minute pass take ten. If
a sweep is inexplicably slow, count the browsers before blaming the code.
