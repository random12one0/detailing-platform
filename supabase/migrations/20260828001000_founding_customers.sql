-- Founding customers, counted instead of claimed.
-- ---------------------------------------------------------------------
-- The landing page offers founding pricing to the first N accounts. That
-- promise was a number typed into a config file, which is fine right up
-- until it is wrong: the page would keep saying "3 left" after three
-- people had signed, or keep the offer alive after it closed.
--
-- So the count comes from the accounts themselves. A founding account is
-- one whose businesses.plan_tier = 'founding'; the cap lives in a
-- single-row settings table. A churned account releases its spot — the
-- price is locked for the life of an account, not beyond it.
--
-- Only a number is ever exposed. founding_spots_left() is SECURITY
-- DEFINER so an anonymous visitor can read the remaining count without
-- being able to see a single row of businesses.

create table public.platform_settings (
  id             boolean primary key default true check (id),
  founding_total integer not null default 3 check (founding_total >= 0),
  updated_at     timestamptz not null default now()
);

insert into public.platform_settings (id) values (true)
  on conflict (id) do nothing;

alter table public.platform_settings enable row level security;
-- Deliberately no policies: nothing reads this table directly. The owner
-- changes the cap with the service role; visitors get the derived count
-- from the function below.

create trigger platform_settings_updated_at
  before update on public.platform_settings
  for each row execute function public.set_updated_at();

create or replace function public.founding_spots_left()
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select greatest(
    0,
    coalesce((select founding_total from public.platform_settings limit 1), 0)
      - (select count(*) from public.businesses
          where plan_tier = 'founding' and status <> 'churned')
  )::integer;
$$;

revoke all on function public.founding_spots_left() from public;
grant execute on function public.founding_spots_left() to anon, authenticated;

comment on function public.founding_spots_left() is
  'Remaining founding-customer spots. Safe for anonymous callers: returns a count, never a row.';
