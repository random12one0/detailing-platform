-- A DETAILER ADDS THEIR OWN WAYS TO BE PAID — his review, 2026-09-11.
--
-- *"The something else shouldn't be a switch, it's you actually adding a new
-- one — and when you add it it looks like the others, with a title and then
-- their link or username."*
--
-- `pay_other` (2026-09-04) is ONE free-text line for "anything the five named
-- methods do not cover", and it is the wrong shape for what he is describing:
-- a detailer who takes Apple Pay AND a check AND has a Square link has three
-- things to say and one box to say them in. What he wants is the same ROW the
-- five built-in methods get, as many times as he needs.
--
-- ── WHY A JSONB ARRAY AND NOT A TABLE ───────────────────────────────────────
-- A table is the textbook answer and it is wrong here. These rows have no
-- identity of their own: nothing references them, nothing joins to them,
-- nobody sorts or queries them, and they are read exactly once — all of them
-- at once, by `_shared/payments.ts`, on the way into an email. A table would
-- add a migration, a policy, a second read on every send and an ordering
-- column, to hold what is honestly a field on the settings row. The product
-- already keeps `business_settings.setup` as jsonb for the same reason.
--
-- ── WHAT IS CONSTRAINED HERE AND WHAT IS NOT ────────────────────────────────
-- SQL holds the SHAPE — it is an array, it is short, and it cannot be grown
-- until an email takes a second to render. SQL does NOT try to validate each
-- entry's fields: `payments.ts` already decides what a handle is, what links
-- and what prints as typed, and putting half of that decision in a CHECK
-- constraint is the two-places problem this repo keeps recording. A row that
-- reaches the array malformed is dropped on the way out, by the one module
-- that has always owned that judgement.
--
-- EIGHT, because the email prints one line each and a payment section longer
-- than the booking it belongs to is a worse email than one with fewer options.
-- 2,000 characters is eight entries at a generous 120 plus the JSON around
-- them, which is the same ceiling the five text columns already carry.

-- ── WHAT THIS DELIBERATELY DOES NOT TOUCH ──────────────────────────────────
-- `get_public_business_profile` (20260905001000) hands a tenant's own website
-- the five `pay_*` columns, and this one is NOT added to it here. Adding a
-- field means `create or replace` on a 90-line function, retyped, for a
-- consumer that does not exist yet — no tenant site reads payment methods
-- today, and a retyped function is how a subtle difference gets introduced
-- into the one read every public page depends on. **It goes in the same change
-- as the first tenant site that prints how to pay** (roadmap 3.x), where it
-- can be tested by something that actually renders it.

alter table public.business_settings
  add column if not exists pay_custom jsonb not null default '[]'::jsonb;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'business_settings_pay_custom_shape'
  ) then
    alter table public.business_settings
      add constraint business_settings_pay_custom_shape check (
        jsonb_typeof(pay_custom) = 'array'
        and jsonb_array_length(pay_custom) <= 8
        and length(pay_custom::text) <= 2000
      );
  end if;
end $$;

comment on column public.business_settings.pay_custom is
  'His review 2026-09-11. Ways to be paid the five named methods do not cover, '
  'as [{label, handle}] — the same row shape the built-in ones get, as many as '
  'the detailer needs. Read by _shared/payments.ts, which owns what links and '
  'what prints as typed. Supersedes the single pay_other line, which is still '
  'read for any business that has not opened the screen since.';
