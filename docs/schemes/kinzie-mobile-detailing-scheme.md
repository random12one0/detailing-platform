# DESIGN SCHEME — Kinzie Mobile Detailing  *(site 4 \u00b7 `ex4`)*

**BUILT AND SIGNED OFF 2026-09-09. The page is
`docs/tenant-sites/y-kinzie.html`, served at `/ex4`**, and its design sheet is
`docs/schemes/kinzie-styleguide.html`. Nothing here is outstanding.

**Pair:** `chicagoautopros.com` (detailer half, chosen by him) ×
`auxia.io` (non-detailer half, chosen by matching FORM in the frames).
Both measured off the live pages 2026-09-09 — the table is in
`docs/TASTE-NOTES.md` § 8. **Nothing here was typed from memory of a screenshot.**

His brief, verbatim: *"implement the animations into the Chicago Auto Pros look,
as well as text."* — so the type treatment is Chicago's, not a reinterpretation.

---

## 1. WORDS — who this business is

```
Friend  ──────────●──────  Authority
Young & Innovative ─●────  Mature & Classic
Playful ─────────●───────  Serious
Mass Appeal ───●─────────  Elite
```

**Three adjectives, ranked:**
1. **Thorough** (most important) — the page's job is to show how much is in a job
2. Plain-spoken
3. Equipped

**We are a crew with a full van, not a boutique.**

## 2. SUBJECT — what this page is a picture of

- **Subject: the clear film going over paint — the sheet, the squeegee stroke,
  the cut line at the edge of a panel.**
- **Why it suits this business specifically:** it is the one thing in the trade
  that is a LAYER, and a layer is what the page is: bone ground, photograph
  under, panel over, cut on a slant. It gives the page a real geometry instead
  of a metaphor. It is a physical object, not a document type.

**The gesture that comes out of it:** every seam on this page is a **diagonal
cut**, never a horizontal rule — measured off Chicago, where photograph and
panel meet on a slant and the side flips each row.

## 3. THE TILE

### Colour — bone paper and one loud blue

| role | value | used for |
|---|---|---|
| ground | `#FBF9F0` | the page |
| ground-2 | `#EFEDE0` | the alternate band |
| ground-dark | `#1B1F26` | the graphite bands, 2 of them |
| surface | `#FFFFFF` | panels sitting on the ground |
| text-primary | `#14181E` | |
| text-secondary | `#4A525E` | |
| text-on-dark | `#F2F1EA` | |
| accent | `#0B4FFF` | one saturated blue, loud |
| accent-quiet | `rgba(11,79,255,.20)` | ALL line-work, dot grids, the routed line ahead of the scroll |
| accent-hover | `#0A44DB` | |
| accent-active | `#0838B4` | |
| border-rule | `rgba(20,24,30,.12)` | decorative hairlines |
| border-edge | `rgba(20,24,30,.38)` | anything you type in or press — needs 3:1 |
| success / error | `#0E7C55` / `#B3261E` | form states |

**Every ratio in the built page is computed by `docs/schemes/measure/site4-contrast.mjs` off the
RENDERED page and quoted in the token block — never typed from judgement.** Site
3 shipped a token whose comment claimed 4.5:1 and which was 3.93:1, and a
sampler that read a rounded corner invented two failures. Sample INSIDE any
fill, at its padding, on the vertical centre, with the glyphs painted out.

### Type — Chicago's treatment, auxia's discipline

- **Display: Bai Jamjuree** — 600, 700. This is Chicago's own face, measured;
  he asked for its text as well as its look. Squared terminals, geometric.
  Unused anywhere else in this repo.
- **Body: Familjen Grotesk** — 400, 500. Unused here.
- **Labels: Spline Sans Mono** — 400, small sizes only. auxia's technical
  label, and the only place a third family appears.

Scale, Major Third (1.25) off a 16px body:

```
  hero      116 px / 104   (392: 44/42)
  h1         64 / 62
  h2         42 / 44
  h3         24 / 30
  body       16 / 27
  small      13 / 20
  label      11 / 12   mono, letter-spacing .14em, uppercase
```

- **The largest thing on the page is 116px** (the hero), plus a **footer
  wordmark set wider than the page** in its own clipped band.
- **Body paragraphs are capped at 68ch.**

### The two or three things that carry the look

1. **The diagonal cut.** Every photograph/panel seam is a slant at one angle
   (one variable), and the side flips each row.
