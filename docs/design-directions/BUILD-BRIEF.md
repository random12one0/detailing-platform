# The build brief for the 1.3 retry

Written 2026-08-29 after the owner rejected all four first-round directions
(`VERDICT.md`). **Read `VERDICT.md` first, then this.** This file is the plan
for the rebuild: what to build, in what shape, from which evidence. It exists
because the previous attempt was built from assumptions and came back looking
like assumptions.

Plain markdown on purpose. `scrollcraft`'s method is used here, but none of its
tool-specific machinery (`BRIEF.md` in a `scrollcraft/` workspace,
`FINGERPRINTS.md`, the kie.ai asset pipeline) is created in this repo — see the
portability rule in `CLAUDE.md`. The method is portable; the plumbing is not.

---

## 1. The interview, answered from the owner's own words

`scrollcraft` requires eight answers before anything is generated. Seven come
from things the owner has already said — `TASTE-NOTES.md`, `design-brief.md`,
and the review in `VERDICT.md`. **Only Q1's non-web references and Q4's "one
moment" were not given by him**; those are marked and are the two things to
check with him first.

**1. Vibe, and references from another medium.**
Web references are the seven in `ANALYSIS.md`. Non-web references were never
asked for. From everything else he has said, the vibe is: *quiet, engineered,
dark, in motion.* Apple product page, not tool brand, not barbershop.
→ **Worth asking him for one non-web reference.** A film, a car, a shop, a
piece of kit. It is the cheapest question in the whole phase and it has never
been asked.

**2. The scroll journey, in his words.**
> "We are advertising to detailers who want a fresh brand new website, and also
> this comes with this… we're showing, like, hey, this is a super nice admin
> dashboard that you can manage your whole company with just from this one
> place."

And the buyer:
> "Detailers probably just schedule bookings through DMs and Yelp or Google and
> have a pretty bad website or no website at all."

**3. The energy curve.** Not stated directly. Derived: the page opens on
recognition (calm, uncomfortable), builds through the turn, peaks at the
dashboard, resolves quiet at the price.

**4. How they should feel, and the ONE moment.** **Not given — invented below,
and the owner should veto it or nod before it is built.** See §4.

**5. One thing no site he has seen does.** Not given — invented below. See §4.

**6. How far from premium-minimal.** Answered by his reactions, clearly:
- Direction 4 (near-monochrome, no brand colour, minimum decoration) —
  *"the one that I like visually the most, including the logo."*
- Direction 2 (Anton, crimson, loud) — *"the look that I like the least in
  terms of font and color."*
→ **Premium-minimal, with heavy motion.** Which is exactly the
"maximum choreography, minimum decoration" axis from `DESIGN-BRIEF.md`
Conflict 1, now confirmed by his eye rather than by argument.

**7. One unbroken world, or distinct scenes?** *This is scrollcraft's biggest
structural fork and it does not need asking, because both of his favourite
sites answer it the same way.* From `ANALYSIS.md`:
- webtactics: *"one persistent WebGL canvas behind the entire document, with
  the camera and the DOM moving over it — not four separate animations. That
  single decision is what produces 'each section really blends into each
  other.'"*
- riangle: *"Hero is a full-bleed dark scene… capabilities is a plain bordered
  list. Same ground, different structure."*

→ **One continuous ground, structurally different sections over it.** That is
how he gets both things he asked for — "each section looks different" (riangle)
and "each section blends into each other" (webtactics) — which looked like a
contradiction and is not.

**8. Assets already owned.** For the platform's own landing page: **none, and
none are needed.** The subject is our product, and our product is drawn, not
photographed. No stock cars, no kie.ai generation, no video, no API spend.

---

## 2. The grammar: split stage

`scrollcraft` offers eight page grammars and forbids defaulting to the filmic
one-shot. **Split stage** is chosen. Its own definition:

> "Two columns held in tension for the whole page, resolved by scroll. Fits: any
> argument with two sides. Before and after, cost and saving, manual and
> automated, **what you have and what you would have.** The comparison is the
> product."

That is the owner's own description of his buyer, verbatim: what a detailer has
now (DMs, Yelp, a bad website or none) against what they would have (a real site
and one dashboard). The argument *is* the page.

