-- ROADMAP 8.13 — THE BOOKING PAGE HAS TO BE TOLD, OR IT CANNOT EXPLAIN.
--
-- `get_public_business_profile` publishes an EXPLICIT key list rather than
-- `to_jsonb(b)`, so a new column is invisible to every booking form in the
-- world until it is named here. That is deliberate — this is the whole public
-- read surface — and it is contract §2's failure shape exactly: the setting
-- saves, the screen works, and the feature reaches nobody.
--
-- **Both fields are published, and `closed_note` is the detailer's own words**,
-- so every surface that draws it escapes it. It is customer-facing text typed
-- by a human, which is the same boundary `campaignEmail` already lives on.
--
-- The body below is the LIVE definition with two lines added; nothing else in
-- it changed.

CREATE OR REPLACE FUNCTION public.get_public_business_profile(p_slug text)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select jsonb_build_object(
    'business', jsonb_build_object(
      'slug', b.slug,
      'name', b.name,
      'timezone', b.timezone,
      'phone', b.contact_phone,
      'dropoff_address', b.dropoff_address,
      'service_area', b.service_area,
      'established_year', b.established_year,
      'closed_until', b.closed_until,
      'closed_note', b.closed_note
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
        'yelp_review_url', s.yelp_review_url,
        'booking_mode', s.booking_mode,
        'faqs', s.faqs,
        'faq_enabled', s.faq_enabled,
        'pay_cash', s.pay_cash,
        'pay_venmo', s.pay_venmo,
        'pay_cashapp', s.pay_cashapp,
        'pay_zelle', s.pay_zelle,
        'pay_paypal', s.pay_paypal,
        'pay_other', s.pay_other,
        'max_vehicles_per_booking', s.max_vehicles_per_booking
      )
      from public.business_settings s
      where s.business_id = b.id
    ),
    'closures', (
      select coalesce(jsonb_agg(c order by sd), '[]'::jsonb)
      from (
        select d.start_date as sd, jsonb_build_object(
          'kind', 'closed',
          'name', d.event_name,
          'start_date', d.start_date,
          'end_date', d.end_date,
          'all_day', d.all_day,
          'start_time', d.start_time,
          'end_time', d.end_time,
          'repeat', d.repeat
        ) as c
        from public.blockout_dates d
        where d.business_id = b.id
          and (d.end_date >= current_date or d.repeat <> 'none')
        union all
        select p.start_date as sd, jsonb_build_object(
          'kind', 'dropoff_only',
          'name', p.reason,
          'start_date', p.start_date,
          'end_date', p.end_date,
          'all_day', p.start_time is null,
          'start_time', p.start_time,
          'end_time', p.end_time,
          'repeat', 'none'
        ) as c
        from public.dropoff_only_periods p
        where p.business_id = b.id
          and coalesce(p.end_date, p.start_date) >= current_date
        order by sd
        limit 60
      ) closures_all
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
    'plans', (
      select coalesce(jsonb_agg(
        jsonb_build_object(
          'id', p.id, 'name', p.name, 'description', p.description,
          'cadence_count', p.cadence_count, 'cadence_unit', p.cadence_unit,
          'visits_per_period', p.visits_per_period,
          'price_kind', p.price_kind, 'price_amount', p.price_amount,
          'term_months', p.term_months,
          'included_service_ids', p.included_service_ids,
          'sort_order', p.sort_order
        ) order by p.sort_order, p.name
      ), '[]'::jsonb)
      from public.plans p
      where p.business_id = b.id and p.is_active
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
$function$
;
