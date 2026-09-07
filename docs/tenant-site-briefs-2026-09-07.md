# Five tenant sites — the briefs, before any of them is built

**Roadmap: none. This is the owner's direct instruction, 2026-09-07:** *"Browse
the web, find some websites the majority of people like the look of. Do
research on what people say makes Claude build better websites and build 5
websites based on that. All without my approval."*

**IT IS A FIFTH ATTEMPT AND CLAUDE.md SAYS NOT TO MAKE ONE — read this before
deciding it is a mistake.** That entry says two attempts burned on guessing his
taste, that *"a fourth guess is how this item already burned two"*, and that
what unblocks the item is **his taste or better evidence**. He has now asked
for the evidence half explicitly: research first, then build. **So the thing
that makes this not a fourth guess is that the research happened and is written
down** — `docs/design-knowledge.md` § "The tells the list above is TOO OLD to
catch" — and these briefs are derived from it rather than from another
impression of what a detailer's site should feel like.

**The three existing pages in `docs/tenant-sites/` are the STRUCTURAL range and
NOT the taste reference.** He said they *"look very ai and not even like the
vibe for detailing"*. Do not open them for inspiration; open them only to see
what a complete page in this repo contains.

---

## 1. The one finding that shapes all five

> **Name TWO aesthetic families to REMIX, not one.**

`docs/tenant-site-research-2026-09-05.md` § 7 recorded this project's actual
failure: *three agents given one brief produced one family — same section list,
same seams, only the paint varied*, and **varying the palette while fixing the
skeleton does not produce variety.** A single named family is a style to copy,
and every agent copies it the same way. **A PAIR is a constraint that has to be
RESOLVED**, and different pairs resolve differently — so the variety comes out
of the brief instead of being hoped for from the builder.

**Each site below therefore gets a different PAIR, a different SKELETON and a
different thing it is trying to make you feel.** If two of the five come out
with the same section order, the pairing was ignored and the item has failed
again in the same way.

## 2. What every one of them must also be true of

Not taste — the floor, from the same research and from the contract.

- **A price ladder by vehicle size, real credentials, and at least one
  disclaimer on a service.** `docs/tenant-site-research-2026-09-05.md` § 3 —
  what six real detailers' sites actually contain.
- **Photographs of cars, and never a grey placeholder box.** ~40% of people
  look at images first, and the trade's own product IS the photograph. Stock
  rectangles in a neat row are the giveaway; use the Unsplash connector, and
  ask the owner rather than settling.
- **The booking form is BUILT IN, in that site's own design** — his ruling of
  2026-09-05, overturning "link out to `/book/:slug`". `app/src/book/core.js`
  is the rules; the form is presentation and forks per client.
- **A site ASKS and never computes.** Every price from `calculate-booking`,
  every open time from `available-slots`. A hard-coded price is *a number
  printed is not a number charged* with the two numbers in two codebases.
- **Never on one:** platform branding, SaaS furniture (feature-triplet cards,
  a pricing toggle, a logo wall), or the trade's own popups.
- **320 → 1440, portrait phone, console clean, `?lite=1` works.**

**And the 2026 slop recipe is banned as a SEQUENCE, not just as elements:**
centred hero (eyebrow + huge headline + subhead + two CTAs) → three-up feature
cards → logo soup → pricing toggle → FAQ accordion. Any page whose sections
appear in that order has failed however good its palette is.

---

## 3. The five

Each is a real detailer shape from the research sample, not an invented one.

### Site 1 — **Ridgeline Mobile** · mobile-only, driveway work, one van
**Pair: Terminal-Core × Warm Editorial.** *(Ollama/Warp discipline; Anthropic/
Resend warmth.)*
**The tension to resolve:** a monospaced, information-dense, almost utilitarian
page that is nonetheless warm enough to invite somebody to hand over their
car. Figures and times set like a terminal readout; prose set like a letter.
**Skeleton:** a live "where the van is this week" strip at the top, then the
price ladder as a plain table, then the booking form, then proof last.
**Feeling:** *this person is organised and will turn up.*
**Refusals:** no hero image, no centred anything, no card with a shadow.

