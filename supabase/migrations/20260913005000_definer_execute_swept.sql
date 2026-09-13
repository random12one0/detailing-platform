-- WHO CAN EXECUTE A `security definer` FUNCTION — swept across the whole
-- schema, 2026-09-13. Lane C.
--
-- ============================================================================
-- WHY THIS EXISTS, AND IT IS NOT A TIDY-UP
-- ============================================================================
-- `20260913003000` fixed ONE function's grants after proving that
-- `revoke all on function … from anon, authenticated` takes nothing away while
-- `create function`'s grant to PUBLIC stands. `FOUND.md` parked the wider
-- question that night: *"every `security definer` function in this repo
-- deserves the same three-line probe."*
--
-- **THE PROBE WAS RUN AND IT FOUND FIVE.** Every claim below was measured
-- against the live database and, where it was a privilege, PROVED by calling
-- the function with the anon key or with a real detailer session — not read off
-- a migration.
--
-- ── THE ONE THAT MATTERS ───────────────────────────────────────────────────
-- `public.get_bookings_due_for_second_reminder()` returns **`setof
-- public.bookings`** from `select b.*` with **no tenant filter**, and it had
-- NO grant or revoke line of any kind — so it carried `create function`'s
-- PUBLIC grant plus this project's default privilege to `anon` and
-- `authenticated`. **Proved: `POST /rest/v1/rpc/…` with the ANON KEY returned
-- 200.** The six siblings around it are all correctly locked to `service_role`;
-- `get_bookings_due_for_reminder(text)`, written six days earlier, carries the
-- exact revoke this one was missing. The body was copied and the grants were
-- not.
--
-- **AND A DEFINER FUNCTION OWNED BY `postgres` HAS NO RLS AT ALL.** Measured:
-- `postgres` carries `rolbypassrls = true`, so `force row level security` on
-- `bookings` — which IS set — does not apply inside it. Whoever holds EXECUTE
-- reads every customer's name, email, phone and address on every business on
-- the platform. **The anon key ships in the browser bundle.**
--
-- **IT RETURNED `[]` WHEN PROBED, AND THAT IS WHY NOBODY SAW IT.** Zero of
-- fifteen businesses have `customer_reminder_2_enabled` today, so the select
-- matches nothing. This is the same shape as the `monthAgo` scope error
-- `FOUND.md` records: a fault sitting behind an empty set, invisible until the
-- first row appears. The first detailer to switch on a second reminder opens it.
--
-- ── AND THE ROOT CAUSE IS A DEFAULT PRIVILEGE, SO IT WILL RECUR ─────────────
-- Measured in `pg_default_acl`: this project carries
-- `alter default privileges in schema public grant execute on functions to
-- anon, authenticated`, from BOTH `postgres` and `supabase_admin`. A new
-- function is therefore born with **three** grants — PUBLIC, anon,
-- authenticated — and a migration that revokes one or two of the three reads
-- as if it closed the door.
--
-- **THE DEFAULT PRIVILEGE IS DELIBERATELY NOT REMOVED HERE.** It governs every
-- future function in a schema Supabase's own tooling also writes into, and
-- changing it would trade a visible fault for an invisible one. What closes the
-- class instead is `tests/definer-grants.test.mjs`, which asks the LIVE
-- database for every definer function's ACL and fails on any that is reachable
-- without a written reason. A grep of this file for the word `revoke` would
-- have passed on the bug that prompted it; that suite asks the database.
--
-- ── THE INVARIANT THIS ESTABLISHES ─────────────────────────────────────────
-- **NO `security definer` FUNCTION CARRIES A PUBLIC GRANT.** Anything meant to
-- be reachable names `anon` and `authenticated` explicitly. PUBLIC is the grant
-- that reaches roles nobody has thought about and the one every
-- `revoke … from anon` silently fails to remove, so it stops being the
-- mechanism even where the reach is correct. Ten functions carried it; all ten
-- are named below and six of them keep exactly the reach they had.
-- ============================================================================


-- ---------------------------------------------------------------------------
-- 1. LOCKED TO `service_role`. Nothing in `app/src` calls any of these.
-- ---------------------------------------------------------------------------

-- The cross-tenant booking read. Its own sibling's revoke, six days late.
-- Caller: `supabase/functions/send-owner-reminders/index.ts`, service role.
revoke all on function public.get_bookings_due_for_second_reminder()
  from public, anon, authenticated;