2. **A routed hairline that draws itself with the scroll** — auxia's device,
   but taking the page's own slant angle instead of right-angle elbows. Blue
   behind the scroll position, 20%-alpha ahead of it.
3. **The heavy squared headline at 116px** on a bone ground, with the final
   word in the accent.

## 4. GROUND — never a flat fill

- **Ground treatment:** bone paper carrying (a) a blue dot lattice on the same
  diagonal at low opacity, (b) a soft warm light from the top-left, and (c) one
  grain layer. The two graphite bands carry the same lattice inverted. The
  hero's ground is a photograph.
- **Depth score target: ≥ 15.**

## 5. SHAPE — square, and the only round thing is the badge

Measured from Chicago: 11 elements at 1px, and **50% on twenty icon badges.**

- **Corner radius:** buttons `2px` · cards `2px` · inputs `2px` ·
  **icon badge `50%`** · the ONE pill is the availability chip (`999px`)
- **Border width:** decorative `1px` · control edge `1.5px`
- **Shadow:** `0 18px 40px -22px rgba(20,24,30,.35)` on panels that overlap a
  photograph, and nothing else. Depth elsewhere is the slant and the overlap.

**This is the opposite of site 3** (`--r-card:24 / --r-panel:16 / --r-inset:12`),
on purpose: two sites that share a corner family read as one studio.

## 6. SPACING & LAYOUT

```
  2   4   8   12   16   24   32   40   64   96   (px)
```

- **Max content width:** 1180px
- **Breakpoints:** 392 / 768 / 1180. Swept at 1920 / 1440 / 768 / 392 / 320.
- **Phone is a re-layout**: the slant flattens below 768 (a diagonal seam on a
  392px column is a wedge of dead space), the routed line goes vertical down
  the left gutter, and a bottom dock appears.

## 7. MOTION — ported from site 3, not rebuilt

`docs/tenant-site-playbook.md` § 10 rules 51–90 are all from that build and all
of them bind here.

- **Entrance:** 520ms, `cubic-bezier(.16,1,.3,1)`
- **Exit:** 180ms, `cubic-bezier(.4,.14,1,1)`
- **Hover:** 180ms
- **Which moments get motion:** the hero's three layers on scroll (headline lag
  0, strip 0.12, photograph 0.30); every section's reveal, **which replays in
  both directions**; the routed line drawing; the price tabs; the FAQ.
- **Weighted scroll: WHEEL 1.22 / LERP 0.055**, ported from
  `app/src/landing/thread.js`. **Never a wheel hijack** (rule 75) — these are
  the landing page's own constants, which he has liked for weeks.
- **Parallax limit is APPROACHED:** `off = cap * (1 - exp(-raw / cap))`.
- **`prefers-reduced-motion`:** every reveal resolves to its finished state;
  the routed line draws instantly; no parallax.

## 8. COMPONENTS

| component | variants | states specified | when NOT to use |
|---|---|---|---|
| button (primary) | solid blue, square | default / hover / focus-visible / active / disabled | more than one per screenful |
| button (secondary) | 1.5px outline on bone | same five | never as a link |
| nav | top bar that fades in from the ground on scroll (rule 64), + right-edge position dots | rest / current / hover | — |
| form input | 1.5px edge, square, label above | + invalid | — |
| card | white panel, square, overlapping a photograph on the slant | + hover lift 2px | on a plain band with no photograph |
| footer | graphite, wordmark wider than the page in a clipped band | — | — |

Labels are **{verb} + {noun}**. One primary button per screenful.

## 9. DEVICES — 14, from `docs/DEVICE-INVENTORY.md`

- [x] **A1** ground that is not a flat fill — dot lattice on the slant + warm light + grain
- [x] **A2** real photograph above the fold, and MEASURED against the fold
- [x] **A3** scrim under the hero text
- [x] **A4** the turnaround time, not at body size
- [x] **B1** accent-final-word heading
- [x] **B2** giant bleeding footer wordmark, in its own clipped band
- [x] **C1** floating availability pill with a live dot — the only pill on the page
- [x] **C3** frosted trust bar ON the hero photograph
- [x] **D1** one object at a scale nothing else approaches — the hero film sheet
- [~] **D2** routed connector diagram, **on the bias**, drawn by the scroll —
      **NOT BUILT, and deliberately: playbook rule 98 retired the drawn
      connector after this sheet was written.** The peel replaced it.
- [x] **D6** two-column tick list (the package inclusions)
- [x] **D7** price table tabbed by vehicle type — **Cars / Midsize / Over-Size,
      which is a real detailer's real ladder**, read off chicagoautopros.com
