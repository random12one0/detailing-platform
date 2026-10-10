// ROADMAP 9.12a plan step 3 — the new back office's Money place, in a real browser,
// at 1440, 768 and 390.
//
//   node scripts/office-money.mjs            (dev server on :5173, credentials in .env)
//   node scripts/office-money.mjs --lite     (the ?lite=1 reduced-motion path)
//   node scripts/office-money.mjs --break=blind
//
// TWO PASSES PER WIDTH. The LIVE pass reads the real platform: Money is the third
// place, "You kept" is the server's `net_cents` or, when no bill was typed in,
// "Not entered" with no figure and no kept bar (9.14), every bill line agrees with
// the server's `by_category`, and the plan split and the next-30-days figure equal
// a sum this script works out ITSELF from the `list` rows (not from officeMoney.js).
// The FED pass answers `list` with five known subscriptions and `platform_net`
// with a month that HAS bills, so the drawn cases the live platform lacks are
// asked: a kept figure, a step per bill, a failed card kept apart, cancelling and
// out-of-window renewals left off. Then it types a bill in: the SAVE is answered
// by page.route() (nothing is written to the database) and must send whole cents
// for the right kind and month and redraw; a REFUSED save must show the server's
// sentence and leave the bill "Not entered"; a non-number must not be sendable.
//
// THE CANARY pushes one step label onto the next (the overlap inspector must name
// it) and writes a dollar figure into "You kept" on a month with no bills (the
// kept rule must name it). `--break=blind` blinds the overlap inspector, which must
// turn the canary red; the receipt then lands in receipts/office-money.sabotage.json.
//
// Signs in as a THROWAWAY platform admin, created here and deleted in a finally
// (scripts/admin-account.mjs). Do not wrap in `timeout` (docs/gotchas.md 90).

import "../tests/_env.mjs";
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
import { writeReceipt } from "./receipt.mjs";
import { settle, watchConsole } from "./lib/bookingWalk.mjs";
import { dropAdmin, makeAdmin } from "./admin-account.mjs";

const { chromium } = createRequire(import.meta.url)("./../app/node_modules/playwright/index.js");

const started_at = new Date().toISOString();
const BREAK = (process.argv.find((a) => a.startsWith("--break=")) || "").split("=")[1] || "";
const BASE = process.env.BASE || "http://localhost:5173";
const LITE = process.argv.includes("--lite");
const ADMIN_EMAIL = "office-money-test@detailplatform.com";
const SIZES = [{ w: 1440, h: 900 }, { w: 768, h: 1024 }, { w: 390, h: 844 }];
const ART = "artifacts/office-money";
const SHOTS = "C:/Users/rando/Downloads/claude/belt/shots/9.12a";
const URL_ = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_ || !KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY — nothing measured, no receipt written.");
  process.exit(1);
}
if (!URL_.includes("kguqylyzgyzfktkfnhjb")) {
  console.error("SUPABASE_URL is not project kguqylyzgyzfktkfnhjb — refusing to run.");
  process.exit(1);
}

let assertions = 0;
const failures = [];
const consoleNoise = [];
const artifacts = [];
const observed = {};
const check = (where, name, cond, detail = "") => {
  assertions++;
  if (cond) { console.log(`    ok    ${name}`); return; }
  failures.push(`${where}: ${name} ${detail}`.trim());
  console.error(`    FAIL  ${name}  ${detail}`);
};

const EXPLAINERS = [
  "Usage bar", "Yearly plans count as", "What came in, what the platform cost", "Leaves out", "so \"You kept\" leaves it out",
  "Bigger bubble", "Tap a red number", "Quiet when everything works",
];

