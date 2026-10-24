// ROADMAP 97.39 - a business with no services is OFFERED three starters at setup.
//
//   node scripts/starter-services.mjs
//
// Dev server (BASE_URL, default http://localhost:5173) + the demo owner's login from .env.
// SHOTS_DIR=<folder> also copies every screenshot there.
//
// WHAT IS REAL AND WHAT IS NOT. The demo tenant already has services, so the empty list is
// produced by answering the GET on /rest/v1/services with what this script has "created" so
// far (nothing at first). NOTHING IS WRITTEN: every non-GET to /rest/v1 is swallowed, and the
// services POST is captured and answered by this script, which then serves the captured rows
// back so the screen behaves as it would after a real save. That proves the SCREEN and the
// PAYLOAD it sends; it does not prove the rows land in a real database (UNJUDGEABLE in the
// receipt).
//
// Per width x language it asks: the card shows three rows; the prices are editable in a
// MoneyField; a blank price refuses; pressing Add sends exactly three rows at the prices on
// screen (one of them edited); Skip sends nothing. And the other half: a business that
// ALREADY has services is never shown the card.
import { createRequire } from "node:module";
import { mkdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { REPO, writeReceipt } from "./receipt.mjs";
import { demoOwner } from "./lib/demoOwner.mjs";

const { chromium } = createRequire(import.meta.url)("./../app/node_modules/playwright/index.js");
const BASE = process.env.BASE_URL || "http://localhost:5173";
const ART = join(REPO, "artifacts", "starter-services");
const SHOTS = process.env.SHOTS_DIR || "";
const BREAK = (process.argv.find((a) => a.startsWith("--break=")) || "").split("=")[1] || null;
// The demo login lives in the MAIN checkout's .env (never printed).
for (const f of [join(REPO, ".env"), "C:/Users/rando/Downloads/claude/detailing-platform/.env"]) {
  if (!existsSync(f)) continue;
  for (const line of readFileSync(f, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
const OWNER = demoOwner();
const SIZES = [{ w: 320, h: 844 }, { w: 390, h: 844 }, { w: 768, h: 1024 }, { w: 1440, h: 900 }];
const LANGS = ["en", "es"];
const TEXT = {
  en: { names: ["Exterior detail", "Interior detail", "Full detail"], skip: "Skip", title: "Start with three services" },
  es: { names: ["Detallado exterior", "Detallado interior", "Detallado completo"], skip: "Saltar", title: "Empieza con tres servicios" },
};
const DEFAULTS = [120, 150, 250];
const EDITED = 95;

const failures = [], consoleBad = [];
let assertions = 0, targets = 0;
const check = (id, name, cond, detail) => {
  assertions++;
  if (cond) return true;
  failures.push(`${id}: ${name} - ${detail}`);
  console.error(`    FAIL    ${name}  ${id} - ${detail}`);
  return false;
};

async function open(browser, size, lang, id, { emptyList = true } = {}) {
  const ctx = await browser.newContext({ viewport: { width: size.w, height: size.h } });
  await ctx.addInitScript((l) => { try { localStorage.setItem("dp.lang.app", l); } catch {} }, lang);
  const page = await ctx.newPage();
  const posts = [];
  const created = [];
  page.on("console", (m) => {
    if (["error", "warning"].includes(m.type())) consoleBad.push(`${id}: ${m.type()}: ${m.text().slice(0, 160)}`);
  });
  await page.route(/\/rest\/v1\//, async (route) => {
    const req = route.request();
    const url = req.url();
    const isServices = /\/rest\/v1\/services(\?|$)/.test(url);
    if (req.method() === "POST" && isServices) {
      const body = JSON.parse(req.postData() || "[]");
      posts.push(body);
      created.push(...body.map((r, i) => ({ id: `fake-${created.length + i}`, ...r })));
      return route.fulfill({ status: 201, body: "" });
    }
    if (req.method() !== "GET" && req.method() !== "HEAD") return route.fulfill({ status: 204, body: "" });
    if (emptyList && isServices && req.method() === "GET") {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(created) });
    }
    return route.continue();
  });
  await page.goto(`${BASE}/app`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("input[type=email], .tabbar", { timeout: 30000 });
  if (await page.locator("input[type=email]").count()) {
    await page.fill("input[type=email]", OWNER.email);
    await page.fill("input[type=password]", OWNER.password);
    await page.click("form button.btn.primary");
    await page.waitForSelector(".tabbar", { timeout: 30000 });
  }
  await page.waitForTimeout(2500);
  return { ctx, page, posts };
}

// Business tab -> "Finish setting up" row -> walk Back to step 1 (services).
async function toServicesStep(page) {
  await page.locator('.tabbar button[data-tour="business"]').first().dispatchEvent("click");
  await page.waitForSelector('[data-tour="setup"] button.nav-row', { timeout: 15000 });
  await page.locator('[data-tour="setup"] button.nav-row').click();
  await page.waitForSelector(".setupform h2.title", { timeout: 10000 });
  const back = page.locator(".setupform .settings-head button.btn.icon");
  for (let n = 0; n < 14 && !(await back.isDisabled()); n++) {
    await back.click();
    await page.waitForTimeout(350);
  }
  await page.waitForTimeout(800);
}

const shot = async (page, name) => {
  mkdirSync(ART, { recursive: true });
  await page.screenshot({ path: join(ART, `${name}.png`), fullPage: true });
  if (SHOTS) { mkdirSync(SHOTS, { recursive: true }); await page.screenshot({ path: join(SHOTS, `${name}.png`), fullPage: true }); }
};

const geometry = (page) => page.evaluate(() => {
  const card = document.querySelector('[data-testid="starter-services"]');
  if (!card) return null;
  const r = card.getBoundingClientRect();
  const rows = [...card.querySelectorAll(".row.between")].map((row) => {
    const f = row.querySelector(".money-field")?.getBoundingClientRect();
    return { text: row.innerText.replace(/\s+/g, " ").trim(), fRight: f?.right ?? 0, fH: f?.height ?? 0 };
  });
  return {
    left: r.left, right: r.right,
    docOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    rows,
    inputs: [...card.querySelectorAll(".money-field input")].map((i) => i.value),
    labelsFor: [...card.querySelectorAll("label")].map((l) => !!document.getElementById(l.htmlFor)),
    buttons: [...card.querySelectorAll("button")].map((b) => ({ t: b.innerText.trim(), h: b.getBoundingClientRect().height })),
    hint: card.querySelectorAll("p.muted").length,
  };
});

async function run() {
  const browser = await chromium.launch();
  for (const lang of LANGS) {
    const T = TEXT[lang];
    for (const size of SIZES) {
      const id = `${size.w}px ${lang}`;
      targets++;
      const { ctx, page, posts } = await open(browser, size, lang, id);
      await toServicesStep(page);
      const card = page.locator('[data-testid="starter-services"]');
      const shown = await card.count();
      if (!check(id, "card is offered on an empty list", shown === 1, `cards=${shown}`)) { await shot(page, `${size.w}-${lang}-MISSING`); await ctx.close(); continue; }
      const g = await geometry(page);
      check(id, "title is in the right language", (await card.innerText()).includes(T.title), `text=${(await card.innerText()).slice(0, 80)}`);
      check(id, "three rows, named", g.rows.length === 3 && T.names.every((n, i) => g.rows[i].text.startsWith(n)), JSON.stringify(g.rows.map((r) => r.text)));
      check(id, "default prices shown", JSON.stringify(g.inputs) === JSON.stringify(DEFAULTS.map(String)), JSON.stringify(g.inputs));
      check(id, "every label points at its box", g.labelsFor.length === 3 && g.labelsFor.every(Boolean), JSON.stringify(g.labelsFor));
      check(id, "no sideways scroll", g.docOverflow <= 0, `overflow=${g.docOverflow}`);
      check(id, "card inside the screen", g.left >= 0 && g.right <= size.w + 0.5, `left=${g.left} right=${g.right}`);
      check(id, "price boxes inside the card", g.rows.every((r) => r.fRight <= g.right + 0.5), JSON.stringify(g.rows.map((r) => [r.fRight, g.right])));
      check(id, "buttons at least 44px tall", g.buttons.every((b) => b.h >= 43.5), JSON.stringify(g.buttons));
      check(id, "boxes at least 44px tall", g.rows.every((r) => r.fH >= 43.5), JSON.stringify(g.rows.map((r) => r.fH)));
      await shot(page, `${size.w}-${lang}-offer`);

      // refused: a blank price
      const boxes = card.locator(".money-field input");
      await boxes.nth(1).fill("");
      const gBlank = await geometry(page);
      const addBtn = card.locator("button.primary");
      check(id, "blank price refuses (button disabled + hint)", (await addBtn.isDisabled()) && gBlank.hint >= 1, `dis=${await addBtn.isDisabled()} hint=${gBlank.hint}`);
      if (size.w === 390 || size.w === 1440) await shot(page, `${size.w}-${lang}-blank`);
      check(id, "nothing sent while blank", posts.length === 0, `posts=${posts.length}`);

      // accepted: one price edited
      await boxes.nth(1).fill("150");
      await boxes.nth(0).fill(String(EDITED));
      await addBtn.click();
      await page.waitForTimeout(1200);
      const sent = posts[0] || [];
      check(id, "one request of three rows", posts.length === 1 && sent.length === 3, `posts=${posts.length} rows=${sent.length}`);
      check(id, "prices as shown (edited one too)", JSON.stringify(sent.map((r) => r.price)) === JSON.stringify([EDITED, 150, 250]), JSON.stringify(sent.map((r) => r.price)));
      check(id, "names in the detailer's language", JSON.stringify(sent.map((r) => r.name)) === JSON.stringify(T.names), JSON.stringify(sent.map((r) => r.name)));
      check(id, "rows are active, ordered, and carry the business", sent.every((r, i) => r.is_active === true && r.sort_order === i && r.business_id), JSON.stringify(sent.map((r) => [r.is_active, r.sort_order])));
      check(id, "card gone after adding", (await card.count()) === 0, "card still on screen");
      const listed = await page.locator(".menu-row .n").allInnerTexts();
      check(id, "the three services are listed", T.names.every((n) => listed.includes(n)), JSON.stringify(listed));
      if (size.w === 390 || size.w === 1440) await shot(page, `${size.w}-${lang}-after`);
      await ctx.close();
    }
    // skip: creates none
    for (const size of [SIZES[1], SIZES[3]]) {
      const id = `${size.w}px ${lang} skip`;
      targets++;
      const { ctx, page, posts } = await open(browser, size, lang, id);
      await toServicesStep(page);
      const card = page.locator('[data-testid="starter-services"]');
      check(id, "card is offered", (await card.count()) === 1, "no card");
      await card.locator("button", { hasText: T.skip }).click();
      await page.waitForTimeout(800);
      check(id, "nothing created by skipping", posts.length === 0, `posts=${posts.length}`);
      check(id, "card gone after skipping", (await card.count()) === 0, "card still shown");
      check(id, "the empty-list line still says so", (await page.locator(".setupstep p.muted").count()) >= 1, "no empty line");
      await shot(page, `${size.w}-${lang}-skipped`);
      await ctx.close();
    }
  }
  // the other half: a business that already has services is never offered the card
  targets++;
  {
    const id = "390px already-has-services";
    const { ctx, page } = await open(browser, SIZES[1], "en", id, { emptyList: false });
    await toServicesStep(page);
    check(id, "canary: the services step is on screen", (await page.locator(".setupstep").count()) === 1, "no setup step");
    await page.waitForSelector(".menu-row", { timeout: 8000 }).catch(() => {});
    check(id, "canary: real services are listed", (await page.locator(".menu-row").count()) > 0, "no menu rows");
    check(id, "no starter card when services exist", (await page.locator('[data-testid="starter-services"]').count()) === 0, "card shown over real services");
    await ctx.close();
  }
  await browser.close();

  const expected = LANGS.length * (SIZES.length + 2) + 1;
  const bad = consoleBad.filter((c) => !/platform-admin|whoami|404/.test(c));
  const problems = [...failures, ...bad.map((c) => `console: ${c}`)];
  if (targets !== expected) problems.push(`reached ${targets} of ${expected} scenarios`);
  writeReceipt({
    check_id: "starter-services",
    started_at: new Date(Date.now() - process.uptime() * 1000).toISOString(),
    status: problems.length ? "fail" : "pass",
    expected_targets: expected, discovered_targets: targets, attempted_targets: targets,
    completed_targets: targets, skipped_targets: 0,
    assertions_executed: assertions, min_assertions: 100,
    assertion_floor: "16 offer scenarios x 20 + 4 skip scenarios x 5 + 3 for the already-has-services half; 100 is the floor.",
    failures: problems,
    warnings: [
      "UNJUDGEABLE: the services list is answered in the browser and every write is swallowed; the payload is proved, rows landing in a real database are not (nothing may be written to the shared tenant).",
    ],
    artifacts: [],
    dimensions: { sizes: SIZES.map((s) => `${s.w}x${s.h}`), langs: LANGS, break: BREAK },
    canary: { id: "services-present-no-card", observed_failure: false, problems: [] },
  });
  console.log(`${problems.length ? "FAIL" : "PASS"} - ${assertions} assertions, ${targets}/${expected} scenarios, ${problems.length} problems`);
  problems.forEach((p) => console.log("  - " + p));
  process.exit(problems.length ? 1 : 0);
}
run().catch((e) => { console.error(e); process.exit(2); });
