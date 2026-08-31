# Do the categories actually work for every detailer? — 2026-08-31

**The owner asked the right question, the same day 2.8b shipped:** was the
category system researched properly, will it work for all detailers, and does
it need a rule where *"if you choose something from one category you can't
choose from another"*?

**The honest starting point: roadmap 2.8b built what roadmap 2.8's research
said, and did no new research of its own.** That research studied five real
menus and borrowed the restaurant point-of-sale "modifier group" pattern. Its
own second paragraph warned that five menus can rule shapes IN and cannot rule
the remaining ones OUT — and that limit had already cost us once, because his
own business turned out to be a sixth shape the five did not contain. He was
poking at exactly that limit again.

**He was right. There is a hole, and it is the one he described.** It is not
where he pointed — it is not about Interior versus Exterior — but the rule he
asked for is the rule that fixes it.

## What was looked at this time

- **Five more real detailing menus and booking flows**, chosen for the shape
  the question is about (a menu that has both complete packages and standalone
  interior/exterior work). Five were studied in 2.8; this makes ten.
- **Four booking/POS products' own configuration documentation** — Zenbooker
  (field-service booking, sold to mobile detailers), Square Appointments,
  Toast, and Thryv. These answer "what settings does a mature product in this
  space actually expose", which is a different and harder-to-fake question than
  "what would be nice".
- **The trade's own menu-building advice.**

Ten menus is still not a survey. It is enough to say a shape EXISTS and is
normal; it is not enough to say how common one is. Every number below is a
count of what was seen, not a statistic.

## The six menu shapes seen so far

| | Structure | Can a customer take more than one service? |
|---|---|---|
| Atlanta Mobile Detailing | one flat list of 7 packages — "Full-Interior" and "Base" sit in the same list as the combined ones | one |
| SBL Detailing | one list: Exterior Only / Full Detail / Interior Only, plus 6 add-ons | one, plus add-ons |
| Felix Mobile Detailing | packages plus optional add-ons | *"Select one detailing package"* |
| Xclusive Detailing Customs | **6 categories** — Complete Packages, Ceramic, Maintenance Washes, Exterior, Interior, Common Additions | one service overall; categories are navigation |
| **Oregon Detail Co** | **Full Detail Packages / Interior Detailing / Exterior Detailing / Additional Services** | *this is the case that breaks us — see below* |
| The owner's | Interior / Exterior / add-ons | **one from each category** |

Two things fall out immediately.

**1. "One service per booking" is the dominant shape, and categories are
usually just headings.** Four of the five new menus expect a single service.
Xclusive has six categories and still expects one service overall — the
categories are how you find the thing, not how many you may take.

**2. The owner's shape is real and is not just his.** The trade's own
menu-building advice describes it directly: build interior packages and
exterior packages and let a customer *"choose one interior package and one
exterior package and combine them"*. So per-category rules are not a mistake.
They are just not the whole answer.

## The hole, and it is exactly what he asked about

**Oregon Detail Co's menu, rebuilt in our system today, sells the same work
twice.** Three categories — Full Detail Packages, Interior Detailing, Exterior
Detailing — each set to "customers pick one", which is the honest way to
describe each of them on its own. A customer can then select:

    Ultimate Detail Package   $625     (interior AND exterior, complete)
  + Complete Interior Detail  $320     (interior, again)
  + 2-Stage Paint Correction  $700     (exterior, again)

Every category obeys its rule. The booking is nonsense. **This is the same
defect the owner reported in W25** — he ticked "Full Detail" and "Interior"
together and found it confusing — reproduced by the very system built to fix
it, one level up.

**REPRODUCED, not reasoned about.** That menu was loaded onto the demo
business and put through the real booking page and the real edge function on
2026-08-31:

- The booking page let all three be selected. Every category showed “choose
  one” and every category was obeyed.
- The price bar read **$1,645.00 · 15 hrs**.
- `create-booking` **accepted it**. The first attempt came back 409, but the
  message was *“that service would run until 23:00, past our 18:00 close”* —
  the working-hours guard, which runs after the category check. With the
  durations shortened so the day fits, the same three services booked
  successfully for **$1,645**.

