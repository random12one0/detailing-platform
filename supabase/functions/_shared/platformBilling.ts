// What a DETAILER pays US — the arithmetic, in one dependency-free module.
//
// Roadmap 2.20 stage 2. Everything in here is a PURE FUNCTION over plain
// values: no Deno, no Supabase, no fetch. That is deliberate and it is the
// only reason this money path can be pinned by a credential-free test the way
// `_shared/pricing.ts` is (Node 24 strips the types, so
// `tests/platform-billing.test.mjs` imports this file directly and checks the
// same code the edge functions run).
//
// ============================================================================
// THIS IS THE SECOND COPY OF THE PRICE TABLE, AND THE FIRST IS `app/src/
// landing/pricing.js`. THAT IS ALLOWED HERE FOR EXACTLY ONE REASON.
// ============================================================================
// A Supabase edge function is its own Deno bundle and the CLI will not follow
// an import out of `supabase/`, which is the same wall that forced
// `_shared/brandColor.js` to be a second copy of `app/src/lib/theme.js`.
// CLAUDE.md allows that in one place and charges a test for the permission.
// This is the second place and the price is the same: `PRICES` below is pinned
// against `pricing.js` value by value, so the two cannot drift.
//
// AND THE STAKES ARE HIGHER HERE THAN THEY WERE FOR A COLOUR. This repo's
// oldest rule is that *a number PRINTED on a screen is not a number that is
// CHARGED*, and this is the first module in the product where the second half
// is literally true — `/pricing` prints, and `lineItemsFor()` charges. The
// tie-out test is not optional decoration; it is the whole reason the copy is
// tolerable.
//
// ============================================================================
// WHY THE PRICES ARE INLINE `price_data` AND NOT STRIPE PRODUCT IDS
// ============================================================================
// The obvious build is to create Products and Prices in the Stripe dashboard
// and store their ids. It is also how a checkout starts charging a number
// nobody in this repo can see: the id says `price_1Abc…` and what it costs
// lives in another company's admin panel. Inline `price_data` means the amount
// on the card comes from THIS file, which comes from `pricing.js`, which is
// what the page printed — one chain, testable end to end, and zero Stripe
// dashboard setup for the owner to get wrong on a Sunday.
// The trade is that Stripe's own reporting groups by product name rather than
// by product id. That is a reporting inconvenience against a correctness
// guarantee, and it is not close.

// ---------------------------------------------------------------------------
// THE PRICE TABLE — mirror of app/src/landing/pricing.js. Dollars, as that
// file writes them; converted to cents once, at the bottom of `planFor`.

export const PRICES = {
  website: { setup: 999, monthly: 60, annual: 600, monthToMonth: 75 },
  bookingOnly: { monthly: 35 },
  founding: { setup: 499, monthly: 40, annual: 400, monthToMonth: 50 },
  term: { months: 12, exitFeeShare: 0.5 },
} as const;

export type PriceTable = {
  website: { setup: number; monthly: number; annual: number; monthToMonth: number };
  bookingOnly: { monthly: number };
  founding: { setup: number; monthly: number; annual: number; monthToMonth: number };
  term: { months: number; exitFeeShare: number };
};

/**
 * ROADMAP 4.4 STAGE 4 — the owner's own prices, out of
 * `platform_settings.prices`, with the table above as the default AND as the
 * fallback.
 *
 * IT VALIDATES EVERY FIELD AND FALLS BACK WHOLE, NEVER FIELD BY FIELD. A
 * half-applied override is the worst of the three outcomes: it charges a
 * number nobody chose, made of one row's monthly and one file's annual, and
 * it looks exactly like a working price. So one bad value discards the whole
 * object and the product charges what it charged yesterday.
 *
 * THE FLOOR IS `> 0` AND NOT `>= 0` FOR EVERY PRICE EXCEPT THE SETUP FEE.
 * A free plan is a decision with consequences all through the checkout — a
 * $0 subscription is not a subscription Stripe will bill — and it is not one
 * a JSON blob should be able to make by accident. A setup fee of zero IS a
 * real offer ("no build fee this month"), so it is the one figure allowed to
 * be nothing.
 */
