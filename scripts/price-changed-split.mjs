// ROADMAP 97.8 — THE SAME GUARD ON A TWO-CAR, DIFFERENT-DAYS BOOKING.
//
//   node scripts/price-changed-split.mjs --env-from=http://localhost:5173
//   node scripts/price-changed-split.mjs --break=no-guard     # server ignores the figure: MUST go red
//   node scripts/price-changed-split.mjs --break=page-strips  # page's figure stripped in flight: MUST go red
//   node scripts/price-changed-split.mjs --break=canary-guarded # the canary walk keeps the guard ON: MUST go red (canary not caught)
//   BASE=http://127.0.0.1:5180 ...                            # which dev server
//
// A split booking is one `create-booking` call per car, each priced as that car
// alone, so each call carries that car's own `per_vehicle` figure. This walks
// the case `price-changed-page.mjs` does not: car 1's figure matches and is
// booked, car 2's day turned out $20 dearer, and the page must say car 1 is
// booked and name car 2's new price — never save car 2 at a figure it did not
// show. The entry left this sentence unwalked; this is the walk.
//
// NOTHING IS WRITTEN TO THE DATABASE, and the demo tenant is untouched. Two
// answers are fed in the browser: the public profile says this business takes
// two cars (`demo-detail` is a one-car business on purpose, seed-demo.mjs), and
// the quote gains the two legs the real engine returns for a split booking
// (each car priced at the one-car figure). Each `create-booking` call is
// answered by the REAL handler source, run in this process against the
// fixture's in-memory tables (`scripts/lib/bookingConsentFixture.mjs`), its
// quote stubbed to that car's figure (car 2 + $20). Until the 2026-10-16
// re-attempt this was a browser stand-in that mirrored the guard.
import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { writeReceipt } from "./receipt.mjs";
import { answerCreateBooking } from "./lib/bookingConsentFixture.mjs";
import { barMoney, countQuotes, pickDay, quoted, settle, stepNow, advance } from "./lib/bookingWalk.mjs";

const { chromium } = createRequire(import.meta.url)("./../app/node_modules/playwright/index.js");
const BASE = (process.env.BASE || process.env.BASE_URL || "http://localhost:5173").replace(/\/$/, "");
const BREAK = (process.argv.find((a) => a.startsWith("--break=")) || "").slice(8);
if (BREAK && !["no-guard", "page-strips", "canary-guarded"].includes(BREAK)) { console.error(`Unknown --break=${BREAK}`); process.exit(2); }
const RUSH = 20;
// --freeze=before|after: also write Andrew's review copy of the 390 English walk.
const FREEZE = (process.argv.find((a) => a.startsWith("--freeze=")) || "").slice(9);
const SHOTS = "C:/Users/rando/Downloads/claude/belt/shots/97.8";
const ART = BREAK ? `artifacts/price-changed-split-sabotage-${BREAK}/` : "artifacts/price-changed-split/";
mkdirSync(ART, { recursive: true });

const TARGETS = [
  { w: 390, h: 844, lang: "en" }, { w: 1440, h: 900, lang: "en" },
  { w: 768, h: 1024, lang: "en" }, { w: 390, h: 844, lang: "es" },
];
// THE CANARY, every run: one more walk at 390 against the real handler with
// its guard removed from the source text (the pre-97.8 server). Its findings
// are not this run's pass or fail; the property must call car 2's save wrong,
// or the run is red. --break=canary-guarded leaves the guard ON for that walk,
// which nothing can catch, so it proves the canary is not a constant.
const CANARY = { w: 390, h: 844, lang: "en", canary: true };
let canaryCaught = [];
const started_at = new Date().toISOString();
let assertions = 0, passed = 0, completed = 0;
const failures = [], transcript = [];
let inCanary = false;
const check = (label, name, ok, got = "") => {
  if (inCanary) { if (!ok) canaryCaught.push(name); return ok; }
  assertions++;
  const line = `${ok ? "  ok  " : "  FAIL"}  ${label} · ${name}${ok || !got ? "" : ` - got ${got}`}`;
  console.log(line); transcript.push(line);
  if (ok) passed++; else failures.push(`${label} · ${name}${got ? ` - got ${got}` : ""}`);
  return ok;
};

const browser = await chromium.launch();

