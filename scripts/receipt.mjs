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
export const HOLDS = join(RECEIPTS, "holds.json");

/**
 * A HOLD IS A RECORDED DECISION THAT SOME FINDINGS CANNOT BE ACTED ON YET.
 *
 * It is not a property of a check and it is not written by one: it lives in
 * `receipts/holds.json` because the decision belongs to a person, and because
 * the checks it covers belong to other sessions — silencing a finding from
 * inside would have meant editing somebody else's measuring tool to say their
 * finding did not matter.
 *
 * **IT IS NOT `skip_allowlist` AND THE DIFFERENCE IS THE WHOLE POINT.** A skip
 * means a target was never tested. `deployed-inventory` tested all 39 of its
 * targets and found 22 running old code; calling those "skipped" would be a
 * lie about what the run did. They were measured, they are real, and they are
 * held.
 *
 * **A HOLD CANNOT HIDE A COUNT.** `covers` is how many failures it accounts
 * for and it is compared, not trusted: one more failure than that and the
 * receipt fails again, because the extra one is not what anybody agreed to.
 * The expiry is required and enforced.
 */
export function loadHolds() {
  try {
    const raw = JSON.parse(readFileSync(HOLDS, "utf8"));
    return raw && typeof raw.holds === "object" && raw.holds ? raw.holds : {};
  } catch {
    // No holds file, or an unreadable one, means NOTHING IS HELD. Failing
    // open here would let a typo silence the whole repo.
    return {};
  }
}

export const gitSha = () => {
  try {
    return execSync("git rev-parse HEAD", { cwd: REPO, stdio: ["ignore", "pipe", "ignore"] })
      .toString().trim();
  } catch {
    return null;
  }
};

