// ROADMAP 9.12b: real browser, phone first. No credentials or database writes.
// All platform responses and the session are synthetic; server billing is not tested.
// node scripts/office-coming-in.mjs [--freeze=before] [--break=bare|faded|offscreen]
// Six declared widths; nine included renewals, three refused by the window/cancel rules.
// Canary: overlap, ancestor opacity, and the original hidden-start/no-cue defect.
// Screenshots live in artifacts; Andrew gets frozen HTML copies outside the repo.
import { createRequire } from "node:module";
import { mkdirSync, writeFileSync, existsSync, unlinkSync } from "node:fs";
import { writeReceipt } from "./receipt.mjs";
import { settle, watchConsole } from "./lib/bookingWalk.mjs";

const { chromium } = createRequire(import.meta.url)("./../app/node_modules/playwright/index.js");

const started_at = new Date().toISOString();
const arg = (k) => (process.argv.find((a) => a.startsWith(`--${k}=`)) || "").split("=")[1] || "";
const BREAK = arg("break"), FREEZE = arg("freeze");
const BASE = process.env.BASE || "http://localhost:5173";
const SIZES = [{ w: 390, h: 844 }, { w: 392, h: 844 }, { w: 320, h: 700 }, { w: 768, h: 1024 }, { w: 1440, h: 900 }, { w: 1920, h: 1080 }];
const ART = `artifacts/office-coming-in${BREAK ? "/" + BREAK : ""}`;
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

// [name, subscription, in the window?]. Days are fractional so same-day order is fixed.
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
const IN = ["Alder", "Birch", "Cedar", "Dogwood", "Elm", "Ruby Ridge Auto Spa", "Gum", "Hazel", "Ivy"];
const LATE = ["Cedar"], YEARLY = ["Dogwood", "Ivy"];
const day = (t) => new Date(t).toLocaleDateString("en-US", { month: "short", day: "numeric" });
const usd = (c) => `$${Math.round(c / 100).toLocaleString("en-US")}`;
const WANT = IN.map((n) => { const s = SPEC.find(([m]) => m === n)[1]; return { name: `Fed ${n}`, date: day(s.current_period_end), amt: usd(s.recurring_cents) }; });
const WANT_TOTAL = SPEC.filter(([n]) => IN.includes(n) && !LATE.includes(n)).reduce((a, [, s]) => a + s.recurring_cents, 0);
const fedRows = (live, empty) => {
  const proto = live.find((r) => !r.is_demo) ?? live[0];
  const synthetic = SPEC.map(([nm, s], k) => ({
    ...structuredClone(proto), id: `fed-${k}`, slug: `fed-${k}`, name: `Fed ${nm}`, is_demo: false, status: "active",
    subscription: { suspended_at: null, cancel_at_period_end: false, ...s, ...(empty && { status: "canceled" }) },
  }));
  return { proto, rows: [...live.filter((r) => r.is_demo), ...synthetic] };
};

