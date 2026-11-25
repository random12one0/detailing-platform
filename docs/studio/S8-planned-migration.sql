-- STUDIO S8: publish. PLANNED, NOT APPLIED. Written 2026-11-07 beside the local version (studio-data/sites/<site>/
-- releases, gates, parity, and studio-data/published.json), which keeps the same fields. Follows S3- and
-- S7-planned-migration.sql. STUDIO-SPEC.md §1e, §2c layer 4, §6b (releases), §6d (serving published sites).
-- To apply it later: copy it into detailing-platform/supabase/migrations/ with the next timestamp, review it with the
-- RLS checks, and push via main. Until then nothing here runs.
--
-- Owners and staff of the business can READ their own releases; writes come only from the Studio's service-role code.
-- The public reads ONE thing: get_published_site_by_host, below, which answers only for a verified address of an
-- active business with an active website subscription, and returns the live release's spec (bindings only: a spec
-- holds no price, hour, service or review; the site reads those live from get_public_business_profile).

-- 'gates' joins the check kinds (the referee's layout, contrast and motion gates at three widths, on one revision).
alter table public.checks drop constraint if exists checks_kind_check;
alter table public.checks add constraint checks_kind_check check (kind in ('quick', 'full', 'connection', 'gates', 'parity'));
-- a parity check is about a release, not a revision being drafted
alter table public.checks add column if not exists release_id uuid;

create table public.releases (
  id               uuid primary key default gen_random_uuid(),
  site_id          uuid not null references public.sites (id) on delete cascade,
  n                integer not null check (n >= 1),
  revision_id      uuid not null references public.revisions (id),
  spec_hash        text not null,                                -- must equal the revision's: what went live is exactly it
  renderer_version text not null,
  check_ids        uuid[] not null,                              -- the passed connection check and gate run on this revision
  approval         jsonb not null check (approval ? 'by'),       -- {by: 'detailer', link_id, at} | {by: 'you', why, at}
  hosts            text[] not null check (cardinality(hosts) >= 1),
  published_at     timestamptz not null default now(),
  published_by     text not null,
  previous_id      uuid references public.releases (id),
  rolled_back_at   timestamptz,                                  -- the ONLY column that may change after insert
  unique (site_id, n)
);
create index releases_site_idx on public.releases (site_id, n desc);

alter table public.sites add column if not exists live_release_id uuid references public.releases (id);
alter table public.checks add constraint checks_release_fk foreign key (release_id) references public.releases (id);

-- A release is a record: nothing about it changes except, once, rolled_back_at (null → a time).
create or replace function public.releases_only_rollback() returns trigger
language plpgsql as $$
begin
  if tg_op = 'DELETE' then
    if pg_trigger_depth() > 1 then return old; end if;   -- a cascade from the site being deleted
    raise exception 'A release cannot be removed.' using errcode = 'P0001';
  end if;
  if old.rolled_back_at is not null or new.rolled_back_at is null
     or (to_jsonb(new) - 'rolled_back_at') is distinct from (to_jsonb(old) - 'rolled_back_at') then
    raise exception 'A release cannot be changed; only marked rolled back, once.' using errcode = 'P0001';
  end if;
  return new;
end $$;
create trigger releases_records before update or delete on public.releases
  for each row execute function public.releases_only_rollback();

-- The live release must belong to the site and match its revision exactly.
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

alter table public.releases enable row level security;
create policy releases_read on public.releases for select
  using (site_id in (select id from public.sites where business_id in (select public.current_business_ids())));
-- no insert / update / delete policies: only the Studio's service-role code writes

-- What a detailer's own address serves at "/" (app/src/site/TenantHome.jsx). The same normalising as
-- get_public_business_profile_by_host: lower case, no port, no leading "www.".
create or replace function public.get_published_site_by_host(p_host text)
returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('spec', rv.spec, 'release', rl.n, 'revision', rv.n)
    from public.business_domains d
    join public.businesses b on b.id = d.business_id and b.status = 'active'
    join public.platform_subscriptions ps on ps.business_id = b.id and ps.plan = 'website' and ps.status = 'active'
    join public.sites s on s.business_id = b.id
    join public.releases rl on rl.id = s.live_release_id and rl.rolled_back_at is null
    join public.revisions rv on rv.id = rl.revision_id and rv.spec_hash = rl.spec_hash
   where d.verified_at is not null
     and d.domain = regexp_replace(regexp_replace(lower(coalesce(p_host, '')), ':\d+$', ''), '^www\.', '')
     and d.domain = any (rl.hosts)
   limit 1
$$;
revoke all on function public.get_published_site_by_host(text) from public;
grant execute on function public.get_published_site_by_host(text) to anon, authenticated;
