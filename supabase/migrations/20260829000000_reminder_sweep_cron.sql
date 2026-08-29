-- Roadmap 0.3 — actually schedule the reminder sweep.
--
-- The sweep function (send-owner-reminders) has always worked when called by
-- hand; nothing ever called it. This installs the scheduler, mirroring the
-- setup proven on the owner's live site (project adtlnvihwrcqcasqcjwd, job
-- "send-owner-reminders-sweep", 1200+ consecutive successful runs).
--
-- Every 15 minutes is deliberate: the sweep is idempotent (every send is
-- guarded by a sent-at marker column), so the interval only bounds how late
-- a reminder can be, never how many go out.
--
-- No Authorization header on purpose. The function is deployed with
-- verify_jwt=false, and the only key that would satisfy a check is the
-- service-role key — which must never be written into a migration, because
-- migrations are committed. The endpoint's real protection is that it can
-- only ever send what is already due: an unauthenticated caller cannot make
-- it send anything a scheduled run would not have sent minutes later.

create extension if not exists pg_net;
create extension if not exists pg_cron;

select cron.schedule(
  'send-owner-reminders-sweep',
  '*/15 * * * *',
  $job$
  select net.http_post(
    url := 'https://kguqylyzgyzfktkfnhjb.supabase.co/functions/v1/send-owner-reminders',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := '{}'::jsonb
  );
  $job$
);