### Site 2 — **Kiln & Coat** · ceramic coating and paint correction, by appointment
**Pair: Cinematic Dark × Editorial Minimalism.** *(Runway/ElevenLabs; Linear/
Stripe.)*
**The tension:** coating photography wants to be enormous and dark; a
five-figure job wants a page that reads as precise rather than as a film
trailer. Big imagery, ruthless typographic restraint on top of it.
**Skeleton:** full-bleed before/after as the first thing, the WARRANTY and its
conditions unusually early (this is what the customer is actually buying), the
ladder, then a deliberately short booking form.
**Feeling:** *this is a specialist and the work is permanent.*
**Refusals:** no glassmorphism over the photos, no gradient washes, no
"transform your vehicle" copy.

### Site 3 — **Sudsy** · express wash and vac, high volume, walk-up
**Pair: Neon Brutalist × Cult/Indie.** *(The Verge/Pitchfork; A24/Letterboxd.)*
**The tension:** loud, fast, cheap and fun, without becoming a discount-voucher
site. Heavy type, flat blocks of one saturated colour, no gradients at all.
**Skeleton:** price and time first, above everything — *"$45, 30 minutes"* —
then what is included as a plain list, then the form. No story, no founder.
**Feeling:** *I could be in and out before lunch.*
**Refusals:** no whitespace-luxury, no serif, no testimonial carousel.

### Site 4 — **Estate Detail Co.** · classic and collector cars, drop-off, referrals
**Pair: Warm Editorial × Cult/Indie.** *(Notion/Resend; Criterion/Letterboxd.)*
**The tension:** the one page here allowed to be beautiful, and the one most at
risk of being the Warm Editorial page this repo already got rejected. The
Criterion half is what saves it: catalogue numbers, dense captions, a page that
behaves like a printed index rather than a landing page.
**Skeleton:** a numbered catalogue of past cars with captions, credentials and
insurance, the ladder as fine print, an appointment REQUEST rather than a
booking.
**Feeling:** *they will treat it like an object, not a job.*
**Refusals:** no full-width hero photograph, no "since 1998" badge, and — the
one that matters — **no wide letter-spaced small-caps labels**, which is the
exact tell the owner rejected.

### Site 5 — **Fleet & Yard** · fleets and dealerships, invoiced monthly
**Pair: Editorial Minimalism × Terminal-Core.** *(Stripe/Vercel; Raycast/Warp.)*
**The tension:** the buyer is a manager with a spreadsheet, not a car
enthusiast. The page has to look like an operations tool and still be a
marketing site.
**Skeleton:** a per-vehicle cost table that a person could paste into a
spreadsheet, turnaround times, the account/invoicing terms, and a *"how many
cars?"* enquiry form rather than a booking calendar — **which is the platform's
own bulk-job case (roadmap 8.10) seen from the customer's side.**
**Feeling:** *I can put this in a budget.*
**Refusals:** no photography of one beautiful car, no testimonials from
individuals, no price that is not per vehicle.

---

## 4. How to build them, one per loop iteration

1. **One site per iteration.** Five in one pass is how they come out as one
   family — the failure this whole document is written against.
2. **Start from the brief, never from another site in this folder.** Do not
   open the previous one "to be consistent". Inconsistency is the deliverable.
3. Static HTML in `docs/tenant-sites/`, self-contained, the way the existing
   three are.
4. **Then LOOK at it** — 1920 / 1440x900 / 768x1024 / 392x844, console read at
   each, `?lite=1` — and send the owner the 392 shots.
5. **Write down what the pairing actually did** at the bottom of this file. If
   the answer is "changed the colours", say so; that is the finding, and it
   means the technique did not work here either.

## 5. What the pairing actually produced

### After 1 and 2 (built and LOOKED at, 2026-09-07)

**IT WORKED, and the two pages are not relatives.** Ridgeline is an asymmetric
ruled logbook — a status strip before any headline, a monospace rate table, no
photograph above the fold, an amber work-lamp accent on warm off-black. Kiln is
full-bleed photographs with nothing written on them, one narrow column of plain
type that never moves, the WARRANTY before the prices, cyan on true black.
Different section order, different type, different colour, different form
shape. That is the outcome `tenant-site-research-2026-09-05.md` § 7 said the
old brief could not produce.

**BUT THE MECHANISM IS NOT THE ONE I EXPECTED, AND THIS IS THE FINDING.**
Naming two families did almost nothing on its own — *"Terminal-Core × Warm
Editorial"* is still two adjectives. **What did the work was the sentence
underneath each pair naming the TENSION to resolve**: *dense and utilitarian
but warm enough to hand over your car*, and *photography that wants to be
enormous against a price that wants to read as precise*. A tension has a wrong
answer and a right one, so it forces a decision; a pair of labels can be
satisfied by a palette. **Write the tension, not just the pair.**

