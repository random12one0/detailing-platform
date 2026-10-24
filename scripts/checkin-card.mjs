// ROADMAP 97.55 - THE VEHICLE CHECK-IN CARD ON THE CUSTOMER'S RECEIPT LINK, IN A REAL BROWSER.
//
//   node scripts/checkin-card.mjs                 # dev server, no credentials, writes nothing to any database
//   node scripts/checkin-card.mjs --break=unsaved # the server "forgets" the tick: must go red
//   BASE_URL=http://127.0.0.1:5180 node scripts/checkin-card.mjs
//
// EVERY ANSWER IS FAKED IN THE PAGE with page.route(): `get-booking-receipt` and
// `acknowledge-checkin` are stubbed, so nothing is written anywhere. Three booking
// situations at four widths (320, 390, 768, 1440):
//   open    - live booking, 2 damage photos, not yet ticked. The Confirm button must
//             be disabled until the box is ticked, then press once and send exactly one
//             request naming this booking, then the card must read "Confirmed <time>".
//   none    - live booking, 0 damage photos: says no marks were recorded.
//   cancel  - cancelled booking: NO check-in card at all (nothing is arriving).
// Each also asks: no sideways scroll, the box and button are 44px tall or taller
// (hit area), console clean. Screenshots land in .manager-shots/97.55/.
//
// The job record's "Customer confirmed ..." line needs the demo owner's login (a
// credential this script never loads); it is covered by tests/damage-checkin.test.mjs
// for the rule and is NOT browser-checked here - the receipt names that as UNJUDGEABLE.
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { writeReceipt } from "./receipt.mjs";

const REPO = process.cwd();
const { chromium } = createRequire(import.meta.url)(join(REPO, "app/node_modules/playwright/index.js"));
const BASE = process.env.BASE_URL || "http://localhost:5173";
const BREAK = (process.argv.find((a) => a.startsWith("--break=")) ?? "").slice(8);
const OUT = join(REPO, ".manager-shots/97.55");
mkdirSync(OUT, { recursive: true });
const CORS = { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "*", "content-type": "application/json" };
const future = (d) => new Date(Date.now() + d * 864e5).toISOString();
const started_at = new Date().toISOString();

const WIDTHS = [[320, 700], [390, 844], [768, 1024], [1440, 900]];
const SCENES = ["open", "none", "cancel"];
const EXPECTED = WIDTHS.length * SCENES.length;
const ID = "00000000-0000-4000-8000-000000000055";

const receipt = ({ status, marks, ackAt }) => ({
  booking: {
    id: ID, status, service_type: "Full detail", services: [{ name: "Full detail", price: 220 }], add_ons: [], vehicles: [],
    vehicle_model: "2019 Honda Civic", booking_date: future(6).slice(0, 10), start_time: "10:00", end_time: "13:00",
    start_at: future(6), end_at: future(6.12), customer_name: "Dana Whitfield", customer_email: "dana@example.com",
    customer_phone: "5035550100", total_amount: 220, damage_ack_at: ackAt, damage_photo_count: marks,
  },
  business: { slug: "demo-detail", name: "Demo Detail", phone: "5035550100", email: "hello@example.com", cancellation_window_hours: 24 },
  group: [], card: null,
});

const failures = [];
const consoleBad = [];
const fail = (scene, w, why) => failures.push(`${scene}@${w}: ${why}`);
let assertions = 0;
const ok = (cond, scene, w, why) => { assertions++; if (!cond) fail(scene, w, why); return cond; };

const cardOf = (page) => page.locator(".bk-card", { has: page.locator(".bk-step-label", { hasText: /^Vehicle check-in$/ }) });

