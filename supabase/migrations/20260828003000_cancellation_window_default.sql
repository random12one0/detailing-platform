-- A default that generated phone calls.
-- ---------------------------------------------------------------------
-- A new business accepts bookings 2 hours out (min_advance_minutes = 120)
-- but refused online cancellation within 24 hours. Together that meant
-- EVERY booking a new business's customers could make was un-cancellable
-- the moment it was made: the customer had to ring the detailer, which is
-- the exact chore this product is sold to remove.
--
-- Four hours: long enough that a detailer already driving to a job is not
-- stood up, short enough that a same-day booking can still be undone by
-- the person who made it.
--
-- Existing businesses keep whatever they have set; this changes the
-- default for new signups only.

alter table public.business_settings
  alter column cancellation_window_hours set default 4;

comment on column public.business_settings.cancellation_window_hours is
  'Hours before the appointment when online changes close. Default 4 — must stay compatible with min_advance_minutes or customers get bookings they cannot cancel.';
