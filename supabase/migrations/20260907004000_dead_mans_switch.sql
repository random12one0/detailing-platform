-- ROADMAP 8.12 — THE DEAD MAN'S SWITCH.
--
-- `job_heartbeats` (20260906006000) records WHEN each scheduled job last
-- finished, and the back office draws a line about it. That is a place
-- somebody has to remember to visit, about a problem whose whole character is
-- that nobody knows to look — the same shape as the "failed emails SCREEN"
-- roadmap 2.20 considered and refused for exactly this reason.
--
-- **A MONITOR NOBODY IS TOLD ABOUT IS A LOG.** This is the half that tells.
--
-- ---------------------------------------------------------------------------
-- THE WINDOW MOVES OUT OF THE SCREEN AND INTO THE ROW.
-- ---------------------------------------------------------------------------
-- `AdminPage.jsx` carried `45 minutes` and `36 hours` in a JS constant, and
-- the watcher below needs the same two numbers. Two copies of a threshold is
-- how a screen says a job is fine while the alarm is going off — so the row
-- carries its own window and both readers ask it. The values here are the
-- ones the screen has been using, so nothing about today's behaviour moves.
--
-- A DEFAULT OF ONE DAY IS DELIBERATELY GENEROUS. A job that starts stamping a
-- heartbeat without setting its window gets watched anyway, and a window that
-- is too WIDE is a late alarm, where one that is too tight is a false one —
-- and a monitor that cries wolf is a monitor somebody switches off.
--
-- SECONDS RATHER THAN AN `interval`, and that is about the READER. PostgREST
-- renders an interval as text in whichever of several shapes Postgres picks
-- ("00:45:00" for one of these two, "1 day" for the default), so the back
-- office would have to parse a format nobody controls to draw the same line
-- it draws today. A number is the same fact with nothing to get wrong.
alter table public.job_heartbeats
  add column if not exists stale_after_seconds integer not null default 86400
    check (stale_after_seconds > 0),
  -- NULL MEANS "NOT CURRENTLY ALARMING", not "never has". There is no history
  -- here on purpose (the table's own comment says why): the question is what
  -- is broken NOW, and the alert email is the record of what was.
  add column if not exists alerted_at timestamptz;

update public.job_heartbeats set stale_after_seconds = 45 * 60
 where job = 'send-owner-reminders';
update public.job_heartbeats set stale_after_seconds = 36 * 60 * 60
 where job = 'accrue-plan-visits';

comment on column public.job_heartbeats.stale_after_seconds is
  'How long this job may go without finishing before it counts as stopped. The ONE copy of that window - the back office reads it rather than carrying its own. Roadmap 8.12.';
comment on column public.job_heartbeats.alerted_at is
  'When the owner was told this job had stopped. Null means nothing is outstanding, so a recovery is "alerted_at was set and the job is fresh again". Roadmap 8.12.';

-- ---------------------------------------------------------------------------
-- THE OUTSIDE CHECK — the only thing that can see this whole system stop.
-- ---------------------------------------------------------------------------
-- Everything above runs on `pg_cron`, including the watcher. **If pg_cron
-- itself stops, or the project is paused, or the database is unreachable, the
-- watcher stops with the jobs it watches and the silence is identical to
-- everything being fine.** That is the bootstrap problem every dead man's
-- switch has, and it cannot be solved from inside.
--
-- So the watcher PINGS an address on every healthy run, and something outside
-- this database notices when the pings stop. healthchecks.io's free plan is
-- twenty of those; the URL is the whole configuration.
--
-- **NULL IS THE STATE IT SHIPS IN AND THE BACK OFFICE SAYS SO OUT LOUD.** A
-- monitor that is not set up looks exactly like a monitor with nothing to
-- report, which is the failure this entire item exists to remove — so the
-- health line prints that nothing is watching from outside rather than
-- printing nothing.
alter table public.platform_settings
  add column if not exists healthcheck_url text;

comment on column public.platform_settings.healthcheck_url is
  'Where the job watcher pings on every healthy run, so something OUTSIDE this database notices when pg_cron itself stops. Null = no outside check, and the back office says so. Roadmap 8.12.';

-- ---------------------------------------------------------------------------
-- ONE STATEMENT DECIDES AND MARKS, AND THAT IS WHY IT IS CALLED A CLAIM.
-- ---------------------------------------------------------------------------
-- Reading "what is stale" and then writing "I have told him" as two statements
-- lets two overlapping runs both send — and the cron that calls this is the
-- one piece of infrastructure guaranteed to fire again while the last call is
-- still in flight. The data-modifying CTE runs to completion whether or not
-- the outer query reads it, so the row is marked in the same statement that
-- selects it.
--
-- IT RETURNS ONLY WHAT *CHANGED*. A job that has been down for a week is not
-- in this result, because the owner has already been told; the condition
-- `s.is_stale <> (s.alerted_at is not null)` is the whole of it and it reads
-- both directions at once — newly stopped, and started again after being
-- reported.
create or replace function public.claim_job_alerts()
returns table (job text, ran_at timestamptz, went text)
language sql
security definer
set search_path = public
as $fn$
  with state as (
    select h.job, h.ran_at, h.alerted_at,
           (now() - h.ran_at) > make_interval(secs => h.stale_after_seconds) as is_stale
      from public.job_heartbeats h
  ),
  changed as (
    select s.job, s.ran_at,
           case when s.is_stale then 'stale' else 'recovered' end as went
      from state s
     where s.is_stale <> (s.alerted_at is not null)
  ),
  marked as (
    update public.job_heartbeats h
       set alerted_at = case when c.went = 'stale' then now() else null end
      from changed c
     where h.job = c.job
    returning h.job
  )
  select c.job, c.ran_at, c.went from changed c order by c.job;
$fn$;

-- THE UNDO, and it exists because a claim that is never sent is an alarm that
-- never rings. `sendTenantEmail` is best-effort by design and returns false on
-- a provider failure; without this the row would stay marked and the one email
-- that mattered would be lost for the whole life of the outage.
--
-- **IT ONLY RE-ARMS THE STOPPAGES.** Losing a "it is running again" notice
-- costs the owner a good-news email he can also see on the screen; losing a
-- "it has stopped" one costs him the feature.
create or replace function public.release_job_alerts(p_jobs text[])
returns void
language sql
security definer
set search_path = public
as $fn$
  update public.job_heartbeats
     set alerted_at = null
   where job = any(coalesce(p_jobs, '{}'::text[]));
$fn$;

revoke all on function public.claim_job_alerts() from public, anon, authenticated;
revoke all on function public.release_job_alerts(text[]) from public, anon, authenticated;
grant execute on function public.claim_job_alerts() to service_role;
grant execute on function public.release_job_alerts(text[]) to service_role;

-- ---------------------------------------------------------------------------
-- THE WATCHER IS ITS OWN JOB AND NOT A TAIL ON THE SWEEP.
-- ---------------------------------------------------------------------------
-- Folding this into `send-owner-reminders` would have cost no function and no
-- cron entry, and it would have made the reminder sweep the only thing able to
-- report that the reminder sweep had stopped. That sweep is the job this
-- product has actually watched break (roadmap 0.2, a dead relay nobody saw for
-- an entire item), so it is precisely the one that must be watched from
-- somewhere else.
--
-- **IT STAMPS NO HEARTBEAT OF ITS OWN.** A watcher watching itself proves
-- nothing; its liveness is the outside ping above, and that is the honest
-- place for it.
--
-- Offset seven minutes from the quarter hour so it never reads a heartbeat
-- the sweep is in the middle of writing.
select cron.schedule(
  'watch-jobs',
  '7,22,37,52 * * * *',
  $job$
  select net.http_post(
    url := 'https://kguqylyzgyzfktkfnhjb.supabase.co/functions/v1/watch-jobs',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := '{}'::jsonb
  );
  $job$
);
