// ROADMAP 4.3c + 97.15 — EDGE FUNCTIONS REFUSE A READ-ONLY SUPPORT SESSION, AN EXPIRED ONE
// EVERYWHERE, AND VIEW-AS NEVER HANDS OUT A REFRESH TOKEN. Credential-free: no .env, no network,
// no database.
//
//   node --test tests/support-sessions-edge.test.mjs
//   BREAK=fail-open   node tests/support-sessions-edge.test.mjs  # a failed marker read ALLOWS the write
//   BREAK=no-gate     node tests/support-sessions-edge.test.mjs  # requireMember stops asking
//   BREAK=unmarked    node tests/support-sessions-edge.test.mjs  # view-as hands over a session with no id
//   BREAK=no-expiry   node tests/support-sessions-edge.test.mjs  # 97.15: a marker past its deadline counts as live
//   BREAK=refresh     node tests/support-sessions-edge.test.mjs  # 97.15: view-as hands the refresh token back again
//   BREAK=no-signout  node tests/support-sessions-edge.test.mjs  # 97.15: requireMember leaves an expired session alive
//
// THE FIRST TEST RUNS THE CODE. `_shared/supportSession.ts`, `_shared/tenant.ts` and
// `_shared/retryRead.ts` are copied byte for byte into a temp folder (Node 24 strips the types) beside
// a stand-in `db.ts` — the one Deno-only file, whose `supabase` client is a recording fake — and the
// real `requireMember` and the real view-as hand-over (`openSupportView`, which platform-admin calls)
// are called and their answers checked. BREAK edits the PRODUCTION file in that temp copy (mutation),
// never a copy kept in this file. BREAK is an env var because `node --test` swallows flags
// (docs/gotchas.md 104).
//
// THE SECOND TEST IS A LINT-STYLE GUARD OVER SOURCE, ON PURPOSE (4.3c). Its subject is the source:
// every edge function that authenticates a USER, discovered from the folder, must route through the
// support-session question, and opting one in is a decision written down here (READ_ONLY, an
// equality). No running test can discover a function somebody adds next month; this can.

import { readFileSync, readdirSync, writeFileSync, copyFileSync, mkdtempSync, existsSync } from "node:fs";
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

// ---- load the production modules into a temp folder, db.ts stood in ------------------------------
const MUTATIONS = {
  "fail-open": ["supportSession.ts", `? "none" : "live";`, `? "none" : "none";`],
  "no-expiry": ["supportSession.ts", "ends <= Date.now() ?", "false ?"],
  "unmarked": ["supportSession.ts", "if (error || !session || !sid) return null;", "if (error || !session) return null;"],
  "refresh": ["supportSession.ts", "return { access_token: session.access_token, expires_at, as };", "return { access_token: session.access_token, refresh_token: session.refresh_token, expires_at, as };"],
  "no-gate": ["tenant.ts", "if (!supportAdmits(state, !!opts.allowSupport)) {", "if (false) {"],
  "no-signout": ["tenant.ts", `if (state === "expired") await supabase.auth.admin.signOut(token, "local").catch(() => {});`, ""],
};
const tmp = mkdtempSync(path.join(tmpdir(), "support-edge-"));
for (const f of ["supportSession.ts", "tenant.ts", "retryRead.ts"]) copyFileSync(`${FN}/_shared/${f}`, path.join(tmp, f));
let mutationLanded = null;
if (MUTATIONS[BREAK]) {
  const [file, from, to] = MUTATIONS[BREAK];
  const p = path.join(tmp, file);
  const before = readFileSync(p, "utf8");
  writeFileSync(p, before.replace(from, to));
  mutationLanded = readFileSync(p, "utf8") !== before; // docs/gotchas.md 102: prove the break landed
  console.log(`BREAK=${BREAK}: mutation ${mutationLanded ? "landed" : "DID NOT LAND"} in ${file}`);
}
// The stand-in database: a recording fake of exactly the calls requireMember makes.
writeFileSync(path.join(tmp, "db.ts"), `
const f = globalThis.__fakeDb;
export const supabase = {
  auth: {
    getUser: async (token: string) => f.user ? { data: { user: f.user }, error: null } : { data: { user: null }, error: { message: "invalid" } },
    admin: { signOut: async (token: string, scope: string) => { f.signedOut.push([token, scope]); return { error: null }; } },
  },
  from(table: string) {
    f.reads.push(table);
    const b: any = {
      select: () => b, eq: (c: string, v: unknown) => { f.filters.push([table, c, v]); return b; },
      maybeSingle: async () => table === "support_sessions" ? (f.markerError ? { data: null, error: f.markerError } : { data: f.marker, error: null }) : { data: null, error: null },
      then: (ok: any, no: any) => Promise.resolve({ data: table === "business_users" ? f.members : [], error: null }).then(ok, no),
    };
    return b;
  },
};
`);
// ONE object, reset in place: the stand-in captured it when it loaded.
const DB = (globalThis.__fakeDb = {});
const fake = (over = {}) => {
  for (const k of Object.keys(DB)) delete DB[k];
  return Object.assign(DB, {
    user: { id: "user-1" }, marker: null, markerError: null,
    members: [{ business_id: "biz-1", role: "owner", permissions: [] }],
    signedOut: [], reads: [], filters: [],
  }, over);
};
fake();
const S = await import(pathToFileURL(path.join(tmp, "supportSession.ts")).href);
const T = await import(pathToFileURL(path.join(tmp, "tenant.ts")).href);

