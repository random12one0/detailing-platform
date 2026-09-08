-- ROADMAP 2.20, STAGE 3 — a DETAILER taking cards from THEIR customer.
--
-- Stripe Connect `Standard`: the detailer holds their own Stripe account, the
-- charge is created on it, the money lands in their bank and they own their
-- own disputes. The platform is never in the flow and pays Stripe nothing.
-- `supabase/functions/_shared/connect.ts` has the full reasoning.
--
-- ---------------------------------------------------------------------------
-- WHY THIS IS A NEW TABLE AND NOT FOUR MORE COLUMNS ON `business_settings`
-- ---------------------------------------------------------------------------
-- Because `business_settings` is a table `authenticated` holds a TABLE-LEVEL
-- UPDATE grant on, and `20260907003000_column_revokes_actually_apply.sql` is
-- the file that explains what that means: a column-level revoke does nothing
-- while the table grant stands, so every column on it is writable by anyone
-- RLS lets through — which is any member holding the `settings` permission.
--
-- **On this feature that is a theft path, not an untidiness.** `stripe_account_id`
-- is where a customer's money goes. A member with `settings` — an employee, a
-- helper, someone who was given the permission once — could point their
-- employer's booking page at their OWN Stripe account and every card payment
-- from that moment would land in it. Nothing on any screen would look
-- different, and the detailer would find out from their bank.
--
-- The established fix is revoke-then-grant-back an allowlist, and on
-- `business_settings` that means discovering every column the settings screen
-- and the setup form write, today and for ever. **A new table starts with no
-- grants at all**, so the allowlist is written once, here, and is complete by
-- construction. The detailer READS their connection; only the edge function,
-- under the service role, writes it.
--
-- ---------------------------------------------------------------------------
-- WHY THE OAUTH STATE LIVES IN A COLUMN RATHER THAN IN A SIGNED TOKEN
-- ---------------------------------------------------------------------------
-- The Connect callback is a PUBLIC url carrying a `code`. Without a `state`
-- that this server issued and can recognise, anybody could deliver their own
-- code to it and attach their Stripe account to somebody else's business. The
-- usual answer is an HMAC, which needs a new signing secret nobody has set;
-- a random value in a row needs none, and it buys something an HMAC cannot:
-- **it is SINGLE USE.** The row is cleared the moment it is spent, so a
-- callback cannot be replayed. `connect.ts:stateFresh` holds the thirty
-- minutes, which is long enough to go and make a Stripe account mid-flow.

create table if not exists public.connected_accounts (
  business_id           uuid primary key references public.businesses(id) on delete cascade,

  -- `acct_…`. Null until the detailer finishes Stripe's consent screen.
  stripe_account_id     text,

  -- STRIPE'S ANSWER, NOT OURS, and it is re-read rather than remembered:
  -- a Standard account can be connected long before Stripe has finished
  -- checking it, and it can be turned off again later. False here means no
  -- customer is offered a card button, which is the safe direction.
  charges_enabled       boolean not null default false,

  -- THE DETAILER'S OWN SWITCH, and it is separate from the one above on
  -- purpose. Card costs them 2.9% + 30c, which is exactly why they hold up a
  -- Venmo code today; connecting an account must not silently start charging
  -- them a fee on every job. Off until they say so.
  card_payments_enabled boolean not null default false,

  connect_state         text,
  connect_state_at      timestamptz,

  connected_at          timestamptz,
  updated_at            timestamptz not null default now()
);

comment on table public.connected_accounts is
  'Stripe Connect Standard, one row per business. Written only by the connect-account edge function under the service role; see 20260908001000 for why this is not on business_settings.';

alter table public.connected_accounts enable row level security;

-- READ: anybody who belongs to the business. Not just `settings` holders —
-- a staff member being told "card payments are on" is information, not power,
-- and the write path is closed to all of them equally.
drop policy if exists connected_accounts_select on public.connected_accounts;
create policy connected_accounts_select on public.connected_accounts
  for select to authenticated
  using (
    exists (
      select 1 from public.business_users bu
      where bu.business_id = connected_accounts.business_id
        and bu.user_id = auth.uid()
    )
  );

-- NO WRITE POLICY AT ALL. There is deliberately no insert, update or delete
-- policy for `authenticated`: every write goes through `connect-account`,
-- which runs as the service role and bypasses RLS. A missing policy denies.

-- AND THE GRANTS, which are the half that actually bites — see the header.
-- Postgres checks the TABLE grant before it ever looks at a column list, so
-- the revoke comes first and the columns are handed back one at a time.
revoke all on public.connected_accounts from authenticated, anon;
grant select (
  business_id,
  stripe_account_id,
  charges_enabled,
  card_payments_enabled,
  connected_at
) on public.connected_accounts to authenticated;
-- `connect_state` and `connect_state_at` are NOT in that list. They are this
-- flow's one-time credential; nothing in a browser has a reason to read them,
-- and a value nobody can read is a value nobody can leak.

-- ---------------------------------------------------------------------------
-- WHAT A PAID BOOKING REMEMBERS
-- ---------------------------------------------------------------------------
-- `payment_status` already exists and is still the flag every screen reads —
-- these three are the audit trail underneath it, and they answer the question
-- a detailer will actually ask: "Stripe says this was paid, which job was it?"
--
-- `stripe_payment_intent` is UNIQUE because it is the idempotency of the whole
-- webhook: Stripe delivers an event more than once as a matter of routine, and
-- "mark this booking paid" must be safe to run twice. A unique index makes the
-- second insert a no-op rather than a second payment in the takings.
alter table public.bookings
  add column if not exists stripe_payment_intent text,
  add column if not exists stripe_session_id     text,
  add column if not exists paid_online_at        timestamptz;

create unique index if not exists bookings_stripe_payment_intent_key
  on public.bookings (stripe_payment_intent)
  where stripe_payment_intent is not null;

-- The webhook finds the booking by session id, and it arrives within seconds
-- of the row being written, so this index is read on every successful payment.
create index if not exists bookings_stripe_session_id_idx
  on public.bookings (stripe_session_id)
  where stripe_session_id is not null;

-- THESE THREE ARE NOT REVOKED FROM `authenticated`, AND THAT IS A DECISION
-- RATHER THAN AN OVERSIGHT — the first draft of this file revoked them and it
-- would have been theatre. `20260907003000` is the file that explains why: a
-- column-level revoke does nothing while the role holds the TABLE grant, and
-- `bookings` still holds one. Writing the revoke anyway would have added a
-- fourth line to this repo claiming a protection that was not there, which is
-- the exact defect that migration exists to correct.
--
-- **And the protection would not have bought anything.** A member who can
-- reach these can already set `payment_status = 'paid'` by hand, because that
-- is the feature — it is how cash is recorded. Being able to also write a fake
-- payment-intent string beside it grants no power they did not have.
--
-- The column that DID need protecting is `connected_accounts.stripe_account_id`,
-- which is where the money goes, and that one is on a table with no write
-- grant at all.
