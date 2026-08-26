-- Phase 2 cleanup + photo storage.
--
-- 1. Monthly plans are removed entirely: they were a permanent discount with
--    no billing behind them. The pricing engine no longer knows about them.
-- 2. The referral/loyalty system is removed: it had zero rows live and
--    redemption was manual.
-- 3. A Supabase Storage bucket for business photos (gallery, logos, hero
--    images), with policies that scope every object to a business by path
--    prefix: <business_id>/... — an owner can only manage files under their
--    own business's folder; anyone can view (the public site needs to show
--    gallery images).

-- 1. Monthly plans out.
alter table public.bookings drop column if exists monthly_plan_id;
alter table public.bookings drop column if exists monthly_plan_discount;
drop table if exists public.monthly_plans;

-- 2. Referrals out.
alter table public.bookings  drop column if exists referral_code_used;
alter table public.customers drop column if exists referral_code;
alter table public.customers drop column if exists loyalty_reward_eligible;

-- 3. Photo storage. Public-read bucket; writes scoped per business by the
--    first path segment (the business UUID).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'business-media', 'business-media', true,
  10 * 1024 * 1024,  -- 10 MB per file
  array['image/jpeg','image/png','image/webp','image/gif','image/avif']
)
on conflict (id) do nothing;

create policy "business media public read"
  on storage.objects for select
  using (bucket_id = 'business-media');

create policy "business media owner insert"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'business-media'
    and (storage.foldername(name))[1] in (select public.current_business_ids()::text)
  );

create policy "business media owner update"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'business-media'
    and (storage.foldername(name))[1] in (select public.current_business_ids()::text)
  );

create policy "business media owner delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'business-media'
    and (storage.foldername(name))[1] in (select public.current_business_ids()::text)
  );
