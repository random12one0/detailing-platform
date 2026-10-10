// ROADMAP 3.4e — THE CLIENT RECORD'S RED "THIS ADDRESS BOUNCED" LINE: DOES IT
// SHOW FOR A FLAGGED CUSTOMER, AND STAY AWAY FROM ONE WHO IS NOT?
//
//   node scripts/bounced-line.mjs
//   node scripts/bounced-line.mjs --break=noflag   # sabotage: nobody is flagged, so the line must go missing
//   node scripts/bounced-line.mjs --break=always   # sabotage: everybody is flagged, so the clean record must show it
//
// Needs the dev server, the seed, and `.env` loaded (`set -a; . ./.env; set +a`)
// for the demo owner's sign-in. WRITES NOTHING: the flag is put on the
// `customers` response inside the browser, never on the table.
//
// `docs/email-failure-recovery.md` § 3 names this line as today's only signal
// that comes with an instruction (F1, F2). Nothing measured it before: no
// script or test in this repo contained its sentence. Two real customers are
// taken off the top of the list — the first is flagged, the second is
// explicitly cleared — and each record is opened at 1440, 392 and 320.
//
// ASKS, PER WIDTH (4, declared): the flagged record shows the sentence; it is
// painted in the fixed red (`--bad`) and not transparent; it sits inside the
// viewport's width; the clean record does NOT show it. Plus the console, read
// at every width. One canary runs every time: the grader is handed an
// observation with no line and must fail it.

import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
import { writeFileSync } from "node:fs";
import path from "node:path";
import { writeReceipt, REPO } from "./receipt.mjs";
import { settle, watchConsole } from "./lib/bookingWalk.mjs";
import { demoOwner } from "./lib/demoOwner.mjs";

const { chromium } = createRequire(import.meta.url)("./../app/node_modules/playwright/index.js");
const started_at = new Date().toISOString();
const BREAK = (process.argv.find((a) => a.startsWith("--break=")) || "").split("=")[1] || process.env.BREAK || "";
const BASE = process.env.BASE || "http://localhost:5173";
const OWNER = demoOwner();
const SIZES = [{ w: 1440, h: 900 }, { w: 392, h: 844 }, { w: 320, h: 844 }];
const PER_WIDTH = 5; // four questions + the console
const SENTENCE = "This address bounced. The last email to it was refused, so check it with them or call instead.";
const ART = "artifacts/bounced-line";
mkdirSync(path.join(REPO, ART), { recursive: true });

let assertions = 0;
const failures = [];
const artifacts = [];
const noise = [];
const check = (label, name, ok, detail = "") => {
  assertions++;
  if (!ok) failures.push(`${label} ${name}${detail ? " — " + detail : ""}`);
  console.log(`  ${ok ? "ok  " : "FAIL"} ${label} ${name}${detail ? " — " + detail : ""}`);
};

/** One record's reading. Pure input for the grader. */
const READ = (sentence) => {
  const p = [...document.querySelectorAll("p")].find((e) => e.textContent.trim() === sentence);
  if (!p) return { shown: false };
  const cs = getComputedStyle(p), r = p.getBoundingClientRect();
  const probe = document.createElement("span");
  probe.style.color = "var(--bad)";
  document.body.appendChild(probe);
  const bad = getComputedStyle(probe).color;
  probe.remove();
  return { shown: r.height > 0, color: cs.color, bad, opacity: Number(cs.opacity), right: r.right, vw: innerWidth };
};

export function grade(label, flagged, clean) {
  check(label, "flagged/shown", !!flagged.shown, "the sentence is on the flagged record");
  check(label, "flagged/red", flagged.shown && flagged.color === flagged.bad && flagged.opacity > 0.5,
    flagged.shown ? `${flagged.color} vs --bad ${flagged.bad}, opacity ${flagged.opacity}` : "nothing to measure");
  check(label, "flagged/fits", flagged.shown && flagged.right <= flagged.vw, flagged.shown ? `right ${Math.round(flagged.right)} of ${flagged.vw}` : "nothing to measure");
  check(label, "clean/absent", !clean.shown, "the sentence is not on the clean record");
}

const browser = await chromium.launch();
let signedIn = null;
let pick = null; // { flag: {id,name}, clean: {id,name} }

