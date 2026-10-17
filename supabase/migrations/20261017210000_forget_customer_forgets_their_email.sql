-- ROADMAP 97.20 — "DELETE FOR GOOD" NOW FORGETS THE CUSTOMER'S EMAIL TOO (S-M6).
--
-- `forget_customer` (20260907001000) was written nine days before `email_sends`
-- existed (20260916010000), so it never touched it. Since 3.1d
-- (20261010010000) every row there keeps `body_html`, the email exactly as
-- sent — the customer's name, address and phone — beside `to_email`, their
-- address. The privacy page says a deleted customer "is deleted"; until this
-- migration the mail log still held every message ever sent to them, and the
-- owner's "New booking: <name>, …" alert kept their name in its SUBJECT.
--
-- ---------------------------------------------------------------------------
-- BLANKED IN PLACE, NOT DELETED — THE SAME SENTENCE AS THE BOOKINGS.
-- ---------------------------------------------------------------------------
-- 20261006010000 chose `on delete set null` for `email_sends.booking_id`
-- because "the email was still sent … and the delivery outcome is still a true
-- fact". So the ROW stays (status, provider id, when) and everything about the
-- person goes: the body, the subject, the customer link — and, on a row that
-- was sent TO them (any row not addressed to the team, below), the address and
-- the provider's `detail`, which can quote it. A row sent to somebody else about their booking (the owner's alert)
-- keeps its own recipient: that address is the detailer's, and
-- `useOwnAlertBounces` reads it to warn them their alerts are bouncing.
--
-- WHICH ROWS ARE "THEIRS", all inside `p_business_id`:
--   · `customer_id` is this customer;
--   · `booking_id` is one of their bookings — the owner and staff alerts,
--     whose `customer_id` is correctly NULL;
--   · `customer_id` is NULL and `to_email` is their address — mail sent before
--     the address matched a customer row.
-- A row linked to a DIFFERENT customer is never touched, even at the same
-- address: it is that person's mail too.
--
-- THE BUSINESS'S OWN ADDRESSES ARE NEVER "THEIRS" — review, 2026-10-17.
-- `send-email` links a row to whichever customer has the recipient's address,
-- so a detailer who once booked themselves (the commonest test there is) has a
-- customer row at their OWN address, and every alert and digest they were ever
-- sent carries that customer's id. Matching on `customer_id` alone made
-- deleting that test customer wipe the owner's whole alert history about
-- everybody. So mail to a team address — `businesses.contact_email`,
-- `business_settings.notification_emails`, `business_users.email` — is
-- matched ONLY by booking, and even then keeps its recipient and `detail`:
-- it is the detailer's mail about this customer, not the customer's mail.
--
-- AND IT STAYS BLANK. A send still in flight when the customer is deleted gets
-- its outcome later from `resend-webhook`, which writes `status` and
-- `detail` by provider id — and a bounce reason can quote the address.
-- `email_sends_stay_forgotten` (below) holds a forgotten row's address,
-- subject, body, link and (on mail that was to them) `detail` blank through
-- any later update, and lets `status` through.
--
-- THE ORDER MATTERS AND IS THE ONE THING THIS CAN GET QUIETLY WRONG: the email
-- step runs BEFORE the bookings are anonymised, because finding "their
-- bookings" needs `bookings.customer_id`, which the next statement clears.
--
-- Everything else in the function is 20260907001000's, unchanged.
-- `tests/forget-customer-sql.test.mjs` replays both on PGlite;
-- `tests/customer-data-inventory.test.mjs` is the list of every table with a
-- customer-identifying column, so the next table cannot be missed the way this
-- one was.