export function pricesFrom(raw: unknown, fallback: PriceTable = PRICES as unknown as PriceTable): PriceTable {
  const money = (v: unknown, min = 0.01) =>
    typeof v === "number" && Number.isFinite(v) && v >= min && v < 100_000 ? v : null;
  try {
    const r = raw as PriceTable;
    if (!r || typeof r !== "object") return fallback;
    const ladder = (l: PriceTable["website"] | undefined) => {
      if (!l || typeof l !== "object") return null;
      const setup = money(l.setup, 0), monthly = money(l.monthly);
      const annual = money(l.annual), monthToMonth = money(l.monthToMonth);
      return setup === null || monthly === null || annual === null || monthToMonth === null
        ? null : { setup, monthly, annual, monthToMonth };
    };
    const website = ladder(r.website);
    const founding = ladder(r.founding);
    const booking = money(r.bookingOnly?.monthly);
    const months = r.term?.months;
    const share = r.term?.exitFeeShare;
    if (!website || !founding || booking === null) return fallback;
    if (!Number.isInteger(months) || months < 0 || months > 60) return fallback;
    if (typeof share !== "number" || !(share >= 0 && share <= 1)) return fallback;
    return { website, founding, bookingOnly: { monthly: booking }, term: { months, exitFeeShare: share } };
  } catch {
    return fallback;
  }
}

export const TERMS = ["annual-upfront", "annual-monthly", "monthly"] as const;
export type Term = (typeof TERMS)[number];
export const PLANS = ["website", "booking"] as const;
export type Plan = (typeof PLANS)[number];

/** What gets written to `platform_subscriptions` and charged to the card. */
export interface Snapshot {
  plan: Plan;
  term: Term;
  founding: boolean;
  setup_cents: number;
  recurring_cents: number;
  bill_interval: "month" | "year";
  term_months: number;
  exit_fee_share: number;
}

export const isTerm = (v: unknown): v is Term => TERMS.includes(v as Term);
export const isPlan = (v: unknown): v is Plan => PLANS.includes(v as Plan);

const cents = (dollars: number) => Math.round(dollars * 100);

/**
 * The one place a chosen plan becomes money.
 *
 * FOUNDING IS AN ARGUMENT AND NEVER A REQUEST. The caller passes what the
 * DATABASE said (`businesses.plan_tier = 'founding'`), not what the URL said —
 * exactly as `create-business` refuses to believe `?offer=founding` and asks
 * `claim_founding_spot()` instead. A visitor who edits the query string into
 * founding pricing would otherwise get it for the life of their account.
 *
 * BOOKING-ONLY HAS NO LADDER: one price, one month, no setup fee and no term.
 * `/pricing` reflects that — its button carries no `?term=` at all — so this
 * normalises anything it is handed to `monthly` rather than rejecting it,
 * because the alternative is a 400 on a plan that only has one shape.
 */
export function planFor(plan: Plan, term: Term, founding: boolean, table: PriceTable = PRICES as unknown as PriceTable): Snapshot {
  if (plan === "booking") {
    return {
      plan: "booking",
      term: "monthly",
      founding: false, // the founding ladder is the website plan's; see pricing.js
      setup_cents: 0,
      recurring_cents: cents(table.bookingOnly.monthly),
      bill_interval: "month",
      term_months: 0,
      exit_fee_share: 0,
    };
  }

  const p = founding ? table.founding : table.website;
  const base = { plan: "website" as const, term, founding, setup_cents: cents(p.setup) };

  // ONLY annual-paid-monthly CARRIES A COMMITMENT. The other two are the
  // control in the FTC's own complaint: an exit fee is defensible beside a
  // discount it is paying for, and indefensible on a plan that has neither.
  if (term === "annual-monthly") {
    return {
      ...base,
      recurring_cents: cents(p.monthly),
      bill_interval: "month",
      term_months: table.term.months,
      exit_fee_share: table.term.exitFeeShare,
    };
  }
  if (term === "annual-upfront") {
    return {
      ...base,
      recurring_cents: cents(p.annual),
      bill_interval: "year",
      // Prepaid: the year is already in the bank, so there is nothing to
      // commit to and nothing to charge for leaving. That is the whole reason
      // the plans research prefers it to a lock-in.
      term_months: 0,
      exit_fee_share: 0,
    };
  }
  return {
    ...base,
    recurring_cents: cents(p.monthToMonth),
    bill_interval: "month",
    term_months: 0,
    exit_fee_share: 0,
  };
}

// ---------------------------------------------------------------------------
// WHAT THE CARD IS ACTUALLY CHARGED

const money = (c: number) =>
  `$${(c / 100).toLocaleString("en-US", { minimumFractionDigits: c % 100 ? 2 : 0, maximumFractionDigits: 2 })}`;

/** The words on the Stripe page, the invoice and the card statement. */
export function planLabel(s: Snapshot): string {
  if (s.plan === "booking") return "Booking system";
  const kind = s.term === "annual-upfront" ? "annual"
    : s.term === "annual-monthly" ? "annual, paid monthly"
    : "month to month";
  return `Website and booking system — ${kind}`;
}

