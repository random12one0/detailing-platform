# THE TWELVE THAT NEEDED A BROWSER — blind-tested at last, 2026-09-13

**`docs/check-coverage-gaps-2026-09-13.md` § 2 names twelve scripts as the last
unknown in the audit: untested by the audit AND untestable by `blind-run`,
because that instrument runs `tests/` only and these need a dev server that lane
B owns.** This closes it. Lane C, at `873d7a1`.

---

## THE ANSWER, IN ONE LINE

**Three of the twelve could not fail.** `sweep-widths` printed the word `clean`
five times over a page with nothing on it; `admin-contrast` printed *"clear of
the floor"* while sampling **zero pixels — against the real product, not the
blind one**; and `snapshot-page` wrote a 0 KB file and exited 0. A fourth,
`sweep-booking-steps`, failed loudly on a page that was perfect and **silently
stopped measuring everything below it**. All four are fixed and baselined both
ways.

**AND THE FIX FOR THE FIRST FOUND A FIFTH BLINDNESS ON THE LIVE PRODUCT WITHIN A
MINUTE OF LANDING.** `sweep-widths` has been measuring the booking page's
SPINNER as `book · step 1`, at every width, on every run this repo has ever
done — and printing `clean` over it. One missing class in `settle()`; § 4.

---

## 1 · HOW IT WAS DONE, AND WHY THE BLOCKER WAS NOT ONE

**The gap was never "we have no instrument". It was "lane B owns port 5173".**
That is a resource, and a resource can be duplicated.

```bash
git worktree add --detach <tmp>/wt HEAD          # a clean committed tree
mklink /J <tmp>/wt/app/node_modules  app/node_modules
npx vite build                                    # with app/.env.local in the env
npx vite preview --port 4173 --strictPort --host 127.0.0.1
```

Then the same again into `<tmp>/wtb`, with **every file under `app/src` and
`app/public` truncated to zero bytes** — `blind-run.mjs`'s own blanking, applied
to the build instead of to `tests/` — rebuilt, and served on **4174**.

The result is two servers running side by side: **4173 is the product, 4174 is
the same product with nothing in it.** A check that is green on both is green
over nothing.

**THE SUBJECT IS BETTER THAN A DEV SERVER, NOT MERELY AVAILABLE.** Trap (g) says
the dev server is not evidence and the bundle is; the blind bundle is 0.71 kB of
JavaScript and no stylesheet at all, against 1,190 kB and 161 kB for the real
one. And trap (f) — a measurement taken while somebody is building is worth
nothing — **stops applying entirely**, because a worktree at a commit cannot be
edited by lane B. Lane B committed twice and saved four files during this
session and not one run was disturbed.

**TWELVE OF THE THIRTEEN SCRIPTS THAT DRIVE A BROWSER TOOK `BASE` WITHOUT
COMPLAINT.** Four already read `process.env.BASE`; eight hard-coded
`http://localhost:5173`. That is one line each, with the same default, so
nothing changes for anybody running them the old way.

---

## 2 · THE SCORE

| script | blind | verdict |
|---|---|---|
| `sweep-widths.mjs` | **5 × `clean`** | **BLIND — fixed** |
| `admin-contrast.mjs` | crash | **BLIND ON THE REAL PRODUCT — rebuilt** |
| `snapshot-page.mjs` | **0 KB, exit 0** | **BLIND — fixed** |
| `sweep-booking-steps.mjs` | exit 1 | not blind, but **lost every subject below a stale selector — fixed** |
| `e2e-booking.mjs` | exit 1, `0 passed, 0 failed — then the run threw` | can fail |
| `two-detailers.mjs` | exit 1 | can fail |
| `spanish-dom.mjs` | exit 1 | can fail |
| `final-pass.mjs` | exit 1 | can fail |
| `shoot-dashboard.mjs` | exit 1 | can fail |
| `shoot-admin.mjs` | exit 1 | can fail |
| `shoot-manage.mjs` | exit 1 | can fail |
| `overlap-probe.mjs` | — | a library; see § 7 |

**AND THE HONEST CAVEAT ABOUT THE EIGHT THAT PASSED: SEVEN OF THEM WERE SAVED BY
THE SIGN-IN FORM.** A blank page has no `input[type=email]`, so anything that
signs in throws at its first `waitForSelector` and exits 1. **That is an
accident, not a design.** It proves the script cannot be green over a page that
renders nothing; it proves nothing about whether it would be green over a page
that renders the WRONG thing — which is the `pushState` failure and is not what
this instrument measures. The three that were caught are precisely the three
that reach a public page before any sign-in.

---

## 3 · `admin-contrast.mjs` — THE WORST OF THE THREE, AND IT WAS BLIND AGAINST THE LIVE PRODUCT

