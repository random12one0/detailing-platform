// ROADMAP 4.3c — THE SUPPORT-SESSION MIGRATION, RUN ON A REAL POSTGRES THAT IS NOT OURS.
//
//
//   PGLITE_DIR=<folder holding @electric-sql/pglite> PGLITE_REQUIRED=1 node --test tests/support-sessions-sql.test.mjs
//   BREAK=permissive PGLITE_DIR=… node tests/support-sessions-sql.test.mjs   # sabotage: the rule is ORed, not ANDed
//   BREAK=no-marker  PGLITE_DIR=… node tests/support-sessions-sql.test.mjs   # sabotage: the marker is never consulted
//   BREAK=no-expiry  PGLITE_DIR=… node tests/support-sessions-sql.test.mjs   # sabotage (97.15): the deadline is never compared
//   BREAK=unlock-ignored PGLITE_DIR=… node tests/support-sessions-sql.test.mjs # sabotage (4.3c (a)): unlock no longer lifts the write ban
//   BREAK=no-auth-check PGLITE_DIR=… node tests/support-sessions-sql.test.mjs # sabotage (97.15): a view ended at Auth still reads
//   BREAK=no-reaper  PGLITE_DIR=… node tests/support-sessions-sql.test.mjs   # sabotage (97.15): the minute job ends nothing
//
// And 20261017190000_support_sessions_end_at_auth.sql (review fixes 3, 4): a support session whose
// Auth session is gone (Close signed it out) reads nothing either, and
// `end_expired_support_sessions()` deletes the Auth session of every marker past its deadline.
// `auth.sessions` is a stand-in table here, one row per live Auth session, as in Supabase.
//
// ROADMAP 97.15 adds 20261017180000_support_sessions_expire.sql on top: a marker past its
// `expires_at` (30 minutes) is refused READS as well, and is still refused every write.
// ROADMAP 4.3c (R1) adds 20261024230000_support_sessions_unlock.sql on top of that: the
// preview's own button lifts the write ban for exactly that session (audit-first on the
// server), while an unlocked marker past its deadline stays refused everywhere.
// 4.3e: the lifetime stays 97.15's 30 minutes (live since 2026-10-23). The two-hour default
// the held 4.3c build added is NOT ported: that choice is Andrew's open 4.3c question.
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
// WHAT IT PROVES: the database layer (Data API tables, storage.objects, the definer functions)
// refuses a listed session, lifts the ban for a session the preview unlocked, still refuses it
// past its deadline, and lets the same user's other session through. WHAT IT DOES NOT: that
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
const EXPIRE = "20261017180000_support_sessions_expire.sql";
const sabotageExpire = (sql, b) =>
  b === "permissive" ? sql.replaceAll("as restrictive", "as permissive")
  : (b === "no-expiry" || b === "expiry-ignored") ? sql.replace("and expires_at <= now()", "and false")
  : sql;
const SQL = sabotage(readFileSync(path.join(DIR, MIGRATION), "utf8"), BREAK);
const SQL2 = sabotageExpire(readFileSync(path.join(DIR, EXPIRE), "utf8"), BREAK);
const ENDS = "20261017190000_support_sessions_end_at_auth.sql";
const sabotageEnds = (sql, b) =>
  (b === "no-expiry" || b === "expiry-ignored") ? sql.replace("(m.expires_at <= now()", "(false")
  : b === "no-auth-check" ? sql.replace("or not exists (select 1 from auth.sessions s where s.id = m.session_id)", "or false")
  : b === "no-reaper" ? sql.replace("and m.expires_at <= now();", "and false;")
  : sql;
const SQL3 = sabotageEnds(readFileSync(path.join(DIR, ENDS), "utf8"), BREAK);
const UNLOCK = "20261024230000_support_sessions_unlock.sql";
const EXPIRY_IGNORED = (b) => b === "no-expiry" || b === "expiry-ignored";
const sabotageUnlock = (sql, b) =>
  b === "no-marker" ? sql.replace("where session_id = nullif(auth.jwt() ->> 'session_id', '')::uuid", "where false") :
  b === "unlock-ignored" ? sql.replace("and (unlocked_at is null or expires_at <= now())", "and true")
  : EXPIRY_IGNORED(b) ? sql.replaceAll("expires_at <= now()", "false")
  : sql;
