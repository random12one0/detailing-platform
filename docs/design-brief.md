# Design brief — roadmap 1.1 and 1.2

This file is the input to the visual restart. Nothing in Phase 1 moves until
Parts A and B below are filled in by the owner. **Status: COMPLETE 2026-08-29.** Parts A, B and C all
answered. Roadmap 1.1 and 1.2 are done and 1.3 is unblocked. Read this file
first, then `docs/references/DESIGN-BRIEF.md`, which turns the answers into a
ranked and costed build list.

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

### Liked — DELIVERED 2026-08-29 (seven, not five)

The owner scrolled each one himself and recorded what the motion felt like.
Those words are the primary evidence for this whole phase and live in
`docs/references/TASTE-NOTES.md`; twenty screenshots are in `screenshots/`;
the technique-by-technique analysis of all seven codebases is in
`docs/references/ANALYSIS.md`; the ranked, costed conclusions are in
`docs/references/DESIGN-BRIEF.md`.

1. **riangle.com** — the font, the weighted scroll, the cursor-tracked
   triangle, hover effects, sections that each look different, the footer
   animation.
2. **sharplink.com** — the font again, and the hero that "turns into a
   rectangle and then completely forms into another part of the website".
   Disliked its blocky, low-depth light sections.
3. **subscrr.app** — "that Apple kind of look", the floating liquid-glass
   top bar, hover states. Disliked the orange.
4. **finseo.ai** — the opening screen, the moving dot visualisation, and
   darker and lighter sections rather than one uniform ground.
5. **gustavobatista.dev** — taken only for the idea of texture over
   imagery (the Vox reference). Explicitly not the aesthetic.
6. **momentolegal.com** — elegant, but the source of his one hard no:
   scrolling that "doesn't really take you anywhere".
7. **webtactics.org** — the most enthusiasm: the cursor-warped 3D, the
   self-typing headline, the layering and depth, sections blending together.

**Two things fell out of this that were not asked for and matter more than the
list.** He praised the typeface on riangle and sharplink independently, without
knowing both set **Archivo**. And the two sites he called "basic but good" have
no smooth scroll at all, which pressure-tests the first thing he asked for. See
`DESIGN-BRIEF.md`.

### Disliked (at least one)

1. **Kōpiko** — an artisan sourdough bakery's subscription page, given
   2026-08-29. Pasted as an image in chat and not saved to disk, so it is
   recorded here by description; owner, if you still have the file, drop it
   in `docs/design-references/` and this note can point at it instead.

   What is actually on that page, so 1.3 can steer away from it deliberately
   rather than from memory:
   - A single enormous cream wordmark ("Kōpiko") filling the entire top
     third of the screen — the brand name AS the hero, no headline, no
     sentence, no offer.
   - Flat dark-brown ground, cream type, one product photograph. Two colours
     in the whole design, no third accent, nothing lit.
   - The buying form sits in a narrow left column at roughly a quarter the
     size of the wordmark: hairline rules, small caps labels, radio dots,
     prices right-aligned. Editorial, not interactive — it reads as a
     printed order form.
   - Numbered steps — "1. SELECT YOUR LOAF / 2. SELECT FREQUENCY /
     3. SELECT QUANTITY" — exactly the numbered-marker pattern
     `docs/design-knowledge.md` §1 names as a tell.
   - Enormous type against tiny type with nothing in between: no middle of
     the hierarchy at all.

   **Reason not given** — the owner said only "i dont like this one". The
   traits above are observations, not their stated objection, and must not be
   quoted back as if they were. If a direction in 1.3 wants to use any of
   them, it is worth asking which part they disliked first.

   **Useful because it overlaps our own candidates.** This page is close in
   spirit to a boutique/craft direction and shares the huge-display-type move
   that an editorial treatment would reach for. It draws a line under a
   region we might otherwise have walked into.

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

**Answer (2026-08-29): question was badly asked — rewritten below as B1b.
Owner: "I don't know what you mean."** The fault is mine; the original
wording assumed the owner would picture three different screens competing
for effort. Re-asked plainly at the bottom of this file. Do not treat this
as answered.


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

**Answer (2026-08-29):**

- **Apple — yes, definitely.** The only one the owner named without
  hedging. "Apple is definitely a good brand."
- **Modern banking app — maybe.** Second choice, offered tentatively.
- **Snap-on / Milwaukee — no.** "Probably not."
- **Barbershop / tattoo studio — no.** "Probably not."
- **High-end independent garage — unresolved.** Named among the ones the
  owner could not picture; never ruled in or out. Treat as open, and settle
  it with images in 1.3 rather than another question.

Important caveat the owner gave alongside this: **they could not picture the
tool-brand or barbershop looks**, so those two "no"s are "I don't know what
that is" as much as "I don't want it". They are not a strong signal. The
Apple answer is the strong signal.

**Flag for 1.3 — the Apple problem.** Apple's look is carried almost
entirely by world-class product photography and enormous empty space. Our
hardest case is a brand-new detailer with two services and no photos at all
(`docs/design-knowledge.md` §4: "the empty state is the real product").
A faithful Apple direction is the most likely of all of them to collapse into
a blank page for that tenant. Not a reason to drop it — it is a reason
that at least one direction must prove itself EMPTY, not fully configured,
and a reason to consider what carries the page when photographs cannot.


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

