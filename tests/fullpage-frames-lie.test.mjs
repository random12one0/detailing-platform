#!/usr/bin/env node
/**
 * ROADMAP 9.11d - A FULL-PAGE FRAME CAN SHOW FIXED FURNITURE WHERE IT IS NOT.
 *
 * A person read a `fullPage` PNG, saw the nav rail 420px across the settings
 * list, and reported a product fault. The DOM had the rail at x 24-96, the
 * viewport frame had it at the far left and `elementFromPoint` found 0 rows
 * covered. The frame invented the defect and the frame was the evidence.
 *
 * § 1 reproduces the lie on a self-contained page (no app/src, no demo tenant,
 * no dev server, no credentials) and asks the three witnesses the item names:
 * the hit-test and the viewport frame agree where the bar is; the full-page
 * frame disagrees. **THE CONDITION, MEASURED HERE: a position: fixed element, a
 * page taller than the viewport AND the page scrolled.** Unscrolled, the two
 * frames agree, and that is asserted too, because a proof that only shows the
 * lie cannot tell a lie from a frame that always looks like that.
 * **WHAT THIS DID NOT REPRODUCE:** the original sighting was a HORIZONTAL shift
 * of about 420px. On a synthetic page the shift is vertical, by the scroll
 * offset. The mechanism (fixed furniture painted at the wrong place in a
 * stitched frame) is the same; the x shift is not reproduced here.
 *
 * § 2 is the standing guard: no script under scripts/ saves a `fullPage: true`
 * frame unless the line above it says why that is safe. It carries its own
 * positive control and a switch, FULLPAGE_BREAK=1, that injects an offending
 * line IN MEMORY (nothing on disk) to show the guard go red.
 *
 *   node tests/fullpage-frames-lie.test.mjs
 *   FULLPAGE_BREAK=1 node tests/fullpage-frames-lie.test.mjs    (§ 2 must fail)
 */
import { createRequire } from "node:module";
import { readFileSync, readdirSync } from "node:fs";
import { basename, join } from "node:path";
import { fileURLToPath } from "node:url";

let passed = 0, failed = 0;
const check = (name, cond, detail = "") => {
  if (cond) { passed++; console.log(`  ok    ${name}`); }
  else { failed++; console.error(`  FAIL  ${name}${detail ? ` - ${detail}` : ""}`); }
};

// ─── 1. the lie, on a page of its own ─────────────────────────────────────
console.log("1. a fullPage frame puts fixed furniture where the DOM does not");
{
  const { chromium } = createRequire(import.meta.url)("../app/node_modules/playwright/index.js");
  const PAGE = `<!doctype html><meta name=viewport content="width=device-width"><style>
    body{margin:0;font:16px sans-serif}
    .rail{position:fixed;left:24px;top:0;width:72px;height:100vh;background:#f0f}
    .tall{height:3000px;margin-left:120px;background:linear-gradient(#eee,#ccc)}
  </style><div class=rail></div><div class=tall><p>row</p></div>`;
  // Where does magenta sit in a PNG, down the column x=60? Read in the page,
  // because a canvas is the dependency-free way to get pixels out of a PNG.
  const magentaRows = (page, b64) => page.evaluate(async (b64) => {
    const img = new Image(); img.src = "data:image/png;base64," + b64; await img.decode();
    const c = document.createElement("canvas"); c.width = img.width; c.height = img.height;
    const g = c.getContext("2d"); g.drawImage(img, 0, 0);
    const col = g.getImageData(60, 0, 1, img.height).data; let top = -1, bot = -1;
    for (let y = 0; y < img.height; y++) {
      const i = y * 4;
      if (col[i] > 240 && col[i + 1] < 20 && col[i + 2] > 240) { if (top < 0) top = y; bot = y; }
    }
    return [top, bot];
  }, b64);

  const browser = await chromium.launch();
  const run = async (scrollY) => {
    const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
    await page.setContent(PAGE);
    await page.evaluate((y) => window.scrollTo(0, y), scrollY);
    const hit = await page.evaluate(() => document.elementFromPoint(60, 450)?.className);
    const dom = await page.evaluate(() => { const r = document.querySelector(".rail").getBoundingClientRect(); return [r.top, r.bottom]; });
    const vp = await magentaRows(page, (await page.screenshot()).toString("base64"));
    const full = await magentaRows(page, (await page.screenshot({ fullPage: true })).toString("base64"));
    await page.context().close();
    return { hit, dom, vp, full };
  };
  const still = await run(0), scrolled = await run(600);
  await browser.close();

  check("1a · scrolled: the hit-test finds the bar under (60,450)", scrolled.hit === "rail", String(scrolled.hit));
  check("1b · scrolled: the viewport frame agrees (bar painted across y=450)",
    scrolled.vp[0] <= 450 && scrolled.vp[1] >= 450, JSON.stringify(scrolled.vp));
  check("1c · scrolled: the full-page frame does NOT have the bar at y=450 (it sits lower)",
    scrolled.full[0] > 450, JSON.stringify(scrolled.full));
  check("1d · scrolled: the full-page bar is shifted by the scroll offset, 600px",
    scrolled.full[0] - scrolled.vp[0] === 600, `viewport top ${scrolled.vp[0]}, full-page top ${scrolled.full[0]}`);
  // THE CONTROL: with no scroll the two frames agree, so 1c is a fact about
  // scrolled pages and not a property of every full-page frame.
  check("1e · control, unscrolled: the two frames agree on where the bar is",
    JSON.stringify(still.vp) === JSON.stringify(still.full), `${JSON.stringify(still.vp)} vs ${JSON.stringify(still.full)}`);
}

