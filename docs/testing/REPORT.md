# The testing loop — report

One lap of `docs/testing/LOOP.md`, 2026-09-06. Six passes: a brand-new
detailer, the owner's back office, the adversary, the customer on a bad
connection, the code's own failure paths, and the one §5 calls mandatory —
two detailers signed in at once, in two browsers.

**Thirty-three findings. Nineteen fixed in the pass that found them. Eight
blocks-launch defects, seven of which were invisible from every screen in the
product and from every check in the repo.**

`docs/testing/FINDINGS.md` is the catalogue and has the reproduction for each.
This file is the summary, and the first section is the one to read.

---

## 1. What is left for you, and exactly what unblocks it

Nothing here can be done from this side. Each is a sentence you can answer
with one thumb.

### The two that cost money if they wait

**P-13 · The email ceiling.** Right now the whole platform can send **100
emails a day, shared between every detailer**, and one booking spends about
five of them — confirmation, your alert, the reminder, the evening-before, the
receipt. That is **about twenty bookings a day across everybody** before
confirmations simply stop going out. Four detailers doing five jobs a day
reach it. On the day it happens nobody gets an error; customers just do not
get their emails, and it looks like the booking page is broken.

*What unblocks it:* Resend's paid plan — **$20 a month for 50,000 emails**.
My recommendation is to switch before the third detailer signs up rather than
after, because this is the one limit that fails on a good day, and it is the
cheapest line in the product.

**P-09 · A founding spot is taken at signup, not at payment.** There are three
spots. Today, three people who sign up and never pay use all three, the
landing page stops advertising the offer, and nothing tells you. *What
unblocks it:* your call between "claim at signup" (today) and "claim at first
payment, holding the spot for 14 days so the price they were shown is the
price they get". I recommend the second.

### The one about your own account

**P-12 · There is a live all-access back-office login on the launched
platform.** `demo-admin@detailplatform.com` sits in `platform_admins` and its
own note says *"Seeded for verification — delete before launch"*. The platform
launched today. The password is random and exists only in a file that is not
in git, so the real risk is low — but it is a standing key to every detailer's
data that nothing expires. *What unblocks it:* say the word and I delete the
row; `node scripts/seed-demo.mjs --platform-admin` makes a fresh one whenever
a test needs it.

### The three that are about your taste, not your keys

**P-10 · What should a brand-new business default to — mobile only, drop-off
only, or both?** Today it is both, so a mobile-only detailer who skips one
setup step has a page inviting customers to drive to an address that does not
exist. I recommend **mobile only**: it is the trade's default shape and yours,
and a detailer who does drop-off will say so, whereas a mobile-only detailer
will not find out until somebody turns up.

**P-08 · Do you want individual customer names and numbers on the back
office?** (Carried in.) The screen deliberately stops at counts today.

**P-06 · Two or three detailer websites whose look you like.** (Carried in.)

### Carried in, unchanged

`P-01` legacy migration keys · `P-02` Cloudflare R2 · `P-03` the Resend key
for password-reset emails · `P-04` Stripe Connect · `P-05` two GitHub secrets
for backups · `P-07` a Sentry DSN · `P-11` whether back-office month figures
should follow each detailer's own timezone.

---

## 2. What was fixed, by who found it

### A brand-new detailer (pass 001)

- **Pressing Continue on the hours step destroyed the detailer's real hours.**
  The form opened on a hardcoded Mon–Fri 9–5 whatever they had set, and
  Continue wrote it over the top. Set Tue–Sat 8–6, come back a week later to
  finish setting up, press the obvious button, and your booking page starts
  selling times you cannot work and refusing the days you can. Nothing said
  so. *(F-001)*
- **Continue marked a question answered when nothing was on screen.** Seven
  taps of the primary button reported *7 of 7 done* on a business with no
  hours of its own, no phone number and no answer to where the work happens —
  and that number is what your back office reads. It is the *"2 of 7 on a new
  business"* defect you found, inverted. *(F-002)*
- **A detailer who chose a paid plan never saw the payment screen.** They are
  sent to it, and the first-run form renders over it with the tour over that.
  Close both and you are on the dashboard, never subscribed, with nothing on
  any screen saying so — the only billing warnings are for a card that
  *failed*, and there is no word for "never started". *(F-003)*
- The booking page's *"Check everything over"* step now shows the name, phone,
  email and vehicle. It showed none of them, which is four of the six fields
  most likely to be mistyped and both of the two that decide whether the
  confirmation ever arrives. *(F-007)*
- The hours step now opens on the hours that are actually set, so a detailer
  can see that weekends are closed before they walk past it. *(F-005)*

### Your back office (pass 002)

