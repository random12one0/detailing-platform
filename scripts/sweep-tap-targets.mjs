// THE 44px TAP FLOOR, ACROSS EVERY SCREEN A DETAILER SEES — 2026-09-13, lane C.
//
// **NOTHING IN THE 58-SUITE BATTERY CHECKED THIS.** A 38px close button shipped
// with every check green, and every weekend since Friday has been spent
// measuring tap targets by hand, screen by screen. That is the single largest
// recurring waste in this project and this file is the end of it.
//
// The measurement itself — why a rectangle cannot answer the question, how the
// reach is walked, what counts as a hit, and the two stated exceptions — lives
// in `scripts/lib/tapProbe.mjs` and is shared with whatever else needs it.
// This file is the WALK: which screens, at which widths, in which languages.
//
// ── USAGE ──────────────────────────────────────────────────────────────────
//   node scripts/sweep-tap-targets.mjs --baseline     # prove the instrument
//   node scripts/sweep-tap-targets.mjs                # the whole product
//   node scripts/sweep-tap-targets.mjs --only money   # one screen
//   node scripts/sweep-tap-targets.mjs --widths 392,320
//   node scripts/sweep-tap-targets.mjs --lang en
//
// Needs the dev server on :5173 and the seeded demo business, same as
// `sweep-widths.mjs`. EXITS NON-ZERO on any finding.
//
// ── WHAT IT WALKS, AND HOW IT KNOWS ────────────────────────────────────────
// The five tabs, then **every settings door it can find in the DOM** — the
// `.nav-row` list on Business and the one behind the gear. **The list is read
// from the product, never typed here.** `sweep-widths.mjs` carries a
// hand-maintained list of fourteen settings screens and its own comments record
// that count going stale four times; a list that is enumerated cannot.
//
// ── WHAT IT DOES NOT WALK, SAID OUT LOUD RATHER THAN OMITTED ───────────────
//   THE BOOKING FLOW  its steps are behind a live availability call and a
//                     three-month calendar search. `sweep-booking-steps.mjs`
//                     already does that walk and calls the same probe on every
//                     step — running it twice would be two instruments to keep.
//   THE BACK OFFICE   `/admin` needs `demo@demo.com`, whose password is
//                     deliberately in no file. A session that has it can point
//                     ADMIN_EMAIL / ADMIN_PASSWORD at this script and the admin
//                     block runs; without them it PRINTS that it skipped.
// A guard that skips must say so. This repo's oldest failure is that a skipped
// check reads exactly like a passing one.
//
// ── BOTH LANGUAGES, AND THAT IS NOT THOROUGHNESS FOR ITS OWN SAKE ──────────
// `docs/VERIFIED.md` § 3b: the Back control on every settings screen read 44 in
// English at every width and **41.9 in Spanish at 320**, because a longer title
// squeezed a flex row. **An English-only tap-target run cannot see it.**
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { reportSourceMoved, watchSource } from "./source-guard.mjs";
import { writeReceipt } from "./receipt.mjs";
import { TAP_PROBE, BREAKS, EXCEPTIONS, FLOOR, CAP } from "./lib/tapProbe.mjs";
import { demoOwner } from "./lib/demoOwner.mjs";
const { chromium } = createRequire(import.meta.url)("./../app/node_modules/playwright/index.js");

const started_at = new Date().toISOString();
const changedSince = watchSource();
const BASE = process.env.BASE || "http://localhost:5173";
const argOf = (flag) => { const i = process.argv.indexOf(flag); return i > -1 ? process.argv[i + 1] : null; };
const BASELINE = process.argv.includes("--baseline");
const ONLY = argOf("--only");
// 320 IS THE NARROWEST SUPPORTED WIDTH, not 392 — `PRODUCT.md` promises
// 320→1440 and the dashboard has a layout of its own below 361px.
const WIDTHS_ARG = argOf("--widths");
const WIDTHS = (WIDTHS_ARG || "1440,768,392,320").split(",").map(Number);
// THE BACK-OFFICE WALK ALSO TAKES ONE NON-ROUND WIDTH, ON PURPOSE — ROADMAP
// 4.5's own build requirement 3: "sweep sub-pixel offsets, not whole-pixel
// scrolls; a whole-pixel scroll leaves the fraction identical, so the
// rounding never moves." Four round breakpoints can share the property that
// every flex/grid division lands on a whole pixel by coincidence; 1254 is the
// width the one-off evidence run behind this item actually used, and it stays
// odd on purpose so any column-width or flex-basis rounding has a real chance
// to show up. Skipped only when the caller explicitly overrides --widths,
// so a narrow debugging run stays narrow.
const ADMIN_WIDTHS = WIDTHS_ARG ? WIDTHS : [...WIDTHS, 1254];
const LANGS = (argOf("--lang") || "en,es").split(",");
const ARGS = { floor: FLOOR, cap: CAP, exceptions: EXCEPTIONS };

const findings = [];
let screens = 0, subjects = 0, probes = 0, clamped = 0, exempted = 0;
const fired = {};
const skips = [];
const add = (where, f) => findings.push({ where, ...f });

