// A DETAILER TAKING CARDS — roadmap 2.20 stage 3, the arithmetic half.
//
// Stage 1 printed the detailer's own Venmo/Cash App/Zelle handles on the
// invoice; stage 2 charges the DETAILER their subscription. This is the third
// direction and the one with the most ways to be wrong: a detailer's own
// CUSTOMER paying the DETAILER by card.
//
// THE MONEY NEVER TOUCHES THIS PLATFORM AND THAT IS THE WHOLE DESIGN.
// `docs/payments-research-2026-09-04.md`: holding other people's revenue makes
// the platform a money transmitter, owning their chargebacks and answering for
// a detailer who did not turn up. Stripe Connect **Standard** avoids all of it
// — the detailer has their own Stripe account, the charge is created ON that
// account (a "direct charge"), the money lands in their bank, they pay their
// own 2.9% + 30c and they own their own disputes. Stripe charges the PLATFORM
// nothing for this, because the connected account is the fee payer by default
// on `type=standard`.
//
// STANDARD IS ALSO THE ONLY TYPE THAT WORKS TODAY, and for a reason that is
// nothing to do with architecture: **Express and Custom accounts require the
// account holder to be 18. Standard does not.** The research names it
// (§ "age requirement"), and it is the difference between this stage shipping
// now and waiting until December.
//
// WHY THIS FILE HAS NO `fetch` IN IT. Everything here is a decision or a sum,
// so `tests/connect.test.mjs` can run the whole of it under Node with no
// Stripe key, no database and no browser — the same shape as `pricing.ts` and
// `payments.ts`. The two edge functions beside it hold the I/O and nothing
// else. A rule worth keeping: if a line of this file needs the network, it is
// in the wrong file.

/**
 * `read_write` is required, and it is worth knowing what it is NOT.
 *
 * Connect's OAuth offers `read_only` and `read_write`. `read_only` cannot
 * create a charge, which is the entire feature — so there is no smaller scope
 * available and asking for one would fail at the first payment rather than at
 * the consent screen, which is the worse place to find out.
 */
export const CONNECT_SCOPE = "read_write";

/** Where Stripe sends a detailer to say yes. */
const AUTHORIZE = "https://connect.stripe.com/oauth/authorize";

/** True when this deployment has been told which platform it is. */
export const connectClientId = () => Deno.env.get("STRIPE_CONNECT_CLIENT_ID") || "";
export const connectConfigured = () => connectClientId().startsWith("ca_");

/**
 * The consent URL a detailer is sent to.
 *
 * `state` IS THE WHOLE SECURITY OF THE CALLBACK. The redirect lands on a
 * public URL carrying a `code`, and without a state that we issued and can
 * recognise, anyone could deliver their own `code` to it and attach THEIR
 * Stripe account to somebody else's business — which would send that
 * detailer's customers' money to a stranger. It is a random single-use value
 * stored against the business and cleared the moment it is spent; see
 * `stateFresh` for the other half.
 *
 * `stripe_user[…]` are PREFILLS, not claims. Stripe shows them on its own form
 * and the detailer can change every one — they exist so a detailer who already
 * has a Stripe account does not retype what we already know.
 */
export function authorizeUrl(opts: {
  clientId: string;
  state: string;
  redirectUri: string;
  email?: string | null;
  businessName?: string | null;
  url?: string | null;
}): string {
  const p = new URLSearchParams({
    response_type: "code",
    client_id: opts.clientId,
    scope: CONNECT_SCOPE,
    state: opts.state,
    redirect_uri: opts.redirectUri,
    "stripe_user[country]": "US",
    "stripe_user[business_type]": "sole_prop",
  });
  if (opts.email) p.set("stripe_user[email]", opts.email);
  if (opts.businessName) p.set("stripe_user[business_name]", opts.businessName);
  if (opts.url) p.set("stripe_user[url]", opts.url);
  return `${AUTHORIZE}?${p.toString()}`;
}

/**
 * A state is good for thirty minutes.
 *
 * Long enough that a detailer can go and make a Stripe account in the middle
 * of it — which is the ordinary case, not the exception, and a five-minute
 * window would fail exactly the people this is for. Short enough that an
 * abandoned attempt cannot be finished by somebody else a week later.
 */
export const STATE_TTL_MINUTES = 30;

