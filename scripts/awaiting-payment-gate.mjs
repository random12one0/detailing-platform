// ROADMAP 97.37 — A NEW ACCOUNT WAITS AT "FINISH PAYMENT TO GO LIVE".
//
// Andrew, 2026-10-15: *"a new account must NOT get a working booking page,
// customer bookings or any real access until they have paid ... until payments
// work, new accounts simply wait at a 'finish payment to go live' screen."*
//
// Signed in as the demo owner, the business row and the subscription row are
// rewritten IN THE BROWSER (page.route) — nothing is written to the database —
// into three situations, at four widths:
//   unpaid     status paused, no subscription row   -> the waiting screen, no tabs,
//              no New booking; "Go to payment" opens Billing
//   paid       the demo business as it is (active)  -> the normal dashboard
//   suspended  status paused, subscription suspended -> the normal dashboard
//              (a detailer whose card failed keeps their records; only a
//              never-paid account waits)
//   handmade   status paused, NO mark, NO subscription row -> the normal
//              dashboard: an account Andrew made by hand and then suspended.
//              Review finding 2: the first version read "no subscription row"
//              as "never paid" and put this owner on the waiting screen.
// "Never paid" is the server's mark, `awaiting_first_payment`, fed true only
// in the unpaid case.
//
// --break=unmarked feeds the UNPAID case without the mark, which is the
// original defect's picture (a fresh signup with a full dashboard). It must go
// red. The same case runs as the canary inside every run.
//
// Needs the dev server (BASE_URL) and DEMO_OWNER_PW (`set -a; . ./.env; set +a`).
import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
import { writeReceipt, receiptFile } from "./receipt.mjs";
import { outDir } from "./lib/outDir.mjs";
import { demoOwner } from "./lib/demoOwner.mjs";

const require = createRequire(new URL("../app/package.json", import.meta.url));
const { chromium } = require("playwright");

const started_at = new Date().toISOString();
const arg = (k) => (process.argv.find((a) => a.startsWith(`--${k}=`)) || "").split("=").slice(1).join("=");
const BREAK = arg("break");
if (BREAK && BREAK !== "unmarked") { console.error(`Unknown --break=${BREAK}. Known: unmarked.`); process.exit(2); }
const SHOTS = outDir(arg("shots") || "97.37/png");
mkdirSync(SHOTS, { recursive: true });
const BASE = (process.env.BASE_URL || "http://localhost:5173").replace(/\/$/, "");
const SIZES = [[320, 700], [390, 844], [768, 1024], [1440, 900]];
const SCENARIOS = ["unpaid", "paid", "suspended", "handmade"];

let passed = 0, assertions = 0, completed = 0;
const failures = [], transcript = [];
const check = (name, ok, detail = "") => {
  assertions++;
  if (ok) passed++; else failures.push(`${name}${detail ? " — " + detail : ""}`);
  transcript.push(`${ok ? "ok  " : "FAIL"} ${name}${!ok && detail ? " — " + detail : ""}`);
};

const browser = await chromium.launch();
// Sign in once; every case reuses the session.
let state;
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(BASE + "/app", { waitUntil: "domcontentloaded" });
  await page.waitForSelector("input[type=email], .tabbar", { timeout: 30000 });
  if (await page.locator("input[type=email]").count()) {
    await page.fill("input[type=email]", "demo@detailplatform.com");
    await page.fill("input[type=password]", demoOwner().password);
    await page.click("form button.btn.primary");
    await page.waitForSelector(".tabbar", { timeout: 30000 });
  }
  state = await ctx.storageState();
  await ctx.close();
}

// What each situation feeds the two rows. `sub` null = no row at all.
const FEED = {
  unpaid: { status: "paused", mark: BREAK !== "unmarked", sub: null },
  paid: null,
  suspended: { status: "paused", mark: false, sub: { status: "suspended" } },
  handmade: { status: "paused", mark: false, sub: null },
};

