-- Roadmap 2.14 STEP 3 — THE CUSTOMER'S HALF OF PLANS.
--
-- Step 2 gave the detailer a plan to define and a member to log. This is the
-- other side of the same object: a customer who can SEE the plan on the
-- booking page, press one button per plan, and afterwards reach a page of
-- their own that says what they are on and lets them leave.
--
-- THREE CHANGES, AND EACH ONE IS THE MINIMUM THE FEATURE NEEDS:
--
--   1. `bookings.plan_id` — WHICH PLAN THIS JOB IS AGAINST.
--      `plan_member_id` already existed and is NOT this. It answers "whose
--      ledger does this visit come off", and it is null for the case this
--      step creates: somebody asking to JOIN a plan is not a member yet.
--      Without a second column the request card cannot say "this is a plan
--      booking", and the research is explicit that it has to —
--      *"the detailer needs to SEE that it is a plan booking, or they will
--      quote it as a one-off."*
--
--   2. The auto-link trigger fills BOTH. An existing member booking in the
--      ordinary way gets `plan_id` for free, so the card says the same thing
--      about a member's visit as about a stranger's sign-up. One writer, the
--      same argument the trigger was written under in
--      `20260904002000_plans.sql`: three callers create bookings and a rule
--      living in one of them is a rule the other two break.
--
--   3. `get_public_business_profile` returns `plans`. It is the booking
--      page's only read, and until now it returned no plans at all — the
--      first line of step 3 in the roadmap.
--
-- WHAT IS DELIBERATELY NOT HERE:
--   * NO PRICE ON THE BOOKING FROM THE CLIENT. The plan's effect on the quote
--     is computed in `_shared/pricing.ts` from the plan row the SERVER reads,
--     exactly like travel and the promo. A plan price drawn on the page and
--     not charged by `computeQuote` is the travel-fee defect for the third
--     time, and this migration is the half of that promise that keeps the
--     price out of the request body.
--   * NO CUSTOMER ACCOUNT, NO NEW RLS ROLE. The "your plan" page is reached
--     by the member's own UUID, the pattern `/booking/:id` and 2.12's quote
--     acceptance already use twice, and it is served by an edge function
--     under the service role. `plan_members` stays invisible to `anon`.

-- ---------------------------------------------------------------------------
-- 1. Which plan a booking is against.
-- ---------------------------------------------------------------------------
alter table public.bookings
  add column plan_id uuid references public.plans(id) on delete set null;

create index bookings_plan_idx on public.bookings (plan_id)
  where plan_id is not null;

comment on column public.bookings.plan_id is
  'Roadmap 2.14 step 3: the plan this job was booked under. Set by the plan '
  'button on the booking page (where the customer is asking to JOIN, so '
  'plan_member_id is still null) and by the auto-link trigger for a member '
  'booking in the ordinary way. It is what makes the request card able to say '
  'this is a plan booking rather than a one-off.';

-- ---------------------------------------------------------------------------
-- 2. The auto-link trigger now fills both halves.
-- ---------------------------------------------------------------------------
-- Unchanged in every other respect, including the ceiling stated in the
-- original: a member who books something their plan does not cover has that
-- job counted, because `booking_services` rows are written after the booking.
-- `plan_id` inherits that same ceiling and no new one.
create or replace function public.link_booking_to_plan()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  m_id   uuid;
  m_plan uuid;
begin
  if new.plan_member_id is null and new.customer_id is not null then
    select m.id, m.plan_id into m_id, m_plan
    from public.plan_members m
    where m.business_id = new.business_id
      and m.customer_id = new.customer_id
      and m.status = 'active';
    if m_id is not null then
      new.plan_member_id := m_id;
      -- Only ever FILLS a null. An explicit plan_id — the sign-up button on
      -- the booking page — always wins, and it can legitimately differ from
      -- the plan the customer is currently on if they are switching.
      if new.plan_id is null then new.plan_id := m_plan; end if;
    end if;
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. The public profile carries the plans.
-- ---------------------------------------------------------------------------
-- Everything else in this function is exactly what
-- `20260902003000_request_mode_and_quotes.sql` published; it is restated in
-- full because `create or replace` has no other shape.
--
-- ONLY ACTIVE PLANS, and `is_active` means precisely this and nothing else —
-- the accrual deliberately ignores it (see `accrue_plan_visits()`), because
-- retiring a plan means "no new sign-ups", never "everybody on it stops
-- accruing". This is the one place the flag decides anything.
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
    -- ROADMAP 2.14 STEP 3 — THE ONE NEW KEY.
    -- `price_amount` is here because the page has to PRINT the price the
    -- detailer set; it is never sent back. The quote is computed server-side
    -- from this same row.
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
$$;

grant execute on function public.get_public_business_profile(text) to anon, authenticated, service_role;
