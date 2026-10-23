// ROADMAP 97.21 — UNSUBSCRIBING FROM MARKETING MUST NOT STOP APPOINTMENT REMINDERS.
//
//   PGLITE_DIR=<folder holding @electric-sql/pglite> PGLITE_REQUIRED=1 node --test tests/reminder-ignores-unsubscribe-sql.test.mjs
//   BREAK=keep-unsub   PGLITE_DIR=… node tests/reminder-ignores-unsubscribe-sql.test.mjs  # sabotage: the first reminder asks the opt-out again
//   BREAK=keep-unsub-2 PGLITE_DIR=… node tests/reminder-ignores-unsubscribe-sql.test.mjs  # sabotage: the second reminder asks the opt-out again
//   BREAK=drop-failed  PGLITE_DIR=… node tests/reminder-ignores-unsubscribe-sql.test.mjs  # sabotage: a bounced address is reminded too
//
// Same pattern as tests/campaign-share-sql.test.mjs: PGlite (Postgres in WebAssembly, in-process, no
// network, no account), because no DDL touches the live database. BREAK is an env var, not a flag
// (docs/gotchas.md 104).
//
// THE FIXTURE is a stand-in `bookings`, `businesses`, `business_settings` and `customers` carrying
// exactly the columns the two reminder functions read; then the REAL migration text is applied —
// 20260913020000 (the state before the fix) and then 97.21's own.
//
// THE FROZEN CLOCK: everything runs inside one transaction, so `now()` is the same instant for every
// query, and every booking is placed relative to it — "tomorrow at 10:00" in the business's own
// timezone, with the evening-before send time at 00:00 — so the answer cannot depend on the hour the
// run happens. A booking five days out is the control that the time gate is still live.
//
// CANARY, EVERY RUN: the same fixture on 20260913020000 alone, where the defect MUST reproduce — the
// unsubscribed customer's booking is NOT due, for either reminder.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { test } from "node:test";
import assert from "node:assert/strict";
import { writeReceipt } from "../scripts/receipt.mjs";

const DIR = "supabase/migrations";
const BEFORE = "20260913020000_customer_reminder_is_due_only_if_sendable.sql";
const MIGRATION = "20261017220000_reminders_ignore_marketing_opt_out.sql";
const BREAK = process.env.BREAK || "";
const read = (f) => readFileSync(path.join(DIR, f), "utf8").replace(/\r\n/g, "\n");
const SABOTAGE = {
  "keep-unsub": ["        and c.email_failed_at is null\n    end", "        and c.unsubscribed_at is null\n        and c.email_failed_at is null\n    end"],
  "keep-unsub-2": ["    and c.email_failed_at is null\n    and b.customer_reminder_2_sent_at", "    and c.unsubscribed_at is null\n    and c.email_failed_at is null\n    and b.customer_reminder_2_sent_at"],
  "drop-failed": [/\n\s+and c\.email_failed_at is null/g, ""],
};
let SQL = read(MIGRATION);
if (BREAK) {
  const s = SABOTAGE[BREAK];
  if (!s) throw new Error(`unknown BREAK=${BREAK}; known: ${Object.keys(SABOTAGE).join(", ")}`);
  const broken = SQL.replace(s[0], s[1]);
  // docs/gotchas.md 102: prove the sabotage LANDED, or its result means nothing.
  if (broken === SQL) throw new Error(`BREAK=${BREAK} did not match the migration text — the sabotage did not land`);
  SQL = broken;
}

let PGlite = null;
if (process.env.PGLITE_DIR) {
  try { ({ PGlite } = await import(pathToFileURL(path.join(process.env.PGLITE_DIR, "node_modules/@electric-sql/pglite/dist/index.js")).href)); }
  catch (e) { console.error(`PGLITE_DIR does not hold @electric-sql/pglite: ${e.message}`); }
}
const REQUIRED = process.env.PGLITE_REQUIRED === "1";
const MISSING = "NOT RUN — needs @electric-sql/pglite: `npm install @electric-sql/pglite` in a folder outside the repo, then PGLITE_DIR=<folder>";
if (!PGlite) console.error(`\n  ${MISSING}\n  (set PGLITE_REQUIRED=1 to make this a failure instead of a skip)\n`);

