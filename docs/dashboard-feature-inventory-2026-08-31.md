# The dashboard's complete feature inventory — 2026-08-31 (roadmap 2.11, step 1)

**This is the list the whole rebuild is laid out around, and it is the thing
you approve before a single screen is designed.** Roadmap 2.11's own words:
*"you cannot lay out a dashboard around features you have not listed"* — and
that, not the redrawing, is the difference between this and building the same
dashboard again.

Your instruction is the reason this step exists at all: *"know every single
aspect of, like, all the features and whatever that's gonna be in the admin
dashboard, and then create it from scratch."* The listing is the "know"; the
screens come after.

---

## 0. The short version, in plain words

Think of the dashboard as a shop's back office. Before anyone decides where the
desk goes and which drawer holds what, somebody has to walk the room and write
down everything that has to live in it — including the boxes still in the van,
and the shelf that was ordered and never arrived.

That walk is done. **The room has to hold 118 things**, and the table at §2
counts them exactly:

| | |
|---|---|
| **98** | are in the room and working |
| **6** | are things **you** have already said come back |
| **6** | are built into the walls with **no door on them at all** — the database and the server do the work and no screen anywhere reaches them |
| **4** | are in the room and **broken**: a switch or a field that is on the screen and does not do what it says |
| **3** | are **questions for you** — §9 |
| **1** | is Phase 3 work that has nothing behind it yet |

**Two of those groups overlap with things named elsewhere in this file and the
numbers are not the same, on purpose.** §3 counts **seven** things with a
working back end and no working front end — the six with no door, plus the push
switch, which is counted as *broken* above because it is on a screen. §4 counts
the **five** features you reversed in 2026-08-28's decision; two more rows are
*comes back* from a different decision of yours (decision 3, the Clients
screen). Where a number could mean two things, both are stated.

**Nothing on this list is a new idea of mine.** Every row comes from one of
five places: the code as it stands today, the database, your own recorded
decisions, Phase 3's requirements, or the six competitor products researched
in roadmap 2.10. Where I think something is missing and you have never ruled
on it, it is in **§9 as a question**, not smuggled into the table.

**The one thing worth your attention before anything else:** §7 lists live
defects, and **five of them are new** — nobody has seen them before
today, because seeing them needed a demo business with a real day's work on it,
which is what step 0 of this item built. One of them is that **the screen built for
picking your colour cannot change the colour your customers see in their
emails** — and on four of the twelve colours offered there, the business name in
that email is too faint to read.

---

## 1. How this was built, and what it is allowed to claim

Five sources, in the order roadmap 2.11 names them. Every row is tagged with
the source it came from, because a row's source is what says how much it can be
argued with.

| Tag | Source | Strength |
|---|---|---|
| **(a)** | What the dashboard does today | **Strongest.** Read out of `app/src` and the migrations on 2026-08-31, not carried from a note |
| **(b)** | A table or an edge function with no screen | **Strongest.** Counted mechanically — every table cross-referenced against every reference in `app/src` |
| **(c)** | What you have already said comes back | **Yours.** DECISIONS.md → "Owner decisions" and "Removed on purpose" |
| **(d)** | What Phase 3's tenant websites will need | **Medium.** From `docs/tenant-websites.md` and roadmap 3.1–3.4, which are plans rather than built things |
| **(e)** | What the trade's six products carry and we do not | **Weakest, and used only to raise a question.** `docs/dashboard-architecture-2026-08-31.md` §1b |

**How (b) was counted, so the number can be trusted.** Twenty-nine tables and
eighteen edge functions exist. Each was grepped against everything in `app/src`.
Six tables have zero references anywhere in the front end
(`business_domains`, `campaigns`, `campaign_visits`, `monthly_plans`,
`owner_daily_digest_state`, `owner_push_subscriptions`) and three edge functions
do (`owner-push-subscribe`, `owner-push-unsubscribe`, `track-visit`).
`send-email` also has none and is **not** a gap — it is called by other
functions on the server, which is correct.

