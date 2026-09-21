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

---

# THE AFTER — 2026-09-20, measured against the fix in the working tree

**The four numbers asked for:**

| | before | after |
|---|---|---|
| `.bk-wrap`, fresh load ≥768 | 316.9px against `max-width: 632px` | **632px** |
| `.bk-cal .cell` at 392 | 36.4 × 36.4 | **47.1 × 47.1** — clears the 44px floor |
| `.bk-cal .cell` at 1440 / 1920 | 36.4 × 36.4 | **52 × 52** |
| `max-height: 52px` gate | never engaged | **ENGAGED at 1440 and 1920** — first time |
| `sweep-booking-steps` tap findings | **70**, 23 distinct controls | **0** — *"every control reaches the floor"* |

**47.1px is the number `booking.css:1151` predicted eight months of comments
ago.** Not close to it — it. And the height cap engaging at desktop is the
second half of the same proof: a rule written for a 600px grid, dead while the
grid was 285px, doing its job the moment the grid got its width back.

**The zero is a zero from looking, not from not-looking:** the same run reports
**56 step readings, 599 controls measured** — the same subject count as the run
that produced 70. Had the walk collapsed, the subject count would have
collapsed with it.

**The W16 family is unchanged: 12 steps do not fit, before and after.** The
width fix neither helped nor hurt it. It remains untriaged.

## What this after CANNOT tell you, stated as such

The per-step matrix covers **steps 1–5 at four widths**. It does **not** cover
**steps 6 and 7 at any width** — the capture stalls on the calendar step, which
needs a date and a slot chosen before Continue will take. Their diff moves the
wrap on every step, so steps 6 and 7 changed too.

**For steps 6 and 7 the correct sentence is that they cannot be compared — not
that they look fine.** There is no before for them and no after either. The
calendar is the surface the fix was aimed at, it is the one with a real before,
and it is the only one the claim rests on.

At **768px** the calendar block was not captured (the step was reached, the
grid was not read). Recorded as not-captured rather than as a result.

## Why there is no proper before, and it is a scheduling error rather than a race

**Andrew's manager, on the record and in his own framing:** *"I told them to
build and hold the press; I did not tell them to hold the commit, and
committing at the end of a turn is what that session does every time and has
done correctly all night. You were told to capture a before while the thing you
were photographing was already being removed."*

The before capture was commissioned **after** the fix was authorised and while
it was being written. Vite serves the working tree, so the running app was
already the after; the first capture came back post-fix.

**The transferable rule: a before must be captured before the fix is
AUTHORISED, not while it is being built.** A session that has finished its work
will commit it, and should. Anything else asks one session to hold a correct
habit so another can photograph a state that is already gone.

**What survived is the calendar-only before**, measured on fresh loads earlier
the same night and committed at `d94c394` — wrap 316.9, grid 284.9, cell 36.4,
cap idle, 70 findings. That is enough for the comparison the fix was aimed at
and not enough for anything else.

## The capture script failed three times, loudly, and that is the point

It is a throwaway in the scratchpad, deliberately **not** in `scripts/` — the
sweep must not change between a before and an after, or it has measured two
different things. It got the matrix wrong three times:

1. `.bk-card, .bk-service` — clicked a card and the walk stalled at step 1,
   producing **four one-row columns**. The handler is on `.bk-pick`, a BUTTON
   inside the card; a click at the card's centre lands on a div that does not
   bubble to it. *The card is the thing you see; the button is the thing that
   listens.*
2. `input[type=text]` — matches on the **attribute**, and this input carries
   none. `el.type` reads `"text"` by default either way, which is exactly why
   it looked right. Same family as `process.exit(cond ? 1 : 0)`: the thing
   searched for is not written down.
3. Once, at 1440 only, the service click did not take and that column came back
   with one row while the other three had four. A flake, recorded because a
   matrix that is partial at one width and full at three is the most persuasive
   kind of wrong.

**The first attempt produced a partial matrix that looked like a complete
one**, which is `docs/silences.md`'s whole subject. It now pushes an
`INCOMPLETE` row naming the width and the step count, so a short column cannot
be mistaken for a measured one. **It failed loudly enough to be noticed, which
is the only reason any of this is a correction rather than a wrong number in a
report.**

## The strongest evidence of the night: two people, one mechanism, opposite ends

