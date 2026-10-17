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
  // NOT "from their receipt", which is what this said until the screens
  // were looked at: a PAID receipt never carries the button, by design
  // (stage 1, the owner's own complaint about his old site). It is the
  // booking page and an invoice still owed.
  return { ready: true, state: "ready", detail: "Customers can pay by card from their booking page." };
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

/**
 * Why a card payment did not settle a job. Stored on `bookings.payment_problem`.
 *
 * ROADMAP 97.11 added two kinds. `failed`: a bank payment that was on its way
 * did not go through. `extra`: money came in for a job already settled, so a
 * refund is owed — `payments` records each one, keyed on its payment intent,
 * and `paid_cents` is their sum. `extra` is shown on a PAID job; the other
 * three only while the job is unsettled.
 */
export interface PaymentProblem {
  kind: "amount" | "currency" | "failed" | "extra";
  paid_cents: number;
  owed_cents: number;
  currency: string;
  at: string;
  /** The payment this note is about, so one payment's two events note it once. */
  intent?: string;
  /** `reason`: a wrong-figure payment kept unpaid by 97.10, owed back once the job was paid another way (97.69). */
  payments?: { intent: string; paid_cents: number; currency: string; at: string; reason?: "amount" | "currency" }[];
  /** Older reasons still true, newest last — a new note is added, never written over one (`keepReasons`). */
  earlier?: Omit<PaymentProblem, "payments" | "earlier">[];
}

/**
 * ADD A REASON, NEVER REPLACE ONE — ROADMAP 97.11 (supervision 2026-10-17).
 * Two webhook writes used to put `next` over the row's note wholesale, so a
 * later, unrelated event erased a wrong-amount note (money still sitting in the
 * detailer's Stripe) or the list of refunds owed. `next` goes on top; every
 * older reason except this same payment's own goes into `earlier`; the refunds
 * owed come over unless `next` brings its own list.
 */
export function keepReasons(next: PaymentProblem, existing: PaymentProblem | null | undefined): PaymentProblem {
  const older = existing ? [...(existing.earlier ?? []), ...(existing.kind === "extra" ? [] : [existing])] : [];
  const earlier = older
    .filter((r) => !(next.intent && r.intent === next.intent && r.kind === next.kind))
    .map(({ payments: _p, earlier: _e, ...r }) => r);
  const payments = next.payments ?? existing?.payments;
  const { payments: _p, earlier: _e, ...top } = next;
  return { ...top, ...(payments?.length ? { payments } : {}), ...(earlier.length ? { earlier } : {}) };
}

/**
 * What a Stripe payment event says arrived. A session reports `payment_status`
 * and `amount_total`; an intent reports `status` and `amount_received`. Every
 * event that is not `payment_intent.succeeded` here is a checkout session —
 * `completed`, and 97.11's `async_payment_succeeded` / `async_payment_failed`.
 */
export function cardMoney(type: string, object: Record<string, unknown>) {
  const isIntent = type === "payment_intent.succeeded";
  const cents = Number(isIntent ? object.amount_received : object.amount_total);
  return {
    received: isIntent ? object.status === "succeeded" : object.payment_status === "paid",
    cents: Number.isFinite(cents) ? cents : 0,
    currency: String(object.currency ?? "").toLowerCase(),
  };
}

export type CardPaymentVerdict =
  | { settle: true }
  | { settle: false; problem: null }
  | { settle: false; problem: PaymentProblem };

/**
 * DOES THIS STRIPE PAYMENT SETTLE THIS JOB — ROADMAP 97.10.
 *
 * The webhook used to mark a job paid the moment either payment event arrived.
 * A completed checkout is not money: a session finishes `unpaid` when the
 * customer chose a bank transfer that has not cleared. And the amount was
 * never read, so a session created for the wrong figure settled the job
 * anyway — the detailer's record says paid and the money says otherwise.
 *
 * Not yet paid → `problem: null`: leave the job alone and record nothing,
 * because nothing is wrong yet (97.11 handles the late event). Paid, but not
 * the figure owed → a problem the detailer is shown on the job. The figure owed
 * is `amountDueCents`, the same sum `pay-booking` charged, so a correct payment
 * matches to the cent.
 */
export function cardPaymentVerdict(
  type: string,
  object: Record<string, unknown>,
  booking: PayableBooking,
  now: Date = new Date(),
): CardPaymentVerdict {
  const { received, cents: paid, currency } = cardMoney(type, object);
  if (!received) return { settle: false, problem: null };

  const owed = amountDueCents(booking);
  if (currency === "usd" && paid === owed && owed > 0) return { settle: true };
  return {
    settle: false,
    problem: {
      kind: currency === "usd" ? "amount" : "currency",
      paid_cents: paid,
      owed_cents: owed,
      currency,
      at: now.toISOString(),
    },
  };
}

