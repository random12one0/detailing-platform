// IS THE DATABASE RUNNING WHAT THE MIGRATIONS SAY? — 2026-09-21, ROADMAP 8.10a.
//
//   set -a; . ./.env; set +a
//   node scripts/migration-drift.mjs
//   node scripts/receipt.mjs receipts/migration-drift.json
//
// It reads. It applies nothing, it drops nothing, it writes nothing to the
// database. Applying a migration is a schema change and that is Andrew's.
//
// ---------------------------------------------------------------------------
// WHY IT EXISTS
// ---------------------------------------------------------------------------
// ROADMAP 0.6 found 22 of 39 EDGE FUNCTIONS running something other than this
// checkout, and `deployed-inventory.mjs` was built to keep answering that.
// **Nothing asked the same question one floor down, about the database.**
//
// On 2026-09-21 the other session found out what that costs: the multi-car
// booking feature had never worked for anybody, at any setting, because
// `get_public_business_profile` in the live database was older than the repo's
// newest definition of it and did not publish `max_vehicles_per_booking`. The
// setting saved, the screen worked, and the feature reached nobody. **Two
// migrations in this repo had silently never run, and nothing anywhere would
// have said so.**
//
// ---------------------------------------------------------------------------
// THE QUESTION HAD TO CHANGE, AND THIS IS THE PART TO READ
// ---------------------------------------------------------------------------
// The obvious check is "which migrations on disk are not in the applied list".
// **That list does not exist in this project.**
// `supabase_migrations.schema_migrations` — the table the Supabase CLI keeps —
// is NOT present in `kguqylyzgyzfktkfnhjb` at all; the only `schema_migrations`
// tables are `auth`'s and `realtime`'s, which are Supabase's own internals.
// Measured rather than assumed: the query errors with
// `42P01 relation "supabase_migrations.schema_migrations" does not exist`.
//
// **So there is no ledger to compare against.** Nothing in the database records
// which of the 92 files in `supabase/migrations/` ever ran. A check that asked
// the question directly would have to invent its answer.
//
// What IS answerable is the question ROADMAP 8.10a actually asks for:
// *"something checks that the database's functions match the repo the way
// `deployed-inventory.mjs` checks the edge functions."* A migration that never
// ran leaves its function missing or stale, and that is visible from outside.
//
// ---------------------------------------------------------------------------
// HOW IT DECIDES
// ---------------------------------------------------------------------------
// The migrations are append-only and ordered, so the repo's INTENDED state is
// replayable: walk every `.sql` in filename order, and inside each file walk
// the `create function` and `drop function` statements in the order they
// appear. Last operation wins. That yields, for every function name, the
// definition this repo believes is live — or the fact that it was dropped.
//
// **DROPS MATTER AND A FIRST VERSION OF THIS MISSED THEM.** Ignoring them
// reported `founding_spots_left` and `release_job_alerts` as missing from the
// database. Both are correctly absent: each was dropped by a later migration,
// one of them in the same file that also creates it. A check that reads creates
// and not drops invents two failures out of a correct database.
//
// The comparison is the function BODY, normalised for whitespace. Postgres
// stores `prosrc` as submitted, so the repo's body appears verbatim inside
// `pg_get_functiondef` when the definition is current. Confirmed on
// `get_public_business_profile`: 6,474 characters, contained exactly.
//
// ---------------------------------------------------------------------------
// WHAT IT CANNOT TELL YOU
// ---------------------------------------------------------------------------
// **It sees FUNCTIONS, not tables, columns, policies, grants or indexes.** A
// migration that only adds a column is invisible to it and will read as no
// news. That is a real gap, and it is why this file is not called
// `migrations-applied`: it answers a narrower question than its subject, and
// says so rather than letting a green line imply the wider one.
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { writeReceipt } from "./receipt.mjs";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const MIGRATIONS = path.join(ROOT, "supabase", "migrations");
const started_at = new Date().toISOString();
const BREAK = (process.argv.find((a) => a.startsWith("--break=")) || "").split("=")[1] || "";

const envFile = path.join(ROOT, ".env");
try {
  for (const line of readFileSync(envFile, "utf8").split(/\r?\n/)) {
    const i = line.indexOf("=");
    if (!line || line.startsWith("#") || i < 0) continue;
    const k = line.slice(0, i).trim();
    if (!process.env[k]) process.env[k] = line.slice(i + 1).trim();
  }
} catch { /* no .env is fine when the vars are already exported */ }

const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const REF = process.env.SUPABASE_PROJECT_REF;
if (!TOKEN || !REF) {
  console.error("Missing SUPABASE_ACCESS_TOKEN or SUPABASE_PROJECT_REF.");
  console.error("Nothing was measured. Run: set -a; . ./.env; set +a");
  process.exit(1);
}

const q = async (sql) => {
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query: sql }),
  });
  const j = await r.json().catch(() => null);
  // **A FAILED READ IS NOT AN EMPTY ONE.** `docs/gotchas.md`, 2026-09-21: a
  // probe that cannot tell those apart reports the most alarming answer with
  // total confidence. This throws rather than returning [].
  if (!r.ok) throw new Error(`query failed: ${r.status} ${JSON.stringify(j).slice(0, 200)}`);
  return Array.isArray(j) ? j : [];
};

