// ROADMAP 3.3 — does this hostname actually reach us?
//
// Input: { business_id?, domain_id }   Member-gated, `settings` permission.
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
// AND THE MARKER IS NOT A SECRET, WHICH IS THE POINT. Anybody can serve the
// same three words from their own server and "pass". That would let somebody
// point a hostname they own at a page they control and have this platform
// email their own customers a link to it — a person harming only themselves.
// **What it cannot do is take somebody else's domain**: `business_domains.domain`
// is UNIQUE, so a host already verified by another business cannot be claimed,
// and an unverified row resolves nothing. A signed per-tenant token would add
// a step the detailer has to copy without closing a hole they can reach.
//
// `verified_at` IS REVOKED FROM `authenticated` AT COLUMN LEVEL (see the
// migration): RLS chooses rows and not columns, so without that revoke a
// detailer could stamp their own row and this function would be decoration.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { supabase } from "../_shared/db.ts";
import { json, preflight } from "../_shared/http.ts";
import { can, requireMember } from "../_shared/tenant.ts";

const MARKER = "detailing-platform-host-v1";

// Ten seconds. A host that is slow to answer a 27-byte static file is a host
// that will be slow serving somebody's booking, and a verification that hangs
// looks to the detailer exactly like one that failed.
const TIMEOUT_MS = 10_000;

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

    const domainId = String(body.domain_id ?? "");
    if (!domainId) return json({ error: "domain_id is required" }, 400);

    const { data: row, error } = await supabase
      .from("business_domains")
      .select("id, business_id, domain, verified_at")
      .eq("id", domainId)
      .eq("business_id", member.businessId)
      .maybeSingle();
    if (error) throw error;
    if (!row) return json({ error: "No such domain on this business" }, 404);

    const host = normaliseHost(row.domain);
    if (!HOST_RE.test(host)) {
      return json({ verified: false, reason: `"${row.domain}" is not a hostname.` });
    }

    // WHY THE ANSWER IS READ AS TEXT AND TRIMMED RATHER THAN COMPARED WHOLE:
    // a CDN or a proxy may append a newline, and a host that returns the
    // SPA's index.html instead — which is what happens if somebody deletes
    // the static file — returns a long HTML document that `includes()` would
    // never match. Both cases are handled by the same two lines.
    let reached = false;
    let reason = "";
    const url = `https://${host}/platform-host.txt`;
    try {
      const res = await fetch(url, {
        redirect: "follow",
        signal: AbortSignal.timeout(TIMEOUT_MS),
        headers: { "Cache-Control": "no-cache" },
      });
      if (!res.ok) {
        reason = `${host} answered ${res.status} for /platform-host.txt.`;
      } else {
        const text = (await res.text()).trim();
        if (text === MARKER) reached = true;
        else reason = `${host} answered, but it is not pointing at this app yet.`;
      }
    } catch (e) {
      // A DNS failure, a TLS failure and a timeout are the same sentence to a
      // detailer: it did not answer. The technical reason goes to the logs.
      console.error("verify-domain fetch failed:", url, e);
      reason = `${host} did not answer. Check the DNS record, then try again.`;
    }

    if (!reached) return json({ verified: false, reason });

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
