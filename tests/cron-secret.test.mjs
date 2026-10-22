// ROADMAP 97.3 — THE FOUR BACKGROUND JOBS REFUSE ANYONE BUT THE SCHEDULER, RUN
// RATHER THAN READ.
//
// `send-owner-reminders` (its sweep), `refresh-weather`, `watch-jobs` and
// `photo-reconcile` are public at the gateway because pg_cron has no session.
// Until 97.3 anyone could fire them. `_shared/cronAuth.ts` now requires the
// `x-cron-secret` header to equal `CRON_SECRET`.
//
// THIS LOADS THE FOUR REAL `index.ts` FILES (`loadEdge` in
// `scripts/lib/edgeLocal.mjs`) AND CALLS EACH HANDLER AS A FUNCTION. NO SERVER,
// NO SOCKET, NO SECRET: the functions read a plain in-memory environment rather
// than `process.env` (the cron secret is minted per run), and `fetch` is replaced
// by a fake Supabase held in this file before anything is imported. Every socket
// connect is refused and counted (section 0), so "opened no network connection"
// is measured rather than promised. Every request a function makes is logged,
// which is how "refused before it touched anything" is a measurement too.
//
//   node tests/cron-secret.test.mjs
//   CRON_BREAK=open node tests/cron-secret.test.mjs   # guard replaced by a no-op: MUST be red
//
// An env var, not a flag: `node --test` swallows extra arguments (gotchas 104).

import { registerHooks } from "node:module";
import net from "node:net";
import { randomBytes } from "node:crypto";
import { writeFileSync } from "node:fs";
import { writeReceipt } from "../scripts/receipt.mjs";

const started_at = new Date().toISOString();
const BREAK = process.env.CRON_BREAK || "";
if (BREAK && BREAK !== "open") { console.error(`Unknown CRON_BREAK=${BREAK}. Known: open.`); process.exit(2); }

// NO SOCKET. Anything that tries to open one is refused and counted.
let sockets = 0;
net.Socket.prototype.connect = function () { sockets++; throw new Error("cron-secret.test opens no network connection"); };

// THE SABOTAGE IS THE ORIGINAL DEFECT: no caller check at all. Hooks chain, and
// edgeLocal's passes this specifier through, so this replaces the production module.
if (BREAK === "open") {
  registerHooks({
    resolve(spec, ctx, next) {
      if (spec.endsWith("/_shared/cronAuth.ts")) {
        return { url: "data:text/javascript,export const cronRefusal = () => null; export const CRON_HEADER = 'x-cron-secret';", shortCircuit: true };
      }
      return next(spec, ctx);
    },
  });
}

let passed = 0, assertions = 0;
const failures = [];
const check = (name, ok, got = "") => {
  assertions++;
  if (ok) { passed++; console.log(`  ok    ${name}`); return true; }
  failures.push(got ? `${name} - got ${got}` : name);
  console.log(`  FAIL  ${name}${got ? ` - got ${got}` : ""}`);
  return false;
};

// ── THE FAKE SUPABASE, AS A fetch ──────────────────────────────────────────
const FAKE = "https://fake-supabase.invalid";
const B1 = "11111111-1111-4111-8111-111111111111";
const B2 = "22222222-2222-4222-8222-222222222222";
const BK = "33333333-3333-4333-8333-333333333333"; // B1's booking
const LEAK_ID = "44444444-4444-4444-8444-444444444444"; // a due booking whose business is gone
const RAW = "SENTINEL-RAW-POSTGREST-ERROR-97-3";
const soon = new Date(Date.now() + 26 * 3600_000).toISOString();
const TABLES = {
  businesses: [
    { id: B1, slug: "b1", name: "Fixture One", status: "active", timezone: "America/Los_Angeles", contact_email: "one@fixture.test" },
    { id: B2, slug: "b2", name: "Fixture Two", status: "active", timezone: "America/Los_Angeles", contact_email: "two@fixture.test" },
  ],
  business_users: [
    { user_id: "u1", business_id: B1, role: "owner", permissions: [] },
    { user_id: "u2", business_id: B2, role: "owner", permissions: [] },
  ],
  bookings: [{
    id: BK, business_id: B1, status: "confirmed", customer_name: "Pat Fixture", customer_email: "pat@fixture.test",
    start_at: soon, end_at: soon, service_type: "mobile", subtotal: 100, total_price: 100, lang: "en",
  }],
  business_settings: [{ business_id: B1, email_customer_reminder: true, email_owner_reminder: false, push_enabled: false }],
  job_heartbeats: [{ job: "photo-reconcile", ran_at: new Date().toISOString(), detail: {} }],
};
const LEAK_ROW = { ...TABLES.bookings[0], id: LEAK_ID, business_id: "gone" };
let mode = "normal";          // "leak": the sweep finds a booking that fails; "raw": an RPC answers an error
const log = [];
const relay = [];
const outside = [];

