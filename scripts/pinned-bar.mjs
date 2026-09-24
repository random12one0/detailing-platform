// THE JOB RECORD'S PINNED ACTION BAR, MEASURED IN ALL THREE CONTAINERS.
//
//   node scripts/pinned-bar.mjs                  # the whole sweep
//   node scripts/pinned-bar.mjs --headed         # watch it
//   node scripts/pinned-bar.mjs --break=canary   # sabotage: prove the canary is live
//   node scripts/receipt.mjs receipts/pinned-bar.json
//
// Needs the dev server on :5173 (npm run dev --prefix app) and the seeded
// demo business (node scripts/seed-demo.mjs).
//
// ---------------------------------------------------------------------------
// WHY THIS EXISTS
// ---------------------------------------------------------------------------
// `.jobbar` is the six-button action bar at the top of a job record, sticky
// since step 4 so Call / Text / Navigate cannot scroll away while a detailer
// is standing at the car. THE SAME COMPONENT OPENS IN THREE DIFFERENT
// CONTAINERS — the slide-up sheet below --wrap, the desk's second column at
// or above it, and the standalone `/job/:id` page a push notification opens —
// and until 2026-09-18 the rule that makes a sticky bar READ as a bar was
// written for one of them: `.sheet-body > .jobbar`.
//
// On the page the bar therefore rendered the exact width and the exact
// background of the `.card` elements above and below it, so `Finalize
// payment` scrolled underneath a band painted the same color as the card it
// was sitting in and came out sheared in half with no edge to explain the
// cut. Andrew found it in his own browser: *"the GUI looks a little weird
// with this like square thing and buttons overlapping"*. FOUND.md.
//
// **THE FIRST REPAIR MADE ALL THREE CONTAINERS A FULL-BLEED BAND, AND HE
// TURNED THAT DOWN TOO** — *"it's very square whereas everything else is
// like rounded and it just looks a little like weird"*, plus the two status
// pills *"all like touch this kind of box"*, which measured a 0px gap in all
// three. Two of this file's seven questions exist because a check that only
// asked about width and elevation had nothing to say about either. What the
// bar IS depends on where its edges are: at the container's edge it is a
// band and is square, inside the margins it is an object and is rounded.
//
// ---------------------------------------------------------------------------
// WHAT IT ASSERTS, AND WHY IT IS GEOMETRY RATHER THAN CSS TEXT
// ---------------------------------------------------------------------------
// `docs/gotchas.md`: a grep-based check coupled to a SPELLING rather than a
// BEHAVIOR passes the day somebody renames the token. Nothing here reads
// theme.css. Seven questions per target, all asked of the live layout:
//
//   sticky   the bar is `position: sticky`. Without this the other six are
//            about a box that scrolls away and none of them matter.
//   covered  nothing in the container sits horizontally outside the bar, so
//            nothing can slide up a gutter beside it while it is pinned.
//            THIS REPLACED "the bar spans the container's full inner width",
//            which was the sheet's answer written as though it were the law.
//            It is not: a bar inside the container's margins is fine as long
//            as nothing is beside it, and forcing all three wall to wall is
//            what produced the square band Andrew turned down.
//   aligns   the bar's CONTENT box lines up with the cards under it (±1px).
//            The guard against putting the buttons somewhere other than
//            where every other row on the screen starts.
//   rounded  a bar the same width as the cards under it is an OBJECT and
//            carries their corner radius; a bar wider than them is a BAND
//            and carries none. Andrew, 2026-09-18: "it's very square whereas
//            everything else is like rounded." Which one it is has to be
//            read off the CARDS: asking whether the bar reaches its
//            scrollport's edge called the desk panel a band, because
//            `.record-body` has no padding and the margin a person sees
//            belongs to `.record` outside it.
//   clear    real space between the bar and the thing above it. The two
//            status pills measured a 0px gap in all three containers — "the
//            completed unpaid and planned member rate all like touch this
//            kind of box".
//   edge     with content passing under the bar, the strip of PIXELS just
//            below its bottom edge is measurably darker than the same strip
//            of the same frame rendered with the bar's elevation removed.
//            This is the one that says a person can SEE where the bar ends.
//   in-front after scrolling, `elementFromPoint` in the middle of the bar
//            returns the bar or one of its own children — never the card
//            beneath. Hit-testing, not a screenshot: gotchas.md's whole
//            complaint about bounding rects.
//
// `edge` TOOK THREE GOES AND THE FIRST TWO BOTH LIED, which is the whole
// argument for breaking a check before trusting it:
//   1. "the bar's background TOKEN differs from the cards' token" — went
//      green over a fix that painted the bar a flat `--bg` #0B0D0E slab on a
//      page whose ground renders rgb(17,22,24), because `.app-shell`'s
//      atmosphere layers sit on top of `--bg`. A declared colour is not a
//      painted one.
//   2. "one pixel under the bar against one pixel further down the same
//      card" — read rgb(141,142,140) off the middle of a letter and called a
//      97-level step a failure, twice, at two widths.
//   3. The difference between two renders of the SAME frame. Every pixel
//      that is not the shadow is identical in both, so whatever is left is
//      the edge, and no content can confuse it.
// `docs/gotchas.md` has an entry for the first one.
//
// ---------------------------------------------------------------------------
// THE CANARY IS THE DEFECT ITSELF, REBUILT ON PURPOSE, EVERY RUN
// ---------------------------------------------------------------------------
// A seventeenth target loads the page with a stylesheet that rebuilds the
// defect — square corners, no elevation, the pills flat on the bar's top
// edge — and the seven questions are asked of it. **It is required to fail.**
// `receipt.mjs` refuses a receipt whose canary passed, so a run where this
// check has stopped looking cannot be mistaken for a run where it looked and
// found nothing.
//
// `--break=canary` removes that injected stylesheet. The canary target is
// then genuinely correct, observes no failure, and the receipt must be
// rejected. That is how this file was proved to be looking before anybody
// trusted a green run out of it.

