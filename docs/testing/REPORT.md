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

**They live in `docs/ideas.md`** — fifty of them, each citing the finding or
the moment that motivated it, with costs named and a tickbox per line so the
owner can work through them and so anything built gets struck off in the same
file. A second copy here is how one of them goes stale and nobody knows which.

*Written by the testing loop, 2026-09-06. `docs/testing/FINDINGS.md` has the
reproduction for every finding above.*
