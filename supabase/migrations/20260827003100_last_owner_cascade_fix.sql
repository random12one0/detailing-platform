-- The last-owner guard must not block deleting a whole BUSINESS: that
-- cascades into business_users, and the trigger was refusing the cascade
-- (so a business could never be deleted once it had an owner). Skip the
-- check when the parent business row is already gone.

create or replace function public.protect_last_owner()
returns trigger
language plpgsql
as $$
declare
  remaining integer;
begin
  if (tg_op = 'DELETE' and old.role = 'owner')
     or (tg_op = 'UPDATE' and old.role = 'owner' and new.role <> 'owner') then
    -- Cascade from a business deletion: nothing left to protect.
    if not exists (select 1 from public.businesses where id = old.business_id) then
      return case when tg_op = 'DELETE' then old else new end;
    end if;
    select count(*) into remaining
    from public.business_users
    where business_id = old.business_id and role = 'owner' and user_id <> old.user_id;
    if remaining = 0 then
      raise exception 'cannot remove or demote the last owner of a business';
    end if;
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;
