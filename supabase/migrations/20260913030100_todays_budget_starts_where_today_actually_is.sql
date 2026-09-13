-- THE NEW BUDGET COLUMN STARTS AT ZERO ON A DAY THAT IS ALREADY AT 94.
--
-- `claimed` was added minutes ago with `default 0`, which is right for every
-- past day and **wrong for the day the migration lands on**. Today's row reads
-- `sent 84, failed 10, claimed 0`, so the gate would have allowed another 80
-- tenant emails on top of the 94 already spent — 174 attempts against a cap of
-- 100 — and the reserve it is there to protect would not have existed until
-- midnight UTC.
--
-- **A GATE THAT IS OFF FOR ITS FIRST SEVENTEEN HOURS IS THE FAILURE IT WAS
-- BUILT TO PREVENT.** Andrew's sentence was *"make it impossible"*, not "make
-- it impossible from tomorrow".
--
-- `sent + failed` IS THE RIGHT SEED because both are counted only after a real
-- call to the provider — the reserved-domain and missing-key exits return before
-- `note_email_send` — so the sum is exactly the number of attempts that reached
-- Resend. It can only under-count (a crash between the call and the count), and
-- under-counting is the safe direction for a backfill: the provider's own 429
-- is still the backstop.
--
-- **ONLY WHERE `claimed` IS STILL 0**, so re-running this cannot double a day
-- that has since been counted properly.

update public.platform_email_days
   set claimed = sent + failed
 where claimed = 0
   and sent + failed > 0;
