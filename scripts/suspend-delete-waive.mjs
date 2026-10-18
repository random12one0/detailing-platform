// ROADMAP 4.1c — SUSPEND, REMOVE AND WAIVE, PRESSED IN A REAL BROWSER AND READ BACK OFF THE DATABASE.
//
//   set -a; . ./.env; set +a
//   node scripts/suspend-delete-waive.mjs                    # dev server on :5173
//   node scripts/suspend-delete-waive.mjs --break=wrong-actor # sabotage: hold every audit row to a stranger
//   node scripts/receipt.mjs receipts/suspend-delete-waive.json
//
// For each of the three actions, at 1440x900, 768x1024 and 392x844, it asks the
// item's four questions: does one press first show a step NAMING the record, with
// nothing written; does "Not yet" leave it untouched; does the answer write, and
// leave an audit row saying who, from what, and when; and where the action can be
// undone, is the way back on the SAME screen. The console is read on every page.
//
// THE WAYS BACK, AS RULED: suspend -> Restore in the same drawer; waive -> "Correct
// how it was paid" on the same job record (ROADMAP 4.7); remove has NO screen to
// undo it, by the manager's ruling (1) of 2026-10-07 — the fold says support can
// bring the job back, and this checks that it says so rather than building one.
//
// WHAT IT TOUCHES, so a lane statement can name it (docs/shared-resources.md):
//   * ITS OWN throwaway business `sdw-41c-<tag>` (`is_demo`), an owner login on the
//     `fixture.test` sink, six bookings with NO customer email (nothing is mailed),
//     and a throwaway platform admin from `admin-account.mjs`. NEVER `demo-detail`.
//     All deleted in `finally` and on SIGINT/SIGTERM, and swept at the start.
//   * The DEPLOYED `update-booking` and `platform-admin`.
//   * **PERMANENT, ON PURPOSE:** the `action_log` rows a run causes (the table refuses
//     DELETE). `platform_admin_events` rows go with the business (`on delete cascade`).

import { createRequire } from "node:module";
import { writeReceipt } from "./receipt.mjs";
import { makeAdmin, dropAdmin } from "./admin-account.mjs";

const { chromium } = createRequire(import.meta.url)("./../app/node_modules/playwright/index.js");
const URL_ = process.env.SUPABASE_URL, SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY, REF = process.env.SUPABASE_PROJECT_REF;
const PLATFORM = "kguqylyzgyzfktkfnhjb";
const BASE = process.env.BASE_URL || "http://localhost:5173";
if (!URL_ || !SERVICE || !REF) { console.error("Missing SUPABASE_URL / _SERVICE_ROLE_KEY / _PROJECT_REF. Nothing was measured. Run: set -a; . ./.env; set +a"); process.exit(1); }
if (REF !== PLATFORM || !URL_.includes(`${PLATFORM}.supabase.co`)) { console.error(`Refusing: project is ${REF}, not ${PLATFORM}. Nothing was written.`); process.exit(1); }

const BREAK = (process.argv.find((a) => a.startsWith("--break=")) || "").slice(8);
const WIDTHS = [[1440, 900], [768, 1024], [392, 844]].filter(([w]) => !process.env.ONLY || process.env.ONLY === String(w));
const started = new Date();
const tag = started.getTime().toString(36);
const SLUG = `sdw-41c-${tag}`, NAME = `ZZ 4.1c Fixture ${tag}`;
const OWNER = { email: `sdw-41c-${tag}@fixture.test`, password: `Fx-${tag}-${Math.random().toString(36).slice(2)}` };
const H = { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, "Content-Type": "application/json" };

