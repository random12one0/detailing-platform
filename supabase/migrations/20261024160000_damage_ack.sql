-- ROADMAP 97.55 — THE CUSTOMER'S TIMED TICK ON THE VEHICLE CHECK-IN.
--
-- Andrew, 2026-10-15: the customer ticks a timed box on the receipt link.
-- No signature drawing. This column is the time they ticked it. Null means
-- they have not: a missing tick and a tick at midnight are different facts,
-- so there is no default.
--
-- Written only by `acknowledge-checkin` under the service role. The browser
-- already reads bookings through the table-level SELECT and cannot UPDATE
-- any column of it (`20261006040000_bookings_browser_updates_nothing.sql`),
-- so no grant is needed.

alter table public.bookings add column if not exists damage_ack_at timestamptz;

comment on column public.bookings.damage_ack_at is
  'Roadmap 97.55. When the customer ticked the vehicle check-in box on their '
  'receipt link. Written by acknowledge-checkin; shown on the job record.';

-- HOW MANY DAMAGE PHOTOS THE TICK COVERED, written in the same update as the
-- time (finish review 2026-10-24). A photo added after the customer
-- confirmed must never read as something they confirmed, so the job record
-- shows this number rather than whatever is on the job today. Null exactly
-- when damage_ack_at is null.
alter table public.bookings add column if not exists damage_ack_photo_count integer;

comment on column public.bookings.damage_ack_photo_count is
  'Roadmap 97.55. How many damage photos were on the job when the customer '
  'ticked the vehicle check-in. Written with damage_ack_at by acknowledge-checkin.';
