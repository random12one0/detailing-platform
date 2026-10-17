// ROADMAP 97.13 — A SIGNED-IN MEMBER CANNOT CLAIM OR KEEP A "VERIFIED" WEB ADDRESS, ON A THROWAWAY POSTGRES.
//
//   npm install @electric-sql/pglite            # in ANY folder outside this repo
//   PGLITE_DIR=<that folder> node --test tests/domain-claims-sql.test.mjs
//
// Same arrangement as `tests/send-invoice-key-sql.test.mjs`: PGlite is real PostgreSQL in WebAssembly, nothing
// touches the live database, and it is in no package.json. Without it every case prints NOT RUN and skips; with
// `PGLITE_REQUIRED=1` they fail.
//
// FIXTURES, said plainly: roles `anon` and `authenticated` with Supabase's default grant of every new table to
// both; `business_domains` as `20260827000100_tenant_core.sql` creates it, except the token default is `md5(random())`
// because PGlite has no pgcrypto; `has_business_permission` is a stub that says yes, so RLS lets the member at
// the row and ONLY the privileges decide; and the three earlier statements this item names, copied verbatim, so
// case 1 reproduces the holes before the new migration is laid on top.
//
// WHAT IT PROVES: the migration, applied to that state, refuses a member's INSERT (with or without `verified_at`),
// refuses UPDATE of `domain` and of `verified_at`, still lets them DELETE their row, and clears `verified_at`
// when the service role renames a row — unless the same write stamps it, which is what `verify-domain` does.
// WHAT IT DOES NOT: that the live database has had the migration applied (`node scripts/migration-drift.mjs`).

import { readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { test } from "node:test";
import assert from "node:assert/strict";

const SQL = readFileSync("supabase/migrations/20261017030000_domain_claims_need_proof.sql", "utf8").replace(/\r\n/g, "\n");

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
const ROW = "22222222-2222-4222-8222-222222222222";

async function fresh(migration = SQL) {
  const db = new PGlite();
  await db.exec(`
    create role anon; create role authenticated;
    alter default privileges in schema public grant all on tables to anon, authenticated;
    create table public.businesses (id uuid primary key);
    insert into public.businesses values ('${BIZ}');
    create function public.has_business_permission(uuid, text) returns boolean language sql as 'select true';
    create table public.business_domains (
      id                 uuid primary key default gen_random_uuid(),
      business_id        uuid not null references public.businesses(id) on delete cascade,
      domain             text not null unique check (domain = lower(domain)),
      verification_token text not null default md5(random()::text),
      verified_at        timestamptz,
      created_at         timestamptz not null default now()
    );
    alter table public.business_domains enable row level security;
    alter table public.business_domains force row level security;
    create policy business_domains_member_select on public.business_domains for select to authenticated using (true);
    create policy business_domains_permission_insert on public.business_domains
      for insert to authenticated
      with check (public.has_business_permission(business_id, 'settings'));
    create policy business_domains_permission_update on public.business_domains
      for update to authenticated
      using (public.has_business_permission(business_id, 'settings'))
      with check (public.has_business_permission(business_id, 'settings'));
    create policy business_domains_permission_delete on public.business_domains
      for delete to authenticated
      using (public.has_business_permission(business_id, 'settings'));
    revoke update (verified_at, verification_token) on public.business_domains from authenticated;
    revoke update on public.business_domains from authenticated, anon;
    grant update (domain) on public.business_domains to authenticated;
    insert into public.business_domains (id, business_id, domain, verified_at) values ('${ROW}', '${BIZ}', 'book.mine.test', now());
  `);
  if (migration) await db.exec(migration);
  return db;
}
const asMember = async (db, stmt) => {
  await db.exec("set role authenticated");
  try { await db.exec(stmt); return null; } catch (e) { return e.message; } finally { await db.exec("reset role"); }
};
const verifiedAt = async (db) => (await db.query(`select verified_at from public.business_domains where id = '${ROW}'`)).rows[0]?.verified_at ?? null;
const INSERT_STAMPED = `insert into public.business_domains (business_id, domain, verified_at) values ('${BIZ}', 'stolen.test', now())`;
const INSERT_PLAIN = `insert into public.business_domains (business_id, domain) values ('${BIZ}', 'plain.test')`;
const RENAME = `update public.business_domains set domain = 'somebody-else.test' where id = '${ROW}'`;
const STAMP = `update public.business_domains set verified_at = now() where id = '${ROW}'`;

t("1 · CANARY — before the migration, a member CAN insert a pre-verified row and rename a verified one (the holes this item names)", async () => {
  const db = await fresh(null);
  assert.equal(await asMember(db, INSERT_STAMPED), null, "the pre-verified insert should succeed on the old grants");
  assert.equal(await asMember(db, RENAME), null, "the rename should succeed on the old grants");
  assert.notEqual(await verifiedAt(db), null, "on the old schema the renamed row keeps its badge");
  await db.close();
});

t("2 · after it, a member's INSERT is refused — pre-verified or not", async () => {
  const db = await fresh();
  assert.match(String(await asMember(db, INSERT_STAMPED)), /permission denied/);
  assert.match(String(await asMember(db, INSERT_PLAIN)), /permission denied/);
  assert.equal((await db.query("select count(*)::int as n from public.business_domains")).rows[0].n, 1);
  await db.close();
});

t("3 · after it, a member cannot change domain or verified_at, and neither role holds INSERT or UPDATE", async () => {
  const db = await fresh();
  assert.match(String(await asMember(db, RENAME)), /permission denied/);
  assert.match(String(await asMember(db, STAMP)), /permission denied/);
  for (const role of ["anon", "authenticated"]) {
    for (const p of ["insert", "update"]) {
      assert.equal((await db.query(`select has_table_privilege('${role}', 'public.business_domains', '${p}') as h`)).rows[0].h, false, `${role} holds ${p}`);
    }
    for (const col of ["domain", "verified_at", "verification_token"]) {
      assert.equal((await db.query(`select has_column_privilege('${role}', 'public.business_domains', '${col}', 'update') as h`)).rows[0].h, false, `${role} may update ${col}`);
    }
  }
  assert.equal((await db.query(`select domain from public.business_domains where id = '${ROW}'`)).rows[0].domain, "book.mine.test");
  await db.close();
});

t("4 · a member can still REMOVE their own row (it can only lose a badge)", async () => {
  const db = await fresh();
  assert.equal(await asMember(db, `delete from public.business_domains where id = '${ROW}'`), null);
  assert.equal((await db.query("select count(*)::int as n from public.business_domains")).rows[0].n, 0);
  await db.close();
});

t("5 · renaming a verified row clears verified_at, even as the service role; a write that stamps the new host keeps it", async () => {
  const db = await fresh();
  assert.notEqual(await verifiedAt(db), null, "fixture row starts verified");
  await db.exec(RENAME);
  assert.equal(await verifiedAt(db), null, "a renamed row kept its badge");
  await db.exec(`update public.business_domains set domain = 'book.mine.test', verified_at = now() where id = '${ROW}'`);
  assert.notEqual(await verifiedAt(db), null, "verify-domain's own write (domain + verified_at together) was cleared");
  await db.exec(`update public.business_domains set created_at = created_at where id = '${ROW}'`);
  assert.notEqual(await verifiedAt(db), null, "an update that does not touch domain cleared the badge");
  await db.close();
});

// ── break it on purpose ──
const without = (re) => { const s = SQL.replace(re, ""); assert.notEqual(s, SQL, "the sabotage did not apply: " + re); return s; };

t("6 · SABOTAGE — each half removed brings its hole back", async () => {
  const noInsertRevoke = await fresh(without(/revoke insert on public\.business_domains from authenticated, anon;\n/));
  assert.equal(await asMember(noInsertRevoke, INSERT_STAMPED), null, "the pre-verified insert was still refused with the INSERT revoke removed");
  await noInsertRevoke.close();
  const noUpdateRevoke = await fresh(without(/revoke update on public\.business_domains from authenticated, anon;\n/));
  assert.equal(await asMember(noUpdateRevoke, RENAME), null, "the rename was still refused with the UPDATE revoke removed");
  await noUpdateRevoke.close();
  const noTrigger = await fresh(without(/create trigger business_domains_clear_verified_on_rename[\s\S]*?;\n/));
  await noTrigger.exec(RENAME);
  assert.notEqual(await verifiedAt(noTrigger), null, "the badge was still cleared with the trigger removed");
  await noTrigger.close();
});
