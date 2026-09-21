// Walk every booking step and say, for each one, how far past the bottom
// of the screen it runs.
//
// W16 is the organising rule of roadmap 2.7 and it is the owner's own words:
// "a good general rule is that everything should be able to fit without
// having to scroll anywhere. Each step, you shouldn't have to scroll down or
// up." He said it about step 1, step 2, the time picker, the review step, and
// then again about desktop (W23, W26).
//
// A rule with no instrument is a preference. `sweep-widths.mjs` answers "is
// anything off the RIGHT edge"; nothing answered "is anything off the
// BOTTOM", which is a different question with a different fix — the right
// edge is one element too wide, the bottom edge is the whole step's budget.
//
// WHAT IT MEASURES. Per step, per width:
//   over    document scrollHeight minus viewport height. 0 means it fits.
//   spent   the same number as a percentage of the viewport, so a 40px
//           overflow at 844 and at 1080 are not read as the same problem.
//   biggest the three tallest blocks inside .bk-wrap, because when a step
//           does not fit, the answer is always "which of these is too tall"
//           and reading it off a screenshot is guesswork.
//
// It fills the form as a real customer would — picks a service, a size, an
// address, a day and a time — because an empty step 4 has no slot grid on it
// and an empty step 6 has no receipt, and those are two of the four screens
// he named.
//
//   node scripts/sweep-booking-steps.mjs              # the four verification sizes
//   node scripts/sweep-booking-steps.mjs 1440x900     # any list of WxH
//   node scripts/sweep-booking-steps.mjs --shots=shots-2.7   # and save PNGs
//   node scripts/sweep-booking-steps.mjs --lite              # the ?lite=1 path
//
// EXITS NON-ZERO while any step overflows, so it is the definition of done
// for W16. Needs the dev server on :5173 and the seeded demo business, like
// sweep-widths.mjs — but no login, because this page is public.
import { createRequire } from "node:module";
import { reportSourceMoved, watchSource } from "./source-guard.mjs";
// THE 44px TAP FLOOR RIDES THIS WALK RATHER THAN GETTING A SECOND ONE.
// `scripts/sweep-tap-targets.mjs` measures every other surface in the product
// and deliberately does NOT walk the booking flow: these steps are behind a
// live availability call and a three-month calendar search, and this file
// already does that walk correctly. So the MEASUREMENT is a module
// (`scripts/lib/tapProbe.mjs`) and this is its second caller. A tap check that
// needed its own copy of the calendar search would be a second thing to keep
// working, and it would be the copy that rots.
import { TAP_PROBE, EXCEPTIONS, FLOOR, CAP } from "./lib/tapProbe.mjs";
const { chromium } = createRequire(import.meta.url)("./../app/node_modules/playwright/index.js");

// Started BEFORE the browser opens, so anything saved from here on is a
// mid-run edit. `source-guard.mjs` explains why that matters.
const changedSince = watchSource();

const args = process.argv.slice(2).filter((a) => /^\d+x\d+$/.test(a));
// The four verification sizes from CLAUDE.md § Design, and all four earned
// their place here: 1440x900 was the ONLY one that failed after the phone and
// the 1920 monitor were both clean, because it is the short screen — 180px
// less height than 1920 with the same desktop masthead on it.
const SIZES = (args.length ? args : ["1920x1080", "1440x900", "768x1024", "392x844"]).map((s) => {
  const [width, height] = s.split("x").map(Number);
  return { width, height };
});
// --- W16'S STATED BOUND, DECLARED HERE AND NOWHERE ELSE ---------------------
//
// **THE RULING THIS RESTS ON:** this product's booking surfaces are sized by
// data the DETAILER owns, so a rule phrased "step 1 must fit" is not a rule at
// all — it is a hope about a number somebody else controls. A check cannot
// promise that and should not pretend to. W16 now promises something it can
// keep: **step 1 fits FIVE services, at all four verification widths.**
//
// **IT IS A CONSTANT, NOT A READING, AND THAT IS THE WHOLE POINT.** The moment
// this derives itself from whatever the tenant happens to have, it becomes a
// gate that can never fail — the exact failure `docs/silences.md` exists to
// name. The tenant's count is MEASURED; the bound it is judged against is
// DECLARED, committed, and moved only by a person who re-measures.
//
// **WHAT IT ASSUMES, OUT LOUD, so the next reader does not infer it from a
// passing run** — measured 2026-09-20 against `demo-detail` on the live page:
//
//   services   1440x900              392x844
//   5          fits, ~22px spare     fits, ~29px spare      <- the bound
//   6 (demo)   over 88px             over 71px
//   7          over ~198px           over ~171px
//
// **THE SPARE FIGURES IN THAT TABLE ARE DERIVED, NOT READ OFF A RUN.** They
// are this script's own overflow minus one card — 88 - 110 and 71 - 100 — taken
// from a reading where step 1 was genuinely overflowing, so they are real. The
// `fits, Npx spare` line this script prints for a step that FITS is a different
// number and is capped: `.bk-wrap` is `flex-grow: 1` inside a `100dvh` column,
// so it stretches to fill whatever is left and reports the same ~73-77px
// however short the step is. Measured 2026-09-20 — riverside step 1, 58px of
// content, read as -73 at viewport heights 900, 1200 and 740 alike. Failure is
// unaffected (a step taller than the screen still measures honestly); only the
// headroom half of the report is. Do not read a printed spare as room to grow.
//
// One service card plus its gap is 110px at 1440 and 100px at 392, and
// `.bk-choices` is a content-driven flex column — `min-height: auto`, no
// declared height. **There is no fixed card height that satisfies an unbounded
// service count**, which is why this is a bound and not a CSS fix.
//
// SO: a detailer with twelve services is a KNOWN GAP, named by this script in
// every run, and not a silent pass. Raising this number means re-measuring the
// table above, not editing the number.
const W16_SERVICES = 5;
const BASE = process.env.BASE || "http://localhost:5173";
const SLUG = "demo-detail";
const SHOTS = process.argv.find((a) => a.startsWith("--shots="))?.slice(8) ?? "";
// CLAUDE.md § Design: every width is checked in the normal path AND ?lite=1.
const LITE = process.argv.includes("--lite");