create or replace function public.forget_customer(
  p_business_id uuid,
  p_customer_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name     text;
  v_email    text;
  v_bookings integer := 0;
  v_photos   integer := 0;
  v_emails   integer := 0;
  v_alerts   integer := 0;
  v_team     text[];
begin
  -- BOTH IDS, ALWAYS. A customer id alone would let a caller that got the
  -- business wrong erase somebody in another tenant, and this function runs as
  -- the service role with no RLS above it to catch that.
  select name, nullif(lower(btrim(email)), '') into v_name, v_email
  from public.customers
  where id = p_customer_id and business_id = p_business_id;

  if v_name is null then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;

  select coalesce(array_agg(distinct a) filter (where a <> ''), '{}') into v_team
  from (
    select lower(btrim(contact_email)) a from public.businesses where id = p_business_id
    union all
    select lower(btrim(x)) from public.business_settings s, unnest(s.notification_emails) x
    where s.business_id = p_business_id
    union all
    select lower(btrim(email)) from public.business_users where business_id = p_business_id
  ) t;

  delete from public.job_photos
  where business_id = p_business_id
    and booking_id in (
      select id from public.bookings
      where business_id = p_business_id and customer_id = p_customer_id
    );
  get diagnostics v_photos = row_count;

  -- 97.20. BEFORE the bookings update below, which clears the customer_id this
  -- needs to find their bookings.
  -- Mail to anybody but the team: theirs if linked to them, about their
  -- booking, or unlinked and sent to their address. Every such row was sent TO
  -- them — including at an address typed on a booking that is not the one on
  -- their record — so the recipient and the provider's words go too.
  update public.email_sends e
  set to_email    = 'Deleted customer',
      detail      = null,
      subject     = 'Deleted customer',
      body_html   = null,
      customer_id = null
  where e.business_id = p_business_id
    and not (lower(btrim(e.to_email)) = any (v_team))
    and (
      e.customer_id = p_customer_id
      or e.booking_id in (
        select id from public.bookings
        where business_id = p_business_id and customer_id = p_customer_id
      )
      or (e.customer_id is null and v_email is not null and lower(btrim(e.to_email)) = v_email)
    );
  get diagnostics v_emails = row_count;

  -- Mail to the team: only what was about their bookings, and the recipient
  -- and `detail` stay — they are the team's own.
  update public.email_sends e
  set subject     = 'Deleted customer',
      body_html   = null,
      customer_id = null
  where e.business_id = p_business_id
    and lower(btrim(e.to_email)) = any (v_team)
    and e.booking_id in (
      select id from public.bookings
      where business_id = p_business_id and customer_id = p_customer_id
    );
  get diagnostics v_alerts = row_count;
  v_emails := v_emails + v_alerts;

  -- THE ANONYMISATION. Every money column is untouched on purpose; the only
  -- thing this statement can change is who the row was for.
  update public.bookings
  set customer_id     = null,
      customer_name   = 'Deleted customer',
      customer_phone  = '',
      customer_email  = null,
      customer_address = null,
      customer_notes  = null,
      admin_notes     = null
  where business_id = p_business_id and customer_id = p_customer_id;
  get diagnostics v_bookings = row_count;

  -- Cascades take `plan_members` and `maintenance_deadlines` with it.
  delete from public.customers
  where id = p_customer_id and business_id = p_business_id;

  return jsonb_build_object(
    'ok', true,
    'name', v_name,
    'bookings_anonymised', v_bookings,
    'photos_deleted', v_photos,
    'emails_forgotten', v_emails
  );
end;
$$;

revoke all on function public.forget_customer(uuid, uuid) from public, anon, authenticated;
grant execute on function public.forget_customer(uuid, uuid) to service_role;

-- A FORGOTTEN ROW STAYS FORGOTTEN. `resend-webhook` updates `status` and
-- `detail` by provider id after the fact; this keeps everything about the person
-- blank through that and any other later write. The marker is the pair this
-- function writes and no sender does: subject 'Deleted customer' with no body.
create or replace function public.email_sends_stay_forgotten()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.subject = 'Deleted customer' and old.body_html is null then
    new.subject     := old.subject;
    new.body_html   := null;
    new.customer_id := null;
    if old.to_email = 'Deleted customer' then
      new.to_email := old.to_email;
      new.detail   := null;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists email_sends_stay_forgotten on public.email_sends;
create trigger email_sends_stay_forgotten
  before update on public.email_sends
  for each row execute function public.email_sends_stay_forgotten();

comment on function public.forget_customer(uuid, uuid) is
  'Roadmap 8.11, 97.20. Forgets the PERSON and keeps the MONEY: bookings are anonymised in place so every figure on every money screen is unchanged; their email_sends rows keep their delivery outcome and lose the body, subject, customer link and (when sent to them) the address; the customer row, their plan memberships, their maintenance deadlines and their job photos go. Service role only — who may do it is decided in the delete-customer edge function.';
