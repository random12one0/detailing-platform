# THE BAR

**Claude Cowork's, written down in the repo on 2026-09-12.** It lived in his own
output folder for this whole run, which meant the standard every commit was
being scored against was invisible to the repo, invisible to a fresh session,
and would have been lost at the next `/clear`. That is the same failure that
produced `ROADMAP.md`, and this file is the same remedy.

**The bar is written down BEFORE the work, not after.** 100% on the detailer
side means all of the following are true, and each is checkable by someone who
was not involved.

- **No horizontal scroll, no overflowing element, no text under 11px, and no
  touch target whose REAL HIT AREA is under 44px**, on every screen at 390px and
  at 1440px.
- **One currency formatter, one date formatter, one phone formatter, one primary
  color.** Zero exceptions anywhere in the product.
- **No sentence used as a title, no em dash joining two halves of a sentence, no
  British spelling** — zero instances, checked by string sweep, not by reading.
- **Every derived metric has a data floor and a written empty state.** No
  *"most booked: 1"*.
- **Every chart has values or an axis**, and a zero line where values can go
  negative.
- **No screen leaves more than 25% of a 1440px viewport as empty gutter.**
- **Every destructive action sits under a heading that describes it, and asks
  before acting.**
- **The exhaustion test passes** on all 22 settings screens and all 11 setup
  steps.
- **The regression baseline is unmoved.**

**If the work is done and any of these is false, the answer is not 100%,
regardless of how much was built.**

---

## The tap floor moved from 32 to 44 today

**Decided by Claude Cowork on 2026-09-12, and recorded here so nobody later
reads it as drift.** Three different floors were live in this repo at once, and
that is how a 30px control ships with a green check beside it:

- his `run-protocol.md` recorded **32px**, and was the document being scored
  against;
- `PRODUCT.md` § quality floor said **46px**;
- `theme.css`'s segmented-control note reasoned that **36 clears the floor**,
  on the grounds that the floor was 32 — which made 30 arguably passing.

**44 governs.** His reason, in his words: it is what every measurement this run
has been taken against, it is what the fixes already shipped were sized to, and
a second floor introduced now would mean re-auditing everything already signed
off. **44 is a FLOOR and not a target** — a control whose real hit area lands at
46 or 48 because of how the tiling falls is fine and is not to be trimmed back.

## The sanctioned exception, and it is about the MARK and not the target

**A mark may stay visually smaller than 44 only where an `::after` negative
inset carries the HIT AREA to 44.** The mark and the target are two different
things: a 7px scroll dot, a 31px zone on a page diagram, a 36px chip and a 36px
close button are all correct as drawn, and shrinking a design to satisfy a floor
is the wrong answer. An absolutely positioned `::after` takes no part in layout,
so the paint does not move and the pointer reaches further.

```css
.thing { position: relative; }              /* the ::after needs a containing block */
.thing::after { content: ""; position: absolute; inset: -5px 0; }
```

**Two ways this goes wrong, both measured here on 2026-09-12:**

1. **THE PITCH HAS TO OPEN WITH THE TARGET.** Two 44px targets 6px apart do not
   both exist — they overlap and each steals its neighbour's presses, which
   trades a small target for a WRONG one. `.chip` needed `margin-block: 2px`
   alongside its `::after` so a wrapped row tiles exactly. Before that, chips
   with a neighbour above or below measured **31px** of reachable height while
   their isolated siblings measured 43.
2. **A BOUNDING RECT CANNOT SEE ANY OF THIS.** `getBoundingClientRect` reports
   the mark, not the reach. See the instrument section below — it took four
   rebuilds and produced a wrong number each time.

3. **A CLIPPING ANCESTOR CUTS THE `::after` AND THE STYLESHEET STILL READS
   CORRECT.** `.chiprow` carries `overflow-x: auto` for horizontal scrolling,
   and CSS has no way to scroll one axis and overflow the other — a non-visible
   overflow on EITHER axis makes the other a clipping box. The row was 42px
   tall, so every chip in it answered across exactly 42px while
   `getComputedStyle` reported `inset: -5px`. **It was the EN/ES language
   picker**, the one control a detailer reaches for when the dashboard is in a
   language they cannot read. Fixed with vertical padding on the row, not a
   negative margin: a negative margin pulls the next row up under the chips'
   own `::after` and hands it three pixels of somebody else's presses.

4. **A BORDER SILENTLY EATS THE EXTENSION.** `inset` on an absolutely
   positioned child resolves against the containing block's **padding box**, so
   a 2px border means `inset: -8px` reaches only 6px past the visible edge.
   `.placespot` measured 43.19 against a rule that says 47. `.chip` and
   `.btn.sm` have 1px borders and land on exactly **44.00** — passing, and
   worth knowing that they have no margin left.

