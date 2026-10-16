-- ROADMAP 97.10 — WHY A CARD PAYMENT DID NOT SETTLE A JOB.
--
-- `stripe-webhook` now refuses to mark a job paid when the money Stripe reports
-- is not the figure owed, or not in US dollars, and it writes the reason here so
-- the job record can show it to the detailer. Shape (from `_shared/connect.ts`,
-- `PaymentProblem`): {"kind":"amount"|"currency","paid_cents":…,"owed_cents":…,
-- "currency":"usd","at":"…"}. Null on every job a card payment has not disagreed with.
--
-- NOT `payment_notes`: that column is printed on the customer's invoice email.
--
-- Written only by the webhook under the service role. The browser already reads
-- bookings through the table-level SELECT and cannot UPDATE any column of it
-- (`20261006040000_bookings_browser_updates_nothing.sql`), so no grant is needed.
--
-- APPLY THIS BEFORE DEPLOYING THE stripe-webhook THAT WRITES IT. In the other order
-- a mismatched payment's write fails, the webhook answers 500 and Stripe retries:
-- the job stays unpaid either way, which is the safe direction.

alter table public.bookings add column if not exists payment_problem jsonb;

comment on column public.bookings.payment_problem is
  'Roadmap 97.10. Why a Stripe card payment did not mark this job paid: the amount '
  'or currency differed from what was owed. Written by stripe-webhook; shown on the job record.';
