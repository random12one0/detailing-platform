# The tenant-site contract — what a bespoke site MUST implement

**Roadmap 3.1's deliverable. Written 2026-09-05.**

**This is not a third plan, and it deliberately does not restate one.**
`docs/tenant-websites.md` is the destination in the owner's own words and it
settled the architecture — *fork the presentation, never the engine* — on
2026-08-29. Its §3 ends by saying what is still owed: *"That list is what
roadmap 3.1 has to enumerate."* **This file is that list and nothing else.**
When he asked *"Isn't there already a plan. Follow the docs."* he was right.

It has a second ancestor worth knowing about, because it corrects it:
`docs/dashboard-feature-inventory-2026-08-31.md` §5 asked *"is this editable in
the dashboard?"* for each page a site might have. **That is one half of a
two-way contract.** The other half — *what does the SITE have to carry for the
DASHBOARD's features to work* — is what nothing had written down, and it is the
half the owner named: *"a lot of the features of the admin dashboard need some
features on the website to work."* §5's table is also five days stale in three
rows; §7 below corrects it rather than leaving two answers in the repo.

**Every claim here was read out of a migration, a function or a component on
2026-09-05.** Where something is a judgment rather than a reading it says so.
The worked examples of this contract as pages are the three in
`docs/tenant-sites/` — deliberately different from each other and from the
platform's own look, for the reason `docs/tenant-site-research-2026-09-05.md`
§1 gives: **what a tenant site inherits from us is the method, never the
skin.** That file is also where the content inventory from six real detailers'
sites lives, and it corrected this one in four places (its §4).

---

## 0. The whole thing on one page

| | |
|---|---|
| **What a site may change** | Layout, sections, wording, imagery, palette, motion, typography, page count, domain |
| **What a site may never contain** | Any business logic — prices, availability, slot maths, discounts, validation, the booking write |
| **How a site reads a tenant** | **One** call: `get_public_business_profile(slug)`. Nothing else. |
| **How a site writes** | Only through the public edge functions — `create-booking` is the one write. It never touches a table. |
| **Required of every site** | Twelve implementations, §2. Omit one and a dashboard feature the detailer is paying for silently does nothing. |
| **Where the customer books** | **ANSWERED by the owner, §1c: the form is BUILT INTO the site, in the site's own design** — his own site is the spec. `/book/:slug` stays for booking-only detailers. |
| **Blocking gaps** | Eight, §6. Four were already measured in the roadmap (one of those was wrong), three came from reading the code, one from looking at real detailers' sites. |
| **What a site inherits from us** | The METHOD — research first, the anti-slop floor, the motion mentality, the copy rule, verify by looking. **Never the skin.** `docs/tenant-site-research-2026-09-05.md` §1 |

---

## 1. Where the fork line actually falls

### 1a. The engine — shared, central, never forked, never copied into a site

Read from `supabase/functions/`, `app/src/main.jsx` and
`scripts/deploy-functions.mjs` on 2026-09-05.

**The one read.** `get_public_business_profile(p_slug text)` — a
`security definer` SQL function granted to `anon`, returning one JSONB object
for one business, filtered on `businesses.status = 'active'`. Defined most
recently in `20260904004000_plans_customer_half.sql`. It is the entire read
surface. A site queries no table directly, and could not: RLS is FORCEd on
every tenant table and an anonymous visitor gets zero rows.

**The public writes**, all `verify_jwt=false` in
`scripts/deploy-functions.mjs`'s `PUBLIC_FUNCTIONS`, all answering
`Access-Control-Allow-Origin: *` from `_shared/http.ts` — so a site on **any**
origin can already call them, today, with no change:

| Function | What it is for |
|---|---|
| `available-slots` | Which times a day actually has, per service type |
| `calculate-booking` | The quote — the ONE place a price is computed |
| `validate-promo-code` | Whether a code is real, and what it takes off |
| `create-booking` | The write. The only one. |
| `get-booking-receipt` | The customer's own booking, by its UUID |
| `cancel-booking` / `reschedule-booking` | The customer changing their mind |
| `accept-quote` | The customer accepting a detailer's quoted price |
| `plan-link` | A plan member's page, cancel, and email-in / link-out |
| `booking-ics` | Add to calendar (a plain GET) |
| `unsubscribe` | The opt-out on the one commercial email |
| `track-visit` | Records a visit. Nothing in `app/` calls it — **but his own site does, on every page load** — §6g. |

