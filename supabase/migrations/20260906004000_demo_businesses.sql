-- ROADMAP 6.2 — a demo business must not consume a founding spot.
--
-- The roadmap has said so since it was written, and **the product has been
-- breaking it since 2026-09-05**: roadmap 2.20 stage 2 seeded the demo as
-- `plan_tier: 'founding'` on purpose, so the struck founding prices would be
-- the DEFAULT state every width sweep and every screenshot walks — a strike
-- only exists on a founding account, and seeded standard the whole treatment
-- would be measured nowhere. That reasoning is still right.
--
-- **BUT `founding_offer()` COUNTS ROWS, AND THE PUBLIC PAGE PRINTS THE
-- ANSWER.** So the demo takes one of three spots, and `/` and `/pricing` have
-- been telling every visitor **"2 of 3 left"** when three are. Today that is
-- an understatement nobody is harmed by; the day a real detailer takes the
-- second, the page says one is left while two are, and **the scarcity claim
-- becomes a false one** — which is the exact class of statement the pricing
-- work refused to make anywhere else ("no 'most popular': with no customers it
-- is a claim we cannot substantiate").
--
-- THE FIX IS A FLAG RATHER THAN A SLUG. Excluding `'demo-detail'` by name
-- inside a SQL function is a rule that breaks silently the day a second demo
-- exists or the first is renamed — and roadmap 6.1 is a second demo. A column
-- says what the row IS, and every reader can ask.
--
-- AND IT KEEPS BOTH HALVES: the demo is still `plan_tier = 'founding'`, so it
-- still renders the struck prices the sweeps measure, and it simply stops
-- being counted against the cap.
alter table public.businesses
  add column if not exists is_demo boolean not null default false;

comment on column public.businesses.is_demo is
  'A seeded, obviously-fictional business. Excluded from the founding count; never a real customer. Set by scripts/seed-demo.mjs.';

-- ---------------------------------------------------------------------------
-- The two places that count. They must move TOGETHER: a count that excludes
-- demos beside a claim that does not would advertise a spot and then refuse
-- it, which is worse than either being wrong on its own.
-- ---------------------------------------------------------------------------
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
            where plan_tier = 'founding' and status <> 'churned' and not is_demo)
    )
  );
$$;

revoke all on function public.founding_offer() from public;
grant execute on function public.founding_offer() to anon, authenticated;

create or replace function public.claim_founding_spot(p_business_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total integer;
  v_taken integer;
begin
  select founding_total into v_total
    from public.platform_settings
    limit 1
    for update;

  if v_total is null then
    return false;
  end if;

  select count(*) into v_taken
    from public.businesses
    where plan_tier = 'founding' and status <> 'churned' and not is_demo;

  if v_taken >= v_total then
    return false;
  end if;

  update public.businesses
     set plan_tier = 'founding'
   where id = p_business_id
     and plan_tier <> 'founding';

  return found;
end;
$$;

revoke all on function public.claim_founding_spot(uuid) from public, anon, authenticated;
grant execute on function public.claim_founding_spot(uuid) to service_role;

-- A DEMO CANNOT CLAIM ONE EITHER, which is the same rule from the other side:
-- `claim_founding_spot` is how signup grants the tier, and a demo that went
-- through it would be marked founding without being counted — true, and
-- confusing enough that the next reader would "fix" one of the two counts.
-- The seed sets `plan_tier` directly and deliberately.

comment on function public.founding_offer() is
  'Founding-offer cap and remaining spots, ignoring demo businesses. Safe for anonymous callers: two integers, never a row.';
