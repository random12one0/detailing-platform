// ROADMAP 97.33 — THE OWNER'S "PUSH ALERTS OFF" SWITCH IS IGNORED BY MOST PUSHES.
//
// `push_enabled` gated only the 4 senders whose call sites checked it; the
// starting-soon, wrap-up, finalize and request nudges, the morning digest,
// and cancel, reschedule and update-booking sent pushes with the switch off.
// The gate now lives in the one shared sender (`sendOwnerPush`), and the
// manual "send reminder" refuses bookings that are over, says so when
// reminders are switched off, and stamps its marker.
//
// WHAT THIS RUNS. The real modules, imported and called — never the source
// text (reading a file and pattern-matching it is not a test):
//   §1  the REAL `pushAllowed` rule, imported and called directly.
//   §2  the REAL `sendOwnerPush`, imported and called with push off, on, and
//       unset. Every owner push in the product goes through this one
//       function, so these runs cover all senders at the choke point.
//   §3  the REAL `send-owner-reminders` handler's manual branch, called with
//       real `Request`s. Settings, brand, templates, fanout and the sender
//       are all the real modules; only the three boundaries Node cannot
//       cross are stood in (see `owner-push-gate.hooks.mjs`): the push
//       network, the database, and the email relay (the real
//       `sendTenantEmail`, with `fetch` answering healthy).
//
// Sabotage, by temporarily editing the product (never a flag in this file):
// with the sender's gate neutered, §2's push-off test goes red; with the
// manual refusals removed, §3's refusal/marker tests go red. Each break is
// restored immediately after, and the entry records the counts.
//
// A frozen clock, two working identities, exact markers, and injected marker
// failures: `world.failMarkerWrite` ("error" or "zero") makes the booking
// marker write fail or stamp no row, and the manual branch must answer 500
// instead of success. With the marker check neutered (bare update restored),
// those failure tests go red.
//
//   node --test tests/owner-push-gate.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";
import { pushAllowed } from "../supabase/functions/_shared/pushGate.ts";
import { world } from "./owner-push-gate.stubs.mjs";

register("./owner-push-gate.hooks.mjs", import.meta.url);

let handler = null;
globalThis.Deno = {
  serve: (h) => { handler = h; },
  env: { get: (k) => (k.startsWith("OWNER_VAPID_") ? `test-${k}` : undefined) },
};
// The relay, healthy: the real sendTenantEmail runs and its sends land here.
globalThis.fetch = async (_url, opts) => {
  world.emails.push(JSON.parse(String(opts?.body ?? "{}")));
  return { ok: true, status: 200, text: async () => "", json: async () => ({}) };
};

// module.register installs its hooks asynchronously: an import that starts in
// the same tick can miss them entirely. So the first real imports retry until
// they provably go through the hooks — a hooks failure is loud, never a
// silent run against unhooked modules.
async function importReal(path) {
  let last = null;
  for (let i = 0; i < 100; i++) {
    try {
      return await import(path);
    } catch (e) {
      last = e;
      await new Promise((r) => setTimeout(r, 25));
    }
  }
  throw new Error(`loader hooks never engaged for ${path}: ${last}`);
}

const { sendOwnerPush } = await importReal("../supabase/functions/_shared/ownerPush.ts");
await importReal("../supabase/functions/send-owner-reminders/index.ts");

// ROADMAP 97.33 repair - a frozen clock: every marker stamped below must equal
// FROZEN_NOW exactly, never merely "nonempty".
const FROZEN_NOW = "2026-10-20T19:00:00.000Z";
const RealDate = Date;
const FROZEN_MS = RealDate.parse(FROZEN_NOW);
class FrozenDate extends RealDate {
  constructor(...args) {
    super(...(args.length ? args : [FROZEN_MS]));
  }
  static now() {
    return FROZEN_MS;
  }
}
globalThis.Date = FrozenDate;

// ---------------------------------------------------------------------------
// §1 — the rule itself.
// ---------------------------------------------------------------------------

test("pushAllowed: only an explicit off silences pushes", () => {
  assert.equal(pushAllowed({ push_enabled: false }), false);
  assert.equal(pushAllowed({ push_enabled: true }), true);
  // A missing row or value means on: the column defaults true and
  // `getSettings`' fallback says true, so "never set" must not silence.
  assert.equal(pushAllowed({}), true);
  assert.equal(pushAllowed(null), true);
  assert.equal(pushAllowed(undefined), true);
});

// ---------------------------------------------------------------------------
// §2 — the shared sender obeys the rule.
// ---------------------------------------------------------------------------

