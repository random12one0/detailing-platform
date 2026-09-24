// DOES AN INNER SCROLL CONTAINER LEAVE ROOM FOR THE HIT AREA OF THE CONTROL IT
// PARKS AT ITS BOTTOM EDGE? — the item 2.32 spawned, 2026-09-23.
//
//   node scripts/scroller-clearance.mjs                 # the sweep
//   node scripts/scroller-clearance.mjs --headed        # watch it
//   node scripts/scroller-clearance.mjs --break=rect    # sabotage: measure the RECT
//   node scripts/scroller-clearance.mjs --break=canary  # sabotage: drop the canary
//   node scripts/receipt.mjs receipts/scroller-clearance.json
//
// Dev server on :5173 and the seeded demo business. No credentials of its own,
// nothing written, nothing deployed. **It does NOT clear `rate_hits`** the way
// `tabbar-clearance.mjs` does: neither screen here geocodes anything, and on
// 2026-09-23 another session was measuring the `address-suggest` buckets, so a
// check that empties them is a check corrupting somebody else's evidence.
//
// ---------------------------------------------------------------------------
// WHAT THIS IS AND WHY IT IS NOT tabbar-clearance.mjs
// ---------------------------------------------------------------------------
// 2.32 was a FIXED BAR painted on top of the bottom of a control, and the
// answer was `scroll-padding-bottom` on `html`, which governs the document
// scroller. **That rule cannot reach a scroller inside the page.** At 1440 and
// 1920 the back office's settings column stops at the screen's height and
// scrolls inside itself (`.settings-col > .settings-body`, theme.css), and a
// control the browser parks flush against that container's bottom edge has the
// part of it that hangs past its own box **clipped away by the container**.
//
// Measured before the fix, Booking rules at 1440x900: twelve `.choice` chips
// came up **42px and 41px against the 44px absolute**, every lost row at the
// BOTTOM, every one of them owned by `.app-main` — the thing visible below the
// scroller's clip edge at y 856. At 320, 392 and 768 the same chips measure
// 45px, because at those widths the settings screen is a page, the document is
// the scroller, and 2.32's rule applies. **The bar is not involved at 1440; it
// is a left rail there.**
//
// **THE PITCH WAS SUSPECTED AND IS INNOCENT, AND THAT IS WORTH KEEPING.** The
// entry's first suspicion was that `.choices`' 6px gap against a 4px overhang
// on each chip makes neighbouring hit areas overlap by 2px, so two chips trade
// rows. They do not overlap: the band is **44px** on a **46px** pitch —
// `getComputedStyle(el, '::after').height`, because `.choice` is `border-box`
// with a 1px border so the pseudo's containing block is the 36px padding box —
// which leaves **2px of slack**, not 2px of overlap. And the row-by-row walk
// settles it without arithmetic: the lost rows are a contiguous run at the
// bottom owned by an ANCESTOR, never an alternating pattern owned by a
// neighbouring `.choice`. **A gap would have been the wrong change in the
// wrong place.**
//
// ---------------------------------------------------------------------------
// THE MEASUREMENT IS THE HIT AREA, NEVER THE BOUNDING RECT
// ---------------------------------------------------------------------------
// Same trap as 2.32 and it caught that item's first probe, which walked the
// rect and reported 41 of 41 legal chips broken. CLAUDE.md's rule is 44px of
// REAL hit area and a deliberately small mark grows its target with an
// absolutely positioned `::after` at a negative inset. `.choice` is a 38px box
// that presses as 45. So the scan runs `rect.top - overhang` to
// `rect.bottom + overhang` with the overhang **read off the element's own
// `::after`**, and `--break=rect` is that bug on purpose.
//
// **THE WALK ITSELF LIVES IN `lib/hitArea.mjs`** — extracted 2026-09-23 when
// `bk-bar-clearance.mjs` needed the same measurement on the booking page. Two
// checks about the same absolute with two copies of the measurement is how two
// checks start disagreeing about what a control is.
//
// ---------------------------------------------------------------------------
// WHAT IT ASKS
// ---------------------------------------------------------------------------
//   subjects   the screen produced controls to measure. Zero is a failure, not
//              a quiet pass.
//   legal      with nothing over it, in the middle of the screen, the control
//              reaches 44px. Without this the scroller would be blamed for a
//              control that was too small to begin with.
//   reachable  after it takes focus — which is what `scroll-padding-bottom`
//              governs, and what `scrollIntoView` alone does NOT trigger for
//              an element already inside the viewport — 44 of those rows
//              survive. `elementFromPoint` names what took any that did not.
//   reserved   every scrolling ancestor found on the screen reserves at least
//              `--hit-overhang`. **This is the one that cannot pass vacuously
//              by luck.** `reachable` only fails when some control happens to
//              be parked flush; this asks the mechanism directly, so deleting
//              the rule reddens the run even on a screen where nothing
//              demonstrates it that night.
//
// A width where the column is a page has no inner scroller at all, which is
// the correct answer there and is recorded as `0 scroller(s)` rather than
// skipped. **So the run also carries a discovery floor**: across the whole
// sweep at least SCROLLER_FLOOR inner scrollers must be found. Without it, a
// layout change that quietly stopped making inner scrollers anywhere would
// turn `reserved` into fifteen assertions about nothing and the run would
// still print clean.
//
// ---------------------------------------------------------------------------
// TWO SABOTAGES
// ---------------------------------------------------------------------------
// `--break=rect` scans the bounding rect instead of the hit area, so every
// legal control must fail `legal`. `--break=canary` drops the injected canary,
// so nothing is observed and `receipt.mjs` refuses the receipt.

