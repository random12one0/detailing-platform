// THE CRON'S OWN CALL, ANSWERED BY THE REAL HANDLER. ROADMAP 0.11d3a.
//
//   node tests/photo-cron-call.test.mjs
//   CRON_BREAK=no-timeout node tests/photo-cron-call.test.mjs
//
// Credential-free, no network, no database, no R2, no Deno, no dev server. It
// reads `supabase/migrations/` and imports two `.ts` modules Node strips the
// types from.
//
// ---------------------------------------------------------------------------
// WHY THIS EXISTS, AND WHY IT IS NOT A SECOND COPY OF ANYTHING
// ---------------------------------------------------------------------------
// ROADMAP 0.11d criterion 4 asks that **a CRON-TRIGGERED run** record its five
// drift numbers in `job_heartbeats`. Two checks already stand either side of
// that sentence and neither covers the middle of it:
//
//   * `tests/photo-reconcile.test.mjs` runs the handler — with a request IT
//     WROTE: `new Request("https://x.test/", { method: "POST", body: "{}" })`.
//     A handler that answers that one says nothing about the call pg_cron
//     actually makes.
//   * `tests/photo-reconcile-sql.test.mjs` runs the migration on PGlite and
//     reads the schedule back. Its own header says what it stops short of:
//     *"that pg_cron runs the entry **or that the function answers it**.
//     Neither is checked anywhere short of the live project."*
//
// The second half of that sentence is buildable today and this file is it. The
// request handed to `handlePhotoReconcile` below is **derived from the
// migration's own `net.http_post` arguments** — url, headers and body parsed
// out of the SQL — so when the SQL and the function stop agreeing, this goes
// red. pg_cron actually firing is the half that still needs the release, and
// the receipt names it UNJUDGEABLE rather than folding it into the pass.
//
// ---------------------------------------------------------------------------
// WHAT IT FOUND, WHICH IS WHY THERE IS A MIGRATION BESIDE IT
// ---------------------------------------------------------------------------
// `20261006060000_photo_reconcile_cron.sql` passed **no
// `timeout_milliseconds`**, so pg_net would have abandoned the nightly call
// after its 5,000 ms default. That is, to the argument,
// `20260913001000_cron_http_timeout.sql`'s own fault three weeks later: *37 of
// the last 48 calls `timed_out = true`* against a healthy function taking
// 9,735 ms, and eighteen hours of emails that never went out. **And
// `photo-reconcile` is the worst candidate for five seconds in the project** —
// it lists the whole bucket and reads the whole table.
// `cron.job_run_details` would have said `succeeded` the whole time, because
// `net.http_post` only queues; the first visible sign would have been a
// stopped-job email 25 hours later. Repaired by
// `20261009120000_photo_reconcile_cron_timeout.sql`, and
// `CRON_BREAK=no-timeout` puts the five-second default back and reddens.
//
// ---------------------------------------------------------------------------
// BREAK IT ON PURPOSE — `CRON_BREAK`, AN ENV VAR AND NOT A FLAG
// ---------------------------------------------------------------------------
// `docs/gotchas.md` 104: `node --test <file> --break=x` never reaches the
// file's argv, so a sabotage switched on the obvious way is switched off and
// prints the same green a caught one prints. This file is run directly and
// reads `process.env`.
//
//   no-timeout   strips `timeout_milliseconds` from the effective entry — the
//                defect this file found, exactly as it was.
//   wrong-ref    points the cron at `adtlnvihwrcqcasqcjwd`, Andrew's real
//                business. The security canary; section 2 must refuse it.
//   wrong-slug   mis-spells the function in the URL — a typo that installs
//                fine and then never runs anything, for ever.
//   hourly       reschedules to `0 * * * *`, more often than the handler's own
//                `MIN_INTERVAL_MS`, so every run but the first would answer
//                `skipped: too_soon` and the heartbeat would go stale while
//                the job was "working".
//   one-drift    takes four of the five drift kinds out of the fixture.
//   limit        makes the rate limiter refuse, so the handler 429s and never
//                stamps.
//   blunt-judge  blinds `judge()` — the one rule section 4's assertions and
//                section 6's canary both run (`docs/gotchas.md` 95), so the
//                canary is what notices, and a canary that cannot fail is
//                decoration.
//
// An unrecognised `CRON_BREAK` exits 2 and writes no receipt, so a typo cannot
// be mistaken for a catch.
//
// ---------------------------------------------------------------------------
// WHAT IT DOES NOT PROVE, said plainly
// ---------------------------------------------------------------------------
//   * that pg_cron fires the entry at all, or that the gateway lets an
//     anonymous call through. Both need the release.
//   * that R2 answers the listing, or that `note_heartbeat` writes the row in
//     the live database. `stamp` is in-memory here.
// All four are in the receipt's `unjudgeable`, by name.