**It was not the blind bundle that caught this one. It was the FIRST BASELINE
RUN, against the real back office, which printed:**

```
worst:  at 99.00:1 against a 4.5:1 floor
clear of the floor.
```

**No rows above it, no label after `worst:`, and 99:1 is not a contrast ratio —
21:1 is the most two colours can reach.** The number was the script's own
sentinel, `worst = { label: "", r: 99 }`, surviving a run that sampled nothing.

**ALL FIVE OF ITS SELECTORS WERE DEAD.** `git grep` finds `pa-lead`, `pa-fig`,
`pa-health`, `pa-lab2` and `pa-ground` **nowhere in `app/src`**. And the ground
it was written to measure is gone with them: `admin.css` paints a flat
`background: var(--ink-0)`, so the `addStyleTag` pausing *"the lights at their
brightest frame"* matched nothing either. Every line of its own header described
a screen that no longer exists.

**IT MEASURES SOMETHING REAL NOW: 13 pixels, worst 5.16:1.** The two quiet roles
that do exist, `.pa-lab` and `.pa-sub`, sampled over `.pa-card`'s
`linear-gradient(180deg, --ink-2, --ink-1)` — which is the same blind spot the
original header is about, since a token-pair check reads the token and cannot
see the gradient over it.

**Three anchors, because it failed by finding nothing rather than by getting a
sum wrong:** a selector matching nothing anywhere is red, zero pixels sampled is
red, and the subject count prints on every run.

**AND THE FIRST VERSION OF ANCHOR 1 FAILED A HEALTHY PRODUCT, WHICH IS WORTH
KEEPING.** `.pa-lab` renders on the sign-in card and inside a detailer's record;
the five resting tabs carry **zero** of it. Right failure, wrong scope. The
script walks the sign-in card and all five tabs now.

**Baselined both ways:** rename `.pa-lab` → `NO SUBJECTS`, exit 1. Raise the
floor to 6.0 → `BELOW THE FLOOR`, exit 1. Untouched → 13 measured, exit 0.

---

## 4 · `sweep-widths.mjs` — FIVE GREEN VERDICTS OVER AN EMPTY PAGE

The repo's worst-record instrument, and it did it again in a new way:

```
book · step 1            clean
landing                  clean
pricing                  clean
terms                    clean
privacy                  clean
```

**Every one of those is a page with an empty `#root`, no stylesheet and no
text.** `CHECK` is a FINDER, so no elements means no findings means the word
`clean`. The only lines that told the truth were the three named sub-checks that
count their own rungs and rows — `pricing · the ladder  NOT MEASURED — expected
3 rungs, found 0` — and a surface without one of those has no anchor at all.

**THE FIX IS THE RULE FROM `docs/START-HERE.md` § 4, APPLIED IN ONE PLACE:
`say()` counts its own subject.** A surface with no elements and no text prints
`NOT MEASURED - the page rendered nothing (0 elements, 0 characters)` and counts
as a problem. The run ends with `N surface(s) measured, N element(s) probed`,
because `found` counts PROBLEMS and on a good day is zero — it says nothing at
all about whether anything was looked at.

**Verified both ways at 4174 and 4173:** the five `clean` lines are five
`NOT MEASURED` lines, and the real run still reports its findings.

### AND THE GUARD IMMEDIATELY CAUGHT A FALSE `clean` ON THE REAL PRODUCT

The very next run — against 4173, the working bundle — printed this at all five
widths:

```
book · step 1   NOT MEASURED - the page rendered nothing (3 elements, 0 characters)
                :: <div class="bk" style="--bk-accent: #38e08b; ...
```

**Three elements and no text is the booking page's SPINNER, and the accent is
the default green rather than the tenant's orange — so the business profile had
not arrived either.** `sweep-widths` has been measuring a spinner for
`book · step 1` at every width, on every run this repo has ever done, and
printing the word `clean` over it.

**THE CAUSE IS ONE MISSING CLASS IN `settle()`.** It holds while
`document.querySelector(".spinner, [data-loading]")` matches. **The whole
customer-facing flow spells it `bk-spinner`** — `BookingPage`, `StepWhen`,
`PlansPage`, `PlanMemberPage`, `ManageBookingPage`, `UnsubscribePage` — and a
CSS-animated spinner mutates nothing, so the DOM was quiet in 130ms and
`settle` returned on a loading page.

**THE COMMENT DIRECTLY ABOVE THAT LINE IS ABOUT THIS EXACT FAILURE.** It records
`shoot-dashboard` sending Andrew a photograph of a loading line in September and
adding `[data-loading]` to stop it — **and the booking flow never got the
attribute.** A fix that depends on every future screen opting in is a fix with a
list, and the list went stale in the usual way.