// ---------------------------------------------------------------------------
// THE COMMIT A RUN STARTED ON, CAPTURED HERE BECAUSE HERE IS THE EARLIEST
// MOMENT ANY CHECK HAS — 2026-09-21, docs/silences.md.
// ---------------------------------------------------------------------------
// **UNTIL TODAY EVERY RECEIPT IN THIS REPO COULD NAME A COMMIT IT HAD NOT
// MEASURED.** `writeReceipt` stamped `git_sha` when the run ENDED, so a
// session committing while a check was in flight left the check claiming
// their commit. It is the same fault as everything else this file guards:
// **the receipt is the thing we trust INSTEAD of looking, and it could be
// honestly wrong.**
//
// It was found on `e2e-booking`, where HEAD moved under two of four runs —
// another session committing twice in forty minutes. Those runs were sound,
// and **the receipt could not have said so.** What said so was
// `git show --stat`: both commits touched `ROADMAP.md` only, outside the tree
// `source-guard.mjs` watches. A fact established by looking, about a file
// whose whole job is to remove the need to look.
//
// **WHY MODULE LOAD IS THE RIGHT PLACE, AND WHY IT COST NO EDITS TO 28
// CHECKS.** ESM evaluates every static import before the importing module's
// own body runs, and all 28 checks here import this file statically at the
// top. So this line runs at process start, before the check has navigated a
// page, opened a database connection or read a file. No check passes a start
// sha, no check was changed, and no check can forget to.
//
// **HEAD MOVING IS NOT A FAILURE AND MUST NOT BECOME ONE.** Most drift is a
// sibling session committing a document. The receipt's job is to make it
// VISIBLE rather than to judge it; the reader decides, with `git show --stat`
// and the check's own source guard. So it is reported the way staleness is —
// in `problems` for anything already reading that array, and out of the
// verdict.
export const SHA_AT_START = gitSha();

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

  // ---------------------------------------------------------------------
  // STALE IS NOT FAILED, AND KEEPING THEM APART IS WHY THIS SITS OUTSIDE `p`.
  // ---------------------------------------------------------------------
  // A receipt written against an older commit, whose every rule above passed,
  // is **a valid record of a run that happened, now out of date**. It is not
  // a defect and it never was. Counting it as one is how this repo arrived at
  // "2 of 23 receipts valid", where one genuinely broken check and twenty-one
  // merely old ones read identically — the same indistinguishability the
  // receipt was invented to remove, one level up.
  //
  // **STALENESS NEVER MASKS A FAILURE.** The verdict below asks about real
  // problems FIRST: an old receipt that also failed is a failure. Getting
  // that order wrong would hide a broken check inside a comfortable pile of
  // stale ones, which is worse than the state this replaces.
  // `tests/receipt.test.mjs` § 11b holds the order down.
  //
  // The message still lands in `problems`, so anything already reading that
  // array keeps seeing it; what changed is that it no longer poisons `status`
  // grading and no longer counts as a failure.
  let staleness = null;
  if (opts.sha !== null) {
    const want = opts.sha || gitSha();
    if (want && r.git_sha !== want) {
      staleness = `receipt is for ${String(r.git_sha).slice(0, 8)}, HEAD is ${want.slice(0, 8)}`
        + " — a valid record of a run that happened, now out of date";
    }
  }

  // ---------------------------------------------------------------------
  // DID HEAD MOVE WHILE THE RUN WAS IN FLIGHT? — outside `p`, like staleness.
  // ---------------------------------------------------------------------
  // **STALENESS AND DRIFT ARE DIFFERENT QUESTIONS AND BOTH HAVE TO BE ASKED.**
  // Stale asks "is this receipt older than HEAD *now*" — a fact about the
  // present. Drift asks "did the tree move *under the run*" — a fact about the
  // past, which no later reading can recover. A receipt can be perfectly
  // fresh and still name a commit that landed halfway through it.
  //
  // It does not fail the receipt, deliberately. Most drift is a sibling
  // session committing a document, and voiding sound runs would teach
  // everybody to ignore the line — which is precisely what making staleness
  // fail did, and what that comment above says it cost.
  let drift = null;
  let startShaUnknown = false;
  if (r.head_moved === true) {
    drift = `HEAD MOVED DURING THIS RUN: started ${String(r.git_sha_started ?? "?").slice(0, 8)}`
      + `, finished ${String(r.git_sha).slice(0, 8)} — the receipt names a commit it did not`
      + " measure end to end. NOT automatically void: run `git show --stat` on what landed and"
      + " check whether the check's own source guard fired. The reader decides.";
  } else if (!("git_sha_started" in r)) {
    // NOT A PROBLEM, AND NOT SILENCE EITHER. "We did not record it" is a
    // third answer, and collapsing it into "it did not move" would be this
    // file's own subject committed inside the fix for it.
    startShaUnknown = true;
  }

  // THE `status` FIELD IS GRADED, NOT TRUSTED.
  if (p.length === 0 && r.status !== "pass") {
    bad(`every rule passed but the check wrote status "${r.status}"`);
  }
  if (p.length > 0 && r.status === "pass") {
    p.unshift('the check wrote status "pass" and these rules say otherwise:');
  }

  // ---------------------------------------------------------------------
  // A HOLD, IF ONE IS RECORDED FOR THIS CHECK — and it has teeth.
  // ---------------------------------------------------------------------
  // Three ways a hold does NOT apply, each of them deliberate:
  //   * it has lapsed — the check goes red and NAMES the hold and its date,
  //     because a hold that quietly widens is an exemption nobody voted for;
  //   * the failures outnumber what it `covers` — the extra ones were never
  //     agreed to and the receipt fails on them;
  //   * something other than recorded failures is wrong — a hold covers
  //     findings, never a check that cannot count or has lost its canary.
  const hold = (opts.holds ?? loadHolds())[r.check_id];
  let heldBy = null;
  if (hold) {
    const lapsed = !(new Date(hold.expires) > new Date());
    // `p` carries ONE summary line for N recorded failures, so the count to
    // compare is r.failures.length against the hold's `covers` — done below.
    // What this asks is narrower: is the failure line the ONLY thing wrong?
    const failureLines = p.filter((m) => /failure\(s\) recorded/.test(m));
    const onlyFailures = failureLines.length > 0 && p.every((m) =>
      /failure\(s\) recorded/.test(m)
      || m === 'the check wrote status "pass" and these rules say otherwise:');
    if (lapsed) {
      bad(`the hold "${hold.reason}" LAPSED on ${hold.expires} — these findings are due again`);
    } else if (typeof hold.covers !== "number" || r.failures.length > hold.covers) {
      bad(`${r.failures.length} failure(s) recorded but the hold covers ${hold.covers} — the extra one(s) are not held`);
    } else if (failureLines.length && onlyFailures) {
      heldBy = hold;
    }
  }

  const realProblems = heldBy ? p.filter((m) => !/failure\(s\) recorded/.test(m)) : p;
  const verdict = realProblems.length > 0 ? "fail"
    : heldBy ? "held"
    : staleness ? "stale" : "pass";
  const problems = [...realProblems, ...(staleness ? [staleness] : []), ...(drift ? [drift] : [])];
  // `ok` keeps its old meaning — fresh AND clean — so nothing already reading
  // it changes behaviour. `verdict` is what tells the three apart.
  return {
    ok: problems.length === 0 && !heldBy,
    problems, verdict, stale: !!staleness, staleness,
    moved: !!drift, drift, startShaUnknown,
    hold: heldBy, receipt: r,
  };
}

