# Findings

The catalogue. `docs/testing/LOOP.md` is the protocol that fills it.

**Appended, never rewritten.** A finding that turns out not to be a defect is
marked `not-a-defect` with the reasoning and kept — the reasoning is the
valuable part, and the next lap should not rediscover it.

**Numbering is continuous** (`F-001` onwards) across every pass and every
session, so a finding can be cited from a commit message years later.

---

## Status key

| | |
|---|---|
| `blocks-launch` | a detailer or their customer gets stuck, or loses something |
| `embarrassing` | it works and makes us look unfinished |
| `cosmetic` | only we would notice |
| `risk` | not broken today; breaks under a condition that will arrive |
| `trap` | correct, and will be misread by a person |
| `needs-owner` | parked: needs a key, a credential, or his taste |
| `not-a-defect` | investigated, kept for the reasoning |

---

## NEEDS THE OWNER

The running list, so it never has to be reassembled from passes. Anything
parked goes here as well as in its pass.

*(Carried in from `docs/CHECKPOINT.md` at the loop's start — these predate
pass 001.)*

| | What is needed | Unblocks |
|---|---|---|
| **P-01** | `LEGACY_SUPABASE_URL` + `LEGACY_SERVICE_KEY` in `.env` | Roadmap 5.1, the migration of his real business |
| **P-02** | Cloudflare R2: account id, bucket, key id, secret | Job photos get 100 MB each instead of 10 |
| **P-03** | `RESEND_API_KEY` for Supabase SMTP, or he sets it himself | **Password reset probably does not reach any real customer today** |
| **P-04** | Stripe Connect switched on | Roadmap 2.20 stage 3, taking money |
| **P-05** | Two GitHub secrets | Nightly backups start running |
| **P-06** | Two or three detailer sites whose look he likes | Roadmap 6.1 and 2.25's screen |
| **P-07** | A Sentry DSN | Roadmap 7.2 |
| **P-08** | Does he want individual customer names and numbers on the back office? | The disclosure already covers it; the screen deliberately stops at counts |

---

## Passes

*(none yet — the loop has not run)*

---

## Pass 001 · D1 brand-new solo mobile detailer · dimension STATE=empty · width 375 · 2026-09-06

Intention: signed up an hour ago with nothing set up — get to a bookable page today.

Played cold: landing → /pricing → founding annual-upfront → create account →
create business (`coastal-shine-mobile-detail`) → the seven-step setup form →
the tour → then round to the front and booked a real job as a customer.

**The intention was satisfied.** A brand-new detailer is bookable the same day:
one service typed, everything else skipped, and a customer completed a booking
(Marcus Hill, Wed 9 Sep 10:00, $240, confirmed, row in `bookings`). The
defaults carry it — hours, slot interval, buffer and notice period are all
seeded at birth. What follows is what went wrong on the way.

