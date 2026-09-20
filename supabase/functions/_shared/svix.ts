// ROADMAP 14.3 — SVIX WEBHOOK SIGNATURES, which is the scheme Resend uses.
//
// ---------------------------------------------------------------------------
// WHY THIS IS ITS OWN FILE WITH NO IMPORTS
// ---------------------------------------------------------------------------
// `_shared/stripe.ts` learned this the expensive way and wrote it down: a
// signature check that lives inside `Deno.serve` can only ever be GREPPED by a
// credential-free test, never RUN — CLAUDE.md trap (k). So the whole check is
// here, it takes plain arguments, it imports nothing, and
// `tests/svix-signature.test.mjs` loads this exact file and runs it in Node.
// `_shared/retryRead.ts` is in the repo for the same reason and says so.
//
// ---------------------------------------------------------------------------
// THE SCHEME, AND THE THREE WAYS TO GET IT WRONG
// ---------------------------------------------------------------------------
// Svix signs `"<svix-id>.<svix-timestamp>.<raw body>"` with HMAC-SHA256 and
// sends the result base64-encoded in `svix-signature`, as a space-separated
// list of `v1,<sig>` entries — a list, because a rotating secret means more
// than one is valid at once.
//
//   1. **The body must be the RAW text**, read before anything parses it. A
//      re-serialised object differs by a space and the signature fails, or
//      worse, somebody "fixes" that by skipping the check.
//   2. **The secret is base64, not text.** It arrives as `whsec_<base64>` and
//      the HMAC key is the DECODED bytes after that prefix. Signing with the
//      literal string produces a wrong answer every time, which reads as
//      "Resend's signatures are broken" rather than as our own bug.
//   3. **The timestamp tolerance is not optional.** Without it a signature
//      captured once is valid for ever, and a replayed `bounced` event can
//      keep marking a fixed address as broken.

const enc = new TextEncoder();

/** Constant-time compare. A length-dependent early return leaks the prefix. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

const base64ToBytes = (b64: string): Uint8Array =>
  Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

const bytesToBase64 = (buf: ArrayBuffer): string =>
  btoa(String.fromCharCode(...new Uint8Array(buf)));

export class SvixError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export interface SvixHeaders {
  id: string | null;
  timestamp: string | null;
  signature: string | null;
}

/**
 * Verifies a Svix-signed webhook over the RAW body and returns the parsed
 * event, or throws `SvixError`.
 *
 * `toleranceSeconds` defaults to Svix's own recommended 5 minutes, and `now`
 * is injectable so a test can prove the tolerance rejects rather than assume
 * it — the tolerance is the one rule that cannot be checked by reading.
 */
export async function verifySvix(
  rawBody: string,
  headers: SvixHeaders,
  secret: string,
  toleranceSeconds = 300,
  now: number = Math.floor(Date.now() / 1000),
): Promise<Record<string, unknown>> {
  // NO SECRET IS A 503, NOT A 400. Nothing is wrong with the request; the
  // endpoint simply is not switched on yet, and a 400 would make the provider
  // give up retrying an event we could have handled once somebody sets it.
  // Same call `_shared/stripe.ts` makes, for the same reason.
  if (!secret) throw new SvixError("Webhook secret is not configured.", 503);
  if (!headers.id || !headers.timestamp || !headers.signature) {
    throw new SvixError("No signature.", 400);
  }

  const age = Math.abs(now - Number(headers.timestamp));
  if (!Number.isFinite(age) || age > toleranceSeconds) {
    throw new SvixError("Signature timestamp outside tolerance.", 400);
  }

  // `whsec_` is a label, not part of the key. A secret pasted without it still
  // works, which is the forgiving half of the same rule.
  const raw = secret.startsWith("whsec_") ? secret.slice(6) : secret;
  let keyBytes: Uint8Array;
  try {
    keyBytes = base64ToBytes(raw);
  } catch {
    throw new SvixError("Webhook secret is not valid base64.", 503);
  }

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyBytes as unknown as ArrayBuffer,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const expected = bytesToBase64(
    await crypto.subtle.sign(
      "HMAC",
      cryptoKey,
      enc.encode(`${headers.id}.${headers.timestamp}.${rawBody}`),
    ),
  );

  // "v1,<sig> v1,<sig>" — every entry is tried and any match is valid.
  const sent = headers.signature.split(" ")
    .map((p) => p.trim())
    .filter((p) => p.startsWith("v1,"))
    .map((p) => p.slice(3));
  if (sent.length === 0) throw new SvixError("Malformed signature.", 400);
  if (!sent.some((s) => safeEqual(s, expected))) throw new SvixError("Bad signature.", 400);

  return JSON.parse(rawBody) as Record<string, unknown>;
}

/** Reads the three headers off a request, so no caller spells them itself. */
export const svixHeadersOf = (req: Request): SvixHeaders => ({
  id: req.headers.get("svix-id"),
  timestamp: req.headers.get("svix-timestamp"),
  signature: req.headers.get("svix-signature"),
});
