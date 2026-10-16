# Product readiness audit — 2026-10-14

**Scope.** Would a paying detailer and their customers hit something missing,
confusing or unfinished? Covers onboarding, the booking flow end to end, phone
use, accessibility, search visibility (SEO), and the basics that competitors
treat as standard. Read-only: no code was changed and nothing was committed.
The live site was viewed in a browser. **No account was created and no booking
was submitted** — the booking walk stopped at the time-picking step (step 5 of 7).

**Method.** Code was read at the working tree on 2026-10-14. The live site
`detailingplatform.com` was checked the same day with a desktop window and a
390x844 phone-sized window. "Observed" means seen on the live site; a
`file:line` means read in the code. CLAUDE.md warns that the server is not
always running the saved code, so a code-only claim about a server function is
marked as code-only.

**Not repeated here.** The September audit (`docs/audits/comprehensive-audit-2026-09.md`,
54/100 for selling to strangers) and the fix list. Problems already filed there
or on ROADMAP.md are only mentioned when they still block selling.

---

## Ranked gaps

Ranked by what loses a sale or a booking first.

### 1. The platform cannot take a detailer's money, and a detailer goes live without paying

- **Evidence.** ROADMAP.md:24231-24253 (Wave 12): taking real money needs a
  parent named as owner of the Stripe account, and 12.1 is still waiting on
  the test key. `supabase/functions/_shared/stripe.ts:97`: `stripeConfigured()`
  is false when the key is missing. The signup flow sends a detailer who picked
  a plan to `?settings=billing` (`app/src/screens/CreateBusiness.jsx:100`), but
  nothing in `create-booking` or `available-slots` checks billing, so the
  booking page works without payment. This is still open as BUSINESS-RULES.md
  "Still to decide" #7.
- **Observed.** Every "Choose this" button on `/pricing` goes to
  `/app?plan=…&offer=founding`, an open form for email and password.
- **Why it matters for sales.** You cannot charge the first customer. An open
  signup with no payment gate also means strangers get a free, working booking
  page with no support plan behind it.
- **Fix.** Settle #7. Recommendation: until Stripe is live, hide self-serve
  signup behind an invite or founding-application form, and give each pilot
  user an account created in the back office (`create-business` already
  supports this, `supabase/functions/create-business/index.ts:47-72`).

### 2. The website plan sells "built for you", but signup is a self-serve form with no next step

- **Evidence.** The home page promises "A site built for you … not a template"
  and says "No setup wizard and no migration. You are bookable the same day"
  (`app/src/landing/LandingPage.jsx:1040`). After signup, the first thing an
  owner sees is a **12-step setup wizard** (`app/src/lib/setup.js:85-98`,
  opened automatically at `app/src/App.jsx:299-310`), and the catalog starts
  empty: no starter services and no sample data (`supabase/functions/_shared/newBusiness.ts:41-47`).
  Nothing after signup books a call with the builder, starts the website intake
  form (`docs/tenant-site-intake-form.md`) or says when the site will arrive.
- **Why it matters for sales.** A $499–$999 buyer is told "built with you" and
  then left alone with a form. The "no setup wizard" claim is false on the
  first screen they see.
- **Fix.** After a website-plan signup, show a "what happens next" screen:
  book the kickoff call, start the intake form, expected delivery date. Offer
  starter services for detailers (an exterior, an interior, a full detail,
  with editable prices). Change or remove the line on LandingPage.jsx:1040.

### 3. No way to bring existing customers in

- **Evidence.** There is a customer export (`app/src/lib/customer-export.js`,
  `Clients.jsx:432`) but no import: no CSV parser or upload anywhere in
  `app/src` or `supabase/functions`.
- **Why it matters for sales.** Every buyer is switching from something: a
  phone, Square, Urable, a spreadsheet. Their customer list is their business.
  "Your data leaves with you" is promised, but their data cannot come in.
  Square, Jobber and Urable all import customers from a CSV file.
- **Fix.** A CSV import for customers (name, phone, email, address, vehicle,
  notes) through an edge function, with a preview, duplicate matching on phone
  or email, and an undo for the batch.

