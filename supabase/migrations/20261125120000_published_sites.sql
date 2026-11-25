-- PUBLISHED SITES (issue #4): a paying detailer's website goes live on their own address.
-- Reviewed and trimmed from docs/studio/S8-planned-migration.sql (that draft needed a `checks` table this database
-- does not have, and trusted the spec's own slug).
--
-- Who writes: only the Studio, with the service role. RLS is on and forced; there are NO insert/update/delete policies,
-- and the anon/authenticated roles have their write privileges revoked as well (belt and braces).
-- Who reads: a business's owner and staff can read their own site, revisions and releases. The public reads exactly one
-- thing, get_published_site_by_host(host), below.
--
-- Tenant isolation, three layers:
--   1. a revision's spec must name the business's own slug (a spec binds to a slug and the page reads that business's
--      live profile, so a spec naming another slug would show another business's data on this address);
--   2. a release can only go live from a revision of the same site, with the same spec hash;
--   3. the public function answers only for a VERIFIED address of THIS business, listed in the release's hosts,
--      for an ACTIVE business with an ACTIVE website subscription, and returns the spec only (bindings and
--      words, never a price, hour, phone or review; those are read live from the business's public profile).

create table public.sites (
  id              uuid primary key default gen_random_uuid(),
  business_id     uuid not null unique references public.businesses (id) on delete cascade,
  live_release_id uuid,
  created_at      timestamptz not null default now()
);

create table public.revisions (
  id         uuid primary key default gen_random_uuid(),
  site_id    uuid not null references public.sites (id) on delete cascade,
  n          integer not null check (n >= 1),
  spec       jsonb not null check (jsonb_typeof(spec) = 'object' and pg_column_size(spec) < 200000),
  spec_hash  text not null check (spec_hash ~ '^[0-9a-f]{16,64}$'),
  note       text,
  created_at timestamptz not null default now(),
  unique (site_id, n)
);
create index revisions_site_hash_idx on public.revisions (site_id, spec_hash);

create table public.releases (
  id               uuid primary key default gen_random_uuid(),
  site_id          uuid not null references public.sites (id) on delete cascade,
  n                integer not null check (n >= 1),
  revision_id      uuid not null references public.revisions (id),
  spec_hash        text not null,
  renderer_version text not null default 'unknown',
  approval         jsonb not null check (approval ? 'by'),   -- {by:'detailer', at} | {by:'you', why, at}
  hosts            text[] not null check (cardinality(hosts) >= 1),
  published_at     timestamptz not null default now(),
  published_by     text not null default 'studio',
  previous_id      uuid references public.releases (id),
  rolled_back_at   timestamptz,                               -- the ONLY column that may change after insert
  unique (site_id, n)
);
create index releases_site_idx on public.releases (site_id, n desc);

alter table public.sites add constraint sites_live_release_fk foreign key (live_release_id) references public.releases (id);

-- n is handed out by the database, one more than the site's highest, so two Studios cannot collide.
create or replace function public.site_rows_number() returns trigger
language plpgsql as $$
begin
  if tg_table_name = 'revisions' then
    select coalesce(max(n), 0) + 1 into new.n from public.revisions where site_id = new.site_id;
  else
    select coalesce(max(n), 0) + 1 into new.n from public.releases where site_id = new.site_id;
  end if;
  return new;
end $$;
create trigger revisions_number before insert on public.revisions for each row execute function public.site_rows_number();
create trigger releases_number  before insert on public.releases  for each row execute function public.site_rows_number();

-- Layer 1: the spec names this business's own slug.
create or replace function public.revisions_own_slug() returns trigger
language plpgsql as $$
begin
  if tg_op = 'UPDATE' then
    if pg_trigger_depth() > 1 then return new; end if;
    raise exception 'A revision cannot be changed.' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.sites s join public.businesses b on b.id = s.business_id
                  where s.id = new.site_id and b.slug = new.spec ->> 'slug') then
    raise exception 'The spec must name this business''s own slug.' using errcode = 'P0001';
  end if;
  return new;
end $$;
create trigger revisions_own_slug before insert or update on public.revisions
  for each row execute function public.revisions_own_slug();

create or replace function public.revisions_no_delete() returns trigger
language plpgsql as $$
begin
  if pg_trigger_depth() > 1 then return old; end if;   -- only a cascade from the site being deleted
  raise exception 'A revision cannot be removed.' using errcode = 'P0001';
end $$;
create trigger revisions_no_delete before delete on public.revisions
  for each row execute function public.revisions_no_delete();

-- Layer 2: a release is a record. It must use a revision of its own site, with the revision's exact hash. Nothing
-- about it changes afterwards except, once, rolled_back_at (null -> a time).
create or replace function public.releases_guard() returns trigger
language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    if not exists (select 1 from public.revisions rv where rv.id = new.revision_id and rv.site_id = new.site_id and rv.spec_hash = new.spec_hash) then
      raise exception 'A release must use a revision of its own site, with the same hash.' using errcode = 'P0001';
    end if;
    new.hosts := (select coalesce(array_agg(lower(h)), '{}') from unnest(new.hosts) h);
    return new;
  end if;
  if tg_op = 'DELETE' then
    if pg_trigger_depth() > 1 then return old; end if;   -- only a cascade from the site being deleted
    raise exception 'A release cannot be removed.' using errcode = 'P0001';
  end if;
  if old.rolled_back_at is not null or new.rolled_back_at is null
     or (to_jsonb(new) - 'rolled_back_at') is distinct from (to_jsonb(old) - 'rolled_back_at') then
    raise exception 'A release cannot be changed; only marked rolled back, once.' using errcode = 'P0001';
  end if;
  return new;
end $$;
create trigger releases_guard before insert or update or delete on public.releases
  for each row execute function public.releases_guard();

-- The live release must belong to the site, not be rolled back, and match its revision exactly.
create or replace function public.sites_live_release_ok() returns trigger
language plpgsql as $$
begin
  if new.live_release_id is not null and not exists (
    select 1 from public.releases rl join public.revisions rv on rv.id = rl.revision_id
     where rl.id = new.live_release_id and rl.site_id = new.id and rl.rolled_back_at is null and rv.spec_hash = rl.spec_hash) then
    raise exception 'The live release must be one of this site''s, not rolled back, and match its revision.' using errcode = 'P0001';
  end if;
  return new;
end $$;
create trigger sites_live_release before insert or update of live_release_id on public.sites
  for each row execute function public.sites_live_release_ok();

-- RLS: on and forced; members read their own; nobody but the service role writes.
alter table public.sites     enable row level security;
alter table public.revisions enable row level security;
alter table public.releases  enable row level security;
alter table public.sites     force row level security;
alter table public.revisions force row level security;
alter table public.releases  force row level security;
create policy sites_member_select on public.sites for select to authenticated
  using (business_id in (select public.current_business_ids()));
create policy revisions_member_select on public.revisions for select to authenticated
  using (site_id in (select id from public.sites where business_id in (select public.current_business_ids())));
create policy releases_member_select on public.releases for select to authenticated
  using (site_id in (select id from public.sites where business_id in (select public.current_business_ids())));
revoke all on public.sites, public.revisions, public.releases from anon;
revoke insert, update, delete, truncate on public.sites, public.revisions, public.releases from authenticated;

-- Layer 3: what a detailer's own address serves at "/". Same host normalising as get_public_business_profile_by_host:
-- lower case, no port, no leading "www.".
create or replace function public.get_published_site_by_host(p_host text)
returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('spec', rv.spec, 'release', rl.n, 'revision', rv.n)
    from public.business_domains d
    join public.businesses b on b.id = d.business_id and b.status = 'active'
    join public.platform_subscriptions ps on ps.business_id = b.id and ps.plan = 'website' and ps.status = 'active'
    join public.sites s on s.business_id = b.id
    join public.releases rl on rl.id = s.live_release_id and rl.rolled_back_at is null
    join public.revisions rv on rv.id = rl.revision_id and rv.spec_hash = rl.spec_hash and rv.spec ->> 'slug' = b.slug
   where d.verified_at is not null
     and d.domain = regexp_replace(regexp_replace(lower(coalesce(p_host, '')), ':\d+$', ''), '^www\.', '')
     and d.domain = any (rl.hosts)
   limit 1
$$;
revoke all on function public.get_published_site_by_host(text) from public;
grant execute on function public.get_published_site_by_host(text) to anon, authenticated, service_role;
