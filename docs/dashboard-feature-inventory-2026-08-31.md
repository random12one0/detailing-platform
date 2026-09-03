# The dashboard's complete feature inventory — 2026-08-31 (roadmap 2.11, step 1)

> **APPROVED BY THE OWNER, 2026-08-31, with one caveat and seven answers.**
> His caveat, in full, because it is instruction as much as approval: *"I kind
> of went through the specifications of each feature, but I didn't read every
> single word because there's just so many words, and I think I'd lose my mind
> reading that. But if it's just, you know, what we've already had established,
> then, you know, it's fine."*
>
> **It is what was already established.** Every one of the original 117 rows
> carries a source tag — the code, the database, his own decisions, Phase 3, or
> the six-product comparison — and nothing was invented outside §9, which is
> exactly why §9 existed. **§0a is the one-page version he should not have had
> to ask for.**
>
> **His answers are written into §9, and nine capabilities were added by them
> — §2j. The list is now 126.** Two of the nine are not this item's work and
> say so.

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

## 0a. The whole thing on one page

**You asked for this by telling me the file was too long. It is the file in one
screen; everything below is the detail behind it.**

| The dashboard has to hold | |
|---|---|
| **126 capabilities** | 117 found by looking, 9 added by your answers |
| **98 already work** | the current dashboard, unchanged |
| **7 are built and have no working screen** | reviews, monthly plans, custom domains, three social links, multi-business, and the push switch |
| **4 are on screen and broken** | the push switch, the dead travel-fee field, a "last visit" that can print a future date, and the colour problem below |
| **10 are new or newly agreed** | the setup form, the guided tour, three FAQ pieces, before-and-after photos, request-vs-reserve, accept a booking, quotes, and the export |
| **1 was ruled out** | **the week view** — your conditional yes, and step 3's answer is no, because the desktop **month** cell writes the jobs out and does the same job. §9 Q3 |

**The three numbers that decide the layout**

- **23 of them are about one job.** The densest object in the product, and it
  lives in one long scroll with no structure. Every competitor that documents
  its job screen breaks it into sections. **This is the screen most in need of
  designing.**
- **37 are configuration** — nearly a third of everything, and it is what your
  customer meets. That is the number behind the Business tab.
- **7 have no working screen at all**, and three of the four things your tenant
  websites are missing are among them.

**The one fault worth knowing about**

The screen called "Your colour" cannot change the colour your customers see in
their email. Four of your twelve colours make the business name at the top of
that email too faint to read, and picking "Sky" makes the invoice email's own
title invisible — the same colour as the band behind it. **You have said to fix
it and to make colour work everywhere; that is now settled and does not need you
again.**

**What is NOT this rebuild** — two of your eleven need the booking engine
changed, not the dashboard redrawn: **request-vs-reserve with an accept step,
and quotes** (§9 Q5), and **deposits** (§9 Q6), which you have parked until you
reach payments. Both are listed anyway, because the screens have to be designed
knowing they are coming rather than have them bolted on afterwards.

---

## 0. The short version, in plain words

Think of the dashboard as a shop's back office. Before anyone decides where the
desk goes and which drawer holds what, somebody has to walk the room and write
down everything that has to live in it — including the boxes still in the van,
and the shelf that was ordered and never arrived.

That walk is done. **The room has to hold 126 things** — 117 found by walking
it, and nine more that your answers of 2026-08-31 added. The tables at §2
count them exactly:

| | |
|---|---|
| **98** | are in the room and working |
| **6** | are things **you** have already said come back |
| **6** | are built into the walls with **no door on them at all** — the database and the server do the work and no screen anywhere reaches them |
| **4** | are in the room and **broken**: a switch or a field that is on the screen and does not do what it says |
| **1** | is Phase 3 work that has nothing behind it yet |
| **9** | were added by your answers — §2j. **Three of the original 117 were questions and all three are now answered**, so nothing on this list is waiting on you |

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
on it, it **was** in §9 as a question rather than smuggled into the table — and
**§9 is now answered in full.** The eleven rows those answers added are kept
separate at §2j, so what was found and what was asked for never blur together.

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
`Phase 3` · `new` (agreed 2026-08-31, not built) · `conditional` (agreed only
if it can be made good — there is exactly one).

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
| 31 | See a week rather than a month | e + o | ~~conditional~~ **NOT SHIPPING** | Nowhere — §9 Q3. **Ruled NO by step 3**, and the month cell is what replaces it. `dashboard-desktop-spec-2026-08-31.md` §7 |

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
| 40 | Export or send the figures to an accountant | e + o | **BUILT 2026-09-01, roadmap 2.11 step 6 stage 4** | Money — one button under the period control. A flat CSV ledger of the chosen period: a row per completed job, a row per expense (negative), and a Net row that equals the figure on the screen. `lib/accountant-export.js`, pinned by `tests/money-export.test.mjs`. |

