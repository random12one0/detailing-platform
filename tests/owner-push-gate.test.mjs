// ROADMAP 97.33 — THE OWNER'S "PUSH ALERTS OFF" SWITCH IS IGNORED BY MOST PUSHES.
//
// `push_enabled` gated only the 4 senders whose call sites checked it; the
// starting-soon, wrap-up, finalize and request nudges, the morning digest,
// and cancel, reschedule and update-booking sent pushes with the switch off.
// The gate now lives in the one shared sender (`sendOwnerPush`), and the
// manual "send reminder" refuses bookings that are over, says so when
// reminders are switched off, and stamps its marker.
//
// WHAT THIS RUNS. The real code, never a copy (a run aimed at a copy is the
// fault docs/gotchas.md 95 records):
//   §1  the REAL `pushAllowed` rule — `_shared/pushGate.ts` imports nothing,
//       so Node loads it directly, the way `tests/owner-fanout.test.mjs`
//       loads `ownerFanout.ts`.
//   §2  the REAL `sendOwnerPush` — type-stripped, its `npm:`/`db`/`tenant`
//       imports swapped for stand-ins, the REAL rule text inlined where its
//       import was (that import line's removal is asserted, so the run cannot
//       silently test a stubbed rule). VAPID keys are made up.
//   §3  the REAL `send-owner-reminders` handler's manual branch —
//       type-stripped with its `_shared` imports swapped for stand-ins,
//       except `ownerFanout` and `tz`, which import nothing and are used as
//       they are (as in `tests/reminder-claim.test.mjs`). The database is an
//       in-memory bookings table; nothing leaves this machine.
//
// Sabotage, env vars rather than flags (docs/gotchas.md 104):
//   BREAK=no-gate             the pre-97.33 sender: the gate never triggers.
//                             §2's push-off test must go red.
//   BREAK=no-manual-refusals  the pre-97.33 manual branch: over bookings are
//                             allowed, off means success, the customer send
//                             stamps nothing. §3's refusal/marker tests go red.
//
//   node --test tests/owner-push-gate.test.mjs
//   BREAK=no-gate node --test tests/owner-push-gate.test.mjs
//   BREAK=no-manual-refusals node --test tests/owner-push-gate.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import { pushAllowed as realAllowed } from "../supabase/functions/_shared/pushGate.ts";
import * as realFanout from "../supabase/functions/_shared/ownerFanout.ts";
import * as realTz from "../supabase/functions/_shared/tz.ts";

const BREAK = process.env.BREAK ?? "";
if (BREAK && BREAK !== "no-gate" && BREAK !== "no-manual-refusals") {
  console.error(`unknown BREAK=${BREAK}; the two are no-gate and no-manual-refusals`);
  process.exit(2);
}

// ---------------------------------------------------------------------------
// §1 — the rule itself.
// ---------------------------------------------------------------------------

test("pushAllowed: only an explicit off silences pushes", () => {
  assert.equal(realAllowed({ push_enabled: false }), false);
  assert.equal(realAllowed({ push_enabled: true }), true);
  // A missing row or value means on: the column defaults true and
  // `getSettings`' fallback says true, so "never set" must not silence.
  assert.equal(realAllowed({}), true);
  assert.equal(realAllowed(null), true);
  assert.equal(realAllowed(undefined), true);
});

// ---------------------------------------------------------------------------
// §2 — the shared sender obeys the rule. Every owner push in the product
// (nudges, digest, cancel, reschedule, update-booking and the 4 senders that
// already checked) goes through this one function, so these runs cover them
// all at the choke point the item names.
// ---------------------------------------------------------------------------

const PUSH_SRC = readFileSync("supabase/functions/_shared/ownerPush.ts", "utf8");
const GATE_LINE = "if (!pushAllowed(await getSettings(businessId))) {";

