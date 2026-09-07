-- ROADMAP 8.13 — CLOSED UNTIL I SAY IT'S OPEN.
--
-- *"A detailer-facing pause that keeps the site up and says when they are
-- back."* Today the only pause is `businesses.status = 'paused'`, which only
-- the platform admin can set, and the page then 404s rather than explaining.
-- A detailer's only workaround is a date-range blockout, which is a different
-- promise: a blockout says *those days are full*, not *I am away.*
--
-- ---------------------------------------------------------------------------
-- IT IS NOT `status`, AND THAT IS THE WHOLE DECISION.
-- ---------------------------------------------------------------------------
--
-- The obvious build lets a detailer set `status = 'paused'` themselves. It
-- collides head-on with billing: `stripe-webhook` uses that exact column for
-- SUSPENSION — *"it only pauses an `active` business and only reactivates one
-- it paused"* — so a detailer who closed for a fortnight and came back would
-- press Reopen and **switch their own booking page back on while their
-- subscription was still unpaid.** One column, two meanings, and the one that
-- loses is the one the platform relies on to be paid.
--
-- So this is its own pair of columns, `status` is untouched, and the two
-- states stack correctly without a rule: a suspended business is dark because
-- of `status`, a closed one is open-but-not-taking-bookings, and a business
-- that is both is dark.
--
-- WHY A DATE AND NOT A FLAG. *"Says when they are back"* is the ask. A flag
-- makes the page say "closed" with no end, which reads as *gone* — and it is
-- the state a detailer forgets to switch off. **A date ALSO REOPENS THEM**:
-- `closed_until` in the past is not closed, so a holiday ends by itself.
-- Null means open, which is every business today.
--
-- **`closed_until` IS A DATE, NOT A TIMESTAMP.** A detailer says "back on the
-- 14th", never "back at 09:00 UTC on the 14th", and the comparison is made in
-- the BUSINESS's own timezone by `business_is_closed()` below — the F-018
-- lesson, which was three copies of "which day is it" disagreeing.
--
-- `closed_note` is optional and is the detailer's own words. It is shown to
-- CUSTOMERS, so it is theirs to write and ours to escape.

alter table public.businesses
  add column if not exists closed_until date,
  add column if not exists closed_note text;

comment on column public.businesses.closed_until is
  'Roadmap 8.13. The day a detailer is back, in their own timezone; null means open. NOT `status`, which belongs to billing suspension — one column with two meanings would let a detailer reopen a page the platform had darkened for non-payment. A date in the past is not closed, so a holiday ends itself.';

comment on column public.businesses.closed_note is
  'Roadmap 8.13. The detailer''s own words on the closed page ("back from the 14th, call for anything urgent"). Customer-facing, so it is escaped wherever it is drawn.';

-- ---------------------------------------------------------------------------
-- ONE FUNCTION ANSWERS "IS THIS BUSINESS CLOSED TODAY", AND EVERY CALLER USES
-- IT.
-- ---------------------------------------------------------------------------
-- The comparison needs the business's own timezone, which is exactly the
-- arithmetic F-018 found three disagreeing copies of. `available-slots`, the
-- public profile and the booking page all have to give the same answer on the
-- morning of the 14th, so the answer is computed in one place.
create or replace function public.business_is_closed(
  p_closed_until date,
  p_timezone text
)
returns boolean
language sql
immutable
as $$
  select p_closed_until is not null
    and p_closed_until > (now() at time zone coalesce(nullif(p_timezone, ''), 'UTC'))::date;
$$;

comment on function public.business_is_closed(date, text) is
  'Roadmap 8.13. Closed means the return date is still ahead in the BUSINESS''s own timezone — so a detailer back on the 14th is bookable from their own morning of the 14th, not from midnight UTC. Strictly greater than: the day they are back is a day they take bookings.';
