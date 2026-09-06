# The tenant-site kit

**Roadmap 3.2(c) and 3.4, 2026-09-05.** The brief a fresh coding agent is
pointed at to build one detailer's website.

**3.4 IS THIS FILE AND NOT A SECOND ONE.** That item was written on
2026-08-29 and describes exactly this — *"open an agent pointed at this repo
and have it already know everything needed to build a client's website
properly"*. Its own list is answered section by section below, with two
corrections its wording predates: **the platform's landing page is NOT the
worked example** (§1 and §5 — a tenant site inherits our method and never
our skin, his ruling of 2026-09-05), and **the design system is
deliberately not on the reading list** for the same reason. Writing a
second kit to satisfy the older wording would be the third-plan mistake
this file's own opening warns about.

**It is a POINTER, not a summary.** Every fact in this repo has exactly one
home and none of them is here — the files below are the sources, this is the
order to read them in and the decisions that are already made. A kit that
restates the contract is a second copy of the contract, and the older one goes
stale silently. *(The owner's own rule, 2026-09-05, when a session started
writing a third plan: "Isn't there already a plan. Follow the docs.")*

**Plain markdown on purpose.** No skill, no agent definition, no tool-specific
mechanism — the owner expects to move to a different coding agent and this has
to work from whichever one he opens (`CLAUDE.md` § Process).

---

## 0. The thirty-second version

You are building **one** website for **one** detailing business. It is
bespoke: its own type, its own colour, its own aesthetic, its own section
order. It shares no CSS and no components with this platform.

What it may **not** do is reimplement the engine. Prices, open times, the
quote and the booking all come from the platform, live, so a price changed in
the detailer's dashboard changes the website with no code edit. That is the
feature the product is sold on.

The one rule under all of it: **fork the presentation, never the engine.**

---

## 1. Read these, in this order

| # | File | Why |
|---|---|---|
| 1 | `docs/tenant-site-contract.md` | **The contract.** §2 is the twelve things a site owes, each written as *what silently stops working if you omit it*. §3 is the read contract key by key. §4 is what a site may never do. §5 is what it may omit. **Non-negotiable.** |
| 2 | `docs/tenant-site-research-2026-09-05.md` §1 | **The method** — what a tenant site inherits from us, which is a way of working and never a look. |
| 2b | `docs/references/TASTE-NOTES.md` | **The owner's own words on how a page MOVES**, verbatim, after scrolling seven sites he chose. See §5b below — it is the single most useful file here and the easiest to misread. |
| 2c | `docs/references/ANALYSIS.md` | Why each of those seven works, read at code level. Long; skim the site that is closest to the register you are building in. |
| 3 | `docs/tenant-site-research-2026-09-05.md` §3 and §5 | **The content inventory.** §3 is what six real detailers' live sites actually carry. §5 is what must never be on one. |
| 4 | `docs/design-knowledge.md` §1 + `CLAUDE.md` § Design never-defaults | **The anti-slop floor.** A floor, not a direction — see §5 below, which is the most important thing in this file. |
| 5 | `app/src/book/core.js` | **The headless booking core.** Its header is the whole API. |
| 6 | `docs/tenant-websites.md` | The owner's own words about what he is buying. Read last; it is the why. |

**Do NOT read `docs/design-system.md` for a tenant site.** It is *our*
identity — Archivo, JetBrains Mono, `#0B0D0E`, the accent green, sixteen
tokens, a fixed section order — and a site built from it comes out as our
landing page recoloured. That happened once already and the owner rejected it
on sight.

---

## 2. What comes from the platform, and how

**One read.** `get_public_business_profile(slug)` — a `security definer` RPC,
callable with the anon key from any origin, returning `business`, `branding`,
`settings`, `service_groups`, `services`, `add_ons`, `plans`, `hours`,
`closures`, `testimonials` and `gallery` for exactly one tenant. It is filtered
on `status = 'active'`, so a suspended business darkens every site built on it
with no code in the site.

**Four writes and calls, all public, all CORS-open:** `calculate-booking`,
`available-slots`, `create-booking`, `validate-promo-code`.

**`app/src/book/core.js` is all six plus every rule that sits on top of them.**
Copy that one file into the site. It has no `import` statement, no React, no
markup, no CSS and no build-tool assumptions, so it drops into anything —
Astro, Alpine, Eleventy, a single `<script type="module">`.

```js
import { createBookingTransport, normalizeProfile, stepsFor, initialForm,
         toggleService, canAdvance, quoteRequest, bookingRequest } from "./core.js";

const api = createBookingTransport({ supabaseUrl: "...", anonKey: "..." });
const profile = normalizeProfile(await api.profile("their-slug"));
```

**The anon key is publishable and belongs in the site's source.** It is not a
secret — every row it can reach is row-level-security-scoped and the public
profile is a function, not a table.

---

## 3. The booking form is built INTO the site

The owner's ruling, 2026-09-05, and it overturned the earlier recommendation
to link out: *"It's up to the detailer's choice but I think it should be built
into the website with the detailer's website design. Like how it is on my
website."*