// ONE INSPECTOR, run in the page, used by the real questions AND the canary.
const INSPECT = (blind) => {
  const out = { overlaps: [], clipped: [], overflowX: false, explainers: [], phoneLinks: 0 };
  out.overflowX = document.documentElement.scrollWidth > window.innerWidth + 1;
  const root = document.querySelector(".bo-money");
  const text = root?.innerText ?? "";
  out.explainers = EXPLAINERS_IN_PAGE.filter((s) => text.includes(s));
  out.phoneLinks = root ? root.querySelectorAll('a[href^="tel:"], a[href^="sms:"]').length : 0;
  const hit = (a, b) => Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1;
  const R = (el) => el.getBoundingClientRect();
  const seen = (el) => R(el).width > 0 && getComputedStyle(el).display !== "none";
  const groups = [
    [...document.querySelectorAll(".bo-wf-plot b")],
    [...document.querySelectorAll(".bo-wf-c > span")],
    [...document.querySelectorAll(".bo-split-l span")],
    [...document.querySelectorAll(".bo-kept > div")],
    [...document.querySelectorAll(".bo-sec > .bo-label, .bo-kept .bo-label, .bo-big, .bo-h2")],
    [...document.querySelectorAll(".bo-tl .lab, .bo-tl .now, .bo-tl .end")],
    ...[...document.querySelectorAll(".bo-bill, .bo-due button, .bo-dl > div, .bo-billform")].map((n) => [...n.children]),
    [document.querySelector(".bo-donut"), document.querySelector(".bo-dl")].filter(Boolean),
  ];
  if (!blind) for (const g of groups) {
    const els = g.filter(seen);
    for (let i = 0; i < els.length; i++) for (let j = i + 1; j < els.length; j++) {
      if (hit(R(els[i]), R(els[j]))) out.overlaps.push(`${els[i].className || els[i].tagName}:${els[i].textContent.slice(0, 14)} x ${els[j].className || els[j].tagName}:${els[j].textContent.slice(0, 14)}`);
    }
  }
  out.clipped = [...document.querySelectorAll(".bo-wf-plot b, .bo-wf-c > span, .bo-bill b, .bo-bill .amt, .bo-dl dt, .bo-dl dd, .bo-split-l span, .bo-h2, .bo-chip")]
    .filter((e) => seen(e) && e.scrollWidth > e.clientWidth + 1).map((e) => e.textContent.slice(0, 30));
  // A big figure's GLYPHS rise above its own box (line-height under 1), so a box test
  // cannot see them reach the label above. Measure the ink: baseline from the font's
  // own metrics, minus the text's actual ascent, against the label's bottom.
  for (const big of document.querySelectorAll(".bo-money .bo-big")) {
    const label = big.parentElement.querySelector(".bo-label");
    if (!label || blind) continue;
    const cs = getComputedStyle(big), c = document.createElement("canvas").getContext("2d");
    c.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    const m = c.measureText(big.innerText.trim()), r = R(big), lh = parseFloat(cs.lineHeight);
    const base = r.top + (lh - (m.fontBoundingBoxAscent + m.fontBoundingBoxDescent)) / 2 + m.fontBoundingBoxAscent;
    const ink = base - m.actualBoundingBoxAscent, gap = ink - R(label).bottom;
    if (gap < 4) out.overlaps.push(`the figure's ink reaches its label (gap ${gap.toFixed(1)}px)`);
  }
  // A step label hidden behind its bar's top edge or above the plot reads as clipped too.
  for (const b of document.querySelectorAll(".bo-wf-plot b")) {
    const p = b.parentElement.getBoundingClientRect(), r = R(b), sec = b.closest(".bo-sec").getBoundingClientRect();
    if (r.top < sec.top) out.clipped.push(`step value above its section: ${b.textContent}`);
    if (r.bottom > p.bottom + 1) out.clipped.push(`step value below the axis: ${b.textContent}`);
  }
  return out;
};
const inspect = (page, blind = false) => page.evaluate(`(() => { const EXPLAINERS_IN_PAGE = ${JSON.stringify(EXPLAINERS)}; return (${INSPECT.toString()})(${blind}); })()`);

// THE KEPT RULE (9.14), asked of the page against the server's answer: with no bill
// entered, "You kept" holds no dollar figure and there is no kept bar; with bills
// entered, it is the server's net, in dollars.
const keptRule = (page, net) => page.evaluate((net) => {
  const t = document.querySelector("[data-testid=kept]")?.innerText ?? "";
  const keptBar = document.querySelectorAll(".bo-wf-c.kept").length;
  if (!net.costs_entered) {
    if (/\$\s*\d/.test(t)) return `"You kept" shows a figure (${t.trim()}) on a month with no bill entered`;
    if (!/Not entered/.test(t)) return `"You kept" does not say Not entered (${t.trim()})`;
    if (keptBar) return "a You kept bar is drawn on a month with no bill entered";
    if (!document.querySelector(".bo-wf-c.unentered")) return "no 'not entered' step";
    return "";
  }
  const want = Math.round(net.net_cents / 100);
  const got = Number((t.match(/[\d,]+/) ?? ["x"])[0].replace(/,/g, "")) * (/−/.test(t) ? -1 : 1);
  if (got !== want) return `"You kept" shows ${t.trim()}, server says ${want}`;
  if (keptBar !== 1) return `${keptBar} kept bars`;
  return "";
}, net);

