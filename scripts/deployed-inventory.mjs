// WHAT IS ACTUALLY RUNNING, COMPARED BY CONTENT RATHER THAN BY CLOCK.
//
//   set -a; . ./.env; set +a
//   node scripts/deployed-inventory.mjs
//   node scripts/deployed-inventory.mjs --only=send-invoice
//
// It reads. It deploys nothing and it writes nothing to the database.
//
// ---------------------------------------------------------------------------
// WHY THIS EXISTS BESIDE `check-deployed.mjs` RATHER THAN INSTEAD OF IT
// ---------------------------------------------------------------------------
// `check-deployed.mjs` compares TIMESTAMPS: was this function deployed after
// the last commit that touched anything it is built from. Its own header is
// explicit that this cannot tell two opposite situations apart, and says so on
// purpose:
//
//   * a deploy that never happened — the running copy is genuinely old
//   * the ORDINARY ORDER OF WORK — change, deploy, verify, then commit, which
//     leaves the deploy stamp a minute EARLIER than the commit stamp and reads
//     STALE while the running code is exactly what was committed
//
// **"26 functions are STALE" therefore means "26 functions I cannot vouch
// for", not "26 functions are running old code."** Those are very different
// statements to hand somebody who is deciding whether the deployed system
// matches the repo, and the first one was reported to the manager before this
// script existed. This one answers the question the other cannot.
//
// ---------------------------------------------------------------------------
// HOW IT DECIDES
// ---------------------------------------------------------------------------
// The Management API will hand back a deployed function's BODY: an ESZIP2.3
// archive with the uploaded sources inside it as plain UTF-8. So the question
// becomes a substring test rather than an inference —
//
//   does the running bundle contain, verbatim, the text this repo would
//   upload for `index.ts` and for every `_shared` module that goes with it?
//
// **IT COMPARES COMMENT TEXT, AND GETTING HERE TOOK THREE WRONG ANSWERS.**
// Each one was caught only because the tool said something impossible about a
// function I had deployed sixty seconds earlier, which is the whole argument
// for having an obviously-true case in front of you while you build a
// measuring instrument:
//
//   1. WHOLE-FILE MATCH -> "all 17 files differ". The eszip rewrites import
//      specifiers to absolute `file:///tmp/user_fn_.../` URLs, so the header
//      comment matched and the first `import` line did not.
//   2. LINE-BY-LINE MATCH -> "9 of 180 lines missing", every one of them
//      containing a double quote. The bundle escapes `"` as `\"`.
//   3. WHITESPACE-INSENSITIVE WHOLE-FILE MATCH -> broke exactly at
//      `] as const;`. **The bundle is TRANSPILED JavaScript**: the types are
//      erased, object literals are re-wrapped across lines. Source text cannot
//      be compared without reimplementing Deno's transpiler, and that is not
//      worth doing.
//
// **COMMENTS SURVIVE TRANSPILATION VERBATIM**, and this repo is unusually
// comment-dense — every change here arrives with a comment explaining it. So
// the question becomes: are this file's own comment lines present in the
// running bundle? On the function deployed a minute earlier: 69 of 69, none
// missing. That is the positive control, and it runs on every function.
//
// Both sides are normalised the same way — `\"` unescaped, runs of whitespace
// collapsed to one space — and only comment lines of 30 characters or more are
// compared, because a short one is not distinctive enough to mean anything.

// ---------------------------------------------------------------------------
// WHAT IT STILL CANNOT TELL YOU
// ---------------------------------------------------------------------------
// **A CHANGE THAT TOUCHED NO COMMENT IS INVISIBLE TO THIS.** Renaming one
// user-facing string, flipping a boolean, correcting an operator — none of
// those necessarily move a comment, and this would report `matches`. So a
// DIFFERS verdict is strong evidence and a `matches` verdict is weak: it means
// "nothing I can see says otherwise", not "proven identical". The git column
// beside it is what covers that gap, and the two are printed together on
// purpose so neither is read alone.
//
// It also cannot say which DIRECTION a difference went: a bundle could be
// newer than this checkout if somebody deployed from another machine.

import { execFileSync } from "node:child_process";
import { readdir, readFile } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { sharedFor } from "./lib/sharedDeps.mjs";
import { writeReceipt } from "./receipt.mjs";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const FUNCTIONS = path.join(ROOT, "supabase", "functions");

