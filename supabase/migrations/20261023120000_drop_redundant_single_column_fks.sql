-- RELEASE 2026-10-23 HOTFIX — DROP THE NINE SINGLE-COLUMN KEYS THE SAME-BUSINESS PAIR KEYS MADE REDUNDANT.
--
-- 97.12 (20261017000000), 97.71 (20261017010000) and 97.72 (20261017020000) added a pair key
-- (child_id, business_id) -> parent (id, business_id) beside each old single-column key and kept the old
-- one. With two keys between the same two tables, PostgREST cannot pick one for an embed and answers
-- PGRST201 (HTTP 300) — measured live the hour they were applied: `bookings?select=id,customers(id)`,
-- `booking_services(...)`, `booking_add_ons(...)`, `booking_line_items(...)`, `job_photos(...)` and the
-- deadline embeds all failed, which broke the job list (useBookings.js), respond-to-booking ("Booking not
-- found"), accept-quote, booking-ics, get-booking-receipt and send-invoice.
--
-- The pair key does everything the single key did: business_id is NOT NULL on all seven tables (checked
-- live), so MATCH SIMPLE always checks it, and each pair key carries the same delete rule (cascade for
-- cascade, `set null (<col>)` for set null, no action for no action). tests/photos-deadlines-same-business
-- -sql.test.mjs case 6 already proves the deadline keys' column-list rule is what acts once these are gone.
-- No code names any of the nine (`git grep` over app/src, supabase/functions, scripts, tests).

alter table public.bookings              drop constraint if exists bookings_customer_id_fkey;
alter table public.booking_services      drop constraint if exists booking_services_booking_id_fkey;
alter table public.booking_add_ons       drop constraint if exists booking_add_ons_booking_id_fkey;
alter table public.booking_line_items    drop constraint if exists booking_line_items_booking_id_fkey;
alter table public.plan_members          drop constraint if exists plan_members_customer_id_fkey;
alter table public.maintenance_deadlines drop constraint if exists maintenance_deadlines_booking_id_fkey;
alter table public.maintenance_deadlines drop constraint if exists maintenance_deadlines_last_done_booking_id_fkey;
alter table public.maintenance_deadlines drop constraint if exists maintenance_deadlines_customer_id_fkey;
alter table public.job_photos            drop constraint if exists job_photos_booking_id_fkey;

notify pgrst, 'reload schema';
