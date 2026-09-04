-- Custom roles: a detailer names the role and ticks what it can do.
-- Roadmap 2.13, the owner's ask of 2026-08-31.
--
-- WHAT DID NOT CHANGE, AND THAT IS THE DESIGN.
--   `business_users.role` keeps its two values. `owner` still means
--   EVERYTHING, always — so `is_business_owner()` is untouched and
--   `protect_last_owner()` still makes "a business nobody can administer"
--   unreachable, including for the service role. Replacing `role` with a
--   permission set would have taken that trigger's subject away from it.
--   What is new is that a NON-owner is no longer one fixed shape: the
--   membership carries its own name and its own list of permissions.
--
-- THE VOCABULARY IS CLOSED, BY CONSTRAINT.
--   Each permission is the key to a group of policies that ALREADY existed
--   as an owner-only group, so the list is derived from the database rather
--   than invented:
--     money      expenses (the Money tab)
--     marketing  promo_codes, campaigns, campaign_visits
--     settings   business_settings, business_branding, businesses,
--                business_domains, message_templates writes
--     requests   answering a booking request (enforced in respond-to-booking;
--                it is the one permission that TAKES AWAY something staff
--                have today, so existing staff are backfilled with it)
--   A typo'd permission grants nothing and looks exactly like a permission
--   that was never ticked, so the array is constrained rather than trusted.
--
-- MANAGING THE TEAM IS NOT A TICK BOX AND THAT IS DELIBERATE.
--   A member who can invite people and set permissions can grant themselves
--   any other permission, so "team" is "everything" wearing a smaller name.
--   Making it safe needs a grant lattice (you may only give what you hold),
--   which nobody has asked for. Invites and membership stay owner-only.

alter table public.business_users
  add column if not exists label       text,
  add column if not exists permissions text[] not null default '{}';

alter table public.business_invites
  add column if not exists label       text,
  add column if not exists permissions text[] not null default '{}';

alter table public.business_users
  add constraint business_users_permissions_known
  check (permissions <@ array['money','marketing','settings','requests']::text[]);

alter table public.business_invites
  add constraint business_invites_permissions_known
  check (permissions <@ array['money','marketing','settings','requests']::text[]);

-- Everyone who already exists keeps exactly what they can do today: staff
-- answer requests (`respond-to-booking` uses requireMember and does not
-- distinguish the roles) and nothing else that is owner-gated.
update public.business_users
   set permissions = array['requests']::text[]
 where role = 'staff' and permissions = '{}';

update public.business_invites
   set permissions = array['requests']::text[]
 where role = 'staff' and permissions = '{}'
   and accepted_at is null and revoked_at is null;

-- The mirror of is_business_owner(), and it FOLDS THE OWNER IN on purpose:
-- every policy below then asks one question instead of two, and there is no
-- way to write a permission check that forgets owners.
create or replace function public.has_business_permission(p_business_id uuid, p_permission text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.business_users
    where business_id = p_business_id
      and user_id = auth.uid()
      and (role = 'owner' or p_permission = any(permissions))
  );
$$;

revoke execute on function public.has_business_permission(uuid, text) from public, anon;
grant execute on function public.has_business_permission(uuid, text) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Re-point the owner-only policies at their permission.
-- Same tables, same shape, one predicate swapped.
-- ---------------------------------------------------------------------------

-- money
drop policy if exists expenses_owner_all on public.expenses;
create policy expenses_permission_all on public.expenses
  for all to authenticated
  using (public.has_business_permission(business_id, 'money'))
  with check (public.has_business_permission(business_id, 'money'));

-- marketing
do $$
declare
  t text;
begin
  foreach t in array array['promo_codes', 'campaigns', 'campaign_visits']
  loop
    execute format('drop policy if exists %I on public.%I', t || '_owner_all', t);
    execute format($p$
      create policy %I on public.%I
        for all to authenticated
        using (public.has_business_permission(business_id, 'marketing'))
        with check (public.has_business_permission(business_id, 'marketing'))
    $p$, t || '_permission_all', t);
  end loop;
end;
$$;

-- settings
drop policy if exists business_settings_owner_select on public.business_settings;
create policy business_settings_permission_select on public.business_settings
  for select to authenticated
  using (public.has_business_permission(business_id, 'settings'));

drop policy if exists business_settings_owner_write on public.business_settings;
create policy business_settings_permission_update on public.business_settings
  for update to authenticated
  using (public.has_business_permission(business_id, 'settings'))
  with check (public.has_business_permission(business_id, 'settings'));

drop policy if exists business_settings_owner_insert on public.business_settings;
create policy business_settings_permission_insert on public.business_settings
  for insert to authenticated
  with check (public.has_business_permission(business_id, 'settings'));

drop policy if exists business_branding_owner_write on public.business_branding;
create policy business_branding_permission_update on public.business_branding
  for update to authenticated
  using (public.has_business_permission(business_id, 'settings'))
  with check (public.has_business_permission(business_id, 'settings'));

drop policy if exists business_branding_owner_insert on public.business_branding;
create policy business_branding_permission_insert on public.business_branding
  for insert to authenticated
  with check (public.has_business_permission(business_id, 'settings'));

drop policy if exists businesses_owner_update on public.businesses;
create policy businesses_permission_update on public.businesses
  for update to authenticated
  using (public.has_business_permission(id, 'settings'))
  with check (public.has_business_permission(id, 'settings'));

drop policy if exists message_templates_owner_write on public.message_templates;
create policy message_templates_permission_write on public.message_templates
  for all to authenticated
  using (public.has_business_permission(business_id, 'settings'))
  with check (public.has_business_permission(business_id, 'settings'));

drop policy if exists business_domains_owner_insert on public.business_domains;
drop policy if exists business_domains_owner_update on public.business_domains;
drop policy if exists business_domains_owner_delete on public.business_domains;
create policy business_domains_permission_insert on public.business_domains
  for insert to authenticated
  with check (public.has_business_permission(business_id, 'settings'));
create policy business_domains_permission_update on public.business_domains
  for update to authenticated
  using (public.has_business_permission(business_id, 'settings'))
  with check (public.has_business_permission(business_id, 'settings'));
create policy business_domains_permission_delete on public.business_domains
  for delete to authenticated
  using (public.has_business_permission(business_id, 'settings'));

-- business_invites and business_users keep is_business_owner(). See the
-- header: making team management a permission makes every other permission
-- self-grantable.
