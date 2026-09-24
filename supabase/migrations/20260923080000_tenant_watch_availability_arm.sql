-- ROADMAP 6.3, THIRD PASS — THE AVAILABILITY ARM. 2026-09-23.
--
-- The item names five conditions. Four were answered in the two passes above
-- and one was left **unbuilt rather than undistinguishable** — and those two
-- look identical in a roadmap and are not the same thing at all. This is the
-- fifth: *no future availability*.
--
-- ---------------------------------------------------------------------------
-- WHAT "NO FUTURE AVAILABILITY" ACTUALLY MEANS, AND WHY THE FIRST ARM IS NOT IT
-- ---------------------------------------------------------------------------
-- The first arm catches a detailer with **no open days at all** — a structural
-- fact, read straight off `business_hours`. That is not the condition the item
-- names. A detailer can have seven open days and still have **nothing anybody
-- can book**, because slots are computed rather than stored: from hours, buffer
-- and slot interval, advance windows, vehicle rules, blockouts and existing
-- bookings. Only asking produces the answer.
--
-- So this arm asks. **One call to `available-slots` per detailer per hour**,
-- across the next fortnight, and it alerts only when **no day in the whole
-- window has a single slot.**
--
-- **THE WINDOW IS THE GUARD.** Nothing on a Tuesday is a Tuesday. Nothing
-- across fourteen days is a fault.
--
-- ---------------------------------------------------------------------------
-- FOUR THINGS THAT WOULD MAKE THIS CRY WOLF, EACH SHUT OFF
-- ---------------------------------------------------------------------------
-- 1. **Mid-setup, suspended, deliberately closed, or never having worked.**
--    The same four front conditions the first arm carries, unchanged, and they
--    are the whole reason this does not fire at somebody who is still
--    building their page.
-- 2. **A detailer the FIRST arm already failed.** If they have no services or
--    no open days, arm one says so and this one does not ask — otherwise one
--    broken detailer produces two alarms saying different things about the
--    same fact.
-- 3. **FULLY BOOKED IS NOT BROKEN, IT IS SUCCESS.** A detailer booked solid
--    for a fortnight has no slots and nothing is wrong. So a tenant with **any
--    booking starting inside the window** is not alerted on. That single line
--    is the difference between "your page is broken" and "you are busy".
-- 4. **BLOCKED OUT IS DELIBERATE.** `blockout_dates` is a real feature — a
--    detailer marking time off. Any blockout overlapping the window silences
--    this arm for that tenant.
--
--    **THAT FOURTH ONE IS CONSERVATIVE AND THE COST IS NAMED:** a detailer
--    with one blocked afternoon somewhere in the fortnight AND a genuine
--    slot-generation fault will not be alerted on. `blockout_dates` carries a
--    `repeat` column, so working out whether blockouts cover *every* day of a
--    window is real arithmetic, and getting it subtly wrong points in the
--    direction of mailing Andrew about a detailer who is simply on leave.
--    **Under a silence-unless-real ruling the conservative error is the right
--    one**, and the first arm still covers this tenant for services and hours.
--
-- **AND THE SERVICE TYPE IS READ, NOT ASSUMED.** Asking a drop-off-only
-- detailer for mobile slots returns nothing, which would be a wolf invented by
-- the monitor itself. The probe asks for whatever that business actually
-- offers.
--
-- Two consecutive bad sweeps before anything is said, as everywhere else.

alter table public.platform_settings
  add column if not exists functions_base_url text;

alter table public.tenant_watch
  add column if not exists avail_request_id bigint,
  add column if not exists avail_bad int not null default 0;

create or replace function public.watch_tenant_bookability()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r        record;
  bad      text[] := '{}';
  looked   int := 0;
  asked    int := 0;
  ping     text;
  sent     text := 'withheld';
  reason   text;
  resp     record;
  slots_seen int;
  req      bigint;
  win_from date := (current_date + 1);
  win_to   date := (current_date + 14);
  fn_base  text;
  fail_after constant int := 2;