const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const BIZ = id(1);
const CU = id(11), CF = id(12), CN = id(13), CB = id(14); // unsubscribed, bounced, normal, both
const B = { BU: id(21), BF: id(22), BN: id(23), BX: id(24), BL: id(25), BB: id(26), SU: id(31), SF: id(32), SN: id(33) };
const NAME = Object.fromEntries(Object.entries(B).map(([k, v]) => [v, k]));
const TOMORROW = `(((now() at time zone 'America/Los_Angeles')::date + 1) + time '10:00') at time zone 'America/Los_Angeles'`;
const LATER = `(((now() at time zone 'America/Los_Angeles')::date + 5) + time '10:00') at time zone 'America/Los_Angeles'`;

const FIXTURE = `
create role anon; create role authenticated; create role service_role;
create table public.businesses (id uuid primary key, timezone text not null);
create table public.business_settings (
  business_id uuid primary key, email_customer_reminder boolean not null default true,
  evening_before_enabled boolean not null default true, evening_before_latest_start time not null default '12:00',
  evening_before_send_time time not null default '00:00', customer_reminder_lead_minutes integer not null default 1440,
  customer_reminder_2_enabled boolean not null default true, customer_reminder_2_lead_minutes integer not null default 2880);
create table public.customers (id uuid primary key, unsubscribed_at timestamptz, email_failed_at timestamptz);
create table public.bookings (
  id uuid primary key, business_id uuid not null, customer_id uuid, status text not null default 'confirmed',
  deleted_at timestamptz, start_at timestamptz not null, customer_email text,
  owner_reminder_sent_at timestamptz, customer_reminder_sent_at timestamptz, customer_reminder_2_sent_at timestamptz);
`;
const ROWS = `
insert into public.businesses values ('${BIZ}', 'America/Los_Angeles');
insert into public.business_settings (business_id) values ('${BIZ}');
insert into public.customers values ('${CU}', now(), null), ('${CF}', null, now()), ('${CN}', null, null), ('${CB}', now(), now());
insert into public.bookings (id, business_id, customer_id, start_at, customer_email, customer_reminder_sent_at) values
  ('${B.BU}', '${BIZ}', '${CU}', ${TOMORROW}, 'u@fixture.test', null),
  ('${B.BF}', '${BIZ}', '${CF}', ${TOMORROW}, 'f@fixture.test', null),
  ('${B.BN}', '${BIZ}', '${CN}', ${TOMORROW}, 'n@fixture.test', null),
  ('${B.BX}', '${BIZ}', null,    ${TOMORROW}, 'x@fixture.test', null),
  ('${B.BL}', '${BIZ}', '${CN}', ${LATER},    'n@fixture.test', null),
  ('${B.BB}', '${BIZ}', '${CB}', ${TOMORROW}, 'b@fixture.test', null),
  ('${B.SU}', '${BIZ}', '${CU}', ${TOMORROW}, 'u@fixture.test', now()),
  ('${B.SF}', '${BIZ}', '${CF}', ${TOMORROW}, 'f@fixture.test', now()),
  ('${B.SN}', '${BIZ}', '${CN}', ${TOMORROW}, 'n@fixture.test', now());
`;

async function fresh(withFix) {
  const db = new PGlite();
  await db.exec(FIXTURE);
  await db.exec(read(BEFORE));
  if (withFix) await db.exec(SQL);
  await db.exec("begin");           // THE FROZEN CLOCK: one transaction, one now()
  await db.exec(ROWS);
  return db;
}
const names = (rows) => rows.map((r) => NAME[r.id]).filter(Boolean).sort().join(",");
const first = async (db, target = "customer") => names((await db.query(`select id from public.get_bookings_due_for_reminder($1)`, [target])).rows);
const second = async (db) => names((await db.query(`select id from public.get_bookings_due_for_second_reminder()`)).rows);

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

