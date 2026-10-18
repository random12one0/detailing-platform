// ROADMAP 97.4 — TWO REMINDER SWEEPS STARTED AT THE SAME MOMENT SEND EACH
// REMINDER EXACTLY ONCE.
//
// The fault: every stage of `send-owner-reminders` sent first and wrote its
// marker second, so two overlapping sweeps both read the same due rows and both
// sent everything. The fix claims the marker first (an UPDATE that only matches
// while it is still empty) and sends only when a row came back.
//
// WHAT THIS RUNS. The REAL `send-owner-reminders/index.ts`, type-stripped, with
// its twelve `_shared` imports swapped for stand-ins (the real `maintenance.ts`,
// `tz.ts`, `cronAuth.ts` (97.3) and `ownerFanout.ts` (97.5), which import
// nothing, are used as they are, so each sweep carries the cron secret). This repo has no Deno,
// and the file cannot load under Node otherwise (`Deno.serve`, a `jsr:` import).
// Each sweep is its own module instance, the way two invocations are two
// isolates. The database is an in-memory stand-in in which ONE CALL IS ONE
// STATEMENT and runs without yielding, which is the property Postgres gives one
// `UPDATE ... WHERE x IS NULL`: no other sweep can act between the filter and
// the write. Every call yields BEFORE it runs, so the two sweeps interleave.
// `sendTenantEmail` writes one `email_sends` row per attempt and returns false
// on a refusal, as the real relay does; nothing leaves this machine.
//
// WHAT IT CANNOT SEE: real Postgres locking, PostgREST, the real RPCs' due-ness
// rules (the stand-in returns a booking while its marker is empty, which is the
// part of their `where` this item is about), and the deployed function.
//
// THE CANARY, EVERY RUN: the same double run against the same production file
// with its three claims removed must send at least one reminder twice. The
// removal is checked to have landed (docs/gotchas.md 102) before it is trusted.
//
//   node tests/reminder-claim.test.mjs                  (credential-free, no network)
//   BREAK=no-claim node tests/reminder-claim.test.mjs   (the graded run itself loses
//                                                        its claims; must go red)
//   BREAK=no-business node tests/reminder-claim.test.mjs (ROADMAP 97.72: the graded run
//                                                        reads the deadline's customer by id
//                                                        alone again; must go red)
//   REMINDER_SRC=<file> node tests/reminder-claim.test.mjs   (another copy of the
//                                                        function, e.g. the pre-fix one;
//                                                        writes no receipt)
// BREAK is an env var, not a flag: `node --test` swallows flags (gotchas 104).

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import { writeReceipt } from "../scripts/receipt.mjs";
import * as maintenance from "../supabase/functions/_shared/maintenance.ts";
import * as tz from "../supabase/functions/_shared/tz.ts";
import * as cronAuth from "../supabase/functions/_shared/cronAuth.ts";
import * as ownerFanout from "../supabase/functions/_shared/ownerFanout.ts";

const started_at = new Date().toISOString();
const BREAK = process.env.BREAK || "";
if (BREAK && !["no-claim", "no-business"].includes(BREAK)) { console.error(`unknown BREAK=${BREAK}; the two are no-claim and no-business`); process.exit(2); }
const SRC_PATH = process.env.REMINDER_SRC || "supabase/functions/send-owner-reminders/index.ts";
const SOURCE = readFileSync(SRC_PATH, "utf8");

let passed = 0, assertions = 0;
const failures = [];
const log = [];
const say = (s) => { console.log(s); log.push(s); };
const check = (name, ok, detail = "") => {
  assertions++;
  if (ok) { passed++; say(`  ok    ${name}`); }
  else { failures.push(`${name}${detail ? ` — ${detail}` : ""}`); say(`  FAIL  ${name}\n        ${detail}`); }
};

// ---------------------------------------------------------------------------
// The three claims, as they are written in the production file. Removing them
// is the sabotage; each must be found exactly once or the removal did not land.
// ---------------------------------------------------------------------------
const CLAIMS = [
  [`.eq("id", id).is(col, null)`, `.eq("id", id)`],                                  // the seven booking stages
  [`.eq("id", d.id).eq("reminded_stage", d.reminded_stage)`, `.eq("id", d.id)`],     // the maintenance stage
  [`ignoreDuplicates: true`, `ignoreDuplicates: false`],                             // the morning digest
];