/**
 * EVERY LINE THE CARD IS CHARGED, and this is the tie-out's subject.
 *
 * It used to return Stripe Checkout `line_items` and **the checkout stopped
 * using it on 2026-09-05** when the hosted page was replaced with our own
 * form. Nothing broke and nothing said so: `platform-billing` still IMPORTED
 * it, this file still exported it, and § 2 — *"what the page prints is what
 * the card is charged"*, the one rule that outranks every other rule here —
 * went on passing against a function no request could reach. **A test guarding
 * dead code reads exactly like coverage.** So the shape moved to what the
 * Subscriptions API actually takes, and both callers were pointed at it.
 *
 * IT DESCRIBES THE MONEY, NOT STRIPE'S PARAMETERS. A recurring line and a
 * one-off line are two different Stripe fields now (`items` and
 * `add_invoice_items`), and `product` must be an id the caller has fetched —
 * so translating is the endpoint's job and DECIDING is this file's. The names
 * are here for the same reason the amounts are: a receipt that says something
 * different from the screen is the same bug as a price that does.
 *
 * The build fee stays its own line rather than folded into the first charge.
 * The money is identical; the invoice saying `Website build — $999` on its own
 * row is the difference between a detailer reading their receipt and a
 * detailer emailing about it.
 */
export type Line = {
  name: string;
  cents: number;
  /** `null` is the one-off build fee — an `add_invoice_items` entry. */
  interval: "month" | "year" | null;
};

export function linesFor(s: Snapshot): Line[] {
  const lines: Line[] = [
    { name: planLabel(s), cents: s.recurring_cents, interval: s.bill_interval },
  ];
  if (s.setup_cents > 0) {
    lines.push({ name: BUILD_FEE_LINE, cents: s.setup_cents, interval: null });
  }
  return lines;
}

/** The words on the build fee's own invoice row, in ONE place. */
export const BUILD_FEE_LINE = "Website build — one-off";

/** What leaves the bank on day one. The tie-out test's subject. */
export const firstChargeCents = (s: Snapshot) => s.setup_cents + s.recurring_cents;

// ---------------------------------------------------------------------------
// CONSENT — AB 2863's "express affirmative consent"

/**
 * The sentence beside the tick, and the sentence stored in
 * `platform_subscriptions.consent_text`.
 *
 * IT IS GENERATED FROM THE SNAPSHOT RATHER THAN TYPED INTO THE SCREEN, which
 * is the only way the words a detailer agreed to and the money they are
 * charged can never disagree. A hand-written sentence on the checkout is one
 * config change away from promising $40 while charging $60 — and the whole
 * value of storing consent is that it can be quoted back in a card dispute.
 *
 * It names all four things the statute wants said out loud: that it renews by
 * itself, how often, how much, and what leaving costs.
 */
export function consentSentence(s: Snapshot): string {
  const every = s.bill_interval === "year" ? "every year" : "every month";
  const parts = [
    s.setup_cents > 0
      ? `I understand I am paying ${money(s.setup_cents)} once for the build and ${money(s.recurring_cents)} ${every} after that, starting today.`
      : `I understand I am paying ${money(s.recurring_cents)} ${every}, starting today.`,
    `It renews by itself until I cancel, and I can cancel any time from my own billing page.`,
  ];
  if (s.term_months > 0) {
    parts.push(
      `I am committing to ${s.term_months} months. If I cancel before that, I pay ` +
      `${Math.round(s.exit_fee_share * 100)}% of the months still to run — ` +
      `for example ${money(exitFeeCentsFor(s.recurring_cents, s.term_months / 2, s.exit_fee_share))} ` +
      `with ${s.term_months / 2} months left.`,
    );
  }
  return parts.join(" ");
}

// ---------------------------------------------------------------------------
// THE EARLY-EXIT FEE

/** Half of the months still to run, in cents. Rounded, never negative. */
export function exitFeeCentsFor(recurringCents: number, monthsLeft: number, share: number): number {
  return Math.max(0, Math.round(recurringCents * monthsLeft * share));
}

/**
 * WHOLE months from `from` to `to`, floored at zero — the conservative reading,
 * and deliberately so: this number is multiplied by money we take off somebody.
 * A part-month is not charged.
 *
 * Both arguments are dates, not timestamps; `term_ends_on` is a `date` column.
 */
export function wholeMonthsBetween(from: Date, to: Date): number {
  let months = (to.getUTCFullYear() - from.getUTCFullYear()) * 12
    + (to.getUTCMonth() - from.getUTCMonth());
  if (to.getUTCDate() < from.getUTCDate()) months -= 1;
  return Math.max(0, months);
}

export interface TermRow {
  recurring_cents: number;
  term_months: number;
  exit_fee_share: number;
  term_ends_on: string | null;
}

/**
 * What cancelling costs TODAY.
 *
 * Zero on the two plans with no term, zero once the term has run out, and
 * zero on a row that never got a term end date. `term_ends_on` is the
 * authority rather than "twelve months after `created_at`", because a
 * subscription can be paused, resumed and re-dated by Stripe and the date the
 * customer was told is the one that binds.
 */