**Three scripts carried the stale selector** — `sweep-widths`,
`shoot-dashboard` and `shoot-admin` — and all three now wait on
`.spinner, .bk-spinner, [data-loading]`. **`book · step 1` measures 168
elements and reports a real `clean`.**

**AND THIS IS THE ANSWER TO WHY THE SUBJECT COUNT WAS WORTH ADDING.** The
overflow guard was written for a blank build nobody ships. It paid for itself on
the working one, in the first run, on a page a customer uses.

---

## 5 · `snapshot-page.mjs` — A 0 KB SNAPSHOT THAT EXITED 0

```
snapshots/pricing-1440.html  (193 KB, 1440px)     # the product
snapshots/pricing-1440.html  (0 KB, 1440px)       # nothing at all
```

**Same line shape, same exit code.** The only difference is a number a reader
has to notice, so anything calling this in a chain could not tell a frozen page
from a frozen blank.

**AND THE FIRST GUARD WAS WRONG IN AN INSTRUCTIVE WAY.** Testing the captured
markup for emptiness PASSED: the blank build still emits
`<div id="root"></div>`, which is twenty-two non-space characters of nothing.
**The test is the TEXT.** Every page this is pointed at has words on it; a blank
one has none, and no threshold has to be invented.

---

## 6 · `sweep-booking-steps.mjs` — NOT BLIND, BUT IT STOPPED MEASURING AND ONLY SAID `1`

It threw at 30 seconds waiting for `.bk-card, .bk-plan-row, .bk-note,
.bk-center h1` on `/unsubscribe/<id>`. **The page is perfect** — it renders
`.bk-center` with an `h2`, the copy, both buttons and no console error. The
selector list simply never learned about a fifth landing state.

**THE COST IS NOT THE FALSE FAILURE. IT IS EVERYTHING UNDERNEATH.** The throw
killed the run before the multi-vehicle section (roadmap 8.10) and everything
after it, at every remaining width. **A check that dies partway prints an exit
code and nothing that says which subjects it never reached** — the same family
as trap (c), where a green run had never visited 22 screens.

**`.bk-center` ALONE WOULD HAVE BEEN THE WRONG FIX**, which is why it is not the
one taken: `UnsubscribePage.jsx:123` renders `.bk-center > .bk-spinner` while
loading, so waiting on the container would go green on exactly the hang this
selector exists to catch. `.bk-actions` is the settled state and only that.

**AND WITH THE SUBJECTS BACK, IT FOUND A REAL ONE — see § 8.**

---

## 7 · `overlap-probe.mjs` HAS A POSITIVE CONTROL, WHICH IS ALL A LIBRARY CAN HAVE

It exports source strings the sweeps `eval` inside the page, so it has no
runner and can only ever be baselined through a caller. **Its caller found 11
real problems on the base run of the same afternoon**, which is a live positive
control — the probe demonstrably finds things. What it lacked was a count of
what it looked at when it found nothing, and `sweep-widths` now carries that.

---

## 8 · TWO THINGS FOUND BY ACCIDENT, AND BOTH ARE LANE B'S

**(a) BOOKING STEP 4 IS 10px OVER THE SCREEN AT 392x844.** *"Pick a place"*,
W16 not met, tallest children `div.bk-card.selectable.selected` (90px),
`div.bk-field` (73px), `div.bk-card.selectable` (71px). Measured against the
frozen production bundle at `873d7a1`, so nothing lane B was editing at the
time can explain it. Every other step fits at every width.

**(b) `spanish-dom.mjs` FINDS 15 PIECES OF ENGLISH ON A SPANISH DASHBOARD** —
`Hide`/`Show`, `Add question`, `Check it`, `Pet hair removal`, `Headlight
restoration`, `No longer applies`, `Save`, `SUMMER10`, `All days`, `Weekdays`,
`Weekends`, `Short notice`. **Some of these are a detailer's own words and must
not be translated** — `SUMMER10` is a promo code, and the two service names are
his; `docs/START-HERE.md` § 6 settles that. The rest are ours.

---

## 9 · AND ONE FINDING ABOUT A GUARD THAT DISCREDITS GOOD RUNS

`scripts/source-guard.mjs` printed, under a real finding:

> ⚠ A SOURCE FILE CHANGED WHILE THIS RUN WAS IN FLIGHT. Read this before
> debugging anything above: the failures are very likely this rather than a
> defect.

**The subject was a production bundle in a separate worktree.** A bundle is
bytes on disk; no edit under `app/src` can reach it. The warning named a cause
it could not verify, and it named it over the one run that had found something.

**It is gated on what was under test now.** `BASE` pointing anywhere but the dev
server means the subject was frozen, and the edit is printed as a fact — *"THIS
RUN STANDS"* — instead of as a doubt. The dev server is still the default and
still gets the full warning, because there the fault is real.