// ROADMAP 97.72 — the maintenance sweep reads the deadline's customer by id AND the deadline's business.
// Removing that filter is the second sabotage: it puts back the read that emailed another business's customer.
const BUSINESS_SCOPE = [`.eq("id", d.customer_id).eq("business_id", d.business_id)`, `.eq("id", d.customer_id)`];

function prepare(src, removeClaims, removeBusiness = false) {
  let s = src, landed = 0;
  if (removeClaims) {
    for (const [from, to] of CLAIMS) {
      if (s.split(from).length - 1 === 1) { s = s.replace(from, to); landed++; }
    }
  }
  if (removeBusiness) {
    const [from, to] = BUSINESS_SCOPE;
    if (s.split(from).length - 1 === 1) { s = s.replace(from, to); landed++; }
  }
  let js = stripTypeScriptTypes(s);
  js = js.replace(/^import\s+"jsr:[^"]+";\s*$/m, "");
  let rewritten = 0;
  js = js.replace(/^import\s*\{([\s\S]*?)\}\s*from\s*"\.\.\/_shared\/(\w+)\.ts";/gm, (_, names, mod) => {
    rewritten++;
    return `const {${names}} = globalThis.__stubs.${mod};`;
  });
  return { js, landed, rewritten, leftover: /^import\s/m.test(js) };
}

