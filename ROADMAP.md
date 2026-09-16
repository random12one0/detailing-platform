# Roadmap — the fix queue

This is the live queue. It replaces the old build-phase roadmap, which moved to
`docs/archive/roadmap-2026-09-13.md` (its still-open items are carried into
Wave 11 below). The long build history stays at `docs/roadmap.md`.

**Built 2026-09-16 from two independent live-site audits:**

- `docs/audits/comprehensive-audit-2026-09.md` — scored the product 54/100 for
  selling to strangers, 67/100 for Andrew moving his own business onto it.
  Referred to below as **A1**.
- `docs/audits/fix-list-2026-09-15.md` — a route-by-route checklist.
  Referred to below as **A2**.

## The live site is current — measured, not assumed

Both audits reviewed `detailingplatform.com`. The repo's old notes claimed live
was hundreds of commits behind, which would have made most findings stale.
**It is not.** On 2026-09-16 the live bundle and a fresh local build from `HEAD`
were byte-identical:

```
live:  assets/index-CfUTS91_.js   assets/index-DrofU7fn.css
local: assets/index-CfUTS91_.js   assets/index-DrofU7fn.css
```

**So every finding below is against current code and none of it is discounted.**
It also means a push to `main` publishes. Re-measure with the two commands in
CLAUDE.md § Publishing rather than trusting this paragraph later.

## How to work this queue

1. **One item at a time, top to bottom.** Waves are ordered by what costs money
   or trust first. Don't batch.
2. **Fix, don't rebuild.** Only touch a screen for a problem named here.
3. **Verify in a real browser before ticking.** Try the case that should work
   *and* the case that should be refused. Check 1440 wide and 375 wide.
   A code change alone is not a fix.
4. **Tick the box and add one line saying how you checked it.** That line is
   what stops the next session re-doing it.
5. **When a finding turns out to be wrong, say so and strike it** — don't
   silently drop it. § Watch list below has the ones already suspect.
6. **Grep every caller before fixing.** A1's P0-02 was reported on one page and
   is actually on two; the one-guard fix covers both. Assume the same of
   anything that looks like a one-off.

---

## Wave 0 — Decisions and blockers for Andrew

Nothing below this line waits on these. They are asked once, here.

- [x] **0.1 — RESOLVED. The demo account's dual access is deliberate.**
  Andrew, 2026-09-16: *"I made one of them just be able to access both because
  I was tired of switching accounts… literally no one's on the site."*
  **So A2's 1.1 is not a defect and must not be "fixed".** A session that
  finds the audit line and not this answer will lock him out of his own back
  office, which is the exact mistake this repo has made before.
  **BUT IT IS A LAUNCH BLOCKER AND IT IS NOW TRACKED AS 12.4.** It is safe
  only while every business in the database is a fixture. The day a real
  detailer signs up, one guessable `demo123` login reads every detailer's
  customers. It comes out then, not before.

