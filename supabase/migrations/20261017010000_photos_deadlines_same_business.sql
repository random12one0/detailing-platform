-- ROADMAP 97.71 — A JOB PHOTO AND A MAINTENANCE DEADLINE BELONG TO A BOOKING OF THEIR OWN BUSINESS.
--
-- `job_photos.booking_id`, `maintenance_deadlines.booking_id` and
-- `maintenance_deadlines.last_done_booking_id` pointed at `bookings(id)` alone,
-- and the insert/update policies check only the row's own `business_id`. So a
-- detailer in business A who knew a booking id of business B could write a row
-- carrying A's business_id and B's booking id: the policy passed and the
-- foreign key passed. The same gap 20261017000000 closed for a booking's lines
-- and 20260907000600 closed for cars, closed here the same way — a composite
-- foreign key on `(booking id, business_id)` against
-- `bookings_id_business_key unique (id, business_id)`, which 20260907000600
-- added and the live database holds (measured 2026-10-17), so it is NOT
-- created again.
--
-- THE DELETE RULES ARE NOT COPIES. `job_photos.booking_id` is `not null ...
-- on delete cascade`, so its pair key cascades too. Both deadline columns are
-- nullable `on delete set null` while `business_id` is `not null`: a plain
-- `on delete set null` on the pair would null `business_id` as well and the
-- delete of a booking would fail, so each pair key names ONLY its booking
-- column — `on delete set null (booking_id)` (PostgreSQL 15+; live is 17.6).
-- A row whose booking column is null is not checked, which is right: a
-- warranty with no booking in this product is a real thing.
-- (Measured on PGlite: while the old single-column keys below exist they fire
-- first and clear the column, so this rule only decides once they are dropped;
-- a copy of 97.12's `cascade` would then delete the deadline with its job.)
--
-- The old single-column foreign keys stay; they are redundant, not wrong.
--
-- `tests/photos-deadlines-same-business-sql.test.mjs` applies this file to a
-- throwaway in-process Postgres. Applying it to the live database is Andrew's.

-- 1 · Existing rows are checked BEFORE any constraint is added, and a mismatch
-- is refused with its count rather than repaired.
do $$
declare
  n_photos bigint;
  n_booking bigint;
  n_last_done bigint;
begin
  select count(*) into n_photos from public.job_photos c
    join public.bookings b on b.id = c.booking_id where b.business_id <> c.business_id;
  select count(*) into n_booking from public.maintenance_deadlines c
    join public.bookings b on b.id = c.booking_id where b.business_id <> c.business_id;
  select count(*) into n_last_done from public.maintenance_deadlines c
    join public.bookings b on b.id = c.last_done_booking_id where b.business_id <> c.business_id;
  if n_photos + n_booking + n_last_done > 0 then
    raise exception 'rows whose business is not their booking''s: job_photos %, maintenance_deadlines.booking_id %, maintenance_deadlines.last_done_booking_id % — resolve these before applying',
      n_photos, n_booking, n_last_done;
  end if;
end
$$;

-- 2 · An index behind each composite foreign key.
create index job_photos_booking_business_idx
  on public.job_photos (booking_id, business_id);
create index maintenance_deadlines_booking_business_idx
  on public.maintenance_deadlines (booking_id, business_id);
create index maintenance_deadlines_last_done_business_idx
  on public.maintenance_deadlines (last_done_booking_id, business_id);

-- 3 · The rule itself.
alter table public.job_photos
  add constraint job_photos_booking_same_business
  foreign key (booking_id, business_id) references public.bookings (id, business_id) on delete cascade;
alter table public.maintenance_deadlines
  add constraint maintenance_deadlines_booking_same_business
  foreign key (booking_id, business_id) references public.bookings (id, business_id) on delete set null (booking_id);
alter table public.maintenance_deadlines
  add constraint maintenance_deadlines_last_done_same_business
  foreign key (last_done_booking_id, business_id) references public.bookings (id, business_id) on delete set null (last_done_booking_id);
