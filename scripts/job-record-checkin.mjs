// ROADMAP 97.55 - THE JOB RECORD'S CHECK-IN LINE, IN A REAL BROWSER.
//
//   node scripts/job-record-checkin.mjs                # needs the app's dev server; NO credentials, nothing written anywhere
//   node scripts/job-record-checkin.mjs --break=drop   # the record loses its tick time: must go red
//   BASE_URL=http://127.0.0.1:5180 node scripts/job-record-checkin.mjs
//
// The job record sits behind the detailer's login, which this script never loads. So it mounts the REAL
// `BookingDetail.jsx` on a throwaway page (`app/look-97-55.html`, written here and deleted at the end) with
// two things stood in for: the business context module (answered by page.route with a fixed business) and
// every network call (`rest/v1/*` answered with an empty list, `functions/v1/*` with `{}`). The line under
// test is the real one, drawn by the real component from the real shared rule.
//
// Two jobs at four widths (320, 390, 768, 1440):
//   ticked   `damage_ack_at` set: the line reads "Customer confirmed the vehicle check-in <time>." and the
//            "not confirmed yet" sentence is absent
//   unticked `damage_ack_at` null: the line reads "The customer has not confirmed the vehicle check-in yet."
// Each also asks whether the line sits inside the viewport sideways, is painted (non-empty box, text visible
// colour), and whether the page scrolls sideways. Console errors from the stubbed network are counted and
// named, never hidden: the stubs answer in the shapes the component reads, so any listed is a finding.
import { createRequire } from "node:module";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { writeReceipt } from "./receipt.mjs";

const REPO = process.cwd();
const { chromium } = createRequire(import.meta.url)(join(REPO, "app/node_modules/playwright/index.js"));
const BASE = process.env.BASE_URL || "http://localhost:5173";
const BREAK = (process.argv.find((a) => a.startsWith("--break=")) ?? "").slice(8);
if (BREAK && BREAK !== "drop") { console.error(`unknown --break=${BREAK}`); process.exit(2); }
const OUT = join(REPO, ".manager-shots/97.55");
mkdirSync(OUT, { recursive: true });
const PAGE = join(REPO, "app/look-97-55.html");
const ENTRY = join(REPO, "app/look-97-55.jsx");
const started_at = new Date().toISOString();
const future = (d) => new Date(Date.now() + d * 864e5).toISOString();
const ACK_AT = new Date(Date.now() - 3600e3).toISOString();

writeFileSync(PAGE, `<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head><body><div id="root"></div><script type="module" src="/look-97-55.jsx"></script></body></html>`);
writeFileSync(ENTRY, `import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "/src/theme.css";
import BookingDetail from "/src/components/BookingDetail.jsx";
ReactDOM.createRoot(document.getElementById("root")).render(
  <BrowserRouter><BookingDetail booking={window.__BOOKING__} onClose={() => {}} onChanged={() => {}} /></BrowserRouter>
);
`);

const CORS = { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "*", "content-type": "application/json" };
const booking = (ackAt) => ({
  id: "00000000-0000-4000-8000-000000000055", business_id: "biz", status: "confirmed", service_type: "mobile", payment_status: "unpaid",
  customer_name: "Dana Whitfield", customer_email: "dana@example.com", customer_phone: "5035550100",
  customer_address: "1450 Marina Blvd, Long Beach, CA", booking_date: future(6).slice(0, 10), start_time: "10:00", end_time: "13:00",
  start_at: future(6), end_at: future(6.12), total_amount: 220, vehicle_model: "2019 Honda Civic", vehicle_size: "sedan",
  services: [{ name_at_booking: "Full detail", price_at_booking: 220 }], add_ons: [], vehicles: [],
  customer_notes: null, admin_notes: null, damage_ack_at: BREAK === "drop" ? null : ackAt,
});
const BUSINESS = { id: "biz", name: "Demo Detail", slug: "demo-detail", timezone: "America/Los_Angeles", currency: "usd", contact_phone: "5035550100" };
const CTX = `export const useBusiness = () => ({ business: ${JSON.stringify(BUSINESS)}, siteOrigin: "https://detailingplatform.com", can: () => true, role: "owner", settings: {} });
export const BusinessProvider = ({ children }) => children;`;

const SCENES = [["ticked", ACK_AT], ["unticked", null]];
const WIDTHS = [[320, 700], [390, 844], [768, 1024], [1440, 900]];
const EXPECTED = SCENES.length * WIDTHS.length;
const TICKED = /Customer confirmed the vehicle check-in .+\./;
const UNTICKED = "The customer has not confirmed the vehicle check-in yet.";
const failures = [], notes = [], done = [];
let assertions = 0;
const ok = (c, s, w, why) => { assertions++; if (!c) failures.push(`${s}@${w}: ${why}`); return c; };

