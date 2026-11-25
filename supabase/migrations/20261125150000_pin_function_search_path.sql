-- Refs #18. Supabase's security advisor (function_search_path_mutable) lists 14 public
-- functions with no pinned search_path. None is security definer, so this is hardening,
-- not a live hole: a function that resolves names through the caller's search_path can be
-- steered by a caller who can create objects in an earlier schema. Pin them the same way
-- the definer functions already are. `public, pg_temp` keeps every unqualified table the
-- trigger functions touch resolving exactly as before.
--
-- By name, in a loop, so it works on a fresh database where some do not exist and covers
-- overloads. Names only: functions owned by extensions (btree_gist, pg_net) are not here.

do $$
declare r record;
begin
  for r in
    select p.oid::regprocedure as sig
      from pg_proc p
     where p.pronamespace = 'public'::regnamespace
       and p.proname = any (array[
         'business_local_to_utc', 'validate_timezone', 'rls_auto_enable', 'set_updated_at',
         'site_rows_number', 'utc_to_business_local', 'revisions_own_slug', 'revisions_no_delete',
         'releases_guard', 'sites_live_release_ok', 'protect_last_owner', 'photo_tenant_share',
         'business_is_closed', 'action_log_is_append_only'])
       and not exists (select 1 from unnest(coalesce(p.proconfig, '{}')) c where c like 'search_path=%')
  loop
    execute format('alter function %s set search_path = public, pg_temp', r.sig);
  end loop;
end $$;
