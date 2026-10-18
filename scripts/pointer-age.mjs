// ROADMAP 14.31 — HOW OLD IS EACH `FILE.md:123` POINTER, AND DID ITS TARGET MOVE?
//
//   node scripts/pointer-age.mjs                    # every pointer at HEAD
//   node scripts/pointer-age.mjs --rev=23199db      # at a revision (reproduces gotchas.md 92)
//   node scripts/pointer-age.mjs --break=suspect-all|blind   # sabotage; must go red
//
// Credential-free: it reads git and nothing else. About a minute at HEAD (one
// `git blame` per pointer).
//
// THE METHOD IS docs/open-items-read-as-a-stranger-2026-09-25.md § "THE METHOD",
// transcribed. The tool that first ran it ran out of a scratch directory that no
// longer exists, which left that document's bucket column a claim and not a
// measurement. For each pointer — a citation of `ROADMAP|FOR-ANDREW|DECISIONS|
// gotchas|VERIFIED|silences .md:NNN` inside a tracked .md file:
//
//   1. DATE IT      git blame -L<n>,<n> --porcelain  -> the commit that wrote it
//   2. DID IT MOVE  git log <sha>..<rev> -- <target>  empty -> still-good
//   3. WHICH WAY    git diff --unified=0 <sha>..<rev> -- <target>, summing hunk
//                   length changes for hunks wholly ABOVE the cited line
//                   nonzero (or the cited line itself rewritten) -> suspect
//                   else                                          -> changed-below-only
//
// A pointer whose citing line cannot be blamed, or whose target is not exactly
// one tracked file, is `unknown`. It is never guessed into another bucket.
//
// **WHAT THE BUCKETS MEAN, AND THE ONE THING THEY CANNOT.**
//   still-good         the target has NOT CHANGED since the pointer was written.
//                      It means "has not drifted", NEVER "is correct": a number
//                      that was wrong the day it was typed, into a file that has
//                      not moved, is still-good for ever (all three `857` rows
//                      in that document were exactly that).
//   changed-below-only the target changed, but nothing above the cited line.
//   suspect            lines moved above the cited line. LIKELY stale, not
//                      certainly: equal adds and removes above leave it right.
//   unknown            could not be dated or resolved.
// `suggested` is cited line + the shift above it. It is arithmetic from the
// pointer's own number and is exactly as good as that number was when typed.
//
// TWO PLACES THIS DELIBERATELY DIFFERS FROM THE METHOD AS WRITTEN, and each
// errs toward flagging more: a hunk that REWRITES the cited line is suspect even
// when its length change is zero, and a cited line past the target's end is
// suspect. A pure insertion at old-start `a` goes in AFTER line `a`, so it
// shifts the cited line only when a < n, not a <= n.
//
// PROVED, NOT ASSERTED. Every run builds a throwaway git repo with one pointer
// per bucket and checks the classifier against it BEFORE reading the real one;
// `--break=suspect-all` (reports a known-good pointer as suspect) and
// `--break=blind` (reports the moved target as still-good) must each turn the
// run red. When --rev names the revision gotchas.md 92 pinned, the run must
// also reproduce its fingerprint: 58 pointers, 3 self, 55 cross. A run that
// cannot reproduce that at that revision has not been verified.

import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { writeReceipt } from "./receipt.mjs";

const REPO = fileURLToPath(new URL("../", import.meta.url));
const TARGETS = "ROADMAP|FOR-ANDREW|DECISIONS|gotchas|VERIFIED|silences";
const PATTERN = `(${TARGETS})\\.md:[0-9]+`;
// gotchas.md 92's own record: at this revision, 58 pointers, 3 self, 55 cross.
const PINNED = { prefix: "23199db", pointers: 58, self: 3, cross: 55 };

const arg = (k) => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3);
const REV_ARG = arg("rev") || "HEAD";
const BREAK = arg("break");
if (BREAK && !["suspect-all", "blind"].includes(BREAK)) {
  console.error(`unknown --break=${BREAK}; use suspect-all or blind`);
  process.exit(2);
}