- **It could not tell a test business from a real detailer.** The headline
  read **"Detailers 15"** when the true number was zero, and *Needs a look* —
  the one list on the screen whose whole job is to be short — was eight rows
  of test fixtures. Every figure now counts real detailers, demos are tagged,
  and the test suites mark their own leftovers. *(F-014)*
- Clicking a detailer opened their panel below the entire list, so at fifteen
  tenants it was off the bottom of the screen and pressing a name looked like
  it did nothing. *(F-015)*
- *"0 jobs this month"* sat beside *"30 bookings, last today"*. Both were
  right — one counts finished work — and together they read as a broken
  number. The label says what it counts now. *(F-016)*
- *"10 MB each for 15 detailers · 154 MB promised"*. 10 × 15 is 150. Two
  roundings of the same sum, printed side by side. *(F-017)*
- Month figures had a start and no end, so a completed job dated next month
  counted as this month's takings. *(F-018)*
- The deployed back-office function was **older than the code** — the same
  class of defect the loop was written against, present on the day it
  started. All 28 functions are current now. *(F-020)*
- The signed-out `/admin` door was an unlabelled "Sign in" card in the corner
  of an empty page. It says what it is. *(F-021)*
- "1 services". *(F-008)*

### The customer on a bad connection (pass 004)

- **A dropped reply made a real booking look failed, and the retry told the
  customer a stranger had taken their slot.** The booking is written, the
  reply is lost, the page shows an error, they press Confirm again — and
  collide with the booking they just made. They either book a second time
  (two slots gone, one morning wasted) or walk away from a job that is on
  your calendar and will be waited for. It now recognises the retry and hands
  back the booking they already have. *(F-022)*
- A raw database error was being shown to strangers on the public booking
  page. *(F-023)*
- If a booking's service lines failed to save, nothing noticed — the booking
  exists, the slot is held, you see the job, and the first person to find out
  is the customer reading a receipt with a total and no lines. *(F-024)*

### The code, not the screens (pass 005)

- **Our own daily email cap was marking real customers as bounced,
  permanently.** Any rejection under a 500 was treated as "this address is
  wrong" — and running out of the day's 100 emails comes back as a 429, which
  is under 500. So every customer emailed after the cap was flagged
  unreachable for ever, on the busiest days, and campaigns then filter them
  out. *(F-025)*
- **A failed membership insert locked somebody out of their own business for
  ever.** The business existed holding their name and their web address, they
  were not a member of it, and the app sent them straight back to the create
  form — which then refused the name as taken, by them, invisibly. No screen
  could show it and no button could undo it. *(F-026)*

### Two detailers at once (pass 006)

- **The fixture for the one pass `LOOP.md` calls mandatory could not produce
  the state it requires.** `seed-two-tenants.mjs` makes two businesses and
  **no logins**, so "sign in as A and B in two browsers" was not possible.
  That is most of why the pass had never been run. *(F-031)*

---

## 3. What was found and deliberately not fixed

| | Why |
|---|---|
| `/pricing` shows list prices for a second before the founding prices land *(F-009)* | The honest fix is a rework of that page's loading state, not a patch |
| The first price quote on a cold booking page took over five seconds *(F-010)* | Needs measuring against the deployed function, not a dev server |
| Signup completes with no email verification *(F-011)* | A Supabase setting, and it compounds `P-03` |
| Promo code is setup step 3 of 7, ahead of hours and contact details *(F-012)* | Reordering overrules a documented decision |
| The signup screen does not show the plan just chosen *(F-013)* | It reappears on the very next screen; cosmetic |
| Back-office month figures use UTC boundaries *(F-018, half)* | `P-11` — a bigger change than it looks |
| A manual reminder can send twice if its marker fails to save *(F-029)* | One duplicate email, no data loss |
| The back office reads whole tables and joins in memory *(F-030)* | Correct and documented today; written down so the number exists — 100 detailers × 500 bookings is one request carrying 50,000 rows |
| The two-tenant fixture is thin *(F-033)* | The script refuses to run with no markers; seeding it properly is a roadmap item |

Two findings are marked `not-a-defect` and kept for the reasoning: the public
functions a customer reaches without a session *(F-027)*, and a leak this
loop's own check reported on a page that was behaving perfectly *(F-032)*.

---

## 4. What is verified, with the numbers that were printed

- **31 test suites green**, including the three sections written this lap:
  `setup-progress` 54 (was 47), `attention` 32 (was 27), `platform-admin` 79
  (was 65), `booking-engine` 104 (was 95), `platform-billing` 284 (was 283).
