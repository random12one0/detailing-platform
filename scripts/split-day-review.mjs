// ROADMAP 97.7 — THE REVIEW STEP OF A TWO-CAR, TWO-DAY BOOKING: is the weekend
// rate printed under the car it applies to, and is each car's figure the one
// that car's own booking will be charged?
//
//   BASE=http://127.0.0.1:5180 node scripts/split-day-review.mjs --env-from=http://localhost:5173
//   ... --break=no-car-date   # the page stops sending car 2's own day: MUST go red
//   ... --break=no-lines      # the review step stops printing per-car lines: MUST go red
//   ... --break=prefix        # all three pre-fix layers at once (the Before copy): MUST go red
//   ... --freeze=before|after # also write Andrew's review copy of the 390 walk
//
// NOTHING IS WRITTEN TO THE DATABASE. Two answers are fed in the browser:
//   • the public profile says this business takes two cars (`demo-detail` is a
//     one-car business on purpose), the same feed `price-changed-split.mjs` uses;
//   • every `calculate-booking` call is answered by THIS CHECKOUT'S handler
//     source, run in this process over the real pricing.ts and tz.ts, fed the
//     page's own request body. Its database reads are answered from the page's
//     own public profile (services, add-ons, sizes) plus the demo's price rules
//     as `seed-demo.mjs` writes them. The deployed function is not this
//     checkout until Andrew publishes; that half is `surcharge-visible.mjs`.
//
// WHAT EACH CAR'S FIGURE MUST BE: that car quoted ALONE, on its own day and
// time, through the same handler with no split — which is what its own
// `create-booking` call prices (tests/split-day-surcharge.test.mjs proves the
// handler-to-handler half). So a page showing car 1's day rules on car 2 is red.
//
// CANARY, every run: one more 390 walk whose quote comes from the handler with
// the server half put back (every car on car 1's rules). The walk must call it
// wrong, or the run is red.
import { createRequire } from "node:module";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { stripTypeScriptTypes } from "node:module";
import { writeReceipt } from "./receipt.mjs";
import { barMoney, countQuotes, pickDay, quoted, settle, stepNow, advance } from "./lib/bookingWalk.mjs";

const { chromium } = createRequire(import.meta.url)("./../app/node_modules/playwright/index.js");
const BASE = (process.env.BASE || process.env.BASE_URL || "http://localhost:5173").replace(/\/$/, "");
const BREAK = (process.argv.find((a) => a.startsWith("--break=")) || "").slice(8);
const KNOWN = ["no-car-date", "no-lines", "prefix"];
if (BREAK && !KNOWN.includes(BREAK)) { console.error(`Unknown --break=${BREAK}. Known: ${KNOWN.join(", ")}`); process.exit(2); }
const FREEZE = (process.argv.find((a) => a.startsWith("--freeze=")) || "").slice(9);
const SHOTS = "C:/Users/rando/Downloads/claude/belt/shots/97.7";
const ART = BREAK ? `artifacts/split-day-review-sabotage-${BREAK}/` : "artifacts/split-day-review/";
mkdirSync(ART, { recursive: true });
const started_at = new Date().toISOString();

// Phone first. `order` is which car gets the weekend: "weekday-weekend" is the
// entry's own case (quoted $400, charged $430); "weekend-weekday" its reverse
// ($460 / $430); "same-day" is the control — two cars on ONE Saturday print one
// order-level weekend line and no per-car list, exactly as before.
const TARGETS = [
  { w: 390, h: 844, lang: "en", order: "weekday-weekend" },
  { w: 768, h: 1024, lang: "en", order: "weekday-weekend" },
  { w: 1440, h: 900, lang: "en", order: "weekday-weekend" },
  { w: 320, h: 844, lang: "en", order: "weekday-weekend" },
  { w: 390, h: 844, lang: "es", order: "weekday-weekend" },
  { w: 390, h: 844, lang: "en", order: "weekend-weekday" },
  { w: 390, h: 844, lang: "en", order: "same-day" },
];
const CANARY = { w: 390, h: 844, lang: "en", order: "weekday-weekend", canary: true };

