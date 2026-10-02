// DOES THE CLIENT RECORD STILL CARRY ITS FOUR BASICS? — ROADMAP 9.7.
//
//   node scripts/client-card.mjs                  # the sweep
//   node scripts/client-card.mjs --headed         # watch it
//   node scripts/client-card.mjs --break=early    # sabotage: read the modal too soon
//   node scripts/client-card.mjs --break=canary   # sabotage: drop the canary
//   node scripts/receipt.mjs receipts/client-card.json
//
// Dev server on :5173 and the seeded demo business. **Nothing is written** —
// the New booking modal is opened and read, never submitted — and nothing is
// deleted. It touches none of the booking page's public endpoints
// (`docs/shared-resources.md` § 1), so it is safe beside a session working on
// the live site.
//
// ---------------------------------------------------------------------------
// WHY THIS EXISTS WHEN THE ITEM IS ALREADY BUILT
// ---------------------------------------------------------------------------
// 9.7 asked for four things the client record was missing: a **Text** button,
// the **vehicle**, the **address**, and **Book again** opening New booking
// **prefilled**. All four are built and were verified live on 2026-09-20. The
// item is still `[ ]` only because it waits on Andrew's own press.
//
// **So the only thing holding those four in place is a paragraph in
// `ROADMAP.md` and one session's memory of pressing them.** That is the shape
// this repo keeps paying for. Four separate features on one screen, each one a
// render a refactor can silently drop, and no check anywhere asks after them.
//
// ---------------------------------------------------------------------------
// THE ONE THAT IS NOT A PRESENCE CHECK
// ---------------------------------------------------------------------------
// **`book-again` asserts the form is PREFILLED, not that a button exists**,
// and that distinction is the item's own ruling. Andrew, 2026-09-20, on the
// fork this item stopped at: *a "Book again" that opens a blank form is worse
// than no button, because it teaches a detailer the feature doesn't work.* A
// check that only asked "is the button there" would pass the exact outcome he
// refused.
//
// So the check opens it and reads the three fields `pick()` fills — name,
// phone, email — and compares them against the customer whose record it came
// from, taken from that record's own `tel:` and `mailto:` links rather than
// from anything typed here.
//
// **AND THE CANARY IS THE PRODUCT'S OWN BLANK PATH, NOT AN INJECTION.** The
// same modal is opened from the shell's global "+", where it is supposed to be
// empty, and `book-again` must FAIL there. If it passes, the assertion cannot
// tell prefilled from blank and proves nothing — which is precisely the
// outcome the ruling was about. No CSS is injected and nothing is stubbed: the
// negative control is a real screen that really is empty.
//
// ---------------------------------------------------------------------------
// WHAT IT ASKS, PER WIDTH
// ---------------------------------------------------------------------------
//   subjects    a client record opened, and it belongs to a customer with
//               booking history. Zero is a failure — the vehicle and address
//               come from the most recent visit, so a customer with none would
//               make the two questions below vacuous.
//   contact     `tel:` AND `sms:` both present and both pointed at the same
//               number. **`sms:` is the 9.7 half**; `tel:` is here because a
//               Text button beside a missing Call button is a different bug.
//   facts       "Last vehicle" and "Last address" both present AND non-empty.
//   book-again  the button exists, and pressing it opens New booking with the
//               customer already picked — see above.
//
// ---------------------------------------------------------------------------
// TWO SABOTAGES
// ---------------------------------------------------------------------------
// `--break=early` reads the modal the instant it opens, before the mount
// effect has run `pick()`. That is the real instrument trap here: a check that
// does not wait calls a working prefill broken, which is how 2.32's first
// probe reported 41 of 41 legal chips failing. `--break=canary` drops the
// canary so nothing is observed and `receipt.mjs` refuses the receipt.

import "../tests/_env.mjs";

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

// 320 FIRST — the record is a sheet there and a column at a desk, so the two
// shapes are different renders of the same four facts.
const SIZES = [
  { w: 320, h: 844 }, { w: 392, h: 844 }, { w: 768, h: 1024 },
  { w: 1440, h: 900 }, { w: 1920, h: 1080 },
];

