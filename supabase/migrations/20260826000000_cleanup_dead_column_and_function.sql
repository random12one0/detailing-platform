-- Audit cleanup (detailing app only — nothing here touches forge_* objects).

-- 1. bookings.ics_file_sent: declared in the baseline schema, never read or
--    written by any code path. Dead weight on every row.
alter table public.bookings drop column if exists ics_file_sent;

-- 2. check_booking_conflict(): superseded by the in-function conflict checks in
--    available-slots / create-booking, which also apply the travel-time buffer
--    this function ignores. Nothing called it, but it was SECURITY DEFINER and
--    executable by `anon`, letting an anonymous caller probe the calendar for
--    busy times. Removing it closes that.
drop function if exists public.check_booking_conflict(date, time without time zone, time without time zone, uuid);
