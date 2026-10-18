// ROADMAP 97.6 — a plan member booking several cars on different days got
// every car free (C-H2).
//
//   node tests/plan-one-car-split.test.mjs
//   PLAN_BREAK=plan-every-car node tests/plan-one-car-split.test.mjs   # must go red
//   PLAN_BREAK=quote-every-car node tests/plan-one-car-split.test.mjs  # must go red
//   PLAN_BREAK=no-refusal node tests/plan-one-car-split.test.mjs       # must go red
//
// Credential-free, no dev server, no browser, no network, no database. Run from
// the repo root (the handler fixture reads files by relative path). The breaks
// are ENV VARS, not flags: `node --test` swallows extra arguments (gotcha 104).
//
// THE DEFECT, IN TWO PLACES: `bookingRequests` (core.js) copied `plan_id` onto
// every car's own booking, and `computeQuote`'s split-day branch (pricing.ts)
// passed the plan into every car's own price. Each car is priced as a one-car
// booking and a plan covers "the first car", so every car was the first.
// Measured in the entry: 3 cars on one day $400, the same 3 on 3 days $0.
//
// WHAT IT ASKS, against the PRODUCTION source text (loaded from disk, so a
// sabotage edits the real lines, not a copy):
//   1. the QUOTE for 3 cars on 3 days equals the same-day quote ($400);
//   2. the SAVE — the form's own payloads, each priced the way create-booking
//      prices it (its own `plan_id`, one car) — sums to the same $400;
//   3. the real create-booking handler refuses a plan on a grouped row before
//      touching the database, and still books car 1 with its plan.
// Canary, every run: the pre-fix payloads (plan on every car) are priced too,
// and the comparison must call them wrong.
import { readFileSync, writeFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import { writeReceipt } from "../scripts/receipt.mjs";
import { bookingFixture, fixtureBooking } from "../scripts/lib/bookingConsentFixture.mjs";

const started_at = new Date().toISOString();
const BREAK = process.env.PLAN_BREAK || "";
const KNOWN = ["plan-every-car", "quote-every-car", "no-refusal"];
if (BREAK && !KNOWN.includes(BREAK)) { console.error(`Unknown PLAN_BREAK=${BREAK}. Known: ${KNOWN.join(", ")}.`); process.exit(2); }

// Load a module from its own source text, optionally with one line put back the
// way it was before the fix. Throws if a sabotage did not land (gotcha 102).
const load = async (path, from, to) => {
  let src = readFileSync(path, "utf8");
  if (from) {
    const changed = src.replace(from, to);
    if (changed === src) throw new Error(`sabotage did not land in ${path}`);
    src = changed;
  }
  if (path.endsWith(".ts")) src = stripTypeScriptTypes(src);
  return import("data:text/javascript;base64," + Buffer.from(src).toString("base64"));
};
const CORE = "app/src/book/core.js", PRICING = "supabase/functions/_shared/pricing.ts";
const PLAN_ON_EVERY_CAR = [/\r?\n\s*plan_id: null,(\r?\n\s*\}\)\),)/, "$1"];
const core = await load(CORE, ...(BREAK === "plan-every-car" ? PLAN_ON_EVERY_CAR : []));
const coreDefect = await load(CORE, ...PLAN_ON_EVERY_CAR);
const { computeQuote } = await load(PRICING, ...(BREAK === "quote-every-car" ? [", plan: null })", " })"] : []));

let passed = 0, assertions = 0;
const failures = [], transcript = [];
const check = (name, ok, got = "") => {
  assertions++;
  const line = ok ? `  ok    ${name}` : `  FAIL  ${name}${got ? ` - got ${got}` : ""}`;
  console.log(line); transcript.push(line);
  if (ok) passed++; else failures.push(got ? `${name} - got ${got}` : name);
  return ok;
};

// One $200 service, three small cars, a plan that includes the service.
const PLAN = { name: "Monthly", priceKind: "included", priceAmount: 0 };
const BASE = {
  services: [{ id: "s1", name: "Full detail", price: 200, duration_minutes: 60 }], addOns: [],
  vehicleSize: "small", siteDiscountPercent: 0, promo: null, roundingNearest: 0, travelFee: 0,
  adjustments: [], plan: PLAN,
};
const SMALL = { key: "small", label: "Small", model: null };

console.log("1. the quote");
const sameDay = computeQuote({ ...BASE, extraVehicles: [SMALL, SMALL] });
const threeDays = computeQuote({ ...BASE, extraVehicles: [SMALL, SMALL], splitDays: true });
check("1a · 3 cars on one day is $400 (one car covered)", sameDay.total === 400, String(sameDay.total));
check("1b · 3 cars on 3 days quotes the same $400", threeDays.total === sameDay.total, String(threeDays.total));
check("1c · exactly one plan line on the split quote",
  threeDays.adjustmentLines.filter((l) => l.source === "plan").length === 1,
  JSON.stringify(threeDays.adjustmentLines));

