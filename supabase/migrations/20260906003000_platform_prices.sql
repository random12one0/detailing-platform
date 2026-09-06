-- ROADMAP 4.4 STAGE 4 — platform settings, which has exactly one job: HIS OWN
-- PRICES.
--
-- The owner, 2026-09-05: *"Everything that could be a changeable fact should
-- be linked to Supabase."* The audit that answered him found almost nothing
-- that qualified — most of what looks like a constant in this repo is a rule
-- rather than a fact. **This is the one case a database genuinely wins**, and
-- it wins for a reason that has nothing to do with editing convenience: the
-- price table is TYPED TWICE ON PURPOSE (`app/src/landing/pricing.js` and
-- `supabase/functions/_shared/platformBilling.ts`, because a Deno bundle
-- cannot import out of `supabase/` — the wall that forced
-- `_shared/brandColor.js`), and 263 checks exist to keep the two copies equal.
-- **One row makes them one number.**
--
-- ---------------------------------------------------------------------------
-- NULL MEANS "USE THE BUILT-IN TABLE", AND THAT IS THE STATE THIS SHIPS IN.
-- ---------------------------------------------------------------------------
-- Not an empty object, not a copy of the file seeded in: NULL. The two files
-- keep their tables, keep being pinned to each other by the test, and remain
-- what the product charges until somebody deliberately overrides them. A
-- seeded copy would be a THIRD place the same numbers live, and the moment the
-- files changed it would be the stale one — silently, because it is the one
-- that wins.
--
-- IT ALSO MEANS THE FAILURE MODE IS THE OLD BEHAVIOUR. A read that errors, a
-- row that will not parse, a key that is missing, a price that is not a
-- positive number: every one of those falls back to the file, which is what
-- the product charged yesterday. **The alternative is a checkout that prices
-- from a half-read object**, and this repo's oldest rule is that a number
-- PRINTED is not a number CHARGED — here they are the same number, which is
-- the whole point, so a broken override must charge nothing new rather than
-- charge something wrong.
--
-- AND AN EDIT CANNOT RE-PRICE ANYBODY WHO ALREADY BOUGHT. Every figure is
-- snapshotted onto `platform_subscriptions` at purchase and never re-read
-- (roadmap 2.20 stage 2), so this table decides what the NEXT person is
-- offered and nothing else. The exit fee is the sharp case that rule was
-- written for: recomputing it from a later config turns a $240 fee into $360.
-- ONE COLUMN. Who changed it and when are already answered elsewhere —
-- `platform_admin_events` records every write this back office makes, and the
-- table's own `updated_at` trigger has existed since 2026-08-28 — so a
-- `prices_by` column here would be a third copy of a fact two places already
-- hold.
alter table public.platform_settings
  add column if not exists prices jsonb;

comment on column public.platform_settings.prices is
  'Overrides the built-in price table. NULL means the files decide, which is the default and the fallback for anything malformed. Shape: the PRICES object in supabase/functions/_shared/platformBilling.ts.';

-- ---------------------------------------------------------------------------
-- HOW A VISITOR READS IT. `platform_settings` has RLS enabled and NO POLICIES
-- (2026-08-28), deliberately — nothing reads that table directly. The founding
-- count is already published through a `security definer` function for exactly
-- this reason, and the price is the same kind of fact: it is printed on a
-- public marketing page, so there is nothing to protect, and a definer
-- function keeps the table itself unreachable.
-- ---------------------------------------------------------------------------
create or replace function public.platform_prices()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select prices from public.platform_settings limit 1;
$$;

revoke all on function public.platform_prices() from public;
grant execute on function public.platform_prices() to anon, authenticated;
