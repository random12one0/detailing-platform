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

import { mkdirSync, writeFileSync, readFileSync, statSync, readdirSync } from "node:fs";
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

// **THE EXPECTATION COMES FROM THE MIGRATIONS, NOT FROM THE DATABASE -
// 2026-09-21, Andrew's manager's ruling, correcting this file's first version
// the same day.** Until today all four target counts were `rows.length`, the
// number of STAGES this script happened to finish: a drill over the whole
// `public` schema declaring it had **2 targets**.
//
// The first fix replaced that with a constant measured off the LIVE database,
// and that was the same fault one level up: **if a table is dropped in the
// live database the count follows it down and the check cannot fail** - a gate
// following the data wearing a constant's clothes.
//
// `supabase/migrations/` is declared, append-only and in the repo, so it is
// the thing the live database is supposed to MATCH. This reads it every run
// and compares the two by NAME, not by count, so a disagreement says WHICH
// table rather than how many. Measured 2026-09-21: 53 created minus
// `monthly_plans` dropped = **52**, set-identical to live, no renames.
//
// **A PARSE THAT FINDS NOTHING IS A FAILURE, NOT AN EMPTY EXPECTATION** - that
// is how this check would go back to proving nothing.
const declaredTables = () => {
  const dir = path.join(ROOT, "supabase", "migrations");
  const created = new Set();
  const dropped = new Set();
  for (const f of readdirSync(dir).sort()) {
    if (!f.endsWith(".sql")) continue;
    const src = readFileSync(path.join(dir, f), "utf8");
    for (const m of src.matchAll(/create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?([a-z_]+)/gi)) {
      created.add(m[1].toLowerCase());
    }
    for (const m of src.matchAll(/drop\s+table\s+(?:if\s+exists\s+)?(?:public\.)?([a-z_]+)/gi)) {
      dropped.add(m[1].toLowerCase());
    }
  }
  for (const t of dropped) created.delete(t);
  return created;
};
const DECLARED = declaredTables();
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
  // failure, because a product whose own platform holds no restore point is not
  // a healthy one and this check exists to say so until it is fixed.
  //
  // **AND IT SAYS WHAT IT LOOKED AT — CORRECTED 2026-09-21.** This line used to
  // read *"THERE IS NO RESTORE POINT A CUSTOMER CAN REACH... nothing the
  // platform holds would bring it back."* **That was false, and it is the exact
  // sentence `docs/recovery.md` opened with before Andrew corrected it:** a
  // nightly backup pipeline had been running the whole time in a separate
  // private repository, and this check looked only at Supabase. **A measurement
  // of one place written down as a fact about everywhere** — the same mistake,
  // in the same words, about the same subject, and hardcoded here it would have
  // repeated itself on every run for ever. The Supabase half was always
  // correct; the scope was not, and nothing in the wording admitted a scope.
  // `docs/MANAGER-CLOSE-2026-09-21.md` § 3 has the correction.
  assertions++;
  if (posture.listed_backups === 0 && !posture.pitr_enabled) {
    say(`SUPABASE HOLDS NO RESTORE POINT. Plan is "${posture.plan}", point-in-time `
      + `recovery is off and the backup list is empty. WAL archiving is running `
      + `(${posture.wal_archived_count} segments, ${posture.wal_failed_count} failures) but that `
      + `is Supabase's own infrastructure, not something Andrew can restore from. `
      + `THIS IS A FACT ABOUT SUPABASE ONLY - the restore path that does exist is `
      + `github.com/random12one0/detailing-platform-backups (private): nightly 02:10 `
      + `Pacific, pg_dump custom format, refuses a dump under 50 KB, age-encrypted, `
      + `published as a release asset, 30-day retention keeping the 1st of each month. `
      + `Its two real gaps: nobody has ever restored one, and the age private key's `
      + `location is unrecorded. See docs/recovery.md - do not re-measure it here.`);
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
  // A parse that finds nothing would be an empty expectation nothing can fail.
  assertions++;
  // `--break=nodeclared` empties the parsed expectation, which is what a broken
  // parser or an unreadable migrations directory would produce.
  if (BREAK === "nodeclared") DECLARED.clear();
  if (DECLARED.size === 0) {
    say("THE MIGRATIONS DECLARED NO TABLES. Either `supabase/migrations/` is unreadable or "
      + "the parser stopped matching, and either way there is no expectation to judge "
      + "anything against. This is NOT a clean drill.");
  } else {
    // Compared by NAME, so a disagreement says WHICH table rather than how many.
    const live = new Set(tables.map((t) => t.toLowerCase()));
    const missing = [...DECLARED].filter((t) => !live.has(t)).sort();
    const extra = [...live].filter((t) => !DECLARED.has(t)).sort();
    if (missing.length) {
      say(`${missing.length} table(s) the migrations declare are NOT in \`public\`: `
        + `${missing.join(", ")}. The live database does not match the repo.`);
    }
    if (extra.length) {
      say(`${extra.length} table(s) exist in \`public\` that no migration declares: `
        + `${extra.join(", ")}. Either a migration is missing or something was created by hand.`);
    }
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
  expected_targets: DECLARED.size,    // from supabase/migrations/, not from the database
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