// --- SETTLE, NOT SLEEP -----------------------------------------------------
// The same three questions `sweep-widths.mjs` asks, and for the same reason: a
// probe that runs while the arrival stagger is still translating a control
// 14px measures a control that is not where it will be. `.bk-spinner` is in
// the list because the booking flow spells its loading mark that way and its
// absence made a whole surface measure as three empty elements.
const settle = (page, cap = 1800) => page.evaluate(async (cap) => {
  const t0 = performance.now();
  let last = performance.now();
  const obs = new MutationObserver(() => { last = performance.now(); });
  obs.observe(document.documentElement, { subtree: true, childList: true, attributes: true, characterData: true });
  try {
    for (;;) {
      await new Promise((r) => requestAnimationFrame(() => r()));
      const now = performance.now();
      if (now - t0 >= cap) return Math.round(now - t0);
      if (document.querySelector(".spinner, .bk-spinner, [data-loading]")) { last = now; continue; }
      const busy = document.getAnimations().some((a) => {
        if (a.playState !== "running") return false;
        const t = a.effect && a.effect.getComputedTiming && a.effect.getComputedTiming();
        return !t || t.iterations !== Infinity;
      });
      if (!busy && now - last >= 130) return Math.round(now - t0);
    }
  } finally { obs.disconnect(); }
}, cap);

const measure = async (page, where) => {
  const r = await page.evaluate(TAP_PROBE, ARGS);
  screens++; subjects += r.subjects; probes += r.probes;
  clamped += r.clamped; exempted += r.exempted;
  for (const [k, n] of Object.entries(r.fired)) fired[k] = (fired[k] || 0) + n;
  for (const f of r.findings) add(where, f);
  // COUNT THE SUBJECTS, EVERY SCREEN, EVERY RUN. A screen that measured four
  // controls when it used to measure forty prints the same word as one that
  // measured forty, unless the number is on the line.
  console.log(`  ${where.padEnd(46)} ${String(r.subjects).padStart(3)} controls  `
    + `${r.findings.length ? r.findings.length + " FINDINGS" : "ok"}`
    + (r.scopedTo ? `   [scoped to ${r.scopedTo}]` : ""));
  return r;
};

// --------------------------------------------------------------------- OPEN
const browser = await chromium.launch();
const openDash = async (width, lang, quiet = false) => {
  const ctx = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  // THE DASHBOARD'S LANGUAGE IS `dp.lang.app` IN localStorage, NOT `?lang=es`,
  // which is the BOOKING page's switch and does nothing here.
  await page.goto(`${BASE}/app`, { waitUntil: "domcontentloaded" });
  await page.evaluate((l) => {
    try {
      localStorage.setItem("dp.lang.app", l);
      // The tab guides swallow pointer events, so every press probe would
      // report the overlay. The fifth script in this repo to need this line.
      localStorage.setItem("dp.tours", JSON.stringify(["shell", "today", "calendar", "money", "clients", "business"]));
      localStorage.setItem("dp.tour", "1");
    } catch { /* private mode */ }
  }, lang);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForSelector("input[type=email], .tabbar, .rail", { timeout: 25000 });
  if (await page.locator("input[type=email]").count()) {
    // THE SIGN-IN SCREEN IS A SCREEN. It is the first thing anybody sees and
    // no sweep in this repo has ever measured a control on it.
    await settle(page, 1200);
    if (!quiet) await measure(page, `${width}/${lang}/sign-in`);
    await page.fill("input[type=email]", "demo@detailplatform.com");
    await page.fill("input[type=password]", demoOwner().password);
    await page.click("form button.btn.primary");
  }
  await page.waitForSelector(".tabbar, .rail", { timeout: 30000 });
  await settle(page, 2200);
  return { ctx, page };
};

// A TAB AND THE GEAR ARE ADDRESSED BY `data-tour`, NEVER BY THEIR WORDS.
// Sixteen controls in `sweep-widths.mjs` are named by the text on them and the
// first Spanish run timed out on the word "Today". These five already carry a
// stable attribute for the guided tour, so there is nothing to translate.
const TABS = ["today", "calendar", "money", "clients", "business"];
const goTab = async (page, key) => {
  await page.locator(`[data-tour="${key}"]`).first().click();
  await settle(page, 2000);
};

// EVERY DOOR THE PRODUCT DRAWS, read out of the DOM rather than typed here.
//
// **ADDRESSED BY POSITION, NEVER BY ITS WORDS — and the first version of this
// file did it the other way and silently skipped 56 of 184 screens.** A row's
// text is its title and its subtitle run together with no space between them
// (`"This devicethis computer · Goo"`), which is not a string
// `locator(".nav-row", { hasText })` can find, so every gear row past the
// first few "vanished between listing and opening". They were PRINTED as skips
// rather than counted as passes, which is the only reason it was visible at
// all — `docs/START-HERE.md` § 4, a guard that skips must say so.
//
// The count is read once at the index and the rows are clicked by index, which
// is stable because the walk returns to the index between every one.
// **SCOPED TO THE INDEX'S OWN CONTAINER, AND THAT IS NOT FUSSINESS.** Above
// `--wrap` (1180px) a settings screen opens in the SECOND COLUMN and the index
// STAYS ON SCREEN in the first — so a document-wide count of `.nav-row` is the
// index plus whatever `Folded` rows the opened screen draws, and it changes
// every time. The first version of this walk counted document-wide, decided
// the index had moved under it, and stopped after three of thirteen rows at
// 1440. It reported that rather than hiding it, which is the only reason it
// was cheap to find.
// **EVERY ROW THE INDEX DRAWS, MATCHED BY ITS LABEL RATHER THAN BY POSITION.**
// Three ways an index-by-position walk went wrong here in one evening, all of
// them producing a clean-looking run over screens nobody visited:
//
//   the Business tab draws a "Next: Hours — 3 of 11 done" setup prompt above
//   the list and in a box of its own, so the FIRST `.nav-row`'s parent holds
//   exactly one row; keying on it walked one screen of thirteen;
//
//   the settings list is GROUPED under headings, so "the container with the
//   most rows" is one group of five or six and not the index;
//
//   above `--wrap` a settings screen opens in the SECOND COLUMN with the index
//   still showing beside it, and any `Folded` row it draws is another
//   `.nav-row`, so a document-wide COUNT moves under the walk.
//
// Reading the labels once and then finding each by its own words survives all
// three: a contaminating row has a different label, and a row that genuinely
// disappears is REPORTED rather than silently replaced by its neighbour.
const indexRows = (page) => page.evaluate(() =>
  [...document.querySelectorAll(".nav-row")]
    .map((e) => ((e.textContent || "").trim().replace(/\s+/g, " ") || "row").slice(0, 40)));