// ── this checkout's calculate-booking, loaded from its source ──────────────
const ts = (path, from, to) => {
  let src = readFileSync(path, "utf8");
  if (from) { const c = src.replace(from, to); if (c === src) throw Error(`sabotage did not land in ${path}`); src = c; }
  return stripTypeScriptTypes(src);
};
const mod = (src) => import("data:text/javascript;base64," + Buffer.from(src).toString("base64"));
const CAR1_RULES = [", adjustments: v.adjustments ?? [] })", " })"];
const pricingFixed = await mod(ts("supabase/functions/_shared/pricing.ts"));
const pricingOld = await mod(ts("supabase/functions/_shared/pricing.ts", ...CAR1_RULES));
const tz = await mod(ts("supabase/functions/_shared/tz.ts"));
// The demo's own price rules, out of the seed's own text rather than retyped.
const PRICE_RULES = new Function(`return ${/price_rules:\s*(\[[\s\S]*?\n\s*\]),/.exec(readFileSync("scripts/seed-demo.mjs", "utf8"))[1]};`)();
const WEEKEND = PRICE_RULES.find((r) => r.kind === "time" && Array.isArray(r.weekdays));
if (!WEEKEND) throw Error("seed-demo.mjs no longer carries a weekday price rule; this check has nothing to look for");

function handlerFor(profile, pricing) {
  const p = Array.isArray(profile) ? profile[0] : profile;
  const byId = (list, ids) => {
    const out = (ids ?? []).map((id) => list.find((x) => x.id === id)).filter(Boolean);
    if (out.length !== (ids ?? []).length) throw Error("invalid_service");
    return out;
  };
  let fn;
  const deps = {
    Deno: { serve(f) { fn = f; } }, supabase: {},
    json: (data, status = 200) => ({ status, data }), preflight: () => ({ status: 204 }),
    businessBySlug: async () => ({ id: "demo", ...p.business }),
    getSettings: async () => ({ ...p.settings, max_vehicles_per_booking: 2, price_rules: PRICE_RULES }),
    resolveServices: async (_db, _b, ids) => byId(p.services, ids),
    resolveAddOns: async (_db, _b, ids) => byId(p.add_ons, ids),
    resolvePromo: async () => null, resolvePlan: async () => null, planInputFor: pricing.planInputFor,
    computeQuote: pricing.computeQuote, matchPriceRules: pricing.matchPriceRules,
    whenContextFor: pricing.whenContextFor, resolveVehicles: pricing.resolveVehicles, resolveTravel: pricing.resolveTravel,
    localDateTimeToInstant: tz.localDateTimeToInstant, weekdayOf: tz.weekdayOf,
    withinLimits: async () => true, ipOf: () => "fixture", LIMITS: { publicCeiling: {} },
    cachedGrid: async () => null, jobAddress: () => null, periodAt: () => null, pointFor: async () => null,
  };
  const src = ts("supabase/functions/calculate-booking/index.ts")
    .replace(/^import\s+(?:"[^"\n]+"|[\s\S]*?\sfrom\s+"[^"\n]+")\s*;\s*$/gm, "");
  new Function(...Object.keys(deps), src)(...Object.values(deps));
  if (!fn) throw Error("calculate-booking handler did not load");
  return async (body) => {
    const r = await fn({ method: "POST", headers: new Headers(), json: async () => body });
    if (r.status !== 200) throw Error(`handler answered ${r.status} ${JSON.stringify(r.data)}`);
    return r.data;
  };
}
// What one car's own booking is priced at: that car alone, on its own day.
const alone = (body, i) => {
  const v = i ? body.extra_vehicles[i - 1] : null;
  return { ...body, split_days: false, extra_vehicles: [],
    vehicle_size: v ? v.size : body.vehicle_size,
    booking_date: v ? v.booking_date : body.booking_date, start_time: v ? v.start_time : body.start_time };
};
const weekdayOf = (d) => new Date(`${d}T12:00:00Z`).getUTCDay();
const cents = (s) => Math.round(Number(String(s).replace(/[^0-9.]/g, "")) * 100);

