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
riverside step 1, **58px of content, reported −73 at viewport heights 900, 1200
and 740 alike**; the demo's add-ons step read "77px spare" at 900 and at 740.
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