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
//   BREAK=expired-switch node tests/support-sessions-edge.test.mjs  # 4.3c (a): an expired preview unlocks anyway
//   BREAK=no-audit-unlock node tests/support-sessions-edge.test.mjs  # 4.3c (a): unlocking skips its audit row
//   BREAK=no-audit-lock node tests/support-sessions-edge.test.mjs  # 4.3c (a): relocking skips its audit row
//   BREAK=no-create-refusal node tests/support-sessions-edge.test.mjs  # 4.3c R1(ii): a preview creates a business
//   BREAK=unmarked-admin node tests/support-sessions-edge.test.mjs  # 4.3c R1(ii): a preview passes the admin gate
//   BREAK=preview-support node tests/support-sessions-edge.test.mjs  # 4.3c R3: preview-emails admits support again - mail must go out and the refusal must fail
//   BREAK=booking-fallback node tests/support-sessions-edge.test.mjs  # 4.3c R3: create-booking falls through to public - the engine entry must be reached and the refusal must fail
//
// F1: the only generated files sit beneath THIS repository (.tmp-4.3c/, git-ignored),
// never os.tmpdir(): the stand-ins and the loader hook. No production file is copied.
// F2: the tests IMPORT AND CALL the real handlers and the real shared modules through
// that hook - never a copy, and never the decision functions alone. The hook redirects only
// the leaf utilities that need the network, credentials, or recording fakes (plus the jsr
// type-only line and the npm: client, which node cannot resolve); everything else executes
// from supabase/functions/ itself. Mutations edit the EXECUTED loaded source.
// The fourth test does the same for preview-emails (a recording mail dependency - the
// refusal must land before sendTenantEmail) and create-booking (a recording engine entry -
// the refusal must land before the public branch mints a booking).

import { readFileSync, readdirSync, writeFileSync, rmSync, mkdirSync, existsSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { register } from "node:module";
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
  "photo-door": "only its `urls` action (viewing photos); start and remove stay refused",
};
// measured 2026-10-10 at 21; 22 since google-business (99.1, d64bc41f) — a requireMember caller
// refused by default, re-counted 2026-10-17 by 97.15, which found this line red on HEAD.
const EXPECTED_USER_AUTH = 22;

// The handlers under test (Deno.serve) are captured, never served.
const captured = {};
globalThis.Deno = { serve: (fn) => { captured.current = fn; }, env: { get: () => undefined } };


// Mutations edit the EXECUTED loaded source. [file, from, to]; the marker file proves the replacement happened.
const MUTATIONS = {
  "fail-open": ["supportSession.ts", `? "none" : "live";`, `? "none" : "none";`],
  "no-expiry": ["supportSession.ts", "ends <= Date.now() ?", "false ?"],
  "unmarked": ["supportSession.ts", "if (error || !session || !sid) return null;", "if (error || !session) return null;"],
  "refresh": ["supportSession.ts", "return { access_token: session.access_token, expires_at, as };", "return { access_token: session.access_token, refresh_token: session.refresh_token, expires_at, as };"],
  "no-gate": ["tenant.ts", "if (!supportAdmits(state, !!opts.allowSupport)) {", "if (false) {"],
  "no-signout": ["tenant.ts", `if (state === "expired") await supabase.auth.admin.signOut(token, "local").catch(() => {});`, ""],
  "expired-switch": ["previewSwitch.ts", "if (Number.isFinite(ends) && ends <= deps.now()) {", "if (false) {"],
  "no-audit-unlock": ["previewSwitch.ts", `if (unlock && !(await deps.audit(by, "support_unlock", biz, { as: actorEmail }))) {`, "if (false) {"],
  "no-audit-lock": ["previewSwitch.ts", `const lockAudited = await deps.audit(by, "support_lock", biz, { as: actorEmail });`, "const lockAudited = true;"],
  "no-create-refusal": ["create-business.ts", `if (await markedPreview(token)) return json({ error: SUPPORT_READ_ONLY }, 403);`, ""],
  "unmarked-admin": ["supportSession.ts", "return !!data;", "return false;"],
  "preview-support": ["preview-emails.ts", "requireMember(req, body.business_id ?? null)", "requireMember(req, body.business_id ?? null, { allowSupport: true })"],
  "booking-fallback": ["create-booking.ts", "if (token && await supportSession(token)) return json({ error: SUPPORT_READ_ONLY }, 403);", "if (false) { }"],
};

// HARNESS: the executed tests load the REAL production modules through the loader
// hook registered below - no production source is read as text, copied, or compared
// anywhere in the executed tests. Only leaf utilities that need the network,
// credentials, or recording fakes are redirected to the generated stand-ins;
// everything else (the four handlers under test and _shared/supportSession,
// tenant, retryRead, permissions, previewSwitch, http) executes from
// supabase/functions/ itself. Sabotage (BREAK=*) is applied by the hook to the
// loaded source, and a marker file proves it landed in the executed copy. The
// lint-style guard at the end of this file is the one place that reads source
// as text; the ROADMAP 4.3c entry declares it.

