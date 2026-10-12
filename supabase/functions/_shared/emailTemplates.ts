// EVERY EMAIL THE PRODUCT SENDS — rebuilt in The Thread, roadmap 2.18,
// 2026-09-03. This file replaced a ~530-line predecessor whose look the owner
// rejected: *"it looks exactly the saem sytle as the email template i had
// before. and doesnt even macth the style of the wwebsites."* He was right —
// a coloured band above a white card is the shape of every transactional email
// ever sent, which makes it the on-distribution default.
//
// THE WORLD LIVES IN `emailKit.ts`, not here. That file holds the ground, the
// tokens, the blocks and the shell, and its header carries the reasoning: why
// the ground is `--ink-0` rather than a white card, why the type is warm bone
// and never `#ffffff`, why every figure is monospace, and which email-client
// constraints the whole thing is built around.
//
// A TEMPLATE HERE IS A LIST OF BLOCKS. That survived the editor being
// scrapped — it was built as an editor substrate and it earns its place now
// for two better reasons: twelve templates come out short and consistent with
// each other, and **the plain-text half of every email is one derived pass
// over the same markup** rather than twelve hand-written twins that drift.
//
// THE INPUT SHAPE IS UNCHANGED ON PURPOSE. `BookingEmailData` is what eight
// edge functions already assemble; rebuilding the RENDERING is the item, and
// changing the data contract at the same time would have meant touching every
// call site's query as well as its render. Only `TenantBrand` moved, because
// the colour set genuinely changed.
//
// WHAT IS DELIBERATELY NOT HERE: the re-book / maintenance reminder. Four of
// six products have one and all four keep it in a separate paid tier, because
// it is the one email in the set whose primary purpose is MARKETING — under
// CAN-SPAM that needs an unsubscribe, a suppression list and a sending
// reputation the transactional set is exempt from. Its own roadmap item.
// **SUPERSEDED 2026-10-06 (ROADMAP 0.7):** it IS here — `maintenanceDueEmail`,
// section 17 — and it now carries the campaign email's legal footer and is
// skipped for any business with no mailing address. The paragraph above is
// kept because it is the reason the footer exists.

import {
  type Brand,
  buttonBlock,
  dayWords,
  esc,
  factsBlock,
  fineBlock,
  formatDateLong,
  formatTime12hr,
  G,
  headlineBlock,
  htmlToText,
  labBlock,
  markBlock,
  money,
  type MoneyLine,
  moneyBlock,
  noteBlock,
  proseBlock,
  reconcile,
  ruleBlock,
  shell,
} from "./emailKit.ts";
import { type PaymentHandle, paymentHandles, type PaymentSettings } from "./payments.ts";
import { langOf, T } from "./i18n.ts";

export { formatDateLong, formatTime12hr, money };
export { paymentHandles };
export type { Brand, MoneyLine, PaymentHandle, PaymentSettings };

/** The email kinds a detailer may add their own paragraph to. */
export type MessageKind =
  | "confirmation" | "request_received" | "reminder" | "reminder_2"
  | "accepted" | "declined" | "quote"
  | "receipt" | "invoice" | "followup" | "cancelled" | "rescheduled";

/** The tenant's identity as an email needs it. Built by `_shared/email.ts`. */
export type TenantBrand = Brand & {
  /**
   * THE DETAILER'S OWN WORDS, one optional paragraph per email kind.
   *
   * This is the whole of "email customizability" after the owner scrapped the
   * block editor he had asked for one message earlier: *"make it a lot more
   * simple."* Five of the six products in the sweep do exactly this — the
   * design is the product's, the words are the business's.
   *
   * **It can never reach the money.** `moneyBlock` takes no input from here;
   * see the migration's comment and CLAUDE.md.
   */
  messages?: Partial<Record<MessageKind, string | null>>;
  /** ROADMAP 99.2c — the business's IANA zone, so "today" in a subject is
   *  the detailer's day, never the server's UTC one. `buildBrand` fills it. */
  timezone?: string;
  /** ROADMAP 99.2d — the first name the sign-off under a customer email uses:
   *  the owner's, from `business_users.first_name`. `buildBrand` leaves it null
   *  when the detailer chose to sign as the business, or no name is set, and
   *  the sign-off then names the business alone. */
  signOffName?: string | null;
  /** Becomes Reply-To, and is where the owner's copy of a cancellation or a
   *  reschedule is sent when no notification list is configured. */
  contactEmail: string | null;
  dropoffAddress: string | null;
  googleReviewUrl: string | null;
  yelpReviewUrl: string | null;
  /**
   * ROADMAP 2.20 STAGE 1 — how this detailer wants to be paid, already
   * normalised by `_shared/payments.ts`. Absent or empty for every business
   * that has not filled the form in, which is all of them until they do, and
   * the templates then render nothing.
   */
  payment?: PaymentHandle[];
};

export interface BookingEmailData {
  id: string;
  /**
   * ROADMAP 8.17 STAGE 2A — WHAT LANGUAGE THIS CUSTOMER'S EMAILS GO OUT IN,
   * from `bookings.lang`, chosen on the booking page.
   *
   * **OPTIONAL, AND ABSENT MEANS ENGLISH**, which is what every booking made
   * before this column existed was written in — so no existing sender is
   * wrong by not knowing about it.
   *
   * **AND THE DETAILER-FACING TEMPLATES IGNORE IT ON PURPOSE.** The owner's
   * booking alert, the stale-request nudge and the owner's half of the
   * cancellation go to somebody who runs a business on this product, and
   * their language is the DASHBOARD's question — stage 2b. A Spanish booking
   * must not turn a detailer's own alerts Spanish while their dashboard stays
   * English. That is why the shared helpers below take the language as an
   * ARGUMENT rather than reading `b.lang` themselves: the customer templates
   * pass it and the owner templates do not.
   *
   * **A CUSTOMER TEMPLATE THAT FORGETS IT PRODUCES A PERFECTLY VALID ENGLISH
   * EMAIL** to somebody who asked for Spanish, and nothing on any screen
   * reports that — the same invisible shape as `extraVehicles` below. So
   * `tests/spanish.test.mjs` § 6 DISCOVERS the customer templates and the
   * senders by reading the source rather than trusting a list in a comment.
   */
  lang?: string | null;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  customerAddress: string | null;
  // ROADMAP 2.8 — 'picked', 'typed', or null when nobody recorded it.
  addressSource?: string | null;
  // ROADMAP 2.3 — the crude zone-vs-address word check, `zoneAddressMismatch`
  // in `_shared/pricing.ts`. true only; null/false print nothing, same rule
  // as `addressSource` above — a check that could not run must never be
  // dressed up as "checked and fine".
  travelZoneAddressMismatch?: boolean | null;
  dateStr: string;       // business-local "YYYY-MM-DD"
  startTime: string;     // business-local "HH:MM"
  endTime: string;       // business-local "HH:MM"
  serviceType: string;   // mobile | dropoff
  vehicleSize: string;
  vehicleModel: string | null;
  // ROADMAP 8.10 — the vehicles AFTER the first, on this same visit.
  // OPTIONAL, and absent is the honest answer for every booking made before
  // multi-vehicle existed. The MONEY for these cars is already itemised on
  // the three money emails, because each one is a line in `price_adjustments`;
  // what this adds is the FACT ROW, which is the half the owner's alert and
  // the owner's reminder live on — a detailer loading the van needs the
  // number of cars, and those two emails carry no money table at all.
  extraVehicles?: { size: string; model?: string | null }[];
  // IDEA 11 — what the customer said they can supply at their own address.
  // OPTIONAL, and `undefined` is a third state that means NOBODY WAS ASKED:
  // the detailer may have the question switched off. Only an explicit `false`
  // is a fact worth printing, so an older caller that does not pass these
  // draws nothing rather than claiming the customer has water.
  hasWater?: boolean | null;
  hasPower?: boolean | null;
  /**
   * ROADMAP 14.4 — THE DETAILER'S REFUND INSTRUCTION, ALREADY WRITTEN.
   *
   * A finished sentence rather than a figure, and that is deliberate: the
   * words are composed once by `refundInstruction` in `_shared/connect.ts`,
   * beside the rule that decides whether any money is owed at all. A template
   * that took the cents and wrote its own sentence would be a second voice
   * describing one fact, and the job screen would then be a third.
   *
   * **OWNER-FACING ONLY.** It names Stripe and it names the detailer's own
   * balance, so the customer's half of `cancellationEmail` never prints it.
   * Absent or empty means no money changed hands, which is the ordinary case.
   */
  refundNote?: string | null;
  /**
   * ROADMAP 3.4 FOLLOW-UP — WHETHER THE CUSTOMER'S OWN HALF SAYS ANYTHING
   * ABOUT THEIR MONEY. `refundOwed(booking).owed` from `_shared/connect.ts`,
   * the SAME test `refundNote` is built from — never re-derived here, because
   * two computations of one fact is how they disagree.
   *
   * **CUSTOMER-SAFE ON PURPOSE, UNLIKE `refundNote`.** It carries no figure
   * and no mention of Stripe or a balance — only whether to say the sentence
   * at all. The amount was already shown to them as "Was worth" or in their
   * own confirmation email; repeating it here would be inventing a number
   * `cancel-booking`/`update-booking` did not choose to send.
   *
   * True only; false or absent means nothing changed hands and nothing is
   * printed — the same "a check that could not run must never be dressed up
   * as checked and fine" rule as `travelZoneAddressMismatch` above.
   */
  refundOwed?: boolean;
  customerNotes: string | null;
  serviceNames: string[];
  addOnNames: string[];
  // Roadmap 2.8c. The subtotal below CONTAINS the travel charge and every
  // surcharge, so without these two the money table shows "Express Wash $65"
  // and "Subtotal $105" with $40 unexplained between them.
  travelFee?: number;
  travelZone?: string | null;
  adjustments?: { label: string; amount: number; parts?: Record<string, unknown> }[];
  subtotal: number;
  siteDiscount: number;
  siteDiscountPercent: number;
  promoCode: string | null;
  promoDiscount: number;
  total: number;
  receiptUrl: string;
}

export interface InvoiceRow {
  label: string;
  qty: number;
  lineTotal: number;
  kind: "charge" | "discount" | "tip";
}

export interface Mail {
  subject: string;
  html: string;
  text: string;
}

export interface MailAddressing {
  from: string;
  replyTo: string | null;
  ownerTo: string | null;
}

/**
 * WHO A TENANT'S MAIL COMES FROM AND GOES BACK TO — and this is a
 * TENANT-ISOLATION function, not a formatting one.
 *
 * The platform sends every business's mail from one verified address, so the
 * only things separating two tenants' email are the display name and the
 * Reply-To. `tests/booking-engine.test.mjs` test 9 pins exactly that: A's mail
 * replies to A's owner, B's to B's, and A's email never mentions B.
 *
 * **It was deleted in the 2.18 rebuild as dead code and restored the same
 * hour**, because the check for callers was a grep of `supabase/functions/`
 * and the caller was in `tests/`. *A symbol used only by its test still has a
 * user, and the test is usually pinning the thing that matters most.*
 */
export function buildAddressing(brand: TenantBrand, platformFromAddress: string): MailAddressing {
  return {
    from: `${brand.brandName} <${platformFromAddress}>`,
    replyTo: brand.contactEmail,
    ownerTo: brand.contactEmail,
  };
}

