// THE REBUILT TEMPLATES — roadmap 2.18, 2026-09-03. TWO OF TWELVE.
//
// This file is deliberately small and deliberately temporary in its current
// form: it holds the two emails the owner has actually looked at — the
// confirmation and the invoice — rebuilt in The Thread so he can approve the
// WORLD before the other ten are ported into it. The old
// `_shared/emailTemplates.ts` is still what the edge functions send; nothing
// here is wired up yet, and `tests/email-brand.test.mjs` is still green on the
// old file. **The swap is one commit, after he says yes.**
//
// READ EVERY TEMPLATE HERE AS A LIST OF BLOCKS, because that is the owner's
// own ask and it is the whole architecture: *"by custom i mean they can choose
// whats in it and what order ect."* A template is an ARRAY. The editor
// reorders it, drops entries from it, and swaps the words inside the prose
// entries. Nothing below is a bespoke layout, which is exactly why an editor
// over it is possible at all.
//
// THE MONEY BLOCK IS NOT REORDERABLE AND NOT EDITABLE, and that is a rule
// rather than an omission — see `emailKit.ts`'s header and CLAUDE.md.

import {
  type Brand,
  buttonBlock,
  esc,
  factsBlock,
  fineBlock,
  formatDateLong,
  formatTime12hr,
  headlineBlock,
  labBlock,
  markBlock,
  money,
  type MoneyLine,
  moneyBlock,
  noteBlock,
  proseBlock,
  ruleBlock,
  shell,
} from "./emailKit.ts";

export interface JobFacts {
  customerName: string;
  dateStr: string;
  startTime: string;
  endTime: string;
  serviceType: string;
  vehicleSize: string;
  vehicleModel: string | null;
  address: string;
  serviceNames: string[];
  addOnNames: string[];
  receiptUrl: string;
}

const firstName = (full: string) => String(full || "").trim().split(" ")[0] || "there";

const sizeDisplay = (s: string) =>
  ({ small: "Small car", mid: "Mid-size", midsize: "Mid-size", large: "Large / SUV", xl: "Extra large" } as Record<string, string>)[s] ?? s;

// ---------------------------------------------------------------------------
// 1 · BOOKING CONFIRMED  /  REQUEST RECEIVED
//
// SPLIT INTO TWO PROMISES, one flag. The six-product sweep found that both
// products with a request mode ship these as separate notifications, and they
// do say different things — "you have this slot" against "we have your request
// and will answer". The owner's own framing: *"one is just a little bit more
// guaranteed than the other."*
//
// THE ONE ACCENT MARK IS ON THE APPOINTMENT, because the appointment is the
// thing that has landed. Not on the header, not on the button as well.
// ---------------------------------------------------------------------------
export function confirmationEmail(
  brand: Brand,
  j: JobFacts,
  quote: { lines: MoneyLine[]; total: number; estimate: boolean },
  isRequest = false,
): { subject: string; html: string } {
  const dateLong = formatDateLong(j.dateStr);

  const blocks = [
    // THE EYEBROW IS FOG, NOT ACCENT. It was accent in the first render and it
    // competed with the mark 100px below it — two accent hits in one glance is
    // the scatter the system's one-accent law exists to prevent. `--fog-2` is
    // the token the type scale assigns to an 11px label anyway; the accent's
    // jobs on this email are the appointment, the money and the action.
    labBlock(isRequest ? "Request received" : "Booking confirmed"),
    headlineBlock(isRequest ? "We're holding your time" : "You're all set"),
    proseBlock(
      isRequest
        ? `Thanks, ${esc(firstName(j.customerName))} &mdash; we've got your request and nobody else can take this time while we look at it. You'll hear from us shortly.`
        : `Thanks, ${esc(firstName(j.customerName))}. Here's everything for your appointment.`,
    ),

    markBlock(brand, [dateLong, `${formatTime12hr(j.startTime)} &ndash; ${formatTime12hr(j.endTime)}`]),

    factsBlock([
      ["Where", esc(j.address)],
      [j.serviceType === "mobile" ? "We come to you" : "Drop-off", j.serviceType === "mobile" ? "Yes" : "At our unit"],
      ["Vehicle", `${esc(sizeDisplay(j.vehicleSize))}${j.vehicleModel ? ` &middot; ${esc(j.vehicleModel)}` : ""}`],
    ]),

    // THE SERVICES ARE NOT LISTED TWICE. The first render had a "What we're
    // doing" list and then a money table naming the same three things with
    // prices beside them. That is the owner's own copy rule broken in layout
    // form — *does this block add a fact the one below it does not already
    // carry?* It did not. The money table IS the list of work; it just also
    // says what each line costs.
    ruleBlock(34),
    labBlock("What we're doing"),
    moneyBlock(brand, quote.lines, { label: quote.estimate ? "Estimated total" : "Total", amount: quote.total }),
    quote.estimate
      ? fineBlock("An estimate. If the car needs more time than the photos suggested we'll tell you before we start, never after.")
      : "",

    buttonBlock(brand, isRequest ? "View or change your request" : "View your booking", j.receiptUrl),
    isRequest
      ? noteBlock("Nothing is charged now. We'll email you the moment we've accepted.")
      : "",
  ].filter(Boolean);

  return {
    subject: isRequest
      ? `Request received &mdash; ${dateLong}`.replace(/&mdash;/g, "—")
      : `Booking confirmed — ${dateLong}`,
    html: shell(
      brand,
      blocks,
      isRequest ? "We're holding your time while we look at it." : `${dateLong} at ${formatTime12hr(j.startTime)}.`,
    ),
  };
}

