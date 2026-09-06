-- ROADMAP 4.4 — the platform owner's own back office.
--
-- Specified in `docs/platform-admin-2026-09-04.md`, written after he asked for
-- it and asked to be educated about it. Its one sentence: **a back office
-- exists to answer questions you are currently answering by opening the
-- database** — so the test for everything here is what he would otherwise do
-- by hand, at 11pm, with a SQL query, while a detailer waits on a text.
--
-- ===========================================================================
-- THE DECISION THAT MATTERS MOST, AND IT IS ABOUT WHAT IS *NOT* IN THIS FILE:
-- **NO ROW-LEVEL SECURITY POLICY ANYWHERE GAINS AN "OR A PLATFORM ADMIN"
-- CLAUSE.**
-- ===========================================================================
--
-- The obvious build is `using (business_id in (...) or public.is_platform_admin())`
-- on the twenty tenant tables, and it would work on the first day. It is
-- refused because **this is the one place in the product where a mistake
-- exposes every tenant at once**, and that shape puts a cross-tenant escape
-- hatch into twenty policies that are otherwise provably per-business — one
-- typo, one copied line, one policy rewritten by a later migration, and a
-- detailer's browser can read somebody else's customers. The blast radius of
-- the wrong version is the whole product.
--
-- Instead: **the admin reads NOTHING through RLS.** Every byte the back office
-- shows comes from the `platform-admin` edge function, running under the
-- service role, which checks this table first. The tenant policies keep saying
-- exactly what they said before — one business, always — and there is
-- literally no path by which a signed-in browser can reach another tenant's
-- rows. `tests/platform-admin.test.mjs` pins that: it asserts that no
-- migration in the repo grants cross-tenant read to `authenticated`.
--
-- The cost is honest and small: the back office cannot use `supabase.from()`
-- and has to go through one function. That is a slightly longer edge function
-- and a permanently smaller attack surface.

-- ---------------------------------------------------------------------------
-- 1. Who is an admin.
-- ---------------------------------------------------------------------------
-- A TABLE, not a role claim in a JWT and not an environment variable, because
-- 4.4's own wording says so and because both alternatives are checked by
-- something other than the database. A claim is signed by GoTrue and can be
-- stale for an hour after it is revoked; an env var is invisible to every
-- query and cannot be audited.
create table if not exists public.platform_admins (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  email      text,
  note       text,
  created_at timestamptz not null default now()
);

alter table public.platform_admins enable row level security;
alter table public.platform_admins force  row level security;

-- NO POLICIES AT ALL, WHICH IS THE POINT. With RLS forced and no policy, the
-- `authenticated` role can neither read nor write this table by any query —
-- so a detailer cannot discover who the admins are, and cannot make
-- themselves one. The service role bypasses RLS, so the edge function reads
-- it and nothing else can. **A table with no policy is not an oversight here;
-- it is the strongest statement available.**
comment on table public.platform_admins is
  'Roadmap 4.4. Who may use the platform back office. RLS is forced and there '
  'are deliberately NO policies: only the service role (the platform-admin '
  'edge function) can read it, so this list is invisible and unwritable from '
  'any browser. Add the first row by hand with the service key.';

-- The SQL-side question, for anything that ever needs to ask it in a policy or
-- a function. Nothing does today, and that is deliberate — see the header.
create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.platform_admins a where a.user_id = auth.uid());
$$;

revoke all on function public.is_platform_admin() from public, anon, authenticated;
grant execute on function public.is_platform_admin() to service_role;

-- ---------------------------------------------------------------------------
-- 2. What an admin did.
-- ---------------------------------------------------------------------------
-- 4.4: *"impersonation logged every time"*. It is the most useful action in
-- the back office and the one that will look worst if it is ever questioned —
-- **if a detailer ever asks "were you looking at my numbers?", he wants a
-- record rather than a memory.**
--
-- EVERY WRITE IS LOGGED, not only impersonation, and that costs nothing. A log
-- that covers one action tells you what somebody did on the day you thought to
-- ask about that action.
create table if not exists public.platform_admin_events (
  id          uuid primary key default gen_random_uuid(),
  admin_id    uuid not null references auth.users(id) on delete cascade,
  admin_email text,
  business_id uuid references public.businesses(id) on delete set null,
  -- The name of the business AS IT WAS, because `business_id` is set to null
  -- when a business is deleted and a log entry that has forgotten its subject
  -- is not a log entry.
  business_name text,
  action      text not null,
  detail      jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

create index platform_admin_events_created_idx  on public.platform_admin_events (created_at desc);
create index platform_admin_events_business_idx on public.platform_admin_events (business_id);

alter table public.platform_admin_events enable row level security;
alter table public.platform_admin_events force  row level security;
-- Same reasoning as above, and one more: an audit log a browser can write is
-- an audit log somebody can forge, and one a browser can DELETE is worse than
-- none. Service role only.

comment on table public.platform_admin_events is
  'Roadmap 4.4. Every write the back office performs, and every impersonation. '
  'Service-role only in both directions: an audit log a browser can write is '
  'one somebody can forge.';

-- ---------------------------------------------------------------------------
-- 3. The owner's own notes on a detailer.
-- ---------------------------------------------------------------------------
-- The spec calls this *"the single cheapest feature here and the one he will
-- use every day"* — *"wants a gallery page"*, *"call back after the 3rd"*.
--
-- ON `businesses` RATHER THAN A TABLE OF ITS OWN, and the reason is the same
-- one `faqs` used: it is one note per business, nothing points at it, and a
-- table would buy referential integrity nothing needs and cost a join on the
-- one screen that reads it.
--
-- **IT IS THE PLATFORM'S NOTE, NOT THE DETAILER'S**, and the detailer must
-- never see it — *"call back, seems unhappy"* read by its subject is the worst
-- possible outcome of this feature. The column is therefore NOT in
-- `get_public_business_profile`, and the dashboard never selects it: the
-- browser's `businesses` policy is `for all`, so a detailer's own
-- `select *` WOULD return it. That is stated here rather than assumed, and
-- `tests/platform-admin.test.mjs` pins that no app query reads it.
alter table public.businesses
  add column if not exists admin_notes_platform text;

comment on column public.businesses.admin_notes_platform is
  'Roadmap 4.4. The PLATFORM owner''s private notes about this detailer. Never '
  'shown to the detailer, never in get_public_business_profile, never selected '
  'by app/src. Not to be confused with bookings.admin_notes, which is the '
  'detailer''s own note on a job.';
