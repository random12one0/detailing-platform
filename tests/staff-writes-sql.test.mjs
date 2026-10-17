// ROADMAP 97.14 (S-M3) — A STAFF LOGIN'S DIRECT DELETE ON `bookings` AND DIRECT WRITES ON `customers`, RUN ON A
// THROWAWAY IN-PROCESS POSTGRES.
//
//   PGLITE_DIR=<folder holding @electric-sql/pglite> PGLITE_REQUIRED=1 node --test tests/staff-writes-sql.test.mjs
//   BREAK=bookings-delete PGLITE_DIR=… node tests/staff-writes-sql.test.mjs  # sabotage: bookings keep DELETE
//   BREAK=customers       PGLITE_DIR=… node tests/staff-writes-sql.test.mjs  # sabotage: customers keep their writes
//   BREAK=no-member       PGLITE_DIR=… node tests/staff-writes-sql.test.mjs  # sabotage: the notes function skips membership
//
// Same pattern as tests/support-sessions-sql.test.mjs. BREAK is an env var, not a flag (docs/gotchas.md 104).
//
// THE FIXTURE, SAID PLAINLY. `customers` is created from its REAL `create table` text in 20260827000200, with the
// REAL `*_tenant_all` policy from that file's loop; `bookings` is reduced to id, business_id and a note, with the
// same policy. Both start with Supabase's default grant (everything to anon and authenticated), then the REAL
// 20261006040000 runs, so `bookings` is where the live database is today: no UPDATE, still DELETE.
// `current_business_ids()` reads a setting, so a case says which business the caller belongs to. Writes run under
// `SET ROLE authenticated`, which is not the tables' owner, so RLS and grants genuinely apply. A member with no
// ticks — staff — is exactly this: membership is the only thing `*_tenant_all` asks.
//
// WHAT IT PROVES: before the migration a member of A can hard-delete A's booking and insert, rewrite and delete A's
// customers (the defect, reproduced); after it all four are refused while reads, the fleet job's booking insert and
// the Notes box's new route still work; the notes route refuses another business's customer, a business the caller
// is not in, and anon. WHAT IT DOES NOT: that the live database has run it (applying is Andrew's;
// `scripts/migration-drift.mjs` says whether it has), or the edge functions, which write as the service role.
//
// CANARY, EVERY RUN: the migration with its membership check removed is applied to a second database, and the
// cross-business notes write MUST get through there — if it is refused, the refusal below is not the check's.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { test } from "node:test";
import assert from "node:assert/strict";
import { writeReceipt } from "../scripts/receipt.mjs";

const MIGRATION = "20261017030000_staff_cannot_delete_bookings_or_write_customers.sql";
const read = (f) => readFileSync(path.join("supabase/migrations", f), "utf8").replace(/\r\n/g, "\n");
const BREAK = process.env.BREAK || "";
const CUTS = {
  "bookings-delete": "revoke delete on public.bookings from authenticated, anon;",
  customers: "revoke insert, update, delete on public.customers from authenticated, anon;",
  "no-member": "p_business_id is null or p_business_id not in (select public.current_business_ids())",
};
const sabotage = (sql, b) => {
  if (!b) return sql;
  assert.ok(CUTS[b], `unknown BREAK=${b}; one of ${Object.keys(CUTS).join(", ")}`);
  const out = sql.replace(CUTS[b], b === "no-member" ? "p_business_id is null" : "");
  assert.notEqual(out, sql, `BREAK=${b} did not land: its text is no longer in the migration`);
  return out;
};
const RAW = read(MIGRATION);
const SQL = sabotage(RAW, BREAK);

const TENANT = read("20260827000200_tenant_data.sql");
const CUSTOMERS = /create table public\.customers \([\s\S]*?\n\);/.exec(TENANT)?.[0];
assert.ok(CUSTOMERS, "could not find the CREATE TABLE for customers in 20260827000200");
const POLICY = /create policy %I on public\.%I\n\s+for all to authenticated\n\s+using \(business_id in \(select public\.current_business_ids\(\)\)\)\n\s+with check \(business_id in \(select public\.current_business_ids\(\)\)\)/.exec(TENANT)?.[0];
assert.ok(POLICY, "could not find the *_tenant_all policy template in 20260827000200");
const policy = (tb) => POLICY.replace("%I", `${tb}_tenant_all`).replace("%I", tb);

