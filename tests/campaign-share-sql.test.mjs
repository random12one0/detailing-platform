// ROADMAP 97.19 — ONE TENANT'S CAMPAIGNS MUST NOT SPEND EVERY OTHER TENANT'S BOOKING EMAILS.
//
//   PGLITE_DIR=<folder holding @electric-sql/pglite> PGLITE_REQUIRED=1 node --test tests/campaign-share-sql.test.mjs
//   BREAK=no-share     PGLITE_DIR=… node tests/campaign-share-sql.test.mjs  # sabotage: a business's share is never compared
//   BREAK=one-pool     PGLITE_DIR=… node tests/campaign-share-sql.test.mjs  # sabotage: campaigns draw on the whole tenant pool again
//   BREAK=no-press-key PGLITE_DIR=… node tests/campaign-share-sql.test.mjs  # sabotage: the same press can be recorded twice
//   BREAK=no-support   PGLITE_DIR=… node tests/campaign-share-sql.test.mjs  # sabotage: campaign_presses skips the support-session refusal
//
// Same pattern as tests/support-sessions-sql.test.mjs: PGlite (Postgres in WebAssembly, in-process,
// no network, no account), because no DDL touches the live database. BREAK is an env var, not a flag:
// `node --test` swallows extra arguments (docs/gotchas.md 104).
//
// THE FIXTURE replays the REAL migrations that define the email budget, in order —
// 20260913030000 (the reserve and `claimed`), 20260913040000 (`refused`) and 97.19's own — on top
// of a stand-in `businesses`, `platform_settings` and `platform_email_days` carrying exactly the
// columns those three expect. Settings are the shipped defaults: cap 100, reserve 20, so the tenant
// pool is 80; campaign share 20 per business; booking headroom 40, so campaigns stop at 40 claimed.
//
// WHAT IT PROVES, one section per acceptance line of the item:
//   A. one business's campaign sends stop at its share while another business's confirmation claims
//   B. transactional mail is never refused while campaign mail still has allowance
//   C. the same press recorded twice is refused the second time (the SQL half of "sends once";
//      tests/campaign-press-once.test.mjs holds the send-campaign half, scripts/campaign-double-press.mjs
//      the browser half)
// WHAT IT DOES NOT: anything about the live database, or that send-email passes the right arguments
// (tests/campaign-press-once.test.mjs reads that from the source).
//
// CANARY, EVERY RUN: the same campaign storm is replayed on the PRE-97.19 migrations alone, and the
// original defect MUST reproduce there — business A's campaign takes more than its share and business
// B's confirmation is refused. If it does not, the green below is not about the fix.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { test } from "node:test";
import assert from "node:assert/strict";
import { writeReceipt } from "../scripts/receipt.mjs";

const DIR = "supabase/migrations";
const BEFORE = ["20260913030000_the_platform_keeps_its_own_headroom.sql", "20260913040000_a_refusal_is_not_a_provider_failure.sql"];
const MIGRATION = "20261017200000_campaigns_get_a_daily_share.sql";
const BREAK = process.env.BREAK || "";
const read = (f) => readFileSync(path.join(DIR, f), "utf8").replace(/\r\n/g, "\n");
const SABOTAGE = {
  "no-support": ["select public.refuse_support_writes('public.campaign_presses');", "select 1;"],
  "no-share": ["v_mine > coalesce(v_share, 0)", "false"],
  "one-pool": ["when v_campaign then greatest(v_cap - coalesce(v_reserve, 0) - coalesce(v_headroom, 0), 0)", "when v_campaign then greatest(v_cap - coalesce(v_reserve, 0), 0)"],
  "no-press-key": ["press_id    uuid not null,\n  pressed_at  timestamptz not null default now(),\n  primary key (business_id, press_id)", "press_id    uuid not null,\n  pressed_at  timestamptz not null default now()"],
};
let SQL = read(MIGRATION);
if (BREAK) {
  const s = SABOTAGE[BREAK];
  if (!s) throw new Error(`unknown BREAK=${BREAK}; known: ${Object.keys(SABOTAGE).join(", ")}`);
  // docs/gotchas.md 102: prove the sabotage LANDED, or its green means nothing.
  if (!SQL.includes(s[0])) throw new Error(`BREAK=${BREAK} did not match the migration text — the sabotage did not land`);
  SQL = SQL.replace(s[0], s[1]);
}

