-- Roadmap 2.8b — the ONE migration behind the five items roadmap 2.7 left
-- unbuilt. The shape of every column here was decided by research, and the
-- four judgment calls in it were answered by the owner on 2026-08-31:
-- docs/detailer-research-2026-08-31.md, "The schema this decides".
--
-- Append-only, as always. Two things in here look like edits and are not:
-- dropping a CHECK constraint in a NEW file is not editing an old one, and
-- `create or replace function` is how every previous change to the public
-- profile RPC was made.
--
-- WHAT IS KEPT ON PURPOSE, so a later session does not "tidy" it:
--   services.group_label            — every service row still carries it, and
--                                     it is what the backfill below reads.
--   business_settings.ask_water_electric } every deployed edge function and
--   bookings.has_water_electric          } every existing row still reads
--                                     these. The new columns are written
--                                     ALONGSIDE them; the old pair is retired
--                                     in a later pass, once nothing reads it.

-- ---------------------------------------------------------------------------
-- W25 — CATEGORIES, WITH THE SELECTION RULE ON THE CATEGORY.
--
-- The owner's own menu is Interior (pick one), Exterior (pick one) and add-ons
-- (pick several): "a lot of detailers do things very different… maybe each
-- detailer can click categories and then what's in the category. So a person
-- booking can click one per category." One business-level boolean cannot say
-- that, which is why the single `services_single_select` this research first
-- recommended was dropped.
--
-- This is the restaurant point-of-sale "modifier group" — a group of choices
-- with a cap on how many you may take. Toast and Lightspeed both model it as
-- min/max selections; we are using their mechanism, not inventing one.
--
--   max_select = 1     pick one from this category
--   max_select = null  pick as many as you like
--
-- NO min_select. The existing rule "a booking needs at least one service"
-- already does that work, and nothing in the evidence needs a per-category
-- minimum. An integer rather than a boolean because the storage is identical
-- and "up to two" would otherwise need a second migration.
--
-- A TABLE, not a list on business_settings matched by name: `group_label` is
-- free text typed per service, so a name-matched category means retyping a
-- label silently creates a SECOND category — which has no rule, so it falls
-- back to pick-any. That is a live booking page quietly reverting to the
-- behaviour W25 exists to remove, on a money path, with nothing to notice it.
create table public.service_groups (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name        text not null,
  sort_order  integer not null default 0,
  max_select  integer check (max_select is null or max_select >= 1),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (business_id, name)
);

create index service_groups_business_id_idx on public.service_groups (business_id);

create trigger service_groups_updated_at
  before update on public.service_groups
  for each row execute function public.set_updated_at();

-- RLS is already ON: the rls_auto_enable event trigger from the foundation
-- migration fires on CREATE TABLE. This is the standard tenant policy every
-- other tenant table gets.
create policy service_groups_tenant_all on public.service_groups
  for all to authenticated
  using (business_id in (select public.current_business_ids()))
  with check (business_id in (select public.current_business_ids()));

alter table public.services
  add column group_id uuid references public.service_groups(id) on delete set null;

-- W9 — "from $220" rather than "$220". Every one of the five real detailer
-- menus studied publishes a starting price or a range, because how dirty the
-- car is decides the hours and nobody knows that until they see it. It
-- changes the DISPLAY and nothing else: the arithmetic is untouched.
alter table public.services
  add column price_is_from boolean not null default false;

-- ---------------------------------------------------------------------------
-- W22 — WATER AND POWER, PER DETAILER, AND ONE SETTING EACH.
--
-- His premise was backwards and the research is what turned it round: he
-- believed he was unusual in having no tank and no generator, and working
-- detailers overwhelmingly use the customer's tap and outlet. So the question
-- he added for himself is the standard one; what varies is WHICH resource and
-- what happens when the answer is no.
--
--   not_needed  the detailer brings their own — the customer is never asked
--   ask         ask and record it, so they know what to load in the van
--   required    ask, and BLOCK the booking on "no"
--
-- Both default to 'ask', which is exactly today's behaviour wherever
-- ask_water_electric is true, so no tenant's booking page changes on
-- migration day. Two settings rather than one because they vary
-- independently: the coating specialist needs power and brings water, the
-- rinseless detailer needs neither.
alter table public.business_settings
  add column water_requirement text not null default 'ask'
    check (water_requirement in ('not_needed','ask','required')),
  add column power_requirement text not null default 'ask'
    check (power_requirement in ('not_needed','ask','required'));

