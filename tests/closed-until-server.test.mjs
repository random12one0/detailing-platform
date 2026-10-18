// ROADMAP 97.17 — "CLOSED UNTIL" IS A RULE ON THE WAY IN, NOT ONLY A CALENDAR.
// RUN, NOT READ.
//
// `available-slots` closed every day before `closed_until`, so the booking page
// never offered one. Nothing that WRITES a booking read it: `validateSlot`, the
// gate create-, reschedule- and update-booking all route through, never looked,
// so a stale tab or a hand-made post booked a detailer who was away.
//
// THIS LOADS THE REAL `create-booking`, `reschedule-booking` and
// `update-booking` handlers (`loadEdge` in `scripts/lib/edgeLocal.mjs`) and
// calls them as functions against a fake Supabase held in this file — the
// `accept-quote-stale.test.mjs` pattern. No socket, no secret, no database row.
// Every insert and update the functions make is logged, so "refused, and
// nothing was written" is a measurement.
//
//   node tests/closed-until-server.test.mjs
//   CLOSED_BREAK=guard   node tests/closed-until-server.test.mjs   # the guard cut: MUST be red
//   CLOSED_BREAK=unmoved node tests/closed-until-server.test.mjs   # update-booking re-checks an unmoved job again: MUST be red
//
// A clean run also runs both sabotages itself, as children, and is red unless
// each fails exactly the cases it targets (§ 4).
//
// THE SECOND BUSINESS (`fx-open`, no away date) books and moves the very day
// `fx-away` refuses, so the refusal is shown to come from that business's own
// setting and not from the date.
//
// An env var, not a flag: `node --test` swallows extra arguments (gotchas 104).
// The sabotage rewrites the PRODUCTION file as it loads, and refuses to run if
// the rewrite did not land (gotchas 102).

import { registerHooks } from "node:module";
import net from "node:net";
import { writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { writeReceipt } from "../scripts/receipt.mjs";

const started_at = new Date().toISOString();
const BREAK = process.env.CLOSED_BREAK || "";
const CUTS = {
  guard: { file: "/_shared/slotValidation.ts", from: "if (closedUntil && bookingDate < closedUntil) {", to: "if (false) {" },
  unmoved: { file: "/update-booking/index.ts", from: "if ((body.booking_date || body.start_time) && !unmoved) {", to: "if (body.booking_date || body.start_time) {" },
};
// Which cases each sabotage must turn red, and no others.
const TARGETS = { guard: "1a,2a,3a", unmoved: "3d" };
if (BREAK && !CUTS[BREAK]) { console.error(`Unknown CLOSED_BREAK=${BREAK}. Known: ${Object.keys(CUTS).join(", ")}.`); process.exit(2); }
let landed = false;
if (BREAK) {
  registerHooks({
    load(url, ctx, next) {
      const r = next(url, ctx);
      if (!url.endsWith(CUTS[BREAK].file)) return r;
      const src = String(r.source);
      const cut = src.replace(CUTS[BREAK].from, CUTS[BREAK].to);
      landed = cut !== src;
      return { ...r, source: cut };
    },
  });
}

let sockets = 0;
net.Socket.prototype.connect = function () { sockets++; throw new Error("closed-until-server.test opens no network connection"); };

let passed = 0, assertions = 0;
const failures = [];
const check = (name, ok, got = "") => {
  assertions++;
  if (ok) { passed++; console.log(`  ok    ${name}`); return true; }
  failures.push(got ? `${name} - got ${got}` : name);
  console.log(`  FAIL  ${name}${got ? ` - got ${got}` : ""}`);
  return false;
};

// ── THE DATES, in the business's own zone ───────────────────────────────────
const TZ = "America/Los_Angeles";
const localDay = (plus) => {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date());
  const [y, m, d] = today.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + plus)).toISOString().slice(0, 10);
};
const BACK = localDay(10);           // closed_until: the day they are back
const BEFORE = localDay(9);          // the last day they are away
const AFTER = localDay(11);
const BACK_WORDS = new Date(`${BACK}T12:00:00Z`).toLocaleDateString("en-US", { month: "long", day: "numeric", timeZone: "UTC" });
// The zone's own offset ON THAT DAY, not a fixed -07:00: from Nov 1 Los Angeles is -08:00, and a fixed
// summer offset turned the seeded 10:00 into 09:00, so case 3d read an unmoved job as moved (supervisor, 2026-10-17).
const offsetOn = (day) => new Intl.DateTimeFormat("en-US", { timeZone: TZ, timeZoneName: "longOffset" })
  .formatToParts(new Date(`${day}T12:00:00Z`)).find((x) => x.type === "timeZoneName").value.replace("GMT", "") || "+00:00";
