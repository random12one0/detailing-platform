# DESIGN SCHEME — Prime Mobile Detailing  *(site 1 · `ex1`)*

**WRITTEN AFTER THE FACT, AND THE ONLY ONE THAT EVER WILL BE.** Site 1 was built
before `docs/DESIGN-SCHEME-TEMPLATE.md` existed; this is it filled in from the
finished pages so the next session has a **worked example** rather than a blank
form. **Every value below is read out of `docs/tenant-sites/v-goldenhour*.html`,
not remembered.** Site 2 onward: the scheme comes first and Andrew approves it
before any HTML.

Built pages: `v-goldenhour.html` · `-work.html` · `-prices.html` → served at
`/ex1`, `/ex1/work.html`, `/ex1/prices.html`.

---

## 1. WORDS

```
Friend  ────────●────────  Authority
Young & Innovative ───●──  Mature & Classic
Playful ──────────●──────  Serious
Mass Appeal ────●────────  Elite
```

**Three adjectives, ranked:**
1. **Straight** *(most important)* — the price you are quoted is the price you pay
2. Warm
3. Capable

**We are a working detailer who turns up on time, not a luxury marque.**

## 2. SUBJECT

- **Subject:** **the last hour of daylight on wet paint** — warm sun raking a
  flank, water still beading, the moment before the towel.
- **Why it suits this business specifically:** it is a *mobile* detailer, so the
  work happens outdoors in whatever light there is, on somebody's driveway. A
  studio subject would be a lie about where this business operates.

*(Nothing on the banned list. The earlier draft called the business "Sundown
Detail Co." with the tagline "the last hour of light, at your kerb" — the SUBJECT
was right and the NAME borrowed it, which is what Andrew rejected. The subject
belongs in the art direction; the name is `[plain word] + [the trade]`.)*

## 3. THE TILE

### Colour

| role | value | used for |
|---|---|---|
| ground | `#F4EFE5` warm bone | the page background, never flat |
| ground-deep | `#E7DFD0` | behind the rounded shell |
| surface | `rgba(255,255,255,.46–.52)` | cards, FAQ rows, the upcharge box |
| surface-dark | `#171310` pitch | the money band, the booking widget, the footer |
| text-primary | `#17130E` | 16.13:1 on bone |
| text-secondary | `#5B534A` | 6.59:1 on bone, 5.59:1 on the lit warm peak |
| accent | `#1A46DC` cobalt | 6.20:1 on bone — headings' final word, ticks, links |
| accent-on-dark | `#FFA840` amber | 9.61:1 on pitch — the same job on the dark bands |
| accent-on-photo | `#A8BEFF` | 5.39:1 over the hero scrim on a **white** photo |
| border-rule | `rgba(23,19,14,.14)` | decorative hairlines only |
| border-edge | `rgba(255,255,255,.42)` | form edges on dark, ~3.8:1 |
| success | `#0E7A34` / `#3FD37A` on dark | the live availability dot |
| stars | `#8A5200` on light | 5.57:1 |

**Two figures were wrong when typed from judgement and right only after the
calculator ran** — stars at `#B36B00` were 3.65:1, the form edge at `.30` was
2.65:1. Both were corrected, not rationalised. **Every ratio here was taken
against the composited LIT ground**, including the hero's, which is computed
against a white photograph because the slot takes the detailer's own uploads.

### Type

- **Display:** Bricolage Grotesque — 800, variable width 76–88
- **Body:** Instrument Sans — 400 / 500 / 600
- **Scale** (as built):

```
  hero      clamp(40 → 102) / .94      largest thing on the page
  h1        clamp(38 → 86)  / .94      tab pages
  h2        clamp(28 → 58)  / 1.02
  h3        19–25 / 1.1
  body      15–16 / 1.55
  small     11–13 / 1.4
```

- **The largest thing on the page is 102px**, against 15px body — a 6.8× jump.
- **Measure:** lede capped at 34–36ch, body prose at 44–52ch.

### The two or three things that carry the look

1. **The final word of every heading in the accent** — *across **North
   Seattle***, *Common **questions***, *What is in **each package***. Discipline
   is the device: applied to some headings it reads as an accident.
2. **The hero photograph IS the ground**, with the headline, the stats, the
   availability pill, the review pill and the trust bar all sitting on it.
3. **A lit bone ground** — a warm sun that follows the pointer, a cold
   counter-light, two drifting dot fields and a grain. Never a fill.

## 4. GROUND

- **Ground treatment:** four layers — `--bone` base, a pointer-tracked warm
  radial lerped at 0.09 plus a cold counter-radial, two mote fields drifting at
  58s and 91s in opposite directions, and an SVG turbulence grain at .30.
  The dark bands each carry two radials of their own.
- **Depth:** ~19 by the stated formula (7 gradients across the page + shadows +
  backdrop blur on the pills, dock, trust bar and header). Above the ≥15 floor.

## 5. SHAPE