// Stand-ins for leaf modules. Self-contained: they import nothing, so the hook
// can point every spelling of their path at the same generated file.
const STATIC_STUBS = {
  "db.ts": `const H = () => globalThis.__harness ?? {};
export const SUPABASE_URL = "http://edge.test";
export const supabase = {
  auth: {
    getUser: async (token) => {
      const u = (H().users ?? {})[token];
      return u ? { data: { user: u }, error: null } : { data: { user: null }, error: { message: "invalid token" } };
    },
    admin: {
      getUserById: async (id) => {
        const e = (H().admins ?? {})[id];
        return e ? { data: { user: { id, email: e } }, error: null } : { data: { user: null }, error: { message: "not an admin" } };
      },
      signOut: async (token, scope) => { (H().signedOut ?? []).push([token, scope]); return { error: null }; },
    },
  },
  from: (table) => {
    const h = H();
    (h.reads ??= []).push(table);
    const match = (row, eqs) => eqs.every(([c, v]) => row[c] === undefined || row[c] === v);
    const one = (eqs) => {
      if (table === "support_sessions") {
        if (h.markerReadError) return { data: null, error: h.markerReadError };
        const sid = (eqs.find(([c]) => c === "session_id") ?? [])[1];
        return { data: (h.markers ?? {})[sid] ?? null, error: null };
      }
      if (table === "businesses") return { data: Object.values(h.businesses ?? {}).find((r) => match(r, eqs)) ?? null, error: null };
      if (table === "business_settings") return { data: null, error: null };
      if (table === "platform_admins") {
        const id = (eqs.find(([c]) => c === "user_id") ?? [])[1];
        return { data: (h.admins ?? {})[id] ? { user_id: id } : null, error: null };
      }
      if (table === "platform_settings") return { data: null, error: null };
      return { data: null, error: null };
    };
    const all = (eqs) => {
      if (table === "business_users") return ((h.memberships ?? [])).filter((r) => match(r, eqs));
      if (table === "services") return h.services ?? [];
      return [];
    };
    const self = {
      _eqs: [],
      select() { return self; },
      eq(c, v) { self._eqs.push([c, v]); (h.filters ??= []).push([table, c, v]); return self; },
      order() { return self; },
      limit() { return self; },
      neq() { return self; },
      is() { return self; },
      maybeSingle: async () => one(self._eqs),
      single: async () => one(self._eqs),
      insert: async (row) => {
        (h.writes ??= []).push([table, row]);
        if ((h.failInsert ?? {})[table]) return { error: { message: "insert failed" } };
        if (table === "support_sessions" && row && row.session_id) (h.markers ??= {})[row.session_id] = row;
        if (table === "platform_admin_events") (h.events ??= []).push(row);
        if (table === "business_users") (h.memberships ??= []).push(row);
        return { error: null };
      },
      update: (patch) => ({ eq: async (c, v) => {
        (h.writes ??= []).push([table + ".update", patch, v]);
        if ((h.failUpdate ?? {})[table]) return { error: { message: "update failed" } };
        if (table === "support_sessions" && (h.markers ?? {})[v]) Object.assign(h.markers[v], patch);
        return { error: null };
      } }),
      delete: () => ({ eq: async (c, v) => { (h.writes ??= []).push([table + ".delete", v]); return { error: null }; } }),
      then: (ok) => Promise.resolve({ data: all(self._eqs), error: null }).then(ok),
    };
    return self;
  },
};
`,
  "config.ts": `export const PLATFORM_URL = "http://platform.test/";
export const businessSiteUrl = () => "http://site.test/";
export const receiptUrl = () => "http://receipt.test/";
`,
  "newBusiness.ts": `export const createBusinessRow = async (db, input) => {
  globalThis.__harness.createdBusinesses.push(input);
  return { business: { id: "biz-new", slug: input.slug, timezone: input.timezone, name: input.name } };
};
`,
  "tz.ts": `export const dateStrIn = () => { throw new Error("stub tz"); };
export const localToDate = () => { throw new Error("stub tz"); };
export const localDateTimeToInstant = () => new Date("2026-10-24T17:00:00Z");
export const timeStrIn = () => "10:00 AM";
export const weekdayOf = () => "Saturday";
`,
  "buildStartStamp.ts": `export const stampBuildStart = async () => { throw new Error("stub buildStartStamp"); };
`,
  "platformBilling.ts": `export const PRICES = {};
export const pricesFrom = () => { throw new Error("stub platformBilling"); };
`,
  "email.ts": `export const buildBrand = async () => ({ name: "Coastline" });
export const ownerRecipients = () => ["owner@example.com"];
export const recipientLang = async () => "en";
export const sendTenantEmail = async (m) => { (globalThis.__harness.mail ??= []).push(m); return true; };
`,
  "emailTemplates.ts": `export const customerConfirmationEmail = () => ({ subject: "customer", html: "h", text: "t" });
export const ownerNewBookingEmail = () => ({ subject: "owner", html: "h", text: "t" });
export const newDetailerAlert = () => ({});
export const buildStartedEmail = () => ({ subject: "build", html: "h", text: "t" });
export const inviteEmail = () => ({ subject: "invite", html: "h", text: "t" });
export const platformAlertEmail = () => ({ subject: "alert", html: "h", text: "t" });
`,
  "platformBrand.ts": `export const PLATFORM_NAME = "Platform";
export const platformBrand = () => { throw new Error("stub platformBrand"); };
export const siteFor = async () => { throw new Error("stub siteFor"); };
`,
  "tenantSite.ts": `export const siteFor = async () => "http://site.test/";
`,
  "platformNet.js": `export const COSTS_MISSING_READ = "costs-missing-read";
export const COSTS_MISSING_WRITE = "costs-missing-write";
export function costEntry() { throw new Error("stub platformNet"); }
export function costsTableMissing() { return false; }
export function monthStart() { throw new Error("stub platformNet"); }
export function nextMonthStart() { throw new Error("stub platformNet"); }
export function platformNet() { throw new Error("stub platformNet"); }
`,
  "emailList.js": `export const emailList = async () => { throw new Error("stub emailList: the exercised paths never list emails"); };
`,
  "vcard.ts": `export const vcardAttachment = () => ({ kind: "card" });
`,
  "pricing.ts": `const never = (name) => (...a) => { globalThis.__harness.pricing.push([name, a]); throw new Error("STUB-pricing: " + name + " is past the refusal under test"); };
export const computeQuote = () => ({ totalDurationMinutes: 60, travelFee: 0, zone: null, adjustmentLines: [], subtotalAfterSite: 100, siteDiscount: 0, total: 100 });
export const matchPriceRules = () => [];
export const whenContextFor = () => ({});
export const resolveTravel = () => ({ fee: 0, zone: null });
export const resolveServices = async (...a) => {
  globalThis.__harness.pricing.push(["resolveServices", a]);
  if (globalThis.__harness.pricingThrow) throw new Error("STUB-pricing: the engine starts here; the stored-price math is covered by the pricing suites");
  return [{ id: "svc-1", name: "Signature Wash" }];
};
export const resolveAddOns = async (...a) => {
  globalThis.__harness.pricing.push(["resolveAddOns", a]);
  if (globalThis.__harness.pricingThrow) throw new Error("STUB-pricing: the engine starts here; the stored-price math is covered by the pricing suites");
  return [];
};
export const planInputFor = never("planInputFor");
export const resolvePlan = never("resolvePlan");
export const resolvePromo = never("resolvePromo");
export const resolveVehicles = never("resolveVehicles");
export const sizeAdjustmentFor = never("sizeAdjustmentFor");
export const vehicleSizeFee = never("vehicleSizeFee");
export const zoneAddressMismatch = never("zoneAddressMismatch");
`,
  "rateLimit.ts": `export const ipOf = () => "127.0.0.1";
export const LIMITS = { publicCeiling: {} };
export const looksAutomated = () => false;
export const withinLimits = async () => true;
`,
  "slotValidation.ts": `export const dayRuleRefusal = () => { throw new Error("STUB-slot: past the refusal under test"); };
export const validateSlot = () => { throw new Error("STUB-slot: past the refusal under test"); };
`,
  "emailKit.ts": `export const money = (n) => String(n);
`,
  "ownerPush.ts": `export const sendOwnerPush = async () => {};
`,
  "bookingConsent.ts": `export const saveBookingSmsConsent = async () => {};
`,
  "i18n.ts": `export const langOf = (v) => (v === "es" ? "es" : "en");
`,
};

