// THE JOB RECORD'S WEATHER, AND WHAT IT SPENDS TO GET IT.
//
//   node scripts/job-weather-budget.mjs                  # the check
//   node scripts/job-weather-budget.mjs --headed         # watch it
//   node scripts/job-weather-budget.mjs --break=memo     # sabotage: the refusal memo
//   node scripts/job-weather-budget.mjs --break=cache    # sabotage: the point cache
//   node scripts/job-weather-budget.mjs --break=quiet    # sabotage: the paint test
//   node scripts/receipt.mjs receipts/job-weather-budget.json
//
// Dev server on :5173, the seeded demo business, credentials in `.env`.
//
// ---------------------------------------------------------------------------
// WHY THIS EXISTS — the UNNUMBERED Wave 14 item, measured 2026-09-24
// ---------------------------------------------------------------------------
// `lib/jobWeather.js` turns a booking's address into a point by calling
// **`address-suggest`**, which is budgeted as a **TYPING** allowance: 60 an
// hour per IP, a number sized for a customer typing a street badly. A detailer
// working through their own records is not typing anything and spends it
// anyway.
//
// **AND WHEN IT RAN OUT, EVERY FURTHER RECORD SPENT ANOTHER CALL THAT COULD
// NOT SUCCEED.** Measured before the fix, at 1440x900, with the endpoint
// answering 429: ten records opened, then the first one again — **eleven
// refusals for eleven opens, no ceiling**, and **nothing on the screen** to
// say the weather had stopped being rationed rather than broken. The strip
// simply was not there.
//
// So there are two separate questions here and they fail in different ways:
//
//   1. **WHAT DOES IT COST WHEN IT WORKS?** One call per address, ever, and
//      the answer has to survive the detailer opening the next ten records —
//      which on a deep link is a fresh page and a fresh module, so the cache
//      that matters is the one in `localStorage`, not the one in memory.
//   2. **WHAT DOES IT SAY WHEN IT IS REFUSED?** One call, then silence on the
//      wire and a plain sentence on the screen. A refusal clears by itself, so
//      unlike every other failure this feature has there is something true to
//      tell a person.
//
// ---------------------------------------------------------------------------
// WHAT IT COSTS, DECLARED BECAUSE BOTH COSTS ARE REAL
// ---------------------------------------------------------------------------
// **NO GEOAPIFY CREDIT AND NOT ONE HIT AGAINST THE ADDRESS BUDGET.** Every
// request to `address-suggest` is **intercepted in the browser** and answered
// here. That is not a convenience: the thing being measured IS the number of
// requests, so the only honest instrument is one that counts them without
// spending them — and forcing a real 429 would mean burning sixty calls of a
// shared hourly bucket that three other checks read as their evidence
// (`docs/gotchas.md` #78). Nothing here writes `rate_hits` and nothing here
// clears it.
//
// **IT WRITES TEN ROWS AND DELETES THEM.** Ten bookings on `demo-detail`, at
// ten addresses that exist nowhere, removed in a `finally` exactly as
// `zone-mismatch.mjs` and `e2e-booking.mjs` do. `--keep` leaves them. They are
// spaced four hours apart because `bookings_no_overlap` is a real constraint
// and the first draft of this file hit it.
//
// **WHY TEN NEW ROWS RATHER THAN THE SEEDED SIX.** The live lookup only fires
// for a booking that is in the FUTURE, inside the ~6.5-day forecast horizon,
// and has no `weather` column yet — of the six future bookings on the demo
// tenant exactly **one** qualifies. A check built on those would have measured
// a single call and called the budget question answered.
//
// ---------------------------------------------------------------------------
// TWO THINGS THAT WILL MISLEAD YOU IF YOU READ THE RAW NUMBERS
// ---------------------------------------------------------------------------
// **STRICTMODE DOUBLES EVERY EFFECT IN DEV.** `main.jsx` wraps the app in
// `React.StrictMode`, so each record open runs the fetch effect twice. On the
// happy path the second one is served by the cache and costs nothing, which is
// why ten opens still measure ten. **On a path where nothing is cached the
// doubling is visible**, and the pre-fix refused run measured 22 rather than
// 11. Only deltas measured across a single open are compared here, never a
// grand total, and the doubling is recorded rather than divided out.
//
// **SIGNING IN SPENDS CALLS OF ITS OWN.** Landing on `/app` draws a list of
// jobs and resolves their addresses — about eleven on the demo tenant. Those
// are real and they are not this check's subject, so the counter and both
// caches are reset after sign-in and every number below is measured from a
// `/job/<id>` open.
//
// ---------------------------------------------------------------------------
// WHAT IT ASSERTS — 3 budget questions once, 2 paint questions at 5 widths
// ---------------------------------------------------------------------------
//   budget/one-per-address  ten distinct records cost exactly ten calls
//   budget/survives-a-page  reopening the first record costs ZERO
//   budget/refusal-is-kept  after one refusal, nine more records cost ZERO
//   paint/says-so           the sentence is there AND actually painted
//   paint/quiet-when-fine   and it is NOT there when the lookup worked
//
// 3 + 5x2 + 1 canary = **14**, fixed by the question list and never by what
// the run finds.
//
// ---------------------------------------------------------------------------
// THE CANARY RUNS EVERY TIME, AND IT IS THE FAULT ITSELF
// ---------------------------------------------------------------------------
// Two negative controls, both driven from OUTSIDE the product so no source
// file is edited to test it:
//   * **the-unremembered-refusal** — the write to `dp.weather.busy` is blocked
//     with `addInitScript`, which is exactly the pre-fix behaviour, and the
//     refused run must then cost MORE than one call. If it does not, the
//     budget detector is reading something other than the wire.
//   * **the-hidden-sentence** — `.jw-none` is hidden with injected CSS. The
//     node is still in the DOM and `innerText` still reads it, so a check that
//     asked only whether the sentence existed would pass. The paint test must
//     fail. (`docs/gotchas.md`: a present element is not a visible one.)