- **Every new check was baselined by breaking what it guards** — 6 of 7 in
  `setup-progress` § 6, 2 of 5 in `attention` § 8, 5 of 14 in `platform-admin`
  § 11, 6 of 9 in `booking-engine` § 18, and the one added to
  `platform-billing`. One (`6e`) is a negative guard and cannot be baselined
  that way; it is marked as such.
- **`scripts/adversary-probe.mjs` — 50 checks, all green.** Twelve gated edge
  functions refuse an anonymous caller and none of the refusals leaks a stack
  frame, a source path, a SQL fragment or the name of the gate. Fourteen
  tables queried straight at the database with the public key a browser
  already has return nothing.
- **`scripts/two-detailers.mjs` — 25 checks, all green.** Nothing of one
  detailer ever reached the other, in either direction, on any tab, after a
  write, after a reload, on either public page, or on the signed-out page.
- **Booking steps fit at 1920, 1440, 768 and 392.** The review step went from
  39px of spare room to 55px after the new block was folded into the card
  above it rather than given one of its own.
- **All 28 edge functions current** with the repo.
- 25 emails rendered, accent sweep clean, width sweep clean.

---

## 5. The ideas

This comes last on purpose. Written after ten personas rather than before
them, so each one names the finding or the moment that motivated it. Anything
with a price has the price beside it. Free tier only unless it says otherwise.

### 5a. The three that are nearly free and change the daily loop most

1. **Send the text from the detailer's own phone.** An `sms:` link with the
   message already written. No provider, no monthly fee, no carrier
   registration, no ten-digit-number approval. *Cost: nothing.* This is
   already costed in `docs/detailer-dashboard-audit-2026-09-06.md` §3.3 and
   still not built, and it is the single largest gap between this product and
   what a detailer does at 7am.
2. **The weather on the day sheet.** A mobile detailer's entire day is
   weather, and the product does not know it exists. **Open-Meteo** needs no
   key, no account and no attribution and is free for non-commercial and
   low-volume use. Rain forecast on a mobile job → an "offer to move this"
   button that opens the reschedule link in a text.
   *Cost: nothing. No signup.*
3. **The next job's address as a map link.** One anchor —
   `https://www.google.com/maps/dir/?api=1&destination=…` works on every
   phone. *Cost: nothing.* Also already costed and not built.

### 5b. Things that stop a job going wrong

4. **A waitlist.** "None of these times work — tell me when something opens."
   Today a customer who finds nothing simply leaves, and the detailer never
   learns there was demand. Motivated by D8 (the seasonal detailer with six
   empty weeks) and by every fully-booked Saturday.
5. **A deposit on high-value work.** A ceramic coating is a day of a
   detailer's life; a no-show costs them the day. Stripe already being wired
   in makes this nearly free to add. Motivated by C5.
6. **"On my way" in one tap** — the same `sms:` mechanism as (1). The single
   most-sent message in this trade.
7. **A mileage log per job.** Start and end odometer, exported with the
   accountant file. Detailers deduct mileage and most of them reconstruct it
   from memory in April. *Cost: nothing*, and it is real money to them.
8. **Offline day sheet.** They work in driveways. A service worker caching
   today's jobs means the list is there with no signal. *Cost: nothing.*
9. **Voice note on a job.** Browser `MediaRecorder` into the storage that
   already holds job photos. Detailers have wet hands and gloves.
10. **Route the day.** Sort today's jobs by drive time, or just offer one
    Google Maps link with every stop as a waypoint — that URL form is free
    and needs no API key.
11. **Surface the water/power answers on the job card.** The booking already
    asks; a detailer who does not see it before loading the van finds out in
    the driveway. Motivated by C3.
12. **A "closed for the season" mode.** Keeps the site up, stops taking
    bookings, says when they are back. Motivated by D8, whose empty money
    screen currently implies failure.

### 5c. Things that bring the next customer

13. **Google Business Profile is the biggest lead source in this trade and the
    product ignores it.** The API is free. Two uses: push a finished-job photo
    as a Post, and keep hours in step with the booking page so Google never
    tells somebody they are open when they are not.
14. **The review ask, the day a job is marked complete.** The event already
    fires. Rotate between Google and Facebook. Nearly free, and already
    costed at §3.2 of the same audit.
15. **`LocalBusiness` and `Service` structured data on every tenant site.**
    Free, static, and it is what puts a detailer in the local pack.
16. **A generated before/after card**, sized for Instagram, drawn server-side
    from two job photos. The most shareable thing a detailer makes, and today
    it lives in their camera roll.
17. **A referral link per customer.** One column, one page.
18. **Gift certificates.** A real December revenue line for this trade and a
    genuinely new customer every time one is redeemed.