// The loader hook, generated once per run with the sabotage map embedded. The
// resolve half points leaf utilities at the stand-ins above (plus the two
// specifiers node cannot resolve); the load half applies BREAK sabotage to the
// loaded source and records the landing on disk. __MAP__, __STUBS__,
// __STATIC_URL__ and __MARKER_URL__ are filled in when this file is generated.
const HOOK_SRC = `// Generated by tests/support-sessions-edge.test.mjs: do not edit by hand.
import { writeFileSync } from "node:fs";
const MAP = __MAP__;
const STUBS = new Set(__STUBS__);
const STATIC_URL = "__STATIC_URL__";
const MARKER_URL = "__MARKER_URL__";
const NPM_STUB = "data:text/javascript," + encodeURIComponent("export const createClient = () => { throw new Error('stub createClient: the exercised paths never exchange a link'); };");
function marker(m) {
  try { writeFileSync(new URL(MARKER_URL), JSON.stringify(m)); }
  catch (e) { console.error("marker write failed: " + e.message); }
}
export async function resolve(specifier, context, next) {
  if (specifier.startsWith("jsr:")) return { url: "data:text/javascript,export {};", shortCircuit: true };
  if (specifier === "npm:@supabase/supabase-js@2.58.0") return { url: NPM_STUB, shortCircuit: true };
  if (specifier.startsWith(".") || specifier.startsWith("file:") || specifier.startsWith("/")) {
    try {
      const resolved = new URL(specifier, context.parentURL);
      if (resolved.protocol === "file:" && resolved.pathname.includes("/supabase/functions/_shared/")) {
        const base = resolved.pathname.split("/").pop();
        if (STUBS.has(base)) return { url: STATIC_URL + base, shortCircuit: true };
      }
    } catch (parseFailed) { /* not a URL - let the default loader answer */ }
  }
  return next(specifier, context);
}
export async function load(url, context, next) {
  const result = await next(url, context);
  const b = process.env.BREAK || "";
  const m = (b && MAP[b]) || null;
  if (!m || !url.endsWith(m.match)) return result;
  let src = result.source;
  if (src == null) return result;
  if (typeof src !== "string") src = Buffer.from(src).toString("utf8");
  if (!src.includes(m.from)) {
    console.error("BREAK=" + b + ": from-string not found in " + m.match);
    marker({ break: b, file: m.match, landed: false });
    return result;
  }
  const out = src.replace(m.from, m.to);
  marker({ break: b, file: m.match, landed: out !== src });
  console.log("BREAK=" + b + ": mutation " + (out !== src ? "landed" : "DID NOT LAND") + " in " + m.match);
  return { format: result.format, source: out, shortCircuit: true };
}
`;

const STATIC_DIR = ".tmp-4.3c/static";
const MARKER_FILE = ".tmp-4.3c/mutated.json";

