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
const API_VERSION = "2024-06-20";

export const stripeKey = () => Deno.env.get("STRIPE_SECRET_KEY") || "";
export const webhookSecret = () => Deno.env.get("STRIPE_WEBHOOK_SECRET") || "";

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
  opts: { method?: string; idempotencyKey?: string } = {},
): Promise<Record<string, unknown>> {
  const key = stripeKey();
  if (!key) throw new StripeError("Stripe is not configured on this deployment.", 503);

  const headers: Record<string, string> = {
    Authorization: `Bearer ${key}`,
    "Stripe-Version": API_VERSION,
  };
  if (opts.idempotencyKey) headers["Idempotency-Key"] = opts.idempotencyKey;

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
