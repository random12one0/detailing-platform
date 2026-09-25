// CAN THE BOOKING PAGE'S STICKY FOOTER COVER THE LAST CHOICE? — ROADMAP 2.15.
//
//   node scripts/bk-bar-clearance.mjs                 # the sweep
//   node scripts/bk-bar-clearance.mjs --headed        # watch it
//   node scripts/bk-bar-clearance.mjs --break=canary  # sabotage: drop the canary
//   node scripts/bk-bar-clearance.mjs --break=rect    # inherited; see below, it
//                                                     # cannot bite on THIS page
//   node scripts/receipt.mjs receipts/bk-bar-clearance.json
//
// Dev server on :5173 and the seeded demo business. **No credentials, no
// bookings written** — the walk stops on the review step and never presses
// the last button — **and nothing is deleted.** In particular it does NOT
// clear `rate_hits` the way `tabbar-clearance.mjs` does; `docs/gotchas.md` #78
// is why. It does spend quotes: `advance()` asks `calculate-booking` for a
// price, and the walk deliberately takes the drop-off branch so no address is
// ever geocoded and the `address%` buckets are never touched.
//
// ---------------------------------------------------------------------------
// 2.15 IS A DIFFERENT FAULT FROM 2.32 AND THE ONE IT SPAWNED, AND THE
// DIFFERENCE IS THE REASON THIS FILE EXISTS RATHER THAN ANOTHER SURFACE IN
// `scroller-clearance.mjs`
// ---------------------------------------------------------------------------
// Measured 2026-09-23, all seven steps, 320 and 1440: **the booking page has
// no inner scroller at all.** `scrollers` comes back empty at every step and
// every width — the page scrolls, never a column, which is this product's
// stated law and is true here. So the mechanism that cost the back office four
// rows (a container clipping the part of a control that hangs past its own
// box) **has nothing to attach to on this page**, and its fix would be a rule
// that can never match.
//
// What 2.15 actually was: `.bk-wrap` RESERVED a literal `104px + safe-b` for a
// bar whose height is content-driven — 73px on step 1, 112px on the review
// step, where a long plan name wraps the eyebrow onto four lines. 112 against
// a 104 reserve is 8px of the last line under the bar at full scroll. **That
// is a RESERVE fault, not a scroll-behaviour fault**, and it was fixed by
// deleting the number: `.bk-bar` is `position: sticky`, so it occupies its own
// height whatever that height turns out to be.
//
// **THE TWO MECHANISMS SIT SIDE BY SIDE ON THIS PAGE AND MUST NOT BE
// RE-MERGED.** `--bk-bar-h` is the bar; `--bk-foot` is spacing; and 8.5a's
// `html:has(.bk > .bk-bar) { scroll-padding-bottom: calc(var(--bk-bar-h) + 12px
// + var(--safe-b)) }` is the scroll behaviour. `booking.css` carries the whole
// history of one name having meant both. **Nothing here changes any of them.**
//
// ---------------------------------------------------------------------------
// WHAT IT ASKS
// ---------------------------------------------------------------------------
//   subjects   the step produced controls to measure. Zero is a failure.
//   legal      the control's own hit area, with nothing over it, reaches 44px.
//   reachable  44 of those rows survive where the browser parks it when it
//              takes focus.
//   bar-clear  **2.15 in its own words**: no control loses a single row to
//              `.bk-bar`. Narrower than `reachable` and named after the bar, so
//              a red says "the footer is covering something" rather than "a
//              control is short", and points at this item rather than another.
//
// **IT MEASURES THE HIT AREA, NEVER THE BOUNDING RECT** — `lib/hitArea.mjs`
// has the argument.
//
// **AND `--break=rect` IS A DECORATION ON THIS SURFACE, WHICH IS SAID HERE
// RATHER THAN LEFT TO LOOK LIKE COVERAGE.** It was RUN: the whole sweep under
// `--break=rect` returns **byte-identical results** — same 36 targets, same
// 168 assertions, same single failure. That is not a broken sabotage, it is
// evidence: **every control on the booking page reads an overhang of 0**, so
// the rect and the hit area are the same measurement here and there is nothing
// for that bug to get wrong. The negative-inset pattern lives in `theme.css`,
// so the rect trap is guarded where it exists — `scroller-clearance.mjs`,
// where `--break=rect` fails 5 targets on purpose. The flag is left working
// because the walk is shared; it is not claimed as a sabotage of this file.
// `receipt.mjs`'s own header on the subject: a canary nobody can break reads
// as a guard and is a decoration.
//
// ---------------------------------------------------------------------------
// THE CANARY IS 2.15's OWN SABOTAGE, MADE PERMANENT
// ---------------------------------------------------------------------------
// When 2.15 was fixed it was broken on purpose by re-creating the old rule on
// the same page in the same second — `position: fixed` plus a 104px reserve —
// and the last line came back **94px behind the bar**. That was a one-off in a
// roadmap entry. Here it is the canary, so the day somebody makes this bar
// `fixed` again, or reintroduces a literal reserve, this run goes red instead
// of a paragraph in a document going stale.
//
// ---------------------------------------------------------------------------
// THE HALF THIS CANNOT ANSWER, STATED SO IT IS NOT MISTAKEN FOR COVERAGE
// ---------------------------------------------------------------------------
// **The on-screen keyboard.** A phone keyboard shrinks the VISUAL viewport and
// leaves the LAYOUT viewport alone, so no window size reproduces it and no
// browser here can raise one. 2.15 is deliberately left open on that half —
// Andrew, 2026-09-20: *"A box ticked on an untestable claim is the same lie as
// a check that prints clean having tested nothing."* **A green from this file
// is not an answer about the keyboard**, and the receipt says so on every run.

