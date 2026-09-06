-- ROADMAP 2.21 — the counting half of the spam filter.
--
-- **SINCE ROADMAP 2.12 A REQUEST HOLDS THE SLOT**, and `create-booking` is
-- public by design with no rate limit, no captcha and no honeypot — grepped
-- rather than assumed. So filling a detailer's entire week costs a script
-- nothing, and every held slot is a real customer turned away. That is the
-- reason this is not a nice-to-have.
--
-- ---------------------------------------------------------------------------
-- A COUNTER PER WINDOW, NOT A LOG OF CALLS.
-- ---------------------------------------------------------------------------
-- The obvious build is a row per request and a `count(*)` over the last hour.
-- It is also a table that grows for ever on the one endpoint an attacker is
-- hammering — **the busier the abuse, the more expensive the defence** — and
-- it needs a sweeper nobody remembers to write. One row per (bucket, key,
-- window) counts to the limit and stops mattering when the window rolls.
--
-- THE WINDOW IS FIXED RATHER THAN SLIDING, and that is a deliberate trade: a
-- fixed window lets somebody burst across a boundary and get up to twice the
-- limit in a moment. A sliding window costs a second row and an arithmetic
-- that is wrong in a different way at every scale. **At this size the honest
-- answer is the simpler one**, and the limits below are set with the doubling
-- already assumed.
--
-- IT IS NOT A SECURITY BOUNDARY AND MUST NOT BE MISTAKEN FOR ONE. An address
-- can be changed and a phone number can be bought; this raises the cost of
-- filling a calendar from nothing to something, which is the whole ask. The
-- things that genuinely cannot be bypassed — the exclusion constraint, RLS,
-- the Stripe signature, server-side pricing — are unaffected and stay where
-- they are.
create table if not exists public.rate_hits (
  bucket       text not null,
  key          text not null,
  window_start timestamptz not null,
  hits         integer not null default 0,
  primary key (bucket, key, window_start)
);

alter table public.rate_hits enable row level security;
alter table public.rate_hits force  row level security;
-- No policies: only the edge functions touch it, under the service role. A
-- browser that could read this could see which phone numbers have been booking.

-- ---------------------------------------------------------------------------
-- `rate_take` — ask for permission and consume one, in one statement.
-- ---------------------------------------------------------------------------
-- CHECK-THEN-INCREMENT IS A RACE, and on the one endpoint somebody is
-- deliberately hammering it is a race that will be lost: two requests read
-- four, both write five, and the limit of five let six through. The insert
-- returns the new count, so the decision is made by the write itself.
--
-- IT COUNTS THE REFUSED ATTEMPT TOO. A caller who is over the limit and keeps
-- trying stays over it, which is the behaviour that makes a loop pointless
-- rather than merely slow.
create or replace function public.rate_take(
  p_bucket text,
  p_key text,
  p_window_seconds integer,
  p_limit integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_start timestamptz;
  v_hits integer;
begin
  if p_key is null or btrim(p_key) = '' then
    -- NOTHING TO COUNT AGAINST IS NOT THE SAME AS BEING OVER THE LIMIT. A
    -- missing forwarded-for header must not lock out a real customer; the
    -- other keys on the same call still apply.
    return true;
  end if;

  v_start := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);

  insert into public.rate_hits (bucket, key, window_start, hits)
  values (p_bucket, btrim(p_key), v_start, 1)
  on conflict (bucket, key, window_start)
    do update set hits = public.rate_hits.hits + 1
  returning hits into v_hits;

  -- HOUSEKEEPING ON THE WAY PAST, so there is no sweeper to forget. It only
  -- ever deletes rows for THIS key, so the cost is bounded by one caller's own
  -- history rather than by the size of the table.
  delete from public.rate_hits
   where bucket = p_bucket and key = btrim(p_key) and window_start < v_start - interval '1 day';

  return v_hits <= p_limit;
end;
$$;

revoke all on function public.rate_take(text, text, integer, integer) from public, anon, authenticated;
grant execute on function public.rate_take(text, text, integer, integer) to service_role;

comment on table public.rate_hits is
  'One counter per (bucket, key, fixed window). Roadmap 2.21. Not a security boundary — it raises the cost of filling a calendar, and nothing else depends on it.';