// How many rows to try before giving up on finding one with history. Declared
// rather than "however many there are": a run that had to open nine records to
// find a usable one is telling you something about the seed.
const MAX_ROWS = 6;
const ART = fileURLToPath(new URL("../artifacts/client-card/", import.meta.url));

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

/** Read the record that is open: its links, its two facts, its buttons. */
const READ_RECORD = () => {
  const rec = document.querySelector(".record, .sheet-body");
  if (!rec) return null;
  const txt = rec.innerText || "";
  const hrefs = [...rec.querySelectorAll("a")].map((a) => a.getAttribute("href")).filter(Boolean);
  const after = (label) => {
    const m = txt.match(new RegExp(`${label}\\n([^\\n]*)`));
    return m ? m[1].trim() : null;
  };
  return {
    who: txt.split("\n")[0]?.trim() ?? "",
    tel: hrefs.find((h) => h.startsWith("tel:")) ?? null,
    sms: hrefs.find((h) => h.startsWith("sms:")) ?? null,
    mailto: hrefs.find((h) => h.startsWith("mailto:")) ?? null,
    lastVehicle: after("Last vehicle"),
    lastAddress: after("Last address"),
    bookAgain: [...rec.querySelectorAll("button")]
      .some((b) => /Book again/i.test(b.innerText || "")),
  };
};

/**
 * Every value the New booking modal is currently holding.
 *
 * **IT READS VALUES, NOT NAMED FIELDS, AND THE FIRST VERSION DID THE
 * OPPOSITE — 2026-09-23.** That version looked for `input[type=tel]` and
 * `input[type=email]`, borrowed from `discount-label.mjs`, which walks the
 * PUBLIC BOOKING PAGE. **This modal is a different form and every one of its
 * fields is a plain `type="text"`**, so both lookups found nothing, both came
 * back empty, and the check reported a fully prefilled form as broken at all
 * five widths. The product was never wrong.
 *
 * Addressing them by their LABELS would work and would be the wrong trade —
 * `label-guard.mjs` exists because 45 controls in this repo are already
 * addressed by their words, and a rename blinds the check while every line
 * still reads normally. So the question is asked the other way round: **is the
 * customer's name in here somewhere?** A blank form holds none of it, which is
 * all the canary needs, and no field can be renamed out from under it.
 */
const READ_MODAL = () => {
  const sheet = document.querySelector(".sheet-body") || document.body;
  const vis = [...sheet.querySelectorAll("input, textarea")].filter((i) => {
    const r = i.getBoundingClientRect();
    return r.width > 8 && r.height > 8
      && (typeof i.checkVisibility !== "function"
        || i.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true }));
  });
  return {
    open: !!document.querySelector(".sheet-body") && vis.length > 0,
    fields: vis.length,
    values: vis.map((i) => String(i.value || "")).filter(Boolean),
  };
};

rmSync(ART, { recursive: true, force: true });
mkdirSync(ART, { recursive: true });

let signedIn = null;

async function openApp(browser, size, label) {
  const ctx = await browser.newContext({
    viewport: { width: size.w, height: size.h }, deviceScaleFactor: 1,
    storageState: signedIn || undefined,
  });
  const page = await ctx.newPage();
  watchConsole(page, label, consoleNoise);
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
  return { ctx, page };
}

/** Wait for the modal, then read it — unless `--break=early` says not to. */
async function readModal(page) {
  if (BREAK !== "early") {
    await page.waitForSelector("input[type=tel]", { timeout: 15000 }).catch(() => {});
    await settle(page, 2000);
  }
  return page.evaluate(READ_MODAL);
}

