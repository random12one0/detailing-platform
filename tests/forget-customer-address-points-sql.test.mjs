// ROADMAP 97.20a — "DELETE FOR GOOD" MUST NOT LEAVE THE CUSTOMER'S STREET ADDRESS IN THE GEOCODE CACHE.
//
//   PGLITE_DIR=<folder holding node_modules/@electric-sql/pglite> PGLITE_REQUIRED=1 node --test tests/forget-customer-address-points-sql.test.mjs
//   BREAK=after-bookings PGLITE_DIR=… PGLITE_REQUIRED=1 node tests/forget-customer-address-points-sql.test.mjs  # cache step runs after the bookings lose their address
//   BREAK=no-bookings    PGLITE_DIR=… PGLITE_REQUIRED=1 node tests/forget-customer-address-points-sql.test.mjs  # only the record's address is looked up
//   BREAK=raw-key        PGLITE_DIR=… PGLITE_REQUIRED=1 node tests/forget-customer-address-points-sql.test.mjs  # the key is not normalised the way addressKey is
//   BREAK=no-share       PGLITE_DIR=… PGLITE_REQUIRED=1 node tests/forget-customer-address-points-sql.test.mjs  # streets somebody else uses are deleted too (20261018050000)
//   BREAK=null-trap      PGLITE_DIR=… PGLITE_REQUIRED=1 node tests/forget-customer-address-points-sql.test.mjs  # `<>` instead of `is distinct from`: a guest booking does not count
//   BREAK=no-shop        PGLITE_DIR=… PGLITE_REQUIRED=1 node tests/forget-customer-address-points-sql.test.mjs  # a shop's drop-off address does not count
//
// PGlite is real PostgreSQL in WebAssembly, in-process: nothing touches the live database (same arrangement as
// tests/forget-customer-sql.test.mjs). Without it the case prints NOT RUN and skips; PGLITE_REQUIRED=1 makes
// that a failure. BREAK is an env var, not a flag (docs/gotchas.md 104).
//
// FIXTURES: `address_points` is built FROM ITS REAL TEXT (20260913010000). The other tables carry only the
// columns forget_customer reads or writes. The cache keys are made by `addressKey` lifted out of
// `_shared/weatherCache.ts` itself, so a change to the JS rule that the SQL does not follow goes red here.
//
// THE SCENARIO: business A's Dana has "12 Elm St." on her record, one booking typed as "12 elm st" and one at
// "  400 PINE Ave., Apt #3 " (a different address, as typed). Eli in A is at "9 Oak Ave"; the shop is
// "1 Shop Rd". The cache holds all four. After forgetting Dana: her two keys are gone, Eli's and the shop's stay.
// SHARED STREETS (the follow-up, 20261023110000): Dana also has bookings at "8 Birch Way" (Gus in A has "8 BIRCH
// WAY" on his record), "5 Cedar Ln." (business B has a GUEST booking, no customer, at "5 cedar ln") and "1 Shop
// Rd." (the shop's own drop-off address). Those three keys are somebody else's too and must stay: since 100.3 the
// public quote only READS the cache, so deleting them takes weather off other people's quotes.
// CANARIES, EVERY RUN: the pre-97.20a function (20261017210000) must leave both of hers; the first 97.20a function
// (20261018050000) must delete all three shared keys — the bug this file now guards.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { test } from "node:test";
import assert from "node:assert/strict";
import { writeReceipt } from "../scripts/receipt.mjs";

const DIR = "supabase/migrations";
const OLD = "20261017210000_forget_customer_forgets_their_email.sql";
const SHARED_BUG = "20261018050000_forget_customer_forgets_their_street.sql";
const MIGRATION = "20261023110000_forget_customer_keeps_shared_streets.sql";
const BREAK = process.env.BREAK || "";
const read = (f) => readFileSync(path.join(DIR, f), "utf8").replace(/\r\n/g, "\n");

// The production rule, not a copy of it.
const KEY_SRC = /export const addressKey = \(s: unknown\) =>\s*([^;]+);/.exec(readFileSync("supabase/functions/_shared/weatherCache.ts", "utf8"))?.[1];
assert.ok(KEY_SRC, "could not find addressKey in supabase/functions/_shared/weatherCache.ts");
const addressKey = new Function("s", `return ${KEY_SRC};`);

