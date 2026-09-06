// THE HEADLESS BOOKING CORE — roadmap 3.2(a).
//
// Every website-package tenant draws its OWN booking form, in that site's own
// design (the owner's 3.1 amendment; his own site's widget is 1,581 lines in
// the site's components folder). So the FORM is presentation and forks per
// client — and the RULES must not fork with it. This module is the rules.
//
// IT IS A LIFT, NOT AN INVENTION. Every function here came out of
// BookingPage.jsx and its six step components and behaves exactly as it did
// there; `app/src/book` now calls these instead of carrying its own copies,
// which is the only thing that keeps this file honest. A rule that lives here
// and ALSO lives in the page is worse than no lift at all.
//
// THE CONSTRAINTS THAT MAKE IT PORTABLE, and they are the whole point:
//   * no React, no markup, no CSS, no `import` of anything — this file must
//     drop into a site built on anything, including no framework at all;
//   * no Vite `import.meta.env` — the caller passes its own URL and key;
//   * everything is a pure function except the transport, which is fetch.
// A tenant site drives it with whatever state it likes. `app/src/book` uses
// React state; a site could use Alpine, Svelte or three global variables.
//
// WHAT IS DELIBERATELY NOT HERE: wording, formatting, headings, height
// budgets, the four-card vehicle ceiling. Those are measured against OUR page
// at OUR sizes and are wrong for somebody else's type and layout.
//
// AND THE FLOOR UNDER ALL OF IT: a site that gets this wrong can only OFFER a
// slot the server then refuses. `create-booking` recomputes every quote
// through `_shared/pricing.ts` whatever the client sent, `validateSlot` gates
// every time, and the exclusion constraint is in the database. A bespoke form
// cannot mis-charge and cannot double-book. See docs/tenant-site-contract.md.

// ---------------------------------------------------------------------------
// Transport. Five public endpoints and one public RPC — the entire surface a
// booking form needs. All six are unauthenticated by design: the four edge
// functions are deployed `verify_jwt=false` and the RPC is `security definer`,
// filtered on `status = 'active'` so a suspended business darkens every site
// built on it.
// ---------------------------------------------------------------------------