const send = (status, body, headers = {}) =>
  new Response(body === undefined ? "" : JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...headers } });

globalThis.fetch = async (input, init) => {
  const req = new Request(input, init);
  const u = new URL(req.url);
  const text = ["GET", "HEAD"].includes(req.method) ? "" : await req.text();
  if (u.origin !== FAKE) { outside.push(`${req.method} ${u.origin}${u.pathname}`); return send(502, { message: "outside" }); }
  log.push(`${req.method} ${u.pathname}`);
  if (u.pathname === "/auth/v1/user") {
    const tok = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
    const id = { "fake-u1": "u1", "fake-u2": "u2" }[tok];
    return id ? send(200, { id, aud: "authenticated", role: "authenticated" }) : send(401, { msg: "bad jwt" });
  }
  if (u.pathname === "/functions/v1/send-email") { relay.push(JSON.parse(text || "{}")); return send(200, { ok: true }); }
  const rpc = u.pathname.match(/^\/rest\/v1\/rpc\/(.+)$/);
  if (rpc) {
    const fn = rpc[1];
    if (fn === "get_bookings_due_for_reminder" && mode === "raw") return send(400, { message: RAW, code: "P0001" });
    if (fn === "get_bookings_due_for_reminder" && mode === "leak") {
      const args = JSON.parse(text || "{}");
      if (args.target === "owner") return send(200, [LEAK_ROW]);
    }
    if (fn === "rate_take") return send(200, true);
    if (fn === "note_heartbeat") return send(200, null);
    return send(200, []);
  }
  const tbl = u.pathname.match(/^\/rest\/v1\/([a-z_]+)$/);
  if (tbl) {
    let rows = TABLES[tbl[1]] ?? [];
    if (tbl[1] === "bookings" && mode === "leak") rows = [...rows, LEAK_ROW];
    for (const [k, v] of u.searchParams) {
      const m = String(v).match(/^eq\.(.*)$/);
      if (m) rows = rows.filter((r) => String(r[k]) === m[1]);
      if (v === "is.null") rows = rows.filter((r) => r[k] == null);
    }
    // ROADMAP 97.4: the sweep CLAIMS a due booking (a PATCH that matches only
    // while the marker is empty, returning the row) before it sends, so a
    // write answers with the rows it matched, as PostgREST does. Answering []
    // reads as "another sweep claimed it first" and the booking is skipped.
    if (req.method !== "GET" && req.method !== "HEAD") {
      // A PATCH carries its new values in the body and PostgREST applies them
      // before answering: the manual marker write is verified against the
      // returned row, so the fake must hand back the stamped row, not the
      // pre-write one. (The sweep's claim only counts rows, which is why this
      // never mattered before 97.33.)
      if (req.method === "PATCH") {
        let patch = {};
        try { patch = JSON.parse(text || "{}"); } catch (ignored) { patch = {}; }
        for (const r of rows) Object.assign(r, patch);
      }
      const back = /return=representation/.test(req.headers.get("prefer") || "") ? rows : [];
      return send(200, back, { "Content-Range": `*/${back.length}` });
    }
    if (String(req.headers.get("accept") || "").includes("vnd.pgrst.object")) {
      return rows.length === 1 ? send(200, rows[0]) : send(406, { code: "PGRST116", message: "0 rows" });
    }
    return send(200, rows, { "Content-Range": `0-${Math.max(rows.length - 1, 0)}/${rows.length}` });
  }
  return send(404, { message: "no fake for " + u.pathname });
};

