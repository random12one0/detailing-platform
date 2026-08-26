# Phase 1 — Multi-Tenant Database

This phase built the new platform database only. No frontend, no dashboard,
no booking page. The old single-business app was moved untouched into
[`/reference`](../reference/) and is used purely as reference material.

Everything below lives in the **dedicated platform Supabase project** — the
old business's Supabase account was never touched.

## The idea in one paragraph

The old database could physically hold only one business: it had a
`business_info` table locked to a single row, one weekly schedule for the
whole system, and rules like "promo codes must be unique" that applied
globally. The new database starts from a `businesses` table — every detailer
who signs up becomes a row there — and every other table (bookings,
customers, services, hours, promo codes…) carries a `business_id` that says
which detailer it belongs to. Security rules at the database level make it
impossible for one business to see or touch another business's data, even if
the application code has a bug.

## Tables

**Tenant core**

| Table | What it holds |
|---|---|
| `businesses` | The tenant root: slug (used in URLs), name, status, plan tier, **timezone**, created date |
| `business_users` | Which login belongs to which business, with a role (`owner` / `staff`) |
| `business_settings` | Every booking rule that used to be a hardcoded constant (see below) |
| `business_branding` | Logo, primary/secondary color, hero image, tagline, about copy, social links |
| `business_domains` | Custom domain → business mapping with a verification token (built now, used later) |

**Business data** (all with a required, indexed `business_id`):
`services`, `add_ons`, `monthly_plans`, `promo_codes`, `campaigns`,
`campaign_visits`, `testimonials`, `gallery_images`, `business_hours`,
`booking_hours_overrides`, `blockout_dates`, `dropoff_only_periods`,
`customers`, `bookings`, `booking_services`, `booking_add_ons`,
`booking_line_items`, `expenses`, `owner_push_subscriptions`,
`owner_daily_digest_state`.

`booking_services`, `booking_add_ons` and `booking_line_items` are children
of a booking but still carry `business_id` directly, so their security
policies never need a join.

## What changed from the old schema

- **Flat services instead of packages.** The old `packages` table forced
  every business into interior/exterior × standard/deluxe/ultimate. The new
  `services` table is just: name, description, price, duration, per-vehicle-
  size adjustments, optional group label, active flag, sort order. Three
  services or fifteen, named anything. A booking's chosen services are
  recorded in `booking_services` with the price snapshotted at booking time.
- **Real timestamps.** Bookings store absolute instants (`start_at`/`end_at`
  with timezone), and each business's `timezone` column converts them to
  local wall-clock time. `America/Los_Angeles` is no longer hardcoded
  anywhere.
- **Every "unique" rule now includes the business.** Two businesses can both
  have promo code `SUMMER10`, campaign slug `golf`, their own weekly hours,
  and special hours on the same date. (These were all globally unique
  before and made a second business impossible.)
- **Double booking is impossible at the database level.** A `btree_gist`
  exclusion constraint rejects any two overlapping non-cancelled bookings
  for the same business — even two simultaneous requests, which the old
  check-then-insert code allowed. A booking ending exactly when another
  begins also counts as a conflict.
- **Soft delete.** Bookings have `deleted_at`; nothing is hard deleted.
  Services are deactivated, never deleted.

## Settings that replaced hardcoded constants

Defaults mirror the old system's behavior:

| Setting | Old hardcoded value |
|---|---|
| `buffer_minutes` (60) | 60 in two edge functions, plus a stale 30 in a shared module (which was a live bug — `calculate-booking` imported a constant that no longer exists) |
| `min_advance_minutes` (120) | "2 hours", duplicated in 4 places |
| `max_advance_days` (NULL = unbounded) | unbounded |
| `slot_interval_minutes` (30) | a bare `t += 30` in the slot loop |
| `max_bookings_per_day` (NULL) | didn't exist |
| `mobile_enabled` / `dropoff_enabled` | implicit, always on |
| `travel_radius_miles` / `travel_fee` | didn't exist |
| `ask_water_electric` | implicit, always on |
| `customer_reminder_lead_minutes` (120), `evening_before_*` (jobs starting ≤ 10:00 reminded at 19:00 the prior evening) | hardcoded in SQL reminder functions |
| `owner_nudge_lead_minutes` (30), `wrapup_nudge_lead_minutes` (20), `finalize_nudge_delay_minutes` (120), `daily_digest_hour` (7) | hardcoded in SQL + edge functions |
| `cancellation_window_hours` (24) | didn't exist |
| `price_rounding_nearest` (5) | pricing engine rounded to nearest $5 |
| `google_review_url`, `yelp_review_url` | hardcoded URLs in email templates |

