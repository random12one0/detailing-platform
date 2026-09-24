// THE ZONE-VS-ADDRESS FLAG, FROM THE CUSTOMER'S TAP TO THE DETAILER'S SCREEN.
//
//   node scripts/zone-mismatch.mjs                 # the sweep
//   node scripts/zone-mismatch.mjs --headed        # watch it
//   node scripts/zone-mismatch.mjs --keep          # leave the two bookings
//   node scripts/zone-mismatch.mjs --break=canary  # sabotage: the canary is real
//   node scripts/zone-mismatch.mjs --break=paint   # sabotage: the pixel test is real
//   node scripts/receipt.mjs receipts/zone-mismatch.json
//
// Dev server on :5173, the seeded demo business, and credentials in `.env`.
//
// ---------------------------------------------------------------------------
// WHY THIS EXISTS — ROADMAP 2.3, REWRITTEN 2026-09-22
// ---------------------------------------------------------------------------
// Travel is **named, flat-fee zones**. There is no distance pricing and there
// is not going to be any: the geocoding and routing APIs cost money, and
// Andrew has ruled it out. The customer picks their own zone from a list and
// each carries a price, so **the failure mode is a customer in the far zone
// choosing the near one** — paying $0 where the fee is $40. The flag notices
// that the address they typed does not mention the zone they picked, and
// shows it to the detailer before they drive.
//
// **IT LABELS AND IT NEVER GATES.** Nothing is refused, nothing is repriced.
// That is the same ruling as 2.8's unverified-address note, and this file
// asserts it: `adds-up` would be the wrong question here, so instead every
// target checks that the booking exists and was taken.
//
// **AND THE REASON THIS FILE WAS WRITTEN AT ALL: THE FLAG HAD NEVER RUN.**
// Measured 2026-09-22 — **32 of 32 bookings on `demo-detail` carried
// `travel_zone_address_mismatch = null`.** Not `false`, which would mean asked
// and answered no. `null`, which means nothing had ever set it, in any
// environment. The wiring was written end to end and unproven at every joint:
// `zoneAddressMismatch()` (unit-tested 7/7) → `create-booking` writes the
// column → `BookingDetail.jsx` draws the warning → the owner's mail carries
// it. Read, never run. Wave 14.6's category, inside an item that read as
// half-done.
//
// ---------------------------------------------------------------------------
// WHAT IT COSTS, DECLARED BECAUSE BOTH COSTS ARE REAL
// ---------------------------------------------------------------------------
// **NO GEOAPIFY CREDIT.** Both addresses are already resolved in
// `address_points`, so `confirmWeather` → `pointFor` finds them cached and
// calls nothing. Checked before choosing them, not after. **Do not swap either
// address for a prettier one without checking the table first** — a new
// address spends a credit per run, quietly, and nothing here would say so.
//
// **NO REAL MAIL.** The customer address is `e2e@fixture.test`, which is
// `e2e-booking.mjs`'s own free path — the provider leg is deliberately
// unproven and is not this file's subject. **This does not re-solve mail and
// must not grow into doing so.**
//
// **IT WRITES TWO ROWS AND DELETES THEM.** Two bookings on `demo-detail`,
// removed in a `finally`, exactly as `e2e-booking.mjs` does. `--keep` leaves
// them for a person to look at. It also clears the `booking%` rate-limit
// buckets first, for `e2e-booking.mjs`'s stated reason: this books more times
// in a minute than a real customer does in a year, and a 429 mid-run reads as
// a broken engine rather than as the harness paying for its own noise.
//
// ---------------------------------------------------------------------------
// WHAT IT ASSERTS — four questions per target, ten targets
// ---------------------------------------------------------------------------
// Two bookings x five widths. The two bookings differ in ONE thing: the
// address typed. Both pick the same zone, the near one, which is the default —
// so anything that differs between them is the address and nothing else.
//
//   record-open  the job record for this booking is on screen. Without it the
//                other three are answered about a page that never loaded, and
//                "the warning is absent" would be trivially true.
//   warning      the warning is present **iff** this booking's stored flag is
//                true. Both directions in one question, because a check that
//                only looks for the warning passes on a page showing it to
//                everybody.
//   visible      when it should be there: inside the window and
//                `elementFromPoint` lands on it. A rect cannot tell you what
//                is painted.
//   painted      when it should be there: its pixels are ink. When it should
//                not be, the element is genuinely absent from the DOM rather
//                than merely invisible.
//
// Plus two one-off assertions, one per booking, on the STORED value — which is
// the joint that had never been exercised.
//
// ---------------------------------------------------------------------------
// THE CANARY IS A DATA CANARY, NOT A STYLESHEET
// ---------------------------------------------------------------------------
// It intercepts the record's own query and flips
// `travel_zone_address_mismatch` to `false` on the booking that really has it
// `true`. The page then correctly draws nothing, and the check MUST notice
// that the warning it expected is gone. Five runs, count reported.
// `--break=canary` removes the interception: the page draws the warning, the
// check is satisfied, nothing is observed and `receipt.mjs` rejects the
// receipt.