export function stateFresh(issuedAt: string | Date | null | undefined, now: Date = new Date()): boolean {
  if (!issuedAt) return false;
  const t = issuedAt instanceof Date ? issuedAt : new Date(issuedAt);
  const ms = t.getTime();
  if (!Number.isFinite(ms)) return false;
  // A state issued in the future is a clock problem or a forged row; either
  // way it is not something to accept.
  const age = now.getTime() - ms;
  return age >= 0 && age <= STATE_TTL_MINUTES * 60_000;
}

/** The columns `business_settings` grew for this. All nullable, all optional. */
export interface ConnectSettings {
  stripe_account_id?: string | null;
  stripe_charges_enabled?: boolean | null;
  card_payments_enabled?: boolean | null;
}

export interface CardStatus {
  /** May a customer be shown a Pay by card button right now? */
  ready: boolean;
  /** Which of the four states this is, for a screen to draw. */
  state: "off" | "not_connected" | "unverified" | "ready";
  /** One sentence, in the DETAILER's words. Never shown to a customer. */
  detail: string;
}

/**
 * THE ONE PLACE THAT DECIDES WHETHER A CARD CAN BE TAKEN, and it is shared by
 * the settings screen, the invoice email and the public pay endpoint on
 * purpose. Three callers answering this question separately is three chances
 * to offer a customer a button that 500s — and the endpoint asks it again
 * server-side, because a stale email is a button that outlives the switch.
 *
 * THE ORDER OF THESE TESTS IS THE MESSAGE. A detailer who has not connected
 * anything should be told to connect, not told their account is unverified;
 * and one who has switched it OFF deliberately should be told that first,
 * before anything that reads as a fault.
 */
export function cardStatus(s: ConnectSettings | null | undefined): CardStatus {
  if (!s?.stripe_account_id) {
    return {
      ready: false,
      state: "not_connected",
      detail: "Connect a Stripe account to take card payments.",
    };
  }
  if (!s.stripe_charges_enabled) {
    return {
      ready: false,
      state: "unverified",
      detail:
        "Stripe has not finished checking your account yet, so card payments are not live. Finish the details Stripe asked for.",
    };
  }
  if (!s.card_payments_enabled) {
    return {
      ready: false,
      state: "off",
      detail: "Card payments are switched off. Your customers pay the ways you list instead.",
    };
  }
  return { ready: true, state: "ready", detail: "Customers can pay by card from their receipt." };
}

/** What a Stripe account object says about itself, reduced to what we store. */
export function accountReady(account: Record<string, unknown> | null | undefined): boolean {
  return Boolean(account?.charges_enabled);
}

export interface PayableBooking {
  total_price?: number | string | null;
  /** What the detailer settled on when they finalized. Wins when it exists. */
  final_amount?: number | string | null;
  payment_status?: string | null;
  status?: string | null;
}

/**
 * WHAT THE CUSTOMER OWES, IN CENTS, and the two traps are both in here.
 *
 * `final_amount` beats `total_price` BECAUSE THE DETAILER SET IT. `total_price`
 * is what the booking engine quoted; `final_amount` is what was actually agreed
 * at the car — a discount for a regular, an extra for a filthy engine bay —
 * and `FinalizeModal` writes it. Charging the quote after agreeing a different
 * number is the kind of error a customer disputes, and they would be right.
 *
 * NUMERIC COMES BACK FROM POSTGRES AS A STRING through PostgREST, so a bare
 * `booking.total_price * 100` is `NaN` waiting to happen. Parsed explicitly.
 *
 * ROUNDING IS HALF-UP ON CENTS, once, at the end. `19.99 * 100` is
 * 1998.9999999999998 in floating point and `Math.trunc` turns that into $19.98
 * — a cent short on every other invoice, and the kind of defect that is only
 * ever found by a detailer wondering why their takings never match.
 */
export function amountDueCents(b: PayableBooking | null | undefined): number {
  if (!b) return 0;
  const raw = b.final_amount ?? b.total_price ?? 0;
  const n = typeof raw === "string" ? Number.parseFloat(raw) : Number(raw);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.round(n * 100);
}

/** Stripe refuses anything under 50 cents, and says so in a way nobody reads. */
export const STRIPE_MIN_CHARGE_CENTS = 50;

export interface PayabilityInput {
  booking: PayableBooking | null | undefined;
  settings: ConnectSettings | null | undefined;
  /** `businesses.status` — billing's suspension, not the detailer's pause. */
  businessStatus?: string | null;
}

export interface Payability {
  ok: boolean;
  /** Machine-readable, so the endpoint's status code and the screen agree. */
  reason:
    | "ok"
    | "not_available"
    | "already_paid"
    | "cancelled"
    | "not_accepted"
    | "nothing_due"
    | "below_minimum"
    | "business_offline";
  amountCents: number;
  /** One sentence for the CUSTOMER. Never mentions Stripe or the platform. */
  message: string;
}