let harnessed = false;
function ensureHarness() {
  if (harnessed) return;
  harnessed = true;
  rmSync(".tmp-4.3c", { recursive: true, force: true });
  mkdirSync(STATIC_DIR, { recursive: true });
  for (const [name, stub] of Object.entries(STATIC_STUBS)) writeFileSync(path.join(STATIC_DIR, name), stub);
  const map = {};
  for (const [b, [file, from, to]] of Object.entries(MUTATIONS)) {
    map[b] = {
      match: file === "create-business.ts" ? "create-business/index.ts"
        : file === "create-booking.ts" ? "create-booking/index.ts"
        : file === "preview-emails.ts" ? "preview-emails/index.ts"
        : "_shared/" + file,
      from, to,
    };
  }
  const hook = HOOK_SRC
    .replace("__MAP__", () => JSON.stringify(map))
    .replace("__STUBS__", () => JSON.stringify(Object.keys(STATIC_STUBS)))
    .replace("__STATIC_URL__", () => pathToFileURL(path.resolve(STATIC_DIR)).href + "/")
    .replace("__MARKER_URL__", () => pathToFileURL(path.resolve(MARKER_FILE)).href);
  writeFileSync(path.join(STATIC_DIR, "hooks.mjs"), hook);
  register(pathToFileURL(path.resolve(STATIC_DIR, "hooks.mjs")).href);
}
// The stage each executed test opens. The harness is process-wide (one loader
// registration, one set of stand-ins); per-test isolation is the harness object
// each test resets, which the stand-ins read live.
function stage() { ensureHarness(); return {}; }
// Where the hook records a sabotage landing. Written by the loader, so the test
// reads it back from disk rather than memory.
function readMarker() {
  try { return JSON.parse(readFileSync(MARKER_FILE, "utf8")); } catch (noMarker) { return null; }
}
const REAL = (rel) => path.resolve(FN, rel);
ensureHarness();

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
const post = (token, action) => new Request("http://edge.test/fn", {
  method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  body: JSON.stringify({ action }),
});
const backDated = () => ({ session_id: SID, created_at: new Date(Date.now() - 31 * 60e3).toISOString(), expires_at: new Date(Date.now() - 60e3).toISOString() });
const live = () => ({ session_id: SID, expires_at: new Date(Date.now() + 29 * 60e3).toISOString() });

