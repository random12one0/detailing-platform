# DESIGN SCHEME — Delgado Mobile Detailing  *(site 2 · `ex2`)*

**BUILT AND SIGNED OFF 2026-09-08. The page is
`docs/tenant-sites/w-delgado.html`, served at `/ex2`.** One page, by his own
instruction that the page COUNT is part of the variety. **Nothing here is
outstanding.**

*Written BEFORE any HTML existed. Andrew answered the four interview questions
on 2026-09-08 and three of the four picks below are his, not mine — including
the one he overruled me on. Kept as the RECORD of what was asked and answered,
not as a to-do list.*

**His four answers, verbatim from the interview:**

| Question | His answer | Mine |
|---|---|---|
| What kind of detailer? | **Another mobile detailer, different flavour** | *(I recommended a fixed shop — overruled)* |
| Light or dark? | **Dark, made of light** | same |
| Which two of his 21? | **`authkit` × `auxia`** | same |
| One page or several? | **One long page with jump links** | same |

**He overruled the business type, and that is the constraint this whole scheme
is written against.** Site 1 is also a mobile detailer, so the trade cannot
carry the difference — the FLAVOUR, the ground, the type, the shapes, the
section order and the page count have to carry all of it. Every §5 rule about
not shipping a reskin applies at maximum force here.

**The flavour, and it is a real business rather than a mood:** site 1 is a
generalist who turns up at your kerb in the afternoon. **This one is a mobile
paint-correction and ceramic-coating specialist who works after dark under his
own lighting rig, in Mesa, Arizona** — where daytime surface temperatures make
polishing and coating genuinely impossible for half the year. That is not a
styling excuse for a dark page; it is why the page is dark.

---

## 1. WORDS

```
Friend  ──────────────●──  Authority
Young & Innovative ●──────  Mature & Classic
Playful ──────────────●──  Serious
Mass Appeal ──────────●──  Elite
```

**Three adjectives, ranked:**
1. **Exacting** *(most important)* — this is measured work, not a wash
2. Technical
3. Nocturnal

**We are a paint specialist who brings the shop to your driveway, not a wash
that also polishes.**

*Site 1's words for contrast: Straight / Warm / Capable, sitting mid-scale on
every slider and toward Mass Appeal. **This one is deliberately at the far end
of three of the four sliders.** Two sites at the middle of every slider is how
two pages come out as one page in two colours.*

## 2. SUBJECT

- **Subject:** **a work light raking across black paint at 9pm** — the hard,
  travelling band of a swirl-finder lamp crossing a dark panel, showing what is
  in the clear coat. Everything outside the beam falls away to nothing.
- **Why it suits this business specifically:** paint correction *is* lighting.
  A detailer cannot fix a defect they cannot see, and the inspection light is
  the tool that separates this trade from a wash. It is also literally how this
  business works — after dark, off the van's own rig, because Mesa in July is
  not a place anybody polishes at noon.
- **What it produces, concretely:** the ground is made of light rather than
  fill; a cold beam sweeps the hero; panels are lit at their edges rather than
  drop-shadowed; the accent is the hot lamp against the cold one.

*Nothing on the banned list. Not a document, not a metaphor for a webpage.
Site 1's subject was the last hour of daylight — sun, outdoors, warm. This is
artificial light, at night, and the two do not read as the same idea.*

## 3. THE TILE

### Colour

**Every ratio below was computed after the fact, against the composited ground,
by `node scratchpad/cr.mjs`. Two numbers came back wrong from judgement and are
corrected here rather than rationalised — see the two notes.**

