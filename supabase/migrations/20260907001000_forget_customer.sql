-- ROADMAP 8.11 — DELETE A CUSTOMER, and it is the one item in this phase with
-- a legal edge.
--
-- *"There should be an option where if you click on a customer, they just
-- delete their info… is that not already an option? I have that on my
-- business."* It was not. The EXPORT half shipped as item H
-- (`20260906005000_export_business.sql`), whose own header already named this
-- as the other half of the same request.
--
-- ---------------------------------------------------------------------------
-- THE WHOLE DESIGN IS ONE SENTENCE: FORGET THE PERSON, KEEP THE MONEY.
-- ---------------------------------------------------------------------------
--
-- The two obvious builds are both wrong, and in opposite directions.
--
-- **Deleting the bookings destroys the detailer's own business records.** The
-- money on those rows is what Money's Collected figure, the accountant export
-- and last year's tax return are made of; `tests/money-export.test.mjs` pins
-- that the export's Amount column reaches the Net on the screen it came from.
-- A customer asking to be forgotten is not asking the detailer to lose eight
-- months of takings, and no jurisdiction requires it — a business may keep the
-- transaction record it is legally obliged to keep.
--
-- **Deleting only the `customers` row forgets nothing at all.** `bookings`
-- carries `customer_name`, `customer_phone`, `customer_email`,
-- `customer_address` and `customer_notes` DENORMALISED on every row, snapshotted
-- at booking time — which is right for a receipt and is exactly why the naive
-- delete is a lie: the person's name, number and home address are still sitting
-- in the database on twelve rows, and the screen still prints them.
--
-- So: the bookings STAY and are ANONYMISED. Every figure on every money screen
-- is unchanged to the cent; every trace of who it was, is gone.
--
-- WHAT ELSE GOES, and why each:
--   · `plan_members` and `maintenance_deadlines` cascade off the customer row
--     already — a membership and a coating warranty are about a person.
--   · `job_photos` rows are deleted HERE and the FILES are deleted by the edge
--     function before it calls this, because SQL cannot reach object storage.
--     A photo is a stranger's car outside their own house; the bucket is
--     private for that reason and forgetting somebody has to include it.
--   · `admin_notes` on the booking is scrubbed too. It is the detailer's own
--     note and losing it costs them something — but it is the single most
--     likely place in this schema for *"gate code 4471, dog in the yard"*, and
--     the person pressing the button is the one who wrote it.
--
-- WHAT DOES NOT GO: `vehicle_model`, and that is deliberate. Detached from a
-- name, a number and an address, "2019 Honda Civic" is not a person — and it
-- is what the JOB was, which is the record being kept.
--
-- THE CEILING, STATED RATHER THAN DISCOVERED: deleting the row DESTROYS THE
-- OPT-OUT. `customers.unsubscribed_at` is how `send-campaign` knows never to
-- email them again, so if the same address books again later it arrives as a
-- new customer who has never opted out. Keeping a suppression row would mean
-- keeping their email address forever, which is the opposite of the request.
-- **He asked for delete, so this deletes**; a session that later wants a
-- hashed suppression list should read this paragraph first.
--
-- SERVICE ROLE ONLY. Who may do this is a question about MEMBERSHIP and
-- OWNERSHIP, and it is answered in `delete-customer`, the one caller — the
-- same shape as `export_business`. There is no path to it from a browser.

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
  v_bookings integer := 0;
  v_photos   integer := 0;
begin
  -- BOTH IDS, ALWAYS. A customer id alone would let a caller that got the
  -- business wrong erase somebody in another tenant, and this function runs as
  -- the service role with no RLS above it to catch that.
  select name into v_name
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
    'photos_deleted', v_photos
  );
end;
$$;

revoke all on function public.forget_customer(uuid, uuid) from public, anon, authenticated;
grant execute on function public.forget_customer(uuid, uuid) to service_role;

comment on function public.forget_customer(uuid, uuid) is
  'Roadmap 8.11. Forgets the PERSON and keeps the MONEY: bookings are anonymised in place so every figure on every money screen is unchanged, and the customer row, their plan memberships, their maintenance deadlines and their job photos go. Service role only — who may do it is decided in the delete-customer edge function.';
