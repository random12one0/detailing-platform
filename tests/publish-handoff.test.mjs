// ROADMAP 0.6b — IS ANDREW'S PUBLISH BLOCK SAFE TO PASTE, IN THE ORDER HE APPROVED?
//
// Credential-free. Reads FOR-ANDREW.md, pulls the commands out from between the
// `0.6b-handoff` markers, and RUNS step 2's name-picking line (the node -e) the
// way his shell would, against made-up inventory receipts in a temp folder and
// against the real one. Nothing is published: `deploy-functions.mjs` is never
// called, only the line that would choose its arguments.
//
// The hazard it exists for: `deploy-functions.mjs` with no names publishes
// EVERY function, so a batch line whose list comes out empty publishes the
// payment webhook in a batch. The guard must stop that.
//
// Sabotage is an env var (docs/gotchas.md 104): BREAK=webhook-in-batch |
// unguarded | cancel-not-first | wrong-drive. Each must turn this red, and each asserts its
// edit landed before it is believed (gotchas 102).

import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { REPO, writeReceipt } from "../scripts/receipt.mjs";

const started_at = new Date().toISOString();
const BREAK = process.env.BREAK || "";
const failures = [];
let passed = 0, assertions = 0;
const check = (name, ok, why) => {
  assertions++;
  if (ok) { passed++; console.log("  ok   " + name); }
  else { failures.push(name + " — " + why); console.log("  FAIL " + name + " — " + why); }
};

const doc = readFileSync(join(REPO, "FOR-ANDREW.md"), "utf8").replace(/\r\n/g, "\n");
const m = doc.match(/<!-- 0\.6b-handoff:start -->([\s\S]*?)<!-- 0\.6b-handoff:end -->/);
if (!m) { console.log("FAIL — no 0.6b-handoff block in FOR-ANDREW.md; nothing was tested"); process.exit(1); }
let block = m[1];

// Sabotages reproduce the defects this block exists to prevent.
const sabotage = (from, to) => {
  const next = block.replace(from, to);
  if (next === block) { console.log("BREAK=" + BREAK + " did not land; the run proves nothing"); process.exit(2); }
  block = next;
};
if (BREAK === "webhook-in-batch") sabotage(",'stripe-webhook']", "]");
else if (BREAK === "unguarded") sabotage("if(!l.length){", "if(false){");
else if (BREAK === "cancel-not-first") sabotage("node scripts/deploy-functions.mjs update-booking", "node scripts/deploy-functions.mjs report-problem");
else if (BREAK === "wrong-drive") sabotage("cd /c/", "cd /d/");
else if (BREAK) { console.log("unknown BREAK=" + BREAK); process.exit(2); }

const code = [...block.matchAll(/```bash\n([\s\S]*?)```/g)].map((x) => x[1]).join("\n");
const lines = code.split("\n").map((l) => l.trim()).filter(Boolean);
const deploys = lines.filter((l) => l.includes("scripts/deploy-functions.mjs"));
const pickerSrc = code.match(/LIST=\$\(node -e "([\s\S]*?)"\)/)?.[1];

console.log("\n§ 1 — the order");
check("the block has exactly four publish lines (cancellation, batch, billing, webhook)",
  deploys.length === 4, "found " + deploys.length);
check("the first publish is update-booking, alone",
  /deploy-functions\.mjs update-booking$/.test(deploys[0] || ""), "first is: " + deploys[0]);
check("the payment webhook is the last publish, alone",
  /deploy-functions\.mjs stripe-webhook$/.test(deploys.at(-1) || ""), "last is: " + deploys.at(-1));
check("platform-billing is published alone, just before the webhook",
  /deploy-functions\.mjs platform-billing$/.test(deploys.at(-2) || ""), "second last is: " + deploys.at(-2));
check("the batch is guarded: it only publishes after the list was picked successfully",
  /LIST=\$\(node -e ".*"\) && .*node scripts\/deploy-functions\.mjs \$LIST$/.test(deploys[1] || ""), "batch line: " + deploys[1]);
