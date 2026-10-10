// CAN THE LAST LINE OF A DASHBOARD SCREEN BE READ, OR IS IT PAINTED OVER BY THE
// FADE BEHIND THE TAB BAR? — ROADMAP 9.19.
//
//   node scripts/scrim-clearance.mjs                       # the sweep
//   node scripts/scrim-clearance.mjs --headed              # watch it
//   node scripts/scrim-clearance.mjs --break=old-geometry  # sabotage: the pre-9.19 numbers, whole run
//   node scripts/scrim-clearance.mjs --break=canary        # sabotage: the canary is dropped
//   node scripts/receipt.mjs receipts/scrim-clearance.json
//
// Dev server on :5173, the seeded demo business, credentials in `.env` for the
// dashboard login. Writes nothing to the database, touches no rate bucket.
//
// ---------------------------------------------------------------------------
// WHY THIS IS NOT `tabbar-clearance.mjs` WITH ANOTHER SCREEN
// ---------------------------------------------------------------------------
// `.tabscrim` is `pointer-events: none`, so `elementFromPoint` can never return
// it and every hit-testing instrument here reports the strip uncovered while it
// is painted over at 1.47:1 (`docs/gotchas.md` 100). The credential-free
// contrast gates measure token PAIRS, and a gradient composited over a label is
// not a pair. **So this reads the PIXELS.**
//
//   1. THE FADE'S OWN OPACITY, row by row. The page is rendered with everything
//      but the scrim hidden, on a white ground, so a pixel is
//      `alpha * ink-0 + (1 - alpha) * 255` and alpha comes straight back out.
//   2. EACH TEXT LINE IN THE LAST 40px OF CONTENT — the band just above the
//      line where `.app-main`'s bottom padding says content stops. Its colour
//      is read from the page and its background from a second render with the
//      scrim hidden; the contrast is then worked out twice, with and without
//      the worst fade opacity anywhere in that line's box.
//
// WHAT IT ASKS, per screen, per language, at 320x640 and 392x844:
//   subjects       the band holds text at all (a screen with nothing in it
//                  would grade green for the wrong reason). The calendar's
//                  legend is also pressed into the band on purpose, because
//                  it is where DP Cowork caught this.
//   band-alpha     the fade is not over the content's last 40px (<= 2%).
//   legibility     every line that reads at 4.5:1 WITHOUT the fade still does
//                  with it. A line that is under 4.5:1 on its own is not the
//                  scrim's fault and is reported by name in the receipt, never
//                  folded into the pass and never blamed on the scrim.
//
// **THE CANARY IS THE PRE-9.19 GEOMETRY PUT BACK** (`--tabclear` 96, scrim 136)
// on the calendar legend. It must fail band-alpha, or the run has stopped
// looking. `--break=old-geometry` applies that to the WHOLE run and every
// target must then go red — which is the "red on the build before the fix"
// the item asked for, reproducing the original defect rather than a proxy.
//
// **WHAT A GREEN DOES NOT SAY.** The worst opacity anywhere in a line's box is
// used, so this is a floor on legibility, not a reading of the exact glyph
// pixels. And it measures the document scroller at phone and tablet widths; at
// 1024+ the scrim is `display: none` and this is not run.

import "../tests/_env.mjs";

