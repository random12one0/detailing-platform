-- ROADMAP 9.14 — WHERE ANDREW TYPES WHAT THE PLATFORM COSTS HIM.
--
-- 9.14: *"Subscription revenue is visible; hosting, database, email and domain
-- costs are not. Manual cost entry is fine to start."* This is the storage for
-- the manual entry. The read that turns it into a net figure is
-- `_shared/platformNet.js` plus the `platform_net` action on `platform-admin`;
-- the screen is the `app/src` half and is specified under 9.14 in `ROADMAP.md`.
--
-- ---------------------------------------------------------------------------
-- MONEY IS CENTS, AS EVERY OTHER MONEY COLUMN HERE IS
-- ---------------------------------------------------------------------------
-- `integer`, never `numeric` and never a float. `platform_subscriptions`
-- (`recurring_cents`, `setup_cents`) and `platform_invoices` (`amount_cents`)
-- already settled this, and a second convention for the same quantity is how
-- a subtraction between two of them goes wrong by a hundred.
--
-- ---------------------------------------------------------------------------
-- A PERIOD IS A CALENDAR MONTH, PINNED TO ITS FIRST DAY
-- ---------------------------------------------------------------------------
-- Hosting, a database, email and a domain all bill monthly, so the month is
-- the period the real documents arrive on. The check constraint forces the
-- first of the month rather than trusting every caller to normalise: two rows
-- for "March" written as `2026-03-01` and `2026-03-15` would silently become
-- two different periods, and the total for March would then depend on which
-- day somebody happened to type.
--
-- ---------------------------------------------------------------------------
-- NOBODY BUT THE SERVICE ROLE CAN SEE OR WRITE THIS, AND THAT IS TWO PARTS
-- ---------------------------------------------------------------------------
-- RLS **enabled and forced with zero policies**, plus a **revoke**. Both
-- halves, because `20260921000000_revoke_locked_table_grants.sql` found ten
-- tables with the first and not the second — and records what that costs: on a
-- granted table, the first permissive policy anybody later writes to allow one
-- `select` lands on top of an `INSERT`, `UPDATE`, `DELETE` and `TRUNCATE` that
-- were already there. `anon` held `INSERT` on the audit trail until that ran.
--
-- **The gate on who may write a cost is `platform_admins`, checked by the edge
-- function, exactly as every other platform-owner action is.** It is not a
-- policy here and must not become one: a detailer's browser never reaches this
-- table at all, so there is no row for a policy to choose between.
--
-- ---------------------------------------------------------------------------
-- WHAT IS DELIBERATELY NOT HERE: A "COSTS CONFIRMED, AND THEY WERE ZERO" ROW
-- ---------------------------------------------------------------------------
-- 9.14 demands that a period with no costs entered reads as *"costs not
-- entered"* rather than as a profit, and names the distinction it is guarding:
-- unknown versus known-empty. **A second table recording "Andrew reviewed this
-- month and there was nothing to enter" was considered and rejected.**
--
-- The reason is that the known-empty case cannot occur. A month in which this
-- platform ran at all is a month with hosting, a database, email and a domain
-- on it; a true zero would mean every supplier billed nothing. So the
-- confirmation table would exist to distinguish a state that does not happen
-- from one that happens every month until somebody types.
--
-- **WHAT WOULD CHANGE THE ANSWER, so the next person does not re-derive it:**
-- a period that genuinely has no costs — a month before launch, or a month
-- whose bills are entered under a different period on purpose. If that arrives,
-- add `platform_cost_periods (period_month, confirmed_at, confirmed_by)` and
-- make the flag read from it instead of from `count(*) > 0`. The flag lives in
-- ONE function (`_shared/platformNet.js`) precisely so that change is one edit.

create table if not exists public.platform_costs (
  id            uuid primary key default gen_random_uuid(),

  -- The first day of the calendar month this cost belongs to.
  period_month  date not null,
  constraint platform_costs_period_is_first_of_month
    check (period_month = date_trunc('month', period_month)::date),

  -- The four 9.14 names, plus `other` so a real bill is never turned away for
  -- lacking a category. NOT an enum type: a new supplier should be one insert
  -- and not a migration, and `db-audit.mjs` reads a check constraint as
  -- readily as a type.
  category      text not null
    check (category in ('hosting','database','email','domain','other')),

  -- CENTS. See the header.
  amount_cents  integer not null check (amount_cents >= 0),

  -- What this actually was, in Andrew's words — "Netlify, Oct" or "the domain
  -- renewal". The category alone cannot tell two bills apart and he is the only
  -- reader.
  note          text,

  -- Which platform admin typed it. `platform_admins` is keyed on `user_id`, so
  -- this matches that and the audit trail in `platform_admin_events`. Nullable
  -- so a cost entered by a script or a backfill is still a cost rather than a
  -- failed insert.
  entered_by    uuid,

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create trigger platform_costs_updated_at
  before update on public.platform_costs
  for each row execute function public.set_updated_at();

-- The only question asked of this table: everything for one month.
create index if not exists platform_costs_period_idx
  on public.platform_costs (period_month, category);

alter table public.platform_costs enable row level security;
alter table public.platform_costs force row level security;

-- ZERO POLICIES, ON PURPOSE. The service role is the only reader and writer.
-- `scripts/db-audit.mjs` has a NO_POLICY_BY_DESIGN list for exactly this shape.
revoke all on public.platform_costs from anon, authenticated;

comment on table public.platform_costs is
  'ROADMAP 9.14 - hand-entered platform costs, one row per bill per month. '
  'Written and read ONLY by the service role via the platform-admin edge '
  'function, gated on platform_admins. No RLS policies by design. A month with '
  'no rows means COSTS NOT ENTERED, never zero costs - see _shared/platformNet.js.';
