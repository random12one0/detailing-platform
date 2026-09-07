# Ideas — the list, with his verdict on every line

The fifty that came out of the testing loop on 2026-09-06, plus what has been
built since. **This file is the home of the list**; `docs/testing/REPORT.md`
points here rather than keeping a second copy, because two copies of a list
like this is how one of them goes stale and nobody knows which.

**He reviewed all fifty on 2026-09-06 and gave a verdict on nearly every one.**
Those verdicts are recorded here in his own words wherever a paraphrase would
lose something. Anything he did not reach is marked as unanswered rather than
guessed at.

| | |
|---|---|
| `[ ]` | not decided |
| `[x]` | **built** — the session and date are on the line |
| `[!]` | **already existed** — it was on the list by mistake |
| `[~]` | **he said yes** — not built yet, and on the roadmap |
| `[-]` | **he said no** |
| `[?]` | **he asked what it means** — answer before deciding |

**How to use it:** anything `[~]` becomes a roadmap item before it is built —
the rule from `docs/CHECKPOINT.md`, and the one that stops sessions inventing
adjacent work.

---

## ⚠ Read this before trusting a status on this page

**This list has now misreported what is built three times, in both
directions.** It is the single most important thing to know about the file:

- The loop's first report told him **four** things were unbuilt that were built
  (01, 03, 06, 11 — testing loop F-034). The cause: an internal audit
  *recommended* them, and a recommendation was read as a status.
- Checking the source afterwards found **two more** in the same direction —
  **29 tips** and the **custom named invoice line** are both fully built.
- And **his own recollection was wrong twice in the other direction** — he
  believed **deposits per service** and **deleting a customer** already
  existed. Neither does.

**So every status on this page as of 2026-09-06 was verified by reading the
source, not by memory.** A future session that adds a line here should do the
same, and should say where it looked. `grep` is cheaper than a wrong promise to
the owner.

---

## The three that change a detailer's day most

- `[!]` **01 · Send the text from their own phone.** **Already built.**
  `BookingDetail.jsx`'s `openTextPicker` opens the phone's own messaging app
  with the message pre-written, and `BookingCard` on Today carries a plain
  `sms:` link too. He confirmed it: *"Is there not already a button that, like,
  you click on it and it has a premade message… using their already messaging
  app? I thought we already had that."* He is right.
- `[-]` **02 · The weather on the day sheet.** **He said no.** *"I feel like
  detailers could kind of figure out their schedule themselves. And I don't
  think there should be auto-blocking if it's rain or whatever."* Reconsider
  only if it turns out to be genuinely free.
- `[!]` **03 · The next job's address as a map link.** **Already built** —
  `mapsUrl()` in `lib/format.js`, drawn as *Navigate* on the lit job card on
  Today and again on the job record, and it opens whichever maps app the phone
  is set to. He said so: *"Don't we already have that too with the navigate
  button?"*
  **What is genuinely NOT built** is the other half of that audit item: a
  warning when two jobs are booked far apart with little gap between them. That
  needs a distance service, which costs money — see 40, which he declined for
  the same reason.

## Stopping a job going wrong

- `[-]` **04 · A waitlist.** **He said no.** *"Usually if a time's blocked it
  might not open. I think a waitlist is kind of… I don't think it's gonna be
  useful."*
- `[~]` **05 · A deposit on high-value work.** **He said yes** — and he
  believed it already existed: *"I thought we already set this up with
  deposits and decided that the detailer chooses if they wanted a deposit on a
  certain item, how much it should be, and all that."*
  **It does not exist.** `grep -rni deposit` over `app/src` and `supabase`
  returns zero code matches, and
  `docs/dashboard-feature-inventory-2026-08-31.md:756` records it as
  *"PARKED BY HIM, DELIBERATELY."* The shape he described is the right one:
  per service, detailer chooses which and how much.
  **Blocked on Stripe Connect (roadmap 2.20 stage 3)** — a deposit needs the
  customer to be able to pay the detailer, which the product cannot do yet.
- `[!]` **06 · "On my way" in one tap.** **Already built** as a preset in the
  text picker on the job record. *"I guess. But yeah, we could add that as a
  button for the booking"* — so the new part is putting it on the **booking
  screen** too, which is roadmap R7.