### 4. Tenant booking pages are invisible to Google and share the platform's link preview

- **Observed.** `https://detailingplatform.com/robots.txt` and `/sitemap.xml`
  both answer **200 `text/html`**, which is the app's own page rather than a
  real file. Nothing exists in `app/public`. The raw HTML of `/book/demo-detail`
  carries `<title>Detailing Platform</title>` and the platform's marketing
  description. Even after the page loads, `og:title` still reads *"A website
  for your detailing business, and the dashboard that runs it"*. There is no
  `og:image` and no JSON-LD anywhere (code: `app/index.html:75-102`; there is no
  prerendering, and `app/netlify.toml` sends `/*` to `index.html`).
- **Why it matters for sales.** The home page promises *"Your own address on
  Google"* (`LandingPage.jsx:567`). When a detailer texts their booking link to
  a customer, the preview advertises the platform to the customer. A booking-only
  ($35) tenant has no other web presence, so Google sees nothing. The static
  tenant websites are crawlable, which is good, but they carry no
  `LocalBusiness` schema either.
- **Fix.** Add a real `robots.txt` and `sitemap.xml`. Set the description and
  Open Graph tags per tenant for `/book/:slug`, using a Netlify edge function
  that rewrites `<head>` from the business row. Add `LocalBusiness` JSON-LD
  (name, area served, phone, prices) to the booking page and to every tenant
  site template. Add a default share image.

### 5. No protection against no-shows: no deposit, no card on file, no way to pay while booking

- **Evidence.** ROADMAP.md:16583: *"A DEPOSIT. It does not exist in this product
  at all."* Card payment is only offered **after** booking, on the receipt page
  (`app/src/book/ManageBookingPage.jsx:722`). It needs the platform's Connect
  client ID (`supabase/functions/_shared/connect.ts:45`), which depends on
  gap 1. The cancellation fee is decided but not built (BUSINESS-RULES.md,
  "Bookings — decided 2026-10-12, not built yet").
- **Why it matters for sales.** For mobile detailers, a no-show means a wasted
  drive. Square, Urable and Jobber all take deposits or keep a card on file.
  It is the first question an experienced detailer asks.
- **Fix.** This is already queued behind 12.1 (ROADMAP.md:24460). Add **card on
  file** to the same design, because it is what a cancellation fee is actually
  charged against. Without it, the decided fee cannot be collected.

### 6. Reminders are email-only; texting is not live

- **Evidence.** `TEXTING.md:1-13`: the consent box is built, but no texting
  service is switched on. ROADMAP.md:186-189: 0.13 is waiting on 0.14, and 0.14
  (10DLC registration, the US approval needed to send business texts) waits for
  launch. Two-way texting only opens the phone's own messaging app (`BookingDetail.jsx:309`).
- **Why it matters for sales.** "Fewer people forget" (`LandingPage.jsx:781`)
  is the reminder pitch. Detailing customers read texts, not email. Text
  reminders are standard in all three competitors.
- **Fix.** On the roadmap already. Recommendation: start the 10DLC registration
  before launch day, because approval takes weeks, and it is what holds up the
  rest.

### 7. The phone's Back button leaves the booking, and a refresh loses everything

