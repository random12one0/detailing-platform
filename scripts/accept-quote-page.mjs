// ROADMAP 97.16 — THE MANAGE PAGE'S ACCEPT, PRESSED IN A REAL BROWSER.
//
// Two cases at each width, on `/booking/:id`:
//   normal — the page shows a $200 quote and Accept confirms the booking at $200.
//   stale  — the page shows $200, the detailer re-quotes $300 before the press;
//            Accept is refused with a sentence naming $300, the booking stays
//            waiting, and the page now shows the $300 quote.
//
// NOTHING IS WRITTEN TO ANY DATABASE. The booking lives in memory here:
// `get-booking-receipt` is answered from it with page.route, and the Accept
// press is answered by THIS CHECKOUT'S REAL `accept-quote` handler (`loadEdge`),
// whose Supabase calls go to an in-memory fake. The business profile is the
// real demo-detail one, read as any visitor reads it.
//
//   node scripts/accept-quote-page.mjs                    BASE_URL or http://localhost:5173
//   node scripts/accept-quote-page.mjs --break=old-server the handler as it was before 97.16
//                                                         (git 9a7f5cb9): MUST be red on every stale case
//   --shots=<dir>  where the PNGs go (default .tmp-97.16/png)   --freeze=before|after  write the review copy

import { registerHooks } from "node:module";
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { writeReceipt } from "./receipt.mjs";

const started_at = new Date().toISOString();
const arg = (k) => (process.argv.find((a) => a.startsWith(`--${k}=`)) || "").split("=").slice(1).join("=");
const BREAK = arg("break");
if (BREAK && BREAK !== "old-server") { console.error(`Unknown --break=${BREAK}. Known: old-server.`); process.exit(2); }
const SHOTS = arg("shots") || ".tmp-97.16/png";
const FREEZE = arg("freeze");
const BASE = (process.env.BASE_URL || "http://localhost:5173").replace(/\/$/, "");
const PRE_FIX = "9a7f5cb9";

let landed = !BREAK;
if (BREAK) {
  const old = execFileSync("git", ["show", `${PRE_FIX}:supabase/functions/accept-quote/index.ts`], { encoding: "utf8" });
  registerHooks({
    load(url, ctx, next) {
      const r = next(url, ctx);
      if (!url.endsWith("/accept-quote/index.ts")) return r;
      landed = !old.includes("quoted_at: shown") && String(r.source) !== old;
      return { ...r, source: old };
    },
  });
}

