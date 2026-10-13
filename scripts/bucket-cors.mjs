// IS THE CORS RULE ACTUALLY SET ON THE THREE BUCKETS? ASK CLOUDFLARE — ROADMAP 0.11ca.
//
//   node scripts/bucket-cors.mjs                      # judge all three buckets, then a real browser
//   node scripts/bucket-cors.mjs --break=foreign-allowed
//   node scripts/bucket-cors.mjs --break=refuse-ours
//
// Credential-free. No database, no key, no login. It reads the account's public
// S3 endpoint out of `docs/services-and-secrets.md` § 3 (an account id is an
// address, not a secret) and sends CORS PREFLIGHTS: the `OPTIONS` request a
// browser sends before an upload. A preflight carries no body and no credential
// and R2 answers it from the bucket's CORS rule alone, so it writes nothing. The
// browser half follows each allowed preflight with the real unsigned PUT, which R2
// refuses (400, no Authorization), so that writes nothing either.
//
// ---------------------------------------------------------------------------
// WHY IT EXISTS
// ---------------------------------------------------------------------------
// `cors-rule.mjs` judges the INSTRUCTION in FOR-ANDREW.md step 9a1, and
// `photo-release-order.mjs` reports the dashboard side as UNJUDGEABLE `bucket-cors`
// with the reason *"the buckets are unreachable anonymously"*. That is true of
// READING an object, but a preflight is not a read: Cloudflare answers it for
// anybody, and the answer is exactly the rule. Measured 2026-10-13 by hand before
// this file was written: production origin → 204 with the origin echoed;
// `https://evil.example` → 403 with no CORS headers, on all three buckets.
//
// ---------------------------------------------------------------------------
// WHAT IT ASKS
// ---------------------------------------------------------------------------
// Origins and buckets come from `cors-rule.mjs`'s `observe()`, which derives them
// from the product (`host.js`, `photoDoor.ts`), so this holds no list of its own.
//   allow   every bucket × every origin × GET and PUT with `Content-Type`, plus
//           GET from every origin on `media.detailingplatform.com` (the custom
//           domain in front of business-media). The origin must be ECHOED, not
//           answered with `*`, and the method and header must be granted.
//   refuse  every bucket × six foreign origins (a stranger, two lookalikes, plain
//           http, the wrong dev port), plus DELETE from production. No
//           Access-Control-Allow-Origin naming the origin or `*` may come back.
//   browser real Chromium at 1440 and 392, a page served as `http://localhost:5173`
//           and as `https://evil.example` (a fulfilled route, no server), `fetch`
//           PUT to each bucket. Chrome's own `corsErrorStatus` says whether the
//           PREFLIGHT passed: allowed → the preflight passes and the unsigned PUT
//           fails (`MissingAllowOriginHeader`); refused → `Preflight…`.
//
// CANARY: an allowed-origin preflight to a bucket that does not exist, judged as
// "allow". It must fail. A missing bucket and a missing rule both answer 403, so
// this is what proves the allow-judge reads the response at all.
//
// BREAKS: `foreign-allowed` moves `https://evil.example` into the allow list
// (3 preflights and 6 browser cases must fail); `refuse-ours` moves the
// production PUT and the localhost browser page into the refuse list (3 + 6 must fail). Both write `receipts/bucket-cors.sabotage.json`.
//
// WHAT IT CANNOT SEE: the rule as Cloudflare stores it (MaxAge, ordering). It
// sees the rule's EFFECT, which is the thing an upload depends on.

import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { REPO, writeReceipt } from "./receipt.mjs";
import { observe } from "./cors-rule.mjs";

const { chromium } = createRequire(import.meta.url)("./../app/node_modules/playwright/index.js");

const BREAK = (process.argv.find((a) => a.startsWith("--break=")) || "").slice(8) || null;
const BREAKS = ["foreign-allowed", "refuse-ours"];
if (BREAK && !BREAKS.includes(BREAK)) {
  console.error(`unknown --break=${BREAK}; the switches are: ${BREAKS.join(", ")}`);
  process.exit(2);
}

const doc = readFileSync(path.join(REPO, "docs/services-and-secrets.md"), "utf8");
const endpoint = (doc.match(/https:\/\/[0-9a-f]{32}\.r2\.cloudflarestorage\.com/) || [])[0];
const media = /`media\.detailingplatform\.com` is bound to `business-media`/.test(doc)
  ? "https://media.detailingplatform.com" : null;
if (!endpoint || !media) {
  console.error("docs/services-and-secrets.md § 3: the R2 endpoint or the media domain was not found.");
  console.error("NOTHING WAS MEASURED. This is not a pass.");
  process.exit(2);
}

