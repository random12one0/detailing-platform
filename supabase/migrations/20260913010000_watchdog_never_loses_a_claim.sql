-- THE WATCHDOG CRIED WOLF AND NEVER SAID ALL-CLEAR. Measured 2026-09-13.
--
-- Andrew's report: Resend shows "The reminder sweep has stopped running" at
-- 11:22 UTC on 12 September and **no "is running again" after it**, while the
-- back office shows the job finishing inside its threshold. It recovered
-- silently. His words for why that is worse than no monitor at all: *"a
-- watchdog that only ever cries wolf is one Andrew learns to ignore."*
--
-- ---------------------------------------------------------------------------
-- THE CAUSE, WITH TIMESTAMPS OUT OF THE PROJECT'S OWN EDGE LOGS.
-- ---------------------------------------------------------------------------
-- `watch-jobs` does two REST calls in order: it CLAIMS the change set, and
-- then it reads `platform_settings` for the address to send to.
--
--     2026-09-13T01:53:52Z  note_heartbeat            204   <- the sweep is back
--     2026-09-13T02:07:00.819Z  rpc/claim_job_alerts   200   <- claims "recovered"
--     2026-09-13T02:07:00.914Z  platform_settings      504   <- and then this
--
-- The claim had already set `alerted_at` back to NULL. The settings read timed
-- out, so `ps` was undefined, so `ps?.owner_email` was falsy, so the function
-- fell into its "there is no owner_email to tell" branch, logged a line, and
-- **threw the only notice of the recovery away.** At 02:22 there was nothing
-- left to report. The same pair failed identically at 01:52:02.
--
-- **IT IS NOT A RARE COINCIDENCE, IT IS THE HOUSE RATE.** `FOUND.md` § THE
-- "GATEWAY TIMEOUT" IS OUR OWN CATCH BLOCK measured ~1.1% of every REST call
-- this project makes returning 504 from Supabase's API layer, and a function's
-- chance of dying is its NUMBER OF REST CALLS. Two calls every fifteen
-- minutes is ~2,900 calls a month, so this loses a claim about thirty times a
-- month — and it does it to STOPPAGES exactly as readily as to recoveries.
-- **The alarm that matters most is lost by the same line.**
--
-- ---------------------------------------------------------------------------
-- THE FIX IS AN ORDERING, AND IT LIVES IN THE EDGE FUNCTION.
-- ---------------------------------------------------------------------------
-- Read the settings FIRST and claim only if that read succeeded. A 504 then
-- costs one skipped tick instead of one lost alarm, because nothing was
-- consumed and the next run fifteen minutes later sees the same change.
--
-- **AND THE `error` HAS TO BE READ, not just the data.** `.maybeSingle()`
-- returns no row and an error through the same `data: null`, so a failed read
-- and an unconfigured product were the same value — which is the seventh
-- costume of an instrument reporting fine when it cannot tell.
--
-- ---------------------------------------------------------------------------
-- WHAT THIS FILE CHANGES: THE UNDO NOW WORKS IN BOTH DIRECTIONS.
-- ---------------------------------------------------------------------------
-- The ordering above closes the observed bug. The relay can still refuse
-- AFTER a good claim — a Resend 429 on the daily cap returns non-2xx and
-- `sendTenantEmail` answers false — and `release_job_alerts` deliberately
-- re-armed only the stoppages, on the stated grounds that *"a lost recovery
-- notice is good news he can also read on the screen."*
--
-- **THAT TRADE IS THE THING ANDREW HAS NOW REJECTED.** A stoppage with no
-- all-clear is not a smaller failure than a missed stoppage; it is the failure
-- that teaches him to stop opening the emails, which costs both.
--
-- So the undo takes the whole change set. `alerted_at = null` re-arms a
-- stoppage (it will be re-detected as newly stale); `alerted_at = now()`
-- re-arms a recovery (it will be re-detected as newly recovered). One function
-- and one call, because two half-undos is how one of them gets forgotten —
-- which is precisely what happened here.
create or replace function public.restore_job_alerts(
  p_stale text[],
  p_recovered text[]
)
returns void
language sql
security definer
set search_path = public
as $fn$
  update public.job_heartbeats
     set alerted_at = case
           when job = any(coalesce(p_recovered, '{}'::text[])) then now()
           else null
         end
   where job = any(coalesce(p_stale, '{}'::text[]))
      or job = any(coalesce(p_recovered, '{}'::text[]));
$fn$;

comment on function public.restore_job_alerts(text[], text[]) is
  'Puts a claimed alert back when the email did not go, in BOTH directions - null re-arms a stoppage, now() re-arms a recovery. Replaces release_job_alerts, which only did the first half. Roadmap 8.12, corrected 2026-09-13.';

revoke all on function public.restore_job_alerts(text[], text[])
  from public, anon, authenticated;
grant execute on function public.restore_job_alerts(text[], text[]) to service_role;

-- THE OLD HALF-UNDO GOES, rather than sitting beside the new one waiting to be
-- called by mistake. Nothing else in the repo referenced it: `watch-jobs` was
-- its only caller and now calls the replacement. Dropping a function is not
-- editing a migration - the append-only rule is about rewriting history, and
-- this is a new statement in a new file.
drop function if exists public.release_job_alerts(text[]);