import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { writeReceipt } from "../scripts/receipt.mjs";
import * as rec from "../supabase/functions/_shared/photoReconcile.ts";

const started_at = new Date().toISOString();
const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BREAK = process.env.CRON_BREAK || "";
const KNOWN = ["no-timeout", "wrong-ref", "wrong-slug", "hourly", "one-drift", "limit", "blunt-judge"];
if (BREAK && !KNOWN.includes(BREAK)) {
  console.error(`Unknown CRON_BREAK=${BREAK}. Known: ${KNOWN.join(", ")}.`);
  process.exit(2);
}

let passed = 0, assertions = 0;
const failures = [];
const check = (name, ok, got = "") => {
  assertions++;
  if (ok) { passed++; console.log(`  ok    ${name}`); return true; }
  failures.push(got ? `${name} - got ${got}` : name);
  console.log(`  FAIL  ${name}${got ? ` - got ${got}` : ""}`);
  return false;
};

// -- THE RULE, ONCE --------------------------------------------------------
/** The five drift numbers criterion 4 names. One function, run by section 4's
 *  assertions and by section 6's canary, so `blunt-judge` blinds both at once. */
export function judge(detail) {
  const d = detail ?? {};
  if (BREAK === "blunt-judge") {
    return { orphans: true, missing: true, mismatched: true, unknown_size_rows: true, misfiled: true };
  }
  const num = (key) => typeof d[key] === "number" && Number.isFinite(d[key]);
  return {
    orphans: num("orphans"), missing: num("missing"), mismatched: num("mismatched"),
    unknown_size_rows: num("unknown_size_rows"), misfiled: num("misfiled"),
  };
}
const FIVE = ["orphans", "missing", "mismatched", "unknown_size_rows", "misfiled"];

// -- 1 . THE SCHEDULE, PARSED OUT OF THE MIGRATIONS THEMSELVES -------------
// Nothing retyped: every figure sections 2 to 4 use comes out of the SQL, so
// the SQL and the function cannot drift apart without this going red.
const MIGDIR = path.join(REPO, "supabase", "migrations");
const MIGS = readdirSync(MIGDIR).filter((f) => f.endsWith(".sql")).sort();

/** Every `cron.schedule('<name>', '<expr>', $job$ ... $job$)` in one file. */
function schedules(sql) {
  const out = [];
  const re = /cron\.schedule\(\s*'([^']+)'\s*,\s*'([^']+)'\s*,\s*\$job\$([\s\S]*?)\$job\$\s*\)/g;
  for (let m; (m = re.exec(sql));) out.push({ name: m[1], expr: m[2], job: m[3] });
  return out;
}
/** One `net.http_post` call's arguments. The header list is read with a
 *  negated class that stops at the first `)` - safe only because there is no
 *  `)` inside it, which 1e asserts rather than assumes (`gotchas` 116). */
function post(job) {
  const url = (job.match(/url\s*:=\s*'([^']*)'/) || [])[1] ?? null;
  const headers = (job.match(/headers\s*:=\s*(jsonb_build_object\([^)]*\))/) || [])[1] ?? null;
  const body = (job.match(/body\s*:=\s*'([^']*)'::jsonb/) || [])[1] ?? null;
  const t = (job.match(/timeout_milliseconds\s*:=\s*(\d+)/) || [])[1];
  return { url, headers, body, timeout: t === undefined ? null : Number(t) };
}