// ── THE IN-MEMORY BOOKING, AND THE FAKE SUPABASE THE HANDLER TALKS TO ──────
const FAKE = "https://fake-supabase.invalid";
const BIZ = "11111111-1111-4111-8111-111111111111";
const ID = "97160000-0000-4000-8000-000000000016";
const T1 = "2026-10-17T10:00:00.123456+00:00";
const T2 = "2026-10-17T10:05:00.654321+00:00";
const start = new Date(Date.now() + 6 * 86400_000); start.setUTCHours(17, 0, 0, 0);
const end = new Date(start.getTime() + 2 * 3600_000);
const BUSINESSES = [{ id: BIZ, slug: "demo-detail", name: "Demo Detail", status: "active", timezone: "America/Los_Angeles", contact_email: "owner@fixture.test" }];
let row;
const reset = () => {
  row = {
    id: ID, business_id: BIZ, status: "pending", deleted_at: null, service_type: "mobile",
    start_at: start.toISOString(), end_at: end.toISOString(), customer_name: "Pat Fixture", customer_phone: "555-0116",
    customer_email: "pat@fixture.test", customer_address: "12 Quote Lane, Los Angeles, CA", vehicle_size: "medium",
    vehicle_size_label: "Midsize", subtotal: 150, total_price: 150, price_adjustments: null, travel_fee: 0,
    quoted_amount: 200, quoted_note: "Heavy pet hair, so it needs an extra hour.", quoted_at: T1, lang: "en",
    services: [], add_ons: [], vehicles: [],
  };
};
reset();
const send = (status, body) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const realFetch = globalThis.fetch;
const outside = [];
globalThis.fetch = async (input, init) => {
  const req = new Request(input, init);
  const u = new URL(req.url);
  if (u.origin !== FAKE) { outside.push(u.origin); return realFetch(input, init); }
  const text = ["GET", "HEAD"].includes(req.method) ? "" : await req.text();
  if (u.pathname === "/functions/v1/send-email") return send(200, { ok: true });
  if (u.pathname.startsWith("/rest/v1/rpc/")) return send(200, u.pathname.endsWith("/rate_take") ? true : []);
  const tbl = (u.pathname.match(/^\/rest\/v1\/([a-z_]+)$/) || [])[1];
  let rows = tbl === "bookings" ? [row] : tbl === "businesses" ? BUSINESSES : [];
  for (const [k, v] of u.searchParams) {
    const m = String(v).match(/^eq\.(.*)$/);
    if (m) rows = rows.filter((r) => String(r[k]) === m[1]);
    if (v === "is.null") rows = rows.filter((r) => r[k] == null);
  }
  if (req.method === "PATCH") for (const r of rows) Object.assign(r, JSON.parse(text || "{}"));
  if (String(req.headers.get("accept") || "").includes("vnd.pgrst.object")) {
    return rows.length === 1 ? send(200, rows[0]) : send(406, { code: "PGRST116", message: "0 rows" });
  }
  return send(200, rows);
};
const { loadEdge } = await import("./lib/edgeLocal.mjs");
const accept = (await loadEdge(["accept-quote"], { SUPABASE_URL: FAKE, SUPABASE_SERVICE_ROLE_KEY: "placeholder" })).get("accept-quote");
if (!landed) { console.log(`NOT RUN — --break=${BREAK} did not swap in the pre-fix handler.`); process.exit(1); }

const tz = "America/Los_Angeles";
const receipt = () => ({
  group: [], card: { ready: false, amountCents: 0 },
  booking: {
    ...Object.fromEntries(Object.entries(row).filter(([k]) => !["business_id", "deleted_at", "lang"].includes(k))),
    booking_date: new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(new Date(row.start_at)),
    start_time: new Date(row.start_at).toLocaleTimeString("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit" }),
    end_time: new Date(row.end_at).toLocaleTimeString("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit" }),
  },
  business: { slug: "demo-detail", brand_name: "Demo Detail", phone: null, email: "owner@fixture.test", dropoff_address: null, timezone: tz, cancellation_window_hours: 0 },
});

// ── THE BROWSER ────────────────────────────────────────────────────────────
const { chromium } = createRequire(new URL("../app/package.json", import.meta.url))("playwright");
const browser = await chromium.launch();
const SIZES = (process.env.AQ_SIZES || "390x844,320x700,768x1024,1440x900").split(",").map((s) => s.split("x").map(Number));
mkdirSync(SHOTS, { recursive: true });
let passed = 0, assertions = 0, completed = 0;
const failures = [], transcript = [];
const check = (name, ok, got = "") => {
  assertions++;
  if (ok) { passed++; console.log(`  ok    ${name}`); return true; }
  failures.push(got ? `${name} - got ${got}` : name);
  console.log(`  FAIL  ${name}${got ? ` - got ${got}` : ""}`);
  return false;
};