const CRON_SECRET = "local-test-secret"; // a made-up value; no real secret is read
let loads = 0;
async function isolate(js) {
  let handler = null;
  globalThis.Deno = { serve: (h) => { handler = h; }, env: { get: (k) => (k === "CRON_SECRET" ? CRON_SECRET : undefined) } };
  await import(`data:text/javascript;base64,${Buffer.from(`${js}\n// isolate ${++loads}\n`).toString("base64")}`);
  return handler;
}

// ---------------------------------------------------------------------------
// The database, the relay and the push service.
// ---------------------------------------------------------------------------
const tick = () => new Promise((r) => setImmediate(r));
const MARKERS = {
  owner_reminder_sent_at: "own",
  customer_reminder_sent_at: "cus",
  customer_reminder_2_sent_at: "cu2",
  owner_nudge_sent_at: "nud",
  owner_wrapup_nudge_sent_at: "wra",
  owner_finalize_nudge_sent_at: "fin",
  owner_request_nudge_sent_at: "req",
};
const DUE = {
  "get_bookings_due_for_reminder:owner": "owner_reminder_sent_at",
  "get_bookings_due_for_reminder:customer": "customer_reminder_sent_at",
  get_bookings_due_for_second_reminder: "customer_reminder_2_sent_at",
  get_bookings_due_for_nudge: "owner_nudge_sent_at",
  get_bookings_due_for_wrapup_nudge: "owner_wrapup_nudge_sent_at",
  get_bookings_due_for_finalize_nudge: "owner_finalize_nudge_sent_at",
  get_requests_due_for_nudge: "owner_request_nudge_sent_at",
};
const BIZ = { id: "biz-1", slug: "demo", name: "Demo", status: "active", timezone: "America/Los_Angeles",
  mailing_address: "1 Main St, Springfield, OR 97477", contact_email: "owner@example.test" };
const SETTINGS = { email_customer_reminder: true, customer_reminder_2_enabled: true, email_owner_reminder: true,
  push_enabled: true, email_customer_maintenance_due: true, daily_digest_hour: 0 };

function world() {
  const now = new Date().toISOString();
  const T = { bookings: [], maintenance_deadlines: [], customers: [], email_sends: [], businesses: [{ ...BIZ }], owner_daily_digest_state: [] };
  for (const [col, short] of Object.entries(MARKERS)) {
    for (let i = 0; i < 2; i++) {
      const b = { id: `bk-${short}-${i}`, business_id: BIZ.id, customer_name: `Customer ${short} ${i}`,
        customer_email: `c-${short}-${i}@example.test`, start_at: now, end_at: now, created_at: now,
        status: "confirmed", deleted_at: null, due: col, total_price: 100, subtotal: 100 };
      for (const m of Object.keys(MARKERS)) b[m] = null;
      T.bookings.push(b);
    }
  }
  const dueOn = new Date(Date.now() + 10 * 86_400_000).toISOString().slice(0, 10);
  T.maintenance_deadlines.push({ id: "md-1", business_id: BIZ.id, customer_id: "cu-1", label: "Ceramic coating",
    vehicle: "Civic", due_on: dueOn, repeat_months: 12, last_done_on: null, reminded_stage: 0, cancelled_at: null });
  // ROADMAP 97.72: a customer belongs to a business, and the sweep now asks for the deadline's own one.
  T.customers.push({ id: "cu-1", business_id: BIZ.id, name: "Pat", email: "pat@example.test", unsubscribed_at: null, email_failed_at: null });

  const pushes = [];
  const relay = { refuse: new Set(), failPush: () => false };
  const copy = (r) => ({ ...r });

  class Q {
    constructor(t) { this.t = t; this.f = []; this.op = "select"; this.ret = false; this.one = false; }
    select() { if (this.op !== "select") this.ret = true; return this; }
    update(v) { this.op = "update"; this.v = v; return this; }
    insert(v) { this.op = "insert"; this.v = v; return this; }
    upsert(v, o = {}) { this.op = "upsert"; this.v = v; this.o = o; return this; }
    delete() { this.op = "delete"; return this; }
    eq(c, v) { this.f.push((r) => r[c] === v); return this; }
    neq(c, v) { this.f.push((r) => r[c] !== v); return this; }
    is(c, v) { this.f.push((r) => (r[c] ?? null) === v); return this; }
    lte(c, v) { this.f.push((r) => r[c] <= v); return this; }
    gte(c, v) { this.f.push((r) => r[c] >= v); return this; }
    maybeSingle() { this.one = true; return this; }
    then(ok, no) { return tick().then(() => this.run()).then(ok, no); }
    // ONE CALL, ONE STATEMENT, NO YIELD between the filter and the write.
    run() {
      const rows = T[this.t];
      if (!rows) throw new Error(`no table ${this.t} in the stand-in`);
      const hit = rows.filter((r) => this.f.every((f) => f(r)));
      switch (this.op) {
        case "select": return { data: this.one ? (hit[0] ? copy(hit[0]) : null) : hit.map(copy), error: null };
        case "update": for (const r of hit) Object.assign(r, this.v); return { data: this.ret ? hit.map(copy) : null, error: null };
        case "delete": T[this.t] = rows.filter((r) => !hit.includes(r)); return { data: null, error: null };
        case "insert": rows.push(copy(this.v)); return { data: null, error: null };
        case "upsert": {
          const keys = this.o.onConflict.split(",");
          const old = rows.find((r) => keys.every((k) => r[k] === this.v[k]));
          if (old && this.o.ignoreDuplicates) return { data: this.ret ? [] : null, error: null };
          if (old) Object.assign(old, this.v); else rows.push(copy(this.v));
          return { data: this.ret ? [copy(old ?? this.v)] : null, error: null };
        }
      }
      throw new Error(`stand-in cannot run ${this.op}`);
    }
  }
  const rpc = (fn, args = {}) => tick().then(() => {
    if (fn === "note_heartbeat") return { data: null, error: null };
    const col = DUE[args.target ? `${fn}:${args.target}` : fn];
    if (!col) throw new Error(`stand-in has no rpc ${fn}`);
    return { data: T.bookings.filter((b) => b.due === col && b[col] === null).map(copy), error: null };
  });

  globalThis.__stubs = {
    db: { supabase: { from: (t) => new Q(t), rpc }, retryRead: (_label, run) => run() },
    http: {
      json: (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } }),
      preflight: () => new Response(null, { status: 204 }),
    },
    tenant: {
      businessById: async (id) => { await tick(); return copy(T.businesses.find((b) => b.id === id)); },
      getSettings: async () => { await tick(); return { ...SETTINGS }; },
      requireMember: async () => null,
    },
    email: {
      buildBrand: async () => ({}), extraVehiclesFor: async () => [], langForCustomer: async () => "en",
      ownerRecipients: () => ["owner@example.test"], recipientLang: async () => "en",
      sendTenantEmail: async (o) => {
        await tick();
        const refused = relay.refuse.has(o.bookingId ?? o.to);
        T.email_sends.push({ booking_id: o.bookingId ?? null, to_email: o.to, subject: o.subject, status: refused ? "failed" : "sent" });
        return !refused;
      },
    },
    emailTemplates: {
      customerReminderEmail: (_b, _d, second) => ({ subject: second ? "customer_reminder_2" : "customer_reminder", html: "", text: "" }),
      ownerNewBookingEmail: () => ({ html: "", text: "" }),
      ownerReminderSubject: () => "owner_reminder",
      staleRequestEmail: () => ({ subject: "request_nudge", html: "", text: "" }),
      maintenanceDueEmail: () => ({ subject: "maintenance", html: "", text: "" }),
      maintenanceDueSubject: () => "maintenance",
      formatDateLong: (d) => d,
      formatTime12hr: (t) => t,
    },
    ownerPush: {
      sendOwnerPush: async (_biz, p) => {
        await tick();
        if (relay.failPush(p)) throw new Error("push service down");
        pushes.push(`${p.tag}|${p.title.startsWith("Today:") ? "digest" : p.title}`);
        return { sent: 1, removed_stale: 0 };
      },
    },
    config: { businessSiteUrl: () => "https://x.test", receiptUrl: () => "https://x.test/r", unsubscribeUrl: () => "https://x.test/u" },
    maintenance,
    cronAuth,
    ownerFanout,
    tenantSite: { siteFor: async () => null },
    tz,
  };
  return { T, pushes, relay };
}