/** Write a receipt, stamping the fields no check should have to remember. */
export function writeReceipt(r) {
  mkdirSync(RECEIPTS, { recursive: true });
  const shaAtEnd = gitSha();
  const full = {
    git_sha: shaAtEnd,
    // The two are recorded separately and the comparison is recorded too, so
    // a reader never has to do it and can never forget to. A receipt written
    // before 2026-09-21 has neither field; `validate` says so rather than
    // guessing, because "did not record it" and "did not move" are the two
    // sentences this whole repo exists to keep apart.
    git_sha_started: SHA_AT_START,
    head_moved: !!(SHA_AT_START && shaAtEnd && SHA_AT_START !== shaAtEnd),
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
      ? readdirSync(target).filter((f) => f.endsWith(".json") && f !== "holds.json").map((f) => join(target, f))
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
  let bad = 0, stale = 0, held = 0, moved = 0, unknown = 0;
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
    if (v.verdict === "pass") {
      console.log(`PASS  ${r.check_id}  ${r.completed_targets}/${r.expected_targets} targets, `
        + `${r.assertions_executed} assertions, canary "${r.canary.id}" failed as required`);
    } else if (v.verdict === "held") {
      held++;
      console.log(`HELD  ${r.check_id}  ${r.failures.length} finding(s) held: ${v.hold.reason}`);
      console.log(`        due again ${v.hold.expires} — the findings are real and are not being disputed`);
    } else if (v.verdict === "stale") {
      stale++;
      console.log(`STALE ${r.check_id}  every rule passed; ${v.staleness}`);
    } else {
      bad++;
      console.log("FAIL  " + (r.check_id ?? f));
      for (const m of v.problems) console.log("        " + m);
    }
    // PRINTED UNDER EVERY VERDICT, INCLUDING A PASS — which is the whole
    // point. A run whose tree moved underneath it can pass every rule, and
    // before 2026-09-21 that was indistinguishable from a run on a still
    // tree. The line goes under the PASS, where the reader is least expecting
    // to be told anything.
    if (v.moved) { moved++; console.log("        " + v.drift); }
    else if (v.startShaUnknown) {
      unknown++;
      console.log("        no start-sha recorded — written before 2026-09-21, so whether the tree "
        + "moved under this run is UNKNOWN rather than no. Re-run it to find out.");
    }
  }
  const fresh = files.length - bad - stale - held;
  console.log(`
${fresh} valid · ${stale} stale (every rule passed, written at an older commit)`
    + `${held ? ` · ${held} held (real findings, agreed hold, with an expiry)` : ""} · ${bad} failed.`);
  if (moved || unknown) {
    console.log(`${moved} written across a moving HEAD · ${unknown} that cannot say either way.`
      + " Neither is a failure and neither is a pass — they are the third answer.");
  }
  if (stale && !bad) {
    console.log("Stale is not broken — re-run those checks when commits have stopped, not before.");
  }
  // ONLY A REAL FAILURE EXITS NON-ZERO. An out-of-date record is not a broken
  // one, and making it exit 1 is what taught everybody to ignore the number.
  process.exit(bad ? 1 : 0);
}