// --- 1 · replay the repo's intent ------------------------------------------
const files = readdirSync(MIGRATIONS).filter((f) => f.endsWith(".sql")).sort();
const BODY = /\$([a-zA-Z_]*)\$([\s\S]*?)\$\1\$/;
/** name -> { body, file } for the definition this repo believes is live. */
const intended = new Map();
for (const f of files) {
  const src = readFileSync(path.join(MIGRATIONS, f), "utf8");
  const events = [];
  for (const m of src.matchAll(/create\s+(?:or\s+replace\s+)?function\s+(?:public\.)?([a-z_0-9]+)\s*\(/gi)) {
    events.push({ at: m.index, kind: "create", name: m[1].toLowerCase() });
  }
  for (const m of src.matchAll(/drop\s+function\s+(?:if\s+exists\s+)?(?:public\.)?([a-z_0-9]+)\s*\(/gi)) {
    events.push({ at: m.index, kind: "drop", name: m[1].toLowerCase() });
  }
  events.sort((a, b) => a.at - b.at);
  for (const e of events) {
    if (e.kind === "drop") { intended.delete(e.name); continue; }
    const b = src.slice(e.at).match(BODY);
    intended.set(e.name, { body: b ? b[2] : null, file: f });
  }
}

// --- 2 · what the database actually holds ----------------------------------
const liveRows = await q(`select p.proname as name, pg_get_functiondef(p.oid) as def
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.prokind = 'f'`);
const live = new Map(liveRows.map((r) => [r.name.toLowerCase(), r.def]));

// **THE BREAK THIS FILE EXISTS FOR: a migration on disk that never ran.** It
// is simulated by forgetting one function the database really does hold,
// because this check is READ ONLY and will not drop anything to test itself.
// The code path is identical to a genuine never-applied migration: the name is
// in the replayed intent and absent from the live map.
if (BREAK === "unapplied") {
  const victim = [...intended.keys()].find((n) => live.has(n));
  if (victim) {
    live.delete(victim);
    console.log(`--break=unapplied: pretending the database never got ${victim}
`);
  }
}

console.log(`${files.length} migration file(s) on disk; `
  + `${intended.size} function(s) the repo believes are live; `
  + `${live.size} in the database\n`);

// --- 3 · compare -----------------------------------------------------------
// **WHITESPACE COLLAPSE ALONE IS NOT ENOUGH, AND IT COST A FALSE POSITIVE.**
// The first version reported `has_business_permission` as DRIFTED. The two
// bodies are the SAME SQL: the repo writes `exists (` then a newline and
// `select 1`, and the
// database holds `exists (select 1`. Collapsing runs of whitespace leaves a
// space that one side has after `(` and the other does not, so the containment
// test failed on formatting. Postgres stores what it was given, and these
// migrations were not all applied from these files byte for byte.
// Whitespace around punctuation is therefore removed on both sides too.
const norm = (x) => String(x)
  .replace(/\s+/g, " ")
  .replace(/\s*([(),;])\s*/g, "$1")
  .trim();
const absent = [];
const drifted = [];
const unjudgeable = [];
let compared = 0;
let assertions = 0;

// THE CANARY, AND IT IS AIMED AT THE COMPARISON. A name no migration could
// have defined is asserted as intended. If the comparison always answers
// "present" — a lookup against the wrong map, a query that returned every
// name, a normaliser that matches anything — this survives, and then every
// `matches` above is a verdict this run could not have made.
const CANARY = "migration_drift_canary_never_defined";
// **TWO CANARIES, BECAUSE THIS CHECK REACHES TWO VERDICTS.** One fabricated
// name proves ABSENT is reachable. That says nothing about the body test - a
// normaliser loose enough to match anything would still report the fabricated
// name absent and pass. So a REAL function is also compared against a body it
// certainly does not have, and DRIFTED must come back.
const BODY_CANARY = [...intended.entries()].find(([n, w]) => w.body && live.has(n));
let bodyCanaryCaught = false;
const subjects = [...intended.entries()];
if (BREAK !== "canary") subjects.push([CANARY, { body: "select 1", file: "(the canary)" }]);

for (const [name, want] of subjects) {
  const isCanary = name === CANARY;
  assertions++;
  const def = BREAK === "blind" ? "a definition that matches everything" : live.get(name);
  if (!def) {
    if (!isCanary) {
      absent.push(`${name} (declared by ${want.file})`);
      compared++;
      console.log(`${name.padEnd(42)} ABSENT — declared by ${want.file}, not in the database`);
    }
    continue;
  }
  if (!want.body) {
    unjudgeable.push(`${name} (${want.file}: no dollar-quoted body could be read)`);
    console.log(`${name.padEnd(42)} UNJUDGEABLE — no body parsed from ${want.file}`);
    continue;
  }
  assertions++;
  const ok = BREAK === "blind" ? true : norm(def).includes(norm(want.body));
  if (isCanary) continue;
  compared++;
  if (!ok) {
    drifted.push(`${name} (the repo's newest definition is ${want.file})`);
    console.log(`${name.padEnd(42)} DRIFTED — the database's body is not ${want.file}'s`);
  } else {
    console.log(`${name.padEnd(42)} matches ${want.file}`);
  }
}

if (BODY_CANARY && BREAK !== "canary") {
  const wrong = "select 'this body was never any function in this repo'::text";
  assertions++;
  bodyCanaryCaught = BREAK === "blind"
    ? false
    : !norm(live.get(BODY_CANARY[0])).includes(norm(wrong));
  console.log("");
  console.log(`canary  ${BODY_CANARY[0]} against a body it does not have -> `
    + (bodyCanaryCaught
      ? "caught: reported as not matching, so DRIFTED is a verdict this comparison can reach"
      : "NOT CAUGHT — a body no function has was found inside one, so the comparison matches anything"));
}

const canaryCaught = BREAK === "canary" ? false : (BREAK === "blind" ? false : !live.has(CANARY));
console.log("");
console.log(`canary  ${CANARY} -> `
  + (canaryCaught
    ? "caught: reported absent, so ABSENT is a verdict this comparison can reach"
    : "NOT CAUGHT — a function that cannot exist was not reported absent, so every "
      + "`matches` above is void"));

// --- 4 · the receipt -------------------------------------------------------
const failures = [];
if (files.length === 0) {
  failures.push("ZERO MIGRATION FILES were read from supabase/migrations. Nothing was compared, "
    + "so this run proves nothing.");
}
if (intended.size === 0) {
  failures.push("THE REPLAY DECLARED NO FUNCTIONS. Either the migrations are unreadable or the "
    + "parser stopped matching, and there is no expectation to judge anything against.");
}
if (compared === 0 && intended.size > 0) {
  failures.push("ZERO FUNCTIONS REACHED A COMPARISON.");
}
if (absent.length) {
  failures.push(`${absent.length} function(s) the migrations declare are NOT IN THE DATABASE — `
    + `the migration defining each one has never run: ${absent.join(", ")}`);
}
if (drifted.length) {
  failures.push(`${drifted.length} function(s) in the database do NOT match the repo's newest `
    + `definition: ${drifted.join(", ")}`);
}

const { path: receiptPath } = writeReceipt({
  check_id: "migration-drift",
  started_at,
  status: failures.length === 0 && canaryCaught && bodyCanaryCaught ? "pass" : "fail",
  // Replayed from supabase/migrations/ before the database is asked anything.
  // The repo is what the database is supposed to match, so the repo declares.
  expected_targets: intended.size,
  discovered_targets: [...intended.keys()].filter((n) => live.has(n)).length,
  attempted_targets: intended.size,
  completed_targets: compared,
  skipped_targets: 0,
  assertions_executed: assertions,
  // 51 functions make ~102 assertions. A floor just under it means losing the
  // whole replay fails the receipt rather than shrinking it quietly.
  min_assertions: 80,
  failures,
  artifacts: ["scripts/migration-drift.mjs"],
  warnings: [
    ...(BREAK ? [`run with --break=${BREAK}; this receipt is a sabotage, not a result`] : []),
    ...unjudgeable.map((u) => `UNJUDGEABLE ${u}`),
    "FUNCTIONS ONLY — this cannot see a migration that adds a table, column, policy, grant "
    + "or index. There is no applied-migrations ledger in this project to compare against: "
    + "supabase_migrations.schema_migrations does not exist.",
  ],
  dimensions: {
    project: REF,
    migration_files: files.length,
    method: "replay create/drop function in file and statement order; compare body text against pg_get_functiondef",
    absent,
    drifted,
  },
  canary: {
    id: "a function name no migration could have defined must be reported ABSENT",
    observed_failure: canaryCaught && bodyCanaryCaught,
    caught_by: [...(canaryCaught ? ["absent"] : []), ...(bodyCanaryCaught ? ["drifted"] : [])],
    findings: canaryCaught
      ? ["[absent] a fabricated function name was reported absent, so ABSENT is a verdict "
        + "this comparison can actually reach"]
      : ["[absent] NOT CAUGHT — a function that cannot exist was not reported absent, so every "
        + "`matches` above is a verdict this run could not have made"],
  },
});

console.log("");
if (failures.length === 0 && canaryCaught && bodyCanaryCaught) {
  console.log(`PASS — ${compared} function(s) compared, every one matches the repo.`);
  console.log(`Receipt ${receiptPath}`);
  process.exit(0);
}
console.log("!".repeat(74));
for (const f of failures) console.log("FAIL — " + f);
if (!canaryCaught) console.log("FAIL — the ABSENT canary was not caught, so this run proves nothing.");
if (!bodyCanaryCaught) console.log("FAIL — the DRIFTED canary was not caught: the body comparison matches anything.");
console.log("");
console.log("Applying a migration is a schema change and it is Andrew's to authorise.");
console.log(`This check reports and never applies. Receipt ${receiptPath}`);
process.exit(1);
