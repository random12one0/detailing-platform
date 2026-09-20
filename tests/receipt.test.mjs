// THE VALIDATOR'S OWN NEGATIVE CONTROLS — report § "Discipline for trusting a
// check", rule 7: *"Test the checker. Unit-test target discovery, error
// handling, missing configuration, output schema, and partial-run behaviour."*
//
// AND THIS REPO'S OWN RULE, which says the same thing in fewer words: **break
// a check on purpose before you trust it.** `scripts/receipt.mjs` is the thing
// that decides whether every other check told the truth. If it can be handed a
// receipt that lies and still say PASS, it has moved the false green one level
// up and made it harder to see rather than easier.
//
// So every rule in `validate()` gets a receipt that breaks exactly that rule
// and nothing else, and the test asserts the rule fires. A rule with no case
// here is a rule nobody has proved works.
//
//   node --test tests/receipt.test.mjs

import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { test } from "node:test";

import { REPO, validate } from "../scripts/receipt.mjs";

// A REAL FILE, because the artifact rule stats the disk. Written into the OS
// temp dir and pathed relative to the repo, which is what a receipt carries.
const dir = mkdtempSync(join(tmpdir(), "receipt-test-"));
const realFile = join(dir, "evidence.png");
writeFileSync(realFile, "not really a png, but not zero bytes either");
const emptyFile = join(dir, "empty.png");
writeFileSync(emptyFile, "");
const rel = (p) => relative(REPO, p).split("\\").join("/");

process.on("exit", () => rmSync(dir, { recursive: true, force: true }));

/** A receipt that passes every rule. Each case below breaks exactly one. */
const good = () => ({
  check_id: "fixture/v1",
  git_sha: "0".repeat(40),
  environment: "test",
  started_at: "2026-09-16T00:00:00.000Z",
  finished_at: "2026-09-16T00:01:00.000Z",
  status: "pass",
  expected_targets: 4,
  discovered_targets: 4,
  attempted_targets: 4,
  completed_targets: 4,
  skipped_targets: 0,
  assertions_executed: 40,
  min_assertions: 10,
  failures: [],
  dimensions: { viewports: [320, 390, 768, 1440] },
  artifacts: [rel(realFile)],
  warnings: [],
  canary: { id: "deliberate-overflow", observed_failure: true },
});

// The SHA rule is off for every case except its own — these fixtures are not
// for any real commit, and leaving it on would make every case pass for the
// wrong reason, which is the exact defect this file exists to prevent.
const v = (r) => validate(r, { sha: null });

/** Assert the receipt is rejected AND that the message names the right rule. */
const rejects = (r, needle) => {
  const out = v(r);
  assert.equal(out.ok, false, "expected this receipt to be REJECTED, it was accepted");
  const joined = out.problems.join(" | ");
  assert.ok(
    joined.toLowerCase().includes(needle.toLowerCase()),
    `rejected, but for the wrong reason.\n  wanted a problem mentioning: ${needle}\n  got: ${joined}`,
  );
};

test("0 · the control — a sound receipt is accepted", () => {
  const out = v(good());
  assert.deepEqual(out.problems, [], "the good fixture must pass, or every case below is meaningless");
  assert.equal(out.ok, true);
});

test("1 · a missing required field is rejected, and named", () => {
  for (const field of ["check_id", "expected_targets", "canary", "min_assertions", "artifacts"]) {
    const r = good();
    delete r[field];
    rejects(r, field);
  }
});

test("2 · a field of the wrong type is rejected", () => {
  const r = good();
  r.expected_targets = "4";
  rejects(r, "should be number");
});

test("3 · zero targets is a FAILURE, not a pass — the whole point", () => {
  const zero = { ...good(), expected_targets: 0, discovered_targets: 0, attempted_targets: 0, completed_targets: 0 };
  rejects(zero, "expects nothing proves nothing");

  // And the subtler one: it expected work, found none, and called that clean.
  const foundNone = { ...good(), discovered_targets: 0, attempted_targets: 0, completed_targets: 0 };
  rejects(foundNone, "nothing was found to test");
});

