-- Staff accounts: invites, role-restricted policies, last-owner protection.
--
-- Role model (enforced HERE, not in the UI):
--   owner — everything.
--   staff — bookings, calendar, customers. The database returns ZERO rows
--           from expenses, business_settings, promo_codes, campaigns and
--           campaign_visits for a staff session, regardless of what any
--           frontend does.
--
-- Deliberately deferred (see DECISIONS.md): per-employee job assignment and
-- per-employee availability. The schema doesn't foreclose it — a later
-- assigned_user_id on bookings plus per-user hours tables can be added
-- without touching what exists.

-- Denormalized email so the team roster can render without touching
-- auth.users (filled by accept-invite; backfill is a no-op for new rows).
alter table public.business_users add column if not exists email text;

-- ---------------------------------------------------------------------------
-- Invites
-- ---------------------------------------------------------------------------

create table public.business_invites (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  email       text not null,
  role        text not null default 'staff' check (role in ('owner','staff')),
  token       text not null unique default encode(gen_random_bytes(24), 'hex'),
  invited_by  uuid references auth.users(id),
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null default now() + interval '7 days',
  revoked_at  timestamptz,
  accepted_at timestamptz
);

create index business_invites_business_idx on public.business_invites (business_id);

alter table public.business_invites enable row level security;
alter table public.business_invites force row level security;

-- Owners manage their business's invites; staff get nothing.
create policy business_invites_owner_select on public.business_invites
  for select to authenticated using (public.is_business_owner(business_id));
create policy business_invites_owner_insert on public.business_invites
  for insert to authenticated with check (public.is_business_owner(business_id));
create policy business_invites_owner_update on public.business_invites
  for update to authenticated
  using (public.is_business_owner(business_id))
  with check (public.is_business_owner(business_id));

-- Accept-invite (service role) resolves an existing account by email.
create or replace function public.get_user_id_by_email(p_email text)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from auth.users where lower(email) = lower(p_email) limit 1;
$$;
revoke execute on function public.get_user_id_by_email(text) from public, anon, authenticated;
grant execute on function public.get_user_id_by_email(text) to service_role;

-- ---------------------------------------------------------------------------
-- The last owner can never be removed or demoted — enforced by trigger, so
-- it binds every caller including the service role.
-- ---------------------------------------------------------------------------

create or replace function public.protect_last_owner()
returns trigger
language plpgsql
as $$
declare
  remaining integer;
begin
  if (tg_op = 'DELETE' and old.role = 'owner')
     or (tg_op = 'UPDATE' and old.role = 'owner' and new.role <> 'owner') then
    select count(*) into remaining
    from public.business_users
    where business_id = old.business_id and role = 'owner' and user_id <> old.user_id;
    if remaining = 0 then
      raise exception 'cannot remove or demote the last owner of a business';
    end if;
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

create trigger business_users_protect_last_owner
  before update or delete on public.business_users
  for each row execute function public.protect_last_owner();

-- Owners manage membership of their own business (remove someone = access
-- revoked immediately: current_business_ids() stops returning the business
-- on their very next request).
create policy business_users_owner_update on public.business_users
  for update to authenticated
  using (public.is_business_owner(business_id))
  with check (public.is_business_owner(business_id));
create policy business_users_owner_delete on public.business_users
  for delete to authenticated
  using (public.is_business_owner(business_id));

-- ---------------------------------------------------------------------------
-- Tighten money/marketing/settings tables to owners only.
-- (They previously used the any-member tenant policy.)
-- ---------------------------------------------------------------------------

do $$
declare
  t text;
begin
  foreach t in array array['expenses', 'promo_codes', 'campaigns', 'campaign_visits']
  loop
    execute format('drop policy if exists %I on public.%I', t || '_tenant_all', t);
    execute format($p$
      create policy %I on public.%I
        for all to authenticated
        using (public.is_business_owner(business_id))
        with check (public.is_business_owner(business_id))
    $p$, t || '_owner_all', t);
  end loop;
end;
$$;

drop policy if exists business_settings_member_select on public.business_settings;
create policy business_settings_owner_select on public.business_settings
  for select to authenticated using (public.is_business_owner(business_id));
-- (business_settings_owner_write already restricts updates to owners.)
