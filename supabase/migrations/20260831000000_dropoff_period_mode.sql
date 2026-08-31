-- Roadmap 2.7, W4. The owner, walking the calendar:
--
--   "that button should depend on what customers choose… and that button just
--    adapts to what you choose in the setting too."
--
-- `dropoff_only_periods` could say ONE thing about a day: no mobile jobs, come
-- to us. A detailer whose van is in the shop needs that; a detailer whose UNIT
-- is unavailable — a shop day, a family day at the yard — needs the exact
-- opposite and had no way to say it. Same table, same shape, one more fact.
--
-- 'dropoff' is the default, so every existing row keeps the meaning it was
-- written with. The table's name is now half wrong and it is staying: renaming
-- it would touch the dashboard, the slots function and the booking page for no
-- behaviour, and migrations here are append-only.
alter table public.dropoff_only_periods
  add column if not exists mode text not null default 'dropoff'
    check (mode in ('dropoff', 'mobile'));

comment on column public.dropoff_only_periods.mode is
  'Which service type this period ALLOWS. dropoff = customers must bring the '
  'vehicle (no mobile jobs); mobile = the detailer comes to them (no '
  'drop-offs). Enforced in available-slots and in create-booking.';