const gitIn = (cwd) => (...a) => execFileSync("git", a, { cwd, encoding: "utf8", maxBuffer: 1 << 28, stdio: ["ignore", "pipe", "pipe"] });

/** Parse `git grep -noE` output taken at `rev`. Paths here never contain a colon. */
function parsePointers(out, rev) {
  const re = new RegExp(`^${rev}:(.+?):(\\d+):((?:${TARGETS})\\.md):(\\d+)$`);
  return out.split("\n").filter(Boolean).map((l) => {
    const m = l.match(re);
    if (!m) throw new Error(`unparseable git grep line: ${l.slice(0, 120)}`);
    return { file: m[1], at: +m[2], targetName: m[3], cited: +m[4] };
  });
}

/** Classify one pointer. `git` is bound to a repo; `ls` is that revision's file list. */
function classify(git, rev, ls, p, cache) {
  const hits = ls.filter((f) => basename(f) === p.targetName && (f === p.targetName || f.endsWith("/" + p.targetName)));
  // `ROADMAP.md` must mean the one at the root: `docs/roadmap.md` is a different
  // file with the same item numbers (gotchas.md 91), and the cases differ.
  const target = hits.length === 1 ? hits[0] : hits.includes(p.targetName) ? p.targetName : null;
  const base = { ...p, target, self: target === p.file };
  if (!target) return { ...base, bucket: "unknown", why: hits.length ? "ambiguous target" : "target not tracked at this revision" };

  let sha;
  try {
    sha = git("blame", "-L", `${p.at},${p.at}`, "--porcelain", rev, "--", p.file).split(" ")[0];
  } catch (e) {
    return { ...base, bucket: "unknown", why: "could not blame the citing line" };
  }
  if (!/^[0-9a-f]{40}$/.test(sha) || /^0+$/.test(sha)) return { ...base, bucket: "unknown", why: "citing line has no commit" };
  base.dated = sha.slice(0, 8);

  const moved = (cache.log[`${sha}|${target}`] ??= git("log", "--format=%h", `${sha}..${rev}`, "--", target).trim());
  if (!moved) return { ...base, bucket: "still-good", suggested: p.cited };

  const diff = (cache.diff[`${sha}|${target}`] ??= git("diff", "--unified=0", `${sha}..${rev}`, "--", target));
  let shift = 0, rewritten = false;
  for (const m of diff.matchAll(/^@@ -(\d+)(?:,(\d+))? \+\d+(?:,(\d+))? @@/gm)) {
    const a = +m[1], b = m[2] === undefined ? 1 : +m[2], d = m[3] === undefined ? 1 : +m[3];
    if (b === 0) { if (a < p.cited) shift += d; }          // pure insertion, goes in after old line a
    else if (a + b - 1 < p.cited) shift += d - b;          // wholly above the cited line
    else if (a <= p.cited) rewritten = true;               // the cited line is inside the change
  }
  const len = (cache.len[target] ??= git("show", `${rev}:${target}`).split("\n").length - 1);
  const past = p.cited + shift > len;
  const suspect = shift !== 0 || rewritten || past;
  return {
    ...base, bucket: suspect ? "suspect" : "changed-below-only", suggested: p.cited + shift,
    ...(suspect ? { why: rewritten ? "the cited line itself was rewritten" : past ? "cited line is past the end of the target" : `${shift > 0 ? "+" : ""}${shift} lines above it` } : {}),
  };
}

