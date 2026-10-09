-- ROADMAP 0.4 — THE DAY WORK STARTS ON A DETAILER'S WEBSITE.
--
-- `/pricing` and `/terms` have both been printing this since 2026-09-05:
--
--   *"It stops being refundable once work on your site begins, and you are
--   told on the day that happens."*
--
-- **There was no such day in the product.** No column marked a build as
-- started, no email said it, no screen showed it — and that sentence is what
-- ends a detailer's right to a refund on the largest single charge here. The
-- promise was found unbacked on 2026-10-08 by reading `/pricing`'s disclosure
-- clauses against the terms one at a time; Andrew ruled on 2026-10-09 to make
-- the promise true rather than to delete it.
--
-- ---------------------------------------------------------------------------
-- WHY IT IS ON `businesses` AND NOT ON `platform_subscriptions`
-- ---------------------------------------------------------------------------
-- The contractual neighbours are there — `setup_cents`, `consented_at`,
-- `exit_fee_charged_cents` — and that row has no write policy at all, so it
-- was the first candidate. It is refused for one measured reason: **there are
-- zero subscription rows today**, so the first website Andrew builds by hand
-- will be for a business that has never been through Stripe checkout, and a
-- column that lives on the subscription cannot record it. The notice would be
-- unsendable in exactly the case that happens first.
--
-- `businesses` already holds `site_url` and `site_updated_at` for precisely
-- this kind of fact — *"the platform owner's record of a site he built by
-- hand"*, `20260906002000_site_columns.sql` — and every business has a row.
-- This belongs beside them.
--
-- ---------------------------------------------------------------------------
-- AND NOT ON `site_intake`, WHICH IS THE TRAP
-- ---------------------------------------------------------------------------
-- `site_intake` is the website brief and already carries `submitted_at`, so
-- "the build" looks like its subject. It carries
-- `site_intake_owner_update` — an unrestricted owner UPDATE policy — so a
-- detailer could move their own refund deadline. **A record its subject can
-- edit is not a record**, which is roadmap 4.4 stage 2's own sentence and the
-- whole reason `20260907003000` exists.
--
-- ---------------------------------------------------------------------------
-- THE DETAILER MAY READ IT AND MAY NOT WRITE IT
-- ---------------------------------------------------------------------------
-- `20260907003000_column_revokes_actually_apply.sql` took TABLE-level update
-- on `businesses` away from `authenticated` and `anon` and granted back a
-- named allowlist, so a column added afterwards is unwritable by them with no
-- further statement — Postgres grants nothing on `ADD COLUMN`. The revoke
-- below is therefore a no-op today and is written anyway, for the same reason
-- that file states its own list explicitly: so a reader of THIS migration
-- finds the rule without having to know the history, and so a future
-- `grant update on public.businesses` cannot silently hand it over.
--
-- IT IS WRITTEN ONCE AND NEVER MOVED, enforced in `platform-admin`
-- (`build_start` refuses a business that already has a date) rather than by a
-- constraint, because the one legitimate reason to clear it is a build that
-- was marked started by mistake, and that is a service-role correction.
alter table public.businesses
  add column if not exists site_build_started_at timestamptz;

comment on column public.businesses.site_build_started_at is
  'ROADMAP 0.4. The day work started on this detailer''s website, stamped server-side by the back office at the moment the notice is emailed. Null means it has not started. This is the date /terms and /pricing make the build fee stop being refundable on, so it is written once and never moved.';

revoke update (site_build_started_at) on public.businesses from authenticated, anon;
