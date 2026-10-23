// ROADMAP 9.12a plan step 4 — the new back office's System place, in a real
// browser, at 1440, 768, 390 and 320.
//
//   node scripts/office-system.mjs            (dev server on :5173, credentials in .env)
//   node scripts/office-system.mjs --lite     (the ?lite=1 reduced-motion path)
//   node scripts/office-system.mjs --break=blind
//
// FOUR PASSES PER WIDTH. LIVE reads the real platform and asks what does not
// depend on its state: System is the fourth place, there is one check per
// scheduled job (one "Scheduled jobs" line if none) plus six, every check says
// when it was last checked, everything not working is in "Needs a look" and
// nothing working is, and the badge equals the broken count. Then `list` is
// answered through page.route() (nothing written) three ways: TROUBLE (a stopped
// job, a never-reported job, no outside watcher, email near its limit): the badge
// is 1, not 4, the stopped job is first and "2 of 8 working"; EMPTY (no job has
// ever reported): a loud "Scheduled jobs" line, never an all-clear; QUIET (all
// fine): only the two unwired checks are loud, and there is no badge.
//
// THE CANARY pushes one node label onto another (the overlap inspector must name
// it) and marks a quiet-list row broken without putting it in "Needs a look" (the
// agreement rule must name it). `--break=blind` blinds the overlap inspector,
// which must turn the canary red; the receipt then lands in .sabotage.json.
//
// Signs in as a THROWAWAY platform admin, created here and deleted in a finally
// (scripts/admin-account.mjs). Do not wrap in `timeout` (docs/gotchas.md 90).

import "../tests/_env.mjs";
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
import { writeReceipt } from "./receipt.mjs";
import { settle, watchConsole } from "./lib/bookingWalk.mjs";
import { dropAdmin, makeAdmin } from "./admin-account.mjs";

const { chromium } = createRequire(import.meta.url)("./../app/node_modules/playwright/index.js");

const started_at = new Date().toISOString();
const BREAK = (process.argv.find((a) => a.startsWith("--break=")) || "").split("=")[1] || "";
const BASE = process.env.BASE || "http://localhost:5173";
const LITE = process.argv.includes("--lite");
const ADMIN_EMAIL = "office-system-test@detailplatform.com";  // mail-sink: a login made by makeAdmin; autoconfirm is on and no custom SMTP, so no mail
const SIZES = [{ w: 1440, h: 900 }, { w: 768, h: 1024 }, { w: 390, h: 844 }, { w: 320, h: 720 }];
const ART = "artifacts/office-system";
const SHOTS = "C:/Users/rando/Downloads/claude/belt/shots/9.12a";
const URL_ = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_ || !KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY — nothing measured, no receipt written.");
  process.exit(1);
}
if (!URL_.includes("kguqylyzgyzfktkfnhjb")) {
  console.error("SUPABASE_URL is not project kguqylyzgyzfktkfnhjb — refusing to run.");
  process.exit(1);
}

let assertions = 0;
const failures = [];
const consoleNoise = [];
const artifacts = [];
const observed = {};
const check = (where, name, cond, detail = "") => {
  assertions++;
  if (cond) { console.log(`    ok    ${name}`); return; }
  failures.push(`${where}: ${name} ${detail}`.trim());
  console.error(`    FAIL  ${name}  ${detail}`);
};

const EXPLAINERS = ["Checked every 5 minutes", "Quiet when everything works", "Things only show up here", "Each square is one live site", "The quiet list"];