**His own site is the spec and it is in this repo** —
`reference/frontend/src/components/BookingWidget.jsx`, 1,581 lines in the
site's own components folder, built from the site's own UI kit, rendered
inline. Not a link, not an iframe, not a page.

So: **the form's markup, type, colour and motion are yours. Its rules are not.**
Draw the steps however the site's design wants — seven pages, one long scroll,
a slide-over — and take every rule from `core.js`:

| You must ask the core for | Never derive it yourself |
|---|---|
| `stepsFor(addOns)` | which questions to ask, and in what order |
| `groupServices` / `toggleService` | which services can be picked together |
| `modeLimitFor` / `offersBothModes` | whether mobile or drop-off is even a choice |
| `monthRange` / `slotsForType` / `dayIsOpen` | which days and times are open |
| `quoteRequest` + `calculate-booking` | **every price on the page** |
| `canAdvance` | whether the customer may move on |
| `bookingRequest` + `create-booking` | what is actually submitted |

**Why the site cannot break the money or the calendar even if it tries:**
`create-booking` recomputes every quote server-side through
`_shared/pricing.ts` whatever the client sent, `validateSlot` gates every time,
and the overlap constraint is in the database. A bespoke form **cannot
mis-charge and cannot double-book.** What it *can* do is OFFER a slot the
server then refuses, which costs a customer their booking and is the harder
failure to see — which is exactly why the availability rules are in the core
and not in your head.

**And a site NEVER prints a price it worked out itself.** A site that adds up
service prices has the platform's own oldest defect with the two numbers in two
different codebases, where nothing can ever see both.

---

## 4. Two ways to sell, and they are different products

- **Website package** — the site is the whole front door, the booking form is
  built into it, and it eventually runs on the detailer's own domain
  (roadmap 3.3).
- **Booking only** — no site; the detailer shares
  `detailingplatform.com/book/their-slug`, which is the platform's own page.

*"It's up to the detailer's choice."* If you are reading this, you are
building the first kind.

---

## 5. Taste — READ THIS BEFORE YOU DESIGN ANYTHING

**The three pages in `docs/tenant-sites/` are the STRUCTURAL range, not the
taste reference, and that distinction is the owner's own and is load-bearing.**

They exist to prove three genuinely different worlds can implement the same
contract: `a-shop.html` (the ceramic-and-correction shop — dark, expensive,
serif), `b-van.html` (the one-van operator — **light** ground, warm paper),
`c-volume.html` (the volume shop — industrial, loud, the price table as the
hero). Read them for **section skeletons, seams and how the booking form sits
inside a site.**

**Do NOT copy how they LOOK.** The owner, 2026-09-05: *"All 3 look very ai and
not even like the vibe for detailing but it's fine for now."* They pass every
check this repo owns and still read as AI — which is the finding, not an
excuse: **the anti-slop floor is a list of NEVERS, and a list of nevers cannot
produce a vibe.** The never-defaults catch the tells of a few years ago; they
do not catch the current house style of AI design output — editorial serif,
ruled rows, wide letter-spaced small-caps labels, generous whitespace, a muted
"sophisticated" palette, stock photos in neat rectangles. Two of the three are
squarely that.

**What actually unblocks this is the owner's taste, not a fourth attempt**:
two or three detailer sites whose *vibe* he likes, a sentence each — a
`TASTE-NOTES` pass for this trade, which has never existed. **A fourth guess
is how this item already burned two.** Diagnosis and the three candidate
causes: `docs/tenant-site-research-2026-09-05.md` §7.

**And the transferable half, if you are one of several agents on this:** three
agents given one brief produce one family — same section list, same content,
same seams, only the paint varied. *Varying the palette while fixing the
skeleton does not produce variety.* If a client's site is being built beside
another one, the skeletons have to differ first.

**No Fable for building pages** — the owner, 2026-09-05: *"No more fable when
making pages."* Whichever model is already running builds and verifies.

### 5b. The one taste file that does exist, and how to read it

`docs/references/TASTE-NOTES.md` is the owner's own words, verbatim, after
scrolling seven sites he picked himself. **It is the only record in this repo
of how a page MOVES** — a screenshot is a still and the code analysis beside it
cannot watch a page — and §1 of the research says the motion mentality is
precisely what transfers to a tenant site.

**Read it for MOTION and never for LOOK.** The seven are product and agency
sites, not detailers: their palettes, their type and their subject matter are
all wrong for this trade, and copying them is the same mistake as copying our
landing page. What is right is the vocabulary — *"there's a velocity to the
scroll"*, *"that first main page turns into a rectangle and then completely
forms into another part of the website"*, and the complaint that follows it
about blockiness and unreadable type.

**One line in it is worth the whole file for this problem**, and it is the
answer to the AI-slop verdict in §5: *"I also like how each section looks
different, you know, and they all don't look the same."* Every page rejected
so far has had one section shape repeated down the page in three colours.

**What it does NOT contain is the thing §5 says would unblock a client's
site**: two or three DETAILER sites whose vibe he likes. That pass has never
been done for this trade.

---

## 6. What a client actually gets to change