let SQL = read(MIGRATION);
const STEP = /  -- 97\.20a\.[\s\S]*?get diagnostics v_points = row_count;\n\n/.exec(SQL)?.[0];
assert.ok(STEP, "could not find the 97.20a cache step in the migration");
const SABOTAGE = {
  "after-bookings": () => SQL.replace(STEP, "").replace("get diagnostics v_bookings = row_count;\n", `get diagnostics v_bookings = row_count;\n${STEP}`),
  "no-bookings": () => SQL.replace(/      union\n      select customer_address from public\.bookings\n.*\n/, ""),
  "raw-key": () => SQL.replace("select btrim(regexp_replace(lower(a), '[^a-z0-9]+', ' ', 'g'))", "select lower(a)"),
  "no-share": () => SQL.replace(/\n  -- 97\.20a follow-up:[\s\S]*?\n    \);\n/, ";\n"),
  "null-trap": () => SQL.replace("b.customer_id is distinct from p_customer_id", "b.customer_id <> p_customer_id"),
  "no-shop": () => SQL.replace(/\n    and not exists \(\n      select 1 from public\.businesses s\n.*\n    \)/, ""),
};
if (BREAK) {
  if (!SABOTAGE[BREAK]) throw new Error(`unknown BREAK=${BREAK}; known: ${Object.keys(SABOTAGE).join(", ")}`);
  const broken = SABOTAGE[BREAK]();
  if (broken === SQL) throw new Error(`BREAK=${BREAK} did not change the migration text — the sabotage did not land`); // gotchas 102
  SQL = broken;
}
const POINTS_TABLE = /create table if not exists public\.address_points \([\s\S]*?\n\);/.exec(read("20260913010000_weather_cache.sql"))?.[0];
assert.ok(POINTS_TABLE, "could not find address_points' real CREATE TABLE");

let PGlite = null;
if (process.env.PGLITE_DIR) {
  try { ({ PGlite } = await import(pathToFileURL(path.join(process.env.PGLITE_DIR, "node_modules/@electric-sql/pglite/dist/index.js")).href)); }
  catch (e) { console.error(`PGLITE_DIR=${process.env.PGLITE_DIR} does not hold @electric-sql/pglite: ${e.message}`); }
}
const MISSING = "NOT RUN — needs @electric-sql/pglite: `npm install @electric-sql/pglite` in a folder outside the repo, then PGLITE_DIR=<folder>";
if (!PGlite) console.error(`\n  ${MISSING}\n  (set PGLITE_REQUIRED=1 to make this a failure instead of a skip)\n`);

const A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const DANA = "d1d1d1d1-d1d1-4d1d-8d1d-d1d1d1d1d1d1", ELI = "e1e1e1e1-e1e1-4e1e-8e1e-e1e1e1e1e1e1", BEA = "b0b0b0b0-b0b0-4b0b-8b0b-b0b0b0b0b0b0";
const GUS = "a9a9a9a9-a9a9-4a9a-8a9a-a9a9a9a9a9a9";
const ADDR = { record: "12 Elm St.", sameAsRecord: "12 elm st", typed: "  400 PINE Ave., Apt #3 ", eli: "9 Oak Ave", shop: "1 Shop Rd", bea: "77 Bay Blvd",
  birch: "8 Birch Way", gusBirch: "8 BIRCH WAY", cedar: "5 Cedar Ln.", guestCedar: "5 cedar ln", shopAsTyped: "1 Shop Rd." };
const KEYS = Object.fromEntries(Object.entries(ADDR).map(([k, v]) => [k, addressKey(v)]));
const q = (v) => `'${String(v).replace(/'/g, "''")}'`;

