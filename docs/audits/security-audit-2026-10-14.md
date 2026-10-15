# Security and data audit — 2026-10-14

Read-only review of the repository at commit `3501cde0` (`main`). Nothing was changed, deployed,
or run against the database or production. Every finding below was checked against the code
and cites `file:line`. **This audit covers the code in the checkout only.** CLAUDE.md warns
that deployed functions can differ from the checkout, and nothing here was compared against
what is live (`scripts/deployed-inventory.mjs` was not run, because it needs credentials).

Scope: Supabase migrations (RLS, grants, definer functions), all 43 edge functions, auth
flows, tenant isolation, secrets in the repo and its history, Stripe handling, input
validation, PII handling, and backups. The two September audits in this folder were UX
audits. Their only security items were P1-10 (calendar links) and P0-07 (recovery), and
neither is repeated here.

**Counts: 0 critical · 2 high · 8 medium · 9 low.** Known items that are already tracked are
listed at the end and are not counted.

---

## High

### H1 — Anyone who knows a customer's name, phone and booking time gets back the whole booking row
- **Evidence:** `supabase/functions/create-booking/index.ts:65-75`. `sameBooking` runs
  `.select("*")` on `bookings`, matching on business, `start_at`, `customer_phone` and
  `customer_name`. At `:260-263` the public caller receives it:
  `return json({ booking: mine, duplicate: true });`. It also writes SMS consent for that
  customer (`:262`, `saveBookingSmsConsent(... body.sms_consent ...)`). The only gate before
  this is the per-IP public ceiling (`:128`).
- **Impact:** This exit exists so a customer's retry is answered safely, but it answers
  anyone. Someone who knows a person's name and phone (an ex-partner, a neighbour) can try
  likely times on a detailer's public page. On a match they get the full record: email, home
  address, notes, the detailer's private `admin_notes`, and the booking id. The booking id is
  the customer's link for viewing, cancelling and rescheduling. The same call can also switch
  that customer's text consent on or off.
- **Fix:** On the duplicate exit, return only what the widget needs to show "you're booked"
  (id, start time, status). Better still, require something only the original request had,
  such as a client-generated idempotency key sent with the first press. Never return
  `admin_notes`. Do not write consent on the duplicate path.

### H2 — The reminder sweep is public, and running it twice at once sends every reminder twice
- **Evidence:** `send-owner-reminders` is in `PUBLIC_FUNCTIONS` (`scripts/deploy-functions.mjs:36`).
  The sweep branch has no caller check (`supabase/functions/send-owner-reminders/index.ts:210`
  onward). Only the manual branch calls `requireMember` (`:183`). Each send happens before
  its marker is written: `await sendOwnerReminder(b); await mark(b.id, "owner_reminder_sent_at");`
  (`:242-243`), and the same pattern repeats at `:256-258` and `:266-268`. There is no claim
  step. The response returns booking ids and error strings (`:583`).
- **Impact:** Anyone on the internet can trigger the sweep as often as they like. Two calls
  that overlap both read the same "due" list before either writes a marker, so customers and
  detailers get duplicate reminder emails and pushes. Each duplicate also spends the shared
  daily email allowance (see M5). The comment at `:210` calls the sweep "idempotent", but that
  only holds for calls made one after another.
- **Fix:** Gate the sweep on a shared secret header that pg_cron sends, or move the call to a
  service-role-only path. Change the order to claim first and send second: an
  `UPDATE … SET marker = now() WHERE id = … AND marker IS NULL RETURNING`, and send only if a
  row came back. `watch-jobs` already uses a claim pattern.

---

## Medium

### M1 — A detailer can mark any domain as "verified", or keep the badge after switching domains
- **Evidence:** Insert is allowed with only a tenant check
  (`supabase/migrations/20260904000000_custom_roles.sql:155-157`). The later lockdown revokes
  UPDATE only and grants back `update (domain)`
  (`20260907003000_column_revokes_actually_apply.sql:82,88`). INSERT is never revoked, so a
  member with `settings` permission can insert a row with `verified_at` already filled in.
  They can also verify domain A and then rename the row to domain B, and `verified_at`
  stays. Separately, every domain that points at the platform returns the same marker
  (`supabase/functions/verify-domain/index.ts:35`, `MARKER = "detailing-platform-host-v1"`).
  Domains are globally unique (`20260827000100_tenant_core.sql:124`).
- **Impact:** A tenant can claim a domain they do not own, such as a competitor's domain or
  the platform's own. The dashboard and the back office then show it as "Live", and the real
  owner can no longer add it because the name is taken.
