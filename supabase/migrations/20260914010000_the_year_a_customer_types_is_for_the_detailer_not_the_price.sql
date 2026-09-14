-- THE VEHICLE YEAR, ASKED ON THE BOOKING PAGE — Andrew's ask, 2026-09-14.
-- Free text, an estimate is fine, and it reaches no pricing rule anywhere:
-- `_shared/pricing.ts` never reads this column, the same posture already
-- kept for `vehicle_model`. It exists so the DETAILER can judge condition
-- before they arrive, not so the app can charge differently for an older car.
alter table public.bookings
  add column vehicle_year text;

comment on column public.bookings.vehicle_year is
  'Customer-entered estimate, never wired to price. See app/src/book/core.js bookingRequest().';
