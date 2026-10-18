// ROADMAP 97.71 — A JOB PHOTO AND A MAINTENANCE DEADLINE MUST POINT AT A BOOKING OF THEIR OWN BUSINESS, RUN ON A
// THROWAWAY IN-PROCESS POSTGRES.
//
//   npm install @electric-sql/pglite            # in ANY folder outside this repo
//   PGLITE_DIR=<that folder> node --test tests/photos-deadlines-same-business-sql.test.mjs
//
// The same arrangement as `tests/booking-lines-same-business-sql.test.mjs`: PGlite is real PostgreSQL in
// WebAssembly, nothing touches the live database, and it is not in any package.json. Without it the cases print
// NOT RUN and skip; with `PGLITE_REQUIRED=1` they fail.
//
// FIXTURES, said plainly: `businesses`, `customers`, `gallery_images`, `auth.users` are reduced to an id;
// `bookings` to its id and business_id, PLUS `bookings_id_business_key` applied from
// `20260907000600_vehicle_belongs_to_its_booking.sql`'s own text. The two tables under test are created FROM THEIR
// REAL `CREATE TABLE` TEXT, and THEIR REAL `create policy` STATEMENTS are applied from the same files, with
// `current_business_ids()` / `business_ids_with_permission()` reading a setting so a case can say which business
// the caller is in.
//
// WHAT IT PROVES: before the migration a caller in business A can insert or update a row pairing A's business_id
// with business B's booking, on all three columns (case 1 reproduces the defect); after it every one of those is
// refused while A's own booking and a deadline with no booking still work; deleting a booking still removes its
// photos and still only CLEARS a deadline's booking column, keeping the deadline; a pre-existing mismatch stops the
// migration with its counts; and each of the three keys is load-bearing. WHAT IT DOES NOT: that the live database
// has run it — applying is Andrew's, and `scripts/migration-drift.mjs` says whether it has.

import { readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { test } from "node:test";
import assert from "node:assert/strict";

const read = (f) => readFileSync(`supabase/migrations/${f}`, "utf8").replace(/\r\n/g, "\n");
const SQL = read("20261017010000_photos_deadlines_same_business.sql");
const PHOTOS = read("20260906010000_job_photos.sql");
const DEADLINES = read("20260906008000_maintenance_deadlines.sql");
const TARGET = /alter table public\.bookings\n  add constraint bookings_id_business_key unique \(id, business_id\);/
  .exec(read("20260907000600_vehicle_belongs_to_its_booking.sql"))?.[0];
assert.ok(TARGET, "20260907000600 no longer adds bookings_id_business_key — the new migration's foreign keys have no target");

const pieces = (src, tb) => {
  const create = new RegExp(`create table if not exists public\\.${tb} \\([\\s\\S]*?\\n\\);`).exec(src)?.[0];
  assert.ok(create, `could not find the CREATE TABLE for ${tb}`);
  const policies = [...src.matchAll(new RegExp(`create policy [^;]*? on public\\.${tb}\\b[^;]*;`, "g"))].map((m) => m[0]);
  assert.equal(policies.length, 4, `${tb}: expected its 4 policies (select, insert, update, delete), found ${policies.length}`);
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
const BOOK_A = "a1a1a1a1-a1a1-4a1a-8a1a-a1a1a1a1a1a1";
const BOOK_B = "b1b1b1b1-b1b1-4b1b-8b1b-b1b1b1b1b1b1";
const DL_A = "d1d1d1d1-d1d1-4d1d-8d1d-d1d1d1d1d1d1";

let n = 0;
// The three writes a detailer in `biz` can make that name a booking. `null` booking = no booking at all.
const write = {
  job_photos: (biz, book) => `insert into public.job_photos (business_id, booking_id, kind, path, bytes)
    values ('${biz}', '${book}', 'damage', '${biz}/p${++n}.jpg', 1000)`,
  "maintenance_deadlines.booking_id": (biz, book) => `insert into public.maintenance_deadlines (business_id, customer_id, booking_id, label, due_on)
    values ('${biz}', '${CUST_A}', ${book ? `'${book}'` : "null"}, 'Coating inspection', '2027-01-01')`,
  "maintenance_deadlines.last_done_booking_id": (biz, book) => `insert into public.maintenance_deadlines (business_id, customer_id, last_done_booking_id, label, due_on)
    values ('${biz}', '${CUST_A}', ${book ? `'${book}'` : "null"}, 'Coating inspection', '2027-01-01')`,
};
const COLS = Object.keys(write);
const KEY = {
  job_photos: /alter table public\.job_photos\n  add constraint job_photos_booking_same_business\n[^;]*;/,
  "maintenance_deadlines.booking_id": /alter table public\.maintenance_deadlines\n  add constraint maintenance_deadlines_booking_same_business\n[^;]*;/,
  "maintenance_deadlines.last_done_booking_id": /alter table public\.maintenance_deadlines\n  add constraint maintenance_deadlines_last_done_same_business\n[^;]*;/,
};

async function fixture() {
  const db = new PGlite();
  await db.exec(`
    create role authenticated;
    create schema auth;
    create table auth.users (id uuid primary key);
    create table public.businesses (id uuid primary key);
    create table public.customers (id uuid primary key, business_id uuid not null references public.businesses(id));
    create table public.gallery_images (id uuid primary key);
    create table public.bookings (id uuid primary key, business_id uuid not null references public.businesses(id) on delete cascade);
    insert into public.businesses values ('${A}'), ('${B}');
    insert into public.customers values ('${CUST_A}', '${A}');
    insert into public.bookings values ('${BOOK_A}', '${A}'), ('${BOOK_B}', '${B}');
    ${TARGET}
    create function public.current_business_ids() returns setof uuid language sql stable
      as $f$ select current_setting('test.biz')::uuid $f$;
    create function public.business_ids_with_permission(p text) returns setof uuid language sql stable
      as $f$ select current_setting('test.biz')::uuid $f$;
    ${pieces(PHOTOS, "job_photos")}
    ${pieces(DEADLINES, "maintenance_deadlines")}
    grant usage on schema public to authenticated;
    grant select on public.bookings to authenticated;
    grant select, insert, update, delete on public.job_photos, public.maintenance_deadlines to authenticated;
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
const ownDeadline = `insert into public.maintenance_deadlines (id, business_id, customer_id, booking_id, last_done_booking_id, label, due_on)
  values ('${DL_A}', '${A}', '${CUST_A}', '${BOOK_A}', '${BOOK_A}', 'Coating inspection', '2027-01-01')`;
const moveTo = (col, book) => `update public.maintenance_deadlines set ${col} = '${book}' where id = '${DL_A}'`;

t("1 · THE DEFECT, reproduced: before the migration a detailer in A can point a photo or a deadline at B's booking, on all three columns", async () => {
  const db = await fixture();
  for (const c of COLS) assert.equal(await asMemberOf(db, A, write[c](A, BOOK_B)), null, `${c}: the cross-tenant insert was already refused, so this fixture does not reproduce the defect`);
  await db.exec(ownDeadline);
  for (const col of ["booking_id", "last_done_booking_id"]) assert.equal(await asMemberOf(db, A, moveTo(col, BOOK_B)), null, `${col}: the cross-tenant update was already refused`);
  await db.close();
});

t("2 · after the migration: B's booking is refused on all three columns, by insert and by update; A's own booking and no booking still work", async () => {
  const db = await migrated();
  for (const c of COLS) {
    assert.match(String(await asMemberOf(db, A, write[c](A, BOOK_B))), /foreign key/, `${c} let A write onto B's booking`);
    assert.equal(await asMemberOf(db, A, write[c](A, BOOK_A)), null, `${c} refused A's row on A's own booking`);
    // the service role bypasses RLS and is refused too: the rule is the database's, not the policy's
    assert.match(String(await refused(db, write[c](A, BOOK_B))), /foreign key/, `${c} let a policy-free writer through`);
  }
  assert.equal(await asMemberOf(db, A, write["maintenance_deadlines.booking_id"](A, null)), null, "a deadline with no booking was refused");
  await db.exec(ownDeadline);
  for (const col of ["booking_id", "last_done_booking_id"]) {
    assert.match(String(await asMemberOf(db, A, moveTo(col, BOOK_B))), /foreign key/, `${col}: A moved its own deadline onto B's booking`);
  }
  await db.close();
});

t("3 · deleting a booking still removes its photos, and only CLEARS a deadline's booking columns — the deadline and its business stay", async () => {
  const db = await migrated();
  await db.exec(write.job_photos(A, BOOK_A));
  await db.exec(ownDeadline);
  await db.exec(`delete from public.bookings where id = '${BOOK_A}'`);
  assert.equal((await db.query("select count(*)::int as n from public.job_photos")).rows[0].n, 0, "a photo of a deleted booking was kept");
  const d = (await db.query(`select business_id, booking_id, last_done_booking_id from public.maintenance_deadlines where id = '${DL_A}'`)).rows[0];
  assert.ok(d, "deleting the booking deleted the deadline — a warranty must outlive the job that started it");
  assert.deepEqual(d, { business_id: A, booking_id: null, last_done_booking_id: null });
  await db.close();
});

t("4 · a mismatch already in the data stops the migration with its counts, and nothing is added", async () => {
  const db = await fixture();
  await db.exec(write.job_photos(A, BOOK_B));
  await db.exec(write.job_photos(A, BOOK_B));
  await db.exec(write["maintenance_deadlines.booking_id"](A, BOOK_B));
  await db.exec(write["maintenance_deadlines.last_done_booking_id"](A, BOOK_B));
  await db.exec(write["maintenance_deadlines.last_done_booking_id"](A, BOOK_B));
  await db.exec(write["maintenance_deadlines.last_done_booking_id"](A, BOOK_B));
  const err = String(await refused(db, SQL));
  assert.match(err, /job_photos 2, maintenance_deadlines\.booking_id 1, maintenance_deadlines\.last_done_booking_id 3/);
  const k = (await db.query("select count(*)::int as n from pg_constraint where conname like '%same_business'")).rows[0].n;
  assert.equal(k, 0, "the migration added a constraint after reporting a mismatch");
  await db.close();
});

// ── break it on purpose ──
const without = (re) => { const s = SQL.replace(re, ""); assert.notEqual(s, SQL, "the sabotage did not apply: " + re); return s; };

t("5 · each pair key is load-bearing: removing one lets that column, and only that column, take B's booking", async () => {
  for (const c of COLS) {
    const db = await migrated(without(KEY[c]));
    for (const other of COLS) {
      const got = await asMemberOf(db, A, write[other](A, BOOK_B));
      if (other === c) assert.equal(got, null, `with ${c}'s key removed its cross-tenant insert was still refused`);
      else assert.match(String(got), /foreign key/, `removing ${c}'s key also opened ${other}`);
    }
    await db.close();
  }
});

// TODAY THE OLD SINGLE-COLUMN KEYS MASK THIS: they fire first and clear the booking column, so the pair key's own
// delete rule never acts (measured: plain `set null` and `cascade` both leave the deadline intact while they
// exist). The pair key's rule is what decides the day somebody drops those keys as redundant, so the case drops them.
const dropOld = "alter table public.maintenance_deadlines drop constraint maintenance_deadlines_booking_id_fkey;"
  + " alter table public.maintenance_deadlines drop constraint maintenance_deadlines_last_done_booking_id_fkey;";
const ruleAs = (rule) => {
  const RULE = /on delete set null \((booking_id|last_done_booking_id)\);/g;
  assert.equal((SQL.match(RULE) ?? []).length, 2, "the migration no longer has two column-list rules to sabotage");
  const s = SQL.replace(RULE, rule + ";");
  assert.equal((s.match(RULE) ?? []).length, 0, `the sabotage did not apply to both deadline keys: ${rule}`);
  return s;
};
const afterDelete = async (sql) => {
  const db = await migrated(sql);
  await db.exec(dropOld);
  await db.exec(ownDeadline);
  const err = await refused(db, `delete from public.bookings where id = '${BOOK_A}'`);
  const rows = (await db.query(`select business_id, booking_id, last_done_booking_id from public.maintenance_deadlines where id = '${DL_A}'`)).rows;
  await db.close();
  return { err, rows };
};

t("6 · with the old keys gone, the column list is load-bearing: a plain `set null` fails the booking's delete, a copy of 97.12's cascade deletes the deadline", async () => {
  const real = await afterDelete(SQL);
  assert.equal(real.err, null, "with the real rule, deleting a booking failed");
  assert.deepEqual(real.rows, [{ business_id: A, booking_id: null, last_done_booking_id: null }]);
  const plain = await afterDelete(ruleAs("on delete set null"));
  assert.match(String(plain.err), /null value in column "business_id"/, "a plain set null did not try to null business_id");
  const cascade = await afterDelete(ruleAs("on delete cascade"));
  assert.equal(cascade.err, null);
  assert.deepEqual(cascade.rows, [], "a cascade kept the deadline, so this case cannot tell the rules apart");
});