import { createRequire } from "node:module";
import { mkdirSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { writeReceipt } from "./receipt.mjs";
import { settle, watchConsole } from "./lib/bookingWalk.mjs";
import { demoOwner } from "./lib/demoOwner.mjs";

const { chromium } = createRequire(import.meta.url)("./../app/node_modules/playwright/index.js");

const started_at = new Date().toISOString();
const HEADED = process.argv.includes("--headed");
const BREAK = (process.argv.find((a) => a.startsWith("--break=")) || "").split("=")[1] || "";
const BASE = process.env.BASE || "http://localhost:5173";
const OWNER = demoOwner();

const SIZES = [{ w: 320, h: 640 }, { w: 392, h: 844 }];
const LANGS = ["en", "es"];
// calendar-legend presses the legend into the band; the other two scroll to the end.
// **THE LEGEND STATE RUNS AT 320x640 ONLY — that is where it was caught and the only width
// where it can be done:** at 392x844 content follows the legend and the page cannot scroll
// far enough UP to bring it down to the line, so the first version "failed" there on a screen
// that was fine. Its legend lists only the statuses the month contains (Booked, Done, Blocked
// on the demo's October), so the floor is 3 labels, not the four that exist.
const STATES = [
  { key: "calendar-end", url: "/app/calendar" },
  { key: "calendar-legend", url: "/app/calendar", legend: true, narrowOnly: true },
  { key: "clients-end", url: "/app/clients" },
];
const LEGEND_FLOOR = 3;
const runs = SIZES.flatMap((size) => LANGS.flatMap((lang) => STATES
  .filter((st) => !st.narrowOnly || size === SIZES[0]).map((st) => ({ size, lang, st }))));
const BAND = 40;          // "the last 40px of content" — the item's own figure
const MAX_ALPHA = 0.02;   // the fade may not be over the band at all, give or take rounding
const AA = 4.5;           // the floor for body text
const ART = fileURLToPath(new URL("../artifacts/scrim-clearance/", import.meta.url));

// THE GEOMETRY BEFORE 9.19: a 96px reserve under a 136px strip.
const OLD_GEOMETRY_CSS = ":root { --tabclear: 96px !important; } .tabscrim { height: 136px !important; }";

let assertions = 0;
const failures = [];
const artifacts = [];
const consoleNoise = [];
const observed = [];
const notTheScrim = [];

const check = (target, name, cond, detail = "") => {
  assertions++;
  if (cond) { console.log(`    ok      ${name}`); return true; }
  failures.push(`${target}: ${name} ${detail}`.trim());
  console.error(`    FAIL    ${name}  ${detail}`);
  return false;
};

// In the page: where does content stop, and which text lines are in the band above that?
// **SCROLL INSTANTLY AND LOOK AFTERWARDS.** The page scrolls smoothly, so rects read in the same
// breath as `scrollBy` belong to a position the screenshot never sees — the first version
// measured the right words on the wrong rows and reported a 1.37:1 legend label on a page whose
// legend was plainly readable.
const PRESS_LEGEND = () => {
  const l = document.querySelector(".cal-legend");
  if (l) scrollBy({ top: l.getBoundingClientRect().bottom - (innerHeight - (parseFloat(getComputedStyle(document.querySelector(".app-main")).paddingBottom) || 0)), behavior: "instant" });
  return !!l;
};
const COLLECT = ({ band }) => {
  const main = document.querySelector(".app-main");
  const rest = innerHeight - (parseFloat(getComputedStyle(main).paddingBottom) || 0);
  const items = [];
  const walker = document.createTreeWalker(main, NodeFilter.SHOW_TEXT);
  for (let n; (n = walker.nextNode());) {
    if (!n.nodeValue.trim()) continue;
    const el = n.parentElement;
    if (!el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) continue;
    const range = document.createRange();
    range.selectNodeContents(n);
    for (const r of range.getClientRects()) {
      if (r.width < 2 || r.height < 2 || r.bottom <= rest - band || r.top >= rest) continue;
      items.push({
        text: n.nodeValue.trim().slice(0, 28), color: getComputedStyle(el).color,
        legend: !!el.closest(".cal-legend"),
        l: r.left, t: r.top, r: r.right, b: r.bottom,
      });
    }
  }
  return { rest, items };
};

// In the page: decode the two screenshots and work the contrast out.
const MEASURE = async ({ pngPlain, pngScrim, items, rest, band }) => {
  const decode = async (b64) => {
    const bin = atob(b64), u = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    const bmp = await createImageBitmap(new Blob([u], { type: "image/png" }));
    const c = new OffscreenCanvas(bmp.width, bmp.height), g = c.getContext("2d");
    g.drawImage(bmp, 0, 0);
    return { w: bmp.width, h: bmp.height, d: g.getImageData(0, 0, bmp.width, bmp.height).data };
  };
  const plain = await decode(pngPlain), scrim = await decode(pngScrim);
  const px = (im, x, y) => { const i = (y * im.w + x) * 4; return [im.d[i], im.d[i + 1], im.d[i + 2]]; };

  // alpha(y) of the fade: bottom row is solid ink-0 on a white ground.
  const ink = px(scrim, 1, scrim.h - 1);
  const k = [0, 1, 2].sort((a, b) => ink[a] - ink[b])[0];
  if (255 - ink[k] < 20) return { error: "the scrim's bottom row is not dark; alpha cannot be read" };
  const alpha = (y) => {
    const yy = Math.min(scrim.h - 1, Math.max(0, Math.round(y)));
    return Math.min(1, Math.max(0, (255 - px(scrim, 1, yy)[k]) / (255 - ink[k])));
  };

  const lin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  const lum = (c) => 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]);
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const mix = (c, over, a) => c.map((v, i) => v * (1 - a) + over[i] * a);
  const parse = (s) => {
    let m = s.match(/^rgba?\(([^)]+)\)$/);
    if (m) {
      const p = m[1].split(/[ ,/]+/);
      return [parseFloat(p[0]), parseFloat(p[1]), parseFloat(p[2]), p[3] === undefined ? 1 : (p[3].endsWith("%") ? parseFloat(p[3]) / 100 : parseFloat(p[3]))];
    }
    m = s.match(/^color\(srgb ([^)]+)\)$/);
    if (m) {
      const p = m[1].split(/[ /]+/);
      return [parseFloat(p[0]) * 255, parseFloat(p[1]) * 255, parseFloat(p[2]) * 255, p[3] === undefined ? 1 : (p[3].endsWith("%") ? parseFloat(p[3]) / 100 : parseFloat(p[3]))];
    }
    return null;
  };

  const out = [];
  for (const it of items) {
    const x0 = Math.max(0, Math.floor(it.l)), x1 = Math.min(plain.w - 1, Math.ceil(it.r));
    const y0 = Math.max(0, Math.floor(it.t)), y1 = Math.min(plain.h - 1, Math.ceil(it.b));
    if (x1 <= x0 || y1 <= y0) { out.push({ text: it.text, legend: it.legend, error: "off the screen" }); continue; }
    // THE GROUND IS DITHERED (a noise layer sits over it), so no exact colour wins a count and the
    // first version's "most common pixel" was the TEXT's own colour — 1.37:1 on a legend label that
    // reads 6.8:1. Bucket to 16 levels a channel and average the busiest bucket.
    const count = new Map();
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const c = px(plain, x, y), key = c.map((v) => v >> 4).join(",");
      const e = count.get(key) || { n: 0, sum: [0, 0, 0] };
      e.n++; c.forEach((v, i) => { e.sum[i] += v; });
      count.set(key, e);
    }
    const top = [...count.values()].sort((a, b) => b.n - a.n)[0];
    const bg = top.sum.map((v) => v / top.n);
    const col = parse(it.color);
    if (!col) { out.push({ text: it.text, legend: it.legend, error: `cannot read colour ${it.color}` }); continue; }
    const fg = col.slice(0, 3).map((v, i) => col[3] * v + (1 - col[3]) * bg[i]);
    let aMax = 0;
    for (let y = y0; y <= y1; y++) aMax = Math.max(aMax, alpha(y));
    out.push({
      text: it.text, legend: it.legend,
      fg: fg.map(Math.round), bg, rect: [x0, y0, x1, y1], css: it.color,
      native: ratio(fg, bg), painted: ratio(mix(fg, ink, aMax), mix(bg, ink, aMax)), aMax,
    });
  }
  let bandMax = 0;
  for (let y = Math.max(0, Math.floor(rest - band)); y <= Math.min(scrim.h - 1, Math.ceil(rest)); y++) {
    bandMax = Math.max(bandMax, alpha(y));
  }
  return { lines: out, bandMax };
};