19. **A voicemail-greeting link.** No missed-call-text-back without a phone
    number — but "I'm under a car, book me at ridgeline.com/book" as their
    greeting costs nothing and does most of the work.
20. **Seasonal campaign templates** — pollen, road salt, pre-holiday. The
    campaign machinery exists; what is missing is somebody to write the
    first three.

### 5d. Your back office

21. **A weekly digest to you.** Who signed up, who went quiet, whose card
    failed, what broke. The email machinery already exists. It is the answer
    to O6 — *find out something broke before a detailer tells you*.
22. **An email quota meter.** How many of today's 100 are spent. This would
    have caught F-025 and it is the thing that will break first. *(F-028.)*
23. **A dead-man's switch on the scheduled jobs.** `job_heartbeats` already
    records the last run; **healthchecks.io** is free for 20 checks and will
    text or email you when a job stops. Today a job that dies is silent until
    a detailer notices their reminders stopped.
24. **Uptime monitoring.** **UptimeRobot** free tier is 50 monitors at 5-minute
    intervals. Point it at the landing page and at one booking page.
25. **A per-detailer onboarding checklist you can see** — what you still owe
    them: the website, the domain, their photos. You are the constraint on
    every website-plan customer and there is no list of what is outstanding.
26. **Notes with a follow-up date.** The notes field exists; a date turns it
    into a to-do rather than a diary.
27. **A trend arrow per detailer.** Bookings this month against last. "Is this
    working for them" is currently a number with nothing to compare it to.

### 5e. Money

28. **Tap to Pay on the detailer's own phone**, through Stripe. No card
    reader to buy, no hardware at all — the phone is the terminal. A mobile
    detailer taking a card in a driveway is the exact case.
29. **Tips.** A line on the receipt. This trade gets tipped and the product
    has nowhere to put it.
30. **A Wave / QuickBooks-shaped export.** Wave is free for small businesses
    and is what a lot of one-person operations actually use. The accountant
    export exists; a second column layout is small.
31. **Per-service deposit rules.** A £15 wash needs none; a £1,500 coating
    does. Motivated by D3.

### 5f. Reliability, and the things that will break next

32. **Cloudflare Turnstile** on the booking page — free, invisible, and it is
    a better answer than a throttle to a script hammering a page, because the
    throttle also refuses the real customer behind the same office IP.
    Motivated by A5.
33. **Sentry**, free at 5,000 errors a month. Already `P-07`.
34. **Nightly backups.** Already `P-05`. Two secrets.
35. **Cloudflare R2 for photos.** Already `P-02`. 10 GB free is a thousand
    times the 10 MB a detailer gets today.
36. **Address autocomplete** on the booking page. Nominatim is free with a
    usage policy; Google Places gives $200 of free credit a month, which at
    this volume is free in practice. Half of a mobile detailer's problems are
    an address typed wrong.

### 5g. Situations the product has no answer for yet

37. **Ten cars, one booking.** A dealership calls (D6). Everything in the
    schema assumes one vehicle per booking.
38. **Two cars at one address.** The same customer, back to back — common,
    and today it is two separate bookings with the address typed twice.
39. **A rain day.** One button: message everybody booked tomorrow, offer the
    same slot next week.
40. **A detailer who moves.** Changing a service area silently changes who can
    book; nothing warns about existing bookings outside the new one.
41. **A staff member who leaves mid-week.** Access can be revoked; their
    assigned jobs have nowhere to go.
42. **A damage claim.** Job photos are the defence, and they are already
    timestamped — what is missing is a way to hand a customer the set for one
    job. It would also be the friendliest possible receipt.
43. **A customer who asks to be forgotten.** The export exists; deletion is
    the other half of the same request and has no button.
44. **A second business under one login.** Detailers who buy out a friend, or
    run a mobile arm and a shop. `SwitchBusiness` exists; nothing tests two.

### 5h. Bigger, and worth naming even though they are not next

45. **A one-page daily print-out.** Some detailers still want paper on the
    dash. It is a stylesheet.
46. **A supplies ledger** — what a job costs in product, so profit per job is
    real rather than revenue per job.
47. **Package pricing across visits** — plans exist; "buy 3, get the 4th" is
    the shape this trade actually sells and is not expressible.
48. **A customer-facing app-like install prompt.** The booking page as a saved
    home-screen icon for repeat customers. Free, one manifest.
49. **Multi-language.** Spanish is not optional in this trade in most of the
    US.
50. **A public "detailers near you" index across tenants.** Every site you
    build makes the next one easier to find, and it costs one page.

---

*Written by the testing loop, 2026-09-06. `docs/testing/FINDINGS.md` has the
reproduction for every finding above.*
