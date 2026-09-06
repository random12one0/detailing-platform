// THE HEADLESS BOOKING CORE — roadmap 3.2(a).
//
// `app/src/book/core.js` is the module every tenant site's own booking form
// drives, and the reason it exists is that the FORM forks per client and the
// RULES must not. Until this item those rules lived inside React components
// where nothing could reach them: the group rules were a closure inside
// BookingPage's `setForm`, the step gating was an IIFE, and the two money
// payloads were object literals typed at their call sites.
//
// WHAT THIS FILE IS FOR, and it is not "coverage": a rule that is only
// exercised by clicking through `/book/:slug` is a rule the NEXT booking form
// gets to reimplement its own way. Every check below is a sentence a client's
// site has to still be true of.
//
// Credential-free, no dev server, no browser.
//
//   node tests/booking-core.test.mjs

import {
  DEFAULT_VEHICLE_SIZES, REMEMBER_KEY, VEHICLE_CONDITIONS, bookingRequest,
  canAdvance, dayIsOpen, dayRefusesMode, groupServices, initialForm,
  modeLimitFor, monthGrid, monthHasNothing, monthRange, normalizeProfile,
  normalizeSettings, offersBothModes, quoteKey, quoteRequest, recallCustomer,
  rememberCustomer, shiftMonth, slotsForType, stepsFor, toggleService,
} from "../app/src/book/core.js";

let passed = 0, failed = 0;
const check = (name, cond, detail = "") => {
  if (cond) { passed++; console.log(`  ok    ${name}`); }
  else { failed++; console.error(`  FAIL  ${name}\n        ${detail}`); }
};

const svc = (id, extra = {}) => ({ id, name: id, price: 100, duration_minutes: 60, ...extra });

// ─── 1. Nothing but rules is in there ─────────────────────────────────────
// The one property that makes this module portable at all. A site built on
// Astro, Alpine or nothing has no React, no bundler aliases and no CSS
// pipeline, so a single import of any of them makes the core unusable by the
// audience it was written for — and it would be found by a client's agent
// rather than here.
{
  const raw = await import("node:fs").then((fs) => fs.readFileSync("app/src/book/core.js", "utf8"));
  // THE COMMENTS GO FIRST, and finding that out is the reason this note is
  // here: this file's own header says "no React, no import.meta.env" in prose,
  // so a check reading the whole file fails on the sentence promising the
  // thing it is checking for. Two of these did, on their first run.
  const src = raw.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  check("the core imports nothing at all", !/^\s*import\s/m.test(src),
    "an import statement makes it un-droppable into a site that is not this one");
  check("no JSX", !/<[A-Za-z][^>]*>/.test(src));
  check("no Vite env", !src.includes("import.meta.env"),
    "the caller passes its own URL and key");
  check("no React", !/\buse(State|Effect|Memo|Callback|Ref)\b/.test(src));
  check("localStorage is reached ONLY through the two wrapped helpers",
    (src.match(/localStorage/g) ?? []).length === 2,
    "it throws outright in a private window and in some embedded webviews");
}

// ─── 2. The step sequence ─────────────────────────────────────────────────
// W19: the Extras step exists only where the business has add-ons, because an
// empty step makes "Step 3 of 7" a lie for every tenant without them.
{
  check("seven steps with add-ons", stepsFor([{ id: "a" }]).length === 7);
  check("six without", stepsFor([]).length === 6);
  check("null add-ons is the same as none", stepsFor(null).length === 6);
  check("Extras sits directly after Services",
    stepsFor([{ id: "a" }])[1] === "Extras", stepsFor([{ id: "a" }]).join(" "));
  check("Review is always last",
    stepsFor([]).at(-1) === "Review" && stepsFor([{ id: "a" }]).at(-1) === "Review");
  check("the order is otherwise fixed",
    stepsFor([]).join(",") === "Services,Vehicle,Location,When,Details,Review");
}

