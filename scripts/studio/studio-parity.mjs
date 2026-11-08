// STUDIO S8 — NIGHTLY PARITY (STUDIO-SPEC.md §1e.5, §2c layer 4).
//
//   node scripts/studio/studio-parity.mjs --host <verified host> [--out <result.json>] [--jsonl] [--break=stale-price]
//
// After launch, once a night: read the live dashboard, open the live site on its own address the way a customer
// does, and compare every bound value on it with the dashboard; then ask the booking system for a quote (only a
// quote: calculate-booking writes nothing) and check it charges the price the site shows. A mismatch is an alarm.
//
// OFFLINE FOR NOW (S8): "the live dashboard" is the offline engine (belt-staging/demo-backend.mjs) with the example
// seed, and "the live site" is the real renderer on a Vite dev server, reached at http://<host>:<port>/ through a
// test host mapping (Chromium --host-resolver-rules), with the Studio's published releases (STUDIO_PUBLISHED) as the
// table get_published_site_by_host reads. Same page code as production; no real domain, database or deploy.
//
// --break=stale-price is for the tests: the page keeps showing the first price it ever drew for one service while
// the dashboard's price moves on (a stale cache, a frozen copy), the mismatch the check exists to catch.
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL, fileURLToPath } from "node:url";
import path from "node:path";
import net from "node:net";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const APP = path.join(ROOT, "app");
const arg = (k) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); if (a) return a.slice(k.length + 3); const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : null; };
const HOST = String(arg("host") || "").toLowerCase();
const OUT_FILE = path.resolve(arg("out") || path.join(ROOT, "artifacts/studio-parity/result.json"));
const JSONL = process.argv.includes("--jsonl");
const BREAK = arg("break");
const t0 = Date.now();

const { chromium } = createRequire(path.join(APP, "package.json"))("playwright");
const { startExampleEngine, BELT } = await import(pathToFileURL(path.join(ROOT, "scripts/studio/example-engine.mjs")).href);
const { parseBinding, resolve } = await import(pathToFileURL(path.join(APP, "src/site/spec.js")).href);
const { normalizeProfile, createBookingTransport, vehicleSizeExtra } = await import(pathToFileURL(path.join(APP, "src/book/core.js")).href);
const F = await import(pathToFileURL(path.join(APP, "src/lib/format.js")).href);
const SS = await import(pathToFileURL(path.join(BELT, "site-stamps.mjs")).href);
const { stampProblem } = SS.stampChecker({ parseBinding, resolve, vehicleSizeExtra, money: F.money, duration: F.duration, time12: F.time12 });