So neither half of the enforcement sees it, and that is not a bug in either:
`max_select` only ever counts inside ONE category, and there is only ever one
service in each. The relationship it cannot express is the one between
categories — *a complete package already contains the standalone work.*

## Why pairwise "category A excludes category B" is the wrong mechanism

It is the obvious shape and it is worth saying clearly why it was rejected,
because the owner named it and the rejection is not a dismissal.

**No product in this space exposes it.** Checked directly:

- **Zenbooker** — a modifier group has a name, an optional description, a
  **Required** toggle and a **Multi-Select** checkbox. Options carry a price
  and a duration. That is the whole of it: no minimum/maximum counts, no
  conditional display, no exclusion between groups.
- **Square Appointments** — one business-wide switch, *"Allow multiple
  services to be booked online"*, **off by default**. No per-service or
  per-category rules at all.
- **Toast** — modifier groups with minimum and maximum selections, and
  *nested* modifiers ("if this, then that") which drill DOWN from one option
  into another group. Nothing that makes two groups incompatible.
- **Thryv** — services become unselectable together, but the incompatibility
  is **derived** from what the services already are (same location, same
  staff, same availability) and *"the most restrictive rule applies to the
  entire booking"*. The business never hand-configures a pair.

**And it does not scale for the detailer.** Xclusive's six categories would
need thirty pairwise decisions to say "one service, please". A detailer
setting up their menu would have to think about every combination of their own
categories, which is the kind of setup work that makes people abandon a
product at hour one.

> **BUILT 2026-08-31 — the owner read this and said “build everything”.**
> Roadmap 2.8c: the per-category switch below, plus the category description,
> per-service availability, travel areas and both surcharge kinds from “The
> other settings” further down. The Oregon Detail Co menu that booked $1,645
> for $625 of work now books $625, refused on the page and by
> `create-booking`. What the building turned up — including a live money bug
> in the travel fee — is in DECISIONS.md → “Roadmap 2.8c”.

## What is recommended instead: one switch per category

**"Choosing from this category is the whole booking."** One boolean on
`service_groups`, beside the pick-one/pick-any rule that is already there.
When it is on, selecting anything from that category clears everything else
and nothing else can be added.

It is one checkbox, it is worded as the thing the detailer actually means, and
it covers every shape found in ten menus:

| Menu | How it is expressed |
|---|---|
| Atlanta, SBL, Felix | one category, pick one — already works today |
| **Oregon Detail Co** | mark **Full Detail Packages** as the whole booking. Interior and Exterior stay combinable with each other, which is what that shop wants |
| Xclusive (one service overall) | mark all six categories. Six checkboxes, not thirty pairs |
| **The owner's** | mark nothing. Interior and Exterior stay one-each, exactly as built |
| à la carte shop | no categories, or pick-any — already works today |

The alternative considered and rejected was a business-level *"can a customer
book more than one service"* switch, copying Square Appointments. It is
simpler, and it handles Xclusive and the four one-service menus — but it is
too blunt for Oregon Detail, which genuinely wants a customer to combine a
standalone interior and a standalone exterior, just never with the complete
package. The per-category switch handles that; the business-level one cannot.

**Cost, stated plainly:** one nullable column, one rule applied in two places
(the booking page as a courtesy, `create-booking` as the enforcement — the
same two places `max_select` already lives), and one more thing on the
category editor for every detailer to read past. It changes nothing for any
existing tenant, because off is today's behaviour.

## The other settings the trade exposes and we do not

> **Numbers 1, 2 and 3 were BUILT in roadmap 2.8c.** Time-of-day and
> short-notice surcharges and travel areas (named, not geocoded — we cannot
> measure a distance); per-service weekdays and mobile/drop-off eligibility;
> and the category description. **Number 4, a required category, was NOT** —
> the reasoning below still holds. Number 5 is unchanged.

Answering the second half of his question. Ranked by how much evidence there
is that a detailer actually needs it, not by how easy it is.