test("97.21 · an unsubscribed customer is still reminded; a bounced one is not; nothing else moved", { skip: PGlite || REQUIRED ? false : MISSING }, async () => {
  assert.ok(PGlite, `PGLITE_REQUIRED=1 and ${MISSING}`);
  const started_at = new Date().toISOString();

  // ── CANARY: the defect, on 20260913020000 alone ────────────────────────────────────────────
  const old = await fresh(false);
  const oldFirst = await first(old), oldSecond = await second(old);
  const canaryCaught = !oldFirst.split(",").includes("BU") && !oldSecond.split(",").includes("SU") && oldFirst.includes("BN");
  check("canary: before 97.21, the unsubscribed customer's bookings were NOT due (either reminder)", canaryCaught, `first ${oldFirst} / second ${oldSecond}`);

  // ── 1. the first reminder ──────────────────────────────────────────────────────────────────
  const db = await fresh(true);
  const f = await first(db);
  check("1: the first reminder's due set is exactly BN, BU, BX", f === "BN,BU,BX", `got ${f}`);
  check("1: an unsubscribed customer with a booking tomorrow IS due", f.split(",").includes("BU"), `got ${f}`);
  check("1: a customer with email_failed_at set is NOT due", !f.split(",").includes("BF"), `got ${f}`);
  check("1: unsubscribed AND bounced is NOT due (the bounce still wins)", !f.split(",").includes("BB"), `got ${f}`);
  check("1: a booking with no customer row is still due", f.split(",").includes("BX"), `got ${f}`);
  check("1: a booking five days out is not due yet (the time gate is live)", !f.split(",").includes("BL"), `got ${f}`);

  // ── 2. the second reminder ─────────────────────────────────────────────────────────────────
  const s = await second(db);
  check("2: the second reminder's due set is exactly SN, SU", s === "SN,SU", `got ${s}`);
  check("2: an unsubscribed customer IS due the second reminder", s.split(",").includes("SU"), `got ${s}`);
  check("2: a bounced customer is NOT due the second reminder", !s.split(",").includes("SF"), `got ${s}`);

  // ── 3. the business switch still silences both ─────────────────────────────────────────────
  await db.exec("savepoint off; update public.business_settings set email_customer_reminder = false");
  const fOff = await first(db), sOff = await second(db);
  check("3: reminders switched off -> nothing is due, opt-out or not", fOff === "" && sOff === "", `first '${fOff}' / second '${sOff}'`);
  await db.exec("rollback to savepoint off");

  // ── 4. the owner branch is unchanged ───────────────────────────────────────────────────────
  const o = await first(db, "owner");
  check("4: the owner reminder still covers every unstamped booking due (bounced customer included)", o === "BB,BF,BN,BU,BX,SF,SN,SU", `got ${o}`);

  // ── 5. one function each, and only the server can call them ────────────────────────────────
  for (const [fn, sig] of [["get_bookings_due_for_reminder", "public.get_bookings_due_for_reminder(text)"], ["get_bookings_due_for_second_reminder", "public.get_bookings_due_for_second_reminder()"]]) {
    const n = (await db.query(`select count(*)::int n from pg_proc where proname = $1`, [fn])).rows[0].n;
    const g = (await db.query(`select has_function_privilege('anon', '${sig}', 'execute') a, has_function_privilege('authenticated', '${sig}', 'execute') u, has_function_privilege('service_role', '${sig}', 'execute') s`)).rows[0];
    check(`5: exactly one ${fn}, callable by service_role only`, n === 1 && !g.a && !g.u && g.s, `count ${n}, ${JSON.stringify(g)}`);
  }
  await db.exec("rollback");

  const ART = `artifacts/reminder-ignores-unsubscribe-sql/results${BREAK ? `.sabotage-${BREAK}` : ""}.txt`;
  mkdirSync(path.dirname(ART), { recursive: true });
  writeFileSync(ART, `break: ${BREAK || "none"}\n${log.join("\n")}\n`);

  const EXPECTED = 14;
  writeReceipt({
    check_id: "reminder-ignores-unsubscribe-sql",
    started_at,
    status: failures.length ? "fail" : "pass",
    expected_targets: 2,
    discovered_targets: 2,
    attempted_targets: 2,
    completed_targets: 2,
    skipped_targets: 0,
    assertions_executed: assertions,
    min_assertions: EXPECTED,
    failures,
    assertion_floor: "structural: a fixed list of checks over the two reminder functions",
    artifacts: [ART],
    canary: { id: "pre-97.21-opt-out-silences-reminders", observed_failure: canaryCaught },
    dimensions: { break: BREAK || undefined, migration: MIGRATION, first_due: f, second_due: s, owner_due: o, before_first_due: oldFirst, before_second_due: oldSecond },
  });
  assert.equal(assertions, EXPECTED, `ran ${assertions} assertions, expected ${EXPECTED}`);
  assert.deepEqual(failures, []);
});
