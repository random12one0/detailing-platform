// ROADMAP 9.14c — TYPE BILLS INTO THE REAL /admin FORM AND CHECK THE PROFIT
// FIGURE AGAINST A CALCULATION THAT DOES NOT GO THROUGH THE PRODUCT.
//
//   node scripts/platform-net-live.mjs                        (dev server on :5173)
//   SHOTS=<dir> node scripts/platform-net-live.mjs            (screenshots go elsewhere; sabotage shots are prefixed)
//   node scripts/platform-net-live.mjs --break=net-on-empty   # sabotage: the server's answer for the empty month is rewritten into 9.14's fault — a profit with no costs entered
//   node scripts/platform-net-live.mjs --break=count-open     # sabotage: the independent calculation counts the UNPAID invoice
//   node scripts/platform-net-live.mjs --break=hide-missing-note  # sabotage: the profit note is hidden with CSS, the painted check must go red
//   node scripts/receipt.mjs receipts/platform-net-live.json
//
// WHY A TEST MONTH AND NOT ANDREW'S OWN BILLS. The live database had no paid
// platform invoice in ANY month (2026-10-10), so "paid revenue minus costs" was
// "0 minus costs" everywhere — a comparison that cannot tell a screen that
// ignores revenue from one that does not. Nobody here knows his real bill
// amounts, and a saved bill cannot be removed from the screen. So the run works
// in the OLDEST month the office's bill switch can reach (it shows the last
// twelve, `BILL_MONTHS`), and the month after it, and refuses to start if
// anything is already there. It used September 2025, before the platform
// existed, until the new office's switch stopped reaching it (ROADMAP 98.11).
//
// WHAT IT WRITES, ALL OF IT REMOVED IN `finally` (project kguqylyzgyzfktkfnhjb,
// refuses any other):
//   * a throwaway platform admin (`scripts/admin-account.mjs`);
//   * three fixture invoices on the demo business — $40 paid in the test month,
//     $539 marked OPEN but dated inside it (the status filter is the only thing
//     keeping it out), $100 paid in the month after;
//   * five bills, saved THROUGH THE FORM by the deployed `platform-admin`:
//     three at 1440, one more at 392, the missing Database bill at 390 (which
//     completes the month; the run then revisits complete and empty at 390/1440).
//     After every save the partly entered profit must name the missing count
//     beside its figure (98.16), read off the amount element alone so the
//     note's own digits cannot contaminate the comparison.
// What it leaves: `platform_cost_add` writes one `platform_admin_events` row per
// saved bill. An audit trail is not cleaned up after; five rows per run, admin
// email `platform-net-live-test@…`.

import "../tests/_env.mjs";
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
import { writeReceipt } from "./receipt.mjs";
import { settle, watchConsole } from "./lib/bookingWalk.mjs";
import { dropAdmin, makeAdmin } from "./admin-account.mjs";
import { lastMonths } from "../app/src/lib/officeToday.js";

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
if (BREAK && !["net-on-empty", "count-open", "hide-missing-note"].includes(BREAK)) { console.error(`Unknown --break=${BREAK}. Nothing touched.`); process.exit(2); }
const BASE = process.env.BASE || "http://localhost:5173";
const SHOTS = process.env.SHOTS || "C:/Users/rando/Downloads/claude/belt/shots/9.14c";
const shotsTaken = [];
const shot = (name) => {
  const p = `${SHOTS}/${BREAK ? `sabotage-${BREAK}-` : ""}${name}.png`;
  shotsTaken.push(p);
  return p;
};
const ADMIN_EMAIL = "platform-net-live-test@detailplatform.com"; // mail-sink: a login; autoconfirm is on, no mail
const MARK = "9.14c test bill";