import "../tests/_env.mjs";

import { createRequire } from "node:module";
import { mkdirSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { writeReceipt } from "./receipt.mjs";
import {
  advance, countQuotes, pickDay, quoted, settle, stepNow, toCalendar, watchConsole,
} from "./lib/bookingWalk.mjs";
import { ABSOLUTE, MEASURE } from "./lib/hitArea.mjs";

const { chromium } = createRequire(import.meta.url)("./../app/node_modules/playwright/index.js");

const started_at = new Date().toISOString();
const HEADED = process.argv.includes("--headed");
const BREAK = (process.argv.find((a) => a.startsWith("--break=")) || "").split("=")[1] || "";
const BASE = process.env.BASE || "http://localhost:5173";
// THE DEMO BUSINESS BY SLUG, NEVER BY A UUID WRITTEN DOWN HERE.
const SLUG = "demo-detail";

// 320 FIRST — the narrowest supported width, and where 2.15's 112px bar was
// measured against its 104px reserve.
const SIZES = [
  { w: 320, h: 844 }, { w: 392, h: 844 }, { w: 768, h: 1024 },
  { w: 1440, h: 900 }, { w: 1920, h: 1080 },
];

/* ══ THE LONGEST PLAN NAME THE PRODUCT ACTUALLY PERMITS ═══════════════════
   2.15's fault was never a length in the abstract: it was that `.bk-wrap`
   reserved a literal 104px for a bar whose widest line is TEXT A DETAILER
   TYPED. The fix deleted the reserve. **Nothing had ever tested that fix with
   a long string — only with CSS.** The canary forces height with
   `min-height: 180px`, and the seeded demo's longest plan name is
   `Bi-weekly maintenance`, 21 characters. So the 2026-09-20 fix was proved
   against a stylesheet and against the comfortable case, and the case Andrew
   asked about — a tenant whose own words are longer than the demo's — had
   never been run at all.

   **SIXTY IS THE CEILING AND IT IS THE PRODUCT'S OWN.** `Plans.jsx:283`
   carries `maxLength={60}` on the only input that writes `plans.name`, and
   that is the entire enforcement anywhere: `plans.name` is bare `text`, with
   no check constraint and no edge function in the write path, while the same
   repo does bound `vehicle_size` and the payment handles. So 60 is the widest
   string a detailer can reach through the UI, and the database would take
   more — recorded as a finding rather than fixed here, because a constraint
   on live data is a migration and that is Andrew's.

   The string is REAL WORDS at exactly that ceiling, not sixty `x`s: the
   eyebrow wraps on spaces, so a single unbroken token would wrap differently
   from anything a person would ever type and would be a softer test, not a
   harder one. */
const PLAN_60 = "Platinum bi-weekly maintenance and interior protect";  // 50
const LONG_PLAN = (PLAN_60 + "ion plan").slice(0, 60);                  // 60 exactly
const LONGER = Number((process.argv.find((a) => a.startsWith("--plan=")) || "").split("=")[1] || 0);

/* A REAL PRESS, NOT A LOOK — Andrew's done-when says "pressed, not
   inspected". The pointer genuinely travels to the control's centre and the
   browser does its own hit-testing, so anything painted over it wins the
   press exactly as it would for a customer. A capture-phase listener records
   who actually received it and cancels it, so the walk is not navigated by
   the measurement. That is the only part that is not a customer's press, and
   it is the part that has no bearing on who got hit. */
const PRESS = async (page) => page.evaluate(() => {
  const SELP = ".bk-card.selectable, .bk-chip, .bk-btn, .bk-cal .cell, .bk-slots .bk-chip";
  const all = [...document.querySelectorAll(SELP)].filter((e) => !e.closest(".bk-bar"));
  const el = all[all.length - 1];
  if (!el) return { ok: false, why: "no pressable control outside the bar on this step" };
  el.scrollIntoView({ block: "end", inline: "nearest" });
  return new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(() => {
    const r = el.getBoundingClientRect();
    const x = Math.round(r.left + r.width / 2), y = Math.round(r.top + r.height / 2);
    const text = (el.textContent || "").trim().slice(0, 24);
    let got = null;
    const spy = (ev) => { got = ev.target; ev.preventDefault(); ev.stopPropagation(); };
    document.addEventListener("click", spy, true);
    const hit = document.elementFromPoint(x, y);
    if (hit) hit.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, clientX: x, clientY: y }));
    document.removeEventListener("click", spy, true);
    const landed = !!got && (got === el || el.contains(got));
    const who = got ? (got.closest(".bk-bar") ? "bk-bar" : (String(got.className || "").split(" ")[0] || got.tagName)) : "nothing";
    done({ ok: landed, text, who, x, y });
  })));
});

