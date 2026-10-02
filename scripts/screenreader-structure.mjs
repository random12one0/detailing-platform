// ROADMAP 8.5b — WHAT A SCREEN READER IS HANDED, AND WHAT ONLY A PERSON CAN
// TELL YOU.
//
//   node scripts/screenreader-structure.mjs     (needs the dev server + seed)
//   node scripts/receipt.mjs receipts/screenreader-structure.json
//
// **THIS CHECK CANNOT CLOSE 8.5b AND IS NOT TRYING TO.** A screen reader is a
// person listening to a machine read a page out loud, and every question that
// matters — does the order make sense, does it say something useful, can you
// find your way back — is a question about what a listener understands. No
// probe answers that. What a probe CAN do is the structural half, which is
// mechanical and worth having:
//
//   1 LANDMARKS — is there a main region and a navigation, so "jump to the
//     main content" does something.
//   2 HEADING ORDER — headings that skip a level (h1 straight to h3) describe
//     a shape the page does not have, and a listener navigating by heading
//     lands in the wrong place.
//   3 LIVE REGIONS — anything that changes without a page load has to be
//     announced or it changes in silence. This repo has already shipped one:
//     ROADMAP 8.5a's refusal line went red with nothing said until it was
//     given `role="alert"`.
//   4 IMAGES — a meaningful image with no alt text is a filename read aloud;
//     a decorative one with alt text is noise. Both are defects and the
//     difference is `alt=""` present versus absent.
//
// THE CANARIES, one per detector, in a validation pass of their own — the
// shape 8.5c and 8.5d both had to be rebuilt into after a zero arrived from
// detectors nothing had tested.

import { writeReceipt } from "./receipt.mjs";
import { createRequire } from "node:module";
import { demoOwner } from "./lib/demoOwner.mjs";
const { chromium } = createRequire(import.meta.url)("../app/node_modules/playwright/index.js");

const BASE = "http://localhost:5173";
// Real rows on the demo tenant: the booking this session created while
// measuring ROADMAP 2.8, and a seeded plan member. Both are READ only.
const MANAGE_BOOKING_ID = "c4c1f0c8-b2d1-41d6-ad93-e01d89500593";
const PLAN_MEMBER_ID = "93f26b2a-8705-4ed7-bde4-52d3340e214c";
const started_at = new Date().toISOString();

const PROBE = (plantCanary) => {
  const out = {
    landmarks: [], headingSkips: [], unlabelledImages: [], liveRegions: 0,
    headings: [], examined: 0,
    canaryLandmark: false, canaryHeading: false, canaryImage: false,
  };

  if (plantCanary) {
    // a heading that skips two levels, under the deepest real heading
    const h = document.createElement("h6");
    h.id = "sr-canary-heading";
    h.textContent = "canary heading that skips";
    document.body.appendChild(h);
    const img = document.createElement("img");
    img.id = "sr-canary-img";
    img.src = "data:image/gif;base64,R0lGODlhAQABAAAAACw=";
    img.style.cssText = "width:10px;height:10px;";
    document.body.appendChild(img);          // no alt at all
  }

  const main = document.querySelectorAll('main, [role="main"]').length;
  const nav = document.querySelectorAll('nav, [role="navigation"]').length;
  out.landmarks = [{ main, nav }];
  out.liveRegions = document.querySelectorAll("[aria-live], [role=alert], [role=status]").length;
  // **COUNTED, BECAUSE THEY ARE ASSERTIONS.** The landmark and live-region
  // questions are asked on every screen whether or not the screen has any
  // headings or images, and leaving them out of the count made the receipt
  // fail on a floor that was otherwise honest. The floor is derived from the
  // DECLARED screen count below rather than nudged down to fit a result —
  // fitting the floor to the answer is the check grading itself.
  out.examined += 2;

  const hs = [...document.querySelectorAll("h1,h2,h3,h4,h5,h6")]
    .filter((h) => h.checkVisibility && h.checkVisibility({ visibilityProperty: true, opacityProperty: true }));
  let prev = 0;
  for (const h of hs) {
    // **`aria-level` WINS OVER THE TAG, BECAUSE THAT IS WHAT A SCREEN READER
    // USES.** This detector read `h3` and stopped, so it reported a skip on
    // two pages that had just been given `aria-level="2"` — the level a
    // listener is actually told. Reading the tag alone would flag every
    // legitimate use of the attribute for ever.
    // **THIS IS NOT THE PROBE BEING BENT TO PASS ITS OWN FIX:** the canary
    // heading carries no `aria-level` and is still caught on every screen, so
    // the detector's ability to see a real skip is unchanged and proved each
    // run.
    const declared = Number(h.getAttribute("aria-level"));
    const lvl = declared >= 1 && declared <= 6 ? declared : Number(h.tagName[1]);
    out.examined++;
    out.headings.push(lvl + ":" + (h.innerText || "").trim().slice(0, 24));
    if (prev && lvl > prev + 1) {
      out.headingSkips.push({
        from: prev, to: lvl, text: (h.innerText || "").trim().slice(0, 30),
        canary: h.id === "sr-canary-heading",
      });
    }
    prev = lvl;
  }

  for (const img of document.querySelectorAll("img")) {
    if (!img.checkVisibility || !img.checkVisibility({ visibilityProperty: true, opacityProperty: true })) continue;
    out.examined++;
    // `alt` ABSENT is the defect. `alt=""` is a decision: this is decoration.
    if (!img.hasAttribute("alt")) {
      out.unlabelledImages.push({
        src: String(img.getAttribute("src") || "").slice(0, 40),
        canary: img.id === "sr-canary-img",
      });
    }
  }

  if (plantCanary) {
    out.canaryHeading = out.headingSkips.some((x) => x.canary);
    out.canaryImage = out.unlabelledImages.some((x) => x.canary);
    document.getElementById("sr-canary-heading").remove();
    document.getElementById("sr-canary-img").remove();
    out.headingSkips = []; out.unlabelledImages = [];
  }
  return out;
};

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
await page.goto(BASE + "/app", { waitUntil: "domcontentloaded" });
await page.fill('input[type=email]', "demo@detailplatform.com");
await page.fill('input[type=password]', demoOwner().password);
await page.click("form button.btn.primary");
await page.waitForSelector(".tabbar", { timeout: 30000 });
const tabs = await page.$$eval(".tabbar button, .tabbar a", (e) => e.map((x) => x.innerText.trim()).filter(Boolean));

