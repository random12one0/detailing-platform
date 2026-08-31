# How other detailers actually work — 2026-08-31 (roadmap 2.8)

The owner asked for this more than once, and the walkthrough file says why:
**the product is modelled on one detailing business — his — and he knows it.**
Five of his own walkthrough items (W9, W10, W21, W22, W25, and the W27 thread)
were left unbuilt in roadmap 2.7 on purpose, because each one decides a shape
that a guess would freeze into a schema. This file is the answer, and it is the
input to building them.

## How this was done, and how much weight it carries

Two kinds of source, kept apart on purpose:

- **Primary — five real detailing businesses' own published menus and booking
  flows.** Not articles about detailing; the actual pages a customer books on.
  These are the ones that settle questions about shape, because they are
  someone's real catalogue and someone's real form.
- **Secondary — working detailers talking to each other** (one long forum
  thread), **three trade software vendors** (what the category exposes as
  settings), and trade pricing guides.

**Five menus is not a survey, and nothing below should be read as a
statistic.** It is enough to answer "is our shape possible / normal /
impossible", which is what the five open items actually ask. Where the evidence
is thin the item says so, and the recommendation is the one that is cheapest to
change later.

**Sample bias worth naming:** these are businesses with a public online menu,
which skews toward the more established end. A detailer working off texts and a
Facebook page may be simpler than any of them. That direction of error is safe
for us — we would be building for more structure than the smallest tenant
needs, and every field below is optional.

## The five menus

| | Services | Pick one or many? | Vehicle classes | Add-ons | Add-ons grouped? |
|---|---|---|---|---|---|
| MOV Mobile Detailing | 5 named tiers (Bronze→Platinum) | one | **12** | 3 | no |
| The 612 Auto Spa | 3 (Exterior / Interior / Full) | **one** | 5 | 6 | no |
| Detailz Car Care | 9 packages | one | 2–3 (price ranges) | — | — |
| Final Touch Auto Spa | à la carte only | **many** | — | 9 items | no |
| Professional On Site Detailing | packages + extras | one + extras | — | 7 | no |
| **Ours today** | 4 (demo), flat | **many** | **3** | 2 (demo) | no |

Sources are listed at the bottom.

## The headline: one of his assumptions is backwards

He added the *"I can provide access to water and an outlet"* question **for
himself specifically**, on the belief that he is the unusual one — he carries
no water tank and no generator, and *"most detailers do."*

**The research says the opposite.** In the detailer thread, most working mobile
detailers use the customer's tap and the customer's outlet, ask about it when
booking, and report that customers almost never object. One detailer describes
a 25-gallon tank kept as a rarely-used backup; another carries a tank and a
generator specifically for commercial sites where there is no tap. A mobile
detailing business writing about its own self-sufficient setup frames that as a
premium differentiator — which only reads as a differentiator if it is not the
norm. And a booking-software vendor's own advice to detailers is to make sure
the booking asks the customer where the water is coming from.

So the question he built for himself is the **standard** question, and the
customisation W22 needs is smaller than he feared. What genuinely varies is not
*whether* to ask — it is **which resource**, and **what happens when the answer
is no.** That is the shape below.

Second-order finding that matters more: **water and power are independent.**
A rinseless / waterless operator needs neither. A paint-correction or coating
specialist working out of a customer's garage needs power and a controlled
space but no hose. Today we hold them in one boolean
(`bookings.has_water_electric`, `business_settings.ask_water_electric`), which
cannot express "power yes, water no" on either side.

---

## W9 — what fields a service actually needs

*His words: he listed what exists (name, description, price, duration,
protection, bigger vehicles, add-on) and said "I don't know how detailers
usually use it."*

Five findings, in order of how much they cost us.

### 1. Nobody publishes a flat price. All five publish a FROM-price or a range.

MOV quotes every tier as a span ($100–$215 for Bronze). Detailz quotes ranges
($60–$70, $485–$585). Final Touch says "starting at" on every line. 612 writes
"$30+". Professional On Site has one line that just says prices vary. The trade
guides agree on the reason: condition drives labour hours, and detailers price
the job after they have seen it — the standing advice is to inspect first and
get the customer's approval before adding a condition surcharge.

Part of that spread is vehicle size, which we already model. **The part we
cannot express is that the number is a floor, not a price.** Our booking card
prints `money(s.price)` as a firm figure, and the price bar says "Estimated
total" over a total assembled from firm figures.

