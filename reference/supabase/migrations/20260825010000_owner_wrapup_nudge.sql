-- New reminder moment: a "job wrapping up" push as a booking approaches its
-- estimated end time, showing the price, so the owner can remind the
-- customer while they're still on-site — distinct from the existing
-- finalize-payment nudge, which only fires 2+ hours AFTER end time (too late
-- to catch the customer before they leave).
alter table public.bookings
  add column if not exists owner_wrapup_nudge_sent_at timestamptz;

-- Bookings whose end time is within the next 20 minutes (wide enough that the
-- 15-minute cron sweep can't skip past it), still not finalized, that haven't
-- had the wrap-up push yet.
create or replace function public.get_bookings_due_for_wrapup_nudge()
returns setof public.bookings
language sql
stable
as $$
  select b.*
  from public.bookings b
  where b.status <> 'cancelled'
    and b.finalized_at is null
    and b.owner_wrapup_nudge_sent_at is null
    and b.end_time is not null
    and ((b.booking_date::timestamp + b.end_time) at time zone 'America/Los_Angeles') <= now() + interval '20 minutes'
    and ((b.booking_date::timestamp + b.end_time) at time zone 'America/Los_Angeles') > now()
$$;
