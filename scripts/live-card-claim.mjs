// DOES THE LIVE HOME PAGE STILL PROMISE A CARD PAYMENT THE PRODUCT CANNOT TAKE?
//
//   node scripts/live-card-claim.mjs                     # read the live site
//   node scripts/live-card-claim.mjs --shots=<dir>       # also photograph the row
//   node scripts/live-card-claim.mjs --break=old-wording # must go red
//
// ROADMAP 12.2, branch two: "the home page stops promising it". The wording was
// fixed in the repo by 6097a7e on 2026-09-20 and sat unpublished for weeks
// while the entry said it was done — whoever "verified" it read localhost or
// the source. So this reads ONLY the published site, in a real browser, and
// never the checkout. Read-only: no credentials, no database, no deploy.
//
// --break=old-wording rewrites the live bundle in the browser back to the
// original promise, which is the defect itself rather than a proxy for it. It
// counts its own replacements, because a rewrite that never matched leaves a
// clean run that looks exactly like a caught one (docs/gotchas.md 102). One
// goto per browser context, because a second navigation can run the cached
// ORIGINAL with nothing left to intercept (docs/gotchas.md 113).

import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { writeReceipt } from "./receipt.mjs";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const { chromium } = createRequire(path.join(ROOT, "app", "package.json"))("playwright");

const SITE = "https://detailingplatform.com";
const arg = (k) => (process.argv.find((a) => a.startsWith(`--${k}=`)) || "").split("=").slice(1).join("=");
const BREAK = arg("break");
const SHOTS = arg("shots");
if (BREAK && BREAK !== "old-wording") {
  console.error(`Unknown --break=${BREAK}. Nothing was measured.`);
  process.exit(1);
}

const OLD = "Take a card payment";
const NEW = "Log a card payment";
// Declared, not discovered: the home page names a card payment exactly once,
// and the pricing page not at all. An equality, so a second claim reddens.
const TARGETS = [
  { id: "home@1440", route: "/", width: 1440, height: 900, claims: 1 },
  { id: "home@392", route: "/", width: 392, height: 844, claims: 1 },
  { id: "home@320", route: "/", width: 320, height: 844, claims: 1 },
  { id: "home@392-lite", route: "/?lite=1", width: 392, height: 844, claims: 1 },
  { id: "pricing@392", route: "/pricing", width: 392, height: 844, claims: 0 },
];

/** The rule, judged on page text. The canary runs through this same function. */
export function judge(text, claims) {
  const out = [];
  const found = text.match(/[A-Za-z]+ a card payment/gi) || [];
  if (found.length !== claims) out.push(`${found.length} card-payment phrase(s), declared ${claims}: ${found.join(" | ") || "none"}`);
  if (found.some((f) => f !== NEW)) out.push(`reads "${found.find((f) => f !== NEW)}", not "${NEW}"`);
  if (text.includes(OLD)) out.push(`the page still says "${OLD}"`);
  return out;
}

const started_at = new Date().toISOString();
const failures = [];
const warnings = [];
const perTarget = {};
let assertions = 0;
let completed = 0;
let replaced = 0;
const bundles = new Set();