**Answer (2026-08-29) — the most useful answer in the brief.**

Nothing specific was wrong. In the owner's words it was "actually one of the
better looks I've seen it create" — but "it still kinda looked like it
was made by AI", and they wanted "a fresh start with more thinking behind it
before we started going."

So the brief is NOT "fix a flaw". Every listed candidate — too dark, too
cold, too plain, hard to read, didn't look worth the money — was declined.
The single defect is that it reads as machine-made.

**What that means for 1.3, and it is a hard constraint:**

- A direction that is merely *competent* has already failed. Competent is
  what the old one was. The bar is a look with a point of view a person
  could defend out loud.
- `docs/design-knowledge.md` §1 stops being background reading and
  becomes the pass/fail test. Its named tells — Inter/Space Grotesk,
  purple-blue gradients, three evenly spaced cards, everything centred,
  rounded-lg on everything, flat grounds with no atmosphere, 01/02/03
  markers, "modern and clean" copy — are the exact things that produced
  the reaction being described.
- "More thinking behind it" is a request for the REASONING to be visible in
  what gets shown. Each direction in 1.3 needs a one-line argument for why
  it looks the way it does — not a mood word.
- The 5 directions must be genuinely different from each other. Five
  variations on one idea would reproduce the exact complaint at five times
  the cost.


### B4. Is there anything at all worth keeping?

The old look is dark near-black with a single highlighted element per screen,
three fonts (Anybody for headings, Public Sans for text, DM Mono for all
numbers). Keep any of it — the dark background, the number font, the general
layout — or throw the lot out. "Throw it all out" is completely fine and is
what I'll assume if you skip this.

*Why I'm asking:* if something is worth keeping, keeping it saves a lot of
work and keeps continuity for you. If not, I'd rather know now than have you
recognise the old thing in a new coat of paint.

**Answer (2026-08-29): throw it all out.** "Nah. Throw it out. It's all
fine." Nothing carries over — not the near-black ground, not the three
fonts, not the one-lit-element rule. `docs/design-system.md` is anti-
reference only from here.


### B5. Two practical facts only you know

