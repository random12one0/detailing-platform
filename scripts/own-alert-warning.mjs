// ROADMAP 3.4f S3 — the warning when the detailer's OWN alert address is not
// receiving, proved in a browser on Today and on Notifications.
//
//   node scripts/own-alert-warning.mjs                  # dev server + seed + DEMO_OWNER_PW
//   node scripts/own-alert-warning.mjs --break=never    # sabotage: the bounced row never arrives, so the warning must go missing
//   node scripts/own-alert-warning.mjs --break=always   # sabotage: delivered/failed rows read as bounced, so the absences must fail
//
// The newest row per alert address is answered in the browser (`route.fulfill`,
// never `route.fetch` — gotchas 113), so nothing is written to the database and
// no email is sent. ONE case is not answered: the demo tenant's real rows,
// read through the real query. Its alert address is `demo@example.com`, a
// reserved domain, so every alert to it is stored `skipped` / "that address
// cannot receive email" (F6) — the warning is TRUE there, and the run says so.
//
// Per width it asks: on Today the box is shown for a bounced address, names
// it, fits the width, and its "Fix this" button is a 44px target nothing is
// covering; pressing it opens Notifications, which shows its own warning with
// the main-address remedy; a later delivered email clears both screens; a
// `failed` row (cannot tell their address from our outage) draws nothing on
// either; the real F6 rows draw it; and the console is clean. One canary runs
// every time: the grader is handed readings with no box and must fail them.
import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { writeReceipt, REPO } from "./receipt.mjs";
import { settle, watchConsole } from "./lib/bookingWalk.mjs";
import { demoOwner } from "./lib/demoOwner.mjs";
import "../tests/_env.mjs";

const { chromium } = createRequire(import.meta.url)("./../app/node_modules/playwright/index.js");
const started_at = new Date().toISOString();
const BREAK = (process.argv.find((a) => a.startsWith("--break=")) || "").split("=")[1] || process.env.BREAK || "";
const BASE = process.env.BASE || "http://localhost:5173";
const OWNER = demoOwner();
const SIZES = [{ w: 1440, h: 900 }, { w: 392, h: 844 }, { w: 320, h: 844 }];
const PER_WIDTH = 12;
const ART = "artifacts/own-alert-warning";
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

const URL_ = process.env.SUPABASE_URL;
if (!URL_?.includes("kguqylyzgyzfktkfnhjb")) { console.error("not this platform's project — refusing"); process.exit(1); }

// The newest-row query the hook makes: one address, no booking.
const OWN_ROW = /\/rest\/v1\/email_sends\?(?!.*booking_id=)(?=.*to_email=eq\.).*limit=1/;

/** The box on whichever screen is up. */
const READ = () => {
  const el = document.querySelector("[data-own-alerts]");
  if (!el) return { shown: false };
  const r = el.getBoundingClientRect();
  const btn = el.querySelector(".actions button");
  let hit = null;
  if (btn) {
    btn.scrollIntoView({ block: "center" });
    const b = btn.getBoundingClientRect();
    const at = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2);
    hit = { ok: !!at && (at === btn || btn.contains(at)), h: Math.round(b.height) };
  }
  return { shown: r.height > 0, text: el.textContent.trim(), right: r.right, left: r.left, vw: innerWidth,
    sw: document.documentElement.scrollWidth, hit };
};

export function gradeToday(label, failed, email) {
  check(label, "today/bounced/shown", !!failed.shown, "the box is on Today");
  check(label, "today/bounced/names-address", !!failed.shown && failed.text.includes(email), failed.text ?? "nothing drawn");
  check(label, "today/bounced/fits", !!failed.shown && failed.left >= 0 && failed.right <= failed.vw && failed.sw <= failed.vw,
    failed.shown ? `box ${Math.round(failed.left)}–${Math.round(failed.right)}, page ${failed.sw} of ${failed.vw}` : "nothing to measure");
  check(label, "today/fix-this/pressable-44", !!failed.hit?.ok && failed.hit.h >= 44,
    failed.hit ? `hit ${failed.hit.ok}, ${failed.hit.h}px` : "no button");
}
export function gradeNotif(label, notif, email) {
  check(label, "notifications/bounced/shown", !!notif.shown, "the box is on Notifications after Fix this");
  check(label, "notifications/bounced/main-remedy", !!notif.shown && notif.text.includes(email) && notif.text.includes("Business info"),
    notif.text ?? "nothing drawn");
}

const browser = await chromium.launch();
let signedIn = null;

/** Sign in once, then each case is its own context so each answer is the only one it saw. */
async function open(size, answer, where = "/app") {
  const label = `${size.w}x${size.h}`;
  const ctx = await browser.newContext({ viewport: { width: size.w, height: size.h }, storageState: signedIn || undefined });
  const page = await ctx.newPage();
  const mine = [];
  watchConsole(page, label, mine);
  let served = 0;
  if (answer) await page.route(OWN_ROW, (route) => {
    served++;
    const to = decodeURIComponent(route.request().url().match(/to_email=eq\.([^&]+)/)[1]);
    return route.fulfill({ status: 200, contentType: "application/json",
      json: [{ to_email: to, status: answer, detail: answer === "bounced" ? "mailbox does not exist" : null }] });
  });
  let real = 0;
  page.on("response", (r) => { if (OWN_ROW.test(r.url())) real++; });
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
  await page.goto(`${BASE}${where}`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".tabbar", { timeout: 30000 });
  // An ABSENCE only means something once the question was answered.
  const t0 = Date.now();
  while ((answer ? served : real) < 1 && Date.now() - t0 < 15000) await page.waitForTimeout(100);
  await page.waitForLoadState("networkidle").catch(() => {});
  await settle(page);
  return { ctx, page, label, asked: (answer ? served : real) >= 1, mine };
}

