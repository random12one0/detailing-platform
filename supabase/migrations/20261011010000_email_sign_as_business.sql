-- ROADMAP 99.2d — who signs a customer email.
--
-- Every customer email ends "Thanks again, <first name> · <business> · <site>".
-- The first name is the owner's (business_users.first_name). A detailer who
-- would rather sign as the business switches this on and the line becomes
-- "Thanks again, <business> · <site>". Default false: a person signs.
--
-- Append-only, additive, nullable-free with a default, so every existing row
-- reads false and no email changes for anybody who never touches it.
alter table public.business_settings
  add column if not exists email_sign_as_business boolean not null default false;

comment on column public.business_settings.email_sign_as_business is
  'ROADMAP 99.2d. true = customer emails are signed with the business name only; false = with the owner''s first name (business_users.first_name) when one is set.';
