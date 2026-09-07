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

import {
  type Brand,
  buttonBlock,
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
import { T } from "./i18n.ts";

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
  customerNotes: string | null;
  serviceNames: string[];
  addOnNames: string[];
  // Roadmap 2.8c. The subtotal below CONTAINS the travel charge and every
  // surcharge, so without these two the money table shows "Express Wash $65"
  // and "Subtotal $105" with $40 unexplained between them.
  travelFee?: number;
  travelZone?: string | null;
  adjustments?: { label: string; amount: number }[];
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

const sizeDisplay = (s: string) =>
  ({
    small: "Small car", compact: "Compact", mid: "Mid-size", midsize: "Mid-size",
    large: "Large / SUV", suv: "SUV", truck: "Truck", xl: "Extra large",
  } as Record<string, string>)[String(s).toLowerCase()] ?? s;

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
    `${esc(sizeDisplay(size))}${model ? ` &middot; ${esc(model)}` : ""}`;
  const extras = b.extraVehicles ?? [];
  if (!extras.length) return [tt("Vehicle"), one(b.vehicleSize, b.vehicleModel)];
  return [
    tt("Vehicles ({count})", { count: extras.length + 1 }),
    [one(b.vehicleSize, b.vehicleModel), ...extras.map((v) => one(v.size, v.model))].join("<br>"),
  ];
};

const firstName = (full: string) => String(full || "").trim().split(" ")[0] || "there";