rmSync(ART, { recursive: true, force: true });
mkdirSync(ART, { recursive: true });

let signedIn = null;

async function sweep(browser, size, lang, st, { css }) {
  const ctx = await browser.newContext({
    viewport: { width: size.w, height: size.h }, deviceScaleFactor: 1,
    storageState: signedIn || undefined,
  });
  const page = await ctx.newPage();
  const label = `${size.w}x${size.h} ${lang} ${st.key}${css === OLD_GEOMETRY_CSS ? " (old geometry)" : ""}`;
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
    // A PLAIN STRING, NOT JSON — see calendar-legible.mjs: JSON silently measures English twice.
    await page.evaluate((l) => {
      try {
        localStorage.setItem("dp.tours", JSON.stringify(
          ["shell", "today", "calendar", "money", "clients", "business"]));
        localStorage.setItem("dp.tour", "1");
        localStorage.setItem("dp.lang.app", l);
      } catch { /* private mode */ }
    }, lang);
    await page.goto(BASE + st.url, { waitUntil: "domcontentloaded" });
    await page.waitForSelector(st.legend ? ".cal-legend" : ".app-main", { timeout: 30000 });
    await settle(page, 2500);
    if (css) await page.addStyleTag({ content: css });
    await page.evaluate(() => scrollTo({ top: document.documentElement.scrollHeight, behavior: "instant" }));
    await settle(page, 600);
    if (st.legend) {
      const had = await page.evaluate(PRESS_LEGEND);
      await settle(page, 600);
      if (!had) return { error: "no .cal-legend on the page" };
    }
    const got = await page.evaluate(COLLECT, { band: BAND });
    const shot = async (content) => {
      const h = await page.addStyleTag({ content });
      const b = (await page.screenshot({ animations: "disabled" })).toString("base64");
      await h.evaluate((n) => n.remove());
      return b;
    };
    const pngPlain = await shot(".tabscrim { display: none !important; }");
    const pngScrim = await shot("html, body { background: #fff !important; } body * { visibility: hidden !important; } .tabscrim { visibility: visible !important; }");
    const m = await page.evaluate(MEASURE, { pngPlain, pngScrim, items: got.items, rest: got.rest, band: BAND });
    const file = `${label.replace(/[^\w.-]+/g, "-")}.png`;
    await page.screenshot({ path: ART + file, animations: "disabled" });
    artifacts.push("artifacts/scrim-clearance/" + file);
    return { ...m, rest: got.rest, size };
  } finally {
    await ctx.close();
  }
}