// What the main area is showing, cheaply. Two screens with byte-identical text
// are the same screen — which is how trap (c) passed 22 screens it never
// visited.
const mainText = (page) => page.evaluate(() =>
  (document.querySelector(".app-main, main, .app-shell") || document.body).innerText.length);

// ── THE BACK-OFFICE CANARY, SEPARATE FROM THE FIVE `BREAKS` ABOVE BECAUSE
// NONE OF THEM TOUCH `/admin` ───────────────────────────────────────────
// ROADMAP 4.5's own bar: "a deliberate break in AdminPage.jsx fails a
// credential-free run, and the break is one a person could plausibly make."
// Shrinking `.pa-tab` — a real control, `admin.css:120` — to a few pixels of
// padding is exactly that: a spacing edit somebody makes without checking
// the 44px floor. RUN REPEATEDLY, NOT ONCE — this session's own lesson from
// earlier today was that a canary caught on a single lucky run is weaker
// evidence than it feels like: the blank-screenshot canary in this same
// repo only reproduced 3 of 8 times. Shared by `--baseline` and by the
// normal admin walk, which writes a receipt from what this returns.
const runAdminCanary = async (browser, runs = 5) => {
  let caught = 0;
  const detail = [];
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/admin`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("input[type=email], .pa-tabs, .adm", { timeout: 25000 });
  if (await page.locator("input[type=email]").count()) {
    await page.fill("input[type=email]", "demo@detailplatform.com");
    await page.fill("input[type=password]", demoOwner().password);
    await page.click("form button[type=submit]");
    await page.waitForSelector(".pa-tabs, .adm", { timeout: 30000 }).catch(() => {});
  }
  await settle(page, 2200);
  // FOUND CHASING A FLAKY RESTORE-CHECK, 2026-09-23: the Today tab's "who
  // needs a call" panel is an async fetch that `settle()`'s mutation-quiet
  // window can miss if the round trip runs past its 2.2s cap — the tap probe
  // itself caught the deliberate break 8/8 times in testing, every time; only
  // the BEFORE snapshot was sometimes taken before this unrelated panel had
  // loaded, so subjects read 6 then 8 for no reason connected to the break.
  // `networkidle` closes that race without padding a guessed sleep.
  await page.waitForLoadState("networkidle").catch(() => {});
  await settle(page, 600);
  const before = await page.evaluate(TAP_PROBE, ARGS);
  console.log(`\nthe real /admin screen first: ${before.subjects} controls, ${before.findings.length} findings`);
  for (let i = 1; i <= runs; i++) {
    await page.evaluate(() => {
      const s = document.createElement("style");
      s.id = "admin-tap-break";
      s.textContent = ".pa-tab { padding: 2px 4px !important; font-size: 10px !important; min-height: 0 !important }";
      document.head.appendChild(s);
    });
    await settle(page, 500);
    const after = await page.evaluate(TAP_PROBE, ARGS);
    const got = after.findings.filter((f) => f.check === "narrow" || f.check === "short");
    if (got.length) caught++;
    const line = `run ${i}/${runs}: ${got.length ? "CAUGHT" : "MISSED"} (${got.length} finding(s)${got.length ? " — " + got[0].detail : ""})`;
    console.log("  " + line);
    detail.push(line);
    await page.evaluate(() => document.getElementById("admin-tap-break")?.remove());
    await settle(page, 500);
  }
  const after = await page.evaluate(TAP_PROBE, ARGS);
  const restored = after.subjects === before.subjects && after.findings.length === before.findings.length;
  console.log(`admin canary: caught ${caught}/${runs}, restored ${restored ? "cleanly" : "*** NOT CLEANLY ***"}`);
  await ctx.close();
  return { caught, runs, restored, before, detail };
};

// ── THE DASHBOARD CANARY: THE FIVE `BREAKS`, EACH APPLIED TO ONE REAL SCREEN
// AND REQUIRED TO BE REPORTED BY ITS OWN CHECK. Lifted out of `--baseline`
// 2026-10-06 (ROADMAP 4.6) so the default walk can write a receipt with a
// negative control in it; before this the five were exercised only by
// `--baseline`, which wrote no receipt either. It returns its problems rather
// than adding them to `findings`, because a caller that is only borrowing the
// canary must not have the canary's own faults counted as findings about the
// product.
const runDashCanary = async (browser) => {
  const { ctx, page } = await openDash(392, "en", true);
  await goTab(page, "clients");
  const before = await page.evaluate(TAP_PROBE, ARGS);
  console.log(`\nthe real screen first: ${before.subjects} controls, ${before.findings.length} findings\n`);
  let blind = 0;
  const problems = [];
  for (const [check, fn] of Object.entries(BREAKS)) {
    const what = await page.evaluate(fn);
    await settle(page, 600);
    const after = await page.evaluate(TAP_PROBE, ARGS);
    // A break named `short_after` proves the `short` check by a different
    // route, so the name before the underscore is the check it must fire.
    const expect = check.split("_")[0];
    const got = after.findings.filter((f) => f.check === expect);
    const named = got.length ? got[0].el : "";
    console.log(`${got.length ? "SEES " : "BLIND"}  ${check.padEnd(12)} ${what}`
      + (got.length ? `  →  ${got.length} findings, first: ${named} — ${got[0].detail}` : ""));
    if (!got.length) { blind++; problems.push({ check: "BASELINE", el: check, detail: `the "${check}" check did not report its own deliberate fault (${what})` }); }
    // RESTORE, AND PROVE THE RESTORE. A break that survives into the next
    // measurement makes every later check look broken; a restore nobody checks
    // is the same bug one level up.
    await page.evaluate(() => document.getElementById("tap-break")?.remove());
    await settle(page, 600);
    const back = await page.evaluate(TAP_PROBE, ARGS);
    const same = back.subjects === before.subjects && back.findings.length === before.findings.length;
    console.log(`       restored   ${back.subjects} controls, ${back.findings.length} findings `
      + (same ? "— back to where it started" : "— *** NOT back to where it started ***"));
    if (!same) problems.push({ check: "BASELINE", el: check, detail: `undoing the "${check}" break did not restore the screen (${before.subjects}/${before.findings.length} → ${back.subjects}/${back.findings.length})` });
  }
  await ctx.close();
  return { runs: Object.keys(BREAKS).length, blind, problems,
    restored: !problems.some((q) => /did not restore/.test(q.detail)) };
};
// ----------------------------------------------------------------- BASELINE
if (BASELINE) {
  // ONE SCREEN, ONE WIDTH. An instrument is proved, not surveyed.
  const dash = await runDashCanary(browser);
  let blind = dash.blind;
  for (const q of dash.problems) add("baseline", q);

  const adminCanary = await runAdminCanary(browser, 5);
  if (adminCanary.caught < adminCanary.runs) {
    blind++;
    add("baseline", { check: "BASELINE", el: ".pa-tab", detail: `the admin-office break was only caught ${adminCanary.caught}/${adminCanary.runs} times` });
  }
  if (!adminCanary.restored) add("baseline", { check: "BASELINE", el: ".pa-tab restore", detail: "undoing the admin break did not restore the screen" });

  await browser.close();
  console.log(`\n${Object.keys(BREAKS).length} checks broken on purpose, ${blind} blind`);
  await reportSourceMoved(changedSince, !findings.length);
  process.exit(findings.length ? 1 : 0);
}

// --------------------------------------------------------------------- WALK
console.log(`floor ${FLOOR}px of reach, cap ${CAP}px a side, widths ${WIDTHS.join("/")}, languages ${LANGS.join("/")}\n`);
// THE DASHBOARD / SETTINGS / LANDING RECEIPT'S OWN BASELINE - ROADMAP 4.6. Snapshotted
// here so the receipt describes this walk only, never the sign-in screen the
// canary opens or the back office that runs after it.
const screensBeforeDash = screens, probesBeforeDash = probes, findingsBeforeDash = findings.length;
// DECLARED PER COMBO: the sign-in screen and the five tabs. The settings doors are
// the opposite on purpose - read out of the product, never typed here - so what
// is expected of them is the number of rows each index DREW, added up as the
// walk reads them, and a row that was drawn but never measured (row-vanished,
// door-shut, walk-failed) is a shortfall against that number.
const DASH_FIXED_PER_COMBO = 1 + TABS.length;
let expectedSettings = 0, dashShotTaken = false;
const dashArtifacts = [];
for (const width of WIDTHS) {
  for (const lang of LANGS) {
    const { ctx, page } = await openDash(width, lang);
    const want = (s) => !ONLY || s.toLowerCase().includes(ONLY.toLowerCase());

    for (const key of TABS) {
      if (!want(key)) continue;
      await goTab(page, key);
      await measure(page, `${width}/${lang}/${key}`);
      // ONE REAL FRAME FOR THE RECEIPT: a viewport frame (ROADMAP 9.11d), the first screen measured.
      if (!dashShotTaken) {
        dashShotTaken = true;
        const shotDir = fileURLToPath(new URL("../receipts/screenshots/sweep-tap-targets-dashboard/", import.meta.url));
        mkdirSync(shotDir, { recursive: true });
        await page.screenshot({ path: join(shotDir, `${key}-${width}-${lang}.png`) });
        dashArtifacts.push(`receipts/screenshots/sweep-tap-targets-dashboard/${key}-${width}-${lang}.png`);
      }
    }

    // THE SETTINGS SCREENS BEHIND BOTH DOORS.
    for (const [door, open] of [
      ["business", async () => goTab(page, "business")],
      // **THE GEAR IS A TOGGLE, AND PRESSING IT TWICE IS PRESSING IT ZERO
      // TIMES.** The first version of this walk clicked it unconditionally
      // after every Escape, so every other press CLOSED it and the index
      // underneath — the Business tab — was read instead. The run came back
      // clean and the "gear" list was an interleaving of gear rows and
      // Business rows: `Notifications, Business info, Team, Photo gallery,
      // Your password, FAQ…`. Nothing errored and every screen it did measure
      // was real, which is what makes this shape expensive: it is a coverage
      // hole wearing a pass. `App.jsx:499` puts `on` on the button while the
      // gear is up, so the state is readable and the press is conditional.
      ["gear", async () => {
        if (!(await page.locator('[data-tour="gear"].on').count())) {
          await page.locator('[data-tour="gear"]').first().click();
          await settle(page, 1800);
        }
      }],
    ]) {
      await open();
      const rows = await indexRows(page);
      const n = rows.length;
      expectedSettings += n;
      if (!n) {
        // A DOOR WITH NO ROWS BEHIND IT IS NOT A CLEAN DOOR.
        add(`${width}/${lang}/${door}`, { check: "no-doors", el: "(the index)", detail: `no .nav-row settings doors were found behind "${door}" — the index did not draw, or the handle moved` });
        continue;
      }
      for (let i = 0; i < n; i++) {
        const label = rows[i];
        // `--only gear` names the DOOR; `--only Team` names a row behind it.
        if (!want(label) && !want(door)) continue;
        // **ONE ODD ROW MUST NOT TAKE DOWN A FORTY-MINUTE WALK.** The previous
        // run died on row four of the Spanish Business index and threw away
        // every screen after it — 1440/es onward, three widths unmeasured, and
        // the only record of the run was a stack trace. A row that throws is a
        // FINDING about that row; the walk carries on and the report says so.
        try {
        // FOUND BY ITS OWN WORDS, EVERY TIME ROUND. `hasText` with a string is
        // a whitespace-normalised substring match, and the label was read the
        // same way, so it matches — but a row that has GONE must be said out
        // loud rather than quietly leaving its neighbour to be pressed twice.
        const btn = page.locator(".nav-row").filter({ hasText: label }).first();
        if (!(await btn.count())) {
          add(`${width}/${lang}/${door}`, { check: "row-vanished", el: `"${label}"`, detail: `this row was in the ${door} index when the walk started and was not there when its turn came, so the screen behind it was never measured` });
          continue;
        }
        const wasText = await mainText(page);
        await btn.click();
        await settle(page, 2000);
        // **DID THE DOOR ACTUALLY OPEN?** Measuring the index N times over is
        // the `pushState` failure wearing a different coat — trap (c), 22
        // screens passed that were never visited. If the main area's text is
        // byte-for-byte the same length after the press as before it, nothing
        // was navigated to and there is nothing behind this row to measure.
        const nowText = await mainText(page);
        if (nowText === wasText) {
          add(`${width}/${lang}/${door}/${label}`, { check: "door-shut", el: `.nav-row #${i} "${label}"`, detail: `pressing this settings row changed nothing on screen (${nowText} characters before and after), so no screen was measured behind it` });
        } else {
          await measure(page, `${width}/${lang}/${door}/${label}`);
        }
        // A settings screen is a page or a column, never a sheet, so the way
        // out is the key both containers answer.
        //
        // **EXCEPT THAT NOT EVERY ROW IS A SETTINGS SCREEN.** "The website
        // business" takes the whole shell and leaves no tab bar and no gear
        // behind it, and "Show me around" starts a guided tour over the top
        // of everything. Escape does not undo either, so the next `open()`
        // waited thirty seconds for a gear that was not on the page and took
        // the whole run down with it. A walk that cannot get back out is a
        // walk that stops at the first unusual door.
        await page.keyboard.press("Escape");
        await settle(page, 900);
        if (!(await page.locator(".tabbar, .rail").count())) {
          // `.catch` ON THE GOTO, because the app navigates itself: the SPA
          // pushes `/app/business` while this is still loading `/app` and
          // Playwright throws *"interrupted by another navigation"*. The
          // destination is the same shell either way, so the wait below is
          // what decides whether recovery worked — not the goto's own promise.
          await page.goto(`${BASE}/app`, { waitUntil: "domcontentloaded" }).catch(() => {});
          await page.waitForSelector(".tabbar, .rail", { timeout: 30000 });
          await settle(page, 2000);
        }
        await open();
        // No re-count guard here on purpose: matching each row by its own
        // words makes a moved index harmless, and a row that has genuinely
        // gone is caught above by `row-vanished` with its own name on it.
        } catch (e) {
          add(`${width}/${lang}/${door}/${label}`, { check: "walk-failed", el: `"${label}"`, detail: `the walk threw while opening or leaving this row, so it was never measured: ${String(e).split("\n")[0]}` });
          // Get back to a shell before the next row, or every later row fails
          // for a reason that has nothing to do with the later rows.
          await page.goto(`${BASE}/app`, { waitUntil: "domcontentloaded" }).catch(() => {});
          await page.waitForSelector(".tabbar, .rail", { timeout: 30000 }).catch(() => {});
          await settle(page, 2000);
          await open().catch(() => {});
        }
      }
    }
    await ctx.close();
  }
}

