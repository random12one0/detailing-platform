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

## Follow-up work (visual direction, theming, staff accounts)

**Visual direction.** Every emoji is gone from the interface, replaced with
`lucide-react` line icons at a consistent 1.75 stroke weight. Status colors
carry meaning only (paid, cancelled, overdue); badges are outlined rather
than filled, and there are no streaks, progress rings or celebration states.
System copy is plain and declarative.

**Light and dark themes.** Both live in `app/src/theme.css` as one set of
CSS variables switched at the root (`data-theme`). No component contains a
hardcoded color — the app is styled entirely through tokens, so switching
themes touches one file. The choice is saved per user (browser storage) and
defaults to dark.

**Brand color.** The dashboard reads `business_branding.primary_color` — the
same value the public booking page uses — and applies it ONLY to accents:
primary buttons, the active tab, links, selected states. Page backgrounds,
card backgrounds and body text always come from the theme.
`app/src/lib/theme.js` enforces readability:

- The accent must clear a 3:1 contrast ratio against the active theme's
  background. If the chosen color fails, its lightness (not its hue) is
  stepped until it passes.
- The text drawn on accent surfaces is chosen by contrast — black or white,
  whichever actually reads — and must clear 4.5:1.
- Eight curated presets sit alongside the custom picker.

Verified in all four combinations with a real browser:

| Theme | Brand color | Rendered accent | vs background | text on accent |
|---|---|---|---|---|
| Dark | `#facc15` yellow | `#facc15` (unchanged) | 12.23:1 | 12.23:1 |
| Dark | `#1e3a8a` navy | `#315bd2` (lightened) | 3.17:1 | 5.90:1 |
| Light | `#facc15` yellow | `#a58504` (darkened) | 3.26:1 | 5.31:1 |
| Light | `#1e3a8a` navy | `#1e3a8a` (unchanged) | 9.57:1 | 10.36:1 |

**Staff accounts.** Owners invite people by email and role. The invite link
expires after 7 days, can be revoked, and cannot be reused. Removing someone
revokes access immediately, and the last owner of a business can never be
removed or demoted — enforced by a database trigger, so even the service
role cannot do it.

Roles are enforced in the database policies, not just hidden in the UI:

- **Owner** — everything.
- **Staff** — bookings, calendar, customers (contact details and visit
  history, but not lifetime spend). A staff session authenticated directly
  against the database gets **zero rows** from `expenses`,
  `business_settings`, `promo_codes`, `campaigns` and `campaign_visits`,
  and its writes to those tables are refused.

`node tests/staff-roles.test.mjs` proves this with a real staff JWT (35
assertions): the same queries return rows for the owner and nothing for
staff, invites behave correctly at every stage, removal is immediate, the
last owner is protected, and staff cannot promote themselves.

Per-employee job assignment and per-employee availability are deliberately
deferred — see DECISIONS.md.

## Test deployment (private)

The dashboard is deployed for device testing at
**https://detailplatform-admin-test.netlify.app** — a private test site, not
for real customers.

- Built from `app/`, with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
  set as Netlify environment variables (the anon key is a public client key;
  RLS is what protects the data).
- `app/netlify.toml` plus a `_redirects` catch-all send every path to
  `index.html`, so refreshing on `/job/<id>` or `/invite/<token>` works.
- The site URL is in Supabase's auth redirect allowlist, so login and invite
  links resolve.
- Re-deploy after changes by running, from `app/`:
  `npx -y @netlify/mcp@latest --site-id <site-id> --proxy-path <proxy>`
  (the site is not yet connected to the GitHub repo for automatic deploys).

Seed or re-seed the demo business with `node scripts/seed-demo.mjs`.

## Going live checklist (not part of this phase)

1. Schedule `send-owner-reminders` every 15 minutes (Supabase Cron).
2. Set function secrets: `RESEND_API_KEY`, `OWNER_VAPID_PUBLIC_KEY`,
   `OWNER_VAPID_PRIVATE_KEY`, `OWNER_VAPID_SUBJECT`.
3. Replace `detailplatform.com` in `_shared/config.ts` when the real
   domain exists, and verify it as the Resend sending domain.
4. Host `app/` (any static host) with the platform project's URL/anon key.