// ONE INSPECTOR, used by the real questions AND the canary. It reads the labels as
// a person would: visible text, real boxes, and where each sits against its box.
const INSPECT = (blind) => {
  const R = (el) => el.getBoundingClientRect();
  const sc = document.querySelector(".bo-tl");
  const pins = [...document.querySelectorAll(".bo-tl .bo-pin")];
  const labs = pins.map((p) => p.querySelector(".lab")).filter(Boolean);
  const words = [...document.querySelectorAll(".bo-tl .now, .bo-tl .end, .bo-tl .bo-tl-none")];
  const hit = (a, b) => Math.min(a.right, b.right) - Math.max(a.left, b.left) > 0.5 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 0.5;
  const opacity = (el) => {
    let n = 1;
    for (let e = el; e; e = e.parentElement) n *= Number(getComputedStyle(e).opacity);
    return n;
  };
  const shown = (el) => R(el).width > 0 && getComputedStyle(el).visibility !== "hidden" && opacity(el) >= .99;
  const inScreen = (el) => { const r = R(el), b = R(sc); return shown(el) && r.left >= Math.max(0, b.left) - .5 && r.right <= Math.min(innerWidth, b.right) + .5 && r.top >= 0 && r.bottom <= innerHeight - 100; };
  const start = !!sc && words.some((w) => w.textContent === "Today" && inScreen(w)) && labs.slice(0, 3).length === 3 && labs.slice(0, 3).every(inScreen);

  const out = {
    pins: pins.map((p) => ({ cls: p.className, text: (p.querySelector(".lab")?.innerText ?? "").replace(/\s+/g, " ").trim(), shown: !!p.querySelector(".lab") && shown(p.querySelector(".lab")), opacity: p.querySelector(".lab") ? opacity(p.querySelector(".lab")) : 0 })),
    start,
    overlaps: [], outside: [], overflowX: document.documentElement.scrollWidth > window.innerWidth + 1,
    box: sc ? { left: R(sc).left, right: R(sc).right, scrolls: sc.scrollWidth > sc.clientWidth + 1 } : null,
    words: words.filter(shown).map((w) => w.textContent.trim()),
    // In VIEW, not merely drawn: inside the box's visible part and on the screen.
    inView: sc ? words.filter(shown).filter((w) => { const r = R(w), b = R(sc); return r.left >= Math.max(b.left, 0) - 0.5 && r.right <= Math.min(b.right, window.innerWidth) + 0.5; }).map((w) => w.textContent.trim()) : [],   // textContent: innerText is the CSS uppercase (docs/gotchas.md 115)
  };
  if (!sc) return out;
  const all = [...labs.filter(shown), ...words.filter(shown)];
  if (!blind) for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) {
    if (hit(R(all[i]), R(all[j]))) out.overlaps.push(`${all[i].innerText.replace(/\s+/g, " ").slice(0, 22)} x ${all[j].innerText.replace(/\s+/g, " ").slice(0, 22)}`);
  }
  const b = R(sc);
  for (const l of all) {
    const r = R(l), left = r.left - b.left + sc.scrollLeft, right = r.right - b.left + sc.scrollLeft;
    if (left < -0.5 || right > sc.scrollWidth + 0.5 || r.top < b.top - 0.5 || r.bottom > b.bottom + 0.5) out.outside.push(l.innerText.replace(/\s+/g, " ").slice(0, 30));
  }
  if (b.left < -0.5 || b.right > window.innerWidth + 0.5) out.outside.push("the timeline box itself leaves the screen");
  return out;
};
const inspect = (page, blind = false) => page.evaluate(`(${INSPECT.toString()})(${blind})`);

// 44px: each pin's label, pressed 21px either side of its center, lands on that pin.
const press44 = (page) => page.evaluate(() => {
  const bad = [];
  for (const p of document.querySelectorAll(".bo-tl .bo-pin")) {
    p.scrollIntoView({ block: "center", inline: "center" });
    const l = p.querySelector(".lab");
    const r = (l && l.getBoundingClientRect().width > 0 ? l : p).getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    for (const [dx, dy] of [[0, -21], [0, 21], [-21, 0], [21, 0]]) {
      const h = document.elementFromPoint(cx + dx, cy + dy);
      if (!h || !p.contains(h)) bad.push(`${p.getAttribute("aria-label")} @${dx},${dy}`);
    }
  }
  return bad;
});

let browser = null, completed = 0;
const canary = { id: "overlap-painted-opacity-and-hidden-start", observed_failure: false };
mkdirSync(ART, { recursive: true });
mkdirSync(SHOTS, { recursive: true });

const openMoney = async (page, { lite = false } = {}) => {
  await page.goto(`${BASE}/admin/office${lite ? "?lite=1" : ""}`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".bo-nav", { timeout: 60000 });
  await page.locator(".bo-nav").filter({ hasText: "Money" }).click();
  await page.waitForSelector(".bo-money", { timeout: 20000 });
  await page.waitForFunction(() => !/Reading/.test(document.querySelector(".bo-money").innerText), null, { timeout: 40000 });
  if (BREAK === "faded") await page.addStyleTag({ content: ".bo-tl .bo-pin { opacity: 0 !important; }" });
  if (BREAK === "bare") await page.addStyleTag({ content: ".bo-tl .lab { display: none !important; }" });
  await settle(page, 2600);
  await page.locator('section[aria-label="Coming in, next 30 days"]').evaluate((e) => e.scrollIntoView({ block: "start" }));
  await page.waitForTimeout(300);
  if (BREAK === "offscreen") await page.evaluate(() => {
    const sc = document.querySelector(".bo-tl"), track = sc.querySelector(".bo-tl-in");
    sc.style.overflowX = "hidden"; track.style.width = "max(1600px, 150%)"; sc.scrollLeft = 240;
  });
};

