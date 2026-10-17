-- ROADMAP 97.14 (S-M3) — A SIGNED-IN MEMBER COULD HARD-DELETE BOOKINGS AND WRITE CUSTOMERS STRAIGHT THROUGH THE
-- REST API, WHATEVER THEIR PERMISSIONS.
--
-- `customers` and `bookings` carry `*_tenant_all`: `for all to authenticated using (business_id in (select
-- current_business_ids()))` (20260827000200). So any member of a business — staff with nothing ticked — could
-- DELETE its bookings outright and insert, rewrite or delete its customers, skipping every rule the app keeps:
-- `delete-customer` is owner-only (its index.ts:63) and keeps the money by anonymising bookings instead of losing
-- them; the REST API does neither. 20261006040000 took UPDATE off `bookings`, not DELETE; `customers` had no revoke.
--
-- WHAT THE BROWSER WRITES, MEASURED IN `app/src` 2026-10-17 (every `from("customers")` / `from("bookings")`):
--   · adding a customer      — `create-booking` (NewBookingModal.jsx), service role. Untouched.
--   · editing a customer     — ONE direct write: Clients.jsx's Notes box, `update({ notes })`. Rerouted below.
--   · deleting a customer    — `delete-customer`, owner-only, service role. Untouched.
--   · deleting a booking     — none. The app soft-deletes through `update-booking` (`deleted_at`). The fleet job's
--                              INSERT (BulkJobModal.jsx) is the browser's only booking write and stays.
-- Edge functions write as the service role (`_shared/db.ts`) and `forget_customer` is SECURITY DEFINER, so
-- neither is touched by a revoke from `authenticated`.
--
-- `anon` loses the same privileges, as in 20261006040000: no policy lets it through today, but a policy written
-- tomorrow would inherit a write nobody meant to give it. RLS is unchanged; reads are unchanged.

revoke delete on public.bookings from authenticated, anon;
revoke insert, update, delete on public.customers from authenticated, anon;

-- THE NOTES BOX'S ROUTE. Notes are member-level on purpose — `permissions.js` lists customers with bookings and
-- the calendar as what a membership with nothing ticked still has — so membership of the customer's business is
-- the whole permission question, asked here because the definer bypasses RLS. It writes `notes` and nothing
-- else. A customer of another business, or none, raises rather than returning quietly, so the screen can say so.
create or replace function public.set_customer_notes(
  p_business_id uuid,
  p_customer_id uuid,
  p_notes text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_business_id is null or p_business_id not in (select public.current_business_ids()) then
    raise exception 'not a member of this business' using errcode = '42501';
  end if;
  update public.customers
     set notes = nullif(p_notes, '')
   where id = p_customer_id and business_id = p_business_id;
  if not found then
    raise exception 'no such customer' using errcode = 'P0002';
  end if;
end;
$$;

-- `create function` grants EXECUTE to PUBLIC and this project's default privileges add anon and authenticated
-- (tests/definer-grants.test.mjs), so all three are taken and the one caller is given back.
revoke all on function public.set_customer_notes(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.set_customer_notes(uuid, uuid, text) to authenticated, service_role;
