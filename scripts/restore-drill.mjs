// THE RESTORE DRILL — ROADMAP 6.1, and the one item on this roadmap nobody
// can fake: either the data comes back or it does not.
//
//   set -a; . ./.env; set +a
//   node scripts/restore-drill.mjs
//   node scripts/receipt.mjs receipts/restore-drill.json
//
// ---------------------------------------------------------------------------
// THE SENTENCE THIS EXISTS TO DELETE
// ---------------------------------------------------------------------------
// **Nobody knows whether this database can be restored, and the roadmap
// records that as an absence rather than as a measurement.** 6.1 says "no
// restore test, restore date, recovery target or outage history exists", which
// is a true statement about paperwork and says nothing about the data. Turning
// that absence into a date and a result — **even a bad result** — is the whole
// value here.
//
// ---------------------------------------------------------------------------
// WHAT THE PLATFORM ITSELF PROVIDES, MEASURED FIRST
// ---------------------------------------------------------------------------
// Section 1 reads the posture rather than assuming it, because the answer
// decides whether a drill of Supabase's own backups is even possible. On
// 2026-09-20 it was not: the organisation is on the **free** plan,
// `pitr_enabled` is **false**, and the backup list is **empty**. WAL archiving
// IS running — 8,399 segments, zero failures — but that is Supabase's own
// infrastructure, not a restore point a customer can reach.
//
// **SO THERE IS NOTHING OF THEIRS TO DRILL.** That is the finding, and this
// script prints it every run rather than letting it become folklore.
//
// ---------------------------------------------------------------------------
// WHAT IS DRILLED INSTEAD, AND WHAT THAT IS AND IS NOT WORTH
// ---------------------------------------------------------------------------
// A logical round trip that a person could actually perform today:
//
//   export every table in `public` to a FILE  ->  restore it into a
//   throwaway schema FROM THAT FILE  ->  compare every row back
//
// **IT PROVES:** the business's records can be taken out, written down, put
// back, and come back byte-identical — and it produces the artifact and the
// date 6.1 asks for.
//
// **IT DOES NOT PROVE** that Supabase's backups work, because there are none
// to test. It also does not cover two things a real disaster would need, and
// both are named in the procedure rather than quietly omitted:
//   * **`auth.users` is not in `public`.** 44 logins live in the `auth` schema.
//     A copy of `public` restores the business and not the ability to sign in.
//   * **Storage FILES are not in the database.** 146 objects; the rows are in
//     `storage.objects`, the bytes are in object storage.
//
// ---------------------------------------------------------------------------
// THE CANARY — THE VERIFIER MUST BE SHOWN ABLE TO SEE A BAD RESTORE
// ---------------------------------------------------------------------------
// "Every table matched" is exactly what a comparison that is looking at the
// wrong thing also says. So after the intact restore is verified, **one row in
// the restored copy is deliberately altered and the comparison is run again.**
// It must fail, and it must name that table. If it does not, the drill proved
// nothing and the receipt refuses the run.
//
// ---------------------------------------------------------------------------
// WHAT IT WRITES
// ---------------------------------------------------------------------------
// One schema, `restore_drill`, in the platform's own database
// (`kguqylyzgyzfktkfnhjb`), created and dropped inside the run. **No existing
// table is read-modified or written.** The export lands in
// `artifacts/restore-drill/` as a real file somebody could keep.

import { mkdirSync, writeFileSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { writeReceipt } from "./receipt.mjs";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const started_at = new Date().toISOString();
const BREAK = (process.argv.find((a) => a.startsWith("--break=")) || "").split("=")[1] || "";
const KEEP = process.argv.includes("--keep");

const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const REF = process.env.SUPABASE_PROJECT_REF;
if (!TOKEN || !REF) {
  console.error("SKIPPED — needs SUPABASE_ACCESS_TOKEN and SUPABASE_PROJECT_REF.");
  console.error("          Nothing was measured. Run: set -a; . ./.env; set +a");
  process.exit(1);
}
// This script CREATES AND DROPS A SCHEMA. CLAUDE.md § Hard rules: stop on any
// project that is not the platform's own, so the allowed ref is named in the
// file that does the writing.
const ALLOWED = "kguqylyzgyzfktkfnhjb";
if (REF !== ALLOWED) {
  console.error(`REFUSING — this creates a schema and ${REF} is not ${ALLOWED}.`);
  process.exit(2);
}

const api = async (p) => {
  const r = await fetch(`https://api.supabase.com/v1${p}`, {
    headers: { Authorization: `Bearer ${TOKEN}` },
  });
  if (!r.ok) throw new Error(`${p}: ${r.status}`);
  return r.json();
};
const sql = async (text) => {
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query: text }),
  });
  const t = await r.text();
  if (!r.ok) throw new Error(`${r.status} ${t.slice(0, 400)}`);
  return t ? JSON.parse(t) : [];
};

