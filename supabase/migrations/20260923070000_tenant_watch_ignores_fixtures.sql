-- ROADMAP 6.3, SECOND PASS — A FIXTURE IS NOT A DETAILER, AND WATCHING
-- NOBODY IS NOT THE SAME AS EVERYTHING BEING FINE. 2026-09-23.
--
-- ---------------------------------------------------------------------------
-- CAUGHT BY RUNNING IT, NOT BY READING IT
-- ---------------------------------------------------------------------------
-- The first version of this sweep was correct about its one condition and
-- **would have been red from the hour it shipped.** Its very first run — the
-- one meant to establish a healthy baseline — reported
-- `roles-a (no open days)` and pinged `/fail`.
--
-- `roles-a` is a **test fixture** left behind by the roles suite: one booking,
-- one service, no open days. It satisfies every rule this sweep has, because
-- the rules were written about detailers and fixtures look exactly like
-- detailers in every column that matters.
--
-- **Andrew would have got one email about a business that does not exist, and
-- then the alarm would have sat red for ever.** That is the wolf this item was
-- written to avoid, arriving through the one door nobody checked.
--
-- **Measured, all 17 active businesses:** every one carries `is_demo = true`
-- except `counter-signup-test-detail`, which has never taken a booking. They
-- are fixtures, and Andrew has said as much — *"no live customers, no
-- anything… just fake accounts and whatnot."*
--
-- ---------------------------------------------------------------------------
-- SO: `is_demo` IS EXCLUDED, AND THE HONEST CONSEQUENCE IS STATED
-- ---------------------------------------------------------------------------
-- **This sweep watches ZERO detailers today.** Not because it is broken —
-- because there are none. It starts working, with no change of any kind, the
-- first time a real business takes a booking.
--
-- **AND WHEN IT IS WATCHING NOBODY IT PINGS `ok`, WITH `looked: 0` IN THE
-- BODY.** That is a deliberate choice between two bad options and it is worth
-- writing down:
--
--   * **Withholding the ping** (what the first version did) turns the check
--     red within its grace window and emails Andrew about a monitor that has
--     nothing to do. He will not act on it, and the next red — a real one —
--     lands in a mailbox that has learned to ignore this check.
--   * **Pinging `ok`** keeps it green and puts `looked: 0` in the check's own
--     event detail, so the state is printed rather than silent
--     (`docs/silences.md`'s standard), and it self-corrects the instant there
--     is somebody to watch.
--
-- Green-while-watching-nobody is a real silence and it is chosen with its eyes
-- open, because the alternative trains the person the alarm exists for to
-- ignore it. **If this product ever has detailers and this still says
-- `looked: 0`, that is a fault** — it means the qualifier stopped matching,
-- and the number is in the ping body precisely so somebody can see it.

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
  ping     text;
  sent     text := 'withheld';
  reason   text;
  fail_after constant int := 2;
begin
  for r in
    select b.id, b.slug,
           (select count(*) from public.services s
             where s.business_id = b.id and s.is_active) as n_services,
           (select count(*) from public.business_hours h
             where h.business_id = b.id and h.open_time is not null) as n_open_days,
           coalesce(tw.consecutive_bad, 0) as was_bad
      from public.businesses b
      left join public.tenant_watch tw on tw.business_id = b.id
      left join public.platform_subscriptions ps on ps.business_id = b.id
     where b.status = 'active'
       -- A FIXTURE IS NOT A DETAILER. See the header: this is the line that
       -- stops Andrew being emailed about `roles-a`.
       and coalesce(b.is_demo, false) = false
       and ps.suspended_at is null
       and (b.closed_until is null or b.closed_until::date <= current_date)
       and exists (select 1 from public.bookings bk where bk.business_id = b.id)
  loop
    looked := looked + 1;
    reason := null;
    if r.n_services = 0 then reason := 'no active services';
    elsif r.n_open_days = 0 then reason := 'no open days';
    end if;

    if reason is null then
      if r.was_bad >= fail_after then
        insert into public.site_probe_events (probe_key, state, detail)
        values ('tenant:' || r.slug, 'up', 'bookable again');
      end if;
      insert into public.tenant_watch (business_id, consecutive_bad, last_reason, last_ok_at)
      values (r.id, 0, null, now())
      on conflict (business_id) do update
        set consecutive_bad = 0, last_reason = null, last_ok_at = now();
    else
      if r.was_bad + 1 = fail_after then
        insert into public.site_probe_events (probe_key, state, detail)
        values ('tenant:' || r.slug, 'down',
                reason || ' — this detailer has taken bookings before');
      end if;
      insert into public.tenant_watch (business_id, consecutive_bad, last_reason, last_bad_at)
      values (r.id, r.was_bad + 1, reason, now())
      on conflict (business_id) do update
        set consecutive_bad = public.tenant_watch.consecutive_bad + 1,
            last_reason = excluded.last_reason, last_bad_at = now();
      if r.was_bad + 1 >= fail_after then
        bad := bad || (r.slug || ' (' || reason || ')');
      end if;
    end if;
  end loop;

  select tenant_watch_ping_url into ping from public.platform_settings limit 1;
  if ping is not null then
    if array_length(bad, 1) is null then
      -- `looked` RIDES ALONG EVEN WHEN IT IS ZERO. See the header for why a
      -- zero is a green here and what would make it a fault.
      perform net.http_post(url => ping,
                            body => jsonb_build_object('ok', true, 'looked', looked),
                            timeout_milliseconds => 5000);
      sent := case when looked = 0 then 'ok — watching nobody yet' else 'ok' end;
    else
      perform net.http_post(url => ping || '/fail',
                            body => jsonb_build_object('cannot_be_booked', bad, 'looked', looked),
                            timeout_milliseconds => 5000);
      sent := 'fail';
    end if;
  end if;

  return jsonb_build_object('looked', looked, 'cannot_be_booked', bad, 'ping', sent);
end;
$$;

revoke all on function public.watch_tenant_bookability() from public, anon, authenticated;