test("4 · counts that disagree are rejected — sweep-widths' own failure", () => {
  // Discovered 4, finished 1, printed clean. This is `sweep-widths.mjs`
  // reporting clean over 38 real findings, expressed as four integers.
  rejects({ ...good(), completed_targets: 1 }, "target counts disagree");
  rejects({ ...good(), attempted_targets: 2 }, "target counts disagree");
  rejects({ ...good(), discovered_targets: 3 }, "target counts disagree");
});

test("5 · a skip is a failure unless allowlisted, and the allowlist expires", () => {
  rejects({ ...good(), skipped_targets: 1 }, "skip_allowlist");

  // Allowlisted but already expired — a stale excuse is not an excuse.
  rejects(
    { ...good(), skipped_targets: 1, skip_allowlist: { reason: "flaky font load", expires: "2020-01-01" } },
    "expired",
  );

  // Allowlisted, reasoned, and still in date: accepted.
  const live = {
    ...good(),
    skipped_targets: 1,
    skip_allowlist: { reason: "flaky font load", expires: "2099-01-01" },
  };
  assert.equal(v(live).ok, true, "a current, reasoned allowlist should be accepted");
});

test("6 · assertions below the declared floor are rejected", () => {
  rejects({ ...good(), assertions_executed: 9 }, "declared minimum");
  // And a floor of zero is not a floor — it would let the rule pass on nothing.
  rejects({ ...good(), min_assertions: 0 }, "not a floor");
});

test("7 · artifacts must exist on disk and must not be empty", () => {
  rejects({ ...good(), artifacts: [] }, "nothing for a person to look at");
  rejects({ ...good(), artifacts: ["receipts/a-file-that-is-not-there.png"] }, "missing on disk");
  // A zero-byte screenshot is a captured nothing — gotchas.md's backgrounded
  // tab, arriving as a file rather than as a wrong number.
  rejects({ ...good(), artifacts: [rel(emptyFile)] }, "empty");
});

test("8 · a canary that did NOT fail invalidates the whole receipt", () => {
  // THE MOST IMPORTANT CASE IN THIS FILE. The canary is a defect handed to the
  // check on purpose. If the check did not catch it, the check is not looking,
  // and its clean verdict on everything else means nothing.
  rejects({ ...good(), canary: { id: "deliberate-overflow", observed_failure: false } }, "did NOT fail");
  rejects({ ...good(), canary: { id: "deliberate-overflow" } }, "did NOT fail");
  rejects({ ...good(), canary: {} }, "no `id`");
});

test("9 · recorded failures are rejected however the check graded itself", () => {
  rejects({ ...good(), failures: [{ target: "/calendar", why: "overflow" }] }, "failure(s) recorded");
});

test("10 · the check cannot grade itself — status is recomputed, not trusted", () => {
  // A check that found nothing and wrote "pass" anyway. This is the shape of
  // every false green in this repo's history.
  const liar = { ...good(), discovered_targets: 0, attempted_targets: 0, completed_targets: 0, status: "pass" };
  const out = v(liar);
  assert.equal(out.ok, false);
  assert.ok(
    out.problems[0].includes('wrote status "pass"'),
    "the report should lead with the fact that the check claimed a pass",
  );

  // And the other direction: every rule passed but the check said "fail".
  // Trusting the numbers over the label has to cut both ways or it is not a
  // recomputation, it is a second opinion nobody asked for.
  rejects({ ...good(), status: "fail" }, "every rule passed");
});

test("11 · a receipt for another commit is rejected when a SHA is required", () => {
  const out = validate(good(), { sha: "f".repeat(40) });
  assert.equal(out.ok, false);
  assert.ok(out.problems.join(" ").includes("HEAD is ffffffff"), "should name the commit it wanted");
});