- `[~]` **07 · A mileage log per job.** **He said yes.** *"They could have a
  way to log mileage. I think that'd be cool."* Nothing exists — no odometer
  or mileage column anywhere.
- `[?]` **08 · The day sheet works with no signal.** *"I don't know what that
  means."* Answer before deciding.
- `[-]` **09 · Voice notes on a job.** **He said no.** *"They don't need voice
  notes. I'm not gonna do that."*
- `[?]` **10 · Put the day in driving order.** His answer transcribed as
  "now", which is ambiguous between "nah" and something else. **Needs one word
  from him.** Related to 03's unbuilt half and to 40, which he declined.
- `[~]` **11 · Show the water and power answers on the job card.** **He said
  yes, and explained why it changed:** *"Before I had it so they needed to
  click it, so there's no point showing me if they have water — I knew that if
  they booked, it's because they clicked it. But yeah, we should add that…
  even if someone sets it to the setting that makes it so water and power has
  to be on, you can still show it."*
  **PARTIAL today:** the job record prints *"Bring your own water and power"*
  (`BookingDetail.jsx:303`) — but **not the day-sheet row and not the owner's
  booking email**, which is the real gap.
- `[~]` **12 · Closed until I say it's open.** **He said yes** — his words for
  it: *"a button that just says closed indefinitely, or closed until I say
  it's open type of thing."*
  **PARTIAL, and the lever is in the wrong hands:** `businesses.status =
  'paused'` does darken the page, but **only the platform admin can set it**,
  and the page then 404s rather than saying when they are back. A detailer's
  only workaround today is a date-range blockout.

## Bringing the next customer

- `[~]` **13 · Google Business Profile.** **His most enthusiastic yes**, and he
  asked for more than the idea did: *"Can people link their Google Business
  Profile to our website and have it so our website could auto-update the
  Google Business Profile? If so, that would be awesome. I love the idea. So
  even when they upload photos to here, it just goes to the Google Business
  photo. If they change times here, it goes to the Google Business Profile."*
  **Two-way sync, not a one-off post.** Free API; needs an OAuth client.
  Whether the write half is achievable is a research question.
- `[~]` **14 · Ask for the review the day the job is done.** **He said yes,
  and it must be per-detailer:** *"The way I have it is there's an email that
  gets sent, and it sends them some stuff with a Google and Yelp link, because
  those are what I have. But we obviously have to make that customizable per
  every detailer."*
  He also asked what "rotating between Google and Facebook" meant — see the
  questions list.
- `[?]` **15 · Local-business structured data on every tenant site.** *"I
  don't know what that means."*
- `[-]` **16 · A generated before-and-after card.** **He said no.** *"Nah."*
- `[~]` **17 · A referral link per customer.** **He said yes, as an opt-in:**
  *"That should be an option that they can have referrals. And then if they
  choose the option, there should be a link that gets sent out to the customer
  that has their specific referral link, and they can see it in their email or
  on their booking page… that way when someone refers, it's automatically
  tracked."*
  **Note:** `customers.referral_code` existed and was **deliberately dropped**
  in `20260827001000` for having zero rows. Re-adding it is already roadmap
  4.2.
- `[ ]` **18 · Gift certificates.** **Not answered** — skipped in the review.
- `[ ]` **19 · A voicemail-greeting link.** **Not answered** — skipped in the
  review.
- `[-]` **20 · Seasonal campaign templates.** **He said no.** *"No. I mean, I
  don't know. I'm good. No."*

## The back office

- `[-]` **21 · A weekly digest to you.** **He said no** — *"I don't think I'm
  gonna need a summary of stuff. I could just see things."*
  **But the sentence after it is a live gap:** *"I'll get an email if someone
  signs up and whatnot. I hope you set that all up."* **Nothing in this product
  emails him about anything** — not a signup, not a first payment, not a
  churn, not a failed send, not a dead cron job. `create-business/index.ts` has
  zero email code. That is roadmap R2 and it is not the digest he declined.
- `[~]` **22 · An email quota meter.** **His most specific new requirement:**
  *"If we can maybe have a tracker inside my dashboard that shows me how many
  emails get sent a day, and kind of gives me warnings when we're getting
  close to that hundred a day limit — and then I'll update and say okay,
  upgrade it, and then don't give me this warning again."*
  Nothing counts sends today. See R1.
