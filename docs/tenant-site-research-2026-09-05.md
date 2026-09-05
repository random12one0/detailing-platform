# What a detailer's website actually looks like, and what it carries

**2026-09-05, roadmap 3.1. Written because the owner rejected the first
attempt, and he was right.**

> *"It shouldn't look exactly like our landing page, it should genuinely be
> different. Y'know different colors fonts aesthetic. Find some detailer
> websites for like an example. But what I meant by default using our design, I
> more meant like the mentality of how we do things. The scrolling, the inspo
> etc. Not making it look like the landing page."*

> *"Also make sure it doesn't include anything that doesn't make sense for a
> detailer's website. And include everything they would want."*

**HIS OWN WORDS IN `docs/tenant-websites.md` ALREADY SAID THIS AND I MISREAD
THEM.** He wrote, 2026-08-29: *"I want that same **research** to be used in the
website making for the detailers."* Research, not look. The roadmap entry's
paraphrase — *"the kit ships a default"* — is what turned a method into a
skin, and the first attempt came out as The Thread recoloured: same ground,
same two faces, same accent green, same skeleton. **A default LOOK is a
cookie-cutter website, which is the exact thing he rejected on 2026-08-29**
(*"Earlier we kind of thought, like, over-scoped, some cookie-cutter website.
No."*). The two halves of this repo had been contradicting each other since.

---

## 1. What transfers, and what does not

**TRANSFERS — the method.** This is what "our design" means for a tenant site:

- **The research habit.** Look at real sites in the trade first, read them at
  code level, write down why something works before building anything. That is
  `docs/references/ANALYSIS.md` and `TASTE-NOTES.md` as a *process*, not as a
  palette.
- **The anti-slop floor** — `docs/design-knowledge.md` §1 and the never-defaults
  in `CLAUDE.md`. No Inter/Roboto/Arial/system-ui/Space Grotesk. No purple-blue
  gradients on white. No three evenly spaced cards. No numbered markers on
  things that are not sequences. No "modern and clean" copy.
- **The scroll and the motion mentality.** Things arrive from somewhere rather
  than popping into place; a screen has ONE arrival; a thing that opens ships
  its exit in the same change; parts move on different timelines, never as one
  uniform block (the "it looks like a page refresh" rejection, 2026-09-04);
  everything degrades under `prefers-reduced-motion` and `.lite` from one
  implementation.
- **The copy rule.** A sentence that only restates the control above it gets
  deleted. His rule, 2026-09-01.
- **The accessibility floors** — 4.5:1 text, 3:1 UI, measured on the pairs
  actually shipped.
- **Verify by looking**, at 1920 / 1440 / 768 / 392 / 320, console read at each.
- **Every skeleton different.** Eleven sections should be eleven shapes.

**DOES NOT TRANSFER — the skin.** The ground, the palette, the two faces
(Archivo + JetBrains Mono), the sixteen tokens, the accent green, the section
order, the specific components. **Those belong to the platform's own product
and to nothing else.** A tenant site that reuses them is our marketing page
wearing a detailer's name, and ten of them are ten identical sites.

---

## 2. What was looked at

Six real detailing businesses' live sites, on 2026-09-05, in a browser rather
than through a roundup article. Three were already in
`docs/detailer-research-2026-08-31.md` — but that file read them for MENU
SHAPE and never once looked at them. Roundup listicles were checked and
discarded: they describe every site as "clean, modern, high-quality imagery",
which is worth nothing.

| Site | Ground | Colour | Type | Signature |
|---|---|---|---|---|
| [The 612 Auto Spa](https://612autospa.com) | dark | black + brass/gold | heavy condensed uppercase display | a stat row — `5★ GOOGLE RATING · 100% MOBILE SERVICE · EST. 2024` — and a booking-season banner |
| [Atomic Auto Salon](https://atomicautosalon.com) | dark | magenta + black | very wide-tracked uppercase | certification badges as the hero (Ceramic Pro Elite Dealer); address + socials in a top strip |
| [Dapper Pros](https://dapperpros.com) | light/photo | violet + white | script wordmark over a grotesk | an offer bar pinned above the nav (`SAVE $10 BY BOOKING ONLINE`) |
| [MOV Mobile Detailing](https://movmobiledetailing.com) | dark | red + black | italic outline logotype | a bundle/gift-certificate strip; a WhatsApp button |
| [Final Touch Auto Spa](https://finaltouchautospa.com) | light | blue + white | plain grotesk | the most CONTENT of the six: coupons, credentials, warranties, loaner cars |
| [Detailz Car Care](https://detailzcarcare.com) | light | blue + silver | generic | trust seals in a row; est. 1993 |

**Three findings about the category as a whole:**

1. **There is no house look and there is no dominant one.** Black-and-gold,
   magenta, violet, red, blue. What they share is a *register* — a local trade
   that wants to look expensive — not a palette.
2. **They are not shy.** Big type, saturated colour, photography of a specific
   car. Nothing on this list is quiet. A restrained SaaS aesthetic would read
   as the wrong trade.
3. **The good ones are good in a way ours must not copy either.** 612 Auto Spa
   is the best of the six and is black-and-brass condensed uppercase; making
   that our new default just moves the cookie-cutter one step sideways.

---

## 3. What a detailer's site CONTAINS — the inventory

Counted across the six. **This is the answer to "include everything they would
want", and it is evidence rather than a guess.** Ordered by how often it
appeared.

| Thing | Seen on | Can our dashboard feed it? |
|---|---|---|
| Phone number visible at the top of every page | 6 / 6 | **Yes** — `businesses.contact_phone` |
| Packages with long inclusion lists (10–20 lines each) | 6 / 6 | **Yes** — `services.features` |
| Before / after photography | 6 / 6 | **Yes** — `gallery_images.kind = before_after` |
| Reviews with a star rating and a source | 6 / 6 | **Yes** — `testimonials` |
| A named service area (cities, or "within N miles") | 6 / 6 | **Yes** — `service_area`, `travel_radius_miles` |
| **Prices as a VEHICLE-SIZE LADDER** (`$179 sedan / $229 mid / $279 XL`) | 5 / 6 | **Yes** — `services.vehicle_size_adjustments` + `business_settings.vehicle_sizes`. **§4a** |
| **Disclaimers on a service** ("this is NOT a ceramic coating", "add-ons may be required depending on the vehicle's starting condition") | 4 / 6 | **Yes** — `services.notes`, `add_ons.notes`. **§4b** |
| **Credentials and trust markers** — licensed, insured, certified installer, years in business, "75 years combined experience" | 5 / 6 | **NO. §4c** |
| **A specials / coupons block** | 4 / 6 | Partly — `site_discount_*` and promo codes. **§4d** |
| A "why choose us" strip (loaner car, same-day, free estimates, eco-friendly) | 4 / 6 | **NO. §4c** |
| Hours with an open/closed state | 4 / 6 | **Yes** — `business_hours` |
| **Gift certificates** | 2 / 6 | **NO. §4e** |
| A free-quote request separate from booking | 3 / 6 | **Yes** — request mode, or a quote |
| Chat / WhatsApp widget | 3 / 6 | No, and deliberately not — see §5 |
| Cookie banner, entry popup | 3 / 6 | No, and deliberately not — see §5 |

---

## 4. What this changes about the contract

Four corrections and one confirmation for `docs/tenant-site-contract.md`.

### 4a. The vehicle-size ladder is REQUIRED, not omittable — a correction
The contract's §5 listed the vehicle-size table among the things a site may
leave out, reasoning that it is consumed inside the booking flow. **Five of six
real sites print the whole ladder on the page**, because "how much is it" is
the question the site exists to answer and the honest answer has three numbers
in it. A site that prints one "from" price makes the detailer field a phone
call they had already paid to avoid. **This moves from §5 to §2b.**

### 4b. `services.notes` is load-bearing and the contract did not require it
Four of six carry disclaimers, and they are the same two disclaimers: *this is
not a ceramic coating*, and *condition may change the price*. That is a
detailer managing an expectation before it becomes an argument on a driveway.
`services.notes` and `add_ons.notes` are already in the RPC and §3 lists them;
**§2b and §2c now require the site to render them.**

### 4c. Credentials and trust markers — A NEW GAP, and the biggest one for a site
Five of six lead with some of: *licensed and insured*, *certified Ceramic Pro
installer*, *IDA certified*, *est. 1993*, *manufacturer warranties*, *5★ across
N Google reviews*. **The schema holds none of it.** There is nowhere for a
detailer to type "insured" or "certified" or "since 2016", so every bespoke
site would have to hard-code it — which is exactly the failure the contract
exists to prevent, since a lapsed certification then lives in a client's HTML.
**Recommended shape: one `business_branding.credentials jsonb` — a list of
`{ label, detail?, year? }` — plus `businesses.established_year`.** Cheap, and
the same reasoning `faqs` already used.

### 4d. The specials block is wider than `site_discount_*`
Real specials are *"buy one gold detail, get 30% off the second"* and
*"bundle a package and save 10–33%"* — bundles, not a single percentage.
`site_discount_*` covers the one-percentage case and promo codes cover the
coded case; **neither can express a bundle.** Not recommended for building now:
it is a pricing-engine change, and the honest version is that a detailer types
the offer as words. **Named here so nobody builds half of it.**

### 4e. Gift certificates — a real gap, deliberately NOT recommended
Two of six sell them. It is money taken before a service exists, which is a
liability, a balance to track and a redemption path — a feature, not a field.
**Recorded so it is a decision rather than an oversight.**

### 4f. Confirmed by the same evidence
Six of six put the phone at the top; the contract's §2k requires it. Six of six
carry before/after; §2f requires the pair rather than two loose photos. Every
one names its service area; §2j requires it.

---

## 5. What must NOT be on a tenant site

His second message: *"make sure it doesn't include anything that doesn't make
sense for a detailer's website."* Three kinds of thing, and the first is the
one the first attempt was guilty of.

1. **Anything that belongs to the PLATFORM rather than to the detailer.** Our
   ground, our two faces, our accent, our section rhythm — and any wording
   about software, dashboards, booking engines or "the platform". A customer
   arriving at Northline Detail is buying a car wash from a person, not
   evaluating a SaaS product. **A "site & booking by Detailing Platform"
   footer credit is the owner's call and is currently unasked; it is not a
   default.**
2. **SaaS-page furniture.** Feature grids, "trusted by" logo walls, integration
   lists, pricing tiers framed as plans-per-month for the SITE, changelogs,
   "book a demo", social proof counters about the product. None of it survives
   contact with a driveway.
3. **The trade's own bad habits, even though 3 of 6 have them.** Entry popups,
   cookie banners bolted on by a plugin, chat widgets that cover the price on a
   phone, and auto-playing audio. Frequency in the sample is not endorsement —
   `docs/design-knowledge.md` §1 outranks it.

---

## 6. So what does the kit actually ship?

**Not one default page.** Three worked examples in genuinely different worlds —
different type, different palette, different ground (one of them light),
different section skeletons — each implementing the same twelve things from
`docs/tenant-site-contract.md` §2 and each built by the method in §1 above.

**Three rather than one, because one example is a template.** A single page,
however good, is copied; three that disagree with each other can only be read
as *"pick a direction and build it properly"*, which is what he actually
asked for on 2026-08-29 and again today.

The three, chosen to span the register the six real sites occupy without
copying any of them:

- **A — the shop that does ceramic and correction.** Dark, expensive,
  restrained colour, a serif doing the talking. The end of the trade that
  charges $1,500 and wants to look like it.
- **B — the one-van operator.** LIGHT ground, warm paper, a workmanlike
  grotesk beside a real text face. Approachable rather than luxurious; the
  detailer who is the whole business and whose face is on the page.
- **C — the volume shop.** High-contrast, industrial, loud, fast. Big type, a
  saturated single colour, price ladders you can read from a car park.

**B is deliberately LIGHT, and that has a consequence the contract must
carry:** the booking flow is dark and a client site cannot restyle it, so a
light tenant site sends the customer from a light page to a dark form
mid-purchase. `BookingBusinessContext.jsx` has carried the note *"reopen in
phase 3 if a bespoke tenant site turns out light"* since 2026-08-30. **This is
phase 3, and B is that case.** Contract §8.2.

---

## Sources

Real detailers' live sites, looked at 2026-09-05:

- [The 612 Auto Spa](https://612autospa.com)
- [Atomic Auto Salon](https://atomicautosalon.com)
- [Dapper Pros](https://dapperpros.com)
- [MOV Mobile Detailing](https://movmobiledetailing.com)
- [Final Touch Auto Spa](https://finaltouchautospa.com)
- [Detailz Car Care](https://detailzcarcare.com)

Roundups, read and then discounted as evidence — every entry is described as
"clean, modern, high-quality imagery", which distinguishes nothing:

- [CyberOptik — 20 best auto detailing websites of 2026](https://www.cyberoptik.net/blog/best-auto-detailing-websites-success-secrets/)
