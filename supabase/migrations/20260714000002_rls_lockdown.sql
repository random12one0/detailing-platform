-- Row-Level Security lockdown (applied live + verified this session; recorded here
-- so the repo matches the database).
--
-- Model:
--   * anon (public site) may READ only public catalog/marketing tables.
--   * All customer/financial data is admin-only (authenticated + active admin).
--   * Edge functions use the service role (bypasses RLS) for public booking
--     creation, availability, and the receipt lookup.
-- This migration also drops the legacy wide-open scaffolding policies that granted
-- anon/public read/insert/update/delete on private tables.

-- Helper: is the current authenticated user an active admin? SECURITY DEFINER so it
-- can read admin_users regardless of that table's own RLS (avoids recursion).
CREATE OR REPLACE FUNCTION public.is_active_admin()
  RETURNS boolean
  LANGUAGE sql
  SECURITY DEFINER
  STABLE
  SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users a
    WHERE a.id = auth.uid() AND COALESCE(a.is_active, false)
  );
$$;

DO $$
DECLARE
  pub text[] := ARRAY['packages','add_ons','monthly_plans','business_info','business_hours',
                      'gallery_images','testimonials','blockout_dates','dropoff_only_periods',
                      'booking_hours_overrides'];
  adm text[] := ARRAY['bookings','customers','booking_line_items','booking_add_ons',
                      'expenses','promo_codes','referrals'];
  t text;
  legacy text[] := ARRAY[
    'add_ons|anon insert add_ons','add_ons|anon select add_ons',
    'admin_users|anon select active admin_users by id',
    'blockout_dates|anon insert blockout_dates','blockout_dates|anon select blockout_dates',
    'booking_add_ons|anon insert booking_add_ons','booking_add_ons|anon select booking_add_ons',
    'booking_hours_overrides|anon insert booking_hours_overrides','booking_hours_overrides|anon select booking_hours_overrides',
    'bookings|Allow anonymous inserts for testing','bookings|Allow authenticated read on bookings',
    'bookings|Allow authenticated update on bookings','bookings|Allow public insert on bookings',
    'bookings|Allow public to delete bookings','bookings|Allow public to read bookings',
    'bookings|Allow public to update bookings','bookings|anon insert bookings','bookings|anon select bookings',
    'customers|Allow public to delete customers','customers|anon insert customers','customers|anon select customers',
    'dropoff_only_periods|anon insert dropoff_only_periods','dropoff_only_periods|anon select dropoff_only_periods',
    'expenses|anon insert expenses','expenses|anon select expenses',
    'packages|Allow public read access to packages','packages|anon insert packages','packages|anon select packages',
    'promo_codes|anon insert promo_codes','promo_codes|anon select promo_codes',
    'referrals|anon insert referrals','referrals|anon select referrals'
  ];
  pair text; parts text[];
BEGIN
  -- Drop legacy open policies.
  FOREACH pair IN ARRAY legacy LOOP
    parts := string_to_array(pair, '|');
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', parts[2], parts[1]);
  END LOOP;

  -- Public-read tables: anon + authenticated SELECT; admins write.
  FOREACH t IN ARRAY pub LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t||'_public_read', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO anon, authenticated USING (true)', t||'_public_read', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t||'_admin_write', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (public.is_active_admin()) WITH CHECK (public.is_active_admin())', t||'_admin_write', t);
  END LOOP;

  -- Admin-only tables: no anon; active admins get full access.
  FOREACH t IN ARRAY adm LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t||'_admin_all', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (public.is_active_admin()) WITH CHECK (public.is_active_admin())', t||'_admin_all', t);
  END LOOP;

  -- admin_users: each admin may read only their own row (used by the login guard).
  ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS admin_users_self_read ON public.admin_users;
  CREATE POLICY admin_users_self_read ON public.admin_users FOR SELECT TO authenticated USING (auth.uid() = id);
END $$;
