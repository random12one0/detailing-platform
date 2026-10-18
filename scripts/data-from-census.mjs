// ROADMAP 7.17 — A CENSUS OF EVERY `data-from` ON THE EXAMPLE SITES.
//
//   node scripts/data-from-census.mjs                # the published example pages
//   node scripts/data-from-census.mjs --break=lenient   # sabotage; must go red
//
// Credential-free, no browser, no dev server: it reads docs/tenant-sites/*.html,
// supabase/migrations, supabase/functions and app/src/book/core.js.
//
// WHAT IT ASKS, of each `data-from="…"` on a page that build-examples.mjs
// publishes (/ex1 … /ex5): does the thing it names EXIST? A value resolves when
// it is a key the live `get_public_business_profile` returns, an edge function
// in supabase/functions, a `table.column` the migrations declare, a table, or an
// export of app/src/book/core.js. Anything else — a sentence, a misspelling — is
// named, with its file and line. It would have caught `…profile.addons` (the key
// is `add_ons`) and *"the detailer's Google reviews"*, a sentence standing in as
// a source.
//
// **WHAT IT CANNOT SEE, SAID HERE AND IN THE RECEIPT IN WORDS, BECAUSE ROADMAP
// 7.17 FORBIDS READING THIS AS COVER FOR THE THING IT IS NOT.** It cannot see
// class 1 (a per-mile travel rate), class 2 (a review count or rating) or class 3
// (a deposit). Those numbers carry attributes that name REAL fields — a
// `travel_zones` that holds flat fees, a `testimonials` that holds quotes — and
// then state something the field cannot express. That needs a person asking
// "can this field produce this number?", and a green census says nothing about
// it. Do not tick 7.17 off the back of this script.
//
// ponytail: "exists" is weak on purpose. `get_public_business_profile.x.y` checks
// that `x` and `y` are each SOME key the function writes, not that `y` sits under
// `x`; `calculate-booking.vehicle_size` checks the function, not the field; a
// column is found by a regex over create/alter table, not by a SQL parser. A
// stronger resolver is worth building the day a wrong provenance slips through
// this one.

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { basename, join } from "node:path";
import { fileURLToPath } from "node:url";
import { writeReceipt } from "./receipt.mjs";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const at = (...p) => join(ROOT, ...p);
const BREAK = process.argv.find((a) => a.startsWith("--break="))?.slice(8);
if (BREAK && BREAK !== "lenient") { console.error(`unknown --break=${BREAK}; use lenient`); process.exit(2); }

// ── what a source may be ──
const migrations = readdirSync(at("supabase", "migrations")).filter((f) => f.endsWith(".sql")).sort();
const sql = (f) => readFileSync(at("supabase", "migrations", f), "utf8");