const failures = [];
const warnings = [];
const rows = [];
let assertions = 0;

// **THE EXPECTATION IS DECLARED HERE, NOT PRODUCED BY THE RUN - 2026-09-21,
// docs/silences.md section B.** Until today all four target counts were
// `rows.length`, the number of STAGES this script happened to finish: a drill
// over the whole `public` schema declaring it had **2 targets**, and four
// copies of one variable, so the receipt's rule that they must AGREE could
// never fire. The targets of a restore drill are the TABLES it round-trips.
//
// 52 was MEASURED once, on 2026-09-21, by listing `public` on
// `kguqylyzgyzfktkfnhjb` - and that single measurement is this number's one
// weakness, so it is written down rather than hidden. From here it is a
// CONSTANT: the live count is measured every run and judged against this, and
// a migration that adds or drops a table makes the two disagree and fails the
// receipt until a person re-derives it. Same shape as W16's stated bound in
// `sweep-booking-steps.mjs` - measured subject, declared bound.
//
// **MOVING THIS NUMBER TO MAKE A RUN PASS IS THE FAILURE THIS FILE EXISTS TO
// CATCH.** Move it because a migration changed the schema, and say which.
const EXPECTED_TABLES = 52;
let discovered = 0;
let attempted = 0;
let completed = 0;
const say = (m) => failures.push(m);

const SCHEMA = "restore_drill";
let schemaMade = false;
const canaryDetectors = [];
let posture = {};

/** A content fingerprint of one table: row count plus an order-independent
 *  hash of every row's JSON. Two tables match only if every value matches. */
const fingerprint = async (schema, table) => {
  const r = await sql(`select count(*)::int as n,
      coalesce(md5(string_agg(h, '' order by h)), '') as h
    from (select md5(to_jsonb(t)::text) as h from ${schema}.${table} t) s`);
  return { n: r[0]?.n ?? 0, h: r[0]?.h ?? "" };
};

