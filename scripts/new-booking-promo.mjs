// ROADMAP 97.23 — A PROMO CODE TYPED INTO THE DASHBOARD'S NEW BOOKING SHEET WAS ALWAYS REFUSED.
//
//   set -a; . <main checkout>/.env; set +a
//   BASE=http://127.0.0.1:5180 node --import ./scripts/lib/inject-app-env.mjs scripts/new-booking-promo.mjs
//   BREAK=as-typed …   # sabotage: the sheet's validate call carries the code exactly as typed (lower case), the
//                      # original defect, against the deployed endpoint — the good-code case must go red at every width
//
// Per width (390, 768, 1440) the demo OWNER opens New booking, picks the first service, types the seeded code in
// LOWER case ("summer10") and presses Apply. Asked: the sheet says "Applied.", and the price summary carries a
// "Promo SUMMER10" line with a discount over $0. Then "nope9723" is typed and applied: the sheet must show the refusal
// and no "Applied.". Expected targets: 3 widths x 2 cases = 6.
//
// READS ONLY. No booking is created; validate-promo-code and calculate-booking write nothing. The one 404 the refusal
// case produces (validate-promo-code answering "Invalid or expired promo code") is the designed refusal, so it is
// allowed by URL and printed; any other console error fails the width.
//
// FREEZE=before|after with FREEZE_TOOL=<path to belt freeze.mjs> and FREEZE_OUT=<dir> saves the 390 good-code
// result as a Before/After review page (the belt's review aid; nothing in the check depends on it).

import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { writeReceipt } from "./receipt.mjs";
import { demoOwner } from "./lib/demoOwner.mjs";

const require = createRequire(new URL("../app/package.json", import.meta.url));
const { chromium } = require("playwright");
const BASE = process.env.BASE || "http://localhost:5173";
const BREAK = process.env.BREAK || "";
if (BREAK && BREAK !== "as-typed") throw new Error(`Unknown BREAK=${BREAK}. Known: as-typed.`);
const FREEZE = process.env.FREEZE || "";
const WIDTHS = [[390, 844], [768, 1024], [1440, 900]];
const SHOTS = "artifacts/new-booking-promo";
const tag = BREAK ? `.break-${BREAK}` : "";
const started_at = new Date().toISOString();
mkdirSync(SHOTS, { recursive: true });

const failures = [];
let assertions = 0, completed = 0;
const check = (name, ok, detail = "") => {
  assertions++;
  console.log(`  ${ok ? "ok  " : "FAIL"}  ${name}${ok ? "" : " " + detail}`);
  if (!ok) failures.push(`${name} ${detail}`.trim());
  return ok;
};