test("4.3c + 97.15 · the real requireMember and the real view-as hand-over, run", async () => {
  stage("t1-decisions");
    // ONE object, reset in place: the unified stand-in database reads it live when the
  // real modules load, so every decision below runs against this data. The marker
  // the old shape carried singly is keyed by session id here.
  const H1 = (globalThis.__harness = {});
  const fake = (over = {}) => {
    const users = H1.users ?? {};
    for (const k of Object.keys(H1)) delete H1[k];
    const { marker, markerError, ...rest } = over;
    return Object.assign(H1, {
      users, markers: marker ? { [SID]: marker } : {}, markerReadError: markerError ?? null,
      memberships: [{ business_id: "biz-1", role: "owner", permissions: [] }],
      businesses: {}, services: [],
      mail: [], pricing: [], writes: [], reads: [], filters: [], signedOut: [],
      failInsert: {}, failUpdate: {},
    }, rest);
  };
  fake();
  const S = await import(pathToFileURL(REAL("_shared/supportSession.ts")).href);
  const T = await import(pathToFileURL(REAL("_shared/tenant.ts")).href);

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
  H1.users[token] = { id: "user-1" };
  fake({ marker: null });
  const own = await T.requireMember(req(token), "biz-1");
  check("the owner's own session gets its membership", own?.role === "owner" && own?.businessId === "biz-1", JSON.stringify(own));
  check("the marker is looked up by THIS token's session id", globalThis.__harness.filters.some(([t, c, v]) => t === "support_sessions" && c === "session_id" && v === SID));

  fake({ marker: live() });
  const liveNo = await T.requireMember(req(token), "biz-1");
  check("a live support session is refused by default", liveNo === null && !globalThis.__harness.reads.includes("business_users"), JSON.stringify({ liveNo, reads: globalThis.__harness.reads }));
  fake({ marker: live() });
  const liveYes = await T.requireMember(req(token), "biz-1", { allowSupport: true });
  check("a live support session passes where support is allowed (read-only functions)", liveYes?.role === "owner", JSON.stringify(liveYes));
  check("a live support session is not signed out", globalThis.__harness.signedOut.length === 0);

  fake({ marker: backDated() });
  const expYes = await T.requireMember(req(token), "biz-1", { allowSupport: true });
  const db = globalThis.__harness;
  check("97.15: a back-dated support session is refused EVEN where support is allowed", expYes === null, JSON.stringify(expYes));
  check("97.15: — before any membership is read", !db.reads.includes("business_users"), JSON.stringify(db.reads));
  check("97.15: — and its session is signed out at Auth, this session only (local)", db.signedOut.length === 1 && db.signedOut[0][0] === token && db.signedOut[0][1] === "local", JSON.stringify(db.signedOut));
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

test("4.3c · the real create-business handler and the real platform-admin switch, called", async () => {
  stage("t2-handlers");
  // The handlers under test are the production files, loaded through the
  // harness hook: no copies, so there is nothing to prove identical.
  // The handlers under test are the production files, loaded through the
  // harness hook: no copies, so there is nothing to prove identical.
  // The recording database both handlers run against.
  const H = (globalThis.__harness = {});
  const resetH = () => {
    for (const k of Object.keys(H)) delete H[k];
    Object.assign(H, {
      users: {}, admins: {}, markers: {}, markerReadError: null, businesses: {},
      failInsert: {}, failUpdate: {},
      events: [], createdBusinesses: [], memberships: [], writes: [], reads: [],
    });
  };
  resetH();
  const OPENER = "admin-1";
  H.admins[OPENER] = "opener@example.com";
  H.businesses["biz-1"] = { id: "biz-1", name: "Coastline", slug: "coastline" };
  const tok = (sub, sid) => {
    const t = jwt({ sub, session_id: sid });
    H.users[t] = { id: sub, email: `${sub}@example.com` };
    return t;
  };
  const PREV1 = "prev-1-sid", PREV2 = "prev-2-sid";
  const TOK_ORD = tok("user-1", "ord-sid");
  const TOK_PREV1 = tok("user-1", PREV1);
  const TOK_PREV2 = tok("user-2", PREV2);
  const TOK_OPENER = tok(OPENER, "opener-sid");

  captured.current = null;
  await import(pathToFileURL(REAL("create-business/index.ts")).href);
  const cbHandler = captured.current;
  captured.current = null;
  await import(pathToFileURL(REAL("platform-admin/index.ts")).href);
  const paHandler = captured.current;
  check("both production handlers were captured from the production files", !!cbHandler && !!paHandler);
  if (BREAK) check(`BREAK=${BREAK} landed in the executed copy`, readMarker()?.landed === true);
  if (!cbHandler || !paHandler) return;

  const cbReq = (token) => new Request("http://edge.test/fn", {
    method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ name: "New Shop", slug: "new-shop", timezone: "America/Los_Angeles" }),
  });
  // A locked preview: listed, no unlocked_at, deadline ahead.
  H.markers[PREV1] = { session_id: PREV1, user_id: "user-1", business_id: "biz-1", admin_id: OPENER, unlocked_at: null, expires_at: new Date(Date.now() + 60 * 60e3).toISOString() };
  let r = await cbHandler(cbReq(TOK_PREV1));
  let b = await r.json();
  check("locked preview token: create-business refuses 403 read-only", r.status === 403 && /read-only/.test(b.error || ""), JSON.stringify({ status: r.status, body: b }));
  check("locked preview token: no business and no membership is recorded", H.createdBusinesses.length === 0 && H.memberships.length === 0, JSON.stringify({ created: H.createdBusinesses, memberships: H.memberships }));

  // An unlocked preview still never creates a business (R1 ii).
  H.markers[PREV1].unlocked_at = new Date().toISOString();
  r = await cbHandler(cbReq(TOK_PREV1));
  b = await r.json();
  check("unlocked preview token: create-business still refuses 403", r.status === 403 && /read-only/.test(b.error || ""), JSON.stringify({ status: r.status, body: b }));
  check("unlocked preview token: still nothing recorded", H.createdBusinesses.length === 0 && H.memberships.length === 0, JSON.stringify({ created: H.createdBusinesses, memberships: H.memberships }));
  H.markers[PREV1].unlocked_at = null;

  r = await cbHandler(cbReq(TOK_ORD));
  b = await r.json();
  check("ordinary token: create-business succeeds", r.status === 200 && b.success === true, JSON.stringify({ status: r.status, body: b }));
  check("ordinary token: the business and the owner membership are recorded for the caller",
    H.createdBusinesses.length === 1 && H.createdBusinesses[0].name === "New Shop"
    && H.memberships.length === 1 && H.memberships[0].user_id === "user-1" && H.memberships[0].role === "owner",
    JSON.stringify({ created: H.createdBusinesses, memberships: H.memberships }));
  r = await cbHandler(cbReq("forged.token.here"));
  check("forged token: create-business answers 401 and records nothing",
    r.status === 401 && H.createdBusinesses.length === 1, JSON.stringify({ status: r.status }));

  // The switch, with the clock frozen: T0 is now for the whole section, including the
  // `new Date()` stamp the handler writes (freezing Date.now alone leaves that real).
  const RealDate = Date;
  const T0 = Date.now();
  class FrozenDate extends RealDate {
    constructor(...args) { super(...(args.length ? args : [T0])); }
    static now() { return T0; }
  }
  globalThis.Date = FrozenDate;
  try {
    const iso = (ms) => new Date(ms).toISOString();
    H.markers[PREV1] = { session_id: PREV1, user_id: "user-1", business_id: "biz-1", admin_id: OPENER, unlocked_at: null, expires_at: iso(T0 + 60 * 60e3) };
    const PREVU = "prev-unlocked-sid";
    H.markers[PREVU] = { session_id: PREVU, user_id: "user-1", business_id: "biz-1", admin_id: OPENER, unlocked_at: iso(T0 - 10 * 60e3), expires_at: iso(T0 + 60 * 60e3) };
    const TOK_PREVU = tok("user-1", PREVU);
    const PREVX = "prev-expired-sid";
    H.markers[PREVX] = { session_id: PREVX, user_id: "user-1", business_id: "biz-1", admin_id: OPENER, unlocked_at: null, expires_at: iso(T0 - 60e3) };
    const TOK_PREVX = tok("user-1", PREVX);
    const PREVXU = "prev-expired-unlocked-sid";
    H.markers[PREVXU] = { session_id: PREVXU, user_id: "user-1", business_id: "biz-1", admin_id: OPENER, unlocked_at: iso(T0 - 70 * 60e3), expires_at: iso(T0 - 60e3) };
    const TOK_PREVXU = tok("user-1", PREVXU);
    const PREV_AT = "prev-exactly-at-sid";
    H.markers[PREV_AT] = { session_id: PREV_AT, user_id: "user-1", business_id: "biz-1", admin_id: OPENER, unlocked_at: null, expires_at: iso(T0) };
    const TOK_PREV_AT = tok("user-1", PREV_AT);
    H.markers[PREV2] = { session_id: PREV2, user_id: "user-2", business_id: "biz-1", admin_id: OPENER, unlocked_at: null, expires_at: iso(T0 + 60 * 60e3) };
    const eventsBefore = H.events.length;

    r = await paHandler(post(TOK_PREV1, "support_unlock"));
    b = await r.json();
    check("unlock a live locked preview: 200 unlocked", r.status === 200 && b.unlocked === true && b.success === true, JSON.stringify({ status: r.status, body: b }));
    check("unlock stamps unlocked_at at the frozen now and leaves the fixed deadline alone",
      H.markers[PREV1].unlocked_at === iso(T0) && H.markers[PREV1].expires_at === iso(T0 + 60 * 60e3), JSON.stringify(H.markers[PREV1]));
    check("unlock is audited: the opener, the business, the action, and who pressed",
      H.events.length === eventsBefore + 1 && H.events[H.events.length - 1].admin_id === OPENER
      && H.events[H.events.length - 1].action === "support_unlock" && H.events[H.events.length - 1].business_id === "biz-1"
      && H.events[H.events.length - 1].business_name === "Coastline" && H.events[H.events.length - 1].detail?.as === "user-1@example.com",
      JSON.stringify(H.events[H.events.length - 1]));

    r = await paHandler(post(TOK_PREV1, "support_lock"));
    b = await r.json();
    check("relock the same session: 200 looking again", r.status === 200 && b.unlocked === false && b.success === true, JSON.stringify({ status: r.status, body: b }));
    check("relock clears unlocked_at and is audited as support_lock",
      H.markers[PREV1].unlocked_at === null && H.events[H.events.length - 1].action === "support_lock" && H.events[H.events.length - 1].business_id === "biz-1",
      JSON.stringify({ marker: H.markers[PREV1], event: H.events[H.events.length - 1] }));

    r = await paHandler(post(TOK_PREVX, "support_unlock"));
    b = await r.json();
    check("an expired locked preview stays locked: 403 ended", r.status === 403 && /ended/.test(b.error || ""), JSON.stringify({ status: r.status, body: b }));
    check("expired unlock changes no marker and writes no audit", H.markers[PREVX].unlocked_at === null && H.events.length === eventsBefore + 2, JSON.stringify(H.events.length));
    r = await paHandler(post(TOK_PREVXU, "support_unlock"));
    b = await r.json();
    check("an expired unlocked preview stays refused: 403 ended", r.status === 403 && /ended/.test(b.error || ""), JSON.stringify({ status: r.status, body: b }));
    r = await paHandler(post(TOK_PREV_AT, "support_unlock"));
    b = await r.json();
    check("exactly at the deadline counts as ended: 403", r.status === 403 && /ended/.test(b.error || ""), JSON.stringify({ status: r.status, body: b }));

    const snap = JSON.stringify([H.markers, H.events.length]);
    r = await paHandler(post("forged.token.here", "support_unlock"));
    b = await r.json();
    check("forged token: 403 not recognized and nothing changes", r.status === 403 && /not recognized/.test(b.error || "") && JSON.stringify([H.markers, H.events.length]) === snap, JSON.stringify({ status: r.status, body: b }));
    r = await paHandler(post(TOK_ORD, "support_unlock"));
    b = await r.json();
    check("an unmarked ordinary session: 200 marked:false, no marker is created and nothing is audited",
      r.status === 200 && b.marked === false && !(("ord-sid") in H.markers) && H.events.length === eventsBefore + 2, JSON.stringify({ status: r.status, body: b, markers: Object.keys(H.markers) }));

    delete H.admins[OPENER];
    r = await paHandler(post(TOK_PREV1, "support_unlock"));
    b = await r.json();
    check("the opener's back-office sign-in is gone: 403 and the marker is untouched", r.status === 403 && /gone/.test(b.error || "") && H.markers[PREV1].unlocked_at === null, JSON.stringify({ status: r.status, body: b }));
    H.admins[OPENER] = "opener@example.com";
    const PREVNA = "prev-no-admin-sid";
    H.markers[PREVNA] = { session_id: PREVNA, user_id: "user-1", business_id: "biz-1", admin_id: null, unlocked_at: null, expires_at: iso(T0 + 60 * 60e3) };
    const TOK_PREVNA = tok("user-1", PREVNA);
    r = await paHandler(post(TOK_PREVNA, "support_unlock"));
    b = await r.json();
    check("a marker with no recorded opener: 403", r.status === 403 && /no recorded opener/.test(b.error || ""), JSON.stringify({ status: r.status, body: b }));

    H.failInsert["platform_admin_events"] = true;
    r = await paHandler(post(TOK_PREV1, "support_unlock"));
    b = await r.json();
    check("unlock with a failed audit: 500 and the marker STAYS LOCKED (audit first)", r.status === 500 && H.markers[PREV1].unlocked_at === null, JSON.stringify({ status: r.status, body: b }));
    H.failInsert["platform_admin_events"] = false;
    H.failUpdate["support_sessions"] = true;
    r = await paHandler(post(TOK_PREV1, "support_unlock"));
    b = await r.json();
    check("unlock with a failed marker write: 500 switch-on and nothing changes", r.status === 500 && /switch changes on/.test(b.error || "") && H.markers[PREV1].unlocked_at === null, JSON.stringify({ status: r.status, body: b }));
    r = await paHandler(post(TOK_PREVU, "support_lock"));
    b = await r.json();
    check("lock with a failed marker write: 500 switch-off and the marker stays unlocked", r.status === 500 && /switch changes off/.test(b.error || "") && H.markers[PREVU].unlocked_at !== null, JSON.stringify({ status: r.status, body: b }));
    H.failUpdate["support_sessions"] = false;
    H.failInsert["platform_admin_events"] = true;
    r = await paHandler(post(TOK_PREVU, "support_lock"));
    b = await r.json();
    H.failInsert["platform_admin_events"] = false;
    check("lock applies first: 500 locked:true, the marker IS locked, and the missing audit is said out loud",
      r.status === 500 && b.locked === true && /was not recorded/.test(b.error || "") && H.markers[PREVU].unlocked_at === null, JSON.stringify({ status: r.status, body: b, marker: H.markers[PREVU] }));

    const prev1Before = JSON.stringify(H.markers[PREV1]);
    r = await paHandler(post(TOK_PREV2, "support_unlock"));
    b = await r.json();
    check("the second account's preview unlocks: 200", r.status === 200 && b.unlocked === true, JSON.stringify({ status: r.status, body: b }));
    check("the second unlock touches only its own marker and audits its own press",
      JSON.stringify(H.markers[PREV1]) === prev1Before && H.markers[PREV2].unlocked_at === iso(T0)
      && H.events[H.events.length - 1].detail?.as === "user-2@example.com", JSON.stringify(H.markers[PREV1]));
  } finally {
    globalThis.Date = RealDate;
  }

  // The admin gate: a preview is never an admin session, locked or not.
  let g = await paHandler(post(TOK_PREV2, "whoami"));
  check("unlocked preview token at the admin gate: 404, the established non-admin answer", g.status === 404, JSON.stringify({ status: g.status, body: await g.json() }));
  g = await paHandler(post(TOK_PREV1, "whoami"));
  check("locked preview token at the admin gate: 404", g.status === 404, JSON.stringify({ status: g.status, body: await g.json() }));
  g = await paHandler(post(TOK_OPENER, "whoami"));
  const gb = await g.json();
  check("ordinary admin token at the admin gate: 200 admin:true", g.status === 200 && gb.admin === true, JSON.stringify({ status: g.status, body: gb }));
});

