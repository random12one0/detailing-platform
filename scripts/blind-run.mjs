// CAN THIS SUITE ACTUALLY SEE? — the instrument, 2026-09-13.
//
// `docs/VERIFIED.md` § 1g records the one-line version: *replace a suite's
// `read()` with `() => ""` and count what stays green.* This is that, applied
// to every suite at once and without editing any of them.
//
// HOW. `git archive HEAD` into two temp trees. In one, every product source
// file — `app/src`, `app/public`, `supabase`, `docs/design-directions`,
// `scripts` — is truncated to ZERO BYTES. Then every file in `tests/` is run in
// both, with no `.env` in either, so nothing touches the live project and no
// real mail can be spent. A check that is green in the blanked tree is green
// over nothing.
//
// WHY THE TREE AND NOT A MOCK. Suites here read by `new URL("../app/src/…",
// import.meta.url)`, by `readFileSync`, by `import()`, and by walking
// directories. There is no single seam to stub. Blanking the bytes catches all
// four, and it catches a subject counter that counts FILES — which is how
// `geoapify`'s own "the check has subjects" passed over 67 empty files.
//
// WHAT A GREEN LINE HERE MEANS, precisely, because over-reading it wastes a
// session: it means the check cannot prove it looked at anything. Most are
// NEGATIVES ("no stylesheet carries X"), and a negative over an empty file is
// `true`. The assertion is usually still correct; what is missing is an anchor.
// The fix is a subject count in BYTES, not a rewrite of the check.
//
// AND IT HAS ITS OWN BLIND SPOT, MEASURED: a suite whose subject is `tests/`
// itself cannot be blanked, because blanking it deletes the suite. `mail-sink`
// and `session-ping` both read `tests/` and `scripts/`; the first pass left
// `scripts/` intact and reported 38 hollow checks in `session-ping` that were
// an artefact of where the blanking stopped. Read the survivor NAMES before
// believing a number.
//
// Usage:  node scripts/blind-run.mjs [--keep] [suite ...]

import { execFileSync, execFile } from "node:child_process";
import { mkdtempSync, rmSync, existsSync, readdirSync, writeFileSync, statSync } from "node:fs";
import { readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const run = promisify(execFile);
const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const argv = process.argv.slice(2);
const KEEP = argv.includes("--keep");
const only = argv.filter((a) => !a.startsWith("--"));

// **`docs/tenant-sites` WAS MISSING AND IT COST A WHOLE SUITE - 2026-09-13.**
// `tenant-sites.test.mjs` is 129 checks over five hand-built pages and its
// subject lives nowhere else in this list, so the first pass reported it as
// *0 green, exits 0* - which reads as "nothing to see" and actually meant
// "this suite was never blinded at all". Same shape as the `session-ping`
// and `mail-sink` false positives recorded above: an artefact of where the
// blanking STOPPED, not a property of the suite.
const BLANK_ROOTS = ["app/src", "app/public", "supabase", "docs/design-directions", "scripts", "docs/tenant-sites"];
// `scripts/lib` holds pure modules that suites IMPORT rather than read as
// subjects. Blanking them turns a real finding into an import crash.
const KEEP_DIRS = new Set([path.normalize("scripts/lib")]);

const work = mkdtempSync(path.join(tmpdir(), "blind-"));
const base = path.join(work, "base");
const blind = path.join(work, "blind");

function archive(to) {
  execFileSync("git", ["worktree", "add", "--detach", to, "HEAD"], { cwd: ROOT, stdio: "ignore" });
}

function blank(dir) {
  let n = 0;
  const walk = (d) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const f = path.join(d, e.name);
      if (e.isDirectory()) {
        if (e.name === "node_modules") continue;
        if (KEEP_DIRS.has(path.normalize(path.relative(dir, f)))) continue;
        walk(f);
      } else if (/\.(js|jsx|ts|tsx|css|html|sql|json|mjs)$/.test(e.name)) {
        writeFileSync(f, ""); n++;
      }
    }
  };
  for (const r of BLANK_ROOTS) { const d = path.join(dir, r); if (existsSync(d)) walk(d); }
  return n;
}

// Both trees run with every Supabase variable emptied AND from a directory with
// no `.env`, so a suite that reads credentials skips rather than reaching the
// live project. Nothing here can send mail or write a row.
const ENV = {
  ...process.env,
  SUPABASE_URL: "", SUPABASE_ANON_KEY: "", SUPABASE_SERVICE_ROLE_KEY: "",
  SUPABASE_ACCESS_TOKEN: "", SUPABASE_PROJECT_REF: "",
};

async function runAll(dir, names) {
  const out = {};
  for (const f of names) {
    let stdout = "", stderr = "", code = 0;
    try {
      const r = await run(process.execPath, [`tests/${f}`], { cwd: dir, timeout: 180000, maxBuffer: 32e6, env: ENV });
      stdout = r.stdout; stderr = r.stderr;
    } catch (e) { code = e.code ?? 1; stdout = e.stdout ?? ""; stderr = e.stderr ?? String(e); }
    const text = stdout + stderr;
    out[f] = {
      code,
      greens: text.split("\n").filter((l) => /^\s*ok[\s ]/.test(l)).map((l) => l.trim()),
    };
  }
  return out;
}

try {
  archive(base); archive(blind);
  const blanked = blank(blind);
  const names = (await readdir(path.join(base, "tests"))).filter((f) => f.endsWith(".test.mjs"))
    .filter((f) => !only.length || only.some((o) => f.includes(o)));
  console.log(`${names.length} suite(s) · ${blanked} source file(s) blanked · no .env in either tree\n`);

  const B = await runAll(base, names);
  const D = await runAll(blind, names);

  let hollow = 0, suites = 0;
  for (const f of names) {
    const g = D[f].greens.length;
    const b = B[f].greens.length;
    const wholeSuite = D[f].code === 0;
    if (!g && !wholeSuite) continue;
    suites++; hollow += g;
    console.log(`${f.replace(".test.mjs", "").padEnd(28)} ${String(b).padStart(4)} green → ${String(g).padStart(4)} still green over NOTHING`
      + (wholeSuite ? "   ** AND THE SUITE STILL EXITS 0 **" : ""));
    for (const line of D[f].greens.slice(0, 6)) console.log(`      ${line}`);
    if (g > 6) console.log(`      … and ${g - 6} more`);
  }
  console.log(`\n${hollow} check(s) across ${suites} suite(s) stayed green with their subject blanked.`);
  console.log("A green line here means the check cannot prove it looked at anything.");
  console.log("Read the NAMES: a suite whose subject is tests/ itself cannot be blanked.");
  process.exitCode = 0;
} finally {
  if (!KEEP) {
    for (const d of [base, blind]) {
      try { execFileSync("git", ["worktree", "remove", "--force", d], { cwd: ROOT, stdio: "ignore" }); } catch { /* best effort */ }
    }
    try { rmSync(work, { recursive: true, force: true }); } catch { /* best effort */ }
  } else {
    console.log(`\ntrees kept at ${work}`);
  }
}
