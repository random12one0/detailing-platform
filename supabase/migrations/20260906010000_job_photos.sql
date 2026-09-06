-- Before-and-after photos, attached to the JOB.
--
-- `docs/detailer-dashboard-audit-2026-09-06.md` §3.1 — the biggest gap in the
-- detailer's dashboard. `gallery_images` is the MARKETING gallery for the
-- public site; there has never been anywhere to put the car in front of you.
-- It is the most-recommended habit in this trade, it ends "that scratch was
-- already there", and it feeds the marketing gallery for free.
--
-- ---------------------------------------------------------------------------
-- ITS OWN BUCKET, AND BOTH DIFFERENCES FROM `business-media` ARE THE POINT.
--
-- 1. **PRIVATE, NOT PUBLIC-READ.** `business-media` is public because a logo
--    and a hero image are ON the booking page. A before-photo is a stranger's
--    car in their own driveway, often with the house behind it, and a
--    public-read bucket means that URL is readable by anyone who ever sees it.
--    These are served through signed URLs that expire. **Publishing one to
--    the marketing gallery COPIES it into `business-media`** rather than
--    making the private one public — an explicit act, on one photo, by
--    somebody who chose it.
--
-- 2. **ANY MEMBER MAY WRITE, not just `settings`.** `business-media` was
--    narrowed to the `settings` permission in
--    `20260904001000_catalog_behind_settings.sql` because a logo is a
--    settings-shaped thing. **Taking a photo of the car is DOING THE JOB**,
--    and the person doing the job is usually staff with no settings
--    permission at all. Gating this the same way would mean the only person
--    who can photograph a car is the one who is not there.
--    Deletes are narrower — see the policy.
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'job-photos', 'job-photos', false,
  10 * 1024 * 1024,   -- the ceiling, not the expectation: the client resizes
                      -- to ~1600px JPEG before upload, which lands at 200-400KB
  array['image/jpeg','image/png','image/webp']
)
on conflict (id) do nothing;

create policy "job photos member read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'job-photos'
    and (storage.foldername(name))[1] in (select public.current_business_ids()::text)
  );

create policy "job photos member insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'job-photos'
    and (storage.foldername(name))[1] in (select public.current_business_ids()::text)
  );

-- DELETE IS NARROWER THAN INSERT, deliberately. A photo is evidence — of the
-- state a car arrived in, and of the work done. Anybody on the job may add
-- one; removing one is a settings-permission act, which in practice means the
-- owner. This is the one asymmetry in the product's permission model and it
-- is here on purpose.
create policy "job photos settings delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'job-photos'
    and (storage.foldername(name))[1] in (select public.business_ids_with_permission('settings')::text)
  );

-- ---------------------------------------------------------------------------
-- The row. The file lives in storage; this is what the product knows about it.
-- ---------------------------------------------------------------------------
create table if not exists public.job_photos (
  id            uuid primary key default gen_random_uuid(),
  business_id   uuid not null references public.businesses(id) on delete cascade,
  booking_id    uuid not null references public.bookings(id) on delete cascade,
  -- BEFORE, AFTER, or a DAMAGE note. The third is not a nicety: "that scratch
  -- was already there" is the conversation this feature exists to end, and a
  -- detailer needs to find that photo later without scrolling a job.
  kind          text not null check (kind in ('before', 'after', 'damage')),
  path          text not null unique,
  bytes         integer not null check (bytes > 0),
  width         integer,
  height        integer,
  caption       text,
  -- Set when this photo has been copied into the public marketing gallery, so
  -- the same photo is never published twice and the job record can say so.
  gallery_id    uuid references public.gallery_images(id) on delete set null,
  created_at    timestamptz not null default now(),
  created_by    uuid references auth.users(id) on delete set null
);

create index if not exists job_photos_booking_idx on public.job_photos (booking_id, kind, created_at);
create index if not exists job_photos_business_idx on public.job_photos (business_id, created_at desc);

alter table public.job_photos enable row level security;

create policy "job photos select" on public.job_photos
  for select to authenticated
  using (business_id in (select public.current_business_ids()));

create policy "job photos insert" on public.job_photos
  for insert to authenticated
  with check (business_id in (select public.current_business_ids()));

create policy "job photos update" on public.job_photos
  for update to authenticated
  using (business_id in (select public.current_business_ids()));

-- Same asymmetry as the file: adding is doing the job, removing is not.
create policy "job photos delete" on public.job_photos
  for delete to authenticated
  using (business_id in (select public.business_ids_with_permission('settings')));

-- ---------------------------------------------------------------------------
-- THE BUDGET. The owner's own condition: "implement it without going over our
-- limit."
--
-- Supabase's free plan is 1 GB of storage in total, across every tenant. A
-- phone photo is 3-5 MB, so an unguarded feature fills the whole plan in a few
-- hundred photos and the failure lands on a detailer mid-job. Two things stop
-- that, and the first matters more than the second:
--
--   1. THE CLIENT RESIZES BEFORE IT UPLOADS — ~1600px, JPEG quality 0.8,
--      which turns a 4 MB photo into 200-400 KB. That is a 10x multiplier on
--      every limit below and it costs nothing.
--   2. This cap, which is per business and is READ FROM `platform_settings`
--      so it can be raised from the back office without a deploy.
--
-- 250 MB at ~300 KB a photo is roughly 800 photos, or 200 jobs photographed
-- four ways — a year for a working detailer. Four tenants fit inside the free
-- plan at the cap; in practice nobody reaches it.
--
-- It returns the numbers rather than raising, because the screen needs to say
-- "you are at 80%" long before it needs to say no.
-- ---------------------------------------------------------------------------
create or replace function public.job_photo_budget(p_business uuid)
returns table (used_bytes bigint, cap_bytes bigint, photos integer)
language sql stable security definer set search_path = public as $$
  select
    coalesce(sum(p.bytes), 0)::bigint,
    coalesce(
      (select (s.prices -> 'photoCapMb')::int from public.platform_settings s limit 1),
      250
    )::bigint * 1024 * 1024,
    count(*)::int
  from public.job_photos p
  where p.business_id = p_business
    and p_business in (select public.current_business_ids());
$$;

grant execute on function public.job_photo_budget(uuid) to authenticated;
