// ROADMAP 4.1b — IS THE AUDIT HISTORY WRITTEN, READ OFF THE DATABASE AND NOT OFF A SCREEN?
//
//   set -a; . ./.env; set +a
//   node scripts/action-log-live.mjs
//   node scripts/action-log-live.mjs --break=skip-cancel  # sabotage: never press cancel, still owe its row
//   node scripts/action-log-live.mjs --break=no-table     # sabotage: read a table that is not there, as before the migration
//   node scripts/receipt.mjs receipts/action-log-live.json
//
// WHAT IT TOUCHES, so a lane statement can name it (docs/shared-resources.md):
//   * ITS OWN throwaway business, `action-log-<tag>`, `is_demo: true`, an owner
//     login on the `fixture.test` sink, a membership, and six bookings with NO
//     customer email, so the cancellation it presses has nobody to email.
//     NEVER `demo-detail`. Deleted at the end, from `finally` and on
//     SIGINT/SIGTERM (docs/gotchas.md 90), and swept at the start of every run.
//   * The DEPLOYED `update-booking` — what is running, not this checkout.
//     `node scripts/deployed-inventory.mjs` says whether they are the same.
//   * The Management API, READ-ONLY, for the table's own locks.
//   * **PERMANENT, AND ON PURPOSE: the five `action_log` rows a clean run causes.**
//     The table refuses DELETE by design, so they stay after the business is
//     gone. Each holds a status word, two ids and a role — nothing about a person.
//
// WHY IT EXISTS. 4.1's done-when says the row is "read off the row, never off
// the screen". `update-booking` answers `audit_recorded: false` when its insert
// fails, so a screen-side reading can only ever see the failure it was told
// about. This reads the rows back and holds each to who, from what, to what, when.

import { writeReceipt } from "./receipt.mjs";

const URL_ = process.env.SUPABASE_URL;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON = process.env.SUPABASE_ANON_KEY;
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const REF = process.env.SUPABASE_PROJECT_REF;
const PLATFORM = "kguqylyzgyzfktkfnhjb";
if (!URL_ || !SERVICE || !ANON || !TOKEN || !REF) {
  console.error("Missing SUPABASE_URL / _SERVICE_ROLE_KEY / _ANON_KEY / _ACCESS_TOKEN / _PROJECT_REF.");
  console.error("Nothing was measured. Run: set -a; . ./.env; set +a");
  process.exit(1);
}
// CLAUDE.md, hard rules: this repo's database and no other. Refuse before the first write.
if (REF !== PLATFORM || !URL_.includes(`${PLATFORM}.supabase.co`)) {
  console.error(`Refusing: project is ${REF} / ${URL_}, not ${PLATFORM}. Nothing was written.`);
  process.exit(1);
}

const BREAK = (process.argv.find((a) => a.startsWith("--break=")) || "").slice(8);
const TABLE = BREAK === "no-table" ? "action_log_never_applied" : "action_log";
const started = new Date();
const tag = started.getTime().toString(36);
const SLUG = `action-log-${tag}`;
const OWNER = { email: `action-log-${tag}@fixture.test`, password: `Fx-${tag}-${Math.random().toString(36).slice(2)}` };
const H = { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, "Content-Type": "application/json" };

