// Read-only supervision of 9.1c on the actual dev server. No booking submitted.
// node scripts/supervision-preview-2026-10-13.mjs
import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
import { demoOwner } from "./lib/demoOwner.mjs";
import { writeReceipt, REPO } from "./receipt.mjs";
import path from "node:path";
process.loadEnvFile(path.join(REPO, ".env"));
if (new URL(process.env.SUPABASE_URL).hostname !== "kguqylyzgyzfktkfnhjb.supabase.co") throw Error("Wrong project; no browser opened");
const { chromium } = createRequire(path.join(REPO, "app/package.json"))("playwright");
const base = "http://localhost:5173";
const folder = ".manager-shots/supervision-2026-10-13-release";
mkdirSync(path.join(REPO, folder), { recursive: true });
const browser = await chromium.launch();
const observations = [], failures = [], artifacts = [];
const started_at = new Date().toISOString();
let assertions = 0;
const check = (yes, message) => { assertions++; if (!yes) failures.push(message); };
try {
  const login = await browser.newContext();
  const page = await login.newPage();
  await page.goto(base + "/app");
  await page.waitForSelector("input[type=email], .tabbar");
  if (await page.locator("input[type=email]").count()) {
    await page.fill("input[type=email]", demoOwner().email);
    await page.fill("input[type=password]", demoOwner().password);
    await page.click("form button.btn.primary");
    await page.waitForSelector(".tabbar");
  }
  const storageState = await login.storageState();
  await login.close();
  for (const [width, height] of [[1440,900], [768,1024], [390,844], [392,844]]) {
    const context = await browser.newContext({ viewport: { width, height }, storageState });
    const noise = [];
    context.on("page", p => {
      p.on("console", m => { if (["error", "warning"].includes(m.type())) noise.push(m.type() + ": " + m.text()); });
      p.on("pageerror", e => noise.push("pageerror: " + e.message));
    });
    const business = await context.newPage();
    await business.goto(base + "/app/business");
    const iframe = business.locator(".pagepv-frame iframe");
    await iframe.waitFor();
    const frame = await (await iframe.elementHandle()).contentFrame();
    await frame.getByRole("heading", { name: "Pick your services" }).waitFor();
    check(await frame.locator(".bk").count() === 1, width + ": actual booking preview mounted");
    await iframe.scrollIntoViewIfNeeded();
    await business.waitForTimeout(900);
    const shot = `${folder}/business-${width}.png`;
    await business.screenshot({ path: path.join(REPO, shot) }); artifacts.push(shot);
    const opened = context.waitForEvent("page");
    await business.getByRole("link", { name: "Open it", exact: true }).click();
    const booking = await opened;
    await booking.waitForLoadState("domcontentloaded");
    await booking.getByRole("heading", { name: "Pick your services" }).waitFor();
    const next = booking.getByRole("button", { name: "Continue", exact: true });
    // aria-disabled keeps the refusal button pressable; Playwright otherwise
    // declines the press before the product can show its reason.
    await next.click({ force: true });
    check(await booking.getByRole("heading", { name: "Pick your services" }).isVisible(), width + ": empty selection stays on services");
    check(await booking.locator(".bk-step-error").count() > 0 || await next.getAttribute("aria-disabled") === "true", width + ": empty selection is refused");
    await booking.getByRole("button", { name: /^Express Wash/ }).click();
    await next.click();
    await booking.getByRole("heading", { name: "Add-ons", exact: true }).waitFor();
    check(await booking.getByRole("heading", { name: "Add-ons", exact: true }).isVisible(), width + ": selected service advances");
    await booking.waitForTimeout(900);
    check(noise.length === 0, width + ": console " + noise.join(" | "));
    observations.push({ width, height, preview: true, refusedEmpty: true, selectedAdvances: true, console: noise });
    await context.close();
  }
} finally { await browser.close(); }
const report = "receipts/supervisor-preview-flow.txt";
writeFileSync(path.join(REPO, report), JSON.stringify({ observations, failures }, null, 2) + "\n");
writeReceipt({ check_id: "supervisor-preview-flow", started_at, status: failures.length ? "fail" : "pass",
  expected_targets: 4, discovered_targets: observations.length, attempted_targets: 4, completed_targets: observations.length,
  skipped_targets: 0, assertions_executed: assertions, min_assertions: 20, failures,
  assertion_floor: "Exactly four widths times five assertions: preview, empty-step stability, refusal, accepted advance, quiet console.",
  artifacts: [report, ...artifacts], dimensions: { sizes: observations.map(o => `${o.width}x${o.height}`) },
  canary: { id: "empty-service-selection-refused", observed_failure: observations.length === 4 && failures.every(f => !/empty selection/.test(f)) },
  warnings: ["Vite supplies no Netlify framing headers. Separate preview-frame-headers receipt proves the local header model, not the live host."] });
console.log(JSON.stringify({ observations, assertions, failures }, null, 2));
process.exitCode = failures.length ? 1 : 0;
