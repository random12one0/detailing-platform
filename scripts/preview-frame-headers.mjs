// THE BOOKING PREVIEW MAY BE FRAMED; THE DASHBOARD AND BACK OFFICE MAY NOT — ROADMAP 9.1c.
//
// The live site sent `X-Frame-Options: DENY` on every path, so Business's own
// preview of `/book/<slug>` (components/PagePreview.jsx) was a blank frame and
// a console error. The Vite dev server sends no such header, so no dev-server
// check could ever see it: every local run was green over a live screen that
// was blank. This serves the BUILT app (app/dist) with exactly the headers
// app/netlify.toml declares, and asks a real browser:
//
//   1. at 1440 and 392, signed in as the demo owner, does Business's preview
//      frame render the booking page, with a silent console?
//   2. framed by its own origin, do /app and /admin still refuse?
//   3. framed by a stranger's origin (another port), do /app, /admin AND
//      /book/demo-detail refuse? The last one is what keeps the fix narrow.
//
// HOW NETLIFY'S RULES ARE MODELLED, AND THE ONE PART THAT IS NOT KNOWN:
//   every `[[headers]]` rule whose `for` matches the REQUESTED path applies
//   (the repo already relies on that: `/assets/*` adds Cache-Control on top of
//   `/*`). If two matching rules set the SAME header name, Netlify may join
//   the values, and "DENY, SAMEORIGIN" is read by a browser as DENY — so that
//   is served joined, and also reported as its own failure.
//   UNKNOWN HERE: whether Netlify matches `for` against the requested path or
//   against `/index.html`, which the SPA rewrite serves. This assumes the
//   requested path. Only the live rerun after a publish (ROADMAP 9.1b) or
//   `curl -sI https://detailingplatform.com/book/demo-detail` can settle it.
//
// SABOTAGE (an argument to this script, not to `node --test`):
//   --break=blanket-allow  drop X-Frame-Options from `/*` — the lazy fix. Must
//                          go red on /app and /admin being frameable.
//   --break=no-fix         drop the `/book/*` rule — the original defect. Must
//                          go red on a blank preview and a console error.
// CANARY, every run: a path served with NO frame headers is framed by the
// stranger; the refusal test must call it frameable, or it cannot see one.
//
// Needs: `npm run build --prefix app` first, and DEMO_OWNER_PW in .env.
// Reads only; signs in as the demo owner and writes nothing.

import { createServer } from "node:http";
import { readFileSync, existsSync, statSync } from "node:fs";
import { join, extname } from "node:path";
import { createRequire } from "node:module";
import { REPO, writeReceipt } from "./receipt.mjs";
import { demoOwner } from "./lib/demoOwner.mjs";

try { process.loadEnvFile(join(REPO, ".env")); } catch {}
const require = createRequire(join(REPO, "app", "package.json"));
const { chromium } = require("playwright");

const BREAK = (process.argv.find((a) => a.startsWith("--break=")) || "").slice(8);
if (BREAK && !["blanket-allow", "no-fix"].includes(BREAK)) throw new Error(`unknown --break=${BREAK}`);
const DIST = join(REPO, "app", "dist");
if (!existsSync(join(DIST, "index.html"))) throw new Error("app/dist is missing: run npm run build --prefix app");
const PA = 5191, PB = 5192;
const A = `http://localhost:${PA}`, B = `http://localhost:${PB}`;
const SLUG = "demo-detail";
const SIZES = [{ w: 1440, h: 900 }, { w: 392, h: 844 }];
const CANARY_PATH = "/__canary-unprotected";

