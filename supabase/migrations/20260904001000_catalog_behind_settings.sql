-- The `settings` tick has to mean what its own words say.
-- Roadmap 2.13, second migration, same day.
--
-- WHY THIS EXISTS. The Team screen's tick for `settings` reads "Prices,
-- hours, booking rules, branding and the business's own details." The first
-- migration made that true of `business_settings`, `business_branding`,
-- `businesses` and `business_domains` — and PRICES AND HOURS ARE IN NEITHER
-- OF THOSE. `services.price` and `business_hours` were `*_tenant_all` from
-- `20260827000200_tenant_data.sql`: writable by ANY member, since long before
-- there were two roles. So a membership with every box unticked could still
-- have changed what the business charges.
--
-- IT WAS NOT REACHABLE AND THAT IS NOT THE SAME AS NOT BEING TRUE. Staff have
-- had no Business tab since roadmap 2.11, so nothing in the dashboard offered
-- it — but RLS is the enforcement in this product and a browser is not the
-- only client. What changed today is that a detailer is now shown a tick box
-- and told what it controls, and a promise on a settings screen that the
-- database does not keep is the "a number PRINTED is not a number CHARGED"
-- family one table over.
--
-- READING STAYS OPEN TO EVERY MEMBER, and that is load-bearing rather than
-- generous: a staff member has to read `services` to take a booking at all
-- (`tests/staff-roles.test.mjs`, "staff can read services (needed to book)"),
-- and DaySheet shows them an existing blockout or drop-off-only day because
-- it is worth their knowing before they load the van. So this splits each
-- policy in two rather than moving it.
--
-- WHAT DELIBERATELY DID NOT MOVE: customers, bookings and the booking_*
-- children. That is the diary, which is the whole job of a membership with
-- nothing ticked.

do $$
declare
  t text;
begin
  foreach t in array array[
    -- what a customer is offered and what it costs.
    -- `monthly_plans` is NOT in this list and that is not an oversight: it was
    -- created in `20260827000200_tenant_data.sql:51` and DROPPED nine hours
    -- later in `20260827001000_phase2_cleanup_and_storage.sql:16`. Roadmap
    -- 2.14 still cites it as existing, which is where the next session will
    -- look; that entry has been corrected.
    'services', 'service_groups', 'add_ons',
    -- what a customer is shown
    'testimonials', 'gallery_images',
    -- when the business is open, and the exceptions
    'business_hours', 'booking_hours_overrides', 'blockout_dates', 'dropoff_only_periods'
  ]
  loop
    execute format('drop policy if exists %I on public.%I', t || '_tenant_all', t);

    execute format($p$
      create policy %I on public.%I
        for select to authenticated
        using (business_id in (select public.current_business_ids()))
    $p$, t || '_member_select', t);

    -- One policy for the three writing verbs rather than three: `for all`
    -- also covers SELECT, but the permissive member policy above already
    -- grants that, and RLS ORs permissive policies together — so a member
    -- without the tick still reads, and only the write verbs are narrowed.
    execute format($p$
      create policy %I on public.%I
        for all to authenticated
        using (public.has_business_permission(business_id, 'settings'))
        with check (public.has_business_permission(business_id, 'settings'))
    $p$, t || '_settings_write', t);
  end loop;
end;
$$;

-- The set form of has_business_permission(), for the one caller that has a
-- FOLDER NAME rather than a business id. Storage compares text to text, and
-- casting an arbitrary object path to uuid inside a policy is an error waiting
-- for the first file that lands outside a business folder — Postgres does not
-- promise to evaluate a guard before the cast beside it.
create or replace function public.business_ids_with_permission(p_permission text)
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select business_id from public.business_users
  where user_id = auth.uid()
    and (role = 'owner' or p_permission = any(permissions));
$$;

revoke execute on function public.business_ids_with_permission(text) from public, anon;
grant execute on function public.business_ids_with_permission(text) to authenticated, service_role;

-- The logo, the hero and the gallery live in storage rather than in a table,
-- and they were member-writable for the same historical reason. Public READ
-- is untouched — those files are on the booking page.
drop policy if exists "business media owner insert" on storage.objects;
drop policy if exists "business media owner update" on storage.objects;
drop policy if exists "business media owner delete" on storage.objects;

create policy "business media settings insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'business-media'
    and (storage.foldername(name))[1] in (select public.business_ids_with_permission('settings')::text)
  );
create policy "business media settings update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'business-media'
    and (storage.foldername(name))[1] in (select public.business_ids_with_permission('settings')::text)
  );
create policy "business media settings delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'business-media'
    and (storage.foldername(name))[1] in (select public.business_ids_with_permission('settings')::text)
  );
