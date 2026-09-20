// THE VERIFICATION RECEIPT — step 2 of ROADMAP.md § "Adopting the
// operating-system report", specified in
// `docs/operating-system-report-2026-09-16.md` § "The verification receipt".
//
// WHY THIS EXISTS, IN ONE SENTENCE: a check that prints "clean" having tested
// nothing is indistinguishable from a check that tested everything and found
// nothing, and this repo has shipped at least six of the former —
// `sweep-widths.mjs` once printed *clean* over 38 real findings.
//
// A RECEIPT MAKES THE DIFFERENCE READABLE BY A MACHINE. It records how many
// targets the check expected, found, tried and finished; how many assertions
// it actually ran; what it skipped; and whether a deliberately broken canary
// did in fact fail. `validate()` then recomputes the verdict from those
// numbers. **It never trusts the `status` field the check wrote.** A check
// cannot grade itself — report § "Discipline for trusting a check", rule 10.
//
//   node scripts/receipt.mjs receipts/<file>.json    # validate one
//   node scripts/receipt.mjs                         # validate every one
//
// NO NEW DEPENDENCY, AND THAT IS DELIBERATE. A JSON Schema library would check
// that `expected_targets` is a number. The rules that matter here are
// arithmetic BETWEEN fields — expected = discovered = attempted = completed —
// and no schema vocabulary expresses those without a custom keyword anyway.
// Plain comparison is smaller than the dependency and says more.

import { execSync } from "node:child_process";
import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const RECEIPTS = join(REPO, "receipts");

export const gitSha = () => {
  try {
    return execSync("git rev-parse HEAD", { cwd: REPO, stdio: ["ignore", "pipe", "ignore"] })
      .toString().trim();
  } catch {
    return null;
  }
};

/** Every field `validate` requires, with the type it must have. */
const REQUIRED = {
  check_id: "string",
  git_sha: "string",
  environment: "string",
  started_at: "string",
  finished_at: "string",
  status: "string",
  expected_targets: "number",
  discovered_targets: "number",
  attempted_targets: "number",
  completed_targets: "number",
  skipped_targets: "number",
  assertions_executed: "number",
  // NOT IN THE REPORT'S EXAMPLE, AND REQUIRED HERE ANYWAY. The report's verdict
  // rule says "assertions exceed a declared minimum". Nothing declares it if
  // the receipt does not carry it, and an undeclared minimum is zero, which
  // makes the rule do nothing. The check declares its own floor and is then
  // held to it; lowering it is a visible diff somebody has to justify.
  min_assertions: "number",
  failures: "object",
  dimensions: "object",
  artifacts: "object",
  warnings: "object",
  canary: "object",
};

/**
 * Recompute the verdict from the numbers. Returns { ok, problems[], receipt }.
 * `opts.sha` — require the receipt to match this commit (the report's "a valid
 * receipt for the current SHA"). Pass `null` to skip that one rule.
 */
