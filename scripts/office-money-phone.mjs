// ROADMAP 9.12b, third pass: the WHOLE Money place and the office tab bar on real
// phone widths, the way a phone renders them. Andrew, 2026-10-11, on his own phone:
// "the boxes that hold the information don't stretch all the way out … the text is
// squished … the bottom bar … things are still kind of hitting each other." The
// earlier checks ran one desktop-mode viewport at 390/392; this one runs a MOBILE
// context (isMobile + touch, so the phone's own viewport and text handling apply) at
// 360, 375, 390, 412 and 430, plus 390 with the page zoomed to 130% (a phone's larger
// text setting), and asks four questions of each:
//   1. touching: no two pieces of text or controls overlap — text measured as the
//      LINE BOXES its glyphs occupy (Range rects), not its parent's box; anything
//      painted at under 0.99 opacity is ignored and reported (docs/gotchas.md 122);
//   2. spanning: every section and every card in it reaches the content column's
//      right edge (± 1px), and none leaves it;
//   3. clipped: no text is cut by its box or the screen, and no word breaks mid-word;
//   4. the tab bar: the sliding highlight is centred on the active tab (± 1px), and
//      every tab label fits its tab.
// Synthetic session and page.route() answers, as office-coming-in.mjs: nothing is
// written anywhere and no credential is used.
//   node scripts/office-money-phone.mjs                  (dev server on :5173)
//   node scripts/office-money-phone.mjs --break=narrow   (one card pinned to 240px: must go red)
//   node scripts/office-money-phone.mjs --freeze=before|after   (Andrew's frozen copies)
import { createRequire } from "node:module";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { writeReceipt } from "./receipt.mjs";
import { settle, watchConsole } from "./lib/bookingWalk.mjs";

const { chromium } = createRequire(import.meta.url)("./../app/node_modules/playwright/index.js");

const started_at = new Date().toISOString();
const arg = (k) => (process.argv.find((a) => a.startsWith(`--${k}=`)) || "").split("=")[1] || "";
const BREAK = arg("break"), FREEZE = arg("freeze");
const BASE = process.env.BASE || "http://localhost:5173";
const SIZES = [
  { w: 360, h: 780 }, { w: 375, h: 812 }, { w: 390, h: 844 }, { w: 412, h: 915 }, { w: 430, h: 932 },
  { w: 390, h: 844, zoom: 1.3 },
];
const tag = (s) => `${s.w}${s.zoom ? `@${Math.round(s.zoom * 100)}%` : ""}`;
const ART = `artifacts/office-money-phone${BREAK ? "/" + BREAK : ""}`;
const SHOTS = "C:/Users/rando/Downloads/claude/belt/shots/9.12b";
const REF = "kguqylyzgyzfktkfnhjb";
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const exp = Math.floor(Date.now() / 1000) + 3600 * 24;
const user = { id: "00000000-0000-4000-8000-000000000001", email: "andrew@example.com", aud: "authenticated", role: "authenticated" };
const SESSION = {
  access_token: `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ sub: user.id, exp, role: "authenticated", email: user.email })}.x`,
  refresh_token: "fake", token_type: "bearer", expires_in: 86400, expires_at: exp, user,
};

let assertions = 0;
const failures = [], consoleNoise = [], artifacts = [], observed = {};
const check = (where, name, cond, detail = "") => {
  assertions++;
  if (cond) { console.log(`    ok    ${name}`); return; }
  failures.push(`${where}: ${name} ${detail}`.trim());
  console.error(`    FAIL  ${name}  ${detail}`);
};