const browser = await chromium.launch();
const done = [];
for (const [w, h] of WIDTHS) {
  for (const scene of SCENES) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h } });
    const page = await ctx.newPage();
    page.on("console", (m) => { if (["error", "warning"].includes(m.type())) consoleBad.push(`${scene}@${w}: ${m.type()} ${m.text().slice(0, 160)}`); });
    page.on("pageerror", (e) => consoleBad.push(`${scene}@${w}: pageerror ${String(e).slice(0, 160)}`));
    let ackAt = null;
    const posts = [];
    await page.route("**/functions/v1/get-booking-receipt**", (r) => {
      if (r.request().method() === "OPTIONS") return r.fulfill({ status: 204, headers: CORS });
      const status = scene === "cancel" ? "cancelled" : "confirmed";
      return r.fulfill({ status: 200, headers: CORS, body: JSON.stringify(receipt({ status, marks: scene === "none" ? 0 : 2, ackAt })) });
    });
    await page.route("**/functions/v1/acknowledge-checkin**", (r) => {
      if (r.request().method() === "OPTIONS") return r.fulfill({ status: 204, headers: CORS });
      posts.push(r.request().postDataJSON());
      // --break=unsaved: the server answers success but stores nothing.
      if (BREAK !== "unsaved") ackAt = new Date().toISOString();
      return r.fulfill({ status: 200, headers: CORS, body: JSON.stringify({ success: true, damage_ack_at: ackAt }) });
    });
    await page.goto(`${BASE}/booking/${ID}`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector(".bk-card", { timeout: 20000 });
    await page.waitForTimeout(600);
    const card = cardOf(page);

    if (scene === "cancel") {
      ok(await card.count() === 0, scene, w, "a cancelled booking still offers the check-in card");
    } else {
      if (ok(await card.count() === 1, scene, w, "the Vehicle check-in card is missing")) {
        const text = await card.innerText();
        ok(scene === "open" ? /recorded before the job: 2/i.test(text) : /No existing marks/i.test(text), scene, w, `wrong marks sentence: ${text.slice(0, 80)}`);
        const btn = card.getByRole("button", { name: "Confirm check-in" });
        const box = card.locator("input[type=checkbox]");
        ok(await btn.isDisabled(), scene, w, "Confirm is enabled before the box is ticked");
        const bb = await btn.boundingBox();
        ok(bb && bb.height >= 44, scene, w, `Confirm is ${bb?.height}px tall, under 44`);
        const lb = await card.locator("label").boundingBox();
        ok(lb && lb.height >= 44, scene, w, `the tick row is ${lb?.height}px tall, under 44`);
        if (scene === "open") {
          await page.screenshot({ path: join(OUT, `open-${w}.png`), fullPage: true });
          await box.check();
          ok(await btn.isEnabled(), scene, w, "Confirm stays disabled after ticking");
          await btn.click();
          await page.waitForTimeout(900);
          ok(posts.length === 1 && posts[0].booking_id === ID, scene, w, `expected one request naming the booking, saw ${JSON.stringify(posts)}`);
          const after = await cardOf(page).innerText();
          ok(/Confirmed .+\. Thank you\./.test(after) && await cardOf(page).locator("input[type=checkbox]").count() === 0, scene, w, `no Confirmed line after the press: ${after.slice(0, 100)}`);
          await page.screenshot({ path: join(OUT, `confirmed-${w}.png`), fullPage: true });
        } else {
          await page.screenshot({ path: join(OUT, `${scene}-${w}.png`), fullPage: true });
        }
      }
    }
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    ok(overflow <= 0, scene, w, `page scrolls sideways by ${overflow}px`);
    done.push(`${scene}@${w}`);
    await ctx.close();
  }
}

// CANARY: a detector that reads "the card is there" must read it ABSENT on a page that has no card.
// It runs on a blank page, and has to say so, or the cancelled-booking assertion above means nothing.
const blank = await (await browser.newContext()).newPage();
await blank.setContent("<div class='bk-card'><div class='bk-step-label'>Your booking</div></div>");
const canarySeen = (await cardOf(blank).count()) === 0;
await browser.close();

for (const c of consoleBad) failures.push(`console: ${c}`);
const { path } = writeReceipt({
  check_id: "checkin-card", started_at, status: failures.length === 0 ? "pass" : "fail",
  expected_targets: EXPECTED, discovered_targets: done.length, attempted_targets: done.length, completed_targets: done.length, skipped_targets: 0,
  assertions_executed: assertions, min_assertions: EXPECTED * 3, failures,
  artifacts: [".manager-shots/97.55/"], warnings: [],
  unjudgeable: ["the job record's 'Customer confirmed the vehicle check-in' line: needs the demo owner's login, which this script never loads"],
  dimensions: { widths: "320, 390, 768, 1440", scenes: SCENES.join(", "), ...(BREAK ? { break: BREAK } : {}) },
  canary: { id: "a page with no check-in card must read as card-absent", observed_failure: canarySeen, caught_by: ["cardOf().count() === 0"], findings: [canarySeen ? "absent on a card-less page, as required" : "detector sees a card where there is none"] },
});
console.log(failures.length ? failures.join("\n") : `PASS ${done.length}/${EXPECTED} scenes, ${assertions} assertions`);
console.log(`receipt ${path}`);
process.exit(failures.length ? 1 : 0);