test("4.3c R3 — preview-emails and create-booking run against recording fakes", async () => {
  stage("t4-side-effects");
  // The stand-ins this test needs are part of the shared harness (recording
  // mail, a recording engine entry, throwing slot and rate limits); the two
  // handlers are the production files.
  // Loaded above through the harness hook: the production files.
  // The recording harness both handlers run against.
  const H = (globalThis.__harness = {});
  const resetH = () => {
    for (const k of Object.keys(H)) delete H[k];
    Object.assign(H, {
      users: {}, markers: {},
      businesses: { "biz-1": { id: "biz-1", slug: "coastline", name: "Coastline", status: "active", timezone: "America/Los_Angeles", contact_email: "owner@example.com", contact_phone: null, dropoff_address: null, service_area: null, mailing_address: null } },
      memberships: [{ user_id: "user-1", business_id: "biz-1", role: "owner", permissions: [] }],
      services: [{ id: "svc-1" }],
      mail: [], pricing: [], writes: [], reads: [], pricingThrow: false,
    });
  };
  resetH();
  const tok = (sub, sid) => {
    const t = jwt({ sub, session_id: sid });
    H.users[t] = { id: sub, email: `${sub}@example.com` };
    return t;
  };
  const TOK_ORD = tok("user-1", "ord-sid");
  const PREV = "t4-prev-sid";
  const TOK_PREV = tok("user-1", PREV);
  H.markers[PREV] = { session_id: PREV, user_id: "user-1", business_id: "biz-1", admin_id: "admin-1", unlocked_at: null, expires_at: new Date(Date.now() + 60 * 60e3).toISOString() };

  captured.current = null;
  await import(pathToFileURL(REAL("preview-emails/index.ts")).href);
  const peHandler = captured.current;
  captured.current = null;
  await import(pathToFileURL(REAL("create-booking/index.ts")).href);
  const cbkHandler = captured.current;
  check("both production handlers were captured from the production files", !!peHandler && !!cbkHandler);
  if (BREAK) check(`BREAK=${BREAK} landed in the executed copy`, readMarker()?.landed === true);
  if (!peHandler || !cbkHandler) return;

  // preview-emails: a locked support session must not send anything. The only
  // mail this function sends goes through the recording sendTenantEmail above,
  // so zero calls means no mail and no billed send.
  const peReq = (token) => new Request("http://edge.test/fn", {
    method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ business_id: "biz-1" }),
  });
  let r = await peHandler(peReq(TOK_PREV));
  let b = await r.json();
  check("locked preview token: preview-emails refuses 401 and sends no mail",
    r.status === 401 && H.mail.length === 0, JSON.stringify({ status: r.status, body: b, mail: H.mail.length }));
  // The paired ordinary request runs the whole path and lands only in the
  // owner's own inbox (R4: ordinary owners can still send preview emails).
  r = await peHandler(peReq(TOK_ORD));
  b = await r.json();
  check("ordinary token: preview-emails succeeds and sends only to the owner's addresses",
    r.status === 200 && b.success === true && H.mail.length === 2 && H.mail.every((m) => m.to === "owner@example.com"),
    JSON.stringify({ status: r.status, body: b, mail: H.mail }));

  // create-booking: a locked support session is not an anonymous customer. The
  // pricing stub stops the engine at its entry and records the call, so the
  // assertions below tell the gate apart from everything past it.
  H.pricing = []; H.pricingThrow = true;
  const BOOK = { business_slug: "coastline", customer_name: "Test Customer", customer_phone: "5551234567", customer_email: "customer@example.com", service_type: "dropoff", vehicle_size: "small", booking_date: "2026-10-30", start_time: "10:00", service_ids: ["svc-1"], add_ons: [] };
  const cbReq = (token) => new Request("http://edge.test/fn", {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } : { "Content-Type": "application/json" },
    body: JSON.stringify(BOOK),
  });
  r = await cbkHandler(cbReq(TOK_PREV));
  b = await r.json();
  check("locked preview token: create-booking refuses 403 read-only before the public branch",
    r.status === 403 && /read-only/.test(b.error || ""), JSON.stringify({ status: r.status, body: b }));
  check("locked preview token: the engine is never reached and no booking row is written",
    H.pricing.length === 0 && !H.writes.some(([t]) => t === "bookings"),
    JSON.stringify({ pricing: H.pricing, writes: H.writes }));
  // The paired ordinary member request passes the new gate into the engine (the
  // pricing stub answers 400 there; the stored-price math is covered by the
  // pricing suites, which run against the real backend).
  const pricingBefore = H.pricing.length;
  r = await cbkHandler(cbReq(TOK_ORD));
  b = await r.json();
  check("ordinary member token: passes the support gate into the engine (400 from the pricing stub, never 403)",
    r.status === 400 && /Invalid service or add-on selection/.test(b.error || "") && H.pricing.length === pricingBefore + 2,
    JSON.stringify({ status: r.status, body: b, pricing: H.pricing.length }));
  // A caller with no session at all still books as public: the refusal is support-only.
  r = await cbkHandler(cbReq(null));
  b = await r.json();
  check("anonymous token: still reaches the public branch (400 from the pricing stub, never 403)",
    r.status === 400 && /Invalid service or add-on selection/.test(b.error || ""),
    JSON.stringify({ status: r.status, body: b }));
  // An expired preview is refused the same way: expiry never restores writability.
  const PREVX = "t4-prev-expired-sid";
  const TOK_PREVX = tok("user-1", PREVX);
  H.markers[PREVX] = { session_id: PREVX, user_id: "user-1", business_id: "biz-1", admin_id: "admin-1", unlocked_at: null, expires_at: new Date(Date.now() - 60e3).toISOString() };
  const pricingBeforeX = H.pricing.length;
  r = await cbkHandler(cbReq(TOK_PREVX));
  b = await r.json();
  check("expired preview token: create-booking refuses 403 and never reaches the engine",
    r.status === 403 && /read-only/.test(b.error || "") && H.pricing.length === pricingBeforeX,
    JSON.stringify({ status: r.status, body: b, pricing: H.pricing.length }));
});


