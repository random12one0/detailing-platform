// ROADMAP 2.21 — the spam filter, in one place.
//
// **SMALL MEANS SMALL, and the owner's word for it was "small".** A per-phone
// and per-IP throttle on the endpoints that are public and expensive, plus a
// honeypot the widget leaves empty. **NO CAPTCHA** — it costs the real
// customer more than it costs the attacker, and W16's whole point is that a
// customer never fights the booking form.
//
// WHAT EACH LIMIT IS FOR, because the numbers are not interchangeable:
//   · `create-booking` — since roadmap 2.12 a request HOLDS THE SLOT, so a
//     script can fill a detailer's week for free and every held slot is a real
//     customer turned away. This is the endpoint the item exists for.
//   · `plan-link`'s email action — public, takes an address, and SENDS. An
//     unthrottled loop is a mail-bomb from the detailer's own sending
//     reputation, which is the platform's shared one. It cannot leak anything
//     (it answers identically either way, by design), so this is a volume
//     problem rather than a disclosure one.
//   · `unsubscribe` — public and it writes, but one boolean about one customer
//     whose UUID the caller already holds. It wants the blunt ceiling and
//     nothing designed for it.
//   · `stripe-webhook` — the smallest claim of the four, AND ONE THING THAT
//     MUST NOT BE DONE TO IT: no per-caller rule keyed on anything Stripe
//     controls. Every legitimate event comes from their address range in
//     bursts, and throttling those means a payment that succeeded is never
//     recorded — which presents as a paying detailer's booking page going
//     offline. **The ceiling only.**
//
// IT FAILS OPEN, AND THAT IS THE RIGHT WAY ROUND. If the counter itself errors,
// the booking goes through: this exists to make abuse expensive, and a
// throttle that can refuse real customers when the database hiccups has become
// the outage it was meant to prevent. Everything that must never fail open —
// the exclusion constraint, RLS, the Stripe signature, server-side pricing —
// is somewhere else and is unaffected.

// deno-lint-ignore no-explicit-any
type Db = any;

/**
 * The caller's address, as far as the edge gateway knows it.
 *
 * **AND IT CANNOT BE SPOOFED FROM OUTSIDE — measured 2026-09-06, not
 * assumed.** A probe that sent its own `x-forwarded-for: 203.0.113.9` was
 * counted against the machine's REAL address instead: Supabase's gateway
 * writes the header itself, so the left-most entry is the client rather than
 * whatever the client claimed. That is the difference between a throttle and
 * a formality, and it is worth knowing rather than hoping.
 */
export function ipOf(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for") ?? "";
  // The left-most entry is the client; everything after it is a proxy.
  return (fwd.split(",")[0] ?? "").trim() || (req.headers.get("cf-connecting-ip") ?? "").trim();
}

export interface Limit {
  bucket: string;
  key: string | null | undefined;
  windowSeconds: number;
  limit: number;
}

/**
 * True if EVERY limit still has room. The first refusal short-circuits, so a
 * caller who is over one limit does not have the others counted against them
 * as well — being over twice is not worse than being over once, and it would
 * make the row for a shared address grow on somebody else's abuse.
 */
export async function withinLimits(db: Db, limits: Limit[]): Promise<boolean> {
  for (const l of limits) {
    if (!l.key) continue;
    try {
      const { data, error } = await db.rpc("rate_take", {
        p_bucket: l.bucket,
        p_key: String(l.key).slice(0, 200),
        p_window_seconds: l.windowSeconds,
        p_limit: l.limit,
      });
      if (error) { console.error("rate_take failed", l.bucket, error); continue; }
      if (data === false) return false;
    } catch (e) {
      console.error("rate_take threw", l.bucket, e);
    }
  }
  return true;
}

/**
 * THE HONEYPOT. A field the real widget renders and leaves empty; a bot that
 * fills every input it finds fills this one too.
 *
 * IT IS NAMED FOR WHAT A BOT EXPECTS, not for what it does — `website` is a
 * field a form-filler is delighted to complete, and `honeypot` is one it would
 * learn to skip. The refusal is deliberately indistinguishable from success at
 * the HTTP level so a script cannot tune against it; the booking simply never
 * appears.
 */
export const looksAutomated = (body: Record<string, unknown>) =>
  typeof body.website === "string" && body.website.trim() !== "";

// ---------------------------------------------------------------------------
// THE NUMBERS, in one place, with the reason each was chosen. They assume the
// fixed window's boundary doubling (see the migration) — a real customer never
// comes close to any of them, and that is the test a limit has to pass.
// ---------------------------------------------------------------------------
export const LIMITS = {
  // A family booking two cars back to back is real and ordinary. Ten in an
  // hour from one phone is not.
  bookingPerPhone: { windowSeconds: 3600, limit: 10 },
  // A shop tablet taking bookings for walk-ins is real; a household behind one
  // address is real. Twenty-five an hour is neither.
  bookingPerIp: { windowSeconds: 3600, limit: 25 },
  // Asking for your own plan link twice because the first went to spam is
  // real. Six times an hour is a loop.
  planLinkPerIp: { windowSeconds: 3600, limit: 6 },
  planLinkPerEmail: { windowSeconds: 3600, limit: 4 },
  // The blunt ceiling every public endpoint gets, so a loop cannot spend the
  // project's function invocations. Generous on purpose: it is not trying to
  // catch anybody, only to stop a bill.
  publicCeiling: { windowSeconds: 3600, limit: 600 },
} as const;