/**
 * ROADMAP 3.4d — A SIZE NAME IS OURS ONLY WHEN IT IS ONE WE SEEDED.
 *
 * Every business starts on Small / Medium / Large (`DEFAULT_VEHICLE_SIZES` in
 * `app/src/book/core.js`), and the booking page translates exactly those
 * (`isPlatformSizeText`). The email printed them in English in a Spanish email,
 * and before that rewrote them through a map — "Small car", "Large / SUV" —
 * which also turned a detailer's OWN "XL" into "Extra large". Now: a seeded
 * name, or the bare key an older booking with no stored label falls back to
 * (measured 2026-10-06: 39 of 56 booking rows have no label), is said the way
 * the booking page says it, in the reader's language; anything else is the
 * detailer's and is printed as typed.
 *
 * ponytail: a STRING test, the page's own written limit — a detailer who
 * deliberately typed "Large" gets it translated. Closing that needs an
 * `edited` flag on the size (FOUND.md has the argument).
 */
const sizeName = (s: string, lang?: unknown): string => {
  const tt = T(lang);
  switch (String(s)) {
    case "Small": case "small": return tt("Small");
    case "Medium": case "medium": return tt("Medium");
    case "Large": case "large": return tt("Large");
    default: return String(s);
  }
};

// ROADMAP 8.10 — THE ONE PLACE THREE FACT TABLES ASK "WHICH CAR". All three
// used to name exactly one, which is right for every booking this product had
// ever taken and silently wrong the day a customer books three: the detailer
// reads "Large · F-150" and packs for one car.
//
// One vehicle renders byte-identically to what it always did, so nothing
// about an ordinary booking's email moves.
const vehicleFact = (b: BookingEmailData, lang?: unknown): [string, string] => {
  const tt = T(lang);
  const one = (size: string, model?: string | null) =>
    `${esc(sizeName(size, lang))}${model ? ` &middot; ${esc(model)}` : ""}`;
  const extras = b.extraVehicles ?? [];
  if (!extras.length) return [tt("Vehicle"), one(b.vehicleSize, b.vehicleModel)];
  return [
    tt("Vehicles ({count})", { count: extras.length + 1 }),
    [one(b.vehicleSize, b.vehicleModel), ...extras.map((v) => one(v.size, v.model))].join("<br>"),
  ];
};

const firstName = (full: string) => String(full || "").trim().split(" ")[0] || "there";

// ROADMAP 99.2c — THE UPCOMING DAY AS A CUSTOMER SAYS IT: "today", "tomorrow",
// "Friday" inside a week, "October 14" beyond (`dayWords`, 99.2b). Spanish puts
// the article in front of a weekday or a date ("el viernes", "el 14 de octubre")
// and nothing in front of "hoy" or "mañana", so it is added here, once, and the
// catalogue's sentences carry no article of their own. `near` is for the one
// English sentence whose word order changes ("Your appointment tomorrow…").
// The zone falls back to the column's own default, `America/Los_Angeles`.
function upcoming(brand: TenantBrand, dateStr: string, time24: string | null, lang?: unknown) {
  const es = langOf(lang) === "es";
  const word = dayWords(dateStr, brand.timezone || "America/Los_Angeles", es ? "es" : "en");
  const near = ["today", "tomorrow", "hoy", "mañana"].includes(word);
  const day = es && !near ? `el ${word}` : word;
  if (!time24) return { day, near, when: day };
  const at = es ? (Number(String(time24).slice(0, 2)) % 12 === 1 ? "a la" : "a las") : "at";
  return { day, near, when: `${day} ${at} ${formatTime12hr(time24)}` };
}

/** Where the job happens: the customer's address for mobile, ours otherwise. */
export function jobAddress(
  brand: TenantBrand,
  b: Pick<BookingEmailData, "serviceType" | "customerAddress">,
): string {
  if (b.serviceType === "mobile" && b.customerAddress?.trim()) return b.customerAddress;
  return brand.dropoffAddress || "";
}

/**
 * ROADMAP 2.8 — THE "WHERE" ROW OF A DETAILER-FACING EMAIL, AND WHETHER
 * ANYBODY EVER FOUND THAT ADDRESS.
 *
 * Measured 2026-09-20: a made-up address went through the whole flow and
 * arrived in this email looking exactly like a verified one. Nothing in the
 * stack had a motive to notice — the travel fee comes from a zone the
 * customer picks off a list, so no price ever depended on resolving it.
 *
 * **ONE HELPER BECAUSE THERE ARE TWO EMAILS.** The new-booking alert and the
 * unanswered-request nudge both print an address a detailer acts on, and two
 * copies of this rule is how one of them silently keeps the old behaviour.
 *
 * Only 'typed' says anything. 'picked' is a suggestion the lookup returned
 * and the customer chose, so there is nothing to warn about; null is every
 * booking made before this shipped and every drop-off job, and printing a
 * reassurance there would be inventing one.
 *
 * **A LABEL, NEVER A GATE** — Andrew, 2026-09-20: *"an honest label beats a
 * locked door."* The booking is real and wanted. This is the one fact that
 * lets a detailer make a phone call instead of a wasted drive.
 */
export function ownerWhereRow(
  brand: TenantBrand,
  b: Pick<BookingEmailData, "serviceType" | "customerAddress" | "addressSource" | "travelZoneAddressMismatch">,
  lang?: unknown,
): [string, string] {
  const tt = T(lang);
  const unverified = b.serviceType === "mobile" && b.addressSource === "typed";
  // ROADMAP 2.3 — the same crude flag as the job record, in the same row as
  // the address it is about. Not distance, not a gate: see the column
  // comment on `bookings.travel_zone_address_mismatch` for exactly what it
  // does and does not catch.
  const zoneMismatch = b.serviceType === "mobile" && b.travelZoneAddressMismatch === true;
  const note = (text: string) =>
    `<br><span class="c-fog2" style="color:${G.fog2}; font-size:13px;">${text}</span>`;
  return [
    tt("Where"),
    esc(jobAddress(brand, b))
      + (unverified ? note(tt("Typed by hand. The address lookup found no match for it.")) : "")
      + (zoneMismatch ? note(tt("Doesn't mention the travel area they picked. Worth a quick check before you drive out.")) : ""),
  ];
}

/** Every template ends here, so no template can forget the text half. */
function mail(subject: string, html: string): Mail {
  return { subject, html, text: htmlToText(html) };
}

/**
 * The detailer's paragraph, or nothing. One helper rather than an inline
 * ternary per template, so every one of them places it the same way and a new
 * template cannot quietly forget to offer the slot.
 *
 * It renders on the PANEL rather than as plain prose, because it is the one
 * part of the email the business wrote and it should look like an aside from
 * them rather than another sentence from us.
 */
function ownWords(brand: TenantBrand, kind: MessageKind): string {
  const body = brand.messages?.[kind];
  if (!body || !String(body).trim()) return "";
  // Escaped first, THEN newlines become `<br>` — the other order would let a
  // detailer's paragraph inject markup into every email they send.
  const safe = esc(String(body).trim()).split(/\r?\n\s*/).join("<br>");
  return noteBlock(safe);
}

/**
 * "HERE'S YOUR LINK, DON'T LOSE IT" -- the owner's own ask, roadmap 2.14 round
 * 4: *"make sure the emails kinda remind them, hey, here's your link, don't
 * lose it."*
 *
 * The link was always in these emails; nothing ever said it was the way back.
 * The research's finding is that a customer forgetting their booking link is
 * real and is the DETAILER's problem to solve, and every other route to
 * solving it -- the QR code, the Google profile, a text message -- is the
 * detailer distributing a link. This is the one route that costs nobody
 * anything: the customer already has the email.
 *
 * One helper rather than the sentence typed into three templates, for the same
 * reason `ownWords` is one: copies drift and the third gets forgotten.
 */
/**
 * HOW TO PAY — roadmap 2.20 stage 1, and the whole of the stage on the email
 * side.
 *
 * TWO BLOCKS, NOT ONE, because the heading is what stops this reading as more
 * facts about the job. It is a ruled list for the same reason `factsBlock`
 * exists at all — "a collection of records is a ruled list" is a composition
 * law with its own test — and the values are label-left / handle-right like
 * every other list in the set.
 *
 * ESCAPING IS THE POINT OF THIS FUNCTION LIVING HERE. `factsBlock` escapes its
 * LABEL and takes its VALUE as raw HTML, and every value on this list was
 * typed by a detailer. `esc` runs on the handle and on the href, and
 * `payments.ts` has already refused to build an href out of anything but a
 * plain username or an `https:` URL — so a hostile string reaches the page as
 * inert text with no link on it, twice over.
 *
 * NOTHING IS RENDERED WHEN NOTHING IS SET, which is every business on the day
 * this shipped. An empty heading over an empty list is worse than silence.
 */
function paymentBlock(brand: TenantBrand, lead = "", lang?: unknown): string {
  const rows = brand.payment ?? [];
  if (rows.length === 0) return "";
  // NO LEAD ON THE INVOICE. That email's heading is already "Amount due" and
  // its money column is directly above this list, so a sentence here could
  // only restate one of them — which is the owner's own copy rule, 2026-09-01.
  const tt = T(lang);
  return labBlock(tt("How to pay")) + (lead ? fineBlock(lead, 10) : "") + factsBlock(
    rows.map((r) => [
      // ROADMAP 8.17 — **THE LABEL GOES THROUGH THE LOOKUP AND THE HANDLE
      // NEVER DOES.** Venmo, Cash App, PayPal and Zelle are brand names and
      // are not in the catalogue, so they pass through untouched; "Other" and
      // "Cash" are our two words and are translated. The HANDLE is what the
      // detailer typed — a username, a phone number, a sentence about a
      // cheque — and translating a person's own words is the one thing this
      // feature must never do. The exception is `On the day`, which is a
      // sentinel this product writes rather than anything they typed.
      tt(r.label),
      r.href
        ? `<a href="${esc(r.href)}" target="_blank" class="c-accent" style="color:${brand.accent}; text-decoration:none;">${esc(r.handle)}</a>`
        : `<span class="c-ink" style="color:${G.ink};">${esc(r.handle === "On the day" ? tt("On the day") : r.handle)}</span>`,
    ] as [string, string]),
  );
}

function keepLink(lang?: unknown): string {
  // ROADMAP 99.2c — Andrew's approved wording replaced "Keep this email…".
  // It sits directly under the booking button on every email that calls it.
  return fineBlock(T(lang)("Need to change or cancel? Use the button above. No call needed."));
}

// ROADMAP 99.2d — "Thanks again, Andrew · Andrew's Auto Detail · andrewsdetail.com",
// the last thing in every customer email. A person signs, so it is the owner's
// first name by default; a detailer who would rather sign as the business turns
// that on (`business_settings.email_sign_as_business`) and `buildBrand` then
// leaves `signOffName` empty, which is also what a business with no name set
// gets, so the line never reads "Thanks again, null".
function signOff(brand: TenantBrand, lang?: unknown): string {
  const tt = T(lang);
  const site = String(brand.siteUrl || "");
  const vars = {
    name: esc(String(brand.signOffName || "")),
    brand: esc(brand.brandName),
    site: site
      ? `<a href="${esc(site)}" target="_blank" class="c-accent" style="color:${brand.accent}; text-decoration:none;">${esc(site.replace(/^https?:\/\//, "").replace(/\/$/, ""))}</a>`
      : "",
  };
  const line = brand.signOffName
    ? tt("Thanks again, {name} · {brand} · {site}", vars)
    : tt("Thanks again, {brand} · {site}", vars);
  return proseBlock(line.replace(/ · $/, ""), 34);
}

/**
 * THE QUOTE'S MONEY LINES, AND THEY HAVE TO REACH THE TOTAL.
 *
 * `subtotal` already contains travel and every surcharge (2.8c), so the named
 * services cannot simply be summed — the derived remainder is what the
 * services and add-ons actually came to. Then the two discounts come off, in
 * the order the engine applies them: the site sale against the base, the promo
 * against what is left.
 */
