# Design Brief — what the references actually tell us to build

Derived from `TASTE-NOTES.md` (the owner's own words, primary evidence for how
these pages move) and `ANALYSIS.md` (twenty screenshots looked at, seven
codebases read). Every claim here traces back to one of those two files.

This is the answer to "what do we build", not "what did we see". It is
deliberately decisive: where two of the owner's preferences fight, the fight is
named and a side is taken, because splitting the difference produces the
average of two directions, which is the definition of the look he is trying to
escape.

**The constraints all of this is scored against** (`docs/design-brief.md`,
`docs/design-knowledge.md`): the marketing page gets the most expressive work,
the booking page second with real step transitions, the dashboard gets things
loading in but **no scroll animation** and "don't overdo it"; the dashboard's
governing value is convenience; the audience is on mid-range Android; a new
tenant with two services and no photos must still look intentional; and
`design-knowledge.md` §1 is the pass/fail floor, not a suggestion.

---

## The ranking

Score is **how much more expensive the product looks** ÷ **(build effort +
performance risk)**. Gain and cost are 1–5. The column that matters is the last
one.

| # | What he keeps asking for | Technique that delivers it | Proved by | Gain | Cost | **Score** | Belongs on |
|---|---|---|---|---|---|---|---|
| 1 | Sections that don't all look the same | Alternating dark/light section grounds | finseo (`221859` dark → `221928` light) | 5 | 1 | **5.0** | Marketing, tenant sites |
| 2 | Texture over flat imagery ("the Vox thing") | Tiling noise PNG or SVG `feTurbulence` at 4–10% with `mix-blend-mode: overlay/soft-light`; optional duotone | **Nowhere in the set** — see note below | 4 | 1 | **4.0** | Marketing, tenant sites |
| 3 | Hover feedback on everything | Whole-row / whole-card state change, not link colour | riangle (`221727`, row 03 lit) | 2 | 0.5 | **4.0** | All three (desktop) |
| 4 | Depth and layering | Scrim under text-over-image, a real shadow scale, deliberate overlap | webtactics (`222055`, four layers); its absence is his sharplink complaint (`221759`) | 5 | 1.5 | **3.3** | All three |
| 5 | Animated headline | Typewriter with rotating phrases, **jittered** 70–110 ms/char, 2200 ms hold, faster delete | webtactics (`222036` cursor visible, `222043` mid-rotation) | 3 | 1 | **3.0** | Marketing only |
| 6 | Floating glass nav | Fixed pill, `top: 14px`, `border-radius: 100px`, `backdrop-filter` confined inside the pill, 1px gradient rim via `mask-composite` | subscrr (`221832`, `221838`) | 4 | 1.5 | **2.7** | All three |
| 7 | Sections blending into each other | One persistent background element the sections scroll over + overlap | webtactics (the same W in `222036`, `222055`, `222104`, `222126` — one canvas) | 4 | 2 | **2.0** | Marketing, tenant sites |
| 8 | Smooth, weighted scroll | Lenis, `lerp` 0.065–0.1, `syncTouch: false` | Contested — see the conflict section | 1.5 | 1 | **1.5** | Marketing, tenant sites. **Never the dashboard** |
| 9 | An element that tracks the cursor | Pointer-lerped transform, or a cursor that morphs into a label | webtactics (`222115`, "VIEW →" puck) | 2 | 2 | **1.0** | Marketing only, desktop only |
| 10 | Hero that transforms on scroll | Pinned + scrubbed `clip-path: rect()` closing onto the next section's card, next section assembling on the same timeline | sharplink (`221754` mid-morph → `221759` finished) | 4 | 5 | **0.8** | Marketing only, desktop only |

**Note on #2.** It is the only item on this list that **no reference site
actually does**. He found it on gustavobatista, but that site's grain is a
Three.js particle-and-fog scene — it uses `mix-blend-mode` zero times. What he
described (Vox-style texture over photographs) is a flat 2D technique costing a
few kilobytes. It scores second not despite being absent from the references
but because of it: it is the cheapest thing on the list and nobody he looked at
is doing it.

---

## The three to build first

