// THE MOVED SCRIPTS STILL DO WHAT THEY DID — ROADMAP 97.90.
//
// 97.90 moved every inline <script> on the example sites (/ex1../ex5) and
// /map.html into files beside them, so the site policy can drop
// 'unsafe-inline'. scripts/csp-report-only.mjs proves each file LOADS (200, no
// page error). That is not proof it still DOES the same thing: a script that
// runs against the wrong markup, or too late, loads cleanly and does nothing.
//
// This serves app/dist two ways and compares what the scripts produced:
//   BEFORE  every external example script put back INLINE, no policy at all —
//           the pages as they were before 97.90;
//   AFTER   the pages as built, under the /* policy from app/netlify.toml sent
//           as the ENFORCING header (the rename rehearsed, not done).
// At 390x844, 768x1024 and 1440x900, on every page, three moments:
//   load    — after the scripts settle;
//   scroll  — after walking the page top to bottom (the reveal/motion scripts);
//   press   — after pressing the page's real controls: ex3's paint switcher
//             (each color), the review map's tick, cross, note and "Show all".
// The fingerprint is every element's tag, classes, data-*/aria-*/hidden and
// form values, plus the page's text. `style` attributes are left out: they
// carry animation frames, which differ between any two runs of the same page.
//
// CANARY, every run: /ex3 at 390 AFTER with the paint switcher's file
// answering 404 must differ from BEFORE after its presses.
// SABOTAGE: --break=drop-script — every page's LAST external script answers
// 404 in AFTER. Each page must go red; one that stays green is a page whose
// script this fingerprint cannot see, and it is named.
//
// Needs `npm run build --prefix app` first. No credentials, writes nothing.
import { createServer } from "node:http";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { extname, join } from "node:path";
import { createRequire } from "node:module";
import { REPO, writeReceipt } from "./receipt.mjs";

const { chromium } = createRequire(join(REPO, "app", "package.json"))("playwright");
const DIST = join(REPO, "app", "dist");
const BREAK = (process.argv.find((a) => a.startsWith("--break=")) || "").slice(8);
if (BREAK && BREAK !== "drop-script") throw new Error(`unknown --break=${BREAK}`);
if (!existsSync(join(DIST, "ex1", "index.html"))) throw new Error("app/dist has no /ex1 — run `npm run build --prefix app` first");

// A sabotage writes its own folder, so a clean run never overwrites its pictures or report.
const SHOTS = `.manager-shots/97.90/same-effect-${BREAK || "clean"}`;
mkdirSync(join(REPO, SHOTS), { recursive: true });
const artifacts = [];
const shotOf = (path, s) => `${SHOTS}/${path.replace(/\W+/g, "-").replace(/^-|-$/g, "")}-${s.w}.png`;
const SIZES = [{ w: 390, h: 844 }, { w: 768, h: 1024 }, { w: 1440, h: 900 }];
const PAGES = ["/ex1", "/ex1/work.html", "/ex1/prices.html", "/ex2", "/ex3", "/ex3/prices.html", "/ex4", "/ex5", "/map.html"];
const toml = readFileSync(join(REPO, "app", "netlify.toml"), "utf8");
const POLICY = (toml.match(/for = "\/\*"\s*\[headers\.values\]\s*Content-Security-Policy(?:-Report-Only)? = "([^"]+)"/) || [])[1];
if (!POLICY || /'unsafe-inline'/.test((POLICY.match(/script-src ([^;]*)/) || [])[1] || "")) throw new Error("no /* policy, or its script-src allows 'unsafe-inline'");

const fileFor = (path) => {
  let f = join(DIST, path);
  if (f.startsWith(DIST) && existsSync(f) && statSync(f).isDirectory()) f = join(f, "index.html");
  return f.startsWith(DIST) && existsSync(f) ? f : null;
};
const SCRIPT_TAG = /<script src="(\/(?:ex\d\/[^"]+|map)\.js)"><\/script>/g;
const scriptsOf = (path) => [...readFileSync(fileFor(path), "utf8").matchAll(SCRIPT_TAG)].map((m) => m[1]);
const missing = new Set(); // script paths answering 404 in AFTER (canary / sabotage)

