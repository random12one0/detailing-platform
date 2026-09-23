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
// WHAT IT CANNOT TELL YOU — UPDATED 2026-09-21 WHEN TABLES AND COLUMNS LANDED,
// UPDATED AGAIN 2026-09-23 WHEN POLICIES LANDED (ROADMAP 8.10b)
// ---------------------------------------------------------------------------
// **The limit is kept and narrowed rather than deleted, because the limit is
// the part that stops somebody trusting a green it did not earn.**
//
// It NOW sees: functions (by body), tables (by existence), columns (by name
// and type family), and policies (by existence, on the `public` and
// `storage` schemas — RLS is where this repo has already been burnt once,
// the realtime-channel finding, and it is the one of the three CLAUDE.md
// named that a session is most likely to actually need next).
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
//   * **a policy's own USING or WITH CHECK expression.** Existence only, the
//     same conservative choice tables made first — a general SQL boolean
//     expression normaliser is exactly the kind of guesser that produced the
//     four false positives above, and nobody has built or proved one here.
//   * **grants and RLS enable/force state.** `db-audit.mjs` asks some of
//     those; this does not ask any of them. ROADMAP 8.10c.
//   * **indexes, constraints, triggers, views, enum types, extensions.**
//     ROADMAP 8.10c.
//   * **a migration whose whole content is a `grant`, an `update`, or a data
//     backfill.** Nothing about it is visible in the schema afterwards.
//   * **a dynamically-named policy.** Five migrations generate policies in a
//     loop (`execute format($p$ create policy %I on public.%I …`) — the
//     literal source text is `%I`, not a real name, and resolving the loop
//     variable would mean parsing SQL out of a format string. Counted and
//     named as UNJUDGEABLE per file rather than silently skipped or guessed.
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

