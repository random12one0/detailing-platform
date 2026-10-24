// ROADMAP 97.55 - THE JOB RECORD'S CHECK-IN LINE, IN A REAL BROWSER.
//
//   node scripts/job-record-checkin.mjs                # needs the app's dev server; NO credentials, nothing written anywhere
//   node scripts/job-record-checkin.mjs --break=drop   # the record loses its tick time: must go red
//   node scripts/job-record-checkin.mjs --break=uncounted # the page is served the OLD record (no saved count, no
//                                                       # "added after" note): ticked and later must go red
//   BASE_URL=http://127.0.0.1:5180 node scripts/job-record-checkin.mjs
//
// The job record sits behind the detailer's login, which this script never loads. So it mounts the REAL
// `BookingDetail.jsx` on a throwaway page (`app/look-97-55.html`, written here and deleted at the end) with
// two things stood in for: the business context module (answered by page.route with a fixed business) and
// every network call (`rest/v1/*` answered with an empty list, `functions/v1/*` with `{}`). The line under
// test is the real one, drawn by the real component from the real shared rule.
//
// Three jobs at four widths (320, 390, 768, 1440):
//   ticked   `damage_ack_at` set, 2 damage photos confirmed and 2 on the job: the line reads "Customer confirmed
//            the vehicle check-in <time>. Damage photos they confirmed: 2.", the "not confirmed yet" sentence is
//            absent, and the photo section has NO "added after" note
//   later    the same tick, and a third damage photo taken an hour AFTER it (finish review 2026-10-24: the
//            record used to read as though the customer confirmed all three): the line still says 2, and the
//            photo section says "Added after the customer confirmed the check-in: 1."
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
if (BREAK && !["drop", "uncounted"].includes(BREAK)) { console.error(`unknown --break=${BREAK}`); process.exit(2); }
// --break=uncounted blanks the two new sentences in the PRODUCTION modules as the browser loads them.
const UNCOUNT = { "BookingDetail.jsx": "Damage photos they confirmed: {count}.", "JobPhotos.jsx": "Added after the customer confirmed the check-in: {count}." };
let uncounted = 0;
const SHOTS = `.manager-shots/97.55${BREAK ? `/break-${BREAK}` : ""}`; // a sabotage run never overwrites the clean shots
const OUT = join(REPO, SHOTS);
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
  customer_notes: null, admin_notes: null, damage_ack_at: BREAK === "drop" ? null : ackAt, damage_ack_photo_count: ackAt ? 2 : null,
});
const photo = (n, at) => ({ id: `p${n}`, business_id: "biz", booking_id: "00000000-0000-4000-8000-000000000055", kind: "damage", path: `biz/x/p${n}.jpg`, bytes: 1000, created_at: at });
const shift = (ms) => new Date(Date.parse(ACK_AT) + ms).toISOString();
const PHOTOS = {
  ticked: [photo(1, shift(-600e3)), photo(2, shift(-500e3))],
  later: [photo(1, shift(-600e3)), photo(2, shift(-500e3)), photo(3, shift(3600e3))],
  unticked: [],
};
const BUSINESS = { id: "biz", name: "Demo Detail", slug: "demo-detail", timezone: "America/Los_Angeles", currency: "usd", contact_phone: "5035550100" };
const CTX = `export const useBusiness = () => ({ business: ${JSON.stringify(BUSINESS)}, siteOrigin: "https://detailingplatform.com", can: () => true, role: "owner", settings: {} });
export const BusinessProvider = ({ children }) => children;`;