import { createRequire } from "node:module";
import { mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { REPO, writeReceipt } from "./receipt.mjs";

const { chromium } = createRequire(import.meta.url)("./../app/node_modules/playwright/index.js");

const BASE = process.env.BASE_URL || "http://localhost:5173";
const ART = join(REPO, "artifacts", "job-weather-budget");
const ARGS = process.argv.slice(2);
const HEADED = ARGS.includes("--headed");
const KEEP = ARGS.includes("--keep");
const BREAK = (ARGS.find((a) => a.startsWith("--break=")) || "").split("=")[1] || null;

const OWNER = { email: "demo@detailplatform.com", password: "demo123" };
const U = process.env.SUPABASE_URL;
const K = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!U || !K) {
  console.error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY — run `set -a; . ./.env; set +a` first.");
  console.error("NOTHING WAS MEASURED. This is not a pass.");
  process.exit(2);
}
const H = {
  apikey: K, Authorization: `Bearer ${K}`,
  "Content-Type": "application/json", Prefer: "return=representation",
};

const SIZES = [
  { w: 1920, h: 1080 }, { w: 1440, h: 900 }, { w: 768, h: 1024 },
  { w: 392, h: 844 }, { w: 320, h: 844 },
];
const BUDGET_SIZE = { w: 1440, h: 900 };
const ROWS = 10;

// The word the record is required to print when a lookup is refused. Kept as a
// FRAGMENT rather than the whole sentence: `label-guard.mjs` exists because 45
// controls in this app are addressed by their words, and a check pinned to a
// full sentence is a check a re-wording silently blinds.
const SAYS = "busy";

const started_at = new Date().toISOString();
const failures = [];
const observed = [];
const consoleNoise = [];

rmSync(ART, { recursive: true, force: true });
mkdirSync(ART, { recursive: true });

// ---------------------------------------------------------------------------
// The ten rows.
// ---------------------------------------------------------------------------
const hoursOut = (n) => new Date(Date.now() + n * 3600e3).toISOString();