// --env-from: the job copy has no app/.env.local. Same borrowing as
// price-changed-page.mjs: the public pair off another server's first request,
// memory only, and a signature read back per target (gotcha 113).
const ENV_FROM = (process.argv.find((a) => a.startsWith("--env-from=")) || "").slice(11).replace(/\/$/, "");
let env = null;
if (ENV_FROM) {
  const p = await browser.newPage();
  const req = p.waitForRequest((r) => /\.supabase\.co\//.test(r.url()) && !!r.headers().apikey, { timeout: 20000 });
  await p.goto(`${ENV_FROM}/book/demo-detail`).catch(() => {});
  const r = await req;
  env = { url: new URL(r.url()).origin, key: r.headers().apikey };
  await p.close();
}
const injectEnv = (ctx) => env && ctx.route(/\/src\/lib\/(api|supabase)\.js(\?|$)/, async (route) => {
  const res = await route.fetch();
  const src = (await res.text())
    .replaceAll("import.meta.env.VITE_SUPABASE_URL", JSON.stringify(env.url))
    .replaceAll("import.meta.env.VITE_SUPABASE_ANON_KEY", JSON.stringify(env.key));
  return route.fulfill({ response: res, body: `${src}\n;window.__envInjected = (window.__envInjected || 0) + 1;\n` });
});

// The settings object is the one carrying `vehicle_sizes`, wherever it sits.
const twoCars = (o) => {
  if (!o || typeof o !== "object") return false;
  if (Array.isArray(o.vehicle_sizes)) { o.max_vehicles_per_booking = 2; return true; }
  return Object.values(o).some(twoCars);
};

for (const tg of [...TARGETS, CANARY]) {
  inCanary = !!tg.canary;
  const guardOff = BREAK === "no-guard" || (inCanary && BREAK !== "canary-guarded");
  const label = `${tg.w}x${tg.h} ${tg.lang} split${inCanary ? " CANARY" : ""}`;
  const ctx = await browser.newContext({ viewport: { width: tg.w, height: tg.h } });
  await injectEnv(ctx);
  await ctx.addInitScript((lang) => { try { localStorage.setItem("dp.lang", lang); } catch {} }, tg.lang);
  const page = await ctx.newPage();
  const consoleBad = [], refusalLines = [];
  page.on("console", (m) => {
    if (!["error", "warning"].includes(m.type())) return;
    if (/status of 409/.test(m.text()) && /functions\/v1\/create-booking/.test(m.location()?.url ?? "")) refusalLines.push(m.text());
    else consoleBad.push(`${m.type()}: ${m.text()}`);
  });
  page.on("pageerror", (e) => consoleBad.push(`pageerror: ${e.message}`));

  let profilePatched = false, legsFed = 0, legTotal = null, refusals = 0;
  const posts = [], savedUnshown = [];
  await page.route(/rest\/v1\/rpc\/get_public_business_profile/, async (route) => {
    const res = await route.fetch();
    const body = await res.json();
    profilePatched = twoCars(body) || profilePatched;
    return route.fulfill({ response: res, body: JSON.stringify(body) });
  });
  await page.route(/functions\/v1\/calculate-booking/, async (route) => {
    const sent = route.request().postDataJSON();
    const res = await route.fetch();
    let body; try { body = await res.json(); } catch { return route.fulfill({ response: res }); }
    const q = body?.quote;
    if (q && sent?.split_days === true && (sent.extra_vehicles ?? []).length === 1) {
      const one = Number(q.total);
      q.per_vehicle = [0, 1].map(() => ({ total: one, durationMinutes: q.total_duration }));
      q.total = one * 2;
      legTotal = one; legsFed++;
    }
    return route.fulfill({ response: res, body: JSON.stringify(body) });
  });
  await page.route(/functions\/v1\/create-booking/, async (route) => {
    const body = route.request().postDataJSON();
    if (BREAK === "page-strips") delete body.shown_total;
    posts.push(body);
    // Car 1 is priced as shown; car 2's own day carries the $20 the quote missed.
    const serverTotal = legTotal + (posts.length >= 2 ? RUSH : 0);
    const car = posts.length;
    const r = await answerCreateBooking(route, body, { total: serverTotal, guardOff });
    if (r.status === 409 && r.data?.error === "price_changed") refusals++;
    for (const t of r.saved) if (Math.abs(t - legTotal) > 0.005) savedUnshown.push(`car ${car} saved at $${t}, page showed $${legTotal}`);
  });

  try {
    countQuotes(page);
    await page.goto(`${BASE}/book/demo-detail`, { waitUntil: "networkidle" });
    await settle(page);
    if (env) check(label, "this server's modules ran with the injected env (signature read back)",
      (await page.evaluate(() => window.__envInjected || 0)) >= 2, String(await page.evaluate(() => window.__envInjected || 0)));
    check(label, "the profile was fed as a two-car business", profilePatched);

    // To the vehicle step, two cars, different days, then on to the calendar.
    let at = await stepNow(page);
    for (let guard = 0; guard < 6 && !(await page.locator(".bk-count").count()) && !(await page.locator(".bk-cal").count()); guard++) {
      at = await advance(page, at.n); if (!at) break;
    }
    if (!(await page.locator(".bk-count").count())) throw new Error("never reached the vehicle count");
    await quoted(page, () => page.locator(".bk-count .bk-chip").nth(1).click());
    await quoted(page, () => page.locator(".bk-count + .bk-field .bk-chip").nth(1).click());
    at = await stepNow(page);
    for (let guard = 0; guard < 6 && !(await page.locator(".bk-cal").count()); guard++) {
      at = await advance(page, at.n); if (!at) throw new Error("would not advance to the calendar");
    }

    // A day and a time for each car, by the leg chips.
    const legChips = page.locator(".bk-field:has(+ .bk-cal-block) .bk-chip");
    check(label, "the calendar offers a time for each of two cars", (await legChips.count()) === 2, String(await legChips.count()));
    for (const leg of [0, 1]) {
      await legChips.nth(leg).click();
      const day = await pickDay(page, "weekday");
      await quoted(page, () => page.locator(".bk-cal .cell:not(.closed):not(.empty)", { hasText: new RegExp(`^${day}$`) }).last().click());
      await page.locator(".bk-slots .bk-chip").first().waitFor({ state: "attached", timeout: 10000 });
      await quoted(page, () => page.locator(".bk-slots .bk-chip").nth(leg ? -1 : 0).click());
    }
    for (let guard = 0; guard < 4 && !(await page.locator('input[autocomplete="name"]').count()); guard++) {
      at = await stepNow(page); if (!(await advance(page, at.n))) break;
    }
    await page.fill('input[autocomplete="name"]', "Maria Lopez");
    await page.fill('input[autocomplete="tel"]', "(555) 012-3456");
    await page.fill('input[autocomplete="email"]', "maria@example.invalid");
    at = await stepNow(page);
    const last = await advance(page, at.n);
    check(label, "reached the last step", !!last && last.n === last.of, JSON.stringify(last));
    check(label, "the quote came back as two cars, priced separately", legsFed > 0 && legTotal > 0, `${legsFed} legs fed, $${legTotal}`);
    check(label, "the bar shows both cars", (await barMoney(page)) === Math.round(legTotal * 200), `${await barMoney(page)} vs ${legTotal * 2}`);

    await page.locator(".bk-bar button.bk-btn.primary").click();
    await page.waitForFunction(() => document.querySelector(".bk-error") || !document.querySelector(".bk-bar"), null, { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(400);

    check(label, "one call per car, each carrying that car's own figure",
      posts.length === 2 && posts.every((p) => Math.round(Number(p.shown_total) * 100) === Math.round(legTotal * 100)),
      posts.map((p) => p.shown_total).join(", "));
    check(label, "car 2 was NOT saved at a price the page never showed", savedUnshown.length === 0, savedUnshown.join("; "));
    const err = page.locator(".bk-error").last();
    const errText = await err.innerText().catch(() => "");
    const newMoney = `$${(legTotal + RUSH).toFixed(2)}`.replace(/\.00$/, "");
    check(label, `the page says car 1 is booked and names car 2's new price (${newMoney})`,
      errText.includes(newMoney) && /\b2\b/.test(errText), JSON.stringify(errText));
    check(label, `the sentence is in ${tg.lang === "es" ? "Spanish" : "English"}`,
      (tg.lang === "es" ? /Tu primer carro está reservado/ : /Your first car is booked/).test(errText), JSON.stringify(errText));
    if (errText) {
      const box = await err.boundingBox();
      const bar = await page.locator(".bk-bar").boundingBox().catch(() => null);
      check(label, "the sentence is on screen and clear of the price bar",
        !!box && !!bar && box.y >= 0 && box.y + box.height <= bar.y + 0.5 && box.x >= 0 && box.x + box.width <= tg.w,
        JSON.stringify({ box, barY: bar?.y }));
    }
    await page.screenshot({ path: `${ART}${tg.w}x${tg.h}-${tg.lang}${inCanary ? "-canary" : ""}-split.png`, animations: "disabled" });
    if (FREEZE && !inCanary && tg.w === 390 && tg.lang === "en") {
      mkdirSync(`${SHOTS}/png`, { recursive: true });
      await page.screenshot({ path: `${SHOTS}/png/390x844-split-${FREEZE}.png`, animations: "disabled" });
      const { freeze } = await import(pathToFileURL("C:/Users/rando/Downloads/claude/belt/freeze.mjs").href);
      await freeze(page, { out: `${SHOTS}/${FREEZE}-split.html`, label: FREEZE === "before" ? "Before" : "After", highlight: ".bk-error",
        note: FREEZE === "before"
          ? "Two cars on different days; car 2's price went up $20. The sentence saying car 1 is booked and car 2 is not stays below the price bar on a phone, where nobody sees it."
          : "Same moment: the page scrolls to the sentence, so a phone shows that car 1 is booked and car 2 was not, with car 2's new price." });
    }
    check(label, "console clean: nothing but one designed 409 line per refusal",
      consoleBad.length === 0 && refusalLines.length === refusals,
      [...consoleBad, `${refusalLines.length} refusal line(s) for ${refusals} refusal(s)`].slice(0, 4).join(" | "));
    if (!inCanary) completed++;
  } catch (e) {
    check(label, "walk completed", false, e.message.split("\n")[0]);
    await page.screenshot({ path: `${ART}${tg.w}x${tg.h}-${tg.lang}${inCanary ? "-canary" : ""}-error.png` }).catch(() => {});
  }
  await ctx.close();
}
await browser.close();

const failed = assertions - passed;
const canaryObserved = canaryCaught.includes("car 2 was NOT saved at a price the page never showed");
const red = failed || completed < TARGETS.length || !canaryObserved;
const perTarget = 11 + (env ? 1 : 0);
console.log(`canary (guard off at 390): ${canaryCaught.length ? "caught - " + canaryCaught.join("; ") : "NOT CAUGHT"}`);
console.log(`\n${completed} of ${TARGETS.length} targets walked, ${passed} passed, ${failed} failed${BREAK ? `  (--break=${BREAK}: MUST be red)` : ""}`);
const txt = BREAK ? `receipts/price-changed-split.sabotage-${BREAK}.txt` : "receipts/price-changed-split.txt";
writeFileSync(txt, [`price-changed-split ${new Date().toISOString()} base=${BASE} break=${BREAK || "none"}`, ...transcript,
  `${completed} of ${TARGETS.length} targets, ${passed} passed, ${failed} failed`, ...failures.map((x) => "FAIL " + x)].join("\n") + "\n");
writeReceipt({
  check_id: BREAK ? `price-changed-split-${BREAK}` : "price-changed-split",
  started_at,
  status: red ? "fail" : "pass",
  expected_targets: TARGETS.length, discovered_targets: TARGETS.length, attempted_targets: TARGETS.length,
  completed_targets: completed, skipped_targets: 0,
  assertions_executed: assertions,
  min_assertions: TARGETS.length * perTarget,
  assertion_floor: "11 per target (profile fed, two leg chips, last step, two legs quoted, bar, per-car figures, car 2 not saved unshown, sentence names price, language, on screen, console) plus 1 env signature with --env-from.",
  // The canary is the real handler with its guard removed: car 2 saved at $20 over its shown figure must land in savedUnshown.
  canary: { id: "unguarded-car-2-saved-unshown", observed_failure: canaryObserved, caught: canaryCaught, what: "an extra 390 walk against the real create-booking handler with its guard removed saves car 2 at shown + $20; the walk must name it" },
  failures,
  artifacts: [txt, ART],
  dimensions: { roadmap: "97.8", break: BREAK || null, canary_guard: BREAK === "canary-guarded" ? "on" : "off", base: BASE, env_from: ENV_FROM || null },
  warnings: ["create-booking is the committed handler source run in this process against fake tables, its quote stubbed per car; nothing reaches the database, and the deployed function is not this checkout until Andrew publishes.",
    "The two-car setting and the per-car quote legs are fed in the browser; demo-detail stays a one-car business."],
});
process.exit(red ? 1 : 0);
