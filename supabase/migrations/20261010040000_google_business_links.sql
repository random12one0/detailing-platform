-- ROADMAP 99.1 — one row per business that has tried to link a Google
-- Business profile. Written only by the google-business edge function under the
-- service role, and read only through it: no grant to authenticated or anon, so
-- a member's browser cannot see or change the link directly.
--
-- No token column yet. Nothing here talks to Google (the business.manage scope
-- is behind ROADMAP 0.15); the synchronization migration adds its own.

create table if not exists public.google_business_links (
  business_id   uuid primary key references public.businesses(id) on delete cascade,
  state         text not null check (state in ('connected', 'refused', 'broken')),
  account_label text,
  connected_at  timestamptz,
  last_error_at timestamptz,
  updated_at    timestamptz not null default now()
);

comment on table public.google_business_links is
  'Google Business link, one row per business. Service role only; see 20261010040000.';

alter table public.google_business_links enable row level security;
revoke all on public.google_business_links from authenticated, anon;