/**
 * MONEY FOR A JOB THAT WAS ALREADY SETTLED — ROADMAP 97.11.
 *
 * The webhook used to return in silence when a payment arrived for a job
 * already paid or waived: a second open page paid, or a card paid after the
 * detailer marked cash. The customer is out the money and nobody is told.
 * This returns the `extra` problem to record, or null when there is nothing to
 * record: the money has not arrived, it is the payment that settled the job
 * (each payment sends two events), or it is already on the list.
 *
 * `existing` is the row's current `payment_problem`; an earlier list of extra
 * payments is kept and added to, never replaced, so a third payment does not
 * erase the second. (A `failed` problem can carry the list too — see
 * `failedBankPayment`.)
 */
export function extraPayment(
  type: string,
  object: Record<string, unknown>,
  intent: string,
  booking: PayableBooking & { stripe_payment_intent?: string | null },
  existing: PaymentProblem | null | undefined,
  now: Date = new Date(),
): PaymentProblem | null {
  const money = cardMoney(type, object);
  if (!money.received || !intent || intent === booking.stripe_payment_intent) return null;
  const earlier = Array.isArray(existing?.payments) ? existing.payments : [];
  if (earlier.some((p) => p.intent === intent)) return null;
  return keepReasons(extraProblem([...earlier, { intent, paid_cents: money.cents, currency: money.currency, at: now.toISOString() }], now), existing);
}

const extraProblem = (payments: NonNullable<PaymentProblem["payments"]>, now: Date): PaymentProblem => ({
  kind: "extra",
  paid_cents: payments.reduce((sum, p) => sum + p.paid_cents, 0),
  owed_cents: 0,
  currency: payments[payments.length - 1]?.currency ?? "usd",
  at: now.toISOString(),
  payments,
});

/**
 * THE JOB IS PAID, SO A WRONG-FIGURE PAYMENT KEPT ON IT IS NOW OWED BACK —
 * ROADMAP 97.69. 97.10 leaves a job unpaid and notes a payment of the wrong
 * figure or currency; when the right payment `intent` then settles the job, that
 * note was left behind and hidden (it is only shown on an unpaid job), with the
 * money still in the detailer's Stripe. Every kept `amount`/`currency` note about
 * ANOTHER payment moves onto the refunds-owed list; other reasons stay in
 * `earlier`. Returns undefined when there is nothing to move, so the settle
 * write leaves the column alone.
 */
export function settleProblem(
  intent: string,
  existing: PaymentProblem | null | undefined,
  now: Date = new Date(),
): PaymentProblem | undefined {
  if (!existing) return undefined;
  const reasons = [...(existing.earlier ?? []), ...(existing.kind === "extra" ? [] : [existing])];
  const owedBack = (r: Omit<PaymentProblem, "payments" | "earlier">) =>
    (r.kind === "amount" || r.kind === "currency") && !!r.intent && r.intent !== intent;
  const payments = [...(existing.payments ?? [])];
  for (const r of reasons) {
    if (owedBack(r) && !payments.some((p) => p.intent === r.intent)) {
      payments.push({ intent: r.intent!, paid_cents: r.paid_cents, currency: r.currency, at: r.at, reason: r.kind as "amount" | "currency" });
    }
  }
  if (payments.length === (existing.payments?.length ?? 0)) return undefined;
  const rest = reasons.filter((r) => !owedBack(r)).map(({ payments: _p, earlier: _e, ...r }) => r);
  return { ...extraProblem(payments, now), ...(rest.length ? { earlier: rest } : {}) };
}

/**
 * A BANK PAYMENT THAT DID NOT GO THROUGH — ROADMAP 97.11. Returns the patch for
 * the job's row, or null to leave it alone.
 *
 *   · it is not the payment that settled the job, and the job is settled
 *     (cash, a waiver, another payment) → null: nothing was taken from anyone;
 *   · it IS the payment that marked the job paid (the webhook before 97.10 did
 *     that while a bank debit was still on its way), and an extra payment
 *     already on the job is exactly the figure owed → that payment now settles
 *     the job: it stays paid, and only the OTHER extras stay owed back;
 *   · otherwise → `failed`, and the job goes back to unpaid if this payment had
 *     marked it paid.
 *
 * Every extra payment and every earlier reason already recorded is carried onto
 * what replaces it (`keepReasons`). The first version wrote a bare `failed` over
 * the row and erased a refund the detailer still owed (review, 2026-10-16), and
 * the next still erased a wrong-amount note (supervision, 2026-10-17).
 */