- [x] **0.2 — RESOLVED. Stripe is three days away, and sandbox works today.**
  Andrew, 2026-09-16: Stripe can be set up in three days; he is under 18 and
  expects to be limited.
  **Researched, and the limit is smaller than feared:**
  - A **Standard** Stripe account can be created at **13+**. Under 18, a legal
    guardian must be the account **owner** before it can accept charges or move
    money to a bank. **Express and Custom Connect require 18.**
  - **This platform uses Connect Standard over OAuth** — `connect-account/index.ts`
    calls `oauthToken`/`authorizeUrl`, and `pay-booking/index.ts:19` records
    `type=standard` with no application fee. **Each detailer brings their own
    Stripe account**, so their age is their own affair and none of it depends
    on Andrew's.
  - **Sandbox needs no activation at all.** Every Stripe path in this product —
    checkout, webhooks, subscription renewal, failed-payment retry, Connect
    onboarding — can be built and proved in test mode today.
  **So Wave 12 is not blocked on Andrew's birthday; it is blocked on three
  days and a parent's name on the platform account.** Build and test it all in
  sandbox meanwhile. The only thing that truly waits is taking real money.
  *Sources: Stripe [account age requirement](https://support.stripe.com/questions/age-requirement-to-create-a-stripe-account), [Connect age requirement](https://support.stripe.com/embedded-connect/questions/age-requirement-to-create-an-account), [sandboxes](https://docs.stripe.com/sandboxes).*

- [ ] **0.3 — Test data: flag, don't delete. Awaiting Andrew's yes.**
  A2's 1.3 found 15 of 16 back-office detailers are tests, plus "Smoke
  TPMOY"-style rows in the client list.
  **Why flagging beats deleting, in plain words:** about 60 automated checks
  in `tests/` work by signing into a seeded practice business and clicking
  through it — book a job, send an email, take a payment. They need those fake
  accounts to exist. Delete the fake data and roughly 60 checks stop being
  able to run, and a check that cannot run prints something that looks very
  like a pass. We would lose the safety net that catches mistakes on all 79
  items below, in exchange for a tidier list.
  **Fix:** an `is_test` flag; every list and count defaults to real accounts
  only; an unmistakable DEMO badge where a fixture is shown deliberately. Same
  clean screens, net still intact.

- [ ] **0.4 — The legal pages. A lawyer is not the only option.**
  Both audits (A1 P3-09, A2 6.6) flag that terms and privacy say Andrew wrote
  them, are not lawyer-reviewed, and are in his personal name. He asked whether
  a paid lawyer is really required.
  **It is not legally required, and there is a free path that is much better
  than what is live now:** start from a SaaS-specific template written by
  lawyers rather than from scratch, and fix the promises so they match the
  product. The live pages' real problem is not that a lawyer has not blessed
  them — it is that they **contradict the pricing page** (7.7) and **omit data
  processors the product actually uses** (7.8). Both of those are factual bugs
  we can fix for nothing.
  **Recommendation:** do 7.7 and 7.8 now for free, and get paid review only
  before charging strangers at scale. A business entity still matters more than
  the review — right now the terms are a contract with a private individual.
  *Sources: [Promise Legal SaaS ToS template](https://promise.legal/templates/terms-of-service), [ToS Lawyer's US SaaS legal checklist](https://toslawyer.com/legal-checklist-for-u-s-saas-startups-tos-privacy-dpa-sla-and-more/).*

---

## Wave 1 — Stop exposing Andrew and other people's brands

Smallest wave, highest embarrassment cost, all of it confirmed in source.

- [x] **1.1 — DONE 2026-09-16. Andrew's real payment handles are out of the demo business.**
  **Verified:** `grep -rn "andrews-detail|andrewsdetail" scripts/` returns nothing.
  Now `@coastline-demo` / `coastline-demo` / `paypal.me/coastline-demo`.
  **Still owed: re-seed the database so the live demo picks them up.**
  **Confirmed in source:** `scripts/seed-demo.mjs:189-191` sets
  `pay_venmo: "@andrews-detail"`, `pay_cashapp: "andrewsdetail"`,
  `pay_paypal: "https://paypal.me/andrewsdetail"`. The demo booking page is
  linked from the home page, and these handles go onto confirmations and
  reminders, so a stranger booking the demo is told to pay Andrew personally.
  **Fix:** made-up handles (`@coastline-demo` and similar). Re-seed.
  **Done when:** no real handle appears anywhere in the demo account or any
  email it sends. `grep -rn "andrews-detail\|andrewsdetail" scripts/ app/src`
  returns only unrelated prose.
  *A2 1.2*

- [x] **1.2 — DONE 2026-09-16, XPEL half. Example sites claimed a real brand.**
  **Verified:** `grep -rc XPEL docs/tenant-sites/*.html` returns zero matches.
  Six strings across `t-blackline.html` and `y-kinzie.html` now read
  "Manufacturer-certified film installer" / "CERTIFIED · Film installer".
  **Left open deliberately:** `/ex5` is still "Tampa Bay Auto Detail" with
  `info@tampabayautodetail.com`. Renaming a whole site identity is bigger than
  a string swap and Andrew has not asked for it. **His call.**
  `/ex5` is "Tampa Bay Auto Detail" with `info@tampabayautodetail.com`; `/ex4`
  claims "XPEL certified installer".
  **Andrew, 2026-09-16:** *"those are all example sites… it was like an example
  of someone having an XPEL certification."* Understood, and the intent is
  obviously innocent.
  **The risk is not the intent, it is that these pages are public and look
  real.** XPEL is a live trademark and certifies actual installers; a public
  page claiming their certification for a business that does not exist is the
  one thing on these sites a real company could object to. "Tampa Bay Auto
  Detail" is likely a real firm's name and email domain.
  **Recommendation, and it costs nothing:** invented certification
  ("Manufacturer-trained film installer"), invented name, invented domain. The
  page demonstrates exactly the same thing and the question disappears.
  **This is Andrew's call, not a defect** — if he would rather leave them, tick
  this box with that decision written in and move on.
  *A2 1.4*

- [ ] **1.3 — Test accounts appear in production lists and counts.**
  Back office "Everyone" shows 16 rows of which 15 are tests; the client list
  carries "Smoke TPMOY" with a broken number "(555) 014-2"; "9 gone quiet"
  counts them.
  **Fix:** per 0.3 — flag, default every list and count to real only, add an
  unmistakable DEMO/TEST badge where they are shown deliberately.
  **Done when:** a support task never requires scanning test rows, and the
  "gone quiet" count drops to match real customers.
  *A1 P3-01, A2 1.3*

---

## Wave 2 — Booking truth

A customer must never be shown one price and charged another, never be handed
the wrong service, and never book a job we cannot reach.

- [ ] **2.1 — The total rises after the customer has picked the time.**
  Both audits, independently, with different numbers: $205 → $235 (A1) and
  $300 → $330 (A2). A $30 weekend rate only appears at the final breakdown.
  **Fix:** mark affected days in the calendar with "+$30" and add the line to
  the running total the moment a weekend day is selected. Keep it in the final
  breakdown too.
  **Done when:** a customer cannot leave the date/time step without having seen
  the exact final total and every automatic surcharge.
  *A1 P0-01, A2 2.3*

- [ ] **2.2 — The summary lines do not add up to the total.**
  **Confirmed mechanism:** `supabase/functions/_shared/pricing.ts:127-128`
  rounds the *total* to a `nearest` setting while each discount line rounds
  separately at lines 270, 475, 506 and 514. A2 saw lines summing to $328 under
  a $330 total labelled "Rounded up to the nearest dollar", and a 10% member
  discount taking $275 to $245 where $247.50 was correct.
  **Fix:** round once, per line, and make the total exactly the sum of the
  displayed lines. Remove the "rounded up" note.
  **Done when:** lines sum to the total on every step across several
  combinations — with and without member rate, weekend, vehicle size, add-ons.
  This one gets a unit test against `pricing.ts`, not just a browser check.
  *A2 2.2*

- [ ] **2.3 — A far-away address is accepted with no travel charge.**
  A San Diego address went through with "Long Beach" selected, no warning and
  no "+$40 beyond 15 miles". The customer picks their own service area from a
  list, so they choose whether to pay the travel fee.
  **Fix:** derive distance from the looked-up address and apply travel cost
  automatically; remove the customer's area choice or fill it from the address;
  refuse out-of-area addresses with a phone number; don't let a booking page
  take bookings until "Where you work" is set.
  **Done when:** a far address is refused, a 15+ mile address adds the charge
  visibly, a local address goes through clean.
  *A2 2.1*

- [ ] **2.4 — A public example booking button crashes.**
  **Confirmed in source, and it is two pages, not one.**
  `docs/tenant-sites/v-goldenhour-prices.html:1585` and
  `v-goldenhour-work.html:1568` both call
  `document.getElementById("book").scrollIntoView(...)` with no null guard, and
  `id="book"` exists **only** on `v-goldenhour.html`. So `/ex1/prices` and
  `/ex1/work` both throw `TypeError: Cannot read properties of null`. A1 found
  the prices page; nobody found `/ex1/work`.
  **Fix:** one guard — if `#book` is absent, navigate to the index page's
  booking anchor by URL instead of scrolling.
  **Done when:** every booking button on every example opens a valid booking
  path. An automated check visits every public service CTA across all five
  examples.
  *A1 P0-02*

- [ ] **2.5 — One example hands the wrong service into booking.**
  On `/ex3/prices`, "Book this" under the $200 Interior Refreshment left the
  $500 Signature Detail selected, and Interior Refreshment was not offered at
  all in the embedded flow.
  **Fix:** one service identifier from website card through to booking
  selection. Refuse to publish a public service whose booking mapping is
  missing.
  **Done when:** the automated CTA check from 2.4 also asserts the matching
  service name and price in booking.
  *A1 P0-03*

- [ ] **2.6 — Continue is greyed out with no reason (vehicle step).**
  Size and model filled, Continue stayed dead until a year was typed; the year
  box is not marked required while the box above it is marked "(optional)".
  **Fix:** make year optional. More generally: never silently disable Continue
  — let it be pressed and highlight what is missing in plain words.
  **Done when:** the step continues without a year, and any genuinely required
  box says what it wants when Continue is pressed.
  *A1 P1-06, A2 2.4*

- [ ] **2.7 — Continue is greyed out with no reason (contact step).**
  The hint says "Add your name and phone number to continue"; Continue stays
  dead until an email is added. Email may only be required when a plan is
  attached.
  **Fix:** the hint states exactly what is required in each case.
  **Done when:** the hint always matches what validation actually enforces.
  *A1 P1-06, A2 2.5*

- [ ] **2.8 — Address entry may accept unverified raw text.**
  Continue became enabled before a suggestion was selected. **A1 marks this
  "observed, submission consequence untested."**
  **Fix:** decide whether manual addresses are allowed. If not, require a
  selection. If yes, label it "Use this address anyway", keep the raw value and
  flag it for review.
  **Done when:** tests cover selected, partial, nonexistent, out-of-area,
  apartment/unit, and manually accepted addresses.
  *A1 P1-05*

- [ ] **2.9 — The service area is asked too late.**
  Mobile address and area come at step 4, after services, add-ons and vehicle.
  **Fix:** ask "Where's the car?" before vehicle details.
  **Done when:** an out-of-area customer is told inside the first two steps.
  *A2 2.6*

- [ ] **2.10 — Recurring plans overwhelm a one-time booking.**
  Four plan cards in a dense two-column set on the add-ons step, before a date
  is chosen. "Bi-weekly maintenance" is $120/month for two visits; "Monthly
  two-visit" is $200 for two visits and is tagged "2 visits each time".
  Choosing "Member rate" never says whether joining costs anything or repeats.
  **Fix:** move plans off the add-ons step — their own step or a linked page.
  Each plan states cost, frequency and how to stop. Rename the $200 plan.
  **Done when:** a one-time customer reaches vehicle details without reading
  membership terms, and an interested one can still tell what a plan charges.
  *A1 P1-07, A2 2.7*

- [ ] **2.11 — The last step says nothing about what happens next.**
  **Not a contradiction with A1 §12, which is about a different step.** A1
  found the reassurance sentence on the *date/time* step and asked to keep it;
  A2 wants one above the *final* button. Checked in source: `BookingPage.jsx`
  around line 806 renders "Request this time" with no adjacent sentence.
  **Fix:** one line above the button, built from the detailer's own rules:
  when they reply, and the change/cancel window.
  **Done when:** the line shows and reflects that business's actual settings.
  *A2 2.9*

- [ ] **2.12 — Spanish is half-translated.**
  "Weekend rate", "Member rate · 10% off", "Member rate aplicado" and "That
  code isn't one of ours" stay English. Service and add-on names stay English.
  The language choice also leaked across to a different booking link.
  **Fix:** translate every system-written line; the detailer's own typed
  service names stay as typed, which is already the rule. Scope the language
  choice per business.
  **Done when:** a full Spanish pass through all seven steps shows no
  system-written English. `node scripts/i18n-survey.mjs` is the instrument, and
  per `docs/gotchas.md` it has returned a false pass before — break it first.
  *A1 P2-10, A2 2.8*

- [ ] **2.13 — Both first-step categories say "choose one" when only one is required.**
  **Fix:** "Optional — choose one" per category, or state the real rule once
  above them.
  *A1 P2-07*

- [ ] **2.14 — The promo error hides behind the sticky footer.**
  **Fix:** scroll it into view, or add bottom space.
  **Done when:** visible on a 375-wide phone without scrolling.
  *A2 2.10*

- [ ] **2.15 — The sticky footer can cover the last choice.**
  **Fix:** bottom padding and a shorter footer; test with browser chrome and
  the on-screen keyboard up.
  *A1 P2-08*

---

## Wave 3 — Communication proof

"Sent" is not "delivered". Today the product proves only that a send was
requested.

- [ ] **3.1 — The owner cannot tell whether emails arrived.**
  The dashboard says "Reminder sent to customer"; the back office says Resend
  delivery/bounce tracking is "confirmed possible" and not wired.
  **Fix:** store and display Resend events for `sent`, `delivered`,
  `delivery_delayed`, `bounced`, `failed`, `suppressed` and `complained`, each
  linked to message, booking, detailer and recipient. Alert on permanent
  failure. Resend documents exactly these event types for webhooks.
  **Done when:** a deliberately bounced test message appears in the back office
  with a next action, and a delivered one is visibly different from "sent".
  *A1 P0-04, § 9*

- [~] **3.2 — DEFERRED by Andrew to ~Dec 2026. Email capped at 100 a day, shared with Andrew's real business.**
  Back office shows "Email today 0 of 100", and `AdminPage.jsx:360` already
  knows the cap is shared with andrewsdetail.com.
  **Fix:** paid Resend plan before any real customer goes live; alert in the
  back office as the cap approaches and on any failed send.
  *A2 3.2*

- [ ] **3.3 — Customers only ever get email, never text.**
  Settings lists confirmation, reminder and thank-you as email only, while the
  home page promises "Confirmation when they book, reminder before you drive
  out."
  **Fix:** text confirmation and a day-before reminder with "Reply C to
  confirm", each switchable by the detailer.
  **Done when:** a test booking sends a real text and a reminder fires on
  schedule.
  *A2 3.1, A2 Part 8 item 1 — A2 calls this the single biggest cut to no-shows*

- [ ] **3.4 — Review every email end to end. Nobody has ever done this.**
  Carried from the old roadmap, and it is the same job A1 § 10 asks for in its
  lifecycle matrix.
  **Done when:** confirmation, acceptance, reminder, quote, receipt,
  cancellation and reschedule have each been sent, received and read.
  *old roadmap § A*

---

## Wave 4 — State safety

- [ ] **4.1 — One tap completes a job, with no confirmation and no undo.**
  A1 marked a demo job complete by accident while exploring. This gets used
  one-handed in a driveway, and completion moves reminders, reports, money and
  customer status.
  **Fix:** confirmation showing customer, service and time, then a visible
  undo. Apply the same review to cancel, no-show, suspend, delete, waive and
  owner-invite. **The pattern already exists** — the job page's delete-behind-a
  -fold with `.btn.danger` is this product's reference for a destructive
  action (`docs/screen-rules.md`). Copy it rather than designing a second one.
  **Done when:** no consequential state change happens from one accidental tap,
  and each is recorded in an audit history.
  *A1 P0-06*

- [ ] **4.2 — Calendar download links need an authorization review.**
  The link carried a Supabase function URL, a booking id, `audience=owner` and
  an anonymous API key. **A1 proved no vulnerability** — an anon key can be
  normal in Supabase — but the endpoint's authorization is untested.
  **Fix:** test whether altering booking ids or audience exposes another
  account's data; verify row-level security and server-side authorization;
  consider signed expiring links.
  **Done when:** cross-account and altered-link tests fail safely and the
  result is written into `docs/VERIFIED.md`.
  *A1 P1-10*

- [ ] **4.3 — Support view needs a read-only banner and an audit record.**
  "Look at their dashboard" opened a support view that appeared read-only, but
  nothing said so and nothing recorded it.
  **Fix:** "Viewing as support — read only" banner, record who opened it and
  when, block mutations server-side, provide "Return to admin".
  **Done when:** an attempted state change fails and the access appears in an
  audit history.
  *A1 P3-08, § 9*

- [ ] **4.4 — Prove multi-tenant isolation properly.**
  `tests/tenant-isolation.test.mjs` exists. Per `docs/gotchas.md`, break it on
  purpose before believing it.
  **Done when:** cross-detailer access with altered identifiers fails on every
  customer/business table and storage path, and the run is recorded.
  *A1 § 9*

---

## Wave 5 — Money truth

Both audits independently reached the same conclusion here, which makes it the
most corroborated finding in the set.

- [ ] **5.1 — The Money screen calls unpaid work "brought in".**
  $785 "brought in" − $433 expenses = $352 "net/kept", while $465 of that $785
  is still owed. Cash actually collected less expenses is **−$113**. The back
  office repeats the error, calling the $785 "taken".
  **Fix:** five separate labels and calculations — **Earned**, **Collected**,
  **Still owed**, **Expenses paid**, **Cash left after paid expenses**. Net is
  computed from collected money only. Don't let "net" dominate visually.
  **Done when:** marking a job paid moves money from "Still owed" to
  "Collected" and net changes only then; and every headline figure reconciles
  against the visible jobs, payments and expenses.
  *A1 P1-01, A2 4.1*

- [ ] **5.2 — The mid-month comparison compares half a month to a whole one.**
  "▼ 52% vs $726 last month" on a half-finished month.
  **Fix:** compare to the same point last month, or hide until the month ends.
  *A2 4.2*

- [ ] **5.3 — Receipts and invoices may not be findable.**
  **A1 marks this "needs verification, not a proven missing feature"** — the
  payment was never finalized.
  **Fix:** run a full test payment and inspect every resulting email and
  record. If the documents exist, make them discoverable; if they don't, narrow
  the sales claim until they do.
  **Done when:** an owner can answer "what was sent, when, to whom, did it
  arrive, can I resend it?" without hunting.
  *A1 P1-04*

- [ ] **5.4 — Link-open counts may disagree between Money and Business.**
  Money says "None of your links were opened in this period"; Business says
  "1 link · 21 opens". **A2 marks this not confirmed** — may be different
  periods.
  **Fix:** if the periods differ, label them. If not, fix the count.
  *A2 4.5*

---

## Wave 6 — Recovery and monitoring

- [ ] **6.1 — There is no proved recovery path for the business's records.**
  No restore test, restore date, recovery target or outage history exists.
  Once Andrew runs his livelihood on this, losing a week of bookings is a
  business-stopping event.
  **Fix:** define backup frequency and retention, run a restore into a safe
  environment, record the last successful restore test, write a one-page
  recovery procedure, enable MFA on the production accounts. Supabase's
  production checklist covers backups, point-in-time recovery, MFA and RLS.
  **Done when:** a test copy is restored, opened and checked against a known
  set of bookings, customers and settings, with the date visible in the back
  office.
  *A1 P0-07*

- [ ] **6.2 — The back office cannot prove the product is healthy.**
  Netlify connected but not read; Supabase needing wiring; email delivery not
  wired; no outage history. Successful jobs are prominent and green; missing
  monitoring is faint grey. **"No alarm" is being read as "working."**
  **Fix:** outside checks for homepage, booking start, booking availability,
  sign-in and a safe database/function path. Store incidents and recovery
  times. Show failed background jobs, not only last success. Missing monitoring
  renders amber or red. Netlify's own docs say native observability has no
  alerting and limited retention, so an external check is required.
  **Done when:** a controlled failure raises an alert, appears in incident
  history, names the affected path, and clears only after a successful check.
  *A1 P1-03, P3-07, § 9*

- [ ] **6.3 — Alert when an active detailer's booking page cannot work.**
  No services, no coverage area, no future availability, suspended account, or
  a public error.
  *A1 § 9*

- [ ] **6.4 — Weak signal and retry behavior is unknown.**
  Detailers work in driveways.
  **Fix:** test current-day viewing after signal loss, safe retry on an
  interrupted update, no duplicate bookings or duplicate actions after retry,
  and a printable next-day schedule with customer contacts as an outage
  fallback.
  *A1 § 9, § 10*

---

## Wave 7 — Sales proof

- [ ] **7.1 — `/examples` looks like an internal index, not a portfolio.**
  A plain text list of ex1–ex5: no thumbnails, no menu, no way back, no styles,
  no phone views, no call to action. **Both audits score this the worst page in
  the product** — A1 gives it 3/10 — and note the individual examples are among
  the best-looking parts of it.
  **Fix:** screenshot cards, one desktop and one phone crop each, a plain-words
  style label, "View live example" and "Build mine like this", the normal site
  menu and footer, and no "ex1" labels in customer-facing headings.
  **Done when:** a prospect understands the range and quality without opening
  every example.
  *A1 P2-01, A2 7.1*

- [ ] **7.2 — The public price explanation contradicts itself.**
  Copy says "every figure is what you pay" and "nothing is added", then allows
  condition, distance, size and add-ons to change the amount.
  **Fix:** one honest formula. Only say "nothing added" if it is literally true.
  **Done when:** a customer can explain every circumstance that changes the
  displayed amount.
  *A1 P1-09*

- [ ] **7.3 — Pricing page: the decision is below the photo, and savings look like a charge.**
  $499, $40 and $80 carry similar visual weight, so the saving reads as a third
  fee. "SAVE ON THE YEAR $80 a year" reads as if the yearly price is $80.
  **Fix:** two plain plan cards at the top; separate lines for one-time build
  cost and repeating cost; "Pay yearly: $400 (save $80)"; commitment choices in
  the card, not buried; reduce the empty booking-only area; raise terms
  contrast.
  **Done when:** in five seconds a visitor can say what each plan includes,
  what is due now and what repeats.
  *A1 P2-02, A2 6.1*

- [ ] **7.4 — The home page lists the old price first in the markup.**
  "$999 to build it, then $60/month" precedes the founding price in the page
  text, so search results and screen readers may announce the wrong price.
  **Fix:** mark the struck price as the old price so it is read as crossed out,
  or hide it from assistive technology. Founding price first.
  *A2 6.2*

- [ ] **7.5 — Prices count up from low numbers.** "$20 to build it" and
  "$1/month" are visible mid-count while scrolling past. Show the final price
  immediately.
  *A2 6.3*

- [ ] **7.6 — "Unlimited photos" against a 1 GB cap.** The back office shows
  1 GB total, "10.2 MB promised to each". Raise the storage or change the words.
  *A2 6.4*

- [ ] **7.7 — Terms contradict pricing.** Terms say data "by asking" and close
  your account by "Tell us"; pricing says "You export them and go" and "One
  button… nobody to talk out of it".
  **Fix:** align the promises, and make sure the export and cancel buttons
  actually exist.
  **Done when:** the same promise about data access, ownership, cancellation,
  export and deletion appears on every page.
  *A1 P3-09, A2 6.5*

- [ ] **7.8 — The privacy page omits services that receive customer addresses.**
  It names Supabase, Netlify, Resend, Stripe and Google. The booking address
  search visibly credits **Geoapify** and **OpenStreetMap**, so typed addresses
  go somewhere the policy does not mention.
  **Fix:** inventory every data processor and what each receives — address,
  weather, maps, analytics, error reporting, email, hosting, storage, support.
  Separate active processors from planned ones; a future Google Business
  Profile feature is currently described as if it were live.
  **Done when:** the configuration inventory and the public policy match, and
  adding or removing a processor triggers a policy review.
  *A1 P0-05, P3-10*

- [ ] **7.9 — The home page animation delays the point.**
  Several long scrolls advance a controlled sequence with large empty black
  areas; the page is about 13 screens tall; the headline types letter by letter;
  the hero product shot is too small and dim to judge.
  **Fix:** show the headline immediately; shorten the DM demonstration to about
  one screen; a larger brighter real product crop, desktop and phone paired;
  respect reduced motion; trim repeated sections.
  **Done when:** the full point is understandable with motion disabled.
  *A1 P2-03, P2-04, A2 7.4*

- [ ] **7.10 — Example site defects.**
  `/ex2` Delgado: headline stays faded ~5s and the giant "DELGADO" lettering
  overlaps it; "Next opening Thu 11 Sep" is in the past; tab title says "Mesa
  AZ" while the page says Phoenix · Scottsdale · Tempe.
  `/ex1` Prime: "1 yrs" while counting up.
  `/ex5` Tampa Bay: the review pill is partly hidden behind the ceramic coating
  card.
  `/ex3` Ballantyne: hero is very tall.
  *A1 § 4, A2 7.2, 7.3*

- [ ] **7.11 — The home page's own example is a different city from the demo.**
  Home page says "Tacoma, WA"; the demo business is Long Beach, CA.
  *A2 7.6*

- [ ] **7.12 — Pricing page is blank for about a second, and has no sign-up
  button in the phone top bar.**
  *A2 6.7, 6.8*

---

## Wave 8 — Field usability

A1 is explicit that its browser **could not simulate a real phone** and warns:
do not turn "looked narrow on desktop" into "mobile passed." A2 never checked
the dashboard or back office at phone width at all.

- [ ] **8.1 — Sweep every dashboard tab and dialog at 375 and 320.**
  Today, Calendar, Money, Clients, Business, Settings and every pop-up. On "How
  you get paid" the bottom menu was already seen covering content at medium
  width. `scripts/sweep-widths.mjs` is the instrument and **it has printed
  "clean" over 38 real findings before** — break it first.
  *A2 4.12, 5.7, A1 § 10*

- [ ] **8.2 — Real-device pass on a real iPhone and a real Android.**
  One-handed, in bright daylight, browser chrome visible, keyboard up. Cover
  the sticky footer, address suggestions, date picker, dashboard actions,
  calendar, call/text, photo upload and emergency admin use. Record where
  thumbs cannot reach and where text becomes unreadable.
  **This cannot be done from this machine.** It is Andrew's, or a phone he
  hands to somebody.
  *A1 § 10*

- [ ] **8.3 — Small grey text is unreadable outdoors.**
  Both audits, everywhere: body copy, letter-spaced all-caps micro-labels,
  progress text, tab labels, service details, warnings, "then $40/month $60",
  labels under the money numbers. In the back office, missing monitoring is
  quieter than successful jobs.
  **Fix:** raise contrast and size; simplify micro-label styles; warnings
  outrank healthy information. WCAG 2.2 wants 4.5:1 for normal text and 3:1 for
  large.
  **Done when:** `node scripts/accent-sweep.mjs` and the contrast suite pass,
  **and** it has been read outdoors — automated checks do not reproduce glare.
  *A1 P2-05, A2 7.5*

- [ ] **8.4 — Booking choices do not look interactive.**
  Selection is a thin green border; the details control is a tiny eye icon;
  prices and descriptions are dim; the progress label is faint.
  **Fix:** "What's included" as text rather than an eye icon; a checkmark or
  "Added" on selected cards; stronger card edges; more legible price text; a
  stronger progress indicator. Also remove the duplicated first bullet
  ("Everything in the Express Wash" appears as both the sentence and bullet 1).
  **Done when:** a user can name the selected choice without comparing shades.
  *A1 P2-06, A2 2.11, 2.12*

- [ ] **8.5 — Keyboard, screen reader, zoom, large text and reduced motion.**
  Never checked.
  *A1 § 10*

---

## Wave 9 — Dashboard and back office

- [ ] **9.1 — Setup progress disagrees between the dashboard and the back office.**
  Business says "10 of 12 done"; the back office says the same account is
  "4 of 12". CLAUDE.md already states both sides are supposed to run the same
  `app/src/lib/setup.js`, so this is a live regression against a stated rule.
  **Done when:** the same account shows the same count everywhere.
  *A1 P1-02, A2 4.4*

- [ ] **9.2 — The back office says contradictory things about one account.**
  Growth says a page "cannot take a booking" and also "the page works and
  nobody has used it". One account appears in setup-incomplete, cannot-book,
  never-booked and no-website at once.
  **Fix:** stages — Created → Configured → Bookable → First booking → Active.
  One furthest stage per account, separate warnings, one primary blocking
  reason.
  **Done when:** the counts reconcile and each account has one clear next
  action.
  *A1 P1-02, P3-04, A2 5.1*

- [ ] **9.3 — The setup banner shows an empty list and "and 2 more".**
  **Fix:** show the first blocking task on its own line with a direct button.
  *A1 P2-11, A2 4.3*

- [ ] **9.4 — Calendar is hard to read at a glance.**
  Single-letter weekdays make both S days and both T days ambiguous; names
  truncate; only "Blocked" is explained; the first partial week omits blank
  cells so the grid is irregular.
  **Fix:** short weekday names, a complete rectangular month, a full status
  legend, readable selected-job detail.
  *A1 P1-08*

- [ ] **9.5 — Late jobs are not flagged.** At 10pm a 2:00 PM job still sits
  under "Still to do". Mark it late and offer "Mark done" or "Move it".
  *A2 4.9*

- [ ] **9.6 — Client list has no labels.** Values appear with no headings, so
  last visit, lifetime spend and phone must be inferred. "9 gone quiet" is
  vague. Define it with an exact period and give it an action.
  *A1 P2-12*

- [ ] **9.7 — Client card is missing basics.** No Text button, no vehicle, no
  address, no "Book again". Add them; "Book again" opens New booking prefilled.
  *A2 4.7*

- [ ] **9.8 — Manual booking flashes "No active services yet" before loading.**
  Replace false empty states with a loading skeleton; only show empty after a
  completed empty response.
  *A1 P2-14*

- [ ] **9.9 — New booking files "Mobile / Drop-off" under the VEHICLE heading.**
  Move it under its own "Where" heading.
  *A2 4.8*

- [ ] **9.10 — Business settings waste the right half of the screen.**
  Put a live customer-page preview there; stack below on phones.
  *A1 P2-13*

- [ ] **9.11 — Booking-rule conflict needs a one-click fix.** The product
  already correctly warns that a 2-hour booking notice plus a 24-hour change
  cutoff locks a new booking immediately. **Keep the warning** — add an example
  and a recommended adjustment.
  *A1 P2-15*

- [ ] **9.12 — Back office: real detailers first, scannable, one action each.**
  Default to real accounts; replace the three-column card wall with a list —
  detailer, status, setup, last booking, earned, customers, primary warning,
  action; open detail in a side panel. "One thing needs you" is good; the
  duplicate wide card under "What to look at, in order" is not. "Money at risk"
  shows for an account that pays nothing. "Ring them" shows no phone number.
  "Booking · last one yesterday" shows for accounts with 0 customers.
  **Done when:** the owner can find the only account needing attention in under
  ten seconds.
  *A1 P3-02, P3-03, A2 5.2, 5.3, 5.6*

- [ ] **9.13 — Zero data is being presented as proof of success.**
  "$0 went through it this month… it is the proof the product works rather than
  income."
  **Fix:** say plainly there is not yet enough production data to judge.
  *A1 P3-05, A2 5.4*

- [ ] **9.14 — The owner cannot see whether the platform made money.**
  Subscription revenue is visible; hosting, database, email and domain costs
  are not. Manual cost entry is fine to start.
  *A1 P3-06*

- [ ] **9.15 — Onboarding: "Six short tours, up to 37 steps".**
  Replace with short contextual prompts tied to unfinished setup.
  *A1 P3-11*

- [ ] **9.16 — Hide the owner-only "The website business" row from detailers.**
  Depends on 0.1.
  *A2 4.11*

---

## Wave 10 — Copy

One pass, one list. All of it is the same defect: internal voice reaching
production. `CLAUDE.md` § Design already forbids it; these are the live
instances.

- [ ] **10.1 — Remove every developer-voice string.**
  - "Tallest bar $741." → remove, or a real caption
  - "This is the sentence that closes a sale — it is real scarcity rather than a tactic"
  - "$0 went through… it is the proof the product works rather than income"
  - "The built-in table · nothing is overridden"
  - "Each line is asked of everybody separately…"
  - "Log a bulk job" → "Add a fleet job"
  - "Maintenance deadlines · 1 missed" → "Plan visits · 1 overdue"
  - "Six short tours, up to 37 steps" → "Quick tours"
  - "0 of 9 bookings came through a link. Earned counts finished jobs only."
  - "Add a way to be paidSave" — two buttons with no space between them
  - Tab name "Plumbing" → "System health"
  - Raw job names `accrue-plan-visits`, `send-owner-reminders` → plain names
  - "Something watching from outside" → "External booking check"
  **Remember:** a string changed here needs its Spanish key changed in the same
  edit, or it silently falls back to English.
  *A1 P2-16, P3-04, P3-07, § 7, A2 4.10, 5.4*

- [ ] **10.2 — Cut every back-office explanation paragraph to one line.**
  *A2 5.5*

---

## Wave 11 — Carried from the old roadmap

Still open, not covered by either audit.

- [ ] **11.1 — Geoapify: address autocomplete, drive time and routing.**
  Attribution is settled; the key must not reach the browser. **Overlaps 7.8**
  — the privacy page must name it. *old roadmap § 6, § 3*
- [ ] **11.2 — The vehicle picker**, on NHTSA vPIC. *old roadmap § B*
- [ ] **11.3 — The editing screens phase** — make settings feel like a product.
  Overlaps 9.10. *old roadmap*

---

## Wave 12 — Stripe, and the launch blockers

**Not blocked any more — see 0.2.** Every item here can be built and proved in
Stripe's sandbox today, with no activated account. What waits three days is
only taking real money, and that needs a parent named as owner of the platform
Stripe account. Detailers bring their own Standard accounts over OAuth, so
their age is not Andrew's problem.

- [ ] 12.1 Subscription billing end to end: sign-up → pay → renew → failed
  payment retries → page offline → back when paid. Sandbox proves all of it.
  *A2 5.8*
- [ ] 12.2 Real in-person card payment. Today "Card" only writes the word
  "Card" into the notes, while the home page promises "Take a card payment on
  the driveway." **Until this ships, 10.1 must change the home page wording** —
  a claim the product cannot keep is a copy bug, not a missing feature. *A2 4.6*
- [ ] 12.3 Optional deposit at booking. *A2 Part 8 item 2*
- [ ] **12.4 — Split the demo account before the first real detailer signs up.**
  Deliberate today (see 0.1) and correct while every business is a fixture.
  **The trigger is the first real signup, not a date.** At that moment one
  guessable `demo123` login can read every detailer's customers. Split it into
  a plain demo detailer and a separate owner login with a real password, and
  restore the `/admin` refusal for non-admins.
  **Done when:** the demo account is refused at `/admin` and the "The website
  business" row no longer shows in its settings. Closes A2 1.1 and A2 4.11.

---

## Wave 13 — After the fixes

In A2's stated order. Do not start these while Waves 1–10 are open.

1. Day view in the calendar with drive time between jobs. *A2 Part 8 item 3*
2. "Book again" and win-back texts for customers who have gone quiet. *item 4*
3. Before/after photos per job, optionally added to the detailer's gallery.
   *item 5*
4. **Move Andrew's own business onto the platform** as the first real account,
   once 2.3, 2.2, 3.3 and the Stripe wave are done. *item 6*

---

## Release gates

From A1 § 11. Use these rather than "the wave is finished".

- **Gate A — safe private pilot.** Waves 1–4 closed or explicitly risk-accepted
  with a temporary safeguard. Every example CTA passes an automated mapping
  check. One complete booking lifecycle passes. Real-device phone pass done.
  External booking and email-failure alerts work.
- **Gate B — Andrew runs in parallel.** Money reconciles against his old
  records. Confirm/undo and audit history work. Daily export and fallback
  available. Ten real jobs complete with no lost state and no invisible missed
  message.
- **Gate C — Andrew retires the old system.** Several weeks of parallel
  operation reconcile. Restore drill passes. Weak-signal and retry pass.
  Cancellation/reschedule/quote/receipt lifecycle passes. He can recover
  tomorrow's schedule during an outage.
- **Gate D — sell to strangers.** Waves 1–8 closed. Legal pages match reality.
  `/examples` and pricing communicate without help. Admin spots failures before
  customers report them. A small group of pilot detailers has completed real
  jobs and their support failures have been addressed.

---

## Watch list — findings that may be wrong

Do not act on these without checking first. **A wrong diagnosis attached to a
real observation is still a real observation** — keep the reproduction even if
the explanation dies.

| Item | Why it is suspect |
|---|---|
| ~~A2 1.1 demo has admin access~~ | **STRUCK — not a defect.** Andrew merged the two logins on purpose because switching accounts was annoying, and nobody is on the site. **Do not "fix" it** — that locks him out of his own back office. It comes out at the first real signup: 12.4. |
| A2 4.5 link-open counts | A2 marks it not confirmed — may be two different periods. |
| A2 1.4 example brand names | Andrew says these are illustrative, not claims. Downgraded from a defect to a recommendation — see 1.2. His call. |
| A1 P1-04 invoices missing | A1 says "needs verification, not a proven missing feature" — the payment was never finalized. |
| A1 P1-05 raw address accepted | Observed, but the submission consequence was never tested. |
| A1 P1-10 calendar link | A1 proved **no** vulnerability. It is a review, not a defect. |
| A2 2.9 vs A1 § 12 | **Already resolved — not a contradiction.** Different steps. See 2.11. |

## Do not reopen these

A1 § 12 lists things that improved during the review or should not be touched:
the home page eventually showed founding prices consistently (regression test,
not an open defect); the date/time step's "the business confirms" wording
**stays**; promo code `DEMO25` being invalid in customer booking is **not** a
bug — they are different promo systems; no route returned a 404; team
permissions and custom roles **exist** and are not missing; "Reminder sent to
customer" is good immediate feedback and stays; the booking-rule conflict
warning is correct and gets a better resolution path, not removal.

---

## Andrew's decisions — 2026-09-16, second round

**3.2 email cap — DEFERRED, and the audits' premise was wrong.** Andrew has
sent 100+ emails in a day with no failure, so the cap is not the hard wall A2
described. He is not paying ~$60 until there are customers, expected around
**December 2026**. Revisit then, not before.

**3.3 texting — ONE platform number, not one per detailer.** His words: *"I
don't need a text message for every single detailer to have their own separate
messaging software… the same with the phone number."* Exactly how Resend works
today — the platform sends, from the platform's identity, on the detailer's
behalf. **This is much cheaper and simpler than per-tenant numbers** and it
removes per-detailer A2P registration entirely.
**Provider, researched 2026-09-16:** **Telnyx at $0.0040/SMS** is the cheapest
credible option — about half Twilio's $0.0083, and Twilio's real cost is nearer
$0.011–0.013 once carrier surcharges land. **Plivo at $0.0055** is second and
mirrors Twilio's API if migration ever matters. **Recommendation: Telnyx.**
US A2P 10DLC registration is required either way — one registration, one
number, one brand. At a few hundred reminders a month this is **under $5/month**.
*Sources: [APIScout Twilio vs Plivo vs Telnyx 2026](https://apiscout.dev/guides/twilio-vs-plivo-vs-telnyx-sms-voice-api-2026), [Sinch SMS API comparison](https://sinch.com/blog/the-best-sms-api/).*

**8.2 phone testing — he has an iPhone 15 Pro Max and nothing else.** He asked
how real teams test phones they do not own. **That research is not done yet and
is now a task** — see 8.6. Do it before planning the mobile wave.

**0.4 legal — no lawyer. Andrew's ruling:** *"If you could find the templates,
then just edit them. Then we shouldn't need a lawyer."* Accepted. 7.7 and 7.8
stay as written and the template work folds into them. **A business entity is
still worth doing** and is his to start, not ours.

- [ ] **8.6 — Research how to test phones we do not own, then write the method down.**
  He has one device. Real teams do not own every phone either. Find out what
  they actually do — device farms, emulation limits, what genuinely cannot be
  caught without hardware (keyboard behavior, safe-area insets, scroll chaining,
  Safari's dynamic toolbar). **Write it into `docs/testing/` as a method, not a
  finding.** Blocks the mobile wave from being planned on guesses.

---

## Adopting the operating-system report

`docs/operating-system-report-2026-09-16.md` is the research Andrew commissioned.
**Its headline finding independently matches what this repo already knew**: the
root problem is that a check can print "clean" having tested nothing, which
makes every other process unsafe. It calls the fix **proof-carrying work** — no
green verdict without a machine-readable receipt showing targets discovered,
attempted, completed, assertions run, skips, and a deliberately broken canary
that had to fail.

**Do not adopt the whole report at once.** Its own § 6 says so, and this repo's
history of accreting process is exactly what that warning is about. Its
week-one sequence, which supersedes starting at Wave 1 of this file:

1. Tag the repo before any prune (`pre-doc-prune-2026-09-16`).
2. Define the verification receipt schema and a validator.
3. Take one sweep that has lied before — `sweep-widths.mjs` printed *clean* over
   38 real findings — and add expected target counts, per-route sentinels,
   fail-on-zero, and a deliberately broken canary.
4. Make it emit a contact sheet and a receipt.
5. Use that certified check on one high-risk item from this file.
6. Build the tenant-isolation matrix next.
7. **Only then** prune docs and convert the rest of this file into task contracts.

**What is already true here and needs no work:** `CLAUDE.md` is 192 lines
against its 200-line ceiling; the role/lane system it says to drop is already
gone; migrations are already append-only. **What it flags that this repo has
not done:** `docs/archive/` is inside the agent's search space, which the report
explicitly warns against — git history is the archive. Revisit at step 7.
