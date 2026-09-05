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


---

## The owner asked again during roadmap 2.12: where the time ACTUALLY goes, and the plan to halve it

**Asked 2026-09-02, mid-session, on an item whose code was written in well under
an hour.** §4 of this file already had the right rules. **This session broke
four of the six.** So the honest finding is not "we need better rules" — it is
that the rules were not followed, plus two costs this file had never named.

### Counted, not estimated — the 2.12 session's own runs

| what | times run | each | total waiting |
|---|---|---|---|
| `sweep-widths.mjs` all five widths | 2 | 218s | ~7m |
| `sweep-widths.mjs --lite` all five | 1 | 94s | ~1.5m |
| `sweep-widths.mjs 392` (all 56 screens) | 4 | 82s | ~5.5m |
| the env-backed test list (8 suites) | 2 | ~3m | ~6m |
| `deploy-functions.mjs` | 5 | ~30s | ~2.5m |
| `shoot-dashboard.mjs` | 2 | ~90s | ~3m |
| `seed-demo.mjs` | 3 | ~30s | ~1.5m |
| one-off browser scripts, incl. two that failed on selectors first | 5 | — | ~6m |

**About 33 minutes of waiting, and all but the last two minutes of it blocked.**
Writing the documentation — the DECISIONS section, the PROJECT-STATE section,
CLAUDE.md, the roadmap, two design files — is another large block of the
session and it uses **no I/O at all**.

**That is the whole finding. The two halves of the session do not contend for
anything, and they were run one after the other.**

### The plan, in order of what it is worth

1. **Start the long check, then write, then read the result.** Not run → wait →
   write. §4 rule 6 already says this and this session backgrounded exactly one
   command, at the very end. Every full sweep and every env-test run overlapped
   with the writing that was going to happen anyway takes **~20 of the 33
   minutes to zero.** This is worth more than every other line below put
   together, and it costs nothing.
2. **The full sweep once. The `--lite` sweep once. The env test list once.**
   This session ran the five-width sweep twice, the 56-screen 392 run four
   times, and the env list twice. **Iterating means `--only <Screen>`, which is
   seconds** — not the whole 56-screen walk at one width, which is 82s and was
   being used as if it were the cheap option. `--only` was used once all
   session. **~9 minutes.**
3. **Write all the server code, then deploy once.** Five deploys happened
   because the edge functions were edited in five passes. **~2 minutes**, and
   it also removes five chances to test against a half-deployed backend.
4. **Screenshot one width. Re-seed at the end.** §4 rule 3, and the seed only
   has to be restored once, after whatever destroyed it. **~3 minutes.**

### And two costs this file had not named

- **Throwaway browser scripts get written from scratch every session, and they
  fail on selectors before they work.** Three were written here; two failed
  first. That is roughly six minutes spent debugging scaffolding rather than
  the product, and it happens every time because nothing in `scripts/` does
  "log in as the demo owner, get to state X, screenshot it". **Proposed, not
  built here because it is not roadmap 2.12:** a ~40-line `scripts/peek.mjs`
  that signs in, takes a selector or a tab name, and saves one PNG at one
  width. Every session that has needed it has rebuilt it.
- **The documentation is RECONSTRUCTED at the end.** The DECISIONS section for
  this item had to recall findings from hours earlier — which is slow, and is
  also how a finding gets lost. **Append each finding to a scratch notes file
  at the moment it happens**; the write-up at the end becomes editing rather
  than remembering.

### One structural cost that needs the owner, because it is his file

**`CLAUDE.md` is 35KB and the first instruction in it is to read all of it.**
That is the cold start of every session, before a line of the actual task is
read, and it has grown by accretion — several rules are now stated two and three
times in different sections. **He has already made this exact call once**, on
the feature inventory: *anything he has to read needs a top layer he can
actually read.* The same argument applies to the agent that has to read it every
time. A one-page "the twelve rules that will bite you" at the top, with the
current text kept below as the detail, would cut the cold start without losing
anything. **Not done unilaterally: it is the file that governs the work, and
editing it to be shorter is exactly the kind of change that should not be made
by the thing trying to go faster.**

### What is still NOT on the table

§5 stands unchanged. The five widths in the final run, the parent-box and
dead-width checks, looking at the screen, and the written record are not what
made this session long — **running them repeatedly, in series, was.**


---

## He pushed back the same day: "an hour thirty-three, so an hour was coding" — and the sweep was cut 39%

**2026-09-03.** The section above was right about the 33 minutes of waiting and
he accepted it, then made the harder point: *"the progress took an hour and
thirty-three minutes, so that means there's an hour spent on coding. I feel
like this is going unnecessarily long, and we need to find some actual ways to
make it shorter, like removing some components of something that we're
doing."* His own suggestion: **fewer full-width passes, and all 56 screens at
only one or two widths rather than five.**

### The numbers, finally measured per width

