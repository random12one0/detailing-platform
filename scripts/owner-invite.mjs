// ROADMAP 4.1d — THE OWNER INVITE, PRESSED IN A REAL BROWSER AND READ BACK OFF THE DATABASE.
//
//   set -a; . ./.env; set +a
//   node scripts/owner-invite.mjs                      # dev server on :5173
//   node scripts/owner-invite.mjs --audit=pending      # the screen half only (see below)
//   node scripts/owner-invite.mjs --break=wrong-actor  # sabotage: hold every audit row to a stranger
//   node scripts/receipt.mjs receipts/owner-invite.json
//
// At 1440x900 and 392x844 it asks the item's four questions: does one press first show a
// step NAMING the recipient, with nothing written; does "Not yet" write nothing; does the
// answer write the invite AND leave an `action_log` row saying who, what it superseded, and
// when; and is the way back (Revoke, beside the pending invite) on the SAME screen. The
// console is read at both widths.
//
// TWO SENDS PER WIDTH, ON PURPOSE. The first is an OWNER invite (the sentence that says an owner
// can do everything, permanently), the second is a STAFF invite to the SAME address, which
// supersedes the first, so the second audit row's `before` must name the first invite. That is
// the only way the "prior state" of an invite is ever non-empty.
//
// `--audit=pending` EXISTS BECAUSE THE SERVER HALF IS ANDREW'S TO PUBLISH. The audit row needs
// migration 20261010020000 applied and `invite-user` published; until both are, the audit
// assertions CANNOT pass and are reported as NOT RUN, by name, in the receipt's warnings. They
// are never folded into the pass. Without the flag, every assertion runs and a missing audit row
// is a failure, so a run after publishing is the proof.
//
// WHAT IT TOUCHES, so a lane statement can name it (docs/shared-resources.md):
//   * ITS OWN throwaway business `oi-41d-<tag>` (`is_demo`) and an owner login on the
//     `fixture.test` sink, which `send-email` refuses before the provider, so no mail is spent.
//     NEVER `demo-detail`. Deleted in `finally`, on SIGINT/SIGTERM, and swept at the start.
//   * The DEPLOYED `invite-user`.
//   * **PERMANENT, ON PURPOSE:** the `action_log` rows a run causes once the server half is live
//     (the table refuses DELETE). They hold ids, a role and a word: no email, no name.
//   * Screenshots of the question at each width: `.manager-shots/4.1d-invite/` (git-ignored).

import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
import { writeReceipt } from "./receipt.mjs";

const { chromium } = createRequire(import.meta.url)("./../app/node_modules/playwright/index.js");
const URL_ = process.env.SUPABASE_URL, SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY, REF = process.env.SUPABASE_PROJECT_REF;
const PLATFORM = "kguqylyzgyzfktkfnhjb";
const BASE = process.env.BASE_URL || "http://localhost:5173";
if (!URL_ || !SERVICE || !REF) { console.error("Missing SUPABASE_URL / _SERVICE_ROLE_KEY / _PROJECT_REF. Nothing was measured. Run: set -a; . ./.env; set +a"); process.exit(1); }
if (REF !== PLATFORM || !URL_.includes(`${PLATFORM}.supabase.co`)) { console.error(`Refusing: project is ${REF}, not ${PLATFORM}. Nothing was written.`); process.exit(1); }

const BREAK = (process.argv.find((a) => a.startsWith("--break=")) || "").slice(8);
const AUDIT_PENDING = process.argv.includes("--audit=pending");
const WIDTHS = [[1440, 900], [392, 844]];
const SHOTS = ".manager-shots/4.1d-invite";
mkdirSync(SHOTS, { recursive: true });
const started = new Date();
const tag = started.getTime().toString(36);
const SLUG = `oi-41d-${tag}`, NAME = `ZZ 4.1d Fixture ${tag}`;
const OWNER = { email: `oi-41d-${tag}@fixture.test`, password: `Fx-${tag}-${Math.random().toString(36).slice(2)}` };
const H = { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, "Content-Type": "application/json" };

