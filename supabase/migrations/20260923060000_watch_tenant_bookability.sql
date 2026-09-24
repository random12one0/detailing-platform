-- ROADMAP 6.3 — ALERT WHEN AN ACTIVE DETAILER'S BOOKING PAGE CANNOT WORK.
-- 2026-09-23.
--
-- ---------------------------------------------------------------------------
-- THE WORK HERE IS NOT THE PLUMBING. IT IS TELLING BROKEN FROM MERELY EMPTY.
-- ---------------------------------------------------------------------------
-- 6.2's probes each had an unambiguous failure: a page that does not serve its
-- bundle is broken, full stop. **Every condition 6.3 names has a normal state
-- that looks identical to it.** A detailer with no services may be halfway
-- through setting up. One with no open days may be on holiday. A suspended
-- account may be suspended on purpose — by Andrew, this morning.
--
-- **Andrew will not act on failure mail.** So a condition that can fire on a
-- normal state must not fire at all, and the honest answer for most of what
-- the item lists is to leave it out and say so rather than ship a guess.
--
-- ---------------------------------------------------------------------------
-- WHAT IS ALERTED ON: EXACTLY ONE THING
-- ---------------------------------------------------------------------------
--   **A detailer who WAS working and has stopped being bookable.**
--
-- "Was working" is carried by one fact: **they have taken at least one booking.**
-- That single qualifier is what turns two undistinguishable conditions into
-- distinguishable ones — a business that has never had a booking and has no
-- services is setting up, and a business that took bookings last month and has
-- no services today has lost something.
--
-- "Not bookable" is the product's OWN definition, not a new one:
-- `app/src/lib/adminInsight.js`'s `bookability()` says a page cannot be booked
-- when it is suspended, has no active services, or has no open days. **The
-- suspended arm is dropped here** (see below), so what is left is the other
-- two, restated in SQL because `pg_cron` cannot call JavaScript.
--
-- **THAT RESTATEMENT IS A SECOND IMPLEMENTATION AND IT IS DECLARED RATHER THAN
-- HIDDEN**, because ROADMAP 9.1 — fixed tonight — is precisely what happens
-- when two sides of this product answer the same question from different
-- inputs. It is kept as narrow as possible: two counts, no interpretation. If
-- `bookability()` ever grows a third reason, this will not know, and that is a
-- real cost written down at the moment it is incurred.
--
-- ---------------------------------------------------------------------------
-- WHAT IS DELIBERATELY LEFT OUT, EACH WITH ITS REASON
-- ---------------------------------------------------------------------------
-- * **A suspended account.** Not an outage — the platform did it, on purpose,
--   for non-payment. Mailing Andrew about a thing Andrew did is the definition
--   of a wolf. Suspended tenants are excluded from the sweep entirely.
-- * **A detailer who is deliberately closed.** `businesses.closed_until` and
--   `blockout_dates` are a real feature that `available-slots` already reads.
--   A detailer on holiday has said so, and is excluded.
-- * **A detailer who has never taken a booking.** Indistinguishable from one
--   who is halfway through setting up, and the back office already lists
--   those under setup progress (9.1). Excluded.
-- * **"No coverage area."** The item names it. **Measured 2026-09-23: nothing
--   in the booking path reads `businesses.service_area` — it is carried
--   through `tenant.ts` and never consulted by `available-slots`,
--   `create-booking` or slot validation.** An empty coverage area cannot stop
--   a booking, so alerting on it would fire on a normal state. **Left out,
--   named, and this is the record of why.**
-- * **"A public error."** Nothing in this database records that a visitor saw
--   an error. There is nothing to read, so there is nothing to alert on.
--   Sentry is the instrument for that and it is not built (ROADMAP 7.2,
--   `docs/ops/monitoring.md` § 4). **Left out, named.**
--
-- ---------------------------------------------------------------------------
-- HOURLY, NOT EVERY FIVE MINUTES
-- ---------------------------------------------------------------------------
-- A detailer's catalogue does not change minute to minute, and this is a
-- "somebody should ring them" alert rather than a "the site is down" alert.
-- **It gets its own healthchecks.io check for the same reason** — one
-- detailer's page going quiet must not take down the check that says whether
-- the whole platform is up. Two different alarms; two different sentences.
--
-- Two consecutive bad sweeps before anything is said, the same rule 6.2 uses.

create table if not exists public.tenant_watch (
  business_id  uuid primary key references public.businesses(id) on delete cascade,
  consecutive_bad int not null default 0,
  last_reason  text,
  last_ok_at   timestamptz,
  last_bad_at  timestamptz
);
alter table public.tenant_watch enable row level security;
alter table public.tenant_watch force  row level security;
revoke all on public.tenant_watch from anon, authenticated;

alter table public.platform_settings
  add column if not exists tenant_watch_ping_url text;

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
       -- SUSPENDED IS DELIBERATE, NOT BROKEN.
       and ps.suspended_at is null
       -- DELIBERATELY CLOSED IS DELIBERATE, NOT BROKEN.
       and (b.closed_until is null or b.closed_until::date <= current_date)
       -- THEY MUST HAVE WORKED ONCE. This is the whole distinguisher.
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
    -- **NOTHING TO LOOK AT IS NOT THE SAME AS EVERYTHING BEING FINE.** If the
    -- sweep found no qualifying detailer at all, something is wrong with the
    -- sweep rather than right with the world, so the ping is withheld and the
    -- grace window turns that into one alert.
    if looked = 0 then
      sent := 'withheld — no qualifying detailer was looked at';
    elsif array_length(bad, 1) is null then
      perform net.http_post(url => ping,
                            body => jsonb_build_object('ok', true, 'looked', looked),
                            timeout_milliseconds => 5000);
      sent := 'ok';
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

do $$
begin
  if not exists (select 1 from cron.job where jobname = 'watch-tenant-bookability') then
    perform cron.schedule('watch-tenant-bookability', '17 * * * *',
                          'select public.watch_tenant_bookability();');
  end if;
end $$;
