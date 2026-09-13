-- THE CUSTOMER APPOINTMENT REMINDER HAS NEVER SENT ONCE — 2026-09-13, lane C.
--
-- **Andrew, reading three days of real delivered mail: across 125 messages
-- there is no message reminding a CUSTOMER of their appointment at all.**
-- Measured in the database the same morning and it is worse than a gap in a
-- sample: `customer_reminder_sent_at` is **non-null on 0 of 56 bookings the
-- product has ever had**, and `customer_reminder_2_sent_at` on 0 as well. The
-- feature is fully built — the template, both languages, the per-detailer
-- brand, two reminders, four settings, a marker each — and it has never
-- produced an email.
--
-- **A no-show costs the detailer a whole slot, so this is money.**
--
-- ===========================================================================
-- WHY IT NEVER FIRED, AND IT IS THREE FAULTS ON ONE LINE OF THE SWEEP
-- ===========================================================================
--
-- `send-owner-reminders` does this, once per due booking:
--
--     await sendCustomerReminder(b);
--     await mark(b.id, "customer_reminder_sent_at");
--
-- **(1) `sendTenantEmail` DOES NOT THROW. IT RETURNS `false` AND EVERY CALLER
-- IGNORES IT.** Its own header says *"best-effort by design: an email failure
-- must never fail a booking"*, which is right for the booking path and is the
-- opposite of what a reminder sweep needs. So a refused send, a 429 from the
-- daily cap, a relay 500 — all of them reach `mark()`, the booking is stamped
-- *reminded*, and **the customer is never reminded and never will be**,
-- because the RPC below only returns rows whose marker is null.
--
-- **A FAILED SEND WAS INDISTINGUISHABLE FROM A DELIVERED ONE IN EVERY
-- INSTRUMENT WE HAVE**: `results` recorded `sent: true`, the heartbeat summary
-- counted it as sent, and the Plumbing tab drew it as sent. This is the repo's
-- oldest failure again — a skipped check reads exactly like a passing one.
--
-- **AND THE SAME COMMENT IS WRITTEN, FALSELY, IN THE MAINTENANCE BLOCK OF THE
-- SAME FILE**: *"STAMPED AFTER THE SEND AND ONLY ON SUCCESS — sendTenantEmail
-- throws on a hard failure."* It has never thrown. A ceramic-coating warranty
-- deadline is stamped `reminded` on a send that failed, for the same reason.
--
-- **(2) A BUSINESS WITH REMINDERS SWITCHED OFF WAS STAMPED TOO.** This function
-- never asked `email_customer_reminder`; the edge function asked it, returned
-- early, and the marker went on anyway. So every booking of every business with
-- the switch off is permanently marked *reminded*, and **the day that detailer
-- switches reminders on, none of their existing bookings can ever produce
-- one.** Nothing anywhere would have reported it.
--
-- **(3) AN UNREACHABLE CUSTOMER WAS ASKED ABOUT FOREVER.** The three ways to be
-- unreachable — no address, opted out, already bounced — are asked by the
-- Clients count, by `send-campaign` and by the maintenance reminder in this
-- same sweep, and were not asked here. Without them, a bad address is retried
-- every fifteen minutes until the appointment: about **forty-eight sends of a
-- hundred-a-day allowance for one broken booking.**
--
-- ===========================================================================
-- THE FIX IS IN THE DUE-NESS QUERY, NOT IN THE CALLER
-- ===========================================================================
--
-- **Due-ness is this function's job and three of its conditions were living in
-- the edge function instead.** A condition the caller checks after the answer
-- comes back is a condition that cannot stop the marker from being written; a
-- condition in the `where` clause is one the caller cannot forget. The edge
-- function keeps its own guard — belt and braces on a money path — but it is no
-- longer the only thing standing between a switched-off business and a stamped
-- booking.
--
-- **THE MARKER HALF OF THE FIX IS IN THE EDGE FUNCTION** and cannot be here:
-- `sendCustomerReminder` now reports a refused send and the existing `catch`
-- records `sent: false`, leaves the marker alone, and puts
-- `customer_reminder_failed` in the heartbeat summary the Plumbing tab draws.
--
-- **WHY FILTERING ON A BOUNCE DOES NOT SILENTLY LOSE A REMINDER:** a 4xx from
-- the relay is the only thing that ever sets `email_failed_at`, it is set on
-- the CUSTOMER row beside the address where the detailer meets it, and it
-- clears itself the moment a send to that address succeeds. So a typo costs one
-- attempt, not forty-eight, and correcting the typo puts the customer back in
-- this result set.
--
-- ===========================================================================
-- WHAT IS DELIBERATELY UNCHANGED
-- ===========================================================================
--
-- **THE TIMING.** The evening-before rule and the lead offset are untouched.
-- `docs/customer-reminder.md` records what the timing is and why it is right,
-- rather than re-deciding it here.
--
-- **THE OWNER BRANCH KEEPS NO SWITCH TEST.** `email_owner_reminder` off does not
-- mean the owner wants nothing: that path also sends a push, which has a switch
-- of its own. Filtering here would silence the push as well. Its marker is
-- stamped on a failed send by the same fault as (1), and that half IS fixed in
-- the edge function.

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
  -- `customer_email` on the booking itself and must still be reminded. Only a
  -- customer row that EXISTS and says "do not write to me" excludes it.
  left join public.customers c on c.id = b.customer_id
  where b.status not in ('cancelled', 'pending')
    and b.deleted_at is null
    and b.start_at > now()
    and case
      when target = 'owner' then b.owner_reminder_sent_at is null
      else b.customer_reminder_sent_at is null
        and b.customer_email is not null
        and s.email_customer_reminder
        and c.unsubscribed_at is null
        and c.email_failed_at is null
    end
    and now() >= case
      when s.evening_before_enabled
           and (b.start_at at time zone biz.timezone)::time <= s.evening_before_latest_start
      then (((b.start_at at time zone biz.timezone)::date - 1) + s.evening_before_send_time) at time zone biz.timezone
      else b.start_at - make_interval(mins => s.customer_reminder_lead_minutes)
    end;
$fn$;

-- `create or replace` preserves the existing ACL, and this function already
-- carried the right one. Restated anyway: the definer sweep of 2026-09-13 found
-- that a body copied without its grants is how the SECOND reminder's RPC ended
-- up readable by the anon key.
revoke all on function public.get_bookings_due_for_reminder(text)
  from public, anon, authenticated;
grant execute on function public.get_bookings_due_for_reminder(text)
  to service_role;

comment on function public.get_bookings_due_for_reminder(text) is
  'Bookings whose owner or customer reminder is due now. The CUSTOMER branch '
  'asks every question that decides whether a reminder can be sent at all - '
  'the business switch and the three ways a customer is unreachable - because '
  'a condition the caller checks after the fact cannot stop the caller from '
  'stamping the marker. That is exactly how this reminder sent zero emails '
  'across 56 bookings. 2026-09-13.';

-- THE SECOND REMINDER INHERITS ALL THREE FAULTS, because its body was copied
-- from the first one. It already asks `customer_reminder_2_enabled`, which is
-- the switch for the SECOND reminder only; it never asked the parent switch, so
-- a business that turned customer reminders OFF while the second one was on
-- would still be selected.
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
    and c.unsubscribed_at is null
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
  'own, and the three ways a customer is unreachable. 2026-09-13.';
