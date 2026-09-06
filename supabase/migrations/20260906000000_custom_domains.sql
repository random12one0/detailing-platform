-- ROADMAP 3.3 — a detailer's own web address.
--
-- `business_domains` has existed since the first tenant migration
-- (`20260827000100_tenant_core.sql:121`) and **nothing has ever read it.** Its
-- RLS is already complete — members select, the `settings` permission writes
-- (`20260904000000_custom_roles.sql`) — so this migration adds only the two
-- things that were missing: a way to look a business up BY HOST, and a lock on
-- the two columns a client must never write.
--
-- WHAT `domain` MEANS, AND IT IS THE ONE THING TO GET RIGHT: it is a hostname
-- that RESOLVES TO THIS APP. For a booking-only detailer that is usually
-- `book.theirdomain.com` aliased onto our Netlify site; for a website-package
-- detailer whose bespoke site owns the apex it is the same thing. **It is not
-- "the detailer's website".** The reason is the whole point of the item: the
-- URLs the platform emits — the receipt, the plan page, the opt-out — are
-- pages OUR app serves, and moving them onto a host that does not serve our
-- app replaces one visible seam with a 404.
-- `verify-domain` proves it by FETCHING a marker file from the host rather
-- than by asking, which is the only evidence that survives the detailer
-- guessing.
--
-- THE OUTBOUND HALF IS THE BIGGER ONE — contract §6a.
-- `supabase/functions/_shared/config.ts` built every customer-facing URL from
-- one global `PLATFORM_URL`, so a detailer on their own domain still sent
-- confirmation emails pointing at detailingplatform.com. That is the seam a
-- customer can actually see, in the one artifact the detailer did not write.

-- ---------------------------------------------------------------------------
-- 1. Two columns a client may never write.
-- ---------------------------------------------------------------------------
-- RLS decides WHICH ROWS a detailer may update; it says nothing about WHICH
-- COLUMNS. Without this, anybody with the `settings` permission could set
-- their own `verified_at` and skip the proof entirely — which would make
-- `verify-domain` a formality rather than a check. A column grant is the one
-- mechanism Postgres has for this, and it applies to `authenticated` only:
-- the service role (the edge function) is unaffected, which is exactly the
-- split we want.
revoke update (verified_at, verification_token) on public.business_domains from authenticated;

comment on column public.business_domains.domain is
  'Roadmap 3.3. A hostname that RESOLVES TO THIS APP — usually a subdomain '
  'the detailer has aliased onto our Netlify site. Never "the detailer''s '
  'website": the receipt, plan and opt-out pages this platform emails are '
  'pages our app serves, so a host that does not serve them turns one visible '
  'seam into a 404. Lower-case, no scheme, no path.';
comment on column public.business_domains.verified_at is
  'Roadmap 3.3. Stamped ONLY by the verify-domain edge function, after it has '
  'fetched the marker file from the host itself. Revoked from `authenticated` '
  'at column level, because RLS chooses rows and not columns.';

-- ---------------------------------------------------------------------------
-- 2. The public profile, by HOST instead of by slug.
-- ---------------------------------------------------------------------------
-- The inbound half of the item. One function, delegating to the one that
-- already exists, so there is exactly one definition of what a public profile
-- CONTAINS — a second copy is the thing that goes stale the next time a key is
-- added, and this item is closing a gap that came from precisely that.
--
-- ONLY A VERIFIED DOMAIN RESOLVES. An unverified row is a claim; serving a
-- business from a claim would let anyone who can type a hostname into their
-- own settings screen decide what that hostname shows.
--
-- The host is normalised the way a browser gives it to us: lower-cased, with
-- any port and any leading `www.` removed. `www.` is dropped rather than
-- required because a detailer who aliases both will otherwise verify one and
-- be puzzled by the other, and no security decision rests on the difference.
create or replace function public.get_public_business_profile_by_host(p_host text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select public.get_public_business_profile(b.slug)
  from public.business_domains d
  join public.businesses b on b.id = d.business_id
  where d.verified_at is not null
    and d.domain = regexp_replace(lower(coalesce(p_host, '')), '^(www\.)|(:\d+)$', '', 'g')
  order by d.created_at
  limit 1;
$$;

grant execute on function public.get_public_business_profile_by_host(text) to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 3. Which host the PLATFORM should write into this business's emails.
-- ---------------------------------------------------------------------------
-- The other direction, and it is a separate function on purpose: the edge
-- functions run as the service role and could read the table directly, but
-- "the earliest verified domain wins" is a rule, and a rule written at four
-- call sites is a rule that forks. Returns NULL for the great majority of
-- tenants, and the caller then uses PLATFORM_URL exactly as it always has.
create or replace function public.business_canonical_host(p_business_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select d.domain
  from public.business_domains d
  where d.business_id = p_business_id
    and d.verified_at is not null
  order by d.created_at
  limit 1;
$$;

grant execute on function public.business_canonical_host(uuid) to anon, authenticated, service_role;
