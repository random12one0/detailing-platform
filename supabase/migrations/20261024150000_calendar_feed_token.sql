-- ROADMAP 97.53 - the private per-business calendar feed gets its credential.
--
-- `business_settings.calendar_feed_token` is the secret half of the feed URL
-- (`calendar-feed?business=<slug>&token=<...>`). The slug is public (it is in
-- the booking URL already); this token is not. It is random hex, backfilled
-- for every existing row and defaulted for every new one, and the detailer
-- can reset it from Notifications, which is an update/insert through the
-- existing `settings`-permission RLS policies - no new policy, and staff
-- without that permission cannot even read it (the 14.2 shape: the feed
-- carries customer names and phone numbers, so its key stays behind the
-- same gate as the settings around it).

alter table public.business_settings
  add column if not exists calendar_feed_token text;

update public.business_settings
  set calendar_feed_token = encode(gen_random_bytes(32), 'hex')
  where calendar_feed_token is null;

alter table public.business_settings
  alter column calendar_feed_token set default encode(gen_random_bytes(32), 'hex');

-- A token that ever repeated would merge two businesses' private feeds, so
-- the database refuses the repeat rather than the code hoping it never
-- happens. (NULLs are distinct in a unique index, so this constrains nothing
-- until a token is set.)
create unique index if not exists business_settings_feed_token_uidx
  on public.business_settings (calendar_feed_token);
