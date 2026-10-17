// ROADMAP 97.24 — THE JOB RECORD OFFERS THE RIGHT WAY BACK FROM A CANCELLATION.
//
// Opens a real demo job and feeds it, through `page.route` (never a database
// write), as two situations:
//   declined   status cancelled + declined_at — the screen must offer
//              "Accept it after all", which calls `respond-to-booking` with
//              action accept, and must NOT offer "Un-cancel" (update-booking
//              refuses that now).
//   cancelled  a plain cancellation with an email address — "Un-cancel" asks
//              first and says the customer is emailed, then calls
//              `update-booking` with status confirmed.
// Every edge-function call is answered in the browser, so nothing is written.
// Widths 320, 390, 768, 1440 in English, plus 390 in Spanish; console errors
// are read at each. Screenshots land in belt/shots/97.24/png (outside the repo).
//
//   set -a; . ./.env; set +a      (DEMO_OWNER_PW)
//   node scripts/uncancel-screen.mjs [--base=http://127.0.0.1:5180]
//   BREAK=old-screen node scripts/uncancel-screen.mjs   (declined shows Un-cancel again: must go red)
//   FREEZE=before|after node scripts/uncancel-screen.mjs (Andrew's review copies only)

import { mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { demoOwner } from "./lib/demoOwner.mjs";
import { writeReceipt } from "./receipt.mjs";

const require = createRequire(new URL("../app/package.json", import.meta.url));
const { chromium } = require("playwright");
const arg = (n) => process.argv.find((a) => a.startsWith(`--${n}=`))?.split("=").slice(1).join("=");
const BASE = arg("base") || process.env.BASE_URL || "http://localhost:5173";
const BREAK = process.env.BREAK || "";
const FREEZE = process.env.FREEZE || "";
const SHOTS = "C:/Users/rando/Downloads/claude/belt/shots/97.24";
mkdirSync(`${SHOTS}/png`, { recursive: true });
const started_at = new Date().toISOString();

let assertions = 0;
const failures = [];
const check = (name, ok, detail = "") => {
  assertions++;
  if (ok) console.log(`  ok    ${name}`);
  else { failures.push(`${name}${detail ? ` — ${detail}` : ""}`); console.error(`  FAIL  ${name}${detail ? `\n        ${detail}` : ""}`); }
};

const browser = await chromium.launch();
const login = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const lp = await login.newPage();
let jobId = "";
lp.on("response", async (r) => {
  if (jobId || !/\/rest\/v1\/bookings\?/.test(r.url()) || r.request().method() !== "GET") return;
  try {
    const rows = await r.json();
    const row = (Array.isArray(rows) ? rows : [rows]).find((b) => b?.id && b.status === "confirmed" && !b.deleted_at);
    if (row) jobId = row.id;
  } catch {}
});
await lp.goto(`${BASE}/app`, { waitUntil: "domcontentloaded" });
await lp.waitForSelector("input[type=email], .tabbar", { timeout: 90000 });
if (await lp.locator("input[type=email]").count()) {
  await lp.fill("input[type=email]", demoOwner().email ?? "demo@detailplatform.com");
  await lp.fill("input[type=password]", demoOwner().password);
  await lp.click("form button.btn.primary");
  await lp.waitForSelector(".tabbar", { timeout: 30000 });
}
for (let i = 0; i < 40 && !jobId; i++) await lp.waitForTimeout(250);
const state = await login.storageState();
await login.close();
check("a demo job was found to open", !!jobId, "no bookings response carried a confirmed row");

const SITUATIONS = {
  declined: { status: "cancelled", declined_at: "2026-10-16T15:00:00.000Z", customer_email: "maya@example.test" },
  cancelled: { status: "cancelled", declined_at: null, customer_email: "maya@example.test" },
};

async function open(sit, [w, h], lang = "en") {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, storageState: state });
  await ctx.addInitScript((l) => localStorage.setItem("dp.lang.app", l), lang);
  const page = await ctx.newPage();
  const errors = [];
  page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") errors.push(`${m.type()}: ${m.text()}`); });
  page.on("pageerror", (e) => errors.push(String(e)));
  const calls = [];
  await page.route("**/rest/v1/bookings?**", async (route) => {
    if (route.request().method() !== "GET" || !route.request().url().includes(jobId)) return route.continue();
    const res = await route.fetch();
    const body = await res.json().catch(() => null);
    const edit = (b) => (b && b.id === jobId ? { ...b, ...SITUATIONS[sit] } : b);
    await route.fulfill({ response: res, json: Array.isArray(body) ? body.map(edit) : edit(body) });
  });
  // Every write is answered here: nothing reaches the database.
  await page.route("**/functions/v1/{update-booking,respond-to-booking}", async (route) => {
    const fn = route.request().url().split("/functions/v1/")[1];
    calls.push({ fn, body: route.request().postDataJSON() });
    await route.fulfill({ json: { success: true, booking: { id: jobId, status: "confirmed" } } });
  });
  if (BREAK === "old-screen") {
    await page.route("**/src/components/BookingDetail.jsx*", async (route) => {
      const res = await route.fetch();
      const text = await res.text();
      const from = "booking.declined_at ? ";
      if (text.split(from).length !== 2) console.error("BREAK=old-screen did not land");
      await route.fulfill({ response: res, body: text.replace(from, "false ? ") + "\nwindow.__break9724 = true;\n" });
    });
  }
  await page.goto(`${BASE}/job/${jobId}`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".jobbar", { timeout: 30000 });
  await page.waitForTimeout(1200);
  if (BREAK === "old-screen") check(`${sit} ${w} · the sabotage ran in the page`, await page.evaluate(() => window.__break9724 === true));
  return { ctx, page, errors, calls };
}