// THE LANDING AND PRICING PAGES — signed out, no session, and the only public
// surfaces a detailer meets before they are a customer.
for (const width of WIDTHS) {
  for (const path of ["/", "/pricing"]) {
    if (ONLY && !path.includes(ONLY.toLowerCase())) continue;
    const ctx = await browser.newContext({ viewport: { width, height: 900 } });
    const page = await ctx.newPage();
    await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded" });
    await settle(page, 2200);
    // THE LANDING PAGE HOLDS ITS COPY AT opacity 0 UNTIL A SCROLL REVEAL
    // FIRES, and a reveal is scheduled in a rAF that a hidden surface never
    // runs — trap (o). Scrolling the page end to end fires every one of them
    // before anything is measured.
    await page.evaluate(async () => {
      const h = document.documentElement.scrollHeight;
      for (let y = 0; y <= h; y += 400) {
        window.scrollTo(0, y);
        await new Promise((r) => requestAnimationFrame(() => r()));
      }
      window.scrollTo(0, 0);
    });
    await settle(page, 1400);
    await measure(page, `${width}/en${path}`);
    await ctx.close();
  }
}

// ── THE DASHBOARD / SETTINGS / LANDING RECEIPT - ROADMAP 4.6, 2026-10-06. ─────
// The admin receipt below has said since 4.5 that this half was "not represented".
// This is the sibling that represents it: its own check_id, its own declared
// expectation, its own canary (the five `BREAKS`), graded by `receipt.mjs`.
// **A NARROWED RUN WRITES NONE.** `--only` skips tabs and doors, and a receipt
// whose expectation was quietly narrowed to match proves nothing; it says it did
// not write one. `--widths` and `--lang` are honest narrowing (the expectation
// is computed from them) and still write.
// **UNMEASURED UNTIL THE FIRST BROWSER RUN, said here so nobody reads these as
// measured:** the 100-probes-per-screen floor is a guess below the ~1,336 the
// back office averages, and the settings-door count has no floor beyond "the
// index drew at least one row" (the `no-doors` finding). Both get a measured
// value from the first run (ROADMAP 4.6).
if (ONLY) {
  skips.push(`the dashboard receipt was not written because --only ${ONLY} narrows the walk`);
} else {
  const dashDiscovered = screens - screensBeforeDash;
  const dashProbes = probes - probesBeforeDash;
  const dashFindings = findings.slice(findingsBeforeDash);
  const dashExpected = WIDTHS.length * LANGS.length * DASH_FIXED_PER_COMBO + expectedSettings + WIDTHS.length * 2;
  const dc = await runDashCanary(browser);
  const dcOk = dc.blind === 0 && dc.restored && dc.problems.length === 0;
  const dashStatus = dashFindings.length === 0 && dashDiscovered === dashExpected && dcOk ? "pass" : "fail";
  const { path: dashReceipt } = writeReceipt({
    check_id: "sweep-tap-targets-dashboard",
    started_at,
    status: dashStatus,
    expected_targets: dashExpected,
    discovered_targets: dashDiscovered,
    attempted_targets: dashDiscovered,
    completed_targets: dashDiscovered,
    skipped_targets: Math.max(0, dashExpected - dashDiscovered),
    assertions_executed: dashProbes,
    min_assertions: Math.max(1, dashDiscovered) * 100,
    failures: [
      ...dashFindings.map((f) => `${f.where}: ${f.check} - ${f.el} - ${f.detail}`),
      ...dc.problems.map((q) => `dashboard canary: ${q.el} - ${q.detail}`),
    ],
    artifacts: dashArtifacts,
    warnings: skips.filter((x) => !(x.toLowerCase().includes("admin") || x.toLowerCase().includes("back office"))),
    dimensions: {
      scope: "the detailer dashboard (sign-in, five tabs, every settings door behind Business and the gear) and the landing and pricing pages; the /admin back office is in receipts/sweep-tap-targets.json",
      widths: WIDTHS,
      langs: LANGS,
      fixed_screens_per_combo: DASH_FIXED_PER_COMBO,
      settings_doors_read_from_the_product: expectedSettings,
      landing_paths: ["/", "/pricing"],
      canary_breaks: `${dc.runs - dc.blind}/${dc.runs}`,
      canary_restored: dc.restored,
    },
    canary: {
      id: "the five BREAKS in scripts/lib/tapProbe.mjs, each applied to the Clients tab at 392px and required to be reported by its own check",
      observed_failure: dcOk,
      findings: dc.problems.map((q) => q.detail),
    },
  });
  console.log(`\nreceipt (dashboard, settings, landing) -> ${dashReceipt}`);
}