// ─── 3. The profile's fallbacks ───────────────────────────────────────────
// Two of these are load-bearing rather than tidy, and both protect the
// customer from a half-configured business.
{
  const d = normalizeSettings({});
  check("booking_mode falls back to reserve, never request",
    d.booking_mode === "reserve", "a page must never promise LESS than the business delivers");
  check("an unreadable booking_mode is reserve too",
    normalizeSettings({ booking_mode: "REQUEST " }).booking_mode === "reserve");
  check("request is honoured when it really is request",
    normalizeSettings({ booking_mode: "request" }).booking_mode === "request");
  check("water/power fall back to the OLD boolean's meaning — asked",
    d.water_requirement === "ask" && d.power_requirement === "ask");
  check("...and to not_needed when that boolean was false",
    normalizeSettings({ ask_water_electric: false }).water_requirement === "not_needed");
  check("an explicit requirement outranks the old boolean",
    normalizeSettings({ ask_water_electric: false, power_requirement: "required" }).power_requirement === "required");
  check("a business with no sizes is still bookable",
    d.vehicle_sizes === DEFAULT_VEHICLE_SIZES);
  check("an EMPTY size list falls back too",
    normalizeSettings({ vehicle_sizes: [] }).vehicle_sizes.length === 3,
    "a detailer who deleted every size must not get an unanswerable step");
  check("the tenant's own sizes win",
    normalizeSettings({ vehicle_sizes: [{ key: "bike" }] }).vehicle_sizes[0].key === "bike");
  check("travel zones default to none, not undefined",
    Array.isArray(d.travel_zones) && d.travel_zones.length === 0);

  const p = normalizeProfile(null);
  check("a null profile still normalises", p.business === null && p.services.length === 0);
  check("service_groups is renamed to serviceGroups exactly once",
    Array.isArray(normalizeProfile({ service_groups: [{ id: "g" }] }).serviceGroups));
  check("plans default to none — most tenants run none",
    p.plans.length === 0);
}

// ─── 4. The tenant's defaults, not ours ───────────────────────────────────
// W9. Hardcoding "small" was safe while every business had our three sizes
// and is a broken quote the moment a detailer names their base size something
// else.
{
  const s = {
    vehicle_sizes: [{ key: "compact" }, { key: "truck" }],
    travel_zones: [{ key: "north", fee: 0 }, { key: "far", fee: 40 }],
  };
  const f = initialForm(s, null);
  check("the FIRST vehicle size is the default", f.vehicleSize === "compact", f.vehicleSize);
  check("the FIRST travel zone is the default", f.travelZone === "north", f.travelZone);
  check("mobile is the default where both are offered", f.serviceType === "mobile");
  check("a drop-off-only business never asks the question",
    initialForm({ mobile_enabled: false }, null).serviceType === "dropoff");
  check("no zones means no zone", initialForm({}, null).travelZone === "");
  check("water and power start FALSE, which is a real answer",
    f.hasWater === false && f.hasPower === false);

  const known = { name: "Marcus", email: "m@example.com", phone: "555-0100" };
  const k = initialForm(s, known);
  check("a remembered customer is pre-filled",
    k.customerName === "Marcus" && k.customerEmail === "m@example.com" && k.customerPhone === "555-0100");
  check("...and everybody else gets empty fields", f.customerName === "");
  check("what was booked is NEVER remembered",
    k.serviceIds.length === 0 && k.bookingDate === "" && k.startTime === "");
}