export function validate(r, opts = {}) {
  const p = [];
  const bad = (m) => p.push(m);

  if (r === null || typeof r !== "object" || Array.isArray(r)) {
    return { ok: false, problems: ["receipt is not a JSON object"], receipt: r };
  }

  for (const [k, t] of Object.entries(REQUIRED)) {
    if (!(k in r)) {
      bad("missing required field `" + k + "`");
      continue;
    }
    const actual = Array.isArray(r[k]) ? "object" : typeof r[k];
    if (actual !== t) bad("`" + k + "` should be " + t + ", is " + actual);
  }
  for (const k of ["failures", "artifacts", "warnings"]) {
    if (k in r && !Array.isArray(r[k])) bad("`" + k + "` should be an array");
  }
  // Nothing below can run on a receipt that is missing its fields, and every
  // rule would report a second, confusing problem for the same cause.
  if (p.length) return { ok: false, problems: p, receipt: r };

  // FAIL CLOSED ON ZERO — report rule 2. A check that discovered nothing has
  // proved nothing. This is the single rule that catches the whole class of
  // defect the report was written about.
  if (r.expected_targets <= 0) {
    bad("expected_targets is " + r.expected_targets + "; a check that expects nothing proves nothing");
  }
  if (r.discovered_targets <= 0) {
    bad("discovered_targets is " + r.discovered_targets + "; nothing was found to test");
  }

  // THE FOUR COUNTS MUST AGREE — the report's verdict rule. Discovering 16 and
  // completing 3 is how a sweep reports clean over 38 findings.
  const e = r.expected_targets, d = r.discovered_targets;
  const a = r.attempted_targets, c = r.completed_targets;
  if (!(e === d && d === a && a === c)) {
    bad(`target counts disagree: expected ${e}, discovered ${d}, attempted ${a}, completed ${c}`);
  }

  // SKIPS ARE FAILURES unless allowlisted with an expiry that has not passed.
  if (r.skipped_targets > 0) {
    const al = r.skip_allowlist;
    if (!al || typeof al !== "object" || !al.reason || !al.expires) {
      bad(`${r.skipped_targets} target(s) skipped with no \`skip_allowlist\` {reason, expires}`);
    } else if (!(new Date(al.expires) > new Date())) {
      bad(`${r.skipped_targets} target(s) skipped under an allowlist that expired ${al.expires}`);
    }
  }

  // ASSERTIONS MUST CLEAR THE DECLARED FLOOR.
  if (r.min_assertions <= 0) bad("min_assertions is " + r.min_assertions + "; a floor of zero is not a floor");
  else if (r.assertions_executed < r.min_assertions) {
    bad(`only ${r.assertions_executed} assertions ran against a declared minimum of ${r.min_assertions}`);
  }

  // ARTIFACTS MUST EXIST ON DISK AND NOT BE EMPTY. A listed path that is not
  // there means the evidence was never written and nobody can look at it; a
  // zero-byte screenshot is this repo's gotchas.md entry about a backgrounded
  // tab, arriving as a file rather than as a wrong number.
  if (r.artifacts.length === 0) bad("no artifacts; there is nothing for a person to look at");
  for (const rel of r.artifacts) {
    const abs = resolve(REPO, rel);
    let found = false, size = 0;
    try {
      const st = statSync(abs);
      found = true;
      size = st.isDirectory() ? 1 : st.size;
    } catch {
      /* missing */
    }
    if (!found) bad("artifact missing on disk: " + rel);
    else if (size === 0) bad("artifact is empty: " + rel);
  }

  // THE CANARY MUST HAVE FAILED. This is the negative control: a deliberately
  // broken target the check is required to catch. If the canary passed, the
  // check is not looking, and every green target beside it is worthless.
  if (!r.canary || typeof r.canary !== "object" || Array.isArray(r.canary)) {
    bad("no canary; the check has no negative control");
  } else if (!r.canary.id) {
    bad("canary has no `id`");
  } else if (r.canary.observed_failure !== true) {
    bad(`canary "${r.canary.id}" did NOT fail — the check cannot see a defect it was handed on purpose`);
  }

  if (r.failures.length > 0) bad(r.failures.length + " failure(s) recorded");

  if (opts.sha !== null) {
    const want = opts.sha || gitSha();
    if (want && r.git_sha !== want) {
      bad(`receipt is for ${String(r.git_sha).slice(0, 8)}, HEAD is ${want.slice(0, 8)}`);
    }
  }

  // THE `status` FIELD IS GRADED, NOT TRUSTED.
  if (p.length === 0 && r.status !== "pass") {
    bad(`every rule passed but the check wrote status "${r.status}"`);
  }
  if (p.length > 0 && r.status === "pass") {
    p.unshift('the check wrote status "pass" and these rules say otherwise:');
  }

  return { ok: p.length === 0, problems: p, receipt: r };
}

/** Write a receipt, stamping the fields no check should have to remember. */
export function writeReceipt(r) {
  mkdirSync(RECEIPTS, { recursive: true });
  const full = {
    git_sha: gitSha(),
    environment: process.env.RECEIPT_ENV || "local",
    finished_at: new Date().toISOString(),
    failures: [],
    warnings: [],
    artifacts: [],
    dimensions: {},
    ...r,
  };
  const name = String(full.check_id).replace(/[^a-z0-9.-]+/gi, "-");
  const path = join(RECEIPTS, name + ".json");
  writeFileSync(path, JSON.stringify(full, null, 2) + "\n");
  return { path, receipt: full };
}

// ---- CLI -----------------------------------------------------------------

const invokedDirectly = process.argv[1]
  && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));

if (invokedDirectly) {
  const target = process.argv[2] || RECEIPTS;
  let files;
  try {
    files = statSync(target).isDirectory()
      ? readdirSync(target).filter((f) => f.endsWith(".json")).map((f) => join(target, f))
      : [target];
  } catch {
    console.error("No such receipt or directory: " + target);
    process.exit(2);
  }
  // FAIL CLOSED HERE TOO. "Validated 0 receipts" is the same lie, one level up.
  if (files.length === 0) {
    console.error(`No receipts in ${target}. Nothing was validated — this is not a pass.`);
    process.exit(2);
  }
  let bad = 0;
  for (const f of files) {
    let r;
    try {
      r = JSON.parse(readFileSync(f, "utf8"));
    } catch (err) {
      console.log("FAIL  " + f + "\n        unreadable: " + err.message);
      bad++;
      continue;
    }
    const v = validate(r);
    if (v.ok) {
      console.log(`PASS  ${r.check_id}  ${r.completed_targets}/${r.expected_targets} targets, `
        + `${r.assertions_executed} assertions, canary "${r.canary.id}" failed as required`);
    } else {
      bad++;
      console.log("FAIL  " + (r.check_id ?? f));
      for (const m of v.problems) console.log("        " + m);
    }
  }
  console.log(`\n${files.length - bad} of ${files.length} receipt(s) valid.`);
  process.exit(bad ? 1 : 0);
}
