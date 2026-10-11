// ROADMAP 99.2b — ONE TIME RULE ON PAGES AND IN EMAILS, AND ONE "TODAY".
// node scripts/whole-hours.mjs             (dev server on :5173; no credentials, no writes)
//
// 1. The page formatter (`app/src/lib/format.js`) and the email formatter
//    (`supabase/functions/_shared/emailKit.ts`) are held to ONE table: whole
//    hours print "6 PM", real minutes stay "6:05 PM"; `dayWords` says today /
//    tomorrow / the weekday inside seven days / "October 14" beyond, in the
//    BUSINESS's zone, in English and Spanish.
// 2. No hand-rolled "AM"/"PM" formatter is left in app/src outside format.js —
//    three copies printed ":00" on their own until this item.
// 3. The public booking page's time buttons, at five widths and ?lite=1: some
//    are found, none ends ":00", a whole hour reads "8 AM", and a half hour
//    still reads ":30" (the case that must NOT be shortened). Console clean.
//
// --break=hours  restores ":00" in BOTH formatters: a scratch copy of emailKit
//                and the browser's copy of format.js (rewritten in flight and
//                signed, so the run proves the rewrite executed — gotchas 113).
// --break=today  makes emailKit's "today" the server's UTC day, not the business's.
import { cpSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "../app/node_modules/playwright/index.mjs";
import * as page_ from "../app/src/lib/format.js";
import { writeReceipt, REPO } from "./receipt.mjs";

const started_at = new Date().toISOString();
const BREAK = process.argv.find((a) => a.startsWith("--break="))?.slice(8) || "";
if (BREAK && !["hours", "today"].includes(BREAK)) throw new Error("Unknown break");
const BASE = process.env.BASE || "http://localhost:5173";
const failures = [], artifacts = [];
const SHOTS = path.join(REPO, ".manager-shots", "99.2b");
mkdirSync(SHOTS, { recursive: true });
let assertions = 0;
const check = (name, ok, detail = "") => { assertions++; if (!ok) failures.push(`${name}${detail ? `: ${detail}` : ""}`); };
const badTime = (s) => /\b\d{1,2}:00\s*(?:AM|PM)\b/.test(s);

// ── 1 · the shared table ──────────────────────────────────────────────────
let kitPath = path.join(REPO, "supabase/functions/_shared/emailKit.ts"), scratch = null;
if (BREAK) {
  scratch = mkdtempSync(path.join(tmpdir(), "dp-whole-hours-"));
  cpSync(path.join(REPO, "supabase/functions/_shared"), scratch, { recursive: true });
  kitPath = path.join(scratch, "emailKit.ts");
  const before = readFileSync(kitPath, "utf8");
  const after = BREAK === "hours"
    ? before.replace('m === 0 ? "" :', 'false ? "" :')
    : before.replace('const today = new Intl.DateTimeFormat("en-CA", { timeZone: tz,', 'const today = new Intl.DateTimeFormat("en-CA", { timeZone: "UTC",');
  if (after === before) throw new Error("Sabotage did not land in emailKit");
  writeFileSync(kitPath, after);
}
const kit = await import(pathToFileURL(kitPath).href);

const TIMES = [["00:00", "12 AM"], ["00:05", "12:05 AM"], ["08:00", "8 AM"], ["08:30", "8:30 AM"], ["12:00", "12 PM"],
  ["13:00", "1 PM"], ["18:15:00", "6:15 PM"], ["23:59", "11:59 PM"]];
for (const [t, want] of TIMES) {
  check(`page time ${t}`, page_.time12(t) === want, page_.time12(t));
  check(`email time ${t}`, kit.formatTime12hr(t) === want, kit.formatTime12hr(t));
}
// The hour pickers pass a bare 0–23.
for (const [h, want] of [[0, "12 AM"], [7, "7 AM"], [12, "12 PM"], [23, "11 PM"]]) check(`page hour ${h}`, page_.time12(h) === want, page_.time12(h));

// "now" is 10:30 PM on Saturday October 10 in Los Angeles — already Sunday the
// 11th in UTC. A formatter on the server's clock gets every row below wrong.
const NOW = new Date("2026-10-11T05:30:00Z"), LA = "America/Los_Angeles";
const DAYS = [
  ["2026-10-10", "18:00", "today at 6 PM", "hoy a las 6 PM"],
  ["2026-10-11", "13:30", "tomorrow at 1:30 PM", "mañana a la 1:30 PM"],
  ["2026-10-12", "10:00", "Monday at 10 AM", "lunes a las 10 AM"],
  ["2026-10-16", "18:00", "Friday at 6 PM", "viernes a las 6 PM"],
  ["2026-10-17", "18:00", "October 17 at 6 PM", "17 de octubre a las 6 PM"],  // seven days out: no bare "Saturday"
  ["2026-11-03", "09:05", "November 3 at 9:05 AM", "3 de noviembre a las 9:05 AM"],
  ["2026-10-09", "18:00", "October 9 at 6 PM", "9 de octubre a las 6 PM"],    // already past
];
const ROWS = TIMES.length * 2 + 4 + DAYS.length * 4 + 1;
for (const [d, t, en, es] of DAYS) {
  for (const [side, f] of [["page", page_], ["email", kit]]) {
    const gotEn = f.whenWords(d, t, LA, "en", NOW), gotEs = f.whenWords(d, t, LA, "es", NOW);
    check(`${side} en ${d}`, gotEn === en, gotEn);
    check(`${side} es ${d}`, gotEs === es, gotEs);
  }
}
// Same instant, Tokyo: it is already the 11th there, so the 11th is "today".
check("business zone decides today", page_.dayWords("2026-10-11", "Asia/Tokyo", "en", NOW) === "today"
  && kit.dayWords("2026-10-11", "Asia/Tokyo", "en", NOW) === "today", kit.dayWords("2026-10-11", "Asia/Tokyo", "en", NOW));

// ── 2 · no hand-rolled copy left ──────────────────────────────────────────
const walk = (dir) => readdirSync(dir).flatMap((n) => {
  const p = path.join(dir, n);
  return statSync(p).isDirectory() ? walk(p) : /\.(jsx?|tsx?)$/.test(n) ? [p] : [];
});
const files = walk(path.join(REPO, "app/src"));
const copies = files.filter((f) => !f.endsWith(path.join("lib", "format.js"))
  && /["']AM["']\s*:\s*["']PM["']|["']PM["']\s*:\s*["']AM["']/.test(readFileSync(f, "utf8")));
check("one time formatter in app/src", files.length > 100 && copies.length === 0,
  `${files.length} files read; copies: ${copies.map((f) => path.relative(REPO, f)).join(", ")}`);

// ── 3 · the booking page's time buttons ───────────────────────────────────
const VIEWS = [[390, 844, ""], [1440, 900, ""], [392, 844, ""], [320, 844, ""], [390, 844, "?lite=1"]];
const EXPECTED = ROWS + 1 + VIEWS.length;
let reached = ROWS + 1;
const seen = [];
const browser = await chromium.launch();
try {
  for (const [w, h, q] of VIEWS) {
    const label = `${w}${q}`;
    const ctx = await browser.newContext({ viewport: { width: w, height: h } });
    const page = await ctx.newPage();
    const logs = [];
    page.on("console", (m) => (m.type() === "error" || m.type() === "warning") && logs.push(m.text()));
    if (BREAK === "hours") {
      await page.route(/\/src\/lib\/format\.js/, async (route) => {
        const res = await route.fetch();
        const body = await res.text();
        const bad = body.replace("${m ? `:${String(m).padStart(2, \"0\")}` : \"\"}", ":${String(m).padStart(2, \"0\")}");
        if (bad === body) throw new Error("Sabotage did not land in format.js");
        await route.fulfill({ response: res, body: `${bad}\nwindow.__wholeHoursBreak = true;` });
      });
    }
    try {
      await page.goto(`${BASE}/book/demo-detail${q}`, { waitUntil: "domcontentloaded" });
      await page.waitForSelector(".bk-card.selectable", { timeout: 30000 });
      const step = () => page.evaluate(() => document.querySelector(".bk-step-head .bk-step-label")?.innerText ?? "");
      for (let g = 0; g < 8 && !(await page.locator(".bk-cal").count()); g++) {
        const was = await step();
        const cards = page.locator(".bk-card.selectable");
        const n = await cards.count();
        for (let i = 0; i <= n; i++) {
          if (i) await cards.nth(i - 1).click();
          await page.locator(".bk-bar button.bk-btn.primary").click({ force: true });
          await page.waitForTimeout(1500);
          if ((await step()) !== was || (await page.locator(".bk-cal").count())) break;
        }
      }
      // A day at least two days out, so the short-notice rule leaves the morning in.
      const cells = page.locator(".bk-cal .cell:not(.closed):not(.empty)");
      await cells.first().waitFor({ state: "attached", timeout: 10000 });
      const today = new Date().getDate();
      for (let i = 0, n = await cells.count(); i < n; i++) {
        if (Number((await cells.nth(i).innerText()).trim()) >= today + 2) { await cells.nth(i).click(); break; }
      }
      await page.locator(".bk-slots .bk-chip").first().waitFor({ state: "attached", timeout: 10000 });
      await page.waitForTimeout(1000);
      const chips = (await page.locator(".bk-slots .bk-chip").allTextContents()).map((s) => s.trim());
      const body = await page.evaluate(() => document.body.textContent);
      if (BREAK === "hours") check(`${label} sabotage executed`, await page.evaluate(() => window.__wholeHoursBreak === true));
      check(`${label} time buttons found`, chips.length > 0, "none");
      check(`${label} no button ends :00`, !chips.some(badTime), JSON.stringify(chips.filter(badTime).slice(0, 3)));
      check(`${label} a whole hour reads like "8 AM"`, chips.some((c) => /^\d{1,2} (AM|PM)$/.test(c)), JSON.stringify(chips.slice(0, 4)));
      check(`${label} a half hour keeps its minutes`, chips.some((c) => /^\d{1,2}:30 (AM|PM)$/.test(c)), JSON.stringify(chips.slice(0, 4)));
      check(`${label} nothing on the page prints :00`, !badTime(body), (body.match(/\d{1,2}:00\s*(AM|PM)/) ?? [""])[0]);
      check(`${label} console clean`, logs.length === 0, logs.slice(0, 2).join(" | "));
      await page.locator(".bk-slots").scrollIntoViewIfNeeded();
      const shot = path.join(SHOTS, `whole-hours-${w}${q ? "-lite" : ""}${BREAK ? `-break-${BREAK}` : ""}.png`);
      await page.screenshot({ path: shot });
      artifacts.push(shot);
      seen.push({ view: label, chips: chips.length, first: chips.slice(0, 4) });
      reached++;
    } catch (e) {
      failures.push(`${label} not reached: ${e.message.split("\n")[0]}`);
    } finally { await ctx.close(); }
  }
} finally { await browser.close(); if (scratch) rmSync(scratch, { recursive: true, force: true }); }

const canaryCaught = badTime("8:00 AM") && !badTime("8 AM") && !badTime("8:30 AM");
const receipt = writeReceipt({
  check_id: BREAK ? `whole-hours-${BREAK}` : "whole-hours", started_at,
  status: failures.length ? "fail" : "pass",
  expected_targets: EXPECTED, discovered_targets: reached, attempted_targets: reached, completed_targets: reached,
  skipped_targets: 0, assertions_executed: assertions, min_assertions: 80, failures, artifacts,
  dimensions: { break: BREAK, views: VIEWS.map((v) => `${v[0]}${v[2]}`), seen,
    scope: "Formatters and the public booking page's time buttons. Dashboard screens share time12 and are covered by the table and the one-formatter rule, not opened here (that needs a sign-in). Nothing is wired into email subjects yet (99.2c)." },
  canary: { id: "an on-the-hour 8:00 AM is flagged; 8 AM and 8:30 AM are not", observed_failure: canaryCaught },
});
console.log(`${reached} of ${EXPECTED} targets; ${assertions} assertions; ${failures.length} failures`);
for (const s of seen) console.log(`  ${s.view}: ${s.chips} buttons, ${s.first.join(" / ")}`);
for (const f of failures) console.error(`FAIL ${f}`);
console.log(`Receipt ${receipt.path}`);
if (failures.length || !canaryCaught) process.exitCode = 1;
