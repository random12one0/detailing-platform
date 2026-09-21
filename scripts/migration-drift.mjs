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
// WHAT IT CANNOT TELL YOU — UPDATED 2026-09-21 WHEN TABLES AND COLUMNS LANDED
// ---------------------------------------------------------------------------
// **The limit is kept and narrowed rather than deleted, because the limit is
// the part that stops somebody trusting a green it did not earn.**
//
// It NOW sees: functions (by body), tables (by existence) and columns (by
// name). 49 functions, 52 tables, 737 assertions on a full run.
//
// It STILL cannot see:
//   * **a column's DEFAULT or NULLABILITY.** The TYPE is compared as of
//     2026-09-21 - 1,213 assertions, `information_schema.columns.data_type`
//     against the type the migration declares - but only to the FAMILY:
//     `numeric(8,2)` and `numeric(12,2)` are both `numeric` here, so a
//     widening is still invisible. **108 declared types map to nothing this
//     recognises and are counted UNJUDGED rather than guessed at**, which is
//     deliberate: four separate false positives died building this file and
//     every one of them was a parser that guessed.
//   * **policies, grants, RLS enable/force state.** `db-audit.mjs` asks some
//     of those; this does not ask any of them.
//   * **indexes, constraints, triggers, views, enum types, extensions.**
//   * **a migration whose whole content is a `grant`, an `update`, or a data
//     backfill.** Nothing about it is visible in the schema afterwards.
//
// **AND THE BIGGEST ONE, WHICH NO AMOUNT OF PARSING FIXES:** there is still no
// applied-migrations ledger. This infers what ran from what the schema LOOKS
// like. Two migrations that produce the same end state are indistinguishable,
// and a migration that ran and was later undone by hand reads as never having
// run. **It answers "does the schema match the repo", not "did every migration
// run", and those are different questions.**
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


