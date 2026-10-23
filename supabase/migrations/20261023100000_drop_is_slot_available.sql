-- ROADMAP 100.5 (audit R1-08) — DROP THE THIRD, UNUSED "IS THIS TIME FREE" RULE.
--
-- public.is_slot_available (20260827000300_helpers.sql) was granted to signed-in
-- users but nothing called it: no app code, no edge function, no script, no other
-- SQL function, view, policy, trigger, default or cron job (checked read-only on
-- the dev database 2026-10-23: pg_depend and every function body came back empty).
-- Its only callers were probes in tests/tenant-isolation.test.mjs, removed with it.
-- It disagreed with the booking engine: it counted logged bulk dealership jobs
-- (bulk_vehicle_count) as busy and assumed a 60-minute buffer when settings were
-- missing. The one rule is validateSlot (supabase/functions/_shared/slotValidation.ts),
-- shown by available-slots and backed by the bookings_no_overlap constraint.
-- tests/is-slot-available-dropped.test.mjs fails if it, or a caller, comes back.

drop function if exists public.is_slot_available(uuid, timestamptz, timestamptz);
