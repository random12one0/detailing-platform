-- The repo has migrations/add_admin_notes.sql but it was never applied to the
-- live database. Result: the admin-notes editor in the booking detail view
-- always read back empty and every save failed, and the "Your notes" block in
-- the owner reminder email could never render. Applying it now.
alter table public.bookings
  add column if not exists admin_notes text;

create index if not exists idx_bookings_admin_notes
  on public.bookings (id)
  where admin_notes is not null;