**Decided shape:** one boolean on `services`, `price_is_from`. When set, the
card reads *"from $220"* and the review step says the total is a starting price
that the detailer may adjust after seeing the vehicle. One column. It does not
change any arithmetic — only what the number claims to be.

Deliberately NOT built: a "quote only, no price online" service. It is a real
thing (one of the five has one), but it needs a whole quote-request path that
is not a booking, and no owner item asks for it.

### 2. Three vehicle classes is below the trade norm; five is the common shape.

612 uses five (coupe, sedan, small SUV, SUV, truck/large). MOV uses twelve.
The pricing guides consistently name sedan / SUV / truck as the minimum split
and note larger vehicles commonly carry around $100 more. We have three, and
`small` is doing the work of "coupe and sedan" while `large` is doing the work
of "truck, full-size SUV and van" — which are not the same job.

**This one is schema and it is the reason the item was sequenced here.**
`bookings.vehicle_size` is a CHECK constraint pinned to exactly
`('small','medium','large')`, so adding a class is a migration, not a config
change. (`services.vehicle_size_adjustments` is jsonb and would not have cared.)

**Recommended shape, pending the owner:** five classes, extras defaulting to
$0/0 min so nothing changes for a detailer who does not use them. See the
decisions section — this is his call because it adds setup work to every
tenant's catalogue.

### 3. The "what's included" list already exists in the schema and nothing edits it.

`services.features` is a jsonb array, present since the foundation migration.
There is **no UI anywhere that writes it**, and `StepServices.jsx` renders the
first five entries as an inline list on the service card.

That is a live trap, and it is W21's whole problem — see below.

### 4. Some services cannot be done mobile, and that is per-service, not per-business.

