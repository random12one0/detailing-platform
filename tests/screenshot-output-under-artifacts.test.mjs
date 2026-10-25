// ROADMAP 97.63 — new screenshot and preview runs write under ONE ignored
// folder, `artifacts/`, instead of growing a new folder in the repo root.
//
//   node --test tests/screenshot-output-under-artifacts.test.mjs
//
// Credential-free, no browser: it reads `scripts/*.mjs` as text and calls the
// helper. Sabotage is an env var (node --test swallows flags, docs/gotchas.md
// 104): `BREAK=bare` feeds the scan one script whose default output is a bare
// root folder (one per default form), and the scan must name each of them.
//
// `.manager-shots/` is NOT folded in: it is the reviewer hand-off folder that
// docs/how-we-run.md and docs/shared-resources.md name, and other items cite it.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { outDir } from "../scripts/lib/outDir.mjs";

const dir = new URL("../scripts/", import.meta.url);
const files = readdirSync(dir).filter((f) => f.endsWith(".mjs"));
const sources = Object.fromEntries(files.map((f) => [f, readFileSync(new URL(f, dir), "utf8")]));
if (process.env.BREAK === "bare") {
  sources["__sabotage.mjs"] = 'const OUT = process.env.OUT || "shots-sabotage";';
  sources["__sabotage-shots.mjs"] = 'const SHOTS = opt("shots", ".tmp-sabotage/png");';
  sources["__sabotage-receipts.mjs"] = "const OUT = join(ROOT, `receipts/screenshots/x`);";
  sources["__sabotage-typed.mjs"] = 'const SHOTS = arg("shots", "");';
}

// A default output folder, written the ways these scripts write one: `OUT=` /
// `--out=`, and (second pass) `--shots=` as `arg("shots") || "x"` or `opt("shots", "x")`.
const DEFAULT_OUT = /(?:process\.env\.OUT \|\||(?:arg|argOf|opt)\("(?:out|shots)"(?:\)\s*\|\||,))\s*"([^"]+)"/g;
// An absolute path (the belt's own shots folder) is outside the repo, so it is fine.
const relative = (p) => !/^([A-Za-z]:)?[\\/]/.test(p) && !/^artifacts[\\/]/.test(p);

test("outDir puts a relative name under artifacts/ and leaves the rest alone", () => {
  assert.equal(outDir("shots"), "artifacts/shots");
  assert.equal(outDir("shots-2.4"), "artifacts/shots-2.4");
  assert.equal(outDir("artifacts/x"), "artifacts/x");
  assert.equal(outDir("C:/elsewhere/x"), "C:/elsewhere/x");
  // Review fix: the reviewer hand-off folder and "no pictures" stay as typed.
  assert.equal(outDir(".manager-shots/3.4/html-en"), ".manager-shots/3.4/html-en");
  assert.equal(outDir("./.manager-shots/x"), "./.manager-shots/x");
  assert.equal(outDir(""), "");
  assert.equal(outDir(undefined), undefined);
});

// Review fix: a TYPED `--shots=shots-2.7` made a root folder just as a default did,
// and the default-only scan above could not see it. Every line that reads a typed
// --shots / --out must go through outDir. sweep-booking-steps.mjs was the declared
// exception until the 2026-10-25 ruling made it builder work; the list is now empty,
// still an EQUALITY (docs/gotchas.md 98), so a new bare read reddens.
const TYPED = /(?:(?:arg|argOf|opt)\("(?:shots|out)"|startsWith\("--(?:shots|out)=")/;
test("every typed --shots / --out goes through outDir", () => {
  const reads = [];
  const bare = [];
  for (const [f, s] of Object.entries(sources)) {
    for (const line of s.split(/\r?\n/)) {
      if (/^\s*(\/\/|\*)/.test(line) || !TYPED.test(line)) continue;
      reads.push(f);
      if (!line.includes("outDir(")) bare.push(f);
    }
  }
  // Discovery floor: 16 such reads on 2026-10-24 (counted by this test). Fewer means the pattern broke.
  assert.ok(reads.length >= 16, `found only ${reads.length} typed reads: ${reads.join(", ")}`);
  assert.deepEqual([...new Set(bare)].sort(), []);
});

test("every script's default output goes through outDir", () => {
  const found = [];
  const bare = [];
  for (const [f, s] of Object.entries(sources)) {
    for (const m of s.matchAll(DEFAULT_OUT)) {
      found.push(`${f}: ${m[1]}`);
      const line = s.slice(s.lastIndexOf("\n", m.index) + 1, s.indexOf("\n", m.index) >>> 0);
      if (relative(m[1]) && !line.includes("outDir(")) bare.push(`${f}: default "${m[1]}" lands in the repo root`);
    }
  }
  // Discovery floor: seven scripts carried a root default on 2026-10-15. Fewer
  // means the pattern stopped matching, not that the problem went away.
  assert.ok(found.length >= 7, `found only ${found.length} default outputs:\n${found.join("\n")}`);
  assert.deepEqual(bare, []);
});

test("email-dates writes its previews under artifacts/", () => {
  assert.match(sources["email-dates.mjs"], /path\.join\(REPO, "artifacts", "email-preview"/);
});

// receipts/screenshots/ was another ignored destination. Its last writer, the tap-target
// sweep, moved to artifacts/ on 2026-10-25. Declared with an EQUALITY (docs/gotchas.md
// 98), so a new writer reddens instead of slipping in.
test("no script writes screenshots under receipts/", () => {
  const code = (s) => s.replace(/^\s*\/\/.*$/gm, "");
  const writers = Object.entries(sources).filter(([, s]) => code(s).includes("receipts/screenshots/")).map(([f]) => f).sort();
  assert.deepEqual(writers, []);
});
