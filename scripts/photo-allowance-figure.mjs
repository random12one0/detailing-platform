// ROADMAP 7.6 — THE PHOTO ALLOWANCE THE BACK OFFICE PRINTS IS THE DATABASE'S,
// AND NO PAGE PROMISES "UNLIMITED" PHOTOS.
//
//   node scripts/photo-allowance-figure.mjs                 (dev server + .env)
//   node scripts/photo-allowance-figure.mjs --break=drift   the figure stops matching
//   node scripts/photo-allowance-figure.mjs --break=word    "Unlimited photos" on /pricing
//
// The done-when has two clauses and this asks both, at 1440 and 392:
//
//   1. The "Photo storage" line on System health prints `photo_total_bytes()`
//      and `photo_total_bytes() / photo_tenant_share()`, read from the database
//      by THIS script and compared against the words on the screen.
//   2. The page FOLLOWS the database rather than carrying a number of its own:
//      a second load answers with a different store (the old 1 GB) and the line
//      must move with it — and, because 1 GB is less than the 1.8 GB already
//      handed out, the over-promised sentence must appear. That is the refused
//      case: the screen saying out loud that the shares do not fit.
//   3. No page a detailer or customer reads says "unlimited" about photos:
//      home, /pricing, the demo booking page, and every back-office tab.
//
// **`--break=drift` IS THE ORIGINAL DEFECT**: the response's per-detailer
// figure is replaced with 1 GB / 100 while the database says 10 GB / 100 — a
// screen printing a number that is not the database's. Clause 1 must go red.
// **`--break=word`** puts the word back on /pricing; clause 3 must go red.
// One canary runs every time: the matcher is handed the old /pricing sentence
// and must catch it, and the current one and must not.
//
// It makes a throwaway platform admin for the run and drops it on every exit
// path, exactly as `admin-contrast.mjs` does (`docs/gotchas.md` 90). It writes
// nothing else and touches no demo-tenant row.

import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { writeReceipt, REPO } from "./receipt.mjs";
import { dropAdmin, makeAdmin } from "./admin-account.mjs";
import { watchConsole } from "./lib/bookingWalk.mjs";
import { mb } from "../app/src/lib/photo-rules.js";
import "../tests/_env.mjs";

const { chromium } = createRequire(import.meta.url)("./../app/node_modules/playwright/index.js");
const started_at = new Date().toISOString();
const BREAK = (process.argv.find((a) => a.startsWith("--break=")) || "").split("=")[1] || process.env.BREAK || "";
const BASE = process.env.BASE || "http://localhost:5173";
const URL_ = process.env.SUPABASE_URL, KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_?.includes("kguqylyzgyzfktkfnhjb")) { console.error("not this platform's project — refusing"); process.exit(1); }
const ADMIN_EMAIL = "photo-allowance-test@detailplatform.com";  // mail-sink: a login; autoconfirm is on and no custom SMTP, so no mail
const SIZES = [{ w: 1440, h: 900 }, { w: 392, h: 844 }];
const PUBLIC = ["/", "/pricing", "/book/demo-detail"];
// Per width: real line 2, moved line 2, over-promised 1, back office word 1,
// public word 3, console 1.
const PER_WIDTH = 10;
const ART = "artifacts/photo-allowance-figure";
mkdirSync(path.join(REPO, ART), { recursive: true });

let assertions = 0;
const failures = [], artifacts = [], noise = [];
const check = (label, name, ok, detail = "") => {
  assertions++;
  if (!ok) failures.push(`${label} ${name}${detail ? " — " + detail : ""}`);
  console.log(`  ${ok ? "ok  " : "FAIL"} ${label} ${name}${detail ? " — " + detail : ""}`);
};

// "Unlimited" within one sentence of "photo", either order.
const PROMISES_UNLIMITED_PHOTOS = (t) => /unlimited[^.]{0,80}photo|photo[^.]{0,80}unlimited/i.test(t);
const canaryCaught = PROMISES_UNLIMITED_PHOTOS("Unlimited services, bookings and photos")
  && !PROMISES_UNLIMITED_PHOTOS("Unlimited services, bookings and staff logins");

