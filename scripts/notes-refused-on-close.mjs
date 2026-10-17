// ROADMAP 97.79 — IS A NOTES SAVE REFUSED WHILE THE RECORD IS CLOSING SHOWN ANYWHERE?
//
//   set -a; . <main checkout>/.env; set +a
//   BASE=http://127.0.0.1:5180 node scripts/notes-refused-on-close.mjs
//   BREAK=accept …   # sabotage: every save is answered as one that worked, so the CONTROL must go red
//
// The Notes box saves on blur, and pressing Close is itself a blur: the save leaves as the record leaves, and the
// answer comes back to a record that may already be gone. This is an INSTRUMENT, not a gate: it records what the
// screen does, per width and per way out, and its pass means "every case was reached and the control could see a
// refusal" — never "the refusal was shown". The findings are in `dimensions.cases` and in ROADMAP 97.79.
//
// Every save to set_customer_notes is answered HERE, never by the database: a 403 after ANSWER_MS (a refusal at a
// believable network speed, longer than the record's 180ms exit). Nothing is written anywhere. Signs in as the demo
// STAFF login. Per width:
//   CONTROL  type, then blur by clicking the record's own title — the line must be found (else the instrument is blind)
//   CLOSE    type, then press the record's Close — was a save sent, and is the line anywhere in the page afterwards?
//   ESCAPE   type, then press Escape (the box keeps focus, so no blur precedes the close) — was a save sent at all?
//   NEXT     type, press Close, open the NEXT client before the answer — does the refusal land on that client's record?
// "Anywhere" = an element whose text holds the sentence, anywhere in the document, at ANSWER_MS + 1.5s.
// CANARY, EVERY RUN: the sentence planted in a hidden div must be found by `anywhere` — or "not found" means nothing.
//
// No-.env servers: the two VITE_ values are supplied to the page from the root `.env`'s SUPABASE_URL /
// SUPABASE_ANON_KEY (the anon key ships in every browser bundle). Never printed.

import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
import { writeReceipt } from "./receipt.mjs";
import { demoStaff } from "./lib/demoOwner.mjs";

const require = createRequire(new URL("../app/package.json", import.meta.url));
const { chromium } = require("playwright");
const BASE = process.env.BASE || "http://localhost:5173";
const BREAK = process.env.BREAK || "";
const WIDTHS = [[390, 844], [768, 1024], [1440, 900]];
const CASES = ["control", "close", "escape", "next"];
const ANSWER_MS = 600;
const NOT_SAVED = "Your notes were not saved";
const SHOTS = process.env.SHOTS || "artifacts/notes-refused-on-close";
const started_at = new Date().toISOString();

const failures = [];
const results = [];
let assertions = 0, completed = 0, canaryCaught = null, calls = 0;
const check = (name, ok, detail = "") => {
  assertions++;
  console.log(`  ${ok ? "ok  " : "FAIL"}  ${name}${ok ? "" : " " + detail}`);
  if (!ok) failures.push(`${name} ${detail}`.trim());
  return ok;
};
const anywhere = (page) => page.evaluate((s) => [...document.querySelectorAll("body *")]
  .filter((e) => e.children.length === 0 && e.textContent.includes(s)).length, NOT_SAVED);