F-001  blocks-launch  **Pressing "Continue" on the hours step destroys the
       detailer's real hours.** `SetupForm`'s draft seeds `contact` and
       `where` from the database and does NOT seed `hours` — it is hardcoded
       to Mon–Fri 09:00–17:00. `commit("hours")` upserts all seven weekdays
       from that draft. So a detailer who set Tue–Sat 08:00–18:00 on
       Business, then later opens "Finish setting up" (D9's exact path) and
       presses Continue on the hours step, silently gets Mon–Fri 09:00–17:00
       back. Their booking page then sells slots they cannot work and refuses
       the days they can.
       Reproduce: set non-default hours, Business → Finish setting up,
       navigate to step 4, Continue, re-read `business_hours`.
       Fixed: yes   Check: tests/setup-progress.test.mjs

F-002  trap           **"Continue" marks a setup step complete with nothing
       entered.** `go(i + 1, true)` appends the step key to
       `business_settings.setup.done` unconditionally. Tapping the primary
       button seven times — the natural thing to do — reports **7 of 7 done**
       on a business with no hours of its own, no phone number and no answer
       to "where does the work happen". This pass reached **6 of 7** having
       typed one service. Both the detailer's Business row and the owner's
       back office then report that detailer as set up.
       This is `docs/final-pass.md` finding 5 ("2 of 7 on a new business")
       inverted: the count is again arithmetically right and semantically
       wrong, in the other direction.
       Fixed: yes   Check: tests/setup-progress.test.mjs

F-003  blocks-launch  **A detailer who picks a paid plan never sees the
       payment screen.** /pricing → Choose this → sign up → create business
       redirects to `/app?settings=billing&term=…`; `App` does open the gear
       on billing, and then the first-run setup form renders over it and the
       tour renders over that. Close both and you are on Today. The URL still
       says `settings=billing`. `platform_subscriptions` is empty and
       **nothing on any screen says so** — Today only warns on `past_due` and
       `suspended`, never on "never subscribed".
       Reproduce: the whole signup path above, then query
       `platform_subscriptions` for the new business.
       Fixed: yes — the setup form now yields to a pending billing link.

F-004  risk           **A founding spot is consumed at signup, before a penny
       is paid.** `plan_tier` is set to `founding` by `create-business`; there
       are three spots. Three people who sign up and never pay exhaust the
       offer, the landing page stops advertising it, and the owner has no
       automatic way to notice. The back office has "Release founding spot",
       so the recovery exists — nothing prompts it.
       Fixed: no — needs the owner's call. See P-09.

F-005  trap           **Default hours close Saturday and Sunday.**
       `newBusiness.ts` seeds weekdays 09:00–17:00 with weekends null, and the
       reasoning ("a booking page with no open days is indistinguishable from
       a broken one") is right about the mechanism and wrong about the trade:
       weekends are when mobile detailing is bought. A D1 who skips the hours
       step has a page that refuses their two best days and nothing says so.
       Fixed: the reading, not the number — the hours step now opens on what
       is actually set, so "Sat and Sun closed" is visible before it is passed.

F-006  trap           **Skipping "Where does the work happen?" leaves the
       booking page offering both.** `mobile_enabled` and `dropoff_enabled`
       both default true, so a mobile-only detailer's page invites customers
       to "Drop it off — bring your vehicle to us", at an address that is
       null. `lib/setup.js` already names this ("`where` is the one that can
       never be derived"); the consequence on the customer-facing page had
       not been walked.
       Fixed: no — the honest fix is a default, which is the owner's call.
       See P-10.

F-007  embarrassing   **The booking page's "Check everything over" step shows
       none of what a customer would want to check.** It prints when, service
       type, service and total. It does NOT print the name, phone, email,
       vehicle size, condition or notes just entered — the fields most likely
       to be mistyped, and the two (phone, email) that decide whether the
       confirmation ever arrives.
       Fixed: yes

F-008  cosmetic       The back office prints "1 services" for a business with
       one service, on a screen whose neighbouring lines pluralise carefully.
       Fixed: yes

F-009  embarrassing   /pricing paints LIST prices ($999 / $600 / $60 / $75)
       for about a second before the founding lookup answers, then swaps to
       founding prices ($499 / $400 / $40 / $50). First paint advertises a
       price the settled page contradicts.
       Fixed: no — roadmap candidate; the correct fix is to hold the ladder
       until the count lands, which is a rework of the page's loading state.

F-010  risk           The first price quote on a cold booking page took over
       five seconds, with Continue disabled and only "Working out your price…"
       on screen. On a slow phone connection (C7) that is indistinguishable
       from a broken page.
       Fixed: no — needs measuring against the deployed function rather than
       a dev server. Roadmap candidate.

F-011  risk           **Sign-up completes with no email verification.** A
       typo'd address produces a live account and a live business that
       receives nothing. Compounds P-03 (no SMTP), which means the password
       reset that would rescue them does not arrive either.
       Fixed: no — a Supabase setting. See P-03.

F-012  cosmetic       Setup step 3 of 7 is PROMO CODE — asked before hours,
       service area and contact details. The order does not match what makes a
       page bookable.
       Fixed: no — reordering changes a documented decision (`lib/setup.js`
       records the order as §13a's). Roadmap candidate.

F-013  cosmetic       The signup screen shows no trace of the plan just chosen
       ("Create your account · Your business details come next"). The founding
       price reappears on the next screen so nothing is lost, but for one
       screen the choice looks dropped.
       Fixed: no — roadmap candidate.

## Pass 002 · O2 the owner, "is this working for them?" · dimension TENANCY=many · 2026-09-06

Intention: open the back office and answer, about one detailer, whether the
product is working for them.

F-014  blocks-launch  **The back office cannot tell a test fixture from a real
       detailer.** `businesses.is_demo` exists and `platform-admin` never
       selects it. The three seeded demo tenants are listed as ordinary
       detailers, and every run of the database-backed suites adds more — this
       pass found eleven (`tz-ny`, `tz-den`, `tz-phx`, `phase1-a`, `phase1-b`,
       `roles-a`, `ics-a`, `ics-new`, `ics-phx`, `engine-a`, `engine-b`), all
       `status: active`, all `is_demo: false`. The headline read **"Detailers
       15"** when the true number of real detailers is zero, and **NEEDS A
       LOOK was eight rows of test fixtures** — the one list on the screen
       whose whole job is to be short.
       Fixed: yes, both halves — the screen marks and excludes demo tenants,
       and the suites mark their fixtures.

F-015  embarrassing   **Clicking a detailer opens their panel below the whole
       list.** At fifteen tenants the panel is off-screen; at a hundred it is
       a hundred rows down, and nothing indicates that anything happened.
       Fixed: yes — the panel is scrolled into view and the open row is marked.

F-016  trap           "0 JOBS THIS MONTH" sits beside a row reading "30
       bookings, last today". Both are correct — `jobs_month` counts
       `status = 'completed'` — and together they read as a broken number.
       Fixed: yes — the tile says what it counts.

F-017  trap           "Photos: 0 MB used of 1.0 GB · 10 MB each for 15
       detailers · 154 MB promised". 10 × 15 is 150, not 154; the per-head
       figure is 10.24 MB rounded down and the promise is the unrounded
       product. Two roundings that disagree inside one sentence.
       Fixed: yes

F-018  risk           `revenue_month` and `jobs_month` filter `start_at >=
       monthStart` with **no upper bound**, so a completed job dated next
       month counts as this month's. `monthStart` is also computed on the edge
       function's own clock (UTC) rather than the detailer's timezone, so on
       the 1st of a month the figure disagrees with the detailer's own Money
       screen for part of a day.
       Fixed: yes (the upper bound). The timezone half is parked — see P-11.

F-019  risk           **A seeded all-seeing platform-admin account is live on
       the launched platform.** `platform_admins` holds
       `demo-admin@detailplatform.com`, whose own note says "Seeded for
       verification — delete before launch", and the platform launched on
       2026-09-06. The password is random and lives only in the gitignored
       `scripts/demo-refs.json` (verified: never committed, not in history),
       so the practical risk is low — but it is a standing full back-office
       login over every detailer's data, and nothing expires it.
       Fixed: no — deleting a live credential is the owner's call. See P-12.

F-020  blocks-launch  `node scripts/check-deployed.mjs` reports
       **platform-admin STALE** — the deployed edge function is older than the
       repo. This is the class of defect LOOP.md §0 was written against,
       present again on the day the loop started.
       Fixed: yes — redeployed.

F-021  embarrassing   The /admin door, signed out, is an unbranded "Sign in"
       card pinned to the top-left of an empty page, with nothing saying it is
       the back office.
       Fixed: yes

## NEEDS THE OWNER — added by this loop

| | What is needed | Unblocks |
|---|---|---|
| **P-09** | Should a founding spot be claimed at SIGNUP or at first PAYMENT? Signup is what happens today (F-004). Recommendation: claim at payment, and hold the spot for 14 days from signup so the price they were shown is the price they get. | The founding offer surviving three people who never pay |
| **P-10** | Should a new business default to mobile-only, drop-off-only, or both (F-006)? Recommendation: **mobile only** — it is the trade's default shape and the owner's own shape. A detailer who does drop-off will say so; a mobile-only detailer whose page offers drop-off will not find out until somebody turns up. | The "where you work" default |
| **P-11** | Back-office "jobs this month" is computed on UTC month boundaries (F-018). Per-detailer timezone is a bigger change than it looks — worth it? Recommendation: leave it and say so on the tile. | Exact month figures on the 1st |
| **P-12** | Delete `demo-admin@detailplatform.com` from `platform_admins` (F-019)? It is a live full-access back-office login on the launched platform. Recommendation: delete the row now; `node scripts/seed-demo.mjs --platform-admin` recreates it whenever a sweep needs one. | Removing a standing credential |

## Pass 003 · A1–A5 the adversary · dimension PERMISSION=signed out · 2026-09-06

Not role-play. `scripts/adversary-probe.mjs`, written this pass and committed,
asks two questions of every public surface: **can a stranger with no session
and no credential reach anything at all**, and **does a refusal ever say more
than "no"**. 50 checks, all green.

The two existing suites cover the other half — `tenant-isolation` proves the
database refuses A's rows to B, `staff-roles` proves a staff member cannot
reach money — and neither of them ever arrives with NO session, which is A3's
whole point, and neither looks at what a refusal SAYS. A 500 with a stack
trace and a 404 are both "it did not work"; only one of them is a map.

**Nothing leaked.** Twelve gated edge functions all refuse anonymously and
none of the refusals carries a stack frame, a source path, a SQL fragment,
the name of the gate or a schema hint. Fourteen tables queried straight at
PostgREST with the publishable key a browser already has — the key that IS in
the bundle — return nothing, `platform_admins` and `platform_admin_events`
included. `platform-admin` still never says "not an admin". A made-up booking
id and a made-up plan membership are both refused, and a real receipt carries
one customer and no others. The public business profile carries no customer
address, no customer number, no private platform note, no payment handle and
no notification list.

F-027  not-a-defect   `plan-link`, `booking-ics`, `unsubscribe`,
       `get-booking-receipt`, `cancel-booking`, `reschedule-booking` and
       `accept-quote` all answer an anonymous caller. This pass first recorded
       it as a finding and it is not one: every one of them is reached by a
       CUSTOMER, who has no session and never will, and their credential is
       the row's own UUID. Requiring a login there would mean asking somebody
       to make an account in order to cancel an appointment or leave a
       mailing list. Kept for the reasoning, and the probe now says it in as
       many words so the next lap does not rediscover it.

## Pass 004 · C7 the customer on a bad connection · dimension NETWORK=dropped · 2026-09-06

Intention: complete a booking on a connection that drops.

Read rather than simulated — a dropped response cannot be produced by any
script in this repo — and it found the sharpest defect of the session.

F-022  blocks-launch  **A dropped response makes a real booking look failed,
       and the retry tells the customer a stranger took their slot.**
       `create-booking` writes the row, the response is lost on the way back,
       the page shows an error and clears `submitting`. The customer presses
       Confirm again — which is what anybody would do — and the second
       attempt collides with **the booking they just made**. The exclusion
       constraint fires, and the message is *"That time was just taken by
       another booking. Please choose a different time."* They either book a
       second slot (a double booking, and a wasted morning for the detailer)
       or walk away from a job that is confirmed and will be waited for.
       Nothing in the stack could see it: the button's flag is per page load,
       the constraint cannot know who is asking, and every check in this repo
       runs on a connection that does not drop.
       Fixed: yes — idempotency by natural key. Same business, same instant,
       same phone, not cancelled, is not a clash; it is the same booking
       arriving twice, and the answer is the row itself, returned in the shape
       a fresh booking returns so the retry is indistinguishable from the
       first press.

F-023  risk           `create-booking` returned `insertErr.message` — a raw
       Postgres string, which names columns, constraints and checks — to an
       anonymous caller on a public booking page, and it is meaningless to
       the one person who ever reads it.
       Fixed: yes — the detail goes to the log, the customer gets a sentence.

F-024  risk           **The `booking_services` insert's error was discarded.**
       A booking with no service lines is not half-broken; it is a receipt
       with a total and no lines — the confirmation email, the invoice and the
       manage page all itemise from that table, and `reconcile()` would draw
       the whole price as an unexplained remainder. It is invisible from every
       screen: the booking exists, the slot is held, the detailer sees the
       job, and the first person to find out is the customer reading their own
       receipt.
       Fixed: yes — it cannot be undone (deleting the booking would hand the
       slot to somebody mid-form), so it is logged loudly, naming the booking.
       The add-on insert had the same shape and got the same treatment.

## Pass 005 · the code, not the screens · 2026-09-06

The owner asked mid-session for the things a screenshot cannot show. This pass
read the error paths of every write in `supabase/functions/` — the class of
defect that produced the dead email relay and the VAPID keys nobody set, both
of which were a `console` line inside a function and invisible from every
screen.

F-025  blocks-launch  **Our own daily email cap marks real customers as
       bounced, permanently.** `send-email` stamps `customers.email_failed_at`
       on any response under 500. The reasoning beside it is careful and
       correct about 5xx — *"a 5xx is the provider having a bad day, not this
       address being wrong"* — and stops one status short. **Resend's free
       plan is 100 emails a day ACROSS EVERY TENANT** and the transactional
       set spends about five a booking, so the platform's twenty-first booking
       of the day is refused with a **429**, which is under 500. Every
       customer emailed after that cap was told, permanently, that their
       address had bounced.
       It is worse than the outage case the 5xx rule exists to prevent,
       because it is self-inflicted, it arrives on the BUSIEST days, and it is
       enforcement rather than display: `send-campaign` filters on that
       column, so a good day's customers quietly stop being reachable.
       Fixed: yes — 429 and 408 join 5xx as "our fault, not the address".
       Check: tests/platform-billing.test.mjs § the sender (baselined).

F-026  blocks-launch  **`create-business` discarded the error on the owner's
       own membership insert, and losing it locks somebody out of their
       business for ever.** The `businesses` row exists, holding their name,
       their slug and possibly a founding spot, and they are not a member of
       it. The dashboard renders the create-a-business form whenever there is
       no business for the session, so the very next thing they see is the
       form they just filled in — and filling it in again fails on a slug that
       is taken, by them, invisibly. There is no screen that can show them
       what happened and no button that can undo it.
       Fixed: yes — the error is read, the business is rolled back (nothing
       else has been written except its defaults, all of which cascade), and
       they are told to try again with the name they wanted.

F-028  risk           The email quota itself, stated as a number because
       nobody had: **100 emails a day across the whole platform, about five a
       booking, so roughly twenty bookings a day before confirmations stop
       going out.** Four detailers doing five jobs a day reach it. The
       symptom on that day is "the booking page is broken".
       Fixed: no — it is a plan, not a defect. See NEEDS THE OWNER P-13.

F-029  risk           `send-owner-reminders`' manual send marks
       `owner_reminder_sent_at` without reading the error, so a failed mark
       means the reminder can be sent twice. One duplicate email, no data
       loss.
       Fixed: no — logged here so the next lap does not re-find it. Roadmap
       candidate, below `blocks-launch` work.

F-030  risk           `platform-admin`'s list action reads `bookings`,
       `customers` and `business_users` whole, with no limit, and joins them
       in memory. The file says so and accepts it — *"there are fewer than ten
       businesses and there will be fewer than a hundred for a long time"* —
       which is honest and correct today. Recorded so the number is written
       down: at a hundred detailers averaging five hundred bookings, that is
       one request carrying fifty thousand rows.
       Fixed: no — deliberately. `not-a-defect` today, a dated one.

## Pass 006 · §5, two detailers signed in at once · dimension TENANCY=two · 2026-09-06

`docs/testing/LOOP.md` §5 makes this mandatory every lap and says plainly that
it has never been done: `seed-two-tenants.mjs` exists and `tenant-isolation`
covers the API, but **two detailers signed in, in two browsers, at the same
time** had never happened.

`scripts/two-detailers.mjs`, written this pass and committed. Two browser
CONTEXTS, not two tabs — a tab shares localStorage and a session with its
neighbour, which is the thing being tested. It reads each tenant's own
business name, customer names and phone numbers out of the database as
markers, drops any word the two share (so a match means something), and then
walks every tab in both browsers looking for the other tenant's words in
`textContent` — not `innerText`, because a leak inside a collapsed panel is
still in the bundle and one keystroke from being read.

It also carries its own anti-vacuity checks, which is the part worth keeping:
a screen that failed to load shows neither tenant's words and would report
clean on every isolation check above it, so at least one screen has to prove
it really is rendering this tenant's data before its silence about the other
one means anything.

**Result: 25 checks, all green. Nothing of A ever reached B, or the reverse** —
not on Today, Calendar, Money, Clients or Business, not after a write by A
while B sat on the same screen, not after B reloaded, not on either public
booking page, and not on the signed-out page B was left with. Each detailer's
own data was proved to be rendering at the same time, so the silence about the
other one means something.

F-031  blocks-launch  **`seed-two-tenants.mjs` cannot produce the state §5
       requires, and that is most of why this pass had never been run.** It
       writes two businesses with a `contact_email` — which is a place to
       send a booking alert, not a way to sign in — and creates **no owner
       accounts at all**. So "sign in as detailer A and detailer B in separate
       browser contexts", the first line of §5's own instructions, was not
       possible with the fixture §5 names.
       Fixed: yes — `two-detailers.mjs` creates the two memberships itself,
       idempotently, resetting the password each run. `seed-two-tenants.mjs`
       is left alone deliberately: other scripts drive it and want exactly the
       businesses it makes.

F-032  not-a-defect   The first run of this pass reported a leak on both
       public booking pages. It was the CHECK: markers had been widened to
       include service names (they are the tenant's own words and the widest
       surface either tenant has), and a service name BELONGS on a booking
       page. Kept for the reasoning, because the shape recurs: **a check that
       is wrong is indistinguishable from a product that is wrong until
       somebody reads the detail line**, and a false alarm is the fastest way
       to teach a person to skip a run. The script now keeps two lists — what
       identifies the TENANT, and who its PEOPLE are — and asks each question
       of the right one.

F-033  risk           The seeded pair has almost nothing in it: after
       dropping shared words, tenant A offered **one** distinctive marker
       before service names were added. A one-marker isolation check can only
       find the crudest possible leak. The script now refuses to run if either
       tenant has no markers — a run that passes by having nothing to look for
       is this repo's most repeated failure — but the fixture itself is still
       thin, and a lap that wants a real answer should seed customers and
       bookings into both.
       Fixed: partly — the refusal is in. Seeding the pair properly is a
       roadmap candidate.

## NEEDS THE OWNER — added by passes 003-006

| | What is needed | Unblocks |
|---|---|---|
| **P-13** | The email ceiling, and it is a decision rather than a defect (F-028). Resend's free plan sends **100 emails a day across every detailer on the platform**, and one booking spends about five — so roughly **twenty bookings a day** platform-wide before confirmations, reminders and receipts stop going out. Four detailers doing five jobs a day reach it. On the day it happens the symptom is "the booking page is broken". Recommendation: move the platform onto Resend's own paid tier (**$20/month, 50,000 emails**) before the third detailer signs up, not after — it is the cheapest line item in the product and it is the one that fails on a good day. | Every detailer past about the fourth |