// ── THE DATABASE'S OWN ANSWER ───────────────────────────────────────────────
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };
const rpc = async (fn) => {
  const r = await fetch(`${URL_}/rest/v1/rpc/${fn}`, { method: "POST", headers: H, body: "{}" });
  if (!r.ok) throw new Error(`${fn}: ${r.status}`);
  return Number(await r.json());
};
const total = await rpc("photo_total_bytes"), share = await rpc("photo_tenant_share");
const each = Math.floor(total / share);  // bigint / int in SQL: integer division
console.log(`database: photo_total_bytes() ${total} / photo_tenant_share() ${share} = ${each} → "${mb(total)}", "${mb(each)}"`);
// The store the page is shown on the second load: the old free-tier total.
const OLD_TOTAL = 1024 ** 3, OLD_EACH = Math.floor(OLD_TOTAL / share);

// ── THE THROWAWAY ADMIN, DROPPED ON EVERY PATH ──────────────────────────────
const acct = await makeAdmin(URL_, KEY, ADMIN_EMAIL);
if (!acct) { console.error("no admin account"); process.exit(1); }
const redact = (t) => String(t).split(acct.password).join("[password]");
let browser, tornDown = false;
async function teardown(why) {
  if (tornDown) return;
  tornDown = true;
  await dropAdmin(URL_, KEY, acct.id);
  console.log(`test admin dropped (${why})`);
  try { await browser?.close(); } catch { /* closing anyway */ }
}
for (const sig of ["SIGINT", "SIGTERM", "SIGBREAK"]) {
  process.on(sig, async () => { console.error(`${sig} received; dropping the test admin`); await teardown(sig); process.exit(sig === "SIGINT" ? 130 : 143); });
}

// Rewrites `photo_store` in the platform-admin answer; counts that it ran.
async function rewriteStore(ctx, edit) {
  const seen = { n: 0 };
  await ctx.route("**/functions/v1/platform-admin", async (route) => {
    const res = await route.fetch();
    const body = await res.json().catch(() => null);
    if (body?.photo_store) { edit(body.photo_store); seen.n++; }
    await route.fulfill({ response: res, json: body });
  });
  return seen;
}

async function backOffice(ctx, label) {
  const page = await ctx.newPage();
  watchConsole(page, label, noise);
  await page.goto(`${BASE}/admin`, { waitUntil: "domcontentloaded" });
  await page.fill("input[type=email]", acct.email);
  await page.fill("input[type=password]", acct.password);
  await page.click("form button.pa-btn");
  await page.waitForSelector(".pa-tab", { timeout: 15000 });
  await page.waitForTimeout(1500);
  // Every tab's words, for clause 3; System health last, for the line.
  let words = "";
  for (const name of ["Today", "Growth", "Money", "Detailers", "System health"]) {
    await page.getByRole("tab", { name }).click();
    await page.waitForTimeout(1200);
    words += " " + await page.evaluate(() => document.body.textContent);
  }
  const line = await page.locator(".pa-svc-r", { hasText: "Photo storage" }).first().textContent({ timeout: 8000 }).catch(() => "");
  return { page, line: line.replace(/\s+/g, " "), words };
}

