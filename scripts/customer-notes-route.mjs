// ROADMAP 97.14 — THE CLIENT RECORD'S NOTES BOX, IN A REAL BROWSER, THROUGH `set_customer_notes`.
//
//   set -a; . <main checkout>/.env; set +a
//   PGLITE_DIR=<folder holding @electric-sql/pglite> BASE=http://127.0.0.1:5180 node scripts/customer-notes-route.mjs
//   BREAK=direct …     # sabotage: the call is answered as the OLD screen's direct write would be after the migration
//   BREAK=unguarded …  # sabotage: the served lib/supabase.js loses its rpc guard, so a view-as tab sends the save
//
// The live database has not run 20261017030000 / 20261017130000 (applying is Andrew's), so the function does not exist
// there yet. So the RPC the screen sends is ANSWERED BY A THROWAWAY POSTGRES RUNNING THE REAL MIGRATIONS: the
// request's own business and customer ids are seeded into it, the caller is made a member of that business, and the
// function's real result or real error goes back. `is_support_session()` is stubbed false there: the database half of
// "view as" is tests/staff-writes-sql.test.mjs's, and this browser never reaches it — see VIEW-AS below. Everything
// else — sign-in, the list, the record — is the live demo tenant. Signs in as the STAFF login (the role this item is
// about); LOGIN=owner signs in as the owner instead, the second account R3 asks for, and writes its own receipt.
// Nothing is written to the live database.
//
// Three scenarios per width: MEMBER (the save must succeed and no error line be on screen), NOT A MEMBER (the
// function refuses, and the screen must SAY so — the old direct update failed silently) and VIEW-AS (a "view as" tab
// on Looking, made the way platform-admin's door makes one — the tab's own session in sessionStorage plus the preview
// flag — must send NO save and must show the Looking-only line). Expected 3 widths × 3 = 9 targets.
// "Shown" means ON SCREEN AS THE PAGE SITS, not present in the DOM: the check makes NO scroll of its own (the box is
// where typing into it put it, as for a detailer), and the line must lie wholly inside the viewport AND inside every
// box that clips it (the record panel), be painted (no hidden or faded ancestor), and be the topmost thing at its top,
// middle and bottom. Until 2026-10-17 it scrolled the line into view first, so a line cut by the panel's edge at 1440
// read as shown (the review's finding; ROADMAP 97.14, round 3). CANARY, EVERY RUN: two lines planted in the page — one above the viewport, one at
// opacity 0 — must both read as NOT on screen, or the check is counting rather than looking.
// Sabotage: BREAK=direct answers every save with the 42501 a revoked direct write gets (MEMBER goes red);
// BREAK=unguarded strips the guard out of the served module and records that the cut landed (VIEW-AS goes red);
// BREAK=no-scroll cuts the screen's own scroll-the-line-into-view out of the served Clients.jsx and records that the
// cut landed (the line falls back to where it renders, under the panel's edge at 1440).
//
// No-.env servers: a belt job's server starts without the app's Supabase address, so the two VITE_ values are
// supplied to the page here, from the root `.env`'s SUPABASE_URL / SUPABASE_ANON_KEY (the anon key ships in every
// browser bundle). Never printed.

