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

/**
 * A SKIP THAT PASSES MUST SAY WHAT THE RUN DID ABOUT IT — ROADMAP 14.11, second half.
 *
 * `skip_allowlist` is the ONLY way a receipt with skips can grade as a pass, and
 * until this rule it took a reason and an expiry for the whole batch and nothing
 * about any single skip. "Reason: the demo cannot be in that state" over ten
 * labels is an assertion; it does not show that any of the ten was reached and
 * refused. So an allowlisted receipt must ITEMISE: one entry per skip, each with
 * a `label` and an `evidence` string describing an ACT the run performed (a probe
 * re-asked, a press that waited the full bound), and the entries must number
 * exactly `skipped_targets`. `scripts/lib/skipEvidence.mjs` is how a check produces them.
 *
 * **IT BINDS RECEIPTS STARTED AT OR AFTER `EVIDENCE_RULE_FROM`, AND NOBODY ELSE.** Every
 * receipt on disk before that was written by a check that had no such field to
 * give, so failing it would turn the list red for a reason that is not a fault.
 * Those are NOT folded into the pass: they carry a note saying their skips are
 * unjudged, by count, so the third answer stays visible. The cut-off is the commit
 * time of `386b653`, the first one in which the sweep could supply the field.
 * An unreadable `started_at` owes the evidence, because a rule that a missing
 * date can switch off is not a rule.
 */
export const EVIDENCE_RULE_FROM = "2026-10-07T03:58:37.000Z";

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
  // NOTES ARE PRINTED UNDER EVERY VERDICT, INCLUDING A PASS, exactly like the
  // head-moved line below — a thing a reader is least expecting to be told is
  // the thing worth telling them.
  const notes = [];
  const note = (m) => notes.push(m);

  if (r === null || typeof r !== "object" || Array.isArray(r)) {
    return { ok: false, problems: ["receipt is not a JSON object"], notes: [], receipt: r };
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
  if (p.length) return { ok: false, problems: p, notes, receipt: r };

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
    // The itemisation. Skipped when there is no allowlist at all, because the
    // first problem above already says that and a second one is noise.
    if (r.skip_allowlist && typeof r.skip_allowlist === "object") {
      const list = r.skip_allowlist.skipped;
      const named = (e) => (typeof e?.label === "string" && e.label.trim() ? e.label : "(no label)");
      const lacking = Array.isArray(list)
        ? list.filter((e) => typeof e?.evidence !== "string" || !e.evidence.trim()) : [];
      const owes = !(new Date(r.started_at) < new Date(EVIDENCE_RULE_FROM));
      if (owes) {
        if (!Array.isArray(list)) {
          bad(`${r.skipped_targets} target(s) skipped and the allowlist does not itemise them: no \`skipped\` list of {label, evidence}`);
        } else if (list.length !== r.skipped_targets) {
          bad(`${r.skipped_targets} target(s) skipped but the allowlist itemises ${list.length}`);
        }
        if (lacking.length) {
          bad(`${lacking.length} skip(s) carry no evidence that the surface was reached and refused: `
            + lacking.slice(0, 5).map(named).join(", ") + (lacking.length > 5 ? ", ..." : ""));
        }
      } else {
        note(`${r.skipped_targets} skip(s) accepted under an allowlist with `
          + (Array.isArray(list) ? `${list.length} itemised, ${list.length - lacking.length} with evidence` : "no per-skip itemisation")
          + `; written before the evidence rule (${EVIDENCE_RULE_FROM}), so UNJUDGED rather than clean. Re-run it to judge.`);
      }
    }
  }

  // ASSERTIONS MUST CLEAR THE DECLARED FLOOR.
  if (r.min_assertions <= 0) bad("min_assertions is " + r.min_assertions + "; a floor of zero is not a floor");
  else if (r.assertions_executed < r.min_assertions) {
    bad(`only ${r.assertions_executed} assertions ran against a declared minimum of ${r.min_assertions}`);
  }

  // **A FLOOR THAT EQUALS THE COUNT IT MEASURES CANNOT EVER BIND, AND FOUR
  // RECEIPTS IN THIS REPO HAD ONE — 2026-09-22.**
  //
  // `min_assertions` exists to catch a run that quietly did less than it used
  // to. When it is set to exactly what a clean run executes, the two numbers
  // move together: add a target and both rise, delete half the questions and
  // both fall. The comparison above is then arithmetic that can only ever
  // come out true, sitting in the file whose entire purpose is to refuse a
  // check that grades itself.
  //
  // **THIS IS THE SAME SHAPE AS A CONTROL THAT IS QUIETLY AN INSTANCE OF THE
  // FAULT** — `discount-label.mjs` shipped an "exact" case that was not exact
  // — and as a canary nobody breaks. It reads as a guard and is a decoration.
  //
  // Andrew, 2026-09-22, having raised it twice: *"Either set it genuinely
  // below, or if it really is a structural count that cannot vary, write one
  // line in the receipt saying so, and then do that everywhere rather than per
  // script."* So the rule lives HERE rather than in each check, and a receipt
  // whose floor cannot bind has to say why in its own words.
  //
  // A structural count is a real thing: `targets x questions`, fixed by the
  // code rather than by what the run found. Declaring it is not an excuse, it
  // is the difference between "this floor is deliberately a tripwire on the
  // DIFF" and "somebody typed the number the run happened to print."
  if (r.min_assertions > 0 && r.assertions_executed === r.min_assertions) {
    if (typeof r.assertion_floor === "string" && r.assertion_floor.trim().length >= 20) {
      note(`the assertion floor equals the count it measures, so it cannot bind at run time; `
        + `declared structural: ${r.assertion_floor.trim()}`);
    } else {
      bad(`min_assertions (${r.min_assertions}) equals assertions_executed, so the floor can `
        + "never bind — both numbers move together. Set it genuinely below, or declare "
        + "`assertion_floor` with the reason the count cannot vary");
    }
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
    moved: !!drift, drift, startShaUnknown, notes,
    hold: heldBy, receipt: r,
  };
}