let PGlite = null;
if (process.env.PGLITE_DIR) {
  try { ({ PGlite } = await import(pathToFileURL(path.join(process.env.PGLITE_DIR, "node_modules/@electric-sql/pglite/dist/index.js")).href)); }
  catch (e) { console.error(`PGLITE_DIR does not hold @electric-sql/pglite: ${e.message}`); }
}
const REQUIRED = process.env.PGLITE_REQUIRED === "1";
const MISSING = "NOT RUN — needs @electric-sql/pglite: `npm install @electric-sql/pglite` in a folder outside the repo, then PGLITE_DIR=<folder>";
if (!PGlite) console.error(`\n  ${MISSING}\n  (set PGLITE_REQUIRED=1 to make this a failure instead of a skip)\n`);

const BIZ = ["a", "b", "c", "d", "e", "f"].map((x) => `${x.repeat(8)}-0000-0000-0000-000000000000`);
const [A, B] = BIZ;
const FIXTURE = `
create role anon; create role authenticated; create role service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
create table public.businesses (id uuid primary key, name text);
insert into public.businesses (id, name) values ${BIZ.map((id, i) => `('${id}', 'biz ${i}')`).join(", ")};
create table public.platform_settings (id boolean primary key default true, email_daily_cap integer not null default 100);
insert into public.platform_settings (id) values (true);
create table public.platform_email_days (day date primary key, sent integer not null default 0, failed integer not null default 0);
`;

// THE REAL refuse_support_writes (ROADMAP 4.3c), cut from its own migration so 97.19's calls run the
// production body. Only is_support_session() is a stand-in: it reads no session here.
const SUPPORT = (() => {
  const src = read("20261010030000_support_sessions_read_only.sql");
  const a = src.indexOf("create or replace function public.refuse_support_writes");
  const end = "revoke execute on function public.refuse_support_writes(regclass) from public, anon, authenticated;";
  const b = src.indexOf(end, a);
  if (a < 0 || b < 0) throw new Error("refuse_support_writes not found in 20261010030000 — the fixture cannot load it");
  return "create function public.is_support_session() returns boolean language sql stable as 'select false';\n"
    + src.slice(a, b + end.length);
})();

async function fresh(withFix) {
  const db = new PGlite();
  await db.exec(FIXTURE);
  await db.exec(SUPPORT);
  for (const f of BEFORE) await db.exec(read(f));
  if (withFix) await db.exec(SQL);
  return db;
}
const claimNew = async (db, biz, campaign) =>
  (await db.query(`select public.claim_email_send(false, $1::uuid, $2) ok`, [biz, campaign])).rows[0].ok;
const claimOld = async (db) => (await db.query(`select public.claim_email_send(false) ok`)).rows[0].ok;
const day = async (db) => (await db.query(`select claimed, refused, refused_platform from public.platform_email_days`)).rows[0] ?? { claimed: 0, refused: 0 };

let assertions = 0;
const failures = [];
const log = [];
const check = (name, cond, detail = "") => {
  assertions++;
  const line = `${cond ? "ok  " : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`;
  log.push(line);
  if (cond) console.log(`  ${line}`);
  else { failures.push(`${name} ${detail}`.trim()); console.error(`  ${line}`); }
};