const hitProbe = (page, selector) => page.evaluate((sel) => {
  const bad = [];
  for (const el of document.querySelectorAll(sel)) {
    el.scrollIntoView({ block: "center" });
    const r = el.getBoundingClientRect();
    if (r.width === 0) continue;
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    for (const dy of [-21, 21]) {
      const y = cy + dy;
      if (y < 0 || y > innerHeight) continue;
      const hit = document.elementFromPoint(cx, y);
      if (!hit || !(el === hit || el.contains(hit))) bad.push(`${(el.textContent || sel).trim().slice(0, 24)} @${dy}`);
    }
  }
  return bad;
}, selector);

// The script's OWN sums, so the screen is checked against something other than itself.
const D = (c) => Math.round(c / 100);
const ownPlan = (rows) => rows.filter((r) => !r.is_demo && ["active", "trialing"].includes(r.subscription?.status))
  .reduce((a, r) => a + Math.round(Number(r.subscription.recurring_cents) / (r.subscription.bill_interval === "year" ? 12 : 1)), 0);
const ownComing = (rows, now = Date.now()) => rows.filter((r) => !r.is_demo && ["active", "trialing"].includes(r.subscription?.status)
  && !r.subscription.cancel_at_period_end && Date.parse(r.subscription.current_period_end) >= now
  && Date.parse(r.subscription.current_period_end) < now + 30 * 864e5).reduce((a, r) => a + Number(r.subscription.recurring_cents), 0);
const num = (t) => Number((String(t).match(/[\d,]+/) ?? ["x"])[0].replace(/,/g, ""));

// Five known subscriptions: monthly in 3 days, yearly in 20, a failed card, one set
// to cancel, one renewing outside the window.
const FED = (liveRows) => {
  const proto = liveRows[0];
  const at = (d) => new Date(Date.now() + d * 864e5).toISOString();
  const spec = [
    ["Alder", { status: "active", recurring_cents: 6000, bill_interval: "month", current_period_end: at(3) }],
    ["Birch", { status: "active", recurring_cents: 60000, bill_interval: "year", current_period_end: at(20) }],
    ["Cedar", { status: "past_due", recurring_cents: 6000, bill_interval: "month", current_period_end: at(-2) }],
    ["Dogwood", { status: "active", recurring_cents: 6000, bill_interval: "month", current_period_end: at(10), cancel_at_period_end: true }],
    ["Elm", { status: "active", recurring_cents: 6000, bill_interval: "month", current_period_end: at(40) }],
  ];
  const synthetic = spec.map(([nm, s], k) => ({
    ...structuredClone(proto), id: `fed-${k}`, slug: `fed-${k}`, name: `Fed ${nm}`, is_demo: false, status: "active",
    subscription: { suspended_at: null, cancel_at_period_end: false, ...s },
  }));
  return [...liveRows.filter((r) => r.is_demo), ...synthetic];
};
const FED_NET = (month, extra = {}) => {
  const by = { hosting: 1900, database: 2500, ...extra };
  const cost = Object.values(by).reduce((a, b) => a + b, 0);
  return { period_month: month, revenue_cents: 23000, cost_cents: cost, net_cents: 23000 - cost, costs_entered: true, cost_count: Object.keys(by).length, by_category: by };
};

const H = { apikey: KEY, Authorization: `Bearer ${KEY}` };
const all = await (await fetch(`${URL_}/auth/v1/admin/users?per_page=1000`, { headers: H })).json().catch(() => ({}));
const left = (all.users ?? []).find((u) => u.email === ADMIN_EMAIL);
if (left) { await dropAdmin(URL_, KEY, left.id); console.log("deleted a leftover throwaway admin first"); }
console.log(`writing: one throwaway platform admin on ${new URL(URL_).host}, removed when this run ends`);
const acct = await makeAdmin(URL_, KEY, ADMIN_EMAIL);
if (!acct) { console.error("could not create the throwaway admin; nothing measured"); process.exit(1); }
const redact = (t) => String(t).split(acct.password).join("[password]");