### 2d. Customers

| # | Capability | Src | Status | Where it lives now |
|---|---|---|---|---|
| 41 | Look a customer up by name | a | works | Clients — the search field, unchanged, still one database read per keystroke |
| 42 | See one customer's contact details and act on them | a | works | Client record — Call, and the email address as its own button. The phone number is printed ONCE (2026-09-02, stage 5) |
| 43 | Keep a private note about a customer | a | works | Client record → `customers.notes` |
| 44 | See everything a customer has ever booked | a | works | Client record — *date · what · total*, 50 most recent, **and the cap is stated** (2026-09-02) |
| 45 | See when a customer was last in | a | **FIXED 2026-09-02, roadmap 2.11 step 6 stage 5** | On the LIST as well as in the record, as *"3 weeks ago"*. The most recent completed job that has already ENDED — the read filters `end_at <= now`, so nothing finished is ever printed in the future (Part B #6) |
| 46 | See what a customer has spent in total | a | works | **On the list too as of 2026-09-02**, not the record only. Owner sees spend, staff see visits, same column |
| 47 | Sort or filter clients — last visit, lifetime value, not seen in N months | c | **BUILT 2026-09-02, roadmap 2.11 step 6 stage 5** | Clients — a segmented control of three (Recent · Most spent · Longest away), absent below three rows, and one chip (*Not seen in 3 months*). Manual only, which is decision 3 |
| 48 | Text a group of past customers to fill a slow week | c | **BUILT 2026-09-02, roadmap 2.11 step 6 stage 5** | Clients — with the chip on, the list offers *"Text these N"*, an `sms:` link carrying the filtered numbers. It opens the phone's own messages app; this product does not send texts and is not going to |

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
| 92 | Link Facebook, TikTok, YouTube | b | ~~**no screen**~~ **BUILT 2026-09-02** | Business info, paired beside Instagram. The columns had been on `business_branding` since the first tenant migration |
| 93 | Point customers at your Google and Yelp review pages | a | works | Business info |
| 94 | Show photos of your work | a | works | Gallery |
| 95 | Share your booking link — copy, open, share sheet | a | works | **The TOP of Business**, and the second column’s resting content at a desk. It was 1,156px down (Part B row 16) |
| 96 | Collect and show reviews | b + d | ~~**no screen**~~ **COLLECTING BUILT 2026-09-02; SHOWING IS PHASE 3** | `screens/more/Reviews.jsx` — add, edit, hide, delete. The booking page reads them into its context and does not DRAW them; the tenant websites are where they were always going, and the screen says so in its own words |
| 97 | Use your own domain name | b + d | **no screen** | Table `business_domains` exists; roadmap 3.3 |
| 98 | Edit the pages of your website — home, about, FAQ, contact | d | Phase 3 | Nowhere. Roadmap 3.1 decides the page list |
| 99 | See how many people visited and where from | b | **no screen** | `campaigns` + `campaign_visits` + `track-visit`, all unreachable. **Deliberately unplaced** — architecture doc §6 |

### 2h. How the app behaves for you

| # | Capability | Src | Status | Where it lives now |
|---|---|---|---|---|
| 100 | Choose which emails go out, to customers and to you | a | works | Notifications |
| 101 | Get a push notification on your phone | a + b | ~~**broken**~~ **WORKS 2026-09-02, confirmed on a real device by the owner** | `app/public/sw.js` + `lib/push.js`; the switch reads THIS DEVICE’s registration rather than the saved boolean. The VAPID secrets were missing from the project too and are set now — **`sendOwnerPush` had been silently skipping for the whole life of the feature**, which is where to look first if it ever goes quiet |
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

### 2j. Added by his answers of 2026-08-31

Nine. **None of these is my idea** — each one is an answer he gave to §9, and
the wording of the row follows what he actually asked for rather than what was
proposed to him. Source tag **(o)**: the owner, 2026-08-31.

**Two of his answers did not need a new row** — the week view and the export
were already rows 31 and 40, sitting as open questions, and they are now marked
answered where they already lived. **His first-run answer replaced a row rather
than adding one:** the old row 118 asked whether there should be a first-run
state at all, and rows 118 and 119 below are the two concrete things he asked
for instead.

| # | Capability | Src | Status | Belongs with | Note |
|---|---|---|---|---|---|
| 118 | A setup form a new detailer runs through that collects everything the booking page needs to work — hours, services, add-ons, promo codes, business info, booking rules | o | **new** | Getting started | **Skippable, and resumable later** — his words |
| 119 | A guided walkthrough of the dashboard, highlighting one thing at a time | o | **new** | Getting started | **Many short steps, no paragraphs, nothing combined** — his constraint, quoted at §9 Q1 |
| 120 | Turn an FAQ page on or off for this business | o | **new** — **storage landed 2026-09-02** (`business_settings.faq_enabled`), screen deliberately later | What your page says | **Optional, never a default** |
| 121 | Write the FAQ — the detailer’s own questions and answers | o | **new** — **storage landed 2026-09-02** (`business_settings.faqs`), screen deliberately later | What your page says | The detailer writes it; **they are the detailer** |
| 122 | Improve the wording of what they wrote | o | **new** | What your page says | His idea, and explicitly polish only — the answers stay theirs |
| 123 | Choose whether a booking RESERVES the slot or is a REQUEST to be accepted | o | **new, engine** | When you can be booked | **Not this item.** §9 Q5 |
| 124 | Accept or decline a request, from the screen the day lives on | o | **new, engine** | The day, and one job | **Not this item.** §9 Q5 |
| 125 | Send a quote to a customer | o | **new, engine** | The day, and one job | **Not this item.** §9 Q5 |
| 126 | Before-and-after photos on a job | o | **new** | The day, and one job | Storage is answered — §9 Q7 |

**Rows 123–125 change the booking engine and the schema, which roadmap 2.11
explicitly does not reopen.** They are on the list anyway, and the reason is his
own instruction: *you cannot lay out a dashboard around features you have not
listed.* **Step 4 designs the screens knowing these are coming.** The engine
work is its own roadmap item.

**Deposits (§9 Q6) are deliberately NOT a row.** He parked them — *"that might
be a later kind of decision because payment and whatever, I may get to later."*
Nothing is designed around them; the only obligation on step 4 is not to paint
into a corner that makes them impossible.

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

**126 capabilities. The current dashboard reaches 98 of them.** Five tabs and
eleven settings sheets carry those 98, which is why More became a drawer: it
holds everything that did not fit the four verbs.

Three numbers worth carrying into step 4:

- **Twenty-three of them are about one job** (§2a), and his answers add three
  more to that object — accept, quote, before-and-after photos — taking it to
  **twenty-six.** That is the densest
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

## 9. The seven questions — ALL ANSWERED, 2026-08-31

He answered every one the same day, and **three of them he answered bigger than
they were asked.** His words are quoted because in two places the wording is the
requirement.

**And one thing that was never a question got an answer too.** On the email
colour defect (§7 D1) he said: *"yes, we should work on the emails and other
places where colors should apply. We should have it work and adapt based off of
what color the detailer chooses."* That is the fix already recorded as craft —
one colour, everywhere, adapted for legibility — now with his explicit
go-ahead. **`accent-sweep.mjs` grows to cover the email path in the same
change**, or it is a floor that exists on paper.

---

### Q1 — A proper first-run state? **YES, and it is TWO things, not one.**

> *"There should be, like, a sign up form or something that basically gets them
> to put in all of their information about the business that needs for the site
> to function. So like you said, there are times, there are hours, you know,
> what their services are, any promo codes that they want. Basically, anything
> that's within the settings… they could, like, skip stuff or enter it later."*

> *"Then, also, there should be a kind of guide that walks them through the
> entire website… if it's, like, those guides that highlight the thing and has a
> little blah blah text on that. Just if we do create that, just make sure to
> kinda not have paragraphs of text and for there to be more steps and not try
> to combine any things into one step. Just put some thought through into that
> if we do the guide."*

**Rows 118 and 119.** The recommendation was "empty states, not a wizard" and
**he overruled it**: he wants the form. Two separate things, and they should not
be built as one:

- **A setup form** covering everything in Settings that the booking page needs
  to function. **Skippable per item and resumable** — that is what stops it
  being the wizard the recommendation was afraid of.
- **A walkthrough of the dashboard**, highlight-plus-a-line. **His three
  constraints are the specification and they are not stylistic:** no paragraphs;
  **more** steps rather than fewer; **never combine two things into one step.**
  A guide that breaks those is worse than no guide, and he said so before it
  existed.

### Q2 — An FAQ page? **YES, as an option and never a default.**

> *"They could have an option for FAQ page. Now might not be a default, but I
> always ask the detailer, hey, do you wanna have the FAQ page? And then they
> would write it… And we could obviously improve what they wrote with AI or
> whatever to get it nice, but they would obviously have to answer the questions
> because, you know, they're the detailer."*

**Rows 120, 121 and 122.** Three separate capabilities, and the split matters:
turning the page on, writing the content, and improving the wording. **The
answers stay the detailer's** — improvement is polish, never authorship. He is
right about why: only the detailer knows what customers actually ask them.

### Q3 — A week view? **YES, CONDITIONALLY — and the condition is real.**

> *"I guess we could have a week view, but I don't know how it generally work.
> If you could find a way to have a week view that's, you know, convenient and
> doesn't make it a burden, then sure."*

**Row 31, which already existed as this question and was the only
`conditional` row on the list.** He did not say build it; he said build it
**if it can be made good**. Step 3 tried it against the desktop layout, and
**a conditional yes treated as a yes is how features nobody wanted get built.**

> ### **STEP 3 RULED: NO. 2026-08-31.**
>
> The full reasoning is `docs/dashboard-desktop-spec-2026-08-31.md` §7. In
> short: a week view is a seven-column time grid, and at 356px of phone content
> that is **51px a column** — it cannot carry a name or a time, so it would be
> a desk-only mode, which is the burden he asked me to avoid. It is also a
> second grid on the only screen that is a grid (law 1), and the demo's month —
> built in step 0 to be realistic — holds **9 jobs across 5 days**, which is
> one or two jobs drawn into a 70-cell grid.
>
> **What replaces it is the reason the answer is not just "no".** At the
> desktop content width a **month** cell is 163px wide and 112px tall — room to
> write `9:00 Tom O.` three times over instead of drawing a dot. **A month that
> writes its jobs out is a week view five times over**, with no third mode, no
> new skeleton, and nothing changed on the phone.
>
> **What would overturn it:** a detailer dense enough that three lines and
> "+2 more" stops being enough — a shop with a crew, not a solo mobile
> detailer. Written down so this is a no with its condition attached, not a
> quiet drop.

### Q4 — An export for the accountant? **YES.**

> *"Yeah. We could do an export of some kind… that would be a nice feature to
> have."*

**Row 40**, which already existed as this question. Jobs and expenses. Nothing more — anything beyond that is
accounting software, which this is not.

### Q5 — Quotes before a booking? **HE ANSWERED A BIGGER QUESTION, AND IT IS THE MOST CONSEQUENTIAL ANSWER IN THIS FILE.**

> *"I think that kind of brings up a whole new kind of opinion. I think there
> should be kind of a switch. Like, basically, when someone books through the
> website, is it done booking, you know, putting a request, or is it just like a
> ‘hey, I want to book this time'? Because how I have it is, like, basically,
> when you book, yeah, you're pretty confident that's gonna be your day… you've
> reserved a time slot. Whereas other detailers might want it that they just put
> in a request, and nothing is reserved to them. It's just a request that they
> have to accept."*

> *"And maybe we can even have an accept page, or that same page — or the Today
> page, even though it might change in the future — but the page that the
> detailer uses their bookings on, it could be, like, ‘accept this booking'. And
> then they can also send quotes, to have that option. Obviously that's quite a
> bit of work, but that's probably something a detailer would want to have an
> option for."*

**Rows 123, 124 and 125.** The recommendation was "not in this rebuild" and
**he replaced the question with a better one.** Quotes were the small half; the
big half is that **this product currently assumes one booking model and other
detailers work the other way.** Reserve-on-booking is a choice Andrew's business
makes, and it is currently baked in for everybody.

**This is engine and schema work, and roadmap 2.11 does not reopen either.** It
needs a per-business setting, a booking that is held rather than confirmed, and
an accept/decline path. **So it is a separate roadmap item.**

> ### **HE CLARIFIED THIS ON 2026-08-31, AND IT MADE THE ITEM SMALLER.**
>
> > *"I didn't mean that if they choose to approve bookings… some could book two
> > of the same slots. So someone sends a request, it will take up that time
> > slot. But there should be a version they could choose of either: if someone
> > books, it's like, yeah, they booked for that time, we're gonna do our best
> > to make it to that time — while [in] a request it was like, hey, this is
> > when [I want it], and it's like, okay, I have to approve it. You've not
> > really guaranteed it. Obviously neither is gonna be a hundred percent
> > guaranteed, but one is just a little bit more guaranteed than the other."*
>
> **A request holds the slot.** Two customers cannot request the same time. The
> difference between the modes is **the promise made to the customer**, not the
> mechanics of the calendar. **Availability behaves identically in both.**
>
> That deletes what roadmap 2.12 had called its hard part — "in request mode a
> slot is not taken, so two requests can want the same time, which the exclusion
> constraint currently forbids." **The constraint stays exactly as it is.** What
> is left is a setting, a status, an accept/decline action, and different
> wording on the customer's page and email.
> Full note: `docs/dashboard-desktop-spec-2026-08-31.md` §8.

**But it changes step 4 anyway, and that is the point of having listed it.** He
named where the accept action goes — *"the page that the detailer uses their
bookings on"* — so the day screen is being designed with an accept state in it
rather than having one added later. **That is the whole argument for step 1
existing: a screen designed around a feature you have not listed gets it bolted
on.**

### Q6 — Deposits at booking? **PARKED BY HIM, DELIBERATELY.**

> *"I guess we could have a feature where they pay me first for the deposit, but
> then it goes… since I have the detailer's card on file since they paid me,
> then it will just pay them, route it through them. I don't know if that's
> possible. If it's too high, we might leave it out. But that might be a later
> kind of decision because payment and whatever, I may get to later."*

**Not a row.** He parked it and that is respected — nothing gets designed
around it. **Two things he should know when he picks it up, and neither needs an
answer now:**

- **The routing he described is possible and is the normal way this is done**,
  but not by holding the money himself. Stripe Connect (and its equivalents) let
  a platform take a customer's payment straight into the detailer's own account
  and keep a fee, **without the platform ever holding the funds** — which is
  what keeps him out of being a money transmitter. That is the version to price
  when he gets there.
- **Deposits are the strongest answer to no-shows**, which the trade research
  names as the recurring loss. That is the reason to come back to it, not the
  payment plumbing.

### Q7 — Before-and-after photos on a job? **HIS ONLY WORRY IS STORAGE, AND IT IS ANSWERED.**

> *"So you're basically saying that you can link specific bookings to photos. I
> don't know where we would store the photos, because I don't wanna have a huge
> database because I don't wanna store their photos on my end."*

**Row 126, and the worry does not survive the numbers.**

**You already store their photos.** Every gallery image a detailer uploads goes
into a Supabase storage bucket called `business-media`, in a folder named after
their business, with a 10 MB-per-file cap — built in Phase 2 and live today.
**Before-and-after photos are the same mechanism pointed at a booking instead of
a gallery.** There is no new kind of storage and no new kind of exposure.

**The volume, measured against a busy detailer.** A before and an after,
compressed, is about 1.6 MB a job. Five jobs a day, six days a week, is roughly
1,560 jobs a year — **about 2.5 GB per detailer per year.** The Supabase Pro
plan includes **100 GB**, and beyond that it is **$0.0213 per GB per month**
(checked 2026-08-31). **Ten detailers fill about a quarter of the included
storage in their first year**, and if it ever ran over, another 100 GB costs
about **$2.13 a month.**

**So the honest answer is: it costs nothing worth thinking about, and the
feature pays for itself twice** — it is the proof a detailer sends a customer,
and it is the raw material for the gallery and the reviews his tenant websites
need. **Two cheap safeguards if he still wants them:** make it per-detailer
opt-in, and age photos out after a set number of months.

---


## 10. What happens now that you have answered

**Steps 0, 1 and 2 are done and this list is approved. Steps 3, 4 and 5 run on
it, and nothing is built until step 6, when you approve the whole
specification.**

- ~~**Step 2** — research how the individual SCREENS should work.~~ **DONE** —
  `docs/dashboard-screen-research-2026-08-31.md`, fourteen findings.
- **Step 3** — the desktop specification (your decision 6, and your word:
  *specified*). It also has to try the week view and rule on it (row 124), and
  grow `scripts/sweep-widths.mjs` to the desktop widths in the same item.
- **Step 4** — screen by screen, every state, phone and desktop. **It now has
  to make room for the accept step and the setup flow**, which it would not have
  known about a day ago.
- **Step 5** — the component inventory, where what-is-a-list-and-what-is-a-card
  gets settled once.
- **Step 6** — you approve, then it gets built.

**Three things this list sends OUTSIDE 2.11**, so they do not get lost by being
someone else's problem:

| What | Why it is not this item | Where it goes |
|---|---|---|
| Request-vs-reserve, accept/decline, quotes (rows 123–125) | Engine and schema, which 2.11 does not reopen | Its own roadmap item. **Step 4 still designs the screens for it** |
| The colour fix — one colour everywhere, including email, with a floor | A defect, and it touches email templates rather than the dashboard | The build stage, with `accent-sweep.mjs` grown to reach email |
| Deposits | You parked them until you reach payments | Revisited when you do. Nothing is designed around them |
