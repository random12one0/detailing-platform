-- A REVIEW LINK HAS TO BE A LINK — 2026-09-07.
--
-- Found by a security review of the emails, at the owner's ask to *"look for
-- any errors or risks"*.
--
-- ---------------------------------------------------------------------------
-- WHAT WAS WRONG
-- ---------------------------------------------------------------------------
-- `business_settings.google_review_url` and `yelp_review_url` are plain `text`,
-- written straight from a browser form with no validation of any kind, and the
-- thank-you email drops them **unescaped** into an `href` attribute:
--
--     <a href="${href}" …>
--
-- So a detailer could type `"><a href="https://…">Confirm your card</a><a href="`
-- into their own settings and have an arbitrary link appear inside every
-- thank-you email their customers receive — an email those customers correctly
-- trust, because it genuinely came from their detailer.
--
-- **AND IT REACHES FURTHER THAN EMAIL.** Both columns are published by
-- `get_public_business_profile`, so they land on the tenant's own website too
-- (roadmap phase 3). In a BROWSER a `javascript:` href is not inert the way it
-- is in a mail client, and that is the version of this that actually runs code.
--
-- ---------------------------------------------------------------------------
-- WHY A CONSTRAINT AND NOT JUST AN ESCAPE
-- ---------------------------------------------------------------------------
-- `emailKit.ts` now escapes every URL it puts in an attribute, which closes the
-- break-out. **That is the fix for the SINK, and there are three sinks** — the
-- email, the public profile, and whatever a tenant site does with it. Escaping
-- each one is a list to keep, and this repo has already been short by one on
-- exactly that shape of list twice.
--
-- **So the value is constrained where it is STORED.** `payments.ts` already
-- takes this position for payment handles — *only a plain username or a pasted
-- `https:` URL becomes a link* — and this is the same rule one column over.
--
-- `https` only, not `http`: a review link is a public page on Google or Yelp
-- and both are https, so allowing plaintext buys nothing and permits a
-- downgrade. The length ceiling is the same 180 `payments.ts` uses.
--
-- **NOT VALID FOR EXISTING ROWS IS NOT NEEDED HERE** — every row was checked
-- first: 14 settings rows, one review URL each on two of them, both already
-- `https://`. Nothing is rejected by adding this.

alter table public.business_settings
  add constraint business_settings_google_review_url_is_https
    check (
      google_review_url is null
      or google_review_url ~ '^https://[A-Za-z0-9._~:/?#@!$&*+,;=%()\[\]-]{3,180}$'
    );

alter table public.business_settings
  add constraint business_settings_yelp_review_url_is_https
    check (
      yelp_review_url is null
      or yelp_review_url ~ '^https://[A-Za-z0-9._~:/?#@!$&*+,;=%()\[\]-]{3,180}$'
    );

comment on column public.business_settings.google_review_url is
  'ROADMAP 8 audit — https only, by check constraint. It becomes an href in the '
  'thank-you email AND on the tenant''s own website, and an unvalidated one is a '
  'link a detailer can point anywhere inside mail their customers trust.';
comment on column public.business_settings.yelp_review_url is
  'https only, by check constraint. See google_review_url.';
