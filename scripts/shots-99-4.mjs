// ROADMAP 99.4 — photographs the 12 fixed buttons that the first pass could not reach.
// Run: set -a; . ./.env; set +a; node scripts/shots-99-4.mjs   (dev server on :5173)
//
// EVERY STATE IS FAKED IN THE PAGE with page.route(); NOTHING IS WRITTEN to the database.
// The real response is fetched and one row added/changed where that is possible, so the
// screen around the button is the real one. Public pages (booking, plan) get a whole faked
// answer from the server function, because they take an id from an email.
// Writes: .manager-shots/99.4/<name>-<width>.png and _report3.json.
import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { writeReceipt } from "./receipt.mjs";
const REPO = process.cwd();
const { chromium } = createRequire(import.meta.url)(join(REPO, "app/node_modules/playwright/index.js"));
const { demoOwner } = await import(`file:///${REPO.replace(/\\/g, "/")}/scripts/lib/demoOwner.mjs`);
const OUT = join(REPO, ".manager-shots/99.4");
mkdirSync(OUT, { recursive: true });
const BASE = process.env.BASE_URL || "http://localhost:5173";
const CORS = { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "*", "content-type": "application/json" };
const future = (d) => new Date(Date.now() + d * 864e5).toISOString();
const ymd = (d) => future(d).slice(0, 10);

const stubFn = (page, name, body) => page.route(`**/functions/v1/${name}`, (route) => {
  if (route.request().method() === "OPTIONS") return route.fulfill({ status: 204, headers: CORS });
  return route.fulfill({ status: 200, headers: CORS, body: JSON.stringify(body) });
});
// GET to a table: let the real answer through, then change it. Writes are never touched.
const editRows = (page, table, fn, only = () => true) => page.route(`**/rest/v1/${table}?*`, async (route) => {
  const req = route.request();
  if (req.method() !== "GET" || !only(req.url())) return route.continue();
  const res = await route.fetch();
  let rows; try { rows = await res.json(); } catch { return route.fulfill({ response: res }); }
  const single = !Array.isArray(rows);
  const out = fn(single ? [rows] : rows, req.url());
  return route.fulfill({ response: res, json: single ? out[0] : out });
});

