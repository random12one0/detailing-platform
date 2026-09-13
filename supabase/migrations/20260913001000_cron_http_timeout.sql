-- THE REMINDER SWEEP HAD NOT FINISHED FOR EIGHTEEN HOURS, AND THE CAUSE WAS A
-- FIVE-SECOND TIMEOUT NOBODY SET — 2026-09-13.
--
-- **THE DEAD MAN'S SWITCH WAS RIGHT.** The back office said
-- *"send-owner-reminders has not finished in 1070 minutes (it should every
-- 180)"* and it was reporting a real failure, not a display bug. The switch
-- has been working the whole time; nobody had a screen to read it on.
--
-- WHAT WAS ACTUALLY WRONG, measured rather than reasoned:
--   * `cron.job` fires every 15 minutes and SUCCEEDS — `cron.job_run_details`
--     shows an unbroken run of `succeeded` rows.
--   * `net.http_post` only QUEUES the request, so a succeeded cron row says
--     nothing about the function.
--   * `net._http_response` tells the truth: **37 of the last 48 calls are
--     `timed_out = true`, "Timeout of 5000 ms reached"**, against 11 that
--     returned 200.
--   * Invoking the function directly and WAITING returns 200 in **9,735 ms**
--     with real work done, and the heartbeat updates immediately.
--
-- So the function is healthy and takes about ten seconds; `pg_net`'s DEFAULT
-- timeout is five. Nobody chose five — `timeout_milliseconds` was simply never
-- passed. When pg_net gives up, the run does not reach its heartbeat, so every
-- sweep since 2026-09-12 08:00 has been cut off part-way.
--
-- **THE COST IS NOT COSMETIC.** This sweep sends owner reminders, customer
-- reminders, finalize-payment emails, request nudges and maintenance notices.
-- Those did not go out for eighteen hours. The single manual run that diagnosed
-- it sent four that had been waiting.
--
-- **AND IT WILL COME BACK AS THE PLATFORM GROWS.** The sweep's duration scales
-- with the number of businesses and open jobs; it crossed five seconds on its
-- own, with nobody changing it. 30 seconds is chosen against a measured 9.7 —
-- roughly three times the current cost, so it survives the platform tripling
-- before anybody has to think about this again. It is not a fix that expires
-- next month.
--
-- Rescheduled rather than edited: `cron.schedule` on an existing name replaces
-- it, which is the pattern `20260906006000_job_heartbeats.sql` already used.

select cron.schedule(
  'send-owner-reminders-sweep',
  '*/15 * * * *',
  $job$
  select net.http_post(
    url := 'https://kguqylyzgyzfktkfnhjb.supabase.co/functions/v1/send-owner-reminders',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
  $job$
);

-- **THE WATCHER HAS THE SAME DEFAULT AND THE SAME PROBLEM.** `watch-jobs` is
-- what NOTICES a stalled job, and its own calls were timing out at five seconds
-- too — visible in the same table at :22 and :52. A watchdog that cannot finish
-- its own HTTP call is a watchdog that eventually stops reporting, and it would
-- have failed silently in exactly the way it exists to prevent.
select cron.schedule(
  'watch-jobs',
  '7,22,37,52 * * * *',
  $job$
  select net.http_post(
    url := 'https://kguqylyzgyzfktkfnhjb.supabase.co/functions/v1/watch-jobs',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
  $job$
);
