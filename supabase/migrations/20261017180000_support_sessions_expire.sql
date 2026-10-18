-- ROADMAP 97.15 — A SUPPORT SESSION ENDS AFTER 30 MINUTES, AND THE DATABASE IS WHAT SAYS SO.
--
-- 4.3c (20261010030000_support_sessions_read_only.sql) made a support session read-only, but
-- nothing ended it: platform-admin handed the browser a refresh token, so the session could renew
-- itself for ever. platform-admin no longer hands that token over; this gives the marker a
-- deadline and refuses an expired session EVERYTHING, reads included.
--
-- WHY THE DEADLINE IS NOT INSIDE is_support_session(). That function is the write ban, and every
-- write rule asks `not is_support_session()`. Teaching it "false once expired" would turn an
-- expired support session back into the owner's ordinary, WRITABLE session. So a listed session
-- stays write-banned for ever, and its sibling below answers the one new question.

alter table public.support_sessions add column if not exists expires_at timestamptz;
update public.support_sessions set expires_at = created_at + interval '30 minutes' where expires_at is null;
alter table public.support_sessions
  alter column expires_at set default now() + interval '30 minutes',
  alter column expires_at set not null;

create or replace function public.support_session_expired()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.support_sessions
     where session_id = nullif(auth.jwt() ->> 'session_id', '')::uuid
       and expires_at <= now()
  );
$$;
revoke execute on function public.support_session_expired() from public, anon;
grant execute on function public.support_session_expired() to authenticated, service_role;

-- Same body as 4.3c plus ONE restrictive SELECT rule. Keeping the name means every later
-- migration that already has to call this (tests/support-sessions-sql.test.mjs guards that)
-- gets the expiry rule on its new table without knowing it exists.
create or replace function public.refuse_support_writes(p_table regclass)
returns void
language plpgsql
set search_path = public
as $$
begin
  execute format('drop policy if exists support_read_only_insert on %s', p_table);
  execute format('drop policy if exists support_read_only_update on %s', p_table);
  execute format('drop policy if exists support_read_only_delete on %s', p_table);
  execute format('drop policy if exists support_expired_select on %s', p_table);
  execute format('create policy support_read_only_insert on %s as restrictive for insert to authenticated with check (not (select public.is_support_session()))', p_table);
  execute format('create policy support_read_only_update on %s as restrictive for update to authenticated using (not (select public.is_support_session())) with check (not (select public.is_support_session()))', p_table);
  execute format('create policy support_read_only_delete on %s as restrictive for delete to authenticated using (not (select public.is_support_session()))', p_table);
  execute format('create policy support_expired_select on %s as restrictive for select to authenticated using (not (select public.support_session_expired()))', p_table);
end;
$$;
revoke execute on function public.refuse_support_writes(regclass) from public, anon, authenticated;

do $$
declare t regclass;
begin
  for t in
    select c.oid::regclass from pg_class c join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity
  loop
    perform public.refuse_support_writes(t);
  end loop;
  if to_regclass('storage.objects') is not null then
    perform public.refuse_support_writes('storage.objects'::regclass);
  end if;
end;
$$;
