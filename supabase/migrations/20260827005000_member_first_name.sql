-- First name for the dashboard greeting. Kept on the membership row (not
-- auth.users) so it is business-scoped and readable under the same policy
-- the roster already uses.
alter table public.business_users add column if not exists first_name text;