// ── THE RULES, FROM THE REAL FILE ───────────────────────────────────────────
export function parseHeaderRules(toml) {
  const rules = [];
  let cur = null, inValues = false;
  for (const raw of toml.split(/\r?\n/)) {
    const line = raw.replace(/^\s+|\s+$/g, "");
    if (!line || line.startsWith("#")) continue;
    if (line === "[[headers]]") { cur = { for: null, values: {} }; rules.push(cur); inValues = false; continue; }
    if (line === "[headers.values]" && cur) { inValues = true; continue; }
    if (line.startsWith("[")) { cur = null; inValues = false; continue; }
    const m = line.match(/^([A-Za-z0-9-]+)\s*=\s*"(.*)"$/);
    if (!m || !cur) continue;
    if (inValues) cur.values[m[1]] = m[2];
    else if (m[1] === "for") cur.for = m[2];
  }
  return rules;
}
const forRe = (p) => new RegExp("^" + p.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*") + "$");
export function headersFor(rules, path) {
  const out = {}, dupes = [];
  for (const r of rules) {
    if (!r.for || !forRe(r.for).test(path)) continue;
    for (const [k, v] of Object.entries(r.values)) {
      if (k in out) { dupes.push(k); out[k] += ", " + v; } else out[k] = v;
    }
  }
  return { headers: out, dupes };
}

const rules = parseHeaderRules(readFileSync(join(REPO, "app", "netlify.toml"), "utf8"));
if (BREAK === "blanket-allow") for (const r of rules) if (r.for === "/*") delete r.values["X-Frame-Options"];
if (BREAK === "no-fix") {
  const i = rules.findIndex((r) => r.for === "/book/*");
  if (i < 0) throw new Error("--break=no-fix found no /book/* rule to remove, so it would test nothing");
  rules.splice(i, 1);
}

// ── THE TWO ORIGINS ─────────────────────────────────────────────────────────
const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml",
  ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".json": "application/json", ".woff2": "font/woff2" };
const app = createServer((req, res) => {
  const path = decodeURIComponent(new URL(req.url, A).pathname);
  let file = join(DIST, path);
  if (!file.startsWith(DIST) || !existsSync(file) || statSync(file).isDirectory()) file = join(DIST, "index.html");
  const headers = path === CANARY_PATH ? {} : headersFor(rules, path).headers;
  res.writeHead(200, { "Content-Type": MIME[extname(file)] || "application/octet-stream", ...headers });
  res.end(readFileSync(file));
});
const stranger = createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/html" });
  res.end("<!doctype html><title>stranger</title><body></body>");
});
await Promise.all([new Promise((r) => app.listen(PA, r)), new Promise((r) => stranger.listen(PB, r))]);

const failures = [];
let assertions = 0;
const ok = (cond, id, msg) => { assertions++; if (!cond) failures.push(`${id}: ${msg}`); return cond; };

// A frame renders when its document has a mounted React root. An error page
// (what a refused frame becomes) has none, and evaluating into it throws.
async function renders(frame, timeout) {
  try { await frame.waitForFunction(() => document.querySelector("#root")?.children.length > 0, null, { timeout }); return true; }
  catch { return false; }
}
async function frameIn(page, src, name) {
  await page.evaluate(({ src, name }) => {
    const f = document.createElement("iframe");
    f.name = name; f.src = src; f.style.cssText = "width:400px;height:300px";
    document.body.appendChild(f);
  }, { src, name });
  await page.waitForTimeout(500);
  const frame = page.frames().find((f) => f.name() === name);
  return frame ? renders(frame, 8000) : false;
}

