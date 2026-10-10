// ROADMAP 9.14c — TYPE BILLS INTO THE REAL /admin FORM AND CHECK THE PROFIT
// FIGURE AGAINST A CALCULATION THAT DOES NOT GO THROUGH THE PRODUCT.
//
//   node scripts/platform-net-live.mjs                        (dev server on :5173)
//   node scripts/platform-net-live.mjs --break=net-on-empty   # sabotage: the server's answer for the empty month is rewritten into 9.14's fault — a profit with no costs entered
//   node scripts/platform-net-live.mjs --break=count-open     # sabotage: the independent calculation counts the UNPAID invoice
//   node scripts/receipt.mjs receipts/platform-net-live.json
//
// WHY A TEST MONTH AND NOT ANDREW'S OWN BILLS. The live database had no paid
// platform invoice in ANY month (2026-10-10), so "paid revenue minus costs" was
// "0 minus costs" everywhere — a comparison that cannot tell a screen that
// ignores revenue from one that does not. Nobody here knows his real bill
// amounts, and a saved bill cannot be removed from the screen. So the run works
// in SEPTEMBER 2025, before the platform existed, and refuses to start if
// anything is already there.
//
// WHAT IT WRITES, ALL OF IT REMOVED IN `finally` (project kguqylyzgyzfktkfnhjb,
// refuses any other):
//   * a throwaway platform admin (`scripts/admin-account.mjs`);
//   * three fixture invoices on the demo business — $40 paid in September,
//     $539 marked OPEN but dated inside September (the status filter is the
//     only thing keeping it out), $100 paid in October;
//   * four bills, saved THROUGH THE FORM by the deployed `platform-admin`:
//     three at 1440, one more at 392.
// What it leaves: `platform_cost_add` writes one `platform_admin_events` row per
// saved bill. An audit trail is not cleaned up after; four rows per run, admin
// email `platform-net-live-test@…`.

import "../tests/_env.mjs";
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
import { writeReceipt } from "./receipt.mjs";
import { settle, watchConsole } from "./lib/bookingWalk.mjs";
import { dropAdmin, makeAdmin } from "./admin-account.mjs";

const { chromium } = createRequire(import.meta.url)("./../app/node_modules/playwright/index.js");

const URL_ = process.env.SUPABASE_URL;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const REF = process.env.SUPABASE_PROJECT_REF;
const PLATFORM = "kguqylyzgyzfktkfnhjb";
if (!URL_ || !SERVICE || !REF) {
  console.error("Missing SUPABASE_URL / _SERVICE_ROLE_KEY / _PROJECT_REF. Nothing measured, no receipt written.");
  process.exit(1);
}
if (REF !== PLATFORM || !URL_.includes(`${PLATFORM}.supabase.co`)) {
  console.error(`Refusing: project is ${REF}, not ${PLATFORM}. Nothing was touched.`);
  process.exit(1);
}

const BREAK = (process.argv.find((a) => a.startsWith("--break=")) || "").slice(8);
if (BREAK && !["net-on-empty", "count-open"].includes(BREAK)) { console.error(`Unknown --break=${BREAK}. Nothing touched.`); process.exit(2); }
const BASE = process.env.BASE || "http://localhost:5173";
const SHOTS = "C:/Users/rando/Downloads/claude/belt/shots/9.14c";
const ADMIN_EMAIL = "platform-net-live-test@detailplatform.com"; // mail-sink: a login; autoconfirm is on, no mail
const MARK = "9.14c test bill";

