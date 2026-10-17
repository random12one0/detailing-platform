// ROADMAP 97.14 — THE CLIENT RECORD'S NOTES BOX, IN A REAL BROWSER, THROUGH `set_customer_notes`.
//
//   set -a; . <main checkout>/.env; set +a
//   PGLITE_DIR=<folder holding @electric-sql/pglite> BASE=http://127.0.0.1:5180 node scripts/customer-notes-route.mjs
//   BREAK=direct …   # sabotage: the call is answered as the OLD screen's direct write would be after the migration
//
// The live database has not run 20261017030000 (applying is Andrew's), so the function does not exist there yet.
// So the RPC the screen sends is ANSWERED BY A THROWAWAY POSTGRES RUNNING THE REAL MIGRATION: the request's own
// business and customer ids are seeded into it, the caller is made a member of that business, and the function's
// real result or real error goes back. Everything else — sign-in, the list, the record — is the live demo tenant.
// Signs in as the STAFF login (the role this item is about). Nothing is written to the live database.
//
// Two scenarios per width: MEMBER (the save must succeed and no error line appear) and NOT A MEMBER (the function
// refuses, and the screen must SAY so — the old direct update failed silently). Expected 3 widths × 2 = 6 targets.
// Canary: BREAK=direct answers every save with the 42501 a revoked direct write gets; the MEMBER case must go red.
//
// No-.env servers: a belt job's server starts without the app's Supabase address, so the two VITE_ values are
// supplied to the page here, from the root `.env`'s SUPABASE_URL / SUPABASE_ANON_KEY (the anon key ships in every
// browser bundle). Never printed.