import "../tests/_env.mjs";

import { createRequire } from "node:module";
import { mkdirSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { writeReceipt } from "./receipt.mjs";
import { settle, watchConsole } from "./lib/bookingWalk.mjs";
import { ABSOLUTE, MEASURE } from "./lib/hitArea.mjs";

const { chromium } = createRequire(import.meta.url)("./../app/node_modules/playwright/index.js");

const started_at = new Date().toISOString();
const HEADED = process.argv.includes("--headed");
const BREAK = (process.argv.find((a) => a.startsWith("--break=")) || "").split("=")[1] || "";
const BASE = process.env.BASE || "http://localhost:5173";
const OWNER = { email: "demo@detailplatform.com", password: "demo123" };

// 320 FIRST. The fault is a DESK-width one, which is exactly why the narrow
// widths are here: they are the control group that proved the control itself
// is legal and that 2.32's document-level rule still does its job.
const SIZES = [
  { w: 320, h: 844 }, { w: 392, h: 844 }, { w: 768, h: 1024 },
  { w: 1440, h: 900 }, { w: 1920, h: 1080 },
];

// TWO SCREENS, THREE SCROLLERS. `theme.css` declares exactly three inner
// scrollers in the back office — `.settings-col > .settings-body`,
// `.record > .record-body` and `.sheet-body` — and these two screens reach all
// three, because a record opens as a column at a desk and as a sheet on a
// phone. A third screen would add targets and no new mechanism.
const SCREENS = [
  { key: "rules", url: "/app/business?settings=rules", sel: ".choice", open: null },
  {
    key: "client", url: "/app/clients", open: ".row-item",
    sel: ".record .btn, .record .chip, .record .choice, .sheet-body .btn, .sheet-body .chip, .sheet-body .choice",
  },
];

// Six: the settings column scrolls at 1440 and 1920, and the record scrolls at
// every width — as a column at those two and as a sheet at 320, 392 and 768.
// A floor, not a count: finding MORE is fine, finding fewer means the layout
// moved under the check and `reserved` has stopped asking anything.
const SCROLLER_FLOOR = 6;
const ART = fileURLToPath(new URL("../artifacts/scroller-clearance/", import.meta.url));

let assertions = 0;
const failures = [];
const artifacts = [];
const consoleNoise = [];
const observed = [];
let scrollersSeen = 0;

const check = (target, name, cond, detail = "") => {
  assertions++;
  if (cond) { console.log(`    ok      ${name}`); return true; }
  failures.push(`${target}: ${name} ${detail}`.trim());
  console.error(`    FAIL    ${name}  ${detail}`);
  return false;
};

// THE CANARY: take the reservation away from every inner scroller. This is the
// fix removed at runtime, so a run that does not see a control lose rows has
// stopped measuring the thing the item is about.
const CANARY_CSS = `
  .settings-col > .settings-body, .record > .record-body, .sheet-body {
    scroll-padding-bottom: 0 !important; }`;

rmSync(ART, { recursive: true, force: true });
mkdirSync(ART, { recursive: true });

let signedIn = null;

async function sweep(browser, size, screen, { label, canary }) {
  const ctx = await browser.newContext({
    viewport: { width: size.w, height: size.h }, deviceScaleFactor: 1,
    storageState: signedIn || undefined,
  });
  const page = await ctx.newPage();
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
    await page.evaluate(() => {
      try {
        localStorage.setItem("dp.tours", JSON.stringify(
          ["shell", "today", "calendar", "money", "clients", "business"]));
        localStorage.setItem("dp.tour", "1");
      } catch { /* private mode */ }
    });
    await page.goto(BASE + screen.url, { waitUntil: "domcontentloaded" });
    await page.waitForSelector(".tabbar", { timeout: 30000 });
    await settle(page, 2500);
    if (screen.open) {
      await page.waitForSelector(screen.open, { timeout: 30000 });
      await page.click(screen.open);
      await settle(page, 2500);
    }
    if (canary && BREAK !== "canary") await page.addStyleTag({ content: CANARY_CSS });
    await settle(page, 800);
    const m = await page.evaluate(MEASURE, { sel: screen.sel, useRect: BREAK === "rect" });
    // The frame is taken where the measurement ENDED — the last control
    // focused, sitting wherever the browser put it.
    const file = `${label.replace(/[^\w.-]+/g, "-")}.png`;
    await page.screenshot({ path: ART + file, animations: "disabled" });
    artifacts.push("artifacts/scroller-clearance/" + file);
    return m;
  } finally {
    await ctx.close();
  }
}