// One server per mode, so every absolute link in a page stays on its own side.
const serve = (mode) => createServer((req, res) => {
  const path = decodeURIComponent(new URL(req.url, "http://x").pathname);
  const file = fileFor(path);
  if (!file || (mode === "after" && missing.has(path))) { res.writeHead(404); res.end(); return; }
  const headers = { "Content-Type": { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml" }[extname(file)] || "application/octet-stream" };
  if (mode === "after") headers["Content-Security-Policy"] = POLICY;
  let body = readFileSync(file);
  if (mode === "before" && file.endsWith(".html")) {
    body = body.toString("utf8").replace(SCRIPT_TAG, (_, src) => `<script>${readFileSync(join(DIST, src), "utf8")}</script>`);
  }
  res.writeHead(200, headers);
  res.end(body);
});
const ORIGIN = {};
for (const mode of ["before", "after"]) {
  const srv = serve(mode);
  await new Promise((r) => srv.listen(0, "127.0.0.1", r));
  ORIGIN[mode] = { url: `http://127.0.0.1:${srv.address().port}`, srv };
}

function fingerprint() {
  const out = [];
  const root = document.documentElement;
  out.push("ROOT " + [...root.attributes].filter((a) => a.name !== "style").map((a) => `${a.name}=${a.value}`).sort().join(" "));
  for (const el of document.body.querySelectorAll("*")) {
    if (el.tagName === "SCRIPT") continue;
    const attrs = [...el.attributes].filter((a) => a.name === "class" || a.name === "hidden" || a.name.startsWith("data-") || a.name.startsWith("aria-"))
      .map((a) => `${a.name}=${a.name === "class" ? a.value.split(/\s+/).filter(Boolean).sort().join(".") : a.value}`).sort();
    if ("value" in el && typeof el.value === "string" && el.tagName !== "BUTTON") attrs.push(`value=${el.value}`);
    out.push(el.tagName + " " + attrs.join(" "));
  }
  // Text outside <script>: an inline script's source is not page text.
  const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT,
    { acceptNode: (n) => (n.parentElement.closest("script") ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT) });
  let text = "";
  while (walk.nextNode()) text += walk.currentNode.nodeValue;
  out.push("TEXT " + text.replace(/\s+/g, " ").trim());
  return out;
}

async function settle(page) { await page.waitForLoadState("networkidle"); await page.waitForTimeout(2800); }
async function scrollThrough(page) {
  const h = await page.evaluate(() => document.documentElement.scrollHeight);
  // Most of a screen per step, held long enough for every delayed reveal to
  // land: ex3's reveal schedules its 'show' on a timer it does not cancel when
  // the card leaves again, so a fast walk races it (the same on both sides).
  const step = await page.evaluate(() => Math.round(innerHeight * 0.7));
  for (let y = 0; y <= h + step; y += step) { await page.evaluate((v) => scrollTo(0, v), y); await page.waitForTimeout(400); }
  await page.waitForTimeout(1800);
}
async function press(page, path) {
  if (path.startsWith("/ex3")) {
    for (const p of ["a", "c", "b"]) { await page.click(`.paintpick [data-paint="${p}"]`); await page.waitForTimeout(150); }
    return true;
  }
  if (path === "/map.html") {
    const rows = page.locator(".row[data-key]");
    await rows.nth(1).locator(".cross").click();
    await rows.nth(1).locator(".note").fill("csp check note");
    await page.click("#showall");
    await rows.nth(0).locator(".tick").click();
    await page.waitForTimeout(300);
    return true;
  }
  return false;
}

// One page, one size, one mode: fresh context so storage never carries over.
async function visit(browser, mode, path, s, shot) {
  const ctx = await browser.newContext({ viewport: { width: s.w, height: s.h } });
  const page = await ctx.newPage();
  const errors = [], violations = [];
  page.on("pageerror", (e) => errors.push(String(e).slice(0, 200)));
  page.on("console", (m) => { if (/Content Security Policy/i.test(m.text())) violations.push(m.text().slice(0, 200)); });
  await page.goto(ORIGIN[mode].url + path);
  await settle(page);
  const load = await page.evaluate(fingerprint);
  await scrollThrough(page);
  const scroll = await page.evaluate(fingerprint);
  // A control that cannot be pressed (its script never ran) is a reading, not a crash.
  page.setDefaultTimeout(3000);
  let pressed, refused = null;
  try { pressed = await press(page, path); } catch (e) { pressed = true; refused = "PRESS FAILED " + String(e.message).split("\n")[0]; }
  const after = pressed ? [...(await page.evaluate(fingerprint)), ...(refused ? [refused] : [])] : null;
  if (mode === "after" && shot) {
    await page.evaluate(() => scrollTo(0, 0)); await page.waitForTimeout(600);
    await page.screenshot({ path: join(REPO, shot) });
  }
  await ctx.close();
  return { load, scroll, press: after, errors, violations };
}
const firstDiff = (a, b) => {
  if (!a || !b) return a === b ? null : "one side has no reading";
  for (let i = 0; i < Math.max(a.length, b.length); i++) if (a[i] !== b[i]) return `line ${i}: before «${(a[i] || "").slice(0, 140)}» after «${(b[i] || "").slice(0, 140)}»`;
  return null;
};

const failures = [], warnings = [];
let assertions = 0;
const ok = (cond, id, msg) => { assertions++; if (!cond) failures.push(`${id}: ${msg}`); return cond; };
const observed = { views: {}, inventory: {}, canary: null };
const browser = await chromium.launch();

for (const path of PAGES) observed.inventory[path] = scriptsOf(path);
if (BREAK === "drop-script") for (const path of PAGES) missing.add(observed.inventory[path].at(-1));

let reached = 0;
for (const s of SIZES) {
  // One size at a time; its pages, and each page's two sides, side by side.
  const runs = await Promise.all(PAGES.map((path) => Promise.all([visit(browser, "before", path, s), visit(browser, "after", path, s, shotOf(path, s))])));
  for (const [i, path] of PAGES.entries()) {
    const id = `${path}@${s.w}`;
    const [before, after] = runs[i];
    reached++;
    artifacts.push(shotOf(path, s));
    const d = { load: firstDiff(before.load, after.load), scroll: firstDiff(before.scroll, after.scroll), press: firstDiff(before.press, after.press) };
    observed.views[id] = { lines: after.load.length, pressed: !!after.press, same: !d.load && !d.scroll && !d.press, errors: after.errors.length, violations: after.violations.length };
    ok(before.errors.length === 0, id + " before-errors", `the page as it was threw: ${before.errors.join(" | ")}`);
    ok(after.errors.length === 0 && after.violations.length === 0, id + " after-clean", `errors ${after.errors.join(" | ")} violations ${after.violations.join(" | ")}`);
    ok(!d.load, id + " same-on-load", d.load);
    ok(!d.scroll, id + " same-after-scroll", d.scroll);
    if (after.press || before.press) ok(!d.press, id + " same-after-press", d.press);
    console.log(`${observed.views[id].same && !after.errors.length && !after.violations.length ? "same" : "DIFF"}  ${id}  ${after.load.length} lines${after.press ? ", pressed" : ""}`);
  }
}

// THE CANARY: the paint switcher's file missing must be seen.
{
  const target = observed.inventory["/ex3"].find((src) => readFileSync(join(DIST, src), "utf8").includes("ex3-paint"));
  const had = missing.has(target);
  missing.add(target);
  const before = await visit(browser, "before", "/ex3", SIZES[0]);
  const after = await visit(browser, "after", "/ex3", SIZES[0]);
  if (!had) missing.delete(target);
  const diff = firstDiff(before.press, after.press);
  observed.canary = { dropped: target, caught: !!diff, diff };
}
await browser.close();
for (const m of Object.values(ORIGIN)) m.srv.close();

const PRESS_PAGES = PAGES.filter((p) => p.startsWith("/ex3") || p === "/map.html").length;
const VIEWS = SIZES.length * PAGES.length;
const EXPECTED = VIEWS * 4 + SIZES.length * PRESS_PAGES;
ok(assertions === EXPECTED, "assertion-count", `ran ${assertions}, declared ${EXPECTED}`);
assertions--;
const status = failures.length ? "fail" : "pass";
const REPORT = `${SHOTS}/report.txt`;
writeFileSync(join(REPO, REPORT), [`97.90 example-scripts-same-effect${BREAK ? " --break=" + BREAK : ""}: ${status}, ${failures.length} failed`,
  ...Object.entries(observed.views).map(([id, v]) => `${v.same ? "same" : "DIFF"}  ${id}  ${v.lines} lines${v.pressed ? ", pressed" : ""}`),
  "", ...failures, "", `canary ${observed.canary.caught ? "caught" : "NOT CAUGHT"}: ${observed.canary.diff}`].join("\n") + "\n");
artifacts.unshift(REPORT);
const { path: receipt } = writeReceipt({
  check_id: `example-scripts-same-effect${BREAK ? "-" + BREAK : ""}`,
  started_at: new Date(Date.now() - process.uptime() * 1000).toISOString(),
  status,
  expected_targets: VIEWS, discovered_targets: reached, attempted_targets: reached, completed_targets: reached, skipped_targets: 0,
  assertions_executed: assertions, min_assertions: EXPECTED,
  assertion_floor: `${VIEWS} views x 4 (before ran clean, after ran clean under the enforced policy, same on load, same after scroll) + 3 sizes x ${PRESS_PAGES} pages with controls (same after press) = ${EXPECTED}, an EQUALITY (docs/gotchas.md 98).`,
  failures,
  warnings: ["Chromium only, app/dist served by this script, not Netlify. `style` attributes are not compared (animation frames). ex1's cursor glow only moves on pointer movement, which this does not make; its effect is a style property, outside the fingerprint either way.", ...warnings],
  artifacts,
  dimensions: { sizes: SIZES.map((s) => `${s.w}x${s.h}`), pages: PAGES, break: BREAK, item: "97.90", served_as: "Content-Security-Policy (enforcing) in AFTER, none in BEFORE" },
  canary: { id: "ex3-paint-switcher-missing-is-seen", observed_failure: observed.canary.caught },
  observed,
});
for (const f of failures) console.log("FAIL " + f);
console.log(`canary: ${observed.canary.caught ? "caught" : "NOT CAUGHT"} — ${observed.canary.diff}`);
console.log(`receipt: ${receipt}\n${status.toUpperCase()} — ${assertions} assertions, ${failures.length} failed, ${reached} of ${VIEWS} views`);
process.exit(failures.length ? 1 : 0);