async function sweep(browser, size) {
  const label = `${size.w}x${size.h}`;
  const { ctx, page } = await openApp(browser, size, label);
  try {
    await page.goto(BASE + "/app/clients", { waitUntil: "domcontentloaded" });
    await page.waitForSelector(".row-item", { timeout: 30000 });
    await settle(page, 2000);

    // A customer WITH HISTORY, found by opening records rather than by name —
    // `label-guard.mjs` exists because 45 controls here are addressed by their
    // words, and a seed rename would blind a check keyed to one.
    let rec = null, tried = 0;
    for (let i = 0; i < MAX_ROWS; i++) {
      const n = await page.locator(".row-item").count();
      if (i >= n) break;
      tried++;
      // **THE NAME COMES FROM THE ROW THAT WAS CLICKED, NOT FROM THE RECORD'S
      // FIRST LINE — 2026-09-23.** At a desk the record is a column whose
      // first line is the customer's name; at 320 it is a SHEET, whose title
      // sits in the sheet's header outside `.sheet-body`, so the first line
      // inside it is the visit count. The check read «3» as a customer's name
      // at the three narrow widths and failed a form that was correctly
      // filled in. The row is the thing a detailer actually pressed.
      const rowName = (await page.locator(".row-item").nth(i).innerText())
        .split("\n")[0].trim();
      await page.locator(".row-item").nth(i).click();
      await settle(page, 2200);
      const r = await page.evaluate(READ_RECORD);
      if (r) r.who = rowName || r.who;
      if (r && r.lastVehicle) { rec = r; break; }
      await page.keyboard.press("Escape");
      await settle(page, 1000);
    }

    let modal = null;
    if (rec && rec.bookAgain) {
      await page.locator("button", { hasText: /Book again/i }).first().click();
      modal = await readModal(page);
      await page.screenshot({ path: `${ART}${label}-book-again.png`, animations: "disabled" });
      artifacts.push(`artifacts/client-card/${label}-book-again.png`);
      await page.keyboard.press("Escape");
      await settle(page, 800);
    } else {
      await page.screenshot({ path: `${ART}${label}-record.png`, animations: "disabled" });
      artifacts.push(`artifacts/client-card/${label}-record.png`);
    }
    return { rec, modal, tried };
  } finally {
    await ctx.close();
  }
}

/** The negative control: the same modal from the shell's "+", where it is blank. */
async function blankModal(browser, size) {
  const { ctx, page } = await openApp(browser, size, "canary");
  try {
    await page.goto(BASE + "/app/today", { waitUntil: "domcontentloaded" });
    await page.waitForSelector(".tabbar", { timeout: 30000 });
    await settle(page, 2000);
    // `[data-tour="new"]` rather than the button's words or its `+` glyph:
    // a tour hook is a stable handle that no rename touches.
    await page.locator('[data-tour="new"]').first().click();
    const modal = await readModal(page);
    await page.screenshot({ path: `${ART}canary-blank.png`, animations: "disabled" });
    artifacts.push("artifacts/client-card/canary-blank.png");
    return modal;
  } finally {
    await ctx.close();
  }
}

/** Is this modal filled in with THIS customer? */
function prefilled(rec, modal) {
  if (!modal || !modal.open) return { ok: false, why: "the modal did not open" };
  const digits = (v) => String(v || "").replace(/\D/g, "");
  const phone = digits((rec.tel || "").replace(/^tel:/, ""));
  const email = (rec.mailto || "").replace(/^mailto:/, "").toLowerCase();
  const vals = modal.values.map((v) => v.toLowerCase());
  const bad = [];
  if (rec.who && !vals.some((v) => v === rec.who.toLowerCase())) bad.push(`no field holds the name «${rec.who}»`);
  if (phone && !modal.values.some((v) => digits(v) === phone)) bad.push(`no field holds the phone ${phone}`);
  if (email && !vals.includes(email)) bad.push(`no field holds the email ${email}`);
  return { ok: bad.length === 0, why: bad.join("; ") };
}