// ─── 5. The group rules — W25 and 2.8c's exclusive category ───────────────
// Oregon Detail Co publishes complete packages AND standalone interior and
// exterior work as three categories; with each obeying only its own "pick
// one", a customer could book $1,645 of work the $625 package contained.
{
  const groups = [
    { id: "pkg", name: "Packages", is_exclusive: true },
    { id: "int", name: "Interior", max_select: 1 },
    { id: "ext", name: "Exterior", max_select: 2 },
    { id: "any", name: "Anything" },
  ];
  const services = [
    svc("p1", { group_id: "pkg" }), svc("p2", { group_id: "pkg" }),
    svc("i1", { group_id: "int" }), svc("i2", { group_id: "int" }),
    svc("e1", { group_id: "ext" }), svc("e2", { group_id: "ext" }), svc("e3", { group_id: "ext" }),
    svc("a1", { group_id: "any" }), svc("a2", { group_id: "any" }),
  ];
  const ctx = { services, serviceGroups: groups };
  const T = (ids, id) => toggleService(ids, id, ctx);

  check("tapping an unselected service selects it", T([], "a1").join() === "a1");
  check("tapping a selected one clears it", T(["a1", "a2"], "a1").join() === "a2");
  check("an uncapped category takes as many as you like",
    T(T([], "a1"), "a2").length === 2);

  check("a max_select of 1 SWAPS rather than refusing the tap",
    T(["i1"], "i2").join() === "i2",
    "a control that does nothing when pressed reads as broken");
  check("a cap of 2 keeps two", T(T([], "e1"), "e2").length === 2);
  check("the third pushes the OLDEST out, never the one just tapped",
    T(["e1", "e2"], "e3").join() === "e2,e3");

  check("an exclusive category clears the whole basket",
    T(["i1", "e1", "a1"], "p1").join() === "p1",
    "a complete package supersedes the parts");
  check("picking anything else clears the package — symmetric on purpose",
    T(["p1"], "i1").join() === "i1");
  check("one package replaces another", T(["p1"], "p2").join() === "p2");
  check("a cap counts only its OWN category's siblings",
    T(["i1", "e1"], "e2").length === 3, "interior and exterior do not compete");
  check("an ungrouped service is capped by nothing",
    toggleService(["x1"], "x2", { services: [svc("x1"), svc("x2")], serviceGroups: [] }).length === 2);
}

// ─── 6. Grouping the menu ─────────────────────────────────────────────────
{
  const groups = [{ id: "b", name: "Second" }, { id: "a", name: "First", description: "why" }];
  const services = [
    svc("s1", { group_id: "a" }), svc("s2", { group_id: "b" }),
    svc("s3", { group_label: "Legacy" }), svc("s4", { group_id: "a" }),
  ];
  const out = groupServices(services, groups);
  check("the DETAILER'S order wins, not the services' order",
    out[0].key === "b" && out[1].key === "a", out.map((g) => g.key).join(","));
  check("anything ungrouped is last",
    out.at(-1).key === "Legacy", "an ungrouped service is one they have not filed yet");
  check("a pre-migration group_label still appears",
    out.at(-1).items[0].id === "s3",
    "a service with a label and no id must not vanish from the menu");
  check("services stay in their own group", out[1].items.map((s) => s.id).join() === "s1,s4");
  check("the category's description rides along", out[1].blurb === "why");
  check("a category's rule rides along", groupServices([svc("s", { group_id: "c" })],
    [{ id: "c", name: "C", max_select: 1 }])[0].rule === 1);
  check("a group_id pointing at nothing falls back rather than crashing",
    groupServices([svc("s", { group_id: "gone", group_label: "L" })], []).length === 1);
}

// ─── 7. A service that rules out a way of working — 2.8c ──────────────────
{
  check("no limit when everything allows everything",
    modeLimitFor([svc("a"), svc("b")]) === null);
  check("a service that cannot be done at an address forces drop-off",
    modeLimitFor([svc("a"), svc("coating", { allows_mobile: false })])?.only === "dropoff");
  check("...and NAMES the service that decided",
    modeLimitFor([svc("coating", { allows_mobile: false })])?.because === "coating",
    "'you can't do that' without saying why is what makes a form feel broken");
  check("the reverse exists too",
    modeLimitFor([svc("wash", { allows_dropoff: false })])?.only === "mobile");
  check("it is an AND across the whole selection — one blocker is enough",
    modeLimitFor([svc("a"), svc("b"), svc("c", { allows_mobile: false })]) !== null);
  check("undefined is not false — an unconfigured service allows both",
    modeLimitFor([svc("a", { allows_mobile: undefined })]) === null);

  const both = { mobile_enabled: true, dropoff_enabled: true };
  check("both modes offered when nothing narrows it", offersBothModes(both, null) === true);
  check("A MODE LIMIT MAKES IT A ONE-CHOICE STEP", offersBothModes(both, { only: "mobile" }) === false,
    "computing this without modeLimit is the bug roadmap 2.5 found in StepLocation");
  check("a mobile-only business is not a choice either",
    offersBothModes({ mobile_enabled: true, dropoff_enabled: false }, null) === false);
}