import "../tests/_env.mjs";

import { createRequire } from "node:module";
import { mkdirSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { writeReceipt } from "./receipt.mjs";
import {
  advance, countQuotes, DELTA_FLOOR, frame, pickDay, quoted, settle,
  stepNow, toCalendar, watchConsole,
} from "./lib/bookingWalk.mjs";

const { chromium } = createRequire(import.meta.url)("./../app/node_modules/playwright/index.js");

const started_at = new Date().toISOString();
const HEADED = process.argv.includes("--headed");
const KEEP = process.argv.includes("--keep");
const BREAK = (process.argv.find((a) => a.startsWith("--break=")) || "").split("=")[1] || "";
const BASE = process.env.BASE || "http://localhost:5173";

const SLUG = "demo-detail";
const OWNER = { email: "demo@detailplatform.com", password: "demo123" };
const CUSTOMER_EMAIL = "e2e@fixture.test";      // e2e-booking.mjs's free path

const SIZES = [
  { w: 1920, h: 1080 }, { w: 1440, h: 900 }, { w: 768, h: 1024 },
  { w: 392, h: 844 }, { w: 320, h: 844 },
];

// **BOTH ADDRESSES ARE ALREADY IN `address_points`** — checked 2026-09-22
// against the live table. The zone picked is the same for both and is the
// default (the near one, $0), so the ONLY difference between these two
// bookings is the text in the address box.
const CASES = [
  {
    key: "far", expectFlag: true,
    address: "1549 El Prado, San Diego, CA 92101, United States of America",
    why: "a San Diego address under a zone named Long Beach",
  },
  {
    key: "near", expectFlag: false,
    address: "219 Walnut Ave, Long Beach, CA",
    why: "a Long Beach address under a zone named Long Beach — the control",
  },
];
const CANARY_RUNS = 5;

// The warning's own sentence. Coupled to the copy on purpose and with its eyes
// open: if it is renamed, `warning` reports the line absent on the `far`
// booking and the run goes RED, which is the right direction to fail in.
const WARNING = "This address doesn't mention the travel area they picked";

const ART = fileURLToPath(new URL("../artifacts/zone-mismatch/", import.meta.url));

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

// --- the database, by service key, read and delete only --------------------
const URL_ = process.env.SUPABASE_URL;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_ || !SERVICE) {
  console.error("\nSKIPPED — needs SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the root .env.");
  console.error("NOTHING ran and NO receipt was written. This is not a pass.");
  process.exit(2);
}
const H = { apikey: SERVICE, Authorization: `Bearer ${SERVICE}` };
const dbGet = async (path) => (await fetch(URL_ + path, { headers: H })).json().catch(() => null);
const dbDel = (path) => fetch(URL_ + path, { method: "DELETE", headers: H });

