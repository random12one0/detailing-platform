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

**SAY THAT FIRST, BECAUSE THE NUMBER IS THE PROBLEM.** Seventy findings from
one impossible constraint is **one finding repeated seventy times**. A reader
who sees 70 and stops reading has drawn exactly the wrong conclusion about how
much is wrong with this screen — and a gate whose first honest output gets
dismissed wholesale is a gate that goes back to being ignored.

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
   comment expects 47px.

   **Do not reach for the `::after` negative-inset trick, and here is the
   reason rather than just the rule.** `CLAUDE.md` allows a deliberately small
   mark — a 7px rail dot, a colour swatch — to keep its size and grow its
   target with an absolutely positioned `::after` at a negative inset. That
   works because those marks sit in space nothing else wants. **Calendar cells
   are adjacent**, separated by a 5px gap: an `::after` wide enough to reach
   44px would extend about 4px into each neighbour on both sides, so the 21st
   and the 22nd would overlap and each would swallow presses meant for the
   other. `CLAUDE.md`'s own pitch rule names this — *"two 32px targets 18px
   apart do not both exist"* — and `elementFromPoint` would return the wrong
   date for a band down the edge of every cell. **That trades a small target
   for a wrong one, on a date picker, where the wrong answer is a booking on
   the wrong day.** The fix is the grid's width, not the cell's.
2. **The instrument one.** The annotation should say *"the floor here is the
   column, at the grid's current width"* rather than *"arithmetically
   impossible"*, or it should suppress the finding and report it once as a
   single declared constraint instead of 70 times. Seventy repetitions of one
   true fact is what made this list unreadable.

---

## SETTLED ON A FRESH LOAD — one fault, not two, and the root cause is named

**Re-measured 2026-09-20 with a fresh load at 1440x900, walked to step 5.** The
earlier caveat is resolved, and in an instructive direction: on step 1 the wrap
renders at **469px**, on the calendar step at **316.9px**. It varies by step,
which is the tell — **it is sized by its content, not by its `max-width`.**

```
fresh load, 1440x900, step 5 "Pick a time"
  --bk-col        600px          the column the design allots
  .bk-wrap        316.9px        against its own max-width: 632px
  .bk-cal (grid)  284.9px
  .cell           36.4 x 36.4px
  .cell max-height 52px          NOT engaged - actual height is 36px
```

**THE CONSTRAINING ELEMENT, NAMED.** `app/src/book/booking.css:274`:

```css
.bk-wrap {
  max-width: calc(var(--bk-col) + 2 * var(--bk-sp-4)); margin: 0 auto;
  display: flex; flex-direction: column;
}
```

`.bk-wrap` is a **flex item** of `.bk` (`display: flex; flex-direction:
column`). **Auto side margins on a flex item override stretch.** The measured
proof is `margin-left: 561.547px` — a resolved `auto`, not a declared value. So
the item never stretches to its container, never reaches its `max-width: 632px`,
and falls back to shrink-to-fit. `margin: 0 auto` is the correct centring idiom
for a **block**; on a flex item it silently disables the stretch that would
have given it its width.

**So the narrow grid and the 36.4px cell are the SAME FAULT seen at two
widths.** The grid is the widest thing on the calendar step, so the wrap
shrinks to the grid, the grid's seven `1fr` columns fall to content size, and
the cell lands at 36.4px. Fix the wrap's width and the cell grows as a
consequence — **one change, not two.**

**The arithmetic, so the fix can be checked rather than eyeballed:**

| width | wrap today | wrap fixed | grid | column | vs 44px floor |
|---|---|---|---|---|---|
| 392 | 316.9 | 392 (under max-width) | 360 | **47.1px** | met |
| 1440 | 316.9 | 632 (max-width) | 600 | **81.4px** | met, then height capped at 52 |

**47.1px at phone width is exactly the number `booking.css:1151` predicts** —
*"the column is 360px and a cell lands at 47px — a thumb."* The comment was
never wrong about the design. It described what the CSS would produce if the
wrap took its width, and the auto-margin is why it does not.

**And the dead `max-height: 52px` is the corroborating evidence.** That cap
exists because *"on the 600px column it made an 81px square"* — it was written
against a grid that filled the column. It does not engage today: the cell is
36px. **A cap that can never fire is a record of a width the layout used to
have.**

---

## Handed over, not fixed — and why the split

This is a CSS change in `app/src`, which the other session owns and is mid-item
in. **The shape agreed: this session pins the root cause with the numbers, they
make the change, this session measures it again.** Two people aiming at one
cause is how a screen gets rebuilt by accident.

**What to check after the change**, at both widths, on a fresh load:
`.bk-wrap` reaches 392 / 632, `.bk-cal` reaches 360 / 600, the cell reaches
47.1 / 81.4 minus the 52px height cap, and `sweep-booking-steps.mjs` drops from
70 tap findings to zero. **Watch the other steps too** — the wrap has been
shrink-to-fit on every step, so step 1's cards move from 469px to 632px as
well. That is the intended width, but it is a visible change to five screens,
not only to the calendar.

## What was proved and what was read

**Proved — measured in a browser at 392x844:** grid width, cell size, gap, the
cell count, and the two-`.bk-cal` structure (the first is the weekday header
with 7 `.bk-dow` and no cells — `docs/gotchas.md` (e), which caught a wrong
reading here before it became a wrong number).

**Read — from source, not run:** the design intent quoted from
`booking.css:1151`, and `CLAUDE.md`'s 44px absolute.

**Unconfirmed — measured but under a caveat:** everything in the section above.
