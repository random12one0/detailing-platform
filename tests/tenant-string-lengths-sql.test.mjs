// ROADMAP 2.15a — THE FIVE NAME LENGTH BOUNDS, RUN ON A THROWAWAY IN-PROCESS POSTGRES.
//
//   npm install @electric-sql/pglite            # in ANY folder outside this repo
//   PGLITE_DIR=<that folder> node --test tests/tenant-string-lengths-sql.test.mjs
//
// The same arrangement and reasons as `tests/send-invoice-key-sql.test.mjs`,
// `tests/platform-costs-sql.test.mjs` and `tests/action-log-sql.test.mjs`: PGlite is real
// PostgreSQL in WebAssembly, nothing touches the live database, and it is not in any
// package.json. Without it the cases print NOT RUN and skip; with `PGLITE_REQUIRED=1` they fail.
//
// ---------------------------------------------------------------------------
// WHAT IS WORTH TESTING ABOUT FIVE ONE-LINE CHECK CONSTRAINTS
// ---------------------------------------------------------------------------
// Not that 61 characters is refused — that is what a CHECK does. **Two things that are easy to
// get wrong and impossible to see by reading:**
//
// 1. **`char_length` versus `octet_length`.** This product is bilingual. Sixty accented characters
//    are 120 bytes in UTF-8, so a byte-counting bound refuses a Spanish name that the browser's
//    own 60-character box accepted — and **the live data cannot reveal it**, because every value
//    in all five columns today is pure ASCII. § 5 writes sixty `á` and requires them in; the
//    sabotage in § 7 swaps one word in the migration and watches that same name be refused.
// 2. **That a NULL still passes and an empty string does not.** `char_length(null) between 1 and
//    60` is NULL, and a CHECK rejects only FALSE, so the bound leaves nullability alone. The lower
//    bound of 1 is doing separate work and is asserted separately.
//
// FIXTURES, SAID PLAINLY: five tables with nothing but an id and a nullable `name text`. The real
// tables carry far more, and none of it participates in these constraints. `name` is left NULLABLE
// here ON PURPOSE even where the live column is not, because that is the only way to show the
// CHECK tolerates NULL rather than relying on `not null` to hide the question.

import { readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { test } from "node:test";
import assert from "node:assert/strict";

const MIGRATION = "supabase/migrations/20261007010000_tenant_string_lengths.sql";
const SQL = readFileSync(MIGRATION, "utf8");
const TABLES = ["businesses", "services", "add_ons", "service_groups", "plans"];

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

async function fresh(sql = SQL) {
  const db = new PGlite();
  await db.exec(TABLES.map((x) =>
    `create table public.${x} (id serial primary key, name text);`).join("\n"));
  await db.exec(sql);
  return db;
}
const put = (table, value) => value === null
  ? `insert into public.${table} (name) values (null)`
  : `insert into public.${table} (name) values ('${String(value).replace(/'/g, "''")}')`;
const refused = async (db, stmt) => { try { await db.exec(stmt); return null; } catch (e) { return e.message; } };
const letters = (n, ch = "a") => ch.repeat(n);

t("1 · the migration applies and every one of the five constraints is there by name", async () => {
  const db = await fresh();
  for (const x of TABLES) {
    const { rows } = await db.query(
      `select count(*)::int as n from pg_constraint where conname = '${x}_name_len' and contype = 'c'`);
    assert.equal(rows[0].n, 1, `${x}_name_len is missing`);
  }
  await db.close();
});

t("2 · sixty characters go in and sixty-one are refused, on all five", async () => {
  const db = await fresh();
  for (const x of TABLES) {
    assert.equal(await refused(db, put(x, letters(60))), null, `${x} refused a legal 60`);
    assert.match(String(await refused(db, put(x, letters(61)))), new RegExp(`${x}_name_len|check constraint`),
      `${x} accepted 61 characters`);
  }
  await db.close();
});

t("3 · the cap is exactly the browser's: a 60-character box can never produce a refusal", async () => {
  // `maxLength={60}` counts UTF-16 code units, which is never FEWER than the character count, so
  // anything a capped box can hold passes `char_length(…) <= 60`. The worst case is an astral
  // character: two units in the box, one character here.
  const db = await fresh();
  const emoji = "\u{1F697}".repeat(30); // 60 UTF-16 units, 30 characters — the box's own limit
  assert.equal(emoji.length, 60);
  assert.equal([...emoji].length, 30);
  assert.equal(await refused(db, put("businesses", emoji)), null,
    "a value the box allowed was refused by the column — the two caps are not aligned");
  await db.close();
});

t("4 · a NULL name still passes and an empty one does not", async () => {
  const db = await fresh();
  for (const x of TABLES) {
    assert.equal(await refused(db, put(x, null)), null,
      `${x}: the bound changed nullability, which this migration must not do`);
    assert.match(String(await refused(db, put(x, ""))), /check constraint|_name_len/,
      `${x} accepted an empty name`);
  }
  await db.close();
});

t("5 · SIXTY ACCENTED CHARACTERS ARE 120 BYTES AND MUST GO IN — the bilingual case", async () => {
  const db = await fresh();
  const spanish = "á".repeat(60);
  assert.equal([...spanish].length, 60);
  assert.equal(Buffer.byteLength(spanish, "utf8"), 120, "the fixture is not what this case claims");
  for (const x of TABLES) {
    assert.equal(await refused(db, put(x, spanish)), null,
      `${x} refused sixty characters because they were accented — the bound is counting bytes`);
  }
  // And a real one, so the case is not only about a repeated letter.
  const real = "Detallado Rápido de Automóviles";
  assert.equal([...real].length, 31);
  assert.equal(Buffer.byteLength(real, "utf8"), 33);
  assert.equal(await refused(db, put("businesses", real)), null);
  await db.close();
});

t("6 · the existing data would all survive it — the longest value measured on 2026-10-07", async () => {
  // Read-only off `kguqylyzgyzfktkfnhjb` the day this migration was written; the figures are in
  // the migration's own header. The point of replaying them here is that the LONGEST one has to
  // pass, not that a short one does: 48 is the number that would have made this migration
  // unapplyable if it had been 61.
  const longest = { businesses: 48, services: 22, add_ons: 21, service_groups: 10, plans: 21 };
  const db = await fresh();
  for (const [x, n] of Object.entries(longest)) {
    assert.equal(await refused(db, put(x, letters(n))), null,
      `${x}'s longest live value (${n} characters) would be refused by this migration`);
  }
  await db.close();
});

// ── break it on purpose ──
// Each sabotage asserts the SQL changed before its verdict is believed. `docs/gotchas.md` 95.
const swap = (from, to) => { const s = SQL.replaceAll(from, to); assert.notEqual(s, SQL, `the sabotage did not apply: ${from}`); return s; };

t("7 · THE SABOTAGE THAT MATTERS: `octet_length` instead of `char_length` refuses a Spanish name", async () => {
  const bytes = await fresh(swap("char_length(name)", "octet_length(name)"));
  const spanish = "á".repeat(60); // 60 characters, 120 bytes
  assert.match(String(await refused(bytes, put("businesses", spanish))), /check constraint|_name_len/,
    "the byte-counting bound accepted 120 bytes, so this sabotage proves nothing");
  // AND THE TELL IS THAT IT LOOKS FINE ON THE DATA WE HAVE. Every live value is ASCII, so the
  // broken version accepts all of them and nothing anywhere goes red.
  assert.equal(await refused(bytes, put("businesses", letters(48))), null,
    "the byte bound still accepts every ASCII value in the live database — which is why reading "
    + "the migration could never have caught this");
  await bytes.close();
});

t("8 · the bound widened, and the lower bound removed, are both seen", async () => {
  const wide = await fresh(swap("between 1 and 60", "between 1 and 600"));
  assert.equal(await refused(wide, put("businesses", letters(61))), null);
  await wide.close();
  const noFloor = await fresh(swap("between 1 and 60", "<= 60"));
  assert.equal(await refused(noFloor, put("businesses", "")), null,
    "the empty name was still refused with the lower bound gone");
  await noFloor.close();
});

t("9 · and the constraint removed altogether is seen", async () => {
  const none = await fresh(swap("add constraint businesses_name_len\n    check (char_length(name) between 1 and 60);", "add constraint businesses_name_noop check (name is not null or name is null);"));
  assert.equal(await refused(none, put("businesses", letters(500))), null);
  const { rows } = await none.query("select count(*)::int as n from pg_constraint where conname = 'businesses_name_len'");
  assert.equal(rows[0].n, 0, "the sabotage left the real constraint in place");
  await none.close();
});
