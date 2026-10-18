-- ROADMAP 97.19 (S-M5, C-L6) — ONE TENANT'S CAMPAIGNS COULD SPEND EVERY OTHER
-- TENANT'S BOOKING EMAILS FOR THE DAY.
--
-- WHAT WAS THERE. `claim_email_send(p_platform)` kept ONE pool for all tenant
-- mail — `greatest(cap - reserve, 0)`, 80 of 100 on the defaults — and could
-- not tell a confirmation from a campaign or one business from another.
-- `send-campaign` capped each PRESS at 50, with no per-day or per-tenant limit
-- and nothing stopping the same press arriving twice. So two presses from one
-- detailer was 100 attempts against an 80-email pool, and every other
-- detailer's confirmations and reminders were refused for the rest of the UTC
-- day.
--
-- WHAT THIS DOES, THREE THINGS:
--
--   1. EACH BUSINESS GETS A DAILY CAMPAIGN SHARE. `email_campaign_share`
--      (default 20) campaign emails per business per UTC day, counted in
--      `email_campaign_days`. One business reaching its share refuses only its
--      own campaign mail.
--
--   2. BOOKING MAIL IS CLAIMED AHEAD OF CAMPAIGNS. All campaign mail together
--      stops while `email_booking_headroom` (default 40) of the tenant pool is
--      still unspent; confirmations, reminders and receipts may spend the whole
--      tenant pool. So the campaign budget is always the smaller of the two,
--      and a transactional send can only be refused once campaign mail has
--      already been refused too — never while campaigns still have allowance.
--
--   3. A PRESS SENDS ONCE. `campaign_presses` holds one row per (business,
--      press id). `send-campaign` inserts it before the first email; a second
--      arrival of the same press hits the primary key and sends nothing.
--
-- The platform's own reserve (`email_platform_reserve`, 2026-09-13) is
-- untouched: platform mail still reaches the full cap, tenant mail still stops
-- at cap minus reserve.
--
-- OLD CALLERS KEEP WORKING. The two new arguments default to "no business,
-- not a campaign", which is exactly the old behaviour, so a `send-email` still
-- running the pre-97.19 bundle calls `claim_email_send(p_platform)` and gets
-- the same answer as before. The one-argument version is DROPPED rather than
-- kept beside the new one, because two overloads where one has defaults makes
-- a one-argument call ambiguous and Postgres refuses it.

alter table public.platform_settings
  add column if not exists email_campaign_share integer not null default 20
    check (email_campaign_share >= 0),
  add column if not exists email_booking_headroom integer not null default 40
    check (email_booking_headroom >= 0);

comment on column public.platform_settings.email_campaign_share is
  'How many campaign emails ONE business may send in a UTC day. Booking mail '
  'does not count against it. ROADMAP 97.19, 2026-10-17.';
comment on column public.platform_settings.email_booking_headroom is
  'How much of the tenant pool (email_daily_cap minus email_platform_reserve) '
  'only booking mail may spend. Campaign mail from every business together '
  'stops this far short of the tenant pool. ROADMAP 97.19, 2026-10-17.';

-- ONE ROW PER BUSINESS PER DAY, and only for days the business sent a campaign.
create table if not exists public.email_campaign_days (
  business_id uuid not null references public.businesses(id) on delete cascade,
  day         date not null,
  claimed     integer not null default 0 check (claimed >= 0),
  primary key (business_id, day)
);
alter table public.email_campaign_days enable row level security;
alter table public.email_campaign_days force row level security;
revoke all on public.email_campaign_days from anon, authenticated;
-- ROADMAP 4.3c: every new RLS table refuses writes from a read-only support
-- session, as tests/support-sessions-sql.test.mjs requires of every later migration.
select public.refuse_support_writes('public.email_campaign_days');
comment on table public.email_campaign_days is
  'Campaign emails claimed per business per UTC day, against '
  'platform_settings.email_campaign_share. Written only by claim_email_send. '
  'ROADMAP 97.19.';

