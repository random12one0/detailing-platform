-- ROADMAP 97.13 — a web address is PROVED, never written (S-M1, S-L6).
--
-- Two holes, both reachable by anybody holding the `settings` permission:
--
--   1. INSERT was allowed with only a tenant check
--      (`20260904000000_custom_roles.sql:155`), and the column revoke on
--      `verified_at` covers UPDATE only — so a member could INSERT a row with
--      `verified_at` already filled in and skip `verify-domain` entirely.
--   2. `20260907003000_column_revokes_actually_apply.sql:88` granted back
--      `update (domain)`, so a member could verify an address they control and
--      then RENAME the row to one they do not, keeping the badge.
--
-- After this migration the browser holds SELECT and DELETE on its own rows and
-- nothing else. Adding goes through `verify-domain` (`action: "add"`) under the
-- service role, which sets `business_id` from the caller's membership and never
-- writes `verified_at`. Removing stays a direct delete: it can only lose a
-- badge, never gain one.

revoke insert on public.business_domains from authenticated, anon;
revoke update on public.business_domains from authenticated, anon;

-- A verified stamp belongs to ONE hostname. If the hostname changes and the
-- same write does not also stamp it (which is what `verify-domain` does after
-- it has fetched the proof for the new host), the stamp goes. This holds for
-- every role, the service role included, so a future admin tool that renames
-- a row cannot carry the badge across either.
create or replace function public.business_domains_clear_verified_on_rename()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.domain is distinct from old.domain
     and new.verified_at is not distinct from old.verified_at then
    new.verified_at := null;
  end if;
  return new;
end;
$$;

drop trigger if exists business_domains_clear_verified_on_rename on public.business_domains;
create trigger business_domains_clear_verified_on_rename
  before update of domain on public.business_domains
  for each row execute function public.business_domains_clear_verified_on_rename();

comment on column public.business_domains.verification_token is
  'Roadmap 97.13. Per-row proof. `verify-domain` passes a row only when DNS '
  'publishes this exact value as a TXT record at `_detailing-platform.<domain>` '
  '— the shared `/platform-host.txt` marker proves the host reaches this app, '
  'and every platform host serves it, so it cannot prove WHO owns the host.';