/**
 * ROADMAP 3.4 — ONE ADJUSTMENT'S NAME, IN THE READER'S LANGUAGE WHERE IT IS OURS.
 *
 * `pricing.ts` builds the extra-car and plan labels in English ("2nd vehicle",
 * "plan rate") and, since 2.1c, also hands over `parts` so a caller can spell
 * them. The booking page did (`app/src/book/adjustmentLabel.js`); the emails
 * printed `label`, so a Spanish confirmation said "2nd vehicle". English keeps
 * the stored label untouched, byte for byte. A line with no `parts` — a
 * detailer's own rule ("Heavy soiling surcharge"), or a booking stored before
 * 2.1c — is their text or our old text and is printed as written.
 */
function adjustmentText(a: { label: string; parts?: Record<string, unknown> }, lang?: unknown): string {
  const p = a?.parts as
    | { of: "vehicle"; ordinal: number; size: string; model?: string }
    | { of: "plan"; planName: string; benefit: string; percent?: number }
    | undefined;
  if (!p || langOf(lang) !== "es") return String(a.label);
  const tt = T(lang);
  if (p.of === "vehicle") {
    // Masculine indicator because the noun is `vehículo` — the page's rule too.
    return [tt("{ord} vehicle", { ord: `${p.ordinal}.º` }), sizeName(p.size, lang), p.model].filter(Boolean).join(" · ");
  }
  if (p.of === "plan") {
    const what = p.benefit === "percent_off"
      ? tt("{percent}% off", { percent: p.percent ?? "" })
      : p.benefit === "plan_rate" ? tt("plan rate") : tt("included");
    return [p.planName, what].filter(Boolean).join(" · ");
  }
  return String(a.label);
}

function quoteLines(b: BookingEmailData, lang?: unknown): MoneyLine[] {
  // THE LABELS ARE OURS AND THE SERVICE NAMES ARE THE DETAILER'S. Only the
  // handful of words this file invents — Service, Travel, Sale, Promo — are
  // looked up; a machine translation of a business's own name for its own work
  // is the single most embarrassing thing this feature could do.
  const tt = T(lang);
  const travel = Number(b.travelFee) || 0;
  const adjustments = b.adjustments ?? [];
  const named = travel + adjustments.reduce((s, a) => s + (Number(a.amount) || 0), 0);
  // `subtotal` is post-site-discount, so the base has to be reconstructed
  // before the site line can be shown coming off it.
  const base = Number(b.subtotal) + (Number(b.siteDiscount) || 0) - named;
  const services = [...b.serviceNames, ...b.addOnNames.map((a) => tt("{name} (add-on)", { name: a }))];

  const lines: MoneyLine[] = [];
  if (services.length === 1) lines.push({ label: services[0], amount: base });
  else if (services.length > 1) {
    // Individual prices are not on the booking row, so one line names the work
    // and carries what it came to. Better an honest single line than a made-up
    // split across three.
    lines.push({ label: services.join(", "), amount: base });
  } else lines.push({ label: tt("Service"), amount: base });

  if (travel > 0) {
    lines.push({
      // **THE MIDDLE DOT, NOT AN EM DASH — 2026-09-13.** CLAUDE.md § THE EM
      // DASH HAS THREE SHAPES names this exact string as its worked example of
      // a LABEL SEPARATOR, and it had never been changed: the 2026-09-12 sweep
      // that reported "zero single em dashes left in any user-facing string"
      // did not reach the `supabase/functions` tree at all. FOUND.md § THE EM
      // DASH SWEEP STOPPED AT THE EDGE OF THE EMAILS has the other eighteen.
      // (And it must not write that path as a glob: a star-slash inside a LINE
      // comment opens a BLOCK comment as far as `strip()` in
      // `tests/spanish.test.mjs` is concerned, which then eats 43 KB of this
      // file and fails five checks that say nothing about the product. Its
      // subject-count guards caught it, which is what they are for.)
      // The Spanish key in `_shared/strings/es.ts` moved in the same edit — it
      // is keyed on the English text, so a rename that misses it shows English
      // on a Spanish email with no error anywhere.
      label: b.travelZone ? tt("Travel · {zone}", { zone: b.travelZone }) : tt("Travel"),
      amount: travel,
    });
  }
  // AN ADJUSTMENT CAN BE NEGATIVE, AND `moneyBlock` DRAWS BY `kind` RATHER
  // THAN BY SIGN — so a −$120 line with no kind printed as a $120 CHARGE while
  // the total was $120 lower, and the column silently stopped adding up. It
  // was already reachable before roadmap 2.14: `accept-quote` pushes a
  // "Quoted discount" line whenever a detailer quotes UNDER the original
  // estimate. 2.14's plan line made it the ordinary case rather than the rare
  // one. Same family as the invoice that missed by exactly the promo — a
  // number printed is not a number charged — and the fix is at the one place
  // every adjustment reaches the page.
  for (const a of adjustments) {
    const amount = Number(a.amount) || 0;
    const label = adjustmentText(a, lang);
    lines.push(amount < 0
      ? { label, amount: -amount, kind: "discount" }
      : { label, amount });
  }
  if (Number(b.siteDiscount) > 0) {
    // ROADMAP 3.4 — A LABEL THAT STATES A PERCENTAGE MAKES A CLAIM THE FIGURE
    // HAS TO KEEP. The engine rounds the sale to whole dollars, so "5% sale
    // −$20" sat over a $405 job (5% is $20.25). The booking page already
    // follows this rule (scripts/discount-label.mjs); the email now does too:
    // the percentage is stated only when it is exact to the cent, else "Sale".
    // `subtotal` is after the sale, so the sale's own base is subtotal + sale.
    const gross = Number(b.subtotal) + Number(b.siteDiscount);
    const exact = b.siteDiscountPercent > 0
      && Math.round(gross * b.siteDiscountPercent) === Math.round(Number(b.siteDiscount) * 100);
    lines.push({
      label: exact
        ? tt("{percent}% sale", { percent: b.siteDiscountPercent })
        : tt("Sale"),
      amount: Number(b.siteDiscount), kind: "discount",
    });
  }
  if (b.promoCode && Number(b.promoDiscount) > 0) {
    lines.push({
      label: tt("Promo {code}", { code: b.promoCode }),
      amount: Number(b.promoDiscount), kind: "discount",
    });
  }
  // The engine ROUNDS the total to the business's own nearest-N after both
  // discounts, so even a fully itemised column can miss by a couple of
  // dollars. `reconcile` draws that rather than leaving a gap.
  return reconcile(lines, Number(b.total), lang);
}

const jobFacts = (
  brand: TenantBrand,
  b: BookingEmailData,
  lang?: unknown,
): [string, string][] => {
  const tt = T(lang);
  return [
    [tt("Where"), esc(jobAddress(brand, b))],
    [
      b.serviceType === "mobile" ? tt("We come to you") : tt("Drop-off"),
      b.serviceType === "mobile" ? tt("Yes") : tt("At our unit"),
    ],
    vehicleFact(b, lang),
  ];
};

// ---------------------------------------------------------------------------
// 1 · CUSTOMER — BOOKING CONFIRMED / REQUEST RECEIVED
//
// TWO PROMISES, one flag. Both products in the six-product sweep that have a
// request mode ship these as separate notifications, and they say genuinely
// different things — "you have this slot" against "we have your request and
// will answer". The owner's own framing: *"one is just a little bit more
// guaranteed than the other."*
// ---------------------------------------------------------------------------
export function customerConfirmationEmail(
  brand: TenantBrand,
  b: BookingEmailData,
  isRequest = false,
): Mail {
  // ROADMAP 8.17 STAGE 2A. `tt` is bound once, at the top, and everything a
  // reader sees goes through it. The detailer's own words — service names, the
  // paragraph in `ownWords`, their notes — never do.
  const tt = T(b.lang);
  const dateLong = formatDateLong(b.dateStr, b.lang);
  const up = upcoming(brand, b.dateStr, b.startTime, b.lang);
  const blocks = [
    labBlock(isRequest ? tt("Request received") : tt("Booking confirmed")),
    headlineBlock(isRequest ? tt("We're holding this time for you") : tt("You're all set")),
    proseBlock(isRequest
      ? tt("Thanks, {first}. We're checking the schedule and will get back to you soon. Nothing is charged yet.",
        { first: esc(firstName(b.customerName)) })
      : tt("Thanks, {first}. Here's everything for {day}.",
        { first: esc(firstName(b.customerName)), day: up.day })),
    markBlock(brand, [dateLong, `${formatTime12hr(b.startTime)} &ndash; ${formatTime12hr(b.endTime)}`]),
    factsBlock(jobFacts(brand, b, b.lang)),
    ruleBlock(34),
    labBlock(tt("What we're doing")),
    moneyBlock(brand, quoteLines(b, b.lang), { label: tt("Estimated total"), amount: Number(b.total) }),
    fineBlock(tt("An estimate. If the vehicle's condition needs more time than expected we'll tell you before we start, never after.")),
    // ROADMAP 2.20 STAGE 1, AND NOT ON THE REQUEST BRANCH. A request is not a
    // booking yet — that branch's own note says "nothing is charged now" — so
    // telling somebody how to pay for a job nobody has accepted is the same
    // mistake as printing payment methods on a receipt, one step earlier.
    // The accepted-request email carries them instead.
    isRequest ? "" : paymentBlock(brand, tt("Nothing to pay now. This is for when the work is done."), b.lang),
    ownWords(brand, isRequest ? "request_received" : "confirmation"),
    buttonBlock(brand, isRequest ? tt("View or change your request") : tt("View your booking"), b.receiptUrl),
    keepLink(b.lang),
    isRequest ? noteBlock(tt("Nothing is charged now. We'll email you the moment we've accepted.")) : "",
    b.customerNotes ? proseBlock(`<strong class="c-ink" style="color:${G.ink};">${esc(tt("Your notes"))}</strong><br>${esc(b.customerNotes)}`, 26) : "",
    signOff(brand, b.lang),
  ].filter(Boolean);

  return mail(
    isRequest
      ? tt("Got your request for {when}", { when: up.when })
      : tt("You're booked for {when}", { when: up.when }),
    shell(brand, blocks, isRequest
      ? tt("We're holding your time while we look at it.")
      : tt("{date} at {time}.", { date: dateLong, time: formatTime12hr(b.startTime) }),
      { lang: b.lang }),
  );
}

