-- ROADMAP 6.2 — OUTSIDE CHECKS ON THE LIVE SITE. 2026-09-23.
--
-- The item asked for outside checks on the homepage, booking start, booking
-- availability, sign-in and a safe database/function path, and it had carried
-- "BLOCKED BY THE DEPLOY FREEZE" since 2026-09-20. The freeze lifted on the
-- 21st, and an outside check needs no deploy in any case: `pg_cron` and
-- `pg_net` are already installed here and already run four jobs.
--
-- ---------------------------------------------------------------------------
-- ANDREW'S RULING GOVERNS THE SHAPE, AND IT IS NOT NEGOTIABLE.
-- ---------------------------------------------------------------------------
-- *"If he gets an email that something failed he is not going to do anything
-- about it."* So **a check that can cry wolf is worse than no check**, and
-- every decision below is made in that direction:
--
--   * A probe must fail `fail_after` times IN A ROW before anything is said.
--     One slow response, one cold start, one Netlify blip says nothing.
--   * A response that has not arrived yet is INCONCLUSIVE, never a failure.
--   * If NOTHING could be graded this cycle, the ping is withheld rather than
--     sent — silence is honest, and healthchecks.io's own grace window is what
--     turns sustained silence into an alert. A "success" ping we could not
--     justify would be the worst outcome available: a monitor reporting green
--     because it did not look.
--
-- ---------------------------------------------------------------------------
-- WHY CONTENT IS ASSERTED AND NOT JUST THE STATUS CODE
-- ---------------------------------------------------------------------------
-- `_redirects` sends every unmatched path on detailingplatform.com to
-- index.html, so **every URL on that domain returns 200, including ones that
-- do not exist** (CLAUDE.md § Publishing says exactly this). A status-only
-- check on the homepage is therefore a check that cannot fail. Each probe
-- carries `expect_contains`, and the homepage's is the built asset reference,
-- so "Netlify is serving a real build" is what is actually measured.
--
-- The same trap, measured rather than assumed, killed two candidate probes:
-- an anonymous read of `businesses` and of `services` both answer **200 with
-- `[]`** because RLS refuses them. Either would have been a green light
-- forever. They are not used.
--
-- ---------------------------------------------------------------------------
-- FOUR PATHS, NOT FIVE, AND THE FIFTH IS SAID RATHER THAN FAKED
-- ---------------------------------------------------------------------------
-- The item names five. Measured, the booking page's own URL is served by the
-- SAME index.html as the homepage — it is a single-page app — so a probe of
-- `/book/demo-detail` could not fail independently of the homepage probe. A
-- fifth check that cannot fail on its own is decoration. What the item calls
-- "a safe database or function path" is covered twice over and separately:
-- `booking_start` is the database path (a definer RPC through PostgREST) and
-- `booking_availability` is the function path (the edge runtime).
--
-- ---------------------------------------------------------------------------
-- THE TWO PLACEHOLDERS EXIST BECAUSE A STATIC FIXTURE GOES STALE AND LIES
-- ---------------------------------------------------------------------------
-- A hard-coded future date is in the past a few weeks later, and a hard-coded
-- `duration_minutes` breaks the day somebody reseeds the demo tenant. Both
-- would surface as a monitor that starts crying wolf about a product that is
-- fine — the precise failure this file exists to avoid. So the body is a
-- template and the two moving values are substituted each cycle from live
-- data.

-- ---------------------------------------------------------------------------
create table if not exists public.site_probes (
  key                  text primary key,
  label                text not null,
  url                  text not null,
  method               text not null default 'GET' check (method in ('GET','POST')),
  headers              jsonb,
  body                 jsonb,
  expect_status        int  not null default 200,
  -- NULL means "status only", which is only ever right for an endpoint that
  -- cannot answer 200 while broken. None of today's four qualify.
  expect_contains      text,
  fail_after           int  not null default 2 check (fail_after >= 1),
  enabled              boolean not null default true,
  last_request_id      bigint,
  consecutive_failures int  not null default 0,
  last_ok_at           timestamptz,
  last_fail_at         timestamptz
);

-- Incident history: 6.2 asks for incidents and recovery times, and this is
-- both — one row when a path goes down, one when it comes back, and the
-- difference between them is the recovery time.
create table if not exists public.site_probe_events (
  id         bigserial primary key,
  probe_key  text not null,
  state      text not null check (state in ('down','up')),
  detail     text,
  at         timestamptz not null default now()
);
create index if not exists site_probe_events_at on public.site_probe_events (at desc);

alter table public.site_probes       enable row level security;
alter table public.site_probes       force  row level security;
alter table public.site_probe_events enable row level security;
alter table public.site_probe_events force  row level security;
-- No policies, the same as `rate_hits`: only the scheduler touches these, and
-- `site_probes.headers` holds an API key.

alter table public.platform_settings
  add column if not exists site_probe_ping_url text;

-- ---------------------------------------------------------------------------
create or replace function public.probe_live_site()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r            record;
  resp         record;
  ok           boolean;
  failing      text[] := '{}';
  graded       int := 0;
  ping         text;
  sent         text := 'withheld';
  the_date     text := to_char((now() + interval '7 days')::date, 'YYYY-MM-DD');
  the_duration text;
  req          bigint;
  payload      jsonb;
