// ROADMAP 97.22 — MOVING A BOOKING MUST RE-ARM EVERY REMINDER, INCLUDING THE TWO ADDED AFTER THE TRIGGER.
//
//   PGLITE_DIR=<folder holding @electric-sql/pglite> PGLITE_REQUIRED=1 node --test tests/reminder-reset-markers-sql.test.mjs
//   BREAK=drop-cu2         PGLITE_DIR=… node tests/reminder-reset-markers-sql.test.mjs  # sabotage: a move leaves the second reminder stamped
//   BREAK=drop-req         PGLITE_DIR=… node tests/reminder-reset-markers-sql.test.mjs  # sabotage: a move leaves the request nudge stamped
//   BREAK=add-content-cu2  PGLITE_DIR=… node tests/reminder-reset-markers-sql.test.mjs  # sabotage: a name change re-arms the second reminder (a duplicate email)
//
// Same pattern as tests/reminder-ignores-unsubscribe-sql.test.mjs: PGlite (Postgres in WebAssembly,
// in-process, no network, no account), because no DDL touches the live database. BREAK is an env var,
// not a flag (docs/gotchas.md 104).
//
// THE FIXTURE is a stand-in `bookings` carrying exactly the columns the trigger reads and writes; then
// the REAL migration text is applied — 20260829000100 (the trigger and its first body) and then 97.22's.
// Every row starts with all seven markers stamped; each scenario is one UPDATE, and the markers that
// come back null are the answer.
//
// CANARY, EVERY RUN: the same fixture on 20260829000100 alone, where the defect MUST reproduce — a moved
// booking keeps customer_reminder_2_sent_at and owner_request_nudge_sent_at.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { test } from "node:test";
import assert from "node:assert/strict";
import { writeReceipt } from "../scripts/receipt.mjs";

