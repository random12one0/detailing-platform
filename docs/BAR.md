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
   the mark, not the reach. The instrument is `elementFromPoint`, stepping
   outward ONE PIXEL AT A TIME from the element's own edges — not from a rounded
   centre, which loses a pixel on a fractional rect and reported 43 on a 44px
   target — and an ancestor under the pointer is NOT a hit, or the card behind
   every control makes it look enormous. Baseline the probe on a synthetic
   20x20 control every run before believing a number from it.