async function makeBookings(businessId) {
  const rows = Array.from({ length: ROWS }, (_, i) => ({
    business_id: businessId,
    customer_name: `Weather probe ${i + 1}`,
    customer_phone: "5625550000",
    customer_email: "e2e@fixture.test",
    // Addresses that exist nowhere, so a future run against a REAL endpoint
    // could not accidentally resolve one and cache it for ever.
    customer_address: `${(i + 1) * 11} Weather Probe Way, Long Beach, CA`,
    start_at: hoursOut(26 + i * 4),
    end_at: hoursOut(27 + i * 4),
    service_type: "mobile",
    // **`cancelled`, AND IT IS LOAD-BEARING — found by being bitten, 2026-09-24.**
    // `refresh-weather` sweeps every future non-cancelled booking hourly and
    // writes `bookings.weather`. It landed in the middle of a run, pre-filled
    // all ten probe rows, and the record then painted a forecast out of storage
    // without asking anything: the refused scenario measured a **working**
    // weather strip and no sentence, and reported the product broken. The
    // client path does not read `status` at all (`useJobWeather` filters on the
    // date, the address and `weather`), so cancelling puts these rows outside
    // the sweep and changes nothing about what is being measured.
    // **It also stops the sweep spending real Geoapify credits on ten
    // addresses that exist nowhere**, which is what it did before this line.
    status: "cancelled",
    total_price: 100,
    final_amount: 100,
  }));
  const res = await fetch(`${U}/rest/v1/bookings`, {
    method: "POST", headers: H, body: JSON.stringify(rows),
  });
  const made = await res.json();
  if (!Array.isArray(made) || made.length !== ROWS) {
    throw new Error("could not seed the ten probe bookings: " + JSON.stringify(made));
  }
  return made;
}

// ---------------------------------------------------------------------------
// The browser.
// ---------------------------------------------------------------------------
let signedIn = null;

/**
 * READ THE CONSOLE AT EVERY SIZE, AND DROP TWO THINGS BY NAME — never by type.
 * The two React Router v7 future-flag warnings are known, repo-wide and logged
 * in `FOUND.md`; `scripts/lib/bookingWalk.mjs` drops the same two the same way.
 * **And in a REFUSED scenario the browser's bare "status of 429" line is this
 * check's own stub answering** — the 429 is the experiment, so counting it as a
 * defect would make every refused run red for working correctly. It is dropped
 * only where this file asked for a 429, so a 429 anywhere else still lands.
 */
function watchConsole(page, label, refuse) {
  page.on("console", (m) => {
    if (m.type() !== "error" && m.type() !== "warning") return;
    const text = m.text();
    if (/React Router Future Flag Warning/.test(text)) return;
    if (refuse && /status of 429/.test(text)) return;
    consoleNoise.push(`${label}: ${m.type()}: ${text.slice(0, 200)}`);
  });
  page.on("pageerror", (e) => consoleNoise.push(`${label}: pageerror: ${String(e.message).slice(0, 200)}`));
}

/**
 * A context with its own empty storage, its own request counter and its own
 * stubbed endpoint. A FRESH CONTEXT PER SCENARIO IS THE POINT: the caches
 * under test live in `localStorage`, so a scenario that inherited another's
 * storage would be measuring the previous scenario.
 */
