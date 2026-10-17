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
-- was sent TO them, the address and the provider's `detail`, which can quote
-- it. A row sent to somebody else about their booking (the owner's alert)
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

  delete from public.job_photos
  where business_id = p_business_id
    and booking_id in (
      select id from public.bookings
      where business_id = p_business_id and customer_id = p_customer_id
    );
  get diagnostics v_photos = row_count;

  -- 97.20. BEFORE the bookings update below, which clears the customer_id this
  -- needs to find their bookings.
  update public.email_sends e
  set to_email    = case when e.customer_id = p_customer_id or lower(btrim(e.to_email)) = v_email
                         then 'Deleted customer' else e.to_email end,
      detail      = case when e.customer_id = p_customer_id or lower(btrim(e.to_email)) = v_email
                         then null else e.detail end,
      subject     = 'Deleted customer',
      body_html   = null,
      customer_id = null
  where e.business_id = p_business_id
    and (
      e.customer_id = p_customer_id
      or e.booking_id in (
        select id from public.bookings
        where business_id = p_business_id and customer_id = p_customer_id
      )
      or (e.customer_id is null and v_email is not null and lower(btrim(e.to_email)) = v_email)
    );
  get diagnostics v_emails = row_count;

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

comment on function public.forget_customer(uuid, uuid) is
  'Roadmap 8.11, 97.20. Forgets the PERSON and keeps the MONEY: bookings are anonymised in place so every figure on every money screen is unchanged; their email_sends rows keep their delivery outcome and lose the body, subject, customer link and (when sent to them) the address; the customer row, their plan memberships, their maintenance deadlines and their job photos go. Service role only — who may do it is decided in the delete-customer edge function.';
