// DID A SCREEN CHANGE WHEN NOBODY MEANT IT TO?
//
//   node scripts/visual-regression.mjs            # check against the baseline
//   node scripts/visual-regression.mjs --bless    # accept what is there now
//   node scripts/visual-regression.mjs --only=pricing
//
// WHY THIS EXISTS. Fifty-two scripts in here already drive Playwright, and
// between them they check specific, named things: contrast, focus rings, tap
// targets, bar clearance, American spelling. Every one of them answers a
// question somebody thought to ask. None of them answers the question nobody
// thought to ask, which is the one that actually bites:
//
//   "This screen looks different from how it looked when it was approved,
//    and nobody touched it on purpose."
//
// Andrew finds those by opening the page and noticing. That is not a check,
// that is him doing the check.
//
// NO NEW DEPENDENCY, AND THAT IS DELIBERATE — same reasoning as receipt.mjs.
// Comparing two PNGs normally means pixelmatch and pngjs. But a browser
// already decodes PNG, and Playwright already runs a browser, so the
// comparison happens inside the page we already have open. Measured when this
// was written: two renders of an identical page differ by 0.000%, and one
// changed word with a color change by 1.471%.
//
// WHAT IT IS NOT. It cannot tell a wanted change from an unwanted one. A real
// difference is reported as a FINDING, not a failure of the work — the person
// reading it decides, and `--bless` records that decision. A check that cried
// wolf at every intended change would be turned off within a week.
//
// THE BASELINE IS NOT IN GIT. artifacts/ is ignored, which is right: these are
// hundreds of kilobytes of PNG that change with the font stack and the GPU.
// They are a local record of "what it looked like when I last approved it".

import { createRequire } from "node:module";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { writeReceipt } from "./receipt.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..");
const require = createRequire(import.meta.url);
const { chromium } = require("../app/node_modules/playwright/index.js");

const BASE = process.env.APP_BASE || "http://localhost:5173";
const SHOTS = join(ROOT, "artifacts", "visual");
const BASELINE = join(SHOTS, "baseline");
const CURRENT = join(SHOTS, "current");

const arg = (n, d = null) => {
  const hit = process.argv.find((a) => a.startsWith(`--${n}=`));
  return hit ? hit.slice(n.length + 3) : d;
};
const flag = (n) => process.argv.includes(`--${n}`);

// THE SCREENS WORTH WATCHING. Deliberately short: a list nobody prunes is a
// list that goes red for reasons nobody reads. Two widths, because every
// layout fault this repo has shipped showed at one of them.
const SCREENS = [
  { id: "landing",  path: "/" },
  { id: "pricing",  path: "/pricing" },
  { id: "terms",    path: "/terms" },
  { id: "booking",  path: "/book/demo-detail" },
  { id: "app",      path: "/app" },
];
const WIDTHS = [1440, 392];

// How much change is nothing. Antialiasing and subpixel text move a few
// pixels between runs on the same machine; a real change moves hundreds.
const NOISE_PCT = 0.08;

const started_at = new Date().toISOString();
const only = arg("only");
const blessing = flag("bless");
const targets = SCREENS.filter((s) => !only || s.id === only);

mkdirSync(BASELINE, { recursive: true });
mkdirSync(CURRENT, { recursive: true });

// The comparison, run inside the browser. Returns the share of pixels that
// moved by more than a hair, or a note that the page changed size.
const COMPARE = async (page, a, b) => page.evaluate(async ([x, y]) => {
  const load = (b64) => new Promise((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = () => rej(new Error("could not decode a screenshot"));
    i.src = "data:image/png;base64," + b64;
  });
  const [i1, i2] = await Promise.all([load(x), load(y)]);
  if (i1.width !== i2.width || i1.height !== i2.height) {
    return { resized: `${i1.width}x${i1.height} -> ${i2.width}x${i2.height}` };
  }
  const pixels = (im) => {
    const c = new OffscreenCanvas(im.width, im.height);
    const ctx = c.getContext("2d");
    ctx.drawImage(im, 0, 0);
    return ctx.getImageData(0, 0, im.width, im.height).data;
  };
  const d1 = pixels(i1), d2 = pixels(i2);
  let changed = 0;
  let top = Infinity, bottom = -1;
  for (let k = 0; k < d1.length; k += 4) {
    const delta = Math.abs(d1[k] - d2[k]) + Math.abs(d1[k + 1] - d2[k + 1]) + Math.abs(d1[k + 2] - d2[k + 2]);
    if (delta > 30) {
      changed++;
      const row = Math.floor((k / 4) / i1.width);
      if (row < top) top = row;
      if (row > bottom) bottom = row;
    }
  }
  const total = d1.length / 4;
  return {
    pct: +(100 * changed / total).toFixed(3),
    // Where on the page it moved, so a person knows where to look without
    // opening two images side by side.
    band: bottom >= 0 ? { fromPx: top, toPx: bottom, ofPx: i1.height } : null,
  };
}, [a.toString("base64"), b.toString("base64")]);

const browser = await chromium.launch();
const findings = [];
const warnings = [];
const moved = [];
let attempted = 0, completed = 0;

