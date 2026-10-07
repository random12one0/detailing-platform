// ROADMAP 14.37 / 14.30 — A ROW IS UNDER THE FIXED BAR ONLY IF SCROLLING CANNOT CLEAR IT.
//
//   node --test tests/furniture-at-end.test.mjs
//
// Credential-free, no dev server, no demo tenant: it cuts the probe out of
// `scripts/bk-bar-clearance.mjs` (the text between its two FURNITURE-PROBE markers, so the thing
// under test is the production text and never a copy) and runs it in headless Chromium against
// fixture pages set with `setContent`. Playwright is the app's own, the same one every script uses.
//
// WHAT IT PROVES: a row covered at scroll zero but clear once the page is scrolled to its end is NOT
// reported; a row still covered at the end IS, on a document scroller and on an inner one; a short
// page that cannot scroll reports its covered row; the scroll position is put back; and each guard,
// removed from the production text, turns its own case wrong. WHAT IT DOES NOT: that the real
// settings screens are clear (the sweep does that) or that the sweep's own plant (`--break=covered-at-end`)
// fires, which needs the dev server and is run by hand.

import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { test, before, after } from "node:test";
import assert from "node:assert/strict";

const SCRIPT = readFileSync("scripts/bk-bar-clearance.mjs", "utf8");
const BEGIN = "/*FURNITURE-PROBE-BEGIN*/";
const END = "/*FURNITURE-PROBE-END*/";
const cut = (src) => {
  assert.equal(src.split(BEGIN).length, 2, "the begin marker must appear exactly once");
  assert.equal(src.split(END).length, 2, "the end marker must appear exactly once");
  const body = src.slice(src.indexOf(BEGIN) + BEGIN.length, src.indexOf(END));
  assert.match(body, /const furnitureProbe = async \(\) => \{/);
  return body;
};
const PROBE = cut(SCRIPT);

const { chromium } = createRequire(import.meta.url)("../app/node_modules/playwright/index.js");
let browser;
before(async () => { browser = await chromium.launch({ headless: true }); });
after(async () => { await browser?.close(); });

const rows = (n) => Array.from({ length: n }, (_, i) => `<p class="r">row ${i + 1}</p>`).join("");
const BAR = `<div style="position:fixed;left:0;right:0;bottom:0;height:60px;background:#ddd"></div>`;
const css = `body{margin:0}.r{margin:0;height:30px;line-height:30px;font:14px sans-serif}`;
// The last row of a long page sits under the bar unless something reserves room, which is the whole question.
const longPage = (pad) => `<style>${css}body{padding-bottom:${pad}px}</style>${rows(60)}${BAR}`;
const innerPage = (pad) => `<style>${css}html,body{height:100%;overflow:hidden}#s{height:100%;box-sizing:border-box;overflow-y:auto;padding-bottom:${pad}px}</style><div id="s">${rows(60)}</div>${BAR}`;
const shortPage = `<style>${css}</style>${rows(22)}${BAR}`;       // 22 x 30 = 660 of 700: fits, cannot scroll, last rows under the bar

async function run(html, probe = PROBE, before = 0) {
  const page = await browser.newPage({ viewport: { width: 390, height: 700 } });
  try {
    await page.setContent(html);
    if (before) await page.evaluate((y) => window.scrollTo(0, y), before);
    const result = await page.evaluate(`(async () => { ${probe}\n return await furnitureProbe(); })()`);
    const scrollY = await page.evaluate(() => window.scrollY);
    return { ...result, scrollY };
  } finally { await page.close(); }
}

test("1 · covered at the top and clear at the end is NOT reported, and the top count says what was set aside", async () => {
  const r = await run(longPage(80));
  assert.equal(r.covered, 0, JSON.stringify(r.sample));
  assert.ok(r.coveredAtTop >= 1, "the fixture has no row under the bar at the top, so it proves nothing");
  assert.equal(r.scrolled, true);
  assert.ok(r.rowsSeen > 0);
});

test("2 · still covered at the end IS reported, and it is the last row", async () => {
  const r = await run(longPage(0));
  assert.ok(r.covered >= 1);
  assert.match(r.sample.map((s) => s.t).join("|"), /row 60/);
});

test("3 · the same two cases on an inner scroller rather than the document", async () => {
  assert.equal((await run(innerPage(80))).covered, 0);
  const r = await run(innerPage(0));
  assert.ok(r.covered >= 1 && /row 60/.test(r.sample.map((s) => s.t).join("|")));
  assert.ok(r.scrollerCount >= 2, "the inner scroller was not found");
});

test("4 · a page that cannot scroll reports the row under its bar", async () => {
  const r = await run(shortPage);
  assert.ok(r.covered >= 1);
  assert.equal(r.scrolled, false);
});

test("5 · no fixed element means nothing is covered and nothing is claimed", async () => {
  const r = await run(`<style>${css}</style>${rows(60)}`);
  assert.deepEqual([r.fixedCount, r.covered], [0, 0]);
});

test("6 · the scroll position is put back", async () => {
  assert.equal((await run(longPage(80), PROBE, 137)).scrollY, 137);
});

// ── break it on purpose: the production text with one guard removed must get its own case wrong ──
const without = (from, to) => { assert.equal(PROBE.split(from).length, 2, "the sabotage did not apply: " + from); return PROBE.replace(from, () => to); };

test("7 · asking at scroll zero only (the old probe) reports the row 1 clears: case 1 goes wrong", async () => {
  const old = without("const end = hitTest();", "const end = top;");
  assert.ok((await run(longPage(80), old)).covered >= 1, "the sabotaged probe did not reproduce the old false report");
});

test("8 · never scrolling does the same, so scrolling is what removes it", async () => {
  const noScroll = without("for (let pass = 0; pass < 2; pass++) { for (const e of sc) e.scrollTop = e.scrollHeight; await frame(); }", "await frame();");
  assert.ok((await run(longPage(80), noScroll)).covered >= 1);
});

test("9 · scrolling only the document misses the inner scroller: case 3's clear page then reports a row", async () => {
  const docOnly = without("for (const e of sc) e.scrollTop = e.scrollHeight; await frame(); }", "sc[0].scrollTop = sc[0].scrollHeight; await frame(); }");
  assert.ok((await run(innerPage(80), docOnly)).covered >= 1);
});

test("10 · not restoring the position leaves the page where the probe left it", async () => {
  const noRestore = without("sc.forEach((e, i) => { e.scrollTop = was[i]; });", "");
  assert.notEqual((await run(longPage(80), noRestore, 137)).scrollY, 137);
});

test("11 · a probe that reports nothing as covered is caught by case 2", async () => {
  const blind = without("if (hit && fixed.some((f) => f === hit || f.contains(hit))) covered.push", "if (false) covered.push");
  assert.equal((await run(longPage(0), blind)).covered, 0, "the blind probe still reported a row");
});