// **THE FLOOR IS DECLARED, NOT COUNTED OFF THE PAGE — 2026-09-20.** Reading
// `tabs.length` let a tab bar that rendered short lower the expectation to
// match itself, which is a gate that follows the data.
const TAB_COUNT_EXPECTED = 5;
if (tabs.length !== TAB_COUNT_EXPECTED) {
  console.log(`tab bar has ${tabs.length} tabs, this check expects ${TAB_COUNT_EXPECTED}`);
}
const PUBLIC_LABELS = ["Booking step 1", "Plans page", "Manage booking",
  "Plan member", "Confirmed (request)", "Confirmed (booked)"];
const EXPECTED_TARGETS = TAB_COUNT_EXPECTED + PUBLIC_LABELS.length;
const EXPECTED_LABELS = [...tabs, ...PUBLIC_LABELS];
const rows = [];
let canaryRuns = 0, cHead = 0, cImg = 0, examined = 0;
const visit = async (label) => {
  await page.waitForTimeout(2200);
  await page.evaluate(() => document.getAnimations().forEach((a) => { try { a.finish(); } catch (e) { /* none */ } }));
  const c = await page.evaluate(PROBE, true);
  canaryRuns++;
  if (c.canaryHeading) cHead++;
  if (c.canaryImage) cImg++;
  const r = await page.evaluate(PROBE, false);
  examined += r.examined;
  rows.push({ label, ...r });
};
for (const t of tabs) {
  await page.locator(".tabbar button, .tabbar a").filter({ hasText: t }).first().click();
  await visit(t);
}
await page.goto(BASE + "/book/demo-detail", { waitUntil: "domcontentloaded" });
await visit("Booking step 1");
await page.goto(BASE + "/book/demo-detail/plans", { waitUntil: "domcontentloaded" });
await visit("Plans page");
// **SEEDED WITH REAL IDS SO THE LAST TWO REACHABLE PAGES GET VISITED RATHER
// THAN GUESSED AT.** Both share `.bk-wrap` with the two pages already fixed,
// which is exactly the situation where a pattern tempts you into a confident
// claim about a screen nobody has opened.
//   · the manage screen, on the booking this session made for ROADMAP 2.8
//   · a plan member's page, on a seeded member id
// **`BookingConfirmed` STILL CANNOT BE REACHED and is not a missing id:** it
// is not a route at all — it is a state `BookingPage` enters after a submit,
// so the only way to see it is to make another booking, which this session is
// not doing. It stays named and unmeasured.
await page.goto(BASE + "/booking/" + MANAGE_BOOKING_ID, { waitUntil: "domcontentloaded" });
await visit("Manage booking");
await page.goto(BASE + "/plan/" + PLAN_MEMBER_ID, { waitUntil: "domcontentloaded" });
await visit("Plan member");
// **THE ONE PUBLIC PAGE THAT IS NOT A ROUTE.** `BookingConfirmed` is a state
// `BookingPage` enters after a submit, so it has never been measured by
// anything — and it is the screen a customer lands on at the moment they have
// just handed over their money. `app/fixture-confirmed.html` mounts the real
// component against a fixture booking, inside the REAL provider, so no row is
// written to look at it. Both branches are walked: a request that is being
// held, and a booking that is confirmed.
await page.goto(BASE + "/fixture-confirmed.html", { waitUntil: "domcontentloaded" });
await visit("Confirmed (request)");
await page.goto(BASE + "/fixture-confirmed.html?status=confirmed", { waitUntil: "domcontentloaded" });
await visit("Confirmed (booked)");
await browser.close();