This session **measured** its way to the cause — wrap 316.9 against a declared
632, a resolved `margin-left: 561.547px` where a declared value should be, the
width varying by step, the dead `max-height: 52px` as a fossil of a width the
layout used to have.

The other session **read** its way to the same cause, and its commit comment
states it in spec terms: *"auto cross-margins absorb the leftover space and
override `align-items: stretch` for that one item — so instead of stretching
toward this rule's own `max-width`… `.bk-wrap` shrank to its CONTENT's width."*

**Neither saw the other's work.** One arrived from the rendered pixels, one
from the flex specification, and they met at the same declaration. Agreement
between two independent methods is worth more than either result alone — and it
is the opposite of the failure that nearly issued a work order tonight, where a
second check inherited the first one's stale input and could only ever agree.

---

# W16's twelve, triaged — 2026-09-20

**The sentence this started from:** *the honest version is that nobody knows
whether the twelve are the same twelve.* **They are.** Same steps, same widths,
same overflow to the pixel, before and after a change that widened the column
by up to 315px on every step.

## The test that was only available for one night

The width fix moved something underneath W16 without touching W16. That made a
free experiment possible: run the same unchanged gate before and after, and
compare **every** reading rather than the total.

```
before (pre-width-fix run)   after (post-fix run)
  10 failing step readings     10 failing step readings   IDENTICAL, to the pixel
  38 passing readings          38 passing readings        IDENTICAL, to the pixel
  tallest-element figures      same 742px / 783px         IDENTICAL
  tap findings   70       ->   0                          the page DID change
  cell 36.4x36.4          ->   52x52                      the page DID change
```

**48 of 48 W16 readings unchanged, while the tap family moved from 70 to 0 on
the same two runs, on the same pages.** That is either genuine
width-independence or a check that cannot respond, and the two look identical
from the output.

## It is genuine. Measured, not assumed.

`.bk-choices` — the element named as `tallest` in every failing reading — is
**inside** `.bk-wrap`, so the fix did reach it:

```
1440x900, fresh load, after the fix
  .bk-wrap      632px     (was 469 on this step)
  .bk-choices   600px     (was ~437)
  .bk-choices   783px tall  <- the exact number BOTH runs reported
```

**The block got about 163px wider and its height did not move by one pixel.**
It is a vertical stack of service cards whose rows already fit on one line at
the narrower width, so widening changed nothing vertically. **The check
responds; this content does not.** Stability, not a dead number.

## How many distinct causes: **three — two product, one instrument**

**Product A — step 1's choices block, 8 of the 10 readings.** `1/7 Pick your
service` and its three `1/N` variants (`plan attached`, `remembered`,
`known + plan`), at 1440 and 392. Over by **71–92px**, driven by
`.bk-choices` at 742–783px against a 844/900px viewport, with
`div.bk-step-head` second at 52–74px. One cause, four surfaces, two widths.

**Product B — the plans surfaces, 2 of the 10 readings.** `plans page`
**scrolls 312px (37% of the screen)** at 392, and `your plan` scrolls 17px
(2%). Different route from the booking flow, and the 37% one is much the worse
of the two.

**Instrument C — the summary counts things it does not list.** The line says
**12 steps do not fit** and the run prints **10** failing readings. At
`sweep-booking-steps.mjs:637` the sentence interpolates `failing`, but
`failing` is incremented in **six** places and only one of them
(line 245) is the W16 step-fit case. The others are a stuck step (451), two
plan-surface faults (582, 608), console errors (628) and the tap-findings block
(656 — which prints *after* the summary, so it never reaches this total).

**So "12 steps do not fit" is a general fault count wearing a specific
sentence.** Two of its twelve are not steps and are not W16. This is the same
family as everything else this week: a number that names one thing and counts
another, and it is why the line has been read as a known quantity. **Nobody was
ever going to find the missing two by reading the list, because they are not in
it.**

## What this does NOT say

The two `1/N` plan-surface readings and the `plans page` scroll are **not**
retested against a before/after — they were identical across the two runs like
everything else, but no separate measurement was taken of what drives them, as
was done for `.bk-choices`. **Product B is named, not diagnosed.**

Nothing here is fixed. The count discrepancy is reported, not corrected —
correcting it means deciding whether `failing` should be split per fault type,
which is a design call rather than a repair.

---

# B diagnosed — the plans page's 312px, 2026-09-20

**Reproduced exactly**, fresh load at 392x844: `scrollHeight` 1156 against an
844 viewport, **overflow 312px**, matching the gate's number to the pixel.

## Two causes, both measured, and neither is the one the row heights suggest

**Cause 1 — four plans stacked in one column. 712px of an 844px screen (84%).**

`.bk-plans` is a grid. At 392 it is one column and the four `.bk-plan-row`
cards stack: 177px each, 712px total. At 768 the same grid is
`296px 296px` — two columns — and the four cards occupy **370px**. Same cards,
same content, **342px of difference**, and at 768 the page overflows by
**zero**.

**The rows are not the fault and widening them does not help.** Measured at
768: each row is **181px — four pixels TALLER** than at 392, and the
description inside is still two lines (38px) even at 600px wide. So the
`.bk-choices` question does not repeat here: this content's height is not
width-dependent in the useful direction. **What changes the total is the
column count, not the column width.**

**Cause 2 — 104px of bottom padding for a bar that is not on the page.**

`.bk-wrap` carries `padding-bottom: var(--bk-bar-clear)`, computed
`calc(104px + 0px)`, to clear the fixed action bar the booking *steps* have.
Measured on the plans page: **zero `.bk-bar` elements, and zero fixed or
sticky elements of any kind.** 104px of an 844px screen — **12%** — reserved
for a control that does not exist there.

```
392x844   overflow 312px
          .bk-plans      712  (4 rows x 177, one column)
          wrap padTop     26
          wrap padBottom 104  <- for a bar that is not rendered
          3 gaps x 26     78
          other children 171  (head 24, "already on a plan" 99, one-off 48)