// ---------------------------------------------------------------------------
// 2 · OWNER — A NEW BOOKING, A NEW REQUEST, OR A JOB COMING UP
//
// A DIFFERENT AUDIENCE, AND IT IS BUILT AS ONE. The detailer is not a customer
// being reassured; they are deciding whether to act. So the money and the
// phone number come first, the pleasantries are gone, and the notes are always
// shown — including when there are none, because "no notes" is information
// when you are about to drive somewhere.
// ---------------------------------------------------------------------------
export function ownerNewBookingEmail(
  brand: TenantBrand,
  b: BookingEmailData,
  isRequest = false,
  headingOverride?: string,
  // ROADMAP 3.4 FAULT 4 — THE RECIPIENT'S dashboard language (`recipientLang`
  // in `_shared/email.ts`), NEVER `b.lang`, which is the CUSTOMER's. A Spanish
  // booking must not turn an English-reading detailer's alert Spanish.
  lang?: unknown,
): Mail {
  const tt = T(lang);
  const dateLong = formatDateLong(b.dateStr, lang);
  const services = [...b.serviceNames, ...b.addOnNames.map((a) => tt("{name} (add-on)", { name: a }))];
  const blocks = [
    labBlock(headingOverride ?? (isRequest ? tt("Waiting for you to accept") : tt("New booking"))),
    headlineBlock(b.customerName),
    markBlock(brand, [money(Number(b.total)), `${dateLong} · ${formatTime12hr(b.startTime)} – ${formatTime12hr(b.endTime)}`]),
    factsBlock([
      [tt("Phone"), `<a href="tel:${esc(b.customerPhone)}" class="c-accent" style="color:${brand.accent}; text-decoration:none;">${esc(b.customerPhone)}</a>`],
      ...(b.customerEmail ? [[tt("Email"), esc(b.customerEmail)] as [string, string]] : []),
      ownerWhereRow(brand, b, lang),
      // **IDEA 11 — WHAT TO LOAD IN THE VAN, in the email that wakes a
      // detailer up.** The job record has printed this since W22; the OWNER'S
      // OWN ALERT never did, which is the real gap — the record is read when
      // you are already going, and the email is read when you are deciding
      // what to put in the van. Only for a mobile job, and only when the
      // answer is an explicit no.
      // "Drop-off" is already a key, worded for the CUSTOMER ("Lo dejas tú",
      // you drop it off); on the detailer's row it means the customer brings it
      // in, so Spanish gets its own key and English keeps "Drop-off" untouched.
      [tt("Type"), b.serviceType === "mobile"
        ? tt("Mobile")
        : langOf(lang) === "es" ? tt("The customer brings it in") : "Drop-off"],
      ...(b.serviceType === "mobile" && (b.hasWater === false || b.hasPower === false)
        ? [[tt("Bring"), b.hasWater === false && b.hasPower === false
            ? tt("water and power")
            : b.hasWater === false ? tt("water") : tt("power")] as [string, string]]
        : []),
      vehicleFact(b, lang),
    ]),
    ruleBlock(34),
    labBlock(tt("The work")),
    proseBlock(
      services.map((s) => `<div style="padding:4px 0;">${esc(s)}</div>`).join("")
        + (b.promoCode ? `<div class="c-accent" style="padding:4px 0; color:${brand.accent};">${tt("Promo {code}", { code: esc(b.promoCode) })}${Number(b.promoDiscount) > 0 ? ` (−${money(Number(b.promoDiscount))})` : ""}</div>` : ""),
      12,
    ),
    ruleBlock(30),
    labBlock(tt("Customer notes")),
    proseBlock(b.customerNotes ? esc(b.customerNotes) : `<span class="c-fog2" style="color:${G.fog2};">${tt("None.")}</span>`, 12),
    buttonBlock(brand, isRequest ? tt("Answer this request") : tt("Open the job"), b.receiptUrl),
  ];

  const subjectVars = { name: b.customerName, date: dateLong, total: money(Number(b.total)) };
  return mail(
    isRequest
      ? tt("Request · {name} · {date} ({total})", subjectVars)
      : tt("New booking · {name} · {date} ({total})", subjectVars),
    shell(brand, blocks, `${b.customerName} · ${dateLong} · ${money(Number(b.total))}`, { lang }),
  );
}

// ---------------------------------------------------------------------------
// 3 · CUSTOMER — THE DETAILER'S ANSWER TO A REQUEST (roadmap 2.12)
//
// Three outcomes, one template, because the three share a shape: what was
// asked for, what the answer is, and one way forward. The quote is the only
// one carrying a number and the only one with a button, because it is the only
// one still waiting on the customer.
//
// A QUOTE IS OFFERED, NEVER CHARGED — `quoted_amount` is its own column and
// only `accept-quote` moves it to `total_price`.
// ---------------------------------------------------------------------------
export function requestDecisionEmail(
  brand: TenantBrand,
  b: BookingEmailData,
  kind: "accepted" | "declined" | "quote",
  opts: { manageUrl: string; quotedAmount?: number; quotedNote?: string | null } = { manageUrl: "" },
): Mail {
  const tt = T(b.lang);
  const dateLong = formatDateLong(b.dateStr, b.lang);
  // **THE WORD BETWEEN THE DATE AND THE TIME IS A TRANSLATABLE STRING, AND IT
  // WAS ENGLISH UNTIL 2026-09-20 — ROADMAP 3.4 finding 3.** It sat outside the
  // lookup, in the template literal, so all three Spanish decision emails read
  // *"…para el jueves, 17 de septiembre de 2026 **at** 10:00 AM"*. The sentence
  // around it translated perfectly, which is what made it invisible: nothing
  // was missing, nothing errored, and the one English word was in the middle
  // of a Spanish paragraph. Spanish says *a las*, not *at*.
  //
  // `{date} at {time}` is its own key because `when` is interpolated into
  // three different sentences below and the joint has to travel with it.
  const when = tt("{date} at {time}", {
    date: `<strong class="c-ink" style="color:${G.ink};">${esc(dateLong)}</strong>`,
    time: `<strong class="c-ink" style="color:${G.ink};">${formatTime12hr(b.startTime)}</strong>`,
  });
  const up = upcoming(brand, b.dateStr, b.startTime, b.lang);

  const blocks = kind === "quote"
    ? [
      labBlock(tt("Quote")),
      headlineBlock(tt("Here's your price")),
      proseBlock(tt("We've had a look at what you asked for on {when}, and here's what we can do it for.", { when })),
      markBlock(brand, [money(Number(opts.quotedAmount ?? 0)), tt("Our price for this job")]),
      opts.quotedNote ? proseBlock(esc(opts.quotedNote), 22) : "",
      noteBlock(`${esc(tt("We're still holding {date} at {time} for you.", { date: dateLong, time: formatTime12hr(b.startTime) }))} <strong class="c-ink2" style="color:${G.ink2};">${esc(tt("Nothing is charged until you say yes."))}</strong>`),
      ownWords(brand, "quote"),
      buttonBlock(brand, tt("Look it over"), opts.manageUrl),
      signOff(brand, b.lang),
    ].filter(Boolean)
    : kind === "accepted"
    ? [
      labBlock(tt("Request accepted")),
      headlineBlock(tt("You're confirmed")),
      proseBlock(tt("Good news. We've accepted your request for {when}. It's on the calendar.", { when })),
      markBlock(brand, [dateLong, `${formatTime12hr(b.startTime)} &ndash; ${formatTime12hr(b.endTime)}`]),
      factsBlock(jobFacts(brand, b, b.lang)),
      // ---------------------------------------------------------------------
      // THE MONEY, ADDED 2026-09-13 — Andrew's decision, not a session's.
      // ---------------------------------------------------------------------
      // **"You're booked in" is the ONLY email a request-mode customer ever
      // gets that says the job is happening.** Their first one says "we're
      // holding your time" and explicitly charges nothing, and
      // `respond-to-booking` writes `total_price` and nulls `quoted_amount` in
      // the same update — so until this block existed, nobody was shown the
      // figure at the moment it became binding. Neither the detailer pressing
      // Accept (`FOUND.md`: the card does not say which number Accept will
      // use) nor the customer reading this. That is a money path with no
      // statement of the amount on it, which is what CLAUDE.md's *a number
      // PRINTED is not a number CHARGED* is about.
      //
      // **THESE ARE THE CONFIRMATION EMAIL'S OWN FOUR LINES, VERBATIM**, and
      // copying rather than rewording is the point: the two emails describe the
      // same number and a second set of words for one fact is a second voice.
      //
      // **THE WORD "ESTIMATED" STAYS, AND HE DECIDED THAT TOO.** For detailing
      // the price genuinely can move once the vehicle is in front of them, so
      // calling it settled here would be a promise he cannot keep — and the two
      // emails must not describe one number two different ways.
      //
      // `b.total` is right for BOTH ways a booking arrives here: accepting
      // leaves `total_price` alone, and `accept-quote` has already moved the
      // quoted amount into it. No branch on `kind` is needed or wanted.
      ruleBlock(34),
      labBlock(tt("What we're doing")),
      moneyBlock(brand, quoteLines(b, b.lang), { label: tt("Estimated total"), amount: Number(b.total) }),
      fineBlock(tt("An estimate. If the vehicle's condition needs more time than expected we'll tell you before we start, never after.")),
      // ROADMAP 2.20 STAGE 1, AND THIS IS THE CONFIRMATION FOR HALF THE
      // TENANTS. In request mode the customer's first email says "we're
      // holding your time" and explicitly charges nothing; THIS is the one
      // that says the job is happening. Leaving it out because the roadmap's
      // sentence says "the confirmation" would give every request-mode
      // business no payment handles on the only email that confirms anything.
      paymentBlock(brand, tt("Nothing to pay now. This is for when the work is done."), b.lang),
      ownWords(brand, "accepted"),
      buttonBlock(brand, tt("View or change your booking"), opts.manageUrl),
      keepLink(b.lang),
      signOff(brand, b.lang),
    ].filter(Boolean)
    : [
      labBlock(tt("Request declined")),
      headlineBlock(tt("We can't make that one")),
      proseBlock(tt("Sorry, we can't make {when} work.", {
        when: `<strong class="c-ink" style="color:${G.ink};">${esc(up.when)}</strong>`,
      })),
      ownWords(brand, "declined"),
      buttonBlock(brand, tt("Pick another time"), brand.siteUrl),
      signOff(brand, b.lang),
    ].filter(Boolean);

  const subject = kind === "accepted"
    ? tt("Confirmed: {when}", { when: up.when })
    : kind === "declined"
    ? tt("About your request for {day}", { day: up.day })
    : tt("Your price is ready: {amount}", { amount: money(Number(opts.quotedAmount ?? 0)) });

  return mail(subject, shell(brand, blocks, subject, { lang: b.lang }));
}