// The same twelve subscriptions office-coming-in.mjs feeds (nine renew in the window,
// one a failed card, two yearly, one long name), and a month WITH money and bills, so
// every section draws its fullest shape: the step chart, the split bar, the donut.
const NOW = Date.now();
const at = (d) => new Date(NOW + d * 864e5).toISOString();
const SPEC = [
  ["Alder", { status: "active", recurring_cents: 6000, bill_interval: "month", current_period_end: at(1) }],
  ["Birch", { status: "active", recurring_cents: 6000, bill_interval: "month", current_period_end: at(4) }],
  ["Cedar", { status: "past_due", recurring_cents: 6000, bill_interval: "month", current_period_end: at(4.01) }],
  ["Dogwood", { status: "active", recurring_cents: 60000, bill_interval: "year", current_period_end: at(4.02) }],
  ["Elm", { status: "active", recurring_cents: 6000, bill_interval: "month", current_period_end: at(9) }],
  ["Ruby Ridge Auto Spa", { status: "active", recurring_cents: 12000, bill_interval: "month", current_period_end: at(13) }],
  ["Gum", { status: "trialing", recurring_cents: 6000, bill_interval: "month", current_period_end: at(17) }],
  ["Hazel", { status: "active", recurring_cents: 6000, bill_interval: "month", current_period_end: at(22) }],
  ["Ivy", { status: "active", recurring_cents: 60000, bill_interval: "year", current_period_end: at(29.5) }],
  ["Juniper", { status: "active", recurring_cents: 6000, bill_interval: "month", current_period_end: at(10), cancel_at_period_end: true }],
  ["Larch", { status: "active", recurring_cents: 6000, bill_interval: "month", current_period_end: at(40) }],
  ["Maple", { status: "past_due", recurring_cents: 6000, bill_interval: "month", current_period_end: at(-2) }],
];
const PROTO = { name: "Fed", is_demo: false, status: "active", owner_email: "owner@example.com", created_at: "2026-08-01T12:00:00Z", bookings_total: 0, jobs_month: 0, customers: 0, setup_inputs: {} };
const ROWS = SPEC.map(([nm, s], k) => ({ ...PROTO, id: `fed-${k}`, slug: `fed-${k}`, name: `Fed ${nm}`, subscription: { suspended_at: null, cancel_at_period_end: false, ...s } }));
const BUILT_IN = {
  website: { setup: 999, monthly: 60, annual: 600, monthToMonth: 75 },
  bookingOnly: { monthly: 35 },
  founding: { setup: 499, monthly: 40, annual: 400, monthToMonth: 50 },
  term: { months: 12, exitFeeShare: 0.5 },
};
const BY = { hosting: 1900, database: 2500 };
const NET = { revenue_cents: 23000, cost_cents: 4400, net_cents: 18600, costs_entered: true, cost_count: 2, by_category: BY };

