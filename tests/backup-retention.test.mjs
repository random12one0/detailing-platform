// ROADMAP 97.28 - the backup retention rule, pinned without a subprocess.
//
// This test imports ONLY `scripts/lib/retentionRule.mjs` (pure functions),
// the filesystem and in-process assertions: no `node:child_process`, no
// shell, nothing spawned. The actual shell execution lives in the allowed
// proof runner `scripts/backup-retention.mjs`, which runs the same workflow
// bytes and asserts the ledger of real delete calls (empty-listing,
// failed-delete, exact-expiry and long-month cases included). Both run one
// definition: this file calls the pure oracle with must-work and
// must-refuse values, and the runner cross-checks the shell against it.
//
// Sabotage runs on the same bytes the clean run judges, via the environment
// (a flag cannot reach a test file any other way, docs/gotchas.md 104):
//   RETENTION_BREAK=forever|twelve|noprint|exitzero  node --test tests/backup-retention.test.mjs
// each of which MUST go red: forever unwires the monthly guard, twelve
// stretches the period to a year, noprint swaps the deletion for a print,
// and exitzero lets a failed listing exit 0.
//
// The last test pins the four places that state the period in words. That one
// is a source-text guard by nature (the period in a document IS source text),
// and the entry says so; everything above it CALLS the rule.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import {
  pruneStep, mutate, workflowNumbers, DELETE_LINE, pruneTags,
  dayCutoff, monthCutoff,
} from "../scripts/lib/retentionRule.mjs";

const BREAK = process.env.RETENTION_BREAK || "";
if (BREAK && !["forever", "twelve", "noprint", "exitzero"].includes(BREAK)) {
  throw new Error(`unknown RETENTION_BREAK=${BREAK}`);
}

const norm = (f) => readFileSync(f, "utf8").replace(/\r\n/g, "\n");
const yml = norm("docs/ops/backup.live-copy.yml");
let step = pruneStep(yml); // throws when the step is missing or duplicated
if (BREAK) step = mutate(BREAK, step); // throws when the sabotage did not land
const { days, months } = workflowNumbers(step);

// Declared population: today 2027-10-17, so the 30-day line is 2027-09-17
// and the monthly line is 2027-07-31 (last day of the month three months
// back). backup-2027-07-01 is the tag that tells three months from twelve.
const TODAY = "2027-10-17";
const TAGS = [
  "backup-2027-10-17", // tonight
  "backup-2027-10-01", // inside 30 days
  "backup-2027-09-18", // 29 days old, the last day kept
  "backup-2027-09-17", // 30 days old, not a 1st: deleted
  "backup-2027-08-15", // old, not a 1st: deleted
  "backup-2027-09-01", // monthly, ~1.5 months old: kept
  "backup-2027-08-01", // monthly, ~2.5 months old: kept
  "backup-2027-07-01", // monthly, past 3 months: deleted - the rule this item adds
  "backup-2026-10-01", // monthly, past 12 months: deleted
  "backup-2026-09-01", // monthly, 13 months: deleted
  "backup-2026-09-08", // the first backup ever made: deleted
  "v1.0", // not a backup: never touched
];
const WANT_DELETED = [
  "backup-2027-09-17", "backup-2027-08-15", "backup-2027-07-01",
  "backup-2026-10-01", "backup-2026-09-01", "backup-2026-09-08",
];

test("the workflow copy states the decided three-month rule", () => {
  assert.equal(days, 30);
  assert.equal(months, 3);
});

test("the workflow keeps the monthly guard wired to its cutoff", () => {
  // The original defect deletes this comparison and keeps the 1st of each
  // month for ever; the forever mutation restores exactly that.
  assert.match(step, /case "\$DAY" in \*-01\) if \[\[ "\$DAY" > "\$MONTHLY_CUTOFF" \]\]/);
});

test("deletion is a real gh call, not a printed intention", () => {
  // The noprint mutation replaces this line with an echo; the ledger-based
  // runner would then find no delete calls at all.
  assert.ok(step.includes(DELETE_LINE), "the step calls gh release delete with --yes --cleanup-tag");
});

test("the workflow refuses to prune blind: a failed listing stops the job", () => {
  // The exitzero mutation changes the step's `exit 1` to `exit 0`; this test
  // then sees a successful exit after a failed listing and goes red.
  assert.match(step, /if ! gh release list/);
  assert.ok(!/^.*gh release list.*\|\| true.*$/m.test(step), "the listing must not end in || true");
  assert.match(step, /if ! gh release list[\s\S]*?exit 1/, "a failed listing exits nonzero");
});

test("nightly boundary, through the rule: 2027-09-18 kept, 2027-09-17 deleted", () => {
  assert.equal(dayCutoff(TODAY), "2027-09-17");
  const { kept, deleted } = pruneTags({ today: TODAY, tags: TAGS });
  assert.ok(kept.includes("backup-2027-09-18"), "29 days old is kept");
  assert.ok(deleted.includes("backup-2027-09-17"), "30 days old, not a 1st, is deleted");
  assert.deepEqual([...deleted].sort(), [...WANT_DELETED].sort(), "exactly the six expired tags go");
});