function grade(id, m, sink) {
  const controls = m.controls;
  sink(id, "subjects", controls.length > 0,
    "no controls matched on this screen, so the questions below were asked of nothing");

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

  const mean = m.scrollers.filter((s) => s.reserved < m.overhang);
  sink(id, "reserved", mean.length === 0,
    mean.slice(0, 3).map((s) => `«${s.cls}» scrolls (${s.scrollH} in ${s.clientH}) and reserves `
      + `${s.raw} against a ${m.overhang}px overhang, so a control parked at its bottom edge `
      + `(y ${s.bottom}) loses the part of itself that hangs past its box`).join("; "));
}

// ---------------------------------------------------------------------------
const browser = await chromium.launch({ headless: !HEADED });
const expected = SIZES.length * SCREENS.length + 1;
let discovered = 0, attempted = 0, completed = 0;
const canary = { id: "the-reservation-taken-away", observed_failure: false, problems: [] };

for (const size of SIZES) {
  for (const screen of SCREENS) {
    const label = `${size.w}x${size.h} ${screen.key}`;
    console.log(`  ${label}`);
    discovered++; attempted++;
    const m = await sweep(browser, size, screen, { label });
    grade(label, m, check);
    scrollersSeen += m.scrollers.length;
    const worst = m.controls.reduce((a, c) => (c.reachable < a ? c.reachable : a), 99);
    const drops = Object.entries(m.dropped).filter(([, n]) => n).map(([k, n]) => `${n} ${k}`);
    // matched = visible + hidden + dropped, printed so a control cannot leave
    // the population without saying so.
    observed.push(`${label}: ${m.controls.length} of ${m.matched} matched control(s)`
      + (m.hidden ? ` (+${m.hidden} inside closed folds, not measured)` : "")
      + (drops.length ? ` (+${drops.join(", ")}, dropped)` : "")
      + `, worst reachable ${worst === 99 ? "n/a" : worst + "px"}`
      + `, ${m.scrollers.length} inner scroller(s)`
      + (m.scrollers.length ? ` [${m.scrollers.map((s) => `${s.cls}=${s.raw}`).join(", ")}]` : ""));
    completed++;
  }
}

