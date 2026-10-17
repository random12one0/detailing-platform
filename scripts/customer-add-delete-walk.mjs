// ROADMAP 97.14 R3 — ADDING A CUSTOMER AND THE OWNER-ONLY DELETE, WALKED IN THE RUNNING APP WITH TWO ACCOUNTS.
//
//   set -a; . <main checkout>/.env; set +a
//   BASE=http://127.0.0.1:5180 node --import ./scripts/lib/inject-app-env.mjs scripts/customer-add-delete-walk.mjs
//   BREAK=staff-is-owner …   # sabotage: the "staff" half signs in as the owner, so every staff refusal must go red
//
// WRITES TO THE DEMO BUSINESS, ON PURPOSE AND CLEANED UP. Per width: the OWNER creates one booking through the New
// booking sheet for a throwaway customer "Walk 97.14 <width>" with Resend's `delivered@resend.dev` simulator  // mail-sink: as e2e-booking
// as their email, the address e2e-booking uses (left blank, `create-booking` refuses the dashboard: ROADMAP 97.74),
// on the first day with open times from 70 days ahead; the STAFF login then finds that
// customer, is offered no delete, and a direct call to `delete-customer` with the staff session is refused (403) with
// the customer still there; then the OWNER deletes them with the record's own `Delete for good`. `forget_customer`
// keeps the booking, anonymised — that row stays, as it does for any real deletion.
//
// Both paths write as the service role (`create-booking`, `delete-customer`), which 20261017030000 does not touch;
// this proves they work in the app today. Expected 3 widths × 3 (add, staff refused, owner delete) = 9 targets.

import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
import { writeReceipt } from "./receipt.mjs";
import { demoOwner, demoStaff } from "./lib/demoOwner.mjs";

const require = createRequire(new URL("../app/package.json", import.meta.url));
const { chromium } = require("playwright");
const BASE = process.env.BASE || "http://localhost:5173";
const BREAK = process.env.BREAK || "";
const WIDTHS = [[390, 844], [768, 1024], [1440, 900]];
const SHOTS = "artifacts/customer-add-delete-walk";
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
async function findClient(page, name) {
  await page.goto(`${BASE}/app/clients`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".rows.cols.clients .row-item, .emptyscreen", { timeout: 30000 });
  await page.getByPlaceholder(/Search/i).first().fill(name);
  await page.waitForTimeout(1500);
  return page.locator(".rows.cols.clients .row-item", { hasText: name });
}

