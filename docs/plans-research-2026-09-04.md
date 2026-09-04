# Plans a customer can sign up to — 2026-09-04 (roadmap 2.14, step 1)

The owner asked for this and he asked for the research first, by name:

> *"we should have, like, a plan section where they could customize monthly,
> bimonthly, yearly, biweekly, you know, like, whatever they want… and then
> it'll show up in the booking area, or they could just, like, have it just
> listed on the website. And they could kinda choose how they want to manage
> that. I don't know what's most — probably if you kinda go over into research
> if most people have a monthly plan within their booking system, or if that
> would be a good option. I mean, that's how I do it, but I don't know."*

**Nothing in `app/` or `supabase/` changed in this file.** It is the input to
the build, the same way `docs/detailer-research-2026-08-31.md` was the input to
2.8b and `docs/email-research-2026-09-03.md` was to 2.18.

---

## How this was done, and how much weight it carries

Three kinds of source, kept apart on purpose, the same split 2.8 used:

- **The panel — the same six products 2.10 and 2.18 used**, so the counts are
  comparable across roadmap items rather than being a fresh panel each time.
  Their own documentation, not review sites.
- **Primary — seven real detailing businesses' own published plan pages.** Not
  articles about plans; the actual page a customer would sign up on. These are
  what settle the "in the flow or beside it" question, because they are
  somebody's real offer and somebody's real sign-up button.
- **One detailer-to-detailer forum thread**, for how the trade prices them.

| | What it is | How good its public documentation is |
|---|---|---|
| **Jobber** | Field-service, the category leader | **Excellent** — recurring jobs and online booking each have their own help page |
| **Housecall Pro** | Field-service, the other leader | **Good** — a Service Plans collection, a starter kit, an FAQ |
| **Zenbooker** | Online booking for field service, closest in shape to ours | **Excellent** — a recurring-bookings overview and a per-service setup page |
| **Square Appointments** | General appointments, huge installed base | **Fair** — the feature is documented; the customer-facing gap is only answerable from an official community reply |
| **Urable** | **Detailing-specific** CRM | **Weak** — marketing pages and blog posts; help centre behind a login |
| **Mobile Tech RX** | **Detailing / reconditioning-specific** | **Weak** — marketing pages, but its own FAQ answers the one question that matters |

**Source strength is marked per claim and it is not uniform.** Same annoyance as
2.18: the two detailing-specific products are the two with the worst public
documentation, and they are the two whose customers are ours.

**Seven plan pages is not a survey and nothing below is a statistic.** It
answers *"is our shape normal / missing / unusual"*, which is what the item
actually asks. **Sample bias worth naming, and it is large:** these were found
by searching for detailing membership pages, so every one of them is a business
that HAS a plan and publishes it. **This evidence cannot say how many detailers
run plans at all** — only what the ones who do actually do. A detailer with no
plan is invisible to this method.

---

## The headline: the sale and the schedule are two different things, and nobody joins them

His sentence assumes one act — *"it'll show up in the booking area"* — a
customer picks the plan and the visits follow.

**Not one of the seven real plan pages schedules the visits at sign-up. Not
one.** Even the two that take money on the spot stop there:

- **Car Detox** sells the membership through a checkout, and then: the customer
  gets *a phone call* to agree a maintenance day.
- **Mint** members "schedule your service visit online every month" — the
  membership buys the discount, not the diary.
- **ZS Clean** takes a phone number and says *"A team member… will contact you
  to confirm your plan details and help set up your first visit."*
- **Visual** pre-schedules, but only after *"a brief discussion about your
  needs"* by email.

The one product that DOES auto-schedule from the flow — Zenbooker — is a
cleaning-industry tool, and cleaning is the trade where a repeat is a chore on a
fixed rhythm. **Detailing sells the plan first and books the visits second, and
that holds in the products too**: Urable's plan is generated when a customer
*accepts a quote*, and Housecall Pro's when a customer accepts an *emailed
agreement*.