let assertions = 0, notRun = 0;
const failures = [];
const check = (label, ok, detail = "") => {
  assertions++;
  if (!ok) failures.push(`${label}${detail ? ` — ${detail}` : ""}`);
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${label}${!ok && detail ? `\n          ${detail}` : ""}`);
  return ok;
};
const audit = (label, ok, detail) => {
  if (AUDIT_PENDING) { notRun++; console.log(`  NOT RUN  ${label}  (--audit=pending: migration/publish are Andrew's)`); return true; }
  return check(label, ok, detail);
};
const rest = async (path, init = {}) => {
  const r = await fetch(`${URL_}/rest/v1/${path}`, { ...init, headers: { ...H, ...(init.headers || {}) } });
  const t = await r.text();
  try { return t ? JSON.parse(t) : null; } catch { return t; }
};
const until = async (fn, ms = 15000) => { const end = Date.now() + ms; let v; while (Date.now() < end) { if ((v = await fn())) return v; await new Promise((r) => setTimeout(r, 300)); } return v; };

let biz = null, userId = null;
async function teardown() {
  if (biz) {
    // business_invites go with the business (on delete cascade).
    await rest(`business_users?business_id=eq.${biz.id}`, { method: "DELETE" });
    await rest(`businesses?id=eq.${biz.id}`, { method: "DELETE" });
    biz = null;
  }
  if (userId) { await fetch(`${URL_}/auth/v1/admin/users/${userId}`, { method: "DELETE", headers: H }); userId = null; }
}
for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, async () => { console.log(`\n${sig} — tearing down`); await teardown(); process.exit(1); });

/** Every way an invite's audit row can be wrong. [] means right. */
function auditProblems(row, { invite, actor, role, superseded }) {
  if (!row) return ["no audit row"];
  const p = [];
  const expectActor = BREAK === "wrong-actor" ? "00000000-0000-0000-0000-000000000000" : actor;
  if (row.actor_id !== expectActor) p.push(`acted by ${row.actor_id}, expected ${expectActor}`);
  if (row.actor_role !== "owner") p.push(`actor_role ${row.actor_role}`);
  if (row.subject_table !== "business_invites" || row.subject_id !== invite) p.push(`subject ${row.subject_table}/${row.subject_id}`);
  const prior = JSON.stringify(row.before?.pending_invites ?? null);
  if (prior !== JSON.stringify(superseded)) p.push(`prior pending_invites ${prior}, expected ${JSON.stringify(superseded)}`);
  if (JSON.stringify(row.after?.pending_invites ?? null) !== JSON.stringify([invite]) || row.after?.role !== role) p.push(`after ${JSON.stringify(row.after)}`);
  if (/@/.test(JSON.stringify(row))) p.push("the row holds an email address");
  const at = Date.parse(row.created_at);
  if (!(at >= started.getTime() - 5000 && at <= Date.now() + 5000)) p.push(`created_at ${row.created_at} outside this run`);
  return p;
}
const logRow = (subject) => until(async () => (await rest(`action_log?subject_id=eq.${subject}&action=eq.invite.send&order=created_at.desc&limit=1`))?.[0], AUDIT_PENDING ? 1 : 15000);
const invitesFor = (email) => rest(`business_invites?business_id=eq.${biz.id}&email=eq.${encodeURIComponent(email)}&order=created_at.asc&select=id,role,revoked_at,invited_by,created_at`);

// ADJACENT, NOT THIS ITEM'S (ROADMAP 4.1 gap list): opening the gear POSTs `platform-admin` `whoami`,
// which answers 404 for anyone who is not a platform admin, and the browser logs each as a console
// error with no URL in the text. They are counted by URL and subtracted by exactly that many, so
// any OTHER console line, or a 404 from anywhere else, still fails the width. `whoamiSeen` is reported.
const whoami404 = { n: 0 };
const consoleOf = (page, sink) => {
  page.on("response", (r) => { if (r.status() === 404 && r.url().includes("/functions/v1/platform-admin")) whoami404.n++; });
  page.on("console", (m) => { if (["error", "warning"].includes(m.type())) sink.push(`${m.type()}: ${m.text().slice(0, 200)}`); });
  page.on("pageerror", (e) => sink.push(`pageerror: ${String(e).slice(0, 200)}`));
};
const btn = (page, name) => page.getByRole("button", { name, exact: true });

const canary = { id: "audit-matcher-rejects-a-stranger-and-a-wrong-prior", observed_failure: false };
const dims = { project: REF, slug: SLUG, break: BREAK || null, audit: AUDIT_PENDING ? "pending" : "checked", widths: WIDTHS.map((w) => w.join("x")), console: {} };
let completed = 0, attempted = 0, lastPage = null;
let browser;

