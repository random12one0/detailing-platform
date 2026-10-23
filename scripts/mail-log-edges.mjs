// THE MAIL LOG'S SCROLL BOX: DO ITS EDGES FADE, AND DOES IT STOP ABOVE THE
// TAB BAR'S GROUND — ROADMAP 3.1e.
//
//   node scripts/mail-log-edges.mjs
//   node scripts/mail-log-edges.mjs --break=unclearanced  # sabotage: 3.1a's bound, no clearance
//   node scripts/mail-log-edges.mjs --break=hardedge      # sabotage: the fade removed
//
// Needs the dev server (BASE=http://localhost:<port>), the seed, and `.env`
// loaded (`set -a; . ./.env; set +a`). Signs in as the demo tenant's OWNER and
// writes nothing to the database. Shots go to `.manager-shots/3.1e/`
// (SHOTS_DIR overrides, so a worktree run can keep them in the main checkout).
//
// WHY PIXELS AND NOT `getComputedStyle(...).maskImage`. 3.1a passed twenty
// assertions while both edges were wrong, because every one of them read a
// number the defect did not move. A mask that is declared but transparent in
// the wrong place, or covered by a later rule, still reads back as declared.
// So the fade is judged the way an eye would judge it: a subject line is
// scrolled until it straddles the edge, and the 1px strip along that edge is
// compared with the same strip with the rows hidden. A hard cut leaves glyph
// stems in that strip; a fade leaves the card behind it.
//
// AND THE FADE MUST NOT COST THE RESTING LIST ANYTHING. At scroll 0 and at the
// end, the first and last rows are shot with the mask on and with it off; they
// must match, which is what the padding under the fade is for.
//
// THE GROUND. `.tabscrim` is `pointer-events: none` (docs/gotchas.md 100), so
// no hit test can see a box running under it; the rule compares the two
// rectangles, page scrolled to the top, and prints both numbers. From 1024 the
// scrim is `display: none` and the bar is a side rail, so there the box must
// stop inside the viewport and inside its own scroller instead.
//
// PER WIDTH (1440x900, 392x844, 320x700) — 5, DECLARED (gotchas 98):
//   ground/clear       the box's bottom at or above the scrim's top
//   edge/top-fades     a row straddling the top edge is faded, not cut
//   edge/bottom-fades  the same at the bottom edge
//   rest/untouched     at scroll 0 and at the end, the mask changes no pixel
//   page/console       nothing on the console
// 3 x 5 + 2 canaries = 17, asserted as an equality.