/** Console lines minus the ONE designed 404 per gear load (gotchas 120). */
const clean = (lines, gearLoads) => {
  let allowed = gearLoads;
  return lines.filter((l) => !(/status of 404/.test(l) && allowed-- > 0));
};

const DEMO = "demo@example.com";
for (const size of SIZES) {
  const label = `${size.w}x${size.h}`;
  const consoleLines = [];

  // 1. Bounced → Today box → Fix this → Notifications box.
  let o = await open(size, BREAK === "never" ? "delivered" : "bounced");
  const today = await o.page.evaluate(READ);
  await o.page.screenshot({ path: path.join(REPO, ART, `${label}-today-bounced.png`) });
  artifacts.push(`${ART}/${label}-today-bounced.png`);
  let notif = { shown: false };
  if (today.shown) {
    await o.page.locator("[data-own-alerts] .actions button").click();
    await o.page.getByText("Where your alerts go").first().waitFor({ timeout: 15000 }).catch(() => {});
    await o.page.waitForSelector("[data-own-alerts]", { timeout: 10000 }).catch(() => {});
    await settle(o.page);
    notif = await o.page.evaluate(READ);
    await o.page.locator("[data-own-alerts]").first().scrollIntoViewIfNeeded().catch(() => {});
    await o.page.screenshot({ path: path.join(REPO, ART, `${label}-notifications-bounced.png`) });
    artifacts.push(`${ART}/${label}-notifications-bounced.png`);
  }
  gradeToday(label, today, DEMO);
  gradeNotif(label, notif, DEMO);
  consoleLines.push(...clean(o.mine, today.shown ? 1 : 0));
  await o.ctx.close();

  // 2. A later delivered email, and 3. a `failed` row: nothing on either screen.
  for (const [status, name] of [["delivered", "delivered-later"], ["failed", "failed-not-judged"]]) {
    const answer = BREAK === "always" ? "bounced" : status;
    o = await open(size, answer);
    const t = await o.page.evaluate(READ);
    check(label, `today/${name}/absent`, o.asked && !t.shown, o.asked ? (t.text ?? "") : "the row was never asked for");
    consoleLines.push(...o.mine);
    await o.ctx.close();
    o = await open(size, answer, "/app?settings=notifications");
    await o.page.getByText("Where your alerts go").first().waitFor({ timeout: 15000 }).catch(() => {});
    const n = await o.page.evaluate(READ);
    check(label, `notifications/${name}/absent`, o.asked && !n.shown, o.asked ? (n.text ?? "") : "the row was never asked for");
    consoleLines.push(...clean(o.mine, 1));
    await o.ctx.close();
  }

  // 4. The demo tenant's REAL rows, through the real query (F6).
  o = await open(size, null);
  const live = await o.page.evaluate(READ);
  check(label, "today/live-f6/shown", o.asked && !!live.shown && live.text.includes(DEMO),
    o.asked ? (live.text ?? "nothing drawn") : "the real query never ran");
  consoleLines.push(...o.mine);
  await o.ctx.close();

  check(label, "console/clean", consoleLines.length === 0, consoleLines.join(" | "));
  noise.push(...consoleLines);
}
await browser.close();

// The canary: readings with no box must fail both graders.
const keep = { a: assertions, f: failures.length };
gradeToday("canary", { shown: false }, DEMO);
gradeNotif("canary", { shown: false }, DEMO);
const canaryCaught = failures.length >= keep.f + 6;
failures.splice(keep.f);
assertions = keep.a;

const expected = SIZES.length * PER_WIDTH;
const lines = [`${assertions} assertions (declared ${expected}), ${failures.length} failed`, ...failures,
  `canary the-missing-box: ${canaryCaught ? "caught" : "MISSED"}`, ...noise.map((n) => "console: " + n)];
console.log(lines.join("\n"));
const txt = `${ART}/report${BREAK ? ".sabotage" : ""}.txt`;
writeFileSync(path.join(REPO, txt), lines.join("\n") + "\n");
artifacts.push(txt);
const okRun = failures.length === 0 && canaryCaught && assertions === expected;
const { path: rp, receipt } = writeReceipt({
  check_id: "own-alert-warning", started_at, status: okRun ? "pass" : "fail",
  expected_targets: SIZES.length, discovered_targets: SIZES.length, attempted_targets: SIZES.length,
  completed_targets: SIZES.length, skipped_targets: 0,
  assertions_executed: assertions, min_assertions: expected,
  assertion_floor: "every width runs the same twelve checks unconditionally, so the count is 12 per width or the run stopped; okRun separately requires the exact declared total",
  failures, warnings: [], artifacts,
  dimensions: { sizes: SIZES.map((s) => `${s.w}x${s.h}`), break: BREAK || null },
  canary: { id: "the-missing-box", observed_failure: canaryCaught },
});
console.log("receipt: " + path.relative(REPO, rp) + " (" + receipt.status + ")");
process.exit(okRun ? 0 : 1);