const JOB = rec.JOB;                 // production's own name for this job
const ours = [];                     // every migration that schedules it, in apply order
for (const f of MIGS) {
  let sql = readFileSync(path.join(MIGDIR, f), "utf8");
  if (BREAK === "no-timeout") sql = sql.replace(/,\s*\n\s*timeout_milliseconds\s*:=\s*\d+/g, "");
  if (BREAK === "wrong-ref") sql = sql.replace(/kguqylyzgyzfktkfnhjb/g, "adtlnvihwrcqcasqcjwd");
  if (BREAK === "wrong-slug") sql = sql.replace(/functions\/v1\/photo-reconcile/g, "functions/v1/photo-reconciles");
  if (BREAK === "hourly") sql = sql.replace(/'40 3 \* \* \*'/g, "'0 * * * *'");
  for (const s of schedules(sql)) if (s.name === JOB) ours.push({ file: f, ...s, ...post(s.job) });
}

console.log("1. the entry, as the migrations declare it");
// AN EQUALITY, not a floor: a third reschedule is something somebody has to
// justify, and `docs/gotchas.md` 98 is about exactly the slack a floor leaves.
check("1a . exactly two migrations schedule photo-reconcile", ours.length === 2,
  `${ours.length} (${ours.map((o) => o.file).join(", ")})`);
const eff = ours[ours.length - 1] || {};     // last applied wins: cron.schedule replaces by name
const first = ours[0] || {};
check("1b . the one that wins is the timeout migration",
  eff.file === "20261009120000_photo_reconcile_cron_timeout.sql", String(eff.file));
check("1c . the reschedule did not quietly change the cadence",
  !!eff.expr && eff.expr === first.expr, `${first.expr} then ${eff.expr}`);
check("1d . it is daily at 03:40 UTC", eff.expr === "40 3 * * *", String(eff.expr));
check("1e . the header argument holds no bracket, so reading to the first ')' is whole",
  typeof eff.headers === "string" && eff.headers.endsWith(")") && eff.headers.slice(0, -1).indexOf(")") === -1,
  String(eff.headers));
check("1f . it posts Content-Type application/json and an empty object",
  eff.headers === "jsonb_build_object('Content-Type', 'application/json')" && eff.body === "{}",
  `${eff.headers} / ${eff.body}`);

// -- 2 . WHERE IT POINTS. A security question before it is a plumbing one ---
console.log("\n2. the address");
const HOSTS = new Set();
for (const f of MIGS) {
  const sql = readFileSync(path.join(MIGDIR, f), "utf8");
  for (const m of sql.matchAll(/https:\/\/([a-z0-9-]+)\.supabase\.co\/functions\/v1\/([a-z-]+)/g)) {
    if (m[2] !== JOB) HOSTS.add(m[1]);       // the entries already installed and working
  }
}
check("2a . the cron entries already installed all name one project", HOSTS.size === 1, [...HOSTS].join(", "));
const u = (() => { try { return new URL(eff.url); } catch { return null; } })();
const ref = u ? u.hostname.split(".")[0] : null;
check("2b . the reconcile names that same project", !!ref && HOSTS.has(ref), String(ref));
check("2c . and it is this platform's database, never the real business",
  ref === "kguqylyzgyzfktkfnhjb" && ref !== "adtlnvihwrcqcasqcjwd", String(ref));
const slug = u ? u.pathname.replace("/functions/v1/", "") : null;
check("2d . the slug is production's own name for this job", slug === JOB, `${slug} vs ${JOB}`);
check("2e . and it names a function that exists in this checkout",
  !!slug && existsSync(path.join(REPO, "supabase", "functions", slug, "index.ts")), String(slug));