const freezeTool = FREEZE ? await import(pathToFileURL(process.env.FREEZE_TOOL).href) : null;
const browser = await chromium.launch();
const OWNER = demoOwner();
for (const [w, h] of WIDTHS) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
  if (BREAK === "as-typed") {
    await ctx.route(/\/functions\/v1\/validate-promo-code/, (route) => {
      const body = route.request().postDataJSON() || {};
      return route.continue({ postData: JSON.stringify({ ...body, code: String(body.code || "").toLowerCase() }) });
    });
  }
  const p = await ctx.newPage();
  const errors = [], allowed = [];
  p.on("console", (m) => {
    if (m.type() !== "error") return;
    const url = m.location()?.url || "";
    (/validate-promo-code/.test(url) && /404/.test(m.text()) ? allowed : errors).push(`${m.text().slice(0, 120)} ${url}`);
  });
  p.on("pageerror", (e) => errors.push(e.message.slice(0, 160)));
  await p.goto(`${BASE}/app`, { waitUntil: "domcontentloaded" });
  await p.waitForSelector("input[type=email]", { timeout: 60000 });
  await p.fill("input[type=email]", OWNER.email);
  await p.fill("input[type=password]", OWNER.password);
  await p.click("form button.btn.primary");
  await p.waitForSelector(".tabbar", { timeout: 30000 });
  await p.evaluate(() => { try { localStorage.setItem("dp.tours", JSON.stringify(["shell", "today", "calendar", "money", "clients", "business"])); localStorage.setItem("dp.tour", "1"); } catch {} });
  await p.locator("button[aria-label='New booking']").first().click();
  await p.locator(".nb-group .chip").first().click();

  const field = p.locator("label.field", { hasText: "Promo code (optional)" });
  const apply = async (code) => {
    await field.locator("input").fill(code);
    const resp = p.waitForResponse((r) => r.url().includes("/functions/v1/validate-promo-code"), { timeout: 30000 });
    await field.getByRole("button").click();
    const r = await resp;
    await p.waitForTimeout(2500); // the quote re-prices after the code lands
    return r.status();
  };

  // 1 — the good code, typed in lower case.
  const goodStatus = await apply("summer10");
  const okText = await p.locator(".ok-box").allInnerTexts();
  const line = p.locator("span", { hasText: /^Promo SUMMER10$/ });
  const lineShown = (await line.count()) === 1;
  const discount = lineShown ? await line.locator("xpath=following-sibling::span").innerText() : "";
  const ok1 = check(`${w}: "summer10" -> validate ${goodStatus}, sheet says Applied.`, okText.some((t) => t.includes("Applied.")),
    JSON.stringify(await p.locator(".error-box").allInnerTexts()))
    & check(`${w}: the price summary carries "Promo SUMMER10" with a discount over $0`, lineShown && /-\$\d/.test(discount) && !/-\$0(\.00)?$/.test(discount),
      `line ${lineShown} discount ${JSON.stringify(discount)}`);
  if (ok1) completed++;
  console.log(`  ${w}: discount shown: ${JSON.stringify(discount)}`);
  await p.screenshot({ path: `${SHOTS}/good-${w}x${h}${tag}.png` });
  if (freezeTool && w === 390) {
    await freezeTool.freeze(p, {
      out: `${process.env.FREEZE_OUT}/${FREEZE}.html`, label: FREEZE === "before" ? "Before" : "After",
      highlight: FREEZE === "before" ? ".error-box" : ".ok-box",
      note: FREEZE === "before"
        ? "The owner typed the business's real code SUMMER10 in lower case and pressed Apply: the sheet refuses it and no discount comes off."
        : "The same lower-case code is now accepted: the sheet says Applied. and the price summary takes 10% off as \"Promo SUMMER10\".",
    });
  }

  // 2 — a code that does not exist.
  const badStatus = await apply("nope9723");
  const errText = await p.locator(".error-box").allInnerTexts();
  const ok2 = check(`${w}: "nope9723" -> validate ${badStatus}, sheet shows the refusal and no Applied.`,
    badStatus === 404 && errText.length === 1 && errText[0].trim().length > 0 && (await p.locator(".ok-box").count()) === 0,
    JSON.stringify(errText));
  await p.screenshot({ path: `${SHOTS}/bad-${w}x${h}${tag}.png` });
  console.log(`  ${w}: refusal shown: ${JSON.stringify(errText)}; allowed console 404s: ${allowed.length}`);
  const ok3 = check(`${w}: no console errors besides the refusal's own 404`, errors.length === 0, JSON.stringify(errors));
  if (ok2 && ok3) completed++;
  await ctx.close();
}
await browser.close();

writeReceipt({
  check_id: "new-booking-promo",
  started_at,
  status: failures.length ? "fail" : "pass",
  expected_targets: WIDTHS.length * 2,
  discovered_targets: WIDTHS.length * 2,
  attempted_targets: WIDTHS.length * 2,
  completed_targets: completed,
  skipped_targets: 0,
  assertions_executed: assertions,
  min_assertions: WIDTHS.length * 4,
  failures,
  assertion_floor: "per width: lower-case good code says Applied. and prices a Promo SUMMER10 discount; unknown code shows the refusal; clean console",
  artifacts: [SHOTS],
  canary: { id: "as-typed", observed_failure: BREAK === "as-typed" ? failures.length > 0 : true },
  dimensions: { break: BREAK || undefined, logins: "demo owner", writes: "none" },
});
process.exit(failures.length ? 1 : 0);
