# PENDING MIGRATION — revoke the browser grants on ten locked tables

**NOT APPLIED. NOT EVEN PLACED IN `supabase/migrations/`.** Andrew's manager's
ruling, 2026-09-21: the revoke is a live change to a running database and the
public booking page reads this project, so it is not applied at two in the
morning on the same round it is written. **It gets applied in a round where
somebody holds the browser and can walk the public page immediately
afterwards.**

**Why it is in `docs/` and not in `supabase/migrations/`.** `supabase/` is the
other session's lane this round. The migration is written here, complete and
verbatim, with the filename it should take. **Moving it is a one-line copy by
whoever holds that lane** — it is not a draft to be rewritten.

Intended path: `supabase/migrations/20260921000000_revoke_locked_table_grants.sql`

---

## The finding this closes

`scripts/db-audit.mjs`'s `NO_POLICY_BY_DESIGN` list asserts each of its tables
carries *"`enable`, `force`, and `revoke all from anon, authenticated`"*, so
that *"a browser cannot reach either one at all"*.

**Measured across all ten, 2026-09-21: only two of them do.**

| grants to `anon` / `authenticated` | tables |
|---|---|
| **revoked (0)** | `session_pings`, `translation_usage` |
| **all 7 privileges, each role** | `platform_admins`, `platform_admin_events`, `platform_settings`, `platform_promo_codes`, `platform_email_days`, `job_heartbeats`, `rate_hits`, `stripe_events`, `address_points`, `weather_grids` |

Both states are **safe today**, and the difference was invisible to the audit
until `db-audit.mjs` § 5 was added in `3a4ce11`:

- **revoked** → PostgREST answers **`401 permission denied`**
- **granted** → PostgREST answers **`200` with `[]`**, because forced RLS with
  no policy denies every row

Both measured with the anon key against tables that demonstrably hold rows
(`address_points` 19, `weather_grids` 11).

**What it costs to leave.** On a granted table, the first permissive policy
anybody writes to allow one `select` arrives on top of `INSERT`, `UPDATE`,
`DELETE` and `TRUNCATE` that are already there. **`anon` holds `INSERT` on
`platform_admin_events` today** — the audit trail the list itself describes as
the one that "must not be forgeable".

---

## THE EVIDENCE THAT REVOKING CANNOT BREAK THE BOOKING PAGE

Four measurements, all repeatable:

**1 · No browser client reads any of the ten.** Searched `app/src/` for both
shapes a browser read can take:

```bash
grep -rnE "from\(['\"\`](platform_admins|platform_admin_events|platform_settings|platform_promo_codes|platform_email_days|job_heartbeats|rate_hits|stripe_events|address_points|weather_grids)" app/src/
grep -rnE "rest/v1/(platform_|job_heartbeats|rate_hits|stripe_events|address_points|weather_grids)" app/src/
```

**Both return nothing.**

**2 · The four names that DO appear in `app/src` appear only in comments.**
`lib/impersonation.js` and `main.jsx` mention `platform_admins` while
explaining that the gate is elsewhere and *"this file never asks it anything"*.
`admin/AdminPage.jsx` and `landing/pricing.js` mention `platform_settings` and
`platform_email_days` in prose about where the data comes from. **No query.**

**3 · The back office takes every byte through an edge function.**
`AdminPage.jsx:22` — *"EVERY BYTE STILL COMES FROM THE `platform-admin` EDGE
FUNCTION"* — and `:69` fetches `${VITE_SUPABASE_URL}/functions/v1/platform-admin`.

**4 · Every function that touches these tables uses the service-role key, which
this migration does not alter.** `supabase/functions/_shared/db.ts:23` builds
its client as `createClient(SUPABASE_URL, SERVICE_ROLE_KEY)`, and
`platform-admin`, `create-business`, `stripe-webhook` and `calculate-booking`
all import that client. `service_role`'s grants are separate from `anon`'s and
`authenticated`'s and are untouched below.

**So the public booking page cannot be affected: it never reads these tables,
and the functions that do authenticate as a role this migration leaves alone.**

---

## IF THE EVIDENCE HAD GONE THE OTHER WAY

It did not, but the ruling covered it and it is worth keeping: **if something
had turned out to read one of these directly, then the comment is what is
wrong rather than the tables.** The answer in that case is to delete the claim,
not to apply a revoke that breaks a page. **What must never happen is a comment
asserting a lock that eight tables do not have** — which is the state this
found and which `db-audit.mjs` § 5 now reports every run whether or not this
migration is ever applied.

---

## THE MIGRATION

```sql
-- REVOKE THE BROWSER GRANTS ON TEN TABLES THAT ARE ALREADY LOCKED BY RLS.
--
-- Each of these has row-level security ENABLED and FORCED with ZERO policies,
-- so a browser role is already denied every row. What it does NOT have is a
-- revoke: all seven privileges are still granted to `anon` and
-- `authenticated`, so the lock is one part where `db-audit.mjs`'s own
-- NO_POLICY_BY_DESIGN comment claims it is two.
--
-- `session_pings` and `translation_usage` are NOT listed below: they already
-- carry the revoke, and they are the two that prove this shape is the intended
-- one rather than a new idea.
--
-- **THIS CHANGES NO ROW AND NO POLICY.** It removes privileges that nothing
-- uses. Every reader of these tables is an edge function authenticating as
-- `service_role`, whose grants are untouched; no browser client queries any of
-- them. The evidence is in docs/pending-migration-2026-09-21-revoke.md.
--
-- After applying: `node scripts/db-audit.mjs` § 5 should report all twelve as
-- `ok ... AND the grants revoked`, and PostgREST should answer 401 rather than
-- 200 [] for each. Walk the public booking page before believing either.

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
```

---

## AFTER IT IS APPLIED, IN THE SAME ROUND

1. `node scripts/db-audit.mjs` — § 5 must report **twelve** `ok` lines and zero
   findings for that check.
2. Walk the **public booking page** for a real tenant, and the **back office**.
   Neither reads these tables, so neither should change — **that is the claim
   being tested, and it is why this waits for somebody with a browser.**
3. `node scripts/migration-drift.mjs` — it will not see this migration at all.
   **A `revoke` leaves no function, table or column behind**, and that limit is
   already written in its header. It is named here so nobody reads a green
   `migration-drift` as confirmation that this was applied.
