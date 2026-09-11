-- THE REMINDER SWEEP'S ALARM WAS CRYING WOLF TWENTY-FOUR TIMES A DAY.
--
-- Found 2026-09-09 while checking whether Resend's API could show the owner
-- his sent mail. It could — and the last forty messages in the account were
-- almost entirely this, alternating:
--
--     "The reminder sweep has stopped running"   08:22
--     "The reminder sweep is running again"      08:37
--     "The reminder sweep has stopped running"   13:52
--     "The reminder sweep is running again"      14:04
--     ... twelve or more complete cycles in about forty hours.
--
-- WHAT IS ACTUALLY WRONG, established by testing rather than by reading:
-- `send-owner-reminders` was invoked directly with the service role and
-- answered `200 {"success":true,"count":0}` in 5.6 seconds, stamping its
-- heartbeat correctly. **The function is healthy.** What is unreliable is the
-- SCHEDULER: at the moment of that test the last automatic run was 00:45 and
-- the clock was 01:19, so two 15-minute ticks had been missed with nothing
-- wrong at the far end. `pg_cron` firing `net.http_post` drops runs.
--
-- WHY THE ALARM WAS THEREFORE GUARANTEED TO FIRE. The sweep is scheduled
-- `*/15 * * * *` (20260829000000_reminder_sweep_cron.sql) and the window was
-- 45 minutes — so THREE consecutive missed ticks set it off, and three
-- consecutive missed ticks is a normal Tuesday. The window was not chosen
-- badly; the scheduler simply turned out to be less reliable than the number
-- assumed.
--
-- WHY WIDENING IS THE RIGHT FIX AND NOT A COVER-UP:
--
--   * **Nothing is lost when a tick is missed.** The sweep catches up on the
--     next run — the alert email says so itself. So the missed ticks are a
--     latency problem, not a correctness one, and reminders arriving up to an
--     hour late is not a failure worth waking anybody for.
--   * **The cost of the noise is real and is the actual damage.** Twenty-four
--     messages a day trains the reader to ignore them, and this alarm is the
--     ONLY thing watching the sweeps. An alarm nobody reads is worse than no
--     alarm, because it is also consuming ~24% of the 100/day platform email
--     cap to say nothing.
--   * **Three hours still catches a real death.** At `*/15` that is twelve
--     consecutive failures. Nothing observed comes close; the longest measured
--     gap was two hours, once.
--
-- WHAT THIS DOES NOT DO, deliberately: it does not touch the schedule, the
-- function, or `accrue-plan-visits` (36 hours, for a job that runs daily —
-- that one has never alarmed). And it does not pretend the scheduler is
-- reliable. **If the gaps grow past three hours this will start firing again,
-- which is exactly what should happen** — the number is a threshold for "this
-- is now worth your attention", and it has been moved to where that is true.
--
-- THE INVESTIGATION THAT IS NOT BEING DONE HERE, and why: finding out why
-- `pg_cron`/`pg_net` drops runs is an open-ended dig with no guaranteed end,
-- against a symptom that costs nothing but noise. The owner was given both
-- options and chose this one. `docs/back-office-plan-2026-09-09.md` § 11 is
-- the full account, and § 8's uptime-history item is what would make the next
-- occurrence diagnosable instead of anecdotal.

update public.job_heartbeats
   set stale_after_seconds = 3 * 60 * 60
 where job = 'send-owner-reminders';

-- Any alert outstanding at this moment refers to the OLD threshold, and
-- leaving it set would make the next healthy run send a "running again" for a
-- stoppage that no longer counts as one.
update public.job_heartbeats
   set alerted_at = null
 where job = 'send-owner-reminders'
   and alerted_at is not null;