const { origins, buckets } = observe();
if (origins.length < 6 || buckets.length < 3) {
  console.error(`observe() found ${origins.length} origins and ${buckets.length} buckets; the product has 6 and 3.`);
  process.exit(2);
}
// A wildcard origin is asked with a real preview-shaped host.
const concrete = (o) => o.replace("*.", "deploy-preview-1--detailplatform-admin-test.");
const PROD = "https://detailingplatform.com";
const FOREIGN = ["https://evil.example", "https://detailingplatform.com.evil.example",
  "https://evilnetlify.app", "http://detailingplatform.com", "http://localhost:5174",
  "https://notdetailingplatform.com"];
const key = "cors-probe/0.11ca.jpg";

const cases = [];
for (const b of buckets) {
  for (const o of origins) for (const m of ["GET", "PUT"])
    cases.push({ url: `${endpoint}/${b}/${key}`, where: b, origin: concrete(o), method: m, header: true, expect: "allow" });
  for (const o of FOREIGN)
    cases.push({ url: `${endpoint}/${b}/${key}`, where: b, origin: o, method: "PUT", header: true, expect: "refuse" });
  cases.push({ url: `${endpoint}/${b}/${key}`, where: b, origin: PROD, method: "DELETE", header: false, expect: "refuse" });
}
for (const o of origins)
  cases.push({ url: `${media}/${key}`, where: "media domain", origin: concrete(o), method: "GET", header: false, expect: "allow" });
cases.push({ url: `${media}/${key}`, where: "media domain", origin: FOREIGN[0], method: "GET", header: false, expect: "refuse" });
const EXPECTED = cases.length;

if (BREAK === "foreign-allowed")
  for (const c of cases) if (c.origin === FOREIGN[0] && c.method === "PUT") c.expect = "allow";
if (BREAK === "refuse-ours")
  for (const c of cases) if (c.origin === PROD && c.method === "PUT") c.expect = "refuse";

async function preflight(c) {
  const headers = { Origin: c.origin, "Access-Control-Request-Method": c.method };
  if (c.header) headers["Access-Control-Request-Headers"] = "content-type";
  const r = await fetch(c.url, { method: "OPTIONS", headers });
  return {
    status: r.status,
    acao: r.headers.get("access-control-allow-origin"),
    methods: (r.headers.get("access-control-allow-methods") || "").toUpperCase(),
    hdrs: (r.headers.get("access-control-allow-headers") || "").toLowerCase(),
  };
}

let assertions = 0;
function judge(c, r) {
  assertions++;
  if (c.expect === "allow") {
    if (r.status < 200 || r.status > 299) return `status ${r.status}`;
    if (r.acao !== c.origin) return `Access-Control-Allow-Origin is ${JSON.stringify(r.acao)}, not the origin`;
    if (!r.methods.split(/,\s*/).includes(c.method)) return `${c.method} not granted (${r.methods || "none"})`;
    if (c.header && !r.hdrs.split(/,\s*/).includes("content-type")) return `Content-Type not granted (${r.hdrs || "none"})`;
    return null;
  }
  if (r.acao === c.origin || r.acao === "*") return `REFUSED ORIGIN WAS ALLOWED: status ${r.status}, ACAO ${r.acao}`;
  return null;
}

const started = new Date().toISOString();
const lines = [`bucket cors · ${started}`, `endpoint: ${endpoint} · media: ${media}`,
  `origins: ${origins.join(" ")}`, `buckets: ${buckets.join(" ")}`, `broken on purpose: ${BREAK || "no"}`, ""];
const failures = [];
let completed = 0;
for (const c of cases) {
  const r = await preflight(c);
  completed++;
  const bad = judge(c, r);
  const label = `${c.where} ${c.method} from ${c.origin} → expect ${c.expect}`;
  lines.push(`${bad ? "FAIL" : "PASS"}  ${label}: ${r.status}${r.acao ? " ACAO " + r.acao : ""}${bad ? " — " + bad : ""}`);
  if (bad) failures.push(`${label}: ${bad}`);
}

// Canary: a bucket that does not exist, judged as "allow".
const canaryCase = { url: `${endpoint}/no-such-bucket-0-11ca/${key}`, origin: PROD, method: "PUT", header: true, expect: "allow" };
const canaryWhy = judge(canaryCase, await preflight(canaryCase));
lines.push("", `canary nonexistent-bucket-judged-allow caught: ${!!canaryWhy} (${canaryWhy})`);

