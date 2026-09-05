-- ROADMAP 2.19 — "WANT TO EMAIL SOME OF YOUR OLD CUSTOMERS?"
--
-- THREE COLUMNS, AND EVERY ONE OF THEM IS A LEGAL OR PRODUCT FLOOR RATHER
-- THAN A FEATURE. Nothing here schedules, segments or automates anything: the
-- owner's ruling (2026-09-03) is that a human picks the names and presses
-- send, and *"nothing sends itself"* is the whole design.
--
-- WHY A MANUAL SEND STILL NEEDS MACHINERY, which is the one thing the roadmap
-- entry understates. CAN-SPAM classifies a message by its PRIMARY PURPOSE, not
-- by whether a person or a cron job pressed the button: *"we haven't seen you
-- in a while, come back"* is a commercial email either way. What the manual
-- design removes is the SCHEDULING and the reputation problem of a blast —
-- it does not remove the two things the statute actually requires of every
-- commercial message:
--
--   * a working opt-out, honoured for at least 30 days   -> customers.unsubscribed_at
--   * a valid physical postal address in the message     -> businesses.mailing_address
--
-- The third column is a product one: a prompt that never goes quiet becomes
-- wallpaper, so the dashboard nudge steps back for a month after a send.
--
--   * when this business last emailed anybody             -> businesses.last_campaign_at
--
-- WHY `last_campaign_at` IS ON `businesses` AND NOT ON `business_settings`.
-- Since roadmap 2.13 `business_settings` is readable only with the `settings`
-- permission, and the nudge belongs to whoever holds `marketing` — a member
-- who has been given promotions and nothing else would have found the row
-- invisible. `businesses` is member-readable, which is what the nudge needs.

alter table public.customers
  add column if not exists unsubscribed_at timestamptz;

comment on column public.customers.unsubscribed_at is
  'When this customer asked to stop receiving marketing email. NULL = never. '
  'Set by the public `unsubscribe` edge function; read by `send-campaign`, '
  'which excludes anyone with a value here. It does NOT stop transactional '
  'mail — a confirmation, reminder or receipt for a booking they made is '
  'exempt from opt-out and must still reach them.';

alter table public.businesses
  add column if not exists mailing_address text;

comment on column public.businesses.mailing_address is
  'The postal address printed at the bottom of marketing email, required by '
  'CAN-SPAM. Deliberately separate from `dropoff_address`: a mobile detailer '
  'has no unit, and this may be a PO box or a private mailbox. `send-campaign` '
  'refuses to send without it.';

alter table public.businesses
  add column if not exists last_campaign_at timestamptz;

comment on column public.businesses.last_campaign_at is
  'When this business last sent a manual re-book email. Written by '
  '`send-campaign` with the service key. The dashboard nudge reads it and '
  'stays quiet for 30 days afterwards.';