// THE DISCOVERY FLOOR — see the header. `reserved` is an assertion about the
// scrollers a run finds, so a run that finds none passes it without asking
// anything.
check("run", "scrollers-found", scrollersSeen >= SCROLLER_FLOOR,
  `only ${scrollersSeen} inner scroller(s) across ${SIZES.length * SCREENS.length} screens, `
  + `floor is ${SCROLLER_FLOOR} — the layout moved and \`reserved\` has stopped asking anything`);

console.log("  canary — the reservation taken away; it MUST fail");
discovered++; attempted++;
{
  // At 1440, on the screen where the fault was measured. The narrow widths have
  // no inner scroller to take a reservation away from.
  const m = await sweep(browser, SIZES[3], SCREENS[0], { label: "canary", canary: true });
  grade("canary", m, (t, name, cond, detail) => {
    assertions++;
    if (cond) return;
    canary.problems.push(`${name} ${detail}`.trim());
  });
  // `reachable` specifically: `reserved` alone would only prove the CSS moved,
  // not that a control actually loses rows when it does.
  canary.observed_failure = canary.problems.some((p) => p.startsWith("reachable"));
  console.log(`    ${canary.observed_failure ? "caught" : "MISSED"}`
    + `${canary.problems.length ? " — " + canary.problems[0].slice(0, 100) : ""}`);
  completed++;
}

await browser.close();

console.log("\nWhat the screens measured:");
for (const o of observed) console.log("  " + o);
if (consoleNoise.length) {
  console.log("\nConsole (the two known React Router v7 warnings are dropped by name):");
  for (const c of consoleNoise) console.log("  " + c);
}

const status = failures.length === 0 && canary.observed_failure && consoleNoise.length === 0
  ? "pass" : "fail";
const { path } = writeReceipt({
  check_id: "scroller-clearance",
  started_at,
  status,
  expected_targets: expected,
  discovered_targets: discovered,
  attempted_targets: attempted,
  completed_targets: completed,
  skipped_targets: 0,
  assertions_executed: assertions,
  min_assertions: 45,
  assertion_floor:
    "5 widths x 2 screens x 4 questions + 1 discovery floor + 1 canary x 4 = 45. Fixed by SIZES x "
    + "SCREENS x the question list, never by what the run finds: a screen with no matching "
    + "controls grades as four failures rather than dropping out, and a run that finds no inner "
    + "scrollers at all fails the floor rather than passing `reserved` vacuously.",
  failures: [...failures, ...consoleNoise.map((c) => `console: ${c}`)],
  artifacts,
  warnings: [
    "Measures the HIT AREA — the bounding rect plus the overhang read off each element's own "
    + "::after — never the rect. A rect-only scan under-measures every control using the "
    + "negative-inset pattern by its overhang and calls a legal control broken.",
    "The pitch of `.choices` was the first suspicion and is innocent: the band is 44px on a 46px "
    + "pitch, and the lost rows are a contiguous run owned by an ancestor rather than an "
    + "alternating pattern owned by a neighbour.",
    ...(BREAK ? [`run with --break=${BREAK}; this receipt is a sabotage, not a result`] : []),
  ],
  dimensions: {
    sizes: SIZES.map((s) => `${s.w}x${s.h}`),
    screens: SCREENS.map((s) => s.key),
    absolute: ABSOLUTE,
    scrollers_found: scrollersSeen,
    scroller_floor: SCROLLER_FLOOR,
    observed,
    sabotage: BREAK || null,
  },
  canary,
});

console.log(`\n${status.toUpperCase()} — ${completed}/${expected} targets, ${assertions} assertions, `
  + `${failures.length} failure(s), ${scrollersSeen} inner scroller(s) found, `
  + `canary ${canary.observed_failure ? "caught" : "MISSED"}. Receipt ${path}`);
for (const f of failures) console.log("  · " + f);
process.exit(status === "pass" ? 0 : 1);
