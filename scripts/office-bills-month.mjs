// ROADMAP 9.12a step 6, slice 6d — a past-month switch on Money's "Platform bills".
// Until now the bill form could only type into THIS month, which the old five-tab
// screen could step back from; removing that screen (6e) would have deleted it.
//
//   node scripts/office-bills-month.mjs                  (dev server on :5173; no credentials)
//   node scripts/office-bills-month.mjs --lite           (the ?lite=1 reduced-motion path)
//   node scripts/office-bills-month.mjs --break=this-month  (sabotage: the switch is hidden,
//                                                         i.e. the defect this slice fixes)
//   node scripts/office-bills-month.mjs --freeze=before|after  (Andrew's frozen copies in
//                                                         belt/shots/9.12a, names *-bills-month)
//
// WRITES NOTHING ANYWHERE. A made-up session sits in the browser's storage and every
// `platform-admin` call is answered by page.route(), with a small in-memory ledger so
// a saved bill shows up in the next read of its month. So it asks what the screen
// SENDS and SHOWS; whether the server takes a bill is `costEntry`'s job.
//
// WHAT IT ASKS, at 390, 392, 320, 768, 1440 and 1920:
//   0. the switch exists, opens on this month with "Later month" off, and this month's
//      four expected bills read "Not entered" (never $0);
//   1. one press back reads last month with ITS figures ($19 hosting, $25 database,
//      email and domain still "Not entered"), and `platform_net` was asked for that month;
//   2. a bill typed into the past month sends THAT month as `period_month`, shows in
//      its row, and does not appear in this month;
//   3. a refusal shows the server's sentence, keeps the form open and the row "Not entered";
//   4. switching month closes an open form (a half-typed bill cannot be saved to the
//      wrong month);
//   5. "Earlier month" turns off exactly 11 months back (the twelve the chart on Today
//      draws), having asked for twelve distinct months;
//   6. no overlap, 44px hit areas, nothing cut by an edge, no sideways overflow,
//      console silent apart from the one refusal asked for.
// THE CANARY injects an overlapping copy of a button and requires the same probe to
// name it.

import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
import { writeReceipt } from "./receipt.mjs";
import { settle, watchConsole } from "./lib/bookingWalk.mjs";

const { chromium } = createRequire(import.meta.url)("./../app/node_modules/playwright/index.js");

const started_at = new Date().toISOString();
const arg = (k) => (process.argv.find((a) => a.startsWith(`--${k}=`)) || "").split("=")[1] || "";
const BREAK = arg("break");
const FREEZE = arg("freeze");
const LITE = process.argv.includes("--lite");
const BASE = process.env.BASE || "http://localhost:5173";
const SIZES = [{ w: 390, h: 844 }, { w: 392, h: 844 }, { w: 320, h: 700 }, { w: 768, h: 1024 }, { w: 1440, h: 900 }, { w: 1920, h: 1080 }];
const ART = `artifacts/office-bills-month${LITE ? "-lite" : ""}`;
const SHOTS = "C:/Users/rando/Downloads/claude/belt/shots/9.12a";
const REF = "kguqylyzgyzfktkfnhjb";
const MONTHS_BACK = 11; // the chart on Today draws twelve months: this one and eleven before

