// ROADMAP 97.19 — THE BROWSER HALF OF "A DOUBLE PRESS OF SEND ON A CAMPAIGN SENDS ONCE".
//
//   set -a; . ./.env; set +a; node scripts/campaign-double-press.mjs            # BASE_URL or :5173
//   node scripts/campaign-double-press.mjs --break=no-guard   # sabotage: the modal's click guard is stripped in the page
//   node scripts/campaign-double-press.mjs --shots=<dir>      # also save PNGs and the Before/After freezes there
//
// NOTHING IS SENT AND NOTHING IS WRITTEN. `send-campaign` is answered in the browser by page.route;
// the demo tenant's customers and business are the real rows with an email address and a mailing
// address filled in on the way to the page, so the modal can be reached. Signs in as the demo owner.
//
// At each width (1440x900, 768x1024, 390x844, 320x640) it asks four things:
//   1. two clicks on "Yes, send it" in the SAME task (before React can re-render the disabled
//      button) reach the server ONCE — the guard the modal adds
//   2. a real double-click reaches the server once
//   3. a retry after a lost answer carries the SAME press id, and the server's 409 is shown — the
//      press id is what lets send-campaign refuse the second arrival (tests/campaign-press-once)
//   4. a send the day's limit stopped shows the held line, not "try again in a few minutes"
// plus the console: any error or warning from the page is a failure.
//
// CANARY: --break=no-guard rewrites the served CampaignModal module to drop the guard and SIGNS the
// rewrite; the run must then report 2 requests for check 1, and it reads the signature out of the
// page so a cached, untouched module cannot pass for a sabotaged one (docs/gotchas.md 113).

import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { writeReceipt } from "./receipt.mjs";

const REPO = process.cwd();
const { chromium } = createRequire(import.meta.url)(join(REPO, "app/node_modules/playwright/index.js"));
const { demoOwner } = await import(`file:///${REPO.replace(/\\/g, "/")}/scripts/lib/demoOwner.mjs`);
const BASE = (process.env.BASE_URL || "http://localhost:5173").replace(/\/$/, "");
const BREAK = (process.argv.find((a) => a.startsWith("--break=")) ?? "").slice(8);
const SHOTS = (process.argv.find((a) => a.startsWith("--shots=")) ?? "").slice(8);
if (BREAK && BREAK !== "no-guard") throw new Error(`unknown --break=${BREAK}; known: no-guard`);
const SIZES = [[1440, 900], [768, 1024], [390, 844], [320, 640]];
const CORS = { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "*", "content-type": "application/json" };
const started_at = new Date().toISOString();

const failures = [];
const lines = [];
let assertions = 0;
const check = (name, cond, detail = "") => {
  assertions++;
  const l = `${cond ? "ok  " : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`;
  lines.push(l);
  console.log(`  ${l}`);
  if (!cond) failures.push(`${name} ${detail}`.trim());
};

const browser = await chromium.launch();
// Sign in once; every scenario then gets a FRESH context with one navigation, so a module rewrite
// is never served from the browser's memory cache (docs/gotchas.md 113).
const login = await browser.newContext();
{
  const page = await login.newPage();
  await page.goto(`${BASE}/app`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("input[type=email], .tabbar, .rail", { timeout: 30000 });
  if (await page.locator("input[type=email]").count()) {
    const o = demoOwner();
    await page.fill("input[type=email]", o.email);
    await page.fill("input[type=password]", o.password);
    await page.click("form button.btn.primary");
    await page.waitForSelector(".tabbar, .rail", { timeout: 30000 });
  }
}
const state = await login.storageState();
await login.close();

/** Open the compose sheet at one width with `answer(body, n)` deciding each send-campaign reply. */
async function open([w, h], answer, strip = BREAK === "no-guard") {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, storageState: state });
  const page = await ctx.newPage();
  const consoleBad = [];
  page.on("console", (m) => { if (["error", "warning"].includes(m.type())) consoleBad.push(m.text().slice(0, 160)); });
  page.on("pageerror", (e) => consoleBad.push(String(e).slice(0, 160)));
  const posts = [];
  // A route still answering when its context closes throws "response has been disposed"; that is
  // the teardown, not the page.
  const quiet = (fn) => async (route) => { try { await fn(route); } catch (e) { if (!/disposed|closed|Target page/.test(String(e))) throw e; } };
  let firstName = null;
  await page.route("**/functions/v1/send-campaign", quiet(async (route) => {
    const req = route.request();
    if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers: CORS });
    const body = JSON.parse(req.postData() || "{}");
    posts.push(body);
    const r = await answer(body, posts.length);
    if (r === "abort") return route.abort("connectionreset");
    return route.fulfill({ status: r.status ?? 200, headers: CORS, body: JSON.stringify(r.body) });
  }));
  await page.route("**/rest/v1/customers?*", quiet(async (route) => {
    if (route.request().method() !== "GET") return route.continue();
    const res = await route.fetch();
    let rows; try { rows = await res.json(); } catch { return route.fulfill({ response: res }); }
    if (!Array.isArray(rows)) return route.fulfill({ response: res });
    rows = rows.map((c, i) => ({ ...c, email: c.email || `client${i}@example.com`, unsubscribed_at: null, email_failed_at: null }));
    firstName ??= rows.find((c) => c.name)?.name ?? null;
    return route.fulfill({ response: res, json: rows });
  }));
  await page.route("**/rest/v1/businesses?*", quiet(async (route) => {
    if (route.request().method() !== "GET") return route.continue();
    const res = await route.fetch();
    let b; try { b = await res.json(); } catch { return route.fulfill({ response: res }); }
    const fill = (x) => ({ ...x, mailing_address: x.mailing_address || "100 Main St, Springfield" });
    return route.fulfill({ response: res, json: Array.isArray(b) ? b.map(fill) : fill(b) });
  }));
  if (strip) {
    await page.route("**/src/components/CampaignModal.jsx*", quiet(async (route) => {
      const res = await route.fetch();
      const text = await res.text();
      const broken = text.replace("if (sending.current) return;", "");
      return route.fulfill({ response: res, body: broken + (broken !== text ? "\nwindow.__sab9719 = 1;\n" : "") });
    }));
  }
  await page.goto(`${BASE}/app/clients`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector('[data-tour="csearch"]', { timeout: 30000 });
  for (let i = 0; i < 50 && !firstName; i++) await page.waitForTimeout(100);
  await page.fill('[data-tour="csearch"]', (firstName || "a").split(" ")[0]);
  await page.locator('[data-tour="compose"]').first().click({ timeout: 15000 });
  await page.getByRole("button", { name: /^Send to \d+/ }).click();
  const yes = page.getByRole("button", { name: "Yes, send it" });
  await yes.waitFor();
  return { ctx, page, posts, consoleBad, yes };
}