// -- 3 . HOW LONG pg_net WILL WAIT. THE DEFECT THIS FILE FOUND -------------
console.log("\n3. the timeout nobody passed");
check("3a . the winning entry passes timeout_milliseconds at all",
  typeof eff.timeout === "number", String(eff.timeout));
check("3b . it is 60000", eff.timeout === 60000, String(eff.timeout));
check("3c . at least the 30000 the 2026-09-13 repair chose for the sweep",
  eff.timeout >= 30000, String(eff.timeout));
check("3d . and inside the heartbeat's own staleness window, so a slow run still reports in time",
  eff.timeout <= rec.STALE_AFTER_SECONDS * 1000, `${eff.timeout} vs ${rec.STALE_AFTER_SECONDS * 1000}`);
// The cadence must be LESS often than the handler's own floor, or every run but
// the first answers `skipped: too_soon` and the heartbeat goes stale.
const DAY_MS = 24 * 60 * 60 * 1000;
check("3e . a daily call is never refused as too soon",
  eff.expr === "40 3 * * *" && DAY_MS > rec.MIN_INTERVAL_MS, `${eff.expr} against ${rec.MIN_INTERVAL_MS}ms`);

// -- 4 . THE REAL HANDLER, ANSWERING THE CRON'S OWN REQUEST ----------------
const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
const BOOK = "44444444-4444-4444-8444-444444444444";
const p = (n) => `55555555-5555-4555-8555-5555555555${String(n).padStart(2, "0")}`;
const k = (biz, n) => `${biz}/${BOOK}/${p(n)}.jpg`;
const MB = 1024 * 1024;

// One of every drift kind, so all five numbers are non-zero and a report that
// counted only four could not pass. `one-drift` keeps the matched pair only.
const FULL = {
  objects: [
    { key: k(A, 1), bytes: MB },          // matched
    { key: k(A, 2), bytes: 3 * MB },      // the row says 1 MB -> mismatch
    { key: k(A, 4), bytes: MB },          // the row records no size -> unknown
    { key: k(A, 9), bytes: 5 * MB },      // no row at all -> orphan
    { key: k(B, 7), bytes: 2 * MB },      // the misfiled row's object -> orphan under B
  ],
  rows: [
    { business_id: A, path: k(A, 1), bytes: MB },
    { business_id: A, path: k(A, 2), bytes: MB },
    { business_id: A, path: k(A, 3), bytes: MB },      // no object -> missing
    { business_id: A, path: k(A, 4), bytes: null },    // unknown size
    { business_id: A, path: k(B, 7), bytes: 2 * MB },  // filed under B -> misfiled
  ],
};
const LEAN = { objects: [FULL.objects[0]], rows: [FULL.rows[0]] };
const world = BREAK === "one-drift" ? LEAN : FULL;

const seen = { stamps: [], limits: [], listed: 0, logs: [] };
const deps = {
  now: () => new Date("2026-10-09T03:40:30Z"),
  withinLimits: async (l) => { seen.limits.push(...l); return BREAK !== "limit"; },
  // The handler may reach for nothing but `list`: a reconcile that could delete
  // is a different program (`photoReconcile.ts`'s own header).
  r2: new Proxy({}, {
    get(_t, prop) {
      if (prop !== "list") throw new Error("the handler reached for " + String(prop));
      return async () => { seen.listed++; return { objects: world.objects, next: null }; };
    },
  }),
  missing: [],
  // The migration seeds `{"seeded": true}`, which `photo-reconcile/index.ts`
  // filters out, so the FIRST cron call is not refused as too soon.
  lastRun: async () => null,
  loadRows: async () => world.rows,
  allowance: async () => ({ total_bytes: 1024 * MB, share_bytes: 10 * MB }),
  stamp: async (d) => { seen.stamps.push(d); },
  log: (...a) => seen.logs.push(a.join(" ")),
};

