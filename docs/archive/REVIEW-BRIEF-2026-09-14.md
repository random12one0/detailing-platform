# Review brief — full product inventory (read-only, 2026-09-14)

Dev server confirmed running at `http://localhost:5173`. Nothing in the repo was changed to produce this brief.

---

## 2. FULL ROUTE MAP

Router: `app/src/main.jsx` (react-router). Dashboard tabs are internal state in `app/src/App.jsx`. Admin is entirely internal state in `app/src/admin/AdminPage.jsx`.

### Public marketing site
```
/         | Marketing homepage                                    | signed-out visitor | typing the domain, or any "home"/logo link
/pricing  | Compare plans, pick one, AB-2863 disclosures          | signed-out visitor | "See pricing" / any plan button on landing
/terms    | Terms of service                                       | signed-out visitor | footer link
/privacy  | Privacy policy                                         | signed-out visitor | footer link
/examples | Static index of example tenant sites (ex1-ex5)         | signed-out visitor | "See it with your name on it" footer link
```
`/examples` and `/ex1`-`/ex5` are static files built by `scripts/build-examples.mjs`, served from `app/public` ahead of the SPA catch-all — outside the React router entirely, so they won't show up if anyone audits routes from `main.jsx` alone.
A business with its own verified custom domain gets ITS booking page at `/` instead of the marketing page.

### Public customer booking flow
```
/book/:slug            | The tenant's booking page, 7 steps          | signed-out customer | detailer's booking link, QR code, flyer, tracking link
  Step 1 Services       "Pick your services" / plan-aware variants
  Step 2 Extras         "Add-ons" (only if configured)
  Step 3 Vehicle        "Tell us about the vehicle"
  Step 4 Location       "Pick a place" / address / drop-off details
  Step 5 When            "Pick a time"
  Step 6 Details          "Your details"
  Step 7 Review            "Check everything over" / submit
/book/:slug (state)     "closed until {date}" — detailer set an away period
/book/:slug (state)     "isn't taking bookings online yet" — setup incomplete
/book/:slug (state)     "Page not found" — bad slug, or a suspended tenant (excluded by the public-profile lookup)
/book/:slug/plans       Browse/join monthly plans                     | signed-out customer | from booking flow's plan recognition, or shared directly
/booking/:id            Manage one booking — view/reschedule/cancel   | signed-out customer, UUID is the credential | link in every confirmation/reminder email, the receipt
/plan/:memberId          Customer's own membership page — pause/end   | signed-out customer, UUID credential | plan confirmation email link
/unsubscribe/:customerId Opt out of platform email                    | signed-out customer, UUID credential | footer of the one commercial email this product sends
```
"Booking confirmed" is not a route — it's a render-state of `/book/:slug` after submit.

### Detailer dashboard — `/app`
One route (`/app`) plus 5 bookmarkable shortcuts that resolve to the same screen: `/app/today`, `/app/calendar`, `/app/money`, `/app/clients`, `/app/business`. Tab clicks do `history.replaceState`.
```
/app (today)     Today's jobs, waiting requests, blockers notice   | detailer/staff | default tab after sign-in
/app/calendar     Month/day calendar, open a day's job panel       | detailer/staff | tab bar
/app/money        Revenue, expenses, "where it went" bars          | owner or staff with "money" permission | tab bar (hidden without it)
/app/clients      Customer list + filters, open a client record    | detailer/staff | tab bar
/app/business     Booking link/QR, setup-progress, settings rows   | owner or staff with "settings" permission | tab bar (hidden without it)
/job/:id          One job's full record, standalone route          | signed-in member of that business | bookmark/typed, or a push notification tap — SEE BUG below
```
Job record / client record open in-page as a "second column," not a separate route.

### Settings — two doors, 23 entries total (not the 19 CLAUDE.md/docs currently say)
`app/src/screens/more/index.js`, `Business.jsx`, `GearMenu.jsx`. Actual count: **14 under Business tab + 8 real screens under the gear + 3 non-form gear rows (tour / switch business / back-office link)**.

**Door A — Business tab (14, in 4 groups)**
```
What customers see:    Business info · Your color · Photo gallery · Reviews · FAQ
What you charge for:   Services & add-ons · Monthly plans · Promo codes & sale · How you get paid
When you can be booked: Hours & days off · Booking rules · Maintenance deadlines
Where customers come from: Your web address · Tracking links
```
All owner or staff-with-settings-permission, all reached via the Business tab.

