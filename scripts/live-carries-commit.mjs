// DOES THE RUNNING FUNCTION CARRY ONE COMMIT — AND NOT ANOTHER?
//
//   node scripts/live-carries-commit.mjs --fn=platform-admin --present=99ed3922 \
//     --absent=83a0a740,8bd5d24b,3e002b1d
//   ... --break=swap   # asserts an --absent commit as present; must go red
//
// It reads. It deploys nothing and writes nothing to the database.
//
// WHY THIS AND NOT `deployed-inventory.mjs`. That one asks "is the running copy
// THIS CHECKOUT", which is the wrong question once unpublished commits sit on
// top of the one you care about: it answers DIFFERS and cannot say whether the
// older change underneath is live. ROADMAP 9.1a asked exactly that — is the
// 9.1 payload widening running, while 4.3b/4.3c are not yet published.
//
// SAME METHOD, SAME BLIND SPOT. Comment lines of 30+ characters survive
// transpiling verbatim, so a commit's ADDED comment lines are its fingerprint.
// A commit that added no comment cannot be judged here and the run says so.
// The --absent side only uses lines that were NOT already in the function
// before the earliest absent commit, so a moved line cannot fake an absence.

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { writeReceipt } from "./receipt.mjs";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const PROJECT = "kguqylyzgyzfktkfnhjb";

const envFile = path.join(ROOT, ".env");
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, "utf8").split(/\r?\n/)) {
    const i = line.indexOf("=");
    if (!line || line.startsWith("#") || i < 0) continue;
    const k = line.slice(0, i).trim();
    if (!process.env[k]) process.env[k] = line.slice(i + 1).trim();
  }
}
const { SUPABASE_ACCESS_TOKEN, SUPABASE_PROJECT_REF } = process.env;
if (!SUPABASE_ACCESS_TOKEN || SUPABASE_PROJECT_REF !== PROJECT) {
  console.error(`Needs SUPABASE_ACCESS_TOKEN and SUPABASE_PROJECT_REF=${PROJECT}. Nothing was measured.`);
  process.exit(1);
}

const arg = (k) => (process.argv.find((a) => a.startsWith(`--${k}=`)) || "").split("=")[1] || "";
const FN = arg("fn");
const PRESENT = arg("present").split(",").filter(Boolean);
const ABSENT = arg("absent").split(",").filter(Boolean);
const BREAK = arg("break");
// Code, not comments: literal strings the change put in the source (string
// literals survive transpiling). Closes the "touched no comment" blind spot
// for the strings named. Separate with "|".
const STRINGS = arg("strings").split("|").filter(Boolean);
if (!FN || !PRESENT.length) {
  console.error("Needs --fn=<function> and --present=<sha>[,<sha>]. Nothing was measured.");
  process.exit(1);
}
const started_at = new Date().toISOString();
const git = (...a) => execFileSync("git", a, { cwd: ROOT, encoding: "utf8", maxBuffer: 64 << 20 });

