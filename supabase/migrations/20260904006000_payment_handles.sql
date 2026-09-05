-- ROADMAP 2.20, STAGE 1 — the detailer's own ways to be paid.
--
-- Nothing in this product has ever taken money. `bookings.payment_status` is a
-- flag the detailer sets by hand and `payment_notes` is free text; there is no
-- processor, no card and no webhook, and that is clean rather than behind.
-- Stage 1 keeps it that way: the detailer types the handles they already read
-- out at the door, and the customer's emails print them. No fees, no keys, and
-- nothing here waits on a Stripe account.
--
-- SIX COLUMNS AND NOT A JSONB LIST. `business_settings` already carries a
-- feature per column trio (`site_discount_active/percent/label`), a check
-- constraint can hold the length, and the settings screen is six plain fields
-- instead of the add-a-row editor a list would need. The trade is that a
-- seventh method means a migration; the old site's own list was exactly these
-- five plus cash, and `pay_other` is free text for anyone who takes something
-- else.
--
-- THE LENGTH LIMIT IS A TRUST BOUNDARY, NOT TIDINESS. Every value here is
-- typed by a detailer and printed in an email to their customer, in a ruled
-- label/value list that a 500-character "handle" would destroy. 120 holds a
-- pasted PayPal.me link with room to spare.
--
-- WHAT READS THESE: `supabase/functions/_shared/payments.ts` (the only place
-- that decides what links and what does not), and through it the confirmation,
-- the accepted-request, both reminders and the UNPAID invoice. Never the
-- receipt — see that file's header for the owner's own reason.

alter table public.business_settings
  add column if not exists pay_cash    boolean not null default false,
  add column if not exists pay_venmo   text,
  add column if not exists pay_cashapp text,
  add column if not exists pay_zelle   text,
  add column if not exists pay_paypal  text,
  add column if not exists pay_other   text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'business_settings_pay_lengths'
  ) then
    alter table public.business_settings
      add constraint business_settings_pay_lengths check (
        coalesce(length(pay_venmo),   0) <= 120 and
        coalesce(length(pay_cashapp), 0) <= 120 and
        coalesce(length(pay_zelle),   0) <= 120 and
        coalesce(length(pay_paypal),  0) <= 120 and
        coalesce(length(pay_other),   0) <= 120
      );
  end if;
end $$;

comment on column public.business_settings.pay_cash is
  'Roadmap 2.20 stage 1. Whether cash is accepted; the only method with no handle.';
comment on column public.business_settings.pay_other is
  'Roadmap 2.20 stage 1. Free text for anything the five named methods do not cover. Printed, never linked.';