function grade(id, st, m, sink) {
  if (!m || m.error) {
    for (const q of ["subjects", "band-alpha", "legibility"]) sink(id, q, false, m ? m.error : "no measurement");
    return;
  }
  const lines = m.lines.filter((l) => !l.error);
  const bad = m.lines.filter((l) => l.error);
  const legendLines = lines.filter((l) => l.legend).length;
  sink(id, "subjects", bad.length === 0 && lines.length >= 1 && (!st.legend || legendLines >= LEGEND_FLOOR),
    bad.length ? `unreadable: ${bad.map((l) => `«${l.text}» ${l.error}`).join("; ")}`
      : st.legend ? `${legendLines} legend label(s) in the band (need ${LEGEND_FLOOR}), ${lines.length} line(s) in all`
        : `${lines.length} text line(s) in the last ${BAND}px of content`);
  sink(id, "band-alpha", m.bandMax <= MAX_ALPHA,
    `the fade is ${(m.bandMax * 100).toFixed(0)}% opaque over the last ${BAND}px of content `
    + `(content stops ${Math.round(m.size.h - m.rest)}px from the bottom; the fade is not allowed above ${MAX_ALPHA * 100}%)`);
  const readable = lines.filter((l) => l.native >= AA);
  const hurt = readable.filter((l) => l.painted < AA);
  sink(id, "legibility", hurt.length === 0 && readable.length >= 1,
    hurt.length
      ? hurt.slice(0, 4).map((l) => `«${l.text}» ${l.native.toFixed(2)}:1 → ${l.painted.toFixed(2)}:1 under the fade`).join("; ")
        + (hurt.length > 4 ? `; and ${hurt.length - 4} more` : "")
      : `no line at 4.5:1 or better to judge (${lines.length} line(s))`);
  for (const l of lines.filter((x) => x.native < AA)) {
    notTheScrim.push(`${id}: «${l.text}» is ${l.native.toFixed(2)}:1 with no fade at all (text ${l.css} read as rgb(${l.fg}), background rgb(${l.bg}), box ${l.rect})`);
  }
}

const summary = (m) => (!m || m.error) ? "no measurement"
  : `fade over band ${(m.bandMax * 100).toFixed(0)}%, worst line ${Math.min(...m.lines.filter((l) => !l.error).map((l) => l.painted)).toFixed(2)}:1 `
    + `(${m.lines.map((l) => l.error ? `«${l.text}» ${l.error}` : `«${l.text}» ${l.native.toFixed(2)}→${l.painted.toFixed(2)}`).join(", ")})`;

