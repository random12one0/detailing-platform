-- ROADMAP 2.20 STAGE 1's OTHER HALF — making a rejected send visible.
--
-- THE CAP IS NOT THE RISK; THE SILENCE IS. `sendTenantEmail` is best-effort by
-- design — an email failure must never fail a booking — so a rejected send is
-- a `console.error` inside an edge function and is invisible from every screen
-- in this product. A bad address, a suppression or a domain problem therefore
-- shows up for the first time as a customer saying they never got their
-- confirmation. The QUOTA half of this needs no work at all: Resend already
-- emails at 80% and 100% of the limit on every plan. This is the other reasons.
--
-- IT GOES ON THE CUSTOMER, NOT IN A LOG, and that is the whole design. A
-- rejected send is almost always a bad email address, and a bad email address
-- is a fact about the CUSTOMER rather than about the mail system. A "failed
-- emails" screen is the obvious build and is worse: it is a place you have to
-- remember to visit, about a problem you only ever care about one person at a
-- time. Here it appears next to the address, at the moment the detailer is
-- about to rely on it — and the code that already asks "can we email this
-- person" (the Clients list's count, `send-campaign`'s eligible set) gets to
-- ask it correctly for free.
--
-- THE SIBLING IS `unsubscribed_at`, from roadmap 2.19, and this is deliberately
-- the same shape: a nullable timestamp on `customers` that means "do not count
-- on reaching this person by email". The difference is who set it — a human
-- pressed the opt-out, whereas this one the provider told us — which is why
-- the reason is kept and why it CLEARS ITSELF on the next successful send. An
-- opt-out must never clear itself; a bounce must, or a detailer who fixes a
-- typo is told forever that an address they just corrected is broken.

alter table public.customers
  add column if not exists email_failed_at     timestamptz,
  add column if not exists email_failed_reason text;

comment on column public.customers.email_failed_at is
  'Roadmap 2.20. When the provider last REJECTED a send to this address. Cleared by the next successful send — unlike unsubscribed_at, which a human sets and only a human clears.';
comment on column public.customers.email_failed_reason is
  'Roadmap 2.20. The provider''s own words, truncated. Shown to the detailer beside the address; never shown to the customer.';