// The two oldest months the Platform bills switch reaches, from the same function it uses.
const monthOf = (day1) => ({ ym: day1.slice(0, 7), day1, name: new Date(`${day1}T00:00:00Z`).toLocaleString("en-US", { month: "long", year: "numeric", timeZone: "UTC" }) });
const [TEST, EMPTY, AFTER] = lastMonths(12).slice(0, 3).map(monthOf);
const MONTHS = [TEST.day1, EMPTY.day1];
const FIXTURES = [
  { id: "in_9_14c_fixture_paid", amount_cents: 4000, status: "paid", paid_at: `${TEST.ym}-14T18:30:00Z` },
  { id: "in_9_14c_fixture_open", amount_cents: 53900, status: "open", paid_at: `${TEST.ym}-20T18:30:00Z` },
  { id: "in_9_14c_fixture_oct", amount_cents: 10000, status: "paid", paid_at: `${EMPTY.ym}-15T18:30:00Z` },
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
const PHONE390 = { w: 390, h: 844 };
// The bill kinds every month owes, declared BY HAND (never borrowed from the
// screen or officeMoney.js): the missing count is derived from typed fixture
// categories, so a repeated kind never completes a missing one.
const EXPECTED_CATS = ["hosting", "database", "email", "domain"];
const missingText = (typedBills) => {
  const have = new Set(typedBills.map((b) => b.kind));
  const n = EXPECTED_CATS.filter((c) => !have.has(c)).length;
  return n === 0 ? null : `${n} ${n === 1 ? "bill" : "bills"} not entered`;
};
// What a bill row reads after a save: the total of every bill typed into that kind (Hosting gets two: $19 at 1440, $5.50 at 392).
const rowFig = (typed, kind) => { const c = typed.filter((b) => b.kind === kind).reduce((s, b) => s + b.cents, 0); return "$" + (c % 100 ? (c / 100).toFixed(2) : String(c / 100)); };
// Saved last, through the form at 390, completing the test month.
const DATABASE = { kind: "database", label: "Database and storage", typed: "8", cents: 800 };

// The selected month's refreshed values, not list-quiet: poll the screen's
// own read until the saved row carries its figure and the note matches what
// the fixtures say it must be. A stale screen fails here by name instead of
// being read as a result.
const settleValue = async (read, page, label, kind, fig, note) => {
  const t0 = Date.now();
  let cur = await read();
  for (;;) {
    const row = (cur.bills.find(([k]) => k === kind) ?? [])[1];
    if (row === fig && (note === undefined || cur.note === note)) return cur;
    if (Date.now() - t0 > 40000) break;
    await page.waitForTimeout(150);
    cur = await read();
  }
  check(label + " - refreshed values never arrived (stale read refused)", false, JSON.stringify(cur.bills));
  return cur;
};
const started = new Date();
let assertions = 0;
const failures = [];
const check = (label, ok, detail = "") => {
  assertions++;
  if (!ok) failures.push(`${label}${detail ? ` — ${detail}` : ""}`);
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${label}${!ok && detail ? `\n          ${detail}` : ""}`);
  return ok;
};
// --break=hide-missing-note: browser-only CSS scoped to the real Platform
// bills profit note. Requires exactly one matching note first (an undiscovered
// target is a named failure, never a pass), records that the hiding took
// effect, then the ordinary painted-visibility assertion runs unchanged.
const maybeHideNote = async (page, sec, where, stage) => {
  if (BREAK !== "hide-missing-note") return;
  const n = await sec.locator('[data-testid="monthsum-missing"]').count();
  if (!check(`2 - ${where} ${stage}: sabotage found exactly one profit note to hide`, n === 1, `found ${n}`)) return;
  await page.addStyleTag({ content: "section[aria-label='Platform bills'] [data-testid='monthsum-missing']{display:none !important}" });
  dims.hideNoteApplied = true;
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
const expected = ["guard + fixtures", ...SIZES.map((s) => `browser ${s.w}`), "browser 390 partial", "complete month", "cleanup"];
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
  const preInv = await rest(`platform_invoices?select=id&paid_at=gte.${TEST.day1}&paid_at=lt.${AFTER.day1}`);
  dims.pre = { costs: preCosts.length, invoices: preInv.length };
  if (!check(`1 · ${TEST.name} and ${EMPTY.name} hold no bills and no invoices before the run`, preCosts.length === 0 && preInv.length === 0, JSON.stringify(dims.pre))) {
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
    // Every month this page has asked platform_net for. The office reads Today's twelve
    // months once on load (useNet.js caches them) and again only after a save, so a switch
    // onto a month already asked for sends nothing and there is no answer to wait for.
    const asked = new Set();
    page.on("request", (r) => {
      const body = r.url().includes("/functions/v1/platform-admin") ? r.postData() || "" : "";
      if (/"platform_net"/.test(body)) { try { asked.add(String(JSON.parse(body).period).slice(0, 7)); } catch {} }
    });
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
    await page.waitForSelector("input[type=email], .bo-top", { timeout: 40000 });
    if (await page.locator("input[type=email]").count()) {
      await page.fill("input[type=email]", acct.email);
      await page.fill("input[type=password]", acct.password);
      await page.click("form button.bo-btn[type=submit]");
      await page.waitForSelector(".bo-top", { timeout: 40000 });
      signedIn = await ctx.storageState();
    }
    // The office draws a place only once the platform state has loaded (OfficePage.jsx).
    await page.waitForSelector(".bo-place-in", { timeout: 40000 });
    await page.locator(".bo-nav").filter({ hasText: "Money" }).first().click();
    // The month switch and the bill form live in Money's "Platform bills" (places/money/Bills.jsx).
    const sec = page.locator("section.bo-sec[aria-label='Platform bills']");
    const heading = sec.locator(".bo-monthname");
    await heading.waitFor({ state: "attached", timeout: 40000 });

    // Settled on the RESPONSE, not on the text going quiet (docs/gotchas.md 109).
    const netAnswer = (ym) => page.waitForResponse((r) => r.url().includes("/functions/v1/platform-admin")
      && /"platform_net"/.test(r.request().postData() || "") && (r.request().postData() || "").includes(ym), { timeout: 40000 });
    const settleMonth = async () => {
      await sec.locator("ul.bo-bills, p.bo-dim").filter({ hasNotText: "Reading…" }).first().waitFor({ state: "attached", timeout: 40000 });
      await settle(page, 600);
    };
    const goTo = async (m) => {
      for (let i = 0; i < 40; i++) {
        const prev = await heading.textContent();
        const cur = ymOf(prev);
        if (cur === m.ym) break;
        const step = cur > m.ym ? -1 : 1;
        // Armed BEFORE the click that lands on the month, so its answer cannot slip past.
        const btn = sec.getByRole("button", { name: step < 0 ? "Earlier month" : "Later month" });
        // The switch stops at the twelve months Today charts (month.js BILL_MONTHS): a disabled end is "not reachable", not a hang.
        if (await btn.isDisabled()) return false;
        const wait = shift(cur, step) === m.ym && !asked.has(m.ym) ? netAnswer(m.ym) : null;
        await btn.click();
        while ((await heading.textContent()) === prev) await page.waitForTimeout(20);
        if (wait) await wait;
      }
      await settleMonth();
      return ymOf(await heading.textContent()) === m.ym;
    };
    // The chosen month's paid revenue, cost total with its bill count, and net ("We kept /
    // We lost") are the totals above the bill lines (Bills.jsx MonthSum, ROADMAP 98.15). The
    // net is the LAST row; every row before it is [label, figure].
    const read = () => sec.evaluate((el) => {
      const lis = [...el.querySelectorAll("ul.bo-bills li[data-bill]")];
      const dim = el.querySelector("p.bo-dim")?.textContent ?? "";
      const sum = [...el.querySelectorAll("dl.bo-monthsum > div")].map((d) => [d.querySelector("dt")?.textContent ?? "", d.querySelector("dd")?.textContent ?? ""]);
      const net = el.querySelector("dl.bo-monthsum > div.net");
      return {
        // [kind, amount] per bill line; "Not entered" for a kind nobody typed in.
        bills: lis.map((li) => [li.dataset.bill, li.querySelector(".amt")?.textContent ?? ""]),
        rows: net ? sum.slice(0, -1) : sum,
        netWord: net?.querySelector("dt")?.textContent ?? null,
        // The amount alone, never the whole dd: the note beside it carries its
        // own digits ("1 bill not entered") and cents() must not see them.
        netFig: net?.querySelector('[data-testid="monthsum-net"]')?.textContent ?? null,
        netDd: net?.querySelector("dd")?.textContent ?? null,
        note: net?.querySelector('[data-testid="monthsum-missing"]')?.textContent ?? null,
        noteVisible: (() => { const n = net?.querySelector('[data-testid="monthsum-missing"]'); return !!n && getComputedStyle(n).display !== "none" && n.getBoundingClientRect().width > 0 && n.getBoundingClientRect().height > 0; })(),
        // The month's "not entered" state: every bill line is missing.
        unknown: lis.length > 0 && lis.every((li) => li.classList.contains("missing") && li.querySelector(".amt")?.textContent === "Not entered"),
        err: el.querySelector(".bo-err")?.textContent ?? (/^Could not read/.test(dim) ? dim : null),
        text: el.textContent.replace(/\s+/g, " ").trim(),
      };
    });

    // A month the switch cannot reach must stop the width here: saving would put bills in the WRONG month.
    if (!check(`2 · ${where}: reached ${TEST.name}`, await goTo(TEST), await heading.textContent())) {
      throw new Error(`PRODUCT LOSS: the Platform bills month switch cannot reach ${TEST.name} (it stops at the last twelve months); nothing typed`);
    }

    // THE REFUSED CASE ON THE FORM: a negative amount cannot be saved.
    const billRow = (kind) => sec.locator(`ul.bo-bills li[data-bill="${kind}"]`);
    const openForm = async (b) => {
      await billRow(b.kind).getByRole("button", { name: /^Add( it)?$/ }).click();
      return billRow(b.kind).locator("form.bo-billform");
    };
    const probe = await openForm(BILLS[s.w][0]);
    await probe.getByLabel("Amount").fill("-5");
    check(`2 · ${where}: a negative amount leaves "Save" disabled`, await probe.getByRole("button", { name: "Save", exact: true }).isDisabled());
    await probe.getByRole("button", { name: "Cancel" }).click();

    // THE CASE THAT SHOULD WORK: each bill through the form, then the month re-read.
    for (const b of BILLS[s.w]) {
      const form = await openForm(b);
      check(`2 · ${where}: the "${b.label}" form is the one open (its own label — gotchas 108)`, (await form.getAttribute("aria-label")) === `Add a ${b.label.toLowerCase()} bill`, await form.getAttribute("aria-label"));
      const amount = form.getByLabel("Amount");
      const save = form.getByRole("button", { name: "Save", exact: true });
      await amount.fill(b.typed);
      await form.getByLabel("Note").fill(`${MARK} — ${b.label} $${b.typed}, removed when the check finishes`);
      const saved = page.waitForResponse((r) => r.url().includes("/functions/v1/platform-admin") && /"platform_cost_add"/.test(r.request().postData() || ""), { timeout: 40000 });
      const reread = netAnswer(TEST.ym);
      await save.click();
      const res = await saved;
      const body = await res.json().catch(() => null);
      const sent = JSON.parse(res.request().postData() || "{}");
      check(`2 · ${where}: ${b.label} $${b.typed} saved — 200 with an id`, res.status() === 200 && body?.success === true && !!body?.id, `${res.status()} ${JSON.stringify(body)}`);
      check(`2 · ${where}: it was sent as ${b.cents} integer cents, "${b.kind}", for ${TEST.ym}`, sent.amount_cents === b.cents && sent.category === b.kind && /* the office sends YYYY-MM-01, the old page YYYY-MM; costEntry stores both as the 1st */ String(sent.period_month).slice(0, 7) === TEST.ym, JSON.stringify(sent));
      await reread;
      typed.push(b);
      // After every save the partly entered profit names what is still missing.
      await maybeHideNote(page, sec, where, "after save");
      const wantMid = missingText(typed);
      const mid = await settleValue(read, page, "2 - " + where + ": after " + b.label, b.kind, rowFig(typed, b.kind), wantMid);
      check(`2 - ${where}: after ${b.label} the profit carries "${wantMid}" beside the figure, painted`, mid.note === wantMid && mid.noteVisible, `${mid.note} visible=${mid.noteVisible}`);
    }
    check(`2 · ${where}: the form closed itself after the last save`, (await sec.locator("form.bo-billform").count()) === 0);

    // THE MONTH, READ OFF THE SCREEN, AGAINST THE CALCULATION.
    const want = expectFor(typed);
    const got = await read();
    dims[`screen_${where}_test`] = { got, want };
    const row = (re) => got.rows.find(([k]) => re.test(k));
    check(`2 · ${where}: no error on the month`, !got.err, got.err);
    check(`2 · ${where}: paid revenue on screen = $${want.revenue / 100} (paid invoices dated in ${TEST.name} only)`, cents(row(/^Paid to us in /)?.[1]) === want.revenue, JSON.stringify(row(/^Paid to us in /)));
    const costRow = row(/^Costs entered · /);
    check(`2 · ${where}: total costs on screen = $${want.cost / 100}, from ${want.count} bills`, cents(costRow?.[1]) === want.cost && new RegExp(`· ${want.count} bills?$`).test(costRow?.[0] ?? ""), JSON.stringify(costRow));
    const catRows = Object.fromEntries(got.bills.filter(([, v]) => v !== "Not entered").map(([k, v]) => [k, cents(v)]));
    check(`2 · ${where}: each category on screen = the bills typed into it`, JSON.stringify(Object.entries(catRows).sort()) === JSON.stringify(Object.entries(want.byCat).sort()), `screen ${JSON.stringify(catRows)} want ${JSON.stringify(want.byCat)}`);
    const signed = (got.netWord === "We lost" ? -1 : 1) * cents(got.netFig);
    await maybeHideNote(page, sec, where, "partial month");
    const renote = await read();
    const wantNote = missingText(typed);
    check(`2 - ${where}: partly entered profit carries "${wantNote}" beside the figure at ${s.w}, painted`, renote.note === wantNote && renote.noteVisible, `${renote.note} visible=${renote.noteVisible}`);
    check(`2 · ${where}: the net on screen = revenue − costs = ${want.net < 0 ? "a loss of " : ""}$${Math.abs(want.net) / 100}`, signed === want.net && !got.unknown, `${got.netWord} ${got.netFig}`);
    check(`2 · ${where}: a loss is worded as a loss`, want.net < 0 ? got.netWord === "We lost" : got.netWord !== "We lost", got.netWord);
    // THE CANARY: the same reading against a figure one cent off must disagree.
    if (signed !== want.net + 1 && Number.isFinite(signed)) canary.observed_failure = true;
    await sec.screenshot({ path: shot(`test-month-${s.w === 1440 ? "laptop" : "phone"}`) });

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
    check(`2 - ${where}: ${EMPTY.name} net field reads Not entered, not a figure`, (e.netDd ?? "").trim() === "Not entered" && (e.netFig ?? null) === null, JSON.stringify(e.netDd));
    dims[`screen_${where}_empty`] = e;
    check(`2 · ${where}: ${EMPTY.name} shows its $100 paid revenue`, cents(e.rows.find(([k]) => /^Paid to us in /.test(k))?.[1]) === 10000, JSON.stringify(e.rows));
    check(`2 · ${where}: ${EMPTY.name} reads every bill "Not entered", under its own month name`, e.unknown && (await heading.textContent()) === EMPTY.name, `${await heading.textContent()} ${JSON.stringify(e.bills)}`);
    check(`2 · ${where}: ${EMPTY.name} prints no net and no cost figure`, !/We kept|We lost|We broke even|Costs entered/.test(e.text) && !/\$/.test(e.bills.map(([, v]) => v).join(" ")), e.text.slice(0, 300));
    await sec.screenshot({ path: shot(`empty-month-${s.w === 1440 ? "laptop" : "phone"}`) });

    check(`2 · ${where}: console clean`, noise.length === 0, noise.join(" | "));
    consoleNoise.push(...noise);
    await ctx.close();
    completed++;
  }
  // -- 2b. THE 390 PARTIAL OBSERVATION, then the missing Database bill completes
  // the month through the form. After that, complete and empty states are
  // revisited at 390 and 1440: the note must follow the reread path, never
  // retain another month's count, and vanish once every expected kind is in.
  console.log(`\n2b. 390: observe the partly entered month, complete it, revisit at 390 and 1440`);
  const openMoney = async (w, h) => {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, storageState: signedIn || undefined });
    const page = await ctx.newPage();
    const noise = [];
    // Every month THIS context has asked platform_net for, tracked before any
    // navigation so the first walk can wait and cached revisits never do. A new
    // context has asked nothing yet; the earlier widths' set belongs to closed
    // contexts and must not leak in (98.16 finding 1).
    const asked = new Set();
    page.on("request", (r) => {
      const body = r.url().includes("/functions/v1/platform-admin") ? r.postData() || "" : "";
      if (/"platform_net"/.test(body)) { try { asked.add(String(JSON.parse(body).period).slice(0, 7)); } catch {} }
    });
    watchConsole(page, String(w), noise);
    await page.goto(`${BASE}/admin`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("input[type=email], .bo-top", { timeout: 40000 });
    if (await page.locator("input[type=email]").count()) {
      await page.fill("input[type=email]", acct.email);
      await page.fill("input[type=password]", acct.password);
      await page.click("form button.bo-btn[type=submit]");
      await page.waitForSelector(".bo-top", { timeout: 40000 });
      signedIn = await ctx.storageState();
    }
    await page.waitForSelector(".bo-place-in", { timeout: 40000 });
    await page.locator(".bo-nav").filter({ hasText: "Money" }).first().click();
    const sec = page.locator("section.bo-sec[aria-label='Platform bills']");
    const heading = sec.locator(".bo-monthname");
    await heading.waitFor({ state: "attached", timeout: 40000 });
    const netAnswer = (ym) => page.waitForResponse((r) => r.url().includes("/functions/v1/platform-admin")
      && /"platform_net"/.test(r.request().postData() || "") && (r.request().postData() || "").includes(ym), { timeout: 40000 });
    const settleMonth = async () => {
      await sec.locator("ul.bo-bills, p.bo-dim").filter({ hasNotText: "Reading…" }).first().waitFor({ state: "attached", timeout: 40000 });
      await settle(page, 600);
    };
    const goTo = async (m) => {
      for (let i = 0; i < 40; i++) {
        const prev = await heading.textContent();
        const cur = ymOf(prev);
        if (cur === m.ym) break;
        const step = cur > m.ym ? -1 : 1;
        const btn = sec.getByRole("button", { name: step < 0 ? "Earlier month" : "Later month" });
        if (await btn.isDisabled()) return false;
        // Intermediate clicks do not request the destination; visited months
        // may already be cached. Mirror the original walk above.
        const wait = shift(cur, step) === m.ym && !asked.has(m.ym) ? netAnswer(m.ym) : null;
        await btn.click();
        while ((await heading.textContent()) === prev) await page.waitForTimeout(20);
        if (wait) await wait;
      }
      await settleMonth();
      return ymOf(await heading.textContent()) === m.ym;
    };
    const read = () => sec.evaluate((el) => {
      const lis = [...el.querySelectorAll("ul.bo-bills li[data-bill]")];
      const net = el.querySelector("dl.bo-monthsum > div.net");
      const noteEl = net?.querySelector('[data-testid="monthsum-missing"]');
      return {
        bills: lis.map((li) => [li.dataset.bill, li.querySelector(".amt")?.textContent ?? ""]),
        netWord: net?.querySelector("dt")?.textContent ?? null,
        netFig: net?.querySelector('[data-testid="monthsum-net"]')?.textContent ?? null,
        netDd: net?.querySelector("dd")?.textContent ?? null,
        note: noteEl?.textContent ?? null,
        noteVisible: !!noteEl && getComputedStyle(noteEl).display !== "none" && noteEl.getBoundingClientRect().width > 0 && noteEl.getBoundingClientRect().height > 0,
        unknown: lis.length > 0 && lis.every((li) => li.classList.contains("missing") && li.querySelector(".amt")?.textContent === "Not entered"),
      };
    });
    return { ctx, page, sec, heading, noise, netAnswer, settleMonth, goTo, read };
  };
  {
    const M390 = await openMoney(PHONE390.w, PHONE390.h);
    const { ctx, page, sec, heading, noise, netAnswer, settleMonth, goTo, read } = M390;
    check("2b - 390: reached the partly entered test month", await goTo(TEST), await heading.textContent());
    await maybeHideNote(page, sec, "390", "partial month");
    const part = await read();
    const wantPart = missingText(typed);
    check(`2b - 390: partly entered profit carries "${wantPart}" beside the figure at 390, painted`, part.note === wantPart && part.noteVisible, `${part.note} visible=${part.noteVisible}`);
    const wantP = expectFor(typed);
    check("2b - 390: the amount beside the note is the net alone, not the note digits", (part.netWord === "We lost" ? -1 : 1) * cents(part.netFig) === wantP.net, `${part.netWord} ${part.netFig}`);
    await sec.screenshot({ path: shot("partial-month-390") });
    check("2b - 390: console clean on the partial month", noise.length === 0, noise.join(" | "));
    consoleNoise.push(...noise);
    // The missing kind goes in through the form; the note must follow the reread.
    const billRow = (kind) => sec.locator(`ul.bo-bills li[data-bill="${kind}"]`);
    const form = await (async () => { await billRow(DATABASE.kind).getByRole("button", { name: /^Add( it)?$/ }).click(); return billRow(DATABASE.kind).locator("form.bo-billform"); })();
    await form.getByLabel("Amount").fill(DATABASE.typed);
    await form.getByLabel("Note").fill(`${MARK} - ${DATABASE.label} $${DATABASE.typed}, removed when the check finishes`);
    const saved = page.waitForResponse((r) => r.url().includes("/functions/v1/platform-admin") && /"platform_cost_add"/.test(r.request().postData() || ""), { timeout: 40000 });
    const reread = netAnswer(TEST.ym);
    await form.getByRole("button", { name: "Save", exact: true }).click();
    const res = await saved;
    check("2b - 390: Database saved - 200 with an id", res.status() === 200 && (await res.json().catch(() => null))?.success === true, `${res.status()}`);
    await reread;
    typed.push(DATABASE);
    check("2b - 390: the form closed itself after the last save", (await sec.locator("form.bo-billform").count()) === 0);
    const full = await settleValue(read, page, "2b - 390: database entry", DATABASE.kind, rowFig(typed, DATABASE.kind), missingText(typed));
    const wantFull = expectFor(typed);
    dims.wantFull = wantFull;
    check("2b - 390: completed month shows no missing note", full.note === null && (await sec.locator('[data-testid="monthsum-missing"]').count()) === 0, `${full.note}`);
    check("2b - 390: completed amount is revenue minus all five bills, to the cent", (full.netWord === "We lost" ? -1 : 1) * cents(full.netFig) === wantFull.net, `${full.netWord} ${full.netFig}`);
    await sec.screenshot({ path: shot("complete-month-390") });
    check("2b - 390: reached the empty month", await goTo(EMPTY), await heading.textContent());
    const e390 = await read();
    check("2b - 390: empty month net field reads Not entered, not revenue as profit", (e390.netDd ?? "").trim() === "Not entered" && (e390.netFig ?? null) === null && e390.unknown, JSON.stringify(e390.netDd));
    await sec.screenshot({ path: shot("empty-month-390") });
    check("2b - 390: console clean at the end", noise.length === 0, noise.join(" | "));
    consoleNoise.push(...noise.filter((n) => !consoleNoise.includes(n)));
    await ctx.close();
    completed++;
  }
  {
    const M1440 = await openMoney(1440, 900);
    const { ctx, page, sec, heading, noise, goTo, read } = M1440;
    check("2c - 1440: reached the completed test month", await goTo(TEST), await heading.textContent());
    const full = await read();
    const wantFull = expectFor(typed);
    check("2c - 1440: completed month shows no missing note", full.note === null && (await sec.locator('[data-testid="monthsum-missing"]').count()) === 0, `${full.note}`);
    check("2c - 1440: completed amount is still correct to the cent after switching months", (full.netWord === "We lost" ? -1 : 1) * cents(full.netFig) === wantFull.net, `${full.netWord} ${full.netFig}`);
    await sec.screenshot({ path: shot("complete-month-laptop") });
    check("2c - 1440: reached the empty month", await goTo(EMPTY), await heading.textContent());
    const e14 = await read();
    check("2c - 1440: empty month net field reads Not entered", (e14.netDd ?? "").trim() === "Not entered" && (e14.netFig ?? null) === null, JSON.stringify(e14.netDd));
    check("2c - 1440: console clean", noise.length === 0, noise.join(" | "));
    consoleNoise.push(...noise.filter((n) => !consoleNoise.includes(n)));
    await ctx.close();
    completed++;
  }
  if (BREAK === "hide-missing-note") console.log(`\n  sabotage landed: profit note hidden ${dims.hideNoteApplied ? "and ordinary assertions ran" : "NEVER APPLIED"}`);
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

const ok = failures.length === 0 && canary.observed_failure && completed === expected.length && (BREAK !== "net-on-empty" || rewrites > 0) && (BREAK !== "hide-missing-note" || dims.hideNoteApplied);
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
  min_assertions: 74,
  assertion_floor: "4 setup + 1440 (3 bills at 4 asserts each, plus 18) + 392 (1 bill at 4 asserts, plus 18) + 390 partial-and-complete (11) + 1440 revisit (6) + 1 cleanup = 74, fixed by the code; a throw adds its own failing line rather than dropping any.",
  failures,
  dimensions: dims,
  artifacts: ["scripts/platform-net-live.mjs", "app/src/admin/office/OfficePage.jsx", "app/src/admin/office/places/money/Bills.jsx", "app/src/admin/office/places/money/month.js", "supabase/functions/platform-admin/index.ts", "supabase/functions/_shared/platformNet.js", ...shotsTaken],
  warnings: [
    `The bills are TEST bills in ${TEST.name}, removed when the run ends. Andrew's real bills were not entered: their amounts are recorded nowhere in this repo and a saved bill cannot be removed from the screen.`,
    "Revenue is a fixture: the live database held no paid platform invoice in any month on 2026-10-10, so a real-revenue month did not exist to check.",
    `platform_cost_add writes one platform_admin_events row per saved bill; those audit rows are left in place. ${consoleNoise.length} console lines this run.`,
  ],
  canary,
});
console.log(`\n${ok ? "PASS" : "FAIL"} — ${assertions} assertions, ${failures.length} failed; ${completed} of ${expected.length} targets; canary ${canary.observed_failure ? "caught" : "MISSED"}.`);
process.exit(ok ? 0 : 1);
