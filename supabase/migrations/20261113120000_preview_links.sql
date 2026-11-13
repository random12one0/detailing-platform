-- STUDIO: the detailer's preview link, hosted (detailingplatform.com/p/<link>). Additive only.
--
-- The Website Studio runs on Andrew's laptop. When it makes a link (review a revision, or pick one of three looks) it
-- sends a SNAPSHOT here: exactly what that one link may show (the site design, the looks, the comments so far). The
-- public `site-preview` function answers only for the link whose secret it is handed, and records what the detailer
-- does (a comment, a vote, "I'm happy with it", a pick) as an EVENT. The laptop pulls the events back into the Studio,
-- where its own rules apply them, and sends a fresh snapshot.
--
-- Why not the S7 planned tables (docs/improve/studio/S7-planned-migration.sql): those hang off `sites` and `revisions`,
-- which do not exist online yet (the Studio keeps them on the laptop). A snapshot per link needs neither, and one link
-- can only ever reach its own row: there is no site id to change, only the hash of its own secret.
--
-- Safety: the secret itself is never stored, only its SHA-256 (token_hash). Nobody reads or writes these tables
-- directly: RLS is on with NO policies, and anon/authenticated hold no privileges. Only the service role (the
-- site-preview function, and the Studio with the service key) reaches them.

create table if not exists public.preview_links (
  token_hash  text primary key check (token_hash ~ '^[0-9a-f]{64}$'),
  purpose     text not null check (purpose in ('review', 'choose')),
  view        jsonb not null,                       -- what the page shows: spec or looks, business name, comments, votes
  expires_at  timestamptz not null,
  revoked_at  timestamptz,
  updated_at  timestamptz not null default now()
);

create table if not exists public.preview_events (
  id          bigint generated always as identity primary key,
  token_hash  text not null references public.preview_links (token_hash) on delete cascade,
  kind        text not null check (kind in ('comment', 'thumbs', 'happy', 'pick')),
  body        jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  pulled_at   timestamptz                           -- set by the Studio once it has applied the event
);
create index if not exists preview_events_unpulled on public.preview_events (token_hash, id) where pulled_at is null;

alter table public.preview_links  enable row level security;
alter table public.preview_events enable row level security;
revoke all on public.preview_links  from anon, authenticated;
revoke all on public.preview_events from anon, authenticated;