// ---------------------------------------------------------------------------
// STALE IS A THIRD ANSWER, NOT A KIND OF FAILURE — 2026-09-20.
//
// This repo reached "2 of 23 receipts valid" with one genuinely broken check
// and twenty-one merely old ones reading identically, which is the same
// indistinguishability the receipt exists to remove, one level up. The three
// tests below are the whole of the distinction.
// ---------------------------------------------------------------------------
test("11a · a receipt that is merely OLD is stale, not failed", () => {
  const out = validate(good(), { sha: "f".repeat(40) });
  assert.equal(out.verdict, "stale", "an out-of-date clean run is not a failure");
  assert.equal(out.stale, true);
  assert.ok(out.staleness.includes("now out of date"), "should say what stale means");
});

test("11b · an OLD receipt that ALSO FAILED is a failure, never stale", () => {
  // THE ORDER IS THE LOAD-BEARING PART. Asking about staleness first hides a
  // broken check inside the comfortable pile of old ones — measured: with the
  // two branches swapped this exact receipt reported "STALE … every rule
  // passed", and the failure count dropped from 2 to 1.
  const out = validate({ ...good(), status: "fail", failures: ["a real defect"] },
    { sha: "f".repeat(40) });
  assert.equal(out.verdict, "fail", "staleness must never mask a real failure");
  assert.ok(out.problems.join(" ").includes("1 failure(s) recorded"));
});

test("11c · a fresh clean receipt is neither", () => {
  const out = validate(good(), { sha: null });
  assert.equal(out.verdict, "pass");
  assert.equal(out.stale, false);
  assert.equal(out.ok, true);
});

// ---------------------------------------------------------------------------
// A HOLD IS A RECORDED DECISION WITH AN EXPIRY — 2026-09-20.
//
// `deployed-inventory` correctly reports that 22 of 39 edge functions run
// older code than this checkout. Deploying is frozen until Andrew rules, so
// those findings are a known hold rather than 23 actionable defects — and a
// hold that cannot lapse is an exemption nobody voted for. § 13b is the
// expiry being watched to lapse, which is the only thing that makes it a
// mechanism rather than a promise.
// ---------------------------------------------------------------------------
const HELD = { reason: "held pending a decision", expires: "2999-01-01T00:00:00Z", covers: 2 };
const failing = () => ({ ...good(), status: "fail", failures: ["one", "two"] });

test("13a · recorded failures under a live hold are HELD, not failed", () => {
  const out = validate(failing(), { sha: null, holds: { "fixture/v1": HELD } });
  assert.equal(out.verdict, "held");
  assert.equal(out.hold.reason, "held pending a decision");
  assert.equal(out.ok, false, "held is not the same as fine");
});

test("13b · a LAPSED hold fails and names the hold and its date", () => {
  const out = validate(failing(), {
    sha: null,
    holds: { "fixture/v1": { ...HELD, expires: "2000-01-01T00:00:00Z" } },
  });
  assert.equal(out.verdict, "fail", "a hold that has lapsed holds nothing");
  const said = out.problems.join(" ");
  assert.ok(said.includes("LAPSED"), "should say it lapsed");
  assert.ok(said.includes("held pending a decision"), "should name the hold");
  assert.ok(said.includes("2000-01-01"), "should name the date it lapsed on");
});

test("13c · failures beyond what the hold covers are not held", () => {
  const out = validate({ ...failing(), failures: ["one", "two", "a NEW one"] },
    { sha: null, holds: { "fixture/v1": HELD } });
  assert.equal(out.verdict, "fail", "a hold must never absorb a finding nobody agreed to");
  assert.ok(out.problems.join(" ").includes("the hold covers 2"));
});

test("13d · a hold never covers a check that cannot count", () => {
  // A hold is about FINDINGS. A check whose targets disagree is broken, and
  // no decision by anybody makes its numbers add up.
  const out = validate({ ...failing(), completed_targets: 1 },
    { sha: null, holds: { "fixture/v1": HELD } });
  assert.equal(out.verdict, "fail");
  assert.ok(out.problems.join(" ").includes("target counts disagree"));
});

test("12 · garbage in is rejected without throwing", () => {
  for (const junk of [null, "a string", 42, [], undefined]) {
    const out = v(junk);
    assert.equal(out.ok, false, `expected ${JSON.stringify(junk)} to be rejected`);
    assert.ok(out.problems.length > 0);
  }
});