// Same arithmetic as lastMonths() in app/src/lib/officeToday.js, written out here so
// the script does not borrow the code it is judging.
const monthKey = (back) => {
  const n = new Date();
  const d = new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth() - back, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-01`;
};
const monthName = (back) => new Date(`${monthKey(back)}T00:00:00Z`).toLocaleString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });

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

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const exp = Math.floor(Date.now() / 1000) + 3600 * 24;
const user = { id: "00000000-0000-4000-8000-000000000001", email: "andrew@example.com", aud: "authenticated", role: "authenticated" };
const SESSION = {
  access_token: `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ sub: user.id, exp, role: "authenticated", email: user.email })}.x`,
  refresh_token: "fake", token_type: "bearer", expires_in: 86400, expires_at: exp, user,
};

// `cut` is measured first: `.bo` clips sideways, so a row wider than the phone never
// makes the page scroll (office-prices.mjs, 2026-10-11).
const PROBE = (sel) => {
  const els = [...document.querySelectorAll(sel)].filter((e) => e.checkVisibility({ checkVisibilityCSS: true, contentVisibilityAuto: true }) && e.getBoundingClientRect().width > 0);
  const name = (e) => (e.textContent || e.getAttribute("aria-label") || "").trim().slice(0, 24);
  const overlaps = [], thin = [];
  const cut = els.filter((e) => { const r = e.getBoundingClientRect(); return r.left < -0.5 || r.right > innerWidth + 0.5; }).map((e) => `${name(e)} cut by an edge`);
  for (let i = 0; i < els.length; i++) for (let j = i + 1; j < els.length; j++) {
    if (els[i].contains(els[j]) || els[j].contains(els[i])) continue;
    const a = els[i].getBoundingClientRect(), b = els[j].getBoundingClientRect();
    const w = Math.min(a.right, b.right) - Math.max(a.left, b.left), h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
    if (w > 0.5 && h > 0.5) overlaps.push(`${name(els[i])} x ${name(els[j])}`);
  }
  for (const el of els) {
    if (!el.matches("button")) continue;
    el.scrollIntoView({ block: "center" });
    const r = el.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    for (const dy of [-21, 21]) {
      const hit = document.elementFromPoint(cx, cy + dy);
      if (!hit || !(el === hit || el.contains(hit))) thin.push(`${name(el)} @${dy}`);
    }
  }
  return { overlaps, thin, cut, overflowX: document.documentElement.scrollWidth > innerWidth + 1, n: els.length };
};
const probe = (page, sel) => page.evaluate(`(${PROBE.toString()})(${JSON.stringify(sel)})`);

let browser = null;
const canary = { id: "injected-overlapping-month-button", observed_failure: false };
let completed = 0;
mkdirSync(ART, { recursive: true });
if (FREEZE) mkdirSync(SHOTS, { recursive: true });

async function openPage(size) {
  const ctx = await browser.newContext({ viewport: { width: size.w, height: size.h } });
  await ctx.addInitScript(([k, v]) => { try { localStorage.setItem(k, v); } catch { /* ignore */ } }, [`sb-${REF}-auth-token`, JSON.stringify(SESSION)]);
  const page = await ctx.newPage();
  const sent = [];
  // The ledger: bills typed in, by month then kind. Last month starts with two.
  const ledger = { [monthKey(1)]: { hosting: 1900, database: 2500 } };
  const answer = { cost: "ok" };
  await page.route(`**/auth/v1/user**`, (r) => r.fulfill({ json: user }));
  await page.route("**/functions/v1/platform-admin", async (route) => {
    const body = JSON.parse(route.request().postData() || "{}");
    sent.push(body);
    switch (body.action) {
      case "whoami": return route.fulfill({ json: { email: user.email } });
      case "list": return route.fulfill({ json: { rows: [], totals: {}, prices: { current: null, built_in: {}, updated_at: null } } });
      case "platform_net": {
        const bills = ledger[body.period] ?? {};
        const cost = Object.values(bills).reduce((a, c) => a + c, 0);
        const entered = Object.keys(bills).length > 0;
        const revenue = body.period === monthKey(1) ? 12000 : 0;
        return route.fulfill({ json: { period_month: body.period, revenue_cents: revenue, cost_cents: cost, costs_entered: entered, net_cents: entered ? revenue - cost : null, by_category: bills } });
      }
      case "platform_cost_add":
        if (answer.cost === "no") return route.fulfill({ status: 400, json: { error: "That amount is too large. One bill can be at most $21,474,836.47." } });
        (ledger[body.period_month] ??= {})[body.category] = body.amount_cents;
        return route.fulfill({ json: { success: true, id: "x" } });
      default: return route.fulfill({ json: {} });
    }
  });
  // The defect this slice fixes, in the product's own terms: no way to pick a month.
  if (BREAK === "this-month") await ctx.addInitScript(() => {
    const css = ".bo-monthstep { display: none !important; }";
    const s = () => { const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st); };
    if (document.head) s(); else document.addEventListener("DOMContentLoaded", s);
  });
  watchConsole(page, `${size.w}`, consoleNoise);
  await page.goto(`${BASE}/admin${LITE ? "?lite=1" : ""}#money`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".bo-money", { timeout: 60000 });
  await settle(page, 1400);
  return { ctx, page, sent, answer, ledger };
}
const sec = (page) => page.locator('[aria-label="Platform bills"]');
const earlier = (page) => sec(page).getByRole("button", { name: "Earlier month" });
const later = (page) => sec(page).getByRole("button", { name: "Later month" });
const shown = (page) => sec(page).locator(".bo-monthname").innerText().catch(() => "(no month name)");
const rows = (page) => sec(page).locator(".bo-bills > li").evaluateAll((els) => els.map((li) => [li.dataset.bill, li.querySelector(".amt").innerText.trim()]));
const asked = (sent) => [...new Set(sent.filter((b) => b.action === "platform_net").map((b) => b.period))];