function runPointers(git, rev) {
  const full = git("rev-parse", rev).trim();
  const ls = git("ls-tree", "-r", "--name-only", full).split("\n").filter(Boolean);
  const out = git("grep", "-noE", PATTERN, full, "--", "*.md");
  const cache = { log: {}, diff: {}, len: {} };
  const pointers = parsePointers(out, full).map((p) => classify(git, full, ls, p, cache));
  // The population counted a second way, so a parser that drops lines cannot
  // report agreement with itself: regex matches over `git grep -E` lines.
  const lines = git("grep", "-nE", PATTERN, full, "--", "*.md").split("\n").filter(Boolean);
  // The `<sha>:<path>:<line>:` prefix is stripped first: a citing file named
  // silences.md would otherwise match the pattern in its own prefix.
  const viaLines = lines.reduce((n, l) => n + [...l.replace(/^[0-9a-f]{40}:.+?:\d+:/, "").matchAll(new RegExp(PATTERN, "g"))].length, 0);
  return { full, pointers, viaLines };
}

/** The sabotage hooks wrap the real classifier's answer, so the fixture sees them. */
const sabotage = (r) => {
  if (BREAK === "suspect-all" && r.bucket === "still-good") return { ...r, bucket: "suspect" };
  if (BREAK === "blind" && r.bucket === "suspect") return { ...r, bucket: "still-good" };
  return r;
};

