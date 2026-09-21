// A HEALTH CHECK ON THE DATABASE ITSELF — 2026-09-07, at the owner's ask:
// *"Look for any errors or risks and make improvements… even in the database
// you can do stuff with that also."*
//
// ---------------------------------------------------------------------------
// WHY THIS EXISTS WHEN SUPABASE HAS ADVISORS OF ITS OWN
// ---------------------------------------------------------------------------
// Supabase's dashboard has a security and performance linter, and it is good.
// It is also **behind a login and a permission this session does not hold**,
// which means it is a check somebody has to remember to go and look at — the
// same shape as the monitoring problem roadmap 8.12 exists to solve.
//
// So the four lints that actually matter for THIS schema are here, in the repo,
// runnable with the credentials every other script already uses. It **writes
// nothing** and it is safe to run against any project.
//
//   node scripts/db-audit.mjs
//
// ---------------------------------------------------------------------------
// WHAT IT ASKS, AND WHY EACH ONE IS THE RIGHT QUESTION FOR THIS PRODUCT
// ---------------------------------------------------------------------------
// **1 · A TABLE WITH NO ROW-LEVEL SECURITY.** This is a multi-tenant product
// where the browser holds an anon key and every table it can reach is behind
// RLS. One table without it is every detailer's rows readable by every other
// detailer, and nothing on any screen would look different.
//
// **2 · RLS ON, POLICIES NONE.** Usually a mistake — a table nobody can read.
// **Here it is sometimes deliberate and load-bearing**: `platform_admins` and
// `platform_admin_events` have RLS FORCED with no policies on purpose, so a
// detailer cannot discover who the admins are or forge an audit row. So this
// prints rather than fails, and names the two that are meant to be that way.
//
// **3 · A `security definer` FUNCTION WITH NO `search_path`.** A definer
// function runs as its owner; without a pinned `search_path` a caller can put
// their own schema in front of `public` and have it call their function
// instead of ours. Every one in this repo is supposed to set it.
//
// **4 · A FOREIGN KEY WITH NO INDEX.** Postgres does not create one, and every
// `where business_id = …` in this product — which is nearly every query it
// makes — is that lookup. It is the difference between fast at fifty detailers
// and slow at five hundred, and it is invisible until it is not.

import { readFileSync } from "node:fs";
import { writeReceipt } from "./receipt.mjs";

const env = Object.fromEntries(
  readFileSync(new URL("../.env", import.meta.url), "utf8")
    .split(/\r?\n/).filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]),
);
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN || env.SUPABASE_ACCESS_TOKEN;
const REF = process.env.SUPABASE_PROJECT_REF || env.SUPABASE_PROJECT_REF;
if (!TOKEN || !REF) {
  // EXIT 1, NOT 0 - 2026-09-13. This printed SKIPPED and exited 0, so a run
  // with no credentials was indistinguishable from a clean schema audit to
  // anything reading the exit code. Same shape as tests/definer-grants, found
  // in the same sweep. CLAUDE.md sends a session here after every migration;
  // a green exit that audited nothing is the most expensive answer it can give.
  console.error("SKIPPED — needs SUPABASE_ACCESS_TOKEN and SUPABASE_PROJECT_REF.");
  console.error("        Nothing was audited. Run: set -a; . ./.env; set +a");
  console.error("        Exiting 1 so this cannot be mistaken for a clean audit.");
  process.exit(1);
}

const started_at = new Date().toISOString();
const BREAK = (process.argv.find((a) => a.startsWith("--break=")) || "").split("=")[1] || "";

// **THIS GATE COULD NOT FAIL AND WROTE NO RECEIPT - 2026-09-21,
// docs/silences.md section A.** It ended on `N to look at` and **had no
// `process.exit` on findings at all**: the only one in the file guards missing
// credentials. So it found two real problems, printed them, and exited 0,
// inside CLAUDE.md's verification table where a session is told to run it
// after a migration. Nothing graded it and nothing could fail it.
//
// 5 checks, counted from the say() call sites in this file: RLS off,
// locked-with-nothing-to-unlock, open-to-a-caller's-own-schema, unindexed
// foreign keys, and (2026-09-21) locked-by-RLS-with-grants-still-open. So
// a check that stops running is a failure rather than a smaller audit.
const EXPECTED_CHECKS = 5;
let checksRun = 0;