// --- 1b · replay the repo's TABLES and COLUMNS -----------------------------
// **FUNCTIONS WERE THE MINORITY OF WHAT MIGRATIONS DO, AND THE NEXT FAULT WILL
// BE A COLUMN — 2026-09-21, extended the same day it shipped.** The fault that
// started this was a feature nobody could reach because a function was stale.
// A column that never arrived is the same fault with a different object type,
// and it is the commoner one: most migrations here add or alter tables.
//
// Same replay, same ordering rule. `create table` declares a set of columns,
// `alter table ... add column` adds one, `drop table` removes the table, and
// `alter table ... drop column` removes one. Last operation wins.
const intendedTables = new Map(); // name -> { cols:Set, file }
// Name AND declared type. The type runs to the first constraint keyword or
// the end of the clause, which is enough to compare a family.
const COLNAME = /^\s*("?)([a-z_][a-z_0-9]*)\1\s+([\s\S]+)$/i;
for (const f of files) {
  const src = readFileSync(path.join(MIGRATIONS, f), "utf8");
  const events = [];
  for (const m of src.matchAll(/create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?([a-z_0-9]+)\s*\(/gi)) {
    events.push({ at: m.index, kind: "create", name: m[1].toLowerCase(), bodyAt: m.index + m[0].length });
  }
  for (const m of src.matchAll(/drop\s+table\s+(?:if\s+exists\s+)?(?:public\.)?([a-z_0-9]+)/gi)) {
    events.push({ at: m.index, kind: "droptable", name: m[1].toLowerCase() });
  }
  // **ONE `ALTER TABLE` CAN CARRY MANY CLAUSES, AND MATCHING CLAUSES INSTEAD OF
  // STATEMENTS MISSES ALL BUT THE FIRST.** `20260905001000` drops two columns
  // in one statement:
  //     alter table public.business_branding
  //       drop column if exists social_google,
  //       drop column if exists social_yelp;
  // A pattern anchored on `alter table ... drop column X` sees only
  // `social_google`, so `social_yelp` looked like a column the repo declares
  // and the database never got. It was reported ABSENT from a database that is
  // correct. So the STATEMENT is matched first, then every add/drop clause
  // inside it.
  for (const stmt of src.matchAll(/alter\s+table\s+(?:if\s+exists\s+)?(?:only\s+)?(?:public\.)?([a-z_0-9]+)([\s\S]*?);/gi)) {
    const tname = stmt[1].toLowerCase();
    const clauses = stmt[2].replace(/\/\*[\s\S]*?\*\//g, " ").replace(/--[^\n]*/g, " ");
    for (const c of clauses.matchAll(/add\s+column\s+(?:if\s+not\s+exists\s+)?("?)([a-z_][a-z_0-9]*)\1/gi)) {
      events.push({ at: stmt.index + c.index, kind: "addcol", name: tname, col: c[2].toLowerCase() });
    }
    for (const c of clauses.matchAll(/drop\s+column\s+(?:if\s+exists\s+)?("?)([a-z_][a-z_0-9]*)\1/gi)) {
      events.push({ at: stmt.index + c.index, kind: "dropcol", name: tname, col: c[2].toLowerCase() });
    }
  }
  events.sort((a, b) => a.at - b.at);
  for (const e of events) {
    if (e.kind === "droptable") { intendedTables.delete(e.name); continue; }
    if (e.kind === "addcol") {
      const t = intendedTables.get(e.name);
      if (t) t.cols.add(e.col);
      continue;
    }
    if (e.kind === "dropcol") {
      const t = intendedTables.get(e.name);
      if (t) t.cols.delete(e.col);
      continue;
    }
    // create table: read the column names off the top level of its body only.
    // **NESTED PARENTHESES ARE WHY THIS COUNTS DEPTH.** `numeric(10,2)`,
    // `check (x in ('a','b'))` and `references t(id)` all contain commas that
    // are not column separators, and splitting on every comma invented columns
    // named `2)` and `'b')`.
    // **COMMENTS COME OUT BEFORE THE COMMAS ARE COUNTED, AND THE FIRST VERSION
    // DID IT THE OTHER WAY ROUND.** Splitting on commas first turned every
    // comma inside a `-- ...` comment into a column boundary, so this reported
    // columns called `a`, `and`, `in`, `not`, `so`, `which` and `because` -
    // English words out of prose - as missing from a correct database. Twenty
    // invented failures across seven tables. A check that does that is worth
    // less than no check.
    const body = src.slice(e.bodyAt)
      .replace(/\/\*[\s\S]*?\*\//g, " ")
      .replace(/--[^\n]*/g, " ");
    let depth = 1, i = 0, part = "", parts = [];
    for (; i < body.length && depth > 0; i++) {
      const ch = body[i];
      if (ch === "(") depth++;
      else if (ch === ")") { depth--; if (depth === 0) break; }
      if (depth === 1 && ch === ",") { parts.push(part); part = ""; continue; }
      part += ch;
    }
    parts.push(part);
    const cols = new Set();
    const colType = new Map();
    for (const p of parts) {
      const line = p.replace(/--[^\n]*/g, "").trim();
      if (!line) continue;
      // Table-level constraints are not columns.
      if (/^(primary|unique|foreign|check|constraint|exclude|like)\b/i.test(line)) continue;
      const cm = line.match(COLNAME);
      if (cm) {
        cols.add(cm[2].toLowerCase());
        colType.set(cm[2].toLowerCase(), cm[3].trim().toLowerCase());
      }
    }
    intendedTables.set(e.name, { cols, types: colType, file: f });
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


// --- 3b · compare the tables and columns -----------------------------------
// **THE TYPE IS COMPARED CONSERVATIVELY, AND THAT IS DELIBERATE.** Three
// separate false positives died building this file, every one of them a parser
// that guessed. So a declared type is only judged when it maps to a known
// `information_schema.data_type`; anything unrecognised is counted as
// UNJUDGEABLE and named, never guessed at. A check that invents failures out
// of a correct database is worth less than no check.
const TYPE_FAMILY = new Map(Object.entries({
  text: "text", varchar: "character varying", "character varying": "character varying",
  uuid: "uuid", bool: "boolean", boolean: "boolean",
  int: "integer", int4: "integer", integer: "integer", serial: "integer",
  int8: "bigint", bigint: "bigint", bigserial: "bigint", smallint: "smallint",
  numeric: "numeric", decimal: "numeric", real: "real",
  "double precision": "double precision",
  json: "json", jsonb: "jsonb", date: "date",
  timestamptz: "timestamp with time zone",
  "timestamp with time zone": "timestamp with time zone",
  timestamp: "timestamp without time zone",
  "timestamp without time zone": "timestamp without time zone",
  time: "time without time zone", inet: "inet", bytea: "bytea",
}));
// **THE TYPE IS EVERYTHING BEFORE THE FIRST CONSTRAINT WORD, AND THE FIRST
// VERSION KEPT GOING.** The capture allowed spaces, so `created_at timestamptz
// not null default now()` yielded a "type" of `timestamptz not null default`
// and mapped to nothing: 466 columns went UNJUDGED and the check quietly
// measured almost no types at all. And `included_service_ids uuid[]` lost its
// brackets, so an array column was reported as a uuid the database held as an
// array - a false positive out of a correct database, the fourth built into
// this file and killed before anyone saw it.
const STOPS = /\b(not\s+null|null|default|primary\s+key|unique|references|check|generated|collate|constraint|on\s+delete|on\s+update)\b/i;
const declaredFamily = (raw) => {
  if (!raw) return null;
  let t = String(raw).split(STOPS)[0].trim();
  const isArray = /\[\s*\]\s*$/.test(t);
  t = t.replace(/\[\s*\]\s*$/, "").replace(/\([^)]*\)/g, "").replace(/\s+/g, " ").trim().toLowerCase();
  if (isArray) return "array";
  return TYPE_FAMILY.get(t) || null;
};
const liveCols = await q(`select table_name as t, column_name as c, data_type as dt
    from information_schema.columns where table_schema = 'public'`);
const liveType = new Map();
const liveTable = new Map();
for (const r of liveCols) {
  const t = r.t.toLowerCase();
  if (!liveTable.has(t)) liveTable.set(t, new Set());
  liveTable.get(t).add(r.c.toLowerCase());
  liveType.set(`${t}.${r.c.toLowerCase()}`, String(r.dt).toLowerCase());
}

// The canary for this half: a column no migration could have written, asserted
// on a real table. If the column comparison always answers "present", this
// survives and every table line above is void.
const COL_CANARY = "migration_drift_canary_never_added";
const tableSubjects = [...intendedTables.entries()];
const canaryTable = tableSubjects.find(([t]) => liveTable.has(t));
if (canaryTable && BREAK !== "canary") canaryTable[1].cols.add(COL_CANARY);

const tablesAbsent = [];
const columnsAbsent = [];
let tablesCompared = 0;
let colCanaryCaught = false;
const typeMismatch = [];
let typeUnjudged = 0;

for (const [t, want] of tableSubjects) {
  assertions++;
  const have = BREAK === "blindcols" ? new Set([...want.cols, COL_CANARY]) : liveTable.get(t);
  if (!have) {
    tablesAbsent.push(`${t} (declared by ${want.file})`);
    tablesCompared++;
    console.log(`${t.padEnd(42)} TABLE ABSENT — declared by ${want.file}, not in the database`);
    continue;
  }
  tablesCompared++;
  const missing = [...want.cols].filter((c) => c !== COL_CANARY && !have.has(c)).sort();
  assertions += want.cols.size;
  if (canaryTable && t === canaryTable[0]) colCanaryCaught = !have.has(COL_CANARY);
  if (BREAK === "unappliedcol" && missing.length === 0 && want.cols.size > 1) {
    const victim = [...want.cols].find((c) => c !== COL_CANARY);
    missing.push(victim);
    console.log(`--break=unappliedcol: pretending ${t}.${victim} never arrived`);
  }
  // Types, for the columns that are present and whose declared type is known.
  for (const c of want.cols) {
    if (c === COL_CANARY || !have.has(c)) continue;
    // `--break=wrongtype` declares one column as a type it is not, which is
    // what a migration that widened a column and never ran would look like.
    const rawType = (BREAK === "wrongtype" && t === "businesses" && c === "id")
      ? "text" : (want.types && want.types.get(c));
    const df = declaredFamily(rawType);
    if (!df) { typeUnjudged++; continue; }
    assertions++;
    const lf = liveType.get(`${t}.${c}`);
    if (lf && lf !== df) {
      typeMismatch.push(`${t}.${c} — the repo declares ${df}, the database holds ${lf} (${want.file})`);
    }
  }
  if (missing.length) {
    for (const c of missing) columnsAbsent.push(`${t}.${c} (declared by ${want.file})`);
    console.log(`${t.padEnd(42)} ${missing.length} COLUMN(S) ABSENT — ${missing.join(", ")}`);
  } else {
    console.log(`${t.padEnd(42)} matches ${want.file} (${want.cols.size - (canaryTable && t === canaryTable[0] ? 1 : 0)} column(s))`);
  }
}
console.log("");
console.log(`canary  a column no migration could have added -> `
  + (colCanaryCaught
    ? "caught: reported absent, so a MISSING COLUMN is a verdict this comparison can reach"
    : "NOT CAUGHT — a column that cannot exist was not reported absent, so every table line above is void"));

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
if (intendedTables.size === 0) {
  failures.push("THE REPLAY DECLARED NO TABLES. Either the migrations are unreadable or the "
    + "table parser stopped matching, and there is no expectation to judge anything against.");
}
if (tablesCompared === 0 && intendedTables.size > 0) {
  failures.push("ZERO TABLES REACHED A COMPARISON.");
}
if (tablesAbsent.length) {
  failures.push(`${tablesAbsent.length} table(s) the migrations declare are NOT IN THE DATABASE — `
    + `the migration creating each one has never run: ${tablesAbsent.join(", ")}`);
}
if (typeMismatch.length) {
  failures.push(`${typeMismatch.length} column(s) have a different TYPE in the database than `
    + `the migrations declare: ${typeMismatch.join("; ")}`);
}
if (columnsAbsent.length) {
  failures.push(`${columnsAbsent.length} column(s) the migrations declare are NOT IN THE DATABASE — `
    + `the migration adding each one has never run: ${columnsAbsent.join(", ")}`);
}

const { path: receiptPath } = writeReceipt({
  check_id: "migration-drift",
  started_at,
  status: failures.length === 0 && canaryCaught && bodyCanaryCaught && colCanaryCaught ? "pass" : "fail",
  // Replayed from supabase/migrations/ before the database is asked anything.
  // The repo is what the database is supposed to match, so the repo declares.
  expected_targets: intended.size + intendedTables.size,
  discovered_targets: [...intended.keys()].filter((n) => live.has(n)).length
    + [...intendedTables.keys()].filter((t) => liveTable.has(t)).length,
  attempted_targets: intended.size + intendedTables.size,
  completed_targets: compared + tablesCompared,
  skipped_targets: 0,
  assertions_executed: assertions,
  // 51 functions make ~102 assertions. A floor just under it means losing the
  // whole replay fails the receipt rather than shrinking it quietly.
  min_assertions: 1000,
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
    tables_declared: intendedTables.size,
    tables_absent: tablesAbsent,
    columns_absent: columnsAbsent,
    type_mismatch: typeMismatch,
    types_unjudged: typeUnjudged,
    method: "replay create/drop function in file and statement order; compare body text against pg_get_functiondef",
    absent,
    drifted,
  },
  canary: {
    id: "a function name no migration could have defined must be reported ABSENT",
    observed_failure: canaryCaught && bodyCanaryCaught && colCanaryCaught,
    caught_by: [...(canaryCaught ? ["absent"] : []), ...(bodyCanaryCaught ? ["drifted"] : []), ...(colCanaryCaught ? ["column-absent"] : [])],
    findings: canaryCaught
      ? ["[absent] a fabricated function name was reported absent, so ABSENT is a verdict "
        + "this comparison can actually reach"]
      : ["[absent] NOT CAUGHT — a function that cannot exist was not reported absent, so every "
        + "`matches` above is a verdict this run could not have made"],
  },
});

console.log("");
if (failures.length === 0 && canaryCaught && bodyCanaryCaught && colCanaryCaught) {
  console.log(`PASS — ${compared} function(s) and ${tablesCompared} table(s) compared, every one matches the repo.`);
  console.log(`Receipt ${receiptPath}`);
  process.exit(0);
}
console.log("!".repeat(74));
for (const f of failures) console.log("FAIL — " + f);
if (!canaryCaught) console.log("FAIL — the ABSENT canary was not caught, so this run proves nothing.");
if (!bodyCanaryCaught) console.log("FAIL — the DRIFTED canary was not caught: the body comparison matches anything.");
if (!colCanaryCaught) console.log("FAIL — the COLUMN canary was not caught: the column comparison matches anything.");
console.log("");
console.log("Applying a migration is a schema change and it is Andrew's to authorise.");
console.log(`This check reports and never applies. Receipt ${receiptPath}`);
process.exit(1);