import "../tests/_env.mjs";

import { createRequire } from "node:module";
import { mkdirSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { writeReceipt } from "./receipt.mjs";

const { chromium } = createRequire(import.meta.url)("./../app/node_modules/playwright/index.js");

const started_at = new Date().toISOString();
const HEADED = process.argv.includes("--headed");
const BREAK = (process.argv.find((a) => a.startsWith("--break=")) || "").split("=")[1] || "";
const BASE = process.env.BASE || "http://localhost:5173";

const URL_ = process.env.SUPABASE_URL;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;

// THE DEMO BUSINESS BY SLUG, NEVER BY A UUID WRITTEN DOWN HERE. FOUND.md's
// other open entry is two scripts holding an id that a reseed threw away.
const SLUG = "demo-detail";
const OWNER = { email: "demo@detailplatform.com", password: "demo123" };

const ART = fileURLToPath(new URL("../artifacts/pinned-bar/", import.meta.url));

// His four verification sizes, and `?lite=1` beside each of them.
// 1920 and 1440 are at or above --wrap (1180), so the record opens in the
// desk's second column; 768 and 392 are below it, so the same record opens in
// the slide-up sheet. One navigation, two containers, decided by width —
// which is the honest way to reach both.
const SIZES = [
  { w: 1920, h: 1080 }, { w: 1440, h: 900 }, { w: 768, h: 1024 }, { w: 392, h: 844 },
];
const MODES = ["", "?lite=1"];

let assertions = 0;
const failures = [];
const artifacts = [];
const consoleNoise = [];

const check = (target, name, cond, detail = "") => {
  assertions++;
  if (cond) { console.log(`    ok    ${name}`); return true; }
  const line = `${target}: ${name} ${detail}`.trim();
  failures.push(line);
  console.error(`    FAIL  ${name}  ${detail}`);
  return false;
};

// ---------------------------------------------------------------------------
// GUARDS. A SKIPPED RUN MUST NOT READ LIKE A PASSING ONE.
// ---------------------------------------------------------------------------
if (!URL_ || !SERVICE) {
  console.error("\nSKIPPED — needs SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the root .env.");
  console.error("NOTHING ran and NO receipt was written. This is not a pass.");
  process.exit(2);
}

const svc = async (path) => {
  const res = await fetch(URL_ + path, {
    headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}` },
  });
  return res.json().catch(() => null);
};

const biz = (await svc(`/rest/v1/businesses?select=id&slug=eq.${SLUG}`))?.[0]?.id;
if (!biz) {
  console.error(`\nSKIPPED — no business with slug "${SLUG}". Run: node scripts/seed-demo.mjs`);
  console.error("NOTHING ran and NO receipt was written. This is not a pass.");
  process.exit(2);
}
// A COMPLETED JOB THAT STILL OWES MONEY, because `Finalize payment` — the
// button the defect was slicing in half — only exists on one of those.
const job = (await svc(
  `/rest/v1/bookings?select=id,customer_name&business_id=eq.${biz}&deleted_at=is.null`
  + `&status=eq.completed&payment_status=in.(pending,partial)&order=customer_name&limit=1`))?.[0];
if (!job) {
  console.error("\nSKIPPED — the demo tenant has no completed, unpaid job, so no bar to measure.");
  console.error("NOTHING ran and NO receipt was written. This is not a pass.");
  process.exit(2);
}
console.log(`Measuring against "${job.customer_name}" (${job.id.slice(0, 8)}) on ${BASE}\n`);

// THE OLD BROKEN RULE, PUT BACK ON PURPOSE. Exactly what theme.css did
// before 2026-09-18: no bleed out to the container's edge, and no shadow to
// say the bar is in front of what passes under it.
const CANARY_CSS = `
  .app-main > .jobbar {
    border-radius: 0 !important;
    box-shadow: none !important;
    margin-top: 0 !important;
  }`;

rmSync(ART, { recursive: true, force: true });
mkdirSync(ART, { recursive: true });

/**
 * Put the record where the defect lives — content genuinely passing under the
 * pinned bar — and report the geometry.
 *
 * IT LEAVES THE PAGE SCROLLED. The screenshot that follows is the evidence
 * for the `edge` assertion, so it has to be the frame the numbers came from,
 * and it happens to be the view Andrew photographed.
 */
const PREPARE = ([barSel, boxSel]) => {
  const bar = document.querySelector(barSel);
  const box = document.querySelector(boxSel);
  if (!bar || !box) return { missing: !bar ? barSel : boxSel };

  const bcs = getComputedStyle(bar);
  const scroller = box.scrollHeight > box.clientHeight + 4 ? box : document.scrollingElement;
  const start = scroller.scrollTop;

  // THE GAP ABOVE IT, MEASURED BEFORE ANYTHING SCROLLS. Once the bar is
  // pinned it has left the flow and the distance to its previous sibling is
  // whatever the scroll happens to be — the question is only meaningful at
  // rest, which is also where the person is looking when they open the page.
  const above = bar.previousElementSibling;
  const gapAbove = above
    ? Math.round(bar.getBoundingClientRect().top - above.getBoundingClientRect().bottom)
    : null;

  scroller.scrollTop = start + 300;     // far enough that the bar is stuck

  const br = bar.getBoundingClientRect();
  const xr = box.getBoundingClientRect();
  // The container's SCROLLPORT: its padding box, which is what a sticky child
  // has to cover. clientLeft/clientWidth are the border width and the padding
  // box width, and they already exclude a scrollbar — which a bounding rect
  // does not, and which is a 15px lie at a desk.
  const inner = { left: xr.left + box.clientLeft, width: box.clientWidth };
  const cards = [...box.querySelectorAll(".card")];
  const firstCard = cards[0] || null;

  // ANYTHING STICKING OUT BESIDE THE BAR. Not "is the bar as wide as the
  // container" — that was the sheet's answer generalised into a law it is
  // not. What matters is whether a person can watch a line of the record
  // slide up a gutter the pinned bar does not cover, and the way to ask that
  // is to ask the CONTENT where it is.
  const outside = cards
    .filter((c) => {
      const r = c.getBoundingClientRect();
      return r.width > 0 && (r.left < br.left - 1 || r.right > br.right + 1);
    })
    .map((c) => {
      const r = c.getBoundingClientRect();
      return `a card at ${Math.round(r.left)}..${Math.round(r.right)}`;
    });

  // COVERS — hit-testing, not a picture. gotchas.md's complaint about
  // bounding rects: ask the document what is actually painted at that point.
  const hit = document.elementFromPoint(
    Math.round(br.left + br.width / 2), Math.round(br.top + br.height / 2));

  return {
    position: bcs.position,
    bar: { left: Math.round(br.left), width: Math.round(br.width) },
    inner: { left: Math.round(inner.left), width: Math.round(inner.width) },
    contentLeft: Math.round(br.left + parseFloat(bcs.borderLeftWidth) + parseFloat(bcs.paddingLeft)),
    cardLeft: firstCard ? Math.round(firstCard.getBoundingClientRect().left) : null,
    outside,
    gapAbove,
    aboveName: above ? (typeof above.className === "string" && above.className ? above.className : above.tagName) : null,
    // BAND OR OBJECT, AND IT IS THE CARDS THAT ANSWER IT, NOT THE SCROLLPORT.
    // A band is wider than the things under it; an object is the same width
    // as them. That is what a person sees, and it is the only form of the
    // question that works in all three containers — asking whether the bar
    // reaches its SCROLLPORT's edge called the desk panel's bar a band,
    // because `.record-body` carries no padding of its own and the 18px of
    // margin a person can plainly see belongs to `.record` outside it.
    isBand: firstCard
      ? Math.round(br.width) > Math.round(firstCard.getBoundingClientRect().width) + 2
      : Math.abs(br.left - inner.left) <= 1 && Math.abs(br.width - inner.width) <= 1,
    radius: Math.round(parseFloat(bcs.borderTopLeftRadius)),
    cardRadius: firstCard
      ? Math.round(parseFloat(getComputedStyle(firstCard).borderTopLeftRadius)) : null,
    covered: !!hit && (hit === bar || bar.contains(hit)),
    hit: hit ? (typeof hit.className === "string" && hit.className ? hit.className : hit.tagName) : "nothing",
    scrolled: scroller.scrollTop - start,
    // THE STRIP THE EDGE LIVES IN: 120px wide, starting 2px under the bar's
    // bottom border and running 16px down, which is where a
    // `0 12px 34px -14px` shadow is strongest. CSS pixels are image pixels
    // here because every context is created at deviceScaleFactor 1.
    strip: {
      x: Math.round(br.left + 20), y: Math.round(br.bottom + 2),
      w: Math.min(120, Math.round(br.width) - 40), h: 16,
    },
  };
};

/** Mean brightness of one strip of a screenshot the browser just took. */
const STRIP = async ({ data, s }) => {
  const img = new Image();
  img.src = "data:image/png;base64," + data;
  await img.decode();
  const cv = document.createElement("canvas");
  cv.width = img.width; cv.height = img.height;
  // `willReadFrequently` only to keep the console clean — this script REPORTS
  // the console, so its own noise would land in the receipt as a finding.
  const ctx = cv.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(img, 0, 0);
  const d = ctx.getImageData(s.x, s.y, s.w, s.h).data;
  let sum = 0;
  for (let i = 0; i < d.length; i += 4) sum += (d[i] + d[i + 1] + d[i + 2]) / 3;
  return sum / (d.length / 4);
};

/** The seven questions, named once so the count and the miss path agree. */
const ASSERTIONS = ["sticky", "covered", "rounded", "clear", "aligns", "edge", "in-front"];

/** Grade one probe. Seven assertions, every one of them or none. */
function grade(id, m, edge, sink) {
  if (m.missing) {
    // NOT A SKIP. A container that did not render is a target that failed,
    // and it is five failures rather than a quiet gap in the count.
    for (const n of ASSERTIONS) sink(id, n, false, `${m.missing} not on the page`);
    return;
  }
  sink(id, "sticky", m.position === "sticky", `position is ${m.position}`);
  sink(id, "covered", m.outside.length === 0,
    `${m.outside.length} thing(s) sit beside the bar rather than under it: ${m.outside.join("; ")}`);
  // A BAND IS SQUARE, AN OBJECT IS ROUNDED, AND WHICH ONE IT IS FOLLOWS FROM
  // WHERE ITS EDGES ARE rather than from which container it happens to be in.
  sink(id, "rounded",
    m.isBand ? m.radius === 0 : (m.cardRadius === null || m.radius === m.cardRadius),
    m.isBand
      ? `it is wider than the cards under it, so it is a band, but it carries a ${m.radius}px radius`
      : `it is the same width as the cards under it, so it is an object, but it is ${m.radius}px `
        + `where the cards beside it are ${m.cardRadius}px`);
  sink(id, "clear", m.gapAbove === null || m.gapAbove >= 8,
    `only ${m.gapAbove}px between the bar and the ${m.aboveName} above it`);
  sink(id, "aligns",
    m.cardLeft === null || Math.abs(m.contentLeft - m.cardLeft) <= 1,
    `bar content starts at x=${m.contentLeft}, the cards start at x=${m.cardLeft}`);
  // THE EDGE, AND IT IS A DIFFERENCE BETWEEN TWO RENDERS OF THE SAME FRAME.
  // TWO levels out of 255, averaged over 1,920 pixels, is the floor: the
  // shadow profiles at about ten across this strip and the canary — the same
  // frame with the elevation already gone — comes in at 0.03. The floor sits
  // between them with room on both sides.
  sink(id, "edge", edge.delta >= 2,
    `the strip under the bar is ${edge.on.toFixed(2)} with the bar's elevation and `
    + `${edge.off.toFixed(2)} without it — a ${edge.delta.toFixed(2)} difference`);
  sink(id, "in-front", m.covered && m.scrolled > 0,
    m.scrolled > 0 ? `${m.hit} is painted in the middle of the bar` : "nothing scrolled, so nothing was under it");
}

/**
 * One target, end to end: scroll content under the bar, photograph that exact
 * frame, then photograph the SAME frame again with the bar's elevation taken
 * away and measure how much darker the first one is under the bar.
 *
 * WHY A DIFFERENCE RATHER THAN A COLOUR. Two earlier versions of this
 * assertion both lied. Comparing the bar's background TOKEN to the cards'
 * token passed a fix that painted a flat #0B0D0E slab on a ground that
 * renders rgb(17,22,24). Comparing one pixel under the bar to one pixel
 * further down the same card read `rgb(141,142,140)` off the middle of a
 * letter and called a 97-level step a failure. A difference between two
 * renders of the same frame has neither problem: every pixel that is not the
 * shadow is identical in both, so whatever is left is the edge.
 *
 * TWO FRAMES ARE KEPT PER TARGET, and the second one is the point: the
 * scrolled frame is what the `edge` number was computed from, and the AT-REST
 * frame is what a person actually sees when the page opens. For one round
 * this file kept only the first, and the two things Andrew found next were
 * both invisible in it. See `measure()`.
 */
// BOTH FRAMES ARE FROZEN, AND THAT IS NOT TIDINESS. Without
// `animations: "disabled"` this measurement was wrong in both directions at
// once. The dot lattice drifts under the bar, so two ordinary screenshots of
// the "same" frame differ by a little whatever the shadow does — a floor of
// noise that a real failure can hide in. And a box-shadow change on a
// composited sticky layer is a repaint the very next screenshot can miss
// entirely: four targets reported a 0.00 difference over a shadow that
// profiles at twenty-one levels when the frame is held still. Freezing
// removes both. gotchas.md's backgrounded-tab entry, wearing a third hat.
const NO_ELEVATION = ".jobbar { box-shadow: none !important; }";
const FROZEN = { animations: "disabled" };
async function measure(page, barSel, boxSel, file) {
  // ── AT REST, BEFORE ANYTHING SCROLLS, AND THIS FRAME EXISTS BECAUSE ITS
  // ABSENCE COST A ROUND. ──────────────────────────────────────────────────
  // `PREPARE` scrolls 300px so that something is passing under the bar, which
  // the `edge` measurement needs. Every screenshot this check kept was
  // therefore taken from BELOW the top of the record — and at that scroll the
  // two status pills are hidden behind the bar and the bar is flush against
  // the viewport's top edge, where corners cannot be seen. So when Andrew
  // said *"the completed unpaid and planned member rate all like touch this
  // kind of box"* and *"it's very square whereas everything else is like
  // rounded"*, he was describing two defects that **were not in a single one
  // of the sixteen screenshots this file had produced.**
  //
  // A SCREENSHOT TAKEN TO SERVE AN ASSERTION IS NOT A PICTURE OF THE SCREEN.
  // This one is: it is the frame a person gets when the page opens, kept
  // whether or not any assertion needs it.
  const atRest = file.replace(/\.png$/, "-at-rest.png");
  await page.screenshot({ ...FROZEN, path: ART + atRest });
  artifacts.push("artifacts/pinned-bar/" + atRest);

  const m = await page.evaluate(PREPARE, [barSel, boxSel]);
  const shot = await page.screenshot({ ...FROZEN, path: ART + file });
  artifacts.push("artifacts/pinned-bar/" + file);
  if (m.missing) return { m, edge: { on: 0, off: 0, delta: 0 } };

  const on = await page.evaluate(STRIP, { data: shot.toString("base64"), s: m.strip });
  const tag = await page.addStyleTag({ content: NO_ELEVATION });
  await page.waitForTimeout(120);
  const flat = await page.screenshot(FROZEN);
  const off = await page.evaluate(STRIP, { data: flat.toString("base64"), s: m.strip });
  await tag.evaluate((el) => el.remove());
  return { m, edge: { on, off, delta: off - on } };
}

// ---------------------------------------------------------------------------
const browser = await chromium.launch({ headless: !HEADED });
let signedIn = null;
let expected = 0, discovered = 0, attempted = 0, completed = 0;
const canary = { id: "the-page-with-the-old-rule-put-back", observed_failure: false, problems: [] };

for (const { w, h } of SIZES) {
  for (const mode of MODES) {
    const label = `${w}x${h}${mode ? " lite" : ""}`;
    const ctx = await browser.newContext({
      viewport: { width: w, height: h }, deviceScaleFactor: 1,
      storageState: signedIn || undefined,
    });
    const page = await ctx.newPage();
    // READ THE CONSOLE AT EVERY SIZE — his rule, and it is per-page because a
    // listener attached to the browser hears nothing.
    page.on("console", (msg) => {
      if (msg.type() === "error" || msg.type() === "warning") {
        consoleNoise.push(`${label} · ${msg.type()} · ${msg.text().slice(0, 160)}`);
      }
    });
    page.on("pageerror", (e) => consoleNoise.push(`${label} · pageerror · ${String(e.message).slice(0, 160)}`));

    const settle = async (ms = 900) => {
      await page.waitForTimeout(ms);
      await page.evaluate(() => document.fonts.ready).catch(() => {});
    };

    await page.goto(`${BASE}/app${mode}`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("input[type=email], .tabbar", { timeout: 30000 });
    if (await page.locator("input[type=email]").count()) {
      await page.fill("input[type=email]", OWNER.email);
      await page.fill("input[type=password]", OWNER.password);
      await page.click("form button.btn.primary");
      await page.waitForSelector(".tabbar", { timeout: 30000 });
      signedIn = await ctx.storageState();
    }
    // Every guide marked seen. A tab guide swallows pointer events and this
    // script clicks a row — it broke sweep-widths.mjs the day guides shipped.
    await page.evaluate(() => {
      try {
        localStorage.setItem("dp.tours", JSON.stringify(["shell", "today", "calendar", "money", "clients", "business"]));
        localStorage.setItem("dp.tour", "1");
      } catch { /* private mode */ }
    });

    // ── TARGET 1: the standalone page ────────────────────────────────────
    expected++;
    {
      const id = `page ${label}`;
      console.log(`  ${id}`);
      await page.goto(`${BASE}/job/${job.id}${mode}`, { waitUntil: "domcontentloaded" });
      await page.waitForSelector(".app-main > .jobbar", { timeout: 30000 });
      discovered++; attempted++;
      await settle();
      const { m, edge } = await measure(page, ".app-main > .jobbar", ".app-main",
        `page-${w}${mode ? "-lite" : ""}.png`);
      grade(id, m, edge, check);
      completed++;
    }

    // ── TARGET 2: the sheet (below --wrap) or the desk's second column ────
    expected++;
    {
      const wide = w >= 1180;
      const boxSel = wide ? ".record > .record-body" : ".sheet-body";
      const id = `${wide ? "record" : "sheet"} ${label}`;
      console.log(`  ${id}`);
      await page.goto(`${BASE}/app/money${mode}`, { waitUntil: "domcontentloaded" });
      await page.waitForSelector('[data-tour="unpaid"]', { timeout: 30000 });
      await settle();
      await page.locator('[data-tour="unpaid"] .card [role=button]').first().click();
      await page.waitForSelector(`${boxSel} > .jobbar`, { timeout: 30000 });
      discovered++; attempted++;
      await settle();
      const { m, edge } = await measure(page, `${boxSel} > .jobbar`, boxSel,
        `${wide ? "record" : "sheet"}-${w}${mode ? "-lite" : ""}.png`);
      grade(id, m, edge, check);
      completed++;
    }

    // ── THE CANARY, ONCE, AT THE FIRST SIZE ──────────────────────────────
    if (w === SIZES[0].w && mode === "") {
      expected++;
      console.log("  canary — the page with the old rule put back; it MUST fail");
      await page.goto(`${BASE}/job/${job.id}`, { waitUntil: "domcontentloaded" });
      await page.waitForSelector(".app-main > .jobbar", { timeout: 30000 });
      discovered++; attempted++;
      if (BREAK !== "canary") await page.addStyleTag({ content: CANARY_CSS });
      await settle();
      const { m, edge } = await measure(page, ".app-main > .jobbar", ".app-main", "canary.png");
      // ITS FAILURES GO IN THE CANARY, NOT IN `failures`. A negative control
      // that reddens the run is a negative control nobody keeps.
      grade("canary", m, edge, (t, name, cond, detail) => {
        assertions++;
        if (cond) { console.log(`    ok      ${name}`); return; }
        console.log(`    caught  ${name}  ${detail}`);
        canary.problems.push(`${name} ${detail}`.trim());
      });
      canary.observed_failure = canary.problems.length > 0;
      completed++;
    }

    await ctx.close();
  }
}

await browser.close();

if (consoleNoise.length) {
  console.log("\nConsole:");
  for (const c of consoleNoise) console.log("  " + c);
}

const status = failures.length === 0 && canary.observed_failure ? "pass" : "fail";
const { path } = writeReceipt({
  check_id: "pinned-bar",
  started_at,
  status,
  expected_targets: expected,
  discovered_targets: discovered,
  attempted_targets: attempted,
  completed_targets: completed,
  skipped_targets: 0,
  assertions_executed: assertions,
  // 17 targets x 7 questions. Lowering it is a visible diff somebody has to
  // justify — which is the only reason the floor is written down.
  min_assertions: 119,
  // **DECLARED 2026-09-22, BECAUSE A FLOOR EQUAL TO ITS OWN COUNT CANNOT
  // BIND** — `receipt.mjs` now refuses a receipt that does not say why.
  // Read rather than assumed: `ASSERTIONS` names seven questions,
  // `grade()` asks all seven per target (the `m.missing` path loops the same
  // seven rather than returning early with fewer), and the target count is
  // SIZES 4 x MODES 2 x 2 containers + 1 canary = 17. Nothing here varies
  // with what the run finds.
  assertion_floor:
    "4 sizes x 2 modes x 2 containers + 1 canary = 17 targets, x the 7 questions in "
    + "ASSERTIONS = 119. grade() asks all seven per target including the missing-container "
    + "path, which loops ASSERTIONS rather than returning short, so the count cannot fall "
    + "without a diff. A tripwire on the code, not a run-time check.",
  failures,
  artifacts,
  warnings: [
    ...(BREAK ? [`run with --break=${BREAK}; this receipt is a sabotage, not a result`] : []),
    ...consoleNoise,
  ],
  dimensions: {
    booking: job.id,
    sizes: SIZES.map((s) => `${s.w}x${s.h}`),
    modes: ["normal", "lite"],
    containers: ["page", "sheet", "record"],
    sabotage: BREAK || null,
  },
  canary,
});

console.log(`\n${status.toUpperCase()} — ${completed}/${expected} targets, ${assertions} assertions, `
  + `${failures.length} failure(s), canary ${canary.observed_failure ? "failed as required" : "DID NOT FAIL"}.`
  + ` Receipt ${path}`);
for (const f of failures) console.log("  · " + f);
process.exit(status === "pass" ? 0 : 1);
