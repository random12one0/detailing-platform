// ROADMAP 97.20 — THE MAIL LOG AFTER "DELETE FOR GOOD": NOTHING OF HERS, EVERYBODY ELSE'S INTACT.
//
//   PGLITE_DIR=… PGLITE_REQUIRED=1 node --test tests/forget-customer-sql.test.mjs   # first: writes the rows
//   node scripts/mail-log-forgotten.mjs
//   node scripts/mail-log-forgotten.mjs --break=pre-fix   # sabotage: the rows the PRE-97.20 function left
//
// Needs the dev server (BASE_URL), and DEMO_OWNER_PW loaded from `.env`. Signs in as the demo owner and
// WRITES NOTHING: every `email_sends` read the mail log makes is answered in the browser with the EXACT
// rows `tests/forget-customer-sql.test.mjs` left behind in its business A after forgetting Dana — real
// PostgreSQL output, not a hand-written fixture. The migration is not applied to the live database
// (that is Andrew's), so this is the only way the real screen can be shown the real result.
//
// Per width it asks: the list shows all 7 of A's rows; no text on the page or in either opened preview
// names Dana (name, address, phone, street); Eli's confirmation still shows his address and opens to his
// email as sent; the owner's alert about Eli still names him; a forgotten row opens to "not saved".
// `--break=pre-fix` feeds the rows as the 8.11 function left them and must go red naming Dana.

import { createRequire } from "node:module";
import { mkdirSync, readFileSync } from "node:fs";
import { writeReceipt } from "./receipt.mjs";
import { demoOwner, demoOwnerEmail } from "./lib/demoOwner.mjs";

const { chromium } = createRequire(import.meta.url)("./../app/node_modules/playwright/index.js");
const BASE = process.env.BASE_URL || process.env.BASE || "http://localhost:5173";
const BREAK = (process.argv.find((a) => a.startsWith("--break=")) || "").slice(8);
if (BREAK && BREAK !== "pre-fix") { console.error(`unknown --break=${BREAK}; known: pre-fix`); process.exit(2); }
const SRC = `artifacts/forget-customer-sql/business-a-mail-${BREAK ? "before-fix" : "after"}.json`;
const load = (f) => JSON.parse(readFileSync(f, "utf8")).sort((a, b) => (a.sent_at < b.sent_at ? 1 : -1));
const ROWS = load(SRC);
// CANARY, EVERY RUN: the pre-97.20 rows, fed to the same screen once, must be caught naming Dana.
const PRE = load("artifacts/forget-customer-sql/business-a-mail-before-fix.json");
let feed = ROWS;
let canaryCaught = false;
const SIZES = [[390, 844], [320, 740], [768, 1024], [1440, 900]];
const DANA = /dana doe|dana@example|12 elm|555-0101/i;
// Row 7 is ELI's mail, linked to Eli, at the household address he shares with Dana: it is his and stays
// (the SQL test pins it byte for byte). So the list is judged row by row, and only row 7 may show it.
const SHARED = ROWS.find((r) => r.id.endsWith("7"));
const SHOTS = process.env.SHOTS_DIR || "artifacts/mail-log-forgotten";
const OUT = `${SHOTS}${BREAK ? `/sabotage-${BREAK}` : ""}`;
mkdirSync(OUT, { recursive: true });

const started_at = new Date().toISOString();
const failures = [];
let assertions = 0;
const check = (id, ok, detail = "") => {
  assertions++;
  console.log(`${ok ? "  ok  " : "  FAIL"} ${id}${detail ? `  ${detail}` : ""}`);
  if (!ok) failures.push(`${id}${detail ? ` — ${detail}` : ""}`);
};