**1. Alternating section grounds (#1).** Zero code, zero weight, zero risk, and
it is one of only four things `TASTE-NOTES.md` identifies as where the perceived
quality actually comes from. He named it independently about two different
sites. It is also the structural decision that everything else hangs off — the
depth kit, the texture layer and the glass nav all behave differently on a dark
band than a light one, so this has to be settled first or the rest gets built
twice.

**2. The texture layer (#2).** A tiling noise or grain overlay on every
photograph, at low opacity, with an optional duotone. Two to eight kilobytes,
no JavaScript, works on every phone ever made. It does three jobs at once: it
is the thing he asked for by name, it makes a tenant's amateur phone photo of a
car look deliberate rather than accidental, and it is the single strongest
answer we have to the empty-state rule. A brand-new detailer with two services
and one mediocre photo should still look like a designed business.

**3. The depth kit (#4).** Not an effect — three rules written into the design
system: any text over imagery gets a scrim; there is one shadow scale with real
elevation steps; sections are allowed to overlap by a stated amount. Depth is
his strongest signal in both directions — praised on webtactics, and the whole
of his sharplink complaint ("blocky", "hard to read", "not a lot of depth") is
its absence. It is a set of decisions, not a build, which is why it is cheap.

Hover feedback (#3) scores third on the raw ratio but is not on this list
because it is not a project. It is a floor that ships with every component we
touch, and it is invisible on the phones most of our users are holding.

---

## The three to drop

**1. The pinned morphing hero (#10).** Highest cost on the list by a factor of
three, and the highest performance risk. It is genuinely the best single trick
in the reference set — the code is quoted in `ANALYSIS.md` §2 and it is worth
reading — but it is one to two days of work to get right, it forces layout work
on every frame across a 1.5-viewport pin, and it must be built twice because on
a phone any pin captures the scroll. Decisive version: **riangle pins nothing
at all, and riangle is the site whose engineering is best and whose scroll he
had no complaint about.** We can have his approval without this.

**2. The cursor-tracking element (#9).** He mentioned it twice, which is why it
is on the list at all, and it is nonetheless the weakest item here. It is
invisible to every dashboard user (phone), invisible to most booking customers
(phone), and therefore only ever reaches a prospect on a desktop. The two
precedents point the same way: subscrr **built a custom cursor and deleted it**
(the comment reads "Custom cursor disabled: normal system cursor"), and
webtactics gates all cursor work behind `window.innerWidth >= 1024`. Spend the
effort on something the phone majority can see.

**3. Smooth, weighted scroll (#8) — and this one overrides a stated
preference, so here is the whole argument.** It is the first thing he named,
unprompted, and the recommendation is still to not ship it. The evidence:

- **subscrr built it, shipped it, and turned it off.** The code is still there
  behind `const SMOOTH_SCROLL = false`, with a comment saying native scroll is
  "faster and without viscosity". That is the site he called Apple-like.
- **finseo never had it.** No Lenis, no ScrollSmoother, nothing. He called it
  "still good".
- **riangle has it, but never on a phone** — gated behind `(pointer: fine)`, so
  the velocity he felt does not exist on the device our dashboard lives on.
- **momentolegal has it heavily and he said he felt stuck.**
- **webtactics has the heaviest weighting of all seven** (`lerp: 0.065`,
  `wheelMultiplier: 0.75`, and it runs on touch) and he loved it — but that
  page also runs twenty-four other named effects, so the scroll is not
  separable from them.

Two of the sites he rated "good" have none of it, and the one site where it is
clearly doing work is the one where it cannot be isolated. It is not what
produces the quality he is reaching for.

It is also nearly free — Lenis is 3 KB and MIT, and it is one line. So the
recommendation is not "never": it is **do not spend a slot on it, and settle it
empirically at the end.** Build the marketing page without it, then turn it on
behind one flag and have him feel both on his own phone. That is not splitting
the difference; it is the only way to answer a question about feel.

---

## Where his preferences fight each other

### Conflict 1 — "Apple" versus webtactics. This is the real decision for 1.3.

In the brief interview he named **Apple** as the one anchor he was confident
about. In these notes his most enthusiastic reaction by a distance is
**webtactics** — "very cool… a lot of depth… very enticing."

**Those are opposite aesthetics and only one can be the direction.**

| | Apple / subscrr | webtactics |
|---|---|---|
| Method | one immaculate component, warm ground, huge empty space, restraint | two dozen layered effects, persistent 3D, overlap everywhere |
| Effects on the page | ~4 | 24 named `setup*` functions |
| Cost to build | low | **5–10×** |
| Mid-range Android | safe | needs four independent fallback paths, which webtactics actually wrote |
| Empty-state (two services, no photos) | **strong** — atmosphere is generated, not supplied | **weak** — the density needs content to be dense *with* |
| Risk of reading as AI-made | **higher** — restraint is closer to the population average | **lower** — nobody generates this by accident |

**The tradeoff, stated plainly.** Apple-quiet is cheaper, safer on phones, and
much better for a brand-new tenant with nothing to show — but it is closer to
the generic centre, which is the exact failure he described ("it still kinda
looked like it was made by AI"). webtactics-dense is far harder to mistake for
generated work and is what actually excited him — but it costs five to ten
times as much, it needs real content to look full, and it is the direction most
likely to hurt a detailer's phone.

**Recommendation: build both as directions in 1.3 and let him choose against
real screens**, because this is precisely the choice that cannot be made from
words — he has now given confident answers pointing in both directions. But
build them honestly: the quiet one must earn its restraint with one
extraordinary detail (subscrr's glass nav is the proof that this works), and
the dense one must be shown **empty**, with two services and no photos, because
that is where it fails.

### Conflict 2 — "overlay a lot of stuff" versus "not to the point where it's hard to read"

He stated both, and **the site he praised for depth breaks his own rule.** In
`222104` the body copy on the "MARKETING & STRATEGY" card sits over busy chart
imagery and is genuinely hard to read; the same happens in `222043`.

**Tradeoff:** a scrim — a local gradient or tint under the text block — fixes
legibility completely and costs nothing, but it slightly reduces the "floating
freely over the image" purity that makes overlap feel expensive.

**Take the scrim, every time.** Legibility is an accessibility floor
`CLAUDE.md` keeps through the redesign, and the visual loss is small enough
that he is unlikely to see it. The overlap survives; only the illusion of
nothing-in-between goes.

### Conflict 3 — "hero that transforms" versus "scroll that doesn't take you anywhere"

These are the same mechanism. Pinning is what makes a hero transform, and
pinning is what makes a page feel stuck. The reference set brackets it exactly:

- sharplink pins for **1.5 viewport heights** and assembles an entire section
  during it — chart, labels, rolling figures, cards. He liked it.
- momentolegal pins for **18.3 viewport heights** and pans one list. He said he
  felt stuck.
- webtactics' rail is **5 viewport heights** of plain CSS `position: sticky`
  with `touch-action: pan-y`. He liked it.

**The rule that falls out, and it should go into the new design system:** *a pin
declares its length in viewport heights, and must deliver a section's worth of
content within it. Ceiling: 2 viewport heights, or 5 for a rail that is panning
real items. Never capture vertical touch — `touch-action: pan-y` always.*

### Conflict 4 — the colour he rules out, and the colour he doubts

He ruled out orange (subscrr) and leans blue, while flagging blue himself as
"kind of typical AI". He is right that it is: a blue-purple accent is on the
never-defaults list.

**Tradeoff:** his instinct is a real signal about what he will enjoy looking at
every day, and overriding it entirely produces a palette he resents.

**Resolution:** blue is not banned — *default* blue is. A blue pushed off the
centre (deep teal-leaning, or a near-black navy ground with a single hot
accent) satisfies the preference without landing on the tell. This is settled
in 1.3 with real screens, not here. Note it interacts with the curated
four-to-six tenant palette: whatever the house colour is, it cannot be one of
the tenant options or every tenant site will look like ours.

---

## Two things worth more than any item on the list

Neither was mentioned by the owner. Both come from the code.

**1. riangle's device tier system.** Before any expensive visual runs, it
checks WebGL2 support, `navigator.connection.saveData`, `deviceMemory < 4` and
`hardwareConcurrency < 4`, and picks one of **poster / still / full**. Then it
watches its own frame rate: below 45 fps it drops the pixel-ratio cap from 1.75
to 1.25; below 30 fps twice it abandons animation entirely.

About fifteen lines, no dependency. `design-knowledge.md` §4 names mid-range
Android as our constraint and says motion cost matters more than motion
quality — this is a shipped answer to exactly that. **The alternative is
visible in the same reference set:** gustavobatista attempted less and defends
it by user-agent sniffing, switching its hero off for Samsung Internet — the
default browser on Samsung Androids, which is our audience.

**2. webtactics' `.wt-lite` class.** Every entrance animation has an end state
expressible in CSS:

```css
.wt-lite .fade-up, .wt-lite .decode-text, … { opacity: 1 !important; transform: none !important; }
```

So "turn all motion off" is one class on `<html>`, not a code path — set by
`prefers-reduced-motion`, by `?lite=1`, or automatically if the page has not
become ready within ten seconds. A reduced-motion mode built this way cannot
rot, because it is the same CSS the animation targets.

**Adopt both before building any direction.** They are the difference between
the two most ambitious sites here: one measured and degraded gracefully, the
other blacklisted browsers. The ambition was similar; only the engineering
differed.

---

## The type finding

Not one of his ten, but the strongest convergent signal in the whole exercise.

He said *"I like the font"* about riangle and *"font is also good"* about
sharplink — independently, without knowing they matched. **Both sites set
Archivo.** riangle declares `--font-display: "Archivo"`; sharplink uses
`Archivo` and `Archivo Narrow`.

Archivo is free on Google Fonts and ships a width axis, which gives the weight
and width extremes `design-knowledge.md` §1 asks for out of a single family.

For contrast, the faces on the sites he was cooler about: **Inter / Inter
Tight** (subscrr — the first name on our never-defaults list), **Geist**
(finseo — the framework default), **Roboto / Lato** (gustavobatista — two more
never-defaults), **Forum** (momentolegal — he pre-emptively ruled it out),
**Orbitron / Rajdhani / Syncopate** (webtactics — sci-fi, and he praised the
colouring and motion here, never the type).

**Archivo goes into 1.3 as the working display face** unless a direction has a
specific reason to argue otherwise.
