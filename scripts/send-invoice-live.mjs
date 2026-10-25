// ROADMAP 6.4 — THE LIVE HALF OF "PRESS SEND INVOICE TWICE, GET ONE INVOICE".
//
//   node scripts/send-invoice-live.mjs                  # clean run, receipt
//   node scripts/send-invoice-live.mjs --break=no-key   # the browser strips the key: must go red
//   node scripts/receipt.mjs receipts/send-invoice-live.json
//
// Needs a dev server for THIS checkout (BASE_URL, default http://localhost:5173) and
// credentials: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY (or VITE_).
// It loads `./.env`, or the file named by ENV_FILE, and never prints a value.
//
// WHY IT EXISTS. 6.4's app half was pressed on 2026-10-07 against a stand-in: the
// claim module over a Map, Resend as a counter. Its own note says that proves
// nothing about the live system until `send-invoice` is published and
// `send_invoice_attempts` applied. The 2026-10-23 server check (receipts/
// deployed-inventory.json at 7f7789b3) found `send-invoice` running this
// checkout, and the migration check does not name the table as missing. This is
// the press the entry asked for: "press Send invoice twice quickly on a fixture
// business's finalized job ... and read email_sends: one invoice and one
// thank-you, not two; then press Send again after the first answered and read two.
// Red proof: take the key out of the call and the same two presses read two and two."
//
// WHAT IT WRITES — said before it writes, CLAUDE.md's rule for this database.
// Project kguqylyzgyzfktkfnhjb only (it refuses any other host). Its own
// `invlive-<tag>` business (`is_demo`), one owner login, one service and FOUR
// finalized bookings, all deleted at the end and read back gone. Every customer
// address is on the `fixture.test` sink, which `send-email` answers as sent
// without calling the provider (tests/_mail.mjs), so no email leaves and the
// daily allowance is not spent; `email_sends` still gets one row per email, and
// that row is what is counted. demo-detail is never touched.
//
// QUESTIONS (expected targets = SIZES + 2 refusals = 5, fixed by the lists below):
//   * per size (1440x900, 768x1024, 390x844), one finalized job on its own page:
//     a DOUBLE TAP of "Email the receipt" (both clicks in one tick, before React can
//     disable the button) leaves exactly 2 email rows (invoice + thank-you), every
//     request carries the SAME key, the live table holds ONE row for it in state
//     `sent`, no answer says `idempotent: false`, the screen says "Receipt +
//     thank-you sent." with no error box; then ONE press of "Email it again" leaves
//     exactly 2 more rows and carries a NEW key; console clean.
//   * refusal 1: a malformed key is a 400 and sends nothing (the "never treat a bad
//     key as no key" rule).
//   * refusal 2: another business's booking with this owner's token is a 404 and
//     sends nothing.
// CANARY: the email-row assertion aimed at a finalized booking nobody pressed must FAIL.

import { createRequire } from "node:module";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { writeReceipt } from "./receipt.mjs";
import { watchConsole } from "./lib/bookingWalk.mjs";
import { sink } from "../tests/_mail.mjs";

const require = createRequire(import.meta.url);
const { chromium } = require("../app/node_modules/playwright/index.js");
const { createClient } = require("../app/node_modules/@supabase/supabase-js");

