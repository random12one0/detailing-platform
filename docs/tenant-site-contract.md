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
| **How a site writes** | It doesn't. It hands the customer to the platform's booking flow. |
| **Required of every site** | Twelve implementations, §2. Omit one and a dashboard feature the detailer is paying for silently does nothing. |
| **The one decision for the owner** | §1c — the booking wizard is engine, so a site links to it rather than rebuilding it |
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
| `track-visit` | Records a visit. **Deployed and nothing has ever called it** — §6g. |

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

### 1c. THE ONE DECISION FOR THE OWNER — where the customer actually books

The booking flow is **seven steps** (`app/src/book/BookingPage.jsx` plus its
step components), and the steps are not decoration: they enforce exclusive
service groups, per-service weekday availability, vehicle-size price
adjustments, the condition question, travel zones, drop-off-only periods,
request-vs-reserve mode and plan membership. It is the most rule-dense surface
in the product, and its layout is measured to the pixel (`W16`: a customer must
never scroll inside a step; step 1 has **10px** of spare room at 1440x900).

Three ways a bespoke site can offer booking:

1. **Link out to the platform's flow** — the site's "Book" button goes to
   `/book/:slug`, which already retints itself to the tenant's accent
   (`brandVarsFor` in `app/src/lib/theme.js`) and already sets the tenant's
   name as the page title. **Recommended.**
2. **Embed it in an iframe** — keeps the customer on the client's domain and
   costs postMessage plumbing for height, plus W16 stops being enforceable
   because the step's viewport is no longer the screen.
3. **Rebuild the seven steps per client** — this is forking the engine wearing
   a presentation costume, and it is exactly the ceiling
   `docs/tenant-websites.md` §3 exists to avoid.

**Recommendation: (1).** The cost is a domain change mid-flow, and §6a is what
removes even that — once `business_domains` is read, the flow can be served at
`coastlinedetail.com/book` and the customer never leaves. Option 3 is not on
the table; option 2 can be revisited per client without changing anything here,
because both 1 and 2 point at the same URL.

**A consequence worth stating before he agrees:** the booking flow is dark and
today a client site can hand it one colour and nothing else. Since he has ruled
that sites are genuinely different — and one of the three worked pages is
light — **the flow will need to take a tenant's GROUND as well as its accent
before the first light client ships.** §8.2. That is the one place this item
found where presentation legitimately has to reach into the engine, and it is
a bounded change: a second corrected value beside `brandVarsFor`, not a fork.

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

### 2a. The booking entry point
**Owes:** a visible, primary route to `/book/:slug`, on every page.
**If omitted:** the product does not function. Everything else on this list is
downstream of it.
**Source:** the slug. The dashboard prints the URL and a QR from
`components/BookingLink.jsx` (`window.location.origin` + `/book/` + slug).

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
- **No service key, ever.** A site ships the anon key, which is public by
  design and is what every public function expects.
- **No customer data.** The profile carries none, and a site has no way to ask
  for any.

---

## 5. What a site may omit

Nothing here is a required implementation, and naming them is what stops a
later session treating everything in the schema as owed: the water and power
questions, travel zones, the cancellation window, and `min_advance_minutes` /
`max_advance_days`. **All of them are consumed inside the booking flow, which
the site does not own.** A site may mention them; nothing breaks if it does
not.

**The vehicle-size table WAS on this list and was moved to 2b on 2026-09-05.**
The reasoning — "it is consumed inside the flow" — was true and beside the
point: real detailers print the ladder because a customer decides whether to
book from it. Research §4a.

---

## 6. The gaps — what has to be built before a site can honour this

Ordered by what blocks the most. **The roadmap's 3.1 entry listed four; one of
those was wrong, and three more were found writing this.**

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

### 6g. `track-visit`, `campaigns` and `campaign_visits` are dormant — NEW
A deployed public edge function and two tables with, verified 2026-09-05, **no
caller in `app/` and no reader anywhere.**
`dashboard-feature-inventory-2026-08-31.md` §3 already listed it as
built-with-no-door. **A tenant site is the natural caller** — it is where a
visit happens — but calling it buys nothing until a dashboard screen reads it.
**Recommendation: leave it dormant and say so here**, so 3.2 does not wire a
site into an endpoint whose output nobody can see. Revisit only if the owner
wants visit numbers.

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

1. **§1c is the owner's approval, and it is the only thing in this file that
   is.** Everything else is a reading of what already exists.
2. **A light client site is now a real case, not a hypothetical.** The owner
   ruled on 2026-09-05 that tenant sites are genuinely different from each
   other and from the platform — different colours, fonts, aesthetic — so one
   of the three worked pages (`docs/tenant-sites/b-van.html`) is light on
   purpose, and it hands the customer to a DARK booking flow mid-purchase.
   `BookingBusinessContext.jsx` has said *"reopen in phase 3 if a bespoke
   tenant site turns out light"* since 2026-08-30. **This is phase 3 and it has
   turned out light.** What the booking page can take from a tenant today is
   ONE colour (`brandVarsFor`); what a light site needs is a ground. That is a
   3.2 build and it is the one piece of the ENGINE this item has found that
   presentation genuinely needs to reach.
3. **§2 is twelve implementations for a site that offers everything.** A
   detailer with no plans, no gallery and no add-ons owes none of those three.
   The contract is "if the dashboard holds it, the site shows it" — never "the
   site must have twelve sections".
4. **Nothing has been built against this yet.** The first real test is the
   first client's site, and the honest expectation is that building one finds a
   thirteenth implementation nobody thought of.