try {
  // -------------------------------------------------------------------------
  console.log("1 · what does the platform actually give us?");
  const org = await api(`/organizations`);
  const orgSlug = org[0]?.slug;
  const orgInfo = orgSlug ? await api(`/organizations/${orgSlug}`) : {};
  const bk = await api(`/projects/${REF}/database/backups`);
  const arch = (await sql(`select archived_count, last_archived_time, failed_count from pg_stat_archiver`))[0] ?? {};

  posture = {
    plan: orgInfo.plan ?? "unknown",
    pitr_enabled: bk.pitr_enabled === true,
    listed_backups: Array.isArray(bk.backups) ? bk.backups.length : 0,
    walg_enabled: bk.walg_enabled === true,
    wal_archived_count: Number(arch.archived_count ?? 0),
    wal_last_archived: arch.last_archived_time ?? null,
    wal_failed_count: Number(arch.failed_count ?? 0),
  };
  console.log(`    plan                 ${posture.plan}`);
  console.log(`    point-in-time recovery ${posture.pitr_enabled ? "ON" : "OFF"}`);
  console.log(`    restorable backups listed ${posture.listed_backups}`);
  console.log(`    WAL archiving        ${posture.walg_enabled ? "on" : "off"}, `
    + `${posture.wal_archived_count} segments, ${posture.wal_failed_count} failures, `
    + `last ${posture.wal_last_archived}`);

  // **THE FINDING, STATED EVERY RUN.** Not a warning that scrolls past — a
  // failure, because a product with no restore point is not a healthy one and
  // this check exists to say so until it is fixed.
  assertions++;
  if (posture.listed_backups === 0 && !posture.pitr_enabled) {
    say(`THERE IS NO RESTORE POINT A CUSTOMER CAN REACH. Plan is "${posture.plan}", `
      + `point-in-time recovery is off and the backup list is empty. WAL archiving is `
      + `running (${posture.wal_archived_count} segments, ${posture.wal_failed_count} failures) `
      + `but that is Supabase's own infrastructure, not something Andrew can restore from. `
      + `If this database were lost right now, nothing the platform holds would bring it back.`);
  }

  // -------------------------------------------------------------------------
  console.log("\n2 · export — every table in public, to a file");
  const tables = (await sql(`
    select c.relname as t from pg_class c join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relkind = 'r' order by 1`)).map((r) => r.t);
  assertions++;
  // **THE SABOTAGE THAT PROVES THE EXPECTATION IS A FLOOR AND NOT A MIRROR.**
  // `--break=fewer` hides one table from the walk. If the declared count were
  // still produced by the run, this would pass silently with one table never
  // restored and never compared - which is exactly what the old
  // `expected = rows.length` did. It must now fail and name the gap.
  if (BREAK === "fewer") tables.pop();
  // `--break=none` proves the other half: that the outcome which proves NOTHING
  // now leaves a receipt behind to grade, instead of throwing past writeReceipt.
  if (BREAK === "none") tables.length = 0;
  discovered = tables.length;
  // **ZERO DISCOVERED IS A FAILURE, AND IT USED TO BE A CRASH.** `throw` here
  // skipped `writeReceipt` entirely, so the one outcome that proves nothing at
  // all left NO receipt to grade - an ungraded crash reads, to anyone looking
  // at the receipts directory, exactly like a run that never happened.
  if (!tables.length) {
    say("ZERO TABLES were discovered in `public`. Nothing was exported, nothing was "
      + "restored and nothing was proved. This is NOT a clean drill.");
  }
  // The live count is judged against the number declared at the top, so a
  // schema that gained or lost a table cannot pass quietly.
  if (tables.length && tables.length !== EXPECTED_TABLES) {
    say(`TABLE COUNT MOVED: \`public\` holds ${tables.length} table(s), `
      + `EXPECTED_TABLES declares ${EXPECTED_TABLES}. Either a migration changed the `
      + `schema - re-derive the constant and say which migration - or something is missing.`);
  }
  if (!tables.length) throw new Error("no tables");

  // **THE FINGERPRINT IS TAKEN AT EXPORT TIME, IN THE SAME BREATH AS THE ROWS
  // — AND THE FIRST VERSION TOOK IT AT VERIFY TIME.** That version reported
  // `bookings` and `job_heartbeats` as FAILED RESTORES, with matching row
  // counts and different content. They had not failed: `job_heartbeats` is
  // written by the cron sweeps every fifteen minutes, so the live table moved
  // between the export and the comparison. **A restore drill that compares the
  // restored copy against the LIVE source is comparing against a moving
  // target**, and it reports somebody else's write as data loss — which is the
  // most alarming possible way to be wrong.
  //
  // What was restored is the FILE. So the file is what it is checked against.
  const dump = {};
  const atExport = {};
  let total = 0;
  for (const t of tables) {
    const r = await sql(`select coalesce(json_agg(x), '[]'::json)::text as j,
        (select coalesce(md5(string_agg(h, '' order by h)), '')
           from (select md5(to_jsonb(y)::text) as h from public.${t} y) z) as fp
      from (select * from public.${t}) x`);
    const arr = JSON.parse(r[0]?.j ?? "[]");
    dump[t] = arr;
    atExport[t] = { n: arr.length, h: r[0]?.fp ?? "" };
    total += arr.length;
  }
  mkdirSync(path.join(ROOT, "artifacts", "restore-drill"), { recursive: true });
  const art = "artifacts/restore-drill/public-export.json";
  writeFileSync(path.join(ROOT, art), JSON.stringify(dump, null, 1), "utf8");
  const bytes = statSync(path.join(ROOT, art)).size;
  console.log(`    ${tables.length} tables, ${total} rows -> ${art} (${(bytes / 1024).toFixed(0)} kB)`);
  assertions++;
  if (total === 0) say("the export contains zero rows, so the restore below would compare nothing");

  // -------------------------------------------------------------------------
  console.log("\n3 · restore — from the file, into a throwaway schema");
  // **FROM THE FILE, NOT FROM THE DATABASE.** Copying table to table inside one
  // database would prove that Postgres can copy a table. The claim being
  // tested is that the written-down artifact is sufficient to rebuild the
  // business, so the file is re-read from disk and the rows come out of it.
  const onDisk = JSON.parse(readFileSync(path.join(ROOT, art), "utf8"));
  await sql(`drop schema if exists ${SCHEMA} cascade`);
  await sql(`create schema ${SCHEMA}`);
  schemaMade = true;

  let restored = 0;
  attempted = tables.length;
  const failedTables = [];
  for (const t of tables) {
    // `LIKE ... INCLUDING ALL` copies columns, types, defaults and checks —
    // and deliberately NOT foreign keys, which is what makes the restore
    // order-independent. A real recovery would rebuild them from the
    // migrations; this is testing the DATA, not the constraint graph.
    await sql(`create table ${SCHEMA}.${t} (like public.${t} including defaults including constraints)`);
    const arr = onDisk[t] ?? [];
    if (!arr.length) continue;
    for (let i = 0; i < arr.length; i += 200) {
      const chunk = arr.slice(i, i + 200);
      const tag = `rd${Date.now()}${i}`;
      try {
        await sql(`insert into ${SCHEMA}.${t}
          select * from json_populate_recordset(null::${SCHEMA}.${t}, $${tag}$${JSON.stringify(chunk)}$${tag}$)`);
      } catch (e) {
        failedTables.push(`${t}: ${String(e.message).slice(0, 120)}`);
        break;
      }
    }
    restored += arr.length;
  }
  console.log(`    restored ${restored} rows into ${SCHEMA}`
    + (failedTables.length ? `; ${failedTables.length} table(s) would not load` : ""));
  for (const f of failedTables) say(`restore: ${f}`);

  // -------------------------------------------------------------------------
  console.log("\n4 · verify — every row, compared back");
  const mismatches = [];
  const drifted = [];
  for (const t of tables) {
    const want = atExport[t];
    const got = await fingerprint(SCHEMA, t);
    assertions++;
    // COMPLETED counts the tables actually compared back, so a verify loop that
    // stops early can no longer report the same number as one that finished.
    completed++;
    if (want.n !== got.n || want.h !== got.h) {
      mismatches.push(`${t}: exported ${want.n} rows/${want.h.slice(0, 8)}, `
        + `restored ${got.n}/${got.h.slice(0, 8)}`);
    }
    // **DRIFT IS INFORMATION, NOT A FAILURE.** A live table that moved during
    // the run says nothing about whether the restore worked, and conflating
    // the two is what produced the false data-loss report. It is still worth
    // printing: a recovery procedure written against a moving database needs
    // to know which tables move.
    const live = await fingerprint("public", t);
    if (live.h !== want.h) drifted.push(`${t} (${want.n} -> ${live.n} rows)`);
  }
  for (const m of mismatches) say(`restore mismatch — ${m}`);
  if (drifted.length) {
    warnings.push(`these tables changed in the live database DURING the drill, which is normal `
      + `on a running system and is NOT a restore failure: ${drifted.join(", ")}`);
    console.log(`    (live drift during the run, not a failure: ${drifted.join(", ")})`);
  }
  rows.push({ what: "intact restore", verdict: mismatches.length ? "MISMATCH" : "every table matched",
    detail: `${tables.length} tables, ${total} rows` });
  console.log(`    ${mismatches.length === 0 ? `all ${tables.length} tables matched, ${total} rows` : `${mismatches.length} MISMATCH`}`);

  // -------------------------------------------------------------------------
  console.log("\n5 · the canary — break one row and the comparison must see it");
  // Pick the biggest table that actually has rows, so the alteration lands
  // somewhere the comparison is definitely looking.
  const victim = tables.filter((t) => (onDisk[t] ?? []).length > 0)
    .sort((x, y) => (onDisk[y].length - onDisk[x].length))[0];
  assertions++;
  if (!victim) {
    say("no restored table had any rows, so the canary could not be planted and the "
      + "verification above compared nothing");
  } else {
    const col = (await sql(`select a.attname from pg_attribute a
        join pg_class c on c.oid = a.attrelid join pg_namespace n on n.oid = c.relnamespace
       where n.nspname = '${SCHEMA}' and c.relname = '${victim}'
         and a.attnum > 0 and not a.attisdropped
         and format_type(a.atttypid, null) in ('text','character varying')
       limit 1`))[0]?.attname;
    if (!col) {
      warnings.push(`canary: ${victim} has no text column to alter; the negative control was not planted`);
      say(`the canary could not be planted in ${victim} — no text column — so this run did not `
        + `demonstrate that the comparison can see a bad restore`);
    } else {
      const before = await fingerprint(SCHEMA, victim);
      if (BREAK !== "canary") {
        await sql(`update ${SCHEMA}.${victim} set ${col} = coalesce(${col}, '') || '-DRILL-CANARY'
                    where ctid = (select ctid from ${SCHEMA}.${victim} limit 1)`);
      }
      const after = await fingerprint(SCHEMA, victim);
      const src = atExport[victim];
      assertions++;
      const caught = after.h !== src.h;
      if (caught) canaryDetectors.push("row-compare");
      rows.push({ what: `canary · one row altered in ${victim}.${col}`,
        verdict: caught ? "caught (canary)" : "MISSED (canary)",
        detail: `${before.h.slice(0, 8)} -> ${after.h.slice(0, 8)}, source ${src.h.slice(0, 8)}` });
      console.log(`    altered one row of ${victim}.${col} — `
        + (caught ? "the comparison caught it" : "THE COMPARISON DID NOT SEE IT"));
    }
  }

} catch (e) {
  // **A CRASH USED TO LEAVE NO RECEIPT AT ALL.** The only `try` here had a
  // `finally` and no `catch`, so any throw - including the deliberate one for
  // zero tables - killed the process before `writeReceipt`, and the outcome
  // that proves least left nothing behind to grade. Now it is recorded and the
  // receipt is still written, with the counts as far as the run actually got.
  say(`THE DRILL DID NOT FINISH: ${e.message}. The counts below are how far it got, `
    + `not a result.`);
} finally {
  if (schemaMade && !KEEP) {
    await sql(`drop schema if exists ${SCHEMA} cascade`).catch((e) =>
      say("could not drop the drill schema: " + e.message));
  }
}

