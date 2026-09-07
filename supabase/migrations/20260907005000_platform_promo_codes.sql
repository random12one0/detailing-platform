-- ROADMAP 8.14 — A PROMO CODE ON *OUR* CHECKOUT.
--
-- *"We should set up a promo code system within the buying process. I'm sure
-- Stripe supports that."*
--
-- ---------------------------------------------------------------------------
-- IT IS NOT THE PROMO CODE SYSTEM THIS PRODUCT ALREADY HAS, AND THE NAMES ARE
-- ONE LETTER APART.
-- ---------------------------------------------------------------------------
-- `promo_codes` is a DETAILER'S code for THEIR customer, redeemed on a
-- booking, validated by `validate-promo-code`, spent against a job's price.
-- **This table is OURS, for a DETAILER buying a subscription from us**, and
-- the two must never learn about each other: one is a tenant's money and the
-- other is the platform's. `platform_` is the prefix every table on this side
-- of that line already carries.
--
-- ---------------------------------------------------------------------------
-- STRIPE HAS COUPONS AND THIS DELIBERATELY DOES NOT USE THEM.
-- ---------------------------------------------------------------------------
-- He is right that Stripe supports it. A Stripe `coupon` also computes the
-- money **inside Stripe**, where nothing in this repo can see it — and this
-- codebase's single loudest rule is that *the page PRINTS and the server
-- CHARGES, and one pure module does both*
-- (`_shared/platformBilling.ts`). The same reasoning already refused Stripe
-- Product IDs for the amounts: *"an id puts the amount in another company's
-- admin panel."*
--
-- **SO A CODE PRODUCES A DIFFERENT `Snapshot`, AND NOTHING ELSE CHANGES.**
-- That one object already decides the invoice lines, the label, the consent
-- sentence, the exit fee and the row — so a discounted snapshot makes every
-- one of them correct by construction, including the sentence a detailer ticks
-- and the sentence quoted back in a card dispute.
--
-- **THE PRICE OF THAT CHOICE IS STATED RATHER THAN HIDDEN: a discount here
-- lasts as long as the subscription does.** *First month free* and *20% off
-- for a year* are not expressible, because an inline `price_data.unit_amount`
-- recurs at that amount for ever. Those need a Stripe coupon with a
-- `duration`, and then the number this repo prints and the number Stripe
-- charges are different numbers for the whole life of the account. **Money off
-- the BUILD FEE is naturally one-off** — that line appears on the first
-- invoice only — which covers the ordinary *"$200 off to sign up today"*.
--
-- ---------------------------------------------------------------------------
create table if not exists public.platform_promo_codes (
  -- UPPERCASE AND NARROW, ENFORCED HERE. A code is typed by a human off a
  -- text message; `launch-200`, `LAUNCH‑200` with a non-ASCII hyphen and
  -- `LAUNCH 200 ` are three ways to fail to redeem a code that exists. One
  -- shape, checked at the door, and the endpoint upper-cases and trims before
  -- it looks.
  code                 text primary key
                         check (code = upper(code) and code ~ '^[A-Z0-9][A-Z0-9-]{2,31}$'),

  -- `percent` is 1..100. `amount` is CENTS, because every other money column
  -- in this schema is cents and a table with one column in dollars is the
  -- kind of thing that is discovered by charging somebody a hundredth of what
  -- was meant.
  kind                 text not null check (kind in ('percent', 'amount')),
  value                integer not null check (value > 0),

  -- WHAT IT COMES OFF. Both may be true. **`off_setup` is the one-off build
  -- fee and is therefore a one-time discount; `off_recurring` lasts for the
  -- life of the subscription** — see the header. A code that comes off
  -- nothing is refused by the constraint below rather than saved and found
  -- useless at the till.
  off_setup            boolean not null default true,
  off_recurring        boolean not null default false,
  constraint promo_takes_something_off check (off_setup or off_recurring),
  constraint promo_percent_is_a_percent check (kind <> 'percent' or value <= 100),

  -- **REFUSED ON A FOUNDING ACCOUNT BY DEFAULT, AND THAT IS THE SAFE
  -- DIRECTION RATHER THAN A PREFERENCE.** The founding ladder is already a
  -- discount, and there are only three of those spots. A 50% code stacked on
  -- it is $20 a month for the life of an account, decided by whoever forwarded
  -- the text message — where refusing costs one support email. Same shape as
  -- `?? "incomplete"` on an unknown Stripe status: the safe default costs a
  -- conversation, the unsafe one gives the product away.
  stacks_with_founding boolean not null default false,

  -- NULL IS UNLIMITED AND IS A DELIBERATE CHOICE THE CREATOR HAS TO MAKE.
  -- `redeemed` is incremented by `redeem_promo_code` in one statement, so two
  -- people pressing subscribe at once cannot both take the last one.
  max_redemptions      integer check (max_redemptions is null or max_redemptions > 0),
  redeemed             integer not null default 0 check (redeemed >= 0),
  expires_at           timestamptz,
  active               boolean not null default true,
  -- What it was for, in his own words. A code with no note is a code nobody
  -- can decide about in six months.
  note                 text,
  created_at           timestamptz not null default now()
);