const SQL4 = sabotageUnlock(readFileSync(path.join(DIR, UNLOCK), "utf8"), BREAK);

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
const EXPIRED_SID = "77777777-7777-7777-7777-777777777777"; // opened by support 31 minutes ago (97.15)
const CLOSED_SID = "88888888-8888-8888-8888-888888888888";  // inside its 30 minutes, but Close signed it out at Auth
const UNLOCKED_SID = "99999999-9999-4999-8999-999999999999"; // lifted by the preview's own button, deadline not passed (4.3c (a))
const EXPIRED_UNLOCKED_SID = "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa"; // lifted, but past its deadline: still banned
const USER2 = "33333333-3333-3333-3333-333333333333"; // a second account, same business: never listed anywhere
const OWN2_SID = "bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb"; // the second account's own ordinary session
const BLIVE_SID = "c1000000-0000-4000-8000-000000000001"; // F3: locked marker, a minute BEFORE its end
const BAT_SID = "c1000000-0000-4000-8000-000000000002"; // F3: locked marker, EXACTLY at its end
const BAFTER_SID = "c1000000-0000-4000-8000-000000000003"; // F3: locked marker, a minute AFTER its end
const ULIVE_SID = "c1000000-0000-4000-8000-000000000004"; // F3: unlocked marker, a minute BEFORE its end
const UAT_SID = "c1000000-0000-4000-8000-000000000005"; // F3: unlocked marker, EXACTLY at its end
const UAFTER_SID = "c1000000-0000-4000-8000-000000000006"; // F3: unlocked marker, a minute AFTER its end

// Stand-ins for the tables the real schema has, each with the kind of PERMISSIVE policy the real
// ones carry — the rule under test has to win against an existing "members may write" policy.
const FIXTURE = `
create role anon; create role authenticated; create role service_role;
create schema auth; create schema storage;
create table auth.sessions (id uuid primary key, user_id uuid);
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
insert into public.business_users values ('${USER2}', '${BIZ}', null);
insert into public.widgets (business_id, name) values ('${BIZ}', 'seeded');
insert into storage.objects (bucket_id, name) values ('business-media', 'seeded.png');
insert into public.plans values ('55555555-5555-5555-5555-555555555555', 'week', 1, 1);
insert into public.plan_members values ('66666666-6666-6666-6666-666666666666', '${BIZ}', '55555555-5555-5555-5555-555555555555', 'active', current_date - 14);
`;