async function q(sql) {
  // `--break=blind` makes every query come back empty, which is exactly what a
  // permissions change, a Management API shape change, or the swallowed JSON
  // parse below would do. Every `say()` then prints `ok` and the audit reads
  // clean over a database nobody actually looked at.
  if (BREAK === "blind") return [];
  const res = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query: sql }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${res.status} ${text.slice(0, 200)}`);
  try { return JSON.parse(text); } catch { return []; }
}

// **THE TABLES THAT ARE MEANT TO HAVE NO POLICIES.** Named rather than
// guessed, so an EIGHTH one showing up is a finding rather than noise — and a
// check that cries wolf on every run is a check nobody reads.
//
// All seven carry `force row level security` with no policy at all, which is
// the strongest statement available: nothing holding an anon or a signed-in key
// can read a row, and only the service role — which is to say only an edge
// function — ever touches them. **Verified against the live project rather than
// assumed**, on 2026-09-07.
//
// It matters most for two of them. A detailer who could read `rate_hits` could
// clear their own spam throttle; one who could read `platform_promo_codes`
// could use a code nobody ever offered them.
const NO_POLICY_BY_DESIGN = new Set([
  "platform_admins",        // who the admins are, and nobody may make themselves one
  "platform_admin_events",  // the audit trail, which must not be forgeable
  "platform_settings",      // the owner's email, the healthcheck URL, the prices
  "platform_promo_codes",   // OUR codes, for a detailer buying a subscription
  "platform_email_days",    // the shared daily email quota
  "job_heartbeats",         // whether the scheduled jobs are alive
  "rate_hits",              // the spam throttle's own counters
  "stripe_events",          // the webhook idempotency lock
  // Both added 2026-09-13 after this audit reported them as unexpected. Each
  // carries the same three lines as the eight above - `enable`, `force`, and
  // `revoke all from anon, authenticated` - so a browser cannot reach either
  // one at all and a policy would be the thing that WEAKENED it.
  "session_pings",          // whether a Claude session is still alive
  "translation_usage",      // the three providers' remaining character allowances
]);

// **THE FOREIGN KEYS DELIBERATELY LEFT UNINDEXED**, with the reason, so this
// reports a NEW one rather than these four for ever.
//
// Every one points at `auth.users`, and **this product never deletes an auth
// user.** Forgetting a customer deletes a `customers` row; removing a staff
// member deletes a MEMBERSHIP. Nothing anywhere deletes the account itself, so
// the check these would speed up is never run.
// `20260907008000_foreign_key_indexes.sql` carries the same list and the same
// reasoning; if it ever stops being true, both change together.
const UNINDEXED_BY_DESIGN = new Set([
  "business_invites (invited_by)",
  "job_photos (created_by)",
  "owner_push_subscriptions (user_id)",
  "platform_admin_events (admin_id)",
]);

let findings = 0;
const say = (label, rows, fmt) => {
  checksRun++;
  if (!rows.length) { console.log(`  ok    ${label}`); return; }
  findings += rows.length;
  console.log(`  FOUND ${label} — ${rows.length}`);
  for (const r of rows.slice(0, 20)) console.log(`          ${fmt(r)}`);
  if (rows.length > 20) console.log(`          … and ${rows.length - 20} more`);
};

console.log("1. every table a browser can reach is behind row-level security");
say("no table in public has RLS switched off", await q(`
  select c.relname as table
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity
   order by 1`), (r) => r.table);

console.log("\n2. RLS on, and something to enforce");
{
  const rows = await q(`
    select c.relname as table
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity
       and not exists (select 1 from pg_policy p where p.polrelid = c.oid)
     order by 1`);
  const unexpected = rows.filter((r) => !NO_POLICY_BY_DESIGN.has(r.table));
  for (const r of rows.filter((x) => NO_POLICY_BY_DESIGN.has(x.table))) {
    console.log(`  ok    ${r.table} — no policies, and that is the design`);
  }
  say("no other table is locked with nothing to unlock it", unexpected, (r) => r.table);
}

console.log("\n3. every security-definer function pins its search_path");
say("none is left open to a caller's own schema", await q(`
  select p.proname as fn
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.prosecdef
     and (p.proconfig is null
          or not exists (select 1 from unnest(p.proconfig) c where c like 'search_path=%'))
   order by 1`), (r) => r.fn);

console.log("\n4. every foreign key has an index to look it up by");
{
  // **COVERED MEANS "AN INDEX WHOSE FIRST COLUMN IS ONE OF THE KEY'S", NOT AN
  // EXACT MATCH.** The first version demanded an index whose leading columns
  // equalled the key exactly, and it reported `booking_vehicles(business_id,
  // booking_id)` as unindexed while `booking_vehicles_booking_idx` sits right
  // there — an index Postgres will happily use for that check, filtering on the
  // other column. **A composite key is served by an index on its most selective
  // part**, and `booking_id` is far more selective than `business_id`.
  //
  // A check that reports a covered key is the same defect as one that misses an
  // uncovered one: both end with somebody ignoring the output.
  const rows = await q(`
  select conrelid::regclass::text as tbl,
         (select string_agg(attname, ', ' order by attnum)
            from pg_attribute
           where attrelid = conrelid and attnum = any(conkey)) as cols
    from pg_constraint c
   where contype = 'f'
     and connamespace = 'public'::regnamespace
     and not exists (
       select 1 from pg_index i
        where i.indrelid = c.conrelid
          and (i.indkey::smallint[])[0] = any(c.conkey))
   order by 1`);
  const named = rows.map((r) => `${r.tbl} (${r.cols})`);
  for (const k of named.filter((x) => UNINDEXED_BY_DESIGN.has(x))) {
    console.log(`  ok    ${k} — only walked by deleting an auth user, which never happens`);
  }
  say("no other foreign key is left without one",
    named.filter((x) => !UNINDEXED_BY_DESIGN.has(x)).map((k) => ({ k })), (r) => r.k);
}