768x844   overflow   0px
          .bk-plans      370  (2 columns, same four cards)
```

**Removing cause 2 alone takes 312px to about 208px** — better, still over.
**The two together are the finding; neither on its own explains it.**

## CORRECTION — I posed a question the code had already answered

**I wrote that the gate applies W16 to `plans page`, which is not a step, and
asked whether it should. That was wrong and it is corrected here rather than
edited away.** The gate does not apply W16 to it. `plans page`, `your plan` and
`stop these emails` are all called with **`{ gate: false }`**
(`sweep-booking-steps.mjs:528, 559, 570`), and the verdict word differs
accordingly: gated surfaces print **`over`**, un-gated ones print
**`scrolls`**. Confirmed by the counter split below — W16 counts **8**, and the
two `scrolls` readings are in neither that total nor the non-W16 list. They are
advisory by design.

**So the distinction I asked for already exists**, is deliberate, and is
visible in one word of the output. I read the number and not the verb. The
lesson is the one this file keeps finding: *a check that already answers your
question in a word you skimmed past.*

**What survives of B, and its priority drops:** the 312px is real, it is the
largest overflow in the run, and it is **not a gate failure**. Cause 2 — 104px
of clearance for a bar that is not on the page — is still an unambiguous
defect and is still worth fixing. Cause 1 — four cards in one column at phone
width — is a list that scrolls, which is ordinary, and the product has already
decided it is allowed to.

**Cause 2 is worth fixing either way**, and independently of that decision:
104px of clearance for a control that is not on the page is wrong whether or
not the page is allowed to scroll.

## Handed over, not fixed

The fix is `app/src`, which is not this session's tree and is occupied by 2.2.
**The cause goes across, the same way the `.bk-wrap` one did.** What to check
afterwards: `.bk-plans` column count at 392, `.bk-wrap` `padding-bottom` on a
page with no `.bk-bar`, and the gate's number for `plans page` — 312 today.

---

# C fixed — the counter split, 2026-09-20

**The answer: the twelve were 8 and 4.**

```
before   12 steps do not fit — W16 is not met          (over 10 printed readings)
after     8 steps do not fit — W16 is not met
          4 fault(s) that are NOT W16 and are NOT steps that do not fit:
             4 x  no vehicle-count control on the second tenant
