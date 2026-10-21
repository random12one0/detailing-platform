// ROADMAP 97.28 - the backup retention rule, executed for real.
//
// This test runs the ACTUAL "Prune old backups" shell out of
// `docs/ops/backup.live-copy.yml` through real bash and GNU date, with `gh`
// stubbed at the command boundary by `scripts/lib/pruneHarness.mjs` (a shell
// function, so no real `gh` is ever reached and nothing on GitHub is
// touched). Every deletion assertion reads the LEDGER of real delete calls -
// with their exact `--yes --cleanup-tag` flags - never the step's own
// "pruning ..." echoes. So the mutations finding 1 names go red here:
// replacing the deletion with a print leaves the ledger empty, changing the
// failed-listing exit to success leaves a zero status, removing the monthly
// guard keeps expired 1st-of-month copies, and stretching the period to
// twelve months keeps `backup-2027-07-01`.
//
// Sabotage runs on the same bytes the clean run judges, via the environment
// (a flag cannot reach a test file any other way, docs/gotchas.md 104):
//   RETENTION_BREAK=forever|twelve|noprint|exitzero  node --test tests/backup-retention.test.mjs
// each of which MUST go red. `scripts/backup-retention.mjs` runs the same
// shell and the same mutations as the committed proof with its receipts.
//
// The last test pins the four places that state the period in words. That one
// is a source-text guard by nature (the period in a document IS source text),
// and the entry says so; everything above it RUNS the rule.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import {
  pruneStep, runPrune, findBash, checkGnuDate, mutate, workflowNumbers, DELETE_LINE,
} from "../scripts/lib/pruneHarness.mjs";

const BREAK = process.env.RETENTION_BREAK || "";
if (BREAK && !["forever", "twelve", "noprint", "exitzero"].includes(BREAK)) {
  throw new Error(`unknown RETENTION_BREAK=${BREAK}`);
}

const norm = (f) => readFileSync(f, "utf8").replace(/\r\n/g, "\n");
const yml = norm("docs/ops/backup.live-copy.yml");
let step = pruneStep(yml); // throws when the step is missing or duplicated
if (BREAK) step = mutate(BREAK, step); // throws when the sabotage did not land
const { days, months } = workflowNumbers(step);

const bash = findBash(); // throws when there is no real shell
const gnu = checkGnuDate(bash);

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

const deletedTags = (r) => r.deletes.map((l) => l.split(" ")[1]);

test("the shell this proof needs is real bash with GNU date", () => {
  assert.ok(gnu.ok, `refusing to judge without the real shell (${gnu.detail})`);
  assert.match(process.version, /^v\d+/, "running under node");
});

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
  // tests below would then find no delete calls at all.
  assert.ok(step.includes(DELETE_LINE), "the step calls gh release delete with --yes --cleanup-tag");
});

test("the workflow refuses to prune blind: a failed listing stops the job", () => {
  assert.match(step, /if ! gh release list/);
  assert.ok(!/^.*gh release list.*\|\| true.*$/m.test(step), "the listing must not end in || true");
});

test("nightly boundary, through the real step: 2027-09-18 kept, 2027-09-17 deleted", () => {
  const r = runPrune({ bash, step, today: TODAY, tags: TAGS });
  assert.equal(r.status, 0, `the step ran clean (status ${r.status}): ${r.stderr.trim()}`);
  assert.deepEqual(r.unexpected, [], "it only ever called gh release list / delete");
  const del = deletedTags(r);
  assert.ok(!del.includes("backup-2027-09-18"), "29 days old is kept");
  assert.ok(del.includes("backup-2027-09-17"), "30 days old, not a 1st, is deleted");
  assert.deepEqual([...del].sort(), [...WANT_DELETED].sort(), "exactly the six expired tags go");
  for (const l of r.deletes) assert.match(l, /^DELETE backup-\S+ --yes --cleanup-tag$/, `exact flags: ${l}`);
});

test("monthly boundary, through the real step: 2027-08-01 kept, 2027-07-01 deleted", () => {
  const r = runPrune({ bash, step, today: TODAY, tags: TAGS });
  assert.equal(r.status, 0, r.stderr.trim());
  const del = deletedTags(r);
  assert.ok(!del.includes("backup-2027-08-01"), "2.5 months old is kept");
  assert.ok(del.includes("backup-2027-07-01"), "past three months is deleted");
});

