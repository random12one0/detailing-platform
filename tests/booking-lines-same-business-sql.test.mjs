// ROADMAP 97.12 (S-M2) — A BOOKING'S LINES MUST BELONG TO THE BOOKING'S OWN BUSINESS, RUN ON A THROWAWAY
// IN-PROCESS POSTGRES.
//
//   npm install @electric-sql/pglite            # in ANY folder outside this repo
//   PGLITE_DIR=<that folder> node --test tests/booking-lines-same-business-sql.test.mjs
//
// The same arrangement as `tests/send-invoice-key-sql.test.mjs`: PGlite is real PostgreSQL in WebAssembly,
// nothing touches the live database, and it is not in any package.json. Without it the cases print NOT RUN and
// skip; with `PGLITE_REQUIRED=1` they fail.
//
// FIXTURES, said plainly: `businesses`, `services` and `add_ons` are reduced to an id; `bookings` to its id and
// business_id, PLUS the `bookings_id_business_key unique (id, business_id)` that
// `20260907000600_vehicle_belongs_to_its_booking.sql` added and the live database holds — applied from that file's
// own text, because the new migration depends on it and must not create it a second time (an earlier draft did,
// and would have stopped on apply). The three child tables are created FROM THE REAL `CREATE TABLE` TEXT in
// `20260827000200_tenant_data.sql`, and the real per-tenant policy shape is applied to them, with
// `current_business_ids()` reading a setting so a case can say which business the caller is in.
//
// WHAT IT PROVES: before the migration, a caller in business A can insert a line pairing A's business_id with
// business B's booking (case 1 reproduces the defect); after it, that insert is refused on all three tables while
// the same insert against A's own booking still works; the cascade from a deleted booking still removes its lines;
// a pre-existing mismatch stops the migration with its count and adds nothing; and each of the three foreign keys
// is load-bearing (removing one lets that table's cross-tenant insert through). WHAT IT DOES NOT: that the live
// database has run it — applying is Andrew's, and `scripts/migration-drift.mjs` says whether it has.

import { readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { test } from "node:test";
import assert from "node:assert/strict";

// CRLF normalised: on a Windows checkout the sabotage patterns in case 5 never match otherwise.
const SQL = readFileSync("supabase/migrations/20261017000000_booking_lines_same_business.sql", "utf8").replace(/\r\n/g, "\n");
const BASE = readFileSync("supabase/migrations/20260827000200_tenant_data.sql", "utf8");
const PRIOR = readFileSync("supabase/migrations/20260907000600_vehicle_belongs_to_its_booking.sql", "utf8");
const TARGET = /alter table public\.bookings\n  add constraint bookings_id_business_key unique \(id, business_id\);/.exec(PRIOR.replace(/\r\n/g, "\n"))?.[0];
assert.ok(TARGET, "20260907000600 no longer adds bookings_id_business_key — the new migration's foreign keys have no target");
const TABLES = ["booking_services", "booking_add_ons", "booking_line_items"];
const createOf = (t) => {
  const m = new RegExp(`create table public\\.${t} \\([\\s\\S]*?\\n\\);`).exec(BASE);
  assert.ok(m, `could not find the CREATE TABLE for ${t} in the base migration`);
  return m[0];
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
const BOOK_A = "a1a1a1a1-a1a1-4a1a-8a1a-a1a1a1a1a1a1";
const BOOK_B = "b1b1b1b1-b1b1-4b1b-8b1b-b1b1b1b1b1b1";

const insertLine = {
  booking_services: (biz, book) => `insert into public.booking_services (business_id, booking_id, name_at_booking) values ('${biz}', '${book}', 'Injected wash')`,
  booking_add_ons: (biz, book) => `insert into public.booking_add_ons (business_id, booking_id) values ('${biz}', '${book}')`,
  booking_line_items: (biz, book) => `insert into public.booking_line_items (business_id, booking_id, category, label, amount) values ('${biz}', '${book}', 'custom', 'Injected fee', 500)`,
};

async function fixture() {
  const db = new PGlite();
  await db.exec(`
    create role authenticated;
    create table public.businesses (id uuid primary key);
    create table public.services (id uuid primary key);
    create table public.add_ons (id uuid primary key);
    create table public.bookings (id uuid primary key, business_id uuid not null references public.businesses(id) on delete cascade);
    insert into public.businesses values ('${A}'), ('${B}');
    insert into public.bookings values ('${BOOK_A}', '${A}'), ('${BOOK_B}', '${B}');
    ${TARGET}
    create function public.current_business_ids() returns setof uuid language sql stable
      as $f$ select current_setting('test.biz')::uuid $f$;
    ${TABLES.map(createOf).join("\n")}
  `);
  for (const tb of TABLES) {
    await db.exec(`
      alter table public.${tb} enable row level security;
      alter table public.${tb} force row level security;
      create policy ${tb}_tenant_all on public.${tb} for all to authenticated
        using (business_id in (select public.current_business_ids()))
        with check (business_id in (select public.current_business_ids()));
      grant select, insert, update, delete on public.${tb} to authenticated;
    `);
  }
  await db.exec("grant usage on schema public to authenticated; grant select on public.bookings to authenticated;");
  return db;
}
async function migrated(sql = SQL) { const db = await fixture(); await db.exec(sql); return db; }

const refused = async (db, stmt) => { try { await db.exec(stmt); return null; } catch (e) { return e.message; } };
// As a signed-in detailer of `biz`, under the real policy shape.
const asMemberOf = async (db, biz, stmt) => {
  await db.exec(`set test.biz = '${biz}'; set role authenticated`);
  try { return await refused(db, stmt); } finally { await db.exec("reset role"); }
};
const count = async (db, tb) => (await db.query(`select count(*)::int as n from public.${tb}`)).rows[0].n;

t("1 · THE DEFECT, reproduced: before the migration a detailer in A can put a line on B's booking, in all three tables", async () => {
  const db = await fixture();
  for (const tb of TABLES) assert.equal(await asMemberOf(db, A, insertLine[tb](A, BOOK_B)), null, `${tb}: the cross-tenant insert was already refused, so this fixture does not reproduce the defect`);
  await db.close();
});

t("2 · after the migration: A's business_id with B's booking_id is refused in all three tables; A's own booking still takes lines", async () => {
  const db = await migrated();
  for (const tb of TABLES) {
    assert.match(String(await asMemberOf(db, A, insertLine[tb](A, BOOK_B))), /foreign key/, `${tb} let A write onto B's booking`);
    assert.equal(await asMemberOf(db, A, insertLine[tb](A, BOOK_A)), null, `${tb} refused A's line on A's own booking`);
    // and the service role, which bypasses RLS, is refused too: the rule is the database's, not the policy's
    assert.match(String(await refused(db, insertLine[tb](A, BOOK_B))), /foreign key/, `${tb} let a policy-free writer through`);
  }
  await db.close();
});

t("3 · deleting a booking still removes its lines", async () => {
  const db = await migrated();
  for (const tb of TABLES) await db.exec(insertLine[tb](A, BOOK_A));
  await db.exec(`delete from public.bookings where id = '${BOOK_A}'`);
  for (const tb of TABLES) assert.equal(await count(db, tb), 0, `${tb} kept a line of a deleted booking`);
  await db.close();
});

t("4 · a mismatch already in the data stops the migration with its count, and nothing is added", async () => {
  const db = await fixture();
  await db.exec(insertLine.booking_line_items(A, BOOK_B));
  await db.exec(insertLine.booking_line_items(A, BOOK_B));
  await db.exec(insertLine.booking_services(A, BOOK_B));
  const err = String(await refused(db, SQL));
  assert.match(err, /booking_services 1, booking_add_ons 0, booking_line_items 2/);
  const n = (await db.query("select count(*)::int as n from pg_constraint where conname like '%same_business'")).rows[0].n;
  assert.equal(n, 0, "the migration added a constraint after reporting a mismatch");
  await db.close();
});

// ── break it on purpose ──
const without = (re) => { const s = SQL.replace(re, ""); assert.notEqual(s, SQL, "the sabotage did not apply: " + re); return s; };

t("5 · each composite foreign key is load-bearing: removing one lets that table, and only that table, take B's booking", async () => {
  for (const tb of TABLES) {
    const db = await migrated(without(new RegExp(`alter table public\\.${tb}\\n  add constraint ${tb}_booking_same_business\\n[^;]*;`)));
    for (const other of TABLES) {
      const got = await asMemberOf(db, A, insertLine[other](A, BOOK_B));
      if (other === tb) assert.equal(got, null, `with ${tb}'s key removed its cross-tenant insert was still refused`);
      else assert.match(String(got), /foreign key/, `removing ${tb}'s key also opened ${other}`);
    }
    await db.close();
  }
});
