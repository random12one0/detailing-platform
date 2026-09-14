// WHICH STRIPE PRICE A PLAN IS, AND WHAT IT COSTS — Andrew's decision,
// 2026-09-14, and it moves the source of truth for money out of this repo.
//
// ============================================================================
// WHY STRIPE'S CATALOGUE AND NOT A NUMBER IN OUR OWN FILES
// ============================================================================
// His own words, and they are a promise rather than a preference: a founding
// detailer is told their price is *"locked for the life of the account"*.
//
// **A STRIPE PRICE IS IMMUTABLE. A NUMBER IN OUR TABLE IS NOT.** A subscriber
// is attached to a price OBJECT, and that object's amount can never change —
// so when the list price goes up, everybody already on the old one keeps
// paying the old one, for ever, with nobody having to remember that they
// should. Raising prices means creating a NEW price with a NEW lookup key and
// pointing new signups at it; it never means editing an old one.
//
// With the amount living in `_shared/platformBilling.ts` instead, that promise
// held only as long as nobody edited a constant. One careless commit
// re-priced every existing customer at the next renewal, silently, and the
// only evidence would be on somebody's bank statement.
//
// ============================================================================
// LOOKUP KEYS, NEVER PRICE IDS
// ============================================================================
// A `price_1Abc…` in this repo is a value nobody can read, tied to one Stripe
// account, that breaks the moment test and live diverge. A lookup key is a
// stable handle the owner chooses and can re-point: creating the replacement
// price with the new key is the whole migration.
//
// So nothing here ever hardcodes a price id. The ids are RESOLVED at runtime
// and cached per instance.
//
// ============================================================================
// A MISSING KEY REFUSES THE CHECKOUT. IT NEVER FALLS BACK.
// ============================================================================
// **This is the rule that matters most and it is Andrew's own:** *"If a key is
// missing at runtime, fail loudly and refuse the checkout — never fall back to
// a different price, and never fall back to a number in our code. Quoting
// someone the wrong price is the worst outcome here."*
//
// A fallback is the failure this whole change exists to remove: it charges a
// number nobody chose while every screen looks healthy. A refusal is one
// detailer who cannot subscribe for ten minutes and one loud error naming the
// exact key to create.

import { stripe, StripeError } from "./stripe.ts";
import type { Plan, Term } from "./platformBilling.ts";

/**
 * EVERY LOOKUP KEY THIS PRODUCT CAN ASK STRIPE FOR.
 *
 * The founding ladder and the standard ladder are two sets of prices on the
 * SAME two Stripe products — Andrew created them that way deliberately, so
 * Stripe's own reporting still groups a founding and a standard subscriber
 * under one product line.
 *
 * **THE `_standard` SUFFIX IS THE LIST PRICE, NOT A DIFFERENT PRODUCT.** The
 * founding keys carry no suffix because they came first; renaming them now
 * would orphan the subscriptions already attached to them, which is precisely
 * what a lookup key exists to prevent.
 */
export const LOOKUP_KEYS = {
  founding: {
    setup: "website_build_fee",
    "annual-monthly": "website_dashboard_monthly",
    "annual-upfront": "website_dashboard_yearly",
    monthly: "website_dashboard_monthly_no_term",
  },
  standard: {
    setup: "website_build_fee_standard",
    "annual-monthly": "website_dashboard_monthly_standard",
    "annual-upfront": "website_dashboard_yearly_standard",
    monthly: "website_dashboard_monthly_no_term_standard",
  },
  booking: {
    monthly: "booking_only_monthly",
  },
} as const;

export interface PriceKeys {
  /** The subscription's own price. Always present. */
  recurring: string;
  /** The one-off build fee, or `null` for a plan that has none. */
  setup: string | null;
}

/**
 * The keys one chosen plan needs, and nothing else.
 *
 * **FOUNDING IS AN ARGUMENT AND NEVER A REQUEST**, exactly as `planFor`'s own
 * header says: the caller passes what the DATABASE decided
 * (`claim_founding_spot()` at checkout, `founding_offer()` for what `/pricing`
 * prints), never what a query string asked for. A visitor who edited
 * `?offer=founding` into the address would otherwise resolve the founding
 * price and keep it for the life of the account.
 *
 * BOOKING-ONLY HAS ONE PRICE, NO LADDER AND NO BUILD FEE — its button carries
 * no `?term=` at all, so anything it is handed normalises to the one key it
 * has rather than 400ing on a plan with only one shape.
 */
export function priceKeysFor(plan: Plan, term: Term, founding: boolean): PriceKeys {
  if (plan === "booking") {
    return { recurring: LOOKUP_KEYS.booking.monthly, setup: null };
  }
  const ladder = founding ? LOOKUP_KEYS.founding : LOOKUP_KEYS.standard;
  return { recurring: ladder[term], setup: ladder.setup };
}

/** Every key the product can ever ask for — what a check walks. */
export const ALL_LOOKUP_KEYS: string[] = [
  ...Object.values(LOOKUP_KEYS.founding),
  ...Object.values(LOOKUP_KEYS.standard),
  ...Object.values(LOOKUP_KEYS.booking),
];

export interface ResolvedPrice {
  /** `price_…` — resolved, never written down. */
  id: string;
  lookupKey: string;
  cents: number;
  currency: string;
  /** `null` for a one-off price such as the build fee. */
  interval: "month" | "year" | null;
  /** The Stripe product this price hangs off, for the invoice line's name. */
  product: string;
}

