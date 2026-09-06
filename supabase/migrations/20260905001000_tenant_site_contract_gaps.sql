-- ROADMAP 3.2(b) — the gaps `docs/tenant-site-contract.md` §6 says have to
-- close before a tenant's own website can honour the contract.
--
-- FOUR OF THE EIGHT, and the contract's own sequencing says they are one
-- migration: 6b (FAQ), 6c (payment handles), 6d (closures) and 6h
-- (credentials). Each is a fact a detailer already types, or already could,
-- that the ONE public read surface does not hand a site — so a site that
-- wants to draw it has only one alternative, which is to hard-code it. That
-- is the exact failure the contract exists to prevent: a lapsed certification
-- or a stale phone number then lives in a client's HTML where nothing in this
-- repo can ever see it.
--
-- WHAT IS DELIBERATELY NOT HERE:
--   * 6a, every customer-facing URL coming from one global `PLATFORM_URL`.
--     That is roadmap 3.3 and is a build of its own.
--   * 6f, `businesses.contact_email`. It is a QUESTION for the owner rather
--     than work — publishing an email address in public JSON is a scraping
--     decision, not a schema one — and it is parked in
--     `docs/overnight-log.md`.
--   * 6g, campaign links. The contract's own conclusion: a site writing rows
--     that no screen reads is the half-feature §6g was right to refuse. The
--     reading screen is roadmap 4.2.
--
-- AND THE ONE THING THIS MIGRATION TAKES AWAY (6e). `business_branding`'s
-- `social_google` and `social_yelp` are DEAD COLUMNS THAT SHADOW LIVE ONES:
-- the settings row carries `google_review_url` / `yelp_review_url`, that pair
-- is what the emails, the dashboard and this RPC actually use, and
-- `BusinessInfo.jsx` has state and save code for the branding pair with NO
-- INPUT — so they have only ever been written empty. Measured before
-- dropping, not assumed: all six `business_branding` rows have null in both.
-- **A shadowing column is worse than a missing one**, because the next
-- session to need "the Google review link" reads whichever it finds first and
-- gets a page that silently shows nothing.

-- ---------------------------------------------------------------------------
-- 1. Credentials and trust markers — contract §6h, research §4c.
-- ---------------------------------------------------------------------------
-- Five of the six real detailers studied lead with some of *licensed and
-- insured*, *certified Ceramic Pro installer*, *IDA certified*, *est. 1993*,
-- *manufacturer warranties*. The schema held none of it.
--
-- jsonb for the same reason as `faqs`, `travel_zones` and `vehicle_sizes`: the
-- list is small, ordered, entirely tenant-defined, and nothing will ever point
-- a foreign key at one badge. A table buys referential integrity nothing needs
-- and costs a join on the public profile read.
alter table public.business_branding
  -- [{ label, detail?, year? }] — the detailer's own words. `label` is the
  -- badge ("Licensed & insured"), `detail` the line under it if they want one,
  -- `year` the date it applies from.
  add column if not exists credentials jsonb not null default '[]'::jsonb;

comment on column public.business_branding.credentials is
  'Roadmap 3.2(b), contract 6h: [{ label, detail?, year? }]. Trust markers a '
  'tenant site prints — licensed and insured, a certification, a warranty. '
  'Typed by the detailer, never generated, because a certification the '
  'product invented is a claim it cannot substantiate.';

-- ---------------------------------------------------------------------------
-- 2. How long they have been doing this — contract §6h's other half.
-- ---------------------------------------------------------------------------
-- Its own column rather than a credential entry, because "since 2016" is a
-- fact about the BUSINESS that a site puts in a masthead, an about paragraph
-- and a footer, and reading it out of a list means three places agreeing on
-- which entry it is.
alter table public.businesses
  add column if not exists established_year int
    check (established_year is null or established_year between 1900 and 2100);

comment on column public.businesses.established_year is
  'Roadmap 3.2(b), contract 6h. The year the business started. Public: a '
  'tenant site prints it as "since YYYY" or "N years".';

-- ---------------------------------------------------------------------------
-- 3. The two dead branding columns — contract §6e.
-- ---------------------------------------------------------------------------
-- Null on every row in the product at the time of writing. `if exists` so a
-- database that has already lost them is not a failed migration.
alter table public.business_branding
  drop column if exists social_google,
  drop column if exists social_yelp;

-- ---------------------------------------------------------------------------
-- 4. The public profile hands a site the four things it could not draw.
-- ---------------------------------------------------------------------------
-- Everything else in this function is exactly what
-- `20260904004000_plans_customer_half.sql` published; it is restated in full
-- because `create or replace` has no other shape.
--
-- WHAT IS NEW, and each one is the answer to "what silently stops working if
-- the site omits it" (contract §2):
--   * `business.established_year` — §6h.
--   * `settings.faqs` / `faq_enabled` — §6b. The flag is separate from an
--     empty list on purpose: "I have not written any yet" and "I do not want
--     this section" are two different answers.
--   * `settings.pay_*` — §6c. These already reach a CUSTOMER, in an email, so
--     nothing about publishing them is new; a site's "how to pay" section
--     simply could not read them.
--   * `closures` — §6d, and it is the only one of the four where omitting it
--     breaks NOTHING: `available-slots` already applies these server-side, so
--     booking stays correct either way. What a site cannot do without them is
--     SAY "closed the week of the 4th" rather than leaving a customer to
--     discover it in the date picker.
--     UPCOMING ONLY, and capped. A public payload has no business carrying
--     five years of past holidays, and a `repeat` rule is not resolved here —
--     the site prints what it is given and `available-slots` remains the only
--     thing that decides whether a day is bookable.
--   * `credentials` rides along for free: the branding key is
--     `to_jsonb(br)` minus two columns, so a new column is published by
--     existing. That is also why dropping the two dead ones above removes
--     them from every site's payload with no further edit.
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
      'service_area', b.service_area,
      'established_year', b.established_year
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
        'pay_other', s.pay_other
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
$$;

grant execute on function public.get_public_business_profile(text) to anon, authenticated, service_role;
