// A DETAILER'S OWN CLIENTS LIST: DOES IT COUNT THE ROWS A CHECK LEFT BEHIND?
//
//   node scripts/client-fixtures.mjs                 # the sweep
//   node scripts/client-fixtures.mjs --headed        # watch it
//   node scripts/client-fixtures.mjs --break=column  # sabotage: no is_test at all
//   node scripts/client-fixtures.mjs --break=paint   # sabotage: the mark goes invisible
//   node scripts/client-fixtures.mjs --break=canary  # sabotage: drop the canary
//   node scripts/receipt.mjs receipts/client-fixtures.json
//
// Dev server on :5173 and the seeded demo business. No credentials.
//
// ---------------------------------------------------------------------------
// **THE `is_test` COLUMN IS SUPPLIED TO THE BROWSER BY THIS CHECK, BECAUSE IT
// IS NOT IN THE DATABASE YET. READ THIS BEFORE READING A GREEN RUN.**
// ---------------------------------------------------------------------------
// `supabase/migrations/20260924010000_a_fixture_is_not_a_customer.sql` adds
// `customers.is_test` and backfills it. **Applying a migration is Andrew's**,
// so on the database this sweep signs into, the column does not exist and
// every row comes back without the field.
//
// So every `customers` response is intercepted on the way past and each row
// gets `is_test` **only if it does not already carry one** — using the
// migration's own backfill predicate, character for character: an address in
// a domain RFC 2606 reserves (`.test`, `.invalid`, `.localhost`) or Resend's
// documented sink. What the screen renders here is therefore what it will
// render the hour the migration lands.
//
// **AND THE MOMENT IT LANDS, THIS INJECTION BECOMES A NO-OP** — the rows
// arrive carrying `is_test` and `??` keeps it. Nothing here needs undoing
// later, and the receipt records `column_live` so a reader can tell which of
// the two states produced the numbers.
//
// **SCOPE, PLAINLY: this run does NOT prove the column exists, and does NOT
// prove the backfill ran.** It proves the SCREEN, against the data shape the
// migration produces. `node scripts/migration-drift.mjs` is the instrument for
// the other half, and it cannot see an added column at all (CLAUDE.md:
// FUNCTIONS ONLY), so the honest answer is Andrew applying it and this sweep
// then printing `column_live: true` with the injection doing nothing.
//
// ---------------------------------------------------------------------------
// WHAT IT ASKS, SIX TIMES AT EACH OF FIVE WIDTHS
// ---------------------------------------------------------------------------
//   1  hidden      no fixture NAME is anywhere in the default list
//   2  no-mark     no TEST mark is drawn while they are hidden
//   3  headcount   the masthead counts people, not rows in the table
//   4  quiet       "gone quiet" counts people, not rows in the table
//   5  chip        the chip is there and states the number it will reveal
//   6  revealed    pressing it brings every fixture back, each one MARKED,
//                  and the mark is PAINTED and on top — not merely in the DOM
//
// **6 IS THE ONE THAT KEEPS 1 HONEST.** A check that only asks "are they
// hidden" is satisfied completely by a screen that shows nobody at all, which
// is exactly the delete this item's ruling forbids. Nothing may be hidden that
// cannot be brought back.