let browser = null;
let signedIn = null;
const canary = { id: "pushed-step-label-and-guessed-kept-figure", observed_failure: true };
let completed = 0, liveEntered = null, writesLeaked = 0;
mkdirSync(ART, { recursive: true });
const plain = (s) => s.replace(/\s+/g, " ").trim();
const openMoney = async (page) => {
  await page.goto(`${BASE}/admin/office${LITE ? "?lite=1" : ""}`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".bo-nav", { timeout: 60000 });
  await page.locator(".bo-nav").filter({ hasText: "Money" }).click();
  await page.waitForSelector(".bo-money", { timeout: 20000 });
  await page.waitForFunction(() => !/Reading/.test(document.querySelector(".bo-money").innerText), null, { timeout: 40000 });
  await settle(page, 1800);
};
try {
  browser = await chromium.launch();
  for (const size of SIZES) {
    const where = `${size.w}${LITE ? " lite" : ""}`;
    console.log(`\n${where}`);
    const ctx = await browser.newContext({ viewport: { width: size.w, height: size.h }, storageState: signedIn || undefined });
    const page = await ctx.newPage();
    watchConsole(page, where, consoleNoise);
    let list = null;
    const nets = {};
    page.on("response", async (res) => {
      if (!res.url().includes("/functions/v1/platform-admin") || res.request().method() !== "POST") return;
      try {
        const j = await res.json();
        if (j?.rows) list = j;
        if (j?.period_month) nets[j.period_month] = j;
      } catch { /* not one we read */ }
    });
    if (!signedIn) {
      await page.goto(`${BASE}/admin`, { waitUntil: "domcontentloaded" });
      await page.waitForSelector("input[type=email]", { timeout: 40000 });
      await page.fill("input[type=email]", acct.email);
      await page.fill("input[type=password]", acct.password);
      await page.click("form button.pa-btn");
      await page.waitForSelector(".pa-top", { timeout: 40000 });
      signedIn = await ctx.storageState();
    }

    // ── LIVE PASS ───────────────────────────────────────────────────────────
    await openMoney(page);
    const month = new Date().toISOString().slice(0, 7) + "-01";
    const net = nets[month];
    check(where, `the server answered this month (${month})`, !!net && !net.error, JSON.stringify(net ?? null).slice(0, 80));
    check(where, "Money is the third place", (await page.locator(".bo-nav").nth(2).innerText()).replace(/\d+/g, "").trim() === "Money"
      && (await page.locator("h1.bo-place").getAttribute("aria-label")) === "Money");
    check(where, "all five sections are there", (await page.locator(".bo-money > .bo-sec").count()) === 5);
    liveEntered = !!net?.costs_entered;
    const kr = await keptRule(page, net);
    check(where, `"You kept" follows the 9.14 rule (live month ${liveEntered ? "has" : "has no"} bills)`, kr === "", kr);
    const cats = net?.by_category ?? {};
    const billRows = await page.locator(".bo-bills > li").evaluateAll((els) => els.map((li) => [li.dataset.bill, li.querySelector(".amt").innerText.trim()]));
    check(where, `a line per bill kind (${billRows.length})`, billRows.length === 4 + (cats.other != null ? 1 : 0), JSON.stringify(billRows));
    check(where, "each bill line agrees with the server: a figure where one was typed in, Not entered where none was",
      billRows.every(([k, t]) => (cats[k] != null ? num(t) === D(cats[k]) : t === "Not entered")), JSON.stringify(billRows));
    const missingN = billRows.filter(([, t]) => t === "Not entered").length;
    const chip = await page.locator("[data-testid=missing]").count() ? await page.locator("[data-testid=missing]").innerText() : "";
    check(where, `the chip counts the bills not entered (${missingN})`, missingN === 0 ? chip === "" : chip.startsWith(`${missingN} bill`), chip);
    const plan = num(await page.locator("[data-testid=by-plan]").innerText());
    check(where, `income by plan is this script's own sum of real paying detailers ($${D(ownPlan(list.rows))})`, plan === D(ownPlan(list.rows)), `drew ${plan}`);
    const coming = num(await page.locator("[data-testid=coming]").innerText());
    check(where, `coming in is this script's own sum ($${D(ownComing(list.rows))})`, coming === D(ownComing(list.rows)), `drew ${coming}`);

    let o = await inspect(page);
    observed[`${where} live`] = o;
    check(where, "no sideways overflow", !o.overflowX);
    check(where, "nothing overlaps", o.overlaps.length === 0, o.overlaps.slice(0, 3).join(" | "));
    check(where, "no text runs outside its own box", o.clipped.length === 0, o.clipped.join(" | "));
    check(where, "none of the mockup's explanation lines is on the page", o.explainers.length === 0, o.explainers.join(" | "));
    check(where, "no Text or Call link anywhere on Money", o.phoneLinks === 0);
    await page.screenshot({ path: `${ART}/live-${size.w}.png`, fullPage: true }); artifacts.push(`${ART}/live-${size.w}.png`);

    // CANARY 2 (kept): a dollar figure written into "You kept" must be named. On a
    // month with bills the figure is changed to a wrong one instead.
    if (size.w === SIZES[0].w) {
      await page.evaluate(() => { const k = document.querySelector("[data-testid=kept]"); k.dataset.was = k.innerHTML; k.textContent = "$987"; });
      const c = await keptRule(page, net);
      await page.evaluate(() => { const k = document.querySelector("[data-testid=kept]"); k.innerHTML = k.dataset.was; delete k.dataset.was; });
      canary.kept = c || "(nothing named)";
      canary.observed_failure = canary.observed_failure && c !== "";
      console.log(`    canary (kept) ${c ? "CAUGHT" : "MISSED"}: ${canary.kept}`);
    }

    // ── FED PASS ────────────────────────────────────────────────────────────
    const fedRows = FED(list.rows);
    let fedNet = FED_NET(month);
    const sent = [];
    let refuse = false;
    await page.route("**/functions/v1/platform-admin", async (route) => {
      const body = JSON.parse(route.request().postData() || "{}");
      if (body.action === "platform_cost_add") {
        sent.push(body);
        if (refuse) return route.fulfill({ status: 400, json: { error: "The month has to be written like 2026-10." } });
        fedNet = FED_NET(month, { [body.category]: body.amount_cents });
        return route.fulfill({ json: { success: true, id: "fed" } });
      }
      if (body.action === "platform_net" && body.period === month) return route.fulfill({ json: fedNet });
      if (body.action !== "list") return route.continue();
      const res = await route.fetch();
      const j = await res.json();
      await route.fulfill({ response: res, json: { ...j, rows: fedRows } });
    });
    await openMoney(page);
    check(where, "fed: You kept is the month's net ($186) and there is one kept bar", (await keptRule(page, fedNet)) === "", await keptRule(page, fedNet));
    check(where, "fed: 81% of what came in", /81% of what came in/.test(await page.locator(".bo-kept").innerText()));
    check(where, "fed: the chip names the 2 bills not entered", (await page.locator("[data-testid=missing]").innerText()).startsWith("2 bills"));
    const steps = await page.locator(".bo-wf-c").evaluateAll((els) => els.map((e) => [e.dataset.step, e.querySelector("b").innerText.trim()]));
    check(where, "fed: the steps go Came in, Hosting, Database, You kept", JSON.stringify(steps) === JSON.stringify([["in", "$230"], ["hosting", "−$19"], ["database", "−$25"], ["kept", "$186"]]), JSON.stringify(steps));
    check(where, "fed: income by plan is $230 a month (Elm, Dogwood and Alder monthly, Birch's year per month)", num(await page.locator("[data-testid=by-plan]").innerText()) === 230);
    check(where, "fed: the failed card is shown apart ($60) and not in that total", plain(await page.locator("[data-testid=late]").innerText()) === "Card failed · 1 $60");
    check(where, "fed: 4 paying in the ring", (await page.locator(".bo-donut-c b").innerText()).trim() === "4");
    check(where, "fed: $660 expected in 30 days", num(await page.locator("[data-testid=coming]").innerText()) === 660);
    const due = await page.locator(".bo-due b").allInnerTexts();
    check(where, "fed: Alder then Birch renew; the cancelling, late and day-40 ones are left off", due.join(",") === "Fed Alder,Fed Birch", due.join(","));
    check(where, "fed: one pin per renewal on the timeline", (await page.locator(".bo-tl .bo-pin").count()) === 2);
    o = await inspect(page);
    observed[`${where} fed`] = o;
    check(where, "fed: no overlap, nothing clipped, no sideways overflow", o.overlaps.length === 0 && o.clipped.length === 0 && !o.overflowX, [...o.overlaps, ...o.clipped].slice(0, 3).join(" | "));
    for (const [sel, name] of [[".bo-bill .bo-btn", "an Add button"], [".bo-due button", "a renewal line"]]) {
      const bad = await hitProbe(page, sel);
      check(where, `fed: ${name} has 44px of hit area`, bad.length === 0, bad.join(" | "));
    }

    // CANARY 1 (overlap): a step label pushed onto the next must be named.
    if (size.w === SIZES[0].w) {
      const before = (await inspect(page, BREAK === "blind")).overlaps.length;
      await page.evaluate(() => { const l = document.querySelectorAll(".bo-wf-c > span")[1]; l.style.position = "relative"; l.style.left = "-90px"; l.dataset.canary = "1"; });
      const after = (await inspect(page, BREAK === "blind")).overlaps.length;
      await page.evaluate(() => { const l = document.querySelector("[data-canary]"); l.style.left = ""; l.style.position = ""; delete l.dataset.canary; });
      canary.overlap = `overlaps ${before} -> ${after}`;
      canary.observed_failure = canary.observed_failure && after > before;
      console.log(`    canary (overlap) ${after > before ? "CAUGHT" : "MISSED"}: ${canary.overlap}`);
    }
    await page.screenshot({ path: `${ART}/fed-${size.w}.png`, fullPage: true }); artifacts.push(`${ART}/fed-${size.w}.png`);

    // Type a bill in. A non-number cannot be sent; a refusal shows the server's words.
    await page.locator('.bo-bills > li[data-bill="domain"] .bo-btn').click();
    const dom = page.locator('.bo-bills > li[data-bill="domain"]');
    await dom.locator("input").first().fill("abc");
    check(where, "refused: Save stays off for an amount that is not a number", await dom.locator("button[type=submit]").isDisabled());
    refuse = true;
    await dom.locator("input").first().fill("5");
    await dom.locator("button[type=submit]").click();
    await dom.locator("[role=alert]").waitFor({ timeout: 10000 });
    check(where, "refused: the server's sentence is shown as-is", (await dom.locator("[role=alert]").innerText()).trim() === "The month has to be written like 2026-10.");
    check(where, "refused: the form stays open and the bill still reads Not entered", (await dom.locator("form").count()) === 1 && (await dom.locator(".amt").innerText()).trim() === "Not entered");
    o = await inspect(page);
    check(where, "refused: the open form overlaps nothing and nothing is clipped", o.overlaps.length === 0 && o.clipped.length === 0 && !o.overflowX, [...o.overlaps, ...o.clipped].slice(0, 3).join(" | "));
    const fb = await hitProbe(page, ".bo-billform .bo-btn");
    check(where, "refused: Save and Cancel have 44px of hit area", fb.length === 0, fb.join(" | "));
    await dom.getByRole("button", { name: "Cancel" }).click();
    refuse = false;

    await page.locator('.bo-bills > li[data-bill="email"] .bo-btn').click();
    const em = page.locator('.bo-bills > li[data-bill="email"]');
    await em.locator("input").first().fill("$20");
    await em.locator("input").nth(1).fill("Resend, October");
    await em.locator("button[type=submit]").click();
    await page.waitForFunction(() => document.querySelector('.bo-bills > li[data-bill="email"] .amt')?.innerText.trim() === "$20", null, { timeout: 10000 }).catch(() => {});
    const last = sent.at(-1) ?? {};
    check(where, "saved: it sent 2000 cents of email for this month, with the note",
      last.category === "email" && last.amount_cents === 2000 && last.period_month === month && last.note === "Resend, October", JSON.stringify(last));
    check(where, "saved: the email line now reads $20 and the form closed",
      (await em.locator(".amt").innerText()).trim() === "$20" && (await em.locator("form").count()) === 0);
    // The figure counts up again from $0 after a re-read; judge where it lands.
    await page.waitForFunction(() => /\$166$/.test(document.querySelector("[data-testid=kept]").innerText.trim()), null, { timeout: 5000 }).catch(() => {});
    check(where, "saved: You kept re-read to $166", (await keptRule(page, fedNet)) === "" && fedNet.net_cents === 16600, await keptRule(page, fedNet));
    writesLeaked += sent.length - 2;   // exactly two cost_add presses, both answered by the route
    if (size.w === SIZES[0].w && !LITE && !BREAK) {
      const { freeze } = await import("file:///C:/Users/rando/Downloads/claude/belt/freeze.mjs");
      await page.locator('.bo-bills > li[data-bill="domain"] .bo-btn').click();
      await freeze(page, {
        out: `${SHOTS}/after-money.html`, label: "After",
        note: "Money: what you kept this month, where every dollar went, income by plan, what renews in the next 30 days, and the bills, with Add it on any bill not typed in.",
        highlight: ".bo-kept",
      });
      artifacts.push(`${SHOTS}/after-money.html`);
    }

    completed++;
    await ctx.close();
  }
} catch (e) {
  failures.push(`run stopped: ${redact(e.message)}`);
  console.error(redact(e.stack || e.message));
} finally {
  await browser?.close();
  await dropAdmin(URL_, KEY, acct.id);
  console.log("throwaway admin deleted");
}

