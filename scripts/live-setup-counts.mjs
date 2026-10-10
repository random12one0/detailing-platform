// ROADMAP 9.1b: real live displays, same demo business, separate signed-in contexts.
// Andrew authorized this read-only run on 2026-10-10. No new admin or seed.
// node --env-file=.env scripts/live-setup-counts.mjs
// node --env-file=.env scripts/live-setup-counts.mjs --break=count
// Passwords stay in memory via the existing helper; no storage state or traces.
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { REPO, writeReceipt, validate } from "./receipt.mjs";
import { demoOwner } from "./lib/demoOwner.mjs";

const { chromium } = createRequire(import.meta.url)("../app/node_modules/playwright/index.js");
const BASE = "https://detailingplatform.com";
const PROJECT = "kguqylyzgyzfktkfnhjb";
const BREAK = process.argv.find((a) => a.startsWith("--break="))?.slice(8) || null;
if (BREAK && BREAK !== "count") throw new Error("Only --break=count is supported");
if (process.env.SUPABASE_URL !== `https://${PROJECT}.supabase.co`) throw new Error("Wrong project; nothing measured");
const OWNER = demoOwner();
const SIZES = [{ width: 1440, height: 900 }, { width: 392, height: 844 }];
const ART = join(REPO, ".manager-shots", "9.1b", BREAK || "clean");
mkdirSync(ART, { recursive: true });
const started_at = new Date().toISOString();
const redact = (text) => {
  let safe = String(text);
  for (const [key, value] of Object.entries(process.env)) {
    if (/key|pw|token|password|secret/i.test(key) && value.length >= 6) safe = safe.split(value).join("[redacted]");
  }
  return safe.replace(/https?:\/\/[^\s)]+/g, "[URL]").replace(/eyJ[\w.-]+/g, "[redacted]").slice(0, 500);
};
const failures = [], observed = [], artifacts = [], completed = [];
let assertions = 0;
function check(name, condition, detail) {
  assertions++;
  console.log(`${condition ? "PASS" : "FAIL"} ${name}: ${detail}`);
  if (!condition) failures.push(`${name}: ${detail}`);
}
function parseCount(text) {
  const m = text?.match(/\b(\d+) of (\d+)\b/);
  return m ? { count: Number(m[1]), total: Number(m[2]) } : null;
}
function matching(a, b) {
  return !!a && !!b && a.total === 12 && b.total === 12 && a.count >= 0
    && a.count <= 12 && a.count === b.count;
}
// Canary exercises the very predicate used for the real displayed values.
const canaryCaught = !matching(parseCount("9 of 12 done"), parseCount("setup 4 of 12"))
  && !matching(null, null) && !matching(parseCount("9 of 11"), parseCount("9 of 11"));
