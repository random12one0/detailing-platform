// AM I STILL IN MY OWN LANE?
//
// ---------------------------------------------------------------------------
// WHY THIS EXISTS — 2026-09-10, and it is an incident rather than an idea
// ---------------------------------------------------------------------------
// `docs/sessions/README.md` has said since 2026-09-08 that each session owns a
// set of folders and never writes outside them. On 2026-09-10 a session opened
// as **A (websites)** was handed a roadmap prompt for **roadmap 2.20 stage 3**
// and wrote 9 files across `app/src`, `supabase/` and `tests/` — B's lane and
// C's lane, both at once — while another session was genuinely running and
// committing into the same tree.
//
// **The work was correct and it was still wrong.** Two sessions writing the
// same folders is the failure that table exists to prevent, and the damage it
// causes is silent: a write under `app/src` while the other session's browser
// sweep is running makes Vite reload the page underneath it, and the run then
// prints `clean` having measured a screen that navigated away.
// `scripts/source-guard.mjs` is the other half of this pair — that one asks
// *did somebody edit the app while my browser was open*, this one asks *am I
// the session that was allowed to*.
//
// **The rule was in the repo and being read did not stop it.** The session
// opened `docs/sessions/README.md` mid-run, saw the table, and reasoned itself
// past it — *"my work spans lane B and lane C, and that's fine because I was
// given the whole item."* It was not fine. A paragraph cannot argue back; a
// command can.
//
// ---------------------------------------------------------------------------
// WHAT IT IS AND IS NOT
// ---------------------------------------------------------------------------
// IT IS A DIAGNOSIS, NOT A GATE ON THE WORK. It reads git and nothing else,
// changes no file, and is meant to be run BEFORE `git add` — which is the
// moment the answer can still change anything. Exit 1 when something is
// outside the lane, so a hook or a script can use it, but the useful output is
// the list of filenames.
//
// IT CANNOT KNOW WHICH LANE THIS SESSION IS. Nothing can: lane membership is a
// fact about who opened the terminal. **That is exactly why the lane has to
// travel in the prompt**, and it is the root cause of the incident above — the
// roadmap hand-over template in CLAUDE.md had no lane field, so the prompt
// that started that session named an item and not a lane.
//
// Usage:
//   node scripts/lane-check.mjs A            # working tree vs my lane
//   node scripts/lane-check.mjs websites     # same, by name
//   node scripts/lane-check.mjs A --since HEAD~4
//   node scripts/lane-check.mjs              # print the table and stop

import { execFileSync } from "node:child_process";