Ceramic coating needs a dust-free, weather-free space and 24 hours of cure time
where the car is not driven. Mobile detailers who offer it do it in the
customer's garage or not at all. We model mobile-vs-drop-off at two levels —
`business_settings.mobile_enabled` / `dropoff_enabled` (the whole business) and
`dropoff_only_periods` (a date range, built in 2.7's W4). **The missing level is
the service.** A detailer who is mobile by default but whose coating service is
shop-only has no way to say so, and W4's guard would happily let that booking
through.

Not urgent — no owner item names it — but it belongs on the record as the third
level of a hierarchy we have already built two levels of.

### 5. Two more that are real and are NOT ours to solve yet.

- **Cure and hold time.** A coating job occupies the car for 24 hours after the
  work stops. `services.duration_minutes` is the only time field, and the
  availability engine books one contiguous slot from it. A two-day job cannot
  be booked correctly today. Phase 4 at the earliest.
- **Deposits.** Every trade software vendor treats a booking deposit as the
  standard answer to no-shows. Blocked on billing, which charges nobody
  (PROJECT-STATE §1). Worth knowing it is the category norm rather than a
  nice-to-have.

---

## W10 — add-ons: groups, or reordering?

*His words: "if they could add, like, groups maybe, so that way not everything
is kinda just thrown in there at the same time. Or maybe you could reorder
stuff."*

**The evidence answers this cleanly, and the answer is reordering, not groups.**

Real add-on lists are short: 3 (MOV), 6 (612), 7 (Professional On Site), 9
(Final Touch). **Not one of the five groups them.** Final Touch's nine sit under
a single heading with no subdivision. A list of nine does not need categories;
it needs to be in the order the detailer wants to sell it in.

Note the asymmetry with services, and that it is correct rather than an
oversight: services DO group in the wild (interior / exterior / protection /
complete), and `services.group_label` already exists and is already rendered as
a heading in step 1. Add-ons do not group and should not get a `group_label`.

**Decided shape: reordering only. Zero migration.** `add_ons.sort_order` exists,
the Catalog query already orders by it, and there is no UI that sets it. This
is a Catalog screen job, not a database job. Same for services, which have the
same unused column.

If a tenant ever appears with thirty add-ons, groups become worth revisiting —
but building a groups table now would be building for a detailer none of the
five look like.

---

## W21 — a way to see a service's FULL details

*His words: he lists everything included in a package. He does not want a giant
description block — he wants a small control on the service box ("a little
eye") that opens the full contents.*

**His practice is the trade's practice.** Every one of the five package menus
publishes an itemised inclusion list, and they are long: Detailz runs 5 to 10+
bullets per package, and its biggest package is over ten. MOV's tiers list
exterior and interior work item by item. This is not one detailer's habit — it
is how a $485 package justifies itself against a $255 one.

**And it collides with W16 head-on.** Roadmap 2.7 measured step 1 at 18px of
headroom on a phone with the demo's four services and **no inclusion lists at
all** — a fifth service breaks it. A realistic catalogue is 5–9 services with
5–10 inclusions each. Rendered inline that is not a near miss; it is several
screens.

### The trap that is already in the code

`StepServices.jsx` renders `features` inline, capped at five entries — an
`Array.isArray(s.features)` guard, then `s.features.slice(0, 5)` mapped into a
list under the card's description.

Nobody has hit it because no UI writes `features`. **The moment W9 ships an
editor for that field, every tenant who fills it in breaks W16 on step 1.**
So the ordering is not optional: **the disclosure control ships before or with
the features editor, never after.** That is the single most actionable thing in
this file.

**Decided shape:** `features` as it stands — **no new column, no migration.**
A Catalog editor that writes the array, and on the booking card a disclosure
(his eye, or a "what's included" affordance) that keeps the card one line tall
until it is pressed. The inline list and its five-item cap come out.

**W21 is also the lever roadmap 2.7 named for step 1's height ceiling**, and
this is why: it is the only item that makes a card's height independent of how
much the detailer wrote in it.

---

## W22 — water and electricity per detailer

*His asks, from the walkthrough: optional per detailer, an electricity-only
mode, and an option that blocks the booking if the customer cannot supply what
that detailer needs.*

The headline above already reframed this: asking is the norm, not his quirk,
and water and power vary independently.

**Decided shape — two settings, three states each, no new table:**

| | `not_needed` | `ask` | `required` |
|---|---|---|---|
| meaning | detailer brings their own | ask and record the answer | ask, and **block the booking on "no"** |
| customer sees | nothing | one question | one question, with the consequence stated before they answer |

`water_requirement` and `power_requirement` on `business_settings`, each
defaulting to `ask` — which is exactly today's behaviour when
`ask_water_electric` is true, so no tenant's booking page changes on migration
day.

This covers all three of his asks and one he did not name: it distinguishes
"I need power but I bring my own water" (the coating specialist) from "I need
neither" (rinseless) from "I need both" (his own business), which one boolean
never could.

**The booking side needs the same split.** `bookings.has_water_electric` is one
boolean holding two answers; it becomes `has_water` and `has_power`. Migration,
and `create-booking` / `update-booking` / `_shared/slotValidation.ts` are where
the block belongs — the same junction W4's drop-off guard went into, for the
same reason: it is where all three write paths meet.

**Where the block goes matters more than that it exists.** W4 found a live hole
of exactly this shape in 2.7 — a restriction that reached the customer as a
note on the page and was never read on the way in, so the customer could read
the rule and book against it anyway. A `required` resource that only greys out
a Continue button in React is that bug again.

---

## W25 — should packages be mutually exclusive?

*His words: he selected "Full Detail" and "Interior" together and found it
confusing. He flagged the demo content as placeholder, so the question is about
the rule, not the data.*

**The dominant real shape is: pick ONE package, then add MANY extras.** 612 is
single-select on service and multi-select on add-ons. MOV's five tiers are
exclusive by construction — you cannot be Bronze and Gold — with three add-ons
on top, two of which are only sold to the lower tiers because the higher ones
already contain them. Detailz and Professional On Site read the same way.

**One of the five is genuinely multi-select**: Final Touch is à la carte, where
"Interior detail" and "Exterior detail" are separate line items a customer
combines on purpose. So "always single-select" would be wrong.

But note what the exception is *not*: it is not a shop that mixes exclusive
tiers with combinable items in one list. It is a shop whose entire menu is à la
carte. **The split is per business, not per service** — which means it is one
setting, not a per-service flag or a per-group table.

**Decided shape:** `business_settings.services_single_select`, **default true.**
One column. Default true because four of five real menus work that way and
because it is the thing he actually complained about; an à la carte shop turns
it off once, at setup.

The `services` / `add_ons` split we already have IS the trade's split — a
package plus extras. We do not need a second mechanism on top of it.

Deliberately NOT built: exclusivity per group. `group_label` is free text on
the service, not a groups table, so group-level rules would mean a new table to
hang the rule on — a real build for a menu shape none of the five have.

---

## W27 — what the contact step must collect

*His words: "how do I reach you" is essentially complete — but research whether
other detailers need fields he does not.*

He is close to right. The five booking forms collect four things we do not, and
only two are worth arguing about.

1. **Vehicle year / make / model / colour as structured fields.** Ours is one
   optional free-text box, *"What are you bringing?"*, placeholdered
   `e.g. 2019 Honda Civic`. Every real form asks for them as separate required
   fields. **Recommendation: leave ours alone.** The structured version buys
   nothing today — nothing queries it, nothing prices off it — and it costs
   four fields of step height against W16. Revisit when something reads it.
2. **Interior condition, on a four-way scale** (light / moderate / heavy /
   extreme). 612 asks it; the trade guides say condition is what a from-price
   is a floor above, with surcharges commonly quoted as +$50–$100 for heavy pet
   hair or +25–50% for a heavily soiled interior. **This is the one real gap**,
   and it pairs with `price_is_from`: a from-price is honest only if the
   detailer is told what they are walking into. See the decisions section.
3. **Parking / access notes.** 612 has a dedicated field. **We already cover
   it** — our *"Anything we should know?"* box is placeholdered "Gate codes,
   pet hair, problem areas…". Adding "where to park" to that placeholder is a
   one-word change, not an item.
4. **"How did you find us?"** Every form has it. We have `campaigns`,
   `campaign_visits` and `bookings.referral_code_used` already — a link-based
   answer to the same question. A self-reported dropdown is a different, weaker
   instrument. **Not now**, and if ever, it belongs with the campaigns work.

**Nothing here is schema-blocking except the condition field**, which is why
W27 was folded into this item rather than given its own.

---

## Four decisions for the owner

Everything else in this file was decided on evidence. These four are not ours:
each one either costs every detailer setup work, changes what a customer sees,
or touches stored bookings in a way that is expensive to reverse. They are
written for him, in his language — the reasoning behind each is above.

### 1. Should picking a service become "pick one" instead of "pick as many as you like"?

Right now your booking page lets a customer tick Full Detail **and** Interior
Deep Clean at once — the thing you flagged as confusing. Think of it like a
restaurant menu: most detailers write mains (pick one) and sides (add as many
as you want), and we already have that split — services are the mains, add-ons
are the sides. Four of the five real booking pages I looked at let you pick only
one service; the fifth is a shop whose entire menu is à la carte, where
combining is the whole point. Switch it on and the double-ordering stops and
step 1 gets simpler; leave it off and the confusion you found stays for every
detailer who signs up. Either way it is one setting, so an à la carte shop turns
it off once at setup. **Recommendation: on by default** — it is how most of the
trade sells, and it fixes exactly what you reported.

### 2. Three vehicle sizes, or five?

Today a customer picks Small, Medium or Large and you set extra price and extra
time for the last two. The trade normally splits finer: five is the common shape
(coupe, sedan, small SUV, large SUV, truck/van) and one detailer I looked at
uses twelve. The reason is that our "Large" is doing the work of a pickup truck
*and* a full-size van, which are not the same job for you. Going to five gets
you more accurate prices and fewer mis-quotes, but every detailer — you included
— fills in two more numbers per service at setup, and it changes the database in
a way that touches every booking already stored, so it gets more expensive to do
the longer we wait. Staying at three keeps setup fast and the prices blunt.
**Recommendation: go to five**, with the two new sizes starting at $0 and 0
extra minutes so anyone who does not care can ignore them. This is the only one
of the four that gets harder to do later.

### 3. Should a service be able to say "from $220" instead of "$220"?

Every real detailer menu I looked at publishes a starting price rather than a
fixed one — "from $150", "$275–$750", or plainly "prices vary" — because how
dirty the car is decides how many hours it takes, and nobody knows that until
they see it. Ours prints one firm number and adds them into an "Estimated
total". Add this and you get a tick-box per service that changes the display to
"from $220" and puts a line on the review step saying the price may change once
you have seen the vehicle; the arithmetic does not change at all, only what the
number claims to be. Skip it and a customer booking a filthy car reads your
price as a promise, and you are the one having the awkward conversation in their
driveway. **Recommendation: yes.** It is one tick-box, off by default, so
nothing changes for the services you are confident quoting blind.

### 4. Should the booking ask how dirty the car is?

Real booking forms nearly all ask the customer to rate the interior — light,
moderate, heavy, or "it has not been cleaned in years" — and it is the most
common field we do not have. It is not there to price the job automatically; it
is so you know what you are driving to before you load the van, and it is what
makes a "from" price honest rather than evasive. Adding it costs one more
question on the booking page, which spends a little of the height your
"everything should fit without scrolling" rule is fighting for. Not adding it
leaves you with whatever they choose to type in the "anything we should know"
box. **Recommendation: yes, as a question each detailer can switch off, on by
default.** It pairs with decision 3 — if you say no to from-prices, this one
gets weaker, because then the only thing it changes is what you know in advance.

## The schema this decides

**One migration, appended, when the owner has answered the four decisions
below.** Listed here so the next session does not have to re-derive it:

```
business_settings
  + water_requirement  text not null default 'ask'
      check in ('not_needed','ask','required')           -- W22
  + power_requirement  text not null default 'ask'
      check in ('not_needed','ask','required')           -- W22
  + services_single_select boolean not null default true -- W25

services
  + price_is_from boolean not null default false         -- W9

bookings
  + has_water boolean                                    -- W22 (nullable: "not asked")
  + has_power boolean                                    -- W22
  ~ vehicle_size: new CHECK allowing five classes        -- W9, IF he says yes
  + vehicle_condition text                               -- W27, IF he says yes
```

`ask_water_electric` and `has_water_electric` stay. They are not dropped —
they are what every existing row and every deployed edge function still reads,
and the migration rule here is append-only. The new columns are written
alongside them and the old pair is retired in a later pass once nothing reads
them.

**Nothing else needs a migration.** W10 (reordering) and W21 (full details) are
entirely UI over columns that already exist — `sort_order` and `features` —
which is the most useful thing this research found, because both were assumed
to be schema work.

## The build order that follows

Not a new roadmap item — this is how 2.7's five remaining items should be
sequenced when they are built, and the first line is a real constraint rather
than a preference:

1. **W21 disclosure BEFORE any `features` editor.** Shipping the editor first
   arms a W16 break for every tenant who uses it.
2. **W10 reordering** — no migration, no dependency, smallest diff of the five.
3. **The migration**, once the four decisions below are answered, then W25 and
   W22 on top of it. W22's block belongs in `_shared/slotValidation.ts`, not
   in the React step.
4. **W9's from-price and (if approved) the five vehicle classes** last, because
   the class change touches the pricing engine, the booking page, the Catalog
   editor and every existing booking's stored size.
5. **Re-run `node scripts/sweep-booking-steps.mjs` after each**, and read the
   spare room rather than the pass — step 1's ceiling is the point of W21.

## Sources

Real detailers' own menus and booking flows (primary):

- [MOV Mobile Detailing — packages](https://movmobiledetailing.com/packages)
- [The 612 Auto Spa — book a detail](https://www.612autospa.com/book.html)
- [Detailz Car Care — price list](https://detailzcarcare.com/price-list/)
- [Final Touch Auto Spa — à la carte menu](https://www.finaltouchautospa.com/a-la-carte-detail-menu)
- [Professional On Site Detailing — add-ons and extra services](https://professionalonsitedetailing.com/index.php/add-ons-and-extra-services/)

Working detailers, in their own words:

- [Auto Geek Online — mobile detailing without water or electric](https://autogeekonline.net/threads/mobile-detailing-w-o-water-or-electric.88879/)
- [2DOORZ — do mobile detailers need access to water and electricity?](https://www.2doorzmobiledetailing.com/post/do-mobile-detailers-need-access-to-water-and-electricity-the-2doorz-advantage)

What the trade's software exposes:

- [fieldd — where do mobile detailers get water](https://fieldd.co/where-do-mobile-detailers-get-water)
- [Urable — vehicle care CRM](https://urable.com/vehicle-care/)
- [Mobile Tech RX — plans](https://www.mobiletechrx.com/plans/)

Trade pricing and practice:

- [Housecall Pro — how much to charge for car detailing](https://www.housecallpro.com/resources/how-much-to-charge-for-car-detailing/)
- [Jobber — how much to charge for car detailing](https://www.getjobber.com/academy/auto-detailing/how-much-to-charge-for-car-detailing/)
- [QuoteWise Pro — pet hair pricing](https://quotewisepro.com/blog/pet-hair-pricing-guide)
- [D&V Mobile Detailing — why ceramic coating needs a garage](https://mobileautoservice.ca/why-ceramic-coating-cannot-be-done-as-a-mobile-service/)
