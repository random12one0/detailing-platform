-- Roadmap 2.14 — PLANS A DETAILER LOGS.
--
-- THE OWNER DECIDED THE SHAPE HIMSELF (round 3 of
-- docs/plans-research-2026-09-04.md, 2026-09-04): the plan is LOGGED, never
-- sold and never billed by us. He negotiates dates and prices with his
-- customer off the product; the product's job is to remember what was agreed
-- and to say who is owed a visit.
--
--   > "we need a way for the detailer within the app to log this customer as
--   > a monthly plan, and they could set all the settings — if it's weekly,
--   > biweekly, monthly, which tier it is, or if it's a percent discount, if
--   > it's a bundle."
--
-- FOUR FIELDS, NOT SIX FEATURES. The research found six plan shapes in ten
-- real detailers' plan pages, and every one of them falls out of the same
-- four questions: a CADENCE, WHAT IS INCLUDED, HOW IT IS PRICED, and WHETHER
-- THERE IS A TERM. He listed four of those unprompted from the other
-- direction. So there is one `plans` table, not a table per shape:
--   frequency plan     cadence + one visit
--   visit bundle       cadence + visits_per_period > 1
--   tiered membership  several plans, different names and prices
--   prepaid block      price_kind 'monthly' + term_months
--   discount member    cadence_unit NULL (no rhythm) + price_kind 'percent_off'
--
-- THE LEDGER IS THE NON-NEGOTIABLE PART, and it is why this file has three
-- tables instead of two. Research §4: "logging is a strict subset of
-- billing" — everything built here is a row real subscriptions would need
-- anyway — but ONLY IF a member has a ledger of visits owed and used from day
-- one. Adding billing to a plan that stores just a cadence is a rewrite.
--
--   OWED comes from `plan_visits`, append-only rows written by the accrual
--        below (and by a detailer skipping or adding one by hand).
--   USED comes from `bookings.plan_member_id`, because that is where
--        cancellation already works. Twelve places in this codebase say
--        `status <> 'cancelled'` and every one of them is already right about
--        a plan visit that was called off, which a second `used` row in a
--        ledger would not be.
--
-- WHAT IS DELIBERATELY NOT HERE, so nobody re-derives it:
--   * NO PAYMENT of any kind. We take no money (research §"we cannot sell a
--     subscription"), so there is no card, no charge, no dunning and no
--     status that implies one. Three statuses — active / paused / ended —
--     against Housecall Pro's seven, because five of theirs are billing
--     states and inventing states nothing can transition between is how a
--     screen lies.
--   * NO MINIMUM TERM ENFORCEMENT. `term_months` records what was agreed and
--     nothing acts on it. Six of ten sampled detailers advertise "no
--     contracts, cancel anytime" as a selling point, and we could not enforce
--     a penalty anyway. The anti-breakage tools the trade actually uses are
--     PAUSE and SKIP, and both are here.
--   * NO PRICE BY VEHICLE SIZE, though the research found it (Car Detox:
--     $150 / $125 / $100). It is one more jsonb column shaped exactly like
--     `services.vehicle_size_adjustments` and can be added append-only
--     whenever somebody asks; it changes no row that already exists, so it is
--     not in the "cheap to extend vs complete on day one" trade the owner
--     named.
--   * NO VEHICLE. Research §6 flags this as the schema decision most likely
--     to be regretted — "his truck is on the bi-weekly, her car is not"
--     cannot be said, because `customers` has no vehicles. The single line
--     that assumes it is the unique index below, and it is marked.

-- ---------------------------------------------------------------------------
-- 1. The plan a detailer defines.
-- ---------------------------------------------------------------------------
create table public.plans (
  id            uuid primary key default gen_random_uuid(),
  business_id   uuid not null references public.businesses(id) on delete cascade,
  name          text not null,
  -- What is included, in the detailer's own words. The sample's plan pages
  -- are all prose ("1 Diamond + 1 Gold", "exterior wash, tyres, glass"), and
  -- a structured list would be a worse description of most of them.
  description   text,
  -- CADENCE IS NOT A FIXED LIST. The sample uses weekly, bi-weekly, monthly,
  -- bi-monthly, quarterly, bi-annual and annual, and Tang advertises "custom
  -- schedules — just ask". A count and a unit spans all of those with two
  -- columns; a dropdown of four would be wrong for somebody.
  -- BOTH NULL is a real answer, not a missing one: a discount membership has
  -- no schedule at all (Mint, Car Detox's add-on rate). Such a plan never
  -- accrues and never appears on the visits-owed list.
  cadence_count integer check (cadence_count > 0),
  cadence_unit  text    check (cadence_unit in ('week', 'month', 'year')),
  -- The bundle shape, without a second table: "2 washes a month" is a monthly
  -- cadence granting two.
  visits_per_period integer not null default 1 check (visits_per_period > 0),
  -- ALL THREE PRICE SHAPES APPEAR IN THE SAMPLE, so forcing one would exclude
  -- real businesses: a monthly amount (Tang, Get Detail Now), a per-visit
  -- amount (Car Detox), and a percentage off (Mint, every "member rate").
  price_kind    text not null default 'monthly'
                check (price_kind in ('monthly', 'per_visit', 'percent_off')),
  price_amount  numeric not null default 0 check (price_amount >= 0),
  -- NULL = no contract, which is what six of ten plan pages advertise.
  term_months   integer check (term_months > 0),
  -- Which services this plan covers. Empty = anything they book. It is here
  -- rather than in prose because the booking page's plan button (step 3) has
  -- to pre-select something, and the description cannot be pre-selected.
  -- No FK: it is an array, and a deleted service simply stops matching.
  included_service_ids uuid[] not null default '{}',
  is_active     boolean not null default true,
  sort_order    integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  -- A cadence is a count AND a unit or it is neither.
  constraint plans_cadence_pair check ((cadence_count is null) = (cadence_unit is null)),
  -- A percentage over 100 is money going the other way.
  constraint plans_percent_range check (price_kind <> 'percent_off' or price_amount <= 100)
);

create index plans_business_idx on public.plans (business_id, sort_order);

create trigger plans_updated_at
  before update on public.plans
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 2. A customer logged onto one.
-- ---------------------------------------------------------------------------
create table public.plan_members (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references public.businesses(id) on delete cascade,
  -- NOT `cascade`: deleting a plan somebody is on would delete the record of
  -- what they were paying. The screen offers Hide, never Delete.
  -- AND `no action` RATHER THAN `restrict`, WHICH IS NOT A DISTINCTION
  -- WITHOUT A DIFFERENCE HERE. Both refuse to delete a plan that has members.
  -- `restrict` is checked the instant the row goes, `no action` at the end of
  -- the statement — and deleting a BUSINESS cascades to both tables in one
  -- statement, in an order Postgres does not promise. Under `restrict` that
  -- errors about half the time; under `no action` there are no orphans left to
  -- find by the time the check runs. `seed-demo.mjs` deletes the demo business
  -- on every run, so this is a path that is taken constantly.
  plan_id      uuid not null references public.plans(id) on delete no action,
  customer_id  uuid not null references public.customers(id) on delete cascade,
  -- THREE, AND ONLY THREE. See the header.
  status       text not null default 'active' check (status in ('active', 'paused', 'ended')),
  -- What the detailer sees: "member since". A fact about the relationship.
  started_on   date not null default current_date,
  ended_on     date,
  -- What the ACCRUAL reads, and the two are not the same date. Pausing a plan
  -- has to survive being un-paused: if accrual ran from `started_on` it would
  -- backfill every visit the pause was supposed to skip the moment the member
  -- came back, which is the opposite of what pause means to the customer who
  -- asked for it. Resuming moves this forward; nothing else touches it.
  accrue_from  date not null default current_date,
  -- THE PRICE IS SNAPSHOTTED ONTO THE MEMBER, not read from the plan. Same
  -- rule this codebase already applies to `vehicle_size_fee` and
  -- `name_at_booking`: a detailer raising their plan price must not silently
  -- raise it for everybody already on it. The CADENCE is deliberately NOT
  -- snapshotted — it is read live from the plan, because past grants are
  -- already rows and a rhythm change only ever affects what happens next.
  price_kind   text not null default 'monthly'
               check (price_kind in ('monthly', 'per_visit', 'percent_off')),
  price_amount numeric not null default 0 check (price_amount >= 0),
  notes        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index plan_members_business_idx on public.plan_members (business_id, status);
create index plan_members_plan_idx on public.plan_members (plan_id);
create index plan_members_customer_idx on public.plan_members (customer_id);

-- ONE LIVE MEMBERSHIP PER CUSTOMER, and this is the one line in the file that
-- assumes a plan belongs to a PERSON. Research §6 says it belongs to a
-- VEHICLE — Visual prices "per vehicle each visit" and sells a two-vehicle
-- plan — and `customers` has no vehicles today. Until they exist, one
-- membership is what makes "which plan is this booking against" answerable at
-- all, which is what the auto-link below depends on. **When vehicles arrive,
-- this index is what moves**; nothing else in this file cares.
create unique index plan_members_one_live
  on public.plan_members (business_id, customer_id) where status <> 'ended';

create trigger plan_members_updated_at
  before update on public.plan_members
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 3. The ledger — the OWED half.
-- ---------------------------------------------------------------------------
-- Append-only, one row per visit the plan promised. `delta` rather than a
-- count so a skip is a row instead of an edit: nothing here is ever updated,
-- which is what makes it something a charge could later be posted against.
create table public.plan_visits (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  member_id   uuid not null references public.plan_members(id) on delete cascade,
  -- 'granted'  the cadence came round (written by accrue_plan_visits below)
  -- 'adjusted' a human changed the count: a skipped month is -1 with a note,
  --            a goodwill visit is +1. A "skipped" kind was considered and
  --            dropped — it is an adjustment that happens to be negative, and
  --            a second kind meaning the same arithmetic is a second thing to
  --            keep in step.
  kind        text not null check (kind in ('granted', 'adjusted')),
  delta       integer not null,
  due_on      date not null,
  note        text,
  created_at  timestamptz not null default now()
);

create index plan_visits_member_idx on public.plan_visits (member_id, due_on);
create index plan_visits_business_idx on public.plan_visits (business_id);

-- The accrual is idempotent because of this, and nothing else. Re-running the
-- sweep, or two ticks landing at once, must not grant the same period twice.
create unique index plan_visits_one_grant_per_due
  on public.plan_visits (member_id, due_on) where kind = 'granted';

-- ---------------------------------------------------------------------------
-- 4. The ledger — the USED half lives on the booking.
-- ---------------------------------------------------------------------------
alter table public.bookings
  add column plan_member_id uuid references public.plan_members(id) on delete set null;

create index bookings_plan_member_idx on public.bookings (plan_member_id)
  where plan_member_id is not null;

comment on column public.bookings.plan_member_id is
  'Roadmap 2.14: this job is one of the visits a plan promised. Used visits '
  'are counted from here rather than from a ledger row so that cancelling a '
  'booking gives the visit back with no second rule — every '
  'status <> ''cancelled'' filter in this codebase is already correct for it.';

-- WHY A TRIGGER RATHER THAN A LINE IN create-booking. A plan visit can arrive
-- from the public booking page, from the dashboard's own New booking modal,
-- or from a seed — three writers, and a rule that lives in one of them is a
-- rule the other two break. It is BEFORE INSERT so the value is set in the
-- same row write, and it only ever fills a NULL: an explicit link (the plan
-- button on the booking page, step 3) always wins.
--
-- THE KNOWN CEILING, stated because it is a real imprecision and not a bug to
-- rediscover: a member who books something their plan does not cover has that
-- job counted against the plan too. Narrowing it by
-- `plans.included_service_ids` is not possible here — `booking_services` rows
-- are written AFTER the booking, so a BEFORE INSERT trigger cannot see what
-- was bought. The correction is a human one and it exists: clear the link, or
-- add an 'adjusted' +1 row. Revisit if a detailer complains, not before.
create or replace function public.link_booking_to_plan()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.plan_member_id is null and new.customer_id is not null then
    select m.id into new.plan_member_id
    from public.plan_members m
    where m.business_id = new.business_id
      and m.customer_id = new.customer_id
      and m.status = 'active';
  end if;
  return new;
end;
$$;

create trigger bookings_link_plan
  before insert on public.bookings
  for each row execute function public.link_booking_to_plan();

-- ---------------------------------------------------------------------------
-- 5. Accrual.
-- ---------------------------------------------------------------------------
-- Grants every period that has come round for every ACTIVE member of a plan
-- that has a cadence, from `accrue_from` (or the period after the last grant,
-- whichever is later) up to today. Idempotent by the unique index above, so
-- the schedule below only bounds how late a grant can be.
--
-- A paused member accrues nothing and is not backfilled on return — see
-- `accrue_from` on the table.
create or replace function public.accrue_plan_visits()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  n integer;
begin
  with due as (
    select
      m.business_id,
      m.id as member_id,
      p.visits_per_period,
      generate_series(
        greatest(
          m.accrue_from::timestamp,
          coalesce(
            (select max(v.due_on) from public.plan_visits v
              where v.member_id = m.id and v.kind = 'granted')
            + make_interval(
                weeks  => case when p.cadence_unit = 'week'  then p.cadence_count else 0 end,
                months => case when p.cadence_unit = 'month' then p.cadence_count else 0 end,
                years  => case when p.cadence_unit = 'year'  then p.cadence_count else 0 end
              ),
            m.accrue_from::timestamp
          )
        ),
        current_date::timestamp,
        make_interval(
          weeks  => case when p.cadence_unit = 'week'  then p.cadence_count else 0 end,
          months => case when p.cadence_unit = 'month' then p.cadence_count else 0 end,
          years  => case when p.cadence_unit = 'year'  then p.cadence_count else 0 end
        )
      )::date as due_on
    from public.plan_members m
    join public.plans p on p.id = m.plan_id
    -- `p.is_active` IS DELIBERATELY NOT IN THIS FILTER, and the screen's own
    -- words are why: hiding a plan says "stop new sign-ups. Anyone already on
    -- it stays on it." A member of a retired plan who quietly stopped accruing
    -- would be a promise the product made and then broke silently — the same
    -- family as a printed number that is never charged. `is_active` is about
    -- what the BOOKING PAGE offers, and nothing else.
    where m.status = 'active'
      and p.cadence_unit is not null
  )
  insert into public.plan_visits (business_id, member_id, kind, delta, due_on)
  select business_id, member_id, 'granted', visits_per_period, due_on from due
  on conflict (member_id, due_on) where kind = 'granted' do nothing;
  get diagnostics n = row_count;
  return n;
end;
$$;

revoke execute on function public.accrue_plan_visits() from public, anon;
grant execute on function public.accrue_plan_visits() to authenticated, service_role;

-- Daily, just after midnight UTC. No HTTP hop: unlike the reminder sweep this
-- has nothing to send, so it is plain SQL and cannot fail on a network.
select cron.schedule(
  'accrue-plan-visits',
  '5 0 * * *',
  $job$ select public.accrue_plan_visits(); $job$
);

-- ---------------------------------------------------------------------------
-- 6. RLS.
-- ---------------------------------------------------------------------------
-- WHICH TICK GATES WHAT, and the reasoning rather than the result, because
-- roadmap 2.13's own header says every permission has to be a group of
-- policies that already existed:
--
--   plans          WRITE is `settings`. A plan is an offer with a price on it,
--                  which is exactly the test `20260904001000_catalog_behind_
--                  settings.sql` applied to services, and the tick's own words
--                  are "Prices, hours, booking rules…". SELECT stays open to
--                  every member for the same reason the catalog's does: a
--                  staff member has to know what the customer is on.
--   plan_members   WRITE is `money`. Logging a member records what somebody
--                  pays — the same thing `can("money")` already hides on the
--                  Clients screen — so it belongs with expenses rather than
--                  with prices. SELECT is open: who is on a plan is diary.
--   plan_visits    Follows plan_members. Skipping a month is changing what is
--                  owed.
--
-- NO NEW PERMISSION KEY. Adding one means editing a check constraint on two
-- tables, `permissions.js` and the Team screen, and the four that exist each
-- name a group of policies that predated them. If the owner wants plans
-- separable from money, that is the change — deliberately not made on a guess.
alter table public.plans        enable row level security;
alter table public.plans        force  row level security;
alter table public.plan_members enable row level security;
alter table public.plan_members force  row level security;
alter table public.plan_visits  enable row level security;
alter table public.plan_visits  force  row level security;

create policy plans_member_select on public.plans
  for select to authenticated
  using (business_id in (select public.current_business_ids()));

create policy plans_settings_write on public.plans
  for all to authenticated
  using (public.has_business_permission(business_id, 'settings'))
  with check (public.has_business_permission(business_id, 'settings'));

create policy plan_members_member_select on public.plan_members
  for select to authenticated
  using (business_id in (select public.current_business_ids()));

create policy plan_members_money_write on public.plan_members
  for all to authenticated
  using (public.has_business_permission(business_id, 'money'))
  with check (public.has_business_permission(business_id, 'money'));

create policy plan_visits_member_select on public.plan_visits
  for select to authenticated
  using (business_id in (select public.current_business_ids()));

create policy plan_visits_money_write on public.plan_visits
  for all to authenticated
  using (public.has_business_permission(business_id, 'money'))
  with check (public.has_business_permission(business_id, 'money'));