// ---------------------------------------------------------------------------
// 2 · RECEIPT  (and, unpaid, INVOICE)
//
// SPLIT FROM ONE EMAIL INTO TWO PROMISES — five of the six products in the
// sweep send a payment receipt as its own thing, and ours has been sending a
// document headed "invoice" for money it had already taken.
//
// **THE ITEMISATION REACHES THE TOTAL, WHICH IS THE WHOLE POINT OF THE
// REBUILD.** The live invoice does not: its rows sum to `subtotalBase` while
// its total is `final_amount`, so the promo, the site sale and the rounding
// are all missing from the column. The caller passes every line INCLUDING the
// discounts, and `render-emails.mjs` refuses to pass while they do not add up.
// ---------------------------------------------------------------------------
export function receiptEmail(
  brand: Brand,
  j: JobFacts,
  lines: MoneyLine[],
  total: number,
  opts: { paid: boolean; method: string | null; ref: string },
): { subject: string; html: string } {
  const dateLong = formatDateLong(j.dateStr);

  const blocks = [
    labBlock(opts.paid ? "Receipt" : "Invoice"),
    headlineBlock(opts.paid ? "Paid in full" : "Amount due"),
    proseBlock(
      opts.paid
        ? `Thanks, ${esc(firstName(j.customerName))} &mdash; here's your receipt for the work on ${esc(dateLong)}.`
        : `Hi ${esc(firstName(j.customerName))}, here's the invoice for the work on ${esc(dateLong)}.`,
    ),

    factsBlock([
      ["Reference", `<span style="font-family:'SF Mono',Menlo,Consolas,monospace;">${esc(opts.ref)}</span>`],
      ["Vehicle", `${esc(sizeDisplay(j.vehicleSize))}${j.vehicleModel ? ` &middot; ${esc(j.vehicleModel)}` : ""}`],
      ...(opts.paid && opts.method ? [["Paid by", esc(opts.method)] as [string, string]] : []),
    ]),

    ruleBlock(34),
    labBlock(opts.paid ? "What you paid for" : "What this covers"),
    moneyBlock(brand, lines, { label: opts.paid ? "Total paid" : "Amount due", amount: total }),

    buttonBlock(brand, "View this online", j.receiptUrl),
    fineBlock("Keep this for your records. Reply to this email if anything looks wrong."),
  ];

  return {
    subject: opts.paid
      ? `Receipt — ${money(total)} — ${brand.brandName}`
      : `Invoice — ${money(total)} due — ${brand.brandName}`,
    html: shell(brand, blocks, opts.paid ? `Paid in full — ${money(total)}.` : `${money(total)} due.`),
  };
}