**Why the other seven lost:**

| Grammar | Why not |
|---|---|
| Filmic one-shot | The default scrollcraft warns against, and it needs footage we do not have and do not want |
| Chaptered editorial | Reads as long-form substance. This is a sales page with one argument, not six essays |
| **Live surface** | The closest runner-up, and genuinely tempting — "fits software, tools, dashboards… if the honest pitch is *watch what it does*". Rejected because it **forbids marketing chrome and display headlines**, which would delete "Stop booking jobs in your DMs" — the only line he liked. **But its honesty rule is adopted anyway:** see §5 |
| Continuous world | A camera flight through a place. We have no place; we have a product |
| Typographic poster | Type as the whole subject. He has rejected type-led twice now (Kōpiko, direction 2) |
| Gallery / catalog | We sell one thing, not a range |
| Rhythmic cutlist | Energy brands: streetwear, sport, drinks. Wrong register for a tradesperson buying software |

**What split stage forbids, and all of it is a fix for something he complained
about:** no full-bleed anything before the resolve (kills the car hero), no
centred copy (he said direction 4 "looks off-centered"), no symmetric close, and
**neither column may be decorative** — both carry real content the whole way
down. It also bans `pan`, `spotlight`, `magnet`, `drift`, and more than one
`scrub`. Good: he does not want a scrub.

**Nav, hero, close are decided by the grammar, not separately:**
- **No nav bar. The divider is the chrome** — it carries the label for each side
  and the progress of the argument.
- **The hero establishes the split at 50/50 on the first screen**, both
  headlines readable at once, so the format is understood before any scrolling.
- **The close is the collapse:** the divider travels to one edge, the product
  column takes the full width, and the one action lives in it.

### The risk, and it needs saying out loud

He said, about direction 1: *"this before and after — there's no need for that
completely."* A split stage is structurally a comparison, so there is a real
chance he reads it as the same idea again.

**The difference, and it is the whole point:** direction 1 compared a *dirty
car to a clean car*, which sells detailing. This compares *his customer's
current mess to the product*, which sells the product. It is the sales argument,
not a photography trick, and there are no cars in it.
**Flag this to him in the first sentence rather than letting him discover it.**

---

## 3. The journey — six beats

| # | Beat | What the visitor knows or feels afterwards |
|---|---|---|
| 1 | Recognition | "That is my Saturday." A phone thread of *"u free sat?"*, *"how much for a Tahoe"*, *"still there?"* |
| 2 | The cost | Named plainly: the double booking, the quote given twice, the job lost to whoever answered first |
| 3 | The turn | One link replaces the thread. Their website exists |
| 4 | The dashboard | **The peak.** The whole business in one place: today's jobs, the money, the customer |
| 5 | It is yours | Their name, their prices, their hours, their domain. No marketplace, no other detailers |
| 6 | The one action | Price, and one button |

Beats are the spine. A section that serves no beat is cut, however good it looks.

---

## 4. The signature move, and the peak

**Invented, not given by the owner. He should veto or nod before it is built.**

### The move: the messages become the schedule

The left column is a phone thread — real message bubbles, real DOM nodes, the
kind of thing a detailer actually receives. The right column is the dashboard,
empty.

