-- ROADMAP 97.20a, FOLLOW-UP — "DELETE FOR GOOD" NO LONGER TAKES A STREET SOMEBODY ELSE STILL USES.
--
-- 20261018050000 deleted every `address_points` row keyed on the customer's
-- record address or any of their bookings' addresses, "a row shared with
-- somebody else at the same street goes too". That was written when a miss
-- cost one Geoapify lookup. Since 100.3 the public quote (`calculate-booking`)
-- only READS the cache (`cachedPoint` in `_shared/weatherCache.ts`): a
-- deleted row means no weather on another customer's quote, or on every
-- drop-off quote if the street was the shop's, until the sweep happens to
-- re-geocode it. And the cache has no tenant, so "somebody else" can be in
-- another business.
--
-- SO A KEY OF THEIRS IS DELETED ONLY WHEN NOTHING ELSE STILL HOLDS IT, in any
-- business: no other customer's record address, no booking that is not theirs
-- (a guest booking with no customer included — hence `is distinct from`, not
-- `<>`, which is NULL there and would let the row go), and no shop's
-- `dropoff_address` — the three texts the cache is filled from (`jobAddress`).
-- A street kept that way is somebody else's address too, held in their own
-- rows, so the cache row says nothing about this customer that those do not.
-- Every side is normalised by the one expression, `addressKey`'s rule.
--
-- ponytail: the guard normalises every customer, booking and shop address on
-- each call (a scan). "Delete for good" is a rare, owner-pressed action; an
-- expression index on the key is the upgrade if it is ever slow.
--
-- Everything else in the function is 20261018050000's, unchanged.
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
  )
  -- 97.20a follow-up: but not a street anybody else still uses, in any business.
    and not exists (
      select 1 from public.customers c
      where c.id <> p_customer_id and btrim(regexp_replace(lower(c.address), '[^a-z0-9]+', ' ', 'g')) = p.key
    )
    and not exists (
      select 1 from public.bookings b
      where b.customer_id is distinct from p_customer_id and btrim(regexp_replace(lower(b.customer_address), '[^a-z0-9]+', ' ', 'g')) = p.key
    )
    and not exists (
      select 1 from public.businesses s
      where btrim(regexp_replace(lower(s.dropoff_address), '[^a-z0-9]+', ' ', 'g')) = p.key
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
  'Roadmap 8.11, 97.20, 97.20a (shared streets kept). Forgets the PERSON and keeps the MONEY: bookings are anonymised in place so every figure on every money screen is unchanged; their email_sends rows keep their delivery outcome and lose the body, subject, customer link and (when sent to them) the address; their street addresses leave the address_points geocode cache unless another customer, booking or shop still uses that street; the customer row, their plan memberships, their maintenance deadlines and their job photos go. Service role only — who may do it is decided in the delete-customer edge function.';