// Every send the fixture makes due, each of which must happen exactly once.
function expectedSends() {
  const today = tz.dateStrIn(BIZ.timezone);
  const out = [];
  for (let i = 0; i < 2; i++) {
    out.push(`mail|bk-own-${i}|owner_reminder`, `push|booking-bk-own-${i}|Upcoming job reminder`);
    out.push(`mail|bk-cus-${i}|customer_reminder`, `mail|bk-cu2-${i}|customer_reminder_2`);
    out.push(`push|booking-bk-nud-${i}|Starting soon`, `push|booking-bk-wra-${i}|Wrapping up soon`, `push|booking-bk-fin-${i}|Finalize payment`);
    out.push(`mail|bk-req-${i}|request_nudge`, `push|booking-bk-req-${i}|Still waiting on you`);
  }
  out.push("mail|pat@example.test|maintenance", `push|digest-${today}|digest`);
  return out;
}
const EXPECTED = expectedSends();

function tally({ T, pushes }) {
  const n = new Map();
  for (const r of T.email_sends) if (r.status === "sent") {
    const k = `mail|${r.booking_id ?? r.to_email}|${r.subject}`;
    n.set(k, (n.get(k) ?? 0) + 1);
  }
  for (const p of pushes) n.set(`push|${p}`, (n.get(`push|${p}`) ?? 0) + 1);
  return n;
}

const req = (headers = { [cronAuth.CRON_HEADER]: CRON_SECRET }) =>
  new Request("http://local/send-owner-reminders", { method: "POST", body: "{}", headers });
async function quietly(fn) {
  const { log: l, error: e } = console;
  const lines = [];
  console.log = (...a) => lines.push(a.join(" "));
  console.error = (...a) => lines.push(a.join(" "));
  try { return { value: await fn(), lines }; } finally { console.log = l; console.error = e; }
}

async function doubleRun(js) {
  const w = world();
  const [a, b] = [await isolate(js), await isolate(js)];
  const { value: answers } = await quietly(() => Promise.all([a(req()), b(req())]));
  return { w, answers, n: tally(w) };
}

// ---------------------------------------------------------------------------
say(`\nsource: ${SRC_PATH}${BREAK ? `   BREAK=${BREAK}` : ""}`);
say(`expected sends: ${EXPECTED.length}`);

say("\n§ 0 — the production file loads as itself");
const clean = prepare(SOURCE, BREAK === "no-claim", BREAK === "no-business");
check("0a all twelve _shared imports were swapped and none is left", clean.rewritten === 12 && !clean.leftover,
  `${clean.rewritten} rewritten, leftover import: ${clean.leftover}`);
if (BREAK === "no-claim") {
  check("0b (sabotage) all three claims were removed from the graded copy", clean.landed === 3, `${clean.landed} of 3 landed`);
}
if (BREAK === "no-business") {
  check("0b (sabotage) the business filter was removed from the graded copy", clean.landed === 1, `${clean.landed} of 1 landed`);
}
// A module binds its stand-ins when it LOADS, so every isolate is loaded after
// the world it is meant to run in.
world();
const probe = await isolate(clean.js);
check("0c the file registered its Deno.serve handler", typeof probe === "function");
{
  // 97.3 still stands in front of the sweep: no secret, no run, nothing sent.
  const w = world();
  const h = await isolate(clean.js);
  const { value: r } = await quietly(() => h(req({})));
  check("0d a sweep without the cron secret is refused 401 and sends nothing",
    r.status === 401 && w.T.email_sends.length === 0 && w.pushes.length === 0,
    `status ${r.status}, ${w.T.email_sends.length} emails, ${w.pushes.length} pushes`);
}