test("97.19 · campaigns get a daily share, booking mail is claimed ahead of them, a press sends once", { skip: PGlite || REQUIRED ? false : MISSING }, async () => {
  assert.ok(PGlite, `PGLITE_REQUIRED=1 and ${MISSING}`);
  const started_at = new Date().toISOString();

  // ── CANARY: the original defect, on the migrations as they stood before 97.19 ──────────────
  // The old function has no business and no campaign argument, so every tenant send is the same
  // call. Business A's two presses of 50 are 100 calls; business B's confirmation comes after.
  const old = await fresh(false);
  let oldA = 0;
  for (let i = 0; i < 100; i++) if (await claimOld(old)) oldA++;
  const oldB = await claimOld(old);
  const canaryCaught = oldA > 20 && oldB === false;
  check("canary: before 97.19, A's campaign took more than 20 and B's confirmation was refused", canaryCaught, `A claimed ${oldA}, B ${oldB}`);

  // ── 0. applies cleanly, twice is harmless, the old one-argument call still answers ───────────
  const db = await fresh(true);
  await db.exec(SQL);
  const s = (await db.query(`select email_campaign_share s, email_booking_headroom h from public.platform_settings`)).rows[0];
  check("defaults: share 20, booking headroom 40", s.s === 20 && s.h === 40, JSON.stringify(s));
  const overloads = (await db.query(`select count(*)::int n from pg_proc where proname = 'claim_email_send'`)).rows[0].n;
  check("exactly one claim_email_send (the one-argument overload is gone)", overloads === 1, `found ${overloads}`);
  check("an old one-argument call (pre-97.19 send-email) still claims", await claimOld(db) === true);
  check("platform mail still claims", (await db.query(`select public.claim_email_send(true) ok`)).rows[0].ok === true);
  check("a campaign with no business is refused", await claimNew(db, null, true) === false);
  await db.exec(`truncate public.platform_email_days; truncate public.email_campaign_days;`);

  // ── A. A's campaign stops at its share; B's confirmation still claims ────────────────────────
  let aSent = 0, aRefused = 0;
  for (let i = 0; i < 100; i++) { if (await claimNew(db, A, true)) aSent++; else aRefused++; }
  check("A: business A's campaign claimed exactly its share of 20", aSent === 20, `claimed ${aSent}, refused ${aRefused}`);
  check("A: business B's confirmation still claims after A's 100 presses", await claimNew(db, B, false) === true);
  check("A: business B's own campaign still claims (A's share is A's)", await claimNew(db, B, true) === true);
  const dA = await day(db);
  check("A: refusals are counted in `refused`, and the refused claims were given back", dA.claimed === 22 && dA.refused === 80, JSON.stringify(dA));

  // ── B. transactional is never refused while campaign mail still has allowance ────────────────
  // B1. Every business sends campaigns until each is refused. Together they stop at 40 (80 - 40
  // headroom), never at 6 x 20 = 120 and never at the tenant pool of 80.
  await db.exec(`truncate public.platform_email_days; truncate public.email_campaign_days;`);
  let campaignTotal = 0;
  for (const biz of BIZ) for (let i = 0; i < 30; i++) if (await claimNew(db, biz, true)) campaignTotal++;
  check("B1: all campaigns together stop at 40, leaving 40 that only booking mail may spend", campaignTotal === 40, `claimed ${campaignTotal}`);
  let txAfter = 0;
  for (let i = 0; i < 60; i++) if (await claimNew(db, BIZ[i % BIZ.length], false)) txAfter++;
  check("B1: booking mail then claims the remaining 40 of the tenant pool", txAfter === 40, `claimed ${txAfter}`);

  // B2. An interleaved day: at every transactional refusal, a campaign from a business that has
  // sent nothing yet must ALSO be refused. A violation is a booking email turned away while some
  // campaign could still have gone.
  await db.exec(`truncate public.platform_email_days; truncate public.email_campaign_days;`);
  let txRefusals = 0, violations = 0, probes = 0;
  let seed = 9719;
  const rnd = () => (seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31;
  for (let i = 0; i < 300; i++) {
    const biz = BIZ[Math.floor(rnd() * 5)]; // businesses a..e; f stays fresh for the probe
    const campaign = rnd() < 0.6;
    const ok = await claimNew(db, biz, campaign);
    if (!campaign && !ok) {
      txRefusals++;
      probes++;
      await db.exec("begin");
      if (await claimNew(db, BIZ[5], true)) violations++;
      await db.exec("rollback");
    }
  }
  check("B2: the interleaved day reached at least one booking refusal (discovery floor)", txRefusals >= 1, `${txRefusals} booking refusals`);
  check("B2: no booking email was refused while a campaign still had allowance", violations === 0, `${violations} of ${probes} probes`);

  // ── C. a press is recorded once ─────────────────────────────────────────────────────────────
  const PRESS = "99999999-9999-9999-9999-999999999999";
  const first = await db.query(`insert into public.campaign_presses (business_id, press_id) values ($1, $2) on conflict do nothing returning press_id`, [A, PRESS]);
  const second = await db.query(`insert into public.campaign_presses (business_id, press_id) values ($1, $2) on conflict do nothing returning press_id`, [A, PRESS]);
  check("C: the first arrival of a press is recorded", first.rows.length === 1);
  check("C: the second arrival of the same press is refused", second.rows.length === 0, `${second.rows.length} rows`);
  const other = await db.query(`insert into public.campaign_presses (business_id, press_id) values ($1, gen_random_uuid()) on conflict do nothing returning press_id`, [A]);
  check("C: a NEW press from the same business is recorded", other.rows.length === 1);

  // ── D. nothing a browser holds can touch the new tables or the function ──────────────────────
  for (const t of ["email_campaign_days", "campaign_presses"]) {
    const g = (await db.query(`select has_table_privilege('authenticated', 'public.${t}', 'insert') i, has_table_privilege('anon', 'public.${t}', 'select') s`)).rows[0];
    check(`D: ${t} grants nothing to anon or authenticated`, !g.i && !g.s, JSON.stringify(g));
  }
  const fx = (await db.query(`select has_function_privilege('authenticated', 'public.claim_email_send(boolean, uuid, boolean)', 'execute') a`)).rows[0].a;
  check("D: authenticated cannot call claim_email_send", fx === false);
  for (const t of ["email_campaign_days", "campaign_presses"]) {
    const n = (await db.query(`select count(*)::int n from pg_policies where tablename = $1 and policyname like 'support_read_only_%' and permissive = 'RESTRICTIVE'`, [t])).rows[0].n;
    check(`D: ${t} refuses writes from a read-only support session (4.3c)`, n === 3, `${n} of 3 restrictive rules`);
  }

  const ART = `artifacts/campaign-share-sql/results${BREAK ? `.sabotage-${BREAK}` : ""}.txt`;
  mkdirSync(path.dirname(ART), { recursive: true });
  writeFileSync(ART, `break: ${BREAK || "none"}\n${log.join("\n")}\n`);

  const EXPECTED = 22;
  writeReceipt({
    check_id: "campaign-share-sql",
    started_at,
    status: failures.length ? "fail" : "pass",
    expected_targets: 3,
    discovered_targets: 3,
    attempted_targets: 3,
    completed_targets: 3,
    skipped_targets: 0,
    assertions_executed: assertions,
    min_assertions: EXPECTED,
    failures,
    assertion_floor: "structural: a fixed list of checks over fixed scenarios A, B and C",
    artifacts: [ART],
    canary: { id: "pre-97.19-one-pool", observed_failure: canaryCaught },
    dimensions: { break: BREAK || undefined, migration: MIGRATION, a_campaign_claimed: aSent, all_campaigns_claimed: campaignTotal, booking_after_campaigns: txAfter, interleaved_booking_refusals: txRefusals, violations },
  });
  assert.equal(assertions, EXPECTED, `ran ${assertions} assertions, expected ${EXPECTED}`);
  assert.deepEqual(failures, []);
});
