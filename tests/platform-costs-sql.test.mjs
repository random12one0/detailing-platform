// ROADMAP 9.14 — THE `platform_costs` TABLE, RUN ON A THROWAWAY IN-PROCESS POSTGRES.
//
//   npm install @electric-sql/pglite            # in ANY folder outside this repo
//   PGLITE_DIR=<that folder> node --test tests/platform-costs-sql.test.mjs
//
// The same arrangement and reasons as `tests/send-invoice-key-sql.test.mjs` and
// `tests/action-log-sql.test.mjs`: PGlite is real PostgreSQL in WebAssembly, nothing touches the
// live database, and it is not in any package.json. Without it the cases print NOT RUN and skip;
// with `PGLITE_REQUIRED=1` they fail instead.
//
// ---------------------------------------------------------------------------
// WHY THIS EXISTS WHEN `tests/platform-net.test.mjs` ALREADY PASSES
// ---------------------------------------------------------------------------
// That suite proves the ARITHMETIC — it imports `_shared/platformNet.js` and runs it, including
// 9.14's own failure mode (no costs entered yields no net figure). What it does with the TABLE is
// grep it: its section 7 reads the migration as text and asserts the words `enable row level
// security`, `force row level security` and `revoke all …` are present.
//
// **A GREP CANNOT TELL YOU THAT THE LOCK WORKS.** This table holds what the platform spends, which
// no detailer may ever read, and `20260921000000_revoke_locked_table_grants.sql` is this repo's own
// record of a lock that read correctly and was not one: ten tables had RLS with zero policies and
// still carried Supabase's default grant, and `anon` held INSERT on the audit trail until it ran.
// So the lock is asserted here by ASKING THE DATABASE, under the roles a browser arrives as.
//
// ---------------------------------------------------------------------------
// FIXTURES, SAID PLAINLY
// ---------------------------------------------------------------------------
// The roles `anon` and `authenticated` exist empty, and Supabase's default grant of every new
// public table to both is set — otherwise the revoke can never be seen to work, which is the whole
// lesson of the migration named above. `public.set_updated_at()` is copied from
// `20260827000000_foundation.sql` because this migration installs a trigger that calls it.
//
// WHAT IT CANNOT SHOW: that `force row level security` does anything, because the role running
// these statements owns the table and PGlite's superuser bypasses RLS regardless. Those two flags
// are therefore read out of `pg_class` as declarations, and the REVOKE is what is proved
// behaviourally. That is the honest split, and it is the same split the live database has: the
// service role bypasses RLS too, so the GRANT is what stands between a browser and this table.

import { readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { test } from "node:test";
import assert from "node:assert/strict";

const MIGRATION = "supabase/migrations/20261006020000_hand_entered_platform_costs.sql";
const SQL = readFileSync(MIGRATION, "utf8");

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

const ADMIN = "11111111-1111-4111-8111-111111111111";
const bill = (month, category = "hosting", cents = 1900) =>
  "insert into public.platform_costs (period_month, category, amount_cents, note, entered_by)"
  + ` values ('${month}', '${category}', ${cents}, 'Netlify', '${ADMIN}')`;

async function fresh(sql = SQL) {
  const db = new PGlite();
  await db.exec(`
    create role anon; create role authenticated;
    alter default privileges in schema public grant all on tables to anon, authenticated;
    create or replace function public.set_updated_at() returns trigger language plpgsql as $fn$
    begin new.updated_at = now(); return new; end; $fn$;
  `);
  await db.exec(sql);
  return db;
}
const refused = async (db, stmt) => { try { await db.exec(stmt); return null; } catch (e) { return e.message; } };
const one = async (db, q) => (await db.query(q)).rows[0];

t("1 · the migration applies, a bill goes in, and the month index is there by name", async () => {
  const db = await fresh();
  assert.equal(await refused(db, bill("2026-03-01")), null);
  assert.equal((await one(db, "select count(*)::int as n from public.platform_costs")).n, 1);
  assert.equal(
    (await one(db, "select count(*)::int as n from pg_indexes where tablename = 'platform_costs' and indexname = 'platform_costs_period_idx'")).n,
    1, "the only question asked of this table is 'everything for one month'",
  );
  await db.close();
});

t("2 · A PERIOD IS A MONTH: the first of the month goes in, the fifteenth is refused", async () => {
  const db = await fresh();
  assert.equal(await refused(db, bill("2026-03-01")), null);
  assert.match(
    String(await refused(db, bill("2026-03-15"))), /platform_costs_period_is_first_of_month|check constraint/,
    "two rows for March written as the 1st and the 15th would be two different periods, and March's "
    + "total would then depend on which day somebody happened to type. The constraint is what makes "
    + "that impossible rather than merely discouraged.",
  );
  await db.close();
});

t("3 · the five categories are exactly what the table takes, and the check is case-sensitive", async () => {
  const db = await fresh();
  for (const c of ["hosting", "database", "email", "domain", "other"]) {
    assert.equal(await refused(db, bill("2026-03-01", c)), null, `${c} must be accepted`);
  }
  assert.match(String(await refused(db, bill("2026-03-01", "coffee"))), /check constraint/);
  assert.match(
    String(await refused(db, bill("2026-03-01", "Hosting"))), /check constraint/,
    "`Hosting` is refused by the DATABASE, which is why `costEntry` refuses it too — a screen "
    + "sending a capitalised label would otherwise be a 500 on a valid-looking bill",
  );
  await db.close();
});

t("4 · a zero bill is allowed and a negative one is not", async () => {
  const db = await fresh();
  assert.equal(await refused(db, bill("2026-03-01", "other", 0)), null,
    "a typed zero is a person asserting it — 9.14's known-empty case, which IS allowed to produce a figure");
  assert.match(String(await refused(db, bill("2026-03-01", "other", -1))), /check constraint/);
  await db.close();
});

t("5 · THE COLUMN SILENTLY ROUNDS A NON-INTEGER, which is why the function refuses one first", async () => {
  const db = await fresh();
  // 12.5 is dollars-with-decimals arriving where cents belong. `integer` does not refuse it; it
  // ROUNDS. So the only thing between a screen bug and a wrong figure in the database is
  // `costEntry`'s own refusal, and this case is here so nobody later decides that guard is
  // redundant because "the column is an integer anyway".
  await db.exec(bill("2026-03-01", "hosting", 12.5));
  const got = (await one(db, "select amount_cents from public.platform_costs")).amount_cents;
  assert.equal(Number.isInteger(got), true);
  assert.notEqual(got, 12.5);
  await db.close();
});

t("6 · THE LOCK: zero policies, both RLS flags set, and neither browser role can read or write", async () => {
  const db = await fresh();
  assert.equal((await one(db, "select count(*)::int as n from pg_policies where tablename = 'platform_costs'")).n, 0,
    "zero policies by design: a detailer's browser never reaches this table, so there is no row for a "
    + "policy to choose between");
  const flags = await one(db, "select relrowsecurity, relforcerowsecurity from pg_class where relname = 'platform_costs'");
  assert.equal(flags.relrowsecurity, true);
  assert.equal(flags.relforcerowsecurity, true);
  for (const role of ["anon", "authenticated"]) {
    for (const p of ["select", "insert", "update", "delete"]) {
      assert.equal((await one(db, `select has_table_privilege('${role}', 'public.platform_costs', '${p}') as h`)).h,
        false, `${role} holds ${p} on platform_costs`);
    }
    await db.exec(`set role ${role}`);
    // READING is the one 9.14 cares about most: this is what the platform spends.
    assert.match(String(await refused(db, "select * from public.platform_costs")), /permission denied/,
      `${role} could READ the platform's costs`);
    assert.match(String(await refused(db, bill("2026-03-01"))), /permission denied/);
    await db.exec("reset role");
  }
  await db.close();
});

t("7 · updated_at moves on an update and created_at does not", async () => {
  const db = await fresh();
  await db.exec(bill("2026-03-01"));
  const before = await one(db, "select created_at, updated_at from public.platform_costs");
  await db.exec("update public.platform_costs set note = 'Netlify, corrected'");
  const after = await one(db, "select created_at, updated_at from public.platform_costs");
  assert.equal(+after.created_at, +before.created_at);
  assert.ok(+after.updated_at >= +before.updated_at,
    "the trigger from foundation.sql must be installed on this table");
  await db.close();
});

// ── break it on purpose ──
// Each sabotage asserts the SQL actually changed before its verdict is believed. `docs/gotchas.md`
// 95: a canary aimed at something that has moved keeps passing while testing nothing.
const without = (re) => { const s = SQL.replace(re, ""); assert.notEqual(s, SQL, "the sabotage did not apply: " + re); return s; };

t("8 · the period check removed lets the fifteenth in; the amount check removed lets a negative bill in", async () => {
  const noMonth = await fresh(without(/,\n  constraint platform_costs_period_is_first_of_month\n    check \(period_month = date_trunc\('month', period_month\)::date\)/));
  assert.equal(await refused(noMonth, bill("2026-03-15")), null,
    "the fifteenth was still refused with the constraint removed");
  await noMonth.close();
  const noFloor = await fresh(without(/ check \(amount_cents >= 0\)/));
  assert.equal(await refused(noFloor, bill("2026-03-01", "other", -1)), null);
  await noFloor.close();
});

t("9 · THE SABOTAGE THAT MATTERS: the revoke removed, and a browser role holds select on the platform's costs", async () => {
  const noRevoke = await fresh(without(/revoke all on public\.platform_costs from anon, authenticated;\n/));
  await noRevoke.exec(bill("2026-03-01"));
  assert.equal((await one(noRevoke, "select has_table_privilege('anon', 'public.platform_costs', 'select') as h")).h, true);
  await noRevoke.exec("set role anon");
  // AND HERE IS THE DISTINCTION WORTH HAVING MEASURED RATHER THAN ARGUED. RLS is still enabled and
  // forced in this sabotaged copy, so `anon` does not get the ROWS — it gets an empty answer and no
  // error at all. **An empty answer is indistinguishable from a month with no costs**, which is
  // 9.14's own unknown-versus-known-empty trap arriving at the security layer. The REVOKE is what
  // turns that silence into a refusal, and it is the half this repo has already shipped without
  // once (`20260921000000_revoke_locked_table_grants.sql`).
  const rows = (await noRevoke.query("select * from public.platform_costs")).rows;
  assert.equal(rows.length, 0, "RLS with zero policies still hides the rows");
  await noRevoke.exec("reset role");
  await noRevoke.close();
});
