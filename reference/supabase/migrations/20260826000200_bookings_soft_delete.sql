-- Soft delete for bookings. Previously "Delete booking permanently" issued a
-- hard DELETE behind a single confirm dialog, cascading to booking_add_ons and
-- booking_line_items — no undo, and it silently removed the row from revenue
-- history. deleted_at hides the row everywhere instead, and it stays
-- recoverable with a single UPDATE.
alter table public.bookings
  add column if not exists deleted_at timestamptz;

-- Partial index: every admin list filters `deleted_at is null`, and this keeps
-- that filter cheap without indexing the (rare) deleted rows.
create index if not exists idx_bookings_not_deleted
  on public.bookings (booking_date)
  where deleted_at is null;

-- The reminder / nudge sweeps must never email or push about a deleted
-- booking. Re-create each RPC with the deleted_at guard added; everything else
-- about them is unchanged.
create or replace function public.get_bookings_due_for_reminder(target text)
returns setof public.bookings
language sql
stable
as $$
  select b.*
  from public.bookings b
  where b.status <> 'cancelled'
    and b.deleted_at is null
    and (
      (target = 'owner' and b.owner_reminder_sent_at is null)
      or (target = 'customer' and b.customer_reminder_sent_at is null and b.customer_email is not null)
    )
    and (
      case
        when b.start_time >= time '09:00' and b.start_time <= time '10:00'
          then ((b.booking_date - 1)::timestamp + time '19:00') at time zone 'America/Los_Angeles'
        else
          (((b.booking_date::timestamp + b.start_time) at time zone 'America/Los_Angeles') - interval '2 hours')
      end
    ) <= now()
    and ((b.booking_date::timestamp + b.start_time) at time zone 'America/Los_Angeles') > now()
$$;

create or replace function public.get_bookings_due_for_nudge()
returns setof public.bookings
language sql
stable
as $$
  select b.*
  from public.bookings b
  where b.status <> 'cancelled'
    and b.deleted_at is null
    and b.owner_nudge_sent_at is null
    and ((b.booking_date::timestamp + b.start_time) at time zone 'America/Los_Angeles') <= now() + interval '30 minutes'
    and ((b.booking_date::timestamp + b.start_time) at time zone 'America/Los_Angeles') > now()
$$;

create or replace function public.get_bookings_due_for_wrapup_nudge()
returns setof public.bookings
language sql
stable
as $$
  select b.*
  from public.bookings b
  where b.status <> 'cancelled'
    and b.deleted_at is null
    and b.finalized_at is null
    and b.owner_wrapup_nudge_sent_at is null
    and b.end_time is not null
    and ((b.booking_date::timestamp + b.end_time) at time zone 'America/Los_Angeles') <= now() + interval '20 minutes'
    and ((b.booking_date::timestamp + b.end_time) at time zone 'America/Los_Angeles') > now()
$$;

create or replace function public.get_bookings_due_for_finalize_nudge()
returns setof public.bookings
language sql
stable
as $$
  select b.*
  from public.bookings b
  where b.status <> 'cancelled'
    and b.deleted_at is null
    and b.finalized_at is null
    and b.owner_finalize_nudge_sent_at is null
    and b.end_time is not null
    and ((b.booking_date::timestamp + b.end_time) at time zone 'America/Los_Angeles') <= now() - interval '2 hours'
$$;
