// ROADMAP 14.15 — WHO REFUSES `address-suggest`? The repro the item asks for.
//
//   set -a; . ./.env; set +a
//   node scripts/address-429-repro.mjs            # dev server on :5173 + seed
//   node scripts/address-429-repro.mjs --break=blind
//
// On 2026-09-23 the platform logged 82 refusals of `address-suggest` while the
// product's own counters in `rate_hits` sat at 36 of 60. The item asks for a
// run that makes a refusal happen AND proves who made it. Three phases, all
// from a real Chromium page on the public booking page, so every call carries
// the browser's own CORS preflight:
//
//   1. BURST — waves of concurrent calls with a 2-character query. The
//      function answers those 400 `bad_query` BEFORE it reaches the limiter
//      (`index.ts`, "THE LENGTH FLOOR COMES BEFORE THE THROTTLE"), so they
//      cost no credit and move no counter, and A 429 IN THIS PHASE CANNOT BE
//      THE PRODUCT'S. It is the clean test for a ceiling above the function.
//   2. PRESSES — the real address box and the real Find button, a distinct
//      street each press (the field caches a repeated query), until the
//      product's own per-IP limit (60 an hour) is crossed. That is the
//      POSITIVE CONTROL: its 429 must appear, with `reason: "busy"`, and the
//      counter must move. A run that never sees the product refuse cannot
//      claim to see anything else refuse either.
//   3. COUNTERS — `rate_hits` for every `address%` bucket, read immediately
//      before phase 2 and immediately after (read-only, service role).
//
// Every 429 is attributed by its BODY, never its status — the item's step 2.
//
// SPEND: phase 2 spends one Geoapify credit per press until the product
// refuses (at most 60 an hour per IP; free plan, no money), and exhausts THIS
// MACHINE'S hourly address allowance — a booking-page session on this machine
// in the next hour sees "Too many lookups" (docs/shared-resources.md § 1-2).
// Phase 1 spends nothing anywhere but edge-function invocations.
//
// --break=blind: attribution stops reading the body. The run must then be
// unable to tell its refusals apart and go red; if it stays green, it was
// never reading bodies at all.

import { chromium } from "../app/node_modules/playwright/index.mjs";
import { mkdirSync, writeFileSync } from "node:fs";
import { REPO, writeReceipt } from "./receipt.mjs";

const BASE = process.env.BASE || "http://localhost:5173";
const SLUG = "demo-detail";
const BREAK = (process.argv.find((a) => a.startsWith("--break=")) || "").slice(8);
const WAVES = [100, 100, 100];              // phase 1, concurrent per wave
const PRESSES = 70;                         // phase 2, > the 60/hour per-IP limit
const { SUPABASE_URL: URL_, SUPABASE_SERVICE_ROLE_KEY: SR, SUPABASE_ANON_KEY: ANON } = process.env;
if (!URL_ || !SR) { console.error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY — load .env first"); process.exit(2); }
// THIS PLATFORM'S OWN PROJECT, AND NOTHING ELSE (CLAUDE.md hard rules).
if (!URL_.includes("kguqylyzgyzfktkfnhjb")) { console.error(`refusing: SUPABASE_URL is not kguqylyzgyzfktkfnhjb (${URL_})`); process.exit(2); }

const counters = async () => {
  const r = await fetch(`${URL_}/rest/v1/rate_hits?bucket=like.address%25&select=bucket,key,window_start,hits&order=window_start.desc`,
    { headers: { apikey: SR, Authorization: `Bearer ${SR}` } });
  if (!r.ok) throw new Error(`rate_hits read ${r.status}`);
  // THE PER-IP ROWS ARE KEYED ON THIS MACHINE'S PUBLIC ADDRESS, which has no
  // business in a committed receipt. The counts are the evidence; the key is not.
  return (await r.json()).map((x) => ({ ...x, key: x.key === "all" ? "all" : "<this machine>" }));
};
const total = (rows, bucket) => rows.filter((x) => x.bucket === bucket).reduce((s, x) => s + x.hits, 0);

// WHO MADE A 429. The body is the only thing that can say (item, step 2).
const who = (status, body) => {
  if (status !== 429) return null;
  if (BREAK === "blind") return "unknown";
  return body && typeof body === "object" && body.reason === "busy" ? "product" : "above";
};

const started = new Date().toISOString();
const failures = [];
let assertions = 0;
const ok = (cond, msg) => { assertions++; if (!cond) failures.push(msg); console.log(`${cond ? "ok  " : "FAIL"} ${msg}`); };

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const consoleErrors = [];
page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text()); });