- **Observed.** The address stayed `/book/demo-detail` on every step from 1 to
  5. **Code:** the step lives only in React state (`app/src/book/BookingPage.jsx:170`),
  and moving between steps never touches the browser history (`BookingPage.jsx:494-498`).
  Nothing in progress is saved to the device (`core.js:1584,1624` saves the
  customer's details only after a successful booking).
- **Why it matters for sales.** On a phone, swiping back or pressing Back is
  how people move between screens. At step 5 of 7, that throws away the whole
  booking and the customer is back on the detailer's site. Most look-ups happen
  on a phone (CLAUDE.md, "Phones first").
- **Fix.** Put each step in the browser history (`?step=` with `pushState`) and
  save the draft in `sessionStorage` so it survives a refresh or a phone call.

### 8. The pricing page shows "Most take this" with zero customers

- **Observed** on `/pricing`, and in the code at `app/src/landing/PricingPage.jsx:478`.
- **Why it matters for sales.** PRODUCT.md says *"Never a 'most popular'
  badge"* and *"No testimonials, case studies, or customer counts exist —
  never fabricate them."* With no customers this is made-up social proof, on
  the page PRODUCT.md calls the legally load-bearing half of checkout (AB 2863,
  the FTC's Adobe case). It also pre-steers a choice on a page that promises
  *"Nothing on this page is chosen for you."*
- **Fix.** Delete the badge. Add a `landing-pricing` test that fails on it.

### 9. Prospects cannot try the dashboard before buying

- **Observed.** The only "try it" on `/` is the demo booking page. Seeing the
  dashboard, which the home page calls half the product, requires creating an
  account (`/app`). There is no demo login, video or guided tour, and the
  product tours were removed (`App.jsx:47-51`).
- **Why it matters for sales.** Jobber, Square and Housecall Pro all offer a
  free trial or demo. Here a $999 decision is made from mock-ups on the
  marketing page.
- **Fix.** A read-only demo dashboard that resets nightly (the seeded
  `demo-detail` tenant already exists), or a 90-second phone screen recording
  on `/`.

### 10. Booking-flow accessibility gaps

- **Observed.** Calendar days are `<div role="button" tabindex="0" class="cell">17</div>`.
  A screen reader hears only "17, button", with no month or weekday, and closed
  days (`class="cell closed"`) are not marked as unavailable to it.
- **Code.** Focus is not moved to the new step's heading when the step changes
  (it only scrolls, `BookingPage.jsx:497`). The submit and price-lookup errors
  are not announced to a screen reader (`BookingPage.jsx:950,958`, no `role`
  or `aria-live`). There is no skip link. The price "Try again" button is 34px,
  under the product's own 44px rule (`BookingPage.jsx:952`). There is no
  automated accessibility test (axe) in `tests/`.
- **Why it matters for sales.** US ADA lawsuits over websites target small
  businesses' booking pages, and the detailer is the one sued. A platform that
  sells sites needs to be able to say its pages are accessible.
- **Fix.** Give each day `aria-label="Saturday, October 17"` and
  `aria-disabled` on closed days. Move focus to the step heading on each change.
  Add `role="alert"` to the two error boxes. Add an axe pass to
  `sweep-booking-steps.mjs`.

### 11. Price lookups are slow and look like an error

- **Observed.** After a service was tapped, the fixed bar showed *"Working out
  your price…"* in a red-outlined box for about 2–3 seconds before showing
  $140. Every step waits on the server for the price.
- **Why it matters for sales.** Red reads as "something broke" in the first ten
  seconds on a detailer's page.
- **Fix.** Use neutral styling for the waiting state. Show the price worked out
  on the device (the rules already live in `core.js`) right away, and let the
  server confirm it.

### 12. Calendar sync is one file per booking

- **Evidence.** `supabase/functions/booking-ics/index.ts:1-4` makes one `.ics`
  calendar file per booking. There is no calendar feed a detailer can subscribe
  to, and no Google Calendar connection.
- **Why it matters for sales.** Detailers live in Google or Apple Calendar.
  Square and Jobber sync both ways. Without a feed, every booking means a
  manual step or two calendars.
- **Fix.** Start with a private, token-protected calendar feed per business
  (subscribe once, updates arrive by themselves). This is far cheaper than
  two-way Google sync.

### 13. Team scheduling stops at roles

- **Evidence.** Owner and staff roles exist, but assigning a job to one worker
  and keeping per-worker availability were deliberately deferred
  (`supabase/migrations/20260827003000_staff_roles.sql`, header). Buffer time
  is one flat number, not based on drive time (`available-slots/index.ts:297,388-390`).
- **Why it matters for sales.** The home page sells *"Unlimited … staff
  logins"* and *"What if I have staff?"*. A two-van operator cannot book both
  vans at the same 9 AM.
- **Fix.** Per-worker calendars, with capacity equal to the number of workers
  free at that time.

### 14. No waiver, vehicle check-in or customer sign-off

- **Evidence.** There is no waiver or signature code. Damage photos
  (`job_photos.kind 'damage'`, `20260906010000_job_photos.sql:76`) are the
  closest thing.
- **Why it matters for sales.** Urable leads with inspections. For ceramic
  coating and paint correction, a signed note of existing damage is what
  protects the detailer in a dispute.
- **Fix.** A short pre-job check-in: damage photos plus the customer's
  checkbox or signature on the receipt link, saved with a timestamp.

### 15. Smaller things a paying customer will notice

- No gift cards (Square sells these, and they are a holiday revenue line for
  detailers). Promo codes exist (`more/Promos.jsx`).
- No QuickBooks connection. The CSV export for an accountant
  (`lib/accountant-export.js`) is enough for now.
- Nothing can be changed offline. The last job list can be read without signal
  (`lib/offlineJobs.js`), but a job cannot be marked done in a driveway with no
  signal.
- The app icon is SVG only, with no PNG or apple-touch-icon
  (`app/public/manifest.webmanifest`, `index.html:35-38`). Adding the dashboard
  to an iPhone home screen may show a blank or screenshot icon.
- PRODUCT.md "Known open threads" still says *"email produces nothing in
  Resend"* and *"pg_cron never wired"*, though the same file says both were
  closed. A new session or reviewer reading it gets the wrong picture.

---

## What is already strong (so it is not re-litigated)

Detailer-specific pricing is a real advantage: vehicle size, condition,
service area and travel fees, weekend rates, add-ons, multi-car bookings and
maintenance plans. Other strengths: Spanish on both sides, quotes, invoices,
before and after photos, a customer history, promo codes, an export for the
accountant, a full data export, no commission, Stripe Connect payments that
take no platform fee, a honeypot field and rate limits against spam bookings,
customer reschedule and cancel, and owner push notifications. The static tenant
sites (`/examples`) look credible.

---

## Suggested roadmap items

None of these is on ROADMAP.md (checked by keyword on 2026-10-14).

- Invite-only signup (a founding application) until platform billing takes real money.
- A "what happens next" screen after a website-plan signup: kickoff call, intake form, delivery date.
- Starter detailing services offered at first setup, with editable prices.
- Remove or correct the "No setup wizard and no migration" line (`LandingPage.jsx:1040`).
- Customer CSV import with a preview, duplicate matching and an undo for the batch.
- A real `robots.txt` and `sitemap.xml`. Today both serve the app's HTML.
- Per-tenant `<title>`, description and Open Graph tags on `/book/:slug`, set before the page loads (Netlify edge function).
- `LocalBusiness` JSON-LD on booking pages and tenant site templates.
- A default share image (`og:image`) for the platform and for each tenant.
- Card on file for detailers' customers, so the decided cancellation fee can be collected.
- Each booking step in the browser history, plus a draft saved for the session.
- Remove the "Most take this" badge (`PricingPage.jsx:478`) and add a test that fails on it.
- A public, read-only demo dashboard that resets nightly, or a screen recording on `/`.
- Calendar days with full-date `aria-label` and `aria-disabled` on closed days.
- Focus moved to the step heading on each booking step change.
- `role="alert"` on the booking submit and price-lookup errors.
- An automated accessibility (axe) pass in the booking-step sweep.
- A neutral (non-red) style for the price "working out" state, with the price shown on the device first.
- A subscribable private calendar feed per business.
- Per-worker job assignment and availability.
- Pre-job vehicle check-in with the customer's acknowledgement.
- Gift cards.
- PNG and apple-touch-icon app icons.
- Update PRODUCT.md "Known open threads", which lists two threads closed in August.

---

## Ready to sell?

**No, not to strangers. Yes to two or three hand-picked pilot detailers,
signed up by hand, once the "Most take this" badge is removed.** The engine is
real and more detailing-specific than Square. What a stranger would hit first
is commercial, not technical. The product cannot take their money (gap 1). The
website plan has no next step after signup (gap 2). They cannot bring their
customers in (gap 3). Their booking link previews as an ad for the platform and
is invisible to Google (gap 4). There is no protection against no-shows
(gap 5). Gaps 1, 3 and 4 are each a short, well-understood job once billing
can be tested. Gaps 5 and 6 wait on outside accounts: Stripe ownership and the
10DLC texting approval. Start both before the code is ready.