const biz = (await dbGet(`/rest/v1/businesses?select=id&slug=eq.${SLUG}`))?.[0]?.id;
if (!biz) {
  console.error(`\nSKIPPED — no business with slug "${SLUG}". Run: node scripts/seed-demo.mjs`);
  console.error("NOTHING ran and NO receipt was written. This is not a pass.");
  process.exit(2);
}

// ROADMAP 2.21 — clear the throttle this run is about to spend, for the
// reason `e2e-booking.mjs` gives: a 429 halfway through reads as a broken
// engine rather than as the harness paying for its own noise.
await dbDel("/rest/v1/rate_hits?bucket=like.booking%25");
// **AND THE ADDRESS BUDGET, WHICH THIS RUN SPENDS WITHOUT TYPING ANYTHING.**
// Opening a job record geocodes that job's address through `address-suggest`
// — `app/src/lib/jobWeather.js:111`, for the weather strip — and that endpoint
// is budgeted as a TYPING allowance: `addressPerIp` is 60 an hour, sized for
// "a person typing several addresses badly". This file opens the same two
// records seventeen times in three minutes, so it exhausts a real customer's
// hour in a minute and then every record load answers 429, the weather
// silently stops, and the run reddens on a console line that is the harness
// rather than the product.
//
// **THE UNDERLYING BEHAVIOUR IS A REAL FINDING AND IS NOT FIXED HERE** — see
// ROADMAP 2.3's adjacent-finding note. Clearing is the same bargain
// `e2e-booking.mjs` strikes with the booking buckets: the limits stay sized by
// what a real customer does, and the harness pays for its own noise.
await dbDel("/rest/v1/rate_hits?bucket=like.address%25");

const STAMP = `zone-${Date.now().toString(36)}`;
// **`.app-main`, NOT `.record` — the standalone `/job/:id` page draws the
// booking straight into the shell, and only the desk's second column wraps
// it in `.record`.** `pinned-bar.mjs` already records the three containers
// this component opens in; waiting for the wrong one times out after thirty
// seconds and reads as a page that never loaded.
const BLANK_CSS = ".app-main p.quiet { color: transparent !important; }";

rmSync(ART, { recursive: true, force: true });
mkdirSync(ART, { recursive: true });

/**
 * Book, as a customer, mobile, with this address and the default (near) zone.
 *
 * The location step is the only one handled by name rather than by
 * `advance()`'s press-and-see loop, and it has to be: that loop would find
 * Continue refused for want of an address and move on to the NEXT card, which
 * is drop-off — a booking with no zone and no address at all, which is not the
 * case this file is about. So the address goes in first and then the step
 * advances normally.
 */
async function book(page, address) {
  await page.goto(`${BASE}/book/${SLUG}`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".bk-card.selectable", { timeout: 30000 });
  await settle(page);

  let at = await stepNow(page);
  if (!at) throw new Error("no step label on the booking page");
  for (let guard = 0; guard < 10; guard++) {
    // THE ADDRESS, WHENEVER THE STEP ASKING FOR IT APPEARS. `autocomplete` is
    // what a field DOES; a heading is how it is written.
    const addr = page.locator(".bk-field input[autocomplete=street-address]");
    if (await addr.count() && !(await addr.first().inputValue())) {
      await quoted(page, () => addr.first().fill(address));
    }
    // The name/phone/email step.
    if (await page.locator(".bk-field input[type=tel]").count()) {
      await page.locator("input:visible").first().fill(STAMP);
      await page.locator(".bk-field input[type=tel]").first().fill("555-0133");
      await page.locator(".bk-field input[type=email]").first().fill(CUSTOMER_EMAIL);
      await settle(page, 600);
    }
    if (await page.locator(".bk-cal").count() && !(await page.locator(".bk-slots .bk-chip.selected").count())) {
      const day = await pickDay(page, "any");
      await quoted(page, () => page.locator(".bk-cal .cell", { hasText: new RegExp(`^${day}$`) })
        .last().click());
      await page.locator(".bk-slots .bk-chip").first()
        .waitFor({ state: "attached", timeout: 8000 }).catch(() => {});
      await settle(page, 2200);
      await quoted(page, () => page.locator(".bk-slots .bk-chip").first().click());
    }
    at = await stepNow(page);
    if (at && at.n === at.of) break;                    // the review step
    const next = await advance(page, at.n);
    if (!next) throw new Error(`step ${at.n} would not advance`);
    at = next;
  }
  if (!at || at.n !== at.of) throw new Error("never reached the review step");

  // SUBMIT. The button is the bar's primary on this step, and the flow leaves
  // the wizard, so `advance()`'s "did the step number rise" cannot judge it.
  await page.locator(".bk-bar button.bk-btn.primary").click({ force: true });
  await page.waitForTimeout(4000);
  await settle(page, 3000);

  const rows = await dbGet(
    `/rest/v1/bookings?select=id,travel_zone,customer_address,travel_zone_address_mismatch,service_type`
    + `&business_id=eq.${biz}&customer_name=eq.${STAMP}&order=created_at.desc&limit=3`);
  if (!Array.isArray(rows) || !rows.length) {
    throw new Error("the booking was not created — nothing with this run's customer name is in the table");
  }
  return rows[0];
}

