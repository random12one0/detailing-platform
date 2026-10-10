-- ROADMAP 4.3c — A SUPPORT SESSION IS READ-ONLY, AND THE DATABASE IS WHAT SAYS SO.
--
-- The design is docs/design-4.3-support-session.md § "DECISION, 2026-10-10".
-- A support session is the owner's own identity (auth.uid() is the owner's), so
-- nothing keyed on WHO the caller is can tell it apart, and the 2026-09-21
-- ruling forbids trying. What differs is the SESSION: platform-admin exchanges
-- the sign-in link itself, writes the new session's id here, and only then hands
-- the tokens to the preview tab. Every write rule below asks one question —
-- "is the session id in this request's token listed here?" — so the owner's own
-- login, which is a different session, is never touched.
--
-- Fails closed where it can: platform-admin refuses to hand tokens over if the
-- row did not land. What it cannot fail closed on is a table added LATER without
-- the rule, so `refuse_support_writes(table)` is the one call a new migration
-- makes, and tests/support-sessions-sql.test.mjs reddens on a migration that
-- enables row-level security without it.

create table if not exists public.support_sessions (
  session_id  uuid primary key,
  user_id     uuid not null,
  business_id uuid not null,
  admin_id    uuid,
  created_at  timestamptz not null default now()
);
alter table public.support_sessions enable row level security;
-- No policy, and no privilege either: a support session must not be able to
-- read its own marker, and above all must not be able to delete it.
revoke all on public.support_sessions from public, anon, authenticated;
comment on table public.support_sessions is
  'ROADMAP 4.3c. One row per read-only support session, written by platform-admin before the preview tab receives the tokens. Keyed on the auth session id, never the user, so the owner''s own logins are untouched.';

-- Security definer so the policies can ask it without the caller holding any
-- privilege on support_sessions. No JWT (cron, the service role, a migration)
-- means no session id, which means false: those callers are not support views.
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
  );
$$;
revoke execute on function public.is_support_session() from public, anon;
grant execute on function public.is_support_session() to authenticated, service_role;

-- One RESTRICTIVE rule per write command. Restrictive means it is ANDed with
-- every permissive policy the table already has, so no existing policy can
-- outvote it. SELECT is deliberately absent: the support view exists to read.
-- `(select …)` makes Postgres ask once per statement rather than once per row.
create or replace function public.refuse_support_writes(p_table regclass)
returns void
language plpgsql
set search_path = public
as $$
begin
  execute format('drop policy if exists support_read_only_insert on %s', p_table);
  execute format('drop policy if exists support_read_only_update on %s', p_table);
  execute format('drop policy if exists support_read_only_delete on %s', p_table);
  execute format('create policy support_read_only_insert on %s as restrictive for insert to authenticated with check (not (select public.is_support_session()))', p_table);
  execute format('create policy support_read_only_update on %s as restrictive for update to authenticated using (not (select public.is_support_session())) with check (not (select public.is_support_session()))', p_table);
  execute format('create policy support_read_only_delete on %s as restrictive for delete to authenticated using (not (select public.is_support_session()))', p_table);
end;
$$;
revoke execute on function public.refuse_support_writes(regclass) from public, anon, authenticated;

-- Layer A: EVERY public table with row-level security on, discovered from the
-- catalog rather than listed, so a table the app never writes is covered too.
-- Layer B: storage.objects, where photo, receipt and logo uploads land.
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

-- Layer C: the two security-definer functions a signed-in caller can run whose
-- own body writes. They skip row rules, so each refuses for itself. Bodies are
-- otherwise unchanged from 20260904002000_plans.sql and
-- 20261006030000_dashboard_language_reaches_the_server.sql.
create or replace function public.accrue_plan_visits()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  n integer;
begin
  if public.is_support_session() then
    raise exception 'This is a read-only support view, so nothing can be changed here.' using errcode = '42501';
  end if;
  with due as (
    select
      m.business_id,
      m.id as member_id,
      p.visits_per_period,
      generate_series(
        greatest(
          m.accrue_from::timestamp,
          coalesce(
            (select max(v.due_on) from public.plan_visits v
              where v.member_id = m.id and v.kind = 'granted')
            + make_interval(
                weeks  => case when p.cadence_unit = 'week'  then p.cadence_count else 0 end,
                months => case when p.cadence_unit = 'month' then p.cadence_count else 0 end,
                years  => case when p.cadence_unit = 'year'  then p.cadence_count else 0 end
              ),
            m.accrue_from::timestamp
          )
        ),
        current_date::timestamp,
        make_interval(
          weeks  => case when p.cadence_unit = 'week'  then p.cadence_count else 0 end,
          months => case when p.cadence_unit = 'month' then p.cadence_count else 0 end,
          years  => case when p.cadence_unit = 'year'  then p.cadence_count else 0 end
        )
      )::date as due_on
    from public.plan_members m
    join public.plans p on p.id = m.plan_id
    -- `p.is_active` is deliberately not in this filter; see 20260904002000_plans.sql.
    where m.status = 'active'
      and p.cadence_unit is not null
  )
  insert into public.plan_visits (business_id, member_id, kind, delta, due_on)
  select business_id, member_id, 'granted', visits_per_period, due_on from due
  on conflict (member_id, due_on) where kind = 'granted' do nothing;
  get diagnostics n = row_count;
  return n;
end;
$$;

create or replace function public.set_my_lang(p_lang text)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
begin
  if public.is_support_session() then
    raise exception 'This is a read-only support view, so nothing can be changed here.' using errcode = '42501';
  end if;
  update public.business_users
     set lang = case when p_lang in ('en', 'es') then p_lang else null end
   where user_id = auth.uid();
end;
$$;
