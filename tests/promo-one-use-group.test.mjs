// ROADMAP 97.9 — a one-use promo on a different-day multi-car booking booked
// car 1 and refused car 2 (C-M3).
//
//   node tests/promo-one-use-group.test.mjs
//   PROMO_BREAK=no-share node tests/promo-one-use-group.test.mjs     # must go red (the original defect)
//   PROMO_BREAK=count-twice node tests/promo-one-use-group.test.mjs  # must go red
//   PROMO_BREAK=no-cap node tests/promo-one-use-group.test.mjs       # must go red
//   PROMO_BREAK=no-window node tests/promo-one-use-group.test.mjs    # must go red (review finding 1)
//   PROMO_BREAK=count-rows node tests/promo-one-use-group.test.mjs   # must go red (review finding 2)
//
// Credential-free, no dev server, no browser, no network, no database. Run from
// the repo root (the handler fixture reads files by relative path). The breaks
// are ENV VARS, not flags: `node --test` swallows extra arguments (gotcha 104).
//
// THE DEFECT: the quote discounts every car of a different-day booking, but
// each car is saved by its own create-booking call. Car 1 spent the code; car 2
// was refused as "not valid" (usage limit reached) or "already used" (once per
// customer). The fix: a car grouped onto the same person's booking that already
// carries the code shares that one use.
//
// WHAT IT RUNS: the REAL create-booking handler (via the 97.2/97.6 fixture),
// the REAL `resolvePromo` and `computeQuote` from pricing.ts, and the REAL
// `bookingRequests`/`groupedWith` from core.js — the form's own payloads. Only
// the database is a fake, with a promo_codes table and the usage RPC.
// Canary, every run: the handler with the share switched off must refuse car 2
// exactly as the defect did.
import { readFileSync, writeFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import { receiptFile, writeReceipt } from "../scripts/receipt.mjs";
import { bookingFixture } from "../scripts/lib/bookingConsentFixture.mjs";

const started_at = new Date().toISOString();
const BREAK = process.env.PROMO_BREAK || "";
const PATCHES = {
  "no-share": ["sharesGroupUse = !rowsErr", "sharesGroupUse = false && !rowsErr"],
  "count-twice": ["if (promo && !sharesGroupUse) {", "if (promo) {"],
  "no-cap": ["&& cars <= (Number(settings.max_vehicles_per_booking) || 1);", ";"],
  // The first version of the fix: any same-person sibling, however old or cancelled.
  "no-window": ["if (promoCode && samePerson && fresh && sib!", "if (promoCode && samePerson && sib!"],
  // The first version's cap: rows in the group, not cars.
  "count-rows": ["const cars = ids.length + (more?.length ?? 0) + vehicles.length;", "const cars = ids.length + 1;"],
};
if (BREAK && !PATCHES[BREAK]) { console.error(`Unknown PROMO_BREAK=${BREAK}. Known: ${Object.keys(PATCHES).join(", ")}.`); process.exit(2); }

const load = async (path) => {
  let src = readFileSync(path, "utf8");
  if (path.endsWith(".ts")) src = stripTypeScriptTypes(src);
  return import("data:text/javascript;base64," + Buffer.from(src).toString("base64"));
};
const core = await load("app/src/book/core.js");
const { computeQuote, resolvePromo, resolveVehicles, vehicleSizeFee } = await load("supabase/functions/_shared/pricing.ts");

let passed = 0, assertions = 0;
const failures = [], transcript = [];
const check = (name, ok, got = "") => {
  assertions++;
  const line = ok ? `  ok    ${name}` : `  FAIL  ${name}${got ? ` - got ${got}` : ""}`;
  console.log(line); transcript.push(line);
  if (ok) passed++; else failures.push(got ? `${name} - got ${got}` : name);
  return ok;
};

// One $185 service (the fixture's), small cars, a business that allows 2 cars.
const SERVICE = { id: "service-a", name: "Full detail", price: 185, duration_minutes: 60 };
const QBASE = { services: [SERVICE], addOns: [], vehicleSize: "small", siteDiscountPercent: 0,
  roundingNearest: 0, travelFee: 0, adjustments: [], plan: null };
const promoRow = (over) => ({ id: "promo-1", business_id: "tenant-a", code: "ONCE10", type: "percentage", value: 10,
  is_active: true, expires_at: null, usage_limit: 1, times_used: 0, once_per_customer: false, ...over });
const instant = (_tz, date, time) => new Date(`${date}T${String(time).slice(0, 5)}:00Z`);

function world(promo, { patch = BREAK ? [PATCHES[BREAK]] : [], bookings = [] } = {}) {
  const usage = [];
  const f = bookingFixture({
    srcPatch: patch,
    tables: { promo_codes: [promoRow(promo)], booking_vehicles: [] },
    rpc: async (name, args, rows) => {
      if (name !== "increment_promo_usage") throw Error("Unexpected RPC " + name);
      usage.push(args);
      rows.promo_codes.filter((p) => p.business_id === args.p_business_id && p.code === args.p_code)
        .forEach((p) => { p.times_used += 1; });
      return { error: null };
    },
    deps: {
      resolvePromo, computeQuote, resolveVehicles, vehicleSizeFee,
      getSettings: async () => ({ booking_mode: "reserve", vehicle_sizes: [{ key: "small", label: "Small" }],
        max_vehicles_per_booking: 2, email_customer_confirmation: false, email_owner_new_booking: false, push_enabled: false }),
      localDateTimeToInstant: instant,
      validateSlot: async ({ bookingDate, startTime }) => {
        const startAt = instant(null, bookingDate, startTime);
        return { ok: true, startAt, endAt: new Date(startAt.getTime() + 3600e3) };
      },
    },
  });
  f.rows.bookings.push(...bookings);
  return { ...f, usage };
}
// A booking this customer already made with the code, for the reuse cases.
const DAY = 864e5;
const earlier = (over) => ({ id: "booking-old", business_id: "tenant-a", customer_name: "Maria Lopez",
  customer_phone: "(555) 012-3456", customer_email: "maria@example.invalid", applied_promo_code: "ONCE10",
  promo_discount: 19, status: "confirmed", deleted_at: null, booking_group_id: null,
  start_at: "2026-09-26T17:00:00.000Z", created_at: new Date(Date.now() - 21 * DAY).toISOString(), ...over });

const form = {
  customerName: "Maria Lopez", customerPhone: "(555) 012-3456", customerEmail: "maria@example.invalid",
  serviceType: "dropoff", vehicleSize: "small", serviceIds: ["service-a"], addOns: [],
  bookingDate: "2026-10-30", startTime: "10:00", splitDays: true,
  extraVehicles: [{ size: "small", date: "2026-10-31", time: "10:00" }],
};
// The page posts car 1, then each later car grouped with car 1's id.
async function bookAll(w, f = form) {
  const [first, ...rest] = core.bookingRequests(f, { promoApplied: "ONCE10" });
  const out = [await w.book(first)];
  for (const p of rest) out.push(await w.book(core.groupedWith(p, out[0].data?.booking?.id)));
  return out;
}
const sumSaved = (w) => w.rows.bookings.reduce((s, b) => s + (b.promo_discount || 0), 0);
const status = (r) => `${r.status} ${JSON.stringify(r.data?.error ?? "")}`;

console.log("1. the quote");
const SMALL = { key: "small", label: "Small", model: null };
const quote = computeQuote({ ...QBASE, promo: { type: "percentage", value: 10 }, extraVehicles: [SMALL], splitDays: true });
check("1a · 2 cars on 2 days quote 10% off on both cars ($19 + $19)", quote.promoDiscount === 38, String(quote.promoDiscount));

console.log("2. usage_limit = 1, two cars on two days");
const w = world({});
const [car1, car2] = await bookAll(w);
check("2a · car 1 books", car1.status === 200, status(car1));
check("2b · car 2 books (was refused with 409)", car2.status === 200, status(car2));
check("2c · two booking rows saved", w.rows.bookings.length === 2, String(w.rows.bookings.length));
check("2d · discount saved equals discount quoted, and is not zero", sumSaved(w) === quote.promoDiscount && sumSaved(w) > 0, `${sumSaved(w)} vs ${quote.promoDiscount}`);
check("2e · both rows carry the code", w.rows.bookings.every((b) => b.applied_promo_code === "ONCE10"),
  JSON.stringify(w.rows.bookings.map((b) => b.applied_promo_code)));
check("2f · both rows are one group", !!w.rows.bookings[0]?.booking_group_id
  && w.rows.bookings[0].booking_group_id === w.rows.bookings[1]?.booking_group_id,
  JSON.stringify(w.rows.bookings.map((b) => b.booking_group_id)));
check("2g · the code counts as used ONCE for the group", w.usage.length === 1 && w.rows.promo_codes[0].times_used === 1,
  `${w.usage.length} RPC calls, times_used ${w.rows.promo_codes[0].times_used}`);

console.log("3. a second, separate booking is still refused");
const sep = await w.book({ ...core.bookingRequests(form, { promoApplied: "ONCE10" })[0], booking_date: "2026-11-05" });
check("3a · a later ungrouped booking with the same code gets 409", sep.status === 409, status(sep));
const extra = await w.book(core.groupedWith({ ...core.bookingRequests(form, { promoApplied: "ONCE10" })[0], booking_date: "2026-11-06" }, w.rows.bookings[0].id));
check("3b · a third car hand-grouped past the 2-car cap gets 409", extra.status === 409, status(extra));
const s = world({});
await bookAll(s);
const stranger = await s.book(core.groupedWith({ ...core.bookingRequests(form, { promoApplied: "ONCE10" })[0],
  customer_name: "Sam Other", customer_phone: "(555) 999-0000", customer_email: "sam@example.invalid", booking_date: "2026-11-07" }, s.rows.bookings[0].id));
check("3c · somebody else grouping onto the booking gets 409", stranger.status === 409, status(stranger));
check("3d · and nothing more was saved in either world", w.rows.bookings.length === 2 && s.rows.bookings.length === 2,
  `${w.rows.bookings.length}, ${s.rows.bookings.length}`);

console.log("4. once per customer, no usage limit");
const o = world({ usage_limit: null, once_per_customer: true });
const [o1, o2] = await bookAll(o);
check("4a · both cars book", o1.status === 200 && o2.status === 200, `${status(o1)} / ${status(o2)}`);
check("4b · discount saved equals discount quoted, and is not zero", sumSaved(o) === quote.promoDiscount && sumSaved(o) > 0, String(sumSaved(o)));
const oSep = await o.book({ ...core.bookingRequests(form, { promoApplied: "ONCE10" })[0], booking_date: "2026-11-05" });
check("4c · a later separate booking by the same customer gets 409", oSep.status === 409, status(oSep));

console.log("6. the share is only for the set being booked now (review finding 1)");
const one = (over = {}) => ({ ...core.bookingRequests(form, { promoApplied: "ONCE10" })[1], ...over });
const old = world({ times_used: 1 }, { bookings: [earlier()] });
const oldR = await old.book(core.groupedWith(one(), "booking-old"));
check("6a · grouping onto the customer's 3-week-old booking to reuse a used one-use code gets 409", oldR.status === 409, status(oldR));
const can = world({ times_used: 1 }, { bookings: [earlier({ created_at: new Date().toISOString(), status: "cancelled" })] });
const canR = await can.book(core.groupedWith(one(), "booking-old"));
check("6b · grouping onto a cancelled booking (made minutes ago) gets 409", canR.status === 409, status(canR));
const opc = world({ usage_limit: null, once_per_customer: true }, { bookings: [earlier()] });
const opcR = await opc.book(core.groupedWith(one(), "booking-old"));
check("6c · once-per-customer: grouping onto the old booking gets 409", opcR.status === 409, status(opcR));
check("6d · nothing was saved and nothing counted in any of the three",
  [old, can, opc].every((x) => x.rows.bookings.length === 1 && x.usage.length === 0),
  JSON.stringify([old, can, opc].map((x) => [x.rows.bookings.length, x.usage.length])));

console.log("7. the cap counts cars, not rows (review finding 2)");
const xv = world({});
const xv1 = await xv.book(core.bookingRequests(form, { promoApplied: "ONCE10" })[0]);
const xv2 = await xv.book(core.groupedWith(one({ extra_vehicles: [{ size: "small" }] }), xv1.data?.booking?.id));
check("7a · a grouped call carrying an extra car (3 cars, cap 2) gets 409", xv2.status === 409, status(xv2));
const two = world({});
const two1 = await two.book({ ...core.bookingRequests(form, { promoApplied: "ONCE10" })[0], extra_vehicles: [{ size: "small" }] });
const two2 = await two.book(core.groupedWith(one(), two1.data?.booking?.id));
check("7b · car 1 already holds 2 cars, so a grouped third car gets 409", two1.status === 200 && two2.status === 409,
  `${status(two1)} / ${status(two2)}`);
check("7c · one row saved in each, the code counted once in each",
  [xv, two].every((x) => x.rows.bookings.length === 1 && x.usage.length === 1),
  JSON.stringify([xv, two].map((x) => [x.rows.bookings.length, x.usage.length])));

// CANARY: the handler with the share switched off must reproduce the defect.
const c = world({}, { patch: [PATCHES["no-share"]] });
const [, cCar2] = await bookAll(c);
const canaryCaught = cCar2.status === 409 && c.rows.bookings.length === 1;
check("8 · canary: without the share, car 2 is refused (the original defect)", canaryCaught, status(cCar2));

const failed = assertions - passed;
console.log(`\n${passed} passed, ${failed} failed${BREAK ? `  (PROMO_BREAK=${BREAK}: a sabotage, this run MUST be red)` : ""}`);
const txt = BREAK ? receiptFile(`promo-one-use-group.sabotage-${BREAK}.txt`) : receiptFile("promo-one-use-group.txt");
writeFileSync(txt, [`promo-one-use-group ${new Date().toISOString()} break=${BREAK || "none"}`, ...transcript,
  `${passed} passed, ${failed} failed`, ...failures.map((x) => "FAIL " + x)].join("\n") + "\n");
writeReceipt({
  check_id: BREAK ? `promo-one-use-group-${BREAK}` : "promo-one-use-group",
  started_at,
  status: failed ? "fail" : "pass",
  expected_targets: 5, discovered_targets: 5, attempted_targets: 5, completed_targets: 5, skipped_targets: 0,
  assertions_executed: assertions,
  min_assertions: 23,
  assertion_floor: "1 quote + 7 limit-1 + 4 refusals + 3 once-per-customer + 4 old-or-cancelled + 3 car-count + 1 canary = 23, every check() unconditional; targets are the five limits on the share (usage limit, once per customer, group cap in cars, freshness, status).",
  canary: { id: "share-switched-off", observed_failure: canaryCaught, what: "the handler with the group share removed refuses car 2 with 409, as the defect did" },
  failures,
  artifacts: [txt],
  dimensions: { roadmap: "97.9", break: BREAK || null },
  warnings: ["The handler runs in-process against the fixture's fake Supabase; pricing and resolvePromo are the real pricing.ts, the payloads the real core.js. The fixture does not honour resolvePromo's expiry filter (`or`), so only non-expiring codes are exercised. The deployed create-booking is not this checkout until Andrew publishes."],
});
process.exit(failed ? 1 : 0);
