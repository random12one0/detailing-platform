# Design system — "The Thread"

**Read this before touching anything a person looks at.** Every visual
decision in the product derives from this file. If a change contradicts it,
either the change is wrong or this file gets updated first — never silent
drift. Drift back to generic-SaaS defaults is the failure mode this document
exists to prevent.

**This file outranks any skill's opinion.** From roadmap 1.5 onward the
skill-collision rule is back on: auditors and appliers only
(`impeccable`, `animate`, `ship-check`). No direction-inventing skill runs
against this product again unless the owner reopens the direction.

## Where it came from

Replaces **"Raking Light"** (chosen 2026-08-27, deprecated as identity
2026-08-28 by the owner's decision in `DESIGN.md`). His answer when asked
what was worth keeping was *"Nah. Throw it out. It's all fine."* — so
nothing carries over from it as a look. The old file is anti-reference; its
useful residue is listed in **§11**.

The direction is **`docs/design-directions/5-the-thread.html`**, built
2026-08-29 and approved by the owner the same day — *"so much better", "the
layout is good, I like it"* — then taken through fifteen rounds of his
corrections. That file is the reference rendering and the tie-breaker: where
this document and that page disagree, **the page is right and this document
is stale**, because the page is what he approved.

The evidence underneath it, in the order it should be read:

| file | what it is |
|---|---|
| `docs/design-directions/README.md` | every round, what was found by looking, what it cost |
| `docs/design-directions/BUILD-BRIEF.md` | the plan — **§7 carries his answers and overrides §2** |
| `docs/design-directions/VERDICT.md` | why the first four directions were killed |
| `docs/references/ANALYSIS.md` | his seven reference sites read at code level — the frame |
| `docs/references/TASTE-NOTES.md` | his own words on how those sites MOVE (primary evidence) |
| `docs/design-brief.md` | the interview; §B4 and §B5 are the load-bearing answers |
| `docs/references/APPLE-READ.md` | one input among eight, not the frame — his instruction |
| `docs/design-knowledge.md` | the anti-slop floor; §1 is not negotiable by any skill |

---

## The idea

A detailer's Saturday already exists. It is just scattered across a text
thread, a Yelp inbox and a note on a phone. **The product does not add work;
it sorts what is already there.** So the interface is one continuous dark
ground that the reader travels down, and the work of the design is
*gathering* — scattered things resolving into ordered ones as you go.

That is why the signature move is four text messages becoming four rows of a
schedule, and why there is exactly one accent: the page is mostly the ground
and the type, and the green is what marks the thing that has landed.

Dark is not a mood choice and it is not a default. It was tested against the
one condition that would have killed it — *"Sunlight is NOT a constraint"*
(`design-brief.md` §B5): the dashboard is read before and after a job, not
out in the sun mid-detail. Dark stays on its merits.

---

## The laws

Not suggestions. Where a test enforces one, it is named.

1. **One continuous ground, and every section a different skeleton over
   it.** His words: *"throughout the entire website no one scroll area, one
   page looked the same — as you scroll everything morphs into different
   layouts."* Two sections that share a skeleton is the failure. The landing
   page runs nine sections and nine skeletons; a dashboard screen is not
   exempt, it just has fewer.
   *Enforced by `tests/composition.test.mjs`.*

2. **Something is always animating.** His requirement, recorded in
   `BUILD-BRIEF.md` §7 and easy to lose in a refactor. The ground carries
   drifting lights, a dot lattice and grain that never stop. A screen where
   all motion is triggered is a screen that is dead while you read it.

3. **Motion is not spendable.** *"I don't want us to lose any of that cool
   animations and scrolling effects... we might have to change them up,
   switch them, the order, maybe completely redo some of them."* Re-point a
   mechanic, re-order it, rebuild it — do not quietly end up with fewer
   because a new layout was easier to lay out flat. If a mechanic is
   deliberately dropped, say so and say why, the way round ten did.
   *Enforced by `tests/composition.test.mjs`.*

4. **Two motion presets and nothing else: reveal, and scrub.** One rAF
   listener, one ease, transform and opacity only. Ad-hoc durations are how
   a page ends up feeling like a pile of effects instead of one system.
   Exits are faster than entrances (`--t-exit` against `--t-reveal`).
   *Enforced by `tests/composition.test.mjs`.*

5. **Reveals are position-driven and reversible, and the arrival line is
   not the departure line.** An element arrives when its top crosses 82% of
   the screen; it does not leave until it is past the bottom edge. The band
   between them is exactly as wide as the easing at the end of a scroll
   container can travel, so the two lines can never cross and nothing
   oscillates. Two consequences that were both real bugs: the trigger line
   must stay reachable at maximum scroll, and **anything that changes the
   document's height must re-cache positions** — a `<details>` toggle, a
   font arriving, a width change.

6. **A pin must return more than it costs, and it declares its cost.** A
   locked section's floor is about **1.8 screens** before any beat happens —
   one screen of sticky stage plus the stillness budgeted at each end — so
   the question is never "should this pin" but "does it buy two screens".
   The thread holds 3.0 screens for four beats and prints *"holds for 3.0
   screens · then releases"* on itself. Nothing else on the product pins.

7. **Distribute the beats linearly across a hold; ease each beat
   individually.** Easing the whole hold crushes every beat into its middle
   — measured, and worse than the problem it was fixing. Inside a lock the
   page also gets heavier: a wheel notch carries half as far and the
   smoothing may not bank more than 0.55 of a screen. See DECISIONS.md,
   "Ease the beat, not the hold".

8. **Two faces, and every figure is monospaced.** Archivo worked across
   both axes, JetBrains Mono for money, time and counts, with
   `font-variant-numeric: tabular-nums`. A price set in the body face is a
   bug. See §5.
   *Enforced by `tests/composition.test.mjs`.*

9. **Legibility beats style, and it is measured, not eyeballed.** Text
   ≥ 4.5:1 on every surface it sits on; large bold ≥ 3:1; non-text
   interactive edges ≥ 3:1. A ramp's dim end is a contrast floor, not a
   taste call — `--fog-2` exists at `#7B858A` because `#6B757A` measured
   4.22:1 and that ramp carries every 10–13px label. **Text on a photograph
   cannot be checked from CSS**: screenshot the box with the text hidden,
   read the lightest pixel, and bind the scrim to the text block rather than
   darkening the whole picture until it stops being one.
   *Enforced by `tests/design-contrast.test.mjs`.*

10. **Never a grey placeholder box.** The Unsplash connector is wired and
    confirmed working. If it cannot find the right shot, **ask the owner** —
    he has said plainly he will go and source images rather than have work
    limited by what is to hand. And one distinction written into the markup
    so a later session does not "fix" it: **no photograph of a car is ever
    the platform's own subject** (we sell software), but photographs of
    their own work are what a *tenant's* site is made of.

11. **The house accent is fixed; the tenant's accent is customer-facing
    only.** His decision, `design-brief.md`: tenant colour comes from a
    curated four to six and appears on their site and their booking page.
    **The dashboard keeps one fixed house palette.** `app/src/lib/theme.js`
    remains the ONLY file allowed to compute or write colour from JS.

12. **Measure with layout values, not with transformed boxes.** This design
    animates by transform almost exclusively, so `getBoundingClientRect()`
    returns a scaled box for most of it. Anything measured *for layout*
    wants `offsetLeft` / `offsetWidth`; a rect is correct only when you
    genuinely need where a thing is on screen right now. And `offsetTop` is
    a document coordinate only when the offset parent is the body — inside a
    positioned section it is not. Both of these have already caused real
    bugs; see DECISIONS.md.

13. **No third-party JavaScript.** No GSAP, no ScrollTrigger, no Lenis, no
    Three.js. The whole of the direction's motion is hand-rolled and smaller
    than Lenis alone. This is not asceticism: it closed the GSAP Club
    licence question by not having it, which matters for something we sell.
    *Enforced by `tests/composition.test.mjs`.*

14. **One ground. There is no light theme.** Owner decision 2026-08-30 —
    *"no light theme needed"* — and it is a decision about the dashboard's
    light/dark switch, which goes. The light band (`--paper`) is the only
    light surface in the product, and it is a change of ground inside a dark
    page, not a second palette. The removal itself happens in roadmap 2.3
    and is scoped at the end of this file; do not rip it out of the shipped
    app before the new dashboard exists.

---

## Tokens

Defined once. The direction file holds them in its own `:root`; Phase 2
moves them into `app/src/theme.css` unchanged.

### The ground — cool-biased, so no pure mid-grey ever appears

| Token | Value | Job |
|---|---|---|
| `--ink-0` | `#0B0D0E` | the ground everything sits on |
| `--ink-1` | `#111417` | a surface lifted off it |
| `--ink-2` | `#171B1E` | the top of a panel gradient |
| `--ink-3` | `#1E2327` | the highest surface |
| `--line` | `#272D31` | every hairline and inset ring |
| `--line-2` | `#333B40` | a line that has to be seen |
| `--fog` | `#939CA1` | secondary prose |
| `--fog-2` | `#7B858A` | 10–13px labels — **the floor, do not darken** |
| `--bone` | `#F2F1EC` | the dominant: warm, **never `#fff`** |
| `--bone-2` | `#CFD2CE` | bone stepped back |

### The one sharp accent

| Token | Value | Job |
|---|---|---|
| `--ac` | `#38E08B` | signal green — the thing that has landed |
| `--ac-deep` | `#0E5C36` | the accent at rest, on light |

Signal green because orange was ruled out by name and he flagged his own
lean toward blue as *"kind of typical AI"*. One dominant plus one sharp
accent, never a timid even palette — `design-knowledge.md` §1.

### The light band

A light section is a **change of ground**, not a card. Warm off-white, never
paper white.

| Token | Value |
|---|---|
| `--paper` | `#EFEEE7` |
| `--paper-ink` | `#12161A` |
| `--paper-fog` | `#565F64` |
| `--paper-line` | `#D2D1C9` |

Two light bands on the landing page, and they are rhythm work as much as
emphasis: three added sections in a row without one leaves eight dark
screens together.

### Layout

| Token | Value |
|---|---|
| `--wrap` | `1180px` |
| `--gut` | `clamp(20px,5vw,48px)` |

Radii are a small set, used by role and not by habit: `100px` for pills
(nav, buttons, small state chips), `16–18px` for panels, `11–13px` for
sunken and inset blocks, `50%` for dots. `rounded-lg on everything` is a
named tell.

### Motion

| Token | Value | Job |
|---|---|---|
| `--e-out` | `cubic-bezier(.16,.84,.34,1)` | the only curve |
| `--t-reveal` | `950ms` | an entrance |
| `--t-exit` | `420ms` | a departure — faster, and unstaggered |
| `--t-hover` | `180ms` | pointer feedback |

There is deliberately **no second curve for pinned beats.** A message
leaving while a row arrives is an exit and an entrance, which takes the
ease-out above; the gentleness at the ends of a lock comes from budgeted
stillness, not from bending the curve.

### Atmosphere

Never a flat solid background. The ground carries, in this order of cost:
an SVG `feTurbulence` grain as a data URI at `opacity:.055` with
`mix-blend-mode:overlay`; two slow drifting radial lights; a drifting dot
lattice; and a pointer light on fine-pointer devices only. All four are
CSS-driven and none of them stops — that is law 2.

---

## Type

Two faces. Loaded from Google Fonts, both variable where it matters.

```
Archivo        wdth 62..125, wght 100..900   — everything that is words
JetBrains Mono wght 400;500                  — everything that is a figure
```

**Archivo alone, worked hard across both axes**, is the high-contrast
pairing `design-knowledge.md` §1 asks for — one variable font at its
extremes beats two safe families. The width axis carries as much of the
hierarchy as the weight axis does, which is the part that is easy to lose:

| Role | Class | Size | Axes |
|---|---|---|---|
| Display | `.disp` | `clamp(38px,6.4vw,86px)` | `wdth 112, wght 700` |
| Display, hero | `.disp.xl` | `clamp(38px,5.15vw,74px)` | `wdth 116, wght 760` |
| Display, small | `.disp.sm` | `clamp(26px,3.4vw,42px)` | `wdth 108, wght 640` |
| Eyebrow / label | `.lab` | `11px`, `.22em`, uppercase | `wdth 72, wght 620` |
| Lede | `.lede` | `clamp(17px,1.7vw,21px)`, `56ch` | inherits |
| Body | — | `17px / 1.5` | `wdth 100, wght 400` |
| Every figure | `.mono` | by context | tabular-nums |

Size jumps are 3x or more, not 1.5x. Display line-height is `.94` with
`-.028em` tracking; at that size the default leading is a hole.

**A display size is derived from a measurement, not from taste.** The hero
clamp is what it is because the longest rotating tail measured 741px inside
a 742px column at 1440 and was wrapping. Below 470px the *width* axis
absorbs it rather than the size, so a phone keeps a 38px headline. Any
change to a display string re-measures the longest one at 392, 1440 and
1920.

---

## Composition

- **A collection of records is a ruled list.** A card is for an object you
  pick between or act on one at a time. Mapping records onto cards is the
  specific shape that keeps coming back and it has its own test.
- **Two to four choices is a segmented control, never a native `<select>`.**
- **Numbers only on sequences.** `01 / 02 / 03` on content that is not a
  sequence is the "structure as decoration" tell. The pricing terms are
  numbered because they are an enumeration; the comparison table's rows are
  not.
- **A table when it genuinely is one** — a comparison across two axes. The
  landing page has exactly one and nothing else on the page is tabular.
- **Native elements before hand-rolled ones.** The FAQ is
  `<details>`/`<summary>` with `::details-content` and `interpolate-size`
  behind an `@supports` guard: no script, no ARIA to get wrong, keyboard and
  screen-reader behaviour free, and it survives every script on the page
  failing.
- **Centred exactly once, at the end.** Centred everywhere is the tell.

---

## Verification

Visual work is verified by **looking**, and the report says what was
observed — never "this should work".

- Screenshot at **1920, 1440x900, 768x1024 and 392x844.** The three small
  ones are a floor, not the whole check. **1920 is the owner's own monitor**
  and it is where "there is not enough content to fill the viewport" bugs
  live; they get *better* on a phone. The 01/02/03 rail was broken at 1920
  from the day it was built and three checks missed it.
- Read the console at every width, in the normal path **and `?lite=1`.**
- Sweep the reveals down **and back up** — an element above the arrival line
  and still hidden is a defect; some element still hidden below the fold at
  almost every position is the proof the reveal was not simply switched off.
- **Baseline a new check against the last known-good version before
  believing what it says about your change.** A checker that fails a page
  that was already verified is measuring the wrong thing. Two numbers are
  diagnosable; one is not.
- **When he reports something, reproduce it at his conditions before forming
  a theory.** And when a report is ambiguous between "X is broken" and "X is
  gone", ask — do not delete X.
- Before cutting for length, **measure every section's scroll cost.** A note
  in a previous round's write-up is not evidence.

---

## Degradation

Apple's strategy, with one thing borrowed from riangle — the conclusion of
`docs/references/APPLE-READ.md`, and **this is the answer to the
device-tier question the roadmap left open for 1.5**.

**Never ask what the device is; ask whether the thing arrived.** No
`deviceMemory`, no `hardwareConcurrency`, no `saveData`, no user-agent
tiering. Guessing quality from hardware buys less than a load timeout does,
and its failure mode is blacklisting a browser by name.

The whole defence is three layers:

1. **`.lite`** on the root element turns every animation off by rendering
   the same end state the animation targets — one code path, so it cannot
   rot. Reachable as `?lite=1`.
2. **`prefers-reduced-motion`** routes into that same `.lite` path. Not a
   second implementation.
3. **Nothing is hidden behind an animation.** Every scrub target has a
   `.lite` end state and every revealable ends at `.in`. If the script never
   runs, the page reads.

The one piece worth borrowing from riangle is an **fps governor**, because a
page can load fast and still animate badly. It is not built yet and nothing
on the page needs it — there is no WebGL anywhere. Add it when something
measured is dropping frames, not before.

`?smooth=0` disables the weighted scroll, so the two can be compared on the
same phone in one sitting.

---

## Never-defaults

In addition to everything above. From `CLAUDE.md` and
`docs/design-knowledge.md` §1, and they are not negotiable by any skill.

- **Fonts:** Inter, Roboto, Open Sans, Lato, Arial, system-ui as a *design
  choice* — and Space Grotesk, the "trying to be original" default.
- **Colour:** purple-to-blue gradients on white; timid evenly-distributed
  palettes; a pure mid-grey.
- **Layout:** three evenly spaced cards; everything centred; five identical
  full-width stacked sections; `rounded-lg` on everything; an accent bar on
  a rounded card.
- **Surface:** a flat solid background with no atmosphere.
- **Structure as decoration:** numbered markers on a non-sequence; emoji as
  section markers.
- **Copy:** "modern and clean", "seamless", "elevate", feature triplets,
  Lorem ipsum, "Feature One / Feature Two / Feature Three".
- **Claims:** nothing the product does not do. "Start free" shipped on the
  direction page when there is no free tier; `landing-pricing.test.mjs`
  exists because of that class of bug. No invented testimonials, customer
  counts, logos or statistics — the marketing deck ruled them out itself,
  and there are no customers yet to count.

---

## §11 — what survived from "Raking Light"

The look did not. These did, and they are contracts rather than style:

- **The accessibility floors** — 4.5:1 body, 3:1 large and non-text, both
  measured. They were right and they are unchanged.
- **`app/src/lib/theme.js` is the only place colour is computed in JS.**
  Tenant accents are contrast-corrected there against the active ground.
- **Tokens are defined once** and everything reads `var(--…)`. The old
  system's real achievement was that discipline, not the palette.
- **Content and copy facts**, per `DESIGN.md`: `app/src/landing/
  LandingPage.jsx` is the substance the marketing pass edits, not a file to
  throw away.
- **The composition rule** — records are lists, cards are objects — which
  was written down, ignored, and then given teeth by a test. It carries over
  word for word.

---

## What this file does NOT settle

Named rather than invented. Direction-inventing is banned from here on, so
these go to the owner rather than being decided by a skill.

1. ~~**There is no light theme.**~~ **SETTLED 2026-08-30 by the owner: "no
   light theme needed."** The dashboard's light/dark switch goes. One ground,
   with the light band as the only light surface.
   - **This is about the DASHBOARD's toggle**, which is the thing he was
     asked about. It does not by itself decide the customer booking page,
     which is a separate surface — see item 2.
   - **Nothing is ripped out yet, deliberately.** `app/` still ships the OLD
     system, where light mode works; deleting it before the new dashboard
     exists would degrade a working product for no gain. **The removal
     happens in roadmap 2.3**, and it touches exactly four places:
     `app/src/theme.css` (three `[data-theme]` blocks),
     `app/src/lib/theme.js` (`THEME_BG`, `DEFAULT_ACCENT`, `brandVarsFor`'s
     mode argument, and the stored preference), `app/src/screens/more/
     Appearance.jsx` (the Light/Dark chips), and the per-user preference key.
     `tests/design-contrast.test.mjs`'s "outgoing: dashboard light" block goes
     with it.
   - The reasoning, on the record: sunlight is not a constraint
     (`design-brief.md` §B5), a second theme doubles every contrast check and
     every tenant-accent retint test forever, and the identity is the dark
     ground. The cost is that anyone who prefers light UI loses it; he
     accepted that.

2. ~~**The customer booking page is light-first.**~~ **SETTLED 2026-08-30
   by the owner: dark, like everything else.** The deciding argument was the
   positioning, not taste — the page claims the booking form is built INTO
   the detailer's site, and a light form inside a dark site breaks that on
   sight. **What survives:** the page keeps its own fixed ground independent
   of any dashboard state, which is what `BookingBusinessContext.jsx`'s
   comment was always actually arguing for — re-point that comment, do not
   delete it. **Reopen in Phase 3**, when bespoke tenant sites exist and one
   of them is light; "follow the tenant's own ground" was offered and
   declined only because there is nothing to follow yet.

3. **The tenant's curated accent set has no colours in it yet.** He decided
   "a curated four to six, customer-facing only"; nobody has picked the four
   to six. Needed before 2.4.

4. **The dashboard's own skeletons are undrawn.** Law 1 says every section
   gets a different one, and the landing page has nine worked examples; the
   five dashboard tabs and eleven settings screens have none. That is the
   body of 2.3, and it is where this system will actually be tested — a
   marketing page is a much easier thing to be beautiful on.

5. **Mid-range Android is still unmeasured** (`README.md` "Still open" #4).
   Nothing uses WebGL so the risk is low, but nobody has put a thumb on a
   cheap Android.

---

## What the tests enforce

Both suites are credential-free and run from the repo root.

```bash
node tests/composition.test.mjs
```

```bash
node tests/design-contrast.test.mjs
```

`composition` checks the rules that keep getting broken by hand: records
mapped onto cards, a hand-written `<select>` with two to four options, the
two-face type rule, third-party animation libraries, motion presets, and
that the laws above are actually still written in this file. `design-contrast`
reads the shipped token values and prints a WCAG ratio for every pair this
file promises.

Neither can check whether it looks good. That is what the screenshots at
four widths are for.
