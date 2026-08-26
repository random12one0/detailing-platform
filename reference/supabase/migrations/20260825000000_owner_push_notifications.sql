-- Owner web-push notifications (admin dashboard, PWA). Fully separate from the
-- FORGE app's push infra that lives in this same Supabase project (forge_*
-- tables, its own `send-push` function, its own vault secret) — this is a
-- distinct table + distinct secret names so nothing collides.

create table if not exists public.owner_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid not null references public.admin_users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now()
);

alter table public.owner_push_subscriptions enable row level security;

-- Admins manage only their own subscriptions (one browser/device = one row).
create policy "admins manage own push subscriptions"
  on public.owner_push_subscriptions
  for all
  using (admin_user_id = auth.uid())
  with check (admin_user_id = auth.uid());

-- Tracks the once-a-day "you have N bookings today" morning digest push, so
-- the 15-minute cron sweep sends it exactly once per Pacific calendar day.
create table if not exists public.owner_daily_digest_state (
  digest_date date primary key,
  sent_at timestamptz
);

alter table public.owner_daily_digest_state enable row level security;

-- New reminder "moments" beyond the existing single owner reminder:
-- a closer pre-appointment nudge, and a nudge to finalize payment on jobs
-- that finished without being finalized.
alter table public.bookings
  add column if not exists owner_nudge_sent_at timestamptz,
  add column if not exists owner_finalize_nudge_sent_at timestamptz;

-- Bookings starting within the next 30 minutes that haven't had the closer
-- "starting soon" push yet.
create or replace function public.get_bookings_due_for_nudge()
returns setof public.bookings
language sql
stable
as $$
  select b.*
  from public.bookings b
  where b.status <> 'cancelled'
    and b.owner_nudge_sent_at is null
    and ((b.booking_date::timestamp + b.start_time) at time zone 'America/Los_Angeles') <= now() + interval '30 minutes'
    and ((b.booking_date::timestamp + b.start_time) at time zone 'America/Los_Angeles') > now()
$$;

-- Bookings whose end time was 2+ hours ago, still not finalized, that
-- haven't had the "don't forget to finalize" push yet.
create or replace function public.get_bookings_due_for_finalize_nudge()
returns setof public.bookings
language sql
stable
as $$
  select b.*
  from public.bookings b
  where b.status <> 'cancelled'
    and b.finalized_at is null
    and b.owner_finalize_nudge_sent_at is null
    and b.end_time is not null
    and ((b.booking_date::timestamp + b.end_time) at time zone 'America/Los_Angeles') <= now() - interval '2 hours'
$$;