// ─── 8. Step gating ───────────────────────────────────────────────────────
// The courteous half. `_shared/slotValidation.ts` is the half that holds.
{
  const base = initialForm({}, null);
  const ok = { quote: { total: 100 }, quoting: false, settings: {} };
  const G = (step, form, extra = {}) => canAdvance(step, { form, ...ok, ...extra });

  check("Services needs a service", G("Services", base) === false);
  check("...and a server quote",
    G("Services", { ...base, serviceIds: ["s"] }, { quote: null }) === false,
    "the old widget let a customer walk to submit with a stale or null price");
  check("...and not while one is in flight",
    G("Services", { ...base, serviceIds: ["s"] }, { quoting: true }) === false);
  check("Services passes with both", G("Services", { ...base, serviceIds: ["s"] }) === true);
  check("Vehicle is gated on the quote only", G("Vehicle", base) === true);

  const mob = { ...base, serviceType: "mobile" };
  check("a mobile job needs an address", G("Location", mob) === false);
  check("whitespace is not an address", G("Location", { ...mob, customerAddress: "   " }) === false);
  check("a drop-off never asks for one",
    G("Location", { ...base, serviceType: "dropoff" }) === true);
  const addressed = { ...mob, customerAddress: "1 Main St" };
  check("an address is enough where nothing is required", G("Location", addressed) === true);
  check("REQUIRED water blocks the step",
    G("Location", addressed, { settings: { water_requirement: "required" } }) === false);
  check("...and ticking it unblocks",
    G("Location", { ...addressed, hasWater: true }, { settings: { water_requirement: "required" } }) === true);
  check("required POWER is checked independently",
    G("Location", { ...addressed, hasWater: true },
      { settings: { water_requirement: "required", power_requirement: "required" } }) === false);
  check("a merely ASKED resource never blocks",
    G("Location", addressed, { settings: { water_requirement: "ask" } }) === true);
  check("a required resource does not block a DROP-OFF",
    G("Location", { ...base, serviceType: "dropoff" }, { settings: { water_requirement: "required" } }) === true,
    "nobody is bringing a hose to our own unit");

  check("When needs a day AND a time",
    G("When", { ...base, bookingDate: "2026-09-10" }) === false);
  check("...and passes with both",
    G("When", { ...base, bookingDate: "2026-09-10", startTime: "09:00" }) === true);
  const named = { ...base, customerName: "A", customerPhone: "5", customerEmail: "a@b.c" };
  check("Details needs all three", G("Details", { ...named, customerEmail: "" }) === false);
  check("...and whitespace is none of them", G("Details", { ...named, customerPhone: " " }) === false);
  check("Details passes when reachable", G("Details", named) === true);
  check("Review never blocks — the button is the gate there", G("Review", base) === true);
  check("Extras never blocks — it is optional by definition", G("Extras", base) === true);
}

// ─── 9. The calendar ──────────────────────────────────────────────────────
{
  const r = monthRange("2026-09", "2026-09-14");
  check("the range never asks for days in the past", r.start === "2026-09-14", r.start);
  check("a future month starts at the 1st",
    monthRange("2026-10", "2026-09-14").start === "2026-10-01");
  check("September ends on the 30th", r.end === "2026-09-30", r.end);
  check("February 2028 is a leap year", monthRange("2028-02", "2026-01-01").end === "2028-02-29");
  check("February 2026 is not", monthRange("2026-02", "2026-01-01").end === "2026-02-28");

  const g = monthGrid("2026-09");   // 1 Sep 2026 is a Tuesday
  check("the grid pads to the right weekday", g[0] === null && g[1] === null && g[2] === "2026-09-01",
    JSON.stringify(g.slice(0, 4)));
  check("every day of the month is in it", g.filter(Boolean).length === 30);
  check("days are zero-padded", g.at(-1) === "2026-09-30" && g[10] === "2026-09-09");
  check("a month starting on Sunday pads by nothing",
    monthGrid("2026-11")[0] === "2026-11-01");

  check("December rolls into next January", shiftMonth("2026-12", 1) === "2027-01");
  check("January rolls back into last December", shiftMonth("2026-01", -1) === "2025-12");
  check("...and pads the month", shiftMonth("2026-08", 1) === "2026-09");
}

