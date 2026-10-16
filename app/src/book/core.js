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

// `bodyTypes` gives a brand-new business (the platform's own three tiers,
// untouched) a working checklist from the first second — every one of the
// fourteen accounted for, so `suggestVehicleSize` already has something to
// match against before a detailer has opened the settings screen once.
export const DEFAULT_VEHICLE_SIZES = [
  { key: "small", label: "Small", examples: "Coupe, sedan, hatchback",
    bodyTypes: ["coupe", "sedan", "hatchback", "convertible"] },
  { key: "medium", label: "Medium", examples: "Small SUV, crossover, wagon",
    bodyTypes: ["wagon", "small_suv", "mid_suv"] },
  { key: "large", label: "Large", examples: "Truck, large SUV, van",
    bodyTypes: ["large_suv", "pickup_standard", "pickup_crew", "minivan", "cargo_van", "sports_exotic", "oversized"] },
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
  // ROADMAP 2.11 — the review step tells the customer how long they have to
  // change their mind, and the number has to be this business's own.
  // **NULL RATHER THAN A FALLBACK, and that is the same rule as the two
  // above:** the window is what `cancel-booking` and `reschedule-booking`
  // enforce, so guessing it is a promise the server may refuse. A settings
  // row we cannot read drops the sentence instead of inventing one.
  const cancelWindow = Number(settings.cancellation_window_hours);
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
    cancellation_window_hours:
      settings.cancellation_window_hours == null || !Number.isFinite(cancelWindow)
        ? null
        : cancelWindow,
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
    // An estimate is fine — it is for the detailer to judge condition against,
    // never wired to price. Empty is a real answer here too: some customers
    // will not know it and the step must not stall them hunting for it.
    vehicleYear: "",
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
    // ROADMAP 2.8 — HOW THE ADDRESS WAS ARRIVED AT, which until now nothing
    // recorded. `null` until the customer touches the box: the two things
    // that can set it are typing ("typed") and taking a suggestion
    // ("picked"), and a drop-off booking never has either. A screen that
    // finds `null` prints NOTHING — claiming an address was checked when
    // nobody checked is the same lie as this item, pointed the other way.
    addressSource: null,
    travelZone: s.travel_zones[0]?.key ?? "",
    // W22 — two answers where there was one, because water and power vary
    // independently. False is a real answer here, not a missing one.
    hasWater: false,
    hasPower: false,
    bookingDate: "",
    startTime: "",
    customerName: known?.name ?? "",
    customerPhone: known?.phone ?? "",
    // Consent is a fresh choice, never recalled from this device's details.
    smsConsent: false,
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

// ---------------------------------------------------------------------------
// THE FOURTEEN BODY TYPES — Andrew's checklist, approved 2026-09-14, replacing
// the old design where a suggestion was matched against the DETAILER'S OWN
// tier text (label + examples). That broke the moment a detailer named a tier
// "Off-road" or "Tier 1": nothing in those words could ever match anything,
// and two tiers naming the same word made a coin toss with a customer's price
// on it. Now a detailer TICKS which of these fourteen belong in each tier —
// exact, whatever they call the tier — and a typed vehicle is matched to ONE
// of these fourteen, never straight to a tier. `vehicleBodyTypeCoverage`
// below is what a settings screen uses to enforce "every one of the fourteen
// in exactly one tier" and to block going live until it is.
export const VEHICLE_BODY_TYPES = [
  { key: "coupe", label: "Coupe (2-door)", examples: "e.g. Honda Civic coupe, Toyota Camry coupe" },
  { key: "sedan", label: "Sedan", examples: "e.g. Toyota Camry, Honda Accord" },
  { key: "hatchback", label: "Hatchback", examples: "e.g. VW Golf, Honda Fit" },
  { key: "convertible", label: "Convertible", examples: "e.g. Mazda Miata, Ford Mustang convertible" },
  { key: "wagon", label: "Wagon", examples: "e.g. Subaru Outback, Volvo V60" },
  { key: "small_suv", label: "Small SUV / crossover", examples: "e.g. Toyota RAV4, Honda CR-V" },
  { key: "mid_suv", label: "Mid-size SUV (2 rows)", examples: "e.g. Ford Explorer, Jeep Grand Cherokee" },
  { key: "large_suv", label: "Large SUV (3 rows)", examples: "e.g. Chevrolet Suburban, Chevrolet Tahoe" },
  { key: "pickup_standard", label: "Pickup — standard cab", examples: "e.g. Ford F-150 regular cab" },
  { key: "pickup_crew", label: "Pickup — crew cab", examples: "e.g. Ford F-150 SuperCrew, Silverado crew cab" },
  { key: "minivan", label: "Minivan", examples: "e.g. Toyota Sienna, Honda Odyssey" },
  { key: "cargo_van", label: "Full-size / cargo van", examples: "e.g. Mercedes Sprinter, Ford Transit" },
  { key: "sports_exotic", label: "Sports or exotic", examples: "e.g. Chevrolet Corvette, Porsche 911" },
  { key: "oversized", label: "Oversized — lifted, dually, limo", examples: "e.g. lifted trucks, dually trucks, limos" },
];

/** Every business's `vehicle_sizes` tiers, checked against the fourteen.
 *  `missing` — a body type no tier has claimed. `duplicated` — a body type
 *  more than one tier claims (the settings screen prevents this by
 *  construction, ticking one tier's box unticks it everywhere else, but a
 *  row written by an older client or a script is still checked here rather
 *  than trusted). `complete` is what a go-live check reads. */
export function vehicleBodyTypeCoverage(sizes) {
  const owner = new Map(); // body type key -> [tier keys that claim it]
  for (const t of VEHICLE_BODY_TYPES) owner.set(t.key, []);
  for (const size of sizes ?? []) {
    for (const bt of Array.isArray(size.bodyTypes) ? size.bodyTypes : []) {
      if (owner.has(bt)) owner.get(bt).push(size.key);
    }
  }
  const missing = [...owner.entries()].filter(([, tiers]) => tiers.length === 0).map(([k]) => k);
  const duplicated = [...owner.entries()].filter(([, tiers]) => tiers.length > 1).map(([k]) => k);
  return { missing, duplicated, complete: missing.length === 0 && duplicated.length === 0 };
}

// A HEAD START, NEVER THE ANSWER — Andrew's own words: "pre-ticking is a
// convenience, never the source of truth." When a tier's name is recognisable
// ("Trucks & Large SUVs") this guesses which boxes it probably means, so a
// detailer only has to confirm rather than tick fourteen boxes from nothing.
// Keyword to body type, checked against the tier's own label + examples text;
// a name that matches nothing guesses nothing, which is the safe direction.
// **THE SIZE WORD MUST BE NEXT TO "SUV" — bare "small"/"large"/"medium" is
// deliberately absent.** `DEFAULT_VEHICLE_SIZES` names its OWN three tiers
// "Small", "Medium" and "Large", so a bare adjective would guess off the
// tier's own name rather than off what a detailer actually wrote about its
// contents — "Small" pre-ticking Small SUV/crossover on the platform's own
// base tier is exactly the false signal this rule exists to avoid.
const BODY_TYPE_GUESS_WORDS = [
  [/\b(dually|lifted|oversized|limo)\b/, ["oversized"]],
  [/\bsports?\b|\bexotic\b/, ["sports_exotic"]],
  [/\bconvertibles?\b/, ["convertible"]],
  [/\bwagons?\b/, ["wagon"]],
  [/\bhatchbacks?\b/, ["hatchback"]],
  [/\bminivans?\b/, ["minivan"]],
  [/\bcargo\b/, ["cargo_van"]],
  [/\bvans?\b/, ["minivan", "cargo_van"]],
  [/\bpickups?\b|\btrucks?\b/, ["pickup_standard", "pickup_crew"]],
  [/\bsedans?\b/, ["sedan"]],
  [/\bcoupes?\b/, ["coupe"]],
  [/\bcars?\b/, ["sedan", "coupe", "hatchback"]],
];
const SUV_QUALIFIED = [
  [/\blarge\s+suvs?\b|\bfull.?size\s+suvs?\b|\b3.?row\s+suvs?\b/, "large_suv"],
  [/\bsmall\s+suvs?\b|\bcompact\s+suvs?\b|\bcrossovers?\b/, "small_suv"],
  [/\bmid.?size\s+suvs?\b|\bmedium\s+suvs?\b|\b2.?row\s+suvs?\b/, "mid_suv"],
];
export function guessBodyTypes(label, examples) {
  const s = `${label ?? ""} ${examples ?? ""}`.toLowerCase();
  const out = new Set();
  for (const [re, keys] of BODY_TYPE_GUESS_WORDS) if (re.test(s)) keys.forEach((k) => out.add(k));
  const qualified = SUV_QUALIFIED.filter(([re]) => re.test(s)).map(([, key]) => key);
  // A bare "SUV" with no size word next to it guesses all three sizes; once a
  // QUALIFIED phrase ("Large SUVs") has already answered, the bare word adds
  // nothing further.
  if (qualified.length) qualified.forEach((k) => out.add(k));
  else if (/\bsuvs?\b/.test(s)) ["small_suv", "mid_suv", "large_suv"].forEach((k) => out.add(k));
  return [...out];
}

// ---------------------------------------------------------------------------
// TYPED TEXT -> ONE OF THE FOURTEEN, MOST-CONFIDENT-FIRST.
//
// **AND A WRONG GUESS QUOTES SOMEBODY THE WRONG PRICE, WHICH IS WORSE THAN NOT
// GUESSING — his rule, and it is why everything below fails to null rather
// than to a best effort.** Where a shape genuinely cannot be told from a make
// and model alone — a pickup's cab configuration is a trim choice, not a
// property of the nameplate — this returns null rather than picking one, and
// the booking step's own fallback is to ask.
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
//
// ponytail: the mid-size-vs-large-SUV split below is a first-pass reading of
// which popular models seat 2 rows vs 3 — several (Explorer, Grand Cherokee,
// Acadia) have sold as both across model years. Getting one wrong here is
// still safe: it only changes whether a customer sees the computed size or
// gets asked, because the tier it lands on is the DETAILER'S OWN checklist
// answer, not a guess about price. Revisit if a detailer reports a bad match.
const OVERSIZED_WORDS = /\b(dually|dual rear wheel|drw|lifted|limo(?:usine)?|stretch(?:ed)? limo)\b/;
const CREW_CAB_WORDS = /\b(crew ?cab|supercrew|super ?crew|crewmax|quad ?cab|double ?cab)\b/;
const STANDARD_CAB_WORDS = /\b(regular ?cab|reg ?cab|standard ?cab|single ?cab)\b/;
const TRUCK_MODEL_WORDS = /\b(f ?150|f ?250|f ?350|f ?450|f ?550|silverado|sierra|tundra|titan|ram ?1500|ram ?2500|ram ?3500|cybertruck|r1t|avalanche|lightning|tacoma|colorado|canyon|ranger|frontier|ridgeline|maverick|santa cruz|gladiator|dakota|sonoma|sport trac|pick ?ups?|trucks?)\b/;

const VEHICLE_BODIES = [
  // A customer who types their own body word is answering the question
  // directly — *"my wife's van"*, *"work truck"*. These run first because it
  // is the one case where nobody is guessing at all. Bare "van", "suv" and
  // "truck"/"pickup" are deliberately absent: the fourteen split what used to
  // be one bucket into two or three, and a bare generic word cannot say which.
  [/\bminivans?\b/, "minivan"],
  [/\b(cargo vans?|box trucks?|panel vans?)\b/, "cargo_van"],
  [/\bconvertibles?|cabriolets?|roadsters?|drop ?tops?\b/, "convertible"],
  [/\bwagons?|estates?\b/, "wagon"],
  [/\bhatchbacks?\b/, "hatchback"],
  [/\bsedans?\b/, "sedan"],
  [/\bcoupes?\b/, "coupe"],
  [/\bcrossovers?\b/, "small_suv"],

  // MINIVANS AND PASSENGER VANS.
  [/\b(sienna|odyssey|pacifica|carnival|sedona|quest|voyager|uplander|entourage|routan|freestar|windstar|villager|previa|montana|silhouette|venture|aerostar|grand caravan|caravan|town and country)\b/, "minivan"],
  // CARGO VANS. Bigger again, and a detailer who separates them says so.
  [/\b(sprinter|promaster|transit|express|savana|metris|econoline|ducato|vandura|e 150|e 250|e 350|e 450|nv200|nv|city express)\b/, "cargo_van"],

  // LARGE SUVS — three rows standard, or body-on-frame full-size.
  [/\b(suburban|tahoe|yukon|expedition|escalade|navigator|sequoia|armada|wagoneer|land cruiser|lx|qx56|qx80|gx|durango|traverse|telluride|atlas|palisade|pilot|highlander|pathfinder|r1s|gls class|gl class|q7|discovery|xc90|enclave|mdx|xt6|ioniq 9|ev9|tx)\b/, "large_suv"],
  // MID-SIZE SUVS — two rows, bigger than a compact crossover.
  [/\b(4runner|xterra|montero|murano|edge|santa fe|sorento|touareg|passport|cherokee|acadia|gv80|x3|x5|q5|glc class|gle class|nx|rx|qx50|qx55|qx60|rdx|macan|cayenne|velar|f pace|xc60|model y|outlander|venza)\b/, "mid_suv"],
  // SMALL / COMPACT SUVS AND CROSSOVERS — most of what actually gets typed.
  [/\b(rav4|cr v|crv|cx 3|cx 30|cx 5|cx 50|blazer|bronco|rogue|kicks|forester|crosstrek|outback|tucson|kona|venue|sportage|seltos|soul|niro|tiguan|taos|compass|renegade|patriot|liberty|wrangler|hr v|element|envision|encore|xt4|evoque|e pace|xc40|ariya|mach e|ioniq 5|ev6|id.4|bz4x|solterra|eclipse cross|rvr|endeavor|vue|rendezvous|journey|nitro|flex|freestyle|corolla cross|c hr|creta|vitara|tribute|mariner|zdx|escape|equinox|trax|trailblazer|terrain|x1|q3|gla class|glb class|ux|ex30|ex40|model x)\b/, "small_suv"],

  // WAGONS.
  [/\b(sportwagen|alltrack|v60|v70|v90|allroad|regal tourx)\b/, "wagon"],
  // HATCHBACKS.
  [/\b(golf|gti|impreza|mazda3|mazda2|fit|yaris|rio|versa note|leaf|bolt ev|bolt euv|spark|mirage|prius c|prius v|matrix|vibe|hhr|pt cruiser|cube|xb|xd|500l|i3|veloster|elantra gt)\b/, "hatchback"],

  // CONVERTIBLE-FIRST NAMEPLATES.
  [/\b(miata|mx 5|eos|cabrio|124 spider)\b/, "convertible"],
  // SPORTS AND EXOTIC — everything else that is unambiguously a performance
  // two-door, sold as a sports car rather than as ordinary transportation.
  [/\b(mustang|camaro|challenger|corvette|brz|gr86|86|fr s|supra|z4|tt|boxster|cayman|911|350z|370z|nissan z|rx 7|rx 8|s2000|solstice|sky|prowler|viper|celica|integra|type r|civic si|gt r|nsx|f type|m2|m4|amg gt|slk class|sl class|slc class)\b/, "sports_exotic"],
  // ORDINARY TWO-DOORS with no separate sporting trim worth naming.
  [/\bbeetle\b/, "coupe"],

  // SEDANS — the default shape of a car, and deliberately last of the model
  // rules so anything above it wins.
  [/\b(camry|corolla|accord|civic|altima|sentra|maxima|elantra|sonata|accent|azera|optima|k5|k4|forte|cadenza|stinger|mazda6|legacy|malibu|impala|cruze|sonic|cobalt|fusion|focus|taurus|fiesta|charger|300|200|dart|avenger|avalon|crown|passat|arteon|cc|a3|a4|a6|a8|328i|330i|335i|340i|528i|530i|540i|c class|e class|s class|cla class|a class|is|es|gs|ls|ct|tlx|tsx|tl|ilx|rl|q50|q60|q70|g35|g37|model 3|model s|air|polestar 2|ioniq 6|k900|g70|g80|g90|xe|xf|xj|s60|s80|s90|s40|jetta|versa|lancer|galant|eclipse|sebring|stratus|neon|grand marquis|crown victoria|town car|continental|mkz|milan|sable|regal|lacrosse|lesabre|park avenue|lucerne|century|bonneville|grand prix|grand am|g6|g8|aura|ion|alero|intrigue|aurora|catera|cts|ct4|ct5|ct6|ats|sts|dts|deville|seville|xts)\b/, "sedan"],
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

/** The one body type a typed vehicle implies, or null, plus the piece of
 *  their text that produced it.
 *
 *  **THE MATCHED PIECE IS NOT DECORATION — it is the sentence the screen
 *  prints.** Andrew asked for *"Suburban, that's your Large"*, and the only
 *  honest way to write that line is to quote the word that was actually
 *  recognised. Echoing the whole field back ("2019 Chevrolet Suburban · set to
 *  Large") restates a box one inch above it, which is his own standing rule
 *  against copy that explains what the control already said.
 *
 *  `null` when nothing here is sure about it — which is most strings, and is
 *  always the safe answer: the caller's fallback is to ask. */
export function bodyTypeOf(text) {
  const s = normalizeVehicleText(text);
  if (!s) return null;
  // **THEIR CAPITALS, NOT OURS.** Title-casing "suburban" back up is the same
  // mistake `.advmeter.cap` made with a detailer's expense category: a
  // display-layer transform cannot tell whose words it is transforming, and it
  // is wrong in Spanish besides. So the match is FOUND on the lower-cased
  // string and SLICED out of a copy that kept the customer's own capitals —
  // both built by the same transform, so the indexes line up.
  const shown = normalizeVehicleText(text, true);
  const quote = (m) => shown.slice(m.index, m.index + m[0].length) || m[0];

  // OVERSIZED, CHECKED FIRST — it overrides what would otherwise read as an
  // ordinary pickup or SUV. "Lifted F-250" is oversized, not a crew cab.
  const over = s.match(OVERSIZED_WORDS);
  if (over) return { key: "oversized", matched: quote(over) };

  // A PICKUP'S CAB IS A TRIM CHOICE, NOT A PROPERTY OF THE NAMEPLATE — an
  // F-150 is sold as both. So this only resolves when the text names BOTH a
  // truck and a cab configuration; a bare "F-150" or "truck" falls to null and
  // the booking step asks, which is the honest answer to a question the model
  // name cannot settle.
  const truck = s.match(TRUCK_MODEL_WORDS);
  if (truck) {
    if (CREW_CAB_WORDS.test(s)) return { key: "pickup_crew", matched: quote(truck) };
    if (STANDARD_CAB_WORDS.test(s)) return { key: "pickup_standard", matched: quote(truck) };
    return null;
  }

  for (const [re, key] of VEHICLE_BODIES) {
    const m = s.match(re);
    if (m) return { key, matched: quote(m) };
  }
  return null;
}

/** The tier a typed vehicle belongs in, or null.
 *
 *  `{ key, matched }` — the tier, and the word in their text that chose it, for
 *  the sentence the screen prints.
 *
 *  Matching is now against the DETAILER'S OWN CHECKLIST — which of the
 *  fourteen body types they ticked into each tier — never against free text
 *  they happened to type in a tier's name or examples. So "Off-road" and
 *  "Tier 1" work exactly as well as "Large SUV / truck": the tier's WORDS are
 *  never read here at all.
 *
 *  Null is the ordinary answer and it is never an error: an unrecognised
 *  vehicle, a body type nobody has assigned to a tier yet (a business that
 *  has not done the checklist), and a body type two tiers somehow both claim
 *  all produce it, and the customer then chooses exactly as they do today. */
export function suggestVehicleSize(text, sizes) {
  const hit = bodyTypeOf(text);
  if (!hit || !(sizes ?? []).length) return null;
  const matches = sizes.filter((s) => Array.isArray(s.bodyTypes) && s.bodyTypes.includes(hit.key));
  // TWO TIERS CLAIMING THE SAME BODY TYPE SHOULD NEVER HAPPEN — the settings
  // screen ticks a body type OUT of every other tier the moment it is ticked
  // into one — but a row written before this feature, or by a script, is
  // checked rather than trusted, for the same reason the old vague-word case
  // stopped everything instead of guessing.
  if (matches.length !== 1) return null;
  return { key: matches[0].key, matched: hit.matched };
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

// ROADMAP 99.8 — A PHONE NUMBER WITH DIGITS MISSING BOOKS, and the detailer
// gets a number nobody can call or text. The only rule was "not empty", so
// one digit booked. A US number counts once it has exactly 10 digits (a
// leading 1 dropped, as `phoneAsTyped` already does); a number typed from
// `+` (but not +1, which is the US country code and takes the digit path) is
// left alone except it needs at least 8 digits. Crude on purpose, like
// `looksLikeEmail`: it refuses only what cannot work. Exported beside the
// test itself so the Details step can mark the field, the way `emailFault`
// does for the email box. No imports — this file stays import-free.
export const phoneComplete = (v) => {
  const raw = String(v ?? "");
  if (/^\s*\+(?!1)/.test(raw)) return raw.replace(/\D/g, "").length >= 8;
  const d = raw.replace(/\D/g, "");
  const n = d.length === 11 && d.startsWith("1") ? d.slice(1) : d;
  return n.length === 10;
};

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
      // **THE YEAR IS OPTIONAL — Andrew, 2026-09-20, and this REVERSES his own
      // 2026-09-14 ask that made it required.** His words: it is a nice-to-have
      // that helps him identify the car, and before ROADMAP 2.6 it was not even
      // asked for properly — the box above it said "(optional)" and this one
      // said nothing, so a customer read neither as required and then hit a
      // dead button. **The reversal is the load-bearing part: `no-year` is gone
      // from this list, not renamed**, so nothing downstream can quietly keep
      // refusing on it. The year is still sent when it is given.
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
      else if (!phoneComplete(form.customerPhone)) out.push("bad-phone");
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
    sms_consent: form.smsConsent === true,
    customer_email: form.customerEmail.trim(),
    customer_address: form.customerAddress?.trim() || null,
    // ROADMAP 2.8. Sent on every booking; the SERVER decides whether to keep
    // it, because a value for a drop-off booking is nonsense and a value this
    // page invented is worse than none. **Never sent on the QUOTE payload**:
    // the travel fee comes from a zone the customer picks off a list, so the
    // price has never depended on the address and must not start now.
    address_source: form.addressSource ?? null,
    service_type: form.serviceType,
    travel_zone: form.travelZone || null,
    vehicle_size: form.vehicleSize,
    vehicle_model: form.vehicleModel?.trim() || null,
    // An estimate, for the detailer to judge condition against — never wired
    // to price, and `_shared/pricing.ts` never reads it.
    vehicle_year: form.vehicleYear?.trim() || null,
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
//
// ROADMAP 97.8 — EACH CALL CARRIES THE TOTAL THE PAGE SHOWED FOR IT, from
// `opts.quote` (the `calculate-booking` answer on screen): the whole figure
// for one booking, each car's own `per_vehicle` figure on a split one, since
// each call is priced as that car alone. `create-booking` refuses with
// `price_changed` when its own total differs, so a customer is never charged
// a figure they were not shown. No quote, no field: priced as before.
export function bookingRequests(form, opts = {}) {
  const shown = (t) => ({ shown_total: t == null ? undefined : Number(t) });
  const legs = opts.quote?.per_vehicle;
  const base = { ...bookingRequest(form, opts), ...shown(legs ? legs[0]?.total : opts.quote?.total) };
  const extras = form.extraVehicles ?? [];
  if (!form.splitDays || !extras.length) return [base];
  // On a split booking NO call carries extra vehicles: each is one car on one
  // day. Leaving them on would price the first booking for the whole carload
  // and then book the rest again.
  const first = { ...base, extra_vehicles: null };
  return [
    first,
    ...extras.map((v, i) => ({
      ...first,
      ...shown(legs?.[i + 1]?.total),
      vehicle_size: v.size,
      vehicle_model: (v.model ?? "").trim() || null,
      booking_date: v.date,
      start_time: v.time,
      // ROADMAP 97.6 — THE PLAN RIDES CAR 1 ONLY. A plan covers one car, and
      // each of these calls is priced as its own one-car booking, so a plan on
      // every call made every car "the first" and the whole carload free.
      // `create-booking` refuses a plan beside `group_with` for the same reason.
      plan_id: null,
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
