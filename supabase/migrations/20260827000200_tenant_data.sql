-- All tenant data tables. Every table carries a non-null business_id
-- foreign-keyed to businesses, every unique constraint includes business_id,
-- and one standard RLS policy scopes everything to the caller's businesses.

-- ---------------------------------------------------------------------------
-- Catalog
-- ---------------------------------------------------------------------------

-- Flat services table. Replaces the old rigid packages model
-- (interior/exterior x standard/deluxe/ultimate). A detailer can have three
-- services or fifteen, named and grouped however they want.
create table public.services (
  id                       uuid primary key default gen_random_uuid(),
  business_id              uuid not null references public.businesses(id) on delete cascade,
  name                     text not null,
  description              text,
  price                    numeric not null default 0 check (price >= 0),
  duration_minutes         integer not null default 60 check (duration_minutes > 0),
  -- Per-vehicle-size price/duration adjustments. Defaults mirror the old
  -- hardcoded surcharges (medium +$15/+15min, large +$30/+30min).
  vehicle_size_adjustments jsonb not null default
    '{"small":{"price":0,"duration_minutes":0},"medium":{"price":15,"duration_minutes":15},"large":{"price":30,"duration_minutes":30}}',
  group_label              text,           -- optional grouping, e.g. "Interior" / "Exterior"
  features                 jsonb,
  notes                    text,
  is_active                boolean not null default true,  -- services are deactivated, never deleted
  sort_order               integer not null default 0,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

create index services_business_id_idx on public.services (business_id);

create table public.add_ons (
  id               uuid primary key default gen_random_uuid(),
  business_id      uuid not null references public.businesses(id) on delete cascade,
  name             text not null,
  description      text,
  price            numeric not null default 0 check (price >= 0),
  duration_minutes integer not null default 0 check (duration_minutes >= 0),
  features         jsonb,
  notes            text,
  is_active        boolean not null default true,
  sort_order       integer not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index add_ons_business_id_idx on public.add_ons (business_id);

create table public.monthly_plans (
  id             uuid primary key default gen_random_uuid(),
  business_id    uuid not null references public.businesses(id) on delete cascade,
  name           text not null,
  description    text,
  discount_type  text not null default 'amount' check (discount_type in ('percentage','amount')),
  discount_value numeric not null default 0 check (discount_value >= 0),
  is_active      boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index monthly_plans_business_id_idx on public.monthly_plans (business_id);

-- ---------------------------------------------------------------------------
-- Promotions & marketing
-- ---------------------------------------------------------------------------

create table public.promo_codes (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  code        text not null,
  type        text not null check (type in ('percentage','amount')),
  value       numeric not null check (value > 0),
  expires_at  timestamptz,
  usage_limit integer check (usage_limit >= 0),  -- NULL or 0 = unlimited (matches old semantics)
  times_used  integer not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (business_id, code)
);

create table public.campaigns (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  slug        text not null check (slug ~ '^[a-z0-9][a-z0-9-]*$'),
  name        text not null,
  promo_code  text,
  destination text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  unique (business_id, slug)
);

create table public.campaign_visits (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  campaign_id uuid references public.campaigns(id) on delete set null,  -- NULL = organic visit
  visitor_id  text,
  referrer    text,
  path        text,
  user_agent  text,
  created_at  timestamptz not null default now()
);

create index campaign_visits_business_created_idx on public.campaign_visits (business_id, created_at);
create index campaign_visits_campaign_idx        on public.campaign_visits (campaign_id);

-- ---------------------------------------------------------------------------
-- Site content
-- ---------------------------------------------------------------------------

create table public.testimonials (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  author      text not null,
  quote       text not null,
  rating      integer not null default 5 check (rating between 1 and 5),
  source      text,
  sort_order  integer not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

create index testimonials_business_id_idx on public.testimonials (business_id);

create table public.gallery_images (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  kind        text not null default 'single' check (kind in ('single','before_after')),
  image_url   text,
  before_url  text,
  after_url   text,
  caption     text,
  sort_order  integer not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

create index gallery_images_business_id_idx on public.gallery_images (business_id);

-- ---------------------------------------------------------------------------
-- Scheduling
-- ---------------------------------------------------------------------------

-- Old PK was just (weekday) — one weekly schedule for the whole system.
create table public.business_hours (
  business_id uuid not null references public.businesses(id) on delete cascade,
  weekday     integer not null check (weekday between 0 and 6),
  open_time   time,
  close_time  time,   -- NULL open/close = closed that day
  primary key (business_id, weekday)
);

-- Old constraint was UNIQUE(date) — one special-hours row per calendar date
-- across every business.
create table public.booking_hours_overrides (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  date        date not null,
  open_time   time,
  close_time  time,   -- NULL open/close = closed that day
  notes       text,
  created_at  timestamptz not null default now(),
  unique (business_id, date)
);

create table public.blockout_dates (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  event_name  text not null,
  start_date  date not null,
  end_date    date not null,
  all_day     boolean not null default false,
  start_time  time,
  end_time    time,
  repeat      text not null default 'none' check (repeat in ('none','weekly','monthly','yearly')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index blockout_dates_business_range_idx on public.blockout_dates (business_id, start_date, end_date);

create table public.dropoff_only_periods (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  start_date  date not null,
  end_date    date,
  start_time  time,
  end_time    time,
  reason      text,
  created_at  timestamptz not null default now()
);

create index dropoff_only_periods_business_idx on public.dropoff_only_periods (business_id, start_date);

-- ---------------------------------------------------------------------------
-- Customers
-- ---------------------------------------------------------------------------

create table public.customers (
  id                     uuid primary key default gen_random_uuid(),
  business_id            uuid not null references public.businesses(id) on delete cascade,
  name                   text not null,
  email                  text,
  phone                  text not null,
  address                text,
  notes                  text,
  referral_code          text,
  completed_washes_count integer not null default 0,
  loyalty_reward_eligible boolean not null default false,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

create index customers_business_phone_idx on public.customers (business_id, phone);
create unique index customers_business_referral_code_key
  on public.customers (business_id, referral_code) where referral_code is not null;

-- ---------------------------------------------------------------------------
-- Bookings
-- ---------------------------------------------------------------------------

-- start_at/end_at are absolute instants (timestamptz). The business's
-- timezone column converts them to local wall-clock time — no timezone is
-- baked into the schema. The exclusion constraint makes double booking
-- impossible at the database level no matter what application code does;
-- '[]' bounds mean a booking ending exactly when another begins still
-- counts as a conflict.
create table public.bookings (
  id                          uuid primary key default gen_random_uuid(),
  business_id                 uuid not null references public.businesses(id) on delete cascade,
  customer_id                 uuid references public.customers(id),
  customer_name               text not null,
  customer_phone              text not null,
  customer_email              text,
  customer_address            text,
  start_at                    timestamptz not null,
  end_at                      timestamptz not null,
  service_type                text not null check (service_type in ('mobile','dropoff')),
  vehicle_size                text not null default 'small' check (vehicle_size in ('small','medium','large')),
  vehicle_size_fee            numeric not null default 0,
  vehicle_model               text,
  has_water_electric          boolean not null default false,
  customer_notes              text,
  admin_notes                 text,
  subtotal                    numeric not null default 0,
  total_price                 numeric not null default 0,
  applied_promo_code          text,
  promo_discount              numeric,
  monthly_plan_id             uuid references public.monthly_plans(id),
  monthly_plan_discount       numeric,
  campaign_id                 uuid references public.campaigns(id),
  referral_code_used          text,
  final_amount                numeric,
  payment_status              text not null default 'pending' check (payment_status in ('pending','paid','partial','waived')),
  payment_notes               text,
  finalized_at                timestamptz,
  google_calendar_event_id    text,
  status                      text not null default 'confirmed' check (status in ('confirmed','cancelled','completed','no_show')),
  deleted_at                  timestamptz,   -- soft delete; nothing is ever hard deleted
  owner_reminder_sent_at      timestamptz,
  customer_reminder_sent_at   timestamptz,
  owner_nudge_sent_at         timestamptz,
  owner_wrapup_nudge_sent_at  timestamptz,
  owner_finalize_nudge_sent_at timestamptz,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now(),
  constraint bookings_time_valid check (end_at > start_at),
  constraint bookings_no_overlap exclude using gist (
    business_id with =,
    tstzrange(start_at, end_at, '[]') with &&
  ) where (status <> 'cancelled' and deleted_at is null)
);

create index bookings_business_start_idx on public.bookings (business_id, start_at) where deleted_at is null;
create index bookings_business_status_idx on public.bookings (business_id, status);
create index bookings_customer_idx on public.bookings (customer_id);

create trigger bookings_updated_at
  before update on public.bookings
  for each row execute function public.set_updated_at();

-- Which services a booking includes (flat services can be combined freely,
-- so this replaces the old fixed interior_package_id/exterior_package_id
-- pair). Price/duration are snapshotted because catalog prices change over
-- time and a booking must keep the price it was sold at.
create table public.booking_services (
  id                  uuid primary key default gen_random_uuid(),
  business_id         uuid not null references public.businesses(id) on delete cascade,
  booking_id          uuid not null references public.bookings(id) on delete cascade,
  service_id          uuid references public.services(id),
  name_at_booking     text not null,
  price_at_booking    numeric not null default 0,
  duration_at_booking integer not null default 0,
  created_at          timestamptz not null default now()
);

create index booking_services_booking_idx  on public.booking_services (booking_id);
create index booking_services_business_idx on public.booking_services (business_id);

-- Children of bookings carry business_id directly so their RLS policies
-- never need a join per row.
create table public.booking_add_ons (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  booking_id  uuid not null references public.bookings(id) on delete cascade,
  add_on_id   uuid references public.add_ons(id),
  quantity    integer not null default 1 check (quantity > 0),
  notes       text,
  created_at  timestamptz not null default now()
);

create index booking_add_ons_booking_idx  on public.booking_add_ons (booking_id);
create index booking_add_ons_business_idx on public.booking_add_ons (business_id);

create table public.booking_line_items (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  booking_id  uuid not null references public.bookings(id) on delete cascade,
  category    text not null check (category in ('service','upgrade','add_on','custom','travel_fee','tip','discount')),
  label       text not null,
  amount      numeric not null default 0,   -- negative = discount
  quantity    integer not null default 1 check (quantity > 0),
  created_at  timestamptz not null default now()
);

create index booking_line_items_booking_idx  on public.booking_line_items (booking_id);
create index booking_line_items_business_idx on public.booking_line_items (business_id);

-- ---------------------------------------------------------------------------
-- Finance & ops
-- ---------------------------------------------------------------------------

create table public.expenses (
  id             uuid primary key default gen_random_uuid(),
  business_id    uuid not null references public.businesses(id) on delete cascade,
  date           date not null,
  category       text not null,
  description    text not null,
  amount         numeric not null,
  payment_method text not null,
  notes          text,
  created_at     timestamptz not null default now()
);

create index expenses_business_date_idx on public.expenses (business_id, date);

-- Old endpoint was globally UNIQUE — one browser could only ever subscribe
-- to one (the only) business.
create table public.owner_push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  endpoint    text not null,
  p256dh      text not null,
  auth        text not null,
  user_agent  text,
  created_at  timestamptz not null default now(),
  unique (business_id, endpoint)
);

create index owner_push_subscriptions_business_idx on public.owner_push_subscriptions (business_id);

-- Old PK was digest_date alone — one digest per day for the whole system.
create table public.owner_daily_digest_state (
  business_id uuid not null references public.businesses(id) on delete cascade,
  digest_date date not null,
  sent_at     timestamptz,
  primary key (business_id, digest_date)
);

-- ---------------------------------------------------------------------------
-- RLS: one standard tenant policy per table.
-- authenticated users see/write only rows in their own businesses;
-- anon gets nothing (public reads go through the slug-scoped RPC).
-- Service role bypasses RLS (edge functions).
-- ---------------------------------------------------------------------------

do $$
declare
  t text;
begin
  foreach t in array array[
    'services','add_ons','monthly_plans','promo_codes','campaigns','campaign_visits',
    'testimonials','gallery_images','business_hours','booking_hours_overrides',
    'blockout_dates','dropoff_only_periods','customers','bookings','booking_services',
    'booking_add_ons','booking_line_items','expenses','owner_push_subscriptions',
    'owner_daily_digest_state'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);
    execute format($p$
      create policy %I on public.%I
        for all to authenticated
        using (business_id in (select public.current_business_ids()))
        with check (business_id in (select public.current_business_ids()))
    $p$, t || '_tenant_all', t);
  end loop;
end;
$$;
