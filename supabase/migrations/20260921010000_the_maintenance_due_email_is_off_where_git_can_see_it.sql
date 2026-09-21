-- ROADMAP 3.4 finding A — the "your coating is due" email gets its own off
-- switch, defaulting OFF, and the ordinary reminder switch can no longer
-- turn it on.
--
-- WHY THIS EXISTS AS A COLUMN RATHER THAN AS A DECISION SOMEBODY REMEMBERS.
-- Andrew's ruling is binding and predates this file: **no marketing email,
-- ever — email is receipts, reminders and alerts, and anything that sells
-- goes by text.** The "your coating is due" email is off under that ruling,
-- and `docs/MANAGER-CLOSE-2026-09-21.md` records it as off.
--
-- It was not off. Read in the sender on 2026-09-21, the ONLY thing gating
-- `maintenanceDueEmail` was `email_customer_reminder`
-- (`send-owner-reminders/index.ts`) — the same switch that controls ordinary
-- appointment reminders. A detailer who wanted reminders got the sales email
-- with them. The template asks the customer to "Book it in" for a service
-- they have not bought, and the sender's own comment states the intent:
-- *"the email that gets the job booked is the one with the booking link in
-- it."*
--
-- And it is not hypothetical. The Supabase cron list for this project was
-- read on 2026-09-21: `send-owner-reminders-sweep` is ACTIVE on
-- `*/15 * * * *` and last ran 2026-09-21 01:00:00 Pacific. Every fifteen
-- minutes, against live data.
--
-- **A RULING THAT LIVES ONLY IN A CHAT LOG IS THE EXACT CLASS OF FACT
-- `MANAGER-CLOSE` EXISTS BECAUSE OF.** This puts it where `git log` can see
-- it: a future session reading the source now finds something that forbids
-- the send, rather than finding nothing and reasonably concluding it is
-- allowed.
--
-- DEFAULT FALSE, AND THAT IS THE WHOLE POINT. Every other email switch on
-- this table defaults true, because every other one is transactional and a
-- business that wants email wants those. This one defaults off for every
-- existing row and every future one. Turning it on is a deliberate act that
-- nothing in the product currently performs — no dashboard control writes
-- this column, on purpose: exposing a toggle would hand back the decision
-- Andrew already made, and whether a detailer may ever switch it on is his
-- call and not this migration's.
--
-- APPEND-ONLY, like every migration here. No existing migration was edited.
alter table public.business_settings
  add column if not exists email_customer_maintenance_due boolean not null default false;

comment on column public.business_settings.email_customer_maintenance_due is
  'ROADMAP 3.4 finding A. The "maintenance due" email SELLS a service the '
  'customer has not bought, so it is off by default under Andrew''s '
  'no-marketing-email ruling and is deliberately independent of '
  'email_customer_reminder. Do not fold this back into that switch.';