## Security model

- `current_business_ids()` — a `STABLE SECURITY DEFINER` helper that returns
  the businesses the signed-in user belongs to.
- Every tenant table has one policy: you can only read/write rows whose
  `business_id` is in `current_business_ids()`. Sending someone else's
  `business_id` in a request body is rejected by the database — tenancy
  comes from the session, never the payload.
- `FORCE ROW LEVEL SECURITY` is on for all 25 tables (verified live).
- Anonymous visitors get **nothing** from the tables directly. The public
  booking page's data comes from one function,
  `get_public_business_profile(slug)`, which returns only public-safe fields
  (branding, active services/add-ons, hours, testimonials, gallery) for
  exactly one business, resolved by its URL slug. An unknown slug returns
  nothing; there is no way to list businesses.
- An `rls_auto_enable` event trigger automatically enables + forces RLS on
  any table created in the future, so a forgotten `ALTER TABLE` can never
  ship an unprotected table. (The old repo mentioned this trigger but never
  contained it; this one was written fresh.)
- The old `check_booking_conflict()` leak (anonymous calendar probing) is
  not reproduced: the new `is_slot_available()` runs as the caller, so
  normal row security applies, and anonymous users can't call it at all.

## Preserved from the old system (on purpose)

- The **pricing engine** (`reference/supabase/functions/_shared/pricing.ts`)
  and its **double-validation pattern** — the server re-computes every price
  and ignores client-sent numbers — are genuinely well built. They are not
  ported in this phase (no booking flow yet) but the schema was shaped so
  they port cleanly: services/add-ons keep price + duration, promo codes
  keep the same type/value/usage semantics, monthly plans keep
  percentage-or-amount discounts, and `price_rounding_nearest` carries the
  round-to-$5 behavior as a setting.
- The buffered-slot behavior (buffer applied on both sides of existing
  bookings) is preserved in `is_slot_available()`, now reading the buffer
  from `business_settings`.

## Files

- `supabase/migrations/20260827000000_foundation.sql` — extensions, shared
  triggers, `rls_auto_enable`
- `supabase/migrations/20260827000100_tenant_core.sql` — businesses,
  membership, settings, branding, domains + their policies
- `supabase/migrations/20260827000200_tenant_data.sql` — all tenant data
  tables, the no-overlap constraint, the standard tenant policy
- `supabase/migrations/20260827000300_helpers.sql` — timezone conversion,
  `is_slot_available`, the public profile function
- `scripts/apply-migrations.mjs` — applies the migrations via the Supabase
  Management API
- `tests/tenant-isolation.test.mjs` — the 12-test suite below

## Tests

Run on every future schema change:

```
node tests/tenant-isolation.test.mjs
```

Needs `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and either
`SUPABASE_ANON_KEY` or `SUPABASE_ACCESS_TOKEN` + `SUPABASE_PROJECT_REF`
(already set in this environment). The suite creates two throwaway
businesses (one in Los Angeles, one in New York) with two throwaway logins,
then verifies all 12 requirements from the Phase 1 brief: shared promo
codes/slugs/hours/dates, zero cross-tenant reads, no cross-tenant
writes-by-UUID, forged `business_id` rejection, no anonymous enumeration,
the simultaneous-booking race, back-to-back rejection, per-business buffer
independence, and DST-safe per-business timezone math.

Current status: **40 assertions, all passing** against the live platform
project.