// THE REQUEST pg_net WILL SEND, built from what section 1 parsed - nothing
// retyped, and no Authorization header, because `net.http_post` sends none.
const headerPairs = [...String(eff.headers ?? "").matchAll(/'([^']*)'\s*,\s*'([^']*)'/g)].map((m) => [m[1], m[2]]);
const cronRequest = new Request(eff.url ?? "https://invalid.test/", {
  method: "POST", headers: headerPairs, body: eff.body ?? "",
});

console.log("\n4. the function answers that exact call");
check("4a . the request carries no Authorization header, the way pg_net sends it",
  !cronRequest.headers.has("authorization"));
check("4b . and it carries the Content-Type the migration names",
  cronRequest.headers.get("content-type") === "application/json", String(cronRequest.headers.get("content-type")));

const res = await rec.handlePhotoReconcile(cronRequest, deps);
const body = await res.json();
check("4c . the handler answers 200, not a refusal", res.status === 200, String(res.status));
check("4d . it says it RAN, rather than skipped", body.ran === true, JSON.stringify(body).slice(0, 120));
check("4e . it read the bucket once and stamped the heartbeat once",
  seen.listed === 1 && seen.stamps.length === 1, `listed ${seen.listed}, stamps ${seen.stamps.length}`);

const detail = seen.stamps[0];
const v = judge(detail);
for (const f of FIVE) {
  check(`4f.${f} . the stamped row carries a number for it`, v[f] === true, JSON.stringify(detail?.[f]));
}
// And the numbers are the fixture's, so a report with five zeroes where five
// drifts exist cannot pass.
const EXPECT = { orphans: 2, missing: 1, mismatched: 1, unknown_size_rows: 1, misfiled: 1 };
for (const [f, n] of Object.entries(EXPECT)) {
  check(`4g.${f} . and it is ${n}, the drift the fixture really holds`, detail?.[f] === n, String(detail?.[f]));
}
check("4h . and the row says it is not clean", detail?.clean === false, String(detail?.clean));

// -- 5 . THE LIMIT THE HANDLER ITSELF ASKS FOR -----------------------------
// Read off the argument production code passed, not out of its source: a limit
// tightened to nothing would stop the nightly job with nothing to say so.
console.log("\n5. the rate limit, as production asked for it");
check("5a . exactly one limit was consulted", seen.limits.length === 1, String(seen.limits.length));
const lim = seen.limits[0] || {};
check("5b . it is bucketed under this job's own name", lim.bucket === JOB, String(lim.bucket));
check("5c . and one call a day fits inside it",
  lim.limit >= 1 && lim.windowSeconds <= 86400, `${lim.limit} per ${lim.windowSeconds}s`);

// -- 6 . THE CANARY, RE-JUDGED EVERY RUN -----------------------------------
// The shape the heartbeat had before criterion 4: a run that reported clean or
// not and counted nothing. A judge blinded by `blunt-judge` passes it, which is
// the only thing that proves 4f is live rather than decoration.
console.log("\n6. the judge still catches a heartbeat that counts nothing");
const PRE_FIX = { clean: true, ran_at: "2026-10-09T03:40:30Z" };
const pv = judge(PRE_FIX);
const canaryCaught = FIVE.every((f) => pv[f] === false);
check("6a . a heartbeat with no drift numbers is judged a failure on all five", canaryCaught, JSON.stringify(pv));
check("6b . and the opposite direction: the real one passes all five", FIVE.every((f) => v[f] === true));

const failed = failures.length;
console.log(`\n${passed} passed, ${failed} failed, ${assertions} assertions.`);
if (BREAK) console.log(`  note  CRON_BREAK=${BREAK} was set: this run is a sabotage and MUST be red.`);