**Door B — header gear (8 real screens)**
```
Notifications · Weather warnings · Message templates (anyone in business) · Team (owner only)
Your subscription (owner only) · Your password (anyone) · This device (anyone) · Report a problem (anyone)
```
Plus 3 non-form gear rows: **Show me around** (opens the Walkthrough overlay), **Switch business** (only shown if >1 membership), **The website business** (only shown to platform admins — full nav to `/admin`).

Every settings screen supports `?settings=<key>` deep-linking, read once at App mount. All are reachable by clicking, even though also typeable.

Nested "sub-screens" (Catalog's add-service drawer, Plans' edit-plan drawer, Notifications' preview drawer, Team's invite-link drawer, Booking rules' zone editor, Payments/Billing's Stripe card panel) are in-panel drawers, not separate routes.

### Sign-up / sign-in / password / invite / onboarding
```
/ (no session)                Auth screen — sign in / create account / forgot password | signed-out visitor | landing CTA, or /app with no session
(no session, no business)      CreateBusiness — name it, pick a slug                    | just-registered account | automatic after signup
/invite/:token                 Accept staff/owner invite, set password                  | invited person, may have no account | invite email (from Team screen or platform-admin)
/reset                          Password recovery — verify link, set new password        | someone with a recovery-hash session | "forgot password" in Auth, or the reset email
first-run setup wizard (7 questions) | what you sell / when you work / who you are        | a brand-new owner, business not yet set up | automatic on first login, or Business tab's "Finish setting up" row, or /app?setup=1
first-run tour                  Whole-dashboard guided walkthrough overlay               | new owner (post-setup) or new staff (immediately) | automatic once, or gear → "Show me around"
/website                        Redirect to /app?brief=1, 21-question site-intake form   | paying owner who hasn't submitted/dismissed it | link the platform owner sends, or automatic first time
/website/preview                 Standalone site-intake form, no session needed           | anyone, even signed out | shared preview link
```

### THE BACK OFFICE — `/admin`
Single route, entirely state-driven in `AdminPage.jsx`, outside `BusinessProvider`. Gate lives server-side only — the `platform-admin` edge function checks the `platform_admins` table under the service role. **The client route itself has no guard**, and a non-admin gets the SAME 404 as a bad URL anywhere else in the product (never a 403), so the page's existence can't be inferred by probing it.

```
/admin (signed out)            Sign-in form for the platform's own login        | anyone typing the URL | typing /admin, or gear → "The website business" (only shown to admins)
/admin (signed in, not admin)  Same generic 404 as the rest of the product      | any non-admin account | dead end by design
/admin (signed in, admin)      5 tabs, all client-side state, no sub-routes:
```
- **Today** ("now") — landing tab. "Nothing needs you" / "N things need you"; broken-plumbing alerts; customers waiting on an answer; detailers who need a call (reason + action); weekly checklist; MRR/business-count tiles. Default tab on load.
- **Growth** — where detailers are stuck (setup / bookability / first-booking / quiet / no-website — not mutually exclusive); founding-offer spots left; "not here yet": churn date, signup source, setup duration (none tracked). Click "Growth", or "See everyone" from Today.
- **Detailers** ("who") — searchable/filterable business list (chips: Everyone / Real detailers / Past due / Setup unfinished / No bookings ever / Quiet N days / No website yet); "Sign up a detailer" form (creates business + emails invite); click a row for the detail drawer.
  - **Detailer detail drawer** — 6-month chart; jobs/revenue/customers/last-booking/setup/subscription/bookability/website status; actions: open their site, open their booking page, email them, Suspend/Restore, **"Look at their dashboard"** (impersonation, opens `/preview` in a new tab), **"Download everything they own"** (JSON export), "Send an owner invite" if no owner account exists yet.
- **Money** — money-at-risk list (past-due/failed cards, reasons, mailto links); earnings-by-plan-tier; editable platform price table (change/save/revert to built-in); promo code usage; "not here yet": running costs, profit, Stripe payouts/disputes (none wired).
- **Plumbing** — scheduled-job heartbeats, external-watcher status, email-quota meter, photo-storage-quota meter, "not wired up yet": Stripe, Netlify, Resend, Supabase monitoring, uptime history. Dot indicator shown when an alert is active.

