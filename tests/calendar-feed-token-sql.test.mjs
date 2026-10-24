// ROADMAP 97.53 - `business_settings.calendar_feed_token`, RUN ON A THROWAWAY
// IN-PROCESS POSTGRES.
//
//   npm install @electric-sql/pglite            # in ANY folder outside this repo
//   PGLITE_DIR=<that folder> node --test tests/calendar-feed-token-sql.test.mjs
//
// The same arrangement as `tests/booking-lines-same-business-sql.test.mjs`:
// PGlite is real PostgreSQL in WebAssembly, nothing touches the live database,
// and it is not in any package.json. Without it the cases print NOT RUN and
// skip; with `PGLITE_REQUIRED=1` they fail.
//
// FIXTURES, said plainly: `public.businesses` and `auth.users` reduced to an
// id; `auth.uid()` reads a session setting each identity sets. Everything the
// decision runs on is REAL migration text: `business_settings` and
// `business_users` from their `CREATE TABLE` in
// `20260827000100_tenant_core.sql` (the pre-migration shape) with that file's
// RLS switch; the `permissions` column, `has_business_permission()` and the
// three settings policies from `20260904000000_custom_roles.sql`; then this
// item's migration. Two settings rows exist BEFORE it runs, the way every
// existing business meets it.
//
// WHAT IT PROVES: existing rows are backfilled with distinct 64-hex secrets,
// new rows default to one, a repeated token is refused, a reset kills the old
// one - and WHO can read or reset the key. Each business's owner (and staff
// holding the settings permission) sees and resets only their own; staff
// without it, the other business's owner and an anonymous caller see nothing
// and change nothing. The feed carries customer names and phone numbers (the
// 14.2 owner view), so its key sits behind the same gate as the settings
// around it.

import { readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { test } from "node:test";
import assert from "node:assert/strict";

const read = (f) => readFileSync(`supabase/migrations/${f}`, "utf8").replace(/\r\n/g, "\n");
const MIGRATION = read("20261024150000_calendar_feed_token.sql");
const CORE = read("20260827000100_tenant_core.sql");

const CREATE = /create table public\.business_settings \([\s\S]*?\n\);/.exec(CORE)?.[0];
assert.ok(CREATE, "could not find the real CREATE TABLE for business_settings");

const CUSTOM = readFileSync("supabase/migrations/20260904000000_custom_roles.sql", "utf8").replace(/\r\n/g, "\n");
const piece = (src, re, name) => { const m = re.exec(src); assert.ok(m, `${name} not found in its migration`); return m[0]; };
const USERS = piece(CORE, /create table public\.business_users \([\s\S]*?\n\);/, "business_users");
const RLS = piece(CORE, /alter table public\.business_settings enable row level security;\nalter table public\.business_settings force  row level security;/, "RLS switch");
const PERMS = piece(CUSTOM, /alter table public\.business_users\n  add column if not exists label[\s\S]*?;/, "permissions column");
const HAS = piece(CUSTOM, /create or replace function public\.has_business_permission[\s\S]*?\$\$;/, "has_business_permission");
const POLICIES = ["select", "update", "insert"].map((k) =>
  piece(CUSTOM, new RegExp(`create policy business_settings_permission_${k} on public\\.business_settings[\\s\\S]*?;`), `${k} policy`));

let PGlite = null;
const dir = process.env.PGLITE_DIR;
if (dir) {
  try { ({ PGlite } = await import(pathToFileURL(path.join(dir, "node_modules/@electric-sql/pglite/dist/index.js")).href)); }
  catch (e) { console.error(`PGLITE_DIR=${dir} does not hold @electric-sql/pglite: ${e.message}`); }
}
const MISSING = "NOT RUN — needs @electric-sql/pglite: `npm install @electric-sql/pglite` in a folder outside the repo, then PGLITE_DIR=<folder>";
if (!PGlite) console.error(`
  ${MISSING}
  (set PGLITE_REQUIRED=1 to make this a failure instead of a skip)
`);
const t = (name, fn) => test(name, { skip: PGlite || process.env.PGLITE_REQUIRED === "1" ? false : MISSING }, async () => {
  assert.ok(PGlite, `PGLITE_REQUIRED=1 and ${MISSING}`);
  await fn();
});

const A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const C = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const HEX64 = /^[0-9a-f]{64}$/;

// PGlite has no pgcrypto (the same stand-in as
// tests/domain-claims-sql.test.mjs): the fixture swaps the generator for 64
// hex from md5, which proves everything about the column except the
// generator's own strength. The shipped migration keeps gen_random_bytes.
const PGLITE_SQL = MIGRATION.replaceAll(
  "encode(gen_random_bytes(32), 'hex')", "md5(random()::text) || md5(random()::text)");
assert.notEqual(PGLITE_SQL, MIGRATION, "the fixture lost its generator swap");

const OWNER_A = "a0000000-0000-4000-8000-000000000001";
const OWNER_B = "b0000000-0000-4000-8000-000000000001";
const STAFF_A = "a0000000-0000-4000-8000-000000000002";    // answers requests, no settings
const MANAGER_A = "a0000000-0000-4000-8000-000000000003";  // staff WITH settings

// Two businesses as the migration finds them: settings rows, no token yet.
async function fresh(sql = PGLITE_SQL, policies = POLICIES) {
  const db = new PGlite();
  await db.exec(`
    create role authenticated; create role anon;
    create schema auth;
    create table auth.users (id uuid primary key);
    create function auth.uid() returns uuid language sql stable
      as $$ select nullif(current_setting('test.uid', true), '')::uuid $$;
    grant usage on schema auth, public to authenticated, anon;
    create table public.businesses (id uuid primary key);`);
  await db.exec(USERS);
  await db.exec(PERMS);
  await db.exec(CREATE);
  await db.exec(RLS);
  await db.exec(HAS);
  for (const p of policies) await db.exec(p);
  // Supabase's default grant reaches anon too; only RLS narrows it.
  await db.exec("grant select, insert, update on public.business_settings to authenticated, anon;");
  await db.exec(`insert into public.businesses values ('${A}'), ('${B}'), ('${C}');`);
  await db.exec(`insert into auth.users values ('${OWNER_A}'), ('${OWNER_B}'), ('${STAFF_A}'), ('${MANAGER_A}');`);
  await db.exec(`insert into public.business_users (business_id, user_id, role, permissions) values
    ('${A}', '${OWNER_A}', 'owner', '{}'), ('${B}', '${OWNER_B}', 'owner', '{}'),
    ('${A}', '${STAFF_A}', 'staff', '{requests}'), ('${A}', '${MANAGER_A}', 'staff', '{settings}');`);
  await db.exec(`insert into public.business_settings (business_id) values ('${A}'), ('${B}');`);
  await db.exec(sql);
  return db;
}

// One statement as a signed-in user (anon when uid is null), always reset.
async function as(db, uid, stmt) {
  await db.exec(uid ? `set test.uid = '${uid}'; set role authenticated` : "set test.uid = ''; set role anon");
  try { return (await db.query(stmt)).rows; } catch (e) { return { refused: e.message }; }
  finally { await db.exec("reset role; reset test.uid"); }
}
const refused = async (db, stmt) => { try { await db.exec(stmt); return null; } catch (e) { return e.message; } };
const tokenOf = async (db, biz) =>
  (await db.query(`select calendar_feed_token as t from public.business_settings where business_id = '${biz}'`)).rows[0].t;

t("1 - the migration backfills distinct secrets and defaults new rows to one", async () => {
  const db = await fresh();
  const a = await tokenOf(db, A);
  const b = await tokenOf(db, B);
  assert.match(a, HEX64, "existing row A has no 64-hex token");
  assert.match(b, HEX64, "existing row B has no 64-hex token");
  assert.notEqual(a, b, "two businesses share a feed key");
  await db.exec(`insert into public.business_settings (business_id) values ('${C}');`);
  assert.match(await tokenOf(db, C), HEX64, "a row written after the migration has no token");
  await db.close();
});

t("2 - a repeated token is refused, so two feeds can never merge", async () => {
  const db = await fresh();
  const a = await tokenOf(db, A);
  assert.match(String(await refused(db,
    `update public.business_settings set calendar_feed_token = '${a}' where business_id = '${B}'`)),
    /duplicate key|unique/i);
  await db.close();
});

t("3 - a reset stores the new token and the old one finds nothing", async () => {
  const db = await fresh();
  const old = await tokenOf(db, A);
  const bBefore = await tokenOf(db, B);
  const next = "9".repeat(64);
  assert.equal(await refused(db,
    `update public.business_settings set calendar_feed_token = '${next}' where business_id = '${A}'`), null);
  assert.equal(await tokenOf(db, A), next, "the reset did not land");
  assert.equal(await tokenOf(db, B), bBefore, "business B's key moved - the reset leaked across businesses");
  assert.equal(
    (await db.query(`select count(*)::int as n from public.business_settings where calendar_feed_token = '${old}'`)).rows[0].n,
    0, "the old token still matches a row");
  await db.close();
});

t("4 - canary: the migration without its backfill leaves a business with no key", async () => {
  const cut = PGLITE_SQL.split(";\n").filter((s) => s.includes("where calendar_feed_token is null"));
  assert.equal(cut.length, 1, "the canary did not isolate the backfill statement");
  const noBackfill = PGLITE_SQL.split(";\n").filter((s) => !s.includes("where calendar_feed_token is null")).join(";\n");
  assert.notEqual(noBackfill, PGLITE_SQL, "the canary did not apply");
  const db = await fresh(noBackfill);
  assert.equal(await tokenOf(db, A), null, "the sabotage still backfilled");
  await db.close();
});

// Who can see and reset the key. Returns problems so the canary can re-ask.
async function accessProblems(policies) {
  const p = [];
  const db = await fresh(PGLITE_SQL, policies);
  const a = await tokenOf(db, A), b = await tokenOf(db, B);
  const sees = async (uid) => {
    const r = await as(db, uid, "select calendar_feed_token as t from public.business_settings order by business_id");
    return Array.isArray(r) ? r.map((x) => x.t) : [];
  };
  const resets = async (uid, biz) => {
    const r = await as(db, uid, `update public.business_settings set calendar_feed_token = '${"e".repeat(64)}' where business_id = '${biz}' returning 1`);
    return Array.isArray(r) ? r.length : 0;
  };
  if (JSON.stringify(await sees(OWNER_A)) !== JSON.stringify([a])) p.push("owner A does not see exactly A's key");
  if (JSON.stringify(await sees(OWNER_B)) !== JSON.stringify([b])) p.push("owner B does not see exactly B's key");
  if (JSON.stringify(await sees(MANAGER_A)) !== JSON.stringify([a])) p.push("staff with settings does not see exactly A's key");
  if ((await sees(STAFF_A)).length) p.push("staff without settings can read the key");
  if ((await sees(null)).length) p.push("an anonymous caller can read the key");
  if (await resets(OWNER_A, B)) p.push("owner A reset business B's key");
  if (await resets(STAFF_A, A)) p.push("staff without settings reset the key");
  if (await resets(null, A)) p.push("an anonymous caller reset the key");
  if (await tokenOf(db, A) !== a || await tokenOf(db, B) !== b) p.push("a refused reset still moved a key");
  if (await resets(OWNER_B, B) !== 1) p.push("owner B cannot reset their own key");
  await db.close();
  return p;
}

t("5 - each owner reads and resets only their own key; staff without settings and anon get nothing", async () => {
  assert.deepEqual(await accessProblems(POLICIES), []);
});

t("6 - canary: a select policy open to every row leaks B's key to A and to plain staff", async () => {
  const open = POLICIES.map((q) => q.includes("_select")
    ? q.replace("using (public.has_business_permission(business_id, 'settings'))", "using (true)") : q);
  assert.notDeepEqual(open, POLICIES, "the canary did not apply");
  const p = await accessProblems(open);
  assert.ok(p.includes("owner A does not see exactly A's key"), `got ${JSON.stringify(p)}`);
  assert.ok(p.includes("staff without settings can read the key"), `got ${JSON.stringify(p)}`);
});

// Opening the update policy ALONE changes nothing, and that was measured: an
// UPDATE ... WHERE must also see the row through the select policy, so the
// select gate already stops a cross-business reset. Both are opened here so
// the reset assertion itself is shown to bite.
t("7 - canary: select and update policies open to every row let owner A reset B's key", async () => {
  const open = POLICIES.map((q) => q.includes("_update") || q.includes("_select")
    ? q.replace(/using \(public\.has_business_permission\(business_id, 'settings'\)\)/, "using (true)")
       .replace(/with check \(public\.has_business_permission\(business_id, 'settings'\)\)/, "with check (true)") : q);
  assert.notDeepEqual(open, POLICIES, "the canary did not apply");
  const p = await accessProblems(open);
  assert.ok(p.includes("owner A reset business B's key"), `got ${JSON.stringify(p)}`);
});
