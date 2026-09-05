-- A FOURTH PRICE SHAPE: PAID UP FRONT.
-- Roadmap 2.14 step 2, same day, and it exists because the owner asked the
-- right question about the thing that had just shipped:
--
--   > "I just wanna confirm... the person able to customize the monthly plan
--    > however they want. If it's, like, a package that has a set set things
--    > that come with it, if it's, like, set price, if it's a percent off,
--    > if it's, like, a... if there's tiers to it... We're not locked into a
--    > certain type of monthly plan. Right?"
--
-- Eleven plan shapes were put into the demo to answer him by looking rather
-- than by asserting, and one of them could not be said. **A PREPAID BLOCK —
-- "$1,999 for the year, saving $377" — had to be entered as a MONTHLY price**,
-- so the screen printed "$1999.00 a month", which is not what the detailer
-- means and not what the customer pays. It is a real shape in the sample
-- (CarDetailing2Go's yearly tiers, Deluxe's prepaid credits that "never
-- expire") and the research named it as one of the six.
--
-- The other three shapes he listed were already there: a package's contents
-- are the plan's own description, tiers are several plans (which is how five
-- of the sampled detailers publish them), and a percentage is `percent_off`.
--
-- THE FIX IS ONE VALUE, NOT A COLUMN. `price_kind` was already the axis that
-- says what the number MEANS; it was one option short. Append-only means never
-- editing a migration file, not never changing a constraint — the old check is
-- dropped and restated in full here so the whole allowed set reads in one
-- place, which is the same shape `20260902003000_request_mode_and_quotes.sql`
-- used for `bookings_status_check`.
--
-- `term_months` STAYS SEPARATE AND IS NOT IMPLIED BY THIS. A prepaid year is
-- usually a twelve-month term, but a detailer can sell a prepaid block of ten
-- visits with no end date, and "paid up front" is a fact about the MONEY while
-- a term is a fact about the COMMITMENT. Collapsing them would make one of
-- those two unsayable, which is the defect this migration exists to repair.

alter table public.plans
  drop constraint if exists plans_price_kind_check;
alter table public.plans
  add constraint plans_price_kind_check
  check (price_kind in ('monthly', 'per_visit', 'percent_off', 'total'));

alter table public.plan_members
  drop constraint if exists plan_members_price_kind_check;
alter table public.plan_members
  add constraint plan_members_price_kind_check
  check (price_kind in ('monthly', 'per_visit', 'percent_off', 'total'));

-- The percentage ceiling has to survive the restatement above: it is a
-- separate constraint on `plans` and untouched, but a session adding a fifth
-- shape here should check it still reads correctly for the new one.
comment on column public.plans.price_kind is
  'What the number in price_amount MEANS: a monthly amount, a per-visit '
  'amount, a percentage off every visit, or a single total paid up front. '
  'All four appear in the ten detailer plan pages sampled in '
  'docs/plans-research-2026-09-04.md; forcing one excludes real businesses.';