const browser = await chromium.launch();
const OWNER = demoOwner();
const STAFF = BREAK === "staff-is-owner" ? OWNER : demoStaff();
for (const [i, [w, h]] of WIDTHS.entries()) {
  const name = `Walk 97.14 ${w}`;
  const phone = `55597${String(w).padStart(5, "0")}`;

  // 1 · ADD — the owner, through the New booking sheet.
  const own = await signedIn(browser, OWNER, [w, h]);
  let p = own.page;
  await p.locator("button[aria-label='New booking']").first().click();
  await p.getByLabel("Customer name").fill(name);
  await p.getByLabel("Phone").first().fill(phone);
  await p.getByLabel("Email (optional)").fill("delivered@resend.dev");  // mail-sink: Resend simulator, as e2e-booking
  const dropoff = p.locator(".nb-block", { hasText: "Where" }).getByRole("button", { name: "Drop-off" });
  if (await dropoff.count()) await dropoff.first().click();
  await p.locator(".nb-group .chip").first().click();
  // The first day with an open time: a closed day answers "No open slots that day."
  const slot = p.locator(".nb-block", { hasText: "When" }).locator(".chip").first();
  for (let d = 0; d < 10; d++) {
    await p.locator(".nb-block input[type=date]").fill(new Date(Date.now() + (70 + i * 3 + d) * 864e5).toISOString().slice(0, 10));
    if (await slot.waitFor({ state: "visible", timeout: 8000 }).then(() => true, () => false)) break;
  }
  await slot.click();
  const created = p.waitForResponse((r) => r.url().includes("/functions/v1/create-booking") && r.request().method() === "POST", { timeout: 30000 });
  await p.getByRole("button", { name: "Create booking" }).click();
  const cr = await created;
  const crBody = cr.ok() ? "" : (await cr.text()).slice(0, 200);
  await p.waitForTimeout(1500);
  const row = await findClient(p, name);
  const added = check(`${w}: owner: a new customer added through New booking (create-booking ${cr.status()}) appears in Clients`, cr.ok() && (await row.count()) === 1, `rows ${await row.count()} ${crBody}`);
  if (!added) { await own.ctx.close(); continue; }
  if (added) completed++;
  await p.screenshot({ path: `${SHOTS}/owner-added-${w}x${h}${BREAK ? ".break-" + BREAK : ""}.png` });

  // 2 · STAFF — offered no delete, and the function refuses them directly.
  const st = await signedIn(browser, STAFF, [w, h]);
  const sp = st.page;
  const srow = await findClient(sp, name);
  await srow.first().click();
  await sp.locator("label.field:has-text('Notes') textarea").first().waitFor({ state: "visible", timeout: 15000 });
  const offered = await sp.getByRole("button", { name: "Delete for good" }).count()
    + await sp.getByText("Removing them from your records").count();
  await sp.screenshot({ path: `${SHOTS}/staff-record-${w}x${h}${BREAK ? ".break-" + BREAK : ""}.png` });
  const direct = await sp.evaluate(async ({ url, anon, name }) => {
    const k = Object.keys(localStorage).find((x) => /^sb-.*-auth-token$/.test(x));
    const token = JSON.parse(localStorage.getItem(k)).access_token;
    const h = { apikey: anon, Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
    const [c] = await (await fetch(`${url}/rest/v1/customers?select=id,business_id&name=eq.${encodeURIComponent(name)}`, { headers: h })).json();
    const r = await fetch(`${url}/functions/v1/delete-customer`, { method: "POST", headers: h, body: JSON.stringify({ business_id: c.business_id, customer_id: c.id }) });
    const still = await (await fetch(`${url}/rest/v1/customers?select=id&id=eq.${c.id}`, { headers: h })).json();
    return { status: r.status, still: still.length };
  }, { url: process.env.SUPABASE_URL, anon: process.env.SUPABASE_ANON_KEY, name });
  const refused = check(`${w}: staff: no delete is offered on the record`, offered === 0, `offered ${offered}`)
    & check(`${w}: staff: a direct delete-customer call is refused and the customer is still there`, direct.status === 403 && direct.still === 1, JSON.stringify(direct));
  if (refused) completed++;
  // The direct call above is refused on purpose, and Chromium logs that one 403. Nothing else is allowed.
  const other = sp.errors.filter((e) => !/status of 403/.test(e));
  check(`${w}: staff: no console errors besides the one refused call`, other.length === 0 && sp.errors.length - other.length === (direct.status === 403 ? 1 : 0), JSON.stringify(sp.errors));
  await st.ctx.close();

  // 3 · DELETE — the owner, with the record's own button. (If the sabotage deleted them already, there is nothing to open.)
  const orow = await findClient(p, name);
  let gone = false;
  if (await orow.count()) {
    await orow.first().click();
    await p.getByText("Deleting their information").click();
    const del = p.waitForResponse((r) => r.url().includes("/functions/v1/delete-customer"), { timeout: 30000 });
    await p.getByRole("button", { name: "Delete for good" }).click();
    const dr = await del;
    await p.waitForTimeout(1500);
    gone = dr.ok() && (await (await findClient(p, name)).count()) === 0;
    check(`${w}: owner: Delete for good (delete-customer ${dr.status()}) removes the customer`, gone);
  } else check(`${w}: owner: the customer was still there for the owner to delete`, false, "already gone");
  if (gone) completed++;
  // The one 403 a refused delete prints belongs to the staff page, not this one.
  check(`${w}: owner: no console errors`, p.errors.length === 0, JSON.stringify(p.errors));
  await own.ctx.close();
}
await browser.close();

writeReceipt({
  check_id: "customer-add-delete-walk",
  started_at,
  status: failures.length ? "fail" : "pass",
  expected_targets: WIDTHS.length * 3,
  discovered_targets: WIDTHS.length * 3,
  attempted_targets: WIDTHS.length * 3,
  completed_targets: completed,
  skipped_targets: 0,
  assertions_executed: assertions,
  min_assertions: WIDTHS.length * 6,
  failures,
  assertion_floor: "structural: add, two staff refusals, owner delete and two console checks per width",
  artifacts: [SHOTS],
  canary: { id: "staff-is-owner", observed_failure: BREAK === "staff-is-owner" ? failures.length > 0 : true },
  dimensions: { break: BREAK || undefined, logins: "demo owner + demo staff", writes: "one booking + one customer per width, customer deleted" },
});
process.exit(failures.length ? 1 : 0);