test("monthly boundary, through the rule: 2027-08-01 kept, 2027-07-01 deleted", () => {
  assert.equal(monthCutoff(TODAY), "2027-07-31");
  const { kept, deleted } = pruneTags({ today: TODAY, tags: TAGS });
  assert.ok(kept.includes("backup-2027-08-01"), "2.5 months old is kept");
  assert.ok(deleted.includes("backup-2027-07-01"), "past three months is deleted");
});

test("monthly expiry is exact on a first-of-month run", () => {
  assert.ok(pruneTags({ today: "2027-10-01", tags: TAGS }).deleted.includes("backup-2027-07-01"),
    "deleted on the day it reaches three months");
  assert.ok(!pruneTags({ today: "2027-09-30", tags: TAGS }).deleted.includes("backup-2027-07-01"),
    "retained the day before");
});

test("a long month does not overflow: 2027-05-31 keeps March 1, deletes February 1", () => {
  // `2027-05-31 -3 months` overflows to March 3 in GNU date and would delete
  // the March 1 copy two months early; the rule steps back from the month's
  // 1st instead, landing on February 28.
  assert.equal(monthCutoff("2027-05-31"), "2027-02-28");
  const tags = ["backup-2027-05-31", "backup-2027-03-01", "backup-2027-02-01", "backup-2027-02-15", "v1.0"];
  const { deleted } = pruneTags({ today: "2027-05-31", tags });
  assert.ok(!deleted.includes("backup-2027-03-01"), "March 1 is kept on May 31 (expires June 1)");
  assert.ok(deleted.includes("backup-2027-02-01"), "February 1 goes on May 31");
});

test("non-backup releases such as v1.0 are never touched", () => {
  const { kept, deleted } = pruneTags({ today: TODAY, tags: TAGS });
  assert.ok(!deleted.includes("v1.0"), "v1.0 is never deleted");
  assert.ok(kept.includes("v1.0"), "v1.0 survives");
});

test("an empty population deletes nothing", () => {
  // The shell proof that an empty SUCCESSFUL listing still ran (LIST ok on
  // the ledger) lives in the runner; the rule itself just deletes nothing.
  assert.deepEqual(pruneTags({ today: TODAY, tags: [] }), { kept: [], deleted: [] });
});

test("canary, every run: the pre-97.28 for-ever rule keeps 2027-07-01 on these same tags", () => {
  // The original defect, as step bytes: it must differ from the tested step
  // and must lack the monthly-cutoff comparison, proving this file tells the
  // two apart without running a shell. The oracle agrees: an unbounded
  // monthly exemption keeps what the decided rule deletes.
  const old = mutate("forever", pruneStep(yml));
  assert.notEqual(old, step, "the canary rule differs from the tested one");
  assert.ok(!/"\$DAY" > "\$MONTHLY_CUTOFF"/.test(old), "the old rule never compares against the monthly cutoff");
  assert.ok(/"\$DAY" > "\$MONTHLY_CUTOFF"/.test(step), "the decided rule does");
  assert.ok(pruneTags({ today: TODAY, tags: TAGS }).deleted.includes("backup-2027-07-01"),
    "the decided rule deletes the expired monthly copy");
  assert.ok(!pruneTags({ today: TODAY, tags: TAGS, months: 1200 }).deleted.includes("backup-2027-07-01"),
    "an unbounded exemption keeps that same copy");
});

test("every place that states the period states the same one (source-text guard)", () => {
  // The period in a document IS source text, so this test reads text. The
  // behavior above does not: it calls the rule.
  const row = (doc) => (doc.split("\n").find((l) => l.startsWith("| Retention |")) || "");
  const backups = norm("docs/ops/backups.md");
  const recovery = norm("docs/recovery.md");
  return import(pathToFileURL("app/src/landing/legal.js").href).then(({ PRIVACY }) => {
    const howLong = (PRIVACY.sections.find(([what]) => what === "How long") || [])[1] || "";
    const found = {
      "workflow copy": [
        Number(step.match(/CUTOFF=\$\(date -u -d "\$TODAY -(\d+) days"/)?.[1]),
        Number(step.match(/MONTH_START -(\d+) months -1 day/)?.[1]) + 1,
      ],
      "docs/ops/backups.md": [
        Number(row(backups).match(/every backup for (\d+) days/)?.[1]),
        Number(row(backups).match(/1st of each month for (\d+) months/)?.[1]),
      ],
      "docs/recovery.md": [
        Number(row(recovery).match(/the last (\d+) days/)?.[1]),
        Number(row(recovery).match(/1st of each month kept for (\d+) months/)?.[1]),
      ],
      "privacy page": [
        Number(howLong.match(/kept for (\d+) days/)?.[1]),
        Number(howLong.match(/1st of each month for (\d+) months/)?.[1]),
      ],
    };
    for (const [where, [d, m]] of Object.entries(found)) {
      assert.equal(d, 30, `${where} days`);
      assert.equal(m, 3, `${where} months`);
    }
    assert.match(howLong, /Then it is deleted too\./, "eventual deletion");
  });
});
