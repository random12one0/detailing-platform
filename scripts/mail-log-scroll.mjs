// DOES THE MAIL LOG'S LONG LIST SCROLL IN ITS OWN THEMED BOX, OR DOES THE
// BROWSER STILL DRAW ITS OWN BAR ACROSS THIS DESIGN — ROADMAP 3.1a.
//
//   node scripts/mail-log-scroll.mjs
//   node scripts/mail-log-scroll.mjs --break=unbound    # sabotage: the bound removed
//   node scripts/mail-log-scroll.mjs --break=unstyled   # sabotage: the scrollbar declarations reverted to the browser's
//
// Needs the dev server, the seed, and `.env` loaded (`set -a; . ./.env; set +a`).
// Signs in as the demo tenant's OWNER and writes nothing anywhere.
//
// ---------------------------------------------------------------------------
// WHY THIS EXISTS RATHER THAN A LINE IN `mail-log.mjs`
// ---------------------------------------------------------------------------
// 3.1a's done-when is *visual* — "the long list scrolls without a native bar
// drawn across this design" — and the session that built it said in its own
// completion note that it never saw the scrollbar: **headless Chromium draws
// overlay scrollbars with a zero-width layout gutter**, so the custom thumb
// never composited into any screenshot and `scrollbar-width` / `::-webkit-
// scrollbar-*` were taken on the CSS spec rather than on a measurement. That
// is the gap the supervisor reopened the box for. `mail-log.mjs` is headless
// by default and declares its assertion count as an equality, so the honest
// place for a differently-launched browser is its own file.
//
// ---------------------------------------------------------------------------
// THE ITEM HAS TWO HALVES AND THIS MACHINE CAN ONLY MEASURE ONE OF THEM
// ---------------------------------------------------------------------------
// **Half one, structural, and it is the load-bearing half.** The bar Andrew
// saw was never MailLog's own: `.settings-col > .settings-body` is itself
// `overflow-y: auto`, shared by all 24 "more" screens, and a 29-row list
// pushed it past its height so the browser drew ITS bar down the side of the
// screen. So the test of "no native bar drawn across this design" is whether
// that ancestor still overflows at all, measured at both widths — and that is
// perfectly answerable headless.
//
// **Half two, the thumb's appearance, and it CANNOT be measured here.** It
// needs a browser that lays out a classic scrollbar gutter, and this machine
// has none: the `chrome` channel is not installed, `headless: false` dies with
// `spawn UNKNOWN`, `--disable-features=OverlayScrollbar` leaves the gutter at
// 0px (probed, both with the flag and without), and Firefox is not downloaded.
// An overlay scrollbar reserves no gutter and composites into no screenshot.
// **So the gutter is RECORDED as a dimension and listed as UNJUDGEABLE by
// name — never counted as a pass and never dressed up as one.** Andrew's own
// eyes are the instrument for it; `FOR-ANDREW.md` carries the ten-second look.
//
// **AND THE FIRST VERSION OF THIS CHECK PRINTED A FALSE DEFECT, which is the
// direction that gets working code "fixed" (`docs/gotchas.md` 107).** It asked
// "does the document overflow at all" and reddened at both widths. It does:
// 912 against 900 at 1440, 922 against 844 at 392. **Neither is the list.**
// `.settings-body` does not overflow and cannot scroll at 1440 (measured), the
// 392 layout has no `.settings-body` at all — it is a full `settings-page`
// whose own 78px of page scroll is the design — and the box beside those
// numbers holds 2,298px and 3,284px of scrollable list respectively. A dozen
// pixels of ordinary page is not a bar drawn across a design.
//
// **So the rule is a COMPARISON, not a threshold, and it needs no invented
// number:** the page's overflow must be SMALLER than the list's own scrollable
// height. That is just "the thing the page is scrolling is not this list", and
// it is exactly what the `unbound` sabotage breaks — unbound, the box stops
// scrolling at all and the page grows by the whole list instead.
//
// What IS checkable about the styling, and is checked, is that the two
// standard declarations actually REACH the element: `scrollbar-width` and
// `scrollbar-color` read back from computed style in Chromium even with no bar
// drawn. That catches the trap CLAUDE.md names — a `var()` resolving to its
// fallback for ever because the custom property was declared on a different
// element — which would leave the whole rule decoration. It does not and
// cannot prove what the bar LOOKS like.
//
// WHAT IT ASSERTS, PER WIDTH — 8, DECLARED RATHER THAN COUNTED (gotchas 98)
//   box/exists            the wrapper is on the screen
//   box/rules-in-effect   `scrollbar-width`/`scrollbar-color` reach the element
//   box/overflows         the list is genuinely longer than its box
//   box/scrolls           the box's own scrollTop moves and lands
//   page/ancestors-still  `.settings-body` and the document do not move with it
//   page/not-page-scroll  the PAGE's overflow is not the list's length
//   box/no-overlap        no row's box overlaps the next, at top / middle / bottom
//   page/console          nothing on the console at this width
//
// 2 widths x 8 + 4 canaries = **20**, asserted as an equality.
//
// THE TWO CANARIES ARE AIMED AT THE TWO RULES THAT COULD PASS ON NOTHING, and
// each sabotage PROVES ITS OWN EDIT LANDED before judging the result — a
// sabotage whose injection silently misses prints the same green a caught one
// does (`docs/gotchas.md` 102).
//   * **unbound** — `max-height: none; overflow: visible`. `overflows`,
//     `scrolls` and `not-page-scroll` must all go red. Without it, a box that simply never filled
//     would satisfy "nothing overlaps and nothing moves".
//   * **unstyled** — `scrollbar-width: auto; scrollbar-color: auto`, which is
//     what the element computes to if the rule never reaches it.
//     `rules-in-effect` must go red. Without it, that rule would be satisfied
//     by any value at all, including the browser's own default.

