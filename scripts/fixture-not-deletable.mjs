// A FLAGGED TEST ROW IS REVEALED ON PURPOSE AND HAS A DELETE BUTTON ON IT.
// DOES THE SCREEN REFUSE IT?
//
//   node scripts/fixture-not-deletable.mjs                 # the gate
//   node scripts/fixture-not-deletable.mjs --headed        # watch it
//   node scripts/fixture-not-deletable.mjs --break=guard   # sabotage: pre-fix button back
//   node scripts/fixture-not-deletable.mjs --break=paint   # sabotage: refusal goes invisible
//   node scripts/fixture-not-deletable.mjs --break=row     # sabotage: supply no fixture row
//   node scripts/fixture-not-deletable.mjs --break=canary  # sabotage: drop the canary
//   node scripts/receipt.mjs receipts/fixture-not-deletable.json
//
// Dev server on :5173 and the seeded demo business. No credentials.
//
// ---------------------------------------------------------------------------
// WHY THIS EXISTS — ROADMAP 0.3, AND IT IS THE ITEM'S OWN TITLE
// ---------------------------------------------------------------------------
// 0.3 is "test data: FLAG, DON'T DELETE", and the reason is the net: about
// sixty checks in `tests/` sign into seeded practice rows, and a check that
// cannot run prints something that looks very like a pass. So deleting one of
// those rows does not break anything loudly — it takes the net away quietly.
//
// `Clients.jsx` already carries both halves of the flag: the list hides a
// flagged row by default and a chip reveals it. **And the record that opens
// when you press the revealed row carried `Delete for good`, which calls
// `delete-customer` -> `forget_customer`, which HARD-DELETES the row and
// cascades its plan memberships, maintenance deadlines and job photos.** Two
// presses, from the very screen built to show the flagged rows. Nothing
// refused it and nothing checked.
//
// So this gate asks both halves of the only question that matters here:
//
//   REFUSED  a revealed, flagged row offers no `Delete for good` button, and
//            says why, in words that are actually PAINTED and not merely in
//            the DOM
//   WORKS    a real customer's record still offers it, at the same width, in
//            the same fold
//
// **THE SECOND IS WHAT KEEPS THE FIRST HONEST.** "No delete button found" is
// also what a wrong selector, an unopened fold and a record that never opened
// all report. The positive control fails in every one of those cases, so a
// green here cannot be bought by looking in the wrong place.
//
// ---------------------------------------------------------------------------
// THE COLUMN IS NOT IN THE DATABASE, AND THAT IS WHY THE ROW IS SUPPLIED
// ---------------------------------------------------------------------------
// `customers.is_test` does not exist until Andrew applies
// `supabase/migrations/20260924010000_a_fixture_is_not_a_customer.sql`
// (ROADMAP 0.3b), so every row arrives without the field and the refusal this
// gate measures is inert in production today — exactly as inert as the filter
// next to it, and activated by the same one command. Both are proved here
// against the data shape that migration produces, the same way
// `scripts/client-fixtures.mjs` proves the list: every `customers` response is
// intercepted and each row gets `is_test` only if it does not already carry
// one, by the migration's own backfill predicate; and a fixture row is
// appended ONLY if the response brought none. The day the migration lands, the
// injection becomes a no-op and the supply stops.
//
// THE DEMO TENANT WILL NEVER HOLD ONE OF ITS OWN, AND THAT IS A PROGRAM AND
// NOT BAD LUCK: `scripts/seed-demo.mjs:92` deletes the demo business by slug
// and recreates it, and `customers.business_id` is `on delete cascade`
// (`20260827000200_tenant_data.sql:204`), so every seed takes every customer
// row on `demo-detail` with it. The three droppings this item was written
// about went that way between 2026-09-24 and 2026-10-09.
//
// NOTHING IS WRITTEN. The list is read, a chip is pressed, two records are
// opened and a fold is opened. The refused button is never pressed — there is
// nothing to press — and the real customer's button is never pressed either.

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

// 1440 and 392: the two widths this repo requires a visual claim at. The fold
// and the record are the same component at every width in between.
const SIZES = [{ w: 1440, h: 900 }, { w: 392, h: 844 }];
const ART = fileURLToPath(new URL("../artifacts/fixture-not-deletable/", import.meta.url));

