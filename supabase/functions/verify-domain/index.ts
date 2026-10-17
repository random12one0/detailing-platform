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
// `authenticated` (migration 20261017030000): a browser that could insert
// could insert `verified_at` with it. `verified_at` and `domain` are revoked
// for UPDATE as well, so this function is the only writer of either.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { supabase } from "../_shared/db.ts";
import { json, preflight } from "../_shared/http.ts";
import { can, requireMember } from "../_shared/tenant.ts";
import { proveHost } from "../_shared/domainProof.ts";

// The same shape the column's check constraint and the by-host RPC use: a bare
// lower-case hostname, no scheme, no path, no port, no leading `www.`.
const HOST_RE = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/;

export function normaliseHost(input: string): string {
  return String(input || "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/:\d+$/, "")
    .replace(/^www\./, "");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return preflight();

  try {
    const body = await req.json();
    const member = await requireMember(req, body.business_id ?? null);
    if (!member) return json({ error: "Unauthorized" }, 401);
    // Same permission that owns every other business setting. There is no
    // `domains` tick and there should not be one: whoever can change the
    // prices can change the address.
    if (!can(member, "settings")) return json({ error: "Not allowed" }, 403);

    if (body.action === "add") {
      const domain = normaliseHost(body.domain);
      if (!HOST_RE.test(domain)) return json({ error: `"${body.domain ?? ""}" is not a web address.` }, 400);
      const { data: added, error: addErr } = await supabase
        .from("business_domains")
        .insert({ business_id: member.businessId, domain })
        .select("id, domain, verification_token, verified_at, created_at")
        .single();
      // UNIQUE across every business: the one error worth naming, because
      // "duplicate key" tells a detailer nothing.
      if (addErr?.code === "23505") return json({ error: "taken", domain }, 409);
      if (addErr) throw addErr;
      return json({ added });
    }

    const domainId = String(body.domain_id ?? "");
    if (!domainId) return json({ error: "domain_id is required" }, 400);

    const { data: row, error } = await supabase
      .from("business_domains")
      .select("id, business_id, domain, verification_token, verified_at")
      .eq("id", domainId)
      .eq("business_id", member.businessId)
      .maybeSingle();
    if (error) throw error;
    if (!row) return json({ error: "No such domain on this business" }, 404);

    const host = normaliseHost(row.domain);
    if (!HOST_RE.test(host)) {
      return json({ verified: false, reason: `"${row.domain}" is not a hostname.` });
    }

    const proof = await proveHost(host, row.verification_token);
    if (!proof.verified) return json({ verified: false, reason: proof.reason });

    const { error: upErr } = await supabase
      .from("business_domains")
      .update({ domain: host, verified_at: new Date().toISOString() })
      .eq("id", row.id)
      .eq("business_id", member.businessId);
    if (upErr) throw upErr;

    // The host is normalised ON THE WAY IN as well as on the way out, so a
    // detailer who typed `https://WWW.Example.com/` ends up with the same row
    // the by-host RPC will match at request time. A verified row whose domain
    // does not match what a browser sends is a verification that proved
    // nothing.
    return json({ verified: true, domain: host });
  } catch (error) {
    return json({ verified: false, error: (error as Error)?.message || "internal_error" }, 400);
  }
});