// ---------------------------------------------------------------------------
// 4 · CUSTOMER — RECEIPT (paid) / INVOICE (still owed)
//
// SPLIT FROM ONE EMAIL INTO TWO PROMISES. Five of the six products in the
// sweep send a payment receipt as its own thing, and ours had been sending a
// document headed "invoice" for money it had already taken.
//
// **THE ITEMISATION REACHES THE TOTAL.** The old one did not — its rows summed
// to `subtotalBase` while its total was `final_amount`, so the promo, the site
// sale and the rounding were all missing from the column. `send-invoice` now
// passes every line including the discounts, and `render-emails.mjs` refuses
// to pass while they do not add up. CLAUDE.md: a number printed is not a
// number charged, and an invoice is that risk one step further along, because
// it goes to the one party who checks it against a card statement.
// ---------------------------------------------------------------------------
export function invoiceEmail(
  brand: TenantBrand,
  b: BookingEmailData,
  rows: InvoiceRow[],
  totals: { chargesSubtotal: number; discountsTotal: number; tipTotal: number; totalPaid: number },
  paymentStatus: string,
  paymentNotes: string | null,
  /**
   * ROADMAP 2.20 STAGE 3 — may this customer be offered a card button.
   *
   * IT DEFAULTS TO FALSE, which is the answer for every business that has not
   * connected a Stripe account and switched card on — all of them until one
   * does. `send-invoice` asks `cardStatus` for it; nothing in here decides.
   */
  cardReady = false,
): Mail {
  const tt = T(b.lang);
  const ref = String(b.id).split("-")[0].toUpperCase();
  const paid = String(paymentStatus).toLowerCase() === "paid";
  const dateLong = formatDateLong(b.dateStr, b.lang);

  const lines = reconcile(
    rows.map((r) => ({
      // THE ROW LABELS ARE THE DETAILER'S OWN LINE ITEMS and stay as typed.
      label: r.qty > 1 ? `${r.label} ×${r.qty}` : r.label,
      amount: Math.abs(Number(r.lineTotal)),
      kind: (r.kind === "discount" || Number(r.lineTotal) < 0 ? "discount" : "charge") as MoneyLine["kind"],
    })),
    Number(totals.totalPaid),
    b.lang,
  );

  const blocks = [
    labBlock(paid ? tt("Receipt") : tt("Invoice")),
    headlineBlock(paid ? tt("Paid in full, thank you") : tt("Here's your invoice")),
    // ROADMAP 99.2d — the approved wording. `dateLong` stays the explicit
    // weekday, month and day (no "today"/"tomorrow"): a receipt or an invoice
    // is a record of a day that has passed.
    proseBlock(paid
      ? tt("Thanks, {first}. Here's your receipt for {date}.",
        { first: esc(firstName(b.customerName)), date: esc(dateLong) })
      : tt("Hi {first}, here's the bill for {date}.",
        { first: esc(firstName(b.customerName)), date: esc(dateLong) })),
    factsBlock([
      [tt("Reference"), `<span class="c-ink" style="font-family:'SF Mono',Menlo,Consolas,monospace;">${esc(ref)}</span>`],
      vehicleFact(b, b.lang),
      [tt("Service"), b.serviceType === "mobile" ? tt("Mobile") : tt("Drop-off")],
    ]),
    ruleBlock(34),
    labBlock(tt("The work")),
    // NAMED, NOT PRICED. The prices of the individual services are not what was
    // charged — `total_price` is, and the customer's confirmation email already
    // itemises how that figure was reached. Printing per-service prices here
    // would be a second, re-derived version of a number that is not in doubt,
    // which is exactly the shape that kept this invoice wrong.
    b.serviceNames.length || b.addOnNames.length
      ? proseBlock(
        [...b.serviceNames, ...b.addOnNames.map((a) => tt("{name} (add-on)", { name: a }))]
          .map((sv) => `<div style="padding:4px 0;">${esc(sv)}</div>`).join(""),
        12,
      )
      : "",
    ruleBlock(26),
    labBlock(paid ? tt("What you paid") : tt("What is due")),
    moneyBlock(brand, lines, {
      label: paid ? tt("Total paid") : tt("Amount due"),
      amount: Number(totals.totalPaid),
    }),
    // ROADMAP 2.20 STAGE 1 — AND `paid` IS THE WHOLE POINT OF THE BRANCH.
    // The owner's complaint about his own old site was that its invoice listed
    // the payments he accepts for money the customer had already handed over.
    // A receipt proves; an invoice asks. Only the one that asks says how.
    paid ? "" : paymentBlock(brand, "", b.lang),
    paymentNotes ? proseBlock(`<strong class="c-ink" style="color:${G.ink};">${esc(tt("Notes"))}</strong><br>${esc(paymentNotes)}`, 26) : "",
    ownWords(brand, paid ? "receipt" : "invoice"),
    // ROADMAP 2.20 STAGE 3 — THE SAME URL, RELABELLED. The button has always
    // gone to `/booking/:id`, and that page is where the Pay button lives —
    // so an unpaid invoice from a business that takes cards says what pressing
    // it is FOR, and everything else is unchanged.
    //
    // A LINK, NEVER A CHECKOUT. An email cannot create a payment: a Stripe
    // session made when the invoice was WRITTEN would carry the amount owed
    // that morning and would still be sitting in the inbox after the customer
    // handed over cash. The page asks the server at the moment of the press,
    // which is the only time the answer is true.
    buttonBlock(
      brand,
      !paid && cardReady
        ? tt("Pay {amount} by card", { amount: money(Number(totals.totalPaid)) })
        : tt("View online"),
      b.receiptUrl,
    ),
    fineBlock(tt("Keep this for your records. Reply to this email if anything looks wrong.")),
    signOff(brand, b.lang),
  ].filter(Boolean);

  return mail(
    paid
      ? tt("Your receipt from {brand}: {amount}",
        { amount: money(Number(totals.totalPaid)), brand: brand.brandName })
      : tt("Invoice from {brand}: {amount} due",
        { amount: money(Number(totals.totalPaid)), brand: brand.brandName }),
    shell(brand, blocks, paid
      ? tt("Paid in full · {amount}.", { amount: money(Number(totals.totalPaid)) })
      : tt("{amount} due.", { amount: money(Number(totals.totalPaid)) }),
      { lang: b.lang }),
  );
}

// ---------------------------------------------------------------------------
// 5 · CUSTOMER — THANK YOU AND REVIEW REQUEST
//
// Five of six products send one; ours already did. The old referral & loyalty
// blurb stays gone (the referral system was removed platform-wide).
// ---------------------------------------------------------------------------
export function followupEmail(brand: TenantBrand, name: string, lang?: unknown): Mail {
  // THE LANGUAGE IS AN ARGUMENT HERE RATHER THAN A FIELD, because this one
  // takes a NAME rather than a booking — it is sent after a job, from the
  // sweep, and the sender is the one holding the row that knows.
  const tt = T(lang);
  const links = [
    brand.googleReviewUrl ? [tt("Leave a Google review"), brand.googleReviewUrl] : null,
    brand.yelpReviewUrl ? [tt("Leave a Yelp review"), brand.yelpReviewUrl] : null,
  ].filter(Boolean) as [string, string][];

  const blocks = [
    labBlock(tt("Thank you")),
    headlineBlock(tt("Thanks for trusting us with it")),
    // ROADMAP 99.2d — ONE SHORT PARAGRAPH, then the review buttons, then the
    // sign-off. The review ask is part of the paragraph when there is somewhere
    // to leave a review, and the paragraph says nothing about one when there is not.
    proseBlock(links.length
      ? tt("Hi {first}, thanks for choosing {brand}. If you were happy with the work, a quick review really helps a small business like ours.",
        { first: esc(firstName(name)), brand: esc(brand.brandName) })
      : tt("Hi {first}, thanks for choosing {brand}. We appreciate the chance to take care of your vehicle.",
        { first: esc(firstName(name)), brand: esc(brand.brandName) })),
    ownWords(brand, "followup"),
    ...links.map(([label, href]) => buttonBlock(brand, label, href)),
    signOff(brand, lang),
  ].filter(Boolean);

  return mail(
    tt("Thanks from {brand}", { brand: brand.brandName }),
    shell(brand, blocks, tt("Thank you from {brand}", { brand: brand.brandName }), { lang }),
  );
}

// ---------------------------------------------------------------------------
// 6 · CUSTOMER — APPOINTMENT REMINDER (the settings-driven sweep sends this)
// ---------------------------------------------------------------------------
export function customerReminderEmail(
  brand: TenantBrand,
  b: BookingEmailData,
  /** The SECOND reminder, if the business has one switched on. It differs only
   *  in which paragraph the detailer gets to attach — same facts, same job. */
  second = false,
): Mail {
  const tt = T(b.lang);
  const dateLong = formatDateLong(b.dateStr, b.lang);
  const blocks = [
    labBlock(tt("Reminder")),
    headlineBlock(tt("See you soon")),
    proseBlock(tt("Hi {first}, a quick reminder about your appointment with {brand}.",
      { first: esc(firstName(b.customerName)), brand: esc(brand.brandName) })),
    markBlock(brand, [dateLong, `${formatTime12hr(b.startTime)} &ndash; ${formatTime12hr(b.endTime)}`]),
    factsBlock(jobFacts(brand, b, b.lang)),
    paymentBlock(brand, tt("For when the work is done."), b.lang),
    ownWords(brand, second ? "reminder_2" : "reminder"),
    buttonBlock(brand, tt("View or change your booking"), b.receiptUrl),
    keepLink(b.lang),
    signOff(brand, b.lang),
  ].filter(Boolean);
  return mail(
    tt("Reminder: your appointment {date}", { date: dateLong }),
    shell(brand, blocks,
      tt("Reminder: {date} at {time}", { date: dateLong, time: formatTime12hr(b.startTime) }),
      { lang: b.lang }),
  );
}

// ---------------------------------------------------------------------------
// 7 · CANCELLED — customer or owner
//
// `--bad` is the fixed red and it does NOT follow the tenant (law 11b: the
// accent is identity, never meaning). A cancellation is the one email in the
// set that spends it.
// ---------------------------------------------------------------------------
export function cancellationEmail(brand: TenantBrand, b: BookingEmailData, forOwner: boolean, ownerLang?: unknown): Mail {
  // **ONE TEMPLATE, TWO AUDIENCES, TWO LANGUAGES.** The customer's half reads
  // `b.lang`, the booking's. The owner's half reads `ownerLang` — the
  // RECIPIENT's dashboard language (ROADMAP 3.4 FAULT 4, DECISIONS.md
  // 2026-10-06), English when unknown — so a Spanish booking still never turns
  // an English-reading detailer's alert Spanish.
  const lang = forOwner ? ownerLang : b.lang;
  const tt = T(lang);
  const dateLong = formatDateLong(b.dateStr, lang);
  const blocks = forOwner
    ? [
      labBlock(tt("Cancelled"), "bad"),
      headlineBlock(b.customerName),
      proseBlock(tt("{date} at {time} is cancelled. The slot is open again.", {
        date: `<strong class="c-ink" style="color:${G.ink};">${esc(dateLong)}</strong>`,
        time: `<strong class="c-ink" style="color:${G.ink};">${formatTime12hr(b.startTime)}</strong>`,
      })),
      factsBlock([
        [tt("Phone"), esc(b.customerPhone)],
        [tt("Was worth"), money(Number(b.total))],
      ]),
      // ROADMAP 14.4 — THE MONEY, WHICH THIS EMAIL USED TO SAY NOTHING ABOUT.
      // A confirmed, already-paid booking could be cancelled by the customer
      // from their own link and the detailer's only notice was this email,
      // which told them the slot was free and left a paid job's money sitting
      // in their Stripe balance with nothing anywhere saying so.
      //
      // IT IS AN INSTRUCTION, NOT A REFUND. The charge was a direct charge on
      // the detailer's own connected account — `_shared/connect.ts` explains
      // why the platform must not reach into it — so the only correct thing
      // the product can do is put the sentence in front of the one person who
      // can act on it.
      b.refundNote ? noteBlock(`<strong class="c-ink" style="color:${G.ink};">${esc(b.refundNote)}</strong>`) : "",
    ].filter(Boolean)
    : [
      labBlock(tt("Cancelled"), "bad"),
      headlineBlock(tt("Your booking is cancelled")),
      proseBlock(tt("Hi {first}, your booking with {brand} for {date} at {time} has been cancelled.", {
        first: esc(firstName(b.customerName)),
        brand: esc(brand.brandName),
        date: `<strong class="c-ink" style="color:${G.ink};">${esc(dateLong)}</strong>`,
        time: `<strong class="c-ink" style="color:${G.ink};">${formatTime12hr(b.startTime)}</strong>`,
      })),
      // ROADMAP 3.4 FOLLOW-UP — THE SAME FACT THE OWNER'S HALF ALREADY GETS,
      // WITHOUT THE FIGURE. `refundOwed` on this row is the SAME test
      // `refundNote` (above) is built from, so the two halves can never
      // disagree about whether money is an open question — only about how
      // much either is told. No amount and no mention of Stripe or a
      // balance: the customer already saw the number on their own
      // confirmation email, and inventing a second one here is a sentence
      // nobody chose to send.
      b.refundOwed
        ? noteBlock(
          `<strong class="c-ink" style="color:${G.ink};">${tt(
            "You paid for this booking. {brand} will arrange your refund directly.",
            { brand: esc(brand.brandName) },
          )}</strong>`
          + (brand.contactPhone
            ? ` ${tt("Call {phone} if you have not heard from them.", { phone: esc(brand.contactPhone) })}`
            : ""),
        )
        : "",
      // ROADMAP 99.2c — the approved line and a button replace a bare web
      // address. The sentence above still names which appointment it was.
      proseBlock(tt("This one's off the calendar. Whenever you're ready, booking again takes a minute.")),
      ownWords(brand, "cancelled"),
      buttonBlock(brand, tt("Book again"), brand.siteUrl),
      signOff(brand, lang),
    ].filter(Boolean);
  // "Your Friday appointment" reads; "Your today appointment" does not, so the
  // two near days take the other word order.
  const up = upcoming(brand, b.dateStr, null, lang);
  return mail(
    forOwner
      ? tt("Cancelled · {name} · {date}", { name: b.customerName, date: dateLong })
      : up.near
      ? tt("Your appointment {day} is cancelled", { day: up.day })
      : tt("Your {day} appointment is cancelled", { day: up.day }),
    shell(brand, blocks, tt("Cancelled: {date}", { date: dateLong }), { lang }),
  );
}

