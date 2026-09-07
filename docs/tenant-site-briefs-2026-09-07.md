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

*(Filled in as each one is built. Empty is honest.)*