// --- 1c · replay the repo's POLICIES — 2026-09-23, ROADMAP 8.10b -----------
// **POLICIES, NOT GRANTS OR INDEXES, BECAUSE THIS IS RLS AND RLS IS THE ONE
// OF THE THREE THIS REPO HAS ALREADY BEEN BURNT BY.** The realtime-channel
// finding earlier this week (`docs/tenant-matrix.mjs`) was a missing
// `private: true`, not a missing policy — but the shape of the risk is
// identical: a security boundary that exists only in a migration file
// nobody confirmed ran. Grants and indexes remain unbuilt; see 8.10c.
//
// EXISTENCE ONLY, LIKE TABLES ABOVE, NOT THE POLICY'S OWN USING/WITH CHECK
// EXPRESSION. The same reason the table half stayed conservative: a
// normaliser for arbitrary SQL boolean expressions is exactly the kind of
// guesser that has produced four false positives building this file already
// (see the TYPE_FAMILY comment above). Existence answers the actual question
// 8.10a asked — did the migration that CREATES this policy ever run — without
// inventing a comparator nobody has proved.
//
// **DYNAMIC POLICIES ARE RESOLVED WHEN THAT IS SAFE, AND NAMED RATHER THAN
// GUESSED AT OTHERWISE — AND LEAVING THEM UNRESOLVED TURNED OUT TO INVENT A
// FAILURE, NOT JUST MISS ONE.** Five migrations generate policies in a loop:
//
//   foreach t in array array['services', 'service_groups', ...] loop
//     execute format('drop policy if exists %I on public.%I', t || '_tenant_all', t);
//     execute format($p$ create policy %I on public.%I ... $p$, t || '_member_select', t);
//   end loop;
//
// The first version of this counted every `%I` as UNJUDGEABLE and moved on.
// **That produced a false positive on the very first run**:
// `service_groups_tenant_all`, created by one migration, is DROPPED by
// exactly this pattern in a later one and replaced by
// `service_groups_member_select` / `service_groups_settings_write` — both
// confirmed live by a direct query. Skipping the dynamic drop left the old
// name in `intended` forever, and it was reported ABSENT from a database
// that is correct. **A check that invents failures out of a correct
// database is worth less than no check — this file's own oldest lesson,
// now paid again one object type over.**
//
// So: the array literal is genuinely static (every element seen is a quoted
// string), and the substitution is a plain `t || '_suffix'` concatenation —
// nothing here requires evaluating arbitrary SQL, only reading a literal
// array and a literal suffix, which is not the kind of guessing that broke
// this file four times before. Resolved. What is NOT resolved — a loop
// whose array is not all literals, a substitution that is not `t ||
// '_suffix'`, anything this pattern does not match — still falls through to
// UNJUDGEABLE, named by file, exactly as before.
const LOOP_RE = /foreach\s+t\s+in\s+array\s+array\s*\[([^\]]*)\]/gi;
function resolveDynamicPolicyLoops(src) {
  const resolved = [];
  const resolvedRanges = []; // [start, end) byte ranges the loop body covered
  for (const loopM of src.matchAll(LOOP_RE)) {
    const tableList = [...loopM[1].matchAll(/'([a-z_0-9]+)'/gi)].map((x) => x[1].toLowerCase());
    if (!tableList.length) continue;
    const bodyStart = loopM.index + loopM[0].length;
    const endLoopAt = src.indexOf("end loop", bodyStart);
    if (endLoopAt < 0) continue;
    const body = src.slice(bodyStart, endLoopAt);
    resolvedRanges.push([loopM.index, endLoopAt]);
    // Each `execute format('drop policy if exists %I on public.%I', t ||
    // '_suffix', t)` or the create-policy equivalent contributes one suffix,
    // applied to every table in the loop's own array.
    for (const dm of body.matchAll(/drop\s+policy\s+if\s+exists\s+%I\s+on\s+public\.%I\s*'?\s*,\s*([\s\S]{0,60}?)\);/gi)) {
      const suffixM = dm[1].match(/t\s*\|\|\s*'([a-z_]+)'/i);
      if (!suffixM) continue;
      for (const t of tableList) {
        resolved.push({ at: bodyStart + dm.index, kind: "drop", key: `public.${t}.${t}${suffixM[1]}` });
      }
    }
    for (const cm of body.matchAll(/create\s+policy\s+%I\s+on\s+public\.%I[\s\S]*?\$p\$\s*,\s*t\s*\|\|\s*'([a-z_]+)'\s*,\s*t\s*\)/gi)) {
      for (const t of tableList) {
        resolved.push({ at: bodyStart + cm.index, kind: "create", key: `public.${t}.${t}${cm[1]}` });
      }
    }
  }
  return { resolved, resolvedRanges };
}
const intendedPolicies = new Map(); // "schema.table.name" -> { file }
const unjudgeablePolicies = [];
const POLICY_RE = /(create|drop)\s+policy\s+(?:if\s+exists\s+)?(?:"([^"]+)"|(%I)|([a-z_][a-z_0-9]*))\s+on\s+(?:(public|storage)\.)?(?:"?%I"?|([a-z_][a-z_0-9]*))/gi;
for (const f of files) {
  const src = readFileSync(path.join(MIGRATIONS, f), "utf8");
  const events = [];
  let dynamicHits = 0;
  const { resolved, resolvedRanges } = resolveDynamicPolicyLoops(src);
  const inResolvedRange = (i) => resolvedRanges.some(([s, e]) => i >= s && i < e);
  for (const e of resolved) events.push(e);
  for (const m of src.matchAll(POLICY_RE)) {
    const kind = m[1].toLowerCase() === "create" ? "create" : "drop";
    const name = m[2] || m[4];
    const table = m[6];
    const schema = (m[5] || "public").toLowerCase();
    if (m[3] || !name || !table) {
      // Only count it against the check's own honesty if this dynamic
      // statement was NOT already resolved by the loop parser above.
      if (!inResolvedRange(m.index)) dynamicHits++;
      continue;
    }
    events.push({ at: m.index, kind, key: `${schema}.${table.toLowerCase()}.${name.toLowerCase()}` });
  }
  // **DROPPING A TABLE DROPS EVERY POLICY ON IT — POSTGRES DOES THIS
  // AUTOMATICALLY AND THE FIRST VERSION OF THIS FILE DID NOT KNOW.** Found
  // the same run as `service_groups` above: `monthly_plans` gets a
  // `_tenant_all` policy from the dynamic loop, and the whole table is
  // dropped nine hours later (`20260827001000_phase2_cleanup_and_storage.
  // sql:16`, already noted in that file's own comments as deliberate, not
  // an oversight). Without this, the policy stayed in `intended` forever
  // and was reported ABSENT from a database that correctly has neither the
  // table nor the policy. Interleaved by position with the policy events
  // above so a drop-table between two policy statements in the same file
  // still lands in the right order.
  for (const m of src.matchAll(/drop\s+table\s+(?:if\s+exists\s+)?(?:public\.)?([a-z_0-9]+)/gi)) {
    events.push({ at: m.index, kind: "droptable", name: m[1].toLowerCase() });
  }
  events.sort((a, b) => a.at - b.at);
  for (const e of events) {
    if (e.kind === "droptable") {
      for (const key of [...intendedPolicies.keys()]) {
        if (key.startsWith(`public.${e.name}.`) || key.startsWith(`storage.${e.name}.`)) intendedPolicies.delete(key);
      }
      continue;
    }
    if (e.kind === "drop") { intendedPolicies.delete(e.key); continue; }
    intendedPolicies.set(e.key, { file: f });
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
let colBreakFired = false;
const typeMismatch = [];
let typeUnjudged = 0;
let typeJudged = 0;

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
  // ONE TABLE, ONCE — 2026-09-21. This fired on EVERY iteration, so a
  // sabotage whose own line says "pretending <table>.<column> never arrived"
  // printed that 52 times and manufactured 52 findings out of a database that
  // matches the repo exactly. **That is this file's one historical failure
  // direction — inventing findings out of a correct database** — reintroduced
  // by the switch built to test for it. A sabotage that fires 52 times does
  // not prove the check can see one missing column; it proves it can see a
  // schema that has been carpet-bombed, which nothing was in doubt about.
  if (BREAK === "unappliedcol" && !colBreakFired && missing.length === 0 && want.cols.size > 1) {
    const victim = [...want.cols].find((c) => c !== COL_CANARY);
    missing.push(victim);
    colBreakFired = true;
    console.log(`--break=unappliedcol: pretending ${t}.${victim} never arrived (one column, once)`);
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
    typeJudged++;
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

// --- 3c · compare the policies ----------------------------------------------
const livePolicyRows = await q(`select schemaname, tablename, policyname
    from pg_policies where schemaname in ('public','storage')`);
const livePolicies = new Set(
  livePolicyRows.map((r) => `${r.schemaname}.${r.tablename}.${r.policyname}`.toLowerCase()));

// The canary for this half: a policy name no migration could have written,
// asserted on a real table this run already knows exists.
const POLICY_CANARY_NAME = "migration_drift_canary_policy_never_created";
const policySubjects = [...intendedPolicies.entries()];
let policyCanaryKey = null;
if (BREAK !== "canary" && policySubjects.length) {
  const sampleTable = policySubjects[0][0].split(".").slice(0, 2).join(".");
  policyCanaryKey = `${sampleTable}.${POLICY_CANARY_NAME}`;
  intendedPolicies.set(policyCanaryKey, { file: "(the canary)" });
}

const policiesAbsent = [];
let policiesCompared = 0;
let policyCanaryCaught = false;
let policyBreakFired = false;
for (const [key, want] of intendedPolicies) {
  const isCanary = key === policyCanaryKey;
  assertions++;
  // `--break=policy` pretends one real policy's migration never ran — the
  // exact shape of the fault ROADMAP 8.10a found for functions, one object
  // type over.
  const missingOnPurpose = BREAK === "policy" && !isCanary && !policyBreakFired
    && key !== policyCanaryKey && livePolicies.has(key);
  const have = missingOnPurpose ? false : livePolicies.has(key);
  if (missingOnPurpose) { policyBreakFired = true; console.log(`--break=policy: pretending ${key} never arrived (one policy, once)`); }
  if (isCanary) { policyCanaryCaught = !have; continue; }
  policiesCompared++;
  if (!have) {
    policiesAbsent.push(`${key} (declared by ${want.file})`);
    console.log(`${key.padEnd(60)} POLICY ABSENT — declared by ${want.file}, not in the database`);
  } else {
    console.log(`${key.padEnd(60)} matches ${want.file}`);
  }
}
console.log("");
console.log(`canary  a policy no migration could have created -> `
  + (policyCanaryCaught
    ? "caught: reported absent, so a MISSING POLICY is a verdict this comparison can reach"
    : "NOT CAUGHT — a policy that cannot exist was not reported absent, so every policy line above is void"));

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
if (intendedPolicies.size <= 1) {
  // <=1 because the canary itself is always in the map by this point.
  failures.push("THE REPLAY DECLARED NO POLICIES. Either the migrations are unreadable or the "
    + "policy parser stopped matching, and there is no expectation to judge anything against.");
}
if (policiesCompared === 0 && intendedPolicies.size > 1) {
  failures.push("ZERO POLICIES REACHED A COMPARISON.");
}
if (policiesAbsent.length) {
  failures.push(`${policiesAbsent.length} polic(y/ies) the migrations declare are NOT IN THE DATABASE — `
    + `the migration creating each one has never run: ${policiesAbsent.join(", ")}`);
}

const allCanariesCaught = canaryCaught && bodyCanaryCaught && colCanaryCaught && policyCanaryCaught;
const { path: receiptPath } = writeReceipt({
  check_id: "migration-drift",
  started_at,
  status: failures.length === 0 && allCanariesCaught ? "pass" : "fail",
  // Replayed from supabase/migrations/ before the database is asked anything.
  // The repo is what the database is supposed to match, so the repo declares.
  // The canary itself is excluded from every count below — it is not a real
  // migration and was never expected to exist.
  expected_targets: intended.size + intendedTables.size + (intendedPolicies.size - 1),
  discovered_targets: [...intended.keys()].filter((n) => live.has(n)).length
    + [...intendedTables.keys()].filter((t) => liveTable.has(t)).length
    + policiesCompared - policiesAbsent.length,
  attempted_targets: intended.size + intendedTables.size + (intendedPolicies.size - 1),
  completed_targets: compared + tablesCompared + policiesCompared,
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
    ...unjudgeablePolicies,
    // CORRECTED 2026-09-23 — this line said "FUNCTIONS ONLY" for two days
    // after tables and columns were already covered, which is the exact
    // failure this repo keeps finding in ROADMAP.md one level up, now found
    // inside a receipt's own warning text. Say precisely what is seen and
    // what still is not, so the next reader does not have to read the code
    // to find out.
    "SEES functions (by body), tables (by existence), columns (by name and "
    + "type family), policies (by existence, on public and storage schemas). "
    + "STILL CANNOT SEE: grants, indexes, constraints, triggers, views, enum "
    + "types, extensions, RLS enable/force state, a policy's own USING/WITH "
    + "CHECK expression, a column's DEFAULT or NULLABILITY, or a migration "
    + "whose whole content is a grant/update/backfill with no schema trace. "
    + "There is no applied-migrations ledger in this project to compare "
    + "against: supabase_migrations.schema_migrations does not exist.",
    // MOVED HERE FROM `dimensions` 2026-09-23, ANDREW'S OWN CORRECTION: a
    // bare count with no denominator in `dimensions` reads as neutral
    // bookkeeping. It is not neutral — it is the twelfth blindness, sitting
    // beside the eleven named above rather than after them.
    `${typeUnjudged} of ${typeJudged + typeUnjudged} present column(s) had a `
    + "declared type this check does not recognise and are UNJUDGED for type "
    + "— counted, not guessed at. \"Columns by name and type family\" above "
    + `means ${typeJudged}, not ${typeJudged + typeUnjudged}.`,
  ],
  dimensions: {
    project: REF,
    migration_files: files.length,
    tables_declared: intendedTables.size,
    tables_absent: tablesAbsent,
    columns_absent: columnsAbsent,
    type_mismatch: typeMismatch,
    policies_declared: intendedPolicies.size - 1,
    policies_absent: policiesAbsent,
    policies_unjudgeable: unjudgeablePolicies.length,
    method: "replay create/drop function/table/policy in file and statement order; "
      + "compare function bodies against pg_get_functiondef, tables/columns/policies by existence",
    absent,
    drifted,
  },
  canary: {
    id: "a function name, a column and a policy name no migration could have "
      + "created must each be reported ABSENT",
    observed_failure: allCanariesCaught,
    caught_by: [
      ...(canaryCaught ? ["function-absent"] : []), ...(bodyCanaryCaught ? ["function-drifted"] : []),
      ...(colCanaryCaught ? ["column-absent"] : []), ...(policyCanaryCaught ? ["policy-absent"] : []),
    ],
    findings: [
      canaryCaught ? "[function] caught" : "[function] NOT CAUGHT",
      bodyCanaryCaught ? "[drift] caught" : "[drift] NOT CAUGHT",
      colCanaryCaught ? "[column] caught" : "[column] NOT CAUGHT",
      policyCanaryCaught ? "[policy] caught" : "[policy] NOT CAUGHT",
    ],
  },
});

console.log("");
if (failures.length === 0 && allCanariesCaught) {
  console.log(`PASS — ${compared} function(s), ${tablesCompared} table(s) and ${policiesCompared} `
    + `polic(y/ies) compared, every one matches the repo.`);
  console.log(`Receipt ${receiptPath}`);
  process.exit(0);
}
console.log("!".repeat(74));
for (const f of failures) console.log("FAIL — " + f);
if (!canaryCaught) console.log("FAIL — the ABSENT canary was not caught, so this run proves nothing.");
if (!bodyCanaryCaught) console.log("FAIL — the DRIFTED canary was not caught: the body comparison matches anything.");
if (!colCanaryCaught) console.log("FAIL — the COLUMN canary was not caught: the column comparison matches anything.");
if (!policyCanaryCaught) console.log("FAIL — the POLICY canary was not caught: the policy comparison matches anything.");
console.log("");
console.log("Applying a migration is a schema change and it is Andrew's to authorise.");
console.log(`This check reports and never applies. Receipt ${receiptPath}`);
process.exit(1);
