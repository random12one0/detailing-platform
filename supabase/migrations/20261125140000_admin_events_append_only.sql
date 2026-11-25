-- Refs #18 (ROADMAP 4.1b). `platform_admin_events` is the back office's audit trail
-- (suspend, restore, impersonation). It was locked from browsers but NOT append-only:
-- the service role (every edge function) could UPDATE or DELETE a row, so a bug or a
-- careless edit could rewrite history. `action_log` already refuses this; this does the
-- same here.
--
-- One exception, on purpose: the foreign key `business_id ... on delete set null` writes
-- an UPDATE when a business is deleted. That single change (business_id -> null, every
-- other column untouched) is allowed so deleting a business still works. The row keeps
-- `business_name`, so nothing is lost.
--
-- DELETE is refused, which also means deleting an admin's auth user (`admin_id ... on
-- delete cascade`) is refused while that admin has events. Nothing in the product does
-- that, and an audit row should outlive the account it names.

create or replace function public.platform_admin_events_guard()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'UPDATE'
     and old.business_id is not null and new.business_id is null
     and (new.id, new.admin_id, new.admin_email, new.business_name, new.action, new.detail, new.created_at)
         is not distinct from
         (old.id, old.admin_id, old.admin_email, old.business_name, old.action, old.detail, old.created_at)
  then
    return new;
  end if;
  raise exception 'platform_admin_events is append-only: % is refused', tg_op;
end;
$$;

drop trigger if exists platform_admin_events_no_change on public.platform_admin_events;
create trigger platform_admin_events_no_change
  before update or delete on public.platform_admin_events
  for each row execute function public.platform_admin_events_guard();

drop trigger if exists platform_admin_events_no_truncate on public.platform_admin_events;
create trigger platform_admin_events_no_truncate
  before truncate on public.platform_admin_events
  for each statement execute function public.platform_admin_events_guard();