// ─── 2. no script saves a full-page frame without saying why it is safe ───
console.log("2. scripts/ saves no fullPage frame unexplained");
{
  const dir = fileURLToPath(new URL("../scripts/", import.meta.url));
  const files = readdirSync(dir).filter((f) => f.endsWith(".mjs")).map((f) => join(dir, f));
  // A call that saves a full-page frame as code. Comments that merely mention
  // the option do not match because they do not contain `screenshot(`.
  const CALL = /screenshot\(.*fullPage:\s*true/;
  // Safe only if the line above is a comment that says so.
  const SAFE = /^\s*\/\/.*fullPage.*safe/i;
  const offenders = (name, text) => {
    const L = text.split(/\r?\n/), out = [];
    L.forEach((l, i) => { if (CALL.test(l) && !(i > 0 && SAFE.test(L[i - 1]))) out.push(`${name}:${i + 1}`); });
    return out;
  };
  // ONE DECLARED EXCEPTION, asserted with an equality (docs/gotchas.md 98), not a
  // ceiling: bk-bar-clearance.mjs renders each customer email as a bare HTML
  // document and saves it full-page. An email has no position: fixed element
  // (0 in emailTemplates.ts), so the condition cannot arise. It sits outside the
  // 2026-10-06 scripts/ lane exception, so it is declared here instead of edited.
  const ALLOWED = { "bk-bar-clearance.mjs": 1 };
  let bad = [], seen = 0;
  const hits = {};
  for (const f of files) {
    const o = offenders(f, readFileSync(f, "utf8")); seen++;
    const base = basename(f);
    if (ALLOWED[base] !== undefined) hits[base] = o.length; else bad.push(...o);
  }
  for (const [base, n] of Object.entries(ALLOWED)) {
    if (hits[base] !== n) bad.push(`${base}: declared ${n} unexplained fullPage site(s), found ${hits[base]}`);
  }
  if (process.env.FULLPAGE_BREAK === "1") {
    bad.push(...offenders("(in-memory sabotage)", "await page.screenshot({ path: p, fullPage: true });"));
  }
  check("2a · the guard has subjects", seen > 50, `${seen} scripts read`);
  check("2a-ii · and its pattern can match an offending line",
    offenders("x", "await page.screenshot({ path: p, fullPage: true });").length === 1
    && offenders("x", "// fullPage is safe here, nothing is fixed\nawait page.screenshot({ fullPage: true });").length === 0);
  check("2b · no script saves a fullPage frame without a safety comment", bad.length === 0, bad.join(", "));
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
