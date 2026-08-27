# Phase 2 — Booking Engine + Admin Dashboard

Phase 1 built the multi-tenant database. Phase 2 built everything that runs
on top of it: the server-side booking engine (edge functions) and a new
mobile-first admin dashboard. The old app stays untouched in `/reference`;
the old business's Supabase account was never touched.

## Part A — the booking engine (supabase/functions/)

14 functions, all deployed and tested on the platform project. Every one
takes a business context — public functions resolve the business from its
URL slug server-side; admin functions take the identity from the signed-in
user's verified membership. A request can never pick its own business.

**The two things preserved exactly from the old system** (its best work):

1. **Double validation.** `available-slots` computes what to *display*;
   `create-booking` independently re-checks every rule at *submit* time; and
   underneath both, the database's overlap constraint makes a double booking
   physically impossible. Three layers, deliberately not collapsed.
2. **One pricing engine.** `_shared/pricing.ts` computes both the quote the
   customer sees and the price that gets stored — they cannot drift. The
   server ignores every price a client sends.

**Fixed while porting:**

- Every hardcoded constant is now a `business_settings` read: buffer,
  advance notice, slot interval, max per day, max advance window,
  cancellation window, every reminder timing (evening-before rule included),
  price rounding, the site-wide sale.
- The broken `BUFFER_MINUTES` import in calculate-booking (it imported a
  constant that no longer existed) is gone with the constant itself.
- Timezone comes from the business row; the SQL reminder functions use each
  business's own timezone too.
- The vehicle-size surcharge has exactly one implementation (it used to
  have three).
- Emails moved out of inline HTML into `_shared/emailTemplates.ts` — a
  templating layer where brand name, colors, contact info, addresses and
  review links are all tenant variables. Testable under plain Node.
- All mail still flows through the one `send-email` relay — the provider
  (Resend) can be swapped by editing that single file. Mail is sent from
  the platform domain with the tenant's brand as display name and the
  tenant's own address as Reply-To.

**Added:** customer-facing `cancel-booking` and `reschedule-booking`
(fresh implementations — see DECISIONS.md), honoring each business's
cancellation window; a reschedule passes the same validation as a new
booking.

**Not ported** (per the brief): Google Calendar sync, the referral system,
monthly plans (pricing engine adjusted accordingly), and the dead functions.

The placeholder domain `detailplatform.com` lives in exactly one file:
`supabase/functions/_shared/config.ts`.

## Part B — the admin dashboard (app/)

A new Vite + React app. Five tabs at one URL (Today · Calendar · Money ·
Clients · More) switched by internal state, so a phone home-screen install
never breaks out to a browser. `/job/:id` is the one extra route — what a
push notification opens.

Old-dashboard problems fixed:

- **One write path for bookings.** New bookings, edits, reschedules,
  finalize-payment and soft deletes all go through the edge functions — the
  dashboard never writes the bookings table directly, so an owner-created
  booking passes the exact same hours/blockout/buffer/price checks as a
  customer's. (Settings-style writes — services, hours, promos, gallery —
  go straight through RLS, deliberately simple.)
- **No hard deletes.** Bookings soft-delete; services and add-ons
  deactivate.
- **Maps work on Android**: navigation links use Google Maps universal
  URLs, which open the native app on both platforms.
- **Real photo upload.** Gallery, logo and hero images upload from the
  phone straight to Supabase Storage into the business's own folder
  (storage rules block any other business's folder). No more pasting
  Cloudinary URLs.
- **One theme.** A single token file (`app/src/theme.css`) styles every
  screen, Money included.
- **"All Bookings" is folded into Calendar** as its List mode (with status
  filters), instead of being its own screen.
- **Settings warn, never block.** Booking rules outside a sensible range
  show a plain-language warning ("A 4-hour buffer means very few slots…")
  that can be dismissed once or permanently — but Save always works. A
  live count of open slots over the next 7 days (computed by the real
  availability engine) sits at the top of the rules screen so the effect
  of a change is visible immediately.
- **Zero hardcoded business identity.** The header brand, contact details,
  addresses, review links, colors — everything renders from the database.

Run it locally: `cd app && cp .env.example .env.local` (fill in the
platform project's URL + anon key) `&& npm install && npm run dev`.

## Testing

- `node tests/tenant-isolation.test.mjs` — Phase 1 suite, still 40/40 after
  every Phase 2 schema change.
- `node --experimental-strip-types tests/booking-engine.test.mjs` — 44
  assertions against the LIVE deployed functions: per-business slot grids,
  server-side pricing with forged client prices ignored, promo scoping,
  double validation (display vs submit), dashboard bookings hitting the
  same validation as customer bookings, buffer independence between
  businesses, settings-driven min/max advance, cancel/reschedule windows,
  email addressing routing (correct Reply-To, never the other tenant),
  storage upload scoping, and admin member gates.
- The dashboard was smoke-tested end-to-end in a headless browser against
  the live backend (login → all five tabs → booking rules with live slot
  count), zero page errors.

## Going live checklist (not part of this phase)

1. Schedule `send-owner-reminders` every 15 minutes (Supabase Cron).
2. Set function secrets: `RESEND_API_KEY`, `OWNER_VAPID_PUBLIC_KEY`,
   `OWNER_VAPID_PRIVATE_KEY`, `OWNER_VAPID_SUBJECT`.
3. Replace `detailplatform.com` in `_shared/config.ts` when the real
   domain exists, and verify it as the Resend sending domain.
4. Host `app/` (any static host) with the platform project's URL/anon key.