async function fixture(fn) {
  const db = new PGlite();
  await db.exec(`
    create role anon; create role authenticated; create role service_role;
    create table public.businesses (id uuid primary key, contact_email text, dropoff_address text);
    create table public.business_settings (business_id uuid primary key, notification_emails text[] not null default '{}');
    create table public.business_users (business_id uuid not null, email text);
    create table public.customers (id uuid primary key, business_id uuid not null, name text not null, email text, address text);
    create table public.bookings (id uuid primary key default gen_random_uuid(), business_id uuid not null, customer_id uuid references public.customers(id),
      customer_name text, customer_phone text, customer_email text, customer_address text, customer_notes text, admin_notes text, total numeric not null);
    create table public.job_photos (id uuid primary key default gen_random_uuid(), business_id uuid not null, booking_id uuid);
    create table public.email_sends (id uuid primary key default gen_random_uuid(), business_id uuid, customer_id uuid, booking_id uuid,
      to_email text, subject text, body_html text, detail text);
    ${POINTS_TABLE}
    insert into public.businesses values ('${A}', 'owner@shine.test', ${q(ADDR.shop)}), ('${B}', null, null);
    insert into public.customers values ('${DANA}', '${A}', 'Dana Doe', 'dana@example.com', ${q(ADDR.record)}),
      ('${ELI}', '${A}', 'Eli Park', 'eli@example.com', ${q(ADDR.eli)}), ('${BEA}', '${B}', 'Bea Ray', null, ${q(ADDR.bea)}),
      ('${GUS}', '${A}', 'Gus Lee', null, ${q(ADDR.gusBirch)});
    insert into public.bookings (business_id, customer_id, customer_name, customer_address, total) values
      ('${A}', '${DANA}', 'Dana Doe', ${q(ADDR.sameAsRecord)}, 180), ('${A}', '${DANA}', 'Dana Doe', ${q(ADDR.typed)}, 90),
      ('${A}', '${DANA}', 'Dana Doe', ${q(ADDR.birch)}, 70), ('${A}', '${DANA}', 'Dana Doe', ${q(ADDR.cedar)}, 50),
      ('${A}', '${DANA}', 'Dana Doe', ${q(ADDR.shopAsTyped)}, 40),
      ('${A}', '${ELI}', 'Eli Park', ${q(ADDR.eli)}, 120), ('${B}', '${BEA}', 'Bea Ray', ${q(ADDR.bea)}, 60),
      ('${B}', null, 'Walk-in guest', ${q(ADDR.guestCedar)}, 30);
    insert into public.address_points (key, lat, lon, found) values
      (${q(KEYS.record)}, 33.81, -118.11, true), (${q(KEYS.typed)}, 33.82, -118.12, true),
      (${q(KEYS.eli)}, 33.83, -118.13, true), (${q(KEYS.shop)}, 33.84, -118.14, true), (${q(KEYS.bea)}, 33.85, -118.15, true),
      (${q(KEYS.birch)}, 33.86, -118.16, true), (${q(KEYS.cedar)}, 33.87, -118.17, true);
  `);
  await db.exec(fn);
  return db;
}
const keysLeft = async (db) => new Set((await db.query(`select key from public.address_points`)).rows.map((r) => r.key));

