// ROADMAP 97.1 IN A REAL BROWSER — the one browser caller of `_shared/tz.ts`
// is `BulkJobModal.jsx`, which imports it through Vite. This loads that exact
// module from the dev server in Chromium, at 1440x900, 768x1024 and 390x844,
// converts all 24 hours of 2026-03-08, 2026-11-01 and 2026-07-15 in Los
// Angeles and New York with the BROWSER's own Intl, and requires each to
// read back as the time asked for (02:00 on the spring day does not exist and
// must move forward to 03:00). Console errors at each size are failures; the
// page is a static file on the same origin, so the console read is the
// module's own, not the app shell's.
//
// THE CANARY IS THE ORIGINAL DEFECT IN THE MODULE THE BROWSER RUNS: a fresh
// context rewrites the served tz.ts with the old one-pass body and signs it,
// and the page must report the signature (docs/gotchas.md 113: prove the
// rewrite EXECUTED, not just that it was served) and fail the grid.
// `BREAK=one-pass` runs every size against that rewrite and must go red.
//
// Needs this checkout's dev server (BASE, default http://localhost:5173).
// No credentials, no sign-in, no database.
//
//   node scripts/tz-clock-change-browser.mjs
//   BREAK=one-pass node scripts/tz-clock-change-browser.mjs     # must fail

import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { REPO, writeReceipt } from "./receipt.mjs";

const { chromium } = createRequire(import.meta.url)("./../app/node_modules/playwright/index.js");
const BASE = process.env.BASE || process.env.BASE_URL || "http://localhost:5173";
const BREAK = process.env.BREAK || "";
if (BREAK && BREAK !== "one-pass") { console.error(`unknown BREAK=${BREAK}`); process.exit(2); }
const started_at = new Date().toISOString();

const MODULE = `${BASE}/@fs/${join(REPO, "supabase/functions/_shared/tz.ts").replace(/\\/g, "/")}`;
const SIZES = [[1440, 900], [768, 1024], [390, 844]];
const ONE_PASS_JS = `export function localToDate(tz, y, mo, d, hh, mi) {
  const utcGuess = new Date(Date.UTC(y, mo - 1, d, hh, mi));
  const p = partsOf(tz, utcGuess, { hour12: false, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const asIfUtc = Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day), p.hour === "24" ? 0 : Number(p.hour), Number(p.minute), Number(p.second));
  return new Date(utcGuess.getTime() + (utcGuess.getTime() - asIfUtc));
}
export const __onePass = true;
`;

async function runGrid(browser, [w, h], sabotage) {
  const context = await browser.newContext({ viewport: { width: w, height: h } });
  const page = await context.newPage();
  const consoleErrors = [];
  page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") consoleErrors.push(m.text()); });
  page.on("pageerror", (e) => consoleErrors.push(String(e)));
  let rewrote = false;
  if (sabotage) {
    await page.route("**/_shared/tz.ts*", async (route) => {
      const res = await route.fetch();
      const body = await res.text();
      const broken = body.replace(/export function localToDate\([\s\S]*?\n\}\n/, ONE_PASS_JS);
      rewrote = broken !== body;
      await route.fulfill({ response: res, body: broken, headers: { ...res.headers(), "cache-control": "no-store" } });
    });
  }
  // A static file, not the app: the app shell needs Supabase settings this
  // check does not use, and its console noise would hide or fake the module's.
  await page.goto(`${BASE}/platform-host.txt`, { waitUntil: "domcontentloaded" });
  const out = await page.evaluate(async (url) => {
    const m = await import(url);
    const pad = (n) => String(n).padStart(2, "0");
    const rows = [];
    for (const tz of ["America/Los_Angeles", "America/New_York"])
      for (const day of ["2026-03-08", "2026-11-01", "2026-07-15"])
        for (let hh = 0; hh < 24; hh++) {
          const time = `${pad(hh)}:00`;
          const at = m.localDateTimeToInstant(tz, day, time);
          const back = `${m.dateStrIn(tz, at)} ${m.timeStrIn(tz, at)}`;
          const want = day === "2026-03-08" && hh === 2 ? `${day} 03:00` : `${day} ${time}`;
          rows.push({ tz, day, time, stored: at.toISOString(), back, ok: back === want });
        }
    return { rows, onePass: m.__onePass === true };
  }, MODULE);
  await context.close();
  return { ...out, rewrote, consoleErrors };
}

