// ROADMAP 0.11d1 — THE OVER-CAP REFUSAL, ON THE SCREEN, WHERE A PERSON READS IT.
//
//   set -a; . ./.env; set +a
//   npm run dev --prefix app
//   node scripts/overcap-sentence.mjs
//   node scripts/overcap-sentence.mjs --break=plain
//
// Dev server + the seeded demo tenant + credentials. It writes nothing: no
// upload is attempted, no row is inserted, no byte reaches any store.
//
// ---------------------------------------------------------------------------
// WHY A BROWSER AND NOT ANOTHER STRING TEST
// ---------------------------------------------------------------------------
// `tests/overcap-refusal.test.mjs` proves the product PRODUCES the sentence.
// It cannot prove a person can READ it, and those are different questions:
// `docs/gotchas.md` 100 is this repo's own case of exactly that — a hit test
// said the calendar legend was uncovered while it was painted over at 1.47:1.
// So this opens the real screen, provokes the real refusal through the product's
// own code path, and asks whether the sentence is actually painted, legible and
// whole at 1440 and 392.
//
// ---------------------------------------------------------------------------
// HOW THE CAP IS FILLED, AND WHY THIS IS NOT A STUB OF THE PRODUCT
// ---------------------------------------------------------------------------
// `job_photos` holds 0 rows and the per-business share is 10.24 MB, so nothing
// is near the cap and **there is no way to fill it today**: job photos upload
// through `photo-door`, which is not deployed (0.11c measured it), so no photo
// can be stored in order to run the allowance down.
//
// What is intercepted is therefore the ONE thing that cannot be arranged: the
// `job_photo_budget` answer, replaced with a full budget — a real answer this
// RPC will really give, in the shape it really gives it. **Everything after
// that is the product's**: `roomFor` makes the decision, `fullWords` composes
// the sentence, `t` translates it, and `JobPhotos.jsx` renders it into
// `.error-box`. Nothing in `app/src` is patched and no product branch is
// bypassed.
//
// The figures are chosen so the two never format alike (9.0 MB of 10.2 MB): a
// sentence naming one number twice would otherwise read as naming both.
//
// ---------------------------------------------------------------------------
// WHAT IT ASKS AT EACH WIDTH
// ---------------------------------------------------------------------------
//   1. the refusal is on the screen at all — `.error-box` present and visible;
//   2. it names the space used, the limit, and what frees room;
//   3. its PIXELS ARE PAINTED — the element is hit-tested at its own centre, so
//      a sentence rendered under the tab bar or behind a scrim is caught
//      (`docs/gotchas.md` 100 is why this is asked separately from "is it
//      there");
//   4. it is not clipped — no horizontal overflow inside its own box, and the
//      full text is in the DOM rather than ellipsed away;
//   5. the console is clean at that width.
//
// `--break=wrong-figures` answers the allowance RPC with a different budget, so
// the product composes a sentence of exactly the right SHAPE whose numbers are
// not this run's. It is the sabotage that matters here, because a gate keyed on
// the shape of a sentence - "names two MB figures and the word remove" - passes
// a sentence with invented numbers in it, and invented numbers are the fault
// this file is here to make impossible.

import { mkdirSync } from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

// Playwright lives in `app/node_modules`, not the repo root — the same require
// every other browser script here uses.
const { chromium } = createRequire(import.meta.url)("./../app/node_modules/playwright/index.js");
import { writeReceipt } from "./receipt.mjs";
import { demoOwner } from "./lib/demoOwner.mjs";
import { fullWords, mb } from "../app/src/lib/photo-rules.js";

const started_at = new Date().toISOString();
const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, "..");
const SHOTS = path.join(REPO, ".manager-shots");
const BASE = process.env.BASE || "http://localhost:5173";
const SLUG = "demo-detail";
const HEADED = process.argv.includes("--headed");
const BREAK = (process.argv.find((a) => a.startsWith("--break=")) || "").split("=")[1] || "";

const KNOWN_BREAKS = ["wrong-figures"];
if (BREAK && !KNOWN_BREAKS.includes(BREAK)) {
  // `docs/gotchas.md` 105: an unrecognised break must not red the run by
  // accident, or a broken gate satisfies its own acceptance test.
  console.error(`Unknown --break=${BREAK}. Known: ${KNOWN_BREAKS.join(", ")}.`);
  console.error("NOTHING ran and NO receipt was written. This is not a pass.");
  process.exit(2);
}

