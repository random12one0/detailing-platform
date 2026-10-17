-- ROADMAP 97.22 — AFTER A BOOKING MOVED, THE SECOND CUSTOMER REMINDER NEVER WENT OUT AGAIN (C-M2).
--
-- `20260829000100` made every reminder re-arm when a booking moves, by clearing
-- each sent-at marker in a BEFORE UPDATE trigger. It listed the five markers
-- that existed that day. Two more arrived five days later and the trigger was
-- never told about either:
--   * `customer_reminder_2_sent_at` (`20260903001000`) — so a booking moved
--     after its second reminder kept the stamp, and the customer was never
--     reminded about the NEW time.
--   * `owner_request_nudge_sent_at` (`20260903000000`) — whose own header says
--     "the reset-on-reschedule trigger ... work[s] on it unchanged". It did
--     not: the trigger names its columns, so a new column is never cleared.
--
-- THE FIX: the function body restated exactly as `20260829000100` left it,
-- plus two lines in the time-moved branch, so all SEVEN markers clear (the
-- five, the second reminder, the request nudge).
-- Unchanged on purpose:
--   * the same-time detail-change branch still clears only the first customer
--     reminder and the owner reminder. The second customer reminder is NOT
--     added there: its marker is only ever stamped once the booking is inside
--     its window (`now() >= start_at - customer_reminder_2_lead_minutes`), so
--     clearing it on a rename makes it due again at once and the customer gets
--     the same reminder twice. That would be a new rule, not this fix
--     (review of 97.22, 2026-10-17).
--   * a plain status change still clears nothing (pending -> confirmed must
--     not mail a customer twice), and the trigger itself is not recreated —
--     `create or replace function` keeps it bound to this body.
--
-- Proved on a throwaway in-memory Postgres, never the live database:
-- `tests/reminder-reset-markers-sql.test.mjs`.

create or replace function public.reset_reminder_markers_on_edit()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  -- Time moved: every reminder and push is anchored to start/end, so all of
  -- them re-arm.
  if new.start_at is distinct from old.start_at
     or new.end_at is distinct from old.end_at then
    new.owner_reminder_sent_at          := null;
    new.customer_reminder_sent_at       := null;
    new.customer_reminder_2_sent_at     := null;
    new.owner_nudge_sent_at             := null;
    new.owner_wrapup_nudge_sent_at      := null;
    new.owner_finalize_nudge_sent_at    := null;
    new.owner_request_nudge_sent_at     := null;
  -- Same time, but something the reminder email actually states has changed.
  elsif new.customer_name    is distinct from old.customer_name
     or new.customer_phone   is distinct from old.customer_phone
     or new.customer_email   is distinct from old.customer_email
     or new.customer_address is distinct from old.customer_address
     or new.service_type     is distinct from old.service_type
     or new.vehicle_size     is distinct from old.vehicle_size
     or new.vehicle_model    is distinct from old.vehicle_model
     or new.total_price      is distinct from old.total_price
     or new.final_amount     is distinct from old.final_amount then
    new.owner_reminder_sent_at    := null;
    new.customer_reminder_sent_at := null;
  end if;
  return new;
end;
$$;
