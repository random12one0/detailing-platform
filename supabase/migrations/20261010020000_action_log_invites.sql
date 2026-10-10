-- ROADMAP 4.1d — AN OWNER INVITE LEAVES A ROW IN THE APPEND-ONLY LOG.
--
-- `action_log` (20261006050000) only accepted a booking as its subject. An invite is the seventh
-- of 4.1's named actions, and its own table, `business_invites`, is not a log: `accept-invite`
-- and a revoke both UPDATE it. So `invite-user` now also writes `invite.send` here, with the
-- invite's id as `subject_id`, the invites it superseded as `before`, and the new one and its
-- role as `after`. The invitee's email is NOT stored (an append-only copy could never be erased);
-- the id joins to `business_invites` for as long as that row exists.
--
-- All this changes is which subjects the table accepts. Nothing is dropped or rewritten, the
-- locks and triggers are untouched, and applying it twice is harmless.

alter table public.action_log drop constraint if exists action_log_subject_table_check;
alter table public.action_log
  add constraint action_log_subject_table_check
  check (subject_table in ('bookings', 'business_invites'));