console.log("2. what the form saves");
const form = {
  customerName: "Maria Lopez", customerPhone: "(555) 012-3456", customerEmail: "maria@example.invalid",
  serviceType: "dropoff", vehicleSize: "small", serviceIds: ["s1"], addOns: [],
  bookingDate: "2026-10-30", startTime: "10:00", splitDays: true,
  extraVehicles: [{ size: "small", date: "2026-10-31", time: "10:00" }, { size: "small", date: "2026-11-01", time: "10:00" }],
};
// What create-booking does with each call: resolvePlan(body.plan_id), one car.
const saved = (payloads) => payloads.reduce((s, p) =>
  s + computeQuote({ ...BASE, vehicleSize: p.vehicle_size, plan: p.plan_id ? PLAN : null }).total, 0);
const payloads = core.bookingRequests(form, { planId: "plan-1" });
check("2a · three calls, one per car", payloads.length === 3, String(payloads.length));
check("2b · the plan rides car 1", payloads[0].plan_id === "plan-1", String(payloads[0].plan_id));
check("2c · cars 2 and 3 carry no plan", payloads.slice(1).every((p) => !p.plan_id),
  JSON.stringify(payloads.map((p) => p.plan_id)));
const savedTotal = saved(payloads);
check("2d · the saved total is the same $400 the quote showed", savedTotal === threeDays.total && savedTotal === 400, String(savedTotal));

// CANARY: the pre-fix payloads, priced the same way, must be called wrong.
const defectTotal = saved(coreDefect.bookingRequests(form, { planId: "plan-1" }));
const canaryCaught = defectTotal !== 400;
check("2e · canary: plan-on-every-car payloads are caught ($0, not $400)", canaryCaught && defectTotal === 0, String(defectTotal));

console.log("3. the create-booking handler");
const f1 = bookingFixture({ handlerBreak: BREAK === "no-refusal" ? "plan-refusal" : "" });
const grouped = await f1.book({ ...fixtureBooking, plan_id: "plan-1", group_with: "booking-first" });
check("3a · a plan on a grouped row is refused with 400", grouped.status === 400, `${grouped.status} ${JSON.stringify(grouped.data)}`);
check("3b · and nothing was read or written first", f1.operations.length === 0, String(f1.operations.length));
const f2 = bookingFixture();
const first = await f2.book({ ...fixtureBooking, plan_id: "plan-1" });
check("3c · car 1 with its plan still books", first.status === 200 && f2.rows.bookings.length === 1, `${first.status} ${JSON.stringify(first.data)}`);
const f3 = bookingFixture();
const plain = await f3.book({ ...fixtureBooking, group_with: "booking-first" });
check("3d · a grouped row without a plan still books", plain.status === 200 && f3.rows.bookings.length === 1, `${plain.status} ${JSON.stringify(plain.data)}`);

const failed = assertions - passed;
console.log(`\n${passed} passed, ${failed} failed${BREAK ? `  (PLAN_BREAK=${BREAK}: a sabotage, this run MUST be red)` : ""}`);
const txt = BREAK ? `receipts/plan-one-car-split.sabotage-${BREAK}.txt` : "receipts/plan-one-car-split.txt";
writeFileSync(txt, [`plan-one-car-split ${new Date().toISOString()} break=${BREAK || "none"}`, ...transcript,
  `${passed} passed, ${failed} failed`, ...failures.map((x) => "FAIL " + x)].join("\n") + "\n");
writeReceipt({
  check_id: BREAK ? `plan-one-car-split-${BREAK}` : "plan-one-car-split",
  started_at,
  status: failed ? "fail" : "pass",
  expected_targets: 3, discovered_targets: 3, attempted_targets: 3, completed_targets: 3, skipped_targets: 0,
  assertions_executed: assertions,
  min_assertions: 12,
  assertion_floor: "3 quote + 5 save + 4 handler = 12, every check() unconditional; targets are the three places the rule lives (quote, form payload, handler).",
  canary: { id: "plan-on-every-car-payloads", observed_failure: canaryCaught, what: "the pre-fix form payloads priced as create-booking prices them total $0, not $400" },
  failures,
  artifacts: [txt],
  dimensions: { roadmap: "97.6", break: BREAK || null },
  warnings: ["The handler runs in-process against the fixture's fake Supabase; pricing is the real pricing.ts. The deployed functions are not this checkout until Andrew publishes."],
});
process.exit(failed ? 1 : 0);