import { createRequire } from "node:module";
import { mkdirSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { writeReceipt } from "./receipt.mjs";
import { settle, watchConsole } from "./lib/bookingWalk.mjs";
import { demoOwner } from "./lib/demoOwner.mjs";

const { chromium } = createRequire(import.meta.url)("./../app/node_modules/playwright/index.js");

const started_at = new Date().toISOString();
const HEADED = process.argv.includes("--headed");
const BREAK = (process.argv.find((a) => a.startsWith("--break=")) || "").split("=")[1] || "";
const BASE = process.env.BASE || "http://localhost:5173";
const OWNER = demoOwner();

// 320 FIRST. The fixture names are the longest in the list — "ROADMAP 2.8
// Address Test 2026-09-23" — and `.c-who` ellipsises, so 320 is where a mark
// placed after the name would disappear. It is the width the mark's position
// was decided by, so it is the width the sweep leads with.
const SIZES = [
  { w: 320, h: 844 }, { w: 392, h: 844 }, { w: 768, h: 1024 },
  { w: 1440, h: 900 }, { w: 1920, h: 1080 },
];

const ART = fileURLToPath(new URL("../artifacts/client-fixtures/", import.meta.url));

// The migration's backfill, in JavaScript. THE TWO MUST MOVE TOGETHER — if a
// domain is added there and not here, this check keeps grading against the old
// rule and says nothing about it.
const RESERVED = (email) => {
  const e = String(email || "").trim().toLowerCase();
  return /\.(test|invalid|localhost)$/.test(e) || e === "delivered@resend.dev";
};

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

// What the database actually holds, read once through the same interception
// the browser sees. `expect` is computed from the rows, never typed in: a
// seed that gains or loses a fixture must move the target, not break the run.
const expect = { total: 0, fixtures: 0, real: 0, names: [], columnLive: false };

/**
 * Read the list exactly as a person sees it.
 *
 * NAMES COME FROM `.c-who`, NOT FROM `innerText` OF THE ROW. The row also
 * holds a relative date and a phone number, and `innerText` would let a check
 * "find" a fixture name inside a string that merely contains it. The mark is
 * read as its own element for the same reason.
 */
const READ_LIST = (probePaint) => {
  const norm = (s) => String(s || "").replace(/\s+/g, " ").trim();
  const rows = [...document.querySelectorAll(".rows.cols.clients .row-item")].map((r) => {
    const who = r.querySelector(".c-who");
    const mark = r.querySelector(".c-test");
    let painted = null;
    if (mark && probePaint) {
      // **SCROLL IT INTO VIEW FIRST, AND THE FIRST VERSION DID NOT.**
      // `elementFromPoint` takes VIEWPORT coordinates and answers `null` for
      // anything outside them — and these rows sort LAST (never been in), so
      // at every one of the five widths the marks were below the fold and the
      // paint test reported 15 of 15 legal marks unpainted. The product was
      // never wrong. docs/gotchas.md has this shape several times over.
      mark.scrollIntoView({ block: "center", inline: "nearest" });
      const b = mark.getBoundingClientRect();
      const vis = typeof mark.checkVisibility !== "function"
        || mark.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true });
      const hit = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2);
      painted = b.width > 6 && b.height > 6 && vis
        && !!hit && (hit === mark || mark.contains(hit) || hit.contains(mark));
    }
    return {
      // The name's own span — the mark is `.c-who`'s first child and would
      // otherwise be read as part of the name.
      name: norm(who?.querySelector("span:last-child")?.textContent ?? who?.textContent),
      marked: !!mark,
      markWords: norm(mark?.textContent),
      painted,
    };
  });
  const head = norm(document.querySelector(".split.clients .display + .quiet")?.textContent);
  const quietCell = [...document.querySelectorAll(".ledger.answers > *")]
    .find((el) => /gone quiet/i.test(el.textContent || ""));
  const chip = [...document.querySelectorAll(".clientfilters .chip")]
    .find((b) => /test row/i.test(b.textContent || ""));
  return {
    rows,
    head,
    quiet: quietCell ? norm(quietCell.querySelector(".figure")?.textContent) : null,
    chip: chip ? norm(chip.textContent) : null,
    chipPressed: chip ? chip.getAttribute("aria-pressed") === "true" : null,
  };
};

rmSync(ART, { recursive: true, force: true });
mkdirSync(ART, { recursive: true });

let signedIn = null;

async function openClients(browser, size, label) {
  const ctx = await browser.newContext({
    viewport: { width: size.w, height: size.h }, deviceScaleFactor: 1,
    storageState: signedIn || undefined,
  });
  const page = await ctx.newPage();
  watchConsole(page, label, consoleNoise);

  // **`--break=paint` MAKES THE MARK INVISIBLE WITHOUT REMOVING IT** — the
  // one failure a DOM-only check cannot see, and the exact shape this repo
  // has shipped before: an element present, correct, addressable, and not
  // readable by anybody. The first version of this switch merely SKIPPED the
  // paint probe, which left the run green and therefore proved nothing; a
  // sabotage that does not turn the run red is not a sabotage.
  if (BREAK === "paint") {
    await ctx.addInitScript(() => {
      document.addEventListener("DOMContentLoaded", () => {
        const st = document.createElement("style");
        st.textContent = ".rows.cols.clients .row-item .c-test { opacity: 0 !important; }";
        document.head.appendChild(st);
      });
    });
  }

  // THE INJECTION. `??` and not `=`: a row that already carries the column
  // keeps whatever the database says, so this stops mattering the day the
  // migration is applied rather than overriding it for ever.
  await page.route(/\/rest\/v1\/customers\?/, async (route) => {
    const res = await route.fetch();
    let body = null;
    try { body = await res.json(); } catch { /* not JSON — hand it straight back */ }
    if (!Array.isArray(body)) { await route.fulfill({ response: res }); return; }
    if (body.length && Object.hasOwn(body[0], "is_test")) expect.columnLive = true;
    const rows = BREAK === "column"
      ? body
      : body.map((c) => ({ ...c, is_test: c.is_test ?? RESERVED(c.email) }));
    await route.fulfill({ response: res, json: rows });
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
      localStorage.setItem("dp.tours", JSON.stringify(
        ["shell", "today", "calendar", "money", "clients", "business"]));
      localStorage.setItem("dp.tour", "1");
    } catch { /* private mode */ }
  });
  await page.goto(`${BASE}/app/clients`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".rows.cols.clients .row-item, .emptyscreen", { timeout: 30000 });
  await settle(page);
  return { ctx, page };
}

