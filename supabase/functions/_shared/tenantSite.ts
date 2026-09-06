// ROADMAP 3.3 — which origin this business's customer-facing links point at.
//
// Returns the detailer's own verified host as an origin, or `PLATFORM_URL`.
// **`PLATFORM_URL` is the answer for every tenant today**, so nothing about
// any existing email changes until somebody verifies a domain — which is the
// property that made it safe to make `site` a required argument everywhere in
// `config.ts` on the same night.
//
// ONE QUERY PER FUNCTION INVOCATION. Several senders need the site two or
// three times in one request (the brand's `siteUrl`, the receipt link, the
// plans link), and an edge function instance is short-lived enough that a
// module-level Map is a request cache rather than a stale one. **It is
// deliberately NOT keyed on anything else**: a cache that outlives the process
// would serve a detailer their old domain for as long as the instance stayed
// warm, which is a bug that only appears the day somebody changes a domain.
//
// THE RULE — "the earliest verified domain wins" — lives in
// `public.business_canonical_host`, not here. A detailer may verify more than
// one host (an apex and a subdomain), the emails have to pick exactly one, and
// a rule written at four call sites is a rule that forks.

import { originForHost, PLATFORM_URL } from "./config.ts";

// deno-lint-ignore no-explicit-any
type Db = any;

const cache = new Map<string, string>();

export async function siteFor(db: Db, businessId: string): Promise<string> {
  if (!businessId) return PLATFORM_URL;
  const hit = cache.get(businessId);
  if (hit) return hit;
  let origin = PLATFORM_URL;
  try {
    const { data } = await db.rpc("business_canonical_host", { p_business_id: businessId });
    origin = originForHost(typeof data === "string" ? data : null);
  } catch (e) {
    // BEST-EFFORT, LIKE THE SEND ITSELF. A lookup that throws must never stop
    // a confirmation going out; the customer gets a working platform link
    // instead of a working custom one, which is the safe direction. It is a
    // console line rather than a failure for the same reason
    // `sendTenantEmail` is — and, like that one, it is invisible from every
    // screen, so if custom domains ever stop appearing in emails this is the
    // first thing to read.
    console.error("business_canonical_host lookup failed:", e);
  }
  cache.set(businessId, origin);
  return origin;
}