// THE BACK OFFICE — CREDENTIAL-FREE NOW, WHICH IT WAS NOT WHEN THIS SECTION
// WAS FIRST WRITTEN. It used to sign in through `scripts/admin-account.mjs`,
// which mints a throwaway admin from the SERVICE ROLE KEY and drops it when
// the run ends — built that way because at the time the demo login was
// deliberately NOT a platform admin (the old CLAUDE.md rule `admin-account.mjs`
// still quotes: *"Making demo@detailplatform.com an admin would put every
// detailer's data behind the demo owner's password."*). ROADMAP 0.1 recorded Andrew reversing
// that himself, 2026-09-16 — *"I made one of them just be able to access both
// because I was tired of switching accounts… literally no one's on the
// site"* — and today's back-office-access finding (docs/gotchas.md § 6)
// confirmed live that `demo@detailplatform.com` sits in `platform_admins`
// right now. So the throwaway-admin machinery is no longer buying anything:
// the standing demo login already reaches `/admin`, needs no service-role
// key, no account creation, no teardown, and is the same credential every
// other script in this file already signs in with two screens up. This
// closes ROADMAP 4.5's actual "Done when": a run needing nothing but the dev
// server can now reach `AdminPage.jsx` and fail a real break in it.
//
// **THIS IS THE HALF `docs/lane-b-handover-2026-09-13.md` § 2d COULD NOT
// MEASURE.** It read `.pa-x` at 30px and `.pa-chip` at about 29px out of
// `admin.css` and said so as SOURCE evidence, because nothing could probe the
// screen. This can, and now does it without a second credential path.
const OWNER_ADMIN = demoOwner();
// DECLARED, NOT COUNTED FROM THE RUN — keyboard-walk.mjs's own rule, § "the
// count is read once at the index" applies here too: five back-office tabs
// (Today, Growth, Money, Detailers, System health) plus the Detailers drawer,
// which opens on every width/lang combo this file has ever measured. A run
// that finds fewer is a real shortfall the receipt below must report, not a
// number quietly redefined to match whatever happened.
const EXPECTED_ADMIN_SCREENS_PER_COMBO = 6;
const screensBeforeAdmin = screens, probesBeforeAdmin = probes;
const adminArtifacts = [];
let adminShotTaken = false;
if (ONLY && !"admin".includes(ONLY.toLowerCase())) {
  skips.push(`the back office was not walked because --only ${ONLY} does not name it`);
} else {
  try {
    for (const width of ADMIN_WIDTHS) {
        for (const lang of LANGS) {
          // SAME RULE AS THE SETTINGS WALK: a back office that will not open is
          // a finding about the back office, not a reason to throw away a walk
          // that has already finished. The first attempt died here on a
          // selector and lost the whole run's report.
          try {
          const ctx = await browser.newContext({ viewport: { width, height: 900 } });
          const page = await ctx.newPage();
          await page.goto(`${BASE}/admin`, { waitUntil: "domcontentloaded" });
          await page.evaluate((l) => { try { localStorage.setItem("dp.lang.app", l); } catch { /* private mode */ } }, lang);
          await page.reload({ waitUntil: "domcontentloaded" });
          await page.waitForSelector("input[type=email], .pa-tabs, .adm", { timeout: 25000 });
          if (await page.locator("input[type=email]").count()) {
            await page.fill("input[type=email]", OWNER_ADMIN.email);
            await page.fill("input[type=password]", OWNER_ADMIN.password);
            // `form button[type=submit]`, NOT `form button.btn.primary`. The
            // back office has its own kit: its submit is `.pa-btn.pa-go` and
            // `.btn.primary` does not exist anywhere in `admin.css`. The first
            // version copied the dashboard's selector and waited thirty
            // seconds for a class that is not in that stylesheet — the same
            // shape as trap (h), a check coupled to a spelling. `type=submit`
            // is the BEHAVIOUR and it is true of both screens.
            await page.click("form button[type=submit]");
            await page.waitForSelector(".pa-tabs, .adm", { timeout: 30000 }).catch(() => {});
          }
          await settle(page, 2600);
          // EVERY TAB, and the open-detailer drawer, because `.pa-x` is the
          // drawer's only way out and it does not exist until one is open.
          const n = await page.locator(".pa-tab").count();
          if (!n) {
            add(`${width}/${lang}/admin`, { check: "no-doors", el: "(the tab bar)", detail: "no .pa-tab back-office tabs were found — the sign-in did not take, or the handle moved" });
          }
          for (let i = 0; i < n; i++) {
            const t = page.locator(".pa-tab").nth(i);
            const label = ((await t.textContent()) || `tab${i}`).trim().replace(/\s+/g, " ").slice(0, 20);
            await t.click();
            // **WAIT FOR THE PANEL, NOT FOR A REPAINT.** Every back-office tab
            // draws from the `platform-admin` edge function, and a screen
            // waiting on a round trip is QUIET in all three senses `settle()`
            // asks about — no mutation, no animation, no `.spinner` — so it
            // returned on an empty panel and every tab measured **6 controls**:
            // the five tabs and Sign out, and nothing else. The Detailers list
            // had no `.pa-biz` row in it, which is what made the emptiness
            // visible rather than plausible.
            await page.locator(".pa-card, .pa-rows, .pa-biz").first()
              .waitFor({ state: "attached", timeout: 15000 }).catch(() => {});
            await settle(page, 2200);
            const drew = await page.locator(".pa-card, .pa-rows, .pa-biz").count();
            if (!drew) {
              add(`${width}/${lang}/admin/${label}`, { check: "panel-empty", el: `(the ${label} tab)`, detail: "the tab drew no .pa-card, .pa-rows or .pa-biz in 15 seconds, so whatever controls it holds were never measured — this screen's result is not a pass" });
            }
            await measure(page, `${width}/${lang}/admin/${label}`);
            // `.pa-biz` IS THE DETAILER ROW AND `.pa-x` DOES NOT EXIST UNTIL
            // ONE IS OPEN. The drawer's close button is the control § 2d of
            // the lane B handover names, so a walk that never opens a drawer
            // would report the back office clean without ever meeting it.
            const row = page.locator(".pa-biz").first();
            if (await row.count()) {
              await row.click();
              await settle(page, 2400);
              await measure(page, `${width}/${lang}/admin/${label}/open`);
              // ONE REAL SCREENSHOT, THE FIRST TIME THE DRAWER OPENS. A
              // receipt with no artifact is a receipt nobody can look at
              // (`receipt.mjs`'s own rule) — this is the evidence, not
              // decoration.
              if (!adminShotTaken) {
                adminShotTaken = true;
                const shotDir = fileURLToPath(new URL("../receipts/screenshots/sweep-tap-targets-admin/", import.meta.url));
                mkdirSync(shotDir, { recursive: true });
                await page.screenshot({ path: join(shotDir, "detailer-drawer-open.png") });
                adminArtifacts.push("receipts/screenshots/sweep-tap-targets-admin/detailer-drawer-open.png");
              }
              await page.keyboard.press("Escape");
              await settle(page, 800);
            } else if (/detailer|negocio/i.test(label)) {
              skips.push(`${width}/${lang}/admin/${label}: no .pa-biz row to open, so .pa-x was never drawn`);
            }
          }
          await ctx.close();
          } catch (e) {
            add(`${width}/${lang}/admin`, { check: "walk-failed", el: "(the back office)", detail: `the walk threw, so the back office was not measured at this width: ${String(e).split("\n")[0]}` });
          }
        }
      }
  } catch (e) {
    skips.push(`THE BACK OFFICE WALK THREW BEFORE IT COULD FINISH: ${String(e).split("\n")[0]}`);
  }

  // ── THE RECEIPT — WHAT 4.5 ACTUALLY BUILT, GRADED BY receipt.mjs, NOT BY
  // THIS SCRIPT'S OWN VERDICT. ─────────────────────────────────────────────
  // Scoped to the admin section's OWN counts (snapshotted around it above),
  // not the whole file's dashboard/landing sections too — this receipt
  // describes what the back-office walk covered in THIS invocation, honestly
  // including a shorter run if `--only` or `--widths` narrowed it.
  const adminDiscovered = screens - screensBeforeAdmin;
  const adminProbesUsed = probes - probesBeforeAdmin;
  const adminFindings = findings.filter((f) => f.where.includes("/admin"));
  const adminExpected = ADMIN_WIDTHS.length * LANGS.length * EXPECTED_ADMIN_SCREENS_PER_COMBO;
  const canary = await runAdminCanary(browser, 5);
  const canaryOk = canary.caught === canary.runs && canary.restored;
  const receiptStatus = adminFindings.length === 0 && adminDiscovered === adminExpected && canaryOk
    ? "pass" : "fail";
  const { path: receiptPath } = writeReceipt({
    check_id: "sweep-tap-targets",
    started_at,
    status: receiptStatus,
    expected_targets: adminExpected,
    discovered_targets: adminDiscovered,
    attempted_targets: adminDiscovered,
    completed_targets: adminDiscovered,
    skipped_targets: Math.max(0, adminExpected - adminDiscovered),
    assertions_executed: adminProbesUsed,
    // A generous floor below the ~1,336 probes/screen this walk has actually
    // measured every run so far — real, not asymptotic, and it scales with
    // however many screens this particular invocation covered.
    min_assertions: Math.max(1, adminDiscovered) * 200,
    failures: [
      ...adminFindings.map((f) => `${f.where}: ${f.check} — ${f.el} — ${f.detail}`),
      ...(canaryOk ? [] : [`admin canary only caught ${canary.caught}/${canary.runs}` + (canary.restored ? "" : ", and did not restore cleanly")]),
    ],
    artifacts: adminArtifacts,
    warnings: skips.filter((s) => s.toLowerCase().includes("admin") || s.toLowerCase().includes("back office")),
    dimensions: {
      scope: "the /admin back office only — the dashboard, settings and landing/pricing sections are in receipts/sweep-tap-targets-dashboard.json",
      admin_widths: ADMIN_WIDTHS,
      langs: LANGS,
      expected_screens_per_combo: EXPECTED_ADMIN_SCREENS_PER_COMBO,
      canary_repeats: `${canary.caught}/${canary.runs}`,
      canary_restored: canary.restored,
    },
    canary: {
      id: ".pa-tab squeezed to 2px/4px padding and 10px type — a plausible spacing edit, not a syntax error",
      observed_failure: canaryOk,
      findings: canary.detail,
    },
  });
  console.log(`\nreceipt (admin section only) -> ${receiptPath}`);
}
await browser.close();