// --- 5 · a lock made of TWO parts, and this file only ever read one --------
// **ADDED 2026-09-21 AFTER THIS AUDIT'S OWN COMMENT TURNED OUT TO BE WRONG.**
// The `NO_POLICY_BY_DESIGN` list above says each of its tables carries
// "`enable`, `force`, and `revoke all from anon, authenticated`", so that "a
// browser cannot reach either one at all". Measured across all ten: **only two
// of them do.** `session_pings` and `translation_usage` have the grants
// revoked. The other eight - including `platform_admins`, `platform_settings`
// and `platform_admin_events`, the audit trail that "must not be forgeable" -
// still grant all seven privileges to `anon` and `authenticated`.
//
// **Both groups look identical to a check that reads only the policy count**,
// which is what this file did. They are not identical:
//
//   revoked  -> PostgREST answers 401 permission denied. Measured.
//   granted  -> PostgREST answers 200 with an empty array, because forced RLS
//               with no policy denies every ROW. Also measured.
//
// Safe today, both ways. The difference is what happens NEXT: on a granted
// table, the first permissive policy anybody writes to allow one `select`
// arrives on top of `INSERT`, `UPDATE`, `DELETE` and `TRUNCATE` that are
// already there. **`anon` holds `INSERT` on the audit trail today.**
//
// This is the "an inert policy is a trap" lesson two sections up, inverted: a
// GRANT with no policy reads as safe and is one policy away from not being.
console.log("\n5. a table locked by RLS alone, with its grants still open");
{
  const rows = await q(`
    select c.relname as table,
           coalesce((select count(*)::int from information_schema.role_table_grants g
                      where g.table_schema = 'public' and g.table_name = c.relname
                        and g.grantee in ('anon','authenticated')), 0) as grants
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relkind = 'r'
       and c.relrowsecurity
       and (select count(*) from pg_policy p where p.polrelid = c.oid) = 0
     order by 1`);
  for (const r of rows.filter((x) => Number(x.grants) === 0)) {
    console.log(`  ok    ${r.table} — RLS on, no policy, AND the grants revoked: a browser is refused outright`);
  }
  const open = rows.filter((x) => Number(x.grants) > 0);
  say("no table is held shut by RLS alone while its grants stay open to a browser",
    open, (r) => `${r.table} — ${r.grants} privilege(s) still granted to anon/authenticated; `
      + `one permissive policy would open the writes too`);
}