// ---------------------------------------------------------------------------
// 8 · RESCHEDULED — customer or owner
//
// The OLD time is struck through and quiet; the NEW one takes the accent mark.
// A reschedule email whose two times look alike is the one that gets somebody
// turning up on the wrong day.
// ---------------------------------------------------------------------------
export function rescheduleEmail(
  brand: TenantBrand,
  b: BookingEmailData,
  oldDateStr: string,
  oldStartTime: string,
  forOwner: boolean,
  ownerLang?: unknown,
): Mail {
  // See `cancellationEmail` above: one template, two audiences, each in its
  // own reader's language.
  const lang = forOwner ? ownerLang : b.lang;
  const tt = T(lang);
  const dateLong = formatDateLong(b.dateStr, lang);
  const oldLong = formatDateLong(oldDateStr, lang);
  const blocks = [
    labBlock(tt("Rescheduled")),
    headlineBlock(forOwner ? b.customerName : tt("Your booking has moved")),
    proseBlock(forOwner
      ? tt("{name} moved their booking.", { name: `<strong class="c-ink" style="color:${G.ink};">${esc(b.customerName)}</strong>` })
      : tt("Your appointment moved. Here's the new time.")),
    // ROADMAP 3.4 finding 3, the second of the two sites. The struck-through
    // OLD time was built entirely outside the lookup, so a Spanish reschedule
    // read *"sábado, 12 de septiembre de 2026 at 8:00 AM"* — and this is the
    // line a customer reads to check they are not about to turn up on the
    // wrong day, which is the one place in the set a half-translated sentence
    // costs somebody a wasted morning.
    // **AND IT SAYS "WAS" IN WORDS — ROADMAP 3.4, FAULT 1, fixed 2026-09-24.**
    // The strikethrough stays, and it is no longer the only thing carrying the
    // meaning. `htmlToText` drops `text-decoration`, because that is what
    // converting to text does — so the plain-text half read *"has been moved. /
    // Saturday, September 12, 2026 at 8:00 AM / Thursday, September 17, 2026"*:
    // **two datetimes and not one word saying which was the old one.** A
    // customer reads this line to check they are not about to turn up on the
    // wrong day, and the half that lost the distinction is the one a plain-text
    // client, a styles-stripping client and most screen readers get.
    // **`"Was {date} at {time}"` is its own key rather than a prefix glued onto
    // `"{date} at {time}"`** — that key is shared with the quote template
    // (`"We're still holding …"` at line ~664), so editing it would have moved
    // a sentence this fault has nothing to do with, and Spanish puts the label
    // somewhere English does not.
    proseBlock(`<span style="color:${G.fog2}; text-decoration:line-through;">${tt("Was {date} at {time}", { date: esc(oldLong), time: formatTime12hr(oldStartTime) })}</span>`, 24),
    markBlock(brand, [dateLong, `${formatTime12hr(b.startTime)} &ndash; ${formatTime12hr(b.endTime)}`]),
    factsBlock(jobFacts(brand, b, lang)),
    forOwner ? "" : ownWords(brand, "rescheduled"),
    buttonBlock(brand, forOwner ? tt("Open the job") : tt("View your booking"), b.receiptUrl),
    forOwner ? "" : signOff(brand, lang),
  ].filter(Boolean);
  return mail(
    forOwner
      ? tt("Rescheduled · {name} · now {date}", { name: b.customerName, date: dateLong })
      : tt("New time: {when}", { when: upcoming(brand, b.dateStr, b.startTime, lang).when }),
    shell(brand, blocks, tt("Rescheduled to {date}", { date: dateLong }), { lang }),
  );
}

// ---------------------------------------------------------------------------
// 9 · OWNER — A REQUEST NOBODY ANSWERED (roadmap 2.12 follow-up)
//
// Goes to the DETAILER, so it says what to do rather than apologising. Short
// on purpose: it is a nudge, and the thing it nudges toward is one tap away in
// the dashboard, not in this email.
// ---------------------------------------------------------------------------
export function staleRequestEmail(brand: TenantBrand, b: BookingEmailData, hoursWaited: number, lang?: unknown): Mail {
  // `lang` is the RECIPIENT's dashboard language — see `ownerNewBookingEmail`.
  const tt = T(lang);
  const dateLong = formatDateLong(b.dateStr, lang);
  const when = {
    date: `<strong class="c-ink" style="color:${G.ink};">${esc(dateLong)}</strong>`,
    time: `<strong class="c-ink" style="color:${G.ink};">${formatTime12hr(b.startTime)}</strong>`,
    hours: hoursWaited,
  };
  const blocks = [
    labBlock(tt("Still waiting on you"), "bad"),
    headlineBlock(b.customerName),
    proseBlock(hoursWaited === 1
      ? tt("asked for {date} at {time}. That was {hours} hour ago, and it is still waiting for an answer.", when)
      : tt("asked for {date} at {time}. That was {hours} hours ago, and it is still waiting for an answer.", when)),
    proseBlock(tt("That time is held for them until you accept or decline it, so nobody else can book it either."), 16),
    factsBlock([
      [tt("Phone"), esc(b.customerPhone)],
      ...(b.customerEmail ? [[tt("Email"), esc(b.customerEmail)] as [string, string]] : []),
      ownerWhereRow(brand, b, lang),
      [tt("Asking"), money(Number(b.total))],
    ]),
    buttonBlock(brand, tt("Answer this request"), b.receiptUrl),
  ];
  return mail(
    tt("Still waiting: {name} · {date}", { name: b.customerName, date: dateLong }),
    shell(brand, blocks, tt("{name} asked for {date} and has not heard back.", { name: b.customerName, date: dateLong }), { lang }),
  );
}

// ---------------------------------------------------------------------------
// 10 · STAFF — TEAM INVITE
// ---------------------------------------------------------------------------
export function inviteEmail(
  brand: TenantBrand,
  opts: { role: string; label?: string | null; link: string; expiresAt: string },
  // The INVITEE's dashboard language, which is almost always unknown (they
  // have not signed in yet) and so English — `recipientLang` answers it.
  lang?: unknown,
): Mail {
  const tt = T(lang);
  // The detailer's own word for the role when they gave one (roadmap 2.13).
  // "as a Detailer" reads as their business; "as a staff member" reads as ours.
  // The label is THEIR word and is never translated; Spanish takes no article
  // before it ("como Detailer"), English picks a/an.
  const named = opts.role !== "owner" && opts.label?.trim();
  const roleWord = opts.role === "owner"
    ? tt("an owner")
    : named
      ? langOf(lang) === "es"
        ? opts.label!.trim()
        : `${/^[aeiou]/i.test(opts.label!.trim()) ? "an" : "a"} ${opts.label!.trim()}`
      : tt("a staff member");
  const expires = formatDateLong(String(opts.expiresAt).slice(0, 10), lang);
  const blocks = [
    labBlock(tt("Invitation")),
    headlineBlock(tt("You've been added to the team")),
    proseBlock(tt("{brand} has invited you to join their booking dashboard as {role}.", { brand: esc(brand.brandName), role: esc(roleWord) })),
    proseBlock(tt("Use the button below to set your password and sign in."), 16),
    buttonBlock(brand, tt("Set up your account"), opts.link),
    fineBlock(tt("This link works until {date}. If the button doesn't work, open: {url}", { date: expires, url: opts.link })),
  ];
  return mail(
    tt("Join {brand} on the booking dashboard", { brand: brand.brandName }),
    shell(brand, blocks, tt("{brand} invited you to their dashboard.", { brand: brand.brandName }), { lang }),
  );
}

// ---------------------------------------------------------------------------
// 11 · CUSTOMER — YOUR PLAN LINK (roadmap 2.14 step 3)
//
// THE SAFE HALF OF "TYPE YOUR EMAIL AND IT SHOWS YOU". The owner asked for a
// lookup that displays a person's plan on the page; that is address
// enumeration, and the twin that is one word different is EMAIL IN, LINK OUT —
// nothing is displayed, the link arrives in the inbox that owns the address.
// `plan-link`'s `email` action returns the same answer whether or not the
// address is a member, so this email existing at all is the only signal, and
// it only ever reaches the person entitled to it.
// ---------------------------------------------------------------------------
export function planLinkEmail(
  brand: TenantBrand,
  opts: { customerName: string; planName: string; planUrl: string; bookUrl: string },
  lang?: unknown,
): Mail {
  // **THE LANGUAGE COMES FROM THE REQUEST, NOT FROM A ROW.** This email is
  // sent from the plans PAGE — somebody typed their address into the box — so
  // there is no booking to read it off, and the browser that asked is the only
  // thing that knows. `plan-link` passes what the page sent.
  const tt = T(lang);
  const blocks = [
    labBlock(tt("Your plan")),
    headlineBlock(tt("Here's your link")),
    proseBlock(tt("Hi {first}. You're on {plan} with {brand}.", {
      first: esc(firstName(opts.customerName)),
      plan: `<strong class="c-ink" style="color:${G.ink};">${esc(opts.planName)}</strong>`,
      brand: esc(brand.brandName),
    })),
    proseBlock(tt("The button below opens your plan: what you're on, when your next visit is due, and how to book it."), 16),
    buttonBlock(brand, tt("Open your plan"), opts.planUrl),
    fineBlock(tt("Keep this email. That link is the only way back to your plan. To book any time: {url}",
      { url: opts.bookUrl })),
    signOff(brand, lang),
  ];
  return mail(
    tt("Your plan with {brand}", { brand: brand.brandName }),
    shell(brand, blocks, tt("{plan} · your link is inside.", { plan: opts.planName }), { lang }),
  );
}

