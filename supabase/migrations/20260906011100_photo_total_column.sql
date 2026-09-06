-- The photo store's size gets its own column, and this is a bug fix.
--
-- `20260906011000_photo_share.sql` read the total out of
-- `platform_settings.prices -> 'photoTotalGb'`, and `20260906010000` read
-- `photoCapMb` from the same place before it. **Both were wrong and the same
-- way.**
--
-- `platform-admin`'s `prices` action does:
--
--     update platform_settings set prices = <pricesFrom(body)>
--
-- `pricesFrom()` REBUILDS the table from the fields it knows about — that is
-- deliberate and correct, because it is the same validator the checkout uses
-- and a second one is how two answers drift. But it means **the first time the
-- owner edits a price from his own back office, any unrelated key living
-- inside `prices` is silently deleted**, every detailer's allowance jumps back
-- to the default, and nothing on any screen says a thing.
--
-- That is the exact failure this repo keeps naming: not a crash, not an error,
-- just a number quietly becoming a different number. Found by reading the
-- write path before shipping rather than after.
--
-- **A COLUMN CANNOT BE CLOBBERED BY A JSONB REWRITE.** `prices` is for what we
-- charge; how much disk a detailer gets is not a price and was only in there
-- because it was convenient.

alter table public.platform_settings
  add column if not exists photo_total_gb numeric not null default 1
    check (photo_total_gb > 0);

comment on column public.platform_settings.photo_total_gb is
  'Total photo storage available to the whole platform, in GB. A detailer''s '
  'allowance is this divided by photo_tenant_share(). 1 = Supabase''s free '
  'plan, which is what is true until Cloudflare R2 is connected; R2''s free '
  'tier is 10. NEVER move this into the prices jsonb — pricesFrom() rebuilds '
  'that object and would delete it on the next price edit.';

create or replace function public.photo_total_bytes()
returns bigint language sql stable security definer set search_path = public as $$
  select (coalesce((select s.photo_total_gb from public.platform_settings s limit 1), 1)
          * 1024 * 1024 * 1024)::bigint;
$$;

grant execute on function public.photo_total_bytes() to authenticated;
