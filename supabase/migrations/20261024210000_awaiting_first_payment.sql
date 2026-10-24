-- ROADMAP 97.37 — WHICH PAUSED BUSINESS IS A SIGNUP THAT HAS NEVER PAID.
--
-- Andrew, 2026-10-15: *"a new account must NOT get a working booking page,
-- customer bookings or any real access until they have paid ... with my own and
-- test/demo accounts exempt."* `create-business` makes a self-serve signup
-- `status = 'paused'`, billing's existing off switch. But `paused` alone cannot
-- say WHY: the back office's Suspend sets the same value on an account Andrew
-- made by hand, and that detailer must keep their dashboard and records. "No
-- subscription row" was the first answer and it was wrong for exactly that
-- account (hand-made accounts have no row), so the reason is stored.
--
-- TRUE ONLY FOR A SELF-SERVE SIGNUP, written by `create-business` (service
-- role). Cleared by the first payment (`stripe-webhook`) or by the back
-- office's "Put live without payment". Every existing row, and every account
-- the back office creates, is false: exempt.
--
-- THE DETAILER MAY READ IT AND MAY NOT WRITE IT. Table-level update on
-- `businesses` was taken from `authenticated` by 20260907003000 and given back
-- as a named list, so a new column is already unwritable; the revoke is
-- written anyway so this file states its own rule (the same reasoning as
-- 20261008010000_site_build_start.sql).
alter table public.businesses
  add column if not exists awaiting_first_payment boolean not null default false;

comment on column public.businesses.awaiting_first_payment is
  'ROADMAP 97.37. True only for a self-serve signup that has not made its first payment; it is created paused and waits at "Finish payment to go live". Cleared by stripe-webhook on the first payment or by the back office''s "Put live without payment". False for every back-office and pre-existing account.';

revoke update (awaiting_first_payment) on public.businesses from authenticated, anon;
