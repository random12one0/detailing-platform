// ROADMAP 101.2 — A NEGATIVE OR ZERO EXPENSE IS REFUSED, BY THE SHEET AND BY THE TABLE.
//
//   PGLITE_DIR=<folder with @electric-sql/pglite> node --test tests/expense-amount-positive.test.mjs
//
// The table case runs the real migration on a throwaway PGlite (no live database; same arrangement as
// `tests/domain-claims-sql.test.mjs`). Without PGLITE_DIR it prints NOT RUN and skips; PGLITE_REQUIRED=1 fails.
// The sheet case reads `ExpenseModal.jsx`: both the Save button and save() must ask for Number(amount) > 0
// (the old `!Number(amount)` let -50 through). The screen proof is in the 101.2 ROADMAP note.

import { readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { test } from "node:test";
import assert from "node:assert/strict";

const SQL = readFileSync("supabase/migrations/20261023090000_expense_amount_positive.sql", "utf8");

let PGlite = null;
const dir = process.env.PGLITE_DIR;
if (dir) {
  try { ({ PGlite } = await import(pathToFileURL(path.join(dir, "node_modules/@electric-sql/pglite/dist/index.js")).href)); }
  catch (e) { console.error(`PGLITE_DIR=${dir} does not hold @electric-sql/pglite: ${e.message}`); }
}
const MISSING = "NOT RUN — needs @electric-sql/pglite: `npm install @electric-sql/pglite` in a folder outside the repo, then PGLITE_DIR=<folder>";
if (!PGlite) console.error(`\n  ${MISSING}\n  (set PGLITE_REQUIRED=1 to make this a failure instead of a skip)\n`);

test("the table refuses an amount of zero or less and keeps a positive one", {
  skip: PGlite || process.env.PGLITE_REQUIRED === "1" ? false : MISSING,
}, async () => {
  assert.ok(PGlite, `PGLITE_REQUIRED=1 and ${MISSING}`);
  const db = new PGlite();
  // The column exactly as 20260827000200_tenant_data.sql makes it (other columns trimmed).
  await db.exec("create table public.expenses (id serial primary key, amount numeric not null)");
  await db.exec(SQL);
  for (const bad of [-50, -0.01, 0]) {
    await assert.rejects(db.query("insert into public.expenses (amount) values ($1)", [bad]),
      /expenses_amount_positive/, `${bad} was stored`);
  }
  await db.query("insert into public.expenses (amount) values (49.99)");
  await assert.rejects(db.query("update public.expenses set amount = -49.99"), /expenses_amount_positive/);
  await db.close();
});

test("the Add expense sheet only saves an amount above zero", () => {
  const src = readFileSync("app/src/components/ExpenseModal.jsx", "utf8");
  assert.equal(src.match(/!\(Number\(amount\) > 0\)/g)?.length, 2, "save() and the Save button must both ask Number(amount) > 0");
  assert.doesNotMatch(src, /!Number\(amount\)/, "the old non-zero test lets -50 through");
  assert.match(src, /type="number"\s+min="0"/, "the amount box carries min=0");
});
