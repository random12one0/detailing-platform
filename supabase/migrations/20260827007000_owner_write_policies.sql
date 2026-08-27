-- BUG FIX: an owner could not save their own branding.
--
-- business_branding and business_settings had SELECT and UPDATE policies but
-- no INSERT. The dashboard upserts both (a business created before those
-- rows exist, or any first save), and an upsert INSERTs when there is no
-- row — which RLS rejected with "new row violates row-level security policy
-- for table business_branding".
--
-- The isolation suite only ever proved that STAFF and OTHER TENANTS are
-- blocked. Nothing asserted the positive case: that an owner can actually
-- write the tables they own. tests/owner-writes.test.mjs now does.

create policy business_branding_owner_insert on public.business_branding
  for insert to authenticated
  with check (public.is_business_owner(business_id));

create policy business_settings_owner_insert on public.business_settings
  for insert to authenticated
  with check (public.is_business_owner(business_id));

-- Deliberately NOT added, so the absence is a decision rather than an
-- oversight:
--   businesses INSERT/DELETE  — signup goes through the create-business
--     edge function (which enforces the timezone requirement); deleting a
--     business is a service-role operation.
--   business_users INSERT     — membership is granted only by accepting an
--     invite, through the accept-invite function.
--   business_invites DELETE   — revoking sets revoked_at; invites are kept
--     for the audit trail.
--   business_branding/settings DELETE — there is no reason to delete these
--     rows; they are one-per-business and edited in place.

-- business_domains had only SELECT. Custom domains are unused for now, but
-- an owner adding one should not hit the same wall later.
create policy business_domains_owner_insert on public.business_domains
  for insert to authenticated
  with check (public.is_business_owner(business_id));
create policy business_domains_owner_update on public.business_domains
  for update to authenticated
  using (public.is_business_owner(business_id))
  with check (public.is_business_owner(business_id));
create policy business_domains_owner_delete on public.business_domains
  for delete to authenticated
  using (public.is_business_owner(business_id));
