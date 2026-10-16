// ROADMAP 97.8 — THE BOOKING PAGE, WHEN THE PRICE CHANGES UNDER THE CUSTOMER.
//
//   node scripts/price-changed-page.mjs                    # 320, 390, 768, 1440; English and Spanish at 390 and 1440
//   node scripts/price-changed-page.mjs --break=no-guard   # server without the 97.8 guard: MUST go red
//   node scripts/price-changed-page.mjs --break=page-strips # page's shown total stripped in flight: MUST go red
//   node scripts/price-changed-page.mjs --break=canary-guarded # the canary walk keeps the guard ON: MUST go red (canary not caught)
//   BASE=http://127.0.0.1:5180 ...                         # which dev server (default localhost:5173)
//   --freeze=before|after                                  # also write the Before/After review copy (390)
//   --env-from=http://localhost:5173                       # job copy with no app/.env.local: borrow the public pair (below)
//
// Dev server + seeded demo, no credentials. NOTHING IS WRITTEN TO THE DATABASE:
// each `create-booking` call the page makes is answered by the REAL handler
// source, run in this process against the fixture's in-memory tables
// (`scripts/lib/bookingConsentFixture.mjs`), with its quote stubbed to the
// page's figure plus $20, the rush fee the entry names: the clock crossed the
// 24-hour cut-off while the customer typed. (Until the 2026-10-16 re-attempt
// this was a browser stand-in that mirrored the guard.) After that moment the quote
// endpoint's answer gets the same +$20 line, because it reads the same clock.
//
// THE PROPERTY, per target: whatever the booking is saved at is the figure the
// page was showing when the customer pressed. The two breaks are the original
// defect from each end (the server not checking, the page not telling it).
import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { writeReceipt } from "./receipt.mjs";
import { answerCreateBooking } from "./lib/bookingConsentFixture.mjs";
import { barMoney, countQuotes, pickDay, quoted, settle, stepNow, toCalendar, advance } from "./lib/bookingWalk.mjs";

const { chromium } = createRequire(import.meta.url)("./../app/node_modules/playwright/index.js");
const BASE = (process.env.BASE || process.env.BASE_URL || "http://localhost:5173").replace(/\/$/, "");
const BREAK = (process.argv.find((a) => a.startsWith("--break=")) || "").slice(8);
const FREEZE = (process.argv.find((a) => a.startsWith("--freeze=")) || "").slice(9);
if (BREAK && !["no-guard", "page-strips", "canary-guarded"].includes(BREAK)) { console.error(`Unknown --break=${BREAK}`); process.exit(2); }
const RUSH = 20;
const ART = BREAK ? `artifacts/price-changed-page-sabotage-${BREAK}/` : "artifacts/price-changed-page/";
mkdirSync(ART, { recursive: true });
const SHOTS = "C:/Users/rando/Downloads/claude/belt/shots/97.8";

const TARGETS = [
  { w: 390, h: 844, lang: "en" }, { w: 1440, h: 900, lang: "en" },
  { w: 768, h: 1024, lang: "en" }, { w: 320, h: 700, lang: "en" },
  { w: 390, h: 844, lang: "es" }, { w: 1440, h: 900, lang: "es" },
];
// THE CANARY, every run: one more walk at 390 against the real handler with
// its guard removed from the source text (the pre-97.8 server). Its findings
// are not this run's pass or fail; the property must call that save wrong, or
// the run is red. --break=canary-guarded leaves the guard ON for that walk,
// which nothing can catch, so it proves the canary is not a constant.
// (Until the 2026-10-16 review this was a constant sum that could not fail.)
const CANARY = { w: 390, h: 844, lang: "en", canary: true };
const canaryCaught = [];
let inCanary = false;
const started_at = new Date().toISOString();
let assertions = 0, passed = 0, completed = 0;
const failures = [], transcript = [];
const check = (label, name, ok, got = "") => {
  if (inCanary) { if (!ok) canaryCaught.push(name); return ok; }
  assertions++;
  const line = `${ok ? "  ok  " : "  FAIL"}  ${label} · ${name}${ok || !got ? "" : ` - got ${got}`}`;
  console.log(line); transcript.push(line);
  if (ok) passed++; else failures.push(`${label} · ${name}${got ? ` - got ${got}` : ""}`);
  return ok;
};

const browser = await chromium.launch();

// --env-from=<url>: A JOB COPY HAS NO app/.env.local (the belt withholds env
// files from worktrees on purpose), so its dev server serves a booking page
// that dies on "Missing VITE_SUPABASE_URL". This borrows the PUBLIC pair every
// visitor's browser already receives — the Supabase origin and the anon key —
// off the first request another dev server's page makes, holds it in memory
// only (never printed, never written), and substitutes it into this server's
// two modules that read it. Each target reads back a signature, so a rewrite
// that did not run is a named failure, not a silent page (gotcha 113).
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

