// WHAT GETS TRANSLATED, AND THE LIST IS DERIVED FROM THE PAYLOAD ITSELF.
// Roadmap item 3, 2026-09-13.
//
// ── WHY THIS WALKS THE PUBLISHED PROFILE AND NOT THE TABLES ─────────────────
// The obvious sweeper reads `services`, `add_ons`, `plans`, `service_groups`
// and `business_settings` and translates named columns. It drifts: a column
// added to `get_public_business_profile` reaches the customer's page and not the
// sweeper, and nothing reports it. `credentials` is the proof that this happens
// — that column is published by `to_jsonb(br)`, so it arrived on every tenant
// site's payload without anybody adding it anywhere.
//
// So the input here is THE EXACT BYTES THE CUSTOMER'S PAGE RECEIVES. What we
// sweep and what they read cannot differ, because they are the same document.
//
// ── AND AN UNKNOWN PATH IS LOUD — Andrew's condition, 2026-09-13 ────────────
// *"Whatever you build to decide 'has this text changed since we last
// translated it' is itself an instrument that will one day be asked whether
// something is up to date. Make it fail loudly when it cannot tell, rather than
// returning 'unchanged' — that is the eighth costume."*
//
// Every string in the payload must be in TRANSLATE or in SKIP. Anything else is
// returned in `unknown` and makes the whole run report `complete: false`. The
// status a dashboard shows is then "we do not know whether this page is fully
// translated" rather than a green tick — which is the only honest answer when a
// field has appeared that nobody has classified.
//
// **NUMBERS, BOOLEANS AND NULLS ARE NOT CLASSIFIED AT ALL.** They cannot carry
// prose, so listing them would be a list to maintain for no decision.
//
// ── NO IMPORTS, the `retryRead.ts` posture ──────────────────────────────────
// `tests/translations.test.mjs` runs this file against the REAL payload of the
// live demo business and asserts zero unknown paths. That check is what keeps
// the two lists honest, and it only works while this file imports nothing.

/** Array indices collapse to `[]`, so `services[3].name` is `services[].name`
 *  and one entry covers every row. */
export type Classified = {
  /** Distinct, in first-seen order. */
  texts: string[];
  /** Paths holding a string that is in neither list. Non-empty = incomplete. */
  unknown: string[];
  /** Every path that WAS classified as translatable and the strings under it —
   *  what the first-run review is drawn from. */
  byPath: Record<string, string[]>;
};

// ---------------------------------------------------------------------------
// TRANSLATE — what the business SAYS.
// ---------------------------------------------------------------------------
export const TRANSLATE: ReadonlySet<string> = new Set([
  "business.service_area",
  "branding.tagline",
  "branding.about_copy",
  "branding.credentials[].label",
  "branding.credentials[].detail",
  "service_groups[].name",
  "service_groups[].description",
  "services[].name",
  "services[].description",
  "services[].features[]",
  "services[].notes",
  "services[].group_label",
  "add_ons[].name",
  "add_ons[].description",
  "add_ons[].features[]",
  "add_ons[].notes",
  "plans[].name",
  "plans[].description",
  "settings.faqs[].q",
  "settings.faqs[].a",
  "settings.vehicle_sizes[].label",
  "settings.vehicle_sizes[].examples",
  "settings.travel_zones[].name",
  "settings.site_discount_label",
  "closures[].name",
]);

