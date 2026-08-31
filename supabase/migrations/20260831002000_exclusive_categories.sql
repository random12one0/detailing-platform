-- Roadmap 2.8c — A CATEGORY THAT IS THE WHOLE BOOKING.
--
-- The owner asked, the same day 2.8b shipped, whether the category system was
-- actually researched and whether it needs a rule where choosing from one
-- category stops you choosing from another. It does, and the research is
-- docs/detailer-menu-shapes-2026-08-31.md.
--
-- THE HOLE, REPRODUCED ON THE RUNNING APP RATHER THAN ARGUED. Oregon Detail
-- Co — a real shop — publishes three categories: Full Detail Packages,
-- Interior Detailing, Exterior Detailing. Built here with each set to
-- "customers pick one", which is the honest way to describe each of them
-- alone, a customer books the $625 complete package PLUS the $320 interior
-- PLUS the $700 exterior. $1,645 for work the first one already contains. The
-- booking page allowed it and create-booking accepted it.
--
-- Nothing was broken: `max_select` counts inside ONE category and there is
-- exactly one service in each. The relation it cannot express lives between
-- categories — a complete package already contains the standalone work.
--
-- WHY NOT PAIRWISE "category A excludes category B", which is the shape the
-- owner described: nothing in this market exposes it (Zenbooker's whole
-- option set is name/description/required/multi-select; Square Appointments
-- has one business-wide "allow multiple services", off by default; Toast has
-- min/max per group and nested modifiers that drill down, never sideways;
-- Thryv DERIVES incompatibility from location/staff/availability and never
-- has the business configure a pair). And six categories would need thirty
-- pairwise decisions to say "one service, please".
--
-- One boolean per category covers all ten menus studied, and off is exactly
-- today's behaviour, so no tenant's booking page changes on migration day.
alter table public.service_groups
  add column is_exclusive boolean not null default false,
  -- Zenbooker's modifier groups carry an optional description and ours had a
  -- name only. It is the one line that explains a category to a customer.
  -- Optional on purpose: it costs step-1 height, which is now the scarce
  -- thing on that screen (see CLAUDE.md § Verification).
  add column description text;

comment on column public.service_groups.is_exclusive is
  'Roadmap 2.8c: picking anything in this category clears every other service. '
  'For a complete package that already contains the standalone work.';

-- The booking page reads ONE RPC, so a new column that never reaches it is a
-- column that does not exist. Same body as the 2.8b version plus is_exclusive
-- and description on each category.
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
          'id', g.id, 'name', g.name, 'description', g.description,
          'sort_order', g.sort_order, 'max_select', g.max_select,
          'is_exclusive', g.is_exclusive
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