// The live definition is the LAST migration that creates the function; its keys
// are every single-quoted word followed by a comma inside it.
const defining = migrations.filter((f) => /create or replace function public\.get_public_business_profile\(/.test(sql(f))).at(-1);
const body = (() => {
  const s = sql(defining);
  const from = s.search(/create or replace function public\.get_public_business_profile\(/);
  return s.slice(from, s.indexOf("$$;", s.indexOf("$$", from) + 2));
})();
const profileKeys = new Set([...body.matchAll(/'([a-z_]+)'\s*,/g)].map((m) => m[1]));

const tables = new Map(); // table -> Set(columns)
for (const f of migrations) {
  const s = sql(f).replace(/--[^\n]*/g, "");
  for (const m of s.matchAll(/create table (?:if not exists )?(?:public\.)?(\w+)\s*\(([\s\S]*?)\n\s*\)\s*;/gi)) {
    const cols = tables.get(m[1]) ?? new Set();
    for (const l of m[2].split("\n")) {
      const c = l.match(/^\s*(\w+)\s+[a-z]/i)?.[1];
      if (c && !/^(constraint|primary|unique|check|foreign|like|exclude)$/i.test(c)) cols.add(c);
    }
    tables.set(m[1], cols);
  }
  for (const m of s.matchAll(/alter table (?:only )?(?:if exists )?(?:public\.)?(\w+)([^;]*);/gi)) {
    const cols = tables.get(m[1]) ?? new Set();
    for (const c of m[2].matchAll(/add column (?:if not exists )?(\w+)/gi)) cols.add(c[1]);
    tables.set(m[1], cols);
  }
}
const functions = new Set(readdirSync(at("supabase", "functions"), { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name));
const coreSrc = readFileSync(at("app", "src", "book", "core.js"), "utf8");
const coreExports = new Set([...coreSrc.matchAll(/export\s+(?:async\s+)?(?:function|const|let|class)\s+(\w+)/g)].map((m) => m[1]));

/** One `+`-separated term. Returns true when what it names exists. */
function resolveTerm(t) {
  const term = t.trim();
  if (BREAK === "lenient") return term.length > 0;
  let m;
  if ((m = term.match(/^get_public_business_profile\.(\w+)(?:\[\]\.(\w+))?$/))) return profileKeys.has(m[1]) && (!m[2] || profileKeys.has(m[2]));
  if ((m = term.match(/^core\.js\s+(\w+)/))) return coreExports.has(m[1]);
  if (functions.has(term)) return true;
  if ((m = term.match(/^([a-z][\w-]*)\.(\w+)$/)) && functions.has(m[1])) return true;
  if ((m = term.match(/^(\w+)\.(\w+)$/))) return tables.get(m[1])?.has(m[2]) ?? false;
  return /^\w+$/.test(term) && (profileKeys.has(term) || tables.has(term));
}
export const resolves = (value) => value.split("+").every(resolveTerm);

// ── the pages: those build-examples.mjs publishes ──
const SITES = at("docs", "tenant-sites");
const built = readFileSync(at("scripts", "build-examples.mjs"), "utf8");
const published = [...new Set([...built.matchAll(/"([\w-]+\.html)"/g)].map((m) => m[1]))].filter((f) => existsSync(join(SITES, f)));
const everything = readdirSync(SITES).filter((f) => f.endsWith(".html"));

const read = (f) => readFileSync(join(SITES, f), "utf8");
// Comments are prose: several of these headers QUOTE a data-from while explaining it.
const strip = (s) => s.replace(/<!--[\s\S]*?-->/g, (c) => c.replace(/[^\n]/g, " "));
function attrs(f) {
  const s = strip(read(f));
  const out = [];
  for (const m of s.matchAll(/data-from\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) {
    out.push({ file: f, line: s.slice(0, m.index).split("\n").length, value: m[1] ?? m[2] });
  }
  return { out, expected: [...s.matchAll(/data-from\s*=/g)].length };
}

const started_at = new Date().toISOString();
const failures = [], warnings = [];
let assertions = 0;
const check = (ok, msg) => { assertions++; if (!ok) failures.push(msg); };

// the canary: a sentence-as-source and a misspelt key, both of which must be refused
const CANARY = ["the detailer's Google reviews", "get_public_business_profile.addons"];
const canaryCaught = CANARY.every((v) => !resolves(v));
check(canaryCaught, `canary: ${CANARY.filter(resolves).map((v) => `"${v}"`).join(" and ")} resolved as a source`);
// and a known-good one must still resolve, or "refuse everything" would pass the canary
for (const v of ["get_public_business_profile.add_ons", "calculate-booking", "businesses.contact_phone", "core.js stepsFor(addOns)"]) {
  check(resolves(v), `self-test: "${v}" should resolve and does not`);
}

let expectedTotal = 0;
const found = [];
for (const f of published) { const a = attrs(f); expectedTotal += a.expected; found.push(...a.out); }
check(found.length === expectedTotal, `parsed ${found.length} data-from attributes but a second count found ${expectedTotal}`);

const bad = found.filter((o) => !resolves(o.value));
for (const o of bad) failures.push(`${o.file}:${o.line}  data-from="${o.value}"  names nothing the product has`);

const otherBad = everything.filter((f) => !published.includes(f)).flatMap((f) => attrs(f).out).filter((o) => !resolves(o.value));
if (otherBad.length) warnings.push(`${otherBad.length} unresolvable data-from in ${new Set(otherBad.map((o) => o.file)).size} page(s) that are not published (not counted as failures): ${[...new Set(otherBad.map((o) => o.value))].join(" | ")}`);

const distinct = new Map();
for (const o of found) distinct.set(o.value, (distinct.get(o.value) ?? 0) + 1);
console.log(`data-from census — ${published.length} published page(s), ${found.length} attributes, ${distinct.size} distinct values`);
console.log(`resolver: ${profileKeys.size} profile keys (from ${defining}), ${tables.size} tables, ${functions.size} edge functions, ${coreExports.size} core.js exports`);
for (const [v, n] of [...distinct].sort((a, b) => b[1] - a[1])) console.log(`  ${resolves(v) ? "ok     " : "UNKNOWN"} ${String(n).padStart(3)}  ${v}`);
if (failures.length) { console.log(`\nFAILED (${failures.length}):`); for (const f of failures) console.log(`  ${f}`); }
for (const w of warnings) console.log(`\nnote: ${w}`);
console.log("\nTHIS CENSUS CANNOT SEE A PER-MILE RATE (class 1), A REVIEW COUNT OR RATING (class 2) OR A DEPOSIT (class 3):"
  + "\nthose carry attributes naming real fields and then state what the field cannot express. A green run says nothing about them."
  + "\nNOR CAN IT SEE A FIGURE WITH NO data-from AT ALL: an element that carries no attribute is not counted, so taking a false attribute"
  + "\noff turns a red row green. That is the honest outcome for an illustration (the three job cards on /ex1/work, 7.17 ruling of 2026-10-06)"
  + "\nand it is also exactly what hiding a claim would look like. Whether a number belongs without a source is a person's reading.");

if (BREAK) {
  console.log(`\n--break=${BREAK}: ${failures.length ? "went RED, as it must" : "STAYED GREEN — THE SABOTAGE WAS NOT SEEN"}. No receipt written.`);
  process.exit(failures.length ? 1 : 3);
}

const { path } = writeReceipt({
  check_id: "data-from-census",
  started_at,
  status: failures.length ? "fail" : "pass",
  expected_targets: expectedTotal,
  discovered_targets: found.length,
  attempted_targets: found.length,
  completed_targets: found.length,
  skipped_targets: 0,
  assertions_executed: assertions,
  min_assertions: 5,
  failures,
  artifacts: ["scripts/data-from-census.mjs"],
  warnings: [
    "CANNOT SEE class 1 (a per-mile travel rate), class 2 (a review count or rating) or class 3 (a deposit): those numbers carry attributes that name real fields and then state something the field cannot express. A passing census is not cover for ROADMAP 7.17.",
    "CANNOT SEE a figure with no data-from at all: it is not counted, so removing a false attribute turns a red row green. 7.17 ruled that right for the three illustration job cards on /ex1/work, and it is also what hiding a claim would look like.",
    "'Exists' is weak: a profile key is any key the function writes, a function is checked by name and not by field, a column is found by regex over create/alter table.",
    ...warnings,
  ],
  dimensions: {
    break: BREAK || null, // routes a sabotage run to .sabotage.json (ROADMAP 98.3)
    pages: published,
    distinct_values: Object.fromEntries(distinct),
    profile_defined_in: defining,
    cannot_see: ["class 1: a per-mile travel rate", "class 2: a review count or rating", "class 3: a deposit", "a figure with no data-from at all (not counted, so removing a false attribute reads green)"],
  },
  canary: {
    id: "a sentence standing in as a source, and a misspelt profile key",
    observed_failure: canaryCaught,
    caught_by: ["resolves()"],
    findings: [canaryCaught ? "both refused" : "NOT refused — this census would pass the typo it exists to catch"],
  },
});
console.log(`\nreceipt        ${path}   —  validate: node scripts/receipt.mjs`);
process.exit(failures.length ? 1 : 0);