// The migration's backfill, in JavaScript — kept character for character with
// `client-fixtures.mjs`. If a domain is added to one and not the others, all
// of them keep grading against the old rule and say nothing about it.
const RESERVED = (email) => {
  const e = String(email || "").trim().toLowerCase();
  return /\.(test|invalid|localhost)$/.test(e) || e === "delivered@resend.dev";
};

const FABRICATED = {
  id: "00000000-0003-0000-0000-00000000f1x7",
  name: "ROADMAP 0.3 supplied fixture row",
  email: "sweep@fixture-not-deletable.test",
  phone: "(555) 000-0199",
  is_test: true,
};

const REFUSAL = /test row, not a person/i;

let assertions = 0;
const failures = [];
const artifacts = [];
const consoleNoise = [];
const observed = [];
const expect = { columnLive: false, fabricated: false, rows: 0, fixtures: 0 };

const check = (target, name, cond, detail = "") => {
  assertions++;
  if (cond) { console.log(`    ok      ${name}`); return true; }
  failures.push(`${target}: ${name} ${detail}`.trim());
  console.error(`    FAIL    ${name}  ${detail}`);
  return false;
};

// IS IT READABLE, NOT MERELY PRESENT. `docs/gotchas.md` 100: a hit test
// answers "can this be pressed"; a sentence under `opacity: 0` is addressable,
// correct and unreadable, and that is a failure this repo has shipped.
const READ_REFUSAL = () => {
  const host = document.querySelector(".disclose");
  if (!host) return { fold: false };
  const danger = [...host.querySelectorAll("button.btn.danger")]
    .map((b) => (b.textContent || "").trim());
  const p = [...host.querySelectorAll("p")]
    .find((el) => /test row, not a person/i.test(el.textContent || ""));
  let painted = false;
  if (p) {
    const r = p.getBoundingClientRect();
    const cs = getComputedStyle(p);
    const mid = document.elementFromPoint(
      Math.min(window.innerWidth - 2, Math.max(2, r.left + r.width / 2)),
      Math.min(window.innerHeight - 2, Math.max(2, r.top + 8)),
    );
    painted = r.width > 0 && r.height > 0
      && cs.visibility !== "hidden" && Number(cs.opacity) > 0.5
      && !!mid && (mid === p || p.contains(mid) || mid.contains(p));
  }
  return { fold: true, danger, refusal: p ? (p.textContent || "").trim() : null, painted };
};

const READ_ROWS = () => [...document.querySelectorAll(".rows.cols.clients .row-item")]
  .map((r) => ({
    name: (r.querySelector(".c-who")?.textContent || "").trim(),
    marked: !!r.querySelector(".c-test"),
  }));

const PREFIX_BUTTON = () => {
  const b = document.createElement("button");
  b.className = "btn danger";
  b.textContent = "Delete for good";
  document.querySelector(".disclose")?.appendChild(b);
};

let signedIn = null;