// ---------------------------------------------------------------------------
const browser = await chromium.launch({ headless: !HEADED });
const expected = runs.length + 1;
let discovered = 0, attempted = 0, completed = 0;
const canary = { id: "the-pre-9.19-geometry-put-back", observed_failure: false, problems: [] };
const css = BREAK === "old-geometry" ? OLD_GEOMETRY_CSS : null;

for (const { size, lang, st } of runs) {
  const id = `${size.w}x${size.h} ${lang} ${st.key}`;
  console.log(`  ${id}`);
  attempted++; discovered++;
  const m = await sweep(browser, size, lang, st, { css });
  grade(id, st, m, check);
  observed.push(`${id}: ${summary(m)}`);
  completed++;
}

console.log("  canary — the pre-9.19 geometry put back; it MUST fail band-alpha");
attempted++;
if (BREAK === "canary") {
  console.log("    SKIPPED — --break=canary");
} else {
  discovered++;
  const st = STATES.find((s) => s.legend);
  const m = await sweep(browser, SIZES[0], "en", st, { css: OLD_GEOMETRY_CSS });
  grade("canary", st, m, (t, name, cond, detail) => {
    assertions++;
    if (!cond) canary.problems.push(`${name} ${detail}`.trim());
  });
  canary.observed_failure = canary.problems.some((p) => p.startsWith("band-alpha"));
  console.log(`    ${canary.observed_failure ? "caught" : "MISSED"}${canary.problems.length ? " — " + canary.problems[0].slice(0, 110) : ""}`);
  completed++;
}

await browser.close();

console.log("\nWhat each state measured:");
for (const o of observed) console.log("  " + o);
if (notTheScrim.length) {
  console.log("\nUNJUDGEABLE BY THIS GATE — under 4.5:1 with no fade at all, so not the scrim's doing:");
  for (const n of notTheScrim) console.log("  " + n);
}
if (consoleNoise.length) {
  console.log("\nConsole (the two known React Router v7 warnings are dropped by name):");
  for (const c of consoleNoise) console.log("  " + c);
}

const status = failures.length === 0 && canary.observed_failure && consoleNoise.length === 0
  ? "pass" : "fail";
const { path } = writeReceipt({
  check_id: "scrim-clearance",
  started_at,
  status,
  expected_targets: expected,
  discovered_targets: discovered,
  attempted_targets: attempted,
  completed_targets: completed,
  skipped_targets: 0,
  assertions_executed: assertions,
  min_assertions: runs.length * 3 + 3,
  assertion_floor:
    "10 runs x 3 questions + 1 canary x 3 = 33 (320x640: 3 states x 2 languages, 392x844: 2 states "
    + "x 2 languages, the legend state at 320 only). Fixed by the lists above, never by what the run "
    + "finds: a state with no text in the band grades as a failed `subjects`, it does not drop out.",
  failures: [...failures, ...consoleNoise.map((c) => `console: ${c}`)],
  artifacts,
  warnings: [
    "The worst fade opacity anywhere in a text line's box is used, so a pass is a floor on "
    + "legibility, not a reading of the exact glyph pixels.",
    "Lines that are under 4.5:1 with NO fade at all are listed by name and are not graded: that is "
    + "the design's own contrast, not this item's.",
    "Document scroller at phone and tablet widths only. At 1024+ the scrim is display:none.",
    ...(BREAK ? [`run with --break=${BREAK}; this receipt is a sabotage, not a result`] : []),
  ],
  dimensions: {
    sizes: SIZES.map((s) => `${s.w}x${s.h}`),
    langs: LANGS,
    states: STATES.map((s) => s.key),
    band_px: BAND,
    max_alpha: MAX_ALPHA,
    observed,
    not_the_scrim: notTheScrim,
    sabotage: BREAK || null,
    ...(BREAK ? { break: BREAK } : {}),
  },
  canary,
});

console.log(`\n${status.toUpperCase()} — ${completed}/${expected} targets, ${assertions} assertions, `
  + `${failures.length} failure(s), canary ${canary.observed_failure ? "caught" : "MISSED"}. `
  + `Receipt ${path}`);
for (const f of failures) console.log("  · " + f);
process.exit(status === "pass" ? 0 : 1);