/** Read the warning's state off a job record that is already open. */
const READ = (needle) => {
  const box = document.querySelector(".app-main") || document.body;
  const hit = [...box.querySelectorAll("p")].find((p) => p.innerText.includes(needle));
  if (!hit) return { present: false };
  const r = hit.getBoundingClientRect();
  const at = document.elementFromPoint(
    Math.round(r.left + r.width / 2), Math.round(r.top + r.height / 2));
  return {
    present: true,
    text: hit.innerText.trim(),
    rect: { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) },
    inWindow: r.top >= 0 && r.bottom <= innerHeight,
    onTop: !!at && (at === hit || hit.contains(at)),
    hitName: at ? (at.className || at.tagName) : "nothing",
    viewportH: innerHeight,
  };
};

/**
 * Flip the stored flag to false on the way to the page — the data canary.
 * The record then correctly draws nothing, and the check must notice that the
 * warning it expected has gone.
 */
const flipFlag = (page, id) => page.route("**/rest/v1/bookings*", async (route) => {
  const res = await route.fetch();
  let body;
  try { body = await res.json(); } catch { return route.fulfill({ response: res }); }
  const rows = Array.isArray(body) ? body : [body];
  for (const row of rows) {
    if (row && row.id === id) row.travel_zone_address_mismatch = false;
  }
  return route.fulfill({ response: res, body: JSON.stringify(Array.isArray(body) ? rows : rows[0]) });
});

let signedIn = null;

