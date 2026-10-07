-- ROADMAP 4.1 — THE AUDIT HISTORY: WHO CHANGED A JOB, WHAT IT WAS, AND WHEN.
--
-- One append-only table, written by `update-booking` through `_shared/actionLog.ts`
-- for four of 4.1's seven actions: complete, cancel and no-show (a `status` change),
-- waive (a `payment_status` change) and delete (`soft_delete`). The other three are
-- already covered and are not this table's: suspend and restore write
-- `platform_admin_events`, and an owner invite is a row in `business_invites` that
-- names `invited_by` and carries its own `created_at`.
--
-- ---------------------------------------------------------------------------
-- WHAT IS STORED, AND WHY NOT THE ROW
-- ---------------------------------------------------------------------------
-- `before` and `after` hold the ONE field that changed, `{"status":"confirmed"}` and
-- `{"status":"completed"}`. A booking carries a customer's name, phone and address;
-- an append-only table that copied them would be a copy `delete-customer` could never
-- erase. `subject_id` is the booking's id and nothing about the person on it.
--
-- ---------------------------------------------------------------------------
-- NO FOREIGN KEY ON `business_id`, ON PURPOSE
-- ---------------------------------------------------------------------------
-- A cascade would fire this table's own delete guard when a business is removed and
-- block the removal; `set null` would write to a row the guard also refuses. A log
-- that keeps the id of a business that no longer exists is what a log is for.
--
-- ---------------------------------------------------------------------------
-- APPEND-ONLY MEANS THE DATABASE REFUSES, NOT THAT NOBODY HAS BEEN ASKED
-- ---------------------------------------------------------------------------
-- RLS enabled and forced with zero policies, plus a revoke (the pair
-- `20260921000000_revoke_locked_table_grants.sql` found ten tables holding only half
-- of), so a detailer's browser never reaches it. And a trigger that raises on UPDATE
-- and DELETE, because the service role bypasses RLS and the edge function is the
-- thing most likely to be edited by somebody who has not read this file.
-- TRUNCATE is refused the same way.

create table if not exists public.action_log (
  id            uuid primary key default gen_random_uuid(),
  business_id   uuid not null,
  actor_id      uuid not null,
  actor_role    text not null,
  action        text not null,
  subject_table text not null check (subject_table in ('bookings')),
  subject_id    uuid not null,
  before        jsonb not null,
  after         jsonb not null,
  created_at    timestamptz not null default now()
);

create index if not exists action_log_subject_idx  on public.action_log (subject_id, created_at desc);
create index if not exists action_log_business_idx on public.action_log (business_id, created_at desc);

alter table public.action_log enable row level security;
alter table public.action_log force row level security;
-- NO POLICIES, deliberately. Read through an edge function under the service role.

revoke all on public.action_log from anon, authenticated;

create or replace function public.action_log_is_append_only()
returns trigger
language plpgsql
as $$
begin
  raise exception 'action_log is append-only: % is refused', tg_op;
end;
$$;

drop trigger if exists action_log_no_update_delete on public.action_log;
create trigger action_log_no_update_delete
  before update or delete on public.action_log
  for each row execute function public.action_log_is_append_only();

drop trigger if exists action_log_no_truncate on public.action_log;
create trigger action_log_no_truncate
  before truncate on public.action_log
  for each statement execute function public.action_log_is_append_only();

comment on table public.action_log is
  'Roadmap 4.1. Who completed, cancelled, no-showed, waived or deleted a job, the one '
  'field it changed from and to, and when. Append-only: the database refuses UPDATE, '
  'DELETE and TRUNCATE. Service-role only. Holds the changed field, never the booking row.';
