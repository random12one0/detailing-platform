-- A DOORBELL, NOT A FEATURE — 2026-09-12.
--
-- Claude Cowork needs to know when the builder session stops typing, without
-- polling it on a timer. Claude Code fires a Stop hook at the end of every
-- turn; the hook posts a fixed label here and Cowork reads the latest one.
--
-- **ONE ROW PER LABEL, OVERWRITTEN.** There is no history to keep: the only
-- question anybody asks of this table is *when did that session last stop*.
-- A log would grow forever to answer a question about one moment.
--
-- **NO PAYLOAD COLUMN, ON PURPOSE.** The Stop hook's own JSON carries
-- `last_assistant_message` — the entire text of the turn that just ended — and
-- none of the owner's work leaves his infrastructure to tell somebody that a
-- session went quiet. There is nowhere here to put it even by accident.
create table public.session_pings (
  label      text primary key,
  at         timestamptz not null default now()
);

-- **RLS FORCED, NO POLICIES — the `platform_admins` posture.** Nothing reaches
-- this table through the browser client. The `session-ping` edge function is
-- the only reader and the only writer, under the service role, which is what
-- lets the GET answer without the caller holding a service key.
alter table public.session_pings enable row level security;
alter table public.session_pings force row level security;
revoke all on public.session_pings from anon, authenticated;
