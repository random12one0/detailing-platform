// The only file in this repo that talks to Stripe.
//
// Roadmap 2.20 stage 2, and it is ~100 lines rather than a dependency. Stripe's
// own SDK is a large bundle whose whole job here would be `fetch` plus form
// encoding plus one HMAC — and this repo's entire frontend dependency list is
// four packages on purpose. Stripe's REST API is stable, documented and
// versioned; the SDK's value is types and retries, and an edge function that
// runs three calls gets neither benefit.
//
// FORM ENCODING, NOT JSON. Stripe's API takes
// `application/x-www-form-urlencoded` with bracketed paths for nesting —
// `line_items[0][price_data][currency]=usd`. `flatten()` below is the whole
// translation and it is the one part worth reading twice, because a mis-nested
// key is silently ignored by Stripe rather than rejected: the request succeeds
// and the amount is missing.
//
// THE KEY NEVER LEAVES THIS FILE'S CALLERS. `STRIPE_SECRET_KEY` is a Supabase
// function secret. It is not in the repo, not in `.env`, not in a build, and
// there is no `VITE_` anything for Stripe — the browser's whole involvement is
// following a URL that Stripe generated.

const API = "https://api.stripe.com/v1";

// Pinned rather than floating. Stripe changes response shapes between
// versions, and an unpinned integration is one that breaks on a date nobody
// chose. Raise it deliberately, after reading their changelog.
//
// **EXPORTED SINCE 2026-09-08 SO A WEBHOOK CAN CHECK ITSELF AGAINST IT.**
// Every event Stripe delivers carries its endpoint's `api_version`, and an
// endpoint registered at a different version sends a DIFFERENT PAYLOAD SHAPE
// for the same event. This repo has already measured one: at `2024-06-20` an
// invoice carries `charge` and `payment_intent`; at this account's newer
// default it carries NEITHER — so `invoice.charge` reads as absent, the
// decline reason is silently null, and everything still looks like it worked.
//
// **THE REASON IT NEEDS CHECKING RATHER THAN DOCUMENTING: Stripe's
// create-endpoint form DEFAULTS to the newest version**, not to the one your
// other endpoints use. So the mismatch is what you get by pressing the
// obvious button, it passes every test in this repo (they all run against the
// pinned shape), and it fails only in production, quietly.
export const API_VERSION = "2024-06-20";

export const stripeKey = () => Deno.env.get("STRIPE_SECRET_KEY") || "";
export const webhookSecret = () => Deno.env.get("STRIPE_WEBHOOK_SECRET") || "";

/**
 * THE SECOND WEBHOOK SECRET, AND IT EXISTS BECAUSE OF A STRIPE CONSTRAINT
 * NOBODY HERE KNEW ABOUT — 2026-09-08.
 *
 * A Stripe webhook endpoint's `connect` flag — the dashboard calls it
 * **"Events from"** — is **CREATE-ONLY. It cannot be edited afterwards**, in
 * the dashboard or through the API; it sits with the payload style and the
 * API version as immutable metadata on the endpoint. Verified in the account
 * itself rather than read in a doc: `we_1UCMpdJeoZO7o6Eenofj0orr` is
 * permanently scoped to *"Your account"*.
 *
 * **SO THE `event.account` BRANCH IN `stripe-webhook` WAS UNREACHABLE.** It
 * was written, reviewed, tested against the source and deployed, and no event
 * carrying `event.account` could ever arrive at it, because the only endpoint
 * registered is one that by construction never sends one. Every doc in this
 * repo called the remaining work *"a separate setting"* on that endpoint.
 * **There is no such setting.** It takes a SECOND endpoint.
 *
 * **AND A SECOND ENDPOINT ISSUES ITS OWN SIGNING SECRET**, which is the part
 * that makes this a code change rather than a dashboard errand. Both endpoints
 * can point at this same function — that is the cheap arrangement and the one
 * chosen — but then one function has to accept two secrets, because a
 * connected-account event signed with the connect secret fails verification
 * against `STRIPE_WEBHOOK_SECRET` and comes back a 400. **The symptom that
 * would produce is the worst kind: card payments silently never recorded, with
 * a perfectly healthy-looking platform-billing endpoint beside it.**
 *
 * Deliberately SEPARATE from `STRIPE_WEBHOOK_SECRET` rather than replacing it:
 * the platform-billing endpoint is live, working and carries every
 * subscription this product has, and it keeps its own secret untouched.
 *
 * Empty until the endpoint is created, and empty is not an error — it means
 * Connect's webhook is not switched on yet, which is true today.
 */
export const connectWebhookSecret = () =>
  Deno.env.get("STRIPE_CONNECT_WEBHOOK_SECRET") || "";
