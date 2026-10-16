// ROADMAP 97.2 — THE "SAME BOOKING, AGAIN" ANSWER IS THREE COLUMNS AND WRITES
// NO CONSENT.
//
// `create-booking` answers a booking it already has (same business, instant,
// phone and name) with `{ booking, duplicate: true }`, from two exits: before
// the slot gate (the first press landed, its answer was lost) and on an
// insert collision (two presses racing). Until 97.2 both handed back
// `select("*")` — the customer's email, address and notes and the detailer's
// private `admin_notes` — to anybody who knew a name, a phone and a time, and
// both switched texts on for that customer.
//
// This runs the REAL handler (`scripts/lib/bookingConsentFixture.mjs`: real
// source, real consent helper, an in-memory table that honours column lists
// the way PostgREST does). Credential-free, no network.
//
//   node --test tests/duplicate-answer.test.mjs
//   BREAK=select-star node tests/duplicate-answer.test.mjs   must go red: keys
//   BREAK=consent     node tests/duplicate-answer.test.mjs   must go red: consent
//
// BREAK is an env var, not a flag: `node --test` swallows flags (gotchas 104).
// THE CANARY runs every time: the pre-97.2 code, put back into a copy of the
// source, must be caught by the same comparator on both counts.

import { mkdirSync, writeFileSync } from "node:fs";
import { writeReceipt } from "../scripts/receipt.mjs";
import { bookingFixture, fixtureBooking } from "../scripts/lib/bookingConsentFixture.mjs";

const BREAK = process.env.BREAK || "";
const NARROW = `.select("id, start_at, status")`;
const OLD_SELECT = [NARROW, `.select("*")`];
const DUP = `return json({ booking: mine, duplicate: true });`;
// The old consent write, re-reading customer_id so the answer's keys stay
// narrow and only the consent assertion can see it.
const OLD_CONSENT = [DUP, `await saveBookingSmsConsent(supabase, business.id, (await supabase.from("bookings").select("customer_id").eq("id", mine.id).maybeSingle()).data?.customer_id, body.sms_consent, member); ${DUP}`];
const BREAKS = { "select-star": [OLD_SELECT], consent: [OLD_CONSENT] };
if (BREAK && !BREAKS[BREAK]) throw Error(`Unknown BREAK=${BREAK}`);

const ALLOWED = ["id", "start_at", "status"];
const PRIVATE = ["admin_notes", "customer_email", "customer_address", "customer_phone", "customer_notes", "customer_name", "customer_id"];
const EXITS = [["before the slot gate", { duplicate: true }], ["on an insert collision", { collision: true }]];
const started_at = new Date().toISOString(), failures = [], seen = [];
let assertions = 0, discovered = 0, attempted = 0, completed = 0;
const check = (name, ok, detail = "") => {
  assertions++;
  console.log(`  ${ok ? "ok  " : "FAIL"}  ${name}${ok || !detail ? "" : `\n        ${detail}`}`);
  if (!ok) failures.push(`${name}${detail ? `: ${detail}` : ""}`);
};

async function retry(opts, srcPatch) {
  const f = bookingFixture({ ...opts, existing: {}, srcPatch });
  const result = await f.book({ ...fixtureBooking, sms_consent: true });
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

for (const [name, opts] of EXITS) {
  discovered++; attempted++;
  console.log(`\nthe duplicate exit ${name}`);
  const { f, result, customer, consentWrites } = await retry(opts, BREAKS[BREAK] || []);
  const keys = Object.keys(result.data?.booking || {}).sort();
  seen.push({ exit: name, status: result.status, answer: result.data, consent: customer?.sms_consent_at ?? null, bookings: f.rows.bookings.length });
  check(`${name} · answers 200 with duplicate: true`, result.status === 200 && result.data?.duplicate === true, JSON.stringify(result));
  check(`${name} · it is the booking that exists`, result.data?.booking?.id === "booking-a");
  check(`${name} · the answer's keys are exactly id, start_at, status`, JSON.stringify(keys) === JSON.stringify(ALLOWED), `got ${keys.join(", ")}`);
  check(`${name} · none of the private columns is present`, PRIVATE.every((k) => !(k in (result.data?.booking || {}))),
    PRIVATE.filter((k) => k in (result.data?.booking || {})).join(", "));
  check(`${name} · no consent write was attempted`, consentWrites === 0, `${consentWrites} update(s) to customers`);
  check(`${name} · the customer's consent is unchanged`, customer?.sms_consent_at === null && customer?.sms_consent_source === null, JSON.stringify(customer));
  check(`${name} · ROWS: one booking, no second confirmation email`, f.rows.bookings.length === 1 && f.sends.length === 0,
    `${f.rows.bookings.length} bookings, ${f.sends.length} sends`);
  completed++;
}

// THE CANARY — the code as it was before 97.2, both halves put back.
console.log("\ncanary — the pre-97.2 code");
const canary = { id: "pre-97.2-select-star-and-consent-write", observed_failure: false, reported: [] };
for (const [name, opts] of EXITS) {
  const { result, customer } = await retry(opts, [OLD_SELECT, OLD_CONSENT]);
  const leaked = PRIVATE.filter((k) => k in (result.data?.booking || {}));
  const consented = !!customer?.sms_consent_at;
  canary.reported.push({ exit: name, leaked, consented });
}
canary.observed_failure = canary.reported.every((r) => r.leaked.includes("admin_notes") && r.consented);
check("the canary — the old code leaks admin_notes AND saves consent on both exits", canary.observed_failure, JSON.stringify(canary.reported));

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
  expected_targets: EXITS.length,
  discovered_targets: discovered,
  attempted_targets: attempted,
  completed_targets: completed,
  skipped_targets: 0,
  assertions_executed: assertions,
  // one control, seven per exit, one canary = 16; the floor sits below it so
  // it can bind (an exit that stops early drops under it).
  min_assertions: 1 + 7 * EXITS.length,
  artifacts: [artifact],
  failures,
  dimensions: { handler: "supabase/functions/create-booking/index.ts", ...(BREAK ? { break: BREAK } : {}) },
  canary,
});
console.log(`receipt: ${path}`);
process.exit(failures.length ? 1 : 0);