- `[~]` **23 · A dead-man's switch on the scheduled jobs.** **He said yes** —
  *"I don't know what that means, but if you think it would be good, then
  sure."* healthchecks.io, free for 20 checks.
- `[~]` **24 · Uptime monitoring.** **He said yes.** *"I guess yeah, that'll
  be good. I hope we don't have any downtime, but we could have a monitor on
  that."* UptimeRobot, free, 50 monitors.
- `[x]` **25 · An onboarding checklist per detailer.** **Built 2026-09-06,
  loop pass 008** — the *"What they still need from you"* block on the open
  business: no website built, domain added but not pointed here, no gallery
  photos. **He asked what it means** — see the questions list; it needs
  explaining, not building.
- `[?]` **26 · Notes with a follow-up date.** *"I don't know if that field
  exists."* The notes field exists as one blob; a date does not.
- `[x]` **27 · A trend arrow per detailer.** **Built 2026-09-06, loop pass
  008** — this month against last, on every row and in the open business. He
  was ambivalent: *"maybe, I don't know."*

## Money

- `[~]` **28 · Tap to Pay on the detailer's own phone.** **He said yes if it
  is free:** *"If that's free and Stripe allows that, and we could just have
  the person do tap to pay, then yeah, that'd be cool."*
- `[!]` **29 · Tips.** **Already built, and the ideas list was wrong.**
  `booking_line_items.category = 'tip'`, entered in `FinalizeModal.jsx:31`,
  rendered on the invoice (`send-invoice/index.ts:99-116`), reported on Money
  as *Tips* and *Avg tip*. **And the custom named line he asked for is built
  too** — `category = 'custom'` with a free-text label, alongside
  `travel_fee`, `upgrade` and `discount`. His description matches what exists
  exactly: *"there's a line for tips, travel fees, whatnot, and then a custom
  one where I can name whatever."*
  **What is genuinely missing is a CUSTOMER-entered tip** — today only the
  detailer records one, after the fact. That is the prerequisite for the
  advanced money view (R10), because three of its six money figures are tip
  figures.
- `[?]` **30 · An export shaped for Wave or QuickBooks.** *"I don't know. Is
  the one export we have not enough?"*
- `[~]` **31 · Deposit rules per service.** Same as 05 — **he said yes**, and
  it does not exist. Blocked on Stripe Connect.

## Things that will break next

- `[?]` **32 · Cloudflare Turnstile on the booking page.** *"I don't know what
  that means."*
- `[~]` **33 · Sentry.** **He said yes** — *"sure."* Free at 5,000 errors a
  month. Already roadmap 7.2; **he supplies the DSN.**
- `[~]` **34 · Nightly backups.** **He said yes** — *"I'd need to obviously
  get you your stuff."* Two GitHub secrets.
- `[~]` **35 · Cloudflare R2 for photos.** Already on his list. Four values in
  `.env`.
- `[~]` **36 · Address autocomplete on the booking page.** **Tentative yes** —
  *"I don't know what number 36 is, but sure."* Google Places gives $200 of
  credit a month, which at this volume is free in practice.

## Situations with no answer yet

- `[x]` **37 · 38 · Multiple cars.** **BUILT, roadmap 8.10, 2026-09-07.** **He said yes, with the most detail of
  any item.** In his words:
  *"Maybe we can have options where someone could book multiple cars at once…
  if the day allows for it. And it auto-calculates the timing — obviously it's
  not gonna be double the time of one car, because there's not gonna be the
  setup time. So have that in a setting: how many cars can someone book in one
  booking. And there should be options if someone wants to book two cars, they
  could set it for two different days without having to create two different
  bookings."*
  **And the dealership case is separate and manual:** *"If there's like ten
  cars or above the limit, that's gonna have to be done over a call with the
  dealership… we need a way that would be easy for the detailer to just log a
  ton of cars down and how much they got from it. And there shouldn't be auto
  calculations, because obviously when they do this there's discounts."*
  **WAS ABSENT structurally** — `bookings` carried singular `vehicle_size` and
  `vehicle_model`, `booking_services` has no vehicle column, and there was no
  `vehicles` table. `booking_vehicles`, `bookings.booking_group_id` and
  `bookings.bulk_vehicle_count` are what it became; three facts, kept apart.
