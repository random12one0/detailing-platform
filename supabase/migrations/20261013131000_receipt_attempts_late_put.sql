-- 14.39: a request begun before URL expiry may arrive after a cleanup HEAD.
-- Keep the prior migration append-only. A listing can revive only a tombstone
-- already owned by the ledger; unknown keys confer no permission to delete.
create policy receipt_attempts_server on public.receipt_upload_attempts
  for all to service_role using (true) with check (true);

drop function public.claim_receipt_attempts();
create function public.claim_receipt_attempts(p_present_keys text[] default '{}')
returns setof public.receipt_upload_attempts language plpgsql security definer set search_path = public, pg_temp as $$
declare a public.receipt_upload_attempts;
begin
  for a in select * from public.receipt_upload_attempts
    where (state in ('pending', 'reaping') or (state = 'reaped' and key = any(p_present_keys))) and expires_at <= now()
    order by expires_at, key limit 1000 for update skip locked
  loop
    if exists (select 1 from public.expenses where receipt_path = a.key) then
      update public.receipt_upload_attempts set state = 'saved' where key = a.key;
    else
      update public.receipt_upload_attempts set state = 'reaping' where key = a.key returning * into a;
      return next a;
    end if;
  end loop;
end $$;
revoke all on function public.claim_receipt_attempts(text[]) from public, anon, authenticated;
grant execute on function public.claim_receipt_attempts(text[]) to service_role;