// A receipt is a sabotage if it names its break in `dimensions` (three spellings) OR carries
// the standard warning "this receipt is a sabotage, not a result". The warning clause was
// added 2026-10-18 (ROADMAP 98.3): migration-drift.mjs and 15 other `--break=` scripts write
// only the warning, so their sabotage runs still overwrote the real receipt, and the next
// clean run then destroyed the sabotage evidence. Held by tests/receipt-sabotage-route.test.mjs.
export function isSabotage(full) {
  const d = full.dimensions || {};
  if (d.break || d.sabotage || d.broken_on_purpose) return true;
  return (full.warnings || []).some((w) => /this receipt is a sabotage, not a result/.test(String(w)));
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
  // A SABOTAGE RUN'S RED IS A VERDICT ABOUT THE CHECK, NEVER ABOUT THE
  // PRODUCT — AND UNTIL 2026-10-09 IT CLOBBERED THE REAL RECEIPT WITH IT.
  // Found by the supervisor: `receipts/mail-log-scroll.json` sat at
  // `"status": "fail"` with two failures about `scrollbar-width "auto"` over
  // ROADMAP 3.1a, which was ticked and correct — re-run clean it is 20
  // assertions, 0 failed. The only trace of why was `dimensions.break:
  // "unstyled"` nine lines down. `receipts/r2-public-base.json` was in the
  // same state from item 0's gate-regression run. **A caught sabotage and a
  // real defect wrote byte-identical `status` fields, and the sabotage was
  // the LAST thing on disk**, so it is what every reader and every stale-
  // receipt sweep sees. That is `docs/gotchas.md` 105 one level out: there,
  // a sabotage was "caught" by a status rule rather than an assertion; here,
  // a caught sabotage IS the standing report.
  //
  // The fix is a different filename, not a different status: `validate()`
  // grades `status` and must keep failing a red receipt, so the sabotage
  // evidence stays complete and readable in its own file and the real
  // receipt keeps the last honest verdict about the product. The directory
  // validator below skips these the way it already skips `holds.json`.
  // `broken_on_purpose` is the third spelling, used by photo-release-order and cors-rule; until
  // 2026-10-13 their sabotage runs still clobbered the real receipt (found on ROADMAP 0.11cb).
  // And a fourth signal, 2026-10-18 (ROADMAP 98.3): the standard warning line. See isSabotage.
  const path = join(RECEIPTS, name + (isSabotage(full) ? ".sabotage" : "") + ".json");
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
      // `.sabotage.json` is a deliberate red about the CHECK, so it is not
      // graded here — see the note beside `writeReceipt`'s path.
      ? readdirSync(target).filter((f) => f.endsWith(".json") && f !== "holds.json" && !f.endsWith(".sabotage.json")).map((f) => join(target, f))
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
    for (const m of v.notes ?? []) console.log("        note: " + m);
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
