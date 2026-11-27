-- Optional AI stage only. Manual shop and website drafts need no database change.
create table public.owner_draft_private (
 owner_id uuid not null references auth.users(id) on delete cascade,
 business_id uuid not null references public.businesses(id) on delete cascade,
 key text not null, value jsonb not null, revision bigint not null check (revision>0),
 primary key(owner_id,business_id,key)
);
alter table public.owner_draft_private enable row level security;
revoke all on table public.owner_draft_private from public, anon, authenticated, service_role;
grant select, insert, update on table public.owner_draft_private to service_role;