// THE TABLE, AND IT IS THE ONE IN `docs/sessions/README.md`. Two copies of an
// ownership rule is how the two start to disagree, so if this is edited that
// file is edited in the same change — and the other way round.
//
// `owns` is a list of path PREFIXES. `except` carves another lane's territory
// back out of a prefix that would otherwise swallow it.
const LANES = {
  A: {
    name: "websites",
    brief: "docs/sessions/websites.md",
    owns: [
      "docs/tenant-sites/",
      "docs/schemes/",
      "docs/TASTE-NOTES.md",
      "docs/DEVICE-INVENTORY.md",
      "docs/DESIGN-SCHEME-TEMPLATE.md",
      "docs/design-directions/",
      "docs/design-knowledge.md",
      "docs/design-system.md",
      // FOUND BY THE TOOL ON ITS SECOND REAL RUN, 2026-09-10: it called the
      // websites PLAYBOOK lane C's, because it sits under C's `docs/` prefix.
      // It is the rulebook `websites.md` sends every A session to read, and
      // every rule in it was written by one. **Named explicitly rather than by
      // a `docs/tenant-site-` prefix**, because `tenant-site-contract.md` and
      // `tenant-site-kit.md` next to it are engineering documents and are not
      // A's to edit.
      "docs/tenant-site-playbook.md",
      "scripts/build-examples.mjs",
      "app/public/img/",
    ],
    except: [],
  },
  B: {
    name: "product",
    brief: "docs/sessions/product.md",
    owns: ["app/src/"],
    except: [],
  },
  C: {
    name: "build",
    brief: "docs/sessions/build.md",
    owns: ["supabase/", "tests/", "scripts/", "docs/"],
    // A's folders sit inside C's `docs/` and `scripts/` prefixes, so they are
    // carved back out rather than C's prefixes being spelled out file by file.
    except: [
      "docs/tenant-sites/",
      "docs/schemes/",
      "docs/TASTE-NOTES.md",
      "docs/DEVICE-INVENTORY.md",
      "docs/DESIGN-SCHEME-TEMPLATE.md",
      "docs/design-directions/",
      "docs/design-knowledge.md",
      "docs/design-system.md",
      "scripts/build-examples.mjs",
      "docs/roadmap.md",
      "docs/README.md",
      "docs/OUTSTANDING.md",
      "docs/overnight-log.md",
      "docs/sessions/",
      "scripts/lane-check.mjs",
      "docs/tenant-site-playbook.md",
    ],
  },
  M: {
    name: "manager",
    brief: "docs/sessions/manager.md",
    owns: [
      "CLAUDE.md",
      "docs/README.md",
      "docs/roadmap.md",
      "docs/OUTSTANDING.md",
      "docs/overnight-log.md",
      "docs/sessions/",
      "PROJECT-STATE.md",
      "DECISIONS.md",
      // THE HARNESS AND THIS SCRIPT ARE THE MANAGER'S, and the tool found that
      // out about itself: its first real run reported `.claude/settings.json`
      // as "lane nobody". Both govern how the OTHER sessions behave, which is
      // exactly what M is for — `scripts/lane-check.mjs` sitting in C's
      // `scripts/` prefix would let a build session quietly redraw the lanes.
      ".claude/",
      "scripts/lane-check.mjs",
    ],
    except: [],
  },
};

// Every alias somebody might type. The letter, the name, and the filename.
const resolve = (raw) => {
  const k = String(raw || "").trim().toUpperCase();
  if (LANES[k]) return k;
  const byName = Object.keys(LANES).find(
    (x) => LANES[x].name === String(raw).trim().toLowerCase()
      || LANES[x].brief.endsWith(`${String(raw).trim().toLowerCase()}.md`),
  );
  return byName ?? null;
};

const git = (...args) => {
  try {
    return execFileSync("git", args, { encoding: "utf8" });
  } catch {
    return "";
  }
};

const argv = process.argv.slice(2);
const sinceAt = argv.indexOf("--since");
const since = sinceAt >= 0 ? argv[sinceAt + 1] : null;
const lane = resolve(argv.find((a) => !a.startsWith("--") && a !== since));

// THE SESSION-START BANNER. Short, exit 0, and it exists because three
// documents saying the same thing was not enough on 2026-09-10 — a rule read
// once at session start is at least read, and `.claude/settings.json` is the
// only thing in this repo that fires without anybody remembering to.
//
// It ASKS rather than tells, because the answer is not in this repo: lane
// membership is a fact about who opened the terminal.
if (argv.includes("--banner")) {
  console.log("WHICH LANE IS THIS SESSION?  A=websites   B=product (app/src)   C=build (supabase, tests, scripts)   M=manager");
  console.log("The lane comes from the PROMPT, never from the task. No lane in the prompt -> ASK before writing anything.");
  console.log("Prompt names work outside your lane -> say which lane owns it and STOP.");
  console.log("CLAUDE.md \u00a7 WHICH LANE  ·  docs/sessions/README.md  ·  before every `git add`: node scripts/lane-check.mjs <lane>");
  process.exit(0);
}

if (!lane) {
  console.log("Which lane is this session? Pass one of:\n");
  for (const [k, v] of Object.entries(LANES)) {
    console.log(`  ${k}  ${v.name.padEnd(9)} ${v.brief}`);
    console.log(`     writes: ${v.owns.join("  ")}`);
    if (v.except.length) console.log(`     not:    ${v.except.join("  ")}`);
    console.log("");
  }
  console.log("If you do not know, ASK before writing anything — nothing in");
  console.log("this repo can work it out for you, and guessing is the whole");
  console.log("of the 2026-09-10 incident this script was written for.");
  process.exit(2);
}