const TEST = { ym: "2025-09", day1: "2025-09-01", name: "September 2025" };
const EMPTY = { ym: "2025-10", day1: "2025-10-01", name: "October 2025" };
const MONTHS = [TEST.day1, EMPTY.day1];
const FIXTURES = [
  { id: "in_9_14c_fixture_paid", amount_cents: 4000, status: "paid", paid_at: "2025-09-14T18:30:00Z" },
  { id: "in_9_14c_fixture_open", amount_cents: 53900, status: "open", paid_at: "2025-09-20T18:30:00Z" },
  { id: "in_9_14c_fixture_oct", amount_cents: 10000, status: "paid", paid_at: "2025-10-15T18:30:00Z" },
];
// Typed as dollars, declared as cents BY HAND — the calculation never borrows
// the screen's own dollars-to-cents conversion.
const BILLS = {
  1440: [{ kind: "hosting", label: "Hosting", typed: "19", cents: 1900 },
    { kind: "email", label: "Email", typed: "20", cents: 2000 },
    { kind: "domain", label: "Domain", typed: "12.99", cents: 1299 }],
  392: [{ kind: "hosting", label: "Hosting", typed: "5.50", cents: 550 }],
};
const SIZES = [{ w: 1440, h: 900 }, { w: 392, h: 844 }];

