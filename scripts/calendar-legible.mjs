// CAN THE MONTH BE READ AT A GLANCE? — ROADMAP 9.4.
//
//   node scripts/calendar-legible.mjs                 # the sweep
//   node scripts/calendar-legible.mjs --headed        # watch it
//   node scripts/calendar-legible.mjs --break=detach  # sabotage: measure off-screen
//   node scripts/calendar-legible.mjs --break=canary  # sabotage: drop the canary
//   node scripts/receipt.mjs receipts/calendar-legible.json
//
// Dev server on :5173 and the seeded demo business. **Nothing written, nothing
// deleted, no public booking endpoint touched** (`docs/shared-resources.md`
// § 1), so it is safe beside a session working on the live site.
//
// ---------------------------------------------------------------------------
// THE ONE THAT MATTERS: IT FAILS ON THE MARGIN, NOT ON THE OVERFLOW
// ---------------------------------------------------------------------------
// 9.4 replaced the weekday initials with three-letter names, and at 320 the
// column is **36.3px** — `.cal-cell`'s own note explains why 44 is
// arithmetically unreachable for a seven-column month and is not this item's
// to reopen. The question is whether three letters fit.
//
// **THEY FIT WITH 14px TO SPARE, AND THE FIRST ANSWER SAID 1.5 — A TEN-FOLD
// ERROR IN THE DIRECTION OF PANIC.** The original measurement said `"Wed"`
// needed **34.5px** of a 36.3px column, which was reported upward as *a coin
// balanced on its edge*. Measured in situ it needs **22.3px**: the tightest
// margin is **14px** in English and **14.3px** in Spanish, at every width.
//
// **THE WRONG NUMBER CAME FROM A DETACHED PROBE**, a hidden span wearing the
// element's `font` shorthand — and `font` does **not** carry
// `font-variation-settings`, which this header uses (`"wdth" var(--wdth-lab),
// "wght" 620`). The real label is drawn in a CONDENSED face; the probe measured
// the normal one. **`--break=detach` is that bug on purpose and reproduces the
// original figure to the decimal** — *«Wed» needs 34.5px … 1.8px clear* —
// which is how the story above is known rather than argued.
//
// **THE MARGIN IS STILL WHAT IS ASSERTED, AND THAT DOES NOT CHANGE BECAUSE THE
// NUMBER TURNED OUT COMFORTABLE.** A font change, a locale change or one longer
// string is eaten in silence by an overflow test, because **by the time it
// overflows a person has already seen it.** So this fails on `MIN_MARGIN`, not
// on the absence of clipping.
//
// ---------------------------------------------------------------------------
// BOTH LANGUAGES, EVERY TIME
// ---------------------------------------------------------------------------
// English `short` is `Sun Mon Tue Wed Thu Fri Sat`; Spanish is `dom lun mar
// mié jue vie sáb`. **A check that only ever asks English would have had
// nothing to say** about the language whose strings are longer and whose
// accents change the rendered width. The locale is set in `localStorage`
// (`dp.lang.app`) before the page loads, which is the same door the product's
// own picker uses.
//
// ---------------------------------------------------------------------------
// WHAT IT ASKS, PER WIDTH PER LANGUAGE
// ---------------------------------------------------------------------------
//   subjects     the month rendered: seven head labels and at least 28 days.
//   weekday-fit  every label fits its column with MIN_MARGIN to spare, and
//                nothing is clipped. Measured in situ.
//   weekday-distinct  the seven labels are seven different strings. **This is
//                the fault 9.4 names** — `S M T W T F S` has two S and two T,
//                and a single-letter header passes every other check here.
//   grid-rect    the grid is a whole number of weeks. The audit blamed the
//                FIRST partial week; the blanks that were missing were the
//                trailing ones, so the bottom row stopped short.
//   legend-covers  every status the month actually contains has a row in the
//                legend. **This is the half that was live at a desk**: the
//                legend was trimmed on the premise that the cells write those
//                words themselves, and they do not — a cell reads
//                `"24 | 10:00 AMSam D."` and status is colour alone.
//
// ---------------------------------------------------------------------------
// TWO SABOTAGES
// ---------------------------------------------------------------------------
// `--break=detach` measures the labels with a detached probe instead of in
// situ. `--break=canary` drops the canary, so nothing is observed and
// `receipt.mjs` refuses the receipt.

import "../tests/_env.mjs";