const PLAN = [
  ["dashboard", "Read the live dashboard"],
  ["served", "The address shows the live release"],
  ["stamps", "Every price, hour, photo and review on the site matches the dashboard"],
  ["quote", "The booking system quotes the price the site shows (a quote only; nothing is booked)"],
  ["console", "The page showed no errors"],
];
const lines = [];
const line = (id, pass, detail = "", skipped = false) => {
  const l = { id, says: PLAN.find(([k]) => k === id)?.[1] || id, pass: !!pass, detail, ...(skipped ? { skipped: true } : {}) };
  lines.push(l);
  console.log(JSONL ? JSON.stringify({ line: l }) : `${l.pass ? "PASS" : skipped ? "SKIP" : "FAIL"}  ${l.says}${detail ? ` — ${detail}` : ""}`);
  return l.pass;
};
const skipRest = (why) => { for (const [k] of PLAN) if (!lines.some((l) => l.id === k)) line(k, false, `not tried: ${why}`, true); throw Object.assign(new Error(why), { quiet: true }); };
const freePort = () => new Promise((r) => { const s = net.createServer().listen(0, "127.0.0.1", () => { const p = s.address().port; s.close(() => r(p)); }); });
const until = async (fn, ms = 60000) => { const t = Date.now(); while (Date.now() - t < ms) { try { if (await fn()) return true; } catch {} await new Promise((r) => setTimeout(r, 300)); } return false; };
const mismatches = [];
let engine = null, browser = null, vite = null, release = null;
const problems = [];
try {
  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(HOST)) { line("dashboard", false, `"${HOST}" is not an address`); skipRest("no address"); }
  let published = {};
  try { published = JSON.parse(readFileSync(process.env.STUDIO_PUBLISHED || "", "utf8")); } catch {}
  release = published[HOST] || null;
  if (!release) { line("dashboard", false, `nothing is published at ${HOST}`); skipRest("nothing is published there"); }
  engine = await startExampleEngine({ port: 0 });
  const api = createBookingTransport({ supabaseUrl: engine.url, anonKey: "demo-anon" });
  let p = null;
  try { p = normalizeProfile(await api.profileByHost(HOST)); } catch {}
  if (!line("dashboard", !!p?.business, p?.business ? `${p.business.name}: ${p.services.length} services, ${p.hours.length} days of hours` : `no business answers at ${HOST}`)) skipRest("the dashboard did not answer");

  // the live site, on its own address
  const port = await freePort();
  vite = spawn(process.execPath, [path.join(APP, "node_modules/vite/bin/vite.js"), "--port", String(port), "--strictPort", "--host", "127.0.0.1"],
    { cwd: APP, env: { ...process.env, VITE_SUPABASE_URL: engine.url, VITE_SUPABASE_ANON_KEY: "demo-anon", STUDIO_TEST_HOSTS: HOST }, windowsHide: true, stdio: "ignore" });
  if (!(await until(() => fetch(`http://127.0.0.1:${port}/`).then((r) => r.ok)))) { line("served", false, "the site renderer (Vite) did not start"); skipRest("the renderer did not start"); }
  browser = await chromium.launch({ args: [`--host-resolver-rules=MAP ${HOST} 127.0.0.1`] });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  if (BREAK === "stale-price") await context.addInitScript(() => {
    // the first service price the page ever drew stays on it, whatever the dashboard says now
    const keep = () => { const e = document.querySelector('[data-section] [data-from^="service:"][data-from$=".price"]'); if (!e) return;
      const k = `stale:${e.dataset.from}`, was = localStorage.getItem(k); if (was == null) localStorage.setItem(k, e.textContent); else if (e.textContent !== was) e.textContent = was; };
    new MutationObserver(keep).observe(document, { subtree: true, childList: true, characterData: true });
  });
  const page = await context.newPage();
  page.on("console", (m) => { if (["error", "warning"].includes(m.type())) problems.push(`${m.type()}: ${m.text()}`); });
  page.on("pageerror", (e) => problems.push(`pageerror: ${e.message}`));
  const SITE = `http://${HOST}:${port}/`;
  const load = async () => { await page.goto(SITE, { waitUntil: "networkidle" }); await page.waitForSelector("[data-release] [data-section], .site-msg, [data-refused]", { timeout: 20000 }).catch(() => {}); await page.waitForTimeout(250); };
  if (BREAK === "stale-price") {
    // the page draws once, then the dashboard's price moves on (as it does when the detailer changes it)
    await load();
    const sv = engine.db.tables.services.find((s) => s.business_id === engine.db.tables.businesses.find((b) => b.slug === release.slug)?.id && s.is_active !== false);
    if (sv) sv.price = Number(sv.price) + 5;
    p = normalizeProfile(await api.profileByHost(HOST));
  }
  await load();
  const shown = await page.evaluate(() => { const r = document.querySelector("[data-release]"); return r ? { release: Number(r.dataset.release), revision: Number(r.dataset.revision), sections: r.querySelectorAll("[data-section]").length } : null; });
  if (!line("served", shown && shown.release === release.release && shown.revision === release.revision && shown.sections > 0,
    shown ? `release ${shown.release} (revision ${shown.revision}), ${shown.sections} sections; the Studio says release ${release.release} (revision ${release.revision})` : "the address shows the booking page, not the site")) skipRest("the live release is not what the address shows");
  const stamps = await page.evaluate(SS.readStamps);
  for (const st of stamps) { const why = stampProblem(st, p); if (why) mismatches.push({ from: st.from, shows: String(st.text || "").replace(/\s+/g, " ").trim().slice(0, 80), why }); }
  line("stamps", stamps.length > 0 && !mismatches.length, mismatches.length ? mismatches.slice(0, 3).map((m) => `${m.from}: ${m.why}`).join("; ") : `${stamps.length} items, all as the dashboard says`);
  // a quote, never a booking
  const st = stamps.find((s) => /^service:[^.]+\.price$/.test(s.from));
  if (!st) line("quote", false, "the site shows no service price to compare");
  else {
    const id = parseBinding(st.from).id, sv = p.services.find((s) => String(s.id).endsWith(String(id)) || String(s.id) === String(id));
    let q = null;
    for (const service_type of ["dropoff", "mobile"]) {
      const r = await fetch(`${engine.url}/functions/v1/calculate-booking`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ business_slug: release.slug, service_ids: [sv?.id], service_type }) }).then((x) => x.json()).catch(() => null);
      if (r?.quote) { q = r.quote; break; }
    }
    const onSite = String(st.text || "");
    const ok = !!q && SS.shows(onSite, F.money(q.base_price));
    if (!ok && q) mismatches.push({ from: st.from, shows: onSite.trim().slice(0, 80), why: `the booking system charges ${F.money(q.base_price)}` });
    line("quote", ok, q ? `${sv?.name}: the site shows ${onSite.replace(/\s+/g, " ").trim()}, the booking system quotes ${F.money(q.base_price)}` : "the booking system gave no quote");
  }
  line("console", !problems.length, problems.slice(0, 3).join(" | "));
} catch (e) {
  if (!e.quiet) line("run", false, e.message.split("\n")[0]);
} finally {
  await browser?.close().catch(() => {});
  if (vite) { try { process.platform === "win32" ? spawn("taskkill", ["/T", "/F", "/PID", String(vite.pid)], { windowsHide: true, stdio: "ignore" }) : vite.kill(); } catch {} }
  await engine?.close().catch(() => {});
}
const failed = lines.filter((l) => !l.pass);
const result = { ok: !failed.length, host: HOST, release: release?.release ?? null, revision: release?.revision ?? null, site: release?.site ?? null, ran: new Date().toISOString(), ms: Date.now() - t0,
  passed: lines.length - failed.length, failed: failed.length, mismatches, break: BREAK || undefined, lines };
mkdirSync(path.dirname(OUT_FILE), { recursive: true });
writeFileSync(OUT_FILE, JSON.stringify(result, null, 2) + "\n");
if (JSONL) console.log(JSON.stringify({ done: { ok: result.ok, passed: result.passed, failed: result.failed, ms: result.ms } }));
process.exit(failed.length ? 1 : 0);
