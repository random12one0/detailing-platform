// DOES ANY TEXT IN THE MAIL LOG CROWD OR TOUCH ITS NEIGHBOR — ROADMAP 3.1b.
//
//   node scripts/mail-log-gaps.mjs
//   node scripts/mail-log-gaps.mjs --break=unpadded   # sabotage: the list's right-hand clearance removed (the original defect)
//   node scripts/mail-log-gaps.mjs --break=unwrapped  # sabotage: a long unbroken subject allowed to run on
//
// Needs the dev server, the seed, and `.env` loaded (`set -a; . ./.env; set +a`).
// Signs in as the demo tenant's OWNER and writes nothing anywhere.
//
// ---------------------------------------------------------------------------
// WHAT ANDREW SAID, AND WHAT IT TURNED OUT TO BE
// ---------------------------------------------------------------------------
// *"Make sure that no text is touching other stuff or in the way or too close
// to something and it's all spaced nicely."* (3.1, 2026-10-09.) Measured, the
// one pair that WAS too close is the row's icon and the right-hand edge of the
// scroll box: `.row-item` pads 2px sideways, so the icon sat **2px** from the
// scrollbar's thumb — where every other pair in the same row is 12px apart.
// Nothing about that is visible in a headless screenshot, because this
// machine's Chromium draws overlay scrollbars with a 0px gutter.
//
// **THE MEASUREMENT DOES NOT NEED THE GUTTER, which is why it can be made at
// all here.** Content lays out against the box's CLIENT edge — the edge a
// classic scrollbar would start at — so `clientLeft + clientWidth` is where the
// thumb begins whether or not this browser draws one. The distance from the
// icon to that edge is the icon-to-thumb distance in Andrew's browser, and it
// is the same number with a 0px gutter and with an 8px one.
//
// **THE THRESHOLD IS A COMPARISON, NOT AN INVENTED PIXEL COUNT.** Inside one
// row the text column is 12px from its icon (`.row-item`'s own `gap`). A thumb
// may not be closer to the icon than the text is. `CLEAR` reads that gap off
// the page rather than writing 12 here, so the rule moves with the product.
//
// WHAT IT ASSERTS, PER WIDTH — 7, DECLARED RATHER THAN COUNTED (gotchas 98)
//   rows/measured        enough rows were measured (a DISCOVERY FLOOR, not a count)
//   text/lines-apart     the lines inside a row do not run together
//   text/clears-icon     no line of text reaches the icon beside it
//   icon/clears-thumb    the icon is as far from the scrollbar as the text is from the icon
//   stack/outer-gaps     intro -> control -> first row, and last row -> box bottom
//   text/long-token      an unbroken 60-character subject still wraps clear of the icon
//   page/console         nothing on the console at this width
//
// 3 widths x 7 + 3 canaries = **24**, asserted as an equality.
//
// WHAT IT DOES NOT COVER, SAID HERE RATHER THAN LEFT TO BE ASSUMED:
//   * the "100 most recent" note and the error box, which only draw at 100
//     rows or on a failed read (the seed has 29);
//   * a row sliced by the box's top or bottom edge — ROADMAP 3.1e;
//   * the thumb's own appearance — 3.1a, UNJUDGEABLE on this machine.