const browser = await chromium.launch();
let completed = 0;
try {
  for (const [w, h] of SIZES) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h } });
    const page = await ctx.newPage();
    const noise = [];
    page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") noise.push(m.text()); });
    page.on("pageerror", (e) => noise.push(String(e)));
    page.on("response", (r) => { if (r.status() >= 400) noise.push(`HTTP ${r.status()} ${r.url()}`); });
    // Answered here, never sent: the list read and the one-row body read.
    await page.route(/\/rest\/v1\/email_sends\?/, (route) => {
      const u = new URL(route.request().url());
      const one = /^eq\.(.+)$/.exec(u.searchParams.get("id") || "")?.[1];
      if (one) {
        const r = feed.find((x) => x.id === one);
        return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(r ? { body_html: r.body_html } : null) });
      }
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(feed.map(({ id, subject, to_email, status, detail, sent_at }) => ({ id, subject, to_email, status, detail, sent_at }))) });
    });

    const openLog = async () => {
      await page.waitForSelector('[data-tour="gear"]', { timeout: 30000 });
      await page.click('[data-tour="gear"]');
      await page.waitForSelector('[data-settings-key="mail"]', { timeout: 20000 });
      await page.click('[data-settings-key="mail"]');
      await page.waitForSelector("[data-mail-log] .row-item", { state: "attached", timeout: 25000 });
      await page.waitForTimeout(600);
    };
    await page.goto(`${BASE}/app`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("input[type=email]", { timeout: 30000 });
    await page.fill("input[type=email]", demoOwnerEmail);
    await page.fill("input[type=password]", demoOwner().password);
    await page.click("form button.btn.primary");
    await openLog();

    const tag = `${w}x${h}`;
    const items = page.locator("[data-mail-log] .row-item");
    const n = await items.count();
    check(`${tag}: the list shows all ${ROWS.length} of business A's rows`, n === ROWS.length, `${n}`);
    const text = await page.locator("[data-mail-log]").evaluate((el) => el.textContent);
    const rowTexts = await items.evaluateAll((els) => els.map((e) => e.textContent));
    const naming = rowTexts.map((t, i) => [t, ROWS[i]]).filter(([t, r]) => DANA.test(t) && r !== SHARED).map(([t]) => t);
    check(`${tag}: no row but Eli's shared-address one names Dana`, naming.length === 0, naming.join(" | ").slice(0, 120));
    check(`${tag}: Eli's mail is still listed to his address`, text.includes("eli@example.com"));
    check(`${tag}: the owner's alert about Eli still names him`, text.includes("New booking: Eli Park"));
    await page.screenshot({ path: `${OUT}/list-${tag}.png`, fullPage: false });

    // A forgotten row (the newest of hers) opens to "not saved", and nothing in it names her.
    const forgotten = ROWS.find((r) => r.id.endsWith("4"));
    await items.nth(ROWS.indexOf(forgotten)).click();
    await page.waitForSelector("[data-mail-nobody], [data-mail-body]", { state: "attached", timeout: 15000 });
    const sheet = await page.evaluate(() => {
      const nobody = !!document.querySelector("[data-mail-nobody]");
      const frame = document.querySelector("[data-mail-body]");
      return { nobody, all: (document.querySelector(".sheet")?.textContent || "") + (frame?.getAttribute("srcdoc") || "") };
    });
    check(`${tag}: her campaign email opens to "not saved"`, sheet.nobody);
    check(`${tag}: her opened email names nothing of hers`, !DANA.test(sheet.all), (sheet.all.match(DANA) || [""])[0]);
    await page.screenshot({ path: `${OUT}/forgotten-open-${tag}.png` });
    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);
    if (await page.locator("[data-mail-nobody]").count()) await page.goBack().catch(() => {});

    // Eli's confirmation opens to his email exactly as sent.
    const eli = ROWS.find((r) => r.id.endsWith("5"));
    await page.locator("[data-mail-log] .row-item").nth(ROWS.indexOf(eli)).click();
    await page.waitForSelector("[data-mail-body], [data-mail-nobody]", { state: "attached", timeout: 15000 });
    const body = await page.locator("[data-mail-body]").getAttribute("srcdoc").catch(() => null);
    check(`${tag}: Eli's confirmation opens to his email as sent`, (body || "").includes("Eli Park"), String(body).slice(0, 50));
    await page.screenshot({ path: `${OUT}/eli-open-${tag}.png` });

    // docs/gotchas.md 120: the gear's one designed whoami 404 is not a defect.
    const real = noise.filter((m) => !/platform-admin/.test(m) && !/status of 404/.test(m));
    check(`${tag}: console clean`, real.length === 0, real.join(" | ").slice(0, 300));
    if (w === 390) {
      feed = PRE;
      await page.goto(`${BASE}/app`, { waitUntil: "domcontentloaded" });
      await openLog();
      canaryCaught = DANA.test(await page.locator("[data-mail-log]").evaluate((el) => el.textContent));
      console.log(`  canary (pre-97.20 rows on the same screen): ${canaryCaught ? "caught naming Dana" : "NOT CAUGHT"}`);
      feed = ROWS;
    }
    completed++;
    await ctx.close();
  }
} finally {
  await browser.close();
}

const EXPECTED = SIZES.length * 8;
writeReceipt({
  check_id: "mail-log-forgotten",
  started_at,
  status: failures.length || !canaryCaught ? "fail" : "pass",
  expected_targets: SIZES.length,
  discovered_targets: SIZES.length,
  attempted_targets: SIZES.length,
  completed_targets: completed,
  skipped_targets: 0,
  assertions_executed: assertions,
  min_assertions: EXPECTED,
  failures,
  assertion_floor: "structural: eight checks at each of four widths",
  artifacts: [SRC, OUT],
  canary: { id: "pre-97.20-rows", observed_failure: canaryCaught },
  dimensions: { break: BREAK || undefined, base: BASE, rows: ROWS.length, sizes: SIZES.map(([w, h]) => `${w}x${h}`) },
});
console.log(`\n${assertions} assertions, ${failures.length} failed, ${completed} of ${SIZES.length} widths completed`);
process.exit(failures.length || assertions !== EXPECTED ? 1 : 0);
