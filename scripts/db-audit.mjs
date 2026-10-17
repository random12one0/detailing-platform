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

import { readdirSync, readFileSync } from "node:fs";
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
// 2026-10-17 (ROADMAP 97.12): 6 -> 7, the booking-child pair-key check (section 6).
const EXPECTED_CHECKS = 7;
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
  // **ADDED 2026-09-21, AND THE EVIDENCE IS THE ENTRY.** Andrew's manager's
  // ruling, reversing an earlier refusal, and the reason for the reversal is
  // worth more than the entry: when these two were first flagged they were
  // "two names nobody could account for", and a finding nobody has explained
  // must not be quieted. They were then investigated. **An allowlist entry
  // backed by that is a record of a decision; an entry backed by nothing is
  // the omission this file exists to prevent.**
  //
  // WHAT THEY ARE. Shared caches, and the shape is the point: **neither
  // carries a `business_id`**, so neither is tenant-owned and there is no
  // per-tenant row for a policy to select. `address_points` (key, lat, lon,
  // found, resolved_at — 19 rows) is the geocoding cache;
  // `weather_grids` (grid_key, lat, lon, periods, place, fetched_at — 11 rows)
  // is the NWS forecast cache. Written and read ONLY by edge functions:
  // `calculate-booking`, `refresh-weather` and `_shared/weatherCache.ts`, all
  // of which import `_shared/db.ts`, whose client is built with
  // `SERVICE_ROLE_KEY`. **No browser client queries either one** — greps for
  // both `from('<table>')` and `rest/v1/<table>` across `app/src` return
  // nothing, and the single `address_points` mention there is a `ponytail:`
  // comment about a future upgrade.
  //
  // WHAT LOCK THEY CARRY INSTEAD OF A POLICY. The same two-part one the ten
  // above carry as of `20260921000000_revoke_locked_table_grants.sql`: RLS
  // **enabled and forced** with zero policies, AND **`revoke all from anon,
  // authenticated`**. Measured after that migration: PostgREST answers
  // **401 permission denied** to the anon key, where before it answered
  // **200 with an empty array** — a denial indistinguishable from an empty
  // table.
  //
  // **WHAT VOIDS THESE TWO ENTRIES, and it is enforced rather than promised.**
  // If either table loses the grant revoke, or gains a reason to need a
  // policy, the entry is void and the finding returns. Section 2 above
  // excuses an allowlisted table **only while its grants are still revoked**,
  // so this condition fires by itself rather than waiting for somebody to
  // re-read this comment. An allowlist with no expiry condition is a quiet
  // omission with better manners.
  "address_points",         // geocoding cache, no business_id, service-role only
  "weather_grids",          // NWS forecast cache, no business_id, service-role only
  // **ADDED 2026-09-23 — ROADMAP 6.2 and 6.3's outside monitoring.** Same
  // shape as the two above, with one honest difference. `site_probes` and
  // `site_probe_events` carry **no `business_id`** at all, so there is no
  // per-tenant row for a policy to select. **`tenant_watch` DOES carry one**,
  // and it is still not tenant-owned: it is the PLATFORM's running note about
  // a detailer — how many sweeps in a row their page has been unbookable —
  // and a detailer has no business reading it, any more than they may read
  // `platform_admin_events`. A policy here would be the thing that weakened
  // it. Written this out rather than reusing the sentence above, because the
  // first draft of this entry claimed all three had no `business_id` and one
  // of them plainly does. Written and read only by `pg_cron`, through
  // `probe_live_site()` and `watch_tenant_bookability()`, both
  // `security definer` with a pinned `search_path`. No browser client touches
  // any of them; nothing in `app/src` names them.
  //
  // **AND THIS AUDIT CAUGHT THEM TWICE ON THE NIGHT THEY WERE WRITTEN, WHICH
  // IS THE ARGUMENT FOR THE ENTRY RATHER THAN AGAINST IT.** First with RLS on
  // and the grants to `anon` still open — a real hole, one permissive policy
  // from exposure, on a table whose `headers` column then held an API key
  // (since removed, `20260923050000`). Then again, correctly, as tables
  // locked with nothing to unlock them and no entry here to say why. The
  // first was a fault and was fixed; this is the second being answered.
  //
  // **The grant lock is what excuses them and it expires by itself**: the
  // `excused` test above holds only while `grants === 0`, so if anybody ever
  // re-grants these, the entry voids and this file says so by name.
  "site_probes",            // outside-check definitions, no business_id, pg_cron only
  "site_probe_events",      // outage/recovery history for those checks
  "tenant_watch",           // per-detailer bookability state, keyed by business_id
  // **ADDED 2026-10-13 — ROADMAP 98.6.** 14.39's run at `0c74abf2` reported
  // these three as locked with nothing to unlock them, and section 5 of the
  // same run showed all three with RLS on, no policy and 0 browser grants.
  // Each migration says in its own header that it is a server-only store, and
  // each carries `enable`, `force` and `revoke all from anon, authenticated`.
  // Every reader and writer imports `_shared/db.ts` (`SERVICE_ROLE_KEY`):
  // `update-booking`/`invite-user` via `_shared/actionLog.ts`, `platform-admin`,
  // `send-invoice`. Nothing in `app/src` names any of them. Same expiry as the
  // rest: a regrant voids the entry by itself.
  "action_log",             // 20261006050000: append-only audit history of job changes
  "platform_costs",         // 20261006020000: Andrew's hand-entered costs, platform-admin only
  "send_invoice_attempts",  // 20261006062000: send-invoice's repeat-press claim store
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
let blindPairCheck = false;
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
    select c.relname as table,
           coalesce((select count(*)::int from information_schema.role_table_grants g
                      where g.table_schema = 'public' and g.table_name = c.relname
                        and g.grantee in ('anon','authenticated')), 0) as grants
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity
       and not exists (select 1 from pg_policy p where p.polrelid = c.oid)
     order by 1`);
  // **THE ALLOWLIST EXCUSES A TABLE ONLY WHILE ITS LOCK IS STILL THERE —
  // 2026-09-21.** Every entry below is excused because it carries the
  // two-part lock: forced RLS with no policy, AND the browser grants revoked.
  // **If a table loses the grant half, being on the list stops excusing it and
  // the finding comes back by itself.** An allowlist with no expiry condition
  // is a quiet omission with better manners; this one expires mechanically
  // rather than in a comment somebody has to remember to read.
  // `--break=regrant` puts the browser grants back on one allowlisted table in
  // the READING only - nothing is granted in the database - which is what that
  // table losing its lock would look like from here.
  if (BREAK === "regrant") {
    const victim = rows.find((r) => NO_POLICY_BY_DESIGN.has(r.table));
    if (victim) { victim.grants = 7; console.log(`--break=regrant: pretending ${victim.table} got its grants back`); }
  }
  // `--break=stranger` adds a locked table nobody has explained, in the
  // reading only, so the allowlist growing cannot quietly excuse an accident.
  if (BREAK === "stranger") {
    rows.push({ table: "zz_unexplained_lock", grants: 0 });
    console.log("--break=stranger: pretending zz_unexplained_lock is locked with no entry");
  }
  const excused = (r) => NO_POLICY_BY_DESIGN.has(r.table) && Number(r.grants) === 0;
  const voided = rows.filter((r) => NO_POLICY_BY_DESIGN.has(r.table) && Number(r.grants) > 0);
  const unexpected = rows.filter((r) => !NO_POLICY_BY_DESIGN.has(r.table));
  for (const r of rows.filter(excused)) {
    console.log(`  ok    ${r.table} — no policies, and that is the design (grants revoked, so the lock still holds)`);
  }
  say("no allowlisted table has lost the grant lock its entry depends on", voided,
    (r) => `${r.table} — ALLOWLIST ENTRY VOID: it is excused for having no policy, and its `
      + `${r.grants} browser grant(s) are back. The condition that entry rests on is gone`);
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

// **ADDED 2026-10-17, ROADMAP 97.12.** A tenant policy asks *is this row
// MINE*; it has no opinion on whether `booking_id` points at one of my
// bookings. So on a table a signed-in detailer may write, a row carrying
// business A's id and business B's booking id passes the policy AND a
// `booking_id`-only foreign key, and lands on B's paperwork. The fix is a
// foreign key on the PAIR `(booking_id, business_id)` -> `bookings(id,
// business_id)`. This asks the live database which writable tables lack it,
// and for each one names the migration in this repo that declares the pair
// key — so an unapplied fix is named by file, and a gap nobody has fixed says
// so. Only tables a browser can write are asked: a server-only table
// (`send_invoice_attempts`) or a read-only one (`email_sends`) cannot be
// written by a detailer at all.
//
// TRACKED, NOT EXCUSED: a gap with its own open roadmap entry prints by name on
// every run and does not fail it; the moment the table gains the pair key the
// entry is reported as stale, so this list cannot quietly outlive its reason.
// `booking_vehicles` has carried the pair key since 20260907000600 and is the
// positive control: if it does not come back paired, the question is blind.
// `--break=forget-pair` makes every table read as unpaired, which must name it.
//
// AWAITS APPLY, NOT A FINDING (supervision 2026-10-17): an unpaired table whose
// pair key IS declared by a migration file in this repo is a fix that exists and
// has not been applied. That is `migration-drift.mjs`'s red, already standing,
// so here it prints `AWAITS APPLY <table> — <file>` by name and does not fail
// the run. An unpaired table with NO declaring file is a gap nobody has fixed
// and stays a finding. `--break=hide-declaring` ignores the declaring files, so
// every AWAITS APPLY table must come back as a finding and the run go red.
const UNPAIRED_TRACKED = new Map([
  ["job_photos", "ROADMAP 97.70"],
  ["maintenance_deadlines", "ROADMAP 97.70"],
]);
console.log("\n6. a booking's child a detailer can write points at a booking of the SAME business");
{
  const pairFile = new Map();
  const migDir = new URL("../supabase/migrations/", import.meta.url);
  for (const f of readdirSync(migDir).filter((x) => x.endsWith(".sql")).sort()) {
    const src = readFileSync(new URL(f, migDir), "utf8");
    for (const m of src.matchAll(/alter table public\.(\w+)\s+add constraint \w+\s+foreign key \(booking_id, business_id\)\s+references public\.bookings \(id, business_id\)/gi)) {
      if (BREAK !== "hide-declaring") pairFile.set(m[1], f);
    }
  }
  const rows = await q(`
    select c.relname as table,
           exists (select 1 from pg_constraint k where k.conrelid = c.oid and k.contype = 'f'
                    and k.confrelid = 'public.bookings'::regclass
                    and k.conkey = array[
                      (select attnum from pg_attribute where attrelid = c.oid and attname = 'booking_id'),
                      (select attnum from pg_attribute where attrelid = c.oid and attname = 'business_id')]::int2[]) as paired
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relkind = 'r'
       and exists (select 1 from pg_attribute a where a.attrelid = c.oid and a.attname = 'booking_id' and not a.attisdropped)
       and exists (select 1 from pg_attribute a where a.attrelid = c.oid and a.attname = 'business_id' and not a.attisdropped)
       and (has_table_privilege('authenticated', c.oid, 'insert') or has_table_privilege('authenticated', c.oid, 'update'))
       and exists (select 1 from pg_policy p where p.polrelid = c.oid and p.polcmd in ('*', 'a', 'w'))
     order by 1`);
  const paired = (r) => BREAK === "forget-pair" ? false : r.paired === true;
  const control = rows.find((r) => r.table === "booking_vehicles");
  if (!control || !paired(control)) {
    blindPairCheck = true;
    console.log(`  BLIND booking_vehicles did not come back paired (${control ? "unpaired" : "absent"}) — this question cannot see a pair key, so its silence means nothing`);
  }
  for (const r of rows.filter((x) => paired(x) && UNPAIRED_TRACKED.has(x.table))) {
    console.log(`  STALE ${r.table} is paired now — remove it from UNPAIRED_TRACKED (${UNPAIRED_TRACKED.get(r.table)})`);
    findings++;
  }
  for (const r of rows.filter((x) => !paired(x) && UNPAIRED_TRACKED.has(x.table))) {
    console.log(`  TRACKED ${r.table} — booking_id-only reference, open as ${UNPAIRED_TRACKED.get(r.table)}`);
  }
  const open = rows.filter((x) => !paired(x) && !UNPAIRED_TRACKED.has(x.table));
  for (const r of open.filter((x) => pairFile.has(x.table))) {
    console.log(`  AWAITS APPLY ${r.table} — ${pairFile.get(r.table)}`);
  }
  say("every writable booking child references bookings by (booking_id, business_id), or a migration here declares it",
    open.filter((x) => !pairFile.has(x.table)),
    (r) => `${r.table} — references a booking by id alone; no migration declares the pair key`);
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
if (blindPairCheck) {
  auditFailures.push("section 6 is BLIND: booking_vehicles, which carries the pair key, did not come back paired");
}
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
  // `break` sends a sabotage run to `db-audit.sabotage.json` (receipt.mjs).
  dimensions: { project: REF, checks: EXPECTED_CHECKS, ...(BREAK ? { break: BREAK } : {}) },
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
