-- ROADMAP 8.5 — `claim_founding_spot` CONFLATED TWO ANSWERS, and moving the
-- claim to the moment of payment is what made that matter.
--
-- **THE BUG.** The function ended with:
--
--     update public.businesses set plan_tier = 'founding'
--      where id = p_business_id and plan_tier <> 'founding';
--     return found;
--
-- so a business that ALREADY HOLDS a spot updated zero rows and got `false` —
-- the identical answer to *the offer is full*. While the claim happened once,
-- at signup, nothing ever asked twice and the ambiguity cost nothing.
--
-- **WHY IT COSTS SOMETHING NOW.** `subscribe` claims and then snapshots the
-- price in the same breath. Two `subscribe` calls in flight for one business —
-- two tabs, two devices, or a client retry after a slow request — both read
-- `plan_tier = 'standard'` before either claims. The lock serialises them
-- correctly: the first takes the spot, the second blocks, resumes, finds the
-- row already `'founding'`, updates nothing and returns **false**. The second
-- caller therefore snapshots at LIST prices and upserts that over the same
-- `business_id` row — **a detailer who has genuinely taken a founding spot
-- ends up on a subscription at $60 a month**, with no re-quote path, and the
-- only way back is the back office. Found by roadmap 8.5's security review.
--
-- **THE FIX IS TO ANSWER THE QUESTION THE CALLER IS ASKING**, which is not
-- *did I change a row* but *does this business hold a founding spot now*. A
-- business that already holds one is told yes, without consuming anything and
-- without being counted against the cap a second time.
--
-- Everything else is unchanged and is restated here only because
-- `create or replace` needs the whole body: the `for update` on the single
-- settings row is what serialises claimants, and `not is_demo` keeps seeded
-- businesses out of the count (roadmap 6.2 — a demo in the count advertises a
-- spot the claim then refuses).

create or replace function public.claim_founding_spot(p_business_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total integer;
  v_taken integer;
  v_held  boolean;
begin
  -- ALREADY HELD IS A YES. Asked before the lock is taken: it consumes
  -- nothing, so there is no one to serialise against.
  select plan_tier = 'founding' into v_held
    from public.businesses
    where id = p_business_id;

  if v_held is null then
    return false;          -- no such business
  end if;
  if v_held then
    return true;           -- already theirs; not counted twice
  end if;

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
    where plan_tier = 'founding' and status <> 'churned' and not is_demo;

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

revoke all on function public.claim_founding_spot(uuid) from public, anon, authenticated;
grant execute on function public.claim_founding_spot(uuid) to service_role;

comment on function public.claim_founding_spot(uuid) is
  'Does this business hold a founding spot after this call? Grants one if a spot remains; answers true for a business that already holds one, so a retry or a concurrent call cannot be told "no" and quoted list prices. Server-side only.';

-- ROADMAP 8.5 — giving a spot back.
--
-- The claim happens at INTENT to pay, so a checkout that is abandoned or that
-- fails after the claim holds a spot nobody is paying for. `subscribe` calls
-- this on its own failure paths to undo a claim IT made in that same call.
--
-- **IT ONLY EVER RELEASES A SPOT THAT IS NOT PAID FOR.** The guard is the
-- absence of a live subscription row: a business with one has bought at that
-- price, and taking the tier away would silently reprice their renewal.
create or replace function public.release_founding_spot(p_business_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.businesses b
     set plan_tier = 'standard'
   where b.id = p_business_id
     and b.plan_tier = 'founding'
     and not exists (
       select 1 from public.platform_subscriptions s
        where s.business_id = b.id
          and s.status not in ('incomplete', 'canceled')
     );
  return found;
end;
$$;

revoke all on function public.release_founding_spot(uuid) from public, anon, authenticated;
grant execute on function public.release_founding_spot(uuid) to service_role;

comment on function public.release_founding_spot(uuid) is
  'Gives back a founding spot claimed for a checkout that then failed. Refuses to touch a business with a live subscription, because that business has bought at that price. Server-side only.';