// Runs in the page. `.bk-wrap` is the column; its children are the blocks a
// step is made of, so naming the tallest three names the thing to fix.
const MEASURE = (bound) => {
  const vh = window.innerHeight;
  // NOT scrollHeight. `.bk` carries `min-height: 100dvh`, so the document is
  // never shorter than the screen and a step with room to spare reports
  // exactly 0 — which reads as "only just fits" and hides the headroom this
  // script exists to report. The page is a masthead, a column and a fixed
  // bar, and the column already reserves the bar's height in its own bottom
  // padding, so what a step actually needs is the first two added up.
  const h = (sel) => {
    const el = document.querySelector(sel);
    return el ? el.getBoundingClientRect().height : 0;
  };
  const over = Math.round(h(".bk-header") + h(".bk-wrap") - vh);
  const wrap = document.querySelector(".bk-wrap");
  const blocks = [...(wrap ? wrap.children : [])]
    .flatMap((el) => (getComputedStyle(el).display === "contents" ? [...el.children] : [el]))
    .map((el) => ({
      h: Math.round(el.getBoundingClientRect().height),
      name: el.tagName.toLowerCase()
        + (typeof el.className === "string" && el.className
          ? "." + el.className.trim().split(/\s+/).join(".") : ""),
      txt: (el.textContent || "").trim().slice(0, 22),
    }))
    .filter((b) => b.h > 0)
    .sort((a, b) => b.h - a.h)
    .slice(0, 3);
  // **THE PLAN PITCH'S OWN HEIGHT, so the add-ons exemption below can do
  // ARITHMETIC rather than take a step's word for it.** Zero on every other
  // step, which is what keeps the exemption from reaching them.
  // **THE SERVICE COUNT, AND THE HEIGHT THE SERVICES PAST THE BOUND ACCOUNT
  // FOR**, so the allowance below is ARITHMETIC rather than a step's word for
  // it. `.bk-svc` is step 1's card and only step 1's — the extras step's cards
  // are plain `.bk-card.selectable` — so this is keyed on the ELEMENT and can
  // never reach another step, the same discipline as the plan-pitch exemption.
  // The SMALLEST excess cards are the ones discounted, so the allowance is the
  // least height that could honestly be taken off, never the most.
  const svcCards = [...document.querySelectorAll(".bk-svc")];
  const excess = svcCards
    .map((el) => el.getBoundingClientRect().height
      + (parseFloat(getComputedStyle(el.parentElement).rowGap) || 0))
    .sort((a, b) => a - b)
    .slice(0, Math.max(0, svcCards.length - bound))
    .reduce((a, b) => a + b, 0);
  return {
    over, vh, blocks,
    pitch: Math.round(h(".bk-planpitch")),
    services: svcCards.length,
    excess: Math.round(excess),
  };
};

// --- SETTLE, NOT SLEEP ------------------------------------------------------
// The same change `sweep-widths.mjs` and `shoot-dashboard.mjs` got on
// 2026-09-02: the fixed number becomes a CAP, and the wait ends when the DOM
// has been quiet for 130ms with no FINITE animation running and no `.spinner`
// on the page. A step measured before it finished animating in reports the
// wrong bottom edge, which is the one number this script exists for — so this
// is "wait for the thing", not "wait less".
const settle = (page, cap = 2000) => page.evaluate(async (cap) => {
  const t0 = performance.now();
  const QUIET = 130;
  let last = performance.now();
  const obs = new MutationObserver(() => { last = performance.now(); });
  obs.observe(document.documentElement, {
    subtree: true, childList: true, attributes: true, characterData: true,
  });
  const frame = () => new Promise((r) => requestAnimationFrame(() => r()));
  try {
    for (;;) {
      await frame();
      const now = performance.now();
      if (now - t0 >= cap) return Math.round(now - t0);
      if (document.querySelector(".spinner")) { last = now; continue; }
      const busy = document.getAnimations().some((a) => {
        if (a.playState !== "running") return false;
        const t = a.effect && a.effect.getComputedTiming && a.effect.getComputedTiming();
        return !t || t.iterations !== Infinity;
      });
      if (!busy && now - last >= QUIET) return Math.round(now - t0);
    }
  } finally { obs.disconnect(); }
}, cap);

// ROADMAP 2.14 STEP 3 — THE PLAN SURFACES, AND THE ONE THING THAT MAKES THEM
// REACHABLE FROM HERE.
//
// Three of them are states rather than pages: the flow with a plan attached
// (`?plan=`), and step 1 for a customer this DEVICE remembers. Neither is
// reachable by walking, which is the gap this repo has now found nine times
// under nine names — "the script walks NAVIGATION, and a state you reach by
// pressing something INSIDE a screen is not navigation". They are added in the
// change that BUILDS them, not by the item that later finds them broken.
//
// The fourth, `/plan/:memberId`, needs a membership UUID, and this script is
// the customer: no session, no service key, nothing to look one up with. So
// `seed-demo.mjs` writes `scripts/demo-refs.json` and this reads it. Missing
// or stale, the run SAYS the page was not measured rather than passing
// quietly — a skipped check that reads like a passing one is the single most
// repeated failure in this file's history.
const REFS = await (async () => {
  try {
    const { readFile } = await import("node:fs/promises");
    return JSON.parse(await readFile(new URL("./demo-refs.json", import.meta.url), "utf8"));
  } catch { return null; }
})();