// ─── 10. Which times this customer can actually have — W4 ─────────────────
// The page must not OFFER a time the server is going to refuse.
{
  const day = {
    slots: ["09:00", "10:00", "11:00"],
    dropoff_slots: ["09:00"],
    mobile_slots: ["11:00"],
  };
  check("a mobile customer loses the drop-off-only times",
    slotsForType(day, "mobile").join() === "10:00,11:00");
  check("a drop-off customer loses the mobile-only times",
    slotsForType(day, "dropoff").join() === "09:00,10:00");
  check("a day with no restrictions offers everything",
    slotsForType({ slots: ["09:00"] }, "mobile").join() === "09:00");
  check("a missing day is no times, never a crash", slotsForType(undefined, "mobile").length === 0);

  check("OPEN means the business has times, not that this customer can have them",
    dayIsOpen({ slots: ["09:00"], dropoff_only: true }) === true,
    "greyed out it says only 'closed'; open, it can say which way it is restricted");
  check("a day with no slots is shut", dayIsOpen({ slots: [] }) === false);
  check("a day nobody asked about is shut", dayIsOpen(undefined) === false);

  check("a drop-off-only day refuses a mobile customer",
    dayRefusesMode({ dropoff_only: true }, "mobile") === true);
  check("...and takes a drop-off one", dayRefusesMode({ dropoff_only: true }, "dropoff") === false);
  check("a mobile-only day refuses a drop-off", dayRefusesMode({ mobile_only: true }, "dropoff") === true);
  check("no day refuses nothing", dayRefusesMode(null, "mobile") === false);

  check("a month of shut days is reported as empty",
    monthHasNothing({ "2026-09-01": { slots: [] }, "2026-09-02": { slots: [] } }) === true);
  check("one open day is not an empty month",
    monthHasNothing({ "2026-09-01": { slots: [] }, "2026-09-02": { slots: ["09:00"] } }) === false);
  check("a month nothing answered for is empty", monthHasNothing(null) === true);
}

// ─── 11. The two payloads that carry money ────────────────────────────────
// A number PRINTED is not a number CHARGED. These build what goes on the
// wire, so a field dropped here is a quietly different price.
{
  const form = {
    ...initialForm({ vehicle_sizes: [{ key: "compact" }] }, null),
    serviceIds: ["s1"], addOns: ["a1"], serviceType: "mobile", travelZone: "far",
    bookingDate: "2026-09-20", startTime: "09:00",
    customerName: " Marcus ", customerPhone: " 555 ", customerEmail: " m@e.com ",
    customerAddress: " 1 Main St ", vehicleModel: " Civic ", vehicleCondition: "heavy",
    customerNotes: "  ", hasWater: true, hasPower: false,
  };

  const q = quoteRequest(form, { planId: "p1", promoApplied: "SAVE10" });
  for (const k of ["service_ids", "add_ons", "vehicle_size", "applied_promo_code",
    "service_type", "travel_zone", "booking_date", "start_time", "plan_id"]) {
    check(`the quote carries ${k}`, q[k] !== undefined, JSON.stringify(q));
  }
  const empty = quoteRequest({ ...form, bookingDate: "", startTime: "" }, {});
  check("no day means no booking_date on the wire",
    empty.booking_date === undefined && empty.start_time === undefined,
    "a time-based rule that cannot be evaluated does not apply");
  check("no promo means no promo", empty.applied_promo_code === undefined);
  check("no plan means no plan", empty.plan_id === undefined);

  const k1 = quoteKey(form, { planId: "p1", promoApplied: "SAVE10" });
  check("the day is IN the quote key",
    quoteKey({ ...form, bookingDate: "2026-09-21" }, { planId: "p1", promoApplied: "SAVE10" }) !== k1,
    "2.8c: a weekend or evening rate depends on WHEN");
  check("the time is in it",
    quoteKey({ ...form, startTime: "17:00" }, { planId: "p1", promoApplied: "SAVE10" }) !== k1);
  check("the travel area is in it",
    quoteKey({ ...form, travelZone: "north" }, { planId: "p1", promoApplied: "SAVE10" }) !== k1);
  check("the way of working is in it",
    quoteKey({ ...form, serviceType: "dropoff" }, { planId: "p1", promoApplied: "SAVE10" }) !== k1);
  check("the PLAN is in it",
    quoteKey(form, { planId: "p2", promoApplied: "SAVE10" }) !== k1, "2.14: a plan changes what the job costs");
  check("the promo is in it", quoteKey(form, { planId: "p1", promoApplied: "" }) !== k1);
  check("the vehicle size is in it", quoteKey({ ...form, vehicleSize: "x" }, {}) !== quoteKey(form, {}));
  check("the same selection is the same key", quoteKey(form, { planId: "p1", promoApplied: "SAVE10" }) === k1);
  check("something the price does not depend on is NOT in it",
    quoteKey({ ...form, customerNotes: "gate code 4" }, { planId: "p1", promoApplied: "SAVE10" }) === k1,
    "typing a note must not re-price the job");

  const b = bookingRequest(form, { planId: "p1", promoApplied: "SAVE10" });
  check("names, addresses and models are trimmed",
    b.customer_name === "Marcus" && b.customer_address === "1 Main St" && b.vehicle_model === "Civic");
  check("an empty optional is NULL, never an empty string", b.customer_notes === null);
  check("the OLD has_water_electric column is written alongside the new pair",
    b.has_water === true && b.has_power === false && b.has_water_electric === false,
    "every already-deployed function still reads the old one");
  check("both true is the only true",
    bookingRequest({ ...form, hasPower: true }, {}).has_water_electric === true);
  check("the plan is an ID and nothing else",
    b.plan_id === "p1" && !("plan_name" in b) && !("plan_discount" in b),
    "the name, the kind and the amount all come off the plan row on the server");
  check("no plan is null, not undefined", bookingRequest(form, {}).plan_id === null);
  check("NO TOTAL IS SENT", !("total" in b) && !("total_price" in b) && !("price" in b),
    "create-booking recomputes every quote whatever the client sent");
  check("the condition reaches the booking", b.vehicle_condition === "heavy");
  check("an unanswered condition is null",
    bookingRequest({ ...form, vehicleCondition: "" }, {}).vehicle_condition === null);
}

