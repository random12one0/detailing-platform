-- THE DOORBELL LEARNS WHO RANG IT — 2026-09-13, Andrew's instruction.
--
-- **THE BUG:** `session_pings` was keyed on `label`, and the Stop hook posted
-- one constant (`dp-builder`) from every session. With two sessions open the
-- second to stop OVERWROTE the first, so one row and one timestamp answered a
-- question about two panes. His words: *"I either interrupt the wrong one or go
-- and look at the screen anyway, which is the polling the doorbell was built to
-- replace."*
--
-- **IDENTITY BECOMES `session_id`. `label` STAYS AS A NULLABLE EXTRA**, because
-- a UUID is not a thing a person reads and Claude Code's own pane title is.
--
-- **THE BACKFILL IS WHAT KEEPS THE BLUNT BELL ALIVE ACROSS THE CHANGE.**
-- `session_id = label` turns the existing `dp-builder` row into a valid row
-- under the new key rather than deleting it, so an old hook that is still
-- running — and there may be one in another pane — keeps working unchanged and
-- keeps its history. Andrew: *"I would rather have the current blunt bell than
-- no bell."* The legacy row is removed by hand only once the new hook is proven
-- to be posting, which is not something a migration can know.
--
-- **APPEND-ONLY, so this is a new file rather than an edit to
-- `20260912001000_session_ping.sql`.**

alter table public.session_pings add column session_id text;

update public.session_pings set session_id = label where session_id is null;

alter table public.session_pings alter column session_id set not null;

-- `label` was the primary key, so it is implicitly NOT NULL. Drop the key
-- first, then the constraint that came with it: a ping that carries only an id
-- is the normal case now, and a row with no readable name is honest.
alter table public.session_pings drop constraint session_pings_pkey;
alter table public.session_pings alter column label drop not null;
alter table public.session_pings add primary key (session_id);

-- The reader asks for "every session, newest first" on every call.
create index if not exists session_pings_at_idx on public.session_pings (at desc);

-- RLS and the revokes carry over from the create — restated here only as a
-- reminder that nothing reaches this table except the edge function under the
-- service role. (A table's grants are not affected by adding a column, and
-- unlike a FUNCTION a table gets no implicit grant to PUBLIC — see FOUND.md
-- § THE EIGHTH COSTUME, which is about functions and does not apply here.)