## THE ONE EXEMPTION: a link inside a sentence of running prose

**Claude Cowork's ruling, 2026-09-12, and it is CONDITIONAL rather than free.**

> A link sitting inside a sentence of running prose is exempt from the 44 floor
> — **but only where the same destination is ALSO reachable from a full-size
> target on the same screen.**

**WHY THE EXEMPTION EXISTS.** Stretching a mid-sentence link to 44px makes its
hit area cover the lines of text above and below it, turning the whole paragraph
into a mis-tap zone. That is worse than the thing the floor is trying to prevent.
**A floor that makes the page harder to use is being applied wrongly.**

**WHY THE CONDITION EXISTS, and it is the more important half.** Without it the
exemption is a loophole in which a 14px link is the ONLY route to something. The
condition is what keeps it an exemption about TYPOGRAPHY rather than about
reach: the destination is always available at full size, and the inline link is
a convenience on top of that.

**"THE SAME DESTINATION" MEANS THE SAME DESTINATION, NOT A NEARBY ONE.** A
full-size row that opens a screen which then contains the link is a DIFFERENT
destination and does not satisfy the condition. That distinction was not
hypothetical: the gear's support address was an inline `mailto:` at 183x14, and
the only other support route on that screen was the "Report a problem" row at
354x62 — full-size, and a different destination. **The condition failed, so the
exemption did not apply**, and the address came out of the sentence onto its own
line as a `.btn.sm` link, which is what `ReportProblem` already did one screen
over.

**NOTHING IN THE PRODUCT CLAIMS THIS EXEMPTION TODAY** — measured 2026-09-12,
detailer side. It is written down for the case that arises, not to cover
anything shipped. **A session that finds itself reaching for it should first
check whether the sibling screen has already solved the same problem with a
full-size control**, because that is what happened the only time it came up.
(The marketing pages carry the same address inline; they are outside this bar,
which is scoped to the detailer side, and that is a gap rather than an
exemption.)

## THE CALIBRATION PROCEDURE — REQUIRED, NOT ADVICE

**Between two reviewers in a single run, a coarse probe produced FOUR false
findings and ONE false clear.** The next session will make the same mistakes
unprompted unless this is a procedure. **A tap-target number produced without
every step below is not evidence and must not be reported.**

1. **Put a synthetic 20x20 element in the SAME document, measure it with the
   same probe, and SUBTRACT THE BIAS from every number.** It reads **20.98** in
   this product, so the instrument over-reads by 0.98px. A raw 43 is a 42; a raw
   44.98 is a 44.
2. **Binary-search the boundary, sub-pixel.** Integer stepping reports 43 on a
   target that is 44 — that alone nearly condemned four correct buttons.
3. **Search from the element's OWN EDGES**, never from a rounded centre: a
   fractional rect loses a pixel.
4. **`scrollIntoView({ block: "center" })` before probing.** `elementFromPoint`
   returns null outside the viewport, so the last row of every screen reads
   short. Fixing this alone raised one step's control count from 4 to 19 — the
   earlier sweeps were under-counting what they even looked at.
5. **An ancestor under the pointer is NOT a hit.** `e.contains(el)` in the
   predicate makes every control look enormous, because the card behind it
   contains it. Only `e === el || el.contains(e)`.

**AND READ THE COMPUTED VALUE, NEVER THE RULE.** `getComputedStyle` reported
`inset: -5px` on chips that answered across exactly 42px, because a scrolling
ancestor was cropping them. The stylesheet and the thumb are different numbers.

## THE INSTRUMENT, and it lied four times before it told the truth

Every one of these produced a confident wrong number first:

- **Binary-search the boundary, sub-pixel.** Integer stepping reports 43 on a
  target that is 44. Both reviewers nearly filed four correct buttons as short.
- **Measure from the element's own EDGES**, not from a rounded centre — a
  fractional rect loses a pixel.
- **An ancestor under the pointer is NOT a hit.** `e.contains(el)` in the
  predicate makes every control look enormous, because the card behind it
  contains it. Only `e === el || el.contains(e)`.
- **`scrollIntoView` first.** `elementFromPoint` returns null outside the
  viewport, so the last row of every screen reads short — and fixing this alone
  raised one step's control count from 4 to 19, meaning earlier sweeps were
  under-counting what they measured.
- **CALIBRATE EVERY RUN AND SUBTRACT THE BIAS.** A synthetic 20x20 div in the
  same document reads **20.98**, so the instrument over-reads by 0.98px.
  A number reported without that removed is the instrument, not the control.
