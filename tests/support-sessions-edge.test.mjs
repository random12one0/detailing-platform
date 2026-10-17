// ROADMAP 4.3c — EDGE FUNCTIONS REFUSE A READ-ONLY SUPPORT SESSION. Credential-free: no .env, no
// network, no database. Reads the function sources and imports `_shared/supportSession.ts` (Node 24
// strips the types).
//
//   node --test tests/support-sessions-edge.test.mjs
//   BREAK=fail-open node tests/support-sessions-edge.test.mjs   # a failed marker read ALLOWS the write
//   BREAK=no-gate   node tests/support-sessions-edge.test.mjs   # requireMember stops asking
//   BREAK=unmarked  node tests/support-sessions-edge.test.mjs   # impersonate hands over a session with no id
//   BREAK=no-expiry node tests/support-sessions-edge.test.mjs   # 97.15: a marker past its deadline still counts as live
//   BREAK=refresh   node tests/support-sessions-edge.test.mjs   # 97.15: impersonate hands the refresh token back again
//
// Edge functions run as the service role, so the database rules in
// 20261010030000_support_sessions_read_only.sql never see their writes. Every function that
// authenticates a USER is discovered here (not listed), and each must be one of:
//   - a requireMember caller WITHOUT `allowSupport` — refused by default inside requireMember;
//   - a requireMember caller WITH `allowSupport`, and named in READ_ONLY below, which is an
//     EQUALITY: opting a function in is a decision somebody has to write down here;
//   - a function that calls getUser itself AND asks `supportSession(token)`.
// BREAK is an env var because `node --test` swallows flags (docs/gotchas.md 104). Sabotage is aimed
// at the PRODUCTION source, loaded from a modified temp copy, never at a copy kept in this file.