const browser = await chromium.launch();
try {
  for (const t of TARGETS) {
    const ctx = await browser.newContext({ viewport: { width: t.width, height: t.height } });
    const page = await ctx.newPage();
    const consoleLines = [];
    page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") consoleLines.push(`${m.type()}: ${m.text()}`); });
    page.on("pageerror", (e) => consoleLines.push(`pageerror: ${e.message}`));
    if (BREAK) {
      await page.route(/\/assets\/index-[^/]+\.js$/, async (route) => {
        const res = await route.fetch();
        const body = await res.text();
        replaced += body.split(NEW).length - 1;
        await route.fulfill({ response: res, body: body.replaceAll(NEW, OLD) });
      });
    }
    try {
      await page.goto(SITE + t.route, { waitUntil: "networkidle", timeout: 45000 });
      const bundle = await page.evaluate(() => [...document.scripts].map((s) => s.src).find((s) => /assets\/index-/.test(s)) || "");
      bundles.add(bundle.replace(/^.*\/assets\//, ""));
      // textContent, not innerText: what the page SAYS, not how CSS cased it (gotchas 115).
      const text = await page.evaluate(() => document.body.textContent.replace(/\s+/g, " "));
      const problems = judge(text, t.claims);
      assertions += 3;
      let painted = null;
      if (t.claims) {
        const row = page.locator(".figrow", { hasText: "card payment" }).first();
        await row.scrollIntoViewIfNeeded();
        await page.waitForTimeout(1500); // the row sits in a scroll reveal
        painted = await row.evaluate((el) => el.checkVisibility({ opacityProperty: true, visibilityProperty: true })
          && Number(getComputedStyle(el.closest("[data-rv]") || el).opacity) > 0.9);
        assertions += 1;
        if (!painted) problems.push("the card-payment row is not painted after scrolling to it");
        if (SHOTS) {
          mkdirSync(SHOTS, { recursive: true });
          await page.locator(".figcopy").first().screenshot({ path: path.join(SHOTS, `${BREAK ? "before" : "after"}-${t.id}.png`) });
        }
      }
      for (const p of problems) failures.push(`${t.id}: ${p}`);
      for (const c of consoleLines) warnings.push(`${t.id} console ${c}`);
      perTarget[t.id] = { problems: problems.length, painted, console: consoleLines.length };
      completed += 1;
    } catch (e) {
      failures.push(`${t.id}: could not be measured: ${e.message.split("\n")[0]}`);
    }
    await ctx.close();
  }
} finally {
  await browser.close();
}

// Every target must have been served the same build, or the run straddled a publish.
assertions += 1;
if (bundles.size !== 1) failures.push(`targets were served ${bundles.size} different bundles: ${[...bundles].join(", ")}`);
if (BREAK) {
  assertions += 1;
  if (!replaced) failures.push("--break=old-wording replaced nothing: the sabotage never landed, so this run proves nothing");
  warnings.push(`run with --break=${BREAK}; ${replaced} replacement(s) landed; this receipt is a sabotage, not a result`);
}

// Canary, every run: the old promise handed to the SAME judge must be refused.
const canaryCaught = judge(`Your back office ${OLD} on the driveway`, 1).length > 0;

const n = TARGETS.length;
const { path: receiptPath } = writeReceipt({
  check_id: "live-card-claim",
  started_at,
  status: failures.length ? "fail" : "pass",
  expected_targets: n,
  discovered_targets: n,
  attempted_targets: n,
  completed_targets: completed,
  skipped_targets: 0,
  assertions_executed: assertions,
  min_assertions: 15,
  failures,
  warnings,
  artifacts: ["scripts/live-card-claim.mjs"],
  canary: { id: "old-promise-through-judge", observed_failure: canaryCaught },
  dimensions: {
    site: SITE, bundles: [...bundles], targets: perTarget,
    ...(BREAK ? { break: BREAK, replacements_landed: replaced } : {}),
  },
});

console.log(`${SITE}: bundle ${[...bundles].join(", ")}; ${completed} of ${n} targets measured, ${assertions} assertions`);
for (const [id, r] of Object.entries(perTarget)) console.log(`  ${id}: ${r.problems} problem(s), painted ${r.painted}, console ${r.console}`);
if (BREAK) console.log(`  sabotage replacements landed: ${replaced}`);
console.log(`  canary (old promise through the same judge) refused: ${canaryCaught}`);
for (const w of warnings) console.log(`WARN - ${w}`);
for (const f of failures) console.log(`FAIL - ${f}`);
console.log(`${failures.length ? "FAIL" : "PASS"}  receipt ${receiptPath}`);
process.exit(failures.length ? 1 : 0);