// ---------------------------------------------------------------------------

const canary = {
  id: "one row altered in the restored copy · the row comparison must see it",
  observed_failure: canaryDetectors.includes("row-compare"),
  caught_by: canaryDetectors,
  findings: canaryDetectors.includes("row-compare")
    ? ["[row-compare] altering a single text value in one restored row changed that table's "
      + "fingerprint, so 'every table matched' above is a comparison that can fail"]
    : ["[row-compare] NOT CAUGHT — the comparison did not notice an altered row, so it cannot "
      + "tell a good restore from a bad one and every match above is void"],
};

const status = failures.length === 0 && canary.observed_failure ? "pass" : "fail";
const { path: receiptPath } = writeReceipt({
  check_id: "restore-drill",
  started_at,
  status,
  // Four numbers from four different places, so they can disagree - which is
  // the whole point of the receipt rule that they must agree.
  expected_targets: EXPECTED_TABLES,  // declared above, before the run
  discovered_targets: discovered,     // what `public` actually holds
  attempted_targets: attempted,       // tables we tried to restore
  completed_targets: completed,       // tables compared back
  skipped_targets: 0,
  assertions_executed: assertions,
  min_assertions: 40,
  failures,
  artifacts: ["artifacts/restore-drill/public-export.json"],
  warnings: [
    ...(BREAK ? [`run with --break=${BREAK}; this receipt is a sabotage, not a result`] : []),
    "THIS DRILLS A LOGICAL ROUND TRIP, NOT SUPABASE'S BACKUPS — there are none to test. "
    + "It does not cover auth.users (the logins, in another schema) or the bytes behind "
    + "storage.objects. See docs/recovery.md.",
    ...warnings,
  ],
  dimensions: { project: REF, posture, schema: SCHEMA },
  canary,
});

console.log(`\n${status.toUpperCase()} — ${assertions} assertions, ${failures.length} failure(s). `
  + `Receipt ${receiptPath}`);
for (const f of failures) console.log("  · " + f);
process.exit(status === "pass" ? 0 : 1);