async function open(scenario, w, h) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, storageState: state });
  const page = await ctx.newPage();
  const errors = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", (e) => errors.push(String(e)));
  const feed = FEED[scenario];
  let fed = 0;
  if (feed) {
    await page.route(/\/rest\/v1\/businesses\?/, async (route) => {
      if (route.request().method() !== "GET" || !/select=\*/.test(route.request().url())) return route.fallback();
      const res = await route.fetch();
      let body = await res.json();
      const as = (b) => ({ ...b, status: feed.status, awaiting_first_payment: feed.mark });
      body = Array.isArray(body) ? body.map(as) : as(body);
      fed++;
      return route.fulfill({ response: res, json: body });
    });
    await page.route(/\/rest\/v1\/platform_subscriptions\?/, async (route) => {
      const res = await route.fetch();
      const row = feed.sub && { status: feed.sub.status, recurring_cents: 3500, bill_interval: "month", current_period_end: null, cancel_at_period_end: false };
      fed++;
      return route.fulfill({ response: res, json: row ? [row] : [] });
    });
  }
  await page.goto(BASE + "/app", { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".tabbar, .awaitpay", { timeout: 30000 });
  await page.waitForTimeout(900);
  return { ctx, page, errors, fed: () => fed };
}

for (const scenario of SCENARIOS) {
  for (const [w, h] of SIZES) {
    const tag = `${scenario} @${w}`;
    const { ctx, page, errors, fed } = await open(scenario, w, h);
    let errorsBeforePress = null;
    try {
      if (FEED[scenario]) check(`${tag} · the situation was fed (business + subscription rows rewritten)`, fed() >= 2, `fed ${fed()}`);
      const gate = await page.locator(".awaitpay").count();
      const tabs = await page.locator(".tabbar button:visible").count();
      const newBtn = await page.locator(`header button[aria-label="New booking"]:visible`).count();
      if (scenario === "unpaid") {
        check(`${tag} · the waiting screen is shown`, gate === 1, `found ${gate}`);
        const head = gate ? (await page.locator(".awaitpay h1").textContent())?.trim() : "";
        check(`${tag} · it says "Finish payment to go live"`, head === "Finish payment to go live", JSON.stringify(head));
        check(`${tag} · no tab is reachable`, tabs === 0, `${tabs} tabs`);
        check(`${tag} · no New booking button`, newBtn === 0, `${newBtn}`);
        const geo = gate ? await page.evaluate(() => {
          const card = document.querySelector(".awaitpay").getBoundingClientRect();
          const btns = [...document.querySelectorAll(".awaitpay button")].map((b) => { const r = b.getBoundingClientRect(); return { t: b.textContent.trim(), w: r.width, h: r.height, r: r.right, b: r.bottom }; });
          return { sw: document.documentElement.scrollWidth, vw: innerWidth, vh: innerHeight, left: card.left, right: card.right, btns };
        }) : null;
        check(`${tag} · nothing runs off the side`, !!geo && geo.sw <= geo.vw && geo.left >= 0 && geo.right <= geo.vw, JSON.stringify(geo && { sw: geo.sw, vw: geo.vw, l: geo.left, r: geo.right }));
        const pay = geo?.btns.find((b) => b.t === "Go to payment");
        const setup = geo?.btns.find((b) => b.t === "Finish setting up");
        check(`${tag} · "Go to payment" and "Finish setting up" are there`, !!pay && !!setup, JSON.stringify(geo?.btns.map((b) => b.t)));
        check(`${tag} · both are 44px tall and on screen without scrolling`, !!pay && !!setup && pay.h >= 44 && setup.h >= 44 && Math.max(pay.b, setup.b) <= geo.vh, JSON.stringify(geo?.btns));
        await page.screenshot({ path: `${SHOTS}/${BREAK ? "sabotage-" : ""}unpaid-${w}x${h}.png`, fullPage: false });
        // The console is judged BEFORE the press: in the belt's sandbox the
        // billing server answers {} and the Billing screen throws drawing it,
        // on the plain demo account too, so what Billing draws is UNJUDGEABLE here.
        errorsBeforePress = errors.length;
        if (gate) {
          const asked = page.waitForRequest((r) => r.url().includes("/functions/v1/platform-billing"), { timeout: 8000 }).then(() => true, () => false);
          await page.getByRole("button", { name: "Go to payment" }).click();
          const billing = await asked;
          check(`${tag} · "Go to payment" opens Billing (it asks the billing server for its figures)`, billing && (await page.locator(".awaitpay").count()) === 0);
        } else check(`${tag} · "Go to payment" opens Billing (it asks the billing server for its figures)`, false, "no waiting screen to press it on");
      } else {
        check(`${tag} · no waiting screen`, gate === 0, `found ${gate}`);
        check(`${tag} · the tabs are there`, tabs >= 3, `${tabs} tabs`);
        check(`${tag} · New booking is there`, newBtn === 1, `${newBtn}`);
        if (w === 390) await page.screenshot({ path: `${SHOTS}/${scenario}-${w}x${h}.png` });
      }
      const real = errors.slice(0, errorsBeforePress ?? errors.length).filter((e) => !/platform-admin|whoami|Failed to load resource.*404/.test(e));
      check(`${tag} · console has no errors`, real.length === 0, real.slice(0, 3).join(" | "));
      completed++;
    } catch (e) {
      check(`${tag} · case ran`, false, String(e).slice(0, 200));
    } finally {
      await ctx.close();
    }
  }
}
// THE CANARY, IN EVERY RUN: the never-paid case without the server's mark,
// which draws the full dashboard (the original defect). The same question the
// unpaid case asks, "is the waiting screen shown?", must answer NO here.
FEED.canary = { status: "paused", mark: false, sub: null };
let canaryCaught = false;
{
  const { ctx, page, fed } = await open("canary", 390, 844);
  const gate = await page.locator(".awaitpay").count();
  const tabs = await page.locator(".tabbar button:visible").count();
  canaryCaught = fed() >= 2 && gate === 0 && tabs >= 3;
  transcript.push(`canary @390 · fed ${fed()}, waiting screen ${gate}, tabs ${tabs} -> ${canaryCaught ? "caught" : "NOT caught"}`);
  await ctx.close();
}
await browser.close();