// ── page-side sabotage: rewrite a served module, and sign it (gotcha 113) ──
const PAGE_EDITS = {
  "no-car-date": [/\/src\/book\/core\.js(\?|$)/, /booking_date:\s*form\.extraVehicles\[i\]\.date\s*\|\|\s*(?:undefined|void 0),?/],
  "no-lines": [/\/src\/book\/steps\/StepReview\.jsx(\?|$)/, /\(v\.adjustments \?\? \[\]\)\.map\(/],
};
const pageEdits = (BREAK === "prefix" ? ["no-car-date", "no-lines"] : PAGE_EDITS[BREAK] ? [BREAK] : []);
const rewrite = (ctx, name) => ctx.route(PAGE_EDITS[name][0], async (route) => {
  const res = await route.fetch();
  const src = await res.text();
  const out = src.replace(PAGE_EDITS[name][1], name === "no-lines" ? "[].map(" : "");
  if (out === src) throw Error(`--break=${name} did not land in ${route.request().url()}`);
  return route.fulfill({ response: res, body: `${out}\n;(window.__breaks = window.__breaks || []).push(${JSON.stringify(name)});\n` });
});

let assertions = 0, passed = 0, completed = 0, inCanary = false;
const failures = [], transcript = [], canaryCaught = [];
const check = (label, name, ok, got = "") => {
  if (inCanary) { if (!ok) canaryCaught.push(name); return ok; }
  assertions++;
  const line = `${ok ? "  ok  " : "  FAIL"}  ${label} · ${name}${ok || !got ? "" : ` - got ${got}`}`;
  console.log(line); transcript.push(line);
  if (ok) passed++; else failures.push(`${label} · ${name}${got ? ` - got ${got}` : ""}`);
  return ok;
};

const browser = await chromium.launch();
// --env-from: the job copy has no app/.env.local. The public pair is read off
// another server's first request, kept in memory only (price-changed-split.mjs).
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
  const label = `${tg.w}x${tg.h} ${tg.lang} ${tg.order}${inCanary ? " CANARY" : ""}`;
  const split = tg.order !== "same-day";
  const ctx = await browser.newContext({ viewport: { width: tg.w, height: tg.h } });
  await injectEnv(ctx);
  for (const e of pageEdits) await rewrite(ctx, e);
  await ctx.addInitScript((lang) => { try { localStorage.setItem("dp.lang", lang); } catch {} }, tg.lang);
  const page = await ctx.newPage();
  const consoleBad = [];
  page.on("console", (m) => {
    if (!["error", "warning"].includes(m.type())) return;
    if (/React Router Future Flag Warning/.test(m.text())) return;
    consoleBad.push(`${m.type()}: ${m.text().slice(0, 160)}`);
  });
  page.on("pageerror", (e) => consoleBad.push(`pageerror: ${e.message.slice(0, 160)}`));

  let handler = null, oneCar = null, lastBody = null, quoteErr = null;
  const serverOld = inCanary || BREAK === "prefix";
  await page.route(/rest\/v1\/rpc\/get_public_business_profile/, async (route) => {
    const res = await route.fetch();
    const body = await res.json();
    const p = Array.isArray(body) ? body[0] : body;
    p.settings.max_vehicles_per_booking = 2;
    handler = handlerFor(body, serverOld ? pricingOld : pricingFixed);
    oneCar = handlerFor(body, pricingFixed);
    return route.fulfill({ response: res, body: JSON.stringify(body) });
  });
  await page.route(/functions\/v1\/calculate-booking/, async (route) => {
    const body = route.request().postDataJSON();
    try {
      const out = await handler(body);
      lastBody = body;
      return route.fulfill({ status: 200, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: JSON.stringify(out) });
    } catch (e) { quoteErr = e.message; return route.fulfill({ status: 500, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: JSON.stringify({ success: false, error: e.message }) }); }
  });

  try {
    countQuotes(page);
    await page.goto(`${BASE}/book/demo-detail`, { waitUntil: "networkidle" });
    await settle(page);
    check(label, "the page ran with the injected env and every intended page edit (signatures read back)",
      (!env || (await page.evaluate(() => window.__envInjected || 0)) >= 1)
        && JSON.stringify((await page.evaluate(() => window.__breaks || [])).sort()) === JSON.stringify([...pageEdits].sort()),
      JSON.stringify(await page.evaluate(() => ({ env: window.__envInjected, breaks: window.__breaks }))));

    let at = await stepNow(page);
    for (let guard = 0; guard < 6 && !(await page.locator(".bk-count").count()) && !(await page.locator(".bk-cal").count()); guard++) {
      at = await advance(page, at.n); if (!at) break;
    }
    if (!(await page.locator(".bk-count").count())) throw new Error("never reached the vehicle count");
    await quoted(page, () => page.locator(".bk-count .bk-chip").nth(1).click());
    await quoted(page, () => page.locator(".bk-count + .bk-field .bk-chip").nth(split ? 1 : 0).click());
    at = await stepNow(page);
    for (let guard = 0; guard < 6 && !(await page.locator(".bk-cal").count()); guard++) {
      at = await advance(page, at.n); if (!at) throw new Error("would not advance to the calendar");
    }

    const kinds = tg.order === "same-day" ? ["weekend"] : tg.order.split("-");
    const legChips = page.locator(".bk-field:has(+ .bk-cal-block) .bk-chip");
    if (split) check(label, "the calendar offers a time for each of two cars", (await legChips.count()) === 2, String(await legChips.count()));
    for (const [leg, kind] of kinds.entries()) {
      if (split) await legChips.nth(leg).click();
      const day = await pickDay(page, kind);
      await quoted(page, () => page.locator(".bk-cal .cell:not(.closed):not(.empty)", { hasText: new RegExp(`^${day}$`) }).last().click());
      await page.locator(".bk-slots .bk-chip").first().waitFor({ state: "attached", timeout: 10000 });
      await quoted(page, () => page.locator(".bk-slots .bk-chip").nth(-1).click());
    }
    for (let guard = 0; guard < 4 && !(await page.locator('input[autocomplete="name"]').count()); guard++) {
      at = await stepNow(page); if (!(await advance(page, at.n))) break;
    }
    await page.fill('input[autocomplete="name"]', "Maria Lopez");
    await page.fill('input[autocomplete="tel"]', "(555) 012-3456");
    await page.fill('input[autocomplete="email"]', "maria@example.invalid");
    at = await stepNow(page);
    const last = await advance(page, at.n);
    await settle(page);
    check(label, "reached the review step", !!last && last.n === last.of, JSON.stringify(last));
    check(label, "every quote was answered by this checkout's handler", !quoteErr && !!lastBody, quoteErr || "no quote request seen");

    const body = lastBody;
    const days = split ? [body.booking_date, body.extra_vehicles?.[0]?.booking_date] : [body.booking_date];
    const wantWeekend = days.map((d) => !!d && WEEKEND.weekdays.includes(weekdayOf(d)));
    if (split) {
      check(label, `car 1 is a ${kinds[0]} and car 2 a ${kinds[1]} (${days.join(", ")})`,
        JSON.stringify(wantWeekend) === JSON.stringify(kinds.map((k) => k === "weekend")), JSON.stringify(days));
      // The expected figures, each car alone on its own day through the fixed handler.
      const want = [];
      for (const i of [0, 1]) {
        const q = (await oneCar(alone({ ...body, extra_vehicles: body.extra_vehicles ?? [{ size: body.vehicle_size }] }, i))).quote;
        want.push({ total: q.total, weekend: q.adjustments.filter((a) => a.label === WEEKEND.label).length });
      }
      if (!body.extra_vehicles?.[0]?.booking_date) {
        // Without car 2's day the expected figure cannot be taken from the request.
        want[1] = { total: null, weekend: wantWeekend[1] ? 1 : 0 };
      }
      const legs = await page.evaluate((weekendLabel) => {
        const card = document.querySelector(".bk-card.selected");
        const rows = card ? [...card.children].filter((d) => d.querySelector(":scope > .bk-row .bk-price")) : [];
        return rows.map((d) => ({
          price: d.querySelector(":scope > .bk-row:not(.bk-muted) .bk-price")?.textContent ?? "",
          lines: [...d.querySelectorAll(":scope > .bk-row.bk-muted")].map((r) => r.textContent),
          weekend: [...d.querySelectorAll(":scope > .bk-row.bk-muted")].filter((r) => r.textContent.includes(weekendLabel)).length,
        }));
      }, tg.lang === "es" ? "" : WEEKEND.label);
      check(label, "the review step lists two cars", legs.length === 2, JSON.stringify(legs));
      check(label, "the car on a weekend shows its weekend line and the weekday car shows none",
        tg.lang === "es"
          ? JSON.stringify(legs.map((l) => l.lines.length > 0)) === JSON.stringify(wantWeekend)
          : JSON.stringify(legs.map((l) => l.weekend)) === JSON.stringify(wantWeekend.map((x) => (x ? 1 : 0))),
        JSON.stringify(legs.map((l) => l.lines)));
      check(label, "each car's figure is what that car's own booking is priced at",
        legs.length === 2 && want[1].total !== null && legs.every((l, i) => cents(l.price) === Math.round(want[i].total * 100)),
        `page ${JSON.stringify(legs.map((l) => l.price))}, own-day ${JSON.stringify(want.map((x) => x.total))}`);
      const bar = await barMoney(page);
      check(label, "the bar is the sum of the two cars", want[1].total !== null && bar === Math.round((want[0].total + want[1].total) * 100),
        `bar ${bar}, own-day ${JSON.stringify(want.map((x) => x.total))}`);
      // The line must be readable where a person is: inside the width, clear of
      // the fixed bar once scrolled to, and the thing a tap there lands on.
      const line = page.locator(".bk-card.selected > div .bk-row.bk-muted").first();
      if (await line.count()) {
        await line.scrollIntoViewIfNeeded();
        await settle(page, 800);
        const r = await line.evaluate((el) => {
          const b = el.getBoundingClientRect(), bar = document.querySelector(".bk-bar")?.getBoundingClientRect();
          const hit = document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2);
          return { x: b.x, right: b.right, top: b.top, bottom: b.bottom, barTop: bar ? bar.top : innerHeight, hit: !!hit && el.contains(hit), vw: innerWidth };
        });
        check(label, "the per-car line is on screen, inside the width and clear of the price bar",
          r.x >= 0 && r.right <= r.vw + 0.5 && r.top >= 0 && r.bottom <= r.barTop + 0.5 && r.hit, JSON.stringify(r));
      } else check(label, "the per-car line is on screen, inside the width and clear of the price bar", false, "no per-car line on the page");
    } else {
      const state = await page.evaluate((weekendLabel) => {
        const card = document.querySelector(".bk-card.selected");
        const rows = card ? [...card.children].filter((d) => d.querySelector(":scope > .bk-row .bk-price")) : [];
        // Leaf text, wherever the price list draws it: the label exactly, once per line.
        const all = [...document.querySelectorAll("body *")].filter((el) => !el.children.length && el.textContent.trim() === weekendLabel);
        return { perCar: rows.length, weekend: all.length };
      }, WEEKEND.label);
      check(label, "control: one day prints no per-car list", state.perCar === 0, JSON.stringify(state));
      check(label, "control: two cars on one Saturday print exactly one weekend line", state.weekend === 1, JSON.stringify(state));
    }

    const stem = `${tg.w}x${tg.h}-${tg.lang}-${tg.order}${inCanary ? "-canary" : ""}`;
    await page.screenshot({ path: `${ART}${stem}.png`, animations: "disabled" });
    if (!inCanary && [390, 768, 1440].includes(tg.w) && tg.lang === "en" && tg.order === "weekday-weekend") {
      mkdirSync(`${SHOTS}/png`, { recursive: true });
      await page.screenshot({ path: `${SHOTS}/png/${tg.w}x${tg.h}-${BREAK || "after"}.png`, animations: "disabled" });
      await page.screenshot({ path: `${SHOTS}/png/${tg.w}x${tg.h}-${BREAK || "after"}-full.png`, fullPage: true, animations: "disabled" });
    }
    if (FREEZE && !inCanary && tg.w === 390 && tg.lang === "en" && tg.order === "weekday-weekend") {
      const { freeze } = await import(pathToFileURL("C:/Users/rando/Downloads/claude/belt/freeze.mjs").href);
      await freeze(page, { out: `${SHOTS}/${FREEZE}.html`, label: FREEZE === "before" ? "Before" : "After",
        highlight: ".bk-card.selected",
        note: FREEZE === "before"
          ? "Two cars: the first on a weekday, the second on a Saturday. The Saturday car is listed at the weekday price with no weekend rate shown, so the total here is $30 less than the two bookings will be charged."
          : "Same booking: the Saturday car now shows its Weekend rate line under it, and its price and the total are what the two bookings will actually be charged." });
    }
    check(label, "console clean", consoleBad.length === 0, consoleBad.slice(0, 3).join(" | "));
    if (!inCanary) completed++;
  } catch (e) {
    check(label, "walk completed", false, e.message.split("\n")[0]);
    await page.screenshot({ path: `${ART}${tg.w}x${tg.h}-${tg.lang}-${tg.order}${inCanary ? "-canary" : ""}-error.png` }).catch(() => {});
  }
  await ctx.close();
}
await browser.close();