try {
  browser = await chromium.launch();

  if (FREEZE) {
    const { freeze, differs } = await import("file:///C:/Users/rando/Downloads/claude/belt/freeze.mjs");
    const size = { w: 390, h: 844 };
    const { ctx, page } = await openPage(size);
    await sec(page).evaluate((e) => e.scrollIntoView({ block: "start" }));
    if (FREEZE === "after") {
      await earlier(page).click();
      await settle(page, 600);
      await sec(page).locator('.bo-bills > li[data-bill="email"] .bo-btn').click();
      await sec(page).locator(".bo-billform input").first().fill("20");
    }
    const out = `${SHOTS}/${FREEZE}-bills-month.html`;
    await freeze(page, { out, label: FREEZE === "after" ? "After" : "Before", highlight: '[aria-label="Platform bills"]',
      note: FREEZE === "after"
        ? "Platform bills now has a month switch. Here it is stepped back one month: that month's own bills show, and the email bill is being typed in for it."
        : "Platform bills can only be typed into the current month. There is no way to step back to last month's bills." });
    if (FREEZE === "after") console.log(`differs: ${await differs(page, `${SHOTS}/before-bills-month.html`, out, { width: size.w, height: size.h })}`);
    await ctx.close();
    writeFileSync(`${SHOTS}/where.json`, JSON.stringify({
      what: "Money's Platform bills has a month switch, so last month's (and earlier months') bills can be read and typed in.",
      url: `${BASE}/admin#money`,
      how: "Open the back office, tap Money, scroll to Platform bills, tap the left arrow beside the month.",
      situation: "Last month already has a hosting bill ($19) and a database bill ($25); the email and domain bills for it are not typed in yet.",
      before: "The Before copy shows the same section with no month switch.",
    }, null, 2) + "\n");
  } else {
    for (const size of SIZES) {
      const where = `${size.w}${LITE ? " lite" : ""}`;
      console.log(`\n${where}`);
      const { ctx, page, sent, answer } = await openPage(size);
      await sec(page).scrollIntoViewIfNeeded();

      // ── 0. THE SWITCH, ON THIS MONTH ──
      const switchHere = (await earlier(page).count()) === 1 && (await later(page).count()) === 1;
      check(where, "Platform bills has an Earlier month and a Later month button", switchHere);
      if (switchHere) {
        check(where, `opens on this month (${monthName(0)})`, (await shown(page)) === monthName(0), await shown(page));
        check(where, "Later month is off on this month", await later(page).isDisabled());
        check(where, "Earlier month is on", await earlier(page).isEnabled());
        const now = await rows(page);
        check(where, "this month: hosting, database, email, domain all read Not entered, never $0",
          now.length === 4 && now.every(([, v]) => v === "Not entered"), JSON.stringify(now));
        await page.screenshot({ path: `${ART}/this-month-${size.w}.png` }); artifacts.push(`${ART}/this-month-${size.w}.png`);

        // ── 1. ONE PRESS BACK ──
        await earlier(page).click();
        await settle(page, 700);
        check(where, `one press back reads ${monthName(1)}`, (await shown(page)) === monthName(1), await shown(page));
        check(where, "platform_net was asked for that month", asked(sent).includes(monthKey(1)), JSON.stringify(asked(sent)));
        const prev = Object.fromEntries(await rows(page));
        check(where, "last month's own figures show: hosting $19, database $25, email and domain Not entered",
          prev.hosting === "$19" && prev.database === "$25" && prev.email === "Not entered" && prev.domain === "Not entered", JSON.stringify(prev));
        check(where, "Later month is now on", await later(page).isEnabled());
        await page.screenshot({ path: `${ART}/last-month-${size.w}.png` }); artifacts.push(`${ART}/last-month-${size.w}.png`);

        // ── 2. A BILL INTO THE PAST MONTH ──
        const li = (k) => sec(page).locator(`.bo-bills > li[data-bill="${k}"]`);
        await li("email").locator(".bo-btn").click();
        await li("email").locator(".bo-billform input").first().fill("20");
        await li("email").locator(".bo-billform .bo-btn.go").click();
        await page.waitForFunction(() => document.querySelector('[aria-label="Platform bills"] li[data-bill="email"] .amt')?.innerText.trim() === "$20", null, { timeout: 10000 }).catch(() => {});
        const w = sent.filter((b) => b.action === "platform_cost_add");
        check(where, "Save sends that month as period_month, the kind and 2000 cents",
          w.length === 1 && w[0].period_month === monthKey(1) && w[0].category === "email" && w[0].amount_cents === 2000, JSON.stringify(w));
        check(where, "the saved bill shows in the past month's row", (await li("email").locator(".amt").innerText()) === "$20", await li("email").locator(".amt").innerText());
        check(where, "the form closed after saving", (await sec(page).locator(".bo-billform").count()) === 0);

        // ── 3. REFUSED ──
        answer.cost = "no";
        await li("domain").locator(".bo-btn").click();
        await li("domain").locator(".bo-billform input").first().fill("99999999999");
        await li("domain").locator(".bo-billform .bo-btn.go").click();
        await settle(page, 400);
        const sentence = await sec(page).locator(".bo-billform .bo-err").innerText().catch(() => "");
        check(where, "a refusal shows the server's own sentence", sentence.startsWith("That amount is too large"), sentence);
        check(where, "the form stays open and the row stays Not entered", (await sec(page).locator(".bo-billform").count()) === 1 && (await li("domain").locator(".amt").innerText()) === "Not entered");
        answer.cost = "ok";

        // ── 4. SWITCHING MONTH CLOSES AN OPEN FORM ──
        await earlier(page).click();
        await settle(page, 500);
        check(where, `Earlier month moved on to ${monthName(2)}`, (await shown(page)) === monthName(2), await shown(page));
        check(where, "the open form closed, so a half-typed bill cannot land in the wrong month", (await sec(page).locator(".bo-billform").count()) === 0);
        const older = await rows(page);
        check(where, "a month nobody typed anything into reads Not entered for every bill", older.length === 4 && older.every(([, v]) => v === "Not entered"), JSON.stringify(older));

        // ── 5. THIS MONTH IS UNTOUCHED, AND THE LIMIT ──
        await later(page).click(); await later(page).click();
        await settle(page, 500);
        check(where, "two presses forward is this month again", (await shown(page)) === monthName(0), await shown(page));
        const back = Object.fromEntries(await rows(page));
        check(where, "nothing typed into last month leaked into this one", Object.values(back).every((v) => v === "Not entered"), JSON.stringify(back));
        for (let n = 0; n < MONTHS_BACK && (await earlier(page).isEnabled()); n++) { await earlier(page).click(); await settle(page, 120); }
        check(where, `Earlier month stops at ${monthName(MONTHS_BACK)}, ${MONTHS_BACK} months back`, (await shown(page)) === monthName(MONTHS_BACK) && (await earlier(page).isDisabled()), await shown(page));
        check(where, "twelve distinct months were asked for, no more", asked(sent).length === MONTHS_BACK + 1, `${asked(sent).length}`);
        await later(page).click(); await settle(page, 150);
        check(where, "Later month still works from the oldest month", (await shown(page)) === monthName(MONTHS_BACK - 1), await shown(page));
        for (let n = 0; n < MONTHS_BACK - 1; n++) { await later(page).click(); await settle(page, 60); }

        // ── 6. LAYOUT ──
        await li("email").locator(".bo-btn").click();
        await settle(page, 700); // the form fades in; measure and photograph it finished
        const p = await probe(page, '[aria-label="Platform bills"] .bo-label, .bo-monthstep button, .bo-monthname, .bo-bill b, .bo-bill .amt, .bo-bill .bo-btn, .bo-billform label, .bo-billform input, .bo-billform .bo-btn');
        check(where, "no overlap, buttons 44px, nothing cut by an edge, no sideways overflow",
          p.overlaps.length === 0 && p.thin.length === 0 && p.cut.length === 0 && !p.overflowX && p.n > 8, JSON.stringify(p));
        await page.screenshot({ path: `${ART}/form-${size.w}.png` }); artifacts.push(`${ART}/form-${size.w}.png`);

        if (size.w === SIZES[0].w) {
          const before = (await probe(page, ".bo-monthstep button, .bo-monthname")).overlaps.length;
          await page.evaluate(() => { const b = document.querySelector(".bo-monthstep button"); const c = b.cloneNode(true); c.dataset.canary = "1"; c.style.position = "absolute"; c.style.left = "0"; c.style.top = "0"; b.parentElement.style.position = "relative"; b.parentElement.appendChild(c); });
          const after = (await probe(page, ".bo-monthstep button, .bo-monthname")).overlaps.length;
          canary.overlap = `overlaps ${before} -> ${after}`;
          canary.observed_failure = after > before;
          console.log(`    canary (overlap) ${canary.observed_failure ? "CAUGHT" : "MISSED"}: ${canary.overlap}`);
        }
      }
      check(where, "console silent apart from the one refusal asked for",
        consoleNoise.filter((n) => n.startsWith(`${size.w}`) && !/400/.test(n)).length === 0, JSON.stringify(consoleNoise.filter((n) => n.startsWith(`${size.w}`))));
      observed[where] = { calls: [...new Set(sent.map((b) => b.action))], months_asked: asked(sent).length };
      completed++;
      await ctx.close();
    }
  }
} catch (e) {
  failures.push(`crashed: ${e.message}`);
  console.error(e);
} finally {
  if (browser) await browser.close();
}

