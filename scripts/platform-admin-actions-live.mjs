// ROADMAP 9.14b — DOES THE *DEPLOYED* platform-admin KNOW THE TWO COST ACTIONS,
// AND DOES IT STILL ANSWER A NON-ADMIN WITH THE BARE 404?
//
//   node scripts/platform-admin-actions-live.mjs                 (no dev server needed)
//   node scripts/platform-admin-actions-live.mjs --break=typo    # sabotage: ask for an action the function does not have
//   node scripts/receipt.mjs receipts/platform-admin-actions-live.json
//
// It deploys nothing. WHAT IT TOUCHES, so a lane statement can name it:
//   * The deployed `platform-admin` over HTTPS, as a throwaway platform admin,
//     as a throwaway ordinary signed-in user, with no sign-in, and with the
//     public key as the bearer.
//   * Two throwaway auth accounts (`scripts/admin-account.mjs`), both deleted in `finally`.
//   * NO COST ROW IS WRITTEN. `platform_cost_add` is sent with a NEGATIVE amount,
//     which `costEntry` refuses with a 400 sentence BEFORE the insert is reached.
//     That sentence is the proof the action is recognized: a function that does
//     not know the action answers `Unknown action` instead.
//   * `platform_net` is a read, asked about January 2020, a month nobody has costs for.
//
// WHY THE ADMIN HAS TO BE THE ONE ASKING. A non-admin gets the same 404 for every
// action, known or not (that is the point of the gate), so only an admin's
// answer can tell a deployed action from an absent one.

import "../tests/_env.mjs";
import { writeReceipt } from "./receipt.mjs";
import { dropAdmin, makeAdmin } from "./admin-account.mjs";

const URL_ = process.env.SUPABASE_URL;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON = process.env.SUPABASE_ANON_KEY;
const REF = process.env.SUPABASE_PROJECT_REF;
const PLATFORM = "kguqylyzgyzfktkfnhjb";
if (!URL_ || !SERVICE || !ANON || !REF) {
  console.error("Missing SUPABASE_URL / _SERVICE_ROLE_KEY / _ANON_KEY / _PROJECT_REF. Nothing measured, no receipt written.");
  process.exit(1);
}
if (REF !== PLATFORM || !URL_.includes(`${PLATFORM}.supabase.co`)) {
  console.error(`Refusing: project is ${REF}, not ${PLATFORM}. Nothing was touched.`);
  process.exit(1);
}

const BREAK = (process.argv.find((a) => a.startsWith("--break=")) || "").slice(8);
const ADMIN_EMAIL = "platform-admin-actions-live-test@detailplatform.com"; // mail-sink: a login; autoconfirm is on, no mail
const USER_EMAIL = "platform-admin-actions-live-user@detailplatform.com"; // mail-sink: a login; autoconfirm is on, no mail
const COST_ACTION = BREAK === "typo" ? "platform_cost_addd" : "platform_cost_add";
const BAD_COST = { action: COST_ACTION, period_month: "2020-01", category: "hosting", amount_cents: -1 };

const started = new Date();
let assertions = 0;
const failures = [];
const check = (label, ok, detail = "") => {
  assertions++;
  if (!ok) failures.push(`${label}${detail ? ` — ${detail}` : ""}`);
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${label}${!ok && detail ? `\n          ${detail}` : ""}`);
  return ok;
};
const call = async (bearer, body) => {
  const r = await fetch(`${URL_}/functions/v1/platform-admin`, {
    method: "POST",
    headers: { apikey: ANON, "Content-Type": "application/json", ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}) },
    body: JSON.stringify(body),
  });
  const text = await r.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* keep the text */ }
  return { status: r.status, text, json };
};
const signIn = async (email, password) =>
  (await (await fetch(`${URL_}/auth/v1/token?grant_type=password`, {
    method: "POST", headers: { apikey: ANON, "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) })).json()).access_token;
const dropByEmail = async (email) => {
  const all = await (await fetch(`${URL_}/auth/v1/admin/users?per_page=1000`, { headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}` } })).json().catch(() => ({}));
  const left = (all.users ?? []).find((u) => u.email === email);
  if (left) await dropAdmin(URL_, SERVICE, left.id);
};

console.log(`platform-admin, deployed — project ${REF}${BREAK ? `\n*** --break=${BREAK}: this run is a sabotage, not a result ***` : ""}\n`);