**The platform's own customer-facing pages**, all in `app/src/main.jsx`:
`/book/:slug`, `/book/:slug/plans`, `/booking/:id`, `/plan/:memberId`,
`/unsubscribe/:customerId`.

**Why these are engine and not presentation, stated once so it is not
re-litigated:** each one either computes money, decides availability, or is
reached by a UUID that is somebody's only credential. A copy of any of them in
a client's site is a second implementation of a rule, and the second
implementation is the one that is wrong six months later. `_shared/pricing.ts`
recomputes every quote server-side inside `create-booking` regardless of what
the client sent, which is what makes a bespoke front end safe at all.

### 1b. The presentation — forked freely, per client

Everything else: the page, its sections, its order, its words, its images, its
type, its colour, its motion, how many pages it is, and what domain it lives
on. This is the part a client perceives as "custom" and it contains no rule
anyone can get wrong.

**AND SINCE 2026-09-05 THAT INCLUDES THE BOOKING FORM ITSELF** — the owner's
ruling, §1c. The form is drawn by the site, in the site's own design; the
rules under it stay central. A form is presentation because every rule it
appears to enforce is re-enforced on the server.

### 1c. ANSWERED BY THE OWNER — the form is BUILT INTO the site

**His ruling, 2026-09-05:** *"It's up to the detailer's choice but I think it
should be built into the website with the detailer's website design. Like how
it is on my website."*

**This overturned the recommendation that stood here, which was to link out to
`/book/:slug`.** That argument was that the seven steps are the most rule-dense
surface in the product — exclusive groups, per-service weekdays, vehicle-size
adjustments, the condition question, travel zones, drop-off-only periods,
request mode, plan membership — so a copy per client is a second version of
every rule. **He is right anyway, and his own site is why.**

**HIS SITE IS THE SPEC AND IT WAS READ RATHER THAN IMAGINED.**
`reference/frontend/src/components/BookingWidget.jsx` is **1,581 lines living
in the SITE's own components folder**, built from the SITE's own UI kit
(`@/components/ui/button`, `input`, `label`, `textarea`, `calendar`), animated
with the site's own `framer-motion`, and rendered inline by `App.js:73` as
`<BookingWidget />` on the marketing page itself. It calls the Supabase edge
functions directly. **It is not a link, not a separate page and not an
iframe — it is a section of the site, wearing the site's design.**

**SO THE FORK LINE MOVES UP ONE LEVEL, and that is the whole content of his
answer.** The FORM is presentation and is forked per client. The RULES are
not, and they never were client-side anyway: `create-booking` recomputes every
quote through `_shared/pricing.ts` whatever the client sent, `validateSlot`
gates every time, and the exclusion constraint is in the database. **A bespoke
form cannot mis-charge or double-book. What it can do is OFFER something the
server will refuse** — a closed day, a service that cannot be mobile, a size
that changes the price — which is a broken promise to a customer rather than a
broken booking.

**What that risk costs, and the recommendation that follows.** Ten clients
means ten forms, and 1,581 lines is what one really weighs. So **3.2 should
extract a headless booking core**: one dependency-free module that owns the
step sequence, which services are selectable under the group rules, which days
and times are open, the call to `calculate-booking`, and the submit — with **no
markup and no CSS in it at all**. Each site then writes its own markup, type,
colour and motion against that core. That is *fork the presentation, never the
engine* honoured exactly, with the line drawn where he has just put it, and it
is the difference between a per-client design pass and a per-client
reimplementation of the rules. It is a bounded job — the logic already exists
inside `BookingPage.jsx` and its six step components and has to be lifted out,
not invented.

**AND "IT'S UP TO THE DETAILER'S CHOICE" IS THE OTHER HALF.** `/book/:slug`
does not go away: it stays as the platform's own flow, and it is what a
**booking-only** customer gets — the split roadmap 3.3 already draws between
website-package customers and the ones who just want a booking link on
`detailingplatform.com/book/name`. So there are two shapes, the detailer picks,
and the built-in form is the default for anyone buying a website.