/**
 * THE PUBLISHABLE KEY, AND IT IS SERVED RATHER THAN BUILT IN.
 *
 * `pk_test_…` / `pk_live_…` are public by design — they identify the account to
 * Stripe.js and can do nothing on their own. The obvious home is a `VITE_`
 * variable, and it is the wrong one here for two reasons: a `VITE_STRIPE_*`
 * anything is one careless rename away from a SECRET key being compiled into
 * the bundle, and `tests/platform-billing.test.mjs` § 11 asserts that no Stripe
 * key appears in `app/` at all — a rule worth keeping absolute rather than
 * qualifying. Handing it back from `summary`, which the billing screen already
 * calls, costs nothing and keeps the frontend free of Stripe entirely.
 */
export const publishableKey = () => Deno.env.get("STRIPE_PUBLISHABLE_KEY") || "";

/** True when this deployment can actually talk to Stripe. */
export const stripeConfigured = () => stripeKey().startsWith("sk_");

/** True in Stripe's test mode — the state everything is built and checked in. */
export const stripeTestMode = () => stripeKey().startsWith("sk_test_");

/**
 * `{a: {b: [1, 2]}}` -> `a[b][0]=1&a[b][1]=2`.
 *
 * Undefined and null are DROPPED rather than sent as the strings "undefined"
 * and "null", which Stripe would happily store.
 */
export function flatten(
  value: unknown,
  prefix = "",
  out: string[][] = [],
): string[][] {
  if (value === undefined || value === null) return out;
  if (Array.isArray(value)) {
    value.forEach((v, i) => flatten(v, `${prefix}[${i}]`, out));
    return out;
  }
  if (typeof value === "object") {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      flatten(v, prefix ? `${prefix}[${k}]` : k, out);
    }
    return out;
  }
  out.push([prefix, String(value)]);
  return out;
}

export class StripeError extends Error {
  status: number;
  code?: string;
  // NOT a TypeScript parameter property (`readonly status: number` in the
  // signature). Node's type STRIPPING cannot transform one — it only removes
  // annotations — and `tests/platform-billing.test.mjs` imports this file
  // directly so the credential-free suite can pin the signature check that
  // stands between this endpoint and the open internet. Same constraint that
  // keeps `_shared/pricing.ts` importable by `tests/plans.test.mjs`.
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "StripeError";
    this.status = status;
    this.code = code;
  }
}

/**
 * One call. `idempotencyKey` is not optional in spirit: every POST here either
 * charges a card or changes what one will be charged, and an edge function can
 * be retried by the platform underneath it.
 */