const FULL_SETTINGS = {
  business_id: "biz-1", buffer_minutes: 60, min_advance_minutes: 120, max_advance_days: null,
  slot_interval_minutes: 30, max_bookings_per_day: null, mobile_enabled: null, dropoff_enabled: null,
  travel_radius_miles: null, travel_fee: null, ask_water_electric: true, water_requirement: "ask",
  power_requirement: "ask", ask_vehicle_condition: true,
  vehicle_sizes: [{ key: "small", label: "Small", examples: "sedan" }],
  price_rules: [], travel_zones: [], customer_reminder_lead_minutes: 120, evening_before_enabled: true,
  evening_before_latest_start: "12:00:00", evening_before_send_time: "19:00:00",
  owner_nudge_lead_minutes: 30, wrapup_nudge_lead_minutes: 20, finalize_nudge_delay_minutes: 120,
  daily_digest_hour: 7, booking_mode: "reserve", cancellation_window_hours: 24, price_rounding_nearest: 5,
  site_discount_active: false, site_discount_percent: 0, site_discount_label: null,
  pay_cash: false, pay_venmo: null, pay_cashapp: null, pay_zelle: null, pay_paypal: null, pay_other: null,
  pay_custom: [], google_review_url: null, yelp_review_url: null, notification_emails: [],
  email_customer_confirmation: true, email_customer_reminder: true, email_customer_followup: true,
  email_sign_as_business: false, email_customer_maintenance_due: false, email_owner_new_booking: true,
  email_owner_reminder: true, customer_reminder_2_enabled: true, push_enabled: true,
};

const LIVE_SUB = { business_id: "biz-1", endpoint: "https://push.example/a", p256dh: "p1", auth: "a1" };
const STALE_SUB = { business_id: "biz-1", endpoint: "https://push.example/stale", p256dh: "p2", auth: "a2" };

function senderWorld(settingsRow) {
  world.tables.business_settings = settingsRow ? [{ ...FULL_SETTINGS, ...settingsRow }] : [];
  world.tables.owner_push_subscriptions = [{ ...LIVE_SUB }, { ...STALE_SUB }];
  world.pushes = [];
}

test("push off: the shared sender delivers nothing and touches nothing", async () => {
  senderWorld({ push_enabled: false });
  const res = await sendOwnerPush("biz-1", { title: "Starting soon", body: "Pat" });
  assert.deepEqual(res, { sent: 0, removed_stale: 0 });
  assert.equal(world.pushes.length, 0);
  assert.equal(world.tables.owner_push_subscriptions.length, 2);
});

test("push on: live subs get it, stale subs are pruned", async () => {
  senderWorld({ push_enabled: true });
  const res = await sendOwnerPush("biz-1", { title: "Starting soon", body: "Pat" });
  assert.equal(res.sent, 1);
  assert.equal(res.removed_stale, 1);
  assert.deepEqual(world.pushes, ["https://push.example/a"]);
  assert.deepEqual(world.tables.owner_push_subscriptions.map((s) => s.endpoint), ["https://push.example/a"]);
});

test("no settings row: pushes stay on, the schema default", async () => {
  senderWorld(null);
  const res = await sendOwnerPush("biz-1", { title: "Starting soon", body: "Pat" });
  assert.equal(res.sent, 1);
  assert.equal(world.pushes.length, 1);
});

// ---------------------------------------------------------------------------
// §3 — the manual "send reminder" branch of the real handler.
// ---------------------------------------------------------------------------

const BIZ = { id: "biz-1", slug: "demo", name: "Demo", status: "active", timezone: "America/Los_Angeles",
  contact_email: "owner@example.test", contact_phone: null, dropoff_address: null, service_area: null,
  mailing_address: "1 Main St", closed_until: null };

function bookingRow(status) {
  const now = new Date().toISOString();
  return { id: "bk-1", business_id: BIZ.id, status, customer_id: null, customer_name: "Pat",
    customer_email: "pat@example.test", customer_phone: null, customer_address: null, address_source: null,
    travel_zone_address_mismatch: null, lang: "en", start_at: now, end_at: now, created_at: now,
    service_type: "mobile", travel_fee: 0, travel_zone: null, price_adjustments: [],
    vehicle_size_label: null, vehicle_size: null, vehicle_model: null, customer_notes: null,
    applied_promo_code: null, promo_discount: 0, subtotal: 100, total_price: 100,
    owner_reminder_sent_at: null, customer_reminder_sent_at: null };
}