// THE ENVIRONMENT THE FUNCTIONS READ — a plain object, never `process.env`. The
// secret is minted per run and never written anywhere. The R2 names hold
// placeholders so `photo-reconcile` reaches its own logic; its last run is
// stamped "now", so it answers "too soon" before it would ever list storage.
const SECRET = randomBytes(24).toString("hex");
const ENV = {
  SUPABASE_URL: FAKE,
  SUPABASE_SERVICE_ROLE_KEY: "placeholder",
  CRON_SECRET: SECRET,
  R2_ACCOUNT_ID: "placeholder", R2_ACCESS_KEY_ID: "placeholder", R2_SECRET_ACCESS_KEY: "placeholder",
};

const { loadEdge } = await import("../scripts/lib/edgeLocal.mjs");
const FUNCTIONS = ["send-owner-reminders", "refresh-weather", "watch-jobs", "photo-reconcile"];
const handlers = await loadEdge(FUNCTIONS, ENV);

const call = async (fn, { header, auth, body = {} } = {}) => {
  log.length = 0;
  const h = { "Content-Type": "application/json" };
  if (header !== undefined) h["x-cron-secret"] = header;
  if (auth) h.Authorization = `Bearer ${auth}`;
  const r = await handlers.get(fn)(new Request(`http://local/functions/v1/${fn}`, { method: "POST", headers: h, body: JSON.stringify(body) }));
  return { status: r.status, text: await r.text(), touched: log.length };
};

const transcript = [];
const note = (line) => { transcript.push(line); };
let completed = 0;

// ── 1 . EACH OF THE FOUR: REFUSED WITHOUT, REFUSED WRONG, RUNS WITH ────────
for (const fn of FUNCTIONS) {
  console.log(`\n1. ${fn}`);
  const none = await call(fn);
  const wrong = await call(fn, { header: SECRET.slice(0, -1) + (SECRET.endsWith("0") ? "1" : "0") });
  const right = await call(fn, { header: SECRET });
  note(`${fn}: no header ${none.status} (${none.touched} db calls) | wrong ${wrong.status} (${wrong.touched}) | right ${right.status} (${right.touched}) ${right.text.slice(0, 160)}`);
  const a = check(`1.${fn} . no header is refused with 401`, none.status === 401, `${none.status} ${none.text.slice(0, 80)}`);
  const b = check(`1.${fn} . and refused before it touched the database`, none.touched === 0, String(none.touched));
  const c = check(`1.${fn} . a wrong secret is refused with 401`, wrong.status === 401, String(wrong.status));
  const d = check(`1.${fn} . the right secret runs it (200)`, right.status === 200, `${right.status} ${right.text.slice(0, 120)}`);
  const e = check(`1.${fn} . and it did its work: it reached the database`, right.touched > 0, String(right.touched));
  if (a && b && c && d && e) completed++;
}

// ── 2 . THE MANUAL "SEND REMINDER" STILL WORKS FOR A MEMBER, NO HEADER ─────
console.log("\n2. the manual re-send, signed in, with no cron header");
relay.length = 0;
const own = await call("send-owner-reminders", { auth: "fake-u1", body: { business_id: B1, booking_id: BK, target: "customer" } });
note(`manual, member of B1, own booking: ${own.status} ${own.text} | relay got ${relay.length}: ${relay.map((m) => m.to).join(", ")}`);
check("2a . a member re-sending their own booking's reminder gets 200", own.status === 200, `${own.status} ${own.text}`);
check("2b . and the reminder reached the email relay, to that customer",
  relay.length === 1 && relay[0].to === "pat@fixture.test", JSON.stringify(relay.map((m) => m.to)));
