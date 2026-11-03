// ROADMAP 9.27: the red view strip's buttons must PRESS as 44px, measured by hit-test, on the REAL strip.
//   set -a; . ./.env; set +a; BASE=http://localhost:<port> node scripts/impbar-hit.mjs [--break=noafter]
// Needs a dev server + the seeded demo owner (DEMO_OWNER_PW). Enters both real strips the way the app does:
//   platform view  -> localStorage "dp.impersonating" naming the signed-in address   (button: Leave)
//   preview tab    -> sessionStorage "dp.preview" = 1 before sign-in                       (buttons: Let me make changes, Close)
// Per button: press height and width by elementFromPoint walk from its centre, and the box's own corners and
// centre must still hit it (no neighbour's ::after steals them). Pitch = dead space between neighbours' press areas.
// --break=noafter removes the ::after (the original 32px defect).
import { createRequire } from "node:module";
import { demoOwner } from "./lib/demoOwner.mjs";
const { chromium } = createRequire(import.meta.url)("./../app/node_modules/playwright/index.js");
const BASE = process.env.BASE || "http://localhost:5173";
const BREAK = (process.argv.find((a) => a.startsWith("--break=")) || "").split("=")[1] || "";
const OWNER = demoOwner();
const SIZES = [[320, 844], [390, 844], [768, 1024], [1440, 900]];
const CSS = { noafter: ".impbar button::after{display:none!important}" }[BREAK] || "";
if (BREAK && !CSS) { console.log(`unknown --break=${BREAK}`); process.exit(2); }

const MEASURE = () => [...document.querySelectorAll(".impbar button")].map((b) => {
  const q = b.getBoundingClientRect(), cx = q.x + q.width / 2, cy = q.y + q.height / 2;
  const hit = (x, y) => document.elementFromPoint(x, y) === b;
  const run = (dx, dy) => { let n = 0; while (n < 60 && hit(cx + dx * (n + 1), cy + dy * (n + 1))) n++; return n; };
  const up = run(0, -1), down = run(0, 1), l = run(-1, 0), r = run(1, 0);
  const pts = [[2, 2], [q.width - 2, 2], [2, q.height - 2], [q.width - 2, q.height - 2], [q.width / 2, q.height / 2]];
  const stolen = pts.filter(([x, y]) => !hit(q.x + x, q.y + y)).length;
  const after = getComputedStyle(b, "::after");
  return { t: b.textContent, box: Math.round(q.height), h: up + down + 1, w: l + r + 1, x0: cx - l, x1: cx + r, y0: cy - up, y1: cy + down,
    stolen, inset: after.content === "none" || after.display === "none" ? "none" : `${after.top}/${after.right}/${after.bottom}/${after.left}` };
});

const browser = await chromium.launch();
let fails = 0, checked = 0;
const say = (ok, msg) => { checked++; if (!ok) fails++; console.log(`${ok ? "ok  " : "FAIL"} ${msg}`); };
for (const [w, h] of [...SIZES]) for (const kind of ["platform", "preview"]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
  // a preview tab keeps its session in sessionStorage, so the flag must be there BEFORE signing in
  if (kind === "preview") await ctx.addInitScript(() => { try { sessionStorage.setItem("dp.preview", "1"); } catch {} });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/app`, { waitUntil: "domcontentloaded" });
  await page.fill("input[type=email]", OWNER.email);
  await page.fill("input[type=password]", OWNER.password);
  await page.click("form button.btn.primary");
  await page.waitForSelector(".tabbar, .sidebar, .topbar", { timeout: 30000 });
  if (kind === "platform") await page.evaluate((as) => localStorage.setItem("dp.impersonating", JSON.stringify({ as, business: "Coastline Auto Detailing" })), OWNER.email);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForSelector(".impbar button", { timeout: 20000 });
  await page.waitForTimeout(1500);
  if (CSS) await page.addStyleTag({ content: CSS });
  const r = await page.evaluate(MEASURE);
  const tag = `${w} ${kind}`;
  say(r.length === (kind === "platform" ? 1 : 2), `${tag}: found ${r.length} strip button(s) (${r.map((b) => b.t).join(" | ")})`);
  for (const b of r) {
    say(b.h >= 44 && b.w >= 44, `${tag} «${b.t}»: box ${b.box}px, press ${b.h}h x ${b.w}w, ::after inset ${b.inset}`);
    say(b.stolen === 0, `${tag} «${b.t}»: ${b.stolen} of 5 points inside its own box hit something else`);
  }
  if (r.length === 2) {
    const [a, c] = r;   // same row: horizontal dead space; wrapped: vertical dead space
    const sameRow = Math.abs(a.y0 - c.y0) < 20;
    const gap = sameRow ? c.x0 - a.x1 : c.y0 - a.y1;
    say(gap >= 3, `${tag} pitch: dead space between «${a.t}» and «${c.t}» press areas ${gap.toFixed(1)}px (${sameRow ? "side by side" : "wrapped"})`);
  }
  if (w === 390 || w === 320) await page.screenshot({ path: `C:/Users/rando/Downloads/claude/detailing-platform/.manager-shots/9.27/${BREAK || "fixed"}-${kind}-${w}.png`, clip: { x: 0, y: 0, width: w, height: 140 } }).catch((e) => console.log("shot failed", e.message));
  await ctx.close();
}
await browser.close();
const want = SIZES.length * ((1 + 2) + (1 + 4 + 1));
if (checked !== want) { console.log(`FAIL: ${checked} checks, declared ${want}`); process.exit(1); }
console.log(`${checked} checks, ${fails} failed${BREAK ? ` (--break=${BREAK})` : ""}`);
process.exit(fails ? 1 : 0);