const isoAt = (day, hh) => new Date(`${day}T${hh}:00${offsetOn(day)}`).toISOString();

// ── THE FAKE SUPABASE ───────────────────────────────────────────────────────
const FAKE = "https://fake-supabase.invalid";
const BIZ = "22222222-2222-4222-8222-222222222222";
const BIZ2 = "44444444-4444-4444-8444-444444444444";   // the second business: never away
const STAFF = "33333333-3333-4333-8333-333333333333";
let db;
const fresh = () => {
  db = {
    businesses: [{ id: BIZ, slug: "fx-away", name: "Away Detail", status: "active", timezone: TZ, contact_email: "owner@fixture.test",
      contact_phone: "5555550100", closed_until: BACK, closed_note: null },
      { id: BIZ2, slug: "fx-open", name: "Open Detail", status: "active", timezone: TZ, contact_email: "owner2@fixture.test",
      contact_phone: "5555550101", closed_until: null, closed_note: null }],
    business_settings: [BIZ, BIZ2].map((b) => ({ business_id: b, buffer_minutes: 0, min_advance_minutes: 0, max_advance_days: null, slot_interval_minutes: 30,
      max_bookings_per_day: null, mobile_enabled: true, dropoff_enabled: true, cancellation_window_hours: 0,
      water_requirement: "not_needed", power_requirement: "not_needed", require_approval: false })),
    business_hours: [BIZ, BIZ2].flatMap((b) => [0, 1, 2, 3, 4, 5, 6, 7].map((w) => ({ business_id: b, weekday: w, open_time: "08:00:00", close_time: "18:00:00" }))),
    services: [[BIZ, "svc-1"], [BIZ2, "svc-2"]].map(([b, id]) => ({ id, business_id: b, name: "Wash", price: 100, duration_minutes: 60, active: true, is_active: true,
      vehicle_size_adjustments: {}, group_id: null, allows_mobile: true, allows_dropoff: true, available_weekdays: null })),
    business_users: [{ business_id: BIZ, user_id: STAFF, role: "owner", permissions: [] }],
    bookings: [],
  };
};
const writes = [];
const outside = [];
let nextId = 1;

const send = (status, body, headers = {}) =>
  new Response(body === undefined ? "" : JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...headers } });

globalThis.fetch = async (input, init) => {
  const req = new Request(input, init);
  const u = new URL(req.url);
  const text = ["GET", "HEAD"].includes(req.method) ? "" : await req.text();
  if (u.origin !== FAKE) { outside.push(`${req.method} ${u.origin}${u.pathname}`); return send(502, { message: "outside" }); }
  if (u.pathname === "/auth/v1/user") {
    return /Bearer staff-token/.test(req.headers.get("authorization") || "")
      ? send(200, { id: STAFF, aud: "authenticated", role: "authenticated", email: "owner@fixture.test" })
      : send(401, { message: "invalid token" });
  }
  if (u.pathname.startsWith("/functions/v1/")) return send(200, { ok: true });
  if (u.pathname.startsWith("/rest/v1/rpc/")) return send(200, u.pathname.endsWith("/rate_take") ? true : null);
  const tbl = (u.pathname.match(/^\/rest\/v1\/([a-z_]+)$/) || [])[1];
  if (!tbl) return send(404, { message: "no fake for " + u.pathname });
  db[tbl] ??= [];
  let rows = db[tbl];
  for (const [k, v] of u.searchParams) {
    const s = String(v);
    let m;
    if ((m = s.match(/^eq\.(.*)$/))) rows = rows.filter((r) => String(r[k]) === m[1]);
    else if ((m = s.match(/^neq\.(.*)$/))) rows = rows.filter((r) => String(r[k]) !== m[1]);
    else if ((m = s.match(/^in\.\((.*)\)$/))) { const set = m[1].split(",").map((x) => x.replace(/^"|"$/g, "")); rows = rows.filter((r) => set.includes(String(r[k]))); }
    else if (s === "is.null") rows = rows.filter((r) => r[k] == null);
  }
  const one = String(req.headers.get("accept") || "").includes("vnd.pgrst.object");
  if (req.method === "POST") {
    const body = JSON.parse(text || "[]");
    const list = (Array.isArray(body) ? body : [body]).map((r) => ({ id: `row-${nextId++}`, ...r }));
    db[tbl].push(...list);
    writes.push({ table: tbl, kind: "insert", rows: list.length });
    return one ? send(201, list[0]) : send(201, list);
  }
  if (req.method === "PATCH") {
    const patch = JSON.parse(text || "{}");
    for (const r of rows) Object.assign(r, patch);
    writes.push({ table: tbl, kind: "update", rows: rows.length, patch });
    return one ? (rows.length ? send(200, rows[0]) : send(406, { code: "PGRST116", message: "0 rows" })) : send(200, rows);
  }
  if (one) return rows.length === 1 ? send(200, rows[0]) : rows.length === 0 ? send(406, { code: "PGRST116", message: "0 rows" }) : send(406, {});
  return send(200, rows, { "Content-Range": `0-${Math.max(rows.length - 1, 0)}/${rows.length}` });
};

