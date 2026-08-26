-- Phase 1 helper functions:
--  * timezone conversion driven by the business's timezone column
--  * buffer-aware slot availability check reading business_settings
--  * the slug-scoped public profile RPC — the ONLY thing anon can call.

-- Converts a business-local wall-clock time to an absolute instant using
-- that business's timezone column. This is the seam that replaces the old
-- hardcoded 'America/Los_Angeles' constant.
create or replace function public.business_local_to_utc(p_business_id uuid, p_local timestamp)
returns timestamptz
language sql
stable
as $$
  select p_local at time zone (select timezone from public.businesses where id = p_business_id);
$$;

create or replace function public.utc_to_business_local(p_business_id uuid, p_at timestamptz)
returns timestamp
language sql
stable
as $$
  select p_at at time zone (select timezone from public.businesses where id = p_business_id);
$$;

-- True if the proposed window is clear of every live booking for the
-- business, including that business's own buffer_minutes on both sides
-- (matching the old symmetric-buffer behavior). SECURITY INVOKER on
-- purpose: RLS still applies to the bookings read, so this cannot be used
-- to probe another tenant's calendar (the old check_booking_conflict was
-- dropped for exactly that leak).
create or replace function public.is_slot_available(
  p_business_id uuid,
  p_start timestamptz,
  p_end timestamptz
)
returns boolean
language sql
stable
as $$
  with cfg as (
    select coalesce(
      (select buffer_minutes from public.business_settings where business_id = p_business_id),
      60
    ) as buf
  )
  select not exists (
    select 1
    from public.bookings b, cfg
    where b.business_id = p_business_id
      and b.status <> 'cancelled'
      and b.deleted_at is null
      and tstzrange(
            b.start_at - make_interval(mins => cfg.buf),
            b.end_at   + make_interval(mins => cfg.buf),
            '[]'
          ) && tstzrange(p_start, p_end, '[]')
  );
$$;

revoke execute on function public.is_slot_available(uuid, timestamptz, timestamptz) from public, anon;
revoke execute on function public.business_local_to_utc(uuid, timestamp) from public, anon;
revoke execute on function public.utc_to_business_local(uuid, timestamptz) from public, anon;
grant execute on function public.is_slot_available(uuid, timestamptz, timestamptz) to authenticated, service_role;
grant execute on function public.business_local_to_utc(uuid, timestamp) to authenticated, service_role;
grant execute on function public.utc_to_business_local(uuid, timestamptz) to authenticated, service_role;

-- Everything a public booking page needs for ONE business, resolved by
-- slug server-side. SECURITY DEFINER because anon has no table policies at
-- all; the function only ever returns rows for the single slug requested,
-- only public-safe columns, and only for active businesses. Anonymous
-- visitors cannot enumerate other tenants: there is no listing path, and
-- an unknown slug returns NULL.
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
      'timezone', b.timezone
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
        'slot_interval_minutes', s.slot_interval_minutes,
        'google_review_url', s.google_review_url,
        'yelp_review_url', s.yelp_review_url
      )
      from public.business_settings s
      where s.business_id = b.id
    ),
    'services', (
      select coalesce(jsonb_agg(
        jsonb_build_object(
          'id', sv.id, 'name', sv.name, 'description', sv.description,
          'price', sv.price, 'duration_minutes', sv.duration_minutes,
          'vehicle_size_adjustments', sv.vehicle_size_adjustments,
          'group_label', sv.group_label, 'features', sv.features,
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