create table if not exists public.campaign_presses (
  business_id uuid not null references public.businesses(id) on delete cascade,
  press_id    uuid not null,
  pressed_at  timestamptz not null default now(),
  primary key (business_id, press_id)
);
alter table public.campaign_presses enable row level security;
alter table public.campaign_presses force row level security;
revoke all on public.campaign_presses from anon, authenticated;
select public.refuse_support_writes('public.campaign_presses');
comment on table public.campaign_presses is
  'One row per press of Send on a campaign. send-campaign inserts it before '
  'the first email, so the same press arriving twice sends once. ROADMAP 97.19.';

drop function if exists public.claim_email_send(boolean);

create or replace function public.claim_email_send(
  p_platform    boolean,
  p_business_id uuid    default null,
  p_campaign    boolean default false
)
returns boolean
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_cap      integer;
  v_reserve  integer;
  v_share    integer;
  v_headroom integer;
  v_budget   integer;
  v_claimed  integer;
  v_mine     integer;
  v_today    date := (now() at time zone 'utc')::date;
  v_campaign boolean := coalesce(p_campaign, false) and not coalesce(p_platform, false);
begin
  -- NO ROW MEANS NO LIMIT, as before: the provider's own 429 is the backstop.
  select email_daily_cap, email_platform_reserve, email_campaign_share, email_booking_headroom
    into v_cap, v_reserve, v_share, v_headroom
    from public.platform_settings
   limit 1;
  if v_cap is null then
    return true;
  end if;

  v_budget := case
    when p_platform then v_cap
    when v_campaign then greatest(v_cap - coalesce(v_reserve, 0) - coalesce(v_headroom, 0), 0)
    else greatest(v_cap - coalesce(v_reserve, 0), 0)
  end;

  -- THE BUSINESS'S OWN SHARE FIRST. A campaign with no business is refused:
  -- there is no share to charge it to. Lock order is always this row, then the
  -- day row below, so two concurrent claims cannot deadlock.
  if v_campaign then
    if p_business_id is null then
      v_mine := null;
    else
      insert into public.email_campaign_days (business_id, day, claimed)
      values (p_business_id, v_today, 1)
      on conflict (business_id, day) do update
        set claimed = email_campaign_days.claimed + 1
      returning claimed into v_mine;
    end if;
    if v_mine is null or v_mine > coalesce(v_share, 0) then
      if v_mine is not null then
        update public.email_campaign_days set claimed = greatest(claimed - 1, 0)
         where business_id = p_business_id and day = v_today;
      end if;
      insert into public.platform_email_days (day, refused) values (v_today, 1)
      on conflict (day) do update set refused = platform_email_days.refused + 1;
      return false;
    end if;
  end if;

  insert into public.platform_email_days (day, claimed)
  values (v_today, 1)
  on conflict (day) do update
    set claimed = platform_email_days.claimed + 1
  returning claimed into v_claimed;

  if v_claimed <= v_budget then
    return true;
  end if;

  -- Give both claims back (neither was spent) and record the refusal.
  update public.platform_email_days
     set claimed          = greatest(claimed - 1, 0),
         refused          = refused + 1,
         refused_platform = refused_platform + case when p_platform then 1 else 0 end
   where day = v_today;
  if v_campaign then
    update public.email_campaign_days set claimed = greatest(claimed - 1, 0)
     where business_id = p_business_id and day = v_today;
  end if;
  return false;
end;
$fn$;

revoke all on function public.claim_email_send(boolean, uuid, boolean) from public, anon, authenticated;
grant execute on function public.claim_email_send(boolean, uuid, boolean) to service_role;

comment on function public.claim_email_send(boolean, uuid, boolean) is
  'Claims one of today''s emails before the provider is called. Platform mail '
  'may reach email_daily_cap; booking mail stops at cap minus '
  'email_platform_reserve; campaign mail stops email_booking_headroom earlier '
  'still, and at email_campaign_share per business. Server-side only. '
  'ROADMAP 97.19, 2026-10-17.';
