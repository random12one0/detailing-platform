-- Phase 1 foundation: extensions, shared trigger functions, and the
-- rls_auto_enable event trigger (defensive: any table created in `public`
-- from now on gets RLS enabled + forced automatically, so a forgotten
-- ALTER TABLE can never ship an unprotected table).

create extension if not exists btree_gist;
create extension if not exists pgcrypto;

-- Keeps updated_at honest at the database level instead of trusting app code.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Rejects invalid IANA timezone names on businesses (e.g. a typo like
-- "America/Los_Angles" would otherwise silently break every availability
-- and reminder calculation for that tenant).
create or replace function public.validate_timezone()
returns trigger
language plpgsql
as $$
begin
  if not exists (select 1 from pg_timezone_names where name = new.timezone) then
    raise exception 'invalid timezone: %', new.timezone;
  end if;
  return new;
end;
$$;

create or replace function public.rls_auto_enable()
returns event_trigger
language plpgsql
as $$
declare
  obj record;
begin
  for obj in
    select * from pg_event_trigger_ddl_commands()
    where command_tag = 'CREATE TABLE' and schema_name = 'public'
  loop
    execute format('alter table %s enable row level security', obj.object_identity);
    execute format('alter table %s force row level security', obj.object_identity);
  end loop;
end;
$$;

drop event trigger if exists rls_auto_enable;
create event trigger rls_auto_enable
  on ddl_command_end
  when tag in ('CREATE TABLE')
  execute function public.rls_auto_enable();