// ONE INSPECTOR for the real questions and the canary.
const INSPECT = () => {
  const R = (el) => el.getBoundingClientRect();
  const opacity = (el) => { let n = 1; for (let e = el; e; e = e.parentElement) n *= Number(getComputedStyle(e).opacity); return n; };
  const hidden = (el) => { for (let e = el; e; e = e.parentElement) { const s = getComputedStyle(e); if (s.display === "none" || s.visibility === "hidden") return true; } return false; };
  const main = document.querySelector(".bo-main");
  const ms = getComputedStyle(main), mr = R(main), z = main.currentCSSZoom || 1;   // computed padding is unzoomed; rects are not
  const col = { left: mr.left + parseFloat(ms.paddingLeft) * z, right: mr.right - parseFloat(ms.paddingRight) * z };
  const say = (el) => (el.getAttribute?.("aria-label") || el.textContent || el.className || "").replace(/\s+/g, " ").trim().slice(0, 34);
  const decor = (el) => !!el.closest("[aria-hidden=true]") || !!el.closest(".bo-bg");

  // Text, as the line boxes its glyphs take; controls, as their boxes.
  const pieces = [], faint = [];
  const walk = document.createTreeWalker(main, NodeFilter.SHOW_TEXT);
  while (walk.nextNode()) {
    const t = walk.currentNode, el = t.parentElement;
    if (!t.textContent.trim() || decor(el) || hidden(el)) continue;
    if (opacity(el) < .99) { faint.push(say(el)); continue; }
    const rg = document.createRange(); rg.selectNodeContents(t);
    for (const r of rg.getClientRects()) if (r.width > .5 && r.height > .5) pieces.push({ el, r, what: `"${t.textContent.trim().slice(0, 24)}"`, node: t });
  }
  for (const el of main.querySelectorAll("button, a[href], input")) {
    if (decor(el) || hidden(el) || R(el).width < 1) continue;
    pieces.push({ el, r: R(el), what: `[${say(el)}]`, control: true });
  }
  const touching = [];
  const over = (a, b) => Math.min(a.right, b.right) - Math.max(a.left, b.left) > .5 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > .5;
  for (let i = 0; i < pieces.length; i++) for (let j = i + 1; j < pieces.length; j++) {
    const a = pieces[i], b = pieces[j];
    if (a.node && a.node === b.node) continue;                       // one text wrapping onto its next line
    if (a.el.contains(b.el) || b.el.contains(a.el)) continue;         // a label inside its own button
    if (!a.control && !b.control) {
      // Glyph boxes taller than a tight line-height overlap a neighbor's by design;
      // compare the ink band (the middle 70% of each line) instead.
      const ink = (r) => ({ left: r.left, right: r.right, top: r.top + r.height * .15, bottom: r.bottom - r.height * .15 });
      if (!over(ink(a.r), ink(b.r))) continue;
    } else if (!over(a.r, b.r)) continue;
    if (a.control && b.control && (a.el.contains(b.el) || b.el.contains(a.el))) continue;
    touching.push(`${a.what} x ${b.what}`);
  }

  // Every section and every card spans the column.
  const CARDS = ".bo-sec, .bo-tl .lab, .bo-due button, .bo-bill, .bo-pgroup, .bo-split, .bo-wf, .bo-chips";
  const span = [...main.querySelectorAll(CARDS)].filter((el) => !hidden(el) && R(el).width > 0).map((el) => {
    const r = R(el);
    return { what: `${el.className.split(" ")[0] || el.tagName.toLowerCase()} ${say(el)}`, left: r.left - col.left, right: col.right - r.right };
  });
  const short = span.filter((s) => Math.abs(s.right) > 1 || s.left < -1);

  // Clipped by its box or by the screen; words broken mid-word.
  const clipped = [], broken = [];
  for (const p of pieces) {
    if (p.r.left < -.5 || p.r.right > innerWidth + .5) clipped.push(`${p.what} leaves the screen`);
  }
  for (const el of main.querySelectorAll("*")) {
    if (decor(el) || hidden(el)) continue;
    const s = getComputedStyle(el);
    if (s.textOverflow === "ellipsis" && el.scrollWidth > el.clientWidth + 1) clipped.push(`${say(el)} ellipsized`);
    if (/hidden|clip/.test(s.overflowX) && el.scrollWidth > el.clientWidth + 1 && el.textContent.trim()) clipped.push(`${say(el)} cut on the side`);
  }
  const walk2 = document.createTreeWalker(main, NodeFilter.SHOW_TEXT);
  while (walk2.nextNode()) {
    const t = walk2.currentNode;
    if (!t.textContent.trim() || decor(t.parentElement) || hidden(t.parentElement)) continue;
    for (const m of t.textContent.matchAll(/\S{2,}/g)) {
      const rg = document.createRange(); rg.setStart(t, m.index); rg.setEnd(t, m.index + m[0].length);
      const tops = new Set([...rg.getClientRects()].filter((r) => r.width > .5).map((r) => Math.round(r.top)));
      if (tops.size > 1) broken.push(m[0]);
    }
  }

  // The tab bar: highlight centred on the active tab; every label inside its tab.
  const pill = document.querySelector(".bo-navpill"), on = document.querySelector(".bo-nav.on");
  const pr = pill && R(pill), or = on && R(on);
  const tabs = [...document.querySelectorAll(".bo-nav")].map((b) => {
    const rg = document.createRange(); const t = [...b.childNodes].find((n) => n.nodeType === 3 && n.textContent.trim());
    if (!t) return { label: b.textContent.trim(), fits: false };
    rg.selectNodeContents(t); const lr = R(b), rr = [...rg.getClientRects()];
    return { label: t.textContent.trim(), lines: new Set(rr.map((r) => Math.round(r.top))).size, fits: rr.every((r) => r.left >= lr.left - .5 && r.right <= lr.right + .5 && r.bottom <= lr.bottom + .5) };
  });
  const tabTouch = [];
  for (let i = 1; i < tabs.length; i++) { /* labels are inside distinct tabs: compared through their rects above */ }
  const bar = document.querySelector(".bo-rail"), br = bar && R(bar);
  return {
    vw: innerWidth, col: { left: Math.round(col.left), right: Math.round(col.right), width: Math.round(col.right - col.left) },
    pieces: pieces.length, touching, short, spanCount: span.length, clipped, broken, faint,
    pill: pr && or ? { dx: Math.round((pr.left + pr.width / 2 - (or.left + or.width / 2)) * 10) / 10, dw: Math.round((pr.width - or.width) * 10) / 10, dy: Math.round((pr.top + pr.height / 2 - (or.top + or.height / 2)) * 10) / 10 } : null,
    tabs, tabTouch, bar: br ? { left: Math.round(br.left), right: Math.round(innerWidth - br.right), bottom: Math.round(innerHeight - br.bottom) } : null,
    overflowX: document.documentElement.scrollWidth > innerWidth + 1,
    // Fonts the reader actually gets, so a phone's text setting is visible in the record.
    font: { body: getComputedStyle(main).fontSize, h2: getComputedStyle(document.querySelector(".bo-h2") || main).fontSize },
  };
};
const inspect = (page) => page.evaluate(`(${INSPECT.toString()})()`);