const other = await call("send-owner-reminders", { auth: "fake-u2", body: { business_id: B2, booking_id: BK, target: "customer" } });
note(`manual, member of B2 (second account), B1's booking: ${other.status} ${other.text}`);
check("2c . a SECOND account (another business) cannot remind this booking", other.status === 404, `${other.status} ${other.text}`);
const anon = await call("send-owner-reminders", { body: { booking_id: BK, target: "customer" } });
check("2d . and no session at all is refused", anon.status === 401, String(anon.status));

// ── 3 . THE SWEEP'S PUBLIC ANSWER: NO BOOKING IDS, NO RAW ERRORS ───────────
console.log("\n3. what the sweep says back");
mode = "leak";
const leak = await call("send-owner-reminders", { header: SECRET });
note(`sweep with a failing due booking: ${leak.status} ${leak.text}`);
check("3a . a sweep with a failed booking still answers 200", leak.status === 200, String(leak.status));
check("3b . and it counted the failure", /"owner_reminder_failed":1/.test(leak.text), leak.text);
const leaks = (t) => t.includes(LEAK_ID) || /TypeError|Cannot read|null/i.test(t.replace(/"summary"/, ""));
check("3c . but names neither the booking id nor the error", !leaks(leak.text), leak.text);
mode = "raw";
const raw = await call("send-owner-reminders", { header: SECRET });
note(`sweep whose read fails: ${raw.status} ${raw.text}`);
check("3d . a sweep whose read fails answers 500", raw.status === 500, String(raw.status));
check("3e . with a fixed sentence, not the database's own error text", !raw.text.includes(RAW), raw.text);
mode = "normal";
// The detector's own canary: it must flag an answer shaped like the pre-fix one.
const canaryCaught = leaks(JSON.stringify({ results: [{ id: LEAK_ID, error: "TypeError: Cannot read properties of null" }] }));
check("3f . canary: the leak detector flags the old answer's shape", canaryCaught);

// ── 0 . NOTHING LEFT THIS PROCESS ──────────────────────────────────────────
console.log("\n0. the run itself");
note(`sockets attempted: ${sockets}; requests outside the fake: ${outside.length} ${outside.join(", ")}`);
check("0a . no socket was opened", sockets === 0, String(sockets));
check("0b . no request went anywhere but the in-memory fake", outside.length === 0, outside.join(", "));

const failed = failures.length;
console.log(`\n${passed} passed, ${failed} failed, ${assertions} assertions.`);
if (BREAK) console.log(`  note  CRON_BREAK=${BREAK} was set: this run is a sabotage and MUST be red.`);

const txt = BREAK ? "receipts/cron-secret.sabotage.txt" : "receipts/cron-secret.txt";
writeFileSync(txt, [`cron-secret ${new Date().toISOString()} break=${BREAK || "none"}`, ...transcript,
  `${passed} passed, ${failed} failed`, ...failures.map((f) => "FAIL " + f)].join("\n") + "\n");
writeReceipt({
  check_id: "cron-secret",
  started_at,
  status: failed ? "fail" : "pass",
  expected_targets: FUNCTIONS.length,
  discovered_targets: handlers.size,
  attempted_targets: FUNCTIONS.length,
  completed_targets: completed,
  skipped_targets: 0,
  assertions_executed: assertions,
  min_assertions: 32,
  assertion_floor: "5 per function x 4 + 4 in s2 + 6 in s3 + 2 in s0 = 32. DECLARED STRUCTURAL: every check() runs "
    + "unconditionally, no early return, and the only multiplier is the four functions the item names, so the "
    + "count cannot vary without a diff (`docs/gotchas.md` 98).",
  canary: { id: "pre-fix-sweep-answer", observed_failure: canaryCaught, what: "a sweep answer listing a booking id and a TypeError" },
  failures,
  artifacts: [txt],
  dimensions: {
    roadmap: "97.3",
    break: BREAK || null,
    unjudgeable: [
      "that pg_cron sends the header - the rescheduling migration is unapplied (FOR-ANDREW)",
      "that CRON_SECRET is set on the deployed functions - publishing is Andrew's",
    ],
  },
  warnings: ["Handlers called in-process against a fake Supabase in this file, not the live database: it proves the functions' own behavior, not the gateway's."],
});
process.exit(failed ? 1 : 0);
