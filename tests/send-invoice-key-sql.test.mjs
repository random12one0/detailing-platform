// ROADMAP 6.4 — THE `send_invoice_attempts` TABLE, RUN ON A THROWAWAY IN-PROCESS POSTGRES.
//
//   npm install @electric-sql/pglite            # in ANY folder outside this repo
//   PGLITE_DIR=<that folder> node --test tests/send-invoice-key-sql.test.mjs
//
// The same arrangement and reasons as `tests/action-log-sql.test.mjs`: PGlite is real PostgreSQL in WebAssembly,
// nothing touches the live database, and it is not in any package.json. Without it the cases print NOT RUN and
// skip; with `PGLITE_REQUIRED=1` they fail.
//
// FIXTURES, said plainly: the roles `anon` and `authenticated` exist empty and Supabase's default grant of every
// new public table to both is set (otherwise the revoke can never be seen to work); and `public.bookings` is
// reduced to its id, the one column the foreign key points at.
//
// WHAT IT PROVES: the primary key is what makes a claim atomic (a second insert of the same booking and key
// fails and the same key on another booking does not), the state check, the cascade from the booking, the lock
// against a browser, and that the compare-and-set update the function issues (`state in (...)` and, for a stale
// send, `updated_at < cutoff`) wins once and loses the second time. WHAT IT DOES NOT: that the function issues
// those statements (the supabase-js call is read as text in `tests/send-invoice-key.test.mjs`).

import { readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { test } from "node:test";
import assert from "node:assert/strict";

const SQL = readFileSync("supabase/migrations/20261006062000_send_invoice_attempts.sql", "utf8");

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

const BIZ = "11111111-1111-4111-8111-111111111111";
const B1 = "22222222-2222-4222-8222-222222222222";
const B2 = "33333333-3333-4333-8333-333333333333";
const K1 = "44444444-4444-4444-8444-444444444444";
const K2 = "55555555-5555-4555-8555-555555555555";
const claim = (book, key, state = "sending") => `insert into public.send_invoice_attempts (booking_id, idempotency_key, business_id, state) values ('${book}', '${key}', '${BIZ}', '${state}')`;

async function fresh(sql = SQL) {
  const db = new PGlite();
  await db.exec(`
    create role anon; create role authenticated;
    alter default privileges in schema public grant all on tables to anon, authenticated;
    create table public.bookings (id uuid primary key);
    insert into public.bookings values ('${B1}'), ('${B2}');
  `);
  await db.exec(sql);
  return db;
}
const refused = async (db, stmt) => { try { await db.exec(stmt); return null; } catch (e) { return e.message; } };

t("1 · the migration applies and a second claim of the same booking and key is refused, while another booking or key is not", async () => {
  const db = await fresh();
  await db.exec(claim(B1, K1));
  assert.match(String(await refused(db, claim(B1, K1))), /duplicate key|unique/i);
  assert.equal(await refused(db, claim(B2, K1)), null, "the same key on another booking is a different claim");
  assert.equal(await refused(db, claim(B1, K2)), null, "a new key on the same booking is a deliberate second send");
  await db.close();
});

t("2 · the state is one of sending, sent, failed, and a booking that does not exist is refused", async () => {
  const db = await fresh();
  assert.match(String(await refused(db, claim(B1, K1, "bogus"))), /check constraint/);
  assert.match(String(await refused(db, claim("99999999-9999-4999-8999-999999999999", K1))), /foreign key/);
  await db.close();
});

t("3 · deleting the booking removes its keys", async () => {
  const db = await fresh();
  await db.exec(claim(B1, K1)); await db.exec(claim(B1, K2)); await db.exec(claim(B2, K1));
  await db.exec(`delete from public.bookings where id = '${B1}'`);
  assert.equal((await db.query("select count(*)::int as n from public.send_invoice_attempts")).rows[0].n, 1);
  await db.close();
});

t("4 · locked from a browser: RLS enabled and forced, no policy, neither role holds a privilege, and an insert as anon is refused", async () => {
  const db = await fresh();
  const c = (await db.query("select relrowsecurity as on, relforcerowsecurity as forced from pg_class where oid = 'public.send_invoice_attempts'::regclass")).rows[0];
  assert.deepEqual(c, { on: true, forced: true });
  assert.equal((await db.query("select count(*)::int as n from pg_policies where tablename = 'send_invoice_attempts'")).rows[0].n, 0);
  for (const role of ["anon", "authenticated"]) {
    for (const p of ["select", "insert", "update", "delete"]) {
      assert.equal((await db.query(`select has_table_privilege('${role}', 'public.send_invoice_attempts', '${p}') as h`)).rows[0].h, false, `${role} holds ${p}`);
    }
    await db.exec(`set role ${role}`);
    assert.match(String(await refused(db, claim(B1, K1))), /permission denied/);
    await db.exec("reset role");
  }
  await db.close();
});

t("5 · the compare-and-set the function issues wins once: a failed claim is taken by one caller, a stale send by one caller, and a fresh send by none", async () => {
  const db = await fresh();
  const take = async (from, extra = "") => (await db.query(
    `update public.send_invoice_attempts set state = 'sending', updated_at = now() where booking_id = '${B1}' and idempotency_key = '${K1}' and state in (${from}) ${extra} returning state`)).rows.length;
  await db.exec(claim(B1, K1, "failed"));
  assert.deepEqual([await take("'failed'"), await take("'failed'")], [1, 0], "a failed claim must be taken exactly once");
  // now `sending` and fresh: the stale-takeover form must lose
  assert.equal(await take("'sending'", "and updated_at < now() - interval '2 minutes'"), 0, "a fresh send was taken over");
  await db.exec(`update public.send_invoice_attempts set updated_at = now() - interval '3 minutes' where booking_id = '${B1}'`);
  assert.deepEqual([await take("'sending'", "and updated_at < now() - interval '2 minutes'"), await take("'sending'", "and updated_at < now() - interval '2 minutes'")], [1, 0], "a stale send must be taken exactly once");
  await db.close();
});

// ── break it on purpose ──
const without = (re) => { const s = SQL.replace(re, ""); assert.notEqual(s, SQL, "the sabotage did not apply: " + re); return s; };

t("6 · the primary key removed lets a claim be made twice; the check removed lets a bogus state in; the revoke removed gives a browser role the privilege", async () => {
  const noPk = await fresh(without(/,\n  primary key \(booking_id, idempotency_key\)/));
  await noPk.exec(claim(B1, K1));
  assert.equal(await refused(noPk, claim(B1, K1)), null, "the duplicate was still refused with the primary key removed");
  await noPk.close();
  const noCheck = await fresh(without(/ check \(state in \('sending', 'sent', 'failed'\)\)/));
  assert.equal(await refused(noCheck, claim(B1, K1, "bogus")), null);
  await noCheck.close();
  const noRevoke = await fresh(without(/revoke all on public\.send_invoice_attempts from anon, authenticated;\n/));
  assert.equal((await noRevoke.query("select has_table_privilege('anon', 'public.send_invoice_attempts', 'insert') as h")).rows[0].h, true);
  await noRevoke.close();
});
