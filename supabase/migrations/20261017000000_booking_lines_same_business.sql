-- ROADMAP 97.12 (S-M2) — A BOOKING'S LINES BELONG TO THE BOOKING'S OWN BUSINESS.
--
-- `booking_services`, `booking_add_ons` and `booking_line_items` pointed at
-- `bookings(id)` alone, and their policy checks only the row's own
-- `business_id`. So a detailer in business A who knew a booking id of
-- business B could insert a row carrying A's business_id and B's booking_id:
-- the policy passed (it is A's row) and the foreign key passed (the booking
-- exists). The receipt and the invoice then printed it on B's paperwork.
--
-- The fix is the database's own: `(booking_id, business_id)` must name a real
-- booking OF THAT BUSINESS — a composite foreign key on each child, the same
-- one `20260907000600_vehicle_belongs_to_its_booking.sql` gave
-- `booking_vehicles`. That migration also added its target,
-- `bookings_id_business_key unique (id, business_id)`, which the live database
-- has (measured 2026-10-17) — so it is NOT created again here; a second
-- `add constraint` of that name would stop this file on apply. The old single-column foreign keys stay;
-- they are redundant, not wrong, and dropping them is not this item.
--
-- The indexes are named and created first so that the foreign-key-index lint
-- in `scripts/db-audit.mjs` stays clean once this runs, and so that
-- `scripts/migration-drift.mjs` (which sees indexes but not constraints) can
-- name this file while it has not run.
--
-- `tests/booking-lines-same-business-sql.test.mjs` applies this file to a
-- throwaway in-process Postgres. Applying it to the live database is Andrew's.

-- 1 · Existing rows are checked BEFORE any constraint is added. A mismatch is
-- refused with its count rather than repaired: which business a stray line
-- really belongs to is not a question a migration gets to answer.
do $$
declare
  n_services bigint;
  n_add_ons bigint;
  n_lines bigint;
begin
  select count(*) into n_services from public.booking_services c
    join public.bookings b on b.id = c.booking_id where b.business_id <> c.business_id;
  select count(*) into n_add_ons from public.booking_add_ons c
    join public.bookings b on b.id = c.booking_id where b.business_id <> c.business_id;
  select count(*) into n_lines from public.booking_line_items c
    join public.bookings b on b.id = c.booking_id where b.business_id <> c.business_id;
  if n_services + n_add_ons + n_lines > 0 then
    raise exception 'booking lines whose business is not their booking''s: booking_services %, booking_add_ons %, booking_line_items % — resolve these before applying',
      n_services, n_add_ons, n_lines;
  end if;
end
$$;

-- 2 · An index behind each composite foreign key.
create index booking_services_booking_business_idx   on public.booking_services   (booking_id, business_id);
create index booking_add_ons_booking_business_idx    on public.booking_add_ons    (booking_id, business_id);
create index booking_line_items_booking_business_idx on public.booking_line_items (booking_id, business_id);

-- 3 · The rule itself. Its target is `bookings_id_business_key` (20260907000600).
alter table public.booking_services
  add constraint booking_services_booking_same_business
  foreign key (booking_id, business_id) references public.bookings (id, business_id) on delete cascade;
alter table public.booking_add_ons
  add constraint booking_add_ons_booking_same_business
  foreign key (booking_id, business_id) references public.bookings (id, business_id) on delete cascade;
alter table public.booking_line_items
  add constraint booking_line_items_booking_same_business
  foreign key (booking_id, business_id) references public.bookings (id, business_id) on delete cascade;