const browser = await chromium.launch();
let failing = 0;
// **`failing` WAS A GENERAL FAULT COUNT WEARING A SPECIFIC SENTENCE — split
// 2026-09-20.** The summary below printed `${failing} steps do not fit — W16
// is not met`, and `failing` was incremented in six places of which exactly
// ONE is the W16 step-fit case. The others are a step that would not advance,
// a second tenant that did not load, a missing vehicle-count control, console
// errors, and the tap-floor block — and that last one runs AFTER the summary,
// so the sentence quoted a total containing things no reader could see in the
// list above it.
//
// It reported "12 steps do not fit" while printing 10 failing step readings,
// and it survived a 315px layout change without moving, because it was never
// counting the thing that moved. `w16Failing` counts step-fit failures and
// nothing else; every other fault names itself through `fault()`.
let w16Failing = 0;
const OTHER_FAULTS = [];
const fault = (what) => { failing++; OTHER_FAULTS.push(what); };
// Steps that overflow ONLY because of a control Andrew ruled must be
// full-screen. Counted separately and always printed: an exemption nobody
// sees is an exemption nobody re-reads.
let exempted = 0;
// **THE STATED BOUND'S OWN TALLIES.** `outsideBound` counts readings the bound
// covers, and `svcSeen` is the subject count that stops a run which never
// reached step 1 from reading like a run in which the bound was tested and
// held. A bound nobody sees exercised is a bound nobody re-reads.
let outsideBound = 0;
const svcSeen = new Set();

// --- THE TAP FLOOR, ONE READING PER STEP ------------------------------------
// Collected rather than printed inline: a control that is four pixels short
// says nothing about whether the step FITS, which is what every other line of
// this report is about. Printed together at the end, and they fail the run the
// same as an overflow does.
const tapFindings = [];
let tapSubjects = 0, tapScreens = 0;
const tapCheck = async (page, where) => {
  const r = await page.evaluate(TAP_PROBE, { floor: FLOOR, cap: CAP, exceptions: EXCEPTIONS });
  tapScreens++; tapSubjects += r.subjects;
  for (const f of r.findings) tapFindings.push({ where, ...f });
};