// ── THE SELF-TEST: one pointer per bucket, in a repo built for the purpose ──
function fixture() {
  const dir = mkdtempSync(join(tmpdir(), "pointer-age-"));
  const git = gitIn(dir);
  const ten = (n) => Array.from({ length: 10 }, (_, i) => `${n} line ${i + 1}`).join("\n") + "\n";
  const write = (f, s) => { mkdirSync(dirname(join(dir, f)), { recursive: true }); writeFileSync(join(dir, f), s); };
  try {
    git("init", "-q"); git("config", "user.email", "t@t"); git("config", "user.name", "t");
    git("config", "core.autocrlf", "false");
    for (const t of ["ROADMAP", "FOR-ANDREW", "DECISIONS", "gotchas"]) write(`${t}.md`, ten(t));
    write("docs/p1.md", "see ROADMAP.md:5\n");      // target never changes   -> still-good
    write("docs/p2.md", "see FOR-ANDREW.md:5\n");   // appended below         -> changed-below-only
    write("docs/p3.md", "see DECISIONS.md:5\n");    // a line added on top    -> suspect
    write("docs/p4.md", "see gotchas.md:5\n");      // line 5 rewritten, +0   -> suspect
    write("docs/p5.md", "see VERIFIED.md:5\n");     // no such target         -> unknown
    git("add", "-A"); git("commit", "-qm", "c1");
    write("FOR-ANDREW.md", ten("FOR-ANDREW") + "FOR-ANDREW appended\n");
    write("DECISIONS.md", "DECISIONS new top\n" + ten("DECISIONS"));
    write("gotchas.md", ten("gotchas").replace("gotchas line 5", "gotchas CHANGED"));
    git("add", "-A"); git("commit", "-qm", "c2");
    const { pointers } = runPointers(git, "HEAD");
    return pointers.map(sabotage);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const EXPECT = { "docs/p1.md": "still-good", "docs/p2.md": "changed-below-only", "docs/p3.md": "suspect", "docs/p4.md": "suspect", "docs/p5.md": "unknown" };
const failures = [];
let assertions = 0;
const check = (ok, msg) => { assertions++; if (!ok) failures.push(msg); };

const started_at = new Date().toISOString();
const fx = fixture();
for (const [f, want] of Object.entries(EXPECT)) {
  const got = fx.find((p) => p.file === f)?.bucket;
  check(got === want, `self-test: ${f} should be ${want}, was ${got}`);
}
const canaryCaught = fx.find((p) => p.file === "docs/p3.md")?.bucket === "suspect";
check(canaryCaught, "canary: a pointer whose target gained a line above it was NOT reported suspect");

const git = gitIn(REPO);
const { full, pointers, viaLines } = runPointers(git, REV_ARG);
check(pointers.length === viaLines, `population disagrees: ${pointers.length} parsed against ${viaLines} counted a second way`);

const count = (b) => pointers.filter((p) => p.bucket === b).length;
const selfN = pointers.filter((p) => p.self).length;
const crossN = pointers.length - selfN;
if (full.startsWith(PINNED.prefix)) {
  check(pointers.length === PINNED.pointers, `fingerprint: ${pointers.length} pointers, gotchas.md 92 pinned ${PINNED.pointers}`);
  check(selfN === PINNED.self, `fingerprint: ${selfN} self, gotchas.md 92 pinned ${PINNED.self}`);
  check(crossN === PINNED.cross, `fingerprint: ${crossN} cross, gotchas.md 92 pinned ${PINNED.cross}`);
}

// ── report ──
const rank = { suspect: 0, unknown: 1, "changed-below-only": 2, "still-good": 3 };
const lineFor = (p) => `${p.bucket.padEnd(18)} ${p.file}:${p.at} -> ${p.targetName}:${p.cited}`
  + (p.bucket === "suspect" ? `  suggested ${p.suggested} (${p.why})` : p.why ? `  (${p.why})` : "")
  + `  dated ${p.dated ?? "-"}`;
console.log(`pointer-age at ${full.slice(0, 8)} — ${pointers.length} pointers (${selfN} self, ${crossN} cross)`);
for (const b of ["still-good", "changed-below-only", "suspect", "unknown"]) console.log(`  ${b.padEnd(18)} ${count(b)}`);
console.log("\nstill-good means NOT DRIFTED, never CORRECT. suspect means LIKELY stale, not certainly.\n");
for (const p of [...pointers].sort((a, b) => rank[a.bucket] - rank[b.bucket] || a.file.localeCompare(b.file) || a.at - b.at)) console.log(lineFor(p));
if (failures.length) { console.log(`\nFAILED (${failures.length}):`); for (const f of failures) console.log(`  ${f}`); }

if (BREAK) {
  console.log(`\n--break=${BREAK}: ${failures.length ? "went RED, as it must" : "STAYED GREEN — THE SABOTAGE WAS NOT SEEN"}. No receipt written.`);
  process.exit(failures.length ? 1 : 3);
}

const n = pointers.length;
const isHead = REV_ARG === "HEAD";
const { path } = writeReceipt({
  check_id: isHead ? "pointer-age" : `pointer-age-${full.slice(0, 8)}`,
  started_at,
  status: failures.length ? "fail" : "pass",
  expected_targets: viaLines,
  discovered_targets: n,
  attempted_targets: n,
  completed_targets: n,
  skipped_targets: 0,
  assertions_executed: assertions,
  min_assertions: 6,
  failures,
  artifacts: ["scripts/pointer-age.mjs"],
  warnings: [
    "still-good means the target has not drifted since the pointer was written. It never means the pointer is correct.",
    "suspect means lines moved above the cited line: likely stale, not certainly.",
    ...(count("unknown") ? [`${count("unknown")} pointer(s) could not be dated or resolved; they are in no other bucket`] : []),
  ],
  dimensions: {
    break: BREAK || null, // routes a sabotage run to .sabotage.json (ROADMAP 98.3)
    rev: full,
    self: selfN, cross: crossN,
    buckets: Object.fromEntries(["still-good", "changed-below-only", "suspect", "unknown"].map((b) => [b, count(b)])),
    pointers: pointers.map((p) => ({ in: `${p.file}:${p.at}`, to: `${p.targetName}:${p.cited}`, bucket: p.bucket, dated: p.dated ?? null, suggested: p.suggested ?? null })),
    pinned_fingerprint_checked: full.startsWith(PINNED.prefix),
  },
  canary: {
    id: "a pointer whose target gained a line above it",
    observed_failure: canaryCaught,
    caught_by: ["classify() against a throwaway repo, run before the real read"],
    findings: [canaryCaught ? "reported suspect" : "NOT reported suspect — this instrument cannot see drift"],
  },
});
console.log(`\nreceipt        ${path}   —  validate: node scripts/receipt.mjs`);
process.exit(failures.length ? 1 : 0);
