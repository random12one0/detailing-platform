-- ROADMAP 8.4 — "the brand shouldn't assume anything… everything should just
-- be blank off start."
--
-- **THIS IS A MIGRATION AND NOT A FORM CHANGE, AND THAT IS THE WHOLE POINT.**
-- `mobile_enabled` and `dropoff_enabled` were `boolean not null default true`
-- (20260827000100_tenant_core.sql:72-73), so **"I do both" and "nobody has
-- ever been asked" were the identical two rows.** No screen could tell them
-- apart because there was nothing to tell apart, which is why
-- `app/src/lib/setup.js` records *where you work* as the one first-run step
-- that can never be derived. Making the columns nullable is what creates the
-- third state the product has been missing.
--
-- **EXISTING ROWS ARE NOT TOUCHED.** Dropping `not null` and the default
-- changes what a row STARTS as, never what one already holds — so every
-- business that exists today keeps exactly the modes it has and no live
-- booking page changes. `newBusiness.ts` inserts only `business_id`, so from
-- here a new business genuinely starts blank.
--
-- **HE DECIDED THE CONSEQUENCE: A BUSINESS THAT HAS NOT ANSWERED IS NOT
-- BOOKABLE.** That half needs no code and is worth saying out loud, because it
-- is the kind of fact that gets "tidied" away by somebody who cannot see it:
--
--   * `_shared/slotValidation.ts` refuses `mobile` when `mobile_enabled` is
--     falsy and `dropoff` when `dropoff_enabled` is falsy, so with both null
--     **every service type is refused** — and that is the gate every one of
--     create-, reschedule- and update-booking passes through.
--   * `available-slots` computes `isDropoff = !mobile_enabled || …` and
--     `isMobile = !dropoff_enabled || …`, and skips any slot where both are
--     true. With both null that is every slot, so **the day comes back empty.**
--
-- NULL is therefore already enforced end to end, by arithmetic rather than by
-- a rule anybody wrote. What the product owes is not enforcement but an
-- EXPLANATION at both ends: a customer told the detailer is still setting up
-- rather than shown an empty calendar, and a detailer warned before they share
-- a link that cannot take a booking.
--
-- **A THIRD COLUMN WAS CONSIDERED AND REFUSED.** `modes_answered boolean`
-- would have kept the two booleans honest-looking while putting the real
-- answer somewhere else — and then `slotValidation` and `available-slots`
-- would each have had to learn about it, or keep believing a `true` that means
-- nothing. Three states in the column that already decides is one fact in one
-- place.

alter table public.business_settings
  alter column mobile_enabled  drop default,
  alter column mobile_enabled  drop not null,
  alter column dropoff_enabled drop default,
  alter column dropoff_enabled drop not null;

comment on column public.business_settings.mobile_enabled is
  'Do they come to the customer? NULL means nobody has been asked yet — roadmap 8.4. A business with both this and dropoff_enabled unanswered cannot be booked at all: slotValidation refuses every service type and available-slots returns no slots. Never default it to true again.';

comment on column public.business_settings.dropoff_enabled is
  'Does the customer come to them? NULL means nobody has been asked yet — roadmap 8.4. See mobile_enabled.';
