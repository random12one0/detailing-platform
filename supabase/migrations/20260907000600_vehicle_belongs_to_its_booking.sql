-- ROADMAP 8.10, from the security review — A VEHICLE ROW MUST BELONG TO A
-- BOOKING OF THE SAME BUSINESS, AND THE POLICY CANNOT SAY THAT.
--
-- `booking_vehicles_tenant_all` checks `business_id in
-- (select public.current_business_ids())`, which is the standard tenant policy
-- and is what every other booking child carries. It answers *is this row
-- MINE* and has no opinion at all about whether `booking_id` points at one of
-- my bookings. So a member of business A holding a booking UUID from business
-- B could insert `(business_id = A, booking_id = <B's booking>)`, and that car
-- would then appear on B's job sheet, in B's owner alert and on B's customer's
-- receipt — from a row B cannot see, delete or explain.
--
-- **The same gap exists on `booking_services` and `booking_add_ons` and is not
-- touched here.** Those are live tables with live rows and closing it there is
-- its own item with its own backfill; this one is a day old and empty, so it
-- costs two statements to be born without it. A new table inheriting a known
-- gap because its neighbours have it is how a gap becomes the convention.
--
-- IT IS A COMPOSITE FOREIGN KEY RATHER THAN A TRIGGER OR A CHECK. A `check`
-- constraint may not read another table, and a trigger is a second thing to
-- keep in step; the FK is declarative, is enforced for the service role too
-- (which is what `create-booking` writes as, so it covers the path that
-- actually writes these rows), and needs no backfill because there is nothing
-- yet to backfill.

-- The FK's target. `bookings.id` is already the primary key, so this adds no
-- real constraint — Postgres simply requires a unique index on exactly the
-- referenced pair before it will accept the reference.
alter table public.bookings
  drop constraint if exists bookings_id_business_key;
alter table public.bookings
  add constraint bookings_id_business_key unique (id, business_id);

alter table public.booking_vehicles
  drop constraint if exists booking_vehicles_booking_id_fkey;
alter table public.booking_vehicles
  drop constraint if exists booking_vehicles_booking_same_business;
alter table public.booking_vehicles
  add constraint booking_vehicles_booking_same_business
    foreign key (booking_id, business_id)
    references public.bookings (id, business_id)
    on delete cascade;

comment on constraint booking_vehicles_booking_same_business on public.booking_vehicles is
  'A car belongs to a booking of the SAME business. The row-level policy only asks whether the ROW is yours; without this a member holding another tenant''s booking id could add a car to it, and it would show up on that tenant''s job sheet and their customer''s receipt.';