const browser = await chromium.launch();
try {
  for (const [w, h] of WIDTHS) {
    for (const [scene, ackAt] of SCENES) {
      const ctx = await browser.newContext({ viewport: { width: w, height: h } });
      const page = await ctx.newPage();
      const errs = [];
      page.on("console", (m) => { if (["error", "warning"].includes(m.type())) errs.push(`${m.type()} ${m.text().slice(0, 140)}`); });
      page.on("pageerror", (e) => errs.push(`pageerror ${String(e).slice(0, 140)}`));
      await page.addInitScript((b) => { window.__BOOKING__ = b; }, booking(ackAt));
      await page.route("**/src/context/BusinessContext.jsx*", (r) => r.fulfill({ status: 200, contentType: "text/javascript", body: CTX }));
      await page.route("**/rest/v1/**", (r) => r.request().method() === "OPTIONS" ? r.fulfill({ status: 204, headers: CORS }) : r.fulfill({ status: 200, headers: CORS, body: "[]" }));
      await page.route("**/functions/v1/**", (r) => r.request().method() === "OPTIONS" ? r.fulfill({ status: 204, headers: CORS }) : r.fulfill({ status: 200, headers: CORS, body: "{}" }));
      await page.goto(`${BASE}/look-97-55.html`, { waitUntil: "domcontentloaded" });
      await page.waitForFunction(() => document.body.innerText.includes("Dana Whitfield"), null, { timeout: 25000 }).catch(() => {});
      await page.waitForTimeout(700);
      const line = page.locator("p.muted", { hasText: /vehicle check-in/ });
      if (ok(await line.count() === 1, scene, w, `expected one check-in line, found ${await line.count()}`)) {
        const text = (await line.innerText()).trim();
        if (scene === "ticked") ok(TICKED.test(text), scene, w, `ticked job reads "${text}"`);
        else ok(text === UNTICKED, scene, w, `unticked job reads "${text}"`);
        const head = page.locator("h3.section-title", { hasText: /^Vehicle check-in$/ });
        const hb = await head.count() === 1 ? await head.boundingBox() : null;
        const lb0 = await line.boundingBox();
        ok(hb && lb0 && hb.y < lb0.y, scene, w, "the Vehicle check-in heading is missing or not above the line");
        const box = await line.boundingBox();
        ok(box && box.width > 0 && box.height > 0 && box.x >= 0 && box.x + box.width <= w + 0.5, scene, w, `the line is cut by an edge: ${JSON.stringify(box)}`);
        const color = await line.evaluate((e) => getComputedStyle(e).color);
        ok(!/rgba?\(\d+, \d+, \d+, 0\)/.test(color), scene, w, `the line is painted transparent: ${color}`);
        await line.scrollIntoViewIfNeeded();
        await page.screenshot({ path: join(OUT, `job-${scene}-${w}.png`) });
      }
      const body = await page.evaluate(() => document.body.innerText);
      if (scene === "ticked") ok(!body.includes(UNTICKED), scene, w, "the ticked job also says it is not confirmed");
      else ok(!TICKED.test(body), scene, w, "the unticked job says it was confirmed");
      ok(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth) <= 0, scene, w, "the page scrolls sideways");
      if (errs.length) notes.push(`${scene}@${w}: ${errs.length} console message(s): ${[...new Set(errs)].slice(0, 3).join(" | ")}`);
      done.push(`${scene}@${w}`);
      await ctx.close();
    }
  }
} finally {
  await browser.close();
  rmSync(PAGE, { force: true });
  rmSync(ENTRY, { force: true });
}

const { path } = writeReceipt({
  check_id: "job-record-checkin", started_at, status: failures.length === 0 ? "pass" : "fail",
  expected_targets: EXPECTED, discovered_targets: done.length, attempted_targets: done.length, completed_targets: done.length, skipped_targets: 0,
  assertions_executed: assertions, min_assertions: EXPECTED * 4, failures,
  artifacts: [".manager-shots/97.55/"], warnings: notes,
  dimensions: { widths: "320, 390, 768, 1440", scenes: SCENES.map((s) => s[0]).join(", "), ...(BREAK ? { break: BREAK } : {}) },
  canary: { id: "the ticked detector must not read the not-confirmed sentence as ticked", observed_failure: !TICKED.test(UNTICKED) && TICKED.test("Customer confirmed the vehicle check-in Oct 24, 9:43 AM."), caught_by: ["TICKED regexp on the line text"], findings: ["not-confirmed sentence read as unticked; confirmed sentence read as ticked"] },
});
console.log(failures.length ? failures.join("\n") : `PASS ${done.length}/${EXPECTED} scenes, ${assertions} assertions`);
for (const n of notes) console.log(`note: ${n}`);
console.log(`receipt ${path}`);
process.exit(failures.length ? 1 : 0);