`sweep-widths.mjs` now prints its own wall clock on **every** run, not only
under `--timing` — a script that is the biggest single block of a session
should say what it spent, and until this day nobody had the number:

| width | deep (all 56 states) | core only |
|---|---|---|
| 1920 | 63–66s | — |
| 392 | 69s | 25s |
| 320 | 68s | — |
| 1440 | — | 22s |
| 360 | — | 25s |

**A deep width is ~67s and a core-only one ~24s, so the long tail is ~43s per
width.** Five deep widths is **335s**. The tiered default is **203s** —
**39% off**, measured rather than estimated, with `--all` restoring the old
walk.

### What the tiering actually is

**Every width still walks the core**: the booking page, the five tabs, the job
record in three states, the request card, the quote sheet, the calendar's day
and history, Money's three periods and its two modals, and Clients' six.

**The long tail runs at 320 and 1920 only** — the twelve settings screens, the
gear, the setup form's seven steps and the walkthrough's seven. That is 28 of
the 56 states, and they are not 28 independent screens: they are **three shared
containers** (`SettingsHost`, `SetupForm`, `Walkthrough`) rendering different
content.

**The bet, stated so it can be checked rather than trusted:** a width-specific
defect in the long tail shows at an extreme. The evidence is this repo's own
history — every width-specific defect in DECISIONS.md was found at 320, 360 or
1920, and the two that were found at 360 (roadmap 2.9, 19px and 11px outside
their card) were also visible at 320. **Where the bet loses is a change to what
those containers SHARE**, which is why `--all` is not optional after touching
`theme.css`, `SettingsHost`, `Sheet` or `controls.jsx`.

### The other half of his hour, honestly

**Cutting the sweep does not get an hour back, and it would be dishonest to
imply it.** The 2.12 session's hour of non-waiting was: reading the task and
the twelve files it touched, writing the migration and two edge functions,
eight front-end files, a 51-check test suite, and roughly 400 lines of
documentation across six files — DECISIONS, PROJECT-STATE, the roadmap, two
design files and CLAUDE.md.

**Three of those are genuinely cuttable and one is not.**