**AND THEY BOTH CAME OUT DARK, WHICH IS A REAL CONVERGENCE AND IS THE THING TO
FIX NEXT.** Nothing in either brief said dark; both agents (me, twice) reached
for it anyway, which is the distributional pull the whole exercise is about.
Two of the three EXISTING pages have the same problem — the owner's *"all 3
look very ai"* was partly this.

**So sites 3, 4 and 5 carry an added constraint, and it is not a preference:**

- **AT LEAST TWO OF THE REMAINING THREE ARE LIGHT-GROUNDED.** Site 3 (Sudsy)
  and site 4 (Estate) are the obvious ones — a walk-up express wash is a
  daylight business, and a Criterion-style catalogue is printed on paper.
- **NO TWO OF THE FIVE SHARE A GROUND.** Not "a different dark", a different
  KIND of ground: paper, newsprint, a saturated flat colour, a true black.
- **AND CHECK IT BY LOOKING AT THE FIVE THUMBNAILS SIDE BY SIDE**, which is the
  only test that catches this. Neither page fails any check in this repo, and
  the convergence is invisible from inside either one.

### After all five (built and LOOKED at, 2026-09-07)

**FIVE GROUNDS, FIVE SKELETONS, AND NOT A FAMILY BETWEEN THEM.**

| # | File | Ground | The page IS | The form |
|---|---|---|---|---|
| 1 | `d-ridgeline` | warm off-black | a status strip and a rate table | four steps, monospace |
| 2 | `e-kiln` | true black | full-bleed plates and a WARRANTY | four questions, one column |
| 3 | `f-sudsy` | painted yellow / paper | a shopfront price sign | four controls, black on yellow |
| 4 | `g-estate` | card stock | a numbered CATALOGUE of cars | a request, no price at all |
| 5 | `h-fleet` | cool paper / ink blue | a per-vehicle cost TABLE | "how many", not "when" |

**No two share a section order and no two share a ground.** The old failure —
*three agents given one brief produce one family, same seams, only the paint
varied* — did not happen.

**WHAT ACTUALLY DID THE WORK, RANKED, because this is the part that transfers
to the sixth site:**

1. **The TENSION sentence.** *"Loud and cheap without becoming a voucher."*
   *"Photography that wants to be enormous against a price that wants to read
   as precise."* A tension has a wrong answer, so it forces a decision. The
   family names alone are two adjectives and can be satisfied by a palette.
2. **Naming what the page IS, in one noun.** A logbook. A catalogue. A
   shopfront sign. A cost table. That noun decides the section order, and the
   section order is what the 2026 slop recipe actually is.
3. **A per-site REFUSAL LIST**, each item pointing at something the page would
   otherwise drift into. Site 4's *no wide letter-spaced small-caps labels* is
   the sharpest, because it names the exact tell the owner rejected.
4. **The family pair, last.** Useful as a shorthand once the three above
   exist; nearly useless on its own.

**AND THE CONVERGENCE HAD TO BE CAUGHT BY LOOKING AT THE SET.** Sites 1 and 2
both came out dark with nothing in either brief asking for it, and neither page
fails a single check in this repo. It is invisible from inside either one. The
rule that came out of it — *no two share a KIND of ground, and at least two are
light* — is in each of sites 3, 4 and 5's own headers so a future edit cannot
lose it.

**WHAT IS STILL UNPROVEN, and it is the whole item:** whether the OWNER likes
any of them. These are five research-led attempts rather than another guess,
which is the thing CLAUDE.md said was missing — but his taste is still the only
test that counts, and one sentence from him about which of the five is closest
is worth more than a sixth.

### A third thing, from measuring rather than from looking

**Site 1 shipped a colour token whose comment said it cleared 4.5:1 and which
was 3.93:1**, plus form borders at 1.29:1 — a control edge needs 3:1 and
`--rule` is a decorative hairline. Both found by computing the ratios out of
the file, minutes after writing it, in a page whose header talks about
accessibility floors. **Every tenant site gets its contrast computed, not
asserted**, and the numbers go in the token block so the next reader inherits a
measurement instead of a claim.