/** One target: open this booking's record at this width and grade it. */
async function target(browser, { w, h }, kase, booking, { label, stem, canary }) {
  const ctx = await browser.newContext({
    viewport: { width: w, height: h }, deviceScaleFactor: 1,
    storageState: signedIn || undefined,
  });
  const page = await ctx.newPage();
  watchConsole(page, label, consoleNoise);

  const out = { read: null, spreads: [], opened: false };
  try {
    if (canary && BREAK !== "canary") await flipFlag(page, booking.id);
    await page.goto(`${BASE}/job/${booking.id}`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector(".jobbar, input[type=email]", { timeout: 30000 });
    if (await page.locator("input[type=email]").count()) {
      await page.fill("input[type=email]", OWNER.email);
      await page.fill("input[type=password]", OWNER.password);
      await page.click("form button.btn.primary");
      await page.waitForSelector(".jobbar", { timeout: 30000 });
      signedIn = await ctx.storageState();
    }
    await settle(page, 2600);
    // THE BAR IS THE PROOF THE RECORD RENDERED. It is the six-button action row
    // at the top of a job and it exists in all three containers.
    out.opened = await page.locator(".jobbar").count() > 0;
    if (BREAK === "paint") await page.addStyleTag({ content: BLANK_CSS });
    out.read = await page.evaluate(READ, WARNING);
    out.spreads = await frame(page, {
      dir: ART, file: `${stem}.png`,
      rects: out.read.present ? [out.read.rect] : [],
      blankCss: BLANK_CSS, artifacts, prefix: "artifacts/zone-mismatch/",
    });
  } finally {
    await ctx.close();
  }
  return out;
}

function grade(id, o, expectWarning, sink) {
  sink(id, "record-open", o.opened,
    "the job record did not render, so nothing below was asked of the real page");
  sink(id, "warning", o.opened && o.read.present === expectWarning,
    expectWarning
      ? "the stored flag is true and the record shows no zone-mismatch warning"
      : `the stored flag is false and the record shows «${o.read && o.read.text}» anyway`);
  sink(id, "visible",
    !expectWarning || (o.read.present && o.read.inWindow && o.read.onTop),
    o.read && o.read.present
      ? `the warning sits at y=${o.read.rect.y}..${o.read.rect.y + o.read.rect.h} in a `
        + `${o.read.viewportH}px window; elementFromPoint says ${o.read.hitName}`
      : "there is no warning to place");
  const blank = o.spreads.filter((s) => s.delta < DELTA_FLOOR);
  sink(id, "painted",
    expectWarning
      ? (o.spreads.length === 1 && blank.length === 0)
      : (o.read && o.read.present === false),
    expectWarning
      ? blank.map((s) => `the warning's rect covers ${s.px}px and blanking its text changes them `
        + `by ${s.delta.toFixed(2)} levels, under the ${DELTA_FLOOR} floor`).join("; ")
      : "the warning is absent from the DOM rather than merely unpainted");
}

// ---------------------------------------------------------------------------
const browser = await chromium.launch({ headless: !HEADED });
const expected = CASES.length * SIZES.length + CASES.length + CANARY_RUNS;
let discovered = 0, attempted = 0, completed = 0;
const canary = { id: "the-stored-flag-flipped-to-false-on-the-way-to-the-page",
  observed_failure: false, problems: [], runs: [] };
const made = [];

try {
  // ── MAKE THE TWO BOOKINGS ────────────────────────────────────────────────
  for (const kase of CASES) {
    console.log(`  booking "${kase.key}" — ${kase.why}`);
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    countQuotes(page);
    watchConsole(page, `booking ${kase.key}`, consoleNoise);
    let row;
    try { row = await book(page, kase.address); } finally { await ctx.close(); }
    made.push(row);
    kase.booking = row;

    // THE JOINT THAT HAD NEVER BEEN EXERCISED.
    discovered++; attempted++;
    check(`booking ${kase.key}`, "stored", row.travel_zone_address_mismatch === kase.expectFlag,
      `the column reads ${JSON.stringify(row.travel_zone_address_mismatch)} where `
      + `${kase.expectFlag} was expected, for ${JSON.stringify(row.customer_address)} `
      + `under zone ${JSON.stringify(row.travel_zone)}`);
    observed.push(`${kase.key}: zone ${JSON.stringify(row.travel_zone)} · `
      + `address ${JSON.stringify((row.customer_address || "").slice(0, 38))} · `
      + `stored flag ${JSON.stringify(row.travel_zone_address_mismatch)} `
      + `(expected ${kase.expectFlag})`);
    completed++;
  }

  // ── THE RECORD, AT EVERY WIDTH ───────────────────────────────────────────
  for (const size of SIZES) {
    for (const kase of CASES) {
      const label = `${size.w}x${size.h} ${kase.key}`;
      console.log(`  ${label}`);
      discovered++; attempted++;
      const o = await target(browser, size, kase, kase.booking, {
        label, stem: `${size.w}x${size.h}-${kase.key}`,
      });
      grade(label, o, kase.expectFlag, check);
      completed++;
    }
  }

  // ── THE CANARY, FIVE TIMES ───────────────────────────────────────────────
  const far = CASES.find((c) => c.key === "far");
  console.log(`  canary x${CANARY_RUNS} — the stored flag flipped to false on the way to the page; it MUST fail`);
  for (let run = 1; run <= CANARY_RUNS; run++) {
    discovered++; attempted++;
    const problems = [];
    const o = await target(browser, { w: 1440, h: 900 }, far, far.booking, {
      label: `canary ${run}`, stem: `canary-${run}`, canary: true,
    });
    grade(`canary ${run}`, o, true, (t, name, cond, detail) => {
      assertions++;
      if (cond) return;
      problems.push(`${name} ${detail}`.trim());
    });
    const caught = problems.some((p) => p.startsWith("warning"));
    console.log(`    run ${run}: ${caught ? "caught" : "MISSED"}${caught ? ` — ${problems[0].slice(0, 76)}` : ""}`);
    canary.runs.push({ run, caught, problems });
    canary.problems.push(...problems.map((p) => `run ${run}: ${p}`));
    completed++;
  }
  const caughtCount = canary.runs.filter((r) => r.caught).length;
  canary.observed_failure = caughtCount === CANARY_RUNS;
  canary.caught = `${caughtCount}/${CANARY_RUNS}`;
} finally {
  await browser.close();
  // THE TWO ROWS GO AWAY AGAIN, the way `e2e-booking.mjs` does it. A killed
  // process does not reach this, which is why the customer name carries this
  // run's own stamp — a leftover is identifiable rather than anonymous.
  if (!KEEP) {
    for (const r of made) await dbDel(`/rest/v1/bookings?id=eq.${r.id}`);
    console.log(`\ncleaned up ${made.length} booking(s)`);
  } else {
    console.log(`\n--keep: left ${made.map((r) => r.id.slice(0, 8)).join(", ")} in place`);
  }
}

console.log("\nWhat the database actually stored:");
for (const o of observed) console.log("  " + o);
if (consoleNoise.length) {
  console.log("\nConsole (the two known React Router v7 warnings are dropped by name):");
  for (const c of consoleNoise) console.log("  " + c);
}

const SCOPE = "Two real bookings on demo-detail, created through the public page and deleted "
  + "afterwards. Both addresses were already in address_points, so NO Geoapify credit was "
  + "spent; mail went to e2e@fixture.test, so the provider leg is deliberately unproven and "
  + "is not this file's subject. Both bookings picked the SAME zone — the default, near one — "
  + "so the only difference between them is the address typed. The owner-email path that also "
  + "carries this flag was NOT exercised.";

const status = failures.length === 0 && canary.observed_failure && consoleNoise.length === 0
  ? "pass" : "fail";
const { path } = writeReceipt({
  check_id: "zone-mismatch",
  started_at,
  status,
  expected_targets: expected,
  discovered_targets: discovered,
  attempted_targets: attempted,
  completed_targets: completed,
  skipped_targets: 0,
  assertions_executed: assertions,
  min_assertions: 62,
  assertion_floor:
    "2 bookings x 1 stored-value assertion + 2 bookings x 5 widths x 4 questions + 5 canary "
    + "runs x 4 = 62. Fixed by CASES x SIZES x the question list, never by what the run finds: "
    + "a record that will not open grades as four failures rather than dropping out, so the "
    + "number cannot fall without a diff. A tripwire on the code, not a run-time check.",
  failures: [...failures, ...consoleNoise.map((c) => `console: ${c}`)],
  artifacts,
  warnings: [
    SCOPE,
    ...(BREAK ? [`run with --break=${BREAK}; this receipt is a sabotage, not a result`] : []),
    ...(KEEP ? ["run with --keep; two bookings were left in the demo tenant"] : []),
  ],
  dimensions: {
    slug: SLUG,
    scope: SCOPE,
    sizes: SIZES.map((s) => `${s.w}x${s.h}`),
    cases: CASES.map((c) => `${c.key}: ${c.why}`),
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
