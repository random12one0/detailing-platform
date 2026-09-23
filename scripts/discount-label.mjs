// THE DISCOUNT LINE ON THE REVIEW STEP: DOES THE LABEL AGREE WITH THE FIGURE?
//
//   node scripts/discount-label.mjs                 # the sweep
//   node scripts/discount-label.mjs --headed        # watch it
//   node scripts/discount-label.mjs --break=canary  # sabotage: the canary is real
//   node scripts/discount-label.mjs --break=paint   # sabotage: the pixel test is real
//   node scripts/receipt.mjs receipts/discount-label.json
//
// Dev server on :5173 and the seeded demo business. No credentials.
//
// ---------------------------------------------------------------------------
// **THE QUOTE IS A DECLARED FIXTURE AND THE LIVE DISCOUNT PATH IS NOT
// EXERCISED. READ THIS BEFORE READING A GREEN RUN.**
// ---------------------------------------------------------------------------
// `demo-detail` has **`site_discount_active = false`** — read off
// `business_settings` on 2026-09-22 — so the line this file is about does not
// render on the demo at all. Every target below injects a site discount into
// the quote response on the way past.
//
// **THE NUMBERS IN THAT FIXTURE ARE THE REAL ENGINE'S.** `computeQuote` is
// imported from `supabase/functions/_shared/pricing.ts` — the same module the
// edge function runs — and asked what a tenant with this sale and this
// rounding would be charged. Nothing here re-implements a discount, a
// rounding, or a fold. What is fabricated is the tenant CONFIGURATION, not the
// arithmetic.
//
// **WHY A FIXTURE RATHER THAN SWITCHING THE SALE ON.** Andrew's ruling,
// 2026-09-22: roughly sixty checks sign into these demo tenants, and
// `site_discount_active` is a real setting other things are looking at.
// Flipping it on for the length of a run is *"cheap to do, invisible when you
// forget, and the cost lands on whatever runs next rather than on you. This
// repo has already paid for that once."* The bug lives in the browser's own
// arithmetic, which does not care where the numbers came from.
//
// **SCOPE, PLAINLY: the live path with `site_discount_active = true` on a real
// tenant was NOT exercised by this check, at any width, in any run.** That
// sentence is in the receipt too, under `scope`, so a green run cannot be read
// as covering it.
//
// ---------------------------------------------------------------------------
// THE FAULT
// ---------------------------------------------------------------------------
// `StepReview.jsx` labels the site-discount line `t("{percent}% off")` using
// the detailer's advertised RATE, beside an AMOUNT that is frequently not that
// percentage of anything. Measured against the real engine:
//
//   "10% off"  ·  -$5 of a $65 job   =  7.69%   (demo's own $5 rounding)
//   "10% off"  ·  -$15 of a $140 job = 10.71%
//   "15% off"  ·  -$15 of a $95 job  = 15.79%
//   "10% off"  ·  -$7 of a $65 job   = 10.77%   (with NO rounding setting)
//
// **THE AMOUNT IS THE TRUE NUMBER.** In every case the lines sum exactly to
// the total charged, which is the property roadmap 2.2 exists to hold. So this
// is a LABEL bug and not money: nobody is charged wrongly, they are told a
// rate the figure beside it contradicts.
//
// **AND THERE ARE TWO CAUSES, WHERE THE ROADMAP ENTRY NAMED ONE.** That entry
// says it fires "when the site discount is the line a rounding gap folds
// into". It fires without any rounding setting at all, because the discount
// itself is rounded to whole dollars first: `Math.round(65 * 0.10)` is 7, and
// $7 of $65 is 10.77%. The fold is the second, larger cause, not the only one.
//
// ---------------------------------------------------------------------------
// WHAT IT ASSERTS — six questions per target
// ---------------------------------------------------------------------------
//   line-present  the discount line is on the page with a label and a figure.
//   adds-up       gross minus every discount shown equals the total shown.
//                 The money guard: this must stay true whatever the words do.
//   honest        **the item.** If the rendered label states a percentage,
//                 that percentage of the gross must equal the figure beside it
//                 EXACTLY. If it states none, nothing is claimed and nothing
//                 can be broken.
//   form          the label takes the right shape for the case: the percentage
//                 where it is true, the plain word where it is not. Without
//                 this, deleting every percentage everywhere would pass
//                 `honest` — a check that can be satisfied by saying less is
//                 not measuring honesty, it is measuring silence.
//   visible       the line is inside the window and `elementFromPoint` lands
//                 on it. A bounding rect cannot tell you what is painted.
//   painted       the pixels in the label's own rect are ink, not ground.
//
// ---------------------------------------------------------------------------
// THE CANARY IS A REAL RESIDUAL GAP, WHICH IS WHY IT IS A GOOD ONE
// ---------------------------------------------------------------------------
// A detailer who types **"10% off" as their own sale name** gets it printed
// verbatim through `tx()` — correctly, because those are their words and this
// product does not rewrite a detailer's copy. If their rate and the folded
// figure disagree, the label is wrong again and **this fix does not cover
// it.** The canary injects exactly that tenant, five times, and `honest` must
// catch it every time.
//
// So the canary is not a fabricated defect: it is the boundary of the fix,
// standing where it can be seen. `--break=canary` removes it, the run then
// observes nothing, and `receipt.mjs` rejects the receipt.

