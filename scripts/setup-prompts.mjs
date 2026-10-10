// ARE THE TOURS GONE, AND IS WHAT REPLACED THEM HONEST? — ROADMAP 9.15.
//
//   node scripts/setup-prompts.mjs
//   node scripts/setup-prompts.mjs --break=nostep      # sabotage: a prompt stops naming its step
//
// Dev server + the seeded demo tenant + `.env` loaded (`set -a; . ./.env; set +a`).
//
// 9.15's done-when has three clauses, all pressed at 320 first:
//   no-tour        no tour card or backdrop appears on its own, on any tab, in a
//                  browser that has never been shown around (no flags set), and
//                  the gear has no "Show me around" row.
//   names-a-step   every prompt that remains names ONE unfinished setup step and
//                  its control lands on THAT step: the setup form opens, and its
//                  heading is the question of the step the prompt named.
//   silent-when-done  a business with nothing unfinished sees no prompt at all:
//                  no Today notice, no "Next:" row on Business.
//
// THREE BUSINESSES, ONE ROW, AND WHAT IS REAL. `incomplete` is the demo tenant as
// it is. `collapsed` and `complete` are the SAME demo tenant with the one
// `business_settings` READ rewritten in the browser (`setup.done` all twelve keys
// for `complete`; `todayCollapsed` for `collapsed`). Rewriting a read proves the
// screen is right for that answer; it does not prove a real account reaches it.
// Nothing is WRITTEN: every non-GET to `business_settings` is swallowed, because
// closing the setup form upserts `setup`, and with the read patched that would
// have written the patched `done` list into the real row. That is recorded in the
// receipt as UNJUDGEABLE rather than folded into the pass.

import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { REPO, writeReceipt } from "./receipt.mjs";
import { demoOwner } from "./lib/demoOwner.mjs";
import { STEPS } from "../app/src/lib/setup.js";

const { chromium } = createRequire(import.meta.url)("./../app/node_modules/playwright/index.js");
const BASE = process.env.BASE_URL || "http://localhost:5173";
const ART = join(REPO, "artifacts", "setup-prompts");
const BREAK = (process.argv.find((a) => a.startsWith("--break=")) || "").split("=")[1] || null;
const OWNER = demoOwner();
const SIZES = [{ w: 320, h: 844 }, { w: 1440, h: 900 }];   // 320 first
const VARIANTS = ["incomplete", "collapsed", "complete"];
const ALL_KEYS = STEPS.map(([k]) => k);
// The three sentences Today leads with when a step stops a booking. They are the
// only prompts that are not named by a step's short name.
const BLOCKER = [[/hours/i, "hours"], [/service/i, "catalog"], [/reach you/i, "info"]];

const failures = [], observed = [], consoleBad = [];
let assertions = 0;
const check = (id, name, cond, detail) => {
  assertions++;
  if (cond) { console.log(`    ok      ${name}  ${id}`); return true; }
  failures.push(`${id}: ${name} — ${detail}`);
  console.error(`    FAIL    ${name}  ${id} — ${detail}`);
  return false;
};

/** which step a piece of prompt text names, or null */
const stepNamed = (text) => {
  const t = text.replace(/^Next:\s*/, "").trim();
  const byName = STEPS.find(([, , short]) => short === t);
  if (byName) return byName[0];
  return (BLOCKER.find(([re]) => re.test(t)) || [])[1] ?? null;
};

