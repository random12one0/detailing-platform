-- AN INDEX FOR EVERY FOREIGN KEY A REAL OPERATION WALKS — 2026-09-07.
--
-- Found by `scripts/db-audit.mjs`, written the same day at the owner's ask to
-- *"look for any errors or risks and make improvements… even in the database."*
--
-- ---------------------------------------------------------------------------
-- WHY AN UNINDEXED FOREIGN KEY IS A PROBLEM AT ALL
-- ---------------------------------------------------------------------------
-- Postgres indexes the PARENT side of a foreign key and never the child. So
-- every time a parent row is deleted or its key updated, the database has to
-- prove no child still points at it — and with no index that proof is a
-- sequential scan of the whole child table, once per parent row.
--
-- **It is invisible until it is not.** With fifty bookings it is instant; the
-- first time it is felt is a detailer deleting a service and watching the
-- Catalog screen hang, which reads as our bug rather than as a missing index.
--
-- ---------------------------------------------------------------------------
-- NINE OF FOURTEEN, AND THE FIVE LEFT OUT ARE LEFT OUT ON PURPOSE
-- ---------------------------------------------------------------------------
-- **The rule used: index the ones a REAL OPERATION walks.** Every index costs
-- something on every insert and update, so "index every foreign key" is a
-- default rather than an argument, and this schema has fourteen.
--
-- The nine below are each walked by something a person actually does:
--
--   · a detailer DELETES A SERVICE          → booking_services(service_id)
--   · a detailer DELETES AN ADD-ON          → booking_add_ons(add_on_id)
--   · a detailer DELETES A CATEGORY         → services(group_id)
--   · a detailer UNPUBLISHES A GALLERY PHOTO→ job_photos(gallery_id)
--   · a detailer DELETES A CAMPAIGN LINK    → bookings(campaign_id), and that
--     one scans the BIGGEST table in the product
--   · a customer ASKS TO BE FORGOTTEN       → maintenance_deadlines(customer_id)
--     (roadmap 8.11 — this is the exact path that feature takes)
--   · a booking is deleted                  → maintenance_deadlines(booking_id)
--                                             and (last_done_booking_id)
--   · a business is deleted                 → booking_vehicles(business_id),
--     which also covers the composite (business_id, booking_id) key, because a
--     multi-column index serves any query on its leading columns
--
-- **THE FIVE LEFT OUT ALL POINT AT `auth.users`** — `business_invites
-- (invited_by)`, `job_photos(created_by)`, `owner_push_subscriptions(user_id)`
-- and `platform_admin_events(admin_id)` — and **this product never deletes an
-- auth user.** Forgetting a customer deletes a `customers` row; removing a
-- staff member deletes a MEMBERSHIP. Nothing anywhere deletes the account
-- itself, so those checks are never run. `scripts/db-audit.mjs` carries the
-- same list so it reports a NEW unindexed key rather than these four for ever
-- — a check that cries wolf on every run is a check nobody reads.
--
-- **PARTIAL WHERE THE COLUMN IS USUALLY NULL**, which is the idiom this schema
-- already uses for `bookings_plan_idx`. A foreign-key check is
-- `where fk = <value>`, which implies `fk is not null`, so the planner can use
-- a partial index for it — and the index stays a fraction of the size.

-- ── walked when a detailer edits their catalogue ───────────────────────────
create index if not exists booking_services_service_idx
  on public.booking_services (service_id);

create index if not exists booking_add_ons_add_on_idx
  on public.booking_add_ons (add_on_id);

create index if not exists services_group_idx
  on public.services (group_id) where group_id is not null;

-- ── walked when a detailer unpublishes a gallery photo ────────────────────
create index if not exists job_photos_gallery_idx
  on public.job_photos (gallery_id) where gallery_id is not null;

-- ── walked when a detailer deletes a campaign link ────────────────────────
-- The scan this replaces is of `bookings`, which is the largest table here.
create index if not exists bookings_campaign_idx
  on public.bookings (campaign_id) where campaign_id is not null;

-- ── walked when a customer asks to be forgotten, or a booking goes ────────
create index if not exists maintenance_deadlines_customer_idx
  on public.maintenance_deadlines (customer_id);

create index if not exists maintenance_deadlines_booking_idx
  on public.maintenance_deadlines (booking_id) where booking_id is not null;

create index if not exists maintenance_deadlines_last_done_idx
  on public.maintenance_deadlines (last_done_booking_id)
  where last_done_booking_id is not null;

-- ── walked when a business is deleted ─────────────────────────────────────
-- Serves the composite (business_id, booking_id) key as well: an index on the
-- leading column answers a check on it.
create index if not exists booking_vehicles_business_idx
  on public.booking_vehicles (business_id);
