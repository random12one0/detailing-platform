-- THE NIGHTLY RECONCILE WOULD HAVE BEEN ABANDONED AFTER FIVE SECONDS, AND THE
-- ONLY SYMPTOM WOULD HAVE BEEN A STOPPED-JOB EMAIL — ROADMAP 0.11d, 2026-10-09.
--
-- `20261006060000_photo_reconcile_cron.sql` schedules the call with
-- `net.http_post(url, headers, body)` and passes NO `timeout_milliseconds`.
-- **pg_net's default is 5,000 ms, and nobody chooses it — it is what you get for
-- not passing the argument.** That is the exact fault
-- `20260913001000_cron_http_timeout.sql` was written to repair three weeks
-- earlier, in its own words: *"Nobody chose five — `timeout_milliseconds` was
-- simply never passed."* 37 of 48 calls to `send-owner-reminders` were
-- `timed_out = true` in `net._http_response`, against a function that was
-- healthy and took 9,735 ms, and owner reminders, customer reminders and
-- finalize-payment emails did not go out for eighteen hours.
--
-- **AND THIS JOB IS THE WORST CANDIDATE FOR A FIVE-SECOND BUDGET IN THE
-- PROJECT.** `photo-reconcile` lists the WHOLE `job-photos` bucket from
-- Cloudflare, 1,000 objects a page, then reads the whole `job_photos` table,
-- 1,000 rows a page, then two RPCs, then stamps. It is fast today because the
-- bucket is empty; its cost scales with every photograph the platform ever
-- stores. The sweep that broke "crossed five seconds on its own, with nobody
-- changing it".
--
-- **WHAT THE FAILURE LOOKS LIKE, which is why this is worth a migration.**
-- `cron.job_run_details` still says `succeeded`, because `net.http_post` only
-- QUEUES the request. The truth lives in `net._http_response`, which nobody
-- reads unless they already suspect. So the first visible sign is the dead
-- man's switch emailing Andrew that `photo-reconcile` has stopped — 25 hours
-- later, for a job that may well have run. `FOR-ANDREW.md` step 9's closing
-- note attributed that symptom to the gateway refusing the anonymous call;
-- a five-second abandonment produces the same symptom and is now named there
-- too.
--
-- 60,000 ms: twice the 30,000 the sweep and the watcher were given, because
-- their work scales with open jobs and this one's scales with every object in
-- the bucket, and because nothing and nobody is waiting on this answer at
-- 03:40 UTC. It is far inside the heartbeat's own 90,000-second staleness
-- window, so a run that uses the whole minute is still reported in time.
--
-- Rescheduled rather than edited: migrations are append-only here, and
-- `cron.schedule` on an existing name REPLACES it — the pattern
-- `20260913001000_cron_http_timeout.sql` and
-- `20260906006000_job_heartbeats.sql` both used. Apply it after
-- `20261006060000_photo_reconcile_cron.sql`, which creates the entry this
-- replaces; applied on its own it simply creates the entry correctly.
--
-- `tests/photo-cron-call.test.mjs` holds this: its `CRON_BREAK=no-timeout`
-- sabotage puts the five-second default back and reddens.

select cron.schedule(
  'photo-reconcile',
  '40 3 * * *',
  $job$
  select net.http_post(
    url := 'https://kguqylyzgyzfktkfnhjb.supabase.co/functions/v1/photo-reconcile',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
  $job$
);