const browser = await chromium.launch();
mkdirSync(SHOTS, { recursive: true });
const STAFF = demoStaff();
const tag = BREAK ? `.break-${BREAK}` : "";
for (const [w, h] of WIDTHS) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message.slice(0, 160)));
  await ctx.route(/\/src\/.*\.(js|jsx)(\?.*)?$/, async (route) => {
    const res = await route.fetch();
    const body = (await res.text())
      .replaceAll("import.meta.env.VITE_SUPABASE_URL", JSON.stringify(process.env.SUPABASE_URL))
      .replaceAll("import.meta.env.VITE_SUPABASE_ANON_KEY", JSON.stringify(process.env.SUPABASE_ANON_KEY));
    await route.fulfill({ response: res, body });
  });
  let sent = 0;
  await ctx.route(/\/rest\/v1\/rpc\/set_customer_notes/, async (route) => {
    sent++; calls++;
    await new Promise((r) => setTimeout(r, ANSWER_MS));
    await route.fulfill(BREAK === "accept" ? { status: 204, body: "" }
      : { status: 403, json: { code: "42501", message: "not a member of this business" } }).catch(() => {});
  });

  await page.goto(`${BASE}/app`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("input[type=email], .tabbar", { timeout: 60000 });
  if (await page.locator("input[type=email]").count()) {
    await page.fill("input[type=email]", STAFF.email);
    await page.fill("input[type=password]", STAFF.password);
    await page.click("form button.btn.primary");
    await page.waitForSelector(".tabbar", { timeout: 30000 });
  }
  await page.evaluate(() => { try { localStorage.setItem("dp.tours", JSON.stringify(["shell", "today", "calendar", "money", "clients", "business"])); localStorage.setItem("dp.tour", "1"); } catch {} });
  const box = page.locator("label.field:has-text('Notes') textarea").first();
  const openRecord = async (n = 0) => {
    await page.goto(`${BASE}/app/clients`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector(".rows.cols.clients .row-item", { timeout: 30000 });
    await page.locator(".rows.cols.clients .row-item").nth(n).click();
    await box.waitFor({ state: "visible", timeout: 15000 });
    await page.evaluate(() => Promise.all((document.querySelector(".record, .sheet")?.getAnimations({ subtree: true }) ?? [])
      .filter((a) => a.effect?.getComputedTiming().duration !== Infinity).map((a) => a.finished.catch(() => {}))));
  };
  const settle = () => page.waitForTimeout(ANSWER_MS + 1500);

  if (canaryCaught === null) {
    await openRecord();
    await page.evaluate((s) => { const d = document.createElement("div"); d.id = "planted"; d.hidden = true; d.textContent = s; document.body.append(d); }, NOT_SAVED);
    canaryCaught = (await anywhere(page)) === 1;
    await page.evaluate(() => document.getElementById("planted").remove());
    check("canary: a hidden planted sentence is found by the anywhere-search", canaryCaught);
  }

  for (const c of CASES) {
    await openRecord();
    sent = 0;
    const name = await page.locator(".record [aria-label], .sheet [aria-label]").first().getAttribute("aria-label").catch(() => null);
    await box.click();
    await box.fill(`97.79 ${c} ${w}`);
    if (c === "control") await page.locator("label.field:has-text('Notes') > span").first().click();
    else if (c === "escape") await page.keyboard.press("Escape");
    else await page.locator("button.x[aria-label='Close']").first().click();
    if (c === "next") {
      await box.waitFor({ state: "detached", timeout: 5000 }).catch(() => {});
      await page.locator(".rows.cols.clients .row-item").nth(1).click();
      await box.waitFor({ state: "visible", timeout: 15000 }).catch(() => {});
    }
    await settle();
    const found = await anywhere(page);
    const recordOpen = await box.count();
    const title = recordOpen ? await page.locator(".record h2, .sheet h2").first().textContent().catch(() => null) : null;
    await page.screenshot({ path: `${SHOTS}/${c}-${w}x${h}${tag}.png` });
    results.push({ width: w, case: c, save_sent: sent, line_found: found, record_open: recordOpen > 0, record_title: title, opened_as: name });
    console.log(`  ${w} ${c}: save sent ${sent}, line found ${found}, record open ${recordOpen > 0}${title ? ` (${title})` : ""}`);
    let ok = true;
    if (c === "control") ok = check(`${w}: control: a refusal with the record open is found`, sent === 1 && found === 1, JSON.stringify({ sent, found }));
    if (ok) completed++;
  }
  check(`${w}: no page errors`, errors.length === 0, JSON.stringify(errors));
  await ctx.close();
}
await browser.close();

writeReceipt({
  check_id: "notes-refused-on-close",
  started_at,
  status: failures.length ? "fail" : "pass",
  expected_targets: WIDTHS.length * CASES.length,
  discovered_targets: WIDTHS.length * CASES.length,
  attempted_targets: WIDTHS.length * CASES.length,
  completed_targets: completed,
  skipped_targets: 0,
  assertions_executed: assertions,
  min_assertions: WIDTHS.length * 2 + 1,
  failures,
  assertion_floor: "structural: a control and a page-error check per width, and the canary once",
  artifacts: [SHOTS],
  canary: { id: "planted-hidden-sentence-is-found", observed_failure: canaryCaught === true },
  dimensions: { break: BREAK || undefined, login: "demo staff", answer_ms: ANSWER_MS, calls, cases: results },
});
process.exit(failures.length ? 1 : 0);