const ok = (n) => ({ body: { sent: n, failed: 0, no_email: 0, unsubscribed: 0, bounced: 0, capped: 0, cap: 50, held: 0 } });
const slow = (r) => new Promise((res) => setTimeout(() => res(r), 1200));
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
let canaryCaught = null;
let reached = 0;
if (SHOTS) mkdirSync(join(SHOTS, "png"), { recursive: true });
const freeze = SHOTS ? (await import("file:///C:/Users/rando/Downloads/claude/belt/freeze.mjs")) : null;

for (const size of SIZES) {
  const tag = `${size[0]}x${size[1]}`;
  console.log(`\n${tag}`);

  // 1. Two clicks in one task.
  {
    const s = await open(size, () => slow(ok(1)));
    if (BREAK) check(`${tag} sabotage landed in the page`, await s.page.evaluate(() => window.__sab9719 === 1));
    await s.page.evaluate(() => {
      const b = [...document.querySelectorAll("button")].find((x) => x.textContent.trim() === "Yes, send it");
      b.click(); b.click();
    });
    await s.page.getByText(/will get it/).waitFor({ timeout: 10000 });
    await s.page.waitForTimeout(400);
    check(`${tag} 1 two clicks in one task reach the server once`, s.posts.length === 1, `${s.posts.length} requests`);
    check(`${tag} 1 the press carries a well-formed id`, UUID.test(s.posts[0]?.press_id ?? ""), String(s.posts[0]?.press_id));
    check(`${tag} 1 console clean`, s.consoleBad.length === 0, s.consoleBad.join(" | "));
    reached++;
    await s.ctx.close();
  }
  if (BREAK) continue;

  // 2. A real double-click.
  {
    const s = await open(size, () => slow(ok(1)));
    await s.yes.dblclick();
    await s.page.getByText(/will get it/).waitFor({ timeout: 10000 });
    await s.page.waitForTimeout(400);
    check(`${tag} 2 a double-click reaches the server once`, s.posts.length === 1, `${s.posts.length} requests`);
    check(`${tag} 2 console clean`, s.consoleBad.length === 0, s.consoleBad.join(" | "));
    await s.ctx.close();
  }

  // 3. The answer is lost, the detailer presses again: same id, and the server's refusal is shown.
  {
    const seen = new Set();
    const s = await open(size, (b, n) => {
      if (n === 1) { seen.add(b.press_id); return "abort"; }
      return seen.has(b.press_id) ? { status: 409, body: { error: "This email was already sent. Nothing was sent twice." } } : ok(1);
    });
    await s.yes.click();
    await s.page.getByRole("button", { name: /^Send to \d+/ }).click({ timeout: 10000 });
    await s.page.getByRole("button", { name: "Yes, send it" }).click();
    const shown = await s.page.getByText("This email was already sent. Nothing was sent twice.").waitFor({ timeout: 10000 }).then(() => true, () => false);
    check(`${tag} 3 the retry carries the same press id`, s.posts.length === 2 && s.posts[0].press_id === s.posts[1].press_id, `${s.posts.length} requests`);
    check(`${tag} 3 the server's refusal of the second arrival is shown`, shown);
    // The aborted first request (a failed fetch) and the server's 409 are both logged by the
    // browser; those two lines ARE the scenario, not a defect. Anything else is.
    const other = s.consoleBad.filter((m) => !/Failed to fetch|net::ERR_CONNECTION_RESET|FunctionsFetchError|Failed to send a request|status of 409/i.test(m));
    check(`${tag} 3 console clean apart from the lost answer`, other.length === 0, other.join(" | "));
    if (SHOTS) await s.page.screenshot({ path: join(SHOTS, "png", `refused-${tag}.png`) });
    await s.ctx.close();
  }

  // 4. The day's share ran out after 20: the rest are HELD, and said so.
  {
    const held = { body: { sent: 20, failed: 0, no_email: 0, unsubscribed: 0, bounced: 0, capped: 0, cap: 50, held: 30 } };
    const s = await open(size, () => held);
    await s.yes.click();
    // The product's string is "{count} were not sent — …", so the fixed words are matched and the
    // count is read separately (scripts/label-guard.mjs looks for these words in the product).
    const line = s.page.getByText("were not sent — your customer emails for today are used up. Send the rest tomorrow.", { exact: false });
    const seen = await line.waitFor({ timeout: 10000 }).then(async () => (await line.textContent()).trim().startsWith("30 "), () => false);
    check(`${tag} 4 a send stopped by the day's limit says the rest wait for tomorrow`, seen);
    const box = seen ? await line.boundingBox() : null;
    check(`${tag} 4 the held line is inside the screen`, !!box && box.x >= 0 && box.x + box.width <= size[0] + 0.5, JSON.stringify(box));
    check(`${tag} 4 console clean`, s.consoleBad.length === 0, s.consoleBad.join(" | "));
    if (SHOTS) {
      await s.page.screenshot({ path: join(SHOTS, "png", `held-${tag}.png`) });
      if (size[0] === 390) {
        await freeze.freeze(s.page, { out: join(SHOTS, "after.html"), label: "After",
          note: "The day's limit stopped this campaign after 20. The other 30 are named as waiting for tomorrow, not as failures to retry.",
          highlightText: "were not sent" });
        // The BEFORE is the same sheet answered the way the old server answered this situation: it
        // tried every address and called the refused ones failed. The sheet's code for `failed` is
        // unchanged by 97.19, so this is what the screen showed.
        const old = await open(size, () => ({ body: { sent: 20, failed: 30, no_email: 0, unsubscribed: 0, bounced: 0, capped: 0, cap: 50 } }));
        await old.yes.click();
        await old.page.getByText(/did not go out/).waitFor({ timeout: 10000 });
        await freeze.freeze(old.page, { out: join(SHOTS, "before.html"), label: "Before",
          note: "The day's limit refused 30 of this campaign, and the sheet told the detailer to try them again in a few minutes, when they would be refused again until tomorrow.",
          highlightText: "did not go out" });
        await old.ctx.close();
      }
    }
    await s.ctx.close();
  }
}
// THE CANARY, EVERY RUN: the same two clicks with the guard stripped out of the served module must
// reach the server twice, or check 1 cannot see the defect it exists for.
{
  const s = await open([390, 844], () => slow(ok(1)), true);
  const signed = await s.page.evaluate(() => window.__sab9719 === 1);
  await s.page.evaluate(() => {
    const b = [...document.querySelectorAll("button")].find((x) => x.textContent.trim() === "Yes, send it");
    b.click(); b.click();
  });
  await s.page.waitForTimeout(2500);
  canaryCaught = signed && s.posts.length === 2;
  console.log(`
canary (guard stripped, signed ${signed}): ${s.posts.length} requests — ${canaryCaught ? "caught" : "NOT caught"}`);
  lines.push(`canary: guard stripped, signed ${signed}, ${s.posts.length} requests`);
  await s.ctx.close();
}
await browser.close();