async function open(size) {
  const label = `${size.w}x${size.h}`;
  const ctx = await browser.newContext({ viewport: { width: size.w, height: size.h }, storageState: signedIn || undefined });
  const page = await ctx.newPage();
  watchConsole(page, label, noise);
  let seen = [];
  await page.route(/\/rest\/v1\/customers\?/, async (route) => {
    const res = await route.fetch();
    let body = null;
    try { body = await res.json(); } catch { /* not JSON */ }
    if (!Array.isArray(body)) { await route.fulfill({ response: res }); return; }
    seen = body;
    const rows = body.map((c) => {
      const flag = BREAK === "always" ? !!c.email : BREAK === "noflag" ? false : c.id === pick?.flag.id;
      return pick || BREAK === "always"
        ? { ...c, email_failed_at: flag ? "2026-10-10T05:00:00Z" : null, email_failed_reason: flag ? "mailbox does not exist" : null }
        : c;
    });
    await route.fulfill({ response: res, json: rows });
  });
  await page.goto(`${BASE}/app`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("input[type=email], .tabbar", { timeout: 30000 });
  if (await page.locator("input[type=email]").count()) {
    await page.fill("input[type=email]", OWNER.email);
    await page.fill("input[type=password]", OWNER.password);
    await page.click("form button.btn.primary");
    await page.waitForSelector(".tabbar", { timeout: 30000 });
    signedIn = await ctx.storageState();
  }
  await page.evaluate(() => {
    try {
      localStorage.setItem("dp.tours", JSON.stringify(["shell", "today", "calendar", "money", "clients", "business"]));
      localStorage.setItem("dp.tour", "1");
    } catch { /* private mode */ }
  });
  await page.goto(`${BASE}/app/clients`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".rows.cols.clients .row-item", { timeout: 30000 });
  await settle(page);
  return { ctx, page, label, seen: () => seen };
}

async function readRecord(page, name) {
  await page.locator(".rows.cols.clients .row-item").filter({ hasText: name }).first().click();
  await page.waitForSelector(`a[href^="tel:"]`, { timeout: 15000 });
  await settle(page);
  return page.evaluate(READ, SENTENCE);
}

// 1. choose two real customers with an email, off the top of the list
{
  const { ctx, page, seen } = await open(SIZES[0]);
  const names = await page.locator(".rows.cols.clients .row-item .c-who").allTextContents();
  const byName = (n) => seen().filter((c) => c.name === n.trim());
  const usable = names.map((n) => byName(n)).filter((m) => m.length === 1 && m[0].email).map((m) => m[0]);
  if (usable.length >= 2) pick = { flag: usable[0], clean: usable[1] };
  await ctx.close();
}
check("setup", "two real customers with an email", !!pick, pick ? `${pick.flag.name} / ${pick.clean.name}` : "found fewer than two");

// 2. per width
if (pick) for (const size of SIZES) {
  const { ctx, page, label } = await open(size);
  const before = noise.length;
  const flagged = await readRecord(page, pick.flag.name);
  await page.screenshot({ path: path.join(REPO, ART, `${label}-flagged.png`) });
  artifacts.push(`${ART}/${label}-flagged.png`);
  await page.goto(`${BASE}/app/clients`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".rows.cols.clients .row-item", { timeout: 30000 });
  await settle(page);
  const clean = await readRecord(page, pick.clean.name);
  await page.screenshot({ path: path.join(REPO, ART, `${label}-clean.png`) });
  artifacts.push(`${ART}/${label}-clean.png`);
  grade(label, flagged, clean);
  check(label, "console/clean", noise.length === before, noise.slice(before).join(" | "));
  await ctx.close();
}
await browser.close();

// 3. the canary: an observation with no line must fail the grader
const keep = { a: assertions, f: failures.length };
grade("canary", { shown: false }, { shown: false });
const canaryCaught = failures.length > keep.f;
failures.splice(keep.f);
assertions = keep.a;

const expected = SIZES.length * PER_WIDTH + 1;
const lines = [`${assertions} assertions (declared ${expected}), ${failures.length} failed`, ...failures,
  `canary the-missing-line: ${canaryCaught ? "caught" : "MISSED"}`, ...noise.map((n) => "console: " + n)];
console.log(lines.join("\n"));
const txt = `${ART}/report${BREAK ? ".sabotage" : ""}.txt`;
writeFileSync(path.join(REPO, txt), lines.join("\n") + "\n");
artifacts.push(txt);
const okRun = failures.length === 0 && canaryCaught && assertions === expected;
const { path: rp, receipt } = writeReceipt({
  check_id: "bounced-line", started_at, status: okRun ? "pass" : "fail",
  expected_targets: SIZES.length, discovered_targets: pick ? SIZES.length : 0,
  attempted_targets: pick ? SIZES.length : 0, completed_targets: pick ? SIZES.length : 0, skipped_targets: 0,
  assertions_executed: assertions, min_assertions: expected - 1,
  failures, warnings: [], artifacts,
  dimensions: { sizes: SIZES.map((s) => `${s.w}x${s.h}`), break: BREAK || null,
    flagged: pick?.flag.name ?? null, clean: pick?.clean.name ?? null },
  canary: { id: "the-missing-line", observed_failure: canaryCaught },
});
console.log("receipt: " + path.relative(REPO, rp) + " (" + receipt.status + ")");
process.exit(okRun ? 0 : 1);