const expected = SCENARIOS.length * SIZES.length;
const failed = failures.length;
console.log(transcript.join("\n"));
console.log(`\n${passed} passed, ${failed} failed, ${assertions} assertions, ${completed} of ${expected} cases complete.`);
if (BREAK) console.log(`  note  --break=${BREAK}: this run is a sabotage and MUST be red.`);
const txt = receiptFile(BREAK ? "awaiting-payment-gate.sabotage.txt" : "awaiting-payment-gate.txt");
mkdirSync("receipts", { recursive: true });
writeFileSync(txt, [`awaiting-payment-gate ${new Date().toISOString()} break=${BREAK || "none"} base=${BASE}`, ...transcript,
  `${passed} passed, ${failed} failed`, ...failures.map((f) => "FAIL " + f)].join("\n") + "\n");
writeReceipt({
  check_id: "awaiting-payment-gate", started_at, status: failed ? "fail" : "pass",
  expected_targets: expected, discovered_targets: expected, attempted_targets: expected, completed_targets: completed, skipped_targets: 0,
  assertions_executed: assertions, min_assertions: SIZES.length * 24,
  assertion_floor: "unpaid 10, paid 4, suspended 5, handmade 5 per width; every check() unconditional.",
  canary: { id: "unmarked-signup", observed_failure: canaryCaught, what: "every run: the never-paid case without the server's mark draws the full dashboard (the original defect) and the waiting-screen question must answer no. --break=unmarked does the same to the counted unpaid case, which must go red" },
  failures, artifacts: [txt, SHOTS],
  dimensions: { roadmap: "97.37", break: BREAK || null, base: BASE, widths: SIZES.map(([w, h]) => `${w}x${h}`) },
  warnings: ["UNJUDGEABLE: what the Billing screen draws after Go to payment. The belt's sandbox answers platform-billing with {} and Billing throws on it, on the unmodified demo account too; the check proves the press opens Billing and asks for its figures, not the figures.", "The business and subscription rows are rewritten in the browser; the server half (signup creating a paused business, the first payment opening it) runs only after Andrew deploys create-business and stripe-webhook."],
});
process.exit(failed ? 1 : 0);
