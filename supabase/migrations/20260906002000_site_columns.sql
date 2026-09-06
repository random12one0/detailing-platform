-- ROADMAP 4.4 STAGE 3 — the site columns.
--
-- The spec's Job 2 asks for one column that is specific to this product,
-- because the platform owner builds these sites BY HAND: *do they have one,
-- what is its address, is a custom domain pointed at it, and when was it last
-- touched.*
--
-- ONE OF THOSE FOUR WAS ALREADY ANSWERABLE AND THREE WERE NOT. Roadmap 3.3
-- built `business_domains`, so "is a custom domain pointed at it" is a row
-- with a `verified_at` on it. The other three are facts about work done
-- OUTSIDE this product — a website that is designed, built and hosted by the
-- platform owner — and nothing in the schema has ever held them.
--
-- WHY THE ADDRESS IS NOT `business_domains.domain`. That column has a precise
-- meaning (3.3): a hostname that RESOLVES TO THIS APP, normally a subdomain
-- aliased onto our Netlify site, so the receipt and the plan page stop
-- carrying our brand. A detailer's WEBSITE is a different artifact that may
-- live anywhere, and conflating the two would put a host in that table which
-- does not serve this app — the exact failure 3.3's own header warns about,
-- where a customer opens their booking and gets a 404.
--
-- TWO COLUMNS, NOT A TABLE. One site per business, no history anybody has
-- asked for, and the note field beside it already carries "wants a gallery
-- page". A `tenant_sites` table with a status vocabulary is the shape to
-- reach for when a site has stages worth reporting on; nothing has measured
-- that, and this is the platform owner's own list of fewer than ten.
alter table public.businesses
  add column if not exists site_url        text,
  add column if not exists site_updated_at timestamptz;

comment on column public.businesses.site_url is
  'The detailer''s own website, built by hand outside this product. Null means they have not got one yet. Set from the platform back office only.';
comment on column public.businesses.site_updated_at is
  'When that address was last changed from the back office — "when was it last touched".';

-- THE DETAILER MAY READ THESE AND MAY NOT WRITE THEM, for the same reason
-- `business_domains.verified_at` is revoked: RLS chooses ROWS and says
-- nothing about COLUMNS, and `businesses` carries an owner update policy. The
-- address is not a secret from the detailer — it is their own website — but
-- "when did we last touch it" is the platform's record of its own work, and a
-- record the subject can edit is not a record. The service role, which is
-- what the back office runs as, is unaffected.
revoke update (site_url, site_updated_at) on public.businesses from authenticated;