1. **Time-based and distance-based pricing.** Zenbooker sells three kinds of
   price adjustment rule: by **day of week and start time** (weekend or
   evening surcharge), by **how far ahead the job is booked** (a rush fee),
   and by **which territory** it is in (distance-based travel). We have a
   single flat travel fee and nothing else. This is the biggest real gap
   found, and none of it touches the booking page's shape.
2. **Per-service availability.** Urable advertises *"only offering certain
   services on certain days"*. We model mobile-vs-drop-off per business and
   per date (roadmap 2.7's W4) but never per service — so "ceramic coatings
   only on Tuesdays and Wednesdays" cannot be said. Roadmap 2.8 already noted
   the sibling gap: a service that cannot be done mobile at all.
3. **A description on a category.** Zenbooker's modifier groups have one; ours
   have a name only. One line under "INTERIOR" saying what it is for. Cheap,
   and it costs step-1 height, which is now the scarce thing.
4. **"Required" per category.** Zenbooker has it; Toast has a minimum. Roadmap
   2.8 declined it because our global "a booking needs at least one service"
   rule does the same work, and that reasoning still holds for every menu seen
   — but it is worth knowing two mature products expose it, so if a "you must
   pick a base package, then optionally add" menu ever turns up, this is the
   missing piece.
5. **Deposits**, and **"frequently bought together"** upselling (Urable does
   both). Both were already known: deposits are blocked on billing, and the
   upsell is a feature rather than a setting.

## What this cannot tell you

- **How common each shape is.** Ten menus is ten menus. Every shape below was
  seen at least once; none of them has a percentage next to it and none should
  be given one.
- **What a detailer with no online menu does.** The whole sample is
  businesses with a published booking flow, which skews established. That
  direction of error stays safe for us: we would be building for more
  structure than the smallest tenant needs, and every setting here is
  optional.
- **Whether Thryv hand-configures incompatibility.** Its help page returned
  403 and the wording quoted above came from search results rather than from
  the page itself. The claim used here is only that its exclusions are derived
  from service attributes, which the snippet states plainly.

## Sources

Real detailers' own menus and booking flows (primary, new this round):

- [Atlanta Mobile Detailing — services](https://www.atlantamobiledetails.com/services)
- [SBL Detailing — packages](https://www.sbldetailing.com/packages)
- [Xclusive Detailing Customs — book online](https://www.xdcustoms.com/book-online)
- [Oregon Detail Co — service menu](https://oregondetail.com/service-menu)
- [Felix Mobile Detailing — booking](https://felixdetailing.com/booking-car-detailing-booking-online-car-detailing-packages)

What the trade's software actually exposes as settings:

- [Zenbooker — service options / price modifiers](https://help.zenbooker.com/en/articles/1451468-service-options-or-price-modifiers)
- [Zenbooker — price adjustment rules](https://help.zenbooker.com/en/articles/5155813-price-adjustment-rules)
- [Square Appointments — account settings](https://squareup.com/help/us/en/article/5351-manage-your-square-appointments-account-settings)
- [Toast — adding modifier groups and modifiers](https://support.toasttab.com/en/article/Adding-Modifier-Groups-and-Modifiers-in-the-Menu-Builder)
- [Toast — building nested modifiers](https://support.toasttab.com/en/article/Building-Nested-Modifiers)
- [Thryv — multi-service appointments](https://learn.thryv.com/hc/en-us/articles/28744307493005-Schedule-and-Manage-Multi-Service-Appointments-in-Thryv-Business-Center)
- [Urable — online booking](https://urable.com/online-booking/)

Menu-building advice from the trade:

- [Fortador — how to build your perfect auto detailing menu](https://www.fortador-usa.com/blog/how-to-build-your-perfect-auto-detailing-menu)
- [Detail King — how to create detailing packages and prices](https://blog.detailking.com/how-to-create-packages-pricing/)
- [Auto Laundry News — simple menu design](https://www.carwashmag.com/simple-menu-design-a-handful-of-options-is-all-you-need/)
- [Jobber — car detailing prices 2026](https://www.getjobber.com/academy/auto-detailing/how-much-to-charge-for-car-detailing/)