function setupWorld({ status, settings, bodyBusinessId = BIZ.id, bookingBusinessId = BIZ.id, failMarkerWrite = null }) {
  world.tables.businesses = [{ ...BIZ }];
  world.tables.business_settings = [{ ...FULL_SETTINGS, ...settings }];
  world.tables.business_users = [{ user_id: "user-1", business_id: BIZ.id, role: "owner", permissions: [] }];
  world.tables.bookings = [{ ...bookingRow(status), business_id: bookingBusinessId }];
  world.tables.booking_vehicles = [];
  world.tables.owner_push_subscriptions = [{ ...LIVE_SUB }];
  world.pushes = [];
  world.emails = [];
  world.failMarkerWrite = failMarkerWrite;
  return bodyBusinessId;
}

function postManual(body, token = "member-token") {
  return handler(new Request("http://test/manual", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }));
}

async function manual(cfg, token = "member-token") {
  const bodyBusinessId = setupWorld(cfg);
  // No `target`: the owner-reminder path of the manual branch.
  const res = await postManual({ business_id: bodyBusinessId, booking_id: "bk-1" }, token);
  return { res, body: await res.json(), row: world.tables.bookings[0] };
}

async function manualTarget(cfg, target, token = "member-token") {
  const bodyBusinessId = setupWorld(cfg);
  const res = await postManual({ business_id: bodyBusinessId, booking_id: "bk-1", target }, token);
  return { res, body: await res.json(), row: world.tables.bookings[0] };
}

test("manual owner reminder: a cancelled booking is refused, nothing sent, nothing stamped", async () => {
  const r = await manual({ status: "cancelled", settings: {} });
  assert.equal(r.res.status, 409);
  assert.match(r.body.error, /nothing to remind/);
  assert.equal(world.pushes.length, 0);
  assert.equal(world.emails.length, 0);
  assert.equal(r.row.owner_reminder_sent_at, null);
});

test("manual customer reminder: a completed booking is refused, nothing stamped", async () => {
  const r = await manualTarget({ status: "completed", settings: {} }, "customer");
  assert.equal(r.res.status, 409);
  assert.match(r.body.error, /nothing to remind/);
  assert.equal(world.emails.length, 0);
  assert.equal(r.row.customer_reminder_sent_at, null);
});

test("manual owner reminder: switched off means a refusal, not success", async () => {
  const r = await manual({ status: "confirmed", settings: { email_owner_reminder: false, push_enabled: false } });
  assert.equal(r.res.status, 409);
  assert.match(r.body.error, /switched off/);
  assert.equal(world.pushes.length, 0);
  assert.equal(r.row.owner_reminder_sent_at, null);
});

test("manual owner reminder: on means email plus push plus the marker", async () => {
  const r = await manual({ status: "confirmed", settings: {} });
  assert.equal(r.res.status, 200);
  assert.equal(r.body.success, true);
  assert.equal(world.emails.length, 1);
  assert.equal(world.pushes.length, 1);
  assert.equal(r.row.owner_reminder_sent_at, FROZEN_NOW);
});

test("manual customer reminder: switched off means a refusal, not success", async () => {
  const r = await manualTarget({ status: "confirmed", settings: { email_customer_reminder: false } }, "customer");
  assert.equal(r.res.status, 409);
  assert.match(r.body.error, /switched off/);
  assert.equal(world.emails.length, 0);
  assert.equal(r.row.customer_reminder_sent_at, null);
});

test("manual customer reminder: on means the email and the marker", async () => {
  const r = await manualTarget({ status: "confirmed", settings: {} }, "customer");
  assert.equal(r.res.status, 200);
  assert.equal(r.body.success, true);
  assert.equal(world.emails.length, 1);
  assert.equal(r.row.customer_reminder_sent_at, FROZEN_NOW);
});

test("manual reminder: a pending request still needs accepting first", async () => {
  const r = await manualTarget({ status: "pending", settings: {} }, "customer");
  assert.equal(r.res.status, 409);
  assert.match(r.body.error, /Accept this request/);
});

test("manual owner reminder: push off silences the push, the email still goes", async () => {
  const r = await manual({ status: "confirmed", settings: { push_enabled: false } });
  assert.equal(r.res.status, 200);
  assert.equal(r.body.success, true);
  assert.equal(world.emails.length, 1);
  assert.equal(world.pushes.length, 0);
  assert.equal(r.row.owner_reminder_sent_at, FROZEN_NOW);
});

test("manual reminder: another business's booking is not found", async () => {
  const r = await manual({ status: "confirmed", settings: {}, bookingBusinessId: "biz-2" });
  assert.equal(r.res.status, 404);
  assert.equal(world.emails.length, 0);
  assert.equal(world.pushes.length, 0);
  assert.equal(r.row.owner_reminder_sent_at, null);
});

test("manual reminder: a body naming another business is refused", async () => {
  const r = await manual({ status: "confirmed", settings: {}, bodyBusinessId: "biz-2" });
  assert.equal(r.res.status, 401);
  assert.equal(world.emails.length, 0);
  assert.equal(world.pushes.length, 0);
});

