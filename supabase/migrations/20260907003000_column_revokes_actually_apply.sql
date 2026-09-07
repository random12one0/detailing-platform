-- EVERY COLUMN-LEVEL REVOKE IN THIS REPO WAS A NO-OP, AND THREE FILES SAY
-- OTHERWISE. Found 2026-09-07 while building 8.13, by MEASURING rather than
-- by reading.
--
-- ---------------------------------------------------------------------------
-- THE FACT, WHICH IS THE WHOLE OF IT
-- ---------------------------------------------------------------------------
-- **A column-level `REVOKE UPDATE (col)` does nothing while the role still
-- holds TABLE-level `UPDATE`.** Postgres checks the table grant first and
-- never looks at the column list. Supabase grants `anon` and `authenticated`
-- full table privileges on everything in `public` by default, so
-- `revoke update (site_url, site_updated_at) on public.businesses from
-- authenticated` — which `20260906002000_site_columns.sql` runs and which
-- `custom-domains` § 5 and CLAUDE.md both describe as working — has never
-- prevented anything.
--
-- MEASURED, against the live project, with a real member session on a
-- throwaway business. A detailer holding only the `settings` permission could
-- PATCH every one of these and the value stuck:
--
--   · `status`               → **a business the platform SUSPENDED for
--     non-payment could switch its own booking page back on.** The entire
--     dunning mechanism — two weeks of retries, the emails, `suspended_at` —
--     rests on one column the subject could edit. This is the one that costs
--     money.
--   · `plan_tier`            → set yourself to `founding`.
--   · `is_demo`              → take yourself out of the founding count, which
--     is the number the public pricing page prints.
--   · `admin_notes_platform` → the platform's private note ABOUT them, which
--     `20260906001000` describes as theirs to read and never to write.
--   · `site_url`             → nominally revoked, above.
--   · `business_domains.verified_at` → **the same shape and the sharpest
--     one**: `20260906000000_custom_domains.sql` says in as many words that
--     without the revoke *"a detailer stamps their own row and the fetch is
--     decoration"*. The revoke is there and it is inert, so the fetch IS
--     decoration.
--
-- **`a record its subject can edit is not a record`** — roadmap 4.4 stage 2's
-- own sentence, which was true and was not enforced.
--
-- ---------------------------------------------------------------------------
-- THE FIX: TAKE THE TABLE GRANT AWAY FIRST, THEN GRANT THE COLUMNS BACK.
-- ---------------------------------------------------------------------------
-- The allowlist below is DISCOVERED rather than guessed — it is what
-- `app/src/screens/more/BusinessInfo.jsx` and `app/src/components/SetupForm.jsx`
-- actually write, plus 8.13's two new columns. Everything else is written by
-- an edge function under the service role, which bypasses this entirely.
--
-- **RLS IS UNCHANGED AND STILL DOES ITS JOB.** RLS chooses ROWS; grants choose
-- COLUMNS. `businesses_permission_update` still requires the `settings`
-- permission on that business — this only decides which columns that
-- permission reaches.
--
-- **`anon` LOSES UPDATE ON BOTH TABLES OUTRIGHT.** It had it, from the same
-- default. No policy lets anon through, so nothing changes today — but a
-- policy written tomorrow would inherit a full-table write grant nobody
-- intended to give it.

-- --------------------------------------------------------------------------
-- businesses
-- --------------------------------------------------------------------------
revoke update on public.businesses from authenticated, anon;

grant update (
  -- What BusinessInfo.jsx writes.
  name,
  contact_email,
  contact_phone,
  dropoff_address,
  mailing_address,
  service_area,
  timezone,
  established_year,
  -- Roadmap 8.13 — the detailer's own pause. Deliberately NOT `status`.
  closed_until,
  closed_note
) on public.businesses to authenticated;

-- --------------------------------------------------------------------------
-- business_domains — `verified_at` is the whole point of this half.
-- --------------------------------------------------------------------------
revoke update on public.business_domains from authenticated, anon;

-- A detailer may ADD and REMOVE their own domain rows (those are separate
-- privileges and are untouched). What they may not do is stamp one as
-- verified: `verify-domain` fetches `/platform-host.txt` from the address
-- itself, under the service role, and that fetch is the verification.
grant update (domain) on public.business_domains to authenticated;

-- --------------------------------------------------------------------------
-- The columns 20260906002000 tried to protect, now that the revoke can work.
-- Kept as an explicit statement so a reader of THAT migration finds this one.
-- --------------------------------------------------------------------------
revoke update (site_url, site_updated_at, status, plan_tier, is_demo,
               admin_notes_platform, last_campaign_at)
  on public.businesses from authenticated, anon;
