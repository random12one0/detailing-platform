-- Roadmap 2.18, the last two pieces: a SECOND customer reminder, and the
-- detailer's own words on each email.
--
-- ============================================================================
-- 1. THE SECOND REMINDER
-- ============================================================================
--
-- The owner asked how many reminders and then delegated the number:
-- *"ima do as many emails as you recommend."* The answer is TWO, the second
-- off by default, and the reasoning is in DECISIONS.md — Jobber caps at two
-- and nobody in the six-product sweep offers three; the useful pair for this
-- trade is the evening before (move the car, clear the driveway, find the tap)
-- and about two hours out (not asleep, not at work); and a third costs
-- deliverability for every OTHER email, because sender reputation is shared
-- and the receipt landing in junk is worse than a missed appointment.
--
-- TWO COLUMNS AND A SECOND MARKER, NOT A `booking_reminders_sent` TABLE — and
-- this is a deliberate reversal of what was written earlier the same day.
-- While the count was open-ended ("as many as we want"), a per-(booking, rule)
-- table was the right shape and a marker column genuinely did not generalise.
-- **Once the count is fixed at two, that argument evaporates**: a general
-- table buys extensibility nobody asked for, at the price of a join in the
-- hottest RPC in the product. If a third reminder is ever wanted, THAT is when
-- the table earns its place.
alter table public.business_settings
  add column if not exists customer_reminder_2_enabled      boolean not null default false,
  add column if not exists customer_reminder_2_lead_minutes integer not null default 120
    check (customer_reminder_2_lead_minutes >= 0);

-- Its own marker, for the same reason the first one has one: the sweep runs
-- every ~15 minutes and every send must be idempotent.
alter table public.bookings
  add column if not exists customer_reminder_2_sent_at timestamptz;

-- The second reminder is a SEPARATE RPC rather than a `target` on the existing
-- one, and the difference is not cosmetic.
--
-- `get_bookings_due_for_reminder` carries the EVENING-BEFORE rule: when that
-- rule fires, the reminder is sent at a wall-clock time on the previous day
-- rather than an offset before the start. **The second reminder has no such
-- rule and must not inherit it** — a business that reminds the evening before
-- AND two hours out wants exactly that, not two evening-before sends racing on
-- the same marker.
--
-- It is also strictly ordered after the first: `customer_reminder_sent_at is
-- not null`. A second reminder that arrives before the first one is worse than
-- no second reminder, and on a job booked an hour from now the lead times can
-- otherwise both come due in the same sweep.
create or replace function public.get_bookings_due_for_second_reminder()
returns setof public.bookings
language sql
stable
security definer
set search_path = public
as $$
  select b.*
  from public.bookings b
  join public.business_settings s on s.business_id = b.business_id
  where b.status <> 'cancelled'
    -- ROADMAP 2.12: a `pending` request is not a booking anybody has agreed
    -- to, and telling a customer "your appointment is tomorrow" about one is
    -- the defect that migration went out of its way to prevent. The first
    -- reminder's RPC excludes it and so does this one.
    and b.status <> 'pending'
    and b.deleted_at is null
    and b.start_at > now()
    and b.customer_email is not null
    and s.customer_reminder_2_enabled
    and b.customer_reminder_2_sent_at is null
    and b.customer_reminder_sent_at is not null
    and now() >= b.start_at - make_interval(mins => s.customer_reminder_2_lead_minutes);
$$;

-- ============================================================================
-- 2. THE DETAILER'S OWN WORDS
-- ============================================================================
--
-- The owner asked for "email customizability for each customer", then asked
-- for a block EDITOR, then scrapped it the next message: *"scrap the custom
-- email editor thing / make it a lot more simple."*
--
-- SIMPLE IS WHAT FIVE OF THE SIX PRODUCTS IN THE SWEEP DO: the design is the
-- product's, and the detailer gets to add their own words. One optional
-- paragraph per email kind, rendered in its own block; everything structural —
-- the ground, the logo, the details, the money, the buttons — stays ours.
--
-- ONE JSONB COLUMN, NOT A TABLE. The shape is a dozen optional strings keyed
-- by email kind (`{"reminder": "Please leave the car unlocked…"}`), read on
-- exactly one code path, with no per-row lifecycle of its own. A table would
-- bring an id, a created_at, two RLS policies and a join to fetch a paragraph.
-- `business_settings` already has the policies, and the settings row is
-- already loaded everywhere this is needed.
--
-- **THE MONEY IS NOT A SLOT AND NEVER WILL BE.** Nothing in here can reach the
-- itemisation or the total. Zenbooker — the one product of the six that DOES
-- give a full visual editor — renders its invoice lines as a single variable
-- the editor cannot open, which is the same line drawn independently. CLAUDE.md:
-- a number printed is not a number charged.
alter table public.business_settings
  add column if not exists email_messages jsonb not null default '{}'::jsonb;

-- Keys are template names and values are plain paragraphs. The guard is about
-- SHAPE, not length — an object of strings — because the renderer escapes the
-- value and a detailer who wants three sentences should get three sentences.
alter table public.business_settings
  drop constraint if exists business_settings_email_messages_is_object;
alter table public.business_settings
  add constraint business_settings_email_messages_is_object
  check (jsonb_typeof(email_messages) = 'object');

comment on column public.business_settings.email_messages is
  'Optional per-email paragraph in the detailer''s own words, keyed by template name (confirmation, request_received, reminder, reminder_2, accepted, declined, quote, receipt, invoice, followup, cancelled, rescheduled). The design and the money are not editable.';