let PGlite = null;
if (process.env.PGLITE_DIR) {
  try { ({ PGlite } = await import(pathToFileURL(path.join(process.env.PGLITE_DIR, "node_modules/@electric-sql/pglite/dist/index.js")).href)); }
  catch (e) { console.error(`PGLITE_DIR does not hold @electric-sql/pglite: ${e.message}`); }
}
const REQUIRED = process.env.PGLITE_REQUIRED === "1";
const MISSING = "NOT RUN — needs @electric-sql/pglite: `npm install @electric-sql/pglite` in a folder outside the repo, then PGLITE_DIR=<folder>";
if (!PGlite) console.error(`\n  ${MISSING}\n  (set PGLITE_REQUIRED=1 to make this a failure instead of a skip)\n`);

const A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const CUST_A = "c1c1c1c1-c1c1-4c1c-8c1c-c1c1c1c1c1c1";
const CUST_B = "c2c2c2c2-c2c2-4c2c-8c2c-c2c2c2c2c2c2";
const BK_A = "b1b1b1b1-b1b1-4b1b-8b1b-b1b1b1b1b1b1";

async function fresh(migration) {
  const db = new PGlite();
  await db.exec(`
    create role anon; create role authenticated; create role service_role;
    create table public.businesses (id uuid primary key);
    ${CUSTOMERS}
    create table public.bookings (id uuid primary key default gen_random_uuid(),
      business_id uuid not null references public.businesses(id) on delete cascade, note text);
    create function public.current_business_ids() returns setof uuid language sql stable
      as $f$ select nullif(current_setting('test.biz', true), '')::uuid $f$;
    alter table public.customers enable row level security;
    alter table public.bookings enable row level security;
    ${policy("customers")};
    ${policy("bookings")};
    grant usage on schema public to anon, authenticated;
    -- the live default privilege (tests/definer-grants.test.mjs): every new function is born executable by both
    alter default privileges in schema public grant execute on functions to anon, authenticated;
    grant all on public.customers, public.bookings to anon, authenticated;
    insert into public.businesses values ('${A}'), ('${B}');
    insert into public.customers (id, business_id, name, phone, notes) values
      ('${CUST_A}', '${A}', 'Dana', '5550001', null), ('${CUST_B}', '${B}', 'Rui', '5550002', 'B keeps this');
    insert into public.bookings (id, business_id) values ('${BK_A}', '${A}');
  `);
  await db.exec(read("20261006040000_bookings_browser_updates_nothing.sql"));
  if (migration) await db.exec(migration);
  return db;
}
// As a signed-in member of `biz` (or anon when `role` says so), under the real policies and grants.
async function as(db, biz, stmt, role = "authenticated") {
  await db.exec(`select set_config('test.biz', '${biz ?? ""}', false); set role ${role}`);
  try { const r = await db.query(stmt); return { affected: r.affectedRows ?? 0, rows: r.rows }; }
  catch (e) { return { error: e.message }; }
  finally { await db.exec("reset role"); }
}
const notesOf = async (db, id) => (await db.query(`select notes from public.customers where id = '${id}'`)).rows[0]?.notes;
const setNotes = (biz, cust, text) => `select public.set_customer_notes('${biz}', '${cust}', ${text === null ? "null" : `'${text}'`})`;

// Every direct write the item names, as [label, statement]. Each touches exactly one row when allowed.
const WRITES = [
  ["bookings: hard DELETE", `delete from public.bookings where id = '${BK_A}'`],
  ["customers: INSERT", `insert into public.customers (business_id, name, phone) values ('${A}', 'Made up', '5550009')`],
  ["customers: UPDATE", `update public.customers set name = 'Renamed' where id = '${CUST_A}'`],
  ["customers: DELETE", `delete from public.customers where id = '${CUST_A}'`],
];

let assertions = 0;
const failures = [];
const lines = [];
const check = (name, cond, detail = "") => {
  assertions++;
  lines.push(`${cond ? "ok  " : "FAIL"}  ${name}${cond ? "" : " " + detail}`);
  if (cond) console.log(`  ok    ${name}`);
  else { failures.push(`${name} ${detail}`.trim()); console.error(`  FAIL  ${name} ${detail}`); }
};

