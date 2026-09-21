# The 64 spare figures, classified — 2026-09-20

**This is a marking pass, not a re-measurement.** Nothing here was re-run and no
prose was rewritten. Every figure keeps the value it was written with; what this
file records is **which definition of "spare" it was taken under**, because that
definition moved today and the number gives no sign of it.

## The finding, in one paragraph

`scripts/sweep-booking-steps.mjs` prints `fits, Npx spare` from
`header.height + wrap.height − viewportHeight`. On **2026-09-20 at 02:34:23**,
commit `52a3d70` ("Booking: the pinned bar takes its own space instead of being
guessed at", ROADMAP 2.15) gave `.bk-wrap` `flex: 1 0 auto` inside a
`min-height: 100dvh` column. **From that moment the column stretches to fill the
screen on any step shorter than it**, and the figure stops being headroom and
becomes a constant — the leftover the flex layout hands back. Measured:
riverside step 1 **needs 435px while its rectangle stretched to 748px, and it
reported −73 at viewport heights 900, 1200 and 740 alike**; the demo's add-ons step read "77px spare" at 900 and at 740.
The cap sits between about **54 and 77px** depending on the header. The failing
direction is unaffected — once content exceeds the box, box equals content and
the number is honest in both kind and value.

## The boundary, and it is clean

**Every one of the 64 figures was written before the cap existed.** Dated by
`git blame` against `52a3d70`'s timestamp:

| when | figures | what it means |
|---|---|---|
| before 2026-09-20 | 55 | taken when `.bk-wrap` did not stretch, so they measured real content |
| 2026-09-20, before 02:34 | 3 | `ROADMAP.md:3588-3590`, written in `d0956b6` at **01:18:30** — 76 minutes before the mechanism landed |
| 2026-09-20, derived not printed | 2 | the `~22px` / `~29px` pair in the handoff and the triage: `over` minus one service card, arithmetic rather than a reading, and already labelled as such in the script |

**So this is not a repo-wide correction.** No document in this repo yet holds a
number taken under the new definition. What the 64 lost is not correctness —
it is **reproducibility**: re-run the instrument today on the same screen and it
prints a different, capped figure, with nothing to say they disagree.

**Which makes the code change urgent rather than tidy.** The boundary is clean
only until somebody writes the first capped figure into a document, at which
point it becomes indistinguishable from these 58 honest ones.

## What is NOT established here

- **Nothing was re-measured.** A figure whose provenance could be established is
  marked; none required a guess, so no row is marked `unknown`. Had one, it
  would say `unknown` rather than carry a plausible date.
- **`git blame` dates the line, not the measurement.** A line reformatted later
  carries the later date. That can only push a figure *forward*, and every
  figure already lands before the boundary, so it cannot change the conclusion.
- **Whether each figure was printed by this instrument or measured by hand** is
  not established and does not matter for this question: both were taken under
  the same, pre-cap definition.

## The ledger

`pre-cap` = taken before `52a3d70`. `derived` = arithmetic, not a printed
reading.

| where | written | mark | the line |
|---|---|---|---|
| `DECISIONS.md:206` | 2026-09-04 | pre-cap | - **Selling nationwide, and an idea that had to be refused** — the reasoni |
| `DECISIONS.md:4634` | 2026-08-31 | pre-cap | | today: 4 services, 4 category headings | fits, **18px spare** | |
| `DECISIONS.md:4638` | 2026-08-31 | pre-cap | | the same, with the description folded off the card | **18px spare** (car |
| `DECISIONS.md:4679` | 2026-08-31 | pre-cap | **47px spare at 392x844**. |
| `DECISIONS.md:4690` | 2026-08-31 | pre-cap | **19px OVER** there while the phone had 28px spare. |
| `DECISIONS.md:4697` | 2026-08-31 | pre-cap | still needs to be told how many it may take. 1440x900 now has **10px spare |
| `DECISIONS.md:4705` | 2026-08-31 | pre-cap | 2.8 measured step 3 at 238px spare, 79px per size card, and concluded six. |
| `DECISIONS.md:4711` | 2026-08-31 | pre-cap | | 4 | fits, 39px spare | fits, 23px spare | |
| `DECISIONS.md:7597` | 2026-09-02 | pre-cap | its steps are on a measured height budget (W16 — step 1 has 10px spare at |
| `DECISIONS.md:11610` | 2026-09-04 | pre-cap | **measured** (roadmap 2.7 and 2.8c, binding screen 1440x900 with 10px spar |
| `DECISIONS.md:15645` | 2026-09-07 | pre-cap | feature now costs **one pixel**: three cars is 15px spare against the 16 |
| `FOUND.md:564` | 2026-09-13 | pre-cap | | 1920x1080 | fits, 136px spare | |
| `FOUND.md:565` | 2026-09-13 | pre-cap | | 1440x900 | fits, **13px spare** | |
| `FOUND.md:566` | 2026-09-13 | pre-cap | | 768x1024 | fits, 169px spare | |
| `PROJECT-STATE.md:553` | 2026-08-31 | pre-cap | 119px.** Today's four-service demo has 18px spare; a service card is 97px, |
| `PROJECT-STATE.md:556` | 2026-08-31 | pre-cap | card takes it 97px → 74px, and that same menu from 119px over to 18px spar |
| `PROJECT-STATE.md:559` | 2026-08-31 | pre-cap | same shape now that sizes are tenant-defined: 238px spare, 79px per size, |
| `PROJECT-STATE.md:640` | 2026-08-31 | pre-cap | now IS — has **10px spare at 1440x900** and 47px at 392x844. A seventh |
| `PROJECT-STATE.md:700` | 2026-08-31 | pre-cap | when the travel-area picker landed on it, and is back to **52px spare at 3 |
| `PROJECT-STATE.md:2839` | 2026-09-02 | pre-cap | | `sweep-booking-steps.mjs` | every step fits at all four sizes; step 1 st |
| `PROJECT-STATE.md:3553` | 2026-09-04 | pre-cap | one is two lines — but it puts a new sentence on step 4, which has 39px sp |
| `PROJECT-STATE.md:3671` | 2026-08-31 | pre-cap | IS THE TENANT'S.** Steps 2–7 have 90–500px spare; step 1's height is the |
| `PROJECT-STATE.md:4677` | 2026-09-04 | pre-cap | default** — the step budgets were measured (1440x900, 10px spare on step 1 |
| `PROJECT-STATE.md:5704` | 2026-09-06 | pre-cap | afterwards is IDENTICAL to the ones CLAUDE.md records — step 1 at 10px spa |
| `ROADMAP.md:3588` | 2026-09-20 | pre-cap | | 1920 | fits, 133px spare | **over by 131px** | |
| `ROADMAP.md:3589` | 2026-09-20 | pre-cap | | 1440 | fits, 10px spare | **over by 254px** | |
| `ROADMAP.md:3590` | 2026-09-20 | pre-cap | | 768 | fits, 166px spare | **over by 98px** | |
| `docs/HANDOFF-2026-09-20.md:31` | 2026-09-20 | derived | | 5 | fits, ~22px spare | fits, ~29px spare | |
| `docs/VERIFIED.md:257` | 2026-09-13 | pre-cap | | The step costs no height | 3/7 reads **fits 117px spare at 392**, **111p |
| `docs/booking-steps-triage-2026-09-20.md:609` | 2026-09-20 | derived | | 5 | fits, ~22px spare | fits, ~29px spare | |
| `docs/detailer-research-2026-08-31.md:453` | 2026-08-31 | pre-cap | > here, and this menu fits step 1 with 47px spare at 392x844. **The tighte |
| `docs/detailer-research-2026-08-31.md:458` | 2026-08-31 | pre-cap | > 1440x900 now has 10px spare. **A seventh service breaks the laptop befor |
| `docs/detailer-research-2026-08-31.md:468` | 2026-08-31 | pre-cap | | today: 4 services, 4 category headings | **fits, 18px spare** | |
| `docs/detailer-research-2026-08-31.md:480` | 2026-08-31 | pre-cap | same six-service, two-category menu from 119px over to **18px spare** — ex |
| `docs/detailer-research-2026-08-31.md:495` | 2026-08-31 | pre-cap | > in: four sizes fit with 39px spare (392x844) and 23px (1440x900); five a |
| `docs/detailer-research-2026-08-31.md:505` | 2026-08-31 | pre-cap | same measurement was taken there. Step 3 has **238px spare** with three si |
| `docs/detailer-research-2026-08-31.md:699` | 2026-08-31 | pre-cap | two-category menu goes from 119px over to 18px spare. Everything else on |
| `docs/overnight-log.md:113` | 2026-09-05 | pre-cap | figure is identical to the ones CLAUDE.md records** — step 1 is 10px spare |
| `docs/owner-walkthrough-2026-08-30.md:343` | 2026-08-31 | pre-cap | already done. **Measured ceiling: step 3 has 238px spare and a size card |
| `docs/owner-walkthrough-2026-08-30.md:515` | 2026-08-31 | pre-cap | predicted, step 1 at **47px spare on 392x844** and **10px spare on 1440x90 |
| `docs/owner-walkthrough-2026-08-30.md:518` | 2026-08-31 | pre-cap | phone, and without it 1440x900 went from 19px OVER to 10px spare. |
| `docs/owner-walkthrough-2026-08-30.md:551` | 2026-08-31 | pre-cap | each, overflows step 1 by 119px** (the demo's four services have 18px spar |
| `docs/owner-walkthrough-2026-08-30.md:553` | 2026-08-31 | pre-cap | same menu from 119px over to 18px spare.** So the disclosure holds the |
| `docs/plans-research-2026-09-04.md:831` | 2026-09-04 | pre-cap | binding screen turned out to be 1440x900 with 10px spare on step 1. **Movi |
| `docs/roadmap.md:911` | 2026-08-31 | pre-cap | have 90–500px spare. Step 1's height is the TENANT'S CATALOGUE: with |
| `docs/roadmap.md:973` | 2026-08-31 | pre-cap | has 18px spare, a service card is 97px, a category heading is 17px. |
| `docs/roadmap.md:979` | 2026-08-31 | pre-cap | tenant-defined: 238px spare, 79px per size, **six is the phone ceiling.** |
| `docs/roadmap.md:1036` | 2026-08-31 | pre-cap | menu 119px over → 18px spare. |
| `docs/roadmap.md:1058` | 2026-08-31 | pre-cap | 47px spare at 392x844. |
| `docs/roadmap.md:1065` | 2026-08-31 | pre-cap | has **10px spare**. A seventh service breaks 1440x900 first. |
| `docs/roadmap.md:1154` | 2026-08-31 | pre-cap | same cut, for the same reason, as step 1’s intro in 2.8b. 52px spare |
| `docs/roadmap.md:2550` | 2026-09-04 | pre-cap | were MEASURED** — 2.7 and 2.8c, binding screen 1440x900 with 10px spare |
| `docs/roadmap.md:6130` | 2026-09-06 | pre-cap | CLAUDE.md records** — step 1 at 10px spare on 1440x900, step 4 at 74px, |
| `docs/roadmap.md:7556` | 2026-09-07 | pre-cap | **MEASURED, at 392: one car 24px spare, two 114px, three 16px.** The |
| `docs/roadmap.md:7864` | 2026-09-07 | pre-cap | 15px spare against the 16 recorded before it. |
| `docs/standing-work.md:134` | 2026-09-07 | pre-cap | figure like *39px spare* — and MEASURE it. Correct the file, and say IN th |
| `docs/verification-speed-2026-09-02.md:77` | 2026-09-02 | pre-cap | unchanged after the change** (step 4 still 52px spare at 392), which is th |
| `docs/verification.md:1042` | 2026-09-08 | pre-cap | **AND THE NUMBERS IT PRINTS ARE THE POINT: at 392, one car 24px spare, two |
| `docs/verification.md:1082` | 2026-09-08 | pre-cap | we verify. Six services in two categories: **10px spare at 1440x900**, 47p |
| `docs/verification.md:1086` | 2026-09-08 | pre-cap | Four sizes: 39px spare at 392, 23px at 1440. Five: over by 40px and 66px. |
---

# THE CENSUS WAS DOCUMENTS-ONLY AND SAID "IN THIS REPO" — 2026-09-20, second leg

**This section adds nine figures the ledger above never looked at. It rewrites
none of them and re-runs nothing.** The rule is unchanged: mark, do not
rewrite; an unknown is a true statement where a fresh-dated guess is a new
stale number.

**What was wrong was the SCOPE SENTENCE, not the conclusion.** The opening line
above says the file classifies *"every written `Npx spare` figure in this
repo"*. It classifies every one **in the markdown documents**. Re-running its
own pattern across the checkout — excluding `.claude/worktrees/`, which are
copies of these same files — returns **five more files it never read**: three
of them code, one of them the instrument itself, one of them a doc.

| file | figures | why it matters that it is here |
|---|---|---|
| `scripts/sweep-booking-steps.mjs` | 4 | the instrument that PRINTS the figure carries four of its own |
| `app/src/book/booking.css` | 2 | a comment recording a decision, in the file that decision is about |
| `app/src/screens/more/Reviews.jsx` | 1 | a standing prohibition resting on one number |
| `app/src/book/steps/StepServices.jsx` | 1 | the disclosure rationale, in the component |
| `docs/silences.md` | 1 | post-fix, describes the cap itself |

## The nine, dated the same way the 60 were

`git blame` author-time against `52a3d70` (2026-09-20 02:34:23) and `9e6fa7f`
(2026-09-20 20:34:27). **There are three eras here, not two** — the ledger above
was written at `33673fe`, 20:18:30, **sixteen minutes before the fix landed**,
so "before / after the cap" was the only division available to it.

| where | written | mark | what it says |
|---|---|---|---|
| `app/src/book/booking.css:588` | 2026-08-31 | pre-cap | menu 119px past the bottom of a phone → 18px spare |
| `app/src/book/steps/StepServices.jsx:14` | 2026-08-31 | pre-cap | the same pair, in the component |
| `app/src/screens/more/Reviews.jsx:14` | 2026-09-02 | pre-cap | **step 1 has 10px spare at 1440x900** |
| `scripts/sweep-booking-steps.mjs:632` | 2026-09-04 | pre-cap | 98px spare at 1440x900, 66px at 392x844 |
| `scripts/sweep-booking-steps.mjs:733` | 2026-09-07 | pre-cap | step 3 has 39px spare at 392, 23px at 1440 |
| `app/src/book/booking.css:1481` | 2026-09-07 | pre-cap | **25px off EVERY step; the 3-car case 16px spare → 9px over** |
| `scripts/sweep-booking-steps.mjs:80` | 2026-09-20 19:25:33 | **in-window, derived** | the `~22` / `~29` bound — see below |
| `scripts/sweep-booking-steps.mjs:134` | 2026-09-20 20:34:27 | post-fix | `fits, 73px spare` cited as the reading that was wrong |
| `docs/silences.md:326` | 2026-09-20 20:34:27 | post-fix | the 435px / 748px / 73px case itself |

## The one that tests the ledger's headline, and the headline survives

The ledger says: *"Every one of the 64 figures was written before the cap
existed... No document in this repo yet holds a number taken under the new
definition."*

**`scripts/sweep-booking-steps.mjs:80` was written at 19:25:33 — inside the
capped window, 02:34 to 20:34.** On the face of it that is the first capped
figure written into the repo, and the boundary is not clean.

**It is not, and the way to find out was to read the thing that produced the
number rather than the number.** Lines 62–100 of that file state the
derivation: `~22` and `~29` are **this script's own overflow minus one service
card** — `88 − 110` and `71 − 100` — taken from a reading where step 1 was
genuinely overflowing. **The cap only ever touched the fitting direction**;
once content exceeds the box, box equals content, and the ledger above says so
itself. So the figure is honest, and the comment now records that since the fix
the derivation and the reading agree.

**The conclusion stands and the scope sentence does not** — which is the same
shape as the 58px/435px correction recorded in the second-leg handoff: an
illustration nobody measured is not evidence, however true the thing it
illustrates.

## The two that actually gate a live decision

The handoff's test for task one is *"a number somebody is going to make a
decision against."* Applying it to `ROADMAP.md` and `docs/VERIFIED.md`, as the
handoff directed, returns **nothing** — all three ROADMAP figures sit inside
**8.4, which is `[x]` DONE** (the item opens at `ROADMAP.md:3502`, the next
checkbox is 8.5 at 3699), and `docs/VERIFIED.md:257` sits inside a PROVEN CLEAN
record. Those are history.

**The two that pass the test are in code, which is why the census could not see
them:**

- **`app/src/screens/more/Reviews.jsx:14`** — *"its steps are on a measured
  height budget (W16 ... step 1 has 10px spare at 1440x900), so a block of
  quotes cannot be dropped into one."* This 10px is **the stated reason the
  booking page reads testimonials and does not draw them**, and the reason the
  tenant websites are named as their destination instead. A session asking
  "can reviews go on the booking page?" decides against this number.
- **`app/src/book/booking.css:1481`** — *"spent 25px of EVERY step's spare
  room: the 3-car case went from 16px spare to 9px over."* This is the recorded
  justification for `.bk-lang`'s negative block margins. A session tidying those
  margins decides against this number, and CLAUDE.md's shared-variable rule
  (*find out whether a previous item already decided not to*) is precisely the
  rule that sends them here to read it.

**Both are pre-cap, so both are UNKNOWN as of now, and both stay written as
they are.** Neither was re-derived: re-deriving needs
`sweep-booking-steps.mjs`, which walks the live page, and the app tree was
moving under another session's commit for the whole of this leg. **Not
skipped — blocked, and labelled blocked.**

**Neither file was edited.** `app/src` writes belong to the other session this
leg; this is a docs-only record of what is stale in files somebody else owns.

---

# TASK ONE, DONE — the two figures that gate open items, re-derived 2026-09-21

**The handoff's task one was: re-derive the spare figures that GATE something,
not all 64.** Two passed that test, and neither was in `ROADMAP.md` or
`docs/VERIFIED.md` where the handoff pointed. **Both are in code**, which is
why the original census could not see them.

Measured against a settled tree with `sweep-booking-steps.mjs`, at both widths,
after ROADMAP 2.1 landed and after the two migrations the other session
applied. **Marked, not rewritten** — and in this file rather than in the two
source files, for the reason at the bottom.

## 1 · `app/src/screens/more/Reviews.jsx:14` — "step 1 has 10px spare at 1440x900"

It is the **stated reason the booking page reads testimonials and does not draw
them**: *"its steps are on a measured height budget (W16 … step 1 has 10px
spare at 1440x900), so a block of quotes cannot be dropped into one."*

| | written (2026-09-02) | measured 2026-09-21 |
|---|---|---|
| 1440x900 | **10px spare** | **over by 88px** |
| 392x844 | not stated | **over by 71px** |
| at W16's declared bound of 5 services | — | 22px inside |

**The figure is dead twice over.** The cap changed what `spare` meant on
2026-09-20 (`52a3d70`), and separately `demo-detail` now lists **6 services
against a declared bound of 5**, which is not the catalogue the 10px was taken
against. **The constraint it defends is STRONGER than when it was written, not
weaker:** step 1 does not have 10px to spend on quotes, it is already 88px
over. Nobody should relax that prohibition on the strength of a stale number
going the other way.

## 2 · `app/src/book/booking.css:1481` — "the 3-car case went from 16px spare to 9px over"

It is the recorded justification for `.bk-lang`'s negative block margins:
*"putting a chip in that row … spent 25px of EVERY step's spare room: the
3-car case went from 16px spare to 9px over."*

| `demo-riverside`, step 3 | written (2026-09-07) | 392x844 today | 1440x900 today |
|---|---|---|---|
| 1 car | 24px spare | **over 34px** | **over 40px** |
| 2 cars | 114px spare | fits, 56px spare | fits, 80px spare |
| **3 cars** | **16px spare → 9px over** | **over 42px** | **over 18px** |

**Every one of the three has moved, and one changed direction**: the 1-car case
was the roomiest of the three and is now the worst at 1440. **The conclusion the
comment draws still holds** — the chips cost real height and the margins are
what pay for it — **but not one of its numbers is current.**

## WHAT WAS NOT DONE, AND WHY

**Neither source file was marked, because `app/src` is the other session's lane
this round.** The re-derivation is recorded here instead. **Two lines need a
mark when that lane comes back**, and the marks are the figures above — not a
rewrite of the prose, which is still correct about everything except its
numbers.

**The 62 other figures stay untouched and unre-derived.** They gate nothing;
re-dating them would turn history into a fresh-looking claim, which is the rule
this ledger opened with.