async function fresh(sql, sql2, sql3 = SQL3, sql4 = SQL4) {
  const db = new PGlite();
  await db.exec(FIXTURE);
  await db.exec(sql);
  await db.exec(sql2);
  await db.exec(sql3);
  await db.exec(sql4);
  // Live at Auth: the owner's own login, the live support view, the expired one. NOT the closed one.
  await db.exec(`insert into auth.sessions values ('${OWN_SID}', '${USER}'), ('${SUPPORT_SID}', '${USER}'), ('${EXPIRED_SID}', '${USER}'), ('${UNLOCKED_SID}', '${USER}'), ('${EXPIRED_UNLOCKED_SID}', '${USER}'), ('${OWN2_SID}', '${USER2}')`);
  await db.exec(`insert into public.support_sessions (session_id, user_id, business_id) values ('${CLOSED_SID}', '${USER}', '${BIZ}')`);
  await db.exec(`insert into public.support_sessions (session_id, user_id, business_id) values ('${SUPPORT_SID}', '${USER}', '${BIZ}')`);
  await db.exec(`insert into public.support_sessions (session_id, user_id, business_id, unlocked_at) values ('${UNLOCKED_SID}', '${USER}', '${BIZ}', now())`);
  await db.exec(`insert into public.support_sessions (session_id, user_id, business_id, created_at, expires_at, unlocked_at) values ('${EXPIRED_UNLOCKED_SID}', '${USER}', '${BIZ}', now() - interval '91 minutes', now() - interval '61 minutes', now() - interval '61 minutes')`);
  // 97.15: back-dated, as the item asks - opened 31 minutes ago, so its 30 minutes ran out 1 minute ago.
  await db.exec(`insert into public.support_sessions (session_id, user_id, business_id, created_at, expires_at) values ('${EXPIRED_SID}', '${USER}', '${BIZ}', now() - interval '31 minutes', now() - interval '1 minute')`);
  return db;
}
const claims = (sid, user = USER) => JSON.stringify({ sub: user, role: "authenticated", session_id: sid });
/** Run `stmt` as user `user` in session `sid`. F3: the caller names the account, so the second account's proof runs as that account - before, it silently ran as the first user. */
async function as(db, sid, stmt, user = USER) {
  await db.exec(`reset role; select set_config('request.jwt.claims', '${claims(sid, user)}', false); set role authenticated;`);
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
  const db = await fresh(SQL, SQL2);
  await db.exec(SQL);
  await db.exec(SQL4);
  await db.exec(SQL2);
  await db.exec(SQL3);
  const rlsTables = (await db.query(`select count(*)::int n from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname in ('public','storage') and c.relkind = 'r' and c.relrowsecurity`)).rows[0].n;
  const rules = (await db.query(`select count(*)::int n from pg_policies where policyname like 'support_read_only_%' and permissive = 'RESTRICTIVE'`)).rows[0].n;
  // Discovery floor: the fixture holds 7 RLS tables (5 public + support_sessions + storage.objects).
  check("discovery: at least 7 RLS tables found", rlsTables >= 7, `found ${rlsTables}`);
  check("every RLS table carries exactly three restrictive write rules", rules === rlsTables * 3, `rules ${rules}, tables ${rlsTables}`);
  const expRules = (await db.query(`select count(*)::int n from pg_policies where policyname = 'support_expired_select' and permissive = 'RESTRICTIVE' and cmd = 'SELECT'`)).rows[0].n;
  check("97.15: every RLS table carries exactly one restrictive expired-session read rule", expRules === rlsTables, `rules ${expRules}, tables ${rlsTables}`);
  const span = (await db.query(`select extract(epoch from expires_at - created_at)::int s from public.support_sessions where session_id = '${SUPPORT_SID}'`)).rows[0]?.s;
  check("97.15: a new marker's deadline defaults to 30 minutes after it was written", span === 1800, `span ${span}s`);

  // 2. The support session reads exactly what the owner reads.
  const ownRead = await as(db, OWN_SID, "select name from public.widgets");
  const supRead = await as(db, SUPPORT_SID, "select name from public.widgets");
  check("support session can still READ the business", supRead.rows?.length === 1 && supRead.rows.length === ownRead.rows?.length, JSON.stringify(supRead));

  // 3. Every write path: refused for the support session.
  let refused = 0;
  let expiredRefused = 0;
  for (const [label, stmt] of WRITES) {
    const r = await as(db, SUPPORT_SID, stmt); r.stmt = stmt;
    const why = refusedBy(r);
    if (why) refused++;
    table.push({ session: "support", path: label, result: why || "ALLOWED" });
    check(`support session refused: ${label}`, !!why, JSON.stringify(r));
  }
  const after = (await db.query("select (select count(*)::int from public.widgets) w, (select count(*)::int from storage.objects) o, (select string_agg(name, ',') from public.widgets) names, (select lang from public.business_users where user_id = '11111111-1111-1111-1111-111111111111') lang, (select count(*)::int from public.plan_visits) v")).rows[0];
  check("nothing the support session tried actually changed", after.w === 1 && after.o === 1 && after.names === "seeded" && after.lang === null && after.v === 0, JSON.stringify(after));

  // 4. The marker is out of the support session's reach.
  for (const stmt of ["select * from public.support_sessions", "delete from public.support_sessions", `insert into public.support_sessions values (gen_random_uuid(), '${USER}', '${BIZ}', null, now())`]) {
    const r = await as(db, SUPPORT_SID, stmt);
    check(`marker table refused to a signed-in caller: ${stmt.split(" ").slice(0, 3).join(" ")}`, /permission denied/.test(r.error || ""), JSON.stringify(r));
  }

  // 4b. ROADMAP 97.15 — the back-dated marker: refused every READ, and still every write.
  for (const [label, stmt] of [["table read", "select name from public.widgets"], ["storage read", "select name from storage.objects"]]) {
    const r = await as(db, EXPIRED_SID, stmt);
    const ok = !r.error && r.rows.length === 0;
    if (ok) expiredRefused++;
    table.push({ session: "support, expired", path: label, result: ok ? "refused: 0 rows visible" : `ALLOWED: ${JSON.stringify(r)}` });
    check(`expired support session refused: ${label}`, ok, JSON.stringify(r));
  }
  for (const [label, stmt] of WRITES) {
    const r = await as(db, EXPIRED_SID, stmt); r.stmt = stmt;
    const why = refusedBy(r);
    if (why) expiredRefused++;
    table.push({ session: "support, expired", path: label, result: why || "ALLOWED" });
    check(`expired support session refused: ${label}`, !!why, JSON.stringify(r));
  }
  // 4c. Review fix 3 — a view CLOSED at Auth (session row gone, deadline not reached) reads nothing.
  for (const [label, stmt] of [["table read", "select name from public.widgets"], ["storage read", "select name from storage.objects"]]) {
    const r = await as(db, CLOSED_SID, stmt);
    const ok = !r.error && r.rows.length === 0;
    if (ok) expiredRefused++;
    table.push({ session: "support, closed at Auth", path: label, result: ok ? "refused: 0 rows visible" : `ALLOWED: ${JSON.stringify(r)}` });
    check(`97.15: a support view signed out at Auth is refused: ${label}`, ok, JSON.stringify(r));
  }
  const liveAgain = await as(db, SUPPORT_SID, "select name from public.widgets");
  check("97.15: the LIVE support session still reads (the rule keys on the deadline, not on being a support session)", liveAgain.rows?.length === 1, JSON.stringify(liveAgain));

  // 4e. ROADMAP 4.3c (a) - the preview's own button lifted the lock: this session writes.
  const unlockedRead = await as(db, UNLOCKED_SID, "select name from public.widgets");
  check("an unlocked support session still reads", unlockedRead.rows?.length === 1, JSON.stringify(unlockedRead));
  let unlockedAllowed = 0;
  for (const [label, stmt] of WRITES) {
    const r = await as(db, UNLOCKED_SID, stmt); r.stmt = stmt;
    const ok = !r.error && (/^select/i.test(stmt) || r.affected > 0);
    if (ok) unlockedAllowed++;
    table.push({ session: "support, unlocked", path: label, result: ok ? "allowed" : `REFUSED: ${r.error || "0 rows"}` });
    check(`unlocked support session allowed: ${label}`, ok, JSON.stringify(r));
  }
  const unlockedLanded = (await db.query("select (select count(*)::int from public.widgets) w, (select count(*)::int from public.plan_visits) v")).rows[0];
  check("the unlocked session's writes landed (its delete emptied widgets, its accrue added visits)", unlockedLanded.w === 0 && unlockedLanded.v > 0, JSON.stringify(unlockedLanded));
  // The unlocked session deleted every row above; reseed one of each so the refusal
  // checks below measure the lock, not an empty table.
  await db.exec(`insert into public.widgets (business_id, name) values ('${BIZ}', 'seeded')`);
  await db.exec(`insert into storage.objects (bucket_id, name) values ('business-media', 'seeded.png')`);
  // The unlocked accrue above already took today's grant (one per member per day), so
  // clear the table: the owner's accrue below must prove itself by adding rows.
  await db.exec("delete from public.plan_visits");

  // 4f. Back to looking: the lock restored, the same writes refused again.
  await db.exec(`update public.support_sessions set unlocked_at = null where session_id = '${UNLOCKED_SID}'`);
  let relockRefused = 0;
  for (const [label, stmt] of WRITES) {
    const r = await as(db, UNLOCKED_SID, stmt); r.stmt = stmt;
    const why = refusedBy(r);
    if (why) relockRefused++;
    table.push({ session: "support, relocked", path: label, result: why || "ALLOWED" });
    check(`relocked support session refused: ${label}`, !!why, JSON.stringify(r));
  }

  // 4g. Lifted but past its deadline: expiry keeps precedence, reads and writes refused.
  let expiredUnlockedRefused = 0;
  for (const [label, stmt] of [["table read", "select name from public.widgets"], ["storage read", "select name from storage.objects"]]) {
    const r = await as(db, EXPIRED_UNLOCKED_SID, stmt);
    const ok = !r.error && r.rows.length === 0;
    if (ok) expiredUnlockedRefused++;
    table.push({ session: "support, unlocked but expired", path: label, result: ok ? "refused: 0 rows visible" : `ALLOWED: ${JSON.stringify(r)}` });
    check(`expired unlocked session refused: ${label}`, ok, JSON.stringify(r));
  }
  for (const [label, stmt] of WRITES) {
    const r = await as(db, EXPIRED_UNLOCKED_SID, stmt); r.stmt = stmt;
    const why = refusedBy(r);
    if (why) expiredUnlockedRefused++;
    table.push({ session: "support, unlocked but expired", path: label, result: why || "ALLOWED" });
    check(`expired unlocked session refused: ${label}`, !!why, JSON.stringify(r));
  }

  // 4h. F3: the deadline boundary with the clock frozen. Everything runs
  // inside one transaction, and inside a transaction now() never advances, so "exactly at"
  // is exactly equal rather than a race. Locked and unlocked markers, each a minute before
  // the end, exactly at it, and a minute after: only the before-the-end unlocked marker
  // writes; the edge suite pins the same instants against a stubbed Date.now.
  await db.exec("begin;");
  await db.exec(`insert into auth.sessions values
    ('${BLIVE_SID}', '${USER}'), ('${BAT_SID}', '${USER}'), ('${BAFTER_SID}', '${USER}'),
    ('${ULIVE_SID}', '${USER}'), ('${UAT_SID}', '${USER}'), ('${UAFTER_SID}', '${USER}')`);
  await db.exec(`insert into public.support_sessions (session_id, user_id, business_id, expires_at) values
    ('${BLIVE_SID}', '${USER}', '${BIZ}', now() + interval '1 minute'),
    ('${BAT_SID}', '${USER}', '${BIZ}', now()),
    ('${BAFTER_SID}', '${USER}', '${BIZ}', now() - interval '1 minute')`);
  await db.exec(`insert into public.support_sessions (session_id, user_id, business_id, unlocked_at, expires_at) values
    ('${ULIVE_SID}', '${USER}', '${BIZ}', now(), now() + interval '1 minute'),
    ('${UAT_SID}', '${USER}', '${BIZ}', now(), now()),
    ('${UAFTER_SID}', '${USER}', '${BIZ}', now(), now() - interval '1 minute')`);
  let boundary = 0;
  const ownW = await as(db, OWN_SID, "select name from public.widgets");
  check("the owner's own read inside the frozen transaction sees the seeded row", !ownW.error && ownW.rows.length === 1, JSON.stringify(ownW));
  for (const [label, sid, expectSupport, expectLive] of [
    ["locked, a minute before the end", BLIVE_SID, true, true],
    ["locked, exactly at the end", BAT_SID, true, false],
    ["locked, a minute after the end", BAFTER_SID, true, false],
    ["unlocked, a minute before the end", ULIVE_SID, false, true],
    ["unlocked, exactly at the end", UAT_SID, true, false],
    ["unlocked, a minute after the end", UAFTER_SID, true, false],
  ]) {
    const s = await as(db, sid, "select public.is_support_session() s");
    const w = await as(db, sid, "select name from public.widgets");
    const flagOk = !s.error && s.rows[0]?.s === expectSupport;
    const rowsOk = !w.error && w.rows.length === (expectLive ? ownW.rows.length : 0);
    if (flagOk && rowsOk) boundary++;
    table.push({ session: `deadline boundary: ${label}`, path: "is_support_session + table read", result: flagOk && rowsOk ? "as expected" : `WRONG: ${JSON.stringify({ s, w })}` });
    check(`deadline boundary ${label}: support=${expectSupport}`, flagOk, JSON.stringify(s));
    check(`deadline boundary ${label}: reads ${expectLive ? "what the owner reads" : "nothing"}`, rowsOk, JSON.stringify(w));
  }
  await db.exec("commit;");
  // 4d. Review fix 4 — the minute job ends the expired view at Auth, and only it.
  const denied = await as(db, SUPPORT_SID, "select public.end_expired_support_sessions()");
  check("97.15: a signed-in caller cannot run the minute job", /permission denied/.test(denied.error || ""), JSON.stringify(denied));
  const reaped = (await db.query("select public.end_expired_support_sessions() n")).rows[0].n;
  const left = (await db.query("select array_agg(id::text order by id) ids from auth.sessions")).rows[0].ids;
  check("97.15 + 4.3c (a): the minute job ends exactly the expired views' Auth sessions, locked or unlocked", reaped === 6 && !left.includes(EXPIRED_SID) && !left.includes(EXPIRED_UNLOCKED_SID) && !left.includes(BAT_SID) && !left.includes(BAFTER_SID) && !left.includes(UAT_SID) && !left.includes(UAFTER_SID) && left.includes(BLIVE_SID) && left.includes(ULIVE_SID) && left.includes(SUPPORT_SID) && left.includes(OWN_SID) && left.includes(UNLOCKED_SID), JSON.stringify({ reaped, left }));
  const ownAfterReap = await as(db, OWN_SID, "select name from public.widgets");
  check("97.15: the owner's own login still reads after the minute job", ownAfterReap.rows?.length === 1, JSON.stringify(ownAfterReap));

  // 5. The SAME USER in their own ordinary session: every write goes through.
  // Reset what the unlocked session changed, so the owner's own writes below are
  // proved by what they change: language from null to es, visits above the count.
  await db.exec("update public.business_users set lang = null");
  const visitsBefore = (await db.query("select count(*)::int v from public.plan_visits")).rows[0].v;
  let allowed = 0;
  for (const [label, stmt] of WRITES) {
    const r = await as(db, OWN_SID, stmt);
    const ok = !r.error && (/^select/i.test(stmt) || r.affected > 0);
    if (ok) allowed++;
    table.push({ session: "owner's own", path: label, result: ok ? "allowed" : `REFUSED: ${r.error || "0 rows"}` });
    check(`owner's own session allowed: ${label}`, ok, JSON.stringify(r));
  }
  const own = (await db.query("select (select lang from public.business_users where user_id = '11111111-1111-1111-1111-111111111111') lang, (select count(*)::int from public.plan_visits) v")).rows[0];
  check("owner's writes landed (language null to es, visits above the earlier count)", own.lang === "es" && own.v > visitsBefore, JSON.stringify({ ...own, visitsBefore }));

  // 5b. R2/R5: the second account's ordinary session is unaffected by the first
  // account's locked, unlocked, relocked and expired previews above. Every write path
  // must go through; the accrue path only has to be unrefused (today's grant was
  // already taken, and grants are one per member per day by unique index).
  let allowed2 = 0;
  for (const [label, stmt] of WRITES) {
    const r = await as(db, OWN2_SID, stmt, USER2); r.stmt = stmt;
    const ok = label === "definer accrue_plan_visits" ? !r.error : (!r.error && (/^select/i.test(stmt) || r.affected > 0));
    if (ok) allowed2++;
    table.push({ session: "second account's own", path: label, result: ok ? "allowed" : `REFUSED: ${r.error || "0 rows"}` });
    check(`second account's own session allowed: ${label}`, ok, JSON.stringify(r));
  }
  const own2lang = (await db.query(`select lang from public.business_users where user_id = '${USER2}'`)).rows[0]?.lang;
  check("second account's writes landed (its own language row reads es)", own2lang === "es", JSON.stringify({ own2lang }));

  // 6. No token at all (cron, a migration) is not a support session.
  await db.exec("select set_config('request.jwt.claims', '', false)");
  const cron = await db.query("select public.accrue_plan_visits() n").catch((e) => ({ error: e.message }));
  check("no token (the nightly cron) is not refused", !cron.error, JSON.stringify(cron));
  await db.close();

  // CANARY: the rule made permissive must let the support insert through.
  const canaryDb = await fresh(sabotage(readFileSync(path.join(DIR, MIGRATION), "utf8"), "permissive"), sabotageExpire(readFileSync(path.join(DIR, EXPIRE), "utf8"), "permissive"), readFileSync(path.join(DIR, ENDS), "utf8"));
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
    expected_targets: WRITES.length * 7 + 6 + 6,
    discovered_targets: WRITES.length * 7 + 6 + 6,
    attempted_targets: WRITES.length * 7 + 6 + 6,
    completed_targets: refused + allowed + expiredRefused + unlockedAllowed + relockRefused + expiredUnlockedRefused + allowed2 + boundary,
    skipped_targets: 0,
    assertions_executed: assertions,
    min_assertions: 2 + 2 + 1 + WRITES.length + 1 + 3 + 2 + WRITES.length + 2 + 1 + 3 + WRITES.length + 1 + 1 + 1 + 1 + WRITES.length + 1 + WRITES.length + 2 + WRITES.length + WRITES.length + 12 + 2,
    failures,
    assertion_floor: "structural: one assertion per fixed write path per session plus fixed setup checks, so the count cannot vary between runs",
    artifacts: [ART],
    canary: { id: "restrictive-made-permissive", observed_failure: canaryCaught },
    dimensions: { break: BREAK || undefined, migration: MIGRATION, expire_migration: EXPIRE, ends_migration: ENDS, unlock_migration: UNLOCK, refused_for_expired: expiredRefused, rls_tables_in_fixture: rlsTables, write_paths: WRITES.length, refused_for_support: refused, allowed_for_owner: allowed, allowed_for_unlocked: unlockedAllowed, refused_for_relocked: relockRefused, refused_for_unlocked_expired: expiredUnlockedRefused, allowed_for_second_account: allowed2 },
  });
  assert.deepEqual(failures, []);
});