const ENV = { SUPABASE_URL: FAKE, SUPABASE_SERVICE_ROLE_KEY: "placeholder", SUPABASE_ANON_KEY: "placeholder" };
const { loadEdge } = await import("../scripts/lib/edgeLocal.mjs");
const handlers = await loadEdge(["create-booking", "reschedule-booking", "update-booking"], ENV);
if (BREAK && !landed) { console.log(`NOT RUN — CLOSED_BREAK=${BREAK} did not land in ${CUTS[BREAK].file}.`); process.exit(1); }

const post = async (fn, body, auth) => {
  writes.length = 0;
  const r = await handlers.get(fn)(new Request(`http://local/functions/v1/${fn}`, {
    method: "POST", headers: { "Content-Type": "application/json", ...(auth ? { Authorization: `Bearer ${auth}` } : {}) }, body: JSON.stringify(body),
  }));
  const t = await r.text();
  let data = null; try { data = JSON.parse(t); } catch { data = t; }
  const bookingWrites = writes.filter((w) => w.table === "bookings" && w.rows > 0).length;
  return { status: r.status, data, bookingWrites };
};
const bookingBody = (day, slug = "fx-away", svc = "svc-1") => ({
  business_slug: slug, customer_name: "Pat Fixture", customer_phone: "(555) 555-0123", customer_email: "pat@fixture.test",
  booking_date: day, start_time: "10:00", service_type: "mobile", service_ids: [svc], add_ons: [], vehicle_size: "medium",
  address: "1 Fixture Way", lang: "en",
});
const existing = (id, day, biz = BIZ) => ({
  id, business_id: biz, status: "confirmed", deleted_at: null, customer_name: "Pat Fixture", customer_email: "pat@fixture.test",
  start_at: isoAt(day, "10:00"), end_at: isoAt(day, "11:00"), service_type: "mobile", vehicle_size: "medium",
  subtotal: 100, total_price: 100, lang: "en", bulk_vehicle_count: null,
});
const reason = new RegExp(`away until ${BACK_WORDS}\\. Please choose ${BACK_WORDS} or a later date`);
const transcript = [`closed_until ${BACK} (${BACK_WORDS}); before ${BEFORE}; after ${AFTER}`];
const note = (s) => transcript.push(s);
let completed = 0;
const SCENARIOS = 12;