test("4.3c · LINT-STYLE GUARD over source: every user-authenticating function asks the support question", () => {
  const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  const fns = readdirSync(FN).filter((d) => !d.startsWith("_") && existsSync(`${FN}/${d}/index.ts`));
  const userAuth = [];
  const classify = (name, src) => {
    const s = stripComments(src);
    // F2: create-business and platform-admin guard with markedPreview (any marked preview,
    // locked or not, is never an owner/admin session) instead of supportSession.
    if (/auth\.getUser\(/.test(s)) {
      if (/supportSession\(token\)/.test(s)) return "own getUser + supportSession";
      if (/markedPreview\(token\)/.test(s)) return "own getUser + markedPreview (never an owner/admin session)";
      return "UNGUARDED getUser";
    }
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
  // Restored after review (97.15): three 4.3c checks the first rewrite dropped. Each is also RUN in
  // the browser by scripts/support-view-ends.mjs (the updateUser refusal, the placeholder refresh
  // token on both paths); here they hold the source between browser runs.
  check("impersonate exchanges the link on a fresh client, not the shared service-role one", /createClient\(SUPABASE_URL, anon/.test(imp) && imp.indexOf("verifyOtp(") > 0);
  const client = stripComments(readFileSync("app/src/lib/supabase.js", "utf8"));
  check("the browser guard covers auth.updateUser in a preview tab (the only thing between a preview tab and the owner's password and email at Auth)", /supabase\.auth\.updateUser = \(\.\.\.args\) => \{ guardWrite\(\);/.test(client));
  const entry = stripComments(readFileSync("app/src/admin/PreviewEntry.jsx", "utf8"));
  check("the preview door holds the placeholder refresh token on BOTH paths (server session and older link)", (entry.match(/refresh_token: NO_REFRESH/g) || []).length === 2 && !/q\.get\("rt"\)/.test(entry));

  // CANARY, every run: a function that checks the user itself and forgets the support question.
  const canary = classify("canary", `const { data } = await supabase.auth.getUser(token); await supabase.from("x").insert({});`);
  const canaryCaught = canary === "UNGUARDED getUser";
  check("canary: an unguarded getUser function is caught", canaryCaught, canary);
  if (BREAK) check(`BREAK=${BREAK} landed in the executed copy`, readMarker()?.landed === true);

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
    min_assertions: 24 + 30 + 8 + EXPECTED_USER_AUTH + 9,
    assertion_floor: "structural: eight decision calls, ten requireMember calls, six hand-over calls, the handler test's thirty calls (one capture, seven create-business, nineteen switch, three admin gate), the side-effect test's eight calls (one capture, two preview-emails, five create-booking), then the lint guard (one count, one per discovered function, seven fixed, one canary)",
    failures,
    canary: { id: "unguarded-getUser", observed_failure: canaryCaught },
    artifacts: ["supabase/functions/_shared/supportSession.ts", "supabase/functions/_shared/tenant.ts", "supabase/functions/_shared/previewSwitch.ts", "supabase/functions/create-business/index.ts", "supabase/functions/platform-admin/index.ts", "supabase/functions/preview-emails/index.ts", "supabase/functions/create-booking/index.ts"],
    dimensions: { break: BREAK || undefined, functions: Object.fromEntries(userAuth.map((u) => [u.fn, u.verdict])) },
  });
  assert.deepEqual(failures, []);
});