const norm = (x) => x.replace(/\\"/g, '"').replace(/\s+/g, " ").trim();
const commentOf = (line) => {
  const m = line.trim().match(/^(?:\/\/+|\*)\s?(.*)$/);
  return m && m[1] && m[1].trim().length >= 30 ? norm(m[1]) : null;
};
const SCOPE = [`supabase/functions/${FN}`, "supabase/functions/_shared"];

/** Comment lines a commit ADDED inside this function or _shared. */
const addedComments = (sha) => {
  const out = new Set();
  for (const l of git("show", "--format=", sha, "--", ...SCOPE).split(/\r?\n/)) {
    if (!l.startsWith("+") || l.startsWith("+++")) continue;
    const c = commentOf(l.slice(1));
    if (c) out.add(c);
  }
  return out;
};
/** Every comment line in this function's files at a revision. */
const commentsAt = (rev) => {
  const out = new Set();
  const files = git("ls-tree", "-r", "--name-only", rev, "--", ...SCOPE).split(/\r?\n/).filter(Boolean);
  for (const f of files) {
    for (const l of git("show", `${rev}:${f}`).split(/\r?\n/)) {
      const c = commentOf(l);
      if (c) out.add(c);
    }
  }
  return out;
};

const present = new Set(PRESENT.flatMap((s) => [...addedComments(s)]));
let absent = new Set();
if (ABSENT.length) {
  // Oldest absent commit's parent = what was already there before any of them.
  const oldest = git("rev-list", "--no-walk=sorted", ...ABSENT).trim().split(/\s+/).pop();
  const before = commentsAt(`${oldest}^`);
  absent = new Set(ABSENT.flatMap((s) => [...addedComments(s)]).filter((c) => !before.has(c) && !present.has(c)));
}

const api = async (p, asText) => {
  const r = await fetch(`https://api.supabase.com/v1/projects/${PROJECT}${p}`,
    { headers: { Authorization: `Bearer ${SUPABASE_ACCESS_TOKEN}` } });
  if (!r.ok) throw new Error(`${p}: ${r.status}`);
  return asText ? r.text() : r.json();
};
const meta = await api(`/functions/${FN}`);
const bundle = norm(await api(`/functions/${FN}/body`, true));

// --break=swap: the absent lines are asserted PRESENT. They are not in the
// bundle, so the run must go red — that is the proof the present side can fail.
const expectIn = BREAK === "swap" ? [...present, ...absent, ...STRINGS] : [...present, ...STRINGS.map(norm)];
const expectOut = BREAK === "swap" ? [] : [...absent];
const missing = expectIn.filter((c) => !bundle.includes(c));
const leaked = expectOut.filter((c) => bundle.includes(c));

// Canary, every run: a sentence nobody wrote must read as NOT in the bundle.
const CANARY = "9.1a canary — this sentence was never written into any deployed function";
const canaryCaught = !bundle.includes(norm(CANARY));

const failures = [];
if (present.size < 5) failures.push(`only ${present.size} comment line(s) fingerprint ${PRESENT.join(",")} — too few to judge`);
if (ABSENT.length && absent.size < 5) failures.push(`only ${absent.size} comment line(s) fingerprint ${ABSENT.join(",")} — too few to judge`);
if (missing.length) failures.push(`${missing.length} of ${expectIn.length} expected line(s) are NOT in the running ${FN}: ${missing.slice(0, 3).join(" | ")}`);
if (leaked.length) failures.push(`${leaked.length} of ${expectOut.length} line(s) from an unpublished commit ARE in the running ${FN}: ${leaked.slice(0, 3).join(" | ")}`);
if (!canaryCaught) failures.push("canary sentence was found in the bundle — the comparison cannot fail");

const n = expectIn.length + expectOut.length;
const { path: receiptPath } = writeReceipt({
  check_id: "live-carries-commit",
  started_at,
  status: failures.length ? "fail" : "pass",
  expected_targets: n,
  discovered_targets: n,
  attempted_targets: n,
  completed_targets: n,
  skipped_targets: 0,
  assertions_executed: n + 1,
  min_assertions: 10,
  failures,
  warnings: BREAK ? [`run with --break=${BREAK}; this receipt is a sabotage, not a result`] : [],
  artifacts: ["scripts/live-carries-commit.mjs"],
  canary: { id: "never-written-sentence", observed_failure: canaryCaught },
  dimensions: {
    project: PROJECT, function: FN, live_version: meta.version,
    live_updated_at: new Date(Number(meta.updated_at)).toISOString(),
    present_commits: PRESENT, absent_commits: ABSENT,
    present_lines_found: `${expectIn.length - missing.length} of ${expectIn.length}`,
    absent_lines_absent: `${expectOut.length - leaked.length} of ${expectOut.length}`,
    ...(BREAK ? { break: BREAK } : {}),
  },
});

console.log(`${FN} on ${PROJECT}: live v${meta.version}, deployed ${new Date(Number(meta.updated_at)).toISOString()}`);
console.log(`  carries ${PRESENT.join(",")}: ${expectIn.length - missing.length} of ${expectIn.length} lines found (comments, plus any --strings)`);
if (ABSENT.length) console.log(`  lacks ${ABSENT.join(",")}: ${expectOut.length - leaked.length} of ${expectOut.length} comment lines absent`);
console.log(`  canary (a sentence nobody wrote) read as absent: ${canaryCaught}`);
for (const f of failures) console.log(`FAIL - ${f}`);
console.log(`${failures.length ? "FAIL" : "PASS"}  receipt ${receiptPath}`);
process.exit(failures.length ? 1 : 0);