// Every address-suggest exchange the page makes. PREFLIGHTS ARE INVISIBLE TO
// `page.on("response")` — measured: the first run counted 0 over 370
// cross-origin JSON POSTs, which the Fetch spec makes impossible — so they are
// counted from the browser's own network events instead.
const seen = { preflight: 0, post: [] };
const cdp = await page.context().newCDPSession(page);
await cdp.send("Network.enable");
cdp.on("Network.requestWillBeSent", (e) => {
  if (e.request.url.includes("/functions/v1/address-suggest") && (e.type === "Preflight" || e.request.method === "OPTIONS")) seen.preflight++;
});
page.on("response", async (res) => {
  if (!res.url().includes("/functions/v1/address-suggest")) return;
  if (res.request().method() === "OPTIONS") return;
  let body = null;
  try { body = await res.json(); } catch { body = await res.text().catch(() => null); }
  seen.post.push({ status: res.status(), body, headers: res.headers() });
});

let burst = [], presses = [], before = [], after = [];
try {
  await page.goto(`${BASE}/book/${SLUG}`, { waitUntil: "networkidle" });

  // ---- PHASE 1: the burst, fired by the page itself -----------------------
  for (const n of WAVES) {
    // The same headers the page's own transport sends (`core.js` postFunction).
    const wave = await page.evaluate(async ({ url, n, anon }) => {
      return Promise.all(Array.from({ length: n }, async () => {
        const t0 = performance.now();
        try {
          const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json", ...(anon ? { apikey: anon, Authorization: `Bearer ${anon}` } : {}) }, body: JSON.stringify({ q: "ab" }) });
          let body; try { body = await r.json(); } catch { body = null; }
          return { status: r.status, body, ms: Math.round(performance.now() - t0) };
        } catch (e) { return { status: 0, body: String(e), ms: Math.round(performance.now() - t0) }; }
      }));
    }, { url: `${URL_}/functions/v1/address-suggest`, n, anon: ANON });
    burst.push(...wave);
  }

  // ---- PHASE 2: real Find presses ------------------------------------------
  // Walk to the address step the way a customer does. Step order is
  // Services, Extras, Vehicle, Location; the walker answers whatever it meets.
  const addr = page.locator("input[autocomplete=street-address]");
  for (let i = 0; i < 8 && !(await addr.count()); i++) {
    if (await page.locator(".bk-card.selectable").count() && !(await page.locator(".bk-card.selectable.selected").count())) {
      await page.locator(".bk-card.selectable").first().click();
    }
    for (const inp of await page.locator(".bk-field input:visible").all()) {
      if ((await inp.inputValue()) !== "") continue;
      await inp.fill((await inp.getAttribute("inputmode")) === "numeric" ? "2019" : "2019 Honda Civic");
    }
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await page.waitForTimeout(600);
  }
  ok(await addr.count() > 0, "the walk reached the address step");

  // THE WINDOW IS A FIXED CLOCK HOUR (`rate_take`). The first run started at
  // :58 and its 70 presses landed 34 + 36 across two hours, so the product
  // never refused and the positive control read as blind. Seventy presses take
  // about three minutes; wait out the boundary rather than straddle it.
  const m = new Date().getUTCMinutes();
  if (m >= 54) { console.log(`waiting ${61 - m} min for the hour to roll — the per-IP window is a clock hour`); await page.waitForTimeout((61 - m) * 60000); }
  before = await counters();
  const find = page.getByRole("button", { name: "Find", exact: true });
  for (let i = 0; i < PRESSES; i++) {
    const n0 = seen.post.length;
    await addr.fill(`${100 + i} Market Street, Long Beach, CA`);
    await find.click();
    // Settle on the REQUEST COUNT, not the rendering (docs/gotchas.md 109).
    const t0 = Date.now();
    while (seen.post.length === n0 && Date.now() - t0 < 15000) await page.waitForTimeout(50);
    const last = seen.post[seen.post.length - 1];
    presses.push(seen.post.length > n0 ? { status: last.status, body: last.body } : { status: -1, body: "no response in 15s" });
    await find.waitFor({ state: "attached" });
    await page.waitForFunction(() => !document.querySelector(".bk-find")?.textContent.includes("…"), null, { timeout: 15000 }).catch(() => {});
  }
  after = await counters();
} finally {
  await browser.close();
}