**ONE PROBLEM DISAPPEARED WITH THIS ANSWER.** §8.2 used to be a real build: the
platform's flow is dark, a tenant site can hand it one colour, and world B is
light — so a customer crossed from a light page to a dark form mid-purchase.
**There is no crossing now.** The form is on the tenant's own ground in the
tenant's own type. `BookingBusinessContext.jsx`'s note — *"reopen in phase 3 if
a bespoke tenant site turns out light"* — is answered by removing the seam
rather than by theming it.

---

## 2. The twelve implementations every tenant site owes

Each entry is a dashboard feature a detailer is paying for. **The "if omitted"
line is the point of the enumeration**, because every one of these fails
*silently*: the dashboard screen still works, the setting still saves, and
nothing anywhere reports that the feature reaches nobody.

**First, the question 3.1's own headline asks — "which pages every tenant
gets".** Under *fork the presentation*, **the answer is that page structure is
presentation and the platform does not get to decide it.** Its own list —
home, services, gallery, about, reviews, FAQ, contact, booking — maps onto the
twelve below as 2a/2k (home), 2b + 2c (services), 2f (gallery), 2k (about), 2g
(reviews), 2h (FAQ), 2j + 2k + 2i (contact), 2a (booking), plus **two that list
had no page for at all: monthly plans (2d) and the site-wide sale (2e)** — both
built after that list was written. A client can ship all of it as one long
page, or as nine, or fold "how to pay" into the footer. **What is fixed is that
each of the twelve appears SOMEWHERE a customer can reach without asking.**

### 2a. The booking form — REWRITTEN 2026-09-05 by the owner's ruling, §1c
**Owes:** **the form itself, built into the site in the site's own design** —
the step sequence (Services → Extras where the tenant has add-ons → Vehicle →
Location → When → Details → Review), the running estimate, and the submit. Plus
a visible, primary route to it from every page.
**If omitted:** the product does not function. Everything else on this list is
downstream of it.
**Source:** the same profile every other row reads, plus the public functions —
`calculate-booking` for the price, `available-slots` for the times,
`validate-promo-code` for a code, `create-booking` for the write.
**THE RULE UNDER IT, AND IT IS THE ONE THAT MATTERS:** the form ASKS and never
computes. Every figure comes from `calculate-booking` and every open time from
`available-slots`. **A site that adds the prices up itself will one day print a
number the server does not charge; a site that works out which days are open
will offer a time the server refuses.** The server is the gate either way, so
this costs a customer their booking rather than costing the detailer money —
which is the failure that is harder to notice.
**A booking-only detailer keeps `/book/:slug` instead** and owes nothing here;
that is the other half of his ruling and the split roadmap 3.3 already draws.
The dashboard prints that URL and a QR from `components/BookingLink.jsx`.

### 2b. The service catalog
**Owes:** every active service, in its group, with name, description, price,
`price_is_from` ("from $X"), duration and `features`. Groups keep their order,
and the page must not contradict their `is_exclusive` / `max_select` shape.
**AND THE VEHICLE-SIZE LADDER, AND THE NOTES — both added 2026-09-05 from
research §4a and §4b.** Five of six real detailers print every size's price
(`$179 sedan / $229 mid-size / $279 oversized`), because "how much" is the
question the site exists to answer and the honest answer has three numbers in
it; that is `services.vehicle_size_adjustments` against
`business_settings.vehicle_sizes`. And four of six carry a disclaimer on the
service — *"this is not a ceramic coating"*, *"condition may change the
price"* — which is a detailer managing an expectation before it becomes an
argument on a driveway; that is `services.notes`, and a site prints it beside
the service it belongs to.
**If omitted or hand-typed:** the detailer raises a price in Catalog, the
booking flow charges the new one, and the site advertises the old one. **This
is the "a number PRINTED is not a number CHARGED" failure with the two numbers
in two different codebases** — the worst version of a defect this repo already
has a rule about.
**Source:** `service_groups`, `services`.