function prepareSender() {
  let src = PUSH_SRC;
  if (BREAK === "no-gate") {
    if (src.split(GATE_LINE).length - 1 !== 1) throw new Error("sabotage did not land: gate line count != 1");
    src = src.replace(GATE_LINE, "if (false) {");
  }
  let js = stripTypeScriptTypes(src);
  // The real rule, inlined where its import was — the run tests the rule the
  // sender ships with, not a stub of it.
  const gateSrc = stripTypeScriptTypes(readFileSync("supabase/functions/_shared/pushGate.ts", "utf8"));
  if (!gateSrc.includes("export function pushAllowed")) throw new Error("real rule not found in pushGate.ts");
  const once = (from, to) => {
    if (js.split(from).length - 1 !== 1) throw new Error(`rewrite did not land exactly once: ${from}`);
    js = js.replace(from, to);
  };
  once('import webpush from "npm:web-push@3";', "const webpush = globalThis.__stubs.webpush;");
  once('import { supabase } from "./db.ts";', "const { supabase } = globalThis.__stubs.db;");
  once('import { getSettings } from "./tenant.ts";', "const { getSettings } = globalThis.__stubs.tenant;");
  once('import { pushAllowed } from "./pushGate.ts";', "");
  if (/^import\s/m.test(js)) throw new Error("leftover import in sender source");
  return gateSrc.replace("export function pushAllowed", "function pushAllowed") + "\n" + js;
}

let senderLoads = 0;
async function loadSender(stubs) {
  globalThis.__stubs = stubs;
  globalThis.Deno = { env: { get: (k) => (k.startsWith("OWNER_VAPID_") ? `test-${k}` : undefined) } };
  const js = `${prepareSender()}\n// sender load ${++senderLoads} ${BREAK}\n`;
  return await import(`data:text/javascript;base64,${Buffer.from(js).toString("base64")}`);
}

// One live device and one dead one, so the on-run also proves the loop and
// the stale cleanup survived the gate.
function senderWorld(settings) {
  const pushes = [];
  const deleted = [];
  const subs = [
    { endpoint: "https://push.example/a", p256dh: "p1", auth: "a1" },
    { endpoint: "https://push.example/stale", p256dh: "p2", auth: "a2" },
  ];
  const webpush = {
    setVapidDetails() {},
    async sendNotification(sub) {
      if (sub.endpoint.endsWith("/stale")) {
        const e = new Error("gone");
        e.statusCode = 410;
        throw e;
      }
      pushes.push(sub.endpoint);
    },
  };
  const db = {
    supabase: {
      from: (table) => {
        if (table !== "owner_push_subscriptions") throw new Error(`unexpected table ${table}`);
        return {
          select: () => ({ eq: async () => ({ data: subs.map((s) => ({ ...s })), error: null }) }),
          delete: () => ({ eq: () => ({ in: async (_col, eps) => { deleted.push(...eps); return { error: null }; } }) }),
        };
      },
    },
  };
  return { stubs: { webpush, db, tenant: { getSettings: async () => settings } }, pushes, deleted };
}

test("push off: the shared sender delivers nothing and touches nothing", async () => {
  const w = senderWorld({ push_enabled: false });
  const mod = await loadSender(w.stubs);
  const res = await mod.sendOwnerPush("biz-1", { title: "Starting soon", body: "Pat" });
  assert.deepEqual(res, { sent: 0, removed_stale: 0 });
  assert.equal(w.pushes.length, 0);
  assert.equal(w.deleted.length, 0);
});

test("push on: live subs get it, stale subs are pruned", async () => {
  const w = senderWorld({ push_enabled: true });
  const mod = await loadSender(w.stubs);
  const res = await mod.sendOwnerPush("biz-1", { title: "Starting soon", body: "Pat" });
  assert.equal(res.sent, 1);
  assert.equal(res.removed_stale, 1);
  assert.deepEqual(w.pushes, ["https://push.example/a"]);
  assert.deepEqual(w.deleted, ["https://push.example/stale"]);
});

test("no setting value: pushes stay on, the schema default", async () => {
  const w = senderWorld({});
  const mod = await loadSender(w.stubs);
  const res = await mod.sendOwnerPush("biz-1", { title: "Starting soon", body: "Pat" });
  assert.equal(res.sent, 1);
  assert.equal(w.pushes.length, 1);
});

// ---------------------------------------------------------------------------
// §3 — the manual "send reminder" branch of the real handler.
// ---------------------------------------------------------------------------

