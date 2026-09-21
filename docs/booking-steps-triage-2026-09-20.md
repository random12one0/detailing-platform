# Triage — the 70 findings from `sweep-booking-steps.mjs`, 2026-09-20

**Why this file exists.** The gate had not been completing its walk (see
`docs/silences.md` § A). Once fixed it produced **70 tap-floor findings across
23 distinct controls**, and seventy findings nobody has read is functionally
the same as zero findings nobody can trust. This is the triage, not the fix.
**Nothing here has been fixed.** The list is for Andrew to pick from by what a
detailer would notice.

---

## The count

| | |
|---|---|
| tap-floor findings | **70** |
| distinct controls behind them | **23** |
| of those, the booking calendar's day cells | **23 — all of them** |
| any other control | **0** |
| **distinct underlying issues** | **1** |

**All 70 are one thing seen 70 times**: the same day cells, re-counted across
two probe directions (`narrow`, `short`) and four viewport widths. There is no
second defect hiding in the pile.

Separately, and not part of the 70, the same run reports **12 steps do not meet
W16** with **4 step readings exempt** (the `.bk-planpitch` full-screen pitch,
Andrew's ruling, ROADMAP 8.4). That family has not been triaged here.

---

## Is the calendar finding the product or the instrument? **Both, and the
instrument's half is that it overstates its own exemption.**

Every one of the 23 carries this annotation, printed by the check itself:

> `seven-column-grid: the grid is 285px over 7 columns = 40.7px a column, so 44
> is arithmetically impossible; the floor here is the column`

**Measured in a browser rather than argued from the annotation** — booking page
loaded at 392x844, walked to step 5:

```
.bk-cal (day grid)   285px wide, gap 5px
.bk-cal .cell        36.4 x 36.4px
check                (285 - 6x5) / 7 = 36.4   ✓ the annotation's arithmetic is right
```

**But the conclusion drawn from it is wrong.** A 44px column needs
`7 x 44 + 6 x 5 = 338px` of grid. **The viewport is 392px.** 338 fits inside 392
with 27px of margin each side. So 44px is not arithmetically impossible — it is
impossible *at the grid's current width*, and the grid's width is a product
choice, not a law.

**And the product's own source says the same thing, in the opposite
direction.** `app/src/book/booking.css:1151`, the comment above `.bk-cal .cell`:

> *"`aspect-ratio: 1` alone is right on a phone, where the column is 360px and
> a cell lands at 47px — a thumb… the phone is untouched and the cell stays
> well over the 46px tap floor."*

**The column is not 360px. It is 285px, and the cell is 36.4px, not 47px.**
392 − 32px of `.bk-wrap` padding would be 360, which is where the comment's
number comes from — but `.bk-wrap` renders at **317px**, not 392, so the
content box is 285.

**So the design intent is on record and the delivered result misses it by
10.6px per cell.** That is a product finding, not scaffolding. The instrument
finding sits on top of it: the check computes a true arithmetic fact about the
current width and then states it as impossibility, which is what invites the
whole list to be dismissed.

---

## What to fix, and what to decide — **not done, for Andrew to pick**

1. **The product one.** The calendar's day cells are 36.4px where this
   product's own design absolute is 44px of real hit area and its own CSS
   comment expects 47px. A calendar cell cannot use the `::after` negative-inset
   trick that `CLAUDE.md` allows for a small mark, because the cells are
   adjacent — growing one steals its neighbour's presses, which the pitch rule
   forbids. **So the fix is the grid's width, not the cell's.**
2. **The instrument one.** The annotation should say *"the floor here is the
   column, at the grid's current width"* rather than *"arithmetically
   impossible"*, or it should suppress the finding and report it once as a
   single declared constraint instead of 70 times. Seventy repetitions of one
   true fact is what made this list unreadable.

---

## Needs re-measuring before it is believed

At **1440x900** the grid was still **285px** with **36.4px** cells, while
`--bk-col` had correctly grown to **600px** and `.bk-wrap` still measured
**317px** against its own `max-width: 632px`. If that holds, the booking flow
renders in roughly half the width it is allowed at desktop, which is a larger
finding than the tap floor.

**It is NOT being reported as fact**, because that measurement was taken by
resizing the viewport without reloading. The page did re-layout — `--bk-col`
moved from 285px to 600px and `.bk` from 392px to 1440px — so it is not
obviously stale, but the honest test is a fresh load at 1440 and that has not
been done. **Anyone picking this up: reload at 1440 first.**

---

## What was proved and what was read

**Proved — measured in a browser at 392x844:** grid width, cell size, gap, the
cell count, and the two-`.bk-cal` structure (the first is the weekday header
with 7 `.bk-dow` and no cells — `docs/gotchas.md` (e), which caught a wrong
reading here before it became a wrong number).

**Read — from source, not run:** the design intent quoted from
`booking.css:1151`, and `CLAUDE.md`'s 44px absolute.

**Unconfirmed — measured but under a caveat:** everything in the section above.