const BREAK = (process.argv.find((a) => a.startsWith("--break=")) ?? "").slice(8);   // "ghost": put the old class back on each target
const started_at = new Date().toISOString();
const EXPECTED = 24;   // 12 buttons x 2 widths
// PAINTED = a border with some colour in it, or a ring drawn with box-shadow. A `btn ghost` has
// a 1px border whose colour is transparent, which is why a width test alone calls it ringed.
const alphaOf = (c) => { if (!c || c === "transparent") return 0; const m = c.match(/\/\s*([\d.]+)\s*\)|rgba\([^)]*,\s*([\d.]+)\)/); return m ? Number(m[1] ?? m[2]) : 1; };
const isPainted = (d) => (d.bw > 0 && d.bs !== "none" && alphaOf(d.bc) > 0) || (d.shadow !== "none" && /inset/.test(d.shadow) && alphaOf(d.shadow.split(" ")[0]) !== 0);
const measure = (n) => { const s = getComputedStyle(n); return { cls: n.className, bw: parseFloat(s.borderTopWidth), bs: s.borderTopStyle, bc: s.borderTopColor, shadow: s.boxShadow }; };
const canary = { painted: null };
const report = [];
const consoleBad = [];
async function login(page) {
  await page.goto(`${BASE}/app`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("input[type=email], .tabbar, .rail", { timeout: 30000 });
  const o = demoOwner();
  if (await page.locator("input[type=email]").count()) {
    await page.fill("input[type=email]", o.email); await page.fill("input[type=password]", o.password);
    await page.click("form button.btn.primary");
    await page.waitForSelector(".tabbar, .rail, nav", { timeout: 30000 });
  }
}
async function look(page, w, name, locator, extra = {}) {
  const el = typeof locator === "string" ? page.locator(locator).first() : locator.first();
  try {
    await el.waitFor({ state: "visible", timeout: 20000 });
    await el.scrollIntoViewIfNeeded();
    await page.waitForTimeout(900);
    if (BREAK === "ghost") await el.evaluate((n) => { n.classList.add(n.classList.contains("bk-btn") ? "ghost" : "ghost"); });
    await page.waitForTimeout(BREAK ? 600 : 0);   // the transition's first frame is not the answer (gotchas 119)
    const css = await el.evaluate(measure);
    css.painted = isPainted(css);
    if (!css.painted) throw new Error(`${name}: reads as bare words (border ${css.bw}px ${css.bc}, shadow ${css.shadow})`);
    const box = await el.boundingBox();
    await page.screenshot({ path: join(OUT, `${name}-${w}.png`) });
    report.push({ name, w, ok: true, css, box: box && { w: Math.round(box.width), h: Math.round(box.height) }, ...extra });
  } catch (e) {
    await page.screenshot({ path: join(OUT, `FAILED-${name}-${w}.png`) }).catch(() => {});
    report.push({ name, w, ok: false, why: String(e.message).split("\n")[0] });
  }
}

const SCENES = {
  async team(page, w) {
    const me = { business_id: null, user_id: "00000000-0000-4000-8000-0000000000aa", role: "staff", label: "Detailer", permissions: ["requests"], email: "sam.ortiz@example.com", first_name: "Sam" };
    await editRows(page, "business_users", (rows, url) => rows.some((r) => r.role === "owner") && /business_id=eq/.test(url) && !/user_id=eq/.test(url) ? [...rows, { ...rows[0], ...me, business_id: rows[0].business_id }] : rows);
    await editRows(page, "business_invites", (rows) => [{ id: "00000000-0000-4000-8000-0000000000bb", business_id: rows[0]?.business_id ?? "x", email: "jordan.lee@example.com", role: "staff", label: "Helper", permissions: [], expires_at: future(5), created_at: future(-1), accepted_at: null, revoked_at: null }]);
    await page.goto(`${BASE}/app?settings=team`);
    // The card is found by the staff member THIS SCRIPT injected (`me` above), not by product
    // wording: no rename can move a fixture's own email (ROADMAP 98.11).
    const card = page.locator(".card", { hasText: me.email });
    await card.waitFor({ timeout: 20000 });
    await card.getByRole("button", { name: "Change" }).click();
    await look(page, w, "team-remove", page.getByRole("button", { name: "Remove from the team" }));
    await look(page, w, "team-revoke", page.getByRole("button", { name: "Revoke" }));
  },
  async expense(page, w) {
    await page.goto(`${BASE}/app/money`);
    await page.locator('[data-tour="expenses"] button', { hasText: "Add" }).first().click();
    await look(page, w, "expense-note", page.getByRole("button", { name: "Add a note or change the date" }));
    await page.getByRole("button", { name: "Add a note or change the date" }).click();
    await look(page, w, "expense-receipt", page.locator("label.btn", { hasText: "Add a photo of the receipt" }));
  },
  async notifications(page, w) {
    await page.context().grantPermissions(["notifications"], { origin: BASE });
    await page.addInitScript(() => {
      try { Object.defineProperty(Notification, "permission", { get: () => "granted" }); } catch {}
      try { navigator.serviceWorker.getRegistration = async () => ({ pushManager: { getSubscription: async () => ({ endpoint: "faked" }) } }); } catch {}
    });
    await page.goto(`${BASE}/app?settings=notifications`);
    await look(page, w, "notifications-off-device", page.getByRole("button", { name: "Turn off on this device" }));
  },
  async payments(page, w) {
    await stubFn(page, "connect-account", { available: true, connected: true, accountHint: "4F2A", chargesEnabled: true, cardPaymentsEnabled: false, detail: "Card payments are connected and switched off." });
    await page.goto(`${BASE}/app?settings=payments`);
    await look(page, w, "payments-disconnect", page.getByRole("button", { name: "Disconnect Stripe" }));
  },
  async plans(page, w) {
    const bid = "00000000-0000-4000-8000-000000000001", pid = "00000000-0000-4000-8000-0000000000e1", cid = "00000000-0000-4000-8000-0000000000c1", mid = "00000000-0000-4000-8000-0000000000a1";
    const plan = { id: pid, business_id: bid, name: "Monthly refresh", description: "One refresh a month.", repeats: true, cadence_count: 1, cadence_unit: "month", visits_per_period: 1, price_kind: "monthly", price_amount: 120, term_months: null, is_active: true, sort_order: 0 };
    const member = { id: mid, business_id: bid, customer_id: cid, plan_id: pid, status: "active", started_on: ymd(-60), accrue_from: ymd(-60), price_kind: "monthly", price_amount: 120, notes: "", created_at: future(-60) };
    await editRows(page, "plans", () => [plan]);
    await editRows(page, "plan_members", () => [member]);
    await editRows(page, "customers", (rows) => [{ id: cid, name: "Dana Whitfield", phone: "5035550142" }], (u) => u.includes("select=id%2Cname%2Cphone"));
    await editRows(page, "plan_visits", () => [{ member_id: mid, kind: "grant", delta: 2, due_on: ymd(-30), note: null }]);
    await editRows(page, "bookings", () => [], (u) => u.includes("plan_member_id"));
    await page.goto(`${BASE}/app?settings=plans`);
    await page.getByRole("button", { name: /Dana Whitfield/ }).click();
    // CANARY: the Cancel beside Save is a deliberate quiet partner, so the detector must call it bare.
    canary.painted = await page.getByRole("button", { name: "Cancel" }).first().evaluate(measure).then(isPainted);
    await look(page, w, "plans-skip-visit", page.getByRole("button", { name: "Skip a visit" }));
    await look(page, w, "plans-add-visit", page.getByRole("button", { name: "Add a visit" }));
  },
  async job(page, w, ids) {
    const id = ids[0];
    if (!id) { report.push({ name: "job", w, ok: false, why: "no booking id seen" }); return; }
    await editRows(page, "bookings", (rows) => rows.map((r) => ({ ...r, customer_email: null, final_amount: r.final_amount ?? 150, status: r.status === "cancelled" ? "completed" : r.status })), (u) => u.includes(`id=eq.${id}`));
    await page.goto(`${BASE}/job/${id}`);
    await look(page, w, "job-dashboard", page.getByRole("button", { name: "Dashboard" }));
    await look(page, w, "job-receipt-link", page.getByRole("link", { name: "Open the customer's receipt page" }));
  },
};

const PUBLIC = {
  async manage(page, w) {
    const id = "00000000-0000-4000-8000-0000000000cc";
    await stubFn(page, "get-booking-receipt", {
      booking: { id, status: "confirmed", service_type: "Full detail", services: [{ name: "Full detail", price: 220 }], add_ons: [], vehicles: [], vehicle_model: "2019 Honda Civic", vehicle_size_fee: 0, travel_fee: 0, subtotal: 220, total_price: 220, promo_discount: 0, monthly_plan_discount: 0, price_adjustments: [],
        booking_date: ymd(6), start_time: "10:00", end_time: "13:00", start_at: future(6), end_at: future(6.12), customer_name: "Dana Whitfield", customer_email: "dana@example.com", customer_phone: "5035550142", customer_address: "412 Alder St, Portland, OR", customer_notes: "", address_source: "typed" },
      business: { slug: "demo-detail", name: "Demo Detail", phone: "5035550100", email: "hello@example.com", cancellation_window_hours: 24 }, group: [], card: null,
    });
    await page.goto(`${BASE}/booking/${id}`);
    await look(page, w, "manage-call", page.locator("a.bk-btn", { hasText: "Call" }));
  },
  async planmember(page, w) {
    const id = "00000000-0000-4000-8000-0000000000dd";
    await stubFn(page, "plan-link", {
      member: { id, status: "active", started_on: ymd(-60), ended_on: null, price_kind: "fixed", price_amount: 120, accrue_from: ymd(-60) },
      plan: { id: "00000000-0000-4000-8000-0000000000ee", name: "Monthly refresh", description: "One interior and exterior refresh each month.", cadence_unit: "month", cadence_count: 1 },
      visits: [{ member_id: id, kind: "grant", delta: 2, due_on: ymd(-30), note: null }], used: [], customer_name: "Dana Whitfield",
      business: { slug: "demo-detail", name: "Demo Detail" },
    });
    await page.goto(`${BASE}/plan/${id}`);
    await look(page, w, "planmember-phone", page.locator("a.bk-btn", { hasText: /\d{3}/ }).last());
  },
};

const names = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const only = names.length ? new Set(names) : null;
const browser = await chromium.launch();
for (const [w, h] of [[392, 844], [1440, 900]]) {
  const run = async (group, scenes, needsLogin) => {
    for (const [key, fn] of Object.entries(scenes)) {
      if (only && !only.has(key)) continue;
      const ctx = await browser.newContext({ viewport: { width: w, height: h } });
      const page = await ctx.newPage();
      const ids = [];
      page.on("response", async (r) => { if (r.url().includes("/rest/v1/bookings") && r.request().method() === "GET" && !ids.length) { try { const j = await r.json(); const a = Array.isArray(j) ? j : [j]; if (a[0]?.id) ids.push(a[0].id); } catch {} } });
      page.on("console", (m) => { if (["error", "warning"].includes(m.type())) consoleBad.push({ scene: key, w, type: m.type(), text: m.text().slice(0, 200) }); });
      page.on("pageerror", (e) => consoleBad.push({ scene: key, w, type: "pageerror", text: String(e).slice(0, 200) }));
      try {
        if (needsLogin) await login(page);
        if (key === "job") { await page.goto(`${BASE}/app/calendar`); await page.waitForTimeout(3000); }
        await fn(page, w, ids);
      } catch (e) { report.push({ name: key, w, ok: false, why: String(e.message).split("\n")[0] }); }
      await ctx.close();
    }
  };
  await run("app", SCENES, true);
  await run("public", PUBLIC, false);
}
await browser.close();
writeFileSync(join(OUT, BREAK ? `_report3.${BREAK}.json` : "_report3.json"), JSON.stringify({ report, console: consoleBad }, null, 1));
const okCount = report.filter((r) => r.ok).length;
const failures = [
  ...report.filter((r) => !r.ok).map((r) => `${r.name} @${r.w}: ${r.why}`),
  ...consoleBad.map((c) => `console ${c.type} in ${c.scene} @${c.w}: ${c.text}`),
  ...(canary.painted === false ? [] : [`canary: the quiet Cancel beside Save was read as ${canary.painted === null ? "not measured" : "ringed"} - this check cannot tell a ring from bare words`]),
];
console.log(`buttons photographed ${okCount} of ${EXPECTED}; console messages ${consoleBad.length}; canary (bare Cancel) ${canary.painted === false ? "caught" : "MISSED"}${BREAK ? `; SABOTAGE --break=${BREAK}` : ""}`);
for (const f of failures) console.log("  FAIL " + f);
if (only) { console.log("partial run (scene names given): no receipt written"); process.exit(failures.length ? 1 : 0); }
const { path } = writeReceipt({
  check_id: "shots-99-4", started_at, status: failures.length === 0 ? "pass" : "fail",
  expected_targets: EXPECTED, discovered_targets: report.length, attempted_targets: report.length, completed_targets: okCount, skipped_targets: 0,
  assertions_executed: report.length + 2, min_assertions: EXPECTED, failures,
  artifacts: [".manager-shots/99.4/"], warnings: [],
  dimensions: { widths: "392, 1440", ...(BREAK ? { break: BREAK } : {}) },
  canary: { id: "the quiet Cancel beside Save, which is bare on purpose", observed_failure: canary.painted === false, caught_by: ["computed border/ring"], findings: [canary.painted === false ? "read as bare words" : "NOT read as bare"] },
});
console.log(`receipt ${path}`);
process.exit(failures.length ? 1 : 0);
