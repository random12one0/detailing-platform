// ROADMAP 8.10 — MULTIPLE CARS. His longest single answer, and three separate
// facts that must not be merged (see the migration's own header):
//
//   1. two cars on ONE VISIT  — one booking, `booking_vehicles` for 2..N
//   2. two cars on TWO DAYS   — two bookings sharing `booking_group_id`
//   3. the DEALERSHIP job     — logged after the fact, no automatic pricing
//
// WHAT THIS FILE HOLDS IS THE HALF A BROWSER CANNOT SEE. The flow itself was
// proved against the deployed functions (§ 6, which needs credentials); the
// rest is source, and every one of those checks guards a defect that produces
// a perfectly working screen:
//
//   * an email sender that forgets `extraVehicles` sends a valid confirmation
//     naming ONE car for a three-car job, and nothing reports it — the same
//     invisible shape as a `site` argument forgotten at one of thirteen call
//     sites (roadmap 3.3). **The senders are DISCOVERED here, not listed**: a
//     hand-written caller list in this repo has already been short by one.
//   * a bulk-job form that computes anything is the one thing he ruled out by
//     name — *"there shouldn't be auto calculations, because obviously when
//     they do this there's discounts."*
//   * the extra cars sitting OUTSIDE `beforeAdjustments` would charge a
//     weekend surcharge on one car and do the other two for free.
//
// Run: node tests/multi-vehicle.test.mjs
//      (§ 1–5 are credential-free; § 6 needs root .env and prints SKIPPED
//       without it, naming which — a skipped check must never read like a
//       passing one.)

import { readFileSync, readdirSync, existsSync } from "node:fs";
import {
  computeQuote, extraVehicleMinutes, resolveVehicles, vehicleMinutes, vehicleSizeFee,
} from "../supabase/functions/_shared/pricing.ts";
import { bookingRequest, bookingRequests, groupedWith, canAdvance, maxVehicles,
  quoteKey, setVehicleCount, vehicleCount } from "../app/src/book/core.js";

let passed = 0, failed = 0;
const check = (name, cond, detail = "") => {
  if (cond) { passed++; console.log(`  ok    ${name}`); }
  else { failed++; console.error(`  FAIL  ${name}${detail ? `\n        ${detail}` : ""}`); }
};
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
// STRIP COMMENTS BEFORE READING SOURCE AS TEXT. This repo has lost checks
// three separate ways to a regex matching a file's own prose about the thing
// it checks for — `booking-core` § 1, `email-brand` 7a-ii, `platform-admin`.
const strip = (t) => t
  .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, "")
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/^\s*\/\/.*$/gm, "")
  .replace(/^\s*--.*$/gm, "");

const SERVICE = {
  id: "s1", name: "Full Detail", price: 100, duration_minutes: 60,
  vehicle_size_adjustments: { large: { price: 20, duration_minutes: 15 } },
};
const Q = (over = {}) => ({
  services: [SERVICE], addOns: [], vehicleSize: "small",
  siteDiscountPercent: 0, promo: null, roundingNearest: 0, ...over,
});
const BIG = { key: "large", label: "Large", model: "F-150" };
const SML = { key: "small", label: "Small", model: null };

// ─── 1. The arithmetic ────────────────────────────────────────────────────
console.log("1. what a carload costs and how long it takes");
{
  const one = computeQuote(Q());
  const two = computeQuote(Q({ extraVehicles: [SML], extraVehicleMinutesSaved: 15 }));
  check("1a · one car is exactly what it always was",
    one.total === 100 && one.totalDurationMinutes === 60, JSON.stringify(one.total));
  check("1b · a second identical car is a second car's money, in full",
    two.total === 200, String(two.total));
  // HIS OWN SENTENCE AS A NUMBER: *"it's not gonna be double the time of one
  // car, because there's not gonna be the setup time."*
  check("1c · but NOT double the time — the setup happens once",
    two.totalDurationMinutes === 105, String(two.totalDurationMinutes));
  check("1d · a bigger second car pays and takes its own size",
    computeQuote(Q({ extraVehicles: [BIG], extraVehicleMinutesSaved: 15 })).total === 220);

  // THE FLOOR. A detailer who saves 40 minutes and sells a 20-minute wash
  // would otherwise have the second car take a negative amount of time.
  const quick = [{ ...SERVICE, duration_minutes: 20, vehicle_size_adjustments: null }];
  check("1e · the setup saving can never take more than half a car",
    extraVehicleMinutes(quick, "small", 40) === 10,
    String(extraVehicleMinutes(quick, "small", 40)));
  check("1f · and with no saving configured the second car takes its full time",
    extraVehicleMinutes(quick, "small", 0) === 20);
  check("1g · the helpers agree with each other",
    vehicleMinutes([SERVICE], "large") === 75 && vehicleSizeFee([SERVICE], "large") === 20);
}

