// STUDIO S2: the connection check must go red on the RIGHT line when the wire is
// cut, and green when it is whole. Each case runs scripts/studio/studio-check.mjs
// for real (offline engine + renderer + browser, ~20 s each); nothing leaves the laptop.
//   node --test tests/studio-check.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CHECK = path.join(ROOT, "scripts/studio/studio-check.mjs");
const dir = mkdtempSync(path.join(os.tmpdir(), "studio-check-test-"));
process.on("exit", () => rmSync(dir, { recursive: true, force: true }));

function run(brk) {
  const out = path.join(dir, `${brk || "clean"}.json`);
  return new Promise((resolve) => execFile(process.execPath, [CHECK, "--out", out, ...(brk ? [`--break=${brk}`] : [])],
    { cwd: ROOT, windowsHide: true, timeout: 180000 }, (err) => resolve({ code: err ? err.code ?? 1 : 0, r: JSON.parse(readFileSync(out, "utf8")) })));
}
const firstRed = (r) => r.lines.find((l) => !l.pass)?.id;

test("a whole wire: every tick green, exit 0", { timeout: 200000 }, async () => {
  const { code, r } = await run(null);
  assert.equal(firstRed(r), undefined, JSON.stringify(r.lines.filter((l) => !l.pass)));
  assert.equal(code, 0);
  for (const id of ["copy", "valid", "drawn", "stamps", "price", "hide", "hours", "photo", "review", "stamps-after", "quote", "slots", "post", "console", "thrown"])
    assert.ok(r.lines.some((l) => l.id === id && l.pass), `tick ${id} is missing or red`);
});

// [the break, the first line that must go red, and why that line]
for (const [brk, line, why] of [
  ["missing-id", "valid", "the menu points at a service group the dashboard does not have"],
  ["wrong-stamp", "stamps", "the page claims one service's price is another's"],
  ["frozen-price", "price", "the page keeps its first prices instead of reading the dashboard"],
]) {
  test(`cut on purpose (${brk}): red first on "${line}", exit 1 — ${why}`, { timeout: 200000 }, async () => {
    const { code, r } = await run(brk);
    assert.equal(code, 1);
    assert.equal(firstRed(r), line, r.lines.map((l) => `${l.pass ? "ok " : "RED"} ${l.id}`).join("\n"));
    assert.ok(r.lines.find((l) => l.id === "copy").pass, "the copy itself was made");
    assert.ok(r.lines.find((l) => l.id === "thrown").pass, "the copy was still thrown away");
  });
}