async function openClients(browser, size, label) {
  const ctx = await browser.newContext({
    viewport: { width: size.w, height: size.h },
    deviceScaleFactor: 1,
    storageState: signedIn || undefined,
  });
  const page = await ctx.newPage();
  watchConsole(page, label, consoleNoise);

  // `--break=paint`: the refusal stays in the DOM, correct and addressable,
  // and nobody can read it. The one failure a DOM-only check cannot see.
  if (BREAK === "paint") {
    await ctx.addInitScript(() => {
      document.addEventListener("DOMContentLoaded", () => {
        const st = document.createElement("style");
        st.textContent = ".disclose p { opacity: 0 !important; }";
        document.head.appendChild(st);
      });
    });
  }

  await page.route(/\/rest\/v1\/customers\?/, async (route) => {
    const res = await route.fetch();
    let body = null;
    try { body = await res.json(); } catch { /* not JSON — hand it back */ }
    if (!Array.isArray(body)) { await route.fulfill({ response: res }); return; }
    if (body.length && Object.hasOwn(body[0], "is_test")) expect.columnLive = true;
    const rows = body.map((c) => ({ ...c, is_test: c.is_test ?? RESERVED(c.email) }));
    if (BREAK !== "row" && rows.length && !rows.some((c) => c.is_test)) {
      rows.push({ ...rows[0], ...FABRICATED, business_id: rows[0].business_id });
      expect.fabricated = true;
    }
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

  // Reveal the flagged rows — the chip is the product's own control, pressed
  // the way a detailer presses it.
  const chip = page.locator(".clientfilters .chip", { hasText: /test row/i });
  if (await chip.count()) { await chip.first().click(); await settle(page); }
  return { ctx, page };
}

// Open one record by name and read the destructive fold inside it.
async function readRecord(page, name) {
  const row = page.locator(".rows.cols.clients .row-item")
    .filter({ has: page.locator(".c-who", { hasText: name }) });
  if (!(await row.count())) return { opened: false };
  await row.first().click();
  await page.waitForSelector(".disclose summary", { timeout: 15000 }).catch(() => {});
  await settle(page);
  const summary = page.locator(".disclose summary");
  if (await summary.count()) { await summary.first().click(); await settle(page); }
  const read = await page.evaluate(READ_REFUSAL);
  return { opened: true, ...read };
}

rmSync(ART, { recursive: true, force: true });
mkdirSync(ART, { recursive: true });

const expected = SIZES.length;
let discovered = 0; let attempted = 0; let completed = 0;
const canary = {
  what: "the pre-fix shape put back: a `Delete for good` button injected into the flagged row's "
    + "own fold, which the refusal assertion must then report as a failure",
  observed_failure: false,
  problems: [],
};

const browser = await chromium.launch({ headless: !HEADED });

for (const size of SIZES) {
  const label = `${size.w}x${size.h}`;
  console.log(`\n${label}`);
  const { ctx, page } = await openClients(browser, size, label);
  const rows = await page.evaluate(READ_ROWS);
  expect.rows = rows.length;
  const fixtures = rows.filter((r) => r.marked);
  const real = rows.filter((r) => !r.marked);
  expect.fixtures = fixtures.length;

  // ZERO FIXTURES DISCOVERED IS A FAILURE, NEVER A PASS — 0.3's own rule.
  // Without a flagged row there is nothing to refuse and every question below
  // would be answered by an empty screen.
  const learned = check(label, "learn — a flagged row is on the screen to refuse",
    fixtures.length > 0,
    `${rows.length} rows, ${fixtures.length} marked`
    + (expect.fabricated
      ? ""
      : ". None was appended either, so this is the supply and not the screen"))
    && check(label, "learn — a real customer is on the screen to compare against",
      real.length > 0, `${real.length} unmarked rows`);
  if (!learned) { await ctx.close(); continue; }
  discovered++; attempted++;

  // THE CASE THAT MUST BE REFUSED.
  const fx = await readRecord(page, fixtures[0].name);
  if (BREAK === "guard" && fx.opened) await page.evaluate(PREFIX_BUTTON);
  const after = BREAK === "guard" ? await page.evaluate(READ_REFUSAL) : fx;
  check(label, "refused — the flagged row's fold opens", !!after.fold,
    `opened=${fx.opened} fold=${after.fold}`);
  check(label, "refused — no `Delete for good` button on a flagged row",
    (after.danger || []).length === 0, `danger buttons: ${JSON.stringify(after.danger)}`);
  check(label, "refused — the record says why, in the detailer's own words",
    !!after.refusal && REFUSAL.test(after.refusal), `refusal: ${JSON.stringify(after.refusal)}`);
  check(label, "refused — and that sentence is PAINTED, not merely present",
    after.painted === true, `painted=${after.painted}`);
  await page.screenshot({ path: `${ART}refused-${label}.png` });
  artifacts.push(`artifacts/fixture-not-deletable/refused-${label}.png`);
  await page.keyboard.press("Escape").catch(() => {});
  await settle(page);

  // THE CASE THAT MUST STILL WORK — what keeps the four above honest.
  const rl = await readRecord(page, real[0].name);
  check(label, "works — a real customer's record still opens its fold", !!rl.fold,
    `opened=${rl.opened} fold=${rl.fold}`);
  check(label, "works — and still offers `Delete for good`",
    (rl.danger || []).some((t) => /delete for good/i.test(t)),
    `danger buttons: ${JSON.stringify(rl.danger)}`);
  await page.screenshot({ path: `${ART}works-${label}.png` });
  artifacts.push(`artifacts/fixture-not-deletable/works-${label}.png`);

  observed.push(`${label}: ${rows.length} rows, ${fixtures.length} flagged · flagged record `
    + `danger=${JSON.stringify(after.danger)} refusal painted=${after.painted} · real record `
    + `danger=${JSON.stringify(rl.danger)}`);
  completed++;
  await ctx.close();
}

// THE CANARY, INJECTED EVERY RUN RATHER THAN DESCRIBED. The pre-fix shape is
// put back into the flagged row's own fold and the absence assertion is re-run
// against it. If that still reports no danger button, this gate is measuring
// nothing and every pass above is worthless.
if (BREAK === "canary") {
  canary.problems.push("run with --break=canary: the canary was not injected at all");
} else if (completed) {
  const { ctx, page } = await openClients(browser, SIZES[0], "canary");
  const fx = (await page.evaluate(READ_ROWS)).find((r) => r.marked);
  if (!fx) {
    canary.problems.push("no flagged row to inject the pre-fix button into");
  } else {
    await readRecord(page, fx.name);
    await page.evaluate(PREFIX_BUTTON);
    const read = await page.evaluate(READ_REFUSAL);
    canary.observed_failure = (read.danger || []).some((t) => /delete for good/i.test(t));
    if (!canary.observed_failure) {
      canary.problems.push("the pre-fix button was injected into the flagged row's fold and the "
        + "refusal assertion still reported no danger button");
    }
    await page.screenshot({ path: `${ART}canary-prefix-button.png` });
    artifacts.push("artifacts/fixture-not-deletable/canary-prefix-button.png");
  }
  assertions++;
  console.log(`\ncanary ${canary.observed_failure ? "caught" : "MISSED"} — pre-fix button `
    + `${canary.observed_failure ? "seen" : "NOT seen"} by the same assertion that passed above`);
  await ctx.close();
}

await browser.close();

console.log("\nWhat the widths measured:");
for (const o of observed) console.log("  " + o);
if (consoleNoise.length) {
  console.log("\nConsole:");
  for (const c of consoleNoise) console.log("  " + c);
}

const status = failures.length === 0 && canary.observed_failure && consoleNoise.length === 0
  ? "pass" : "fail";
const { path } = writeReceipt({
  check_id: "fixture-not-deletable",
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
    "2 widths x 6 questions + 1 canary = 13. Fixed by SIZES x the question list, never by what "
    + "the run finds: a width with no flagged row on it grades as two `learn` failures rather "
    + "than dropping out, which is 0.3's own rule that zero fixtures discovered is a failure.",
  failures: [...failures, ...consoleNoise.map((c) => `console: ${c}`)],
  artifacts,
  warnings: [
    `column_live=${expect.columnLive}: `
    + (expect.columnLive
      ? "`customers.is_test` is in the database and the injection did nothing."
      : "`customers.is_test` is NOT in the database yet, so this refusal is INERT in production "
        + "today — as inert as the `!c.is_test` filter beside it, and switched on by the same "
        + "one command (ROADMAP 0.3b, Andrew's). The SCREEN is proved; the COLUMN is not."),
    `fixtures_fabricated=${expect.fabricated}: `
    + (expect.fabricated
      ? "the database supplied NO flagged row, so one was appended to the intercepted response "
        + `in the browser ("${FABRICATED.name}") and is written nowhere. The demo tenant cannot `
        + "hold one: `seed-demo.mjs:92` deletes the business and the customer rows cascade."
      : "the database supplied its own flagged row and nothing was appended."),
    "Nothing is written: no row is created, changed or deleted, and neither delete button is "
    + "ever pressed.",
    ...(BREAK ? [`run with --break=${BREAK}; this receipt is a sabotage, not a result`] : []),
  ],
  dimensions: {
    sizes: SIZES.map((s) => `${s.w}x${s.h}`),
    column_live: expect.columnLive,
    fixtures_fabricated: expect.fabricated,
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