if (FREEZE && jobId) {
  const { freeze, differs } = await import("file:///C:/Users/rando/Downloads/claude/belt/freeze.mjs");
  const before = FREEZE === "before";
  const { page } = await open("declined", [390, 844]);
  await freeze(page, { out: `${SHOTS}/${FREEZE}.html`, label: before ? "Before" : "After",
    note: before
      ? "A request the detailer declined. The only way back is \"Un-cancel\", which confirms it silently: the customer's last email still says \"we can't make that one\" and nothing tells them otherwise."
      : "The same declined request. The way back is now \"Accept it after all\", which confirms it and emails the customer \"You're confirmed\". A plain cancellation still has \"Un-cancel\", which now asks first and emails the customer that the booking is back on.",
    highlight: before ? null : null, highlightText: before ? "Un-cancel" : "Accept it after all" });
  await page.locator("[data-freeze-look]").first().scrollIntoViewIfNeeded().catch(() => {});
  await page.screenshot({ path: `${SHOTS}/png/${FREEZE}-declined-390x844.png`, fullPage: false });
  if (!before) console.log(`differs: ${await differs(page, `${SHOTS}/before.html`, `${SHOTS}/after.html`)}`);
  await browser.close();
  process.exit(0);
}

const WIDTHS = [[320, 700], [390, 844], [768, 1024], [1440, 900]];
const RUNS = [...WIDTHS.map((s) => ["en", s]), ["es", [390, 844]]];
const EXPECTED = RUNS.length * 2;
let reached = 0;
const T = {
  en: { accept: "Accept it after all", uncancel: "Un-cancel", ask: "back on? The customer is emailed." },
  es: { accept: "Aceptarla después de todo", uncancel: "Descancelar", ask: "Se avisa al cliente por correo." },
};
for (const [lang, size] of jobId ? RUNS : []) {
  const tag = `${lang} ${size[0]}x${size[1]}`;
  const s = T[lang];

  console.log(`\n§ declined · ${tag}`);
  let { ctx, page, errors, calls } = await open("declined", size, lang);
  reached++;
  const accept = page.getByRole("button", { name: s.accept });
  check(`declined ${tag} · "${s.accept}" is offered`, await accept.isVisible().catch(() => false));
  check(`declined ${tag} · "${s.uncancel}" is not`, (await page.getByRole("button", { name: s.uncancel, exact: true }).count()) === 0);
  await page.getByText(s.accept).or(page.getByText(s.uncancel, { exact: true })).first().scrollIntoViewIfNeeded().catch(() => {});
  await page.screenshot({ path: `${SHOTS}/png/${BREAK ? `sabotage-${BREAK}-` : ""}declined-${lang}-${size[0]}x${size[1]}.png` });
  if (await accept.isVisible().catch(() => false)) {
    await accept.click();
    await page.waitForTimeout(800);
    check(`declined ${tag} · it calls respond-to-booking with accept, never update-booking`,
      calls.length === 1 && calls[0].fn === "respond-to-booking" && calls[0].body?.action === "accept", JSON.stringify(calls));
  }
  check(`declined ${tag} · console clean`, errors.length === 0, errors.join(" | ").slice(0, 300));
  await ctx.close();

  console.log(`\n§ cancelled · ${tag}`);
  ({ ctx, page, errors, calls } = await open("cancelled", size, lang));
  reached++;
  const un = page.getByRole("button", { name: s.uncancel, exact: true });
  check(`cancelled ${tag} · "${s.uncancel}" is offered`, await un.isVisible().catch(() => false));
  if (await un.isVisible().catch(() => false)) {
    await un.click();
    await page.waitForTimeout(500);
    check(`cancelled ${tag} · it asks first, saying the customer is emailed`, await page.getByText(s.ask).first().isVisible().catch(() => false));
    check(`cancelled ${tag} · nothing was written before the answer`, calls.length === 0, JSON.stringify(calls));
    await page.getByText(s.ask).first().scrollIntoViewIfNeeded().catch(() => {});
    await page.screenshot({ path: `${SHOTS}/png/${BREAK ? `sabotage-${BREAK}-` : ""}cancelled-asks-${lang}-${size[0]}x${size[1]}.png` });
    const yes = page.getByRole("button", { name: lang === "es" ? "Sí, reactivarlo" : "Yes, put it back on" });
    await yes.click().catch(() => {});
    await page.waitForTimeout(800);
    check(`cancelled ${tag} · the answer calls update-booking with status confirmed`,
      calls.length === 1 && calls[0].fn === "update-booking" && calls[0].body?.status === "confirmed", JSON.stringify(calls));
  }
  check(`cancelled ${tag} · console clean`, errors.length === 0, errors.join(" | ").slice(0, 300));
  await ctx.close();
}
await browser.close();

const failed = failures.length;
console.log(`\n${assertions - failed} passed, ${failed} failed, ${reached} of ${EXPECTED} screens.`);
const { path: receipt } = writeReceipt({
  check_id: "uncancel-screen",
  started_at,
  status: failed || reached !== EXPECTED ? "fail" : "pass",
  expected_targets: EXPECTED,
  discovered_targets: reached,
  attempted_targets: reached,
  completed_targets: reached,
  skipped_targets: 0,
  assertions_executed: assertions,
  min_assertions: 40,
  failures,
  dimensions: { base: BASE, job: jobId, runs: RUNS.map(([l, [w, h]]) => `${l} ${w}x${h}`), ...(BREAK ? { break: BREAK } : {}) },
  artifacts: [`${SHOTS}/png`],
  canary: BREAK ? { id: `break-${BREAK}`, observed_failure: failed > 0 } : { id: "uncancel-absent-on-declined", observed_failure: failed === 0 },
});
console.log(`receipt: ${receipt}`);
process.exitCode = failed || reached !== EXPECTED ? 1 : 0;