for (const tg of [...TARGETS, CANARY]) {
  inCanary = !!tg.canary;
  const guardOff = BREAK === "no-guard" || (inCanary && BREAK !== "canary-guarded");
  const label = `${tg.w}x${tg.h} ${tg.lang}${inCanary ? " CANARY" : ""}`;
  const ctx = await browser.newContext({ viewport: { width: tg.w, height: tg.h } });
  await injectEnv(ctx);
  await ctx.addInitScript((lang) => { try { localStorage.setItem("dp.lang", lang); } catch {} }, tg.lang);
  const page = await ctx.newPage();
  const consoleBad = [];
  // THE ONE DESIGNED LINE: Chrome logs "Failed to load resource ... 409" for the
  // refusal itself, as it does for any non-2xx fetch. It must stay a 409 (a 200
  // would let a caller read the refusal as a saved booking), so exactly one such
  // line FROM create-booking per refusal sent is expected; anything else is a defect.
  const refusalLines = [];
  page.on("console", (m) => {
    if (!["error", "warning"].includes(m.type())) return;
    if (/status of 409/.test(m.text()) && /functions\/v1\/create-booking/.test(m.location()?.url ?? "")) refusalLines.push(m.text());
    else consoleBad.push(`${m.type()}: ${m.text()}`);
  });
  page.on("pageerror", (e) => consoleBad.push(`pageerror: ${e.message}`));

  const posts = [], saved = [];
  let refusals = 0;
  let serverTotal = null;   // set at the first press: the clock has crossed from here on
  await page.route(/functions\/v1\/calculate-booking/, async (route) => {
    const res = await route.fetch();
    let body; try { body = await res.json(); } catch { return route.fulfill({ response: res }); }
    if (serverTotal != null && body?.quote) {
      body.quote.adjustments = [...(body.quote.adjustments ?? []), { label: "Short notice", amount: RUSH, source: "rule" }];
      body.quote.total = Number(body.quote.total) + RUSH;
    }
    return route.fulfill({ response: res, body: JSON.stringify(body) });
  });
  await page.route(/functions\/v1\/create-booking/, async (route) => {
    const body = route.request().postDataJSON();
    if (BREAK === "page-strips") delete body.shown_total;
    posts.push(body);
    const r = await answerCreateBooking(route, body, { total: serverTotal, guardOff });
    if (r.status === 409 && r.data?.error === "price_changed") refusals++;
    saved.push(...r.saved);
  });

  try {
    countQuotes(page);
    await page.goto(`${BASE}/book/demo-detail`, { waitUntil: "networkidle" });
    await settle(page);
    if (env) check(label, "this server's modules ran with the injected env (signature read back)",
      (await page.evaluate(() => window.__envInjected || 0)) >= 2, String(await page.evaluate(() => window.__envInjected || 0)));
    await toCalendar(page);
    const day = await pickDay(page, "weekday");
    await quoted(page, () => page.locator(".bk-cal .cell:not(.closed):not(.empty)", { hasText: new RegExp(`^${day}$`) }).last().click());
    await page.locator(".bk-slots .bk-chip").first().waitFor({ state: "attached", timeout: 10000 });
    await quoted(page, () => page.locator(".bk-slots .bk-chip").first().click());
    for (let guard = 0; guard < 4 && !(await page.locator('input[autocomplete="name"]').count()); guard++) {
      const at = await stepNow(page); if (!(await advance(page, at.n))) break;
    }
    await page.fill('input[autocomplete="name"]', "Maria Lopez");
    await page.fill('input[autocomplete="tel"]', "(555) 012-3456");
    await page.fill('input[autocomplete="email"]', "maria@example.invalid");
    const at = await stepNow(page);
    const last = await advance(page, at.n);
    check(label, "reached the last step", !!last && last.n === last.of, JSON.stringify(last));

    const shownCents = await barMoney(page);
    serverTotal = shownCents / 100 + RUSH;
    const press = page.locator(".bk-bar button.bk-btn.primary");
    await quoted(page, () => press.click());
    await page.waitForTimeout(400);
    check(label, "the first press told the server the figure on the bar",
      posts.length >= 1 && Math.round(Number(posts[0].shown_total) * 100) === shownCents,
      `${posts[0]?.shown_total} vs bar ${shownCents / 100}`);
    const confirmedEarly = await page.locator(".bk-bar").count() === 0;
    const noticeText = await page.locator(".bk-price-changed").first().innerText().catch(() => "");
    const newMoney = `$${serverTotal.toFixed(2)}`.replace(/\.00$/, "");
    check(label, "the booking was NOT saved at a price the page never showed", !confirmedEarly && saved.length === 0,
      `confirmed at $${serverTotal} after showing $${shownCents / 100}; handler saved ${JSON.stringify(saved)}`);
    check(label, `a notice names the new price (${newMoney})`, noticeText.includes(newMoney), JSON.stringify(noticeText));
    check(label, `the notice is in ${tg.lang === "es" ? "Spanish" : "English"}`,
      (tg.lang === "es" ? /El precio cambió/ : /The price changed/).test(noticeText), JSON.stringify(noticeText));
    if (FREEZE && !inCanary && tg.w === 390 && tg.lang === "en") {
      const { freeze } = await import(pathToFileURL("C:/Users/rando/Downloads/claude/belt/freeze.mjs").href);
      await freeze(page, FREEZE === "before"
        ? { out: `${SHOTS}/before.html`, label: "Before", highlight: ".bk-confirmed, .bk", highlightText: `$${serverTotal}`,
            note: `The page showed $${shownCents / 100}. The clock passed the rush-fee cut-off while the customer typed, and the booking was saved at $${serverTotal} without a word.` }
        : { out: `${SHOTS}/after.html`, label: "After", highlight: ".bk-price-changed",
            note: `Same moment: nothing is saved. The page says the price is now ${newMoney}, the bar shows it, and pressing the button again books at ${newMoney}.` });
    }
    if (!confirmedEarly) {
      const notice = page.locator(".bk-price-changed");
      const box = await notice.boundingBox().catch(() => null);
      const bar = await page.locator(".bk-bar").boundingBox();
      check(label, "the notice is on screen and clear of the price bar",
        !!box && box.y >= 0 && box.y + box.height <= bar.y + 0.5 && box.x >= 0 && box.x + box.width <= tg.w,
        JSON.stringify({ box, barY: bar.y }));
      check(label, "the bar shows the new price", (await barMoney(page)) === Math.round(serverTotal * 100), String(await barMoney(page)));
      await page.screenshot({ path: `${ART}${tg.w}x${tg.h}-${tg.lang}${inCanary ? "-canary" : ""}-notice.png`, animations: "disabled" });
      if (!BREAK && tg.lang === "en" && [390, 768, 1440].includes(tg.w)) {
        mkdirSync(`${SHOTS}/png`, { recursive: true });
        await page.screenshot({ path: `${SHOTS}/png/${tg.w}x${tg.h}-price-changed.png`, animations: "disabled" });
      }
      const shownNow = await barMoney(page);
      await press.click();
      await page.locator(".bk-bar").waitFor({ state: "detached", timeout: 10000 }).catch(() => {});
      const secondPost = posts[1];
      check(label, "pressing again sends the new figure and books", !!secondPost && (await page.locator(".bk-bar").count()) === 0,
        `posts ${posts.length}, shown ${secondPost?.shown_total}`);
      check(label, "the handler saved exactly the figure on the bar when pressed", saved.length === 1 && Math.round(saved[0] * 100) === shownNow, `saved ${JSON.stringify(saved)} vs bar ${shownNow / 100}`);
      check(label, "one booking call per press, no car booked twice", posts.length === 2, String(posts.length));
    }
    await page.screenshot({ path: `${ART}${tg.w}x${tg.h}-${tg.lang}${inCanary ? "-canary" : ""}-end.png`, animations: "disabled" });
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
const canaryObserved = canaryCaught.includes("the booking was NOT saved at a price the page never showed");
const red = failed || completed < TARGETS.length || !canaryObserved;
console.log(`canary (guard off at 390): ${canaryCaught.length ? "caught - " + canaryCaught.join("; ") : "NOT CAUGHT"}`);
console.log(`\n${completed} of ${TARGETS.length} targets walked, ${passed} passed, ${failed} failed${BREAK ? `  (--break=${BREAK}: MUST be red)` : ""}`);
const txt = BREAK ? `receipts/price-changed-page.sabotage-${BREAK}.txt` : "receipts/price-changed-page.txt";
writeFileSync(txt, [`price-changed-page ${new Date().toISOString()} base=${BASE} break=${BREAK || "none"}`, ...transcript,
  `${completed} of ${TARGETS.length} targets, ${passed} passed, ${failed} failed`, ...failures.map((x) => "FAIL " + x)].join("\n") + "\n");
writeReceipt({
  check_id: BREAK ? `price-changed-page-${BREAK}` : "price-changed-page",
  started_at,
  status: red ? "fail" : "pass",
  expected_targets: TARGETS.length, discovered_targets: TARGETS.length, attempted_targets: TARGETS.length,
  completed_targets: completed, skipped_targets: 0,
  assertions_executed: assertions,
  min_assertions: TARGETS.length * (env ? 12 : 11),
  assertion_floor: "11 per target when the refusal is shown (walk, first post, not saved, notice names price, notice language, on-screen, bar, second post, figure, one call each, console), plus 1 env signature with --env-from.",
  canary: { id: "unguarded-server-saves-unshown", observed_failure: canaryObserved, caught: canaryCaught, what: "an extra 390 walk against the real create-booking handler with its guard removed saves at the bar's figure + $20; the walk must name it" },
  failures,
  artifacts: [txt, ART],
  dimensions: { roadmap: "97.8", break: BREAK || null, canary_guard: BREAK === "canary-guarded" ? "on" : "off", base: BASE, env_from: ENV_FROM || null },
  warnings: ["create-booking is the committed handler source run in this process against fake tables, its quote stubbed to the walk's figure; nothing reaches the database, and the deployed function is not this checkout until Andrew publishes.",
    "The rush fee is simulated as +$20 on the server's figure and on later quotes; the demo tenant's own rules are untouched."],
});
process.exit(red ? 1 : 0);