// Every control the customer can press, excluding the bar's own buttons, which
// `lib/hitArea.mjs` drops — a button INSIDE the bar cannot be covered by it.
const SEL = ".bk-card.selectable, .bk-chip, .bk-btn, .bk-cal .cell, .bk-slots .bk-chip";

// SEVEN STEPS, DECLARED RATHER THAN DISCOVERED. If the walk stops early the
// target count falls short of `expected_targets` and `receipt.mjs` refuses the
// run — which is the point: the review step is the one 2.15 was measured on,
// and a sweep that quietly stopped at the calendar would be measuring the easy
// six.
const STEPS = 7;
const ART = fileURLToPath(new URL("../artifacts/bk-bar-clearance/", import.meta.url));

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

// THE CANARY — 2.15's own sabotage, kept. The bar comes out of the flow and
// the old literal reserve comes back, which is exactly the shape that put 8px
// of the review step's last line underneath it.
//
// **THE FIRST VERSION OF THIS CANARY DID NOT BITE, AND THAT IS WORTH KEEPING
// BECAUSE IT IS THE ITEM'S OWN LESSON.** `position: fixed` plus the 104px
// literal, on its own, changed nothing: today's demo bar is **73px at 320 and
// 84px on the review step**, so a 104px reserve is comfortably ENOUGH and the
// old rule passes. 2.15 never failed because the reserve was a literal; it
// failed because the literal was SMALLER THAN THE BAR THAT DAY — 112px, a long
// plan name wrapping the eyebrow onto four lines. A canary that restores the
// mechanism without restoring the condition proves nothing, and it printed
// MISSED until this comment existed. So the bar is forced tall as well, which
// is what 2.15's own sabotage did when it typed a plan name no detailer
// would ("Platinum bi-weekly maintenance…", 198px).
const CANARY_CSS = `
  .bk > .bk-bar { position: fixed !important; left: 0; right: 0; bottom: 0; min-height: 180px; }
  .bk .bk-wrap { padding-bottom: 104px !important; }`;

