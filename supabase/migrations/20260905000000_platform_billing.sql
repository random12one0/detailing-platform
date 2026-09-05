-- ROADMAP 2.20 STAGE 2, THE SECOND HALF — what a DETAILER pays US.
--
-- Every other money table in this schema is MONEY THROUGH: a detailer's own
-- customer paying the detailer, which we never hold. These three are MONEY IN,
-- the other direction, and they are the first rows in this product that
-- correspond to a real card being charged. `platform_` names them so no
-- session ever confuses one for the other -- `bookings.total_price` is the
-- detailer's money and `platform_subscriptions.recurring_cents` is ours.
--
-- ONE SUBSCRIPTION PER BUSINESS, so `business_id` IS the primary key. The
-- alternative -- a history table with one live row -- buys a story we do not
-- need and costs every reader a "which one is current" clause. A detailer who
-- cancels and comes back updates this row; what actually happened to their
-- money is in `platform_invoices`, which is the history and comes from Stripe.
--
-- ============================================================================
-- WHY EVERY PRICE IS SNAPSHOTTED HERE RATHER THAN LOOKED UP
-- ============================================================================
-- `app/src/landing/pricing.js` is what the pricing page PRINTS today, and it
-- will change -- the founding ladder ends, the list price moves. A subscriber's
-- price is fixed at the moment they agreed to it ("the price stays locked for
-- the life of an account that stays open", pricing.js's own header), so the
-- figures a detailer is charged CANNOT be a lookup against a config file the
-- owner edits. `setup_cents`, `recurring_cents`, `term_months` and
-- `exit_fee_share` are copies taken at checkout and never re-read from
-- anywhere. The exit fee in particular is arithmetic on a number the customer
-- SAW; recomputing it from a later config is how a $240 fee becomes $360.
--
-- ============================================================================
-- `consented_at` / `consent_text` ARE THE STATUTE, NOT BOOKKEEPING
-- ============================================================================
-- California's AB 2863 (in force 1 July 2025) requires EXPRESS AFFIRMATIVE
-- CONSENT to the auto-renewal terms before billing details are taken, and it
-- requires the disclosure to be clear and conspicuous BEFORE that point.
-- `/pricing` carries the disclosure; this column carries the consent, and it
-- stores THE WORDS THAT WERE ON THE SCREEN rather than a boolean. A `true` in
-- a database proves somebody ticked something; the sentence they ticked is what
-- answers a chargeback, which is the whole reason the fee is defensible at all
-- (the FTC's June 2024 complaint against Adobe was about the PRESENTATION of an
-- identical early-exit fee, never about the fee). Copy the text, not the tick.
--
-- ============================================================================
-- `status` IS OUR VOCABULARY, NOT STRIPE'S -- five values, closed
-- ============================================================================
-- Stripe has eight subscription statuses and we need five sentences a detailer
-- would recognise. `suspended` is the one with no Stripe equivalent: it is the
-- promise the pricing page now makes in print -- *"the site goes offline until
-- it is paid. Nothing is deleted."* -- and it is a state of OUR product rather
-- than of a Stripe object. The mapping lives in exactly one place
-- (`_shared/platformBilling.ts`), so a Stripe status this schema has never
-- heard of cannot become a row.
--
-- ============================================================================
-- SUSPENSION REUSES `businesses.status`, WHICH ALREADY DOES THE WHOLE JOB
-- ============================================================================
-- Nothing new is needed to take a site offline. `businessBySlug` and
-- `get_public_business_profile` both filter on `status = 'active'`, so setting
-- a business to `paused` darkens the PUBLIC booking page -- while
-- `businessById` has no such filter, so an existing customer's receipt page
-- keeps letting them cancel and reschedule, and the detailer's own dashboard
-- (which is reached by membership, not by status) stays up with every row
-- intact. That is exactly the promise, and it is a column that already exists.
-- Roadmap 4.4's platform-admin "suspend" is the same mechanism; build it once.
--
-- ============================================================================
-- NO WRITE POLICY ON ANY OF THE THREE, ON PURPOSE
-- ============================================================================
-- A row here says money moved. The only writer is the service role, through
-- `stripe-webhook` and `platform-billing`, because the authority for every
-- value is Stripe's own event stream. A browser client that could write
-- `status = 'active'` could give itself a free subscription with one PATCH.
-- Select is owner-only -- not a permission tick -- for the reason roadmap 2.13
-- refused a `team` permission: whoever can change what the business pays can
-- change everything.

-- ---------------------------------------------------------------------------

create table public.platform_subscriptions (
  business_id uuid primary key references public.businesses(id) on delete cascade,

  -- What they bought. `booking` is the $35 booking-only plan; `website` is the
  -- one with the built site and the setup fee.
  plan     text not null check (plan in ('website','booking')),
  -- The three ways to pay, and the string is the one `/pricing` puts in its
  -- own links (`?term=`), so the page and the row cannot drift apart.
  term     text not null check (term in ('annual-upfront','annual-monthly','monthly')),
  founding boolean not null default false,

  -- Snapshotted at checkout. See the header: these are never re-read.
  setup_cents     integer not null default 0 check (setup_cents >= 0),
  recurring_cents integer not null check (recurring_cents > 0),
  bill_interval   text not null check (bill_interval in ('month','year')),
  -- 0 for the two terms with no commitment. `term_months` and `exit_fee_share`
  -- are separate from `term`, the same way `plan_members.term_months` is
  -- separate from `price_kind` (roadmap 2.14): merging them makes one of the
  -- shapes unsayable the first time a fourth way to pay arrives.
  term_months     integer not null default 0 check (term_months >= 0),
  exit_fee_share  numeric(4,3) not null default 0
                    check (exit_fee_share >= 0 and exit_fee_share <= 1),
  -- When the commitment runs out. Null when there is none.
  term_ends_on    date,

  -- AB 2863. The words on the screen, not a boolean. See the header.
  consented_at timestamptz,
  consent_text text,

  stripe_customer_id     text,
  stripe_subscription_id text unique,
  stripe_session_id      text,

  status text not null default 'incomplete'
    check (status in ('incomplete','active','past_due','suspended','canceled')),
  cancel_at_period_end boolean not null default false,
  current_period_end   timestamptz,

  -- The card, as Stripe describes it. We never see a number; these four are
  -- what a detailer needs to recognise which card is on file.
  card_brand     text,
  card_last4     text,
  card_exp_month integer,
  card_exp_year  integer,

  -- Dunning. Stripe runs the retries; this is what we know about them, and
  -- `dunning_attempts` is what the billing page counts out loud so a detailer
  -- can see how much rope is left before the site goes dark.
  dunning_attempts    integer not null default 0 check (dunning_attempts >= 0),
  last_failure_at     timestamptz,
  last_failure_reason text,
  suspended_at        timestamptz,

  canceled_at            timestamptz,
  -- What the early exit actually cost, in the moment it was charged. Null when
  -- there was no term or the term had run out.
  exit_fee_charged_cents integer check (exit_fee_charged_cents >= 0),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger platform_subscriptions_updated_at
  before update on public.platform_subscriptions
  for each row execute function public.set_updated_at();

-- The receipts. Written by the webhook from Stripe's own invoice objects, so
-- the billing page can list what was charged WITHOUT calling Stripe -- which is
-- what lets that screen render, and be verified in a browser, on a machine that
-- has no Stripe key at all.
create table public.platform_invoices (
  -- Stripe's invoice id. The primary key, so a replayed webhook overwrites
  -- rather than duplicating.
  id           text primary key,
  business_id  uuid not null references public.businesses(id) on delete cascade,
  number       text,
  amount_cents integer not null,
  currency     text not null default 'usd',
  -- Stripe's own invoice status, unmapped: `paid`, `open`, `void`,
  -- `uncollectible`. Unlike the subscription, a detailer reads this as a fact
  -- about one document rather than as a state of their account.
  status       text not null,
  hosted_url   text,
  pdf_url      text,
  period_start timestamptz,
  period_end   timestamptz,
  paid_at      timestamptz,
  created_at   timestamptz not null default now()
);

create index platform_invoices_business_idx
  on public.platform_invoices (business_id, created_at desc);

-- IDEMPOTENCY. Stripe retries a webhook until it gets a 2xx, and it will send
-- the same event more than once even after one -- so "did we already act on
-- this?" has to be a database question, not an assumption. Insert-first: the
-- primary key IS the lock, so two deliveries racing each other cannot both
-- proceed. No RLS policies at all; the service role is the only reader.
create table public.stripe_events (
  id          text primary key,
  type        text not null,
  received_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- RLS

alter table public.platform_subscriptions enable row level security;
alter table public.platform_subscriptions force  row level security;
alter table public.platform_invoices      enable row level security;
alter table public.platform_invoices      force  row level security;
alter table public.stripe_events          enable row level security;
alter table public.stripe_events          force  row level security;

-- Read-only, owner-only. There is deliberately no write policy on either
-- table: see the header.
create policy platform_subscriptions_owner_select on public.platform_subscriptions
  for select to authenticated
  using (public.is_business_owner(business_id));

create policy platform_invoices_owner_select on public.platform_invoices
  for select to authenticated
  using (public.is_business_owner(business_id));

comment on table public.platform_subscriptions is
  'Roadmap 2.20 stage 2. What a DETAILER pays the platform. Prices are snapshotted at checkout and never re-read from pricing.js; consent is stored as the words that were on the screen (AB 2863). Service role is the only writer.';
comment on table public.platform_invoices is
  'Roadmap 2.20 stage 2. Stripe invoices mirrored by the webhook, so the billing page lists charges without calling Stripe.';
comment on table public.stripe_events is
  'Roadmap 2.20 stage 2. Webhook idempotency. The primary key is the lock: Stripe redelivers, and an event acted on twice charges or suspends twice.';
comment on column public.platform_subscriptions.consent_text is
  'The exact sentence the detailer ticked. A boolean proves somebody ticked something; this is what answers a chargeback.';
comment on column public.platform_subscriptions.status is
  'Our five words, not Stripe''s eight. `suspended` has no Stripe equivalent -- it is the pricing page''s printed promise that the site goes offline until it is paid, with nothing deleted.';