// SOMETHING FOR A PERSON TO LOOK AT, which the grader requires and is right to:
// a check whose whole output is a colour cannot be argued with. This is the two
// statements side by side - the one the migrations install now and the one they
// installed before - and the heartbeat row the real handler actually produced
// from the cron's own request, so a reader can see the five numbers rather than
// take the verdict on trust.
const table = [
  "ROADMAP 0.11d3a - the cron's own call, answered by the real handler",
  "",
  "THE ENTRY, in apply order (cron.schedule replaces by name, so the last one wins):",
  ...ours.map((o, i) => `  ${i === ours.length - 1 ? "NOW  " : "WAS  "} ${o.file}`
    + `
         ${o.expr}  ->  ${o.url}`
    + `
         timeout_milliseconds: ${o.timeout === null ? "NOT PASSED - pg_net gives up after 5000ms" : o.timeout}`),
  "",
  `THE REQUEST BUILT FROM IT: POST ${eff.url}`,
  `  headers: ${JSON.stringify(Object.fromEntries(cronRequest.headers))}`,
  `  body:    ${eff.body}`,
  "",
  `THE ANSWER: ${res.status}  ran=${body.ran}`,
  "",
  "THE HEARTBEAT ROW IT STAMPED:",
  ...FIVE.map((f) => `  ${f.padEnd(20)} ${detail?.[f]}`),
  `  ${"clean".padEnd(20)} ${detail?.clean}`,
  "",
  "WAS (the pre-criterion-4 heartbeat shape, re-judged every run):",
  `  ${JSON.stringify(PRE_FIX)}`,
  `  judged: ${JSON.stringify(pv)}`,
].join("\n") + "\n";
writeFileSync(path.join(REPO, "receipts", "photo-cron-call.txt"), table);

const { path: receiptPath } = writeReceipt({
  check_id: "photo-cron-call",
  started_at,
  status: failed ? "fail" : "pass",
  // The two migrations that schedule this job. An equality, asserted in 1a.
  expected_targets: 2,
  discovered_targets: ours.length,
  attempted_targets: ours.length,
  completed_targets: ours.length,
  skipped_targets: 0,
  assertions_executed: assertions,
  min_assertions: 37,
  assertion_floor: "6 in s1 + 5 in s2 + 5 in s3 + (2 + 3 + 5 judged + 5 figures + 1) in s4 + 3 in s5 + 2 in s6 "
    + "= 37. DECLARED STRUCTURAL, and stated as an equality rather than with slack under it: every check() "
    + "runs unconditionally, with no early return and no conditional section, and the only multipliers are "
    + "FIVE and EXPECT, whose length is the criterion's own five drift kinds. So the count is fixed by the "
    + "question list and cannot fall without a diff somebody has to justify - a tripwire on the code rather "
    + "than a run-time check (`docs/gotchas.md` 98: a ceiling with room in it is how 196 came to sit over an "
    + "actual 192).",
  canary: {
    id: "a-heartbeat-that-counts-nothing",
    observed_failure: canaryCaught,
    what: "the pre-criterion-4 heartbeat shape: clean true or false and not one of the five drift numbers",
    rule: FIVE.join(" + "),
  },
  failures,
  artifacts: ["receipts/photo-cron-call.txt"],
  dimensions: {
    roadmap: "0.11d3a",
    criterion: "a cron-triggered photo-reconcile run records numeric drift in job_heartbeats",
    entries: ours.map((o) => ({ file: o.file, expr: o.expr, timeout_ms: o.timeout })),
    cron_url: eff.url ?? null,
    cron_body: eff.body ?? null,
    cron_headers: eff.headers ?? null,
    stamped: detail ? Object.fromEntries(FIVE.map((f) => [f, detail[f]])) : null,
    rate_limit: lim,
    sabotage: BREAK || null,
    unjudgeable: [
      "that pg_cron fires the entry - the schedule is not installed; it is FOR-ANDREW step 9f",
      "that the gateway admits the anonymous call - photo-reconcile is undeployed",
      "that R2 answers the listing - no R2 credential exists outside the edge-function secrets",
      "that note_heartbeat writes the row in the live database - stamp is in-memory here",
    ],
  },
  warnings: [
    "The five numbers are asserted on the detail handed to stamp(), not on a row read back from Postgres.",
  ],
});
console.log(`\nreceipt  ${receiptPath}  -  validate: node scripts/receipt.mjs`);
process.exit(failed ? 1 : 0);