const INSPECT = (blind) => {
  const out = { overlaps: [], clipped: [], overflowX: false, explainers: [], phoneLinks: 0 };
  out.overflowX = document.documentElement.scrollWidth > window.innerWidth + 1;
  const root = document.querySelector(".bo-system");
  const text = root?.innerText ?? "";
  out.explainers = EXPLAINERS_IN_PAGE.filter((s) => text.includes(s));
  out.phoneLinks = root ? root.querySelectorAll('a[href^="tel:"], a[href^="sms:"]').length : 0;
  const hit = (a, b) => Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1;
  const R = (el) => el.getBoundingClientRect();
  const seen = (el) => R(el).width > 0 && getComputedStyle(el).display !== "none";
  const nodes = [...document.querySelectorAll(".bo-node")];
  const groups = [
    [...document.querySelectorAll(".bo-node-l"), ...document.querySelectorAll(".bo-core-t")],
    [...document.querySelectorAll(".bo-calmrow > *")],
    [...document.querySelectorAll(".bo-sys-hero > *")],
    [...document.querySelectorAll(".bo-system > .bo-sec")],
    ...[...document.querySelectorAll(".bo-loud li, .bo-checks li, .bo-checks li > div, .bo-gauge, .bo-gauges")].map((n) => [...n.children]),
  ];
  if (!blind) {
    for (const g of groups) {
      const els = g.filter(seen);
      for (let i = 0; i < els.length; i++) for (let j = i + 1; j < els.length; j++) {
        if (hit(R(els[i]), R(els[j]))) out.overlaps.push(`${els[i].className?.baseVal ?? els[i].className}:${els[i].textContent.slice(0, 14)} x ${els[j].className?.baseVal ?? els[j].className}:${els[j].textContent.slice(0, 14)}`);
      }
    }
    // A node's label must not sit on another node's dot.
    for (const l of document.querySelectorAll(".bo-node-l")) for (const n of nodes) {
      if (n.contains(l)) continue;
      const dot = n.querySelector("circle:not(.bo-node-ring)");
      if (dot && hit(R(l), R(dot))) out.overlaps.push(`label ${l.textContent} on the dot of ${n.dataset.check}`);
    }
  }
  for (const l of document.querySelectorAll(".bo-node-l")) {
    const r = R(l);
    if (r.left < 0 || r.right > window.innerWidth) out.clipped.push(`node label off screen: ${l.textContent}`);
    if (r.height < 9) out.clipped.push(`node label under 9px tall: ${l.textContent} (${r.height.toFixed(1)})`);
  }
  out.clipped.push(...[...document.querySelectorAll(".bo-loud b, .bo-loud em, .bo-loud time, .bo-checks b, .bo-checks time, .bo-gauge-n b, .bo-big")]
    .filter((e) => seen(e) && e.scrollWidth > e.clientWidth + 1).map((e) => `runs out of its box: ${e.textContent.slice(0, 30)}`));
  return out;
};
const inspect = (page, blind = false) => page.evaluate(`(() => { const EXPLAINERS_IN_PAGE = ${JSON.stringify(EXPLAINERS)}; return (${INSPECT.toString()})(${blind}); })()`);

// THE AGREEMENT RULE: what the quiet list calls not-working is exactly what
// "Needs a look" lists, every row says when, and the badge is the broken count.
const agree = (page) => page.evaluate(() => {
  const rows = [...document.querySelectorAll(".bo-checks li")].map((li) => ({ key: li.dataset.check, ok: li.classList.contains("ok"), bad: li.classList.contains("bad"), t: li.querySelector("time")?.innerText.trim() ?? "" }));
  const loud = [...document.querySelectorAll(".bo-loud li")].map((li) => li.dataset.check);
  const want = rows.filter((r) => !r.ok).map((r) => r.key);
  const out = [];
  if ([...want].sort().join() !== [...loud].sort().join()) out.push(`not-working ${want.join("/")} but Needs a look lists ${loud.join("/")}`);
  if (rows.some((r) => !r.t)) out.push("a check with no time");
  const nav = [...document.querySelectorAll(".bo-nav")].find((b) => /System/.test(b.innerText));
  const badge = Number(nav?.querySelector(".cnt")?.innerText ?? 0);
  const bad = rows.filter((r) => r.bad).length;
  if (badge !== bad) out.push(`badge ${badge}, broken ${bad}`);
  return out.join("; ");
});

const ago = (m) => new Date(Date.now() - m * 60000).toISOString();
const TROUBLE = (j) => ({
  ...j,
  heartbeats: [
    { job: "send-owner-reminders", ran_at: ago(40), stale_after_seconds: 900, detail: {} },
    { job: "accrue-plan-visits", ran_at: ago(1), stale_after_seconds: 86400, detail: { seeded: true } },
    { job: "restore-drill", ran_at: ago(60 * 24 * 4), detail: { tables: 51, accounts: 30 } },
  ],
  watch: { outside: false },
  email: { sent: 86, cap: 100, failed: 0, refused_platform: 0, owner_email: "owner@example.com" },
  photo_store: { used_bytes: 3 * 1024 ** 3, total_bytes: 10 * 1024 ** 3, committed_bytes: 1024 ** 3 },
});
const EMPTY = (j) => ({ ...TROUBLE(j), heartbeats: [] });
const QUIET = (j) => ({
  ...TROUBLE(j),
  heartbeats: [
    { job: "send-owner-reminders", ran_at: ago(3), stale_after_seconds: 900, detail: {} },
    { job: "restore-drill", ran_at: ago(60 * 24 * 4), detail: { tables: 51, accounts: 30 } },
  ],
  watch: { outside: true },
  email: { sent: 12, cap: 100, failed: 0, refused_platform: 0, owner_email: "owner@example.com" },
});