test("monthly expiry is exact on a first-of-month run", () => {
  const at = runPrune({ bash, step, today: "2027-10-01", tags: TAGS });
  assert.equal(at.status, 0, at.stderr.trim());
  assert.ok(deletedTags(at).includes("backup-2027-07-01"), "deleted on the day it reaches three months");
  const before = runPrune({ bash, step, today: "2027-09-30", tags: TAGS });
  assert.equal(before.status, 0, before.stderr.trim());
  assert.ok(!deletedTags(before).includes("backup-2027-07-01"), "retained the day before");
});

test("a long month does not overflow: 2027-05-31 keeps March 1, deletes February 1", () => {
  // `2027-05-31 -3 months` overflows to March 3 in GNU date and would delete
  // the March 1 copy two months early; the step walks back from the month's
  // 1st instead, landing on February 28.
  const tags = ["backup-2027-05-31", "backup-2027-03-01", "backup-2027-02-01", "backup-2027-02-15", "v1.0"];
  const r = runPrune({ bash, step, today: "2027-05-31", tags });
  assert.equal(r.status, 0, r.stderr.trim());
  const del = deletedTags(r);
  assert.ok(!del.includes("backup-2027-03-01"), "March 1 is kept on May 31 (expires June 1)");
  assert.ok(del.includes("backup-2027-02-01"), "February 1 goes on May 31");
});

test("non-backup releases such as v1.0 are never touched", () => {
  const r = runPrune({ bash, step, today: TODAY, tags: TAGS });
  assert.equal(r.status, 0, r.stderr.trim());
  assert.deepEqual(r.deletes.filter((l) => l.includes("v1.0")), [], "no delete call for v1.0");
  assert.ok(!deletedTags(r).includes("v1.0"), "v1.0 survives");
});

test("an empty successful listing exits 0 with zero deletes - and proves the listing ran", () => {
  // A check that found zero targets is a failure (standing rule): the LIST ok
  // line proves the listing executed rather than read as empty.
  const r = runPrune({ bash, step, today: TODAY, tags: [] });
  assert.equal(r.status, 0, r.stderr.trim());
  assert.deepEqual(r.deletes, [], "zero deletes");
  assert.deepEqual(r.lists, ["LIST ok"], "the successful listing is on the record");
});

test("a failing listing is refused: nonzero exit, the error, no deletes", () => {
  // The exitzero mutation changes the step's `exit 1` to `exit 0`; this test
  // then sees a successful exit after a failed listing and goes red.
  const r = runPrune({ bash, step, today: TODAY, tags: TAGS, listOk: false });
  assert.notEqual(r.status, 0, "a failed listing must stop the job with a nonzero exit");
  assert.deepEqual(r.deletes, [], "nothing is deleted blind");
  assert.match(r.stderr + r.stdout, /refusing to prune blind/, "the refusal names the cause");
});

test("a failing deletion is refused: nonzero exit naming the tag, attempt on the record", () => {
  const r = runPrune({ bash, step, today: TODAY, tags: TAGS, failDeleteTag: "backup-2027-09-17" });
  assert.notEqual(r.status, 0, "a swallowed deletion failure must not exit 0");
  assert.ok(r.deletes.some((l) => l.startsWith("DELETE backup-2027-09-17 ")), "the attempted tag is recorded");
  assert.match(r.stderr + r.stdout, /backup-2027-09-17/, "the failure names the tag");
});

test("canary, every run: the pre-97.28 for-ever rule keeps 2027-07-01 on these same tags", () => {
  // The original defect, run through the same harness: it must keep what the
  // new rule deletes, proving this file tells the two apart.
  const old = mutate("forever", pruneStep(yml));
  assert.notEqual(old, step, "the canary rule differs from the tested one");
  const r = runPrune({ bash, step: old, today: TODAY, tags: TAGS });
  assert.equal(r.status, 0, r.stderr.trim());
  assert.ok(!deletedTags(r).includes("backup-2027-07-01"), "the old rule keeps the expired monthly copy");
});

test("every place that states the period states the same one (source-text guard)", () => {
  // The period in a document IS source text, so this test reads text. The
  // behavior above does not: it runs the shell.
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
