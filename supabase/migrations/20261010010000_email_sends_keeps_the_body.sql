-- ROADMAP 3.1d — A SENT EMAIL KEEPS ITS BODY, SO THE MAIL LOG CAN SHOW IT.
--
-- This REVERSES a decision in 20260916010000_every_email_leaves_a_row.sql, which
-- said the body "is deliberately not stored" because it is reproducible from the
-- template and the booking. Andrew reviewed the mail log on 2026-10-09 and asked
-- for the opposite: *"click it and see a little preview of the email, what it
-- looked like, all the information."* A re-render is not "as sent" — templates
-- change after the fact — so the sent HTML is kept. The earlier migration is
-- append-only and is not edited; this is the reversal, in the open.
--
-- WHAT THIS ADDS TO THE LEAK SURFACE: nothing new in kind. The body holds the
-- customer's name, address and phone, which `email_sends.to_email` already sits
-- beside, and the table's one policy (`email_sends_tenant_select`, scoped by
-- `current_business_ids()`) already decides who can read a row. A detailer's
-- browser still cannot insert, update or delete. The list screens never select
-- this column; only the preview does, one row at a time.
--
-- NULL IS A REAL ANSWER: every row sent before this migration has no body and
-- never will, and the preview says so instead of opening empty. No backfill.
alter table public.email_sends add column body_html text;

comment on column public.email_sends.body_html is
  'ROADMAP 3.1d — the HTML exactly as handed to the provider, capped at 200000 '
  'characters. NULL for every send made before this column existed.';
