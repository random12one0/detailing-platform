// ROADMAP 97.74 — THE DASHBOARD'S NEW BOOKING WITH NO EMAIL, AND THE PUBLIC PAGE STILL REFUSING ONE.
//
//   set -a; . <main checkout>/.env; set +a
//   BASE=http://127.0.0.1:5180 node --import ./scripts/lib/inject-app-env.mjs scripts/new-booking-no-email.mjs
//   BREAK=no-session …   # sabotage: strips the session off the sheet's create-booking call — the original defect,
//                        # so every owner booking must come back 400 "Customer email is required" and go red
//
// Per width (390, 768, 1440) the demo OWNER (and the demo STAFF login at 390) fills the New booking sheet with a name, a phone and a private note and
// NO email, Drop-off, the first service and the first open time from 80 days ahead, and presses Create booking. Asked:
// create-booking answered 200, the row exists with no email, is `confirmed`, and kept the private note (the note is a
// member-only field, so it is the evidence the server saw a member, not a stranger), no error is shown and the console
// is clean. Then, once, a call shaped exactly like the public booking page's — the same body with a fresh phone, the
// anon key and NO session — must still be refused 400 "Customer email is required".
//
// WRITES TO THE DEMO BUSINESS, ON PURPOSE AND CLEANED UP: each booking is soft-deleted (`update-booking`) and its
// throwaway customer "NoEmail 97.74 <width>" removed (`delete-customer`) with the owner's own session. No email is
// given, so no customer email is sent. Expected targets: 3 owner widths + staff at 390 + 1 public refusal = 5.
//
// FREEZE=before|after with FREEZE_TOOL=<path to belt freeze.mjs> and FREEZE_OUT=<dir> saves the 390 result as a
// Before/After review page (the belt's review aid; nothing in the check depends on it).

import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { writeReceipt } from "./receipt.mjs";
import { demoOwner, demoStaff } from "./lib/demoOwner.mjs";

const require = createRequire(new URL("../app/package.json", import.meta.url));
const { chromium } = require("playwright");
const BASE = process.env.BASE || "http://localhost:5173";
const BREAK = process.env.BREAK || "";
const FREEZE = process.env.FREEZE || "";
const URL_ = process.env.SUPABASE_URL, ANON = process.env.SUPABASE_ANON_KEY;
if (!URL_ || !ANON) throw new Error("SUPABASE_URL / SUPABASE_ANON_KEY not set — load the root .env first. NOTHING WAS MEASURED.");
const WIDTHS = [[390, 844], [768, 1024], [1440, 900]];
const SHOTS = "artifacts/new-booking-no-email";
const tag = BREAK ? `.break-${BREAK}` : "";
const started_at = new Date().toISOString();
mkdirSync(SHOTS, { recursive: true });

const failures = [];
let assertions = 0, completed = 0;
const check = (name, ok, detail = "") => {
  assertions++;
  console.log(`  ${ok ? "ok  " : "FAIL"}  ${name}${ok ? "" : " " + detail}`);
  if (!ok) failures.push(`${name} ${detail}`.trim());
  return ok;
};

