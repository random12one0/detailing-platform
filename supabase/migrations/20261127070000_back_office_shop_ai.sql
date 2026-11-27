-- Shop onboarding only. The wrapping key lives in an Edge Function secret.
create table public.shop_ai_config (
  singleton boolean primary key default true check (singleton),
  revision integer not null default 0,
  preferred_provider text check (preferred_provider in ('openai','anthropic','gemini')),
  connections jsonb not null default '{}'
);
insert into public.shop_ai_config(singleton) values(true);
create table public.shop_ai_edits (
  id uuid primary key,
  actor uuid not null,
  operation text not null check(operation in ('save','refresh','prefer','remove')),
  provider text not null check(provider in ('openai','anthropic','gemini')),
  revision integer not null,
  created_at timestamptz not null default now(),
  completed boolean not null default false
);
create index shop_ai_edits_recent on public.shop_ai_edits(actor,created_at);
alter table public.shop_ai_config enable row level security;
alter table public.shop_ai_edits enable row level security;
revoke all on public.shop_ai_config,public.shop_ai_edits from public,anon,authenticated,service_role;
grant select on public.shop_ai_config to service_role;
-- Both RPCs authorize against platform_admins. Only the server role can execute them.
create function public.reserve_shop_ai_edit(p_id uuid,p_actor uuid,p_revision integer,p_operation text,p_provider text)
returns text language plpgsql security definer set search_path='' as $$
declare last_edit public.shop_ai_edits%rowtype; current_revision integer;
begin
  if not exists(select from public.platform_admins where user_id=p_actor) then return 'denied'; end if;
  select revision into strict current_revision from public.shop_ai_config where singleton for update;
  select * into last_edit from public.shop_ai_edits where id=p_id;
  if found then
    if last_edit.actor<>p_actor or last_edit.operation<>p_operation or last_edit.provider<>p_provider or last_edit.revision<>p_revision then return 'conflict'; end if;
    return case when last_edit.completed then 'done' else 'already_attempted' end;
  end if;
  if p_revision<>current_revision then return 'conflict'; end if;
  if (select count(*) from public.shop_ai_edits where actor=p_actor and created_at>now()-interval '1 minute')>=12 then return 'rate_limited'; end if;
  insert into public.shop_ai_edits(id,actor,operation,provider,revision) values(p_id,p_actor,p_operation,p_provider,p_revision);
  return 'reserved';
end $$;
create function public.finish_shop_ai_edit(p_id uuid,p_actor uuid,p_preferred text,p_connection jsonb)
returns boolean language plpgsql security definer set search_path='' as $$
declare e public.shop_ai_edits%rowtype;
begin
  if not exists(select from public.platform_admins where user_id=p_actor) then return false; end if;
  select * into strict e from public.shop_ai_edits where id=p_id and actor=p_actor for update;
  if e.completed then return true; end if;
  update public.shop_ai_config set revision=revision+1,preferred_provider=p_preferred,
    connections=case when e.operation='remove' then connections-e.provider
      else jsonb_set(connections,array[e.provider],p_connection,true) end
    where singleton and revision=e.revision;
  if not found then return false; end if;
  update public.shop_ai_edits set completed=true where id=p_id;
  return true;
end $$;
revoke all on function public.reserve_shop_ai_edit(uuid,uuid,integer,text,text),public.finish_shop_ai_edit(uuid,uuid,text,jsonb) from public,anon,authenticated,service_role;
grant execute on function public.reserve_shop_ai_edit(uuid,uuid,integer,text,text),public.finish_shop_ai_edit(uuid,uuid,text,jsonb) to service_role;
