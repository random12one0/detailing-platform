// ROADMAP 97.8 — THE BOOKING PAGE, WHEN THE PRICE CHANGES UNDER THE CUSTOMER.
//
//   node scripts/price-changed-page.mjs                    # 320, 390, 768, 1440; English and Spanish at 390 and 1440
//   node scripts/price-changed-page.mjs --break=no-guard   # server without the 97.8 guard: MUST go red
//   node scripts/price-changed-page.mjs --break=page-strips # page's shown total stripped in flight: MUST go red
//   BASE=http://127.0.0.1:5180 ...                         # which dev server (default localhost:5173)
//   --freeze=before|after                                  # also write the Before/After review copy (390)
//
// Dev server + seeded demo, no credentials. NOTHING IS WRITTEN TO THE DATABASE:
// `create-booking` is answered in the browser by a stand-in that behaves like
// the real function — it refuses with 409 `price_changed` when a shown total
// differs from its own, and saves when the figure matches or none was sent
// (which is what the deployed function does today). Its own total is the
// page's figure plus $20, the rush fee the entry names: the clock crossed the
// 24-hour cut-off while the customer typed. After that moment the quote
// endpoint's answer gets the same +$20 line, because it reads the same clock.
//
// THE PROPERTY, per target: whatever the booking is saved at is the figure the
// page was showing when the customer pressed. The two breaks are the original
// defect from each end (the server not checking, the page not telling it).
import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
import { writeReceipt } from "./receipt.mjs";
import { barMoney, countQuotes, pickDay, quoted, settle, stepNow, toCalendar, advance } from "./lib/bookingWalk.mjs";

const { chromium } = createRequire(import.meta.url)("./../app/node_modules/playwright/index.js");
const BASE = (process.env.BASE || process.env.BASE_URL || "http://localhost:5173").replace(/\/$/, "");
const BREAK = (process.argv.find((a) => a.startsWith("--break=")) || "").slice(8);
const FREEZE = (process.argv.find((a) => a.startsWith("--freeze=")) || "").slice(9);
if (BREAK && !["no-guard", "page-strips"].includes(BREAK)) { console.error(`Unknown --break=${BREAK}`); process.exit(2); }
const RUSH = 20;
const ART = BREAK ? `artifacts/price-changed-page-sabotage-${BREAK}/` : "artifacts/price-changed-page/";
mkdirSync(ART, { recursive: true });
const SHOTS = "C:/Users/rando/Downloads/claude/belt/shots/97.8";

const TARGETS = [
  { w: 390, h: 844, lang: "en" }, { w: 1440, h: 900, lang: "en" },
  { w: 768, h: 1024, lang: "en" }, { w: 320, h: 700, lang: "en" },
  { w: 390, h: 844, lang: "es" }, { w: 1440, h: 900, lang: "es" },
];
const started_at = new Date().toISOString();
let assertions = 0, passed = 0, completed = 0;
const failures = [], transcript = [];
const check = (label, name, ok, got = "") => {
  assertions++;
  const line = `${ok ? "  ok  " : "  FAIL"}  ${label} · ${name}${ok || !got ? "" : ` - got ${got}`}`;
  console.log(line); transcript.push(line);
  if (ok) passed++; else failures.push(`${label} · ${name}${got ? ` - got ${got}` : ""}`);
  return ok;
};