const failed = assertions - passed;
const canaryObserved = canaryCaught.includes("each car's figure is what that car's own booking is priced at");
const red = failed || completed < TARGETS.length || !canaryObserved;
console.log(`canary (server on car 1's rules, 390): ${canaryCaught.length ? "caught - " + canaryCaught.join("; ") : "NOT CAUGHT"}`);
console.log(`\n${completed} of ${TARGETS.length} targets walked, ${passed} passed, ${failed} failed${BREAK ? `  (--break=${BREAK}: MUST be red)` : ""}`);
const txt = BREAK ? `receipts/split-day-review.sabotage-${BREAK}.txt` : "receipts/split-day-review.txt";
writeFileSync(txt, [`split-day-review ${new Date().toISOString()} base=${BASE} break=${BREAK || "none"}`, ...transcript,
  `canary: ${canaryCaught.length ? "caught - " + canaryCaught.join("; ") : "NOT CAUGHT"}`,
  `${completed} of ${TARGETS.length} targets, ${passed} passed, ${failed} failed`, ...failures.map((x) => "FAIL " + x)].join("\n") + "\n");
writeReceipt({
  check_id: BREAK ? `split-day-review-${BREAK}` : "split-day-review",
  started_at,
  status: red ? "fail" : "pass",
  expected_targets: TARGETS.length, discovered_targets: TARGETS.length, attempted_targets: TARGETS.length,
  completed_targets: completed, skipped_targets: 0,
  assertions_executed: assertions,
  min_assertions: 6 * 10 + 6,
  assertion_floor: "10 per split target (signatures, two leg chips, review step, handler answered, the days, two cars listed, weekend line on the right car, per-car figures, bar, line on screen, console = 11 with console) and 6 for the same-day control.",
  canary: { id: "server-on-car-1-rules", observed_failure: canaryObserved, caught: canaryCaught,
    what: "an extra 390 walk whose quote comes from the handler with pricing.ts's per-car rules removed (the pre-fix server); the walk must call car 2's figure wrong" },
  failures,
  artifacts: [txt, ART],
  dimensions: { roadmap: "97.7", break: BREAK || null, base: BASE, env_from: ENV_FROM || null },
  warnings: ["calculate-booking is this checkout's handler source run in this process; its reads come from the page's public profile plus seed-demo.mjs's price rules. Nothing reaches the database, and the deployed function is not this checkout until Andrew publishes.",
    "The two-car setting is fed in the browser; demo-detail stays a one-car business."],
});
process.exit(red ? 1 : 0);