const browser = await chromium.launch();
const failures = [];
let assertions = 0;
const check = (name, ok, detail = "") => { assertions++; if (!ok) failures.push(`${name}${detail ? ` — ${detail}` : ""}`); };
const perSize = [];
let discovered = 0;
try {
  for (const size of SIZES) {
    const r = await runGrid(browser, size, !!BREAK);
    const label = `${size[0]}x${size[1]}`;
    discovered += r.rows.length;
    if (BREAK) check(`${label} the one-pass rewrite executed`, r.rewrote && r.onePass);
    for (const row of r.rows) check(`${label} ${row.tz} ${row.day} ${row.time}`, row.ok, `stored ${row.stored}, reads back ${row.back}`);
    check(`${label} console clean`, r.consoleErrors.length === 0, r.consoleErrors.slice(0, 3).join(" | "));
    perSize.push({ size: label, conversions: r.rows.length, wrong: r.rows.filter((x) => !x.ok).length, console: r.consoleErrors, sample: r.rows.filter((x) => x.day !== "2026-07-15" && ["01:00", "08:00"].includes(x.time)) });
  }
  // The canary, every run: one fresh context with the old code served.
  const c = await runGrid(browser, SIZES[2], true);
  var canary = {
    id: "browser-tz-one-pass-served",
    observed_failure: c.rewrote && c.onePass && c.rows.some((x) => !x.ok),
    rewrite_executed: c.rewrote && c.onePass,
    wrong: c.rows.filter((x) => !x.ok).length,
  };
  check("the canary — the old module, served and executed, fails the grid", canary.observed_failure, JSON.stringify(canary));
} finally {
  await browser.close();
}

const artifact = `artifacts/tz-clock-change-browser/sizes${BREAK ? ".sabotage" : ""}.json`;
mkdirSync(join(REPO, "artifacts/tz-clock-change-browser"), { recursive: true });
writeFileSync(join(REPO, artifact), JSON.stringify({ base: BASE, module: MODULE, break: BREAK || null, failures, perSize, canary }, null, 2) + "\n");

for (const f of failures.slice(0, 40)) console.log(`FAIL ${f}`);
for (const s of perSize) console.log(`${s.size}: ${s.conversions - s.wrong}/${s.conversions} round-trip, console ${s.console.length ? s.console.length + " messages" : "clean"}`);
console.log(`canary: old module served=${canary.rewrite_executed}, wrong ${canary.wrong} of 144`);
console.log(`\n${assertions - failures.length} passed, ${failures.length} failed, ${assertions} assertions${BREAK ? ` (BREAK=${BREAK})` : ""}.`);

const EXPECTED = SIZES.length * 144;
const { path } = writeReceipt({
  check_id: "tz-clock-change-browser",
  started_at,
  status: failures.length ? "fail" : "pass",
  expected_targets: EXPECTED,
  discovered_targets: discovered,
  attempted_targets: discovered,
  completed_targets: discovered,
  skipped_targets: 0,
  assertions_executed: assertions,
  min_assertions: EXPECTED + SIZES.length + 1,
  assertion_floor: "structural: 3 sizes x 144 fixed conversions, one console check per size and one canary, so the count cannot vary",
  failures,
  dimensions: { roadmap: "97.1", base: BASE, sizes: SIZES.map((s) => s.join("x")), ...(BREAK ? { break: BREAK } : {}) },
  artifacts: [artifact],
  canary,
});
console.log(`receipt: ${path}`);
process.exit(failures.length ? 1 : 0);