// ── A REAL BROWSER, BOTH WIDTHS ─────────────────────────────────────────────
const browser = await chromium.launch();
const browserResults = [];
const consoleLines = [];
for (const [w, h] of [[1440, 900], [392, 844]]) {
  for (const [pageOrigin, expect] of [["http://localhost:5173", BREAK === "refuse-ours" ? "refuse" : "allow"], [FOREIGN[0], BREAK === "foreign-allowed" ? "allow" : "refuse"]]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h } });
    const page = await ctx.newPage();
    page.on("console", (m) => consoleLines.push(`${w} ${pageOrigin} [${m.type()}] ${m.text()}`));
    const cdp = await ctx.newCDPSession(page);
    // NOT `ctx.route()`: while any Playwright route is on, Playwright answers every
    // CORS preflight ITSELF with a permissive reply, so Cloudflare is never asked.
    // Measured 2026-10-13: the first version of this file printed evil.example as
    // passing its preflight on all three buckets. A raw CDP `Fetch` pattern pauses
    // only the probe page's own address, and the preflight goes to R2 for real.
    await cdp.send("Fetch.enable", { patterns: [{ urlPattern: `${pageOrigin}/__cors_probe` }] });
    cdp.on("Fetch.requestPaused", (e) => cdp.send("Fetch.fulfillRequest", {
      requestId: e.requestId, responseCode: 200,
      responseHeaders: [{ name: "Content-Type", value: "text/html" }],
      body: Buffer.from("<!doctype html><title>probe</title>").toString("base64"),
    }));
    const urls = new Map();
    const errors = new Map();
    cdp.on("Network.requestWillBeSent", (e) => urls.set(e.requestId, e.request.url));
    cdp.on("Network.loadingFailed", (e) => {
      if (e.corsErrorStatus) errors.set(urls.get(e.requestId), e.corsErrorStatus.corsError);
    });
    cdp.on("Log.entryAdded", (e) => consoleLines.push(`${w} ${pageOrigin} [${e.entry.level}] ${e.entry.text}`));
    await cdp.send("Network.enable");
    await cdp.send("Log.enable");
    await page.goto(`${pageOrigin}/__cors_probe`);
    for (const b of buckets) {
      const url = `${endpoint}/${b}/${key}`;
      const outcome = await page.evaluate(async (u) => {
        try { const r = await fetch(u, { method: "PUT", headers: { "Content-Type": "image/jpeg" }, body: "x" }); return "status " + r.status; }
        catch (e) { return "threw " + e.name; }
      }, url);
      await page.waitForTimeout(150);
      const cors = errors.get(url) || null;
      assertions++;
      const preflightPassed = !!cors && !cors.startsWith("Preflight");
      const ok = expect === "allow" ? preflightPassed : !!cors && cors.startsWith("Preflight");
      const label = `browser ${w}px ${b} PUT from ${pageOrigin} → expect ${expect}`;
      browserResults.push({ label, ok });
      lines.push(`${ok ? "PASS" : "FAIL"}  ${label}: fetch ${outcome}, Chrome corsError ${cors}`);
      if (!ok) failures.push(`${label}: corsError ${cors}`);
    }
    await ctx.close();
  }
}
await browser.close();
lines.push("", "console (both widths; each line is the expected CORS refusal of an unsigned or foreign request):",
  ...consoleLines.map((l) => "  " + l));

const canaryCaught = !!canaryWhy;
const total = EXPECTED + browserResults.length;
const status = failures.length === 0 && canaryCaught && completed === EXPECTED ? "pass" : "fail";
writeFileSync(path.join(REPO, "receipts", `bucket-cors${BREAK ? ".sabotage" : ""}.txt`), lines.join("\n") + "\n");
console.log(lines.filter((l) => !l.startsWith("  ")).join("\n"));
const { path: rp, receipt } = writeReceipt({
  check_id: "bucket-cors",
  started_at: started,
  status,
  expected_targets: EXPECTED + 12,
  discovered_targets: total,
  attempted_targets: total,
  completed_targets: completed + browserResults.length,
  skipped_targets: 0,
  assertions_executed: assertions,
  min_assertions: EXPECTED + 12 + 1,
  failures,
  artifacts: [`receipts/bucket-cors${BREAK ? ".sabotage" : ""}.txt`],
  dimensions: {
    preflights: EXPECTED,
    allow_cases: cases.filter((c) => c.expect === "allow").length,
    refuse_cases: cases.filter((c) => c.expect === "refuse").length,
    browser_cases: browserResults.length,
    widths: [1440, 392],
    origins_derived: origins.length,
    buckets_derived: buckets.length,
    break: BREAK,
  },
  canary: { id: "nonexistent-bucket-judged-allow", observed_failure: canaryCaught },
});
console.log(`\n${failures.length} failed of ${total} · receipt: ${path.relative(REPO, rp)} (${receipt.status})`);
process.exit(status === "pass" ? 0 : 1);
