// ROADMAP 97.64 — EACH BOOKING KEEPS ITS OWN booking_ref ACROSS RETRIES.
//
// `bookingRefs` (app/src/book/core.js) decides which ref every create-booking
// call carries. The server hands a repeat answer the booking's id only when the
// ref matches the first press, so a ref that changes when it should not loses
// the customer their link — and on a split two-car booking, car 2 is then
// booked without `group_with` (review, 2026-10-16: the first version keyed the
// whole LIST, so changing car 2's time re-keyed car 1).
//
// Credential-free, no network. Runs the production function from core.js.
//
//   node --test tests/booking-refs.test.mjs
//   BREAK=list-key node tests/booking-refs.test.mjs    must go red: car 1 re-keyed
//
// BREAK is an env var, not a flag (gotchas 104). THE CANARY runs every time:
// the list-keyed version, patched into a copy of core.js, must be caught.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { writeReceipt } from "../scripts/receipt.mjs";

const BREAK = process.env.BREAK || "";
if (BREAK && BREAK !== "list-key") throw Error(`Unknown BREAK=${BREAK}`);
const SRC = readFileSync("app/src/book/core.js", "utf8").replace(/\r\n/g, "\n");
const PER_BOOKING = `export function bookingRefs(payloads, held = []) {
  return payloads.map((p, i) => {
    const key = JSON.stringify(p);
    return held[i]?.key === key ? held[i] : { key, ref: globalThis.crypto?.randomUUID?.() ?? null };
  });
}`;
// The first 97.64 version, keyed on the whole list, in the shape the page reads.
const LIST_KEYED = `export function bookingRefs(payloads, held = []) {
  const key = JSON.stringify(payloads), same = held.key === key;
  const out = same ? held.out : payloads.map((p) => ({ key: JSON.stringify(p), ref: globalThis.crypto.randomUUID() }));
  return Object.assign(out, { key, out });
}`;
async function load(patch) {
  let src = SRC;
  if (patch) {
    if (!src.includes(PER_BOOKING)) throw Error("list-key sabotage did not land");
    src = src.replace(PER_BOOKING, patch);
  }
  return import(`data:text/javascript;base64,${Buffer.from(src).toString("base64")}`);
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const car1 = { customer_name: "Maria Lopez", customer_phone: "(555) 012-3456", booking_date: "2026-10-30", start_time: "10:00", vehicle_size: "small" };
const car2 = { ...car1, booking_date: "2026-10-31", vehicle_size: "large" };
const started_at = new Date().toISOString(), failures = [];
let assertions = 0, completed = 0;
const check = (name, ok, detail = "") => {
  assertions++;
  console.log(`  ${ok ? "ok  " : "FAIL"}  ${name}${ok ? "" : ` — ${detail}`}`);
  if (!ok) failures.push(`${name}: ${detail}`);
};

// The questions, asked of any version of the function. Returns what it saw.
function scenarios(bookingRefs, say) {
  const first = bookingRefs([car1, car2], []);
  say("each car gets its own random ref", first.length === 2 && first.every((r) => UUID.test(r.ref)) && first[0].ref !== first[1].ref, JSON.stringify(first));
  const retry = bookingRefs([car1, car2], first);
  say("a retry with nothing changed sends the same refs", retry[0].ref === first[0].ref && retry[1].ref === first[1].ref);
  // The review's case: car 1 saved, car 2's time taken, car 2 moved.
  const moved = bookingRefs([car1, { ...car2, start_time: "14:00" }], retry);
  say("moving car 2 keeps car 1's ref (its retry still gets the id, so car 2 is grouped)", moved[0].ref === first[0].ref, `${first[0].ref} -> ${moved[0].ref}`);
  say("and gives car 2 a new ref (it is a new booking)", moved[1].ref !== first[1].ref);
  const car1Moved = bookingRefs([{ ...car1, start_time: "11:00" }, car2], first);
  say("moving car 1 gives car 1 a new ref", car1Moved[0].ref !== first[0].ref);
  const single = bookingRefs([car1], []);
  say("a one-car booking gets one ref and keeps it on retry", single.length === 1 && bookingRefs([car1], single)[0].ref === single[0].ref);
  return moved[0].ref === first[0].ref;
}

console.log(BREAK ? `BREAK=${BREAK}` : "production bookingRefs");
const { bookingRefs } = await load(BREAK ? LIST_KEYED : null);
scenarios(bookingRefs, check);
completed++;

console.log("\ncanary — the list-keyed version");
const old = await load(LIST_KEYED);
const kept = scenarios(old.bookingRefs, () => {});
const canary = { id: "list-keyed-bookingRefs-re-keys-car-1", observed_failure: !kept };
check("the canary — the list-keyed version re-keys car 1 when car 2 moves", canary.observed_failure);

// What this run saw, one file per run so a sabotage never overwrites the clean evidence.
const artifact = `artifacts/booking-refs/${BREAK || "clean"}.json`;
mkdirSync("artifacts/booking-refs", { recursive: true });
writeFileSync(artifact, JSON.stringify({ break: BREAK || null, failures, canary }, null, 2));

console.log(`\n${assertions - failures.length} passed, ${failures.length} failed, ${assertions} assertions.`);
writeReceipt({
  check_id: BREAK ? `booking-refs-${BREAK}` : "booking-refs",
  started_at, status: failures.length ? "fail" : "pass",
  expected_targets: 1, discovered_targets: 1, attempted_targets: 1, completed_targets: completed, skipped_targets: 0,
  // six scenario checks + one canary = 7; the floor sits one below.
  assertions_executed: assertions, min_assertions: 6, failures, artifacts: [artifact],
  dimensions: { function: "app/src/book/core.js bookingRefs", ...(BREAK ? { break: BREAK } : {}) },
  canary,
});
process.exit(failures.length ? 1 : 0);
