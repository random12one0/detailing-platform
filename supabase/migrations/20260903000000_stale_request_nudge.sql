-- ROADMAP 2.12 FOLLOW-UP — NOBODY WAS CHASING AN UNANSWERED REQUEST.
--
-- The owner approved this on 2026-09-03, answering the second of the three
-- questions 2.12 left him. The hole is the one the feature's own promise
-- creates: request mode says the detailer answers, and nothing in the product
-- made them. A request for Friday that was never accepted simply dropped off
-- the Today queue when Friday passed, with the customer never having heard
-- back and the detailer never having been asked.
--
-- IT REUSES THE NUDGE MACHINERY RATHER THAN INVENTING ANY. `bookings` already
-- carries four `*_nudge_sent_at` markers and `business_settings` four lead
-- times, and `send-owner-reminders` already loops over one RPC per kind. This
-- is a fifth of exactly that shape, so the sweep, the marker-guard, the
-- reset-on-reschedule trigger and the manual mode all work on it unchanged.
--
-- WHY A DELAY IN HOURS AND NOT MINUTES, unlike the other four: those four are
-- all about a job that is about to start or has just ended, measured against
-- `start_at`. This one is measured against `created_at` — how long the
-- customer has been waiting — and the unit a detailer thinks in there is
-- "sometime today", not "in forty minutes".

alter table public.business_settings
  -- Hours a request may sit unanswered before the detailer is chased. 0 turns
  -- it off, the same convention every other lead time on this table uses.
  -- 12 is the default because a request that arrives in the evening should be
  -- chased in the morning rather than at midnight, and because a detailer who
  -- answers within half a day is not somebody this needs to nag.
  add column request_nudge_hours integer not null default 12
    check (request_nudge_hours >= 0);

comment on column public.business_settings.request_nudge_hours is
  'Roadmap 2.12 follow-up: hours a booking request may sit unanswered before '
  'the detailer is nudged. 0 = never. Measured from bookings.created_at, not '
  'from start_at, because the question is how long the customer has waited.';

alter table public.bookings
  -- The marker, exactly like the other four. Guarded the same way: the sweep
  -- is idempotent because it only ever picks up rows whose marker is null.
  add column owner_request_nudge_sent_at timestamptz;

-- THE FIFTH DUE-NESS FUNCTION, and it is the four above with two differences:
-- it selects `pending` rather than excluding it, and it measures from
-- `created_at`. The `start_at > now()` guard is what stops it chasing a
-- request whose time has already gone — that is not something to accept any
-- more, it is something to apologise for, and a push saying "accept this"
-- would be wrong.
create or replace function public.get_requests_due_for_nudge()
returns setof public.bookings
language sql
stable
security definer
set search_path = public
as $$
  select b.*
  from public.bookings b
  join public.business_settings s on s.business_id = b.business_id
  where b.status = 'pending'
    and b.deleted_at is null
    and s.request_nudge_hours > 0
    and b.owner_request_nudge_sent_at is null
    and b.start_at > now()
    and b.created_at + make_interval(hours => s.request_nudge_hours) <= now();
$$;

-- Same posture as the other four: the sweep runs with the service role and
-- these are not client surfaces.
revoke execute on function public.get_requests_due_for_nudge() from public, anon, authenticated;
grant execute on function public.get_requests_due_for_nudge() to service_role;