- [x] **E1** portfolio row with real photographs
- [x] **F1** phone bottom dock
- [x] plus Chicago's own: circular icon badges, right-edge position dots, the
      diagonal seam rows, the dot-grid margins

**Rhythm:** the hero is at least 3× the median section height.
**MISSED, MEASURED, AND NOT WORTH FIXING — 2026-09-09, as built at 1440x900.**
Hero 864px; the other blocks are 446 / 548 / 705 / 804 / 890 / 896 / 1158 and
the pinned wipe at 2340. Median 890, so the ratio is **0.97x, not 3x.**
Reaching 3x means a hero of about 2,670px — three screens of photograph before
a reader meets a service or a price — and the sentence was written before the
sections had any content in them. **What it was protecting against is a page
that is a uniform stack of equal blocks, and this one is not**: the shortest
block is 446px and the longest 2,340px, a range of 5.2x. Recorded rather than
obeyed, because the alternative is distorting the page to satisfy a number.

## 10. THE FACTS — off a real detailer's site

Read live off `chicagoautopros.com` on 2026-09-09 (rule 34: use their
information, invent only what no real site supplies).

**The ladder — three packages, three vehicle sizes, real prices:**

| package | Cars | Midsize | Over-Size | turnaround |
|---|---|---|---|---|
| Full Enhancement Detail | $995 | $1,195 | $1,645 | 1 day |
| Full Maintenance Detail | $620 | $845 | $1,195 | 6+ hours |
| Restoration Detail | in-person quote only, from $10,000 | | | 5+ days |

**Their disclaimer, verbatim in shape:** *"All prices are starting at and are
dependent upon vehicle size and inspection."*

**Their inclusion lists** (exterior / interior, per package) transplant whole —
two-bucket hand wash, paint decontamination, one-step polish, silica spray
sealant, hot water extraction, headliner spot-treat, trunk and spare tyre area.

**Their service taxonomy:** paint protection film, ceramic coating, vinyl wrap,
window tinting, package detailing, exterior detailing, paintless dent repair.
**Kinzie is MOBILE**, so vinyl wrap and dent repair are out and the list is
five: paint protection film, ceramic coating, package detailing, exterior
detailing, window tinting.

**Their FAQ is seven questions** and four are anxieties: what detailing is,
what a service includes, how often, what it costs, what steps a detailer takes,
what products, what to look for in a detailer.

**Their service area is ten towns.** Kinzie's is a different ten in the same
metro, because two sites naming the same towns read as one page.

**Every price on the built page carries `data-from`** naming the endpoint that
owns it. *A number PRINTED is not a number CHARGED.*

## 11. THE COPY, AS A COLUMN OF HEADINGS — written before the HTML

Playbook rule 46: print every heading in page order and read them as a column.
Ten of site 3's eleven were phrases and that is invisible while reading the page
section by section. **Every one below is a label. None is a phrase, none counts
anything (rule 49), and none restates the label above it (rule 47).**

```
 h1   Mobile detailing and paint protection across Chicago
 h2   Services
 h2   Detailing packages
 h2   How a visit runs
 h2   Recent work
 h2   Service area
 h2   Questions
 h2   Book a detail
```

**Eight headings. No numbers in any of them.** "Five services" and "Sixteen
towns" are exactly the headings site 3 had to rewrite.

### The sentences that are allowed to exist

Rule 9: delete any sentence that adds no fact. Rule 48: never sell the baseline
— *"we bring water and power"* is the job, not a reason to book.

- **Hero paragraph** — carries three facts and no adjectives: how many services,
  how the prices are structured, where the work happens.
- **Each service** gets one sentence naming what it protects against and one
  naming the turnaround. Nothing that repeats the service's own name.
- **Each package** carries its real inclusion list and nothing narrating it.
- **The disclaimer sits on the price table**, in Chicago's own shape:
  *"Prices start here and depend on vehicle size and condition at inspection."*
- **The FAQ answers are the real seven**, cut to the facts.

### What is banned on this page specifically

- Any variant of *"we come to you"* as a selling line. It is the trade.
- A rating / years / cars-done proof row (rule 36) — sites 1, 2 and 3 all had
  one and he recognised it across all three. **Proof here is the three-figure
  frosted bar ON the photograph, and it counts different things**: the review
  count, the maintenance turnaround, and the installer certification.
- A heading that would work as a band name (rule 8).