import { createRequire } from "node:module";
import { mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { REPO, writeReceipt } from "./receipt.mjs";
import { demoOwner, demoOwnerEmail } from "./lib/demoOwner.mjs";

const { chromium } = createRequire(import.meta.url)("./../app/node_modules/playwright/index.js");

const BASE = process.env.BASE_URL || process.env.BASE || "http://localhost:5173";
const ART = process.env.SHOTS_DIR || join(REPO, ".manager-shots", "3.1e");
const BREAK = (process.argv.slice(2).find((a) => a.startsWith("--break=")) || "").split("=")[1] || null;
const BREAKS = {
  unclearanced: "[data-mail-log] .mail-scroll{max-height:min(60vh,520px)!important}",
  hardedge: "[data-mail-log] .mail-scroll{-webkit-mask-image:none!important;mask-image:none!important}",
};
if (BREAK && !BREAKS[BREAK]) { console.error(`unknown --break=${BREAK}`); process.exit(2); }
if (!process.env.SUPABASE_URL) {
  console.error("Missing SUPABASE_URL — run `set -a; . ./.env; set +a` first.\nNOTHING WAS MEASURED. This is not a pass.");
  process.exit(2);
}

const SIZES = [{ w: 1440, h: 900 }, { w: 392, h: 844 }, { w: 320, h: 700 }];
const EXPECTED = SIZES.length * 5 + 2;
// Half a pixel for fractional layout; a box ON the ground is tens of pixels.
const GROUND_TOL = 0.5;
// The largest channel difference the edge's 1px strip may show against the
// card. The fade is 18px long and the strip's pixel lies within 2px of the
// edge (1 plus a fractional box edge), so it is at most 2/18 opaque: under 29
// even for white on black. A cut subject line reads 218-219 (measured).
const INK_MAX = 30;
// Mask on vs off at rest: identical, bar antialiasing noise.
const REST_MAX = 2;

const clearOfGround = (s) => s.boxBottom <= s.limit + GROUND_TOL;
const faded = (ink) => ink <= INK_MAX;

// Decode two PNGs in the page and return the largest channel difference.
const DIFF = async ({ a, b }) => {
  const decode = async (b64) => {
    const bin = atob(b64), u = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    const bmp = await createImageBitmap(new Blob([u], { type: "image/png" }));
    const c = new OffscreenCanvas(bmp.width, bmp.height), g = c.getContext("2d");
    g.drawImage(bmp, 0, 0);
    return g.getImageData(0, 0, bmp.width, bmp.height).data;
  };
  const da = await decode(a), db = await decode(b);
  let max = 0;
  for (let i = 0; i < da.length; i += 4) {
    for (let k = 0; k < 3; k++) max = Math.max(max, Math.abs(da[i + k] - db[i + k]));
  }
  return max;
};

async function run() {
  rmSync(ART, { recursive: true, force: true });
  mkdirSync(ART, { recursive: true });
  const failures = [], observed = [], sabotage = [], canaries = [];
  let assertions = 0;
  const ok = (cond, id, detail) => {
    assertions += 1;
    observed.push({ id, ok: !!cond, detail });
    if (!cond) failures.push(`${id} — ${detail}`);
    console.log(`${cond ? "  ok  " : "  FAIL"} ${id}  ${detail}`);
  };

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
      await page.waitForSelector('[data-tour="gear"]', { timeout: 30000 });
      await page.click('[data-tour="gear"]');
      await page.waitForSelector('[data-settings-key="mail"]', { timeout: 20000 });
      await page.click('[data-settings-key="mail"]');
      await page.waitForFunction(() => document.querySelectorAll("[data-mail-log] .row-item").length > 8, null, { timeout: 25000 });
      // THE CARD ARRIVES WITH A TRANSFORM. A rectangle read mid-flight is off
      // by the transform (2px at 320, measured), so wait it out.
      await page.evaluate(async () => {
        await document.fonts.ready;
        const card = document.querySelector("[data-mail-log]");
        await Promise.all(card.getAnimations({ subtree: true }).filter((a) => a.effect?.getTiming().iterations !== Infinity).map((a) => a.finished.catch(() => {})));
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      });

      if (BREAK) {
        const read = () => page.evaluate(() => {
          const cs = getComputedStyle(document.querySelector("[data-mail-log] .mail-scroll"));
          return { maxH: cs.maxHeight, mask: cs.maskImage || cs.webkitMaskImage };
        });
        const before = await read();
        await page.addStyleTag({ content: BREAKS[BREAK] });
        await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
        const after = await read();
        // 3.1a's bound IS the desk bound, so at 1440 `unclearanced` changes
        // nothing by design; it must land at both phone widths (gotchas 102).
        const landed = BREAK === "unclearanced" ? after.maxH !== before.maxH : after.mask !== before.mask;
        sabotage.push({ width: w, break: BREAK, before, after, landed });
        if (!landed && !(BREAK === "unclearanced" && w >= 1024)) {
          console.error(`SABOTAGE --break=${BREAK} DID NOT LAND at ${w}: ${JSON.stringify(before)} -> ${JSON.stringify(after)}`);
          process.exit(2);
        }
      }

      // ── THE GROUND, page at the top ──────────────────────────────────────
      const g = await page.evaluate(() => {
        scrollTo(0, 0);
        const box = document.querySelector("[data-mail-log] .mail-scroll").getBoundingClientRect();
        const scrim = document.querySelector(".tabscrim");
        const shown = scrim && getComputedStyle(scrim).display !== "none";
        if (shown) return { boxBottom: box.bottom, limit: scrim.getBoundingClientRect().top, what: ".tabscrim's top" };
        const body = document.querySelector(".settings-body");
        const lim = Math.min(innerHeight, body ? body.getBoundingClientRect().bottom : innerHeight);
        return { boxBottom: box.bottom, limit: lim, what: "no scrim at this width (display: none); the viewport / .settings-body bottom" };
      });
      await page.screenshot({ path: join(ART, `rest-${w}.png`) });
      ok(clearOfGround(g), `${w}/ground/clear`,
        `box bottom ${g.boxBottom.toFixed(2)}px vs ${g.what} ${g.limit.toFixed(2)}px`);

      // ── AN EDGE, CROSSED BY A SUBJECT LINE ───────────────────────────────
      const strip = async (edge) => {
        const r = await page.evaluate(async (edge) => {
          const box = document.querySelector("[data-mail-log] .mail-scroll");
          const rows = [...box.querySelectorAll(".row-item")];
          const nm = rows[Math.floor(rows.length / 2)].querySelector(".nm");
          box.scrollTop = 0;
          await new Promise((r) => requestAnimationFrame(r));
          // A BOX TALLER THAN WHAT IS LEFT OF THE SCREEN (the unclearanced
          // sabotage at 320) is brought fully into view first.
          box.scrollIntoView({ block: "nearest" });
          // THE FIRST LINE OF TEXT, NOT THE ELEMENT'S MIDDLE: a subject that
          // wraps puts its middle in the gap between two lines, where a hard
          // cut has no ink to show (measured at 392 and 320).
          const line = () => { const g = document.createRange(); g.selectNodeContents(nm); return g.getClientRects()[0]; };
          const b = box.getBoundingClientRect(), n = line();
          const target = edge === "top" ? b.top + 1 : b.bottom - 1;
          box.scrollTop = Math.round(n.top + n.height / 2 - target);
          await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
          const n2 = line(), b2 = box.getBoundingClientRect();
          return {
            straddles: n2.top < target && n2.bottom > target,
            clip: { x: Math.ceil(b2.left) + 2, y: edge === "top" ? Math.ceil(b2.top) : Math.floor(b2.bottom) - 1, width: Math.floor(b2.width) - 16, height: 1 },
          };
        }, edge);
        const a = (await page.screenshot({ clip: r.clip })).toString("base64");
        await page.screenshot({ path: join(ART, `edge-${edge}-${w}.png`) });
        await page.addStyleTag({ content: "[data-mail-log] .mail-scroll .rows{visibility:hidden!important}" });
        const b = (await page.screenshot({ clip: r.clip })).toString("base64");
        await page.evaluate(() => { const s = [...document.querySelectorAll("style")].pop(); s.remove(); });
        return { straddles: r.straddles, ink: await page.evaluate(DIFF, { a, b }) };
      };
      const top = await strip("top");
      ok(top.straddles && faded(top.ink), `${w}/edge/top-fades`,
        `a subject line straddling the top edge${top.straddles ? "" : " (DID NOT STRADDLE)"}: ink in the edge's 1px strip ${top.ink} (max ${INK_MAX})`);
      const bot = await strip("bottom");
      ok(bot.straddles && faded(bot.ink), `${w}/edge/bottom-fades`,
        `a subject line straddling the bottom edge${bot.straddles ? "" : " (DID NOT STRADDLE)"}: ink in the edge's 1px strip ${bot.ink} (max ${INK_MAX})`);

      // ── AT REST, THE MASK COSTS NOTHING ──────────────────────────────────
      const rest = [];
      for (const end of ["start", "end"]) {
        const clip = await page.evaluate(async (end) => {
          const box = document.querySelector("[data-mail-log] .mail-scroll");
          box.scrollIntoView({ block: "nearest" });
          box.scrollTop = end === "start" ? 0 : box.scrollHeight;
          await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
          const b = box.getBoundingClientRect();
          return { x: Math.ceil(b.left), y: end === "start" ? Math.ceil(b.top) : Math.floor(b.bottom) - 60, width: Math.floor(b.width) - 14, height: 60 };
        }, end);
        const a = (await page.screenshot({ clip })).toString("base64");
        await page.addStyleTag({ content: "[data-mail-log] .mail-scroll{-webkit-mask-image:none!important;mask-image:none!important}" });
        const b = (await page.screenshot({ clip })).toString("base64");
        await page.evaluate(() => { const s = [...document.querySelectorAll("style")].pop(); s.remove(); });
        rest.push({ end, diff: await page.evaluate(DIFF, { a, b }) });
      }
      ok(rest.every((r) => r.diff <= REST_MAX), `${w}/rest/untouched`,
        rest.map((r) => `${r.end}: mask on vs off differs by ${r.diff}`).join("; ") + ` (max ${REST_MAX})`);
      ok(noise.length === 0, `${w}/page/console`, noise.length ? noise.slice(0, 3).join(" | ") : "0 errors, 0 warnings");
      await ctx.close();
    }

    const c1 = clearOfGround({ boxBottom: 808, limit: 708 });
    canaries.push({ name: "the-box-under-the-scrim", flagged: !c1 });
    ok(!c1, "canary/the-box-under-the-scrim", "3.1e's own reading (808 vs 708 at 392) must NOT read as clear");
    const c2 = faded(140);
    canaries.push({ name: "the-cut-subject-line", flagged: !c2 });
    ok(!c2, "canary/the-cut-subject-line", "a strip with 140 of ink must NOT read as faded");

    if (assertions !== EXPECTED) failures.push(`assertion count ${assertions} != declared ${EXPECTED}`);
  } finally {
    await browser.close();
  }

  const status = failures.length ? "fail" : "pass";
  const { path } = writeReceipt({
    check_id: "mail-log-edges",
    started_at: new Date(Date.now() - process.uptime() * 1000).toISOString(),
    status,
    expected_targets: SIZES.length, discovered_targets: SIZES.length, attempted_targets: SIZES.length,
    completed_targets: SIZES.length, skipped_targets: 0,
    assertions_executed: assertions, min_assertions: EXPECTED,
    assertion_floor: "3 widths x 5 (ground, top fade, bottom fade, rest untouched, console) + 2 canaries = 17, an EQUALITY (docs/gotchas.md 98).",
    failures,
    warnings: [
      "The fade is judged on pixels: a 1px strip along the edge with a subject line straddling it, against the same strip with the rows hidden.",
      "The ground is judged with the PAGE scrolled to the top; the scrim is pointer-events: none, so this compares rectangles (docs/gotchas.md 100).",
      "Sabotage is applied to the live page with addStyleTag and must change the computed style before the run is judged (gotchas 102); `unclearanced` is a no-op at 1440 by design.",
    ],
    artifacts: SIZES.flatMap((s) => [`rest-${s.w}.png`, `edge-top-${s.w}.png`, `edge-bottom-${s.w}.png`].map((f) => `.manager-shots/3.1e/${f}`)),
    dimensions: { sizes: SIZES.map((s) => `${s.w}x${s.h}`), business: "demo-detail", item: "3.1e", break: BREAK },
    canaries, sabotage, observed,
  });
  console.log(`receipt: ${path}`);
  console.log(`\n${status.toUpperCase()} — ${assertions} assertions, ${failures.length} failed`);
  process.exit(failures.length ? 1 : 0);
}

run().catch((e) => { console.error(e); console.error("NOTHING WAS MEASURED. This is not a pass."); process.exit(2); });