// ---------------------------------------------------------------------------
// ROADMAP 97.33 repair - two working identities with opposite push switches,
// and marker writes that fail.
// ---------------------------------------------------------------------------

const BIZ2 = { ...BIZ, id: "biz-2", slug: "demo-2", name: "Demo 2" };
const LIVE_SUB_2 = { business_id: "biz-2", endpoint: "https://push.example/b", p256dh: "p1", auth: "a1" };

function setupTwoBusinessWorld() {
  world.tables.businesses = [{ ...BIZ }, { ...BIZ2 }];
  world.tables.business_settings = [
    { ...FULL_SETTINGS, business_id: BIZ.id, push_enabled: true },
    { ...FULL_SETTINGS, business_id: BIZ2.id, push_enabled: false },
  ];
  world.tables.business_users = [
    { user_id: "user-1", business_id: BIZ.id, role: "owner", permissions: [] },
    { user_id: "user-2", business_id: BIZ2.id, role: "owner", permissions: [] },
  ];
  world.tables.bookings = [
    { ...bookingRow("confirmed"), id: "bk-1", business_id: BIZ.id },
    { ...bookingRow("confirmed"), id: "bk-2", business_id: BIZ2.id },
  ];
  world.tables.booking_vehicles = [];
  world.tables.owner_push_subscriptions = [{ ...LIVE_SUB }, { ...LIVE_SUB_2 }];
  world.pushes = [];
  world.emails = [];
  world.failMarkerWrite = null;
}

test("two businesses at once: the push switch is per-business, markers exact", async () => {
  setupTwoBusinessWorld();
  // Both businesses' settings rows are present together, and each member acts
  // under their own identity: gating by "whichever row happens to be around"
  // cannot pass this.
  const res1 = await postManual({ business_id: BIZ.id, booking_id: "bk-1" }, "member-token");
  const body1 = await res1.json();
  assert.equal(res1.status, 200);
  assert.equal(body1.success, true);
  const res2 = await postManual({ business_id: BIZ2.id, booking_id: "bk-2" }, "member-token-2");
  const body2 = await res2.json();
  assert.equal(res2.status, 200);
  assert.equal(body2.success, true);
  // The push-on business pushed to its own endpoint only; the push-off
  // business still sent its email but no push.
  assert.deepEqual(world.pushes, ["https://push.example/a"]);
  assert.equal(world.emails.length, 2);
  const row1 = world.tables.bookings.find((r) => r.id === "bk-1");
  const row2 = world.tables.bookings.find((r) => r.id === "bk-2");
  assert.equal(row1.owner_reminder_sent_at, FROZEN_NOW);
  assert.equal(row2.owner_reminder_sent_at, FROZEN_NOW);
});

test("manual customer reminder: a refused marker write is not success", async () => {
  const r = await manualTarget({ status: "confirmed", settings: {}, failMarkerWrite: "error" }, "customer");
  assert.equal(r.res.status, 500);
  assert.match(r.body.error, /marker could not be saved/);
  assert.ok(!r.body.success);
  // The reminder went out but nothing records it, so the marker stays empty.
  assert.equal(world.emails.length, 1);
  assert.equal(r.row.customer_reminder_sent_at, null);
});

test("manual customer reminder: a marker write that stamps no row is not success", async () => {
  const r = await manualTarget({ status: "confirmed", settings: {}, failMarkerWrite: "zero" }, "customer");
  assert.equal(r.res.status, 500);
  assert.match(r.body.error, /marker could not be saved/);
  assert.ok(!r.body.success);
  assert.equal(world.emails.length, 1);
  assert.equal(r.row.customer_reminder_sent_at, null);
});

test("manual owner reminder: a refused marker write is not success", async () => {
  const r = await manual({ status: "confirmed", settings: {}, failMarkerWrite: "error" });
  assert.equal(r.res.status, 500);
  assert.match(r.body.error, /marker could not be saved/);
  assert.ok(!r.body.success);
  assert.equal(world.emails.length, 1);
  assert.equal(world.pushes.length, 1);
  assert.equal(r.row.owner_reminder_sent_at, null);
});

test("manual owner reminder: a marker write that stamps no row is not success", async () => {
  const r = await manual({ status: "confirmed", settings: {}, failMarkerWrite: "zero" });
  assert.equal(r.res.status, 500);
  assert.match(r.body.error, /marker could not be saved/);
  assert.ok(!r.body.success);
  assert.equal(world.emails.length, 1);
  assert.equal(world.pushes.length, 1);
  assert.equal(r.row.owner_reminder_sent_at, null);
});