import { createRequire } from "node:module";
import { mkdirSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { writeReceipt } from "./receipt.mjs";
import { settle, watchConsole } from "./lib/bookingWalk.mjs";
import { appEs } from "../app/src/lib/strings/appEs.js";
import { demoOwner } from "./lib/demoOwner.mjs";

const { chromium } = createRequire(import.meta.url)("./../app/node_modules/playwright/index.js");

const started_at = new Date().toISOString();
const HEADED = process.argv.includes("--headed");
const BREAK = (process.argv.find((a) => a.startsWith("--break=")) || "").split("=")[1] || "";
const BASE = process.env.BASE || "http://localhost:5173";
const OWNER = demoOwner();

// 320 FIRST — it is the only width where the margin is in question at all.
const SIZES = [
  { w: 320, h: 844 }, { w: 392, h: 844 }, { w: 768, h: 1024 },
  { w: 1440, h: 900 }, { w: 1920, h: 1080 },
];
const LANGS = ["en", "es"];

// **THE NUMBER THIS CHECK IS ABOUT.** 3px of clear space around the widest
// label. The real worst case is 14px, so this is not a floor the product is
// pressed against today — it is the point at which something has eaten four
// fifths of the header's room and nobody has noticed. **Deliberately not set
// just under 14**, which would redden on the first ordinary type tweak and
// teach the next session to lower it. Raising it is a decision about how much
// room the header keeps; lowering it to make a run go green is the rubber
// stamp `receipt.mjs`'s header warns about.
const MIN_MARGIN = 3;
const ART = fileURLToPath(new URL("../artifacts/calendar-legible/", import.meta.url));

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

const MEASURE = ({ detach }) => {
  const head = document.querySelector(".cal-head");
  const grid = document.querySelector(".cal-grid");
  if (!head || !grid) return null;
  const spans = [...head.querySelectorAll("span")];

  // **IN SITU: the label's own box, and the text inside it.** `scrollWidth`
  // is what the text actually needs; `clientWidth` is what the column gives
  // it. No second element, no copied font, nothing to get wrong.
  //
  // `detach` is the bug: a probe wearing the `font` shorthand, which does NOT
  // carry `font-variation-settings`, so it measures a different typeface.
  let probe = null;
  if (detach) {
    probe = document.createElement("span");
    const cs = getComputedStyle(spans[0]);
    probe.style.cssText = "position:absolute;visibility:hidden;white-space:nowrap;"
      + `font:${cs.font};letter-spacing:${cs.letterSpacing}`;
    document.body.appendChild(probe);
  }
  const labels = spans.map((s) => {
    const col = s.getBoundingClientRect().width;
    let need;
    if (detach) { probe.textContent = s.textContent; need = probe.getBoundingClientRect().width; }
    else {
      // The span is a grid track, so it is as wide as the column whatever the
      // text does; the text's own width is the range of its own content.
      const r = document.createRange();
      r.selectNodeContents(s);
      need = r.getBoundingClientRect().width;
    }
    return { text: (s.textContent || "").trim(), col: Math.round(col * 10) / 10,
      need: Math.round(need * 10) / 10, margin: Math.round((col - need) * 10) / 10 };
  });
  if (probe) probe.remove();

  const kids = [...grid.children];
  const cells = kids.filter((k) => k.tagName === "BUTTON");
  const legend = [...document.querySelectorAll(".cal-legend span.quiet")]
    .map((s) => (s.textContent || "").trim());
  // Which statuses the month actually contains, read off the cells' own
  // classes rather than from any list this file keeps.
  const present = new Set();
  for (const c of cells) {
    for (const el of c.querySelectorAll(".jobs > span, .dot")) {
      for (const k of ["confirmed", "completed", "no_show"]) {
        if (el.classList.contains(k)) present.add(k);
      }
    }
    if (c.querySelector(".dot.block")) present.add("blocked");
  }
  return {
    labels, cells: cells.length, total: kids.length, legend,
    present: [...present],
    lang: document.documentElement.lang || null,
  };
};

// STATUS -> the word the legend uses for it. The ENGLISH is written here
// because the page is the thing under test; the SPANISH is **imported from the
// product's own catalogue** rather than typed out.
//
// **THE FIRST VERSION TYPED IT OUT AND GOT IT WRONG** — «Reservada», «Hecha» —
// against a catalogue that says «Agendado» and «Terminados». It failed, which
// is the right direction to be wrong in, but a check carrying its own second
// copy of a translation is the `label-guard.mjs` fault: two spellings of one
// fact, and the check's copy is the one nobody renames.
const SAID_EN = { confirmed: "Booked", completed: "Done", no_show: "No show", blocked: "Blocked" };
const said = (lang, key) => {
  const en = SAID_EN[key];
  return lang === "es" ? (appEs[en] ?? en) : en;
};

rmSync(ART, { recursive: true, force: true });
mkdirSync(ART, { recursive: true });

let signedIn = null;

async function sweep(browser, size, lang, { canary }) {
  const ctx = await browser.newContext({
    viewport: { width: size.w, height: size.h }, deviceScaleFactor: 1,
    storageState: signedIn || undefined,
  });
  const page = await ctx.newPage();
  const label = canary ? "canary" : `${size.w}x${size.h} ${lang}`;
  watchConsole(page, label, consoleNoise);
  try {
    await page.goto(`${BASE}/app`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("input[type=email], .tabbar", { timeout: 30000 });
    if (await page.locator("input[type=email]").count()) {
      await page.fill("input[type=email]", OWNER.email);
      await page.fill("input[type=password]", OWNER.password);
      await page.click("form button.btn.primary");
      await page.waitForSelector(".tabbar", { timeout: 30000 });
      signedIn = await ctx.storageState();
    }
    await page.evaluate(([l, breakCanary]) => {
      try {
        localStorage.setItem("dp.tours", JSON.stringify(
          ["shell", "today", "calendar", "money", "clients", "business"]));
        localStorage.setItem("dp.tour", "1");
        // **A PLAIN STRING, NOT JSON — and the first version wrote JSON.**
        // `localeStore.js` does `localStorage.setItem(key, v)` with the bare
        // locale, so `"\"es\""` is not a locale it recognises: the run fell
        // back to English and measured English twice while printing `es` in
        // every line. A check that silently tests the same thing twice is the
        // quietest way to have no coverage at all.
        localStorage.setItem("dp.lang.app", l);
      } catch { /* private mode */ }
    }, [lang, false]);
    await page.goto(BASE + "/app/calendar", { waitUntil: "domcontentloaded" });
    await page.waitForSelector(".cal-grid", { timeout: 30000 });
    await settle(page, 2500);
    // THE CANARY: put the single letters back, exactly as they were before
    // 9.4. Nothing else changes, so a run that does not notice has stopped
    // asking the question this item is about.
    if (canary && BREAK !== "canary") {
      await page.evaluate(() => {
        const n = ["S", "M", "T", "W", "T", "F", "S"];
        document.querySelectorAll(".cal-head span").forEach((s, i) => { s.textContent = n[i]; });
      });
      await settle(page, 400);
    }
    const m = await page.evaluate(MEASURE, { detach: BREAK === "detach" });
    const file = `${label.replace(/[^\w.-]+/g, "-")}.png`;
    await page.screenshot({ path: ART + file, animations: "disabled" });
    artifacts.push("artifacts/calendar-legible/" + file);
    return m;
  } finally {
    await ctx.close();
  }
}

function grade(id, m, lang, sink) {
  sink(id, "subjects", !!m && m.labels.length === 7 && m.cells >= 28,
    m ? `${m.labels.length} head label(s) and ${m.cells} day cell(s)` : "no calendar on the page");
  if (!m) {
    for (const q of ["weekday-fit", "weekday-distinct", "grid-rect", "legend-covers"]) {
      sink(id, q, false, "no calendar");
    }
    return;
  }

  const tight = m.labels.filter((l) => l.margin < MIN_MARGIN);
  sink(id, "weekday-fit", tight.length === 0,
    tight.map((l) => `«${l.text}» needs ${l.need}px in a ${l.col}px column — `
      + `${l.margin}px clear, floor is ${MIN_MARGIN}`).join("; "));

  const distinct = new Set(m.labels.map((l) => l.text));
  sink(id, "weekday-distinct", distinct.size === 7,
    `the seven columns carry ${distinct.size} different label(s): `
    + `[${m.labels.map((l) => l.text).join(" ")}] — this is 9.4's own fault`);

  sink(id, "grid-rect", m.total % 7 === 0,
    `${m.total} cells is ${m.total % 7} short of a whole number of weeks, so the last row `
    + "stops early and the bottom edge is ragged");

  const want = m.present.map((k) => said(lang, k)).filter(Boolean);
  const missing = want.filter((w) => !m.legend.includes(w));
  sink(id, "legend-covers", missing.length === 0,
    `the month contains ${JSON.stringify(m.present)} but the legend reads `
    + `${JSON.stringify(m.legend)} — unexplained: ${missing.join(", ")}`);
}

// ---------------------------------------------------------------------------
const browser = await chromium.launch({ headless: !HEADED });
const expected = SIZES.length * LANGS.length + 1;
let discovered = 0, attempted = 0, completed = 0;
const canary = { id: "the-single-letter-header-put-back", observed_failure: false, problems: [] };

for (const size of SIZES) {
  for (const lang of LANGS) {
    const id = `${size.w}x${size.h} ${lang}`;
    console.log(`  ${id}`);
    attempted++; discovered++;
    const m = await sweep(browser, size, lang, {});
    grade(id, m, lang, check);
    observed.push(`${id}: [${m ? m.labels.map((l) => l.text).join(" ") : "none"}]`
      + `, tightest ${m ? Math.min(...m.labels.map((l) => l.margin)) + "px" : "n/a"}`
      + ` in a ${m ? m.labels[0].col + "px" : "?"} column`
      + `, ${m ? m.total : "?"} cells (${m ? m.total / 7 : "?"} weeks)`
      + `, legend ${m ? JSON.stringify(m.legend) : "?"}`
      + `, statuses present ${m ? JSON.stringify(m.present) : "?"}`);
    completed++;
  }
}

console.log("  canary — the single-letter header put back; it MUST fail");
attempted++;
if (BREAK === "canary") {
  console.log("    SKIPPED — --break=canary");
} else {
  discovered++;
  const m = await sweep(browser, SIZES[0], "en", { canary: true });
  grade("canary", m, "en", (t, name, cond, detail) => {
    assertions++;
    if (cond) return;
    canary.problems.push(`${name} ${detail}`.trim());
  });
  canary.observed_failure = canary.problems.some((p) => p.startsWith("weekday-distinct"));
  console.log(`    ${canary.observed_failure ? "caught" : "MISSED"}`
    + `${canary.problems.length ? " — " + canary.problems[0].slice(0, 100) : ""}`);
  completed++;
}

await browser.close();

console.log("\nWhat the widths measured:");
for (const o of observed) console.log("  " + o);
if (consoleNoise.length) {
  console.log("\nConsole (the two known React Router v7 warnings are dropped by name):");
  for (const c of consoleNoise) console.log("  " + c);
}

const status = failures.length === 0 && canary.observed_failure && consoleNoise.length === 0
  ? "pass" : "fail";
const { path } = writeReceipt({
  check_id: "calendar-legible",
  started_at,
  status,
  expected_targets: expected,
  discovered_targets: discovered,
  attempted_targets: attempted,
  completed_targets: completed,
  skipped_targets: 0,
  assertions_executed: assertions,
  min_assertions: SIZES.length * LANGS.length * 5 + 5,
  assertion_floor:
    "5 widths x 2 languages x 5 questions + 1 canary x 5 = 55. Fixed by SIZES x LANGS x the "
    + "question list, never by what the run finds: a width where the calendar does not render "
    + "grades as five failures rather than dropping out.",
  failures: [...failures, ...consoleNoise.map((c) => `console: ${c}`)],
  artifacts,
  warnings: [
    `weekday-fit FAILS ON THE MARGIN (${MIN_MARGIN}px), not on the overflow: by the time a label `
    + "overflows a person has already seen it. Measured in situ the tightest column at 320 has "
    + "14px clear in English and 14.3px in Spanish.",
    "Labels are measured IN SITU with a Range over the span's own contents. A detached probe "
    + "wearing the `font` shorthand measures a different typeface, because `font` does not carry "
    + "`font-variation-settings` — which this header uses. That probe reported 34.5px against a "
    + "true 22.3px and turned a comfortable fit into a reported emergency; `--break=detach` "
    + "reproduces it.",
    "It does NOT touch the day-cell width. 44px is arithmetically unreachable for a seven-column "
    + "month at 320 (`.cal-cell`'s own note) and is a separate, parked decision.",
    ...(BREAK ? [`run with --break=${BREAK}; this receipt is a sabotage, not a result`] : []),
  ],
  dimensions: {
    sizes: SIZES.map((s) => `${s.w}x${s.h}`),
    langs: LANGS,
    min_margin: MIN_MARGIN,
    observed,
    sabotage: BREAK || null,
  },
  canary,
});

console.log(`\n${status.toUpperCase()} — ${completed}/${expected} targets, ${assertions} assertions, `
  + `${failures.length} failure(s), canary ${canary.observed_failure ? "caught" : "MISSED"}. `
  + `Receipt ${path}`);
for (const f of failures) console.log("  · " + f);
process.exit(status === "pass" ? 0 : 1);
