// ROADMAP 4.3c — THE SUPPORT-SESSION MIGRATION, RUN ON A REAL POSTGRES THAT IS NOT OURS.
//
//   PGLITE_DIR=<folder holding @electric-sql/pglite> PGLITE_REQUIRED=1 node --test tests/support-sessions-sql.test.mjs
//   BREAK=permissive PGLITE_DIR=… node tests/support-sessions-sql.test.mjs   # sabotage: the rule is ORed, not ANDed
//   BREAK=no-marker  PGLITE_DIR=… node tests/support-sessions-sql.test.mjs   # sabotage: the marker is never consulted
//
// Same pattern as tests/action-log-sql.test.mjs: PGlite (Postgres in WebAssembly, in-process, no
// network, no account), because no DDL touches the live database. BREAK is an env var, not a flag:
// `node --test` swallows extra arguments (docs/gotchas.md 104).
//
// THE FIXTURE, SAID PLAINLY. Supabase's `auth.uid()` and `auth.jwt()` read the request's claims
// from `request.jwt.claims`; the stubs below do the same. Two "sessions" of ONE user are simulated
// by two claim sets that differ ONLY in `session_id` — exactly the situation in production, where
// the support session is the owner's own identity. Writes run under `SET ROLE authenticated`, which
// is not a superuser and not the tables' owner, so row-level security genuinely applies.
//
// WHAT IT PROVES: the database layer (Data API tables, storage.objects, the two definer functions)
// refuses a listed session and lets the same user's other session through. WHAT IT DOES NOT: that
// Supabase puts `session_id` in a real token (4.3a's fixture measured that), that platform-admin
// writes the row (tests/support-sessions-edge.test.mjs), or anything about the live database.
//
// CANARY, EVERY RUN: the migration with `as restrictive` turned into `as permissive` is applied to a
// second database, and a support-session insert MUST get through there — if it is refused, the
// refusal below is coming from something other than the rule under test.

