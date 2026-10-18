-- ROADMAP 97.20a — "DELETE FOR GOOD" NOW REMOVES THE CUSTOMER'S STREET ADDRESS FROM THE GEOCODE CACHE.
--
-- `address_points` (20260913010000) keys a map point on the street address
-- itself, normalised by `addressKey` in `_shared/weatherCache.ts`, with no
-- name, business or expiry. Nothing linked a row to a customer, so after
-- "Delete for good" their address — and the exact point of their house — sat
-- there for ever.
--
-- WHY DELETE, AND NOT EXPIRE OR HASH. Expiring leaves it there until the
-- clock runs out. Hashing the key hides the text but keeps lat/lon, which IS
-- the house, and needs every edge function that writes the key redeployed in
-- the same moment as the data is rewritten. Deleting removes both, and needs
-- nothing but this migration.
--
-- WHICH ROWS: the key of the address on their customer record and of every
-- address on their bookings in this business — the two places the cache is
-- filled from (`jobAddress`: a mobile job geocodes the booking's address).
-- A row shared with somebody else at the same street goes too: it holds no
-- owner, and the cost is one Geoapify lookup the next time that street is
-- asked for. The SHOP's address is only touched if they gave it as theirs.
--
-- NOT REACHED, said plainly: an address they had BEFORE an edit overwrote it.
-- Nothing in the database ties that old text to them any more (`action_log`
-- keeps only {status}), so it cannot be found by them.
--
-- ponytail: the key is normalised in SQL with the JS rule (lower, every run of
-- non [a-z0-9] to one space, trim). A non-ASCII letter whose JS lower case is
-- ASCII (the Kelvin sign) would differ, and that street would keep its row.
-- Storing the key in one place both sides read is the upgrade if it matters.
--
-- Everything else in the function is 20261017210000's, unchanged.
-- `tests/forget-customer-address-points-sql.test.mjs` replays it on PGlite.

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
  v_points   integer := 0;
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

  -- 97.20a. Their street addresses leave the shared geocode cache. BEFORE the
  -- bookings update below, which clears both the customer_id this needs and
  -- the customer_address it reads. The key is `addressKey` in
  -- `_shared/weatherCache.ts`, character for character.
  delete from public.address_points p
  where p.key in (
    select btrim(regexp_replace(lower(a), '[^a-z0-9]+', ' ', 'g'))
    from (
      select address a from public.customers
      where id = p_customer_id and business_id = p_business_id
      union
      select customer_address from public.bookings
      where business_id = p_business_id and customer_id = p_customer_id
    ) t
    where a is not null
  );
  get diagnostics v_points = row_count;

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
    'emails_forgotten', v_emails,
    'address_points_deleted', v_points
  );
end;
$$;

revoke all on function public.forget_customer(uuid, uuid) from public, anon, authenticated;
grant execute on function public.forget_customer(uuid, uuid) to service_role;

comment on function public.forget_customer(uuid, uuid) is
  'Roadmap 8.11, 97.20, 97.20a. Forgets the PERSON and keeps the MONEY: bookings are anonymised in place so every figure on every money screen is unchanged; their email_sends rows keep their delivery outcome and lose the body, subject, customer link and (when sent to them) the address; their street addresses leave the address_points geocode cache; the customer row, their plan memberships, their maintenance deadlines and their job photos go. Service role only — who may do it is decided in the delete-customer edge function.';
