// ROADMAP 4.3a — THE TWO SUPABASE QUESTIONS THE SUPPORT-SESSION DESIGN RESTS ON,
// ANSWERED ON A THROWAWAY USER RATHER THAN BELIEVED.
//
//   node scripts/support-session-fixture.mjs
//   node scripts/support-session-fixture.mjs --break=strip-sid   # sabotage
//   node scripts/support-session-fixture.mjs --break=reuse       # sabotage
//
// `docs/design-4.3-support-session.md` recommends Option 2: `platform-admin`
// exchanges the magic link ITSELF and marks the resulting session by its id
// before the browser holds it. That is only possible if (1) the access token
// carries a session id and (2) the server can exchange a generated link token.
// The design tagged both UNTESTED. This answers both, plus the four properties
// the marker needs to be sound: the id names a real `auth.sessions` row, it
// survives a refresh, a second ordinary sign-in gets a DIFFERENT id, and the
// link is one-use so the browser cannot be handed something still live.
//
// WHAT IT TOUCHES. Project kguqylyzgyzfktkfnhjb only — it refuses any other.
// One auth user `support-fixture-<n>@example.com`, no business, no
// `business_users` row, so no tenant table, policy or demo row is in reach
// (measured: no trigger on auth.users or auth.sessions). No email is sent —
// `generateLink` returns the link instead of mailing it. The user is deleted at
// the end, and a leftover from a killed run (`finally` does not run on SIGTERM,
// docs/gotchas.md 90) is swept at the start. NO token is ever printed: only
// claim NAMES, booleans and an 8-character id prefix.
//
// CANARY: the same `sessionIdOf` the real questions use is handed a token whose
// `session_id` was removed, and must answer "none". `--break=strip-sid` does
// that to the REAL token, which is the original unknown — a token with no id —
// and must turn question 1 red. `--break=reuse` exchanges an already-used link
// and must turn question 3 red.

import "../tests/_env.mjs";
import { createRequire } from "node:module";
import { writeFileSync } from "node:fs";
import { writeReceipt } from "./receipt.mjs";

const { createClient } = createRequire(import.meta.url)("../app/node_modules/@supabase/supabase-js");

const BREAK = (process.argv.find((a) => a.startsWith("--break=")) || "").split("=")[1] || "";
const REF = "kguqylyzgyzfktkfnhjb";
const URL_ = process.env.SUPABASE_URL;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON = process.env.SUPABASE_ANON_KEY;
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
if (!URL_ || !SERVICE || !ANON || !TOKEN) throw new Error("Missing SUPABASE_URL / SERVICE_ROLE / ANON / ACCESS_TOKEN in .env");
if (!URL_.includes(REF)) throw new Error(`Refusing: SUPABASE_URL is not project ${REF}`);

const started_at = new Date().toISOString();
const PREFIX = "support-fixture-";
const opts = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient(URL_, SERVICE, opts);
const fresh = () => createClient(URL_, ANON, opts);

const sql = async (query) => {
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query, read_only: true }),
  });
  const j = await r.json().catch(() => null);
  if (!r.ok) throw new Error(`query failed: ${r.status} ${JSON.stringify(j).slice(0, 200)}`);
  return j;
};

// THE INSTRUMENT — used by the questions and by the canary alike.
const claimsOf = (jwt) => JSON.parse(Buffer.from(String(jwt).split(".")[1] || "", "base64url").toString("utf8") || "{}");
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const sessionIdOf = (jwt) => {
  const sid = claimsOf(jwt).session_id;
  return typeof sid === "string" && UUID.test(sid) ? sid : null;
};
const stripSid = (jwt) => {
  const [h, , s] = jwt.split(".");
  const c = claimsOf(jwt); delete c.session_id;
  return [h, Buffer.from(JSON.stringify(c)).toString("base64url"), s].join(".");
};
const short = (id) => (id ? id.slice(0, 8) + "…" : "none");

