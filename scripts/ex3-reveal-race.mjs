// A CARD SCROLLED PAST QUICKLY MUST NOT BE SHOWN OFF SCREEN — ROADMAP 97.92.
//
// ex3's reveal script (docs/tenant-sites/x-ballantyne.html and
// x-ballantyne-prices.html, served as /ex3/index.1.js and /ex3/prices.1.js)
// gives a card with data-rv="n" a timer of n x 60ms when it enters the screen.
// Until 97.92 a card that LEFT before its timer fired still had rv-hidden, so
// the "no change" test returned before the clearTimeout, the timer added rv-in
// to a card off screen, and it never replayed. 97.90's same-effect walk caught
// it as a flapping difference on /ex3/prices.html at 1440.
//
// That race is 60-120ms wide, so this freezes the page clock (Playwright's
// page.clock fakes setTimeout AND requestAnimationFrame) and plays it exactly,
// for EVERY card with a delay, on both ex3 pages at 390x844, 768x1024, 1440x900:
//   1 park the card off screen, let time run          -> rv-hidden (re-armed)
//   2 bring it on screen for one frame                -> still rv-hidden (timer pending:
//                                                        the race is set up, or it is a FAILURE)
//   3 take it off screen again, let 500ms run         -> off screen AND rv-hidden
//   4 bring it back, let 500ms run                    -> rv-in (it played again)
//
// CANARY, every run: /ex3/prices.html at 1440 with the pre-97.92 test put back
// into the served script must FAIL step 3. The rewrite is signed and the
// signature read back from the page, so a rewrite that silently did not land
// cannot pass as a caught canary (docs/gotchas.md 102, 113).
// SABOTAGE: --break=old-code serves the pre-97.92 test everywhere; every page
// at every width must go red.
//
// Needs the dev server (BASE_URL, default http://localhost:5173) serving a
// fresh `node scripts/build-examples.mjs --dev`. No credentials, writes nothing
// but its receipt, report and screenshots.
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createRequire } from "node:module";
import { REPO, writeReceipt } from "./receipt.mjs";

const { chromium } = createRequire(join(REPO, "app", "package.json"))("playwright");
const BASE = (process.env.BASE_URL || process.env.BASE || "http://localhost:5173").replace(/\/$/, "");
const BREAK = (process.argv.find((a) => a.startsWith("--break=")) || "").slice(8);
if (BREAK && BREAK !== "old-code") throw new Error(`unknown --break=${BREAK}`);

const SIZES = [{ w: 390, h: 844 }, { w: 768, h: 1024 }, { w: 1440, h: 900 }];
// Cards with data-rv > 0, counted in the source: 13 on each page.
const PAGES = [{ path: "/ex3", delayed: 13 }, { path: "/ex3/prices.html", delayed: 13 }];
const EXPECTED = PAGES.reduce((n, p) => n + p.delayed, 0) * SIZES.length;
const SHOTS = `.manager-shots/97.92/reveal-race-${BREAK || "clean"}`;
mkdirSync(join(REPO, SHOTS), { recursive: true });

// The pre-97.92 lines, put back into the served script for the canary and the sabotage.
const FIXED = /if \(seen === !!el\._seen\) return;([^\n]*)\r?\n(\s*)el\._seen = seen;\r?\n\s*clearTimeout\(el\._t\);/;
const oldCode = (js) => js.replace(FIXED, (_, tail, ind) =>
  `if (seen === !el.classList.contains("rv-hidden")) return;${tail}\n${ind}if (el._t) clearTimeout(el._t);\n${ind}window.__rvOld = (window.__rvOld || 0) + 1;`);

const started_at = new Date().toISOString();
const browser = await chromium.launch();
const log = [];
let assertions = 0;

