-- ROADMAP 2.23 — THE MAINTENANCE DEADLINE. A warranty that VOIDS, not a
-- cadence.
--
-- The owner handed the design over on 2026-09-04: *"there was, like, the
-- requirement case things… I don't really know how to do all that. You could
-- figure out the best way to implement it… and just be customizable for the
-- detailer who might have a lot of different things."*
--
-- ---------------------------------------------------------------------------
-- WHY THIS IS NOT A STRICTER CADENCE, WHICH IS THE WHOLE POINT.
-- ---------------------------------------------------------------------------
-- A cadence says *"roughly every month"* and nothing happens when it slips.
-- This says **"before 12 October, or something the customer paid $1,500 for is
-- gone."** Ceramic Pro requires an annual inspection by a certified installer
-- for every package; System X requires one professional service a year within
-- about 30 days of the install anniversary, and **missing that window voids
-- the warranty permanently.**
--
-- `docs/plans-research-2026-09-04.md` § 2 named the three things it has to be
-- and they are what this table is: a DEADLINE with a real date, an ESCALATING
-- reminder, and a RECORD OF WHEN THE LAST QUALIFYING SERVICE HAPPENED —
-- because the warranty claim depends on proving it.
--
-- **IT IS ATTACHED TO A CUSTOMER AND A CAR, NOT TO A PLAN.** Roadmap 2.23
-- asks the question outright and the research leans this way: a coating
-- warranty is a fact about ONE CAR and ONE JOB, and `plan_members` is
-- per-customer with a price on it. A customer with two coated cars has two
-- deadlines and no plan at all. **Do not smuggle this into the cadence
-- fields** — that was considered and rejected in the research, and roadmap
-- 2.14 shipped without it on purpose.
--
-- ---------------------------------------------------------------------------
-- WHAT IS DELIBERATELY NOT A COLUMN.
-- ---------------------------------------------------------------------------
-- **No `status`.** Open, met and missed are all derivable — met is
-- `last_done_on` covering the current deadline, missed is a date in the past
-- that nothing covers — and a stored status is a second answer that goes wrong
-- the moment somebody backdates a service. The one state that is NOT
-- derivable is a detailer deciding it no longer applies, and that is
-- `cancelled_at`.
--
-- **No reminder log.** `reminded_stage` is a single integer counting how far up
-- the escalation this deadline has been taken, which is the smallest thing
-- that makes "fires more than once, and never twice for the same step" true.
-- A row per send would be a table that grows for ever to answer a question
-- nobody asks.
create table if not exists public.maintenance_deadlines (
  id            uuid primary key default gen_random_uuid(),
  business_id   uuid not null references public.businesses(id) on delete cascade,
  customer_id   uuid not null references public.customers(id) on delete cascade,
  -- THE JOB THAT STARTED IT, when there is one. Nullable because a detailer
  -- adding a warranty for a coating they did last year has no booking in this
  -- product to point at, and refusing that would make the feature useless for
  -- every customer they already have.
  booking_id    uuid references public.bookings(id) on delete set null,

  -- THE DETAILER'S OWN WORDS, which is the customisable part he asked for:
  -- "Ceramic Pro annual inspection", "System X yearly service", "5-year
  -- warranty check". The product never invents a name for it.
  label         text not null,
  -- WHICH CAR. A customer with two coated cars has two deadlines, and a
  -- reminder that does not say which one is a reminder they cannot act on.
  vehicle       text,

  due_on        date not null,
  -- AFTER IT IS MET, WHEN THE NEXT ONE FALLS. 12 for an annual inspection;
  -- null for a one-off. Marking one done rolls the date forward by this and
  -- resets the escalation, which is the whole of the repeat behaviour.
  repeat_months integer check (repeat_months is null or (repeat_months between 1 and 120)),

  -- THE PROOF. `last_done_on` is what a warranty claim rests on, and
  -- `last_done_booking_id` is the job that did it when the work went through
  -- this product.
  last_done_on         date,
  last_done_booking_id uuid references public.bookings(id) on delete set null,

  -- HOW FAR UP THE ESCALATION THIS ONE HAS BEEN TAKEN. The stages live in the
  -- code beside the wording; the number here is only "which ones have already
  -- gone", so a re-run of the sweep cannot send the same one twice.
  reminded_stage integer not null default 0 check (reminded_stage >= 0),

  cancelled_at timestamptz,
  notes        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists maintenance_deadlines_business_idx
  on public.maintenance_deadlines (business_id, due_on);
-- The sweep asks one question every fifteen minutes: which live deadlines are
-- close? This is the index that keeps that cheap as the table grows.
create index if not exists maintenance_deadlines_due_idx
  on public.maintenance_deadlines (due_on)
  where cancelled_at is null;

create trigger maintenance_deadlines_updated_at
  before update on public.maintenance_deadlines
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS — the same shape as every other tenant table, and the same permission
-- reasoning as roadmap 2.13: this is a fact about a JOB rather than about
-- money or marketing, so every member can see it and act on it. A washer who
-- notices a coating is due can say so.
-- ---------------------------------------------------------------------------
alter table public.maintenance_deadlines enable row level security;
alter table public.maintenance_deadlines force  row level security;

create policy maintenance_deadlines_member_select on public.maintenance_deadlines
  for select to authenticated
  using (business_id in (select public.current_business_ids()));

create policy maintenance_deadlines_member_insert on public.maintenance_deadlines
  for insert to authenticated
  with check (business_id in (select public.current_business_ids()));

create policy maintenance_deadlines_member_update on public.maintenance_deadlines
  for update to authenticated
  using (business_id in (select public.current_business_ids()))
  with check (business_id in (select public.current_business_ids()));

create policy maintenance_deadlines_member_delete on public.maintenance_deadlines
  for delete to authenticated
  using (business_id in (select public.current_business_ids()));

comment on table public.maintenance_deadlines is
  'A dated obligation on one car — a coating warranty that voids, not a cadence. Roadmap 2.23. Open/met/missed are derived; only "the detailer says it no longer applies" is stored.';