-- W9 — VEHICLE SIZES BECOME THE DETAILER'S OWN LIST. His answer, and it is
-- better evidenced than the fixed five this research recommended: of the menus
-- studied one uses twelve classes, one uses five, and one prices in ranges
-- with no classes at all.
--
-- Most of this was already flexible, which is why it is affordable:
-- services.vehicle_size_adjustments is jsonb keyed BY SIZE NAME and
-- _shared/pricing.ts looks the key up rather than switching on it. The default
-- is today's three, so nothing changes for an existing tenant.
alter table public.business_settings
  add column vehicle_sizes jsonb not null default
    '[{"key":"small","label":"Small","examples":"Coupe, sedan, hatchback"},
      {"key":"medium","label":"Medium","examples":"Small SUV, crossover, wagon"},
      {"key":"large","label":"Large","examples":"Truck, large SUV, van"}]'::jsonb;

-- W27 — how dirty is it. Information, never arithmetic: the trade prices
-- condition after inspection, so this must not touch the quote. It is what
-- makes a from-price honest rather than evasive, which is why the owner
-- approved it and price_is_from together.
alter table public.business_settings
  add column ask_vehicle_condition boolean not null default true;

-- ---------------------------------------------------------------------------
-- The booking side.
alter table public.bookings
  -- Nullable on purpose: null is "not asked", which is a different fact from
  -- "asked and the answer was no". has_water_electric could not say that.
  add column has_water boolean,
  add column has_power boolean,
  add column vehicle_condition text
    check (vehicle_condition is null
           or vehicle_condition in ('light','moderate','heavy','extreme')),
  -- A SNAPSHOT, and it is not optional. A detailer who renames or deletes a
  -- size must not corrupt the record of jobs already done — vehicle_size_fee
  -- is already snapshotted here for exactly this reason, and booking_services
  -- snapshots name, price and duration. Without it, last month's invoice
  -- starts printing a key that no longer resolves.
  add column vehicle_size_label text;

-- The three-value CHECK is what pinned the whole product to small/medium/
-- large. It goes; a length bound stays, because the column is still a key and
-- not a paragraph.
alter table public.bookings
  drop constraint if exists bookings_vehicle_size_check;
alter table public.bookings
  add constraint bookings_vehicle_size_len
    check (char_length(vehicle_size) between 1 and 60);

-- ---------------------------------------------------------------------------
-- BACKFILL. One service_groups row per distinct group_label per business,
-- max_select NULL so no booking page changes behaviour on migration day, then
-- every service pointed at its row. Reading prefers group_id and falls back to
-- group_label, so a service with neither still renders.
insert into public.service_groups (business_id, name, sort_order, max_select)
select s.business_id,
       s.group_label,
       (row_number() over (partition by s.business_id order by min(s.sort_order), s.group_label))::int - 1,
       null
  from public.services s
 where s.group_label is not null and btrim(s.group_label) <> ''
 group by s.business_id, s.group_label
on conflict (business_id, name) do nothing;

update public.services s
   set group_id = g.id
  from public.service_groups g
 where g.business_id = s.business_id
   and g.name = s.group_label
   and s.group_id is null;