| role | value | used for | measured |
|---|---|---|---|
| ground | `#0A0B0D` | the page, never flat | — |
| ground-lift | `#12161D` | the lit bands and the diagram beat | — |
| surface (glass) | `rgba(255,255,255,.055)` → `#17181A` | panels, cards, the widget | — |
| text-primary | `#F2F4F7` | body and headings | **17.87:1** on ground · 16.12:1 on glass |
| text-secondary | `#9AA3AE` | lede, captions, labels | **7.71:1** on ground · 6.96:1 on glass · 7.10:1 on lift |
| accent | `#FF4D2E` signal red | the hot lamp — headings' key word, ticks, the price, the CTA fill | **5.96:1** on ground · 5.37:1 on glass |
| accent-hover | `#FF6A45` | | 6.94:1 on ground |
| accent-active | `#E63A1C` | | — |
| **text ON the accent** | `#0A0B0D` **(the ground, not white)** | button labels | **5.96:1** |
| cold-light | `#BFD8FF` | the beam, the mono micro-labels on connectors | **13.58:1** on ground |
| border-rule | `rgba(255,255,255,.10)` | decorative hairlines **only** | 1.26:1 — decorative, never an edge |
| border-edge | `rgba(255,255,255,.36)` | inputs, buttons, anything pressed | **3.27:1** — clears 3:1 |
| success | `#3FD37A` | the live availability dot | 10.14:1 |
| error | `#FF8A7A` | form states | — |

> **CORRECTION 1 — white on the accent is 3.31:1 and fails.** The obvious build
> puts white text on the red button. **The label is `#0A0B0D`, the ground
> colour, at 5.96:1.** Typed from judgement this would have shipped as a
> failure under a comment claiming a pass, which is the exact fault `H1` in the
> device inventory records.
>
> **CORRECTION 2 — the control edge at `.30` alpha is 2.61:1 and fails.** It is
> `.36` (3.27:1). A decorative hairline and a control's edge are two different
> tokens and this repo has conflated them before.

**Still owed at build time:** every one of these re-read off the RENDERED page
with `getComputedStyle`, not off this table. A nested selector can hand an
element a colour this table never mentions — `H1` again.

### Type

**Three roles, ONE superfamily.** Site 1 is Bricolage Grotesque + Instrument
Sans; ten of the twenty-four existing pages already reach for a heavy condensed
grotesque (Anton, Bebas Neue, Barlow Condensed, Saira Condensed, Big Shoulders).
**Chivo is used by none of them.**

- **Display:** **Chivo** — 900. Squarish, sturdy, engineered rather than
  fashionable; it holds up at 130px without the compressed-poster look every
  condensed face brings.
- **Body:** **Chivo** — 400 / 600.
- **Micro-labels:** **Chivo Mono** — 500, 10–11px, letter-spaced, **only** on
  connector labels, step numbers and the availability chip. This is `auxia`'s
  mono-label-on-a-connector, and keeping it inside the same superfamily means
  it is a texture, not a third voice. *(One personality — the rule that came
  out of "horrible font".)*

- **Scale** — Perfect Fourth, 1.333, from a 15px body:

```
  hero      clamp(46 → 130) / .90     the largest thing on the page
  h2        clamp(30 → 62)  / .96
  h3        22 / 1.15
  price     clamp(38 → 64)  / 1        never at body size (device A4)
  body      15 / 1.6
  lede      19 / 1.45
  small     12.5 / 1.45
  micro     10.5 / 1.3                Chivo Mono, .16em tracking
```

- **The largest thing on the page is 130px**, against 15px body — an **8.7×**
  jump, against site 1's 6.8×. `auxia` runs ~90px against 14px and it is the
  size contrast he pointed at, not the absolute size.
- **Measure:** lede capped at 32ch, body prose 46–56ch.

### The two or three things that carry the look

1. **A hard-edged cold beam that crosses the page**, not a soft radial. It
   tracks the pointer on the desk and drifts on its own on a phone. *(Site 1's
   ground is a warm sun with two mote fields — the playbook says do not reuse
   the dot field, so there are no motes here at all.)*
2. **Panels lit at their edges, never drop-shadowed.** Depth is made of light —
   `authkit`'s move, and the reason it scores highest of his eighteen.
3. **One hot red word per heading, and the rest cold.** *Fixed **at your
   kerb***, *What the **light** shows*. **Not site 1's final-word rule** — here
   it is the one KEY word wherever it falls, which reads as emphasis rather
   than as a decoration applied to the end.

## 4. GROUND — and it is never a flat fill

