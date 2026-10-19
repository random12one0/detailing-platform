// ROADMAP 14.34 — A JOB NOTIFICATION, DELIVERED AND TAPPED, OPENS THE JOB.
//
//   set -a; . ./.env; set +a
//   node scripts/push-tap.mjs                      # dev server (BASE_URL, default :5173)
//   node scripts/push-tap.mjs --break=dead-route   # sabotage: the real call site's link made dead
//
// WHY THIS EXISTS. tests/push-urls-are-routes.test.mjs holds every
// `sendOwnerPush` url against the ROUTE TABLE. That is reading. The done-when
// asks for a push that is TAPPED and opens the record, because the last time
// this page was fixed (JobPage.jsx's header) it was found by pressing, not by
// reading. This is the nearest a browser gets to the press:
//   1. sign in as the demo owner, with notifications allowed, and wait for
//      the app's real service worker (app/public/sw.js) to control the page;
//   2. hand that worker a GENUINE push event through Chrome's DevTools
//      protocol (`ServiceWorker.deliverPushMessage`) — the payload is the shape
//      _shared/ownerPush.ts sends, and its `url` is the TEMPLATE READ OUT OF
//      cancel-booking/index.ts with the placeholder filled by a real booking id;
//   3. require that a notification was actually SHOWN and carries that url;
//   4. tap it — the worker's own `notificationclick` handler runs — and
//      require the tab to land on the job record, not the 404, console clean.
// Every run ALSO taps an `/admin/job/<id>` notification and requires the 404:
// a judge that cannot tell a dead route from a live one is the whole lesson.
//
// WHAT IT CANNOT PROVE, SAID HERE AND IN THE RECEIPT: a real push service, a
// real phone's lock screen, and a TRUSTED tap. The tap is a dispatched
// NotificationEvent, so the browser refuses it the user-activation powers a
// real tap carries: `waitUntil` (untrusted events throw) and `focus()`. Those
// two — and only those — are shimmed inside the worker; `matchAll` and
// `navigate`, the part that decides where the detailer lands, run unpatched.
// The real tap is on Andrew's phone (ROADMAP 14.34's NEEDS ANDREW line).
//
// It writes nothing to the database: one sign-in and one read of a booking id.

import { createRequire } from "node:module";
import { mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { REPO, writeReceipt } from "./receipt.mjs";
import { demoOwner } from "./lib/demoOwner.mjs";

const { chromium } = createRequire(import.meta.url)(join(REPO, "app/node_modules/playwright/index.js"));

const BASE = process.env.BASE_URL || "http://localhost:5173";
const BREAK = (process.argv.slice(2).find((a) => a.startsWith("--break=")) || "").split("=")[1] || null;
if (BREAK && BREAK !== "dead-route") { console.error(`unknown --break=${BREAK}; the only one is dead-route`); process.exit(2); }

const { SUPABASE_URL, SUPABASE_ANON_KEY } = process.env;
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("Missing SUPABASE_URL / SUPABASE_ANON_KEY — run `set -a; . ./.env; set +a` first.");
  console.error("NOTHING WAS MEASURED. This is not a pass.");
  process.exit(2);
}
if (!SUPABASE_URL.includes("kguqylyzgyzfktkfnhjb")) {
  console.error("SUPABASE_URL is not the platform's own project (kguqylyzgyzfktkfnhjb). Stopping.");
  process.exit(2);
}

const SIZES = [{ w: 1440, h: 900 }, { w: 768, h: 1024 }, { w: 390, h: 844 }, { w: 320, h: 720 }];
// Per size: shown, carries-url, lands-on-record, dead-link-lands-on-404, console = 5. Canaries = 2.
const PER_SIZE = 5;
const EXPECTED_ASSERTIONS = SIZES.length * PER_SIZE + 2;
const ART = join(REPO, ".manager-shots", "14.34");
mkdirSync(ART, { recursive: true });

