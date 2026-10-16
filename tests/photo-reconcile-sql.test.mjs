// ROADMAP 0.11 slice 6 — THE TWO MIGRATIONS, RUN ON A THROWAWAY IN-PROCESS POSTGRES.
//
//   npm install @electric-sql/pglite            # in ANY folder outside this repo
//   PGLITE_DIR=<that folder> node --test tests/photo-reconcile-sql.test.mjs
//
// Same arrangement, and the same reasons, as `tests/action-log-sql.test.mjs`: PGlite is real PostgreSQL in
// WebAssembly, nothing touches the live database, and it is NOT in any package.json (the repo has no root one
// and no pattern for a test dependency). Without it the cases print NOT RUN and skip; with
// `PGLITE_REQUIRED=1` they fail.
//
// WHAT IS FAKED, said plainly because the SQL under test calls things plain Postgres does not have:
//   * `pg_cron` and `pg_net` are extensions PGlite does not ship. The two `create extension` lines are cut out
//     of the migration text before it runs, and a `cron` schema and a `net` schema hold stand-ins that RECORD
//     what they were called with, so the test can read the schedule's name, expression and body.
//   * `job_heartbeats` is created by the real `20260906006000_job_heartbeats.sql` (with its own cron call going
//     to the same stand-in), and the one column the dead-man's switch added, `stale_after_seconds`, is added the
//     way `20260907004000` adds it.
//   * the three Supabase roles (`anon`, `authenticated`, `service_role`) exist empty, because the heartbeats
//     migration revokes from and grants to them.
//   * `platform_settings` is reduced to the one column the allowance migration touches, defined as
//     `20260906011100_photo_total_column.sql` defines it.
// WHAT IT DOES NOT PROVE: that pg_cron runs the entry or that the function answers it. Neither is checked
// anywhere short of the live project, which no session may write to.

import { readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { test } from "node:test";
import assert from "node:assert/strict";

const MIG = "supabase/migrations/";
// LF, whatever the checkout wrote. Git stores these files with "\n" and a Windows checkout (core.autocrlf)
// hands back "\r\n", so `noExtensions` below matched nothing, PGlite refused pg_net, and all six cases died
// before asserting anything (ROADMAP 98.5).
const sql = (f) => readFileSync(`${MIG}${f}`, "utf8").replace(/\r\n/g, "\n");
const CRON_SQL = sql("20261006060000_photo_reconcile_cron.sql");
const GB_SQL = sql("20261006061000_photo_total_gb_ten.sql");
const HEARTBEATS_SQL = sql("20260906006000_job_heartbeats.sql");

let PGlite = null;
const dir = process.env.PGLITE_DIR;
if (dir) {
  try { ({ PGlite } = await import(pathToFileURL(path.join(dir, "node_modules/@electric-sql/pglite/dist/index.js")).href)); }
  catch (e) { console.error(`PGLITE_DIR=${dir} does not hold @electric-sql/pglite: ${e.message}`); }
}
const MISSING = "NOT RUN — needs @electric-sql/pglite: `npm install @electric-sql/pglite` in a folder outside the repo, then PGLITE_DIR=<folder>";
if (!PGlite) console.error(`\n  ${MISSING}\n  (set PGLITE_REQUIRED=1 to make this a failure instead of a skip)\n`);
const t = (name, fn) => test(name, { skip: PGlite || process.env.PGLITE_REQUIRED === "1" ? false : MISSING }, async () => {
  assert.ok(PGlite, `PGLITE_REQUIRED=1 and ${MISSING}`);
  await fn();
});

const noExtensions = (sql) => sql.replace(/^create extension if not exists \w+;\n/gm, "");

async function fresh(cronSql = CRON_SQL) {
  const db = new PGlite();
  await db.exec(`
    create role anon; create role authenticated; create role service_role;
    create schema cron;
    create table cron.calls (name text, schedule text, command text);
    create function cron.schedule(n text, s text, c text) returns bigint language sql as
      $$ insert into cron.calls values (n, s, c); select 1::bigint $$;
    create schema net;
    create function net.http_post(url text, headers jsonb default '{}', body jsonb default '{}') returns bigint language sql as $$ select 1::bigint $$;
    create table public.platform_settings (photo_total_gb numeric not null default 1 check (photo_total_gb > 0));
    insert into public.platform_settings default values;
  `);
  await db.exec(noExtensions(HEARTBEATS_SQL));
  await db.exec("alter table public.job_heartbeats add column if not exists stale_after_seconds integer not null default 86400 check (stale_after_seconds > 0);");
  await db.exec(noExtensions(cronSql));
  return db;
}
const beat = async (db) => (await db.query("select job, detail, stale_after_seconds from public.job_heartbeats where job = 'photo-reconcile'")).rows;

t("1 · the cron migration seeds the heartbeat as NOT YET REPORTED, with a 25-hour window, and schedules the call", async () => {
  const db = await fresh();
  const rows = await beat(db);
  assert.equal(rows.length, 1);
  assert.deepEqual(rows[0].detail, { seeded: true });
  assert.equal(rows[0].stale_after_seconds, 90000);
  const calls = (await db.query("select * from cron.calls where name = 'photo-reconcile'")).rows;
  assert.equal(calls.length, 1);
  assert.equal(calls[0].schedule, "40 3 * * *");
  assert.match(calls[0].command, /net\.http_post/);
  assert.match(calls[0].command, /\/functions\/v1\/photo-reconcile'/);
  await db.close();
});

t("2 · applying it again changes nothing that was there, and a real report is not overwritten by the seed", async () => {
  const db = await fresh();
  await db.exec("select public.note_heartbeat('photo-reconcile', '{\"clean\": true}'::jsonb)");
  await db.exec(noExtensions(CRON_SQL));
  const rows = await beat(db);
  assert.equal(rows.length, 1);
  assert.deepEqual(rows[0].detail, { clean: true });
  await db.close();
});

t("3 · the first real run keeps the window and replaces the seed, so the function stops reading the row as 'never run'", async () => {
  const db = await fresh();
  await db.exec(`select public.note_heartbeat('photo-reconcile', '{"clean": false, "orphans": 3}'::jsonb)`);
  const [r] = await beat(db);
  assert.equal(r.stale_after_seconds, 90000);
  assert.equal(r.detail.seeded, undefined);
  assert.equal(r.detail.orphans, 3);
  await db.close();
});

t("4 · the allowance migration moves the default 1 to 10, and twice is the same as once", async () => {
  const db = await fresh();
  await db.exec(GB_SQL);
  assert.equal(Number((await db.query("select photo_total_gb as g from public.platform_settings")).rows[0].g), 10);
  await db.exec(GB_SQL);
  assert.equal(Number((await db.query("select photo_total_gb as g from public.platform_settings")).rows[0].g), 10);
  await db.close();
});

t("5 · and it never overwrites a number a person chose", async () => {
  const db = await fresh();
  await db.exec("update public.platform_settings set photo_total_gb = 25");
  await db.exec(GB_SQL);
  assert.equal(Number((await db.query("select photo_total_gb as g from public.platform_settings")).rows[0].g), 25);
  await db.close();
});

// ── break it on purpose ──
t("6 · without `on conflict do nothing` a second apply fails; without the `where` a chosen number is overwritten", async () => {
  const noConflict = CRON_SQL.replace("on conflict (job) do nothing", "");
  assert.notEqual(noConflict, CRON_SQL);
  const db = await fresh(noConflict);
  await assert.rejects(db.exec(noExtensions(noConflict)), /duplicate key/);
  await db.close();
  const noWhere = GB_SQL.replace(" where photo_total_gb = 1", "");
  assert.notEqual(noWhere, GB_SQL);
  const db2 = await fresh();
  await db2.exec("update public.platform_settings set photo_total_gb = 25");
  await db2.exec(noWhere);
  assert.equal(Number((await db2.query("select photo_total_gb as g from public.platform_settings")).rows[0].g), 10, "the sabotaged file should have overwritten 25");
  await db2.close();
});