const ART = `artifacts/campaign-double-press/results${BREAK ? `.sabotage-${BREAK}` : ""}.txt`;
mkdirSync("artifacts/campaign-double-press", { recursive: true });
writeFileSync(ART, `break: ${BREAK || "none"}\nbase: ${BASE}\n${lines.join("\n")}\n`);
const EXPECTED_ASSERTIONS = BREAK ? SIZES.length * 4 : SIZES.length * 11;
writeReceipt({
  check_id: "campaign-double-press",
  started_at,
  status: failures.length || assertions !== EXPECTED_ASSERTIONS ? "fail" : "pass",
  expected_targets: SIZES.length,
  discovered_targets: reached,
  attempted_targets: reached,
  completed_targets: reached,
  skipped_targets: SIZES.length - reached,
  assertions_executed: assertions,
  min_assertions: EXPECTED_ASSERTIONS,
  failures,
  assertion_floor: "structural: a fixed list of checks per width",
  artifacts: [ART],
  canary: { id: "guard-stripped-in-page", observed_failure: canaryCaught },
  dimensions: { break: BREAK || undefined, base: BASE, widths: SIZES.map((s) => s.join("x")) },
});
console.log(`\n${assertions} assertions, ${failures.length} failed, ${reached} of ${SIZES.length} widths reached`);
process.exit(failures.length || assertions !== EXPECTED_ASSERTIONS ? 1 : 0);