// ─── 12. The four condition keys ──────────────────────────────────────────
// A site may relabel these and may not rename them: the key is what reaches
// `bookings.vehicle_condition`.
{
  check("four conditions, in order",
    VEHICLE_CONDITIONS.map((c) => c.key).join() === "light,moderate,heavy,extreme");
  check("each has a label", VEHICLE_CONDITIONS.every((c) => !!c.label));
}

// ─── 13. What the device remembers ────────────────────────────────────────
// Roadmap 2.14 step 3. A hint, never a grant — create-booking re-reads the
// plan, so the worst a stale or borrowed device can do is ask.
{
  const store = new Map();
  const fake = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, v) };

  check("an empty device remembers nobody", recallCustomer("acme", fake) === null);
  rememberCustomer("acme", {
    customerName: " Marcus ", customerEmail: " m@e.com ", customerPhone: " 555 ",
  }, "plan-1", fake);
  const got = recallCustomer("acme", fake);
  check("three fields and a plan come back",
    got.name === "Marcus" && got.email === "m@e.com" && got.phone === "555" && got.planId === "plan-1");
  check("A DIFFERENT BUSINESS GETS NOTHING", recallCustomer("other", fake) === null,
    "one device, many detailers — a name is fine to carry over, a PLAN is not");
  check("the key is stable", store.has(REMEMBER_KEY));
  check("nothing about the JOB is remembered",
    !JSON.parse(store.get(REMEMBER_KEY)).serviceIds,
    "a device that remembers a selection pre-books somebody's next visit for them");

  // A storage that throws is the ordinary case in a private window and inside
  // some embedded webviews. A booking page that cannot render because a
  // CONVENIENCE threw is a far worse defect than a form nobody pre-filled.
  const angry = {
    getItem() { throw new Error("SecurityError"); },
    setItem() { throw new Error("SecurityError"); },
  };
  check("a storage that throws on read returns nobody", recallCustomer("acme", angry) === null);
  let threw = false;
  try { rememberCustomer("acme", { customerName: "A", customerEmail: "", customerPhone: "" }, null, angry); }
  catch { threw = true; }
  check("a storage that throws on write is swallowed", threw === false);
  check("junk in storage is nobody, not a crash",
    recallCustomer("acme", { getItem: () => "{not json" }) === null);
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