// THE FUTURE-TABLE GUARD — credential-free and needs no PGlite. The migration covers every RLS
// table that exists when it runs; a table created LATER is covered only if its migration calls
// refuse_support_writes. This reddens on any later migration that enables RLS without that call.
test("4.3c · every migration after this one that enables RLS on a table also refuses support writes on it", () => {
  const later = readdirSync(DIR).filter((f) => f.endsWith(".sql") && f > MIGRATION).sort();
  // 97.15: a later migration that re-runs the CATALOG SWEEP (every RLS table, discovered) covers
  // every table created before it, exactly as 4.3c's own sweep did. google_business_links and
  // receipt_upload_attempts had this guard red since 2026-10-10/13; 20261017180000's sweep covers
  // them. The canaries below sort after every real file, so they are never covered by a sweep.
  const sweeps = later.filter((f) => /perform public\.refuse_support_writes\(t\)/.test(readFileSync(path.join(DIR, f), "utf8")));
  const missing = [];
  const scan = (name, sql) => {
    for (const m of sql.matchAll(/alter\s+table\s+(?:if\s+exists\s+)?(?:only\s+)?((?:public\.)?"?[a-z_]+"?)\s+enable\s+row\s+level\s+security/gi)) {
      const table = m[1].replace(/"/g, "").replace(/^(?!public\.)/, "public.");
      if (sweeps.some((s) => s > name)) continue;
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
