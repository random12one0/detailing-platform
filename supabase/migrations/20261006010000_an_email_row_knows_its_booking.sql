-- ROADMAP 3.1 — AN EMAIL ROW NOW KNOWS WHICH BOOKING IT IS ABOUT.
--
-- 3.1 asks for the delivery list "linked to message, booking, detailer and
-- recipient". 14.3 built three of those four: `email_sends` already carries the
-- provider's message id, the business and the customer. **The booking was the
-- one it could not carry, and 3.1's own entry says why in plain words — "the
-- relay is never told which booking it is sending about".**
--
-- That is a fact about the PLUMBING rather than about the schema. Every
-- booking-related sender has the booking row in hand when it composes the mail
-- — `create-booking`, `respond-to-booking`, `cancel-booking` and the rest all
-- read it to build the email in the first place — and then threw the id away at
-- the relay boundary, because `sendTenantEmail` had nowhere to put it.
--
-- ---------------------------------------------------------------------------
-- WHY A COLUMN AND NOT A JOIN
-- ---------------------------------------------------------------------------
-- There is no join that recovers this. A row carries `to_email` and `subject`,
-- so the nearest guess would be "the booking belonging to this customer whose
-- confirmation has a matching subject, around this time" — which is wrong the
-- moment a customer books twice, and wrong in a way that shows a detailer the
-- wrong appointment with a straight face. **A link that is usually right is
-- worse here than no link**, because the screen it feeds is the one a person
-- consults when they already suspect something went astray.
--
-- ---------------------------------------------------------------------------
-- NULLABLE, AND THE NULLS ARE NOT A BACKLOG
-- ---------------------------------------------------------------------------
-- Plenty of mail this product sends is about no booking at all: the invite to a
-- new user, the platform's own dead-man's-switch, a detailer's campaign to a
-- whole customer list, the plan link. Those rows are correct with a null, the
-- same way `business_id` is correctly null for platform mail and `customer_id`
-- is correctly null for an owner alert. **A later count of nulls here is not a
-- measure of unfinished work**, and anybody tempted to add a `not null`
-- should read the four senders above first.
--
-- Every row written before this migration is also null, for the ordinary reason
-- that nothing could have filled it. They are history, not a gap to backfill:
-- the guess that would be needed to populate them is the same wrong guess the
-- section above rejects.
--
-- ---------------------------------------------------------------------------
-- `on delete set null`, DELIBERATELY, AND NOT `cascade`
-- ---------------------------------------------------------------------------
-- `business_id` cascades because an email that belonged to a deleted business
-- belongs to nobody. A booking is different: **the email was still sent, the
-- customer still received it, and the delivery outcome is still a true fact
-- about this product's behaviour.** Cascading would delete the evidence that a
-- confirmation bounced because somebody later removed the appointment it was
-- about — which is precisely the sequence a detailer would want to look at.
-- `customer_id` already made this same choice for the same reason.
--
-- ---------------------------------------------------------------------------
-- STILL READ-ONLY TO EVERY BROWSER
-- ---------------------------------------------------------------------------
-- This adds a column to a table whose policy is `for select` only, and it adds
-- no policy. The service role writes it from `send-email`; a detailer's browser
-- can read it and cannot write it, exactly as before. **RLS chooses rows and
-- never columns**, so there is nothing here that needs a new policy and
-- anything that looked like one would be widening write access by accident.

alter table public.email_sends
  add column if not exists booking_id uuid
    references public.bookings(id) on delete set null;

-- THE BACK OFFICE'S OWN QUESTION, WHICH IS NOT THE CUSTOMER RECORD'S.
--
-- The two indexes 14.3 created answer "the last few emails to this person" and
-- "the last few emails this business sent". 3.1's back-office list asks a third
-- thing — "everything that happened to the mail about THIS booking" — and
-- without an index that is a scan of every send a business has ever made to
-- find the handful about one appointment.
--
-- Partial, on purpose: the null rows are the campaign and platform mail that
-- this question never asks about, and leaving them out keeps the index the size
-- of the bookings that actually generated email rather than the size of the
-- table.
create index if not exists email_sends_booking_idx
  on public.email_sends (booking_id, sent_at desc)
  where booking_id is not null;

comment on column public.email_sends.booking_id is
  'ROADMAP 3.1 - the booking this email was about, threaded from the sender '
  'through sendTenantEmail and the send-email relay. NULL is correct for every '
  'email that is not about one booking: invites, campaigns, plan links and '
  'platform mail. Never backfilled - see the migration header.';
