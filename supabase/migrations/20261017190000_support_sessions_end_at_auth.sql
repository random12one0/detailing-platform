-- ROADMAP 97.15, review fixes 3 and 4 — A SUPPORT SESSION THAT HAS ENDED AT AUTH IS ENDED AT THE
-- DATABASE TOO, AND ONE PAST ITS DEADLINE IS ENDED AT AUTH EVEN IF NOBODY PRESSES CLOSE.
--
-- Apply AFTER 20261010030000 and 20261017180000. The functions that read `expires_at`
-- (platform-admin, tenant.ts) go live after this, never before: platform-admin reads the deadline
-- back, and with no column it refuses to open the view at all.
--
-- 3. Close signs the session out at Auth, which deletes its `auth.sessions` row — but the access
--    token is a signed JWT and PostgREST never asks Auth, so until now the read rule (deadline only)
--    let a closed view's token keep reading for the rest of its hour. "Ended" is now EITHER past the
--    deadline OR no longer a session at Auth.
-- 4. A tab closed without pressing Close left its session alive at Auth for the token's hour, able
--    to change the owner's password or email (Auth's own updateUser never asks support_sessions).
--    Every minute, `end_expired_support_sessions()` deletes the Auth session of every marker past
--    its deadline; GoTrue then refuses that token for /user, including updateUser, and the delete
--    cascades to its refresh tokens. Worst case: ended within a minute of the 30.
--
-- Measured 2026-10-17 on kguqylyzgyzfktkfnhjb (read-only): `postgres` holds SELECT and DELETE on
-- auth.sessions; refresh_tokens and mfa_amr_claims reference it ON DELETE CASCADE; pg_cron is installed.

create or replace function public.support_session_expired()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.support_sessions m
     where m.session_id = nullif(auth.jwt() ->> 'session_id', '')::uuid
       and (m.expires_at <= now()
            or not exists (select 1 from auth.sessions s where s.id = m.session_id))
  );
$$;
revoke execute on function public.support_session_expired() from public, anon;
grant execute on function public.support_session_expired() to authenticated, service_role;

create or replace function public.end_expired_support_sessions()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare n integer;
begin
  delete from auth.sessions s
   using public.support_sessions m
   where s.id = m.session_id
     and m.expires_at <= now();
  get diagnostics n = row_count;
  return n;
end;
$$;
revoke execute on function public.end_expired_support_sessions() from public, anon, authenticated;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule('end-expired-support-sessions', '* * * * *', 'select public.end_expired_support_sessions()');
  end if;
end;
$$;