// ─── 2. Where the money for an extra car goes ─────────────────────────────
// It rides `price_adjustments`, which is the array the review step, all three
// money emails, the invoice and the manage page already draw and `reconcile()`
// already ties to the total. Multiplying `basePrice` instead would print two
// cars as one line reading "Full Detail $200" — a number nobody can add up,
// which is the invoice defect this repo has already shipped once.
console.log("2. the extra car is a labelled line, and it is inside the surcharge base");
{
  const two = computeQuote(Q({ extraVehicles: [BIG], extraVehicleMinutesSaved: 15 }));
  check("2a · the base price still describes ONE car",
    two.basePrice === 100, String(two.basePrice));
  check("2b · the size fee on the booking row is the FIRST car's",
    two.sizeAdd === 0, String(two.sizeAdd));
  check("2c · the second car is its own named line",
    two.adjustmentLines.length === 1
      && /2nd vehicle — Large · F-150/.test(two.adjustmentLines[0].label)
      && two.adjustmentLines[0].amount === 120,
    JSON.stringify(two.adjustmentLines));
  check("2d · and the itemisation still adds up to the charged total",
    two.basePrice + two.sizeAdd + two.addOnsTotal + two.travelFee
      + two.adjustmentLines.reduce((s, l) => s + l.amount, 0)
      - two.siteDiscount - two.promoDiscount === two.total,
    String(two.total));

  // A PERCENTAGE RULE MUST SEE EVERY CAR. Folding the extras in after the
  // rules would charge a Saturday surcharge on one car and do the rest free.
  const sat = computeQuote(Q({
    extraVehicles: [SML], extraVehicleMinutesSaved: 15,
    adjustments: [{ label: "Saturday", kind: "time", amount: 10, is_percent: true }],
  }));
  check("2e · a percentage surcharge is of the whole carload",
    sat.adjustmentLines.some((l) => l.label === "Saturday" && l.amount === 20),
    JSON.stringify(sat.adjustmentLines));

  // A PLAN COVERS ONE CAR. Passing the carload would give a member three free
  // details for one month's subscription.
  const plan = computeQuote(Q({
    extraVehicles: [SML], extraVehicleMinutesSaved: 15,
    plan: { name: "Monthly", priceKind: "monthly", priceAmount: 40 },
  }));
  check("2f · a plan settles one car, not the carload",
    plan.total === 100, String(plan.total));
}

// ─── 3. Two days is two bookings ──────────────────────────────────────────
console.log("3. cars on different days");
{
  const split = computeQuote(Q({
    extraVehicles: [BIG], extraVehicleMinutesSaved: 15, splitDays: true, travelFee: 25,
  }));
  const one = computeQuote(Q({ travelFee: 25 }));
  const alone = computeQuote(Q({ vehicleSize: "large", travelFee: 25 }));
  check("3a · the split total is the sum of the bookings that will be made",
    split.total === one.total + alone.total, `${split.total} vs ${one.total}+${alone.total}`);
  // The awkward cases fall out with no rule of their own, and this is the one
  // that proves it: the detailer really does drive out twice.
  check("3b · so travel is charged per trip, not per booking-form",
    split.travelFee === 50, String(split.travelFee));
  check("3c · while ONE visit charges it once",
    computeQuote(Q({ extraVehicles: [BIG], travelFee: 25 })).travelFee === 25);
  check("3d · the length asked for is ONE car's, never the carload's",
    split.totalDurationMinutes === one.totalDurationMinutes,
    String(split.totalDurationMinutes));
  check("3e · and every car's own total is published for the review step",
    split.legs?.length === 2 && split.legs[1].total === alone.total,
    JSON.stringify(split.legs));
}

