-- Return the cap alongside the remaining count.
-- ---------------------------------------------------------------------
-- founding_spots_left() gave the page a remainder but not the total, so
-- the landing page still had to carry its own copy of "3" to render
-- "2 of 3 left". Two sources for one number is how a page ends up saying
-- "5 of 3 left" the day the cap changes. One call, both numbers.

drop function if exists public.founding_spots_left();

create or replace function public.founding_offer()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'total', coalesce((select founding_total from public.platform_settings limit 1), 0),
    'left', greatest(
      0,
      coalesce((select founding_total from public.platform_settings limit 1), 0)
        - (select count(*) from public.businesses
            where plan_tier = 'founding' and status <> 'churned')
    )
  );
$$;

revoke all on function public.founding_offer() from public;
grant execute on function public.founding_offer() to anon, authenticated;

comment on function public.founding_offer() is
  'Founding-offer cap and remaining spots. Safe for anonymous callers: two integers, never a row.';
