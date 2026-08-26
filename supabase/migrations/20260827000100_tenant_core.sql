-- Tenant core: the businesses table (tenant root), membership, per-business
-- settings/branding, and custom-domain mapping. Every other table in the
-- platform hangs off businesses.id.

create table public.businesses (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{1,62}$'),
  name        text not null,
  status      text not null default 'active' check (status in ('active','paused','churned')),
  plan_tier   text not null default 'standard',
  timezone    text not null default 'America/Los_Angeles',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger businesses_updated_at
  before update on public.businesses
  for each row execute function public.set_updated_at();

create trigger businesses_validate_timezone
  before insert or update of timezone on public.businesses
  for each row execute function public.validate_timezone();

create table public.business_users (
  business_id uuid not null references public.businesses(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  role        text not null default 'owner' check (role in ('owner','staff')),
  created_at  timestamptz not null default now(),
  primary key (business_id, user_id)
);

create index business_users_user_id_idx on public.business_users (user_id);

-- The RLS helper everything scopes on. SECURITY DEFINER so it can read
-- business_users without recursing into that table's own policies.
create or replace function public.current_business_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select business_id from public.business_users where user_id = auth.uid();
$$;

create or replace function public.is_business_owner(p_business_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.business_users
    where business_id = p_business_id
      and user_id = auth.uid()
      and role = 'owner'
  );
$$;

-- Per-business booking rules. Every value here was a hardcoded constant in
-- the single-tenant system; defaults mirror those old values.
create table public.business_settings (
  business_id                    uuid primary key references public.businesses(id) on delete cascade,
  -- availability engine
  buffer_minutes                 integer not null default 60  check (buffer_minutes >= 0),          -- was 60 in available-slots + create-booking (and a stale 30 in _shared/pricing.ts)
  min_advance_minutes            integer not null default 120 check (min_advance_minutes >= 0),     -- was 2h, duplicated 4x
  max_advance_days               integer          check (max_advance_days > 0),                     -- NULL = unbounded (old behavior)
  slot_interval_minutes          integer not null default 30  check (slot_interval_minutes > 0),    -- was a bare `t += 30`
  max_bookings_per_day           integer          check (max_bookings_per_day > 0),                 -- NULL = unlimited (did not exist)
  -- service model
  mobile_enabled                 boolean not null default true,
  dropoff_enabled                boolean not null default true,
  travel_radius_miles            numeric          check (travel_radius_miles >= 0),                 -- did not exist
  travel_fee                     numeric          check (travel_fee >= 0),                          -- did not exist
  ask_water_electric             boolean not null default true,
  -- reminders / notifications (old values were hardcoded in SQL + edge functions)
  customer_reminder_lead_minutes integer not null default 120 check (customer_reminder_lead_minutes >= 0),
  evening_before_enabled         boolean not null default true,
  evening_before_latest_start    time    not null default '10:00',  -- jobs starting at/before this get reminded the prior evening
  evening_before_send_time       time    not null default '19:00',
  owner_nudge_lead_minutes       integer not null default 30  check (owner_nudge_lead_minutes >= 0),
  wrapup_nudge_lead_minutes      integer not null default 20  check (wrapup_nudge_lead_minutes >= 0),
  finalize_nudge_delay_minutes   integer not null default 120 check (finalize_nudge_delay_minutes >= 0),
  daily_digest_hour              integer not null default 7   check (daily_digest_hour between 0 and 23),
  -- policy
  cancellation_window_hours      integer not null default 24  check (cancellation_window_hours >= 0),
  price_rounding_nearest         numeric not null default 5   check (price_rounding_nearest >= 0),  -- old pricing engine rounded to nearest $5; 0 = no rounding
  -- review links
  google_review_url              text,
  yelp_review_url                text,
  updated_at                     timestamptz not null default now()
);

create trigger business_settings_updated_at
  before update on public.business_settings
  for each row execute function public.set_updated_at();

create table public.business_branding (
  business_id      uuid primary key references public.businesses(id) on delete cascade,
  logo_url         text,
  primary_color    text check (primary_color  ~* '^#[0-9a-f]{6}$'),
  secondary_color  text check (secondary_color ~* '^#[0-9a-f]{6}$'),
  hero_image_url   text,
  tagline          text,
  about_copy       text,
  social_instagram text,
  social_facebook  text,
  social_tiktok    text,
  social_youtube   text,
  social_google    text,
  social_yelp      text,
  updated_at       timestamptz not null default now()
);

create trigger business_branding_updated_at
  before update on public.business_branding
  for each row execute function public.set_updated_at();

-- Custom domain -> business mapping. Built now, unused until much later.
create table public.business_domains (
  id                 uuid primary key default gen_random_uuid(),
  business_id        uuid not null references public.businesses(id) on delete cascade,
  domain             text not null unique check (domain = lower(domain)),
  verification_token text not null default encode(gen_random_bytes(16), 'hex'),
  verified_at        timestamptz,
  created_at         timestamptz not null default now()
);

create index business_domains_business_id_idx on public.business_domains (business_id);

-- ---------------------------------------------------------------------------
-- RLS (enable+force is also applied by the rls_auto_enable event trigger;
-- repeated here so the protection is explicit and survives a trigger-less DB)
-- ---------------------------------------------------------------------------

alter table public.businesses        enable row level security;
alter table public.businesses        force  row level security;
alter table public.business_users    enable row level security;
alter table public.business_users    force  row level security;
alter table public.business_settings enable row level security;
alter table public.business_settings force  row level security;
alter table public.business_branding enable row level security;
alter table public.business_branding force  row level security;
alter table public.business_domains  enable row level security;
alter table public.business_domains  force  row level security;

-- Members can see their own business; only owners can edit it.
-- Creating/deleting businesses is a service-role-only operation (signup flow).
create policy businesses_member_select on public.businesses
  for select to authenticated
  using (id in (select public.current_business_ids()));

create policy businesses_owner_update on public.businesses
  for update to authenticated
  using (public.is_business_owner(id))
  with check (public.is_business_owner(id));

-- Members can see who else is in their business; membership itself is
-- managed only by the service role (invite flow comes later).
create policy business_users_member_select on public.business_users
  for select to authenticated
  using (business_id in (select public.current_business_ids()));

create policy business_settings_member_select on public.business_settings
  for select to authenticated
  using (business_id in (select public.current_business_ids()));

create policy business_settings_owner_write on public.business_settings
  for update to authenticated
  using (public.is_business_owner(business_id))
  with check (public.is_business_owner(business_id));

create policy business_branding_member_select on public.business_branding
  for select to authenticated
  using (business_id in (select public.current_business_ids()));

create policy business_branding_owner_write on public.business_branding
  for update to authenticated
  using (public.is_business_owner(business_id))
  with check (public.is_business_owner(business_id));

create policy business_domains_member_select on public.business_domains
  for select to authenticated
  using (business_id in (select public.current_business_ids()));