`/preview` is a **separate route**, outside `BusinessProvider`, opened in a new tab only by the "Look at their dashboard" button — a one-time impersonation token passed via URL hash, exchanged for a session scoped to that new tab (the admin's own tab is untouched). Not reachable any other way — a bare visit times out after 5 seconds with "This page is opened from the back office, not by typing the address." The impersonated dashboard shows a Look/Work banner with a toggle and Close, as a state of the normal `/app` shell.

### Reachable only from an email link or QR code
```
/book/:slug         detailer's booking link — also QR-encoded on the Business tab (hand-rolled QR encoder, no library)
/booking/:id         reschedule/cancel/view — in every confirmation, reminder, invoice, receipt email
/plan/:memberId       manage membership — plan-signup confirmation email
/book/:slug/plans     browse plans — plan-related email links
/unsubscribe/:customerId  opt out — footer of the one commercial email this product sends
/invite/:token         accept invite — invite email
/reset                  set new password — password-reset email
Google/Yelp review pages (external) — review-request emails link out, not to an internal screen
```

### State-only / empty / error screens
```
NotFound ("*")                       generic "That page does not exist." — mistyped links, and the /admin 404-for-non-admins
/book/:slug "not_found"                bad slug, also what a suspended tenant effectively shows
/book/:slug "closed until <date>"       detailer-set away period
/book/:slug "isn't taking bookings online yet"  setup incomplete — deliberately NOT a 404, so a half-set-up link still looks legitimate
/booking/:id "Booking not found" / "locked" (past cancellation window)
/plan/:memberId "Plan not found"
/unsubscribe/:customerId "We couldn't open this link" / "Done"
Suspended tenant (dashboard side): Today shows a past-due notice; booking page effectively 404s
Empty states (in-tab): "Nothing needs you right now" (admin Today), "Nobody has signed up yet" (admin Growth), "Everybody is taking bookings and nobody is past due" (admin Money), "Nobody matches that" (admin Detailers search)
```

### Flagged issues
1. **Real bug — push notifications send detailers to a 404.** Seven edge functions (`accept-quote`, `cancel-booking`, `create-booking`, `reschedule-booking`, `send-invoice`, `send-owner-reminders`, `update-booking`) build push-notification links as `/admin/job/{id}`. The real route is `/job/:id` — no `/admin` prefix; `/admin` is the separate back office and has no job sub-route. Tapping ANY push notification (new booking, quote accepted, reschedule, cancellation, invoice, reminder) currently lands on the generic 404. Not reachable by clicking through the UI — only found by tracing the push payloads.
2. `docs/sessions/product.md`'s settings count ("~19, split 13/6") is stale — actual is 22 real screens (14+8) plus the back-office link row.
3. Nothing else found that's dead, half-built, or click-unreachable in the normal sense — every settings screen, tab and admin tab has a click path, and every deep-link query param is also reachable by clicking. The admin Money and Plumbing tabs each have sections the UI itself labels "not here yet" (Stripe payouts/disputes, running costs, uptime history, etc.) — deliberately shown as unfinished rather than hidden.

---

## 3. ACCESS

- **Detailer login with realistic seeded data:** `demo@detailplatform.com` (business slug `demo-detail`). Password withheld per instruction. There's also a demo staff login, `demo-staff@detailplatform.com`, same pattern.
- **Back-office / platform-owner login:** in the current seed script (as of the 2026-09-13 change), the platform admin in the demo database is **the same account as the demo detailer**, `demo@detailplatform.com` — the seed script grants it admin automatically when targeting the platform's own Supabase project. This is **not** a separate account today, and it is **not** documented anywhere as your own real personal login — the `platform_admins` row's own note says "DEMO ONLY... Delete before launch." An older line in CLAUDE.md naming `demo@demo.com` as the master login is stale; the seed script uses `demo@detailplatform.com` for this role now. Password not written anywhere — CLAUDE.md forbids it; it lives in the `platform_admins.note` column via the service key. If you want a real, separate personal admin login instead of the demo account doubling as one, that would need a deliberate decision and a change to who's in `platform_admins` — nothing was changed here.
  - There is also an opt-in second admin account, `demo-admin@detailplatform.com`, created only if the seed is run with `--platform-admin`; its random password lands in the gitignored `scripts/demo-refs.json`, never in a tracked file.
- **Public booking URL / slug:** `/book/demo-detail`, in **request mode** (a booking becomes a request you accept/decline/quote, not an instant-confirmed slot).
- **Will look broken but isn't a real bug, purely dev-environment:**
  - No `RESEND_API_KEY` set → email sending silently no-ops (confirmations, reminders, invoices, campaigns won't actually arrive; nothing errors visibly).
  - Stripe runs in test mode — no real charges, Connect payouts use test-mode onboarding.
  - The live production domain isn't reflecting current work — Netlify build credits were exhausted; only localhost shows current code.
  - Stock Unsplash placeholder photos anywhere a tenant hasn't supplied their own.
  - Weather forecast returns blank (not an error) outside NWS US coverage or when its date range doesn't cover the date.
  - Address autocomplete returns a "not configured" response if the Geoapify key isn't set here.
  - Custom domain verification can't succeed against localhost (needs real DNS).
  - The referral system is gone on purpose (removed platform-wide) — its absence isn't a bug.

---

## 4. FEATURE LIST

**Booking & scheduling**
- Public multi-step booking widget, request or reserve mode — fully built
- Live price quoting mirroring the real charge engine exactly — fully built
- Promo codes, validated live and re-validated at submit — fully built
- Customer self-service reschedule — fully built
- Customer self-service cancel, gated by a cancellation window — fully built
- Detailer accept/decline/counter-quote on a request — fully built
- Customer accepting a detailer's quote — fully built
- Admin dashboard booking edit (allowlisted fields, soft-delete only) — fully built
- Address autocomplete during booking — fully built, degrades gracefully if unconfigured
- Weather forecast shown against upcoming jobs, hourly refresh — fully built
- Blockout dates / maintenance windows / advance notice / per-day caps / buffers — fully built, enforced server-side
- Calendar (.ics) file for a booking, customer + owner versions — fully built
- Public shareable receipt page — fully built

**Money**
- Stripe subscription billing for the detailer's own platform plan — fully built
- Stripe Connect payouts (detailer gets paid by customers) — fully built, test mode only here
- Stripe webhook handling with signature verification — fully built
- Invoicing, priced from the snapshotted booking — fully built
- Expense tracking / advanced money screen — fully built

**Communication**
- Automated reminders on a ~15-minute sweep — fully built
- One-off manual email campaigns to a picked customer list — fully built, deliberately not automated
- Transactional email — fully built, but no-ops without a Resend key here
- Unsubscribe / opt-out — fully built
- "Report a problem" — fully built
- Email preview tool — fully built
- Review collection — **partly built**: only outbound links to Google/Yelp in an email; no in-app review capture or display
- Referral program — removed platform-wide, on purpose

**Tenant sites / access**
- Custom domain verification — fully built
- Multi-tenant public booking pages, one shared bundle keyed by slug — fully built
- Example showcase tenant sites (/ex1-/ex5) — fully built, dev-only serving mechanism
- QR code generator for the booking link — fully built (hand-rolled, no library)
- Monthly plans / memberships — fully built
- Multi-vehicle bookings — fully built
- Customer self-delete ("forget me") — fully built

**Platform back office**
- Back office at /admin, reads only through one service-role function, never RLS — fully built
- Business data export for admin use — fully built server-side; no clear detailer-facing self-serve export found
- Staff invites / role-based permissions — fully built
- Dead-man's-switch monitoring of scheduled jobs, emails you on failure — fully built
- Push notifications to the owner — fully built
- Campaign/day-of tracking links — fully built
- Spanish / i18n for product-authored strings — fully built; does not (and shouldn't) translate a detailer's own free text
- Auto-translation of a tenant's own site content on save — fully built, best-effort/non-blocking
- Guided walkthrough / first-run tour — fully built
- Setup wizard / setup-progress — fully built, server and client compute the same number

---

*Full route inventory researched from source (main.jsx, App.jsx, admin/AdminPage.jsx, Business.jsx, GearMenu.jsx, book/BookingPage.jsx and related files), not from docs or memory. Access and feature-list researched from scripts/seed-demo.mjs and supabase/functions/**.*