let assertions = 0;
const failures = [];
const check = (label, ok, detail = "") => {
  assertions++;
  if (!ok) failures.push(`${label}${detail ? ` — ${detail}` : ""}`);
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${label}${!ok && detail ? `\n          ${detail}` : ""}`);
  return ok;
};
const rest = async (path, init = {}) => {
  const r = await fetch(`${URL_}/rest/v1/${path}`, { ...init, headers: { ...H, ...(init.headers || {}) } });
  const t = await r.text();
  try { return t ? JSON.parse(t) : null; } catch { return t; }
};
const one = async (path) => (await rest(path))?.[0] ?? {};
const until = async (fn, ms = 15000) => { const end = Date.now() + ms; let v; while (Date.now() < end) { if ((v = await fn())) return v; await new Promise((r) => setTimeout(r, 300)); } return v; };

let biz = null, userId = null, admin = null;
async function teardown() {
  if (biz) {
    await rest(`bookings?business_id=eq.${biz.id}`, { method: "DELETE" });
    await rest(`business_users?business_id=eq.${biz.id}`, { method: "DELETE" });
    await rest(`businesses?id=eq.${biz.id}`, { method: "DELETE" });
    biz = null;
  }
  if (userId) { await fetch(`${URL_}/auth/v1/admin/users/${userId}`, { method: "DELETE", headers: H }); userId = null; }
  if (admin) { await dropAdmin(URL_, SERVICE, admin.id); await fetch(`${URL_}/auth/v1/admin/users/${admin.id}`, { method: "DELETE", headers: H }); admin = null; }
}
for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, async () => { console.log(`\n${sig} — tearing down`); await teardown(); process.exit(1); });

/** Every way an audit row can be wrong. [] means right. Used on both tables. */
function auditProblems(row, { actor, field, from, after }) {
  if (!row) return ["no audit row"];
  const p = [];
  const who = row.actor_id ?? row.admin_id;
  const expectActor = BREAK === "wrong-actor" ? "00000000-0000-0000-0000-000000000000" : actor;
  if (who !== expectActor) p.push(`acted by ${who}, expected ${expectActor}`);
  const prior = row.before ? row.before[field] ?? null : row.detail?.from ?? null;
  if (prior !== from) p.push(`prior ${field} ${JSON.stringify(prior)}, expected ${JSON.stringify(from)}`);
  const now = row.after ? row.after[field] ?? null : row.detail?.to ?? null;
  if (after === "<a time>" ? !(now && !Number.isNaN(Date.parse(now))) : now !== after) p.push(`new ${field} ${JSON.stringify(now)}, expected ${after}`);
  const at = Date.parse(row.created_at);
  if (!(at >= started.getTime() - 5000 && at <= Date.now() + 5000)) p.push(`created_at ${row.created_at} outside this run`);
  return p;
}
const logRow = (subject, action) => until(async () => (await rest(`action_log?subject_id=eq.${subject}&action=eq.${action}&order=created_at.desc&limit=1`))?.[0]);
const adminRow = (action, since) => until(async () => (await rest(`platform_admin_events?business_id=eq.${biz.id}&action=eq.${action}&created_at=gt.${since}&order=created_at.desc&limit=1`))?.[0]);

const consoleOf = (page, sink) => {
  page.on("console", (m) => { if (["error", "warning"].includes(m.type())) sink.push(`${m.type()}: ${m.text().slice(0, 200)}`); });
  page.on("pageerror", (e) => sink.push(`pageerror: ${String(e).slice(0, 200)}`));
};
const btn = (page, name) => page.getByRole("button", { name, exact: true });

const canary = { id: "audit-matcher-rejects-a-stranger-and-a-wrong-prior", observed_failure: false };
const dims = { project: REF, slug: SLUG, break: BREAK || null, widths: WIDTHS.map((w) => w.join("x")), console: {} };
let completed = 0, attempted = 0;
let browser;

try {
  console.log(`4.1c — suspend, remove, waive — project ${REF}${BREAK ? `\n*** --break=${BREAK}: a sabotage, not a result ***` : ""}\n`);
  for (const b of (await rest("businesses?slug=like.sdw-41c-*&select=id,slug")) ?? []) {
    await rest(`bookings?business_id=eq.${b.id}`, { method: "DELETE" });
    await rest(`business_users?business_id=eq.${b.id}`, { method: "DELETE" });
    await rest(`businesses?id=eq.${b.id}`, { method: "DELETE" });
    console.log(`  (swept ${b.slug}, left by a killed run)`);
  }
  biz = (await rest("businesses", { method: "POST", headers: { Prefer: "return=representation" },
    body: JSON.stringify([{ slug: SLUG, name: NAME, timezone: "America/Los_Angeles", contact_email: OWNER.email, is_demo: true, status: "active" }]) }))?.[0] ?? null;
  const u = await (await fetch(`${URL_}/auth/v1/admin/users`, { method: "POST", headers: H, body: JSON.stringify({ ...OWNER, email_confirm: true }) })).json();
  userId = u?.id ?? null;
  await rest("business_users", { method: "POST", body: JSON.stringify([{ business_id: biz?.id, user_id: userId, role: "owner" }]) });
  admin = await makeAdmin(URL_, SERVICE, `sdw-41c-admin-${tag}@fixture.test`);
  const day = new Date(Date.now() - 86400000); day.setUTCHours(17, 0, 0, 0);
  const rows = WIDTHS.flatMap(([w], i) => [
    { key: `remove-${w}`, status: "confirmed" }, { key: `waive-${w}`, status: "completed" },
  ].map((r, j) => ({
    business_id: biz?.id, customer_name: `Rory ${r.key}`, customer_phone: "555-0100", customer_email: null,
    service_type: "dropoff", status: r.status, total_price: 120,
    start_at: new Date(day.getTime() + (i * 2 + j) * 3600000).toISOString(),
    end_at: new Date(day.getTime() + (i * 2 + j) * 3600000 + 1800000).toISOString(),
  })));
  const made = (await rest("bookings", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify(rows) })) ?? [];
  const byKey = Object.fromEntries((Array.isArray(made) ? made : []).map((b) => [b.customer_name.slice(5), b]));
  if (!check("fixture: business, owner, platform admin and two bookings per width exist (never demo-detail)",
    !!biz?.id && !!userId && !!admin?.id && Object.keys(byKey).length === WIDTHS.length * 2, JSON.stringify(made).slice(0, 200))) throw new Error("fixture incomplete");

  browser = await chromium.launch();
  for (const [w, h] of WIDTHS) {
    console.log(`\n── ${w}x${h} ──`);
    const sink = []; dims.console[`${w}`] = sink;

    // ── OWNER: remove and waive on the job record ──────────────────────────
    const ctx = await browser.newContext({ viewport: { width: w, height: h } });
    const page = await ctx.newPage(); consoleOf(page, sink);
    await page.goto(`${BASE}/app`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("input[type=email]", { timeout: 30000 });
    await page.fill("input[type=email]", OWNER.email);
    await page.fill("input[type=password]", OWNER.password);
    await page.click("form button.btn.primary");
    await page.waitForSelector(".tabbar, .setup, main", { timeout: 30000 });
    await page.evaluate(() => { try { localStorage.setItem("dp.tours", JSON.stringify(["shell", "today", "calendar", "money", "clients", "business"])); localStorage.setItem("dp.tour", "1"); } catch {} });

    // REMOVE
    attempted++;
    const rm = byKey[`remove-${w}`];
    await page.goto(`${BASE}/job/${rm.id}`, { waitUntil: "domcontentloaded" });
    await page.getByText("Removing it from your records", { exact: true }).click({ timeout: 30000 });
    await btn(page, "Remove from records").click();
    const rq = (await page.locator(".confirm-q, [role=alert]").first().textContent({ timeout: 5000 }).catch(() => "")) || "";
    check(`${w} remove · the first press asks, naming the customer`, rq.includes(`Rory remove-${w}`) && /remove/i.test(rq), JSON.stringify(rq));
    check(`${w} remove · nothing written by the first press`, (await one(`bookings?id=eq.${rm.id}&select=deleted_at`)).deleted_at === null);
    await btn(page, "Not yet").click();
    check(`${w} remove · "Not yet" puts the button back and writes nothing`,
      (await btn(page, "Remove from records").count()) === 1 && (await one(`bookings?id=eq.${rm.id}&select=deleted_at`)).deleted_at === null);
    check(`${w} remove · the fold says support can bring it back (ruling 1: no undo screen)`,
      (await page.getByText("support can bring the job back").count()) > 0);
    await btn(page, "Remove from records").click();
    await btn(page, "Yes, remove it").click();
    const rmGone = await until(async () => (await one(`bookings?id=eq.${rm.id}&select=deleted_at`)).deleted_at);
    check(`${w} remove · the answer removes it`, !!rmGone);
    const rmLog = await logRow(rm.id, "job.delete");
    const rmP = auditProblems(rmLog, { actor: userId, field: "deleted_at", from: null, after: "<a time>" });
    check(`${w} remove · action_log: the owner, deleted_at null -> a time, stamped now`, rmP.length === 0, rmP.join("; "));
    if (rmP.length === 0) completed++;
    if (rmLog && !canary.observed_failure) {
      canary.observed_failure = auditProblems({ ...rmLog, actor_id: "someone-else" }, { actor: userId, field: "deleted_at", from: null, after: "<a time>" }).length > 0
        && auditProblems(rmLog, { actor: userId, field: "deleted_at", from: "2020-01-01", after: "<a time>" }).length > 0;
    }

    // WAIVE, then its way back on the same record
    attempted++;
    const wv = byKey[`waive-${w}`];
    const before = (await one(`bookings?id=eq.${wv.id}&select=payment_status`)).payment_status ?? null;
    await page.goto(`${BASE}/job/${wv.id}`, { waitUntil: "domcontentloaded" });
    await btn(page, "Finalize payment").click({ timeout: 30000 });
    await page.getByRole("radio", { name: "Waived", exact: true }).or(btn(page, "Waived")).first().click();
    await page.getByRole("button", { name: /^Complete job/ }).click();
    const wq = (await page.locator(".confirm-box p").first().textContent({ timeout: 5000 }).catch(() => "")) || "";
    check(`${w} waive · the first press asks, naming the customer`, wq.includes(`Rory waive-${w}`) && /waive/i.test(wq), JSON.stringify(wq));
    check(`${w} waive · nothing written by the first press`, (await one(`bookings?id=eq.${wv.id}&select=payment_status`)).payment_status === before);
    await btn(page, "Go back").click();
    check(`${w} waive · "Go back" writes nothing`, (await one(`bookings?id=eq.${wv.id}&select=payment_status,finalized_at`)).finalized_at === null);
    await page.getByRole("button", { name: /^Complete job/ }).click();
    await btn(page, "Yes, finalize").click();
    const waived = await until(async () => (await one(`bookings?id=eq.${wv.id}&select=payment_status`)).payment_status === "waived");
    check(`${w} waive · the answer waives it`, !!waived);
    const wvP = auditProblems(await logRow(wv.id, "payment.waive"), { actor: userId, field: "payment_status", from: before, after: "waived" });
    check(`${w} waive · action_log: the owner, payment_status ${before} -> waived, stamped now`, wvP.length === 0, wvP.join("; "));
    // the way back, on the same record
    await page.getByText("Changing what you recorded", { exact: true }).click({ timeout: 15000 });
    await page.getByRole("radio", { name: "Paid", exact: true }).or(btn(page, "Paid")).first().click();
    await btn(page, "Change it to Paid").click();
    const cq = (await page.locator("[role=alert]").first().textContent({ timeout: 5000 }).catch(() => "")) || "";
    check(`${w} waive · the way back is on the same record and its question names the job`, cq.includes(`Rory waive-${w}`), JSON.stringify(cq));
    await btn(page, "Yes, change it").click();
    const back = await until(async () => (await one(`bookings?id=eq.${wv.id}&select=payment_status`)).payment_status === "paid");
    check(`${w} waive · reversed from the same screen (waived -> paid)`, !!back);
    const bkP = auditProblems(await logRow(wv.id, "payment.set"), { actor: userId, field: "payment_status", from: "waived", after: "paid" });
    check(`${w} waive · the reversal leaves its own row, waived -> paid`, bkP.length === 0, bkP.join("; "));
    if (wvP.length === 0 && bkP.length === 0) completed++;
    await ctx.close();

    // ── ADMIN: suspend and restore in the drawer ───────────────────────────
    attempted++;
    const actx = await browser.newContext({ viewport: { width: w, height: h } });
    const ap = await actx.newPage(); consoleOf(ap, sink);
    ap.on("dialog", (d) => d.accept());
    await ap.goto(`${BASE}/admin`, { waitUntil: "domcontentloaded" });
    await ap.waitForSelector("input[type=email]", { timeout: 25000 });
    await ap.fill("input[type=email]", admin.email);
    await ap.fill("input[type=password]", admin.password);
    // 99.10: the new office (app/src/admin/office/). Its Detailers place has no
    // list filter, so the row is found by the throwaway business's own name.
    await ap.click("form button[type=submit]");
    await ap.waitForSelector(".bo-rail", { timeout: 25000 });
    await ap.locator(".bo-nav", { hasText: "Detailers" }).click();
    await ap.locator(".bo-row", { hasText: NAME }).first().click({ timeout: 20000 });
    const drawer = ap.locator(".bo-panel");
    await drawer.getByRole("button", { name: "Suspend", exact: true }).click({ timeout: 20000 });
    const sq = (await drawer.locator(".bo-sure p").first().textContent({ timeout: 5000 }).catch(() => "")) || "";
    check(`${w} suspend · the first press asks, naming the business`, sq.includes(NAME), JSON.stringify(sq));
    check(`${w} suspend · nothing written by the first press`, (await one(`businesses?id=eq.${biz.id}&select=status`)).status === "active");
    await drawer.getByRole("button", { name: "Not yet", exact: true }).click();
    check(`${w} suspend · "Not yet" puts the button back and writes nothing`,
      (await drawer.getByRole("button", { name: "Suspend", exact: true }).count()) === 1 && (await one(`businesses?id=eq.${biz.id}&select=status`)).status === "active");
    const t0 = new Date().toISOString();
    await drawer.getByRole("button", { name: "Suspend", exact: true }).click();
    await drawer.getByRole("button", { name: "Yes, suspend them", exact: true }).click();
    check(`${w} suspend · the answer suspends them`, !!(await until(async () => (await one(`businesses?id=eq.${biz.id}&select=status`)).status === "paused")));
    const sP = auditProblems(await adminRow("suspend", t0), { actor: admin.id, field: "status", from: "active", after: "paused" });
    check(`${w} suspend · platform_admin_events: the admin, active -> paused, stamped now`, sP.length === 0, sP.join("; "));
    // ATTACHED, NOT VISIBLE (docs/gotchas.md 107): the history card sits below the drawer's fold on a phone.
    // A history row is "<span>today</span>You suspended them", so an exact text match never fits (98.11).
    const shown = await drawer.locator(".bo-log li", { hasText: "You suspended them" }).first().waitFor({ state: "attached", timeout: 15000 }).then(() => true, () => false);
    const hist = shown ? "" : await drawer.locator(".bo-log").last().textContent().catch(() => "<<no card>>");
    check(`${w} suspend · the drawer's own history shows "You suspended them"`, shown, `history card read: ${JSON.stringify((hist || "").slice(0, 200))}`);
    const t1 = new Date().toISOString();
    await drawer.getByRole("button", { name: "Reopen account", exact: true }).click({ timeout: 15000 });
    check(`${w} suspend · reversed from the same drawer (Reopen account)`, !!(await until(async () => (await one(`businesses?id=eq.${biz.id}&select=status`)).status === "active")));
    const rP = auditProblems(await adminRow("restore", t1), { actor: admin.id, field: "status", from: "paused", after: "active" });
    check(`${w} suspend · the restore leaves its own row, paused -> active`, rP.length === 0, rP.join("; "));
    if (sP.length === 0 && rP.length === 0) completed++;
    await actx.close();

    check(`${w} · console has no errors or warnings across the three screens`, sink.length === 0, sink.join(" | "));
  }
  check("CANARY: the audit matcher rejects a stranger's row and a wrong prior value", canary.observed_failure);
} catch (e) {
  check("the run completed without throwing", false, e.stack || String(e));
} finally {
  if (browser) await browser.close();
  await teardown();
}

const ok = failures.length === 0;
const expected = WIDTHS.length * 3;
writeReceipt({
  check_id: "suspend-delete-waive",
  started_at: started.toISOString(),
  status: ok ? "pass" : "fail",
  expected_targets: expected,
  discovered_targets: attempted,
  attempted_targets: attempted,
  completed_targets: completed,
  skipped_targets: 0,
  assertions_executed: assertions,
  min_assertions: 60,
  failures,
  dimensions: dims,
  artifacts: ["scripts/suspend-delete-waive.mjs"],
  warnings: [
    "Remove has no on-screen undo, by the manager's ruling (1) of 2026-10-07; this checks the fold says support can restore it, not that a restore works.",
    "Suspend's audit row is platform_admin_events, which is readable and carries who/from/when but is NOT append-only (ROADMAP 4.1b's open scope question).",
    "English only; the back office is English by construction, and the job record's Spanish questions are pinned by tests/confirm-questions.test.mjs.",
  ],
  canary,
});
console.log(`\n${ok ? "PASS" : "FAIL"} — ${assertions} assertions, ${failures.length} failed; ${completed} of ${expected} action-widths proved.`);
process.exit(ok ? 0 : 1);
