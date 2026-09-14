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
  if (!res.ok) {
    // **THE STATUS TRAVELS WITH THE ERROR — 2026-09-12.** Without it a caller
    // that wants to say something different for "we have never heard of that
    // code" and "that code is real and you have already used it" has only the
    // server's own English sentence to match on, and a reworded sentence would
    // then silently fall through to the generic branch. A number does not get
    // reworded.
    const err = new Error(data?.error || `Request failed (${res.status})`);
    err.status = res.status;
    // AND SO DOES THE BODY. Several endpoints answer a refusal with a shaped
    // object rather than only a sentence — `address-suggest` sends
    // `{ ok: false, reason, retryable }` — and throwing that away leaves a
    // caller with nothing but the English to match on, which is the same trap
    // the status was added to avoid.
    err.body = data ?? null;
    throw err;
  }
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
    // ROADMAP 8.17 / TRANSLATE-ON-SAVE — THE TENANT'S OWN WORDS IN ANOTHER
    // LANGUAGE. `{ english: spanish }`, which is exactly the shape
    // `localeStore.js`'s `t()` already looks things up in, so a string with no
    // row IS the English fallback: no error path, no "untranslated" state, and
    // nothing to remember when both providers are exhausted.
    //
    // **IT IS A SEPARATE TABLE FROM THE PRODUCT CATALOGUE AND MUST STAY ONE.**
    // Merging them would silently rewrite a detailer's words: a service named
    // "Travel" would pick up the product catalogue's "Traslado". See
    // `docs/handover-translate-lane-b.md` § 6.
    //
    // It lives here rather than in the app because a tenant site drawing its
    // own booking form needs the same answer and must not re-derive the RPC
    // name from a screenshot.
    async translations(slug, lang) {
      const res = await fetch(`${supabaseUrl}/rest/v1/rpc/get_business_translations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          apikey: anonKey,
          Authorization: `Bearer ${anonKey}`,
        },
        body: JSON.stringify({ p_slug: slug, p_lang: lang }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || `Request failed (${res.status})`);
      return data && typeof data === "object" ? data : {};
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
    // ROADMAP 4.2 — A PRINTED LINK, AND WHETHER IT BROUGHT ANYBODY.
    // Records the visit and hands back the campaign, INCLUDING its promo code
    // so the form can apply it without the customer typing anything. That
    // auto-apply is the whole feature: the detailer's own comment on the old
    // site names a golf-course QR code as the real case, and a code somebody
    // has to remember off a sign is a code nobody uses.
    // Best-effort, always: a booking must never depend on an analytics call.
    trackVisit: (slug, payload) => call("track-visit", { business_slug: slug, ...payload }),
    // ROADMAP 6 — THE ADDRESS LOOKUP, WHICH IS THE ONE CALL THAT IS PURELY AN
    // ACCELERATOR. Everything else in this transport is load-bearing; this one
    // failing costs a customer nothing, because the box beside it is an
    // ordinary text input that works with the network off.
    // **`q` AND NOTHING ELSE, AND `website` IS THE TRAP — found by looking,
    // 2026-09-13.** `website` is the HONEYPOT field `_shared/rateLimit.ts`
    // reads: any non-empty value means a bot, and the endpoint answers
    // `ok: true` with an EMPTY LIST, deliberately indistinguishable from a real
    // "no such street" so a script cannot tune against it. Sending the tenant
    // slug in it therefore made every lookup come back with nothing, and the
    // screen said "No matches" over a street that exists. Nothing errored and
    // nothing logged. `business_id` is accepted and ignored; it is not sent
    // either, because a field with no use is a field somebody fills in wrongly.
    addressSuggest: (slug, q) => call("address-suggest", { q }),
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

// **IS THIS TIER'S TEXT OURS OR THE DETAILER'S — asked in ONE place, 2026-09-12.**
//
// The booking page and the tier editor both have to answer it, and they were
// about to answer it twice. A second copy is how the customer's page and the
// detailer's page start disagreeing about whose words they are.
//
// It is a STRING COMPARISON and that is a known limit, written down rather than
// hidden: a detailer who deliberately types "Small" is indistinguishable from
// one who never touched ours, and their word gets translated. Closing that
// needs an `edited` flag stamped on save, which is additive and can follow
// without undoing this. `FOUND.md` has the whole argument.
//
// Pure, no `t()`, no imports — a tenant site calls it to decide whether to run
// its own translation over a label.
export function isPlatformSizeText(size, field) {
  if (!size || !size[field]) return false;
  const def = DEFAULT_VEHICLE_SIZES.find((d) => d.key === size.key);
  return !!def && size[field] === def[field];
}

export function normalizeSettings(raw) {
  const settings = raw ?? {};
  const askWaterElectric = settings.ask_water_electric ?? true;
  return {
    // **NOT `?? true` — ROADMAP 8.4.** These two are the only settings in this
    // function whose absence is an ANSWER rather than a gap. Since the schema
    // stopped defaulting them, `null` means nobody has been asked, and
    // defaulting to true here would have put the assumption back one layer
    // below the migration that removed it — a booking page offering both
    // modes for a business the server refuses every service type for, which
    // is the contract's own worst case: *a site can only offer a slot the
    // server then refuses*, and the customer loses the booking.
    // They stay NULL rather than becoming false, because a bespoke site has
    // to be able to tell "not offered" from "not set up" to say the right
    // thing; `bookable()` below is that question asked once.
    mobile_enabled: settings.mobile_enabled ?? null,
    dropoff_enabled: settings.dropoff_enabled ?? null,
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
    // ROADMAP 8.10 — how many cars one booking may hold. 1 is the answer for
    // every business that has not turned it on, and 1 makes the whole feature
    // invisible: no count control, no extra vehicles, payloads identical to
    // what they were. The SERVER caps it too — this is the courteous half.
    max_vehicles_per_booking: Number(settings.max_vehicles_per_booking) || 1,
  };
}

// ---------------------------------------------------------------------------
// ROADMAP 8.10 — MULTIPLE CARS ON ONE VISIT.
//
// The owner: *"have that in a setting: how many cars can someone book in one
// booking."* Everything below is the rules half; how a form DRAWS the choice
// is the site's, like every other step.
//
// TWO CARS ON TWO DAYS IS NOT THIS. That is two bookings sharing a group —
// one booking is one time range, and the availability engine, the exclusion
// constraint and every screen rest on that.
// ---------------------------------------------------------------------------

export const maxVehicles = (settings) =>
  Math.max(1, Math.min(10, normalizeSettings(settings).max_vehicles_per_booking));

export const vehicleCount = (form) => 1 + ((form?.extraVehicles?.length) ?? 0);

// Growing and shrinking the list, capped by the tenant's own limit. A new car
// starts at the SAME size as the first, which is the ordinary case (a
// household's two cars are usually alike) and is never a price the customer
// did not see — the review step lists every vehicle with its own figure.
export function setVehicleCount(form, wanted, settings) {
  const cap = maxVehicles(settings);
  const n = Math.max(1, Math.min(cap, Number(wanted) || 1));
  const have = form.extraVehicles ?? [];
  const next = have.slice(0, n - 1);
  while (next.length < n - 1) next.push({ size: form.vehicleSize, model: "" });
  return next;
}

// What the two money calls carry. Undefined rather than an empty array when
// there is one car, so a single-vehicle payload is byte-identical to every
// one this product has ever sent.
const extraVehiclePayload = (form) =>
  (form.extraVehicles ?? []).length
    ? form.extraVehicles.map((v) => ({ size: v.size, model: (v.model ?? "").trim() || null }))
    : undefined;

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
    // **A FLAG ABOUT WHO CHOSE THE SIZE, NOT ABOUT THE SIZE.** `suggestVehicleSize`
    // may move this field while the customer is typing their car, and it must
    // stop the moment they touch the control themselves — otherwise the next
    // keystroke overrules a person, which is the one thing a suggestion may
    // never do. It reaches no payload: `toPayload` names its fields.
    vehicleSizeChosen: false,
    vehicleModel: "",
    // ROADMAP 8.10 — the cars AFTER the first, each { size, model } and, when
    // they are on different days, { date, time } as well. Empty is the
    // ordinary booking and the only state a one-car business can reach.
    extraVehicles: [],
    // *"They could set it for two different days."* False is one appointment
    // for the lot, which is the ordinary case and the one that saves setup
    // time; true is one appointment per car, on days the customer picks.
    splitDays: false,
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
    // The honeypot's resting value. Empty is what a person leaves it as.
    website: "",
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

// **CAN THIS BUSINESS BE BOOKED AT ALL — roadmap 8.4, and it is the question
// every tenant site has to ask before it draws a form.**
//
// A detailer who has not answered *where do you work* has neither mode on, and
// the server already refuses on both counts: `slotValidation` turns down every
// service type, and `available-slots` skips every slot. So the engine is safe
// without this — what this is for is SAYING SO. Without it a customer meets a
// calendar with no times in it and concludes the detailer is booked solid,
// which is the worst reading available: it is a lost customer who thinks they
// were too late rather than one who knows to come back.
//
// It is deliberately not `mobile === false && dropoff === false`. A detailer
// who genuinely turned both off is in the same position as one who never
// answered — nothing can be booked either way — and a customer does not care
// which. The DETAILER's screen is where the two are told apart.
// ROADMAP 8.13 — IS THE DETAILER AWAY, AND UNTIL WHEN.
//
// *"A detailer-facing pause that keeps the site up and says when they are
// back."* Null is every business that has never gone away.
//
// **IT IS COMPARED AS TWO BUSINESS-LOCAL DATE STRINGS AND NEVER AS DATES.**
// `businessToday(tz)` already gives `YYYY-MM-DD` in the tenant's own zone and
// `closed_until` is the same shape, so `<` on the strings IS the comparison —
// no offset arithmetic, nothing that can drift the way F-018's three clocks
// did, and the same answer `available-slots` computes server-side.
//
// **STRICTLY LESS THAN: the day they are back is a day they take bookings.**
// A detailer typing "back on the 14th" means the 14th is open.
export function closedUntil(business, timezone) {
  const until = business?.closed_until ? String(business.closed_until).slice(0, 10) : null;
  if (!until) return null;
  return businessToday(timezone) < until ? until : null;
}

export const bookable = (settings) =>
  !!settings?.mobile_enabled || !!settings?.dropoff_enabled;

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

// ---------------------------------------------------------------------------
// WHAT THEY TYPED, MATCHED AGAINST THE DETAILER'S OWN TIERS — Andrew's ask,
// 2026-09-13: *"detailers have custom tiers, one may have three sizes and
// another five, each with their own upcharges."*
// ---------------------------------------------------------------------------
// **IT SUGGESTS AND IT SHOWS WHY. IT NEVER SILENTLY SETS A PRICE.** The screen
// prints the vehicle beside the tier it chose and the customer can change it,
// which is the whole licence for touching a priced field at all.
//
// **AND A WRONG GUESS QUOTES SOMEBODY THE WRONG PRICE, WHICH IS WORSE THAN NOT
// GUESSING — his rule, and it is why everything below fails to null rather
// than to a best effort.** No fuzzy distance, no "closest tier", no scoring: a
// term either appears in the detailer's own words or it does not.
//
// -- WHY THE MATCH IS AGAINST THEIR WORDS AND NOT AGAINST A TIER NUMBER ------
// A tier's `examples` is the detailer telling us in their own language what
// belongs in it — "Coupe, sedan, hatchback", "Truck, large SUV, van". So the
// question "is a Suburban a Large here" is answered by THEIR text, and a
// business with five tiers is answered by the same code as one with three.
// Nothing here assumes three, assumes our keys, or assumes an order.
//
// -- AND THIS REVERSES A NOTE IN `VehicleField.jsx`, ON PURPOSE --------------
// That file said the index must never touch the size choice, because NHTSA
// vPIC tags a Camry as a car in some model years and an MPV in others, so a
// tier DERIVED from it would quote some customers the wrong price. That is
// still true and this does not do it: the table below is a small fixed list of
// body words written HERE, not read out of the index, and what it produces is
// a visible suggestion rather than a derivation.

// The body words a model implies, MOST SPECIFIC FIRST — specificity is the
// whole mechanism. "small suv" has to be tried before "suv", or a RAV4 lands
// in the tier whose examples say "large SUV" simply because that tier also
// contains the letters s-u-v.
//
// **ONLY MODELS WORTH BEING SURE ABOUT ARE IN HERE.** Anything absent produces
// no suggestion, which is the correct outcome and not a gap to fill later.
//
// **AND NO MAKE NAME IS IN HERE, EVER — a make is not a body shape.** Toyota
// makes a Corolla and a Tundra, so a make on its own is not evidence of
// anything and must not reach a price. `genesis` was in the sedan rule until
// 2026-09-13 and Genesis sells three sedans and three SUVs, so typing the
// marque alone quoted the smallest tier. The models stay (`g70`, `gv80`); the
// marque goes, and `Genesis` alone now suggests nothing.
// `tests/booking-core.test.mjs` § 18m checks all 45 makes, so the next
// collision is red the day it is added rather than the day somebody is
// overcharged.
const VEHICLE_BODIES = [
  // A customer who types their own body word is answering the question
  // directly — *"my wife's van"*, *"work truck"*. These run first because it
  // is the one case where nobody is guessing at all.
  [/\bminivans?\b/, ["minivan", "van", "large"]],
  [/\bvans?\b/, ["van", "minivan", "large"]],
  [/\b(pick ?ups?|trucks?)\b/, ["truck", "pickup", "large"]],
  [/\b(suvs?|crossovers?)\b/, ["suv", "crossover", "medium"]],
  [/\bsedans?\b/, ["sedan", "car", "small"]],
  [/\b(coupes?|hatchbacks?|convertibles?)\b/, ["coupe", "hatchback", "car", "small"]],
  [/\bwagons?\b/, ["wagon", "estate", "medium"]],

  // MINIVANS AND PASSENGER VANS.
  [/\b(sienna|odyssey|pacifica|carnival|sedona|quest|voyager|uplander|entourage|routan|freestar|windstar|villager|previa|montana|silhouette|venture|aerostar|grand caravan|caravan|town and country)\b/,
    ["minivan", "van", "large"]],
  // CARGO VANS. Bigger again, and a detailer who separates them says so.
  [/\b(sprinter|promaster|transit|express|savana|metris|econoline|ducato|vandura|e 150|e 250|e 350|e 450|nv200|nv|city express)\b/,
    ["cargo van", "van", "large"]],

  // FULL-SIZE TRUCKS.
  [/\b(f ?150|f ?250|f ?350|f ?450|f ?550|silverado|sierra|tundra|titan|ram ?1500|ram ?2500|ram ?3500|cybertruck|r1t|avalanche|lightning)\b/,
    ["full size truck", "truck", "pickup", "large"]],
  // MID-SIZE TRUCKS. A three-tier business has no word for this and falls
  // through to "truck", which is the right answer there.
  [/\b(tacoma|colorado|canyon|ranger|frontier|ridgeline|maverick|santa cruz|gladiator|dakota|sonoma|sport trac)\b/,
    ["mid size truck", "midsize truck", "small truck", "truck", "pickup", "medium"]],

  // LARGE SUVS — the three-row and body-on-frame ones.
  [/\b(suburban|tahoe|yukon|expedition|escalade|navigator|sequoia|armada|wagoneer|land cruiser|lx|qx56|qx80|gx|durango|traverse|telluride|palisade|pilot|highlander|atlas|ascent|explorer|4runner|pathfinder|xterra|montero|r1s|gv80|gls class|gl class)\b/,
    ["large suv", "full size suv", "3 row suv", "suv", "truck", "large"]],
  // SMALL AND MID SUVS — the crossovers, which is most of what gets typed.
  [/\b(rav4|cr v|crv|cx 3|cx 30|cx 5|cx 50|cx 9|cx 70|cx 90|escape|equinox|trax|trailblazer|blazer|edge|bronco|rogue|kicks|murano|forester|crosstrek|outback|tucson|santa fe|kona|venue|sportage|seltos|sorento|soul|niro|tiguan|taos|touareg|compass|cherokee|renegade|patriot|liberty|wrangler|hr v|passport|element|terrain|acadia|envision|encore|enclave|x1|x3|x5|q3|q5|q7|glc class|gla class|glb class|gle class|nx|rx|ux|tx|qx50|qx55|qx60|rdx|mdx|zdx|xt4|xt5|xt6|macan|cayenne|evoque|discovery|range rover|velar|defender|f pace|e pace|xc40|xc60|xc90|ex30|ex40|ex90|model y|model x|ariya|mach e|ioniq 5|ioniq 9|ev6|ev9|id.4|bz4x|solterra|outlander|eclipse cross|rvr|endeavor|vue|rendezvous|journey|nitro|flex|freestyle|venza|corolla cross|c hr|creta|vitara|tribute|mariner)\b/,
    ["small suv", "compact suv", "mid suv", "midsize suv", "crossover", "suv", "medium"]],

  // WAGONS AND HATCHBACKS.
  [/\b(golf|gti|sportwagen|alltrack|v60|v70|v90|allroad|regal tourx|impreza|mazda3|mazda2|fit|yaris|rio|versa note|leaf|bolt ev|bolt euv|spark|mirage|prius c|prius v|matrix|vibe|hhr|pt cruiser|cube|xb|xd|500l|i3|veloster|elantra gt)\b/,
    ["hatchback", "wagon", "compact", "car", "small"]],

  // COUPES, ROADSTERS AND ANYTHING TWO-DOOR.
  [/\b(mustang|camaro|challenger|corvette|brz|gr86|86|fr s|miata|mx 5|supra|z4|tt|boxster|cayman|911|350z|370z|nissan z|rx 7|rx 8|s2000|solstice|sky|prowler|viper|celica|integra|type r|civic si|gt r|nsx|f type|m2|m4|amg gt|slk class|sl class|slc class|124 spider|eos|cabrio|beetle)\b/,
    ["coupe", "sports car", "2 door", "car", "small"]],

  // SEDANS — the default shape of a car, and deliberately last of the model
  // rules so anything above it wins.
  [/\b(camry|corolla|accord|civic|altima|sentra|maxima|elantra|sonata|accent|azera|optima|k5|k4|forte|cadenza|stinger|mazda6|legacy|malibu|impala|cruze|sonic|cobalt|fusion|focus|taurus|fiesta|charger|300|200|dart|avenger|avalon|crown|passat|arteon|cc|a3|a4|a6|a8|328i|330i|335i|340i|528i|530i|540i|c class|e class|s class|cla class|a class|is|es|gs|ls|ct|tlx|tsx|tl|ilx|rl|q50|q60|q70|g35|g37|model 3|model s|air|polestar 2|ioniq 6|k900|g70|g80|g90|xe|xf|xj|s60|s80|s90|s40|jetta|versa|lancer|galant|eclipse|sebring|stratus|neon|grand marquis|crown victoria|town car|continental|mkz|milan|sable|regal|lacrosse|lesabre|park avenue|lucerne|century|bonneville|grand prix|grand am|g6|g8|aura|ion|alero|intrigue|aurora|catera|cts|ct4|ct5|ct6|ats|sts|dts|deville|seville|xts)\b/,
    ["sedan", "saloon", "car", "small"]],
];

// Lower-cased, hyphens opened out, the model year dropped, and punctuation
// turned into spaces so `\b` behaves the same on "F-150" and "f 150". The same
// normalisation runs over the DETAILER's tier text, so "Mid-size SUV" and "mid
// size SUV" are one thing on both sides of the comparison.
function normalizeVehicleText(text, keepCase = false) {
  const s = String(text ?? "");
  return (keepCase ? s : s.toLowerCase())
    .replace(VEHICLE_YEAR, " ")
    .replace(keepCase ? /[^a-zA-Z0-9.]+/g : /[^a-z0-9.]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** The plain body words a typed vehicle implies, most specific first, and the
 *  piece of their text that produced them.
 *
 *  **THE MATCHED PIECE IS NOT DECORATION — it is the sentence the screen
 *  prints.** Andrew asked for *"Suburban, that's your Large"*, and the only
 *  honest way to write that line is to quote the word that was actually
 *  recognised. Echoing the whole field back ("2019 Chevrolet Suburban · set to
 *  Large") restates a box one inch above it, which is his own standing rule
 *  against copy that explains what the control already said.
 *
 *  `null` when nothing in the table is sure about it — which is most strings. */
export function vehicleBodyWords(text) {
  const s = normalizeVehicleText(text);
  if (!s) return null;
  // **THEIR CAPITALS, NOT OURS.** Title-casing "suburban" back up is the same
  // mistake `.advmeter.cap` made with a detailer's expense category: a
  // display-layer transform cannot tell whose words it is transforming, and it
  // is wrong in Spanish besides. So the match is FOUND on the lower-cased
  // string and SLICED out of a copy that kept the customer's own capitals —
  // both built by the same transform, so the indexes line up.
  const shown = normalizeVehicleText(text, true);
  for (const [re, words] of VEHICLE_BODIES) {
    const m = s.match(re);
    if (m) return { words, matched: shown.slice(m.index, m.index + m[0].length) || m[0] };
  }
  return null;
}

/** The tier a typed vehicle belongs in, or null.
 *
 *  `{ key, matched }` — the tier, and the word in their text that chose it, for
 *  the sentence the screen prints.
 *
 *  Null is the ordinary answer and it is never an error: an unknown model, a
 *  tier list with no descriptions, and a word two tiers both claim all produce
 *  it, and the customer then chooses exactly as they do today. */
export function suggestVehicleSize(text, sizes) {
  const hit = vehicleBodyWords(text);
  if (!hit || !(sizes ?? []).length) return null;
  const { words, matched } = hit;

  // THEIR WORDS, NORMALISED THE SAME WAY OURS ARE. The label is included
  // because a five-tier detailer often puts the whole answer in it ("Large
  // SUV / truck") and leaves the examples blank.
  const tiers = sizes.map((s) => ({
    key: s.key,
    text: normalizeVehicleText(`${s.label ?? ""} ${s.examples ?? ""}`),
  }));

  for (const word of words) {
    // A word inside a longer phrase still counts — "suv" is in "small suv" —
    // which is exactly what makes the specific-first order do the work. The
    // boundary is what stops "car" matching "cargo" and "van" matching
    // "vanity"; the optional s is there because detailers write plurals.
    const re = new RegExp(`\\b${word.replace(/\./g, "\\.")}s?\\b`);
    const hits = tiers.filter((tier) => re.test(tier.text));
    // **TWO TIERS CLAIMING THE SAME WORD IS THE VAGUE CASE HE NAMED, AND IT
    // STOPS EVERYTHING.** Falling through to a less specific word would only
    // ever find more tiers, and picking the first of two is a coin toss with
    // somebody's price on it.
    if (hits.length > 1) return null;
    if (hits.length === 1) return { key: hits[0].key, matched };
  }
  return null;
}


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
// What are you bringing? — matching free text against real cars.
//
// **THE FIELD IS OPTIONAL FREE TEXT AND IT STAYS THAT WAY.** Everything below
// only ever OFFERS. Nothing here can reject an answer, correct one, or block
// the step: *"if nothing matches, keep exactly what they typed and let them
// continue"* — a picker that refuses an answer is worse than the text box it
// replaced, because the customer who drives something we have never heard of
// is the one who most needs to tell us about it.
//
// **AND IT MUST NEVER TOUCH THE PRICE TIER.** The index is built from NHTSA
// vPIC, which tags a Camry as `car` in some model years and `mpv` in others,
// and a Forester likewise — so a size derived from it would quote some
// customers the wrong number. The tier is the detailer's own list and the
// customer's own answer to the question above this field. `scripts/build-
// vehicle-index.mjs` throws vPIC's type away after using it to filter out
// motorcycles.
//
// THE INDEX IS PASSED IN, never imported: this module may not import anything
// (see the header), and a tenant site that wants its own list — a fleet
// detailer with forty numbered vans — passes that instead.
// ---------------------------------------------------------------------------

// Everything that is not a letter or a digit goes, which is what makes
// "F-150", "F150" and "f 150" one string. It is also why a make's own spacing
// never has to be guessed at: "Land Rover" and "landrover" squash the same.
const squashVehicle = (s) => String(s ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "");

// Levenshtein, bailing out the moment the lengths cannot possibly be within
// `max`. Two typos is the tolerance Andrew asked for, and it is the reason
// this is a real distance and not a "same first three letters" heuristic:
// "toyot" is a missing letter and "teh" is a transposition, and only a
// distance sees both. Called at most a few thousand times, on strings under
// twenty characters, and ONLY when the exact passes found nothing.
function editDistance(a, b, max) {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    let best = i;
    for (let j = 1; j <= b.length; j++) {
      row[j] = Math.min(
        prev[j] + 1,
        row[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
      if (row[j] < best) best = row[j];
    }
    if (best > max) return max + 1;
    prev = row;
  }
  return prev[b.length];
}

// A four-digit run that could be a model year, anywhere in the string. It is
// pulled out BEFORE matching and put back at the FRONT of every suggestion, so
// "civic 2019" and "2019 civic" both offer "2019 Honda Civic" — which also
// quietly teaches the order without an error message.
//
// The window is 1950 to 2049 rather than "up to this year". A customer booking
// in December for a car that is already badged next year is right and we are
// wrong, and a hard ceiling on the current year would argue with them about
// it. The lower bound exists only so that a phone number or a price typed into
// this field is not read as a year.
const VEHICLE_YEAR = /\b(19[5-9]\d|20[0-4]\d)\b/;

export function matchVehicle(query, index, limit = 5) {
  const raw = String(query ?? "").trim();
  if (!raw || !index) return [];

  const year = (raw.match(VEHICLE_YEAR) ?? [""])[0];
  const rest = squashVehicle(raw.replace(VEHICLE_YEAR, " "));
  // A year on its own is not something to guess a car from. Two letters is
  // where a suggestion starts being about what they typed rather than about
  // the alphabet — "a" would offer Acura's whole catalogue.
  if (rest.length < 2) return [];

  const makes = Object.keys(index);
  const out = [];
  const full = () => out.length >= limit;
  const push = (make, model) => {
    const s = [year, make, model].filter(Boolean).join(" ");
    if (!out.includes(s)) out.push(s);
  };
  const all = (make) => { for (const m of index[make]) { if (full()) return; push(make, m); } };

  // The passes are ordered by how sure they are, and each one runs to
  // completion before the next starts. That ordering IS the ranking: there is
  // no score, because a score would need tuning and a customer cannot see it.

  // 1. A whole make, then whatever is left of it. "toyota" offers Toyota's
  //    list; "toyotacam" offers the Camry. This is the only pass that can
  //    split the string, and it splits it at a make it actually knows.
  for (const make of makes) {
    if (full()) break;
    const m = squashVehicle(make);
    if (!rest.startsWith(m)) continue;
    const tail = rest.slice(m.length);
    if (!tail) { all(make); continue; }
    for (const model of index[make]) {
      if (full()) break;
      if (squashVehicle(model).startsWith(tail)) push(make, model);
    }
  }

  // 2. Half a make. "toyo", "merc", "lex".
  for (const make of makes) {
    if (full()) break;
    if (squashVehicle(make).startsWith(rest)) all(make);
  }

  // 3. A model with no make at all, which is the case Andrew named: *"they
  //    just put Outback"*. Also the whole reason "f150" works — the model
  //    squashes to the same string the customer typed.
  for (const make of makes) {
    for (const model of index[make]) {
      if (full()) break;
      if (squashVehicle(model).startsWith(rest)) push(make, model);
    }
    if (full()) break;
  }

  // 4. A model remembered from the middle. "runner" finds the 4Runner,
  //    "sprinter" the Sprinter, "type r" the Civic Type R.
  for (const make of makes) {
    for (const model of index[make]) {
      if (full()) break;
      if (squashVehicle(model).includes(rest)) push(make, model);
    }
    if (full()) break;
  }

  // 5. TWO TYPOS, and only once every exact pass has come back empty —
  //    otherwise "civic" would drag "Civic Type R"'s neighbours in ahead of
  //    the car somebody actually typed.
  //
  //    Three comparisons per car, which is what lets one pass cover a typo in
  //    either half: "toyot" is two from "toyota", and "toyot camry" squashes
  //    to "toyotcamry" which is one from "toyotacamry". Nothing here tries to
  //    find WHERE the typo was.
  //
  //    **AND THE HITS ARE ORDERED BY HOW CLOSE THEY ARE, WHICH THE FOUR PASSES
  //    ABOVE GET FOR FREE AND THIS ONE DOES NOT.** Every pass above is exact,
  //    so its own order IS its ranking; this pass holds one-typo and two-typo
  //    hits side by side, and walking the makes alphabetically offered the
  //    worse of them first. `esclade` is one letter from a Cadillac Escalade
  //    and two from a Buick Enclave, and Buick comes first in the alphabet —
  //    so the row a customer taps was the wrong SIZE of car. Measured
  //    2026-09-13: 371 of 1,336 one-letter typos offered a worse match first
  //    and 156 of those crossed a price tier.
  //
  //    So every candidate is collected with its distance and sorted. A closer
  //    car wins; at equal distance a real MODEL wins over a make's whole
  //    catalogue, because "the car you meant, misspelled" beats "everything
  //    this marque sells"; and past that the sort is stable, so the make order
  //    still decides and the same text always offers the same rows.
  if (out.length === 0) {
    const near = [];
    for (const make of makes) {
      const mk = squashVehicle(make);
      const dm = editDistance(rest, mk, 2);
      if (dm <= 2) near.push({ d: dm, make, model: null });
      for (const model of index[make]) {
        const d = Math.min(
          editDistance(rest, squashVehicle(model), 2),
          editDistance(rest, mk + squashVehicle(model), 2),
        );
        if (d <= 2) near.push({ d, make, model });
      }
    }
    // No `full()` bail while measuring: the closest car may be the last one
    // looked at, and stopping at five ALPHABETICALLY is the defect above. It
    // costs one bail-fast distance per model over an index of ~1,300, and only
    // when all four exact passes came back empty.
    near.sort((a, b) => a.d - b.d || (a.model === null) - (b.model === null));
    for (const c of near) {
      if (full()) break;
      if (c.model === null) all(c.make); else push(c.make, c.model);
    }
  }

  // The thing they have already got is not a suggestion. Without this the row
  // of offers stays on screen after one is taken, and the customer is invited
  // to press the answer they are already looking at.
  return out.filter((s) => squashVehicle(s) !== squashVehicle(raw));
}

// ---------------------------------------------------------------------------
// Where — looking the address up.
//
// **IT IS A BUTTON THE CUSTOMER PRESSES ONCE, NOT SUGGESTIONS AS THEY TYPE.**
// Andrew, 2026-09-13, and it is closed: the round trip measures 2 to 3 seconds
// warm and over six on an ambiguous street, against the ~300ms typing
// suggestions need, and the only way to get fast is putting our provider key
// in the browser on a public page, which we are not doing. That second half is
// a rule about where the key lives, so it holds however fast anything gets.
// `docs/address-autocomplete.md` carries the measurement.
//
// **AND THE FIELD IS NEVER A GATE.** No answer, an empty answer, a failed
// answer, a throttled answer, or a customer who never presses the button at
// all: in every one of those the box keeps exactly what they typed and
// Continue stays enabled. `blockers()` above asks only whether the address box
// has anything in it, and it must keep asking only that. A detailer's customer
// knows their own gate code, their unit number, and the fact that their street
// is not in anybody's database.
// ---------------------------------------------------------------------------

// The server refuses a shorter query for free. A request never made is cheaper
// still, so the button is simply not pressable until there is something worth
// asking about.
export const ADDRESS_MIN = 4;
export const addressQuery = (v) => String(v ?? "").trim();
export const canLookUpAddress = (v) => addressQuery(v).length >= ADDRESS_MIN;

// `ok: true` WITH AN EMPTY ARRAY IS A REAL ANSWER — the provider replied and
// knows no such place. A page that cannot tell "no such street" from "we could
// not ask" shows the customer the wrong sentence, which is the live defect
// `available-slots` already cost this product once.
export function readAddressAnswer(answer) {
  const rows = (Array.isArray(answer?.suggestions) ? answer.suggestions : [])
    .filter((r) => r && typeof r.label === "string" && r.label.trim())
    .slice(0, 5);
  return {
    rows,
    // No rows means no map data on the screen, so there is nothing to credit
    // and a footer line over an empty box is noise. The endpoint's own checks
    // take the same view: it sends no attribution beside a failure.
    attribution: rows.length ? (answer?.attribution ?? null) : null,
    note: rows.length ? null : "none",
  };
}

// **THE STATUS DECIDES, NEVER THE WORDS.** `reason` is for logs and for
// people; matching on it would be CLAUDE.md trap (k), where a check asserts
// how something is spelled rather than what it does.
//
// 429 is the ONLY failure the customer can do anything about, and it clears on
// its own, so it is the only one that earns a sentence. Everything else is
// ours: a missing secret and a provider outage are not a customer's problem
// and must never be dressed up as something for them to fix. A network failure
// arrives with no status at all and is silent for the same reason.
export function addressFault(err) {
  return err?.status === 429 ? "busy" : null;
}

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
// Does this look like an email address at all? Exported because the Details
// step wants to say WHICH field is wrong, and a site built on something else
// needs the same test rather than its own.
//
// The crudest possible check on purpose: something, an @, something, a dot,
// something, and no spaces. Every stricter rule anybody writes rejects a real
// address eventually; this one only refuses what cannot work.
export const looksLikeEmail = (v) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(v ?? "").trim());

// **AND WHICH WAY IT IS WRONG, BECAUSE ONE SENTENCE FOR THREE FAULTS SENDS
// PEOPLE TO THE WRONG PLACE — 2026-09-12.** The step said *"That address is
// missing an @"* for every refusal, so `andrew@gmail` and `andrew@@gmail.com`
// were both told to add a symbol already on the screen, on the last step
// before booking. **Correct rejection, wrong reason — and a wrong reason is
// worse than none, because it is actionable in the wrong direction.**
//
// Exported beside the test itself so a tenant's own form gets the naming and
// not only the refusal: the wording is the page's, the DIAGNOSIS is a rule.
// Order matters — count the `@` first, because "two @ symbols" is true of a
// string that also has no dot after the last one.
export function emailFault(v) {
  const t = String(v ?? "").trim();
  if (!t) return null;                                   // nothing typed is not a fault
  if (looksLikeEmail(t)) return null;
  const at = (t.match(/@/g) ?? []).length;
  if (at === 0) return "missing-at";
  if (at > 1) return "two-ats";
  const after = t.slice(t.lastIndexOf("@") + 1);
  if (!after.includes(".") || /\.$/.test(t)) return "missing-dot";
  return "unusable";                                     // spaces, or an empty side
}

// WHY A STEP WILL NOT LET YOU PAST, as a list of field codes — 2026-09-12.
//
// **A DISABLED BUTTON THAT SAYS NOTHING IS THE LIKELIEST THING IN THIS FLOW TO
// COST A REAL BOOKING.** A cold review found it on steps 4 and 6: Continue
// greys out and nothing on the screen says what is missing. Step 1 appeared to
// do it correctly — it shows "Choose a service to start" — but that is not a
// step doing better, it is the only step that CAN: the line lives in the
// footer's price slot (`BookingPage.jsx`, `quote ? … : …`), so the moment a
// quote exists the slot shows the total and every later step's refusal is
// silent.
//
// **AND THE FIX IS NOT A TOOLTIP — Cowork's ruling.** A disabled control that
// explains itself only on hover is no use on a phone, which is where this flow
// is actually used. The reason has to be visible without any interaction, next
// to the thing that is missing.
//
// **THE DIAGNOSIS IS THE CORE'S AND THE WORDING IS THE PAGE'S**, which is the
// same split `emailFault` already uses: a tenant's own form gets the rules for
// free and writes its own sentences. Codes, never sentences — this file has no
// `t()` and never will.
export function blockers(stepName, { form, settings, quote, quoting }) {
  const s = normalizeSettings(settings);
  const out = [];
  switch (stepName) {
    case "Services":
      if (!(form.serviceIds?.length ?? 0)) out.push("no-service");
      else if (quoting) out.push("pricing");
      else if (!quote) out.push("no-quote");
      break;
    case "Vehicle":
      if (quoting) out.push("pricing");
      else if (!quote) out.push("no-quote");
      break;
    case "Location":
      if (form.serviceType === "mobile") {
        if (!form.customerAddress?.trim()) out.push("no-address");
        if (s.water_requirement === "required" && !form.hasWater) out.push("no-water");
        if (s.power_requirement === "required" && !form.hasPower) out.push("no-power");
      }
      break;
    case "When":
      if (!form.bookingDate) out.push("no-date");
      else if (!form.startTime) out.push("no-time");
      else if (form.splitDays && (form.extraVehicles ?? []).length
        && !form.extraVehicles.every((v) => !!v.date && !!v.time)) out.push("no-extra-slot");
      break;
    case "Details":
      if (!form.customerName?.trim()) out.push("no-name");
      if (!form.customerPhone?.trim()) out.push("no-phone");
      if (!looksLikeEmail(form.customerEmail)) {
        out.push(form.customerEmail?.trim() ? "bad-email" : "no-email");
      }
      break;
    default:
      break;
  }
  return out;
}

// **ONE SOURCE OF TRUTH.** `canAdvance` used to carry the rules itself; two
// functions answering the same question is how the button and the explanation
// drift apart, and the drift is invisible because the button still works.
export function canAdvance(stepName, ctx) {
  return blockers(stepName, ctx).length === 0;
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
    extra_vehicles: extraVehiclePayload(form),
    applied_promo_code: promoApplied || undefined,
    service_type: form.serviceType || undefined,
    travel_zone: form.travelZone || undefined,
    // Undefined until the customer has picked a day. A time-based rule that
    // cannot be evaluated does not apply, so the price starts without it and
    // the surcharge appears with the day it depends on.
    booking_date: form.bookingDate || undefined,
    start_time: form.startTime || undefined,
    // THE ADDRESS CHANGES NO PRICE — the travel FEE is decided by
    // `travel_zone` above and always was. This is here for the weather line on
    // the confirm step, which needs a PLACE as well as an hour, and it is sent
    // on the same call rather than on a second one because the quote already
    // re-runs on every fact the confirm step shows.
    customer_address: form.customerAddress || undefined,
    plan_id: planId || undefined,
    // ROADMAP 8.10. On a split booking the figure on the bar is the SUM of
    // the separate bookings that will be made, so the server has to be told
    // which shape it is pricing — travel is charged per trip and a promo is
    // spent per booking, and both answers change with this one flag.
    split_days: form.splitDays ? true : undefined,
  };
}

export const quoteKey = (form, { planId, promoApplied } = {}) => JSON.stringify([
  form.serviceIds, form.addOns, form.vehicleSize, promoApplied || null,
  form.serviceType, form.travelZone, form.bookingDate, form.startTime, planId || "",
  // THE ADDRESS, BUT ONLY ONCE A DAY HAS BEEN PICKED. It changes no price —
  // the travel FEE is `travelZone` two fields back — and it is here solely so
  // that going BACK to correct the address updates the weather line on the
  // confirm step. The guard is what stops that being one quote per KEYSTROKE:
  // the address field updates on every character, and a customer only reaches
  // a chosen day after they have finished typing it.
  form.bookingDate ? (form.customerAddress || "") : "",
  // ROADMAP 8.10. A second car changes the price AND the duration, so leaving
  // it out of this list is a stale price on the bar and a stale length handed
  // to `available-slots` — the customer is offered a slot too short for the
  // job and the server refuses the booking at the last step. Only the SIZES
  // matter to a quote; a car's own day is what makes the split price differ,
  // and that is the flag beside them.
  (form.extraVehicles ?? []).map((v) => v.size),
  !!form.splitDays,
]);

// `plan_id` is an ID AND NOTHING ELSE. The name, the kind and the amount all
// come off the plan row on the server — a site never names its own discount,
// and `create-booking` re-reads the plan, so a stale or borrowed device can
// only ask.
export function bookingRequest(form, { planId, promoApplied, campaignSlug, visitorId, lang } = {}) {
  return {
    customer_name: form.customerName.trim(),
    customer_phone: form.customerPhone.trim(),
    customer_email: form.customerEmail.trim(),
    customer_address: form.customerAddress?.trim() || null,
    service_type: form.serviceType,
    travel_zone: form.travelZone || null,
    vehicle_size: form.vehicleSize,
    vehicle_model: form.vehicleModel?.trim() || null,
    extra_vehicles: extraVehiclePayload(form) ?? null,
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
    // ROADMAP 4.2 — which printed link this came from. A SLUG, never an id:
    // `create-booking` resolves it against this business's own campaigns, so
    // a crafted value attributes to nothing rather than to somebody else's.
    campaign_slug: campaignSlug || null,
    visitor_id: visitorId || null,
    // ROADMAP 8.17 STAGE 2A — THE LANGUAGE THIS FORM WAS FILLED IN IN, so the
    // confirmation, the reminder, the receipt and any reschedule notice reach
    // this person in it. **AN OPTION RATHER THAN A READ**, because this module
    // may not import anything at all — a tenant's own site drops it in beside
    // whatever it uses for language, and `getLocale()` is ours. Absent is
    // English, and the server narrows it anyway.
    lang: lang || null,
    // ROADMAP 2.21 — THE HONEYPOT, CARRIED RATHER THAN INVENTED HERE. The
    // form renders a field a person cannot see and never fills; a bot that
    // completes every input it finds completes this one, and
    // `create-booking` drops the booking without saying so.
    //
    // IT IS IN THE CORE because a tenant site that builds its own form gets
    // it for free by using this payload — and a site that leaves the field
    // out simply sends an empty string, which is the passing value. **A
    // spam filter a bespoke form can forget is a spam filter one tenant does
    // not have.**
    website: form.website || "",
  };
}

// ROADMAP 8.10 — WHAT A FORM ACTUALLY POSTS, WHICH IS ONE CALL OR SEVERAL.
//
// The customer fills in one form; underneath, cars on different days are
// separate appointments, because one booking is one time range. This is the
// rule for turning the one into the other, and it is in the core rather than
// in `BookingPage` for the usual reason: a tenant site that re-derives it
// from a screenshot will get the grouping or the per-car date wrong and
// nothing will report it.
//
// POST THEM IN ORDER. The first is an ordinary booking; every one after it
// goes through `groupedWith(payload, firstBooking.id)`, which is what makes
// the set one thing. **A failure part way through is not corruption** — each
// call is a complete booking of its own — so a caller reports what was booked
// and what was not, and never pretends to roll anything back.
export function bookingRequests(form, opts = {}) {
  const base = bookingRequest(form, opts);
  const extras = form.extraVehicles ?? [];
  if (!form.splitDays || !extras.length) return [base];
  // On a split booking NO call carries extra vehicles: each is one car on one
  // day. Leaving them on would price the first booking for the whole carload
  // and then book the rest again.
  const first = { ...base, extra_vehicles: null };
  return [
    first,
    ...extras.map((v) => ({
      ...first,
      vehicle_size: v.size,
      vehicle_model: (v.model ?? "").trim() || null,
      booking_date: v.date,
      start_time: v.time,
    })),
  ];
}

// The id of the booking this one belongs with. The SERVER decides whether to
// honour it — it checks the sibling is this business's and the same person's
// — so a site can only ask.
export const groupedWith = (payload, firstBookingId) =>
  ({ ...payload, group_with: firstBookingId || null });

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
export const VISITOR_KEY = "bk.visitor";
export const CAMPAIGN_KEY = "bk.campaign";

// ROADMAP 4.2 — WHICH PRINTED LINK BROUGHT THIS PERSON.
//
// A stable id for THIS BROWSER, so a visit and the booking that follows it a
// week later are one story rather than two. It is not an identity: nothing is
// looked up by it, it is never sent to a third party, and clearing site data
// is a complete opt-out. It exists so "forty scans, three bookings" can be
// counted at all.
export function visitorIdFor(storage) {
  try {
    const store = storage ?? globalThis.localStorage;
    let id = store.getItem(VISITOR_KEY);
    if (!id) {
      id = (globalThis.crypto?.randomUUID?.() ?? `v${Date.now()}${Math.random().toString(36).slice(2)}`);
      store.setItem(VISITOR_KEY, id);
    }
    return id;
  } catch {
    // A private window still gets a visit recorded — it simply cannot be
    // joined to the booking. A per-session id beats no id: the SCAN is what
    // the detailer printed and paid for.
    return `t${Date.now()}${Math.random().toString(36).slice(2)}`;
  }
}

// The campaign this visit belongs to. The URL wins — they just scanned it —
// and the remembered one is what makes a booking two days later still count.
//
// `?c=` rather than a path. The old site used a bare `/{slug}`, which needed
// a list of reserved words (`admin`, `booking`, `reset-password`…) and grew a
// new way to break every time a route was added. A query parameter cannot
// collide with anything.
export function campaignFor(search, storage) {
  const fromUrl = new URLSearchParams(search || "").get("c");
  const slug = String(fromUrl || "").trim().toLowerCase();
  try {
    const store = storage ?? globalThis.localStorage;
    if (slug) {
      store.setItem(CAMPAIGN_KEY, slug);
      return slug;
    }
    return store.getItem(CAMPAIGN_KEY) || "";
  } catch {
    return slug;
  }
}

export function recallCustomer(slug, storage) {
  try {
    const store = storage ?? globalThis.localStorage;
    const raw = JSON.parse(store.getItem(REMEMBER_KEY) || "null");
    return raw && raw.slug === slug ? raw : null;
  } catch { return null; }
}

// Call this only once the booking has ACTUALLY landed — a device that
// remembers an abandoned form is remembering somebody who left.
//
// **THE PLAN IS NOT REMEMBERED, AND IT USED TO BE — found by a review of the
// live product, 2026-09-11, and it was the worst thing in that report.**
//
// This wrote `planId` into `bk.customer`, and `BookingPage.jsx` read it back
// as `params.get("plan") || known?.planId`. So pressing **Choose this** on the
// public plans page once put a plan id in the browser's own storage, and from
// then on EVERY booking from that browser was priced at the plan rate — on a
// clean `/book/:slug` with no plan in the address at all. Proved by deleting
// that one key and watching a $65 service go back to $65.
//
// Nobody had to mean any harm. A customer who opens a plan out of curiosity,
// backs out, and books an ordinary wash a month later is silently discounted
// for as long as that browser lasts.
//
// **THE SERVER WAS NOT FOOLED, and that is worth writing down so nobody
// "fixes" it twice.** `create-booking` sets `planSignup` when no active
// `plan_members` row exists and forces the booking to `pending` whatever the
// business's booking mode is, so it lands on the request rail for the detailer
// to accept. The money was never taken behind their back. What was wrong is
// upstream of that: the customer was shown, and the detailer was asked to
// approve, a price keyed off a value in somebody's browser.
//
// A PLAN NOW APPLIES TO THE BOOKING IT WAS CHOSEN FOR AND NO OTHER. The
// entitlement belongs on the server — an active `plan_members` row — and the
// page already has the right door for a real member: *"ALREADY ON A PLAN?
// We'll email your plan link rather than showing it here."*
//
// The other three fields stay. A name, an email and a phone number are this
// person's own details typed into this form; a plan id is a price.
export function rememberCustomer(slug, form, planId, storage) {
  try {
    const store = storage ?? globalThis.localStorage;
    store.setItem(REMEMBER_KEY, JSON.stringify({
      slug,
      name: form.customerName.trim(),
      email: form.customerEmail.trim(),
      phone: form.customerPhone.trim(),
    }));
  } catch { /* a device that will not remember is not an error */ }
}