async function open(browser, size, variant, id) {
  const ctx = await browser.newContext({ viewport: { width: size.w, height: size.h } });
  const page = await ctx.newPage();
  page.on("console", (m) => {
    if (["error", "warning"].includes(m.type())) consoleBad.push(`${id}: ${m.type()}: ${m.text().slice(0, 160)}`);
  });
  // THE DEMO OWNER ALREADY HAS A `user_tours` ROW (they once pressed Skip), and the old shell read it
  // and silenced every guide for them. Refusing that read puts the browser where a NEW detailer is,
  // which is the only place a tour that is still wired up would show itself.
  await page.route(/\/rest\/v1\/user_tours/, (route) => route.abort());
  // never a write to business_settings (see the header), and the one read rewritten
  await page.route(/\/rest\/v1\/business_settings/, async (route) => {
    const req = route.request();
    if (req.method() !== "GET") return route.fulfill({ status: 204, body: "" });
    if (variant === "incomplete") return route.continue();
    const res = await route.fetch();
    const patch = (row) => {
      const setup = { ...(row.setup ?? {}), seen: true };
      if (variant === "complete") setup.done = ALL_KEYS;
      if (variant === "collapsed") { setup.todayCollapsed = true; setup.todayCollapsedFor = ALL_KEYS; }
      return { ...row, setup };
    };
    const j = await res.json();
    await route.fulfill({ response: res, json: Array.isArray(j) ? j.map(patch) : patch(j) });
  });
  await page.goto(`${BASE}/app`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("input[type=email], .tabbar", { timeout: 30000 });
  if (await page.locator("input[type=email]").count()) {
    await page.fill("input[type=email]", OWNER.email);
    await page.fill("input[type=password]", OWNER.password);
    await page.click("form button.btn.primary");
    await page.waitForSelector(".tabbar", { timeout: 30000 });
  }
  await page.waitForTimeout(3000);
  return { ctx, page };
}

const tourOnScreen = (page) => page.locator(".tourblock, .tourcard").count();
const readNotice = (page) => page.evaluate(() => {
  const n = document.querySelector('[data-tour="setup-notice"]');
  if (!n) return null;
  // `.nudge-link` / `.actions button` are the controls; Hide and the fold's summary are not prompts
  return {
    text: n.innerText,
    prompts: [...n.querySelectorAll("button.nudge-link, .actions button")]
      .map((b) => b.innerText.trim()).filter((s) => s && !/^(Hide|Show)$/.test(s)),
  };
});

/** press a prompt by its text and read the heading of the form it opens */
async function pressPrompt(page, text) {
  const btn = page.locator('[data-tour="setup-notice"] button', { hasText: text }).first();
  await btn.click();
  await page.waitForSelector(".setupform h2.title", { timeout: 8000 }).catch(() => {});
  const h = await page.locator(".setupform h2.title").first().innerText().catch(() => null);
  return h;
}

async function run() {
  mkdirSync(ART, { recursive: true });
  const browser = await chromium.launch();
  let promptsPressed = 0;

  for (const size of SIZES) {
    for (const variant of VARIANTS) {
      const id = `${size.w}px ${variant}`;
      const { ctx, page } = await open(browser, size, variant, id);
      const complete = variant === "complete";

      // ── no-tour: every tab, in a browser nobody has shown around ─────────
      let tours = await tourOnScreen(page);
      for (const key of ["calendar", "money", "clients", "business", "today"]) {
        await page.locator(`.tabbar button[data-tour="${key}"]`).first().dispatchEvent("click");   // not .click(): a tour backdrop would swallow a real press and hide itself as a timeout
        await page.waitForTimeout(1600);   // the old guide armed itself 900ms after a tab press
        tours += await tourOnScreen(page);
      }
      check(id, "no-tour/tabs", tours === 0, `${tours} tour card(s) or backdrop(s) appeared on their own`);

      // ── names-a-step / silent-when-done, on Today ────────────────────────
      const notice = await readNotice(page);
      await page.screenshot({ path: join(ART, `${size.w}-${variant}-today.png`) });
      if (complete) {
        check(id, "silent-when-done/today", notice === null,
          `the Today notice is on screen for a business with nothing unfinished: "${notice?.text.replace(/\s+/g, " ").slice(0, 80)}"`);
      } else if (check(id, "prompt-present/today", notice !== null && notice.prompts.length > 0,
        "a business with unfinished steps shows no prompt, or a prompt with nothing to press")) {
        // the fold hides the cosmetic ones until it is opened
        await page.locator('[data-tour="setup-notice"] summary').first().click().catch(() => {});
        const open_ = await readNotice(page);
        let prompts = open_.prompts;
        if (BREAK === "nostep" && prompts[0]) prompts = ["Your page isn't fully set up", ...prompts.slice(1)];
        observed.push(`${id}: today prompts = ${JSON.stringify(prompts)}`);
        for (const p of prompts) {
          // the folded line names its step in the sentence and carries a "Continue" button
          const named = p === "Continue" ? open_.text.split("\n")[0] : p;
          const key = stepNamed(named);
          if (!check(id, `names-a-step/today "${named.slice(0, 40)}"`, key !== null,
            "the prompt's words match no setup step")) continue;
          // a fresh page per press: the form covers Today, and closing it writes nothing (swallowed)
          await page.goto(`${BASE}/app`, { waitUntil: "domcontentloaded" });
          await page.waitForSelector('[data-tour="setup-notice"]', { timeout: 15000 });
          await page.locator('[data-tour="setup-notice"] summary').first().click().catch(() => {});
          const heading = await pressPrompt(page, p);
          promptsPressed++;
          const want = STEPS.find(([k]) => k === key)[1];
          check(id, `goes-straight-to-it/today "${p.slice(0, 40)}"`, heading === want,
            `pressed it and the form opened on ${heading === null ? "NOTHING" : `"${heading}"`}, not "${want}"`);
        }
      }

      // ── the Business tab's own row ───────────────────────────────────────
      await page.goto(`${BASE}/app`, { waitUntil: "domcontentloaded" });
      await page.waitForSelector(".tabbar", { timeout: 20000 });
      await page.locator('.tabbar button[data-tour="business"]').first().click();
      await page.waitForTimeout(2500);
      const row = page.locator('[data-tour="setup"] button.nav-row');
      const rows = await row.count();
      if (complete) {
        check(id, "silent-when-done/business", rows === 0, `a "Next:" row is on Business for a finished business`);
      } else {
        if (check(id, "prompt-present/business", rows === 1, `${rows} "Next:" rows on Business`)) {
          const name = (await row.locator(".name").innerText()).trim();
          const key = stepNamed(name);
          check(id, "names-a-step/business", key !== null, `"${name}" matches no setup step`);
          // Business names the step by its QUESTION ("Next: What sizes are your vehicles?")
          const byQuestion = STEPS.find(([k]) => k === key);
          await row.click();
          await page.waitForSelector(".setupform h2.title", { timeout: 8000 }).catch(() => {});
          const heading = await page.locator(".setupform h2.title").first().innerText().catch(() => null);
          promptsPressed++;
          check(id, "goes-straight-to-it/business", !!byQuestion && heading === byQuestion[1],
            `row "${name}" opened ${heading === null ? "NOTHING" : `"${heading}"`}`);
        }
      }

      // ── the gear: no door back into a tour ───────────────────────────────
      await page.goto(`${BASE}/app`, { waitUntil: "domcontentloaded" });
      await page.waitForSelector(".tabbar", { timeout: 20000 });
      await page.getByRole("button", { name: "Settings", exact: true }).first().click();
      await page.waitForTimeout(1400);
      const gearText = await page.evaluate(() => document.body.innerText);
      const rowCount = await page.locator(".nav-row").count();
      check(id, "no-tour/gear", rowCount > 3 && !/Show me around|Quick tours/i.test(gearText),
        rowCount > 3 ? "the gear still offers a tour" : `the gear opened ${rowCount} rows, so the absence means nothing`);
      await ctx.close();
    }
  }

  // ── canary: the detectors must be able to go red ───────────────────────
  const canaryProblems = [];
  {
    const ctx = await browser.newContext({ viewport: { width: 320, height: 844 } });
    const page = await ctx.newPage();
    await page.setContent('<div class="tourblock"><div class="tourcard"></div></div>');
    assertions++;
    const seen = await tourOnScreen(page);
    if (seen < 1) canaryProblems.push("CANARY MISSED: a tour card was injected and the detector counted 0");
    console.log(`  canary a-tour-card: detector counted ${seen}`);
    assertions++;
    const unnamed = stepNamed("Your page isn't fully set up");
    if (unnamed !== null) canaryProblems.push(`CANARY MISSED: a generic sentence matched step "${unnamed}"`);
    console.log(`  canary a-prompt-naming-nothing: matched ${unnamed}`);
    await ctx.close();
  }
  await browser.close();

  const uniq = [...new Set(consoleBad)];
  for (const c of uniq) failures.push(`console — ${c}`);

  const targets = SIZES.length * VARIANTS.length;
  const { path, receipt } = writeReceipt({
    check_id: "setup-prompts",
    started_at: new Date(Date.now() - process.uptime() * 1000).toISOString(),
    status: (failures.length || canaryProblems.length || promptsPressed < 8) ? "fail" : "pass",
    expected_targets: targets,
    discovered_targets: targets,
    attempted_targets: targets,
    completed_targets: targets,
    skipped_targets: 0,
    assertions_executed: assertions,
    min_assertions: 20,
    assertion_floor: "2 widths x 3 variants, each at least no-tour/tabs + no-tour/gear + one Today clause + one Business clause = 24 minimum "
      + "before per-prompt presses; 20 is the floor because a variant that opens no prompts books its clause as a failure rather than dropping out.",
    failures: [...failures, ...(promptsPressed < 8 ? [`only ${promptsPressed} prompt(s) were pressed; the incomplete runs must press at least 8 across both widths`] : []), ...canaryProblems],
    warnings: [
      "UNJUDGEABLE: `collapsed` and `complete` are the demo tenant with ONE business_settings read rewritten in the browser. "
      + "A real finished business was not available (the fixture business is in first-run), so 'silent when done' is proved for the screen's logic, not for an account that really got there.",
      "Every non-GET to business_settings is swallowed so the rewritten `done` list is never written to the real row.",
    ],
    artifacts: SIZES.flatMap((s) => VARIANTS.map((v) => `artifacts/setup-prompts/${s.w}-${v}-today.png`)),
    dimensions: { sizes: SIZES.map((s) => `${s.w}x${s.h}`), variants: VARIANTS, observed, prompts_pressed: promptsPressed, break: BREAK },
    canary: { id: "a-tour-card", observed_failure: canaryProblems.length === 0, problems: canaryProblems },
  });
  for (const o of observed) console.log("  " + o);
  const all = [...failures, ...canaryProblems];
  console.log(all.length ? `FAIL  setup-prompts — ${all.length} finding(s)` : `PASS  setup-prompts — ${targets} targets, ${assertions} assertions, ${promptsPressed} prompts pressed`);
  for (const f of all) console.log("  · " + f);
  console.log("receipt: " + path.replace(REPO + "\\", "").replace(REPO + "/", ""));
  process.exit(all.length ? 1 : 0);
}

run().catch((e) => {
  console.error("setup-prompts could not run: " + e.message);
  console.error("NOTHING WAS MEASURED. This is not a pass.");
  process.exit(2);
});