const me = LANES[lane];

// WHAT COUNTS AS "CHANGED BY ME". The working tree by default, because that is
// the state a session can still do something about — this is meant to be run
// before `git add`. `--since <ref>` adds a committed range for a session
// checking itself after the fact.
//
// NOT `git diff origin/main`, deliberately: the other sessions are committing
// into this same tree, so that range is full of their work and every run would
// report a pile of files this session never touched. That is the "skipped
// check reads like a passing one" failure with the sign flipped — a report so
// noisy nobody reads it.
const files = new Set();
// UNTRACKED FILES ARE REPORTED SEPARATELY, and that is not tidiness. A stray
// screenshot somebody dropped into a folder is a true finding the FIRST time
// and pure noise on every run after it — and a report that always has twelve
// lines in it is a report nobody reads, which is the same defect as a check
// that silently skips. An EDIT to another lane's file is the thing to stop.
const untracked = new Set();
for (const line of git("status", "--porcelain").split("\n")) {
  const code = line.slice(0, 2);
  const p = line.slice(3).trim();
  if (!p) continue;
  // A rename prints "old -> new"; the new path is the one that was written.
  const clean = p.includes(" -> ") ? p.split(" -> ")[1].trim() : p.replace(/^"|"$/g, "");
  (code === "??" ? untracked : files).add(clean);
}
if (since) {
  for (const p of git("diff", "--name-only", `${since}..HEAD`).split("\n")) {
    if (p.trim()) files.add(p.trim());
  }
}

const mine = (p) =>
  me.owns.some((o) => (o.endsWith("/") ? p.startsWith(o) : p === o))
  && !me.except.some((o) => (o.endsWith("/") ? p.startsWith(o) : p === o));

// WHOSE IS IT, THEN. Naming the other lane is what turns this from a refusal
// into a hand-off: the answer a session needs is not "stop" but "tell M", and
// `docs/sessions/README.md` makes that a one-line message.
const ownerOf = (p) => {
  const hits = Object.entries(LANES).filter(([k, v]) =>
    k !== lane
    && v.owns.some((o) => (o.endsWith("/") ? p.startsWith(o) : p === o))
    && !v.except.some((o) => (o.endsWith("/") ? p.startsWith(o) : p === o)));
  return hits.length ? hits.map(([k]) => k).join("/") : "nobody";
};

const outside = [...files].filter((p) => !mine(p)).sort();
const inside = [...files].filter(mine).length;
const strayOutside = [...untracked].filter((p) => !mine(p)).sort();

/** Named, counted, and never mixed into the breach list. */
function strays() {
  if (!strayOutside.length) return;
  console.log(`${strayOutside.length} untracked file(s) also sit outside your lane — new files,`);
  console.log("not edits, so they are listed rather than counted:");
  for (const p of strayOutside.slice(0, 6)) console.log(`  new      ${p}   (lane ${ownerOf(p)})`);
  if (strayOutside.length > 6) console.log(`  … and ${strayOutside.length - 6} more`);
  console.log("");
}

console.log(`lane ${lane} · ${me.name} · ${me.brief}`);
console.log(`${files.size} file(s) changed, ${inside} in your lane, ${outside.length} outside\n`);

if (outside.length === 0) {
  // A GUARD THAT SKIPS MUST SAY SO — this repo's most repeated failure. With
  // nothing changed at all there is nothing to be in or out of a lane, and
  // that must not read as a pass.
  if (files.size === 0) {
    console.log("NOTHING MEASURED — nothing is modified, so this run proves");
    console.log("nothing. Pass --since <ref> to check a committed range.");
    strays();
    process.exit(0);
  }
  console.log("in your lane.");
  strays();
  process.exit(0);
}

for (const p of outside) console.log(`  OUTSIDE  ${p}   (lane ${ownerOf(p)})`);
console.log("");
strays();
console.log("Do not commit these. Revert them, or say in chat which lane they");
console.log("belong to and let that session pick them up — docs/sessions/README.md.");
console.log("If the OWNER told you to do this work, say so in the commit message,");
console.log("because the next session reading it will otherwise read a breach.");
process.exit(1);