import "../tests/_env.mjs";

import { createRequire } from "node:module";
import { mkdirSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { writeReceipt } from "./receipt.mjs";
import { computeQuote } from "../supabase/functions/_shared/pricing.ts";
import {
  advance, barMoney, countQuotes, DELTA_FLOOR, frame, pickDay, quoted,
  settle, stepNow, toCalendar, watchConsole,
} from "./lib/bookingWalk.mjs";

const { chromium } = createRequire(import.meta.url)("./../app/node_modules/playwright/index.js");

const started_at = new Date().toISOString();
const HEADED = process.argv.includes("--headed");
const BREAK = (process.argv.find((a) => a.startsWith("--break=")) || "").split("=")[1] || "";
const BASE = process.env.BASE || "http://localhost:5173";
const SLUG = "demo-detail";

const SIZES = [
  { w: 1920, h: 1080 }, { w: 1440, h: 900 }, { w: 768, h: 1024 },
  { w: 392, h: 844 }, { w: 320, h: 844 },
];

// THE TWO CASES, AND THE SECOND ONE IS THE REASON THE FIRST CANNOT BE FIXED BY
// DELETING THE PERCENTAGE.
//   mismatch  the demo's own $5 rounding. 10% of $65 is $6.50, the engine
//             rounds the discount to $7, the $5 rounding then folds -$2 into
//             the same line, and the customer is shown "10% off  -$5".
//   exact     no rounding, and a rate that lands on a whole dollar: 20%% of
//             the $65 wash is exactly $13. The label SHOULD say "20%% off",
//             because here it is true, and this case is what stops the fix
//             being "delete the percentage".
//             **10%% WAS THE FIRST DRAFT OF THIS CASE AND IT WAS NOT EXACT** —
//             10%% of $65 is $6.50, which the engine rounds to $7 before any
//             rounding setting is involved. A control that is quietly an
//             instance of the fault proves nothing; caught by doing the
//             arithmetic rather than by naming the case "exact".
const CASES = [
  { key: "mismatch", percent: 10, nearest: 5, custom: null, wantPercentInLabel: false },
  { key: "exact", percent: 20, nearest: 0, custom: null, wantPercentInLabel: true },
];
// The canary tenant: their own words, stating a rate, against a folded figure.
const CANARY_CASE = { key: "canary", percent: 10, nearest: 5, custom: "10% off" };
const CANARY_RUNS = 5;

const ART = fileURLToPath(new URL("../artifacts/discount-label/", import.meta.url));

let assertions = 0;
const failures = [];
const artifacts = [];
const consoleNoise = [];
const observed = [];

const check = (target, name, cond, detail = "") => {
  assertions++;
  if (cond) { console.log(`    ok      ${name}`); return true; }
  failures.push(`${target}: ${name} ${detail}`.trim());
  console.error(`    FAIL    ${name}  ${detail}`);
  return false;
};

/** The label under test, made transparent without moving anything. */
const BLANK_CSS = ".bk-receipt .line span:first-child { color: transparent !important; }";

/**
 * Put a site discount into the quote the page receives, with the REAL engine's
 * numbers for a tenant configured this way. See the header: the configuration
 * is the fixture, the arithmetic is not.
 */
const fixture = async (page, { percent, nearest, custom }) => {
  // **THE SALE NAME GOES ON THE QUOTE, AND GETTING THAT WRONG IS WHAT FOUND A
  // SECOND BUG.** The first version of this fixture put it on the PROFILE,
  // because `StepReview.jsx` read `settings.site_discount_label`. The canary
  // then caught nothing, 0 out of 5, while all ten real targets were green —
  // and the cause was not the fixture: `normalizeSettings` in `core.js` never
  // carried that field, so the branch reading it was unreachable and a
  // detailer's own sale name could never appear on the review step at all.
  // The page now reads it off the quote, where the server has always sent it,
  // and this fixture sets it there.
  //
  // **A CANARY THAT WILL NOT FIRE IS EVIDENCE, NOT AN OBSTACLE.** Every other
  // signal in this run said the work was finished.
  await page.route("**/calculate-booking", async (route) => {
    const res = await route.fetch();
    let body;
    try { body = await res.json(); } catch { return route.fulfill({ response: res }); }
    const q = body && body.quote;
    if (!q) return route.fulfill({ response: res });
    // The job as the live server priced it, before any discount.
    const gross = Number(q.subtotal_before_discounts ?? q.subtotal ?? 0);
    if (!gross) return route.fulfill({ response: res });
    // ASK THE ENGINE, DO NOT DO THE SUM HERE. One service priced at the gross
    // reproduces the same `subtotalBase`, so `siteDiscount`, the fold and
    // `total` are all `computeQuote`'s own.
    const model = computeQuote({
      services: [{ id: "fx", name: "fixture", price: gross, duration_minutes: 60 }],
      addOns: [],
      vehicleSize: "small",
      siteDiscountPercent: percent,
      promo: null,
      roundingNearest: nearest,
    });
    q.subtotal_before_discounts = model.subtotalBase;
    q.site_discount = model.siteDiscount;
    q.site_discount_percent = percent;
    q.site_discount_label = custom;
    q.total = model.total;
    return route.fulfill({ response: res, body: JSON.stringify(body) });
  });
};

/**
 * Everything the six questions need, read off the live review step in one pass.
 *
 * **THE DISCOUNT ROW IS THE ONE WITH A MINUS IN FRONT OF THE FIGURE, AND THAT
 * IS NOT A SHORTCUT.** `.line.dim` is also worn by "Vehicle size", by the
 * travel line and by every price-rule surcharge, so a check that took the
 * first dim row would have measured a surcharge and reported cheerfully on the
 * wrong line. The sign is read off the rendered TEXT rather than inferred,
 * because a price rule is allowed to be negative and the page prints its sign.
 */
const READ = () => {
  const parse = (s) => {
    const m = String(s).match(/(-?)\s*\$\s*([\d,]+(?:\.\d{2})?)/);
    if (!m) return null;
    const v = Math.round(parseFloat(m[2].replace(/,/g, "")) * 100);
    return m[1] === "-" ? -v : v;
  };
  const box = document.querySelector(".bk-receipt");
  const rows = [...(box ? box.querySelectorAll(".line") : [])].map((el) => {
    const parts = el.querySelectorAll("span, strong");
    const name = parts[0] || el;
    const figure = parts.length > 1 ? parts[parts.length - 1] : null;
    const r = name.getBoundingClientRect();
    const hit = document.elementFromPoint(
      Math.round(r.left + r.width / 2), Math.round(r.top + r.height / 2));
    return {
      cls: el.className,
      label: name.innerText.trim(),
      raw: figure ? figure.innerText.trim() : "",
      cents: figure ? parse(figure.innerText) : null,
      rect: { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) },
      onTop: !!hit && (hit === name || name.contains(hit)),
      inWindow: r.top >= 0 && r.bottom <= innerHeight,
    };
  });
  return {
    rows,
    viewport: { w: innerWidth, h: innerHeight },
    scrollY: Math.round(window.scrollY),
  };
};

