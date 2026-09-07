# Design & Process Knowledge Transfer

Compiled 2026-08-28 from the owner's research chat (sources: Anthropic Claude
Cookbook frontend-aesthetics guidance; impeccable (pbakaus); scroll-craft
(nateherkai); emilkowalski/skills; ponytail (DietrichGebert); practitioner
videos from Nate Herk, AI LABS, Sergei Chyrkov, Jono Catliff, The Coding
Sloth). Statements marked OPINION are judgment, not established fact.
Nothing here describes the repo's code.

## 1. Why AI-built front ends look the way they do

The model "tends to converge toward generic, 'on distribution' outputs. In
frontend design, this creates what users call the 'AI slop' aesthetic"
(Anthropic cookbook). This is a distributional pull, not a knowledge gap —
models still converge on Space Grotesk even when told to be original. Treat
the first instinct on any visual decision as the population average and
deliberately move off it.

### The named tells

- Fonts: Inter, Roboto, Open Sans, Lato, Arial, system-ui as a design
  choice. Also Space Grotesk — the "trying to be original" default.
- Color: purple-to-blue gradients on white; timid, evenly distributed
  palettes where no color dominates.
- Layout: three evenly spaced cards; everything centered; five identical
  full-width stacked sections; `rounded-lg` on everything; accent bar or
  rail on rounded cards.
- Surface: flat solid backgrounds with no atmosphere or depth.
- Structure-as-decoration: numbered markers (01 / 02 / 03) on content that
  isn't a sequence; emoji as section markers.
- Copy: "modern and clean," "seamless," "elevate," feature triplets, Lorem
  ipsum, "Feature One / Feature Two / Feature Three."

### The tells the list above is TOO OLD to catch — researched 2026-09-07

**This section exists because the owner rejected three pages that passed every
check in this repo**: *"All 3 look very ai and not even like the vibe for
detailing but it's fine for now."* The list above catches the tells of a few
years ago. What follows is the CURRENT house style of AI design output,
gathered from the live web on 2026-09-07 rather than from memory.

**Typography:** Space Grotesk is now itself the "I tried" upgrade rather than
the original choice, which the list above half-says and this makes explicit.

**Colour:** pastel rainbow accents; **indigo-to-violet hero washes** — the
purple gradient's 2026 form, and the one most likely to slip past a check
written against "purple-to-blue on white".

**Layout, and this is the one the old list misses entirely — it is a RECIPE,
not an element:** a centred hero made of *eyebrow + 64pt headline + subhead +
two CTAs*, then three-up feature cards, then logo soup, then a pricing toggle,
then an FAQ accordion. **Every one of those is defensible alone; the SEQUENCE
is the tell.** A page can pass a per-element audit and still be this page.

**Effects:** generic glassmorphism; soft drop shadows everywhere; animated
gradient blobs; Shadcn-default cards; Tailwind-default `rounded-xl` buttons.

**THE REMEDY THAT MATTERS MOST HERE IS NOT ON THE OLD LIST EITHER, AND IT IS
THE EXACT FIX FOR THIS PROJECT'S RECORDED FAILURE.**
`docs/tenant-site-research-2026-09-05.md` § 7 concluded that *three agents
given one brief produce one family — same section list, same seams, only the
paint varied*, and that **varying the palette while fixing the skeleton does
not produce variety.** The technique that answers it:

> **Name TWO aesthetic families to REMIX, not one.** The worked example given
> is *"Linear's typography discipline plus Pitchfork's editorial colour."*

One family is a style to copy and every agent copies it the same way. A PAIR is
a constraint that has to be resolved, and different pairs resolve differently —
which is variety produced by the brief rather than hoped for from the agent.

**Six families, with the reference sites each was named by** — this is a
vocabulary this repo has never had:

| Family | Named references |
|---|---|
| Editorial Minimalism | Linear, Stripe, Vercel |
| Warm Editorial | Anthropic, Notion, Resend |
| Terminal-Core | Ollama, Warp, Raycast |
| Cinematic Dark | Runway, ElevenLabs, Midjourney |
| Neon Brutalist | The Verge, Pitchfork, PlayStation |
| Cult / Indie | A24, Criterion, Letterboxd |

**Two of the three rejected tenant pages were squarely "Warm Editorial"** —
editorial serif, ruled rows, wide letter-spaced small-caps labels, generous
whitespace, a muted palette. That is the diagnosis this repo already wrote,
now with a name for what it landed on and five other places it could land.

### What a majority actually responds to — the same research, the other half

The owner asked for *"websites majority of people like the look of"*. The
honest finding is that the aggregate preference is much blunter than the
aesthetics above, and the two must not be confused: **the family decides
whether a site feels like anyone; these decide whether it works at all.**

- **An opinion forms in about 0.05 seconds**, and design is reported to drive
  it ~94% of the time. Whatever a page does, it does before anything is read.
- **~84.6% prefer a clean layout to a crowded one**, and **59% (66% in the US)
  say they would rather spend time on a well-designed site than a basic one.**
  So "clean" is table stakes and is NOT the differentiator — which is exactly
  how a page ends up looking like every other clean page.
- **~60% name usability as the thing that matters most** when buying, and
  **~40% look at images first.** For a detailer that is decisive: the trade's
  own product is a photograph of a car, and stock rectangles are the giveaway.
- The trust factors named repeatedly: **fast load, responsive layout, real
  reviews, and transparent pricing.** Three of those four this platform already
  supplies to a tenant site through the contract; the fourth is the site's own.

**THE USE OF THESE NUMBERS IS AS A FLOOR, NOT A BRIEF.** A page built to
satisfy the list above and nothing else is the centred-hero recipe again. The
family pairing is what makes it somebody's.