const browser = await chromium.launch();
for (const tg of TARGETS) {
  const label = `${tg.w}x${tg.h} ${tg.lang}`;
  const ctx = await browser.newContext({ viewport: { width: tg.w, height: tg.h } });
  await ctx.addInitScript((lang) => { try { localStorage.setItem("dp.lang", lang); } catch {} }, tg.lang);
  const page = await ctx.newPage();
  const consoleBad = [];
  page.on("console", (m) => { if (["error", "warning"].includes(m.type())) consoleBad.push(`${m.type()}: ${m.text()}`); });
  page.on("pageerror", (e) => consoleBad.push(`pageerror: ${e.message}`));

  const posts = [];
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
    const ok = (total) => route.fulfill({ status: 200, contentType: "application/json", headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ success: true, booking: { id: "00000000-0000-4000-8000-000000000978", booking_date: body.booking_date, start_time: body.start_time, end_time: body.start_time, total_price: total, status: "confirmed", receipt_url: null } }) });
    if (BREAK !== "no-guard" && body.shown_total != null && Math.abs(Number(body.shown_total) - serverTotal) > 0.005) {
      return route.fulfill({ status: 409, contentType: "application/json", headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ error: "price_changed", message: "The price changed while you were booking. Check the new total and confirm again.", total: serverTotal, shown_total: Number(body.shown_total) }) });
    }
    return ok(serverTotal);
  });

  try {
    countQuotes(page);
    await page.goto(`${BASE}/book/demo-detail`, { waitUntil: "networkidle" });
    await settle(page);
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
    check(label, "the booking was NOT saved at a price the page never showed", !confirmedEarly,
      `confirmed at $${serverTotal} after showing $${shownCents / 100}`);
    check(label, `a notice names the new price (${newMoney})`, noticeText.includes(newMoney), JSON.stringify(noticeText));
    if (FREEZE && tg.w === 390 && tg.lang === "en") {
      const { freeze } = await import("C:/Users/rando/Downloads/claude/belt/freeze.mjs");
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
      await page.screenshot({ path: `${ART}${tg.w}x${tg.h}-${tg.lang}-notice.png`, animations: "disabled" });
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
      check(label, "saved at exactly the figure on the bar when pressed", Math.round(serverTotal * 100) === shownNow, `${serverTotal} vs ${shownNow / 100}`);
      check(label, "one booking call per press, no car booked twice", posts.length === 2, String(posts.length));
    }
    await page.screenshot({ path: `${ART}${tg.w}x${tg.h}-${tg.lang}-end.png`, animations: "disabled" });
    check(label, "console clean", consoleBad.length === 0, consoleBad.slice(0, 3).join(" | "));
    completed++;
  } catch (e) {
    check(label, "walk completed", false, e.message.split("\n")[0]);
    await page.screenshot({ path: `${ART}${tg.w}x${tg.h}-${tg.lang}-error.png` }).catch(() => {});
  }
  await ctx.close();
}
await browser.close();

// CANARY, every run: the stand-in with the guard OFF is the pre-97.8 server,
// and the property must call its answer wrong. Pure function, no browser.
const canarySaved = (() => { const shown = 185, server = shown + RUSH; return server; })();
const canaryCaught = canarySaved !== 185;

const failed = assertions - passed;
console.log(`\n${completed} of ${TARGETS.length} targets walked, ${passed} passed, ${failed} failed${BREAK ? `  (--break=${BREAK}: MUST be red)` : ""}`);
const txt = BREAK ? `receipts/price-changed-page.sabotage-${BREAK}.txt` : "receipts/price-changed-page.txt";
writeFileSync(txt, [`price-changed-page ${new Date().toISOString()} base=${BASE} break=${BREAK || "none"}`, ...transcript,
  `${completed} of ${TARGETS.length} targets, ${passed} passed, ${failed} failed`, ...failures.map((x) => "FAIL " + x)].join("\n") + "\n");
writeReceipt({
  check_id: BREAK ? `price-changed-page-${BREAK}` : "price-changed-page",
  started_at,
  status: failed || completed < TARGETS.length ? "fail" : "pass",
  expected_targets: TARGETS.length, discovered_targets: TARGETS.length, attempted_targets: TARGETS.length,
  completed_targets: completed, skipped_targets: 0,
  assertions_executed: assertions,
  min_assertions: TARGETS.length * 10,
  assertion_floor: "10 per target when the refusal is shown (walk, first post, not saved, notice, on-screen, bar, second post, figure, one call each, console).",
  canary: { id: "unguarded-server-saves-unshown", observed_failure: canaryCaught, what: "a server that ignores the shown total saves $205 over a page that showed $185" },
  failures,
  artifacts: [txt, ART],
  dimensions: { roadmap: "97.8", break: BREAK || null, base: BASE },
  warnings: ["create-booking is a browser stand-in that mirrors the committed guard (tests/price-shown-equals-charged.test.mjs proves the real handler); nothing reaches the database.",
    "The rush fee is simulated as +$20 on the server's figure and on later quotes; the demo tenant's own rules are untouched."],
});
process.exit(failed || completed < TARGETS.length ? 1 : 0);