if (FREEZE) process.exit(failures.length ? 1 : 0);
const status = failures.length === 0 && canary.observed_failure && completed === SIZES.length ? "pass" : "fail";
const { path } = writeReceipt({
  check_id: `office-bills-month${LITE ? "-lite" : ""}`,
  started_at,
  status,
  expected_targets: SIZES.length,
  discovered_targets: Object.keys(observed).length,
  attempted_targets: SIZES.length,
  completed_targets: completed,
  skipped_targets: 0,
  assertions_executed: assertions,
  min_assertions: SIZES.length * 24,
  assertion_floor: "6 widths x 24 questions (switch on this month 5, one press back 5, a past-month bill 3, refused 2, switching closes the form 3, untouched this month and the 12-month limit 6); a missing switch reddens its first question and the rest are not asked, so the total drops below the floor.",
  failures,
  artifacts,
  canary,
  warnings: [
    "Writes nothing: a made-up session and page.route() answers with an in-memory ledger. Asks what the screen sends and shows, not whether the server accepts a bill (costEntry owns that).",
    "The look itself is not judged here; the saved screenshots and the frozen copies in belt/shots/9.12a are the evidence for that.",
    ...(BREAK ? [`run with --break=${BREAK}; this receipt is a sabotage, not a result`] : []),
  ],
  dimensions: { sizes: SIZES.map((s) => `${s.w}x${s.h}`), lite: LITE, months_back: MONTHS_BACK, ...(BREAK && { break: BREAK }), observed },
});
console.log(`\n${status.toUpperCase()} — ${assertions} assertions, ${failures.length} failed, canary ${canary.observed_failure ? "caught" : "MISSED"} → ${path}`);
process.exit(status === "pass" ? 0 : 1);
