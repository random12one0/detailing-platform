-- Closes #60. Six tables enabled RLS after the earlier catalog sweeps without
-- the refuse_support_writes guard. The guard is a restrictive policy for the
-- `authenticated` role only; the service role bypasses RLS, so the Studio's
-- publish path (service-role writes to sites/revisions/releases) is untouched.
-- Idempotent: refuse_support_writes drops and recreates its own policies.
do $$
declare t regclass;
begin
  foreach t in array array[
    'public.preview_links', 'public.preview_events', 'public.sites',
    'public.revisions', 'public.releases', 'public.customer_import_locks'
  ]::regclass[]
  loop
    perform public.refuse_support_writes(t);
  end loop;
end;
$$;