say("\n§ 1 — two sweeps started at the same moment send each reminder exactly once");
const A = await doubleRun(clean.js);
check("1a both sweeps answered 200", A.answers.every((r) => r.status === 200), A.answers.map((r) => r.status).join(","));
for (const k of EXPECTED) {
  const c = A.n.get(k) ?? 0;
  check(`1 ${k} sent exactly once`, c === 1, `sent ${c} times`);
}
const sentMail = A.w.T.email_sends.filter((r) => r.status === "sent").length;
check("1b email_sends holds exactly the 9 expected sent rows and no others", sentMail === 9, `${sentMail} sent rows`);
check("1c exactly the 11 expected pushes and no others", A.w.pushes.length === 11, `${A.w.pushes.length} pushes`);
const discovered = EXPECTED.filter((k) => (A.n.get(k) ?? 0) >= 1).length;
const completed = EXPECTED.filter((k) => (A.n.get(k) ?? 0) === 1).length;

say("\n§ 2 — a send that fails leaves its marker clear, and the next sweep retries it once");
{
  const w = world();
  const today = tz.dateStrIn(BIZ.timezone);
  w.relay.refuse = new Set(["bk-own-0", "pat@example.test"]);
  // Since 97.5 a delivered push alone counts as reaching the owner, so the
  // owner reminder only FAILS when its email and its push both fail.
  w.relay.failPush = (p) => ["booking-bk-own-0", "booking-bk-nud-0", `digest-${today}`].includes(p.tag);
  const first = await isolate(clean.js);
  await quietly(() => first(req()));
  const row = (id) => w.T.bookings.find((b) => b.id === id);
  check("2a a refused owner reminder email AND failed push leave owner_reminder_sent_at clear", row("bk-own-0").owner_reminder_sent_at === null,
    `marker is ${row("bk-own-0").owner_reminder_sent_at}`);
  check("2b ...and the refusal is recorded in email_sends", w.T.email_sends.some((r) => r.booking_id === "bk-own-0" && r.status === "failed"));
  check("2c a failed push leaves owner_nudge_sent_at clear", row("bk-nud-0").owner_nudge_sent_at === null,
    `marker is ${row("bk-nud-0").owner_nudge_sent_at}`);
  check("2d a refused maintenance email leaves the stage where it was", w.T.maintenance_deadlines[0].reminded_stage === 0,
    `reminded_stage is ${w.T.maintenance_deadlines[0].reminded_stage}`);
  check("2e a failed digest push leaves no digest row for today", w.T.owner_daily_digest_state.length === 0,
    `${w.T.owner_daily_digest_state.length} rows`);
  check("2f the sends that worked kept their markers", row("bk-own-1").owner_reminder_sent_at !== null && row("bk-nud-1").owner_nudge_sent_at !== null);
  w.relay.refuse = new Set();
  w.relay.failPush = () => false;
  const second = await isolate(clean.js);
  await quietly(() => second(req()));
  const n = tally(w);
  for (const k of EXPECTED) {
    const c = n.get(k) ?? 0;
    check(`2 after the retry, ${k} sent exactly once`, c === 1, `sent ${c} times`);
  }
}

say("\n§ 3 — the canary: the same file with its claims removed must double-send");
const broken = prepare(SOURCE, true);
check("3a all three claims were found and removed (the sabotage landed)", broken.landed === 3, `${broken.landed} of 3 landed`);
const C = await doubleRun(broken.js);
const doubled = EXPECTED.filter((k) => (C.n.get(k) ?? 0) >= 2);
check("3b the claim-less copy sent reminders twice", doubled.length > 0, `${doubled.length} of ${EXPECTED.length} doubled`);
const canary = { id: "send-owner-reminders-with-its-claims-removed", observed_failure: broken.landed === 3 && doubled.length > 0,
  reported: doubled.length };
say(`  canary: ${doubled.length} of ${EXPECTED.length} sends doubled without the claims`);

