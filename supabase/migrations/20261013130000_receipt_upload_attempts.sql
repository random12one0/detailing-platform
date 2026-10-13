-- 14.39: a start is durable before its signed PUT leaves the server.
-- Only server code may touch this ledger. Tombstones prevent reusing a key
-- while a cleanup retry might still be deleting it. No customer grants.
create table public.receipt_upload_attempts (
  key text primary key,
  business_id uuid not null,
  expense_id uuid not null,
  expires_at timestamptz not null default (now() + interval '1 hour'),
  state text not null default 'pending' check (state in ('pending', 'reaping', 'saved', 'reaped')),
  check (key ~ ('^' || business_id::text || '/' || expense_id::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png)$'))
);
alter table public.receipt_upload_attempts enable row level security;
revoke all on public.receipt_upload_attempts from public, anon, authenticated;
grant all on public.receipt_upload_attempts to service_role;
create index receipt_attempts_due on public.receipt_upload_attempts (expires_at) where state in ('pending', 'reaping');

create function public.start_receipt_attempt(p_business uuid, p_expense uuid, p_key text)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if not exists (select 1 from public.expenses where id = p_expense and business_id = p_business and receipt_path is null) then
    raise exception 'Expense unavailable';
  end if;
  -- Repeated file ids are refused, including completed/deleted attempts.
  insert into public.receipt_upload_attempts(key, business_id, expense_id) values (p_key, p_business, p_expense);
end $$;

create function public.finish_receipt_attempt(p_business uuid, p_expense uuid, p_key text, p_bytes bigint, p_width integer, p_height integer)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare a public.receipt_upload_attempts; e public.expenses;
begin
  -- Same lock order as the reaper. A HEAD done before cleanup is insufficient:
  -- this lock decides whether finish or cleanup owns the attempt.
  select * into a from public.receipt_upload_attempts where key = p_key and business_id = p_business and expense_id = p_expense for update;
  if not found then raise exception 'Receipt attempt unavailable'; end if;
  select * into e from public.expenses where id = p_expense and business_id = p_business for update;
  if not found then raise exception 'Expense unavailable'; end if;
  if a.state = 'saved' and e.receipt_path = p_key then return to_jsonb(e); end if;
  if a.state <> 'pending' or a.expires_at <= now() or e.receipt_path is not null then
    raise exception 'Receipt attempt unavailable';
  end if;
  if p_bytes is null or p_bytes <= 0 or p_bytes > 5242880 then raise exception 'Receipt size unavailable'; end if;
  update public.expenses set receipt_path = p_key, receipt_bytes = p_bytes,
    receipt_width = p_width, receipt_height = p_height, receipt_uploaded_at = now()
    where id = p_expense and business_id = p_business returning * into e;
  update public.receipt_upload_attempts set state = 'saved' where key = p_key;
  return to_jsonb(e);
end $$;

create function public.claim_receipt_attempts()
returns setof public.receipt_upload_attempts language plpgsql security definer set search_path = public, pg_temp as $$
declare a public.receipt_upload_attempts;
begin
  -- One bounded batch; failed deletion stays reaping for the next scheduled run.
  for a in select * from public.receipt_upload_attempts
    where state in ('pending', 'reaping') and expires_at <= now()
    order by expires_at, key limit 1000 for update skip locked
  loop
    -- Defense for preexisting/externally restored references: never delete one.
    if exists (select 1 from public.expenses where receipt_path = a.key) then
      update public.receipt_upload_attempts set state = 'saved' where key = a.key;
    else
      update public.receipt_upload_attempts set state = 'reaping' where key = a.key returning * into a;
      return next a;
    end if;
  end loop;
end $$;

create function public.ack_receipt_attempt(p_key text, p_business uuid, p_expense uuid)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  update public.receipt_upload_attempts set state = 'reaped'
    where key = p_key and business_id = p_business and expense_id = p_expense and state = 'reaping';
  if not found then raise exception 'Receipt cleanup claim unavailable'; end if;
end $$;

revoke all on function public.start_receipt_attempt(uuid, uuid, text), public.finish_receipt_attempt(uuid, uuid, text, bigint, integer, integer), public.claim_receipt_attempts(), public.ack_receipt_attempt(text, uuid, uuid) from public, anon, authenticated;
grant execute on function public.start_receipt_attempt(uuid, uuid, text), public.finish_receipt_attempt(uuid, uuid, text, bigint, integer, integer), public.claim_receipt_attempts(), public.ack_receipt_attempt(text, uuid, uuid) to service_role;