function grade(id, { rec, modal, tried }, sink) {
  sink(id, "subjects", !!(rec && rec.lastVehicle),
    `opened ${tried} record(s) and none had booking history, so the facts below `
    + "would have been asked of a customer who has never visited");
  if (!rec) { sink(id, "contact", false, "no record"); sink(id, "facts", false, "no record");
    sink(id, "book-again", false, "no record"); return; }

  sink(id, "contact", !!(rec.tel && rec.sms && rec.tel.slice(4) === rec.sms.slice(4)),
    `tel=${rec.tel ?? "MISSING"} sms=${rec.sms ?? "MISSING"} — 9.7's Text button is the sms: one`);

  sink(id, "facts", !!(rec.lastVehicle && rec.lastAddress),
    `Last vehicle=${rec.lastVehicle ?? "MISSING"} Last address=${rec.lastAddress ?? "MISSING"}`);

  const pre = prefilled(rec, modal);
  sink(id, "book-again", rec.bookAgain && pre.ok,
    rec.bookAgain
      ? `the button is there but the form is not filled in for «${rec.who}»: ${pre.why}`
      : "no Book again button on the record");
}

// ---------------------------------------------------------------------------
const browser = await chromium.launch({ headless: !HEADED });
const expected = SIZES.length + 1;
let discovered = 0, attempted = 0, completed = 0;
const canary = { id: "the-blank-new-booking-form", observed_failure: false, problems: [] };

for (const size of SIZES) {
  const label = `${size.w}x${size.h}`;
  console.log(`  ${label}`);
  attempted++; discovered++;
  const out = await sweep(browser, size);
  grade(label, out, check);
  observed.push(`${label}: «${out.rec?.who ?? "no record"}»`
    + ` tel=${!!out.rec?.tel} sms=${!!out.rec?.sms}`
    + ` vehicle=${JSON.stringify(out.rec?.lastVehicle ?? null)}`
    + ` address=${JSON.stringify(out.rec?.lastAddress ?? null)}`
    + ` bookAgain=${!!out.rec?.bookAgain}`
    + ` prefilled=${JSON.stringify(out.modal ?? null)}`
    + ` (${out.tried} record(s) opened)`);
  completed++;
}

console.log("  canary — New booking opened from the shell, where it MUST be blank");
attempted++;
if (BREAK === "canary") {
  console.log("    SKIPPED — --break=canary");
} else {
  discovered++;
  const rec = { tel: "tel:000", mailto: "mailto:nobody@example.com", who: "nobody" };
  const modal = await blankModal(browser, SIZES[3]);
  const pre = prefilled(rec, modal);
  // It must NOT look prefilled. If it does, `book-again` cannot tell the
  // difference and the assertion above proves nothing.
  canary.observed_failure = !pre.ok;
  if (pre.ok) canary.problems.push("a blank New booking form passed the prefilled test");
  assertions++;
  console.log(`    ${canary.observed_failure ? "caught" : "MISSED"} — blank form reads `
    + `${JSON.stringify(modal)}`);
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
  check_id: "client-card",
  started_at,
  status,
  expected_targets: expected,
  discovered_targets: discovered,
  attempted_targets: attempted,
  completed_targets: completed,
  skipped_targets: 0,
  assertions_executed: assertions,
  min_assertions: SIZES.length * 4 + 1,
  assertion_floor:
    "5 widths x 4 questions + 1 canary = 21. Fixed by SIZES x the question list, never by what "
    + "the run finds: a width where no record opens grades as four failures rather than dropping "
    + "out, and a customer with no history fails `subjects` rather than making the two fact "
    + "questions vacuous.",
  failures: [...failures, ...consoleNoise.map((c) => `console: ${c}`)],
  artifacts,
  warnings: [
    "`book-again` asserts the form is PREFILLED, not that a button exists — Andrew's ruling was "
    + "that a Book again opening a blank form is worse than no button, and a presence check "
    + "would pass exactly that.",
    "Nothing is submitted: the New booking modal is opened, read and closed, so no booking row "
    + "is written and no booking-page endpoint is called.",
    ...(BREAK ? [`run with --break=${BREAK}; this receipt is a sabotage, not a result`] : []),
  ],
  dimensions: {
    sizes: SIZES.map((s) => `${s.w}x${s.h}`),
    max_rows_tried: MAX_ROWS,
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