// ---------------------------------------------------------------------------
// 12 · OWNER — SOMEBODY LEFT A PLAN (roadmap 2.14 step 3)
//
// The customer can end their own plan from their link, which is the same
// medium they joined in — the thing California's cancellation rule asks for
// and, more immediately, the thing that stops a cancellation being a phone
// call the detailer has to answer. **So the detailer has to be TOLD**, or a
// member quietly disappears from the visits-owed list with no event anywhere.
// Best-effort, like every send in this product: a dead relay must never leave
// a customer unable to leave.
// ---------------------------------------------------------------------------
export function planCancelledEmail(
  brand: TenantBrand,
  opts: { customerName: string; planName: string; startedOn: string; endedOn: string },
  // The RECIPIENT's dashboard language — see `ownerNewBookingEmail`.
  lang?: unknown,
): Mail {
  const tt = T(lang);
  const blocks = [
    labBlock(tt("Plan ended"), "bad"),
    headlineBlock(opts.customerName),
    proseBlock(tt("ended their {plan} from their own plan page. Nothing else has changed. Any booking already on your calendar is still there.", {
      plan: `<strong class="c-ink" style="color:${G.ink};">${esc(opts.planName)}</strong>`,
    })),
    factsBlock([
      [tt("Plan"), esc(opts.planName)],
      [tt("Member since"), formatDateLong(String(opts.startedOn).slice(0, 10), lang)],
      [tt("Ended"), formatDateLong(String(opts.endedOn).slice(0, 10), lang)],
    ]),
    fineBlock(tt("They can join again whenever they like; the record of what they were owed is kept either way.")),
  ];
  return mail(
    tt("{name} ended their plan", { name: opts.customerName }),
    shell(brand, blocks, tt("{name} ended {plan}.", { name: opts.customerName, plan: opts.planName }), { lang }),
  );
}

// ---------------------------------------------------------------------------
// 13 · CUSTOMER — THE DETAILER REACHING OUT (roadmap 2.19)
//
// THE ONLY EMAIL IN THIS FILE THE PRODUCT NEVER SENDS BY ITSELF. Every other
// template above is triggered by something that happened — a booking, a
// cancellation, a payment, a cron sweep. This one exists because a detailer
// picked some names off their own Clients list, typed a sentence and pressed
// send. The owner drew that line himself (2026-09-03): *"Don't have one that
// automatically messaged… just have it, like, the business person whoever is
// running it could send out email to someone that they want."*
//
// AND IT IS THE ONLY COMMERCIAL ONE, WHICH IS WHY IT LOOKS DIFFERENT AT THE
// BOTTOM. CAN-SPAM classifies a message by its primary purpose, not by what
// pressed the button, so *"we haven't seen you in a while"* needs a postal
// address and a working opt-out whether a human or a schedule sent it. Both
// land in the footer through `shell`'s optional `legal` argument, and no other
// template gains a byte.
//
// THE SUBJECT IS THE HEADLINE, ON PURPOSE. A detailer writing this is typing
// one sentence about why they are getting in touch; making them type it twice
// — once for the subject line and once for the top of the email — is the kind
// of form that gets abandoned halfway. One field, two jobs.
//
// THE GREETING IS OURS AND THE WORDS ARE THEIRS. A detailer composing to
// fourteen people cannot write fourteen names, and the name is most of what
// separates this from a blast. Their paragraph is escaped before its newlines
// become `<br>` — the same order `ownWords` uses, and for the same reason:
// the other way round lets a typed message inject markup into every copy.
// ---------------------------------------------------------------------------
export interface CampaignEmailData {
  customerName: string;
  /** The detailer's own subject line. Also the headline. */
  subject: string;
  /** The detailer's own words, as typed — plain text, newlines and all. */
  message: string;
  /** Where "Book again" goes: the business's booking page. */
  bookUrl: string;
  /** The customer's own opt-out link. Required — see the header above. */
  unsubscribeUrl: string;
  /** The business's postal address. Required, same reason. */
  mailingAddress: string;
}

export function campaignEmail(brand: TenantBrand, c: CampaignEmailData, lang?: unknown): Mail {
  // **ONLY THE CHROME.** The subject, the headline and the body are the
  // detailer's own words, in whatever language they typed them — translating a
  // person's own message is the one thing this feature must never do. What we
  // wrote is the greeting, the button, and the footer's legal half, and those
  // follow the reader.
  const tt = T(lang);
  const words = esc(String(c.message).trim()).split(/\r?\n\s*/).join("<br>");
  const blocks = [
    labBlock(tt("Checking in")),
    headlineBlock(c.subject),
    proseBlock(tt("Hello {first},", { first: esc(firstName(c.customerName)) })),
    proseBlock(words, 10),
    buttonBlock(brand, tt("Book again"), c.bookUrl),
  ];
  return mail(
    c.subject,
    shell(
      brand,
      blocks,
      // The preheader is the start of what they actually wrote, not a
      // restatement of the subject sitting next to it in the inbox.
      String(c.message).trim().replace(/\s+/g, " ").slice(0, 90),
      { legal: { mailingAddress: c.mailingAddress, unsubscribeUrl: c.unsubscribeUrl }, lang },
    ),
  );
}

// ---------------------------------------------------------------------------
// 14 · DETAILER — THE PLATFORM'S OWN BILLING (roadmap 2.20 stage 2)
//
// THE ONLY TEMPLATE IN THIS FILE THAT IS NOT FROM A DETAILER TO SOMEBODY ELSE.
// The other thirteen carry a tenant's brand because a tenant is speaking. This
// one is US speaking to the tenant, so `_shared/platformBrand.ts` builds a
// `TenantBrand` for the platform itself and `send-email` is told the sender
// name explicitly.
//
// IT EXISTS BECAUSE `/pricing` PRINTS A PROMISE AND SOMETHING HAS TO KEEP IT:
//
//   "we try the card again over the following two weeks and email you each
//    time. If it still has not gone through after that, the site goes offline
//    until it is paid. Nothing is deleted."
//
// Stripe can send its own failed-payment emails, and should — but that is a
// checkbox in another company's dashboard, and a legally load-bearing promise
// resting on a setting nobody in this repo can read is a promise resting on
// nothing. Stripe's copy is the belt; this is the braces. **The suspension
// half it cannot send at all**: Stripe knows a subscription went unpaid and
// knows nothing about a booking page going dark.
//
// ONE TEMPLATE, TWO KINDS, because they are the same email at two moments and
// splitting them would be two files that have to keep agreeing about what
// happens next. The difference is one headline and one sentence.
//
// **NOTHING IS DELETED — say it in both.** It is the sentence that stops a
// detailer whose site just went offline from assuming their customer list went
// with it, and it is the difference between a support email and a panic.
// ---------------------------------------------------------------------------

export interface BillingEmailData {
  kind: "failed" | "suspended";
  /** WHOSE booking page this is about. NOT `brand.brandName` — that is the
   *  PLATFORM here, because the masthead and the footer say who SENT the
   *  email and this says what it is about. */
  businessName: string;
  /** Where the billing screen is. The one link in the email. */
  billingUrl: string;
  /** What the card was declined for, in dollars — printed, never guessed. */
  amount: number;
  /** The provider's own reason, when Stripe gave one. */
  reason?: string | null;
  /** Stripe's decline code (`insufficient_funds`, …). When it is one we know,
   *  the email says it in OUR words in the reader's language and `reason` is
   *  not printed; an unknown code falls back to `reason` as given. */
  reasonCode?: string | null;
}

// ---------------------------------------------------------------------------
// THE PLATFORM TELLING ITS OWNER SOMETHING — roadmap 8.6.
//
// **R2, and he believed it already worked:** *"I'll get an email if someone
// signs up and whatnot. I hope you set that all up."* **Nothing in this
// product emailed him about anything** — not a signup, not a first payment,
// not a churn. Every one of the twenty-five templates before this is a
// DETAILER speaking to a customer, or us speaking to a detailer about their
// card. This is the first that is the platform speaking to the person who
// owns it.
//
// **ONE TEMPLATE, NOT ONE PER EVENT.** A signup, a first payment and — when
// 8.12 lands — a job that has stopped reporting are the same shape: a
// headline, a sentence, a short list of facts, and somewhere to go. Twelve
// near-identical templates is how the set drifts; the events differ in their
// WORDS, which is what the caller passes.
//
// It rides `platformBrand`, so it looks like the two billing emails and is
// sent with `sender_name` — the flag that stops the send being recorded
// against a customer and drops the tenant Reply-To.
// ---------------------------------------------------------------------------

export interface PlatformAlertData {
  /** The small label above the headline — what KIND of thing happened. */
  kind: string;
  headline: string;
  /** One or two sentences. Already escaped by the caller if it interpolates. */
  intro: string;
  /** Name/value rows. Empty is fine — a bare headline is a valid alert. */
  facts?: [string, string][];
  buttonLabel?: string;
  buttonUrl?: string;
}

/**
 * ROADMAP 3.4 FAULT 4 — THE SIGNUP ALERT'S WORDS, IN ONE PLACE. They were typed
 * in `create-business` and copied into the render fixture, so the fixture could
 * agree with itself while the real one drifted, and no lookup could reach them.
 * The values are escaped: `factsBlock` takes a value as raw HTML, and a business
 * name is whatever somebody typed into the signup form.
 */
export function newDetailerAlert(
  d: { business: string; bookingPage: string; signedUpBy: string; adminUrl: string },
  lang?: unknown,
): PlatformAlertData {
  const tt = T(lang);
  return {
    kind: tt("New detailer"),
    headline: tt("{business} just signed up", { business: d.business }),
    intro: tt("Somebody created an account and a business. Nothing has been paid yet. You will get a second email when they subscribe."),
    facts: [
      [tt("Business"), esc(d.business)],
      [tt("Booking page"), esc(d.bookingPage)],
      [tt("Signed up by"), esc(d.signedUpBy)],
    ],
    buttonLabel: tt("Open the back office"),
    buttonUrl: d.adminUrl,
  };
}

/** `lang` is the RECIPIENT's dashboard language and sets only the frame (the
 *  `<html lang>` and the footer); the words are the caller's — build them with
 *  a helper like `newDetailerAlert` so they can be looked up. */
export function platformAlertEmail(brand: TenantBrand, a: PlatformAlertData, lang?: unknown): Mail {
  const blocks = [
    labBlock(a.kind),
    headlineBlock(a.headline),
    proseBlock(a.intro),
    ...(a.facts && a.facts.length ? [factsBlock(a.facts)] : []),
    ...(a.buttonLabel && a.buttonUrl ? [buttonBlock(brand, a.buttonLabel, a.buttonUrl)] : []),
  ].filter(Boolean);
  const html = shell(brand, blocks, a.headline, { lang });
  return { subject: a.headline, html, text: htmlToText(html) };
}

/**
 * WHY THE CARD FAILED, IN OUR WORDS — the common Stripe decline codes. Stripe's
 * own `failure_message` is English only ("Your card has insufficient funds."),
 * so a Spanish billing email quoted English. An unknown code returns null and the
 * caller prints the provider's text as before. Lost, stolen and fraud codes get
 * the plain "declined" sentence on purpose: Stripe advises never repeating them.
 */
function declineText(code: string | null | undefined, lang?: unknown): string | null {
  const tt = T(lang);
  switch (String(code ?? "")) {
    case "insufficient_funds":
      return tt("The card did not have enough funds.");
    case "expired_card":
      return tt("The card has expired.");
    case "incorrect_cvc": case "invalid_cvc":
      return tt("The card's security code did not match.");
    case "incorrect_number": case "invalid_number":
      return tt("The card number is not valid.");
    case "card_velocity_exceeded": case "withdrawal_count_limit_exceeded":
      return tt("The card has reached its limit.");
    case "processing_error":
      return tt("There was a problem processing the card. It may work on the next try.");
    case "authentication_required":
      return tt("The bank needs you to approve this payment.");
    case "card_declined": case "generic_decline": case "do_not_honor": case "call_issuer":
    case "transaction_not_allowed": case "not_permitted": case "restricted_card":
    case "lost_card": case "stolen_card": case "pickup_card": case "fraudulent":
      return tt("The card was declined. Your bank can tell you why.");
    default:
      return null;
  }
}

