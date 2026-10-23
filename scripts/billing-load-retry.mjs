// ROADMAP 101.4 (audit R2-07) — "Your subscription" when its first read fails.
//
//   node scripts/billing-load-retry.mjs <base url> [shots dir]
//
// Blocks the browser's call to `platform-billing` (the network-blocked
// reproduction), opens /app?settings=billing at 390 and 1440, and asks:
//   1. does the screen say the fixed sentence "We could not load your subscription."
//   2. is there a Try again button, and does pressing it ask the server again
//      (a second request to platform-billing) and come back to the same box.
// Exits 1 on any failure. Needs a dev server; works against the belt's
// demo-backend (DEMO_OWNER_PW=demo-backend) or the seeded dev database.
// Only the browser's own request is blocked; nothing is written anywhere.
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { demoOwner } from "./lib/demoOwner.mjs";

const require = createRequire(new URL("../app/package.json", import.meta.url));
const { chromium } = require("playwright");
const [BASE = "http://localhost:5173", OUT] = process.argv.slice(2);
if (OUT) mkdirSync(OUT, { recursive: true });

const SENTENCE = "We could not load your subscription.";
const browser = await chromium.launch();
const sign = await browser.newContext({ viewport: { width: 1440, height: 900 } }), sp = await sign.newPage();
await sp.goto(BASE + "/app", { waitUntil: "domcontentloaded" });
await sp.waitForSelector("input[type=email], .tabbar", { timeout: 60000 });
if (await sp.locator("input[type=email]").count()) {
  await sp.fill("input[type=email]", demoOwner().email);
  await sp.fill("input[type=password]", demoOwner().password);
  await sp.click("form button.btn.primary");
  await sp.waitForSelector(".tabbar", { timeout: 60000 });
}
const state = await sign.storageState();
await sign.close();

let failed = 0;
const say = (ok, what) => { if (!ok) failed++; console.log(`${ok ? "OK  " : "FAIL"} ${what}`); };

for (const [w, h] of [[390, 844], [1440, 900]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, storageState: state });
  const page = await ctx.newPage(), consoleErrors = [];
  page.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource|ERR_FAILED/.test(m.text())) consoleErrors.push(m.text().slice(0, 160)); });
  let calls = 0;
  await page.route("**/functions/v1/platform-billing", (r) => { calls++; return r.abort("failed"); });
  await page.goto(BASE + "/app?settings=billing", { waitUntil: "domcontentloaded" });
  // The loading card carries `data-loading`; wait for the read to have failed.
  await page.waitForFunction(() => document.querySelector(".card") && !document.querySelector("[data-loading]"), null, { timeout: 30000 }).catch(() => {});
  const sentence = page.getByText(SENTENCE, { exact: true });
  const retry = page.getByRole("button", { name: "Try again" });
  const hasSentence = await sentence.isVisible().catch(() => false);
  const hasRetry = await retry.isVisible().catch(() => false);
  say(hasSentence, `${w}px: says "${SENTENCE}"`);
  say(hasRetry, `${w}px: offers a Try again button`);
  if (OUT) await page.screenshot({ path: path.join(OUT, `billing-load-failed-${w}.png`) });
  if (hasRetry) {
    const before = calls;
    await retry.click();
    await page.waitForFunction(() => !document.querySelector("[data-loading]"), null, { timeout: 30000 }).catch(() => {});
    await sentence.waitFor({ state: "visible", timeout: 10000 }).catch(() => {});
    say(calls > before, `${w}px: Try again asks the server again (${before} -> ${calls} requests)`);
    say(await sentence.isVisible().catch(() => false), `${w}px: still says the sentence after a second failure`);
  }
  say(consoleErrors.length === 0, `${w}px: console clean${consoleErrors.length ? ` (${consoleErrors.join(" | ")})` : ""}`);
  await ctx.close();
}
await browser.close();
console.log(failed ? `${failed} failed` : "all passed");
process.exit(failed ? 1 : 0);
