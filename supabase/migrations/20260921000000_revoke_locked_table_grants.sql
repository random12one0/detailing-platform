-- REVOKE THE BROWSER GRANTS ON TEN TABLES THAT ARE ALREADY LOCKED BY RLS.
--
-- Each of these has row-level security ENABLED and FORCED with ZERO policies,
-- so a browser role is already denied every row. What it does NOT have is a
-- revoke: all seven privileges are still granted to `anon` and
-- `authenticated`, so the lock is one part where `db-audit.mjs`'s own
-- NO_POLICY_BY_DESIGN comment claims it is two.
--
-- Measured 2026-09-21 across all twelve tables in that state: only
-- `session_pings` and `translation_usage` carried the revoke. They are NOT
-- listed below, and they are the two that prove this shape is the intended one
-- rather than a new idea.
--
-- **THIS CHANGES NO ROW AND NO POLICY.** It removes privileges that nothing
-- uses. Every reader of these tables is an edge function authenticating as
-- `service_role`, whose grants are untouched here; no browser client queries
-- any of them. Four measurements back that, and they are written out in
-- `docs/pending-migration-2026-09-21-revoke.md`:
--   1. greps for both `from('<table>')` and `rest/v1/<table>` across `app/src`
--      return nothing;
--   2. the four of these names that appear in `app/src` appear only inside
--      comments;
--   3. `AdminPage.jsx:69` fetches every byte through the `platform-admin`
--      edge function;
--   4. `supabase/functions/_shared/db.ts:23` builds its client with
--      `SERVICE_ROLE_KEY`, and every function touching these imports it.
--
-- **WHAT IT COSTS TO LEAVE:** on a granted table the first permissive policy
-- anybody writes to allow one `select` lands on top of `INSERT`, `UPDATE`,
-- `DELETE` and `TRUNCATE` that are already there. `anon` held `INSERT` on
-- `platform_admin_events` - the audit trail that "must not be forgeable" -
-- until this ran.
--
-- **`scripts/migration-drift.mjs` CANNOT SEE THIS MIGRATION.** A revoke leaves
-- no function, table or column behind, so a green there is not confirmation
-- that this was applied. `scripts/db-audit.mjs` section 5 is what answers it.

revoke all on public.platform_admins        from anon, authenticated;
revoke all on public.platform_admin_events  from anon, authenticated;
revoke all on public.platform_settings      from anon, authenticated;
revoke all on public.platform_promo_codes   from anon, authenticated;
revoke all on public.platform_email_days    from anon, authenticated;
revoke all on public.job_heartbeats         from anon, authenticated;
revoke all on public.rate_hits              from anon, authenticated;
revoke all on public.stripe_events          from anon, authenticated;
revoke all on public.address_points         from anon, authenticated;
revoke all on public.weather_grids          from anon, authenticated;