- **Fix:** `revoke insert on business_domains from authenticated` and add domains through an
  edge function. Also revoke `update (domain)`, or clear `verified_at` with a trigger whenever
  `domain` changes. Make the marker unique per row (serve `verification_token`) instead of
  one shared string.

### M2 — Another tenant can insert lines into a business's receipts and invoices
- **Evidence:** `booking_services`, `booking_add_ons` and `booking_line_items` reference
  `bookings(id)` by `booking_id` alone (`20260827000200_tenant_data.sql:292,308,321`). Their
  policy checks only the row's own `business_id` (`:394-397`, the `_tenant_all` loop). The
  public receipt and the invoice join through the foreign key with the service role and no
  business filter: `services:booking_services(...)` and `add_ons:booking_add_ons(...)`
  (`supabase/functions/get-booking-receipt/index.ts:84-85`,
  `supabase/functions/send-invoice/index.ts:73`).
- **Impact:** A detailer in business A who learns a booking id from business B can insert a
  `booking_services` row with A's `business_id` and B's `booking_id`. The id is the receipt
  link, so a detailer who is also B's customer already has one. The forged row then appears
  on B's customer receipt and B's emailed invoice, so a stranger can add items to another
  business's paperwork.
- **Fix:** Add a composite foreign key `(booking_id, business_id) → bookings(id, business_id)`
  on all three tables (this needs a unique constraint on `bookings(id, business_id)`). Also
  add `.eq("business_id", …)` filters to the embeds.

### M3 — Staff permissions are enforced only in edge functions. Direct database access ignores them
- **Evidence:** `customers` and `bookings` get `for all to authenticated using (business_id in
  (select current_business_ids()))` (`20260827000200_tenant_data.sql:394-397`). Bookings had
  UPDATE revoked later (`20261006040000_bookings_browser_updates_nothing.sql:50`), but DELETE
  was not. `customers` has no revoke at all. `delete-customer` requires the owner
  (`supabase/functions/delete-customer/index.ts:63`), but a staff member can call the REST
  API directly.
- **Impact:** Any staff login can hard-delete bookings (the money record, with line items
  removed by cascade) and edit or delete customer rows, whatever permissions they were given.
  This skips the owner-only rule and the photo clean-up that `delete-customer` does. A
  departing employee could wipe records.
- **Fix:** `revoke delete on bookings from authenticated` (the app already soft-deletes with
  `deleted_at`). Revoke insert, update and delete on `customers` and route those writes
  through edge functions, or add restrictive policies that require
  `has_business_permission(...)` for writes.

### M4 — Support ("view as") sessions never end, and the read-only rule does not cover the login system
- **Evidence:** `supabase/functions/platform-admin/index.ts:1177-1221` creates a real owner
  session through a magic link and returns both `access_token` and `refresh_token`. Nothing in
  `support_sessions` or `_shared/supportSession.ts` holds an expiry, and nothing ends the
  session. Read-only is enforced by RLS and `requireMember`. Supabase Auth itself (for
  example `updateUser` to change password or email) does not consult `support_sessions`. The
  only guard is in the browser (`app/src/lib/supabase.js:117`).
- **Impact:** Each "view as" leaves a refresh token that keeps working until the owner signs
  out everywhere. Anyone who lifts it from the admin's browser can keep reading that
  business, and can change the detailer's password or email through the Auth API, which the
  read-only rule does not cover.
- **Fix:** Give the marker an `expires_at` (for example 30 minutes) and check it in
  `is_support_session()` and `isSupportSession`. Do not return the refresh token. Revoke the
  session (`auth.admin.signOut`) when the view ends or expires.

### M5 — One tenant's campaigns can use up every other tenant's booking emails for the day
- **Evidence:** `send-campaign` caps each press at 50 (`supabase/functions/send-campaign/index.ts:53,119`)
  but has no per-day or per-tenant cap. `claim_email_send` keeps one pool for all tenant mail:
  `v_budget := … greatest(v_cap - coalesce(v_reserve, 0), 0)` (latest definition in
  migrations; the fix list notes the cap is 100 a day). Recipients are whatever customer rows
  the detailer created (`:100-103`).
- **Impact:** Two presses by one detailer can spend the day's tenant allowance. After that,
  every other detailer's confirmations and reminders are refused until midnight. A bad actor
  could also add made-up "customers" and use the platform's sending domain to spam them, 50
  at a time.
- **Fix:** Give each business a daily share (or a campaign-specific daily cap) inside
  `claim_email_send`, and keep transactional mail ahead of marketing. Consider capping
  campaigns to customers who have at least one booking.