import { createRequire } from "node:module";
import { mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { REPO, writeReceipt } from "./receipt.mjs";
import { demoOwner, demoOwnerEmail } from "./lib/demoOwner.mjs";

const { chromium } = createRequire(import.meta.url)("./../app/node_modules/playwright/index.js");

const BASE = process.env.BASE_URL || process.env.BASE || "http://localhost:5173";
const ART = join(REPO, ".manager-shots", "3.1a");
const ARGS = process.argv.slice(2);
const BREAK = (ARGS.find((a) => a.startsWith("--break=")) || "").split("=")[1] || null;

if (!process.env.SUPABASE_URL) {
  console.error("Missing SUPABASE_URL — run `set -a; . ./.env; set +a` first.");
  console.error("NOTHING WAS MEASURED. This is not a pass.");
  process.exit(2);
}

const SIZES = [{ w: 1440, h: 900 }, { w: 392, h: 844 }];
const PER_WIDTH = 8;
const EXPECTED_ASSERTIONS = SIZES.length * PER_WIDTH + 4;
// `--fog-2` is `#7B858A` (theme.css:61). WRITTEN OUT rather than read off the
// page: a check that took its expectation from the thing under test would
// agree with it by construction.
const FOG_2_RGB = "rgb(123, 133, 138)";

// THE RULES ARE PURE FUNCTIONS OVER A SNAPSHOT, so a canary runs through the
// very same code the real reading does — `docs/gotchas.md` 95.
const rulesInEffect = (s) => s.scrollbarWidth === "thin"
  && typeof s.scrollbarColor === "string"
  && s.scrollbarColor.includes(FOG_2_RGB);
const overflows = (s) => s.scrollH > s.clientH + 20;
// A TOLERANCE, AND IT IS NOT LAZINESS. The rows sit flush by design — they are
// separated by `.row-item`'s border-top, not by a gap — so the honest reading
// is ZERO, and on fractional layout zero arrives as -0.02px. The first version
// of this rule was `gap >= 0` and it reddened under `--break=unstyled` at 392
// while PRINTING "tightest gap 0px", because the report rounded what the rule
// did not. Real stacking — the regression this exists for, where every row
// painted on the one above it — is tens of pixels, not hundredths. The number
// is printed to two decimals now so nobody reads a rounded 0 again.
// RELAXING AN ASSERTION DISARMS THE CANARY AIMED AT IT (`docs/gotchas.md` 95),
// so `the-stacked-rows` below was added in this same edit and run.
const OVERLAP_TOL = 0.5;
const noOverlap = (rows) => rows.every((r) => r.gap >= -OVERLAP_TOL);
// THE PAGE MAY SCROLL. IT MAY NOT SCROLL *BY THE LIST*. A comparison rather
// than a threshold, so there is no invented number to drift — see the header.
const notPageScroll = (s) => s.bodyOverflows !== true && s.docOver < s.boxScrollable;

async function run() {
  rmSync(ART, { recursive: true, force: true });
  mkdirSync(ART, { recursive: true });

  const failures = [], observed = [], canaries = [], unjudgeable = [], sabotage = [];
  let assertions = 0;
  const ok = (cond, id, detail) => {
    assertions += 1;
    observed.push({ id, ok: !!cond, detail });
    if (!cond) failures.push(`${id} — ${detail}`);
    console.log(`${cond ? "  ok  " : "  FAIL"} ${id}${detail ? `  ${detail}` : ""}`);
  };

  // HEADLESS, DELIBERATELY: headed dies with `spawn UNKNOWN` on this machine.
  // The gutter reading below is what says which kind of scrollbar you got.
  const browser = await chromium.launch();
  try {
    for (const { w, h } of SIZES) {
      const ctx = await browser.newContext({ viewport: { width: w, height: h } });
      const page = await ctx.newPage();
      const noise = [];
      page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") noise.push(m.text()); });
      page.on("pageerror", (e) => noise.push(String(e)));
      // A BARE "Failed to load resource" NAMES NOTHING. The response listener
      // is what turns a console smudge into an address somebody can act on.
      page.on("response", (r) => { if (r.status() >= 400) noise.push(`HTTP ${r.status()} ${r.url()}`); });

      await page.goto(`${BASE}/app`, { waitUntil: "domcontentloaded" });
      await page.waitForSelector("input[type=email]", { timeout: 30000 });
      await page.fill("input[type=email]", demoOwnerEmail);
      await page.fill("input[type=password]", demoOwner().password);
      await page.click("form button.btn.primary");
      await page.waitForSelector(".tabbar", { timeout: 30000 });
      await page.waitForSelector('[data-tour="gear"]', { timeout: 25000 });
      await page.click('[data-tour="gear"]');
      await page.waitForSelector('[data-settings-key="mail"]', { timeout: 20000 });
      await page.click('[data-settings-key="mail"]');
      await page.waitForSelector("[data-mail-log]", { timeout: 20000 });
      // ATTACHED, NEVER VISIBLE — a busy container has no box while it is busy
      // and the wait times out on a screen that is working (gotchas 107).
      await page.waitForFunction(() => {
        const c = document.querySelector("[data-mail-log]");
        return !!c && !c.querySelector('.rows[aria-busy="true"]');
      }, null, { timeout: 25000 }).catch(() => {});

      // ── THE SABOTAGE, AND THE PROOF IT LANDED ────────────────────────────
      if (BREAK) {
        const css = BREAK === "unbound"
          ? "[data-mail-log] .mail-scroll{max-height:none!important;overflow:visible!important}"
          : BREAK === "unstyled"
            ? "[data-mail-log] .mail-scroll{scrollbar-width:auto!important;scrollbar-color:auto!important}"
            : null;
        if (!css) { console.error(`unknown --break=${BREAK}`); process.exit(2); }
        const read = () => page.evaluate(() => {
          const el = document.querySelector("[data-mail-log] .mail-scroll");
          const cs = getComputedStyle(el);
          return { maxH: cs.maxHeight, color: cs.scrollbarColor, swidth: cs.scrollbarWidth };
        });
        const before = await read();
        await page.addStyleTag({ content: css });
        const after = await read();
        const landed = BREAK === "unbound" ? after.maxH !== before.maxH : after.color !== before.color;
        sabotage.push({ width: w, break: BREAK, before, after, landed });
        if (!landed) {
          console.error(`SABOTAGE --break=${BREAK} DID NOT LAND at ${w}: ${JSON.stringify(before)} -> ${JSON.stringify(after)}`);
          console.error("A run whose edit never applied is an ORDINARY CLEAN RUN, not a caught sabotage (gotchas 102).");
          process.exit(2);
        }
      }

      const snap = await page.evaluate(() => {
        const box = document.querySelector("[data-mail-log] .mail-scroll");
        const body = document.querySelector(".settings-body");
        const doc = document.scrollingElement;
        const g = (el) => (el ? el.offsetWidth - el.clientWidth : null);
        const cs = box ? getComputedStyle(box) : null;
        return {
          exists: !!box,
          gutter: g(box),
          scrollbarWidth: cs ? cs.scrollbarWidth : null,
          scrollbarColor: cs ? cs.scrollbarColor : null,
          scrollH: box?.scrollHeight ?? 0,
          clientH: box?.clientHeight ?? 0,
          bodyGutter: g(body),
          hasBody: !!body,
          docOver: doc ? doc.scrollHeight - doc.clientHeight : 0,
          boxScrollable: box ? box.scrollHeight - box.clientHeight : 0,
          bodyOverflows: body ? body.scrollHeight > body.clientHeight + 2 : null,
        };
      });

      ok(snap.exists, `${w}/box/exists`, snap.exists ? ".mail-scroll is on the screen" : "no .mail-scroll element");
      ok(rulesInEffect(snap), `${w}/box/rules-in-effect`,
        `scrollbar-width "${snap.scrollbarWidth}", scrollbar-color "${snap.scrollbarColor}" (--fog-2 is ${FOG_2_RGB})`);
      // THE APPEARANCE, NAMED RATHER THAN SKIPPED. A 0px gutter means this
      // browser laid out no bar at all, so no screenshot here can show what
      // the thumb looks like. Recorded, and folded into the verdict in neither
      // direction.
      if (snap.gutter === 0) {
        unjudgeable.push(`${w}/box/thumb-appearance — 0px gutter: an overlay scrollbar, so there was no bar `
          + `laid out to photograph. The thumb's look is Andrew's eyes, not this run's.`);
      }
      ok(overflows(snap), `${w}/box/overflows`, `scrollHeight ${snap.scrollH} vs clientHeight ${snap.clientH}`);

      // ── SCROLL THE BOX AND ASK WHO MOVED ─────────────────────────────────
      const moved = await page.evaluate(async () => {
        const box = document.querySelector("[data-mail-log] .mail-scroll");
        const body = document.querySelector(".settings-body");
        const doc = document.scrollingElement;
        const b0 = body?.scrollTop ?? 0, d0 = doc?.scrollTop ?? 0;
        box.scrollTop = 200;
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
        return { boxTop: box.scrollTop, bodyDelta: (body?.scrollTop ?? 0) - b0, docDelta: (doc?.scrollTop ?? 0) - d0 };
      });
      ok(moved.boxTop >= 180, `${w}/box/scrolls`, `the box's own scrollTop landed at ${moved.boxTop} (asked 200)`);
      ok(moved.bodyDelta === 0 && moved.docDelta === 0, `${w}/page/ancestors-still`,
        `.settings-body moved ${moved.bodyDelta}px, the document moved ${moved.docDelta}px`);
      ok(notPageScroll(snap), `${w}/page/not-page-scroll`,
        `the page overflows by ${snap.docOver}px, the list by ${snap.boxScrollable}px; `
        + `.settings-body ${snap.hasBody ? `overflows ${snap.bodyOverflows}` : "is not in this layout"}`);

      // ── NO ROW ON TOP OF ANOTHER, at three scroll positions. This is the
      //    regression the builder hit live and the reason the bound sits on a
      //    wrapper rather than on `.rows`. ──────────────────────────────────
      const rows = [];
      for (const frac of [0, 0.5, 1]) {
        const at = await page.evaluate(async (f) => {
          const box = document.querySelector("[data-mail-log] .mail-scroll");
          box.scrollTop = Math.round((box.scrollHeight - box.clientHeight) * f);
          await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
          const items = [...box.querySelectorAll(".row-item")].map((e) => e.getBoundingClientRect());
          let worst = Infinity;
          for (let i = 1; i < items.length; i += 1) worst = Math.min(worst, items[i].top - items[i - 1].bottom);
          return { n: items.length, gap: items.length > 1 ? worst : null };
        }, frac);
        rows.push({ frac, n: at.n, gap: at.gap === null ? Infinity : at.gap });
        await page.screenshot({ path: join(ART, `scroll-${w}-${String(frac).replace(".", "")}.png`) });
      }
      ok(noOverlap(rows), `${w}/box/no-overlap`,
        rows.map((r) => `at ${r.frac * 100}%: ${r.n} rows, tightest gap ${r.gap.toFixed(2)}px`).join("; "));
      ok(noise.length === 0, `${w}/page/console`, noise.length ? noise.slice(0, 3).join(" | ") : "0 errors, 0 warnings");

      await ctx.close();
    }

    // ── THE CANARIES. Pure functions, fed a snapshot each, so they bite the
    //    production rule rather than a copy of it. ─────────────────────────
    const c1 = rulesInEffect({ scrollbarWidth: "auto", scrollbarColor: "auto" });
    canaries.push({ name: "the-browsers-own-scrollbar", flagged: !c1 });
    ok(!c1, "canary/the-browsers-own-scrollbar",
      "`scrollbar-width: auto; scrollbar-color: auto` must NOT read as styled");
    const c2 = overflows({ scrollH: 400, clientH: 400 });
    canaries.push({ name: "the-list-that-never-filled", flagged: !c2 });
    ok(!c2, "canary/the-list-that-never-filled", "a list no longer than its box must NOT read as overflowing");
    // Every row painted on the one above it, which is the regression the
    // builder hit live when the bound sat on `.rows` itself.
    const c4 = noOverlap([{ gap: 0 }, { gap: -12 }, { gap: 4 }]);
    canaries.push({ name: "the-stacked-rows", flagged: !c4 });
    ok(!c4, "canary/the-stacked-rows", "rows overlapping by 12px must NOT read as clear");
    // The page grown by the whole list, which is the pre-fix screen.
    const c3 = notPageScroll({ bodyOverflows: false, docOver: 2800, boxScrollable: 0 });
    canaries.push({ name: "the-page-grown-by-the-list", flagged: !c3 });
    ok(!c3, "canary/the-page-grown-by-the-list",
      "a page overflowing by 2800px over a list that scrolls by 0 must NOT read as contained");

    if (assertions !== EXPECTED_ASSERTIONS) {
      failures.push(`assertion count ${assertions} != declared ${EXPECTED_ASSERTIONS} — a width that never rendered`);
    }
  } finally {
    await browser.close();
  }

  const status = failures.length ? "fail" : "pass";
  const { path } = writeReceipt({
    check_id: "mail-log-scroll",
    started_at: new Date(Date.now() - process.uptime() * 1000).toISOString(),
    status,
    expected_targets: SIZES.length,
    discovered_targets: SIZES.length,
    attempted_targets: SIZES.length,
    completed_targets: SIZES.length,
    skipped_targets: 0,
    assertions_executed: assertions,
    min_assertions: EXPECTED_ASSERTIONS,
    assertion_floor:
      "2 widths x 8 (exists, gutter-ours, overflows, scrolls, ancestors-still, no-native-bar, no-overlap, "
      + "console) + 4 canaries = 20. Structural: fixed by the question list, never by what the run finds, "
      + "and asserted as an EQUALITY (docs/gotchas.md 98).",
    failures,
    warnings: [
      "HEADED CHROMIUM (`headless: false`, Playwright's bundled build — the `chrome` channel is not installed here). The headless shell draws overlay "
      + "scrollbars with a 0px layout gutter, which is why ROADMAP 3.1a's thumb went unseen by the session "
      + "that built it. A 0px gutter here is reported UNJUDGEABLE by name, never folded into a pass.",
      "WHAT IT CANNOT ANSWER, AND IT IS HALF THE ITEM: the thumb's APPEARANCE. No browser on this "
      + "machine lays out a classic scrollbar gutter — the `chrome` channel is not installed, `headless: "
      + "false` dies with `spawn UNKNOWN`, `--disable-features=OverlayScrollbar` leaves the gutter at 0px "
      + "(probed both ways), and Firefox is not downloaded. The gutter is recorded in `dimensions` and "
      + "listed in `unjudgeable`; it is never counted as a pass. Andrew's own browser is the instrument.",
      "`rules-in-effect` proves the two standard declarations REACH the element (computed `scrollbar-width` "
      + "and `scrollbar-color` read back in Chromium with no bar drawn), which catches a `var()` taking its "
      + "fallback for ever. It does not prove what the bar looks like and must not be read as if it did.",
      "It says nothing about row spacing (ROADMAP 3.1b), grouping (3.1c) or previews (3.1d).",
      "Both --break= sabotages are applied to the LIVE page with `addStyleTag`, never to a source file, and "
      + "each one is required to prove it changed the computed style before the run is judged either colour "
      + "(docs/gotchas.md 102).",
    ],
    artifacts: SIZES.flatMap((s) => [0, "05", 1].map((f) => `.manager-shots/3.1a/scroll-${s.w}-${f}.png`)),
    dimensions: {
      sizes: SIZES.map((s) => `${s.w}x${s.h}`),
      business: "demo-detail",
      fog_2_rgb: FOG_2_RGB,
      browser: "playwright bundled chromium, headed",
      item: "3.1a",
      break: BREAK,
    },
    canaries, unjudgeable, sabotage, observed,
  });
  console.log(`receipt: ${path}`);
  console.log(`\n${status.toUpperCase()} — ${assertions} assertions, ${failures.length} failed, ${unjudgeable.length} unjudgeable`);
  unjudgeable.forEach((u) => console.log(`  UNJUDGEABLE ${u}`));
  process.exit(failures.length ? 1 : 0);
}

run().catch((e) => { console.error(e); console.error("NOTHING WAS MEASURED. This is not a pass."); process.exit(2); });
