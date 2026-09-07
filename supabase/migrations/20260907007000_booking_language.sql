-- ROADMAP 8.17 STAGE 2A — WHAT LANGUAGE THIS BOOKING'S EMAILS GO OUT IN.
--
-- Stage 1 put Spanish on the booking page and stage 1b on the plan pages. The
-- choice lives in `dp.lang`, which is a fact about a BROWSER — and an email is
-- sent hours later by an edge function that has no browser, so there is
-- nothing there to read.
--
-- **SO THE LANGUAGE IS A FACT ABOUT THE BOOKING AND IT IS STORED ON IT.**
-- Somebody who filled the form in Spanish gets their confirmation, their
-- reminder, their receipt and their reschedule notice in Spanish, from any
-- machine, for ever — including after they clear their browser. The
-- alternative was `customers.lang`, and it is wrong for a reason worth
-- writing down: a household can share an address, and the person who booked
-- is the person who chose.
--
-- **`en` IS THE DEFAULT AND EVERY EXISTING ROW TAKES IT**, which is exactly
-- what those bookings were made in. Nothing moves.
--
-- **AND IT IS A CHECK CONSTRAINT RATHER THAN A CONVENTION.** A typo'd `'ES'`
-- would fall through every catalogue lookup and send a perfectly formed
-- English email to somebody who asked for Spanish — a silent wrong answer, and
-- the one failure mode this whole item is shaped around, because the person
-- who could notice it cannot read the output.

alter table public.bookings
  add column if not exists lang text not null default 'en'
    check (lang in ('en', 'es'));

comment on column public.bookings.lang is
  'ROADMAP 8.17 — the language THIS booking''s customer emails are sent in, '
  'chosen on the booking page. Never a fact about the customer: a household '
  'shares an address and the person who booked is the person who chose. '
  'Detailer-facing mail (the owner alert, the stale-request nudge, billing) '
  'ignores this column — that audience is the dashboard''s language, which is '
  'stage 2b.';