1. **The documentation is not.** It is the reason a cold session can pick this
   product up, and it is the migration plan (CLAUDE.md, "Write for a coding
   agent that is not Claude"). What IS cuttable is writing it TWICE — once as
   notes and once at the end. Append as you go.
2. **Throwaway browser scripts.** Three written in the 2.12 session, two failed
   on selectors first, and the same thing happened again on 2026-09-03. Still
   proposed, still not built: a ~40-line `scripts/peek.mjs`.
3. **Re-deriving what a file already says.** The 2.12 session read
   `emailTemplates.ts` three separate times because the first two reads were
   for different questions. Read a file once, for everything you will need.
4. **Fixing things found on the way.** The 2.12 session found and fixed a
   clock-dependent test and eleven sub-floor email headlines. Neither was in
   scope; both were real. **This is the one to bring to him rather than
   decide** — the alternative is filing them and moving on, which is faster per
   session and slower per product.
## Roadmap 2.20, and the fourth time he has asked: 90 minutes, 68 of them waiting

> *"all of that took an hour and a half to do"* — 2026-09-05, after roadmap
> 2.20 stage 1.

**THE CODE-SIDE WORK IS DONE AND IT IS WORKING. EVERY MINUTE BELOW WAS LOST TO
BEHAVIOUR.** That is the whole finding, and it is § 4 of this document being
proved right rather than a new problem. Verified before writing this rather
than assumed: `sweep-widths.mjs` has **77 `settle()` call sites and ZERO real
fixed sleeps** — its one `waitForTimeout` hit is inside the comment that
describes the old behaviour. A deep width costs 76–81s and a core-only one
26–30s, which is the same figure this document recorded on 2026-09-03. **The
scripts did not get slower. The session did.**

### Where the 90 minutes went, from the logs rather than from memory

Session ran 22:40 → 00:10, two commits (23:28 and 00:02).

| | Runs | Wall |
|---|---|---|
| Full five-width sweep (245s, 241s, 244s) | **3** | 12 min |
| The same through `?lite=1` (133s, 131s, 144s) | **3** | 7 min |
| `e2e-booking.mjs` | **3 + 1 partial** | 12 min |
| `shoot-dashboard.mjs` | **4** | 10 min |
| The 8 credentialed suites ×2, the 12 free ones ×4 | 6 | 14 min |
| `--only` iteration (82s, 74s, 80s, 46s), deploys ×3, seeds ×2, builds ×3 | — | 13 min |
| **Waiting** | | **~68 min** |
| **Everything else — reading, deciding, writing code and prose** | | **~22 min** |

**Roughly 35–40 of those 68 minutes bought nothing.**

### The three causes, biggest first

**1. ONE ROADMAP ITEM WAS VERIFIED TWICE BECAUSE ITS SCOPE WAS SETTLED LATE
(~20 min).** 2.20 stage 1's roadmap entry carries a bullet list, and the last
bullet — *"build one small thing beside it: make a rejected send visible"* — was
read as a follow-up rather than as part of the item. The headline half was
built, verified with a complete battery, and committed; the second half was
then built and needed **the entire battery again.**
**The rule this produces, and it is cheap: settle the item's FULL scope from
the roadmap's own bullets before writing a line, and write it down.** An item
whose scope grows after the first green run costs a second green run, and the
battery is the most expensive thing in a session.

**2. THE FULL SWEEP WAS RUN THREE TIMES, AGAINST THIS DOCUMENT'S OWN RULE
(~13 min).** CLAUDE.md says it in as many words — *the full run is a
once-per-item cost, not a per-change one* — and it was used as a per-change
check. `--only <Screen>` at one width answers the same question in 40–80s and
was used correctly four times; the mistake was reaching for the full run
between changes instead of only after the last one.

**3. AN EDIT TO `app/src` LANDED WHILE `e2e-booking.mjs` WAS RUNNING (~8 min).**
The trap this repo already documents, paid for rather than read. It killed the
run, and proving it was the harness rather than a real defect cost a
single-tenant control run and a full re-run. Its symptom is now recorded in
CLAUDE.md, because `e2e-booking` does **not** print *"Execution context was
destroyed"* the way the sweep does — it prints a null receipt link and five
failures that read like a broken booking engine.

### What a 90-minute session should have been

Same work, same findings, same commits:

| | |
|---|---|
| Read the item and settle its full scope | 8 min |
| Write all of it — schema, engine, emails, screen, tests | 20 min |
| Iterate with `--only` at one width | 5 min |
| **The full battery, ONCE, after the last line of code** | 12 min |
| Docs and commit, written WHILE the battery ran | 0 min |
| | **~45–50 min** |

### What was built instead of a fourth paragraph

**He asked whether the mistake would happen again, and the honest answer was
no — because two of the three mistakes above were ALREADY written in CLAUDE.md
before the session started.** Adding a fourth warning to a 1,200-line file, as
the fix for a problem two existing warnings had failed to prevent, deserves
scepticism rather than a promise.

So `scripts/source-guard.mjs` exists. All four browser scripts note the time
before the browser opens and, at the end, name any file under `app/src` saved
since. **It does not prevent the mistake; it deletes the cost of diagnosing
it** — the eight minutes above become one line of output, and it works for any
future session including one driven by a different agent.

**BASELINING IT IMMEDIATELY FOUND A FLAW IN ITS OWN DESIGN, which is the part
worth keeping.** The first version reported only on a failure — "a clean run
needs no excuse". A real baseline run, with an edit dropped in at 25 seconds,
proved that exactly wrong: **the page reloaded and the run still finished with
zero geometry problems and printed `clean`**, so the guard was silent on
precisely the run whose result was worthless.

**A mid-run reload does not reliably FAIL a run.** Every check that sweep owns
asks whether something is off an edge, and a screen that never opened has no
edges to be off. So the damage is not a red run — it is a green one that
measured less than it claims. The guard reports unconditionally now and says in
as many words that a clean result from such a run must not be signed off.

*Which is the same finding this repo has recorded a dozen times, arriving
inside the tool built to catch it: a skipped check reads exactly like a passing
one.*

**AND THE WRITE-UP OF THIS ITSELF HAD TO BE CORRECTED, WHICH IS WORTH ONE
LINE.** The first draft of the paragraph above claimed the baseline run visibly
lost two states to the reload, citing `job record · tomorrow` → *"no tomorrow
to open (is the demo seeded?)"*. **It did not.** Those lines appear in an
unedited run at the same hour and are the demo's own trading day — checked
after the fact, at 00:20, against a clean run. The argument for reporting
unconditionally never needed them. **Reading damage into an ordinary line is
the same mistake as reading a defect into a reloaded run**, one level up, and
it was made while writing the tool built to prevent it.

### The rule that keeps not sticking, stated as a checklist

1. **Scope the whole item before writing anything.** From the roadmap's bullets,
   not from the headline.
2. **Iterate with `--only <Screen>` at ONE width.** Never the full sweep.
3. **Run the full battery once, after the last code change.** Background it.
4. **While it runs, write PROSE only** — DECISIONS, PROJECT-STATE, the roadmap.
   An edit under `app/src` reloads the page and kills the run.
5. **Only then commit.**

**This is the fourth time he has asked, and each previous answer made the CODE
faster.** 463s → 335s → 203s per sweep, and 35 fixed sleeps down to none. The
code is now a small part of the problem: at 26–30s a core width, running the
suite one extra time costs more than every optimisation in this document
returns. **The remaining wins are all in the order operations are done in, not
in the scripts.**