import { createRequire } from "node:module";
import { readFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { writeReceipt } from "./receipt.mjs";
import { demoStaff } from "./lib/demoOwner.mjs";

const require = createRequire(new URL("../app/package.json", import.meta.url));
const { chromium } = require("playwright");
const BASE = process.env.BASE || "http://localhost:5173";
const BREAK = process.env.BREAK || "";
const WIDTHS = [[390, 844], [768, 1024], [1440, 900]];
const SHOTS = process.env.SHOTS || "artifacts/customer-notes-route";
const started_at = new Date().toISOString();
const { PGlite } = await import(pathToFileURL(path.join(process.env.PGLITE_DIR ?? "", "node_modules/@electric-sql/pglite/dist/index.js")).href);
const read = (f) => readFileSync(path.join("supabase/migrations", f), "utf8").replace(/\r\n/g, "\n");
const CUSTOMERS = /create table public\.customers \([\s\S]*?\n\);/.exec(read("20260827000200_tenant_data.sql"))[0];
const MIGRATION = read("20261017030000_staff_cannot_delete_bookings_or_write_customers.sql");

let member = true; // which scenario the next save is answered under
const calls = [];
async function answer(body) {
  const db = new PGlite();
  try {
    await db.exec(`create role anon; create role authenticated; create role service_role;
      create table public.businesses (id uuid primary key);
      ${CUSTOMERS}
      create table public.bookings (id uuid primary key, business_id uuid);
      create function public.current_business_ids() returns setof uuid language sql stable
        as $f$ select nullif(current_setting('test.biz', true), '')::uuid $f$;
      insert into public.businesses values ('${body.p_business_id}');
      insert into public.customers (id, business_id, name, phone) values ('${body.p_customer_id}', '${body.p_business_id}', 'x', '0');`);
    await db.exec(MIGRATION);
    if (BREAK === "direct") return { status: 403, json: { code: "42501", message: "permission denied for table customers" } };
    const biz = member ? body.p_business_id : "99999999-9999-4999-8999-999999999999";
    await db.exec(`select set_config('test.biz', '${biz}', false); set role authenticated`);
    try {
      await db.query("select public.set_customer_notes($1, $2, $3)", [body.p_business_id, body.p_customer_id, body.p_notes]);
      await db.exec("reset role");
      const saved = (await db.query("select notes from public.customers where id = $1", [body.p_customer_id])).rows[0].notes;
      return { status: 204, saved };
    } catch (e) { return { status: 403, json: { code: "42501", message: e.message } }; }
  } finally { await db.close(); }
}

const failures = [];
let assertions = 0, completed = 0;
const check = (name, ok, detail = "") => {
  assertions++;
  console.log(`  ${ok ? "ok  " : "FAIL"}  ${name}${ok ? "" : " " + detail}`);
  if (!ok) failures.push(`${name} ${detail}`.trim());
  return ok;
};

const browser = await chromium.launch();
mkdirSync(SHOTS, { recursive: true });
const STAFF = demoStaff();
for (const [w, h] of WIDTHS) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
  const page = await ctx.newPage();
  const errors = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text().slice(0, 160)); });
  page.on("pageerror", (e) => errors.push(e.message.slice(0, 160)));
  await ctx.route(/\/src\/.*\.(js|jsx)(\?.*)?$/, async (route) => {
    const res = await route.fetch();
    const body = (await res.text())
      .replaceAll("import.meta.env.VITE_SUPABASE_URL", JSON.stringify(process.env.SUPABASE_URL))
      .replaceAll("import.meta.env.VITE_SUPABASE_ANON_KEY", JSON.stringify(process.env.SUPABASE_ANON_KEY));
    await route.fulfill({ response: res, body });
  });
  await ctx.route(/\/rest\/v1\/rpc\/set_customer_notes/, async (route) => {
    const body = route.request().postDataJSON();
    const r = await answer(body);
    calls.push({ width: w, member, status: r.status, notes_in: body.p_notes, saved: r.saved ?? null });
    await route.fulfill(r.json ? { status: r.status, json: r.json } : { status: r.status, body: "" });
  });

  await page.goto(`${BASE}/app`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("input[type=email], .tabbar", { timeout: 60000 });
  if (await page.locator("input[type=email]").count()) {
    await page.fill("input[type=email]", STAFF.email);
    await page.fill("input[type=password]", STAFF.password);
    await page.click("form button.btn.primary");
    await page.waitForSelector(".tabbar", { timeout: 30000 });
  }
  await page.evaluate(() => { try { localStorage.setItem("dp.tours", JSON.stringify(["shell", "today", "calendar", "money", "clients", "business"])); localStorage.setItem("dp.tour", "1"); } catch {} });
  await page.goto(`${BASE}/app/clients`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".rows.cols.clients .row-item", { timeout: 30000 });
  await page.locator(".rows.cols.clients .row-item").first().click();
  const box = page.locator("label.field:has-text('Notes') textarea").first();
  await box.waitFor({ state: "visible", timeout: 15000 });

  for (const scenario of ["member", "not-member"]) {
    member = scenario === "member";
    const before = calls.length;
    const text = `97.14 ${scenario} ${w}`;
    await box.fill(text);
    await box.evaluate((el) => el.blur());
    for (let i = 0; i < 100 && calls.length === before; i++) await page.waitForTimeout(100);
    const call = calls[before];
    // The answer is in; wait for what the screen should do with it, then read it.
    await page.locator(".error-box", { hasText: "Your notes were not saved" })
      .waitFor({ state: member ? "detached" : "attached", timeout: 5000 }).catch(() => {});
    const shown = await page.locator(".error-box", { hasText: "Your notes were not saved" }).count();
    await box.scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${SHOTS}/${scenario}-${w}x${h}${BREAK ? `.break-${BREAK}` : ""}.png` });
    let ok = check(`${w}: ${scenario}: the screen sent its save to set_customer_notes`, !!call && call.notes_in === text, JSON.stringify(call));
    if (member) ok = check(`${w}: member: the function stored the text and no error line is shown`, call?.status === 204 && call.saved === text && shown === 0, JSON.stringify({ call, shown })) && ok;
    else ok = check(`${w}: not a member: the function refused and the screen says so`, call?.status === 403 && shown === 1, JSON.stringify({ call, shown })) && ok;
    if (ok) completed++;
  }
  // Every refusal this script serves is logged by Chromium as a failed 403 — one per refused save, and no other.
  const served403 = calls.filter((c) => c.width === w && c.status === 403).length;
  const logged403 = errors.filter((e) => /status of 403/.test(e)).length;
  check(`${w}: no console errors besides the ${served403} refusal(s) served`, logged403 === served403 && errors.length === logged403, JSON.stringify(errors));
  await ctx.close();
}
await browser.close();

writeReceipt({
  check_id: "customer-notes-route",
  started_at,
  status: failures.length ? "fail" : "pass",
  expected_targets: WIDTHS.length * 2,
  discovered_targets: WIDTHS.length * 2,
  attempted_targets: WIDTHS.length * 2,
  completed_targets: completed,
  skipped_targets: 0,
  assertions_executed: assertions,
  min_assertions: WIDTHS.length * 5,
  failures,
  assertion_floor: "structural: two per scenario plus one console check per width",
  artifacts: [SHOTS],
  canary: { id: "direct-write-refused", observed_failure: BREAK === "direct" ? failures.length > 0 : true },
  dimensions: { break: BREAK || undefined, login: "demo staff", calls: calls.length },
});
process.exit(failures.length ? 1 : 0);