const DIR = "supabase/migrations";
const BEFORE = "20260829000100_reminder_marker_reset.sql";
const MIGRATION = "20261017230000_reminder_reset_covers_every_marker.sql";
const BREAK = process.env.BREAK || "";
const read = (f) => readFileSync(path.join(DIR, f), "utf8").replace(/\r\n/g, "\n");
const SABOTAGE = {
  "drop-cu2": ["    new.customer_reminder_2_sent_at     := null;\n", ""],
  "drop-req": ["    new.owner_request_nudge_sent_at     := null;\n", ""],
  "add-content-cu2": ["    new.customer_reminder_sent_at := null;\n  end if;", "    new.customer_reminder_sent_at := null;\n    new.customer_reminder_2_sent_at := null;\n  end if;"],
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

const MARKERS = {
  owner_reminder_sent_at: "own", customer_reminder_sent_at: "cus", customer_reminder_2_sent_at: "cu2",
  owner_nudge_sent_at: "nud", owner_wrapup_nudge_sent_at: "wra", owner_finalize_nudge_sent_at: "fin",
  owner_request_nudge_sent_at: "req",
};
const COLS = Object.keys(MARKERS);
const FIXTURE = `
create table public.bookings (
  id int primary key, status text not null default 'confirmed', notes text,
  start_at timestamptz not null default '2026-11-02 18:00+00', end_at timestamptz not null default '2026-11-02 20:00+00',
  customer_name text default 'Pat', customer_phone text, customer_email text, customer_address text,
  service_type text, vehicle_size text, vehicle_model text, total_price numeric, final_amount numeric,
  ${COLS.map((c) => `${c} timestamptz default now()`).join(", ")});
`;
// One row per scenario, all seven markers stamped.
const SCENARIOS = {
  move_start: "start_at = start_at + interval '1 day', end_at = end_at + interval '1 day'",
  move_end: "end_at = end_at + interval '30 minutes'",
  rename: "customer_name = 'Sam'",
  reprice: "total_price = 199",
  status: "status = 'completed'",
  notes: "notes = 'gate code 1234'",
};
const ALL = COLS.map((c) => MARKERS[c]).join(",");
const EXPECT = {
  move_start: ALL,
  move_end: ALL,
  // Same time: only what 20260829000100 already cleared. The second reminder is NOT re-armed: its
  // marker is only stamped inside its window, so clearing it would mail the customer twice.
  rename: "own,cus",
  reprice: "own,cus",
  status: "",
  notes: "",
};

async function fresh(withFix) {
  const db = new PGlite();
  await db.exec(FIXTURE);
  await db.exec(read(BEFORE));
  if (withFix) await db.exec(SQL);
  await db.exec(`insert into public.bookings (id) select generate_series(1, ${Object.keys(SCENARIOS).length})`);
  return db;
}
// Which markers the scenario's UPDATE left null, in MARKERS order.
async function cleared(db) {
  const out = {};
  const names = Object.keys(SCENARIOS);
  for (const [i, name] of names.entries()) {
    const r = (await db.query(`update public.bookings set ${SCENARIOS[name]} where id = ${i + 1} returning ${COLS.join(", ")}`)).rows[0];
    out[name] = COLS.filter((c) => r[c] === null).map((c) => MARKERS[c]).join(",");
  }
  return out;
}

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

test("97.22 · moving a booking clears all seven reminder markers; a detail change still clears only the first reminder pair; nothing else moved", { skip: PGlite || REQUIRED ? false : MISSING }, async () => {
  assert.ok(PGlite, `PGLITE_REQUIRED=1 and ${MISSING}`);
  const started_at = new Date().toISOString();

  // ── CANARY: the defect, on 20260829000100 alone ────────────────────────────────────────────
  const old = await cleared(await fresh(false));
  const canaryCaught = old.move_start === "own,cus,nud,wra,fin";
  check("canary: before 97.22, a moved booking kept cu2 and req stamped (only the original five cleared)", canaryCaught, `cleared ${old.move_start}`);

  // ── 1..6: one scenario each ────────────────────────────────────────────────────────────────
  const now = await cleared(await fresh(true));
  for (const name of Object.keys(SCENARIOS)) {
    check(`${name}: clears exactly [${EXPECT[name]}]`, now[name] === EXPECT[name], `cleared [${now[name]}]`);
  }

  // ── 7: still exactly one trigger, bound to this function ───────────────────────────────────
  const db = await fresh(true);
  const t = (await db.query(`select count(*)::int n from pg_trigger where tgname = 'reset_reminder_markers_on_edit' and tgrelid = 'public.bookings'::regclass`)).rows[0].n;
  check("7: exactly one reset_reminder_markers_on_edit trigger on bookings", t === 1, `count ${t}`);

  const ART = `artifacts/reminder-reset-markers-sql/results${BREAK ? `.sabotage-${BREAK}` : ""}.txt`;
  mkdirSync(path.dirname(ART), { recursive: true });
  writeFileSync(ART, `break: ${BREAK || "none"}\n${log.join("\n")}\n`);

  const EXPECTED = 8;
  const N = Object.keys(SCENARIOS).length;
  writeReceipt({
    check_id: "reminder-reset-markers-sql",
    started_at,
    status: failures.length ? "fail" : "pass",
    expected_targets: N,
    discovered_targets: N,
    attempted_targets: N,
    completed_targets: N,
    skipped_targets: 0,
    assertions_executed: assertions,
    min_assertions: EXPECTED,
    failures,
    assertion_floor: "structural: one UPDATE per scenario over seven stamped markers, plus the trigger count",
    artifacts: [ART],
    canary: { id: "pre-97.22-move-keeps-cu2-and-req", observed_failure: canaryCaught },
    dimensions: { break: BREAK || undefined, migration: MIGRATION, cleared: now, before_cleared: old },
  });
  assert.equal(assertions, EXPECTED, `ran ${assertions} assertions, expected ${EXPECTED}`);
  assert.deepEqual(failures, []);
});
