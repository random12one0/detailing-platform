-- Claiming a founding spot, safely.
-- ---------------------------------------------------------------------
-- Signup must not simply believe a client that says "I am founding" —
-- that would let anyone type the query string and take founding pricing
-- forever. And two people signing up at the same moment must not both
-- take the last spot.
--
-- So the decision is made here, in one statement, behind a lock on the
-- single settings row: count what is taken, and only then mark this
-- business. Returns whether the spot was actually granted, which is what
-- the caller should believe rather than its own request.

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
  -- Serialize claims against each other. FOR UPDATE on the single settings
  -- row means the count below cannot be read by two claimants at once.
  select founding_total into v_total
    from public.platform_settings
    limit 1
    for update;

  if v_total is null then
    return false;
  end if;

  select count(*) into v_taken
    from public.businesses
    where plan_tier = 'founding' and status <> 'churned';

  if v_taken >= v_total then
    return false;
  end if;

  update public.businesses
     set plan_tier = 'founding'
   where id = p_business_id
     and plan_tier <> 'founding';   -- never consume two spots for one business

  return found;
end;
$$;

-- Only the service role (the create-business function) may claim. A
-- visitor can still READ the remaining count via founding_offer().
revoke all on function public.claim_founding_spot(uuid) from public, anon, authenticated;
grant execute on function public.claim_founding_spot(uuid) to service_role;

comment on function public.claim_founding_spot(uuid) is
  'Atomically grants founding pricing to a business if a spot remains. Server-side only.';