const SCENES = [["ticked", ACK_AT], ["later", ACK_AT], ["unticked", null]];
const WIDTHS = [[320, 700], [390, 844], [768, 1024], [1440, 900]];
const EXPECTED = SCENES.length * WIDTHS.length;
const TICKED = /Customer confirmed the vehicle check-in .+\./;
const COUNTED = /Damage photos they confirmed: 2\.$/;
const LATER = "Added after the customer confirmed the check-in: 1.";
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
      await page.route("**/rest/v1/**", (r) => r.request().method() === "OPTIONS" ? r.fulfill({ status: 204, headers: CORS }) : r.fulfill({ status: 200, headers: CORS, body: r.request().url().includes("/rest/v1/job_photos") ? JSON.stringify(PHOTOS[scene]) : "[]" }));
      // The photo door answers `urls` in the shape `readUrls` accepts, so the photo section draws without an error box.
      await page.route("**/functions/v1/**", (r) => r.request().method() === "OPTIONS" ? r.fulfill({ status: 204, headers: CORS }) : r.fulfill({ status: 200, headers: CORS, body: JSON.stringify({ urls: {} }) }));
      if (BREAK === "uncounted") {
        for (const [file, text] of Object.entries(UNCOUNT)) {
          await page.route(`**/src/components/${file}*`, async (r) => {
            const res = await r.fetch();
            const src = await res.text();
            // The patch must land, or a red here proves nothing (docs/gotchas.md 102).
            if (src.split(text).length !== 2) { console.error(`--break=uncounted did not land in ${file}`); process.exit(2); }
            uncounted++;
            return r.fulfill({ response: res, body: src.replace(text, "") });
          });
        }
      }
      await page.goto(`${BASE}/look-97-55.html`, { waitUntil: "domcontentloaded" });
      await page.waitForFunction(() => document.body.textContent.includes("Vehicle check-in"), null, { timeout: 25000 }).catch(() => {}); // textContent: the heading is uppercased by CSS (docs/gotchas.md 115)
      await page.waitForTimeout(700);
      const line = page.locator("p.muted", { hasText: /vehicle check-in/ });
      if (ok(await line.count() === 1, scene, w, `expected one check-in line, found ${await line.count()}`)) {
        const text = (await line.innerText()).trim();
        if (scene !== "unticked") ok(TICKED.test(text) && COUNTED.test(text), scene, w, `ticked job reads "${text}" (must name the 2 photos the tick covered)`);
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
      if (scene !== "unticked") ok(!body.includes(UNTICKED), scene, w, "the ticked job also says it is not confirmed");
      else ok(!TICKED.test(body), scene, w, "the unticked job says it was confirmed");
      const laterNote = page.locator("p.quiet", { hasText: /^Added after the customer confirmed/ });
      if (scene === "later") {
        if (ok(await laterNote.count() === 1 && (await laterNote.textContent()).trim() === LATER, scene, w, "the photo taken after the tick is not flagged as added after")) {
          const lb = await laterNote.boundingBox();
          ok(lb && lb.width > 0 && lb.x >= 0 && lb.x + lb.width <= w + 0.5, scene, w, `the added-after note is cut by an edge: ${JSON.stringify(lb)}`);
          await laterNote.scrollIntoViewIfNeeded();
          await page.screenshot({ path: join(OUT, `job-${scene}-photos-${w}.png`) });
        }
      } else ok(await laterNote.count() === 0, scene, w, "an added-after note shows on a job with no photo taken after the tick");
      const errorBox = await page.locator(".error-box").count();
      ok(errorBox === 0, scene, w, `the record shows ${errorBox} error box(es)`);
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
  artifacts: [`${SHOTS}/`], warnings: BREAK === "uncounted" ? [...notes, `the production modules were rewritten ${uncounted} time(s)`] : notes,
  dimensions: { widths: "320, 390, 768, 1440", scenes: SCENES.map((s) => s[0]).join(", "), ...(BREAK ? { break: BREAK } : {}) },
  canary: { id: "the ticked detector must not read the not-confirmed sentence as ticked", observed_failure: !TICKED.test(UNTICKED) && TICKED.test("Customer confirmed the vehicle check-in Oct 24, 9:43 AM."), caught_by: ["TICKED regexp on the line text"], findings: ["not-confirmed sentence read as unticked; confirmed sentence read as ticked"] },
});
console.log(failures.length ? failures.join("\n") : `PASS ${done.length}/${EXPECTED} scenes, ${assertions} assertions`);
for (const n of notes) console.log(`note: ${n}`);
console.log(`receipt ${path}`);
process.exit(failures.length ? 1 : 0);
