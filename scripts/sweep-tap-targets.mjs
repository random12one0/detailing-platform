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
import { reportSourceMoved, watchSource } from "./source-guard.mjs";
import { TAP_PROBE, BREAKS, EXCEPTIONS, FLOOR, CAP } from "./lib/tapProbe.mjs";
const { chromium } = createRequire(import.meta.url)("./../app/node_modules/playwright/index.js");

const changedSince = watchSource();
const BASE = process.env.BASE || "http://localhost:5173";
const argOf = (flag) => { const i = process.argv.indexOf(flag); return i > -1 ? process.argv[i + 1] : null; };
const BASELINE = process.argv.includes("--baseline");
const ONLY = argOf("--only");
// 320 IS THE NARROWEST SUPPORTED WIDTH, not 392 — `PRODUCT.md` promises
// 320→1440 and the dashboard has a layout of its own below 361px.
const WIDTHS = (argOf("--widths") || "1440,768,392,320").split(",").map(Number);
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
const openDash = async (width, lang) => {
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
    await measure(page, `${width}/${lang}/sign-in`);
    await page.fill("input[type=email]", "demo@detailplatform.com");
    await page.fill("input[type=password]", "demo123");
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

// ----------------------------------------------------------------- BASELINE
if (BASELINE) {
  // ONE SCREEN, ONE WIDTH. An instrument is proved, not surveyed.
  const { ctx, page } = await openDash(392, "en");
  await goTab(page, "clients");
  const before = await page.evaluate(TAP_PROBE, ARGS);
  console.log(`\nthe real screen first: ${before.subjects} controls, ${before.findings.length} findings\n`);
  let blind = 0;
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
    if (!got.length) { blind++; add("baseline", { check: "BASELINE", el: check, detail: `the "${check}" check did not report its own deliberate fault (${what})` }); }
    // RESTORE, AND PROVE THE RESTORE. A break that survives into the next
    // measurement makes every later check look broken; a restore nobody checks
    // is the same bug one level up.
    await page.evaluate(() => document.getElementById("tap-break")?.remove());
    await settle(page, 600);
    const back = await page.evaluate(TAP_PROBE, ARGS);
    const same = back.subjects === before.subjects && back.findings.length === before.findings.length;
    console.log(`       restored   ${back.subjects} controls, ${back.findings.length} findings `
      + (same ? "— back to where it started" : "— *** NOT back to where it started ***"));
    if (!same) add("baseline", { check: "BASELINE", el: check, detail: `undoing the "${check}" break did not restore the screen (${before.subjects}/${before.findings.length} → ${back.subjects}/${back.findings.length})` });
  }
  await ctx.close();
  await browser.close();
  console.log(`\n${Object.keys(BREAKS).length} checks broken on purpose, ${blind} blind`);
  await reportSourceMoved(changedSince, !findings.length);
  process.exit(findings.length ? 1 : 0);
}

// --------------------------------------------------------------------- WALK
console.log(`floor ${FLOOR}px of reach, cap ${CAP}px a side, widths ${WIDTHS.join("/")}, languages ${LANGS.join("/")}\n`);
for (const width of WIDTHS) {
  for (const lang of LANGS) {
    const { ctx, page } = await openDash(width, lang);
    const want = (s) => !ONLY || s.toLowerCase().includes(ONLY.toLowerCase());

    for (const key of TABS) {
      if (!want(key)) continue;
      await goTab(page, key);
      await measure(page, `${width}/${lang}/${key}`);
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

// THE BACK OFFICE — AND NOT WITH `demo@demo.com`, WHOSE PASSWORD IS
// DELIBERATELY IN NO FILE. `scripts/admin-account.mjs` makes a throwaway admin
// from the service key and removes it at the end of the run, which is what
// `shoot-admin.mjs` already does and the reason that file exists: a fixed
// password for the one account that can see every tenant, written into a
// public repository, was the finding it was written to close.
//
// **THIS IS THE HALF `docs/lane-b-handover-2026-09-13.md` § 2d COULD NOT
// MEASURE.** It read `.pa-x` at 30px and `.pa-chip` at about 29px out of
// `admin.css` and said so as SOURCE evidence, because nothing could probe the
// screen. This can.
if (ONLY && !"admin".includes(ONLY.toLowerCase())) {
  skips.push(`the back office was not walked because --only ${ONLY} does not name it`);
} else if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
  const { makeAdmin, dropAdmin } = await import("./admin-account.mjs");
  const U = process.env.SUPABASE_URL, K = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const acct = await makeAdmin(U, K, "tapsweep-admin@detailplatform.com");
  if (!acct) skips.push("THE BACK OFFICE WAS NOT WALKED: the throwaway admin account could not be created.");
  else {
    try {
      for (const width of WIDTHS) {
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
            await page.fill("input[type=email]", acct.email);
            await page.fill("input[type=password]", acct.password);
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
    } finally { await dropAdmin(U, K, acct.id); }
  }
} else {
  skips.push("THE BACK OFFICE AT /admin WAS NOT WALKED — no SUPABASE_URL / "
    + "SUPABASE_SERVICE_ROLE_KEY in the environment, so the throwaway admin could "
    + "not be made. Run `set -a; . ./.env; set +a` first.");
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