let assertions = 0;
const failures = [];
const check = (label, ok, detail = "") => {
  assertions++;
  if (!ok) failures.push(`${label}${detail ? ` — ${detail}` : ""}`);
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${label}${!ok && detail ? `\n          ${detail}` : ""}`);
  return ok;
};

const rest = async (path, init = {}, headers = H) => {
  const r = await fetch(`${URL_}/rest/v1/${path}`, { ...init, headers: { ...headers, ...(init.headers || {}) } });
  const t = await r.text();
  let body = null;
  try { body = t ? JSON.parse(t) : null; } catch { body = t; }
  return { status: r.status, body };
};
const sql = async (query) => {
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query, read_only: true }),
  });
  const j = await r.json().catch(() => null);
  // A failed read is not an empty one (docs/gotchas.md): throw, never return [].
  if (!r.ok) throw new Error(`catalog query failed: ${r.status} ${JSON.stringify(j).slice(0, 200)}`);
  return j;
};

let biz = null, userId = null, jwt = null;
async function teardown() {
  if (biz) {
    await rest(`bookings?business_id=eq.${biz.id}`, { method: "DELETE" });
    await rest(`business_users?business_id=eq.${biz.id}`, { method: "DELETE" });
    await rest(`businesses?id=eq.${biz.id}`, { method: "DELETE" });
    biz = null;
  }
  if (userId) { await fetch(`${URL_}/auth/v1/admin/users/${userId}`, { method: "DELETE", headers: H }); userId = null; }
}
for (const sig of ["SIGINT", "SIGTERM"]) {
  process.on(sig, async () => { console.log(`\n${sig} — tearing down before exit`); await teardown(); process.exit(1); });
}

const press = async (bookingId, change) => {
  const r = await fetch(`${URL_}/functions/v1/update-booking`, {
    method: "POST",
    headers: { apikey: ANON, Authorization: `Bearer ${jwt}`, "Content-Type": "application/json" },
    body: JSON.stringify({ business_id: biz.id, booking_id: bookingId, ...change }),
  });
  return { status: r.status, body: await r.json().catch(() => null) };
};

// THE SEVEN ACTIONS' FIVE THAT GO THROUGH `update-booking` (`_shared/actionLog.ts`).
// Suspend and owner-invite are not this table's today; the entry says so.
const ACTIONS = [
  { key: "complete", change: { status: "completed" }, action: "job.complete", field: "status", from: "confirmed", to: "completed" },
  { key: "cancel", change: { status: "cancelled" }, action: "job.cancel", field: "status", from: "confirmed", to: "cancelled" },
  { key: "no-show", change: { status: "no_show" }, action: "job.no_show", field: "status", from: "confirmed", to: "no_show" },
  { key: "waive", change: { payment_status: "waived" }, action: "payment.waive", field: "payment_status", from: null, to: "waived" },
  { key: "delete", change: { soft_delete: true }, action: "job.delete", field: "deleted_at", from: null, to: "<a time>" },
];

/** Every way one expected action can fail to be on the rows. [] means it is there and right. */
function problemsWith(rows, want, subjectId, actorId) {
  const mine = rows.filter((r) => r.subject_id === subjectId && r.action === want.action);
  if (mine.length !== 1) return [`${mine.length} row(s) for ${want.action} on this booking, expected exactly 1`];
  const r = mine[0], p = [];
  if (r.actor_id !== actorId) p.push(`actor_id ${r.actor_id}, expected the owner ${actorId}`);
  if (r.actor_role !== "owner") p.push(`actor_role ${r.actor_role}, expected owner`);
  if (r.subject_table !== "bookings") p.push(`subject_table ${r.subject_table}`);
  const keys = (o) => Object.keys(o || {}).join(",");
  if (keys(r.before) !== want.field || keys(r.after) !== want.field) p.push(`holds ${keys(r.before)} -> ${keys(r.after)}, expected only ${want.field}`);
  if ((r.before?.[want.field] ?? null) !== (want.from === null ? null : want.from)) p.push(`before ${JSON.stringify(r.before)}, expected ${want.field}=${want.from}`);
  const after = r.after?.[want.field] ?? null;
  if (want.to === "<a time>" ? !(after && !Number.isNaN(Date.parse(after))) : after !== want.to) p.push(`after ${JSON.stringify(r.after)}, expected ${want.field}=${want.to}`);
  const at = Date.parse(r.created_at);
  if (!(at >= started.getTime() - 5000 && at <= Date.now() + 5000)) p.push(`created_at ${r.created_at} is outside this run`);
  return p;
}

let canary = { id: "an-action-never-pressed-has-no-row", observed_failure: false };
let found = 0, attempted = 0, completed = 0;
const dims = { project: REF, table: TABLE, break: BREAK || null, slug: SLUG };

try {
  console.log(`action_log, read off the database — project ${REF}${BREAK ? `\n*** --break=${BREAK}: this run is a sabotage, not a result ***` : ""}\n`);

  // ── 1. THE TABLE'S OWN LOCKS, READ-ONLY ───────────────────────────────────
  // migration-drift sees the table, grants and indexes; it cannot see RLS force
  // or triggers (its own warning line), so those are read here.
  console.log("1. the table is there, and locked the three ways its migration says");
  const [cat] = await sql(`
    select to_regclass('public.${TABLE}') is not null as exists,
      coalesce((select relrowsecurity from pg_class where oid = to_regclass('public.${TABLE}')), false) as rls,
      coalesce((select relforcerowsecurity from pg_class where oid = to_regclass('public.${TABLE}')), false) as forced,
      (select count(*)::int from pg_policies where schemaname = 'public' and tablename = '${TABLE}') as policies,
      (select coalesce(array_agg(tgname order by tgname), '{}') from pg_trigger where tgrelid = to_regclass('public.${TABLE}') and not tgisinternal) as triggers,
      case when to_regclass('public.${TABLE}') is null then null else
        has_table_privilege('anon', 'public.${TABLE}', 'select,insert,update,delete') or
        has_table_privilege('authenticated', 'public.${TABLE}', 'select,insert,update,delete') end as browser_privilege`);
  dims.catalog = cat;
  check("1a · the table exists in the live database", cat.exists === true);
  check("1b · row-level security is on AND forced", cat.rls === true && cat.forced === true, `rls ${cat.rls}, forced ${cat.forced}`);
  check("1c · with no policy at all", cat.policies === 0, `${cat.policies} policies`);
  check("1d · both append-only triggers are attached", ["action_log_no_truncate", "action_log_no_update_delete"].every((t) => (cat.triggers || []).includes(t)), `triggers ${JSON.stringify(cat.triggers)}`);
  check("1e · neither anon nor authenticated holds any privilege on it", cat.browser_privilege === false, `browser_privilege ${cat.browser_privilege}`);

  // ── 2. FIXTURE ────────────────────────────────────────────────────────────
  console.log("\n2. a throwaway business of its own, never demo-detail");
  const left = (await rest("businesses?slug=like.action-log-*&select=id,slug")).body ?? [];
  for (const b of left) {
    await rest(`bookings?business_id=eq.${b.id}`, { method: "DELETE" });
    await rest(`business_users?business_id=eq.${b.id}`, { method: "DELETE" });
    await rest(`businesses?id=eq.${b.id}`, { method: "DELETE" });
  }
  if (left.length) console.log(`  (swept ${left.length} business(es) a killed run left: ${left.map((b) => b.slug).join(", ")})`);
  biz = (await rest("businesses", { method: "POST", headers: { Prefer: "return=representation" },
    body: JSON.stringify([{ slug: SLUG, name: "Action Log Fixture", timezone: "America/Los_Angeles", contact_email: OWNER.email, is_demo: true }]) })).body?.[0] ?? null;
  dims.business_id = biz?.id ?? null;
  check("2a · the fixture business exists and is not demo-detail", !!biz?.id && biz.slug === SLUG);
  const u = await (await fetch(`${URL_}/auth/v1/admin/users`, { method: "POST", headers: H, body: JSON.stringify({ ...OWNER, email_confirm: true }) })).json();
  userId = u?.id ?? null;
  const m = await rest("business_users", { method: "POST", body: JSON.stringify([{ business_id: biz.id, user_id: userId, role: "owner" }]) });
  jwt = (await (await fetch(`${URL_}/auth/v1/token?grant_type=password`, {
    method: "POST", headers: { apikey: ANON, "Content-Type": "application/json" }, body: JSON.stringify(OWNER) })).json()).access_token;
  check("2b · it has an owner who is a member and can sign in", !!userId && m.status < 300 && !!jwt, `member insert ${m.status}`);
  const yesterday = new Date(Date.now() - 86400000); yesterday.setUTCHours(17, 0, 0, 0);
  const rows = [...ACTIONS.map((a) => a.key), "untouched"].map((k, i) => ({
    business_id: biz.id, customer_name: `Fixture ${k}`, customer_phone: "555-0100", customer_email: null,
    service_type: "dropoff", status: "confirmed",
    start_at: new Date(yesterday.getTime() + i * 3600000).toISOString(),
    end_at: new Date(yesterday.getTime() + i * 3600000 + 1800000).toISOString(),
  }));
  const made = (await rest("bookings", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify(rows) })).body;
  const byKey = Object.fromEntries((Array.isArray(made) ? made : []).map((b) => [b.customer_name.slice(8), b]));
  check("2c · six bookings, confirmed, no customer email", Object.keys(byKey).length === 6 && Object.values(byKey).every((b) => b.status === "confirmed" && !b.customer_email),
    JSON.stringify(made).slice(0, 200));
  for (const a of ACTIONS) a.from = a.field === "status" ? "confirmed" : a.field === "payment_status" ? byKey[a.key]?.payment_status ?? null : null;

  // ── 3. PRESS EACH ONE THROUGH THE DEPLOYED FUNCTION ───────────────────────
  // The same call the job record makes. The transition itself is read back
  // from the booking, so "the audit landed" can never stand in for "the job
  // still did what it did before" (criterion 4).
  console.log("\n3. each action pressed once, through the deployed update-booking");
  for (const a of ACTIONS) {
    if (BREAK === "skip-cancel" && a.key === "cancel") { console.log("  (sabotage: cancel NOT pressed)"); continue; }
    attempted++;
    const r = await press(byKey[a.key].id, a.change);
    check(`3 · ${a.key}: answered 200 with no audit_recorded:false`, r.status === 200 && r.body?.success === true && r.body?.audit_recorded === undefined,
      `${r.status} ${JSON.stringify(r.body).slice(0, 160)}`);
    const now = (await rest(`bookings?id=eq.${byKey[a.key].id}&select=status,payment_status,deleted_at`)).body?.[0] ?? {};
    const moved = a.field === "deleted_at" ? !!now.deleted_at : now[a.field] === a.to;
    check(`3 · ${a.key}: the booking itself reads ${a.field} = ${a.to}`, moved, JSON.stringify(now));
  }
  // Nothing moved, so nothing is owed — a second "complete" on a completed job.
  const again = await press(byKey.complete.id, { status: "completed" });
  check("3 · a write that moves nothing answers 200", again.status === 200 && again.body?.success === true, `${again.status} ${JSON.stringify(again.body).slice(0, 120)}`);

  // ── 4. THE ROWS, READ OFF THE TABLE ───────────────────────────────────────
  console.log("\n4. the rows, read off the table with the service role");
  const got = await rest(`${TABLE}?business_id=eq.${biz.id}&order=created_at`);
  const logged = Array.isArray(got.body) ? got.body : [];
  dims.rows = logged.map((r) => ({ action: r.action, before: r.before, after: r.after, actor_role: r.actor_role, created_at: r.created_at }));
  check("4 · the read itself succeeded", got.status === 200, `${got.status} ${JSON.stringify(got.body).slice(0, 160)}`);
  check(`4 · exactly ${ACTIONS.length} rows for this business — one per action, none for the write that moved nothing`, logged.length === ACTIONS.length, `${logged.length} rows`);
  for (const a of ACTIONS) {
    const p = problemsWith(logged, a, byKey[a.key]?.id, userId);
    if (p.length === 0) { found++; completed++; }
    check(`4 · ${a.key}: one ${a.action} row, the owner as actor, ${a.field} ${a.from} -> ${a.to}, stamped in this run`, p.length === 0, p.join("; "));
  }
  check("4 · no row carries a customer's name or phone", !JSON.stringify(logged).includes("Fixture ") && !JSON.stringify(logged).includes("555-0100"));
  // THE CANARY, EVERY RUN: the same matcher, handed an action that was never
  // pressed on a booking that exists, must report it missing. If it does not,
  // every PASS above could be the matcher finding something it should not.
  canary.observed_failure = problemsWith(logged, ACTIONS[0], byKey.untouched?.id, userId).length > 0
    && problemsWith(logged, ACTIONS[0], byKey.complete?.id, "00000000-0000-0000-0000-000000000000").length > 0;
  check("4 · CANARY: an untouched booking has no row, and the owner's row does not match a stranger", canary.observed_failure);

  // ── 5. THE REFUSALS ───────────────────────────────────────────────────────
  console.log("\n5. what must be refused");
  const asAnon = { apikey: ANON, Authorization: `Bearer ${ANON}`, "Content-Type": "application/json" };
  const asOwner = { apikey: ANON, Authorization: `Bearer ${jwt}`, "Content-Type": "application/json" };
  const a1 = await rest(`${TABLE}?select=id&limit=1`, {}, asAnon);
  check("5a · a visitor with only the public key cannot read it", a1.status >= 400, `${a1.status} ${JSON.stringify(a1.body).slice(0, 120)}`);
  const a2 = await rest(`${TABLE}?select=id&limit=1`, {}, asOwner);
  check("5b · a signed-in owner cannot read it from the browser", a2.status >= 400, `${a2.status} ${JSON.stringify(a2.body).slice(0, 120)}`);
  const a3 = await rest(TABLE, { method: "POST", body: JSON.stringify([{ business_id: biz.id, actor_id: userId, actor_role: "owner", action: "forged", subject_table: "bookings", subject_id: byKey.untouched?.id, before: {}, after: {} }]) }, asOwner);
  check("5c · a signed-in owner cannot write a forged row", a3.status >= 400, `${a3.status} ${JSON.stringify(a3.body).slice(0, 120)}`);
  const target = logged[0];
  if (target) {
    // Even the service role, which bypasses RLS, is refused by the trigger.
    // The PATCH writes the value the row already holds, so a missing trigger
    // would still change nothing.
    const up = await rest(`${TABLE}?id=eq.${target.id}`, { method: "PATCH", body: JSON.stringify({ actor_role: target.actor_role }) });
    check("5d · the service role cannot UPDATE a row — the trigger refuses", up.status >= 400 && /append-only/.test(JSON.stringify(up.body)), `${up.status} ${JSON.stringify(up.body).slice(0, 160)}`);
    const del = await rest(`${TABLE}?id=eq.${target.id}`, { method: "DELETE" });
    check("5e · the service role cannot DELETE a row — the trigger refuses", del.status >= 400 && /append-only/.test(JSON.stringify(del.body)), `${del.status} ${JSON.stringify(del.body).slice(0, 160)}`);
    const still = (await rest(`${TABLE}?id=eq.${target.id}&select=id`)).body;
    check("5f · and the row is still there", Array.isArray(still) && still.length === 1);
  } else {
    check("5d-f · a row to try UPDATE and DELETE on", false, "no row was found, so the trigger could not be asked");
  }
} catch (e) {
  check("the run completed without throwing", false, e.stack || String(e));
} finally {
  await teardown();
}

const ok = failures.length === 0;
writeReceipt({
  check_id: "action-log-live",
  started_at: started.toISOString(),
  status: ok ? "pass" : "fail",
  expected_targets: ACTIONS.length,
  discovered_targets: found,
  attempted_targets: attempted,
  completed_targets: completed,
  skipped_targets: 0,
  assertions_executed: assertions,
  min_assertions: 25,
  failures,
  dimensions: dims,
  artifacts: ["scripts/action-log-live.mjs"],
  warnings: [
    "Suspend and owner-invite do not write action_log: suspend writes platform_admin_events (RLS-forced, but no append-only trigger), and an owner invite is a business_invites row. Not measured here.",
    `${ok ? ACTIONS.length : "Up to " + ACTIONS.length} action_log rows from this run are permanent by design (the table refuses DELETE); they name business ${dims.business_id} and hold no personal data.`,
  ],
  canary,
});
console.log(`\n${ok ? "PASS" : "FAIL"} — ${assertions} assertions, ${failures.length} failed; ${completed} of ${ACTIONS.length} actions verified off the rows.`);
process.exit(ok ? 0 : 1);
