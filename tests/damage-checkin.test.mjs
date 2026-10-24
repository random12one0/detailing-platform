// ROADMAP 97.55 — THE VEHICLE CHECK-IN: THE RULE AND THE COLUMN.
//
// Part 1 (credential-free, always runs): `app/src/lib/checkin.js`, the rule
// both the receipt page and the job record import. A live unticked booking
// with at least one damage photo recorded may tick; one with none may not
// (nothing has been checked in yet); a ticked one may not tick twice; a
// cancelled one is refused.
// Part 2 (needs PGlite, the same arrangement as
// `tests/booking-lines-same-business-sql.test.mjs`): the migration applies
// to a throwaway Postgres and gains `bookings.damage_ack_at`, nullable with
// no default, staying null until the timestamp is written, and
// `bookings.damage_ack_photo_count`, the number of damage photos the tick
// covered, written in the same statement.
//
//   node --test tests/damage-checkin.test.mjs
//   PGLITE_DIR=<folder> node --test tests/damage-checkin.test.mjs

import { readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { test } from "node:test";
import assert from "node:assert/strict";
import { canAcknowledge, hasAcked } from "../app/src/lib/checkin.js";

// ---------------------------------------------------------------------------
// Part 1 - the rule
// ---------------------------------------------------------------------------

test("a live unticked booking with recorded damage can be acknowledged", () => {
  const booking = { status: "confirmed", damage_ack_at: null, damage_photo_count: 2 };
  assert.equal(canAcknowledge(booking), true);
  assert.equal(hasAcked(booking), false);
});

test("a live unticked booking with nothing recorded yet is refused the tick", () => {
  // Finish review 2026-10-24: offered from the moment of booking, the tick
  // confirmed a check-in that had not happened.
  assert.equal(canAcknowledge({ status: "pending", damage_ack_at: null, damage_photo_count: 0 }), false);
  assert.equal(canAcknowledge({ status: "confirmed", damage_ack_at: null }), false);
});

test("a ticked booking cannot be ticked again", () => {
  const booking = { status: "confirmed", damage_ack_at: "2026-10-19T08:00:00.000Z", damage_photo_count: 2 };
  assert.equal(canAcknowledge(booking), false);
  assert.equal(hasAcked(booking), true);
});

test("a cancelled booking is refused the check-in", () => {
  assert.equal(canAcknowledge({ status: "cancelled", damage_ack_at: null, damage_photo_count: 2 }), false);
});

test("there is nothing to acknowledge without a booking", () => {
  assert.equal(canAcknowledge(null), false);
  assert.equal(canAcknowledge(undefined), false);
  assert.equal(hasAcked(null), false);
});

// ---------------------------------------------------------------------------
// Part 2 - the migration, on a throwaway in-process Postgres
// ---------------------------------------------------------------------------

const SQL = readFileSync(
  "supabase/migrations/20261024160000_damage_ack.sql", "utf8",
).replace(/\r\n/g, "\n");

let PGlite = null;
const dir = process.env.PGLITE_DIR;
if (dir) {
  try {
    ({ PGlite } = await import(pathToFileURL(path.join(dir, "node_modules/@electric-sql/pglite/dist/index.js")).href));
  } catch (e) { console.error(`PGLITE_DIR=${dir} does not hold @electric-sql/pglite: ${e.message}`); }
}
const MISSING = "NOT RUN - needs @electric-sql/pglite: `npm install @electric-sql/pglite` in a folder outside the repo, then PGLITE_DIR=<folder>";
if (!PGlite) console.error(`\n  ${MISSING}\n  (set PGLITE_REQUIRED=1 to make this a failure instead of a skip)\n`);
const t = (name, fn) => test(name, { skip: PGlite || process.env.PGLITE_REQUIRED === "1" ? false : MISSING }, async () => {
  assert.ok(PGlite, `PGLITE_REQUIRED=1 and ${MISSING}`);
  await fn();
});

const BOOK_ID = "a1a1a1a1-a1a1-4a1a-8a1a-a1a1a1a1a1a1";

async function migrated() {
  const db = new PGlite();
  await db.exec("create table public.bookings (id uuid primary key);");
  await db.exec(SQL);
  return db;
}

t("the migration gains bookings.damage_ack_at, nullable with no default", async () => {
  const db = await migrated();
  const { rows } = await db.query(
    "select data_type, is_nullable, column_default from information_schema.columns "
    + "where table_schema = 'public' and table_name = 'bookings' and column_name = 'damage_ack_at'",
  );
  assert.equal(rows.length, 1, "damage_ack_at is missing after the migration");
  assert.match(rows[0].data_type, /timestamp/i, `wrong type: ${rows[0].data_type}`);
  assert.equal(rows[0].is_nullable, "YES", "the column must stay nullable: null means not yet ticked");
  assert.equal(rows[0].column_default, null, "no default: a missing tick and a tick at midnight differ");
});

t("the migration gains bookings.damage_ack_photo_count, a nullable integer with no default", async () => {
  const db = await migrated();
  const { rows } = await db.query(
    "select data_type, is_nullable, column_default from information_schema.columns "
    + "where table_schema = 'public' and table_name = 'bookings' and column_name = 'damage_ack_photo_count'",
  );
  assert.equal(rows.length, 1, "damage_ack_photo_count is missing after the migration");
  assert.equal(rows[0].data_type, "integer");
  assert.equal(rows[0].is_nullable, "YES", "null until the tick: there is no count before there is a tick");
  assert.equal(rows[0].column_default, null);
});

t("a row stays unticked until the timestamp is written", async () => {
  const db = await migrated();
  await db.exec(`insert into public.bookings (id) values ('${BOOK_ID}')`);
  let r = await db.query(`select damage_ack_at from public.bookings where id = '${BOOK_ID}'`);
  assert.equal(r.rows[0].damage_ack_at, null, "a new row must read as not yet ticked");
  await db.exec(`update public.bookings set damage_ack_at = now(), damage_ack_photo_count = 2 where id = '${BOOK_ID}' and damage_ack_at is null`);
  r = await db.query(`select damage_ack_at, damage_ack_photo_count from public.bookings where id = '${BOOK_ID}'`);
  assert.ok(r.rows[0].damage_ack_at !== null, "the tick did not stick");
  assert.equal(r.rows[0].damage_ack_photo_count, 2, "the count did not stick with the tick");
});

t("a second tick does not move the first timestamp", async () => {
  const db = await migrated();
  await db.exec(`insert into public.bookings (id) values ('${BOOK_ID}')`);
  // The exact statement `acknowledge-checkin` runs: only an unticked row
  // moves, so a double press lands one timestamp and the loser is told.
  const tick = `update public.bookings set damage_ack_at = now() where id = '${BOOK_ID}' and damage_ack_at is null`;
  await db.exec(tick);
  const first = (await db.query(`select damage_ack_at from public.bookings where id = '${BOOK_ID}'`)).rows[0].damage_ack_at;
  assert.ok(first !== null, "the first tick did not stick");
  await db.exec(tick);
  const second = (await db.query(`select damage_ack_at from public.bookings where id = '${BOOK_ID}'`)).rows[0].damage_ack_at;
  assert.equal(String(second), String(first), "the second tick moved the first timestamp");
});