begin
  -- The functions base URL. Configuration, not a credential — it is the same
  -- public address the booking page in every visitor's browser already uses.
  select functions_base_url into fn_base from public.platform_settings limit 1;

  for r in
    select b.id, b.slug,
           (select count(*) from public.services s
             where s.business_id = b.id and s.is_active) as n_services,
           (select count(*) from public.business_hours h
             where h.business_id = b.id and h.open_time is not null) as n_open_days,
           coalesce(min(s2.duration_minutes), 60) as dur,
           coalesce(bs.mobile_enabled, false) as mobile_ok,
           coalesce(tw.consecutive_bad, 0) as was_bad,
           coalesce(tw.avail_bad, 0) as was_avail_bad,
           tw.avail_request_id,
           -- FULLY BOOKED IS SUCCESS, NOT AN OUTAGE.
           exists (select 1 from public.bookings fb
                    where fb.business_id = b.id and fb.deleted_at is null
                      and fb.status <> 'cancelled'
                      and fb.start_at::date between win_from and win_to) as busy_in_window,
           -- BLOCKED OUT IS DELIBERATE.
           exists (select 1 from public.blockout_dates bd
                    where bd.business_id = b.id
                      and bd.start_date <= win_to
                      and coalesce(bd.end_date, bd.start_date) >= win_from) as blocked_in_window
      from public.businesses b
      left join public.tenant_watch tw on tw.business_id = b.id
      left join public.platform_subscriptions ps on ps.business_id = b.id
      left join public.business_settings bs on bs.business_id = b.id
      left join public.services s2 on s2.business_id = b.id and s2.is_active
     where b.status = 'active'
       and coalesce(b.is_demo, false) = false
       and ps.suspended_at is null
       and (b.closed_until is null or b.closed_until::date <= current_date)
       and exists (select 1 from public.bookings bk where bk.business_id = b.id)
     group by b.id, b.slug, bs.mobile_enabled, tw.consecutive_bad, tw.avail_bad,
              tw.avail_request_id
  loop
    looked := looked + 1;
    reason := null;
    if r.n_services = 0 then reason := 'no active services';
    elsif r.n_open_days = 0 then reason := 'no open days';
    end if;

    -- ARM TWO — grade the PREVIOUS cycle's availability answer, but only for a
    -- detailer arm one is happy with.
    if reason is null and r.avail_request_id is not null then
      select status_code, content into resp
        from net._http_response where id = r.avail_request_id;
      if found and resp.status_code = 200 then
        select count(*) into slots_seen
          from jsonb_each(coalesce(resp.content::jsonb -> 'days', '{}'::jsonb)) d
         where jsonb_array_length(coalesce(d.value -> 'slots', '[]'::jsonb)) > 0;
        if slots_seen = 0 and not r.busy_in_window and not r.blocked_in_window then
          reason := format('nothing bookable in the next 14 days (%s to %s)', win_from, win_to);
        end if;
      end if;
      -- A missing or non-200 answer is INCONCLUSIVE, never a failure: this
      -- monitor's own plumbing must not become the wolf.
    end if;

    if reason is null then
      if r.was_bad >= fail_after or r.was_avail_bad >= fail_after then
        insert into public.site_probe_events (probe_key, state, detail)
        values ('tenant:' || r.slug, 'up', 'bookable again');
      end if;
      insert into public.tenant_watch (business_id, consecutive_bad, avail_bad, last_reason, last_ok_at)
      values (r.id, 0, 0, null, now())
      on conflict (business_id) do update
        set consecutive_bad = 0, avail_bad = 0, last_reason = null, last_ok_at = now();
    else
      if r.was_bad + r.was_avail_bad + 1 = fail_after then
        insert into public.site_probe_events (probe_key, state, detail)
        values ('tenant:' || r.slug, 'down',
                reason || ' — this detailer has taken bookings before');
      end if;
      insert into public.tenant_watch (business_id, consecutive_bad, last_reason, last_bad_at)
      values (r.id, 1, reason, now())
      on conflict (business_id) do update
        set consecutive_bad = case when reason like 'nothing bookable%'
                                   then public.tenant_watch.consecutive_bad
                                   else public.tenant_watch.consecutive_bad + 1 end,
            avail_bad = case when reason like 'nothing bookable%'
                             then public.tenant_watch.avail_bad + 1
                             else public.tenant_watch.avail_bad end,
            last_reason = excluded.last_reason, last_bad_at = now();
      if r.was_bad + r.was_avail_bad + 1 >= fail_after then
        bad := bad || (r.slug || ' (' || reason || ')');
      end if;
    end if;

    -- ARM TWO, PASS TWO — ask for the next cycle. Only for a detailer arm one
    -- is happy with, and only when the answer could mean anything.
    if r.n_services > 0 and r.n_open_days > 0 and fn_base is not null then
      -- **NO CREDENTIAL IS SENT, AND THAT IS MEASURED RATHER THAN HOPED FOR.**
      -- `available-slots` is a public function deployed without JWT
      -- verification: called with no `apikey` header at all it answers 200
      -- with real slots. So this probe carries nothing a session may not
      -- handle, and `tenant_watch` holds no key.
      req := net.http_post(
        url => fn_base || '/available-slots',
        headers => '{"Content-Type":"application/json"}'::jsonb,
        body => jsonb_build_object(
          'business_slug', r.slug,
          'start_date', win_from::text,
          'end_date', win_to::text,
          'service_type', case when r.mobile_ok then 'mobile' else 'dropoff' end,
          'duration_minutes', r.dur),
        timeout_milliseconds => 10000);
      update public.tenant_watch set avail_request_id = req where business_id = r.id;
      asked := asked + 1;
    else
      update public.tenant_watch set avail_request_id = null where business_id = r.id;
    end if;
  end loop;

  select tenant_watch_ping_url into ping from public.platform_settings limit 1;
  if ping is not null then
    if array_length(bad, 1) is null then
      perform net.http_post(url => ping,
                            body => jsonb_build_object('ok', true, 'looked', looked, 'asked', asked),
                            timeout_milliseconds => 5000);
      sent := case when looked = 0 then 'ok — watching nobody yet' else 'ok' end;
    else
      perform net.http_post(url => ping || '/fail',
                            body => jsonb_build_object('cannot_be_booked', bad, 'looked', looked),
                            timeout_milliseconds => 5000);
      sent := 'fail';
    end if;
  end if;

  return jsonb_build_object('looked', looked, 'asked', asked,
                            'cannot_be_booked', bad, 'ping', sent);
end;
$$;

revoke all on function public.watch_tenant_bookability() from public, anon, authenticated;
