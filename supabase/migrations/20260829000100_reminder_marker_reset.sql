-- Roadmap 0.3 — reminders must re-arm when a booking is edited.
--
-- Found while proving the sweep: the platform never got the rule the old
-- live site has. Each reminder is fired once and stamped with a sent-at
-- marker so it never repeats. But a rescheduled booking kept its old stamp,
-- so the customer was told about the ORIGINAL time and then never reminded
-- about the new one. Clearing the stamp when the booking materially changes
-- is what makes the reminder follow the booking.
--
-- A trigger, not a fix inside reschedule-booking, because update-booking and
-- any future edit path have the same bug; the table is where they all meet.
--
-- Deliberate difference from the old site's version: a plain status change
-- does NOT clear the stamps. There, pending -> confirmed would re-arm an
-- already-sent reminder and mail the customer twice. Cancellation needs no
-- special case — the due-ness functions already exclude cancelled bookings.

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
    new.owner_nudge_sent_at             := null;
    new.owner_wrapup_nudge_sent_at      := null;
    new.owner_finalize_nudge_sent_at    := null;
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

drop trigger if exists reset_reminder_markers_on_edit on public.bookings;
create trigger reset_reminder_markers_on_edit
before update on public.bookings
for each row execute function public.reset_reminder_markers_on_edit();
