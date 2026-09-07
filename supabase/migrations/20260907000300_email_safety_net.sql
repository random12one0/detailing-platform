-- ROADMAP 8.6 — THE EMAIL SAFETY NET.
--
-- **R1, and it is his most specific new requirement:** *"a tracker inside my
-- dashboard that shows me how many emails get sent a day, and gives me
-- warnings when we're getting close to that hundred a day limit — and then
-- I'll update and say okay, upgrade it, and then don't give me this warning
-- again."*
--
-- **NOTHING COUNTS SENDS TODAY, AND THE CAP HAS ALREADY BITTEN ONCE.** Resend's
-- free plan is 100 emails A DAY ACROSS EVERY TENANT and the transactional set
-- spends about five a booking, so the platform's twenty-first booking of the
-- day is refused. Testing-loop F-025 is what that cost: the 429 was read as
-- "this address is wrong" and real customers were stamped `email_failed_at`
-- permanently, which `send-campaign` then enforces. **The failure arrives on
-- the busiest day and looks like a customer's fault.**
--
-- **A DAY IS ONE ROW, NOT ONE ROW PER EMAIL.** The question he asked is "how
-- many today", and a rollup answers it in a single read with no index, no
-- retention policy and nothing to prune. A per-send log would be the shape to
-- reach for if anybody ever needs "which tenant sent them", and nobody does:
-- the cap is platform-wide, so the breakdown answers a question the limit does
-- not care about.
--
-- **UTC, because that is the clock Resend's cap runs on.** Counting in the
-- owner's timezone would show a number that disagrees with the provider's at
-- the exact hours the warning matters.

create table public.platform_email_days (
  day    date primary key,
  sent   integer not null default 0,
  failed integer not null default 0
);

alter table public.platform_email_days enable row level security;
alter table public.platform_email_days force row level security;
-- NO POLICIES AT ALL, like `platform_settings` and `platform_admins`. Nothing
-- with a user's token has any business reading how much mail the platform
-- sends; the back office gets it from `platform-admin` under the service role.

comment on table public.platform_email_days is
  'One row a day: how many emails the platform sent and how many the provider refused. UTC, because that is the clock the provider''s daily cap runs on. Roadmap 8.6.';

-- ONE STATEMENT, SO TWO SENDS AT ONCE CANNOT LOSE A COUNT. An upsert with the
-- increment inside `do update` is atomic; a read-then-write from the edge
-- function would drop one of any two concurrent sends, and the whole point of
-- this number is to be trusted near a limit.
create or replace function public.note_email_send(p_ok boolean)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.platform_email_days (day, sent, failed)
  values (
    (now() at time zone 'utc')::date,
    case when p_ok then 1 else 0 end,
    case when p_ok then 0 else 1 end
  )
  on conflict (day) do update
    set sent   = platform_email_days.sent   + excluded.sent,
        failed = platform_email_days.failed + excluded.failed;
$$;

revoke all on function public.note_email_send(boolean) from public, anon, authenticated;
grant execute on function public.note_email_send(boolean) to service_role;

comment on function public.note_email_send(boolean) is
  'Adds one to today''s sent or failed count. One atomic statement so concurrent sends cannot lose a count. Server-side only. Roadmap 8.6.';

-- ── THE CAP, AND WHO HEARS ABOUT IT ───────────────────────────────────────
--
-- **THE WARNING GOES AWAY BY RAISING THE CAP, NOT BY DISMISSING IT — and that
-- is his own sentence read literally:** *"I'll update and say okay, upgrade
-- it, and then don't give me this warning again."* A dismiss flag would
-- silence a true statement and leave the platform one busy Saturday from
-- F-025 all over again; changing the number means the warning stops because
-- the FACT changed. It is the same reasoning as `platform_settings.prices`:
-- the row is the truth and the file is the fallback.
alter table public.platform_settings
  add column if not exists email_daily_cap integer not null default 100
    check (email_daily_cap > 0),
  -- **R2: *"I'll get an email if someone signs up and whatnot. I hope you set
  -- that all up."* NOTHING IN THIS PRODUCT EMAILS HIM ABOUT ANYTHING** — not a
  -- signup, not a first payment, not a churn. This is where those go.
  --
  -- It is NOT `platform_admins.email`: that is who may open the back office,
  -- and it is deliberately a throwaway sign-in address today. Alerts are a
  -- different question from access, and conflating them means adding a second
  -- admin silently starts mailing them.
  add column if not exists owner_email text;

update public.platform_settings
   set owner_email = 'andrew@detailingplatform.com'
 where owner_email is null;

comment on column public.platform_settings.email_daily_cap is
  'How many emails the provider allows in a day. 100 is Resend''s free plan. Raising it is how the near-the-limit warning is meant to be answered — never a dismiss flag. Roadmap 8.6.';
comment on column public.platform_settings.owner_email is
  'Where the platform''s own alerts go — a signup, a first payment. Not platform_admins.email, which is who may open the back office; access and alerts are different questions. Roadmap 8.6.';