// ─── 4. The rules a bespoke tenant site inherits ──────────────────────────
// Contract §2: the FORM forks per client, the RULES never do. Anything below
// that a site had to re-derive from a screenshot is a rule that will be got
// wrong, and nothing will report it.
console.log("4. what a tenant site gets for free");
{
  const S = { vehicle_sizes: [{ key: "small", label: "S" }, { key: "large", label: "L" }],
    max_vehicles_per_booking: 3 };
  check("4a · the limit is read from the tenant, capped at ten",
    maxVehicles(S) === 3 && maxVehicles({ max_vehicles_per_booking: 99 }) === 10
      && maxVehicles({}) === 1);
  const form = { vehicleSize: "small", extraVehicles: [] };
  check("4b · growing the list stops at the tenant's own limit",
    setVehicleCount(form, 9, S).length === 2, String(setVehicleCount(form, 9, S).length));
  check("4c · and shrinking it keeps the cars already described",
    setVehicleCount({ ...form, extraVehicles: [{ size: "large", model: "F" }, { size: "small" }] }, 2, S)
      .length === 1);
  check("4d · the count is one more than the extras",
    vehicleCount({ extraVehicles: [{}, {}] }) === 3 && vehicleCount({}) === 1);

  // THE SERVER IS THE ONLY THING THAT DECIDES HOW MANY CARS FIT.
  const capped = resolveVehicles(S.vehicle_sizes, "small",
    [{ size: "large" }, { size: "large" }, { size: "large" }], 2);
  check("4e · and the server refuses a car past the limit whatever a form sent",
    capped.length === 2, String(capped.length));
  check("4f · an unknown size falls back to the tenant's first, never to ours",
    resolveVehicles(S.vehicle_sizes, "nonsense", [{ size: "nonsense" }], 3)
      .every((v) => v.key === "small"));

  // A SPLIT BOOKING IS N CALLS, AND NONE OF THEM CARRIES THE CARLOAD.
  const filled = {
    ...form, customerName: "A", customerPhone: "1", customerEmail: "a@b.c",
    serviceIds: ["s1"], addOns: [], bookingDate: "2026-10-01", startTime: "09:00",
    splitDays: true, extraVehicles: [{ size: "large", model: "F", date: "2026-10-03", time: "10:00" }],
  };
  const reqs = bookingRequests(filled);
  check("4g · a split booking is one call per car",
    reqs.length === 2, String(reqs.length));
  check("4h · and NO call carries extra vehicles, or the first is billed twice",
    reqs.every((r) => r.extra_vehicles === null), JSON.stringify(reqs.map((r) => r.extra_vehicles)));
  check("4i · each call carries its own car, day and time",
    reqs[1].vehicle_size === "large" && reqs[1].booking_date === "2026-10-03"
      && reqs[1].start_time === "10:00",
    JSON.stringify(reqs[1]));
  check("4j · one visit is still one call, carrying the carload",
    bookingRequests({ ...filled, splitDays: false }).length === 1
      && bookingRequests({ ...filled, splitDays: false })[0].extra_vehicles?.length === 1);
  check("4k · and the group is ASKED for, never asserted",
    groupedWith(reqs[1], "abc").group_with === "abc"
      && bookingRequest(filled).group_with === undefined);

  // EVERY CAR NEEDS ITS OWN DAY. Without this the customer walks past the
  // step having scheduled one car and the submit refuses the rest.
  const half = { ...filled, extraVehicles: [{ size: "large", date: "", time: "" }] };
  check("4l · a split booking cannot leave a car unscheduled",
    canAdvance("When", { form: filled, settings: S }) === true
      && canAdvance("When", { form: half, settings: S }) === false);

  // A SECOND CAR CHANGES THE PRICE AND THE DURATION.
  check("4m · the quote key notices a car being added",
    quoteKey(filled) !== quoteKey({ ...filled, extraVehicles: [] }));
  check("4n · and notices the days being split",
    quoteKey(filled) !== quoteKey({ ...filled, splitDays: false }));
}