import { createRequire } from "node:module";
import { mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { REPO, writeReceipt } from "./receipt.mjs";
import { demoOwner, demoOwnerEmail } from "./lib/demoOwner.mjs";

const { chromium } = createRequire(import.meta.url)("./../app/node_modules/playwright/index.js");

const BASE = process.env.BASE_URL || process.env.BASE || "http://localhost:5173";
const ART = join(REPO, ".manager-shots", "3.1b");
const BREAK = (process.argv.slice(2).find((a) => a.startsWith("--break=")) || "").split("=")[1] || null;

if (!process.env.SUPABASE_URL) {
  console.error("Missing SUPABASE_URL — run `set -a; . ./.env; set +a` first.");
  console.error("NOTHING WAS MEASURED. This is not a pass.");
  process.exit(2);
}

// 320 IS THE NARROWEST WIDTH THIS PRODUCT SUPPORTS; the item names 1440 and 392.
const SIZES = [{ w: 1440, h: 900 }, { w: 392, h: 844 }, { w: 320, h: 700 }];
const PER_WIDTH = 7;
const EXPECTED_ASSERTIONS = SIZES.length * PER_WIDTH + 3;
const ROW_FLOOR = 20;       // a discovery floor: the seed holds 29, finding fewer means the list did not load
const LINE_GAP_MIN = 3;     // `.row-item .txt`'s own gap, the rhythm every ruled list here uses
const TOL = 0.5;            // fractional layout: zero arrives as -0.02

// PURE RULES OVER A SNAPSHOT, so a canary runs through the same code (gotchas 95).
const linesApart = (s) => s.minLineGap >= LINE_GAP_MIN - TOL;
const clearsIcon = (s) => s.minTextToIcon >= s.clear - TOL;
const clearsThumb = (s) => s.minIconToEdge >= s.clear - TOL;
const outerGaps = (s) => s.introToControl >= 12 - TOL && s.controlToRow >= 12 - TOL && s.lastToBottom >= 12 - TOL;

// Runs in the page. `box` is the scroll wrapper; every number is a distance in px.
function measure() {
  const mail = document.querySelector("[data-mail-log]");
  const box = mail.querySelector(".mail-scroll");
  const rows = [...box.querySelectorAll(".row-item")];
  const lines = (el) => {
    const r = document.createRange(); r.selectNodeContents(el);
    const host = el.getBoundingClientRect();
    return [...r.getClientRects()].filter((q) => q.width > 0 && q.bottom <= host.bottom + 1);
  };
  const edge = (() => { const b = box.getBoundingClientRect(); return b.left + box.clientLeft + box.clientWidth; })();
  let minLineGap = Infinity, minTextToIcon = Infinity, minIconToEdge = Infinity, withIcon = 0;
  let clear = Infinity;
  for (const row of rows) {
    const txt = row.querySelector(".txt");
    const icon = row.querySelector("svg");
    const blocks = [".nm", ".addr", ".sub:not(.addr)"].map((c) => row.querySelector(c)).filter(Boolean).map(lines);
    for (let i = 1; i < blocks.length; i += 1) {
      const above = Math.max(...blocks[i - 1].map((q) => q.bottom));
      const below = Math.min(...blocks[i].map((q) => q.top));
      minLineGap = Math.min(minLineGap, below - above);
    }
    if (icon) {
      withIcon += 1;
      const ib = icon.getBoundingClientRect();
      clear = Math.min(clear, ib.left - txt.getBoundingClientRect().right);
      for (const q of blocks.flat()) if (q.bottom > ib.top && q.top < ib.bottom) minTextToIcon = Math.min(minTextToIcon, ib.left - q.right);
      minIconToEdge = Math.min(minIconToEdge, edge - ib.right);
    }
  }
  const first = rows[0]?.querySelector(".nm");
  const control = mail.querySelector("[role=radiogroup], .seg, [data-segmented]") || mail.querySelector(".thoughts > :nth-child(2)");
  const intro = mail.querySelector(".thoughts > p");
  const ctl = control.getBoundingClientRect();
  return {
    rows: rows.length, withIcon,
    // `clear` is the in-row text-to-icon gap the product itself draws, read here (not written).
    clear: Number.isFinite(clear) ? clear : 0,
    minLineGap, minTextToIcon, minIconToEdge,
    introToControl: ctl.top - intro.getBoundingClientRect().bottom,
    controlToRow: first ? Math.min(...lines(first).map((q) => q.top)) - ctl.bottom : -Infinity,
  };
}

async function run() {
  rmSync(ART, { recursive: true, force: true });
  mkdirSync(ART, { recursive: true });

  const failures = [], observed = [], canaries = [], sabotage = [];
  let assertions = 0;
  const ok = (cond, id, detail) => {
    assertions += 1;
    observed.push({ id, ok: !!cond, detail });
    if (!cond) failures.push(`${id} — ${detail}`);
    console.log(`${cond ? "  ok  " : "  FAIL"} ${id}${detail ? `  ${detail}` : ""}`);
  };
  const px = (n) => (Number.isFinite(n) ? `${n.toFixed(2)}px` : String(n));

  const browser = await chromium.launch();
  try {
    for (const { w, h } of SIZES) {
      const ctx = await browser.newContext({ viewport: { width: w, height: h } });
      const page = await ctx.newPage();
      const noise = [];
      page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") noise.push(m.text()); });
      page.on("pageerror", (e) => noise.push(String(e)));
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
      // ATTACHED, NEVER VISIBLE (gotchas 107).
      await page.waitForFunction(() => {
        const c = document.querySelector("[data-mail-log]");
        return !!c && !c.querySelector('.rows[aria-busy="true"]') && c.querySelectorAll(".row-item").length > 0;
      }, null, { timeout: 25000 }).catch(() => {});
      await page.waitForTimeout(600); // the screen's own enter animation

      // ── SABOTAGE, AND THE PROOF IT LANDED (gotchas 102) ─────────────────
      if (BREAK) {
        const css = BREAK === "unpadded"
          ? "[data-mail-log] .mail-scroll{padding-right:0!important}"
          : BREAK === "unwrapped"
            ? "[data-mail-log] .row-item .nm{overflow-wrap:normal!important;word-break:normal!important}"
            : null;
        if (!css) { console.error(`unknown --break=${BREAK}`); process.exit(2); }
        const read = () => page.evaluate(() => {
          const el = document.querySelector("[data-mail-log] .mail-scroll");
          const nm = el.querySelector(".nm");
          return { padR: getComputedStyle(el).paddingRight, wrap: getComputedStyle(nm).overflowWrap };
        });
        const before = await read();
        await page.addStyleTag({ content: css });
        const after = await read();
        const landed = BREAK === "unpadded" ? after.padR !== before.padR : after.wrap !== before.wrap;
        sabotage.push({ width: w, break: BREAK, before, after, landed });
        // `unpadded` on a page whose padding is ALREADY 0 changes nothing and is the pre-fix tree: say so.
        if (!landed && !(BREAK === "unpadded" && before.padR === "0px") && !(BREAK === "unwrapped" && before.wrap === "normal")) {
          console.error(`SABOTAGE --break=${BREAK} DID NOT LAND at ${w}: ${JSON.stringify(before)} -> ${JSON.stringify(after)}`);
          process.exit(2);
        }
      }

      const s = await page.evaluate(measure);
      // Last row against the bottom of the box, at the end of the scroll.
      const tail = await page.evaluate(async () => {
        const box = document.querySelector("[data-mail-log] .mail-scroll");
        box.scrollTop = box.scrollHeight;
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
        const last = [...box.querySelectorAll(".row-item")].at(-1);
        const q = document.createRange(); q.selectNodeContents(last.querySelector(".sub:not(.addr)"));
        const bottom = Math.max(...[...q.getClientRects()].map((r) => r.bottom));
        return box.getBoundingClientRect().bottom - bottom;
      });
      s.lastToBottom = tail;
      await page.evaluate(() => { document.querySelector("[data-mail-log] .mail-scroll").scrollTop = 0; });
      await page.screenshot({ path: join(ART, `gaps-${w}.png`) });

      ok(s.rows >= ROW_FLOOR && s.withIcon > 0, `${w}/rows/measured`, `${s.rows} rows measured, ${s.withIcon} with an icon (floor ${ROW_FLOOR})`);
      ok(linesApart(s), `${w}/text/lines-apart`, `tightest gap between lines of different facts in a row: ${px(s.minLineGap)} (floor ${LINE_GAP_MIN}px)`);
      ok(clearsIcon(s), `${w}/text/clears-icon`, `nearest text to its icon: ${px(s.minTextToIcon)} (the row's own gap is ${px(s.clear)})`);
      ok(clearsThumb(s), `${w}/icon/clears-thumb`, `icon to the box's right edge, where a scrollbar starts: ${px(s.minIconToEdge)} (must be at least the ${px(s.clear)} the text keeps from it)`);
      ok(outerGaps(s), `${w}/stack/outer-gaps`, `intro->control ${px(s.introToControl)}, control->first row ${px(s.controlToRow)}, last row->box bottom ${px(s.lastToBottom)} (each at least 12px)`);

      // ── A SUBJECT WITH NO SPACE IN IT, in the live DOM only (nothing is written) ──
      const lt = await page.evaluate((m) => {
        const row = document.querySelector("[data-mail-log] .mail-scroll .row-item svg")?.closest(".row-item");
        const nm = row.querySelector(".nm");
        nm.textContent = "X".repeat(60);
        const r = document.createRange(); r.selectNodeContents(nm);
        const ib = row.querySelector("svg").getBoundingClientRect();
        let gap = Infinity;
        for (const q of r.getClientRects()) if (q.width > 0 && q.bottom > ib.top && q.top < ib.bottom) gap = Math.min(gap, ib.left - q.right);
        return { gap, clear: ib.left - row.querySelector(".txt").getBoundingClientRect().right };
      }, null);
      ok(lt.gap >= lt.clear - TOL, `${w}/text/long-token`, `an unbroken 60-character subject stops ${px(lt.gap)} from the icon (the row's own gap is ${px(lt.clear)})`);
      ok(noise.length === 0, `${w}/page/console`, noise.length ? noise.slice(0, 3).join(" | ") : "0 errors, 0 warnings");
      await ctx.close();
    }

    // ── CANARIES: the same pure rules, fed the defect each one exists for ──
    const c1 = clearsThumb({ minIconToEdge: 2, clear: 12 });
    canaries.push({ name: "the-icon-against-the-bar", flagged: !c1 });
    ok(!c1, "canary/the-icon-against-the-bar", "an icon 2px from the scrollbar, 12px from its own text, must NOT read as clear");
    const c2 = linesApart({ minLineGap: 0 });
    canaries.push({ name: "the-fused-lines", flagged: !c2 });
    ok(!c2, "canary/the-fused-lines", "two facts with 0px between their lines must NOT read as apart");
    const c3 = clearsIcon({ minTextToIcon: -8, clear: 12 });
    canaries.push({ name: "the-text-under-the-icon", flagged: !c3 });
    ok(!c3, "canary/the-text-under-the-icon", "text running 8px under its icon must NOT read as clear");

    if (assertions !== EXPECTED_ASSERTIONS) {
      failures.push(`assertion count ${assertions} != declared ${EXPECTED_ASSERTIONS} — a width that never rendered`);
    }
  } finally {
    await browser.close();
  }

  const status = failures.length ? "fail" : "pass";
  const { path } = writeReceipt({
    check_id: "mail-log-gaps",
    started_at: new Date(Date.now() - process.uptime() * 1000).toISOString(),
    status,
    expected_targets: SIZES.length,
    discovered_targets: SIZES.length,
    attempted_targets: SIZES.length,
    completed_targets: SIZES.length,
    skipped_targets: 0,
    assertions_executed: assertions,
    min_assertions: EXPECTED_ASSERTIONS,
    assertion_floor: "3 widths x 7 (rows measured, lines apart, clears icon, clears thumb, outer gaps, long token, console) "
      + "+ 3 canaries = 24, fixed by the question list and asserted as an EQUALITY (docs/gotchas.md 98).",
    failures,
    warnings: [
      "NOT COVERED: the 'n most recent' note and the error box (they draw only at 100 rows or on a failed read; the seed has 29), a row sliced by the box's own top/bottom edge (ROADMAP 3.1e), and the scrollbar thumb's appearance (3.1a, UNJUDGEABLE here).",
      "icon/clears-thumb is measured against the box's CLIENT edge, which is where a classic scrollbar starts, so it is the same number with this machine's 0px overlay gutter and with Andrew's 8px one. It is a derived distance, not a photograph of a thumb.",
      "The long-token probe edits the live DOM only. Nothing is written to the database.",
    ],
    artifacts: SIZES.map((s) => `.manager-shots/3.1b/gaps-${s.w}.png`),
    dimensions: { sizes: SIZES.map((s) => `${s.w}x${s.h}`), business: "demo-detail", item: "3.1b", break: BREAK },
    // `receipt.mjs` grades ONE `canary` object; the three above are listed in `canaries` as well.
    canary: { id: canaries[0].name, observed_failure: canaries.every((c) => c.flagged) },
    canaries, unjudgeable: [], sabotage, observed,
  });
  console.log(`receipt: ${path}`);
  console.log(`\n${status.toUpperCase()} — ${assertions} assertions, ${failures.length} failed`);
  process.exit(failures.length ? 1 : 0);
}

run().catch((e) => { console.error(e); console.error("NOTHING WAS MEASURED. This is not a pass."); process.exit(2); });
