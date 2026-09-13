-- A TEST RUN CAN SPEND THE WHOLE DAY'S EMAIL AND SILENCE A REAL SIGNUP NOTICE.
-- Measured 2026-09-13, lane C, at Andrew's ask.
--
-- **HIS QUESTION:** *"The Plumbing tab shows email usage at 49 of 100 for
-- today, and the test suites are spending it. If a heavy test run can exhaust
-- the daily allowance then a real signup notice silently does not arrive. Work
-- out whether that is true and make it impossible."*
--
-- ===========================================================================
-- IT IS TRUE. HERE ARE THE NUMBERS.
-- ===========================================================================
--
-- `platform_email_days`, read the same morning, cap 100 a day:
--
--     2026-09-13   sent  84   failed 10   = 94 attempts, and it was 06:55 UTC
--     2026-09-12   sent  15   failed  2
--     2026-09-11   sent  59   failed  0
--     2026-09-08   sent 117   failed  0   = 117, ALREADY OVER
--     2026-09-07   sent 173   failed 67   = 240 attempts against a cap of 100
--
-- **Two of the last seven days went past the provider's limit and one went to
-- two and a half times it.** There are no detailers on this product, so every
-- one of those emails is ours.
--
-- **WHAT SPENDS IT.** `send-email` already refuses the reserved domains
-- (`.test`, `.invalid`, `example.com`) before it reaches the provider, so most
-- fixtures are free. What is NOT free: `delivered@resend.dev`, Resend's own
-- delivery simulator, used by `scripts/e2e-booking.mjs`,
-- `tests/multi-vehicle.test.mjs`, `tests/staff-roles.test.mjs` and
-- `tests/dead-mans-switch.test.mjs`; and every `@detailplatform.com` address,
-- which is a real domain — the demo business's own contact address, so **every
-- owner alert a suite triggers is a real send.** The transactional set is about
-- five emails a booking.
--
-- ===========================================================================
-- WHY "SILENTLY" IS THE WORST WORD IN HIS SENTENCE
-- ===========================================================================
--
-- At the cap Resend answers **429**. `send-email` correctly does not blame the
-- customer for a 429 — testing loop F-025 already cost this product that
-- mistake — but it returns the failure to `sendTenantEmail`, which **returns
-- `false` and does not throw**, and `create-business` wraps the signup alert in
-- a `try` that logs and moves on. So the chain is: suite burns the allowance →
-- a real detailer signs up → Resend refuses → the relay logs → the caller
-- swallows → **Andrew is never told anybody signed up, and nothing anywhere
-- says so.**
--
-- ===========================================================================
-- THE FIX: THE PLATFORM'S OWN MAIL HAS HEADROOM NOBODY ELSE CAN SPEND
-- ===========================================================================
--
-- **A budget, claimed BEFORE the provider is called, with a slice reserved for
-- the platform's own alerts.** Tenant mail — every booking email, every
-- reminder, everything a suite can trigger — may spend down to
-- `cap - email_platform_reserve` and no further. The last slice is reachable
-- only by mail the platform sends in its OWN name.
--
-- **`sender_name` IS ALREADY THAT DISCRIMINATOR AND NO NEW FLAG IS NEEDED.**
-- `send-email` has carried `fromPlatform` since roadmap 2.20: it is set by
-- platform billing mail, by the dead man's switch, and by the signup alert in
-- `create-business`. Those three are exactly the mail Andrew must receive, and
-- nothing a detailer or a test fixture does can set it.
--
-- **WHY A CLAIM AND NOT A CHECK.** A read-then-send lets two concurrent sends
-- both see 79 and both proceed. This is one statement, so the count cannot be
-- lost — the same reasoning `note_email_send` was written with.
--
-- **WHY A SEPARATE COLUMN FROM `sent`/`failed`.** Those two are the OUTCOME
-- ledger and the Plumbing tab draws them; this is the BUDGET ledger and it has
-- to move before the outcome is known. They diverge when an isolate dies
-- mid-send, and that divergence is honest: a claim that was spent and produced
-- nothing is still a claim against the provider's limit.
--
-- **20 IS THE RESERVE AND IT IS A SETTING, NOT A CONSTANT**, for the same
-- reason the cap is: the answer to a warning is to change the fact. Five
-- emails a booking means twenty is four bookings' worth of headroom, which is
-- comfortably more than the platform's own alerts have ever used in a day.
--
-- **WHAT THIS DOES NOT DO, deliberately.** It does not stop a test run
-- spending 80 emails of a detailer's day. That is a real cost and it is a
-- different question — the suites' own addresses — recorded in `FOUND.md`
-- rather than guessed at here. What it makes IMPOSSIBLE is the thing he asked
-- about: a test run cannot take the signup notice with it.

alter table public.platform_settings
  add column if not exists email_platform_reserve integer not null default 20
    check (email_platform_reserve >= 0);

comment on column public.platform_settings.email_platform_reserve is
  'How many of the day''s emails only the PLATFORM may spend - the signup '
  'alert, billing mail, the dead man''s switch. Tenant mail stops at '
  'email_daily_cap minus this. Raising the cap is still the answer to the '
  'near-limit warning; this is what stops a heavy test run taking the one '
  'email Andrew has to receive. 2026-09-13.';

-- The budget ledger. Distinct from `sent`/`failed`, which are outcomes.
alter table public.platform_email_days
  add column if not exists claimed integer not null default 0
    check (claimed >= 0);

comment on column public.platform_email_days.claimed is
  'Attempts allowed against the provider today, counted BEFORE the call. '
  'sent + failed are the outcomes of those attempts and will fall short of '
  'this when an isolate dies mid-send - which is honest, because a claim that '
  'produced nothing still spent the provider''s allowance. 2026-09-13.';

-- ---------------------------------------------------------------------------
-- THE CLAIM
-- ---------------------------------------------------------------------------
-- Returns true when this send may go to the provider, and has already counted
-- it. Returns false and counts NOTHING when it may not: a refused send never
-- reached the provider, so charging it against the day would make tomorrow's
-- budget wrong as well as today's.
--
-- **`plpgsql`, because the decision needs the value the upsert produced.** One
-- statement inside one function call, so two concurrent sends are serialised
-- by the row lock the upsert takes.
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
  -- **NO ROW MEANS NO LIMIT, AND THAT IS THE SAFE DIRECTION HERE.** A fresh
  -- environment with no `platform_settings` row must not have every email
  -- refused; the provider's own 429 is still the backstop, exactly as
  -- `translation_usage` is advisory and DeepL's error is the authority.
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

  -- Give the claim back. It was not spent.
  update public.platform_email_days
     set claimed = greatest(claimed - 1, 0)
   where day = (now() at time zone 'utc')::date;
  return false;
end;
$fn$;

revoke all on function public.claim_email_send(boolean) from public, anon, authenticated;
grant execute on function public.claim_email_send(boolean) to service_role;

comment on function public.claim_email_send(boolean) is
  'Claims one of today''s emails before the provider is called. Tenant mail '
  'stops at email_daily_cap minus email_platform_reserve; platform mail '
  '(sender_name set - the signup alert, billing, the dead man''s switch) may '
  'reach the full cap. Server-side only. 2026-09-13.';