- **Ground treatment, four layers and none of them site 1's:**
  1. `#0A0B0D` base with a vertical cold-to-black gradient.
  2. **The beam** — a `conic`/linear hard-edged band at ~14° in `cold-light` at
     3–5%, position lerped toward the pointer at 0.07, one composited layer
     moved by `transform`.
  3. A fine SVG turbulence grain at `.22`, and a vignette.
  4. The lit bands (`ground-lift`) carry their own bottom-anchored red glow so
     the ground changes **five times** down the page.
- **Depth score target: ≥ 20.** Counted: 6 gradients + edge-light on 4 kinds of
  panel + backdrop blur on the chip, dock and header (5) + the diagram canvas
  (8). Comfortably over the ≥15 floor, and §9 buys variety with **depth**.

## 5. SHAPE

**Site 1 is pill-and-round: 999px buttons, 20px cards, a 26px page shell.
This one is squarer and has no shell at all** — the hero is full-bleed and
`D4` and a full-bleed hero fight.

- **Corner radius:** **6px buttons · 10px cards · 6px inputs · 14px the photo
  window · 0 on the bands.** No pills anywhere except the availability chip,
  which is a chip.
- **Border width:** 1px decorative (`border-rule`) · 1px control edge at `.36`
- **Shadow:** **none.** Depth is made of light — a 1px inner top highlight at
  `rgba(255,255,255,.08)` and an outer `0 0 0 1px` in the accent at 18% on the
  focused/hovered panel. The only exception is the dock, which floats over
  content and gets `0 10px 30px rgba(0,0,0,.55)`.

## 6. SPACING & LAYOUT

```
  4   8   12   16   24   32   48   72   (px)
```

- **Max content width:** 1240px, gutters 20px desk / 16px phone. *(Site 1 is
  full-bleed in a shell. This one is a real measured column — `I5`: a
  four-item list across 1,380px is mostly empty ground.)*
- **Breakpoints:** 380 / 760 / 1040, plus `(min-width:761px) and
  (max-height:500px)` so a rotated phone changes nothing.
- **Phone is a re-layout:** the split hero becomes headline-then-photo (`F2`);
  the routed diagram turns from horizontal routing to a single vertical spine;
  the vehicle-size tabs become a horizontal scroller; the dock appears.
  **Target: the phone page is no more than 15% taller than the desk page.**

## 7. MOTION — Carbon's numbers, and asymmetric

*Site 1 uses one house curve for everything. §7 of the template names that as
the specific thing site 1 does not do and site 2 should.*

- **Entrance:** 240ms `cubic-bezier(0, 0, 0.3, 1)` *(expressive entrance)*
- **Exit:** 150ms `cubic-bezier(0.4, 0.14, 1, 1)` *(expressive exit)*
- **Hover:** 110ms `cubic-bezier(0.2, 0, 0.38, 0.9)` *(productive standard)*
- **The beat:** scrubbed, not timed — bound to scroll progress.
- **Which moments get motion:**
  - the beam tracking the pointer *(G1, his named favourite device)*
  - **the routed diagram drawing itself on scroll progress inside a pinned
    beat** *(D2 + G5)* — the page's one big move, and the only pinned beat
  - the stat figures rolling up once on arrival *(G6)* — **never the price**
  - per-element scroll reveals with `--rp` *(G7)*, hidden state added by
    **script** so a failed script cannot leave a blank page
  - the photo window parallaxing by `--py` *(G8)*
  - hover on everything a pointer can reach, neutralised under `(hover:none)`
  - the Book control's standing breathing glow, no layout
- **`prefers-reduced-motion`:** the beam parks centre, the diagram draws
  complete, reveals are inert, the page reads identically. Guarded at the
  at-rule **and** in script.

## 8. COMPONENTS

| component | variants | states | when NOT to use |
|---|---|---|---|
| button (primary) | solid accent, label `#0A0B0D` | default / hover / focus-visible / active / disabled | more than one per screen |
| button (secondary) | outline at `border-edge` | default / hover / focus-visible / active / disabled | where a link would do |
| nav | condensing sticky header (desk) · dock with sliding indicator (phone) | default / hover / **current** | — |
| form input | text · select · date | default / hover / focus-visible / error | — |
| card | package · job row · FAQ row · diagram node | default / hover *(edge-light only)* | — |
| chip | availability, live dot | live / closed | when nothing makes it true |
| footer | one | — | — |