begin
  select coalesce(min(s.duration_minutes), 60)::text into the_duration
    from public.services s
    join public.businesses b on b.id = s.business_id
   where b.slug = 'demo-detail';

  -- PASS 1 — grade the PREVIOUS cycle. pg_net is asynchronous: firing and
  -- reading in one statement is not possible, so each run reads what the last
  -- run asked for. That is also why one cycle of lag is by design.
  for r in select * from public.site_probes where enabled order by key loop
    if r.last_request_id is null then continue; end if;

    select status_code, content into resp
      from net._http_response where id = r.last_request_id;

    -- NOT FOUND IS NOT A FAILURE. The request may still be in flight, or
    -- pg_net may have expired the row. Counting that as an outage would make
    -- this monitor's own plumbing into a wolf.
    if not found then continue; end if;

    graded := graded + 1;
    ok := resp.status_code = r.expect_status
          and (r.expect_contains is null
               or position(r.expect_contains in coalesce(resp.content, '')) > 0);

    if ok then
      if r.consecutive_failures >= r.fail_after then
        insert into public.site_probe_events (probe_key, state, detail)
        values (r.key, 'up', format('recovered after %s consecutive failures', r.consecutive_failures));
      end if;
      update public.site_probes
         set consecutive_failures = 0, last_ok_at = now()
       where key = r.key;
    else
      if r.consecutive_failures + 1 = r.fail_after then
        insert into public.site_probe_events (probe_key, state, detail)
        values (r.key, 'down',
                format('status %s, expected %s%s',
                       coalesce(resp.status_code::text, 'none'), r.expect_status,
                       case when r.expect_contains is null then ''
                            else format(', body did not contain %L', r.expect_contains) end));
      end if;
      update public.site_probes
         set consecutive_failures = r.consecutive_failures + 1, last_fail_at = now()
       where key = r.key;
      if r.consecutive_failures + 1 >= r.fail_after then
        failing := failing || r.key;
      end if;
    end if;
  end loop;

  -- THE PING. `/fail` carries the failing paths in its body, which is what
  -- puts the AFFECTED PATH in the email rather than a bare "something is
  -- down" — 6.2's done-when asks for exactly that.
  select site_probe_ping_url into ping from public.platform_settings limit 1;
  if ping is not null then
    if graded = 0 then
      sent := 'withheld — nothing could be graded this cycle';
    elsif array_length(failing, 1) is null then
      perform net.http_post(url => ping,
                            body => jsonb_build_object('ok', true, 'graded', graded),
                            timeout_milliseconds => 5000);
      sent := 'ok';
    else
      perform net.http_post(url => ping || '/fail',
                            body => jsonb_build_object('failing', failing, 'graded', graded),
                            timeout_milliseconds => 5000);
      sent := 'fail';
    end if;
  end if;

  -- PASS 2 — fire this cycle's probes for the next run to grade.
  for r in select * from public.site_probes where enabled order by key loop
    payload := case when r.body is null then null else
      replace(replace(r.body::text, '{{DATE_PLUS_7}}', the_date),
              '{{DURATION}}', the_duration)::jsonb end;
    if r.method = 'GET' then
      req := net.http_get(url => r.url, headers => coalesce(r.headers, '{}'::jsonb),
                          timeout_milliseconds => 8000);
    else
      req := net.http_post(url => r.url, headers => coalesce(r.headers, '{}'::jsonb),
                           body => payload, timeout_milliseconds => 8000);
    end if;
    update public.site_probes set last_request_id = req where key = r.key;
  end loop;

  delete from public.site_probe_events where at < now() - interval '90 days';

  return jsonb_build_object('graded', graded, 'failing', failing, 'ping', sent);
end;
$$;

revoke all on function public.probe_live_site() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- THE SCHEDULE. Five minutes, matching the healthchecks.io check's period.
-- Guarded, because `cron.schedule` on a name that already exists is an error
-- and this file must be safe to replay — there is no applied-migrations
-- ledger in this project (CLAUDE.md), so replay is how anybody finds out what
-- ran.
do $$
begin
  if not exists (select 1 from cron.job where jobname = 'probe-live-site') then
    perform cron.schedule('probe-live-site', '*/5 * * * *', 'select public.probe_live_site();');
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- WHAT IS NOT IN THIS FILE, DELIBERATELY: the four probe rows and the
-- healthchecks.io ping URL. The rows name a tenant slug and carry an API key,
-- and the ping URL is a credential — anybody holding it can keep this
-- monitoring green from the outside, which is the same warning
-- `docs/ops/monitoring.md` already gives for `healthcheck_url`. They are
-- inserted as configuration, not as schema. `docs/ops/monitoring.md` says how
-- to put them back.

-- ---------------------------------------------------------------------------
-- AND THE GRANTS ARE REVOKED, NOT JUST RLS ENABLED — added the same night,
-- because `scripts/db-audit.mjs` caught this file with them still open.
-- ---------------------------------------------------------------------------
-- RLS with no policy already refuses a browser. The audit's point is that it
-- is **one permissive policy away** from not refusing one, and these two
-- tables are the wrong place to leave that margin: `site_probes.headers`
-- holds an API key and `site_probes.url` names internal endpoints. Every
-- other shut table in this project — `rate_hits`, `stripe_events`,
-- `weather_grids`, `translation_usage` — revokes as well as enables, and the
-- audit's whole finding is tables that do one and not the other.
revoke all on public.site_probes       from anon, authenticated;
revoke all on public.site_probe_events from anon, authenticated;
