-- ---------------------------------------------------------------------------
-- A RECEIPT IS NOT A JOB PHOTO — survey finding 6.
--
-- An expense could record what was spent and carry a typed note, and there was
-- nowhere to put the piece of paper. At tax time the numbers were in the
-- product and the paper was in the van.
--
-- ── WHY THIS DOES NOT REUSE `job_photos`, WHICH WOULD HAVE BEEN LESS WORK ───
-- Sharing that table would put a detailer's own receipts inside the
-- CUSTOMER-FACING photo export built the same day (`lib/photo-export.js`),
-- which reads every `job_photos` row for a business and zips the files. The
-- first anyone would know is a detailer sending a customer an archive with his
-- fuel and insurance receipts in it. **A receipt and a photograph of a car are
-- different things with different audiences, and the table is where that stops
-- being true.** Same reasoning for the marketing gallery.
--
-- ── ONE RECEIPT PER EXPENSE, AS COLUMNS RATHER THAN A CHILD TABLE ───────────
-- A receipt is one document for one expense. A child table would buy
-- many-per-expense that nobody asked for and cost a join on every read of a
-- screen that already lists expenses. If a two-page receipt ever matters, that
-- is the day to add the table.
--
-- ── IT COUNTS AGAINST THE SAME ALLOWANCE, WHICH IS THE POINT ────────────────
-- `job_photo_budget()` is replaced below to sum BOTH stores. A second,
-- uncounted photo store is how the cap quietly becomes a lie: the allowance is
-- `photo_total_bytes() / photo_tenant_share()` = 1 GB / 100 = **10.24 MB** a
-- business today, so a receipt store that ignored it would eat a detailer's
-- whole budget in a week and the meter would still read empty.
-- ---------------------------------------------------------------------------

alter table public.expenses
  add column if not exists receipt_path        text,
  add column if not exists receipt_bytes       integer,
  add column if not exists receipt_width       integer,
  add column if not exists receipt_height      integer,
  add column if not exists receipt_uploaded_at timestamptz;

-- The path is the storage object, so two rows may never claim one file.
create unique index if not exists expenses_receipt_path_idx
  on public.expenses (receipt_path) where receipt_path is not null;

alter table public.expenses
  drop constraint if exists expenses_receipt_bytes_positive;
alter table public.expenses
  add constraint expenses_receipt_bytes_positive
  check (receipt_bytes is null or receipt_bytes > 0);

-- ---------------------------------------------------------------------------
-- THE FILES. Its own bucket, private, and the SAME structural isolation as
-- `job-photos`: the first folder of every object path is the business id, and
-- the policy checks it. `addReceipt` writes `${businessId}/${expenseId}/…`,
-- so that folder is structural rather than a convention somebody remembers.
--
-- 5 MB rather than job-photos' 10: a receipt is a small flat document and the
-- client resizes before upload anyway. The ceiling is the last refusal, not
-- the expectation.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'expense-receipts', 'expense-receipts', false,
  5 * 1024 * 1024,
  array['image/jpeg','image/png','image/webp']
)
on conflict (id) do nothing;

drop policy if exists "expense receipts member read" on storage.objects;
create policy "expense receipts member read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'expense-receipts'
    and (storage.foldername(name))[1] in (select public.current_business_ids()::text)
  );

drop policy if exists "expense receipts member insert" on storage.objects;
create policy "expense receipts member insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'expense-receipts'
    and (storage.foldername(name))[1] in (select public.current_business_ids()::text)
  );

-- DELETE IS NARROWER THAN INSERT, the same asymmetry `job-photos` carries and
-- for a sharper reason: a receipt is the evidence behind a number in the
-- accounts. Anyone who can record an expense may attach its paper; removing
-- one is a settings-permission act.
drop policy if exists "expense receipts settings delete" on storage.objects;
create policy "expense receipts settings delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'expense-receipts'
    and (storage.foldername(name))[1] in (select public.business_ids_with_permission('settings')::text)
  );

-- ---------------------------------------------------------------------------
-- THE ALLOWANCE NOW COUNTS BOTH STORES.
--
-- Shape is unchanged — `(used_bytes, cap_bytes, photos)` — because the
-- dashboard reads it and `budgetState()` in `photo-rules.js` reads
-- `used_bytes` and `cap_bytes` off it. `photos` stays the number of JOB
-- photos: it is what the photo screens count and a receipt is not one of
-- them. **`used_bytes` is the number that decides whether an upload is
-- refused, and that is the one that had to grow.**
--
-- The tenant guard on the argument is kept exactly as it was.
-- ---------------------------------------------------------------------------
create or replace function public.job_photo_budget(p_business uuid)
returns table (used_bytes bigint, cap_bytes bigint, photos integer)
language sql stable security definer set search_path = public as $$
  select
    (
      coalesce((select sum(p.bytes) from public.job_photos p
                 where p.business_id = p_business), 0)
      + coalesce((select sum(e.receipt_bytes) from public.expenses e
                   where e.business_id = p_business and e.receipt_bytes is not null), 0)
    )::bigint,
    (public.photo_total_bytes() / public.photo_tenant_share())::bigint,
    (select count(*) from public.job_photos p where p.business_id = p_business)::int
  where p_business in (select public.current_business_ids());
$$;

grant execute on function public.job_photo_budget(uuid) to authenticated;