const REM_SRC = readFileSync("supabase/functions/send-owner-reminders/index.ts", "utf8");
// The pre-97.33 shape of the manual branch: over bookings allowed, off means
// success, the customer send stamps nothing. Each must land exactly once.
const MANUAL_CUTS = BREAK === "no-manual-refusals" ? [
  [`b.status === "cancelled"`, `false`],
  [`b.status === "completed"`, `false`],
  [`!ownerSettings.email_owner_reminder && !ownerSettings.push_enabled`, `false`],
  [`if ((await sendCustomerReminder(b)) === false) {`, `if (false) {`],
  [`await supabase.from("bookings").update({ customer_reminder_sent_at: new Date().toISOString() }).eq("id", b.id);`, `void 0;`],
] : [];

function prepareHandler() {
  let src = REM_SRC;
  for (const [from, to] of MANUAL_CUTS) {
    if (src.split(from).length - 1 !== 1) throw new Error(`sabotage did not land exactly once: ${from}`);
    src = src.replace(from, to);
  }
  let js = stripTypeScriptTypes(src);
  js = js.replace(/^import\s+"jsr:[^"]+";\s*$/m, "");
  js = js.replace(/^import\s*\{([\s\S]*?)\}\s*from\s*"\.\.\/_shared\/(\w+)\.ts";/gm, (_, names, mod) => {
    return `const {${names}} = globalThis.__stubs.${mod};`;
  });
  if (/^import\s/m.test(js)) throw new Error("leftover import in handler source");
  return js;
}

const BIZ = { id: "biz-1", slug: "demo", name: "Demo", status: "active", timezone: "America/Los_Angeles", mailing_address: "1 Main St", contact_email: "owner@example.test" };
const ALL_ON = { email_customer_reminder: true, customer_reminder_2_enabled: true, email_owner_reminder: true, push_enabled: true, email_customer_maintenance_due: false, daily_digest_hour: 0 };

function bookingRow(status) {
  const now = new Date().toISOString();
  return { id: "bk-1", business_id: BIZ.id, status, customer_name: "Pat", customer_email: "pat@example.test",
    customer_phone: null, customer_address: null, address_source: null, travel_zone_address_mismatch: null,
    lang: "en", start_at: now, end_at: now, created_at: now, service_type: "mobile", travel_fee: 0,
    travel_zone: null, price_adjustments: [], vehicle_size_label: null, vehicle_size: null, vehicle_model: null,
    customer_notes: null, applied_promo_code: null, promo_discount: 0, subtotal: 100, total_price: 100,
    owner_reminder_sent_at: null, customer_reminder_sent_at: null };
}

function handlerWorld({ status, settings }) {
  const row = bookingRow(status);
  const emails = [];
  const pushes = [];
  const supabase = {
    from: (table) => {
      if (table !== "bookings") throw new Error(`unexpected table ${table}`);
      return {
        select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { ...row } }) }) }) }),
        update: (patch) => ({ eq: async () => { Object.assign(row, patch); return { data: [row], error: null }; } }),
      };
    },
  };
  const stubs = {
    db: { supabase },
    http: { json: (body, status = 200) => ({ status, body }), preflight: () => ({ status: 200, body: {} }) },
    cronAuth: { cronRefusal: () => null },
    tenant: {
      businessById: async () => ({ ...BIZ }),
      getSettings: async () => ({ ...settings }),
      requireMember: async () => ({ businessId: BIZ.id }),
    },
    email: {
      buildBrand: async () => ({}),
      extraVehiclesFor: async () => [],
      langForCustomer: async () => "en",
      ownerRecipients: () => ["owner@example.test"],
      recipientLang: async () => "en",
      sendTenantEmail: async (args) => { emails.push(args); return true; },
    },
    emailTemplates: new Proxy({}, {
      get: (_t, p) => (..._a) => (String(p).startsWith("format") || String(p).endsWith("Subject") ? "x" : { subject: "s", html: "h", text: "t" }),
    }),
    ownerPush: { sendOwnerPush: async () => { pushes.push("push"); return { sent: 1, removed_stale: 0 }; } },
    ownerFanout: realFanout,
    config: { businessSiteUrl: () => "https://example.test", receiptUrl: () => "https://example.test/r", unsubscribeUrl: () => "https://example.test/u" },
    maintenance: {},
    tenantSite: { siteFor: async () => ({}) },
    tz: realTz,
  };
  return { stubs, emails, pushes, row };
}