export function billingEmail(brand: TenantBrand, b: BillingEmailData, lang?: unknown): Mail {
  // `lang` is the RECIPIENT's dashboard language — see `ownerNewBookingEmail`.
  // The bank's reason is ours when Stripe's code is one we know, else Stripe's
  // own text as given (`declineText`).
  const tt = T(lang);
  const down = b.kind === "suspended";
  const why = declineText(b.reasonCode, lang) ?? b.reason;
  const blocks = [
    labBlock(down ? tt("Your site is offline") : tt("Payment problem"), "bad"),
    headlineBlock(down
      ? tt("Your booking page is offline until this is paid")
      : tt("We couldn't take this month's payment")),
    proseBlock(down
      ? tt("We tried your card several times over the last two weeks and it did not go through, so {business}'s booking page is no longer accepting new bookings.", { business: esc(b.businessName) })
      : tt("The {amount} payment for {business} was declined. We will try the same card again over the next two weeks and email you each time.", { amount: money(b.amount), business: esc(b.businessName) })),
    // NOTHING IS DELETED — the sentence both kinds need most.
    proseBlock(down
      ? tt("Nothing has been deleted. Your jobs, your customers, your settings and your photos are all exactly where you left them, and the page comes back as soon as this is sorted out.")
      : tt("Nothing is at risk yet, and nothing gets deleted at any point. If it still has not gone through after two weeks, your booking page goes offline until it is paid."),
      16),
    why ? fineBlock(tt("Your bank said: {reason}", { reason: esc(why) }), 14) : "",
    // THE BUTTON DOES NOT NAME THE CARD ON THE SUSPENDED EMAIL, and that is
    // not vagueness. With Stripe set to CANCEL at the end of dunning — the
    // owner's choice, 2026-09-05 — there is no invoice left to settle, so a new
    // card fixes nothing; the way back is picking a plan again. With "leave
    // unpaid" it really is the card. The billing page shows whichever applies,
    // and this sentence is true either way.
    buttonBlock(brand, down ? tt("Put your page back online") : tt("Update your card"), b.billingUrl),
    // The one fact the button cannot carry: their own customers are not
    // stranded. A detailer's first question when their page goes dark is what
    // happens to the people already booked in.
    down
      ? fineBlock(tt("Customers who have already booked can still see, change and cancel their appointments. Only new bookings have stopped."))
      : "",
  ].filter(Boolean);

  return mail(
    down
      ? tt("{business}'s booking page is offline", { business: b.businessName })
      : tt("We couldn't take payment for {business}", { business: b.businessName }),
    shell(brand, blocks, down
      // The preheader made the same promise the button used to, and it is the
      // first thing shown in an inbox. See the button's note above.
      ? tt("Nothing has been deleted. Open your billing page to bring it back.")
      : tt("We'll try again over the next two weeks."), { lang }),
  );
}

// ---------------------------------------------------------------------------
// 16b · DETAILER — WORK HAS STARTED ON YOUR WEBSITE (roadmap 0.4)
//
// **THE ONLY EMAIL IN THIS PRODUCT THAT EXISTS TO END A RIGHT**, and that is
// why it is a template of its own rather than a `platformAlertEmail` the back
// office types a sentence into.
//
// `/pricing` and `/terms` both say: *"It stops being refundable once work on
// your site begins, and you are told on the day that happens."* On 2026-10-08
// that promise had nothing behind it — no column, no email, no screen — so a
// fee stopped being refundable on a day the detailer never heard about.
// Andrew ruled on 2026-10-09 to make the promise true. This is the notice.
//
// **IT NAMES THE FIGURE WHEN THE FIGURE IS KNOWN AND NEVER INVENTS ONE.**
// `setupCents` comes off the subscription snapshot — the number they actually
// agreed to — and is null for a business that has not been through checkout,
// which is every business today. A null prints the clause without an amount
// rather than printing a price from the config file, because the config file
// is not what anybody was charged (`20260905000000_platform_billing.sql`).
//
// **AND IT SAYS WHAT HAS *NOT* CHANGED, which is the sentence a detailer
// needs most.** The same rule as the billing emails' *"nothing has been
// deleted"*: an email whose whole subject is a right expiring reads, without
// that line, as though the subscription had changed too. It has not — the
// monthly price, the commitment and the cancel button are all untouched, and
// the one thing this email ends is a refund on a one-off fee.
// ---------------------------------------------------------------------------

export interface BuildStartedData {
  businessName: string;
  /** YYYY-MM-DD in the DETAILER's own timezone — the day they are being told about. */
  dateStr: string;
  /** The build fee they agreed to, or null when there is no subscription to read it off. */
  setupCents: number | null;
  billingUrl: string;
}

export function buildStartedEmail(brand: TenantBrand, b: BuildStartedData, lang?: unknown): Mail {
  const tt = T(lang);
  const dateLong = formatDateLong(b.dateStr, lang);
  // **NO FEE MEANS NO REFUND CLAUSE, AND THE FIRST DRAFT GOT THIS WRONG.** It
  // printed *"the one-off fee to build your site is no longer refundable"* with
  // the amount left out whenever `setupCents` was null — and null means there is
  // no subscription row, or a `setup_cents` of 0. **Nobody in that state has
  // been charged a build fee at all**, so the sentence would have ended a
  // refund right that never existed, in an email sent by the item whose entire
  // job is to stop the product promising things it does not do. Caught by
  // reading the rendered text of both branches side by side, which is why
  // `render-emails.mjs` draws both.
  const fee = b.setupCents !== null && b.setupCents > 0 ? money(b.setupCents / 100) : null;
  const blocks = [
    labBlock(tt("Your website")),
    headlineBlock(tt("We have started building your website")),
    proseBlock(tt("Work on {business}'s website began today, {date}. There is nothing for you to do — we will email you again when there is something to look at.",
      { business: esc(b.businessName), date: esc(dateLong) })),
    // THE WHOLE REASON THIS EMAIL IS SENT, in the terms' own words with the
    // date and the figure filled in — and only where there is a figure.
    fee
      ? proseBlock(tt("From today the {amount} fee to build your site is no longer refundable. That is the only thing that changes.",
        { amount: esc(fee) }), 16)
      : "",
    // WHAT HAS NOT CHANGED. The same rule as the billing emails' *"nothing has
    // been deleted"* — and it is said only to somebody who HAS a subscription,
    // because a reassurance about a thing you do not have is its own small lie.
    fee
      ? fineBlock(tt("Your subscription is untouched: the same price, the same renewal date, and the same one button to cancel in your own account whenever you want."))
      : "",
    factsBlock([
      [tt("Work started"), esc(dateLong)],
      ...(fee ? [[tt("Build fee"), esc(fee)] as [string, string]] : []),
    ]),
    // THE DATE IS ON THEIR OWN SCREEN TOO, because an email is a thing that
    // gets deleted and this date is the boundary of a refund right. The
    // billing page prints it from the same column this email was sent from.
    buttonBlock(brand, tt("See it on your billing page"), b.billingUrl),
  ].filter(Boolean);

  return mail(
    tt("Work has started on {business}'s website", { business: b.businessName }),
    shell(brand, blocks, fee
      ? tt("The build fee is no longer refundable from today. Nothing else changes.")
      : tt("Nothing for you to do — we will email you again when there is something to look at."), { lang }),
  );
}


// ---------------------------------------------------------------------------
// 17 · CUSTOMER — YOUR WARRANTY HAS A DEADLINE (roadmap 2.23)
//
// **THE ONLY EMAIL IN THIS PRODUCT THAT ESCALATES.** Every other reminder
// fires once, because the thing it is about happens whether or not anybody
// reads it. A ceramic-coating warranty does not: miss the window and
// something the customer paid $1,500 for is gone, permanently. So it goes
// four times over two months and the words get shorter and plainer each
// time.
//
// IT IS SENT TO THE CUSTOMER, NOT THE DETAILER, and that is deliberate: the
// customer is the one who loses something, and the detailer already sees
// every deadline on their own screen. It also happens to be the version that
// books the job — the button is the booking link.
//
// **IT NEVER NAMES A PRICE OR A PRODUCT WE HAVE NOT BEEN TOLD ABOUT.** The
// label is the detailer's own words ("Ceramic Pro annual inspection"), and
// this template adds nothing to it: a warranty is a contract between the
// customer and a coating manufacturer, and a sentence we invent about what
// it covers is a sentence we cannot stand behind.
// ---------------------------------------------------------------------------
export interface MaintenanceEmailData {
  customerName: string;
  label: string;
  vehicle?: string | null;
  dueOn: string;      // as the detailer's timezone sees it, already formatted
  daysLeft: number;
  bookUrl: string;
  /** The customer's own opt-out link. Required — ROADMAP 0.7, see below. */
  unsubscribeUrl: string;
  /** The business's postal address. Required, same reason. Never a placeholder. */
  mailingAddress: string;
}

/** The subject alone, so a SKIPPED send can be logged under the same words. */
export function maintenanceDueSubject(m: Pick<MaintenanceEmailData, "label" | "dueOn" | "daysLeft">, lang?: unknown): string {
  const tt = T(lang);
  return m.daysLeft <= 1
    ? tt("Last day: {label}", { label: m.label })
    : tt("{label} is due {date}", { label: m.label, date: m.dueOn });
}

// **ROADMAP 0.7 — IT SELLS A BOOKING, SO IT CARRIES THE CAMPAIGN EMAIL'S FOOTER.**
// "Book it in" for a service the customer has not bought is commercial by its
// primary purpose, so it gets exactly what `campaignEmail` gets: the postal
// address and the customer's own opt-out link, through `shell`'s `legal`. The
// sweep skips a business with no address (`maintenanceVerdict`); this throw is
// the last line, so no caller can ever render it with a blank or missing one.
export function maintenanceDueEmail(brand: TenantBrand, m: MaintenanceEmailData, lang?: unknown): Mail {
  // The label and the vehicle are the DETAILER's own words and the customer's
  // own car; only the sentence around them is ours.
  const tt = T(lang);
  if (!String(m.mailingAddress ?? "").trim() || !String(m.unsubscribeUrl ?? "").trim()) {
    throw new Error("maintenanceDueEmail: a mailing address and an unsubscribe link are required");
  }
  const what = m.vehicle
    ? tt("{label} on your {vehicle}", { label: esc(m.label), vehicle: esc(m.vehicle) })
    : esc(m.label);
  // THE URGENCY IS THE FACT, NOT AN ADJECTIVE. "Two weeks left" is true and
  // acts on somebody; "Don't miss out!" is the SaaS-speak the design system
  // bans on every other surface and there is no reason email is different.
  const lead = m.daysLeft <= 1
    ? tt("Tomorrow is the last day")
    : m.daysLeft <= 14
      ? tt("{days} days left", { days: m.daysLeft })
      : tt("Due {date}", { date: m.dueOn });
  const blocks = [
    labBlock(tt("Maintenance due")),
    headlineBlock(lead),
    proseBlock(tt("Hi {first}. Your {what} is due by {date}.", {
      first: esc(firstName(m.customerName)),
      what: `<strong class="c-ink" style="color:${G.ink};">${what}</strong>`,
      date: `<strong class="c-ink" style="color:${G.ink};">${esc(m.dueOn)}</strong>`,
    })),
    proseBlock(tt("Book it below and we'll take care of it."), 16),
    buttonBlock(brand, tt("Book it in"), m.bookUrl),
    fineBlock(tt("If you have already had this done elsewhere, let us know and we will mark it off.")),
  ];
  return mail(
    maintenanceDueSubject(m, lang),
    shell(brand, blocks, tt("{lead} to book your {label}.", { lead, label: m.label }),
      { lang, legal: { mailingAddress: m.mailingAddress.trim(), unsubscribeUrl: m.unsubscribeUrl } }),
  );
}
