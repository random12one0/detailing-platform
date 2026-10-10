// ROADMAP 3.4f — the job record's "email did not arrive" line (S1) and the
// "Booking confirmed" text (D1), proved in a browser.
//
//   node scripts/job-mail-warning.mjs                 # dev server + seed + DEMO_OWNER_PW
//   node scripts/job-mail-warning.mjs --break=never   # sabotage: no failed row ever arrives, so the line must go missing
//   node scripts/job-mail-warning.mjs --break=stale   # sabotage: the later good email is ignored, so the cleared job must still show it
//
// The newest email row ABOUT THIS BOOKING is answered in the browser
// (`route.fulfill`, never `route.fetch`, so nothing is cached from the real
// server — gotchas 113). Nothing is written to the database and no email is
// sent. Per width it asks: the line is on an upcoming job whose last email
// bounced, it is red, it fits, it sits in the pinned bar above Call; it is
// gone once a later email to the same address was delivered; it is gone on a
// job whose day has passed; the Text sheet offers "Booking confirmed"; and the
// console is clean. One canary runs every time: the grader is handed a reading
// with no line and must fail it.
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
const PER_WIDTH = 8; // six questions about the line, one about the text, the console
const ART = "artifacts/job-mail-warning";
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

// Two real demo jobs with an email: one today or later, one already past.
const URL_ = process.env.SUPABASE_URL, KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_?.includes("kguqylyzgyzfktkfnhjb")) { console.error("not this platform's project — refusing"); process.exit(1); }
const rest = async (q) => (await fetch(`${URL_}/rest/v1/${q}`, { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } })).json();
const [biz] = await rest("businesses?select=id,timezone&slug=eq.demo-detail");
// `bookings` stores `start_at`; `booking_date` is derived in the browser
// (`useBookings`). Upcoming = starts after now; past = started two days ago or more.
const twoDaysAgo = new Date(Date.now() - 2 * 864e5).toISOString();
const pickJob = async (op, at, order) => (await rest(
  `bookings?select=id,start_at,customer_email&business_id=eq.${biz?.id}&customer_email=not.is.null&deleted_at=is.null` +
  `&status=in.(confirmed,pending)&start_at=${op}.${at}&order=start_at.${order}&limit=1`))[0];
const upcoming = biz && await pickJob("gte", new Date().toISOString(), "asc");
const past = biz && await pickJob("lt", twoDaysAgo, "desc");
check("setup", "an upcoming and a past demo job with an email", !!(upcoming && past),
  `${upcoming?.start_at ?? "none"} / ${past?.start_at ?? "none"}`);

/** One record's reading of the line. */
const READ = () => {
  const el = document.querySelector(".jobbar [data-mail-warning]");
  if (!el) return { shown: false };
  const cs = getComputedStyle(el), r = el.getBoundingClientRect();
  const probe = document.createElement("span");
  probe.style.color = "var(--bad)";
  document.body.appendChild(probe);
  const bad = getComputedStyle(probe).color;
  probe.remove();
  const call = document.querySelector('.jobbar a[href^="tel:"]')?.getBoundingClientRect();
  return { shown: r.height > 0, text: el.textContent.trim(), color: cs.color, bad,
    right: r.right, vw: innerWidth, aboveCall: !!call && r.bottom <= call.top + 0.5 };
};

export function grade(label, failed, cleared, done, email) {
  check(label, "bounced/shown", !!failed.shown, "the line is on the upcoming job");
  check(label, "bounced/names-address", failed.shown && failed.text.includes(email), failed.text ?? "nothing drawn");
  check(label, "bounced/red", failed.shown && failed.color === failed.bad, failed.shown ? `${failed.color} vs --bad ${failed.bad}` : "nothing to measure");
  check(label, "bounced/fits-above-call", failed.shown && failed.right <= failed.vw && failed.aboveCall,
    failed.shown ? `right ${Math.round(failed.right)} of ${failed.vw}, above Call ${failed.aboveCall}` : "nothing to measure");
  check(label, "delivered-later/absent", !cleared.shown, cleared.text ?? "");
  check(label, "past-job/absent", !done.shown, done.text ?? "");
}

const browser = await chromium.launch();
let signedIn = null;

async function openJob(size, job, status) {
  const label = `${size.w}x${size.h}`;
  const ctx = await browser.newContext({ viewport: { width: size.w, height: size.h }, storageState: signedIn || undefined });
  const page = await ctx.newPage();
  watchConsole(page, label, noise);
  await page.route(/\/rest\/v1\/email_sends\?.*booking_id=eq\./, (route) =>
    route.fulfill({ status: 200, contentType: "application/json",
      json: status ? [{ status, detail: status === "bounced" ? "mailbox does not exist" : null }] : [] }));
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
  // One context per job, so each fulfilled answer is the only one it ever saw.
  await page.goto(`${BASE}/job/${job.id}`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".jobbar a[href^='tel:']", { timeout: 30000 });
  await page.waitForLoadState("networkidle").catch(() => {});
  await settle(page);
  return { ctx, page, label };
}

if (upcoming && past) for (const size of SIZES) {
  const before = noise.length;
  const label = `${size.w}x${size.h}`;
  let o = await openJob(size, upcoming, BREAK === "never" ? null : "bounced");
  const failed = await o.page.evaluate(READ);
  await o.page.screenshot({ path: path.join(REPO, ART, `${label}-bounced.png`) });
  artifacts.push(`${ART}/${label}-bounced.png`);
  // D1 — the Text sheet offers the new template, whether or not the business row exists yet.
  await o.page.locator(".jobbar button", { hasText: "Text" }).first().click();
  await o.page.waitForSelector(".sheet .card.tappable", { timeout: 15000 }).catch(() => {});
  await settle(o.page);
  const offered = await o.page.locator(".sheet .card.tappable .strong").allTextContents();
  await o.page.screenshot({ path: path.join(REPO, ART, `${label}-text-sheet.png`) });
  artifacts.push(`${ART}/${label}-text-sheet.png`);
  await o.ctx.close();

  o = await openJob(size, upcoming, BREAK === "stale" ? "bounced" : "delivered");
  const cleared = await o.page.evaluate(READ);
  await o.ctx.close();
  o = await openJob(size, past, "bounced");
  const done = await o.page.evaluate(READ);
  await o.ctx.close();

  grade(label, failed, cleared, done, upcoming.customer_email);
  check(label, "text-sheet/booking-confirmed", offered.includes("Booking confirmed"), offered.join(" | ") || "no cards");
  check(label, "console/clean", noise.length === before, noise.slice(before).join(" | "));
}
await browser.close();

// The canary: a reading with no line must fail the grader.
const keep = { a: assertions, f: failures.length };
grade("canary", { shown: false }, { shown: false }, { shown: false }, "x");
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
const ran = upcoming && past ? SIZES.length : 0;
const { path: rp, receipt } = writeReceipt({
  check_id: "job-mail-warning", started_at, status: okRun ? "pass" : "fail",
  expected_targets: SIZES.length, discovered_targets: ran, attempted_targets: ran, completed_targets: ran, skipped_targets: 0,
  assertions_executed: assertions, min_assertions: expected - 1,
  failures, warnings: [], artifacts,
  dimensions: { sizes: SIZES.map((s) => `${s.w}x${s.h}`), break: BREAK || null,
    upcoming: upcoming?.start_at ?? null, past: past?.start_at ?? null },
  canary: { id: "the-missing-line", observed_failure: canaryCaught },
});
console.log("receipt: " + path.relative(REPO, rp) + " (" + receipt.status + ")");
process.exit(okRun ? 0 : 1);
