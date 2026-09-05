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
function paymentBlock(brand: TenantBrand, lead = ""): string {
  const rows = brand.payment ?? [];
  if (rows.length === 0) return "";
  // NO LEAD ON THE INVOICE. That email's heading is already "Amount due" and
  // its money column is directly above this list, so a sentence here could
  // only restate one of them — which is the owner's own copy rule, 2026-09-01.
  return labBlock("How to pay") + (lead ? fineBlock(lead, 10) : "") + factsBlock(
    rows.map((r) => [
      r.label,
      r.href
        ? `<a href="${esc(r.href)}" target="_blank" class="c-accent" style="color:${brand.accent}; text-decoration:none;">${esc(r.handle)}</a>`
        : `<span class="c-ink" style="color:${G.ink};">${esc(r.handle)}</span>`,
    ] as [string, string]),
  );
}

function keepLink(bookUrl: string): string {
  return fineBlock(
    "Keep this email — the link above is how you change or cancel without ringing "
    + `anyone. To book again any time: ${bookUrl}`,
  );
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
function quoteLines(b: BookingEmailData): MoneyLine[] {
  const travel = Number(b.travelFee) || 0;
  const adjustments = b.adjustments ?? [];
  const named = travel + adjustments.reduce((s, a) => s + (Number(a.amount) || 0), 0);
  // `subtotal` is post-site-discount, so the base has to be reconstructed
  // before the site line can be shown coming off it.
  const base = Number(b.subtotal) + (Number(b.siteDiscount) || 0) - named;
  const services = [...b.serviceNames, ...b.addOnNames.map((a) => `${a} (add-on)`)];

  const lines: MoneyLine[] = [];
  if (services.length === 1) lines.push({ label: services[0], amount: base });
  else if (services.length > 1) {
    // Individual prices are not on the booking row, so one line names the work
    // and carries what it came to. Better an honest single line than a made-up
    // split across three.
    lines.push({ label: services.join(", "), amount: base });
  } else lines.push({ label: "Service", amount: base });

  if (travel > 0) lines.push({ label: b.travelZone ? `Travel — ${b.travelZone}` : "Travel", amount: travel });
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
      label: b.siteDiscountPercent ? `${b.siteDiscountPercent}% sale` : "Sale",
      amount: Number(b.siteDiscount), kind: "discount",
    });
  }
  if (b.promoCode && Number(b.promoDiscount) > 0) {
    lines.push({ label: `Promo ${b.promoCode}`, amount: Number(b.promoDiscount), kind: "discount" });
  }
  // The engine ROUNDS the total to the business's own nearest-N after both
  // discounts, so even a fully itemised column can miss by a couple of
  // dollars. `reconcile` draws that rather than leaving a gap.
  return reconcile(lines, Number(b.total));
}