try {
  console.log(`4.1d — owner invite — project ${REF}${BREAK ? `\n*** --break=${BREAK}: a sabotage, not a result ***` : ""}${AUDIT_PENDING ? "\n*** --audit=pending: the audit rows are NOT RUN ***" : ""}\n`);
  for (const b of (await rest("businesses?slug=like.oi-41d-*&select=id,slug")) ?? []) {
    await rest(`business_users?business_id=eq.${b.id}`, { method: "DELETE" });
    await rest(`businesses?id=eq.${b.id}`, { method: "DELETE" });
    console.log(`  (swept ${b.slug}, left by a killed run)`);
  }
  biz = (await rest("businesses", { method: "POST", headers: { Prefer: "return=representation" },
    body: JSON.stringify([{ slug: SLUG, name: NAME, timezone: "America/Los_Angeles", contact_email: OWNER.email, is_demo: true, status: "active" }]) }))?.[0] ?? null;
  const u = await (await fetch(`${URL_}/auth/v1/admin/users`, { method: "POST", headers: H, body: JSON.stringify({ ...OWNER, email_confirm: true }) })).json();
  userId = u?.id ?? null;
  await rest("business_users", { method: "POST", body: JSON.stringify([{ business_id: biz?.id, user_id: userId, role: "owner" }]) });
  if (!check("fixture: business and owner exist (never demo-detail)", !!biz?.id && !!userId, JSON.stringify(biz).slice(0, 160))) throw new Error("fixture incomplete");

  browser = await chromium.launch();
  for (const [w, h] of WIDTHS) {
    console.log(`\n── ${w}x${h} ──`);
    const sink = []; dims.console[`${w}`] = sink;
    attempted++;
    const target = `invitee-${w}-${tag}@fixture.test`;
    const ctx = await browser.newContext({ viewport: { width: w, height: h } });
    const page = await ctx.newPage(); lastPage = page; consoleOf(page, sink);
    await page.goto(`${BASE}/app`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("input[type=email]", { timeout: 30000 });
    await page.fill("input[type=email]", OWNER.email);
    await page.fill("input[type=password]", OWNER.password);
    await page.click("form button.btn.primary");
    await page.waitForSelector(".tabbar, .setup, main", { timeout: 30000 });
    await page.evaluate(() => { try { localStorage.setItem("dp.tours", JSON.stringify(["shell", "today", "calendar", "money", "clients", "business"])); localStorage.setItem("dp.tour", "1"); } catch {} });
    await page.getByRole("button", { name: "Settings", exact: true }).click({ timeout: 30000 });
    await page.getByRole("button", { name: /^Team/ }).first().click({ timeout: 20000 });
    const email = page.locator("input[type=email]").first();
    await email.waitFor({ state: "attached", timeout: 20000 });

    // ── 1 · the first press asks, naming the recipient; nothing written ─────
    await email.fill(target);
    await page.locator(".segmented button", { hasText: /^Owner$/ }).click();
    await btn(page, "Send invite").scrollIntoViewIfNeeded();
    await btn(page, "Send invite").click();
    const q1 = (await page.locator("[role=alert]").first().textContent({ timeout: 5000 }).catch(() => "")) || "";
    check(`${w} owner invite · the first press asks, naming the recipient and the size of the decision`, q1.includes(target) && /owner/i.test(q1), JSON.stringify(q1));
    await page.screenshot({ path: `${SHOTS}/${w}-owner-question.png` });
    check(`${w} owner invite · nothing written by the first press`, (await invitesFor(target)).length === 0);
    await btn(page, "Not yet").click();
    check(`${w} owner invite · "Not yet" puts the button back and writes nothing`,
      (await btn(page, "Send invite").count()) === 1 && (await invitesFor(target)).length === 0);

    // ── 2 · the answer sends it, and the audit row says who, what it superseded, when ─
    await btn(page, "Send invite").click();
    await btn(page, "Yes, send it").click();
    const first = await until(async () => (await invitesFor(target))[0]);
    check(`${w} owner invite · the answer creates the invite (owner, invited by the owner)`, first?.role === "owner" && first?.invited_by === userId, JSON.stringify(first));
    const a1 = auditProblems(await logRow(first?.id), { invite: first?.id, actor: userId, role: "owner", superseded: [] });
    audit(`${w} owner invite · action_log: the owner, nothing before, the invite after, stamped now`, a1.length === 0, a1.join("; "));
    await page.getByText(target, { exact: true }).first().waitFor({ state: "attached", timeout: 15000 });
    check(`${w} owner invite · it shows under Pending invites, with Revoke beside it`,
      (await page.locator(".card", { hasText: target }).getByRole("button", { name: "Revoke", exact: true }).count()) === 1);

    // ── 3 · a second, STAFF invite to the same address supersedes the first ──
    await email.fill(target);
    await page.locator(".segmented button", { hasText: /^Custom role$/ }).click();
    await btn(page, "Send invite").click();
    const q2 = (await page.locator("[role=alert]").first().textContent({ timeout: 5000 }).catch(() => "")) || "";
    check(`${w} staff invite · the first press asks, naming the recipient, without the owner warning`, q2.includes(target) && !/owner/i.test(q2), JSON.stringify(q2));
    await btn(page, "Yes, send it").click();
    const both = await until(async () => { const r = await invitesFor(target); return r.length === 2 ? r : null; });
    check(`${w} staff invite · the earlier live invite to that address is superseded (revoked), the new one is live`,
      !!both && both[0].revoked_at !== null && both[1].revoked_at === null && both[1].role === "staff", JSON.stringify(both));
    const a2 = auditProblems(await logRow(both?.[1]?.id), { invite: both?.[1]?.id, actor: userId, role: "staff", superseded: [first?.id] });
    audit(`${w} staff invite · action_log: before names the superseded invite, after the new one, stamped now`, a2.length === 0, a2.join("; "));

    // ── 4 · the way back, on the same screen ─────────────────────────────────
    // The list reloads after the send, and for a moment still draws the OWNER invite just superseded
    // (measured: a Revoke pressed then lands on it and the live invite is untouched). Wait for the staff card.
    const pendingCard = page.locator(".card", { hasText: target });
    check(`${w} staff invite · Pending invites settles to the one live (Staff) invite for that address`,
      !!(await until(async () => (await pendingCard.count()) === 1 && /^Staff/.test((await pendingCard.locator(".muted").first().textContent()) || ""))));
    await pendingCard.getByRole("button", { name: "Revoke", exact: true }).click({ timeout: 15000 });
    const revoked = await until(async () => { const r = await invitesFor(target); return r.length === 2 && r.every((x) => x.revoked_at) ? r : null; });
    check(`${w} revoke · reversed from the same screen (the live invite is revoked)`, !!revoked);
    check(`${w} revoke · it leaves Pending invites`, await page.getByText(target, { exact: true }).count().then((n) => n === 0));
    if (first && both && (AUDIT_PENDING || (a1.length === 0 && a2.length === 0)) && revoked) completed++;
    await page.screenshot({ path: `${SHOTS}/${w}-after-revoke.png` });
    const other = sink.filter((m) => !/^error: Failed to load resource: the server responded with a status of 404/.test(m));
    const unexplained = sink.length - other.length - whoami404.n;
    dims.whoami404 = (dims.whoami404 ?? 0) + whoami404.n; whoami404.n = 0;
    check(`${w} · console has no errors or warnings, bar the platform-admin whoami 404s counted by URL`, other.length === 0 && unexplained <= 0, sink.join(" | "));
    await ctx.close();
  }
  // The matcher, handed a row that is right and then a stranger's and a wrong prior, must accept one and reject both.
  const good = { actor_id: "u", actor_role: "owner", subject_table: "business_invites", subject_id: "i", before: { pending_invites: [] }, after: { pending_invites: ["i"], role: "owner" }, created_at: new Date().toISOString() };
  const want = { invite: "i", actor: "u", role: "owner", superseded: [] };
  canary.observed_failure = auditProblems(good, want).length === 0 && auditProblems({ ...good, actor_id: "x" }, want).length > 0
    && auditProblems(good, { ...want, superseded: ["a-made-up-invite"] }).length > 0 && auditProblems(null, want).length > 0;
  check("CANARY: the audit matcher accepts a right row and rejects a stranger's, a wrong prior state and a missing row", canary.observed_failure);
} catch (e) {
  await lastPage?.screenshot({ path: `${SHOTS}/failure.png` }).catch(() => {});
  check("the run completed without throwing", false, e.stack || String(e));
} finally {
  if (browser) await browser.close();
  await teardown();
}

const ok = failures.length === 0;
writeReceipt({
  check_id: "owner-invite",
  started_at: started.toISOString(),
  status: ok ? "pass" : "fail",
  expected_targets: WIDTHS.length,
  discovered_targets: attempted,
  attempted_targets: attempted,
  completed_targets: completed,
  skipped_targets: 0,
  assertions_executed: assertions,
  min_assertions: 20,
  failures,
  dimensions: dims,
  artifacts: ["scripts/owner-invite.mjs"],
  warnings: AUDIT_PENDING
    ? [`AUDIT HALF NOT RUN: ${notRun} audit assertions. Needs migration 20261010020000 applied and invite-user published (both Andrew's). Re-run without --audit=pending afterwards.`]
    : ["Revoke is a direct browser update of business_invites.revoked_at: it is the on-screen way back, and it leaves no audit row of its own."],
  canary,
});
console.log(`\n${ok ? "PASS" : "FAIL"} — ${assertions} assertions, ${failures.length} failed${AUDIT_PENDING ? `, ${notRun} NOT RUN` : ""}; ${completed} of ${WIDTHS.length} widths fully proved.`);
process.exit(ok ? 0 : 1);
