// STUDIO S2: the connection check must go red on the RIGHT line when the wire is
// cut, and green when it is whole. Each case runs scripts/studio/studio-check.mjs
// for real (offline engine + renderer + browser, ~20 s each); nothing leaves the laptop.
//   node --test tests/studio-check.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CHECK = path.join(ROOT, "scripts/studio/studio-check.mjs");
const dir = mkdtempSync(path.join(os.tmpdir(), "studio-check-test-"));
process.on("exit", () => rmSync(dir, { recursive: true, force: true }));

function run(brk, extra = []) {
  const out = path.join(dir, `${brk || "clean"}${extra.length ? "-x" : ""}.json`);
  return new Promise((resolve) => execFile(process.execPath, [CHECK, "--out", out, ...(brk ? [`--break=${brk}`] : []), ...extra],
    { cwd: ROOT, windowsHide: true, timeout: 180000 }, (err) => resolve({ code: err ? err.code ?? 1 : 0, r: JSON.parse(readFileSync(out, "utf8")) })));
}
const firstRed = (r) => r.lines.find((l) => !l.pass)?.id;

test("a whole wire: every tick green, exit 0", { timeout: 200000 }, async () => {
  const { code, r } = await run(null);
  assert.equal(firstRed(r), undefined, JSON.stringify(r.lines.filter((l) => !l.pass)));
  assert.equal(code, 0);
  for (const id of ["copy", "valid", "drawn", "stamps", "prices", "words", "extras", "contact", "hours", "photos", "reviews", "hide", "photo", "review", "stamps-after", "quote", "slots", "post", "console", "thrown"])
    assert.ok(r.lines.some((l) => l.id === id && l.pass), `tick ${id} is missing or red`);
});

// [the break, the first line that must go red, and why that line]
for (const [brk, line, why] of [
  ["missing-id", "valid", "the menu points at a service group the dashboard does not have"],
  ["wrong-stamp", "stamps", "the page claims one service's price is another's"],
  ["frozen-price", "prices", "the page keeps its first prices instead of reading the dashboard"],
  ["freeze-others", "prices", "every price but the first is a copy the page keeps"],
  ["same-price", "prices", "two services cost the same and the page shows one's price in the other's place"],
]) {
  test(`cut on purpose (${brk}): red first on "${line}", exit 1 — ${why}`, { timeout: 200000 }, async () => {
    const { code, r } = await run(brk);
    assert.equal(code, 1);
    assert.equal(firstRed(r), line, r.lines.map((l) => `${l.pass ? "ok " : "RED"} ${l.id}`).join("\n"));
    assert.ok(r.lines.find((l) => l.id === "copy").pass, "the copy itself was made");
    assert.ok(r.lines.find((l) => l.id === "thrown").pass, "the copy was still thrown away");
  });
}

test("no test copy (the revision names a business the snapshot lacks): one red line at once, the rest not tried", { timeout: 60000 }, async () => {
  const spec = JSON.parse(readFileSync(path.join(ROOT, "app/src/site/specs/brightline.json"), "utf8"));
  spec.slug = "example_nobody";
  const file = path.join(dir, "nobody.json"); writeFileSync(file, JSON.stringify(spec));
  const t = Date.now();
  const { code, r } = await run(null, ["--spec", file]);
  assert.equal(code, 1);
  assert.equal(firstRed(r), "copy");
  assert.deepEqual(r.lines.filter((l) => !l.pass && !l.skipped).map((l) => l.id), ["copy"], "only the copy is red");
  assert.ok(r.lines.filter((l) => l.skipped).length >= 18, "every later line is marked not tried");
  assert.ok(!r.lines.some((l) => l.id === "drawn" && l.pass), "no green 'drew all sections'");
  assert.ok(Date.now() - t < 20000, `stops at once (took ${Date.now() - t} ms)`);
});