for (const screen of targets) {
  for (const width of WIDTHS) {
    const name = `${screen.id}-${width}.png`;
    attempted++;
    const page = await browser.newPage({
      viewport: { width, height: 900 },
      reducedMotion: "reduce",          // an animation mid-flight is not a change
      deviceScaleFactor: 1,
    });
    try {
      await page.goto(BASE + screen.path, { waitUntil: "networkidle", timeout: 20000 });
      // Settle: fonts decided, and nothing still easing.
      await page.evaluate(() => document.fonts?.ready);
      await page.waitForTimeout(400);
      const shot = await page.screenshot({ fullPage: true });
      writeFileSync(join(CURRENT, name), shot);

      const basePath = join(BASELINE, name);
      if (blessing || !existsSync(basePath)) {
        writeFileSync(basePath, shot);
        if (!blessing) warnings.push(`${name}: no baseline existed, so this run became it — it proves nothing yet`);
        completed++;
        continue;
      }

      const before = readFileSync(basePath);
      const r = await COMPARE(page, before, shot);
      completed++;
      if (r.resized) {
        moved.push({ name, how: `the page changed size: ${r.resized}` });
      } else if (r.pct > NOISE_PCT) {
        const where = r.band
          ? ` between ${r.band.fromPx}px and ${r.band.toPx}px down a ${r.band.ofPx}px page`
          : "";
        moved.push({ name, pct: r.pct, how: `${r.pct}% of it looks different${where}` });
      }
    } catch (e) {
      warnings.push(`${name}: could not be looked at — ${String(e.message || e).split("\n")[0]}`);
    } finally {
      await page.close();
    }
  }
}

// THE CANARY. A check that compares nothing passes silently, and this repo
// has shipped at least six of those. So one comparison is rigged to find a
// difference that is certainly there, and if it does not, every clean line
// beside it is void.
let canaryCaught = false;
try {
  const page = await browser.newPage({ viewport: { width: 400, height: 200 } });
  await page.setContent(`<body style="margin:0;background:#111"><p style="color:#eee;font:30px sans-serif">before</p></body>`);
  const a = await page.screenshot();
  await page.setContent(`<body style="margin:0;background:#111"><p style="color:#e55;font:30px sans-serif">after!</p></body>`);
  const b = await page.screenshot();
  const r = await COMPARE(page, a, b);
  canaryCaught = !r.resized && r.pct > NOISE_PCT;
  await page.close();
} catch { canaryCaught = false; }

await browser.close();

if (!canaryCaught) {
  findings.push("THE CANARY WAS NOT CAUGHT — two deliberately different images compared as the same, so every clean result above is void");
}
for (const m of moved) findings.push(`${m.name}: ${m.how}`);

const { path: receiptPath } = writeReceipt({
  check_id: "visual-regression",
  started_at,
  // A changed screen is a FINDING for a person to judge, not a broken build.
  // The only thing that fails this check is the check itself not working.
  status: canaryCaught && !warnings.some((w) => /could not be looked at/.test(w)) ? "pass" : "fail",
  expected_targets: targets.length * WIDTHS.length,
  discovered_targets: attempted,
  attempted_targets: attempted,
  completed_targets: completed,
  skipped_targets: (targets.length * WIDTHS.length) - completed,
  assertions_executed: completed,
  min_assertions: 1,
  failures: canaryCaught ? [] : ["the canary was not caught"],
  warnings,
  artifacts: ["scripts/visual-regression.mjs", "artifacts/visual/current", "artifacts/visual/baseline"],
  // Graded, not self-reported. Two images that are certainly different are
  // compared every run; if that comparison says they are the same, the
  // instrument is blind and every clean line above it is void. Proved by
  // raising the noise floor to 99% — the run printed "THE CHECK ITSELF IS
  // BROKEN" instead of a false all-clear.
  canary: {
    id: "two deliberately different renders compared as part of every run",
    observed_failure: canaryCaught,
    caught_by: canaryCaught ? ["in-browser pixel comparison"] : [],
    findings: canaryCaught
      ? ["the comparison can tell two different images apart"]
      : ["the comparison reported two different images as identical"],
  },
  dimensions: {
    screens: targets.map((t) => t.id),
    widths: WIDTHS,
    noise_floor_pct: NOISE_PCT,
    screens_that_changed: moved.map((m) => m.name),
    method: "full-page screenshot compared to the approved baseline, pixel by pixel inside the browser, reducedMotion reduce",
    no_new_dependency: true,
  },
});

console.log("");
if (blessing) {
  console.log(`  Baseline accepted for ${completed} screen${completed === 1 ? "" : "s"}. That is now what 'right' looks like.`);
} else if (!canaryCaught) {
  console.log("  THE CHECK ITSELF IS BROKEN — its canary did not fire. Believe nothing above.");
} else if (!moved.length) {
  console.log(`  ${completed} screen${completed === 1 ? "" : "s"} look exactly as they did when you approved them.`);
} else {
  console.log(`  ${moved.length} of ${completed} screens look different:`);
  for (const m of moved) console.log(`    ${m.name} — ${m.how}`);
  console.log("");
  console.log("  Before and after are in artifacts/visual/baseline and artifacts/visual/current.");
  console.log("  If the change was meant, run with --bless to make it the new baseline.");
}
for (const w of warnings) console.log(`  note: ${w}`);
console.log(`\n  receipt -> ${receiptPath}`);

// Only the check being broken is an error. A screen that changed is news.
process.exit(canaryCaught ? 0 : 1);