try {
  browser = await chromium.launch();
  for (const size of SIZES) {
    const where = `${size.w}`;
    console.log(`\n${where}`);
    const ctx = await browser.newContext({ viewport: { width: size.w, height: size.h } });
    await ctx.addInitScript(([k, v]) => localStorage.setItem(k, v), [`sb-${REF}-auth-token`, JSON.stringify(SESSION)]);
    const page = await ctx.newPage();
    watchConsole(page, where, consoleNoise);
    let empty = false;
    const proto = { id: "fed", name: "Fed", slug: "fed", is_demo: false, status: "active", owner_email: "owner@example.com", created_at: "2026-08-01T12:00:00Z", bookings_total: 0, jobs_month: 0, customers: 0, setup_inputs: {} };
    await page.route("**/auth/v1/user**", (r) => r.fulfill({ json: user }));
    await page.route("**/functions/v1/platform-admin", async (route) => {
      const body = JSON.parse(route.request().postData() || "{}");
      const f = fedRows([proto], empty);
      if (body.action === "whoami") return route.fulfill({ json: { email: user.email } });
      if (body.action === "list") return route.fulfill({ json: { rows: f.rows, totals: {} } });
      if (body.action === "get") return route.fulfill({ json: { bookings: [], invoices: [], events: [] } });
      if (body.action === "platform_net") return route.fulfill({ json: { revenue_cents: 0, cost_cents: 0, net_cents: null, costs_entered: false, by_category: {} } });
      return route.fulfill({ json: {} });
    });

    await openMoney(page);
    if (FREEZE === "before") {
      const { freeze } = await import("file:///C:/Users/rando/Downloads/claude/belt/freeze.mjs");
      await freeze(page, {
        out: `${SHOTS}/before.html`, label: "Before",
        note: "On a phone the wide timeline needs sideways scrolling, names are clipped and list badges disappear; the zero-dollar chart above reserves a large empty space.",
        highlight: ".bo-tl .now",
      });
      await freeze(page, { out: `${SHOTS}/before-zero.html`, label: "Before", note: "A zero-dollar month reserves a tall empty chart.", highlight: ".bo-wf" });
      await page.screenshot({ path: `${ART}/before-390.png`, fullPage: true });
      console.log(`froze ${SHOTS}/before.html`);
      break;
    }
    const o = await inspect(page);
    observed[`${where} fed`] = o;
    check(where, `one pin per renewal in the window (${IN.length})`, o.pins.length === IN.length, `found ${o.pins.length}`);
    const wrong = WANT.map((w, k) => {
      const p = o.pins[k];
      if (!p || !p.shown) return `${w.name}: no visible label`;
      return [w.name, w.date, w.amt].every((s) => p.text.includes(s)) ? "" : `${w.name}: label reads "${p.text}"`;
    }).filter(Boolean);
    check(where, "each pin's label shows its name, date and amount, in date order", wrong.length === 0, wrong.slice(0, 3).join(" | "));
    const stateOk = o.pins.every((p, k) => {
      const nm = IN[k];
      return /\blate\b/.test(p.cls) === LATE.includes(nm) && /\byr\b/.test(p.cls) === YEARLY.includes(nm);
    });
    check(where, "the failed card is drawn late (red), the yearly ones yearly (blue), the rest ordinary", stateOk, o.pins.map((p) => p.cls).join(","));
    const colors = await page.$$eval(".bo-tl .bo-pin .dot", (ds) => ds.map((d) => getComputedStyle(d).backgroundColor));
    const k0 = IN.indexOf("Alder"), kL = IN.indexOf("Cedar"), kY = IN.indexOf("Dogwood");
    check(where, "the three states are three different colors", new Set([colors[k0], colors[kL], colors[kY]]).size === 3, colors.join(" "));
    check(where, `"expected" is ${usd(WANT_TOTAL)}, the failed card left out`, (await page.locator("[data-testid=coming]").innerText()).trim() === `${usd(WANT_TOTAL)} expected`, await page.locator("[data-testid=coming]").innerText());
    check(where, "no two labels overlap, nor the axis words", o.overlaps.length === 0, o.overlaps.slice(0, 3).join(" | "));
    check(where, "no label leaves the timeline's own box; the box stays on screen", o.outside.length === 0, o.outside.slice(0, 3).join(" | "));
    check(where, "the page never scrolls sideways", !o.overflowX);
    check(where, "Today and the date 30 days out are on the axis", o.words.includes("Today") && o.words.includes(day(NOW + 30 * 864e5)), o.words.join(","));
    check(where, "the list under the timeline is kept, one row per renewal", (await page.locator(".bo-due button").count()) === IN.length);
    check(where, "initial view: Today and the first three renewals are readable without sideways scrolling", o.start, `start=${o.start}, scrolls=${o.box?.scrolls}`);
    check(where, "phone: the entire month fits horizontally, with no hidden portion", size.w > 860 || (o.box && !o.box.scrolls));
    check(where, "all nine labels are painted, including ancestor opacity", o.pins.length === IN.length && o.pins.every((p) => p.opacity >= .99), o.pins.map((p) => p.opacity).join(","));
    const rows = await page.$$eval(".bo-due button", (bs) => bs.map((b) => {
      const a = b.querySelector(".bo-av"), r = a?.getBoundingClientRect();
      return { text: b.textContent.replace(/\s+/g, " "), badge: !!r && r.width > 0 && getComputedStyle(a).display !== "none" };
    }));
    check(where, "every list row keeps its colored initials badge", rows.length === IN.length && rows.every((r) => r.badge));
    check(where, "list keeps names, dates, amounts, yearly and failed-card states", WANT.every((w, k) => [w.name, w.date, w.amt, ...(LATE.includes(IN[k]) ? ["card failed"] : []), ...(YEARLY.includes(IN[k]) ? ["a year"] : [])].every((t) => rows[k]?.text.includes(t))));
    const cut = await page.$$eval(".bo-tl .lab .n, .bo-due b", (es) => es.filter((e) => e.scrollWidth > e.clientWidth + 1 || e.scrollHeight > e.clientHeight + 1 || getComputedStyle(e).textOverflow === "ellipsis").map((e) => e.textContent));
    check(where, "names wrap in full rather than being clipped", cut.length === 0, cut.join(","));
    check(where, "canceled, day-40 and past renewals are refused by both views", !o.pins.some((p) => /Fed (Juniper|Larch|Maple)/.test(p.text)) && !rows.some((r) => /Fed (Juniper|Larch|Maple)/.test(r.text)));
    const chart = await page.locator(".bo-wf-plot").first().evaluate((e) => e.getBoundingClientRect().height);
    check(where, "zero-dollar chart collapses its empty space", chart <= 48, `${chart}px`);
    // Photograph the arrival BEFORE any hit probe scrolls a pin into view.
    await page.screenshot({ path: `${ART}/fed-${size.w}.png`, fullPage: true }); artifacts.push(`${ART}/fed-${size.w}.png`);
    await page.screenshot({ path: `${ART}/arrival-${size.w}.png` }); artifacts.push(`${ART}/arrival-${size.w}.png`);
    const bad44 = await press44(page);
    check(where, "every pin has 44px of hit area", bad44.length === 0, bad44.slice(0, 3).join(" | "));

    if (size.w === SIZES[0].w) {
      const before = (await inspect(page)).overlaps.length;
      await page.evaluate(() => {
        const [a, b] = [...document.querySelectorAll(".bo-tl .bo-pin .lab")];
        const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
        b.dataset.canary = b.style.translate || "";
        b.style.translate = `${ra.left - rb.left}px ${ra.top - rb.top}px`;
      });
      const after = (await inspect(page)).overlaps.length;
      await page.evaluate(() => { const b = document.querySelector("[data-canary]"); b.style.translate = b.dataset.canary; delete b.dataset.canary; });
      canary.overlap = `overlaps ${before} -> ${after}`;
      await page.evaluate(() => { const p = document.querySelector(".bo-pin"); p.dataset.oldOpacity = p.style.opacity; p.style.opacity = "0"; });
      const faded = !(await inspect(page)).pins[0].shown;
      await page.evaluate(() => { const p = document.querySelector(".bo-pin"); p.style.opacity = p.dataset.oldOpacity; delete p.dataset.oldOpacity; });
      await page.locator('section[aria-label="Coming in, next 30 days"]').evaluate((e) => e.scrollIntoView({ block: "start" }));
      await page.evaluate(() => {
        const sc = document.querySelector(".bo-tl"), track = sc.querySelector(".bo-tl-in");
        sc.dataset.oldStyle = sc.getAttribute("style") || ""; track.dataset.oldStyle = track.getAttribute("style") || "";
        sc.style.overflowX = "hidden"; track.style.width = "1600px"; sc.scrollLeft = 240;
      });
      const hiddenStart = !(await inspect(page)).start;
      await page.evaluate(() => { for (const e of document.querySelectorAll("[data-old-style]")) { e.setAttribute("style", e.dataset.oldStyle); delete e.dataset.oldStyle; e.scrollLeft = 0; } });
      canary.opacity = faded; canary.hiddenStart = hiddenStart;
      canary.observed_failure = after > before && faded && hiddenStart;
      console.log(`    canary ${after > before ? "CAUGHT" : "MISSED"}: ${canary.overlap}`);
    }

    // Each pin opens its own detailer.
    const opened = [];
    for (let k = 0; k < IN.length; k++) {
      const pin = page.locator(".bo-tl .bo-pin").nth(k);
      if (!o.pins[k]?.shown || !(await pin.count())) { opened.push(`${IN[k]}: no pin`); continue; }
      // A person presses the label; the pin's own box takes no presses by design.
      if (!(await pin.locator(".lab").click({ timeout: 5000 }).then(() => true, () => false))) { opened.push(`${IN[k]}: label not pressable`); continue; }
      const got = await page.locator(".bo-panel").getAttribute("aria-label", { timeout: 8000 }).catch(() => null);
      if (got !== `Fed ${IN[k]}`) opened.push(`${IN[k]} opened ${got}`);
      await page.keyboard.press("Escape");
      await page.locator(".bo-panel").waitFor({ state: "detached", timeout: 8000 }).catch(() => {});
    }
    check(where, "every pin opens that detailer", opened.length === 0, opened.slice(0, 3).join(" | "));
    if (size.w === SIZES[0].w && !BREAK) {
      const { freeze } = await import("file:///C:/Users/rando/Downloads/claude/belt/freeze.mjs");
      await freeze(page, { out: `${SHOTS}/after.html`, label: "After", note: "The phone timeline runs from Today down through every renewal to the end date. Full names, amounts and card states fit, and the list keeps its colored badges.", highlight: ".bo-tl .now" });
      await freeze(page, { out: `${SHOTS}/after-zero.html`, label: "After", note: "The zero-dollar chart keeps its figures and labels without the empty block.", highlight: ".bo-wf" });
      await freeze(page, { out: "C:/Users/rando/Downloads/claude/belt/shots/9.12a/after-money.html", label: "After", note: "Money's phone timeline and zero-dollar chart now fit the page.", highlight: ".bo-tl .now" });
      await freeze(page, { out: `${SHOTS}/after-phone.html`, label: "After (phone)", note: "Every renewal is reachable by ordinary page scrolling, with no sideways scrolling or clipped labels.", highlight: ".bo-tl .now" });
      artifacts.push(`${SHOTS}/after.html`, `${SHOTS}/after-zero.html`);
      writeFileSync(`${SHOTS}/where.json`, JSON.stringify({ what: "Phone renewals now run down a timeline with full labels and list badges; the empty chart is compact.", url: `${BASE}/admin/office#money`, how: "Open the back office and tap Money, then scroll to Coming in.", situation: "Nine upcoming renewals, including three on one day, two yearly plans, a failed card, and a zero-dollar month." }, null, 2));
    }

    // ── EMPTY: nothing paying ─────────────────────────────────────────────────
    empty = true;
    await openMoney(page);
    const e = await inspect(page);
    observed[`${where} empty`] = e;
    check(where, "empty: no pins, and the timeline is still drawn", e.pins.length === 0 && !!e.box);
    check(where, `empty: Today, ${day(NOW + 30 * 864e5)} and one calm line, all in view without scrolling`,
      ["Today", day(NOW + 30 * 864e5), "Nothing renews in the next 30 days."].every((w) => e.inView.includes(w)), `in view: ${e.inView.join(",")}`);
    check(where, "empty: nothing overlaps, nothing leaves the box or the screen", e.overlaps.length === 0 && e.outside.length === 0 && !e.overflowX, [...e.overlaps, ...e.outside].join(" | "));
    check(where, "empty: the rail itself is drawn", await page.locator(".bo-tl .bo-tl-rail").evaluate((r) => r.getBoundingClientRect().width > 100).catch(() => false));
    await page.screenshot({ path: `${ART}/empty-${size.w}.png`, fullPage: true }); artifacts.push(`${ART}/empty-${size.w}.png`);

    // ── LITE: no motion ───────────────────────────────────────────────────────
    empty = false;
    await openMoney(page, { lite: true });
    const moving = await page.$$eval(".bo-tl, .bo-tl *", (els) => els.filter((el) => {
      const s = getComputedStyle(el);
      return s.animationName !== "none" || s.transitionDuration.split(",").some((d) => parseFloat(d) > 0);
    }).map((el) => el.className));
    check(where, "lite: nothing on the timeline animates", moving.length === 0, moving.slice(0, 3).join(","));
    check(where, "lite: the pins are all there", (await page.locator(".bo-tl .bo-pin").count()) === IN.length);
    await page.screenshot({ path: `${ART}/lite-${size.w}.png`, fullPage: true }); artifacts.push(`${ART}/lite-${size.w}.png`);

    completed++;
    await ctx.close();
  }
  if (!BREAK && !FREEZE) {
    const { differs } = await import("file:///C:/Users/rando/Downloads/claude/belt/freeze.mjs");
    const review = await browser.newPage();
    if (existsSync(`${SHOTS}/before.html`) && !(await differs(review, `${SHOTS}/before.html`, `${SHOTS}/after.html`))) {
      unlinkSync(`${SHOTS}/before.html`);
      const info = JSON.parse((await import("node:fs")).readFileSync(`${SHOTS}/where.json`, "utf8"));
      info.before = "The original and changed pages look identical in a still copy.";
      writeFileSync(`${SHOTS}/where.json`, JSON.stringify(info, null, 2));
    }
    await review.close();
  }
} catch (e) {
  failures.push(`run stopped: ${e.message}`);
  console.error(e.stack || e.message);
} finally {
  await browser?.close();

}