async function scenario(browser, { size, refuse, label, blockKey, hideSentence }) {
  const ctx = await browser.newContext({
    viewport: { width: size.w, height: size.h },
    deviceScaleFactor: 1,
    storageState: signedIn || undefined,
  });
  const counter = { calls: 0 };

  if (blockKey || hideSentence) {
    await ctx.addInitScript(({ block, hide }) => {
      if (block) {
        const real = Storage.prototype.setItem;
        Storage.prototype.setItem = function (k, v) {
          if (k === block) return;                       // the pre-fix product
          return real.call(this, k, v);
        };
      }
      if (hide) {
        const put = () => {
          const el = document.createElement("style");
          el.textContent = ".jw-none { display: none !important; }";
          document.head?.appendChild(el);
        };
        if (document.head) put();
        else document.addEventListener("DOMContentLoaded", put);
      }
    }, { block: blockKey || null, hide: !!hideSentence });
  }

  const page = await ctx.newPage();
  watchConsole(page, label, !!refuse);

  await ctx.route("**/functions/v1/address-suggest**", async (route) => {
    counter.calls++;
    if (refuse) {
      await route.fulfill({
        status: 429, contentType: "application/json",
        body: JSON.stringify({ ok: false, reason: "busy", retryable: true }),
      });
      return;
    }
    await route.fulfill({
      status: 200, contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        suggestions: [{ formatted: "Weather Probe Way, Long Beach, CA", lat: 33.7701, lon: -118.1937 }],
      }),
    });
  });

  await page.goto(`${BASE}/app`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("input[type=email], .tabbar", { timeout: 30000 });
  if (await page.locator("input[type=email]").count()) {
    await page.fill("input[type=email]", OWNER.email);
    await page.fill("input[type=password]", OWNER.password);
    await page.click("form button.btn.primary");
    await page.waitForSelector(".tabbar", { timeout: 30000 });
    signedIn = await ctx.storageState();
  }
  await page.evaluate(() => {
    try {
      // The guided tours would sit over the record.
      localStorage.setItem("dp.tours", JSON.stringify(
        ["shell", "today", "calendar", "money", "clients", "business"]));
      localStorage.setItem("dp.tour", "1");
      // SIGN-IN'S OWN LOOKUPS ARE NOT THIS CHECK'S SUBJECT — see the header.
      // Both caches are cleared with the counter, so the first record opened
      // below really is the first time this browser has seen that address.
      localStorage.removeItem("dp.weather.points");
      localStorage.removeItem("dp.weather.busy");
    } catch { /* private mode */ }
  });
  counter.calls = 0;

  return { ctx, page, counter };
}

/** Open one job record by URL — a fresh page load, which is what a deep link
 *  from a notification is and what an in-memory cache cannot survive. */
async function openRecord(page, id) {
  await page.goto(`${BASE}/job/${id}`, { waitUntil: "domcontentloaded" });
  const landed = await page.waitForSelector(".app-main > .jobbar", { timeout: 30000 })
    .then(() => true).catch(() => false);
  await page.waitForTimeout(2200);
  return landed;
}

/**
 * IS THE SENTENCE ACTUALLY ON THE SCREEN? Present, laid out, not transparent,
 * not covered, and the pixel in the middle of it belongs to it. A DOM query
 * alone answers none of those — `--break=quiet` hides the node with CSS and
 * leaves `innerText` reading it perfectly.
 */
const READ_SENTENCE = () => {
  const el = document.querySelector(".jw-none");
  if (!el) return { present: false, painted: false, text: null, strip: !!document.querySelector(".jw-full") };
  const r = el.getBoundingClientRect();
  const laid = r.width > 8 && r.height > 8;
  const shown = typeof el.checkVisibility !== "function"
    || el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true });
  // **THE POINT IS NOT CLAMPED INTO THE VIEWPORT, AND THAT IS THE WHOLE
  // DIFFERENCE BETWEEN THIS AND A CHECK THAT CANNOT FAIL.** An element scrolled
  // off the bottom still has a perfectly good rect; clamping the probe to a
  // visible pixel then asks about whatever happens to be THERE, and an ancestor
  // is always there. So an off-screen midpoint is reported as not painted, and
  // `hit.contains(el)` is deliberately NOT accepted — the card behind the
  // sentence contains it and would have passed for it.
  let owned = false;
  if (laid) {
    const x = r.left + Math.min(r.width / 2, 40);
    const y = r.top + r.height / 2;
    const inside = x >= 0 && y >= 0 && x < window.innerWidth && y < window.innerHeight;
    const hit = inside ? document.elementFromPoint(x, y) : null;
    owned = !!hit && (hit === el || el.contains(hit));
  }
  return {
    present: true,
    painted: laid && shown && owned,
    text: String(el.innerText || "").trim(),
    strip: !!document.querySelector(".jw-full"),
  };
};