/**
 * MAY THIS PARTICULAR BOOKING BE PAID BY CARD RIGHT NOW.
 *
 * Everything a public endpoint needs to refuse, in one pure function, because
 * a public endpoint that decides this inline grows a fifth branch in six
 * months and one of them stops being checked. The endpoint calls this and
 * turns `reason` into a status code; nothing else decides.
 *
 * `already_paid` IS THE ONE THAT MATTERS MOST. The receipt link lives in an
 * email for ever and a customer will open it again — after paying by card, or
 * after handing over cash and the detailer marking it paid. Charging a second
 * time because a stale page still had a button on it is the worst thing this
 * feature could do, so the check is here AND the endpoint re-reads the row
 * inside the same request before it creates anything.
 */
export function payability(input: PayabilityInput): Payability {
  const amountCents = amountDueCents(input.booking);
  const no = (reason: Payability["reason"], message: string): Payability => ({
    ok: false,
    reason,
    amountCents,
    message,
  });

  if (input.booking?.status === "cancelled") {
    return no("cancelled", "This appointment was cancelled, so there is nothing to pay.");
  }
  // A REQUEST NOBODY HAS ACCEPTED YET IS NOT A BILL. In request mode
  // (roadmap 2.12) a booking sits at `pending` while the detailer decides,
  // and its own customer email says so in as many words: *"we're holding your
  // time"*, charging nothing. Taking a card on it means money moved for work
  // that may then be DECLINED — and a refund on a connected account is the
  // detailer's to make, out of their own balance, for a decision the product
  // let the customer make first. `total_price` on a pending row is also only
  // an estimate until a quote is accepted, so the figure would be wrong as
  // well as premature.
  if (input.booking?.status === "pending") {
    return no("not_accepted", "This is still a request. You can pay once it has been accepted.");
  }
  // 'waived' is the detailer deciding this one is free. 'partial' is deliberately
  // NOT payable here: we do not know what part is left, and guessing at a
  // customer's card is not a thing to do — the detailer sorts it out directly.
  const status = input.booking?.payment_status;
  if (status === "paid" || status === "waived") {
    return no("already_paid", "This is already paid — there is nothing to do.");
  }
  if (status === "partial") {
    return no("already_paid", "Part of this has been paid already. Please settle the rest with your detailer.");
  }
  if (input.businessStatus === "paused") {
    return no("business_offline", "This business is not taking payments at the moment.");
  }
  if (!cardStatus(input.settings).ready) {
    return no("not_available", "This business does not take card payments online.");
  }
  if (amountCents <= 0) {
    return no("nothing_due", "There is no amount owing on this appointment.");
  }
  if (amountCents < STRIPE_MIN_CHARGE_CENTS) {
    return no("below_minimum", "This amount is too small to pay by card. Please settle it with your detailer.");
  }
  return { ok: true, reason: "ok", amountCents, message: "" };
}

/**
 * The one line item a customer sees on Stripe's page.
 *
 * IT NAMES THE DETAILER, NOT THE PLATFORM. On a direct charge the whole
 * checkout page is already branded as the connected account, and a customer
 * who booked "Andrew's Auto Detail" should never read the word
 * "detailingplatform" on the screen where they type a card number — that seam
 * is the one thing contract §6a exists to keep shut.
 */
export function checkoutLineName(businessName: string | null | undefined, when: string | null | undefined): string {
  const who = (businessName || "Detailing").trim();
  return when ? `${who} — ${when}` : who;
}

/**
 * WHERE STRIPE SENDS THEM BACK, AND IT IS A CONSTANT BECAUSE STRIPE COMPARES
 * IT CHARACTER FOR CHARACTER.
 *
 * The redirect URI is registered once in the Stripe dashboard and sent again
 * on every authorize call, and Stripe rejects the pair if they differ by a
 * trailing slash. Two places building this string independently is one rename
 * away from a consent screen that ends in `redirect_uri_mismatch` — an error
 * that reads like a broken integration and is a typo.
 *
 * Registered in the dashboard as:
 *   https://detailingplatform.com/settings/payments/connected
 */
export const CONNECT_RETURN_PATH = "/settings/payments/connected";
export const connectReturnUrl = (platformUrl: string) =>
  `${platformUrl.replace(/\/+$/, "")}${CONNECT_RETURN_PATH}`;
