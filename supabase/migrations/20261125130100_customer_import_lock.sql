-- ROADMAP 97.40 - one customer import saves at a time per business.
--
-- The import's duplicate check and its insert are two requests, so two
-- overlapping saves could both pass the check and both create the same
-- customer. A save claims this business's row first (the primary key refuses a
-- second claim), waits while another save holds it, and deletes only its own
-- claim (`holder`). A claim older than a minute is treated as left by a crashed
-- save and cleared. Only the import function (service role) touches it.

create table if not exists public.customer_import_locks (
  business_id uuid primary key references public.businesses(id) on delete cascade,
  holder uuid not null,
  locked_at timestamptz not null default now()
);

alter table public.customer_import_locks enable row level security;
revoke all on public.customer_import_locks from anon, authenticated;