// ---------------------------------------------------------------------------
async function run() {
  const biz = (await (await fetch(
    `${U}/rest/v1/businesses?slug=eq.demo-detail&select=id`, { headers: H })).json())[0];
  if (!biz?.id) throw new Error("no demo-detail business — run `node scripts/seed-demo.mjs`");

  const made = await makeBookings(biz.id);
  const ids = made.map((b) => b.id);
  const browser = await chromium.launch({ headless: !HEADED });
  const canaries = { "the-unremembered-refusal": null, "the-hidden-sentence": null };

  try {
    // ── 1. THE BUDGET, ONCE. These are counts on the wire, not layout. ──────
    {
      const { ctx, page, counter } = await scenario(browser, {
        size: BUDGET_SIZE, refuse: false, label: "budget",
        // `--break=cache` throws away the point cache the product writes:
        // reopening a record must then cost a second call.
        blockKey: BREAK === "cache" ? "dp.weather.points"
          : BREAK === "memo" ? "dp.weather.busy" : null,
      });
      const perOpen = [];
      for (const id of ids) {
        const before = counter.calls;
        await openRecord(page, id);
        perOpen.push(counter.calls - before);
      }
      const firstPass = perOpen.reduce((a, b) => a + b, 0);
      const before = counter.calls;
      await openRecord(page, ids[0]);
      const reopen = counter.calls - before;

      observed.push(`budget ${BUDGET_SIZE.w}x${BUDGET_SIZE.h}: ten records cost ${firstPass} calls `
        + `(${perOpen.join(",")}), reopening the first cost ${reopen}`);

      if (firstPass !== ROWS) {
        failures.push(`budget/one-per-address: ten distinct records cost ${firstPass} address-suggest `
          + `calls, expected exactly ${ROWS} (one per address) — per open: ${perOpen.join(",")}`);
      }
      if (reopen !== 0) {
        failures.push(`budget/survives-a-page: reopening a record already looked up cost ${reopen} `
          + `call(s); the point cache has to survive a page load, not just a render`);
      }
      await page.screenshot({ path: join(ART, "budget-record.png") });
      await ctx.close();
    }

    // ── 2. THE REFUSAL, ON THE WIRE. ───────────────────────────────────────
    const refusedCost = async (opts) => {
      const { ctx, page, counter } = await scenario(browser, {
        size: BUDGET_SIZE, refuse: true, label: "refused", ...opts,
      });
      const perOpen = [];
      for (const id of ids) {
        const before = counter.calls;
        await openRecord(page, id);
        perOpen.push(counter.calls - before);
      }
      const before = counter.calls;
      await openRecord(page, ids[0]);
      const reopen = counter.calls - before;
      await ctx.close();
      return {
        perOpen, reopen,
        afterFirst: perOpen.slice(1).reduce((a, b) => a + b, 0) + reopen,
      };
    };

    {
      const r = await refusedCost({ blockKey: BREAK === "memo" ? "dp.weather.busy" : null });
      observed.push(`refused ${BUDGET_SIZE.w}x${BUDGET_SIZE.h}: per open ${r.perOpen.join(",")}, `
        + `reopen ${r.reopen} — ${r.afterFirst} call(s) spent after the first refusal`);
      if (r.afterFirst !== 0) {
        failures.push(`budget/refusal-is-kept: ${r.afterFirst} address-suggest call(s) were spent AFTER `
          + `the lookup had already refused this browser once. A 429 is about the hour, not the address, `
          + `so every one of those was guaranteed to fail `
          + `(per open: ${r.perOpen.join(",")}, reopen ${r.reopen})`);
      }
    }

    // ── 3. THE CANARY ON THAT DETECTOR: the pre-fix product, live. ─────────
    {
      const r = await refusedCost({ blockKey: "dp.weather.busy" });
      const caught = r.afterFirst > 0;
      canaries["the-unremembered-refusal"] = { cost_after_first_refusal: r.afterFirst, caught };
      observed.push(`canary the-unremembered-refusal: with the memo write blocked, `
        + `${r.afterFirst} call(s) after the first refusal — ${caught ? "CAUGHT" : "MISSED"}`);
      if (!caught) {
        failures.push("CANARY MISSED: the-unremembered-refusal — the pre-fix behaviour was reproduced "
          + "and the budget detector reported zero. It is not counting the wire.");
      }
    }

    // ── 4. THE SENTENCE, AT EVERY WIDTH, BOTH WAYS. ────────────────────────
    for (const size of SIZES) {
      const label = `${size.w}x${size.h}`;

      const { ctx, page } = await scenario(browser, {
        size, refuse: true, label: `${label}/refused`,
        blockKey: BREAK === "memo" ? "dp.weather.busy" : null,
        hideSentence: BREAK === "quiet",
      });
      const landed = await openRecord(page, ids[0]);
      const said = await page.evaluate(READ_SENTENCE);
      await page.screenshot({ path: join(ART, `${label}-refused.png`) });
      await ctx.close();

      observed.push(`${label} refused: landed=${landed} present=${said.present} `
        + `painted=${said.painted} strip=${said.strip} text=${JSON.stringify(said.text)}`);

      if (!landed) {
        failures.push(`paint/says-so ${label}: the job record never finished opening`);
      } else if (said.strip) {
        // NOT A PRODUCT FAILURE — AN INVALID MEASUREMENT, SAID OUT LOUD. A
        // forecast on a record whose lookup was refused can only have come
        // from `bookings.weather`, which means something swept these rows
        // while the run was in progress. The answer is not "the sentence is
        // missing"; it is that this width was never asked the question.
        failures.push(`paint/says-so ${label}: NOT MEASURED — the record painted a forecast from `
          + `stored weather, so the refused lookup never happened. Something wrote `
          + `bookings.weather mid-run (refresh-weather sweeps hourly). Re-run; do not read this as a `
          + `finding about the product.`);
      } else if (!said.present) {
        failures.push(`paint/says-so ${label}: the lookup was refused and the record said NOTHING — `
          + `the weather strip is simply absent, which reads as a broken feature rather than a rationed one`);
      } else if (!said.painted) {
        failures.push(`paint/says-so ${label}: the sentence is in the DOM but not painted `
          + `(laid out, opaque and unobstructed all had to hold) — text was ${JSON.stringify(said.text)}`);
      } else if (!said.text.toLowerCase().includes(SAYS)) {
        failures.push(`paint/says-so ${label}: the sentence is painted but does not say what happened — `
          + `${JSON.stringify(said.text)} contains no «${SAYS}»`);
      }

      // AND IT MUST NOT SAY IT WHEN NOTHING IS WRONG. A check that asked only
      // the first half is satisfied by a product that prints the sentence
      // always — which is the column of noise `JobWeather.jsx` refuses.
      const fine = await scenario(browser, { size, refuse: false, label: `${label}/fine` });
      await openRecord(fine.page, ids[0]);
      const quiet = await fine.page.evaluate(READ_SENTENCE);
      await fine.page.screenshot({ path: join(ART, `${label}-fine.png`) });
      await fine.ctx.close();

      observed.push(`${label} working: sentence=${quiet.present} strip=${quiet.strip}`);
      if (quiet.present) {
        failures.push(`paint/quiet-when-fine ${label}: the refused-lookup sentence is on screen `
          + `for a record whose lookup SUCCEEDED (${JSON.stringify(quiet.text)})`);
      }
    }

    // ── 5. THE CANARY ON THE PAINT TEST: the sentence, hidden. ─────────────
    {
      const { ctx, page } = await scenario(browser, {
        size: BUDGET_SIZE, refuse: true, label: "canary/hidden", hideSentence: true,
      });
      await openRecord(page, ids[0]);
      const said = await page.evaluate(READ_SENTENCE);
      await page.screenshot({ path: join(ART, "canary-hidden-sentence.png") });
      await ctx.close();
      const caught = said.present && !said.painted;
      canaries["the-hidden-sentence"] = { present: said.present, painted: said.painted, caught };
      observed.push(`canary the-hidden-sentence: present=${said.present} painted=${said.painted} `
        + `— ${caught ? "CAUGHT" : "MISSED"}`);
      if (!caught) {
        failures.push("CANARY MISSED: the-hidden-sentence — the sentence was hidden with CSS and the "
          + "paint test still called it visible. It is reading the DOM, not the screen.");
      }
    }

    for (const n of consoleNoise) failures.push(`console: ${n}`);
  } finally {
    await browser.close();
    if (!KEEP) {
      const res = await fetch(`${U}/rest/v1/bookings?id=in.(${ids.join(",")})`,
        { method: "DELETE", headers: H });
      if (!res.ok) {
        failures.push(`cleanup: the ten probe bookings were NOT deleted (${res.status}) — `
          + `remove them by hand`);
      }
    } else {
      console.log("--keep: the ten probe bookings were left on demo-detail.");
    }
  }

  const missed = Object.entries(canaries).filter(([, v]) => !v?.caught).map(([k]) => k);
  const assertions = 3 + SIZES.length * 2 + 1;

  const { path, receipt } = writeReceipt({
    check_id: "job-weather-budget",
    started_at,
    status: failures.length ? "fail" : "pass",
    expected_targets: 2 + SIZES.length,       // budget, refused, + one per width
    discovered_targets: 2 + SIZES.length,
    attempted_targets: 2 + SIZES.length,
    completed_targets: 2 + SIZES.length,
    skipped_targets: 0,
    assertions_executed: assertions,
    min_assertions: assertions,
    assertion_floor:
      "3 budget questions (one-per-address, survives-a-page, refusal-is-kept) + 5 widths x 2 paint "
      + "questions (says-so, quiet-when-fine) + 1 canary = 14. Fixed by the question list: a width "
      + "where the record never opens grades as a failure rather than dropping out.",
    failures,
    warnings: [
      "Every address-suggest request is intercepted in the browser and answered here: NO Geoapify "
      + "credit is spent and NOTHING is written to or cleared from `rate_hits`. Counting the requests "
      + "is the measurement, and forcing a real 429 would burn sixty calls of a bucket three other "
      + "checks read as their evidence.",
      "React.StrictMode doubles every effect in dev, so a path where nothing is cached shows twice the "
      + "requests a production build would. Only per-open deltas are compared here, never a total.",
      "Sign-in draws a job list that resolves about eleven addresses of its own. Those are real and are "
      + "not this check's subject; the counter and both caches are reset after sign-in.",
      "It proves the CLIENT stops asking. It says nothing about what the limit should be — a separate "
      + "allowance for the back office would be a change inside an edge function, which is a deploy, "
      + "which is Andrew's.",
    ],
    artifacts: [
      "artifacts/job-weather-budget/budget-record.png",
      ...SIZES.flatMap((s) => [
        `artifacts/job-weather-budget/${s.w}x${s.h}-refused.png`,
        `artifacts/job-weather-budget/${s.w}x${s.h}-fine.png`,
      ]),
      "artifacts/job-weather-budget/canary-hidden-sentence.png",
    ],
    dimensions: {
      sizes: SIZES.map((s) => `${s.w}x${s.h}`),
      budget_size: `${BUDGET_SIZE.w}x${BUDGET_SIZE.h}`,
      records: ROWS,
      observed,
      sabotage: BREAK,
      canaries,
    },
    canary: {
      id: "the-unremembered-refusal",
      observed_failure: missed.length === 0,
      problems: missed,
    },
  });

  for (const line of observed) console.log("  " + line);
  console.log("");
  if (failures.length) {
    console.log(`FAIL  job-weather-budget — ${failures.length} finding(s)`);
    for (const f of failures) console.log("  · " + f);
  } else {
    console.log(`PASS  job-weather-budget — ${receipt.completed_targets} targets, `
      + `${assertions} assertions, both canaries caught`);
  }
  console.log("receipt: " + path.replace(REPO + "\\", "").replace(REPO + "/", ""));
  process.exit(failures.length ? 1 : 0);
}

run().catch((e) => {
  console.error("job-weather-budget could not run: " + e.message);
  console.error("NOTHING WAS MEASURED. This is not a pass.");
  process.exit(2);
});