// The HTTP shape of a Supabase edge-function call, in one place.
// `app/src/lib/api.js` calls THIS for all of its functions, which is what
// keeps the core's transport exercised by every run of every suite rather
// than being a second, untested copy that rots beside the real one.
export async function postFunction(supabaseUrl, anonKey, name, body, jwt) {
  const res = await fetch(`${supabaseUrl}/functions/v1/${name}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: anonKey,
      ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);
  return data;
}

export function createBookingTransport({ supabaseUrl, anonKey }) {
  if (!supabaseUrl || !anonKey) throw new Error("createBookingTransport needs supabaseUrl and anonKey");
  const call = (name, body) => postFunction(supabaseUrl, anonKey, name, body);
  return {
    // The whole public read surface: one round trip, one tenant.
    async profile(slug) {
      const res = await fetch(`${supabaseUrl}/rest/v1/rpc/get_public_business_profile`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          apikey: anonKey,
          Authorization: `Bearer ${anonKey}`,
        },
        body: JSON.stringify({ p_slug: slug }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || `Request failed (${res.status})`);
      return data ?? null;
    },
    // ROADMAP 3.3 — THE SAME PROFILE, FOUND BY HOSTNAME. A detailer who has
    // pointed their own address at this app is served from `/` on it, and a
    // bespoke site hosted anywhere can use this instead of hard-coding a slug
    // it would then have to keep in step with the dashboard.
    // **Only a VERIFIED domain resolves** — an unverified row is a claim, and
    // serving a business from a claim would let anybody who can type a
    // hostname decide what that hostname shows.
    async profileByHost(host) {
      const res = await fetch(`${supabaseUrl}/rest/v1/rpc/get_public_business_profile_by_host`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          apikey: anonKey,
          Authorization: `Bearer ${anonKey}`,
        },
        body: JSON.stringify({ p_host: host }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || `Request failed (${res.status})`);
      return data ?? null;
    },
    // THE ONLY PLACE A PRICE EVER COMES FROM. A site that adds up service
    // prices itself has forked the pricing engine, which is the one thing
    // docs/tenant-site-contract.md forbids outright.
    calculateBooking: (slug, payload) => call("calculate-booking", { business_slug: slug, ...payload }),
    // THE ONLY PLACE AN OPEN TIME EVER COMES FROM — hours, buffer, blockouts,
    // slot interval, minimum notice, per-day cap and per-service weekdays all
    // live behind it.
    availableSlots: (slug, payload) => call("available-slots", { business_slug: slug, ...payload }),
    createBooking: (slug, payload) => call("create-booking", { business_slug: slug, ...payload }),
    validatePromo: (slug, code, customerEmail, customerPhone) =>
      call("validate-promo-code", {
        business_slug: slug, code,
        customer_email: customerEmail || null, customer_phone: customerPhone || null,
      }),
  };
}

// ---------------------------------------------------------------------------
// The profile, normalised. Every fallback here exists so a HALF-CONFIGURED
// business still renders a bookable page, and two of them are load-bearing
// rather than tidy:
//   * `booking_mode` falls back to 'reserve' — an unreadable value must never
//     make a page promise LESS than the business actually delivers;
//   * `water_requirement` / `power_requirement` fall back to the old single
//     boolean's meaning, so a settings row that predates that migration gets
//     the page it had.
// ---------------------------------------------------------------------------

export const DEFAULT_VEHICLE_SIZES = [
  { key: "small", label: "Small", examples: "Coupe, sedan, hatchback" },
  { key: "medium", label: "Medium", examples: "Small SUV, crossover, wagon" },
  { key: "large", label: "Large", examples: "Truck, large SUV, van" },
];

export function normalizeSettings(raw) {
  const settings = raw ?? {};
  const askWaterElectric = settings.ask_water_electric ?? true;
  return {
    mobile_enabled: settings.mobile_enabled ?? true,
    dropoff_enabled: settings.dropoff_enabled ?? true,
    ask_water_electric: askWaterElectric,
    water_requirement: settings.water_requirement ?? (askWaterElectric ? "ask" : "not_needed"),
    power_requirement: settings.power_requirement ?? (askWaterElectric ? "ask" : "not_needed"),
    ask_vehicle_condition: settings.ask_vehicle_condition ?? true,
    vehicle_sizes: Array.isArray(settings.vehicle_sizes) && settings.vehicle_sizes.length
      ? settings.vehicle_sizes
      : DEFAULT_VEHICLE_SIZES,
    slot_interval_minutes: settings.slot_interval_minutes ?? 30,
    travel_fee: settings.travel_fee ?? null,
    travel_zones: Array.isArray(settings.travel_zones) ? settings.travel_zones : [],
    min_advance_minutes: settings.min_advance_minutes ?? 120,
    booking_mode: settings.booking_mode === "request" ? "request" : "reserve",
    google_review_url: settings.google_review_url ?? null,
    yelp_review_url: settings.yelp_review_url ?? null,
    // ROADMAP 3.2(b) — contract §6b and §6c. Neither reaches this booking
    // page; both exist because a TENANT SITE draws an FAQ section and a "how
    // to pay" section and had no way to read either.
    //
    // `faq_enabled` is separate from an empty list and stays separate: "I have
    // not written any yet" and "I do not want this section on my page" are two
    // different answers, and a site that infers the second from the first
    // removes a section the detailer is halfway through filling in.
    faqs: Array.isArray(settings.faqs) ? settings.faqs : [],
    faq_enabled: settings.faq_enabled ?? false,
    pay_cash: settings.pay_cash ?? false,
    pay_venmo: settings.pay_venmo ?? null,
    pay_cashapp: settings.pay_cashapp ?? null,
    pay_zelle: settings.pay_zelle ?? null,
    pay_paypal: settings.pay_paypal ?? null,
    pay_other: settings.pay_other ?? null,
  };
}

// Which ways to pay this detailer actually accepts, in the order the emails
// print them — a site's "how to pay" section, from the same six columns
// `_shared/payments.ts` reads.
//
// **A HANDLE IS NEVER TURNED INTO A LINK HERE, and that is the rule rather
// than an omission.** A wrong payment link sends somebody's money to the
// wrong person and is invisible from every screen in this product. The one
// place that decides what may become a link is `_shared/payments.ts`; a site
// prints what it is given.
export function paymentMethods(settings) {
  const s = normalizeSettings(settings);
  const out = [];
  if (s.pay_venmo) out.push({ key: "venmo", label: "Venmo", handle: s.pay_venmo });
  if (s.pay_cashapp) out.push({ key: "cashapp", label: "Cash App", handle: s.pay_cashapp });
  if (s.pay_zelle) out.push({ key: "zelle", label: "Zelle", handle: s.pay_zelle });
  if (s.pay_paypal) out.push({ key: "paypal", label: "PayPal", handle: s.pay_paypal });
  if (s.pay_other) out.push({ key: "other", label: "Also", handle: s.pay_other });
  // Cash is last for the same reason it is last in the email's own list: it is
  // what happens once everything above it has been agreed. It has no handle.
  if (s.pay_cash) out.push({ key: "cash", label: "Cash", handle: null });
  return out;
}

// The FAQ a site should draw, or an empty list. ONE function so the enabled
// flag cannot be forgotten at one of the two call sites a site ends up with
// (the section, and the anchor in its nav).
export function faqFor(settings) {
  const s = normalizeSettings(settings);
  if (!s.faq_enabled) return [];
  return s.faqs.filter((f) => f && String(f.q ?? "").trim() && String(f.a ?? "").trim());
}

export function normalizeProfile(profile) {
  return {
    business: profile?.business ?? null,
    branding: profile?.branding ?? null,
    settings: normalizeSettings(profile?.settings),
    services: profile?.services ?? [],
    serviceGroups: profile?.service_groups ?? [],
    addOns: profile?.add_ons ?? [],
    plans: profile?.plans ?? [],
    hours: profile?.hours ?? [],
    // ROADMAP 3.2(b) — contract §6d. Upcoming only, and the ONE thing a site
    // must not do with them is decide whether a day is bookable:
    // `available-slots` already applies these server-side and is the only
    // thing that knows about the buffer, the per-day cap and the repeat rule.
    // A site SAYS "closed the week of the 4th" so a customer is not left to
    // discover it in the date picker.
    closures: profile?.closures ?? [],
    testimonials: profile?.testimonials ?? [],
    gallery: profile?.gallery ?? [],
  };
}

// ---------------------------------------------------------------------------
// The step sequence.
// ---------------------------------------------------------------------------

// HOW MANY STEPS THERE ARE IS NOT FIXED, and only for the one reason roadmap
// 2.7's W19 forces: a business with no add-ons configured would otherwise get
// an empty step, and "Step 3 of 7" would be a lie for every one of them.
// Nothing else about the flow is conditional. A site is free to draw these as
// one long page instead — the ORDER is the rule, the pagination is not.
export const stepsFor = (addOns) =>
  ["Services", ...((addOns?.length ?? 0) ? ["Extras"] : []), "Vehicle", "Location", "When", "Details", "Review"];

// ---------------------------------------------------------------------------
// The form's starting state.
// ---------------------------------------------------------------------------

// `known` is whatever `recallCustomer()` returned, or null.
//
// THE THREE DEFAULTS ARE THE TENANT'S, NEVER OURS. The first travel zone and
// the first vehicle size are defaults because a detailer's list is in their
// own order and the first entry is the ordinary case; hardcoding "small" was
// safe while every business had our three sizes and is a broken quote the
// moment a detailer names their base size anything else (W9).
export function initialForm(settings, known) {
  const s = normalizeSettings(settings);
  return {
    serviceIds: [],
    addOns: [],
    vehicleSize: s.vehicle_sizes[0]?.key ?? "small",
    vehicleModel: "",
    vehicleCondition: "",
    // If only one mode is offered it is chosen for the customer and the
    // question is never asked.
    serviceType: s.mobile_enabled ? "mobile" : "dropoff",
    customerAddress: "",
    travelZone: s.travel_zones[0]?.key ?? "",
    // W22 — two answers where there was one, because water and power vary
    // independently. False is a real answer here, not a missing one.
    hasWater: false,
    hasPower: false,
    bookingDate: "",
    startTime: "",
    customerName: known?.name ?? "",
    customerPhone: known?.phone ?? "",
    customerEmail: known?.email ?? "",
    customerNotes: "",
    promoCode: "",
  };
}

// ---------------------------------------------------------------------------
// What can be chosen — the group rules. W25 and roadmap 2.8c.
// ---------------------------------------------------------------------------

// Group a flat service list by the detailer's own categories, in the
// detailer's own order, with anything ungrouped last.
//
// THE `group_label` FALLBACK IS NOT BELT-AND-BRACES: a service written before
// the service_groups migration, or by a detailer who has not made categories
// yet, has a label and no id and still has to appear.
export function groupServices(services, serviceGroups) {
  const groups = [];
  const bucket = (key, name, rule, extra) => {
    let g = groups.find((x) => x.key === key);
    if (!g) groups.push((g = { key, name, rule, items: [], exclusive: false, blurb: "", ...extra }));
    return g;
  };
  for (const s of services ?? []) {
    const cat = s.group_id ? (serviceGroups ?? []).find((g) => g.id === s.group_id) : null;
    if (cat) {
      bucket(cat.id, cat.name, cat.max_select ?? null,
        { exclusive: !!cat.is_exclusive, blurb: cat.description || "" }).items.push(s);
    } else {
      bucket(s.group_label || "", s.group_label || "", null, {}).items.push(s);
    }
  }
  const order = new Map((serviceGroups ?? []).map((g, i) => [g.id, i]));
  groups.sort((a, b) => (order.get(a.key) ?? 998) - (order.get(b.key) ?? 999));
  return groups;
}

// Tapping a service on or off, with the category rules applied.
//
// A CONTROL THAT DOES NOTHING WHEN PRESSED READS AS BROKEN, which is why a
// category at its cap SWAPS rather than refusing the tap. Written as a cap
// rather than as a boolean so "up to two" needs no second implementation.
//
// An EXCLUSIVE category is a complete package that supersedes the parts, and
// only the category knows that: picking the package clears everything, and
// picking anything else clears the package. Symmetric on purpose — a tap
// always does what it looks like it does.
//
// THIS IS THE COURTESY COPY OF THE RULE, NEVER THE ENFORCEMENT. The real one
// is in `create-booking`: a restriction that only exists on the page is one a
// stale tab or a crafted request walks straight past.
export function toggleService(serviceIds, id, { services, serviceGroups }) {
  const current = serviceIds ?? [];
  if (current.includes(id)) return current.filter((x) => x !== id);

  const groupOf = (sid) => (services ?? []).find((s) => s.id === sid)?.group_id ?? null;
  const catOf = (sid) => {
    const g = groupOf(sid);
    return g ? (serviceGroups ?? []).find((x) => x.id === g) ?? null : null;
  };
  const gid = groupOf(id);
  const cat = catOf(id);

  if (cat?.is_exclusive) return [id];
  let ids = [...current, id].filter((x) => !catOf(x)?.is_exclusive || x === id);

  const cap = cat?.max_select ?? null;
  if (cap) {
    const siblings = ids.filter((x) => groupOf(x) === gid);
    const over = siblings.length - cap;
    // Oldest out first, so the one just tapped always survives.
    if (over > 0) {
      const drop = new Set(siblings.slice(0, over));
      ids = ids.filter((x) => !drop.has(x));
    }
  }
  return ids;
}

// ROADMAP 2.8c — A SERVICE CAN RULE OUT A WAY OF WORKING. A ceramic coating
// needs a controlled environment and cannot be done in a driveway; the
// reverse exists too. Every chosen service has to allow the mode, so this is
// an AND across the selection — and the service that rules it out is NAMED,
// because "you can't do that" without saying why is what makes a form feel
// broken.
export function modeLimitFor(selectedServices) {
  const list = selectedServices ?? [];
  const blocksMobile = list.find((s) => s.allows_mobile === false);
  if (blocksMobile) return { only: "dropoff", because: blocksMobile.name };
  const blocksDropoff = list.find((s) => s.allows_dropoff === false);
  if (blocksDropoff) return { only: "mobile", because: blocksDropoff.name };
  return null;
}

// Whether the customer is offered the choice at all. `modeLimit` belongs in
// here: a business with both modes on and a service that allows only one is
// NOT a two-choice step, and computing this without it is the bug roadmap 2.5
// found in StepLocation.
export const offersBothModes = (settings, modeLimit) =>
  !!settings?.mobile_enabled && !!settings?.dropoff_enabled && !modeLimit;

// ---------------------------------------------------------------------------
// The vehicle.
// ---------------------------------------------------------------------------

// The extra a size costs across the chosen services — 0 where the detailer
// has configured no adjustment.
export const vehicleSizeExtra = (selectedServices, key) =>
  (selectedServices ?? []).reduce(
    (sum, s) => sum + (Number(s.vehicle_size_adjustments?.[key]?.price) || 0),
    0,
  );

// A business whose services price every size the same is never asked a
// question it has no answer for.
export const vehicleSizesMatter = (sizes, selectedServices) =>
  (sizes ?? []).some((s) => vehicleSizeExtra(selectedServices, s.key) !== 0);

// W27 — how dirty it is. INFORMATION, never arithmetic: the trade prices
// condition after inspection. Words rather than numbers so it reads as a
// description of the car and not as a grade. These four keys are what reaches
// `bookings.vehicle_condition`, so a site may relabel them and may not rename
// them.
export const VEHICLE_CONDITIONS = [
  { key: "light", label: "Light" },
  { key: "moderate", label: "Moderate" },
  { key: "heavy", label: "Heavy" },
  { key: "extreme", label: "Extreme" },
];

// ---------------------------------------------------------------------------
// When — the calendar.
// ---------------------------------------------------------------------------

const pad = (n) => String(n).padStart(2, "0");

// Business-local "YYYY-MM-DD" for right now. The BUSINESS's timezone, never
// the customer's: a customer in another state must not be shown yesterday.
export const businessToday = (timezone) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" })
    .format(new Date());

// The days to ASK available-slots about for a month. Never the past: a range
// starting before today is clamped to today.
export function monthRange(month, today) {
  const [y, m] = month.split("-").map(Number);
  const start = `${month}-01`;
  return {
    start: start < today ? today : start,
    end: `${month}-${pad(new Date(y, m, 0).getDate())}`,
  };
}

// A Sunday-first grid for a month: leading nulls for the blanks, then
// "YYYY-MM-DD" for each day. A site that draws a list instead of a grid can
// ignore this and use the range above.
export function monthGrid(month) {
  const [y, m] = month.split("-").map(Number);
  const firstDow = new Date(y, m - 1, 1).getDay();
  const count = new Date(y, m, 0).getDate();
  const out = Array.from({ length: firstDow }, () => null);
  for (let d = 1; d <= count; d++) out.push(`${month}-${pad(d)}`);
  return out;
}

export function shiftMonth(month, delta) {
  const [y, m] = month.split("-").map(Number);
  const dt = new Date(y, m - 1 + delta, 1);
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}`;
}

// The times on a day that THIS service type can actually have.
//
// available-slots returns every time the business has open, plus the subsets
// that are drop-off-only and mobile-only for that day (W4 — a detailer can
// close either way, for a day or a stretch of days). Offering a time and
// refusing it at submit is the hole this closes. `validateSlot` on the server
// is the gate either way; this is so the page does not OFFER a refusal.
export function slotsForType(day, serviceType) {
  if (!day) return [];
  const blocked = serviceType === "mobile" ? day.dropoff_slots : day.mobile_slots;
  return (day.slots ?? []).filter((t) => !(blocked ?? []).includes(t));
}

// OPEN means the BUSINESS has times that day, not that this customer can have
// them. A day restricted the other way is still worth opening: greyed out it
// says only "closed", while opening it can say which way it is restricted and
// that going back a step fixes it.
export const dayIsOpen = (day) => ((day?.slots) ?? []).length > 0;

// This day cannot take the service type they picked.
export const dayRefusesMode = (day, serviceType) =>
  !!day && ((serviceType === "mobile" && !!day.dropoff_only) || (serviceType !== "mobile" && !!day.mobile_only));

export const monthHasNothing = (days) =>
  Object.values(days ?? {}).every((d) => ((d?.slots) ?? []).length === 0);

// ---------------------------------------------------------------------------
// Step gating — may the customer move on from here?
// ---------------------------------------------------------------------------

// THE COURTEOUS HALF ONLY. Where a resource is REQUIRED this stops the
// customer filling in four more steps before being told no; the half that
// HOLDS is `_shared/slotValidation.ts`, on the server. Same for everything
// else here.
export function canAdvance(stepName, { form, settings, quote, quoting }) {
  const s = normalizeSettings(settings);
  switch (stepName) {
    case "Services":
      return (form.serviceIds?.length ?? 0) > 0 && !!quote && !quoting;
    case "Vehicle":
      return !!quote && !quoting;
    case "Location":
      if (form.serviceType === "mobile") {
        if (!form.customerAddress?.trim()) return false;
        if (s.water_requirement === "required" && !form.hasWater) return false;
        if (s.power_requirement === "required" && !form.hasPower) return false;
      }
      return true;
    case "When":
      return !!form.bookingDate && !!form.startTime;
    case "Details":
      return !!(form.customerName?.trim() && form.customerPhone?.trim() && form.customerEmail?.trim());
    default:
      return true;
  }
}

// ---------------------------------------------------------------------------
// The two calls that carry money. Both payloads are built here so a site
// cannot leave a field out and get a quietly different price.
// ---------------------------------------------------------------------------

// ROADMAP 2.8c WIDENED WHAT A PRICE DEPENDS ON, and this is the visible half:
// the total now depends on WHEN the job is (a weekend or evening rate, a
// short-notice fee), WHERE it is (the travel area) and whether anybody
// travels at all. 2.14 added the plan. So the quote re-runs on all of it —
// `quoteKey` is that dependency list, and a site that memoises on less than
// this will print a stale price.
export function quoteRequest(form, { planId, promoApplied } = {}) {
  return {
    service_ids: form.serviceIds,
    add_ons: form.addOns,
    vehicle_size: form.vehicleSize,
    applied_promo_code: promoApplied || undefined,
    service_type: form.serviceType || undefined,
    travel_zone: form.travelZone || undefined,
    // Undefined until the customer has picked a day. A time-based rule that
    // cannot be evaluated does not apply, so the price starts without it and
    // the surcharge appears with the day it depends on.
    booking_date: form.bookingDate || undefined,
    start_time: form.startTime || undefined,
    plan_id: planId || undefined,
  };
}

export const quoteKey = (form, { planId, promoApplied } = {}) => JSON.stringify([
  form.serviceIds, form.addOns, form.vehicleSize, promoApplied || null,
  form.serviceType, form.travelZone, form.bookingDate, form.startTime, planId || "",
]);

// `plan_id` is an ID AND NOTHING ELSE. The name, the kind and the amount all
// come off the plan row on the server — a site never names its own discount,
// and `create-booking` re-reads the plan, so a stale or borrowed device can
// only ask.
export function bookingRequest(form, { planId, promoApplied } = {}) {
  return {
    customer_name: form.customerName.trim(),
    customer_phone: form.customerPhone.trim(),
    customer_email: form.customerEmail.trim(),
    customer_address: form.customerAddress?.trim() || null,
    service_type: form.serviceType,
    travel_zone: form.travelZone || null,
    vehicle_size: form.vehicleSize,
    vehicle_model: form.vehicleModel?.trim() || null,
    vehicle_condition: form.vehicleCondition || null,
    service_ids: form.serviceIds,
    add_ons: form.addOns,
    booking_date: form.bookingDate,
    start_time: form.startTime,
    // Both the new columns and the old one: the old pair is what every
    // already-deployed function still reads.
    has_water: form.hasWater,
    has_power: form.hasPower,
    has_water_electric: !!form.hasWater && !!form.hasPower,
    customer_notes: form.customerNotes?.trim() || null,
    applied_promo_code: promoApplied || null,
    plan_id: planId || null,
  };
}

// ---------------------------------------------------------------------------
// What this device remembers. Roadmap 2.14 step 3, in the owner's own words:
// "we should definitely log people, log their browsers and with cookies."
//
// The cheapest 90% of what a customer account was really for — most people
// rebook on the phone they booked on — with no password, no lookup endpoint
// and no security surface. A new device simply fills the form in as before.
//
// Wrapped both ways: localStorage THROWS outright in some embedded and
// privacy contexts, and a booking page that cannot render because a
// convenience threw is a far worse defect than a form nobody pre-filled.
// ---------------------------------------------------------------------------

export const REMEMBER_KEY = "bk.customer";

export function recallCustomer(slug, storage) {
  try {
    const store = storage ?? globalThis.localStorage;
    const raw = JSON.parse(store.getItem(REMEMBER_KEY) || "null");
    return raw && raw.slug === slug ? raw : null;
  } catch { return null; }
}

// Call this only once the booking has ACTUALLY landed — a device that
// remembers an abandoned form is remembering somebody who left. Pass the plan
// id the SERVER resolved (`quote.plan_id`), never the one the page asked with,
// so a retired plan is not carried forward.
export function rememberCustomer(slug, form, planId, storage) {
  try {
    const store = storage ?? globalThis.localStorage;
    store.setItem(REMEMBER_KEY, JSON.stringify({
      slug,
      name: form.customerName.trim(),
      email: form.customerEmail.trim(),
      phone: form.customerPhone.trim(),
      planId: planId || null,
    }));
  } catch { /* a device that will not remember is not an error */ }
}
