// ROADMAP 4.1 — THE action_log MIGRATION AND ITS APPEND-ONLY TRIGGER, RUN ON A REAL POSTGRES THAT IS NOT OURS.
//
//   npm install @electric-sql/pglite            # in ANY folder outside this repo
//   PGLITE_DIR=<that folder> node --test tests/action-log-sql.test.mjs
//
// WHY THIS EXISTS. The manager's rule of 2026-10-06 is that no DDL touches the live platform
// database, not even inside a rolled-back transaction, so a migration is proved somewhere else.
// `tests/action-log.test.mjs` reads the SQL as text; this one EXECUTES it, in PGlite (real
// PostgreSQL compiled to WebAssembly, in-process, nothing on disk, no network, no account).
//
// HOW IT IS INSTALLED, DECIDED ON PURPOSE: this repo has no root package.json and no existing
// pattern for a dev dependency in tests (they run on bare `node`), and `app/package.json` is the
// Vite app's. So PGlite is NOT added to any package.json. It lives wherever `PGLITE_DIR` points.
// Without it the cases below are reported as SKIPPED with the install line, and with
// `PGLITE_REQUIRED=1` they FAIL instead, so a run that must have it cannot pass without it.
// A skip reads like a pass at a glance; node prints the skipped count and this file prints a banner.
//
// THE FIXTURE, SAID PLAINLY: Supabase provides the roles `anon` and `authenticated` and grants both
// every new public table by default; plain Postgres does neither, and the migration revokes from them.
// So they are created first, and the same default grant is set, or the revoke could never be seen to work. PGlite
// runs as a superuser, which bypasses row-level security, so RLS is checked by its catalog flags
// and by a `SET ROLE` insert that must be refused by the privilege revoke, not by a policy.
//
// WHAT IT DOES NOT PROVE: Supabase's own extensions and defaults (`pg_cron`, the default grants a
// real project hands `anon`), and nothing here touches the live database at all.

import { readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { test } from "node:test";
import assert from "node:assert/strict";

const MIGRATION = "supabase/migrations/20261006050000_action_log.sql";
const SQL = readFileSync(MIGRATION, "utf8");

let PGlite = null;
const dir = process.env.PGLITE_DIR;
if (dir) {
  try { ({ PGlite } = await import(pathToFileURL(path.join(dir, "node_modules/@electric-sql/pglite/dist/index.js")).href)); }
  catch (e) { console.error(`PGLITE_DIR=${dir} does not hold @electric-sql/pglite: ${e.message}`); }
}
const REQUIRED = process.env.PGLITE_REQUIRED === "1";
const MISSING = "NOT RUN — needs @electric-sql/pglite: `npm install @electric-sql/pglite` in a folder outside the repo, then PGLITE_DIR=<folder>";
if (!PGlite) console.error(`\n  ${MISSING}\n  (set PGLITE_REQUIRED=1 to make this a failure instead of a skip)\n`);
const t = (name, fn) => test(name, { skip: PGlite || REQUIRED ? false : MISSING }, async () => {
  assert.ok(PGlite, `PGLITE_REQUIRED=1 and ${MISSING}`);
  await fn();
});

const ROW = `insert into public.action_log (business_id, actor_id, actor_role, action, subject_table, subject_id, before, after)
  values (gen_random_uuid(), gen_random_uuid(), 'owner', 'job.complete', 'bookings', gen_random_uuid(), '{"status":"confirmed"}', '{"status":"completed"}')`;

/** A fresh database with the two Supabase roles and the given migration text applied. */
async function fresh(sql = SQL) {
  const db = new PGlite();
  await db.exec("create role anon; create role authenticated;");
  // Supabase hands both roles every new public table through default privileges; that is what the
  // migration's revoke exists to take back, so the fixture reproduces it. Without it a revoke is untestable.
  await db.exec("alter default privileges in schema public grant all on tables to anon, authenticated;");
  await db.exec(sql);
  return db;
}
const refused = async (db, stmt) => { try { await db.exec(stmt); return null; } catch (e) { return e.message; } };

t("1 · the migration applies cleanly, and applying it twice is harmless", async () => {
  const db = await fresh();
  assert.equal((await db.query("select to_regclass('public.action_log') as t")).rows[0].t, "action_log");
  await db.exec(SQL);
  await db.close();
});

t("2 · a row can be written, and UPDATE, DELETE and TRUNCATE are each refused with the table's own message", async () => {
  const db = await fresh();
  await db.exec(ROW);
  for (const [stmt, op] of [["update public.action_log set action = 'x'", "UPDATE"], ["delete from public.action_log", "DELETE"], ["truncate public.action_log", "TRUNCATE"]]) {
    const msg = await refused(db, stmt);
    assert.match(String(msg), new RegExp(`action_log is append-only: ${op} is refused`), `${op} was not refused: ${msg}`);
  }
  const rows = (await db.query("select action, before, after from public.action_log")).rows;
  assert.equal(rows.length, 1, "a refused statement still removed the row");
  assert.equal(rows[0].action, "job.complete");
  assert.deepEqual(rows[0].before, { status: "confirmed" });
  await db.close();
});

t("3 · the table's own constraints: a subject outside bookings and a missing before or after are refused", async () => {
  const db = await fresh();
  assert.match(String(await refused(db, ROW.replace("'bookings'", "'customers'"))), /check constraint/);
  assert.match(String(await refused(db, ROW.replace(`'{"status":"confirmed"}'`, "null"))), /null value in column "before"/);
  assert.match(String(await refused(db, ROW.replace(`'{"status":"completed"}'`, "null"))), /null value in column "after"/);
  await db.close();
});

t("4 · locked from a browser: RLS enabled and forced, no policy, and neither role holds a privilege", async () => {
  const db = await fresh();
  const c = (await db.query("select relrowsecurity as on, relforcerowsecurity as forced from pg_class where oid = 'public.action_log'::regclass")).rows[0];
  assert.deepEqual(c, { on: true, forced: true });
  assert.equal((await db.query("select count(*)::int as n from pg_policies where tablename = 'action_log'")).rows[0].n, 0);
  for (const role of ["anon", "authenticated"]) {
    for (const p of ["select", "insert", "update", "delete", "truncate"]) {
      assert.equal((await db.query(`select has_table_privilege('${role}', 'public.action_log', '${p}') as h`)).rows[0].h, false, `${role} holds ${p}`);
    }
    await db.exec(`set role ${role}`);
    assert.match(String(await refused(db, ROW)), /permission denied/, `${role} could insert`);
    await db.exec("reset role");
  }
  await db.close();
});

// ── break it on purpose: each guard removed alone must let its own thing through ──
const without = (re) => { const s = SQL.replace(re, ""); assert.notEqual(s, SQL, "the sabotage did not apply: " + re); return s; };

t("5 · the update/delete trigger removed lets UPDATE and DELETE through, and TRUNCATE is still refused", async () => {
  const db = await fresh(without(/drop trigger if exists action_log_no_update_delete[\s\S]*?execute function public\.action_log_is_append_only\(\);\n/));
  await db.exec(ROW);
  assert.equal(await refused(db, "update public.action_log set action = 'x'"), null, "UPDATE was refused with the guard removed");
  assert.equal((await db.query("select action from public.action_log")).rows[0].action, "x", "the update did not change the row");
  assert.equal(await refused(db, "delete from public.action_log"), null, "DELETE was refused with the guard removed");
  assert.match(String(await refused(db, "truncate public.action_log")), /TRUNCATE is refused/);
  await db.close();
});

t("6 · the truncate trigger removed lets TRUNCATE through, and UPDATE is still refused", async () => {
  const db = await fresh(without(/drop trigger if exists action_log_no_truncate[\s\S]*?execute function public\.action_log_is_append_only\(\);\n/));
  await db.exec(ROW);
  assert.match(String(await refused(db, "update public.action_log set action = 'x'")), /UPDATE is refused/);
  assert.equal(await refused(db, "truncate public.action_log"), null, "TRUNCATE was refused with the guard removed");
  await db.close();
});

t("7 · the function that does not raise is a guard in name only", async () => {
  const s = SQL.replace("raise exception 'action_log is append-only: % is refused', tg_op;", "return coalesce(new, old);");
  assert.notEqual(s, SQL);
  const db = await fresh(s);
  await db.exec(ROW);
  assert.equal(await refused(db, "update public.action_log set action = 'x'"), null);
  assert.equal(await refused(db, "delete from public.action_log"), null);
  await db.close();
});

// A browser role is kept out by TWO walls, and each is proved on its own: the revoke takes the privilege,
// and row-level security with no policy refuses a row even to a role that holds it.
t("8 · the revoke removed gives the browser role the privilege back, and RLS alone still refuses the row", async () => {
  const db = await fresh(without(/revoke all on public\.action_log from anon, authenticated;\n/));
  assert.equal((await db.query("select has_table_privilege('anon', 'public.action_log', 'insert') as h")).rows[0].h, true,
    "anon holds no insert with the revoke removed, so the revoke is not what removes it");
  await db.exec("set role anon");
  assert.match(String(await refused(db, ROW)), /row-level security/, "the second wall did not refuse the row");
  await db.close();
});

t("9 · the forced-RLS line removed shows in the catalog, and both walls removed let a browser role write", async () => {
  const noForce = await fresh(without(/alter table public\.action_log force row level security;\n/));
  assert.equal((await noForce.query("select relforcerowsecurity as f from pg_class where oid = 'public.action_log'::regclass")).rows[0].f, false);
  await noForce.close();
  const both = await fresh(without(/revoke all on public\.action_log from anon, authenticated;\n/).replace(/alter table public\.action_log (enable|force) row level security;\n/g, ""));
  await both.exec("set role anon");
  assert.equal(await refused(both, ROW), null, "anon was still refused with the revoke and row-level security both removed");
  await both.close();
});