export function failedBankPayment(
  object: Record<string, unknown>,
  intent: string,
  booking: PayableBooking & { stripe_payment_intent?: string | null },
  existing: PaymentProblem | null | undefined,
  now: Date = new Date(),
): Record<string, unknown> | null {
  const ours = booking.stripe_payment_intent === intent;
  if (!ours && (booking.payment_status === "paid" || booking.payment_status === "waived")) return null;
  const extras = Array.isArray(existing?.payments) ? existing.payments : [];
  const owed = amountDueCents(booking);
  const cover = ours ? extras.find((p) => p.currency === "usd" && p.paid_cents === owed && owed > 0) : undefined;
  if (cover) {
    const left = keepReasons(extraProblem(extras.filter((p) => p !== cover), now), existing);
    return { stripe_payment_intent: cover.intent, payment_problem: left.payments || left.earlier ? left : null };
  }
  const money = cardMoney("checkout.session.async_payment_failed", object);
  const problem: PaymentProblem = {
    kind: "failed",
    paid_cents: money.cents,
    owed_cents: owed,
    currency: money.currency,
    at: now.toISOString(),
    intent,
  };
  const kept = keepReasons(problem, existing);
  return ours
    ? { payment_status: "pending", paid_online_at: null, stripe_payment_intent: null, payment_problem: kept }
    : { payment_problem: kept };
}

/** `stripe()` from `_shared/stripe.ts`, passed in so this module imports nothing and a test can stand in for Stripe. */
export type StripeCall = (
  path: string,
  body?: Record<string, unknown>,
  opts?: { method?: string; idempotencyKey?: string; stripeAccount?: string },
) => Promise<Record<string, unknown>>;

/**
 * ONE OPEN CHECKOUT PAGE PER BOOKING — ROADMAP 97.11.
 *
 * `pay-booking` made a new Stripe page whenever the amount changed and left the
 * old one open, so a $100 page could still be paid after the job became $150,
 * and two live pages could both be paid. Now, before a page is made:
 *
 *   · the previous page is still open at THIS amount → it is handed back, so a
 *     second tap or a reopened email link never makes a second live page;
 *   · it is open at a DIFFERENT amount → it is expired first, and only then is
 *     the new one made;
 *   · it is finished, expired, or Stripe no longer knows it (a 404: the detailer
 *     reconnected another Stripe account) → a new page is made.
 *
 * The caller's idempotency key gains the previous page's id, so a page made
 * after one finished is a fresh one rather than Stripe's cached answer to the
 * old key — the cached answer was the finished page itself.
 */
export async function checkoutSession(
  call: StripeCall,
  o: {
    /** `pay:<booking>:<cents>` — the previous page's id is added here. */
    idempotencyKey: string;
    amountCents: number;
    previousId: string | null | undefined;
    stripeAccount: string;
    params: Record<string, unknown>;
  },
): Promise<{ id: string; url: string; reused: boolean }> {
  let previous: Record<string, unknown> | null = null;
  if (o.previousId) {
    try {
      previous = await call(`/checkout/sessions/${o.previousId}`, undefined, { stripeAccount: o.stripeAccount });
    } catch (e) {
      if ((e as { status?: number })?.status !== 404) throw e;
    }
  }
  if (previous?.status === "open") {
    if (Number(previous.amount_total) === o.amountCents) {
      return { id: String(previous.id), url: String(previous.url), reused: true };
    }
    await call(`/checkout/sessions/${o.previousId}/expire`, {}, {
      stripeAccount: o.stripeAccount,
      idempotencyKey: `expire:${o.previousId}`,
    });
  }
  const s = await call("/checkout/sessions", o.params, {
    stripeAccount: o.stripeAccount,
    idempotencyKey: `${o.idempotencyKey}:${o.previousId || "first"}`,
  });
  return { id: String(s.id), url: String(s.url), reused: false };
}

/** Stripe refuses anything under 50 cents, and says so in a way nobody reads. */
export const STRIPE_MIN_CHARGE_CENTS = 50;

export interface RefundOwed {
  /** True when money has changed hands for work that is not going to happen. */
  owed: boolean;
  /**
   * What was taken, in cents — `amountDueCents`, so the detailer's agreed
   * final amount beats the original quote here exactly as it does everywhere
   * else. **ZERO WHEN `partial`**, and that is not a bug: nothing in this
   * database records WHICH part was paid. `payability` already refuses to
   * guess at it for the same reason. A figure invented here would be a figure
   * a detailer refunds.
   */
  amountCents: number;
  kind: "paid" | "partial" | "none";
}

