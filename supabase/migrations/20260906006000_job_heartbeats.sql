-- ITEM D — if the reminder sweep stops, somebody finds out.
--
-- `pg_cron` posts to `send-owner-reminders` every fifteen minutes and calls
-- `accrue_plan_visits()` once a night. **A failure of either is completely
-- silent**: no screen changes, no error reaches anybody, and the first symptom
-- is a detailer saying they stopped getting their morning alert — or a plan
-- member quietly not being owed the visit they paid for.
--
-- THIS PRODUCT HAS ALREADY BEEN BITTEN TWICE BY EXACTLY THIS SHAPE. The email
-- relay was dead for the whole of roadmap 0.2 and the only evidence was a
-- `console.error` inside an edge function; the VAPID keys were never set, so
-- `sendOwnerPush` took its "not configured — skipping" branch for the entire
-- life of the feature. **Both were invisible from every screen**, and both
-- were found by somebody eventually thinking to look.
--
-- ---------------------------------------------------------------------------
-- IT RECORDS THAT A JOB RAN, NOT THAT IT WORKED, AND THE DIFFERENCE MATTERS.
-- ---------------------------------------------------------------------------
-- A heartbeat is written at the END of a run, so a stamp means the whole thing
-- got that far. It cannot tell you an email bounced — `sendTenantEmail` is
-- best-effort by design and must stay that way, because an email failure must
-- never fail a booking. What it CAN tell you is the thing nothing else can:
-- **that the job is not running at all.** That is the failure with no other
-- witness.
--
-- ONE ROW PER JOB, UPSERTED. There is no history: "when did it last run" is
-- the whole question, and a table that grows a row every fifteen minutes is a
-- table somebody has to prune.
create table if not exists public.job_heartbeats (
  job     text primary key,
  ran_at  timestamptz not null default now(),
  detail  jsonb not null default '{}'::jsonb
);

alter table public.job_heartbeats enable row level security;
alter table public.job_heartbeats force row level security;
-- NO POLICIES, deliberately, exactly like `platform_admins`: nothing a
-- detailer's browser does needs to know whether our crons are healthy, and a
-- table with no policies is the strongest way to say so. The back office reads
-- it under the service role through `platform-admin`, which is the only path
-- to it — the same rule roadmap 4.4's whole security floor rests on.

create or replace function public.note_heartbeat(p_job text, p_detail jsonb default '{}'::jsonb)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.job_heartbeats (job, ran_at, detail)
  values (p_job, now(), coalesce(p_detail, '{}'::jsonb))
  on conflict (job) do update set ran_at = excluded.ran_at, detail = excluded.detail;
$$;

-- The reminder sweep stamps it from the EDGE FUNCTION rather than from the
-- cron statement, and that is the load-bearing choice: the cron's own job is a
-- `net.http_post`, which succeeds the moment the request is queued. Stamping
-- there would prove the scheduler is alive and say nothing about whether the
-- thing it calls still works — which is the more likely of the two to break,
-- and the one that broke in 0.2.
revoke all on function public.note_heartbeat(text, jsonb) from public, anon;
grant execute on function public.note_heartbeat(text, jsonb) to service_role;

-- The nightly accrual has no HTTP hop, so it stamps itself in SQL. Rescheduled
-- rather than edited: `cron.schedule` on an existing name replaces it.
select cron.schedule(
  'accrue-plan-visits',
  '5 0 * * *',
  $job$
  select public.accrue_plan_visits();
  select public.note_heartbeat('accrue-plan-visits');
  $job$
);

comment on table public.job_heartbeats is
  'When each scheduled job last finished. One row per job, upserted — "when did it last run" is the whole question. RLS forced with no policies: the back office reads it under the service role.';
