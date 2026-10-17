// ROADMAP 97.2 — THE "SAME BOOKING, AGAIN" ANSWER IS THREE COLUMNS AND WRITES
// NO CONSENT. ROADMAP 97.64 — AND ONLY THE ORIGINAL PRESS GETS THE ID.
//
// `create-booking` answers a booking it already has (same business, instant,
// phone and name) with `{ booking, duplicate: true }`, from two exits: before
// the slot gate (the first press landed, its answer was lost) and on an
// insert collision (two presses racing). Until 97.2 both handed back
// `select("*")` — the customer's email, address and notes and the detailer's
// private `admin_notes` — to anybody who knew a name, a phone and a time, and
// both switched texts on for that customer.
//
// 97.64: the id is the manage page's only key, so it now goes back only to a
// request carrying the `booking_ref` the first press sent (the insert uses it
// as the id). A stranger with no ref, or a wrong one, gets `start_at` and
// `status`. Each exit is asked by three callers and the answer's keys are read.
// The insert collision is asked twice: on the overlap rule (23P01) and on the
// id itself (23505), which two presses racing with one ref can hit first.
//
// This runs the REAL handler (`scripts/lib/bookingConsentFixture.mjs`: real
// source, real consent helper, an in-memory table that honours column lists
// the way PostgREST does). Credential-free, no network.
//
//   node --test tests/duplicate-answer.test.mjs
//   BREAK=select-star  node tests/duplicate-answer.test.mjs   must go red: keys
//   BREAK=consent      node tests/duplicate-answer.test.mjs   must go red: consent
//   BREAK=hand-back-id node tests/duplicate-answer.test.mjs   must go red: a stranger gets the id
//
// BREAK is an env var, not a flag: `node --test` swallows flags (gotchas 104).
// THE CANARY runs every time: the pre-97.2 code, put back into a copy of the
// source, must be caught by the same comparator on all three counts.

import { mkdirSync, writeFileSync } from "node:fs";
import { writeReceipt } from "../scripts/receipt.mjs";
import { bookingFixture, fixtureBooking } from "../scripts/lib/bookingConsentFixture.mjs";

const BREAK = process.env.BREAK || "";
const NARROW = `.select("id, start_at, status")`;
const OLD_SELECT = [NARROW, `.select("*")`];
const DUP = `return json(duplicateAnswer(mine, body));`;
// The old consent write, re-reading customer_id so the answer's keys stay
// narrow and only the consent assertion can see it.
const OLD_CONSENT = [DUP, `await saveBookingSmsConsent(supabase, business.id, (await supabase.from("bookings").select("customer_id").eq("id", mine.id).maybeSingle()).data?.customer_id, body.sms_consent, member); ${DUP}`];
// The pre-97.64 answer: the id to anybody.
const OLD_ID = [`return { booking: id === bookingRef(body) ? mine : rest, duplicate: true };`, `return { booking: mine, duplicate: true };`];
const BREAKS = { "select-star": [OLD_SELECT], consent: [OLD_CONSENT], "hand-back-id": [OLD_ID] };
if (BREAK && !BREAKS[BREAK]) throw Error(`Unknown BREAK=${BREAK}`);

const REF = "3f6c2a9e-8b1d-4c7a-9e2f-5a1b7c3d9e04";
const CALLERS = [
  ["a stranger with no ref", {}, ["start_at", "status"]],
  ["a stranger with a wrong ref", { booking_ref: "0b1e7f2c-4d6a-4e8b-a1c3-9f5d2b7e6a10" }, ["start_at", "status"]],
  ["the original press", { booking_ref: REF }, ["id", "start_at", "status"]],
];
const PRIVATE = ["admin_notes", "customer_email", "customer_address", "customer_phone", "customer_notes", "customer_name", "customer_id"];
const EXITS = [["before the slot gate", { duplicate: true }], ["on an overlap collision", { collision: true }], ["on an id collision", { collision: "23505" }]];
const started_at = new Date().toISOString(), failures = [], seen = [];
let assertions = 0, discovered = 0, attempted = 0, completed = 0;
const check = (name, ok, detail = "") => {
  assertions++;
  console.log(`  ${ok ? "ok  " : "FAIL"}  ${name}${ok || !detail ? "" : `\n        ${detail}`}`);
  if (!ok) failures.push(`${name}${detail ? `: ${detail}` : ""}`);
};

async function retry(opts, srcPatch, extra = {}) {
  const f = bookingFixture({ ...opts, bookingId: REF, existing: {}, srcPatch });
  const result = await f.book({ ...fixtureBooking, sms_consent: true, ...extra });
  const customer = f.rows.customers.find((r) => r.id === "customer-a");
  return { f, result, customer, consentWrites: f.operations.filter((o) => o.table === "customers" && o.operation === "update").length };
}