// ── create-booking ──────────────────────────────────────────────────────────
console.log(`\n1. create-booking, closed until ${BACK}`);
for (const [tag, day, refused] of [["1a", BEFORE, true], ["1b", BACK, false], ["1c", AFTER, false]]) {
  fresh();
  const r = await post("create-booking", bookingBody(day));
  note(`${tag} create ${day}: ${r.status} ${JSON.stringify(r.data).slice(0, 200)} | booking writes ${r.bookingWrites}`);
  const ok = refused
    ? check(`${tag} . ${day} (the day before they are back) is refused with the plain reason, nothing written`,
      r.status === 409 && reason.test(r.data?.error ?? "") && r.bookingWrites === 0 && db.bookings.length === 0,
      `${r.status} ${JSON.stringify(r.data)} writes ${r.bookingWrites}`)
    : check(`${tag} . ${day} ${day === BACK ? "(the day they are back)" : "(after)"} books`,
      r.status === 200 && r.data?.success === true && db.bookings.length === 1,
      `${r.status} ${JSON.stringify(r.data).slice(0, 300)}`);
  if (ok) completed++;
}

{
  fresh();
  const r = await post("create-booking", bookingBody(BEFORE, "fx-open", "svc-2"));
  note(`1d create on fx-open ${BEFORE}: ${r.status} ${JSON.stringify(r.data).slice(0, 200)}`);
  if (check(`1d . the SECOND business (no away date) books ${BEFORE}, the day fx-away refuses`,
    r.status === 200 && r.data?.success === true && db.bookings.length === 1 && db.bookings[0].business_id === BIZ2,
    `${r.status} ${JSON.stringify(r.data).slice(0, 300)}`)) completed++;
}

// ── reschedule-booking (the customer's own move) ───────────────────────────
console.log("\n2. reschedule-booking, from a booking after the return date");
for (const [tag, day, refused] of [["2a", BEFORE, true], ["2b", BACK, false], ["2c", AFTER, false]]) {
  fresh();
  db.bookings.push(existing("b-move", localDay(14)));
  const r = await post("reschedule-booking", { booking_id: "b-move", booking_date: day, start_time: "10:00" });
  const now = db.bookings[0].start_at;
  note(`${tag} reschedule -> ${day}: ${r.status} ${JSON.stringify(r.data).slice(0, 200)} | start_at ${now}`);
  const ok = refused
    ? check(`${tag} . moving to ${day} is refused with the plain reason, the booking unmoved`,
      r.status === 409 && reason.test(r.data?.error ?? "") && r.bookingWrites === 0 && now === isoAt(localDay(14), "10:00"),
      `${r.status} ${JSON.stringify(r.data)} start_at ${now}`)
    : check(`${tag} . moving to ${day} works`,
      r.status === 200 && r.data?.success === true && r.data?.booking?.booking_date === day,
      `${r.status} ${JSON.stringify(r.data).slice(0, 300)}`);
  if (ok) completed++;
}

{
  fresh();
  db.bookings.push(existing("b-move2", localDay(14), BIZ2));
  const r = await post("reschedule-booking", { booking_id: "b-move2", booking_date: BEFORE, start_time: "10:00" });
  note(`2d reschedule on fx-open -> ${BEFORE}: ${r.status} ${JSON.stringify(r.data).slice(0, 200)}`);
  if (check(`2d . the SECOND business moves a booking to ${BEFORE}`,
    r.status === 200 && r.data?.success === true && r.data?.booking?.booking_date === BEFORE,
    `${r.status} ${JSON.stringify(r.data).slice(0, 300)}`)) completed++;
}

// ── update-booking (the detailer's own date change) ────────────────────────
console.log("\n3. update-booking, the detailer moving a job");
for (const [tag, day, refused] of [["3a", BEFORE, true], ["3b", BACK, false], ["3c", AFTER, false]]) {
  fresh();
  db.bookings.push(existing("b-staff", localDay(14)));
  const r = await post("update-booking", { business_id: BIZ, booking_id: "b-staff", id: "b-staff", booking_date: day, start_time: "10:00" }, "staff-token");
  const now = db.bookings[0].start_at;
  note(`${tag} update -> ${day}: ${r.status} ${JSON.stringify(r.data).slice(0, 200)} | start_at ${now}`);
  const ok = refused
    ? check(`${tag} . moving to ${day} is refused with the plain reason, the booking unmoved`,
      r.status === 409 && reason.test(r.data?.error ?? "") && r.bookingWrites === 0 && now === isoAt(localDay(14), "10:00"),
      `${r.status} ${JSON.stringify(r.data)} start_at ${now}`)
    : check(`${tag} . moving to ${day} works`,
      r.status === 200 && r.data?.success === true && db.bookings[0].start_at !== isoAt(localDay(14), "10:00"),
      `${r.status} ${JSON.stringify(r.data).slice(0, 300)} start_at ${now}`);
  if (ok) completed++;
}