- `[ ]` **39 · A rain-day button.** **Deferred to SMS.** *"Usually I just text
  them — 'hey, I can't do that' — personally. That's better than an email. But
  if we implement the SMS, that'd be good."*
- `[-]` **40 · A warning when a detailer changes their service area.** **He
  said no.** *"We don't have anything about what area of the service on our
  website… but from what you told me in the past, that costs money. So that's
  why I don't wanna do it."*
- `[ ]` **41 · A staff member who leaves mid-week.** **Deferred deliberately.**
  *"On our website we don't have assigned-to jobs. It's just here's the job for
  the entire website, and the detailer manages who goes to each job
  themselves… maybe that could be a setting. But that's something we have to
  build out thoroughly."*
- `[-]` **42 · A damage-claim photo set.** **Probably not.** *"I don't know if
  we need that. I think that'd be kinda hard."*
- `[~]` **43 · A customer who asks to be forgotten.** **He said yes** and
  assumed it existed: *"There should be an option where if you click on a
  customer, they just delete their info. I'm pretty sure — is that not already
  an option? I have that on my business."*
  **It is not.** No delete control in `Clients.jsx`, no endpoint. The export
  half exists; the deletion half does not.
- `[~]` **44 · Two logins at once.** **He said yes, but reshaped it:** *"Just
  keep it so it's under two different logins and they could switch between
  logins. Maybe there's an account switcher — like how on Chrome you could log
  into multiple Google accounts and switch between accounts. So it should be
  like that."*
  **Different from what exists.** `SwitchBusiness.jsx` switches between
  memberships on ONE login. His ask is two separate accounts, both signed in.

## Bigger, and worth naming anyway

- `[~]` **45 · A print stylesheet.** **He said yes** — *"maybe just having it
  so if someone presses control-P it will format correctly."* No `@media
  print` rule exists anywhere.
- `[-]` **46 · A supplies ledger.** **He said no.** *"That's gonna be too
  hard. It's hard to calculate how much product you use per job. I don't wanna
  deal with that."*
- `[~]` **47 · Buy three, get the fourth.** **He said yes**, after asking what
  it meant: *"If you mean if customers can get discounts for doing multiple
  cars — I have something like that in place, but I do it manually by saying
  'hey, this is your third car, use this promo code'. I don't have anything
  auto sent out. But we should add that. It should go in the settings page
  that they set up initially, if they want loyal customers to get free car
  washes, and then we'll have emails that get sent out automatically."*
  **ABSENT, and deliberately removed** — `customers.loyalty_reward_eligible`
  was dropped in `20260827001000` for having zero rows.
- `[?]` **48 · The booking page as a home-screen icon.** *"I don't know what
  that means."*
- `[~]` **49 · Spanish.** **He said yes, with a caution:** *"Yeah, low key,
  because a lot of detailers speak Spanish… Maybe there should be a Spanish
  option to switch all the text to Spanish. That shouldn't be too hard. Just
  make sure you don't do bad translating."* And the limit he named himself:
  *"I can't check that sadly, because I don't speak Spanish."*
  **ABSENT entirely** — no i18n library, `lang="en"` hardcoded, 20+ `"en-US"`
  call sites, every string inline.
- `[ ]` **50 · A "detailers near you" index.** **Maybe.** *"I guess, maybe."*

---

## Added after the fifty

- `[x]` **51 · The back office, rebuilt.** Not from the list — he said plainly
  he was not happy with it. Two columns at a desk, the payload's own data
  drawn instead of discarded, and motion. *(Built 2026-09-06, loop pass 008.
  `docs/platform-admin-audit-2026-09-06.md` §6 is the shape it follows.)*
- `[x]` **52 · The ground, and the rail.** He said the dashboard *"looks like a
  plain admin dashboard that AI would make, with just a plain color background
  and rectangle boxes"*. The back office had no ground at all; the detailer
  dashboard had the lights and grain but never the dot lattice; and the tab
  rail sat 334px from the content at 1920. *(Built 2026-09-06, loop pass 008.)*

---

## Where the rest of it went

Everything he asked for that was **not** on this list — the email counter, his
own login, assume-nothing at signup, the founding spot at payment, promo codes
on our own checkout, multiple cars, the advanced money view, and the research
tasks — is written up as **R1 to R13** in the roadmap, sequenced into sessions.
This file stays the list of *ideas*; the roadmap is the list of *work*.