let ran = 0, crashed = null;
try {
  browser = await chromium.launch();
  for (const { w, h } of SIZES) {
    const label = `${w}`;
    console.log(`\n${w}x${h}`);

    // 1. As the database says — unless `--break=drift` reproduces the defect.
    const ctxA = await browser.newContext({ viewport: { width: w, height: h } });
    if (BREAK === "drift") await rewriteStore(ctxA, (s) => { s.share_bytes = OLD_EACH; });
    const real = await backOffice(ctxA, `${label} real`);
    const shot = `${ART}/system-health-${w}.png`;
    await real.page.locator(".pa-svc-r", { hasText: "Photo storage" }).first().screenshot({ path: path.join(REPO, shot) }).catch(() => {});
    artifacts.push(shot);
    console.log(`  line: ${real.line}`);
    check(label, "prints the database's total", real.line.includes(`of ${mb(total)}`), `want "of ${mb(total)}"`);
    check(label, "prints the database's per-detailer share", real.line.includes(`${mb(each)} promised to each`), `want "${mb(each)} promised to each"`);
    check(label, "back office never says unlimited photos", !PROMISES_UNLIMITED_PHOTOS(real.words));
    await ctxA.close();

    // 2. The store changes; the screen must follow, and say it is over-promised.
    const ctxB = await browser.newContext({ viewport: { width: w, height: h } });
    let committed = 0;
    const seen = await rewriteStore(ctxB, (s) => { s.total_bytes = OLD_TOTAL; s.share_bytes = OLD_EACH; committed = s.committed_bytes; });
    const moved = await backOffice(ctxB, `${label} moved`);
    console.log(`  moved line (${seen.n} answers rewritten, committed ${committed}): ${moved.line}`);
    check(label, "follows a changed total", seen.n > 0 && moved.line.includes(`of ${mb(OLD_TOTAL)}`), `want "of ${mb(OLD_TOTAL)}"`);
    check(label, "follows a changed share", seen.n > 0 && moved.line.includes(`${mb(OLD_EACH)} promised to each`), `want "${mb(OLD_EACH)} promised to each"`);
    check(label, "says over-promised when shares exceed the store",
      committed > OLD_TOTAL ? moved.line.includes(`PROMISED ${mb(committed)}, which is more than exists.`) : false,
      `committed ${mb(committed)} against ${mb(OLD_TOTAL)}`);
    await ctxB.close();

    // 3. The public pages.
    const ctxC = await browser.newContext({ viewport: { width: w, height: h } });
    const pub = await ctxC.newPage();
    watchConsole(pub, `${label} public`, noise);
    for (const p of PUBLIC) {
      await pub.goto(`${BASE}${p}`, { waitUntil: "domcontentloaded" });
      await pub.waitForTimeout(2000);
      if (BREAK === "word" && p === "/pricing") {
        await pub.evaluate(() => { const li = document.createElement("li"); li.textContent = "Unlimited photos"; (document.querySelector("ul.incl") || document.body).append(li); });
      }
      const text = await pub.evaluate(() => document.body.textContent);
      check(label, `${p} never says unlimited photos`, text.length > 200 && !PROMISES_UNLIMITED_PHOTOS(text), `${text.length} chars read`);
    }
    await ctxC.close();

    const mine = noise.filter((n) => n.startsWith(label + " "));
    check(label, "console clean", mine.length === 0, mine.slice(0, 3).join(" | "));
    ran++;
  }
} catch (e) {
  crashed = e;
} finally {
  await teardown("finished or threw");
}
if (crashed) console.error(redact(String(crashed.message || crashed).split("\n")[0]).slice(0, 300));

const expected = SIZES.length * PER_WIDTH;
const okRun = !crashed && failures.length === 0 && canaryCaught && assertions === expected;
console.log(`\ncanary old-pricing-sentence: ${canaryCaught ? "caught" : "MISSED"}`);
console.log(`${assertions} assertions (declared ${expected}), ${failures.length} failed${BREAK ? `, --break=${BREAK}` : ""}`);
const { path: rp, receipt } = writeReceipt({
  check_id: "photo-allowance-figure", started_at, status: okRun ? "pass" : "fail",
  expected_targets: SIZES.length, discovered_targets: ran, attempted_targets: ran, completed_targets: ran, skipped_targets: 0,
  assertions_executed: assertions, min_assertions: expected - 1,
  failures: crashed ? [...failures, "crashed: " + redact(crashed.message).slice(0, 200)] : failures, warnings: noise, artifacts,
  dimensions: { sizes: SIZES.map((s) => `${s.w}x${s.h}`), break: BREAK || null, total_bytes: total, tenant_share: share, each_bytes: each, public: PUBLIC },
  canary: { id: "old-pricing-sentence", observed_failure: canaryCaught },
});
console.log("receipt: " + path.relative(REPO, rp) + " (" + receipt.status + ")");
await new Promise((r) => setTimeout(r, 150));  // let sockets close before exit on Windows
process.exit(okRun ? 0 : 1);
