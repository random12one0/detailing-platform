-- ROADMAP 2.8 — AN ADDRESS THAT WAS NEVER FOUND HAS TO SAY SO.
--
-- **Measured 2026-09-20, with one real booking, before this was written.**
-- `99999 Nonexistent Parkway, Nowhere Township, ZZ 00000` went through the
-- whole flow and came out the other side stated as fact: on the review step,
-- on the confirmation screen, on the customer's manage page, in every email,
-- and on the detailer's job record beside a Navigate button that hands it
-- straight to a maps URL. Nothing refused it and nothing marked it.
--
-- **The reason nothing noticed is that nothing had a motive to.** The travel
-- fee comes from a zone the CUSTOMER picks off a list, not from the address,
-- so no price, no slot and no validation anywhere in the stack ever had to
-- resolve it. `create-booking` trims the string and stores it.
--
-- **AND THE FACT DIED ONE STEP AFTER IT WAS KNOWN.** The booking page tells
-- the truth exactly once — *"No matches. We will use the address as you typed
-- it."* — at the box. Then `AddressField` calls the same `onChange` with the
-- same kind of string whether the customer picked a suggestion or typed it,
-- so by the review step the page has already forgotten, and there has never
-- been a column here that could have held it.
--
-- ANDREW'S RULING, 2026-09-20, given before this was built:
--
--   "Do NOT refuse hand-typed addresses. People live in new builds and
--    apartments the lookup has never heard of, and refusing them loses Andrew
--    a real customer to protect him from a rare bad one. Instead the address
--    has to carry the fact that it was never verified, all the way to wherever
--    the detailer reads it before driving out. An honest label beats a locked
--    door."
--
-- So this is a LABEL, not a gate. Nothing in the product refuses a booking on
-- this column and nothing should start.
--
-- **NULL IS AN HONEST ANSWER AND THE COMMONEST ONE.** Every booking that
-- already exists has it, because nobody was recording this when they were
-- made; so does every drop-off booking, which has no customer address at all;
-- and so does a returning customer whose address was filled in from their last
-- visit and never touched. **Null means "we do not know", and a screen must
-- print nothing rather than guess** — claiming an address was verified when
-- nobody checked is the same class of lie this whole item is about, pointed
-- the other way.
--
-- ADDITIVE ONLY. A new column with no default and no backfill: no existing row
-- is read, rewritten or locked beyond the catalogue change, which is what made
-- it safe to run while another session was mid-measurement.

alter table public.bookings
  add column address_source text;

alter table public.bookings
  add constraint bookings_address_source_known
  check (address_source is null or address_source in ('picked', 'typed'));

comment on column public.bookings.address_source is
  'How the customer''s address was arrived at: ''picked'' from a lookup '
  'suggestion, ''typed'' by hand with no match. NULL means nobody recorded it '
  '— every booking made before 2026-09-20, every drop-off booking, and any '
  'address carried over from a previous visit. A LABEL, never a gate: '
  'ROADMAP 2.8, Andrew''s ruling, an honest label beats a locked door.';