// ─── 5. The things only reading the source can see ───────────────────────
console.log("5. what no running test could notice");
{
  // 5a — THE SENDERS ARE DISCOVERED, NOT LISTED. Every edge function that
  // assembles a BookingEmailData is found by its `vehicleSize:` line; each one
  // must also pass `extraVehicles`, or it sends a valid email naming one car
  // for a three-car job.
  const dir = new URL("../supabase/functions/", import.meta.url);
  const senders = readdirSync(dir)
    .filter((d) => existsSync(new URL(`${d}/index.ts`, dir)))
    .filter((d) => /^\s*vehicleSize:/m.test(strip(read(`supabase/functions/${d}/index.ts`))));
  check("5a · the sweep found the email senders at all",
    senders.length >= 7, `found ${senders.length}: ${senders.join(", ")}`);
  const forgot = senders.filter((d) =>
    !/^\s*extraVehicles:/m.test(strip(read(`supabase/functions/${d}/index.ts`))));
  check("5b · and every one of them says how many cars there are",
    forgot.length === 0, `forgot: ${forgot.join(", ")}`);
  // **RE-POINTED, NOT RELAXED — 2026-09-07.** This pinned the literal
  // `vehicleFact(b)`, and roadmap 8.17 stage 2a gave that helper a LANGUAGE
  // argument, so two of the three call sites became `vehicleFact(b, b.lang)`
  // and the count fell to one. The rule it guards is unchanged and is the
  // reason it exists: three tables draw the vehicle row and they all draw it
  // from one function, so a three-car job cannot say "one car" on one of them.
  // It counts CALLS now rather than a spelling, and still insists each one is
  // passed the booking.
  const factCalls = strip(read("supabase/functions/_shared/emailTemplates.ts"))
    .match(/vehicleFact\(b[,)]/g) ?? [];
  check("5c · the fact row is ONE function, so all three tables agree",
    factCalls.length === 3, `${factCalls.length} calls`);

  // 5d — THE DEALERSHIP FORM COMPUTES NOTHING. *"There shouldn't be auto
  // calculations, because obviously when they do this there's discounts."*
  // A per-car figure printed on that form is a number nobody agreed to.
  const bulk = strip(read("app/src/components/BulkJobModal.jsx"));
  check("5d · the bulk-job form does no arithmetic on the money at all",
    !/amount\s*[*/]|[*/]\s*(Number\(amount\)|cars)|Number\(amount\)\s*[*/]/.test(bulk), bulk.match(/.*[*/].*(amount|cars).*/)?.[0] ?? "");
  check("5e · it charges what was typed, into both money columns",
    /total_price: Number\(amount\)/.test(bulk) && /final_amount: Number\(amount\)/.test(bulk));
  check("5f · and it is marked done and paid, so it never joins the unpaid list",
    /status: "completed"/.test(bulk) && /payment_status: "paid"/.test(bulk));
  // THE BUSINESS'S CLOCK, NOT THE BROWSER'S — F-018 was three copies of this
  // question disagreeing, and this form writes two instants by hand.
  check("5g · and it dates the job in the BUSINESS's timezone",
    /localDateTimeToInstant\(business\.timezone/.test(bulk));

  // 5h — THE MIGRATION'S LOAD-BEARING LINES.
  const mig = read("supabase/migrations/20260907000400_multiple_vehicles.sql");
  check("5h · a vehicle row can never be position 1, so one fact has one home",
    /position\s+integer not null check \(position >= 2\)/.test(strip(mig)));
  check("5i · a logged bulk job is outside the overlap constraint",
    /where \(status <> 'cancelled' and deleted_at is null and bulk_vehicle_count is null\)/
      .test(strip(mig)));
  check("5j · and the limit defaults to 1, so nothing changes until a detailer says so",
    /max_vehicles_per_booking integer not null default 1/.test(strip(mig)));

  // 5j-ii — A CAR BELONGS TO A BOOKING OF THE SAME BUSINESS, and the row-level
  // policy cannot say that: it asks whether the ROW is yours and has no
  // opinion about where `booking_id` points. Raised by the security review of
  // this item, and closed with a COMPOSITE FOREIGN KEY rather than a trigger,
  // because a `check` may not read another table. Proven by behaviour as well
  // as by this line: a cross-tenant insert raises `foreign_key_violation`.
  const fk = strip(read("supabase/migrations/20260907000600_vehicle_belongs_to_its_booking.sql"));
  check("5j-ii · a car cannot be added to another tenant's booking",
    /foreign key \(booking_id, business_id\)[\s\S]{0,80}references public\.bookings \(id, business_id\)/i
      .test(fk));

  // 5k — THE PUBLIC PROFILE PUBLISHES THE LIMIT. That RPC is an explicit key
  // list, so a settings column is invisible to every booking form in the world
  // until it is named — the dashboard setting saves, the screen works, and the
  // feature reaches nobody.
  check("5k · the public profile tells a booking form how many cars are allowed",
    /'max_vehicles_per_booking', s\.max_vehicles_per_booking/
      .test(read("supabase/migrations/20260907000500_profile_publishes_vehicle_limit.sql")));
  // STRIPPED, and it caught itself on the first run: that migration's own
  // header explains why the setup minutes stay private, so the check failed on
  // the sentence saying it does the thing the check is for. Same family as
  // `booking-core` § 1 and `platform-admin` — a file's prose about a rule is
  // not the rule.
  check("5l · and it does NOT publish the setup minutes, which no form may compute with",
    !/extra_vehicle_minutes_saved/
      .test(strip(read("supabase/migrations/20260907000500_profile_publishes_vehicle_limit.sql"))));

  // 5m-pre — THE CONSTRAINT AND THE AVAILABILITY ENGINE ARE TWO ENFORCEMENT
  // SITES FOR ONE RULE, AND THE FIRST VERSION OF THIS ITEM CHANGED ONE OF
  // THEM. `bookings_no_overlap` exempts a logged bulk job; `available-slots`
  // and `slotValidation` did not, so a bulk job written across 08:00–17:00
  // blanked out that whole day on the booking page and then `validateSlot`
  // refused anything on it. **It was found by the security review, not by any
  // check here** — every check in this file asked what the SQL says or what
  // the arithmetic does, and none asked whether the two agreed.
  for (const [name, path] of [
    ["available-slots", "supabase/functions/available-slots/index.ts"],
    ["the slot gate", "supabase/functions/_shared/slotValidation.ts"],
  ]) {
    const src = strip(read(path));
    check(`5m-pre · ${name} does not count a logged bulk job as busy time`,
      /\.is\("bulk_vehicle_count", null\)/.test(src),
      "the exclusion constraint exempts those rows and this query must agree");
  }

  // 5m — EVERY BOOKING READ ON THE DASHBOARD CARRIES THE OTHER CARS. One
  // select serves the job record, the row, the day panel, the calendar and the
  // client's history, so none of them can be the one that forgot.
  check("5m · every dashboard booking read carries the other cars",
    /vehicles:booking_vehicles\(/.test(read("app/src/hooks/useBookings.js")));
  check("5n · the row leads with the car count, which truncation eats last",
    /cars > 1 \? `\$\{cars\} cars` : null,/.test(read("app/src/components/JobRow.jsx")));
}

// ─── 6. Against the DEPLOYED functions ────────────────────────────────────
// Everything above is arithmetic and source. This is the only part that can
// tell you the product does it — and it is where the two real defects of this
// item were caught: `create-booking` handing the engine size STRINGS where it
// now takes objects (every extra car silently priced as the base size), and a
// group guard that matched on email OR phone (two different people, one
// household address, one group).
console.log("6. the deployed functions");
{
  const envPath = new URL("../.env", import.meta.url);
  if (!existsSync(envPath)) {
    console.log("  SKIPPED — no root .env, so nothing here ran. "
      + "Run `node tests/multi-vehicle.test.mjs` from a machine with credentials.");
  } else {
    const env = Object.fromEntries(readFileSync(envPath, "utf8").split(/\r?\n/)
      .filter((l) => l && !l.startsWith("#"))
      .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]));
    const URL_ = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
    const ANON = env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY;
    const SVC = env.SUPABASE_SERVICE_ROLE_KEY;
    if (!URL_ || !ANON || !SVC) {
      console.log("  SKIPPED — .env is missing SUPABASE_URL / ANON / SERVICE_ROLE_KEY.");
    } else {
      const SLUG = "demo-riverside";
      const rest = async (path, init = {}) => {
        const r = await fetch(`${URL_}/rest/v1/${path}`, {
          ...init,
          headers: {
            apikey: SVC, Authorization: `Bearer ${SVC}`,
            "Content-Type": "application/json", Prefer: "return=representation",
            ...(init.headers || {}),
          },
        });
        const t = await r.text();
        if (!r.ok) throw new Error(`${path} → ${r.status} ${t}`);
        return t ? JSON.parse(t) : null;
      };
      const fn = async (name, body) => {
        const r = await fetch(`${URL_}/functions/v1/${name}`, {
          method: "POST",
          headers: { apikey: ANON, "Content-Type": "application/json" },
          body: JSON.stringify({ business_slug: SLUG, ...body }),
        });
        const d = await r.json().catch(() => null);
        if (!r.ok) throw new Error(`${name} → ${r.status} ${JSON.stringify(d)}`);
        return d;
      };
      const [biz] = await rest(`businesses?slug=eq.${SLUG}&select=id,timezone`);
      const before = (await rest(`business_settings?business_id=eq.${biz.id}`
        + "&select=max_vehicles_per_booking,extra_vehicle_minutes_saved,vehicle_sizes"))[0];
      const svc = (await rest(`services?business_id=eq.${biz.id}&is_active=eq.true`
        + "&select=id,name&limit=1"))[0];
      const sizes = before.vehicle_sizes ?? [];
      const small = sizes[0]?.key ?? "small";
      const big = sizes[sizes.length - 1]?.key ?? "large";
      const made = [];
      try {
        // THE COUNTERS FIRST, like `booking-engine`, `request-mode` and
        // `e2e-booking`. This section books more in two minutes than a real
        // customer does in a year, from one address, so an unexplained 429
        // here is roadmap 2.21's throttle and not a regression — and a 429
        // mid-run reads as a broken engine with a dozen failures behind it.
        await rest("rate_hits?bucket=like.booking%25", { method: "DELETE" }).catch(() => {});
        await rest("rate_hits?bucket=like.public%25", { method: "DELETE" }).catch(() => {});
        await rest(`business_settings?business_id=eq.${biz.id}`, {
          method: "PATCH",
          body: JSON.stringify({ max_vehicles_per_booking: 3, extra_vehicle_minutes_saved: 15 }),
        });
        const q = (body) => fn("calculate-booking",
          { service_ids: [svc.id], add_ons: [], vehicle_size: small, ...body })
          .then((r) => r.quote);
        const one = await q({});
        const two = await q({ extra_vehicles: [{ size: big, model: "F-150" }] });
        const same = await q({ extra_vehicles: [{ size: small }] });
        check("6a · a second car takes double MINUS the setup, exactly",
          same.total_duration === one.total_duration * 2 - 15,
          `${one.total_duration} → ${same.total_duration}`);
        check("6b · and costs a full second car, less the one-off travel",
          same.total === one.total * 2 - one.travel_fee,
          `${one.total} → ${same.total} (travel ${one.travel_fee})`);
        check("6c · four cars asked of a three-car business is priced as three",
          (await q({ extra_vehicles: [{ size: big }, { size: big }, { size: big }, { size: big }] }))
            .vehicle_count === 3);

        const today = new Date(new Date().toLocaleString("en-US", { timeZone: biz.timezone }));
        const iso = (d) => d.toISOString().slice(0, 10);
        const findDay = async (mins, skip = []) => {
          for (let i = 2; i < 40; i++) {
            const d = new Date(today); d.setDate(d.getDate() + i);
            if (skip.includes(iso(d))) continue;
            const r = await fn("available-slots", {
              start_date: iso(d), end_date: iso(d),
              duration_minutes: mins, service_ids: [svc.id],
            });
            const s = r.days?.[iso(d)]?.slots ?? [];
            if (s.length) return { day: iso(d), time: s[0].time ?? s[0] };
          }
          return null;
        };
        const slot = await findDay(two.total_duration);
        if (!slot) {
          check("6d · NOT MEASURED — the demo diary had no room for two cars", false,
            "re-seed with `node scripts/seed-demo.mjs`");
        } else {
          const b = await fn("create-booking", {
            customer_name: "Multi-vehicle test", customer_phone: "5550000810",
            customer_email: "delivered@resend.dev", customer_address: "1 Test Way",
            service_type: "mobile", vehicle_size: small, vehicle_model: "Civic",
            extra_vehicles: [{ size: big, model: "F-150" }],
            service_ids: [svc.id], add_ons: [],
            booking_date: slot.day, start_time: slot.time,
          });
          made.push(b.booking.id);
          const [row] = await rest(`bookings?id=eq.${b.booking.id}`
            + "&select=start_at,end_at,total_price,vehicle_size,price_adjustments,"
            + "booking_vehicles(position,vehicle_size_label,vehicle_model)");
          const mins = Math.round((new Date(row.end_at) - new Date(row.start_at)) / 60000);
          // A NUMBER PRINTED IS NOT A NUMBER CHARGED — the rule this repo is
          // built around, asked of the carload.
          check("6d · charged what the price bar printed",
            Number(row.total_price) === Number(two.total),
            `bar ${two.total}, row ${row.total_price}`);
          check("6e · and holds a slot the length of the whole carload",
            mins === two.total_duration, `${mins} vs ${two.total_duration}`);
          check("6f · the second car has its own row, at position 2",
            row.booking_vehicles?.length === 1 && row.booking_vehicles[0].position === 2,
            JSON.stringify(row.booking_vehicles));
          check("6g · with its own snapshotted label and model",
            row.booking_vehicles?.[0]?.vehicle_model === "F-150"
              && !!row.booking_vehicles?.[0]?.vehicle_size_label);
          check("6h · while the booking row still describes ONE car",
            row.vehicle_size === small, row.vehicle_size);
          check("6i · and the extra car is on price_adjustments, where receipts look",
            (row.price_adjustments ?? []).some((a) => /2nd vehicle/.test(a.label)),
            JSON.stringify(row.price_adjustments));

          const split = await q({
            extra_vehicles: [{ size: big, model: "F-150" }], split_days: true,
          });
          check("6j · a split quote is the sum of the bookings it will make",
            split.per_vehicle?.length === 2
              && split.total === split.per_vehicle[0].total + split.per_vehicle[1].total,
            JSON.stringify(split.per_vehicle));
          check("6k · and asks for ONE car's length, not the carload's",
            split.single_vehicle_duration === one.total_duration);

          const d2 = await findDay(one.total_duration, [slot.day]);
          const d3 = d2 ? await findDay(one.total_duration, [slot.day, d2.day]) : null;
          const d4 = d3 ? await findDay(one.total_duration, [slot.day, d2.day, d3.day]) : null;
          if (!d2 || !d3 || !d4) {
            check("6l · NOT MEASURED — the demo diary had no room for the split legs", false);
          } else {
            const person = {
              customer_name: "Split test", customer_phone: "5550000811",
              customer_email: "delivered@resend.dev", service_type: "mobile",
              service_ids: [svc.id], add_ons: [],
            };
            const a = await fn("create-booking", {
              ...person, vehicle_size: small, vehicle_model: "Civic",
              booking_date: d2.day, start_time: d2.time,
            });
            made.push(a.booking.id);
            const c = await fn("create-booking", {
              ...person, vehicle_size: big, vehicle_model: "F-150",
              booking_date: d3.day, start_time: d3.time, group_with: a.booking.id,
            });
            made.push(c.booking.id);
            const rows = await rest(
              `bookings?id=in.(${a.booking.id},${c.booking.id})&select=id,booking_group_id,start_at`);
            const gids = [...new Set(rows.map((r) => r.booking_group_id))];
            check("6l · two cars on two days share one group",
              gids.length === 1 && !!gids[0], JSON.stringify(gids));
            check("6m · and really are on different days",
              rows[0].start_at.slice(0, 10) !== rows[1].start_at.slice(0, 10));
            // THE GUARD. Same household email, different phone — the shape
            // that caught the first version of this check accepting EITHER.
            const stranger = await fn("create-booking", {
              ...person, customer_name: "Someone Else", customer_phone: "5559990000",
              vehicle_size: small, booking_date: d4.day, start_time: d4.time,
              group_with: a.booking.id,
            });
            made.push(stranger.booking.id);
            const [sr] = await rest(`bookings?id=eq.${stranger.booking.id}&select=booking_group_id`);
            check("6n · but a different person naming that booking joins no group",
              sr.booking_group_id === null, String(sr.booking_group_id));
          }
        }
      } finally {
        for (const id of made) {
          await rest(`bookings?id=eq.${id}`, { method: "DELETE" }).catch(() => {});
        }
        await rest(`business_settings?business_id=eq.${biz.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            max_vehicles_per_booking: before.max_vehicles_per_booking,
            extra_vehicle_minutes_saved: before.extra_vehicle_minutes_saved,
          }),
        }).catch(() => {});
      }
    }
  }
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