test("97.20a · after forget_customer the geocode cache holds none of the customer's street addresses; everyone else's stay", { skip: PGlite || process.env.PGLITE_REQUIRED === "1" ? false : MISSING }, async () => {
  assert.ok(PGlite, `PGLITE_REQUIRED=1 and ${MISSING}`);
  const started_at = new Date().toISOString();
  const log = [], failures = [];
  let assertions = 0;
  const check = (name, ok, detail = "") => {
    assertions++;
    log.push(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
    if (!ok) failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
  };

  // CANARY: the pre-97.20a function leaves both of Dana's rows.
  const old = await fixture(read(OLD));
  await old.query(`select public.forget_customer('${A}', '${DANA}')`);
  const oldLeft = await keysLeft(old);
  const canaryCaught = oldLeft.has(KEYS.record) && oldLeft.has(KEYS.typed);
  log.push(`CANARY pre-97.20a: Dana's record key left ${oldLeft.has(KEYS.record)}, booking key left ${oldLeft.has(KEYS.typed)} (want both true)`);
  await old.close();

  // CANARY: the first 97.20a function deletes every shared street with hers.
  const bug = await fixture(read(SHARED_BUG));
  await bug.query(`select public.forget_customer('${A}', '${DANA}')`);
  const bugLeft = await keysLeft(bug);
  const sharedCaught = !bugLeft.has(KEYS.birch) && !bugLeft.has(KEYS.cedar) && !bugLeft.has(KEYS.shop);
  log.push(`CANARY 20261018050000: shared keys left birch ${bugLeft.has(KEYS.birch)}, cedar ${bugLeft.has(KEYS.cedar)}, shop ${bugLeft.has(KEYS.shop)} (want all false)`);
  await bug.close();

  const db = await fixture(SQL);
  // The SQL key and the JS key agree on every address in the scenario, messy ones included.
  for (const [k, v] of Object.entries(ADDR)) {
    const sqlKey = (await db.query(`select btrim(regexp_replace(lower(${q(v)}), '[^a-z0-9]+', ' ', 'g')) k`)).rows[0].k;
    check(`SQL key = addressKey for ${JSON.stringify(v)}`, sqlKey === KEYS[k], `${JSON.stringify(sqlKey)} vs ${JSON.stringify(KEYS[k])}`);
  }
  const res = (await db.query(`select public.forget_customer('${A}', '${DANA}') r`)).rows[0].r;
  const left = await keysLeft(db);
  check("her record's address is gone from the cache", !left.has(KEYS.record), KEYS.record);
  check("the address typed on her booking is gone from the cache", !left.has(KEYS.typed), KEYS.typed);
  check("Eli's address stays", left.has(KEYS.eli));
  check("another business's customer's address stays", left.has(KEYS.bea));
  check("a street of hers that another customer in the same business has on his record stays", left.has(KEYS.birch), KEYS.birch);
  check("a street of hers that a guest booking (no customer) in another business uses stays", left.has(KEYS.cedar), KEYS.cedar);
  check("the shop's address stays even though she typed it on a booking", left.has(KEYS.shop), KEYS.shop);
  check("the result counts the rows deleted", res.ok === true && res.address_points_deleted === 2, JSON.stringify(res));
  const bk = (await db.query(`select customer_address from public.bookings where business_id = '${A}' and customer_name = 'Deleted customer'`)).rows;
  check("her bookings are still anonymised by the same call", bk.length === 5 && bk.every((r) => r.customer_address === null), JSON.stringify(bk));
  const cross = (await db.query(`select public.forget_customer('${A}', '${BEA}') r`)).rows[0].r;
  check("a customer of another business is not_found and the cache is untouched", cross.ok === false && (await keysLeft(db)).size === 5);
  await db.close();

  const ART = `artifacts/forget-customer-address-points-sql/results${BREAK ? `.sabotage-${BREAK}` : ""}.txt`;
  mkdirSync(path.dirname(ART), { recursive: true });
  writeFileSync(ART, `break: ${BREAK || "none"}\n${log.join("\n")}\n`);

  const EXPECTED = 21;
  writeReceipt({
    check_id: "forget-customer-address-points-sql",
    started_at,
    status: failures.length || !canaryCaught || !sharedCaught ? "fail" : "pass",
    expected_targets: 7,
    discovered_targets: 7,
    attempted_targets: 7,
    completed_targets: 7,
    skipped_targets: 0,
    assertions_executed: assertions,
    min_assertions: EXPECTED,
    failures,
    assertion_floor: "structural: a fixed list of checks over seven fixed address_points rows",
    artifacts: [ART],
    canary: { id: "pre-97.20a-forget-customer + 20261018050000-deletes-shared", observed_failure: canaryCaught && sharedCaught },
    dimensions: { break: BREAK || undefined, migration: MIGRATION, address_points_deleted: res.address_points_deleted },
  });
  console.log(log.join("\n"));
  assert.ok(canaryCaught, "canary: the pre-97.20a function did not leave Dana's two cache rows");
  assert.ok(sharedCaught, "canary: 20261018050000 did not delete the shared streets, so this scenario cannot see that bug");
  assert.equal(assertions, EXPECTED, `ran ${assertions} assertions, expected ${EXPECTED}`);
  assert.deepEqual(failures, []);
});