export function exitFeeCents(sub: TermRow, today: Date = new Date()): number {
  if (!sub.term_months || !sub.exit_fee_share || !sub.term_ends_on) return 0;
  const end = new Date(`${sub.term_ends_on}T00:00:00Z`);
  if (Number.isNaN(end.getTime())) return 0;
  const left = Math.min(sub.term_months, wholeMonthsBetween(today, end));
  return exitFeeCentsFor(sub.recurring_cents, left, sub.exit_fee_share);
}

/** The date twelve months out, for a subscription that starts today. */
export function termEndDate(startedAt: Date, months: number): string | null {
  if (!months) return null;
  const d = new Date(Date.UTC(
    startedAt.getUTCFullYear(),
    startedAt.getUTCMonth() + months,
    startedAt.getUTCDate(),
  ));
  return d.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// STRIPE'S EIGHT STATUSES INTO OUR FIVE

export type OurStatus = "incomplete" | "active" | "past_due" | "suspended" | "canceled";

const STATUS_MAP: Record<string, OurStatus> = {
  incomplete: "incomplete",
  incomplete_expired: "canceled",
  trialing: "active",
  active: "active",
  past_due: "past_due",
  // Stripe's `unpaid` is what a subscription becomes when the retries are
  // exhausted and the dashboard is set to "leave the subscription unpaid". It
  // is the moment the pricing page's printed promise fires.
  unpaid: "suspended",
  paused: "suspended",
  canceled: "canceled",
};

/**
 * Returns null for a status this product has never heard of, and the CALLER
 * then keeps whatever it already had.
 *
 * That direction is the safe one and it is the reason this returns null rather
 * than defaulting: a new Stripe status defaulting to `active` gives away the
 * product, and defaulting to `suspended` takes a paying detailer's site down
 * because Stripe shipped a feature we do not use.
 */
export function ourStatus(stripeStatus: unknown): OurStatus | null {
  return STATUS_MAP[String(stripeStatus)] ?? null;
}

// ---------------------------------------------------------------------------
// DUNNING — what the detailer is told, and when

export interface DunningRow {
  status: string;
  dunning_attempts: number;
  suspended_at?: string | null;
}

export interface DunningState {
  /** `ok` draws nothing at all. */
  level: "ok" | "warn" | "down";
  headline: string;
  detail: string;
}

/**
 * THE WORDS ARE THE PROMISE ON `/pricing`, NOT A NEW POLICY:
 *
 *   "we try the card again over the following two weeks and email you each
 *    time. If it still has not gone through after that, the site goes offline
 *    until it is paid. Nothing is deleted."
 *
 * So the past-due state says exactly that, and the suspended state says the
 * second half plus what to do. **It deliberately does not count attempts down
 * out loud** — Stripe owns the retry schedule (a dashboard setting), and a
 * product that prints "2 of 4 tries left" is a product that lies the day
 * somebody changes it. `dunning_attempts` is still stored, because the number
 * is worth having when a detailer is on the phone.
 */
export function dunningState(sub: DunningRow | null): DunningState {
  if (!sub) return { level: "ok", headline: "", detail: "" };
  // `suspended_at` OUTRANKS THE WORD, and a real test-clock run is what showed
  // why (2026-09-05). Stripe's default end-of-dunning behaviour on a fresh
  // account is to CANCEL the subscription rather than mark it unpaid, and the
  // cancellation event can land AFTER the final `invoice.payment_failed` that
  // suspended us — so the row ends up saying `canceled` while
  // `businesses.status` is `paused` and the booking page is genuinely offline.
  // Keying only on the word gave `level: "ok"`: a dark booking page and a
  // billing screen with nothing on it, which is the silent failure this whole
  // item keeps designing against. The page being off is a fact about US;
  // `suspended_at` is where we record it.
  if (sub.status === "suspended" || (sub.suspended_at && sub.status !== "active")) {
    return {
      level: "down",
      headline: "Your booking page is offline",
      detail:
        "We could not take payment. Nothing has been deleted — your jobs, "
        + "customers and settings are all still here, and the page comes back "
        + "the moment a payment goes through.",
    };
  }
  if (sub.status === "past_due") {
    return {
      level: "warn",
      headline: "Your last payment did not go through",
      detail:
        "We will try the card again over the next two weeks and email you each "
        + "time. If it still has not gone through after that, your booking page "
        + "goes offline until it is paid. Nothing gets deleted.",
    };
  }
  return { level: "ok", headline: "", detail: "" };
}

/** Does this state take the public booking page down? One question, one place. */
export const isSuspended = (status: string) => status === "suspended";