/**
 * DOES ENDING THIS BOOKING LEAVE MONEY TO SORT OUT — ROADMAP 14.4.
 *
 * THREE PLACES SET A BOOKING TO `cancelled` AND NONE OF THEM USED TO ASK:
 * `cancel-booking` (the customer's own link), `respond-to-booking`'s decline
 * branch, and `update-booking` with `status: "cancelled"` (the detailer's own
 * "Cancel the job" button). Asking the question in three places is three
 * chances for one of them to stop asking, so it is asked here.
 *
 * **AND THE ANSWER IS AN INSTRUCTION, NOT A REFUND.** This platform never
 * holds the money — see the top of this file. On a Stripe Connect direct
 * charge the customer's money went into the DETAILER's own Stripe account and
 * the refund is theirs to make from their own balance. A platform that quietly
 * refunded it would be moving a stranger's money, which is the one thing this
 * whole design exists to avoid. So the product's job is to say so, loudly, to
 * the person who can actually do it.
 *
 * IT DELIBERATELY DOES NOT LOOK AT `status`. The cancel paths ask BEFORE they
 * write the row and the screens ask AFTER, and a function that insisted on
 * `cancelled` would answer "no money owed" to the callers that need it most.
 * The caller decides when the question is worth asking; this decides the
 * answer.
 *
 * `waived` IS NOT OWED. That is the detailer deciding this one is free — no
 * money ever moved, so there is nothing to give back.
 */
export function refundOwed(b: PayableBooking | null | undefined): RefundOwed {
  const status = b?.payment_status;
  if (status === "paid") return { owed: true, amountCents: amountDueCents(b), kind: "paid" };
  if (status === "partial") return { owed: true, amountCents: 0, kind: "partial" };
  return { owed: false, amountCents: 0, kind: "none" };
}

/**
 * The sentence the DETAILER reads, in their email and on the job. Written once
 * here so the two surfaces cannot drift into describing one fact two ways.
 * Never shown to a customer: it names Stripe and it names their balance.
 *
 * **IT TAKES THE FORMATTER RATHER THAN OWNING ONE, AND THE FIRST VERSION DID
 * NOT — caught by looking at the screen.** A `toFixed(2)` here printed
 * *"Refund $195.00"* into an email whose own facts table two rows above said
 * *"Was worth $180"*, and onto a job screen that says *"charged $195"* an inch
 * below. Both of this product's money formatters — `app/src/lib/format.js` and
 * `_shared/emailKit.ts` — drop the cents on a whole number, so a third rule
 * invented in this file was wrong on every surface at once.
 *
 * CLAUDE.md's rule is ONE FORMATTER EACH, so this does not import one: an
 * arithmetic module reaching into an email-drawing module is the wrong
 * direction, and the browser could not follow it anyway. The caller passes its
 * own, which is the only arrangement where the sentence is written once AND
 * every surface still speaks in its own voice about money.
 *
 * **AND THE TRANSLATOR THE SAME WAY — ROADMAP 3.4 FAULT 4.** A detailer whose
 * dashboard is Spanish now gets the owner's cancellation in Spanish, and this
 * sentence sits inside it. The caller passes `T(lang)` from `_shared/i18n.ts`;
 * left out, the English is filled in exactly as before. Same reason as the
 * formatter: this module imports nothing.
 */
export function refundInstruction(
  r: RefundOwed,
  money: (n: number) => string,
  tt: (english: string, vars?: Record<string, string>) => string =
    (english, vars) => english.replace(/\{(\w+)\}/g, (m, k) => vars?.[k] ?? m),
): string {
  if (!r.owed) return "";
  const amount = r.kind === "partial" ? tt("what they paid") : money(r.amountCents / 100);
  // A SENTENCE JOINT TAKES A FULL STOP, not an em dash — CLAUDE.md § the em
  // dash has three shapes, and `tests/em-dash.test.mjs` is the gate. This
  // sentence exists in FOUR places (here, `BookingDetail.jsx`, and two keys in
  // `appEs.js`) and the catalogue is keyed on the English, so the punctuation
  // is load-bearing: change it here alone and the dashboard falls back to
  // English on a Spanish screen with no error anywhere.
  return tt("This was paid. Refund {amount} from your own Stripe. The money went straight into your account, so we cannot send it back for you.", { amount });
}

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
    return no("already_paid", "This is already paid. There is nothing to do.");
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
  return when ? `${who} · ${when}` : who;
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
