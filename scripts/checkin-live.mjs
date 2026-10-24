// ROADMAP 97.55 - THE VEHICLE CHECK-IN, AGAINST THE LIVE SERVER. A SESSION WITH THE KEYS RUNS THIS AFTER ANDREW
// APPLIES `20261024160000_damage_ack.sql` AND PUBLISHES `acknowledge-checkin` AND `get-booking-receipt`.
//
//   set -a; . ./.env; set +a; node scripts/checkin-live.mjs
//   node scripts/receipt.mjs receipts/checkin-live.json
//
// WHAT IT TOUCHES: ONE booking on the demo tenant (`demo-detail`) of this platform's own database
// (kguqylyzgyzfktkfnhjb, fake accounts only). It ticks that booking through the PUBLIC function exactly as a
// customer's phone would (anon key, booking id only), reads it back through the PUBLIC receipt, and then puts
// `damage_ack_at` back to NULL. It sends no email and spends nothing. It refuses to run against any other project.
//
// WHAT IT ASKS, IN ORDER:
//   column     the migration is applied: the receipt answers 200 (not "Booking not found") and carries damage_ack_at: null
//   tick       the first press answers success with a time, and the receipt then carries that same time
//   duplicate  the second press answers `duplicate: true` with the FIRST time, which did not move
//   refusal    a cancelled booking (if the demo tenant has one) is refused with 409 and stays unticked
//   unknown    a booking id that does not exist is refused with 404
//
// NOT RUN BY THE SESSION THAT WROTE IT: that copy had no keys. It is committed unrun, and the roadmap entry says so.
import "../tests/_env.mjs";
import { writeReceipt } from "./receipt.mjs";

const URL_ = process.env.SUPABASE_URL;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON = process.env.SUPABASE_ANON_KEY;
const started_at = new Date().toISOString();
if (!URL_ || !SERVICE || !ANON) {
  console.error("SKIPPED - needs SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and SUPABASE_ANON_KEY in the root .env.\nNOTHING ran and NO receipt was written. This is not a pass.");
  process.exit(2);
}
if (!URL_.includes("kguqylyzgyzfktkfnhjb")) {
  console.error(`REFUSED - ${URL_} is not this platform's own project (kguqylyzgyzfktkfnhjb). Nothing ran.`);
  process.exit(2);
}

const svc = async (path, init = {}) => {
  const res = await fetch(URL_ + path, { ...init, headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, "Content-Type": "application/json", ...(init.headers || {}) } });
  const text = await res.text();
  let body = null; try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  return { status: res.status, body };
};
const fn = async (name, payload) => {
  const res = await fetch(`${URL_}/functions/v1/${name}`, { method: "POST", headers: { apikey: ANON, "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  return { status: res.status, body: await res.json().catch(() => ({})) };
};

let assertions = 0, reached = 0;
const failures = [];
const check = (name, cond, detail = "") => { assertions++; if (cond) console.log(`  ok    ${name}`); else { failures.push(`${name} ${detail}`.trim()); console.error(`  FAIL  ${name} ${detail}`); } return cond; };

const biz = await svc(`/rest/v1/businesses?select=id&slug=eq.demo-detail`);
const BIZ = biz.body?.[0]?.id;
if (!BIZ) { console.error("the demo tenant was not found - nothing ran"); process.exit(2); }
const live = await svc(`/rest/v1/bookings?select=id,status&business_id=eq.${BIZ}&deleted_at=is.null&status=neq.cancelled&order=created_at.desc&limit=1`);
const cancelled = await svc(`/rest/v1/bookings?select=id&business_id=eq.${BIZ}&deleted_at=is.null&status=eq.cancelled&limit=1`);
const ID = live.body?.[0]?.id;
if (!ID) { console.error("the demo tenant has no live booking to tick - nothing ran"); process.exit(2); }

let touched = false;
try {
  console.log(`booking ${ID}`);
  const before = await fn("get-booking-receipt", { id: ID }); reached++;
  check("column: the receipt answers 200 (a missing column would read as not found)", before.status === 200, `status ${before.status} ${JSON.stringify(before.body).slice(0, 120)}`);
  check("column: the receipt carries damage_ack_at, and it is null", before.body?.booking && "damage_ack_at" in before.body.booking && before.body.booking.damage_ack_at === null, JSON.stringify(before.body?.booking?.damage_ack_at));
  if (before.status === 200 && before.body.booking.damage_ack_at === null) {
    touched = true;
    const first = await fn("acknowledge-checkin", { booking_id: ID }); reached++;
    check("tick: the first press succeeds with a time", first.status === 200 && first.body.success === true && !!first.body.damage_ack_at && first.body.duplicate !== true, JSON.stringify(first));
    const read = await fn("get-booking-receipt", { id: ID });
    check("tick: the receipt then carries that same time", read.body?.booking?.damage_ack_at === first.body.damage_ack_at, `${read.body?.booking?.damage_ack_at} vs ${first.body.damage_ack_at}`);
    const second = await fn("acknowledge-checkin", { booking_id: ID }); reached++;
    check("duplicate: the second press answers duplicate with the FIRST time", second.status === 200 && second.body.duplicate === true && second.body.damage_ack_at === first.body.damage_ack_at, JSON.stringify(second));
  } else {
    failures.push("the demo booking was already ticked or unreadable, so tick/duplicate were not asked");
  }
  const cid = cancelled.body?.[0]?.id;
  if (cid) {
    const refused = await fn("acknowledge-checkin", { booking_id: cid }); reached++;
    const after = await svc(`/rest/v1/bookings?select=damage_ack_at&id=eq.${cid}`);
    check("refusal: a cancelled booking is refused with 409", refused.status === 409, `status ${refused.status}`);
    check("refusal: and stays unticked", after.body?.[0]?.damage_ack_at === null, JSON.stringify(after.body));
  } else {
    console.log("  note  the demo tenant has no cancelled booking: the refusal case was NOT asked live (the in-memory handler test asks it)");
  }
  const unknown = await fn("acknowledge-checkin", { booking_id: "00000000-0000-4000-8000-00000000dead" }); reached++;
  check("unknown: a booking id that does not exist is refused with 404", unknown.status === 404, `status ${unknown.status}`);
} finally {
  if (touched) {
    const undo = await svc(`/rest/v1/bookings?id=eq.${ID}`, { method: "PATCH", body: JSON.stringify({ damage_ack_at: null }), headers: { Prefer: "return=minimal" } });
    check("cleanup: the demo booking is back to unticked", undo.status < 300, `status ${undo.status}`);
  }
}

const { path } = writeReceipt({
  check_id: "checkin-live", started_at, status: failures.length === 0 && reached >= 4 ? "pass" : "fail",
  expected_targets: 4, discovered_targets: reached >= 4 ? 4 : reached, attempted_targets: reached, completed_targets: failures.length === 0 ? reached : 0, skipped_targets: 0,
  assertions_executed: assertions, min_assertions: 8, failures, artifacts: [], warnings: cancelled.body?.[0]?.id ? [] : ["no cancelled demo booking: refusal not asked live"],
  dimensions: { project: "kguqylyzgyzfktkfnhjb", tenant: "demo-detail" },
  canary: { id: "an unknown booking id must be refused", observed_failure: failures.every((f) => !f.startsWith("unknown")), caught_by: ["404 assertion"], findings: ["the unknown-id case is asserted on every run"] },
});
console.log(failures.length ? failures.join("\n") : "PASS");
console.log(`receipt ${path}`);
process.exit(failures.length ? 1 : 0);