let browser = null, completed = 0;
const canary = { id: "card-pinned-narrow-and-label-on-label", observed_failure: false };
mkdirSync(ART, { recursive: true });
mkdirSync(SHOTS, { recursive: true });

const openMoney = async (page, zoom) => {
  await page.goto(`${BASE}/admin/office#money`, { waitUntil: "domcontentloaded" });
  if (zoom) await page.addStyleTag({ content: `html { zoom: ${zoom}; }` });
  await page.waitForSelector(".bo-money", { timeout: 60000 });
  await page.waitForFunction(() => !/Reading/.test(document.querySelector(".bo-money").innerText), null, { timeout: 40000 });
  if (BREAK === "narrow") await page.addStyleTag({ content: ".bo-due button { width: 240px !important; }" });
  await settle(page, 3200);
  await page.waitForTimeout(700);   // the tab highlight's spring (.55s) comes to rest
};

try {
  browser = await chromium.launch();
  for (const size of SIZES) {
    const where = tag(size);
    console.log(`\n${where}`);
    const ctx = await browser.newContext({ viewport: { width: size.w, height: size.h }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 });
    await ctx.addInitScript(([k, v]) => localStorage.setItem(k, v), [`sb-${REF}-auth-token`, JSON.stringify(SESSION)]);
    const page = await ctx.newPage();
    watchConsole(page, where, consoleNoise);
    await page.route("**/auth/v1/user**", (r) => r.fulfill({ json: user }));
    await page.route("**/functions/v1/platform-admin", async (route) => {
      const body = JSON.parse(route.request().postData() || "{}");
      if (body.action === "whoami") return route.fulfill({ json: { email: user.email } });
      if (body.action === "list") return route.fulfill({ json: { rows: ROWS, totals: {}, prices: { current: null, built_in: BUILT_IN, updated_at: null } } });
      if (body.action === "get") return route.fulfill({ json: { bookings: [], invoices: [], events: [] } });
      if (body.action === "platform_net") return route.fulfill({ json: { period_month: body.period, ...NET } });
      return route.fulfill({ json: {} });
    });

    await openMoney(page, size.zoom);
    if (FREEZE && size === SIZES[2]) {
      // Captured at 390, as every earlier copy was; Andrew opens it in the control
      // room's frame at HIS phone's width, which is where the highlight went wrong.
      const { freeze } = await import("file:///C:/Users/rando/Downloads/claude/belt/freeze.mjs");
      const before = FREEZE === "before";
      await freeze(page, {
        out: `${SHOTS}/${FREEZE}.html`, label: before ? "Before" : "After",
        note: before
          ? "Open this on your phone: unless your screen is exactly 390 wide, the green highlight in the bottom bar sits off the Money tab, because it was measured for a 390 screen."
          : "The green highlight now sits on the Money tab at any phone width, in this copy too. Every card reaches the edge and nothing touches at 360 to 430 wide and with large text.",
        highlight: ".bo-navlist",
      });
      console.log(`froze ${SHOTS}/${FREEZE}.html`);
      await ctx.close();
      continue;
    }
    if (FREEZE) { await ctx.close(); continue; }

    const o = await inspect(page);
    observed[where] = o;
    check(where, `the inspector found text and controls to compare (>= 120, found ${o.pieces}) and cards to span (>= 20, found ${o.spanCount})`, o.pieces >= 120 && o.spanCount >= 20);
    check(where, "no two pieces of text or controls touch", o.touching.length === 0, o.touching.slice(0, 4).join(" | "));
    check(where, `every section and card spans the ${o.col.width}px content column`, o.short.length === 0, o.short.slice(0, 4).map((s) => `${s.what} (left ${s.left.toFixed(1)}, short ${s.right.toFixed(1)})`).join(" | "));
    check(where, "no text is clipped by its box or the screen", o.clipped.length === 0, o.clipped.slice(0, 4).join(" | "));
    check(where, "no word breaks mid-word", o.broken.length === 0, o.broken.slice(0, 6).join(", "));
    check(where, "no text is caught mid-fade at rest", o.faint.length === 0, o.faint.slice(0, 4).join(", "));
    check(where, "the page never scrolls sideways", !o.overflowX);
    check(where, "the tab highlight is centred on the active tab (± 1px)", !!o.pill && Math.abs(o.pill.dx) <= 1 && Math.abs(o.pill.dw) <= 1 && Math.abs(o.pill.dy) <= 1, JSON.stringify(o.pill));
    check(where, "every tab label sits inside its tab on one line", o.tabs.length === 4 && o.tabs.every((t) => t.fits && t.lines === 1), JSON.stringify(o.tabs));

    // The end of the page clears the floating tab bar.
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await page.waitForTimeout(250);
    const clear = await page.evaluate(() => {
      const bar = document.querySelector(".bo-rail").getBoundingClientRect();
      const last = [...document.querySelectorAll(".bo-money .bo-sec")].at(-1).getBoundingClientRect();
      return Math.round(bar.top - last.bottom);
    });
    check(where, "scrolled to the end, the last section ends above the tab bar", clear >= 8, `${clear}px`);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(250);

    await page.screenshot({ path: `${ART}/money-${where.replace("%", "pct").replace("@", "-")}.png`, fullPage: true });
    artifacts.push(`${ART}/money-${where.replace("%", "pct").replace("@", "-")}.png`);

    if (size === SIZES[0]) {
      // CANARY: the two defects this check exists for, put in by hand. A list row
      // pinned narrower than the column, and one label laid on another's.
      await page.evaluate(() => {
        const r = document.querySelector(".bo-due button"); r.dataset.was = r.getAttribute("style") || ""; r.style.width = "240px";
        const [a, b] = document.querySelectorAll(".bo-bill b"); const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
        b.dataset.was = b.getAttribute("style") || ""; b.style.cssText += `;position:relative;left:${ra.left - rb.left}px;top:${ra.top - rb.top}px`;
      });
      const c = await inspect(page);
      await page.evaluate(() => document.querySelectorAll("[data-was]").forEach((e) => { e.setAttribute("style", e.dataset.was); delete e.dataset.was; }));
      canary.short = c.short.length - o.short.length; canary.touching = c.touching.length - o.touching.length;
      canary.observed_failure = canary.short > 0 && canary.touching > 0;
      console.log(`    canary ${canary.observed_failure ? "CAUGHT" : "MISSED"}: short +${canary.short}, touching +${canary.touching}`);
    }
    completed++;
    await ctx.close();
  }
  // ── WIDER: the same highlight on the laptop rail (1440) and the tablet dock (768) ──
  // Cards there have their own max widths by design, so only the bar is asked.
  if (!FREEZE && !arg("frames")) for (const w of [768, 1440]) {
    const where = `${w}`;
    const ctx = await browser.newContext({ viewport: { width: w, height: 900 } });
    await ctx.addInitScript(([k, v]) => localStorage.setItem(k, v), [`sb-${REF}-auth-token`, JSON.stringify(SESSION)]);
    const page = await ctx.newPage();
    watchConsole(page, where, consoleNoise);
    await page.route("**/auth/v1/user**", (r) => r.fulfill({ json: user }));
    await page.route("**/functions/v1/platform-admin", (route) => route.fulfill({ json: (({ whoami: { email: user.email }, list: { rows: ROWS, totals: {}, prices: { current: null, built_in: BUILT_IN } }, platform_net: NET })[JSON.parse(route.request().postData() || "{}").action]) ?? {} }));
    console.log(`\n${where}`);
    await page.goto(`${BASE}/admin/office`);
    await page.waitForSelector(".bo-nav.on", { timeout: 60000 });
    // Pressed, not addressed: a hash-only goto does not reload, so the place would not change.
    for (const tab of ["Today", "Money", "System"]) {
      await page.locator(".bo-nav").filter({ hasText: tab }).click();
      check(where, `${tab}: pressing the tab makes it the active one`, (await page.locator(".bo-nav.on").innerText()).includes(tab));
      await settle(page, 2500); await page.waitForTimeout(700);
      const o = await inspect(page);
      check(where, `${tab}: the highlight is centred on the active tab (± 1px)`, !!o.pill && Math.abs(o.pill.dx) <= 1 && Math.abs(o.pill.dw) <= 1 && Math.abs(o.pill.dy) <= 1, JSON.stringify(o.pill));
      await page.screenshot({ path: `${ART}/${tab.toLowerCase()}-${w}.png` }); artifacts.push(`${ART}/${tab.toLowerCase()}-${w}.png`);
    }
    await ctx.close();
  }

  // ── THE COPY ANDREW ACTUALLY OPENS ────────────────────────────────────────────
  // The control room shows a frozen copy in an <iframe> as wide as his screen, and a
  // frame ignores the copy's own viewport line. So the copy is asked the same
  // questions inside a frame at three phone widths. --frames=before measures the
  // Before copy instead, for the record, and asserts nothing.
  if (!FREEZE && !BREAK || arg("frames")) {
    const which = arg("frames") || "after";
    const file = `${SHOTS}/${which}.html`;
    for (const w of [360, 412, 430]) {
      const where = `copy ${which} @${w}`;
      if (!existsSync(file)) { check(where, `the frozen ${which} copy exists`, false, file); continue; }
      const host = `${ART}/frame-host.html`;
      writeFileSync(host, `<!doctype html><meta name="viewport" content="width=device-width"><body style="margin:0"><iframe src="${pathToFileURL(file).href}" style="border:0;width:${w}px;height:860px"></iframe>`);
      const ctx = await browser.newContext({ viewport: { width: w, height: 860 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 });
      const page = await ctx.newPage();
      await page.goto(pathToFileURL(host).href);
      const frame = page.frames().find((f) => f.url().endsWith(`${which}.html`));
      await frame.waitForSelector(".bo-money");
      await page.waitForTimeout(1500);
      const o = await frame.evaluate(`(${INSPECT.toString()})()`);
      observed[where] = o;
      console.log(`\n${where}: highlight ${JSON.stringify(o.pill)}`);
      if (which === "after") {
        check(where, "in the frame, the tab highlight is centred on the Money tab (± 1px)", !!o.pill && Math.abs(o.pill.dx) <= 1 && Math.abs(o.pill.dw) <= 1, JSON.stringify(o.pill));
        check(where, "in the frame, nothing touches, every card spans, nothing is clipped", o.touching.length + o.short.length + o.clipped.length + o.broken.length === 0,
          [...o.touching, ...o.short.map((x) => x.what), ...o.clipped, ...o.broken].slice(0, 4).join(" | "));
      }
      await ctx.close();
    }
  }
} catch (e) {
  failures.push(`run stopped: ${e.message}`);
  console.error(e.stack || e.message);
} finally {
  await browser?.close();
}

if (FREEZE) process.exit(0);
for (const c of consoleNoise) failures.push(`console: ${c}`);
const status = failures.length === 0 && completed === SIZES.length && canary.observed_failure ? "pass" : "fail";
const { path } = writeReceipt({
  check_id: `office-money-phone${BREAK ? "-" + BREAK : ""}`,
  started_at,
  status,
  expected_targets: SIZES.length,
  discovered_targets: SIZES.length,
  attempted_targets: SIZES.length,
  completed_targets: completed,
  skipped_targets: 0,
  assertions_executed: assertions,
  min_assertions: SIZES.length * 10,
  assertion_floor: "6 declared phone renderings (360, 375, 390, 412, 430, and 390 at 130% zoom) x 10 questions.",
  failures,
  artifacts,
  canary,
  warnings: ["All sessions and platform responses are synthetic. No database write or credential use.",
    "130% text is emulated with CSS zoom on <html>, which is how a phone's page-zoom text setting reflows; a browser's per-block font boosting cannot be reproduced in headless Chromium and is not claimed.",
    ...(BREAK ? [`deliberate --break=${BREAK}`] : [])],
  dimensions: { sizes: SIZES.map(tag), ...(BREAK && { break: BREAK }), observed },
});
console.log(`\n${status.toUpperCase()} — ${assertions} assertions, ${failures.length} failed, canary ${canary.observed_failure ? "caught" : "MISSED"} → ${path}`);
process.exit(status === "pass" ? 0 : 1);