/**
 * The percentage a rendered label CLAIMS, or null if it claims none.
 * Deliberately language-agnostic: it looks for a number next to a per-cent
 * sign, which is what a customer's eye does, in either language.
 */
const claimedPercent = (label) => {
  const m = String(label).match(/(\d+(?:[.,]\d+)?)\s*%/);
  return m ? parseFloat(m[1].replace(",", ".")) : null;
};

// ---------------------------------------------------------------------------
rmSync(ART, { recursive: true, force: true });
mkdirSync(ART, { recursive: true });

async function target(browser, { w, h }, kase, { label, stem, canary }) {
  const ctx = await browser.newContext({
    viewport: { width: w, height: h }, deviceScaleFactor: 1,
  });
  const page = await ctx.newPage();
  countQuotes(page);
  watchConsole(page, label, consoleNoise);

  const out = { rows: [], read: null, spreads: [], discount: null, gross: null, total: null };
  try {
    // **`--break=canary` REMOVES THE DETAILER'S NAME, NOT THE WHOLE FIXTURE,
    // AND THE FIRST VERSION GOT THAT WRONG.** Skipping the fixture left the
    // page with no discount line at all, so every assertion failed and the
    // canary reported "caught" over a target that was not testing anything —
    // a sabotage that proves the check can notice an empty page, which nobody
    // doubted. Removing only the custom label turns the canary target into an
    // ordinary mismatch target, which the fix handles correctly, so the canary
    // observes nothing and `receipt.mjs` must reject the receipt. **That is
    // the sabotage doing its job: it has to fail for the RIGHT reason.**
    await fixture(page, {
      ...kase,
      custom: canary && BREAK === "canary" ? null : kase.custom,
    });

    await page.goto(`${BASE}/book/${SLUG}`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector(".bk-card.selectable", { timeout: 30000 });
    await settle(page);
    if (BREAK === "paint") await page.addStyleTag({ content: BLANK_CSS });

    await toCalendar(page);
    const day = await pickDay(page, "weekday");
    await quoted(page, () => page.locator(".bk-cal .cell", { hasText: new RegExp(`^${day}$`) })
      .last().click());
    await page.locator(".bk-slots .bk-chip").first()
      .waitFor({ state: "attached", timeout: 8000 }).catch(() => {});
    await settle(page, 2200);
    await quoted(page, () => page.locator(".bk-slots .bk-chip").first().click());

    // ── on to the review step ────────────────────────────────────────────
    let at = await stepNow(page);
    for (let guard = 0; guard < 6 && at && at.n < at.of; guard++) {
      if (await page.locator("input[type=tel]").count()) {
        // **THE NAME FIELD IS ADDRESSED AS "the first visible input", AND BOTH
        // HALVES OF THAT ARE LOAD-BEARING.** `input[type=text]` matches
        // exactly one element on this step and it is the SPAM HONEYPOT —
        // `name="website"`, hidden, aria-hidden, tabindex -1 — because the
        // real name field carries no `type` attribute at all and only
        // *reports* type "text". So the obvious selector finds the one input
        // a human must never fill, and `:visible` is what tells them apart.
        await page.locator("input:visible").first().fill("Label Check");
        await page.fill("input[type=tel]", "5625550199");
        await page.fill("input[type=email]", "labelcheck@example.com");
        await settle(page, 600);
      }
      const next = await advance(page, at.n);
      if (!next) break;
      at = next;
    }
    if (!at || at.n !== at.of) throw new Error(`never reached the review step (stopped at ${at && at.n})`);
    await settle(page, 2200);

    out.read = await page.evaluate(READ);
    out.rows = out.read.rows;
    const totalRow = out.rows.find((r) => /\btotal\b/.test(r.cls));
    const priced = out.rows.filter((r) => r !== totalRow && r.cents !== null);
    // The DISCOUNT is the negative row. Everything else priced on this receipt
    // is what the job costs before discounts — which is the same figure the
    // engine calls `subtotalBase`, arrived at from the customer's side of the
    // glass rather than from the response.
    out.discount = priced.find((r) => r.cents < 0) || null;
    out.gross = priced.filter((r) => r.cents > 0).reduce((t, r) => t + r.cents, 0) || null;
    out.total = totalRow ? totalRow.cents : await barMoney(page);

    out.spreads = await frame(page, {
      dir: ART, file: `${stem}.png`,
      rects: out.discount ? [out.discount.rect] : [],
      blankCss: BLANK_CSS, artifacts, prefix: "artifacts/discount-label/",
    });
  } finally {
    await ctx.close();
  }
  return out;
}

const pct = (part, whole) => (whole ? (part / whole) * 100 : 0);

function grade(id, o, kase, sink) {
  const d = o.discount;
  sink(id, "line-present", !!d && !!d.label && d.cents !== null,
    "no discount line with a label and a figure was rendered on the review step");

  // THE MONEY GUARD. Whatever the words say, the figures must still reach the
  // total — roadmap 2.2's property, re-asked here because this item edits the
  // line 2.2's fold lands on.
  const totalRow = o.rows.find((r) => /\btotal\b/.test(r.cls));
  const off = o.rows.filter((r) => r !== totalRow && r.cents !== null && r.cents < 0)
    .reduce((t, r) => t + r.cents, 0);
  sink(id, "adds-up", o.gross !== null && o.total !== null && o.gross + off === o.total,
    `the priced rows come to $${((o.gross ?? 0) / 100).toFixed(2)} with $${(off / 100).toFixed(2)} `
    + `taken off, which is $${(((o.gross ?? 0) + off) / 100).toFixed(2)}, and the total reads `
    + `$${((o.total ?? 0) / 100).toFixed(2)}`);

  const claim = d ? claimedPercent(d.label) : null;
  // **THE ITEM.** A stated percentage has to be true of the figure beside it.
  const shown = d ? Math.abs(d.cents) : null;
  const trueAmount = claim !== null && o.gross ? Math.round(o.gross * claim / 100) : null;
  sink(id, "honest", !!d && (claim === null || trueAmount === shown),
    d ? `the label «${d.label}» claims ${claim}%, which of $${(o.gross / 100).toFixed(2)} would be `
      + `$${((trueAmount ?? 0) / 100).toFixed(2)}, but the figure beside it is `
      + `$${(shown / 100).toFixed(2)} — that is ${pct(shown, o.gross).toFixed(2)}%`
      : "no line to read");

  // WITHOUT THIS, DELETING EVERY PERCENTAGE EVERYWHERE WOULD PASS `honest`.
  sink(id, "form", !!d && (kase.wantPercentInLabel ? claim !== null : claim === null),
    kase.wantPercentInLabel
      ? `this discount IS exactly ${kase.percent}% of the job, so the label should say so, `
        + `and it reads «${d && d.label}»`
      : `this discount is not a whole percentage of the job, so the label should not state `
        + `one, and it reads «${d && d.label}»`);

  sink(id, "visible", !!d && d.inWindow && d.onTop,
    d ? `the label sits at y=${d.rect.y}..${d.rect.y + d.rect.h} in a ${o.read.viewport.h}px `
      + `window (scrolled ${o.read.scrollY}), onTop=${d.onTop}` : "");
  const blank = o.spreads.filter((s) => s.delta < DELTA_FLOOR);
  sink(id, "painted", !!d && o.spreads.length === 1 && blank.length === 0,
    blank.map((s) => `the label's rect covers ${s.px}px and blanking its text changes them by `
      + `${s.delta.toFixed(2)} levels, under the ${DELTA_FLOOR} floor`).join("; "));
}

// ---------------------------------------------------------------------------
const browser = await chromium.launch({ headless: !HEADED });
const expected = SIZES.length * CASES.length + CANARY_RUNS;
let discovered = 0, attempted = 0, completed = 0;
const canary = {
  id: "a-detailer-whose-own-sale-name-states-a-rate",
  observed_failure: false, problems: [], runs: [],
};

for (const size of SIZES) {
  for (const kase of CASES) {
    const label = `${size.w}x${size.h} ${kase.key}`;
    console.log(`  ${label}`);
    discovered++; attempted++;
    const o = await target(browser, size, kase, { label, stem: `${size.w}x${size.h}-${kase.key}` });
    grade(label, o, kase, check);
    const shown = o.discount ? Math.abs(o.discount.cents) : 0;
    observed.push(`${label}: «${o.discount ? o.discount.label : "no line"}» `
      + `-$${(shown / 100).toFixed(2)} of $${((o.gross ?? 0) / 100).toFixed(2)} = `
      + `${pct(shown, o.gross).toFixed(2)}% · total $${((o.total ?? 0) / 100).toFixed(2)}`);
    completed++;
  }
}

console.log(`  canary x${CANARY_RUNS} — a detailer whose own sale name states a rate; it MUST fail`);
for (let run = 1; run <= CANARY_RUNS; run++) {
  discovered++; attempted++;
  const problems = [];
  const o = await target(browser, { w: 392, h: 844 }, CANARY_CASE, {
    label: `canary ${run}`, stem: `canary-${run}`, canary: true,
  });
  grade(`canary ${run}`, o, { ...CANARY_CASE, wantPercentInLabel: true }, (t, name, cond, detail) => {
    assertions++;
    if (cond) return;
    problems.push(`${name} ${detail}`.trim());
  });
  const caught = problems.some((p) => p.startsWith("honest"));
  console.log(`    run ${run}: ${caught ? "caught" : "MISSED"}${caught ? ` — ${problems[0].slice(0, 80)}` : ""}`);
  canary.runs.push({ run, caught, problems });
  canary.problems.push(...problems.map((p) => `run ${run}: ${p}`));
  completed++;
}
const caughtCount = canary.runs.filter((r) => r.caught).length;
// EVERY RUN. A canary caught 4 times in 5 is a coin.
canary.observed_failure = caughtCount === CANARY_RUNS;
canary.caught = `${caughtCount}/${CANARY_RUNS}`;

await browser.close();

console.log("\nWhat the review step actually said:");
for (const o of observed) console.log("  " + o);
if (consoleNoise.length) {
  console.log("\nConsole (the two known React Router v7 warnings are dropped by name):");
  for (const c of consoleNoise) console.log("  " + c);
}

const SCOPE = "THE QUOTE IS A DECLARED FIXTURE. demo-detail has site_discount_active = false, "
  + "so a site-discount line does not render there at all; every target injects one, with "
  + "computeQuote's own numbers for a tenant configured that way. THE LIVE DISCOUNT PATH WITH "
  + "site_discount_active = true ON A REAL TENANT WAS NOT EXERCISED, at any width, in any run.";

const status = failures.length === 0 && canary.observed_failure && consoleNoise.length === 0
  ? "pass" : "fail";
const { path } = writeReceipt({
  check_id: "discount-label",
  started_at,
  status,
  expected_targets: expected,
  discovered_targets: discovered,
  attempted_targets: attempted,
  completed_targets: completed,
  skipped_targets: 0,
  assertions_executed: assertions,
  // 10 targets x 6 + 5 canary runs x 6.
  min_assertions: 90,
  // **DECLARED BECAUSE THE FLOOR EQUALS THE COUNT, WHICH MEANS IT CANNOT BIND.**
  // `receipt.mjs` refuses a receipt that does not say why. Andrew raised this twice
  // before it was fixed: a floor set to exactly what a clean run executes moves with
  // the thing it is measuring, so the comparison can only ever come out true — the
  // same shape as a control that is quietly an instance of the fault.
  assertion_floor:
    "5 widths x 2 cases x 6 questions + 5 canary runs x 6 = 90. The count is fixed by SIZES x CASES x the question list, never by what the run finds: a missing discount line grades as six failures rather than dropping out, so the number cannot fall without a diff. It is a tripwire on the code, not a run-time check.",
  failures: [...failures, ...consoleNoise.map((c) => `console: ${c}`)],
  artifacts,
  warnings: [
    SCOPE,
    ...(BREAK ? [`run with --break=${BREAK}; this receipt is a sabotage, not a result`] : []),
  ],
  dimensions: {
    slug: SLUG,
    scope: SCOPE,
    quote_source: "fixture (computeQuote), not the tenant's own settings",
    sizes: SIZES.map((s) => `${s.w}x${s.h}`),
    cases: CASES.map((c) => `${c.key}: ${c.percent}%, rounding ${c.nearest}`),
    observed,
    delta_floor: DELTA_FLOOR,
    canary_runs: CANARY_RUNS,
    sabotage: BREAK || null,
  },
  canary,
});

console.log(`\n${status.toUpperCase()} — ${completed}/${expected} targets, ${assertions} assertions, `
  + `${failures.length} failure(s), canary ${canary.caught}. Receipt ${path}`);
for (const f of failures) console.log("  · " + f);
process.exit(status === "pass" ? 0 : 1);