let assertions = 0;
const failures = [];
const check = (name, cond, detail = "") => {
  assertions++;
  if (cond) console.log(`  ok    ${name}`);
  else { failures.push(`${name} ${detail}`.trim()); console.error(`  FAIL  ${name} ${detail}`); }
};
const jwt = (claims) => `h.${Buffer.from(JSON.stringify(claims)).toString("base64url")}.s`;
const SID = "44444444-4444-4444-4444-444444444444";
const req = (token) => new Request("http://edge.test/fn", { headers: { Authorization: `Bearer ${token}` } });
const backDated = () => ({ session_id: SID, created_at: new Date(Date.now() - 31 * 60e3).toISOString(), expires_at: new Date(Date.now() - 60e3).toISOString() });
const live = () => ({ session_id: SID, expires_at: new Date(Date.now() + 29 * 60e3).toISOString() });

test("4.3c + 97.15 · the real requireMember and the real view-as hand-over, run", async () => {
  // 1. The decision, called.
  check("session id is read from the token", S.sessionIdOf(jwt({ sub: "u", session_id: SID })) === SID);
  check("a token with no session id is not a support session (and the marker is not asked)",
    (await S.isSupportSession(jwt({ sub: "u" }), async () => { throw new Error("asked"); })) === false);
  check("a listed session IS a support session",
    (await S.isSupportSession(jwt({ session_id: SID }), async () => ({ data: { session_id: SID }, error: null }))) === true);
  check("the owner's own session (not listed) is NOT a support session",
    (await S.isSupportSession(jwt({ session_id: "other" }), async () => ({ data: null, error: null }))) === false);
  check("a marker read that fails counts as a support session (fails closed)",
    (await S.isSupportSession(jwt({ session_id: SID }), async () => ({ data: null, error: { code: "08006", message: "connection" } }))) === true);
  check("no marker table at all (migration not yet applied) is not a support session",
    (await S.isSupportSession(jwt({ session_id: SID }), async () => ({ data: null, error: { code: "PGRST205" } }))) === false);
  check("97.15: a back-dated marker (opened 31 minutes ago) is EXPIRED",
    (await S.supportSessionState(jwt({ session_id: SID }), async () => ({ data: backDated(), error: null }))) === "expired");
  check("97.15: a marker with no deadline (column not yet applied) is live, not expired",
    (await S.supportSessionState(jwt({ session_id: SID }), async () => ({ data: { session_id: SID }, error: null }))) === "live");

  // 2. requireMember, called with a request, against the stand-in database.
  const token = jwt({ sub: "user-1", session_id: SID });
  fake({ marker: null });
  const own = await T.requireMember(req(token), "biz-1");
  check("the owner's own session gets its membership", own?.role === "owner" && own?.businessId === "biz-1", JSON.stringify(own));
  check("the marker is looked up by THIS token's session id", globalThis.__fakeDb.filters.some(([t, c, v]) => t === "support_sessions" && c === "session_id" && v === SID));

  fake({ marker: live() });
  const liveNo = await T.requireMember(req(token), "biz-1");
  check("a live support session is refused by default", liveNo === null && !globalThis.__fakeDb.reads.includes("business_users"), JSON.stringify({ liveNo, reads: globalThis.__fakeDb.reads }));
  fake({ marker: live() });
  const liveYes = await T.requireMember(req(token), "biz-1", { allowSupport: true });
  check("a live support session passes where support is allowed (read-only functions)", liveYes?.role === "owner", JSON.stringify(liveYes));
  check("a live support session is not signed out", globalThis.__fakeDb.signedOut.length === 0);

  fake({ marker: backDated() });
  const expYes = await T.requireMember(req(token), "biz-1", { allowSupport: true });
  const db = globalThis.__fakeDb;
  check("97.15: a back-dated support session is refused EVEN where support is allowed", expYes === null, JSON.stringify(expYes));
  check("97.15: …before any membership is read", !db.reads.includes("business_users"), JSON.stringify(db.reads));
  check("97.15: …and its session is signed out at Auth, this session only (local)", db.signedOut.length === 1 && db.signedOut[0][0] === token && db.signedOut[0][1] === "local", JSON.stringify(db.signedOut));
  fake({ marker: backDated() });
  check("97.15: a back-dated support session is refused by default too", (await T.requireMember(req(token), "biz-1")) === null);

  fake({ markerError: { code: "08006", message: "connection" } });
  check("a failed marker read refuses by default (fails closed)", (await T.requireMember(req(token), "biz-1")) === null);

  // 3. The view-as hand-over, called with a session that HAS a refresh token.
  const REFRESH = "real-refresh-token-must-not-leave";
  const DEADLINE = new Date(Date.now() + 30 * 60e3).toISOString();
  const calls = { mark: [], end: [] };
  const deps = (over = {}) => ({
    exchange: async () => ({ session: { access_token: token, refresh_token: REFRESH, user: { id: "user-1" } }, error: null }),
    mark: async (row) => { calls.mark.push(row); return { expires_at: DEADLINE, error: null }; },
    end: async (t) => { calls.end.push(t); },
    ...over,
  });
  const answer = await S.openSupportView(deps(), "owner@example.com");
  check("97.15: the view-as answer carries NO refresh token", !!answer && !("refresh_token" in answer) && !JSON.stringify(answer).includes(REFRESH), JSON.stringify(answer));
  check("97.15: the view-as answer carries the access token and the marker's deadline", answer?.access_token === token && answer?.expires_at === DEADLINE && answer?.as === "owner@example.com", JSON.stringify(answer));
  check("the session was marked, by its own session id, before anything was handed over", calls.mark.length === 1 && calls.mark[0].session_id === SID && calls.mark[0].user_id === "user-1", JSON.stringify(calls.mark));

  calls.mark = []; calls.end = [];
  const noSid = await S.openSupportView(deps({ exchange: async () => ({ session: { access_token: jwt({ sub: "user-1" }), refresh_token: REFRESH, user: { id: "user-1" } }, error: null }) }), "x");
  check("a session with no id is refused and never marked", noSid === null && calls.mark.length === 0, JSON.stringify({ noSid, mark: calls.mark }));
  const markFailed = await S.openSupportView(deps({ mark: async () => ({ expires_at: null, error: { message: "insert failed" } }) }), "x");
  check("a marker that did not land hands nothing over and ends the session", markFailed === null && calls.end.length === 1 && calls.end[0] === token, JSON.stringify({ markFailed, end: calls.end }));
  calls.end = [];
  const noDeadline = await S.openSupportView(deps({ mark: async () => ({ expires_at: null, error: null }) }), "x");
  check("97.15: a marker with no deadline hands nothing over and ends the session", noDeadline === null && calls.end.length === 1, JSON.stringify({ noDeadline, end: calls.end }));
});