export async function stripe(
  path: string,
  body?: Record<string, unknown>,
  opts: { method?: string; idempotencyKey?: string; stripeAccount?: string } = {},
): Promise<Record<string, unknown>> {
  const key = stripeKey();
  if (!key) throw new StripeError("Stripe is not configured on this deployment.", 503);

  const headers: Record<string, string> = {
    Authorization: `Bearer ${key}`,
    "Stripe-Version": API_VERSION,
  };
  if (opts.idempotencyKey) headers["Idempotency-Key"] = opts.idempotencyKey;
  // ROADMAP 2.20 STAGE 3 — ACTING AS A CONNECTED ACCOUNT.
  //
  // `Stripe-Account: acct_…` is the entire difference between a charge that
  // belongs to this platform and one that belongs to the detailer. With it,
  // the customer's money goes straight to the detailer's balance, the receipt
  // carries the detailer's branding, and the dispute is theirs. Without it —
  // one forgotten option — the identical call takes a stranger's customer's
  // money into the PLATFORM's account, which is the one thing
  // `docs/payments-research-2026-09-04.md` says must never happen.
  //
  // It is a header rather than a parameter because that is Stripe's own
  // design: the same endpoint, a different actor.
  if (opts.stripeAccount) headers["Stripe-Account"] = opts.stripeAccount;

  let payload: string | undefined;
  if (body) {
    headers["Content-Type"] = "application/x-www-form-urlencoded";
    payload = new URLSearchParams(flatten(body)).toString();
  }

  const res = await fetch(`${API}${path}`, {
    method: opts.method ?? (body ? "POST" : "GET"),
    headers,
    body: payload,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = (json as { error?: { message?: string; code?: string } }).error;
    throw new StripeError(err?.message || `Stripe returned ${res.status}.`, res.status, err?.code);
  }
  return json as Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// WEBHOOK SIGNATURES
//
// The webhook endpoint is PUBLIC — Stripe has no bearer token to present — so
// the signature is the entire authentication. Anyone on the internet can POST
// to it, and an unverified handler is a URL that grants free subscriptions and
// takes competitors' sites offline.
//
// The scheme: header `Stripe-Signature: t=<unix>,v1=<hex>,v1=<hex>`, where the
// signed payload is the literal string `<t>.<raw body>` and the MAC is
// HMAC-SHA256 under the endpoint's signing secret. TWO things beyond the MAC
// matter and both are easy to leave out:
//   · THE RAW BODY. `JSON.parse` then `JSON.stringify` reorders keys and drops
//     whitespace, and the signature is over BYTES. Callers must pass
//     `await req.text()` and parse afterwards.
//   · THE TIMESTAMP. Without a tolerance a captured request replays for ever.

const enc = new TextEncoder();

/** Constant-time compare. A length-aware early return leaks the prefix. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

const hex = (buf: ArrayBuffer) =>
  Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");

/**
 * Verifies `Stripe-Signature` over the RAW body and returns the parsed event,
 * or throws. `toleranceSeconds` defaults to Stripe's own recommended 5 minutes.
 */
export async function verifyWebhook(
  rawBody: string,
  signatureHeader: string | null,
  secret: string,
  toleranceSeconds = 300,
  now: number = Math.floor(Date.now() / 1000),
): Promise<Record<string, unknown>> {
  if (!secret) throw new StripeError("Webhook secret is not configured.", 503);
  if (!signatureHeader) throw new StripeError("No signature.", 400);

  const parts = signatureHeader.split(",").map((p) => p.trim().split("="));
  const t = parts.find(([k]) => k === "t")?.[1];
  // A rotating secret means Stripe sends more than one v1; any match is valid.
  const sigs = parts.filter(([k]) => k === "v1").map(([, v]) => v);
  if (!t || !sigs.length) throw new StripeError("Malformed signature.", 400);

  const age = Math.abs(now - Number(t));
  if (!Number.isFinite(age) || age > toleranceSeconds) {
    throw new StripeError("Signature timestamp outside tolerance.", 400);
  }

  const cryptoKey = await crypto.subtle.importKey(
    "raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const expected = hex(await crypto.subtle.sign("HMAC", cryptoKey, enc.encode(`${t}.${rawBody}`)));
  if (!sigs.some((s) => safeEqual(s, expected))) throw new StripeError("Bad signature.", 400);

  return JSON.parse(rawBody) as Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// CONNECT OAUTH — roadmap 2.20 stage 3
//
// THIS IS A DIFFERENT HOST AND THAT IS THE WHOLE REASON THESE TWO ARE NOT
// `stripe()` CALLS. Connect's OAuth endpoints live on `connect.stripe.com`,
// not `api.stripe.com/v1`, and they authenticate with the secret key sent as a
// FORM FIELD (`client_secret`) rather than as a bearer token. Routing them
// through `stripe()` would mean two exceptions inside a function whose whole
// value is having none.
// ---------------------------------------------------------------------------

const CONNECT_API = "https://connect.stripe.com";

async function connectPost(path: string, body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const key = stripeKey();
  if (!key) throw new StripeError("Stripe is not configured on this deployment.", 503);
  const res = await fetch(`${CONNECT_API}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(flatten({ client_secret: key, ...body })).toString(),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    // OAUTH REPORTS ITS ERRORS IN A DIFFERENT SHAPE. Everywhere else in
    // Stripe's API a failure is `{error: {message}}`; here it is
    // `{error: "invalid_grant", error_description: "…"}` — a STRING where the
    // rest of the API puts an object. Reading `.error.message` off this gives
    // `undefined` and the caller reports "Stripe returned 400", losing the one
    // sentence that says what went wrong.
    const e = json as { error?: string; error_description?: string };
    throw new StripeError(e.error_description || e.error || `Stripe returned ${res.status}.`, res.status, e.error);
  }
  return json as Record<string, unknown>;
}

/**
 * Trades the `code` from the consent redirect for the detailer's account id.
 *
 * The interesting field is `stripe_user_id` (`acct_…`). The access token that
 * comes back with it is deliberately NOT stored: on a Standard account the
 * platform's own secret key plus `Stripe-Account` is enough for everything
 * this product does, and a stored OAuth token is one more credential that can
 * leak while granting nothing extra.
 */
export const oauthToken = (code: string) =>
  connectPost("/oauth/token", { grant_type: "authorization_code", code });

/**
 * Severs the connection from OUR side.
 *
 * The detailer keeps their Stripe account and every payment already taken —
 * this only revokes this platform's access to it. Told to Stripe rather than
 * only forgotten locally, because a row we deleted while Stripe still lists us
 * as a connected platform is a detailer who cannot cleanly reconnect later.
 */
export const oauthDeauthorize = (clientId: string, accountId: string) =>
  connectPost("/oauth/deauthorize", { client_id: clientId, stripe_user_id: accountId });