import { readFileSync, readdirSync, writeFileSync, mkdtempSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { test } from "node:test";
import assert from "node:assert/strict";
import { writeReceipt } from "../scripts/receipt.mjs";

const FN = "supabase/functions";
const BREAK = process.env.BREAK || "";
const started_at = new Date().toISOString();

// Functions allowed to serve a support session, each with why. Equality, not a ceiling.
const READ_ONLY = {
  "booking-ics": "builds a calendar file from a booking; writes nothing",
  "forecast": "reads the weather; writes only the platform-wide weather cache, no business record",
  "preview-emails": "renders email previews; sends and stores nothing",
  "photo-door": "only its `urls` action (viewing photos); start and remove stay refused",
};
// measured 2026-10-10 at 21; 22 since google-business (99.1, d64bc41f) — a requireMember caller
// refused by default, re-counted 2026-10-17 by 97.15, which found this line red on HEAD.
const EXPECTED_USER_AUTH = 22;

let sessionSrc = readFileSync(`${FN}/_shared/supportSession.ts`, "utf8");
let tenantSrc = readFileSync(`${FN}/_shared/tenant.ts`, "utf8");
if (BREAK === "fail-open") sessionSrc = sessionSrc.replace(`? "none" : "live";`, `? "none" : "none";`);
if (BREAK === "no-gate") tenantSrc = tenantSrc.replace("if (!supportAdmits(state, !!opts.allowSupport)) {", "if (false) {");
if (BREAK === "no-expiry") sessionSrc = sessionSrc.replace("ends <= Date.now() ?", "false ?");
const tmp = mkdtempSync(path.join(tmpdir(), "support-edge-"));
writeFileSync(path.join(tmp, "supportSession.ts"), sessionSrc);
const { sessionIdOf, isSupportSession, supportSessionState, supportAdmits } = await import(pathToFileURL(path.join(tmp, "supportSession.ts")).href);

let assertions = 0;
const failures = [];
const check = (name, cond, detail = "") => {
  assertions++;
  if (cond) console.log(`  ok    ${name}`);
  else { failures.push(`${name} ${detail}`.trim()); console.error(`  FAIL  ${name} ${detail}`); }
};
const jwt = (claims) => `h.${Buffer.from(JSON.stringify(claims)).toString("base64url")}.s`;
const SID = "44444444-4444-4444-4444-444444444444";
const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

test("4.3c · edge functions refuse a read-only support session; the owner's own session passes", async () => {
  // 1. The decision itself, against the production function.
  check("session id is read from the token", sessionIdOf(jwt({ sub: "u", session_id: SID })) === SID);
  check("a token with no session id is not a support session (and the marker is not asked)",
    (await isSupportSession(jwt({ sub: "u" }), async () => { throw new Error("asked"); })) === false);
  check("a listed session IS a support session",
    (await isSupportSession(jwt({ session_id: SID }), async () => ({ data: { session_id: SID }, error: null }))) === true);
  check("the owner's own session (not listed) is NOT a support session",
    (await isSupportSession(jwt({ session_id: "other" }), async () => ({ data: null, error: null }))) === false);
  check("a marker read that fails counts as a support session (fails closed)",
    (await isSupportSession(jwt({ session_id: SID }), async () => ({ data: null, error: { code: "08006", message: "connection" } }))) === true);
  check("no marker table at all (migration not yet applied) is not a support session",
    (await isSupportSession(jwt({ session_id: SID }), async () => ({ data: null, error: { code: "PGRST205" } }))) === false);

  // 1b. ROADMAP 97.15 — the deadline. A back-dated marker, as the item asks: opened 31 minutes ago.
  const at31 = { session_id: SID, created_at: new Date(Date.now() - 31 * 60e3).toISOString(), expires_at: new Date(Date.now() - 60e3).toISOString() };
  const backDated = await supportSessionState(jwt({ session_id: SID }), async () => ({ data: at31, error: null }));
  check("97.15: a marker 1 minute past its deadline is an EXPIRED support session", backDated === "expired", backDated);
  check("97.15: requireMember's rule refuses an expired support session even where support is allowed", supportAdmits("expired", true) === false && supportAdmits("expired", false) === false);
  check("97.15: an expired session is still a support session (writes stay refused everywhere)",
    (await isSupportSession(jwt({ session_id: SID }), async () => ({ data: at31, error: null }))) === true);
  const fresh = await supportSessionState(jwt({ session_id: SID }), async () => ({ data: { session_id: SID, expires_at: new Date(Date.now() + 29 * 60e3).toISOString() }, error: null }));
  check("97.15: a marker inside its 30 minutes is live, admitted only where support is allowed", fresh === "live" && supportAdmits("live", true) && !supportAdmits("live", false), fresh);
  check("97.15: a marker with no deadline (column not yet applied) is live, not expired",
    (await supportSessionState(jwt({ session_id: SID }), async () => ({ data: { session_id: SID }, error: null }))) === "live");
  check("97.15: the owner's own session is admitted", supportAdmits(await supportSessionState(jwt({ session_id: "other" }), async () => ({ data: null, error: null })), false) === true);

  // 2. requireMember asks, before it reads any membership, and only allowSupport skips it.
  const gate = tenantSrc.indexOf("if (!supportAdmits(state, !!opts.allowSupport))");
  const membership = tenantSrc.indexOf(`from("business_users").select("business_id, role, permissions")`);
  check("requireMember refuses a support session before reading membership", gate > 0 && gate < membership, `gate@${gate} membership@${membership}`);
  const gateBlock = tenantSrc.slice(gate, membership);
  check("97.15: requireMember ends an expired session at Auth (local scope only)", gateBlock.includes(`if (state === "expired") await supabase.auth.admin.signOut(token, "local")`));
  check("97.15: the marker is read with * so a missing expires_at column cannot fail every read", tenantSrc.includes(`from("support_sessions").select("*")`));

  // 3. Every function that authenticates a user, discovered from source.
  const fns = readdirSync(FN).filter((d) => !d.startsWith("_") && existsSync(`${FN}/${d}/index.ts`));
  const userAuth = [];
  const classify = (name, src) => {
    const s = stripComments(src);
    if (/auth\.getUser\(/.test(s)) return /supportSession\(token\)/.test(s) ? "own getUser + supportSession" : "UNGUARDED getUser";
    if (!/\brequireMember\b/.test(s)) return null;
    const optsIn = /allowSupport:\s*true/.test(s);
    if (name === "photo-door") return "requireMember via photoDoor (urls only)";
    if (!optsIn) return "requireMember, refused by default";
    return READ_ONLY[name] ? "requireMember, opted in as read-only" : "OPTED IN WITHOUT A RECORDED REASON";
  };
  for (const d of fns) {
    const verdict = classify(d, readFileSync(`${FN}/${d}/index.ts`, "utf8"));
    if (verdict) userAuth.push({ fn: d, verdict });
  }
  check(`discovered exactly ${EXPECTED_USER_AUTH} user-authenticating functions`, userAuth.length === EXPECTED_USER_AUTH, `found ${userAuth.length}: ${userAuth.map((u) => u.fn).join(" ")}`);
  for (const u of userAuth) check(`${u.fn}: ${u.verdict}`, !/UNGUARDED|WITHOUT/.test(u.verdict));
  const optedIn = userAuth.filter((u) => /opted in|urls only/.test(u.verdict)).map((u) => u.fn).sort();
  check("the functions that may serve a support session are exactly the recorded read-only list", JSON.stringify(optedIn) === JSON.stringify(Object.keys(READ_ONLY).sort()), JSON.stringify(optedIn));
  const door = stripComments(readFileSync(`${FN}/_shared/photoDoor.ts`, "utf8"));
  check("photo-door lets a support session through for `urls` only", /requireMember\(req, businessId, \{ allowSupport: action === "urls" \}\)/.test(door));

  // 4. impersonate marks the session BEFORE handing it over, and refuses without an id.
  let pa = stripComments(readFileSync(`${FN}/platform-admin/index.ts`, "utf8"));
  if (BREAK === "unmarked") pa = pa.replace("if (exErr || !session || !sid)", "if (exErr || !session)");
  if (BREAK === "refresh") pa = pa.replace("access_token: session.access_token, expires_at", "access_token: session.access_token, refresh_token: session.refresh_token, expires_at");
  const imp = pa.slice(pa.indexOf('action === "impersonate"'));
  const at = (s) => imp.indexOf(s);
  check("impersonate exchanges the link on a fresh client, not the shared service-role one", /createClient\(SUPABASE_URL, anon/.test(imp) && at("verifyOtp(") > 0);
  check("impersonate refuses when the token carries no session id", imp.includes("if (exErr || !session || !sid) return json({ error: fail }, 500)"));
  check("the marker is written before the tokens are returned", at('from("support_sessions").insert') > 0 && at('from("support_sessions").insert') < at("access_token: session.access_token"));
  check("a marker that did not land ends the session and hands nothing over", /if \(markErr \|\| !mark\?\.expires_at\) \{[^}]*signOut\(session\.access_token[\s\S]*?return json\(\{ error: fail \}, 500\)/.test(imp));
  check("97.15: the view-as answer carries NO refresh token", !/refresh_token/.test(imp), (imp.match(/.{0,60}refresh_token.{0,40}/) || [""])[0]);
  check("97.15: the view-as answer carries the marker's deadline", imp.includes("expires_at: mark.expires_at") && imp.includes(`.select("expires_at").single()`));
  check("the audit row is still written before the link is made", imp.indexOf('logIt(admin, "impersonate"') < at("generateLink("));
  const entry = readFileSync("app/src/admin/PreviewEntry.jsx", "utf8");
  check("97.15: the preview door takes the server's session WITHOUT a refresh token", /setSession\(\{ access_token: at, refresh_token: NO_REFRESH \}\)/.test(entry) && !/q\.get\("rt"\)/.test(entry));
  const panel = readFileSync("app/src/admin/office/DetailerPanel.jsx", "utf8");
  check("97.15: the back office never passes a refresh token to the preview tab", !/refresh_token|[#&]rt=/.test(panel), (panel.match(/.{0,40}(refresh_token|rt=).{0,20}/) || [""])[0]);
  check("97.15: ending the view signs out THIS session only (local scope)", /signOut\(\{ scope: "local" \}\)/.test(readFileSync("app/src/lib/supabase.js", "utf8")));
  const client = readFileSync("app/src/lib/supabase.js", "utf8");
  check("the browser guard also covers auth.updateUser in a preview tab", /supabase\.auth\.updateUser = \(\.\.\.args\) => \{ guardWrite\(\);/.test(client));

  // CANARY, every run: a function that checks the user itself and forgets the support question.
  const canary = classify("canary", `const { data } = await supabase.auth.getUser(token); await supabase.from("x").insert({});`);
  const canaryCaught = canary === "UNGUARDED getUser";
  check("canary: an unguarded getUser function is caught", canaryCaught, canary);

  writeReceipt({
    check_id: "support-sessions-edge",
    started_at,
    status: failures.length ? "fail" : "pass",
    expected_targets: EXPECTED_USER_AUTH,
    discovered_targets: userAuth.length,
    attempted_targets: userAuth.length,
    completed_targets: userAuth.filter((u) => !/UNGUARDED|WITHOUT/.test(u.verdict)).length,
    skipped_targets: 0,
    assertions_executed: assertions,
    min_assertions: 7 + 6 + 3 + EXPECTED_USER_AUTH + 3 + 9 + 2,
    assertion_floor: "structural: six decision cases, six 97.15 deadline cases, three gate checks, one per discovered function, three fixed checks, nine on the impersonate hand-over, two on the browser",
    failures,
    canary: { id: "unguarded-getUser", observed_failure: canaryCaught },
    artifacts: ["supabase/functions/_shared/supportSession.ts"],
    dimensions: { break: BREAK || undefined, functions: Object.fromEntries(userAuth.map((u) => [u.fn, u.verdict])) },
  });
  assert.deepEqual(failures, []);
});
