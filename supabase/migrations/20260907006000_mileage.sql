-- ROADMAP 8.19 — A MILEAGE LOG PER JOB. Idea 07, and he said yes to it:
-- *"They could have a way to log mileage. I think that'd be cool."*
--
-- ---------------------------------------------------------------------------
-- WHY A DETAILER LOGS MILES AT ALL, WHICH DECIDES EVERY CHOICE BELOW.
-- ---------------------------------------------------------------------------
-- It is a TAX DEDUCTION. A mobile detailer drives to the customer, and the IRS
-- standard mileage rate turns those miles into money off their bill — but only
-- if there is a contemporaneous record. So the thing that has to work is not
-- the field, it is the YEAR TOTAL reaching the accountant, and that is why
-- 8.19 also puts a Miles column in `lib/accountant-export.js`.
--
-- **WHOLE MILES, NOT A DECIMAL.** Nobody reads an odometer to a tenth on the
-- way home from a job, and a `numeric` column invites a precision the source
-- does not have.
--
-- **NULL IS "NOT LOGGED", AND IT IS NOT ZERO.** A detailer who does not use
-- this at all must not have a column full of noughts that reads as "I drove
-- nowhere all year" to anybody totalling it. Zero is a real answer — a
-- drop-off job at their own unit — and the two have to stay tellable apart.
--
-- **THE CEILING IS 2,000 AND IT IS A TYPO GUARD, NOT A POLICY.** The realistic
-- worst case is a rural mobile detailer with a long round trip; the realistic
-- failure is a thumb entering an ODOMETER READING (187,432) into a box asking
-- for a trip. Without the check that one row becomes the year's deduction.
alter table public.bookings
  add column if not exists miles integer
    check (miles is null or (miles >= 0 and miles <= 2000));

comment on column public.bookings.miles is
  'Round-trip miles driven for this job, whole miles, entered by the detailer when they finish it. NULL means not logged and is NOT zero. It is a tax record, never money: it must never enter a total, a quote or an invoice. Roadmap 8.19.';

-- **NO NEW POLICY AND NO NEW GRANT, ON PURPOSE.** `bookings` is already
-- writable by a member of the business through `update-booking`, which is the
-- only door; adding a column to a table whose policies already say "one
-- business, always" changes nothing about who can reach it. A `grant update
-- (miles)` here would be the *wrong* instinct twice over — the table-level
-- grant already covers it, and 20260907003000 is the migration that found
-- every column-level revoke in this repo inert for exactly that reason.
