// WHAT THE BACK OFFICE'S OWN GROUND COSTS ITS TEXT.
//
// `tests/design-contrast.test.mjs` and `scripts/accent-sweep.mjs` both measure
// TOKEN PAIRS — a colour against the ground token it is supposed to sit on.
// Neither can see what a LIT CORNER does, because the light is a gradient over
// the token and the token is what they read.
//
// That matters here for one specific reason. `theme.css` caps the dashboard's
// two lights at 7% / 5.5%, and its own note shows the arithmetic: Money's dim
// and losing bars measure 3.02:1 against the lit corner on a pure-white
// accent, so the margin over the 3:1 non-text floor is 0.02 and it is spent.
// **The back office copied that cap and should not have** — there is no tenant
// accent on this screen and no Money chart, so the elements that set the limit
// do not exist here. Raising the light is safe, but "is safe" is a claim, and
// a claim about contrast is worth exactly as much as the measurement behind it.
//
// So this samples the REAL rendered pixels at the brightest point of the
// ground, behind the glass, and computes the ratio the way the standard does.
//
//   node --env-file=.env scripts/admin-contrast.mjs
//
// Needs the dev server and a platform-admin login (it reuses the shooter's).

import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("./../app/node_modules/playwright/index.js");
import { dropAdmin, makeAdmin } from "./admin-account.mjs";

const BASE = process.env.BASE || "http://localhost:5173";
const URL_ = process.env.SUPABASE_URL, KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_ || !KEY) { console.error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY"); process.exit(1); }
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };
// Made for this run, removed at the end of it — roadmap 8.2. The fixed
// password that used to be on this line was a published credential for the
// account that can read every tenant; `scripts/admin-account.mjs` has the
// finding.
const acct = await makeAdmin(URL_, KEY);
if (!acct) { console.error("no admin account"); process.exit(1); }
const EMAIL = acct.email, PW = acct.password;

// The WCAG relative-luminance formula, on sRGB 0-255.
const lum = ([r, g, b]) => {
  const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
const ratio = (a, b) => {
  const [hi, lo] = lum(a) >= lum(b) ? [lum(a), lum(b)] : [lum(b), lum(a)];
  return (hi + 0.05) / (lo + 0.05);
};

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
const page = await ctx.newPage();
await page.goto(`${BASE}/admin`, { waitUntil: "domcontentloaded" });
await page.fill("input[type=email]", EMAIL);
await page.fill("input[type=password]", PW);
await page.click("form button.pa-btn");
await page.waitForTimeout(3000);

// **THE ANIMATION IS PAUSED AT THE BRIGHTEST FRAME.** The lights drift, so a
// screenshot catches whatever moment it lands on — and the worst case for
// contrast is the moment the light is closest to the text, not the average.
await page.addStyleTag({ content: ".pa-ground b { animation-delay: -24s !important; animation-play-state: paused !important; }" });
await page.waitForTimeout(400);

// **THE BROWSER DECODES ITS OWN SCREENSHOT.** Reading pixels needs a PNG
// decoder, and this repo has four dependencies; adding a fifth to check a
// colour would be the wrong trade. The page already has one — canvas — so the
// shot goes back in as a data URL and `getImageData` reads it there.
const shotB64 = (await page.screenshot()).toString("base64");
const sample = async (points) => page.evaluate(async ({ b64, pts }) => {
  const img = new Image();
  await new Promise((ok, no) => { img.onload = ok; img.onerror = no; img.src = "data:image/png;base64," + b64; });
  const c = document.createElement("canvas");
  c.width = img.width; c.height = img.height;
  c.getContext("2d").drawImage(img, 0, 0);
  const ctx2 = c.getContext("2d");
  return pts.map((p) => {
    if (p.x < 0 || p.y < 0 || p.x >= c.width || p.y >= c.height) return null;
    const d = ctx2.getImageData(p.x, p.y, 1, 1).data;
    return [d[0], d[1], d[2]];
  });
}, { b64: shotB64, pts: points });

// Where the quiet text actually is, and what is behind it. Sampling the
// BACKGROUND beside a run of text rather than the glyphs themselves: an
// antialiased glyph edge is a blend of both and would flatter the result.
const spots = await page.evaluate(() => {
  const out = [];
  const pick = (sel, label) => {
    const el = document.querySelector(sel);
    if (!el) return;
    const r = el.getBoundingClientRect();
    out.push({ label, color: getComputedStyle(el).color, x: Math.round(r.right + 6), y: Math.round(r.top + r.height / 2) });
  };
  pick(".pa-lead .pa-lab", "the lead's label");
  pick(".pa-fig .pa-lab", "a figure's label");
  pick(".pa-health .pa-quiet", "the platform health line");
  pick(".pa-sub", "a detailer's sub-line");
  pick(".pa-lab2", "a section label");
  return out;
});

const rgb = (css) => css.match(/\d+/g).slice(0, 3).map(Number);
let worst = { label: "", r: 99 };
console.log("\nthe quietest text on the screen, against the pixels actually behind it");
console.log("(the lights paused at their brightest frame, 1920x1080)\n");
const grounds = await sample(spots.map((s) => ({ x: s.x, y: s.y })));
spots.forEach((sp, i) => {
  const bg = grounds[i];
  if (!bg) return;
  const r = ratio(rgb(sp.color), bg);
  if (r < worst.r) worst = { label: sp.label, r };
  console.log(`  ${sp.label.padEnd(30)} ${r.toFixed(2)}:1   text ${sp.color}  ground rgb(${bg.join(",")})`);
});
await browser.close();
// BEFORE THE EXIT BELOW, NOT AFTER IT — this script ends with a `process.exit`
// on a failure, and a teardown written under it would run on a pass and never
// on a fail, leaving the all-seeing account behind on exactly the runs
// somebody is going to re-run several times.
// ponytail: no try/finally around the browser section, so a THROW above this
// line leaves the admin row standing until somebody runs this or shoot-admin
// again — both re-create and re-drop it. Wrap the whole script if that ever
// stops being true, which it will the day something else reads that row.
await dropAdmin(URL_, KEY, acct.id);

const FLOOR = 4.5;
console.log(`\nworst: ${worst.label} at ${worst.r.toFixed(2)}:1 against a ${FLOOR}:1 floor`);
if (worst.r < FLOOR) {
  console.log("BELOW THE FLOOR — the ground is too bright for the text on it.");
  process.exit(1);
}
console.log("clear of the floor.");