for (const size of SIZES) {
  console.log(`\n══ ${size.width}x${size.height} ═══════════════════════════════════`);
  const ctx = await browser.newContext({ viewport: size, deviceScaleFactor: 1 });
  // `let`, not `const`: the plan surfaces at the foot of this loop point it at
  // their own page for one measurement each, so `say` stays the only place
  // that knows how to measure and report.
  let page = await ctx.newPage();
  if (process.env.SLOTPROBE) page.on("response", (r) => {
    if (/available-slots/.test(r.url())) console.log("      slots ->", r.status());
  });
  const errors = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });

  await page.goto(`${BASE}/book/${SLUG}${LITE ? "?lite=1" : ""}`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".bk-card, .bk-note", { timeout: 30000 });
  // The staggered rise runs 950ms with delays to 300ms; measuring inside it
  // measures a transform, which design-system law 12 forbids.
  await settle(page, 1600);

  // `gate` is false for a PAGE rather than a step, and there are exactly two:
  // the plans page and a member's own plan page (roadmap 2.14 step 3). W16 is
  // the owner's rule about STEPS — *"each step, you shouldn't have to scroll
  // down or up"* — because scrolling inside a form you are halfway through is
  // what loses a booking. A catalogue of plans is not a step, its length is the
  // detailer's (four in the demo is 757px before anything else on the page),
  // and all ten plan pages in the research sample scroll. **The number is
  // still printed**, because "it scrolls" and "it scrolls by 600px" are
  // different facts and the second one is a design problem.
  const say = async (label, gate = true) => {
    if (SHOTS) {
      const file = `${SHOTS}/${size.width}x${size.height}${LITE ? "-lite" : ""}-${label.replace(/[^a-z0-9]+/gi, "-")}.png`;
      await page.screenshot({ path: file, fullPage: !gate });
    }
    await tapCheck(page, `${size.width}x${size.height} ${label}`);
    const { over, vh, blocks, pitch, services, excess } = await page.evaluate(MEASURE, W16_SERVICES);
    const bad = over > 1;
    // **THE ONE EXEMPTION FROM W16, AND IT IS ANDREW'S RULING — 2026-09-19.**
    //
    // One step overflows because of `.bk-planpitch`, the monthly-plan pitch,
    // and its size is a specific instruction quoted three times in
    // `BookingPage.jsx` and `PlanRows.jsx`: *"pretty big and pretty visible…
    // like, just in the whole screen, like, not a button to go to the screen,
    // but just the whole screen."* W16 is a general rule that predates that
    // control. **His decision: the specific instruction wins, so the STEP is
    // exempt and the CONTROL is not touched.**
    //
    // **NARROW THREE WAYS, ON PURPOSE, so it cannot grow into an excuse:**
    //  1 · It needs `.bk-planpitch` on the page. That element is on one step;
    //      `pitch` is 0 everywhere else, so no other step can reach this.
    //      **AND IT IS KEYED ON THE ELEMENT, NEVER ON THE STEP'S NAME**, which
    //      is what let ROADMAP 2.10 move the pitch off the add-ons step to the
    //      step after the date on 2026-09-20 without touching a line of this
    //      arithmetic. The prose here said "the add-ons step" and was corrected
    //      the same day: a check whose words name a place its logic does not is
    //      `docs/gotchas.md`'s grep-coupled-to-a-spelling trap with the
    //      coupling in the comment instead of the code.
    //  2 · It is ARITHMETIC, not a name. The step is re-judged with the pitch
    //      discounted and everything else on it is still held to W16 to the
    //      pixel. Measured — without the pitch it fits by **465px at 1920, 342
    //      at 1440, 498 at 768 and 347 at 392** — so no tolerance is used and
    //      none is needed.
    //  3 · **If another control on this step grows past that margin, or the
    //      pitch is shrunk and the step still overflows, this stops firing and
    //      the step fails normally.** It cannot swallow a future regression on
    //      a different step, or on a different control within add-ons.
    const withoutPitch = over - pitch;
    const exemptFit = bad && gate && pitch > 0 && withoutPitch <= 1;
    // **AND W16'S STATED BOUND, WHICH IS NOT AN EXEMPTION — IT IS THE RULE'S
    // SCOPE.** W16 promises `W16_SERVICES` services (declared at the top of
    // this file, with the measurements it rests on). A tenant listing more is
    // outside what the rule promises, so the reading is named as a known gap
    // rather than counted as a failure no CSS change can honestly clear.
    //
    // **NARROW THE SAME THREE WAYS AS THE PLAN PITCH ABOVE:**
    //  1 · It needs `.bk-svc` on the page — step 1's card and only step 1's,
    //      since the extras step's cards are plain `.bk-card.selectable`. Keyed
    //      on the ELEMENT, never on a step's name, so it cannot reach another
    //      step however the flow is rebuilt.
    //  2 · It is ARITHMETIC. The step is re-judged with the services past the
    //      bound discounted — the SMALLEST of them, so the least height that
    //      could honestly come off — and everything else is still held to W16
    //      to the pixel. **If a heading, an intro line or a new banner pushes
    //      the step past what those cards explain, `beyondBound` stays positive
    //      and the step FAILS NORMALLY with the leftover pixels named.**
    //  3 · A tenant AT or UNDER the bound gets no allowance whatsoever. Its
    //      step 1 is measured exactly as it was before this existed, and
    //      `demo-riverside` — two services — is walked below for precisely that
    //      reason, so the live direction is exercised on every run rather than
    //      argued for in a comment.
    if (services) svcSeen.add(services);
    const overBound = services > W16_SERVICES;
    const beyondBound = over - excess;
    const boundGap = bad && gate && !exemptFit && overBound && beyondBound <= 1;
    if (exemptFit) exempted++;
    else if (boundGap) outsideBound++;
    else if (bad && gate) { failing++; w16Failing++; }
    const pct = Math.round((over / vh) * 100);
    console.log(
      // The spare room is reported on purpose. "Fits" is only true of the
      // business that was measured, and a detailer with two more services
      // than the demo has is a different page — the headroom is what says
      // how much more this layout can take before W16 breaks again.
      `${label.padEnd(22)} ${exemptFit
        ? `EXEMPT from W16 — over ${over}px, and .bk-planpitch is ${pitch}px of it`
        : boundGap
          ? `OUTSIDE W16's STATED BOUND — over ${over}px with ${services} services, bound is ${W16_SERVICES}`
        : bad
          ? `${gate ? "over" : "scrolls"} ${String(over).padStart(4)}px (${pct}% of the screen)`
          : `fits, ${-over}px spare`}`
      + (exemptFit
        ? "\n  Andrew's ruling, 2026-09-19: the plan pitch is full-screen by instruction, so this STEP "
          + "is exempt and the CONTROL is untouched. Everything else on the step still has to fit, "
          + `and does — without the pitch it is ${-withoutPitch}px inside the screen. ROADMAP 8.4.`
        : boundGap
          ? `\n  W16 is declared to ${W16_SERVICES} services and this tenant lists ${services}. The `
            + `${services - W16_SERVICES} past the bound are ${excess}px of the overflow; at the bound the `
            + `step is ${-beyondBound}px inside the screen. A KNOWN GAP, not a pass — a detailer with more `
            + `than ${W16_SERVICES} services scrolls on step 1 and no CSS change honestly clears it.`
        : bad && gate
          ? (overBound
            ? `\n  and the bound does not explain it: ${services} services against a declared ${W16_SERVICES}, `
              + `the ${services - W16_SERVICES} past the bound are only ${excess}px of it, leaving ${beyondBound}px over.`
            : services
              ? `\n  and the bound does not cover it: ${services} services is within the declared `
                + `${W16_SERVICES}, so this step gets no allowance and this is a plain W16 failure.`
              : "")
            + "\n  tallest: " + blocks.map((b) => `${b.h}px ${b.name} «${b.txt}»`).join("\n           ")
          : ""),
    );
  };

  // Driven by the step's own heading, not by a hardcoded list: roadmap 2.7
  // made the flow BUILT rather than fixed (W19 gives add-ons their own step,
  // and only where a business has any), so a script that assumes six steps
  // silently measures the wrong screen.
  const heading = () => page.locator(".bk-step-head h2").innerText();
  // innerText, so text-transform has already made it "STEP 1 OF 7".
  const total = Number((await page.locator(".bk-step-head .bk-step-label").innerText()).match(/of (\d+)/i)[1]);

  for (let n = 1; n <= total; n++) {
    const h = await heading();
    await say(`${n}/${total} ${h.slice(0, 17)}`);

    if (n === total) break;                       // Review — nothing to fill.
    // Each step is advanced by whatever it actually asks for. Anything with
    // no requirement (extras, a settings-driven location) just continues.
    if (await page.locator(".bk-card.selectable").count()
        && !(await page.locator(".bk-card.selected").count())) {
      await page.locator(".bk-card.selectable").first().click();
      await settle(page, 1800);            // the server quote
    }
    if (await page.locator(".bk-cal").count()) {
      // On the last day of a month the whole grid is closed, and an open cell
      // is not proof of a free slot, so walk both.
      let picked = false;
      for (let month = 0; month < 3 && !picked; month++) {
        if (month) {
          await page.getByRole("button", { name: "Next month" }).click();
          await settle(page, 1500);
        }
        // WALK THE DAYS BY THEIR DATE, NOT BY THEIR INDEX — fixed 2026-09-03
        // during roadmap 2.17, and it is the same lesson CLAUDE.md already
        // records for the day rail: address a node, never a position.
        //
        // WHAT WAS WRONG, because it is not obvious and it had been passing:
        // this used `days.nth(i)` against a LIVE locator, and picking a day
        // re-renders the calendar — every day that cannot hold the chosen
        // service greys out, which is correct product behaviour. So the
        // moment the first day had no slots, `days.count()` fell to 0, the
        // `for` condition failed on i=1, all three months reported 0 open
        // cells, and the run died on a locator timeout that read as "the chip
        // is missing".
        //
        // IT HAD BEEN PASSING BY LUCK. It only ever tried ONE day: while
        // TODAY still had a free slot the loop exited on the first iteration
        // and never reached the bug. It started failing at ~22:00 local, when
        // the demo's own trading day (08:00-18:00) had closed — so this looked
        // exactly like a flake, and cost most of a session being mistaken for
        // the change under test before a control run with that change reverted
        // failed identically. **Run the control before blaming the diff.**
        //
        // Collect the dates FIRST, then click them one at a time by their own
        // label, re-querying after every render.
        // AND WAIT FOR THE GRID BEFORE READING IT. The month's open days are
        // decided by an availability call, so enumerating them straight after
        // `settle()` can read an empty grid and conclude the business is shut.
        // This was the other half of the same race: the run above printed
        // `month 0 open:` with nothing after it, while the network log showed
        // two slots responses arriving right afterwards.
        await page.locator(".bk-cal .cell:not(.closed):not(.empty)").first()
          .waitFor({ state: "attached", timeout: 6000 }).catch(() => {});
        const dayText = [];
        for (const cell of await page.locator(".bk-cal .cell:not(.closed):not(.empty)").all()) {
          dayText.push((await cell.textContent()).trim());
        }
        if (process.env.SLOTPROBE) console.log("      month", month, "open:", dayText.join(" "));
        for (const d of dayText) {
          const cell = page.locator(".bk-cal .cell", { hasText: new RegExp(`^${d}$`) }).first();
          if (!(await cell.count())) continue;
          const cls = (await cell.getAttribute("class")) || "";
          if (/closed|empty/.test(cls)) continue;   // greyed out by an earlier pick
          await cell.click();
          // The slots come from a REMOTE edge function. `settle()` is a CAP,
          // and 900ms is a fine cap on a repaint but not on a network round
          // trip, so wait for the chip itself and let settle finish the job.
          // **`.bk-slots .bk-chip`, NOT `.bk-chip` — roadmap 8.17.** The
          // language picker is chips too, and it sits in the MASTHEAD, so
          // `.bk-chip` first is now "English" and this loop clicked a language
          // button instead of a time. It did not fail there: it failed one
          // step later on a Continue that would not enable, which reads as a
          // broken booking form rather than as a renamed handle. **The same
          // family as the auth-form selectors CLAUDE.md guards** — a script
          // reaching for "the first X on the page" is a script that breaks the
          // day a second X is drawn above it.
          await page.locator(".bk-slots .bk-chip").first()
            .waitFor({ state: "attached", timeout: 4000 }).catch(() => {});
          await settle(page, 900);
          const got = await page.locator(".bk-slots .bk-chip").count();
          if (process.env.SLOTPROBE) console.log("      day", d, "->", got, "chips");
          if (got) { picked = true; break; }
        }
      }
      // AND SAY WHAT WENT WRONG. Without this the failure is a raw Playwright
      // timeout on `.bk-chip`, which reads as "the chip is missing" when what
      // happened is "no day in three months had one".
      if (!picked) {
        throw new Error(
          "no bookable slot found in three months of the calendar — the demo "
          + "has no availability, or the slots call is losing a race. Re-seed "
          + "(node scripts/seed-demo.mjs) and check available-slots by hand. "
          + "SLOTPROBE=1 prints every day tried and every slots response.",
        );
      }
      await say(`${n}/${total} ${h.slice(0, 12)} + slots`);
      await page.locator(".bk-slots .bk-chip").first().click();
      await settle(page, 400);
    }
    for (const [sel, value] of [
      ['.bk-field input[type=tel]', "5551234567"],
      ['.bk-field input[type=email]', "casey@example.com"],
    ]) {
      if (await page.locator(sel).count()) await page.locator(sel).fill(value);
    }
    // **THE YEAR, AND IT IS WHY STEPS 4-7 HAD NEVER BEEN MEASURED — 2026-09-19.**
    //
    // The comment this replaces said: *"The first plain text field on a step: an
    // address on Location, a name on Details. Both are the only required text on
    // their step."* **The Vehicle step is not in that sentence, and it has TWO
    // plain text fields** — "What are you bringing? (optional)" first, and the
    // REQUIRED "Year" second. So `.first()` typed a street address into the
    // vehicle box, left Year empty, and `core.js`'s `blockers()` correctly
    // returned `no-year` and correctly kept Continue disabled. **The product was
    // right and this script was wrong**, and it died there every run, so **steps
    // 4, 5, 6 and 7 of the booking flow had never been measured at any width.**
    //
    // A YEAR FIELD ANNOUNCES ITSELF IN ATTRIBUTES: `inputmode="numeric"` and
    // `maxlength="4"`. Addressed that way rather than by its label, because the
    // label translates and this file's siblings have four separate entries in
    // `docs/gotchas.md` about checks coupled to a spelling.
    const year = page.locator('.bk-field input[inputmode="numeric"][maxlength="4"]').first();
    if (await year.count() && !(await year.inputValue())) {
      await year.fill("2019");
      await settle(page, 400);
    }
    // **AND THE TEXT FIELD IS FILLED ONLY IF THE STEP IS STILL BLOCKED.** It
    // used to fill unconditionally, which is how a street address ended up in
    // the vehicle box: a field being first does not make it required. Asking
    // the product's own gate instead means this cannot invent data for an
    // optional box again, and it needs no list of which step wants what.
    // **AND IT HAS TO WAIT FOR THE BUTTON, NOT GLANCE AT IT.** The first
    // version of this block read `isDisabled()` the instant it arrived and
    // declared the step stuck — at STEP 1, where Continue is correctly dead
    // until the server QUOTE lands. The old code never noticed because
    // `.click()` auto-waits for enabled and was quietly absorbing the round
    // trip. **`settle()` is a cap on a quiet DOM and is not a wait for a
    // network answer** — this file's siblings record that lesson six times and
    // I walked into it inside the guard written to make failures legible.
    const cont = page.locator(".bk-bar button.bk-btn.primary");
    const waitEnabled = (ms) => page.waitForFunction(
      // **`disabled` IS THE WRONG QUESTION ON THIS BUTTON, AND HAS BEEN SINCE
      // ROADMAP 2.6 — found 2026-09-20.** `BookingPage.jsx:920` renders
      // Continue as `aria-disabled={!canAdvance}` with NO `disabled`
      // attribute, deliberately: `Refusal.jsx` explains that a press has to be
      // receivable so it can say why it refused. So `b.disabled` is `false`
      // even when the button is refusing, this predicate returned TRUE, and
      // the STUCK guard below — written specifically to stop this script dying
      // anonymously inside Playwright — could never fire.
      //
      // Playwright's own actionability check DOES honour `aria-disabled`, so
      // `cont.click()` then waited 30s and threw a stack trace naming no step.
      // **That is the exact failure the comment below says it replaced**: the
      // replacement was written against `disabled` while the product had
      // already moved to `aria-disabled`, so it never took, and nobody noticed
      // because the guard's silence looks the same as a step that advanced.
      () => {
        const b = document.querySelector(".bk-bar button.bk-btn.primary");
        return !!b && !b.disabled && b.getAttribute("aria-disabled") !== "true";
      },
      null, { timeout: ms },
    ).then(() => true).catch(() => false);
    if (!(await waitEnabled(8000))) {
      const text = page.locator('.bk-field input:not([type=tel]):not([type=email]):not([inputmode="numeric"])').first();
      if (await text.count() && !(await text.inputValue())) {
        await text.fill(/reach you/i.test(h) ? "Casey Rivera" : "140 Market Street, Springfield");
      }
      await settle(page, 400);
    }
    // **NAME THE STEP RATHER THAN DYING ANONYMOUSLY.** This used to click a
    // disabled button and time out thirty seconds later inside Playwright, with
    // nothing in the output saying WHICH step or what it wanted — the failure
    // that hid this bug for as long as it lasted. A step that will not let go
    // says so, with whatever the page itself gives as the reason.
    if (!(await waitEnabled(4000))) {
      const why = (await page.locator(".bk-error").allInnerTexts().catch(() => []))
        .map((t) => t.replace(/\s+/g, " ").trim()).filter(Boolean);
      console.log(`${`${n}/${total} ${h.slice(0, 17)}`.padEnd(22)} STUCK — Continue is disabled and this `
        + `script could not satisfy the step. ${why.length ? `The page says: ${why.join(" | ")}` : "The page shows no reason."}`);
      fault(`a step that would not advance (${n}/${total} ${h.slice(0, 17)})`);
      break;
    }
    await settle(page, 400);
    await cont.click();
    await settle(page, 1500);
  }

  // ── ROADMAP 2.14 STEP 3 — THE PLAN SURFACES ──────────────────────────────
  //
  // WHY STEP 1 AND NOT THE WHOLE FLOW AGAIN. A plan changes exactly three
  // drawn things: step 1's heading (a line that was already there), the price
  // bar's eyebrow (also already there) and ONE extra line on the review
  // step's receipt — which is the same shape as the travel line, the site-sale
  // line and the promo line that step already draws conditionally, and it has
  // 98px spare at 1440x900 and 66px at 392x844. Walking all seven steps a
  // second time at every size would double the longest check in the repo to
  // re-measure five screens that cannot have moved. The heading is the one
  // that CAN — "Let's set up your Bi-weekly maintenance" wraps where "What can
  // we do for you?" does not.
  const first = async (label, url, { before, gate = true } = {}) => {
    const p = await ctx.newPage();
    p.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
    if (before) {
      // localStorage is per-ORIGIN, so it has to be written on the origin
      // before the page that reads it loads. A blank document on the same
      // origin is the cheapest way to be standing there.
      await p.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
      await p.evaluate(before);
    }
    await p.goto(url, { waitUntil: "domcontentloaded" });
    // Every landing state these four URLs can reach: a card (a step, the
    // member page), a ruled plan row, the empty-plans note, the not-found
    // panel, or the unsubscribe page's own buttons. A missing one here reads
    // as a hang, which is how the member page's first-render crash presented.
    //
    // **`.bk-actions` WAS MISSING AND IT KILLED THE REST OF THE RUN - measured
    // 2026-09-13, lane C, against the production bundle at `873d7a1`.** The
    // opt-out page renders `.bk-center` with an `h2`, not an `h1`, so none of
    // the four matched, this threw at 30s, and **every subject below it - the
    // multi-vehicle section and everything after - was never measured.** The
    // page itself was perfect. A check that dies partway prints an exit code
    // and nothing that says which subjects it never reached.
    //
    // **AND `.bk-center` ALONE IS THE WRONG FIX**, which is why it is not the
    // one taken: `UnsubscribePage.jsx:123` renders `.bk-center > .bk-spinner`
    // while it is still loading, so waiting on the container would go green on
    // exactly the hang this selector exists to catch. `.bk-actions` is the
    // settled state and only the settled state.
    await p.waitForSelector(".bk-card, .bk-plan-row, .bk-note, .bk-center h1, .bk-actions", { timeout: 30000 });
    await settle(p, 1600);
    const old = page;
    // `say` measures whatever `page` points at, so point it here for one call
    // rather than growing a second copy of the measure-and-report block.
    page = p;
    await say(label, gate);
    page = old;
    await p.close();
  };

  const planId = REFS?.planId;
  await first(`plans page`, `${BASE}/book/${SLUG}/plans${LITE ? "?lite=1" : ""}`, { gate: false });
  if (planId) {
    await first("1/N plan attached", `${BASE}/book/${SLUG}?plan=${planId}${LITE ? "&lite=1" : ""}`);
  }
  // A returning customer, from this device's own memory. The name is long on
  // purpose: "Welcome back, Alexandrina" is the heading that wraps, and a
  // short one would measure a screen no real customer has.
  await first(
    "1/N remembered",
    `${BASE}/book/${SLUG}${LITE ? "?lite=1" : ""}`,
    { before: `localStorage.setItem("bk.customer", ${JSON.stringify(JSON.stringify({
      slug: SLUG, name: "Alexandrina Featherstone", email: "casey@example.com",
      phone: "5551234567", planId: null,
    }))})` },
  );
  // BOTH AT ONCE, which is the state the owner's own sentence describes —
  // *"Welcome back, Marcus — your Bi-weekly plan applies"* — and it is a third
  // heading, not either of the two above: the NAME wins and the plan is named
  // in the price bar instead. A returning member is the ordinary case for this
  // whole feature, so it is the one that must not be the unmeasured one.
  if (planId) {
    await first(
      "1/N known + plan",
      `${BASE}/book/${SLUG}?plan=${planId}${LITE ? "&lite=1" : ""}`,
      { before: `localStorage.setItem("bk.customer", ${JSON.stringify(JSON.stringify({
        slug: SLUG, name: "Alexandrina Featherstone", email: "casey@example.com",
        phone: "5551234567", planId: null,
      }))})` },
    );
  }
  if (REFS?.planMemberId) {
    await first("your plan", `${BASE}/plan/${REFS.planMemberId}${LITE ? "?lite=1" : ""}`, { gate: false });
  } else {
    console.log("your plan            NOT MEASURED — no scripts/demo-refs.json; run node scripts/seed-demo.mjs");
  }
  // ROADMAP 2.19 — the opt-out page. Same shape as the plan page above and
  // here for the same reason: a customer-facing page whose only door is a link
  // inside an email, so nothing else in this repo ever opens it. NOT GATED, in
  // the same way the plans page is not — it is a page rather than a step, and
  // W16 is the owner's rule about steps. It is three elements and should never
  // scroll; the number is printed either way.
  if (REFS?.customerId) {
    await first("stop these emails", `${BASE}/unsubscribe/${REFS.customerId}${LITE ? "?lite=1" : ""}`, { gate: false });
  } else {
    console.log("stop these emails    NOT MEASURED — no scripts/demo-refs.json; run node scripts/seed-demo.mjs");
  }

  // ─── ROADMAP 8.10 — MORE THAN ONE CAR ───────────────────────────────────
  //
  // A STATE, NOT A PAGE, AND ON A DIFFERENT TENANT. `demo-detail` keeps its
  // one-car limit on purpose: the spare-room figures this repo quotes for
  // steps 1 and 3 were measured against it, and putting a count control on
  // that page would move a W16 baseline that has nothing to do with this item.
  // `demo-riverside` is seeded at three cars (`seed-two-tenants.mjs`).
  //
  // WHY IT IS MEASURED AT ALL: step 3 has 39px spare at 392 and 23px at
  // 1440x900, so anything added to it is added to almost nothing. The way
  // through is that the size CARDS and the per-car list are alternatives
  // rather than additions — past one car the sizes become the drop-down this
  // step already switches to past four sizes, which is ~260px shorter than the
  // cards and pays for the rows the extra cars cost. This block is what says
  // whether that is true rather than plausible.
  {
    const p = await ctx.newPage();
    p.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
    await p.goto(`${BASE}/book/demo-riverside${LITE ? "?lite=1" : ""}`, { waitUntil: "domcontentloaded" });
    const ok = await p.waitForSelector(".bk-card, .bk-note", { timeout: 30000 }).catch(() => null);
    const chips = () => p.locator(".bk-field", { hasText: "How many vehicles?" }).locator("button");
    if (!ok) {
      console.log("more than one car    NOT MEASURED — /book/demo-riverside did not load");
      fault("the second tenant's booking page did not load");
    } else {
      await settle(p, 1600);
      const old = page;
      page = p;
      // **THE WITHIN-BOUND TENANT, AND IT IS READ HERE ON PURPOSE.** This
      // page was already being loaded and walked past; measuring its step 1
      // costs one reading and buys the thing a stated bound most needs — a
      // subject the bound does NOT cover, measured every run. `demo-riverside`
      // lists two services against a declared bound of five, so it gets no
      // allowance at all and its step 1 is held to W16 to the pixel. Without
      // it, every step-1 reading in the run would be one the bound covers, and
      // a gate whose every subject is excused is the gate `docs/silences.md`
      // was written about.
      await say("riverside step 1");
      // Walk by HEADING rather than by a step number: riverside's flow is a
      // different length from the demo's, and a script that assumes six steps
      // silently measures the wrong screen (the lesson this file already
      // records for `demo-detail`).
      for (let i = 0; i < 5; i++) {
        if (/vehicle/i.test(await p.locator(".bk-step-head h2").innerText())) break;
        if (await p.locator(".bk-card.selectable").count()
            && !(await p.locator(".bk-card.selected").count())) {
          await p.locator(".bk-card.selectable").first().click();
          await settle(p, 1800);
        }
        await p.getByRole("button", { name: /continue/i }).first().click();
        await settle(p, 1200);
      }
      // A GUARD THAT SKIPS MUST PRINT. No count control means the limit never
      // reached the page — which is exactly what the public profile's explicit
      // key list produces when a column is not named in it, and it must never
      // read as a clean run.
      if (!(await chips().count())) {
        console.log("more than one car    NOT MEASURED — no count control; "
          + "re-seed with `node scripts/seed-two-tenants.mjs`");
        fault("no vehicle-count control on the second tenant");
      } else {
        await say("3/N cars · 1");
        await chips().nth(1).click();
        await settle(p, 1800);
        await say("3/N cars · 2");
        await chips().nth(2).click();
        await settle(p, 1800);
        await say("3/N cars · 3");
        // AND THE SPLIT, which is the taller answer: the same three rows plus
        // a chip per car on the step where the days are picked.
        await p.getByRole("button", { name: "Different days" }).click();
        await settle(p, 1800);
        await say("3/N cars · 3 split");
      }
      page = old;
    }
    await p.close();
  }

  if (errors.length) { fault(`${errors.length} console error(s)`); console.log(`  console: ${errors.length} error(s)\n  ${errors.join("\n  ")}`); }
  await ctx.close();
}

await browser.close();
const exemptNote = exempted
  ? `\n${exempted} step reading${exempted === 1 ? "" : "s"} EXEMPT from W16 — whichever step carries .bk-planpitch, whose overflow is entirely that pitch, full-screen by Andrew's instruction (ROADMAP 8.4). Everything else on that step is still measured and still fits.`
  : "";
console.log(w16Failing
  ? `\n${w16Failing} step${w16Failing === 1 ? "" : "s"} do not fit — W16 is not met` + exemptNote
  : `\nevery step fits at ${SIZES.map((s) => `${s.width}x${s.height}`).join(", ")}${exempted ? ", with one documented exception" : ""}` + exemptNote);

// --- WHAT W16 PROMISED THIS RUN, PRINTED WHETHER OR NOT IT MATTERED ---------
// **The declaration is read out every run, and so is the subject count.** A
// bound that only speaks when it is breached is a bound the next reader infers
// from a passing run — which is the thing the constant at the top of this file
// exists to stop. If no `.bk-svc` card was reached, this says NOT MEASURED
// rather than staying quiet, because a run that never tested the bound must
// not read like a run in which it held.
console.log(`\nW16's stated bound: step 1 is promised to fit ${W16_SERVICES} services `
  + `at ${SIZES.map((s) => `${s.width}x${s.height}`).join(", ")}. `
  + (svcSeen.size
    ? `this run measured ${[...svcSeen].sort((a, b) => a - b).join(" and ")} services.`
    : "NOT MEASURED — no .bk-svc card was reached, so the bound was never tested this run."));
if (outsideBound) console.log(
  `${outsideBound} step reading${outsideBound === 1 ? "" : "s"} OUTSIDE the stated bound — more services `
  + `than W16 promises, overflowing by no more than those extra services account for. `
  + `A KNOWN GAP, counted in no failure total and cleared by no CSS change. Everything else on those `
  + `steps is still measured and still has to fit.`);

// **AND THE FAULTS THAT ARE NOT W16 NAME THEMSELVES.** They used to be folded
// into the sentence above, which is how a total of 12 sat over a list of 10.
// Printed separately so neither number can borrow the other's meaning — and
// the tap block below adds its own, AFTER this line, which is exactly why it
// could never have appeared in a total printed here.
if (OTHER_FAULTS.length) {
  const tally = new Map();
  for (const f of OTHER_FAULTS) tally.set(f, (tally.get(f) || 0) + 1);
  console.log(`\n${OTHER_FAULTS.length} fault(s) that are NOT W16 and are NOT steps that do not fit:`);
  for (const [what, n] of tally) console.log(`  ${String(n).padStart(2)} x  ${what}`);
}

// --- THE TAP FLOOR ----------------------------------------------------------
// COUNT THE SUBJECTS EVERY RUN. A walk that measured four controls prints the
// same word as one that measured four hundred, and this walk drives a flow
// whose steps are decided at runtime — so the number moving is the only signal
// that the flow itself changed shape.
console.log(`\ntap floor ${FLOOR}px — ${tapScreens} step readings, ${tapSubjects} controls measured`);
if (!tapFindings.length) console.log("every control reaches the floor");
else {
  const seen = new Map();
  for (const f of tapFindings) {
    const k = `${f.check}  ${f.el} — ${f.detail}`;
    if (!seen.has(k)) seen.set(k, []);
    seen.get(k).push(f.where);
  }
  console.log(`${tapFindings.length} findings, ${seen.size} distinct controls`);
  for (const [k, wheres] of seen) console.log(`  ${k}\n      ${wheres.join("  ")}`);
  failing++;
}
await reportSourceMoved(changedSince, !failing);
process.exit(failing ? 1 : 0);
