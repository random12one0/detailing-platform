# Ideas — the list to go through

The fifty that came out of the testing loop on 2026-09-06, plus what has been
built since. **This file is the home of the list**; `docs/testing/REPORT.md`
points here rather than keeping a second copy, because two copies of a list
like this is how one of them goes stale and nobody knows which.

Each one names the finding or the moment that motivated it, because a list of
features written before the testing is a wish list and one written after ten
personas is evidence. **Free unless a price is written down.**

**How to use it:** tick what you want, strike what you do not. Anything ticked
becomes a roadmap item before it is built — that is the rule from
`docs/CHECKPOINT.md`, and it is the one that stops sessions inventing adjacent
work.

| | |
|---|---|
| `[ ]` | not decided |
| `[x]` | **built** — the session and date are on the line |
| `[!]` | **already existed** — it was on the list by mistake |
| `[~]` | decided yes, not built yet |
| `[-]` | he said no |

---

## The three that change a detailer's day most

- `[!]` **01 · Send the text from their own phone.** A link that opens their
  own messaging app with the message already written. No provider, no monthly
  fee, no carrier registration, no ten-digit-number approval. It is the
  biggest gap between this product and what a detailer actually does at 7am,
  and it had been costed twice and never built.
  **ALREADY BUILT, and the loop's first report was wrong to say otherwise.**
  `BookingDetail.jsx`'s `openTextPicker` opens the phone's own messaging app
  with the message pre-written, and `BookingCard` on Today has a plain
  `sms:` too. The error came from reading
  `docs/detailer-dashboard-audit-2026-09-06.md` §3.3's *recommendation* and
  not the code — the audit recommends the cheap first step and does not say
  it was then taken. **Checking a recommendation against the source is the
  cheapest possible verification and it was skipped.**
- `[ ]` **02 · The weather on the day sheet.** A mobile detailer's entire day
  is weather and the product does not know it exists. **Open-Meteo** needs no
  key and no account. Rain on a mobile job, and a one-tap "want to move this?"
  text. *Needs: nothing. A third-party call, so it is a roadmap item.*
- `[!]` **03 · The next job's address as a map link.** **Already built** —
  `mapsUrl()` in `lib/format.js`, drawn as *Navigate* on the lit job card on
  Today and again on the job record. Same mistake as 01.
  What §3.4 asks for and is genuinely NOT built is its second half: **a
  warning when two jobs are booked far apart with little gap between them**,
  at the moment of booking. That needs a distance service; noted, not built.

## Stopping a job going wrong

- `[ ]` **04 · A waitlist.** "None of these times work — tell me when one
  opens." Today they leave and the detailer never learns there was demand.
  Motivated by D8, the seasonal detailer, and by every full Saturday.
- `[ ]` **05 · A deposit on high-value work.** A ceramic coating is a whole
  day; a no-show costs the day. Nearly free once Stripe Connect is on.
  Motivated by C5.
- `[!]` **06 · "On my way" in one tap.** **Already built** — it is one of the
  presets in the text picker on the job record.
- `[ ]` **07 · A mileage log per job.** Start and end odometer, exported with
  the accountant file. Detailers deduct mileage and most reconstruct it from
  memory in April. Real money. *Needs: two columns.*
- `[ ]` **08 · The day sheet works with no signal.** They work in driveways.
  Cache today's jobs so the list is there anyway. *Needs: a service worker
  route; `app/public/sw.js` already exists for push.*
- `[ ]` **09 · Voice note on a job.** Straight into the storage that already
  holds job photos. Wet hands, gloves.
- `[ ]` **10 · Put the day in driving order.** Or just one map link with every
  stop as a waypoint — that link form needs no account at all.
- `[!]` **11 · Show the water and power answers on the job card.** **Already
  built**, and better than the idea: the job record prints *"Bring your own
  water and power"* — the decision the answer feeds, rather than the answer.
- `[ ]` **12 · A "closed for the season" mode.** Site stays up, bookings stop,
  it says when they are back. Today an empty January money screen just implies
  failure. Motivated by D8.

## Bringing the next customer

- `[ ]` **13 · Google Business Profile.** The biggest source of work in this
  trade, and the product ignores it. Push a finished-job photo as a Post, and
  keep hours in step so Google never says they are open when they are not.
  *Free API, needs an OAuth client.*
- `[ ]` **14 · Ask for the review the day the job is done.** The event already
  fires. Rotate between Google and Facebook. Costed at
  `docs/detailer-dashboard-audit-2026-09-06.md` §3.2.
- `[ ]` **15 · Local-business structured data on every tenant site.** Static,
  invisible, and it is what puts a detailer in the local map results.
- `[ ]` **16 · A generated before-and-after card**, sized for Instagram, drawn
  from two job photos. The most shareable thing a detailer makes, and today it
  lives in their camera roll.
- `[ ]` **17 · A referral link per customer.** One column, one page.
- `[ ]` **18 · Gift certificates.** A real December revenue line here, and a
  genuinely new customer every time one is redeemed.
- `[ ]` **19 · A voicemail-greeting link.** No missed-call-text-back without a
  phone number — but "I'm under a car, book me at…" as their greeting does
  most of the work for nothing.