alter table public.platform_promo_codes enable row level security;
alter table public.platform_promo_codes force row level security;
-- NO POLICIES AT ALL, like `platform_settings`, `platform_admins` and
-- `job_heartbeats`. **A detailer's browser must not be able to read this
-- table**, because reading it is reading every unredeemed code in the
-- business — and it must not be able to write it, because writing it is
-- setting your own price. Every path goes through an edge function under the
-- service role.

comment on table public.platform_promo_codes is
  'A code a DETAILER types when subscribing to the platform. Not promo_codes, which is a detailer''s own code for their customers. A code produces a discounted Snapshot; there is no Stripe coupon, so every figure stays computable in this repo. Roadmap 8.14.';
comment on column public.platform_promo_codes.off_recurring is
  'The recurring discount lasts as long as the subscription does — an inline price_data.unit_amount recurs at that amount for ever. "First month free" and "20% off for a year" are NOT expressible and need a Stripe coupon. Roadmap 8.14.';
comment on column public.platform_promo_codes.stacks_with_founding is
  'False by default on purpose: the founding ladder is already a discount and there are three spots. Refusing costs a support email; allowing costs the price for the life of an account.';

-- ---------------------------------------------------------------------------
-- REDEEM AND RELEASE, THE SAME PAIR THE FOUNDING SPOT HAS AND FOR THE SAME
-- REASON.
-- ---------------------------------------------------------------------------
-- The count is taken at INTENT TO PAY, one line above the snapshot, because
-- the code and the price have to be decided in the same breath or they can
-- disagree — roadmap 8.5's finding, applied before it happens rather than
-- after. Everything below that point can still fail, so `release` undoes only
-- a redemption the failing call made.
--
-- **IT IS ONE STATEMENT.** Reading `redeemed`, comparing, then writing lets
-- two people take the last redemption of a code with `max_redemptions = 1`.
create or replace function public.redeem_promo_code(p_code text)
returns boolean
language sql
security definer
set search_path = public
as $fn$
  with taken as (
    update public.platform_promo_codes
       set redeemed = redeemed + 1
     where code = upper(trim(coalesce(p_code, '')))
       and active
       and (expires_at is null or expires_at > now())
       and (max_redemptions is null or redeemed < max_redemptions)
    returning code
  )
  select exists (select 1 from taken);
$fn$;

-- Never below zero: a release that ran twice must not manufacture a
-- redemption, and `greatest` is cheaper than reasoning about whether it can.
create or replace function public.release_promo_code(p_code text)
returns void
language sql
security definer
set search_path = public
as $fn$
  update public.platform_promo_codes
     set redeemed = greatest(redeemed - 1, 0)
   where code = upper(trim(coalesce(p_code, '')));
$fn$;

revoke all on function public.redeem_promo_code(text) from public, anon, authenticated;
revoke all on function public.release_promo_code(text) from public, anon, authenticated;
grant execute on function public.redeem_promo_code(text) to service_role;
grant execute on function public.release_promo_code(text) to service_role;

-- ---------------------------------------------------------------------------
-- WHAT THE SUBSCRIPTION REMEMBERS ABOUT IT.
-- ---------------------------------------------------------------------------
-- `setup_cents` and `recurring_cents` on this row are the DISCOUNTED figures —
-- they are what the card is charged and what the exit fee is computed from, so
-- they have to be. These three columns are what makes the list price
-- recoverable, and they are the record that answers *"why is this one paying
-- $40?"* six months later without anybody having to guess.
alter table public.platform_subscriptions
  add column if not exists promo_code text,
  add column if not exists promo_off_setup_cents integer not null default 0
    check (promo_off_setup_cents >= 0),
  add column if not exists promo_off_recurring_cents integer not null default 0
    check (promo_off_recurring_cents >= 0);

comment on column public.platform_subscriptions.promo_code is
  'The code used at checkout, if any. setup_cents and recurring_cents on this row are already DISCOUNTED — the two promo_off_* columns are what makes the list price recoverable. Roadmap 8.14.';

-- **REVOKED AT COLUMN LEVEL, AND THE TABLE-LEVEL REVOKE IS WHAT MAKES THAT
-- WORK.** 20260907003000 found every column-level revoke in this repo inert
-- because a table-level UPDATE grant overrides one. `platform_subscriptions`
-- is not writable by `authenticated` at all today; this states it rather than
-- relying on it, because a later migration granting the table would silently
-- hand a detailer the ability to write their own promo columns.
revoke update on public.platform_subscriptions from authenticated, anon;
revoke insert on public.platform_subscriptions from authenticated, anon;