// Git Bash spells C:\x as /c/x. The old block said /d/, which is not this machine.
const cd = lines.find((l) => l.startsWith("cd "))?.slice(3) || "";
const cdWin = cd.replace(/^\/([a-z])\//i, (_, d) => d.toUpperCase() + ":/");
check("the first line moves into this repo, on the drive it is actually on",
  cdWin.toLowerCase() === REPO.replace(/\\/g, "/").toLowerCase(), `cd ${cd} is not ${REPO}`);
const named = ["supabase/migrations/20261010010000_email_sends_keeps_the_body.sql",
  ...deploys.filter((l) => !l.includes("$LIST")).map((l) => "supabase/functions/" + l.split(" ").at(-1) + "/index.ts")];
check("the database change and every program named by hand exist in this checkout",
  named.every((f) => { try { readFileSync(join(REPO, f)); return true; } catch { return false; } }), "missing one of: " + named.join(", "));
const mig = lines.findIndex((l) => l.includes("20261010010000_email_sends_keeps_the_body.sql"));
const batchAt = lines.findIndex((l) => l.includes("deploy-functions.mjs $LIST"));
check("the email-body column is applied before the batch that can carry send-email",
  mig >= 0 && mig < batchAt, `migration line ${mig}, batch line ${batchAt}`);
check("the inventory runs before the first publish and after the last",
  lines.findIndex((l) => l === "node scripts/deployed-inventory.mjs") < lines.indexOf(deploys[0])
    && lines.at(-1) === "node scripts/deployed-inventory.mjs", "inventory is not on both ends");

console.log("\n§ 2 — step 2's name-picking line, run for real");
const ALL = ["update-booking", "platform-admin", "platform-billing", "stripe-webhook", "send-email", "cancel-booking", "report-problem"];
const MUST_NOT = ["update-booking", "platform-admin", "platform-billing", "stripe-webhook"];
const runPicker = (differing) => {
  const dir = mkdtempSync(join(tmpdir(), "handoff-"));
  try {
    if (differing) {
      mkdirSync(join(dir, "receipts"));
      writeFileSync(join(dir, "receipts", "deployed-inventory.json"), JSON.stringify({ dimensions: { differing } }));
    }
    const out = execFileSync(process.execPath, ["-e", pickerSrc], { cwd: dir, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    return { code: 0, names: out.trim().split(/\s+/).filter(Boolean) };
  } catch (e) {
    return { code: e.status ?? 1, names: String(e.stdout || "").trim().split(/\s+/).filter(Boolean) };
  } finally { rmSync(dir, { recursive: true, force: true }); }
};
let targets = 0;
const seen = [];
if (!pickerSrc) check("step 2's name-picking line was found", false, "no LIST=$(node -e \"...\") in the block");
else {
  const full = runPicker(ALL); targets++; seen.push("full: exit " + full.code + " -> " + full.names.join(" "));
  check("a full inventory: the picker succeeds", full.code === 0, "exit " + full.code);
  for (const f of MUST_NOT) check(`a full inventory: the batch leaves out ${f}`, !full.names.includes(f), "it is in: " + full.names.join(" "));
  check("a full inventory: the batch keeps the rest (send-email, cancel-booking, report-problem)",
    ["send-email", "cancel-booking", "report-problem"].every((f) => full.names.includes(f)), "got: " + full.names.join(" "));
  const only = runPicker(MUST_NOT); targets++; seen.push("only held/isolated: exit " + only.code + " -> " + only.names.join(" "));
  check("nothing left for the batch: the picker REFUSES, so the publish never runs with no names",
    only.code !== 0 && only.names.length === 0, `exit ${only.code}, printed "${only.names.join(" ")}"`);
  const missing = runPicker(null); targets++; seen.push("no receipt: exit " + missing.code);
  check("no receipt at all: the picker refuses", missing.code !== 0, "exit " + missing.code);
  const real = JSON.parse(readFileSync(join(REPO, "receipts", "deployed-inventory.json"), "utf8")).dimensions.differing;
  const live = runPicker(real); targets++; seen.push("today's inventory: exit " + live.code + " -> " + live.names.join(" "));
  const want = real.filter((f) => !MUST_NOT.includes(f));
  check(`today's inventory: the batch is exactly the ${want.length} of ${real.length} differing not held or isolated`,
    want.length ? live.code === 0 && live.names.join(" ") === want.join(" ") : live.code !== 0,
    "got: " + live.names.join(" "));
}

console.log("\n§ 3 — the words");
const prose = doc.slice(doc.indexOf("## YOURS, WHEN YOU LAUNCH"), m.index);
check("the block says publishing is his switch, flipped when he chooses",
  /This is your switch, and you flip it when you choose/.test(prose), "the sentence is gone");
check("the block does not call the deferral a blocker",
  !/\bblock(ed|er|ing)\b/i.test(prose) && /not something stuck/.test(prose), "it uses blocked/blocker, or lost its framing");

const failed = failures.length;
console.log(`\n${passed} passed, ${failed} failed, ${assertions} assertions, ${targets} of 4 inventories run.`);
const ART = "artifacts/publish-handoff/commands-as-tested.txt";
mkdirSync(join(REPO, "artifacts", "publish-handoff"), { recursive: true });
writeFileSync(join(REPO, ART), ["# commands pulled from FOR-ANDREW.md" + (BREAK ? " (BREAK=" + BREAK + ")" : ""), code, "# the picker, run", ...seen, ""].join("\n"));
const { path } = writeReceipt({
  check_id: "publish-handoff",
  started_at,
  status: failed || targets !== 4 ? "fail" : "pass",
  expected_targets: 4,
  discovered_targets: targets,
  attempted_targets: targets,
  completed_targets: targets,
  skipped_targets: 0,
  assertions_executed: assertions,
  min_assertions: 20,
  assertion_floor: "9 order and path questions + 9 picker questions over 4 fixed inventories + 2 wording questions; nothing the run finds changes the count",
  artifacts: [ART],
  failures,
  dimensions: { block: "FOR-ANDREW.md 0.6b-handoff", publish_lines: deploys.length, ...(BREAK ? { break: BREAK } : {}) },
  canary: { id: "empty-inventory-refused", observed_failure: !failures.some((f) => f.startsWith("nothing left")) },
});
console.log("receipt: " + path);
process.exit(failed ? 1 : 0);