check("comparison canary", canaryCaught, "different counts, absent targets and wrong totals are refused");
const browser = await chromium.launch();
const contexts = [];
async function open(size, label) {
  const context = await browser.newContext({ viewport: size });
  contexts.push(context);
  const page = await context.newPage();
  page.setDefaultTimeout(20000);
  const state = { label, errors: [], blocked: [], projects: new Set(), rows: [], businessIds: new Set(), lists: 0, bundle: null, frames: [] };
  page.on("console", (m) => {
    if (["error", "warning"].includes(m.type())) {
      const location = m.location().url;
      const path = location ? new URL(location).pathname : "no-location";
      state.errors.push(`${m.type()} ${path}: ${redact(m.text())}`);
    }
  });
  page.on("pageerror", () => state.errors.push("pageerror"));
  // Never print request headers, bodies, auth answers, or console values.
  page.on("request", (req) => {
    const url = new URL(req.url());
    if (url.hostname.endsWith(".supabase.co")) state.projects.add(url.hostname.split(".")[0]);
    if (/\/assets\/index-[\w-]+\.js$/.test(url.pathname)) state.bundle = url.pathname;
    if (url.pathname.startsWith("/rest/v1/")) {
      const id = url.searchParams.get("business_id");
      if (id?.startsWith("eq.")) state.businessIds.add(id.slice(3));
    }
  });
  page.on("response", async (res) => {
    if (res.request().resourceType() === "document" && new URL(res.url()).pathname === "/book/demo-detail") {
      state.frames.push({ path: "/book/demo-detail", xFrameOptions: await res.headerValue("x-frame-options") });
    }
    if (!res.url().endsWith("/functions/v1/platform-admin") || !res.ok()) return;
    if (res.request().postDataJSON()?.action !== "list") return;
    const out = await res.json().catch(() => null);
    if (out) { state.rows = out.businesses ?? out.rows ?? []; state.lists++; }
  });
  await page.route("**/*", async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    if (url.hostname.endsWith(".supabase.co") && url.hostname !== `${PROJECT}.supabase.co`) {
      state.blocked.push("wrong-project"); return route.abort();
    }
    if (url.hostname !== `${PROJECT}.supabase.co`) return route.continue();
    if (url.pathname.startsWith("/auth/v1/") && !["GET", "HEAD", "OPTIONS"].includes(req.method()) && url.pathname !== "/auth/v1/token") {
      state.blocked.push("auth-write"); return route.abort();
    }
    if (url.pathname.startsWith("/rest/v1/") && !["GET", "HEAD", "OPTIONS"].includes(req.method())) {
      state.blocked.push("database-write"); return route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
    }
    if (url.pathname.startsWith("/functions/v1/") && !(
      (url.pathname === "/functions/v1/platform-admin" && ["list", "get", "whoami"].includes(req.postDataJSON()?.action))
      || url.pathname === "/functions/v1/available-slots"
    )) { state.blocked.push(`function ${url.pathname} ${req.method()} action=${req.postDataJSON()?.action || "none"}`); return route.abort(); }
    if (url.pathname.startsWith("/storage/v1/") && !["GET", "HEAD", "OPTIONS"].includes(req.method())) {
      state.blocked.push("storage-write"); return route.abort();
    }
    return route.continue();
  });
  return { context, page, state };
}
async function signIn(page) {
  await page.goto(`${BASE}/app`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.locator("input[type=email]").fill(OWNER.email);
  await page.locator("input[type=password]").fill(OWNER.password);
  await page.locator("form button.btn.primary").click();
  await page.locator(".tabbar").waitFor({ timeout: 30000 });
}
async function shot(page, name) {
  await page.bringToFront();
  const file = join(ART, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  artifacts.push(file);
}
try {
  for (const size of SIZES) {
    const width = size.width;
    console.log(`Checking live ${width}px`);
    const dash = await open(size, `dashboard-${width}`);
    await signIn(dash.page);
    await dash.page.locator('.tabbar button[data-tour="business"]').click();
    const count = dash.page.locator('[data-tour="setup"] .now');
    await count.waitFor();
    await dash.page.waitForFunction(() => /\d+ of 12 done/.test(document.querySelector('[data-tour="setup"] .now')?.textContent || ""));
    const dashboard = parseCount(await count.textContent());
    check(`dashboard ${width}`, !!dashboard && dashboard.total === 12, `${dashboard?.count} of ${dashboard?.total}`);
    await count.scrollIntoViewIfNeeded();
    await dash.page.waitForTimeout(800);
    await shot(dash.page, `dashboard-${width}`);
    completed.push(`dashboard-${width}`);

    const admin = await open(size, `back-office-${width}`);
    await signIn(admin.page);
    await admin.page.goto(`${BASE}/admin`, { waitUntil: "domcontentloaded" });
    await admin.page.locator(".pa-tabs").waitFor({ timeout: 30000 });
    await admin.page.locator(".pa-tabs button").filter({ hasText: "Detailers" }).click();
    await admin.page.locator(".pa-find").fill("demo-detail");
    const row = admin.page.locator(".pa-biz");
    await row.first().waitFor();
    check(`one account ${width}`, await row.count() === 1, `matched ${await row.count()} live detailer rows`);
    const identity = admin.state.rows.find((r) => r.slug === "demo-detail");
    check(`same business ${width}`, !!identity?.id && dash.state.businessIds.size === 1 && dash.state.businessIds.has(identity.id), "dashboard business_id equals back-office demo-detail row id");
    const setup = row.locator(".pa-biz-f > span").filter({ hasText: /^setup / });
    await setup.waitFor();
    if (BREAK) {
      await setup.evaluate((el) => { const b = el.querySelector("b"); b.textContent = String((Number(b.textContent) + 1) % 13); el.dataset.sabotage = "count"; });
      check(`sabotage landed ${width}`, await setup.getAttribute("data-sabotage") === "count", "displayed count changed in browser only");
    }
    const backOffice = parseCount(await setup.textContent());
    check(`counts agree ${width}`, matching(dashboard, backOffice), `dashboard ${dashboard?.count} of ${dashboard?.total}; back office ${backOffice?.count} of ${backOffice?.total}`);
    await shot(admin.page, `back-office-${width}`);
    await row.click();
    const detailSetup = admin.page.locator('.pa-open .pa-row').filter({ has: admin.page.locator('.pa-k', { hasText: /^Setup$/ }) });
    await detailSetup.waitFor();
    const detailCount = parseCount(await detailSetup.locator(".pa-v").textContent());
    check(`detail count ${width}`, matching(dashboard, detailCount), `detail panel ${detailCount?.count} of ${detailCount?.total}`);
    await detailSetup.scrollIntoViewIfNeeded();
    await shot(admin.page, `back-office-detail-${width}`);
    completed.push(`back-office-${width}`);

    const denied = await open(size, `signed-out-${width}`);
    await denied.page.goto(`${BASE}/admin`, { waitUntil: "domcontentloaded" });
    await denied.page.locator("input[type=email]").waitFor();
    check(`signed-out refusal ${width}`, await denied.page.locator(".pa-biz, .pa-tabs").count() === 0 && denied.state.lists === 0, "sign-in required; no admin rows, tabs or successful list response");
    await shot(denied.page, `signed-out-${width}`);
    completed.push(`signed-out-${width}`);
    for (const x of [dash, admin, denied]) {
      check(`console ${x.state.label}`, x.state.errors.length === 0, `${x.state.errors.length} errors or warnings: ${x.state.errors.join("; ")}`);
      check(`read-only ${x.state.label}`, x.state.blocked.length === 0, `${x.state.blocked.length} blocked: ${x.state.blocked.join("; ")}`);
      check(`project ${x.state.label}`, [...x.state.projects].every((p) => p === PROJECT), "only the platform project contacted");
    }
    observed.push({ width, account: "demo-detail", sameBusiness: !!identity?.id && dash.state.businessIds.has(identity.id), dashboard, backOffice, detailCount, bundle: dash.state.bundle, adminBundle: admin.state.bundle, signedOut: "sign-in required", previewResponses: dash.state.frames });
  }
} catch {
  // A raw Playwright exception can quote a filled password field; never report it.
  failures.push(`Live walk stopped before all targets completed (reached ${completed.join(", ") || "none"}). No exception text retained.`);
  console.error(failures.at(-1));
} finally {
  await Promise.all(contexts.map((c) => c.close().catch(() => {})));
  await browser.close();
}
const { path, receipt } = writeReceipt({
  check_id: "live-setup-counts", environment: "production-read-only", started_at,
  status: failures.length ? "fail" : "pass", expected_targets: 6,
  discovered_targets: completed.length, attempted_targets: completed.length, completed_targets: completed.length,
  skipped_targets: 0, assertions_executed: assertions, min_assertions: 31,
  assertion_floor: "Structural: one comparison canary plus fifteen assertions at each of two widths; extra sabotage assertions are additional.",
  failures, artifacts, dimensions: { base: BASE, project: PROJECT, break: BREAK, sizes: SIZES, observed },
  warnings: ["Measures the existing demo business, not every business. Auth sign-in creates normal login sessions; application writes are blocked. The booking preview reads available-slots, consuming its normal rate-limit budget. No credentials or session state are saved."],
  canary: { id: "different counts or missing/incorrect totals", observed_failure: canaryCaught, caught_by: ["matching"] },
});
const grade = validate(receipt, { sha: null });
console.log(`${grade.verdict.toUpperCase()} — ${completed.length}/6 targets, ${assertions} assertions; ${path}`);
for (const problem of grade.problems) console.log(`  ${problem}`);
process.exitCode = grade.ok ? 0 : 1;
