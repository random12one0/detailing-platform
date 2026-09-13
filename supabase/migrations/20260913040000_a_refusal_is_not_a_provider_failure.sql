-- A REFUSAL OF OUR OWN IS NOT THE PROVIDER REFUSING, AND COUNTING IT AS ONE
-- WOULD HAVE MADE THE PLUMBING TAB UNREADABLE ON EXACTLY THE DAY IT MATTERS.
-- 2026-09-13, lane C, found by following the new code forward rather than by a
-- check.
--
-- ===========================================================================
-- THE DEFECT I NEARLY SHIPPED
-- ===========================================================================
--
-- `claim_email_send` refuses a send once the day's budget is spent, and the
-- first version of `send-email` recorded that refusal with
-- `note_email_send(false)` — the same counter the PROVIDER's rejections go
-- into.
--
-- **THAT IS FINE FOR ONE REFUSAL AND WRONG FOR A SWEEP.** The reminder fix
-- landed the same night made a refused send leave its marker unwritten, which
-- is correct and is the whole point: the next sweep tries again. The sweep runs
-- **every fifteen minutes**. So ten reminders due after the cap, over the eight
-- hours before the day rolls over at midnight UTC, is
--
--     10 bookings x 4 attempts an hour x 8 hours = 320
--
-- **added to a `failed` column whose whole job is to say how many emails the
-- provider rejected.** The day would read `84 sent, 330 failed` and the one
-- number Andrew looks at to decide whether to upgrade the plan would be
-- nonsense — on the busiest day, which is the only day he would look.
--
-- **AND IT CONTRADICTED ITS OWN DESIGN.** The migration that added `claimed`
-- says in as many words that `sent` and `failed` are the OUTCOME ledger and
-- `claimed` is the BUDGET ledger. A refusal that never reached the provider has
-- no outcome to record.
--
-- ===========================================================================
-- BUT IT MUST NOT BECOME INVISIBLE EITHER, WHICH IS THE WHOLE ITEM
-- ===========================================================================
--
-- Simply not counting it would leave a day where real mail was turned away
-- looking exactly like a quiet day — `claimed` stops at the budget and stays
-- there, because a refused claim is given back. **That is the silent failure
-- Andrew's original sentence was about, reintroduced one level down.**
--
-- **SO IT GETS ITS OWN NUMBER.** `refused` is "how many sends we turned away
-- ourselves", and it is the number that says the cap actually bit. It is the
-- honest third column rather than a fourth interpretation of the two that
-- exist:
--
--     sent     the provider accepted it
--     failed   the provider rejected it
--     refused  it never reached the provider, because the day was spent
--     claimed  what has been spent against the provider's limit
--
-- **IT COSTS NO EXTRA STATEMENT.** The refusal path already does one UPDATE, to
-- give the claim back; the increment rides along on it.
--
-- **AND A REFUSAL STILL SAYS WHOSE IT WAS.** `refused_platform` counts only the
-- refusals of the platform's own alerts, which is the emergency case — it means
-- the reserve itself is exhausted and Andrew is now missing signup notices. A
-- single combined number cannot tell "the suites are loud today" from "the one
-- email that must arrive did not".

alter table public.platform_email_days
  add column if not exists refused          integer not null default 0 check (refused >= 0),
  add column if not exists refused_platform integer not null default 0 check (refused_platform >= 0);

comment on column public.platform_email_days.refused is
  'Sends WE turned away because the day''s budget was spent. Never reached the '
  'provider, so it is neither sent nor failed. This is the number that says the '
  'cap actually bit. 2026-09-13.';
comment on column public.platform_email_days.refused_platform is
  'How many of `refused` were the platform''s OWN alerts - the signup notice, '
  'billing, the dead man''s switch. Above zero means the reserve itself is '
  'exhausted and Andrew is missing mail he asked for. 2026-09-13.';

create or replace function public.claim_email_send(p_platform boolean)
returns boolean
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_cap      integer;
  v_reserve  integer;
  v_budget   integer;
  v_claimed  integer;
begin
  -- NO ROW MEANS NO LIMIT, and that is the safe direction: a fresh environment
  -- with no `platform_settings` row must not have every email refused. The
  -- provider's own 429 is still the backstop.
  select email_daily_cap, email_platform_reserve
    into v_cap, v_reserve
    from public.platform_settings
   limit 1;
  if v_cap is null then
    return true;
  end if;

  v_budget := case when p_platform then v_cap else greatest(v_cap - coalesce(v_reserve, 0), 0) end;

  insert into public.platform_email_days (day, claimed)
  values ((now() at time zone 'utc')::date, 1)
  on conflict (day) do update
    set claimed = platform_email_days.claimed + 1
  returning claimed into v_claimed;

  if v_claimed <= v_budget then
    return true;
  end if;

  -- Give the claim back (it was not spent) and record the refusal in the same
  -- statement.
  update public.platform_email_days
     set claimed          = greatest(claimed - 1, 0),
         refused          = refused + 1,
         refused_platform = refused_platform + case when p_platform then 1 else 0 end
   where day = (now() at time zone 'utc')::date;
  return false;
end;
$fn$;

revoke all on function public.claim_email_send(boolean) from public, anon, authenticated;
grant execute on function public.claim_email_send(boolean) to service_role;

comment on function public.claim_email_send(boolean) is
  'Claims one of today''s emails before the provider is called. Tenant mail '
  'stops at email_daily_cap minus email_platform_reserve; platform mail '
  '(sender_name set) may reach the full cap. A refusal is counted in `refused` '
  'and never in `failed`, which belongs to the provider. Server-side only. '
  '2026-09-13.';
