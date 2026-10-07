-- ROADMAP 0.11 slice 6 — THE PHOTO RECONCILE, ON A CRON ENTRY THE WAY `refresh-weather` IS.
--
-- Calls the `photo-reconcile` edge function once a day. The function sums what R2 actually holds against
-- what `job_photos` says, per business, and writes the numbers to this table's `photo-reconcile` row
-- (`docs/the-photo-allowance.md` § 6). It reads; it never deletes or repairs anything.
--
-- ---------------------------------------------------------------------------------------------------------
-- APPLY THIS AFTER `photo-reconcile` IS PUBLISHED, NOT BEFORE
-- ---------------------------------------------------------------------------------------------------------
-- The row seeded below is read by the dead-man's switch (`20260907004000_dead_mans_switch.sql`) as a job that
-- should report inside `stale_after_seconds`. Applied before the function exists, nothing would ever report,
-- and 25 hours later the owner would be emailed that a job has stopped, which is true of a job that was
-- never started. **And `photo-reconcile` must be in `PUBLIC_FUNCTIONS` in `scripts/deploy-functions.mjs`
-- before it is published**, or the gateway refuses this anonymous call and the same email follows.
--
-- The seed says `seeded: true`, which the back office reads as "not reported yet" and never as green
-- (ROADMAP 6.2a), and which the function itself reads as "no real run yet", so the first call is not
-- refused as too soon.
--
-- 25 hours (90,000 seconds): one daily run plus an hour's slack, the same shape as the nightly accrual's
-- own window. The expression is daily at 03:40 UTC, off the hour so it does not queue behind the others.
create extension if not exists pg_net;
create extension if not exists pg_cron;

insert into public.job_heartbeats (job, ran_at, detail, stale_after_seconds)
values ('photo-reconcile', now(), jsonb_build_object('seeded', true), 90000)
on conflict (job) do nothing;

select cron.schedule(
  'photo-reconcile',
  '40 3 * * *',
  $job$
  select net.http_post(
    url := 'https://kguqylyzgyzfktkfnhjb.supabase.co/functions/v1/photo-reconcile',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := '{}'::jsonb
  );
  $job$
);
