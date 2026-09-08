# Real detailer data, pulled off real sites — 2026-09-08

**His instruction:** *"find some actual detailer websites to use their
information to slightly change. That way, you have some actual step to go off
of."*

**WHY THIS FILE EXISTS RATHER THAN INVENTED NUMBERS.** Every mock-up this repo
has built so far used prices somebody made up, and made-up prices have a tell:
they are round, they are evenly spaced, and there are three of them. Real
ladders are none of those things. `taste-copy.tmp.mjs` read ten live detailer
sites; what follows is the SHAPE, which is what transfers — **the numbers below
are adapted, not copied, on every mock-up that uses them.**

---

## 1. THE LADDER IS THREE SIZES WIDE, AND THE NUMBERS ARE AWKWARD

`rcd` prints a genuine matrix — three services down, three vehicle sizes across:

```
                      sedan   mid-size   oversized
  Interior             $200      $220        $350
  Exterior             $220      $250        $375
  Full Detail          $250      $280        $420
```

**Note what an invented ladder would have got wrong.** The gaps are not equal
($20, $130 on one row; $30, $125 on the next). The oversized column is a
*jump*, not a step. And the third column is nearly double the first, which is
the honest answer for a three-row SUV and reads as real precisely because it is
uncomfortable.

`luster` runs the same three-wide shape at a higher tier —
`$250 / $325 / $400`, `$300 / $375 / $475`, `$425 / $525` (that last service
has only two sizes, which an invented table would never do).

**This is `services.vehicle_size_adjustments` against
`business_settings.vehicle_sizes`, and contract § 2b requires it.** Five of six
detailers in the earlier research printed every size; *how much* is the question
the site exists to answer and the honest answer has three numbers in it.

## 2. THE DISCLAIMER IS ALWAYS THERE, AND IT IS ALWAYS ABOUT CONDITION

Straight off the pages:

- *"Prices start here and depend on the condition"* — luster, three times, on
  three different services
- *"All prices are starting points, customized based on size and condition."* — rcd
- *"Final pricing is confirmed after a quick inspection based on condition and
  contamination level."* — rcd
- *"Vehicles with a third row are subject to a $50 increase on Interior and
  Full Detail services."* — rcd
- *"Extreme condition / Odor Removal — Call for details"* — luster
- *"Excessive Pet Hair Removal"* as its own line item — mrgreen

**This is `services.notes` (contract § 2b), and it is a detailer managing an
expectation before it becomes an argument on a driveway.** It is also why
`price_is_from` exists: a flat price on a detail is a promise nobody in this
trade actually makes.

## 3. THE FAQ IS ABOUT FIVE THINGS, AND FOUR ARE ANXIETIES

Real questions, verbatim from `rcd`:

- *DO YOU OFFER MOBILE DETAILING?*
- *WHY DOES PRICING VARY AFTER INSPECTION?*
- *HOW OFTEN SHOULD I HAVE MY VEHICLE DETAILED?*
- *DO YOU REMOVE ALL STAINS AND PET HAIR?*
- *WHAT IF MY VEHICLE NEEDS MORE THAN THE PACKAGE I BOOKED?*

**Four of the five are the customer being anxious about money or outcome, not
curious about the service.** An invented FAQ asks *"What is ceramic coating?"*
A real one asks *"why did the price change after you looked at it."*

**This is `business_faqs` (contract § 2h) — which roadmap gap 6b says is stored
and exposed to nobody, so a site cannot read it yet.**

## 4. THE SERVICE NAMES, AND THE ONES WORTH STEALING

Common across all ten: *Interior Detail*, *Exterior Detail*, *Full Detail*,
*Paint Correction* (**1-step and 2-step, priced separately**), *Ceramic
Coating*, *Paint Protection Film*, *Window Tint*, *Headlight Restoration*,
*Engine Bay*.

**The unusual ones are where a real business shows through**, and they are the
best argument that a platform must not ship a fixed service list:

- `carolina` — **RV detailing at `$11 / foot`**, boat detailing, **golf cart
  $125**, **trailer washout $80**. A per-foot price is a `price_kind` this
  product does not have.
- `mrgreen` — **pickup and delivery for $29**, and *"walk in service starting at
  $175"*.
- `meli` — a named flagship, *Meli's Signature Detail*, sitting above the
  catalogue rather than in it.
- `sixspeed` — RV / Marine / **Aviation** as top-level categories.

**`$11/foot` and `$29 pickup` are the two that matter most**: neither is
expressible as a flat service price, and a mock-up that only ever shows
`$200 / $220 / $350` is quietly asserting that every detailer prices the same
way. Two of the ten mock-ups carry an awkward one on purpose.

## 5. WHAT THE PRICE RANGE ACTUALLY IS

Across the ten sites: **$29 (a pickup) to $1,200 (a multi-year coating)**, with
the bulk of ordinary details landing **$120–$500** and coatings **$750–$1,200**.

`meli`: $120, $200, $275, $350, $400, $500, $750, $800, $1,000, $1,200.
`mrgreen`: $29, $79, $175, $185, $225, $230, $375, $385.
`carolina`: $55, $80, $110, $125, $195, $200, $300, $390, $395, $750.

**A mock-up whose every price ends in 0 or 5 and sits between $99 and $299 is
describing a business nobody runs.**

---

## HOW THE MOCK-UPS USE THIS

**Adapted, never copied.** Different business names, different cities,
different service mixes, and every figure moved. What is kept is the *shape*:
an awkward three-wide ladder, a condition disclaimer on the services that need
one, an anxious FAQ, at least one price shape that is not a flat number, and a
range that spans an order of magnitude.

**AND EVERY FIGURE IN EVERY MOCK-UP IS A PLACEHOLDER.** On a live tenant site
each one comes from `get_public_business_profile`, and the total from
`calculate-booking` — because a rate typed into a tenant's HTML is a number the
detailer changes in their dashboard and not here. Each page marks the ones that
are live-managed with `data-live` so the distinction is visible in the source.