const H = { apikey: KEY, Authorization: `Bearer ${KEY}` };
const all = await (await fetch(`${URL_}/auth/v1/admin/users?per_page=1000`, { headers: H })).json().catch(() => ({}));
const left = (all.users ?? []).find((u) => u.email === ADMIN_EMAIL);
if (left) { await dropAdmin(URL_, KEY, left.id); console.log("deleted a leftover throwaway admin first"); }
console.log(`writing: one throwaway platform admin on ${new URL(URL_).host}, removed when this run ends`);
const acct = await makeAdmin(URL_, KEY, ADMIN_EMAIL);
if (!acct) { console.error("could not create the throwaway admin; nothing measured"); process.exit(1); }
const redact = (t) => String(t).split(acct.password).join("[password]");

let browser = null;
let signedIn = null;
const canary = { id: "pushed-node-label-and-unlisted-broken-row", observed_failure: true };
let completed = 0, liveBeats = null;
mkdirSync(ART, { recursive: true });
// about:blank first: the same URL with only a #hash would not reload the page.
const openSystem = async (page) => {
  await page.goto("about:blank");
  await page.goto(`${BASE}/admin${LITE ? "?lite=1" : ""}#system`, { waitUntil: "domcontentloaded" });
  // 9.12d folds "Every check" at arrival: open it, so the questions below measure the list a reader opens.
  await page.waitForSelector(".bo-system .bo-checks li", { timeout: 60000, state: "attached" });
  await page.locator('section[aria-label="Every check"] summary').click();
  await settle(page, 2000);
};
const texts = (page, sel) => page.locator(sel).evaluateAll((els) => els.map((e) => e.dataset.check));
try {
  browser = await chromium.launch();
  for (const size of SIZES) {
    const where = `${size.w}${LITE ? " lite" : ""}`;
    console.log(`\n${where}`);
    const ctx = await browser.newContext({ viewport: { width: size.w, height: size.h }, storageState: signedIn || undefined });
    const page = await ctx.newPage();
    watchConsole(page, where, consoleNoise);
    let list = null;
    page.on("response", async (res) => {
      if (!res.url().includes("/functions/v1/platform-admin") || res.request().method() !== "POST") return;
      try { const j = await res.json(); if (j?.rows) list = j; } catch { /* not one we read */ }
    });
    if (!signedIn) {
      await page.goto(`${BASE}/admin`, { waitUntil: "domcontentloaded" });
      await page.waitForSelector("input[type=email]", { timeout: 40000 });
      await page.fill("input[type=email]", acct.email);
      await page.fill("input[type=password]", acct.password);
      await page.click("form button[type=submit]");
      await page.waitForSelector(".bo-rail", { timeout: 40000 });
      signedIn = await ctx.storageState();
    }

    // ── LIVE PASS ───────────────────────────────────────────────────────────
    await openSystem(page);
    check(where, "System is the fourth place", (await page.locator(".bo-nav").nth(3).innerText()).replace(/\d+/g, "").trim() === "System"
      && (await page.locator("h1.bo-place").getAttribute("aria-label")) === "System");
    const jobs = (list?.heartbeats ?? []).filter((h) => h.job !== "restore-drill").length;
    liveBeats = jobs;
    const n = await page.locator(".bo-checks li").count();
    check(where, `one check per scheduled job plus six (${Math.max(jobs, 1) + 6})`, n === Math.max(jobs, 1) + 6, `drew ${n}`);
    const okN = await page.locator(".bo-checks li.ok").count();
    await page.waitForFunction((want) => new RegExp(`^${want} of`).test(document.querySelector("[data-testid=working]")?.innerText.trim()), okN, { timeout: 5000 }).catch(() => {});
    check(where, `the big figure is ${okN} of ${n} working`, (await page.locator("[data-testid=working]").innerText()).replace(/\s+/g, " ").trim() === `${okN} of ${n} working`);
    check(where, "one node per check in the chart", (await page.locator(".bo-node").count()) === n);
    let a = await agree(page);
    check(where, "Needs a look lists exactly what is not working, every check says when, badge = broken", a === "", a);
    let o = await inspect(page);
    observed[`${where} live`] = o;
    check(where, "no sideways overflow", !o.overflowX);
    check(where, "nothing overlaps", o.overlaps.length === 0, o.overlaps.slice(0, 3).join(" | "));
    check(where, "nothing runs outside its box or off screen", o.clipped.length === 0, o.clipped.slice(0, 3).join(" | "));
    check(where, "none of the mockup's explanation lines is on the page", o.explainers.length === 0, o.explainers.join(" | "));
    check(where, "no Text or Call link anywhere on System", o.phoneLinks === 0);
    await page.screenshot({ path: `${ART}/live-${size.w}.png`, fullPage: true }); artifacts.push(`${ART}/live-${size.w}.png`);

    // ── FED PASSES ──────────────────────────────────────────────────────────
    let feed = TROUBLE;
    await page.route("**/functions/v1/platform-admin", async (route) => {
      const body = JSON.parse(route.request().postData() || "{}");
      if (body.action !== "list") return route.continue();
      const res = await route.fetch();
      const j = await res.json();
      await route.fulfill({ response: res, json: feed(j) });
    });
    await openSystem(page);
    const loud = await texts(page, ".bo-loud li");
    check(where, "trouble: the stopped job is first in Needs a look, then email near its limit, then the never-proven ones",
      loud.join(",") === "job:send-owner-reminders,email,job:accrue-plan-visits,watch,stripe,netlify", loud.join(","));
    const nav = page.locator(".bo-nav").nth(3);
    check(where, "trouble: the System badge is 1 (broken only), not 6", (await nav.locator(".cnt").innerText()).trim() === "1");
    await page.waitForFunction(() => /^2 of/.test(document.querySelector("[data-testid=working]")?.innerText.trim()), null, { timeout: 5000 }).catch(() => {});
    check(where, "trouble: 2 of 8 working", (await page.locator("[data-testid=working]").innerText()).replace(/\s+/g, " ").trim() === "2 of 8 working");
    check(where, "trouble: the stopped job says how late it is and when it last ran",
      /Has not finished in 40 min\. It runs every 15 min/.test(await page.locator('.bo-loud li[data-check="job:send-owner-reminders"]').innerText())
      && /checked 40 min ago/.test(await page.locator('.bo-loud li[data-check="job:send-owner-reminders"] time').innerText()));
    check(where, "trouble: the never-reported job says never checked, not a time",
      (await page.locator('.bo-loud li[data-check="job:accrue-plan-visits"] time').innerText()).trim() === "never checked");
    check(where, "trouble: the pulse and the core turn red", (await page.locator(".bo-pulse.bad").count()) === 1 && (await page.locator(".bo-core.bad").count()) === 1);
    check(where, "trouble: email dial reads 86 of 100", /86\s*sent/.test(await page.locator("[data-testid=email] .bo-gauge-n b").innerText().catch(() => ""))
      || await page.waitForFunction(() => /86/.test(document.querySelector("[data-testid=email] .bo-gauge-n b").innerText), null, { timeout: 4000 }).then(() => true, () => false));
    a = await agree(page);
    check(where, "trouble: Needs a look and the quiet list agree, badge = broken", a === "", a);
    o = await inspect(page);
    observed[`${where} trouble`] = o;
    check(where, "trouble: no overlap, nothing clipped, no sideways overflow", o.overlaps.length === 0 && o.clipped.length === 0 && !o.overflowX, [...o.overlaps, ...o.clipped].slice(0, 3).join(" | "));
    await page.screenshot({ path: `${ART}/trouble-${size.w}.png`, fullPage: true }); artifacts.push(`${ART}/trouble-${size.w}.png`);

    if (size.w === SIZES[0].w) {
      // CANARY 1 (overlap): one node label pushed onto its neighbor must be named.
      const before = (await inspect(page, BREAK === "blind")).overlaps.length;
      await page.evaluate(() => { const ls = document.querySelectorAll(".bo-node-l"); ls[1].dataset.was = ls[1].getAttribute("x") + "," + ls[1].getAttribute("y"); ls[1].setAttribute("x", ls[0].getAttribute("x")); ls[1].setAttribute("y", ls[0].getAttribute("y")); ls[1].setAttribute("text-anchor", ls[0].getAttribute("text-anchor")); ls[1].dataset.canary = "1"; });
      const after = (await inspect(page, BREAK === "blind")).overlaps.length;
      canary.overlap = `overlaps ${before} -> ${after}`;
      canary.observed_failure = canary.observed_failure && after > before;
      console.log(`    canary (overlap) ${after > before ? "CAUGHT" : "MISSED"}: ${canary.overlap}`);
      // CANARY 2 (agreement): a working row marked broken but left out of Needs a look.
      await page.evaluate(() => { const li = document.querySelector(".bo-checks li.ok"); li.classList.replace("ok", "bad"); li.dataset.canary = "1"; });
      const c = await agree(page);
      canary.agree = c || "(nothing named)";
      canary.observed_failure = canary.observed_failure && c !== "";
      console.log(`    canary (agree) ${c ? "CAUGHT" : "MISSED"}: ${canary.agree}`);
      await openSystem(page);
      if (!LITE && !BREAK) {
        const { freeze } = await import("file:///C:/Users/rando/Downloads/claude/belt/freeze.mjs");
        await freeze(page, {
          out: `${SHOTS}/after-system.html`, label: "After",
          note: "System: how many checks are working, a chart of every check, and only what is broken or never proven standing out, each with when it was last checked. Shown with one stopped job fed in.",
          highlight: ".bo-loud",
        });
        artifacts.push(`${SHOTS}/after-system.html`);
      }
    }

    feed = EMPTY;
    await openSystem(page);
    const e = await texts(page, ".bo-loud li");
    check(where, "empty: no job reporting is a loud 'Scheduled jobs' line, never an all-clear", e.includes("job:none") && !(await page.locator(".bo-checks li.ok[data-check^=job]").count()), e.join(","));
    a = await agree(page);
    check(where, "empty: the lists agree", a === "", a);

    feed = QUIET;
    await openSystem(page);
    const q = await texts(page, ".bo-loud li");
    check(where, "quiet: only the two unwired checks stand out", q.join(",") === "stripe,netlify", q.join(","));
    check(where, "quiet: no badge on System", (await nav.locator(".cnt").count()) === 0);
    check(where, "quiet: the pulse is green", (await page.locator(".bo-pulse.bad").count()) === 0);
    o = await inspect(page);
    check(where, "quiet: no overlap, nothing clipped, no sideways overflow", o.overlaps.length === 0 && o.clipped.length === 0 && !o.overflowX, [...o.overlaps, ...o.clipped].slice(0, 3).join(" | "));
    await page.screenshot({ path: `${ART}/quiet-${size.w}.png`, fullPage: true }); artifacts.push(`${ART}/quiet-${size.w}.png`);

    completed++;
    await ctx.close();
  }
} catch (e) {
  failures.push(`run stopped: ${redact(e.message)}`);
  console.error(redact(e.stack || e.message));
} finally {
  await browser?.close();
  await dropAdmin(URL_, KEY, acct.id);
  console.log("throwaway admin deleted");
}