if (FREEZE === "before") process.exit(0);
for (const c of consoleNoise) failures.push(`console: ${c}`);
const status = failures.length === 0 && completed === SIZES.length && canary.observed_failure ? "pass" : "fail";
const { path } = writeReceipt({
  check_id: `office-coming-in${BREAK && BREAK !== "offscreen" ? "-" + BREAK : ""}`,
  started_at,
  status,
  expected_targets: SIZES.length,
  discovered_targets: SIZES.length,
  attempted_targets: SIZES.length,
  completed_targets: completed,
  skipped_targets: 0,
  assertions_executed: assertions,
  min_assertions: SIZES.length * 26,
  assertion_floor: "6 declared widths x 26 questions: fed 20, empty 4, lite 2; independent of database contents.",
  failures,
  artifacts,
  canary,
  warnings: ["All sessions and platform responses are synthetic. No database write or credential use; this checks browser behavior, not the billing server.", ...(BREAK ? [`deliberate --break=${BREAK}`] : [])],
  dimensions: { sizes: SIZES.map((s) => `${s.w}x${s.h}`), ...(BREAK && { break: BREAK }), observed },
});
console.log(`\n${status.toUpperCase()} — ${assertions} assertions, ${failures.length} failed, canary ${canary.observed_failure ? "caught" : "MISSED"} → ${path}`);
process.exit(status === "pass" ? 0 : 1);