async function sweep(browser, size) {
  const label = `${size.w}x${size.h}`;
  const { ctx, page } = await openClients(browser, size, label);
  const before = await page.evaluate(READ_LIST, false);

  const chip = page.locator(".clientfilters .chip", { hasText: /test row/i });
  let after = null;
  if (await chip.count()) {
    await chip.first().click();
    await settle(page);
    after = await page.evaluate(READ_LIST, true);
    await page.screenshot({ path: `${ART}${label}-revealed.png`, animations: "disabled" });
    artifacts.push(`artifacts/client-fixtures/${label}-revealed.png`);
    // AND BACK OFF AGAIN. A toggle that only goes one way is half a control.
    await chip.first().click();
    await settle(page);
  }
  const backOff = await page.evaluate(READ_LIST, false);
  await page.screenshot({ path: `${ART}${label}-default.png`, animations: "disabled" });
  artifacts.push(`artifacts/client-fixtures/${label}-default.png`);
  await ctx.close();
  return { before, after, backOff };
}

function grade(label, { before, after, backOff }) {
  const names = new Set(expect.names);
  const inList = (r) => [...r.rows].filter((x) => names.has(x.name)).map((x) => x.name);

  check(label, "hidden — no fixture is in the default list",
    inList(before).length === 0, `found ${JSON.stringify(inList(before))}`);
  check(label, "no-mark — nothing is marked while they are hidden",
    before.rows.every((r) => !r.marked),
    `${before.rows.filter((r) => r.marked).length} marked row(s)`);
  check(label, `headcount — the masthead says ${expect.real}, not ${expect.total}`,
    new RegExp(`\\b${expect.real}\\b`).test(before.head || "")
    && !new RegExp(`\\b${expect.total}\\b`).test(before.head || ""),
    `masthead reads «${before.head}»`);
  check(label, `quiet — "gone quiet" is ${expect.quietReal}, not ${expect.quietAll}`,
    before.quiet === String(expect.quietReal),
    `figure reads «${before.quiet}» (all rows would be ${expect.quietAll})`);
  check(label, `chip — offers the ${expect.fixtures} it will reveal`,
    !!before.chip && new RegExp(`\\b${expect.fixtures}\\b`).test(before.chip),
    `chip reads ${JSON.stringify(before.chip)}`);

  const shown = after ? inList(after) : [];
  const marked = after ? after.rows.filter((r) => names.has(r.name)) : [];
  check(label, "revealed — every fixture comes back, marked and painted",
    !!after && shown.length === expect.fixtures
    && marked.length === expect.fixtures && marked.every((r) => r.marked)
    && marked.every((r) => r.painted === true)
    && backOff && inList(backOff).length === 0,
    !after ? "the chip was never found"
      : `${shown.length}/${expect.fixtures} back, marked=${marked.filter((r) => r.marked).length}, `
        + `painted=${marked.filter((r) => r.painted === true).length}, `
        + `words=${JSON.stringify([...new Set(marked.map((r) => r.markWords))])}, `
        + `after switching off ${JSON.stringify(inList(backOff))}`);

  observed.push(`${label}: head «${before.head}» quiet=${before.quiet} chip=${JSON.stringify(before.chip)} `
    + `rows=${before.rows.length}→${after ? after.rows.length : "n/a"} `
    + `painted=${after ? JSON.stringify(after.rows.filter((r) => r.marked).map((r) => r.painted)) : "n/a"}`);
}

// ---------------------------------------------------------------------------
const browser = await chromium.launch({ headless: !HEADED });

// WHAT THE RUN IS GRADED AGAINST, DISCOVERED RATHER THAN DECLARED. One pass
// with the fixtures SHOWN, at a desk width, reading the same rows the sweep
// will read. Zero fixtures discovered is a FAILURE below, never a pass.
{
  const { ctx, page } = await openClients(browser, SIZES[3], "learn");
  const seen = await page.evaluate(() => {
    const key = Object.keys(localStorage).find((k) => /-auth-token$/.test(k));
    return key ? "signed-in" : "anon";
  });
  const chip = page.locator(".clientfilters .chip", { hasText: /test row/i });
  if (await chip.count()) { await chip.first().click(); await settle(page); }
  const all = await page.evaluate(READ_LIST, false);
  expect.total = all.rows.length;
  expect.names = all.rows.filter((r) => r.marked).map((r) => r.name);
  expect.fixtures = expect.names.length;
  expect.real = expect.total - expect.fixtures;
  observed.push(`learn (${seen}): ${expect.total} rows, ${expect.fixtures} marked `
    + `${JSON.stringify(expect.names)}`);
  await ctx.close();
}