const results = [];
const ask = (id, ok, detail) => {
  results.push({ id, ok: !!ok, detail });
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${id} — ${detail}`);
};

// A server-side exchange of a freshly generated link, exactly as Option 2's
// `impersonate` would do it.
async function mint(email) {
  const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email });
  if (error) throw new Error("generateLink: " + error.message);
  return data.properties.hashed_token;
}
const exchange = (token_hash) => fresh().auth.verifyOtp({ token_hash, type: "magiclink" });

async function sweep() {
  const { data, error } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (error) throw new Error("listUsers: " + error.message);
  const left = data.users.filter((u) => u.email?.startsWith(PREFIX));
  for (const u of left) await admin.auth.admin.deleteUser(u.id);
  return left.length;
}

let userId = null, canary = { id: "token-with-session-id-removed", observed_failure: false };
try {
  const swept = await sweep();
  if (swept) console.log(`  swept ${swept} leftover fixture user(s) from an earlier run`);

  const email = `${PREFIX}${Date.now()}@example.com`;
  const { data: cu, error: ce } = await admin.auth.admin.createUser({ email, email_confirm: true });
  if (ce) throw new Error("createUser: " + ce.message);
  userId = cu.user.id;
  console.log(`  fixture user created (${short(userId)}), no business, no membership`);

  // 3 — the server can exchange the link itself.
  const hash1 = await mint(email);
  const { data: s1, error: e1 } = await exchange(hash1);
  const at1 = s1?.session?.access_token;
  ask("server-exchange-returns-session", !e1 && at1 && s1.session.refresh_token && s1.user?.id === userId,
    e1 ? "verifyOtp refused: " + e1.message : `session returned for the fixture user; access + refresh token present`);

  // 1 — the access token carries a session id.
  const tokenUnderTest = BREAK === "strip-sid" && at1 ? stripSid(at1) : at1;
  const sid1 = at1 ? sessionIdOf(tokenUnderTest) : null;
  ask("token-carries-session-id", !!sid1,
    `claims present: ${at1 ? Object.keys(claimsOf(tokenUnderTest)).sort().join(", ") : "(no token)"}; session_id ${short(sid1)}`);

  // canary: the same instrument must say "none" for a token without the claim.
  if (at1) {
    canary.observed_failure = sessionIdOf(stripSid(at1)) === null && sessionIdOf("x.e30.y") === null;
    canary.detail = `stripped token -> ${short(sessionIdOf(stripSid(at1)))}; empty claims -> none`;
    console.log(`  canary ${canary.observed_failure ? "CAUGHT" : "MISSED"}: ${canary.detail}`);
  }

  // 2 — the id names a real session row belonging to this user.
  const rows = sid1 ? await sql(`select count(*)::int n from auth.sessions where id = '${sid1}' and user_id = '${userId}'`) : [{ n: 0 }];
  ask("session-id-is-a-real-session", rows[0]?.n === 1, `auth.sessions rows for (id, user): ${rows[0]?.n}`);

  // 4 — the link is one-use; with --break=reuse the "fresh" exchange is the used one.
  const { data: s2, error: e2 } = await exchange(hash1);
  ask("link-is-one-use", !!e2 && !s2?.session, e2 ? "second exchange refused: " + e2.message : "SECOND EXCHANGE SUCCEEDED");

  // 5 — a refresh keeps the id, so a marker keyed on it lasts the session.
  const c5 = fresh();
  let sidR = null;
  if (s1?.session) {
    const { data: r5, error: re } = await c5.auth.refreshSession({ refresh_token: s1.session.refresh_token });
    sidR = re ? null : sessionIdOf(r5?.session?.access_token);
    ask("refresh-keeps-session-id", !!sid1 && sidR === sid1 && r5?.session?.access_token !== at1,
      re ? "refresh refused: " + re.message : `refreshed token session_id ${short(sidR)} vs original ${short(sid1)}`);
  } else ask("refresh-keeps-session-id", false, "no session to refresh");

  // 6 — a second ordinary sign-in of the same user is a DIFFERENT session.
  const hash2 = BREAK === "reuse" ? hash1 : await mint(email);
  const { data: s6, error: e6 } = await exchange(hash2);
  const sid6 = sessionIdOf(s6?.session?.access_token);
  ask("second-login-gets-different-session-id", !e6 && !!sid6 && !!sid1 && sid6 !== sid1,
    e6 ? "second sign-in refused: " + e6.message : `second session ${short(sid6)} vs first ${short(sid1)}`);

  // 7 — Postgres reads it the way a policy would: auth.jwt() over the token's own claims.
  let viaSql = null;
  if (at1) {
    const claims = JSON.stringify(claimsOf(tokenUnderTest)).replace(/'/g, "''");
    const r7 = await sql(`select set_config('request.jwt.claims', '${claims}', true), auth.jwt() ->> 'session_id' as sid`);
    viaSql = r7[0]?.sid ?? null;
  }
  ask("auth-jwt-reads-session-id", !!sid1 && viaSql === sid1, `auth.jwt() ->> 'session_id' = ${short(viaSql)}`);

  // 8 — A FINDING, NOT A PROPERTY: the Auth API is a write path no database rule
  // reaches. The session edits its own user record (a label in user_metadata,
  // never a password) and the change is read back with the service role. PASS
  // here means the hole is real, and 4.3c has to close it somewhere other than RLS.
  if (s1?.session) {
    const c8 = fresh();
    await c8.auth.setSession({ access_token: s1.session.access_token, refresh_token: s1.session.refresh_token }).catch(() => null);
    const { error: ue } = await c8.auth.updateUser({ data: { support_fixture_probe: started_at } });
    const { data: back } = await admin.auth.admin.getUserById(userId);
    const landed = back?.user?.user_metadata?.support_fixture_probe === started_at;
    ask("auth-api-write-reaches-past-rls", !ue && landed,
      ue ? "updateUser refused: " + ue.message : `session wrote its own user record via the Auth API; read back ${landed ? "matches" : "does NOT match"}`);
  } else ask("auth-api-write-reaches-past-rls", false, "no session to write with");
} finally {
  if (userId) {
    const { error } = await admin.auth.admin.deleteUser(userId);
    console.log(error ? `  CLEANUP FAILED: ${error.message} — run again, the sweep removes it` : "  fixture user deleted");
  }
}

const QUESTIONS = 8;
const failed = results.filter((r) => !r.ok);
const artifact = "receipts/support-session-fixture.answers" + (BREAK ? "." + BREAK + ".sabotage" : "") + ".json";
writeFileSync(artifact, JSON.stringify({ project: REF, break: BREAK || null, results }, null, 2) + "\n");
const { path } = writeReceipt({
  check_id: "support-session-fixture",
  started_at,
  status: failed.length || results.length !== QUESTIONS ? "fail" : "pass",
  expected_targets: QUESTIONS,
  discovered_targets: results.length,
  attempted_targets: results.length,
  completed_targets: results.length,
  skipped_targets: 0,
  assertions_executed: results.length,
  min_assertions: QUESTIONS,
  assertion_floor: "eight fixed questions, one assertion each; the count is set by the code, not by what the run found",
  failures: failed.map((f) => `${f.id}: ${f.detail}`),
  canary,
  artifacts: [artifact],
  dimensions: BREAK ? { break: BREAK } : {},
});
console.log(`\n  ${results.length - failed.length} passed, ${failed.length} failed of ${QUESTIONS} -> ${path}`);
process.exitCode = failed.length ? 1 : 0;
