// Refs #18 / ROADMAP 4.1b: platform_admin_events refuses UPDATE, DELETE and TRUNCATE, but still
// lets a business be deleted (the FK's set-null). Runs the migration on PGlite:
//   npm install @electric-sql/pglite   # in a folder outside the repo
//   PGLITE_DIR=<folder> PGLITE_REQUIRED=1 node --test tests/admin-events-append-only.test.mjs
// Without PGLITE_DIR the cases skip (CI has no PGlite); with PGLITE_REQUIRED=1 they fail instead.
import { readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { test } from "node:test";
import assert from "node:assert/strict";

const SQL = readFileSync("supabase/migrations/20261125140000_admin_events_append_only.sql", "utf8");
let PGlite = null;
if (process.env.PGLITE_DIR) {
  try { ({ PGlite } = await import(pathToFileURL(path.join(process.env.PGLITE_DIR, "node_modules/@electric-sql/pglite/dist/index.js")).href)); } catch (e) { console.error(e.message); }
}
const MISSING = "NOT RUN: needs @electric-sql/pglite (see top of file)";
const t = (n, fn) => test(n, { skip: PGlite || process.env.PGLITE_REQUIRED === "1" ? false : MISSING }, async () => { assert.ok(PGlite, MISSING); await fn(); });

const BASE = `create schema auth; create table auth.users (id uuid primary key);
  create table public.businesses (id uuid primary key);
  create table public.platform_admin_events (id uuid primary key default gen_random_uuid(),
    admin_id uuid not null references auth.users(id) on delete cascade, admin_email text,
    business_id uuid references public.businesses(id) on delete set null, business_name text,
    action text not null, detail jsonb not null default '{}'::jsonb, created_at timestamptz not null default now());
  insert into auth.users values ('00000000-0000-0000-0000-000000000001');
  insert into public.businesses values ('00000000-0000-0000-0000-0000000000b1');
  insert into public.platform_admin_events (admin_id, business_id, business_name, action)
    values ('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-0000000000b1','Acme','suspend');`;
async function fresh(sql = SQL) { const db = new PGlite(); await db.exec(BASE); await db.exec(sql); return db; }
const refused = async (db, s) => { try { await db.exec(s); return null; } catch (e) { return e.message; } };

t("UPDATE, DELETE and TRUNCATE are each refused; the row survives", async () => {
  const db = await fresh();
  for (const [s, op] of [["update public.platform_admin_events set action='x'", "UPDATE"], ["update public.platform_admin_events set detail='{\"a\":1}'", "UPDATE"],
    ["delete from public.platform_admin_events", "DELETE"], ["truncate public.platform_admin_events", "TRUNCATE"]]) {
    assert.match(String(await refused(db, s)), new RegExp(`append-only: ${op} is refused`), s);
  }
  assert.equal((await db.query("select action from public.platform_admin_events")).rows[0].action, "suspend");
});

t("deleting a business still works: the row stays, business_id goes null, the name is kept", async () => {
  const db = await fresh();
  await db.exec("delete from public.businesses");
  const r = (await db.query("select business_id, business_name from public.platform_admin_events")).rows[0];
  assert.deepEqual(r, { business_id: null, business_name: "Acme" });
});

t("nulling business_id is the ONLY allowed update (not business_id plus anything else)", async () => {
  const db = await fresh();
  assert.match(String(await refused(db, "update public.platform_admin_events set business_id=null, action='x'")), /UPDATE is refused/);
});

t("sabotage: without the triggers history can be rewritten", async () => {
  const db = await fresh(SQL.replace(/create trigger[\s\S]*?execute function public\.platform_admin_events_guard\(\);/g, ""));
  assert.equal(await refused(db, "update public.platform_admin_events set action='x'"), null);
  assert.equal(await refused(db, "delete from public.platform_admin_events"), null);
});