import { createRequire } from "node:module";
import { readFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { writeReceipt } from "./receipt.mjs";
import { demoOwner, demoStaff } from "./lib/demoOwner.mjs";

const require = createRequire(new URL("../app/package.json", import.meta.url));
const { chromium } = require("playwright");
const BASE = process.env.BASE || "http://localhost:5173";
const BREAK = process.env.BREAK || "";
const WIDTHS = [[390, 844], [768, 1024], [1440, 900]];
const SCENARIOS = ["member", "not-member", "view-as"];
const SHOTS = process.env.SHOTS || `artifacts/customer-notes-route${process.env.LOGIN === "owner" ? "-owner" : ""}`;
const started_at = new Date().toISOString();
const { PGlite } = await import(pathToFileURL(path.join(process.env.PGLITE_DIR ?? "", "node_modules/@electric-sql/pglite/dist/index.js")).href);
const read = (f) => readFileSync(path.join("supabase/migrations", f), "utf8").replace(/\r\n/g, "\n");
const CUSTOMERS = /create table public\.customers \([\s\S]*?\n\);/.exec(read("20260827000200_tenant_data.sql"))[0];
const MIGRATION = ["20261017030000_staff_cannot_delete_bookings_or_write_customers.sql",
  "20261017130000_set_customer_notes_refuses_support_sessions.sql"].map(read).join("\n");
const GUARD = "if (!RPC_READS.has(fn)) guardWrite();";
const NOT_SAVED = "Your notes were not saved";
const LOOKING = "Looking only";

let member = true; // which scenario the next save is answered under
let unguardedCuts = 0; // BREAK=unguarded: served modules the guard was cut out of (docs/gotchas.md 102)
const SCROLL = /\b\w+\.current\?\.scrollIntoView\(\{\s*block:\s*"nearest"\s*\}\)/;
let scrollCuts = 0; // BREAK=no-scroll: the same proof that the cut landed
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
      create function public.is_support_session() returns boolean language sql stable as $f$ select false $f$;
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

// ON SCREEN AS IT SITS — no scroll here: wholly inside the viewport and every clipping ancestor, painted, and topmost at
// its top, middle and bottom. Polled, because the line can arrive mid-transition (docs/gotchas.md 119, 122).
// `why` names the rule a line failed, so a red says which one rather than only "false".
let why = "";
const onScreen = async (page, loc, wantOn) => {
  let on = false;
  for (let i = 0; i < 20; i++) {
    why = (await loc.count()) === 0 ? "absent" : await loc.first().evaluate((n) => {
      const r = n.getBoundingClientRect();
      const box = (b) => `${Math.round(b.top)}-${Math.round(b.bottom)}`;
      const inside = (b) => r.top >= b.top - 0.5 && r.bottom <= b.bottom + 0.5 && r.left >= b.left - 0.5 && r.right <= b.right + 0.5;
      if (!r.width || !r.height) return "no size";
      if (!inside({ top: 0, left: 0, bottom: innerHeight, right: innerWidth })) return `outside the viewport (line ${box(r)}, viewport 0-${innerHeight})`;
      // A box clips only what it contains: html and body hand their overflow to the viewport (checked above), and
      // nothing above a fixed element contains it. The first version tested every ancestor and called a fully painted
      // line "clipped by body" at whichever width the page happened to be scrolled — a false defect.
      let contained = true;
      for (let e = n; e; e = e.parentElement) {
        const s = getComputedStyle(e);
        const name = e.tagName.toLowerCase() + (e.className && typeof e.className === "string" ? "." + e.className.trim().split(/\s+/).join(".") : "");
        if (s.visibility === "hidden" || s.display === "none") return `hidden by ${name}`;
        if (Number(s.opacity) < 0.9) return `faded by ${name} (opacity ${s.opacity})`;
        if (contained && e !== n && e !== document.body && e !== document.documentElement
          && (s.overflowX !== "visible" || s.overflowY !== "visible") && !inside(e.getBoundingClientRect())) return `clipped by ${name} (line ${box(r)}, box ${box(e.getBoundingClientRect())})`;
        if (s.position === "fixed") contained = false;
      }
      const x = r.left + r.width / 2;
      for (const y of [r.top + 2, r.top + r.height / 2, r.bottom - 2]) {
        const hit = document.elementFromPoint(x, y);
        if (!hit || !(hit === n || n.contains(hit))) return `covered at y=${Math.round(y)} by ${hit ? hit.tagName.toLowerCase() + "." + String(hit.className) : "nothing"}`;
      }
      return "";
    }).catch((e) => `unreadable: ${e.message.slice(0, 60)}`);
    on = why === "";
    if (on === wantOn) break;
    await page.waitForTimeout(150);
  }
  return on;
};

const failures = [];
let assertions = 0, completed = 0, canaryCaught = null;
const check = (name, ok, detail = "") => {
  assertions++;
  console.log(`  ${ok ? "ok  " : "FAIL"}  ${name}${ok ? "" : " " + detail}`);
  if (!ok) failures.push(`${name} ${detail}`.trim());
  return ok;
};

const browser = await chromium.launch();
mkdirSync(SHOTS, { recursive: true });
const OWNER_RUN = process.env.LOGIN === "owner";
const STAFF = OWNER_RUN ? demoOwner() : demoStaff();
const tag = BREAK ? `.break-${BREAK}` : "";
for (const [w, h] of WIDTHS) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
  const errors = [];
  const watch = (p) => {
    p.on("console", (m) => { if (m.type() === "error") errors.push(m.text().slice(0, 160)); });
    p.on("pageerror", (e) => errors.push(e.message.slice(0, 160)));
  };
  const page = await ctx.newPage();
  watch(page);
  await ctx.route(/\/src\/.*\.(js|jsx)(\?.*)?$/, async (route) => {
    const res = await route.fetch();
    let body = (await res.text())
      .replaceAll("import.meta.env.VITE_SUPABASE_URL", JSON.stringify(process.env.SUPABASE_URL))
      .replaceAll("import.meta.env.VITE_SUPABASE_ANON_KEY", JSON.stringify(process.env.SUPABASE_ANON_KEY));
    if (BREAK === "unguarded" && body.includes(GUARD)) { body = body.replace(GUARD, ""); unguardedCuts++; }
    if (BREAK === "no-scroll" && SCROLL.test(body)) { body = body.replace(SCROLL, "void 0"); scrollCuts++; }
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
  const auth = await page.evaluate(() => {
    try { localStorage.setItem("dp.tours", JSON.stringify(["shell", "today", "calendar", "money", "clients", "business"])); localStorage.setItem("dp.tour", "1"); } catch {}
    return localStorage.getItem(Object.keys(localStorage).find((k) => /^sb-.*-auth-token$/.test(k)));
  });
  const openRecord = async (p, n = 0) => {
    await p.goto(`${BASE}/app/clients`, { waitUntil: "domcontentloaded" });
    await p.waitForSelector(".rows.cols.clients .row-item", { timeout: 30000 });
    await p.locator(".rows.cols.clients .row-item").nth(n).click();
    const box = p.locator("label.field:has-text('Notes') textarea").first();
    await box.waitFor({ state: "visible", timeout: 15000 });
    // The record arrives with four 180ms animations (column-in, arrive) still running when the box is first visible.
    // Typing then means the screen's reveal scrolls against a panel mid-slide and the line settles off screen —
    // measured at 1440 in a view-as tab, 853-917 on a 900px viewport. Nobody types that fast, so wait them out.
    await p.evaluate(() => Promise.all((document.querySelector(".record")?.getAnimations({ subtree: true }) ?? [])
      .filter((a) => a.effect?.getComputedTiming().duration !== Infinity).map((a) => a.finished.catch(() => {}))));
    return box;
  };
  const save = async (p, box, text) => {
    const before = calls.length;
    await box.fill(text);
    await box.evaluate((el) => el.blur());
    for (let i = 0; i < 30 && calls.length === before; i++) await p.waitForTimeout(100);
    await p.waitForTimeout(800); // the answer reaches the screen after it is recorded here
    return calls.length > before ? calls[before] : null;
  };
  let box = await openRecord(page);

  // The canary, once per run: a check that counts would call both of these shown.
  if (canaryCaught === null) {
    await page.evaluate((t) => {
      for (const css of ["position:fixed;top:-300px;left:0", "opacity:0"]) {
        const d = document.createElement("div");
        d.className = "error-box planted-canary"; d.textContent = t; d.style.cssText = css;
        document.querySelector("label.field textarea").closest("label").after(d);
      }
    }, NOT_SAVED);
    const planted = page.locator(".planted-canary");
    const offTop = await onScreen(page, planted.nth(0), false);
    const faded = await onScreen(page, planted.nth(1), false);
    await page.evaluate(() => document.querySelectorAll(".planted-canary").forEach((d) => d.remove()));
    canaryCaught = !offTop && !faded;
    check("canary: a line above the viewport and a line at opacity 0 both read as NOT on screen", canaryCaught, JSON.stringify({ offTop, faded }));
  }

  for (const scenario of ["member", "not-member"]) {
    member = scenario === "member";
    const text = `97.14 ${scenario} ${w}`;
    const call = await save(page, box, text);
    const line = page.locator(".error-box", { hasText: NOT_SAVED });
    const shown = await onScreen(page, line, !member);
    await page.screenshot({ path: `${SHOTS}/${scenario}-${w}x${h}${tag}.png` });
    let ok = check(`${w}: ${scenario}: the screen sent its save to set_customer_notes`, !!call && call.notes_in === text, JSON.stringify(call));
    if (member) ok = check(`${w}: member: the function stored the text and no error line is on screen`, call?.status === 204 && call.saved === text && !shown, JSON.stringify({ call, shown, why })) && ok;
    else ok = check(`${w}: not a member: the function refused and the screen shows it`, call?.status === 403 && shown, JSON.stringify({ call, shown, why })) && ok;
    if (ok) completed++;
  }
  // A refusal belongs to the record it happened on: open a DIFFERENT client and the line must be gone.
  // Since ROADMAP 97.84 a refused record stays open on every Close (it re-sends and is refused again), so the way
  // out is the person's own "Close anyway" — the X here would leave this record open and the step would measure it.
  await page.locator("button", { hasText: "Close anyway" }).first().click();
  const notesBox = page.locator("label.field:has-text('Notes') textarea").first();
  await notesBox.waitFor({ state: "detached", timeout: 5000 }).catch(() => {});
  await page.locator(".rows.cols.clients .row-item").nth(1).click();
  // One retry: a click landing while the closing record is still leaving opened nothing, once in 12 runs.
  await notesBox.waitFor({ state: "visible", timeout: 15000 })
    .catch(() => page.locator(".rows.cols.clients .row-item").nth(1).click().then(() => notesBox.waitFor({ state: "visible", timeout: 15000 })));
  const stale = await onScreen(page, page.locator(".error-box", { hasText: NOT_SAVED }), false);
  check(`${w}: the refusal line does not follow onto a different client's record`, !stale, `on screen ${stale}`);
  await page.screenshot({ path: `${SHOTS}/next-record-${w}x${h}${tag}.png` });

  // VIEW-AS: a second tab of the same browser, made into a "view as" tab on Looking the way the door makes one.
  member = true; // were a save to get out, it would be answered as one that worked — so only the guard can stop it
  const look = await ctx.newPage();
  watch(look);
  await look.addInitScript((a) => {
    sessionStorage.setItem("dp.preview", "1");
    sessionStorage.setItem("dp.preview.mode", "look");
    if (!sessionStorage.getItem("dp.preview.auth")) sessionStorage.setItem("dp.preview.auth", a);
  }, auth);
  box = await openRecord(look);
  const bar = await look.locator("text=Nothing here can be changed").count();
  const sent = await save(look, box, `97.14 view-as ${w}`);
  const lookingShown = await onScreen(look, look.locator(".error-box", { hasText: LOOKING }), true);
  await look.screenshot({ path: `${SHOTS}/view-as-${w}x${h}${tag}.png` });
  let ok = check(`${w}: view-as: the tab is a Looking preview and no save left the browser`, bar > 0 && !sent, JSON.stringify({ bar, sent }));
  ok = check(`${w}: view-as: the Looking-only line is on screen under the box`, lookingShown, `on screen ${lookingShown}: ${why}`) && ok;
  if (ok) completed++;

  // Every refusal this script serves is logged by Chromium as a failed 403 — one per refused save, and no other.
  const served403 = calls.filter((c) => c.width === w && c.status === 403).length;
  const logged403 = errors.filter((e) => /status of 403/.test(e)).length;
  check(`${w}: no console errors on either tab besides the ${served403} refusal(s) served`, logged403 === served403 && errors.length === logged403, JSON.stringify(errors));
  await ctx.close();
}
await browser.close();
if (BREAK === "unguarded") check("sabotage landed: the rpc guard was cut out of the served module", unguardedCuts > 0, `cuts ${unguardedCuts}`);
if (BREAK === "no-scroll") check("sabotage landed: the screen's scroll-into-view was cut out of the served Clients.jsx", scrollCuts > 0, `cuts ${scrollCuts}`);

writeReceipt({
  check_id: OWNER_RUN ? "customer-notes-route-owner" : "customer-notes-route",
  started_at,
  status: failures.length ? "fail" : "pass",
  expected_targets: WIDTHS.length * SCENARIOS.length,
  discovered_targets: WIDTHS.length * SCENARIOS.length,
  attempted_targets: WIDTHS.length * SCENARIOS.length,
  completed_targets: completed,
  skipped_targets: 0,
  assertions_executed: assertions,
  min_assertions: WIDTHS.length * 8 + 1,
  failures,
  assertion_floor: "structural: two per scenario plus a next-record and a console check per width, and the canary once",
  artifacts: [SHOTS],
  canary: { id: "planted-hidden-lines-read-as-not-shown", observed_failure: canaryCaught === true },
  dimensions: { break: BREAK || undefined, login: OWNER_RUN ? "demo owner" : "demo staff", calls: calls.length, unguarded_cuts: BREAK === "unguarded" ? unguardedCuts : undefined, scroll_cuts: BREAK === "no-scroll" ? scrollCuts : undefined },
});
process.exit(failures.length ? 1 : 0);