say("\n§ 4 — ROADMAP 97.72: a deadline naming ANOTHER business's customer emails nobody; the own customer still gets theirs");
// A second deadline in this business names a customer of business biz-2, the row a detailer could write before
// 20261017020000. The real sweep runs once. The same run is repeated on the file with the business filter removed,
// which must email the stranger, or this section cannot tell the filter from a fixture that never reaches it.
async function strangerRun(js) {
  const w = world();
  const due = w.T.maintenance_deadlines[0].due_on;
  w.T.maintenance_deadlines.push({ id: "md-2", business_id: BIZ.id, customer_id: "cu-9", label: "Ceramic coating",
    vehicle: "Tacoma", due_on: due, repeat_months: 12, last_done_on: null, reminded_stage: 0, cancelled_at: null });
  w.T.customers.push({ id: "cu-9", business_id: "biz-2", name: "Sam", email: "stranger@example.test", unsubscribed_at: null, email_failed_at: null });
  const h = await isolate(js);
  await quietly(() => h(req()));
  const rows = (to) => w.T.email_sends.filter((r) => r.to_email === to);
  return { w, stranger: rows("stranger@example.test"), own: rows("pat@example.test").filter((r) => r.status === "sent") };
}
{
  const S = await strangerRun(clean.js);
  check("4a the other business's customer gets no email and no email_sends row", S.stranger.length === 0,
    `${S.stranger.length} row(s): ${S.stranger.map((r) => r.status).join(",")}`);
  check("4b the deadline naming them is not claimed (reminded_stage stays 0)", S.w.T.maintenance_deadlines[1].reminded_stage === 0,
    `reminded_stage is ${S.w.T.maintenance_deadlines[1].reminded_stage}`);
  check("4c this business's own customer still gets their maintenance email exactly once", S.own.length === 1, `${S.own.length} sent`);
  const unscoped = prepare(SOURCE, false, true);
  check("4d (in-run sabotage) the business filter was found once and removed", unscoped.landed === 1, `${unscoped.landed} of 1 landed`);
  const U = await strangerRun(unscoped.js);
  check("4e ...and without it the stranger IS emailed, so 4a is measuring the filter", U.stranger.some((r) => r.status === "sent"),
    `${U.stranger.length} row(s) to the stranger`);
  say(`  stranger rows: ${S.stranger.length} with the filter, ${U.stranger.length} without`);
}

// ---------------------------------------------------------------------------
const failed = failures.length;
say(`\n${passed} passed, ${failed} failed, ${assertions} assertions.`);
say(`discovered ${discovered} of ${EXPECTED.length} expected sends; ${completed} exactly once.`);

const counts = (n) => EXPECTED.map((k) => `${String(n.get(k) ?? 0).padStart(2)}  ${k}`).join("\n");
const artifact = `artifacts/reminder-claim/${BREAK ? `${BREAK}.sabotage` : "clean"}.txt`;
mkdirSync("artifacts/reminder-claim", { recursive: true });
writeFileSync(artifact, [
  `${new Date().toISOString()}  source ${SRC_PATH}  BREAK=${BREAK || "(none)"}`, "",
  "§ 1 double run, sends per reminder:", counts(A.n), "",
  "§ 3 canary double run (claims removed), sends per reminder:", counts(C.n), "",
  ...log,
].join("\n") + "\n");
say(`artifact: ${artifact}`);

if (process.env.REMINDER_SRC) {
  say("no receipt written — REMINDER_SRC points at a copy, not the product file.");
} else {
  const { path } = writeReceipt({
    check_id: "reminder-claim",
    started_at,
    status: failed ? "fail" : "pass",
    expected_targets: EXPECTED.length,
    discovered_targets: discovered,
    attempted_targets: discovered,
    completed_targets: completed,
    skipped_targets: 0,
    assertions_executed: assertions,
    // § 0's three (four under sabotage), § 1's three plus one per send, § 2's six
    // plus one per send, § 3's two, § 4's five (97.72).
    min_assertions: 3 + (BREAK ? 1 : 0) + 3 + EXPECTED.length + 6 + EXPECTED.length + 2 + 5,
    assertion_floor: "3 in §0 (+1 under BREAK) + 3 in §1 + one per expected send in §1 + 6 in §2 + one per expected send in §2 "
      + "+ 2 in §3 + 5 in §4; the fixture is fixed, so nothing the run finds changes the count",
    failures,
    dimensions: { function: "send-owner-reminders", sweeps_at_once: 2, ...(BREAK ? { break: BREAK } : {}) },
    artifacts: [artifact],
    canary,
  });
  say(`receipt: ${path}`);
}
process.exit(failed ? 1 : 0);