grant execute on function public.get_bookings_due_for_second_reminder()
  to service_role;

-- THE DEAD MAN'S SWITCH'S OWN HEARTBEAT, and a detailer could forge it.
-- `20260906006000` revoked from `public, anon` and not from `authenticated`,
-- which this project's default privilege had already granted. **Proved: a real
-- `demo@detailplatform.com` session got 204 from
-- `POST /rest/v1/rpc/note_heartbeat` and a junk row appeared in
-- `job_heartbeats`** (deleted again immediately). An instrument whose whole job
-- is to say when a cron has stopped must not be writable by its own audience —
-- that is `FOUND.md`'s seventh costume with a hand on the lever.
-- Callers: `send-owner-reminders`, `watch-jobs`, and the cron, all service role.
revoke all on function public.note_heartbeat(text, jsonb)
  from public, anon, authenticated;
grant execute on function public.note_heartbeat(text, jsonb)
  to service_role;

-- A TRIGGER FUNCTION. `create trigger` checks EXECUTE; firing does not, which
-- is why `translations_never_a_name` is fully locked in this same schema and
-- works. Nobody calls this by hand and PostgREST will not expose it.
revoke all on function public.link_booking_to_plan()
  from public, anon, authenticated;


-- ---------------------------------------------------------------------------
-- 2. AUTHENTICATED ONLY — the dashboard calls these, the internet must not.
-- ---------------------------------------------------------------------------
-- Both were granted to `authenticated` on purpose and neither revoked PUBLIC,
-- so both answered the anon key. **Proved: `job_photo_budget` returned
-- `{used_bytes, cap_bytes, photos}` to anon for an arbitrary business id, and
-- `photo_total_bytes` returned the platform-wide total.** Their correctly
-- locked sibling is `photo_store_state()`.
--
-- `job_photo_budget` still does NOT check membership, so a detailer can read
-- another business's storage numbers. That is a narrower fault than an open
-- internet read, it needs a decision about which permission gates it, and it is
-- logged in `FOUND.md` rather than guessed at here.
revoke all on function public.job_photo_budget(uuid) from public, anon;
grant execute on function public.job_photo_budget(uuid) to authenticated, service_role;

revoke all on function public.photo_total_bytes() from public, anon;
grant execute on function public.photo_total_bytes() to authenticated, service_role;


-- ---------------------------------------------------------------------------
-- 3. PUBLIC CLOSED, REACH UNCHANGED.
-- ---------------------------------------------------------------------------
-- Every function below is reachable ON PURPOSE and stays exactly as reachable.
-- The only change is that it is reached by a NAMED role instead of by PUBLIC.
-- `anon` and `authenticated` are granted explicitly in the same statement pair,
-- so nothing a customer or a detailer can do today stops working — verified
-- afterwards by calling the public read with the anon key.

-- The public read surface: one RPC is the whole tenant read (contract § 3).
revoke all on function public.get_public_business_profile(text) from public;
grant execute on function public.get_public_business_profile(text)
  to anon, authenticated, service_role;

revoke all on function public.get_public_business_profile_by_host(text) from public;
grant execute on function public.get_public_business_profile_by_host(text)
  to anon, authenticated, service_role;

-- The customer's Spanish lookup (roadmap item 3).
revoke all on function public.get_business_translations(text, text) from public;
grant execute on function public.get_business_translations(text, text)
  to anon, authenticated, service_role;

-- A PUBLIC hostname. Nothing private in the answer.
revoke all on function public.business_canonical_host(uuid) from public;
grant execute on function public.business_canonical_host(uuid)
  to anon, authenticated, service_role;

-- RLS HELPERS. A policy expression is evaluated with the privileges of the
-- QUERYING role, so every role a policy can be evaluated for must hold EXECUTE
-- or the policy errors. Both are granted to `anon` as well as `authenticated`
-- deliberately: that is the reach they have today, and narrowing it in the same
-- change that closes PUBLIC would make a policy failure look like this sweep.
-- Each answers about the CALLER, so a caller with no membership gets nothing.
revoke all on function public.is_business_owner(uuid) from public;
grant execute on function public.is_business_owner(uuid)
  to anon, authenticated, service_role;

revoke all on function public.current_business_ids() from public;
grant execute on function public.current_business_ids()
  to anon, authenticated, service_role;