import { readFileSync, readdirSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { test } from "node:test";
import assert from "node:assert/strict";
import { writeReceipt } from "../scripts/receipt.mjs";

const MIGRATION = "20261010030000_support_sessions_read_only.sql";
const DIR = "supabase/migrations";
const BREAK = process.env.BREAK || "";
const sabotage = (sql, b) =>
  b === "permissive" ? sql.replaceAll("as restrictive", "as permissive")
  : b === "no-marker" ? sql.replace("where session_id = nullif(auth.jwt() ->> 'session_id', '')::uuid", "where false")
  : sql;
const SQL = sabotage(readFileSync(path.join(DIR, MIGRATION), "utf8"), BREAK);

let PGlite = null;
if (process.env.PGLITE_DIR) {
  try { ({ PGlite } = await import(pathToFileURL(path.join(process.env.PGLITE_DIR, "node_modules/@electric-sql/pglite/dist/index.js")).href)); }
  catch (e) { console.error(`PGLITE_DIR does not hold @electric-sql/pglite: ${e.message}`); }
}
const REQUIRED = process.env.PGLITE_REQUIRED === "1";
const MISSING = "NOT RUN — needs @electric-sql/pglite: `npm install @electric-sql/pglite` in a folder outside the repo, then PGLITE_DIR=<folder>";
if (!PGlite) console.error(`\n  ${MISSING}\n  (set PGLITE_REQUIRED=1 to make this a failure instead of a skip)\n`);

const USER = "11111111-1111-1111-1111-111111111111";
const BIZ = "22222222-2222-2222-2222-222222222222";
const OWN_SID = "33333333-3333-3333-3333-333333333333";     // the owner's ordinary login
const SUPPORT_SID = "44444444-4444-4444-4444-444444444444"; // the same user, opened by support

// Stand-ins for the tables the real schema has, each with the kind of PERMISSIVE policy the real
// ones carry — the rule under test has to win against an existing "members may write" policy.
const FIXTURE = `
create role anon; create role authenticated; create role service_role;
create schema auth; create schema storage;
grant usage on schema auth, storage, public to anon, authenticated, service_role;
create function auth.jwt() returns jsonb language sql stable as $$ select nullif(current_setting('request.jwt.claims', true), '')::jsonb $$;
create function auth.uid() returns uuid language sql stable as $$ select (auth.jwt() ->> 'sub')::uuid $$;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema storage grant all on tables to anon, authenticated, service_role;

create table public.business_users (user_id uuid, business_id uuid, lang text);
alter table public.business_users enable row level security;
create policy bu_self on public.business_users for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create table public.widgets (id uuid primary key default gen_random_uuid(), business_id uuid, name text);
alter table public.widgets enable row level security;
create policy members_write on public.widgets for all to authenticated
  using (business_id in (select business_id from public.business_users where user_id = auth.uid()))
  with check (business_id in (select business_id from public.business_users where user_id = auth.uid()));

create table public.plans (id uuid primary key, cadence_unit text, cadence_count int, visits_per_period int);
create table public.plan_members (id uuid primary key, business_id uuid, plan_id uuid, status text, accrue_from date);
create table public.plan_visits (business_id uuid, member_id uuid, kind text, delta int, due_on date);
create unique index on public.plan_visits (member_id, due_on) where kind = 'granted';
alter table public.plans enable row level security;
alter table public.plan_members enable row level security;
alter table public.plan_visits enable row level security;

create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
alter table storage.objects enable row level security;
create policy media_write on storage.objects for all to authenticated using (true) with check (true);

insert into public.business_users values ('${USER}', '${BIZ}', null);
insert into public.widgets (business_id, name) values ('${BIZ}', 'seeded');
insert into storage.objects (bucket_id, name) values ('business-media', 'seeded.png');
insert into public.plans values ('55555555-5555-5555-5555-555555555555', 'week', 1, 1);
insert into public.plan_members values ('66666666-6666-6666-6666-666666666666', '${BIZ}', '55555555-5555-5555-5555-555555555555', 'active', current_date - 14);
`;

async function fresh(sql) {
  const db = new PGlite();
  await db.exec(FIXTURE);
  await db.exec(sql);
  await db.exec(`insert into public.support_sessions (session_id, user_id, business_id) values ('${SUPPORT_SID}', '${USER}', '${BIZ}')`);
  return db;
}
const claims = (sid) => JSON.stringify({ sub: USER, role: "authenticated", session_id: sid });
/** Run `stmt` as the signed-in user in session `sid`. Returns { rows, affected } or { error }. */
async function as(db, sid, stmt) {
  await db.exec(`reset role; select set_config('request.jwt.claims', '${claims(sid)}', false); set role authenticated;`);
  try {
    const r = await db.query(stmt);
    return { rows: r.rows, affected: r.affectedRows ?? 0 };
  } catch (e) { return { error: e.message }; }
  finally { await db.exec("reset role;"); }
}

const table = []; // one line per write path per session, written as the artifact
let assertions = 0;
const failures = [];
const check = (name, cond, detail = "") => {
  assertions++;
  if (cond) console.log(`  ok    ${name}`);
  else { failures.push(`${name} ${detail}`.trim()); console.error(`  FAIL  ${name} ${detail}`); }
};

// Every write the support view could reach at this layer, as [label, statement].
const WRITES = [
  ["table insert", `insert into public.widgets (business_id, name) values ('${BIZ}', 'new')`],
  ["table update", `update public.widgets set name = 'changed' where business_id = '${BIZ}'`],
  ["table delete", `delete from public.widgets where business_id = '${BIZ}'`],
  ["storage insert", `insert into storage.objects (bucket_id, name) values ('business-media', 'new.png')`],
  ["storage update", `update storage.objects set name = 'renamed.png'`],
  ["storage delete", `delete from storage.objects`],
  ["definer set_my_lang", `select public.set_my_lang('es')`],
  ["definer accrue_plan_visits", `select public.accrue_plan_visits()`],
];
// A write was refused when it raised, or when it changed nothing (RLS hides the rows from
// UPDATE/DELETE rather than raising, which is how PostgREST callers see it too: an empty result).
const refusedBy = (r) => r.error ? `refused: ${r.error}` : r.affected === 0 && !/^select/i.test(r.stmt) ? "refused: 0 rows changed" : null;

test("4.3c · support sessions are read-only at the database, the owner's own session is not", { skip: PGlite || REQUIRED ? false : MISSING }, async () => {
  assert.ok(PGlite, `PGLITE_REQUIRED=1 and ${MISSING}`);
  const started_at = new Date().toISOString();

  // 1. Applies cleanly, and twice is harmless (a re-run must not duplicate or drop a rule).
  const db = await fresh(SQL);
  await db.exec(SQL);
  const rlsTables = (await db.query(`select count(*)::int n from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname in ('public','storage') and c.relkind = 'r' and c.relrowsecurity`)).rows[0].n;
  const rules = (await db.query(`select count(*)::int n from pg_policies where policyname like 'support_read_only_%' and permissive = 'RESTRICTIVE'`)).rows[0].n;
  // Discovery floor: the fixture holds 7 RLS tables (5 public + support_sessions + storage.objects).
  check("discovery: at least 7 RLS tables found", rlsTables >= 7, `found ${rlsTables}`);
  check("every RLS table carries exactly three restrictive write rules", rules === rlsTables * 3, `rules ${rules}, tables ${rlsTables}`);

  // 2. The support session reads exactly what the owner reads.
  const ownRead = await as(db, OWN_SID, "select name from public.widgets");
  const supRead = await as(db, SUPPORT_SID, "select name from public.widgets");
  check("support session can still READ the business", supRead.rows?.length === 1 && supRead.rows.length === ownRead.rows?.length, JSON.stringify(supRead));

  // 3. Every write path: refused for the support session.
  let refused = 0;
  for (const [label, stmt] of WRITES) {
    const r = await as(db, SUPPORT_SID, stmt); r.stmt = stmt;
    const why = refusedBy(r);
    if (why) refused++;
    table.push({ session: "support", path: label, result: why || "ALLOWED" });
    check(`support session refused: ${label}`, !!why, JSON.stringify(r));
  }
  const after = (await db.query("select (select count(*)::int from public.widgets) w, (select count(*)::int from storage.objects) o, (select string_agg(name, ',') from public.widgets) names, (select lang from public.business_users) lang, (select count(*)::int from public.plan_visits) v")).rows[0];
  check("nothing the support session tried actually changed", after.w === 1 && after.o === 1 && after.names === "seeded" && after.lang === null && after.v === 0, JSON.stringify(after));

  // 4. The marker is out of the support session's reach.
  for (const stmt of ["select * from public.support_sessions", "delete from public.support_sessions", `insert into public.support_sessions values (gen_random_uuid(), '${USER}', '${BIZ}', null, now())`]) {
    const r = await as(db, SUPPORT_SID, stmt);
    check(`marker table refused to a signed-in caller: ${stmt.split(" ").slice(0, 3).join(" ")}`, /permission denied/.test(r.error || ""), JSON.stringify(r));
  }

  // 5. The SAME USER in their own ordinary session: every write goes through.
  let allowed = 0;
  for (const [label, stmt] of WRITES) {
    const r = await as(db, OWN_SID, stmt);
    const ok = !r.error && (/^select/i.test(stmt) || r.affected > 0);
    if (ok) allowed++;
    table.push({ session: "owner's own", path: label, result: ok ? "allowed" : `REFUSED: ${r.error || "0 rows"}` });
    check(`owner's own session allowed: ${label}`, ok, JSON.stringify(r));
  }
  const own = (await db.query("select (select lang from public.business_users) lang, (select count(*)::int from public.plan_visits) v")).rows[0];
  check("owner's writes landed (language set, visits accrued)", own.lang === "es" && own.v > 0, JSON.stringify(own));

  // 6. No token at all (cron, a migration) is not a support session.
  await db.exec("select set_config('request.jwt.claims', '', false)");
  const cron = await db.query("select public.accrue_plan_visits() n").catch((e) => ({ error: e.message }));
  check("no token (the nightly cron) is not refused", !cron.error, JSON.stringify(cron));
  await db.close();

  // CANARY: the rule made permissive must let the support insert through.
  const canaryDb = await fresh(sabotage(readFileSync(path.join(DIR, MIGRATION), "utf8"), "permissive"));
  const leaked = await as(canaryDb, SUPPORT_SID, WRITES[0][1]);
  await canaryDb.close();
  const canaryCaught = !leaked.error && leaked.affected === 1;
  check("canary: a permissive rule lets the support insert through, so the refusal above is the restrictive rule's", canaryCaught, JSON.stringify(leaked));

  const ART = "artifacts/support-sessions-sql/results.json";
  mkdirSync(path.dirname(ART), { recursive: true });
  writeFileSync(ART, JSON.stringify({ break: BREAK || null, table }, null, 2) + "\n");
  writeReceipt({
    check_id: "support-sessions-sql",
    started_at,
    status: failures.length ? "fail" : "pass",
    expected_targets: WRITES.length * 2,
    discovered_targets: WRITES.length * 2,
    attempted_targets: WRITES.length * 2,
    completed_targets: refused + allowed,
    skipped_targets: 0,
    assertions_executed: assertions,
    min_assertions: 2 + 1 + WRITES.length + 1 + 3 + WRITES.length + 1 + 1 + 1,
    failures,
    assertion_floor: "structural: one assertion per fixed write path per session plus fixed setup checks, so the count cannot vary between runs",
    artifacts: [ART],
    canary: { id: "restrictive-made-permissive", observed_failure: canaryCaught },
    dimensions: { break: BREAK || undefined, migration: MIGRATION, rls_tables_in_fixture: rlsTables, write_paths: WRITES.length, refused_for_support: refused, allowed_for_owner: allowed },
  });
  assert.deepEqual(failures, []);
});

// THE FUTURE-TABLE GUARD — credential-free and needs no PGlite. The migration covers every RLS
// table that exists when it runs; a table created LATER is covered only if its migration calls
// refuse_support_writes. This reddens on any later migration that enables RLS without that call.
test("4.3c · every migration after this one that enables RLS on a table also refuses support writes on it", () => {
  const later = readdirSync(DIR).filter((f) => f.endsWith(".sql") && f > MIGRATION).sort();
  const missing = [];
  const scan = (name, sql) => {
    for (const m of sql.matchAll(/alter\s+table\s+(?:if\s+exists\s+)?(?:only\s+)?((?:public\.)?"?[a-z_]+"?)\s+enable\s+row\s+level\s+security/gi)) {
      const table = m[1].replace(/"/g, "").replace(/^(?!public\.)/, "public.");
      if (!new RegExp(`refuse_support_writes\\(\\s*'${table.replace(".", "\\.")}'`, "i").test(sql)) missing.push(`${name}: ${table}`);
    }
  };
  for (const f of later) scan(f, readFileSync(path.join(DIR, f), "utf8"));
  // Canary: a migration that enables RLS and forgets the call must be caught.
  const before = missing.length;
  scan("canary.sql", "create table public.x (id int);\nalter table public.x enable row level security;");
  assert.equal(missing.length, before + 1, "the scanner did not catch a table enabled without refuse_support_writes");
  scan("canary-ok.sql", "alter table public.y enable row level security;\nselect public.refuse_support_writes('public.y');");
  assert.equal(missing.length, before + 1, "the scanner flagged a table that DID call refuse_support_writes");
  assert.deepEqual(missing.slice(0, before), [], "later migrations enable RLS without refuse_support_writes");
});