### M6 — "Delete for good" leaves the customer's email address and full email copies behind
- **Evidence:** `forget_customer` (`supabase/migrations/20260907001000_forget_customer.sql`)
  was written on 2026-09-07 and never updated. It anonymises `bookings` and deletes
  `customers`. `email_sends` came later, with `customer_id … on delete set null` and
  `to_email text not null` (`20260916010000_every_email_leaves_a_row.sql:56,58`). It now also
  stores `body_html` (`20261010010000_email_sends_keeps_the_body.sql:20`), whose own comment
  says it holds "the customer's name, address and phone".
- **Impact:** After a detailer erases a customer, the customer's address, phone, name and
  every email sent to them are still in the database, visible in the detailer's mail log.
  The privacy page says "it is deleted" (`app/src/landing/legal.js:289`), so the product
  breaks its own promise.
- **Fix:** In a new migration, extend `forget_customer` to delete (or blank `to_email` and
  `body_html` on) that customer's `email_sends` rows, matched by `customer_id` and by
  booking. Add a test that lists every table with a customer-identifying column, so the next
  new table cannot be missed.

### M7 — Restoring a backup silently drops the database's permission lockdown
- **Evidence:** The nightly backup runs `pg_dump --no-owner --no-privileges` (`docs/ops/backups.md:20`,
  `docs/recovery.md:125`, `docs/ops/backup.workflow.yml:101`). `--no-privileges` leaves out
  every GRANT and REVOKE. This product's security model depends on revokes, such as
  `20260921000000_revoke_locked_table_grants.sql` (platform admins, Stripe events, rate
  hits), the column revokes in `20260907003000_column_revokes_actually_apply.sql`, and the
  definer sweep in `20260913005000_definer_execute_swept.sql`.
- **Impact:** A database restored into a fresh Supabase project gets Supabase's default
  grants back. For example, `authenticated` could write `platform_admins`, and anon and
  authenticated could execute every definer function. The restore would look like it worked
  while the protections were gone. The restore runbook's census step compares rows, not
  privileges.
- **Fix:** Drop `--no-privileges` (keep `--no-owner`), or re-run every migration's GRANT and
  REVOKE statements after a restore. Add a privileges comparison to the restore check
  (`migration-drift.mjs` already compares grants).

### M8 — Backups keep customer data for ever, which contradicts the deletion promise
- **Evidence:** "every backup for 30 days, plus the 1st of each month for ever"
  (`docs/ops/backups.md:23`, `docs/recovery.md:131`). The privacy page says deletion means
  deletion (`app/src/landing/legal.js:289`) and does not mention backups.
- **Impact:** A deleted customer, or a closed and deleted business, stays in every monthly
  backup for ever. Today that is a legal and trust risk rather than a breach. Under
  California privacy law, a customer can reasonably ask about it.
- **Fix:** Limit monthly backups to a fixed period (for example 12 months), and add one
  sentence to the privacy page about how long backups are kept.

---

## Low

- **L1 — Background jobs anyone can trigger.** `refresh-weather`, `watch-jobs`,
  `photo-reconcile` and `session-ping` are public (`scripts/deploy-functions.mjs:25-47`).
  `refresh-weather` takes no caller check and writes to every tenant's bookings
  (`supabase/functions/refresh-weather/index.ts:68-90`). *Impact:* repeat calls cost
  invocations and the weather provider's goodwill. *Fix:* the same cron secret header as H2.
- **L2 — The card-payment webhook does not check that money actually arrived.**
  `stripe-webhook/index.ts:609-666` marks a booking `paid` on `checkout.session.completed`
  without checking `payment_status === "paid"` or the amount. *Impact:* a delayed-payment
  method could mark a job paid before the money arrives (Stripe is not live yet). *Fix:*
  require `payment_status === "paid"` and an amount match.
- **L3 — Public price check can cost geocoding credits.** `calculate-booking` geocodes any
  address nobody has used before (`calculate-booking/index.ts:110-118`) and is bounded only
  by the per-IP ceiling (`:36`). *Fix:* use the address-typing budget here too.
- **L4 — Any logged-in user can run plan accrual for every tenant.**
  `accrue_plan_visits()` is `grant execute … to authenticated`
  (`20260904002000_plans.sql:322`) and still a definer function
  (`20261010030000_support_sessions_read_only.sql:92`). It is idempotent, so the impact is
  load only. *Fix:* service role only.
