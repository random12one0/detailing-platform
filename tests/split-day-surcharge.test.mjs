// ROADMAP 97.7 — different-day multi-car bookings were quoted at car 1's day
// and charged at each car's own day (C-H3).
//
//   node tests/split-day-surcharge.test.mjs
//   DATE_BREAK=no-car-date node tests/split-day-surcharge.test.mjs   # must go red
//
// Credential-free, no dev server, no browser, no network, no database. Run from
// the repo root. The break is an ENV VAR, not a flag: `node --test` swallows
// extra arguments (gotcha 104).
//
// THE DEFECT: the quote payload (core.js) sent only size and model for cars
// 2..N, and `calculate-booking` matched price rules once, on car 1's day, for
// every car; `create-booking` is called once per car and matches each on its
// own day. With a +$30 weekend rate, Monday + Saturday quoted $400 and charged
// $430; Saturday + Monday quoted $460 and charged $430.
//
// WHAT IT ASKS, running the REAL handlers loaded from their production source
// (so a sabotage edits the real lines) over the real pricing.ts and tz.ts:
//   for each order, the form's own `quoteRequest` goes through the real
//   `calculate-booking`, the form's own `bookingRequests` go one by one through
//   the real `create-booking`, and the quote must equal the sum saved, $430;
//   and the weekend line must sit on the Saturday car's own breakdown only.
// Canary, every run: the quote payload with the per-car date removed (the
// pre-fix payload) is quoted too, and Monday + Saturday must come out $400.
// (Saturday + Monday comes out $430 that way, correctly: car 2's day is then
// unknown and nothing is lent to it. Its $460 needs the server half put back
// too, which is what DATE_BREAK=car-1-rules does.)
//   DATE_BREAK=car-1-rules node tests/split-day-surcharge.test.mjs   # must go red
import { readFileSync, writeFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import { writeReceipt } from "../scripts/receipt.mjs";
import { bookingFixture, fixtureBooking } from "../scripts/lib/bookingConsentFixture.mjs";

const started_at = new Date().toISOString();
const BREAK = process.env.DATE_BREAK || "";
const KNOWN = ["no-car-date", "car-1-rules"];
if (BREAK && !KNOWN.includes(BREAK)) { console.error(`Unknown DATE_BREAK=${BREAK}. Known: ${KNOWN.join(", ")}.`); process.exit(2); }

// Throws if a sabotage did not land (gotcha 102).
const source = (path, from, to) => {
  let src = readFileSync(path, "utf8");
  if (from) {
    const changed = src.replace(from, to);
    if (changed === src) throw new Error(`sabotage did not land in ${path}`);
    src = changed;
  }
  return path.endsWith(".ts") ? stripTypeScriptTypes(src) : src;
};
const load = (path, from, to) => import("data:text/javascript;base64," + Buffer.from(source(path, from, to)).toString("base64"));

const NO_CAR_DATE = [/booking_date: form\.extraVehicles\[i\]\.date \|\| undefined,/, ""];
const core = await load("app/src/book/core.js", ...(BREAK === "no-car-date" ? NO_CAR_DATE : []));
const coreDefect = await load("app/src/book/core.js", ...NO_CAR_DATE);
// car-1-rules: the server half put back — every car priced on car 1's rules.
const pricing = await load("supabase/functions/_shared/pricing.ts",
  ...(BREAK === "car-1-rules" ? [", adjustments: v.adjustments ?? [] })", " })"] : []));
const tz = await load("supabase/functions/_shared/tz.ts");

// One $200 service, small cars, a flat +$30 rule on Saturday and Sunday.
const SERVICE = { id: "service-a", name: "Full detail", price: 200, duration_minutes: 60 };
const WEEKEND = { label: "Weekend rate", kind: "time", weekdays: [0, 6], amount: 30 };
const SETTINGS = {
  email_customer_confirmation: false, email_owner_new_booking: false, push_enabled: false, booking_mode: "reserve",
  vehicle_sizes: [{ key: "small", label: "Small" }], max_vehicles_per_booking: 3, price_rules: [WEEKEND],
};
const REAL = {
  getSettings: async () => SETTINGS,
  resolveServices: async () => [SERVICE], resolveAddOns: async () => [],
  resolvePromo: async () => null, resolvePlan: async () => null, planInputFor: pricing.planInputFor,
  computeQuote: pricing.computeQuote, matchPriceRules: pricing.matchPriceRules,
  whenContextFor: pricing.whenContextFor, resolveVehicles: pricing.resolveVehicles, resolveTravel: pricing.resolveTravel,
  localDateTimeToInstant: tz.localDateTimeToInstant, weekdayOf: tz.weekdayOf,
};
const BUSINESS = { id: "tenant-a", slug: "consent-proof", name: "Andrew's Auto Detail", timezone: "America/Los_Angeles" };

// The real calculate-booking handler, its imports replaced by the names above.
let quoteHandler;
{
  const deps = {
    ...REAL, Deno: { serve(fn) { quoteHandler = fn; } }, supabase: {},
    json: (data, status = 200) => ({ status, data }), preflight: () => ({ status: 204 }),
    businessBySlug: async () => BUSINESS,
    withinLimits: async () => true, ipOf: () => "fixture", LIMITS: { publicCeiling: {} },
    cachedGrid: async () => null, jobAddress: () => null, periodAt: () => null, pointFor: async () => null,
  };
  const src = source("supabase/functions/calculate-booking/index.ts")
    .replace(/^import\s+(?:"[^"\n]+"|[\s\S]*?\sfrom\s+"[^"\n]+")\s*;\s*$/gm, "");
  new Function(...Object.keys(deps), src)(...Object.values(deps));
  if (!quoteHandler) throw new Error("calculate-booking handler did not load");
}
const quote = async (c, form) => {
  const r = await quoteHandler({ method: "POST", headers: new Headers(), json: async () => ({ business_slug: BUSINESS.slug, ...c.quoteRequest(form) }) });
  if (r.status !== 200) throw new Error(`calculate-booking answered ${r.status} ${JSON.stringify(r.data)}`);
  return r.data.quote;
};
// What the form saves: each payload through the real create-booking, in order.
const save = async (form) => {
  const totals = [];
  for (const [i, p] of core.bookingRequests(form).entries()) {
    const f = bookingFixture({ deps: REAL });
    const r = await f.book({ ...(i ? core.groupedWith(p, "booking-first") : p), business_slug: fixtureBooking.business_slug });
    if (r.status !== 200) throw new Error(`create-booking answered ${r.status} ${JSON.stringify(r.data)}`);
    totals.push(Number(f.rows.bookings[0].total_price));
  }
  return totals;
};

let passed = 0, assertions = 0;
const failures = [], transcript = [];
const check = (name, ok, got = "") => {
  assertions++;
  const line = ok ? `  ok    ${name}` : `  FAIL  ${name}${got ? ` - got ${got}` : ""}`;
  console.log(line); transcript.push(line);
  if (ok) passed++; else failures.push(got ? `${name} - got ${got}` : name);
  return ok;
};

const MON = "2026-11-02", SAT = "2026-11-07";
const formFor = (d1, d2) => ({
  customerName: "Maria Lopez", customerPhone: "(555) 012-3456", customerEmail: "maria@example.invalid",
  serviceType: "dropoff", vehicleSize: "small", serviceIds: [SERVICE.id], addOns: [],
  bookingDate: d1, startTime: "10:00", splitDays: true,
  extraVehicles: [{ size: "small", model: "", date: d2, time: "10:00" }],
});
const weekendOn = (q) => (q.per_vehicle ?? []).map((v) => (v.adjustments ?? []).some((a) => a.label === WEEKEND.label));

const canary = {};
const ORDERS = [["1. Monday then Saturday", MON, SAT], ["2. Saturday then Monday", SAT, MON]];
for (const [n, [name, d1, d2]] of ORDERS.entries()) {
  console.log(name);
  const form = formFor(d1, d2);
  const q = await quote(core, form);
  const saved = await save(form);
  const sum = saved.reduce((s, x) => s + x, 0);
  check(`${n + 1}a · the save is $430 (${saved.join(" + ")})`, sum === 430, String(sum));
  check(`${n + 1}b · the quote equals what is saved`, q.total === sum, `quote ${q.total}, saved ${sum}`);
  check(`${n + 1}c · each car's quoted figure equals its own saved booking`,
    JSON.stringify((q.per_vehicle ?? []).map((v) => v.total)) === JSON.stringify(saved),
    `quoted ${JSON.stringify((q.per_vehicle ?? []).map((v) => v.total))}, saved ${JSON.stringify(saved)}`);
  const expect = d1 === SAT ? [true, false] : [false, true];
  check(`${n + 1}d · the weekend line sits on the Saturday car only`, JSON.stringify(weekendOn(q)) === JSON.stringify(expect), JSON.stringify(weekendOn(q)));
}
// CANARY: Monday + Saturday priced from the payload without car 2's own date.
canary.old = (await quote(coreDefect, formFor(MON, SAT))).total;
check("4 · canary: the payload without the car's own date quotes the old $400", canary.old === 400, String(canary.old));

console.log("3. car 2's day not picked yet");
const unpicked = await quote(core, { ...formFor(SAT, ""), extraVehicles: [{ size: "small", model: "", date: "", time: "" }] });
check("3a · car 1's Saturday rate is not lent to car 2 ($230 + $200)", unpicked.total === 430 && JSON.stringify(weekendOn(unpicked)) === "[true,false]",
  `${unpicked.total} ${JSON.stringify(weekendOn(unpicked))}`);
const sameDay = await quote(core, { ...formFor(SAT, ""), splitDays: false, extraVehicles: [{ size: "small", model: "" }] });
check("3b · two cars on ONE Saturday still carry one weekend line", (sameDay.adjustments ?? []).filter((a) => a.label === WEEKEND.label).length === 1,
  JSON.stringify(sameDay.adjustments));

const canaryCaught = canary.old === 400;
const failed = assertions - passed;
console.log(`\n${passed} passed, ${failed} failed${BREAK ? `  (DATE_BREAK=${BREAK}: a sabotage, this run MUST be red)` : ""}`);
const txt = BREAK ? `receipts/split-day-surcharge.sabotage-${BREAK}.txt` : "receipts/split-day-surcharge.txt";
writeFileSync(txt, [`split-day-surcharge ${new Date().toISOString()} break=${BREAK || "none"}`, ...transcript,
  `${passed} passed, ${failed} failed`, ...failures.map((x) => "FAIL " + x)].join("\n") + "\n");
writeReceipt({
  check_id: BREAK ? `split-day-surcharge-${BREAK}` : "split-day-surcharge",
  started_at,
  status: failed ? "fail" : "pass",
  expected_targets: 3, discovered_targets: 3, attempted_targets: 3, completed_targets: 3, skipped_targets: 0,
  assertions_executed: assertions,
  min_assertions: 11,
  assertion_floor: "2 orders x 4 + 2 unpicked/same-day + 1 canary = 11, every check() unconditional; targets are Monday-then-Saturday, Saturday-then-Monday, and car 2 with no day yet.",
  canary: { id: "no-car-date-payload", observed_failure: canaryCaught, what: "Monday + Saturday priced from the payload without car 2's own date quotes $400, the defect's own figure" },
  failures,
  artifacts: [txt],
  dimensions: { roadmap: "97.7", break: BREAK || null },
  warnings: ["Both handlers run in-process with the database stood in; pricing.ts and tz.ts are real. The deployed functions are not this checkout until Andrew publishes."],
});
process.exit(failed ? 1 : 0);
