-- ROADMAP 97.21 — UNSUBSCRIBING FROM MARKETING ALSO STOPPED APPOINTMENT REMINDERS (C-M1).
--
-- `20260913020000` taught both reminder functions the "three ways a customer is
-- unreachable", and one of the three was wrong: `customers.unsubscribed_at` is
-- the MARKETING opt-out. The page that sets it promises the opposite
-- (`supabase/functions/unsubscribe/index.ts`: *"A confirmation, reminder,
-- receipt or cancellation for a booking this customer made is exempt from
-- opt-out and must still reach them ... Only `send-campaign` reads this
-- flag."*). So a customer who pressed "unsubscribe" on a come-back email
-- silently stopped hearing about their own appointment, which is the no-show
-- the reminder exists to prevent.
--
-- THE FIX: both bodies restated exactly as `20260913020000` left them, minus
-- the one `c.unsubscribed_at is null` line in each. Everything else is
-- unchanged on purpose:
--   * `c.email_failed_at is null` STAYS. A bounced address is genuinely
--     unreachable, and that filter is what stops a typo costing forty-eight
--     sends of a hundred-a-day allowance (see `20260913020000`).
--   * No address and the business switch stay.
--   * The maintenance reminder (`_shared/maintenance.ts`) still reads the
--     opt-out. It is not in this migration and is not changed: the ruling is
--     that the maintenance-due gate stays exactly as it is.
--
-- Proved on a throwaway in-memory Postgres, never the live database:
-- `tests/reminder-ignores-unsubscribe-sql.test.mjs`.

create or replace function public.get_bookings_due_for_reminder(target text)
returns setof public.bookings
language sql
stable
security definer
set search_path = public
as $fn$
  select b.*
  from public.bookings b
  join public.businesses biz on biz.id = b.business_id
  join public.business_settings s on s.business_id = b.business_id
  -- LEFT, not inner: a booking taken without a customer row still has a
  -- `customer_email` on the booking itself and must still be reminded.
  left join public.customers c on c.id = b.customer_id
  where b.status not in ('cancelled', 'pending')
    and b.deleted_at is null
    and b.start_at > now()
    and case
      when target = 'owner' then b.owner_reminder_sent_at is null
      else b.customer_reminder_sent_at is null
        and b.customer_email is not null
        and s.email_customer_reminder
        -- A bounce, not an opt-out: `unsubscribed_at` is marketing only.
        and c.email_failed_at is null
    end
    and now() >= case
      when s.evening_before_enabled
           and (b.start_at at time zone biz.timezone)::time <= s.evening_before_latest_start
      then (((b.start_at at time zone biz.timezone)::date - 1) + s.evening_before_send_time) at time zone biz.timezone
      else b.start_at - make_interval(mins => s.customer_reminder_lead_minutes)
    end;
$fn$;

revoke all on function public.get_bookings_due_for_reminder(text)
  from public, anon, authenticated;
grant execute on function public.get_bookings_due_for_reminder(text)
  to service_role;

comment on function public.get_bookings_due_for_reminder(text) is
  'Bookings whose owner or customer reminder is due now. The CUSTOMER branch '
  'asks the business switch, that there is an address, and that it has not '
  'bounced. It does NOT ask the marketing opt-out: a reminder about a booking '
  'the customer made is transactional. 2026-09-13; opt-out removed 2026-10-17 '
  '(ROADMAP 97.21).';

create or replace function public.get_bookings_due_for_second_reminder()
returns setof public.bookings
language sql
stable
security definer
set search_path = public
as $fn$
  select b.*
  from public.bookings b
  join public.business_settings s on s.business_id = b.business_id
  left join public.customers c on c.id = b.customer_id
  where b.status <> 'cancelled'
    and b.status <> 'pending'
    and b.deleted_at is null
    and b.start_at > now()
    and b.customer_email is not null
    -- THE PARENT SWITCH FIRST. `email_customer_reminder` is "does this business
    -- remind its customers at all"; turning it off must silence both.
    and s.email_customer_reminder
    and s.customer_reminder_2_enabled
    -- A bounce, not an opt-out: `unsubscribed_at` is marketing only.
    and c.email_failed_at is null
    and b.customer_reminder_2_sent_at is null
    and b.customer_reminder_sent_at is not null
    and now() >= b.start_at - make_interval(mins => s.customer_reminder_2_lead_minutes);
$fn$;

revoke all on function public.get_bookings_due_for_second_reminder()
  from public, anon, authenticated;
grant execute on function public.get_bookings_due_for_second_reminder()
  to service_role;

comment on function public.get_bookings_due_for_second_reminder() is
  'The optional second customer reminder. Asks the PARENT switch as well as its '
  'own, an address, and that it has not bounced - never the marketing opt-out. '
  '2026-09-13; opt-out removed 2026-10-17 (ROADMAP 97.21).';