- **L5 — Push subscriptions are shared across a business.** `owner_push_subscriptions` uses
  the business-wide `_tenant_all` policy (`20260827000200_tenant_data.sql:389`), so any
  staff member can read or delete the owner's push endpoints. *Fix:* add a `user_id` and
  limit rows to `user_id = auth.uid()`.
- **L6 — Domain verification follows redirects.** `verify-domain/index.ts:95`
  (`redirect: "follow"`) fetches a host the user supplied and follows redirects. Only the
  HTTP status comes back, so this is a limited server-side request risk. *Fix:* use
  `redirect: "manual"`.
- **L7 — The "current password" check is only in the browser.**
  `app/src/screens/more/Password.jsx:84-89` signs in again on the client, then calls
  `updateUser`. A stolen session token can skip the check. *Fix:* turn on Supabase Auth's
  "secure password change" setting (it could not be verified from the repo).
- **L8 — The public site names the back-office login.** `app/public/map.html:532` ships the
  master admin's email address, with an old password beside it, on detailingplatform.com. `docs/platform-admins.md` says the
  password has since changed and is "guessable on purpose", so the page hands out half of
  an admin login. *Fix:* remove the line (12.4 already plans to rotate the account).
- **L9 — No Content-Security-Policy on the main site.** `app/netlify.toml` sets
  `X-Frame-Options`, `nosniff` and `Referrer-Policy`, and adds `frame-ancestors` only on
  `/book/*`. There is no script or connect policy. *Fix:* add a CSP limited to self,
  Supabase and the photo host.

---

## Checked and sound (short)

- **Secrets:** a scan of all 1,635 tracked files for live key shapes found nothing real.
  The only hits were AWS documentation sample keys in `tests/photo-door-server.test.mjs`.
  `.env` and `app/.env.local` are ignored. The frontend reads only `VITE_SUPABASE_URL` and
  the anon key. Edge-function logs do not print customer emails or phones.
- **Tenant resolution:** `_shared/tenant.ts` takes the business from the slug or from
  membership, never from the request body. `requireMember` refuses support sessions by
  default.
- **Stripe webhook:** connected-account events are checked against the booking's own
  connected account (`stripe-webhook/index.ts:630-637`), so one detailer cannot mark
  another's jobs paid.
- **`send-email`:** requires the service-role bearer (`send-email/index.ts:182-183`).
- **Service worker:** caches only same-origin GETs, never Supabase API responses
  (`app/public/sw.js`).
- **Invite tokens:** 192 bits of randomness (ROADMAP 14.13).

## Already tracked — not counted, not re-opened

- The demo detailer and the master admin login have guessable passwords and back-office
  access; old values sit in public git history (commit `c9f0f0e4`); the master password
  is in plain text in `platform_admins.note`. ROADMAP **12.4 / 14.8**, `docs/platform-admins.md`.
- Public read endpoints without a rate limit, and three write endpoints waiting on a
  publish. ROADMAP **14.9 / 14.9a**.
- No restore has ever been proven, and Storage is not in the backups. ROADMAP **6.1a / 6.1b**,
  `docs/ops/backups.md` §2.
- Support view banner and audit record. ROADMAP **4.3 / 4.3c / 4.3d**. M4 above is a new
  gap inside that work: expiry and the login system.
- MFA: Andrew ruled it out permanently on 2026-09-21 (ROADMAP line ~15032).

---

## Suggested roadmap items

- Trim `create-booking`'s duplicate-booking response to id, time and status, and stop writing consent on that path (H1).
- Put a cron secret on `send-owner-reminders`, `refresh-weather`, `watch-jobs` and `photo-reconcile`, and make every reminder claim its marker before sending (H2, L1).
- Revoke INSERT and `update(domain)` on `business_domains`, clear `verified_at` when the domain changes, and use a per-row verification marker (M1).
- Add composite `(booking_id, business_id)` foreign keys on `booking_services`, `booking_add_ons` and `booking_line_items` (M2).
- Revoke direct DELETE on `bookings` and writes on `customers` for `authenticated`; route those writes through permission-checked functions (M3).
- Give support sessions a 30-minute expiry, stop returning the refresh token, and revoke the session when the view ends (M4).
- Give each tenant its own daily email share inside `claim_email_send`, with booking emails ahead of campaigns (M5).
- Extend `forget_customer` to cover `email_sends`, and add a test that lists every table holding customer PII (M6).
- Drop `--no-privileges` from the nightly dump, and check grants in the restore census (M7).
- Limit monthly backups to a fixed period and state it on the privacy page (M8).
- Require `payment_status === "paid"` and an amount match before marking a booking paid online (L2).
- Add a Content-Security-Policy for the whole site (L9).
