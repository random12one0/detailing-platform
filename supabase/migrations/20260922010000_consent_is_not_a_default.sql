-- TEXTING, STEP ONE — WHO MAY BE TEXTED, AND HOW WE KNOW.
--
-- `TEXTING.md` § 3 carries the reasoning; this is the three columns it asks
-- for. Nothing here sends anything, and nothing here can: no number is bought,
-- no 10DLC campaign exists, and `TELNYX_API_KEY` is an empty named box.
--
-- ---------------------------------------------------------------------------
-- WHY `customers.unsubscribed_at` IS NOT THE ANSWER — established from the
-- code rather than assumed
-- ---------------------------------------------------------------------------
-- That column is written in exactly one place (`unsubscribe/index.ts`), reached
-- from a link in an EMAIL footer, on a page whose own header calls it "stop
-- getting emails like this". It is read in exactly one place (`send-campaign`),
-- to filter an email list. It is a fact about email, collected through email.
--
-- **And the two channels are opposite in law, which is what decides the
-- shape.** CAN-SPAM is opt-OUT: everybody is in until they leave, so one
-- nullable timestamp is the whole model. The TCPA is opt-IN: nobody is in until
-- they said so, and a text to somebody who did not is $500-$1,500 in statutory
-- damages per message. A column that means "they have not left yet" cannot be
-- read as "they asked to be texted" — that is the same word standing for two
-- opposite defaults, on the one channel where being wrong carries a fine.
--
-- ---------------------------------------------------------------------------
-- THREE COLUMNS, NOT ONE, BECAUSE "NEVER SAID YES" AND "SAID STOP" ARE
-- DIFFERENT FACTS
-- ---------------------------------------------------------------------------
-- The first is a gap a detailer may close by asking. The second is a decision
-- to respect for ever. Collapsing them into one nullable timestamp would make
-- a screen unable to tell a customer nobody has asked from a customer who has
-- answered, and the only safe way to draw that is to treat both as "do not
-- text" — which quietly turns every unasked customer into an opt-out and hides
-- the ask that would have fixed it.
--
-- The email side already learned this distinction the expensive way and keeps
-- both kinds: `email_failed_at` CLEARS itself on the next good send, because
-- otherwise a detailer who corrects a typo is told for ever that the address
-- they just fixed is broken; `unsubscribed_at` never clears, because a person
-- who left decided that. `sms_stopped_at` is the second kind.

alter table public.customers
  -- WHEN they agreed. NULL means nobody has ever asked them, which is the
  -- state every existing row is in and the honest one: this product has never
  -- put the question on a screen until today.
  add column if not exists sms_consent_at timestamptz,

  -- WHERE the agreement came from. It earns its own column because consent is
  -- the thing you would have to PROVE, and a bare timestamp proves nothing
  -- about where it came from: a tick the customer made themselves and a box a
  -- detailer ticked on their behalf are different evidence, and only one of
  -- them is the customer's own act.
  --
  -- 'booking_form'  the customer ticked it themselves on the booking page.
  -- 'owner_entered' a detailer asserted it when adding the customer by hand.
  -- 'reply_start'   they texted START to the business's number.
  add column if not exists sms_consent_source text
    check (sms_consent_source is null
      or sms_consent_source in ('booking_form', 'owner_entered', 'reply_start')),

  -- THEY TEXTED STOP. Written by the inbound webhook when it exists, and never
  -- cleared by this product — only by the customer texting START, which is the
  -- one act that means what clearing it would mean.
  add column if not exists sms_stopped_at timestamptz;

-- THE ONE QUESTION EVERY SEND WILL ASK, ANSWERED BY AN INDEX RATHER THAN A
-- SCAN. "May I text this person" is `sms_consent_at is not null and
-- sms_stopped_at is null`, and it is asked once per message on a table that
-- grows with every customer of every tenant.
--
-- PARTIAL, on the rows that can be texted at all. Today that is zero rows,
-- which costs nothing to keep; the alternative indexes every customer in the
-- product to answer a question about the few who said yes.
create index if not exists customers_sms_reachable_idx
  on public.customers (business_id)
  where sms_consent_at is not null and sms_stopped_at is null;

comment on column public.customers.sms_consent_at is
  'When this customer agreed to be texted. NULL means never asked. NOT the same fact as unsubscribed_at, which is about email — see TEXTING.md section 3.';
comment on column public.customers.sms_stopped_at is
  'They texted STOP. Never cleared by the product; only START clears it.';
