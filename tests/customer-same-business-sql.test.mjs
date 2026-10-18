// ROADMAP 97.72 — A BOOKING, A PLAN MEMBERSHIP AND A MAINTENANCE DEADLINE MUST NAME A CUSTOMER OF THEIR OWN
// BUSINESS, RUN ON A THROWAWAY IN-PROCESS POSTGRES.
//
//   npm install @electric-sql/pglite            # in ANY folder outside this repo
//   PGLITE_DIR=<that folder> node --test tests/customer-same-business-sql.test.mjs
//
// The same arrangement as `tests/photos-deadlines-same-business-sql.test.mjs`: PGlite is real PostgreSQL in
// WebAssembly, nothing touches the live database, and it is not in any package.json. Without it the cases print
// NOT RUN and skip; with `PGLITE_REQUIRED=1` they fail.
//
// FIXTURES, said plainly: `businesses`, `auth.users` are reduced to an id; `customers` to its id and business_id;
// `plans` to its id and business_id; `bookings` to its id, business_id and the REAL `customer_id` line
// (`references public.customers(id)`, no delete rule), with the REAL `*_tenant_all` policy taken from
// `20260827000200_tenant_data.sql`'s loop and the browser holding INSERT only, as 20261006040000 leaves it.
// `plan_members` and `maintenance_deadlines` are created FROM THEIR REAL `CREATE TABLE` TEXT with THEIR REAL
// `create policy` statements; `current_business_ids()` and `has_business_permission()` read a setting so a case
// can say which business the caller is in.
//
// WHAT IT PROVES: before the migration a caller in business A can write a row pairing A's business_id with
// business B's customer, on all three tables (case 1 reproduces the defect); after it every one is refused while
// A's own customer and a booking with no customer still work; deleting a customer still cascades its membership
// and deadline and is still refused while a booking names it; deleting a whole business still works in one
// statement; a pre-existing mismatch stops the migration with its counts; each of the three keys is
// load-bearing. WHAT IT DOES NOT: that the live database has run it — applying is Andrew's, and
// `scripts/migration-drift.mjs` says whether it has.

import { readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { test } from "node:test";
import assert from "node:assert/strict";

const read = (f) => readFileSync(`supabase/migrations/${f}`, "utf8").replace(/\r\n/g, "\n");
const SQL = read("20261017020000_customer_same_business.sql");
const PLANS = read("20260904002000_plans.sql");
const DEADLINES = read("20260906008000_maintenance_deadlines.sql");
const TENANT = read("20260827000200_tenant_data.sql");

const BOOKING_CUSTOMER = /\n  customer_id                 uuid references public\.customers\(id\),\n/.exec(TENANT)?.[0];
assert.ok(BOOKING_CUSTOMER, "bookings.customer_id is no longer declared as `uuid references public.customers(id)`");
const TENANT_POLICY = /create policy %I on public\.%I\n\s+for all to authenticated\n\s+using \(business_id in \(select public\.current_business_ids\(\)\)\)\n\s+with check \(business_id in \(select public\.current_business_ids\(\)\)\)/.exec(TENANT)?.[0];
assert.ok(TENANT_POLICY, "could not find the *_tenant_all policy template in 20260827000200");
const BOOKINGS_POLICY = TENANT_POLICY.replace("%I", "bookings_tenant_all").replace("%I", "bookings");

const pieces = (src, tb, nPolicies) => {
  const create = new RegExp(`create table (?:if not exists )?public\\.${tb} \\([\\s\\S]*?\\n\\);`).exec(src)?.[0];
  assert.ok(create, `could not find the CREATE TABLE for ${tb}`);
  const policies = [...src.matchAll(new RegExp(`create policy [^;]*? on public\\.${tb}\\b[^;]*;`, "g"))].map((m) => m[0]);
  assert.equal(policies.length, nPolicies, `${tb}: expected ${nPolicies} policies, found ${policies.length}`);
  return `${create}\nalter table public.${tb} enable row level security;\n${policies.join("\n")}`;
};

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

const A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const CUST_A = "c1c1c1c1-c1c1-4c1c-8c1c-c1c1c1c1c1c1";
const CUST_B = "c2c2c2c2-c2c2-4c2c-8c2c-c2c2c2c2c2c2";
const PLAN_A = "e1e1e1e1-e1e1-4e1e-8e1e-e1e1e1e1e1e1";
const MEM_A = "f1f1f1f1-f1f1-4f1f-8f1f-f1f1f1f1f1f1";
const DL_A = "d1d1d1d1-d1d1-4d1d-8d1d-d1d1d1d1d1d1";

let n = 0;
// The writes a detailer in `biz` can make that name a customer. `null` customer = no customer at all.
const write = {
  bookings: (biz, cust) => `insert into public.bookings (id, business_id, customer_id)
    values (gen_random_uuid(), '${biz}', ${cust ? `'${cust}'` : "null"})`,
  // `plan_members_one_live` is not loaded, so several live memberships per customer are fine here.
  plan_members: (biz, cust) => `insert into public.plan_members (business_id, plan_id, customer_id)
    values ('${biz}', '${PLAN_A}', '${cust}')`,
  maintenance_deadlines: (biz, cust) => `insert into public.maintenance_deadlines (business_id, customer_id, label, due_on)
    values ('${biz}', '${cust}', 'Coating inspection ${++n}', '2027-01-01')`,
};
const TABLES = Object.keys(write);
const KEY = {
  bookings: /alter table public\.bookings\n  add constraint bookings_customer_same_business\n[^;]*;/,
  plan_members: /alter table public\.plan_members\n  add constraint plan_members_customer_same_business\n[^;]*;/,
  maintenance_deadlines: /alter table public\.maintenance_deadlines\n  add constraint maintenance_deadlines_customer_same_business\n[^;]*;/,
};

async function fixture() {
  const db = new PGlite();
  await db.exec(`
    create role authenticated;
    create schema auth;
    create table auth.users (id uuid primary key);
    create table public.businesses (id uuid primary key);
    create table public.customers (id uuid primary key, business_id uuid not null references public.businesses(id) on delete cascade);
    create table public.plans (id uuid primary key, business_id uuid not null references public.businesses(id) on delete cascade);
    create table public.bookings (id uuid primary key, business_id uuid not null references public.businesses(id) on delete cascade,${BOOKING_CUSTOMER}  note text);
    insert into public.businesses values ('${A}'), ('${B}');
    insert into public.customers values ('${CUST_A}', '${A}'), ('${CUST_B}', '${B}');
    insert into public.plans values ('${PLAN_A}', '${A}');
    create function public.current_business_ids() returns setof uuid language sql stable
      as $f$ select current_setting('test.biz')::uuid $f$;
    create function public.has_business_permission(b uuid, p text) returns boolean language sql stable
      as $f$ select b = current_setting('test.biz')::uuid $f$;
    alter table public.bookings enable row level security;
    ${BOOKINGS_POLICY};
    ${pieces(PLANS, "plan_members", 2)}
    ${pieces(DEADLINES, "maintenance_deadlines", 4)}
    grant usage on schema public to authenticated;
    grant select, insert on public.bookings to authenticated;
    grant select, insert, update, delete on public.plan_members, public.maintenance_deadlines to authenticated;
  `);
  return db;
}
async function migrated(sql = SQL) { const db = await fixture(); await db.exec(sql); return db; }

const refused = async (db, stmt) => { try { await db.exec(stmt); return null; } catch (e) { return e.message; } };
// As a signed-in detailer of `biz`, under the real policies.
const asMemberOf = async (db, biz, stmt) => {
  await db.exec(`set test.biz = '${biz}'; set role authenticated`);
  try { return await refused(db, stmt); } finally { await db.exec("reset role"); }
};
const own = `insert into public.plan_members (id, business_id, plan_id, customer_id) values ('${MEM_A}', '${A}', '${PLAN_A}', '${CUST_A}');
  insert into public.maintenance_deadlines (id, business_id, customer_id, label, due_on) values ('${DL_A}', '${A}', '${CUST_A}', 'Coating inspection', '2027-01-01');`;
const moveTo = (tb, id, cust) => `update public.${tb} set customer_id = '${cust}' where id = '${id}'`;
const MOVABLE = [["plan_members", MEM_A], ["maintenance_deadlines", DL_A]];
const count = async (db, tb) => (await db.query(`select count(*)::int as n from public.${tb}`)).rows[0].n;

t("1 · THE DEFECT, reproduced: before the migration a detailer in A can name B's customer on a booking, a plan membership and a deadline", async () => {
  const db = await fixture();
  for (const tb of TABLES) assert.equal(await asMemberOf(db, A, write[tb](A, CUST_B)), null, `${tb}: the cross-tenant insert was already refused, so this fixture does not reproduce the defect`);
  await db.exec(own);
  for (const [tb, id] of MOVABLE) assert.equal(await asMemberOf(db, A, moveTo(tb, id, CUST_B)), null, `${tb}: the cross-tenant update was already refused`);
  // and the browser really cannot UPDATE a booking, so insert is the whole of its booking path
  assert.match(String(await asMemberOf(db, A, `update public.bookings set note = 'x'`)), /permission denied/);
  await db.close();
});

t("2 · after the migration: B's customer is refused on all three, by insert and by update; A's own customer and a booking with no customer still work", async () => {
  const db = await migrated();
  for (const tb of TABLES) {
    assert.match(String(await asMemberOf(db, A, write[tb](A, CUST_B))), /foreign key/, `${tb} let A name B's customer`);
    assert.equal(await asMemberOf(db, A, write[tb](A, CUST_A)), null, `${tb} refused A's row naming A's own customer`);
    // the service role bypasses RLS and is refused too: the rule is the database's, not the policy's
    assert.match(String(await refused(db, write[tb](A, CUST_B))), /foreign key/, `${tb} let a policy-free writer through`);
  }
  assert.equal(await asMemberOf(db, A, write.bookings(A, null)), null, "a booking with no customer was refused");
  await db.exec(own);
  for (const [tb, id] of MOVABLE) assert.match(String(await asMemberOf(db, A, moveTo(tb, id, CUST_B))), /foreign key/, `${tb}: A moved its own row onto B's customer`);
  await db.close();
});

t("3 · delete rules unchanged: a customer's membership and deadline go with them; a customer a booking names cannot be deleted; a whole business deletes in one statement", async () => {
  const db = await migrated();
  await db.exec(own);
  await db.exec(`delete from public.customers where id = '${CUST_A}'`);
  assert.equal(await count(db, "plan_members"), 0, "a deleted customer's plan membership was kept");
  assert.equal(await count(db, "maintenance_deadlines"), 0, "a deleted customer's deadline was kept");
  await db.exec(`insert into public.customers values ('${CUST_A}', '${A}')`);
  await db.exec(write.bookings(A, CUST_A));
  assert.match(String(await refused(db, `delete from public.customers where id = '${CUST_A}'`)), /foreign key/, "a customer named by a booking was deleted out from under it");
  await db.exec(own);
  assert.equal(await refused(db, `delete from public.businesses where id = '${A}'`), null, "deleting a whole business failed with the pair keys in place");
  for (const tb of ["customers", "bookings", "plan_members", "maintenance_deadlines"]) {
    assert.equal((await db.query(`select count(*)::int as n from public.${tb} where business_id = '${A}'`)).rows[0].n, 0, `${tb} kept rows of a deleted business`);
  }
  await db.close();
});

t("4 · a mismatch already in the data stops the migration with its counts, and nothing is added", async () => {
  const db = await fixture();
  await db.exec(write.bookings(A, CUST_B));
  await db.exec(write.plan_members(A, CUST_B));
  await db.exec(write.plan_members(A, CUST_B));
  await db.exec(write.maintenance_deadlines(A, CUST_B));
  await db.exec(write.maintenance_deadlines(A, CUST_B));
  await db.exec(write.maintenance_deadlines(A, CUST_B));
  const err = String(await refused(db, SQL));
  assert.match(err, /bookings 1, plan_members 2, maintenance_deadlines 3/);
  const k = (await db.query("select count(*)::int as n from pg_constraint where conname like '%same_business' or conname = 'customers_id_business_key'")).rows[0].n;
  assert.equal(k, 0, "the migration added a constraint after reporting a mismatch");
  await db.close();
});

// ── break it on purpose ──
const without = (re) => { const s = SQL.replace(re, ""); assert.notEqual(s, SQL, "the sabotage did not apply: " + re); return s; };

t("5 · each pair key is load-bearing: removing one lets that table, and only that table, take B's customer", async () => {
  for (const tb of TABLES) {
    const db = await migrated(without(KEY[tb]));
    for (const other of TABLES) {
      const got = await asMemberOf(db, A, write[other](A, CUST_B));
      if (other === tb) assert.equal(got, null, `with ${tb}'s key removed its cross-tenant insert was still refused`);
      else assert.match(String(got), /foreign key/, `removing ${tb}'s key also opened ${other}`);
    }
    await db.close();
  }
});

t("6 · the mismatch guard is load-bearing: without it the migration fails on the first key with no counts", async () => {
  const db = await fixture();
  await db.exec(write.maintenance_deadlines(A, CUST_B));
  const err = String(await refused(db, without(/do \$\$[\s\S]*?\n\$\$;/)));
  assert.doesNotMatch(err, /resolve these before applying/, "the guard text survived its own removal");
  assert.match(err, /foreign key|violates/, "without the guard a mismatch should still stop the key, but nameless");
  await db.close();
});