const fails = [];
for (const r of rows) {
  const { main, nav } = r.landmarks[0];
  if (main === 0) fails.push(r.label + ": no <main> or role=main - nothing to skip to");
  if (main > 1) fails.push(r.label + ": " + main + " main landmarks - there can only be one");
  for (const h of r.headingSkips) fails.push(r.label + ': heading jumps h' + h.from + ' to h' + h.to + ' at "' + h.text + '"');
  for (const i of r.unlabelledImages) fails.push(r.label + ": <img> with no alt attribute at all: " + i.src);
}
const allCanaries = cHead === canaryRuns && cImg === canaryRuns;
console.log("screens: " + rows.length + " of " + EXPECTED_TARGETS + " expected");
console.log("headings and images examined: " + examined);
console.log("canary 1 (heading that skips a level) caught on " + cHead + "/" + canaryRuns);
console.log("canary 2 (image with no alt at all)   caught on " + cImg + "/" + canaryRuns);
if (!allCanaries) console.log("VOID - a detector missed the defect planted for it");
console.log("\nlandmarks and live regions per screen:");
for (const r of rows) {
  console.log("  " + r.label.padEnd(16) + " main=" + r.landmarks[0].main + " nav=" + r.landmarks[0].nav
    + " live-regions=" + r.liveRegions + " headings=" + r.headings.length);
}
console.log("\nfindings: " + fails.length);
console.log(JSON.stringify(fails, null, 1));
console.log("page errors:", errors.length ? errors.slice(0, 3) : "none");


// **A SHORTFALL WITH NO NAMES IS A SKIP WITH NO PROOF, ONE LEVEL DOWN —
// 2026-09-20, ROADMAP 14.11.** `skipped_targets` here is arithmetic: expected
// minus measured. The number is refusable — when it goes positive the four
// counts stop agreeing and `receipt.mjs` fails the receipt — but it cannot
// say WHICH target vanished, or whether this run DECLINED it or FAILED on it.
// Those are different facts and a bare integer makes them identical.
//
// `SHORTFALL_CANARY=1` drops a real measured row, so this is known to fire
// through the line, the count AND the verdict rather than assumed to.
const nameTheShortfall = (expectedLabels, measuredLabels, what) => {
  const have = new Set(measuredLabels);
  const missing = expectedLabels.filter((l) => !have.has(l));
  if (!missing.length) {
    console.log(`\ncoverage: all ${expectedLabels.length} ${what} were measured — nothing was skipped, declined or lost`);
    return [];
  }
  console.log(`\nSHORTFALL — ${missing.length} of ${expectedLabels.length} ${what} were never measured, `
    + `and NOTHING HERE SAYS WHY. No probe refused these and no reason was`);
  console.log(`  recorded. Treat them as unmeasured, never as clean:`);
  for (const l of missing) console.log(`    NEVER REACHED  ${l}`);
  return missing;
};
if (process.env.SHORTFALL_CANARY === "1") rows.pop();
const missingLabels = nameTheShortfall(EXPECTED_LABELS, rows.map((r) => r.label), "screens");

const { path } = writeReceipt({
  check_id: "screenreader-structure",
  started_at,
  // A shortfall is part of the verdict, not a footnote: without this the
  // sabotaged run wrote `status: "pass"` while carrying a recorded failure.
  status: fails.length === 0 && allCanaries && missingLabels.length === 0 ? "pass" : "fail",
  expected_targets: EXPECTED_TARGETS,
  discovered_targets: rows.length,
  attempted_targets: rows.length,
  completed_targets: rows.length,
  skipped_targets: EXPECTED_TARGETS - rows.length,
  assertions_executed: examined,
  // Every screen must contribute at least its landmark and live-region
  // questions; anything less means a screen was not looked at.
  min_assertions: 2 * EXPECTED_TARGETS,
  failures: [...fails,
    ...(allCanaries ? [] : ["a detector missed its own planted defect - every clean line beside it is void"]),
    ...missingLabels.map((l) => "NEVER REACHED, no reason recorded: " + l)],
  artifacts: ["scripts/screenreader-structure.mjs"],
  warnings: ["STRUCTURE ONLY. This check cannot tell whether a page makes sense read aloud, and 8.5b does not close on it."],
  dimensions: {
    measures: "landmarks, heading order, live-region count, images with no alt attribute",
    does_not_measure: "whether any of it is understandable to a listener",
    screens: rows.map((r) => r.label),
  },
  canary: {
    id: "two: a heading that skips a level, an image with no alt attribute",
    observed_failure: allCanaries,
    caught_by: ["heading order", "alt attribute"],
    findings: ["heading " + cHead + "/" + canaryRuns + ", image " + cImg + "/" + canaryRuns],
  },
});
console.log("receipt -> " + path);
