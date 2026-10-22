// ROADMAP 97.28 - HOW LONG A BACKUP KEEPS A DELETED CUSTOMER, RUN FOR REAL.
//
// Andrew, 2026-10-19: keep the monthly backups for 3 months, then delete them
// (supersedes 2026-10-15 twelve months). Until then the nightly job kept the
// 1st of each month FOR EVER, while the privacy page said deleted means
// deleted (security audit S-M8). The rule lives in four places and this runs
// the first and holds all four:
//
//   1. `docs/ops/backup.live-copy.yml` - the copy of the private repo's job.
//      Its "Prune old backups" shell is RUN here, through real bash and GNU
//      date, against declared release-tag populations on fixed days.
//      `scripts/lib/pruneHarness.mjs` stubs `gh`
//      at the command boundary with a shell function, so no real `gh` can
//      ever be reached and nothing on GitHub is touched. Deletion is proved
//      by the LEDGER of real delete calls with their exact flags, never by
//      the step's own "pruning ..." echoes.
//   2. `docs/ops/backups.md` and 3. `docs/recovery.md` - their Retention rows.
//   4. the privacy page's "How long" paragraph, read from `PRIVACY` itself.
//
// A plain script, not `node --test`:  node scripts/backup-retention.mjs
// Sabotage is an env var (docs/gotchas.md 104):
//   RETENTION_BREAK=forever  the old rule (1st of each month kept for ever) - section 1 must go red
//   RETENTION_BREAK=drift    recovery.md says 24 months, in memory - section 2 must go red
//   RETENTION_BREAK=twelve   the monthly exemption lasts twelve months - tag outcomes and agreement must go red
//   RETENTION_BREAK=noprint  deletion replaced by a print - every expected deletion must go red
//   RETENTION_BREAK=exitzero listing failure exits 0 - the fail-list check must go red
// Each sabotage proves its edit landed before anything is judged (gotchas 102).
//
// NOT CHECKED, BY NAME: Spanish. The privacy page has no Spanish version -
// `landing/legal.js` is English-only by ruling (`lib/appI18n.js`: the legal
// pages "MUST NOT BE MACHINE-TRANSLATED BY ANYBODY") - so there is no Spanish
// sentence to hold. ROADMAP 97.28 records the decided English-only requirement;
// the final v10 contract waives the Spanish clauses of R7/R8/R9.
import { readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { writeReceipt } from "./receipt.mjs";
import { pruneTags, RETENTION_DAYS, RETENTION_MONTHS, pruneStep, mutate, workflowNumbers } from "./lib/retentionRule.mjs";
import { runPrune, findBash, checkGnuDate } from "./lib/pruneHarness.mjs";

const started_at = new Date().toISOString();
const BREAK = process.env.RETENTION_BREAK || "";
const BREAKS = ["forever", "drift", "twelve", "noprint", "exitzero"];
if (BREAK && !BREAKS.includes(BREAK)) { console.error(`unknown RETENTION_BREAK=${BREAK}`); process.exit(2); }

let assertions = 0, passed = 0;
const failures = [], transcript = [];
const say = (s) => { console.log(s); transcript.push(s); };
function check(name, ok, detail = "") {
  assertions++;
  if (ok) passed++; else failures.push(`${name}${detail ? " - " + detail : ""}`);
  say(`${ok ? "ok  " : "FAIL"} ${name}${detail && !ok ? "  (" + detail + ")" : ""}`);
}

const MONTHS = RETENTION_MONTHS, DAYS = RETENTION_DAYS; // one definition: scripts/lib/retentionRule.mjs (Andrew 2026-10-19)
const WORKFLOW = "docs/ops/backup.live-copy.yml";
const yml = readFileSync(WORKFLOW, "utf8").replace(/\r\n/g, "\n");

let step = pruneStep(yml); // throws when the step is missing or duplicated
if (BREAK && BREAK !== "drift") step = mutate(BREAK, step); // throws when the sabotage did not land
const { days, months } = workflowNumbers(step);

// Declared population: today 2027-10-17, so the 30-day line is 2027-09-17 and
// the monthly line is 2027-07-31 (last day of the month three months back).
// Twelve tags, and what each must become.
// backup-2027-07-01 is the tag that tells three months from twelve: this rule
// deletes it, the old twelve-month rule keeps it.
const TODAY = "2027-10-17";
const TAGS = {
  "backup-2027-10-17": "keep",   // tonight
  "backup-2027-10-01": "keep",   // inside 30 days
  "backup-2027-09-18": "keep",   // 29 days old, the last day kept
  "backup-2027-09-17": "delete", // 30 days old, not a 1st
  "backup-2027-08-15": "delete", // old, not a 1st
  "backup-2027-09-01": "keep",   // monthly, ~1.5 months old
  "backup-2027-08-01": "keep",   // monthly, ~2.5 months old
  "backup-2027-07-01": "delete", // monthly, past 3 months - the rule this item adds
  "backup-2026-10-01": "delete", // monthly, past 12 months
  "backup-2026-09-01": "delete", // monthly, 13 months
  "backup-2026-09-08": "delete", // the first backup ever made
  "v1.0": "keep",                // not a backup; the step must never touch it
};
const deletedTags = (r) => r.deletes.map((l) => l.split(" ")[1]);

say("0. the shell this needs");
let bash = null, bashOk = false, bashDetail = "";
try {
  bash = findBash();
  const g = checkGnuDate(bash);
  bashOk = g.ok; bashDetail = g.detail;
} catch (e) { bashDetail = e.message; }
check("0a - real bash with GNU date is here (refuse rather than judge without it)", bashOk, bashDetail);

say("1. the prune rule, run for real");
const r = bashOk ? runPrune({ bash, step, today: TODAY, tags: Object.keys(TAGS) }) : { status: -1, stdout: "", stderr: "not run", ledger: [], lists: [], deletes: [], unexpected: [] };
const deleted = deletedTags(r);
check("1a - the step ran and exited 0", r.status === 0, `${r.status} ${(r.stderr || "").trim()}`);
check("1b - it only ever called gh release list / delete", r.unexpected.length === 0, (r.stdout || "").trim().slice(-300));
check("1c - it announced each deletion it made", (r.stdout.match(/^pruning /gm) || []).length === deleted.length, (r.stdout || "").trim().slice(-300));
for (const [tag, want] of Object.entries(TAGS)) {
  check(`1d - ${tag} is ${want === "keep" ? "kept" : "deleted"}`, deleted.includes(tag) === (want === "delete"));
}
check("1e - exactly 6 deleted, every one a real delete call with --yes --cleanup-tag",
  deleted.length === 6 && r.deletes.every((l) => /^DELETE backup-\S+ --yes --cleanup-tag$/.test(l)),
  deleted.join(", "));

// Exact monthly expiry, on a first-of-month run: the comparison is strict, so
// the 1st-of-month copy dies on the day it reaches three months, not after.
if (bashOk) {
  const at = runPrune({ bash, step, today: "2027-10-01", tags: Object.keys(TAGS) });
  const atDel = deletedTags(at);
  check("1g - first-of-month run 2027-10-01 deletes backup-2027-07-01 at exact expiry", atDel.includes("backup-2027-07-01"), atDel.join(", "));
  const before = runPrune({ bash, step, today: "2027-09-30", tags: Object.keys(TAGS) });
  const beforeDel = deletedTags(before);
  check("1h - day before (2027-09-30) still retains backup-2027-07-01", !beforeDel.includes("backup-2027-07-01"), beforeDel.join(", "));
  // Long-month overflow: on 2027-05-31 the cutoff must be 2027-02-28, so the
  // March 1 copy (expires June 1) is kept while February 1 goes. The old
  // `$TODAY -3 months` formula gives March 3 here and deletes March 1 early.
  const MAY_TAGS = ["backup-2027-05-31", "backup-2027-03-01", "backup-2027-02-01", "backup-2027-02-15", "v1.0"];
  const may = runPrune({ bash, step, today: "2027-05-31", tags: MAY_TAGS });
  const mayDel = deletedTags(may);
  check("1i - long-month run 2027-05-31 keeps backup-2027-03-01 (expires June 1)", !mayDel.includes("backup-2027-03-01"), mayDel.join(", "));
  check("1j - long-month run 2027-05-31 deletes backup-2027-02-01", mayDel.includes("backup-2027-02-01"), mayDel.join(", "));
  // A failed listing must stop the job: nonzero exit, nothing deleted.
  const blind = runPrune({ bash, step, today: TODAY, tags: Object.keys(TAGS), listOk: false });
  const blindDel = deletedTags(blind);
  check("1p - a failed release listing exits nonzero and deletes nothing", blind.status !== 0 && blindDel.length === 0, `status ${blind.status}: ${blindDel.join(", ")}`);
  const empty = runPrune({ bash, step, today: TODAY, tags: [] });
  check("1k - an empty successful listing exits 0 with a recorded LIST ok and zero deletes",
    empty.status === 0 && empty.deletes.length === 0 && empty.lists.join(",") === "LIST ok",
    `status ${empty.status}: ${empty.ledger.join(", ")}`);
  const failDel = runPrune({ bash, step, today: TODAY, tags: Object.keys(TAGS), failDeleteTag: "backup-2027-09-17" });
  check("1m - a failed release deletion exits nonzero naming the tag, attempt on the record",
    failDel.status !== 0 && failDel.deletes.some((l) => l.startsWith("DELETE backup-2027-09-17 ")) &&
    (failDel.stdout + failDel.stderr).includes("backup-2027-09-17"),
    `status ${failDel.status}: ${(failDel.stdout + failDel.stderr).trim().slice(-200)}`);
  const oracleSame = (t, got, list = Object.keys(TAGS)) => JSON.stringify([...got].sort()) === JSON.stringify(pruneTags({ today: t, tags: list }).deleted.sort());
  check("1o - the shared oracle deletes exactly what the shell deleted on all run dates",
    oracleSame(TODAY, deleted) && oracleSame("2027-10-01", atDel) && oracleSame("2027-09-30", beforeDel) && oracleSame("2027-05-31", mayDel, MAY_TAGS),
    "the oracle is the module the belt-run test calls");
} else {
  for (const name of ["1g - first-of-month expiry (no shell, refused)", "1h - day-before retention (no shell, refused)",
    "1i - overflow run (no shell, refused)", "1j - overflow run (no shell, refused)",
    "1p - fail-list run (no shell, refused)", "1o - oracle agreement (no shell, refused)"]) check(name, false, "bash missing");
}

// CANARY, every run: the old rule on the same tags must be caught keeping the
// 1st of each month past 3 months - including 2027-07-01, which a twelve-month
// rule would also keep.
const canary = bashOk ? runPrune({ bash, step: mutate("forever", pruneStep(yml)), today: TODAY, tags: Object.keys(TAGS) }) : { deletes: [] };
const canaryDeleted = deletedTags(canary);
const canaryCaught = bashOk && !canaryDeleted.includes("backup-2027-07-01") && !canaryDeleted.includes("backup-2026-10-01") && !canaryDeleted.includes("backup-2026-09-01");
check("1f - canary: the for-ever rule keeps 2027-07-01, 2026-10-01 and 2026-09-01, and this run tells them apart", canaryCaught, canaryDeleted.join(", "));

say("2. every place that states the period states the same one");
const read = (f) => readFileSync(f, "utf8").replace(/\r\n/g, "\n");
let recovery = read("docs/recovery.md");
if (BREAK === "drift") {
  const b = recovery.replace("1st of each month kept for 3 months", "1st of each month kept for 24 months");
  if (b === recovery) throw new Error("sabotage drift did not land - refusing to judge");
  say("sabotage drift landed");
  recovery = b;
}
const backups = read("docs/ops/backups.md");
const { PRIVACY } = await import(pathToFileURL("app/src/landing/legal.js").href);
const howLong = (PRIVACY.sections.find(([what]) => what === "How long") || [])[1] || "";
const row = (doc) => (doc.split("\n").find((l) => l.startsWith("| Retention |")) || "");
const stated = {
  [WORKFLOW]: [step.match(/CUTOFF=\$\(date -u -d "\$TODAY -(\d+) days"/), step.match(/MONTH_START -(\d+) months -1 day/)],
  "docs/ops/backups.md": [row(backups).match(/every backup for (\d+) days/), row(backups).match(/1st of each month for (\d+) months/)],
  "docs/recovery.md": [row(recovery).match(/the last (\d+) days/), row(recovery).match(/1st of each month kept for (\d+) months/)],
  "privacy page, How long": [howLong.match(/kept for (\d+) days/), howLong.match(/1st of each month for (\d+) months/)],
};
// The workflow phrases the monthly rule as "first of this month, back N-1
// months, back a day" - the last day of the month three months back - so its
// stated number is MONTHS-1 where the documents state MONTHS.
for (const [where, [d, m]] of Object.entries(stated)) {
  const wantMonths = where === WORKFLOW ? MONTHS - 1 : MONTHS;
  check(`2a - ${where} states ${DAYS} days and ${MONTHS} months`, Number(d?.[1]) === DAYS && Number(m?.[1]) === wantMonths,
    `days ${d?.[1] ?? "not found"}, months ${m?.[1] ?? "not found"}`);
}
check("2b - the privacy page says the backup copy is then deleted", /Then it is deleted too\./.test(howLong), howLong.slice(-160));

const failed = assertions - passed;
say(`\n${passed} passed, ${failed} failed${BREAK ? `  (RETENTION_BREAK=${BREAK}: a sabotage, this run MUST be red)` : ""}`);
say("NOT CHECKED: Spanish - the privacy page has no Spanish version (legal.js is English-only by ruling).");
const txt = BREAK ? `receipts/backup-retention.sabotage-${BREAK}.txt` : "receipts/backup-retention.txt";
writeFileSync(txt, [`backup-retention ${new Date().toISOString()} break=${BREAK || "none"}`, ...transcript,
  ...failures.map((x) => "FAIL " + x)].join("\n") + "\n");
writeReceipt({
  check_id: BREAK ? `backup-retention-${BREAK}` : "backup-retention",
  started_at,
  status: failed ? "fail" : "pass",
  expected_targets: 22, discovered_targets: 22, attempted_targets: 22, completed_targets: 22, skipped_targets: 0,
  assertions_executed: assertions,
  min_assertions: 31,
  assertion_floor: "1 shell + 3 run + 12 tags + 1 count + 2 expiry + 2 overflow + 1 fail-list + 1 empty-list + 1 failed-delete + 1 oracle + 1 canary + 4 places + 1 deleted sentence = 31, every check() unconditional; targets are the 12 declared tags, the 2 exact-expiry runs, the 2 overflow tags, the empty listing, the failed delete and the 4 places the period is stated.",
  canary: { id: "for-ever-rule", observed_failure: canaryCaught, what: "the pre-97.28 prune shell, run on the same tags, keeps the 1st-of-month copies older than 3 months (including 2027-07-01, which a twelve-month rule would also keep)" },
  failures,
  artifacts: [txt],
  dimensions: { roadmap: "97.28", break: BREAK || null, today: TODAY },
  warnings: [
    "The rule is run from the COPY in this repo. The private repo's job keeps the 1st of each month for ever until Andrew installs the copy (FOR-ANDREW.md).",
    "UNJUDGEABLE: Spanish. The privacy page is English-only by ruling, so there is no Spanish sentence to check.",
  ],
});
process.exit(failed ? 1 : 0);
