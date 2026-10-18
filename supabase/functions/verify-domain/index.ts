// ROADMAP 3.3 — does this hostname actually reach us?
//
// Input: { business_id?, domain_id } or { business_id?, action: "add", domain }. Member-gated, `settings` permission.
//
// THE CHECK IS A FETCH, NOT A PROMISE, and that is the whole design. A
// detailer types a hostname into a settings screen; from that moment the
// platform would write it into every customer's confirmation email. If the
// host does not actually serve this app, every one of those links is a 404 —
// **which is worse than the seam the item exists to remove**, because a
// customer who cannot reach their own booking has lost it.
//
// So: GET `https://<host>/platform-host.txt` and require our marker back.
// `app/public/platform-host.txt` is a real static file that Netlify serves
// ahead of the SPA's catch-all rewrite, so a host that answers it is a host
// aliased onto this site. Nothing a detailer can type makes that true.
//
// ROADMAP 97.13 SUPERSEDES WHAT THIS HEADER USED TO SAY ABOUT THE MARKER.
// It argued a shared marker was enough because UNIQUE stops anybody claiming
// a host already claimed. It is not: every platform address serves the same
// marker, so a business could claim the platform's own domain or another
// business's aliased-but-unclaimed host, and a redirect to any of ours passed.
// Verification now also requires the ROW'S OWN token in DNS — see
// `_shared/domainProof.ts` for the two proofs and why each is needed.
//
// ADDING A ROW IS HERE TOO (`action: "add"`), because INSERT is revoked from
// `authenticated` (migration 20261018010000): a browser that could insert
// could insert `verified_at` with it. `verified_at` and `domain` are revoked
// for UPDATE as well, so this function is the only writer of either.

// THE HANDLING ITSELF IS IN `_shared/domainProof.ts` (`handleDomainRequest`),
// so `tests/domain-request.test.mjs` drives the real code; this file is the
// door: who is asking, and the reply.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { supabase } from "../_shared/db.ts";
import { json, preflight } from "../_shared/http.ts";
import { requireMember } from "../_shared/tenant.ts";
import { handleDomainRequest } from "../_shared/domainProof.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return preflight();

  try {
    const body = await req.json();
    // A caller who is not a member of `body.business_id` gets null here and
    // 401 below; a member of another business is never handed this one.
    const member = await requireMember(req, body.business_id ?? null);
    const reply = await handleDomainRequest(body, member, supabase);
    return json(reply.body, reply.status);
  } catch (error) {
    return json({ verified: false, error: (error as Error)?.message || "internal_error" }, 400);
  }
});
