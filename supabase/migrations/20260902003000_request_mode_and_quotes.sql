-- Roadmap 2.12 — REQUEST-VS-RESERVE, ACCEPT/DECLINE, AND QUOTES.
--
-- The owner's answer to 2.11's question 5, and then his own clarification of
-- it on 2026-08-31, which is the part that decides the shape of this file:
--
--   "A REQUEST HOLDS THE SLOT." Two customers cannot request the same time.
--   The difference between the two modes is the PROMISE MADE TO THE CUSTOMER,
--   not the mechanics of the calendar. Availability behaves identically.
--
-- That is why the exclusion constraint below is NOT touched. `pending` is not
-- `cancelled`, so `bookings_no_overlap` already refuses a second booking on a
-- requested slot, with no change at all. A session that finds this file and
-- expects to see availability work here should read
-- `docs/dashboard-desktop-spec-2026-08-31.md` §8 — the harder reading was
-- considered and ruled out by him.
--
-- WHY THERE IS NO 'declined' STATUS, and this was a decision rather than an
-- omission. A declined request IS a cancelled booking: the slot frees, the job
-- is not happening, it stays in the history, and Money must not count it. Every
-- one of the twelve places in this codebase that asks `status <> 'cancelled'`
-- is already correct for it. Adding a sixth status would mean editing all
-- twelve to say the same thing twice, and the first one anybody forgot would be
-- a declined request still holding a slot. So a decline is `status =
-- 'cancelled'` plus `declined_at`, which records the one fact 'cancelled' does
-- not carry: the DETAILER ended this, not the customer.

-- --------------------------------------------------------------------------
-- 1. The switch itself.
-- --------------------------------------------------------------------------
alter table public.business_settings
  -- 'reserve'  — booking through the page takes the slot and the customer is
  --              told they are booked. Andrew's own model, and what every
  --              tenant has had baked in until today. It is the DEFAULT
  --              precisely because changing it under an existing business
  --              would change what their customers are promised.
  -- 'request'  — the same slot is taken, and the customer is told they have
  --              ASKED for it. The detailer accepts, declines, or quotes.
  add column booking_mode text not null default 'reserve'
    check (booking_mode in ('reserve', 'request'));

comment on column public.business_settings.booking_mode is
  'Roadmap 2.12: what a booking through the page MEANS. Both modes take the '
  'slot; only the promise to the customer differs.';

-- --------------------------------------------------------------------------
-- 2. The one new booking status, and the decline marker.
-- --------------------------------------------------------------------------
-- Append-only means never EDITING a migration file, not never changing a
-- constraint. The old check is dropped and restated in full here so the whole
-- allowed set is readable in one place rather than assembled from two files.
alter table public.bookings
  drop constraint if exists bookings_status_check;
alter table public.bookings
  add constraint bookings_status_check
  check (status in ('pending', 'confirmed', 'cancelled', 'completed', 'no_show'));

alter table public.bookings
  -- Set when the DETAILER declined a request. `status` goes to 'cancelled' in
  -- the same write, so every existing filter frees the slot and hides the job
  -- without knowing this column exists.
  add column declined_at timestamptz,
  -- THE QUOTE. Three columns, live only while a quote is outstanding: the
  -- customer accepting it moves `quoted_amount` into `total_price` and clears
  -- all three, so there is exactly one number on this row that means "what
  -- this job is sold for" and it is the same column it has always been.
  -- CLAUDE.md's rule — a number PRINTED is not a number CHARGED — is the whole
  -- reason a quote does not write `total_price` when it is SENT.
  add column quoted_amount numeric,
  add column quoted_note text,
  add column quoted_at timestamptz;

comment on column public.bookings.declined_at is
  'Roadmap 2.12: the detailer declined this request. status is cancelled too — '
  'this column is the only thing that distinguishes it from the customer '
  'cancelling.';
comment on column public.bookings.quoted_amount is
  'Roadmap 2.12: a price the detailer has OFFERED and the customer has not yet '
  'accepted. Never charged; accepting moves it to total_price and nulls this.';

-- --------------------------------------------------------------------------
-- 3. The reminder sweep must not chase a job nobody has agreed to.
-- --------------------------------------------------------------------------
-- All four of these said `status <> 'cancelled'`, which was a complete
-- description of "not happening" until five minutes ago. A pending request
-- would now get the customer a "your appointment is tomorrow" email for an
-- appointment the detailer has not accepted, and get the detailer nudged to go
-- and do it. The bodies are otherwise byte-for-byte what
-- 20260827002000_engine_support.sql wrote.
create or replace function public.get_bookings_due_for_reminder(target text)
returns setof public.bookings
language sql
stable
security definer
set search_path = public
as $$
  select b.*
  from public.bookings b
  join public.businesses biz on biz.id = b.business_id
  join public.business_settings s on s.business_id = b.business_id
  where b.status not in ('cancelled', 'pending')
    and b.deleted_at is null
    and b.start_at > now()
    and case
      when target = 'owner' then b.owner_reminder_sent_at is null
      else b.customer_reminder_sent_at is null and b.customer_email is not null
    end
    and now() >= case
      when s.evening_before_enabled
           and (b.start_at at time zone biz.timezone)::time <= s.evening_before_latest_start
      then (((b.start_at at time zone biz.timezone)::date - 1) + s.evening_before_send_time) at time zone biz.timezone
      else b.start_at - make_interval(mins => s.customer_reminder_lead_minutes)
    end;
$$;

create or replace function public.get_bookings_due_for_nudge()
returns setof public.bookings
language sql
stable
security definer
set search_path = public
as $$
  select b.*
  from public.bookings b
  join public.business_settings s on s.business_id = b.business_id
  where b.status not in ('cancelled', 'pending')
    and b.deleted_at is null
    and b.owner_nudge_sent_at is null
    and b.start_at > now()
    and b.start_at <= now() + make_interval(mins => s.owner_nudge_lead_minutes);
$$;

create or replace function public.get_bookings_due_for_wrapup_nudge()
returns setof public.bookings
language sql
stable
security definer
set search_path = public
as $$
  select b.*
  from public.bookings b
  join public.business_settings s on s.business_id = b.business_id
  where b.status not in ('cancelled', 'pending')
    and b.deleted_at is null
    and b.finalized_at is null
    and b.owner_wrapup_nudge_sent_at is null
    and b.end_at > now()
    and b.end_at <= now() + make_interval(mins => s.wrapup_nudge_lead_minutes);
$$;

create or replace function public.get_bookings_due_for_finalize_nudge()
returns setof public.bookings
language sql
stable
security definer
set search_path = public
as $$
  select b.*
  from public.bookings b
  join public.business_settings s on s.business_id = b.business_id
  where b.status not in ('cancelled', 'pending')
    and b.deleted_at is null
    and b.finalized_at is null
    and b.owner_finalize_nudge_sent_at is null
    and b.end_at + make_interval(mins => s.finalize_nudge_delay_minutes) <= now()
    and b.end_at > now() - interval '2 days';  -- don't nag about ancient history
$$;

-- --------------------------------------------------------------------------
-- 4. The booking page has to know which promise it is making.
-- --------------------------------------------------------------------------
-- One key added to `settings`. Everything else in this function is exactly
-- what 20260831004000_pricing_rules_and_travel_zones.sql published; it is
-- restated in full because `create or replace` has no other shape.
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
        'yelp_review_url', s.yelp_review_url,
        -- Roadmap 2.12. The page changes what it PROMISES, never what it
        -- offers: the same times are open either way.
        'booking_mode', s.booking_mode
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