---

## 9b · THE SAME QUESTION ASKED MECHANICALLY — `scripts/dead-selectors.mjs`

**`admin-contrast` died because five class names were renamed out of `app/src`
and nothing noticed.** That is a question a script can ask of the whole repo, so
now one does:

```bash
node scripts/dead-selectors.mjs          # credential-free, no browser
node scripts/dead-selectors.mjs --prove  # invents a class nobody has, must report it
```

It pulls every class token out of every quoted SELECTOR string in the fifteen
scripts that load Playwright, and looks each one up in the 3.67 MB of
`app/src` + `app/public`. **15 scripts, 64 tokens, and it exits 1 on anything
the product no longer has.**

**IT FOUND FIVE MORE, ALL IN `shoot-admin.mjs`:**

| selector | what it gates |
|---|---|
| `.pa-bar-r .pa-btn` | the *What we charge* button. Zero matches, so the **prices screen and the promo codes are never photographed, at any width** |
| `.pa-panel .pa-grid` | the wait for that panel's content |
| `.pa-checks` | the promo-code strip below the fold |
| `.pa-rail` | a scroll-to-top before a shot |
| `.pa-h1` | the impersonation banner. `textContent()` on a locator matching nothing throws, is caught as `""`, and `/signed in as/` fails — so that branch reports **`SAYS "" - the 404 with no way back`** and increments `bad`. A false FAILURE this time, not a false pass |

**AND SHOOT-ADMIN IS HONEST ABOUT IT, WHICH IS THE ONE GOOD PART.** Each of
those guards prints `NOT MEASURED - no "What we charge" button` rather than
skipping in silence — the repo's own rule #1, kept. The coverage is still gone;
it is just gone out loud.

**THE SELECTORS ARE NOT CORRECTED HERE, DELIBERATELY.** `app/src/admin/AdminPage.jsx`
is dirty in lane B's tree as this is written, and picking new class names off a
file somebody is editing is the mistake trap (f) is about. `.pa-barr` and
`.pa-h` both exist and are NOT the answers: the first is an SVG `<rect>` in a
bar chart and the second is a heading wrapper. **Whoever fixes them reads the
committed file and then runs `dead-selectors` again.**

**WHAT IT CANNOT SEE, and the case is in this repo already:** a class that
exists in `app/src` but is on none of the screens the script visits. `.pa-lab`
is exactly that — present in six places, rendered on the sign-in card and inside
a detailer's record, and on **none** of the back office's five resting tabs.
Only a browser answers that, by counting subjects.

---

## 9c · AND ONE MORE, IN THE SECURITY PROBE, FOUND BY ASKING THE SAME QUESTION AGAIN

**`scripts/adversary-probe.mjs`'s *"and carries no other customer's name or
number"* has been green over an empty object for its whole life.**

Its helper truncates every response to 600 characters, which is right for the
refusals — they are short — **and quietly wrong for the one answer that is
long: a real booking receipt.** `JSON.parse` on 600 characters of a cut-off
payload throws, the `catch` left `body` null, and the check ran
`JSON.stringify({})`. **A blob that mentions no customer because it mentions
nothing.**

**THE NEIGHBOUR THAT WAS SUPPOSED TO ANCHOR IT DID NOT.** *"a real booking id
returns that booking"* asserts only `status === 200`, and a 200 whose body
cannot be parsed satisfies it perfectly.

**IT WAS FOUND BY ADDING ONE POSITIVE CONTROL** — assert the answer contains the
booking's own id — **which failed on its first run and printed `{}`.** With the
full text kept alongside the truncated one, all three go green and the leak
check reads a real receipt: **53 passed, 0 failed.**

**THE TRANSFERABLE PART:** a helper that shortens a response FOR DISPLAY, used
by a check that PARSES it, is a blind spot that no amount of reading the check
will reveal. The check is correct. The data never arrived.

---

## 10 · WHAT IS STILL NOT PROVEN

- **The `pushState` failure is out of reach of this instrument.** Blanking
  answers *"can it be green over nothing"*. It cannot answer *"can it be green
  over the wrong screen"*, which needs a different break.
- **The four photographers still exit 0 whatever they shoot**, once past the
  sign-in. `shoot-dashboard` collects `problems` — including *"no gear row
  matching X"*, which is a coverage failure — and prints them **without changing
  the exit code**. Left alone deliberately: they are tools a person looks at the
  output of, and `shoot-admin` already exits 1 on console errors. Worth a
  decision, not a silent change.
- **`sweep-phone-viewport.mjs` is untracked** and therefore invisible to
  `git archive HEAD`, so it is outside both this test and `blind-run`. It took
  the `BASE` line with the others.
