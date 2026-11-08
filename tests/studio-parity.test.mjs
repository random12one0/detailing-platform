// STUDIO S8: the nightly parity check (scripts/studio/studio-parity.mjs) on a published site, for real: the offline
// engine as the live dashboard, the renderer on a Vite dev server reached at brightline.example.test (a test host
// mapping), the browser. Green when the site matches; red on the price line when the page keeps an old price; nothing
// served (red "served") when the business is not a paying customer. Nothing leaves the laptop.
// The stamp checker comes from belt-staging/site-stamps.mjs (STUDIO_BELT, as for the connection check).
//   node --test tests/studio-parity.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PARITY = path.join(ROOT, "scripts/studio/studio-parity.mjs");
const HOST = "brightline.example.test";
const dir = mkdtempSync(path.join(os.tmpdir(), "studio-parity-test-"));
process.on("exit", () => rmSync(dir, { recursive: true, force: true }));
const spec = JSON.parse(readFileSync(path.join(ROOT, "app/src/site/specs/brightline.json"), "utf8"));
const published = path.join(dir, "published.json");
writeFileSync(published, JSON.stringify({ [HOST]: { slug: spec.slug, site: "brightline", release: 3, revision: 5, spec } }));

function run(name, { brk = null, paying = "1" } = {}) {
  const out = path.join(dir, `${name}.json`);
  return new Promise((resolve) => execFile(process.execPath, [PARITY, "--host", HOST, "--out", out, ...(brk ? [`--break=${brk}`] : [])],
    { cwd: ROOT, windowsHide: true, timeout: 180000, env: { ...process.env, STUDIO_PUBLISHED: published, STUDIO_EXAMPLE_PAYING: paying } },
    (err) => resolve({ code: err ? err.code ?? 1 : 0, r: JSON.parse(readFileSync(out, "utf8")) })));
}

test("a live site that matches its dashboard: every line green, exit 0", { timeout: 200000 }, async () => {
  const { code, r } = await run("clean");
  assert.deepEqual(r.lines.filter((l) => !l.pass), []);
  assert.equal(code, 0);
  assert.match(r.lines.find((l) => l.id === "served").detail, /^release 3 \(revision 5\)/);
  assert.deepEqual(r.mismatches, []);
});

test("an injected price mismatch: the stamps and the quote go red, naming the price", { timeout: 200000 }, async () => {
  const { code, r } = await run("stale", { brk: "stale-price" });
  assert.equal(code, 1);
  assert.equal(r.lines.find((l) => l.id === "stamps").pass, false);
  assert.equal(r.lines.find((l) => l.id === "quote").pass, false);
  assert.ok(r.mismatches.some((m) => /^service:.+\.price$/.test(m.from)), JSON.stringify(r.mismatches));
});

test("a business that does not pay for a website: the address serves no site", { timeout: 200000 }, async () => {
  const { code, r } = await run("unpaid", { paying: "0" });
  assert.equal(code, 1);
  assert.match(r.lines.find((l) => l.id === "served").detail, /the booking page, not the site/);
});
