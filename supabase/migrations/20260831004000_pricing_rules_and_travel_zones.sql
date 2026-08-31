-- Roadmap 2.8c — PRICING BY TIME AND BY DISTANCE, and a live money bug fixed
-- on the way past.
--
-- The 2026-08-31 research found that Zenbooker — a field-service booking
-- product sold to mobile detailers — sells three kinds of price adjustment we
-- do not have: by day of week and start time (a weekend or evening
-- surcharge), by how far ahead the job is booked (a rush fee), and by which
-- territory it is in (distance). We had a single flat travel fee.
--
-- THE BUG, FOUND WHILE SCOPING THIS. `business_settings.travel_fee` is
-- PRINTED on the booking page — "+$25" on the "We come to you" card — and
-- `computeQuote` had no travel input at all. It was never in the quoted total
-- and only ever reached the customer as a hand-added line at finalize time.
-- So the page showed a surcharge that the Estimated total did not contain, on
-- a money path. `bookings.travel_fee` below is where the quoted one lands.
--
-- WHY jsonb AND NOT TABLES. Both lists are small (a detailer has one to five
-- of each), ordered, entirely tenant-defined, and never referenced by a
-- foreign key — the same shape as `business_settings.vehicle_sizes` from
-- roadmap 2.8b, and for the same reasons. What a booking needs from them is a
-- SNAPSHOT of what was charged, not a pointer to a row that can later be
-- edited: `price_adjustments` and `travel_zone` below do that, exactly as
-- `vehicle_size_label` does for a renamed vehicle size.
alter table public.business_settings
  -- [{ id, label, kind, weekdays, start_time, end_time, within_hours,
  --    amount, is_percent }]
  --   kind 'time'      — weekdays (null = every day) and an optional time
  --                      window. A Saturday surcharge, or an evening one.
  --   kind 'lead_time' — booked fewer than `within_hours` hours ahead. A rush
  --                      fee. Zenbooker calls it a booking lead time rule.
  add column price_rules jsonb not null default '[]'::jsonb,
  -- [{ key, name, fee }] — the detailer's own travel areas, in their own
  -- words. NOT geocoded distance: we have no way to measure one, and the
  -- customer naming their own area is how small mobile businesses actually do
  -- it. An empty list keeps today's behaviour, where the flat `travel_fee`
  -- applies to every mobile job.
  add column travel_zones jsonb not null default '[]'::jsonb;

alter table public.bookings
  -- What the customer was actually quoted for travel. Snapshotted like
  -- vehicle_size_fee, and for the same reason: a detailer who changes their
  -- travel fee must not rewrite what a past job was sold for.
  add column travel_fee numeric not null default 0,
  add column travel_zone text,
  -- [{ label, amount }] — every surcharge that applied, already resolved to
  -- money. The LABEL is snapshotted too, so a renamed or deleted rule cannot
  -- turn last month's receipt into a blank line.
  add column price_adjustments jsonb;

comment on column public.bookings.price_adjustments is
  'Roadmap 2.8c: resolved [{label, amount}] for every price rule that applied, '
  'snapshotted at booking time so editing a rule never rewrites a past receipt.';

-- The booking page needs the travel zones (the customer picks one) but NOT the
-- price rules: every price on that page comes from calculate-booking, which
-- returns each surcharge already resolved and labelled. Publishing the rules
-- as well would be a second copy to keep in step, and the customer never needs
-- to evaluate one.
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
        'travel_zones', s.travel_zones,
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
          'allows_mobile', sv.allows_mobile, 'allows_dropoff', sv.allows_dropoff,
          'available_weekdays', sv.available_weekdays,
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
