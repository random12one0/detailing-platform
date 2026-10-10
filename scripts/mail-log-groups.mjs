// DOES THE EVERYTHING LIST CARRY VISIBLE TIME GROUPS, AND NO NEW FILTER — ROADMAP 3.1c.
//
//   node scripts/mail-log-groups.mjs
//   node scripts/mail-log-groups.mjs --break=nobands   # sabotage: the dividers hidden (the pre-3.1c page)
//
// Needs the dev server, the seed, and `.env` loaded (`set -a; . ./.env; set +a`).
// Signs in as the demo tenant's OWNER and writes nothing anywhere.
//
// WHAT IT ASSERTS, PER WIDTH — 5, DECLARED RATHER THAN COUNTED (gotchas 98)
//   bands/visible     at least 2 dividers are painted, each named Today / This month / All time, in that order, once each
//   bands/placement   every row sits under the divider its OWN stored date belongs to — the expected band is computed
//                     here, in Node, from the rows the database returned, not read back from the page's own helper
//   bands/one-scroll  scrolling the list's box once top to bottom brings at least 2 dividers into its viewport
//   no-new-filter     the only controls on the screen are the original two (Everything / Problems); a divider is not one
//   page/console      nothing on the console at this width
// 3 widths x 5 + 2 canaries = **17**, asserted as an equality.
//
// NOT COVERED: how the divider LOOKS beyond the screenshots in .manager-shots/3.1c/ (this check reads structure,
// not taste); the Problems view's dividers (same code path, not separately asserted).

import { createRequire } from "node:module";
import { mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { REPO, writeReceipt } from "./receipt.mjs";
import { demoOwner, demoOwnerEmail } from "./lib/demoOwner.mjs";

const { chromium } = createRequire(import.meta.url)("./../app/node_modules/playwright/index.js");
const BASE = process.env.BASE_URL || process.env.BASE || "http://localhost:5173";
const ART = join(REPO, ".manager-shots", "3.1c");
const BREAK = (process.argv.slice(2).find((a) => a.startsWith("--break=")) || "").split("=")[1] || null;

if (!process.env.SUPABASE_URL) {
  console.error("Missing SUPABASE_URL — run `set -a; . ./.env; set +a` first.");
  console.error("NOTHING WAS MEASURED. This is not a pass.");
  process.exit(2);
}

const SIZES = [{ w: 1440, h: 900 }, { w: 392, h: 844 }, { w: 320, h: 700 }];
const ORDER = ["Today", "This month", "All time"];
const EXPECTED_ASSERTIONS = SIZES.length * 5 + 2;

// PURE RULES, so a canary runs through the same code (gotchas 95).
const bandsVisible = (s) => s.labels.length >= 2
  && s.labels.every((l) => ORDER.includes(l))
  && new Set(s.labels).size === s.labels.length
  && s.labels.every((l, i) => i === 0 || ORDER.indexOf(l) > ORDER.indexOf(s.labels[i - 1]));
const noNewFilter = (s) => s.controls === 2;

// Independent of the page: the band a stored instant belongs in, in the business's time zone.
const day = (iso, tz) => new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));
const expectedBand = (iso, tz, now) => {
  const d = day(iso, tz), t = day(now, tz);
  return d === t ? "Today" : d.slice(0, 7) === t.slice(0, 7) ? "This month" : "All time";
};

function snapshot() {
  const box = document.querySelector("[data-mail-log] .mail-scroll");
  const vis = (e) => e.offsetHeight > 0 && getComputedStyle(e).visibility !== "hidden";
  const bands = [...box.querySelectorAll(".mail-band")].filter(vis);
  const seq = []; let cur = null;
  for (const el of box.querySelectorAll(".mail-band, .row-item")) {
    if (el.classList.contains("mail-band")) cur = vis(el) ? el.textContent.trim() : cur;
    else seq.push({ nm: el.querySelector(".nm").textContent, band: cur });
  }
  const thoughts = document.querySelector("[data-mail-log] .thoughts");
  const controls = [...thoughts.querySelectorAll("button, a, select, input, [role=radio], [role=tab]")]
    .filter((e) => !e.closest(".mail-scroll")).length;
  return { labels: bands.map((b) => b.textContent.trim()), seq, controls, inBands: box.querySelectorAll(".mail-band button, .mail-band a, .mail-band input").length };
}

