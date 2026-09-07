-- ROADMAP 8.10 — MULTIPLE CARS.
--
-- His longest single answer (ideas 37/38), and it is THREE different facts.
-- Keeping them apart is the whole design; merging any two of them is how this
-- item goes wrong.
--
--  1. TWO CARS ON ONE VISIT is ONE booking with a second vehicle on it.
--     `booking_vehicles` holds vehicles 2..N. Vehicle 1 stays in the columns
--     it has always lived in (`bookings.vehicle_size`, `vehicle_size_label`,
--     `vehicle_size_fee`, `vehicle_model`), so every render path, every email
--     and the accountant export keep working unchanged AND there is no second
--     home for the same fact. `position >= 2` is that promise written as a
--     constraint rather than as a comment somebody later disagrees with.
--
--  2. TWO CARS ON TWO DAYS is TWO BOOKINGS. One booking is one time range —
--     `bookings_no_overlap`, `available-slots`, the day panel and the whole
--     availability engine all rest on that — so a visit that happens twice is
--     two visits, and giving one booking two ranges would mean rewriting all
--     of it. `booking_group_id` is what makes them ONE THING to the customer:
--     one confirmation, one receipt page, one cancellation. It is deliberately
--     NOT a foreign key to a groups table — there is nothing to say about a
--     group that the rows do not already say.
--
--  3. THE DEALERSHIP JOB is neither, and it is manual by his instruction:
--     *"there shouldn't be auto calculations, because obviously when they do
--     this there's discounts."* `bulk_vehicle_count` is what makes a booking
--     one.
--
-- WHY THE SETUP TIME IS A BUSINESS SETTING AND NOT A CONSTANT: *"it's not
-- gonna be double the time of one car, because there's not gonna be the setup
-- time."* How long setting up takes is the detailer's own trade knowledge — a
-- mobile rig with a pressure washer and a water tank is not a drop-off bay.

-- ---------------------------------------------------------------------------
-- The setting. BOTH DEFAULTS ARE DELIBERATE.
--
-- `max_vehicles_per_booking` defaults to 1, so every business that exists
-- today is untouched and the entire feature is invisible until a detailer
-- turns it on. Its ceiling of 10 is his own line: *"if there's like ten cars
-- or above the limit, that's gonna have to be done over a call."*
--
-- `extra_vehicle_minutes_saved` defaults to 15 rather than to 0, and that is
-- the one guess in this migration. Zero would ship the exact behaviour he
-- said was wrong — a second car taking double the time — to any detailer who
-- raises the limit and does not notice a second field. Fifteen minutes is a
-- deliberately small allowance (park, unpack, run the hose out), it only ever
-- applies once somebody has opted in, and it sits directly under the limit on
-- the same settings screen so raising one puts the other in front of them.
-- ---------------------------------------------------------------------------

alter table public.business_settings
  add column if not exists max_vehicles_per_booking integer not null default 1,
  add column if not exists extra_vehicle_minutes_saved integer not null default 15;

alter table public.business_settings
  drop constraint if exists business_settings_max_vehicles_sane;
alter table public.business_settings
  add constraint business_settings_max_vehicles_sane
    check (max_vehicles_per_booking between 1 and 10);

alter table public.business_settings
  drop constraint if exists business_settings_vehicle_setup_sane;
alter table public.business_settings
  add constraint business_settings_vehicle_setup_sane
    check (extra_vehicle_minutes_saved between 0 and 480);

comment on column public.business_settings.max_vehicles_per_booking is
  'How many vehicles one booking may hold. 1 = the feature is off, which is every business until a detailer says otherwise. 10 is the ceiling: above it is a phone call with a dealership, which is bulk_vehicle_count.';

comment on column public.business_settings.extra_vehicle_minutes_saved is
  'Minutes NOT repeated for each vehicle after the first ON THE SAME VISIT — the setup. It reduces DURATION only and never price: a second car is a second car of work. Two cars on two different days save nothing, because the setup really does happen twice.';

-- ---------------------------------------------------------------------------
-- Vehicles 2..N of one visit.
--
-- Every money and label column here is a SNAPSHOT, for the reason
-- `bookings.vehicle_size_label` already carries in its own comment: a detailer
-- who renames or deletes a vehicle size must not corrupt the record of jobs
-- already done.
-- ---------------------------------------------------------------------------

create table if not exists public.booking_vehicles (
  id                  uuid primary key default gen_random_uuid(),
  business_id         uuid not null references public.businesses(id) on delete cascade,
  booking_id          uuid not null references public.bookings(id) on delete cascade,
  -- 2 IS THE FIRST LEGAL VALUE AND IT IS THE LOAD-BEARING LINE IN THIS FILE.
  -- The first vehicle is on the booking row; a row here for position 1 would
  -- be the same fact written twice, and two copies of one fact is how a
  -- receipt and a job sheet start disagreeing about what was booked.
  position            integer not null check (position >= 2),
  vehicle_size        text not null,
  vehicle_size_label  text not null,
  vehicle_size_fee    numeric not null default 0,
  vehicle_model       text,
  created_at          timestamptz not null default now(),
  unique (booking_id, position)
);

create index if not exists booking_vehicles_booking_idx
  on public.booking_vehicles (booking_id);

alter table public.booking_vehicles enable row level security;
alter table public.booking_vehicles force row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'booking_vehicles'
      and policyname = 'booking_vehicles_tenant_all'
  ) then
    -- The same standard tenant policy every other booking child carries. It
    -- is written out here rather than added to the array in tenant_data.sql,
    -- because migrations are append-only.
    create policy booking_vehicles_tenant_all on public.booking_vehicles
      for all to authenticated
      using (business_id in (select public.current_business_ids()))
      with check (business_id in (select public.current_business_ids()));
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- The group, and the bulk job.
-- ---------------------------------------------------------------------------

alter table public.bookings
  add column if not exists booking_group_id uuid,
  add column if not exists bulk_vehicle_count integer;

alter table public.bookings
  drop constraint if exists bookings_bulk_count_sane;
alter table public.bookings
  add constraint bookings_bulk_count_sane
    check (bulk_vehicle_count is null or bulk_vehicle_count > 0);

create index if not exists bookings_group_idx
  on public.bookings (booking_group_id) where booking_group_id is not null;

comment on column public.bookings.booking_group_id is
  'Bookings a customer made in one go — the same cars across two days. Null for every ordinary booking. NOT a foreign key: there is nothing to say about a group that these rows do not already say.';

comment on column public.bookings.bulk_vehicle_count is
  'A dealership job the detailer LOGGED after the fact: how many cars. Its total_price is typed in and nothing computes it, because those deals carry discounts. Null for every booking a customer made.';

-- A LOGGED PAST JOB IS NOT A CLAIM ON A TIME SLOT, so it is excluded from the
-- overlap constraint. Without this, a detailer who did ten cars for a
-- dealership last Tuesday cannot record it if last Tuesday already has two
-- ordinary jobs on it — the feature failing at the only moment anybody uses
-- it. The constraint is unchanged for every row a customer can create: there
-- is no booking path that sets bulk_vehicle_count, and the dashboard is the
-- only writer.
alter table public.bookings drop constraint if exists bookings_no_overlap;
alter table public.bookings add constraint bookings_no_overlap
  exclude using gist (
    business_id with =,
    tstzrange(start_at, end_at, '[]') with &&
  ) where (status <> 'cancelled' and deleted_at is null and bulk_vehicle_count is null);