- **Sunlight.** Detailers work outside. Is the dashboard going to be read on
  a phone in direct sun? (This is the single biggest argument against a dark
  design and I don't want to guess it.)
- **Their customers' age.** Are the people booking detailing jobs mostly
  under 40, mostly over 50, or a real mix? (Older skews bigger text, higher
  contrast, fewer clever interactions.)

**Answer (2026-08-29):**

- **Sunlight is NOT a constraint.** The dashboard is read on a phone, but
  before and after a job — not out in the sun mid-detail. In the owner's
  words: don't build it specifically for glare. **This removes the strongest
  argument against a dark design**, so dark stays on the table on its merits
  rather than being ruled out by conditions.
- **Their instruction instead: "we're just gonna make it look really nice"**
  — with usability taken as part of looking nice, not traded against it.
- **No age skew in the people booking.** 18+, and genuinely spread: young,
  middle-aged and older customers all book, all the time. So no leaning on
  youth-app conventions, and no senior-optimised oversized-everything either.
  It has to read for everybody — which argues for real typographic
  hierarchy and honest contrast doing the work, rather than a style that only
  lands for one age group.


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

**Answer (2026-08-29), half of it:**

- **No existing brand. Nothing to respect.** No logo, no colour, no printed
  material — "This is completely new." So the platform's own identity is
  a blank sheet, and a wordmark or logotype is in scope rather than
  something to work around.
- **The per-tenant accent colour question was not answered.** Re-asked at the
  bottom of this file as B6b. It matters more than it sounds: it decides
  whether every visual choice has to survive being recoloured by a stranger.


---

---

## Part C — the two still open (2026-08-29)

### B1b. If only one of the three screens could be stunning, which one?

The first version of this question was unanswerable, so here it is properly.

Think of the product as a shop with three rooms. The **front window** is the
marketing page — its whole job is to stop a detailer scrolling past and
make them think this is worth $499. The **back office** is the dashboard —
where that detailer does their admin twenty times a day; it wants to be quick
and out of the way. The **counter** is the booking page — where a stranger
hands over their phone number and their address, so it has to feel safe and
easy.

You would not decorate those three rooms the same way. A window display that
looked like a back office would sell nothing; a back office as fussy as a
window display would be exhausting to work in. Most of the time all three can
be good. But when they pull against each other — and they will — which
one do I favour?

*What changes depending on your answer:* front window first gives something
bold and photo-heavy that photographs well in a sales call. Back office first
gives something plain, dense and fast. Counter first gives something warm and
reassuring, with fewer choices on screen.

**My recommendation: the counter — the booking page.** Two reasons. It is
the screen that runs your customers' actual money, so it is the one that has
to work under pressure. And it is also the thing you show a prospective
detailer when you say "this is what your customers will see" — so it
quietly does the front window's job as well. The dashboard is the room you
personally live in, which is exactly why it is the safest to make plain.

**Answer (2026-08-29) — the ranking was refused, and replaced with a
better one.** "I do want all of them." The owner declined to trade quality
away on any screen, and specifically pushed back on the framing: a screen
being out of the way "doesn't mean that we shouldn't actually think about
making it look good."

What they gave instead is a ranking of **how expressive each screen gets** and
**what governs it when it is forced to choose** — which is more useful than
the question I asked:

| Screen | Governing value | Motion budget |
|---|---|---|
| **Landing page** | Impact. "Invest a lot of time" — the most visually ambitious surface. | The largest: scroll effects, "cool animations". This is where the expressive work goes. |
| **Booking page** (customer) | Visual appeal, second only to the landing page. "Definitely needs to be more visually appealing" than the dashboard. | Real: step-to-step transitions through the wizard are explicitly wanted. |
| **Dashboard** (detailer) | **Convenience first — then made as pretty as possible around it.** Not "plain": still has to look good, but ease of doing the job sets the shape and beauty fits itself to that. | The smallest, but not zero: screens and cards should "load in nicely", "pop in". Explicitly NOT scroll animations — "could get annoying". "Don't overdo it." |

Two things the owner said that are worth keeping as written, because they
are the actual design instruction:

- **"The design that is visually appealing needs to be convenient."** On the
  dashboard, convenience is not a constraint on beauty — it is the thing
  beauty is built around. Any dashboard mockup that looks good and is
  fiddlier to use has failed, regardless of how it photographs.
- **Visual appeal does not cost the customer anything on the booking page.**
  The owner does not accept the usual trade-off there — they expect a
  better-looking booking page to also be a better experience, not a slower
  one.

**Consequence for 1.3:** the three mockup screens are not equals. The landing
hero is where a direction proves it has a point of view; the dashboard Today
screen is where it proves the point of view survives contact with real work.
A direction that only sings on the landing page has failed half the test, and
that is the failure mode to watch for — it is also the easiest one to
mistake for success.


### B6b. Does each detailer still get to pick their own colour?

Right now each business that signs up chooses an accent colour, and their
booking page is recoloured with it — buttons, highlights, links. It is a
real feature that already works, including the code that darkens or lightens
a colour so text stays readable on top of it.

**If it stays:** every visual decision I make has to survive a stranger
choosing neon green, or near-black, or hot pink. That rules out a whole class
of designs — anything where a specific colour relationship is the point.
It is also a genuine selling line: "your site, your colour."

**If it goes:** every detailer's booking page looks identical to every other
one, which undercuts "a real website of your own" and makes the product look
more like a shared directory listing. In exchange I get a much stronger
design, because the palette becomes a decision rather than a variable.

**My recommendation: keep it, but narrow it** — instead of a free colour
picker that can produce anything, offer a curated set (say eight to twelve
colours chosen to work with the design). The detailer still picks, still feels
ownership, still looks different from the shop down the road — and I never
have to defend against neon green. This is the only option that keeps both
halves. Say the word and I will design around a curated set.

**Answer (2026-08-29): curated set, and keep it small.** "We could just
keep it to, like, a few or a couple." Narrower than the eight-to-twelve I
proposed — read as roughly **four to six**, to be settled when the
direction exists, since the right number depends on what the palette is doing.
Free-form colour picking is gone; neon green is no longer a case any design
has to survive.

**And a second, larger point the owner made unprompted:** the detailer
"probably doesn't really care about the admin dashboard colour scheme." The
accent is about the surfaces their *customers* see — the booking page and
their own website. **So the dashboard can be designed in one fixed house
palette** rather than being built to survive retinting.

That is the single biggest constraint removed in this whole brief. The old
system had to make every dashboard token withstand an arbitrary tenant
colour; `docs/design-knowledge.md` §4 calls per-tenant retinting the
hardest visual problem in the product and the highest-risk code. Confining
retint to the public surfaces means the dashboard's palette can be a
deliberate composition, and the retint problem shrinks to a handful of known
colours on two screen types — small enough to actually test exhaustively.

**Assumption flagged, not decided:** this reading treats "a few colours,
customer-facing only" as the rule. The tenant's own branding is presumably
still theirs on their public site. If the intent was that the dashboard also
carries a light touch of their colour (a header, an active tab) that is a
small change, but say so before 2.3 — it is expensive to retrofit.

**STILL NOT ANSWERED, and 2.3 has now been built (2026-08-30).** Nobody put
the question to him, so 2.3 implemented the reading above, which is what
`docs/design-system.md` law 11 says: `lib/theme.js` no longer writes the
detailer's colour over the dashboard's `--accent`, and the dashboard runs on
one fixed house palette. The Appearance screen — now called "Your colour" —
carries the consequence in plain words and previews the colour on the booking
page's own ground, so picking one and seeing the dashboard not change reads
as intended rather than broken.

**The question was asked at the end of that session and is open.** It is not
expensive to retrofit in the direction of "yes, a light touch": the accent is
one token and `lib/theme.js` still holds both correction functions. Reverting
the other way — after tenant colour had been let back into the dashboard —
would be. So the cheap moment to answer it is now, not later.


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
