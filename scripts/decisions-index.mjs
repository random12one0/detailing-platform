// Keep DECISIONS.md's index honest.
//
// The file is 3,800 lines. Nobody reads it end to end — including the agent
// that wrote most of it — so it grew an index at the top (roadmap 2.6's
// follow-up, the owner's ask). An index that goes stale is worse than none:
// a session that trusts it and finds nothing concludes the decision was never
// made, and re-decides it. Three of the most expensive mistakes in this
// project's history are exactly that shape.
//
// So this checks two things and nothing else:
//   1. every `## ` section in the file appears in the index
//   2. every entry in the index still matches a real section
//
// It does NOT generate the index. That was tried first and rejected: the
// hooks have to be written by someone who read the section, and machine
// extraction produced entries like "four" and "40 pixels". A wrong hook is a
// lie that looks like an index. Writing them by hand is the point; this
// script only makes sure nobody forgets.
//
//   node scripts/decisions-index.mjs        # exits 1 if the index has drifted
//   node scripts/decisions-index.mjs --list # print the sections it can see
//
// Credential-free, no browser, no dev server. Run it after appending to
// DECISIONS.md — CLAUDE.md says so in the Process section.
import { readFileSync } from "node:fs";

const FILE = "DECISIONS.md";
const text = readFileSync(FILE, "utf8");
const lines = text.split("\n");

const start = lines.findIndex((l) => l.includes("INDEX:START"));
const end = lines.findIndex((l) => l.includes("INDEX:END"));
if (start === -1 || end === -1 || end < start) {
  console.error(`${FILE}: no INDEX:START / INDEX:END block. The index is the`
    + ` only thing making this file navigable — put it back before appending.`);
  process.exit(1);
}
const indexText = lines.slice(start, end + 1).join("\n");

// Every section heading OUTSIDE the index block. The index's own `## Read
// this before you go digging` heading must not count as a section.
const sections = lines
  .map((l, i) => ({ l, i }))
  .filter(({ l, i }) => l.startsWith("## ") && !(i > start && i < end))
  .map(({ l, i }) => ({ heading: l.slice(3).trim(), line: i + 1 }));

if (process.argv.includes("--list")) {
  for (const s of sections) console.log(`L${String(s.line).padStart(5)}  ${s.heading}`);
  console.log(`\n${sections.length} sections`);
  process.exit(0);
}

// A heading counts as indexed if its distinctive part appears in the block.
// Headings here carry a date and a subtitle after an em-dash, a colon or a
// comma — "Building 1.4: the judgment calls made while repointing the page" —
// and the index deliberately lists the short form. So compare on the opening
// clause, which is also what a person searching the file would actually type.
// This errs toward passing on purpose: its job is to catch a section nobody
// indexed, not to police wording.
const key = (h) => h.split(/[—:,(]/)[0].trim().replace(/\s+/g, " ");
const missing = sections.filter((s) => !indexText.includes(key(s.heading)));

// And the reverse: an index line naming a section that no longer exists.
const bulletNames = [...indexText.matchAll(/^- \*\*(.+?)\*\*/gm)].map((m) => m[1].trim());
const realKeys = sections.map((s) => key(s.heading));
const orphans = bulletNames.filter((n) => !realKeys.some((k) => k.startsWith(key(n)) || key(n).startsWith(k)));

let bad = 0;
if (missing.length) {
  bad += missing.length;
  console.error(`\n${missing.length} section(s) in ${FILE} are NOT in the index:`);
  for (const m of missing) console.error(`  L${m.line}  ${m.heading}`);
  console.error(`\nAdd a one-line hook for each under "Everything in here, oldest`
    + ` first", and list it in the "about to touch" table if it belongs there.`);
}
if (orphans.length) {
  bad += orphans.length;
  console.error(`\n${orphans.length} index entr(ies) name a section that no longer exists:`);
  for (const o of orphans) console.error(`  ${o}`);
}

console.log(bad
  ? `\n${FILE}: index has drifted — ${sections.length} sections, ${bad} problem(s)`
  : `${FILE}: index covers all ${sections.length} sections, no orphans`);
process.exit(bad ? 1 : 0);