const started = new Date();
let assertions = 0;
const failures = [];
const check = (label, ok, detail = "") => {
  assertions++;
  if (!ok) failures.push(`${label}${detail ? ` — ${detail}` : ""}`);
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${label}${!ok && detail ? `\n          ${detail}` : ""}`);
  return ok;
};
const H = { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, "Content-Type": "application/json" };
const rest = async (path, init = {}) => {
  const r = await fetch(`${URL_}/rest/v1/${path}`, { ...init, headers: { ...H, ...(init.headers || {}) } });
  const t = await r.text();
  // A failed read is not an empty one: throw, never return [].
  if (!r.ok) throw new Error(`${init.method || "GET"} ${path.split("?")[0]} → ${r.status} ${t.slice(0, 200)}`);
  return t ? JSON.parse(t) : null;
};
const inList = (xs) => `(${xs.map((x) => `"${x}"`).join(",")})`;
const sum = (xs) => xs.reduce((a, x) => a + x.amount_cents, 0);
const ymOf = (name) => { const d = new Date(`1 ${name}`); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; };
const shift = (ym, n) => { const d = new Date(Number(ym.slice(0, 4)), Number(ym.slice(5, 7)) - 1 + n, 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; };
/** "$1,234.56" → 123456. NaN when the text holds no figure. */
const cents = (s) => { const d = String(s ?? "").replace(/[^0-9.]/g, ""); return d ? Math.round(parseFloat(d) * 100) : NaN; };

// THE INDEPENDENT CALCULATION, from the fixture list and the bills typed so far.
// It shares nothing with `_shared/platformNet.js` or the screen.
const expectFor = (bills) => {
  const revenue = FIXTURES.filter((f) => (BREAK === "count-open" || f.status === "paid") && f.paid_at.startsWith(TEST.ym))
    .reduce((a, f) => a + f.amount_cents, 0);
  const byCat = {};
  for (const b of bills) byCat[b.kind] = (byCat[b.kind] ?? 0) + b.cents;
  const cost = bills.reduce((a, b) => a + b.cents, 0);
  return { revenue, cost, net: revenue - cost, count: bills.length, byCat };
};

const dims = { project: REF, test_month: TEST.day1, empty_month: EMPTY.day1, break: BREAK || null, fixtures: FIXTURES };
const canary = { id: "the same screen reading, compared against the expected net plus one cent, must MISMATCH", observed_failure: false };
const expected = ["guard + fixtures", ...SIZES.map((s) => `browser ${s.w}`), "cleanup"];
let completed = 0;
let rewrites = 0;
const consoleNoise = [];

console.log(`9.14c — the owner profit screen against the live database, project ${REF}${BREAK ? `\n*** --break=${BREAK}: this run is a sabotage, not a result ***` : ""}\n`);

const cleanup = async (adminId) => {
  await rest(`platform_costs?period_month=in.${inList(MONTHS)}&note=like.${encodeURIComponent(MARK)}*`, { method: "DELETE" });
  if (adminId) await rest(`platform_costs?period_month=in.${inList(MONTHS)}&entered_by=eq.${adminId}`, { method: "DELETE" });
  await rest(`platform_invoices?id=in.${inList(FIXTURES.map((f) => f.id))}`, { method: "DELETE" });
};

let acct = null, browser = null, wrote = false;
try {
  // ── 1. THE TEST MONTHS ARE NOBODY'S, THEN THE FIXTURES ─────────────────────
  console.log("1. the test months are empty, then the fixture invoices go in");
  await cleanup(null); // a killed run's leftovers, by their own marks only
  const live = await (await fetch(`${URL_}/auth/v1/admin/users?per_page=1000`, { headers: H })).json().catch(() => ({}));
  const left = (live.users ?? []).find((u) => u.email === ADMIN_EMAIL);
  if (left) { await dropAdmin(URL_, SERVICE, left.id); console.log("  (deleted a throwaway admin a killed run left)"); }
  const preCosts = await rest(`platform_costs?select=id&period_month=in.${inList(MONTHS)}`);
  const preInv = await rest(`platform_invoices?select=id&paid_at=gte.2025-09-01&paid_at=lt.2025-11-01`);
  dims.pre = { costs: preCosts.length, invoices: preInv.length };
  if (!check("1 · September and October 2025 hold no bills and no invoices before the run", preCosts.length === 0 && preInv.length === 0, JSON.stringify(dims.pre))) {
    throw new Error("the test months are not empty — somebody else's data; nothing written");
  }
  const [biz] = await rest(`businesses?select=id&slug=eq.demo-detail`);
  check("1 · the demo business is there to hang the fixture invoices on", !!biz?.id);
  wrote = true;
  await rest("platform_invoices", { method: "POST", headers: { Prefer: "return=minimal" },
    body: JSON.stringify(FIXTURES.map((f) => ({ ...f, business_id: biz.id, number: f.id, currency: "usd" }))) });
  check("1 · the three fixture invoices are in", (await rest(`platform_invoices?select=id&id=in.${inList(FIXTURES.map((f) => f.id))}`)).length === 3);
  acct = await makeAdmin(URL_, SERVICE, ADMIN_EMAIL);
  check("1 · a throwaway platform admin exists", !!acct?.id);
  completed++;

  // ── 2. THE REAL SCREEN ─────────────────────────────────────────────────────
  mkdirSync(SHOTS, { recursive: true });
  browser = await chromium.launch();
  let signedIn = null;
  const typed = [];
  for (const s of SIZES) {
    const where = `${s.w}`;
    console.log(`\n2. ${where}: type bills into /admin and read the month back`);
    const ctx = await browser.newContext({ viewport: { width: s.w, height: s.h }, storageState: signedIn || undefined });
    const page = await ctx.newPage();
    const noise = [];
    watchConsole(page, where, noise);
    if (BREAK === "net-on-empty") {
      // 9.14's failing-looks-like, put in the server's mouth: a profit for a month nobody entered costs for.
      await page.route("**/functions/v1/platform-admin", async (route) => {
        const body = JSON.parse(route.request().postData() || "{}");
        if (body.action !== "platform_net" || !String(body.period).startsWith(EMPTY.ym)) return route.continue();
        const res = await route.fetch();
        const j = await res.json();
        rewrites++;
        await route.fulfill({ response: res, json: { ...j, costs_entered: true, cost_cents: 0, net_cents: j.revenue_cents, cost_count: 0, by_category: {} } });
      });
    }
    await page.goto(`${BASE}/admin`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("input[type=email], .pa-top", { timeout: 40000 });
    if (await page.locator("input[type=email]").count()) {
      await page.fill("input[type=email]", acct.email);
      await page.fill("input[type=password]", acct.password);
      await page.click("form button.pa-btn");
      await page.waitForSelector(".pa-top", { timeout: 40000 });
      signedIn = await ctx.storageState();
    }
    await page.waitForSelector(".pa-body", { timeout: 40000 });
    await page.locator(".pa-tab").filter({ hasText: "Money" }).first().click();
    const sec = page.locator(".pa-sec").filter({ has: page.locator("h2", { hasText: "Did we make money?" }) });
    const heading = sec.locator(".pa-month strong");
    await heading.waitFor({ state: "attached", timeout: 40000 });

    // Settled on the RESPONSE, not on the text going quiet (docs/gotchas.md 109).
    const netAnswer = (ym) => page.waitForResponse((r) => r.url().includes("/functions/v1/platform-admin")
      && /"platform_net"/.test(r.request().postData() || "") && (r.request().postData() || "").includes(ym), { timeout: 40000 });
    const settleMonth = async () => {
      await sec.locator(".pa-net, .pa-err").first().waitFor({ state: "attached", timeout: 40000 });
      await settle(page, 600);
    };
    const goTo = async (m) => {
      for (let i = 0; i < 40; i++) {
        const prev = await heading.textContent();
        const cur = ymOf(prev);
        if (cur === m.ym) break;
        const step = cur > m.ym ? -1 : 1;
        // Armed BEFORE the click that lands on the month, so its answer cannot slip past.
        const wait = shift(cur, step) === m.ym ? netAnswer(m.ym) : null;
        await sec.getByRole("button", { name: step < 0 ? "Previous month" : "Next month" }).click();
        while ((await heading.textContent()) === prev) await page.waitForTimeout(20);
        if (wait) await wait;
      }
      await settleMonth();
      return ymOf(await heading.textContent()) === m.ym;
    };
    const read = () => sec.evaluate((el) => ({
      rows: [...el.querySelectorAll(".pa-rows .pa-row")].map((r) => [r.querySelector(".pa-k")?.textContent ?? "", r.querySelector(".pa-v")?.textContent ?? ""]),
      netWord: el.querySelector(".pa-net .pa-k")?.textContent ?? null,
      netFig: el.querySelector(".pa-net strong")?.textContent ?? null,
      unknown: !!el.querySelector(".pa-net.pa-unknown"),
      err: el.querySelector(".pa-err")?.textContent ?? null,
      text: el.textContent.replace(/\s+/g, " ").trim(),
    }));

    check(`2 · ${where}: reached ${TEST.name}`, await goTo(TEST), await heading.textContent());

    // THE REFUSED CASE ON THE FORM: a negative amount cannot be saved.
    const amount = sec.locator(".pa-costform .money-field input");
    const save = sec.getByRole("button", { name: "Save this bill" });
    await amount.fill("-5");
    check(`2 · ${where}: a negative amount leaves "Save this bill" disabled`, await save.isDisabled());
    await amount.fill("");

    // THE CASE THAT SHOULD WORK: each bill through the form, then the month re-read.
    for (const b of BILLS[s.w]) {
      const seg = sec.getByRole("radio", { name: b.label });
      await seg.click();
      check(`2 · ${where}: "${b.label}" is the chosen kind (aria-checked flipped — gotchas 108)`, (await seg.getAttribute("aria-checked")) === "true");
      await amount.fill(b.typed);
      await sec.locator(".pa-costform input[type=text]").fill(`${MARK} — ${b.label} $${b.typed}, removed when the check finishes`);
      const saved = page.waitForResponse((r) => r.url().includes("/functions/v1/platform-admin") && /"platform_cost_add"/.test(r.request().postData() || ""), { timeout: 40000 });
      const reread = netAnswer(TEST.ym);
      await save.click();
      const res = await saved;
      const body = await res.json().catch(() => null);
      const sent = JSON.parse(res.request().postData() || "{}");
      check(`2 · ${where}: ${b.label} $${b.typed} saved — 200 with an id`, res.status() === 200 && body?.success === true && !!body?.id, `${res.status()} ${JSON.stringify(body)}`);
      check(`2 · ${where}: it was sent as ${b.cents} integer cents, "${b.kind}", for ${TEST.ym}`, sent.amount_cents === b.cents && sent.category === b.kind && sent.period_month === TEST.ym, JSON.stringify(sent));
      await reread;
      await settleMonth();
      typed.push(b);
    }
    check(`2 · ${where}: the form emptied itself after the last save`, (await amount.inputValue()) === "");

    // THE MONTH, READ OFF THE SCREEN, AGAINST THE CALCULATION.
    const want = expectFor(typed);
    const got = await read();
    dims[`screen_${where}_test`] = { got, want };
    const row = (re) => got.rows.find(([k]) => re.test(k));
    check(`2 · ${where}: no error on the month`, !got.err, got.err);
    check(`2 · ${where}: paid revenue on screen = $${want.revenue / 100} (paid invoices dated in ${TEST.name} only)`, cents(row(/^Paid to us in /)?.[1]) === want.revenue, JSON.stringify(row(/^Paid to us in /)));
    const costRow = row(/^Costs entered · /);
    check(`2 · ${where}: total costs on screen = $${want.cost / 100}, from ${want.count} bills`, cents(costRow?.[1]) === want.cost && new RegExp(`· ${want.count} bills?$`).test(costRow?.[0] ?? ""), JSON.stringify(costRow));
    const catRows = Object.fromEntries(got.rows.filter(([k]) => /^· /.test(k)).map(([k, v]) => [k.slice(2).toLowerCase(), cents(v)]));
    check(`2 · ${where}: each category on screen = the bills typed into it`, JSON.stringify(Object.entries(catRows).sort()) === JSON.stringify(Object.entries(want.byCat).sort()), `screen ${JSON.stringify(catRows)} want ${JSON.stringify(want.byCat)}`);
    const signed = (got.netWord === "We lost" ? -1 : 1) * cents(got.netFig);
    check(`2 · ${where}: the net on screen = revenue − costs = ${want.net < 0 ? "a loss of " : ""}$${Math.abs(want.net) / 100}`, signed === want.net && !got.unknown, `${got.netWord} ${got.netFig}`);
    check(`2 · ${where}: a loss is worded as a loss`, want.net < 0 ? got.netWord === "We lost" : got.netWord !== "We lost", got.netWord);
    // THE CANARY: the same reading against a figure one cent off must disagree.
    if (signed !== want.net + 1 && Number.isFinite(signed)) canary.observed_failure = true;
    await sec.screenshot({ path: `${SHOTS}/test-month-${s.w === 1440 ? "laptop" : "phone"}.png` });

    // THE DATABASE, READ DIRECTLY — the second independent source.
    const dbCosts = await rest(`platform_costs?select=category,amount_cents,note,entered_by&period_month=eq.${TEST.day1}`);
    const dbInv = await rest(`platform_invoices?select=amount_cents&status=eq.paid&paid_at=gte.${TEST.day1}&paid_at=lt.${EMPTY.day1}`);
    dims[`db_${where}`] = { costs: dbCosts, paid_revenue: sum(dbInv) };
    check(`2 · ${where}: the table holds exactly the bills typed, by this admin`, dbCosts.length === typed.length && dbCosts.every((r) => r.entered_by === acct.id)
      && JSON.stringify(dbCosts.map((r) => `${r.category}:${r.amount_cents}`).sort()) === JSON.stringify(typed.map((b) => `${b.kind}:${b.cents}`).sort()), JSON.stringify(dbCosts));
    check(`2 · ${where}: the screen's net = the database's paid revenue − the database's costs`, signed === sum(dbInv) - sum(dbCosts), `${signed} vs ${sum(dbInv)} − ${sum(dbCosts)}`);

    // THE EMPTY MONTH: revenue arrived, nobody entered costs. No net, of any kind.
    check(`2 · ${where}: reached ${EMPTY.name}`, await goTo(EMPTY), await heading.textContent());
    const e = await read();
    dims[`screen_${where}_empty`] = e;
    check(`2 · ${where}: ${EMPTY.name} shows its $100 paid revenue`, cents(e.rows.find(([k]) => /^Paid to us in /.test(k))?.[1]) === 10000, JSON.stringify(e.rows));
    check(`2 · ${where}: ${EMPTY.name} reads "Costs not entered for ${EMPTY.name}"`, e.unknown && e.netFig === `Costs not entered for ${EMPTY.name}`, `${e.netWord} ${e.netFig}`);
    check(`2 · ${where}: ${EMPTY.name} prints no net and no cost figure`, !/We kept|We lost|We broke even|Costs entered/.test(e.text) && !/\$/.test(e.netFig ?? ""), e.text.slice(0, 300));
    await sec.screenshot({ path: `${SHOTS}/empty-month-${s.w === 1440 ? "laptop" : "phone"}.png` });

    check(`2 · ${where}: console clean`, noise.length === 0, noise.join(" | "));
    consoleNoise.push(...noise);
    await ctx.close();
    completed++;
  }
  if (BREAK === "net-on-empty") console.log(`\n  sabotage landed: ${rewrites} platform_net answers rewritten`);
  dims.rewrites = rewrites;
} catch (e) {
  const msg = acct ? String(e.stack || e).split(acct.password).join("[password]") : String(e.stack || e);
  check("the run completed without throwing", false, msg);
} finally {
  await browser?.close();
  // ── 3. NOTHING LEFT BEHIND ─────────────────────────────────────────────────
  console.log("\n3. cleanup");
  if (wrote) {
    try {
      await cleanup(acct?.id);
      const c = await rest(`platform_costs?select=id&period_month=in.${inList(MONTHS)}`);
      const i = await rest(`platform_invoices?select=id&id=in.${inList(FIXTURES.map((f) => f.id))}`);
      if (check("3 · the test bills and fixture invoices are gone", c.length === 0 && i.length === 0, `${c.length} bills, ${i.length} invoices left`)) completed++;
    } catch (e) { check("3 · cleanup ran", false, String(e.message)); }
  }
  if (acct) { await dropAdmin(URL_, SERVICE, acct.id); console.log("  throwaway admin deleted"); }
}