Labels are **{verb} + {noun}**: *Book correction*, *See the packages*, *Call
the shop*. Never *Submit*, never *Learn more*. One primary button per screen.

## 9. DEVICES — 15 on the page

- [x] **A1** lit ground, four layers — a travelling cold beam, **not** site 1's
      sun-and-motes
- [x] **A2** real photograph above the fold — in a tall lit window beside the
      headline, top edge measured under half the viewport
- [x] **A3** scrim under the availability chip on the photograph, sized to the
      slot and computed against **white**
- [x] **A4** the price at 38–64px, never body size
- [x] **B3** the outlined wordmark behind the hero — **and therefore NOT B2**,
      site 1's giant footer wordmark. One oversized wordmark, not two.
- [x] **C1** availability chip with a live dot, from `available-slots`
- [x] **C4** review proof **inside** the booking form, at commitment
- [x] **C5** the stat strip — real figures only
- [x] **D1** one object at a scale nothing else approaches: the 130px hero line
- [x] **D2** **the routed connector diagram** — the correction process drawn as
      a system, right-angled rounded connectors, mono micro-labels sitting on
      the connectors, **instead of three cards.** The page's centrepiece and
      the thing § C says he was pointing at.
- [x] **D6** two-column tick lists on the packages, from `services.features`
- [x] **D7** the price table tabbed by vehicle size, inline *(one-page site)*
- [x] **E1** portfolio rows in a Work section — plural, never one alone *(I3)*
- [x] **F1** dock **and** condensing sticky header, both surfaces *(I2)*, with
      a current indicator sized from its own link box
- [x] **F2** the phone gets a different hero, not a squeezed one
- [x] **G1** pointer beam · **G3** edge-light on hover · **G5** the pinned
      diagram beat · **G6** stats roll up · **G7** reveals · **G8** parallax

