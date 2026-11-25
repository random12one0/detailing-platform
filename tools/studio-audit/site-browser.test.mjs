// The layout gate (G1) after the S6 review: its three narrow rules let an intended design through, and a real defect
// right beside each one still fails. Pages are built by hand and measured with the gate's own functions in a browser.
//   node --test site-browser.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const PLAT = (process.env.SITE_ACCEPTANCE_PLATFORM || "C:/studio-work/s1").replace(/\\/g, "/");
const ready = existsSync(path.join(PLAT, "app/node_modules/playwright"));
process.env.SITE_ACCEPTANCE_PLATFORM ||= PLAT;
const { geometry, covered } = ready ? await import("./site-browser.mjs") : {};

test("G1: no subtree is exempt; picture-under-words, an ::after target and two named pairs are the only allowances", { skip: !ready && "needs the platform copy's Playwright", timeout: 120000 }, async (t) => {
  const { chromium } = createRequire(path.join(PLAT, "app/package.json"))("playwright");
  const browser = await chromium.launch();
  t.after(() => browser.close());
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const measure = async (body) => { await page.setContent(`<!doctype html><style>*{box-sizing:border-box}body{margin:0;font:16px sans-serif}button{border:0;padding:0}</style><body>${body}</body>`); return (await page.evaluate(geometry)).failures.map((f) => f.detail); };
  const big = "width:100px;height:50px";

  // the review's two probes: a tiny button and clipped words inside the booking form; two buttons on top of each other in a stack
  const flow = await measure(`<div data-part="flow" data-from="book"><button style="width:20px;height:20px">x</button><p style="height:20px;overflow:hidden;width:200px">words that do not fit in twenty pixels of height at all</p></div>`);
  assert.ok(flow.includes("Phone target below 44px"), flow.join());
  assert.ok(flow.includes("Clipped vertical content"), flow.join());
  const stacked = await measure(`<div data-stack style="position:relative;height:60px"><button style="position:absolute;top:0;${big}">a</button><button style="position:absolute;top:0;${big}">b</button></div>`);
  assert.ok(stacked.some((d) => /^Overlaps/.test(d)) && stacked.includes("Controls separated by less than 8px"), stacked.join());
  // words over words in a stack still fail; a heading over a photo in a stack passes; the same heading over a photo with no stack fails
  const words = await measure(`<div data-stack style="position:relative;height:80px"><p style="position:absolute;top:0;margin:0">one</p><p style="position:absolute;top:0;margin:0">two</p></div>`);
  assert.ok(words.some((d) => /^Overlaps/.test(d)), words.join());
  const photo = `<img alt="" width="300" height="200" style="display:block;width:300px;height:200px;background:#345">`;
  assert.deepEqual(await measure(`<div data-stack style="position:relative">${photo}<h1 style="position:absolute;bottom:0;margin:0;font-size:30px">Headline</h1></div>`), []);
  assert.ok((await measure(`<div style="position:relative">${photo}<h1 style="position:absolute;bottom:0;margin:0;font-size:30px">Headline</h1></div>`)).some((d) => /^Overlaps/.test(d)));
  // a 28 px control whose absolutely positioned ::after reaches 44 px is a 44 px target; the same control without it is not
  const peek = (after) => `<style>.p{position:relative;display:block;width:300px;height:27px}${after ? ".p::after{content:'';position:absolute;inset:-9px 0 -8px 0}" : ""}</style><div style="padding:20px"><button class="p">What's included</button></div>`;
  assert.deepEqual(await measure(peek(true)), []);
  assert.ok((await measure(peek(false))).includes("Phone target below 44px"));
  // the booking flow's two language chips may sit 6 px apart; any other two buttons may not
  const chips = (cls) => `<div class="${cls}" style="display:flex;gap:6px"><button class="bk-chip" style="width:44px;height:44px">EN</button><button class="bk-chip" style="width:44px;height:44px">ES</button></div>`;
  assert.deepEqual(await measure(chips("bk-lang")), []);
  assert.ok((await measure(chips("other"))).includes("Controls separated by less than 8px"));
});

test("covered(): a part pinned over content at rest fails; a bar that content passes under does not", { skip: !ready && "needs the platform copy's Playwright", timeout: 120000 }, async (t) => {
  const { chromium } = createRequire(path.join(PLAT, "app/package.json"))("playwright");
  const browser = await chromium.launch();
  t.after(() => browser.close());
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const text = Array.from({ length: 40 }, (_, i) => `<p style="margin:0 0 40px">Paragraph ${i}</p>`).join("");
  const run = async (body) => { await page.setContent(`<!doctype html><body style="margin:0;font:16px sans-serif">${body}</body>`); return page.evaluate(covered); };
  // a sticky panel two thirds of the screen tall: content in the middle of the screen is under it
  assert.ok((await run(`<section><div style="position:sticky;top:0;height:66vh;background:#eee">panel</div>${text}</section>`)).length > 0);
  // a 70 px bar stuck to the bottom of the screen: content passes under it but is never covered at rest
  assert.deepEqual(await run(`<section>${text}<div style="position:sticky;bottom:0;height:70px;background:#eee"><button>Continue</button></div></section>`), []);
});