/** Where the job happens: the customer's address for mobile, ours otherwise. */
export function jobAddress(
  brand: TenantBrand,
  b: Pick<BookingEmailData, "serviceType" | "customerAddress">,
): string {
  if (b.serviceType === "mobile" && b.customerAddress?.trim()) return b.customerAddress;
  return brand.dropoffAddress || "";
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

function keepLink(bookUrl: string, lang?: unknown): string {
  // ONE STRING LITERAL, NOT TWO JOINED BY `+`. The key is the whole sentence,
  // and an extractor reading source as text sees only the first fragment of a
  // concatenation — so the catalogue and the call site would disagree about
  // what the key even is. Found by the check that compares them.
  return fineBlock(T(lang)(
    "Keep this email — the link above is how you change or cancel without ringing anyone. To book again any time: {url}",
    { url: bookUrl },
  ));
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
      label: b.travelZone ? tt("Travel — {zone}", { zone: b.travelZone }) : tt("Travel"),
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
    lines.push(amount < 0
      ? { label: String(a.label), amount: -amount, kind: "discount" }
      : { label: String(a.label), amount });
  }
  if (Number(b.siteDiscount) > 0) {
    lines.push({
      label: b.siteDiscountPercent
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
  const blocks = [
    labBlock(isRequest ? tt("Request received") : tt("Booking confirmed")),
    headlineBlock(isRequest ? tt("We're holding your time") : tt("You're all set")),
    proseBlock(isRequest
      ? tt("Thanks, {first} — we've got your request and nobody else can take this time while we look at it. You'll hear from us shortly.",
        { first: esc(firstName(b.customerName)) })
      : tt("Thanks, {first}. Here's everything for your appointment.",
        { first: esc(firstName(b.customerName)) })),
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
    isRequest ? "" : paymentBlock(brand, tt("Nothing to pay now — this is for when the work is done."), b.lang),
    ownWords(brand, isRequest ? "request_received" : "confirmation"),
    buttonBlock(brand, isRequest ? tt("View or change your request") : tt("View your booking"), b.receiptUrl),
    keepLink(brand.siteUrl, b.lang),
    isRequest ? noteBlock(tt("Nothing is charged now. We'll email you the moment we've accepted.")) : "",
    b.customerNotes ? proseBlock(`<strong class="c-ink" style="color:${G.ink};">${esc(tt("Your notes"))}</strong><br>${esc(b.customerNotes)}`, 26) : "",
  ].filter(Boolean);

  return mail(
    isRequest
      ? tt("Request received — {date}", { date: dateLong })
      : tt("Booking confirmed — {date}", { date: dateLong }),
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
): Mail {
  const dateLong = formatDateLong(b.dateStr);
  const services = [...b.serviceNames, ...b.addOnNames.map((a) => `${a} (add-on)`)];
  const blocks = [
    labBlock(headingOverride ?? (isRequest ? "Waiting for you to accept" : "New booking")),
    headlineBlock(b.customerName),
    markBlock(brand, [money(Number(b.total)), `${dateLong} · ${formatTime12hr(b.startTime)} – ${formatTime12hr(b.endTime)}`]),
    factsBlock([
      ["Phone", `<a href="tel:${esc(b.customerPhone)}" class="c-accent" style="color:${brand.accent}; text-decoration:none;">${esc(b.customerPhone)}</a>`],
      ...(b.customerEmail ? [["Email", esc(b.customerEmail)] as [string, string]] : []),
      ["Where", esc(jobAddress(brand, b))],
      // **IDEA 11 — WHAT TO LOAD IN THE VAN, in the email that wakes a
      // detailer up.** The job record has printed this since W22; the OWNER'S
      // OWN ALERT never did, which is the real gap — the record is read when
      // you are already going, and the email is read when you are deciding
      // what to put in the van. Only for a mobile job, and only when the
      // answer is an explicit no.
      ["Type", b.serviceType === "mobile" ? "Mobile" : "Drop-off"],
      ...(b.serviceType === "mobile" && (b.hasWater === false || b.hasPower === false)
        ? [["Bring", [b.hasWater === false ? "water" : null, b.hasPower === false ? "power" : null]
            .filter(Boolean).join(" and ")] as [string, string]]
        : []),
      vehicleFact(b),
    ]),
    ruleBlock(34),
    labBlock("The work"),
    proseBlock(
      services.map((s) => `<div style="padding:4px 0;">${esc(s)}</div>`).join("")
        + (b.promoCode ? `<div class="c-accent" style="padding:4px 0; color:${brand.accent};">Promo ${esc(b.promoCode)}${Number(b.promoDiscount) > 0 ? ` (−${money(Number(b.promoDiscount))})` : ""}</div>` : ""),
      12,
    ),
    ruleBlock(30),
    labBlock("Customer notes"),
    proseBlock(b.customerNotes ? esc(b.customerNotes) : `<span class="c-fog2" style="color:${G.fog2};">None.</span>`, 12),
    buttonBlock(brand, isRequest ? "Answer this request" : "Open the job", b.receiptUrl),
  ];

  return mail(
    isRequest
      ? `Request — ${b.customerName} — ${dateLong} (${money(Number(b.total))})`
      : `New booking — ${b.customerName} — ${dateLong} (${money(Number(b.total))})`,
    shell(brand, blocks, `${b.customerName} · ${dateLong} · ${money(Number(b.total))}`),
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
  const when = `<strong class="c-ink" style="color:${G.ink};">${esc(dateLong)}</strong> at <strong class="c-ink" style="color:${G.ink};">${formatTime12hr(b.startTime)}</strong>`;
  const host = brand.siteUrl.replace(/^https?:\/\//, "");

  const blocks = kind === "quote"
    ? [
      labBlock(tt("Quote")),
      headlineBlock(tt("Here's your price")),
      proseBlock(tt("We've had a look at what you asked for on {when}, and here's what we can do it for.", { when })),
      markBlock(brand, [money(Number(opts.quotedAmount ?? 0)), tt("Our price for this job")]),
      opts.quotedNote ? proseBlock(esc(opts.quotedNote), 22) : "",
      noteBlock(`${esc(tt("We're still holding {date} at {time} for you.", { date: dateLong, time: formatTime12hr(b.startTime) }))} <strong class="c-ink2" style="color:${G.ink2};">${esc(tt("Nothing is charged until you say yes."))}</strong>`),
      ownWords(brand, "quote"),
      buttonBlock(brand, tt("See it and say yes"), opts.manageUrl),
    ].filter(Boolean)
    : kind === "accepted"
    ? [
      labBlock(tt("Request accepted")),
      headlineBlock(tt("You're booked in")),
      proseBlock(tt("Good news — we've accepted your request for {when}. It's in the diary.", { when }).replace("—", "&mdash;")),
      markBlock(brand, [dateLong, `${formatTime12hr(b.startTime)} &ndash; ${formatTime12hr(b.endTime)}`]),
      factsBlock(jobFacts(brand, b, b.lang)),
      // ROADMAP 2.20 STAGE 1, AND THIS IS THE CONFIRMATION FOR HALF THE
      // TENANTS. In request mode the customer's first email says "we're
      // holding your time" and explicitly charges nothing; THIS is the one
      // that says the job is happening. Leaving it out because the roadmap's
      // sentence says "the confirmation" would give every request-mode
      // business no payment handles on the only email that confirms anything.
      paymentBlock(brand, tt("Nothing to pay now — this is for when the work is done."), b.lang),
      ownWords(brand, "accepted"),
      buttonBlock(brand, tt("View or change your booking"), opts.manageUrl),
      keepLink(brand.siteUrl, b.lang),
    ].filter(Boolean)
    : [
      labBlock(tt("Request declined")),
      headlineBlock(tt("We can't make that one")),
      proseBlock(tt("We're sorry — we can't take {when}, so we've let that time go.", { when }).replace("—", "&mdash;")),
      proseBlock(tt("If another day works, we'd still love to see you — {link}.", {
        link: `<a href="${brand.siteUrl}" class="c-accent" style="color:${brand.accent}; text-decoration:none;">${esc(host)}</a>`,
      }).replace("—", "&mdash;")),
      ownWords(brand, "declined"),
    ].filter(Boolean);

  const subject = kind === "accepted"
    ? tt("You're booked in — {date}", { date: dateLong })
    : kind === "declined"
    ? tt("About your request for {date}", { date: dateLong })
    : tt("Your price: {amount} for {date}",
      { amount: money(Number(opts.quotedAmount ?? 0)), date: dateLong });

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
    headlineBlock(paid ? tt("Paid in full") : tt("Amount due")),
    proseBlock(paid
      ? tt("Thanks, {first} — here's your receipt for the work on {date}.",
        { first: esc(firstName(b.customerName)), date: esc(dateLong) }).replace("—", "&mdash;")
      : tt("Hi {first}, here's the invoice for the work on {date}.",
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
    buttonBlock(brand, tt("View this online"), b.receiptUrl),
    fineBlock(tt("Keep this for your records. Reply to this email if anything looks wrong.")),
  ].filter(Boolean);

  return mail(
    paid
      ? tt("Receipt — {amount} — {brand}",
        { amount: money(Number(totals.totalPaid)), brand: brand.brandName })
      : tt("Invoice — {amount} due — {brand}",
        { amount: money(Number(totals.totalPaid)), brand: brand.brandName }),
    shell(brand, blocks, paid
      ? tt("Paid in full — {amount}.", { amount: money(Number(totals.totalPaid)) })
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
    proseBlock(tt("Hello {first}, thank you for choosing {brand}. We appreciate the opportunity to take care of your vehicle.",
      { first: esc(firstName(name)), brand: esc(brand.brandName) })),
    links.length
      ? proseBlock(tt("If you were happy with the work, a quick review genuinely helps us."), 22)
      : "",
    ownWords(brand, "followup"),
    ...links.map(([label, href]) => buttonBlock(brand, label, href)),
    links.length ? fineBlock(tt("It takes about a minute, and it is the single biggest thing that helps a small business like ours.")) : "",
  ].filter(Boolean);

  return mail(
    tt("Thank you for choosing {brand}", { brand: brand.brandName }),
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
    keepLink(brand.siteUrl, b.lang),
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
export function cancellationEmail(brand: TenantBrand, b: BookingEmailData, forOwner: boolean): Mail {
  // **ONE TEMPLATE, TWO AUDIENCES, AND ONLY ONE OF THEM GETS SPANISH.** The
  // owner's half goes to somebody who runs a business on this product; their
  // language is the dashboard's question (stage 2b), and a Spanish booking
  // must not turn a detailer's own alerts Spanish while their dashboard stays
  // English. So `lang` is `undefined` on that branch, which is English.
  const lang = forOwner ? undefined : b.lang;
  const tt = T(lang);
  const dateLong = formatDateLong(b.dateStr, lang);
  const host = brand.siteUrl.replace(/^https?:\/\//, "");
  const blocks = forOwner
    ? [
      labBlock("Cancelled", "bad"),
      headlineBlock(b.customerName),
      proseBlock(`<strong class="c-ink" style="color:${G.ink};">${esc(dateLong)}</strong> at <strong class="c-ink" style="color:${G.ink};">${formatTime12hr(b.startTime)}</strong> is cancelled. The slot is open again.`),
      factsBlock([
        ["Phone", esc(b.customerPhone)],
        ["Was worth", money(Number(b.total))],
      ]),
    ]
    : [
      labBlock(tt("Cancelled"), "bad"),
      headlineBlock(tt("Your booking is cancelled")),
      proseBlock(tt("Hi {first}, your booking with {brand} for {date} at {time} has been cancelled.", {
        first: esc(firstName(b.customerName)),
        brand: esc(brand.brandName),
        date: `<strong class="c-ink" style="color:${G.ink};">${esc(dateLong)}</strong>`,
        time: `<strong class="c-ink" style="color:${G.ink};">${formatTime12hr(b.startTime)}</strong>`,
      })),
      proseBlock(tt("We'd love to see you another time — you can book again at {link}.", {
        link: `<a href="${brand.siteUrl}" class="c-accent" style="color:${brand.accent}; text-decoration:none;">${esc(host)}</a>`,
      }).replace("—", "&mdash;")),
      ownWords(brand, "cancelled"),
    ].filter(Boolean);
  return mail(
    forOwner
      ? `Cancelled — ${b.customerName} — ${dateLong}`
      : tt("Your booking has been cancelled"),
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
): Mail {
  // See `cancellationEmail` above: one template, two audiences, and the
  // detailer's half stays English until stage 2b.
  const lang = forOwner ? undefined : b.lang;
  const tt = T(lang);
  const dateLong = formatDateLong(b.dateStr, lang);
  const oldLong = formatDateLong(oldDateStr, lang);
  const blocks = [
    labBlock(tt("Rescheduled")),
    headlineBlock(forOwner ? b.customerName : tt("Your booking has moved")),
    proseBlock(forOwner
      ? `<strong class="c-ink" style="color:${G.ink};">${esc(b.customerName)}</strong> moved their booking.`
      : tt("Hi {first}, your booking with {brand} has been moved.",
        { first: esc(firstName(b.customerName)), brand: esc(brand.brandName) })),
    proseBlock(`<span style="color:${G.fog2}; text-decoration:line-through;">${esc(oldLong)} at ${formatTime12hr(oldStartTime)}</span>`, 24),
    markBlock(brand, [dateLong, `${formatTime12hr(b.startTime)} &ndash; ${formatTime12hr(b.endTime)}`]),
    factsBlock(jobFacts(brand, b, lang)),
    forOwner ? "" : ownWords(brand, "rescheduled"),
    buttonBlock(brand, forOwner ? "Open the job" : tt("View your booking"), b.receiptUrl),
  ].filter(Boolean);
  return mail(
    forOwner
      ? `Rescheduled — ${b.customerName} — now ${dateLong}`
      : tt("Your booking has been rescheduled"),
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
export function staleRequestEmail(brand: TenantBrand, b: BookingEmailData, hoursWaited: number): Mail {
  const dateLong = formatDateLong(b.dateStr);
  const blocks = [
    labBlock("Still waiting on you", "bad"),
    headlineBlock(b.customerName),
    proseBlock(`asked for <strong class="c-ink" style="color:${G.ink};">${esc(dateLong)}</strong> at <strong class="c-ink" style="color:${G.ink};">${formatTime12hr(b.startTime)}</strong> &mdash; ${hoursWaited} hour${hoursWaited === 1 ? "" : "s"} ago, and it is still waiting for an answer.`),
    proseBlock("That time is held for them until you accept or decline it, so nobody else can book it either.", 16),
    factsBlock([
      ["Phone", esc(b.customerPhone)],
      ...(b.customerEmail ? [["Email", esc(b.customerEmail)] as [string, string]] : []),
      ["Where", esc(jobAddress(brand, b))],
      ["Asking", money(Number(b.total))],
    ]),
    buttonBlock(brand, "Answer this request", b.receiptUrl),
  ];
  return mail(
    `Still waiting: ${b.customerName} — ${dateLong}`,
    shell(brand, blocks, `${b.customerName} asked for ${dateLong} and has not heard back.`),
  );
}

// ---------------------------------------------------------------------------
// 10 · STAFF — TEAM INVITE
// ---------------------------------------------------------------------------
export function inviteEmail(
  brand: TenantBrand,
  opts: { role: string; label?: string | null; link: string; expiresAt: string },
): Mail {
  // The detailer's own word for the role when they gave one (roadmap 2.13).
  // "as a Detailer" reads as their business; "as a staff member" reads as ours.
  const named = opts.role !== "owner" && opts.label?.trim();
  const roleWord = opts.role === "owner"
    ? "an owner"
    : named
      ? `${/^[aeiou]/i.test(opts.label!.trim()) ? "an" : "a"} ${opts.label!.trim()}`
      : "a staff member";
  const expires = formatDateLong(String(opts.expiresAt).slice(0, 10));
  const blocks = [
    labBlock("Invitation"),
    headlineBlock("You've been added to the team"),
    proseBlock(`${esc(brand.brandName)} has invited you to join their booking dashboard as ${esc(roleWord)}.`),
    proseBlock("Use the button below to set your password and sign in.", 16),
    buttonBlock(brand, "Set up your account", opts.link),
    fineBlock(`This link works until ${expires}. If the button doesn't work, open: ${opts.link}`),
  ];
  return mail(
    `Join ${brand.brandName} on the booking dashboard`,
    shell(brand, blocks, `${brand.brandName} invited you to their dashboard.`),
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
    proseBlock(tt("Hi {first} — you're on {plan} with {brand}.", {
      first: esc(firstName(opts.customerName)),
      plan: `<strong class="c-ink" style="color:${G.ink};">${esc(opts.planName)}</strong>`,
      brand: esc(brand.brandName),
    }).replace("—", "&mdash;")),
    proseBlock(tt("The button below opens your plan: what you're on, when your next visit is due, and how to book it."), 16),
    buttonBlock(brand, tt("Open your plan"), opts.planUrl),
    fineBlock(tt("Keep this email — that link is the only way back to your plan. To book any time: {url}",
      { url: opts.bookUrl }).replace("—", "&mdash;")),
  ];
  return mail(
    tt("Your plan with {brand}", { brand: brand.brandName }),
    shell(brand, blocks, tt("{plan} — your link is inside.", { plan: opts.planName }), { lang }),
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
): Mail {
  const blocks = [
    labBlock("Plan ended", "bad"),
    headlineBlock(opts.customerName),
    proseBlock(`ended their <strong class="c-ink" style="color:${G.ink};">${esc(opts.planName)}</strong> from their own plan page. Nothing else has changed &mdash; any booking already in the diary is still there.`),
    factsBlock([
      ["Plan", esc(opts.planName)],
      ["Member since", formatDateLong(String(opts.startedOn).slice(0, 10))],
      ["Ended", formatDateLong(String(opts.endedOn).slice(0, 10))],
    ]),
    fineBlock("They can join again whenever they like; the record of what they were owed is kept either way."),
  ];
  return mail(
    `${opts.customerName} ended their plan`,
    shell(brand, blocks, `${opts.customerName} ended ${opts.planName}.`),
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

export function platformAlertEmail(brand: TenantBrand, a: PlatformAlertData): Mail {
  const blocks = [
    labBlock(a.kind),
    headlineBlock(a.headline),
    proseBlock(a.intro),
    ...(a.facts && a.facts.length ? [factsBlock(a.facts)] : []),
    ...(a.buttonLabel && a.buttonUrl ? [buttonBlock(brand, a.buttonLabel, a.buttonUrl)] : []),
  ].filter(Boolean);
  const html = shell(brand, blocks, a.headline);
  return { subject: a.headline, html, text: htmlToText(html) };
}

export function billingEmail(brand: TenantBrand, b: BillingEmailData): Mail {
  const down = b.kind === "suspended";
  const blocks = [
    labBlock(down ? "Your site is offline" : "Payment problem", "bad"),
    headlineBlock(down
      ? "Your booking page is offline until this is paid"
      : "We couldn't take this month's payment"),
    proseBlock(down
      ? `We tried your card several times over the last two weeks and it did not go through, so ${esc(b.businessName)}'s booking page is no longer accepting new bookings.`
      : `The ${money(b.amount)} payment for ${esc(b.businessName)} was declined. We will try the same card again over the next two weeks and email you each time.`),
    // NOTHING IS DELETED — the sentence both kinds need most.
    proseBlock(down
      ? "Nothing has been deleted. Your jobs, your customers, your settings and your photos are all exactly where you left them, and the page comes back as soon as this is sorted out."
      : "Nothing is at risk yet, and nothing gets deleted at any point. If it still has not gone through after two weeks, your booking page goes offline until it is paid.",
      16),
    b.reason ? fineBlock(`Your bank said: ${esc(b.reason)}`, 14) : "",
    // THE BUTTON DOES NOT NAME THE CARD ON THE SUSPENDED EMAIL, and that is
    // not vagueness. With Stripe set to CANCEL at the end of dunning — the
    // owner's choice, 2026-09-05 — there is no invoice left to settle, so a new
    // card fixes nothing; the way back is picking a plan again. With "leave
    // unpaid" it really is the card. The billing page shows whichever applies,
    // and this sentence is true either way.
    buttonBlock(brand, down ? "Put your page back online" : "Update your card", b.billingUrl),
    // The one fact the button cannot carry: their own customers are not
    // stranded. A detailer's first question when their page goes dark is what
    // happens to the people already booked in.
    down
      ? fineBlock("Customers who have already booked can still see, change and cancel their appointments — only new bookings have stopped.")
      : "",
  ].filter(Boolean);

  return mail(
    down
      ? `${b.businessName}'s booking page is offline`
      : `We couldn't take payment for ${b.businessName}`,
    shell(brand, blocks, down
      // The preheader made the same promise the button used to, and it is the
      // first thing shown in an inbox. See the button's note above.
      ? "Nothing has been deleted — open your billing page to bring it back."
      : "We'll try again over the next two weeks."),
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
}

export function maintenanceDueEmail(brand: TenantBrand, m: MaintenanceEmailData, lang?: unknown): Mail {
  // The label and the vehicle are the DETAILER's own words and the customer's
  // own car; only the sentence around them is ours.
  const tt = T(lang);
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
    proseBlock(tt("Hi {first} — your {what} is due by {date}.", {
      first: esc(firstName(m.customerName)),
      what: `<strong class="c-ink" style="color:${G.ink};">${what}</strong>`,
      date: `<strong class="c-ink" style="color:${G.ink};">${esc(m.dueOn)}</strong>`,
    }).replace("—", "&mdash;")),
    proseBlock(tt("Book it below and we'll take care of it."), 16),
    buttonBlock(brand, tt("Book it in"), m.bookUrl),
    fineBlock(tt("If you have already had this done elsewhere, let us know and we will mark it off.")),
  ];
  return mail(
    m.daysLeft <= 1
      ? tt("Last day: {label}", { label: m.label })
      : tt("{label} is due {date}", { label: m.label, date: m.dueOn }),
    shell(brand, blocks, tt("{lead} to book your {label}.", { lead, label: m.label }), { lang }),
  );
}