**Explicitly NOT used, and each for a reason:** `B1` accent-final-word (site
1's identity device), `B2` footer wordmark (conflicts with B3), `D3` dotted
connectors (never alongside D2), `D4` rounded page shell (fights a full-bleed
hero, and it is site 1's), `D5` masonry (fewer than five real job photographs),
`G2` weighted scroll (a page with a pinned beat should not also fight the
scroll), `G4` tilt.

- **Buying variety with: DEPTH** *(≥20 — site 1 bought rhythm, so this is
  another axis of difference)*. The pinned diagram beat also clears 3× the
  median section height, so rhythm comes free; depth is the stated buy.
- **No section shape repeats:** split hero · a lit stat band · a routed diagram
  in a pinned beat · a two-up package block with tick lists beside a
  vehicle-size tab table *(sharing a row, per `I5`)* · portfolio rows · a
  compact review rail · an FAQ in two columns · the stepped booking widget ·
  a low footer with hours and an open state.

## 10. PHOTOGRAPHY

- **Hero:** a dark car's flank under artificial light, low and raking. It sits
  in a `4:5` window on the desk and a `3:2` band on the phone. **Measured at
  build, not claimed** — `getBoundingClientRect().top` under half the viewport.
- **How many:** 1 hero + 4–5 in the portfolio rows. **Zero in the price
  block** — a section about numbers owes no photograph *(I1)*.
- **Slots, not art direction:** `object-fit: cover`, stated ratio, scrim sized
  to the slot and computed **against white and against black**, and every slot
  carries a comment naming the field that fills it (`business-media` for the
  hero, `job_photos` for the rows).
- **Contact sheet rendered and LOOKED at** before anything is chosen. No badges,
  no rival firm's branding, right trade.

## 11. VOICE

- **CTA phrasing:** *Book correction* · *See the packages* · *Book now*.
- **How prices are stated:** *from* + the figure + the vehicle size it assumes +
  how long it takes. Every figure carries `data-from` naming its endpoint.
- **What this business never says:** anything about the website, the booking
  system or how quick it is to book; anything restating the baseline (*"we
  bring our own power"*); any warning longer than a chip (*Sealant is not a
  coating*; *Heavy swirls — extra stage*).

---

# THE APPROVAL

Andrew reads §1, §2, §3 and §9:

1. **Subject (§2)** — a work light raking black paint at 9pm. A physical thing
   from the trade, not a document type.
2. **Words (§1)** — Exacting / Technical / Nocturnal, at the far end of three
   of the four sliders, against site 1's mid-scale Straight / Warm / Capable.
3. **Devices (§9)** — 15 listed, buying variety with **depth**.
4. **§3** — this is further toward Authority and Elite than site 1. That is on
   purpose, because he asked for a second mobile detailer and the flavour has
   to do the work the trade cannot.

**APPROVED 2026-09-08**, as three rendered 620x870 frames rather than as this
document — his ruling in the same breath: *"I want all visual, actually. Like,
barely any text, all visual. Right now, you just gave me text."* That correction
is now `TASTE-NOTES.md` § BATCH 4b and step 2 of the playbook.

---

# BUILT, REVIEWED TWICE, AND SIGNED OFF — 2026-09-08

Built as `docs/tenant-sites/w-delgado.html`, served at `/ex2`. He approved the
direction as three rendered frames, then gave two rounds of notes; both are
applied and the result is the page in the repo. **His sign-off: "ok i think we
are good."**

## WHERE THE SCHEME AND THE BUILT PAGE DIVERGE — the page is right

Three sections above describe the direction as APPROVED. Two of them were then
overtaken by his notes, and this is the record of it:

1. **§ 2's subject survives as art direction and NOT as copy.** The dark, lit
   ground is his favourite thing about the page — *"I liked how it looks to
   start… you did good"* — but the night STORY is gone from every headline,
   review, FAQ and opening-hours line, because he did not believe it: *"no car
   detailer would actually do that."* **A subject drives the look and never the
   sales copy.** Playbook ledger 11.
2. **§ 3's type scale is smaller than specified.** The H1 was to run at 130px;
   it runs at a 72px maximum, because the headline is now a sentence that says
   what the business does rather than two words. **His instruction outranks the
   device** — D1 still holds in that nothing else approaches it.
3. **§ 9's device list gained one and lost one.** The side rail is new, from
   his rule that something must stay on screen on every site. The package badge
   and Book button came off the portfolio rows, because they listed the
   packages a second time.

## THE GATES, ALL MEASURED ON THE FINAL PAGE

| Gate | Result |
|---|---|
| Console, every width | **0 errors, 0 warnings** |
| Sideways scroll | **none** at 320 / 360 / 392 / 768 / 844x390 / 1440 / 1920 |
| Sticky header | top **0** after a 2,000px scroll |
| Hero photo above the fold | 320 → **380** of 844 · 360 → **380** · 392 → **330** · 1440 → **116** of 900 |
| Contrast | every text node read off the **rendered** page — **0 failures** |
| Text on the photograph vs a **white** photo | chip 6.36:1 · caption 13.34:1 · badge 12.48:1 |
| Review marquee | wraps 1307 → 28, seam card identical, stops only under a finger |
| `tenant-sites` | **62 checks over 4 pages in 2 sites, 0 failed** |
| `composition` / `design-contrast` / `landing-pricing` / `route-contract` | 94 / all pairs / 107 / 31 |

## WHAT THIS SITE PUT INTO THE RULES LEDGER

**24 of the 30 entries in `docs/tenant-site-playbook.md` § 10 came from this
site**, and six of them are enforced by a check. The largest are: the H1 states
the service; every heading is a label; copy is written from the real-detailer
harvest; something stays on screen on every site; and `overflow-x: hidden` on
`html`/`body` silently disables `position: sticky`.

**The most expensive lesson was not a design one.** Three separate faults ran
every frame, threw nothing and did nothing — a marquee undone by scroll
snapping, a sub-pixel increment quantised to zero, and a check that could not
see the page it was run against. **None was visible without writing a value and
reading it back.** Ledger 25-30.