const CORS = { "access-control-allow-origin": "*", "access-control-allow-headers": "*" };
const unanswered = [];
async function open(w, h) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
  const page = await ctx.newPage();
  const console_ = [];
  page.on("console", (m) => { if (["error", "warning"].includes(m.type())) console_.push(`${m.type()}: ${m.text()}`); });
  page.on("pageerror", (e) => console_.push(`pageerror: ${e.message}`));
  // THE APP'S SUPABASE ADDRESS IS A FAKE ONE, SET IN THE BROWSER. A belt copy
  // has no app env file (and this check must not carry a key), so its page
  // would render blank; every call the page makes is answered below anyway.
  // One goto per context, so no module is served from cache (gotchas 113).
  await page.route(/\/(src|@fs)\/.*\.(js|jsx|ts|mjs)(\?.*)?$/, async (r) => {
    const res = await r.fetch();
    const body = (await res.text()).replace("import.meta.env = {",
      `import.meta.env = {"VITE_SUPABASE_URL":"${FAKE}","VITE_SUPABASE_ANON_KEY":"placeholder",`);
    await r.fulfill({ response: res, body });
  });
  await page.route(`${FAKE}/**`, (r) => {
    unanswered.push(new URL(r.request().url()).pathname);
    return r.fulfill({ status: 200, contentType: "application/json", headers: CORS, body: "{}" });
  });
  // The business's public profile: the fields the manage page reads, nothing more.
  await page.route(`${FAKE}/rest/v1/rpc/get_public_business_profile`, (r) => r.fulfill({ status: 200, contentType: "application/json", headers: CORS,
    body: JSON.stringify({ business: { id: BIZ, name: "Demo Detail", slug: "demo-detail", timezone: tz, phone: null }, branding: {}, settings: {},
      services: [], add_ons: [], vehicle_sizes: [], hours: [], translations: {} }) }));
  await page.route("**/functions/v1/get-booking-receipt**", (r) => r.fulfill({ status: 200, contentType: "application/json", headers: CORS, body: JSON.stringify(receipt()) }));
  await page.route("**/functions/v1/accept-quote**", async (r) => {
    if (r.request().method() === "OPTIONS") return r.fulfill({ status: 204, headers: CORS });
    const out = await accept(new Request("http://local/functions/v1/accept-quote", { method: "POST", headers: { "Content-Type": "application/json" }, body: r.request().postData() }));
    await r.fulfill({ status: out.status, contentType: "application/json", headers: CORS, body: await out.text() });
  });
  await page.goto(`${BASE}/booking/${ID}`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("button.bk-btn.primary", { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(300);
  return { ctx, page, console_ };
}
const acceptBtn = (page) => page.locator("button.bk-btn.primary", { hasText: /Accept/ });
// The 409 the stale case is built to produce; Chrome logs every 4xx resource.
const expected409 = (l) => /status of 409/.test(l);

for (const [w, h] of SIZES) {
  // NORMAL
  console.log(`\n${w}x${h} normal`);
  reset();
  {
    const { ctx, page, console_ } = await open(w, h);
    const a = check(`${w} normal . the quote card shows Accept $200`, /\$200/.test(await acceptBtn(page).innerText().catch(() => "")),
      `${await acceptBtn(page).count()} buttons; page: ${(await page.locator("body").innerText()).slice(0, 160)}; console: ${console_.join(" | ")}`);
    await page.screenshot({ path: `${SHOTS}/normal-${w}-before-press.png`, fullPage: true });
    if (!a) { await ctx.close(); continue; }
    await acceptBtn(page).click();
    await page.waitForFunction(() => !document.querySelector("button.bk-btn.primary")?.textContent?.includes("Accept"), null, { timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(400);
    const text = await page.locator("body").innerText();
    transcript.push(`${w} normal: row ${row.status} ${row.total_price} | console ${console_.length}`);
    const b = check(`${w} normal . the booking is confirmed at $200`, row.status === "confirmed" && Number(row.total_price) === 200, `${row.status} ${row.total_price}`);
    const c = check(`${w} normal . the page says Confirmed and the Accept button is gone`, /Confirmed/i.test(text) && (await acceptBtn(page).count()) === 0, text.slice(0, 160));
    const d = check(`${w} normal . no error shown`, (await page.locator(".bk-error").count()) === 0);
    const e = check(`${w} normal . console clean`, console_.length === 0, console_.join(" | "));
    await page.screenshot({ path: `${SHOTS}/normal-${w}-after-press.png`, fullPage: true });
    if (a && b && c && d && e) completed++;
    await ctx.close();
  }
  // STALE
  console.log(`\n${w}x${h} stale`);
  reset();
  {
    const { ctx, page, console_ } = await open(w, h);
    const a = check(`${w} stale . the page shows Accept $200`, /\$200/.test(await acceptBtn(page).innerText().catch(() => "")));
    Object.assign(row, { quoted_amount: 300, quoted_at: T2 });   // the detailer re-quotes
    await acceptBtn(page).click();
    await page.waitForSelector(".bk-error", { state: "attached", timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(600);
    const err = await page.locator(".bk-error").innerText().catch(() => "");
    const btn = await acceptBtn(page).innerText().catch(() => "");
    transcript.push(`${w} stale: row ${row.status} ${row.total_price} | error "${err}" | button "${btn}" | console ${console_.join(" | ")}`);
    const b = check(`${w} stale . NOT accepted: still waiting, price unchanged`, row.status === "pending" && Number(row.total_price) === 150, `${row.status} ${row.total_price}`);
    const c = check(`${w} stale . a plain reason naming the new $300`, /price changed to \$300/.test(err), JSON.stringify(err));
    const d = check(`${w} stale . the page now offers the $300 it was refused over`, /\$300/.test(btn), JSON.stringify(btn));
    const box = await page.locator(".bk-error").boundingBox().catch(() => null);
    const e = check(`${w} stale . the reason fits the screen width`, !!box && box.x >= 0 && box.x + box.width <= w + 0.5, JSON.stringify(box));
    const f = check(`${w} stale . console has nothing but the refusal's own 409`, console_.every(expected409), console_.join(" | "));
    if (FREEZE && w === 390) {
      const { freeze } = await import("file:///C:/Users/rando/Downloads/claude/belt/freeze.mjs");
      await freeze(page, FREEZE === "before"
        ? { out: "C:/Users/rando/Downloads/claude/belt/shots/97.16/before.html", label: "Before",
            note: "The page showed $200, the detailer changed it to $300, the customer pressed Accept $200 - and the booking was confirmed at $300 with no word about it.",
            highlightText: "Confirmed" }
        : { out: "C:/Users/rando/Downloads/claude/belt/shots/97.16/after.html", label: "After",
            note: "Same press: it is refused, the page says the price changed to $300, and the new price is now what the button offers. Nothing was accepted.",
            highlight: ".bk-error" });
    }
    await page.locator(".bk-error").scrollIntoViewIfNeeded().catch(() => {});
    await page.screenshot({ path: `${SHOTS}/stale-${w}.png`, fullPage: true });
    if (a && b && c && d && e && f) completed++;
    await ctx.close();
  }
}
await browser.close();
check("run . the handler made no request outside the fake", outside.length === 0, outside.join(", "));
transcript.push(`page calls answered by the catch-all {}: ${[...new Set(unanswered)].join(", ") || "none"}`);

const expected = SIZES.length * 2;
const failed = failures.length;
console.log(`\n${passed} passed, ${failed} failed, ${assertions} assertions, ${completed} of ${expected} cases complete.`);
if (BREAK) console.log(`  note  --break=${BREAK}: this run is a sabotage and MUST be red.`);
mkdirSync("receipts", { recursive: true });
const txt = BREAK ? "receipts/accept-quote-page.sabotage.txt" : "receipts/accept-quote-page.txt";
writeFileSync(txt, [`accept-quote-page ${new Date().toISOString()} break=${BREAK || "none"} base=${BASE}`, ...transcript,
  `${passed} passed, ${failed} failed`, ...failures.map((f) => "FAIL " + f)].join("\n") + "\n");
writeReceipt({
  check_id: "accept-quote-page", started_at, status: failed ? "fail" : "pass",
  expected_targets: expected, discovered_targets: expected, attempted_targets: expected, completed_targets: completed, skipped_targets: 0,
  assertions_executed: assertions, min_assertions: SIZES.length * 11 + 1,
  assertion_floor: "5 normal + 6 stale per width, + 1 run check; every check() unconditional.",
  canary: { id: "pre-fix-server", observed_failure: BREAK ? failed > 0 : null, what: "--break=old-server answers the press with accept-quote at 9a7f5cb9" },
  failures, artifacts: [txt, SHOTS],
  dimensions: { roadmap: "97.16", break: BREAK || null, base: BASE, widths: SIZES.map(([w, h]) => `${w}x${h}`) },
  warnings: ["The booking is in memory and the press runs this checkout's handler in-process; the deployed function is not exercised (publishing is Andrew's)."],
});
process.exit(failed ? 1 : 0);
