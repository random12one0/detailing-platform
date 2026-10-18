// node scripts/sweep-figures-walk.mjs <from-rev> [to-rev]
//
// Walks every revision that touched ROADMAP.md from <from-rev> to [to-rev]
// (default HEAD) and prints each one where the three figures that
// tests/sweep-methods-are-pinned.test.mjs declares moved —
// numberedOpenItems / quoteCriteria / quoteFragments — with the item ids that
// arrived and left. It runs THAT FILE'S OWN `openItems` and `quoteSweep`,
// lifted out by text, so it cannot drift from the test into a copy.
//
// Credential-free, read-only, one `git show` per revision. Written for ROADMAP
// 100.7 so a declared figure is moved with its cause rather than fitted to the
// output. Anchor: `9ce2e5f6` must print 59/35/412, the figures declared there.
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const [from, to = "HEAD"] = process.argv.slice(2);
if (!from) { console.error("usage: node scripts/sweep-figures-walk.mjs <from-rev> [to-rev]"); process.exit(2); }

const src = readFileSync("tests/sweep-methods-are-pinned.test.mjs", "utf8");
const cut = (a, b) => {
  const i = src.indexOf(a), j = src.indexOf(b);
  if (i < 0 || j < 0) throw new Error(`could not find "${a}" .. "${b}" in the test file — it has been reshaped`);
  return src.slice(i, j);
};
const { openItems, quoteSweep } = new Function("CANARY",
  cut("function openItems", "// METHOD 1") + cut("const FRAGMENT_RE", "// DECLARED —")
  + "\nreturn { openItems, quoteSweep };")("");

const git = (args) => execFileSync("git", args, { encoding: "utf8", maxBuffer: 1 << 28 });
const figures = (rev) => {
  const t = git(["show", `${rev}:ROADMAP.md`]);
  const ids = openItems(t).items.filter((i) => i.id).map((i) => i.id);
  const q = quoteSweep(t);
  return { ids, key: `${ids.length}/${q.criteria}/${q.fragments}` };
};

const start = figures(from);
console.log(`${start.key.padEnd(12)} ${from} (start)`);
let prev = start.key, prevIds = new Set(start.ids);
const revs = git(["rev-list", "--reverse", `${from}..${to}`, "--", "ROADMAP.md"]).trim().split("\n").filter(Boolean);
for (const r of revs) {
  const { ids, key } = figures(r);
  if (key === prev) continue;
  const now = new Set(ids);
  const add = ids.filter((x) => !prevIds.has(x)), del = [...prevIds].filter((x) => !now.has(x));
  const subj = git(["log", "-1", "--format=%h %ad %s", "--date=short", r]).trim().slice(0, 110);
  console.log(`${key.padEnd(12)} ${subj}\n   +${add.length} [${add.join(" ")}] -${del.length} [${del.join(" ")}]`);
  prev = key; prevIds = now;
}
console.log(`${prev.padEnd(12)} ${to} (end, ${revs.length} ROADMAP revisions walked)`);