// ---------------------------------------------------------------------------
// SKIP — and every line is a decision, not an omission.
// ---------------------------------------------------------------------------
export const SKIP: ReadonlySet<string> = new Set([
  // ── NAMES. "We translate what a business SAYS, never what it is CALLED."
  // Andrew, 2026-09-13. `business.name` is additionally refused by a database
  // trigger, so a sweeper that loses this line still cannot store one.
  "business.name",
  "business.slug",
  // A PERSON'S NAME, which is the same class as the business's.
  "testimonials[].author",

  // ── SOMEBODY ELSE'S WORDS, ATTRIBUTED TO THEM BY NAME.
  // A service description translated badly is the detailer's problem and the
  // first-run review is the remedy. A REVIEW translated badly puts words in a
  // named customer's mouth that they did not say, and no review screen makes
  // that right. Left English deliberately; parked for Andrew.
  "testimonials[].quote",
  "testimonials[].source",

  // ── HANDLES AND INSTRUCTIONS CONTAINING HANDLES. One mangled character in a
  // Venmo handle is a payment that does not arrive. `pay_other` is prose, and
  // it is prose whose whole job is to carry an exact string.
  "settings.pay_venmo",
  "settings.pay_cashapp",
  "settings.pay_zelle",
  "settings.pay_paypal",
  "settings.pay_other",

  // ── ADDRESSES, PHONE NUMBERS, LINKS, TIME ZONES.
  "business.dropoff_address",
  "business.phone",
  "business.timezone",
  "settings.google_review_url",
  "settings.yelp_review_url",
  "branding.logo_url",
  "branding.hero_url",
  "branding.primary_color",
  "branding.secondary_color",

  // ── ENUMS AND KEYS. Machine values the product compares as strings; a
  // translated one is a feature that silently stops working.
  "settings.booking_mode",
  "settings.water_requirement",
  "settings.power_requirement",
  "settings.vehicle_sizes[].key",
  "settings.travel_zones[].key",
  "plans[].cadence_unit",
  "plans[].price_kind",
  "closures[].kind",
  "closures[].repeat",

  // ── IDENTIFIERS, DATES AND TIMES.
  "services[].id",
  "services[].group_id",
  "add_ons[].id",
  "plans[].id",
  "plans[].included_service_ids[]",
  "service_groups[].id",
  "closures[].start_date",
  "closures[].end_date",
  "closures[].start_time",
  "closures[].end_time",
  "hours[].open_time",
  "hours[].close_time",
]);

/**
 * Walk a `get_public_business_profile` payload and sort every string in it.
 *
 * Order is first-seen and stable, so a run that translates nothing new produces
 * the same list as the run before it.
 */
export const classify = (payload: unknown): Classified => {
  const texts: string[] = [];
  const seen = new Set<string>();
  const unknown: string[] = [];
  const unknownSeen = new Set<string>();
  const byPath: Record<string, string[]> = {};

  const walk = (v: unknown, path: string): void => {
    if (v === null || v === undefined) return;
    if (Array.isArray(v)) {
      for (const x of v) walk(x, `${path}[]`);
      return;
    }
    if (typeof v === "object") {
      for (const k of Object.keys(v as Record<string, unknown>)) {
        walk((v as Record<string, unknown>)[k], path ? `${path}.${k}` : k);
      }
      return;
    }
    // Only a string can carry prose.
    if (typeof v !== "string") return;
    const s = v.trim();

    if (SKIP.has(path)) return;

    if (!TRANSLATE.has(path)) {
      // NOT a silent skip. An unclassified field is the one Andrew warned about:
      // it reaches the customer and nothing has decided what it is.
      if (!unknownSeen.has(path)) {
        unknownSeen.add(path);
        unknown.push(path);
      }
      return;
    }

    // Nothing to translate, and not a gap either: a string with no letter in it
    // is a price, a code or punctuation, and a provider would bill us to hand
    // it straight back.
    if (!s || !/\p{L}/u.test(s)) return;

    (byPath[path] ||= []).push(s);
    if (!seen.has(s)) {
      seen.add(s);
      texts.push(s);
    }
  };

  walk(payload, "");
  return { texts, unknown, byPath };
};

/** The paths the first-run review shows, most brand-sensitive first. A detailer
 *  looking once should see the strings where a machine translation would do the
 *  most damage: what their services are CALLED, what their plans are called,
 *  and their tagline — not two hundred FAQ sentences. */
export const REVIEW_PATHS: readonly string[] = [
  "services[].name",
  "add_ons[].name",
  "plans[].name",
  "service_groups[].name",
  "branding.tagline",
];
