-- ROADMAP 97.3 — THE FOUR SCHEDULED CALLS CARRY THE SCHEDULER'S KEY.
--
-- `send-owner-reminders` (its sweep), `refresh-weather`, `watch-jobs` and
-- `photo-reconcile` are public at the gateway because pg_cron has no session,
-- and until 97.3 that meant anybody could fire them. Each function now refuses
-- a call whose `x-cron-secret` header does not equal its `CRON_SECRET`
-- environment value (`supabase/functions/_shared/cronAuth.ts`).
--
-- **THE VALUE IS NEVER IN THIS FILE.** Each call reads it from Supabase Vault
-- by name, `cron_secret`, at the moment it fires. Andrew puts the same value in
-- Vault and in the Edge Function secrets — `FOR-ANDREW.md`, "97.3".
--
-- **APPLY IT BEFORE THE FUNCTIONS ARE PUBLISHED.** The functions running today
-- ignore a header they do not read, so this is harmless on its own; the new
-- functions without it refuse every scheduled run. If the Vault row is missing
-- the `from` below matches nothing and the call is simply not made, so check
-- the row exists first (the FOR-ANDREW step does).
--
-- Every schedule, URL and timeout is unchanged from the entry it replaces:
--   send-owner-reminders-sweep  20260913001000_cron_http_timeout.sql
--   watch-jobs                  20260913001000_cron_http_timeout.sql
--   refresh-weather             20260913010000_weather_cache.sql (no timeout passed; 30000 now, like the sweep)
--   photo-reconcile             20261009120000_photo_reconcile_cron_timeout.sql
-- `cron.schedule` on an existing name replaces it, the pattern those used.

select cron.schedule(
  'send-owner-reminders-sweep',
  '*/15 * * * *',
  $job$
  select net.http_post(
    url := 'https://kguqylyzgyzfktkfnhjb.supabase.co/functions/v1/send-owner-reminders',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', s.decrypted_secret),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  ) from vault.decrypted_secrets s where s.name = 'cron_secret';
  $job$
);

select cron.schedule(
  'watch-jobs',
  '7,22,37,52 * * * *',
  $job$
  select net.http_post(
    url := 'https://kguqylyzgyzfktkfnhjb.supabase.co/functions/v1/watch-jobs',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', s.decrypted_secret),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  ) from vault.decrypted_secrets s where s.name = 'cron_secret';
  $job$
);

select cron.schedule(
  'refresh-weather',
  '7 * * * *',
  $job$
  select net.http_post(
    url := 'https://kguqylyzgyzfktkfnhjb.supabase.co/functions/v1/refresh-weather',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', s.decrypted_secret),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  ) from vault.decrypted_secrets s where s.name = 'cron_secret';
  $job$
);

select cron.schedule(
  'photo-reconcile',
  '40 3 * * *',
  $job$
  select net.http_post(
    url := 'https://kguqylyzgyzfktkfnhjb.supabase.co/functions/v1/photo-reconcile',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', s.decrypted_secret),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  ) from vault.decrypted_secrets s where s.name = 'cron_secret';
  $job$
);
