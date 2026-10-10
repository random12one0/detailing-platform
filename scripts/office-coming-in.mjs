// ROADMAP 9.12b — Money's "Coming in" timeline, in a real browser, at 1440, 768,
// 390 and 320.
//
//   node scripts/office-coming-in.mjs                 (dev server on :5173, credentials in .env)
//   node scripts/office-coming-in.mjs --break=bare    (labels hidden: back to bare dots, must go red)
//   node scripts/office-coming-in.mjs --freeze=before (only freezes the Before copy, no receipt)
//
// NOTHING IS WRITTEN. `list` is answered through page.route() with twelve known
// subscriptions: nine renew inside 30 days (three of them on the SAME day, one a
// failed card, two yearly), one is set to cancel, one renews on day 40 and one
// failed card is already behind. `get` for a fed detailer is forwarded as a read of
// a real one, so the panel opens on a real shape.
//
// PER WIDTH: every renewal is one pin whose label shows its name, date and amount,
// in date order and in its state's color; no two labels overlap each other or the
// axis words; no label leaves the timeline's own scroll box, and the box never
// leaves the screen; every pin is 44px pressable and opens that detailer; the
// "expected" figure leaves the failed card out. Then the EMPTY state (nothing
// paying) still shows Today, the date 30 days out and one line; then ?lite=1 has
// no motion on the timeline.
//
// THE CANARY pushes one label onto its neighbor; the overlap inspector must name
// it. `--break=bare` hides every label, which must turn the label questions red.
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
const arg = (k) => (process.argv.find((a) => a.startsWith(`--${k}=`)) || "").split("=")[1] || "";
const BREAK = arg("break"), FREEZE = arg("freeze");
const BASE = process.env.BASE || "http://localhost:5173";
const ADMIN_EMAIL = "office-coming-in-test@detailplatform.com";
const SIZES = [{ w: 1440, h: 900 }, { w: 768, h: 1024 }, { w: 390, h: 844 }, { w: 320, h: 700 }];
const ART = "artifacts/office-coming-in";
const SHOTS = "C:/Users/rando/Downloads/claude/belt/shots/9.12b";
const URL_ = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_ || !KEY) { console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY — nothing measured, no receipt written."); process.exit(1); }
if (!URL_.includes("kguqylyzgyzfktkfnhjb")) { console.error("SUPABASE_URL is not project kguqylyzgyzfktkfnhjb — refusing to run."); process.exit(1); }

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
  const shown = (el) => R(el).width > 0 && getComputedStyle(el).visibility !== "hidden";
  const out = {
    pins: pins.map((p) => ({ cls: p.className, text: (p.querySelector(".lab")?.innerText ?? "").replace(/\s+/g, " ").trim(), shown: !!p.querySelector(".lab") && shown(p.querySelector(".lab")) })),
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

const H = { apikey: KEY, Authorization: `Bearer ${KEY}` };
const all = await (await fetch(`${URL_}/auth/v1/admin/users?per_page=1000`, { headers: H })).json().catch(() => ({}));
const left = (all.users ?? []).find((u) => u.email === ADMIN_EMAIL);
if (left) { await dropAdmin(URL_, KEY, left.id); console.log("deleted a leftover throwaway admin first"); }
console.log(`writing: one throwaway platform admin on ${new URL(URL_).host}, removed when this run ends`);
const acct = await makeAdmin(URL_, KEY, ADMIN_EMAIL);
if (!acct) { console.error("could not create the throwaway admin; nothing measured"); process.exit(1); }
const redact = (t) => String(t).split(acct.password).join("[password]");

let browser = null, signedIn = null, completed = 0;
const canary = { id: "label-pushed-onto-its-neighbor", observed_failure: true };
mkdirSync(ART, { recursive: true });
mkdirSync(SHOTS, { recursive: true });

const openMoney = async (page, { lite = false } = {}) => {
  await page.goto(`${BASE}/admin/office${lite ? "?lite=1" : ""}`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".bo-nav", { timeout: 60000 });
  await page.locator(".bo-nav").filter({ hasText: "Money" }).click();
  await page.waitForSelector(".bo-money", { timeout: 20000 });
  await page.waitForFunction(() => !/Reading/.test(document.querySelector(".bo-money").innerText), null, { timeout: 40000 });
  if (BREAK === "bare") await page.addStyleTag({ content: ".bo-tl .lab { display: none !important; }" });
  await page.locator('section[aria-label="Coming in, next 30 days"]').scrollIntoViewIfNeeded();
  await settle(page, 2600);
};

try {
  browser = await chromium.launch();
  for (const size of SIZES) {
    const where = `${size.w}`;
    console.log(`\n${where}`);
    const ctx = await browser.newContext({ viewport: { width: size.w, height: size.h }, storageState: signedIn || undefined });
    const page = await ctx.newPage();
    watchConsole(page, where, consoleNoise);
    if (!signedIn) {
      await page.goto(`${BASE}/admin`, { waitUntil: "domcontentloaded" });
      await page.waitForSelector("input[type=email]", { timeout: 40000 });
      await page.fill("input[type=email]", acct.email);
      await page.fill("input[type=password]", acct.password);
      await page.click("form button.pa-btn");
      await page.waitForSelector(".pa-top", { timeout: 40000 });
      signedIn = await ctx.storageState();
    }
    let empty = false, proto = null;
    await page.route("**/functions/v1/platform-admin", async (route) => {
      const body = JSON.parse(route.request().postData() || "{}");
      if (body.action === "get" && String(body.business_id).startsWith("fed-") && proto) {
        return route.fulfill({ response: await route.fetch({ postData: JSON.stringify({ ...body, business_id: proto.id }) }) });
      }
      if (body.action !== "list") return route.continue();
      const res = await route.fetch();
      const j = await res.json();
      const f = fedRows(j.rows ?? [], empty);
      proto = f.proto;
      await route.fulfill({ response: res, json: { ...j, rows: f.rows } });
    });

    // ── FED: nine renewals ────────────────────────────────────────────────────
    await openMoney(page);
    if (FREEZE === "before") {
      const { freeze } = await import("file:///C:/Users/rando/Downloads/claude/belt/freeze.mjs");
      await freeze(page, {
        out: `${SHOTS}/before.html`, label: "Before",
        note: "Coming in: nine renewals in the next 30 days are bare dots on a line. No name, date or amount on any dot, and three on the same day sit on top of each other.",
        highlight: ".bo-rail30",
      });
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
    const bad44 = await press44(page);
    check(where, "every pin has 44px of hit area", bad44.length === 0, bad44.slice(0, 3).join(" | "));
    await page.screenshot({ path: `${ART}/fed-${size.w}.png`, fullPage: true }); artifacts.push(`${ART}/fed-${size.w}.png`);

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
      canary.observed_failure = after > before;
      console.log(`    canary ${after > before ? "CAUGHT" : "MISSED"}: ${canary.overlap}`);
    }

    // Each pin opens its own detailer.
    const opened = [];
    for (let k = 0; k < IN.length; k++) {
      const pin = page.locator(".bo-tl .bo-pin").nth(k);
      if (!(await pin.count())) { opened.push(`${IN[k]}: no pin`); continue; }
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
      await page.locator(".bo-tl").scrollIntoViewIfNeeded();
      await freeze(page, {
        out: `${SHOTS}/after.html`, label: "After",
        note: "Coming in: every renewal in the next 30 days is a pin with its amount, date and name. Green is monthly, blue is yearly, red is a failed card. Three on the same day sit in different rows. Press a pin to open that detailer.",
        highlight: ".bo-tl",
      });
      artifacts.push(`${SHOTS}/after.html`);
    }
    if (size.w === 390 && !BREAK) {
      const { freeze } = await import("file:///C:/Users/rando/Downloads/claude/belt/freeze.mjs");
      await page.locator(".bo-tl").scrollIntoViewIfNeeded();
      await freeze(page, { out: `${SHOTS}/after-phone.html`, label: "After (phone)", note: "On a phone the timeline slides sideways inside its own box; the labels keep their size.", highlight: ".bo-tl" });
      artifacts.push(`${SHOTS}/after-phone.html`);
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

if (FREEZE === "before") process.exit(0);
for (const c of consoleNoise) failures.push(`console: ${redact(c)}`);
const status = failures.length === 0 && completed === SIZES.length && canary.observed_failure ? "pass" : "fail";
const { path } = writeReceipt({
  check_id: "office-coming-in",
  started_at,
  status,
  expected_targets: SIZES.length,
  discovered_targets: SIZES.length,
  attempted_targets: SIZES.length,
  completed_targets: completed,
  skipped_targets: 0,
  assertions_executed: assertions,
  min_assertions: SIZES.length * 18,
  assertion_floor: "4 widths x 18 questions (fed 12, empty 4, lite 2), all fixed by the code; none depends on what the live platform holds.",
  failures,
  artifacts,
  canary,
  warnings: [
    "list is answered through page.route() with 12 fed subscriptions, 9 of them in the window; nothing is written to the database.",
    "Signs in as a throwaway platform admin created and deleted by this run.",
    "The look itself (glow, color, motion) is not judged here; the frozen copies in belt/shots/9.12b are the evidence for that.",
    ...(BREAK ? [`run with --break=${BREAK}; this receipt is a sabotage, not a result`] : []),
  ],
  dimensions: { sizes: SIZES.map((s) => `${s.w}x${s.h}`), ...(BREAK && { break: BREAK }), observed },
});
console.log(`\n${status.toUpperCase()} — ${assertions} assertions, ${failures.length} failed, canary ${canary.observed_failure ? "caught" : "MISSED"} → ${path}`);
process.exit(status === "pass" ? 0 : 1);
