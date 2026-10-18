-- ROADMAP 6.1b — a Supabase-SHAPED practice database for `restore-nightly.mjs --fixture`.
-- Built inside the throwaway cluster, dumped with the nightly's own pg_dump flags,
-- then restored and compared. No real data: every value here is made up.
-- It carries what a real nightly carries that can break a restore — the three
-- schemas, an extension in `extensions`, roles named by security rules, foreign
-- keys, a generated column, an empty table — and values that stress the copy
-- format: tabs, newlines, backslashes, accents, NULLs, arrays, JSON.
create schema extensions;
create extension pgcrypto with schema extensions;
create schema auth;
create schema storage;

create table auth.users (
  id uuid primary key default extensions.gen_random_uuid(),
  email text unique,
  raw_user_meta_data jsonb,
  created_at timestamptz not null default '2026-01-01T00:00:00Z'
);
create function auth.uid() returns uuid language sql stable as $$ select null::uuid $$;

create table storage.buckets (id text primary key, name text not null, public boolean default false);
create table storage.objects (
  id uuid primary key default extensions.gen_random_uuid(),
  bucket_id text references storage.buckets(id),
  name text,
  owner uuid,
  metadata jsonb
);

create table public.businesses (
  id uuid primary key default extensions.gen_random_uuid(),
  slug text unique not null,
  name text not null,
  owner_id uuid references auth.users(id)
);
create table public.business_settings (
  business_id uuid primary key references public.businesses(id) on delete cascade,
  settings jsonb not null default '{}'
);
create table public.customers (
  id uuid primary key default extensions.gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  phone text,
  notes text
);
create table public.bookings (
  id uuid primary key default extensions.gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  customer_id uuid references public.customers(id),
  starts_at timestamptz not null,
  price numeric(10,2) not null,
  status text not null check (status in ('pending', 'confirmed', 'cancelled')),
  notes text,
  tags text[],
  price_cents bigint generated always as ((price * 100)::bigint) stored
);
create table public.empty_on_purpose (id int primary key);

alter table public.bookings enable row level security;
create policy "owner reads bookings" on public.bookings for select to authenticated
  using (business_id in (select id from public.businesses where owner_id = auth.uid()));

insert into auth.users (email, raw_user_meta_data)
  select 'owner' || i || '@example.test', jsonb_build_object('name', 'Owner ' || i, 'ñ', 'Ñoño ✓')
  from generate_series(1, 6) i;
insert into public.businesses (slug, name, owner_id)
  select 'shop-' || row_number() over (), 'Shop "' || email || E'"\tTab', id from auth.users;
insert into public.business_settings (business_id, settings)
  select id, jsonb_build_object('deposit', 25, 'note', E'line one\nline two \\ backslash') from public.businesses;
insert into public.customers (business_id, name, phone, notes)
  select b.id, 'Customer ' || i, case when i % 3 = 0 then null else '555-01' || lpad(i::text, 2, '0') end,
         case when i % 4 = 0 then E'gate code \\ 1234\nleft side' end
  from public.businesses b, generate_series(1, 7) i;
insert into public.bookings (business_id, customer_id, starts_at, price, status, notes, tags)
  select c.business_id, c.id, '2026-10-01T15:00:00Z'::timestamptz + (i || ' days')::interval, 89.5 + i,
         (array['pending', 'confirmed', 'cancelled'])[1 + i % 3], 'Booking ' || i || E' — café\tinterior',
         case when i % 2 = 0 then array['ceramic', 'pet hair'] end
  from public.customers c, generate_series(1, 3) i;
insert into storage.buckets values ('job-photos', 'job-photos', false), ('logos', 'logos', true);
insert into storage.objects (bucket_id, name, owner, metadata)
  select case when i % 2 = 0 then 'job-photos' else 'logos' end, 'biz/' || i || '.jpg', null,
         jsonb_build_object('size', 1000 * i, 'mimetype', 'image/jpeg')
  from generate_series(1, 9) i;

-- ROADMAP 97.25 — grants and revokes shaped like the ones the product's security
-- rests on, so the privileges comparison has real targets. Supabase grants every
-- new public table to all three API roles; the migrations then take some back.
grant usage on schema public to anon, authenticated, service_role;
grant all on all tables in schema public to anon, authenticated, service_role;
grant select on storage.objects to authenticated;
-- 20260921000000_revoke_locked_table_grants: a table the browser may not touch.
revoke all on public.business_settings from anon, authenticated;
-- 20260907003000_column_revokes_actually_apply: update only on named columns.
revoke update on public.bookings from authenticated;
grant update (notes, tags) on public.bookings to authenticated;
-- 20260913005000_definer_execute_swept: a security-definer function nobody but the server runs.
create function public.count_bookings() returns bigint language sql security definer
  as $$ select count(*) from public.bookings $$;
revoke execute on function public.count_bookings() from public, anon, authenticated;
grant execute on function public.count_bookings() to service_role;
