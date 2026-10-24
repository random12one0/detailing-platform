-- ROADMAP 4.3c (a) -- THE PREVIEW'S OWN "LET ME MAKE CHANGES" BUTTON LIFTS THE LOCK, FOR THAT SESSION ONLY.
--
-- Reconciliation, not an import: the held October 13 unlock design
-- (belt/4.3c-20261013101138: unlocked_at plus support_unlock/support_lock) ported onto the
-- October 17 expiry design (expires_at plus support_session_expired() plus the minute reaper).
--
-- Andrew, 2026-10-10: the preview opens read-only and HE lifts the lock when he chooses.
-- platform-admin's `support_unlock` stamps `unlocked_at` (audit-first: a failed audit row
-- stops the switch); `support_lock` clears it. A session counts as write-banned while it is
-- locked, or once its deadline has passed even unlocked -- expiry never restores writability.
--
-- On the October 17 warning ("the deadline must not live inside is_support_session()"): that
-- warning is about teaching the function "false once expired", which would turn an expired
-- support session back into a writable one. The added disjunct does the opposite -- an
-- expired marker keeps the function TRUE (banned) whether or not it was unlocked. Only an
-- unlocked marker whose deadline has NOT passed stops counting as a support session.
-- expires_at is NOT NULL with a 30-minute default (20261017180000), so no NULL branch is needed.
-- Keyed on the session as before, so the lift never reaches the owner's own logins or any
-- other preview tab, and the unlock never moves the deadline.

alter table public.support_sessions add column if not exists unlocked_at timestamptz;

create or replace function public.is_support_session()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.support_sessions
     where session_id = nullif(auth.jwt() ->> 'session_id', '')::uuid
       and (unlocked_at is null or expires_at <= now())
  );
$$;
revoke execute on function public.is_support_session() from public, anon;
grant execute on function public.is_support_session() to authenticated, service_role;