// ---------------------------------------------------------------------------
// THE CACHE — per warm instance, short, and deliberately not clever.
//
// A resolved price is a name-to-id lookup that changes only when the owner
// creates a new price, so re-fetching it on every checkout is a round trip
// bought for nothing. The TTL is short because the failure it guards against
// is the opposite one: a price created two minutes ago that this instance
// refuses to see for an hour, which reads to the owner as "I made it and it
// did not work".
//
// **IT CACHES SUCCESS ONLY.** A miss is never cached: the whole point of a
// missing key is that the owner is about to go and create it, and a cached
// absence turns a ten-second fix into a wait for an instance to recycle.
const TTL_MS = 60_000;
const cache = new Map<string, { at: number; price: ResolvedPrice }>();

/** Testing seam — the checks empty this between cases. */
export function clearPriceCache(): void {
  cache.clear();
}

const fresh = (key: string, now: number): ResolvedPrice | null => {
  const hit = cache.get(key);
  return hit && now - hit.at < TTL_MS ? hit.price : null;
};

const toResolved = (raw: Record<string, unknown>): ResolvedPrice => {
  const recurring = raw.recurring && typeof raw.recurring === "object"
    ? raw.recurring as Record<string, unknown>
    : null;
  const interval = recurring?.interval;
  return {
    id: String(raw.id),
    lookupKey: String(raw.lookup_key),
    cents: Number(raw.unit_amount),
    currency: String(raw.currency),
    interval: interval === "month" || interval === "year" ? interval : null,
    product: typeof raw.product === "string" ? raw.product : String((raw.product as Record<string, unknown>)?.id ?? ""),
  };
};

/**
 * Resolves lookup keys to live Stripe prices, or throws naming what is missing.
 *
 * ONE CALL FOR THE WHOLE SET. Stripe's list endpoint takes repeated
 * `lookup_keys[]`, so a checkout that needs a recurring price and a build fee
 * costs one round trip rather than two.
 *
 * **`active=true` IS LOAD-BEARING.** Archiving a price is how the owner
 * retires a list price, and an archived price cannot be attached to a new
 * subscription — Stripe would refuse the call later, with a worse message,
 * after a spot has already been claimed. Refusing here instead means the
 * error names the key.
 *
 * THE THROW IS A 503, NOT A 500 OR A 400. Nothing is wrong with the request
 * and nothing is wrong with our code: a price has not been created yet. 503
 * is the same answer this repo already gives for "Stripe is not configured on
 * this deployment", and it is the one that reads as temporary.
 */
export async function resolvePrices(
  keys: string[],
  now: number = Date.now(),
): Promise<Map<string, ResolvedPrice>> {
  const wanted = [...new Set(keys)].filter(Boolean);
  const out = new Map<string, ResolvedPrice>();
  const missing: string[] = [];
  for (const key of wanted) {
    const hit = fresh(key, now);
    if (hit) out.set(key, hit);
    else missing.push(key);
  }
  if (!missing.length) return out;

  const qs = new URLSearchParams();
  for (const key of missing) qs.append("lookup_keys[]", key);
  qs.set("active", "true");
  qs.set("limit", "100");
  const res = await stripe(`/prices?${qs.toString()}`);
  const data = Array.isArray(res.data) ? res.data as Record<string, unknown>[] : [];

  for (const raw of data) {
    const price = toResolved(raw);
    // A price with no amount is not a price we can charge. Stripe returns
    // `unit_amount: null` for tiered and metered prices, and attaching one to
    // this product's flat subscription is a bill nobody can predict.
    if (!price.lookupKey || !Number.isFinite(price.cents)) continue;
    cache.set(price.lookupKey, { at: now, price });
    out.set(price.lookupKey, price);
  }

  const stillMissing = wanted.filter((k) => !out.has(k));
  if (stillMissing.length) {
    // NAMES THE KEY, AND NAMES NO PRICE. The owner's next action is to create
    // exactly these in Stripe, so the message is the instruction.
    throw new StripeError(
      `No active Stripe price for ${stillMissing.join(", ")}. `
      + "Create it in Stripe with that lookup key; checkout is refused until then.",
      503,
    );
  }
  return out;
}

/**
 * The prices one plan needs, resolved and shape-checked.
 *
 * **THE INTERVAL IS CHECKED AGAINST THE PLAN, NOT TRUSTED.** A lookup key is a
 * label the owner typed, and `website_dashboard_yearly` pointing at a monthly
 * price is a typo that would otherwise bill somebody twelve times a year at the
 * annual rate. The key says what it is meant to be; this is what makes that a
 * promise rather than a hope.
 */
export async function pricesForPlan(
  plan: Plan,
  term: Term,
  founding: boolean,
): Promise<{ recurring: ResolvedPrice; setup: ResolvedPrice | null }> {
  const keys = priceKeysFor(plan, term, founding);
  const resolved = await resolvePrices([keys.recurring, keys.setup].filter(Boolean) as string[]);
  const recurring = resolved.get(keys.recurring)!;
  const setup = keys.setup ? resolved.get(keys.setup)! : null;

  const wantInterval = plan === "website" && term === "annual-upfront" ? "year" : "month";
  if (recurring.interval !== wantInterval) {
    throw new StripeError(
      `Stripe price ${keys.recurring} bills every ${recurring.interval ?? "once"}, `
      + `but this plan is billed every ${wantInterval}. Checkout refused.`,
      503,
    );
  }
  if (setup && setup.interval !== null) {
    throw new StripeError(
      `Stripe price ${keys.setup} is recurring, but the build fee is a one-off. Checkout refused.`,
      503,
    );
  }
  return { recurring, setup };
}