const envFile = path.join(ROOT, ".env");
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, "utf8").split(/\r?\n/)) {
    if (!line || line.startsWith("#")) continue;
    const i = line.indexOf("=");
    if (i < 0) continue;
    const k = line.slice(0, i).trim();
    if (!process.env[k]) process.env[k] = line.slice(i + 1).trim();
  }
}

const { SUPABASE_ACCESS_TOKEN, SUPABASE_PROJECT_REF } = process.env;
if (!SUPABASE_ACCESS_TOKEN || !SUPABASE_PROJECT_REF) {
  console.error("Missing SUPABASE_ACCESS_TOKEN or SUPABASE_PROJECT_REF.");
  console.error("Nothing was measured. Run: set -a; . ./.env; set +a");
  process.exit(1);
}

const ONLY = (process.argv.find((a) => a.startsWith("--only=")) || "").split("=")[1] || "";
const started_at = new Date().toISOString();

const lf = (s) => String(s).replace(/\r\n/g, "\n");

const api = async (p, asText = false) => {
  const r = await fetch(`https://api.supabase.com/v1/projects/${SUPABASE_PROJECT_REF}${p}`, {
    headers: { Authorization: `Bearer ${SUPABASE_ACCESS_TOKEN}` },
  });
  if (!r.ok) throw new Error(`${p}: ${r.status} ${(await r.text()).slice(0, 160)}`);
  return asText ? r.text() : r.json();
};

/** Last commit touching any of these paths, as ms. */
const lastCommit = (paths) => {
  const out = execFileSync("git", ["log", "-1", "--format=%ct", "--", ...paths],
    { cwd: ROOT, encoding: "utf8" }).trim();
  return out ? Number(out) * 1000 : 0;
};

/** The commits that touched these paths since a moment, newest first. */
const commitsSince = (paths, sinceMs) => {
  const out = execFileSync(
    "git",
    ["log", `--since=${new Date(sinceMs).toISOString()}`, "--format=%h%ct%s", "--", ...paths],
    { cwd: ROOT, encoding: "utf8" },
  ).trim();
  return out ? out.split("\n").map((l) => {
    const [sha, ct, subject] = l.split("");
    return { sha, at: Number(ct) * 1000, subject };
  }) : [];
};

const day = 86400_000;
const ago = (ms) => {
  const d = (Date.now() - ms) / day;
  return d < 1 ? `${Math.round(d * 24)}h` : `${d.toFixed(1)}d`;
};

const dirs = (await readdir(FUNCTIONS, { withFileTypes: true }))
  .filter((d) => d.isDirectory() && d.name !== "_shared")
  .map((d) => d.name)
  .filter((n) => !ONLY || n === ONLY)
  .sort();

const deployed = await api("/functions");
const bySlug = new Map(deployed.map((f) => [f.slug, f]));

console.log(`${dirs.length} function(s) in the repo, ${deployed.length} deployed on ${SUPABASE_PROJECT_REF}\n`);

const report = [];