const URL_ = process.env.SUPABASE_URL;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_ || !SERVICE) {
  console.error("\nSKIPPED — needs SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the root .env.");
  console.error("NOTHING ran and NO receipt was written. This is not a pass.");
  process.exit(2);
}
// THE PROJECT IS CONFIRMED BEFORE THE FIRST QUERY. `adtlnvihwrcqcasqcjwd` is
// Andrew's real business and nothing here may touch it.
if (!URL_.includes("kguqylyzgyzfktkfnhjb")) {
  console.error(`\nREFUSING: SUPABASE_URL is not this platform's project — ${URL_}`);
  console.error("NOTHING ran and NO receipt was written. This is not a pass.");
  process.exit(2);
}
const OWNER = demoOwner();

const svc = async (p) => {
  const res = await fetch(URL_ + p, { headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}` } });
  return res.json().catch(() => null);
};
const biz = (await svc(`/rest/v1/businesses?select=id&slug=eq.${SLUG}`))?.[0]?.id;
if (!biz) {
  console.error(`\nSKIPPED — no business with slug "${SLUG}". Run: node scripts/seed-demo.mjs`);
  console.error("NOTHING ran and NO receipt was written. This is not a pass.");
  process.exit(2);
}
const job = (await svc(
  `/rest/v1/bookings?select=id,customer_name&business_id=eq.${biz}&deleted_at=is.null&order=customer_name&limit=1`))?.[0];
if (!job) {
  console.error("\nSKIPPED — the demo tenant has no job, so there is no photos section to measure.");
  console.error("NOTHING ran and NO receipt was written. This is not a pass.");
  process.exit(2);
}

// The full budget the RPC is made to answer with. 9.0 MB of 10.2 MB.
const FULL = { used_bytes: Math.round(9.0 * 1048576), cap_bytes: Math.round(10.24 * 1048576) };
const EXPECTED = fullWords(FULL);          // what the product should compose
const PRE_FIX = "Photo storage is full. Remove some photos to add more.";

const WIDTHS = [
  { label: "1440", width: 1440, height: 900 },
  { label: "392", width: 392, height: 844 },
  { label: "320", width: 320, height: 720 },   // the narrowest supported width
];

let passed = 0, assertions = 0, expectedTargets = WIDTHS.length, completed = 0;
const failures = [];
const findings = [];
const artifacts = [];
const check = (name, ok, got = "") => {
  assertions++;
  if (ok) { passed++; console.log(`    ok    ${name}`); return true; }
  failures.push(got ? `${name} — got ${got}` : name);
  findings.push(got ? `${name} — got ${got}` : name);
  console.log(`    FAIL  ${name}${got ? ` — got ${got}` : ""}`);
  return false;
};

mkdirSync(SHOTS, { recursive: true });
console.log(`Over-cap refusal on "${job.customer_name}" (${job.id.slice(0, 8)}) at ${BASE}`);
console.log(`Expecting: ${JSON.stringify(EXPECTED)}\n`);
if (BREAK) console.log(`  note  --break=${BREAK} is set: this run is a sabotage and MUST be red.\n`);

const browser = await chromium.launch({ headless: !HEADED });
const consoleNoise = [];
let signedIn = null;

try {
  for (const w of WIDTHS) {
    console.log(`  ${w.label}x${w.height}`);
    const ctx = await browser.newContext({
      viewport: { width: w.width, height: w.height },
      deviceScaleFactor: 1,
      ...(signedIn ? { storageState: signedIn } : {}),
    });
    const page = await ctx.newPage();
    page.on("console", (m) => {
      if (m.type() === "error" || m.type() === "warning") {
        consoleNoise.push(`${w.label} · ${m.type()} · ${m.text().slice(0, 200)}`);
      }
    });
    page.on("pageerror", (e) => consoleNoise.push(`${w.label} · pageerror · ${String(e.message).slice(0, 200)}`));

    // THE ONE INTERCEPT: the allowance answer, in the shape the RPC gives it.
    await page.route("**/rest/v1/rpc/job_photo_budget*", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([{ used_bytes: FULL.used_bytes, cap_bytes: FULL.cap_bytes }]),
      }));

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
        localStorage.setItem("dp.tours", JSON.stringify(["shell", "today", "calendar", "money", "clients", "business"]));
        localStorage.setItem("dp.tour", "1");
      } catch { /* private mode */ }
    });

    await page.goto(`${BASE}/job/${job.id}`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector('[data-tour="photos"]', { timeout: 30000 });
    await page.waitForTimeout(1200);
    await page.evaluate(() => document.fonts.ready).catch(() => {});

    // PROVOKE THE REAL REFUSAL: hand the real file input a file bigger than the
    // room left, which is the press a detailer makes. `onFiles` then runs the
    // product's own `roomFor` -> `fullWords` -> `setError` path. The file is
    // 2 MB against 1.2 MB of room, so it is refused BEFORE any upload is
    // attempted — nothing is sent anywhere.
    const input = page.locator('[data-tour="photos"]').locator("xpath=..").locator('input[type=file]').first();
    const count = await page.locator('input[type=file]').count();
    check(`${w.label} · the photos section has a file input to press`, count > 0, String(count));

    if (BREAK === "wrong-figures") {
      // Still the product's own path and the product's own press: only the
      // server's answer differs, so the sentence is composed by `fullWords` as
      // always and simply states a budget that is not the one asserted below.
      await page.unroute("**/rest/v1/rpc/job_photo_budget*");
      await page.route("**/rest/v1/rpc/job_photo_budget*", (route) =>
        route.fulfill({ status: 200, contentType: "application/json",
          body: JSON.stringify([{ used_bytes: 3 * 1048576, cap_bytes: 4 * 1048576 }]) }));
      await page.reload({ waitUntil: "domcontentloaded" });
      await page.waitForSelector('[data-tour="photos"]', { timeout: 30000 });
      await page.waitForTimeout(1200);
    }

    await page.setInputFiles('input[type=file]',
      { name: "big.jpg", mimeType: "image/jpeg", buffer: Buffer.alloc(2 * 1048576, 7) }).catch(() => {});
    await page.waitForTimeout(900);

    const box = page.locator(".error-box").first();
    const present = await box.count() > 0 && await box.isVisible().catch(() => false);
    check(`${w.label} · the refusal is on the screen`, present);

    if (!present) { await ctx.close(); continue; }

    const said = (await box.innerText()).trim();
    check(`${w.label} · it names the space used (${mb(FULL.used_bytes)})`, said.includes(mb(FULL.used_bytes)), JSON.stringify(said));
    check(`${w.label} · it names the limit (${mb(FULL.cap_bytes)})`, said.includes(mb(FULL.cap_bytes)), JSON.stringify(said));
    check(`${w.label} · it names what frees room`, /\b(remove|delete)\b/i.test(said), JSON.stringify(said));
    check(`${w.label} · and it is the sentence the product composes`, said === EXPECTED, JSON.stringify(said));

    // ITS PIXELS ARE PAINTED. `docs/gotchas.md` 100: "is it there" and "can it
    // be read" are different questions, and only the second one matters here.
    //
    // **THE SCROLL HAPPENS BEFORE THE HIT TEST, AND THE FIRST VERSION HAD IT
    // AFTER — WHICH PRINTED A FALSE DEFECT AT 320 OVER A SCREEN RENDERING
    // PERFECTLY.** `document.elementFromPoint` is VIEWPORT-relative and returns
    // `null` for a point below the fold, and the photos section sits far down a
    // job record at 320x720. `null` was being read as "covered by something",
    // so the one width where the box starts off-screen reported the one thing
    // this gate exists to catch. 1440 and 392 passed because the box happened
    // to be in view, which is what made it look like a real narrow-width bug.
    // The screenshot — taken after the scroll — showed the sentence whole.
    // `docs/gotchas.md` 110's shape: a false defect is the direction that gets
    // working code "fixed".
    await box.scrollIntoViewIfNeeded().catch(() => {});
    await page.waitForTimeout(250);
    const paint = await box.evaluate((el) => {
      const r = el.getBoundingClientRect();
      const cx = Math.round(r.left + r.width / 2), cy = Math.round(r.top + r.height / 2);
      const hit = document.elementFromPoint(cx, cy);
      const cs = getComputedStyle(el);
      return {
        rect: { w: Math.round(r.width), h: Math.round(r.height), top: Math.round(r.top) },
        // A null hit means the point is OUTSIDE the viewport, which is not the
        // same fact as "something is on top of it" and must never be folded in
        // with it — that conflation was this gate's own false defect at 320.
        offscreen: !hit,
        covered: !!hit && !(el === hit || el.contains(hit) || hit.contains(el)),
        coveredBy: hit ? `${hit.tagName.toLowerCase()}.${hit.className || ""}`.slice(0, 60) : null,
        opacity: cs.opacity, visibility: cs.visibility, display: cs.display,
        clipped: el.scrollWidth > el.clientWidth + 1,
        inView: r.top >= 0 && r.bottom <= window.innerHeight + r.height,
      };
    });
    check(`${w.label} · its own centre is in the viewport to be hit-tested at all`,
      !paint.offscreen, paint.offscreen ? `rect ${JSON.stringify(paint.rect)}` : "");
    check(`${w.label} · its own centre is not covered by anything`, !paint.covered, paint.coveredBy || "");
    check(`${w.label} · it is actually painted (opacity, visibility)`,
      paint.opacity !== "0" && paint.visibility !== "hidden" && paint.display !== "none",
      JSON.stringify({ o: paint.opacity, v: paint.visibility, d: paint.display }));
    check(`${w.label} · the sentence is not clipped inside its own box`, !paint.clipped,
      JSON.stringify(paint.rect));

    const shot = path.join(SHOTS, `overcap-${w.label}${BREAK ? `-break-${BREAK}` : ""}.png`);
    await page.screenshot({ path: shot });
    artifacts.push(path.relative(REPO, shot).replace(/\\/g, "/"));
    console.log(`    shot  ${path.relative(REPO, shot)}`);

    completed++;
    await ctx.close();
  }

  // THE CONSOLE, READ AT EVERY WIDTH RATHER THAN ONCE.
  const noise = consoleNoise.filter((n) =>
    // The door is not deployed, so its own absence is expected here and is not
    // this item's defect; anything else is.
    !/photo-door|Failed to load resource.*functions\/v1/i.test(n));
  check("the console is clean at every width", noise.length === 0, noise.slice(0, 3).join(" | "));
} finally {
  await browser.close();
}

const failed = failures.length;
console.log(`\n${passed} passed, ${failed} failed, ${assertions} assertions, ${completed}/${expectedTargets} widths.`);
if (BREAK) console.log(`  note  --break=${BREAK} was set: a GREEN run here is the failure.`);
if (findings.length) {
  console.log("\nFINDINGS");
  for (const f of findings) console.log(`  · ${f}`);
}

// THE CANARY, RE-JUDGED EVERY RUN: the pre-fix sentence put through the same
// naming rules the assertions use. If it ever passes them, the rules have
// stopped meaning anything and this run's green is worthless.
const canaryCaught = !(PRE_FIX.includes(mb(FULL.used_bytes)) && PRE_FIX.includes(mb(FULL.cap_bytes)));

const { path: receiptPath } = writeReceipt({
  check_id: "overcap-sentence",
  started_at,
  status: failed ? "fail" : "pass",
  expected_targets: expectedTargets,
  discovered_targets: expectedTargets,
  attempted_targets: expectedTargets,
  completed_targets: completed,
  skipped_targets: 0,
  assertions_executed: assertions,
  min_assertions: 20,
  assertion_floor: "10 per width (input, present, used, limit, relief, exact, in-viewport, uncovered, painted, "
    + "unclipped) x 3 widths + 1 console = 31 when every width renders. A width whose screen never renders books "
    + "its first two as failures rather than dropping out, so the count cannot silently fall below 20.",
  canary: {
    id: "the-pre-fix-sentence",
    observed_failure: canaryCaught,
    what: "'Photo storage is full. Remove some photos to add more.' — what the screen said before 0.11d1",
    rule: "names_used + names_limit",
  },
  failures,
  artifacts,
  dimensions: {
    roadmap: "0.11d1",
    criterion: "an over-cap upload is refused with used space, limit and deletion guidance in the message",
    expected_sentence: EXPECTED,
    budget: { used: mb(FULL.used_bytes), cap: mb(FULL.cap_bytes) },
    widths: WIDTHS.map((w) => w.label),
    job: job.id,
    sabotage: BREAK || null,
    intercepted: "job_photo_budget only — the cap cannot be filled today because photo-door is not deployed",
    unjudgeable: [],
  },
  warnings: [
    "The expense path's copy of this sentence is not on this screen; tests/overcap-refusal.test.mjs § 3 covers its wiring.",
    "photo-door is not deployed, so its own 503 noise is filtered from the console check and nothing else is.",
  ],
});
console.log(`\nreceipt  ${receiptPath}  —  validate: node scripts/receipt.mjs`);
process.exit(failed ? 1 : 0);