const ENV_FILE = process.env.ENV_FILE || ".env";
if (existsSync(ENV_FILE)) {
  for (const l of readFileSync(ENV_FILE, "utf8").split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(l);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
const BREAK = (process.argv.find((a) => a.startsWith("--break=")) || "").slice(8);
if (BREAK && BREAK !== "no-key") throw new Error(`unknown --break=${BREAK}; the only one is no-key`);
const BASE = (process.env.BASE_URL || process.env.BASE || "http://localhost:5173").replace(/\/$/, "");
const URL_ = (process.env.SUPABASE_URL || "").replace(/\/$/, "");
const ANON = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_ || !SERVICE || !ANON) throw new Error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / SUPABASE_ANON_KEY. NOTHING WAS MEASURED.");
if (new URL(URL_).host !== "kguqylyzgyzfktkfnhjb.supabase.co") throw new Error("refusing: not project kguqylyzgyzfktkfnhjb");
const db = createClient(URL_, SERVICE, { auth: { persistSession: false } });

const started_at = new Date().toISOString();
const SIZES = [[1440, 900], [768, 1024], [390, 844]];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ART = "artifacts/send-invoice-live/";
mkdirSync(ART, { recursive: true });
const PNG = "C:/Users/rando/Downloads/claude/belt/shots/6.4/png/";
try { mkdirSync(PNG, { recursive: true }); } catch { /* outside the repo; optional */ }

const failures = [], observed = [], consoleNoise = [], artifacts = [];
let assertions = 0, discovered = 0, attempted = 0, completed = 0;
const check = (ok, msg) => { assertions++; if (!ok) failures.push(msg); return ok; };
const tag = Math.random().toString(36).slice(2, 8);
const SLUG = `invlive-${tag}`;
const OWNER = { email: sink(`invlive-owner-${tag}`), password: `Aa1!${crypto.randomUUID()}` };
const mails = async (to) => {
  const { count, error } = await db.from("email_sends").select("id", { count: "exact", head: true }).eq("to_email", to);
  if (error) throw new Error(`email_sends read: ${error.message}`);
  return count;
};
// The ONE assertion the canary is aimed at: exactly `n` new rows to this address.
const rowsMoved = async (to, before, n) => (await mails(to)) - before === n;
const settle = () => new Promise((r) => setTimeout(r, 1500));

let biz = null, userId = null;
const jobs = [];
let canary = { id: "email-rows-for-an-unpressed-booking", what: "rowsMoved(+2) — the assertion every double tap passed — run against a finalized booking this run never pressed; it must report no rows", observed_failure: false };
let browser = null;
try {
  // ---- the fixture ------------------------------------------------------------
  ({ data: biz } = await db.from("businesses").insert({
    is_demo: true, slug: SLUG, name: `Invoice ${tag} Detailing`, timezone: "America/Los_Angeles",
    contact_email: sink(`invlive-biz-${tag}`), contact_phone: "555-0100", dropoff_address: "1 Invoice Rd, Los Angeles, CA",
  }).select().single());
  if (!biz) throw new Error("fixture business was not created");
  // Follow-ups ON so a send is two emails (invoice + thank-you); push OFF so nobody's phone buzzes.
  const { error: se } = await db.from("business_settings").upsert({ business_id: biz.id, email_customer_followup: true, push_enabled: false }, { onConflict: "business_id" });
  if (se) throw new Error(`settings: ${se.message}`);
  const { data: service } = await db.from("services").insert({ business_id: biz.id, name: "Invoice Detail", price: 200, duration_minutes: 120 }).select().single();
  const { data: u, error: ue } = await db.auth.admin.createUser({ ...OWNER, email_confirm: true });
  if (ue) throw new Error(`owner: ${ue.message}`);
  userId = u.user.id;
  await db.from("business_users").insert({ business_id: biz.id, user_id: userId, role: "owner" });
  for (let i = 0; i < SIZES.length + 1; i++) {
    const start = new Date(Date.now() - (i + 2) * 86400_000);
    const { data: b, error } = await db.from("bookings").insert({
      business_id: biz.id, customer_name: `Invoice Customer ${i + 1}`, customer_phone: `555-02${String(i).padStart(2, "0")}`,
      customer_email: sink(`invlive-${tag}-${i}`), service_type: "dropoff", vehicle_size: "small",
      start_at: start.toISOString(), end_at: new Date(+start + 2 * 3600_000).toISOString(),
      status: "completed", subtotal: 200, total_price: 200, final_amount: 200, payment_status: "paid",
      payment_notes: "Card", finalized_at: new Date().toISOString(),
    }).select().single();
    if (error) throw new Error(`booking ${i}: ${error.message}`);
    await db.from("booking_services").insert({ business_id: biz.id, booking_id: b.id, service_id: service.id,
      name_at_booking: "Invoice Detail", price_at_booking: 200, duration_at_booking: 120 });
    jobs.push(b);
  }
  const untouched = jobs[SIZES.length];
  const untouchedBefore = await mails(untouched.customer_email);
  discovered = SIZES.length + 2;

  // ---- the browser -------------------------------------------------------------
  // THIS CHECKOUT'S SCREEN, THE LIVE PROJECT. A belt copy's dev server has no
  // app/.env.local, and another may point at a local stand-in; either way the two
  // modules that read the address are rewritten to the live one, and SIGNED so the
  // page proves it ran the rewrite rather than a cached original (docs/gotchas.md
  // 113). One goto per context for the same reason: /job/:id signs in in place.
  browser = await chromium.launch();
  for (const [w, h] of SIZES) {
    const job = jobs[attempted];
    const label = `${w}x${h}`;
    attempted++;
    const ctx = await browser.newContext({ viewport: { width: w, height: h } });
    await ctx.addInitScript(() => localStorage.setItem("dp.lang.app", "en"));
    const page = await ctx.newPage();
    const noise = [];
    watchConsole(page, label, noise);
    const sent = [], answers = [];
    await page.route("**/*", async (route) => {
      const req = route.request(), url = new URL(req.url());
      if (url.origin === BASE && /\/src\/lib\/(api|supabase)\.js$/.test(url.pathname)) {
        const response = await route.fetch(), src = await response.text();
        return route.fulfill({ response, body: src
          .replaceAll("import.meta.env.VITE_SUPABASE_URL", JSON.stringify(URL_))
          .replaceAll("import.meta.env.VITE_SUPABASE_ANON_KEY", JSON.stringify(ANON))
          + "\n;globalThis.__invLive = (globalThis.__invLive || 0) + 1;\n" });
      }
      if (req.method() === "POST" && url.pathname === "/functions/v1/send-invoice") {
        const body = JSON.parse(req.postData() || "{}");
        // --break=no-key: a page that sends no key, which is the old send-anyway path.
        if (BREAK === "no-key") delete body.idempotency_key;
        sent.push(body.idempotency_key ?? null);
        return route.continue({ postData: JSON.stringify(body) });
      }
      return route.continue();
    });
    page.on("response", async (res) => {
      if (!res.url().includes("/functions/v1/send-invoice") || res.request().method() !== "POST") return;
      answers.push({ status: res.status(), body: await res.json().catch(() => null) });
    });

    await page.goto(`${BASE}/job/${job.id}`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("input[type=email]", { timeout: 30000 });
    await page.fill("input[type=email]", OWNER.email);
    await page.fill("input[type=password]", OWNER.password);
    await page.click("form button.btn.primary");
    const btn = page.locator("button", { hasText: /^\s*Email the receipt\s*$/ });
    await btn.waitFor({ state: "visible", timeout: 30000 });
    check(await page.evaluate(() => globalThis.__invLive) === 2, `${label}: the page did not run both rewritten modules (signature ${await page.evaluate(() => globalThis.__invLive)})`);
    await page.waitForTimeout(600);

    // DOUBLE TAP — both clicks dispatched in one tick, before React re-renders `disabled`.
    const before = await mails(job.customer_email);
    await btn.evaluate((b) => { b.click(); b.click(); });
    await page.waitForSelector("text=Receipt + thank-you sent.", { timeout: 20000 }).catch(() => {});
    await settle();
    const tapRows = (await mails(job.customer_email)) - before;
    const tapKeys = [...sent];
    const { data: att } = await db.from("send_invoice_attempts").select("idempotency_key,state").eq("booking_id", job.id);
    observed.push(`${label} double tap: ${tapKeys.length} requests, keys ${JSON.stringify([...new Set(tapKeys)].map((k) => k && k.slice(0, 8)))}, answers ${answers.map((a) => `${a.status}${a.body?.duplicate ? " duplicate" : ""}${a.body?.idempotent === false ? " UNPROTECTED" : ""}`).join(",")}, ${tapRows} email rows, table ${JSON.stringify(att)}`);
    check(tapRows === 2, `${label}: a double tap left ${tapRows} email rows, not 2 (one invoice + one thank-you)`);
    check(tapKeys.length >= 2 && tapKeys.every((k) => k && UUID.test(k) && k === tapKeys[0]), `${label}: the double tap's requests did not all carry the same key: ${JSON.stringify(tapKeys)}`);
    check(att?.length === 1 && att[0].state === "sent" && att[0].idempotency_key === tapKeys[0], `${label}: the live table should hold ONE sent row for the key, holds ${JSON.stringify(att)}`);
    check(answers.every((a) => a.body?.idempotent !== false), `${label}: an answer said idempotent:false — the live store is not in use`);
    check(await page.locator("text=Receipt + thank-you sent.").count() > 0, `${label}: the sent notice is not on screen`);
    check(await page.locator(".error-box").count() === 0, `${label}: an error box is on screen: ${await page.locator(".error-box").allInnerTexts()}`);
    const shot = `${ART}${label}-double-tap${BREAK ? `-${BREAK}` : ""}.png`;
    await page.screenshot({ path: shot });
    artifacts.push(shot);
    if (!BREAK) await page.screenshot({ path: `${PNG}${label}-double-tap.png` }).catch(() => {});

    // A DELIBERATE SEND AFTER THE FIRST ANSWERED — a new intent, a new key, two more rows.
    const again = page.locator("button", { hasText: /^\s*Email it again\s*$/ });
    await again.waitFor({ state: "visible", timeout: 20000 }).catch(() => {});
    const mid = await mails(job.customer_email);
    const n = sent.length;
    if (check(await again.count() === 1, `${label}: no "Email it again" button after the first send`)) {
      await again.click();
      await page.waitForSelector("text=Receipt sent again.", { timeout: 20000 }).catch(() => {});
      await settle();
    }
    const againRows = (await mails(job.customer_email)) - mid;
    const againKeys = sent.slice(n);
    observed.push(`${label} again: ${againKeys.length} request(s), new key ${againKeys[0] && againKeys[0] !== tapKeys[0]}, ${againRows} email rows`);
    check(againRows === 2, `${label}: "Email it again" left ${againRows} email rows, not 2`);
    check(againKeys.length === 1 && againKeys[0] && againKeys[0] !== tapKeys[0], `${label}: "Email it again" should send ONE request with a NEW key: ${JSON.stringify(againKeys)}`);

    // Designed noise only: the gear's platform-admin whoami 404 (docs/gotchas.md 120), and the 409
    // `in_progress` the double tap's second press is answered with before it retries.
    const real = noise.filter((x) => !/platform-admin/.test(x) && !/status of 404/.test(x) && !/status of 409/.test(x) && !/http 409 · \/functions\/v1\/send-invoice/.test(x));
    consoleNoise.push(...real);
    check(real.length === 0, `${label}: console not clean (${real.length})`);
    await ctx.close();
    completed++;
  }

  // ---- refusals, from node with the owner's own token ---------------------------
  const owner = createClient(URL_, ANON, { auth: { persistSession: false } });
  const { data: s } = await owner.auth.signInWithPassword(OWNER);
  const call = async (body) => {
    const r = await fetch(`${URL_}/functions/v1/send-invoice`, { method: "POST",
      headers: { apikey: ANON, Authorization: `Bearer ${s.session.access_token}`, "Content-Type": "application/json" }, body: JSON.stringify(body) });
    return { status: r.status, body: await r.json().catch(() => null) };
  };
  attempted++;
  const bad = await call({ business_id: biz.id, booking_id: untouched.id, idempotency_key: "not-a-uuid" });
  await settle();
  observed.push(`refusal 1 malformed key: ${bad.status} ${JSON.stringify(bad.body)}`);
  check(bad.status === 400 && (await mails(untouched.customer_email)) === untouchedBefore, `refusal 1: a malformed key answered ${bad.status} or sent an email`);
  completed++;
  attempted++;
  const { data: foreign } = await db.from("bookings").select("id,customer_email").neq("business_id", biz.id)
    .not("final_amount", "is", null).not("payment_status", "is", null).not("customer_email", "is", null).limit(1).maybeSingle();
  if (check(!!foreign, "refusal 2: no other business's finalized booking to aim at")) {
    const fBefore = await mails(foreign.customer_email);
    const other = await call({ business_id: biz.id, booking_id: foreign.id, idempotency_key: crypto.randomUUID() });
    await settle();
    observed.push(`refusal 2 other tenant: ${other.status} ${JSON.stringify(other.body)}`);
    check(other.status === 404 && (await mails(foreign.customer_email)) === fBefore, `refusal 2: another business's booking answered ${other.status} or sent an email`);
    completed++;
  }

  canary.observed_failure = !(await rowsMoved(untouched.customer_email, untouchedBefore, 2));
} catch (err) {
  failures.push(`CRASHED: ${err.stack || err.message}`);
} finally {
  await browser?.close();
  if (biz?.id) await db.from("businesses").delete().eq("id", biz.id);
  if (userId) await db.auth.admin.deleteUser(userId);
  const { count } = await db.from("businesses").select("id", { count: "exact", head: true }).eq("slug", SLUG);
  check(count === 0, `teardown: ${count} fixture business left`);
}

for (const o of observed) console.log("  " + o);
for (const f of failures) console.log("FAIL " + f);
const expected = SIZES.length + 2;
const status = failures.length === 0 && canary.observed_failure && completed === expected ? "pass" : "fail";
console.log(`canary ${canary.observed_failure ? "caught" : "MISSED"}; ${completed}/${expected} targets, ${assertions} assertions, ${failures.length} failed`);
const { path } = writeReceipt({
  check_id: "send-invoice-live",
  started_at,
  status,
  expected_targets: expected,
  discovered_targets: discovered,
  attempted_targets: attempted,
  completed_targets: completed,
  skipped_targets: 0,
  assertions_executed: assertions,
  min_assertions: SIZES.length * 11 + 4,
  assertion_floor: "11 per size (signature, rows, keys, table, unprotected, notice, error box, again button, again rows, again key, console), 3 for the refusals, 1 teardown. Fixed by the lists, never by what the run finds.",
  failures: [...failures, ...consoleNoise.map((c) => `console: ${c}`)],
  artifacts,
  warnings: [
    "WRITES: its own invlive-<tag> business (is_demo), one owner, four finalized bookings, deleted at the end; email_sends gains rows for fixture.test addresses only (no provider call).",
    ...(BREAK ? [`run with --break=${BREAK}; this receipt is a sabotage, not a result`] : []),
  ],
  dimensions: { base: BASE, sizes: SIZES.map((s) => s.join("x")), observed, break: BREAK || undefined },
  canary,
});
console.log(`receipt ${path} — ${status}`);
process.exitCode = status === "pass" ? 0 : 1;