const ok = failures.length === 0 && canary.observed_failure && completed === expected.length && (BREAK !== "net-on-empty" || rewrites > 0);
writeReceipt({
  check_id: "platform-net-live",
  started_at: started.toISOString(),
  status: ok ? "pass" : "fail",
  expected_targets: expected.length,
  discovered_targets: expected.length,
  attempted_targets: expected.length,
  completed_targets: completed,
  skipped_targets: 0,
  assertions_executed: assertions,
  min_assertions: 49,
  assertion_floor: "4 setup + 1440 (3 bills at 3 asserts each, plus 16) + 392 (1 bill at 3 asserts, plus 16) + 1 cleanup = 49, fixed by the code; a throw adds its own failing line rather than dropping any.",
  failures,
  dimensions: dims,
  artifacts: ["scripts/platform-net-live.mjs", "app/src/admin/AdminPage.jsx", "supabase/functions/platform-admin/index.ts", "supabase/functions/_shared/platformNet.js"],
  warnings: [
    "The bills are TEST bills in September 2025, removed when the run ends. Andrew's real bills were not entered: their amounts are recorded nowhere in this repo and a saved bill cannot be removed from the screen.",
    "Revenue is a fixture: the live database held no paid platform invoice in any month on 2026-10-10, so a real-revenue month did not exist to check.",
    `platform_cost_add writes one platform_admin_events row per saved bill; those audit rows are left in place. ${consoleNoise.length} console lines this run.`,
  ],
  canary,
});
console.log(`\n${ok ? "PASS" : "FAIL"} — ${assertions} assertions, ${failures.length} failed; ${completed} of ${expected.length} targets; canary ${canary.observed_failure ? "caught" : "MISSED"}.`);
process.exit(ok ? 0 : 1);