As the divider travels right, **each message bubble detaches and lands as a row
in the dashboard's Today list.** *"u free sat?"* becomes `9:00 — Marcus Hill,
Wash & Wax, $95`. The mess is not deleted and replaced; it is **reorganised**.
Same content, same pixels, sorted.

Why this and not something else:

- It is the product doing its own selling, which is what he asked for.
- It needs **no photography at all** — no cars, no stock, no generation.
- It is a hero that transforms into another part of the site, which is the thing
  he liked most in sharplink and could not name: *"that first main page turns
  into a rectangle and then completely forms into another part of the website."*
- It is `transform` and `opacity` on a dozen DOM nodes. Cheap on a mid-range
  Android, unlike everything in `ANALYSIS.md` that needed WebGL.
- **No generator produces it by accident.** It cannot read as machine-made
  because it is specific to this business and this argument.

### The peak: the collapse

The divider reaches the left edge. The thread is gone. The dashboard takes the
full width and holds. The price and the one button sit inside it.

The sentence a visitor would say to a friend: **"It's the site where your text
messages turn into your calendar as you scroll."**

Everything before it is quieter than it is; it gets the most scroll room.

---

## 5. Rules the build must hold

### From the owner's review (`VERDICT.md`)

- **No car photography as a subject.** Previews of our own dashboard, site and
  booking widget instead.
- **No before/after of a car. No deposits anywhere.** Check the booking engine
  before writing any deposit copy.
- **The booking widget is one feature, not the co-star.**
- **Start from the old landing page's copy** (`app/src/landing/LandingPage.jsx`).
  New wording must beat "Guards your day", not ignore it. `DESIGN.md` says copy
  and content are kept; only the visual world changes.
- **Keep "Stop booking jobs in your DMs"** as the candidate headline. It works
  because it names the buyer's actual behaviour, and it now also names the
  page's structure.
- **One screen per file.** The stacked mockups made the dashboard's tab bar read
  as part of the landing page.

### The honesty rule, borrowed from the live-surface grammar

Split stage does not require it. Adopt it anyway, because the owner asked for
*"not fake ones, but actual pulled from what we've designed"*:

> The surface has to be real markup running real logic on real or
> clearly-labelled sample data. What stays banned is the painting of a surface,
> an image or dummy divs posing as something that runs.

So the dashboard in the right column **computes**: the money totals sum from the
same job array the rows render from, the counts are derived, and the page says
on its face that the scenario is a demo. Never a screenshot, never a picture of
a UI.

The real structure to mirror is `app/src/screens/Today.jsx`: the long date as
the headline, *"Morning, {name} · 2 of 4 still to do"*, two sunken stat tiles
(expected and collected), one lit "next up" card carrying Navigate / Call / Text
/ Mark complete inline, finished-and-paid jobs collapsed, later jobs below.

### Motion rules, from the code read in `ANALYSIS.md`

These are quoted from sites he chose, not invented:

- **Scrub without pin is the safe form.** riangle uses
  `{start: "top bottom", end: "bottom top", scrub: .7}` and `pin:!0` appears
  **zero** times in its site code. Every beat advances the page.
- **Pinning is not the problem; pinning without delivery is.** sharplink pins
  for 1.5 screens and *assembles an entire section* during it — he liked it.
  momentolegal pins for 18.3 screens to pan one list — he felt stuck.
  webtactics' rail is 5 screens of plain CSS `position: sticky` with
  `touch-action: pan-y`. Ceiling: 2 screens, or 5 for a rail panning real items.
- **A named motion scale, not ad-hoc values.** riangle resolves every animation
  to one of two presets. Do the same: one reveal preset, one scrub preset.
- **Smooth scroll is desktop-only by construction.** riangle gates it behind
  `(pointer: fine)`; Lenis leaves touch native by default (`syncTouch: false`).
  Ship Lenis (3 KB, MIT) on the marketing page, never on `/app`.
- **The jittered typewriter, if the headline types:** 70–110 ms per character
  (`70 + Math.random() * 40`), 2200 ms hold, faster delete, and under
  `prefers-reduced-motion` print the first phrase and stop.
- **Line-masked headline reveal:** each line in a hidden-overflow wrapper,
  `clip-path: inset(-0.3em 0px)` so descenders are not clipped, re-split on
  resize.
- **The floating glass pill nav** — if any chrome is used at all, and note the
  grammar says the divider is the chrome:
  `top: 14px; width: calc(100% - 28px); border-radius: 100px`, the
  `backdrop-filter` confined **inside** the pill so the filter is cheap, a 1px
  gradient rim via `mask-composite: exclude`, and **no outer shadow** — their
  own note: *"the glass is held by its rim and its sheen."*
- **The `.lite` safety net:** one class on `<html>` that puts every entrance
  animation into its end state, set by `prefers-reduced-motion`, by `?lite=1`,
  and automatically if the page has not become ready in time. It cannot rot
  because it is the same CSS the animation targets.
- **The device tier, ~15 lines, no dependency:** `hasWebGL2()`,
  `navigator.connection?.saveData`, `deviceMemory < 4`, `hardwareConcurrency < 4`
  → poster / still / full, plus an fps governor that drops quality below 45 fps
  and abandons animation after two frames under 30.
  **Note the open question:** `APPLE-READ.md` found Apple does none of this and
  uses a per-element load timeout plus a designed still instead. Recommendation
  stands at Apple's approach **plus** riangle's fps governor. Settle it in 1.5.

### The anti-slop floor, non-negotiable

`docs/design-knowledge.md` §1 and the never-defaults in `CLAUDE.md`.
Specifically: not Inter / Roboto / Lato / Arial / system-ui / Space Grotesk /
Geist / Fira; no purple-blue gradients; no three evenly spaced cards; not
everything centred (split stage forbids it anyway); no `01 / 02 / 03` on
non-sequences; no gradient text; no zero-offset coloured glow shadows; no
`transition: all`; no invented statistics.

**A note on `ui-ux-pro-max`,** which the owner asked for by name and which was
run. Its `--design-system` output for this product was a light "calendar blue +
available green" palette with **Fira Code / Fira Sans**, and its typography
domain returned **Outfit, Inter, Roboto**. Those are the on-distribution answers
this project bans, and the skill's own contract says to verify a result and not
persist it if it does not fit. **So its palette and type output are not used,
and that is a deliberate, disclosed rejection rather than an oversight.** What
*is* taken from it: the `parallax-storytelling` style card (3–5 layers, sticky
sections, Intersection Observer triggers, mobile alternative, reduced-motion
fallback), the `product-demo-features` landing pattern
(*Hero > product mockup > feature breakdown per section > CTA*), and its rule
tables, which agree with the floors already in this repo.

---

## 6. What is still open

1. **The owner has not seen this plan.** The split-stage comparison and the
   messages-become-schedule move both need his nod, and the "is this
   before/after again?" risk in §2 must be raised in the first sentence.
2. **One non-web reference has never been asked for** (§1, Q1). Cheapest
   question in the phase.
3. **How many directions the retry produces.** Recommendation: **one, built
   properly**, not four. Four were rejected because they shared a wrong brief;
   four more on a corrected brief are still four guesses. One page with real
   scroll choreography is the test of whether the brief is now right, at a
   quarter of the cost.
4. **Deposits** — the copy must not mention them, and it is worth confirming
   what the booking engine actually does before Phase 2 either way.
5. **The dashboard's own empty state** (a detailer with no jobs today) is still
   undrawn, carried over from the first round.
6. **The GSAP licence question** from `ANALYSIS.md`: ScrollSmoother and
   SplitText are Club plugins. Free alternatives are Lenis (MIT) and a
   hand-rolled line mask. Do not ship a paid plugin in a product we sell
   without checking the terms.

---

## 7. The owner's answers, 2026-08-29 — this section overrides §2 and §4 above

Asked at the top of the rebuild session, before any code. His words are
quoted; everything else is my reading of them and is marked as such.
**Where this section and §2 disagree, this section wins.**

### 7.1 The split stage is DEMOTED from page grammar to a two-section beat

He did not reject the comparison. He limited it:

> "Maybe a column style would be cool to kinda have a before and after of like
> hey this is how your life was before and now — but I don't wanna drag it on
> too much so maybe only like a couple sections."

So the answer to §2's stated risk ("there is a real chance he reads it as
before/after again") is: **he reads it as before/after, and he is fine with
that, for about two sections.** Not for the page.

### 7.2 The thing that replaces it as the grammar, in his own words

This is the most important sentence he gave in the whole exchange, and it is
the one the four rejected directions failed hardest:

> "The thing about all these websites that I liked is throughout the entire
> website no one scroll area, one page looked the same — as you scroll
> everything morphs into different layouts and different stuff, and that's what
> I liked about it, so use that."

That is `ANALYSIS.md`'s riangle finding ("each section looks different… they
all don't look the same" — hero is a full-bleed dark WebGL scene, capabilities
is a plain bordered list, *same ground, different structure*) plus webtactics'
persistent single canvas that makes the sections blend anyway.

**A split stage held for the whole page is structurally the opposite of this** —
two columns in tension top to bottom is one layout repeated. So split stage
cannot be the grammar. §1 Q7's answer was already right and is now the whole
answer: **one continuous ground, and every section a different structure over
it.** The split is one of those structures, used for two sections.

**The test the page now has to pass:** no two sections share a skeleton.
Screenshot them side by side; if two read as the same layout with different
words, one of them is wrong.

### 7.3 Build the whole thing, not a rough draft

He was offered a single throwaway screen of the signature move first. He
declined:

> "I do want to just build out a full thing kind of what I've said right now,
> not a rough job but the full thing with everything kind of planned out
> accordingly, at the same time do implement some really cool scrolling
> techniques."

> "Analyze the code and use maybe some of the skill."

### 7.4 NEW REQUIREMENT — something must be animating at all times

Not previously in this brief, not in `TASTE-NOTES.md` as a separate item, and
he raised it unprompted:

> "I don't want it to look like a static page, and also I want some consistent
> animation — an animation that's constantly looping itself. One example of
> this is the title page on that one website I really like, the last one:
> basically it was the beginning of the name, and then underneath it, it was
> like 'designed with', and the name kept changing — one part stayed, but
> something after it kept changing text. Now we don't need to do the exact
> thing, but there's maybe some glowing animation that's constantly looping, or
> some animation in there that's animated looping."

"The last one" is **webtactics.org**, and the mechanic he is describing is the
rotating-phrase typewriter quoted in `ANALYSIS.md` §7: a fixed stem, a rotating
tail, `70 + Math.random() * 40` ms per character, 2200 ms hold, faster delete,
and under `prefers-reduced-motion` print the first phrase and stop.

**This retires the open question in `docs/design-directions/README.md`** ("nobody
built the typewriter headline… a good candidate to add to whichever direction
wins, in 1.4"). It is not a 1.4 candidate any more. He asked for it by
description, so it is a 1.3 requirement.

Two things satisfy it, and the build ships both because he named both forms
("a glowing animation that's constantly looping, **or** some animation"):

1. **The rotating tail on the hero headline.** It also solves a copy problem —
   "Stop booking jobs in your DMs" is the only line he liked, and the rotating
   tail lets that line name four versions of the same behaviour instead of one.
2. **A slow ambient light that never stops**, on the continuous ground. CSS
   keyframes on `transform`/`opacity` only, so it costs nothing on a phone and
   needs no renderer.

**The constraint that keeps this from becoming slop:** an always-running
animation is the fastest way to make a page feel cheap. Both loops are slow
(the light breathes over ~18 s), neither sits under body copy, and both stop
dead under `prefers-reduced-motion` — the headline printing its first phrase,
per webtactics' own comment that a looping `<h1>` is the single most disruptive
thing on a page for a reduced-motion visitor.

### 7.5 No non-web reference exists

He was asked for one thing outside the internet — a film, a car, a tool, a
watch — and answered **"Nothing comes to mind."** §6 item 2 is therefore
CLOSED, not deferred: do not ask again. The seven sites are the only reference
frame, which makes `ANALYSIS.md` load-bearing rather than supporting.

### 7.6 The rest of §6, settled without him

- **Item 3, how many directions.** ONE, per his "build out a full thing".
- **Item 4, deposits.** Verified in code, not assumed: `grep -rni deposit` over
  `app/src` and `supabase` returns **zero matches**. The booking engine has no
  deposit concept at all, so the copy cannot mention one and Phase 2 has
  nothing to reconcile. Closed.
- **Item 6, the GSAP licence.** Avoided rather than researched, which is
  cheaper than reading a licence: the build ships **no GSAP, no ScrollTrigger,
  no ScrollSmoother, no SplitText, and no Lenis** — no third-party JavaScript
  of any kind. Every technique borrowed from `ANALYSIS.md` is hand-rolled in
  well under the weight of the libraries it replaces (the scroll weighting is
  ~25 lines, the line mask is CSS, the sticky rail is `position: sticky` the
  way webtactics does it, in CSS, with no pinning library). Nothing to license,
  nothing to audit before selling the product. Closed.
- **Item 5, the dashboard's empty state.** Still undrawn, still carried to 1.4.