let handlerLoads = 0;
async function manual(cfg, target) {
  const w = handlerWorld(cfg);
  globalThis.__stubs = w.stubs;
  globalThis.Deno = { serve: (h) => { globalThis.__handler = h; }, env: { get: () => undefined } };
  const js = `${prepareHandler()}\n// handler load ${++handlerLoads} ${BREAK}\n`;
  await import(`data:text/javascript;base64,${Buffer.from(js).toString("base64")}`);
  const res = await globalThis.__handler({ method: "POST", json: async () => ({ business_id: BIZ.id, booking_id: "bk-1", target }) });
  return { ...w, res };
}

test("manual owner reminder: a cancelled booking is refused, nothing sent, nothing stamped", async () => {
  const r = await manual({ status: "cancelled", settings: ALL_ON }, "owner");
  assert.equal(r.res.status, 409);
  assert.match(r.res.body.error, /nothing to remind/);
  assert.equal(r.pushes.length, 0);
  assert.equal(r.emails.length, 0);
  assert.equal(r.row.owner_reminder_sent_at, null);
});

test("manual customer reminder: a completed booking is refused, nothing stamped", async () => {
  const r = await manual({ status: "completed", settings: ALL_ON }, "customer");
  assert.equal(r.res.status, 409);
  assert.match(r.res.body.error, /nothing to remind/);
  assert.equal(r.emails.length, 0);
  assert.equal(r.row.customer_reminder_sent_at, null);
});

test("manual owner reminder: switched off means a refusal, not success", async () => {
  const settings = { ...ALL_ON, email_owner_reminder: false, push_enabled: false };
  const r = await manual({ status: "confirmed", settings }, "owner");
  assert.equal(r.res.status, 409);
  assert.match(r.res.body.error, /switched off/);
  assert.equal(r.pushes.length, 0);
  assert.equal(r.row.owner_reminder_sent_at, null);
});

test("manual owner reminder: on means email plus push plus the marker", async () => {
  const r = await manual({ status: "confirmed", settings: ALL_ON }, "owner");
  assert.equal(r.res.status, 200);
  assert.equal(r.res.body.success, true);
  assert.equal(r.emails.length, 1);
  assert.equal(r.pushes.length, 1);
  assert.ok(r.row.owner_reminder_sent_at);
});

test("manual customer reminder: switched off means a refusal, not success", async () => {
  const settings = { ...ALL_ON, email_customer_reminder: false };
  const r = await manual({ status: "confirmed", settings }, "customer");
  assert.equal(r.res.status, 409);
  assert.match(r.res.body.error, /switched off/);
  assert.equal(r.emails.length, 0);
  assert.equal(r.row.customer_reminder_sent_at, null);
});

test("manual customer reminder: on means the email and the marker", async () => {
  const r = await manual({ status: "confirmed", settings: ALL_ON }, "customer");
  assert.equal(r.res.status, 200);
  assert.equal(r.res.body.success, true);
  assert.equal(r.emails.length, 1);
  assert.ok(r.row.customer_reminder_sent_at);
});

test("manual reminder: a pending request still needs accepting first", async () => {
  const r = await manual({ status: "pending", settings: ALL_ON }, "customer");
  assert.equal(r.res.status, 409);
  assert.match(r.res.body.error, /Accept this request/);
});

test("manual owner reminder: push off silences the push, the email still goes", async () => {
  const settings = { ...ALL_ON, push_enabled: false };
  const r = await manual({ status: "confirmed", settings }, "owner");
  assert.equal(r.res.status, 200);
  assert.equal(r.res.body.success, true);
  assert.equal(r.emails.length, 1);
  assert.equal(r.pushes.length, 0);
  assert.ok(r.row.owner_reminder_sent_at);
});