// The reviewer's case: a job already inside the away stretch, and the edit form
// sends its unchanged date and time back with a phone fix.
console.log("\n3d. the detailer fixes a phone number on a job inside the away stretch");
{
  fresh();
  db.bookings.push(existing("b-inside", BEFORE));
  const r = await post("update-booking", { business_id: BIZ, booking_id: "b-inside", customer_phone: "(555) 555-0199",
    booking_date: BEFORE, start_time: "10:00" }, "staff-token");
  const row = db.bookings[0];
  note(`3d edit inside away: ${r.status} ${JSON.stringify(r.data).slice(0, 200)} | phone ${row.customer_phone} start_at ${row.start_at}`);
  if (check("3d . saved: the phone changed and the job did not move",
    r.status === 200 && r.data?.success === true && row.customer_phone === "(555) 555-0199" && row.start_at === isoAt(BEFORE, "10:00"),
    `${r.status} ${JSON.stringify(r.data).slice(0, 300)} phone ${row.customer_phone}`)) completed++;
}

console.log("\n0. the run itself");
check("0a . no socket was opened", sockets === 0, String(sockets));
check("0b . no request went anywhere but the in-memory fake", outside.length === 0, outside.join(", "));

// THE CANARY, run every clean time: this same file with the guard cut must
// fail EXACTLY the three "the day before they are back" cases — the original
// defect, on production code, through all three handlers. A child process,
// so its module cache cannot see this run's.
let canaryCaught = null;
if (!BREAK) {
  console.log("\n4. the canaries");
  canaryCaught = true;
  for (const [cut, want] of Object.entries(TARGETS)) {
    const kid = spawnSync(process.execPath, [fileURLToPath(import.meta.url)], {
      env: { ...process.env, CLOSED_BREAK: cut }, encoding: "utf8", timeout: 120_000,
    });
    const red = (kid.stdout.match(/^\s*FAIL\s+\d[a-z]\b/gm) || []).map((l) => l.trim().split(/\s+/)[1]).sort().join(",");
    canaryCaught = check(`4 . CLOSED_BREAK=${cut} turns exactly [${want}] red`, kid.status === 1 && red === want, `exit ${kid.status}, red [${red}]`) && canaryCaught;
  }
}

const failed = failures.length;
console.log(`\n${passed} passed, ${failed} failed, ${assertions} assertions, ${completed} of ${SCENARIOS} scenarios complete.`);
if (BREAK) console.log(`  note  CLOSED_BREAK=${BREAK} was set: this run is a sabotage and MUST be red.`);

const txt = BREAK ? `receipts/closed-until-server.sabotage-${BREAK}.txt` : "receipts/closed-until-server.txt";
writeFileSync(txt, [`closed-until-server ${new Date().toISOString()} break=${BREAK || "none"}`, ...transcript,
  `${passed} passed, ${failed} failed`, ...failures.map((f) => "FAIL " + f)].join("\n") + "\n");
writeReceipt({
  check_id: "closed-until-server",
  started_at,
  status: failed ? "fail" : "pass",
  expected_targets: SCENARIOS,
  discovered_targets: SCENARIOS,
  attempted_targets: SCENARIOS,
  completed_targets: completed,
  skipped_targets: 0,
  assertions_executed: assertions,
  min_assertions: BREAK ? 14 : 16,
  assertion_floor: "12 scenario checks (3 handlers x before/on/after, a second business on create and reschedule, the unmoved edit) + 2 run checks = 14, + the 2 canary checks on a clean run = 16, every check() unconditional (docs/gotchas.md 98).",
  canary: { id: "pre-fix-away-booking", observed_failure: BREAK ? failed > 0 : canaryCaught, what: "CLOSED_BREAK=guard cuts the closed_until guard from _shared/slotValidation.ts as it loads" },
  failures,
  artifacts: [txt],
  dimensions: { roadmap: "97.17", break: BREAK || null },
  warnings: ["The handlers run in-process against a fake Supabase in this file, not the live database; it proves the functions' own decisions."],
});
process.exit(failed ? 1 : 0);