// THE INSTRUMENT CAN SEE A CONSENT WRITE: a first press that ticked the box saves it.
console.log("control");
{
  const f = bookingFixture({});
  const r = await f.book({ ...fixtureBooking, sms_consent: true });
  check("a fresh booking with the box ticked DOES save consent", r.status === 200 && !!f.rows.customers.find((c) => c.business_id === "tenant-a")?.sms_consent_at);
}
// THE REF IS THE ID: a first press's ref becomes the booking's id, and one
// that is not a UUID is ignored (the database makes the id).
{
  const f = bookingFixture({ bookingId: "server-made" });
  const r = await f.book({ ...fixtureBooking, booking_ref: REF.toUpperCase() });
  check("a first press's booking_ref becomes the booking's id", r.status === 200 && f.rows.bookings[0]?.id === REF, f.rows.bookings[0]?.id);
  const g = bookingFixture({ bookingId: "server-made" });
  await g.book({ ...fixtureBooking, booking_ref: "not-a-uuid" });
  check("a booking_ref that is not a UUID is not used as the id", g.rows.bookings[0]?.id === "server-made", g.rows.bookings[0]?.id);
}

for (const [exit, opts] of EXITS) for (const [who, extra, ALLOWED] of CALLERS) {
  const name = `${exit} · ${who}`;
  discovered++; attempted++;
  console.log(`\nthe duplicate exit ${name}`);
  const { f, result, customer, consentWrites } = await retry(opts, BREAKS[BREAK] || [], extra);
  const booking = result.data?.booking || {};
  const keys = Object.keys(booking).sort();
  seen.push({ exit, caller: who, status: result.status, answer: result.data, consent: customer?.sms_consent_at ?? null, bookings: f.rows.bookings.length });
  check(`${name} · answers 200 with duplicate: true`, result.status === 200 && result.data?.duplicate === true, JSON.stringify(result));
  check(`${name} · it is the booking that exists`, booking.start_at === "2026-10-30T17:00:00.000Z" && (!("id" in booking) || booking.id === REF), JSON.stringify(booking));
  check(`${name} · the answer's keys are exactly ${ALLOWED.join(", ")}`, JSON.stringify(keys) === JSON.stringify(ALLOWED), `got ${keys.join(", ")}`);
  check(`${name} · none of the private columns is present`, PRIVATE.every((k) => !(k in booking)),
    PRIVATE.filter((k) => k in booking).join(", "));
  check(`${name} · no consent write was attempted`, consentWrites === 0, `${consentWrites} update(s) to customers`);
  check(`${name} · the customer's consent is unchanged`, customer?.sms_consent_at === null && customer?.sms_consent_source === null, JSON.stringify(customer));
  check(`${name} · ROWS: one booking, no second confirmation email`, f.rows.bookings.length === 1 && f.sends.length === 0,
    `${f.rows.bookings.length} bookings, ${f.sends.length} sends`);
  completed++;
}

// THE CANARY — the code as it was before 97.2 and 97.64, all three put back,
// asked by a stranger with no ref.
console.log("\ncanary — the pre-97.2 code");
const canary = { id: "pre-97.2-select-star-consent-write-and-id-to-anybody", observed_failure: false, reported: [] };
for (const [name, opts] of EXITS) {
  const { result, customer } = await retry(opts, [OLD_SELECT, OLD_CONSENT, OLD_ID]);
  const leaked = PRIVATE.filter((k) => k in (result.data?.booking || {}));
  const consented = !!customer?.sms_consent_at;
  canary.reported.push({ exit: name, leaked, consented, stranger_got_id: result.data?.booking?.id === REF });
}
canary.observed_failure = canary.reported.every((r) => r.leaked.includes("admin_notes") && r.consented && r.stranger_got_id);
check("the canary — the old code hands a stranger the id, leaks admin_notes AND saves consent on every exit", canary.observed_failure, JSON.stringify(canary.reported));

// What each exit actually answered, one file per run so a sabotage never
// overwrites the clean run's evidence.
const artifact = `artifacts/duplicate-answer/${BREAK || "clean"}.json`;
mkdirSync("artifacts/duplicate-answer", { recursive: true });
writeFileSync(artifact, JSON.stringify({ break: BREAK || null, seen, canary: canary.reported }, null, 2));

console.log(`\n${assertions - failures.length} passed, ${failures.length} failed, ${assertions} assertions.`);
const { path } = writeReceipt({
  // One file per sabotage, so the second never overwrites the first.
  check_id: BREAK ? `duplicate-answer-${BREAK}` : "duplicate-answer",
  started_at,
  status: failures.length ? "fail" : "pass",
  expected_targets: EXITS.length * CALLERS.length,
  discovered_targets: discovered,
  attempted_targets: attempted,
  completed_targets: completed,
  skipped_targets: 0,
  assertions_executed: assertions,
  // three controls, seven per exit per caller, one canary = 67; the floor
  // sits below it so it can bind (a caller that stops early drops under it).
  min_assertions: 3 + 7 * EXITS.length * CALLERS.length,
  artifacts: [artifact],
  failures,
  dimensions: { handler: "supabase/functions/create-booking/index.ts", ...(BREAK ? { break: BREAK } : {}) },
  canary,
});
console.log(`receipt: ${path}`);
process.exit(failures.length ? 1 : 0);