test("4.3c · LINT-STYLE GUARD over source: every user-authenticating function asks the support question", () => {
  const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
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
  // Wiring, which only Deno could run: platform-admin's view-as goes through the hand-over tested above.
  const pa = stripComments(readFileSync(`${FN}/platform-admin/index.ts`, "utf8"));
  const imp = pa.slice(pa.indexOf('action === "impersonate"'));
  check("platform-admin's view-as answers with openSupportView's result and nothing else", /const view = await openSupportView\(/.test(imp) && /return json\(\{ success: true, \.\.\.view \}\)/.test(imp) && !/refresh_token/.test(imp));
  check("the audit row is still written before the link is made", imp.indexOf('logIt(admin, "impersonate"') < imp.indexOf("generateLink("));

  // CANARY, every run: a function that checks the user itself and forgets the support question.
  const canary = classify("canary", `const { data } = await supabase.auth.getUser(token); await supabase.from("x").insert({});`);
  const canaryCaught = canary === "UNGUARDED getUser";
  check("canary: an unguarded getUser function is caught", canaryCaught, canary);
  if (BREAK) check(`BREAK=${BREAK} landed in the production copy`, mutationLanded === true);

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
    min_assertions: 8 + 10 + 6 + 1 + EXPECTED_USER_AUTH + 4 + 1,
    assertion_floor: "structural: eight decision calls, ten requireMember calls, six hand-over calls, then the lint guard (one count, one per discovered function, four fixed, one canary)",
    failures,
    canary: { id: "unguarded-getUser", observed_failure: canaryCaught },
    artifacts: ["supabase/functions/_shared/supportSession.ts", "supabase/functions/_shared/tenant.ts"],
    dimensions: { break: BREAK || undefined, mutation_landed: mutationLanded ?? undefined, functions: Object.fromEntries(userAuth.map((u) => [u.fn, u.verdict])) },
  });
  assert.deepEqual(failures, []);
});