**Sources (fetched 2026-09-07):** theadpharm.com/insights/claude-design-without-the-ai-slop-look ·
mindstudio.ai/blog/claude-design-avoid-ai-slop-design-system ·
digitalsilk.com/web-design/web-trends/website-design-statistics ·
diviflash.com/web-design-statistics · theedigital.com/blog/web-design-trends.
**They are marketing blogs and the statistics are re-quoted rather than
primary** — treat the ranking as sound and the decimal places as decoration.


### The named remedies

- Typography: weight extremes (100/200 against 800/900, not 400 against
  600) and size jumps of 3x or more, not 1.5x. High-contrast pairings:
  display + monospace, serif + geometric sans, or one variable font worked
  hard across its range.
- Color: one dominant color that carries the page plus one sharp accent
  used sparingly. "Dominant colors with sharp accents outperform timid,
  evenly-distributed palettes." Declare in CSS custom properties; OKLCH for
  predictable lightness when retinting.
- Neutrals: a pure mid-grey reads as unconsidered. Bias the neutral ramp
  slightly toward the accent hue so it reads as chosen.
- Motion: "one well-orchestrated page load with staggered reveals
  (animation-delay) creates more delight than scattered
  micro-interactions." Transform and opacity only. Exits faster than
  entrances. `prefers-reduced-motion` gets a static version that still
  reads correctly.
- Backgrounds: "Create atmosphere and depth rather than defaulting to
  solid colors" — layered gradients, grain, geometric pattern, contextual
  effects.

## 2. Techniques that move the needle (ranked by leverage)

1. **Ban the defaults by name, in writing.** A "never" list in a file beats
   an instruction in a message, because the file survives `/clear`.
2. **Lock the design system before any code.** Without a written contract
   the model invents a fresh hex value per component and the page drifts
   within one session.
3. **Reference, not adjective.** A screenshot or URL beats a description.
   "Modern and clean" is not a brief — that phrase is the slop. Prompt
   shape: aesthetic family / reference image or URL / intent and audience /
   guardrails.
4. **Give the agent eyes.** The highest-leverage thing you can give a
   design agent. Screenshot at multiple viewports, read the console,
   compare against the written system, fix, repeat. An agent that has not
   looked at the page has not finished the task, regardless of what it says.
5. **Run a dedicated audit pass.** Deterministic detectors catch what
   generation misses, because generating and critiquing are different jobs.

### The skill-collision rule

Skills that audit, apply, or animate stack cleanly. Skills that DECIDE the
aesthetic do not — each additional one is another voice arguing with the
established system, and the symptom is a site drifting slightly more
generic each session. **On this project the aesthetic is settled
(docs/design-system.md), so system-generating skills (ui-ux-pro-max,
tastemaker, Claude Design, great-design's direction/design-system phases)
must not run. Auditors and appliers (impeccable, animate,
review-animations, ship-check, scrollcraft for structure and motion only)
are welcome.** Where a structure-imposing skill meets the established
identity, the identity wins: the skill governs structure and motion, never
fonts, ground, or color roles.

### Verification specifics

- Viewports: 392px (this product's real customer), 768px, 1440x900 (what a
  prospect evaluating the product uses).
- Both themes, every time.
- Console warnings count as defects until proven otherwise.
- Contrast checked per tenant accent, not once — a retint that passes on
  the house color can fail on a customer's.
- Report what was actually observed. "This should work" is not evidence.

## 3. Working rules for Claude Code

- Plan before build; stop for approval on anything large.
- One task per session. Finish, write a handoff note, `/clear`, start clean.
- Handoff notes before clearing: done / half-done / every decision and why /
  exact next step — for a reader with no memory of the session.
- Commit between steps; revert a broken step rather than fixing forward.
- Smallest possible diff. No unrequested refactoring, files, dependencies,
  or renames.
- The lazy-senior-developer ladder: reuse before writing; the best code is
  the code not written. Cleanup = deleting unused and merging duplicates —
  never new abstractions, folder reorganizations, or syntax modernizing.
- CLAUDE.md is the compounding mechanism: any correction given twice
  belongs in the file.
- Stuck twice on the same bug: stop editing. State hypothesis, evidence,
  and unchecked assumptions; list three possible causes before more code.
- Context economy: targeted reads over dumping whole files.

## 4. Opinions about this project's design (all judgment — argue with it)

- OPINION — The booking page carries more weight than the dashboard. It is
  what a detailer's customers see and what a prospect judges when deciding
  to buy.
- OPINION — Matte dark is stronger for the dashboard than the marketing
  page; dark can read cold to small-business owners. Pressure-test the
  landing page specifically; if it fails there, amend the system for that
  surface rather than abandoning it.
- OPINION — "One lit element per screen" is the most valuable rule and the
  easiest to lose under motion. Every scroll beat needs its own answer to
  "what is lit here."
- OPINION — Per-tenant retinting is the hardest visual problem here and
  underrated. Test the extremes (neon green, near-black), not the pleasant
  middle. The contrast-correction path is the highest-risk visual code
  because failures are invisible until a specific customer signs up.
- OPINION — The empty state is the real product. A page that looks
  intentional with two services and no photos is worth more than one that
  looks spectacular fully configured.
- OPINION — Motion cost matters more than motion quality: the audience is
  tradespeople on mid-range Android phones. Measure on a throttled CPU
  before committing to a treatment.
- OPINION — The demo business is a load-bearing sales asset, not
  end-of-queue polish.
- OPINION — Placeholder imagery is the fastest way to lose a $900 sale.
  Real photography or nothing.