The contract fixes what a site must IMPLEMENT (§2) and forbids what it must
never do (§4). Everything else is the client's, and this is the split to hold
in your head when they ask for something:

| They ask for | The answer |
|---|---|
| A different look, type, colour, section order, motion | **Yes, entirely.** That is the whole product. Nothing is shared with us or with any other client's site. |
| A section the contract does not mention — a team page, a fleet page, an area map | **Yes.** The contract is a floor, not a ceiling. Anything with no tenant data behind it is just a page. |
| To leave something out | **Check contract §5 first.** Some omissions are free; twelve of them break a dashboard feature silently, which is what §2 enumerates. |
| A price, service, hour or plan hard-coded into the site | **No, and this is the one hard no.** It comes from the profile or it is not on the page. |
| A booking step that behaves differently | **The FORM is yours; the RULES are not.** Draw it however you like and take every rule from `core.js` (§3). |
| A new field on the business itself | **A schema change, not a site change.** It belongs in the dashboard so every client gets it — that is a conversation with the owner, not a local addition. |

**A site carries no client content of its own.** Names, prices, hours,
services, photos, reviews, FAQ, credentials and the payment methods all come
from the profile, live, so a change made in the dashboard changes the site with
no code edit. That is the feature the product is sold on, and it is the reason
the "hard no" above is hard.

**AND THIS KIT BUILDS THE FIRST CLIENT SITE, NOT ONLY LATER ONES.** The owner,
2026-08-29: *"Phase 3, we will build it, and then the first customer site will
be built by our bot."* Nothing is sold before this exists, so there is no
hand-built site to be inconsistent with and no gap between what the sales page
promises and what is here.

**THE QUESTIONS ARE WRITTEN NOW — `docs/tenant-site-intake.md` (2026-09-06),
and its § 1 is the part that matters: only ask what the product does not
already know, because half of what a site needs is in the database and an
intake that asks for it again creates a second copy that goes stale. The
EXAMPLES half is still blocked on the owner's taste.** The original note:

**NOT BUILT, AND WORTH KNOWING ABOUT: the intake form.** The owner described it
2026-08-29 — a short set of questions a detailer answers about their website,
*with examples to choose from*, "because most of them will not know what they
want in the abstract". It is not scheduled. Until it exists, the brief for a
client's site comes from the owner in his own words, and §5 above is the part
of that conversation to make sure actually happens.

---

## 7. Verify by LOOKING, and the three things that are not optional

Nothing in this repo tests a tenant site — `composition.test.mjs` walks
`app/src` and one named HTML file, so a site is held by looking at it.

1. **Screenshot 1920 / 1440x900 / 768x1024 / 392x844 and read the console at
   each**, in the normal path and with animations off. 320 is the narrowest
   width the platform supports and a site should not do worse.
   `node scripts/shoot-dashboard.mjs --url <path>.html` photographs one.
2. **Every colour clears its contrast floor** — 4.5:1 for body text, 3:1 for
   large text and for a fill carrying meaning. This is the one part of our
   design system that transfers whole, because it is arithmetic rather than
   taste.
3. **The booking form's steps fit without scrolling inside a step.** The
   owner's rule (W16), and it is the rule that loses a booking when broken.
   Our own numbers are on `sweep-booking-steps.mjs`; yours will differ because
   your type does, so measure rather than assume.

---

## 8. What is still open, and what to do about it

- ~~**The detailer's own domain (contract §6a).**~~ **CLOSED — roadmap 3.3,
  2026-09-05.** Every emailed link now uses the detailer's own address once
  they have one. **The thing to know when handing over a site: the address we
  store is a hostname that resolves to OUR APP — normally
  `book.theirdomain.com` aliased onto our hosting — and not the address their
  bespoke site lives on.** The receipt, plan and opt-out pages are pages our
  app serves; pointing those at their site would turn a visible seam into a
  404. So a website-package client typically has two: their own apex for the
  site you are building, and a `book.` subdomain for us. Runbook:
  `docs/custom-domains.md`.
- **A light site sends the customer to a dark booking form**, if you link out
  to `/book/:slug` rather than building the form in. Building it in — which is
  what the owner asked for — makes this a non-issue, which is the other reason
  his ruling was right. Contract §8.2.
- **The detailer's email address is not published** and that is a live
  question with the owner (contract §6f). Use the phone number and the booking
  form for contact.
- **Campaign links** (`?c=…` on a printed QR code) are a working feature on the
  owner's own site that this platform dropped. A site is the natural caller and
  the screen that reads them back is roadmap 4.2 — **do not wire it up yet**;
  a site writing rows no screen shows is a half-feature.
- **The intake form** — the questions a detailer answers so an agent has a
  brief, with examples to pick from, "because most of them will not know what
  they want in the abstract". Described by the owner 2026-08-29, not scheduled.
  §6 says what to do until it exists.
- **A `TASTE-NOTES` pass for THIS trade** — two or three detailer sites whose
  vibe the owner likes, a sentence each. §5 is the whole argument for why this
  is the thing that unblocks a real client's site, and §5b is why the existing
  taste file is not it.