// --- THE CANARY -----------------------------------------------------------
// **WHAT SILENTLY BREAKS HERE IS `q()`, NOT THE SCHEMA.** Every check is
// `say(label, rows)` where `rows` came back from one query, and `say` prints
// `ok` on an empty array. So if `q()` returned `[]` for everything — a
// permissions change, a Management API shape change, or the
// `catch { return []; }` on its JSON parse — all four checks print `ok` and
// the audit reads CLEAN over a database nobody looked at.
//
// So one query is asked whose answer cannot legally be empty: the `public`
// tables themselves. If that comes back empty, every `ok` above is a sentence
// about nothing.
const canaryRows = await q(`select c.relname as t from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
 where n.nspname = 'public' and c.relkind = 'r' limit 5`);
const canaryCaught = canaryRows.length > 0;
console.log("");
console.log(`canary  public must contain tables -> ${canaryRows.length} returned  `
  + (canaryCaught
    ? "caught: queries are really answering, so an `ok` above means something"
    : "NOT CAUGHT — the database answered nothing, so every `ok` above is about nothing"));

// --- SUBJECT COUNTS, AND ZERO IS A FAILURE --------------------------------
const auditFailures = [];
if (checksRun === 0) {
  auditFailures.push("ZERO CHECKS RAN. Nothing was asked of the database, so this audit "
    + "proves nothing. This is NOT a clean database.");
} else if (checksRun !== EXPECTED_CHECKS) {
  auditFailures.push(`CHECK COUNT MOVED: ${checksRun} check(s) ran and EXPECTED_CHECKS `
    + `declares ${EXPECTED_CHECKS}. A check that stopped running is a failure, not a `
    + `smaller audit — move the number deliberately and say which check changed.`);
}
// **AND THE FINDINGS NOW FAIL THE RUN.** They never did: there was no
// `process.exit` on them at all, so two real problems printed and exited 0.
if (findings > 0) {
  auditFailures.push(`${findings} finding(s) to look at — see FOUND above`);
}

const { path: receiptPath } = writeReceipt({
  check_id: "db-audit",
  started_at,
  status: auditFailures.length === 0 && canaryCaught ? "pass" : "fail",
  expected_targets: EXPECTED_CHECKS,
  discovered_targets: checksRun,
  attempted_targets: checksRun,
  completed_targets: checksRun,
  skipped_targets: 0,
  assertions_executed: checksRun + 1,
  min_assertions: 5,
  failures: auditFailures,
  artifacts: ["scripts/db-audit.mjs"],
  warnings: BREAK ? [`run with --break=${BREAK}; this receipt is a sabotage, not a result`] : [],
  dimensions: { project: REF, checks: EXPECTED_CHECKS },
  canary: {
    id: "public must contain tables · an empty answer means the queries are not answering",
    observed_failure: canaryCaught,
    caught_by: canaryCaught ? ["query-answers"] : [],
    findings: canaryCaught
      ? [`[query-answers] ${canaryRows.length} table(s) came back, so an empty result above is a real answer rather than a silent no-op`]
      : ["[query-answers] NOT CAUGHT — the database returned nothing for a query that cannot legally be empty, so every `ok` above is a sentence about nothing"],
  },
});

console.log("");
console.log(findings === 0 ? "clean" : `${findings} to look at`);
for (const f of auditFailures) console.log("  · " + f);
console.log(`Receipt ${receiptPath}`);
process.exit(auditFailures.length === 0 && canaryCaught ? 0 : 1);