**What this file deliberately does NOT do.** It does not say which tab anything
goes on, what it looks like, or what order it appears in. The tab bar is already
settled (Part A, approved 2026-08-31) and everything else is step 4. A row's
"Where it lives now" column is a statement about the CURRENT dashboard, not a
proposal about the next one.

---

## 2. The inventory

**Status column:** `works` · `broken` (on screen, does not do what it says) ·
`no screen` (built underneath, unreachable) · `comes back` (your decision) ·
`Phase 3` · `question` (§9 — you rule on it).

### 2a. The day, and one job

| # | Capability | Src | Status | Where it lives now |
|---|---|---|---|---|
| 1 | See today's jobs in order | a | works | Today — the day rail |
| 2 | See how many are done and how many are left | a | works | Today — ledger strip |
| 3 | See what today is expected to earn, and what has been collected | a | works | Today — ledger strip |
| 4 | Have the one thing that needs doing lit, and only that | a | works | Today (`dashboard-skeletons.md` §6) |
| 5 | See tomorrow's jobs | a | works | Today — "Tomorrow" |
| 6 | Be told, in one line, how many finished jobs still need payment recorded | a | works | Today — the warn box |
| 7 | Mark a job complete | a | works | Job card, job sheet |
| 8 | Record a payment — amount, method, tip | a | works | `FinalizeModal` |
| 9 | Add extra line items to a job at payment time | a | works | `FinalizeModal` → `booking_line_items` |
| 10 | Open one job and see everything about it | a | works | `BookingDetail` sheet, from anywhere |
| 11 | Call the customer from the job | a | works | `BookingDetail`, job card |
| 12 | Text the customer from the job, using a saved template | a | works | `BookingDetail` + `lib/templates.js` |
| 13 | Navigate to the job in the phone's maps app | a | works | `BookingDetail`, job card |
| 14 | Change a job's date, time, service or price | a | works | `BookingDetail` → `update-booking` |
| 15 | Cancel a job | a | works | `BookingDetail` → `cancel-booking` |
| 16 | Delete a job without losing the record | a | works | `update-booking` soft delete |
| 17 | Email an invoice for a job | a | works | `BookingDetail` → `send-invoice` |
| 18 | Put a job in the phone's own calendar | a | works | `booking-ics` |
| 19 | Send a reminder for one job by hand | a | works | `api.sendReminder` |
| 20 | Take a booking over the phone | a | works | `NewBookingModal` |
| 21 | Open a single job from a link | a | works | `/job/:id` — built for a push tap that never arrives (see #101) |
| 22 | See the customer's own note on the job | a | works | `BookingDetail` |
| 23 | Write an admin-only note on a job | a | works | `NewBookingModal`, `BookingDetail` |

### 2b. The calendar

| # | Capability | Src | Status | Where it lives now |
|---|---|---|---|---|
| 24 | See the month, with a mark per day saying what is on it | a | works | Calendar — the month grid |
| 25 | Read those marks without relying on colour | a | works | Four forms, `theme.css` §marks |
| 26 | Open one day and see its jobs | a | works | `DaySheet` |
| 27 | Close a day entirely | a | works | `DaySheet` → `blockout_dates` |
| 28 | Give one day different hours from the usual week | a | works | `DaySheet` → `booking_hours_overrides` |
| 29 | Make a day or a stretch of days drop-off-only, or mobile-only | a | works | `DaySheet` → `dropoff_only_periods` |
| 30 | Find a past job by customer, service or status | a | works | Calendar → History |
| 31 | See a week rather than a month | e | question | Nowhere — §9 Q3 |

### 2c. Money

| # | Capability | Src | Status | Where it lives now |
|---|---|---|---|---|
| 32 | See what the business made over a period | a | works | Money — the lead figure |
| 33 | See the shape of it over six periods | a | works | Money — the six-bar chart |
| 34 | Switch the period | a | works | Money |
| 35 | See who has not paid yet, and act on it | a | works | Money — "Waiting on payment" |
| 36 | Record an expense — amount, category, description, date | a | works | `ExpenseModal` |
| 37 | See expenses listed | a | works | Money |
| 38 | See income against expenses | a | works | Money — the ledger |
| 39 | Record how an expense was paid | a | works | `expenses.payment_method` |
| 40 | Export or send the figures to an accountant | e | question | Nowhere — §9 Q4 |

### 2d. Customers

| # | Capability | Src | Status | Where it lives now |
|---|---|---|---|---|
| 41 | Look a customer up by name | a | works | Clients |
| 42 | See one customer's contact details and act on them | a | works | Client sheet |
| 43 | Keep a private note about a customer | a | works | Client sheet → `customers.notes` |
| 44 | See everything a customer has ever booked | a | works | Client sheet |
| 45 | See when a customer was last in | a | **broken** | Client sheet — can print a future date (Part B #6) |
| 46 | See what a customer has spent in total | a | works | Computed, shown in the sheet only |
| 47 | Sort or filter clients — last visit, lifetime value, not seen in N months | c | comes back | Nowhere. **Decision 3, answered yes, manual only** |
| 48 | Text a group of past customers to fill a slow week | c | comes back | Nowhere — decision 3's "act on the answer" |

### 2e. What you sell

| # | Capability | Src | Status | Where it lives now |
|---|---|---|---|---|
| 49 | Add, edit, retire a service | a | works | Catalog |
| 50 | Give a service a description | a | works | Catalog |
| 51 | Give a service a price | a | works | Catalog |
| 52 | Say a price is a starting price — "from $220" | a | works | `services.price_is_from` |
| 53 | Say how long a service takes | a | works | Catalog |
| 54 | List what is included in a service | a | works | `services.features` |
| 55 | Group services into categories | a | works | `service_groups` |
| 56 | Describe a category in a line | a | works | `service_groups.description` |
| 57 | Make a category pick-one rather than pick-many | a | works | `service_groups.is_exclusive` |
| 58 | Order services and categories by hand | a | works | `sort_order` |
| 59 | Charge more for a bigger vehicle, per service | a | works | `services.vehicle_size_adjustments` |
| 60 | Name your own vehicle sizes and give examples | a | works | `business_settings.vehicle_sizes` |
| 61 | Say a service is mobile-only or drop-off-only | a | works | `services.allows_mobile` / `allows_dropoff` |
| 62 | Say a service only runs on certain weekdays | a | works | `services.available_weekdays` |
| 63 | Sell add-ons | a | works | `add_ons` |
| 64 | Run a promo code | a | works | Promos |
| 65 | Limit a promo code to one use per customer | a | works | `promo_codes.once_per_customer` |
| 66 | Put the whole site on sale | a | works | `site_discount_*` |
| 67 | Sell a monthly plan | b + c | **no screen** | Table `monthly_plans` exists; nothing reads it |
| 68 | Run a referral or loyalty scheme | c | comes back | Removed in the port; you asked for it back |

### 2f. When you can be booked

| # | Capability | Src | Status | Where it lives now |
|---|---|---|---|---|
| 69 | Set opening hours per weekday | a | works | Hours |
| 70 | Take a day off | a | works | Blockout dates |
| 71 | Choose whether you go to them, they come to you, or both | a | works | `mobile_enabled` / `dropoff_enabled` |
| 72 | Leave a gap between jobs | a | works | `buffer_minutes` |
| 73 | Require notice before a booking | a | works | `min_advance_minutes` |
| 74 | Stop people booking too far ahead | a | works | `max_advance_days` |
| 75 | Choose how far apart the offered times are | a | works | `slot_interval_minutes` |
| 76 | Cap how many jobs a day can hold | a | works | `max_bookings_per_day` |
| 77 | Set how late a customer may cancel | a | works | `cancellation_window_hours` |
| 78 | Charge for travel by area | a | works | `travel_zones` |
| 79 | Charge a flat travel fee | a | **broken** | Superseded field, still editable, still holding $25 (Part B #5) |
| 80 | Set how far you will travel | a | works | `travel_radius_miles` |
| 81 | Say whether you need the customer's water and power | a | works | `water_requirement` / `power_requirement` |
| 82 | Ask the customer what condition the vehicle is in | a | works | `ask_vehicle_condition` |
| 83 | Charge more at weekends or in the evening | a | works | `price_rules` kind `time` |
| 84 | Charge more for short notice | a | works | `price_rules` kind `lead_time` |
| 85 | Round prices to the nearest $5 | a | works | `price_rounding_nearest` |

### 2g. What your page says

| # | Capability | Src | Status | Where it lives now |
|---|---|---|---|---|
| 86 | Set the business name, phone, email | a | works | Business info |
| 87 | Set the drop-off address and the service area | a | works | Business info |
| 88 | Set a tagline and an about/bio paragraph | a | works | Business info |
| 89 | Set a logo and a hero image | a | works | Business info (URL fields) |
| 90 | Choose your colour | a | **broken** | Two screens write it, and neither writes the one the emails use (§7 D1) |
| 91 | Link Instagram, Google, Yelp | a | works | Business info |
| 92 | Link Facebook, TikTok, YouTube | b | **no screen** | Columns exist on `business_branding`; nothing edits them |
| 93 | Point customers at your Google and Yelp review pages | a | works | Business info |
| 94 | Show photos of your work | a | works | Gallery |
| 95 | Share your booking link — copy, open, share sheet | a | works | Bottom of More |
| 96 | Collect and show reviews | b + d | **no screen** | Table `testimonials` exists; the booking page READS it; nothing writes it |
| 97 | Use your own domain name | b + d | **no screen** | Table `business_domains` exists; roadmap 3.3 |
| 98 | Edit the pages of your website — home, about, FAQ, contact | d | Phase 3 | Nowhere. Roadmap 3.1 decides the page list |
| 99 | See how many people visited and where from | b | **no screen** | `campaigns` + `campaign_visits` + `track-visit`, all unreachable. **Deliberately unplaced** — architecture doc §6 |

### 2h. How the app behaves for you

| # | Capability | Src | Status | Where it lives now |
|---|---|---|---|---|
| 100 | Choose which emails go out, to customers and to you | a | works | Notifications |
| 101 | Get a push notification on your phone | a + b | **broken** | Switch writes `push_enabled`; **there is no client code at all** (Part B #1) |
| 102 | Choose when reminders send | a | works | `customer_reminder_lead_minutes`, `evening_before_*` |
| 103 | Choose when you get nudged — before, after, and to finalise | a | works | `owner_nudge_*`, `wrapup_*`, `finalize_*` |
| 104 | Get a summary of the day each morning | a + b | works | `daily_digest_hour`; state in `owner_daily_digest_state` |
| 105 | Write the texts you send customers | a | works | Message templates |
| 106 | Let someone else in, and choose what they can do | a | works | Team → `invite-user` / `business_invites` |
| 107 | Take someone's access away | a | works | Team |
| 108 | Choose which maps, calendar and contacts app opens | a | works | This device |
| 109 | Sign out | a | works | Account |
| 110 | Set the business's time zone, and be warned what it moves | a | works | `TimezonePicker` + `TimezoneChangeGuard` |
| 111 | Sync to Google Calendar | c | comes back | Removed in the port; you asked for it back |
| 112 | Preview your own booking page as a test booking | c | comes back | Removed in the port; you asked for it back |
| 113 | Attach a contact card to the emails you send | c | comes back | Removed in the port; you asked for it back. **Not an architecture question — it is an email template** |
| 114 | Run the dashboard when you belong to more than one business | a | **no screen** | Schema supports it; the app silently uses the first membership |

### 2i. Getting in, and getting started

| # | Capability | Src | Status | Where it lives now |
|---|---|---|---|---|
| 115 | Sign in | a | works | `Auth` |
| 116 | Create a business | a | works | `CreateBusiness` → `create-business` |
| 117 | Accept an invitation to someone else's business | a | works | `AcceptInvite` → `accept-invite` |
| 118 | Be shown something useful on the very first run, before any data exists | a | question | Nowhere. §9 Q1 |

---

## 3. What is built underneath and has no door — the (b) list in one place

Seven things. Each is a table or a server function that already works, with no
working screen anywhere in `app/`. **Six of them are the rows marked
`no screen` at §2; the seventh is the push switch**, which counts as *broken*
there because a switch a detailer can turn on IS a screen — it just is not
connected to anything. **This is the list that decides
whether the rebuild is "the same thing redrawn":** a layout that does not give
these a home leaves them exactly as they are.

| Thing | What exists | What is missing |
|---|---|---|
| `testimonials` | Table; the booking page already reads and displays it | Anything that writes one |
| `campaigns` + `campaign_visits` + `track-visit` | Table, table and a deployed function | Anything that calls it or reads it |
| `monthly_plans` | Table | Everything |
| `business_domains` | Table | Everything (roadmap 3.3) |
| `owner_push_subscriptions` | Table, `owner-push-subscribe`, `owner-push-unsubscribe`, and `send-owner-reminders` genuinely sends | **The entire browser half:** no service worker, no `PushManager`, no permission prompt |
| `business_branding.social_facebook` / `_tiktok` / `_youtube` | Columns | Fields on a screen |
| Multi-business membership | `business_users` allows it | A way to switch |

`owner_daily_digest_state` is on the (b) count but is **not** a gap — it is a
marker table the reminder sweep writes to avoid sending twice. Named here so
nobody builds a screen for it.

---

## 4. What you have already said comes back — the (c) list

Five, all from DECISIONS.md → "Owner decisions (2026-08-28)", where you
reversed the port's removals and asked for full parity *"in a way that will be
best for detailers in the future"* — rebuilt as per-tenant features rather than
ported as they were.

1. **Monthly plans** (#67) — a table already exists and nothing uses it.
2. **Referral / loyalty** (#68) — columns were dropped; this one needs schema.
3. **Google Calendar sync** (#111) — needs per-tenant OAuth. A build, not a screen.
4. **The owner test-booking preview** (#112).
5. **The vCard on your emails** (#113) — an email template, not a screen.

**Two of the five are not really dashboard layout at all** (3 and 5), and one
of them (2) is the only thing on this whole list that needs a database change.
That matters for sequencing and is flagged here rather than discovered later.

---

## 5. What Phase 3's websites will need this dashboard to run — the (d) list

From `docs/tenant-websites.md`, which is your own words, and its one
architectural rule that you confirmed: **fork the presentation, never the
engine.** A tenant's site may look like anything; it may not omit the parts the
dashboard drives. Your sentence: *"a lot of the features of the admin dashboard
need some features on the website to work."*

Everything a tenant site displays has to be editable somewhere in this
dashboard, or the site becomes hand-edited code and the whole model breaks.
Checked against roadmap 3.1's page list — home, services, gallery, about,
reviews, FAQ, contact, booking:

| Website page | Fed by | Editable today? |
|---|---|---|
| Home | branding, tagline, hero, services | **Yes** |
| Services | services, categories, add-ons, prices | **Yes** |
| Gallery | `gallery_images` | **Yes** |
| About | `about_copy`, logo, socials | **Partly** — three social networks have no field (#92) |
| Reviews | `testimonials` | **No** — nothing writes them (#96) |
| FAQ | — | **No** — no table, no screen (#98) |
| Contact | contact fields, service area | **Yes** |
| Booking | the whole engine | **Yes** |
| The domain it lives on | `business_domains` | **No** (#97) |

**Four gaps — reviews, the domain, three of the social links, and the FAQ —
and three of the four are already in §3's list of things with no door.** That
is a useful convergence rather than a coincidence: **what has no screen today is
mostly what the websites will need first.** The FAQ is the exception and it is
the only one with nothing behind it at all, which is why it is a question
(§9 Q2) rather than a gap.

**One thing this file will not guess at: the FAQ.** There is no table, no
column and no decision. It is §9 Q2.

---

## 6. What the trade carries and we do not — the (e) list

From the six-product comparison in `docs/dashboard-architecture-2026-08-31.md`
§1b. **This is the weakest source in the file and it is used only to raise
questions, never to add a row on its own authority.**

| Thing | Who has it | Our position |
|---|---|---|
| **A message inbox** | 4 of 6 | **Settled: no.** Two-way texting needs a dedicated number, a carrier registration and a per-message cost. That is a business decision and a build, not a tab. Architecture doc §1c F4 |
| **Estimates / quotes before a booking** | Jobber, Mobile Tech RX | §9 **Q5** |
| **Deposits taken at booking** | Housecall Pro, Jobber | §9 **Q6** |
| **Recurring / subscription work** | Jobber, Housecall Pro | Overlaps monthly plans (#67) |
| **Before-and-after photo inspections** | Housecall Pro, Mobile Tech RX | §9 **Q7** |
| **A week view on the calendar** | 5 of 6 | §9 **Q3** |
| **Reports you can send an accountant** | 5 of 6 | §9 **Q4** |
| **Timesheets** | 1 of 6 | **No.** One product in six, and it is for crews |
| **Marketing / campaigns** | 3 of 6 | Half-built already (#99), deliberately unplaced |

---

## 7. Defects found while taking this inventory

**Part B of the architecture doc listed 21 findings. These six are the live
defects that belong to THIS list** — three of them carried over from Part B,
and **three found today and new.** None is fixed; 2.11 builds nothing before
step 6.

**D1 — NEW, and the worst of the six. The screen built for choosing your colour
cannot change the colour your customers actually see in their email.**

Two columns hold a brand colour. `primary_color` is what "Your colour" writes,
with the whole correction system behind it — it checks the colour is legible,
adjusts it if it is not, and repaints the dashboard and the booking page.
`secondary_color` is editable **only** from a raw operating-system colour picker
labelled "Accent color" on the *Business info* screen, with no correction and no
statement of what it paints.

**In an email those two swap roles.** `supabase/functions/_shared/emailTemplates.ts`
uses `primary_color` as the dark band behind the business name at the top, and
`secondary_color` as the ACCENT — the "View / save your confirmation" button,
every section label, the link to your site, and, on the invoice email, that
email’s own title. And `create-business` inserts a branding row with **both
columns null**, so nobody ever has a `secondary_color` unless they went looking
for a colour picker on a screen about addresses and phone numbers.

**So a detailer who picks their colour on the colour screen changes the band at
the top of the email and nothing else.** Every button, label and link in every
email they send stays the platform’s default sky blue `#0ea5e9`.

**Two measured consequences, both taken today against the twelve presets on the
"Your colour" screen.** Neither path runs any of the correction that
`accent-sweep.mjs` enforces on every other surface — **email is the one place in
this product where a tenant colour is used with no floor at all.**

- **The business name is 20px bold white on the band.** WCAG’s large-text floor
  is 3:1. **Four of the twelve presets are under it:** Silver **1.45:1**,
  Sunflower **1.92:1**, Sky **2.77:1**, Gold **2.94:1**. Three more clear 3:1 but
  not 4.5:1 (Ember 3.56, Teal 3.74, Forest 3.77).
- **Pick "Sky" and the invoice email’s own title disappears.** `primary_color`
  becomes `#0ea5e9`; `secondary_color` is still null, so the accent falls back to
  `#0ea5e9`; the title is drawn in the accent **on** the band. **1:1. The same
  colour on itself.** Sky is the platform’s default accent and the demo
  business’s own colour.

This is the mistake DECISIONS.md’s index lists first — *"a tint of the accent is
a ground"* — in a fourth place nobody had looked, and the only one where the
sweep that exists to catch it does not reach.

**Not fixed here, and it is deliberately NOT one of the seven questions**, because
it is already answered by something you approved. Design-system law 11 says a
tenant has **one** accent. So the two pickers on Business info are not a choice
the product is offering — they are a schema column that grew a second field by
accident. The fix that follows is craft rather than a decision: **one colour,
written to both columns, with the email path getting the same contrast floor
every other surface already has, and `accent-sweep.mjs` grown to reach it.**
It lands in the build stage. **Nobody needs to ask you about it.**

**D2 — NEW. The three action buttons on a job card sat outside their own card
at 392px and at 320px.** Six pixels and eighteen pixels. It had never been seen
by anything, because the row only exists on a job card and the demo business
had never had a job on today — its own seed dated the day to tomorrow. **This
one is fixed**, because it was step 0's seed that revealed it and leaving the
layout check red would poison every later session in this item. `theme.css`,
two rules; measured after: 291px in 292px at 392, 219px in 220px at 320.
**Both are 1px of spare room and that is a real ceiling** — a longer label, or
a fourth button, breaks it again.

**D3 — NEW. Today's section headings describe time; the sections are ordered by
work.** With a real day seeded, "NEXT UP" sat over a job that finished at 4:15
PM and "LATER TODAY" over one that finished at 6:00 PM, both marked *Completed*.
The ordering is right — money not recorded outranks everything, which is the
one-light rule — but the words are wrong for it. **This is a step-4 problem,
not a bug to patch**: the labels and the ordering have to be decided together.

**D4 — NEW, and there are two things wrong with the rail. It says a finished
job has not happened, and it is not one rail.**

Counted in the running browser: **three `.dayrail` elements on one screen**, one
per section. `docs/dashboard-skeletons.md` §2 describes the signature move as
*"one continuous hairline with a node per job"* — the far end of the landing
page's thread. What ships is three hairlines that each start and fade out, so
the day reads as three runs rather than one. Nobody could see it before because
a rail with no jobs on it draws nothing.

And the node itself: The day rail's
node is hollow ("ahead") for every job drawn as a card, including a completed
one, because the "landed" class is only put on the settled rows. Meanwhile the
calendar's marks get this right and have three states. **Two components draw
the same fact differently** — a step-5 component-inventory problem.

**D5 — NEW. A paid job's rail node is your colour; the calendar's is the fixed
green.** Law 11b says money is never the tenant's colour. The calendar obeys it
(`.dot.paid` is `--ac`); the rail under the heading "Done and paid" paints the
tenant accent. Same fact, two colours, and the law names which is right.

**D7 — NEW, and it is Part B's desktop finding measured on the screen that
matters.** Part B proved there is no desktop layout using More (1,620px at 1920
against 1,626px at 392) and History (3,619px at both). It could not use Today,
because Today was empty. **Measured now, with a full day on it: Today is
1,810px tall at 1920 and 1,815px at 392 — five pixels apart across a fivefold
difference in screen width**, in a 724px column with **62% of the monitor
unused.** The screen a detailer opens forty times a day is the same height on
his own 1920 monitor as on his phone.

**D6 — carried from Part B.** The push switch (#101), the superseded travel fee
(#79), the future "last visit" (#45), the staff "Your colour" row the database
refuses, and New booking offering combinations the server rejects with a 409.

**Also carried, and it is not a screen defect: `composition.test.mjs` test 1
cannot see a card rendered through a component.** You declined the question
about it and you were right — it was never yours to rule on. It is settled at
step 5, where what counts as a list and what counts as a card gets decided
once, and the test is rewritten to match.

---

## 8. What the count means for the layout

**118 capabilities. The current dashboard reaches 98 of them.** Five tabs and
eleven settings sheets carry those 98, which is why More became a drawer: it
holds everything that did not fit the four verbs.

Three numbers worth carrying into step 4:

- **Twenty-three of the 118 are about one job** (§2a). That is the densest
  cluster in the product and it currently lives in one sheet reached from four
  places. The job record, not the day, may be the screen that most needs
  designing.
- **Thirty-seven are configuration** (§2e + §2f). That is nearly a third of the
  product, it is what a customer meets, and today it is a chevron inside a
  screen called Settings. This is the number behind Part A's "Business" tab.
- **Seven have a working back end and no working front end** (§3), and **three
  of the four things the tenant websites are missing are among them** (§5). A
  rebuild that redraws 98 rows and leaves those seven where they are has done
  the redrawing without the thinking — which is the complaint that started this
  item.

---

## 9. What I need from you

**Approve the list, and answer as many of the seven as you have an opinion
about.** A question you skip is not a blocker — I will build the specification
without the feature and say so — but each one changes what step 4 has to make
room for, and it is much cheaper to answer now than after a screen exists.

None of these is on the list yet. They are all things I would otherwise be
guessing about.

---

**Q1 — Should the dashboard have a proper first-run state?**
Right now a brand-new detailer signs up and lands on a dashboard where every
screen is empty: no jobs, no clients, no money, no services. Nothing tells them
what to do first, and the one thing they must do before anyone can book them —
put their services and hours in — is behind a chevron on the fifth tab.
**If you do it:** their first ten minutes have a path through them, and fewer
people sign up and never finish. **If you don't:** nothing breaks for anyone
who is already set up, and you keep explaining the first ten minutes yourself
to every customer you onboard. **My recommendation: yes**, but as the empty
state of the screens you already have — not a wizard. Empty states are being
designed at step 4 anyway, so it is close to free if it is decided now, and
expensive if it is decided later.

**Q2 — Do tenant websites get an FAQ page, and if so who writes it?**
Roadmap 3.1 lists FAQ as a page every tenant site gets. There is no table for
it, no column, and no screen — so today an FAQ would have to be typed into the
site's code by hand, which breaks the rule you confirmed (the front end is
custom, the content comes from the dashboard). **If you add it:** it is one
simple screen, questions and answers in a list, and every tenant site can have
one that they maintain themselves. **If you don't:** either the page goes, or
you write each client's FAQ into their site yourself and re-edit their code
every time it changes. **My recommendation: add it**, because it is the
cheapest of everything on this page and the alternative quietly makes you the
editor for every client forever.

**Q3 — Should the calendar get a week view?**
Five of the six competitor products have one; ours has a month grid and a day
sheet. A week view is the one that answers "what does the rest of this week
look like" without tapping seven days. **If you do it:** it is genuinely useful
on a desktop screen, which is being specified at step 3 anyway. **If you
don't:** the month grid plus tapping a day covers it, just with more taps.
**My recommendation: decide it at step 3, not now** — if the desktop layout
puts the month beside the selected day, a week view may turn out to be
redundant. Flagged so it is a decision rather than an omission.

**Q4 — Should Money be able to hand figures to an accountant?**
Five of six products have some form of report export. Ours shows the figures on
screen and there is no way to get them out. **If you do it:** a CSV button is a
morning's work, and at tax time it is the difference between a detailer reading
numbers off a phone and sending a file. **If you don't:** they read the numbers
off the phone. **My recommendation: yes, and keep it to a CSV of jobs and a CSV
of expenses.** Anything more is accounting software, which this is not.

**Q5 — Should a detailer be able to send a quote before there is a booking?**
Two of the six do this: the customer asks about a job, the detailer sends a
price, the customer accepts, and it becomes a booking. **If you do it:** it
covers the "someone messaged me about a full correction" case that the booking
page cannot price. **If you don't:** they quote by text and then key the
booking in themselves, which is what happens today. **My recommendation: not in
this rebuild.** It is a new object with its own states — sent, accepted,
expired — and that is a feature, not a layout. Named here so it is a deferral
rather than an oversight.

**Q6 — Should customers be able to pay a deposit when they book?**
Two of the six do. **If you do it:** it cuts no-shows, which is the thing the
trade research says detailers actually lose money to. **If you don't:** nothing
changes; the cancellation window is the only protection. **My recommendation:
not in this rebuild, and it is the one on this page I would revisit soonest.**
It needs a payment processor, which is a business decision and an account in
your name — not something I should pick for you.

**Q7 — Should a job carry before-and-after photos?**
Two of the six have inspection photos on a job. Detailing is the trade where
that is most obviously worth something — the before-and-after IS the product.
**If you do it:** it is a small addition to a screen that exists, and it feeds
the gallery and the reviews the websites want. **If you don't:** detailers keep
using their camera roll, which works and is invisible to the platform.
**My recommendation: yes, and it is the strongest of the seven** — you already
have photo upload built for the gallery, so this is mostly the job screen
finding a place to put it.

---

## 10. What happens when you answer

Steps 2 to 5 run on whatever this list says. Nothing is built until step 6,
when you approve the whole specification.

- **Step 2** — research how the individual SCREENS should work. 2.10 researched
  navigation and stopped there.
- **Step 3** — the desktop specification (your decision 6, and your word:
  *specified*).
- **Step 4** — screen by screen, every state, phone and desktop.
- **Step 5** — the component inventory, where what-is-a-list-and-what-is-a-card
  gets settled once.
- **Step 6** — you approve, then it gets built.