**So the expensive half of the obvious design — generate the next N bookings
when somebody signs up — is not a thing the trade does.** That matters twice
over, because `bookings_no_overlap` is a hard database constraint (see "What our
own schema says" below): auto-created future visits would fail against real
bookings, at a moment nobody is watching.

## The second headline: we take no money, so we cannot sell a subscription

**Every plan in the sample that charges, charges a stored card.** Housecall Pro
stores the card in its Client Portal and bills monthly / quarterly / 6-monthly /
annually; Urable's card is *"stored securely and charged on the schedule you
set"*; Car Detox auto-renews; Visual bills a month in advance.

**This product has no payment processing at all.** `bookings.payment_status` is
a flag the DETAILER sets by hand (`FinalizeModal.jsx`, `Money.jsx`), there is no
Stripe, no card on file and no `payment_method` on a booking —
`expenses.payment_method` is the detailer's own bookkeeping. Nothing in this
repo has ever taken a cent from a customer.

**So "plan" in our product can mean the arrangement, the cadence and the price —
and cannot mean the billing.** A screen that says *"$150/month, cancel anytime"*
while the money is still collected in person on the day is a promise the
software does not keep, and it is the same family as the travel fee drawn on the
booking page that `computeQuote` never charged. **Whatever ships must be honest
about who takes the money.**

---

## Question 1 — do the trade's booking systems carry recurring plans at all?

**Five of six carry some form of recurrence. Two of six carry a PLAN as an
object of its own.** Those are different features and conflating them is the
main way this item could go wrong.

| | Recurrence | A plan/membership object? | Who can start it | Where it is sold |
|---|---|---|---|---|
| **Jobber** | **Yes** — recurring jobs, weekly / biweekly / monthly / custom, multiple days | **No** | Business only | Not sold to a customer at all; online booking is one-off |
| **Housecall Pro** | **Yes** — auto-generated from the plan | **Yes** — Service Plans, from a template | Business sells, customer accepts | An **emailed agreement**: the customer views a summary, picks a billing cycle, saves a card |
| **Zenbooker** | **Yes** — per-service recurring options, named, optional discount | No (the frequency IS the product) | **Customer or business** | **Inside the booking form** |
| **Square Appointments** | **Yes** — a *Repeat* checkbox, ending after N appointments or on a date | **No** | Business only | **Not available to customers online** |
| **Urable** *(detailing)* | **Yes** — cadence *"carves out that spot indefinitely"* | **Yes** — subscriptions / Service Plans | Business sells via a **quote** | Quote accepted → a Service Plan is generated |
| **Mobile Tech RX** *(detailing)* | Not documented | Not documented | — | **It has no customer-facing online booking at all** — its own FAQ: *"Not yet. But we're working on a feature…"* |

**Counts, plainly:**

- **5 of 6** can repeat work. **Recurrence is normal.**
- **2 of 6** have a plan as its own sold object — and **both are the ones aimed
  at trades that sell maintenance agreements** (HVAC-style) or detailing.
- **1 of 6** lets a customer choose a recurrence themselves during booking —
  **Zenbooker, the cleaning-shaped one.**
- **0 of 6** sell a membership object inside a booking form.
- Jobber has recurring jobs and **no membership object at all** (its own help
  centre documents recurring jobs and nothing resembling an agreement; a
  third-party vendor blog says the gap is long-standing, and that source sells
  the add-on, so it corroborates rather than proves).

**Answer to his actual question — *"do most people have a monthly plan within
their booking system"*: no.** Most of the category can repeat a job. Almost none
of it sells a plan to a customer through the booking flow. **He is not doing the
unusual thing by running plans; he would be doing the unusual thing by selling
them inside the booking form.**

## Question 2 — is the plan sold IN the booking flow, or listed beside it?

**Beside it. 7 out of 7 real detailers, and 5 of 6 products.**

| Detailer | Cadences offered | Priced as | How you sign up | Visits scheduled at sign-up? |
|---|---|---|---|---|
| **Car Detox** | Monthly, Quarterly | **$150 / $125 / $100 by vehicle size** | Checkout (Bookeo), *then a phone call* | **No** |
| **Pro Auto Detailers** | Biweekly, Monthly, Quarterly | $47 / $70 / $240 per period, *"save up to 30%"* | **Add to Cart / Buy Now** | **No** |
| **Deluxe Detailing (DetailPlus)** | Monthly (interior / exterior / full) | From $95 / $95 / $160, *"20%+ cost savings"* | Book or call — **and only after a full detail has been done** | **No** |
| **Mint Mobile Detail** | Monthly | Member discounts | *"JOIN TODAY"* into their booking system | **No** — members book each visit |
| **Get Detail Now** | Monthly | $79 / $125 / $199 tiers | *"Enroll Now"* → contact | **No** |
| **Visual Protection** | **Weekly or bi-weekly** | $70–$150 per visit per vehicle | Email / enquiry form, then a conversation | **Yes, but only after that conversation** |
| **ZS Clean San Diego** | **Weekly, Bi-weekly, Monthly** | $90–$130 per visit + 10% off add-ons | Phone-number form; a person calls to set up visit one | **No** |

**Every one of them is a dedicated page** — `/membership`, `/maintenance-plan`,
`/plans-pricing`, `/detailplus-membership`. **None of them is a step in a
booking form.**

Three details from that table worth carrying into the build:

- **The slot is the product, and they say so.** Visual bills *"for the next
  month in advance in order to reserve your scheduled appointment"* and charges
  even when the car is not available, *"to compensate for reserved time"*.
  Deluxe: if you do not book, *"you run the risk of losing your date."* Urable
  *"carves out that spot indefinitely."* **What a plan customer is buying is a
  standing place in the diary**, which is a scheduling promise, not a discount.
- **A skip is a real concept.** ZS offers *"One free skip per year"*. Any plan
  that holds a slot needs a way to miss one without ending.
- **Two of seven gate the plan behind a first big job.** Deluxe: *"ONLY
  available after a full signature detail is completed"*. Urable's own advice is
  to sell the plan in the quote for the big job, as the *"Best"* of a
  good/better/best. **The plan is an after-sale, not a front-door offer.**

### What the trade charges, from detailers talking to each other

The Auto Geek thread (secondary, but it is detailers rather than vendors): one
prices four washes plus a clay-and-wax at **$165 then takes 10% off**; another
gives **"15% off all the services if they sign up for the maintenance plan"**.
And a warning about wording that costs nothing to take:

> *"I wouldn't bring up the term 'contract.' People may tend to shy away. I
> would say something more along the lines of 'pre-paid packages.'"*

Across the sample, a plan's price is expressed **three different ways** — a
monthly amount, a per-visit amount, or a percentage off the normal price — and
**which one a detailer uses is a real choice, not a detail.** Any field that
forces one of the three excludes some of the seven businesses above.

---

## What our own schema says (so nobody re-derives it)

- **`monthly_plans` DOES NOT EXIST.** Created in `tenant_data.sql:51`, dropped
  nine hours later in `phase2_cleanup_and_storage.sql:16`, along with
  `bookings.monthly_plan_id` and `monthly_plan_discount`. There is no table, no
  cadence, no enrolment, no recurring booking. **The ground is bare.**
- **`bookings_no_overlap` is a GiST exclusion constraint** on
  `(business_id, tstzrange(start_at, end_at))` where
  `status <> 'cancelled' and deleted_at is null`. **A future visit that collides
  is refused by the database, not by the app.** Anything that creates visits in
  a batch has to have an answer for the refusal, and "silently skip it" means a
  plan customer quietly loses a month.
- **Request mode already exists (2.12)** — `pending` holds the slot, the
  detailer accepts or declines, a quote can be offered and accepted by the
  customer from their email. **That is the same shape as every plan sign-up in
  the sample**: the customer asks, a human agrees, the work gets booked.
- **The tenant WEBSITE does not exist yet.** The only public surface a tenant
  has today is `/book/:slug` (plus the receipt page). "Listed on the website" is
  Phase 3, and per `docs/tenant-websites.md` those sites are **hand-built per
  detailer**, so what a plan owes that phase is a readable data shape, not a
  screen.

---

## The two design questions, answered

**1. In the booking flow, or beside it? — BESIDE IT, and the evidence is not
close.** 7 of 7 detailers and 5 of 6 products put the plan on its own surface.
The single product that puts a recurrence in the flow is selling a repeat, not a
plan, to a trade with a different rhythm. Concretely, for us: **a plan section
on `/book/:slug`** — the tenant's only public surface today — with sign-up
starting the ordinary booking flow, not a new step inside it.

**2. The detailer's choice, or the product's? — the DETAILER's, for everything
except the placement.** Every product in the panel makes plans the business's
own construction (Zenbooker's named options and discounts, Housecall Pro's
templates, Urable's packages), and the seven detailers word, price and cadence
them so differently that a fixed shape would exclude most of them. **But making
"in the flow vs beside it" a per-detailer toggle buys a second layout to build,
verify at five widths and keep honest, for a placement no evidence supports.**
Ship the one the evidence gives; add the toggle if a real detailer asks.

## The recommendation

**A plan is a named repeat arrangement the detailer offers, and a sign-up is a
REQUEST — the rail 2.12 already built.**

- A `plans` row per business: name, what's included, cadence label, how it is
  priced (one of the three shapes above), active, order. The detailer's words
  throughout.
- A plan section on the booking page listing them, and **"Sign up" starts the
  normal booking flow** carrying the plan, ending as a request the detailer
  accepts — exactly what Car Detox, ZS and Deluxe do with a phone call, minus
  the phone call.
- **Recurrence is a nudge, not a scheduler.** When a plan visit is finalised,
  the detailer is prompted to book the next one. The owner-nudge rail already
  exists (`owner_wrapup_nudge_sent_at`, `owner_finalize_nudge_sent_at`), and a
  human placing the next visit is what all seven businesses actually do — and it
  is the only version that cannot lose a month to the exclusion constraint.
- **The discount lands where discounts already land** (`promo_discount`,
  `price_adjustments`), so the receipt still reconciles.

**Deliberately not built:** subscription billing (we take no money), auto-created
future visits (nobody in the trade does it and our constraint fights it), a
customer plan portal (5 of 7 detailers manage plans by talking), and the
in-the-flow toggle. **Add billing when there is card processing at all** — it is
a platform-wide decision, not a plan feature.

---

## What is still the owner's to decide

Four, and all four change the schema.

1. **Does a plan hold a standing slot, or is each visit booked normally?** The
   sample splits: Visual and Urable hold the slot (and charge for it), the other
   five book visit by visit. Holding a slot is a much bigger build — a repeating
   reservation the constraint has to respect. *Recommendation: book visit by
   visit, because we cannot charge for a slot nobody used, which is the only
   thing that makes holding one safe for the detailer.*
2. **Money: does a plan customer pay per visit, as everyone does today?** We have
   no card processing, so this is the only truthful answer today, but it means
   the plan is a discount and a rhythm rather than a subscription.
   *Recommendation: yes, per visit, and say so plainly on the page.*
3. **Which of the three price shapes should a plan support?** Monthly amount,
   per-visit amount, or a percentage off. *Recommendation: all three, as one
   choice on the plan — the sample uses all three and picking one excludes
   detailers.*
4. **Is the plan open to anyone, or only after a first full detail?** Two of the
   seven gate it, including in his own trade's advice. *Recommendation: a tick on
   the plan, off by default — it is one boolean and one sentence on the page.*

---

## Sources

**The panel**

- Jobber — Create a Recurring Job: https://help.getjobber.com/hc/en-us/articles/115009542848-Create-a-Recurring-Job
- Jobber — Online Booking: https://help.getjobber.com/hc/en-us/articles/13808363916951-Online-Booking
- Jobber — Client Hub: https://www.getjobber.com/features/client-hub/
- Housecall Pro — Service Plans Starter Kit: https://help.housecallpro.com/en/articles/5232530-service-plans-starter-kit
- Housecall Pro — Service Plans FAQs: https://help.housecallpro.com/en/articles/5485025-service-plans-faqs
- Housecall Pro — How to Sell A Service Plan: https://help.housecallpro.com/en/articles/2921514-how-to-sell-a-service-plan
- Housecall Pro — Service agreement software: https://www.housecallpro.com/features/service-agreement-software/
- Zenbooker — Recurring Bookings Overview: https://help.zenbooker.com/en/articles/1721048-recurring-bookings-overview
- Zenbooker — Make a service bookable as recurring: https://help.zenbooker.com/en/articles/1717478-how-to-make-a-service-bookable-as-a-recurring-appointment
- Square — Create and schedule appointments: https://squareup.com/help/us/en/article/5349-schedule-and-accept-appointments
- Square Community — recurring via online booking, official reply 2025-12-30: https://community.squareup.com/t5/Appointments-Bookings/Recurring-appointments-via-online-booking/td-p/829740
- Urable — subscriptions for recurring services: https://urable.com/2026/05/17/how-to-use-urable-to-manage-subscriptions-for-recurring-services/
- Urable — quote-to-invoice for care plans: https://urable.com/2026/05/06/the-quote-to-invoice-workflow-for-detailing-care-plans/
- Mobile Tech RX — Scheduling (its "no online booking yet" FAQ): https://www.mobiletechrx.com/scheduling/

**The seven detailer plan pages**

- Car Detox: https://cardetox-us.com/membership/
- Pro Auto Detailers: https://www.proautodetailers.com/pricing-plans/plans-pricing
- Deluxe Detailing (DetailPlus): https://www.deluxedetailingoh.com/detailplus-membership
- Mint Mobile Detail: https://getmintmobiledetail.com/membership/
- Get Detail Now: https://getdetailnow.com/membership
- Visual Protection Specialists: https://visualdetailing.com/mobile-detailing/
- ZS Clean San Diego: https://www.zscleansandiego.com/maintenance-plan

**Detailers talking to each other**

- Auto Geek — Monthly maintenance prices: https://autogeekonline.net/threads/monthly-maintenance-prices-etc.33101/

**Adjacent, marketing-page strength only, not counted in the panel**

- Bookeo (the tool Car Detox uses): https://www.bookeo.com/appointments/car-wash-booking-system/
- Cleaning booking tools, for the frequency-in-the-flow convention: https://myquoteiq.com/best-online-booking-software-cleaning-businesses-2026/

---
---

# ROUND 2 — the questions he asked after reading the above (2026-09-04)

He read the first pass and asked for more, naming five things:

> *"this is something that needs to be thought through. I have some ideas but
> you're better at that cuz you can identify risks and whatnot so if you can do
> some research into all the different types of monthly plans detailers have.
> Then we have to decide the best way to keep people from breaking a monthly
> plan let's say if like there's a requirement. How to display and track
> customers. If we should just leave the detailers to handle it and we just add
> a way for them to log monthly users. Or if we should be the ones handling it
> with payments and what not. And how it would work out technically with what's
> available to me for free. Idk there's more things but I don't want to type
> them all out."*

**The payment half is its own file — `docs/payments-research-2026-09-04.md`** —
because it turned out to be two problems, not one, and only one of them is about
plans.

**Three more businesses were sampled for this round** (Tang Detailing,
CarDetailing2Go, Cool Auto), bringing the primary sample to **ten detailer plan
pages**, plus Housecall Pro's Service Plans dashboard documentation, which is
the best public documentation anywhere of how plan customers are actually
tracked.

---

## 1. The types of plan detailers actually run

**Six shapes appear in the sample. They are not six features.** Every one of
them falls out of **four fields**, and that is the most useful thing in this
round:

> **a cadence · what's included · how it's priced · whether there is a term**

| The shape | What it is | Seen at |
|---|---|---|
| **Frequency plan** | One service, repeated on a rhythm. The rhythm IS the product | Tang (weekly / bi-weekly / monthly, identical contents), ZS Clean, Visual |
| **Tiered membership** | Good / better / best, different contents per tier, monthly | Get Detail Now ($79 / $125 / $199), Deluxe (interior / exterior / full), Car Detox (by vehicle SIZE rather than by contents) |
| **Visit bundle** | *N visits per period*, and the visits can be of different kinds | CarDetailing2Go — *"1 Diamond + 1 Gold"* a month at $275, *"2 washes"* at $175 |
| **Prepaid block** | Pay up front for a stated period, at a stated saving | CarDetailing2Go yearly ($1,999, *"Saving of $377"*), Deluxe custom packages whose credits *"never expire"*, and the forum's own advice to call it a **"pre-paid package"** rather than a contract |
| **Discount membership** | No schedule at all — a member rate plus priority | Mint (*"exclusive discounts for their regularly scheduled auto detailing"*), Car Detox's add-on discount |
| **Protection programme** | Required maintenance attached to a coating, on a long cadence | Ceramic Pro / System X annual inspections — see §2 |

**Two cross-cutting facts worth building for:**

- **Cadence is not a fixed list.** The sample uses weekly, bi-weekly, monthly,
  bi-monthly, quarterly, bi-annual and annual, and **Tang advertises "custom
  schedules — just ask"**. A dropdown of four will be wrong for somebody.
- **Vehicle size is a plan axis, not just a booking axis.** Car Detox prices
  the same plan at $150 / $125 / $100 for full / mid / small. We already have
  `vehicle_size` on every booking and a size fee in the pricing engine, so this
  is nearly free — but only if a plan's price can vary by size rather than
  being one number.

---

## 2. Keeping people from breaking a plan — and the requirement case he meant

### The trade's answer is NOT contracts, and that is close to unanimous

Every mechanism observed, ranked by how much it actually binds:

| Mechanism | How hard it binds | Who does it |
|---|---|---|
| **The money is already taken** (prepay / annual) | **Hardest — structural.** There is no monthly cancel decision to make | CarDetailing2Go's yearly tiers, Deluxe's prepaid credits |
| **Card on file, auto-renewing** | Strong — breaking it requires an action | Car Detox, Tang (*"Billed monthly to card on file"*), Housecall Pro, Urable |
| **The slot** | **Detailing-specific and underrated** — good slots are scarce | Visual bills a month ahead *"in order to reserve your scheduled appointment"* and charges even if the car is not there; Deluxe: *"you run the risk of losing your date"* |
| **The member rate is conditional** | Moderate — the discount evaporates with the plan | Everyone who advertises a % saving |
| **Notice period** | Weak but real | Car Detox *"cancel anytime — 30-day notice"*, Mint *"anytime after 60 days"* |
| **Early-termination fee** | Hardest of all — **and NOT ONE detailer in the sample uses it** | Gyms and studios ($100 penalties, 12-month minimums). It is the adjacent industry's answer and detailing has visibly rejected it |

**Six of the ten detailer pages advertise "no contracts / cancel anytime" as a
selling point.** Tang leads with it. ZS leads with it. **A detailing product
that shipped minimum terms and cancellation penalties would be selling the
thing this market advertises against.**

### The mechanism that actually works is the opposite of a penalty

**Most plan breakage is not defection — it is a month somebody could not do.**
The two tools in the sample that address that directly:

- **ZS Clean: *"One free skip per year."***
- **Tang: *"You can pause your membership while you travel or cancel
  anytime."***

**So the anti-breakage feature is PAUSE and SKIP, not a contract.** A plan that
can be paused survives the holiday; a plan that can only be cancelled does not
come back. That is one field and one button, and it is worth more than any
penalty this product could enforce anyway — **we cannot enforce a penalty, since
we take no money.**

### The requirement case — and it is real, specific, and unbuilt anywhere

*"let's say if like there's a requirement"* has a genuine, industry-standard
example, and it is the single strongest reason a detailer needs plan software:

**Ceramic coating warranties require documented maintenance or they void.**
Ceramic Pro requires *"an annual inspection completed by a certified installer"*
for every package. System X requires one professional service a year **within
about 30 days of the install anniversary, and missing that window voids the
warranty permanently.** Most coating warranties also require washing every 2–4
weeks.

**That is a different object from a cadence.** A cadence says "roughly every
month". This says **"before 12 October, or something the customer paid $1,500
for is gone."** What it needs is not a stricter plan — it is:

- a **deadline** with a real date, not an interval;
- an **escalating reminder** as the date approaches;
- a **record of when the last qualifying service happened**, because the
  warranty claim depends on proving it.

**Nothing in the six panel products does this**, and it is the one place where a
detailing-specific product could be plainly better than Jobber. **It is also the
one requirement customers do not argue with**, because the consequence is theirs
and they already understand it.

**Recommendation: build cadence and pause/skip now; treat the coating deadline
as its own small thing later** — it is a date, a reminder and a "last done"
stamp, and it is worth doing properly rather than smuggling into a cadence
field.

---

## 3. How to display and track plan customers

**Housecall Pro's Service Plans dashboard is the reference, and it is worth
copying the SHAPE of rather than the size.** It shows: a plan count with
all-time revenue, expected monthly recurring revenue, the templates on offer,
**Due for Billing** (upcoming within 7 days, plus overdue), and **Unscheduled
Visits**. Plans carry **seven statuses** — Draft, Sent, Active, Expiring Soon,
Pending Renewal, Renewed, Expired — and renewals are **not automatic**; the
software generates a draft and reminds the business 1/3/7/14/30/60 days out.

**The single most valuable list there is Unscheduled Visits**, and it is worth
naming why: it is *"your reminder to schedule actual appointment times for
upcoming and overdue Service Plan visits"*. **That list only needs to exist
because the sale and the schedule are two separate acts** — which is exactly
this research's first finding, showing up as a screen in the category leader's
product. **If we build one thing for tracking, it is that list**, not a
subscriber count.

**What we already have, so this is smaller than it looks:**

- **`Clients` already computes who has lapsed** and sorts on it —
  `tests/client-list.test.mjs` is 31 checks on that arithmetic, and its own note
  calls the lapsed filter *"who ends up on the end of a group text"*. **A plan
  member who is overdue is a lapsed client with a promise attached.**
- **`Money` already has periods and totals**, so "expected monthly recurring"
  is a figure, not a screen.
- **The job record already carries a swap-based layout** for showing one
  customer's history.

**The minimum honest set, in order of value:**

1. **Visits owed but not booked** — a list, on Today or Clients. This is the one
   that prevents the failure.
2. **A plan badge on the client**, with the cadence and when they were last seen.
3. **A count and a monthly figure** on Money.
4. Statuses: **active / paused / ended** is enough for us. Seven is a product
   with billing behind it; we do not have that yet, and inventing five states
   nothing can transition between is how a screen lies.

---

## 4. Who handles it — the actual decision

Three real options, and they are a ladder rather than a menu.

### A. We log it, the detailer handles it *(cheapest, matches the trade)*

The detailer records that a customer is on a plan; the plan's price or discount
applies when they book; the product shows who is owed a visit and who has gone
quiet. **No money moves through us.**

- **Costs:** nothing. No processor, no webhooks, no fees, no free-tier ceiling.
- **Matches:** what **five of the seven** original detailers do today — the plan
  is sold by conversation and the visits are booked one at a time.
- **Fails at:** nothing that a detailer with fewer than ~30 plan members would
  notice. It does not collect money, so a customer who stops paying is a
  conversation, not a dunning sequence.

### B. Log it, and take card at each visit

Same as A, plus the detailer's own Stripe (Connect Standard) so a plan visit can
be paid by card on the receipt. **Free to the platform** — see the payments
file.

- **Buys:** the money actually arrives without a QR code being held up in a
  driveway.
- **Costs the detailer:** 2.9% + 30¢ a visit.
- **Still not a subscription** — nobody is charged for a month they did not use.

### C. We run real subscriptions

A Stripe subscription on the detailer's connected account: card charged monthly
whether or not a visit happened, dunning, retries, pause, proration, refunds.

- **Buys:** the strongest anti-breakage mechanism there is (§2) and predictable
  revenue for the detailer, which is the whole reason detailers want plans.
- **Costs:** the detailer pays 2.9% + 30¢ + 0.5%. **And it costs US the support
  burden** — a customer charged for a month the detailer never showed up for
  complains to the platform, and *"the number charged is not the number
  delivered"* becomes a live problem rather than a documentation rule.
- **Is not possible before** Connect exists.

### Recommendation: **A now, shaped so B and C are additive.**

Three reasons, in order of weight:

1. **The trade runs on A.** Ten plan pages and five of seven are managed by
   conversation. Shipping C first builds the thing almost nobody in the sample
   is using.
2. **C's cost is not code, it is answering the phone.** Automatic charging
   creates disputes, and disputes on a detailer's customer land on whoever sent
   the email.
3. **A is a strict subset of C.** The four fields in §1, plus `paused`, plus the
   visits-owed list, are the same rows C would need. **Nothing built for A is
   thrown away** — C adds a Stripe subscription id and a status, and the screens
   already exist.

**And the shape that makes C cheap later is decided now:** a plan has a
**cadence**, and separately a plan member has a **ledger of visits owed and
used**. If the ledger exists from day one, adding billing is adding a charge
against a ledger that already balances. If it does not, C is a rewrite.

---

## 5. Technically, on what is free

**Everything in option A runs on what the product already has**: two tables, a
settings screen, a section on the booking page, one list, and the existing
request rail for sign-up. **No new service, no new dependency, no new cost.**

**B and C need Stripe, which has no monthly fee** — Connect Standard costs the
platform $0 and the detailer pays their own fees (payments file, with Stripe's
own wording).

**What is NOT free, and is the thing to know before promising anything
recurring:**

- **Supabase's free plan has no backups at all**, 500 MB, and pauses after 7
  days without requests. A product holding plan members' schedules and money
  promises needs **Pro at $25/month**.
- **Resend's free plan is 3,000 emails a month, 100 a day, ONE domain.** Plan
  reminders are extra email on top of five per booking, and **a rejected send is
  invisible** — `sendTenantEmail` is best-effort by design. **Pro at ~$20/month.**

**So plans do not cost anything to build on the free tier, and the free tier
stops being appropriate at roughly the same moment plans become worth having.**
Two detailers at $40 covers it.

---

## 6. The things he did not type out

He said there were more. Reading the ten pages against this product, these are
the ones that will otherwise be discovered mid-build:

- **A plan belongs to a VEHICLE, not a person.** Visual prices *"per vehicle
  each visit"* and offers a two-vehicle plan; Car Detox prices by size. Our
  `bookings` carry `vehicle_size` and `vehicle_model` but **`customers` has no
  vehicles**, so "Marcus's truck is on the bi-weekly and his wife's car is not"
  cannot be expressed today. **This is the schema decision most likely to be
  regretted.**
- **What happens to a plan when the detailer changes the price?** Existing
  members at the old rate is the normal answer and it means the price is
  snapshotted on the member, not read from the plan — the same rule this
  codebase already applies to `vehicle_size_fee` and `name_at_booking`.
- **Staff and permissions.** Roadmap 2.13 shipped four permission ticks. **A
  plan is money and marketing at once** — who may create one, and may staff see
  what a member pays? `can("money")` already hides lifetime spend on Clients.
- **A plan member cancelling a single visit** is not cancelling the plan, and
  `cancel-booking` cannot tell the difference today.
- **The receipt still has to add up.** A plan discount has to land where
  `promo_discount` and `price_adjustments` land, or the invoice stops
  reconciling — `reconcile()` in `emailKit.ts` is what would catch it, and
  `tests/booking-engine.test.mjs` test 17 is the shape of the check.
- **Nothing in the product says a customer is on a plan when they book.**
  If plan sign-up rides the request rail, the detailer needs to see *"this is a
  plan visit"* on the request card, or they will quote it like a one-off.

---

## Sources added in round 2

- Tang Detailing (weekly / bi-weekly / monthly, pause, no contracts, card on file): https://www.tangdetailing.com/car-detailing-membership-raleigh
- CarDetailing2Go (visit bundles and yearly prepay with stated savings): https://www.cardetailing2go.com/membership-plans
- Cool Auto maintenance packages: https://www.coolautoinc.com/maintenance-packages
- Housecall Pro — Service Plans dashboard (the seven statuses, Due for Billing, Unscheduled Visits): https://help.housecallpro.com/en/articles/2932107-service-plans-dashboard-overview
- Housecall Pro — Service Plan renewals (not automatic; reminder offsets): https://help.housecallpro.com/en/articles/6879916-service-plan-renewals
- Housecall Pro — Service Plan scheduling suggestions: https://help.housecallpro.com/en/articles/8124459-service-plan-scheduling-suggestions
- Ceramic Pro — aftercare and the annual inspection requirement: https://ceramicpro.com/aftercare/
- Ceramic Pro — warranty and aftercare document: https://ceramicpro.com/wp-content/uploads/2020/03/Ceramic_Pro_Warranty_and_After_Care_2020_Rev_1_2.pdf
- System X annual maintenance, 30-day anniversary window: https://afterhourscardetailing.com/ceramic-maintenance
- Prepaid vs monthly retention (adjacent industry, secondary): https://baremetrics.com/blog/annual-vs-monthly-pricing-better-retention
- Gym / studio membership terms, as the industry detailing has visibly rejected: https://movementgyms.com/membership-terms-and-conditions/