for (const c of consoleNoise) failures.push(`console: ${redact(c)}`);
const status = failures.length === 0 && completed === SIZES.length && canary.observed_failure ? "pass" : "fail";
const { path } = writeReceipt({
  check_id: `office-system${LITE ? "-lite" : ""}`,
  started_at,
  status,
  expected_targets: SIZES.length,
  discovered_targets: SIZES.length,
  attempted_targets: SIZES.length,
  completed_targets: completed,
  skipped_targets: 0,
  assertions_executed: assertions,
  min_assertions: SIZES.length * 25,
  assertion_floor: "4 widths x 25 questions (live 10, trouble 9, empty 2, quiet 4) = 100, all fixed by the code; none is conditional on what the live platform holds.",
  failures,
  artifacts,
  canary,
  warnings: [
    `Reads the LIVE platform (${liveBeats} scheduled job heartbeats on it); the trouble, empty and quiet cases answer list through page.route(); nothing is written to the database.`,
    "Signs in as a throwaway platform admin created and deleted by this run.",
    "The look itself (color, glow, motion) is not judged here; the screenshots are the evidence for that.",
    ...(BREAK ? [`run with --break=${BREAK}; this receipt is a sabotage, not a result`] : []),
  ],
  dimensions: { sizes: SIZES.map((s) => `${s.w}x${s.h}`), lite: LITE, ...(BREAK && { break: BREAK }), observed },
});
console.log(`\n${status.toUpperCase()} — ${assertions} assertions, ${failures.length} failed, canary ${canary.observed_failure ? "caught" : "MISSED"} → ${path}`);
process.exit(status === "pass" ? 0 : 1);