- **Corner radius:** 999px (buttons and pills) · 20px cards · 12px inputs ·
  26px page shell · 16px the segmented nav
- **Border width:** 1px decorative · 1px control edge at the 3:1 alpha
- **Shadow:** used sparingly and only where something floats — `0 6px 24px
  rgba(10,7,4,.20)` on the pills, `0 10px 34px rgba(10,7,4,.20)` on the dock.
  Depth on the dark bands is made of **light**, not shadow.

## 6. SPACING & LAYOUT

- Scale in use: `4 · 6 · 8 · 10 · 14 · 16 · 22 · 26 · 30 · 34 · 44 · 56 · 66 · 78`
- **Max content width:** none — full-bleed inside a 14px shell margin
- **Breakpoints:** 360 / 760 / 1000, plus a `(min-width:761px) and
  (max-height:500px)` portrait guard so a rotated phone changes nothing
- **Phone is a re-layout:** home is 2,553px at 392 against 2,661px at 1440 —
  it does not grow. The trust bar leaves the photograph and stacks; the review
  pill is dropped; the dock appears.

## 7. MOTION

- **Entrance:** 320–420ms, `cubic-bezier(.22,.61,.36,1)`
- **Exit:** 190ms, same curve
- **Hover:** 180–260ms
- **Which moments get motion:** the pointer light on the ground; reveal on
  scroll (per-element, script-added hidden state); the stat strip counting up
  once on arrival; the booking widget's step change; page cross-fades between
  tabs; hover on everything a pointer can reach; the standing Book glow.
- **`prefers-reduced-motion`:** all of it off, the page reads identically, and
  the page transition is disabled at the at-rule as well as in script.

*Site 1 predates the Carbon table in §7 of the template and uses one house curve
throughout. **Site 2 uses the Carbon values.** Asymmetric entrance/exit curves
are the specific thing site 1 does not do and site 2 should.*

## 8. COMPONENTS

| component | variants | states specified? | when NOT to use |
|---|---|---|---|
| button (primary) | ink pill · amber pill on dark | default / hover / focus-visible / disabled | more than one per screen |
| button (secondary) | outline pill | default / hover / focus-visible / disabled | where a link would do |
| nav | sticky header (desk) · dock (phone) | default / hover / current | — |
| form input | text · select | default / hover / focus-visible | — |
| card | package · FAQ row · gallery tile · job row | default / hover | — |
| footer | one | — | — |

Labels follow **{verb} + {noun}**: *Book Full Detail*, *Get a price*, *Book now*.

## 9. DEVICES — 16 on the home page

- [x] A1 lit ground, four layers
- [x] A2 real photograph above the fold — hero top at 88px
- [x] A3 scrim under text on a photograph
- [x] A4 the price not at body size (up to 68px)
- [x] B1 accent-final-word headings, every one
- [x] B2 the giant bleeding footer wordmark
- [x] C1 floating availability pill with a live dot
- [x] C2 review pill with an avatar stack
- [x] C3 frosted trust bar ON the photograph
- [x] C5 the stat strip
- [x] D4 the page inside a rounded shell
- [x] D6 two-column tick lists *(prices page)*
- [x] D7 price table tabbed by vehicle size *(prices page)*
- [x] E1 the portfolio row *(work page — **not** the home page)*
- [x] F1 floating dock, with a sliding current indicator
- [x] F2 the phone gets a different layout, not a squeezed one
- [x] G1 cursor glow · G2 weighted-feel motion · G6 numbers roll up · G7 reveals

- **Buying variety with:** **rhythm** — the ground changes four times down the
  home page (photo → lit bone → lit bone → pitch → pitch).
- **No section shape repeats:** hero on a photograph · a marquee · a review rail ·
  an accordion in two columns · a stepped widget · a footer with an oversized
  wordmark.

## 10. PHOTOGRAPHY

- **Hero:** a dark car at sunset, low angle, sun flaring off frame left. It is
  the ground of the whole top of the page. **Measured** at 88px from the top of
  a 900px viewport.
- **Total:** 12 on the work page, 4 on the home page, **0 on the prices page** —
  deliberately: a page about numbers owes no photograph.
- **Scrim:** always, and computed against a white photograph, not this one.
- **Contact sheet:** 12 candidates rendered and looked at. Three rejected for
  the wrong trade, one for a rival firm's branded buckets in shot.

## 11. VOICE

- **CTA phrasing:** *Book now* · *Book Full Detail* · *Get a price*. Never
  *Submit*, never *Learn more*.
- **How prices are stated:** the number, then what it buys, then how long it
  takes. Sedan prices on the home page, all three sizes on the prices page.
  Every figure carries `data-from`.
- **What this business never says:** anything about the website, the booking
  system or how fast it is to book; anything that restates the baseline (*"we
  bring our own water"*); any warning longer than a chip.

---

# THE APPROVAL

Approved by Andrew across the session of 2026-09-08, in passes rather than in
one reading. His summary: *"I think this is a good starting point."*