const browser = await chromium.launch();
const observed = { effective: {}, sizes: {}, refusals: {} };
let canaryCaught = false;
try {
  for (const p of ["/app", "/admin", `/book/${SLUG}`]) {
    const { headers, dupes } = headersFor(rules, p);
    observed.effective[p] = headers;
    ok(dupes.length === 0, `headers${p}`, `two matching rules both set ${dupes.join(", ")} — Netlify may join them and a browser reads a conflict as DENY`);
  }
  ok(rules.length >= 3, "rules-parsed", `parsed ${rules.length} [[headers]] rules from app/netlify.toml; expected at least 3`);

  // Sign in once.
  const ctx0 = await browser.newContext();
  const p0 = await ctx0.newPage();
  await p0.goto(A + "/app", { waitUntil: "domcontentloaded" });
  await p0.waitForSelector("input[type=email], .tabbar", { timeout: 30000 });
  if (await p0.locator("input[type=email]").count()) {
    await p0.fill("input[type=email]", "demo@detailplatform.com");
    await p0.fill("input[type=password]", demoOwner().password);
    await p0.click("form button.btn.primary");
    await p0.waitForSelector(".tabbar", { timeout: 30000 });
  }
  const state = await ctx0.storageState();
  await ctx0.close();

  // 1. The preview, at both widths, console read.
  for (const s of SIZES) {
    const tag = `${s.w}x${s.h}`;
    const ctx = await browser.newContext({ viewport: { width: s.w, height: s.h }, storageState: state });
    const page = await ctx.newPage();
    const noise = [];
    page.on("console", (m) => { if (["error", "warning"].includes(m.type())) noise.push(`${m.type()}: ${m.text().slice(0, 200)}`); });
    page.on("pageerror", (e) => noise.push(`pageerror: ${String(e.message).slice(0, 200)}`));
    await page.goto(A + "/app/business", { waitUntil: "domcontentloaded" });
    const iframe = page.locator(".pagepv-frame iframe");
    const found = await iframe.waitFor({ state: "attached", timeout: 30000 }).then(() => true, () => false);
    ok(found, `preview-found@${tag}`, "Business shows no .pagepv-frame iframe");
    let shown = false, src = null;
    if (found) {
      src = await iframe.getAttribute("src");
      const frame = await (await iframe.elementHandle()).contentFrame();
      shown = !!frame && await renders(frame, 20000);
    }
    ok(shown, `preview-renders@${tag}`, `the preview frame (${src}) did not render the booking page`);
    await page.waitForTimeout(1500);
    ok(noise.length === 0, `console@${tag}`, `console not silent: ${noise.join(" | ")}`);
    observed.sizes[tag] = { src, shown, console: noise };
    await ctx.close();
  }

  // 2. Own origin frames the dashboard and back office.
  {
    const ctx = await browser.newContext({ storageState: state });
    const page = await ctx.newPage();
    await page.goto(A + `/book/${SLUG}`, { waitUntil: "domcontentloaded" });
    for (const p of ["/app", "/admin"]) {
      const r = await frameIn(page, A + p, "self" + p.replace(/\W/g, "-"));
      observed.refusals[`self ${p}`] = r ? "RENDERED" : "refused";
      ok(!r, `self-frames${p}`, `${p} rendered inside a frame on its own origin`);
    }
    await ctx.close();
  }
  // 3. A stranger frames all three, plus the canary.
  {
    const ctx = await browser.newContext({ storageState: state });
    const page = await ctx.newPage();
    await page.goto(B + "/", { waitUntil: "domcontentloaded" });
    for (const p of ["/app", "/admin", `/book/${SLUG}`]) {
      const r = await frameIn(page, A + p, "stranger" + p.replace(/\W/g, "-"));
      observed.refusals[`stranger ${p}`] = r ? "RENDERED" : "refused";
      ok(!r, `stranger-frames${p}`, `${p} rendered inside a frame on another origin (${B})`);
    }
    canaryCaught = await frameIn(page, A + CANARY_PATH, "canary");
    ok(canaryCaught, "canary", `a path with no frame headers did NOT render in a stranger's frame, so "refused" above proves nothing`);
    await ctx.close();
  }
} finally {
  await browser.close();
  app.close(); stranger.close();
}

const EXPECTED_ASSERTIONS = 3 + 1 + SIZES.length * 3 + 2 + 3 + 1;
if (assertions !== EXPECTED_ASSERTIONS) failures.push(`assertion count ${assertions} != declared ${EXPECTED_ASSERTIONS} — a run that stopped early`);
const targets = SIZES.length + 2 + 3;
const status = failures.length ? "fail" : "pass";
const { path } = writeReceipt({
  check_id: "preview-frame-headers",
  started_at: new Date(Date.now() - process.uptime() * 1000).toISOString(),
  status,
  expected_targets: targets,
  discovered_targets: Object.keys(observed.sizes).length + Object.keys(observed.refusals).length,
  attempted_targets: targets,
  completed_targets: Object.keys(observed.sizes).length + Object.keys(observed.refusals).length,
  skipped_targets: 0,
  assertions_executed: assertions,
  min_assertions: EXPECTED_ASSERTIONS,
  assertion_floor: `3 header-merge + 1 parse + 2 sizes x 3 + 2 own-origin + 3 stranger + 1 canary = ${EXPECTED_ASSERTIONS}, asserted as an EQUALITY (docs/gotchas.md 98).`,
  failures,
  warnings: [
    "Chromium only, against app/dist served with app/netlify.toml's headers by this script — not Netlify itself.",
    "Assumes Netlify matches [[headers]] `for` against the REQUESTED path, not the /index.html the SPA rewrite serves. Unproved until the live rerun after publish (ROADMAP 9.1b).",
  ],
  artifacts: [],
  dimensions: { sizes: SIZES.map((s) => `${s.w}x${s.h}`), item: "9.1c", break: BREAK, origins: { app: A, stranger: B } },
  canary: { id: "unprotected-path-renders-for-stranger", observed_failure: canaryCaught },
  observed,
});
console.log(JSON.stringify(observed, null, 1));
for (const f of failures) console.log("FAIL " + f);
console.log(`receipt: ${path}`);
console.log(`\n${status.toUpperCase()} — ${assertions} assertions, ${failures.length} failed`);
if (failures.length) process.exitCode = 1;