const failures = [], observed = [], artifacts = [];
let envFilled = false;
let assertions = 0;
const ok = (cond, name, detail) => {
  assertions++;
  const line = `${cond ? "PASS" : "FAIL"} ${name} — ${detail}`;
  console.log(line);
  observed.push(line);
  if (!cond) failures.push(`${name}: ${detail}`);
};

// ── THE LINK, FROM A REAL CALL SITE ───────────────────────────────────────
const SITE = "supabase/functions/cancel-booking/index.ts";
const siteSrc = readFileSync(join(REPO, SITE), "utf8");
const call = siteSrc.slice(siteSrc.indexOf("sendOwnerPush("));
const tpl = (call.match(/\burl:\s*`([^`]*)`/) || [])[1];
if (!tpl) { console.error(`no literal url template found in ${SITE}'s sendOwnerPush call — NOTHING WAS MEASURED.`); process.exit(2); }
// The sabotage is 14.34's original defect, put back in the template the run reads.
const template = BREAK ? tpl.replace(/^\/job\//, "/admin/job/") : tpl;
if (BREAK && template === tpl) { console.error("SABOTAGE DID NOT TAKE: the template did not start with /job/. This run proves nothing."); process.exit(3); }

// ── A REAL BOOKING ID, read as the owner ─────────────────────────────────
const owner = demoOwner();
const tok = await (await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
  method: "POST", headers: { apikey: SUPABASE_ANON_KEY, "Content-Type": "application/json" },
  body: JSON.stringify({ email: owner.email, password: owner.password }),
})).json();
if (!tok.access_token) { console.error("demo owner sign-in failed — NOTHING WAS MEASURED."); process.exit(2); }
const rows = await (await fetch(`${SUPABASE_URL}/rest/v1/bookings?select=id&status=neq.cancelled&customer_name=not.ilike.*deleted*&order=start_at.desc&limit=1`, {
  headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${tok.access_token}` },
})).json();
const bookingId = Array.isArray(rows) && rows[0]?.id;
if (!bookingId) { console.error(`no booking readable as the demo owner (${JSON.stringify(rows).slice(0, 120)}) — NOTHING WAS MEASURED.`); process.exit(2); }
const jobUrl = template.replace(/\$\{[^}]*\}/g, bookingId);
const deadUrl = `/admin/job/${bookingId}`;

// THE JUDGE, pure, so the canaries bite the production rule.
const onRecord = (r) => !!(r.path === r.want && r.recordTitle && r.dashboardBack && !r.nf404);

// ── THE BROWSER ───────────────────────────────────────────────────────────
// FULL Chromium, not the headless shell: the shell answers "denied" to notifications whatever is
// granted, and showNotification throws. Measured 2026-10-18; the shell is Playwright's default.
const browser = await chromium.launch({ channel: "chromium" });
try {
  for (const { w, h } of SIZES) {
    const tag = `${w}x${h}`;
    const ctx = await browser.newContext({ viewport: { width: w, height: h } });
    await ctx.grantPermissions(["notifications"], { origin: new URL(BASE).origin });
    const page = await ctx.newPage();
    const noise = [];
    page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") noise.push(m.text()); });
    page.on("pageerror", (e) => noise.push(String(e)));
    // A belt worktree's server can start with no app/.env.local, and then the app cannot reach
    // Supabase at all. Fill the two public values IN MEMORY, from the same project the run already
    // checked, and only when the served module lacks them. Fetched by node and fulfilled whole, so the
    // browser never caches the unfilled module (docs/gotchas.md 113).
    await ctx.route((u) => u.origin === new URL(BASE).origin && u.pathname.startsWith("/src/"), async (route) => {
      const res = await fetch(route.request().url());
      let body = await res.text();
      if (/^import.meta.env = {(?![^}]*VITE_SUPABASE_URL)/.test(body)) {
        envFilled = true;
        body = body.replace("import.meta.env = {", `import.meta.env = {"VITE_SUPABASE_URL": ${JSON.stringify(SUPABASE_URL)}, "VITE_SUPABASE_ANON_KEY": ${JSON.stringify(SUPABASE_ANON_KEY)}, `);
      }
      await route.fulfill({ status: res.status, body, headers: { "content-type": res.headers.get("content-type") || "text/javascript" } });
    });
    // The job record draws weather; keep the shared address budget untouched (docs/shared-resources.md).
    await page.route(/address-suggest|job-weather|api\.weather\.gov|geoapify/, (r) => r.abort());

    await page.goto(`${BASE}/app`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("input[type=email], .tabbar", { timeout: 30000 });
    if (await page.locator("input[type=email]").count()) {
      await page.fill("input[type=email]", owner.email);
      await page.fill("input[type=password]", owner.password);
      await page.click("form button.btn.primary");
      await page.waitForSelector(".tabbar", { timeout: 30000 });
    }
    await page.evaluate(() => navigator.serviceWorker.ready);
    // The worker claims its clients on activate; wait for that rather than reload (one goto per context).
    await page.waitForFunction(() => !!navigator.serviceWorker.controller, null, { timeout: 15000 });
    const cdp = await ctx.newCDPSession(page);
    const regs = [];
    cdp.on("ServiceWorker.workerRegistrationUpdated", (e) => regs.push(...e.registrations));
    await cdp.send("ServiceWorker.enable");
    for (let i = 0; i < 20 && !regs.some((r) => !r.isDeleted); i++) await page.waitForTimeout(100);
    const reg = regs.find((r) => !r.isDeleted && r.scopeURL.startsWith(new URL(BASE).origin));
    const sw = ctx.serviceWorkers()[0] || await ctx.waitForEvent("serviceworker", { timeout: 10000 });

    async function deliverAndTap(url, n) {
      const t = `push-tap-${n}`;
      const payload = { title: "Booking cancelled", body: "push-tap check", url, tag: t };
      await cdp.send("ServiceWorker.deliverPushMessage", {
        origin: new URL(BASE).origin, registrationId: reg.registrationId, data: JSON.stringify(payload),
      });
      let shown = null;
      for (let i = 0; i < 50 && !shown; i++) {
        shown = await sw.evaluate(async (tg) => {
          const [n] = await self.registration.getNotifications({ tag: tg });
          return n ? { title: n.title, url: n.data?.url } : null;
        }, t);
        if (!shown) await page.waitForTimeout(100);
      }
      if (shown) {
        await sw.evaluate(async (tg) => {
          const [n] = await self.registration.getNotifications({ tag: tg });
          // The two user-activation powers an untrusted tap lacks; nothing else is touched.
          const pending = [];
          const ev = new NotificationEvent("notificationclick", { notification: n });
          ev.waitUntil = (p) => pending.push(p);
          const focus = WindowClient.prototype.focus;
          WindowClient.prototype.focus = function () { return Promise.resolve(this); };
          try { self.dispatchEvent(ev); await Promise.all(pending); } finally { WindowClient.prototype.focus = focus; }
        }, t);
        await page.waitForURL((u) => u.pathname === url, { timeout: 15000 }).catch(() => {});
        await page.waitForSelector("h1.title, .nf-code", { timeout: 15000 }).catch(() => {});
      }
      const seen = await page.evaluate(() => ({
        path: location.pathname,
        recordTitle: (document.querySelector(".job-page h1.title")?.textContent || "").trim(),
        dashboardBack: !!document.querySelector(".job-page > button.btn.inline"),
        nf404: !!document.querySelector(".nf-code"),
      }));
      return { shown, seen: { ...seen, want: url } };
    }

    const live = await deliverAndTap(jobUrl, 1);
    ok(!!live.shown, `${tag}/notification-shown`, live.shown ? `"${live.shown.title}" on the worker's notification list` : "deliverPushMessage produced no notification");
    ok(live.shown?.url === jobUrl, `${tag}/notification-carries-the-call-site-link`, `data.url ${live.shown?.url} (call site ${SITE} → ${jobUrl})`);
    ok(onRecord(live.seen), `${tag}/tap-opens-the-job-record`,
      `landed ${live.seen.path}; title "${live.seen.recordTitle}"; back-to-dashboard ${live.seen.dashboardBack}; 404 ${live.seen.nf404}`);
    const shot = `job-after-tap-${tag}.png`;
    await page.screenshot({ path: join(ART, BREAK ? `sabotage-${shot}` : shot), fullPage: false });
    artifacts.push(`.manager-shots/14.34/${BREAK ? `sabotage-${shot}` : shot}`);

    const dead = await deliverAndTap(deadUrl, 2);
    ok(dead.seen.path === deadUrl && dead.seen.nf404 && !onRecord(dead.seen), `${tag}/dead-link-tap-lands-on-404`,
      `landed ${dead.seen.path}; 404 ${dead.seen.nf404}; judged a record ${onRecord(dead.seen)}`);

    ok(noise.length === 0, `${tag}/console-clean`, `${noise.length} error/warning line(s)${noise.length ? ": " + noise.slice(0, 3).join(" | ") : ""}`);
    await ctx.close();
  }
} finally {
  await browser.close();
}

// ── THE CANARIES, aimed at the judge the browser verdicts use ─────────────
const c1 = onRecord({ path: deadUrl, want: deadUrl, recordTitle: "", dashboardBack: false, nf404: true });
const c2 = onRecord({ path: "/app", want: jobUrl, recordTitle: "x", dashboardBack: true, nf404: false });
ok(!c1,
  "canary/404-is-not-a-record", "the 404 page must not read as the job record");
ok(!c2,
  "canary/wrong-path-is-not-a-record", "a record drawn at another address must not pass");

if (assertions !== EXPECTED_ASSERTIONS) failures.push(`assertion count ${assertions} != declared ${EXPECTED_ASSERTIONS} — a run that never reached a width`);

const status = failures.length ? "fail" : "pass";
const { path } = writeReceipt({
  check_id: "push-tap",
  started_at: new Date(Date.now() - process.uptime() * 1000).toISOString(),
  status,
  expected_targets: SIZES.length,
  discovered_targets: SIZES.length,
  attempted_targets: SIZES.length,
  completed_targets: SIZES.length,
  skipped_targets: 0,
  assertions_executed: assertions,
  min_assertions: EXPECTED_ASSERTIONS,
  assertion_floor: `4 sizes x ${PER_SIZE} + 2 canaries = ${EXPECTED_ASSERTIONS}, asserted as an EQUALITY (docs/gotchas.md 98).`,
  canary: { id: "404-is-not-a-record", observed_failure: !c1 && !c2, detail: "two judge canaries every run, plus a real /admin/job/ tap per size that must land on the 404" },
  failures,
  warnings: [
    "UNJUDGEABLE: a real push service, a real phone's lock screen and a TRUSTED tap. The push is delivered by DevTools; the tap is a dispatched NotificationEvent with waitUntil and WindowClient.focus shimmed. matchAll and navigate run unpatched. The real tap is Andrew's (ROADMAP 14.34).",
    ...(envFilled ? ["The dev server had no VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY; the run filled those two in memory from .env (same project, ref checked). No other VITE_ value was supplied."] : []),
    "Dev server only. It reads the url template from source, not from the deployed bundle; the deployed bundles were read on 2026-10-10 (ROADMAP 14.34).",
    ...(BREAK ? ["this receipt is a sabotage, not a result"] : []),
  ],
  observed,
  artifacts,
  dimensions: { sizes: SIZES.map((s) => `${s.w}x${s.h}`), call_site: SITE, template, item: "14.34", break: BREAK, env_filled_in_memory: envFilled },
});
console.log(`\n${status.toUpperCase()} — ${assertions} assertions, ${failures.length} failed. Receipt: ${path}`);
process.exitCode = process.exitCode || (failures.length ? 1 : 0);