async function run() {
  rmSync(ART, { recursive: true, force: true });
  mkdirSync(ART, { recursive: true });
  const failures = [], observed = [], canaries = [], sabotage = [];
  let assertions = 0;
  const ok = (cond, id, detail) => {
    assertions += 1; observed.push({ id, ok: !!cond, detail });
    if (!cond) failures.push(`${id} — ${detail}`);
    console.log(`${cond ? "  ok  " : "  FAIL"} ${id}  ${detail}`);
  };
  const browser = await chromium.launch();
  try {
    for (const { w, h } of SIZES) {
      const ctx = await browser.newContext({ viewport: { width: w, height: h } });
      const page = await ctx.newPage();
      const noise = [], served = [];
      page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") noise.push(m.text()); });
      page.on("pageerror", (e) => noise.push(String(e)));
      page.on("response", async (r) => {
        if (r.status() >= 400) noise.push(`HTTP ${r.status()} ${r.url()}`);
        if (r.url().includes("/rest/v1/email_sends") && r.request().method() === "GET") served.push(await r.json().catch(() => null));
      });
      // THE SEED'S 29 SENDS ALL FALL IN ONE BAND, so the answer is re-dated IN THE BROWSER (nothing is written):
      // 6 now, 12 a day ago, the rest 70 days ago — newest first, as the real query returns them.
      await page.route("**/rest/v1/email_sends*", async (route) => {
        if (route.request().method() !== "GET") return route.continue();
        const res = await route.fetch();
        const body = await res.json();
        const t0 = Date.now();
        const redated = Array.isArray(body) ? body.map((r, i) => ({ ...r,
          sent_at: new Date(t0 - (i < 6 ? 0 : i < 18 ? 86400000 : 70 * 86400000) - i * 1000).toISOString() })) : body;
        return route.fulfill({ response: res, json: redated });
      });
      await page.goto(`${BASE}/app`, { waitUntil: "domcontentloaded" });
      await page.waitForSelector("input[type=email]", { timeout: 30000 });
      await page.fill("input[type=email]", demoOwnerEmail);
      await page.fill("input[type=password]", demoOwner().password);
      await page.click("form button.btn.primary");
      await page.waitForSelector(".tabbar", { timeout: 30000 });
      await page.waitForSelector('[data-tour="gear"]', { timeout: 25000 });
      await page.click('[data-tour="gear"]');
      await page.waitForSelector('[data-settings-key="mail"]', { timeout: 20000 });
      await page.click('[data-settings-key="mail"]');
      await page.waitForSelector("[data-mail-log]", { timeout: 20000 });
      // ATTACHED, NEVER VISIBLE (gotchas 107).
      await page.waitForFunction(() => {
        const c = document.querySelector("[data-mail-log]");
        return !!c && !c.querySelector('.rows[aria-busy="true"]') && c.querySelectorAll(".row-item").length > 0;
      }, null, { timeout: 25000 });
      await page.waitForTimeout(600);

      if (BREAK) {
        if (BREAK !== "nobands") { console.error(`unknown --break=${BREAK}`); process.exit(2); }
        const n = () => page.evaluate(() => [...document.querySelectorAll(".mail-band")].filter((e) => e.offsetHeight > 0).length);
        const before = await n();
        await page.addStyleTag({ content: ".mail-band{display:none!important}" });
        const after = await n();
        sabotage.push({ width: w, break: BREAK, before, after, landed: before > 0 && after === 0 });
        if (!(before > 0 && after === 0)) { console.error(`SABOTAGE DID NOT LAND at ${w}: ${before} -> ${after}`); process.exit(2); }
      }

      const s = await page.evaluate(snapshot);
      const rows = served.at(-1);
      if (!Array.isArray(rows)) { console.error("NOTHING WAS MEASURED: no email_sends answer seen."); process.exit(2); }
      ok(bandsVisible(s), `${w}/bands/visible`, `painted dividers: ${JSON.stringify(s.labels)}`);

      // The demo tenant's zone (the page draws every date in it).
      const zone = process.env.DEMO_TZ || "America/Los_Angeles";
      const now = new Date().toISOString();
      const want = rows.map((r) => expectedBand(r.sent_at, zone, now));
      const got = s.seq.map((r) => r.band);
      const bad = want.findIndex((b, i) => b !== got[i]);
      const same = want.length === got.length && bad === -1;
      ok(same, `${w}/bands/placement`, `${want.length} rows, expected bands ${JSON.stringify([...new Set(want)])} in order; ${same ? "every row sits under its own band" : "MISMATCH at row " + bad}`);

      const seen = await page.evaluate(async () => {
        const box = document.querySelector("[data-mail-log] .mail-scroll");
        const set = new Set();
        const look = () => {
          const b = box.getBoundingClientRect();
          for (const el of box.querySelectorAll(".mail-band")) {
            const r = el.getBoundingClientRect();
            if (el.offsetHeight > 0 && r.bottom > b.top && r.top < b.bottom) set.add(el.textContent.trim());
          }
        };
        for (let y = 0; y <= box.scrollHeight; y += Math.max(40, box.clientHeight / 2)) {
          box.scrollTop = y;
          await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
          look();
        }
        box.scrollTop = 0;
        return [...set];
      });
      ok(seen.length >= 2, `${w}/bands/one-scroll`, `one pass down the box brought ${JSON.stringify(seen)} into view`);
      ok(noNewFilter(s) && s.inBands === 0, `${w}/no-new-filter`, `${s.controls} controls outside the list (the original two), ${s.inBands} inside dividers`);
      await page.screenshot({ path: join(ART, `groups-${w}.png`) });
      ok(noise.length === 0, `${w}/page/console`, noise.length ? noise.slice(0, 3).join(" | ") : "0 errors, 0 warnings");
      await ctx.close();
    }
    const c1 = bandsVisible({ labels: [] });
    canaries.push({ name: "the-undivided-list", flagged: !c1 });
    ok(!c1, "canary/the-undivided-list", "a list with no dividers must NOT read as grouped");
    const c2 = noNewFilter({ controls: 3 });
    canaries.push({ name: "the-added-filter", flagged: !c2 });
    ok(!c2, "canary/the-added-filter", "a third control on the screen must NOT read as 'no new filter'");
    if (assertions !== EXPECTED_ASSERTIONS) failures.push(`assertion count ${assertions} != declared ${EXPECTED_ASSERTIONS}`);
  } finally { await browser.close(); }

  const status = failures.length ? "fail" : "pass";
  const { path } = writeReceipt({
    check_id: "mail-log-groups",
    started_at: new Date(Date.now() - process.uptime() * 1000).toISOString(),
    status,
    expected_targets: SIZES.length, discovered_targets: SIZES.length, attempted_targets: SIZES.length,
    completed_targets: SIZES.length, skipped_targets: 0,
    assertions_executed: assertions, min_assertions: EXPECTED_ASSERTIONS,
    assertion_floor: "3 widths x 5 + 2 canaries = 17, asserted as an EQUALITY (docs/gotchas.md 98).",
    failures,
    warnings: ["NOT COVERED: how the divider looks (structure only; see the screenshots), and the Problems view's dividers."],
    artifacts: SIZES.map((s) => `.manager-shots/3.1c/groups-${s.w}.png`),
    dimensions: { sizes: SIZES.map((s) => `${s.w}x${s.h}`), business: "demo-detail", item: "3.1c", break: BREAK },
    canary: { id: canaries[0].name, observed_failure: canaries.every((c) => c.flagged) },
    canaries, unjudgeable: [], sabotage, observed,
  });
  console.log(`receipt: ${path}`);
  console.log(`\n${status.toUpperCase()} — ${assertions} assertions, ${failures.length} failed`);
  process.exit(failures.length ? 1 : 0);
}
run().catch((e) => { console.error(e); console.error("NOTHING WAS MEASURED. This is not a pass."); process.exit(2); });