// ---- THE VERDICT ------------------------------------------------------------
const tally = (rows) => {
  const t = { 200: 0, 400: 0, 429: 0, other: 0, product: 0, above: 0, unknown: 0 };
  for (const r of rows) {
    t[[200, 400, 429].includes(r.status) ? r.status : "other"]++;
    const w = who(r.status, r.body); if (w) t[w]++;
  }
  return t;
};
const b = tally(burst), p = tally(presses);
const aboveBodies = [...burst, ...presses].filter((r) => who(r.status, r.body) === "above").map((r) => r.body).slice(0, 5);
const moved = {
  address_ip: total(after, "address_ip") - total(before, "address_ip"),
  address_day: total(after, "address_day") - total(before, "address_day"),
};
console.log("\nburst  ", JSON.stringify(b), `slowest ${Math.max(...burst.map((r) => r.ms))}ms`);
console.log("presses", JSON.stringify(p));
console.log("rate_hits moved", JSON.stringify(moved), "preflights seen", seen.preflight);
if (aboveBodies.length) console.log("429 bodies from ABOVE the function:", JSON.stringify(aboveBodies));

const expectedBurst = WAVES.reduce((s, n) => s + n, 0);
ok(burst.length === expectedBurst, `burst reached ${burst.length} of ${expectedBurst} calls`);
ok(presses.length === PRESSES && presses.every((r) => r.status > 0), `presses answered ${presses.filter((r) => r.status > 0).length} of ${PRESSES}`);
ok(seen.preflight > 0, `the browser sent CORS preflights (${seen.preflight})`);
// The burst can only be 400 or a refusal from ABOVE — any 429 there is the finding.
ok(b[429] === b.above, `every burst 429 is attributed by its body (${b[429]} refusals, ${b.above} from above, ${b.unknown} unknown)`);
ok(b[400] + b[429] === expectedBurst, `burst answers are only 400 bad_query or 429 (${b[400]} + ${b[429]} of ${expectedBurst})`);
// POSITIVE CONTROL: the product must be seen refusing, by body, with the counter moving.
ok(p.product > 0, `the product's own refusal was seen on a press, by body (${p.product} "busy")`);
ok(p[429] === p.product + p.above, `every press 429 is attributed by its body (${p[429]} = ${p.product} product + ${p.above} above, ${p.unknown} unknown)`);
ok(moved.address_ip >= p[200] + p.product, `the per-IP counter moved by every press that reached the limiter (${moved.address_ip} >= ${p[200]} + ${p.product})`);
ok(!consoleErrors.some((e) => !/429|Too Many|address-suggest|status of 4/.test(e)), `no console error other than the refusals themselves (${consoleErrors.length} total)`);

const verdict = b.above + p.above > 0
  ? `REPRODUCED: ${b.above + p.above} refusal(s) from ABOVE the function`
  : `NOT REPRODUCED: 0 refusals from above in ${expectedBurst} burst calls + ${PRESSES} presses; the product's own limiter refused ${p.product}`;
console.log(`\n${verdict}`);

// EVERY CALL, STATUS AND BODY, so a reader can attribute each refusal by hand.
const LOG = `artifacts/address-429-repro/calls${BREAK ? "." + BREAK : ""}.json`;
mkdirSync(`${REPO}/artifacts/address-429-repro`, { recursive: true });
writeFileSync(`${REPO}/${LOG}`, JSON.stringify({ burst, presses }, null, 1));

const status = failures.length ? "fail" : "pass";
const { path } = writeReceipt({
  check_id: "address-429-repro",
  started_at: started,
  status,
  expected_targets: expectedBurst + PRESSES,
  discovered_targets: burst.length + presses.length,
  attempted_targets: burst.length + presses.length,
  completed_targets: burst.length + presses.filter((r) => r.status > 0).length,
  skipped_targets: 0,
  assertions_executed: assertions,
  min_assertions: 9,
  failures,
  warnings: [
    "The booking page's address field is a Find button since 2026-09-13, not a per-keystroke type-ahead; the item's step 1 ('typing, each keystroke a request') is no longer how the product calls it, so phase 2 presses Find with a distinct street each time.",
    "Phase 2 exhausts this machine's hourly address allowance (60/IP) on purpose; that is the positive control.",
    "One IP, one region, one evening. A ceiling keyed on many IPs, or only reached at higher concurrency than 100, would not show here.",
  ],
  artifacts: [LOG],
  canary: { id: "product-refusal-seen-by-body", observed_failure: p.product > 0 && moved.address_ip > 0 },
  dimensions: { slug: SLUG, waves: WAVES, presses: PRESSES, break: BREAK, item: "14.15" },
  observed: { verdict, burst: b, presses: p, moved, preflights: seen.preflight, above_bodies: aboveBodies,
    burst_slowest_ms: Math.max(...burst.map((r) => r.ms)), console_errors: consoleErrors.length,
    counters_before: before, counters_after: after },
});
console.log(`receipt: ${path}\n${status.toUpperCase()} — ${assertions} assertions, ${failures.length} failed`);
process.exit(failures.length ? 1 : 0);
