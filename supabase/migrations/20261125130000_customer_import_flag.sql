-- ROADMAP 97.40 - the customer CSV import flags what it brings in.
--
-- `imported` marks rows that arrived through the import (so the Clients screen
-- can say so and the undo knows its own batch); `import_batch_id` groups one
-- save together so undo removes exactly that batch. Test fixtures keep their
-- own `is_test` flag and are never touched by an undo - flag, don't delete.

alter table public.customers
  add column if not exists imported boolean not null default false,
  add column if not exists import_batch_id uuid;

create index if not exists customers_import_batch_idx
  on public.customers (business_id, import_batch_id)
  where import_batch_id is not null;