async function signedIn(browser, who, [w, h]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
  if (BREAK === "no-session") {
    await ctx.route(/\/functions\/v1\/create-booking/, (route) => {
      const headers = { ...route.request().headers() };
      delete headers.authorization;
      return route.continue({ headers });
    });
  }
  const page = await ctx.newPage();
  page.errors = [];
  page.on("console", (m) => { if (m.type() === "error") page.errors.push(m.text().slice(0, 160)); });
  page.on("pageerror", (e) => page.errors.push(e.message.slice(0, 160)));
  await page.goto(`${BASE}/app`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("input[type=email]", { timeout: 60000 });
  await page.fill("input[type=email]", who.email);
  await page.fill("input[type=password]", who.password);
  await page.click("form button.btn.primary");
  await page.waitForSelector(".tabbar", { timeout: 30000 });
  await page.evaluate(() => { try { localStorage.setItem("dp.tours", JSON.stringify(["shell", "today", "calendar", "money", "clients", "business"])); localStorage.setItem("dp.tour", "1"); } catch {} });
  return { ctx, page };
}
// The owner's own session, read from the page, for the read-back and the cleanup.
const asOwner = (page, path, init = {}) => page.evaluate(async ({ url, anon, path, init }) => {
  const k = Object.keys(localStorage).find((x) => /^sb-.*-auth-token$/.test(x));
  const token = JSON.parse(localStorage.getItem(k)).access_token;
  const r = await fetch(`${url}${path}`, { ...init, headers: { apikey: anon, Authorization: `Bearer ${token}`, "Content-Type": "application/json" } });
  return { status: r.status, body: await r.json().catch(() => null) };
}, { url: URL_, anon: ANON, path, init });

const freezeTool = FREEZE ? await import(pathToFileURL(process.env.FREEZE_TOOL).href) : null;
const browser = await chromium.launch();
const OWNER = demoOwner();
// The owner at every width, then the STAFF login at 390 — the second account: staff are members too, so they reach
// the same allowances, and a fix keyed on "is the owner" rather than "sent a session" would fail here.
const RUNS = [...WIDTHS.map((size) => ({ role: "owner", who: OWNER, size })), { role: "staff", who: demoStaff(), size: [390, 844] }];
let publicBody = null;
const made = [];
for (const [i, { role, who, size: [w, h] }] of RUNS.entries()) {
  const name = `NoEmail 97.74 ${role} ${w}`;
  const phone = `5557${role === "staff" ? 6 : 4}${String(w).padStart(5, "0")}`;
  const note = `97.74 private note ${role} ${w}`;
  const { ctx, page: p } = await signedIn(browser, who, [w, h]);
  await p.locator("button[aria-label='New booking']").first().click();
  await p.getByLabel("Customer name").fill(name);
  await p.getByLabel("Phone").first().fill(phone);
  const email = p.getByLabel("Email (optional)");
  check(`${w}: ${role}: the sheet's email box is labelled optional and left empty`, (await email.count()) === 1 && (await email.inputValue()) === "");
  await p.locator("label", { hasText: "Private note" }).locator("input").fill(note);
  const dropoff = p.locator(".nb-block", { hasText: "Where" }).getByRole("button", { name: "Drop-off" });
  if (await dropoff.count()) await dropoff.first().click();
  await p.locator(".nb-group .chip").first().click();
  const slot = p.locator(".nb-block", { hasText: "When" }).locator(".chip").first();
  for (let d = 0; d < 10; d++) {
    await p.locator(".nb-block input[type=date]").fill(new Date(Date.now() + (80 + i * 3 + d) * 864e5).toISOString().slice(0, 10));
    if (await slot.waitFor({ state: "visible", timeout: 8000 }).then(() => true, () => false)) break;
  }
  await slot.click();
  const created = p.waitForResponse((r) => r.url().includes("/functions/v1/create-booking") && r.request().method() === "POST", { timeout: 30000 });
  await p.getByRole("button", { name: "Create booking" }).click();
  const cr = await created;
  const sentJwt = /^Bearer /.test(cr.request().headers().authorization || "");
  const sent = cr.request().postDataJSON();
  const body = await cr.json().catch(() => null);
  if (!publicBody) publicBody = sent;
  await p.waitForTimeout(1500);
  const shownError = await p.locator(".error-box").allInnerTexts();
  const id = body?.booking?.id;
  const row = id ? (await asOwner(p, `/rest/v1/bookings?id=eq.${id}&select=status,customer_email,admin_notes,customer_id,business_id`)).body?.[0] : null;
  const ok = check(`${w}: ${role}: New booking with no email -> create-booking ${cr.status()} (session sent: ${sentJwt})`, cr.ok() && !!id, JSON.stringify(body).slice(0, 200))
    & check(`${w}: ${role}: the sheet shows no error`, shownError.length === 0, JSON.stringify(shownError))
    & check(`${w}: ${role}: the booking is saved with no email, confirmed, and kept the private note`,
      !!row && !row.customer_email && row.status === "confirmed" && row.admin_notes === note, JSON.stringify(row));
  if (ok) completed++;
  await p.screenshot({ path: `${SHOTS}/${role}-${w}x${h}${tag}.png` });
  if (freezeTool && role === "owner" && w === 390) {
    const out = `${process.env.FREEZE_OUT}/${FREEZE}.html`;
    if (shownError.length) {
      await freezeTool.freeze(p, { out, label: "Before", highlight: ".error-box",
        note: "The owner typed a name and phone, left \"Email (optional)\" empty, and pressed Create booking: the sheet refuses with \"Customer email is required\"." });
    } else {
      await p.goto(`${BASE}/app/clients`, { waitUntil: "domcontentloaded" });
      await p.waitForSelector(".rows.cols.clients .row-item", { timeout: 30000 });
      await p.getByPlaceholder(/Search/i).first().fill(name);
      await p.waitForTimeout(1500);
      await freezeTool.freeze(p, { out, label: "After", highlightText: name,
        note: "The same booking with no email now goes through: the sheet closed and the new customer is in Clients." });
    }
  }
  check(`${w}: ${role}: no console errors`, p.errors.length === 0, JSON.stringify(p.errors));
  if (row) made.push({ label: `${role} ${w}`, id, ...row });
  await ctx.close();
}

// Cleanup, as the OWNER (staff may not delete a customer): each booking, then its throwaway customer.
if (made.length) {
  const { ctx, page: p } = await signedIn(browser, OWNER, [390, 844]);
  for (const m of made) {
    const sd = await asOwner(p, "/functions/v1/update-booking", { method: "POST", body: JSON.stringify({ business_id: m.business_id, booking_id: m.id, soft_delete: true }) });
    const dc = await asOwner(p, "/functions/v1/delete-customer", { method: "POST", body: JSON.stringify({ business_id: m.business_id, customer_id: m.customer_id }) });
    console.log(`  cleanup ${m.label}: update-booking ${sd.status}, delete-customer ${dc.status}`);
  }
  await ctx.close();
}

// THE PUBLIC HALF — the same body the sheet sent, a fresh phone, no email, the anon key and no session: exactly what
// `/book/:slug` and every tenant site send through the core's transport.
{
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto(`${BASE}/book/demo-detail`, { waitUntil: "domcontentloaded" });
  const r = publicBody ? await page.evaluate(async ({ url, anon, body }) => {
    const res = await fetch(`${url}/functions/v1/create-booking`, { method: "POST", headers: { apikey: anon, "Content-Type": "application/json" }, body: JSON.stringify(body) });
    return { status: res.status, body: await res.json().catch(() => null) };
  }, { url: URL_, anon: ANON, body: { ...publicBody, customer_email: "", admin_notes: null, customer_phone: "5557499999", customer_name: "NoEmail 97.74 public" } }) : null;
  if (check("public: a no-email booking with no session is still refused 400 \"Customer email is required\"",
    r?.status === 400 && r?.body?.error === "Customer email is required", JSON.stringify(r))) completed++;
  await ctx.close();
}
await browser.close();

writeReceipt({
  check_id: "new-booking-no-email",
  started_at,
  status: failures.length ? "fail" : "pass",
  expected_targets: RUNS.length + 1,
  discovered_targets: RUNS.length + 1,
  attempted_targets: RUNS.length + 1,
  completed_targets: completed,
  skipped_targets: 0,
  assertions_executed: assertions,
  min_assertions: RUNS.length * 5 + 1,
  failures,
  assertion_floor: "structural: email empty, 200, no error shown, row saved as a member's, clean console per width; one public refusal",
  artifacts: [SHOTS],
  canary: { id: "no-session", observed_failure: BREAK === "no-session" ? failures.length > 0 : true },
  dimensions: { break: BREAK || undefined, logins: "demo owner + demo staff + anonymous", writes: "one booking + one customer per width, both removed" },
});
process.exit(failures.length ? 1 : 0);