### 2c. Add-ons
**Owes:** every active add-on with price, duration and — same reason as 2b —
its `notes`.
**If omitted:** the extras step exists in the flow and nothing sells it.
**Source:** `add_ons`.

### 2d. Monthly plans
**Owes:** every active plan — cadence (`cadence_count` + `cadence_unit`),
`visits_per_period`, the price in its `price_kind` shape (`monthly`,
`per_visit`, `percent_off`, `total`), the term if there is one, and what is
included — plus a link to `/book/:slug/plans`, which is where somebody joins.
**If omitted:** roadmap 2.14, both halves, reaches no customer. A plan is the
one thing in this product that recurs.
**Source:** `plans`. **A plan price must be printed in the shape its
`price_kind` names** — `app/src/lib/plans.js` has the wording; "$1999.00 a
month" for a prepaid year was a real defect.

### 2e. The site-wide sale
**Owes:** if `site_discount_active`, the site says so, using
`site_discount_label` (the detailer's own words) or "N% off".
**If omitted:** the detailer switches on a sale in the dashboard and the only
place it appears is the review step, after the customer has already chosen.
**Source:** `settings.site_discount_active` / `_percent` / `_label`.

### 2f. Gallery
**Owes:** `gallery_images` in `sort_order`, and **the `before`/`after` kind
rendered as a pair** rather than as two unrelated photos.
**If omitted:** the Gallery settings screen writes to nothing anyone sees.
**Source:** `gallery`. The URLs are Supabase Storage in the public-read
`business-media` bucket, so any origin can render them with a plain `<img>`.

### 2g. Reviews
**Owes:** `testimonials` with author, quote and rating, plus a link out to
`google_review_url` / `yelp_review_url` where set.
**If omitted:** `screens/more/Reviews.jsx` writes rows nobody reads.
**Source:** `testimonials`, `settings.google_review_url` / `yelp_review_url`.

### 2h. FAQ
**Owes:** the question/answer list, **only when `faq_enabled`** — an empty list
and "I don't want this section" are two different answers, and the schema
deliberately tells them apart.
**If omitted:** the storage landed 2026-09-02 and still reaches nobody.
**Source:** `business_settings.faqs` / `faq_enabled` — **not exposed by the RPC
today.** §6b.

### 2i. How to pay
**Owes:** the methods the detailer accepts. Cash is a boolean; the other five
are handles.
**If omitted:** the handles reach the customer's email and nowhere else, which
is the exact complaint the owner has about his own old site.
**Source:** `business_settings.pay_cash` / `pay_venmo` / `pay_cashapp` /
`pay_zelle` / `pay_paypal` / `pay_other` — **not exposed by the RPC today.**
§6c. **And the linking rule is not the site's to invent:**
`supabase/functions/_shared/payments.ts` decides what becomes a link and what
is printed as typed, because a wrong payment link sends somebody's money to the
wrong person. A site prints what that module prints and links what it links.

### 2j. Hours and where they work
**Owes:** the weekly hours, and whether they come to you (`mobile_enabled`),
you come to them (`dropoff_enabled`, with `dropoff_address`), or both, plus
`service_area`.
**If omitted:** the customer finds out on the Location step — the fourth of
seven, or the third where the detailer has no add-ons — that the business does
not cover them.
**Source:** `hours`, `business.dropoff_address`, `business.service_area`,
`settings.mobile_enabled` / `dropoff_enabled`.

### 2k. Identity and contact
**Owes:** name, tagline, logo, hero image, about copy, phone, and the social
links that are set.
**If omitted:** `BusinessInfo.jsx` and `Appearance.jsx` edit fields with no
effect.
**Source:** `business`, `branding`. **The accent is `branding.primary_color`
and it must be ONE CSS custom property**, so a retint is one value — law 11b:
the accent is identity, never meaning, and a green "it worked" or a red error
never follows the tenant.

### 2l. What the site must not contradict about booking mode
**Owes:** if `booking_mode` is `request`, the site's call to action promises a
**request**, not a confirmed booking.
**If omitted:** the site says "Book instantly", the customer gets an email
saying the detailer will get back to them, and the detailer answers for a
promise the site made. The owner's own framing: *"one is just a little bit more
guaranteed than the other."*
**Source:** `settings.booking_mode`.

---

## 3. The read contract, key by key

Every key `get_public_business_profile` returns, and which implementation above
consumes it. **A key not listed here does not exist; a site that needs one that
is missing is a schema change, not a workaround.**

| Key | Contains | Used by |
|---|---|---|
| `business` | `slug`, `name`, `timezone`, `phone`, `dropoff_address`, `service_area` | 2a, 2j, 2k |
| `branding` | the whole `business_branding` row less `business_id` / `updated_at`: `logo_url`, `primary_color`, `secondary_color`, `hero_image_url`, `tagline`, `about_copy`, six `social_*` | 2k |
| `settings` | 20 named keys — the two location flags, the water/power and condition questions, `vehicle_sizes`, `travel_zones`, the four slot rules, `travel_fee`, `travel_radius_miles`, `cancellation_window_hours`, the three `site_discount_*`, the two `*_review_url`, `booking_mode` | 2e, 2g, 2j, 2l |
| `service_groups` | `name`, `description`, `sort_order`, `max_select`, `is_exclusive` | 2b |
| `services` | active only; price, duration, `vehicle_size_adjustments`, `price_is_from`, `features`, `allows_mobile` / `allows_dropoff`, `available_weekdays`, `notes`, `sort_order` | 2b |
| `add_ons` | active only; price, duration, `features`, `notes` | 2c |
| `plans` | active only; cadence, `visits_per_period`, `price_kind`, `price_amount`, `term_months`, `included_service_ids` | 2d |
| `hours` | `weekday`, `open_time`, `close_time` | 2j |
| `testimonials` | active only; `author`, `quote`, `rating`, `source` | 2g |
| `gallery` | active only; `kind`, `image_url`, `before_url`, `after_url`, `caption` | 2f |

**`secondary_color` is a schema accident** and no site should use it —
`Appearance.jsx` writes the same value into both columns, because law 11 gives
a tenant one colour.

**The three properties that make this safe, and that must survive any change to
the function:** it is `security definer` (so RLS is not in the way), it
resolves exactly one business by slug and never by a client-supplied id, and it
filters `status = 'active'` — **which is the whole of how a suspended
subscription darkens a tenant's site.**
`20260905000000_platform_billing.sql` depends on that and says so.

---

## 4. What a site may not do

- **No table reads.** RLS gives an anonymous visitor zero rows; a site that
  appears to work by reading a table is a site whose RLS is wrong.
- **No arithmetic about money.** Not the quote, not the travel fee, not the
  plan discount, not the promo. `calculate-booking` prints and
  `create-booking` charges, from the same module.
- **No availability logic.** `available-slots` owns hours, blockouts,
  drop-off-only periods, per-service weekdays, buffers and the exclusion
  constraint. A site that computes an open day will offer one that is closed.

**THESE THREE GOT SHARPER ON 2026-09-05, NOT SOFTER.** They were written when a
site was going to be a page of content that linked to our flow, where breaking
them took effort. **Now every website-package site draws the form** (§1c), so
the temptation is in front of it constantly: the prices are already on the
page, the hours are already on the page, and adding them up or reading them is
a few lines. **Do not.** The gap between a site that asks and a site that
computes is invisible on the day it is written and shows up as a customer being
offered a time that is refused.
- **No service key, ever.** A site ships the anon key, which is public by
  design and is what every public function expects.
- **No customer data.** The profile carries none, and a site has no way to ask
  for any.

---

## 5. What a site may omit

**THIS SECTION ALL BUT EMPTIED ON 2026-09-05 AND THE REASON IS WORTH READING,
because it is the same mistake twice.** Everything that was here was excused
with one sentence — *"it is consumed inside the booking flow, which the site
does not own."* Both halves of that turned out wrong on the same day. The
vehicle-size table left first, because real detailers print the ladder on the
page and a customer decides from it (research §4a). Then the owner ruled that
**the site DOES own the flow** (§1c), and the excuse stopped covering anything
at all.

So: **the water and power questions, travel zones, the cancellation window,
`min_advance_minutes` and `max_advance_days` are now the site's business**,
because the site draws the steps that ask them. They are not listed under §2
as separate implementations — they are inside 2a, the form — but a site that
omits the ones its tenant has configured is asking a customer to find out
later.

**What a site may still genuinely omit** is short and honest: nothing in the
profile is decoration, but a detailer who has not configured a thing owes no
section for it — no plans, no gallery, no add-ons, no FAQ, no sale. **The
contract is "if the dashboard holds it, the site shows it", never "the site
must have twelve sections."**

*The transferable bit: a blanket reason that covers a whole list is a reason
nobody re-examines per item. This list had one, and it was load-bearing for
six things and true of none.*

---

## 6. The gaps — what has to be built before a site can honour this

Ordered by what blocks the most. **The roadmap's 3.1 entry listed four; one of
those was wrong, and three more were found writing this.**

> **FIVE OF THE EIGHT ARE CLOSED AS OF ROADMAP 3.2(b), 2026-09-05.**
> `20260905001000_tenant_site_contract_gaps.sql` publishes the FAQ (6b), the
> payment handles (6c), the closures (6d) and `credentials` +
> `established_year` (6h) on `get_public_business_profile`, and DROPS the two
> dead shadowing branding columns (6e). The two writing halves shipped with
> it: a **Common questions** settings screen — the ninth row `Business.jsx`'s
> own header designed and stage 6 deliberately did not build — and a
> credentials editor plus a *Detailing since* field on **Business info**.
> `app/src/book/core.js` normalises all of it, `paymentMethods()` and
> `faqFor()` are the two rules a site would otherwise re-derive, and
> `tests/booking-core.test.mjs` § 14 pins them.
>
> **AND 6a CLOSED THE SAME NIGHT, IN ROADMAP 3.3.** All five URL builders in
> `_shared/config.ts` take the tenant's own origin as a required first
> argument; `siteFor()` resolves it from `business_canonical_host`; and a
> detailer sets and proves their address on the new **Your web address**
> settings screen. **`business_domains.domain` is a hostname that RESOLVES TO
> THIS APP** — not "the detailer's website" — because the receipt, plan and
> opt-out pages the platform emails are pages this app serves, and pointing
> them at a host that does not serve them replaces a visible seam with a 404.
> `verify-domain` proves it by fetching a marker file from the address itself.
> Runbook: `docs/custom-domains.md`.
>
> **WHAT IS STILL OPEN: 6f and 6g — and both are questions for the owner
> rather than work.** Written up in `docs/overnight-log.md` with a
> recommendation each.

**AND THE GAP LIST WAS THEN CONFIRMED FROM THE OTHER DIRECTION, WHICH IS THE
PART WORTH TRUSTING.** The first worked page was built in parallel, by a
different model, from the design system rather than from this file — and it
annotated every element with the `data-src="table.column"` it would really be
fed from. **Five of the seven gaps below are columns that page independently
reached for**: `business_settings.faqs`, `business_settings.pay_*`,
`blockout_dates`, `businesses.contact_email` and `business_domains.domain`.
That turns §6 from a list of things somebody noticed into a list of things a
page built against this contract **could not be drawn without** — and nothing
coordinated the two halves. (That page was then rejected for its LOOK — it was
the platform's own page recoloured — and replaced by the three in
`docs/tenant-sites/`; the finding survives the page.)

**AND AN EIGHTH GAP CAME FROM LOOKING AT REAL DETAILERS' SITES** — §6h, the
one that blocks a site most after the URL problem.

### 6a. Every customer-facing URL is hardcoded to the platform — NEW, and the largest
`supabase/functions/_shared/config.ts` builds `businessSiteUrl`, `receiptUrl`,
`planUrl` and `plansUrl` from **one global `PLATFORM_URL`**. So a detailer on
`coastlinedetail.com` sends confirmation emails whose "view, change or cancel"
link goes to `detailingplatform.com`, and whose "book again" goes there too.
`business_domains` has existed since the first tenant migration
(`20260827000100_tenant_core.sql:121`) and **nothing reads it.**
**Why it outranks the other six:** it is the seam a customer can actually see,
in the one artifact the detailer did not write. This is roadmap 3.3's real
content, and 3.3's own wording — "hostname→business lookup + the Netlify alias
process" — describes only the inbound half.

### 6b. FAQ is stored and exposed to nobody — from the roadmap, confirmed
`business_settings.faqs` and `faq_enabled` landed in
`20260902001000_faq_storage.sql` with, in that file's own words, "no writer and
no reader on purpose". The RPC's `settings` object lists its keys explicitly
and includes neither. **There is also still no FAQ settings screen** — the
owner's own split — so this is two changes: an RPC key and a screen.

### 6c. The payment handles are exposed to nobody — from the roadmap, confirmed
Six columns from `20260904006000_payment_handles.sql`, read only by
`_shared/payments.ts` on the way into an email. Not in the RPC.

### 6d. Closures are exposed to nobody — from the roadmap, confirmed
`blockout_dates` and `dropoff_only_periods` drive availability server-side, so
booking stays correct without them. What a site cannot do is *say* "closed the
week of the 4th". **Lowest priority of the seven** — it is the only one where
omitting it breaks nothing; it just leaves a customer to discover the closure
in the date picker.

### 6e. THE ROADMAP'S FOURTH GAP IS WRONG — corrected by reading the file
It says *"Five of the six social links cannot be typed in. `BusinessInfo.jsx`
edits `social_instagram` only."* **That was true when
`dashboard-feature-inventory-2026-08-31.md` §3 recorded it, and stopped being
true on 2026-09-02** when stage 6 added the fields. The file today has inputs
for Instagram, Facebook, TikTok and YouTube (`BusinessInfo.jsx:193-201`), under
a comment beginning *"FOUR SOCIAL FIELDS, NOT ONE"*.
**What is actually wrong is smaller and different: `branding.social_google` and
`branding.social_yelp` are dead columns that shadow live settings.** The screen
edits `business_settings.google_review_url` / `yelp_review_url` five lines
lower, that pair is what the emails and the dashboard use, and the branding
pair have state and save code in `BusinessInfo.jsx` but **no input** — so they
are always written empty. **A site reads the `settings` pair. The `branding`
pair should be dropped**, or a later session reads whichever one it finds
first.
*(The lesson is the one CLAUDE.md keeps recording: a gap list copied forward
rots. This one was copied out of a file dated 2026-08-31 into a roadmap entry
dated 2026-09-05 without being re-read.)*

### 6f. The business's own email address is not in the profile — NEW
`businesses.contact_email` exists, and the RPC returns `phone` but not it, so a
site's contact section can print a phone number and no address. Possibly
deliberate — the RPC's stated rule is "strictly public-safe" and an address in
public JSON is scrapeable — but nothing says so, and a detailer who wants to be
emailed has no way to publish it. **The default world's "Reach us" block asks
for it by name**, which is what moved this from a curiosity to a gap. **A
one-line answer from the owner rather than a build:** expose it, add a
`show_email` flag so it is the detailer's own choice, or decide the booking
form is the contact form.

### 6g. Campaign links are a feature the platform DROPPED, not a dead end — CORRECTED
**This section said "leave it dormant" and that was wrong.** It was written
from the platform's side, where `track-visit` has no caller in `app/` and
nothing reads `campaigns` or `campaign_visits` — all true. **Then his own site
was read for §1c and both halves turned out to be live there:**
`reference/frontend/src/App.js:29` imports `trackVisit` and calls it at line 54
on every page load, `lib/campaign.js` stores the campaign and auto-applies its
promo code (the comment names a golf-course QR as the real case), and the old
admin had a **"Campaign Links"** section in `MoreScreen.jsx` that read them
back. **End to end, in production, on the business this product was built
from.**

So this is not something nobody wants — it is a working feature the conversion
lost, and the tenant sites are exactly where it would come back, because a
tenant site is where a visit happens. **Recommendation: 3.2 wires the sites to
call it (one function call and a stored visitor id), and the dashboard screen
that reads it belongs on Phase 4's restoration list** beside referral/loyalty
and the calendar sync — it is the same kind of item and was missed there.
**Not built now**, because a site writing rows no screen shows is the
half-feature this section was originally right to refuse.

*The lesson is about the evidence, not the feature: "nothing calls it" was
measured in `app/` only, and the reference implementation of this entire
product was sitting unread in the same repo.*

### 6h. Credentials and trust markers have nowhere to live — NEW, from the research
Five of six real detailers lead with some of *licensed and insured*, *certified
Ceramic Pro installer*, *IDA certified*, *est. 1993*, *manufacturer warranties*,
*5★ across N Google reviews*. **The schema holds none of it.** There is nowhere
for a detailer to type "insured" or "since 2016", so every bespoke site would
hard-code it — which is exactly the failure this contract exists to prevent,
because a lapsed certification then lives in a client's HTML where nothing can
see it. **Proposed shape: `business_branding.credentials jsonb`, a list of
`{ label, detail?, year? }`, plus `businesses.established_year`** — the same
reasoning `faqs` used for being a list on the settings row. Research §4c. The
three worked pages carry it marked `PROPOSED`, so the argument is visible.
**Two neighbours deliberately NOT proposed**, so nobody builds half of either:
bundle offers ("30% off the second detail" — research §4d, a pricing-engine
change) and gift certificates (§4e, money taken before a service exists).

**Sequencing.** 6b, 6c and 6d are the same change — three keys added to one
`jsonb_build_object` in a new migration — plus an FAQ settings screen for 6b.
6h is one more column on the same migration plus a field on `BusinessInfo.jsx`.
6e is a decision plus a small migration. 6a is roadmap 3.3 and is a build of
its own. 6f and 6g are questions for the owner, not work.

---

## 7. The rewording roadmap 3.2 asked for

Roadmap 3.2 read *"entirely from tenant configuration, zero hardcoded
content"*, and its own note said that wording predates the owner's 2026-08-29
decision and describes the shared-system answer he rejected. **Replacement, now
written into `docs/roadmap.md`:**

> **3.2 Build the tenant-site kit against the contract.** Close
> `docs/tenant-site-contract.md` §6's gaps, then produce the default world and
> the brief that lets a fresh agent build a client's site from it. A site's
> *content* comes entirely from tenant configuration — a price changed in the
> dashboard changes the live site with no code edit — while its *presentation*
> is bespoke per client. The required implementations are §2 of the contract;
> the read surface is §3.

And `dashboard-feature-inventory-2026-08-31.md` §5's table has three stale
rows: **Reviews is now editable** (`screens/more/Reviews.jsx`), **About is
fully editable** (§6e above), and **the FAQ has storage** but still no screen.
§5 is deliberately not edited — it is a dated snapshot, and this file is where
the current answer lives.

---

## 8. Open, and honest about it

1. **§1c is ANSWERED, and it is the only owner decision this file was
   holding.** He chose the form built into the site, against the
   recommendation, with his own site as the evidence. Everything else here is
   a reading of what already exists.
2. ~~**A light client site hands the customer to a dark booking flow.**~~
   **DISSOLVED BY HIS ANSWER, same day.** This was going to be a 3.2 build —
   teach the booking page to take a tenant's ground and not just its accent —
   because world B is light and the flow is dark. With the form built into the
   site there is no crossing to theme. **Kept rather than deleted because the
   shape is worth recognising: a seam that needed a feature to hide it stopped
   existing when the seam was removed instead.** The note in
   `BookingBusinessContext.jsx` can be closed when 3.2 lands.
   **What replaces it as the real risk is the opposite one:** every
   website-package client now carries a booking form, and his own weighs 1,581
   lines. §1c's headless-core recommendation is the answer, and it is the
   biggest single thing 3.2 has to build.
3. **§2 is twelve implementations for a site that offers everything.** A
   detailer with no plans, no gallery and no add-ons owes none of those three.
   The contract is "if the dashboard holds it, the site shows it" — never "the
   site must have twelve sections".
4. **Nothing has been built against this yet.** The first real test is the
   first client's site, and the honest expectation is that building one finds a
   thirteenth implementation nobody thought of.
