-- ITEM H — a detailer who leaves can take their data.
--
-- The back office could suspend a business and nothing could export one, which
-- is two promises unkept at once: `/terms` says *"your customer list, your
-- bookings and your history belong to you, and you can have a copy of them at
-- any time by asking"*, and **this is also the answer to a customer-data
-- deletion request, which is the one legal ask that arrives without warning.**
--
-- ---------------------------------------------------------------------------
-- IT DISCOVERS THE TABLES RATHER THAN LISTING THEM, AND THAT IS THE WHOLE
-- POINT OF DOING IT IN SQL.
-- ---------------------------------------------------------------------------
-- A hand-written list of twenty-odd tables is a list that goes stale the first
-- time somebody adds one — and the failure is SILENT: the export succeeds, the
-- file looks complete, and the missing table is discovered by the person who
-- no longer has it. This asks `information_schema` for every table in `public`
-- with a `business_id` column, which is the same definition of "belongs to a
-- business" that every RLS policy in this product already uses.
--
-- **A TABLE ADDED TOMORROW IS EXPORTED TOMORROW**, with nobody remembering.
--
-- WHAT IS DELIBERATELY LEFT OUT, and each is a decision:
--   · `platform_admin_events` — it has a `business_id` and it is OURS: the
--     record of what the platform owner did to their account, including who
--     signed in as them. Handing a detailer their own audit trail is fine;
--     handing it to them as part of "your data" invites it to be edited and
--     re-uploaded. It is available on request as a separate thing.
--   · `businesses.admin_notes_platform` — the platform's private note about
--     the customer (*"call back after the 3rd"*). It is on a row the detailer
--     otherwise owns entirely, which is exactly how it would slip out.
--
-- WHAT IS DELIBERATELY IN: `platform_subscriptions` and `platform_invoices`.
-- What they paid us and when is their record as much as ours, and it is the
-- half an accountant asks for.
create or replace function public.export_business(p_business_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_out jsonb;
  v_tables jsonb := '{}'::jsonb;
  r record;
  v_rows jsonb;
begin
  select to_jsonb(b) - 'admin_notes_platform' into v_out
    from public.businesses b where b.id = p_business_id;
  if v_out is null then
    return null;
  end if;

  for r in
    select c.table_name
      from information_schema.columns c
      join information_schema.tables t
        on t.table_schema = c.table_schema and t.table_name = c.table_name
     where c.table_schema = 'public'
       and c.column_name = 'business_id'
       and t.table_type = 'BASE TABLE'
       and c.table_name <> 'platform_admin_events'
     order by c.table_name
  loop
    -- format() with %I, never string concatenation: the names come from the
    -- catalog rather than from a caller, and quoting them anyway is what makes
    -- that true of the next person's version too.
    execute format(
      'select coalesce(jsonb_agg(to_jsonb(x) order by x), ''[]''::jsonb) from public.%I x where x.business_id = $1',
      r.table_name
    ) into v_rows using p_business_id;
    v_tables := v_tables || jsonb_build_object(r.table_name, v_rows);
  end loop;

  return jsonb_build_object(
    'exported_at', now(),
    'business', v_out,
    'tables', v_tables
  );
end;
$$;

-- SERVICE ROLE ONLY. This returns every customer, every booking and every
-- price of one business in a single call — exactly the shape of thing roadmap
-- 4.4's whole security floor exists to keep out of a browser. The back office
-- reaches it under the service role after checking `platform_admins`, which is
-- the only path there is.
revoke all on function public.export_business(uuid) from public, anon, authenticated;
grant execute on function public.export_business(uuid) to service_role;

comment on function public.export_business(uuid) is
  'Everything one business owns, as one JSON document. Tables are DISCOVERED by having a business_id column, so a table added later is exported without anybody remembering. Excludes platform_admin_events and businesses.admin_notes_platform. Service role only.';