rmSync(ART, { recursive: true, force: true });
mkdirSync(ART, { recursive: true });

function grade(id, m, sink) {
  const controls = m.controls;
  sink(id, "subjects", controls.length > 0,
    "no controls matched on this step, so the questions below were asked of nothing");

  const illegal = controls.filter((c) => c.legal < ABSOLUTE);
  sink(id, "legal", controls.length > 0 && illegal.length === 0,
    illegal.slice(0, 3).map((c) => `«${c.text}» is ${c.legal}px of hit area with nothing over it `
      + `(box ${c.rectH}px + ${c.overhang}px overhang)`).join("; ")
      + (illegal.length > 3 ? ` … and ${illegal.length - 3} more` : ""));

  const short = controls.filter((c) => c.legal >= ABSOLUTE && c.reachable < ABSOLUTE);
  sink(id, "reachable", controls.length > 0 && short.length === 0,
    short.slice(0, 3).map((c) => `«${c.text}» is legal at ${c.legal}px but only ${c.reachable}px `
      + `survive where the browser parks it (y ${c.top}..${c.bottom}), `
      + `lost to ${JSON.stringify(c.lost)}`).join("; ")
      + (short.length > 3 ? ` … and ${short.length - 3} more` : ""));

  // 2.15 ITSELF. Any row at all taken by the bar, whether or not the control
  // still clears 44px without it.
  const covered = controls.filter((c) => (c.lost || {})["bk-bar"] > 0);
  sink(id, "bar-clear", covered.length === 0,
    covered.slice(0, 3).map((c) => `the footer covers ${c.lost["bk-bar"]}px of «${c.text}» `
      + `(y ${c.top}..${c.bottom}, bar ${m.bar && m.bar.position} h${m.bar && m.bar.height} `
      + `top ${m.bar && m.bar.top}), leaving ${c.reachable}px of ${c.legal}`).join("; ")
      + (covered.length > 3 ? ` … and ${covered.length - 3} more` : ""));

  /* PRESSED, NOT INSPECTED. Every question above reads geometry; this one
     sends a pointer at the last control on the step — the one nearest the
     bar and so the one at risk — and asks who the browser handed it to. A
     control can measure 44 clear pixels and still lose the press to
     something the measurement did not think to look for. */
  sink(id, "pressed", !!(m.press && m.press.ok),
    m.press
      ? `pressing «${m.press.text}» at (${m.press.x}, ${m.press.y}) landed on ${m.press.who}`
      + (m.press.why ? ` — ${m.press.why}` : "")
      : "no press was attempted on this step");
}

