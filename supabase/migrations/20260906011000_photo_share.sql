-- A detailer's photo allowance is the WHOLE STORE DIVIDED BY A HUNDRED.
--
-- The owner, 2026-09-06: *"I don't want to hold a ton of their photos, we
-- should have a smaller limit. I doubt I will have more than 100 people using
-- it, so we should just make it decided by 100 and that's how much each person
-- had."*
--
-- ---------------------------------------------------------------------------
-- WHY THIS IS BETTER THAN THE FLAT 250 MB IT REPLACES, and it is not only that
-- it is smaller. **A flat per-tenant cap never adds up to anything.** Four
-- detailers at 250 MB already exceeded the free plan, so the number on the
-- screen promised something the platform could not keep — and the failure
-- would have landed on whichever detailer happened to upload last, mid-job,
-- with a message about THEIR allowance that was nothing to do with them.
--
-- A share of a known total cannot do that. The total is the real constraint,
-- so it is the only thing configured; the per-tenant figure is derived from it
-- and is therefore always honest.
--
-- **THE DIVISOR IS FLAT 100, WHICH IS HIS NUMBER AND IS THE RIGHT SHAPE.** The
-- obvious "improvement" — divide by the ACTUAL number of businesses so it can
-- never overcommit — is worse where it matters: a detailer's allowance would
-- silently SHRINK every time he signed somebody new, and "I had room for
-- photos yesterday" is a support call that makes the product look broken while
-- it is working exactly as designed. A fixed share is predictable, and
-- predictable beats optimal for a number a person plans around.
--
-- **THE TRIPWIRE THAT COMES WITH THAT CHOICE:** past 100 detailers the shares
-- add up to more than exists. `photo_store_state()` below reports it so the
-- back office can say so out loud rather than discovering it as a failed
-- upload. At that point the total goes up — which is a good problem, because
-- it means a hundred people are paying.
--
-- WHAT THE TOTAL SHOULD BE, TODAY AND AFTER:
--   Supabase free storage  1 GB   -> 10 MB each  (~33 photos)  — too small,
--                                                 and this is why R2 matters
--   Cloudflare R2 free    10 GB   -> 100 MB each (~330 photos) — a few months
--
-- The default below is 1 because that is what is TRUE until R2 is connected.
-- **A default of 10 would be a promise about storage that does not exist yet**,
-- which is the whole fault this file was written to remove.
-- ---------------------------------------------------------------------------

-- The divisor is a function rather than a literal in three places.
create or replace function public.photo_tenant_share()
returns int language sql immutable as $$ select 100 $$;

create or replace function public.photo_total_bytes()
returns bigint language sql stable security definer set search_path = public as $$
  select coalesce(
    (select (s.prices -> 'photoTotalGb')::numeric from public.platform_settings s limit 1),
    1
  )::numeric * 1024 * 1024 * 1024;
$$;

create or replace function public.job_photo_budget(p_business uuid)
returns table (used_bytes bigint, cap_bytes bigint, photos integer)
language sql stable security definer set search_path = public as $$
  select
    coalesce(sum(p.bytes), 0)::bigint,
    (public.photo_total_bytes() / public.photo_tenant_share())::bigint,
    count(*)::int
  from public.job_photos p
  where p.business_id = p_business
    and p_business in (select public.current_business_ids());
$$;

grant execute on function public.job_photo_budget(uuid) to authenticated;
grant execute on function public.photo_total_bytes() to authenticated;
grant execute on function public.photo_tenant_share() to authenticated;

-- ---------------------------------------------------------------------------
-- WHAT THE BACK OFFICE NEEDS TO SEE. Not a per-tenant figure — the whole
-- store, and whether the shares handed out still fit inside it.
--
-- `committed_bytes` is what has been PROMISED (businesses x share), which is
-- the number that goes wrong first and the one nothing would otherwise show:
-- storage can be 4% used and 140% promised at the same time, and only the
-- second predicts the morning somebody cannot upload.
-- ---------------------------------------------------------------------------
create or replace function public.photo_store_state()
returns table (
  used_bytes bigint, total_bytes bigint, committed_bytes bigint,
  businesses int, share_bytes bigint, photos int
)
language sql stable security definer set search_path = public as $$
  select
    (select coalesce(sum(bytes), 0)::bigint from public.job_photos),
    public.photo_total_bytes()::bigint,
    ((select count(*) from public.businesses)
       * (public.photo_total_bytes() / public.photo_tenant_share()))::bigint,
    (select count(*)::int from public.businesses),
    (public.photo_total_bytes() / public.photo_tenant_share())::bigint,
    (select count(*)::int from public.job_photos);
$$;

-- The back office reads this through `platform-admin`, which runs as the
-- service role; no browser needs it.
revoke all on function public.photo_store_state() from public, anon, authenticated;
