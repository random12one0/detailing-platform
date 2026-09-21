-- ROADMAP 2.3 — A CUSTOMER PICKS THEIR OWN TRAVEL ZONE, AND NOTHING CHECKS
-- IT AGAINST THE ADDRESS THEY TYPED.
--
-- Found scoping 2.3 (the "far-away address, no travel charge" item),
-- 2026-09-20. `StepLocation.jsx`'s own 2026-08-31 comment already says why
-- there is no real check: "This is NOT geocoded distance — we have no way
-- to measure one — it is the detailer's own areas in their own words." A
-- customer in San Diego can pick a zone named "Long Beach" off the list and
-- pay whatever that zone charges. Nothing anywhere notices.
--
-- **REAL DISTANCE PRICING IS NOT BUILT HERE, AND IT IS NOT A BUG FIX.** The
-- business has no stored location to measure from, and a "zone" is a name
-- and a flat fee with no shape on a map — building it means a new column
-- for where the detailer works and a real decision about what a zone means
-- geographically. That is a product decision about how a customer is
-- charged, put to Andrew in FOR-ANDREW.md, not guessed at in a migration.
--
-- **THIS IS THE SMALLER, HONEST HALF: A FLAG, NOT A PRICE AND NOT A GATE.**
-- Same shape as `address_source` (2.8, the migration above this one): does
-- the picked zone's own name show up anywhere in the address text. Crude on
-- purpose — `_shared/pricing.ts`'s `zoneAddressMismatch` compares words, not
-- coordinates, so it catches an address that flatly contradicts the zone
-- and will not catch a street twenty miles off inside a correctly-named
-- city. Andrew, 2026-09-20: "That is still the difference between a
-- detailer finding out before they drive and finding out when they
-- arrive." A silent `false` is not a promise the address is close.
--
-- **A LABEL, NEVER A GATE, SAME RULING AS 2.8 AND FOR THE SAME REASON.**
-- Nothing here refuses a booking or changes a price. It travels to the job
-- record and the owner's alert — the two places a detailer decides whether
-- to drive out — and nowhere else; unlike `address_source`, the customer's
-- own manage page does not print this, because the mismatch is a fact
-- about their OWN pricing choice, not something they can act on by seeing
-- it stated back at them.
--
-- ADDITIVE ONLY. A new column with no default and no backfill, computed only
-- at the moment a booking is created: no existing row is read, rewritten or
-- locked beyond the catalogue change.

alter table public.bookings
  add column travel_zone_address_mismatch boolean;

comment on column public.bookings.travel_zone_address_mismatch is
  'ROADMAP 2.3: true when the customer''s picked travel zone name does not '
  'appear anywhere in the address they typed or picked. Computed once at '
  'create-booking from zoneAddressMismatch() in _shared/pricing.ts — words, '
  'never distance. NULL means not applicable (drop-off, no address, or no '
  'zones configured), never "checked and fine". A LABEL, never a gate: '
  'nothing refuses or reprices a booking on this column, and nothing should '
  'start. Travels to the job record and the owner''s alert only, not the '
  'customer''s own manage page.';
