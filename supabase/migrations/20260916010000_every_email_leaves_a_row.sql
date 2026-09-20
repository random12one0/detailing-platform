-- ROADMAP 14.3 — EVERY EMAIL THIS PRODUCT SENDS NOW LEAVES A ROW.
--
-- Andrew's ask, 2026-09-16, in his words: *"a column or a row that just was
-- like, you know, email sent out to this email. Confirmed, or show if it
-- bounced or if it went through properly."* He also raised a full Resend-style
-- inbox with a preview of each message and talked himself out of it in the same
-- breath — *"I don't know if they really need that"* — so this is the row, not
-- the inbox. The message BODY is deliberately not stored: see below.
--
-- ---------------------------------------------------------------------------
-- WHAT WAS THERE BEFORE, MEASURED RATHER THAN ASSUMED
-- ---------------------------------------------------------------------------
-- Nothing. `platform_email_days` is a daily COUNTER for the quota and holds no
-- recipient, no subject and no outcome. `send-email` received Resend's message
-- id and handed it back to its caller without storing it. A provider refusal
-- went to `console.error`, which is an edge-function log nobody watches and
-- which expires. The only trace of a send was a timestamp on the booking
-- saying WE CALLED RESEND — which is not the same fact as IT ARRIVED, and the
-- gap between those two is the entire complaint.
--
-- ---------------------------------------------------------------------------
-- THE BODY IS NOT STORED, AND THAT IS A DECISION
-- ---------------------------------------------------------------------------
-- Every email this product sends is generated from a template plus the booking
-- it is about, so the body is reproducible from data that is already here —
-- `scripts/render-emails.mjs` does exactly that. Storing a copy would put the
-- customer's name, address and phone number into a SECOND table with its own
-- retention question and its own leak surface, to show the detailer something
-- they can already see. 14.1 and 14.2 were both about a reply carrying more
-- than the screen draws; this table is not going to be the third.
--
-- ---------------------------------------------------------------------------
-- THE ROW IS READ-ONLY TO EVERY BROWSER, INCLUDING THE OWNER'S
-- ---------------------------------------------------------------------------
-- **A record its subject can edit is not a record** — the rule roadmap 4.4 set
-- for `verified_at` and the weather columns keep. RLS chooses ROWS, never
-- COLUMNS, so a `for all` policy here would let a detailer's browser write
-- "delivered" onto a send that bounced. The policy is `for select` only and the
-- table grants nothing else to `authenticated`; the service role writes every
-- row, from `send-email` and from the provider's webhook.

create table public.email_sends (
  id          uuid primary key default gen_random_uuid(),

  -- NULL FOR THE TWO EMAILS WITH NO TENANT BEHIND THEM — the dead man's switch
  -- and anything else the platform sends about its own plumbing (8.12). Those
  -- rows are still worth having; they are simply nobody's to read, and the
  -- policy below returns them to no browser at all.
  business_id uuid references public.businesses(id) on delete cascade,

  -- Filled in when the address matches one of this business's customers, which
  -- is how the record reaches the screen it belongs on. `send-email` already
  -- performs exactly this lookup for `customers.email_failed_at`, so this costs
  -- no extra query. An owner alert matches nothing and correctly gets NULL: a
  -- detailer's own notification address is not one of their customers.
  customer_id uuid references public.customers(id) on delete set null,

  to_email    text not null,
  -- THE SUBJECT IS THE HUMAN'S HANDLE ON WHICH EMAIL THIS WAS. It is already
  -- written for a person to read, it is what their mail client shows them, and
  -- it needs no lookup table of `kind` values that the sixteen templates would
  -- then have to be kept in step with.
  subject     text not null,

  -- Resend's own message id. NULL when the send never reached the provider —
  -- a reserved domain, no API key, or our own daily cap. Unique so the
  -- delivery webhook can find its row and so a replayed webhook event cannot
  -- create a second one.
  provider_id text unique,

  status      text not null default 'sent'
    check (status in ('sent','delivered','bounced','complained','failed','refused','skipped')),

  -- THE SEVEN STATES, AND WHY NONE OF THEM IS SPARE:
  --   sent       we handed it to Resend and Resend accepted it. Andrew's
  --              "went through properly" is really this one plus `delivered`.
  --   delivered  the provider's webhook says the receiving server took it.
  --   bounced    the webhook says it came back. THE ONE HE ASKED FOR BY NAME.
  --   complained the recipient marked it as spam. Different from a bounce and
  --              worth its own word: the address works and the person does not
  --              want the mail, which is a reason to stop sending, not to fix
  --              a typo.
  --   failed     Resend refused it outright at send time.
  --   refused    OUR OWN daily budget refused it before the provider was
  --              called (`claim_email_send`). Deliberately not `failed` — the
  --              provider never saw it, and the two want different answers.
  --   skipped    never sendable and never attempted: a reserved domain
  --              (`@example.com` and friends) or no provider key configured.
  --              These are the sends that used to leave a `console.warn` and
  --              nothing else.

  -- The provider's own words, capped, drawn in one line under the address. A
  -- whole JSON body would not be read — the same 200-character rule
  -- `customers.email_failed_reason` already follows.
  detail      text,

  sent_at     timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger email_sends_updated_at
  before update on public.email_sends
  for each row execute function public.set_updated_at();

-- The customer record draws "the last few emails to this person", newest
-- first; the business-wide list is the same question one level up.
create index email_sends_customer_idx on public.email_sends (customer_id, sent_at desc);
create index email_sends_business_idx on public.email_sends (business_id, sent_at desc);

alter table public.email_sends enable row level security;
alter table public.email_sends force row level security;

-- READ ONLY, and scoped the standard way (`current_business_ids()`), so a
-- detailer sees their own sends and nobody else's. No insert, update or delete
-- policy exists, so a browser holding a valid session still cannot write one.
create policy email_sends_tenant_select on public.email_sends
  for select to authenticated
  using (business_id in (select public.current_business_ids()));

revoke insert, update, delete on public.email_sends from authenticated, anon;
grant select on public.email_sends to authenticated;

comment on table public.email_sends is
  'ROADMAP 14.3 — one row per attempted send. Written only by the service role, '
  'from supabase/functions/send-email (the attempt) and supabase/functions/'
  'resend-webhook (the outcome). Read-only to every browser.';