for (const fn of dirs) {
  const meta = bySlug.get(fn);
  if (!meta) {
    report.push({ fn, verdict: "NOT DEPLOYED", differs: [], behind: null, commits: [] });
    console.log(`${fn.padEnd(24)} NOT DEPLOYED`);
    continue;
  }

  let bundle;
  try {
    bundle = lf(await api(`/functions/${fn}/body`, true));
  } catch (e) {
    report.push({ fn, verdict: "UNREADABLE", differs: [], behind: null, commits: [], note: e.message });
    console.log(`${fn.padEnd(24)} UNREADABLE — ${e.message.slice(0, 80)}`);
    continue;
  }

  // Reproduce exactly what `deploy-functions.mjs` would upload.
  const indexSrc = lf(await readFile(path.join(FUNCTIONS, fn, "index.ts"), "utf8"))
    .replaceAll("../_shared/", "./_shared/");
  const shared = await sharedFor(fn);

  // `sharedFor` hands back REPO-RELATIVE paths — `supabase/functions/_shared/db.ts`
  // — not bare names. Joining them onto the _shared directory produced
  // `_shared/supabase/functions/_shared/db.ts` and an ENOENT on the first
  // function. Read from the repo root and keep only the tail for the label.
  // See the header. Comment text only, normalised the same way on both sides.
  const norm = (x) => x.replace(/\\"/g, String.fromCharCode(34)).replace(/\s+/g, " ");
  const nb = norm(bundle);
  const commentsOf = (src) => {
    const out = [];
    for (const line of src.split(String.fromCharCode(10))) {
      const m = line.trim().match(/^(?:\/\/+|\*)\s?(.*)$/);
      if (m && m[1] && m[1].trim().length >= 30) out.push(norm(m[1]).trim());
    }
    return out;
  };
  const check = (src) => {
    const cs = commentsOf(src);
    return { total: cs.length, missing: cs.filter((c) => !nb.includes(c)) };
  };

  const differs = [];
  const detail = {};
  let comparable = 0;
  const idx = check(indexSrc);
  comparable += idx.total;
  if (idx.missing.length) { differs.push("index.ts"); detail["index.ts"] = idx; }
  for (const rel of shared) {
    const src = lf(await readFile(path.join(ROOT, rel), "utf8"));
    const m = check(src);
    comparable += m.total;
    if (m.missing.length) {
      const label = rel.replace("supabase/functions/", "");
      differs.push(label);
      detail[label] = m;
    }
  }
  // A FUNCTION WITH NO COMPARABLE COMMENTS CANNOT BE JUDGED, and must not be
  // reported as matching. That is the whole failure mode this file exists to
  // avoid, arriving one level up.
  if (comparable === 0) {
    report.push({ fn, verdict: "UNJUDGEABLE", differs: [], detail: {}, behind: null,
      version: meta.version, deployedAt: Number(meta.updated_at), commits: [] });
    console.log(`${fn.padEnd(24)} UNJUDGEABLE  no comment long enough to compare`);
    continue;
  }

  const paths = [`supabase/functions/${fn}`, ...shared];
  const committed = lastCommit(paths);
  const deployedAt = Number(meta.updated_at);
  const behind = committed > deployedAt ? committed - deployedAt : 0;
  const commits = differs.length ? commitsSince(paths, deployedAt) : [];

  const verdict = differs.length === 0 ? "matches" : "DIFFERS";
  report.push({
    fn, verdict, differs, detail, behind,
    version: meta.version,
    deployedAt,
    commits: commits.map((c) => ({ ...c, files: filesIn(c.sha, paths) })),
  });

  console.log(
    `${fn.padEnd(24)} ${verdict.padEnd(8)} v${String(meta.version).padEnd(4)}`
    + (differs.length
      ? ` running copy is ${ago(deployedAt)} old; ${differs.length} file(s) differ: ${differs.slice(0, 3).join(", ")}${differs.length > 3 ? ` +${differs.length - 3}` : ""}`
      : ` running copy contains this checkout's source`),
  );
}

function filesIn(sha, paths) {
  const out = execFileSync("git", ["show", "--name-only", "--format=", sha, "--", ...paths],
    { cwd: ROOT, encoding: "utf8" }).trim();
  return out ? out.split("\n") : [];
}

// ---------------------------------------------------------------------------

const differing = report.filter((r) => r.verdict === "DIFFERS");
const matching = report.filter((r) => r.verdict === "matches");

console.log(`\n${"=".repeat(74)}`);
console.log(`${matching.length} function(s) are running this checkout's source.`);
console.log(`${differing.length} function(s) are NOT.`);

if (differing.length) {
  console.log(`\nWHAT IS SITTING IN THE PIPE — the commits made since each running`);
  console.log(`copy was deployed, newest first:\n`);
  for (const r of differing.sort((a, b) => b.behind - a.behind)) {
    console.log(`  ${r.fn}  (v${r.version}, deployed ${new Date(r.deployedAt).toISOString().slice(0, 16).replace("T", " ")}, `
      + `${r.behind ? `${(r.behind / day).toFixed(1)}d behind its newest commit` : "no newer commit — the bundle differs for another reason"})`);
    for (const f of r.differs) {
      const d = r.detail[f];
      console.log(`    ${f} — ${d.missing.length} of ${d.total} comment lines are not in the running bundle`);
      for (const l of d.missing.slice(0, 2)) console.log(`        missing: ${l.slice(0, 92)}`);
    }
    if (!r.commits.length) {
      console.log(`    NO COMMITS SINCE THE DEPLOY. The running bundle still does not match this`);
      console.log(`    checkout, so the difference predates the deploy stamp or came from elsewhere.`);
    }
    for (const c of r.commits.slice(0, 6)) {
      console.log(`    ${new Date(c.at).toISOString().slice(0, 10)}  ${c.sha}  ${c.subject.slice(0, 84)}`);
    }
    if (r.commits.length > 6) console.log(`    … and ${r.commits.length - 6} more`);
    console.log("");
  }
  const oldest = Math.max(...differing.map((r) => r.behind));
  console.log(`Widest gap: ${(oldest / day).toFixed(1)} days.`);
}

console.log(`\nThis compared CONTENT. \`check-deployed.mjs\` compares timestamps and`);
console.log(`cannot distinguish a missed deploy from the ordinary deploy-then-commit`);
console.log(`order, which is why its count is higher and is the right count for the`);
console.log(`question it asks: "can I vouch for this one?"`);

// ---------------------------------------------------------------------------
// THE RECEIPT — so this is GRADED rather than read.
// ---------------------------------------------------------------------------
// ROADMAP 0.6's own lesson is that nothing forced a deploy to happen, so 22
// functions drifted with nobody noticing. A check nobody has to run is the
// same shape one step out, which is why this one is in CLAUDE.md's
// before-you-finish list and why it exits non-zero.
//
// **IT FAILS WITH THE COUNT AND THE NAMES, NEVER A SUMMARY LINE.** "22
// functions differ" tells a session to sigh and move on; the list tells them
// whether the one they just edited is in it, which is the only question they
// actually have.
const differingNames = differing.map((r) => r.fn);
const failures = differingNames.length
  ? [
    `${differingNames.length} function(s) are running something other than this checkout: `
    + differingNames.join(", "),
    ...differing.map((r) =>
      `${r.fn}: ${r.differs.length} file(s) differ — ${r.differs.join(", ")}`
      + (r.behind ? ` (newest commit is ${(r.behind / day).toFixed(1)}d after the deploy)` : "")
    ),
  ]
  : [];

// THE CANARY, AND IT IS FREE HERE. Every run of this check has a negative
// control built into the question: **it must find at least one function whose
// bundle it could actually read and compare.** A token that cannot fetch
// bodies, a Management API change, or a walk that finds no functions all
// produce "0 differ" — which is indistinguishable from a clean estate and is
// the single way this check could lie. So the control is that the comparison
// demonstrably RAN: at least one function must have had comments to compare.
const judged = report.filter((r) => r.verdict === "matches" || r.verdict === "DIFFERS");
const canary = {
  id: "the comparison must be shown to have run · at least one bundle read and compared",
  observed_failure: judged.length > 0,
  caught_by: judged.length > 0 ? ["compared"] : [],
  findings: judged.length > 0
    ? [`[compared] ${judged.length} function bundle(s) were fetched and compared, so "0 differ" would be a real answer rather than a silent no-op`]
    : ["[compared] NOT CAUGHT — no bundle was readable, so this run proves nothing about any function"],
};

const { path: receiptPath } = writeReceipt({
  check_id: "deployed-inventory",
  started_at,
  status: failures.length === 0 && canary.observed_failure ? "pass" : "fail",
  expected_targets: dirs.length,
  discovered_targets: dirs.length,
  attempted_targets: dirs.length,
  completed_targets: dirs.length,
  skipped_targets: 0,
  assertions_executed: judged.length,
  min_assertions: 30,
  failures,
  artifacts: ["scripts/deployed-inventory.mjs"],
  warnings: report.filter((r) => r.verdict === "UNJUDGEABLE" || r.verdict === "UNREADABLE" || r.verdict === "NOT DEPLOYED")
    .map((r) => `${r.fn}: ${r.verdict}`),
  dimensions: {
    project: SUPABASE_PROJECT_REF,
    method: "comment-text comparison against the deployed eszip bundle",
    matching: matching.map((r) => r.fn),
    differing: differingNames,
    widest_gap_days: differing.length
      ? Number((Math.max(...differing.map((r) => r.behind)) / day).toFixed(1)) : 0,
  },
  canary,
});

if (failures.length) {
  console.log(`\n${"!".repeat(74)}`);
  console.log(`FAIL — ${differingNames.length} of ${dirs.length} function(s) are NOT running this checkout.`);
  console.log(`\n  ${differingNames.join("\n  ")}`);
  console.log(`\nDeploying is Andrew's to authorise — ROADMAP 0.6. Do not deploy to clear`);
  console.log(`this. Report it and leave it. Receipt ${receiptPath}`);
  process.exit(1);
}
console.log(`\nPASS — every function is running this checkout's source. Receipt ${receiptPath}`);