```

**8 + 4 = 12.** The split did not change what is measured — it changed what the
sentence is allowed to claim. **The four were one fault, counted once per
width, and it is a missing seed fixture rather than a layout problem**: the
second tenant has no vehicle-count control, which `seed-two-tenants.mjs`
provides. A third of that headline number was a seeding gap being reported as
steps that do not fit.

**Proved both directions, and the second is the one that matters:**

- **A run where the count is right** — this one: 8 named W16 failures, 4 named
  non-W16 faults, tallied by kind.
- **A run where it would previously have lied** — the two runs already on disk
  print `12 steps do not fit` over the same 10 readings. That is the lie,
  captured before the fix rather than reconstructed after it.
- **And the measurements are untouched:** all **48** step readings (10 failing,
  38 passing) are byte-identical between the run before the split and the run
  after. The split moved no number; it only stopped one number speaking for
  another.

**`failing` still drives the exit code**, which is correct — every fault should
fail the run. What changed is that only `w16Failing` may call itself *steps
that do not fit*, and every other fault names itself through `fault()`. The
tap-floor block still adds its own after the summary prints, which is now
stated in the comment rather than being an invisible reason the totals never
added up.

**The one-line description of this whole class, which is Andrew's manager's:**
**a general fault count wearing a specific sentence.**

---

# THE HANDOVER — the 104px, for whoever takes it, 2026-09-20

**FIRST, A CORRECTION TO THIS DOCUMENT.** It called the 104px *"an unambiguous
defect"* and *"wrong whether or not the page is allowed to scroll."* **That was
wrong, and it was wrong because I read the rendered padding and not the rule
that produced it** — the same mistake, in the same document, that I had just
corrected about `gate: false`. `booking.css:115` documents the 104px as
deliberate:

> *"the old literal exactly, so the confirmation screen, the manage screen and
> the plans page are untouched by this change. A page that HAS the bar
> overrides it below, because the bar now takes its own space instead of being
> guessed at."*

It is a **deferred migration**, not an oversight. Roadmap 2.15 changed how the
bar reserves space, kept the old number as the default so bar-less pages were
not touched in that change, and overrode it where the bar actually exists.

## The element, the number, and the inversion

Measured on both sides, same width, fresh loads:

```
/book/demo-detail        HAS .bk-bar (73px tall)    --bk-bar-clear: 26px    wrap padding-bottom: 26px
/book/demo-detail/plans  NO .bk-bar, no fixed or    --bk-bar-clear: 104px   wrap padding-bottom: 104px
                         sticky element at all
```

**The element:** `.bk-wrap`, `padding-bottom: var(--bk-bar-clear)`
(`booking.css:290`). The variable is set to `calc(104px + var(--safe-b))` on
`.bk` (line 119) and overridden to `var(--bk-sp-5)` — 26px — by
`.bk:has(> .bk-bar)` (line 1046).

**Inherited, not content-driven.** It is a custom property on an ancestor. It
does not vary with what is on the page, which is why it is identical at every
width and why it did not move when the column width changed.

**The inversion, stated plainly:** *the 104px of bar clearance applies only to
the pages that have no bar, and the pages that have one use 26px.* Every
consumer of the 104px default is a page with nothing to clear.

## Why the obvious patch is the wrong one

The obvious patch is to change the default on line 119. **Its blast radius is
four surfaces, and they are the exact four that were deliberately excluded
once already**: the plans page, the confirmation screen, the manage-booking
screen and the unsubscribe page. Three of them currently fit; changing the
default alters the bottom spacing on all four to fix the one that does not.
**Repeating a change that a previous item chose not to make, without saying
why it is safe now, is how a deferred decision becomes an accidental one.**

The narrow alternative — a per-page override for the plans page — buys the
104px back on one surface and adds a per-page exception to a variable whose
whole purpose was to stop the number drifting between places.

**So this is a scoping decision, not a repair**, and it wants whoever owns
`booking.css` to make it rather than a measurement session to smuggle it in.
What the measurement can say: **104px of a 844px screen — 12% — is reserved on
the plans page for a control that is not on it**, and removing it takes that
page's overflow from 312px to about 208px, which does not close it on its own.

## What the rest of the 312px is, so the trade is visible

Content-driven, and unaffected by the above: four `.bk-plan-row` cards at 177px
stacked in **one column** at 392 (`712px`, 84% of the screen), against a
two-column `296px 296px` grid at 768 where the same four occupy 370px and the
page overflows by **zero**. **That half is a list that scrolls, on a surface
the gate already declares `{ gate: false }` — advisory, not a failure.**