- `[ ]` **20 · Seasonal campaign templates.** Pollen, road salt, pre-holiday.
  The machinery exists; what is missing is somebody writing the first three.

## The back office

- `[ ]` **21 · A weekly digest to you.** Who signed up, who went quiet, whose
  card failed, what broke. The email machinery exists. This is the answer to
  "find out before a detailer tells me". *Needs: a cron job.*
- `[ ]` **22 · An email quota meter.** How many of today's hundred are spent.
  Would have caught F-025, and it is the thing that breaks first. *Needs: the
  Resend API key with read scope.*
- `[ ]` **23 · A dead-man's switch on the scheduled jobs.** The heartbeats are
  already recorded; **healthchecks.io** is free for 20 checks and will text
  you when a job stops. Today a dead job is silent until a detailer notices
  their reminders stopped.
- `[ ]` **24 · Uptime monitoring.** **UptimeRobot**, free, 50 monitors at
  5-minute intervals. The landing page and one booking page.
- `[x]` **25 · An onboarding checklist per detailer, that you can see.** What
  you still owe them: the site, the domain, their photos. You are the
  constraint on every website customer and there was no list of what is
  outstanding. *(Built 2026-09-06, loop pass 008 — it is the "What they still
  need" block on the open business.)*
- `[ ]` **26 · Notes with a follow-up date.** The note field exists. A date
  turns it from a diary into a to-do. *Needs: one column.*
- `[x]` **27 · A trend arrow per detailer.** This month against last. "Is this
  working for them" was a number with nothing to compare it to.
  *(Built 2026-09-06, loop pass 008.)*

## Money

- `[ ]` **28 · Tap to Pay on the detailer's own phone**, through Stripe. No
  card reader to buy — the phone is the terminal. Taking a card in a driveway
  is exactly the case.
- `[ ]` **29 · Tips.** A line on the receipt. This trade gets tipped and there
  is nowhere to put it.
- `[ ]` **30 · An export shaped for Wave or QuickBooks.** Wave is free for
  small businesses and is what a lot of one-person operations use. The
  accountant export exists; a second column layout is small.
- `[ ]` **31 · Deposit rules per service.** A $15 wash needs none. A $1,500
  coating does. Motivated by D3.

## Things that will break next

- `[ ]` **32 · Cloudflare Turnstile on the booking page.** Free, invisible,
  and a better answer than a throttle — a throttle also refuses the real
  customer sitting behind the same office connection. Motivated by A5.
- `[ ]` **33 · Sentry.** Free at 5,000 errors a month. Already `P-07`.
- `[ ]` **34 · Nightly backups.** Already `P-05`. Two secrets.
- `[ ]` **35 · Cloudflare R2 for photos.** Already `P-02`. 10 GB free is a
  thousand times the 10 MB a detailer gets today.
- `[ ]` **36 · Address autocomplete on the booking page.** Half of a mobile
  detailer's problems are an address typed wrong. Google Places gives $200 of
  credit a month, free at this volume.

## Situations with no answer yet

- `[ ]` **37 · Ten cars, one booking.** A dealership calls (D6). Everything
  assumes one vehicle per booking.
- `[ ]` **38 · Two cars at one address.** Same customer, back to back. Common,
  and today it is two bookings with the address typed twice.
- `[ ]` **39 · A rain day.** One button: message everybody booked tomorrow,
  offer the same slot next week. Pairs with 02.
- `[ ]` **40 · A detailer who moves.** Changing the service area silently
  changes who can book — nothing warns about bookings already outside it.
- `[ ]` **41 · A staff member who leaves mid-week.** Access can be revoked;
  their assigned jobs have nowhere to go.
- `[ ]` **42 · A damage claim.** Job photos are the defence and are already
  timestamped. What is missing is a way to hand a customer the whole set for
  one job — which would also be the friendliest receipt in the trade.
- `[ ]` **43 · A customer who asks to be forgotten.** The export exists.
  Deletion is the other half of the same request and has no button.
- `[ ]` **44 · Two businesses under one login.** Detailers who buy out a
  friend, or run a mobile arm and a shop. The switcher exists; nothing has
  ever tested two.

## Bigger, and worth naming anyway

- `[ ]` **45 · A one-page print-out for the dash.** Some detailers still want
  paper. It is a stylesheet.
- `[ ]` **46 · A supplies ledger.** What a job costs in product, so profit per
  job is real rather than revenue per job.
- `[ ]` **47 · "Buy 3, get the 4th."** The shape this trade actually sells,
  and today it cannot be expressed.
- `[ ]` **48 · The booking page as a home-screen icon.** For repeat customers.
  One file.
- `[ ]` **49 · Spanish.** Not optional in this trade in most of the country.
- `[ ]` **50 · A "detailers near you" index across every site you build.**
  Each site makes the next one easier to find, and it costs one page.

---

## Added after the fifty

- `[x]` **51 · The back office, rebuilt.** Not an idea from the list — the
  owner said plainly he was not happy with it. Two columns at a desk, the
  payload's own data drawn instead of discarded, and motion. *(Built
  2026-09-06, loop pass 008. `docs/platform-admin-audit-2026-09-06.md` §6 is
  the shape it follows.)*
