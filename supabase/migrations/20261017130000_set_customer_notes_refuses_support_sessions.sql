-- ROADMAP 97.14, review round — `set_customer_notes` REFUSES A SUPPORT SESSION, AS EVERY WRITING DEFINER FUNCTION MUST.
--
-- 20261017030000 took the browser's writes on `customers` away and gave the Notes box this security-definer function
-- instead. A definer function runs as its owner, which skips row-level security, so the restrictive
-- `support_read_only_update` rule 20261010030000 put on `customers` no longer stood between a read-only "view as"
-- session and a client's notes: before 97.14 that session's notes update was refused by the rule; through the function
-- it would have landed. 20261010030000's layer C is the answer it gives for exactly this case — a definer function a
-- signed-in caller can run, whose body writes, refuses a support session itself — and this is that line, worded as
-- layer C words it. Otherwise the body is 20261017030000's, unchanged. `create or replace` keeps its grants
-- (EXECUTE for `authenticated` and `service_role` only).
--
-- A new migration rather than an edit: migrations are append-only. Apply both in the same sitting, in order.
create or replace function public.set_customer_notes(
  p_business_id uuid,
  p_customer_id uuid,
  p_notes text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_support_session() then
    raise exception 'This is a read-only support view, so nothing can be changed here.' using errcode = '42501';
  end if;
  if p_business_id is null or p_business_id not in (select public.current_business_ids()) then
    raise exception 'not a member of this business' using errcode = '42501';
  end if;
  update public.customers
     set notes = nullif(p_notes, '')
   where id = p_customer_id and business_id = p_business_id;
  if not found then
    raise exception 'no such customer' using errcode = 'P0002';
  end if;
end;
$$;