check("all", "no bill was written: every save was answered by the route", writesLeaked === 0, `${writesLeaked}`);
// The refused save is a 400 ON PURPOSE, so the console shows it once per width
// (a network line and an error line). Exactly those are expected and removed; any
// other 400, or a width where the refusal never reached the console, stays a failure.
for (const s of SIZES) {
  const w = `${s.w}${LITE ? " lite" : ""} · `;
  for (const re of [/http 400 · \/functions\/v1\/platform-admin$/, /status of 400 \(Bad Request\)$/]) {
    const k = consoleNoise.findIndex((c) => c.startsWith(w) && re.test(c));
    check(w, `the refused save reached the console once (${re.source.slice(0, 24)})`, k >= 0);
    if (k >= 0) consoleNoise.splice(k, 1);
  }
}
for (const c of consoleNoise) failures.push(`console: ${redact(c)}`);
const status = failures.length === 0 && completed === SIZES.length && canary.observed_failure ? "pass" : "fail";
const { path } = writeReceipt({
  check_id: `office-money${LITE ? "-lite" : ""}`,
  started_at,
  status,
  expected_targets: SIZES.length,
  discovered_targets: SIZES.length,
  attempted_targets: SIZES.length,
  completed_targets: completed,
  skipped_targets: 0,
  assertions_executed: assertions,
  min_assertions: SIZES.length * 37 + 1,
  assertion_floor: "3 widths x 37 questions (live 14, fed 13, typing a bill in 8, the refusal reaching the console 2) plus one no-write question = 112, all fixed by the code; none is conditional on what the live platform holds.",
  failures,
  artifacts,
  canary,
  warnings: [
    `Reads the LIVE platform; this month ${liveEntered ? "HAS" : "has NO"} bills typed in, so the live pass asked the ${liveEntered ? "kept-figure" : "not-entered"} case and the fed pass asked the other.`,
    "The fed pass answers list, platform_net and platform_cost_add through page.route(); nothing is written to the database.",
    "Signs in as a throwaway platform admin created and deleted by this run.",
    "The look itself (color, glow, motion) is not judged here; the screenshots are the evidence for that.",
    ...(BREAK ? [`run with --break=${BREAK}; this receipt is a sabotage, not a result`] : []),
  ],
  dimensions: { sizes: SIZES.map((s) => `${s.w}x${s.h}`), lite: LITE, ...(BREAK && { break: BREAK }), observed },
});
console.log(`\n${status.toUpperCase()} — ${assertions} assertions, ${failures.length} failed, canary ${canary.observed_failure ? "caught" : "MISSED"} → ${path}`);
process.exit(status === "pass" ? 0 : 1);