/** One width: walk step 1 to the review step, measuring at every step. */
async function sweep(browser, size, { canary, planName, label }) {
  const ctx = await browser.newContext({
    viewport: { width: size.w, height: size.h }, deviceScaleFactor: 1,
  });
  const page = await ctx.newPage();
  countQuotes(page);
  const label0 = label || (canary ? "canary" : `${size.w}x${size.h}`);

  /* THE LONG NAME IS PUT ON THE WIRE, NOT INTO THE DATABASE. `plans.name` is
     a real row on the demo tenant that other checks read, and a sweep that
     edited it would be measuring its own write — with nothing to restore it
     if the walk died halfway, which is how this session already left a
     platform-admin row standing tonight. Rewriting the quote gives the real
     render path the real string and mutates nothing. */
  if (planName) {
    await page.route("**/functions/v1/calculate-booking", async (route) => {
      let res;
      try { res = await route.fetch(); } catch { return route.abort().catch(() => {}); }
      let body;
      try { body = await res.json(); } catch { return route.fulfill({ response: res }); }
      // **`body.quote.plan_name`, NOT `body.plan_name`, AND THE FIRST VERSION
      // OF THIS LINE HAD IT WRONG.** The page does
      // `setQuote({ ...r.quote })`, so the quote is NESTED; setting it at the
      // top level put the string somewhere nothing reads. The sweep then ran
      // five widths x seven steps against the demo's own 21-character name
      // and **printed green over a case it had not tested** - the exact fault
      // this repo is built around, produced by the instrument written to
      // catch it. The tell was in the output and nearly went past: the bar
      // measured h73/h84, byte-identical to the short-name sweep.
      if (body && typeof body.quote === "object" && body.quote) body.quote.plan_name = planName;
      else if (body && typeof body === "object") body.plan_name = planName;
      return route.fulfill({ status: res.status(), contentType: "application/json", body: JSON.stringify(body) });
    });
  }
  watchConsole(page, label0, consoleNoise);
  const seen = [];
  try {
    await page.goto(`${BASE}/book/${SLUG}`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector(".bk-card.selectable", { timeout: 30000 });
    await settle(page, 2500);
    if (canary && BREAK !== "canary") await page.addStyleTag({ content: CANARY_CSS });
    await settle(page, 600);

    const at0 = await stepNow(page);
    if (!at0) throw new Error("no step label on the booking page");

    const take = async (n) => {
      const m = await page.evaluate(MEASURE, { sel: SEL, useRect: BREAK === "rect" });
      m.press = await PRESS(page);
      const file = `${label0}-step${n}.png`;
      await page.screenshot({ path: ART + file, animations: "disabled" });
      artifacts.push("artifacts/bk-bar-clearance/" + file);
      seen.push({ n, m });
      return m;
    };

    await take(at0.n);

    // ── to the calendar, measuring each step on the way ──────────────────
    let at = at0;
    for (let guard = 0; guard < 8 && !(await page.locator(".bk-cal").count()); guard++) {
      const next = await advance(page, at.n);
      if (!next) break;
      at = next;
      await take(at.n);
    }
    if (!(await page.locator(".bk-cal").count())) throw new Error("never reached the calendar");

    // ── a day and a slot, so the walk can carry on past it ───────────────
    const day = await pickDay(page, "weekday");
    await quoted(page, () => page.locator(".bk-cal .cell", { hasText: new RegExp(`^${day}$`) })
      .last().click());
    await page.locator(".bk-slots .bk-chip").first()
      .waitFor({ state: "attached", timeout: 8000 }).catch(() => {});
    await settle(page, 2200);
    await quoted(page, () => page.locator(".bk-slots .bk-chip").first().click());

    // ── on to the review step ────────────────────────────────────────────
    at = await stepNow(page);
    for (let guard = 0; guard < 6 && at && at.n < at.of; guard++) {
      if (await page.locator("input[type=tel]").count()) {
        // The name field carries no `type` and the one `input[type=text]` on
        // this step is the spam honeypot — `discount-label.mjs` has the note.
        await page.locator("input:visible").first().fill("Bar Clearance");
        await page.fill("input[type=tel]", "5625550199");
        await page.fill("input[type=email]", "barclearance@example.com");
        await settle(page, 600);
      }
      const next = await advance(page, at.n);
      if (!next) break;
      at = next;
      await take(at.n);
    }
    if (!at || at.n !== at.of) {
      throw new Error(`never reached the review step (stopped at ${at && at.n} of ${at && at.of})`);
    }
    return seen;
  } finally {
    try { await page.unrouteAll({ behavior: "ignoreErrors" }); } catch { /* closing anyway */ }
    await ctx.close();
  }
}

// ---------------------------------------------------------------------------
const browser = await chromium.launch({ headless: !HEADED });
/* TWO SWEEPS NOW: the demo's own strings, and the longest a detailer can type. */
const PLAN_UNDER_TEST = LONGER
  ? (LONG_PLAN + " and more words".repeat(30)).slice(0, LONGER)
  : LONG_PLAN;
const expected = SIZES.length * STEPS * 2 + 2;
let discovered = 0, attempted = 0, completed = 0;
const canary = { id: "the-pre-2.15-bar-put-back", observed_failure: false, problems: [] };
const canary2 = { id: "the-long-plan-name-against-the-old-reserve", observed_failure: false, problems: [] };

const PASSES = [{ planName: null, tag: "" }, { planName: PLAN_UNDER_TEST, tag: " long-plan" }];

for (const pass of PASSES) {
if (pass.planName) {
  console.log(`\n  THE LONGEST PLAN NAME THE UI PERMITS - ${pass.planName.length} chars`);
  console.log(`  <<${pass.planName}>>`);
}
for (const size of SIZES) {
  const label = `${size.w}x${size.h}${pass.tag}`;
  console.log(`  ${label}`);
  attempted += STEPS;
  let seen = [];
  try {
    seen = await sweep(browser, size, { planName: pass.planName, label });
  } catch (e) {
    // A walk that dies mid-way is NOT a skip. The steps it never reached stay
    // missing from `completed_targets`, so the receipt fails on arithmetic
    // rather than on somebody remembering to look.
    failures.push(`${label}: the walk stopped — ${e.message}`);
    console.error(`    FAIL    walk  ${e.message}`);
  }
  discovered += seen.length;
  for (const { n, m } of seen) {
    const id = `${label} step ${n}`;
    console.log(`  ${id}`);
    grade(id, m, check);
    const worst = m.controls.reduce((a, c) => (c.reachable < a ? c.reachable : a), 999);
    const drops = Object.entries(m.dropped).filter(([, k]) => k).map(([k, v]) => `${v} ${k}`);
    observed.push(`${id}: ${m.controls.length} of ${m.matched} matched control(s)`
      + (m.hidden ? ` (+${m.hidden} not on screen)` : "")
      + (drops.length ? ` (+${drops.join(", ")}, dropped)` : "")
      + `, worst reachable ${worst === 999 ? "n/a" : worst + "px"}`
      + `, bar ${m.bar ? `${m.bar.position} h${m.bar.height} top ${m.bar.top}` : "none"}`
      + `, ${m.scrollers.length} inner scroller(s)`
      + `, press ${m.press && m.press.ok ? "landed" : `LOST to ${m.press && m.press.who}`}`);
    completed++;
  }
}
}

console.log("  canary — the pre-2.15 bar put back; it MUST fail");
attempted += 1;
{
  let seen = [];
  try {
    seen = await sweep(browser, SIZES[0], { canary: true });
  } catch (e) {
    canary.problems.push(`walk ${e.message}`);
  }
  discovered += seen.length ? 1 : 0;
  for (const { n, m } of seen) {
    grade(`canary step ${n}`, m, (t, name, cond, detail) => {
      assertions++;
      if (cond) return;
      canary.problems.push(`${name} ${detail}`.trim());
    });
  }
  // `bar-clear` specifically: the canary's whole job is to put a control under
  // the BAR. A red on `reachable` alone would prove something else broke.
  canary.observed_failure = canary.problems.some((p) => p.startsWith("bar-clear"));
  console.log(`    ${canary.observed_failure ? "caught" : "MISSED"}`
    + `${canary.problems.length ? " — " + canary.problems[0].slice(0, 110) : ""}`);
  completed += seen.length ? 1 : 0;
}

/* CANARY TWO - 2026-09-20's OWN SABOTAGE, DRIVEN BY DATA.
   Canary one restores the pre-2.15 MECHANISM and forces the bar tall with
   `min-height: 180px`. That is a stylesheet doing the work, and this file
   already admits its first version did not bite without it.

   This one supplies the CONDITION the way the product would: the longest plan
   name a detailer can type, against the old reserve. If it bites, the pair
   says something neither says alone - THE STRING IS NOT THE DANGER AND THE
   DELETED RESERVE WAS. The long-name sweep above is green at every width; the
   same string over the old rule is red. That is 2.15's whole argument,
   measured twice from opposite sides. */
console.log("  canary 2 - the longest plan name against the OLD reserve; it MUST fail");
attempted += 1;
{
  let seen = [];
  try {
    seen = await sweep(browser, SIZES[0], { canary: true, planName: PLAN_UNDER_TEST, label: "canary2" });
  } catch (e) {
    canary2.problems.push(`walk ${e.message}`);
  }
  discovered += seen.length ? 1 : 0;
  for (const { n, m } of seen) {
    grade(`canary2 step ${n}`, m, (t, name, cond, detail) => {
      assertions++;
      if (cond) return;
      canary2.problems.push(`${name} ${detail}`.trim());
    });
  }
  canary2.observed_failure = canary2.problems.some((p) => p.startsWith("bar-clear"));
  console.log(`    ${canary2.observed_failure ? "caught" : "MISSED"}`
    + `${canary2.problems.length ? " - " + canary2.problems[0].slice(0, 110) : ""}`);
  completed += seen.length ? 1 : 0;
}

await browser.close();

console.log("\nWhat the steps measured:");
for (const o of observed) console.log("  " + o);
if (consoleNoise.length) {
  console.log("\nConsole (the two known React Router v7 warnings are dropped by name):");
  for (const c of consoleNoise) console.log("  " + c);
}

const status = failures.length === 0 && canary.observed_failure && canary2.observed_failure
  && consoleNoise.length === 0 && completed === expected
  ? "pass" : "fail";
const { path } = writeReceipt({
  check_id: "bk-bar-clearance",
  started_at,
  status,
  expected_targets: expected,
  discovered_targets: discovered,
  attempted_targets: attempted,
  completed_targets: completed,
  skipped_targets: 0,
  assertions_executed: assertions,
  min_assertions: 5 * (SIZES.length * STEPS * 2 + 2),
  assertion_floor:
    "5 questions (subjects, legal, reachable, bar-clear, pressed) x (5 widths x 7 steps x 2 "
    + "sweeps + 2 canary walks) = 360. Fixed by SIZES x STEPS x passes x the question list, "
    + "never by what the run finds: a step with no matching controls grades as five failures "
    + "rather than dropping out, and a walk that stops before the review step leaves targets "
    + "missing so the receipt fails on arithmetic.",
  failures: [...failures, ...consoleNoise.map((c) => `console: ${c}`)],
  artifacts,
  warnings: [
    "Measures the HIT AREA — the bounding rect plus the overhang read off each element's own "
    + "::after — never the rect.",
    `The long-name sweep puts a ${PLAN_UNDER_TEST.length}-character plan name on the wire by `
    + "rewriting the `calculate-booking` response. NOTHING is written to `plans`; the demo "
    + "tenant's own row is untouched and there is nothing to restore if this dies halfway.",
    "`pressed` sends a real pointer at the last control on each step and reads who the browser "
    + "handed the press to. A capture listener cancels it so the walk is not navigated by the "
    + "measurement - that is the only part that differs from a customer's press, and it has no "
    + "bearing on who received it.",
    "60 is the ceiling the UI enforces (`Plans.jsx` `maxLength={60}`) and it is the ONLY "
    + "enforcement: `plans.name` is bare `text` with no check constraint and no edge function in "
    + "the write path, so a direct PostgREST call or an import can exceed it. Recorded, not "
    + "fixed - a constraint on live data is a migration and that is Andrew's.",
    "THIS SAYS NOTHING ABOUT THE ON-SCREEN KEYBOARD, which is the half of 2.15 that is "
    + "deliberately open. A keyboard shrinks the VISUAL viewport and leaves the LAYOUT viewport "
    + "alone, so no viewport size here can reproduce it. A pass is not an answer about it.",
    "It spends quotes through `calculate-booking` and writes nothing. It never geocodes: the "
    + "walk takes the drop-off branch, so the `address%` rate-limit buckets are untouched.",
    ...(BREAK ? [`run with --break=${BREAK}; this receipt is a sabotage, not a result`] : []),
  ],
  dimensions: {
    sizes: SIZES.map((s) => `${s.w}x${s.h}`),
    steps: STEPS,
    absolute: ABSOLUTE,
    observed,
    sabotage: BREAK || null,
    plan_name_under_test: PLAN_UNDER_TEST,
    plan_name_length: PLAN_UNDER_TEST.length,
    plan_name_ceiling: "60, from `maxLength` on the one input that writes `plans.name`; the column "
      + "itself is bare `text` with no constraint, so the database would take more",
    canary2,
  },
  canary,
});

console.log(`\n${status.toUpperCase()} — ${completed}/${expected} targets, ${assertions} assertions, `
  + `${failures.length} failure(s), canaries `
  + `${canary.observed_failure ? "caught" : "MISSED"}/${canary2.observed_failure ? "caught" : "MISSED"}. `
  + `Receipt ${path}`);
for (const f of failures) console.log("  · " + f);
process.exit(status === "pass" ? 0 : 1);
