-- ROADMAP 3.4 FAULT 4 — THE DASHBOARD LANGUAGE GETS A SERVER-SIDE HOME.
--
-- DECISIONS.md 2026-10-06: detailer, staff and platform emails follow the
-- language that person chose for the dashboard, English when unknown.
--
-- Until this file the choice lived ONLY in the browser (`dp.lang.app` in
-- localStorage), which no edge function can read. Smallest home that is
-- per PERSON rather than per business: one nullable column on the membership
-- row. NULL means "never chose" and reads as English, so every existing row is
-- correct the moment this applies and nothing needs backfilling.
--
-- NOT APPLIED BY THE SESSION THAT WROTE IT — that is Andrew's switch
-- (FOR-ANDREW.md). The edge functions read it through `recipient_lang` and
-- treat "function does not exist" as English, so deploying them first is safe.

alter table public.business_users
  add column if not exists lang text check (lang in ('en', 'es'));

comment on column public.business_users.lang is
  'Dashboard language this person chose (en/es). NULL = never chose = English. Emails to this person follow it. Written by set_my_lang().';

-- WHICH LANGUAGE AN ADDRESS READS. Emails go to ADDRESSES (notification_emails,
-- contact_email, platform_settings.owner_email), not to user ids, so the lookup
-- is by address. Matched on the membership's own email OR the sign-in
-- account's: measured 2026-10-06, 9 of 21 membership rows have no email stored.
-- An address that is nobody's login (a shared inbox) finds nothing: English.
-- `p_business` null = any business (the platform owner's alerts).
create or replace function public.recipient_lang(p_email text, p_business uuid default null)
returns text
language sql
stable
security definer
set search_path = public, auth
as $$
  select bu.lang
  from public.business_users bu
  left join auth.users u on u.id = bu.user_id
  where lower(coalesce(nullif(bu.email, ''), u.email)) = lower(trim(p_email))
    and (p_business is null or bu.business_id = p_business)
    and bu.lang is not null
  limit 1;
$$;
revoke execute on function public.recipient_lang(text, uuid) from public, anon, authenticated;

-- THE DASHBOARD'S WRITE. A person sets only their OWN rows, on every business
-- they belong to (the picker is per person, not per business).
create or replace function public.set_my_lang(p_lang text)
returns void
language sql
volatile
security definer
set search_path = public
as $$
  update public.business_users
     set lang = case when p_lang in ('en', 'es') then p_lang else null end
   where user_id = auth.uid();
$$;
revoke execute on function public.set_my_lang(text) from public, anon;
grant execute on function public.set_my_lang(text) to authenticated;