test("97.14 · a staff session's direct DELETE on bookings and direct writes on customers are refused; the notes route works", { skip: PGlite || REQUIRED ? false : MISSING }, async () => {
  assert.ok(PGlite, `PGLITE_REQUIRED=1 and ${MISSING}`);
  const started_at = new Date().toISOString();

  // 1. THE DEFECT, reproduced on the database as it stands today. Each write on a fresh copy, so one cannot hide another.
  let reproduced = 0;
  for (const [label, stmt] of WRITES) {
    const db = await fresh(null);
    const r = await as(db, A, stmt);
    await db.close();
    if (!r.error && r.affected === 1) reproduced++;
    check(`before: a member of A can do "${label}" directly`, !r.error && r.affected === 1, JSON.stringify(r));
  }

  // 2. After the migration every one is refused by privilege.
  let refused = 0;
  for (const [label, stmt] of WRITES) {
    const db = await fresh(SQL);
    const r = await as(db, A, stmt);
    await db.close();
    if (/permission denied/.test(r.error ?? "")) refused++;
    check(`after: "${label}" is refused`, /permission denied/.test(r.error ?? ""), JSON.stringify(r));
  }

  // 3. What the app still does directly keeps working.
  const db = await fresh(SQL);
  const sel = await as(db, A, `select id from public.customers`);
  check("after: a member still reads its customers (and only its own)", !sel.error && sel.rows.length === 1 && sel.rows[0].id === CUST_A, JSON.stringify(sel));
  const selB = await as(db, A, `select id from public.bookings`);
  check("after: a member still reads its bookings", !selB.error && selB.rows.length === 1, JSON.stringify(selB));
  const fleet = await as(db, A, `insert into public.bookings (business_id) values ('${A}')`);
  check("after: the fleet job's booking INSERT still works", !fleet.error && fleet.affected === 1, JSON.stringify(fleet));

  // 4. The Notes box's route.
  const mine = await as(db, A, setNotes(A, CUST_A, "Gate code 4411"));
  check("notes: a member of A sets A's customer's notes", !mine.error && (await notesOf(db, CUST_A)) === "Gate code 4411", JSON.stringify(mine));
  const cleared = await as(db, A, setNotes(A, CUST_A, ""));
  check("notes: an emptied box stores null, as the old `notes || null` did", !cleared.error && (await notesOf(db, CUST_A)) === null, JSON.stringify(cleared));
  const crossCust = await as(db, A, setNotes(A, CUST_B, "x"));
  check("notes: A naming B's customer under A's business is refused", /no such customer/.test(crossCust.error ?? ""), JSON.stringify(crossCust));
  const crossBiz = await as(db, A, setNotes(B, CUST_B, "x"));
  check("notes: A naming B's business is refused", /not a member/.test(crossBiz.error ?? ""), JSON.stringify(crossBiz));
  check("notes: B's customer's notes are untouched", (await notesOf(db, CUST_B)) === "B keeps this");
  const anon = await as(db, null, setNotes(A, CUST_A, "x"), "anon");
  check("notes: anon cannot execute the function", /permission denied/.test(anon.error ?? ""), JSON.stringify(anon));
  const other = await as(db, A, `update public.customers set notes = 'direct' where id = '${CUST_A}'`);
  check("notes: the direct notes update the old screen sent is refused", /permission denied/.test(other.error ?? ""), JSON.stringify(other));
  await db.close();

  // CANARY: the membership check removed must let A write B's notes, so the refusal above is that check's.
  const canaryDb = await fresh(sabotage(RAW, "no-member"));
  const leaked = await as(canaryDb, A, setNotes(B, CUST_B, "leaked"));
  const canaryCaught = !leaked.error && (await notesOf(canaryDb, CUST_B)) === "leaked";
  await canaryDb.close();
  check("canary: with the membership check removed, A writes B's notes", canaryCaught, JSON.stringify(leaked));

  const ART = `artifacts/staff-writes-sql/results${BREAK ? `.break-${BREAK}` : ""}.txt`;
  mkdirSync(path.dirname(ART), { recursive: true });
  writeFileSync(ART, `break: ${BREAK || "none"}\n${lines.join("\n")}\n`);
  writeReceipt({
    check_id: "staff-writes-sql",
    started_at,
    status: failures.length ? "fail" : "pass",
    expected_targets: WRITES.length * 2,
    discovered_targets: WRITES.length * 2,
    attempted_targets: WRITES.length * 2,
    completed_targets: reproduced + refused,
    skipped_targets: 0,
    assertions_executed: assertions,
    min_assertions: WRITES.length * 2 + 3 + 7 + 1,
    failures,
    assertion_floor: "structural: one assertion per write path before and after, plus fixed route checks, so the count cannot vary between runs",
    artifacts: [ART],
    canary: { id: "notes-without-membership", observed_failure: canaryCaught },
    dimensions: { break: BREAK || undefined, migration: MIGRATION, write_paths: WRITES.length, reproduced_before: reproduced, refused_after: refused },
  });
  assert.deepEqual(failures, []);
});
