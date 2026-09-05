// THE DETAILER'S OWN WAYS TO BE PAID — roadmap 2.20, stage 1.
//
// WHAT THIS IS AND WHY IT IS THE FIRST STAGE. Stage 2 charges detailers and
// stage 3 lets a detailer take cards; both need a processor, a webhook and a
// key. This one needs none of them: the detailer types the handles they
// already give people at the door, and the emails print them. It costs the
// platform nothing, costs the detailer 0%, and is the only stage that can ship
// before the owner turns 18 and opens a Stripe account.
//
// WHERE THE HANDLES PRINT, AND THE ONE PLACE THEY MUST NOT.
// `invoiceEmail` branches on `payment_status`: paid draws a RECEIPT, unpaid
// draws an INVOICE. The handles go on the invoice and NEVER on the receipt —
// the owner's own complaint about his old site was that it printed "here's the
// payments we accept" on a document for money it had already taken. Round 3 of
// `docs/payments-research-2026-09-04.md` then widened it in the other
// direction, from his knowledge of the trade rather than from research:
// *"they don't leave a client's house until it's paid"*, so the unpaid invoice
// is a rare document and round 2 was aiming at a page almost nobody sees. His
// old site already had it in the better place —
// `reference/supabase/functions/create-booking/index.ts:776` prints
// "Payments accepted…" in the CONFIRMATION email, before the job, when it is
// actually useful.
//
// THIS MODULE RETURNS DATA, NOT HTML, and that is deliberate. Every handle
// here is TYPED BY A DETAILER and delivered to their customer, which makes it
// the second human-typed string in the product to reach an email (the first is
// `campaignEmail`'s body, and `tests/campaign.test.mjs` exists because of it).
// Escaping lives in `emailTemplates.ts` beside every other escape in the
// product; a module that returned markup would be a second place to forget.
//
// A LINK IS BUILT ONLY WHEN IT CAN BE BUILT CORRECTLY. A wrong payment link is
// worse than no link — it sends money to the wrong person, or 404s and looks
// like the detailer is not a real business. So there are exactly two things we
// are ever sure enough of to link: a plain USERNAME on a service whose URL
// shape we know, and a URL THE DETAILER PASTED THEMSELVES. Everything else is
// printed exactly as typed.
//
// THAT SECOND RULE IS WHY ZELLE IS NOT A SPECIAL CASE, and the header said it
// was until a security review read the code rather than the comment. Zelle has
// no username we can build a link FROM — it is reached by phone number or
// email inside a bank's own app — so it has no entry in `LINK` and a typed
// handle never links. A pasted `https:` URL still does, because that branch
// runs first and is about who typed it rather than about which service it is.
// Pinned by two cases in `tests/payments.test.mjs` § 1, so the next reader
// finds the behaviour rather than a claim about it.

/** The columns `business_settings` grew for this. All nullable, all optional. */
export interface PaymentSettings {
  pay_cash?: boolean | null;
  pay_venmo?: string | null;
  pay_cashapp?: string | null;
  pay_zelle?: string | null;
  pay_paypal?: string | null;
  pay_other?: string | null;
}

export interface PaymentHandle {
  /** The method, in the customer's words. */
  label: string;
  /** What they type into that app, or when to hand it over. Never empty. */
  handle: string;
  /** A link that opens the app on the right person, or null when we cannot
   *  build one we are sure of. */
  href: string | null;
}

// The three that have a public web address per person. Zelle does not, and
// `other` is free text that could be anything.
const LINK: Record<string, (handle: string) => string> = {
  venmo: (h) => `https://venmo.com/u/${h}`,
  cashapp: (h) => `https://cash.app/$${h}`,
  paypal: (h) => `https://paypal.me/${h}`,
};

// WHAT ALL THREE OF THOSE SERVICES ACCEPT IN A URL, and nothing wider. A
// handle that does not match is a phone number, an email address, a sentence,
// or a mistake — every one of which produces a broken link if it is pasted
// into a template.
const USERNAME = /^[A-Za-z0-9][A-Za-z0-9_.-]{0,39}$/;

// A DETAILER WHO PASTES THEIR OWN LINK GETS THAT LINK. It is what half of them
// will do, because it is what the app's own share button hands them. `https`
// only, and no character that could close the attribute it lands in.
const URL_ONLY = /^https:\/\/[A-Za-z0-9._~:/?#@!$&*+,;=%()[\]-]{3,180}$/;

/** Trim, and drop the sigil people type in front of their own handle. */
const normalise = (raw: string): string => String(raw).trim().replace(/^[@$]+/, "").trim();

function one(kind: string, label: string, raw: string | null | undefined, sigil = ""): PaymentHandle | null {
  const typed = String(raw ?? "").trim();
  if (!typed) return null;

  if (URL_ONLY.test(typed)) {
    // Shown without its scheme: a customer reads "venmo.com/u/ridgeline" as a
    // destination and "https://venmo.com/u/ridgeline" as a wall of text.
    return { label, handle: typed.replace(/^https:\/\//, ""), href: typed };
  }

  const handle = normalise(typed);
  if (!handle) return null;

  // THE SIGIL AND THE LINK STAND OR FALL TOGETHER. `@(303) 555-0142` is not a
  // Venmo handle, and printing one says the detailer does not know their own
  // payment details. Anything we cannot link, we print exactly as typed.
  const template = LINK[kind];
  const linkable = Boolean(template) && USERNAME.test(handle);
  return {
    label,
    handle: linkable ? `${sigil}${handle}` : handle,
    href: linkable ? template(handle) : null,
  };
}

/**
 * THE ORDER IS THE ANSWER TO "WHAT IS EASIEST FOR ME RIGHT NOW", not
 * alphabetical and not the order of the form. The tap-to-pay ones come first
 * because they are the only rows a customer can act on from inside the email;
 * the ones that need another app open come next; cash is last because it needs
 * the detailer to be standing there.
 */
export function paymentHandles(s: PaymentSettings | null | undefined): PaymentHandle[] {
  if (!s) return [];
  return [
    one("venmo", "Venmo", s.pay_venmo, "@"),
    one("cashapp", "Cash App", s.pay_cashapp, "$"),
    one("paypal", "PayPal", s.pay_paypal),
    one("zelle", "Zelle", s.pay_zelle),
    one("other", "Other", s.pay_other),
    s.pay_cash ? { label: "Cash", handle: "On the day", href: null } : null,
  ].filter(Boolean) as PaymentHandle[];
}
