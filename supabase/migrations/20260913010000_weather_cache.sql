-- THE WEATHER IS STORED, NOT FETCHED ON VIEW — Andrew's design, 2026-09-13.
--
-- His goal, and it is the right one: *"opening a booking must never make him
-- wait for a forecast. The number is just there."*
--
-- ---------------------------------------------------------------------------
-- THE ONE CORRECTION TO HIS DESIGN, WRITTEN DOWN BECAUSE THE NEXT SESSION WILL
-- MEET THE SAME TEMPTATION.
-- ---------------------------------------------------------------------------
-- He proposed *fetch once when the booking is created, keep it, never fetch
-- again*. That cannot work, because **a forecast is not a fact, it is a
-- prediction that changes.** A job booked three weeks out has no real forecast
-- at all, and a number captured at booking time would still be sitting there,
-- confidently wrong, on the morning of the job — which is the one morning it
-- decides what somebody loads into a van. His own alternative in the same
-- breath — *"or maybe fetches once a day"* — is the correct one.
--
-- **SO EVERYTHING STORED HERE IS A CACHE THAT REFRESHES, NEVER A WRITE-ONCE
-- VALUE.** That is the whole difference, and it is why `fetched_at` is on every
-- row rather than `created_at`.
--
-- ---------------------------------------------------------------------------
-- TWO CACHES, BECAUSE THERE ARE TWO METERS AND THEY ARE NOTHING ALIKE.
-- ---------------------------------------------------------------------------
--   · `address_points` — GEOAPIFY, 3,000 credits a DAY shared by every tenant
--     (`_shared/rateLimit.ts`). **A street does not move**, so this row is
--     written once and read for ever. It has no expiry on purpose.
--     This table's absence cost us an hour on the day it was written: a
--     browser-only cache meant every fresh session re-geocoded every address,
--     and two verification runs exhausted the 60-per-hour ceiling.
--   · `weather_grids` — THE NATIONAL WEATHER SERVICE, free and keyless but
--     asking for sane use. **A forecast goes stale**, so this row carries
--     `fetched_at` and the refresher decides. One row is ONE ~1km grid square
--     holding the WHOLE WEEK of hourly periods, so twenty jobs in one town on
--     one day are one provider call — Andrew's point 3, and the real saving.
--
-- NEITHER TABLE IS PER TENANT AND NEITHER MENTIONS A BUSINESS. The sky over a
-- street is the same sky for every detailer who drives to it, and a per-tenant
-- copy would multiply both meters by the tenant count for no fact gained.

create table if not exists public.address_points (
  key         text primary key,
  lat         double precision,
  lon         double precision,
  -- FALSE MEANS GEOAPIFY POSITIVELY SAID IT KNOWS NO SUCH PLACE, and that is
  -- worth remembering so a typo is not re-asked every hour. An outage or a
  -- throttle writes NO ROW AT ALL — `lib/jobWeather.js` keeps the same rule on
  -- the client and for the same reason: a dropped connection must never become
  -- a permanent blank.
  found       boolean not null,
  resolved_at timestamptz not null default now()
);

create table if not exists public.weather_grids (
  grid_key   text primary key,        -- "33.85,-118.13" — two decimals, ~1km
  lat        double precision not null,
  lon        double precision not null,
  periods    jsonb not null,          -- the NWS hourly periods, our shape
  place      text,
  fetched_at timestamptz not null default now()
);

-- **RLS FORCED, NO POLICIES AT ALL** — the same statement `platform_admins`
-- makes (CLAUDE.md § THE PLATFORM BACK OFFICE). Nothing a detailer's browser
-- does should reach either table: they are written by the service role and read
-- by the service role, and a policy here would be a cross-tenant surface on two
-- tables that have no tenant column to scope it by.
alter table public.address_points enable row level security;
alter table public.address_points force row level security;
alter table public.weather_grids  enable row level security;
alter table public.weather_grids  force row level security;

-- ---------------------------------------------------------------------------
-- THE BOOKING CARRIES ITS OWN HOUR, AND THAT IS WHAT MAKES A ROW INSTANT.
-- ---------------------------------------------------------------------------
-- A shared cache table still costs a round trip to read. This column arrives
-- with the booking in the query every screen already makes, so a row paints
-- with its weather on it and there is no spinner, ever — which was the ask.
alter table public.bookings add column if not exists weather    jsonb;
alter table public.bookings add column if not exists weather_at timestamptz;

-- **A RECORD ITS SUBJECT CAN EDIT IS NOT A RECORD** — the rule roadmap 4.4
-- set for `verified_at` and the same one here. RLS chooses ROWS and not
-- COLUMNS, so without this revoke a detailer's browser could write any
-- temperature it liked onto its own bookings. Reading stays open: the whole
-- point is that their screens read it.
revoke update (weather, weather_at) on public.bookings from authenticated;

-- Finding the bookings that are due a refresh, without walking history.
create index if not exists bookings_weather_due_idx
  on public.bookings (start_at)
  where deleted_at is null;

-- ---------------------------------------------------------------------------
-- HOURLY, BECAUSE THE CADENCE LIVES IN THE FUNCTION AND NOT IN THE SCHEDULE.
-- ---------------------------------------------------------------------------
-- The rules Andrew asked for — once a day normally, again on the day of the job
-- and the evening before, never for a booking in the past, nothing at all
-- beyond the provider's range — are all "is THIS grid due", which is a question
-- about one row. A cron expression cannot ask it. So the job runs hourly and
-- the function refuses most of the work; an hour with nothing due costs one
-- invocation and no provider call at all.
create extension if not exists pg_net;
create extension if not exists pg_cron;

select cron.schedule(
  'refresh-weather',
  '7 * * * *',
  $job$
  select net.http_post(
    url := 'https://kguqylyzgyzfktkfnhjb.supabase.co/functions/v1/refresh-weather',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := '{}'::jsonb
  );
  $job$
);