// The two "gone quiet" figures, read off the screen rather than recomputed —
// with the chip ON and with it OFF. A number this check worked out itself
// would be a second implementation of `lib/client-list.js` and would agree
// with the screen even when both were wrong.
{
  const { ctx, page } = await openClients(browser, SIZES[3], "quiet");
  const off = await page.evaluate(READ_LIST, false);
  expect.quietReal = Number(off.quiet);
  const chip = page.locator(".clientfilters .chip", { hasText: /test row/i });
  if (await chip.count()) { await chip.first().click(); await settle(page); }
  const on = await page.evaluate(READ_LIST, false);
  expect.quietAll = Number(on.quiet);
  observed.push(`quiet: real=${expect.quietReal} with-fixtures=${expect.quietAll}`);
  await ctx.close();
}

const expected = SIZES.length + 1;
let discovered = 0, attempted = 0, completed = 0;
const canary = { id: "the-list-with-fixtures-showing", observed_failure: false, problems: [] };

// ZERO TARGETS IS A FAILURE, NOT A PASS. If the seed ever stops carrying a
// fixture this whole sweep is vacuous, and six green questions about an empty
// set read exactly like six green questions about a working screen.
if (expect.fixtures === 0) {
  failures.push("learn: no fixture row was discovered — every question below would be vacuous");
}
if (expect.quietAll === expect.quietReal && expect.fixtures > 0) {
  failures.push("learn: \"gone quiet\" is the same with fixtures shown and hidden — "
    + "the figure this item exists to move does not move");
}

for (const size of SIZES) {
  const label = `${size.w}x${size.h}`;
  console.log(`  ${label}`);
  attempted++; discovered++;
  grade(label, await sweep(browser, size));
  completed++;
}

// THE CANARY: the "hidden" question, asked of a list where they are NOT
// hidden. It must come back red. If it does not, question 1 above is measuring
// nothing and five green lines mean five green lines.
console.log("  canary — the same 'hidden' test, run against a list showing its fixtures");
attempted++;
if (BREAK === "canary") {
  console.log("    SKIPPED — --break=canary");
} else {
  discovered++;
  const { ctx, page } = await openClients(browser, SIZES[3], "canary");
  const chip = page.locator(".clientfilters .chip", { hasText: /test row/i });
  if (await chip.count()) { await chip.first().click(); await settle(page); }
  const shown = await page.evaluate(READ_LIST, false);
  await page.screenshot({ path: `${ART}canary-showing.png`, animations: "disabled" });
  artifacts.push("artifacts/client-fixtures/canary-showing.png");
  await ctx.close();
  const names = new Set(expect.names);
  const found = shown.rows.filter((r) => names.has(r.name)).length;
  canary.observed_failure = found > 0;
  if (!canary.observed_failure) {
    canary.problems.push("a list with its fixtures switched ON still passed the hidden test");
  }
  assertions++;
  console.log(`    ${canary.observed_failure ? "caught" : "MISSED"} — ${found} fixture(s) visible `
    + `of ${expect.fixtures}`);
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
  check_id: "client-fixtures",
  started_at,
  status,
  expected_targets: expected,
  discovered_targets: discovered,
  attempted_targets: attempted,
  completed_targets: completed,
  skipped_targets: 0,
  assertions_executed: assertions,
  min_assertions: SIZES.length * 6 + 1,
  assertion_floor:
    "5 widths x 6 questions + 1 canary = 31. Fixed by SIZES x the question list, never by what "
    + "the run finds: a width where the chip is missing grades as six failures rather than "
    + "dropping out, and a seed with no fixture in it fails `learn` rather than making every "
    + "question below vacuous.",
  failures: [...failures, ...consoleNoise.map((c) => `console: ${c}`)],
  artifacts,
  warnings: [
    `column_live=${expect.columnLive}: `
    + (expect.columnLive
      ? "`customers.is_test` is in the database and the injection did nothing."
      : "`customers.is_test` is NOT in the database yet — this check supplied it to the browser "
        + "using the migration's own backfill predicate. The SCREEN is proved; the COLUMN is "
        + "not, and will not be until Andrew applies "
        + "supabase/migrations/20260924010000_a_fixture_is_not_a_customer.sql."),
    "Nothing is written: the list is read, a chip is pressed twice, no row is created, changed "
    + "or deleted, and no fixture is removed from any tenant.",
    ...(BREAK ? [`run with --break=${BREAK}; this receipt is a sabotage, not a result`] : []),
  ],
  dimensions: {
    sizes: SIZES.map((s) => `${s.w}x${s.h}`),
    column_live: expect.columnLive,
    expectations: {
      rows_in_table: expect.total,
      fixtures: expect.fixtures,
      real_people: expect.real,
      fixture_names: expect.names,
      gone_quiet_real: expect.quietReal,
      gone_quiet_with_fixtures: expect.quietAll,
    },
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