const dims = { project: REF, break: BREAK || null, responses: {} };
const canary = { id: "an action the function does not have must read as unrecognized, or 'recognized' proves nothing", observed_failure: false };
const expected = ["admin", "non-admin"];
let completed = 0;
let admin = null;
let plainId = null;
try {
  await dropByEmail(ADMIN_EMAIL);
  await dropByEmail(USER_EMAIL);

  // ── 1. AS A PLATFORM ADMIN ─────────────────────────────────────────────────
  console.log("1. as a throwaway platform admin");
  admin = await makeAdmin(URL_, SERVICE, ADMIN_EMAIL);
  const adminJwt = admin && await signIn(admin.email, admin.password);
  check("1a · a throwaway platform admin exists and is signed in", !!adminJwt);

  const bogus = await call(adminJwt, { action: "platform_net_does_not_exist" });
  dims.responses.admin_bogus = { status: bogus.status, body: bogus.text.slice(0, 120) };
  canary.observed_failure = bogus.status === 400 && bogus.json?.error === "Unknown action";
  check("1b · CANARY: an action that does not exist is answered 400 'Unknown action'", canary.observed_failure, bogus.text.slice(0, 120));

  const net = await call(adminJwt, { action: "platform_net", period: "2020-01" });
  dims.responses.platform_net = { status: net.status, period_month: net.json?.period_month, net_cents: net.json?.net_cents ?? null, keys: Object.keys(net.json ?? {}) };
  check("1c · platform_net is recognized: 200", net.status === 200, net.text.slice(0, 160));
  check("1d · platform_net answers for the month asked (period_month 2020-01-01)", net.json?.period_month === "2020-01-01", net.text.slice(0, 160));
  check("1e · a month with no costs entered has NO numeric net (net_cents null)", net.json?.net_cents === null, net.text.slice(0, 160));

  const cost = await call(adminJwt, BAD_COST);
  dims.responses.platform_cost_add = { status: cost.status, body: cost.text.slice(0, 160) };
  check("1f · platform_cost_add is recognized: its own refusal sentence, not 'Unknown action'",
    cost.status === 400 && cost.json?.error === "The amount cannot be below zero.", `${cost.status} ${cost.text.slice(0, 160)}`);
  check("1g · …and the refusal means nothing was written (400, no id in the answer)", cost.status === 400 && cost.json?.id === undefined && cost.json?.success === undefined);
  completed++;

  // ── 2. EVERYONE ELSE ───────────────────────────────────────────────────────
  console.log("\n2. non-admin callers");
  const plain = await makeAdmin(URL_, SERVICE, USER_EMAIL);
  plainId = plain?.id;
  // makeAdmin adds the platform_admins row; this account must be ORDINARY.
  if (plain) await fetch(`${URL_}/rest/v1/platform_admins?user_id=eq.${plain.id}`, { method: "DELETE", headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}` } });
  const plainJwt = plain && await signIn(plain.email, plain.password);
  check("2a · a throwaway ordinary user exists and is signed in", !!plainJwt);
  const callers = { no_sign_in: null, public_key_bearer: ANON, ordinary_user: plainJwt };
  const seen = new Set();
  const gateway = new Set();
  for (const [who, bearer] of Object.entries(callers)) {
    for (const body of [{ action: "platform_net", period: "2020-01" }, BAD_COST, { action: "platform_net_does_not_exist" }, { action: "whoami" }]) {
      const r = await call(bearer, body);
      dims.responses[`${who}:${body.action}`] = { status: r.status, body: r.text.slice(0, 80) };
      if (!bearer) {
        // NO Authorization header at all: Supabase's gateway answers 401 before the
        // function runs, for every action alike. Not the function's doing, and it is
        // asserted separately so it cannot hide inside the 404 identity check.
        gateway.add(`${r.status} ${r.text}`);
        check(`2 · ${who} → ${body.action}: gateway 401, never reaches the function`, r.status === 401 && r.json?.code === "UNAUTHORIZED_NO_AUTH_HEADER", `${r.status} ${r.text.slice(0, 120)}`);
        continue;
      }
      seen.add(`${r.status} ${r.text}`);
      check(`2 · ${who} → ${body.action}: 404 {"error":"Not found"}`, r.status === 404 && r.json?.error === "Not found" && Object.keys(r.json).length === 1, `${r.status} ${r.text.slice(0, 120)}`);
    }
  }
  check("2y · the 4 no-header answers are byte-identical to each other (the gateway does not distinguish actions)", gateway.size === 1, [...gateway].join(" | ").slice(0, 200));
  check("2z · all 8 non-admin answers that reach the function are byte-identical (nothing tells a known action from an unknown one)", seen.size === 1, [...seen].join(" | ").slice(0, 200));
  completed++;
} catch (e) {
  check("the run completed without throwing", false, String(e.stack || e).slice(0, 400));
} finally {
  if (admin) await dropAdmin(URL_, SERVICE, admin.id);
  if (plainId) await dropAdmin(URL_, SERVICE, plainId);
  console.log("\nthrowaway accounts deleted");
}

const ok = failures.length === 0 && canary.observed_failure && completed === expected.length;
writeReceipt({
  check_id: "platform-admin-actions-live",
  started_at: started.toISOString(),
  status: ok ? "pass" : "fail",
  expected_targets: expected.length,
  discovered_targets: expected.length,
  attempted_targets: expected.length,
  completed_targets: completed,
  skipped_targets: 0,
  assertions_executed: assertions,
  min_assertions: 20,
  failures,
  dimensions: dims,
  artifacts: ["scripts/platform-admin-actions-live.mjs", "supabase/functions/platform-admin/index.ts"],
  warnings: [
    "This asks the RUNNING function; it cannot say which version number or commit it is. 'Recognizes the action' is shown by the function's own answer, not by comparing source.",
    "platform_cost_add is shown by its VALIDATION refusal. The insert path (a real row saving) is 9.14c's real bill, deliberately not exercised here.",
  ],
  canary,
});
console.log(`\n${ok ? "PASS" : "FAIL"} — ${assertions} assertions, ${failures.length} failed; ${completed} of ${expected.length} targets; canary ${canary.observed_failure ? "caught" : "MISSED"}.`);
process.exit(ok ? 0 : 1);
