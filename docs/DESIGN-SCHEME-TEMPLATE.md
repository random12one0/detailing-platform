# DESIGN SCHEME — <TENANT NAME>

**Fill this in BEFORE any HTML exists. Then build.**

> **THIS FILE IS THE RECORD. IT IS NOT WHAT ANDREW APPROVES — 2026-09-09.**
> He approves a **rendered design sheet**, `docs/schemes/<tenant>-styleguide.html`,
> and he asked for that to be permanent: *"make sure it does this every time
> every session before making website."* His description of it: *"here's the
> font we're gonna use, an example of the font. Here's the colors that we're
> choosing, and here's example of the colors… here's the specific animation
> when you scroll… you could take our design sheet and then drag and drop stuff
> to make the website. That's the rules on making the website, not just a
> preview of the home page."*
> **The worked example is `docs/schemes/kinzie-styleguide.html`.** Everything
> below is what fills it, plus the arithmetic and the sources — which are worth
> keeping and are not what he wants to look at.

This is a **style tile**, not a design system. The distinction is real and matters:
Nielsen Norman Group defines a design system as the parent thing — multi-product,
governance, a component code library. A style guide is one product's visual rules.
This is a style guide. Do not over-build it.
(https://www.nngroup.com/articles/design-systems-vs-style-guides/)

The form comes from Samantha Warren's Style Tiles (A List Apart, 2012), which exist
precisely so a client can approve a *visual direction* without being shown a page:
> "A style tile is more refined than a traditional identity mood board and less
> detailed than a website mockup or comp."
> — https://alistapart.com/article/style-tiles-and-how-they-work/ · https://styletil.es/

Sections 1–3 are Warren's. Sections 4–9 are the extensions this project needs
(spacing, motion, components, devices), each modelled on a real published system.

**RULE: present ONE direction, fully resolved. Never three.** The literature is
consistent that options get mixed and matched into a Frankenstein — Nela Dunato's
"One Concept, One Revision" method exists for this, and Hick's Law is the stated
mechanism. If you genuinely can't choose, narrow it with references first, then
present one. (https://neladunato.com/blog/one-logo-design-concept-method/ ·
https://blog.prototypr.io/presenting-multiple-design-options-to-your-clients-just-dont-5818bb29b6fc)

---

## 1. WORDS — who this business is

Fill the four sliders. Mark a position, don't hedge to the middle. These come from
GV's Three-Hour Brand Sprint, which is the standard exercise for this.
(https://library.gv.com/the-three-hour-brand-sprint-3ccabf4b768a)

```
Friend  ─────────●───────  Authority
Young & Innovative ──●───  Mature & Classic
Playful ───────●───────── Serious
Mass Appeal ──●────────── Elite
```

**Three adjectives, ranked, one marked most important:**
1. (most important)
2.
3.

**We are ___, not ___.** (one sentence)

> WHY THIS SECTION EXISTS: it is what makes review possible. When Andrew says
> "I don't like it," the next question is "does this feel more Friend or more
> Authority than we agreed?" Without the words, feedback is raw taste and
> unusable. This is the single most cited fix in the design-review literature.

## 2. SUBJECT — what this page is a picture of

**Not a metaphor for the page.** The one-noun device previously produced a
scoreboard, a catalogue, a logbook, a day's schedule and ruled paper — four
stationery metaphors, which is why a car detailing site came out looking like a
notepad. Asking an abstract question about a *page* returns a document type.

The subject is a **physical thing from the trade**: black paint under shop lights,
water sheeting off a hood, foam, a specific car at a specific hour, a polisher head.
The sites Andrew rates highest do exactly this — atelier's subject is a white Tesla
at golden hour, landscape's is a garden, auxia's is its own product.

**BANNED as subjects:** paper, ledger, catalogue, notebook, logbook, index card,
receipt, schedule, scoreboard, dossier, invoice, blueprint.

- **Subject:**
- **Why it suits this business specifically:**

## 3. THE TILE — colour, type, and the two or three things that carry the look

### Colour

State **roles**, not just hex. Material 3's framing: color roles are
"the connective tissue between elements of the UI and what color goes where."
(https://m3.material.io/styles/color/roles)

| role | value | used for |
|---|---|---|
| ground | | the page background |
| surface | | cards, panels that sit on the ground |
| text-primary | | |
| text-secondary | | |
| accent | | ONE saturated colour, used loudly and rarely |
| accent-hover | | |
| accent-active | | |
| border-rule | | decorative hairlines |
| border-edge | | edges of things you type in or press (3:1 minimum) |
| success / error | | form states |

**Contrast, non-negotiable** — WCAG 2.1 SC 1.4.3: body text **4.5:1**, large text
(18pt, or 14pt bold) **3:1**. Take every ratio **after the run, against the real
composited ground**, never from judgement. A gradient behind text is a new ground
and every ratio has to be taken again.
(https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html)

> NOT A RULE, AND DO NOT USE IT: "60-30-10." I looked for it in GOV.UK, Carbon,
> Material, Atlassian, Polaris and Spectrum. It appears in none of them and has no
> attributable origin — it is interior-design folklore that migrated into UI blogs.
> Real specs document roles and contrast ratios, not fixed proportions.

### Type

One display face, one body face — the standard split (Material calls these the
"brand" and "plain" typefaces). **No serif display face. No free-builder
serif+sans pairing.** ONE type personality: a script logo plus a serif headline
plus serif body is three, and it is what Andrew called "horrible font."

- **Display:** ____________  weights: ______
- **Body:** ____________  weights: ______
- **Scale** (pick a ratio and show the actual sizes — Material uses Major Second
  1.125; Perfect Fourth 1.333 and Major Third 1.25 are the other common ones):

```
  hero      ____ px / ____ line-height
  h1        ____ / ____
  h2        ____ / ____
  h3        ____ / ____
  body      ____ / ____
  small     ____ / ____
```

- **The largest thing on the page is ____ px.** It must be far bigger than feels
  safe. meli's largest text is 48px used once and Andrew called that page
  "lacking"; mrgreen sets 65–70px; the batch-1 references set 100–200px.
- **Measure:** body paragraphs stay 45–75 characters (Bringhurst), or 40–60 per
  Material. https://fonts.google.com/knowledge/using_type/understanding_measure_line_length

### The two or three things that carry the look

Not adjectives. Concrete, e.g. "a frosted trust bar sitting on the photograph,"
"the final word of every heading in the accent," "a 1px diagonal lattice at 2%."

1.
2.
3.

## 4. GROUND — and it is never a flat fill

The most-repeated finding in TASTE-NOTES: a flat `background: var(--ink)` is the
tell. Every ground gets something in it — a gradient, a blurred light, a texture,
a canvas, or a photograph. A photograph counts; landscape scores 3 on gradients
and its ground is a full-bleed garden.

- **Ground treatment:**
- **Depth score target: ≥ 15.** (gradients + shadows + 5 if blur + 8 per canvas.
  Every site Andrew liked is above 15. The seven rejected pages scored 0–6.)

## 5. SHAPE

- **Corner radius:** ____ (buttons)  ____ (cards)  ____ (inputs) — or "sharp"
- **Border width:** decorative ____   control edge ____
- **Shadow:** state the actual values, or state that depth is made of light
  (glowing borders, radial glow) rather than shadow — authkit does the latter
  and scores highest of the eighteen.

## 6. SPACING & LAYOUT

Use a 4px/8px-based scale. Carbon's is real and provable, and 8 steps is plenty:

```
  2   4   8   12   16   24   32   40   (px)
```
(https://carbondesignsystem.com/elements/spacing/overview/)

- **Max content width:** ____
- **Breakpoints:** ____ / ____ / ____ (mobile / tablet / desktop). Verify at
  **392px** — that is the real customer — and at 320px.
- **Phone is a re-layout, not a re-flow.** A page that grows 50–90% taller on a
  phone was stacked, not designed. atelier and authkit stay the same length or
  shrink. atelier moves the photograph *below* the text on a phone and adds a
  fixed bottom dock.

## 7. MOTION

Real systems document this with numbers. Carbon's, verbatim, with its stated purposes:

```
  duration-fast-01      70ms   micro-interactions: button, toggle
  duration-fast-02     110ms   fade
  duration-moderate-01 150ms   small expansion, short-distance movement
  duration-moderate-02 240ms   expansion, toast
  duration-slow-01     400ms   large expansion, important notifications
  duration-slow-02     700ms   background dimming

  productive standard  cubic-bezier(0.2, 0, 0.38, 0.9)
  productive entrance  cubic-bezier(0, 0, 0.38, 0.9)
  productive exit      cubic-bezier(0.2, 0, 1, 0.9)
  expressive standard  cubic-bezier(0.4, 0.14, 0.3, 1)
  expressive entrance  cubic-bezier(0, 0, 0.3, 1)
  expressive exit      cubic-bezier(0.4, 0.14, 1, 1)
```
(https://carbondesignsystem.com/elements/motion/overview/ — Material's equivalents
are at https://m3.material.io/styles/motion/easing-and-duration/tokens-specs, and
note Material has since moved to a spring-physics system and marks the fixed
easing/duration tokens as no longer maintained.)

Entrance and exit are **asymmetric on purpose**: decelerate curves for things
arriving, accelerate curves for things leaving.

Fill in:
- **Entrance:** ____ ms, ____ easing
- **Exit:** ____ ms, ____ easing
- **Hover:** ____ ms
- **Which moments get motion at all:**
- **`prefers-reduced-motion`:** the static version must still read correctly.
  Every system treats this as a requirement, not an option.

**THE RULE THAT MATTERS MOST HERE:** motion is bound to **scroll position**, or it
is decoration. mrgreen has 77 keyframes and 28 running animations and Andrew wrote
"layout good no reall animations ;(" — because they were spinners, preloaders and
one-shot fades. Never a preloader. A reveal slower than a scroll gesture is worse
than no reveal.

> Worth knowing: not every real system publishes numbers. Apple's Human Interface
> Guidelines give no ms values and no easing curves at all — only principles
> ("Add motion purposefully… Don't add motion for the sake of adding motion").
> That is a legitimate model. But for an agent, numbers are better than principles.

## 8. COMPONENTS

For each one on the page, document it the way Carbon documents its Button —
this is the completest public example of a single-component spec:
variants → anatomy → sizes → **every state** → content rules → do/don't.
(https://carbondesignsystem.com/components/button/usage/)

States, minimum: **default / hover / focus-visible / active / disabled.**

| component | variants | states specified? | when NOT to use |
|---|---|---|---|
| button (primary) | | | |
| button (secondary) | | | |
| nav | | | |
| form input | | | |
| card | | | |
| footer | | | |

Two real rules worth copying verbatim from Carbon: *"Each page should have only
one primary button"* and *"Do not use buttons as navigational elements. Instead,
use links."* Label formula: **{verb} + {noun}** — "Book detail," not "Submit."

## 9. DEVICES — what is actually going to be ON this page

This is the section that answers "it was very basic, there wasn't much to it."
Pick from `docs/DEVICE-INVENTORY.md`. **Minimum 10.**

- [ ]
- [ ]
- [ ]
- [ ]
- [ ]
- [ ]
- [ ]
- [ ]
- [ ]
- [ ]

**Rhythm:** one section is ≥3× the median section height, OR the depth score is
≥20 and sections carry their variety internally. **Say which.** Every page Andrew
liked is above 3 on rhythm or above 15 on depth. The seven rejected pages were
1.09–2.73 on rhythm and 0–6 on depth — they bought neither.

- **Buying variety with:** rhythm / depth  (circle one)
- **No section shape repeats down the page.** Andrew: *"it's not just the same
  copy and pasting all the time… information is laid out in different creative ways."*

## 10. PHOTOGRAPHY

- **Hero photograph:** what it is, and it starts **above the fold** (measure it —
  a claim about the markup is not a claim about what anybody sees)
- **How many photographs total:**
- **Text on a photograph always gets a scrim.**
- **Every candidate rendered to a contact sheet and LOOKED AT before choosing.**
  Alt text does not carry brand: an Unsplash photo whose `alt_description` is
  "black sedan" has `description` "Mercedes minimal silhouette." A metadata filter
  cannot catch a badge. Only looking can.

## 11. VOICE

3–5 lines. Modelled on Mailchimp's content style guide, scoped to what this site
actually needs. (https://styleguide.mailchimp.com/)

- CTA phrasing:
- How prices are stated:
- What this business never says:

---

# THE APPROVAL

Andrew reads sections 1, 2, 3 and 9 and answers:

1. Is the **subject** (§2) a real physical thing from the trade, not a metaphor
   for a webpage?
2. Do the **words** (§1) describe this business or a generic one?
3. Are there **at least 10 devices** listed (§9), and does it say whether it is
   buying variety with rhythm or with depth?
4. Looking at §3 — does this feel more Friend or more Authority than we agreed?

Anything else is detail he can change later. **No HTML is written until he says yes.**

When he rejects something, the question is never "what don't you like" — it is
"which of the agreed words is this failing?" That is the whole reason §1 exists.
