# Design brief — roadmap 1.1 and 1.2

This file is the input to the visual restart. Nothing in Phase 1 moves until
Parts A and B below are filled in by the owner. **Status: WAITING ON OWNER
(opened 2026-08-29).**

Why a file and not a chat message: chats get cleared, files don't. Answers
typed here survive; answers typed in chat die at the next `/clear`.

**How to fill it in:** either type your answers straight into this file under
each question (any format — bullet points, one word, a paragraph), or paste
them into the next session and I'll write them here. There are no wrong
answers and no vocabulary you're expected to know. "I don't know" is a real
answer and I'll work around it.

---

## Part A — 1.1: the references (3 to 5)

The single most valuable thing in this whole phase. A picture of a site you
like tells me more than any amount of description, because words like
"clean", "modern" and "professional" mean nothing — they're the exact words
that produce the generic look we're trying to escape.

**What counts as a reference:** any website, app, poster, product packaging,
shop sign, car wrap, or magazine page whose *look* you like. Any industry —
a bank, a whisky brand, a hiking-boot company, a video game. It does NOT
have to be car-related, and it does NOT have to be a website that does what
ours does. I'm after the visual world, not the features.

**Two ways to hand them over:**
1. A URL — just paste the address in the list below.
2. A screenshot or photo — save the image file into `docs/design-references/`
   (this folder sits next to this file), then list the filename below.

**Also give me one you HATE.** An anti-reference is as useful as a reference
and takes ten seconds. If you can say "this looks like every other one", that
is exactly the thing I need to avoid.

For each, one line on what specifically grabbed you is enough — "the big
type", "the photos", "the colour", "it looks expensive", "it looks tough".
If you can't say why, list it anyway; I can read the image.

### Liked
1.
2.
3.
4.
5.

### Disliked (at least one)
1.

---

### If you want help hunting

Paste this into your advisor chat — it is built to give you images to react
to rather than advice to read:

> I am choosing a visual direction for a website product I sell to independent
> car detailers. Three audiences: detailers deciding to buy it, detailers
> using the dashboard daily on a phone outdoors, and their own customers
> booking a job. I need REFERENCES, not advice. Show me 15 to 20 real websites
> or brands whose look might suit this, spread deliberately across very
> different worlds — industrial tool brands, high-end independent garages,
> friendly consumer apps, craft/barbershop/tattoo studios, and quiet premium
> product sites. For each: the name, the URL, and one line on what makes it
> distinctive. Do not describe them as modern, clean or professional. I will
> pick 3 to 5 I like and 1 I hate.

---

## Part B — 1.2: the brief interview

Six questions. Short answers are fine.

### B1. Which of the three audiences should the look be aimed at first?

Three different people see this product, and they want opposite things:

- **A detailer deciding whether to buy it** (sees the marketing page). Wants
  to think "this looks worth $499 and $40 a month."
- **A detailer using it every day** (sees the dashboard, on a phone, often
  outdoors between jobs). Wants fast, readable, no fuss.
- **That detailer's own customers** (see the booking page). Wants to trust it
  enough to hand over a phone number and a driveway address.

When those three pull in different directions, whose experience wins?

*Why I'm asking:* it decides the whole shape. Aiming at buyers gives
something bold and image-heavy; aiming at daily users gives something plain
and fast; aiming at customers gives something warm and trustworthy. Trying to
serve all three equally is how a design ends up bland.

**Answer:**

### B2. Which of these does it need to feel closest to?

Pick one or two, or write your own. These are deliberately real-world things
rather than adjectives:

- **Snap-on / Milwaukee** — tool-brand tough. Heavy, industrial, high
  contrast, unapologetic. Says "a pro uses this."
- **A high-end independent garage** — Porsche specialist, not a chain.
  Restrained, expensive, lots of dark space and good photography.
- **A modern banking app** (Monzo, Revolut) — bright, friendly, rounded,
  everything obvious. Says "this is easy and nothing will go wrong."
- **A boutique barbershop or tattoo studio** — crafted, characterful,
  hand-made feel, strong typography, a bit of grit.
- **Apple** — quiet, spare, product photography doing all the work.

*Why I'm asking:* this is the "feeling" question, but asked in a way that
can't be answered with "modern and clean". Those five would produce five
completely different products.

**Answer:**

### B3. What actually bothered you about the old look?

You've already decided to scrap it — I want to know precisely what for, so
the replacement doesn't quietly reproduce it. Anything you can name helps:

- too dark / too gloomy?
- too cold, too "tech company"?
- too plain, not enough personality?
- looked like every other AI-built site?
- hard to read outdoors or on your phone?
- didn't look like it was worth money?
- a specific screen that annoyed you most?

*Why I'm asking:* "start over" is a direction, but "start over because it
felt cold and corporate" is a direction I can actually aim with. Without
this, three of my five options will likely land back in the same place.

**Answer:**

### B4. Is there anything at all worth keeping?

The old look is dark near-black with a single highlighted element per screen,
three fonts (Anybody for headings, Public Sans for text, DM Mono for all
numbers). Keep any of it — the dark background, the number font, the general
layout — or throw the lot out. "Throw it all out" is completely fine and is
what I'll assume if you skip this.

*Why I'm asking:* if something is worth keeping, keeping it saves a lot of
work and keeps continuity for you. If not, I'd rather know now than have you
recognise the old thing in a new coat of paint.

**Answer:**

### B5. Two practical facts only you know

- **Sunlight.** Detailers work outside. Is the dashboard going to be read on
  a phone in direct sun? (This is the single biggest argument against a dark
  design and I don't want to guess it.)
- **Their customers' age.** Are the people booking detailing jobs mostly
  under 40, mostly over 50, or a real mix? (Older skews bigger text, higher
  contrast, fewer clever interactions.)

**Answer:**

### B6. Is there an existing brand to respect?

Does "Detailing Platform" already have a logo, a colour, a name treatment, or
business cards you've had printed — anything the design has to live with?
And separately: does each tenant get to pick their own accent colour (they
currently do, and it recolours their booking page), or is that something
you'd rather take away?

*Why I'm asking:* a per-tenant colour that can be anything from neon green to
near-black constrains the design hard — every choice has to survive being
recoloured by a stranger. Worth confirming it stays before I design around
it.

**Answer:**

---

## What happens after this is filled in

1. I produce **3 to 5 genuinely different directions** (roadmap 1.3) — not
   variations on one idea. Each one rendered as real, working mockups of the
   same three screens (landing hero, one booking step, dashboard Today), at
   phone width and desktop width, so you're comparing like with like.
2. You pick one. I refine it once, you approve it (1.4).
3. It gets written down as law in a rewritten `docs/design-system.md`, the
   design tests get rewritten to enforce it (1.5), and only then does it get
   applied to the real screens (Phase 2).

The reason for that order: choosing while looking at five real screens is a
decision you can make in two minutes. Choosing from a written description is
a decision nobody can make well.