// ------------------------------------------------------------------ REPORT
console.log(`\n${screens} screens, ${WIDTHS.length} widths, ${LANGS.length} languages, `
  + `${subjects} controls measured, ${probes} press probes`);
console.log(`${clamped} controls had a side stopped by the edge of the screen (counted as reaching, because nothing can steal a press that lands off-screen)`);
console.log(`\nstated exceptions — printed whether or not they fired:`);
for (const ex of EXCEPTIONS) {
  console.log(`  ${ex.id.padEnd(20)} ${fired[ex.id] || 0} subjects took it`);
  console.log(`  ${"".padEnd(20)} ${ex.why}`);
  console.log(`  ${"".padEnd(20)} decided by: ${ex.who}`);
}
// A GUARD THAT SKIPS MUST PRINT THAT IT SKIPPED.
if (skips.length) { console.log(`\nnot walked:`); for (const s of skips) console.log(`  ${s}`); }

if (!findings.length) console.log(`\nclean — nothing under ${FLOOR}px of reach`);
else {
  const by = {};
  for (const f of findings) (by[f.check] ||= []).push(f);
  for (const [check, list] of Object.entries(by)) {
    const seen = new Map();
    for (const f of list) {
      const k = `${f.el} — ${f.detail}`;
      if (!seen.has(k)) seen.set(k, []);
      seen.get(k).push(f.where);
    }
    console.log(`\n${check} — ${list.length} findings, ${seen.size} distinct controls`);
    for (const [k, wheres] of seen) console.log(`  ${k}\n      ${wheres.slice(0, 6).join("  ")}${wheres.length > 6 ? `  (+${wheres.length - 6} more)` : ""}`);
  }
}
await reportSourceMoved(changedSince, !findings.length);
process.exit(findings.length ? 1 : 0);
