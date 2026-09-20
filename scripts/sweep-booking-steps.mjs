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
const BASE = process.env.BASE || "http://localhost:5173";
const SLUG = "demo-detail";
const SHOTS = process.argv.find((a) => a.startsWith("--shots="))?.slice(8) ?? "";
// CLAUDE.md § Design: every width is checked in the normal path AND ?lite=1.
const LITE = process.argv.includes("--lite");

// Runs in the page. `.bk-wrap` is the column; its children are the blocks a
// step is made of, so naming the tallest three names the thing to fix.
const MEASURE = () => {
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
  return { over, vh, blocks, pitch: Math.round(h(".bk-planpitch")) };
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
// Steps that overflow ONLY because of a control Andrew ruled must be
// full-screen. Counted separately and always printed: an exemption nobody
// sees is an exemption nobody re-reads.
let exempted = 0;

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
    const { over, vh, blocks, pitch } = await page.evaluate(MEASURE);
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
    if (exemptFit) exempted++;
    else if (bad && gate) failing++;
    const pct = Math.round((over / vh) * 100);
    console.log(
      // The spare room is reported on purpose. "Fits" is only true of the
      // business that was measured, and a detailer with two more services
      // than the demo has is a different page — the headroom is what says
      // how much more this layout can take before W16 breaks again.
      `${label.padEnd(22)} ${exemptFit
        ? `EXEMPT from W16 — over ${over}px, and .bk-planpitch is ${pitch}px of it`
        : bad
          ? `${gate ? "over" : "scrolls"} ${String(over).padStart(4)}px (${pct}% of the screen)`
          : `fits, ${-over}px spare`}`
      + (exemptFit
        ? "\n  Andrew's ruling, 2026-09-19: the plan pitch is full-screen by instruction, so this STEP "
          + "is exempt and the CONTROL is untouched. Everything else on the step still has to fit, "
          + `and does — without the pitch it is ${-withoutPitch}px inside the screen. ROADMAP 8.4.`
        : bad && gate ? "\n  tallest: " + blocks.map((b) => `${b.h}px ${b.name} «${b.txt}»`).join("\n           ") : ""),
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
      () => { const b = document.querySelector(".bk-bar button.bk-btn.primary"); return !!b && !b.disabled; },
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
      failing++;
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
      failing++;
    } else {
      await settle(p, 1600);
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
      const old = page;
      page = p;
      // A GUARD THAT SKIPS MUST PRINT. No count control means the limit never
      // reached the page — which is exactly what the public profile's explicit
      // key list produces when a column is not named in it, and it must never
      // read as a clean run.
      if (!(await chips().count())) {
        console.log("more than one car    NOT MEASURED — no count control; "
          + "re-seed with `node scripts/seed-two-tenants.mjs`");
        failing++;
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

  if (errors.length) { failing++; console.log(`  console: ${errors.length} error(s)\n  ${errors.join("\n  ")}`); }
  await ctx.close();
}

await browser.close();
const exemptNote = exempted
  ? `\n${exempted} step reading${exempted === 1 ? "" : "s"} EXEMPT from W16 — whichever step carries .bk-planpitch, whose overflow is entirely that pitch, full-screen by Andrew's instruction (ROADMAP 8.4). Everything else on that step is still measured and still fits.`
  : "";
console.log(failing
  ? `\n${failing} step${failing === 1 ? "" : "s"} do not fit — W16 is not met` + exemptNote
  : `\nevery step fits at ${SIZES.map((s) => `${s.width}x${s.height}`).join(", ")}${exempted ? ", with one documented exception" : ""}` + exemptNote);

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