const jobFacts = (brand: TenantBrand, b: BookingEmailData): [string, string][] => [
  ["Where", esc(jobAddress(brand, b))],
  [b.serviceType === "mobile" ? "We come to you" : "Drop-off", b.serviceType === "mobile" ? "Yes" : "At our unit"],
  ["Vehicle", `${esc(sizeDisplay(b.vehicleSize))}${b.vehicleModel ? ` &middot; ${esc(b.vehicleModel)}` : ""}`],
];

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
  const dateLong = formatDateLong(b.dateStr);
  const blocks = [
    labBlock(isRequest ? "Request received" : "Booking confirmed"),
    headlineBlock(isRequest ? "We're holding your time" : "You're all set"),
    proseBlock(isRequest
      ? `Thanks, ${esc(firstName(b.customerName))} &mdash; we've got your request and nobody else can take this time while we look at it. You'll hear from us shortly.`
      : `Thanks, ${esc(firstName(b.customerName))}. Here's everything for your appointment.`),
    markBlock(brand, [dateLong, `${formatTime12hr(b.startTime)} &ndash; ${formatTime12hr(b.endTime)}`]),
    factsBlock(jobFacts(brand, b)),
    ruleBlock(34),
    labBlock("What we're doing"),
    moneyBlock(brand, quoteLines(b), { label: "Estimated total", amount: Number(b.total) }),
    fineBlock("An estimate. If the vehicle's condition needs more time than expected we'll tell you before we start, never after."),
    // ROADMAP 2.20 STAGE 1, AND NOT ON THE REQUEST BRANCH. A request is not a
    // booking yet — that branch's own note says "nothing is charged now" — so
    // telling somebody how to pay for a job nobody has accepted is the same
    // mistake as printing payment methods on a receipt, one step earlier.
    // The accepted-request email carries them instead.
    isRequest ? "" : paymentBlock(brand, "Nothing to pay now — this is for when the work is done."),
    ownWords(brand, isRequest ? "request_received" : "confirmation"),
    buttonBlock(brand, isRequest ? "View or change your request" : "View your booking", b.receiptUrl),
    keepLink(brand.siteUrl),
    isRequest ? noteBlock("Nothing is charged now. We'll email you the moment we've accepted.") : "",
    b.customerNotes ? proseBlock(`<strong class="c-ink" style="color:${G.ink};">Your notes</strong><br>${esc(b.customerNotes)}`, 26) : "",
  ].filter(Boolean);

  return mail(
    isRequest ? `Request received — ${dateLong}` : `Booking confirmed — ${dateLong}`,
    shell(brand, blocks, isRequest
      ? "We're holding your time while we look at it."
      : `${dateLong} at ${formatTime12hr(b.startTime)}.`),
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
      ["Type", b.serviceType === "mobile" ? "Mobile" : "Drop-off"],
      ["Vehicle", `${esc(sizeDisplay(b.vehicleSize))}${b.vehicleModel ? ` &middot; ${esc(b.vehicleModel)}` : ""}`],
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
  const dateLong = formatDateLong(b.dateStr);
  const when = `<strong class="c-ink" style="color:${G.ink};">${esc(dateLong)}</strong> at <strong class="c-ink" style="color:${G.ink};">${formatTime12hr(b.startTime)}</strong>`;
  const host = brand.siteUrl.replace(/^https?:\/\//, "");

  const blocks = kind === "quote"
    ? [
      labBlock("Quote"),
      headlineBlock("Here's your price"),
      proseBlock(`We've had a look at what you asked for on ${when}, and here's what we can do it for.`),
      markBlock(brand, [money(Number(opts.quotedAmount ?? 0)), "Our price for this job"]),
      opts.quotedNote ? proseBlock(esc(opts.quotedNote), 22) : "",
      noteBlock(`We're still holding ${esc(dateLong)} at ${formatTime12hr(b.startTime)} for you. <strong class="c-ink2" style="color:${G.ink2};">Nothing is charged until you say yes.</strong>`),
      ownWords(brand, "quote"),
      buttonBlock(brand, "See it and say yes", opts.manageUrl),
    ].filter(Boolean)
    : kind === "accepted"
    ? [
      labBlock("Request accepted"),
      headlineBlock("You're booked in"),
      proseBlock(`Good news &mdash; we've accepted your request for ${when}. It's in the diary.`),
      markBlock(brand, [dateLong, `${formatTime12hr(b.startTime)} &ndash; ${formatTime12hr(b.endTime)}`]),
      factsBlock(jobFacts(brand, b)),
      // ROADMAP 2.20 STAGE 1, AND THIS IS THE CONFIRMATION FOR HALF THE
      // TENANTS. In request mode the customer's first email says "we're
      // holding your time" and explicitly charges nothing; THIS is the one
      // that says the job is happening. Leaving it out because the roadmap's
      // sentence says "the confirmation" would give every request-mode
      // business no payment handles on the only email that confirms anything.
      paymentBlock(brand, "Nothing to pay now — this is for when the work is done."),
      ownWords(brand, "accepted"),
      buttonBlock(brand, "View or change your booking", opts.manageUrl),
      keepLink(brand.siteUrl),
    ].filter(Boolean)
    : [
      labBlock("Request declined"),
      headlineBlock("We can't make that one"),
      proseBlock(`We're sorry &mdash; we can't take ${when}, so we've let that time go.`),
      proseBlock(`If another day works, we'd still love to see you &mdash; <a href="${brand.siteUrl}" class="c-accent" style="color:${brand.accent}; text-decoration:none;">${esc(host)}</a>.`),
      ownWords(brand, "declined"),
    ].filter(Boolean);

  const subject = kind === "accepted"
    ? `You're booked in — ${dateLong}`
    : kind === "declined"
    ? `About your request for ${dateLong}`
    : `Your price: ${money(Number(opts.quotedAmount ?? 0))} for ${dateLong}`;

  return mail(subject, shell(brand, blocks, subject));
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
  const ref = String(b.id).split("-")[0].toUpperCase();
  const paid = String(paymentStatus).toLowerCase() === "paid";
  const dateLong = formatDateLong(b.dateStr);

  const lines = reconcile(
    rows.map((r) => ({
      label: r.qty > 1 ? `${r.label} ×${r.qty}` : r.label,
      amount: Math.abs(Number(r.lineTotal)),
      kind: (r.kind === "discount" || Number(r.lineTotal) < 0 ? "discount" : "charge") as MoneyLine["kind"],
    })),
    Number(totals.totalPaid),
  );

  const blocks = [
    labBlock(paid ? "Receipt" : "Invoice"),
    headlineBlock(paid ? "Paid in full" : "Amount due"),
    proseBlock(paid
      ? `Thanks, ${esc(firstName(b.customerName))} &mdash; here's your receipt for the work on ${esc(dateLong)}.`
      : `Hi ${esc(firstName(b.customerName))}, here's the invoice for the work on ${esc(dateLong)}.`),
    factsBlock([
      ["Reference", `<span class="c-ink" style="font-family:'SF Mono',Menlo,Consolas,monospace;">${esc(ref)}</span>`],
      ["Vehicle", `${esc(sizeDisplay(b.vehicleSize))}${b.vehicleModel ? ` &middot; ${esc(b.vehicleModel)}` : ""}`],
      ["Service", b.serviceType === "mobile" ? "Mobile" : "Drop-off"],
    ]),
    ruleBlock(34),
    labBlock("The work"),
    // NAMED, NOT PRICED. The prices of the individual services are not what was
    // charged — `total_price` is, and the customer's confirmation email already
    // itemises how that figure was reached. Printing per-service prices here
    // would be a second, re-derived version of a number that is not in doubt,
    // which is exactly the shape that kept this invoice wrong.
    b.serviceNames.length || b.addOnNames.length
      ? proseBlock(
        [...b.serviceNames, ...b.addOnNames.map((a) => `${a} (add-on)`)]
          .map((sv) => `<div style="padding:4px 0;">${esc(sv)}</div>`).join(""),
        12,
      )
      : "",
    ruleBlock(26),
    labBlock(paid ? "What you paid" : "What is due"),
    moneyBlock(brand, lines, {
      label: paid ? "Total paid" : "Amount due",
      amount: Number(totals.totalPaid),
    }),
    // ROADMAP 2.20 STAGE 1 — AND `paid` IS THE WHOLE POINT OF THE BRANCH.
    // The owner's complaint about his own old site was that its invoice listed
    // the payments he accepts for money the customer had already handed over.
    // A receipt proves; an invoice asks. Only the one that asks says how.
    paid ? "" : paymentBlock(brand),
    paymentNotes ? proseBlock(`<strong class="c-ink" style="color:${G.ink};">Notes</strong><br>${esc(paymentNotes)}`, 26) : "",
    ownWords(brand, paid ? "receipt" : "invoice"),
    buttonBlock(brand, "View this online", b.receiptUrl),
    fineBlock("Keep this for your records. Reply to this email if anything looks wrong."),
  ].filter(Boolean);

  return mail(
    paid
      ? `Receipt — ${money(Number(totals.totalPaid))} — ${brand.brandName}`
      : `Invoice — ${money(Number(totals.totalPaid))} due — ${brand.brandName}`,
    shell(brand, blocks, paid
      ? `Paid in full — ${money(Number(totals.totalPaid))}.`
      : `${money(Number(totals.totalPaid))} due.`),
  );
}

// ---------------------------------------------------------------------------
// 5 · CUSTOMER — THANK YOU AND REVIEW REQUEST
//
// Five of six products send one; ours already did. The old referral & loyalty
// blurb stays gone (the referral system was removed platform-wide).
// ---------------------------------------------------------------------------
export function followupEmail(brand: TenantBrand, name: string): Mail {
  const links = [
    brand.googleReviewUrl ? ["Leave a Google review", brand.googleReviewUrl] : null,
    brand.yelpReviewUrl ? ["Leave a Yelp review", brand.yelpReviewUrl] : null,
  ].filter(Boolean) as [string, string][];

  const blocks = [
    labBlock("Thank you"),
    headlineBlock("Thanks for trusting us with it"),
    proseBlock(`Hello ${esc(firstName(name))}, thank you for choosing ${esc(brand.brandName)}. We appreciate the opportunity to take care of your vehicle.`),
    links.length
      ? proseBlock("If you were happy with the work, a quick review genuinely helps us.", 22)
      : "",
    ownWords(brand, "followup"),
    ...links.map(([label, href]) => buttonBlock(brand, label, href)),
    links.length ? fineBlock("It takes about a minute, and it is the single biggest thing that helps a small business like ours.") : "",
  ].filter(Boolean);

  return mail(
    `Thank you for choosing ${brand.brandName}`,
    shell(brand, blocks, `Thank you from ${brand.brandName}`),
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
  const dateLong = formatDateLong(b.dateStr);
  const blocks = [
    labBlock("Reminder"),
    headlineBlock("See you soon"),
    proseBlock(`Hi ${esc(firstName(b.customerName))}, a quick reminder about your appointment with ${esc(brand.brandName)}.`),
    markBlock(brand, [dateLong, `${formatTime12hr(b.startTime)} &ndash; ${formatTime12hr(b.endTime)}`]),
    factsBlock(jobFacts(brand, b)),
    paymentBlock(brand, "For when the work is done."),
    ownWords(brand, second ? "reminder_2" : "reminder"),
    buttonBlock(brand, "View or change your booking", b.receiptUrl),
    keepLink(brand.siteUrl),
  ].filter(Boolean);
  return mail(
    `Reminder: your appointment ${dateLong}`,
    shell(brand, blocks, `Reminder: ${dateLong} at ${formatTime12hr(b.startTime)}`),
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
  const dateLong = formatDateLong(b.dateStr);
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
      labBlock("Cancelled", "bad"),
      headlineBlock("Your booking is cancelled"),
      proseBlock(`Hi ${esc(firstName(b.customerName))}, your booking with ${esc(brand.brandName)} for <strong class="c-ink" style="color:${G.ink};">${esc(dateLong)}</strong> at <strong class="c-ink" style="color:${G.ink};">${formatTime12hr(b.startTime)}</strong> has been cancelled.`),
      proseBlock(`We'd love to see you another time &mdash; you can book again at <a href="${brand.siteUrl}" class="c-accent" style="color:${brand.accent}; text-decoration:none;">${esc(host)}</a>.`),
      ownWords(brand, "cancelled"),
    ].filter(Boolean);
  return mail(
    forOwner ? `Cancelled — ${b.customerName} — ${dateLong}` : `Your booking has been cancelled`,
    shell(brand, blocks, `Cancelled: ${dateLong}`),
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
  const dateLong = formatDateLong(b.dateStr);
  const oldLong = formatDateLong(oldDateStr);
  const blocks = [
    labBlock("Rescheduled"),
    headlineBlock(forOwner ? b.customerName : "Your booking has moved"),
    proseBlock(forOwner
      ? `<strong class="c-ink" style="color:${G.ink};">${esc(b.customerName)}</strong> moved their booking.`
      : `Hi ${esc(firstName(b.customerName))}, your booking with ${esc(brand.brandName)} has been moved.`),
    proseBlock(`<span style="color:${G.fog2}; text-decoration:line-through;">${esc(oldLong)} at ${formatTime12hr(oldStartTime)}</span>`, 24),
    markBlock(brand, [dateLong, `${formatTime12hr(b.startTime)} &ndash; ${formatTime12hr(b.endTime)}`]),
    factsBlock(jobFacts(brand, b)),
    forOwner ? "" : ownWords(brand, "rescheduled"),
    buttonBlock(brand, forOwner ? "Open the job" : "View your booking", b.receiptUrl),
  ].filter(Boolean);
  return mail(
    forOwner ? `Rescheduled — ${b.customerName} — now ${dateLong}` : "Your booking has been rescheduled",
    shell(brand, blocks, `Rescheduled to ${dateLong}`),
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
): Mail {
  const blocks = [
    labBlock("Your plan"),
    headlineBlock("Here's your link"),
    proseBlock(`Hi ${esc(firstName(opts.customerName))} &mdash; you're on <strong class="c-ink" style="color:${G.ink};">${esc(opts.planName)}</strong> with ${esc(brand.brandName)}.`),
    proseBlock("The button below opens your plan: what you're on, when your next visit is due, and how to book it.", 16),
    buttonBlock(brand, "Open your plan", opts.planUrl),
    fineBlock(`Keep this email &mdash; that link is the only way back to your plan. To book any time: ${opts.bookUrl}`),
  ];
  return mail(
    `Your plan with ${brand.brandName}`,
    shell(brand, blocks, `${opts.planName} — your link is inside.`),
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

export function campaignEmail(brand: TenantBrand, c: CampaignEmailData): Mail {
  const words = esc(String(c.message).trim()).split(/\r?\n\s*/).join("<br>");
  const blocks = [
    labBlock("Checking in"),
    headlineBlock(c.subject),
    proseBlock(`Hello ${esc(firstName(c.customerName))},`),
    proseBlock(words, 10),
    buttonBlock(brand, "Book again", c.bookUrl),
  ];
  return mail(
    c.subject,
    shell(
      brand,
      blocks,
      // The preheader is the start of what they actually wrote, not a
      // restatement of the subject sitting next to it in the inbox.
      String(c.message).trim().replace(/\s+/g, " ").slice(0, 90),
      { mailingAddress: c.mailingAddress, unsubscribeUrl: c.unsubscribeUrl },
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
      ? "Nothing has been deleted. Your jobs, your customers, your settings and your photos are all exactly where you left them, and the page comes back the moment a payment goes through."
      : "Nothing is at risk yet, and nothing gets deleted at any point. If it still has not gone through after two weeks, your booking page goes offline until it is paid.",
      16),
    b.reason ? fineBlock(`Your bank said: ${esc(b.reason)}`, 14) : "",
    buttonBlock(brand, down ? "Update your card and come back" : "Update your card", b.billingUrl),
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
      ? "Nothing has been deleted — update your card to bring the page back."
      : "We'll try again over the next two weeks."),
  );
}
