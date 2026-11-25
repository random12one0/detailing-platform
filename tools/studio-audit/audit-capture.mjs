// ===========================================================================
// CAPTURE — every screen, every role, three widths (plan §6, §7; chunks 8–9).
// ===========================================================================
//
// Runs on the LAPTOP app pointed at STAGING (audit-app.mjs, :5180). For each
// screen it records, without any AI:
//   - a screenshot at 390 (phones first), 768 and 1440
//   - console errors and failed requests
//   - anything wider than the screen (sideways scrolling) and taps under 44px on a phone
//   - serious and critical accessibility problems (axe-core, as check-page.mjs uses)
//   - every button, link and field it can see (the interaction inventory)
// then at 1440 it presses the buttons that are safe to press and records what
// breaks. A problem found this way is confirmed by loading the screen again.
// The Looks auditor is then handed the screenshots to judge with its own eyes.

import { REPO_ROOT } from "./paths.mjs";
import { createRequire } from "node:module";
import { mkdirSync, writeFileSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { readEnv } from "./audit-staging.mjs";
import { stagingClient } from "./audit-staging.mjs";
import { AUDIT_APP_PORT } from "./audit-app.mjs";
import { areaOf } from "./audit-map.mjs";

const REPO = process.env.AUDIT_REPO || REPO_ROOT;
const req = createRequire(path.join(REPO, "app", "x.js"));
const AXE = (() => { try { return readFileSync(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf8"); } catch { return null; } })();

export const WIDTHS = [[390, 844], [768, 1024], [1440, 900]];
const TABS = ["today", "calendar", "money", "clients", "business"];
// settings screen key → area (app/src/screens/more/index.js)
const SETTINGS = { info: "Settings", appearance: "Website", gallery: "Website", reviews: "Customers", faq: "Website", domain: "Website", google: "Website",
  campaigns: "Messages", report: "Back office", catalog: "Settings", promos: "Money", plans: "Customers", maintenance: "Customers", payments: "Money",
  hours: "Booking", rules: "Booking", notifications: "Messages", mail: "Messages", weather: "Booking", templates: "Messages", team: "Settings",
  billing: "Money", password: "Sign-up", preferences: "Settings", switch: "Settings" };
const TAB_AREA = { today: "Booking", calendar: "Booking", money: "Money", clients: "Customers", business: "Settings" };
// Never pressed: they end the session, leave the site, or start real outside actions.
// review 2026-10-20: + cancel, decline, refund, archive, reset, mark paid, accept, confirm, book
const UNSAFE = /sign ?out|log ?out|delete|remove|disconnect|forget|publish|go live|pay\b|paid|send|text|call|email|share|install|download|print|google|stripe|connect|cancel|decline|refund|archive|reset|restore|clear|void|charge|accept|confirm|book/i;

// What to visit. Ids for a customer's own pages are read from staging.
export async function plan({ areas = null } = {}) {
  const s = stagingClient();
  const [bk] = await s.sql("select b.id from bookings b join businesses x on x.id=b.business_id where x.slug='demo-detail' and b.status in ('confirmed','pending') and b.start_at > now() order by b.start_at limit 1");
  const [pm] = await s.sql("select m.id from plan_members m join businesses x on x.id=m.business_id where x.slug='demo-detail' limit 1").catch(() => []);
  const list = [
    { id: "home", role: "public", path: "/", area: "Website" }, { id: "pricing", role: "public", path: "/pricing", area: "Sign-up" },
    { id: "terms", role: "public", path: "/terms", area: "Website" }, { id: "book", role: "public", path: "/book/demo-detail", area: "Booking" },
    { id: "book-plans", role: "public", path: "/book/demo-detail/plans", area: "Customers" },
    ...(bk ? [{ id: "manage-booking", role: "public", path: `/booking/${bk.id}`, area: "Booking" }] : []),
    ...(pm ? [{ id: "plan-member", role: "public", path: `/plan/${pm.id}`, area: "Customers" }] : []),
    { id: "signup", role: "public", path: "/app", area: "Sign-up" },
    ...TABS.map((t) => ({ id: `owner-${t}`, role: "owner", path: `/app/${t}`, area: TAB_AREA[t] })),
    ...Object.entries(SETTINGS).map(([k, a]) => ({ id: `owner-settings-${k}`, role: "owner", path: `/app/today?settings=${k}`, area: a })),
    ...["today", "calendar", "clients"].map((t) => ({ id: `staff-${t}`, role: "staff", path: `/app/${t}`, area: TAB_AREA[t] })),
  ];
  return areas ? list.filter((x) => areas.includes(x.area)) : list;
}

// runs in the page
function measure({ phone }) {
  const vw = document.documentElement.clientWidth;
  const sideways = document.documentElement.scrollWidth > vw + 1;
  const controls = [], small = [];
  for (const el of document.querySelectorAll("button,a[href],input:not([type=hidden]),select,textarea,[role=button],[role=tab],[role=radio],[role=switch]")) {
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height || getComputedStyle(el).visibility === "hidden") continue;
    const name = (el.getAttribute("aria-label") || el.innerText || el.value || el.getAttribute("placeholder") || el.title || "").replace(/\s+/g, " ").trim().slice(0, 60);
    controls.push({ tag: el.tagName.toLowerCase(), role: el.getAttribute("role") || "", name });
    // The HIT area, not the box: a control may grow its target with an ::after inset (CLAUDE.md
    // "44px of real hit area"), so probe what a finger would actually land on.
    if (phone && (r.width < 43.5 || r.height < 43.5) && getComputedStyle(el).display !== "inline") {
      const hits = (x, y) => { const t = document.elementFromPoint(x, y); return t && (t === el || el.contains(t)); };
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      let hh = 0, ww = 0;
      // covered at rest (under the fixed tab bar until scrolled) is not measured here
      if (cy > 0 && cy < innerHeight && hits(cx, cy)) {
        for (let y = r.top - 14; y <= r.bottom + 14; y++) if (hits(cx, y)) hh++;
        for (let x = r.left - 14; x <= r.right + 14; x++) if (hits(x, cy)) ww++;
        if (hh < 43.5 || ww < 43.5) small.push(`${name || el.tagName} ${ww}×${hh}`);
      }
    }
  }
  // SPEED (plan §7 Performance): how long until the screen was usable, from the browser's own clock
  const nav = performance.getEntriesByType("navigation")[0];
  const lcp = performance.getEntriesByType("largest-contentful-paint").at(-1);
  // largest-paint is only listed to a buffered observer in Chromium; first-contentful-paint always is
  const fcp = performance.getEntriesByType("paint").find((p) => p.name === "first-contentful-paint");
  const loadMs = Math.round(nav ? nav.domContentLoadedEventEnd : 0), paintMs = Math.round(lcp ? lcp.startTime : fcp ? fcp.startTime : 0);
  const kb = Math.round(performance.getEntriesByType("resource").reduce((a, r) => a + (r.transferSize || 0), 0) / 1024);
  return { sideways, overBy: document.documentElement.scrollWidth - vw, controls, small: small.slice(0, 20), title: document.title, loadMs, paintMs, kb };
}

async function signIn(browser, base, role, env) {
  if (role === "public") return null;
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  await p.goto(`${base}/app`, { waitUntil: "domcontentloaded" });
  await p.fill("input[type=email]", role === "owner" ? "demo@detailplatform.com" : "demo-staff@detailplatform.com"); // mail-sink: dashboard logins, never recipients
  await p.fill("input[type=password]", role === "owner" ? env.DEMO_OWNER_PW : env.DEMO_STAFF_PW);
  await p.click("form button.btn.primary");
  await p.waitForSelector(".tabbar", { timeout: 30000 });
  const state = await ctx.storageState();
  await ctx.close();
  return state;
}

async function visit(browser, base, item, state, [w, h], shotFile) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, storageState: state || undefined });
  const p = await ctx.newPage();
  const errors = [], failed = [];
  p.on("console", (m) => { if (m.type() === "error") errors.push(m.text().slice(0, 300)); });
  p.on("pageerror", (e) => errors.push(String(e.message).slice(0, 300)));
  p.on("response", (r) => { if (r.status() >= 400 && !/favicon/.test(r.url())) failed.push(`${r.status()} ${r.request().method()} ${new URL(r.url()).pathname}`); });
  // a request the browser cancelled (page closed, navigated away) is not a failure
  p.on("requestfailed", (r) => { if (!/ERR_ABORTED/.test(r.failure()?.errorText || "")) failed.push(`failed ${r.method()} ${new URL(r.url()).pathname}`); });
  let ok = true;
  try { await p.goto(base + item.path, { waitUntil: "domcontentloaded", timeout: 45000 }); } catch { ok = false; }
  await p.waitForTimeout(2500);
  const m = ok ? await p.evaluate(measure, { phone: w < 500 }).catch(() => null) : null;
  let axe = [];
  if (ok && AXE && w === 1440) {
    try {
      await p.addScriptTag({ content: AXE });
      axe = await p.evaluate(async () => (await window.axe.run(document, { resultTypes: ["violations"] })).violations
        .filter((v) => v.impact === "serious" || v.impact === "critical").map((v) => `${v.id}: ${v.help} (${v.nodes.length})`));
    } catch {}
  }
  if (shotFile) await p.screenshot({ path: shotFile, fullPage: w < 500 }).catch(() => {});
  return { ctx, page: p, ok, errors: [...new Set(errors)], failed: [...new Set(failed)], m, axe };
}

// Press each safe button once at 1440 and note what breaks. Staging data is disposable.
async function explore(v, max = 20) {
  const p = v.page, broke = [], pressed = [];
  const names = await p.evaluate((src) => { const re = new RegExp(src, "i");
    return [...document.querySelectorAll("button,[role=button],[role=tab]")].filter((b) => b.offsetParent && !b.disabled)
      .map((b) => (b.getAttribute("aria-label") || b.innerText || "").replace(/\s+/g, " ").trim()).filter((n) => n && n.length < 50 && !re.test(n)); }, UNSAFE.source);
  for (const n of [...new Set(names)].slice(0, max)) {
    const before = v.errors.length;
    try {
      const b = p.getByRole("button", { name: n, exact: true }).first();
      if (!(await b.isVisible({ timeout: 500 }).catch(() => false))) continue;
      await b.click({ timeout: 3000 }); pressed.push(n);
      await p.waitForTimeout(700);
      if (v.errors.length > before) broke.push({ control: n, errors: v.errors.slice(before) });
      await p.keyboard.press("Escape").catch(() => {});
    } catch {}
  }
  return { pressed, broke };
}

// Captures everything for the given items. Returns one record per item.
export async function capture(items, { dir, log = () => {}, jsonName = "capture.json", signal = null }) {
  const { chromium } = req("playwright");
  const env = readEnv(path.join(REPO, ".env"));
  const base = `http://localhost:${AUDIT_APP_PORT}`;
  mkdirSync(dir, { recursive: true });
  const browser = await chromium.launch();
  const states = {};
  const out = [];
  try {
    for (const role of [...new Set(items.map((i) => i.role))]) {
      try { states[role] = await signIn(browser, base, role, env); } catch (e) { states[role] = false; log(`could not sign in as ${role}: ${e.message}`); }
    }
    for (const item of items) {
      if (signal?.aborted) break;   // Stop reaches the browser between screens
      if (states[item.role] === false) { out.push({ ...item, skipped: `could not sign in as ${item.role}` }); continue; }
      const rec = { ...item, widths: {} };
      for (const wh of WIDTHS) {
        const shot = path.join(dir, `${item.id}-${wh[0]}.png`);
        const v = await visit(browser, base, item, states[item.role], wh, shot);
        rec.widths[wh[0]] = { ok: v.ok, shot, errors: v.errors, failed: v.failed, sideways: v.m?.sideways || false, overBy: v.m?.overBy || 0,
          small: v.m?.small || [], axe: v.axe, controls: v.m?.controls?.length || 0, loadMs: v.m?.loadMs || 0, paintMs: v.m?.paintMs || 0, kb: v.m?.kb || 0 };
        if (wh[0] === 1440) { rec.controls = v.m?.controls || []; if (v.ok) rec.explore = await explore(v); }
        await v.ctx.close();
      }
      out.push(rec);
      log(`captured ${item.id}`);
    }
  } finally { await browser.close(); }
  writeFileSync(path.join(dir, jsonName), JSON.stringify(out, null, 1));
  return out;
}

// Which server functions read a key (directly or through a _shared file they import) that staging lacks.
export function missingKeyFunctions(secretNames, repo = REPO) {
  const fnRoot = path.join(repo, "supabase", "functions");
  const keysIn = (file) => { try { return [...readFileSync(file, "utf8").matchAll(/Deno\.env\.get\("([A-Z0-9_]+)"\)/g)].map((m) => m[1]); } catch { return []; } };
  const out = [];
  for (const fn of readdirSync(fnRoot)) {
    if (fn === "_shared") continue;
    const index = path.join(fnRoot, fn, "index.ts");
    let src = ""; try { src = readFileSync(index, "utf8"); } catch { continue; }
    const shared = [...src.matchAll(/\.\.\/_shared\/([A-Za-z0-9_./-]+\.(?:ts|js))/g)].map((m) => path.join(fnRoot, "_shared", m[1]));
    const keys = [...keysIn(index), ...shared.flatMap(keysIn)].filter((k) => !/^SUPABASE_/.test(k));
    if (keys.some((k) => !secretNames.includes(k))) out.push(fn);
  }
  return out;
}
// Server functions that need a key staging does not have yet answer 503: that is staging, not the product.
export function needsKey(failure, missingFns = []) {
  const m = String(failure).match(/\/functions\/v1\/([a-z0-9-]+)/);
  return !!(m && missingFns.includes(m[1]) && /^50[0-3]/.test(failure));
}
// plain screen names for finding titles (review 2026-10-20: titles read like web addresses)
const SETTING_NAMES = { info: "Business info", appearance: "Appearance", gallery: "Photo gallery", reviews: "Reviews", faq: "Questions page", domain: "Web address",
  google: "Google Business", campaigns: "Campaigns", report: "Report a problem", catalog: "Services and prices", promos: "Promo codes", plans: "Plans",
  maintenance: "Maintenance plans", payments: "How you get paid", hours: "Opening hours", rules: "Booking rules", notifications: "Notifications", mail: "Emails we sent",
  weather: "Weather warnings", templates: "Message templates", team: "Team", billing: "Your subscription", password: "Password", preferences: "Preferences", switch: "Switch business" };
const PATH_NAMES = { "/": "home page", "/pricing": "pricing page", "/terms": "terms page", "/book/demo-detail": "booking page", "/book/demo-detail/plans": "customer plans page", "/app": "sign-in page" };
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
export function name(rec) {
  const who = { owner: "owner", staff: "staff member", public: "customer" }[rec.role] || rec.role;
  const s = (rec.path.match(/[?&]settings=([a-z-]+)/) || [])[1];
  const n = s ? `${SETTING_NAMES[s] || s} settings`
    : PATH_NAMES[rec.path] || (rec.path.startsWith("/app/") ? `${rec.path.slice(5)} screen` : rec.path.startsWith("/booking/") ? "customer's own booking page" : rec.path.startsWith("/plan/") ? "plan member's page" : rec.path);
  return `the ${n} (${who})`;
}
// Pure: the problems a capture proves, before any re-check. One per screen and kind.
export function problems(rec, { missingFns = [] } = {}) {
  const out = [];
  const W = rec.widths || {};
  const at = (pred) => Object.entries(W).filter(([, x]) => pred(x)).map(([w]) => w);
  // "Failed to load resource … 503" names no address; drop it when every 5xx on the screen was a key-less function
  const fivexx = Object.values(W).flatMap((x) => x.failed || []).filter((f) => /^5\d\d/.test(f));
  const onlyKeyless = fivexx.length > 0 && fivexx.every((f) => needsKey(f, missingFns));
  const errs = [...new Set(Object.values(W).flatMap((x) => x.errors || []))].filter((e) => !(onlyKeyless && /Failed to load resource: .*status of 50\d/.test(e)) && !/status of 429/.test(e));
  if (errs.length) out.push({ kind: "console", severity: "before", title: `${cap(name(rec))} shows errors in the browser`, detail: errs.slice(0, 5).join(" | "), widths: at((x) => x.errors?.length) });
  const fails = [...new Set(Object.values(W).flatMap((x) => x.failed || []))].filter((f) => !/ \/(favicon|manifest)/.test(f) && !needsKey(f, missingFns));
  // 429 = a rate limit: real, but the audit's own repeated visits can trip it, so it is never more than probable
  const limited = fails.filter((f) => f.startsWith("429"));
  if (limited.length) out.push({ kind: "ratelimit", severity: "after", probable: true, title: `${cap(name(rec))} runs into a request limit`, detail: limited.join(" | ") + " (the audit's own repeated visits may have used part of the allowance)", widths: at((x) => (x.failed || []).some((f) => f.startsWith("429"))) });
  const realFails = fails.filter((f) => !f.startsWith("429"));
  if (realFails.length) out.push({ kind: "requests", severity: "before", title: `Requests fail on ${name(rec)}`, detail: realFails.slice(0, 6).join(" | "), widths: at((x) => x.failed?.length) });
  const side = at((x) => x.sideways);
  if (side.length) out.push({ kind: "sideways", severity: side.includes("390") ? "before" : "after", title: `${cap(name(rec))} is wider than the screen at ${side.join(", ")}px`, detail: side.map((w) => `${w}: ${W[w].overBy}px too wide`).join(", "), widths: side });
  const axe = W[1440]?.axe || [];
  if (axe.length) out.push({ kind: "a11y", severity: "before", title: `Accessibility problems on ${name(rec)}`, detail: axe.slice(0, 6).join(" | "), widths: ["1440"] });
  const small = W[390]?.small || [];
  if (small.length >= 3) out.push({ kind: "taps", severity: "after", title: `${small.length} controls on ${name(rec)} are smaller than a fingertip on a phone`, detail: small.slice(0, 8).join(", "), widths: ["390"] });
  // slow on a phone-sized screen. This is the dev server on the laptop, so only the clearly slow is reported,
  // and never above "after": production timings come from the live check, not from here.
  const p390 = W[390]?.paintMs || 0;
  if (p390 > 6000) out.push({ kind: "speed", severity: "after", title: `${cap(name(rec))} took ${(p390 / 1000).toFixed(1)} s to show its main content on a phone-sized screen`, detail: Object.entries(W).map(([w, x]) => `${w}: ${x.paintMs} ms, ${x.kb} KB`).join("; ") + " (laptop dev server; a production build is faster)", widths: ["390"] });
  for (const b of rec.explore?.broke || []) out.push({ kind: "click", severity: "before", title: `Pressing "${b.control}" on ${name(rec)} causes an error`, detail: b.errors.slice(0, 3).join(" | "), widths: ["1440"], control: b.control });
  return out;
}

if (process.argv[1] && import.meta.url === `file:///${process.argv[1].replace(/\\/g, "/")}`) {
  const { ensureApp } = await import("./audit-journeys.mjs");
  const stop = await ensureApp();
  const items = (await plan()).filter((x) => !process.argv[2] || process.argv[2].split(",").includes(x.id));
  const dir = path.join(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "data", "audit", "capture-test");
  const recs = await capture(items, { dir, log: console.log });
  const { stagingSecretNames } = await import("./audit-journeys.mjs");
  const missingFns = missingKeyFunctions(await stagingSecretNames(REPO));
  console.log("key-less on staging:", missingFns.join(" "));
  for (const r of recs) console.log(r.id, JSON.stringify(problems(r, { missingFns }).map((p) => p.title + " — " + p.detail.slice(0, 120))), "controls", r.controls?.length, "pressed", r.explore?.pressed?.length);
  stop();
}