-- ---------------------------------------------------------------------------
-- The public booking page reads ONE RPC, so everything above has to reach it
-- or the page cannot see any of it. Same shape as before plus: the category
-- list, each service's group_id and price_is_from, the two resource
-- requirements, the tenant's vehicle sizes, and whether to ask about
-- condition. Still strictly public-safe — no customer data, no revenue, no
-- internal settings.
create or replace function public.get_public_business_profile(p_slug text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'business', jsonb_build_object(
      'slug', b.slug,
      'name', b.name,
      'timezone', b.timezone,
      'phone', b.contact_phone,
      'dropoff_address', b.dropoff_address,
      'service_area', b.service_area
    ),
    'branding', (
      select to_jsonb(br) - 'business_id' - 'updated_at'
      from public.business_branding br
      where br.business_id = b.id
    ),
    'settings', (
      select jsonb_build_object(
        'mobile_enabled', s.mobile_enabled,
        'dropoff_enabled', s.dropoff_enabled,
        'ask_water_electric', s.ask_water_electric,
        'water_requirement', s.water_requirement,
        'power_requirement', s.power_requirement,
        'ask_vehicle_condition', s.ask_vehicle_condition,
        'vehicle_sizes', s.vehicle_sizes,
        'slot_interval_minutes', s.slot_interval_minutes,
        'min_advance_minutes', s.min_advance_minutes,
        'max_advance_days', s.max_advance_days,
        'travel_fee', s.travel_fee,
        'travel_radius_miles', s.travel_radius_miles,
        'cancellation_window_hours', s.cancellation_window_hours,
        'site_discount_active', s.site_discount_active,
        'site_discount_percent', s.site_discount_percent,
        'site_discount_label', s.site_discount_label,
        'google_review_url', s.google_review_url,
        'yelp_review_url', s.yelp_review_url
      )
      from public.business_settings s
      where s.business_id = b.id
    ),
    'service_groups', (
      select coalesce(jsonb_agg(
        jsonb_build_object(
          'id', g.id, 'name', g.name,
          'sort_order', g.sort_order, 'max_select', g.max_select
        ) order by g.sort_order, g.name
      ), '[]'::jsonb)
      from public.service_groups g
      where g.business_id = b.id
    ),
    'services', (
      select coalesce(jsonb_agg(
        jsonb_build_object(
          'id', sv.id, 'name', sv.name, 'description', sv.description,
          'price', sv.price, 'duration_minutes', sv.duration_minutes,
          'vehicle_size_adjustments', sv.vehicle_size_adjustments,
          'group_label', sv.group_label, 'group_id', sv.group_id,
          'price_is_from', sv.price_is_from, 'features', sv.features,
          'notes', sv.notes, 'sort_order', sv.sort_order
        ) order by sv.sort_order, sv.name
      ), '[]'::jsonb)
      from public.services sv
      where sv.business_id = b.id and sv.is_active
    ),
    'add_ons', (
      select coalesce(jsonb_agg(
        jsonb_build_object(
          'id', a.id, 'name', a.name, 'description', a.description,
          'price', a.price, 'duration_minutes', a.duration_minutes,
          'features', a.features, 'notes', a.notes, 'sort_order', a.sort_order
        ) order by a.sort_order, a.name
      ), '[]'::jsonb)
      from public.add_ons a
      where a.business_id = b.id and a.is_active
    ),
    'hours', (
      select coalesce(jsonb_agg(
        jsonb_build_object(
          'weekday', h.weekday, 'open_time', h.open_time, 'close_time', h.close_time
        ) order by h.weekday
      ), '[]'::jsonb)
      from public.business_hours h
      where h.business_id = b.id
    ),
    'testimonials', (
      select coalesce(jsonb_agg(
        jsonb_build_object(
          'author', t.author, 'quote', t.quote, 'rating', t.rating,
          'source', t.source, 'sort_order', t.sort_order
        ) order by t.sort_order
      ), '[]'::jsonb)
      from public.testimonials t
      where t.business_id = b.id and t.is_active
    ),
    'gallery', (
      select coalesce(jsonb_agg(
        jsonb_build_object(
          'kind', g.kind, 'image_url', g.image_url, 'before_url', g.before_url,
          'after_url', g.after_url, 'caption', g.caption, 'sort_order', g.sort_order
        ) order by g.sort_order
      ), '[]'::jsonb)
      from public.gallery_images g
      where g.business_id = b.id and g.is_active
    )
  )
  from public.businesses b
  where b.slug = p_slug and b.status = 'active';
$$;

grant execute on function public.get_public_business_profile(text) to anon, authenticated, service_role;