async function walk(path, size, old) {
  const ctx = await browser.newContext({ viewport: { width: size.w, height: size.h } });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") errors.push(`${m.type()}: ${m.text()}`); });
  let rewrites = 0;
  if (old) {
    await page.route(/\/ex3\/[^/]+\.js(\?.*)?$/, async (route) => {
      const res = await fetch(route.request().url());
      let body = await res.text();
      const was = body;
      body = oldCode(body);
      if (body !== was) rewrites++;
      await route.fulfill({ status: res.status, contentType: "text/javascript", body });
    });
  }
  await page.clock.install();
  await page.goto(BASE + path, { waitUntil: "load" });
  await page.clock.runFor(1000);
  const n = await page.evaluate(() => {
    window.__rvT = [...document.querySelectorAll("[data-rv]")].filter((el) => +el.dataset.rv > 0);
    return window.__rvT.length;
  });
  const results = [];
  // Waits for the browser's OWN scroll event before time moves, so no late event runs an extra
  // pass after the timer — a reader who stopped scrolling sends none, and that late pass is what
  // let the old code put the card back and pass by luck on the first version of this check.
  const at = (y) => page.evaluate(async (y) => {
    if (Math.round(scrollY) !== y) await new Promise((r) => { addEventListener("scroll", r, { once: true }); scrollTo(0, y); });
    dispatchEvent(new Event("scroll"));
  }, y);
  const state = (i) => page.evaluate((i) => {
    const el = window.__rvT[i], r = el.getBoundingClientRect();
    return { cls: el.classList.contains("rv-in") ? "rv-in" : el.classList.contains("rv-hidden") ? "rv-hidden" : "none",
      off: r.bottom <= 0 || r.top >= innerHeight, t: el._t };
  }, i);
  for (let i = 0; i < n; i++) {
    const g = await page.evaluate((i) => {
      const el = window.__rvT[i], r = el.getBoundingClientRect();
      const top = r.top + scrollY, max = document.documentElement.scrollHeight - innerHeight;
      const below = top - innerHeight - 100, above = top + r.height + 100;
      return { label: `${el.tagName} class=${[...el.classList].filter((c) => !/^rv-/.test(c)).join(".")} rv=${el.dataset.rv} #${i}`,
        away: below >= 0 ? Math.round(below) : above <= max ? Math.round(above) : null,
        into: Math.round(Math.max(0, Math.min(max, top - (innerHeight - Math.min(r.height, innerHeight)) / 2))) };
    }, i);
    const fail = (why) => results.push({ label: g.label, ok: false, why });
    if (g.away === null) { fail("could not be parked off screen"); continue; }
    await at(g.away); await page.clock.runFor(500);
    const s1 = await state(i); assertions++;
    if (!(s1.off && s1.cls === "rv-hidden")) { fail(`step 1 parked: expected off screen + rv-hidden, saw off=${s1.off} ${s1.cls}`); continue; }
    await at(g.into); await page.clock.runFor(20);
    const s2 = await state(i); assertions++;
    if (!(!s2.off && s2.cls === "rv-hidden" && s2.t !== s1.t)) { fail(`step 2 race not set up: expected on screen + rv-hidden + a new timer pending, saw off=${s2.off} ${s2.cls} timer ${s1.t}->${s2.t}`); continue; }
    await at(g.away); await page.clock.runFor(20); await page.clock.runFor(500);
    const s3 = await state(i); assertions++;
    if (!(s3.off && s3.cls === "rv-hidden")) { fail(`step 3 SHOWN OFF SCREEN: left before its delay ended, saw off=${s3.off} ${s3.cls}`); continue; }
    await at(g.into); await page.clock.runFor(500);
    const s4 = await state(i); assertions++;
    if (!(!s4.off && s4.cls === "rv-in")) { fail(`step 4 did not replay on return: saw off=${s4.off} ${s4.cls}`); continue; }
    results.push({ label: g.label, ok: true });
  }
  const shot = `${SHOTS}/${path.replace(/\W+/g, "-").replace(/^-|-$/g, "")}-${size.w}${old ? "-canary" : ""}.png`;
  await page.screenshot({ path: join(REPO, shot) });
  // Read at the END: /ex3 has nothing past the early return at load, only once cards move.
  const signed = await page.evaluate(() => window.__rvOld || 0);
  await ctx.close();
  return { n, results, errors, rewrites, signed, shot };
}

const failures = [], seen = [];
let discovered = 0, completed = 0;
for (const p of PAGES) for (const s of SIZES) {
  const r = await walk(p.path, s, BREAK === "old-code");
  if (r.n !== p.delayed) failures.push(`${p.path} @${s.w}: found ${r.n} delayed cards, expected ${p.delayed}`);
  if (BREAK && !(r.rewrites === 1 && r.signed > 0)) failures.push(`${p.path} @${s.w}: sabotage rewrite landed in ${r.rewrites} files and ran ${r.signed} times, expected 1 file and >0 runs`);
  discovered += r.n; completed += r.results.length;
  const bad = r.results.filter((x) => !x.ok);
  for (const b of bad) failures.push(`${p.path} @${s.w}: ${b.label} — ${b.why}`);
  for (const e of r.errors) failures.push(`${p.path} @${s.w}: console ${e}`);
  assertions += 1; // console read at this page and width
  log.push(`${p.path} @${s.w}x${s.h}: ${r.results.length - bad.length} of ${r.n} cards passed, console ${r.errors.length ? r.errors.length + " message(s)" : "clean"}`);
  for (const x of r.results) log.push(`  ${x.ok ? "ok  " : "FAIL"} ${x.label}${x.ok ? "" : " — " + x.why}`);
  seen.push(r.shot);
}

// CANARY: the pre-97.92 code on /ex3/prices.html at 1440 must be caught at step 3.
const c = await walk("/ex3/prices.html", { w: 1440, h: 900 }, true);
const caught = c.rewrites === 1 && c.signed > 0 && c.results.some((x) => !x.ok && /^step 3/.test(x.why));
log.push(`CANARY /ex3/prices.html @1440 with the old code (rewrite landed in ${c.rewrites} file, ran ${c.signed} times): ${caught ? "CAUGHT" : "NOT CAUGHT"}`);
for (const x of c.results.filter((x) => !x.ok)) log.push(`  caught ${x.label} — ${x.why}`);
seen.push(c.shot);
await browser.close();

const report = `${SHOTS}/report.txt`;
writeFileSync(join(REPO, report), log.join("\n") + "\n" + (failures.length ? `\n${failures.length} failure(s)\n` + failures.join("\n") + "\n" : "\nno failures\n"));
console.log(log.join("\n"));
console.log(failures.length ? `\nFAIL — ${failures.length} failure(s):\n` + failures.join("\n") : `\nPASS — ${completed} of ${EXPECTED} cards`);

const { path } = writeReceipt({
  check_id: "ex3-reveal-race",
  started_at,
  status: failures.length ? "fail" : "pass",
  expected_targets: EXPECTED,
  discovered_targets: discovered,
  attempted_targets: discovered,
  completed_targets: completed,
  skipped_targets: 0,
  assertions_executed: assertions,
  // 4 steps x 78 cards + 6 console reads = 318 on a clean run; a run that stops early asks fewer.
  min_assertions: EXPECTED * 4,
  failures,
  artifacts: [report, ...seen],
  canary: { id: "pre-97.92-test-on-prices-1440", observed_failure: caught },
  dimensions: { base: BASE, sizes: SIZES.map((s) => `${s.w}x${s.h}`), pages: PAGES.map((p) => p.path), ...(BREAK ? { break: BREAK } : {}) },
});
console.log("receipt:", path);
process.exit(failures.length || !caught ? 1 : 0);
